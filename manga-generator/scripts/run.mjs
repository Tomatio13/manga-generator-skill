import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [workspace, command, ...args] = process.argv.slice(2);
assert.ok(
  workspace && /^[a-z][a-z0-9-]*$/.test(command || ''),
  'Usage: node run.mjs WORKSPACE COMMAND [ARGS...]',
);
const root = fs.realpathSync(path.resolve(workspace));
assert.ok(fs.statSync(root).isDirectory(), 'Workspace must be a directory');
const skillRoot = fs.realpathSync(skill);
assert.ok(
  root !== skillRoot && !root.startsWith(skillRoot + path.sep),
  'Keep production data outside the installed Skill',
);
assert.ok(
  process.env.MANGA_PROJECT ||
    fs.existsSync(path.join(root, 'workflow.json')) ||
    !fs.existsSync(path.join(root, 'works')),
  'Legacy workspace: set MANGA_PROJECT explicitly or migrate to a single-work folder',
);
const script = path.join(skill, 'engine', 'cli', command + '.mjs');
assert.ok(fs.existsSync(script), 'Unknown production command: ' + command);
const sharedPython = path.join(
  skill,
  '.runtime',
  '.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);
const pythonEnv =
  !process.env.MANGA_PYTHON && fs.existsSync(sharedPython)
    ? { MANGA_PYTHON: sharedPython }
    : {};
const result = spawnSync(process.execPath, [script, ...args], {
  cwd: root,
  env: {
    ...process.env,
    ...pythonEnv,
    MANGA_PROJECT: process.env.MANGA_PROJECT || 'workflow.json',
    MANGA_WORKSPACE: root,
  },
  stdio: 'inherit',
  windowsHide: true,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
