import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { simulateBattle } from '../../js/battle-simulator-engine.js';
import { setupSnapshotToEngineConfig } from '../../js/battle-simulator-setup.js';
import { validateFixture } from '../../scripts/battle-sim/fixtures.mjs';

const FIXTURE_DIRECTORY = fileURLToPath(new URL('../fixtures/battle-reports/', import.meta.url));

function summarizeReplay(result) {
  return {
    winner: result.winner,
    rounds: result.rounds,
    perRowCasualties: {
      A: result.sides.A.rows.map((row) => row.casualties),
      B: result.sides.B.rows.map((row) => row.casualties),
    },
  };
}

function replayFixture(fixture) {
  const config = setupSnapshotToEngineConfig(fixture.setup);
  return summarizeReplay(
    simulateBattle(config, {
      seed: fixture.simulated.seed,
      strikeVariancePct: fixture.simulated.strikeVariancePct,
      coefficients: fixture.simulated.coefficients,
      includeEventLog: false,
    })
  );
}

async function loadGoldenFixtureRecords() {
  const filenames = (await readdir(FIXTURE_DIRECTORY, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
  return Promise.all(
    filenames.map(async (filename) => {
      const raw = JSON.parse(await readFile(join(FIXTURE_DIRECTORY, filename), 'utf8'));
      return { fixture: validateFixture(raw, filename), raw };
    })
  );
}

const fixtureRecords = await loadGoldenFixtureRecords();
const legacyFixtureRecords = fixtureRecords.filter(({ fixture }) => fixture.isLegacy);
const replayFixtureRecords = fixtureRecords.filter(
  ({ fixture }) =>
    !fixture.isLegacy &&
    fixture.battleMode === 'pvp-field' &&
    fixture.provenance.evidenceKind === 'synthetic-regression'
);

test('golden battle fixtures omit identity fields and keep the PvP battle type contract', async () => {
  assert.ok(fixtureRecords.length > 0, 'At least one golden battle fixture is required.');

  for (const { fixture, raw } of fixtureRecords) {
    const provenance = raw.provenance ?? {};

    assert.equal(raw.battleType, 'pvp-field', `${fixture.filename} battleType`);
    assert.equal(
      Object.hasOwn(provenance, 'playerNames'),
      false,
      `${fixture.filename} must not contain provenance.playerNames`
    );
    assert.equal(
      Object.hasOwn(provenance, 'allianceName'),
      false,
      `${fixture.filename} must not contain provenance.allianceName`
    );
  }
});

test('phase-1 additive reports remain explicitly archived and are never replayed as v2', () => {
  assert.ok(legacyFixtureRecords.length > 0, 'Archived phase-1 evidence must remain available.');
  for (const { fixture } of legacyFixtureRecords) {
    assert.equal(fixture.fixtureVersion, 1);
    assert.equal(fixture.evidenceStatus, 'legacy-phase1-archive');
    assert.equal(fixture.setup.setupSchemaVersion, 2, 'inspection uses a canonical migrated setup');
    assert.equal(fixture.statContract, null);
  }
});

test('the v2 corpus contains persisted synthetic regression oracles', () => {
  assert.ok(replayFixtureRecords.length > 0, 'At least one v2 golden fixture is required.');
  for (const { fixture } of replayFixtureRecords) {
    assert.equal(fixture.fixtureVersion, 2);
    assert.equal(fixture.evidenceStatus, 'synthetic-regression');
    assert.equal(fixture.battleMode, 'pvp-field');
    assert.equal(fixture.statContract.version, 2);
  }
});

for (const { fixture } of replayFixtureRecords) {
  test(`golden battle report replays exactly: ${fixture.filename}`, () => {
    const expected = {
      winner: fixture.simulated.winner,
      rounds: fixture.simulated.rounds,
      perRowCasualties: fixture.simulated.perRowCasualties,
    };
    const firstReplay = replayFixture(fixture);
    const secondReplay = replayFixture(fixture);

    assert.deepEqual(firstReplay, expected);
    assert.deepEqual(secondReplay, firstReplay, 'Repeated replay must remain deterministic.');
  });
}
