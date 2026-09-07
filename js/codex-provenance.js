// js/codex-provenance.js
// Render gate for the Codex data platform (Workstream A1).
// Contract: nothing renders without source, author credit, capture date,
// game-version scope, and verificationStatus. Consumers call assertRenderable
// before rendering any codex record; the UI badge renders provenanceBadge.

export const VERIFICATION_STATUSES = Object.freeze(['current', 'historical', 'unverified']);

const PROVENANCE_FIELDS = Object.freeze([
  'source',
  'credit',
  'captureDate',
  'gameVersionScope',
  'verificationStatus',
]);

export function provenanceFor(record) {
  if (!record || typeof record.provenance !== 'object' || record.provenance === null) {
    return null;
  }
  const missing = PROVENANCE_FIELDS.filter(
    (field) => record.provenance[field] == null || record.provenance[field] === ''
  );
  if (missing.length) return null;
  if (!VERIFICATION_STATUSES.includes(record.provenance.verificationStatus)) return null;
  return { ...record.provenance };
}

export function assertRenderable(record, context) {
  const provenance = provenanceFor(record);
  if (!provenance) {
    const where = context || 'codex';
    throw new Error(`[codex-provenance] record not renderable (${where}): incomplete provenance`);
  }
  return provenance;
}

export function provenanceBadge(record, translate = (key, fallback) => fallback) {
  const provenance = assertRenderable(record);
  return {
    source: provenance.source,
    credit: provenance.credit,
    captureDate: provenance.captureDate,
    gameVersionScope: provenance.gameVersionScope,
    status: provenance.verificationStatus,
    statusLabel: translate(`codexStatus${provenance.verificationStatus[0].toUpperCase()}${provenance.verificationStatus.slice(1)}`, provenance.verificationStatus),
  };
}
