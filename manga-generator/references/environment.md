# 配布先の環境準備

新しい端末で制作を始めるときと依存不足で失敗したときに読む。以下のコマンドはCodexが実行し、結果を確認する。ユーザーにコマンド操作を委ねない。環境の導入は制作の準備であり、画像生成・検品の完了ではない。

## 作業環境を用意する

1. Node.js 24 が利用できるか `node --version` で確認する。
2. `node <Skillの絶対パス>/scripts/setup.mjs workspace <新しい作業フォルダー>` を実行し、1作品用の保存先と環境除外用.gitignoreを作成する。production/やworks/を挟まず、この保存先を作品ルートにする。コードと手順書はSkill内に残る。その保存先へ移動する。再開の場合は既存の制作フォルダーを使い、作り直さない。
3. Python 3 を確認する。macOS/Linux は `python3 --version`、Windows は `py -3 --version`。`py` がなく `python` が利用できる場合は、そのPython 3を使う。

Nodeの本体は標準ライブラリを使うため、制作だけなら npm install は不要。保存先へpackage.jsonや実行コードをコピーしない。開発用の依存とテストはSkill内engine/の開発用である。

## Pythonの仮想環境

仮想環境と依存パッケージはSkill内の `.runtime/.venv/` に一度だけ準備し、全作品で共有する。制作フォルダーや作品内へvenv、node_modules、共通ツール、モデル、ダウンロードキャッシュを作らない。OSのブラウザー・フォント・Popplerも既存の導入を再利用する。追加の共通ツールが必要ならSkill内 `.runtime/` に置く。

```sh
node /absolute/skill/scripts/setup.mjs environment
```

Windowsでも同じNodeコマンドを使う。Python 3（Windowsは `py -3`）で作成し、reportlab・pypdf・Pillowをimport検査する。既存venvは削除・上書きせず、importが通れば再インストールしない。作成元のPythonを選ぶ場合は初回実行の `MANGA_PYTHON` に指定する。activateやPowerShell実行ポリシーの変更は不要。

`run.mjs` はこの共通Pythonを自動選択する。外部のPythonを明示した `MANGA_PYTHON` は優先するため、古い制作先のvenvを指す値が残っていないか確認する。起動ヘルパーはMANGA_PROJECT=workflow.jsonを自動設定する。旧構成のみ対象作品を明示する。

venv / ensurepip不足や権限・ネットワーク制限で失敗したら実際のエラーを伝える。制作先に環境を作って迂回したり、システムPythonへ `--break-system-packages` で強制導入したりしない。

## 導入したバージョンを記録する

セットアップはPythonとPDF依存のバージョンをSkill内 `.runtime/environment/python-<一意ID>.json` に記録する。依存変更後も追記し、以前の記録は上書きしない。記録ヘルパーはどこから起動しても共通環境側へ保存する。環境記録は作品の完成証明や依存の固定ではない。

`.runtime/` はGit管理・Skill再配布・作品の再現パッケージの対象外。`setup.mjs workspace` は環境類を除外する `.gitignore` も制作先に作る。すでにGitへ追跡済みの環境はignoreだけでは外れないため、追跡状況を確認してから別途対応する。

既存の制作先のvenvは移動すると壊れることがある。共通環境を新規準備して切り替え、旧環境・確定済みパッケージは自動削除しない。

## ブラウザー・日本語フォント・PDF検品

- ChromeまたはEdgeの実行ファイルを探し、その絶対パスを MANGA_BROWSER に指定する。macOS/Linuxでも明示する（同梱CLIの自動検出先はWindows用）。例：Linuxの `export MANGA_BROWSER=/usr/bin/google-chrome`、macOSの `export MANGA_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`。実際に存在するパスへ置き換える。PowerShellでは `$env:MANGA_BROWSER = 'C:\Program Files\Google\Chrome\Application\chrome.exe'` など。
- 日本語フォントの有無を調べ、ネームのPNGを実見して日本語が欠けず表示されることを確認する。
- Poppler の `pdftoppm` と `pdfinfo` をPATHへ用意する。`pdftoppm -v` と `pdfinfo -v` を実行して確認する。pipの上記3パッケージにはブラウザー・フォント・Popplerは含まれない。
- 不足するOSソフトは、使用OSと利用可能な導入手段を確認して導入する。管理者操作が必要な場合だけ、その操作と理由をユーザーへ伝える。

原作受付後、上記の環境変数を設定して `node <Skill>/scripts/run.mjs <保存先> workflow check` を実行する。これは設定検査であり、作画・PNG出力・PDFの動作確認にはならない。実際のネーム出力でブラウザーとフォントを、完成PNGからの `node <Skill>/scripts/run.mjs <保存先> pdf create` と `node <Skill>/scripts/run.mjs <保存先> pdf verify` でPDFを確認する。PDFは全ページをPopplerでPNGへ変換し、実画像を見て検品する。

## Codexの制作機能

組み込み画像生成、生成画像の表示、独立サブエージェントレビューがセッションで実際に利用可能か調べる。Python依存が入ってもこれらは追加されない。画像生成の利用枠不足やツール不在を、白いPNG・架空のレビュー・受付成功で代用しない。可能な準備と途中状態を保存し、利用できない機能と未完了工程を具体的に報告する。
