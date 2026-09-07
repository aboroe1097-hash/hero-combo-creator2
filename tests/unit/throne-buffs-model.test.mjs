import assert from 'node:assert/strict';
import test from 'node:test';

import {
  THRONE_BUFFS,
  THRONE_BUFF_IDS,
  getThroneBuff,
  throneBuffIconPath,
  throneBuffInitials,
} from '../../js/throne-buffs-data.js';
import {
  assignedCount,
  buildFairnessTable,
  buildNameSuggestions,
  candidatesForBuff,
  compareWeekKeysDesc,
  duplicateMembersInWeek,
  isoWeekKey,
  isValidWeekKey,
  normalizeMemberName,
  normalizeReason,
  normalizeWeekAssignment,
  searchAssignmentHistory,
  summarizeThroneBuffs,
} from '../../js/throne-buffs-model.js';

test('the catalog is the eight Hero titles plus the Emperor', () => {
  assert.equal(THRONE_BUFFS.length, 9);
  assert.equal(THRONE_BUFFS.filter((buff) => buff.group === 'hero').length, 8);
  assert.equal(THRONE_BUFFS.filter((buff) => buff.group === 'emperor').length, 1);
  assert.equal(new Set(THRONE_BUFF_IDS).size, 9, 'buff ids are unique');
  assert.equal(THRONE_BUFFS[0].id, 'emperor', 'Emperor leads the list');
});

test('catalog effects are transcribed from the in-game panel', () => {
  assert.deepEqual(getThroneBuff('finance-minister').effects, [
    { label: 'Total Resource Income', value: '+50%' },
    { label: 'Food Cost', value: '-10%' },
    { label: 'Gathering Speed', value: '+20%' },
  ]);
  assert.deepEqual(getThroneBuff('minister-of-construction').effects, [
    { label: 'Build Speed', value: '+10%' },
  ]);
  assert.equal(getThroneBuff('nope'), null);
});

test('icon paths and initials fall back cleanly', () => {
  assert.equal(throneBuffIconPath('royal-guard'), 'images/throne/royal-guard.webp');
  assert.equal(throneBuffInitials('prime-minister'), 'PM');
  assert.equal(throneBuffInitials('queen'), 'QU');
});

test('ISO week keys are Monday-based and survive a year boundary', () => {
  // 2026-01-01 is a Thursday, so it belongs to 2026-W01.
  assert.equal(isoWeekKey(new Date(2026, 0, 1)), '2026-W01');
  // 2027-01-01 is a Friday, which ISO puts in the last week of 2026.
  assert.equal(isoWeekKey(new Date(2027, 0, 1)), '2026-W53');
  // Monday and the following Sunday share a key.
  assert.equal(isoWeekKey(new Date(2026, 7, 10)), isoWeekKey(new Date(2026, 7, 16)));
  // The next Monday does not.
  assert.notEqual(isoWeekKey(new Date(2026, 7, 16)), isoWeekKey(new Date(2026, 7, 17)));
  assert.equal(isoWeekKey('not a date'), '');
});

test('week keys validate and sort newest first', () => {
  assert.ok(isValidWeekKey('2026-W07'));
  assert.ok(!isValidWeekKey('2026-W7'));
  assert.ok(!isValidWeekKey(''));
  const weeks = ['2026-W02', '2027-W01', '2026-W10'];
  assert.deepEqual(weeks.sort(compareWeekKeysDesc), ['2027-W01', '2026-W10', '2026-W02']);
});

test('member names are trimmed, collapsed and length-capped', () => {
  assert.equal(normalizeMemberName('  Ramses   II  '), 'Ramses II');
  assert.equal(normalizeMemberName(null), '');
  assert.equal(normalizeMemberName('x'.repeat(80)).length, 40);
});

