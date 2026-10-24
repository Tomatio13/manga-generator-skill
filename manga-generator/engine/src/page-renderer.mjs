import { xml, createLettering } from './lettering.mjs';
import { renderStoryboardSketch } from './storyboard-sketch.mjs';

export function createPageRenderer(cast) {
  const { balloon, balloonMask } = createLettering(cast);
  return function renderPage(
    page,
    { art, artURL, provenance, panels },
    { rough = false, layer = 'all', guides = true } = {},
  ) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">${layer === 'all' ? '<rect width="1024" height="1536" fill="white"/>' : ''}${art && layer !== 'lettering' ? `<defs><image id="page-source" href="${xml(artURL)}" width="1024" height="1536" preserveAspectRatio="none"/></defs>` : ''}${page.panels
      .map((p, i) => {
        const [x, y, w, h] = p.rect;
        const [sx, sy, sw, sh] = provenance?.sourceRects?.[i] ?? p.rect;
        // ponytail: contain keeps anatomy undistorted; draw a new panel when the aspect mismatch wastes too much space.
        const picture = art
          ? `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${sx} ${sy} ${sw} ${sh}" preserveAspectRatio="xMidYMid meet"><defs><clipPath id="p${i}"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}"/></clipPath></defs><use href="#page-source" clip-path="url(#p${i})"/></svg>`
          : Object.entries(p.speakers || {})
              .map(([id, s]) =>
                s.kind === 'offscreen'
                  ? ''
                  : `${s.face ? `<rect x="${s.face[0]}" y="${s.face[1]}" width="${s.face[2]}" height="${s.face[3]}" fill="${rough && !art && p.storyboardSketch ? 'none' : '#f5f5f5'}" stroke="#bbb"/>` : ''}<circle cx="${s.anchor[0]}" cy="${s.anchor[1]}" r="5" fill="#999"/><text x="${s.anchor[0] + 10}" y="${s.anchor[1]}" font-size="18">${xml(id)}</text>`,
              )
              .join('');
        const override = panels[p.id];
        let material = picture;
        if (override)
          material = `<image href="${xml(override)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
        if (rough && !art && p.storyboardSketch)
          material =
            renderStoryboardSketch(
              p.storyboardSketch,
              p.rect,
              'rough-sketch-' + i,
              { rough: true },
            ) + material;
        const lettering =
          `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="black" stroke-width="3"/>` +
          (layer === 'artwork'
            ? ''
            : p.dialogue.map((d) => balloonMask(p, d)).join('')) +
          p.dialogue.map((d) => balloon(p, d)).join('');
        return (
          (layer === 'lettering' ? '' : material) +
          (layer === 'artwork' ? '' : lettering) +
          (rough && guides
            ? `<text x="${x + 12}" y="${y + h - 14}" font-size="18" fill="#666">${p.order} / ${xml(p.beat)}</text>`
            : '')
        );
      })
      .join(
        '',
      )}${layer === 'artwork' ? '' : `<text x="512" y="1500" text-anchor="middle" font-family="sans-serif" font-size="20">${Number(page.id)}</text>`}</svg>`;
  };
}
