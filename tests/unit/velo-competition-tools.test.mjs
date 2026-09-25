import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { AI_TOOL_GROUPS } from '../../js/ai/contracts.js';
import { executeAiToolCall } from '../../js/ai/tool-registry.js';
import {
  buildCompetitionStatus,
  upcomingCompetitionDeadline,
} from '../../js/ai/competition-status.js';
import {
  DEADLINE_DISMISS_KEY,
  formatRemaining,
  readDismissedDeadlines,
  rememberDismissedDeadline,
  reminderText,
} from '../../js/ai/deadline-reminder.js';
import { deriveDeterministicActions, deriveExecutedSources } from '../../js/ai/ui-actions.js';
import { gameTimeToMillis } from '../../js/competition-schedule.js';

const HOUR = 3_600_000;
// An invented season; every instant is entered in game time (UTC−2), the way
// a superadmin enters it in VTS Admin.
const SCHEDULE = Object.freeze({
  seasonId: 'season-test',
  title: 'Test season',
  opensAt: gameTimeToMillis('2026-10-01', '08:00'),
  phase1ClosesAt: gameTimeToMillis('2026-10-03', '22:00'),
  deadlineAt: gameTimeToMillis('2026-10-04', '22:00'),
  reuploadOpensAt: gameTimeToMillis('2026-10-10', '08:00'),
  reuploadClosesAt: gameTimeToMillis('2026-10-12', '22:00'),
  winnersStartAt: gameTimeToMillis('2026-10-13', '10:00'),
  winnersEndAt: gameTimeToMillis('2026-10-20', '10:00'),
});

const base = { allowedToolGroups: [AI_TOOL_GROUPS.STATIC], locale: 'en', timeZone: 'UTC' };

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

test('get_competition_status reports the phase, next deadline and both clocks', async () => {
  const nowMs = SCHEDULE.reuploadClosesAt - 5 * HOUR;
  const result = await executeAiToolCall(
    { name: 'get_competition_status', arguments: {} },
    { ...base, nowMs, readCompetitionSchedule: async () => SCHEDULE }
  );
  assert.equal(result.ok, true);
  assert.equal(result.meta.sourceId, 'competition-schedule');
  assert.equal(result.data.published, true);
  assert.equal(result.data.phase, 'reupload');
  assert.equal(result.data.gameTimeZone, 'UTC−2');
  assert.equal(result.data.gameTimeUtcOffsetMinutes, -120);
  assert.equal(result.data.nextDeadline.event, 'reupload_closes');
  assert.equal(result.data.nextDeadline.at.gameTime, '22:00');
  assert.equal(result.data.nextDeadline.at.gameDate, '2026-10-12');
  // 22:00 game time (UTC−2) is 00:00 the next day in UTC.
  assert.equal(result.data.nextDeadline.at.localClock, '00:00');
  assert.deepEqual(result.data.nextDeadline.remaining, { days: 0, hours: 5, minutes: 0 });
  assert.equal(result.data.phases.length, 6);
  const reupload = result.data.phases.find((phase) => phase.phase === 'reupload');
  assert.equal(reupload.current, true);
  assert.equal(reupload.opens.gameTime, '08:00');
  assert.deepEqual(
    result.data.slotCatalogs.boh.map((slot) => slot.gameClock),
    ['08:00', '12:00', '14:00', '20:00']
  );
  assert.deepEqual(
    result.data.slotCatalogs.epic.map((slot) => slot.slot),
    ['+10', '+13', '+16', '+19']
  );
  assert.equal(result.data.slotCatalogs.boh[0].localClock, '10:00');
  assert.equal(result.data.acceptsReupload, true);
  assert.equal(result.data.acceptsNewSignups, false);
});

