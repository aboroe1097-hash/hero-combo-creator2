import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';
import {
  buildPrerequisiteGraph,
  collectRequiredNodes,
  computeFullPath,
  computeMinUnlockPath,
  computePlanCosts,
  computeRemainingCosts,
  familyFromCodexNodes,
  listCodexResearchTrees,
  listMilestones,
  normalizeNodeAccess,
  normalizeTechTree,
  parseCodexResearchTree,
  suggestNextBest,
  verifyTreeStatedTotal,
  verifyTreeTotal,
} from '../../js/research-planner-model.js';
import { techDatabase } from '../../js/tech-db.js';

const x12Path = fileURLToPath(
  new URL('../../docs/sources/x10-x12/x12-research.json', import.meta.url)
);
const x12Trees = JSON.parse(readFileSync(x12Path, 'utf8'));

test('X12 Defense tree matches the published 4,998,500 war-badge total', () => {
  const family = parseCodexResearchTree(x12Trees[0]);
  assert.equal(family.name, 'Melee Legion - Defense');
  assert.equal(family.nodes.length, 29);
  assert.equal(verifyTreeStatedTotal(family, 'warBadges'), 4_998_500);
  assert.equal(family.requirementStatus, 'resolved');
});

test('X12 Defense per-level cost arrays sum to 5,065,100 (source discrepancy, not guessed)', () => {
  const family = parseCodexResearchTree(x12Trees[0]);
  assert.equal(verifyTreeTotal(family, 'warBadges'), 5_065_100);
  assert.notEqual(verifyTreeTotal(family, 'warBadges'), verifyTreeStatedTotal(family, 'warBadges'));
});

test('X12 Charge tree parses and totals 4,763,500 war badges both ways', () => {
  const family = parseCodexResearchTree(x12Trees[1]);
  assert.equal(family.name, 'Melee Legion - Charge');
  assert.equal(family.nodes.length, 30);
  assert.equal(verifyTreeTotal(family, 'warBadges'), 4_763_500);
  assert.equal(verifyTreeStatedTotal(family, 'warBadges'), 4_763_500);
  assert.equal(family.requirementStatus, 'none');
});

test('X12 Defense resolves positional relations with OR alternates to node ids', () => {
  const family = parseCodexResearchTree(x12Trees[0]);
  const tacticalProtection = family.nodes.find((node) => node.name === 'Melee Tactical Protection');
  assert.ok(tacticalProtection);
  assert.equal(tacticalProtection.requirementGroups.length, 2);
  assert.equal(tacticalProtection.requirementGroups[0].length, 1);
  assert.equal(tacticalProtection.requirementGroups[1].length, 1);
  const classLegion = family.nodes.find((node) => node.name === 'Perseverance - Class Legion');
  const legionI = family.nodes.find((node) => node.name === 'Perseverance - Legion I');
  assert.deepEqual(
    new Set(tacticalProtection.requirementGroups.flat()),
    new Set([classLegion.id, legionI.id])
  );
});

test('codex trees carry verificationStatus unverified by default and access normalizes', () => {
  const family = parseCodexResearchTree(x12Trees[1]);
  for (const node of family.nodes) {
    assert.equal(node.verificationStatus, 'unverified');
    assert.equal(node.access, 'standard');
  }
  assert.equal(normalizeNodeAccess('royal'), 'royal');
  assert.equal(normalizeNodeAccess('paid'), 'paid');
  assert.equal(normalizeNodeAccess('bogus'), 'standard');
});

test('tech-db trees preserve declared verification status and expected cost mapping', () => {
  const families = techDatabase.map(normalizeTechTree).filter(Boolean);
  assert.ok(families.length >= 29);
  for (const family of families) {
    assert.equal(family.source, 'tech-db');
    for (const node of family.nodes) {
      const source = techDatabase.find((tree) => tree.id === family.familyId);
      assert.equal(node.verificationStatus, source.verificationStatus || 'current');
      assert.ok(node.costs.resources.length === node.maxLevel);
      assert.ok(node.costs.wisdom.length === node.maxLevel);
      assert.ok(node.costs.courage.length === node.maxLevel);
      assert.ok(node.costs.warBadges.length === node.maxLevel);
    }
  }
});

