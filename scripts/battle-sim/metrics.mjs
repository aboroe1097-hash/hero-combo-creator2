import { simulateBattle } from '../../js/battle-simulator-engine.js';
import { setupSnapshotToEngineConfig } from '../../js/battle-simulator-setup.js';

const OBSERVED_WINNERS = new Set(['A', 'B', 'draw']);
const SIDE_IDS = ['A', 'B'];
const ROWS_PER_SIDE = 3;

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function requireFiniteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return value;
}

function requireNonNegativeNumber(value, label) {
  const number = requireFiniteNumber(value, label);
  if (number < 0) {
    throw new RangeError(`${label} must be non-negative.`);
  }
  return number;
}

function requireFixtureArray(fixtures) {
  if (!Array.isArray(fixtures)) {
    throw new TypeError('Calibration fixtures must be an array.');
  }
  if (fixtures.length === 0) {
    throw new RangeError('Calibration fixtures must contain at least one fixture.');
  }
  return fixtures;
}

function observedOutcome(fixture) {
  const observed = requireObject(
    requireObject(fixture, 'Calibration fixture').observed,
    'Calibration fixture observed data'
  );
  if (!OBSERVED_WINNERS.has(observed.winner)) {
    throw new RangeError(
      'Calibration fixture observed winner must be filled with "A", "B", or "draw".'
    );
  }

  const perRow = requireObject(
    observed.perRowCasualties,
    'Calibration fixture observed per-row casualties'
  );
  const perRowCasualties = {};
  for (const sideId of SIDE_IDS) {
    const casualties = perRow[sideId];
    if (!Array.isArray(casualties) || casualties.length !== ROWS_PER_SIDE) {
      throw new RangeError(
        `Calibration fixture observed Side ${sideId} casualties must contain exactly ${ROWS_PER_SIDE} values.`
      );
    }
    perRowCasualties[sideId] = casualties.map((value, index) =>
      requireNonNegativeNumber(
        value,
        `Calibration fixture observed Side ${sideId} row ${index + 1} casualties`
      )
    );
  }

  return { winner: observed.winner, perRowCasualties };
}

function simulatedCasualties(result) {
  const casualties = {};
  for (const sideId of SIDE_IDS) {
    const rows = result?.sides?.[sideId]?.rows;
    if (!Array.isArray(rows) || rows.length !== ROWS_PER_SIDE) {
      throw new RangeError(
        `Simulated Side ${sideId} result must contain exactly ${ROWS_PER_SIDE} rows.`
      );
    }
    casualties[sideId] = rows.map((row, index) =>
      requireNonNegativeNumber(
        row?.casualties,
        `Simulated Side ${sideId} row ${index + 1} casualties`
      )
    );
  }
  return casualties;
}

function evaluateFixture(fixture, coefficients) {
  const observed = observedOutcome(fixture);
  const predicted = simulateFixture(fixture, coefficients);
  const casualtySmapes = SIDE_IDS.flatMap((sideId) =>
    predicted.perRowCasualties[sideId].map((casualties, index) =>
      casualtySmape(casualties, observed.perRowCasualties[sideId][index])
    )
  );
  return {
    predicted,
    observed,
    casualtySmapes,
    wrongWinner: predicted.winner !== observed.winner,
  };
}

function fixtureFilename(fixture, index) {
  return typeof fixture?.filename === 'string' && fixture.filename.trim()
    ? fixture.filename
    : `fixture-${index + 1}`;
}

export function median(values) {
  if (!Array.isArray(values)) {
    throw new TypeError('Median values must be an array.');
  }
  if (values.length === 0) {
    throw new RangeError('Median values must not be empty.');
  }
  const sorted = values
    .map((value, index) => requireFiniteNumber(value, `Median value ${index + 1}`))
    .sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function nearestRankP90(values) {
  if (!Array.isArray(values)) {
    throw new TypeError('P90 values must be an array.');
  }
  if (values.length === 0) {
    throw new RangeError('P90 values must not be empty.');
  }
  const sorted = values
    .map((value, index) => requireFiniteNumber(value, `P90 value ${index + 1}`))
    .sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.9) - 1];
}

export function casualtySmape(predicted, observed) {
  const predictedValue = requireFiniteNumber(predicted, 'Predicted casualties');
  const observedValue = requireFiniteNumber(observed, 'Observed casualties');
  const scale = Math.max(Math.abs(predictedValue), Math.abs(observedValue));
  if (scale === 0) return 0;

  const scaledPredicted = predictedValue / scale;
  const scaledObserved = observedValue / scale;
  return (
    Math.abs(scaledPredicted - scaledObserved) /
    ((Math.abs(scaledPredicted) + Math.abs(scaledObserved)) / 2)
  );
}

export function simulateFixture(fixture, coefficients) {
  const fixtureObject = requireObject(fixture, 'Calibration fixture');
  const result = simulateBattle(setupSnapshotToEngineConfig(fixtureObject.setup), {
    seed: fixtureObject.simulated?.seed ?? fixtureObject.setup?.runOptions?.seed ?? 1,
    strikeVariancePct:
      fixtureObject.simulated?.strikeVariancePct ??
      fixtureObject.setup?.runOptions?.strikeVariancePct ??
      0,
    includeEventLog: false,
    coefficients,
  });
  return {
    winner: result.winner,
    perRowCasualties: simulatedCasualties(result),
  };
}

export function fixtureLoss(fixture, coefficients) {
  const evaluation = evaluateFixture(fixture, coefficients);
  return median(evaluation.casualtySmapes) + (evaluation.wrongWinner ? 10 : 0);
}

export function corpusLoss(fixtures, coefficients) {
  const fixtureList = requireFixtureArray(fixtures);
  return (
    fixtureList.reduce((total, fixture) => total + fixtureLoss(fixture, coefficients), 0) /
    fixtureList.length
  );
}

export function corpusMetrics(fixtures, coefficients) {
  const fixtureList = requireFixtureArray(fixtures);
  const casualtySmapes = [];
  const wrongWinnerFiles = [];

  fixtureList.forEach((fixture, index) => {
    const evaluation = evaluateFixture(fixture, coefficients);
    casualtySmapes.push(...evaluation.casualtySmapes);
    if (evaluation.wrongWinner) {
      wrongWinnerFiles.push(fixtureFilename(fixture, index));
    }
  });

  return {
    fixtureCount: fixtureList.length,
    winnerAccuracy: (fixtureList.length - wrongWinnerFiles.length) / fixtureList.length,
    casualtySmapeMedian: median(casualtySmapes),
    casualtySmapeP90: nearestRankP90(casualtySmapes),
    wrongWinnerFiles,
  };
}
