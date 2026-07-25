import {
  DEFAULT_BATTLE_COEFFICIENTS,
  normalizeBattleCoefficients,
} from './battle-simulator-coefficients.js';
import { BATTLE_STAT_CONTRACT } from './battle-simulator-data.js';
import {
  BATTLE_HERO_SKILL_ASSUMPTIONS,
  BATTLE_HERO_SKILL_COVERAGE,
  getBattleHeroSkill,
} from './battle-simulator-hero-skills.js';
import { buildSetupSnapshot, parseSetupSnapshot } from './battle-simulator-setup.js';

export const BATTLE_EXPORT_SCHEMA_VERSION = 4;

const PREVIOUS_BATTLE_EXPORT_SCHEMA_VERSION = 3;
const MAX_BATTLE_EXPORT_JSON_LENGTH = 5_000_000;

const EVENT_CSV_COLUMNS = [
  'run_index',
  'run_seed',
  'round',
  'action_group',
  'combat_speed',
  'attacker',
  'target',
  'troops_before',
  'casualties',
  'troops_after',
  'strike_multiplier',
  'casualty_rate',
  'status',
];

const EFFECT_EVENT_CSV_COLUMNS = [
  ...EVENT_CSV_COLUMNS,
  'event_kind',
  'effect_phase',
  'effect_source',
  'effect_actor',
  'effect_target',
  'effect_type',
  'effect_value',
  'effect_status',
  'effect_diagnostic',
];

const SUMMARY_CSV_COLUMNS = [
  'schema_version',
  'generated_at',
  'model_version',
  'run_mode',
  'seed',
  'variance',
  'simulations',
  'side_a_wins',
  'side_a_win_rate',
  'side_b_wins',
  'side_b_win_rate',
  'draws',
  'draw_rate',
  'stalemates',
  'stalemate_rate',
  'average_rounds',
  'average_side_a_survivors',
  'average_side_b_survivors',
  'average_total_survivors',
  'average_side_a_casualties',
  'average_side_b_casualties',
  'average_total_casualties',
  'config_json',
  'stat_contract_json',
  'source_provenance_json',
  'equipment_provenance_json',
];

const EFFECT_SUMMARY_CSV_COLUMNS = [...SUMMARY_CSV_COLUMNS, 'effect_provenance_json'];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSensitiveKey(key) {
  const words = String(key)
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const compact = words.join('');
  if (compact.includes('localstorage') || compact.includes('sessionstorage')) return true;
  if (
    words.some(
      (word) =>
        word.startsWith('password') ||
        word.startsWith('passcode') ||
        word.startsWith('secret') ||
        word.startsWith('credential')
    )
  ) {
    return true;
  }
  if (
    words.includes('auth') ||
    words.includes('authorization') ||
    words.includes('authentication') ||
    words.includes('authenticator')
  ) {
    return true;
  }
  if (words.includes('pin') || compact.endsWith('pinhash') || compact.endsWith('pincode'))
    return true;
  if ((words.includes('api') || words.includes('private')) && words.includes('key')) return true;
  return words.includes('token') && !words.includes('troop');
}

function sanitizeForExport(value, ancestors = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return undefined;
  if (ancestors.has(value)) throw new TypeError('Battle export data must not contain cycles.');

  ancestors.add(value);
  if (Array.isArray(value)) {
    const output = value.map((item) => sanitizeForExport(item, ancestors) ?? null);
    ancestors.delete(value);
    return output;
  }

  const output = {};
  for (const key of Object.keys(value).sort()) {
    if (isSensitiveKey(key)) continue;
    const cleanValue = sanitizeForExport(value[key], ancestors);
    if (cleanValue !== undefined) output[key] = cleanValue;
  }
  ancestors.delete(value);
  return output;
}

function stableJson(value, space = 0) {
  return JSON.stringify(sanitizeForExport(value), null, space);
}

function sanitizeDocument(document) {
  const sanitized = sanitizeForExport(document);
  return Object.fromEntries(
    Object.keys(document)
      .filter((key) => Object.hasOwn(sanitized, key))
      .map((key) => [key, sanitized[key]])
  );
}

function normalizeGeneratedAt(value) {
  const supplied = typeof value === 'function' ? value() : value;
  const date = supplied === undefined ? new Date() : new Date(supplied);
  if (Number.isNaN(date.getTime())) throw new TypeError('generatedAt must be a valid date.');
  return date.toISOString();
}