test('X8 war-badge trees map wisdomCosts to war badges via costType', () => {
  const tech = techDatabase.find((candidate) =>
    candidate.nodes.some(
      (node) =>
        node.costType === 'War Badge' && Array.isArray(node.wisdomCosts) && node.wisdomCosts.length
    )
  );
  assert.ok(tech, 'expected at least one war-badge tree in tech-db');
  const family = normalizeTechTree(tech);
  const badgeNodes = family.nodes.filter((node) => node.costs.warBadges.some((value) => value > 0));
  assert.ok(badgeNodes.length > 0);
  for (const node of badgeNodes) {
    assert.equal(
      node.costs.resources.reduce((sum, value) => sum + value, 0),
      0
    );
  }
});

test('min-unlock path includes the prerequisite chain plus the target', () => {
  const family = parseCodexResearchTree(x12Trees[0]);
  const target = family.nodes.find((node) => node.name === 'Melee Tactical Protection');
  const plan = computeMinUnlockPath(family, target.id, 5);
  assert.equal(plan.nodeLevels[target.id], 5);
  assert.equal(plan.mode, 'min-unlock');
  assert.ok(plan.requiredCount >= 10, 'unlock chains through the research ladder');
  for (const [nodeId, level] of Object.entries(plan.nodeLevels)) {
    const node = family.nodes.find((candidate) => candidate.id === nodeId);
    assert.ok(node);
    assert.ok(level >= 1 && level <= node.maxLevel);
    if (nodeId !== target.id) assert.equal(level, 1, 'prerequisites unlock at level 1');
  }
});

test('min-unlock cost never exceeds the full-path cost', () => {
  const family = parseCodexResearchTree(x12Trees[0]);
  const target = family.nodes.find((node) => node.name === 'Melee - Footman Raid');
  const min = computeMinUnlockPath(family, target.id, target.maxLevel);
  const full = computeFullPath(family);
  for (const resource of ['resources', 'wisdom', 'courage', 'warBadges']) {
    assert.ok(min.totals[resource] <= full.totals[resource]);
  }
  assert.equal(full.totals.warBadges, verifyTreeTotal(family, 'warBadges'));
});

test('full path lists every node as a milestone', () => {
  const family = parseCodexResearchTree(x12Trees[1]);
  const full = computeFullPath(family);
  const milestones = listMilestones(family, full);
  assert.equal(milestones.length, family.nodes.length);
});

test('remaining costs subtract current levels and flag unverified nodes', () => {
  const family = parseCodexResearchTree(x12Trees[1]);
  const target = family.nodes[0];
  const plan = computeMinUnlockPath(family, target.id, 2);
  const current = { [target.id]: 1 };
  const remaining = computeRemainingCosts(family, current, plan);
  assert.equal(remaining.verified, false);
  assert.equal(remaining.totals.warBadges, family.nodes[0].costs.warBadges[1]);
});

test('tech-db remaining costs stay verified', () => {
  const tech = techDatabase.find((candidate) =>
    candidate.nodes.some((node) => (Array.isArray(node.costs) ? node.costs.length : 0) > 0)
  );
  assert.ok(tech, 'expected at least one tree with resource costs');
  const family = normalizeTechTree(tech);
  const node = family.nodes.find((candidate) => candidate.maxLevel > 1) || family.nodes[0];
  const plan = { nodeLevels: { [node.id]: node.maxLevel } };
  const remaining = computeRemainingCosts(family, {}, plan);
  assert.equal(remaining.verified, true);
  assert.ok(Number.isFinite(remaining.totals.resources));
});

