import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_TROOPS,
} from '../../js/specialization-towers-v2-data.js';
import {
  SPECIALIZATION_MEDAL_EVIDENCE_NAME_DISCREPANCIES,
  SPECIALIZATION_TROOP_MEDAL_EVIDENCE,
} from '../../js/specialization-towers-medal-evidence.js';
import { getWorkbookNodeMedalCosts } from '../../js/specialization-towers-medal-index.js';

const snapshot = JSON.parse(
  readFileSync(
    new URL('../../database/specialization-sheet/evidence.json', import.meta.url),
    'utf8'
  )
);

/** Every node the towers tool renders for a troop: research nodes plus the passive. */
function renderedNodes(troop) {
  return Object.values(SPECIALIZATION_COLUMNS).flatMap((column) =>
    column.researches.flatMap((researchId) => {
      const research = SPECIALIZATION_RESEARCH[researchId];
      const ids = research.nodes.map((node) => node.id);
      if (research.passiveSkillNodeId != null) ids.push(research.passiveSkillNodeId);
      return ids.map((nodeId) => ({ troop, researchId, nodeId }));
    })
  );
}

function coverage(troop) {
  const nodes = renderedNodes(troop);
  const filled = nodes.filter(
    ({ researchId, nodeId }) => getWorkbookNodeMedalCosts(troop, researchId, nodeId) !== null
  );
  return { total: nodes.length, filled: filled.length, unknown: nodes.length - filled.length };
}

test('every rendered node of every troop shows its workbook medal cost', () => {
  const perTroop = Object.fromEntries(
    SPECIALIZATION_TROOPS.map((troop) => [troop, coverage(troop)])
  );
  assert.deepEqual(perTroop, {
    footman: { total: 735, filled: 735, unknown: 0 },
    archer: { total: 735, filled: 735, unknown: 0 },
    cavalry: { total: 735, filled: 735, unknown: 0 },
  });
});

test('every workbook row for towers I–VIII lands on exactly one rendered node', () => {
  for (const section of SPECIALIZATION_TROOP_MEDAL_EVIDENCE) {
    if (section.tower > 8) continue;
    const label = `${section.troop} ${section.researchId}`;
    assert.ok(section.researchId, `${label} maps to a research`);
    const placed = section.rows.map((row) => row.nodeId);
    assert.equal(placed.includes(null), false, `${label} has unplaced workbook rows`);
    assert.equal(new Set(placed).size, placed.length, `${label} places two rows on one node`);
    for (const row of section.rows) {
      assert.deepEqual(
        getWorkbookNodeMedalCosts(section.troop, section.researchId, row.nodeId),
        row.costs,
        `${label} row ${row.sourceRow}`
      );
    }
  }
});

test('shown costs are the raw per-level workbook values for that troop', () => {
  const snapshotCosts = (troop, tower, section, sourceRow) =>
    snapshot.tabs
      .find((tab) => tab.troop === troop && tab.tower === tower)
      .sections[section - 1].nodes.find((node) => node.sourceRow === sourceRow).costs;

  // Two-level node: both levels, never summed.
  assert.deepEqual(getWorkbookNodeMedalCosts('archer', 'training1', 5), [151, 158]);
  assert.deepEqual(
    getWorkbookNodeMedalCosts('archer', 'training1', 5),
    snapshotCosts('archer', 1, 1, '5')
  );
  // Repeated node names resolve by the workbook's stated magnitude (Field Intel +3% vs +2%).
  const fieldIntel3 = SPECIALIZATION_RESEARCH.encounter4.nodes.find((node) => node.id === 6);
  assert.equal(fieldIntel3.bonusValue, 3);
  assert.deepEqual(getWorkbookNodeMedalCosts('footman', 'encounter4', 6), [1_933]);
  assert.deepEqual(
    getWorkbookNodeMedalCosts('footman', 'encounter4', 6),
    snapshotCosts('footman', 7, 2, '11')
  );
  // Unknown stays unknown, never 0.
  assert.equal(getWorkbookNodeMedalCosts('archer', 'training1', 999), null);
  assert.equal(getWorkbookNodeMedalCosts('archer', 'nottranscribed', 1), null);
});

test('name conflicts between the workbook and the planner corpus stay recorded', () => {
  assert.equal(SPECIALIZATION_MEDAL_EVIDENCE_NAME_DISCREPANCIES.length, 5);
  for (const entry of SPECIALIZATION_MEDAL_EVIDENCE_NAME_DISCREPANCIES) {
    assert.notEqual(entry.workbookName, entry.corpusName);
    assert.ok(entry.note.length > 0);
    const costs = getWorkbookNodeMedalCosts(entry.troop, entry.researchId, entry.nodeId);
    const otherTroops = SPECIALIZATION_TROOPS.filter((troop) => troop !== entry.troop);
    for (const troop of otherTroops) {
      assert.deepEqual(
        getWorkbookNodeMedalCosts(troop, entry.researchId, entry.nodeId),
        costs,
        `${entry.troop} ${entry.researchId}#${entry.nodeId} cost matches ${troop}`
      );
    }
  }
});

test('towers IX–X remain workbook-only until the planner corpus defines them', () => {
  const orphanRows = SPECIALIZATION_TROOP_MEDAL_EVIDENCE.filter((section) => section.tower > 8);
  assert.equal(Object.keys(SPECIALIZATION_COLUMNS).length, 8);
  assert.equal(
    orphanRows.every((section) => section.researchId === null),
    true
  );
  for (const troop of SPECIALIZATION_TROOPS) {
    const rows = orphanRows
      .filter((section) => section.troop === troop)
      .reduce((total, section) => total + section.rows.length, 0);
    assert.equal(rows, 180, `${troop} towers IX–X rows`);
  }
});
