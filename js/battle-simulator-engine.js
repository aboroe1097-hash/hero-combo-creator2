import {
  BATTLE_ROWS,
  BATTLE_STAT_KEYS,
  MAX_BATTLE_STAT_VALUE,
  MAX_COMBAT_SPEED,
  MAX_UNIT_STAT_VALUE,
  UNIT_STAT_KEYS,
} from './battle-simulator-data.js';
import {
  DEFAULT_BATTLE_COEFFICIENTS,
  normalizeBattleCoefficients,
} from './battle-simulator-coefficients.js';

export const BATTLE_MODEL_VERSION = 'battle-stats-v2-beta-1';
export const BATTLE_MAX_ROUNDS = 200;
export const BATTLE_BASE_CASUALTY_RATE = DEFAULT_BATTLE_COEFFICIENTS.baseCasualtyRate;
export const BATTLE_BATCH_PRESETS = Object.freeze([1, 10, 50, 100, 500]);
export const BATTLE_MAX_BATCH_ITERATIONS = 500;
export const BATTLE_HP_REFERENCE = 20;
export const BATTLE_MAX_TROOPS_PER_ROW = 10_000_000;

export const BATTLE_MODEL_ASSUMPTIONS = Object.freeze({
  phase: 'Battle stats v2 troop-only beta',
  statContractVersion: 2,
  formula:
    'baseCasualtyRate * (mightScale * effectiveAttack) ** mightExponent * (1 + damageScale * damage / 100) ** damageExponent * strikeMultiplier / ((resistanceScale * effectiveDefense) ** resistanceExponent * (hpScale * effectiveHp / 20) ** hpExponent * (1 + damageMitigation / 100))',
  statDerivation:
    'effectiveAttack = unit Attack * Battle Might / 100; effectiveDefense = unit Defense * Battle Resistance / 100; effectiveHp = unit HP * Battle HP / 100.',
  hpReference: BATTLE_HP_REFERENCE,
  casualtyRateCap: DEFAULT_BATTLE_COEFFICIENTS.casualtyRateCap,
  casualtyRounding:
    'Floor attacker troops multiplied by casualty rate; a positive-rate hit deals at least 1 casualty, a zero-rate hit deals 0, and no hit exceeds the target row remaining.',
  simultaneousOverflow:
    'If simultaneous attempted casualties exceed the target row, allocate the available troops proportionally and assign remainder casualties by largest fractional share, then stable action order.',
  maxRounds: BATTLE_MAX_ROUNDS,
  targetSelection: 'Each living row targets the enemy front-most living row.',
  actionOrder:
    'Combat Speed selects only the Round 1 opening strike. Exact-speed opening ties resolve simultaneously; remaining rows exchange simultaneously, and every later round is one simultaneous exchange.',
  tacticalStatsActive: false,
  tacticalStatsNote:
    'Tactical Might and Tactical Resistance are recorded but inactive until hero skills are modeled.',
  typeCountersActive: false,
  randomByDefault: false,
  batchVariance:
    'strikeVariancePct is expressed in percentage points; 5 means a seeded multiplier from 0.95 to 1.05 per hit.',
});

const UINT32_MAX = 0xffffffff;
const UINT32_RANGE = 0x100000000;
const RUN_SEED_STEP = 0x9e3779b9;

function validateFiniteNonNegative(value, label, maximum = Number.MAX_VALUE) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new TypeError(`${label} must be a finite number.`);
  if (numeric < 0) throw new RangeError(`${label} cannot be negative.`);
  if (numeric > maximum) throw new RangeError(`${label} cannot exceed ${maximum}.`);
  return numeric;
}

function requireOwn(object, key, label) {
  if (!Object.hasOwn(object, key)) {
    throw new TypeError(`${label} is missing required field "${key}".`);
  }
  return object[key];
}

function requireStatsObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be provided as an object.`);
  }
  return value;
}

function normalizeStats(rawStats, label) {
  if (!rawStats || typeof rawStats !== 'object' || Array.isArray(rawStats)) {
    throw new TypeError(`${label} stats must be provided as an object.`);
  }
  const rawUnit = requireStatsObject(requireOwn(rawStats, 'unit', label), `${label} unit stats`);
  const rawBattle = requireStatsObject(
    requireOwn(rawStats, 'battle', label),
    `${label} battle stats`
  );

  return {
    unit: Object.fromEntries(
      UNIT_STAT_KEYS.map((key) => [
        key,
        validateFiniteNonNegative(
          requireOwn(rawUnit, key, `${label} unit stats`),
          `${label} unit ${key}`,
          MAX_UNIT_STAT_VALUE
        ),
      ])
    ),
    battle: Object.fromEntries(
      BATTLE_STAT_KEYS.map((key) => [
        key,
        validateFiniteNonNegative(
          requireOwn(rawBattle, key, `${label} battle stats`),
          `${label} battle ${key}`,
          key === 'combatSpeed' ? MAX_COMBAT_SPEED : MAX_BATTLE_STAT_VALUE
        ),
      ])
    ),
  };
}

function normalizeTroops(value, label) {
  const troops = Number(value);
  if (!Number.isSafeInteger(troops)) {
    throw new TypeError(`${label} troops must be a safe integer.`);
  }
  if (troops < 0) throw new RangeError(`${label} troops cannot be negative.`);
  if (troops > BATTLE_MAX_TROOPS_PER_ROW) {
    throw new RangeError(`${label} troops cannot exceed ${BATTLE_MAX_TROOPS_PER_ROW}.`);
  }
  return troops;
}

function normalizeSide(rawSide, sideId) {
  if (!rawSide || typeof rawSide !== 'object' || Array.isArray(rawSide)) {
    throw new TypeError(`Side ${sideId} must be provided as an object.`);
  }
  if (!Array.isArray(rawSide.rows) || rawSide.rows.length !== BATTLE_ROWS.length) {
    throw new RangeError(`Side ${sideId} must contain exactly three rows: Front, Middle, Back.`);
  }

  const rows = rawSide.rows.map((rawRow, index) => {
    if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
      throw new TypeError(`Side ${sideId} ${BATTLE_ROWS[index].label} row must be an object.`);
    }
    const rowDefinition = BATTLE_ROWS[index];
    const initialTroops = normalizeTroops(rawRow.troops, `Side ${sideId} ${rowDefinition.label}`);
    return {
      side: sideId,
      id: rowDefinition.id,
      label: rowDefinition.label,
      position: rowDefinition.position,
      type: rawRow.type ?? null,
      tier: rawRow.tier ?? null,
      initialTroops,
      troops: initialTroops,
      stats: normalizeStats(rawRow.stats, `Side ${sideId} ${rowDefinition.label}`),
    };
  });
  const initialTroops = rows.reduce((total, row) => total + row.initialTroops, 0);
  if (!Number.isSafeInteger(initialTroops)) {
    throw new RangeError(`Side ${sideId} total troops must be a safe integer.`);
  }

  return {
    id: sideId,
    label: String(rawSide.label || `Side ${sideId}`).trim() || `Side ${sideId}`,
    rows,
  };
}

function normalizeSeed(value = 1) {
  const seed = Number(value);
  if (!Number.isSafeInteger(seed)) throw new TypeError('Seed must be an integer.');
  if (seed < 0 || seed > UINT32_MAX) {
    throw new RangeError(`Seed must be between 0 and ${UINT32_MAX}.`);
  }
  return seed >>> 0;
}

function normalizeVariance(value = 0) {
  const variance = Number(value);
  if (!Number.isFinite(variance)) {
    throw new TypeError('strikeVariancePct must be a finite number.');
  }
  if (variance < 0 || variance > 100) {
    throw new RangeError('strikeVariancePct must be between 0 and 100.');
  }
  return variance;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function calculateCasualtyRateInLogSpace(
  attackerStats,
  defenderStats,
  strikeMultiplier,
  coefficients
) {
  if (strikeMultiplier === 0) return 0;
  if (attackerStats.unit.attack === 0 || attackerStats.battle.might === 0) return 0;
  if (
    defenderStats.unit.defense === 0 ||
    defenderStats.battle.resistance === 0 ||
    defenderStats.unit.hp === 0 ||
    defenderStats.battle.hp === 0
  ) {
    return coefficients.casualtyRateCap;
  }

  const logEffective = (points, percent) => Math.log(points) + Math.log(percent) - Math.log(100);
  const attackerEffectiveAttack = logEffective(
    attackerStats.unit.attack,
    attackerStats.battle.might
  );
  const defenderEffectiveDefense = logEffective(
    defenderStats.unit.defense,
    defenderStats.battle.resistance
  );
  const defenderEffectiveHp = logEffective(defenderStats.unit.hp, defenderStats.battle.hp);
  const logAttack =
    Math.log(coefficients.baseCasualtyRate) +
    coefficients.mightExponent * (Math.log(coefficients.mightScale) + attackerEffectiveAttack) +
    coefficients.damageExponent *
      Math.log1p((attackerStats.battle.damage / 100) * coefficients.damageScale) +
    Math.log(strikeMultiplier);
  const logDefense =
    coefficients.resistanceExponent *
      (Math.log(coefficients.resistanceScale) + defenderEffectiveDefense) +
    coefficients.hpExponent *
      (Math.log(coefficients.hpScale) + defenderEffectiveHp - Math.log(BATTLE_HP_REFERENCE)) +
    Math.log1p(defenderStats.battle.damageMitigation / 100);
  const logRate = logAttack - logDefense;

  if (logRate >= Math.log(coefficients.casualtyRateCap)) {
    return coefficients.casualtyRateCap;
  }
  return clamp(Math.exp(logRate), 0, coefficients.casualtyRateCap);
}

function calculateCasualtyRateUnchecked(
  attackerStats,
  defenderStats,
  strikeMultiplier,
  coefficients
) {
  return calculateCasualtyRateInLogSpace(
    attackerStats,
    defenderStats,
    strikeMultiplier,
    coefficients
  );
}

export function calculateCasualtyRate(attackerStats, defenderStats, strikeMultiplier = 1) {
  const multiplier = validateFiniteNonNegative(strikeMultiplier, 'Strike multiplier');
  return calculateCasualtyRateUnchecked(
    normalizeStats(attackerStats, 'Attacker'),
    normalizeStats(defenderStats, 'Defender'),
    multiplier,
    DEFAULT_BATTLE_COEFFICIENTS
  );
}

function getModelVersion(coefficients) {
  const usesDefaults = Object.entries(DEFAULT_BATTLE_COEFFICIENTS).every(
    ([key, value]) => coefficients[key] === value
  );
  return usesDefaults ? BATTLE_MODEL_VERSION : `${BATTLE_MODEL_VERSION}+custom-coefficients`;
}

function getModelAssumptions(coefficients) {
  if (coefficients.casualtyRateCap === BATTLE_MODEL_ASSUMPTIONS.casualtyRateCap) {
    return BATTLE_MODEL_ASSUMPTIONS;
  }
  return Object.freeze({
    ...BATTLE_MODEL_ASSUMPTIONS,
    casualtyRateCap: coefficients.casualtyRateCap,
  });
}

function getAliveRows(side) {
  return side.rows.filter((row) => row.troops > 0);
}

function getFrontRow(side) {
  return side.rows.find((row) => row.troops > 0) || null;
}

function getSideTotal(side) {
  return side.rows.reduce((total, row) => total + row.troops, 0);
}

function detectOutcome(sides) {
  const sideAAlive = getSideTotal(sides.A) > 0;
  const sideBAlive = getSideTotal(sides.B) > 0;
  if (sideAAlive && sideBAlive) return null;
  if (!sideAAlive && !sideBAlive) return 'draw';
  return sideAAlive ? 'A' : 'B';
}

function getLivingRowsInStableOrder(sides) {
  return [...getAliveRows(sides.A), ...getAliveRows(sides.B)].sort(
    (left, right) => left.position - right.position || left.side.localeCompare(right.side)
  );
}

function buildRoundGroups(sides, round) {
  if (round > 1) {
    return [
      {
        groupType: 'exchange',
        combatSpeed: null,
        getActors: () => getLivingRowsInStableOrder(sides),
      },
    ];
  }

  const livingRows = getLivingRowsInStableOrder(sides);
  const openingSpeed = Math.max(...livingRows.map((row) => row.stats.battle.combatSpeed));
  const openingActors = livingRows.filter((row) => row.stats.battle.combatSpeed === openingSpeed);
  const openingActorSet = new Set(openingActors);
  return [
    {
      groupType: 'opening',
      combatSpeed: openingSpeed,
      getActors: () => openingActors,
    },
    {
      groupType: 'exchange',
      combatSpeed: null,
      getActors: () => getLivingRowsInStableOrder(sides).filter((row) => !openingActorSet.has(row)),
    },
  ];
}

function allocateSimultaneousCasualties(actions) {
  const actionsByTarget = new Map();
  for (const action of actions) {
    const targetKey = `${action.defenderSide}:${action.targetRowId}`;
    if (!actionsByTarget.has(targetKey)) actionsByTarget.set(targetKey, []);
    actionsByTarget.get(targetKey).push(action);
  }

  for (const targetActions of actionsByTarget.values()) {
    const target = targetActions[0]._target;
    const targetTroopsBefore = target.troops;
    const attemptedTotal = targetActions.reduce(
      (total, action) => total + action.attemptedCasualties,
      0
    );

    if (attemptedTotal <= targetTroopsBefore) {
      for (const action of targetActions) action.casualties = action.attemptedCasualties;
    } else {
      const shares = targetActions.map((action, index) => {
        const exact = (targetTroopsBefore * action.attemptedCasualties) / attemptedTotal;
        const casualties = Math.min(action.attemptedCasualties, Math.floor(exact));
        action.casualties = casualties;
        return { action, index, remainder: exact - casualties };
      });
      let unallocated =
        targetTroopsBefore - targetActions.reduce((total, action) => total + action.casualties, 0);
      shares.sort((left, right) => right.remainder - left.remainder || left.index - right.index);
      while (unallocated > 0) {
        let allocatedThisPass = false;
        for (const share of shares) {
          if (unallocated === 0) break;
          if (share.action.casualties >= share.action.attemptedCasualties) continue;
          share.action.casualties += 1;
          unallocated -= 1;
          allocatedThisPass = true;
        }
        if (!allocatedThisPass) break;
      }
    }

    const appliedTotal = targetActions.reduce((total, action) => total + action.casualties, 0);
    target.troops = Math.max(0, targetTroopsBefore - appliedTotal);
    for (const action of targetActions) {
      action.targetTroopsAfter = target.troops;
    }
  }
}

function toPublicAction(action) {
  const { _target, ...publicAction } = action;
  return publicAction;
}

function createSideSummary(side) {
  const rows = side.rows.map((row) => ({
    id: row.id,
    label: row.label,
    position: row.position,
    type: row.type,
    tier: row.tier,
    initialTroops: row.initialTroops,
    survivingTroops: row.troops,
    casualties: row.initialTroops - row.troops,
    stats: {
      unit: { ...row.stats.unit },
      battle: { ...row.stats.battle },
    },
  }));
  const initialTroops = rows.reduce((total, row) => total + row.initialTroops, 0);
  const survivingTroops = rows.reduce((total, row) => total + row.survivingTroops, 0);
  return {
    id: side.id,
    label: side.label,
    initialTroops,
    survivingTroops,
    casualties: initialTroops - survivingTroops,
    rows,
  };
}

function getOutcomeReason(outcome, rounds) {
  if (outcome === 'stalemate') return 'round-limit';
  if (outcome === 'draw') return rounds === 0 ? 'both-sides-empty' : 'mutual-elimination';
  return 'side-eliminated';
}

export function simulateBattle(
  { sideA, sideB } = {},
  {
    seed: rawSeed = 1,
    strikeVariancePct: rawVariance = 0,
    includeEventLog = true,
    coefficients: rawCoefficients,
  } = {}
) {
  const seed = normalizeSeed(rawSeed);
  const strikeVariancePct = normalizeVariance(rawVariance);
  const coefficients = normalizeBattleCoefficients(rawCoefficients);
  const modelVersion = getModelVersion(coefficients);
  const assumptions = getModelAssumptions(coefficients);
  const variance = strikeVariancePct / 100;
  const random = createSeededRandom(seed);
  const sides = {
    A: normalizeSide(sideA, 'A'),
    B: normalizeSide(sideB, 'B'),
  };
  const roundLog = [];
  const actionLog = [];
  let openingInitiative = null;
  let outcome = detectOutcome(sides);
  let rounds = 0;

  while (!outcome && rounds < BATTLE_MAX_ROUNDS) {
    rounds += 1;
    const roundGroups = buildRoundGroups(sides, rounds);
    const loggedGroups = [];

    for (let groupIndex = 0; groupIndex < roundGroups.length; groupIndex += 1) {
      const roundGroup = roundGroups[groupIndex];
      const livingActors = roundGroup.getActors().filter((actor) => actor.troops > 0);
      if (livingActors.length === 0) continue;

      const actions = [];
      for (const actor of livingActors) {
        const defenderSide = actor.side === 'A' ? 'B' : 'A';
        const target = getFrontRow(sides[defenderSide]);
        if (!target) continue;
        const strikeMultiplier = variance === 0 ? 1 : 1 + (random() * 2 - 1) * variance;
        const casualtyRate = calculateCasualtyRateUnchecked(
          actor.stats,
          target.stats,
          strikeMultiplier,
          coefficients
        );
        const attemptedCasualties =
          casualtyRate <= 0
            ? 0
            : Math.min(target.troops, Math.max(1, Math.floor(actor.troops * casualtyRate)));
        actions.push({
          id: `r${rounds}-g${groupIndex + 1}-a${actions.length + 1}`,
          round: rounds,
          group: groupIndex + 1,
          groupType: roundGroup.groupType,
          combatSpeed: roundGroup.combatSpeed,
          actorCombatSpeed: actor.stats.battle.combatSpeed,
          simultaneous: livingActors.length > 1,
          attackerSide: actor.side,
          attackerRowId: actor.id,
          attackerRowLabel: actor.label,
          attackerTroops: actor.troops,
          defenderSide,
          targetRowId: target.id,
          targetRowLabel: target.label,
          targetTroopsBefore: target.troops,
          strikeMultiplier,
          casualtyRate,
          attemptedCasualties,
          casualties: 0,
          targetTroopsAfter: target.troops,
          _target: target,
        });
      }
      if (actions.length === 0) continue;

      if (!openingInitiative && roundGroup.groupType === 'opening') {
        const openingSides = [...new Set(actions.map((action) => action.attackerSide))];
        openingInitiative = {
          side: openingSides.length === 1 ? openingSides[0] : 'tie',
          sides: openingSides,
          combatSpeed: roundGroup.combatSpeed,
          tied: openingSides.length > 1,
          simultaneous: actions.length > 1,
          rows: actions.map((action) => ({
            side: action.attackerSide,
            rowId: action.attackerRowId,
            rowLabel: action.attackerRowLabel,
            combatSpeed: action.actorCombatSpeed,
          })),
        };
      }

      const aliveBefore = new Set(
        [...getAliveRows(sides.A), ...getAliveRows(sides.B)].map((row) => `${row.side}:${row.id}`)
      );
      allocateSimultaneousCasualties(actions);
      const publicActions = actions.map(toPublicAction);
      const eliminatedRows = actions
        .map((action) => action._target)
        .filter(
          (target, index, targets) =>
            targets.indexOf(target) === index &&
            aliveBefore.has(`${target.side}:${target.id}`) &&
            target.troops === 0
        )
        .map((target) => ({ side: target.side, rowId: target.id, rowLabel: target.label }));

      if (includeEventLog) {
        loggedGroups.push({
          group: groupIndex + 1,
          groupType: roundGroup.groupType,
          combatSpeed: roundGroup.combatSpeed,
          simultaneous: publicActions.length > 1,
          actions: publicActions,
          eliminatedRows,
        });
        actionLog.push(...publicActions);
      }

      outcome = detectOutcome(sides);
      if (outcome) break;
    }

    if (includeEventLog) roundLog.push({ round: rounds, groups: loggedGroups });
  }

  if (!outcome) outcome = 'stalemate';
  const sideASummary = createSideSummary(sides.A);
  const sideBSummary = createSideSummary(sides.B);
  const summaries = { A: sideASummary, B: sideBSummary };

  return {
    modelVersion,
    coefficients,
    assumptions,
    status: outcome === 'stalemate' ? 'stalemate' : 'complete',
    outcome,
    winner: outcome,
    reason: getOutcomeReason(outcome, rounds),
    rounds,
    seed,
    strikeVariancePct,
    openingInitiative,
    sides: summaries,
    survivors: { A: sideASummary.survivingTroops, B: sideBSummary.survivingTroops },
    casualties: { A: sideASummary.casualties, B: sideBSummary.casualties },
    roundLog,
    actionLog,
  };
}

function normalizeIterations(value) {
  const iterations = Number(value);
  if (!Number.isInteger(iterations)) throw new TypeError('Iterations must be an integer.');
  if (iterations < 1 || iterations > BATTLE_MAX_BATCH_ITERATIONS) {
    throw new RangeError(`Iterations must be between 1 and ${BATTLE_MAX_BATCH_ITERATIONS}.`);
  }
  return iterations;
}

function deriveRunSeed(seed, runIndex) {
  return (seed + Math.imul(runIndex, RUN_SEED_STEP)) >>> 0;
}

export function simulateBattleBatch(
  config,
  {
    iterations: rawIterations = 100,
    seed: rawSeed = 1,
    strikeVariancePct: rawVariance = 5,
    includeResults = false,
    includeEventLogs = false,
    coefficients: rawCoefficients,
  } = {}
) {
  const runCount = normalizeIterations(rawIterations);
  const seed = normalizeSeed(rawSeed);
  const strikeVariancePct = normalizeVariance(rawVariance);
  const coefficients = normalizeBattleCoefficients(rawCoefficients);
  const modelVersion = getModelVersion(coefficients);
  const assumptions = getModelAssumptions(coefficients);
  const keepResults = Boolean(includeResults || includeEventLogs);
  const keepLogs = Boolean(includeEventLogs);
  const outcomeCounts = { A: 0, B: 0, draw: 0, stalemate: 0 };
  const totalSurvivors = { A: 0, B: 0 };
  const totalCasualties = { A: 0, B: 0 };
  const results = [];
  const runSeeds = [];
  let totalRounds = 0;

  for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
    const runSeed = deriveRunSeed(seed, runIndex);
    runSeeds.push(runSeed);
    const result = simulateBattle(config, {
      seed: runSeed,
      strikeVariancePct,
      includeEventLog: keepLogs,
      coefficients,
    });
    outcomeCounts[result.outcome] += 1;
    totalRounds += result.rounds;
    totalSurvivors.A += result.survivors.A;
    totalSurvivors.B += result.survivors.B;
    totalCasualties.A += result.casualties.A;
    totalCasualties.B += result.casualties.B;
    if (keepResults) results.push({ runNumber: runIndex + 1, ...result });
  }

  const outcomeRates = Object.fromEntries(
    Object.entries(outcomeCounts).map(([key, count]) => [key, count / runCount])
  );
  const outcomes = Object.fromEntries(
    Object.keys(outcomeCounts).map((key) => [
      key,
      { count: outcomeCounts[key], rate: outcomeRates[key] },
    ])
  );
  const batch = {
    modelVersion,
    coefficients,
    assumptions,
    runCount,
    seed,
    runSeeds,
    strikeVariancePct,
    outcomes,
    winCounts: outcomeCounts,
    winRates: outcomeRates,
    averageRounds: totalRounds / runCount,
    averageTotalSurvivors: {
      A: totalSurvivors.A / runCount,
      B: totalSurvivors.B / runCount,
    },
    averageTotalCasualties: {
      A: totalCasualties.A / runCount,
      B: totalCasualties.B / runCount,
    },
  };
  if (keepResults) batch.results = results;
  return batch;
}
