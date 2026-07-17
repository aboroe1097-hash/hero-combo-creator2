import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { DEFAULT_BATTLE_COEFFICIENTS } from '../../js/battle-simulator-coefficients.js';
import {
  CALIBRATION_REPORT_PATH,
  coarseSearch,
  fitCoefficients,
  logSpacedValues,
  nelderMeadSearch,
  runCalibration,
  splitFixtures,
  writeCalibrationArtifacts,
} from '../../scripts/battle-sim/calibrate.mjs';
import {
  loadCalibrationFixtureCorpus,
  loadFixtureCorpus,
  loadFixtures,
  validateFixture,
} from '../../scripts/battle-sim/fixtures.mjs';
import {
  casualtySmape,
  corpusLoss,
  corpusMetrics,
  fixtureLoss,
  median,
  simulateFixture,
} from '../../scripts/battle-sim/metrics.mjs';

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(TEST_DIRECTORY, '..', '..');
const FIXTURE_DIRECTORY = join(REPOSITORY_ROOT, 'tests', 'fixtures', 'battle-reports');
const SYNTHETIC_FILENAME = /^v2-synthetic-\d{2}\.json$/;
const LEGACY_SYNTHETIC_FILENAME = /^synthetic-\d{2}\.json$/;

function syntheticFixtureFiles() {
  return readdirSync(FIXTURE_DIRECTORY)
    .filter((filename) => SYNTHETIC_FILENAME.test(filename))
    .sort();
}

function readRawSyntheticFixture() {
  const [filename] = syntheticFixtureFiles();
  assert.ok(filename, 'at least one generated synthetic fixture must exist');
  return JSON.parse(readFileSync(join(FIXTURE_DIRECTORY, filename), 'utf8'));
}

function readRawLegacySyntheticFixture() {
  const filename = readdirSync(FIXTURE_DIRECTORY)
    .filter((entry) => LEGACY_SYNTHETIC_FILENAME.test(entry))
    .sort()[0];
  assert.ok(filename, 'at least one archived phase-1 fixture must exist');
  return JSON.parse(readFileSync(join(FIXTURE_DIRECTORY, filename), 'utf8'));
}

function validatedSyntheticFixture(filename = 'synthetic-test.json') {
  return validateFixture(readRawSyntheticFixture(), filename);
}

function oppositeWinner(winner) {
  if (winner === 'A') return 'B';
  return 'A';
}

function assertClose(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function captureWarnings(callback) {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...parts) => warnings.push(parts.map(String).join(' '));
  try {
    return { result: await callback(), warnings };
  } finally {
    console.warn = originalWarn;
  }
}

test('casualtySmape handles zeroes, symmetry, and the full [0, 2] range', () => {
  assert.equal(casualtySmape(0, 0), 0);
  assert.equal(casualtySmape(10, 10), 0);
  assert.equal(casualtySmape(10, 0), 2);
  assert.equal(casualtySmape(0, 10), 2);
  assertClose(casualtySmape(50, 100), 2 / 3);
  assertClose(casualtySmape(100, 50), 2 / 3);

  for (const [predicted, observed] of [
    [1, 9],
    [25, 100],
    [-5, 8],
    [1e300, 1e-300],
  ]) {
    const value = casualtySmape(predicted, observed);
    assert.ok(value >= 0 && value <= 2);
    assertClose(value, casualtySmape(observed, predicted));
  }
});

test('fixtureLoss is median casualty sMAPE plus an exact wrong-winner penalty', () => {
  const fixture = validatedSyntheticFixture('loss-baseline.json');
  const coefficients = fixture.simulated.coefficients;
  const predicted = simulateFixture(fixture, coefficients);

  assert.deepEqual(
    simulateFixture(fixture, coefficients),
    predicted,
    'simulation is deterministic'
  );
  assert.equal(fixtureLoss(fixture, coefficients), 0);

  const casualtyOnly = structuredClone(fixture);
  const pairLosses = [];
  for (const sideId of ['A', 'B']) {
    casualtyOnly.observed.perRowCasualties[sideId] = predicted.perRowCasualties[sideId].map(
      (casualties) => {
        const changed = casualties === 0 ? 1 : casualties / 2;
        pairLosses.push(casualtySmape(casualties, changed));
        return changed;
      }
    );
  }
  assertClose(fixtureLoss(casualtyOnly, coefficients), median(pairLosses));

  const wrongWinner = structuredClone(fixture);
  wrongWinner.observed.winner = oppositeWinner(predicted.winner);
  assert.equal(fixtureLoss(wrongWinner, coefficients), 10);
});

