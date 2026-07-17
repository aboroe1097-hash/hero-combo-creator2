import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  DEFAULT_BATTLE_COEFFICIENTS,
  normalizeBattleCoefficients,
} from '../../js/battle-simulator-coefficients.js';
import { BATTLE_STAT_CONTRACT } from '../../js/battle-simulator-data.js';
import {
  parseSetupSnapshot,
  setupSnapshotToEngineConfig,
} from '../../js/battle-simulator-setup.js';

const DEFAULT_FIXTURE_DIRECTORY = 'tests/fixtures/battle-reports';
export const LEGACY_FIXTURE_VERSION = 1;
export const FIXTURE_VERSION = 2;
const SUPPORTED_FIXTURE_VERSIONS = Object.freeze([LEGACY_FIXTURE_VERSION, FIXTURE_VERSION]);
const SUPPORTED_BATTLE_MODE = 'pvp-field';
const SIDE_IDS = Object.freeze(['A', 'B']);
const OBSERVED_WINNERS = Object.freeze(['A', 'B', 'draw']);
const V2_EVIDENCE_KINDS = Object.freeze([
  'synthetic-regression',
  'observed-game-report',
  'unverified-game-report',
]);
const COEFFICIENT_KEYS = Object.freeze(Object.keys(DEFAULT_BATTLE_COEFFICIENTS));
const UINT32_MAX = 0xffffffff;
const MAX_STRIKE_VARIANCE_PCT = 100;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fail(filename, message, ErrorType = TypeError) {
  throw new ErrorType(`${filename}: ${message}`);
}

function requireRecord(value, filename, label) {
  if (!isRecord(value)) fail(filename, `${label} must be an object.`);
  return value;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value)
    .sort(compareNames)
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(',')}}`;
}

function canonicalizeSetup(value, filename) {
  try {
    return parseSetupSnapshot(JSON.stringify(value));
  } catch (error) {
    fail(filename, `invalid setup: ${error.message}`);
  }
}

function canonicalizeEngineConfig(setup, filename) {
  try {
    return setupSnapshotToEngineConfig(setup);
  } catch (error) {
    fail(filename, `invalid setup: ${error.message}`);
  }
}

function validateWinner(value, filename) {
  if (value !== null && !OBSERVED_WINNERS.includes(value)) {
    fail(filename, 'observed.winner must be "A", "B", "draw", or null.');
  }
  return value;
}

function requireCasualtyArray(value, filename, sideId) {
  if (!Array.isArray(value) || value.length !== 3) {
    fail(filename, `observed.perRowCasualties.${sideId} must be an array of exactly three values.`);
  }
  return value;
}

function canonicalizeObservedCasualties(rawCasualties, winner, setup, filename) {
  const casualties = requireRecord(rawCasualties, filename, 'observed.perRowCasualties');
  const bySide = Object.fromEntries(
    SIDE_IDS.map((sideId) => [sideId, requireCasualtyArray(casualties[sideId], filename, sideId)])
  );
  const values = SIDE_IDS.flatMap((sideId) => bySide[sideId]);
  const hasNull = values.some((value) => value === null);
  const allNull = values.every((value) => value === null);

  if (hasNull) {
    if (winner !== null || !allNull) {
      fail(
        filename,
        'observed per-row casualties may be null only when winner is null and all six values are null.'
      );
    }
    return { A: [null, null, null], B: [null, null, null] };
  }

  return Object.fromEntries(
    SIDE_IDS.map((sideId) => [
      sideId,
      bySide[sideId].map((value, index) => {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
          fail(
            filename,
            `observed.perRowCasualties.${sideId}[${index}] must be a finite non-negative number.`
          );
        }
        const troops = setup.sides[sideId].rows[index].troops;
        if (value > troops) {
          fail(
            filename,
            `observed.perRowCasualties.${sideId}[${index}] (${value}) exceeds that row's ${troops} troops.`,
            RangeError
          );
        }
        return value;
      }),
    ])
  );
}

function copyArray(value) {
  return Array.isArray(value) ? [...value] : undefined;
}

function canonicalizePerRowCasualties(value) {
  if (!isRecord(value)) return undefined;
  return {
    A: copyArray(value.A),
    B: copyArray(value.B),
  };
}

