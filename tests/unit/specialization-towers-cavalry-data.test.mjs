import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CAVALRY_SPECIALIZATION_ASSET_MANIFEST,
  CAVALRY_SPECIALIZATION_ASSET_ROOT,
  CAVALRY_SPECIALIZATION_DATA_REVISION,
  CAVALRY_SPECIALIZATION_EVIDENCE,
  CAVALRY_SPECIALIZATION_LEGION_SKILLS,
  CAVALRY_SPECIALIZATION_NODE_ICON_ASSETS,
  CAVALRY_SPECIALIZATION_RESEARCH,
  getCavalrySpecializationResearch,
} from '../../js/specialization-towers-cavalry-data.js';
import {
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_RESEARCH,
} from '../../js/specialization-towers-v2-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const assetRoot = path.join(root, CAVALRY_SPECIALIZATION_ASSET_ROOT);
const manifest = JSON.parse(await readFile(path.join(root, CAVALRY_SPECIALIZATION_ASSET_MANIFEST)));
const researchValues = Object.values(CAVALRY_SPECIALIZATION_RESEARCH);

function resolvedCanonical(node, key) {
  return node.troopSpecific?.cavalry?.[key] ?? node[key] ?? null;
}

function insideAssetRoot(relativePath) {
  assert.equal(path.isAbsolute(relativePath), false, relativePath);
  assert.equal(relativePath.includes('..'), false, relativePath);
  const resolved = path.resolve(assetRoot, relativePath);
  assert.equal(resolved.startsWith(`${assetRoot}${path.sep}`), true, relativePath);
  return resolved;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function pngDimensions(buffer) {
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

test('Cavalry overlay covers only the twelve screenshot-confirmed column 1-3 researches', () => {
  assert.equal(CAVALRY_SPECIALIZATION_DATA_REVISION, '2026-07-18-cavalry-screenshots-v1');
  assert.deepEqual(
    researchValues.map(({ id, canonicalName, column, orderInColumn }) => ({
      id,
      canonicalName,
      column,
      orderInColumn,
    })),
    [
      { id: 'training1', canonicalName: 'Cavalry Training I', column: 1, orderInColumn: 1 },
      { id: 'encounter1', canonicalName: 'Encounter Battle I', column: 1, orderInColumn: 2 },
      { id: 'callofglory1', canonicalName: 'Call of Glory I', column: 1, orderInColumn: 3 },
      { id: 'enhanced1', canonicalName: 'Enhanced Tactics I', column: 1, orderInColumn: 4 },
      { id: 'training2', canonicalName: 'Cavalry Training II', column: 2, orderInColumn: 1 },
      { id: 'siege1', canonicalName: 'Siege Skill I', column: 2, orderInColumn: 2 },
      { id: 'defensive1', canonicalName: 'Defensive Skill I', column: 2, orderInColumn: 3 },
      { id: 'neat1', canonicalName: 'Neat Formation I', column: 2, orderInColumn: 4 },
      { id: 'training3', canonicalName: 'Cavalry Training III', column: 3, orderInColumn: 1 },
      { id: 'encounter2', canonicalName: 'Encounter Battle II', column: 3, orderInColumn: 2 },
      { id: 'callofglory2', canonicalName: 'Call of Glory II', column: 3, orderInColumn: 3 },
      { id: 'enhanced2', canonicalName: 'Enhanced Tactics II', column: 3, orderInColumn: 4 },
    ]
  );
  assert.equal(getCavalrySpecializationResearch('training1').troopId, 'cavalry');
  assert.equal(getCavalrySpecializationResearch('missing'), null);
  assert.equal(Object.isFrozen(CAVALRY_SPECIALIZATION_RESEARCH), true);
});

test('verified node counts and research-scoped stable IDs match the canonical corpus', () => {
  const expectedCounts = [11, 14, 17, 24, 14, 18, 23, 28, 17, 24, 29, 34];
  const allStableIds = [];

  for (const [index, research] of researchValues.entries()) {
    const canonical = SPECIALIZATION_RESEARCH[research.id];
    const canonicalCount = canonical.nodes.length + (canonical.passiveSkillNodeId === null ? 0 : 1);
    assert.equal(research.verifiedNodeCount, expectedCounts[index], research.id);
    assert.equal(research.nodes.length, research.verifiedNodeCount, research.id);
    assert.equal(research.nodes.length, canonicalCount, research.id);
    assert.equal(
      new Set(research.nodes.map(({ canonicalNodeId }) => canonicalNodeId)).size,
      canonicalCount
    );

    for (const node of research.nodes) {
      assert.equal(node.id, `${research.id}:${node.canonicalNodeId}`);
      assert.match(node.id, new RegExp(`^${research.id}:\\d+$`, 'u'));
      allStableIds.push(node.id);
    }
  }

  assert.equal(new Set(allStableIds).size, allStableIds.length);
});

test('canonical names and Cavalry effects are copied without mutating shared data', () => {
  for (const research of researchValues) {
    const canonical = SPECIALIZATION_RESEARCH[research.id];
    for (const node of research.nodes.filter(({ isPassive }) => !isPassive)) {
      const source = canonical.nodes.find(({ id }) => id === node.canonicalNodeId);
      assert.ok(source, node.id);
      assert.equal(node.canonicalName, resolvedCanonical(source, 'name'), node.id);
      assert.equal(node.effect, resolvedCanonical(source, 'effect'), node.id);
      assert.equal(node.bonusName, resolvedCanonical(source, 'bonusName'), node.id);
      assert.equal(node.bonusValue, resolvedCanonical(source, 'bonusValue'), node.id);
    }
  }

  const energetic = CAVALRY_SPECIALIZATION_RESEARCH.training3.nodes.find(
    ({ canonicalName }) => canonicalName === 'Energetic'
  );
  assert.equal(energetic.effect, 'Base HP +2%');
  assert.equal(SPECIALIZATION_RESEARCH.training3.nodes[8].name, 'Energetic');
  assert.equal(Object.isFrozen(SPECIALIZATION_RESEARCH.training3.nodes[8]), true);
});

test('unproven order, prerequisites, node-to-icon mapping, and per-node medals remain null', () => {
  for (const research of researchValues) {
    assert.equal(research.arrangement.status, 'verified-completed-view');
    assert.equal(research.arrangement.nodeOrder, null);
    assert.equal(research.arrangement.directedPrerequisites, null);
    assert.equal(research.nodeMedalCostsComplete, false);
    assert.equal(research.provenance.perNodeMedalCosts, null);

    const validIds = new Set(research.nodes.map(({ id }) => id));
    for (const node of research.nodes) {
      assert.equal(node.iconAssetPath, null, node.id);
      assert.equal(node.arrangementSlotId, null, node.id);
      assert.equal(node.learningOrder, null, node.id);
      assert.equal(node.medalCost, null, node.id);
      if (node.prerequisiteNodeIds === null) continue;
      assert.equal(Array.isArray(node.prerequisiteNodeIds), true, node.id);
      for (const prerequisiteId of node.prerequisiteNodeIds) {
        assert.equal(validIds.has(prerequisiteId), true, `${node.id} -> ${prerequisiteId}`);
      }
    }
  }

  for (const icon of Object.values(CAVALRY_SPECIALIZATION_NODE_ICON_ASSETS)) {
    assert.equal(icon.canonicalMeaning, null);
  }
});

test('known full-research totals stay consistent while no total is distributed into nodes', () => {
  const expectedColumnTotals = new Map([
    [1, 15_647],
    [2, 31_294],
    [3, 62_588],
  ]);

  for (const research of researchValues) {
    assert.equal(research.totalMedalCost, SPECIALIZATION_RESEARCH[research.id].cost, research.id);
    assert.equal(
      research.nodes.reduce((total, { medalCost }) => total + (medalCost ?? 0), 0),
      0,
      research.id
    );
  }

  for (const [column, expectedTotal] of expectedColumnTotals) {
    assert.equal(
      researchValues
        .filter((research) => research.column === column)
        .reduce((total, research) => total + research.totalMedalCost, 0),
      expectedTotal
    );
  }
});

test('three screenshot-confirmed Legion Skills match canonical names and effects', () => {
  assert.deepEqual(Object.keys(CAVALRY_SPECIALIZATION_LEGION_SKILLS), ['1', '2', '3']);
  for (const [columnId, skill] of Object.entries(CAVALRY_SPECIALIZATION_LEGION_SKILLS)) {
    const canonical = SPECIALIZATION_LEGION_SKILLS[columnId].cavalry;
    assert.equal(skill.id, `cavalry:column-${columnId}:legion-skill`);
    assert.equal(skill.canonicalName, canonical.name);
    assert.equal(skill.effect, canonical.desc);
    assert.equal(skill.medalCost, 0);
    assert.match(skill.provenance.inGameConfirmation, /^cav-legion-/u);
  }
});

test('asset manifest preserves exact source hashes and deterministic crop provenance', async () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.troopId, 'cavalry');
  assert.equal(manifest.evidence.length, 17);
  assert.equal(manifest.derivedAssets.length, 23);
  assert.equal(
    manifest.sourceArchive.sha256,
    '41edb116383bbb18555798788a5579f3aa8c5dff64545bf9b507712e49e9d901'
  );

  const evidenceById = new Map();
  for (const [id, relativePath, width, height, expectedHash] of manifest.evidence) {
    assert.equal(evidenceById.has(id), false, id);
    const filePath = insideAssetRoot(relativePath);
    const bytes = await readFile(filePath);
    assert.equal(sha256(bytes), expectedHash, relativePath);
    assert.equal(width, 716);
    assert.equal(height, 1600);
    evidenceById.set(id, { relativePath, width, height });
  }

  for (const [relativePath, evidenceId, crop, expectedHash] of manifest.derivedAssets) {
    const source = evidenceById.get(evidenceId);
    assert.ok(source, `${relativePath}: ${evidenceId}`);
    assert.equal(crop.length, 4);
    const [x, y, width, height] = crop;
    assert.equal(x >= 0 && y >= 0 && width > 0 && height > 0, true, relativePath);
    assert.equal(x + width <= source.width, true, relativePath);
    assert.equal(y + height <= source.height, true, relativePath);
    const bytes = await readFile(insideAssetRoot(relativePath));
    assert.equal(sha256(bytes), expectedHash, relativePath);
    assert.deepEqual(pngDimensions(bytes), [width, height], relativePath);
  }
});