test('corpusMetrics aggregates casualty errors and identifies wrong-winner files', () => {
  const correct = validatedSyntheticFixture('correct.json');
  const coefficients = correct.simulated.coefficients;
  const wrong = structuredClone(correct);
  wrong.filename = 'wrong.json';
  wrong.observed.winner = oppositeWinner(correct.observed.winner);

  const metrics = corpusMetrics([correct, wrong], coefficients);
  assert.deepEqual(metrics, {
    fixtureCount: 2,
    winnerAccuracy: 0.5,
    casualtySmapeMedian: 0,
    casualtySmapeP90: 0,
    wrongWinnerFiles: ['wrong.json'],
  });
  assert.equal(corpusLoss([correct, wrong], coefficients), 5);
});

test('validateFixture ignores future keys at every supported fixture layer', () => {
  const raw = readRawSyntheticFixture();
  raw.futureTopLevel = { enabled: true };
  raw.setup.futureSetupField = 'ignored';
  raw.setup.sides.A.futureSideField = 'ignored';
  raw.setup.sides.A.rows[0].futureRowField = 'ignored';
  raw.setup.sides.A.rows[0].unitValues.lethalDamage = 25;
  raw.setup.sides.A.rows[0].bonuses.lethalDamage = 25;
  raw.setup.sides.A.rows[0].finals.lethalDamage = 30;
  raw.simulated.futureSimulatedField = 'ignored';
  raw.simulated.coefficients.futureCoefficient = 42;
  raw.observed.futureObservedField = 'ignored';
  raw.statContract.futureContractField = 'ignored';
  raw.statContract.battleKeys.push('lethalDamage');
  const futureSource = {
    sourceType: 'future',
    sourceId: 'future:lethal-damage',
    label: 'Future lethal damage',
    statKey: 'lethalDamage',
    amount: 25,
    operation: 'add',
    unit: 'percent',
    appliesTo: { battleModes: ['pvp-field'], troopTypes: [], rowIds: [] },
    verification: null,
    provenance: null,
    futureSourceField: 'ignored',
  };
  raw.setup.sides.A.capturedSourceSnapshot.sources.push(futureSource);
  raw.sourceProvenance.A.sources.push(structuredClone(futureSource));
  raw.setup.sides.A.capturedSourceSnapshot.futureSnapshotField = 'ignored';
  raw.sourceProvenance.A.futureSnapshotField = 'ignored';
  raw.setup.sides.A.equipmentLoadout.futureEquipmentField = 'ignored';
  raw.equipmentProvenance.A.futureEquipmentField = 'ignored';

  const fixture = validateFixture(raw, 'future-fields.json');

  assert.equal(Object.hasOwn(fixture, 'futureTopLevel'), false);
  assert.equal(Object.hasOwn(fixture.setup, 'futureSetupField'), false);
  assert.equal(Object.hasOwn(fixture.setup.sides.A, 'futureSideField'), false);
  assert.equal(Object.hasOwn(fixture.setup.sides.A.rows[0], 'futureRowField'), false);
  assert.equal(Object.hasOwn(fixture.setup.sides.A.rows[0].unitValues, 'lethalDamage'), false);
  assert.equal(Object.hasOwn(fixture.setup.sides.A.rows[0].bonuses, 'lethalDamage'), false);
  assert.equal(Object.hasOwn(fixture.setup.sides.A.rows[0].finals, 'lethalDamage'), false);
  assert.equal(Object.hasOwn(fixture.engineConfig.sideA.rows[0].stats.unit, 'lethalDamage'), false);
  assert.equal(
    Object.hasOwn(fixture.engineConfig.sideA.rows[0].stats.battle, 'lethalDamage'),
    false
  );
  assert.equal(Object.hasOwn(fixture.simulated, 'futureSimulatedField'), false);
  assert.equal(Object.hasOwn(fixture.simulated.coefficients, 'futureCoefficient'), false);
  assert.equal(Object.hasOwn(fixture.observed, 'futureObservedField'), false);
  assert.equal(Object.hasOwn(fixture.statContract, 'futureContractField'), false);
  assert.equal(fixture.statContract.battleKeys.includes('lethalDamage'), false);
  assert.equal(
    fixture.sourceProvenance.A.sources.some(({ statKey }) => statKey === 'lethalDamage'),
    false
  );
  assert.equal(Object.hasOwn(fixture.sourceProvenance.A, 'futureSnapshotField'), false);
  assert.equal(Object.hasOwn(fixture.equipmentProvenance.A, 'futureEquipmentField'), false);
});

