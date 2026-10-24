import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { codeRoot } from '../src/workspace.mjs';
import { inspect } from '../src/archive.mjs';

// Synthetic legacy work: this tests mechanics, never actual manga quality.
const skill = path.dirname(codeRoot);
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'manga-shared-test-'));
const workspace = path.join(base, 'data');
const flat = process.argv.includes('--flat');
const project = flat ? 'workflow.json' : 'works/synthetic/workflow.json';
const env = { ...process.env, MANGA_PROJECT: project, MANGA_WORKSPACE: '' };
const hash = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function snapshot(folder) {
  return Object.fromEntries(
    fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === 'tmp' || entry.name === '.manga-history') return [];
      const file = path.join(folder, entry.name);
      return entry.isDirectory()
        ? Object.entries(snapshot(file))
        : [[file, hash(file)]];
    }),
  );
}
const before = snapshot(codeRoot);
const call = (script, args, extra = {}) =>
  execFileSync(
    process.execPath,
    [path.join(skill, 'scripts', script), ...args],
    {
      cwd: base,
      env: { ...env, ...extra },
      encoding: 'utf8',
      stdio: 'pipe',
    },
  );
const run = (command, ...args) =>
  call('run.mjs', [workspace, command, ...args]);
function blankPNG() {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let i = 0; i < 8; i++)
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    const size = Buffer.alloc(4),
      sum = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    sum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1024);
  header.writeUInt32BE(1536, 4);
  header[8] = 8;
  header[9] = 2;
  const rows = Buffer.alloc((1024 * 3 + 1) * 1536, 255);
  for (let y = 0; y < 1536; y++) rows[y * (1024 * 3 + 1)] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
