import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  DEFAULT_BATTLE_COEFFICIENTS,
  normalizeBattleCoefficients,
} from '../../js/battle-simulator-coefficients.js';
import { loadCalibrationFixtureCorpus } from './fixtures.mjs';
import { corpusLoss, corpusMetrics } from './metrics.mjs';

export const DEFAULT_FIXTURE_DIRECTORY = 'tests/fixtures/battle-reports';
export const DEFAULT_CALIBRATED_COEFFICIENTS_PATH =
  'js/battle-simulator-coefficients.calibrated.json';
export const CALIBRATION_REPORT_PATH = 'docs/battle-sim/calibration-report.md';
const DEFAULT_COEFFICIENTS_MODULE_PATH = fileURLToPath(
  new URL('../../js/battle-simulator-coefficients.js', import.meta.url)
);

export const FREE_PARAMETER_BOUNDS = Object.freeze({
  baseCasualtyRate: Object.freeze([0.005, 0.5]),
  mightScale: Object.freeze([0.1, 5]),
  damageScale: Object.freeze([0.1, 5]),
  resistanceScale: Object.freeze([0.1, 5]),
  hpScale: Object.freeze([0.1, 5]),
  mightExponent: Object.freeze([0.25, 3]),
  damageExponent: Object.freeze([0.25, 3]),
  resistanceExponent: Object.freeze([0.25, 3]),
  hpExponent: Object.freeze([0.25, 3]),
});

const FREE_PARAMETER_NAMES = Object.freeze(Object.keys(FREE_PARAMETER_BOUNDS));
const COARSE_GRID_SIZE = 7;
const COARSE_SWEEPS = 3;
const DEFAULT_MAX_ITERATIONS = 400;
const DEFAULT_CONVERGENCE_TOLERANCE = 1e-6;
const INITIAL_SIMPLEX_STEP_FRACTION = 0.05;
const NELDER_MEAD_ALPHA = 1;
const NELDER_MEAD_GAMMA = 2;
const NELDER_MEAD_RHO = 0.5;
const NELDER_MEAD_SIGMA = 0.5;

function requireFixtureArray(fixtures) {
  if (!Array.isArray(fixtures)) {
    throw new TypeError('Calibration fixtures must be an array.');
  }
  if (fixtures.length === 0) {
    throw new RangeError('Calibration fixtures must contain at least one fixture.');
  }
  return fixtures;
}

function requirePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
  return value;
}

function requirePositiveFiniteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
  return value;
}

