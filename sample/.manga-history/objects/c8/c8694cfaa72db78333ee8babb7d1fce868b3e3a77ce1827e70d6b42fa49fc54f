import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { writeJSON } from '../src/json-store.mjs';
import { createPageRenderer } from '../src/page-renderer.mjs';

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'manga-services-'));
try {
  const work = path.join(base, 'works/example');
  fs.mkdirSync(work, { recursive: true });
  const config = path.join(work, 'workflow.json');
  fs.writeFileSync(config, '{}');
  const moduleURL = pathToFileURL(
    path.resolve(import.meta.dirname, '../src/project.mjs'),
  ).href;
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { loadProject } from ${JSON.stringify(moduleURL)};
    const before = process.listenerCount('exit');
    assert.deepEqual(loadProject('works/example/workflow.json').config, {});
    loadProject('works/example/workflow.json');
    assert.equal(process.listenerCount('exit'), before);
    assert.ok(!fs.existsSync(${JSON.stringify(path.join(base, '.manga-history'))}));
  `,
    ],
    { env: { ...process.env, MANGA_WORKSPACE: base }, stdio: 'pipe' },
  );
  assert.deepEqual(fs.readdirSync(base), ['works']);

  const target = path.join(base, 'mutable.json');
  writeJSON(target, { version: 1 });
  writeJSON(target, { version: 2 });
  assert.deepEqual(JSON.parse(fs.readFileSync(target)), { version: 2 });
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => writeJSON(target, cycle));
  assert.deepEqual(JSON.parse(fs.readFileSync(target)), { version: 2 });
  const directory = path.join(base, 'directory');
  fs.mkdirSync(directory);
  assert.throws(() => writeJSON(directory, {}));
  assert.ok(!fs.readdirSync(base).some((name) => name.endsWith('.tmp')));

  // Rendering consumes supplied URLs and placement only; no artwork files exist.
  const render = createPageRenderer({});
  const page = {
    id: '01',
    panels: [{ id: '01-1', rect: [16, 16, 400, 400], dialogue: [] }],
  };
  const svg = render(page, {
    art: null,
    provenance: null,
    panels: { '01-1': '../art&image.png' },
  });
  assert.ok(svg.includes('href="../art&amp;image.png"'));
  assert.ok(!svg.includes('data:image'));
  console.log(
    'PASS: side-effect-free project loading, atomic JSON failure safety, pure page rendering',
  );
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}
