import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import * as browser from '../../js/competition-schedule.js';
import {
  COMPETITION_SCHEDULE_DOC_PATH,
  COMPETITION_SCHEDULE_KEYS,
  competitionFlagsForPhase,
  createCompetitionPhaseSyncJob,
  getCompetitionPhase,
  normalizeCompetitionSchedule,
  syncCompetitionPhase,
} from '../../functions/src/competition-phase.js';

const H = 60 * 60 * 1000;
const T0 = Date.parse('2026-10-01T00:00:00Z');

function rawSchedule(offsetsH, seasonId = 'competition-12') {
  return {
    seasonId,
    title: 'Competition #12',
    ...Object.fromEntries(
      COMPETITION_SCHEDULE_KEYS.map((key, index) => [
        key,
        { toMillis: () => T0 + offsetsH[index] * H },
      ])
    ),
  };
}

const OFFSETS = [0, 24, 48, 72, 96, 120, 144];

test('the Functions copy of the schedule logic agrees with js/competition-schedule.js', () => {
  assert.equal(COMPETITION_SCHEDULE_DOC_PATH, browser.COMPETITION_SCHEDULE_DOC_PATH);
  assert.deepEqual([...COMPETITION_SCHEDULE_KEYS], [...browser.COMPETITION_SCHEDULE_KEYS]);
  const schedules = [
    rawSchedule(OFFSETS),
    rawSchedule([0, 1, 1, 1, 2, 2, 3]),
    rawSchedule([0, 24, 24, 48, 49, 49, 50]),
    rawSchedule([5, 1, 2, 3, 4, 5, 6]),
    { ...rawSchedule(OFFSETS), seasonId: 'bad season' },
    { ...rawSchedule(OFFSETS), deadlineAt: null },
    { seasonId: 'competition-12', opensAt: new Date(T0), phase1ClosesAt: '2026-10-02T00:00:00Z' },
    {
      ...rawSchedule(OFFSETS),
      opensAt: { seconds: T0 / 1000 - 3600, nanoseconds: 5e8 },
    },
    null,
  ];
  for (const raw of schedules) {
    const mine = normalizeCompetitionSchedule(raw);
    const theirs = browser.normalizeCompetitionSchedule(raw);
    assert.deepEqual(mine, theirs);
    for (let hour = -2; hour <= 160; hour += 0.5) {
      const now = T0 + hour * H;
      assert.equal(
        getCompetitionPhase(mine, now),
        browser.getCompetitionPhase(theirs, now),
        `phase at +${hour}h`
      );
    }
    assert.equal(getCompetitionPhase(mine, NaN), browser.getCompetitionPhase(theirs, NaN));
  }
});

test('config flags follow the phase: open through final check, new sign-ups in registration', () => {
  for (const phase of browser.COMPETITION_PHASES) {
    const flags = competitionFlagsForPhase(phase);
    if (phase === 'unconfigured') continue;
    assert.equal(flags.acceptNewSignups, browser.competitionAcceptsNewSignups(phase), phase);
    assert.equal(flags.open, browser.competitionAcceptsSignupEdits(phase), phase);
  }
});

function fakes({ schedule, config, now }) {
  const updates = [];
  return {
    updates,
    deps: {
      now: () => now,
      readSchedule: async () => schedule,
      readConfig: async () => config,
      updateConfig: async (changes) => updates.push(changes),
    },
  };
}

const CONFIG = Object.freeze({
  activeSeason: 'competition-12',
  open: false,
  grantDurationMinutes: 720,
  scoringProfileId: 'all-star-boh-2027-v1',
});

test('sync opens registration and new sign-ups, writing only the changed keys', async () => {
  const { deps, updates } = fakes({
    schedule: rawSchedule(OFFSETS),
    config: CONFIG,
    now: T0 + 1 * H,
  });
  const result = await syncCompetitionPhase(deps);
  assert.equal(result.phase, 'registration');
  assert.deepEqual(updates, [{ open: true, acceptNewSignups: true }]);
});

test('sync writes nothing when the flags already match', async () => {
  const { deps, updates } = fakes({
    schedule: rawSchedule(OFFSETS),
    config: { ...CONFIG, open: true, acceptNewSignups: false },
    now: T0 + 30 * H,
  });
  const result = await syncCompetitionPhase(deps);
  assert.equal(result.phase, 'finalCheck');
  assert.equal(result.status, 'unchanged');
  assert.deepEqual(updates, []);
});

test('sync closes registration after the deadline and keeps it closed afterwards', async () => {
  for (const [hours, phase] of [
    [-5, 'upcoming'],
    [50, 'waiting'],
    [80, 'reupload'],
    [130, 'winners'],
    [200, 'closed'],
  ]) {
    const { deps, updates } = fakes({
      schedule: rawSchedule(OFFSETS),
      config: { ...CONFIG, open: true, acceptNewSignups: true },
      now: T0 + hours * H,
    });
    const result = await syncCompetitionPhase(deps);
    assert.equal(result.phase, phase);
    assert.deepEqual(updates, [{ open: false, acceptNewSignups: false }]);
  }
});

test('sync only flips acceptNewSignups when phase 1 closes', async () => {
  const { deps, updates } = fakes({
    schedule: rawSchedule(OFFSETS),
    config: { ...CONFIG, open: true, acceptNewSignups: true },
    now: T0 + 25 * H,
  });
  await syncCompetitionPhase(deps);
  assert.deepEqual(updates, [{ acceptNewSignups: false }]);
});

test('sync leaves the config alone for another season, a bad schedule, or no config', async () => {
  const cases = [
    { schedule: rawSchedule(OFFSETS, 'season-2026'), config: CONFIG, reason: 'other_season' },
    { schedule: rawSchedule([5, 1, 2, 3, 4, 5, 6]), config: CONFIG, reason: 'no_schedule' },
    { schedule: null, config: CONFIG, reason: 'no_schedule' },
    { schedule: rawSchedule(OFFSETS), config: null, reason: 'no_config' },
  ];
  for (const { schedule, config, reason } of cases) {
    const { deps, updates } = fakes({ schedule, config, now: T0 + H });
    const result = await syncCompetitionPhase(deps);
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, reason);
    assert.deepEqual(updates, []);
  }
});

test('the Admin SDK wiring reads both documents and updates only the config', async () => {
  const docs = new Map([
    ['boh_allstar_competition/current', rawSchedule(OFFSETS)],
    ['boh_allstar_config/current', { ...CONFIG }],
  ]);
  const writes = [];
  const db = {
    doc(path) {
      return {
        async get() {
          const data = docs.get(path);
          return { exists: Boolean(data), data: () => data };
        },
        async update(changes) {
          writes.push([path, changes]);
        },
      };
    },
  };
  const job = createCompetitionPhaseSyncJob({ db, now: () => T0 + 80 * H });
  const result = await job();
  assert.equal(result.phase, 'reupload');
  assert.deepEqual(writes, [['boh_allstar_config/current', { acceptNewSignups: false }]]);
});

test('syncCompetitionPhase is a quiet 10-minute schedule in us-central1', () => {
  const index = readFileSync('functions/index.js', 'utf8');
  assert.match(index, /export const syncCompetitionPhase = onSchedule\(/);
  const block = index.slice(index.indexOf('export const syncCompetitionPhase'));
  assert.match(block, /schedule: 'every 10 minutes'/);
  assert.match(block, /timeZone: 'UTC'/);
  assert.match(block, /region: 'us-central1'/);
  assert.doesNotMatch(index, /console\./);
});
