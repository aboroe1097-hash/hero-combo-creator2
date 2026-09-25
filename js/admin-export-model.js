// Pure row builders for the VTS Admin CSV exports (all-data, attack debug and
// duty debug). ocr-dashboard.js gathers what the dashboard holds in state and
// passes it in, so these functions can be unit-tested without a DOM.
//
// Admin data is the alliance's own record: no footer credits a data source,
// and the exports never carry complaints, credentials or PINs.

import { GAME_TIME_UTC_OFFSET_MINUTES } from './game-time.js';
import { parseGameTimeDateMs } from './ocr-time-filter.js';

// Append-only: spreadsheets and scripts read these by position.
export const ADMIN_EXPORT_COLUMNS = Object.freeze([
  ['Dataset', 'dataset'],
  ['Record ID', 'recordId'],
  ['Date', 'date'],
  ['Type', 'type'],
  ['Player', 'player'],
  ['Guild', 'guild'],
  ['Rank', 'rank'],
  ['Reward', 'reward'],
  ['Metric', 'metric'],
  ['Value', 'value'],
  ['Structure', 'structure'],
  ['Level', 'level'],
  ['Target', 'target'],
  ['Group', 'group'],
  ['Time', 'time'],
  ['Status', 'status'],
  ['Note', 'note'],
  ['Raw JSON', 'rawJson'],
  ['Date (ISO)', 'dateIso'],
]);

// ---------------------------------------------------------------------------
// Values

export function roundExportNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Number.isInteger(value)) {
    return value;
  }
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function isTimestampLike(value) {
  if (!value || typeof value !== 'object' || value instanceof Date) return false;
  if (typeof value.toMillis === 'function' || typeof value.toDate === 'function') return true;
  const seconds = value.seconds ?? value._seconds;
  return typeof seconds === 'number' && Number.isFinite(seconds);
}

// Firestore Timestamp (live or serialized), Date, {seconds, nanoseconds} or a
// millisecond number → ISO 8601 in UTC. Anything else → ''.
export function toIsoTimestamp(value) {
  let ms = NaN;
  if (value instanceof Date) ms = value.getTime();
  else if (typeof value === 'number') ms = value;
  else if (isTimestampLike(value)) {
    if (typeof value.toMillis === 'function') ms = value.toMillis();
    else if (typeof value.toDate === 'function') ms = value.toDate().getTime();
    else {
      const seconds = Number(value.seconds ?? value._seconds);
      const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0) || 0;
      ms = seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }
  if (!Number.isFinite(ms)) return '';
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function gameTimeOffsetSuffix() {
  const minutes = GAME_TIME_UTC_OFFSET_MINUTES;
  if (!minutes) return 'Z';
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? '-' : '+'}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

// Game-time strings ("30/08/2026, Sunday, 22:07 GT", "2026-08-30, 22:07") are
// wall-clock game time, so the ISO form keeps that clock and states the offset.
export function gameTimeToIso(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const rawGame = text.match(/^(\d{4})-(\d{2})-(\d{2}),\s*(\d{1,2}):(\d{2})/);
  if (rawGame) {
    return `${rawGame[1]}-${rawGame[2]}-${rawGame[3]}T${pad2(rawGame[4])}:${rawGame[5]}${gameTimeOffsetSuffix()}`;
  }
  const dmY = text.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(?:[A-Za-z]+,\s*)?(\d{1,2}):(\d{2}))?/
  );
  if (!dmY) return '';
  const ms = parseGameTimeDateMs(text);
  if (!Number.isFinite(ms)) return '';
  const date = new Date(ms);
  const day = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
  if (dmY[4] === undefined) return day;
  return `${day}T${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}${gameTimeOffsetSuffix()}`;
}

// The normalized "Date (ISO)" cell for any date value the admin datasets hold.
export function normalizeExportDate(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') return toIsoTimestamp(value);
  const text = value.trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const game = gameTimeToIso(text);
  if (game) return game;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const ms = Date.parse(text);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : '';
  }
  if (/^\d{10,13}$/.test(text)) return toIsoTimestamp(Number(text));
  return '';
}

