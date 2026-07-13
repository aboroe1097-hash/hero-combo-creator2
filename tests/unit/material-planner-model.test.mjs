import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const materialUiSource = readFileSync('js/material-calculator.js', 'utf8');
const materialCss = readFileSync('css/materials.css', 'utf8');

import {
  DM_SET_IDS,
  DM_MATERIAL_STOCKPILES,
  DM_NORMAL_GEAR_DRAGONITE_PER_ITEM,
  DM_ROUTES,
  DM_SLOT_IDS,
  DM_SLOT_RECIPES,
  DM_TARGET_SET_COUNT,
  DM_TIER_IDENTITIES,
  DM_TIER_IDS,
  applyMaterialPreset,
  calculateMaterialPlan,
  createDefaultMaterialPlan,
  decodeMaterialPlan,
  encodeMaterialPlan,
  focusMaterialSet,
  getDmTierIdentity,
  getNormalGearRequirement,
  getNormalGearDragoniteRequirement,
  DM_ENHANCE_RESOURCE_KEYS,
  DM_ENHANCE_LEVELS,
  DM_ENHANCE_MILESTONES,
  computeEnhancementNeed,
  createDefaultEnhancementState,
  getEnhancementCumulative,
  normalizeMaterialPlan,
} from '../../js/material-planner-model.js';

test('DM quality identity covers all six in-game tiers in order', () => {
  assert.deepEqual(DM_TIER_IDS, ['white', 'green', 'blue', 'purple', 'orange', 'gold']);
  assert.deepEqual(
    DM_TIER_IDS.map((tier) => DM_TIER_IDENTITIES[tier].rank),
    [1, 2, 3, 4, 5, 6]
  );
  assert.equal(getDmTierIdentity('PURPLE'), DM_TIER_IDENTITIES.purple);
  assert.equal(getDmTierIdentity('unknown'), DM_TIER_IDENTITIES.white);
});

test('DM UI uses exact tier equipment art including all six Orange cards', () => {
  const sets = ['dragon-master', 'ranger', 'dreadnaught', 'steel-cavalry'];
  const tiers = ['blue', 'purple', 'gold'];
  const slots = ['accessory', 'amulet', 'armor', 'boots', 'helmet', 'weapon'];

  for (const set of sets) {
    for (const tier of tiers) {
      for (const slot of slots) {
        assert.equal(
          existsSync(`assets/dm/equipment/${set}/${tier}/${slot}.png`),
          true,
          `missing ${set}/${tier}/${slot}.png`
        );
      }
    }
  }

  for (const slot of slots) {
    const orangeAsset = `assets/dm/equipment/dragon-master/orange/${slot}.jpg`;
    assert.equal(existsSync(orangeAsset), true, `missing dragon-master/orange/${slot}.jpg`);
    assert.notDeepEqual(
      readFileSync(orangeAsset),
      readFileSync(`assets/dm/equipment/dragon-master/gold/${slot}.png`),
      `Orange and Gold must not reuse the same ${slot} card`
    );
  }

  assert.match(
    materialUiSource,
    /assets\/dm\/equipment\/\$\{setId\}\/\$\{assetTier\}\/\$\{gameSlot\}\.\$\{extension\}/
  );
  assert.match(materialUiSource, /orange: 'orange'/);
  assert.match(materialUiSource, /assetTier === 'orange' \? 'jpg' : 'png'/);
  assert.doesNotMatch(materialUiSource, /dm-tier-frame|data-active-route|activeRoute/);
  assert.doesNotMatch(materialCss, /\.dm-tier-frame|--dm-route-art|data-active-route/);
  assert.doesNotMatch(materialCss, /filter:\s*saturate/);
  assert.match(materialCss, /assets\/dm\/enhancement\/advance-equipment-source\.jpg/);
  assert.equal(existsSync('assets/dm/enhancement/advance-equipment-source.jpg'), true);
});

