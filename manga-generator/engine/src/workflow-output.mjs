import { publishDirectory } from './publish-directory.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { xml } from './lettering.mjs';
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function writeWorkflowOutput({
  config,
  output,
  dir,
  codeRoot,
  local,
  status,
  svg,
  artFor,
  materialJobs,
}) {
  publishDirectory(
    output,
    (staged) => {
      for (const page of config.pages) {
        assert.equal(
          status(page),
          'ready',
          `Page ${page.id} pending or changed: regenerate/review before build`,
        );
        fs.writeFileSync(
          path.join(staged, `page-${page.id}.svg`),
          svg(page, artFor(page)),
        );
      }
      const manifest = config.pages.map((p) => ({
        id: p.id,
        materials: materialJobs(p).map((j) => ({
          asset: j.asset,
          fingerprint: j.fingerprint,
          imageHash: hash(fs.readFileSync(local(j.asset))),
          placementHash: hash(fs.readFileSync(local(j.record))),
        })),
        svgHash: hash(fs.readFileSync(path.join(staged, `page-${p.id}.svg`))),
      }));
      fs.writeFileSync(
        path.join(staged, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
      );
      fs.writeFileSync(
        path.join(staged, 'reader.html'),
        fs
          .readFileSync(path.join(codeRoot, 'templates', 'reader.html'), 'utf8')
          .replaceAll('{{TITLE}}', xml(config.title))
          .replaceAll('{{AUTHOR}}', xml(config.author || ''))
          .replace(
            '{{PAGES}}',
            JSON.stringify(
              config.pages.map((p) => ({
                id: p.id,
                alt: p.panels
                  .flatMap((q) => q.dialogue.map((d) => d.text))
                  .join(' / '),
              })),
            ).replaceAll('<', '\\u003c'),
          ),
      );
      fs.writeFileSync(
        path.join(staged, 'index.html'),
        `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${xml(config.title)} 改訂版</title><style>body{background:#e7e5e0;margin:0;font-family:Meiryo,sans-serif}header{max-width:850px;margin:28px auto;padding:20px}h1{font-size:24px}main{max-width:950px;margin:auto}img{width:100%;display:block;margin-bottom:26px}@media print{header{display:none}img{height:100vh;object-fit:contain;break-after:page}}</style><header><h1>${xml(config.title)} — 改訂版</h1><p>原作：${xml(config.author || '')} ／ 右から左、上から下へ。セリフとコマ割りを先に確定して制作。</p><a href="${path.relative(output, path.join(dir, 'storyboards', 'index.html')).replaceAll('\\', '/')}">制作前のネーム</a> · <a href="reader.html">1ページずつ読む</a></header><main>${config.pages.map((p) => `<img src="page-${p.id}.svg" alt="${xml(p.panels.flatMap((q) => q.dialogue.map((d) => `${d.speaker}: ${d.text.replace(/\n/g, '')}`)).join(' / '))}">`).join('')}</main></html>`,
      );
    },
    { replace: true },
  );
  console.log(
    `Built ${config.pages.length} pages and reproducibility manifest`,
  );
}