// Keys never written to an export, at any depth: credentials, PINs, tokens,
// and personal contact numbers.
const SENSITIVE_KEY =
  /^(?:pin|pins|pinhash|pincode|memberpin|password|passcode|secret|token|idtoken|accesstoken|refreshtoken|credential|credentials|apikey|unlockcode|accesscode|contactnumber|phone|phonenumber)$|(?:Pin|PinHash|Password|Passcode|Secret|Token|Credential|ApiKey|UnlockCode|AccessCode)$/;

export function isSensitiveExportKey(key) {
  const text = String(key || '');
  return SENSITIVE_KEY.test(text.toLowerCase()) || SENSITIVE_KEY.test(text);
}

// Deep copy fit for an export: timestamps as ISO strings, floats rounded,
// sensitive keys dropped.
export function sanitizeForExport(value, depth = 0) {
  if (value === undefined || value === null) return value;
  if (depth > 12) return undefined;
  if (typeof value === 'number') return roundExportNumber(value);
  if (typeof value !== 'object') return value;
  if (value instanceof Date || isTimestampLike(value)) return toIsoTimestamp(value) || null;
  if (value instanceof Set) return [...value].map((entry) => sanitizeForExport(entry, depth + 1));
  if (value instanceof Map) {
    return sanitizeForExport(Object.fromEntries(value), depth + 1);
  }
  if (Array.isArray(value)) return value.map((entry) => sanitizeForExport(entry, depth + 1));
  const out = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (isSensitiveExportKey(key) || typeof entry === 'function') return;
    const clean = sanitizeForExport(entry, depth + 1);
    if (clean !== undefined) out[key] = clean;
  });
  return out;
}