test('DM resource summary uses exact game icons and light mode keeps recipe counts readable', () => {
  const resourceIcons = [
    'assets/dm/resources/super-dragonite.png',
    'assets/dm/resources/dragonite.png',
    'assets/dm/resources/gems.png',
  ];

  for (const icon of resourceIcons) {
    assert.equal(existsSync(icon), true, `missing ${icon}`);
    assert.equal(materialUiSource.includes(icon), true, `DM UI does not use ${icon}`);
  }

  assert.match(materialUiSource, /class="dm-resource-icon"/);
  assert.match(materialUiSource, /data-dm-normal-dragonite/);
  assert.match(materialUiSource, /data-dm-stage-resource=/);
  assert.doesNotMatch(materialUiSource, /dm-resource-mark/);
  assert.doesNotMatch(materialUiSource, /data-dm-toggle-comparison aria-expanded/);
  assert.doesNotMatch(materialCss, /\.dm-resource-mark/);
  assert.match(materialCss, /\.dm-normal-gear-card > strong/);
  assert.match(materialCss, /color:\s*#f8fafc/);
});

test('DM route choice and crafting steps stay complete and visible on every viewport', () => {
  assert.match(materialUiSource, /DM_ROUTE_ORDER = Object\.freeze\(\['blue', 'purple', 'gold'\]\)/);
  assert.match(materialUiSource, /renderRouteChooser\(result, t\)[\s\S]*dm-command-layout/);
  assert.match(materialUiSource, /class="dm-route-resources"/);
  assert.match(materialUiSource, /class="dm-route-path"/);
  assert.match(materialUiSource, /data-dm-flow-route=/);
  assert.match(materialUiSource, /data-dm-total-steps=/);
  assert.match(materialUiSource, /dm-recipe-flow--\$\{result\.route\.id\}/);
  assert.doesNotMatch(materialCss, /\.dm-slot-card\.is-disabled\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(materialCss, /\.dm-view-switch\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(materialCss, /\.dm-complete-button\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(
    materialCss,
    /\.dm-route-stat[^}]*,?\s*\.dm-route-card\s*>\s*small\s*\{[^}]*display:\s*none/s
  );
  assert.match(materialCss, /\.dm-recipe-node--normal\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/s);
  assert.match(materialCss, /\.dm-recipe-flow\s*\{[^}]*overflow:\s*visible/s);
});

test('DM route totals scale the verified six-piece guide across five target sets', () => {
  const plan = createDefaultMaterialPlan();

  const purple = calculateMaterialPlan(plan);
  assert.deepEqual(purple.needed, {
    superDragonite: 1920000,
    dragonite: 2872320,
    gems: 16368000,
  });
  assert.deepEqual(purple.perSetFullCost, {
    superDragonite: 384000,
    dragonite: 574464,
    gems: 3273600,
  });

  plan.route = 'blue';
  const blue = calculateMaterialPlan(plan);
  assert.deepEqual(blue.needed, {
    superDragonite: 1536000,
    dragonite: 2304000,
    gems: 22265280,
  });

  plan.route = 'gold';
  const gold = calculateMaterialPlan(plan);
  assert.deepEqual(gold.needed, {
    superDragonite: 3000000,
    dragonite: 2076000,
    gems: 0,
  });
});

test('DM workflow preserves normal gear and each four-to-one merge stage', () => {
  assert.deepEqual(DM_SLOT_RECIPES.armor, { archers: 1, footmen: 2, cavalry: 1 });
  assert.deepEqual(getNormalGearRequirement('purple', 'armor'), {
    archers: 16,
    footmen: 32,
    cavalry: 16,
  });
  assert.deepEqual(DM_SLOT_RECIPES.boots, { archers: 1, footmen: 1, cavalry: 2 });
  assert.deepEqual(getNormalGearRequirement('purple', 'boots'), {
    archers: 16,
    footmen: 16,
    cavalry: 32,
  });
  assert.deepEqual(getNormalGearRequirement('blue', 'sword'), {
    archers: 64,
    footmen: 128,
    cavalry: 64,
  });
  assert.deepEqual(DM_MATERIAL_STOCKPILES.gold, {
    ranger: [10, 7, 9, 6],
    cavalry: [11, 7, 8, 6],
    dreadnaught: [11, 7, 8, 6],
  });
  assert.deepEqual(DM_NORMAL_GEAR_DRAGONITE_PER_ITEM, {
    blue: 140,
    purple: 696,
    gold: 17300,
  });
  assert.equal(getNormalGearDragoniteRequirement('gold', 'boots'), 69200);
  assert.equal(getNormalGearDragoniteRequirement('purple', 'boots'), 44544);
  assert.deepEqual(DM_ROUTES.purple.stages, [
    { tier: 'purple', count: 16 },
    { tier: 'orange', count: 4 },
    { tier: 'gold', count: 1 },
  ]);
  assert.deepEqual(DM_ROUTES.blue.stages, [
    { tier: 'blue', count: 64 },
    { tier: 'purple', count: 16 },
    { tier: 'orange', count: 4 },
    { tier: 'gold', count: 1 },
  ]);
});

test('DM progress, presets, and resource shortfalls stay internally consistent', () => {
  let plan = applyMaterialPreset(createDefaultMaterialPlan(), 'attack');
  plan.completed.armor = true;
  plan.ownedResources.superDragonite = 128000;

  const result = calculateMaterialPlan(plan);
  assert.equal(result.targetSlots.length, 4);
  assert.equal(result.completedSlots.length, 1);
  assert.equal(result.focusedSetProgress, 0.25);
  assert.equal(result.overallProgress, 1 / 20);
  assert.equal(result.totalRemainingPieces, 19);
  assert.equal(result.needed.superDragonite, 1216000);
  assert.equal(result.shortfall.superDragonite, 1088000);
  assert.equal(result.coverage.superDragonite, 2 / 19);
});

test('DM target set count scales totals and limits progress to the selected campaign', () => {
  const plan = createDefaultMaterialPlan();
  plan.targetSets = 3;
  for (const slot of DM_SLOT_IDS) plan.sets[0].completed[slot] = true;
  plan.sets[3].completed.armor = true; // retained history outside the active target

  const result = calculateMaterialPlan(plan);
  assert.equal(result.targetSetCount, 3);
  assert.equal(result.totalTargetPieces, 18);
  assert.equal(result.totalCompletedPieces, 6);
  assert.equal(result.totalRemainingPieces, 12);
  assert.equal(result.overallProgress, 1 / 3);
  assert.equal(result.needed.superDragonite, DM_ROUTES.purple.perPiece.superDragonite * 12);
  assert.deepEqual(result.remainingSetNumbers, [2, 3]);
});

test('DM target set count normalizes to 1-5 while preserving five-set history', () => {
  const low = normalizeMaterialPlan({ version: 4, targetSets: 0, sets: [] });
  const high = normalizeMaterialPlan({ version: 4, targetSets: 99, sets: [] });
  assert.equal(low.targetSets, 1);
  assert.equal(high.targetSets, 5);
  assert.equal(low.sets.length, 5);
});

test('DM share payloads round-trip and reject malformed data', () => {
  const plan = createDefaultMaterialPlan();
  plan.name = 'VTS خطة DM';
  plan.completed.ring = true;

  const encoded = encodeMaterialPlan(plan);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeMaterialPlan(encoded), plan);
  assert.equal(decodeMaterialPlan('not-a-valid-plan'), null);
});

// --- Enhancement / advancement planner (+5 … +25) ------------------------

const ONE_PIECE = {
  5: { superDragonCore: 25200, exoticCrystal: 0, dragonCrystal: 0 },
  10: { superDragonCore: 75700, exoticCrystal: 6000, dragonCrystal: 0 },
  15: { superDragonCore: 178700, exoticCrystal: 15000, dragonCrystal: 200 },
  20: { superDragonCore: 284500, exoticCrystal: 50200, dragonCrystal: 500 },
  25: { superDragonCore: 395300, exoticCrystal: 86700, dragonCrystal: 818 },
};

test('enhancement one-piece cumulative totals match the canonical table', () => {
  for (const level of [5, 10, 15, 20, 25]) {
    assert.deepEqual(getEnhancementCumulative(level, 1), ONE_PIECE[level]);
    assert.deepEqual(DM_ENHANCE_MILESTONES[level], ONE_PIECE[level]);
  }
  assert.deepEqual(getEnhancementCumulative(0, 1), {
    superDragonCore: 0,
    exoticCrystal: 0,
    dragonCrystal: 0,
  });
});

test('enhancement six-piece totals equal exactly 6x one-piece', () => {
  for (const level of DM_ENHANCE_LEVELS) {
    const one = getEnhancementCumulative(level, 1);
    const six = getEnhancementCumulative(level, 6);
    for (const key of DM_ENHANCE_RESOURCE_KEYS) assert.equal(six[key], one[key] * 6);
  }
  assert.deepEqual(getEnhancementCumulative(25, 6), {
    superDragonCore: 2371800,
    exoticCrystal: 520200,
    dragonCrystal: 4908,
  });
  assert.equal(getEnhancementCumulative(5, 6).superDragonCore, 151200);
});

test('enhancement zero-valued resources stay zero at the correct milestones', () => {
  assert.equal(getEnhancementCumulative(5, 1).exoticCrystal, 0);
  assert.equal(getEnhancementCumulative(5, 1).dragonCrystal, 0);
  assert.equal(getEnhancementCumulative(10, 1).dragonCrystal, 0);
});

test('computeEnhancementNeed uses cumulative deltas (current 10 -> target 20)', () => {
  const result = computeEnhancementNeed({ currentLevel: 10, targetLevel: 20, pieceCount: 1 });
  assert.equal(result.reachable, true);
  assert.deepEqual(result.needed, {
    superDragonCore: 208800,
    exoticCrystal: 44200,
    dragonCrystal: 500,
  });
});

test('enhancement owned / needed / shortfall computed correctly', () => {
  const result = computeEnhancementNeed({
    currentLevel: 10,
    targetLevel: 20,
    pieceCount: 1,
    owned: { superDragonCore: 100000, exoticCrystal: 0, dragonCrystal: 0 },
  });
  assert.deepEqual(result.owned, { superDragonCore: 100000, exoticCrystal: 0, dragonCrystal: 0 });
  assert.deepEqual(result.shortfall, {
    superDragonCore: 108800,
    exoticCrystal: 44200,
    dragonCrystal: 500,
  });
});

test('enhancement target at or below current yields zero need and reachable=false', () => {
  const same = computeEnhancementNeed({ currentLevel: 15, targetLevel: 15 });
  assert.equal(same.reachable, false);
  assert.deepEqual(same.needed, { superDragonCore: 0, exoticCrystal: 0, dragonCrystal: 0 });
  const below = computeEnhancementNeed({ currentLevel: 20, targetLevel: 10 });
  assert.equal(below.reachable, false);
  assert.deepEqual(below.needed, { superDragonCore: 0, exoticCrystal: 0, dragonCrystal: 0 });
});

test('enhancement preserves the verified +11 point and floors unknown levels', () => {
  assert.deepEqual(getEnhancementCumulative(11, 1), {
    superDragonCore: 88700,
    exoticCrystal: 7600,
    dragonCrystal: 8,
  });
  assert.deepEqual(getEnhancementCumulative(14, 1), getEnhancementCumulative(11, 1));
  assert.deepEqual(getEnhancementCumulative(24, 1), ONE_PIECE[20]);
  assert.deepEqual(getEnhancementCumulative(3, 1), {
    superDragonCore: 0,
    exoticCrystal: 0,
    dragonCrystal: 0,
  });
});

test('enhancement need from verified +11 to +15 subtracts the +11 cumulative total', () => {
  assert.deepEqual(
    computeEnhancementNeed({ currentLevel: 11, targetLevel: 15, pieceCount: 1 }).needed,
    {
      superDragonCore: 90000,
      exoticCrystal: 7400,
      dragonCrystal: 192,
    }
  );
});

test('enhancement semantics sanity: cumulative(15)-cumulative(10) equals need(10 -> 15)', () => {
  const c10 = getEnhancementCumulative(10, 1);
  const c15 = getEnhancementCumulative(15, 1);
  const manual = Object.fromEntries(DM_ENHANCE_RESOURCE_KEYS.map((k) => [k, c15[k] - c10[k]]));
  assert.deepEqual(
    computeEnhancementNeed({ currentLevel: 10, targetLevel: 15, pieceCount: 1 }).needed,
    manual
  );
});

test('default plan is v4 with five sets and a valid enhancement state', () => {
  const plan = createDefaultMaterialPlan();
  assert.equal(plan.version, 4);
  assert.equal(plan.targetSets, 5);
  assert.equal(plan.focusedSet, 1);
  assert.deepEqual(
    plan.sets.map((set) => set.id),
    DM_SET_IDS
  );
  assert.equal(plan.sets.length, DM_TARGET_SET_COUNT);
  assert.strictEqual(plan.completed, plan.sets[0].completed);
  assert.deepEqual(plan.enhancement, createDefaultEnhancementState());
  assert.equal(plan.enhancement.currentLevel, 0);
  assert.equal(plan.enhancement.targetLevel, 20);
  assert.deepEqual(
    plan.enhancement.currentLevels,
    Object.fromEntries(DM_SLOT_IDS.map((slot) => [slot, 0]))
  );
  assert.equal(plan.enhancement.scope, 'set');
});

test('v2 saved plans migrate to v4 without losing crafting fields', () => {
  const legacy = {
    version: 2,
    route: 'blue',
    preset: 'attack',
    selectedSlot: 'sword',
    targets: { armor: true, dagger: true, ring: true, sword: true, helmet: false, boots: false },
    completed: {
      armor: true,
      dagger: false,
      ring: false,
      sword: false,
      helmet: false,
      boots: false,
    },
    ownedResources: { superDragonite: 1234, dragonite: 56, gems: 78 },
  };
  const migrated = normalizeMaterialPlan(legacy);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.route, 'blue');
  assert.equal(migrated.ownedResources.superDragonite, 1234);
  assert.equal(migrated.targets.sword, true);
  assert.equal(migrated.completed.armor, true);
  assert.equal(migrated.sets[0].completed.armor, true);
  assert.equal(migrated.sets[1].completed.armor, false);
  assert.deepEqual(migrated.enhancement, createDefaultEnhancementState());
});

test('v3 saved plans migrate to v4 while retaining enhancement and completion', () => {
  const legacy = createDefaultMaterialPlan();
  delete legacy.sets;
  delete legacy.targetSets;
  delete legacy.focusedSet;
  legacy.version = 3;
  legacy.completed = { ...legacy.completed, helmet: true };
  legacy.enhancement = {
    currentLevel: 10,
    targetLevel: 20,
    scope: 'piece',
    owned: { superDragonCore: 123, exoticCrystal: 456, dragonCrystal: 7 },
  };

  const migrated = normalizeMaterialPlan(legacy);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.completed.helmet, true);
  assert.equal(migrated.sets[0].completed.helmet, true);
  assert.equal(migrated.enhancement.currentLevel, legacy.enhancement.currentLevel);
  assert.equal(migrated.enhancement.targetLevel, legacy.enhancement.targetLevel);
  assert.equal(migrated.enhancement.scope, legacy.enhancement.scope);
  assert.deepEqual(migrated.enhancement.owned, legacy.enhancement.owned);
});

