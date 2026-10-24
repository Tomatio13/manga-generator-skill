import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

export const codeRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
if (process.env.MANGA_WORKSPACE)
  assert.ok(
    path.isAbsolute(process.env.MANGA_WORKSPACE),
    'MANGA_WORKSPACE must be absolute',
  );
export const root = process.env.MANGA_WORKSPACE
  ? path.resolve(process.env.MANGA_WORKSPACE)
  : codeRoot;

// Read-only runtime inputs are always resolved from the executing engine.
// Project data stays rooted at MANGA_WORKSPACE, including in old copied workspaces.
export function sourceFile(name) {
  assert.ok(
    typeof name === 'string' &&
      !path.isAbsolute(name) &&
      !name.split(/[\\/]/).includes('..'),
    'Unsafe input path',
  );
  const runtime =
    /^(cli|src|scripts|templates|tests|docs)([\\/]|$)/.test(name) ||
    [
      'package.json',
      'LICENSE',
      'README.md',
      'README.en.md',
      'REPRODUCE.md',
      'AGENTS.md',
    ].includes(name) ||
    /^works\/sample([\/]|$)/.test(name);
  return path.join(runtime ? codeRoot : root, name);
}
