// js/battle-simulator-equipment-field-deltas.js
// 16.0.0 lane 4: field-data deltas overlay the equipment catalog. Deltas come
// from lane 3's duel evidence (equipment profile deltas); the canonical
// catalog in js/battle-simulator-equipment-catalog.js is NEVER edited here.
// Only provenance-verified (verificationStatus === 'current') deltas are
// applied to simulations; unverified deltas stay visible in the Field Data
// panel and are excluded from resolveEquipmentLoadout.

import { provenanceFor } from './codex-provenance.js';
import {
  BATTLE_STAT_KEYS,
  getBattleStatUnit,
  normalizeStatSource,
} from './battle-simulator-stat-sources.js';

export const EQUIPMENT_FIELD_DELTA_SCHEMA_VERSION = 1;

export const EQUIPMENT_FIELD_DELTA_APPLICABLE_STATUSES = Object.freeze(['current']);

export function isFieldDeltaApplicable(delta) {
  const envelope = provenanceFor(delta);
  return Boolean(
    envelope && EQUIPMENT_FIELD_DELTA_APPLICABLE_STATUSES.includes(envelope.verificationStatus)
  );
}

// Deltas matching the loadout's set or any selected piece, verified only.
export function filterApplicableFieldDeltas(loadout, deltaRecords = []) {
  const setId = loadout?.setId;
  const pieceIds = new Set((loadout?.pieces || []).map((piece) => piece.pieceId));
  return (deltaRecords || []).filter((delta) => {
    if (!delta || !isFieldDeltaApplicable(delta)) return false;
    if (delta.equipmentId) return pieceIds.has(delta.equipmentId);
    if (delta.setId) return delta.setId === setId;
    return false;
  });
}

// Appends verified field-delta contributions to the resolved equipment
// contributions list. Stat keys are validated against the battle stat keys;
// units follow the battle stat unit rules.
export function applyFieldDeltasToContributions(contributions = [], deltas = []) {
  const out = [...contributions];
  for (const delta of deltas) {
    if (!BATTLE_STAT_KEYS.includes(delta.field)) continue;
    if (typeof delta.value !== 'number' || !Number.isFinite(delta.value)) continue;
    const envelope = provenanceFor(delta);
    const sourceId = `field-data:${delta.equipmentId || delta.setId || 'equipment'}:${delta.field}`;
    out.push(
      normalizeStatSource({
        sourceType: 'equipment',
        sourceId,
        label: 'Recorded field data delta',
        statKey: delta.field,
        amount: delta.value,
        operation: 'add',
        unit: getBattleStatUnit(delta.field),
        appliesTo: {
          battleModes: ['pvp-field'],
          troopTypes: [],
          rowIds: [],
        },
        verification: 'verified',
        provenance: {
          catalogRevision: `field-delta-schema-${EQUIPMENT_FIELD_DELTA_SCHEMA_VERSION}`,
          effectId: delta.equipmentId || delta.setId || 'equipment',
          sourceRefs: envelope ? [envelope.source] : [],
        },
      })
    );
  }
  return out;
}
