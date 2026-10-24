import fs from 'node:fs';
import path from 'node:path';

// These directories contain code and templates needed by restored copies.
export function runtimeFiles(root) {
  const result = [];
  function walk(relative) {
    const full = path.join(root, relative);
    if (!fs.existsSync(full)) return;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      const file = path.posix.join(relative, entry.name);
      // OneDrive placeholders may look like links in Dirent; inspect the path.
      const stat = fs.lstatSync(path.join(root, file));
      if (stat.isDirectory()) walk(file);
      else if (stat.isFile()) result.push(file);
    }
  }
  for (const dir of ['cli', 'src', 'scripts', 'templates', 'tests']) walk(dir);
  return result.sort();
}

// Inputs needed for a self-contained release or restored history, not a live workspace copy.
export function sharedFiles(root) {
  const result = runtimeFiles(root);
  for (const name of [
    'package.json',
    'LICENSE',
    'README.md',
    'README.en.md',
    'REPRODUCE.md',
    'AGENTS.md',
    'works/sample/workflow.json',
    'works/sample/source/original.txt',
  ])
    if (fs.existsSync(path.join(root, name))) result.push(name);
  function docs(relative) {
    if (!fs.existsSync(path.join(root, relative))) return;
    for (const entry of fs.readdirSync(path.join(root, relative), {
      withFileTypes: true,
    })) {
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) docs(file);
      else if (entry.isFile()) result.push(file);
    }
  }
  docs('docs');
  return [...new Set(result)].sort();
}
