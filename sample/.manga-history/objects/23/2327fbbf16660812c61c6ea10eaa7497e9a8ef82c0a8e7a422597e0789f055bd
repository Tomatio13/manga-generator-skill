import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

// Read and validate once before passing resolved image URLs to the pure renderer.
export function readPageMaterials(
  page,
  { art, rough, panelsOnly, assetDir, local, panelJob, imageURL },
) {
  const url =
    imageURL ||
    ((file, bytes) => 'data:image/png;base64,' + bytes.toString('base64'));
  const provenance = art
    ? JSON.parse(
        fs.readFileSync(local(`${assetDir}/page-${page.id}.json`), 'utf8'),
      )
    : null;
  const panels = {};
  for (const p of page.panels) {
    const file = local(`${assetDir}/panels/${p.id}.png`);
    const record = local(`${assetDir}/panels/${p.id}.json`);
    if ((art || (panelsOnly && !rough)) && fs.existsSync(file)) {
      assert.ok(fs.existsSync(record), 'Panel override has no review record');
      const r = JSON.parse(fs.readFileSync(record, 'utf8'));
      assert.equal(
        r.fingerprint,
        panelJob(page, p).fingerprint,
        'Stale panel override',
      );
      const bytes = fs.readFileSync(file);
      assert.equal(
        r.imageHash,
        hash(bytes),
        'Panel image modified after review',
      );
      panels[p.id] = url(file, bytes);
    }
    if (panelsOnly && !rough)
      assert.ok(fs.existsSync(file), 'Missing panel artwork: ' + p.id);
  }
  return {
    art,
    artURL: art
      ? imageURL
        ? imageURL(
            local(`${assetDir}/page-${page.id}.png`),
            Buffer.from(art, 'base64'),
          )
        : 'data:image/png;base64,' + art
      : null,
    provenance,
    panels,
  };
}