test('legacy phase-1 reports remain inspectable but are archive-only for calibration', async () => {
  const legacy = validateFixture(readRawLegacySyntheticFixture(), 'legacy-phase1.json');
  assert.equal(legacy.fixtureVersion, 1);
  assert.equal(legacy.isLegacy, true);
  assert.equal(legacy.evidenceStatus, 'legacy-phase1-archive');
  assert.equal(legacy.setup.setupSchemaVersion, 2);

  const { result, warnings } = await captureWarnings(() => loadFixtureCorpus(FIXTURE_DIRECTORY));
  assert.equal(result.archivedFiles.length, 12);
  assert.equal(
    result.fixtures.filter((fixture) => SYNTHETIC_FILENAME.test(fixture.filename)).length,
    12
  );
  assert.equal(
    warnings.some((warning) => /synthetic-\d{2}/i.test(warning)),
    false
  );

  const { result: calibrationCorpus } = await captureWarnings(() =>
    loadCalibrationFixtureCorpus(FIXTURE_DIRECTORY)
  );
  assert.equal(calibrationCorpus.fixtures.length, 0);
  assert.equal(calibrationCorpus.replayOnlyFiles.length, 12);
  await assert.rejects(
    runCalibration({ fixtures: FIXTURE_DIRECTORY }),
    /No verified observed-game-report fixtures.*Synthetic regression/i
  );
});

