import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLIANCE_MATCH_STATUSES,
  applyRosterOverrides,
  assignRosterEdenAccount,
  buildAllianceViewRows,
  confirmRosterNameChange,
  createManualRosterMember,
  exportAllianceRowsCsv,
  filterAllianceRows,
  getActivityBand,
  getAllianceContributionMetrics,
  getBonusBand,
  getEffectiveRosterMember,
  getExtendedScoreBand,
  getAllianceEdenSourceId,
  matchRosterAccounts,
  parseAllianceRosterCsv,
  parseRosterActivity,
  rankAllianceRows,
  reconcileAllianceRoster,
  resetRosterOverrides,
  selectAllianceRows,
  sortAllianceRows,
  summarizeAllianceRows,
  transferRosterMember,
} from '../../js/alliance-view-model.js';

const NOW = Date.UTC(2026, 6, 16, 12, 0, 0);
const HEADERS = 'Name,Alliance,Rank,Server,Castle Level,Total Power,Last Online';

function csv(...rows) {
  return [HEADERS, ...rows].join('\n');
}

function member(name, allianceId = 'vts', extra = {}) {
  return createManualRosterMember(
    {
      name,
      alliance: allianceId.toUpperCase(),
      rank: 'R3',
      server: '1097',
      castleLevel: 30,
      totalPower: 100000000,
      lastOnline: '1h',
      ...extra,
    },
    { allianceId, now: NOW, id: extra.id }
  );
}

test('roster CSV parser preserves Unicode, raw fields, quoted commas, and absolute activity', () => {
  const result = parseAllianceRosterCsv(
    csv(
      '"تعويذة, القمر",V3S,R4,1097,30,"123,456,789",2 hours ago',
      'Чапай,V3S,R3,1097,29,98765432,1d 30m'
    ),
    { allianceId: 'v3s', now: NOW }
  );

  assert.deepEqual(result.headerErrors, []);
  assert.equal(result.malformed.length, 0);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].imported.name, 'تعويذة, القمر');
  assert.equal(result.rows[0].imported.totalPower, 123456789);
  assert.equal(result.rows[0].importedRaw.totalPower, '123,456,789');
  assert.equal(result.rows[0].activityRaw, '2 hours ago');
  assert.equal(result.rows[0].activityAtMs, NOW - 2 * 60 * 60 * 1000);
  assert.equal(result.rows[1].activityAtMs, NOW - (24 * 60 + 30) * 60 * 1000);
  assert.match(result.rows[0].id, /^av_v3s_/);

  const repeat = parseAllianceRosterCsv(
    csv('"تعويذة, القمر",V3S,R4,1097,30,"123,456,789",2 hours ago'),
    { allianceId: 'v3s', now: NOW + 1000 }
  );
  assert.equal(repeat.rows[0].id, result.rows[0].id);
});

test('roster parser reports malformed rows and required header errors without accepting them', () => {
  const result = parseAllianceRosterCsv(
    csv(',VTS,R3,1097,30,1000,1h', 'Valid,VTS,R3,1097,thirty,1000,1h'),
    { allianceId: 'vts', now: NOW }
  );
  assert.equal(result.rows.length, 0);
  assert.deepEqual(
    result.malformed.map((row) => row.errors),
    [['missing_name'], ['invalid_castle_level']]
  );

  const wrongHeaders = parseAllianceRosterCsv('Name,Alliance\nAlpha,VTS', {
    allianceId: 'vts',
    now: NOW,
  });
  assert.ok(wrongHeaders.headerErrors.includes('missing_header:lastonline'));
  assert.equal(wrongHeaders.rows.length, 0);
});

test('activity parsing covers current, relative, absolute, unknown, invalid, and display bands', () => {
  assert.equal(parseRosterActivity('Online', NOW).activityAtMs, NOW);
  assert.equal(parseRosterActivity('2 weeks 3 days ago', NOW).activityAtMs, NOW - 17 * 86400000);
  assert.equal(parseRosterActivity('2026-07-15T10:00:00Z', NOW).kind, 'absolute');
  assert.equal(parseRosterActivity('Never', NOW).activityAtMs, null);
  assert.equal(parseRosterActivity('some day maybe', NOW).valid, false);
  assert.equal(getActivityBand(NOW - 48 * 3600000, NOW).key, 'recent');
  assert.equal(getActivityBand(NOW - 49 * 3600000, NOW).key, 'aging');
  assert.equal(getActivityBand(NOW - 7 * 86400000, NOW).key, 'aging');
  assert.equal(getActivityBand(NOW - 8 * 86400000, NOW).key, 'stale');
  assert.equal(getActivityBand(null, NOW).key, 'unknown');
});

