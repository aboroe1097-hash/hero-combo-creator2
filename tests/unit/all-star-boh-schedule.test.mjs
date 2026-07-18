import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAllStarBohCountdownParts,
  getAllStarBohSignupWindowState,
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
