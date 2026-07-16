import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { DEFAULT_BATTLE_COEFFICIENTS } from '../../js/battle-simulator-coefficients.js';
import {
  parseSetupSnapshot,
  setupSnapshotToEngineConfig,
} from '../../js/battle-simulator-setup.js';

const DEFAULT_FIXTURE_DIRECTORY = 'tests/fixtures/battle-reports';
const FIXTURE_VERSION = 1;
const SUPPORTED_BATTLE_MODE = 'pvp-field';
const SIDE_IDS = Object.freeze(['A', 'B']);
const OBSERVED_WINNERS = Object.freeze(['A', 'B', 'draw']);
const COEFFICIENT_KEYS = Object.freeze(Object.keys(DEFAULT_BATTLE_COEFFICIENTS));

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

function canonicalizeCoefficients(value) {
  if (!isRecord(value)) return undefined;
  return Object.fromEntries(
    COEFFICIENT_KEYS.filter((key) => Object.hasOwn(value, key)).map((key) => [key, value[key]])
  );
}

function canonicalizeSimulated(value) {
  if (!isRecord(value)) return {};
  const survivors = isRecord(value.survivors)
    ? { A: value.survivors.A, B: value.survivors.B }
    : undefined;
  return {
    modelVersion: value.modelVersion,
    coefficients: canonicalizeCoefficients(value.coefficients),
    seed: value.seed,
    winner: value.winner,
    rounds: value.rounds,
    perRowCasualties: canonicalizePerRowCasualties(value.perRowCasualties),
    survivors,
  };
}

function canonicalizeProvenance(value) {
  if (!isRecord(value)) return { submitter: '', reportDate: null };
  return {
    submitter: typeof value.submitter === 'string' ? value.submitter : '',
    reportDate:
      typeof value.reportDate === 'string' || value.reportDate === null ? value.reportDate : null,
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
  if (!isRecord(fixture) || fixture.fixtureVersion !== FIXTURE_VERSION) return null;
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

  if (fixture.fixtureVersion !== FIXTURE_VERSION) {
    fail(
      displayName,
      `fixtureVersion must be ${FIXTURE_VERSION}; received ${String(fixture.fixtureVersion)}.`,
      RangeError
    );
  }

  if (Object.hasOwn(fixture, 'battleMode') && typeof fixture.battleMode !== 'string') {
    fail(displayName, 'battleMode must be a string when present.');
  }

  const setup = canonicalizeSetup(fixture.setup, displayName);
  const engineConfig = canonicalizeEngineConfig(setup, displayName);
  const battleMode = Object.hasOwn(fixture, 'battleMode') ? fixture.battleMode : setup.battleMode;
  const observed = requireRecord(fixture.observed, displayName, 'observed');
  const winner = validateWinner(observed.winner, displayName);
  const perRowCasualties = canonicalizeObservedCasualties(
    observed.perRowCasualties,
    winner,
    setup,
    displayName
  );

  return {
    fixtureVersion: FIXTURE_VERSION,
    battleType: typeof fixture.battleType === 'string' ? fixture.battleType : SUPPORTED_BATTLE_MODE,
    battleMode,
    createdAt: typeof fixture.createdAt === 'string' ? fixture.createdAt : null,
    setup,
    engineConfig,
    simulated: canonicalizeSimulated(fixture.simulated),
    observed: {
      winner,
      rounds: observed.rounds ?? null,
      perRowCasualties,
      notes: typeof observed.notes === 'string' ? observed.notes : '',
    },
    provenance: canonicalizeProvenance(fixture.provenance),
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
    const reason = skipReason(fixture);
    if (reason) {
      console.warn(`[battle-sim] Skipping ${filename}: ${reason}.`);
      skippedFiles.push(filename);
      continue;
    }
    fixtures.push(fixture);
  }

  return { fixtures, skippedFiles };
}

/**
 * Load the validated, usable fixture array expected by calibration consumers.
 */
export async function loadFixtures(dir = DEFAULT_FIXTURE_DIRECTORY) {
  return (await loadFixtureCorpus(dir)).fixtures;
}
