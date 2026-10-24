import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundled = path.join(skill, 'engine');
const root = fs.existsSync(bundled) ? bundled : path.resolve(skill, '../../..');
const [mode, destination, ...extra] = process.argv.slice(2);
if (mode === 'environment') {
  assert.ok(!destination && !extra.length, 'Usage: node setup.mjs environment');
  const runtime = path.join(skill, '.runtime');
  const venv = path.join(runtime, '.venv');
  const python = path.join(
    venv,
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
  );
  fs.mkdirSync(runtime, { recursive: true });
  if (!fs.existsSync(venv)) {
    const command =
      process.env.MANGA_PYTHON ||
      (process.platform === 'win32' ? 'py' : 'python3');
    const prefix = command === 'py' ? ['-3'] : [];
    execFileSync(command, [...prefix, '-m', 'venv', venv], {
      stdio: 'inherit',
      cwd: runtime,
    });
  }
  const probe = spawnSync(python, ['-c', 'import reportlab, pypdf, PIL'], {
    cwd: runtime,
  });
  if (probe.error) throw probe.error;
  if (probe.status !== 0) {
    execFileSync(
      python,
      ['-m', 'pip', 'install', 'reportlab', 'pypdf', 'Pillow'],
      { stdio: 'inherit', cwd: runtime },
    );
  }
  execFileSync(python, ['-c', 'import reportlab, pypdf, PIL'], {
    stdio: 'inherit',
    cwd: runtime,
  });
  execFileSync(python, [path.join(skill, 'scripts/record-environment.py')], {
    stdio: 'inherit',
    cwd: runtime,
  });
  console.log(`shared Python: ${python}`);
  process.exit(0);
}
assert.ok(
  ['workspace', 'bundle'].includes(mode) && destination && !extra.length,
  'Usage: node setup.mjs environment | workspace|bundle NEW-DIRECTORY',
);
const target = path.resolve(destination);
assert.ok(!fs.existsSync(target), 'Destination exists; refusing to overwrite');
assert.ok(
  !target.startsWith(root + path.sep),
  'Choose a destination outside the source runtime',
);
if (mode === 'workspace') {
  const parent = fs.realpathSync(path.dirname(target));
  const skillRoot = fs.realpathSync(skill);
  assert.ok(
    parent !== skillRoot && !parent.startsWith(skillRoot + path.sep),
    'Keep production data outside the installed Skill',
  );
  fs.mkdirSync(target);
  fs.copyFileSync(
    path.join(skill, 'scripts/workspace.gitignore'),
    path.join(target, '.gitignore'),
  );
  console.log(`workspace: ${target} (data only; use scripts/run.mjs)`);
  process.exit(0);
}
const { runtimeFiles } = await import(
  pathToFileURL(path.join(root, 'src/runtime-files.mjs'))
);
const files = [
  ...runtimeFiles(root),
  'package.json',
  'LICENSE',
  'README.md',
  'README.en.md',
  'REPRODUCE.md',
  'AGENTS.md',
  'works/sample/workflow.json',
  'works/sample/source/original.txt',
];
// An explicit allowlist excludes local research, credentials and production data.
const docs = [
  'ART-QUALITY',
  'AUTOMATIC',
  'FACE-DESIGN',
  'IMPROVEMENTS',
  'NARRATIVE-FLOW',
  'PROJECT-LAYOUT',
  'PROMPTS',
  'REVISION-AND-REVIEWS',
  'SYSTEM-AND-PAPERS',
  'CLAUDE-CODE',
  'COMFYUI',
  'history/README-history',
  'history/REVISION',
  'history/WORKFLOW',
];
const selected = [...files, ...docs.map((name) => `docs/${name}.md`)];
for (const file of selected)
  assert.ok(fs.lstatSync(path.join(root, file)).isFile(), file);

fs.mkdirSync(target);
const runtimeTarget = path.join(target, 'engine');
for (const file of selected) {
  const out = path.join(runtimeTarget, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(path.join(root, file), out, fs.constants.COPYFILE_EXCL);
}
if (mode === 'bundle') {
  for (const relative of [
    'SKILL.md',
    'README.md',
    'LICENSE',
    'agents/openai.yaml',
    'scripts/setup.mjs',
    'scripts/run.mjs',
    'scripts/migrate-workspace.mjs',
    'scripts/workspace.gitignore',
    '.gitignore',
    'scripts/record-environment.py',
    'references/environment.md',
    'references/shared-runtime.md',
  ]) {
    const out = path.join(target, relative);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(
      ['README.md', 'LICENSE'].includes(relative) &&
        !fs.existsSync(path.join(skill, relative))
        ? path.join(skill, '..', relative)
        : path.join(skill, relative),
      out,
      fs.constants.COPYFILE_EXCL,
    );
    if (
      relative === 'README.md' &&
      !fs.existsSync(path.join(skill, relative))
    ) {
      fs.writeFileSync(
        out,
        fs.readFileSync(out, 'utf8').replaceAll('](manga-generator/', ']('),
      );
    }
  }
}
console.log(`${mode}: ${target}`);