test('get_competition_status handles no published schedule and a failed read', async () => {
  const empty = await executeAiToolCall(
    { name: 'get_competition_status', arguments: {} },
    { ...base, readCompetitionSchedule: async () => null }
  );
  assert.equal(empty.ok, true);
  assert.equal(empty.data.published, false);
  assert.equal(empty.data.reason, 'no_schedule_published');
  assert.equal(empty.data.nextDeadline, null);
  assert.equal(empty.data.slotCatalogs.boh.length, 4);
  assert.ok(empty.meta.warnings.some((warning) => /No Competition #12 schedule/u.test(warning)));

  const broken = await executeAiToolCall(
    { name: 'get_competition_status', arguments: {} },
    { ...base, readCompetitionSchedule: async () => ({ seasonId: 'x', opensAt: 5 }) }
  );
  assert.equal(broken.data.reason, 'schedule_invalid');

  const failed = await executeAiToolCall(
    { name: 'get_competition_status', arguments: {} },
    {
      ...base,
      readCompetitionSchedule: async () => {
        throw new Error('offline');
      },
    }
  );
  assert.equal(failed.ok, false);
  assert.equal(failed.error.code, 'data_unavailable');
});

test('the drawer line appears only inside 48 hours of an action phase closing', () => {
  const at = (nowMs) =>
    upcomingCompetitionDeadline(
      buildCompetitionStatus(SCHEDULE, { nowMs, locale: 'en', timeZone: 'UTC' })
    );
  assert.equal(at(SCHEDULE.reuploadClosesAt - 49 * HOUR), null);
  const soon = at(SCHEDULE.reuploadClosesAt - 5 * HOUR);
  assert.equal(soon.phase, 'reupload');
  assert.equal(soon.gameTime, '22:00');
  assert.equal(soon.localClock, '00:00');
  assert.equal(
    soon.key,
    `season-test:reupload:${new Date(SCHEDULE.reuploadClosesAt).toISOString()}`
  );
  // Waiting for the re-upload to open is not a closing deadline.
  assert.equal(at(SCHEDULE.reuploadOpensAt - 2 * HOUR), null);
  assert.equal(at(SCHEDULE.phase1ClosesAt - HOUR).phase, 'registration');
  assert.equal(upcomingCompetitionDeadline(buildCompetitionStatus(null)), null);

  const copy = {
    'ai.reminder.line':
      'Competition #12 {phase} closes in {remaining} · game {game} ({zone}) · your time {local}',
    'ai.reminder.phase.reupload': 're-upload',
  };
  const translate = (key, vars = {}) =>
    Object.entries(vars).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, value),
      copy[key] || key
    );
  assert.equal(
    reminderText(soon, { translate, locale: 'en' }),
    'Competition #12 re-upload closes in 5h · game 22:00 (UTC−2) · your time 00:00'
  );
  assert.equal(formatRemaining({ days: 1, hours: 5, minutes: 10 }, 'en'), '29h');
  assert.equal(formatRemaining({ days: 0, hours: 0, minutes: 42 }, 'en'), '42m');
});

test('dismissals are remembered per deadline and survive broken storage', () => {
  const storage = new MemoryStorage();
  assert.deepEqual(readDismissedDeadlines(storage), []);
  rememberDismissedDeadline('a', storage);
  rememberDismissedDeadline('b', storage);
  assert.deepEqual(readDismissedDeadlines(storage), ['a', 'b']);
  storage.setItem(DEADLINE_DISMISS_KEY, '{not json');
  assert.deepEqual(readDismissedDeadlines(storage), []);
  const throwing = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  assert.deepEqual(readDismissedDeadlines(throwing), []);
  assert.deepEqual(rememberDismissedDeadline('c', throwing), ['c']);
});

function memberSession({ uid = 'uid-test', grant, signup, board } = {}) {
  return async () => ({
    user: { uid },
    readGrant: async () => grant,
    readSignup: async (season) => (season === grant?.seasonId ? signup : null),
    readBoard: async () => board,
  });
}

