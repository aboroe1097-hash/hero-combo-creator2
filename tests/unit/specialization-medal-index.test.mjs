import assert from 'node:assert/strict';
import test from 'node:test';

import { SPECIALIZATION_TROOP_MEDAL_EVIDENCE } from '../../js/specialization-towers-medal-evidence.js';
import {
  buildWorkbookEvidenceIndex,
  contributionNodeKey,
  displayedContributionCount,
  evidenceNodeKey,
} from '../../js/specialization-towers-medal-index.js';
import { buildContributionTemplateRows } from '../../js/specialization-towers-v2-template.js';

const { rows } = buildContributionTemplateRows();
const index = buildWorkbookEvidenceIndex(rows);

function costsFor(troop, researchId, nodeId) {
  return index.byNodeKey.get(evidenceNodeKey(troop, researchId, nodeId))?.row.costs;
}

test('an archer and a footman passive resolve to their own workbook row', () => {
  // Training I node 11 is the passive skill, and the workbook names it differently
  // in the archer and footman tabs. Keyed on the canonical node alone, the troop
  // indexed last won and the other name was unreachable.
  const archer = index.byNodeKey.get(evidenceNodeKey('archer', 'training1', '11'));
  const footman = index.byNodeKey.get(evidenceNodeKey('footman', 'training1', '11'));
  const cavalry = index.byNodeKey.get(evidenceNodeKey('cavalry', 'training1', '11'));

  assert.ok(archer, 'the archer passive row resolves');
  assert.ok(footman, 'the footman passive row resolves');
  assert.ok(cavalry, 'the cavalry passive row resolves');
  assert.equal(archer.row.name, 'Attack with Courage');
  assert.equal(footman.row.name, 'Defense in Danger');
  assert.notEqual(archer.row.name, footman.row.name, 'the two troops must not share one row');
  assert.equal(archer.section.troop, 'archer');
  assert.equal(footman.section.troop, 'footman');
});

test('a troop never answers with another troop medal cost', () => {
  const archer = costsFor('archer', 'enhanced3', '1');
  const footman = costsFor('footman', 'enhanced3', '1');

  assert.deepEqual(archer, [677]);
  assert.deepEqual(footman, [614]);
  assert.notDeepEqual(archer, footman);
});

test('every troop tab keeps its own key for a shared canonical node', () => {
  const perTroop = SPECIALIZATION_TROOP_MEDAL_EVIDENCE.filter(
    (section) => section.researchId === 'training1'
  ).map((section) => evidenceNodeKey(section.troop, section.researchId, '11'));

  assert.equal(perTroop.length, 3);
  assert.equal(new Set(perTroop).size, 3, 'the three troop tabs must not collide');
  perTroop.forEach((key) => assert.ok(index.byNodeKey.has(key), `${key} resolves`));
});

test('the contribution count reports unique nodes, not transcribed rows', () => {
  const transcribedRows = SPECIALIZATION_TROOP_MEDAL_EVIDENCE.reduce(
    (total, section) => total + section.rows.length,
    0
  );
  const counted = displayedContributionCount({ nodes: {} }, index);

  assert.equal(transcribedRows, 2745, 'the corpus is unchanged');
  assert.equal(counted, index.nodeKeys.size);
  assert.equal(counted, 735, 'the canonical node set, not the per-troop row count');
  assert.ok(counted < transcribedRows, 'the same node is transcribed once per troop tab');
});

test('a node the workbook cannot place is still offered for contribution', () => {
  const nodeKey = contributionNodeKey('training1', '1');
  assert.ok(index.nodeKeys.has(nodeKey));

  // A node the workbook cannot place yet: the count has to grow once someone
  // submits a cost for it, or the label under-reports the community work.
  const unplacedKey = contributionNodeKey('nottranscribed', '99');
  assert.equal(index.nodeKeys.has(unplacedKey), false);
  assert.equal(displayedContributionCount({ nodes: {} }, index), 735);
  assert.equal(
    displayedContributionCount({ nodes: { [unplacedKey]: { medalCost: 42 } } }, index),
    736
  );
  assert.equal(
    displayedContributionCount({ nodes: { [unplacedKey]: { reviewedMedalCost: 41 } } }, index),
    736
  );
  assert.equal(
    displayedContributionCount({ nodes: { [unplacedKey]: {} } }, index),
    735,
    'an empty record is not data'
  );
});
