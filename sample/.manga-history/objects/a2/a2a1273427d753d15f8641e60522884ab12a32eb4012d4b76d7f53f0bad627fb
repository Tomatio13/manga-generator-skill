import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Prepare on the same filesystem, then publish. Caught promotion failures restore
// the previous directory. A hard process/OS stop during the two renames still
// requires recovery from the retained transaction directory; this is not ACID.
export function publishDirectory(
  destination,
  prepare,
  { replace = false } = {},
) {
  destination = path.resolve(destination);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const transaction = path.join(
    path.dirname(destination),
    '.' + path.basename(destination) + '.publishing',
  );
  // Exclusive directory creation also prevents concurrent publishers for this target.
  fs.mkdirSync(transaction);
  const staged = path.join(transaction, 'staged');
  const previous = path.join(transaction, 'previous');
  let retain = false;
  try {
    const exists = fs.existsSync(destination);
    assert.ok(
      replace || !exists,
      'Destination exists; preserve it: ' + destination,
    );
    if (exists) {
      assert.ok(
        fs.lstatSync(destination).isDirectory(),
        'Destination must be a directory',
      );
      fs.cpSync(destination, staged, {
        recursive: true,
        filter: (file) => {
          assert.ok(
            !fs.lstatSync(file).isSymbolicLink(),
            'Publication refuses symbolic links: ' + file,
          );
          return true;
        },
      });
    } else fs.mkdirSync(staged);
    prepare(staged);
    assert.ok(
      fs.lstatSync(staged).isDirectory(),
      'Prepared output must be a directory',
    );
    if (!replace)
      assert.ok(
        !fs.existsSync(destination),
        'Destination appeared during publication',
      );
    if (exists) fs.renameSync(destination, previous);
    try {
      fs.renameSync(staged, destination);
    } catch (error) {
      if (exists) {
        try {
          fs.renameSync(previous, destination);
        } catch (rollback) {
          retain = true;
          throw new AggregateError(
            [error, rollback],
            'Publication rollback failed; recover previous output from ' +
              previous,
          );
        }
      }
      throw error;
    }
  } finally {
    if (!retain) fs.rmSync(transaction, { recursive: true, force: true });
  }
}
