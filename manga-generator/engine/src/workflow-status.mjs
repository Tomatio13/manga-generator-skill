import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

export function createWorkflowStatus({
  config,
  root,
  local,
  assetDir,
  panelsOnly,
  job,
  panelJob,
  layoutReference,
  qualityReady,
}) {
  function materialJobs(page) {
    return [
      ...(panelsOnly ? [] : [job(page)]),
      ...page.panels
        .filter(
          (p) =>
            panelsOnly ||
            fs.existsSync(path.join(root, assetDir, 'panels', p.id + '.png')),
        )
        .map((p) => panelJob(page, p)),
    ];
  }
  function assetStatus(j) {
    if (!fs.existsSync(local(j.asset)) || !fs.existsSync(local(j.record)))
      return 'pending';
    const r = JSON.parse(fs.readFileSync(local(j.record), 'utf8'));
    if (
      j.references
        .filter((f) => !layoutReference(f))
        .some((f) => !fs.existsSync(local(f)))
    )
      return 'pending';
    return r.reviewed &&
      r.fingerprint === j.fingerprint &&
      r.imageHash === hash(fs.readFileSync(local(j.asset)))
      ? 'ready'
      : 'stale';
  }
  function materialStatus(page) {
    const statuses = materialJobs(page).map(assetStatus);
    return statuses.includes('pending')
      ? 'pending'
      : statuses.includes('stale')
        ? 'stale'
        : 'ready';
  }
  function reviewFingerprint(page) {
    if (!panelsOnly)
      return hash(
        JSON.stringify(page) +
          hash(fs.readFileSync(local(job(page).asset))) +
          hash(fs.readFileSync(local(job(page).record))) +
          page.panels
            .map((p) => {
              const f = path.join(root, assetDir, 'panels', p.id + '.png');
              return fs.existsSync(f) ? hash(fs.readFileSync(f)) : '';
            })
            .join(''),
      );
    return hash(
      JSON.stringify(page) +
        materialJobs(page)
          .map(
            (j) =>
              hash(fs.readFileSync(local(j.asset))) +
              hash(fs.readFileSync(local(j.record))),
          )
          .join(''),
    );
  }
  function status(page) {
    const materials = materialStatus(page);
    if (materials !== 'ready') return materials;
    const reviewFile = path.join(root, assetDir, `page-${page.id}.review.json`);
    const aligned =
      config.version < 5 ||
      (fs.existsSync(reviewFile) &&
        JSON.parse(fs.readFileSync(reviewFile, 'utf8')).fingerprint ===
          reviewFingerprint(page));
    return aligned && qualityReady(page) ? 'ready' : 'stale';
  }

  return {
    materialJobs,
    assetStatus,
    materialStatus,
    reviewFingerprint,
    status,
  };
}