test('a saved week is pinned to the catalog, dropping unknown slots', () => {
  const record = normalizeWeekAssignment(
    {
      weekKey: '2026-W33',
      assignments: { queen: ' Alice ', 'not-a-buff': 'Mallory' },
      updatedAtMs: 1234,
      updatedBy: 'uid-1',
    },
    THRONE_BUFF_IDS
  );
  assert.equal(record.weekKey, '2026-W33');
  assert.equal(record.assignments.queen, 'Alice');
  assert.equal(record.assignments['royal-guard'], '', 'unfilled slots are explicit');
  assert.ok(!('not-a-buff' in record.assignments), 'unknown slots are dropped');
  assert.equal(Object.keys(record.assignments).length, 9);
  assert.equal(record.updatedBy, 'uid-1');
});

test('an invalid week key is refused rather than guessed', () => {
  const record = normalizeWeekAssignment({ weekKey: 'last week' }, THRONE_BUFF_IDS);
  assert.equal(record.weekKey, '');
});

test('assigned count and same-week doubling up are both visible', () => {
  const week = normalizeWeekAssignment(
    { weekKey: '2026-W33', assignments: { queen: 'Alice', barrister: 'alice', emperor: 'Bob' } },
    THRONE_BUFF_IDS
  );
  assert.equal(assignedCount(week), 3);
  assert.deepEqual(duplicateMembersInWeek(week), ['alice']);
});

test('fairness ranks the least-served member first', () => {
  const history = [
    { weekKey: '2026-W31', assignments: { queen: 'Alice', emperor: 'Bob' } },
    { weekKey: '2026-W32', assignments: { queen: 'Alice', emperor: 'Cara' } },
    { weekKey: '2026-W33', assignments: { queen: 'Alice', emperor: 'Bob' } },
  ].map((record) => normalizeWeekAssignment(record, THRONE_BUFF_IDS));

  const fairness = buildFairnessTable(history, THRONE_BUFF_IDS);
  assert.equal(fairness.weekCount, 3);
  assert.equal(fairness.latestWeekKey, '2026-W33');
  assert.deepEqual(
    fairness.rows.map((row) => row.member),
    ['Cara', 'Bob', 'Alice']
  );
  assert.equal(fairness.rows[0].total, 1);
  assert.equal(fairness.rows[2].perBuff.queen, 3);
});

test('weeks since last is measured against the newest week, not today', () => {
  const history = [
    { weekKey: '2026-W30', assignments: { queen: 'Dana' } },
    { weekKey: '2026-W33', assignments: { queen: 'Erin' } },
  ].map((record) => normalizeWeekAssignment(record, THRONE_BUFF_IDS));

  const fairness = buildFairnessTable(history, THRONE_BUFF_IDS);
  const dana = fairness.rows.find((row) => row.member === 'Dana');
  const erin = fairness.rows.find((row) => row.member === 'Erin');
  assert.equal(erin.weeksSinceLast, 0);
  // One populated week sits between them in the history, not three calendar weeks.
  assert.equal(dana.weeksSinceLast, 1);
  assert.equal(dana.lastWeekKey, '2026-W30');
});

test('empty history yields an empty fairness table rather than throwing', () => {
  const fairness = buildFairnessTable([], THRONE_BUFF_IDS);
  assert.deepEqual(fairness.rows, []);
  assert.equal(fairness.latestWeekKey, '');
  assert.deepEqual(buildFairnessTable(null, THRONE_BUFF_IDS).rows, []);
});

test('records with an unusable week key never reach the fairness table', () => {
  const fairness = buildFairnessTable(
    [{ weekKey: '', assignments: { queen: 'Ghost' } }],
    THRONE_BUFF_IDS
  );
  assert.deepEqual(fairness.rows, []);
});

test('optional reasoning is trimmed, capped, and dropped with its slot', () => {
  assert.equal(normalizeReason('  covered   the   rally  '), 'covered the rally');
  assert.equal(normalizeReason('y'.repeat(200)).length, 120);

  const record = normalizeWeekAssignment(
    {
      weekKey: '2026-W33',
      assignments: { queen: 'Alice', emperor: '' },
      reasons: { queen: ' first gather week ', emperor: 'orphaned' },
    },
    THRONE_BUFF_IDS
  );
  assert.equal(record.reasons.queen, 'first gather week');
  assert.equal(record.reasons.emperor, '', 'a reason without a name is dropped');
});

