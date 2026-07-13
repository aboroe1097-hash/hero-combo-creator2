import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  RESEARCH_FRAME_ATLAS,
  RESEARCH_GAME_ART,
  RESEARCH_GAME_ART_GAPS,
  RESEARCH_NEUTRAL_ART_REFERENCE,
  getResearchFrameArt,
  getResearchNodeArt,
  resolveResearchNodeArt,
} from '../../js/research-game-art.js';
import { RESEARCH_GAME_LAYOUTS } from '../../js/research-game-layouts.js';
import { techDatabase } from '../../js/tech-db.js';
import { validateResearchContracts } from '../../scripts/lib/research-contracts.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const persistenceSource = readFileSync(resolve(repoRoot, 'js/app-research.js'), 'utf8');

test('research database, layouts, exact art, and persisted ids satisfy one static contract', () => {
  const result = validateResearchContracts({
    techDatabase,
    layouts: RESEARCH_GAME_LAYOUTS,
    art: RESEARCH_GAME_ART,
    frameAtlas: RESEARCH_FRAME_ATLAS,
    artGaps: RESEARCH_GAME_ART_GAPS,
    getResearchNodeArt,
    getResearchFrameArt,
    persistenceSource,
    repoRoot,
  });

  assert.deepEqual(result.issues, []);
  assert.equal(result.stats.treeCount, techDatabase.length);
  assert.equal(result.stats.layoutTreeCount, Object.keys(RESEARCH_GAME_LAYOUTS).length);
  assert.equal(result.stats.artNodeCount, Object.keys(RESEARCH_GAME_ART).length);
  assert.equal(result.stats.absentTreeCount, RESEARCH_GAME_ART_GAPS.absentTrees.length);
  assert.equal(result.stats.missingNodeCount, RESEARCH_GAME_ART_GAPS.missingNodes.length);
  assert.ok(result.stats.sourceFileCount > 0);
});

test('exact-art helpers never synthesize a missing preferred state', () => {
  const canonicalStates = ['idle', 'active', 'max'];

  for (const [reference, entry] of Object.entries(RESEARCH_GAME_ART)) {
    const [treeId, nodeId] = reference.split('/');
    for (const state of canonicalStates) {
      const expected = entry.variants[state] || null;
      assert.equal(getResearchNodeArt(treeId, nodeId, state), expected, `${reference}/${state}`);
    }
    assert.equal(getResearchNodeArt(treeId, nodeId, '__missing_state__'), null);
  }

  for (const [palette, family] of Object.entries(RESEARCH_FRAME_ATLAS)) {
    for (const state of canonicalStates) {
      assert.equal(
        getResearchFrameArt(palette, state),
        family[state] || null,
        `${palette}/${state}`
      );
    }
    assert.equal(getResearchFrameArt(palette, '__missing_state__'), null);
  }
});

test('visible-art resolver follows the deterministic real-capture fallback order', () => {
  const exact = resolveResearchNodeArt(
    {
      treeId: 'b2691f74',
      nodeId: 'node_1',
      preferredState: 'max',
      nodeName: 'Fertilizer',
      buff: '+3% Food Income per Level',
      troop: 'ALL',
    },
    techDatabase
  );
  assert.equal(exact.provenance, 'exact-node-state');
  assert.equal(exact.sourceKey, 'b2691f74/node_1');
  assert.equal(exact.art, getResearchNodeArt('b2691f74', 'node_1', 'max'));

  const sameNode = resolveResearchNodeArt(
    {
      treeId: 'b2691f74',
      nodeId: 'node_1',
      preferredState: 'idle',
      nodeName: 'Fertilizer',
      buff: '+3% Food Income per Level',
      troop: 'ALL',
    },
    techDatabase
  );
  assert.equal(sameNode.provenance, 'same-node-other-state');
  assert.equal(sameNode.sourceKey, 'b2691f74/node_1');
  assert.equal(sameNode.matchedState, 'max');

  const semantic = resolveResearchNodeArt(
    {
      treeId: '__missing_tree__',
      nodeId: 'semantic',
      preferredState: 'idle',
      nodeName: 'Unrelated Node',
      buff: '+5% Siege Defence Might Archer',
      troop: 'Archer',
    },
    techDatabase
  );
  assert.equal(semantic.provenance, 'semantic-buff-troop');
  assert.notEqual(semantic.sourceKey, RESEARCH_NEUTRAL_ART_REFERENCE);

  const byName = resolveResearchNodeArt(
    {
      treeId: '__missing_tree__',
      nodeId: 'name',
      preferredState: 'idle',
      nodeName: 'Fearless Archery',
      buff: 'Novel Zephyr Effect',
      troop: 'Archer',
    },
    techDatabase
  );
  assert.equal(byName.provenance, 'node-name');
  assert.equal(byName.sourceKey, 'art_of_war_command/node_10');

  const neutral = resolveResearchNodeArt(
    {
      treeId: '__missing_tree__',
      nodeId: 'neutral',
      preferredState: 'idle',
      nodeName: 'Novel Zephyr',
      buff: 'Quantum Orchard',
      troop: 'ALL',
    },
    techDatabase
  );
  assert.equal(neutral.provenance, 'neutral-default');
  assert.equal(neutral.sourceKey, RESEARCH_NEUTRAL_ART_REFERENCE);
  assert.ok(neutral.art);
  assert.ok(Object.isFrozen(neutral));
});