const myContext = (session) => ({
  allowedToolGroups: [AI_TOOL_GROUPS.STATIC, AI_TOOL_GROUPS.MY_COMPETITION],
  locale: 'en',
  timeZone: 'UTC',
  nowMs: SCHEDULE.reuploadClosesAt - 5 * HOUR,
  readCompetitionSchedule: async () => SCHEDULE,
  readMyCompetition: session,
});

const GRANT = { uid: 'uid-test', seasonId: 'season-test', expiresAt: Date.UTC(2027, 0, 1) };
const SIGNUP = {
  uid: 'uid-test',
  seasonId: 'season-test',
  gameName: 'Test Player',
  status: 'submitted',
  submittedAtMs: SCHEDULE.opensAt + HOUR,
  stats: {
    totalCastlePower: 123_000_000,
    troopPower: 40_000_000,
    buildingPower: 20_000_000,
    technologyPower: 30_000_000,
    heroCombatPower: 10_000_000,
    dragonPower: 5_000_000,
    unitSpecialtyPower: null,
    artifactPower: 2_000_000,
    rocLevel: 7,
  },
  commitment: {
    bohTimeSlots: ['+20', '+8'],
    epicTimeSlots: ['+13'],
    publicComparisonConsent: true,
  },
};
const BOARD = {
  seasonId: 'season-test',
  publishedAt: '2026-10-13T12:00:00.000Z',
  rows: [
    { rank: 1, gameName: 'Other Player', baselineSource: 'signup', growthPct: 9.9, growthAbs: 999 },
    {
      rank: 2,
      gameName: '(VTS) test player',
      baselineSource: 'vtsscore-2026',
      growthPct: 4.5,
      growthAbs: 5_000_000,
    },
  ],
  winners: [{ rank: 1, gameName: 'Other Player' }],
};

test('get_my_competition needs its own consent', async () => {
  const denied = await executeAiToolCall(
    { name: 'get_my_competition', arguments: {} },
    { ...myContext(memberSession({ grant: GRANT })), allowedToolGroups: [AI_TOOL_GROUPS.STATIC] }
  );
  assert.equal(denied.ok, false);
  assert.equal(denied.error.code, 'tool_not_allowed');
});

test('get_my_competition asks a signed-out member to sign in', async () => {
  const signedOut = await executeAiToolCall(
    { name: 'get_my_competition', arguments: {} },
    myContext(async () => ({ user: null }))
  );
  assert.equal(signedOut.ok, true);
  assert.equal(signedOut.data.signedIn, false);
  assert.equal(signedOut.data.reason, 'not_signed_in');
  assert.match(signedOut.data.message, /sign in/iu);

  const noGrant = await executeAiToolCall(
    { name: 'get_my_competition', arguments: {} },
    myContext(memberSession({ grant: null, signup: SIGNUP }))
  );
  assert.equal(noGrant.data.signedIn, false);
  assert.equal(noGrant.data.reason, 'no_member_access');
  assert.equal('registration' in noGrant.data, false);

  const expired = await executeAiToolCall(
    { name: 'get_my_competition', arguments: {} },
    myContext(memberSession({ grant: { ...GRANT, expiresAt: 1 }, signup: SIGNUP }))
  );
  assert.equal(expired.data.signedIn, false);
});