test('focused set selection keeps independent six-slot completion', () => {
  let plan = createDefaultMaterialPlan();
  plan.completed.armor = true;

  plan = focusMaterialSet(plan, 2);
  assert.equal(plan.focusedSet, 2);
  assert.strictEqual(plan.completed, plan.sets[1].completed);
  assert.equal(plan.completed.armor, false);
  plan.completed.dagger = true;

  plan = focusMaterialSet(plan, 1);
  assert.equal(plan.completed.armor, true);
  assert.equal(plan.completed.dagger, false);
  assert.equal(plan.sets[1].completed.dagger, true);

  assert.equal(focusMaterialSet(plan, 0).focusedSet, 1);
  assert.equal(focusMaterialSet(plan, 6).focusedSet, 1);
});

test('campaign result exposes focused flow plus aggregate 30-piece and five-set progress', () => {
  let plan = createDefaultMaterialPlan();
  for (const slot of DM_SLOT_IDS) plan.sets[0].completed[slot] = true;
  plan.sets[1].completed.armor = true;
  plan.sets[1].completed.dagger = true;
  plan = focusMaterialSet(plan, 2);

  const result = calculateMaterialPlan(plan);
  assert.equal(result.totalTargetPieces, 30);
  assert.equal(result.totalCompletedPieces, 8);
  assert.equal(result.totalRemainingPieces, 22);
  assert.equal(result.overallProgress, 8 / 30);
  assert.equal(result.completedSetCount, 1);
  assert.deepEqual(result.completedSetNumbers, [1]);
  assert.deepEqual(result.remainingSetNumbers, [2, 3, 4, 5]);
  assert.deepEqual(result.completedSlots, ['armor', 'dagger']);
  assert.equal(result.focusedSetSummary.setId, 2);
  assert.equal(result.focusedSetProgress, 2 / 6);
  assert.deepEqual(result.nextPiece, { setId: 2, slot: 'ring' });
  assert.equal(result.needed.superDragonite, DM_ROUTES.purple.perPiece.superDragonite * 22);
});

