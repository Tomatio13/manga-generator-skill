import { writeJSON } from '../src/json-store.mjs';
import { writeWorkflowOutput } from '../src/workflow-output.mjs';
import { createWorkflowStatus } from '../src/workflow-status.mjs';
import { createPageRenderer } from '../src/page-renderer.mjs';
import { readPageMaterials } from '../src/page-materials.mjs';
import { validateWorkflow } from '../src/workflow-validation.mjs';
import { trackState } from '../src/state-history.mjs';
import { codeRoot } from '../src/workspace.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

import { loadProject } from '../src/project.mjs';
const { root, config, configFile, local } = loadProject();
trackState(root, configFile);
import { qualityGate } from '../src/quality.mjs';
import { validateFaceDesign } from '../src/face-design.mjs';
import {
  readingFlow,
  flowOverlay,
  narrativePlan,
} from '../src/reading-flow.mjs';
import { requireReview } from '../src/stage-reviews.mjs';

import { columns, box, xml } from '../src/lettering.mjs';
import { resolveStoryState } from '../src/story-state.mjs';
import { createGenerationJobs } from '../src/generation-jobs.mjs';
import { imageFile, createAssets } from '../src/assets.mjs';
import { findDialogueLayout } from '../src/dialogue-layout.mjs';
validateFaceDesign(config, local);

const cast = config.cast;
assert.ok(cast && Object.keys(cast).length, 'Define the work cast');
for (const id of Object.keys(cast))
  assert.match(id, /^[a-zA-Z][a-zA-Z0-9_-]*$/, 'Invalid cast ID');
for (const p of [
  config.workflowDir || 'workflow',
  config.assetDir || 'assets/v2',
  config.outputDir || 'output-v2',
  ...(config.references || []),
])
  local(p);
const workflowDir = config.workflowDir || 'workflow';
const assetDir = config.assetDir || 'assets/v2';
const dir = path.join(root, workflowDir);
const output = path.join(root, config.outputDir || 'output-v2');
const panelsOnly = config.renderMode === 'panels';
assert.ok(
  config.renderMode === undefined ||
    ['page', 'panels'].includes(config.renderMode),
  'Unknown renderMode',
);

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

const stateFor = (page, p) => resolveStoryState(config, page, p, local);
const { prompt, job, panelJob, layoutReference } = createGenerationJobs({
  config,
  local,
  stateFor,
  svg,
});
const { archive, saveAsset } = createAssets({ config, local, assetDir });
const validate = (data = config) => validateWorkflow(data, { stateFor });

const renderPage = createPageRenderer(cast);
function svg(page, art, rough = false, layer = 'all', guides = true, imageURL) {
  return renderPage(
    page,
    readPageMaterials(page, {
      art,
      rough,
      panelsOnly,
      assetDir,
      local,
      panelJob,
      imageURL,
    }),
    { rough, layer, guides },
  );
}

const { materialJobs, assetStatus, materialStatus, reviewFingerprint, status } =
  createWorkflowStatus({
    config,
    root,
    local,
    assetDir,
    panelsOnly,
    job,
    panelJob,
    layoutReference,
    qualityReady: (page) => quality.ready(page),
  });

const artFor = (page) =>
  panelsOnly
    ? null
    : fs.readFileSync(local(job(page).asset)).toString('base64');
const quality = qualityGate({
  config,
  local,
  assetDir,
  dir,
  material: materialStatus,
  job: panelJob,
  compose: (page, folder) => {
    const imageURL = (file) =>
      path.relative(folder, file).replaceAll('\\', '/');
    return svg(page, artFor(page), false, 'all', true, imageURL);
  },
});
const option = (name, fallback) => {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  assert.ok(
    process.argv[i + 1] && !process.argv[i + 1].startsWith('--'),
    'Missing --' + name + ' value',
  );
  return process.argv[i + 1];
};