test('get_my_competition returns only the member own registration and growth', async () => {
  const result = await executeAiToolCall(
    { name: 'get_my_competition', arguments: {} },
    myContext(memberSession({ grant: GRANT, signup: SIGNUP, board: BOARD }))
  );
  assert.equal(result.ok, true);
  assert.equal(result.meta.sourceId, 'my-competition');
  const { data } = result;
  assert.equal(data.signedIn, true);
  assert.equal(data.seasonId, 'season-test');
  assert.equal(data.phase, 'reupload');
  assert.equal(data.acceptsReupload, true);
  assert.equal(data.registered, true);
  assert.equal(data.registration.rocLevel, 7);
  assert.deepEqual(data.registration.missingRequiredPowerFields, ['unitSpecialtyPower']);
  assert.ok(data.registration.filledPowerFields.includes('artifactPower'));
  assert.deepEqual(data.registration.missingOptionalPowerFields, ['royalTechPower']);
  assert.deepEqual(
    data.registration.activeTimes.boh.map((slot) => slot.gameClock),
    ['20:00', '08:00']
  );
  assert.equal(data.growth.listed, true);
  assert.equal(data.growth.baselineSource, 'vtsscore-2026');
  assert.equal(data.growth.growthPct, 4.5);
  assert.equal(data.growth.winnerRank, null);
  const text = JSON.stringify(data);
  assert.equal(text.includes('Other Player'), false, 'no other member appears');
  assert.equal(text.includes('123000000'), false, 'power values are not repeated');
});

test('get_my_competition respects a member who did not consent to the public board', async () => {
  const signup = {
    ...SIGNUP,
    commitment: { ...SIGNUP.commitment, publicComparisonConsent: false },
  };
  const result = await executeAiToolCall(
    { name: 'get_my_competition', arguments: {} },
    myContext(memberSession({ grant: GRANT, signup, board: BOARD }))
  );
  assert.equal(result.data.growth.listed, false);
  assert.equal('growthPct' in result.data.growth, false);
  assert.match(result.data.growth.note, /private/u);

  const unregistered = await executeAiToolCall(
    { name: 'get_my_competition', arguments: {} },
    myContext(memberSession({ grant: GRANT, signup: null, board: BOARD }))
  );
  assert.equal(unregistered.data.registered, false);
  assert.equal(unregistered.data.growth, null);
});

const rawBuildings = JSON.parse(readFileSync('database/building-upgrades-26-30.json', 'utf8'));
const buildingData = async () => ({
  BUILDING_UPGRADE_DATA: rawBuildings,
  CASTLE_UPGRADE_COSTS: rawBuildings.castleUpgradeCosts,
  CASTLE_UPGRADE_COST_SOURCE: rawBuildings.castleUpgradeCostSource,
});

test('get_building_costs returns Castle 26-30 and keeps unknown cells unknown', async () => {
  const castle = await executeAiToolCall(
    { name: 'get_building_costs', arguments: { kind: 'castle' } },
    { ...base, loadBuildingData: buildingData }
  );
  assert.equal(castle.ok, true);
  assert.equal(castle.meta.sourceId, 'building-upgrades');
  assert.deepEqual(
    castle.data.levels.map((level) => level.toLevel),
    [26, 27, 28, 29, 30]
  );
  assert.equal(castle.data.levels[4].resources.orichalcum, 8960);
  assert.equal(castle.data.levels[0].resources.gold, 40_000_000);
  assert.equal(castle.data.totals26to30.orichalcum, 22_790);
  assert.match(castle.data.source.url, /docs\.google\.com\/spreadsheets/u);

  const unknownRow = rawBuildings.buildings.find((building) =>
    building.levels.some((level) => level.cost === null)
  );
  assert.ok(unknownRow, 'the sheet has at least one blank cell');
  const one = await executeAiToolCall(
    { name: 'get_building_costs', arguments: { kind: 'building', building: unknownRow.name } },
    { ...base, loadBuildingData: buildingData }
  );
  assert.equal(one.data.found, true);
  assert.equal(one.meta.completeness, 'partial');
  const blank = unknownRow.levels.find((level) => level.cost === null).level;
  assert.equal(one.data.building.levels.find((level) => level.level === blank).orichalcum, null);
  assert.ok(one.data.building.unknownLevels.includes(blank));

  const list = await executeAiToolCall(
    { name: 'get_building_costs', arguments: { kind: 'list' } },
    { ...base, loadBuildingData: buildingData }
  );
  assert.equal(list.data.buildings.length, 43);

  const missing = await executeAiToolCall(
    { name: 'get_building_costs', arguments: { kind: 'building', building: 'Moon Base' } },
    { ...base, loadBuildingData: buildingData }
  );
  assert.equal(missing.data.found, false);
});