test('prerequisite graph quarantines orphans and reports cycles', () => {
  const family = {
    familyId: 'fixture',
    name: 'Fixture',
    season: '',
    source: 'fixture',
    sourceNote: '',
    requirementStatus: 'resolved',
    nodes: [
      {
        id: 'a',
        name: 'A',
        troop: 'ALL',
        buff: '',
        maxLevel: 1,
        costs: { resources: [0], wisdom: [0], courage: [0], warBadges: [0] },
        requirements: [],
        requirementGroups: [['b']],
        verificationStatus: 'current',
        access: 'standard',
      },
      {
        id: 'b',
        name: 'B',
        troop: 'ALL',
        buff: '',
        maxLevel: 1,
        costs: { resources: [0], wisdom: [0], courage: [0], warBadges: [0] },
        requirements: [],
        requirementGroups: [['a']],
        verificationStatus: 'current',
        access: 'standard',
      },
      {
        id: 'c',
        name: 'C',
        troop: 'ALL',
        buff: '',
        maxLevel: 1,
        costs: { resources: [0], wisdom: [0], courage: [0], warBadges: [0] },
        requirements: [],
        requirementGroups: [['ghost']],
        verificationStatus: 'current',
        access: 'standard',
      },
    ],
  };
  const graph = buildPrerequisiteGraph(family);
  assert.deepEqual(graph.orphans, ['c']);
  assert.ok(graph.cycles.length > 0);
});

test('collectRequiredNodes picks the cheapest OR group deterministically', () => {
  const family = {
    familyId: 'fixture',
    name: 'Fixture',
    season: '',
    source: 'fixture',
    sourceNote: '',
    requirementStatus: 'resolved',
    nodes: [
      {
        id: 'target',
        name: 'Target',
        troop: 'ALL',
        buff: '',
        maxLevel: 1,
        costs: { resources: [0], wisdom: [0], courage: [0], warBadges: [0] },
        requirements: [],
        requirementGroups: [['cheap'], ['expensive']],
        verificationStatus: 'current',
        access: 'standard',
      },
      {
        id: 'cheap',
        name: 'Cheap',
        troop: 'ALL',
        buff: '',
        maxLevel: 1,
        costs: { resources: [0], wisdom: [0], courage: [0], warBadges: [100] },
        requirements: [],
        requirementGroups: [],
        verificationStatus: 'current',
        access: 'standard',
      },
      {
        id: 'expensive',
        name: 'Expensive',
        troop: 'ALL',
        buff: '',
        maxLevel: 1,
        costs: { resources: [0], wisdom: [0], courage: [0], warBadges: [500] },
        requirements: [],
        requirementGroups: [],
        verificationStatus: 'current',
        access: 'standard',
      },
    ],
  };
  const required = collectRequiredNodes(family, 'target');
  assert.deepEqual([...required.keys()], ['cheap']);
});

test('suggestNextBest is deterministic and respects requirements', () => {
  const family = parseCodexResearchTree(x12Trees[0]);
  const first = suggestNextBest(family, {}, 'cheapest-next');
  const second = suggestNextBest(family, {}, 'cheapest-next');
  assert.deepEqual(first, second);
  assert.ok(first.length > 0);
  for (const id of suggestNextBest(family, {}, 'war-badges-next')) {
    const node = family.nodes.find((candidate) => candidate.id === id);
    assert.equal(node.requirementGroups.flatMap((group) => group).length, 0);
  }
  const unlocked = {};
  for (const node of family.nodes) {
    if (node.requirementGroups.flatMap((group) => group).length === 0) unlocked[node.id] = 1;
  }
  const next = suggestNextBest(family, unlocked, 'cheapest-next');
  assert.ok(next.length > 0);
});

test('plan costs ignore out-of-range levels', () => {
  const family = normalizeTechTree(techDatabase[0]);
  const node = family.nodes[0];
  const totals = computePlanCosts(family, { [node.id]: node.maxLevel + 10 });
  assert.ok(Number.isFinite(totals.resources));
});

