import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Atomic replacement for mutable JSON, not immutable evidence or exclusive creation.
// This prevents partial files; callers still own concurrent update/conflict policy.
export function writeJSON(file, value) {
  const bytes = JSON.stringify(value, null, 2);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.' + randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temporary, bytes, { flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}
