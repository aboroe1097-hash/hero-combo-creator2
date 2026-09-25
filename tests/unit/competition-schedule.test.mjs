import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMPETITION_BOH_SLOTS,
  COMPETITION_EPIC_SLOTS,
  competitionAcceptsNewSignups,
  competitionAcceptsReupload,
  competitionAcceptsSignupEdits,
  gameTimeToMillis,
  getCompetitionPhase,
  getCompetitionPhaseEndsAt,
  millisToGameTime,
  normalizeCompetitionSchedule,
  normalizeSlotSelection,
  slotToGameClock,
} from '../../js/competition-schedule.js';
import { GAME_TIME_UTC_OFFSET_MINUTES, getGameTimeState } from '../../js/game-time.js';

const at = (date, time) => gameTimeToMillis(date, time);
const RAW = {
  seasonId: 'season-2027',
  title: 'Competition #12',
  opensAt: at('2026-10-01', '08:00'),
  phase1ClosesAt: at('2026-10-05', '20:00'),
  deadlineAt: at('2026-10-06', '20:00'),
  reuploadOpensAt: at('2026-11-01', '08:00'),
  reuploadClosesAt: at('2026-11-03', '20:00'),
  winnersStartAt: at('2026-11-04', '08:00'),
  winnersEndAt: at('2026-11-11', '08:00'),
};

test('game time is UTC−2 in both directions', () => {
  assert.equal(GAME_TIME_UTC_OFFSET_MINUTES, -120);
  // 06:00 in Dubai (UTC+4) = 02:00Z = 00:00 game time.
  assert.equal(new Date(at('2026-10-01', '00:00')).toISOString(), '2026-10-01T02:00:00.000Z');
  assert.equal(new Date(at('2026-10-01', '08:00')).toISOString(), '2026-10-01T10:00:00.000Z');
  assert.equal(new Date(at('2026-10-01', '22:00')).toISOString(), '2026-10-02T00:00:00.000Z');
  assert.deepEqual(millisToGameTime(Date.parse('2026-10-01T23:30:00Z')), {
    date: '2026-10-01',
    time: '21:30',
  });
  assert.deepEqual(millisToGameTime(Date.parse('2026-10-02T01:59:00Z')), {
    date: '2026-10-01',
    time: '23:59',
  });
  assert.ok(Number.isNaN(at('2026-10-01', '8:00')));
  assert.ok(Number.isNaN(at('', '08:00')));
});

test('the schedule conversions agree with the header game clock (getGameTimeState)', () => {
  const instants = [
    '2026-10-01T00:00:00Z',
    '2026-10-01T01:59:59Z', // the last second of the previous game day
    '2026-10-01T02:00:00Z', // game midnight (06:00 in Dubai)
    '2026-10-01T02:00:01Z',
    '2026-10-01T13:37:00Z',
    '2026-10-01T23:30:00Z', // a new UTC day, still the same game day
    '2026-12-31T22:15:00Z', // across the year boundary: game 20:15 on 31 Dec
    '2027-01-01T02:00:00Z',
    '2027-03-28T01:00:00Z', // a European DST switch night; game time has no DST
  ];
  for (const iso of instants) {
    const ms = Date.parse(iso);
    const clock = getGameTimeState(new Date(ms));
    const converted = millisToGameTime(ms);
    assert.equal(converted.date, clock.gameDayKey, `${iso}: game date`);
    assert.equal(converted.time, clock.formatted, `${iso}: game time`);
    // Back to the same minute.
    assert.equal(
      gameTimeToMillis(converted.date, converted.time),
      ms - (ms % 60_000),
      `${iso}: round trip`
    );
  }
});

test('a schedule is accepted only with every instant, in order', () => {
  const schedule = normalizeCompetitionSchedule(RAW);
  assert.equal(schedule.seasonId, 'season-2027');
  assert.equal(normalizeCompetitionSchedule({ ...RAW, deadlineAt: undefined }), null);
  assert.equal(
    normalizeCompetitionSchedule({ ...RAW, reuploadOpensAt: RAW.deadlineAt - 1 }),
    null,
    'the re-upload cannot open before the deadline'
  );
  assert.equal(normalizeCompetitionSchedule({ ...RAW, seasonId: 'bad id' }), null);
  // Firestore Timestamps and ISO strings normalize the same way.
  const fromTimestamps = normalizeCompetitionSchedule({
    ...RAW,
    opensAt: { toMillis: () => RAW.opensAt },
    winnersEndAt: new Date(RAW.winnersEndAt).toISOString(),
  });
  assert.equal(fromTimestamps.opensAt, RAW.opensAt);
  assert.equal(fromTimestamps.winnersEndAt, RAW.winnersEndAt);
});

test('every boundary moves to the next phase at exactly its instant', () => {
  const schedule = normalizeCompetitionSchedule(RAW);
  const cases = [
    [RAW.opensAt - 1, 'upcoming'],
    [RAW.opensAt, 'registration'],
    [RAW.phase1ClosesAt - 1, 'registration'],
    [RAW.phase1ClosesAt, 'finalCheck'],
    [RAW.deadlineAt, 'waiting'],
    [RAW.reuploadOpensAt, 'reupload'],
    [RAW.reuploadClosesAt - 1, 'reupload'],
    [RAW.reuploadClosesAt, 'resultsPending'],
    [RAW.winnersStartAt, 'winners'],
    [RAW.winnersEndAt, 'closed'],
  ];
  for (const [now, phase] of cases) assert.equal(getCompetitionPhase(schedule, now), phase);
  assert.equal(getCompetitionPhase(null, RAW.opensAt), 'unconfigured');
  assert.equal(getCompetitionPhaseEndsAt(schedule, 'registration'), RAW.phase1ClosesAt);
  assert.equal(getCompetitionPhaseEndsAt(schedule, 'closed'), null);
});

test('what each phase allows', () => {
  assert.equal(competitionAcceptsNewSignups('registration'), true);
  assert.equal(competitionAcceptsNewSignups('finalCheck'), false);
  assert.equal(competitionAcceptsSignupEdits('finalCheck'), true);
  assert.equal(competitionAcceptsSignupEdits('waiting'), false);
  assert.equal(competitionAcceptsReupload('reupload'), true);
  assert.equal(competitionAcceptsReupload('registration'), false);
  // Without a schedule the page keeps its pre-competition behaviour.
  assert.equal(competitionAcceptsNewSignups('unconfigured'), true);
});

test('time slots keep the member order, drop repeats and reject unknown slots', () => {
  assert.deepEqual(COMPETITION_BOH_SLOTS, ['+8', '+12', '+14', '+20']);
  assert.deepEqual(COMPETITION_EPIC_SLOTS, ['+10', '+13', '+16', '+19']);
  assert.deepEqual(normalizeSlotSelection(['+20', '+8', '+20'], COMPETITION_BOH_SLOTS), [
    '+20',
    '+8',
  ]);
  assert.throws(
    () => normalizeSlotSelection(['+10'], COMPETITION_BOH_SLOTS),
    (error) => error.code === 'competition_slot_invalid'
  );
  assert.throws(
    () => normalizeSlotSelection([], COMPETITION_EPIC_SLOTS),
    (error) => error.code === 'competition_slot_required'
  );
  assert.deepEqual(normalizeSlotSelection([], COMPETITION_EPIC_SLOTS, { min: 0 }), []);
  assert.equal(slotToGameClock('+8'), '08:00');
  assert.equal(slotToGameClock('+19'), '19:00');
});