export function stringifyForExport(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(roundExportNumber(value));
  if (typeof value !== 'object') return String(value);
  if (value instanceof Date || isTimestampLike(value)) return toIsoTimestamp(value);
  try {
    return JSON.stringify(sanitizeForExport(value));
  } catch (e) {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// CSV

export function csvCell(value) {
  return `"${stringifyForExport(value).replace(/"/g, '""')}"`;
}

export function csvLine(values) {
  return values.map(csvCell).join(',');
}

export function rowsToCsv(columnDefs, rows) {
  return [
    csvLine(columnDefs.map(([label]) => label)),
    ...rows.map((row) => csvLine(columnDefs.map(([, key]) => row[key]))),
  ].join('\n');
}

// Body plus footer, each footer line one quoted cell on its own line.
export function withCsvFooter(csv, footerCellLines = []) {
  const body = String(csv || '');
  const lines = Array.isArray(footerCellLines) ? footerCellLines : [];
  if (!lines.length) return body;
  return `${body}${body && !body.endsWith('\n') ? '\n' : ''}${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// All-data rows

export function pushAdminExportRow(rows, dataset, values = {}) {
  const dateSource = values.dateIsoSource !== undefined ? values.dateIsoSource : values.date;
  const date = values.date;
  rows.push({
    dataset,
    recordId: values.recordId || '',
    date: date && typeof date === 'object' ? toIsoTimestamp(date) : date === 0 ? '0' : date || '',
    type: values.type || '',
    player: values.player || '',
    guild: values.guild || '',
    rank: values.rank ?? '',
    reward: values.reward || '',
    metric: values.metric || '',
    value: roundExportNumber(values.value ?? ''),
    structure: values.structure || '',
    level: values.level ?? '',
    target: values.target || '',
    group: values.group || '',
    time: values.time || '',
    status: values.status || '',
    note: values.note || '',
    rawJson: values.rawJson === undefined ? '' : stringifyForExport(values.rawJson),
    dateIso: normalizeExportDate(dateSource),
  });
}

const arrayOf = (value) => (Array.isArray(value) ? value : []);
const text = (value) => (value === undefined || value === null ? '' : String(value));

export function roundWeightedCsvRow(row = {}) {
  const out = {};
  Object.entries(row).forEach(([key, value]) => {
    out[key] = roundExportNumber(value);
  });
  return out;
}

// Every dataset key the all-data export may emit, in output order. Tests and
// the manifest rows use it; the builder below must cover each one.
export const ADMIN_EXPORT_DATASETS = Object.freeze([
  'attack',
  'attack_player',
  'leaderboard_player',
  'roster_name',
  'roster_snapshot_member',
  'banner_assignment',
  'duty_entry',
  'contribution_entry',
  'ex_guild_contribution',
  'conduct_adjustment',
  'alliance',
  'weighted_contribution',
  'player_registry',
  'account_link',
  'player_alias',
  'main_account',
  'contribution_match',
  'conduct_suggestion',
  'duty_point_weight',
  'reward_setting',
  'vote_setting',
  'public_vote_result',
  'vote',
  'vote_history',
  'boh_match_result',
  'alliance_view_member',
  'r5_season',
  'competition_config',
  'competition_schedule',
  'competition_signup',
]);

// Datasets that only load when their dashboard tab opens. `loaded` false means
// the export could not include them, which the caller reports in a toast.
export function describeAdminExportCoverage(data = {}) {
  const loaded = data.loaded || {};
  const missing = [];
  if (loaded.conductSuggestions === false) missing.push('conduct_suggestion');
  if (loaded.bohMatchResults === false) missing.push('boh_match_result');
  if (loaded.votes === false) missing.push('vote', 'vote_history', 'public_vote_result');
  if (loaded.allianceView === false) missing.push('alliance_view_member');
  if (loaded.competition === false) {
    missing.push('competition_config', 'competition_schedule', 'competition_signup');
  }
  return missing;
}

function pushWeightRows(rows, settings = {}) {
  const weights = settings.weights && typeof settings.weights === 'object' ? settings.weights : {};
  const flatten = (prefix, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([key, entry]) =>
        flatten(prefix ? `${prefix}.${key}` : key, entry)
      );
      return;
    }
    pushAdminExportRow(rows, 'duty_point_weight', {
      recordId: `weights.${prefix}`,
      type: 'duty_weight',
      metric: prefix,
      value,
      rawJson: value,
    });
  };
  flatten('', weights);
  [
    ['includeDemolitionPoints', settings.includeDemolitionPoints],
    ['contributionWeight', settings.contributionWeight],
    ['formPointWeight', settings.formPointWeight],
  ].forEach(([key, value]) => {
    if (value === undefined) return;
    pushAdminExportRow(rows, 'duty_point_weight', {
      recordId: key,
      type: 'scoring_setting',
      metric: key,
      value: typeof value === 'boolean' ? String(value) : value,
      rawJson: value,
    });
  });
}

function pushSettingRows(rows, dataset, type, settings) {
  if (!settings || typeof settings !== 'object') return;
  Object.entries(sanitizeForExport(settings)).forEach(([key, value]) => {
    const scalar = value === null || typeof value !== 'object';
    pushAdminExportRow(rows, dataset, {
      recordId: key,
      type,
      metric: key,
      value: scalar ? (typeof value === 'boolean' ? String(value) : value) : '',
      rawJson: value,
    });
  });
}

export function buildAdminAllDataRows(data = {}, helpers = {}) {
  const displayGameTime = helpers.displayGameTime || ((value) => text(value));
  const structureTarget =
    helpers.structureTarget ||
    ((attack) => ({
      structure_name: attack?.structure_name || '',
      structure_level: attack?.structure_level || '',
    }));
  const rosterDisplayName =
    helpers.rosterDisplayName ||
    ((member) => (typeof member === 'string' ? member : text(member?.name)));
  const rows = [];

  arrayOf(data.attacks).forEach((attack) => {
    const target = structureTarget(attack);
    const attackDate = displayGameTime(attack?.game_time);
    const dateIsoSource = attack?.game_time || attackDate;
    pushAdminExportRow(rows, 'attack', {
      recordId: attack?.id || '',
      date: attackDate,
      dateIsoSource,
      type: 'structure_attack',
      metric: 'total_demolition',
      value: attack?.total_demolition || '',
      structure: target.structure_name,
      level: target.structure_level,
      time: attack?.start_time || '',
      rawJson: attack,
    });
    arrayOf(attack?.players).forEach((player) => {
      pushAdminExportRow(rows, 'attack_player', {
        recordId: attack?.id || '',
        date: attackDate,
        dateIsoSource,
        type: 'structure_attack',
        player: player?.name || '',
        rank: player?.rank || '',
        metric: 'demolition',
        value: player?.value || '',
        structure: target.structure_name,
        level: target.structure_level,
        time: attack?.start_time || '',
        rawJson: player,
      });
    });
  });

  arrayOf(data.playerSummary).forEach((player, index) => {
    pushAdminExportRow(rows, 'leaderboard_player', {
      recordId: `leaderboard-${index + 1}`,
      type: 'leaderboard',
      player: player?.name || '',
      rank: index + 1,
      metric: 'total_demolition',
      value: player?.total_demolition || 0,
      rawJson: player,
    });
  });

  arrayOf(data.rosterNames).forEach((name, index) => {
    pushAdminExportRow(rows, 'roster_name', {
      recordId: `roster-name-${index + 1}`,
      type: 'roster',
      player: name,
      metric: 'roster_index',
      value: index + 1,
      rawJson: name,
    });
  });

  arrayOf(data.rosterSnapshots).forEach((snapshot, sIndex) => {
    arrayOf(snapshot?.members).forEach((member, memberIndex) => {
      pushAdminExportRow(rows, 'roster_snapshot_member', {
        recordId: snapshot?.id || text(snapshot?.createdAt) || `roster-snapshot-${sIndex + 1}`,
        date: snapshot?.date || snapshot?.createdAt || '',
        type: 'roster_snapshot',
        player: rosterDisplayName(member),
        guild: member?.alliance ?? '',
        rank: member?.rank || '',
        metric: 'snapshot_member_index',
        value: memberIndex + 1,
        status: member?.status || '',
        rawJson: member,
      });
    });
  });

  arrayOf(data.bannerRecords).forEach((record, index) => {
    Object.entries(record?.teams || {}).forEach(([team, members]) => {
      arrayOf(members).forEach((member) => {
        pushAdminExportRow(rows, 'banner_assignment', {
          recordId: record?.id || `banner-${index + 1}`,
          date: record?.date || '',
          type: 'banner',
          player: member,
          group: team,
          metric: 'assignment_count',
          value: 1,
          note: record?.event || '',
          rawJson: { record, team, member },
        });
      });
    });
  });

  arrayOf(data.dutyRecords).forEach((record) => {
    arrayOf(record?.entries).forEach((entry) => {
      pushAdminExportRow(rows, 'duty_entry', {
        recordId: record?.id || '',
        date: record?.date || '',
        dateIsoSource: gameTimeToIso(record?.gameTime) ? record.gameTime : record?.date || '',
        type: record?.type || '',
        player: entry?.confirmed || entry?.name || entry?.original || '',
        metric: 'duty_count',
        value: 1,
        target: entry?.target || '',
        group: entry?.group || '',
        time: entry?.usageTime || record?.gameTime || '',
        status: entry?.status || '',
        note: entry?.note || record?.note || '',
        rawJson: entry,
      });
    });
  });

  arrayOf(data.contributionRecords).forEach((record) => {
    arrayOf(record?.entries).forEach((entry) => {
      pushAdminExportRow(rows, 'contribution_entry', {
        recordId: record?.id || '',
        date: record?.date || '',
        type: record?.isPrimary ? 'primary_contribution' : 'contribution',
        player: entry?.name || '',
        guild: entry?.guild || '',
        rank: entry?.rank || '',
        reward: entry?.rewardOverride || entry?.reward || '',
        metric: 'contribution',
        value: entry?.contribution || entry?.value || '',
        status: entry?.position || '',
        note: record?.note || '',
        rawJson: entry,
      });
    });
  });

  arrayOf(data.exGuildContributions).forEach((entry, index) => {
    pushAdminExportRow(rows, 'ex_guild_contribution', {
      recordId: entry?.id || `ex-guild-${index + 1}`,
      date: entry?.createdAt || '',
      type: 'ex_guild',
      player: entry?.playerName || entry?.name || '',
      metric: 'contribution',
      value: entry?.contribution || entry?.value || '',
      status: entry?.status || '',
      rawJson: entry,
    });
  });

  arrayOf(data.r5Adjustments).forEach((adjustment) => {
    pushAdminExportRow(rows, 'conduct_adjustment', {
      recordId: adjustment?.id || '',
      date: adjustment?.createdAt || '',
      type: adjustment?.category || '',
      player: adjustment?.playerName || '',
      metric: 'conduct_bonus',
      value: adjustment?.points || 0,
      status: adjustment?.season || '',
      note: adjustment?.note || '',
      rawJson: adjustment,
    });
  });

  arrayOf(data.allianceList).forEach((alliance, index) => {
    pushAdminExportRow(rows, 'alliance', {
      recordId: `alliance-${index + 1}`,
      type: 'alliance',
      guild: alliance,
      metric: 'alliance_index',
      value: index + 1,
      rawJson: alliance,
    });
  });

  arrayOf(data.weightedRows).forEach((input) => {
    const row = roundWeightedCsvRow(input);
    pushAdminExportRow(rows, 'weighted_contribution', {
      recordId: row.playerKey,
      type: 'weighted_contribution',
      player: row.player,
      rank: row.finalRank,
      reward: row.finalReward,
      metric: 'weighted_score',
      value: row.weightedScore,
      // The current (pre-weighting) standing is context, not a status.
      note: row.currentRank
        ? `current rank ${row.currentRank}${row.currentReward ? ` (${row.currentReward})` : ''}`
        : '',
      rawJson: row,
    });
  });

  const registry =
    data.playerRegistry && typeof data.playerRegistry === 'object' ? data.playerRegistry : {};
  arrayOf(registry.players).forEach((player, index) => {
    pushAdminExportRow(rows, 'player_registry', {
      recordId: player?.id || `player-${index + 1}`,
      type: 'registry_player',
      player: player?.canonical || '',
      group: player?.family || '',
      metric: 'accounts',
      value: arrayOf(player?.accounts).length,
      note: arrayOf(player?.aliases).join(' | '),
      rawJson: player,
    });
  });
  arrayOf(registry.accountLinks).forEach((link, index) => {
    pushAdminExportRow(rows, 'account_link', {
      recordId: `account-link-${index + 1}`,
      type: link?.type || 'banner',
      player: link?.account || '',
      target: link?.owner || '',
      metric: 'owner',
      note: `owner ${text(link?.owner)} · account type ${text(link?.type || 'banner')}`,
      rawJson: link,
    });
  });
  arrayOf(registry.playerAliases).forEach((alias, index) => {
    pushAdminExportRow(rows, 'player_alias', {
      recordId: `player-alias-${index + 1}`,
      date: alias?.createdAt || '',
      type: 'taught_alias',
      player: alias?.alias || '',
      target: alias?.canonical || '',
      metric: 'resolves_to',
      rawJson: alias,
    });
  });
  arrayOf(registry.mainAccounts).forEach((name, index) => {
    pushAdminExportRow(rows, 'main_account', {
      recordId: `main-account-${index + 1}`,
      type: 'always_main',
      player: name,
      rawJson: name,
    });
  });
  arrayOf(registry.contributionMatches).forEach((match, index) => {
    pushAdminExportRow(rows, 'contribution_match', {
      recordId: `contribution-match-${index + 1}`,
      date: match?.createdAt || '',
      type: 'contribution_match',
      player: match?.newName || '',
      target: match?.canonical || '',
      note: match?.oldName ? `previously ${match.oldName}` : '',
      rawJson: match,
    });
  });

  arrayOf(data.conductSuggestions).forEach((suggestion) => {
    pushAdminExportRow(rows, 'conduct_suggestion', {
      recordId: suggestion?.id || '',
      date: suggestion?.createdAt || '',
      type: suggestion?.category || '',
      player: suggestion?.playerName || '',
      metric: 'suggested_points',
      value: suggestion?.points ?? '',
      status: suggestion?.status || '',
      target: suggestion?.suggestedByName || suggestion?.suggestedBy || '',
      group: suggestion?.reviewedBy || '',
      time: suggestion?.reviewedAtMs ? toIsoTimestamp(suggestion.reviewedAtMs) : '',
      note: [
        suggestion?.note,
        suggestion?.suggestedByName || suggestion?.suggestedBy
          ? `suggested by ${suggestion.suggestedByName || suggestion.suggestedBy}`
          : '',
        suggestion?.reviewedBy ? `reviewed by ${suggestion.reviewedBy}` : '',
        suggestion?.reviewNote ? `review: ${suggestion.reviewNote}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      rawJson: suggestion,
    });
  });

  if (data.dutySettings) pushWeightRows(rows, data.dutySettings);
  pushSettingRows(rows, 'reward_setting', 'reward_setting', data.rewardSettings);
  pushSettingRows(rows, 'vote_setting', 'vote_setting', data.voteSettings);

  const publicResults = data.publicVoteResults;
  arrayOf(publicResults?.rankings).forEach((ranking, index) => {
    pushAdminExportRow(rows, 'public_vote_result', {
      recordId: ranking?.playerKey || `public-vote-${index + 1}`,
      type: publicResults?.published ? 'published' : 'unpublished',
      player: ranking?.playerName || '',
      rank: index + 1,
      metric: 'votes',
      value: ranking?.votes ?? '',
      status: text(publicResults?.season),
      note: ranking?.voters !== undefined ? `${ranking.voters} voters` : '',
      rawJson: ranking,
    });
  });

  arrayOf(data.votes).forEach((vote, index) => {
    pushAdminExportRow(rows, 'vote', {
      recordId: vote?.id || `vote-${index + 1}`,
      date: vote?.createdAt || vote?.updatedAt || '',
      type: vote?.category || '',
      player: vote?.voterName || '',
      target: arrayOf(vote?.candidateNames).join(' | ') || vote?.candidateName || '',
      metric: 'candidates',
      value: arrayOf(vote?.candidateNames).length || (vote?.candidateName ? 1 : 0),
      status: vote?.season || '',
      rawJson: vote,
    });
  });
  arrayOf(data.voteHistory).forEach((entry, index) => {
    pushAdminExportRow(rows, 'vote_history', {
      recordId: entry?.id || `vote-history-${index + 1}`,
      date: entry?.createdAt || entry?.archivedAt || entry?.at || '',
      type: entry?.action || entry?.category || '',
      player: entry?.voterName || '',
      target: arrayOf(entry?.candidateNames).join(' | ') || entry?.candidateName || '',
      status: entry?.season || '',
      rawJson: entry,
    });
  });

  arrayOf(data.bohMatchResults).forEach((result, index) => {
    pushAdminExportRow(rows, 'boh_match_result', {
      recordId: result?.id || `boh-match-${index + 1}`,
      date: result?.matchDate || '',
      dateIsoSource: result?.matchDate || result?.createdAt || '',
      type: 'boh_match',
      group: result?.teamName || result?.teamId || '',
      target: result?.opponent || '',
      metric: 'team_score',
      value: result?.teamScore ?? '',
      note: [
        result?.teamScore !== undefined || result?.opponentScore !== undefined
          ? `${text(result?.teamScore)} vs ${text(result?.opponentScore)}`
          : '',
        result?.memberCount ? `${result.memberCount} members` : '',
        result?.note || '',
      ]
        .filter(Boolean)
        .join(' · '),
      rawJson: result,
    });
  });

  const rosters =
    data.allianceViewRosters && typeof data.allianceViewRosters === 'object'
      ? data.allianceViewRosters
      : {};
  Object.entries(rosters).forEach(([allianceId, roster]) => {
    arrayOf(roster?.members).forEach((member, index) => {
      const overrides = member?.overrides || {};
      const imported = member?.imported || {};
      const pick = (key) => overrides[key] ?? imported[key] ?? member?.[key] ?? '';
      pushAdminExportRow(rows, 'alliance_view_member', {
        recordId: member?.id || `${allianceId}-${index + 1}`,
        date: roster?.updatedAt || '',
        type: 'alliance_roster',
        player: pick('name'),
        guild: allianceId,
        rank: pick('rank'),
        metric: 'total_power',
        value: pick('totalPower'),
        level: pick('castleLevel'),
        target: member?.edenAssignment?.sourceName || '',
        note: pick('server') ? `server ${pick('server')}` : '',
        rawJson: member,
      });
    });
  });

  if (data.r5Season) {
    pushAdminExportRow(rows, 'r5_season', {
      recordId: 'r5Season',
      type: 'season',
      metric: 'r5_season',
      value: data.r5Season,
      status: data.r5Season,
      rawJson: data.r5Season,
    });
  }

  const competition =
    data.competition && typeof data.competition === 'object' ? data.competition : null;
  if (competition) {
    if (competition.config) {
      pushSettingRows(rows, 'competition_config', 'competition_config', competition.config);
    }
    if (competition.schedule) {
      pushAdminExportRow(rows, 'competition_schedule', {
        recordId: competition.schedule?.seasonId || 'schedule',
        date: competition.schedule?.updatedAt || '',
        type: 'schedule',
        status: text(competition.season),
        rawJson: competition.schedule,
      });
    }
    arrayOf(competition.signups).forEach((signup, index) => {
      pushAdminExportRow(rows, 'competition_signup', {
        recordId: signup?.submissionUid || `signup-${index + 1}`,
        date: signup?.updatedAt || signup?.submittedAt || signup?.createdAt || '',
        type: signup?.status || 'signup',
        player: signup?.gameName || '',
        guild: signup?.alliance || '',
        metric: 'total_castle_power',
        value: signup?.stats?.totalCastlePower ?? '',
        status: text(competition.season),
        rawJson: signup,
      });
    });
  }

  const missing = new Set(describeAdminExportCoverage(data));
  const counts = new Map();
  rows.forEach((row) => counts.set(row.dataset, (counts.get(row.dataset) || 0) + 1));
  ADMIN_EXPORT_DATASETS.forEach((dataset) => {
    const count = counts.get(dataset) || 0;
    pushAdminExportRow(rows, 'export_manifest', {
      recordId: dataset,
      type: 'dataset_count',
      metric: 'rows',
      value: count,
      status: missing.has(dataset) ? 'not_loaded' : count ? 'included' : 'empty',
    });
  });

  return rows;
}