test('presets apply to every set while preserving the five-set campaign history', () => {
  const plan = createDefaultMaterialPlan();
  for (const set of plan.sets) {
    set.completed.armor = true;
    set.completed.helmet = true;
  }

  const attack = applyMaterialPreset(plan, 'attack');
  const result = calculateMaterialPlan(attack);
  assert.equal(result.totalTargetPieces, 20);
  assert.equal(result.totalCompletedPieces, 5);
  assert.equal(result.totalRemainingPieces, 15);
  assert.equal(result.campaignCompletedPieces, 10);
  for (const set of attack.sets) {
    assert.equal(set.completed.armor, true);
    assert.equal(set.completed.helmet, true);
  }

  const defense = applyMaterialPreset(attack, 'defense');
  assert.equal(calculateMaterialPlan(defense).totalTargetPieces, 20);
  assert.equal(defense.selectedSlot, 'ring');
});

test('preset completion cannot unlock enhancement before all 30 campaign pieces exist', () => {
  let plan = applyMaterialPreset(createDefaultMaterialPlan(), 'attack');
  for (const set of plan.sets) {
    for (const slot of DM_SLOT_IDS) {
      if (plan.targets[slot]) set.completed[slot] = true;
    }
  }

  let result = calculateMaterialPlan(plan);
  assert.equal(result.totalTargetPieces, 20);
  assert.equal(result.allComplete, true);
  assert.equal(result.campaignCompletedPieces, 20);
  assert.equal(result.campaignRemainingPieces, 10);
  assert.equal(result.campaignAllComplete, false);
  assert.equal(result.enhancementUnlocked, false);

  for (const set of plan.sets) {
    for (const slot of DM_SLOT_IDS) set.completed[slot] = true;
  }
  result = calculateMaterialPlan(plan);
  assert.equal(result.campaignCompletedPieces, 30);
  assert.equal(result.campaignCompletedSetCount, 5);
  assert.equal(result.campaignAllComplete, true);
  assert.equal(result.enhancementUnlocked, true);
});

