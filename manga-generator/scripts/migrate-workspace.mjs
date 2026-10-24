import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Copy a single legacy workspace into a new flat work. Never mutate old evidence.
const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [sourceArg, id, targetArg, ...extra] = process.argv.slice(2);
assert.ok(
  sourceArg && targetArg && !extra.length,
  'Usage: node migrate-workspace.mjs OLD-WORKSPACE WORK-ID NEW-WORK-FOLDER',
);
assert.match(id || '', /^[a-z][a-z0-9-]{0,63}$/);
const source = fs.realpathSync(sourceArg);
const requestedTarget = path.resolve(targetArg);
const parent = fs.realpathSync(path.dirname(requestedTarget));
const target = path.join(parent, path.basename(requestedTarget));
const skillRoot = fs.realpathSync(skill);
assert.ok(
  parent !== skillRoot && !parent.startsWith(skillRoot + path.sep),
  'Keep work outside the installed Skill',
);
assert.ok(
  target !== source &&
    !target.startsWith(source + path.sep) &&
    !source.startsWith(target + path.sep),
  'Source and destination must not overlap',
);
assert.ok(!fs.existsSync(target), 'Destination exists; refusing to overwrite');
const prefix = 'works/' + id;
const oldWork = path.join(source, prefix);
for (const folder of [path.join(source, 'works'), oldWork]) {
  const stat = fs.lstatSync(folder);
  assert.ok(
    stat.isDirectory() && !stat.isSymbolicLink(),
    'Migration refuses redirected work directories',
  );
}
assert.ok(
  fs.existsSync(path.join(oldWork, 'workflow.json')),
  'Missing legacy work',
);
assert.deepEqual(
  fs.readdirSync(path.join(source, 'works')),
  [id],
  'Migrate only single-work workspaces; split collections first',
);
const staging = target + '.' + crypto.randomUUID() + '.migrating';
const copied = [];
const digest = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function copy(from, to) {
  const stat = fs.lstatSync(from);
  assert.ok(
    !stat.isSymbolicLink(),
    'Migration refuses symbolic links: ' + from,
  );
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from))
      copy(path.join(from, name), path.join(to, name));
  } else {
    assert.ok(stat.isFile(), 'Unsupported migration input: ' + from);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    const hash = digest(from);
    fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    assert.equal(digest(to), hash, 'Migration copy differs: ' + from);
    copied.push({
      from: path.relative(source, from).replaceAll('\\', '/'),
      to: path.relative(staging, to).replaceAll('\\', '/'),
      hash,
    });
  }
}
function rebase(value) {
  if (typeof value === 'string') {
    if (value === prefix) return '.';
    if (value.startsWith(prefix + '/')) return value.slice(prefix.length + 1);
    return value;
  }
  if (Array.isArray(value)) return value.map(rebase);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [rebase(key), rebase(item)]),
    );
  return value;
}
try {
  fs.mkdirSync(staging);
  // Evidence and lock bytes are copied verbatim; only new operational config is rebased.
  for (const name of fs.readdirSync(oldWork)) {
    const archived = [
      'workflow.json',
      'workflow.lock.json',
      'automation.json',
    ].includes(name);
    copy(
      path.join(oldWork, name),
      path.join(staging, archived ? 'scratch/legacy-layout/' + name : name),
    );
  }
  for (const name of fs.readdirSync(source)) {
    if (
      [
        'works',
        '.venv',
        'venv',
        'environment',
        '.runtime',
        'node_modules',
        '.git',
        '__pycache__',
        '.cache',
      ].includes(name)
    )
      continue;
    const destination = ['.manga-history', 'releases'].includes(name)
      ? name
      : /\.(mjs|py)$/.test(name)
        ? 'workflow/scripts/legacy/' + name
        : 'scratch/legacy-root/' + name;
    copy(path.join(source, name), path.join(staging, destination));
  }
  const save = (name, value) => {
    const file = path.join(staging, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  };
  const config = rebase(
    JSON.parse(fs.readFileSync(path.join(oldWork, 'workflow.json'), 'utf8')),
  );
  save('workflow.json', config);
  const requestPath = path.join(staging, 'workflow/automation-request.json');
  if (fs.existsSync(requestPath)) {
    copy(
      path.join(oldWork, 'workflow/automation-request.json'),
      path.join(staging, 'scratch/legacy-layout/automation-request.json'),
    );
    const request = rebase(JSON.parse(fs.readFileSync(requestPath, 'utf8')));
    request.config = 'workflow.json';
    save('workflow/automation-request.json', request);
  }
  const task = path.join(staging, 'workflow/automatic-task.md');
  if (fs.existsSync(task)) {
    copy(
      path.join(oldWork, 'workflow/automatic-task.md'),
      path.join(staging, 'scratch/legacy-layout/automatic-task.md'),
    );
    fs.writeFileSync(
      task,
      `# 移行した作品の再開\n\n対象: workflow.json\n原作: source/original.txt\n共有Skill: ${skill}\n\n共通手順はSkill内 engine/docs/AUTOMATIC.mdを読む。保存先はこの作品フォルダ、MANGA_PROJECT=workflow.json。\n過去のレビューは旧パスに対する記録であり、新構成の検証済み記録ではない。workflow/migration.jsonを読み、plan、必要な正式採用、preview、実画像確認と正式レビューから再開する。画像を新規生成していない場合は再生成済みと記録しない。過去の指紋・ロックを手書きで更新しない。\n`,
    );
  }
  copy(
    path.join(skill, 'scripts/workspace.gitignore'),
    path.join(staging, '.gitignore'),
  );
  save('workflow/migration.json', {
    version: 1,
    migratedAt: new Date().toISOString(),
    from: source,
    legacyProject: prefix + '/workflow.json',
    project: 'workflow.json',
    status: 'needs-revalidation',
    note: 'Artwork and published outputs are unchanged. Existing reviews retain their original paths and fingerprints. Old locks, completion declarations and helper inputs are archived unchanged; no new completion or visual review is claimed. Legacy scripts are historical and still use old paths; do not replay them on this work.',
    excluded: [
      '.venv',
      'venv',
      'environment',
      '.runtime',
      'node_modules',
      '.git',
      '__pycache__',
      '.cache',
    ],
    copied: copied.filter(
      (item) =>
        ![
          'workflow/automation-request.json',
          'workflow/automatic-task.md',
        ].includes(item.to),
    ),
    rewritten: [
      'workflow.json',
      'workflow/automation-request.json',
      'workflow/automatic-task.md',
    ]
      .filter((name) => fs.existsSync(path.join(staging, name)))
      .map((name) => ({ file: name, hash: digest(path.join(staging, name)) })),
  });
  fs.writeFileSync(
    path.join(staging, 'README.md'),
    `# ${config.title}\n\nこのフォルダが1作品のルートです。設定は workflow.json、原作は source/、素材は assets/、制作記録は workflow/、完成出力は output/、確定済みパッケージは releases/。\n\n作品用スクリプトは workflow/scripts/、一時資料は scratch/。legacy 配下の補助スクリプトは旧配置用の履歴資料です。再実行しないでください。共通環境はSkill内 .runtime/ を使います。\n\n移行は保存場所の整理です。画像・PDF・確定パッケージと過去レビューは改変していません。現在の設定はパスを変更したため未再検証です。workflow/migration.json と workflow/automatic-task.md を参照してください。\n`,
  );
  fs.renameSync(staging, target);
  console.log(
    `Migrated: ${target}\nProject: workflow.json\nStatus: needs-revalidation; original workspace preserved at ${source}`,
  );
} catch (error) {
  fs.rmSync(staging, { recursive: true, force: true });
  throw error;
}