test('extended and base formulas use signed Bonus Team Effort exactly', () => {
  const metrics = getAllianceContributionMetrics(
    {
      contributionScore: '120,000',
      contributionExGuild: 5000,
      banners: 2,
      pathers: 1,
      shieldWalls: 3,
      conductBonus: -2,
    },
    'base'
  );
  assert.equal(metrics.base, 125000);
  assert.equal(metrics.duties, 6);
  assert.equal(metrics.bonusTeamEffort, -2);
  assert.equal(metrics.extended, 165000);
  assert.equal(metrics.active, 125000);

  assert.equal(getBonusBand(-1).key, 'negative');
  assert.equal(getBonusBand(0).key, 'zero');
  assert.equal(getBonusBand(2).key, 'teal');
  assert.equal(getBonusBand(5).key, 'green');
  assert.equal(getBonusBand(6).key, 'gold');
  assert.equal(getExtendedScoreBand(9999).key, 'under_10k');
  assert.equal(getExtendedScoreBand(10000).key, '10k_49k');
  assert.equal(getExtendedScoreBand(50000).key, '50k_99k');
  assert.equal(getExtendedScoreBand(100000).key, '100k_199k');
  assert.equal(getExtendedScoreBand(200000).key, '200k_plus');
});

test('matching follows exact, normalized, verified alias, manual, then fuzzy-review order', () => {
  const members = [
    member('Exact Name', 'vts', { id: 'exact' }),
    member('Dëcörated Hero', 'vts', { id: 'normalized' }),
    member('Old Alias', 'vts', { id: 'alias' }),
    member('Manual Roster Name', 'vts', { id: 'manual' }),
    member('Alphx Typo', 'vts', { id: 'fuzzy' }),
  ];
  const edenRows = [
    { sourceId: 'e1', sourceName: 'Exact Name', contributionScore: 10 },
    { sourceId: 'e2', sourceName: 'Decorated Hero', contributionScore: 20 },
    { sourceId: 'e3', sourceName: 'Current Canonical', contributionScore: 30 },
    { sourceId: 'e4', sourceName: 'Different Manual Name', contributionScore: 40 },
    { sourceId: 'e5', sourceName: 'Alpha Typo', contributionScore: 50 },
  ];
  const matches = matchRosterAccounts(members, edenRows, {
    registryAliases: [{ canonical: 'Current Canonical', aliases: ['Old Alias'], verified: true }],
    manualMappings: { manual: 'e4' },
    fuzzyThreshold: 0.7,
  });

  assert.deepEqual(
    matches.map((row) => row.match.method),
    [
      'exact_source_name',
      'unique_normalized_name',
      'verified_registry_alias',
      'manual_account_mapping',
      'fuzzy_suggestion',
    ]
  );
  assert.equal(matches[4].match.status, ALLIANCE_MATCH_STATUSES.FUZZY_REVIEW);
  assert.equal(matches[4].match.requiresConfirmation, true);
  assert.equal(matches[4].edenRow, null);
  assert.equal(matches[4].match.suggestion.sourceId, 'e5');
});

test('matching never assigns one Eden source row to multiple roster accounts', () => {
  const matches = matchRosterAccounts(
    [member('Shared', 'v3s', { id: 'one' }), member('Shared', 'vts', { id: 'two' })],
    [{ sourceId: 'source-shared', sourceName: 'Shared', contributionScore: 100 }]
  );

  assert.equal(matches.filter((row) => row.edenRow).length, 1);
  assert.equal(matches[1].match.status, ALLIANCE_MATCH_STATUSES.DUPLICATE_CONFLICT);
  assert.equal(matches[1].match.reason, 'eden_source_already_assigned');
});