function canonicalizeCoefficients(value, filename, required) {
  if (value === undefined && !required) return undefined;
  const coefficients = requireRecord(value, filename, 'simulated.coefficients');
  const missingKeys = COEFFICIENT_KEYS.filter((key) => !Object.hasOwn(coefficients, key));
  if (required && missingKeys.length > 0) {
    fail(
      filename,
      `simulated.coefficients is missing required coefficient${missingKeys.length === 1 ? '' : 's'}: ${missingKeys.join(', ')}.`
    );
  }
  const knownCoefficients = Object.fromEntries(
    COEFFICIENT_KEYS.filter((key) => Object.hasOwn(coefficients, key)).map((key) => [
      key,
      coefficients[key],
    ])
  );
  try {
    return { ...normalizeBattleCoefficients(knownCoefficients) };
  } catch (error) {
    fail(filename, `invalid simulated.coefficients: ${error.message}`, error.constructor);
  }
}

function canonicalizeSeed(value, filename, required) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    fail(filename, 'simulated.seed must be a safe integer.');
  }
  if (value < 0 || value > UINT32_MAX) {
    fail(filename, `simulated.seed must be between 0 and ${UINT32_MAX}.`, RangeError);
  }
  return value;
}

function canonicalizeStrikeVariance(value, filename, required) {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(filename, 'simulated.strikeVariancePct must be a finite number.');
  }
  if (value < 0 || value > MAX_STRIKE_VARIANCE_PCT) {
    fail(
      filename,
      `simulated.strikeVariancePct must be between 0 and ${MAX_STRIKE_VARIANCE_PCT}.`,
      RangeError
    );
  }
  return value;
}

function canonicalizeSimulated(value, filename, isLegacy) {
  if (value === undefined && isLegacy) return {};
  const simulated = requireRecord(value, filename, 'simulated');
  const requiresReplayContract = !isLegacy;
  const survivors = isRecord(simulated.survivors)
    ? { A: simulated.survivors.A, B: simulated.survivors.B }
    : undefined;
  return {
    modelVersion: simulated.modelVersion,
    coefficients: canonicalizeCoefficients(
      simulated.coefficients,
      filename,
      requiresReplayContract
    ),
    seed: canonicalizeSeed(simulated.seed, filename, requiresReplayContract),
    strikeVariancePct: canonicalizeStrikeVariance(
      simulated.strikeVariancePct,
      filename,
      requiresReplayContract
    ),
    winner: simulated.winner,
    rounds: simulated.rounds,
    perRowCasualties: canonicalizePerRowCasualties(simulated.perRowCasualties),
    survivors,
  };
}

function canonicalizeStatContract(value, filename) {
  const contract = requireRecord(value, filename, 'statContract');
  if (!Array.isArray(contract.unitKeys)) fail(filename, 'statContract.unitKeys must be an array.');
  if (!Array.isArray(contract.battleKeys)) {
    fail(filename, 'statContract.battleKeys must be an array.');
  }
  const multiplierBaselines = requireRecord(
    contract.multiplierBaselines,
    filename,
    'statContract.multiplierBaselines'
  );
  const derivation = requireRecord(contract.derivation, filename, 'statContract.derivation');
  return {
    version: contract.version,
    unitKeys: BATTLE_STAT_CONTRACT.unitKeys.filter((key) => contract.unitKeys.includes(key)),
    battleKeys: BATTLE_STAT_CONTRACT.battleKeys.filter((key) => contract.battleKeys.includes(key)),
    multiplierBaselines: Object.fromEntries(
      Object.keys(BATTLE_STAT_CONTRACT.multiplierBaselines).map((key) => [
        key,
        multiplierBaselines[key],
      ])
    ),
    derivation: Object.fromEntries(
      Object.keys(BATTLE_STAT_CONTRACT.derivation).map((key) => [key, derivation[key]])
    ),
  };
}

function canonicalizeDuplicatedSideField(value, setup, filename, field, label) {
  const duplicated = requireRecord(value, filename, label);
  for (const sideId of SIDE_IDS) {
    if (!Object.hasOwn(duplicated, sideId)) fail(filename, `${label}.${sideId} is required.`);
  }
  const candidate = {
    ...setup,
    sides: Object.fromEntries(
      SIDE_IDS.map((sideId) => [
        sideId,
        {
          ...setup.sides[sideId],
          [field]: duplicated[sideId],
        },
      ])
    ),
  };
  let normalized;
  try {
    normalized = canonicalizeSetup(candidate, filename);
  } catch (error) {
    fail(filename, `${label} must match the corresponding setup field.`, error.constructor);
  }
  return Object.fromEntries(SIDE_IDS.map((sideId) => [sideId, normalized.sides[sideId][field]]));
}