test('calibration loader admits observed game reports and excludes synthetic replay oracles', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'battle-calibration-evidence-'));
  try {
    const replay = readRawSyntheticFixture();
    const observed = structuredClone(replay);
    observed.provenance.evidenceKind = 'observed-game-report';
    writeFileSync(join(directory, '10-replay.json'), `${JSON.stringify(replay)}\n`, 'utf8');
    writeFileSync(join(directory, '20-observed.json'), `${JSON.stringify(observed)}\n`, 'utf8');

    const corpus = await loadCalibrationFixtureCorpus(directory);
    assert.deepEqual(
      corpus.fixtures.map(({ filename }) => filename),
      ['20-observed.json']
    );
    assert.deepEqual(corpus.replayOnlyFiles, ['10-replay.json']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('fixture loaders sort deterministically and warn while skipping siege and unfilled reports', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'battle-calibration-fixtures-'));
  try {
    const filledA = readRawSyntheticFixture();
    const filledB = structuredClone(filledA);
    const unfilled = structuredClone(filledA);
    unfilled.observed = {
      winner: null,
      rounds: null,
      perRowCasualties: { A: [null, null, null], B: [null, null, null] },
      notes: '',
    };
    const siege = structuredClone(filledA);
    siege.battleMode = 'siege';
    siege.setup = {
      battleMode: 'siege',
      futureSiegeFormation: { columns: 5, walls: true },
    };

    for (const [filename, fixture] of [
      ['20-filled-b.json', filledB],
      ['10-filled-a.json', filledA],
      ['30-unfilled.json', unfilled],
      ['40-siege.json', siege],
    ]) {
      writeFileSync(join(directory, filename), `${JSON.stringify(fixture)}\n`, 'utf8');
    }

    const { result: fixtures, warnings } = await captureWarnings(() => loadFixtures(directory));
    assert.deepEqual(
      fixtures.map((fixture) => fixture.filename),
      ['10-filled-a.json', '20-filled-b.json']
    );
    assert.equal(warnings.length, 2);
    assert.ok(warnings.some((warning) => warning.includes('30-unfilled.json')));
    assert.ok(warnings.some((warning) => warning.includes('40-siege.json')));
    assert.ok(warnings.some((warning) => /unfilled/i.test(warning)));
    assert.ok(warnings.some((warning) => /not supported/i.test(warning)));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('unsupported-mode skipping never masks an invalid battleMode type', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'battle-calibration-invalid-mode-'));
  try {
    const fixture = readRawSyntheticFixture();
    fixture.battleMode = 1097;
    fixture.setup.battleMode = 'siege';
    writeFileSync(join(directory, 'invalid-mode.json'), `${JSON.stringify(fixture)}\n`, 'utf8');

    await assert.rejects(loadFixtures(directory), /battleMode must be a string/i);

    const invalidSetupMode = readRawSyntheticFixture();
    invalidSetupMode.battleMode = 'siege';
    invalidSetupMode.setup.battleMode = false;
    writeFileSync(
      join(directory, 'invalid-mode.json'),
      `${JSON.stringify(invalidSetupMode)}\n`,
      'utf8'
    );
    await assert.rejects(loadFixtures(directory), /invalid setup.*battleMode must be a string/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('validateFixture rejects every required structural failure with a filename prefix', () => {
  const baseline = readRawSyntheticFixture();
  const cases = [
    {
      name: 'wrong fixture version',
      mutate: (fixture) => {
        fixture.fixtureVersion = 3;
      },
      errorType: RangeError,
      message: /fixtureVersion must be 1 or 2/i,
    },
    {
      name: 'missing setup',
      mutate: (fixture) => {
        delete fixture.setup;
      },
      errorType: TypeError,
      message: /invalid setup/i,
    },
    {
      name: 'invalid setup',
      mutate: (fixture) => {
        fixture.setup = [];
      },
      errorType: TypeError,
      message: /invalid setup/i,
    },
    {
      name: 'non-string fixture battle mode',
      mutate: (fixture) => {
        fixture.battleMode = 1097;
      },
      errorType: TypeError,
      message: /battleMode must be a string/i,
    },
    {
      name: 'non-string setup battle mode',
      mutate: (fixture) => {
        fixture.setup.battleMode = false;
      },
      errorType: TypeError,
      message: /invalid setup.*battleMode must be a string/i,
    },
    {
      name: 'legacy setup inside v2 fixture',
      mutate: (fixture) => {
        fixture.setup.setupSchemaVersion = 1;
      },
      errorType: TypeError,
      message: /invalid setup/i,
    },
    {
      name: 'mismatched stat contract',
      mutate: (fixture) => {
        fixture.statContract.version = 99;
      },
      errorType: TypeError,
      message: /statContract must match/i,
    },
    {
      name: 'mismatched source provenance',
      mutate: (fixture) => {
        fixture.sourceProvenance.A.sources.push({ future: true });
      },
      errorType: TypeError,
      message: /sourceProvenance must match/i,
    },
    {
      name: 'missing evidence kind',
      mutate: (fixture) => {
        delete fixture.provenance.evidenceKind;
      },
      errorType: TypeError,
      message: /provenance\.evidenceKind must be one of/i,
    },
    {
      name: 'missing replay coefficient',
      mutate: (fixture) => {
        delete fixture.simulated.coefficients.baseCasualtyRate;
      },
      errorType: TypeError,
      message: /simulated\.coefficients is missing required coefficient.*baseCasualtyRate/i,
    },
    {
      name: 'non-finite replay coefficient',
      mutate: (fixture) => {
        fixture.simulated.coefficients.baseCasualtyRate = Number.NaN;
      },
      errorType: TypeError,
      message: /invalid simulated\.coefficients.*finite number/i,
    },
    {
      name: 'fractional replay seed',
      mutate: (fixture) => {
        fixture.simulated.seed = 1.5;
      },
      errorType: TypeError,
      message: /simulated\.seed must be a safe integer/i,
    },
    {
      name: 'out-of-range replay seed',
      mutate: (fixture) => {
        fixture.simulated.seed = 0x1_0000_0000;
      },
      errorType: RangeError,
      message: /simulated\.seed must be between 0 and 4294967295/i,
    },
    {
      name: 'non-finite replay variance',
      mutate: (fixture) => {
        fixture.simulated.strikeVariancePct = Number.POSITIVE_INFINITY;
      },
      errorType: TypeError,
      message: /simulated\.strikeVariancePct must be a finite number/i,
    },
    {
      name: 'out-of-range replay variance',
      mutate: (fixture) => {
        fixture.simulated.strikeVariancePct = -1;
      },
      errorType: RangeError,
      message: /simulated\.strikeVariancePct must be between 0 and 100/i,
    },
    {
      name: 'invalid observed winner',
      mutate: (fixture) => {
        fixture.observed.winner = 'stalemate';
      },
      errorType: TypeError,
      message: /observed\.winner must be "A", "B", "draw", or null/i,
    },
    {
      name: 'wrong casualty array length',
      mutate: (fixture) => {
        fixture.observed.perRowCasualties.A = [1, 2];
      },
      errorType: TypeError,
      message: /perRowCasualties\.A must be an array of exactly three/i,
    },
    {
      name: 'non-finite casualty',
      mutate: (fixture) => {
        fixture.observed.perRowCasualties.B[1] = Number.POSITIVE_INFINITY;
      },
      errorType: TypeError,
      message: /must be a finite non-negative number/i,
    },
    {
      name: 'negative casualty',
      mutate: (fixture) => {
        fixture.observed.perRowCasualties.A[2] = -1;
      },
      errorType: TypeError,
      message: /must be a finite non-negative number/i,
    },
    {
      name: 'casualties exceed row troops',
      mutate: (fixture) => {
        fixture.observed.perRowCasualties.A[0] = fixture.setup.sides.A.rows[0].troops + 1;
      },
      errorType: RangeError,
      message: /exceeds that row's .* troops/i,
    },
  ];

  for (const [index, failure] of cases.entries()) {
    const fixture = structuredClone(baseline);
    failure.mutate(fixture);
    const filename = `invalid-${index + 1}.json`;
    assert.throws(
      () => validateFixture(fixture, filename),
      (error) => {
        assert.ok(error instanceof failure.errorType, `${failure.name} uses expected error type`);
        assert.match(error.message, new RegExp(`^${escapeRegExp(filename)}:`));
        assert.match(error.message, failure.message);
        return true;
      },
      failure.name
    );
  }
});

test('splitFixtures sorts first, selects every Nth holdout, and falls back below eight fixtures', () => {
  const fixtures = Array.from({ length: 12 }, (_, index) => ({
    filename: `fixture-${String(12 - index).padStart(2, '0')}.json`,
  }));
  const split = splitFixtures(fixtures, 0.3);

  assert.equal(split.interval, 3);
  assert.equal(split.usedFullCorpus, false);
  assert.deepEqual(
    split.holdoutFixtures.map((fixture) => fixture.filename),
    ['fixture-03.json', 'fixture-06.json', 'fixture-09.json', 'fixture-12.json']
  );
  assert.deepEqual(
    split.fitFixtures.map((fixture) => fixture.filename),
    [
      'fixture-01.json',
      'fixture-02.json',
      'fixture-04.json',
      'fixture-05.json',
      'fixture-07.json',
      'fixture-08.json',
      'fixture-10.json',
      'fixture-11.json',
    ]
  );

  const warnings = [];
  const smallCorpus = fixtures.slice(0, 7);
  const fallback = splitFixtures(smallCorpus, 0.3, {
    warn: (message) => warnings.push(message),
  });
  assert.equal(fallback.usedFullCorpus, true);
  assert.equal(fallback.fitFixtures.length, 7);
  assert.equal(fallback.holdoutFixtures.length, 7);
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0]), /7 usable fixtures|fewer than 8/i);
});

