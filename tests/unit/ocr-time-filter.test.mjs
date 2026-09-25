import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterGameTimeAttacks,
  formatGameTimeDatePrefix,
  getGameTimeNow,
  getGameWeekStartMs,
  parseGameTimeDateMs,
} from '../../js/ocr-time-filter.js';

test('game time now is UTC minus two hours, matching the header clock', () => {
  // 22:30Z is 20:30 game time on the same day; 02:30Z is 00:30 the next day.
  assert.equal(
    formatGameTimeDatePrefix(getGameTimeNow(Date.UTC(2026, 5, 21, 22, 30))),
    '21/06/2026'
  );
  assert.equal(
    formatGameTimeDatePrefix(getGameTimeNow(Date.UTC(2026, 5, 22, 1, 59))),
    '21/06/2026'
  );
  assert.equal(formatGameTimeDatePrefix(getGameTimeNow(Date.UTC(2026, 5, 22, 2, 0))), '22/06/2026');
});

test('daily attack filter uses the UTC−2 game calendar day', () => {
  const attacks = [
    { game_time: '21/06/2026, Sunday, 23:55 GT', id: 'sunday' },
    { game_time: '22/06/2026, Monday, 00:05 GT', id: 'monday' },
  ];

  // 23:00 game time on Sunday is still Sunday's game day...
  const sunday = filterGameTimeAttacks(attacks, 'daily', Date.UTC(2026, 5, 22, 1, 0));
  assert.deepEqual(
    sunday.map((attack) => attack.id),
    ['sunday']
  );
  // ...and 00:30 game time is Monday's.
  const monday = filterGameTimeAttacks(attacks, 'daily', Date.UTC(2026, 5, 22, 2, 30));
  assert.deepEqual(
    monday.map((attack) => attack.id),
    ['monday']
  );
});

test('parsed game time keeps GT day and hour in UTC accessors', () => {
  const attackDate = new Date(parseGameTimeDateMs('26/06/2026, Friday, 23:00 GT'));

  assert.equal(attackDate.getUTCDay(), 5);
  assert.equal(attackDate.getUTCHours(), 23);
});

test('weekly attack filter starts on Monday in game time', () => {
  const attacks = [
    { game_time: '21/06/2026, Sunday, 23:55 GT', id: 'previous-week' },
    { game_time: '22/06/2026, Monday, 00:05 GT', id: 'monday' },
    { game_time: '24/06/2026, Wednesday, 10:00 GT', id: 'wednesday' },
  ];

  const gtNow = getGameTimeNow(Date.UTC(2026, 5, 24, 10, 0));
  assert.equal(new Date(getGameWeekStartMs(gtNow)).toISOString(), '2026-06-22T00:00:00.000Z');

  const result = filterGameTimeAttacks(attacks, 'weekly', Date.UTC(2026, 5, 24, 10, 0));

  assert.deepEqual(
    result.map((attack) => attack.id),
    ['monday', 'wednesday']
  );
});
