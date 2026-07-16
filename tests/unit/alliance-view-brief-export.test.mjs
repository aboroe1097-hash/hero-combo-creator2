import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALLIANCE_BRIEF_CANVAS_SIZE,
  buildAllianceBriefModel,
} from '../../js/alliance-view-brief-export.js';

function row({ allianceId, index, power, castleLevel = 29, matched = false, manual = false }) {
  return {
    id: `${allianceId}-${index}`,
    accountName: `${allianceId.toUpperCase()} ${String(index).padStart(2, '0')}`,
    allianceId,
    totalPower: power,
    castleLevel,
    matchStatus: matched ? 'matched' : 'unmatched',
    matchMethod: manual ? 'manual' : matched ? 'exact_name' : 'none',
    edenSourceId: matched ? `eden-${allianceId}-${index}` : '',
    contribution: manual && index !== 2 ? 125000 : 0,
  };
}

test('buildAllianceBriefModel compares a full 100 with 95 keeps and five reserved seats', () => {
  const rows = [
    ...Array.from({ length: 70 }, (_, index) =>
      row({
        allianceId: 'vts',
        index,
        power: 300_000_000 - index * 1_000_000,
        castleLevel: index < 57 ? 30 : 29,
        matched: index < 60,
        manual: index < 2,
      })
    ),
    ...Array.from({ length: 35 }, (_, index) =>
      row({
        allianceId: 'v3s',
        index,
        power: 200_000_000 - index * 1_000_000,
        castleLevel: index < 8 ? 30 : 29,
        matched: index < 10,
        manual: index === 2,
      })
    ),
  ];

  const model = buildAllianceBriefModel(rows, {
    season: 'season-2026',
    generatedAt: '2026-07-16T12:00:00.000Z',
  });

  assert.equal(model.accountCount, 105);
  assert.equal(model.matchedCount, 70);
  assert.equal(model.unmatchedCount, 35);
  assert.equal(model.manualMatchCount, 3);
  assert.equal(model.manualWithContributionCount, 2);
  assert.equal(model.season, 'season-2026');
  assert.equal(model.generatedAt.toISOString(), '2026-07-16T12:00:00.000Z');

  assert.deepEqual(model.routeFull.allianceCounts, { v3s: 30, vts: 70, other: 0 });
  assert.equal(model.routeFull.keptCount, 100);
  assert.equal(model.routeFull.reservedSeats, 0);
  assert.equal(model.routeFull.cutoffPower, 171_000_000);
  assert.equal(model.routeFull.c30Count, 65);

  assert.deepEqual(model.routeReserve.allianceCounts, { v3s: 25, vts: 70, other: 0 });
  assert.equal(model.routeReserve.keptCount, 95);
  assert.equal(model.routeReserve.reservedSeats, 5);
  assert.equal(model.routeReserve.cutoffPower, 176_000_000);
  assert.equal(model.routeReserve.c30Count, 65);

  assert.deepEqual(model.alliances.vts, {
    id: 'vts',
    accountCount: 70,
    matchedCount: 60,
    unmatchedCount: 10,
    coveragePercent: 86,
    c30Count: 57,
    totalPower: 18_585_000_000,
  });
  assert.equal(model.alliances.v3s.accountCount, 35);
  assert.equal(model.alliances.v3s.coveragePercent, 29);
  assert.equal(model.alliances.v3s.c30Count, 8);
});

test('brief ranking keeps every account as a separate seat and uses deterministic tie-breaks', () => {
  const tiedRows = [
    row({ allianceId: 'vts', index: 2, power: 1_000, castleLevel: 29 }),
    row({ allianceId: 'v3s', index: 1, power: 1_000, castleLevel: 30 }),
    row({ allianceId: 'vts', index: 0, power: 1_000, castleLevel: 30 }),
  ];
  tiedRows[0].edenSourceId = 'shared-source';
  tiedRows[0].matchStatus = 'matched';
  tiedRows[1].edenSourceId = 'shared-source';
  tiedRows[1].matchStatus = 'matched';

  const model = buildAllianceBriefModel(tiedRows, { generatedAt: 1 });

  assert.equal(model.accountCount, 3);
  assert.equal(model.routeFull.keptCount, 3);
  assert.equal(model.routeFull.openSeats, 97);
  assert.equal(model.routeReserve.keptCount, 3);
  assert.equal(model.routeReserve.openSeats, 92);
  assert.equal(model.routeReserve.reservedSeats, 5);
  assert.equal(model.matchedCount, 2, 'the presentation model must not merge account seats');
});

test('brief coverage counts only confirmed matches, not retained conflict source IDs', () => {
  const confirmed = row({ allianceId: 'vts', index: 1, power: 3_000, matched: true });
  const duplicateConflict = row({
    allianceId: 'vts',
    index: 2,
    power: 2_000,
    matched: false,
    manual: true,
  });
  duplicateConflict.matchStatus = 'duplicate_conflict';
  duplicateConflict.matchMethod = 'manual';
  duplicateConflict.edenSourceId = 'retained-duplicate-source';
  duplicateConflict.contribution = 999_999;
  const missingManual = row({ allianceId: 'v3s', index: 3, power: 1_000, matched: false });
  missingManual.matchStatus = 'missing_manual_source';
  missingManual.matchMethod = 'manual';
  missingManual.edenSourceId = 'missing-source';

  const model = buildAllianceBriefModel([confirmed, duplicateConflict, missingManual]);

  assert.equal(model.matchedCount, 1);
  assert.equal(model.unmatchedCount, 2);
  assert.equal(model.manualMatchCount, 0);
  assert.equal(model.manualWithContributionCount, 0);
  assert.equal(model.alliances.vts.coveragePercent, 50);
  assert.equal(model.alliances.v3s.coveragePercent, 0);
});

test('brief export has a fixed phone-shareable PNG canvas contract', () => {
  assert.deepEqual(ALLIANCE_BRIEF_CANVAS_SIZE, { width: 1600, height: 1200 });
});