test('get_eden_operations states the pathing rule and degrades without counters', async () => {
  const rule = await executeAiToolCall(
    { name: 'get_eden_operations', arguments: { kind: 'pathing_rule', tiles: 81 } },
    base
  );
  assert.equal(rule.ok, true);
  assert.equal(rule.data.tilesPerPather, 40);
  assert.equal(rule.data.pathersNeeded, 3);
  const exact = await executeAiToolCall(
    { name: 'get_eden_operations', arguments: { kind: 'pathing_rule', tiles: 80 } },
    base
  );
  assert.equal(exact.data.pathersNeeded, 2);

  const readable = await executeAiToolCall(
    { name: 'get_eden_operations', arguments: { kind: 'staffing' } },
    {
      ...base,
      readSharedCounts: async () => ({
        readable: true,
        counts: { 'gate-3': { attackers: 4, support: 50 } },
      }),
    }
  );
  assert.equal(readable.data.countersReadable, true);
  assert.equal(readable.data.objectives.length, 1);
  const gate = readable.data.objectives[0];
  assert.equal(gate.key, 'gate-3');
  assert.equal(gate.requiredAttackers, 10);
  assert.equal(gate.assignedAttackers, 4);
  assert.equal(gate.missing, 6);
  assert.equal(gate.ready, false);

  const offline = await executeAiToolCall(
    { name: 'get_eden_operations', arguments: { kind: 'staffing', structure: 'gate-3' } },
    { ...base, readSharedCounts: async () => ({ readable: false, reason: 'not_signed_in' }) }
  );
  assert.equal(offline.ok, true);
  assert.equal(offline.data.countersReadable, false);
  assert.equal(offline.data.unreadableReason, 'not_signed_in');
  assert.equal(offline.data.objectives.length, 2);
  assert.equal(offline.data.objectives[0].assignedAttackers, null);
  assert.equal(offline.data.objectives[1].banner, true);
  assert.equal(offline.data.objectives[1].requiredAttackers, 5);
});

test('answers from the new tools offer buttons that open the right tool', async () => {
  const labels = (results) => deriveDeterministicActions(results).map((action) => action.href);
  const status = await executeAiToolCall(
    { name: 'get_competition_status', arguments: {} },
    { ...base, readCompetitionSchedule: async () => null }
  );
  assert.deepEqual(labels([status]), ['vtsscore.html']);
  const rule = await executeAiToolCall(
    { name: 'get_eden_operations', arguments: { kind: 'pathing_rule' } },
    base
  );
  // Pathing has its own button and must not also offer the Eden X1 page.
  assert.deepEqual(labels([rule]), ['index.html#edenHub?subtab=pathing']);
  const staffing = await executeAiToolCall(
    { name: 'get_eden_operations', arguments: { kind: 'staffing' } },
    { ...base, readSharedCounts: async () => ({ readable: false }) }
  );
  assert.deepEqual(labels([staffing]), ['index.html#edenHub?subtab=operations']);
  const castle = await executeAiToolCall(
    { name: 'get_building_costs', arguments: { kind: 'castle' } },
    { ...base, loadBuildingData: buildingData }
  );
  assert.deepEqual(labels([castle]), ['index.html#researchTowers?subtab=buildings']);
  const complaint = await executeAiToolCall(
    { name: 'get_toolkit_map', arguments: { query: 'how do I report a complaint' } },
    base
  );
  assert.equal(complaint.data.tools[0].id, 'complaints');
  assert.deepEqual(labels([complaint]), ['eden-x2.html#edenX1Complaints']);
  const sources = deriveExecutedSources([status, castle, staffing]).map((source) => source.label);
  assert.deepEqual(sources, [
    'Competition #12 schedule',
    'Buildings planner',
    'Eden Operations Lab',
  ]);
});
