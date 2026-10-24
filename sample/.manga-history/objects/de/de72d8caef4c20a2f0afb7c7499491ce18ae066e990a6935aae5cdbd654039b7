import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { codeRoot } from '../src/workspace.mjs';

const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), 'manga-migration-test-'),
);
const old = path.join(temporary, 'old');
const target = path.join(temporary, 'my-manga');
const skill = path.dirname(codeRoot);
const hash = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const save = (name, data) => {
  const file = path.join(old, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};
const prefix = 'works/auto-123456789abc';
const config = {
  title: 'Synthetic migration',
  sourceFile: prefix + '/source/original.txt',
  assetDir: prefix + '/assets',
  workflowDir: prefix + '/workflow',
  outputDir: prefix + '/output',
  references: [prefix + '/assets/characters.png'],
  referenceRoles: {
    [prefix + '/assets/characters.png']: 'Canonical character design',
  },
};
try {
  save(prefix + '/workflow.json', JSON.stringify(config));
  save(prefix + '/source/original.txt', 'Synthetic source');
  save(prefix + '/assets/characters.png', 'Synthetic image bytes');
  save(
    prefix + '/workflow/automation-request.json',
    JSON.stringify({
      config: prefix + '/workflow.json',
      sourceFile: config.sourceFile,
    }),
  );
  save(prefix + '/workflow/automatic-task.md', 'Old task with old paths');
  save(
    prefix + '/workflow/stage-reviews/final.json',
    '{"fingerprint":"original-evidence"}',
  );
  save(prefix + '/workflow.lock.json', '{"original":"immutable-lock"}');
  save(prefix + '/automation.json', '{"status":"complete"}');
  save(
    prefix + '/output/reader.html',
    '<html>Synthetic published output</html>',
  );
  save('releases/fixed.tar.gz', 'Immutable release bytes');
  save('.manga-history/states/legacy/state.json', 'Immutable history bytes');
  save('edit.mjs', "const file = 'works/auto-123456789abc/workflow.json';");
  save('review-input.json', '{"path":"original-path"}');
  save('.venv/secret-environment', 'Do not copy');
  save('environment/old.json', '{}');
  const migrate = (destination = target) =>
    execFileSync(
      process.execPath,
      [
        path.join(skill, 'scripts/migrate-workspace.mjs'),
        old,
        'auto-123456789abc',
        destination,
      ],
      { encoding: 'utf8', stdio: 'pipe' },
    );
  const originalLock = hash(path.join(old, prefix, 'workflow.lock.json'));
  assert.match(migrate(), /needs-revalidation/);
  const rebased = JSON.parse(
    fs.readFileSync(path.join(target, 'workflow.json'), 'utf8'),
  );
  assert.equal(rebased.sourceFile, 'source/original.txt');
  assert.deepEqual(rebased.referenceRoles, {
    'assets/characters.png': 'Canonical character design',
  });
  for (const name of [
    '.venv',
    'environment',
    'works',
    'workflow.lock.json',
    'automation.json',
    'edit.mjs',
    'review-input.json',
  ])
    assert.ok(
      !fs.existsSync(path.join(target, name)),
      'Unexpected root entry: ' + name,
    );
  assert.equal(
    hash(path.join(target, 'scratch/legacy-layout/workflow.lock.json')),
    originalLock,
  );
  assert.equal(
    hash(path.join(old, prefix, 'workflow.lock.json')),
    originalLock,
  );
  const record = JSON.parse(
    fs.readFileSync(path.join(target, 'workflow/migration.json'), 'utf8'),
  );
  assert.equal(record.status, 'needs-revalidation');
  for (const item of record.copied) {
    assert.equal(hash(path.join(old, item.from)), item.hash);
    assert.equal(hash(path.join(target, item.to)), item.hash);
  }
  for (const item of record.rewritten)
    assert.equal(hash(path.join(target, item.file)), item.hash);
  assert.throws(() => migrate());
  save('works/other/workflow.json', '{}');
  const rejected = path.join(temporary, 'multiple-works');
  assert.throws(() => migrate(rejected));
  assert.ok(!fs.existsSync(rejected));
  fs.rmSync(path.join(old, 'works/other'), { recursive: true });
  fs.symlinkSync(
    path.join(old, prefix, 'source/original.txt'),
    path.join(old, prefix, 'source/redirect.txt'),
  );
  const linked = path.join(temporary, 'linked');
  assert.throws(() => migrate(linked));
  assert.ok(!fs.existsSync(linked));
  assert.ok(
    !fs.readdirSync(temporary).some((name) => name.endsWith('.migrating')),
  );
  console.log(
    'PASS: flat migration, rebased config, immutable reviews/locks/releases/history, excluded environment, verified copies, overwrite/multi-work/symlink refusal and failure cleanup',
  );
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
