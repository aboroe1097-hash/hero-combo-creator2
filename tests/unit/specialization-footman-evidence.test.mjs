import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import test from 'node:test';

import {
  FOOTMAN_SPECIALIZATION_ASSET_ROOT,
  FOOTMAN_SPECIALIZATION_EVIDENCE_REVISION,
  FOOTMAN_SPECIALIZATION_ICON_CROPS,
  FOOTMAN_SPECIALIZATION_LEGION_SKILL_EVIDENCE,
  FOOTMAN_SPECIALIZATION_RESEARCH_EVIDENCE,
  FOOTMAN_SPECIALIZATION_SOURCE,
  getFootmanSpecializationResearchEvidence,
} from '../../js/specialization-footman-evidence.js';
import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
} from '../../js/specialization-towers-v2-data.js';

const root = resolve('.');
const assetRoot = resolve(root, FOOTMAN_SPECIALIZATION_ASSET_ROOT);

function jpegSize(buffer) {
  assert.equal(buffer[0], 0xff, 'JPEG must start with FF D8');
  assert.equal(buffer[1], 0xd8, 'JPEG must start with FF D8');
  let offset = 2;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);

  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const segmentLength = buffer.readUInt16BE(offset);
    if (startOfFrameMarkers.has(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }
    offset += segmentLength;
  }

  throw new Error('JPEG dimensions were not found.');
}

function allCropDescriptors() {
  return [
    ...Object.values(FOOTMAN_SPECIALIZATION_ICON_CROPS.research),
    ...Object.values(FOOTMAN_SPECIALIZATION_ICON_CROPS.nodeSamples),
    ...Object.values(FOOTMAN_SPECIALIZATION_ICON_CROPS.legionSkill),
  ];
}

test('Footmen evidence revision is isolated, immutable, and limited to columns I-III', () => {
  assert.equal(FOOTMAN_SPECIALIZATION_EVIDENCE_REVISION, '2026-07-18-footmen-columns-1-3');
  assert.equal(FOOTMAN_SPECIALIZATION_SOURCE.troopId, 'footman');
  assert.equal(FOOTMAN_SPECIALIZATION_SOURCE.observationDate, '2026-07-18');
  assert.equal(FOOTMAN_SPECIALIZATION_SOURCE.completionState, '100-percent');
  assert.match(FOOTMAN_SPECIALIZATION_SOURCE.evidenceBoundary, /not prerequisite direction/u);
  assert.equal(Object.isFrozen(FOOTMAN_SPECIALIZATION_SOURCE), true);
  assert.equal(Object.isFrozen(FOOTMAN_SPECIALIZATION_RESEARCH_EVIDENCE), true);
  assert.deepEqual(
    [...new Set(FOOTMAN_SPECIALIZATION_RESEARCH_EVIDENCE.map(({ column }) => column))],
    [1, 2, 3]
  );
});

test('all 17 exact source assets exist in the non-deployed Footmen evidence folder and match hashes', () => {
  const entries = Object.entries(FOOTMAN_SPECIALIZATION_SOURCE.assets);
  assert.equal(entries.length, 17);
  assert.equal(FOOTMAN_SPECIALIZATION_SOURCE.archiveBytes, 1193507);
  assert.equal(
    FOOTMAN_SPECIALIZATION_SOURCE.archiveSha256,
    'aa026381902e382d6112a547fb80718bf38993aabee75c48ff801953c2099fe8'
  );

  for (const [assetId, asset] of entries) {
    assert.match(asset.file, /^[a-z0-9-]+\.jpeg$/u, assetId);
    const path = resolve(assetRoot, asset.file);
    assert.equal(path.startsWith(`${assetRoot}${sep}`), true, `${assetId} path escaped asset root`);
    assert.equal(existsSync(path), true, `${assetId} asset is missing`);
    const bytes = readFileSync(path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, assetId);
    assert.deepEqual(jpegSize(bytes), { width: asset.width, height: asset.height }, assetId);
  }
});

test('research and node icon crops reference valid source pixels', () => {
  const assets = FOOTMAN_SPECIALIZATION_SOURCE.assets;
  assert.equal(Object.keys(FOOTMAN_SPECIALIZATION_ICON_CROPS.research).length, 12);
  assert.equal(Object.keys(FOOTMAN_SPECIALIZATION_ICON_CROPS.nodeSamples).length, 6);
  assert.equal(Object.keys(FOOTMAN_SPECIALIZATION_ICON_CROPS.legionSkill).length, 3);

  for (const descriptor of allCropDescriptors()) {
    const source = assets[descriptor.assetId];
    assert.ok(source, `unknown icon source ${descriptor.assetId}`);
    assert.equal(Number.isInteger(descriptor.x) && descriptor.x >= 0, true);
    assert.equal(Number.isInteger(descriptor.y) && descriptor.y >= 0, true);
    assert.equal(Number.isInteger(descriptor.width) && descriptor.width > 0, true);
    assert.equal(Number.isInteger(descriptor.height) && descriptor.height > 0, true);
    assert.equal(descriptor.x + descriptor.width <= source.width, true);
    assert.equal(descriptor.y + descriptor.height <= source.height, true);
  }
});