test('saved manual assignments override automatic name matches and disambiguate duplicate names', () => {
  const reassigned = member('Same Name', 'v3s', { id: 'reassigned' });
  reassigned.edenAssignment = {
    sourceId: 'manual-target',
    sourceName: 'Different Account',
    method: 'manual_account_mapping',
  };
  const [match] = matchRosterAccounts(
    [reassigned],
    [
      { sourceId: 'automatic-target', sourceName: 'Same Name', contributionScore: 100 },
      { sourceId: 'manual-target', sourceName: 'Different Account', contributionScore: 200 },
    ]
  );
  assert.equal(match.match.method, 'manual_account_mapping');
  assert.equal(match.match.sourceId, 'manual-target');
  assert.equal(match.edenRow.contributionScore, 200);

  const ambiguous = member('Duplicate', 'vts', { id: 'ambiguous' });
  ambiguous.edenAssignment = { sourceId: 'duplicate-2', sourceName: 'Duplicate' };
  const [resolved] = matchRosterAccounts(
    [ambiguous],
    [
      { sourceId: 'duplicate-1', sourceName: 'Duplicate' },
      { sourceId: 'duplicate-2', sourceName: 'Duplicate' },
    ]
  );
  assert.equal(resolved.match.sourceId, 'duplicate-2');
  assert.equal(resolved.match.status, ALLIANCE_MATCH_STATUSES.MATCHED);
});

test('verified registry identity matches aliases used on opposite datasets', () => {
  const [match] = matchRosterAccounts(
    [member('OldHero', 'v3s', { id: 'old-hero' })],
    [{ sourceId: 'new-hero-source', sourceName: 'NewHero', contributionScore: 300 }],
    {
      registryAliases: [
        { canonical: 'Hero', aliases: ['Hero', 'OldHero', 'NewHero'], verified: true },
      ],
    }
  );
  assert.equal(match.match.method, 'verified_registry_alias');
  assert.equal(match.match.sourceId, 'new-hero-source');
});

test('fallback Eden source IDs are stable when contribution ranking order changes', () => {
  const alpha = { sourceName: 'Alpha Banner', playerKey: 'alpha-family' };
  const bravo = { sourceName: 'Bravo Farm', playerKey: 'bravo-family' };
  assert.equal(
    getAllianceEdenSourceId(alpha),
    getAllianceEdenSourceId({ ...alpha, finalRank: 99 })
  );
  assert.notEqual(getAllianceEdenSourceId(alpha), getAllianceEdenSourceId(bravo));
});

test('matching applies higher-priority authorities across the whole roster first', () => {
  const matches = matchRosterAccounts(
    [
      member('Álpha', 'v3s', { id: 'normalized-first' }),
      member('Alpha', 'vts', { id: 'exact-later' }),
    ],
    [{ sourceId: 'alpha-source', sourceName: 'Alpha', contributionScore: 100 }]
  );

  assert.equal(matches[1].match.method, 'exact_source_name');
  assert.equal(matches[1].edenRow.sourceId, 'alpha-source');
  assert.equal(matches[0].match.status, ALLIANCE_MATCH_STATUSES.DUPLICATE_CONFLICT);
  assert.equal(matches[0].edenRow, null);
});

test('unmatched and fuzzy roster accounts remain visible with zero contribution', () => {
  const members = [
    member('No Match At All', 'v3s', { id: 'none' }),
    member('Almost Herp', 'vts', { id: 'almost' }),
  ];
  const matches = matchRosterAccounts(
    members,
    [{ sourceId: 'hero', sourceName: 'Almost Hero', contributionScore: 999999 }],
    { fuzzyThreshold: 0.7 }
  );
  const rows = buildAllianceViewRows(matches, { now: NOW });

  assert.equal(rows.length, 2);
  assert.equal(rows[0].matchStatus, ALLIANCE_MATCH_STATUSES.UNMATCHED);
  assert.equal(rows[0].extended, 0);
  assert.equal(rows[1].matchStatus, ALLIANCE_MATCH_STATUSES.FUZZY_REVIEW);
  assert.equal(rows[1].contribution, 0);
});

test('ranking keeps every account separate, including banner and farm accounts', () => {
  const members = [
    member('Main', 'vts', { id: 'main' }),
    member('Main Banner', 'vts', { id: 'banner' }),
    member('Main Farm', 'v3s', { id: 'farm' }),
  ];
  const eden = [
    { sourceId: 'main-source', sourceName: 'Main', contributionScore: 100000 },
    { sourceId: 'banner-source', sourceName: 'Main Banner', contributionScore: 120000 },
    { sourceId: 'farm-source', sourceName: 'Main Farm', contributionScore: 110000 },
  ];
  const ranked = rankAllianceRows(buildAllianceViewRows(matchRosterAccounts(members, eden)), {
    metric: 'extended',
  });

  assert.equal(ranked.length, 3);
  assert.deepEqual(
    ranked.map((row) => [row.id, row.metricRank]),
    [
      ['banner', 1],
      ['farm', 2],
      ['main', 3],
    ]
  );
  assert.deepEqual(
    sortAllianceRows(ranked, { key: 'accountName', direction: 'asc' }).map((row) => row.id),
    ['main', 'banner', 'farm']
  );
});

