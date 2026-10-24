import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { publishDirectory } from '../src/publish-directory.mjs';
import { writeWorkflowOutput } from '../src/workflow-output.mjs';
import { runEngine, runProductionProcess } from '../src/production-process.mjs';

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'manga-publication-'));
try {
  const destination = path.join(base, 'release');
  assert.throws(
    () =>
      publishDirectory(destination, (staged) => {
        fs.writeFileSync(path.join(staged, 'partial'), 'incomplete');
        throw new Error('validation failed');
      }),
    /validation failed/,
  );
  assert.ok(!fs.existsSync(destination));
  assert.deepEqual(fs.readdirSync(base), []);
  publishDirectory(destination, (staged) =>
    fs.writeFileSync(path.join(staged, 'version'), 'old'),
  );
  assert.throws(
    () => publishDirectory(destination, () => {}),
    /Destination exists/,
  );
  assert.equal(
    fs.readFileSync(path.join(destination, 'version'), 'utf8'),
    'old',
  );

  // A caught failure between the two directory renames restores the old output.
  const rename = fs.renameSync;
  fs.renameSync = (from, to) => {
    if (path.basename(from) === 'staged' && to === destination)
      throw new Error('promotion failed');
    return rename(from, to);
  };
  try {
    assert.throws(
      () =>
        publishDirectory(
          destination,
          (staged) => {
            fs.writeFileSync(path.join(staged, 'version'), 'new');
          },
          { replace: true },
        ),
      /promotion failed/,
    );
  } finally {
    fs.renameSync = rename;
  }
  assert.equal(
    fs.readFileSync(path.join(destination, 'version'), 'utf8'),
    'old',
  );
  assert.deepEqual(fs.readdirSync(base), ['release']);
  publishDirectory(
    destination,
    (staged) => {
      // A competing publisher must not remove the current publisher's staging area.
      assert.throws(
        () => publishDirectory(destination, () => {}, { replace: true }),
        /EEXIST/,
      );
      fs.writeFileSync(path.join(staged, 'version'), 'new');
    },
    { replace: true },
  );
  assert.equal(
    fs.readFileSync(path.join(destination, 'version'), 'utf8'),
    'new',
  );

  // If rollback itself fails, retain both versions and the exclusive marker.
  const recovery = path.join(base, 'recoverable');
  publishDirectory(recovery, (staged) =>
    fs.writeFileSync(path.join(staged, 'version'), 'old'),
  );
  fs.renameSync = (from, to) => {
    if (to === recovery && ['staged', 'previous'].includes(path.basename(from)))
      throw new Error('rename unavailable');
    return rename(from, to);
  };
  try {
    assert.throws(
      () =>
        publishDirectory(
          recovery,
          (staged) => {
            fs.writeFileSync(path.join(staged, 'version'), 'new');
          },
          { replace: true },
        ),
      (error) => error instanceof AggregateError && error.errors.length === 2,
    );
  } finally {
    fs.renameSync = rename;
  }
  const retained = path.join(base, '.recoverable.publishing');
  assert.equal(
    fs.readFileSync(path.join(retained, 'previous/version'), 'utf8'),
    'old',
  );
  assert.equal(
    fs.readFileSync(path.join(retained, 'staged/version'), 'utf8'),
    'new',
  );
  assert.throws(() => publishDirectory(recovery, () => {}), /EEXIST/);
  fs.renameSync(path.join(retained, 'previous'), recovery);
  fs.rmSync(retained, { recursive: true });

  const output = path.join(base, 'output');
  fs.mkdirSync(output);
  fs.writeFileSync(path.join(output, 'page-01.svg'), 'previous SVG');
  fs.writeFileSync(path.join(output, 'reader.html'), 'previous reader');
  fs.writeFileSync(path.join(output, 'preserved.pdf'), 'previous PDF');
  const options = {
    config: {
      title: 'Synthetic',
      pages: [
        { id: '01', panels: [] },
        { id: '02', panels: [] },
      ],
    },
    output,
    dir: path.join(base, 'workflow'),
    codeRoot: base,
    local: (file) => path.join(base, file),
    status: () => 'ready',
    artFor: () => null,
    materialJobs: () => [],
    svg: (page) => {
      if (page.id === '02') throw new Error('render failed');
      return 'new SVG';
    },
  };
  assert.throws(() => writeWorkflowOutput(options), /render failed/);
  assert.equal(
    fs.readFileSync(path.join(output, 'page-01.svg'), 'utf8'),
    'previous SVG',
  );
  assert.equal(
    fs.readFileSync(path.join(output, 'reader.html'), 'utf8'),
    'previous reader',
  );
  assert.ok(!fs.existsSync(path.join(output, 'page-02.svg')));
  const svg = (page) => '<svg>' + page.id + '</svg>';
  // A failure after every page was rendered must also leave existing output intact.
  assert.throws(() => writeWorkflowOutput({ ...options, svg }), /ENOENT/);
  assert.equal(
    fs.readFileSync(path.join(output, 'page-01.svg'), 'utf8'),
    'previous SVG',
  );
  fs.mkdirSync(path.join(base, 'templates'));
  fs.writeFileSync(
    path.join(base, 'templates/reader.html'),
    '{{TITLE}} {{AUTHOR}} {{PAGES}}',
  );
  writeWorkflowOutput({ ...options, svg });
  assert.equal(
    fs.readFileSync(path.join(output, 'page-01.svg'), 'utf8'),
    '<svg>01</svg>',
  );
  assert.equal(
    fs.readFileSync(path.join(output, 'preserved.pdf'), 'utf8'),
    'previous PDF',
  );
  assert.ok(
    fs
      .readFileSync(path.join(output, 'index.html'), 'utf8')
      .includes('../workflow/storyboards/index.html'),
  );

  const runtime = path.join(base, 'runtime space 日本語');
  const workspace = path.join(base, 'data space 日本語');
  fs.mkdirSync(runtime);
  fs.mkdirSync(workspace);
  fs.writeFileSync(
    path.join(runtime, 'probe.mjs'),
    `console.log(JSON.stringify({cwd:process.cwd(),workspace:process.env.MANGA_WORKSPACE,project:process.env.MANGA_PROJECT,extra:process.env.MANGA_TEST_VALUE,args:process.argv.slice(2)}))`,
  );
  const result = JSON.parse(
    runEngine('probe.mjs', ['argument with spaces'], {
      codeRoot: runtime,
      workspace,
      project: 'works/test/workflow.json',
      stdio: 'pipe',
      env: {
        MANGA_WORKSPACE: 'incorrect',
        MANGA_PROJECT: 'incorrect',
        MANGA_TEST_VALUE: 'kept',
      },
    }),
  );
  assert.deepEqual(result, {
    cwd: fs.realpathSync(workspace),
    workspace,
    project: 'works/test/workflow.json',
    extra: 'kept',
    args: ['argument with spaces'],
  });
  assert.throws(
    () =>
      runProductionProcess(process.execPath, ['-e', 'process.exit(7)'], {
        workspace,
        stdio: 'pipe',
      }),
    (error) => error.status === 7,
  );
  // Failed subprocess verification must not occupy a final release path.
  const retryRelease = path.join(base, 'retry-release');
  assert.throws(() =>
    publishDirectory(retryRelease, () =>
      runProductionProcess(process.execPath, ['-e', 'process.exit(7)'], {
        workspace,
        stdio: 'pipe',
      }),
    ),
  );
  publishDirectory(retryRelease, (staged) =>
    fs.writeFileSync(path.join(staged, 'verified'), 'yes'),
  );
  assert.ok(fs.existsSync(path.join(retryRelease, 'verified')));
  assert.ok(!fs.readdirSync(base).some((name) => name.endsWith('.publishing')));
  console.log(
    'PASS: staged output failure safety, promotion rollback, release retry, exclusive publication, subprocess workspace/project and failure propagation',
  );
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}
