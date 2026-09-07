// js/codex-ui.js
// Lane 4 shared Codex UI kit (16.0.0). The era badge table, verification
// status ranking, and record classification helpers live here so the Hero
// Atlas drawer and the Battle Simulator Field Data panel render identical
// provenance semantics off lane 3's js/codex-provenance.js gate.
// Imported only by lazy feature modules (hero-atlas chunk, field-data chunk);
// it must stay tiny to avoid chunk-duplication bloat.

import { provenanceFor } from './codex-provenance.js';

export function codexStatusRank(status) {
  if (status === 'current') return 2;
  if (status === 'historical') return 1;
  if (status === 'unverified') return 0;
  return -1;
}

export function isRenderable(record) {
  return provenanceFor(record) !== null;
}

export function worstCodexStatus(records) {
  let worst = 'unverified';
  let worstRank = -1;
  for (const record of records || []) {
    const envelope = provenanceFor(record);
    if (!envelope) continue;
    const rank = codexStatusRank(envelope.verificationStatus);
    if (rank > worstRank) {
      worstRank = rank;
      worst = envelope.verificationStatus;
    }
  }
  return worst;
}

// Era badge table: gameVersionScope token → era label key + palette token key.
// Labels resolve through each surface's i18n (the atlas heroUi catalog and the
// battle-sim fieldData/era packs share the era key names).
export const CODEX_ERA_BADGES = Object.freeze({
  S0: Object.freeze({ eraKey: 'eraS0S4', colorToken: '--ff-cyan' }),
  S1: Object.freeze({ eraKey: 'eraS0S4', colorToken: '--ff-cyan' }),
  S2: Object.freeze({ eraKey: 'eraS0S4', colorToken: '--ff-cyan' }),
  S3: Object.freeze({ eraKey: 'eraS0S4', colorToken: '--ff-cyan' }),
  S4: Object.freeze({ eraKey: 'eraS0S4', colorToken: '--ff-cyan' }),
  X1: Object.freeze({ eraKey: 'eraX1X8', colorToken: '--ff-violet' }),
  X2: Object.freeze({ eraKey: 'eraX1X8', colorToken: '--ff-violet' }),
  X3: Object.freeze({ eraKey: 'eraX1X8', colorToken: '--ff-violet' }),
  X4: Object.freeze({ eraKey: 'eraX1X8', colorToken: '--ff-violet' }),
  X5: Object.freeze({ eraKey: 'eraX1X8', colorToken: '--ff-violet' }),
  X6: Object.freeze({ eraKey: 'eraX1X8', colorToken: '--ff-violet' }),
  X7: Object.freeze({ eraKey: 'eraX1X8', colorToken: '--ff-violet' }),
  X8: Object.freeze({ eraKey: 'eraX1X8', colorToken: '--ff-violet' }),
  X10: Object.freeze({ eraKey: 'eraX10', colorToken: '--ff-gold' }),
  X12: Object.freeze({ eraKey: 'eraX12', colorToken: '--ff-gold' }),
  X15: Object.freeze({ eraKey: 'eraX15Plus', colorToken: '--ff-rose' }),
  X16: Object.freeze({ eraKey: 'eraX15Plus', colorToken: '--ff-rose' }),
  X17: Object.freeze({ eraKey: 'eraX15Plus', colorToken: '--ff-rose' }),
  X18: Object.freeze({ eraKey: 'eraX15Plus', colorToken: '--ff-rose' }),
  X19: Object.freeze({ eraKey: 'eraX15Plus', colorToken: '--ff-rose' }),
  X20: Object.freeze({ eraKey: 'eraX15Plus', colorToken: '--ff-rose' }),
  X21: Object.freeze({ eraKey: 'eraX15Plus', colorToken: '--ff-rose' }),
  X22: Object.freeze({ eraKey: 'eraX15Plus', colorToken: '--ff-rose' }),
  X23: Object.freeze({ eraKey: 'eraX15Plus', colorToken: '--ff-rose' }),
  X24: Object.freeze({ eraKey: 'eraX15Plus', colorToken: '--ff-rose' }),
});

export function eraForGameVersion(gameVersionScope) {
  const raw = String(gameVersionScope || '').trim().toUpperCase();
  if (!raw) return null;
  // Scopes may be a single season (X12) or a range (S0-X17); a range maps to
  // the era of its upper bound.
  const parts = raw.split('-').map((part) => part.trim()).filter(Boolean);
  const upper = parts[parts.length - 1] || '';
  return CODEX_ERA_BADGES[upper] || CODEX_ERA_BADGES[raw] || null;
}