// ---------------------------------------------------------------------------
// Debug exports

export const ATTACK_DEBUG_COLUMNS = Object.freeze([
  'Attack ID',
  'Start Time (Game Time)',
  'End Time (Game Time)',
  'Structure',
  'Level',
  'Raw Name',
  'Grouped Name (Master)',
  'Demolition Value',
  'Rank',
  'Scored As',
  'Counted',
  'Date (ISO)',
]);

// scoredAs(player, players) must be the leaderboard's own aggregation name;
// `Counted` repeats its rule that the same identity and value on the very next
// row is one row read twice from overlapping screenshots.
export function buildAttackDebugCsv(attacks = [], helpers = {}) {
  const displayGameTime = helpers.displayGameTime || ((value) => text(value));
  const structureTarget = helpers.structureTarget || ((attack) => attack || {});
  const groupedName = helpers.groupedName || ((player) => text(player?.name));
  const scoredAs = helpers.scoredAs || groupedName;
  const valueOf = (value) => {
    const number = Number(String(value ?? '').replace(/,/g, ''));
    return Number.isFinite(number) ? number : 0;
  };
  const lines = [csvLine(ATTACK_DEBUG_COLUMNS)];
  arrayOf(attacks).forEach((attack) => {
    const date = displayGameTime(attack?.game_time);
    const target = structureTarget(attack) || {};
    const players = arrayOf(attack?.players);
    let previous = null;
    players.forEach((player) => {
      const name = text(scoredAs(player, players));
      const value = valueOf(player?.value ?? player?.val);
      const duplicate = value > 0 && previous?.name === name && previous?.value === value;
      previous = { name, value };
      lines.push(
        csvLine([
          attack?.id,
          attack?.start_time,
          date,
          target.structure_name,
          target.structure_level,
          player?.name,
          groupedName(player, players),
          player?.value,
          player?.rank,
          name,
          duplicate ? 'no (duplicate row)' : 'yes',
          normalizeExportDate(attack?.game_time || date),
        ])
      );
    });
  });
  return lines.join('\n');
}