test('twelve verified researches keep stable scoped node identities and exact node counts', () => {
  const expected = {
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
  assert.equal(FOOTMAN_SPECIALIZATION_RESEARCH_EVIDENCE.length, 12);

  const allNodeIds = [];
  for (const evidence of FOOTMAN_SPECIALIZATION_RESEARCH_EVIDENCE) {
    const canonical = SPECIALIZATION_RESEARCH[evidence.researchId];
    assert.ok(canonical, evidence.researchId);
    assert.equal(expected[evidence.researchId], evidence.selectableNodeCount);
    assert.equal(evidence.nodes.length, evidence.selectableNodeCount);
    assert.equal(
      canonical.nodes.length + (canonical.passiveSkillNodeId === null ? 0 : 1),
      evidence.selectableNodeCount,
      `${evidence.researchId} count must agree with the canonical corpus`
    );
    assert.equal(
      SPECIALIZATION_COLUMNS[evidence.column].researches[evidence.columnOrder - 1],
      evidence.researchId
    );
    assert.equal(evidence.masteryEmblemCount, 1);
    assert.equal(evidence.arrangement.status, 'verified-completed-graph');
    assert.equal(evidence.arrangement.canonicalNodeOrder, null);
    assert.equal(evidence.arrangement.prerequisiteDirection, null);
    assert.equal(evidence.arrangement.evidenceFrames.length >= 1, true);

    evidence.nodes.forEach((node, index) => {
      assert.match(node.id, new RegExp(`^footman:${evidence.researchId}:visual-node-\\d{2}$`, 'u'));
      assert.equal(node.visualOrder, index + 1);
      assert.equal(node.canonicalNodeId, null);
      assert.equal(node.canonicalName, null);
      assert.equal(node.buffEffect, null);
      assert.equal(node.prerequisiteNodeIds, null);
      assert.equal(node.medalCost, null);
      assert.equal(node.evidenceAssetIds.length >= 1, true);
      allNodeIds.push(node.id);
    });
  }

  assert.equal(new Set(allNodeIds).size, allNodeIds.length, 'node IDs must be globally unique');
  assert.equal(
    allNodeIds.length,
    Object.values(expected).reduce((total, count) => total + count, 0)
  );
});

test('Enhanced Tactics II preserves both aligned evidence frames without inventing nodes', () => {
  const evidence = getFootmanSpecializationResearchEvidence('enhanced2');
  assert.deepEqual(evidence.arrangement.evidenceFrames, [
    { assetId: 'enhanced2Left', offsetX: 135, offsetY: 0 },
    { assetId: 'enhanced2Right', offsetX: 0, offsetY: 0 },
  ]);
  assert.equal(evidence.selectableNodeCount, 34);
  assert.equal(getFootmanSpecializationResearchEvidence('unknown'), null);
});

test('unknown per-node values stay unknown and are never inferred from research totals', () => {
  for (const evidence of FOOTMAN_SPECIALIZATION_RESEARCH_EVIDENCE) {
    const canonicalTotal = SPECIALIZATION_RESEARCH[evidence.researchId].cost;
    assert.equal(Number.isInteger(canonicalTotal) && canonicalTotal > 0, true);
    assert.equal(
      evidence.nodes.every(({ medalCost }) => medalCost === null),
      true
    );
    assert.equal(
      evidence.nodes.some(({ medalCost }) => medalCost === canonicalTotal),
      false
    );
    assert.equal(
      evidence.nodes.every(
        ({ canonicalName, buffEffect }) => canonicalName === null && buffEffect === null
      ),
      true
    );
  }
});

test('the first three Footmen Legion Skills match the supplied in-game text', () => {
  assert.deepEqual(
    Object.values(FOOTMAN_SPECIALIZATION_LEGION_SKILL_EVIDENCE).map(({ name }) => name),
    ['Reserve Supply', 'Targeted Tactics', 'Cover the Weak Point']
  );
  assert.match(FOOTMAN_SPECIALIZATION_LEGION_SKILL_EVIDENCE[1].effect, /recovery rate: 120%/u);
  assert.match(FOOTMAN_SPECIALIZATION_LEGION_SKILL_EVIDENCE[2].effect, /Targeted Attack status/u);
  assert.match(
    FOOTMAN_SPECIALIZATION_LEGION_SKILL_EVIDENCE[3].effect,
    /35% chance to split the damage/u
  );
});