try {
  // A data-only workspace must not depend on bundle documents or runtime code.
  const minimalSkill = path.join(base, 'minimal-skill');
  fs.mkdirSync(path.join(minimalSkill, 'scripts'), { recursive: true });
  const minimalSetup = path.join(minimalSkill, 'scripts', 'setup.mjs');
  fs.copyFileSync(path.join(skill, 'scripts', 'setup.mjs'), minimalSetup);
  fs.copyFileSync(
    path.join(skill, 'scripts/workspace.gitignore'),
    path.join(minimalSkill, 'scripts/workspace.gitignore'),
  );
  const minimalWorkspace = path.join(base, 'minimal-data');
  execFileSync(process.execPath, [minimalSetup, 'workspace', minimalWorkspace]);
  assert.deepEqual(fs.readdirSync(minimalWorkspace), ['.gitignore']);
  // Observe Python selection in a child CLI, without requiring PDF tools.
  fs.copyFileSync(
    path.join(skill, 'scripts/run.mjs'),
    path.join(minimalSkill, 'scripts/run.mjs'),
  );
  fs.mkdirSync(path.join(minimalSkill, 'engine/cli'), { recursive: true });
  fs.writeFileSync(
    path.join(minimalSkill, 'engine/cli/probe.mjs'),
    'console.log(process.env.MANGA_PYTHON);',
  );
  const sharedPython = path.join(
    minimalSkill,
    '.runtime/.venv',
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
  );
  fs.mkdirSync(path.dirname(sharedPython), { recursive: true });
  fs.writeFileSync(sharedPython, 'synthetic interpreter placeholder');
  const probe = (python) =>
    execFileSync(
      process.execPath,
      [path.join(minimalSkill, 'scripts/run.mjs'), minimalWorkspace, 'probe'],
      {
        env: { ...env, MANGA_PYTHON: python },
        encoding: 'utf8',
      },
    ).trim();
  assert.equal(probe(''), sharedPython);
  assert.equal(probe('/explicit/python'), '/explicit/python');
  assert.deepEqual(fs.readdirSync(minimalWorkspace), ['.gitignore']);
  const incompleteBundle = path.join(base, 'incomplete-bundle');
  assert.throws(() =>
    execFileSync(process.execPath, [minimalSetup, 'bundle', incompleteBundle], {
      stdio: 'pipe',
    }),
  );
  assert.ok(!fs.existsSync(incompleteBundle));
  call('setup.mjs', ['workspace', workspace]);
  assert.deepEqual(
    fs.readdirSync(workspace),
    ['.gitignore'],
    'New workspace must contain no copied runtime',
  );
  assert.throws(() => call('setup.mjs', ['workspace', workspace]));
  if (flat) {
    fs.mkdirSync(path.join(workspace, 'scratch'));
    fs.writeFileSync(
      path.join(workspace, 'scratch', 'intake.txt'),
      'Preserve preparation notes',
    );
  }
  const original = path.join(base, 'original.txt');
  fs.writeFileSync(original, 'Synthetic original for intake and resume.');
  const intake = flat
    ? call('run.mjs', [workspace, 'auto', 'start', original], {
        MANGA_PROJECT: '',
      })
    : run('auto', 'start', original);
  const automatic = intake.match(/Prepared: ([^\n]+)/)[1];
  const sourceHash = hash(path.join(workspace, automatic));
  assert.match(run('auto', 'start', original), /Resume:/);
  if (flat)
    assert.equal(
      fs.readFileSync(path.join(workspace, 'scratch/intake.txt'), 'utf8'),
      'Preserve preparation notes',
    );
  assert.equal(hash(path.join(workspace, automatic)), sourceHash);
  assert.match(
    call('run.mjs', [workspace, 'auto', 'status'], {
      MANGA_PROJECT: automatic,
    }),
    /in-progress/,
  );
  const baseDir = path.dirname(project);
  fs.mkdirSync(path.join(workspace, baseDir), { recursive: true });
  const config = JSON.parse(
    fs.readFileSync(path.join(codeRoot, 'works/sample/workflow.json'), 'utf8'),
  );
  Object.assign(config, {
    references: [],
    renderMode: 'page',
    sections: {},
    sourceFile: baseDir + '/source/original.txt',
    assetDir: baseDir + '/assets',
    workflowDir: baseDir + '/workflow',
    outputDir: baseDir + '/output',
  });
  for (const page of config.pages) delete page.section;
  fs.mkdirSync(path.join(workspace, baseDir, 'source'), { recursive: true });
  fs.writeFileSync(
    path.join(workspace, config.sourceFile),
    'Synthetic original.',
  );
  fs.writeFileSync(path.join(workspace, project), JSON.stringify(config));
  const png = path.join(base, 'blank.png');
  fs.writeFileSync(png, blankPNG());
  run('workflow', 'plan');
  run(
    'workflow',
    'accept',
    '01',
    png,
    '--reviewed',
    '--reason',
    'Synthetic blank fixture, not a visual art review',
  );
  run('workflow', 'preview');
  run(
    'workflow',
    'review',
    '01',
    '--speakers',
    '--faces',
    '--order',
    '--continuity',
  );
  run('workflow', 'build');
  const rendered = hash(path.join(workspace, config.outputDir, 'reader.html'));
  run('workflow', 'build');
  assert.equal(
    hash(path.join(workspace, config.outputDir, 'reader.html')),
    rendered,
  );
  if (process.argv.includes('--render')) {
    run('export', 'current');
    run('pdf', 'create');
    run('pdf', 'verify');
    assert.ok(
      fs.existsSync(path.join(workspace, config.outputDir, 'pdf/manga.pdf')),
    );
  }
  run('reproduce', 'freeze');
  run('reproduce', 'reproduce');
  run('reproduce', 'check');
  const bundle = run('reproduce', 'bundle', '--compressed');
  assert.match(run('reproduce', 'bundle'), /Verified portable release:/);
  const archive = bundle.match(/Verified portable archive: (.+)/)[1].trim();
  const lockPath = project.replace(/\.json$/, '.lock.json');
  const lock = JSON.parse(
    fs.readFileSync(path.join(workspace, lockPath), 'utf8'),
  );
  const restored = path.join(base, 'restored');
  await inspect(
    archive,
    {
      ...lock.inputs,
      ...lock.outputs,
      [lockPath]: hash(path.join(workspace, lockPath)),
    },
    (name) => path.join(restored, name),
  );
  const standalone = execFileSync(
    process.execPath,
    [path.join(restored, 'cli/reproduce.mjs'), 'reproduce'],
    { cwd: restored, env, encoding: 'utf8' },
  );
  assert.match(standalone, /rebuilt identical SVG and HTML/);
  // A code change after freezing must fail verification; never refresh lock hashes to hide it.
  const frozenCode = path.join(restored, 'templates/reader.html');
  fs.appendFileSync(frozenCode, '\nchanged');
  assert.throws(() =>
    execFileSync(
      process.execPath,
      [path.join(restored, 'cli/reproduce.mjs'), 'check'],
      { cwd: restored, env, stdio: 'pipe' },
    ),
  );
  run('history', 'bundle', path.join(base, 'history.tar.gz'));
  const states = JSON.parse(run('history', 'list'));
  const extracted = path.join(base, 'history-restored');
  run('history', 'extract', states.at(-1).id, extracted);
  assert.ok(fs.existsSync(path.join(extracted, 'cli/workflow.mjs')));
  for (const name of [
    '.venv',
    '.runtime',
    'environment',
    'node_modules',
    'cli',
    'src',
    'tests',
    'scripts',
    'templates',
    'docs',
    'package.json',
    'README.md',
    'AGENTS.md',
  ])
    assert.ok(
      !fs.existsSync(path.join(workspace, name)),
      'Workspace unexpectedly contains runtime: ' + name,
    );
  // Old copied code may remain, but shared execution must ignore it.
  fs.mkdirSync(path.join(workspace, 'cli'));
  fs.writeFileSync(
    path.join(workspace, 'cli/workflow.mjs'),
    'throw new Error("stale copied engine");',
  );
  assert.match(run('workflow', 'status'), /ready/);
  run('workflow', 'build');
  assert.equal(
    hash(path.join(workspace, config.outputDir, 'reader.html')),
    rendered,
  );
  const second = path.join(base, 'second');
  call('setup.mjs', ['workspace', second]);
  call('run.mjs', [second, 'auto', 'start', original]);
  if (flat) {
    assert.notDeepEqual(
      fs.readFileSync(path.join(second, project)),
      fs.readFileSync(path.join(workspace, project)),
    );
    const changedSource = path.join(base, 'changed-source.txt');
    fs.writeFileSync(changedSource, 'Another original for another work.');
    assert.throws(() =>
      call('run.mjs', [second, 'auto', 'start', changedSource]),
    );
    assert.ok(!fs.existsSync(path.join(workspace, 'works')));
    assert.ok(!fs.existsSync(path.join(second, 'works')));
  } else {
    assert.ok(
      !fs.existsSync(path.join(second, project)),
      'Projects leaked between workspaces',
    );
  }
  assert.throws(() => call('run.mjs', [skill, 'auto', 'help']));
  assert.deepEqual(
    snapshot(codeRoot),
    before,
    'Production must not mutate the shared runtime',
  );
  console.log(
    'PASS: data-only workspace, shared intake/resume/build, freeze/reproduce, portable archive and history restore, runtime tamper rejection, installed engine unchanged',
  );
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}
