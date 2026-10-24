# 共有実行と既存作品の再開

## 実行方法

実行コードはSkillのengine/、書き込み先は保存先フォルダー。起動ヘルパーはこの2つを分けて実行する。すべての制作CLIは次の形で呼ぶ。

```sh
node /absolute/skill/scripts/run.mjs /absolute/workspace workflow status
```

1フォルダを1作品として扱い、起動ヘルパーが `MANGA_PROJECT=workflow.json` を自動設定する。旧構成をそのまま再開するときだけ `MANGA_PROJECT=works/<id>/workflow.json` を明示する。PowerShellなら `$env:MANGA_PROJECT` を使う。ヘルパーが MANGA_WORKSPACE を絶対パスで子プロセスへ渡すので、通常は利用者が設定しない。別の保存先へ切り替える場合もヘルパーの引数を変える。

資料中の `node cli/NAME.mjs ARGS` は `node /absolute/skill/scripts/run.mjs /absolute/workspace NAME ARGS` と読み替える。ファイル引数は保存先からの相対パスか、CLIが許可する外部入力の絶対パスを使う。

| 従来の資料の表記 | 起動ヘルパーのCOMMAND以降 |
| --- | --- |
| node cli/auto.mjs start ORIGINAL.txt | auto start /absolute/ORIGINAL.txt |
| node cli/workflow.mjs plan | workflow plan |
| npm run workflow:plan | workflow plan の後に export storyboards |
| npm run workflow:build | workflow build の後に export current |
| npm run workflow:layers | workflow layers |
| node cli/stage-review.mjs prepare-reading storyboard 01 | stage-review prepare-reading storyboard 01 |
| node cli/pdf.mjs create | pdf create |
| node cli/reproduce.mjs freeze | reproduce freeze |
| node cli/history.mjs checkpoint LABEL | history checkpoint LABEL |

資料はSkill内engine/から読む。保存先へREADME・AGENTS・docs・テストを複製する必要はない。通常の制作でnpm installやnpm run checkは不要。開発用の回帰検証はengineの隔離コピー上で実行し、制作先やインストール先をテストの作業領域にしない。

## 保存されるもの

保存先直下にworkflow.json、source/、assets/、workflow/、output/、.manga-history/、releases/を保存する。production/やworks/auto-*/は作らない。作品専用スクリプトはworkflow/scripts/、一時JSON・レビューへ渡す入力はscratch/へ保存する。Python環境・依存・バージョン記録はSkill内 `.runtime/` で共有する。制作先の `.gitignore` は環境類を除外する。コードを実行するためのcli/・src/・scripts/・tests/・templates/・docs/は作らない。

履歴は、その時点の共通処理も内容ハッシュ別のobjectsへ重複排除して保存する。これは復元に必要なスナップショットであり、保存先へ実行環境を展開する処理ではない。完成時の再現パッケージと明示的な履歴抽出には、別PCで再構築するためのコードを含める。パッケージを展開した場合は、その中のコードで独立して実行できる。

## コピー済みの制作フォルダー

既存の保存先をそのままrun.mjsへ渡し、MANGA_PROJECTで作品を選ぶ。新しいworkspace作成や再受付は不要。未完了工程はauto statusと実物で確認して再開する。旧コード・素材・履歴・固定版は削除しない。

共有Skillの更新後、既存のfreeze済み入力とコードが違えば検査は失敗する。旧固定版を再現する場合は、当時のパッケージや保存してある旧コードを使う。新コードでの改訂版は必要な再計画・再採用・視覚確認・再現検証を経て別パッケージとして保存する。指紋やロックを手書きで合わせない。


## 旧構成から1作品フォルダへ移行する

明示的な整理依頼がある場合は、元の保存先を残したまま、新しい1作品フォルダへ移行できる。

```sh
node /absolute/skill/scripts/migrate-workspace.mjs /absolute/old-workspace auto-123456789abc /absolute/my-manga
node /absolute/skill/scripts/run.mjs /absolute/my-manga auto status
```

移行先は未作成で、Skill外・元保存先と重ならない場所にする。移行ヘルパーは1作品だけを含む旧保存先を対象とし、複数作品がある場合は拒否する。素材・完成出力・releases/・.manga-history/・過去レビューはバイトを変えずにコピー検証する。設定と受付依頼だけを新しい相対パスへ変更する。旧設定・ロック・完成宣言はscratch/legacy-layout/、直下の補助JSONはscratch/legacy-root/、旧補助スクリプトはworkflow/scripts/legacy/へ保存する。旧補助スクリプトは旧パス用の履歴資料であり、再実行しない。

venv・依存・環境記録はコピーしない。過去レビューのパスや指紋は書き換えず、移行結果をworkflow/migration.jsonへ記録する。移行後は未再検証で、過去の完成宣言を流用しない。plan・必要な正式採用・preview・実画像確認・正式レビューを経て改訂版を確定する。以前の完成作品はreleases/の確定済みパッケージから閲覧・再構築できる。元保存先の削除や退避はヘルパーでは行わない。
