import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { runProductionProcess } from '../src/production-process.mjs';
import { trackState } from '../src/state-history.mjs';
import { root, codeRoot } from '../src/workspace.mjs';
assert.ok(process.env.MANGA_PROJECT, 'Set MANGA_PROJECT explicitly');
trackState(root, process.env.MANGA_PROJECT);
const mode = process.argv[2] || 'create';
assert.ok(['create', 'verify'].includes(mode), 'Use create | verify');
const bundled = path.join(
  os.homedir(),
  '.cache',
  'codex-runtimes',
  'codex-primary-runtime',
  'dependencies',
  'python',
  'python.exe',
);
const python =
  process.env.MANGA_PYTHON ||
  (fs.existsSync(bundled)
    ? bundled
    : process.platform === 'win32'
      ? 'python'
      : 'python3');
runProductionProcess(
  python,
  [path.join(codeRoot, 'scripts', 'export-pdf.py'), mode],
  {
    workspace: root,
    project: process.env.MANGA_PROJECT,
  },
);