const command = process.argv[2] || 'plan';
if (command !== 'layout') validate();
if (command === 'layout') {
  const selectedPages =
    process.argv[3] === 'all'
      ? config.pages
      : config.pages.filter((p) => p.id === process.argv[3]);
  assert.ok(selectedPages.length, 'Unknown page');
  const changes = [];
  for (const page of selectedPages)
    for (const p of page.panels) {
      p.dialogue = findDialogueLayout(page, p, cast);

      changes.push({
        panel: p.id,
        dialogue: p.dialogue.map((d) => ({
          x: d.x,
          dy: d.dy,
          capacity: d.capacity,
        })),
      });
    }
  validate();
  if (process.argv.includes('--apply'))
    fs.writeFileSync(local(configFile), JSON.stringify(config, null, 2));
  console.log(
    JSON.stringify(
      { applied: process.argv.includes('--apply'), changes },
      null,
      2,
    ),
  );
} else if (command === 'check') {
  assert.equal(xml('<&'), '&lt;&amp;');
  assert.deepEqual(columns('あいうえお。', 5), ['あいうえお。']);
  assert.deepEqual(columns('あいうえおか', 5), ['あいうえお', 'か']);
  console.log(
    `OK: ${config.pages.length} pages, ${config.pages.reduce((n, p) => n + p.panels.length, 0)} panels; geometry, speakers and typography`,
  );
} else if (command === 'plan') {
  fs.mkdirSync(path.join(dir, 'reading-flow'), { recursive: true });
  const flow = config.pages.map((page) => readingFlow(page, box));
  fs.writeFileSync(
    path.join(dir, 'narrative-plan.json'),
    JSON.stringify(narrativePlan(config), null, 2),
  );
  fs.writeFileSync(
    path.join(dir, 'reading-flow', 'plan.json'),
    JSON.stringify(flow, null, 2),
  );
  for (const page of config.pages) {
    const currentFlow = flow.find((item) => item.page === page.id);
    fs.writeFileSync(
      path.join(dir, 'reading-flow', `page-${page.id}.svg`),
      flowOverlay(svg(page, null, true), currentFlow),
    );
    fs.writeFileSync(
      path.join(dir, 'reading-flow', `page-${page.id}.json`),
      JSON.stringify(currentFlow, null, 2),
    );
  }
  fs.writeFileSync(
    path.join(dir, 'reading-flow', 'index.html'),
    `<!doctype html><html lang="ja"><meta charset="utf-8"><title>セリフの視線誘導計画</title><style>body{font-family:Meiryo;background:#ddd}img{display:block;width:min(90vw,800px);margin:20px auto}</style><p>青線・番号はセリフの順番、橙線は脚本に記録した視線の計画。自動診断は目視確認の代わりではありません。</p>${config.pages.map((page) => `<img src="page-${page.id}.svg" alt="${page.id}">`).join('')}</html>`,
  );
  fs.mkdirSync(path.join(dir, 'storyboards'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'storyboards-unnumbered'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'prompts'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'panels'), { recursive: true });
  for (const page of config.pages)
    fs.writeFileSync(
      path.join(dir, 'storyboards-unnumbered', `page-${page.id}.svg`),
      svg(page, null, true, 'all', false),
    );
  fs.writeFileSync(
    path.join(dir, 'storyboards-unnumbered', 'index.html'),
    `<!doctype html><html lang="ja"><meta charset="utf-8"><title>読順確認用ネーム</title><style>body{background:#ddd}img{display:block;width:min(90vw,800px);margin:20px auto}</style>${config.pages.map((p) => `<img src="page-${p.id}.svg" alt="ページ ${xml(p.id)}">`).join('')}</html>`,
  );
  for (const page of config.pages) {
    fs.writeFileSync(
      path.join(dir, 'storyboards', `page-${page.id}.svg`),
      svg(page, null, true),
    );
    fs.writeFileSync(
      path.join(dir, 'prompts', `page-${page.id}.txt`),
      prompt(page),
    );
    fs.writeFileSync(
      path.join(dir, 'prompts', `page-${page.id}-baked.txt`),
      prompt(page, true),
    );
  }
  for (const page of config.pages)
    for (const p of page.panels) {
      const [x, y, w, h] = p.rect;
      fs.writeFileSync(
        path.join(dir, 'panels', `page-${p.id}.svg`),
        svg({ ...page, panels: [p] }, null, true).replace(
          'width="1024" height="1536" viewBox="0 0 1024 1536"',
          `width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"`,
        ),
      );
    }
  fs.writeFileSync(
    path.join(dir, 'jobs.json'),
    JSON.stringify(config.pages.map(job), null, 2),
  );
  fs.writeFileSync(
    path.join(dir, 'panel-jobs.json'),
    JSON.stringify(
      config.pages.flatMap((page) => page.panels.map((p) => panelJob(page, p))),
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(dir, 'story-memory.json'),
    JSON.stringify(
      {
        cast,
        sections: config.sections || {},
        panels: config.pages.flatMap((page) =>
          page.panels.map((p) => ({
            id: p.id,
            section: p.section ?? page.section ?? null,
            state: stateFor(page, p),
          })),
        ),
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(dir, 'storyboards', 'index.html'),
    `<html lang="ja"><meta charset="utf-8"><title>ネーム</title><style>body{background:#ddd}img{display:block;width:min(90vw,800px);margin:20px auto}</style>${config.pages.map((p) => `<img src="page-${p.id}.svg" alt="${xml(p.purpose)}">`).join('')}</html>`,
  );
  console.log(
    'Saved storyboards, exact dialogue, both prompt modes, render jobs',
  );
} else if (command === 'candidate-panel') {
  const page = config.pages.find((page) =>
    page.panels.some((p) => p.id === process.argv[3]),
  );
  assert.ok(page, 'Unknown panel');
  const p = page.panels.find((p) => p.id === process.argv[3]),
    j = panelJob(page, p),
    file = path.resolve(process.argv[4]),
    image = imageFile(file);
  const base = `${assetDir}/candidates/${p.id}/${hash(image)}-${j.fingerprint.slice(0, 12)}`;
  fs.mkdirSync(path.dirname(local(base)), { recursive: true });
  if (!fs.existsSync(local(base + '.png'))) {
    fs.writeFileSync(local(base + '.png'), image);
    fs.writeFileSync(
      local(base + '.json'),
      JSON.stringify(
        {
          id: p.id,
          fingerprint: j.fingerprint,
          imageHash: hash(image),
          note: option('note', ''),
          renderer: option('renderer', 'unspecified'),
          model: option('model', null),
          references: j.references,
          prompt: j.prompt,
          sourceFile: file,
          registeredAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  }
  const folder = path.dirname(local(base));
  const entries = fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
      file: f,
      record: JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8')),
    }));
  fs.writeFileSync(
    path.join(folder, 'index.html'),
    `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${xml(p.id)} 候補</title><style>body{font-family:Meiryo,sans-serif}article{display:inline-block;width:45%;margin:2%}img{max-width:100%}</style>${entries.map(({ file, record: r }) => `<article><img src="${xml(file.replace(/\.json$/, '.png'))}" alt="${xml(r.note)}"><p>${xml(r.note)} / ${r.fingerprint === j.fingerprint ? '現在の計画' : '古い計画'}</p><code>${xml(file.replace(/\.json$/, '.png'))}</code></article>`).join('')}</html>`,
  );
  console.log('Registered candidate: ' + base + '.png');
} else if (command === 'accept-panel') {
  const page = config.pages.find((page) =>
    page.panels.some((p) => p.id === process.argv[3]),
  );
  assert.ok(page, 'Unknown panel');
  const p = page.panels.find((p) => p.id === process.argv[3]);
  const j = panelJob(page, p);
  const file = path.resolve(process.argv[4]);
  imageFile(file);
  assert.ok(
    process.argv.includes('--reviewed'),
    'Inspect panel before --reviewed',
  );
  saveAsset(
    j,
    file,
    {
      fingerprint: j.fingerprint,
      imageHash: hash(fs.readFileSync(file)),
      reviewed: true,
    },
    {
      renderer: option('renderer', undefined),
      model: option('model', undefined),
      reason: option('reason', undefined),
    },
  );
  console.log(`Accepted panel ${p.id}`);
} else if (command === 'accept') {
  assert.ok(
    !panelsOnly,
    'This work uses panel assets; use accept-panel for each panel',
  );
  const page = config.pages.find((p) => p.id === process.argv[3]);
  assert.ok(page, 'Unknown page');
  const file = path.resolve(process.argv[4]);
  assert.ok(fs.existsSync(file), 'Generated file missing');
  imageFile(file, true);
  assert.ok(
    process.argv.includes('--reviewed'),
    'Inspect image before using --reviewed',
  );
  const sourceArg = process.argv.indexOf('--source-rects');
  const sourceRects =
    sourceArg < 0
      ? page.panels.map((p) => p.rect)
      : JSON.parse(process.argv[sourceArg + 1]);
  assert.equal(
    sourceRects.length,
    page.panels.length,
    'Source panel count does not match plan',
  );
  sourceRects.forEach((b) => {
    assert.ok(b.length === 4 && b.every(Number.isFinite));
    const [x, y, w, h] = b;
    assert.ok(
      x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1024 && y + h <= 1536,
      'Source rectangle out of bounds',
    );
  });
  const j = job(page);
  saveAsset(
    j,
    file,
    {
      fingerprint: j.fingerprint,
      imageHash: hash(fs.readFileSync(file)),
      sourceRects,
      reviewed: true,
    },
    {
      renderer: option('renderer', undefined),
      model: option('model', undefined),
      reason: option('reason', undefined),
    },
  );
  console.log(`Accepted ${page.id}`);
} else if (command === 'use-page') {
  assert.ok(!panelsOnly, 'use-page requires page render mode');
  const page = config.pages.find((page) =>
    page.panels.some((p) => p.id === process.argv[3]),
  );
  assert.ok(page, 'Unknown panel');
  const p = page.panels.find((p) => p.id === process.argv[3]),
    j = panelJob(page, p);
  assert.ok(
    process.argv.includes('--reviewed'),
    'Inspect replacement page before removing override',
  );
  assert.equal(
    assetStatus(job(page)),
    'ready',
    'Accept replacement page first',
  );
  assert.ok(
    fs.existsSync(local(j.asset)) && fs.existsSync(local(j.record)),
    'No override to archive',
  );
  assert.equal(
    JSON.parse(fs.readFileSync(local(j.record), 'utf8')).imageHash,
    hash(fs.readFileSync(local(j.asset))),
    'Override changed before archiving',
  );
  const reason = option('reason', '');
  assert.ok(reason.trim(), 'Record replacement reason');
  archive(j);
  fs.unlinkSync(local(j.asset));
  fs.unlinkSync(local(j.record));
  fs.appendFileSync(
    local(assetDir + '/history.jsonl'),
    JSON.stringify({
      event: 'use-page',
      target: p.id,
      reason,
      time: new Date().toISOString(),
    }) + '\n',
  );
  console.log('Archived override; using reviewed page artwork: ' + p.id);
} else if (command === 'review') {
  const page = config.pages.find((p) => p.id === process.argv[3]);
  assert.ok(page, 'Unknown page');
  for (const flag of ['--speakers', '--faces', '--order', '--continuity'])
    assert.ok(
      process.argv.includes(flag),
      'Inspect actual composed page and confirm ' + flag,
    );
  assert.equal(
    materialStatus(page),
    'ready',
    'Changed or missing artwork: accept current materials before review',
  );
  writeJSON(path.join(root, assetDir, `page-${page.id}.review.json`), {
    fingerprint: reviewFingerprint(page),
    checks: ['speakers', 'faces', 'order', 'continuity'],
    reviewedAt: new Date().toISOString(),
  });
  console.log('Alignment review saved: ' + page.id);
} else if (command === 'preview') {
  const pages = process.argv[3]
    ? config.pages.filter((p) => p.id === process.argv[3])
    : config.pages;
  assert.ok(pages.length, 'Unknown preview page');
  for (const p of pages)
    assert.equal(
      materialStatus(p),
      'ready',
      'Changed or missing preview material: ' + p.id,
    );
  const preview = path.join(dir, 'review');
  fs.mkdirSync(preview, { recursive: true });
  for (const p of pages)
    fs.writeFileSync(path.join(preview, `page-${p.id}.svg`), svg(p, artFor(p)));
  console.log('Review composed SVGs in ' + preview);
} else if (command === 'quality-plan') {
  quality.plan();
  console.log(
    'Inspect thumbnail/native/detail views in ' + dir + '/quality/index.html',
  );
} else if (command === 'quality-review' || command === 'quality-repair') {
  const page = config.pages.find((page) =>
    page.panels.some((p) => p.id === process.argv[3]),
  );
  assert.ok(page, 'Unknown panel');
  const p = page.panels.find((p) => p.id === process.argv[3]);
  if (command === 'quality-review')
    quality.review(page, p, path.resolve(process.argv[4]));
  else quality.repair(page, p);
} else if (command === 'layers') {
  for (const p of config.pages)
    assert.equal(status(p), 'ready', 'Review before layer export: ' + p.id);
  const layers = path.join(output, 'layers');
  fs.mkdirSync(layers, { recursive: true });
  for (const p of config.pages)
    for (const layer of ['artwork', 'lettering'])
      fs.writeFileSync(
        path.join(layers, `page-${p.id}-${layer}.svg`),
        svg(p, artFor(p), false, layer),
      );
  console.log(
    'Saved aligned, transparent artwork/lettering SVG layers in ' + layers,
  );
} else if (command === 'status') {
  console.log(config.pages.map((p) => `${p.id}: ${status(p)}`).join('\n'));
} else if (command === 'build') {
  requireReview(root, config, configFile, 'source');
  requireReview(root, config, configFile, 'script');
  for (const page of config.pages) {
    requireReview(root, config, configFile, 'storyboard', page.id);
    for (const panel of page.panels)
      requireReview(root, config, configFile, 'artwork', panel.id);
    requireReview(root, config, configFile, 'lettering', page.id);
  }
  for (const page of config.pages)
    assert.equal(
      status(page),
      'ready',
      `Page ${page.id} pending or changed: regenerate/review before build`,
    );
  writeWorkflowOutput({
    config,
    output,
    dir,
    codeRoot,
    local,
    status,
    svg,
    artFor,
    materialJobs,
  });
} else
  throw new Error(
    'Use plan | check | layout PAGE [--apply] | candidate-panel ID FILE [--note TEXT] | accept PAGE FILE --reviewed | accept-panel ID FILE --reviewed | use-page ID --reviewed --reason TEXT | preview [PAGE] | review PAGE --speakers --faces --order --continuity | quality-plan | quality-review ID JSON | quality-repair ID | status | build | layers',
  );