function readPath(value, path) {
  let current = value;
  for (const key of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

function firstDefined(values) {
  return values.find((value) => value !== undefined && value !== null);
}

function finiteNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function numberAt(sources, paths) {
  for (const source of sources) {
    for (const path of paths) {
      const number = finiteNumber(readPath(source, path));
      if (number !== undefined) return number;
    }
  }
  return undefined;
}

function inferRunMode(result, explicitMode) {
  const supplied = String(explicitMode ?? result?.runMode ?? '').toLowerCase();
  if (supplied === 'batch' || supplied === 'single') return supplied;
  if (Array.isArray(result)) return result.length > 1 ? 'batch' : 'single';
  if (!isObject(result)) return 'single';
  if (
    result.batch ||
    result.outcomes ||
    finiteNumber(result.iterations) > 1 ||
    (Array.isArray(result.runs) && result.runs.length > 1) ||
    (Array.isArray(result.results) && result.results.length > 1)
  ) {
    return 'batch';
  }
  return 'single';
}

function extractRuns(result, runMode) {
  if (Array.isArray(result)) return result;
  if (!isObject(result)) return [];
  for (const value of [result.runs, result.results, result.batch?.runs, result.batch?.results]) {
    if (Array.isArray(value)) return value;
  }
  return runMode === 'single' ? [result] : [];
}

function normalizeModel(model) {
  const safeModel = isObject(sanitizeForExport(model)) ? sanitizeForExport(model) : {};
  const version = String(model?.version ?? model?.modelVersion ?? 'unknown');
  const rawAssumptions = model?.assumptions;
  const assumptions =
    rawAssumptions === undefined || rawAssumptions === null
      ? []
      : sanitizeForExport(rawAssumptions);
  delete safeModel.version;
  delete safeModel.modelVersion;
  delete safeModel.assumptions;
  return { version, assumptions, ...safeModel };
}

function createContext(input = {}) {
  const result = input.result ?? null;
  const runMode = inferRunMode(result, input.runMode);
  const model = normalizeModel(input.model ?? {});
  const config = sanitizeForExport(input.config ?? {});
  const generatedAt = normalizeGeneratedAt(input.generatedAt);
  const seed = sanitizeForExport(
    firstDefined([
      input.seed,
      result?.seed,
      result?.randomSeed,
      result?.batch?.seed,
      input.config?.seed,
    ]) ?? null
  );
  const variance = sanitizeForExport(
    firstDefined([
      input.variance,
      result?.variance,
      result?.randomness,
      result?.strikeVariancePct,
      result?.batch?.variance,
      input.config?.variance,
      input.config?.strikeVariancePct,
    ]) ?? null
  );
  return { generatedAt, model, config, runMode, seed, variance, result };
}

function normalizeOutcome(run) {
  const status = String(run?.status ?? run?.result?.status ?? '').toLowerCase();
  if (
    status.includes('stalemate') ||
    status.includes('max_round') ||
    status.includes('max-round')
  ) {
    return 'stalemate';
  }
  let value = run?.winner ?? run?.outcome ?? run?.result?.winner ?? run?.result?.outcome;
  if (isObject(value)) value = value.side ?? value.id ?? value.name;
  const normalized = String(value ?? 'draw')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (['a', 'sidea', 'attacker', 'left', 'team1'].includes(normalized)) return 'sideA';
  if (['b', 'sideb', 'defender', 'right', 'team2'].includes(normalized)) return 'sideB';
  if (normalized.includes('stalemate')) return 'stalemate';
  return 'draw';
}

function roundCount(run) {
  if (Array.isArray(run?.rounds)) return run.rounds.length;
  return finiteNumber(run?.rounds ?? run?.roundCount ?? run?.summary?.rounds);
}

function sideSources(root, side) {
  const suffixes = side === 'A' ? ['sideA', 'a', 'A', 'left'] : ['sideB', 'b', 'B', 'right'];
  const values = [];
  for (const suffix of suffixes) {
    values.push(
      root?.[suffix],
      root?.sides?.[suffix],
      root?.summary?.[suffix],
      root?.final?.[suffix],
      root?.finalState?.[suffix]
    );
  }
  return values.filter((value) => value !== null && value !== undefined);
}

function sumRows(container, fields) {
  const rows = Array.isArray(container)
    ? container
    : (container?.rows ?? container?.squads ?? container?.formations);
  if (!Array.isArray(rows)) return undefined;
  const values = rows
    .map((row) => firstDefined(fields.map((field) => finiteNumber(row?.[field]))))
    .filter((value) => value !== undefined);
  return values.length ? values.reduce((total, value) => total + value, 0) : undefined;
}

function sideMetric(run, config, side, metric) {
  const fields =
    metric === 'survivors'
      ? [
          'survivors',
          'survivingTroops',
          'remainingTroops',
          'troopsRemaining',
          'aliveTroops',
          'troops',
        ]
      : ['casualties', 'losses', 'lostTroops'];
  for (const source of sideSources(run, side)) {
    const direct = firstDefined(fields.map((field) => finiteNumber(source?.[field])));
    if (direct !== undefined) return direct;
    const fromRows = sumRows(source, fields);
    if (fromRows !== undefined) return fromRows;
  }

  const topLevel = run?.[metric];
  if (isObject(topLevel)) {
    const direct = firstDefined(
      (side === 'A' ? ['sideA', 'a', 'A'] : ['sideB', 'b', 'B']).map((key) =>
        finiteNumber(topLevel[key])
      )
    );
    if (direct !== undefined) return direct;
  }

  const initial = initialTroops(config, side);
  if (initial === undefined) return undefined;
  const oppositeMetric = metric === 'survivors' ? 'casualties' : 'survivors';
  for (const source of sideSources(run, side)) {
    const opposite = firstDefined(
      (oppositeMetric === 'survivors'
        ? [
            'survivors',
            'survivingTroops',
            'remainingTroops',
            'troopsRemaining',
            'aliveTroops',
            'troops',
          ]
        : ['casualties', 'losses', 'lostTroops']
      ).map((field) => finiteNumber(source?.[field]))
    );
    if (opposite !== undefined) return Math.max(0, initial - opposite);
  }
  return undefined;
}

function initialTroops(config, side) {
  for (const source of sideSources(config, side)) {
    const direct = firstDefined(
      ['initialTroops', 'totalTroops', 'troops'].map((field) => finiteNumber(source?.[field]))
    );
    if (direct !== undefined) return direct;
    const fromRows = sumRows(source, ['initialTroops', 'troops', 'troopCount', 'count']);
    if (fromRows !== undefined) return fromRows;
  }
  return undefined;
}

function resolveSetupSnapshot(input) {
  const snapshot =
    input.setup !== undefined
      ? input.setup
      : input.state !== undefined
        ? buildSetupSnapshot(input.state)
        : undefined;
  if (!isObject(snapshot)) {
    throw new TypeError('Battle export requires a setup snapshot or simulator state.');
  }
  return parseSetupSnapshot(JSON.stringify(sanitizeForExport(snapshot)));
}

function buildSourceProvenance(setup) {
  return Object.fromEntries(
    ['A', 'B'].map((sideId) => [
      sideId,
      sanitizeForExport(setup.sides[sideId].capturedSourceSnapshot),
    ])
  );
}

function buildEquipmentProvenance(setup) {
  return Object.fromEntries(
    ['A', 'B'].map((sideId) => [sideId, sanitizeForExport(setup.sides[sideId].equipmentLoadout)])
  );
}

function selectBattleResult(result, runMode) {
  for (const selected of [result?.selectedResult, result?.representativeResult]) {
    if (isObject(selected)) return selected;
  }
  if (runMode === 'single' && isObject(result)) return result;
  return extractRuns(result, runMode).find(isObject) ?? (isObject(result) ? result : {});
}

function rowsForSide(root, side) {
  for (const source of sideSources(root, side)) {
    if (Array.isArray(source)) return source;
    for (const rows of [source?.rows, source?.squads, source?.formations]) {
      if (Array.isArray(rows)) return rows;
    }
  }
  return [];
}

function rowNumber(row, fields) {
  return firstDefined(fields.map((field) => finiteNumber(row?.[field])));
}

function buildPerRowMetrics(setup, result, config) {
  const fallbackIds = ['front', 'middle', 'back'];
  return Object.fromEntries(
    ['A', 'B'].map((side) => {
      const setupRows = rowsForSide(setup, side);
      const resultRows = rowsForSide(result, side);
      const configRows = rowsForSide(config, side);
      const rows = Array.from({ length: 3 }, (_, index) => {
        const setupRow = setupRows[index];
        const resultRow = resultRows[index];
        const configRow = configRows[index];
        let initial = firstDefined([
          rowNumber(resultRow, ['initialTroops', 'startingTroops']),
          rowNumber(setupRow, ['initialTroops', 'troops', 'troopCount', 'count']),
          rowNumber(configRow, ['initialTroops', 'troops', 'troopCount', 'count']),
        ]);
        let surviving = rowNumber(resultRow, [
          'survivingTroops',
          'survivors',
          'remainingTroops',
          'troopsRemaining',
          'troops',
        ]);
        let casualties = rowNumber(resultRow, ['casualties', 'losses', 'lostTroops']);

        if (initial === undefined && surviving !== undefined && casualties !== undefined) {
          initial = surviving + casualties;
        }
        if (surviving === undefined && initial !== undefined && casualties !== undefined) {
          surviving = Math.max(0, initial - casualties);
        }
        if (casualties === undefined && initial !== undefined && surviving !== undefined) {
          casualties = Math.max(0, initial - surviving);
        }

        const row = {
          id:
            resultRow?.id ??
            setupRow?.id ??
            configRow?.id ??
            fallbackIds[index] ??
            `row-${index + 1}`,
          initialTroops: initial ?? null,
          survivingTroops: surviving ?? null,
          casualties: casualties ?? null,
        };
        const heroName = firstDefined([
          resultRow?.heroName,
          setupRow?.heroName,
          configRow?.heroName,
        ]);
        const skillIds = firstDefined([
          resultRow?.skillIds,
          resultRow?.heroSkillIds,
          setupRow?.skillIds,
          configRow?.skillIds,
          configRow?.heroSkillIds,
        ]);
        if (heroName) row.heroName = String(heroName);
        if (Array.isArray(skillIds) && skillIds.length > 0) {
          row.skillIds = sanitizeForExport(skillIds.map(String));
        }
        return row;
      });
      return [side, rows];
    })
  );
}

function sideValue(root, side) {
  return root?.sides?.[side] ?? root?.[side === 'A' ? 'sideA' : 'sideB'] ?? root?.[side];
}

function nonEmpty(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (!isObject(value)) return Boolean(value);
  return Object.values(value).some(nonEmpty);
}

function collectEffectEvents(result, runMode) {
  const runs = extractRuns(result, runMode);
  if (runs.length > 0) {
    return runs.flatMap((run, index) =>
      (Array.isArray(run?.effectEvents) ? run.effectEvents : []).map((event) => ({
        runIndex: finiteNumber(run?.runNumber) ?? index + 1,
        runSeed: firstDefined([run?.seed, run?.runSeed]),
        event,
      }))
    );
  }
  const events = result?.effectEvents ?? result?.batch?.effectEvents;
  return Array.isArray(events)
    ? events.map((event) => ({
        runIndex: finiteNumber(event?.runIndex) ?? 1,
        runSeed: firstDefined([event?.runSeed, event?.seed, result?.seed]),
        event,
      }))
    : [];
}

function buildSkillProvenance(setup, config) {
  const output = {};
  for (const side of ['A', 'B']) {
    const setupRows = rowsForSide(setup, side);
    const configRows = rowsForSide(config, side);
    const rows = setupRows
      .map((setupRow, index) => {
        const configRow = configRows[index];
        const heroName = firstDefined([setupRow?.heroName, configRow?.heroName]);
        const skillIds = firstDefined([
          setupRow?.skillIds,
          configRow?.skillIds,
          configRow?.heroSkillIds,
        ]);
        if (!heroName && (!Array.isArray(skillIds) || skillIds.length === 0)) return null;
        const skills = (Array.isArray(skillIds) ? skillIds : []).map((skillId) => {
          const skill = heroName ? getBattleHeroSkill(heroName, skillId) : null;
          return skill
            ? {
                skillId: String(skillId),
                classification: skill.classification,
                confidence: skill.confidence,
                description: skill.description,
                diagnostics: skill.diagnostics,
              }
            : {
                skillId: String(skillId),
                classification: 'unknown',
                diagnostics: [{ code: 'unknown-skill' }],
              };
        });
        return {
          rowId: setupRow?.id ?? configRow?.id ?? `row-${index + 1}`,
          heroName: heroName ? String(heroName) : null,
          skillIds: (Array.isArray(skillIds) ? skillIds : []).map(String),
          skills,
        };
      })
      .filter(Boolean);
    if (rows.length > 0) output[side] = rows;
  }
  return output;
}

function equipmentOverrideProvenance(setup, config) {
  const output = {};
  for (const side of ['A', 'B']) {
    const document =
      sideValue(setup, side)?.equipmentEffectOverrides ??
      sideValue(config, side)?.equipmentEffectOverrides;
    if (!isObject(document)) continue;
    const overrides = Array.isArray(document.overrides) ? document.overrides : [];
    const diagnostics = Array.isArray(document.diagnostics) ? document.diagnostics : [];
    if (overrides.length === 0 && diagnostics.length === 0) continue;
    output[side] = {
      document,
      summary: {
        overrideCount: overrides.length,
        diagnosticCount: diagnostics.length,
      },
      diagnostics,
    };
  }
  return output;
}

function collectSkillDiagnostics(skillClassifications) {
  return Object.entries(skillClassifications).flatMap(([side, rows]) =>
    rows.flatMap((row) =>
      row.skills.flatMap((skill) =>
        (skill.diagnostics ?? []).map((diagnostic) => ({
          side,
          rowId: row.rowId,
          heroName: row.heroName,
          skillId: skill.skillId,
          ...diagnostic,
        }))
      )
    )
  );
}

function buildEffectProvenance(context, setup, selectedResult) {
  const skillClassifications = buildSkillProvenance(setup, context.config);
  const skillDiagnostics = collectSkillDiagnostics(skillClassifications);
  const specialization = {};
  const unitSources = {};
  for (const side of ['A', 'B']) {
    const setupSide = sideValue(setup, side);
    const configSide = sideValue(context.config, side);
    const capture = setupSide?.specializationCapture ?? configSide?.specializationCapture;
    const result = capture?.result;
    const revision = firstDefined([
      result?.revision,
      capture?.revision,
      capture?.snapshot?.revision,
    ]);
    const summary = firstDefined([result?.summary, capture?.summary]);
    const diagnostics = firstDefined([result?.diagnostics, capture?.diagnostics]);
    const capturedUnitSources = firstDefined([
      Array.isArray(result?.unitSources) && result.unitSources.length > 0
        ? result.unitSources
        : undefined,
      configSide?.unitSources,
    ]);
    if (
      capture &&
      (revision !== undefined ||
        nonEmpty(summary) ||
        nonEmpty(diagnostics) ||
        nonEmpty(capturedUnitSources))
    ) {
      specialization[side] = {
        revision: revision ?? null,
        summary: summary ?? {},
        diagnostics: diagnostics ?? [],
      };
    }
    if (Array.isArray(capturedUnitSources) && capturedUnitSources.length > 0) {
      unitSources[side] = capturedUnitSources;
    }
  }

  const equipmentOverrides = equipmentOverrideProvenance(setup, context.config);
  const effectEvents = collectEffectEvents(context.result, context.runMode);
  const effectDiagnostics = firstDefined([
    selectedResult?.effectDiagnostics,
    context.result?.effectDiagnostics,
  ]);
  const effectRuntimeVersion = firstDefined([
    selectedResult?.effectRuntimeVersion,
    context.result?.effectRuntimeVersion,
  ]);
  const activeEffectModelVersion = effectRuntimeVersion ? context.modelVersion : undefined;
  const hasEffects =
    nonEmpty(skillClassifications) ||
    nonEmpty(specialization) ||
    nonEmpty(unitSources) ||
    nonEmpty(equipmentOverrides) ||
    nonEmpty(effectEvents) ||
    nonEmpty(effectDiagnostics) ||
    effectRuntimeVersion !== undefined;
  if (!hasEffects) return null;

  return sanitizeForExport({
    scenarioContext: setup.scenarioContext ?? context.config?.scenarioContext ?? null,
    skillClassifications,
    skillDiagnostics,
    specialization,
    unitSources,
    equipmentOverrides,
    effectRuntimeVersion: effectRuntimeVersion ?? null,
    activeEffectModelVersion: activeEffectModelVersion ?? null,
    effectDiagnostics: effectDiagnostics ?? [],
    effectEvents: effectEvents.map(({ runIndex, runSeed, event }) => ({
      runIndex,
      runSeed: runSeed ?? null,
      ...event,
    })),
    modeling: {
      assumptions: {
        battle: context.model.assumptions,
        setup: setup.assumptions ?? null,
        heroSkills: BATTLE_HERO_SKILL_ASSUMPTIONS,
        effects:
          firstDefined([
            selectedResult?.modelingAssumptions,
            selectedResult?.effectAssumptions,
            context.result?.modelingAssumptions,
            context.result?.effectAssumptions,
          ]) ?? null,
      },
      coverage: {
        heroSkills: BATTLE_HERO_SKILL_COVERAGE,
        effects:
          firstDefined([
            selectedResult?.modelingCoverage,
            selectedResult?.effectCoverage,
            context.result?.modelingCoverage,
            context.result?.effectCoverage,
          ]) ?? null,
      },
    },
  });
}

function collectSeeds(context, selectedResult) {
  let runSeeds = Array.isArray(context.result?.runSeeds)
    ? context.result.runSeeds
    : extractRuns(context.result, context.runMode)
        .map((run) => firstDefined([run?.seed, run?.runSeed]))
        .filter((seed) => seed !== undefined && seed !== null);
  const selectedSeed = firstDefined([selectedResult?.seed, selectedResult?.runSeed]);
  if (runSeeds.length === 0 && selectedSeed !== undefined) runSeeds = [selectedSeed];
  if (runSeeds.length === 0 && context.seed !== null) runSeeds = [context.seed];
  return sanitizeForExport({ base: context.seed, runs: runSeeds });
}

function createRichContext(input = {}) {
  const context = createContext(input);
  const setup = resolveSetupSnapshot(input);
  const selectedResult = selectBattleResult(context.result, context.runMode);
  const rawCoefficients =
    firstDefined([
      selectedResult?.coefficients,
      context.result?.coefficients,
      input.coefficients,
      input.model?.coefficients,
    ]) ?? DEFAULT_BATTLE_COEFFICIENTS;
  const coefficients = normalizeBattleCoefficients(sanitizeForExport(rawCoefficients));
  const modelVersion = String(
    firstDefined([
      selectedResult?.modelVersion,
      context.result?.modelVersion,
      input.modelVersion,
      context.model.version,
    ]) ?? 'unknown'
  );
  const assumptions = sanitizeForExport(
    firstDefined([
      selectedResult?.assumptions,
      context.result?.assumptions,
      context.model.assumptions,
    ]) ?? []
  );
  const statContract = sanitizeForExport(
    firstDefined([
      selectedResult?.statContract,
      context.result?.statContract,
      context.config?.statContract,
      input.statContract,
    ]) ?? BATTLE_STAT_CONTRACT
  );
  const sourceProvenance = buildSourceProvenance(setup);
  const equipmentProvenance = buildEquipmentProvenance(setup);
  const richContext = {
    ...context,
    model: {
      ...context.model,
      version: modelVersion,
      assumptions,
    },
    setup,
    selectedResult,
    coefficients,
    modelVersion,
    statContract,
    sourceProvenance,
    equipmentProvenance,
    seeds: collectSeeds(context, selectedResult),
    perRow: buildPerRowMetrics(setup, selectedResult, context.config),
  };
  richContext.effectProvenance = buildEffectProvenance(richContext, setup, selectedResult);
  return richContext;
}

function totalFromRows(rows, field) {
  const values = rows.map((row) => finiteNumber(row?.[field]));
  return values.length > 0 && values.every((value) => value !== undefined)
    ? values.reduce((total, value) => total + value, 0)
    : null;
}

function average(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length ? finite.reduce((total, value) => total + value, 0) / finite.length : null;
}

function computedRunSummary(runs, config) {
  const outcomes = { sideA: 0, sideB: 0, draw: 0, stalemate: 0 };
  for (const run of runs) outcomes[normalizeOutcome(run)] += 1;
  return {
    outcomes,
    averageRounds: average(runs.map(roundCount)),
    averageSideASurvivors: average(runs.map((run) => sideMetric(run, config, 'A', 'survivors'))),
    averageSideBSurvivors: average(runs.map((run) => sideMetric(run, config, 'B', 'survivors'))),
    averageSideACasualties: average(runs.map((run) => sideMetric(run, config, 'A', 'casualties'))),
    averageSideBCasualties: average(runs.map((run) => sideMetric(run, config, 'B', 'casualties'))),
  };
}

function aggregateSources(result) {
  return [result, result?.summary, result?.aggregate, result?.batch].filter(isObject);
}

function summarize(context) {
  const { result, runMode, config } = context;
  const runs = extractRuns(result, runMode);
  const computed = computedRunSummary(runs, config);
  const sources = aggregateSources(result);
  const simulations = Math.max(
    0,
    Math.round(
      numberAt(sources, [
        'iterations',
        'simulations',
        'simulationCount',
        'runCount',
        'totalRuns',
      ]) ??
        runs.length ??
        0
    )
  );

  function outcomeCount(kind, paths) {
    const supplied = numberAt(sources, paths);
    if (supplied !== undefined) return Math.max(0, Math.round(supplied));
    const rate = numberAt(sources, [
      `rates.${kind}`,
      `outcomeRates.${kind}`,
      `outcomes.${kind}.rate`,
    ]);
    if (rate !== undefined && simulations) return Math.max(0, Math.round(rate * simulations));
    return computed.outcomes[kind];
  }

  const sideAWins = outcomeCount('sideA', [
    'sideAWins',
    'sideAWinCount',
    'outcomes.sideA',
    'outcomes.sideA.count',
    'outcomes.A',
    'outcomes.A.count',
    'outcomeCounts.sideA',
    'outcomeCounts.A',
    'counts.sideA',
    'winCounts.A',
  ]);
  const sideBWins = outcomeCount('sideB', [
    'sideBWins',
    'sideBWinCount',
    'outcomes.sideB',
    'outcomes.sideB.count',
    'outcomes.B',
    'outcomes.B.count',
    'outcomeCounts.sideB',
    'outcomeCounts.B',
    'counts.sideB',
    'winCounts.B',
  ]);
  const draws = outcomeCount('draw', [
    'draws',
    'drawCount',
    'outcomes.draw',
    'outcomes.draw.count',
    'outcomeCounts.draw',
    'counts.draw',
  ]);
  const stalemates = outcomeCount('stalemate', [
    'stalemates',
    'stalemateCount',
    'outcomes.stalemate',
    'outcomes.stalemate.count',
    'outcomeCounts.stalemate',
    'counts.stalemate',
  ]);

  const averagePaths = {
    averageRounds: ['averageRounds', 'avgRounds', 'averages.rounds'],
    averageSideASurvivors: [
      'averageSideASurvivors',
      'averages.sideA.survivors',
      'averages.survivors.sideA',
      'sideAverages.survivors',
      'averageTotalSurvivors.A',
    ],
    averageSideBSurvivors: [
      'averageSideBSurvivors',
      'averages.sideB.survivors',
      'averages.survivors.sideB',
      'sideBAverages.survivors',
      'averageTotalSurvivors.B',
    ],
    averageSideACasualties: [
      'averageSideACasualties',
      'averages.sideA.casualties',
      'averages.casualties.sideA',
      'sideAverages.casualties',
      'averageTotalCasualties.A',
    ],
    averageSideBCasualties: [
      'averageSideBCasualties',
      'averages.sideB.casualties',
      'averages.casualties.sideB',
      'sideBAverages.casualties',
      'averageTotalCasualties.B',
    ],
  };
  const metrics = {};
  for (const [key, paths] of Object.entries(averagePaths)) {
    metrics[key] = numberAt(sources, paths) ?? computed[key];
  }

  const divisor = simulations || 0;
  return {
    simulations,
    sideAWins,
    sideAWinRate: divisor ? sideAWins / divisor : 0,
    sideBWins,
    sideBWinRate: divisor ? sideBWins / divisor : 0,
    draws,
    drawRate: divisor ? draws / divisor : 0,
    stalemates,
    stalemateRate: divisor ? stalemates / divisor : 0,
    ...metrics,
    averageTotalSurvivors:
      metrics.averageSideASurvivors === null || metrics.averageSideBSurvivors === null
        ? null
        : metrics.averageSideASurvivors + metrics.averageSideBSurvivors,
    averageTotalCasualties:
      metrics.averageSideACasualties === null || metrics.averageSideBCasualties === null
        ? null
        : metrics.averageSideACasualties + metrics.averageSideBCasualties,
  };
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const string = String(value);
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function csvLine(values) {
  return values.map(csvCell).join(',');
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return '';
  return Number(value.toFixed(6)).toString();
}

function displayEntity(value) {
  if (!isObject(value)) return value ?? '';
  if (value.label || value.name || value.id) return value.label ?? value.name ?? value.id;
  const side = value.side ?? value.team;
  const row = value.row ?? value.rowId ?? value.position;
  return [side, row].filter((part) => part !== undefined && part !== null).join('/');
}

function eventsFromRoundLog(roundLog) {
  if (!Array.isArray(roundLog)) return [];
  const output = [];
  roundLog.forEach((roundEntry, roundIndex) => {
    const round = roundEntry?.round ?? roundEntry?.roundNumber ?? roundIndex + 1;
    const directActions = roundEntry?.actions ?? roundEntry?.events;
    if (Array.isArray(directActions)) {
      for (const event of directActions) output.push({ event, round });
      return;
    }
    const groups = roundEntry?.speedGroups ?? roundEntry?.groups;
    if (Array.isArray(groups)) {
      groups.forEach((group, groupIndex) => {
        const actionGroup = group?.group ?? group?.actionGroup ?? group?.id ?? groupIndex + 1;
        const combatSpeed = group?.combatSpeed ?? group?.speed ?? '';
        for (const event of group?.actions ?? group?.events ?? []) {
          output.push({ event, round, actionGroup, combatSpeed });
        }
      });
      return;
    }
    output.push({ event: roundEntry, round });
  });
  return output;
}

function eventsFromRun(run) {
  for (const events of [
    run?.events,
    run?.eventLog,
    run?.actionLog,
    run?.actions,
    run?.log?.events,
  ]) {
    if (Array.isArray(events)) return events.map((event) => ({ event }));
  }
  return eventsFromRoundLog(run?.roundLog ?? run?.roundsLog ?? run?.log?.rounds);
}

function eventEntries(result, runMode) {
  const runs = extractRuns(result, runMode);
  if (runs.length) {
    return runs.flatMap((run, index) =>
      eventsFromRun(run).map((entry) => ({
        ...entry,
        runIndex: finiteNumber(run?.runNumber) ?? index + 1,
        runSeed: firstDefined([run?.seed, run?.runSeed]),
      }))
    );
  }
  const logs = result?.eventLogs ?? result?.batch?.eventLogs;
  if (!Array.isArray(logs)) return [];
  if (logs.every(Array.isArray)) {
    return logs.flatMap((events, index) => events.map((event) => ({ event, runIndex: index + 1 })));
  }
  return logs.map((entry, index) => ({
    event: entry?.event ?? entry,
    runIndex: finiteNumber(entry?.runIndex) ?? index + 1,
    runSeed: firstDefined([entry?.runSeed, entry?.seed]),
  }));
}

export function buildBattleJsonExport(input = {}) {
  const context = createRichContext(input);
  const document = {
    schemaVersion: BATTLE_EXPORT_SCHEMA_VERSION,
    generatedAt: context.generatedAt,
    model: context.model,
    modelVersion: context.modelVersion,
    statContract: context.statContract,
    coefficients: context.coefficients,
    setup: context.setup,
    sourceProvenance: context.sourceProvenance,
    equipmentProvenance: context.equipmentProvenance,
    config: context.config,
    runMode: context.runMode,
    seed: context.seed,
    seeds: context.seeds,
    variance: context.variance,
    perRow: context.perRow,
    results: sanitizeForExport(context.result),
  };
  if (context.effectProvenance) document.effectProvenance = context.effectProvenance;
  return JSON.stringify(sanitizeDocument(document), null, 2);
}

export function parseBattleJsonExport(jsonText) {
  if (typeof jsonText !== 'string') {
    throw new TypeError('Battle export JSON must be provided as text.');
  }
  if (jsonText.length > MAX_BATTLE_EXPORT_JSON_LENGTH) {
    throw new RangeError('Battle export JSON exceeds the maximum supported size.');
  }
  let document;
  try {
    document = JSON.parse(jsonText);
  } catch (error) {
    throw new TypeError(`Battle export JSON is invalid: ${error.message}`);
  }
  if (!isObject(document)) throw new TypeError('Battle export JSON must contain an object.');
  if (
    ![PREVIOUS_BATTLE_EXPORT_SCHEMA_VERSION, BATTLE_EXPORT_SCHEMA_VERSION].includes(
      document.schemaVersion
    )
  ) {
    throw new RangeError(
      `Unsupported battle export schema version "${String(document.schemaVersion)}".`
    );
  }
  const migrated = sanitizeForExport(document);
  migrated.schemaVersion = BATTLE_EXPORT_SCHEMA_VERSION;
  return migrated;
}

export function buildBattleSummaryCsv(input = {}) {
  const context = createRichContext(input);
  const summary = summarize(context);
  const row = [
    BATTLE_EXPORT_SCHEMA_VERSION,
    context.generatedAt,
    context.model.version,
    context.runMode,
    isObject(context.seed) || Array.isArray(context.seed) ? stableJson(context.seed) : context.seed,
    isObject(context.variance) || Array.isArray(context.variance)
      ? stableJson(context.variance)
      : context.variance,
    summary.simulations,
    summary.sideAWins,
    formatNumber(summary.sideAWinRate),
    summary.sideBWins,
    formatNumber(summary.sideBWinRate),
    summary.draws,
    formatNumber(summary.drawRate),
    summary.stalemates,
    formatNumber(summary.stalemateRate),
    formatNumber(summary.averageRounds),
    formatNumber(summary.averageSideASurvivors),
    formatNumber(summary.averageSideBSurvivors),
    formatNumber(summary.averageTotalSurvivors),
    formatNumber(summary.averageSideACasualties),
    formatNumber(summary.averageSideBCasualties),
    formatNumber(summary.averageTotalCasualties),
    stableJson(context.config),
    stableJson(context.statContract),
    stableJson(context.sourceProvenance),
    stableJson(context.equipmentProvenance),
  ];
  const columns = context.effectProvenance ? EFFECT_SUMMARY_CSV_COLUMNS : SUMMARY_CSV_COLUMNS;
  if (context.effectProvenance) row.push(stableJson(context.effectProvenance));
  return `${csvLine(columns)}\n${csvLine(row)}`;
}

export function buildBattleEventLogCsv(input = {}) {
  const context = createContext(input);
  const actionRows = eventEntries(context.result, context.runMode).map(
    ({ event = {}, runIndex, runSeed, round, actionGroup, combatSpeed }) => [
      runIndex,
      event.runSeed ?? event.seed ?? runSeed ?? '',
      event.round ?? event.roundNumber ?? round ?? '',
      event.group ?? event.actionGroup ?? event.groupOrdinal ?? actionGroup ?? '',
      event.actorCombatSpeed ?? event.combatSpeed ?? combatSpeed ?? '',
      displayEntity(
        event.attacker ??
          event.source ??
          (event.attackerSide
            ? {
                side: event.attackerSide,
                row: event.attackerRowLabel ?? event.attackerRowId,
              }
            : '')
      ),
      displayEntity(
        event.target ??
          event.defender ??
          (event.defenderSide
            ? {
                side: event.defenderSide,
                row: event.targetRowLabel ?? event.targetRowId,
              }
            : '')
      ),
      event.targetTroopsBefore ?? event.troopsBefore ?? event.before ?? '',
      event.casualties ?? event.losses ?? '',
      event.targetTroopsAfter ?? event.troopsAfter ?? event.after ?? '',
      event.strikeMultiplier ?? '',
      event.casualtyRate ?? '',
      event.status ??
        (event.targetEliminated || event.eliminated || event.targetTroopsAfter === 0
          ? 'eliminated'
          : 'resolved'),
    ]
  );
  const effectEntries = collectEffectEvents(context.result, context.runMode);
  if (effectEntries.length === 0) {
    return [csvLine(EVENT_CSV_COLUMNS), ...actionRows.map(csvLine)].join('\n');
  }
  const padAction = (row) => [
    ...row,
    'action',
    ...Array(EFFECT_EVENT_CSV_COLUMNS.length - row.length - 1).fill(''),
  ];
  const effectRows = effectEntries.map(({ event = {}, runIndex, runSeed }) => [
    runIndex,
    event.runSeed ?? event.seed ?? runSeed ?? '',
    event.battleRound ?? event.round ?? '',
    event.group ?? event.actionGroup ?? '',
    '',
    displayEntity(event.source),
    displayEntity(event.target),
    event.before ?? '',
    event.type === 'damage' || event.type === 'dot-tick' ? (event.amount ?? '') : '',
    event.after ?? '',
    '',
    '',
    event.skipped ? 'skipped' : 'resolved',
    'effect',
    event.phase ?? '',
    event.effectId ?? event.id ?? '',
    displayEntity(event.source),
    displayEntity(event.target),
    event.type ?? '',
    stableJson(
      Object.fromEntries(
        ['amount', 'before', 'after', 'removed', 'stacks', 'stat']
          .filter((key) => event[key] !== undefined)
          .map((key) => [key, event[key]])
      )
    ),
    event.status ?? '',
    isObject(event.diagnostic) || Array.isArray(event.diagnostic)
      ? stableJson(event.diagnostic)
      : (event.diagnostic ?? event.skipped ?? ''),
  ]);
  return [
    csvLine(EFFECT_EVENT_CSV_COLUMNS),
    ...actionRows.map((row) => csvLine(padAction(row))),
    ...effectRows.map(csvLine),
  ].join('\n');
}

function percent(value) {
  return `${formatNumber(value * 100)}%`;
}

function textNumber(value) {
  return Number.isFinite(value) ? formatNumber(value) : 'n/a';
}

export function buildBattleDebugSnapshot(input = {}) {
  const context = createRichContext(input);
  const summary = summarize(context);
  const assumptions = Array.isArray(context.model.assumptions)
    ? context.model.assumptions.length
      ? context.model.assumptions.map((assumption) => String(assumption)).join(' | ')
      : 'None recorded'
    : isObject(context.model.assumptions)
      ? stableJson(context.model.assumptions)
      : String(context.model.assumptions || 'None recorded');
  const seed = context.seed === null ? 'none' : stableJson(context.seed);
  const variance = context.variance === null ? 'none' : stableJson(context.variance);
  const lines = [
    'Battle Simulator debug snapshot',
    `Generated: ${context.generatedAt}`,
    `Schema / model: ${BATTLE_EXPORT_SCHEMA_VERSION} / ${context.modelVersion}`,
    `Run: ${context.runMode} · ${summary.simulations} simulation${summary.simulations === 1 ? '' : 's'} · seed ${seed} · variance ${variance}`,
    `Outcomes: Side A ${summary.sideAWins} (${percent(summary.sideAWinRate)}) · Side B ${summary.sideBWins} (${percent(summary.sideBWinRate)}) · Draw ${summary.draws} (${percent(summary.drawRate)}) · Stalemate ${summary.stalemates} (${percent(summary.stalemateRate)})`,
    `Averages: ${textNumber(summary.averageRounds)} rounds · survivors A/B ${textNumber(summary.averageSideASurvivors)}/${textNumber(summary.averageSideBSurvivors)} · casualties A/B ${textNumber(summary.averageSideACasualties)}/${textNumber(summary.averageSideBCasualties)}`,
    `Assumptions: ${assumptions}`,
    `Stat contract: ${stableJson(context.statContract)}`,
    `Coefficients: ${stableJson(context.coefficients)}`,
    `Source provenance: ${stableJson(context.sourceProvenance)}`,
    `Equipment provenance: ${stableJson(context.equipmentProvenance)}`,
    `Seeds: ${stableJson(context.seeds)}`,
    `Per-row results: ${stableJson(context.perRow)}`,
    `Setup: ${stableJson(context.setup)}`,
    `Config: ${stableJson(context.config)}`,
  ];
  if (context.effectProvenance) {
    lines.push(`Effect provenance: ${stableJson(context.effectProvenance)}`);
  }
  return lines.join('\n');
}

export function buildBattleCalibrationFixture(input = {}) {
  const context = createRichContext(input);
  const result = context.selectedResult;
  const survivorA =
    numberAt([result], ['survivors.A', 'survivors.sideA']) ??
    sideMetric(result, context.config, 'A', 'survivors') ??
    totalFromRows(context.perRow.A, 'survivingTroops');
  const survivorB =
    numberAt([result], ['survivors.B', 'survivors.sideB']) ??
    sideMetric(result, context.config, 'B', 'survivors') ??
    totalFromRows(context.perRow.B, 'survivingTroops');
  const document = {
    fixtureVersion: 2,
    battleType: 'pvp-field',
    battleMode: context.setup.battleMode,
    createdAt: context.generatedAt,
    statContract: context.statContract,
    sourceProvenance: context.sourceProvenance,
    equipmentProvenance: context.equipmentProvenance,
    setup: context.setup,
    simulated: {
      modelVersion: context.modelVersion,
      coefficients: context.coefficients,
      seed: firstDefined([result?.seed, result?.runSeed, context.seed]) ?? null,
      strikeVariancePct:
        firstDefined([
          finiteNumber(result?.strikeVariancePct),
          finiteNumber(context.result?.strikeVariancePct),
          finiteNumber(context.result?.batch?.strikeVariancePct),
          finiteNumber(context.variance),
          context.setup.runOptions.strikeVariancePct,
        ]) ?? 0,
      winner: firstDefined([result?.winner, result?.outcome]) ?? null,
      rounds: roundCount(result) ?? null,
      perRowCasualties: {
        A: context.perRow.A.map((row) => row.casualties),
        B: context.perRow.B.map((row) => row.casualties),
      },
      survivors: { A: survivorA, B: survivorB },
    },
    observed: {
      winner: null,
      rounds: null,
      perRowCasualties: {
        A: [null, null, null],
        B: [null, null, null],
      },
      notes: '',
    },
    provenance: {
      submitter: '',
      reportDate: null,
      evidenceKind: 'unverified-game-report',
    },
  };
  return JSON.stringify(sanitizeDocument(document), null, 2);
}

export function makeBattleExportFilename({
  kind = 'full',
  mode = 'single',
  extension,
  generatedAt,
} = {}) {
  const kindMap = {
    full: ['full', 'json'],
    json: ['full', 'json'],
    summary: ['summary', 'csv'],
    events: ['event-log', 'csv'],
    'event-log': ['event-log', 'csv'],
    debug: ['debug', 'txt'],
    text: ['debug', 'txt'],
    calibration: ['calibration', 'json'],
  };
  const normalizedKind = String(kind).toLowerCase();
  const [label, defaultExtension] = kindMap[normalizedKind] ?? [normalizedKind, 'txt'];
  const safePart = (value, fallback) =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || fallback;
  const stamp = normalizeGeneratedAt(generatedAt).replace(/[:.]/g, '-');
  if (normalizedKind === 'calibration') return `battle-fixture-${stamp}.json`;
  const safeExtension = safePart(String(extension ?? defaultExtension).replace(/^\./, ''), 'txt');
  return `vts-battle-simulator-${safePart(label, 'export')}-${safePart(mode, 'single')}-${stamp}.${safeExtension}`;
}

export const __testing__ = Object.freeze({
  sanitizeForExport,
  summarize: (input) => summarize(createContext(input)),
});
