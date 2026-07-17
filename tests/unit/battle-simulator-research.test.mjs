import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BATTLE_RESEARCH_CATALOG,
  BATTLE_RESEARCH_CATALOG_VERSION,
  BATTLE_RESEARCH_PROGRESS_STORAGE_KEY,
  buildBattleResearchSnapshot,
  createEmptyResearchSnapshot,
  readSavedResearchProgress,
  resolveResearchSources,
} from '../../js/battle-simulator-research.js';
import {
  BATTLE_RESEARCH_CATALOG_STATS,
  isKnownResearchProgressKey,
} from '../../js/battle-simulator-research-catalog.js';
import { normalizeStatSources } from '../../js/battle-simulator-stat-sources.js';
import { getNodeBuffEffects } from '../../js/research-buffs.js';
import { techDatabase } from '../../js/tech-db.js';

function storageWith(value) {
  return {
    reads: 0,
    getItem(key) {
      assert.equal(key, BATTLE_RESEARCH_PROGRESS_STORAGE_KEY);
      this.reads += 1;
      return value;
    },
  };
}

test('research runtime stays inside the extraction-safe Battle Simulator module family', () => {
  for (const filename of ['battle-simulator-research.js', 'battle-simulator-research-catalog.js']) {
    const source = readFileSync(new URL(`../../js/${filename}`, import.meta.url), 'utf8');
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
    assert.ok(imports.every((specifier) => /^\.\/battle-simulator-[^/]+\.js$/.test(specifier)));
  }
});

test('static field catalog covers the approved standard-troop stat families', () => {
  assert.equal(BATTLE_RESEARCH_CATALOG_VERSION, 'research-pvp-field-20260717.1');
  assert.deepEqual(BATTLE_RESEARCH_CATALOG_STATS, {
    modeledEffects: 316,
    modeledNodes: 316,
    knownNodes: 806,
    resistance: 110,
    might: 101,
    combatSpeed: 3,
    tacticalMight: 21,
    tacticalResistance: 21,
    hp: 51,
    damage: 7,
    damageMitigation: 2,
  });

  const databaseNodes = new Map(
    techDatabase.flatMap((tree) =>
      tree.nodes.map((node) => [`${tree.id}:${node.id}`, { tree, node }])
    )
  );
  assert.ok([...databaseNodes.keys()].every(isKnownResearchProgressKey));
  assert.equal(isKnownResearchProgressKey('unknown:node_1'), false);
  for (const entry of BATTLE_RESEARCH_CATALOG) {
    const canonical = databaseNodes.get(entry.progressKey);
    assert.ok(canonical, entry.progressKey);
    assert.equal(entry.provenance.techName, canonical.tree.name);
    assert.equal(entry.provenance.nodeName, canonical.node.name);
    assert.equal(entry.maxLevel, canonical.node.maxLevel);
    assert.deepEqual(entry.appliesTo.battleModes, ['pvp-field']);
    assert.ok(entry.appliesTo.troopTypes.length > 0);
    assert.ok(entry.appliesTo.rowIds.length > 0);
    assert.equal(entry.unit, entry.statKey === 'combatSpeed' ? 'raw' : 'percent');

    const context = `${canonical.node.name} ${canonical.node.buff}`;
    assert.doesNotMatch(context, /marauder|reinforc|\brf\b|defen[cs]e queue/i);
    if (/siege/i.test(context)) assert.match(context, /non[- ]?\s*siege/i);
    if (/\blofty\b/i.test(entry.effectLabel)) assert.match(entry.effectLabel, /non-lofty/i);

    const canonicalEffect = getNodeBuffEffects(canonical.node)[entry.effectIndex];
    if (canonicalEffect) {
      assert.equal(entry.effectLabel, canonicalEffect.label);
      assert.deepEqual(entry.levelValues, canonicalEffect.levelValues || null);
      assert.equal(entry.perLevel, canonicalEffect.perLevelValue);
    } else {
      assert.equal(entry.progressKey, 'b3581c97:node_58');
      assert.equal(entry.perLevel, 2);
      assert.match(canonical.node.buff, /\+2% Damage/);
    }
  }
});

test('reads the bounded saved map, floors levels, and never caches storage', () => {
  const storage = storageWith(
    JSON.stringify({
      '802e7893:node_4': 6.9,
      'bad key': 4,
      '38d12254:node_4': -1,
    })
  );
  const first = readSavedResearchProgress({ storage });
  const second = readSavedResearchProgress({ storage });

  assert.equal(storage.reads, 2);
  assert.deepEqual(first.progress, { '802e7893:node_4': 6 });
  assert.equal(first.malformed, false);
  assert.deepEqual(first.diagnostics.map(({ code }) => code).sort(), [
    'research-progress-key-invalid',
    'research-progress-level-invalid',
  ]);
  assert.deepEqual(second.progress, first.progress);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.progress));
});

