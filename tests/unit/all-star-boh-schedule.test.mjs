import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveAllStarBohEventScheduleState,
  getAllStarBohCountdownParts,
  getAllStarBohSignupWindowState,
  normalizeAllStarBohEventSchedule,
  normalizeAllStarBohSignupWindow,
} from '../../js/all-star-boh-schedule.js';

const WINDOW = Object.freeze({
  opensAt: '2026-07-20T18:00:00.000Z',
  closesAt: '2026-07-24T18:00:00.000Z',
});

test('signup window requires ordered canonical timestamps', () => {
  assert.deepEqual(normalizeAllStarBohSignupWindow(WINDOW), WINDOW);
  assert.deepEqual(normalizeAllStarBohSignupWindow({ ...WINDOW, opensAt: 'July 20' }), {
    opensAt: '',
    closesAt: '',
  });
  assert.deepEqual(
    normalizeAllStarBohSignupWindow({ opensAt: WINDOW.closesAt, closesAt: WINDOW.opensAt }),
    { opensAt: '', closesAt: '' }
  );
});

test('signup window advances from upcoming to open to closed at exact boundaries', () => {
  assert.equal(
    getAllStarBohSignupWindowState(WINDOW, Date.parse(WINDOW.opensAt) - 1).phase,
    'upcoming'
  );
  assert.equal(getAllStarBohSignupWindowState(WINDOW, Date.parse(WINDOW.opensAt)).phase, 'open');
  assert.equal(getAllStarBohSignupWindowState(WINDOW, Date.parse(WINDOW.closesAt)).phase, 'closed');
});

test('countdown splits remaining time into stable day and clock parts', () => {
  assert.deepEqual(getAllStarBohCountdownParts(90_061), {
    days: 1,
    hours: 1,
    minutes: 1,
    seconds: 1,
  });
});

test('event schedule normalizer scrubs hidden and validates published range data', () => {
  assert.deepEqual(
    normalizeAllStarBohEventSchedule({
      seasonId: 'season-2026',
      status: 'hidden',
      eventStartsAt: WINDOW.opensAt,
      eventEndsAt: WINDOW.closesAt,
      milestones: [{ id: 'ignored', label: 'Ignored', startsAt: WINDOW.opensAt }],
      teamGameTimes: [{ teamId: 'team-1', startsAt: WINDOW.opensAt }],
      revision: 3,
      updatedBy: 'admin-1',
    }),
    {
      schemaVersion: 1,
      seasonId: 'season-2026',
      status: 'hidden',
      eventStartsAt: '',
      eventEndsAt: '',
      milestones: [],
      teamGameTimes: [],
      revision: 3,
      createdAt: null,
      updatedAt: null,
      updatedBy: 'admin-1',
    }
  );
  const published = normalizeAllStarBohEventSchedule({
    seasonId: 'season-2026',
    status: 'published',
    eventStartsAt: WINDOW.opensAt,
    eventEndsAt: WINDOW.closesAt,
    milestones: [{ id: 'signup_close', label: 'Signup closes', startsAt: WINDOW.opensAt }],
    teamGameTimes: [{ teamId: 'team-1', startsAt: '2026-07-21T18:00:00.000Z' }],
  });
  assert.equal(published.teamGameTimes[0].teamId, 'team-1');
  assert.throws(
    () =>
      normalizeAllStarBohEventSchedule({
        seasonId: 'season-2026',
        status: 'published',
        eventStartsAt: WINDOW.opensAt,
        eventEndsAt: WINDOW.closesAt,
        teamGameTimes: [
          { teamId: 'team-1', startsAt: WINDOW.opensAt },
          { teamId: 'team-1', startsAt: WINDOW.opensAt },
        ],
      }),
    /duplicate identifiers/
  );
});

test('event schedule derivation reports countdown and current or next item', () => {
  const schedule = normalizeAllStarBohEventSchedule({
    seasonId: 'season-2026',
    status: 'published',
    eventStartsAt: WINDOW.opensAt,
    eventEndsAt: WINDOW.closesAt,
    milestones: [{ id: 'middle', label: 'Middle', startsAt: '2026-07-22T18:00:00.000Z' }],
    teamGameTimes: [{ teamId: 'team-1', startsAt: '2026-07-23T18:00:00.000Z' }],
  });
  const upcoming = deriveAllStarBohEventScheduleState(schedule, Date.parse(WINDOW.opensAt) - 1000);
  assert.equal(upcoming.phase, 'upcoming');
  assert.equal(upcoming.next.id, 'event-start');
  assert.equal(upcoming.countdown.remainingSeconds, 1);
  const live = deriveAllStarBohEventScheduleState(schedule, Date.parse('2026-07-22T19:00:00.000Z'));
  assert.equal(live.phase, 'live');
  assert.equal(live.current.id, 'middle');
  assert.equal(live.next.teamId, 'team-1');
});