test('all five completed sets produce zero remaining crafting need', () => {
  const plan = createDefaultMaterialPlan();
  for (const set of plan.sets) {
    for (const slot of DM_SLOT_IDS) set.completed[slot] = true;
  }

  const result = calculateMaterialPlan(plan);
  assert.equal(result.totalCompletedPieces, 30);
  assert.equal(result.totalRemainingPieces, 0);
  assert.equal(result.completedSetCount, 5);
  assert.deepEqual(result.completedSetNumbers, [1, 2, 3, 4, 5]);
  assert.equal(result.overallProgress, 1);
  assert.equal(result.allComplete, true);
  assert.equal(result.nextSlot, null);
  assert.equal(result.nextPiece, null);
  assert.deepEqual(result.needed, { superDragonite: 0, dragonite: 0, gems: 0 });
  assert.deepEqual(result.shortfall, { superDragonite: 0, dragonite: 0, gems: 0 });
  assert.deepEqual(result.coverage, { superDragonite: 1, dragonite: 1, gems: 1 });
});

test('v4 share payload preserves campaign focus and per-set completion', () => {
  let plan = createDefaultMaterialPlan();
  plan.sets[2].completed.sword = true;
  plan = focusMaterialSet(plan, 3);
  plan.selectedSlot = 'sword';

  const encoded = encodeMaterialPlan(plan);
  const decoded = decodeMaterialPlan(encoded);
  assert.equal(decoded.version, 4);
  assert.equal(decoded.targetSets, 5);
  assert.equal(decoded.focusedSet, 3);
  assert.equal(decoded.selectedSlot, 'sword');
  assert.equal(decoded.sets[2].completed.sword, true);
  assert.strictEqual(decoded.completed, decoded.sets[2].completed);
});