test('rejects non-numeric saved levels without coercing them into Research buffs', () => {
  for (const value of [true, '6', [6], { value: 6 }, null]) {
    const json = JSON.stringify({ '802e7893:node_4': value });
    const saved = readSavedResearchProgress({ storage: storageWith(json) });
    const snapshot = buildBattleResearchSnapshot({ storage: storageWith(json) });

    assert.deepEqual(saved.progress, {}, `unexpected progress for ${JSON.stringify(value)}`);
    assert.deepEqual(
      saved.diagnostics.map(({ code }) => code),
      ['research-progress-level-invalid']
    );
    assert.deepEqual(snapshot.sources, [], `unexpected source for ${JSON.stringify(value)}`);
  }
});

test('rejects oversized or malformed saved data and limits entry count', () => {
  const oversized = readSavedResearchProgress({
    storage: storageWith('x'.repeat(64 * 1024 + 1)),
  });
  assert.equal(oversized.malformed, true);
  assert.equal(oversized.diagnostics[0].code, 'research-progress-too-large');

  const malformed = readSavedResearchProgress({ storage: storageWith('{nope') });
  assert.equal(malformed.malformed, true);
  assert.equal(malformed.diagnostics[0].code, 'research-progress-malformed');

  const manyEntries = Object.fromEntries(
    Array.from({ length: 2001 }, (_, index) => [`t${index}:n`, 1])
  );
  const limited = readSavedResearchProgress({ storage: storageWith(JSON.stringify(manyEntries)) });
  assert.equal(Object.keys(limited.progress).length, 2000);
  assert.ok(limited.diagnostics.some(({ code }) => code === 'research-progress-truncated'));
});

test('resolves exact curves, raw combat speed, row scope, and positive mitigation', () => {
  const snapshot = resolveResearchSources({
    progress: {
      '802e7893:node_4': 6,
      '1a6ec06e:node_13': 20,
      '24ffc526:node_34': 5,
      'fc190e81:node_8': 10,
    },
  });
  const byId = new Map(snapshot.sources.map((source) => [source.sourceId, source]));

  assert.equal(byId.get('research:802e7893:node_4:0').amount, 13);
  assert.deepEqual(byId.get('research:802e7893:node_4:0').appliesTo.troopTypes, ['footmen']);
  assert.equal(byId.get('research:1a6ec06e:node_13:0').amount, 50);
  assert.equal(byId.get('research:1a6ec06e:node_13:0').unit, 'raw');
  assert.deepEqual(byId.get('research:24ffc526:node_34:0').appliesTo.rowIds, ['back']);
  assert.equal(byId.get('research:fc190e81:node_8:0').statKey, 'damageMitigation');
  assert.equal(byId.get('research:fc190e81:node_8:0').amount, 5);
  assert.equal(normalizeStatSources(snapshot.sources).length, snapshot.sources.length);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(snapshot.sources.every(Object.isFrozen));
});

test('clamps over-level nodes and reports missing, unmodeled, and unknown saved entries', () => {
  const snapshot = resolveResearchSources({
    progress: {
      '802e7893:node_4': 99,
      'f915a84b:node_8': 3,
      'd1956263:node_1': 1,
      'unknown:node_1': 2,
    },
  });

  assert.equal(snapshot.sources[0].amount, 35);
  assert.equal(snapshot.sources[0].provenance.appliedLevel, 10);
  assert.deepEqual(snapshot.diagnostics.map(({ code }) => code).sort(), [
    'research-effect-unmodeled',
    'research-effect-value-missing',
    'research-level-clamped',
    'research-saved-key-unknown',
  ]);
  assert.deepEqual(snapshot.excludedSources.map(({ reason }) => reason).sort(), [
    'missing-value',
    'not-a-modeled-field-combat-effect',
    'unknown-saved-key',
  ]);
});

test('build snapshot combines fresh-read diagnostics and returns deterministic source order', () => {
  const storage = storageWith(
    JSON.stringify({
      'fc190e81:node_19': 10,
      '802e7893:node_4': 6,
    })
  );
  const snapshot = buildBattleResearchSnapshot({ storage });

  assert.deepEqual(
    snapshot.sources.map(({ sourceId }) => sourceId),
    ['research:802e7893:node_4:0', 'research:fc190e81:node_19:0']
  );
  assert.deepEqual(snapshot.savedProgress, { exists: true, malformed: false, entryCount: 2 });
  assert.deepEqual(createEmptyResearchSnapshot().sources, []);
});