test('every database asset and evidence path is scoped, present, and declared in the manifest', async () => {
  const declared = new Set([
    ...manifest.evidence.map(
      ([, relativePath]) => `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/${relativePath}`
    ),
    ...manifest.derivedAssets.map(
      ([relativePath]) => `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/${relativePath}`
    ),
  ]);
  const referenced = new Set();

  for (const source of Object.values(CAVALRY_SPECIALIZATION_EVIDENCE.screenshots)) {
    referenced.add(source.assetPath);
  }
  for (const research of researchValues) referenced.add(research.researchIconAssetPath);
  for (const icon of Object.values(CAVALRY_SPECIALIZATION_NODE_ICON_ASSETS)) {
    referenced.add(icon.assetPath);
  }
  for (const skill of Object.values(CAVALRY_SPECIALIZATION_LEGION_SKILLS)) {
    referenced.add(skill.iconAssetPath);
  }

  for (const assetPath of referenced) {
    assert.equal(assetPath.startsWith(`${CAVALRY_SPECIALIZATION_ASSET_ROOT}/`), true, assetPath);
    assert.equal(declared.has(assetPath), true, assetPath);
    const relativePath = assetPath.slice(CAVALRY_SPECIALIZATION_ASSET_ROOT.length + 1);
    assert.ok((await readFile(insideAssetRoot(relativePath))).length > 0, assetPath);
  }
});