export const DUTY_DEBUG_COLUMNS = Object.freeze([
  'Date',
  'Type',
  'Upload ID',
  'Raw Name',
  'Cleaned Name',
  'Grouped Name (Master)',
  'Operator/Banner Note',
  'Confirmed Name',
  'Match Status',
  'Target',
  'Group',
  'Time',
  'Scored As',
  'Date (ISO)',
]);

// scoredAs(entry) must return the names the duty scorer credits for this
// entry (contribution-weighting.js), joined for display.
const ACCOUNT_LINK_LABELS = Object.freeze({
  banner: 'alt/banner',
  alt: 'alt/banner',
  secondary: 'secondary',
});

// "linked" when an admin account link carried the credit to its owner; the
// stored review status ("likely" is a fuzzy name match) otherwise.
export function describeDutyDebugMatch(entry, scoredNames = [], link = null) {
  const names = arrayOf(scoredNames).filter(Boolean).join(' + ');
  if (!link) return { status: text(entry?.status), scoredAs: names };
  const label = ACCOUNT_LINK_LABELS[link.type] || text(link.type) || 'alt/banner';
  return {
    status: 'linked',
    scoredAs: `${names} (${label} link from ${text(link.account)})`,
  };
}

export function buildDutyDebugCsv(records = [], helpers = {}) {
  const clean = helpers.cleanName || ((raw) => text(raw));
  const resolve = helpers.resolveName || ((raw) => text(raw));
  const operatorNote = helpers.operatorNote || (() => '');
  const scoredAs = helpers.scoredAs || ((entry) => [entry?.confirmed || entry?.name || '']);
  const accountLink = helpers.accountLink || (() => null);
  const lines = [csvLine(DUTY_DEBUG_COLUMNS)];
  arrayOf(records).forEach((record) => {
    arrayOf(record?.entries).forEach((entry) => {
      const raw = entry?.name || entry?.original || '';
      const match = describeDutyDebugMatch(entry, scoredAs(entry), accountLink(entry));
      lines.push(
        csvLine([
          record?.date,
          record?.type,
          record?.id || record?.createdAt || '',
          raw,
          clean(raw),
          resolve(raw),
          operatorNote(raw),
          entry?.confirmed || '',
          match.status,
          entry?.target,
          entry?.group,
          entry?.usageTime || record?.gameTime || '',
          match.scoredAs,
          normalizeExportDate(record?.date),
        ])
      );
    });
  });
  return lines.join('\n');
}