const codexStoreFixture = {
  datasets: {
    'research-costs': [
      {
        treeName: 'T1',
        season: 'S0',
        medalType: null,
        nodeId: 'n1',
        name: 'Alpha',
        troop: ['ALL'],
        maxLevel: 2,
        totalMedals: 0,
        costs: { resources: [100, 200], gems: [1, 2], timeSeconds: [60, 120] },
        verificationStatus: 'current',
        sourceCredit: 'fixture',
        requirements: ['n2'],
        requirementGroups: [['n2']],
        provenance: { source: 'fixture', verificationStatus: 'current' },
      },
      {
        treeName: 'T1',
        season: 'S0',
        medalType: 'WB',
        nodeId: 'n2',
        name: 'Beta',
        troop: ['Footmen'],
        maxLevel: 1,
        totalMedals: 50,
        costs: { warBadges: [50] },
        verificationStatus: 'current',
        sourceCredit: 'fixture',
        requirements: [],
        requirementGroups: [],
        provenance: { source: 'fixture', verificationStatus: 'current' },
      },
      {
        treeName: 'T2',
        season: 'X12',
        medalType: 'WB',
        nodeId: 'x1',
        name: 'Gamma',
        troop: ['ALL'],
        maxLevel: 1,
        totalMedals: 10,
        costs: { warBadges: [10] },
        verificationStatus: 'historical',
        sourceCredit: 'fixture',
        requirements: [],
        requirementGroups: [],
        provenance: { source: 'fixture', verificationStatus: 'historical' },
      },
    ],
  },
};

test('codex payload trees list and resolve into planner families', () => {
  const trees = listCodexResearchTrees(codexStoreFixture);
  assert.equal(trees.length, 2);
  const t1 = trees.find((tree) => tree.familyId === 'T1');
  assert.equal(t1.season, 'S0');
  const family = familyFromCodexNodes(codexStoreFixture, 'T1');
  assert.equal(family.nodes.length, 2);
  assert.equal(family.requirementStatus, 'resolved');
  const alpha = family.nodes.find((node) => node.id === 'n1');
  assert.deepEqual(alpha.costs.resources, [100, 200]);
  assert.deepEqual(alpha.costs.gems, [1, 2]);
  assert.deepEqual(alpha.costs.timeSeconds, [60, 120]);
  assert.deepEqual(alpha.requirementGroups, [['n2']]);
  const beta = family.nodes.find((node) => node.id === 'n2');
  assert.deepEqual(beta.costs.warBadges, [50]);
  const plan = computeMinUnlockPath(family, 'n1', 2);
  assert.deepEqual(plan.nodeLevels, { n1: 2, n2: 1 });
  const remaining = computeRemainingCosts(family, {}, plan);
  assert.equal(remaining.verified, true);
  assert.equal(remaining.totals.resources, 300);
  assert.equal(remaining.totals.warBadges, 50);
});

test('codex payload preserves provenance and access on planner nodes', () => {
  const family = familyFromCodexNodes(codexStoreFixture, 'T2');
  assert.equal(family.requirementStatus, 'none');
  assert.equal(family.nodes[0].verificationStatus, 'historical');
  assert.equal(family.nodes[0].sourceCredit, 'fixture');
  assert.equal(listCodexResearchTrees(null).length, 0);
  assert.equal(listCodexResearchTrees({}).length, 0);
  assert.equal(familyFromCodexNodes(codexStoreFixture, 'nope'), null);
});

test('live codex payload carries the X12 trees with resolvable requirements', async () => {
  const { readFile } = await import('node:fs/promises');
  const { gunzipSync } = await import('node:zlib');
  let store = null;
  try {
    const raw = await readFile(new URL('../../js/codex-payload.json', import.meta.url));
    const payload = JSON.parse(raw.toString('utf8'));
    const decoded =
      payload.encoding === 'gzip-base64'
        ? JSON.parse(gunzipSync(Buffer.from(payload.payload, 'base64')).toString('utf8'))
        : payload;
    store = decoded;
  } catch {
    return;
  }
  const trees = listCodexResearchTrees(store);
  assert.ok(trees.length >= 30, `expected 30+ trees, got ${trees.length}`);
  const defense = familyFromCodexNodes(store, 'Melee Legion - Defense');
  assert.ok(defense);
  assert.equal(defense.nodes.length, 29);
  assert.equal(defense.requirementStatus, 'resolved');
  const graph = buildPrerequisiteGraph(defense);
  assert.equal(graph.orphans.length, 0);
});