test('resource aliases, exact names, and troop matches select stable closest captures', () => {
  const cases = [
    ['d1956263', 'node_1', 'b2691f74/node_1'],
    ['d1956263', 'node_2', 'b2691f74/node_2'],
    ['d1956263', 'node_5', 'b2691f74/node_5'],
    ['d1956263', 'node_6', 'b2691f74/node_6'],
    ['cc2c9ee1', 'node_1', '38d12254/node_1'],
    ['cc2c9ee1', 'node_4', 'footmen_training/node_15'],
    ['cc2c9ee1', 'node_5', 'cavalry_training/node_15'],
    ['cc2c9ee1', 'node_7', '38d12254/node_7'],
  ];

  for (const [treeId, nodeId, expectedSource] of cases) {
    const tree = techDatabase.find((candidate) => candidate.id === treeId);
    const node = tree.nodes.find((candidate) => candidate.id === nodeId);
    const request = {
      treeId,
      nodeId,
      preferredState: 'idle',
      nodeName: node.name,
      buff: node.buff,
      troop: node.troop,
    };
    const result = resolveResearchNodeArt(request, techDatabase);
    const reversed = resolveResearchNodeArt(request, [...techDatabase].reverse());
    assert.equal(result.sourceKey, expectedSource, `${tree.name}/${node.name}`);
    assert.equal(reversed.sourceKey, expectedSource, `${tree.name}/${node.name}/reversed`);
    assert.equal(reversed.provenance, result.provenance);
  }
});

test('every database node resolves to a supplied Research capture in every UI state', () => {
  for (const tech of techDatabase) {
    for (const node of tech.nodes) {
      for (const preferredState of ['idle', 'active', 'max']) {
        const result = resolveResearchNodeArt(
          {
            treeId: tech.id,
            nodeId: node.id,
            preferredState,
            nodeName: node.name,
            buff: node.buff,
            troop: node.troop,
          },
          techDatabase
        );
        assert.ok(result.art, `${tech.id}/${node.id}/${preferredState}`);
        assert.ok(RESEARCH_GAME_ART[result.sourceKey], result.sourceKey);
        assert.match(result.art.source, /^assets\/research\/sources\//);
      }
    }
  }
});

test('declared exact-art gaps form a complete, non-overlapping partition', () => {
  const artRefs = new Set(Object.keys(RESEARCH_GAME_ART));
  const missingRefs = new Set(RESEARCH_GAME_ART_GAPS.missingNodes);
  const contaminatedRefs = new Set(RESEARCH_GAME_ART_GAPS.contaminatedNodes);

  assert.equal(missingRefs.size, RESEARCH_GAME_ART_GAPS.missingNodes.length);
  assert.equal(contaminatedRefs.size, RESEARCH_GAME_ART_GAPS.contaminatedNodes.length);
  for (const reference of contaminatedRefs) assert.ok(missingRefs.has(reference));

  for (const [treeId, layout] of Object.entries(RESEARCH_GAME_LAYOUTS)) {
    for (const section of layout.sections) {
      for (const row of section.rows) {
        for (const nodeId of row.nodes) {
          const reference = `${treeId}/${nodeId}`;
          assert.notEqual(artRefs.has(reference), missingRefs.has(reference), reference);
        }
      }
    }
  }
});

test('research persistence remains namespaced by the stable treeId:nodeId key', () => {
  assert.match(
    persistenceSource,
    /function\s+researchProgressId\s*\(\s*techId\s*,\s*nodeId\s*\)\s*\{[\s\S]*?return\s+`\$\{techId\}:\$\{nodeId\}`/
  );
  assert.match(persistenceSource, /const\s+RESEARCH_PROGRESS_KEY\s*=\s*['"]vts_research_v1['"]/);

  for (const tree of techDatabase) {
    assert.doesNotMatch(tree.id, /[:/]/);
    for (const node of tree.nodes || []) assert.doesNotMatch(node.id, /[:/]/);
  }
});