function compareStrings(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function fixtureFilename(fixture) {
  return typeof fixture?.filename === 'string' ? fixture.filename : '';
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function coefficientsFromFreeValues(freeValues) {
  return normalizeBattleCoefficients({
    ...DEFAULT_BATTLE_COEFFICIENTS,
    ...Object.fromEntries(
      FREE_PARAMETER_NAMES.map((name) => {
        const [minimum, maximum] = FREE_PARAMETER_BOUNDS[name];
        return [name, clamp(freeValues[name], minimum, maximum)];
      })
    ),
  });
}

function freeValuesFromCoefficients(rawCoefficients = DEFAULT_BATTLE_COEFFICIENTS) {
  const coefficients = normalizeBattleCoefficients(rawCoefficients);
  return Object.fromEntries(
    FREE_PARAMETER_NAMES.map((name) => {
      const [minimum, maximum] = FREE_PARAMETER_BOUNDS[name];
      return [name, clamp(coefficients[name], minimum, maximum)];
    })
  );
}

function coefficientsCacheKey(coefficients) {
  return FREE_PARAMETER_NAMES.map((name) => coefficients[name].toPrecision(17)).join('|');
}

function createLossEvaluator(fixtures) {
  const fixtureList = requireFixtureArray(fixtures);
  const cache = new Map();
  return (coefficients) => {
    const key = coefficientsCacheKey(coefficients);
    if (!cache.has(key)) cache.set(key, corpusLoss(fixtureList, coefficients));
    return cache.get(key);
  };
}

function logBounds() {
  return FREE_PARAMETER_NAMES.map((name) =>
    FREE_PARAMETER_BOUNDS[name].map((value) => Math.log(value))
  );
}

function freeValuesToLogPoint(freeValues) {
  return FREE_PARAMETER_NAMES.map((name) => Math.log(freeValues[name]));
}

function logPointToCoefficients(point) {
  return coefficientsFromFreeValues(
    Object.fromEntries(FREE_PARAMETER_NAMES.map((name, index) => [name, Math.exp(point[index])]))
  );
}

function clampLogPoint(point, bounds) {
  return point.map((value, index) => clamp(value, bounds[index][0], bounds[index][1]));
}

function comparePoints(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function compareVertices(left, right) {
  return left.loss - right.loss || comparePoints(left.point, right.point);
}

function centroid(vertices, dimensions) {
  const center = Array(dimensions).fill(0);
  for (const vertex of vertices) {
    for (let index = 0; index < dimensions; index += 1) {
      center[index] += vertex.point[index] / vertices.length;
    }
  }
  return center;
}

function transformPoint(origin, target, factor, bounds) {
  return clampLogPoint(
    origin.map((value, index) => value + factor * (target[index] - value)),
    bounds
  );
}

function evaluatePoint(point, bounds, evaluateLoss) {
  const boundedPoint = clampLogPoint(point, bounds);
  const coefficients = logPointToCoefficients(boundedPoint);
  return { point: boundedPoint, loss: evaluateLoss(coefficients) };
}

function createInitialSimplex(initialPoint, bounds, evaluateLoss) {
  const simplex = [evaluatePoint(initialPoint, bounds, evaluateLoss)];
  for (let dimension = 0; dimension < initialPoint.length; dimension += 1) {
    const point = [...initialPoint];
    const [minimum, maximum] = bounds[dimension];
    const step = (maximum - minimum) * INITIAL_SIMPLEX_STEP_FRACTION;
    point[dimension] =
      point[dimension] + step <= maximum ? point[dimension] + step : point[dimension] - step;
    simplex.push(evaluatePoint(point, bounds, evaluateLoss));
  }
  return simplex;
}

function shrinkSimplex(simplex, bounds, evaluateLoss) {
  const best = simplex[0];
  return [
    best,
    ...simplex
      .slice(1)
      .map((vertex) =>
        evaluatePoint(
          transformPoint(best.point, vertex.point, NELDER_MEAD_SIGMA, bounds),
          bounds,
          evaluateLoss
        )
      ),
  ];
}

export function logSpacedValues([minimum, maximum], count = COARSE_GRID_SIZE) {
  requirePositiveFiniteNumber(minimum, 'Log-space minimum');
  requirePositiveFiniteNumber(maximum, 'Log-space maximum');
  if (maximum <= minimum) {
    throw new RangeError('Log-space maximum must be greater than its minimum.');
  }
  if (!Number.isInteger(count) || count < 2) {
    throw new RangeError('Log-space value count must be an integer of at least two.');
  }
  const logMinimum = Math.log(minimum);
  const logRange = Math.log(maximum) - logMinimum;
  return Array.from({ length: count }, (_, index) =>
    Math.exp(logMinimum + (logRange * index) / (count - 1))
  );
}

/**
 * Sort by filename, then place every Nth fixture (using one-based positions) in holdout.
 * Small corpora are deliberately used in full for both fitting and reporting.
 */
export function splitFixtures(fixtures, holdout = 0.3, { warn = console.warn } = {}) {
  const fixtureList = requireFixtureArray(fixtures);
  if (typeof holdout !== 'number' || !Number.isFinite(holdout) || holdout <= 0 || holdout > 0.5) {
    throw new RangeError('Holdout fraction must be greater than 0 and at most 0.5.');
  }
  if (typeof warn !== 'function') throw new TypeError('Split warning handler must be a function.');

  const sorted = fixtureList
    .map((fixture, originalIndex) => ({ fixture, originalIndex }))
    .sort(
      (left, right) =>
        compareStrings(fixtureFilename(left.fixture), fixtureFilename(right.fixture)) ||
        left.originalIndex - right.originalIndex
    )
    .map(({ fixture }) => fixture);
  const interval = Math.round(1 / holdout);

  if (sorted.length < 8) {
    warn(
      `[battle-sim] Only ${sorted.length} usable fixture${sorted.length === 1 ? '' : 's'}; ` +
        'fitting and reporting metrics on the full corpus.'
    );
    return {
      fitFixtures: [...sorted],
      holdoutFixtures: [...sorted],
      usedFullCorpus: true,
      interval,
    };
  }

  const fitFixtures = [];
  const holdoutFixtures = [];
  sorted.forEach((fixture, index) => {
    ((index + 1) % interval === 0 ? holdoutFixtures : fitFixtures).push(fixture);
  });
  if (fitFixtures.length === 0 || holdoutFixtures.length === 0) {
    throw new RangeError('Holdout fraction must produce non-empty fit and holdout sets.');
  }
  return { fitFixtures, holdoutFixtures, usedFullCorpus: false, interval };
}

/** Stage 1: three deterministic coordinate-descent sweeps over seven log-spaced values. */
export function coarseSearch(fixtures, { initialCoefficients = DEFAULT_BATTLE_COEFFICIENTS } = {}) {
  const evaluateLoss = createLossEvaluator(fixtures);
  let freeValues = freeValuesFromCoefficients(initialCoefficients);
  let coefficients = coefficientsFromFreeValues(freeValues);
  let loss = evaluateLoss(coefficients);

  for (let sweep = 0; sweep < COARSE_SWEEPS; sweep += 1) {
    for (const name of FREE_PARAMETER_NAMES) {
      let bestValue = freeValues[name];
      let bestLoss = loss;
      for (const value of logSpacedValues(FREE_PARAMETER_BOUNDS[name])) {
        const candidateFreeValues = { ...freeValues, [name]: value };
        const candidateCoefficients = coefficientsFromFreeValues(candidateFreeValues);
        const candidateLoss = evaluateLoss(candidateCoefficients);
        if (candidateLoss < bestLoss) {
          bestValue = value;
          bestLoss = candidateLoss;
        }
      }
      freeValues = { ...freeValues, [name]: bestValue };
      coefficients = coefficientsFromFreeValues(freeValues);
      loss = bestLoss;
    }
  }

  return { coefficients: cloneCoefficients(coefficients), loss };
}

/** Stage 2: bounded deterministic Nelder-Mead in log-parameter space. */
export function nelderMeadSearch(
  fixtures,
  initialCoefficients,
  {
    maxIterations = DEFAULT_MAX_ITERATIONS,
    convergenceTolerance = DEFAULT_CONVERGENCE_TOLERANCE,
  } = {}
) {
  requirePositiveInteger(maxIterations, 'Nelder-Mead iteration cap');
  requirePositiveFiniteNumber(convergenceTolerance, 'Nelder-Mead convergence tolerance');
  const evaluateLoss = createLossEvaluator(fixtures);
  const bounds = logBounds();
  const initialPoint = freeValuesToLogPoint(freeValuesFromCoefficients(initialCoefficients));
  let simplex = createInitialSimplex(initialPoint, bounds, evaluateLoss);
  let iterations = 0;
  let converged = false;

  while (iterations < maxIterations) {
    simplex.sort(compareVertices);
    const lossSpread = simplex.at(-1).loss - simplex[0].loss;
    if (lossSpread < convergenceTolerance) {
      converged = true;
      break;
    }

    const dimensions = initialPoint.length;
    const center = centroid(simplex.slice(0, -1), dimensions);
    const best = simplex[0];
    const secondWorst = simplex.at(-2);
    const worst = simplex.at(-1);
    const reflected = evaluatePoint(
      transformPoint(center, worst.point, -NELDER_MEAD_ALPHA, bounds),
      bounds,
      evaluateLoss
    );

    if (reflected.loss < best.loss) {
      const expanded = evaluatePoint(
        transformPoint(center, reflected.point, NELDER_MEAD_GAMMA, bounds),
        bounds,
        evaluateLoss
      );
      simplex[simplex.length - 1] = expanded.loss < reflected.loss ? expanded : reflected;
    } else if (reflected.loss < secondWorst.loss) {
      simplex[simplex.length - 1] = reflected;
    } else {
      const outsideContraction = reflected.loss < worst.loss;
      const contractionTarget = outsideContraction ? reflected.point : worst.point;
      const contracted = evaluatePoint(
        transformPoint(center, contractionTarget, NELDER_MEAD_RHO, bounds),
        bounds,
        evaluateLoss
      );
      const contractionThreshold = outsideContraction ? reflected.loss : worst.loss;
      const contractionAccepted = outsideContraction
        ? contracted.loss <= contractionThreshold
        : contracted.loss < contractionThreshold;
      if (contractionAccepted) {
        simplex[simplex.length - 1] = contracted;
      } else {
        simplex = shrinkSimplex(simplex, bounds, evaluateLoss);
      }
    }
    iterations += 1;
  }

  simplex.sort(compareVertices);
  return {
    coefficients: cloneCoefficients(logPointToCoefficients(simplex[0].point)),
    loss: simplex[0].loss,
    iterations,
    converged,
  };
}

function cloneCoefficients(coefficients) {
  return Object.fromEntries(
    Object.keys(DEFAULT_BATTLE_COEFFICIENTS).map((name) => [name, coefficients[name]])
  );
}

export function fitCoefficients(fixtures, options = {}) {
  const coarse = coarseSearch(fixtures, options);
  return nelderMeadSearch(fixtures, coarse.coefficients, options).coefficients;
}

function readOptionValue(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new TypeError(`${flag} requires a value.`);
  }
  return value;
}

export function parseCalibrationArgs(argv = process.argv.slice(2)) {
  const options = {
    fixtures: DEFAULT_FIXTURE_DIRECTORY,
    out: DEFAULT_CALIBRATED_COEFFICIENTS_PATH,
    holdout: 0.3,
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--write') {
      options.write = true;
    } else if (argument === '--fixtures') {
      options.fixtures = readOptionValue(argv, index, argument);
      index += 1;
    } else if (argument === '--out') {
      options.out = readOptionValue(argv, index, argument);
      index += 1;
    } else if (argument === '--holdout') {
      const value = Number(readOptionValue(argv, index, argument));
      if (!Number.isFinite(value)) throw new TypeError('--holdout must be a finite number.');
      options.holdout = value;
      index += 1;
    } else {
      throw new TypeError(`Unknown calibration argument: ${argument}`);
    }
  }
  return options;
}

function displayNumber(value) {
  return Number(value.toPrecision(12)).toString();
}

function displayMetric(value) {
  return Number.isFinite(value) ? value.toFixed(6) : 'n/a';
}

function displayAccuracy(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : 'n/a';
}

function commandArgument(value) {
  const text = String(value);
  return /^[A-Za-z0-9_./:\\-]+$/.test(text) ? text : JSON.stringify(text);
}

function buildReproductionCommand(options) {
  return [
    'node scripts/battle-sim/calibrate.mjs',
    `--fixtures ${commandArgument(options.fixtures)}`,
    `--out ${commandArgument(options.out)}`,
    `--holdout ${options.holdout}`,
    '--write',
  ].join(' ');
}

export function buildCalibrationReport(result, split, options) {
  const coefficientRows = Object.keys(DEFAULT_BATTLE_COEFFICIENTS)
    .map(
      (name) =>
        `| ${name} | ${displayNumber(DEFAULT_BATTLE_COEFFICIENTS[name])} | ${displayNumber(
          result.fittedCoefficients[name]
        )} |`
    )
    .join('\n');
  const metricRows = [
    ['Fit', result.fitMetrics],
    ['Holdout', result.holdoutMetrics],
  ]
    .map(
      ([label, metrics]) =>
        `| ${label} | ${metrics.fixtureCount} | ${displayAccuracy(
          metrics.winnerAccuracy
        )} | ${displayMetric(metrics.casualtySmapeMedian)} | ${displayMetric(
          metrics.casualtySmapeP90
        )} |`
    )
    .join('\n');

  return `# Battle Simulator Calibration Report

## Corpus and split

- Usable corpus: ${result.corpusSize} fixtures
- Fit set: ${split.fitFixtures.length} fixtures
- Holdout set: ${split.holdoutFixtures.length} fixtures
- Requested holdout fraction: ${options.holdout}
- Deterministic holdout interval: every Nth fixture where N=${split.interval} (one-based, filename-sorted)
- Full corpus used for both fit and report: ${split.usedFullCorpus ? 'yes' : 'no'}
- Skipped files: ${result.skippedFiles.length ? result.skippedFiles.join(', ') : 'none'}

## Fitted coefficients

| Coefficient | Default | Fitted |
| --- | ---: | ---: |
${coefficientRows}

## Metrics

| Dataset | Fixtures | Winner accuracy | Casualty sMAPE median | Casualty sMAPE p90 |
| --- | ---: | ---: | ---: | ---: |
${metricRows}

### Wrong-winner fixtures

- Fit: ${result.fitMetrics.wrongWinnerFiles.join(', ') || 'none'}
- Holdout: ${result.holdoutMetrics.wrongWinnerFiles.join(', ') || 'none'}

## Reproduce

\`\`\`sh
${buildReproductionCommand(options)}
\`\`\`
`;
}

function comparablePath(path) {
  const resolvedPath = resolve(path);
  return process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
}

async function assertDoesNotOverwriteDefaults(path) {
  if (comparablePath(path) === comparablePath(DEFAULT_COEFFICIENTS_MODULE_PATH)) {
    throw new RangeError(
      'Calibration output must never overwrite the default coefficients module.'
    );
  }
  try {
    const [outputRealPath, defaultsRealPath] = await Promise.all([
      realpath(path),
      realpath(DEFAULT_COEFFICIENTS_MODULE_PATH),
    ]);
    if (comparablePath(outputRealPath) === comparablePath(defaultsRealPath)) {
      throw new RangeError(
        'Calibration output must never overwrite the default coefficients module.'
      );
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

export async function writeCalibrationArtifacts(result, split, options) {
  const outputPath = resolve(options.out);
  const reportPath = resolve(CALIBRATION_REPORT_PATH);
  await Promise.all([
    assertDoesNotOverwriteDefaults(outputPath),
    assertDoesNotOverwriteDefaults(reportPath),
  ]);
  await Promise.all([
    mkdir(dirname(outputPath), { recursive: true }),
    mkdir(dirname(reportPath), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(outputPath, `${JSON.stringify(result.fittedCoefficients, null, 2)}\n`, 'utf8'),
    writeFile(reportPath, buildCalibrationReport(result, split, options), 'utf8'),
  ]);
}

export async function runCalibration(options = {}) {
  const normalizedOptions = {
    fixtures: options.fixtures ?? DEFAULT_FIXTURE_DIRECTORY,
    out: options.out ?? DEFAULT_CALIBRATED_COEFFICIENTS_PATH,
    holdout: options.holdout ?? 0.3,
    write: options.write ?? false,
    maxIterations: options.maxIterations ?? DEFAULT_MAX_ITERATIONS,
  };
  const { fixtures, skippedFiles } = await loadCalibrationFixtureCorpus(normalizedOptions.fixtures);
  if (fixtures.length === 0) {
    throw new RangeError(
      'No verified observed-game-report fixtures are available for calibration. Synthetic regression fixtures are replay oracles only.'
    );
  }
  const split = splitFixtures(fixtures, normalizedOptions.holdout);
  const fittedCoefficients = fitCoefficients(split.fitFixtures, {
    maxIterations: normalizedOptions.maxIterations,
  });
  const result = {
    fittedCoefficients,
    fitMetrics: corpusMetrics(split.fitFixtures, fittedCoefficients),
    holdoutMetrics: corpusMetrics(split.holdoutFixtures, fittedCoefficients),
    corpusSize: fixtures.length,
    skippedFiles: [...skippedFiles],
  };
  if (normalizedOptions.write) {
    await writeCalibrationArtifacts(result, split, normalizedOptions);
  }
  return result;
}

export async function main(argv = process.argv.slice(2)) {
  const result = await runCalibration(parseCalibrationArgs(argv));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function isDirectRun() {
  return (
    Boolean(process.argv[1]) && pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  );
}

if (isDirectRun()) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
