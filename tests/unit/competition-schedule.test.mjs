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

test('game time is UTC+2 in both directions', () => {
  assert.equal(new Date(at('2026-10-01', '08:00')).toISOString(), '2026-10-01T06:00:00.000Z');
  assert.deepEqual(millisToGameTime(Date.parse('2026-10-01T23:30:00Z')), {
    date: '2026-10-02',
    time: '01:30',
  });
  assert.ok(Number.isNaN(at('2026-10-01', '8:00')));
  assert.ok(Number.isNaN(at('', '08:00')));
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