test('manual overrides reset to imported values and transfers preserve stable member ID', () => {
  const original = member('Original', 'v3s', { id: 'stable-member', totalPower: 100 });
  const edited = applyRosterOverrides(
    original,
    { name: 'Renamed', totalPower: 200 },
    { now: NOW + 1 }
  );
  assert.equal(getEffectiveRosterMember(edited).name, 'Renamed');
  assert.equal(getEffectiveRosterMember(edited).totalPower, 200);
  assert.deepEqual(edited.knownNames, ['Original', 'Renamed']);

  const reset = resetRosterOverrides(edited, ['name', 'totalPower'], { now: NOW + 2 });
  assert.equal(getEffectiveRosterMember(reset).name, 'Original');
  assert.equal(getEffectiveRosterMember(reset).totalPower, 100);

  const transferred = transferRosterMember(edited, 'vts', { allianceName: 'VTS', now: NOW + 3 });
  assert.equal(transferred.id, 'stable-member');
  assert.equal(transferred.allianceId, 'vts');
  assert.equal(getEffectiveRosterMember(transferred).alliance, 'VTS');

  const activityEdited = applyRosterOverrides(
    original,
    { lastOnline: 'Manual timestamp', activityAtMs: NOW + 5000 },
    { now: NOW + 5000 }
  );
  assert.equal(activityEdited.activityAtMs, NOW + 5000);
  const activityReset = resetRosterOverrides(activityEdited, 'lastOnline', {
    now: NOW + 10 * 86400000,
  });
  assert.equal(activityReset.activityAtMs, NOW - 3600000);
});

test('confirmed imported name changes preserve a manual activity override', () => {
  const existing = applyRosterOverrides(
    member('Old Name', 'v3s', { id: 'rename-activity' }),
    { lastOnline: 'Leadership override', activityAtMs: NOW - 5 * 86400000 },
    { now: NOW }
  );
  const incoming = member('New Name', 'v3s', { id: 'incoming-name', lastOnline: '10m' });
  const confirmed = confirmRosterNameChange(existing, incoming, { now: NOW + 1000 });

  assert.equal(confirmed.id, 'rename-activity');
  assert.equal(confirmed.activityRaw, 'Leadership override');
  assert.equal(confirmed.activityAtMs, NOW - 5 * 86400000);
  assert.equal(confirmed.overrides.lastOnline, 'Leadership override');
});

test('manual Eden reassignment stores audit data and rejects a duplicate account assignment', () => {
  const first = member('First', 'v3s', { id: 'first' });
  const second = member('Second', 'vts', { id: 'second' });
  const assigned = assignRosterEdenAccount(
    first,
    { sourceId: 'eden-1', sourceName: 'First Source', playerKey: 'first-source' },
    { now: NOW, confirmedBy: 'admin-uid', members: [first, second] }
  );
  assert.deepEqual(assigned.edenAssignment, {
    sourceId: 'eden-1',
    sourceName: 'First Source',
    playerKey: 'first-source',
    method: 'manual_account_mapping',
    confirmedAtMs: NOW,
    confirmedBy: 'admin-uid',
  });

  assert.throws(
    () =>
      assignRosterEdenAccount(
        second,
        { sourceId: 'eden-1', sourceName: 'First Source' },
        {
          now: NOW,
          members: [assigned, second],
        }
      ),
    (error) => error.code === 'duplicate-eden-assignment' && error.memberId === 'first'
  );

  assert.throws(
    () =>
      assignRosterEdenAccount(
        second,
        { sourceId: 'eden-auto' },
        {
          now: NOW,
          members: [first, second],
          matchResults: [
            {
              member: first,
              match: { sourceId: 'eden-auto', status: ALLIANCE_MATCH_STATUSES.MATCHED },
            },
          ],
        }
      ),
    (error) => error.code === 'duplicate-eden-assignment' && error.memberId === 'first'
  );
});

