import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

export function runProductionProcess(
  executable,
  args,
  {
    workspace,
    project,
    env = {},
    stdio = 'inherit',
    maxBuffer = 20 * 1024 * 1024,
  },
) {
  assert.ok(
    path.isAbsolute(workspace),
    'Production workspace must be absolute',
  );
  return execFileSync(executable, args, {
    cwd: workspace,
    env: {
      ...process.env,
      ...env,
      MANGA_WORKSPACE: workspace,
      ...(project === undefined ? {} : { MANGA_PROJECT: project }),
    },
    encoding: 'utf8',
    stdio,
    maxBuffer,
    windowsHide: true,
  });
}

export function runEngine(script, args, { codeRoot, ...options }) {
  assert.ok(
    !path.isAbsolute(script) && !script.split(/[\\/]/).includes('..'),
    'Use an engine-relative script path',
  );
  return runProductionProcess(
    process.execPath,
    [path.join(codeRoot, script), ...args],
    options,
  );
}