function canonicalizeProvenance(value, filename, isLegacy) {
  if (!isRecord(value)) {
    if (!isLegacy) fail(filename, 'provenance must be an object for fixtureVersion 2.');
    return { submitter: '', reportDate: null, evidenceKind: 'legacy-phase1-archive' };
  }
  const evidenceKind = isLegacy ? 'legacy-phase1-archive' : value.evidenceKind;
  if (!isLegacy && !V2_EVIDENCE_KINDS.includes(evidenceKind)) {
    fail(filename, `provenance.evidenceKind must be one of: ${V2_EVIDENCE_KINDS.join(', ')}.`);
  }
  return {
    submitter: typeof value.submitter === 'string' ? value.submitter : '',
    reportDate:
      typeof value.reportDate === 'string' || value.reportDate === null ? value.reportDate : null,
    evidenceKind,
  };
}

function compareNames(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function skipReason(fixture) {
  if (fixture.battleMode !== SUPPORTED_BATTLE_MODE) {
    return `battle mode "${fixture.battleMode}" is not supported by this PvP-field harness`;
  }
  if (fixture.observed.winner === null) return 'observed results are unfilled';
  return null;
}

function unsupportedRawBattleMode(fixture) {
  if (!isRecord(fixture) || !SUPPORTED_FIXTURE_VERSIONS.includes(fixture.fixtureVersion)) {
    return null;
  }
  if (Object.hasOwn(fixture, 'battleMode') && typeof fixture.battleMode !== 'string') {
    return null;
  }
  if (
    isRecord(fixture.setup) &&
    Object.hasOwn(fixture.setup, 'battleMode') &&
    typeof fixture.setup.battleMode !== 'string'
  ) {
    return null;
  }
  const declaredModes = [];
  if (typeof fixture.battleMode === 'string') {
    declaredModes.push(fixture.battleMode);
  }
  if (isRecord(fixture.setup) && typeof fixture.setup.battleMode === 'string') {
    declaredModes.push(fixture.setup.battleMode);
  }
  return declaredModes.find((mode) => mode !== SUPPORTED_BATTLE_MODE) ?? null;
}

/**
 * Validate and canonicalize one calibration fixture.
 * Unknown keys are intentionally omitted from the returned object.
 */
export function validateFixture(obj, filename) {
  const displayName = String(filename || '<fixture>');
  const fixture = requireRecord(obj, displayName, 'fixture');

  if (!SUPPORTED_FIXTURE_VERSIONS.includes(fixture.fixtureVersion)) {
    fail(
      displayName,
      `fixtureVersion must be ${LEGACY_FIXTURE_VERSION} or ${FIXTURE_VERSION}; received ${String(fixture.fixtureVersion)}.`,
      RangeError
    );
  }
  const isLegacy = fixture.fixtureVersion === LEGACY_FIXTURE_VERSION;

  if (Object.hasOwn(fixture, 'battleMode') && typeof fixture.battleMode !== 'string') {
    fail(displayName, 'battleMode must be a string when present.');
  }

  const setup = canonicalizeSetup(fixture.setup, displayName);
  if (!isLegacy && fixture.setup?.setupSchemaVersion !== 2) {
    fail(displayName, 'fixtureVersion 2 requires setupSchemaVersion 2.', RangeError);
  }
  const engineConfig = canonicalizeEngineConfig(setup, displayName);
  const battleMode = Object.hasOwn(fixture, 'battleMode') ? fixture.battleMode : setup.battleMode;
  if (!isLegacy && battleMode !== setup.battleMode) {
    fail(displayName, 'battleMode must match setup.battleMode for fixtureVersion 2.');
  }
  if (!isLegacy && fixture.battleType !== SUPPORTED_BATTLE_MODE) {
    fail(displayName, `battleType must be "${SUPPORTED_BATTLE_MODE}" for fixtureVersion 2.`);
  }
  const sourceProvenance = Object.fromEntries(
    SIDE_IDS.map((sideId) => [sideId, setup.sides[sideId].capturedSourceSnapshot])
  );
  const equipmentProvenance = Object.fromEntries(
    SIDE_IDS.map((sideId) => [sideId, setup.sides[sideId].equipmentLoadout])
  );
  if (!isLegacy) {
    const suppliedStatContract = canonicalizeStatContract(fixture.statContract, displayName);
    const suppliedSourceProvenance = canonicalizeDuplicatedSideField(
      fixture.sourceProvenance,
      setup,
      displayName,
      'capturedSourceSnapshot',
      'sourceProvenance'
    );
    const suppliedEquipmentProvenance = canonicalizeDuplicatedSideField(
      fixture.equipmentProvenance,
      setup,
      displayName,
      'equipmentLoadout',
      'equipmentProvenance'
    );
    if (stableJson(suppliedStatContract) !== stableJson(BATTLE_STAT_CONTRACT)) {
      fail(displayName, 'statContract must match the current battle stat contract.');
    }
    if (stableJson(suppliedSourceProvenance) !== stableJson(sourceProvenance)) {
      fail(displayName, 'sourceProvenance must match the captured setup sources.');
    }
    if (stableJson(suppliedEquipmentProvenance) !== stableJson(equipmentProvenance)) {
      fail(displayName, 'equipmentProvenance must match the captured setup equipment.');
    }
  }
  const observed = requireRecord(fixture.observed, displayName, 'observed');
  const winner = validateWinner(observed.winner, displayName);
  const perRowCasualties = canonicalizeObservedCasualties(
    observed.perRowCasualties,
    winner,
    setup,
    displayName
  );
  const provenance = canonicalizeProvenance(fixture.provenance, displayName, isLegacy);

  return {
    fixtureVersion: fixture.fixtureVersion,
    evidenceStatus: provenance.evidenceKind,
    isLegacy,
    battleType: typeof fixture.battleType === 'string' ? fixture.battleType : SUPPORTED_BATTLE_MODE,
    battleMode,
    createdAt: typeof fixture.createdAt === 'string' ? fixture.createdAt : null,
    statContract: isLegacy ? null : BATTLE_STAT_CONTRACT,
    sourceProvenance: isLegacy ? null : sourceProvenance,
    equipmentProvenance: isLegacy ? null : equipmentProvenance,
    setup,
    engineConfig,
    simulated: canonicalizeSimulated(fixture.simulated, displayName, isLegacy),
    observed: {
      winner,
      rounds: observed.rounds ?? null,
      perRowCasualties,
      notes: typeof observed.notes === 'string' ? observed.notes : '',
    },
    provenance,
    filename: displayName,
  };
}

/**
 * Load all usable PvP-field fixtures and report files skipped by design.
 */
export async function loadFixtureCorpus(dir = DEFAULT_FIXTURE_DIRECTORY) {
  const entries = (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .sort((left, right) => compareNames(left.name, right.name));
  const fixtures = [];
  const skippedFiles = [];
  const archivedFiles = [];

  for (const entry of entries) {
    const filename = entry.name;
    let source;
    try {
      source = await readFile(join(dir, filename), 'utf8');
    } catch (error) {
      fail(filename, `could not read fixture: ${error.message}`);
    }

    let rawFixture;
    try {
      rawFixture = JSON.parse(source);
    } catch (error) {
      fail(filename, `invalid JSON: ${error.message}`, SyntaxError);
    }

    const unsupportedMode = unsupportedRawBattleMode(rawFixture);
    if (unsupportedMode) {
      console.warn(
        `[battle-sim] Skipping ${filename}: battle mode "${unsupportedMode}" is not supported by this PvP-field harness.`
      );
      skippedFiles.push(filename);
      continue;
    }

    const fixture = validateFixture(rawFixture, filename);
    if (fixture.isLegacy) {
      archivedFiles.push(filename);
      skippedFiles.push(filename);
      continue;
    }
    const reason = skipReason(fixture);
    if (reason) {
      console.warn(`[battle-sim] Skipping ${filename}: ${reason}.`);
      skippedFiles.push(filename);
      continue;
    }
    fixtures.push(fixture);
  }

  return { fixtures, skippedFiles, archivedFiles };
}

/**
 * Load the validated, usable fixture array expected by calibration consumers.
 */
export async function loadFixtures(dir = DEFAULT_FIXTURE_DIRECTORY) {
  return (await loadFixtureCorpus(dir)).fixtures;
}

/** Load deterministic v2 replay fixtures, including labeled synthetic regressions. */
export async function loadReplayFixtures(dir = DEFAULT_FIXTURE_DIRECTORY) {
  return loadFixtures(dir);
}

/** Load only independently supplied game reports eligible for coefficient fitting. */
export async function loadCalibrationFixtureCorpus(dir = DEFAULT_FIXTURE_DIRECTORY) {
  const corpus = await loadFixtureCorpus(dir);
  const fixtures = corpus.fixtures.filter(
    (fixture) => fixture.provenance.evidenceKind === 'observed-game-report'
  );
  const replayOnlyFiles = corpus.fixtures
    .filter((fixture) => fixture.provenance.evidenceKind !== 'observed-game-report')
    .map((fixture) => fixture.filename);
  return {
    fixtures,
    skippedFiles: [...corpus.skippedFiles, ...replayOnlyFiles],
    archivedFiles: corpus.archivedFiles,
    replayOnlyFiles,
  };
}

export async function loadCalibrationFixtures(dir = DEFAULT_FIXTURE_DIRECTORY) {
  return (await loadCalibrationFixtureCorpus(dir)).fixtures;
}
