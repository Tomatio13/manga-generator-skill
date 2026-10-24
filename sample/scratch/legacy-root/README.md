# その物語、漫画にしよう。

manga-generator Skill の紹介用に書き下ろした、ユイとレンの2ページ漫画。

- 原作・制作設定・採用画像・レビューは `works/auto-c4339911528c/`。
- 共通エンジンは `../../manga-generator/engine/` を共有。
- 生成手段は Codex built-in image_gen。モデルIDはツールから通知されないため不明。
- 新しい画像の生成は非決定的。完成パッケージが再現する範囲は採用素材からの組版。
- 環境: Node.js 24、Google Chrome、Poppler、Noto CJK、日本語フォント、制作先の Python .venv。

最終成果物の場所と完了判定は作品内 workflow/automation.json を参照。
