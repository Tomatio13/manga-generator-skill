import assert from 'node:assert/strict';
import { box, overlap, segmentEntry, createLettering } from './lettering.mjs';
import { renderStoryboardSketch } from './storyboard-sketch.mjs';

export function validateWorkflow(data, { stateFor }) {
  const cast = data.cast;
  const caption = (id) => cast[id]?.kind === 'caption';
  const { tailGeometry } = createLettering(cast);
  assert.ok(Array.isArray(data.pages) && data.pages.length, 'No pages');
  const panelIds = new Set();
  const ids = new Set();
  for (const page of data.pages) {
    if (data.version >= 3) {
      assert.ok(page.expectation?.length, 'Missing reader expectation');
      page.panels.forEach((p) =>
        assert.ok(
          [
            '提示',
            '始動',
            '反応',
            '期待',
            '転換',
            '決定',
            '余韻',
            '笑い',
          ].includes(p.role),
          'Missing narrative role',
        ),
      );
    }
    if (
      page.showcase !== undefined &&
      page.showcase !== null &&
      page.showcase !== ''
    )
      assert.ok(
        page.panels.some((p) => p.id === page.showcase),
        'Unknown showcase panel: ' + page.id,
      );
    assert.match(page.id, /^\d{2}$/);
    assert.ok(!ids.has(page.id));
    ids.add(page.id);
    assert.ok(page.panels.length >= 2 && page.panels.length <= 6);
    page.panels.forEach((p, i) => {
      stateFor(page, p);
      assert.match(p.id, /^[a-zA-Z0-9_-]+$/);
      assert.ok(!panelIds.has(p.id), 'Duplicate panel ID');
      panelIds.add(p.id);
      const [x, y, w, h] = p.rect;
      if (p.storyboardSketch !== undefined)
        renderStoryboardSketch(p.storyboardSketch, p.rect, 'validate-sketch', {
          rough: true,
        });
      for (const [id, a] of Object.entries(p.speakers || {})) {
        assert.ok(Object.hasOwn(cast, id), 'Unknown actor');
        if (a.kind !== 'offscreen') {
          assert.ok(
            a.anchor?.length === 2 && a.anchor.every(Number.isFinite),
            'Invalid anchor',
          );
          assert.ok(
            a.anchor[0] >= x &&
              a.anchor[0] <= x + w &&
              a.anchor[1] >= y &&
              a.anchor[1] <= y + h,
            'Speaker anchor outside panel',
          );
          assert.ok(
            a.kind === 'head' ||
              (a.face?.length === 4 &&
                a.face.every(Number.isFinite) &&
                a.face[2] > 0 &&
                a.face[3] > 0),
            'Visible speaker needs face bounds',
          );
          if (a.face)
            assert.ok(
              a.face[0] >= x &&
                a.face[1] >= y &&
                a.face[0] + a.face[2] <= x + w &&
                a.face[1] + a.face[3] <= y + h,
              'Face outside panel',
            );
        }
      }
      assert.ok(
        [x, y, w, h].every(Number.isFinite) &&
          x >= 16 &&
          y >= 16 &&
          w > 0 &&
          h > 0 &&
          x + w <= 1008 &&
          y + h <= 1464,
        'Panel outside safe area',
      );
      assert.equal(p.order, i + 1);
      for (const q of page.panels.slice(0, i))
        assert.ok(!overlap(p.rect, q.rect), 'Panels overlap');
      if (i) {
        const prev = page.panels[i - 1].rect;
        assert.ok(
          y > prev[1] || (y === prev[1] && x < prev[0]),
          'Reading order must be top to bottom, right to left',
        );
      }
      for (const r of p.protected || [])
        assert.ok(
          r.length === 4 &&
            r.every(Number.isFinite) &&
            r[2] > 0 &&
            r[3] > 0 &&
            r[0] >= x &&
            r[1] >= y &&
            r[0] + r[2] <= x + w &&
            r[1] + r[3] <= y + h,
          'Invalid protected area: ' + p.id,
        );
      const bounds = p.dialogue.map((d) => {
        if (d.tailLength !== undefined)
          assert.ok(
            Number.isInteger(d.tailLength) &&
              d.tailLength >= 24 &&
              d.tailLength <= 160,
            'tailLength must be an integer from 24 to 160',
          );
        assert.ok(
          Object.hasOwn(cast, d.speaker),
          'Unknown speaker: ' + d.speaker,
        );
        assert.ok(d.text.length && ['right', 'left'].includes(d.side));
        if (caption(d.speaker))
          assert.ok(
            !/^(?:お読みいただき|ご(?:愛読|読了))ありがとうございます[。！!]*$/.test(
              d.text.replace(/[\s、,]/g, ''),
            ),
            'Reader acknowledgement belongs in source records, not manga dialogue: ' +
              p.id,
          );
        assert.ok(
          Number.isInteger(d.capacity ?? 10) &&
            (d.capacity ?? 10) >= 4 &&
            (d.capacity ?? 10) <= 14,
        );
        const b = box(p, d);
        assert.ok(
          b[0] >= x &&
            b[1] >= y &&
            b[0] + b[2] <= x + w &&
            b[1] + b[3] <= y + h,
          `Balloon outside panel ${p.id}: ${JSON.stringify(b)} within ${JSON.stringify(p.rect)}`,
        );
        if (data.version >= 4) {
          assert.ok(
            caption(d.speaker) || p.speakers?.[d.speaker],
            'Missing speaker anchor',
          );
          for (const s of Object.values(p.speakers || {})) {
            if (s.face)
              assert.ok(!overlap(b, s.face), 'Balloon covers face: ' + p.id);
            if (s.anchor)
              assert.ok(
                s.anchor[0] >= x &&
                  s.anchor[0] <= x + w &&
                  s.anchor[1] >= y &&
                  s.anchor[1] <= y + h,
                'Speaker anchor outside panel',
              );
          }
          const t = tailGeometry(p, d);
          if (t)
            for (const s of Object.values(p.speakers || {}))
              if (s.face)
                assert.equal(
                  segmentEntry(t.base, t.tip, s.face),
                  null,
                  'Tail crosses face: ' + p.id,
                );
        }
        for (const r of p.protected || []) {
          assert.ok(
            r.length === 4 && r.every(Number.isFinite) && r[2] > 0 && r[3] > 0,
            'Invalid protected area',
          );
          assert.ok(!overlap(b, r), 'Balloon covers protected area: ' + p.id);
        }
        return b;
      });
      if (data.version >= 5)
        bounds.forEach((b, j) => {
          if (j) {
            const a = bounds[j - 1];
            assert.ok(
              b[1] >= a[1] && (b[0] <= a[0] || b[1] >= a[1] + 80),
              'Ambiguous dialogue reading order: ' + p.id,
            );
          }
          const t = tailGeometry(p, p.dialogue[j]);
          if (t) {
            for (const [k, r] of bounds.entries())
              if (k !== j)
                assert.equal(
                  segmentEntry(t.base, t.tip, r),
                  null,
                  'Tail crosses another balloon: ' + p.id,
                );
            for (const r of p.protected || [])
              assert.equal(
                segmentEntry(t.base, t.tip, r),
                null,
                'Tail crosses protected area: ' + p.id,
              );
          }
        });
      bounds.forEach((b, j) =>
        bounds
          .slice(0, j)
          .forEach((c) =>
            assert.ok(!overlap(b, c), 'Balloons overlap: ' + p.id),
          ),
      );
    });
  }
}