test('search primitives use a seven-point log grid and honor the Nelder-Mead cap', async () => {
  const grid = logSpacedValues([0.1, 5]);
  assert.equal(grid.length, 7);
  assertClose(grid[0], 0.1);
  assertClose(grid.at(-1), 5);
  const ratios = grid.slice(1).map((value, index) => value / grid[index]);
  for (const ratio of ratios.slice(1)) assertClose(ratio, ratios[0]);

  const fixtures = await loadFixtures(FIXTURE_DIRECTORY);
  const coarse = coarseSearch(fixtures);
  const refined = nelderMeadSearch(fixtures, coarse.coefficients, {
    maxIterations: 2,
    convergenceTolerance: Number.MIN_VALUE,
  });
  assert.equal(refined.iterations, 2);
  assert.equal(refined.converged, false);
  assert.ok(refined.loss <= coarse.loss);
});

function calibrationArtifactContext() {
  const fixture = validatedSyntheticFixture('artifact.json');
  const fittedCoefficients = fixture.simulated.coefficients;
  const metrics = corpusMetrics([fixture], fittedCoefficients);
  return {
    result: {
      fittedCoefficients,
      fitMetrics: metrics,
      holdoutMetrics: metrics,
      corpusSize: 1,
      skippedFiles: [],
    },
    split: {
      fitFixtures: [fixture],
      holdoutFixtures: [fixture],
      usedFullCorpus: true,
      interval: 3,
    },
  };
}

