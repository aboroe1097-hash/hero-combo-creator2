import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARTIFACT_DATABASE,
  getAllArtifactNodes,
  getArtifactNodeById,
  calculateArtifactMetrics,
  calculateArtifactActiveBuffs,
} from '../../js/artifact-db.js';

test('Artifact One: Redemption Grail structure and completeness', () => {
  const grail = ARTIFACT_DATABASE.find((a) => a.id === 'redemption-grail');
  assert.ok(grail, 'Redemption Grail must exist in database');
  assert.equal(grail.number, 1);
  assert.equal(grail.tiers.length, 4, 'Must have 4 tiers');

  const nodes = getAllArtifactNodes(grail);
  assert.equal(nodes.length, 40, 'Must have exactly 40 nodes');

  // Verify unique ids
  const ids = new Set(nodes.map((n) => n.id));
  assert.equal(ids.size, 40, 'All node ids must be unique');

  // Verify all costs array length matches maxLevel
  for (const node of nodes) {
    assert.equal(
      node.costs.length,
      node.maxLevel,
      `Node ${node.id} costs array length (${node.costs.length}) must equal maxLevel (${node.maxLevel})`
    );
  }
});

test('Artifact One: Redemption Grail cost math matches public sheet data', () => {
  const grail = ARTIFACT_DATABASE[0];
  const metrics = calculateArtifactMetrics(grail, {});

  // Total RGE: 416 (Skill 1) + 1412 (Skill 2) + 2204 (3.0a) + 2204 (3.0b) + 5471 (Skill 4) = 11,707
  assert.equal(metrics.totalRGE, 11707, 'Total RGE must equal 11,707');
  // Total AS: Tier 1 (11,340) + Tier 2 (37,800) + Tier 3 (58,140) = 107,280
  assert.equal(metrics.totalAS, 107280, 'Total AS must equal 107,280');

  // When all at level 0:
  assert.equal(metrics.remainingRGE, 11707);
  assert.equal(metrics.remainingAS, 107280);
  assert.equal(metrics.investedRGE, 0);
  assert.equal(metrics.investedAS, 0);
  assert.equal(metrics.maxedNodes, 0);
  assert.equal(metrics.completionPercent, 0);

  // Daily rate calculations
  assert.equal(metrics.dailyRGE, 4);
  assert.equal(metrics.dailyAS, 80);
  assert.equal(metrics.daysRemainingRGE, Math.ceil(11707 / 4));
  assert.equal(metrics.daysRemainingAS, Math.ceil(107280 / 80));
});

test('Artifact One: Level progression, partial upgrades and active buffs', () => {
  const grail = ARTIFACT_DATABASE[0];
  const testLevels = {
    rg_1_0: 10, // Maxed root 1 -> activates Permanent: Artifact's Damage Boost +10%
    rg_1_1a: 5, // Might +5%
    rg_1_amp_a: 10, // Maxed -> Basic Sacred Might +50, Front-row squad's Might +10%
  };

  const metrics = calculateArtifactMetrics(grail, testLevels);
  assert.equal(metrics.investedRGE, 416); // All 10 levels of Skill 1
  assert.equal(metrics.remainingRGE, 11707 - 416);
  // rg_1_1a level 5 costs: 20+40+60+80+100 = 300
  // rg_1_amp_a level 10 costs: 2370
  assert.equal(metrics.investedAS, 300 + 2370);
  assert.equal(metrics.maxedNodes, 2);

  const buffs = calculateArtifactActiveBuffs(grail, testLevels);
  assert.equal(buffs.might, 5); // 5 * 1%
  assert.equal(buffs.sacredMight, 50); // 10 * 5
  assert.equal(buffs.artifactDamageBoost, 10);
  assert.equal(buffs.permanentAttributes.length, 2);
});