test('campaign normalization retains five stored sets and honors the selected target count', () => {
  const normalized = normalizeMaterialPlan({
    version: 4,
    targetSets: 99,
    focusedSet: 5,
    sets: [{ id: 5, completed: { boots: true } }],
  });
  assert.equal(normalized.targetSets, 5);
  assert.equal(normalized.sets.length, 5);
  assert.equal(normalized.focusedSet, 5);
  assert.equal(normalized.completed.boots, true);
});

test('DM UI exposes target-set and focused-set controls with aggregate summary progress', () => {
  assert.match(materialUiSource, /data-dm-target-sets/);
  assert.match(materialUiSource, /data-dm-focus-set/);
  assert.match(materialUiSource, /result\.totalCompletedPieces/);
  assert.match(materialCss, /\.dm-set-picker button\[aria-pressed='true'\]/);
});

test('DM heading reuses the translated Materials label while detailed locale keys converge', () => {
  assert.match(materialUiSource, /localized\.title = localizedDmText\('tabMaterials'/);
  assert.match(materialUiSource, /window\.addEventListener\('edenLanguageUpdate', render\)/);
});

test('enhancement state survives encode/decode and cleans bad owned input', () => {
  const plan = createDefaultMaterialPlan();
  plan.enhancement.currentLevel = 10;
  plan.enhancement.targetLevel = 25;
  plan.enhancement.scope = 'piece';
  plan.enhancement.owned = { superDragonCore: 50000, exoticCrystal: -5, dragonCrystal: 3.9 };
  const roundTrip = decodeMaterialPlan(encodeMaterialPlan(plan));
  assert.equal(roundTrip.enhancement.currentLevel, 10);
  assert.equal(roundTrip.enhancement.scope, 'piece');
  assert.equal(roundTrip.enhancement.owned.superDragonCore, 50000);
  assert.equal(roundTrip.enhancement.owned.exoticCrystal, 0);
  assert.equal(roundTrip.enhancement.owned.dragonCrystal, 3);
});

test('enhancement target +0 survives normalization and share round-trip', () => {
  const plan = createDefaultMaterialPlan();
  plan.enhancement.currentLevel = 0;
  plan.enhancement.targetLevel = 0;
  const normalized = normalizeMaterialPlan(plan);
  assert.equal(normalized.enhancement.targetLevel, 0);
  assert.equal(decodeMaterialPlan(encodeMaterialPlan(normalized)).enhancement.targetLevel, 0);
});

test('full-set enhancement sums six independent current levels and preserves them in shares', () => {
  const plan = createDefaultMaterialPlan();
  plan.enhancement.currentLevels = {
    armor: 20,
    dagger: 15,
    ring: 10,
    sword: 5,
    helmet: 0,
    boots: 25,
  };
  const levels = DM_SLOT_IDS.map((slot) => plan.enhancement.currentLevels[slot]);
  const result = computeEnhancementNeed({ currentLevels: levels, targetLevel: 20 });
  const expected = Object.fromEntries(
    DM_ENHANCE_RESOURCE_KEYS.map((key) => [
      key,
      levels.reduce(
        (sum, level) =>
          sum +
          Math.max(0, getEnhancementCumulative(20)[key] - getEnhancementCumulative(level)[key]),
        0
      ),
    ])
  );
  assert.deepEqual(result.needed, expected);
  assert.deepEqual(
    decodeMaterialPlan(encodeMaterialPlan(plan)).enhancement.currentLevels,
    plan.enhancement.currentLevels
  );
});

test('legacy set enhancement level seeds all six independent levels', () => {
  const normalized = normalizeMaterialPlan({ enhancement: { currentLevel: 10, scope: 'set' } });
  assert.deepEqual(
    normalized.enhancement.currentLevels,
    Object.fromEntries(DM_SLOT_IDS.map((slot) => [slot, 10]))
  );
});

test('enhancement accepts manual integer levels while cost lookup keeps verified floor semantics', () => {
  const plan = createDefaultMaterialPlan();
  plan.enhancement.currentLevel = 14;
  plan.enhancement.targetLevel = 24;
  const normalized = normalizeMaterialPlan(plan);
  assert.equal(normalized.enhancement.currentLevel, 14);
  assert.equal(normalized.enhancement.targetLevel, 24);
  assert.equal(
    normalizeMaterialPlan({ enhancement: { currentLevel: -4 } }).enhancement.currentLevel,
    0
  );
  assert.equal(
    normalizeMaterialPlan({ enhancement: { targetLevel: 99 } }).enhancement.targetLevel,
    25
  );
  assert.equal(decodeMaterialPlan(encodeMaterialPlan(normalized)).enhancement.targetLevel, 24);
  assert.deepEqual(
    computeEnhancementNeed(normalized.enhancement).needed,
    computeEnhancementNeed({ currentLevel: 11, targetLevel: 20 }).needed
  );
});

test('enhancement UI exposes bounded numeric fields and milestone quick selects', () => {
  assert.match(materialUiSource, /type="number" inputmode="numeric" min="0" max="25" step="1"/);
  assert.match(
    materialUiSource,
    /ENHANCE_QUICK_LEVELS = Object\.freeze\(\[0, 5, 10, 15, 20, 25\]\)/
  );
  assert.match(materialUiSource, /data-dm-enhance-quick-field/);
  assert.match(materialCss, /\.dm-enhance-quick-list/);
  assert.match(materialUiSource, /data-dm-enhance-piece/);
  assert.match(materialUiSource, /data-dm-enhance-piece-delta="-1"/);
  assert.match(materialUiSource, /data-dm-enhance-piece-delta="1"/);
  assert.match(materialUiSource, /Math\.max\(\s*0,\s*Math\.min\(25,/);
  assert.match(materialCss, /\.dm-enhance-pieces/);
  assert.match(materialCss, /\.dm-enhance-piece-controls/);
});

test('legacy completion survives a stray empty campaign container', () => {
  const migrated = normalizeMaterialPlan({
    version: 3,
    completed: { armor: true, helmet: true },
    sets: [],
  });
  assert.equal(migrated.sets[0].completed.armor, true);
  assert.equal(migrated.sets[0].completed.helmet, true);
});

test('DM piece inventory persists safe per-slot counts for Velo account reviews', () => {
  const normalized = normalizeMaterialPlan({
    ownedPieces: { armor: 3, dagger: '2', ring: -1, sword: 999, helmet: 1.8 },
  });
  assert.deepEqual(normalized.ownedPieces, {
    armor: 3,
    dagger: 2,
    ring: 0,
    sword: 99,
    helmet: 1,
    boots: 0,
  });
});