test('calibration writer never overwrites the default coefficients module', async () => {
  const { result, split } = calibrationArtifactContext();
  const defaultsPath = join(REPOSITORY_ROOT, 'js', 'battle-simulator-coefficients.js');
  const before = readFileSync(defaultsPath, 'utf8');

  await assert.rejects(
    writeCalibrationArtifacts(result, split, {
      fixtures: FIXTURE_DIRECTORY,
      out: defaultsPath,
      holdout: 0.3,
    }),
    /must never overwrite the default coefficients module/i
  );
  assert.equal(readFileSync(defaultsPath, 'utf8'), before);
});

test('calibration writer creates the calibrated JSON and reproducible Markdown report', async () => {
  const { result, split } = calibrationArtifactContext();
  const directory = mkdtempSync(join(tmpdir(), 'battle-calibration-output-'));
  const originalDirectory = process.cwd();
  const options = {
    fixtures: 'tests/fixtures/battle-reports',
    out: 'output/calibrated.json',
    holdout: 0.3,
  };

  try {
    process.chdir(directory);
    await writeCalibrationArtifacts(result, split, options);
    assert.deepEqual(
      JSON.parse(readFileSync(join(directory, options.out), 'utf8')),
      result.fittedCoefficients
    );
    const report = readFileSync(join(directory, CALIBRATION_REPORT_PATH), 'utf8');
    assert.match(report, /Usable corpus: 1 fixtures/);
    assert.match(report, /\| Fit \| 1 \| 100\.00% \|/);
    assert.match(
      report,
      /node scripts\/battle-sim\/calibrate\.mjs --fixtures tests\/fixtures\/battle-reports --out output\/calibrated\.json --holdout 0\.3 --write/
    );
  } finally {
    process.chdir(originalDirectory);
    rmSync(directory, { recursive: true, force: true });
  }
});

test(
  'v2 generating coefficients replay exactly and the fitter materially improves defaults',
  { timeout: 35_000 },
  async () => {
    const { fixtures } = await loadFixtureCorpus(FIXTURE_DIRECTORY);
    const synthetic = fixtures.filter((fixture) => SYNTHETIC_FILENAME.test(fixture.filename));
    assert.equal(synthetic.length, 12);
    const generatingCoefficients = synthetic[0].simulated.coefficients;
    for (const fixture of synthetic) {
      assert.deepEqual(fixture.simulated.coefficients, generatingCoefficients);
      assert.equal(fixture.provenance.evidenceKind, 'synthetic-regression');
    }
    assert.equal(corpusLoss(synthetic, generatingCoefficients), 0);
    assert.deepEqual(corpusMetrics(synthetic, generatingCoefficients), {
      fixtureCount: 12,
      winnerAccuracy: 1,
      casualtySmapeMedian: 0,
      casualtySmapeP90: 0,
      wrongWinnerFiles: [],
    });

    const defaultLoss = corpusLoss(synthetic, DEFAULT_BATTLE_COEFFICIENTS);
    assert.ok(defaultLoss > 0, 'synthetic coefficients must differ measurably from defaults');

    const startedAt = performance.now();
    const fittedCoefficients = fitCoefficients(synthetic, { maxIterations: 40 });
    const elapsedMs = performance.now() - startedAt;
    const fittedLoss = corpusLoss(synthetic, fittedCoefficients);
    const fittedMetrics = corpusMetrics(synthetic, fittedCoefficients);

    assert.ok(
      fittedLoss <= defaultLoss * 0.25,
      `expected fitted loss ${fittedLoss} to be at most 25% of default loss ${defaultLoss}`
    );
    assert.equal(fittedMetrics.winnerAccuracy, 1);
    assert.equal(fittedMetrics.casualtySmapeMedian, 0);
    assert.ok(fittedMetrics.casualtySmapeP90 < 0.5);
    assert.deepEqual(fittedMetrics.wrongWinnerFiles, []);
    assert.ok(elapsedMs < 30_000, `fit should complete within 30 seconds; took ${elapsedMs}ms`);
  }
);