test('reconciliation previews added, removed, updated, malformed, and possible renamed rows', () => {
  const originalImport = parseAllianceRosterCsv(
    csv(
      'Alpha,V3S,R3,1097,30,100000,1h',
      'Old Name,V3S,R4,1097,29,200000,2h',
      'Removed,V3S,R2,1097,28,300000,3h'
    ),
    { allianceId: 'v3s', now: NOW }
  );
  const current = originalImport.rows.map((row) =>
    row.imported.name === 'Alpha'
      ? {
          ...applyRosterOverrides(
            row,
            { lastOnline: 'Manual activity', activityAtMs: NOW - 5 * 86400000 },
            { now: NOW }
          ),
          edenAssignment: { sourceId: 'alpha-source', sourceName: 'Alpha' },
        }
      : row
  );
  const nextImport = parseAllianceRosterCsv(
    csv(
      'Alpha,V3S,R3,1098,30,110000,30m',
      'New Name,V3S,R4,1097,29,201000,2h',
      'Added,V3S,R1,1097,30,400000,Online',
      ',V3S,R1,1097,30,100,1h'
    ),
    { allianceId: 'v3s', now: NOW + 3600000 }
  );
  const preview = reconcileAllianceRoster(current, nextImport);

  assert.equal(preview.updated.length, 1);
  assert.equal(preview.updated[0].after.id, preview.updated[0].before.id);
  assert.equal(preview.updated[0].after.imported.server, '1098');
  assert.equal(preview.updated[0].after.activityRaw, 'Manual activity');
  assert.equal(preview.updated[0].after.activityAtMs, NOW - 5 * 86400000);
  assert.equal(preview.updated[0].after.edenAssignment.sourceId, 'alpha-source');
  assert.equal(preview.added.length, 2);
  assert.equal(preview.removed.length, 2);
  assert.equal(preview.malformed.length, 1);
  assert.equal(preview.hasBlockingErrors, true);
  assert.equal(preview.requiresReview, true);
  assert.equal(preview.possibleRenamed.length, 1);
  assert.equal(preview.possibleRenamed[0].before.imported.name, 'Old Name');
  assert.equal(preview.possibleRenamed[0].after.imported.name, 'New Name');
  assert.equal(preview.possibleRenamed[0].requiresConfirmation, true);

  const confirmed = confirmRosterNameChange(
    preview.possibleRenamed[0].before,
    preview.possibleRenamed[0].after,
    { now: NOW + 4000000 }
  );
  assert.equal(confirmed.id, preview.possibleRenamed[0].before.id);
  assert.deepEqual(confirmed.knownNames, ['Old Name', 'New Name']);
});

test('filters, Top-100 selection, and audit export use the requested metric', () => {
  const rows = Array.from({ length: 120 }, (_, index) => ({
    id: `row-${index + 1}`,
    accountName: index === 119 ? '=Formula Name' : `Player ${index + 1}`,
    allianceId: index % 2 ? 'vts' : 'v3s',
    alliance: index % 2 ? 'VTS' : 'V3S',
    rank: index % 3 ? 'R3' : 'R4',
    server: '1097',
    castleLevel: 30,
    totalPower: index * 1000,
    activityAtMs: NOW,
    activityBand: getActivityBand(NOW, NOW),
    matchStatus: 'matched',
    matchMethod: 'exact_source_name',
    matchConfidence: 1,
    matchReason: '',
    edenSourceId: `eden-${index + 1}`,
    edenSourceName: `Eden ${index + 1}`,
    contribution: index,
    exGuild: 0,
    base: index,
    extended: index,
    active: index,
    duties: 0,
    shieldWalls: 0,
    pathers: 0,
    banners: 0,
    bonusTeamEffort: 0,
  }));

  const filtered = filterAllianceRows(rows, {
    alliance: 'vts',
    rank: 'R3',
    powerMin: 50000,
    metric: 'base',
    metricMin: 50,
  });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((row) => row.allianceId === 'vts' && row.rank === 'R3'));

  const top = selectAllianceRows(rows, { metric: 'base', limit: 100 });
  assert.equal(top.length, 100);
  assert.equal(top[0].id, 'row-120');
  assert.equal(top[99].id, 'row-21');
  assert.deepEqual(summarizeAllianceRows(rows, { metric: 'base' }), {
    accounts: 120,
    matched: 120,
    unmatched: 0,
    topCount: 100,
    topByAlliance: { vts: 50, v3s: 50 },
  });

  const exported = exportAllianceRowsCsv(top);
  assert.match(exported, /"Match Method"/);
  assert.match(exported, /"Eden Source ID"/);
  assert.match(exported, /"'=Formula Name"/);
});