test('name suggestions merge the Alliance View roster with past assignments', () => {
  const history = [
    { weekKey: '2026-W33', assignments: { queen: 'Outsider', emperor: 'Alice' } },
  ].map((record) => normalizeWeekAssignment(record, THRONE_BUFF_IDS));

  const suggestions = buildNameSuggestions({
    rosterMembers: [
      { name: 'Alice', alliance: 'VTS' },
      { name: 'Bob', allianceId: 'v3s' },
    ],
    history,
    buffIds: THRONE_BUFF_IDS,
  });

  assert.deepEqual(
    suggestions.map((entry) => entry.name),
    ['Alice', 'Bob', 'Outsider']
  );
  // A roster name keeps its alliance even though it also appears in history.
  assert.deepEqual(suggestions[0], { name: 'Alice', origin: 'roster', alliance: 'VTS' });
  // Someone from outside the rosters is still offered, with no invented alliance.
  assert.deepEqual(suggestions[2], { name: 'Outsider', origin: 'history', alliance: '' });
});

test('search returns one row per assignment, newest week first', () => {
  const history = [
    {
      weekKey: '2026-W32',
      assignments: { queen: 'Alice' },
      reasons: { queen: 'covered the rally' },
    },
    { weekKey: '2026-W33', assignments: { queen: 'Alice', emperor: 'Bob' } },
  ].map((record) => normalizeWeekAssignment(record, THRONE_BUFF_IDS));

  const byName = searchAssignmentHistory(history, THRONE_BUFF_IDS, 'ali');
  assert.deepEqual(
    byName.map((hit) => hit.weekKey),
    ['2026-W33', '2026-W32']
  );
  assert.equal(byName[0].buffId, 'queen');

  // Reasoning is searchable too, and matching is case-insensitive.
  const byReason = searchAssignmentHistory(history, THRONE_BUFF_IDS, 'RALLY');
  assert.equal(byReason.length, 1);
  assert.equal(byReason[0].weekKey, '2026-W32');

  assert.deepEqual(searchAssignmentHistory(history, THRONE_BUFF_IDS, '   '), []);
  assert.deepEqual(searchAssignmentHistory(history, THRONE_BUFF_IDS, 'nobody'), []);
});

test('the summary counts open slots and flags a doubled-up week', () => {
  const history = [
    { weekKey: '2026-W32', assignments: { queen: 'Alice' } },
    { weekKey: '2026-W33', assignments: { queen: 'Alice', emperor: 'Bob', barrister: 'bob' } },
  ].map((record) => normalizeWeekAssignment(record, THRONE_BUFF_IDS));

  const summary = summarizeThroneBuffs(history, THRONE_BUFF_IDS, history[1]);
  assert.equal(summary.weekCount, 2);
  assert.equal(summary.distinctMembers, 2, 'Bob and bob are one person');
  assert.equal(summary.slotCount, 9);
  assert.equal(summary.filledSlots, 3);
  assert.equal(summary.openSlots, 6);
  assert.deepEqual(summary.duplicateMembers, ['bob']);

  const empty = summarizeThroneBuffs([], THRONE_BUFF_IDS, null);
  assert.equal(empty.filledSlots, 0);
  assert.equal(empty.openSlots, 9);
});

test('candidates for a buff are everyone who has never held it', () => {
  const history = [
    { weekKey: '2026-W32', assignments: { queen: 'Alice', emperor: 'Bob' } },
    { weekKey: '2026-W33', assignments: { queen: 'Alice', emperor: 'Bob' } },
  ].map((record) => normalizeWeekAssignment(record, THRONE_BUFF_IDS));

  const fairness = buildFairnessTable(history, THRONE_BUFF_IDS);
  assert.deepEqual(candidatesForBuff(fairness, 'queen'), ['Bob']);
  assert.deepEqual(candidatesForBuff(fairness, 'emperor'), ['Alice']);
  assert.deepEqual(candidatesForBuff(fairness, 'royal-guard').sort(), ['Alice', 'Bob']);
});
