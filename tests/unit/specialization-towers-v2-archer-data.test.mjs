import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  ARCHER_SPECIALIZATION_DATA_REVISION,
  ARCHER_SPECIALIZATION_EVIDENCE,
  ARCHER_SPECIALIZATION_ICON_ASSETS,
  ARCHER_SPECIALIZATION_LEGION_SKILLS,
  ARCHER_SPECIALIZATION_RESEARCH,
  ARCHER_SPECIALIZATION_RESEARCH_ORDER,
  getArcherSpecializationResearch,
} from '../../js/specialization-towers-v2-archer-data.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const researchValues = Object.values(ARCHER_SPECIALIZATION_RESEARCH);

function absolute(asset) {
  return resolve(root, ...asset.split('/'));
}

function pngSize(buffer) {
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('Archer evidence revision contains only screenshot-confirmed columns I-III', () => {
  assert.equal(ARCHER_SPECIALIZATION_DATA_REVISION, '2026-07-18-archer-columns-1-3');
  assert.deepEqual(ARCHER_SPECIALIZATION_RESEARCH_ORDER[1], [
    'training1',
    'encounter1',
    'callofglory1',
    'enhanced1',
  ]);
  assert.deepEqual(ARCHER_SPECIALIZATION_RESEARCH_ORDER[2], [
    'training2',
    'siege1',
    'defensive1',
    'neat1',
  ]);
  assert.deepEqual(ARCHER_SPECIALIZATION_RESEARCH_ORDER[3], [
    'training3',
    'encounter2',
    'callofglory2',
    'enhanced2',
  ]);
  assert.equal(researchValues.length, 12);
  assert.equal(getArcherSpecializationResearch('training1').name, 'Archer Training I');
  assert.equal(getArcherSpecializationResearch('missing'), null);
});

test('every preserved source screenshot exists and retains its recorded SHA-256', () => {
  assert.equal(Object.keys(ARCHER_SPECIALIZATION_EVIDENCE).length, 17);
  for (const item of Object.values(ARCHER_SPECIALIZATION_EVIDENCE)) {
    const path = absolute(item.asset);
    assert.equal(existsSync(path), true, item.asset);
    assert.equal(statSync(path).size > 0, true, item.asset);
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), item.sha256);
    assert.equal(item.sourceType, 'user-supplied-game-screenshot');
    assert.deepEqual(item.imageSize, { width: 716, height: 1600 });
  }
});

test('direct icon crops exist at their declared lossless dimensions', () => {
  assert.equal(Object.keys(ARCHER_SPECIALIZATION_ICON_ASSETS).length, 19);
  for (const icon of Object.values(ARCHER_SPECIALIZATION_ICON_ASSETS)) {
    const path = absolute(icon.asset);
    assert.equal(existsSync(path), true, icon.asset);
    assert.deepEqual(pngSize(readFileSync(path)), {
      width: icon.crop.width,
      height: icon.crop.height,
    });
    assert.equal(icon.transform, 'direct-pixel-crop-no-resize');
    assert.equal(
      Object.values(ARCHER_SPECIALIZATION_EVIDENCE).some(({ id }) => id === icon.sourceEvidenceId),
      true,
      icon.sourceEvidenceId
    );
  }
});

test('Archer node IDs are unique by troop, research, and canonical node', () => {
  const expectedCounts = {
    training1: 11,
    encounter1: 14,
    callofglory1: 17,
    enhanced1: 24,
    training2: 14,
    siege1: 18,
    defensive1: 23,
    neat1: 28,
    training3: 17,
    encounter2: 24,
    callofglory2: 29,
    enhanced2: 34,
  };
  const ids = [];

  for (const research of researchValues) {
    assert.equal(research.troop, 'archer');
    assert.equal(research.nodeCount, expectedCounts[research.researchId]);
    assert.equal(research.nodes.length, expectedCounts[research.researchId]);
    for (const node of research.nodes) {
      assert.match(node.id, new RegExp(`^archer:${research.researchId}:node:[0-9]+$`, 'u'));
      assert.equal(node.researchId, research.researchId);
      assert.equal(typeof node.name, 'string');
      assert.equal(node.name.length > 0, true);
      assert.equal(typeof node.effect, 'string');
      assert.equal(node.effect.length > 0, true);
      ids.push(node.id);
    }
  }

  assert.equal(new Set(ids).size, ids.length);
});

test('layout slots are stable, valid, and preserve incomplete mappings as unknown', () => {
  const slotIds = [];
  for (const research of researchValues) {
    const { arrangement } = research;
    assert.equal(arrangement.evidence.length >= 1, true);
    assert.equal(arrangement.slots.length, research.nodeCount);
    assert.equal(arrangement.slotToCanonicalNodeMapping, null);
    assert.equal(arrangement.connections, null);
    assert.equal(arrangement.prerequisiteDirection, null);

    for (const slot of arrangement.slots) {
      assert.match(slot.id, new RegExp(`^archer:${research.researchId}:slot:[0-9]{2}$`, 'u'));
      assert.equal(slot.canonicalNodeId, null);
      assert.equal(
        (Number.isInteger(slot.x) && Number.isInteger(slot.y)) ||
          (slot.x === null && slot.y === null),
        true,
        slot.id
      );
      slotIds.push(slot.id);
    }
  }
  assert.equal(new Set(slotIds).size, slotIds.length);

  const enhanced = ARCHER_SPECIALIZATION_RESEARCH.enhanced2.arrangement;
  assert.equal(enhanced.completeness, 'one-node-position-unknown');
  assert.equal(enhanced.slots.filter(({ x, y }) => x === null && y === null).length, 1);
});

test('unproven prerequisites and per-node medal costs remain explicitly unknown', () => {
  for (const research of researchValues) {
    const knownCosts = research.nodes.filter(({ medalCost }) => Number.isInteger(medalCost));
    assert.equal(knownCosts.length, 0, research.researchId);
    assert.equal(Number.isInteger(research.totalMedalCost), true);

    for (const node of research.nodes) {
      assert.equal(node.medalCost, null, node.id);
      assert.equal(node.medalCostEvidence, null, node.id);
      assert.equal(node.prerequisiteNodeIds, null, node.id);
      assert.equal(node.prerequisiteEvidence, null, node.id);
      assert.notEqual(node.medalCost, research.totalMedalCost, node.id);
    }

    if (knownCosts.length === research.nodes.length) {
      assert.equal(
        knownCosts.reduce((total, node) => total + node.medalCost, 0),
        research.totalMedalCost
      );
    }
  }
});

test('the three supplied Legion Skill records match the canonical Archer effects', () => {
  assert.deepEqual(
    Object.values(ARCHER_SPECIALIZATION_LEGION_SKILLS).map(({ column, name }) => [column, name]),
    [
      [1, 'Rapid Shots'],
      [2, 'Sniper Archer'],
      [3, 'Strong Resistance'],
    ]
  );
  for (const skill of Object.values(ARCHER_SPECIALIZATION_LEGION_SKILLS)) {
    assert.equal(existsSync(absolute(skill.iconAsset)), true, skill.iconAsset);
    assert.equal(skill.effect.length > 0, true);
    assert.equal(skill.evidence.sourceType, 'user-supplied-game-screenshot');
  }
});
