import * as BohModel from './all-star-boh-model.js';
import {
  BOH_MAPPER_IMPORT_MAX_BYTES,
  parseAllStarBohMapperExactView,
} from './all-star-boh-mapper-import.js';
import {
  BOH_MAPPER_PLAN_BUNDLE_FORMAT,
  BOH_MAPPER_PLAN_BUNDLE_IMPORT_MAX_BYTES,
  BOH_MAPPER_PLAN_BUNDLE_VERSION,
  BOH_MAPPER_PLAN_IMPORT_FORMAT,
  BOH_MAPPER_PLAN_IMPORT_MAX_BYTES,
  BOH_MAPPER_PLAN_IMPORT_VERSION,
  parseAllStarBohMapperStage1RolePlan,
  parseAllStarBohMapperStage1RolePlanBundle,
} from './all-star-boh-mapper-plan-import.js';
import {
  BOH_STAGE1_LEGIONS,
  BOH_STAGE1_PHASES,
  BOH_STAGE1_PLAN_ID,
  bohSeatRoleGroup,
  bohStage1Timeline,
} from './all-star-boh-plan.js';
import { applyAllStarBohSubmissionCorrections } from './all-star-boh-store.js';

function scheduleRender(state) {
  if (!state._renderDirty) {
    state._renderDirty = true;
    if (!state._renderPending) {
      state._renderPending = true;
      requestAnimationFrame(() => {
        state._renderPending = false;
        if (state._renderDirty) {
          state._renderDirty = false;
          renderShell(state);
        }
      });
    }
  }
}

function renderNow(state) {
  state._renderDirty = false;
  state._renderPending = false;
  renderShell(state);
}

function syncHash(state) {
  const hash = window.location.hash;
  const parts = hash.replace(/^#/, '').split('/');
  if (parts[0] === 'allstar') {
    if (STAGES.some(([id]) => id === parts[1])) {
      state.stage = parts[1];
    }
    if (parts[2] && parts[2].startsWith('player-')) {
      state.selectedSubmissionId = parts[2].slice(7);
    }
  }
}

function updateHash(state) {
  try {
    const parts = ['allstar', state.stage];
    if (state.selectedSubmissionId) {
      parts.push('player-' + state.selectedSubmissionId);
    }
    const newHash = '#' + parts.join('/');
    if (window.location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }
  } catch {}
}

const CONTROLLERS = new WeakMap();

const TEAM_COUNT = 6;
const MIN_TEAM_COUNT = 2;
const ROSTER_SIZE = 12;
const EPIC_LANE_IDS = ['south', 'center', 'north'];
const DEFAULT_EPIC_TIME_OPTIONS = ['+6', '+8', '+10', '+12', '+14', '+16', '+18', '+20'];
const MAX_EVENT_MILESTONES = 8;
const TEAM_NAME_LABELS = Object.freeze({
  'iron-wolves': 'Iron Wolves',
  'storm-ravens': 'Storm Ravens',
  'ember-lions': 'Ember Lions',
  'frost-bears': 'Frost Bears',
  'night-falcons': 'Night Falcons',
  'thunder-bulls': 'Thunder Bulls',
});

const STAGES = [
  ['teams', 'adminBohStageTeams', 'Mapper workspace'],
  ['plans', 'adminBohStagePlans', 'Advanced plans'],
  ['publish', 'adminBohStagePublish', 'Validate / publish'],
  ['signups', 'adminBohStageSignups', 'Signup review'],
  ['scores', 'adminVtsScoreStage', 'VtsScore'],
  ['scoring', 'adminBohStageScoring', 'Scoring'],
];

const SCORE_COMPONENTS = [
  ['troopPower', 'adminBohScoreTroopPower', 'Troop power', 0.05],
  ['buildingPower', 'adminBohScoreBuildingPower', 'Building power', 0.3],
  ['technologyPower', 'adminBohScoreTechnologyPower', 'Technology power', 0.7],
  ['heroCombatPower', 'adminBohScoreHeroPower', 'Hero combat power', 0.8],
  ['dragonPower', 'adminBohScoreDragonPower', 'Dragon power', 1],
  ['unitSpecialtyPower', 'adminBohScoreUnitSpecialtyPower', 'Unit specialty power', 0],
  ['t9TroopType', 'adminBohScoreT9Type', 'Each T10 troop type', 3000],
  ['readySpeedHero', 'adminBohScoreSpeedHero', 'Each ready speed hero', 2500],
  ['level50Hero', 'adminBohScoreLevel50Hero', 'Each level 50 hero', 750],
  ['bohUsefulRating', 'adminBohScoreBohUseful', 'BoH usefulness point', 1000],
  ['rocLevel', 'adminBohScoreRocLevel', 'RoC level', 0],
  ['paidUsableHero', 'adminBohScorePaidUsableHero', 'Each paid usable hero', 0],
  [
    'loftyTroopMillion',
    'adminBohScoreLoftyTroopMillion',
    'S (Lofty) troops — points per 1 million',
    0,
  ],
  [
    'enhancedT10TroopMillion',
    'adminBohScoreEnhancedT10TroopMillion',
    'Enhanced T10 troops — points per 1 million',
    0,
  ],
];

const DEFAULT_PHASES = [
  { id: 'phase-0-5', label: '0-5 min', startMinute: 0, endMinute: 5, order: 1 },
  { id: 'phase-5-10', label: '5-10 min', startMinute: 5, endMinute: 10, order: 2 },
  { id: 'phase-10-15', label: '10-15 min', startMinute: 10, endMinute: 15, order: 3 },
  { id: 'phase-15-30', label: '15-30 min', startMinute: 15, endMinute: 30, order: 4 },
  { id: 'phase-30-60', label: '30-60 min', startMinute: 30, endMinute: 60, order: 5 },
];

const DEFAULT_LEGIONS = [
  { id: 'legion-1', label: 'Legion 1', order: 1 },
  { id: 'legion-2', label: 'Legion 2', order: 2 },
];

const CORRECTABLE_STAT_KEYS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
  'unitSpecialtyPower',
  'artifactPower',
  'royalTechPower',
  'rocLevel',
]);

const FULL_CORRECTION_STAT_KEYS = Object.freeze([...CORRECTABLE_STAT_KEYS, 'level50HeroCount']);
const OPTIONAL_POWER_KEYS = Object.freeze(['artifactPower', 'royalTechPower']);
const CORRECTION_NUMBER_LIMITS = Object.freeze({
  totalCastlePower: 10 ** 12,
  troopPower: 10 ** 12,
  buildingPower: 10 ** 12,
  technologyPower: 10 ** 12,
  heroCombatPower: 10 ** 12,
  dragonPower: 10 ** 12,
  unitSpecialtyPower: 10 ** 12,
  artifactPower: 10 ** 12,
  royalTechPower: 10 ** 12,
  rocLevel: 160,
  level50HeroCount: 500,
});
const CORRECTION_TROOP_TYPES = Object.freeze(['cavalry', 'archers', 'footmen']);
const CORRECTION_SPEED_HEROES = Object.freeze(['lionheart', 'cao-cao', 'al-fatih']);
const CORRECTION_TROOP_ROW_PATTERN =
  /^(?:(?:footmen|cavalry|archers)\|(?:SSS|SS|S|X|IX|VIII|VII|VI|V|IV|III|II|I)\|(?:normal|enhanced)\|\d{1,10}|estimate\|(?:lofty|enhanced-t10|t10|t9)\|\d{1,10})$/u;
const CORRECTION_BOOLEAN_FIELDS = Object.freeze([
  'canHelpLead',
  'vts1097Member',
  'canTeleport',
  'canUseVoice',
  'planCommitment',
]);
const CORRECTION_COMMITMENT_TEXT_LIMITS = Object.freeze({
  unavailableTimes: 800,
  contactNumber: 160,
  currentState: 160,
  joinReason: 1000,
  notes: 2000,
});

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cleanText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim();
}

function finiteNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(typeof value === 'string' ? value.replaceAll(',', '') : value);
  return Number.isFinite(number) ? number : fallback;
}

function integer(value, fallback = 0) {
  return Math.round(finiteNumber(value, fallback));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, finiteNumber(value, min)));
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeEventDateTime(value) {
  const raw = value?.toDate?.() || value?.toMillis?.() || value;
  if (!raw) return '';
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function localDateTimeInputValue(value) {
  const iso = normalizeEventDateTime(value);
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function localDateTimeToIso(value) {
  const text = cleanText(value);
  if (!text) return '';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function uniqueTextList(value) {
  return [...new Set(list(value).map(cleanText).filter(Boolean))];
}

function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function correctionValueKey(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(
      [...value]
        .map((item) => (typeof item === 'string' ? cleanText(item) : item))
        .sort((left, right) => String(left).localeCompare(String(right)))
    );
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(
      Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
    );
  }
  return JSON.stringify(value ?? null);
}

function correctionValuesEqual(left, right) {
  return correctionValueKey(left) === correctionValueKey(right);
}

function originalCorrectionSubmission(submission = {}) {
  const original =
    submission?.originalSubmission && typeof submission.originalSubmission === 'object'
      ? submission.originalSubmission
      : {};
  const originalStats = {
    ...(original?.stats ||
      submission?.originalStats ||
      submission?.confirmedStats ||
      submission?.stats ||
      {}),
  };
  const originalCommitment = {
    ...(original?.commitment || submission?.originalCommitment || submission?.commitment || {}),
  };
  return {
    gameName:
      cleanText(original?.gameName) ||
      cleanText(submission?.originalGameName) ||
      playerName(submission),
    locale: hasOwn(original, 'locale') ? cleanText(original.locale) : cleanText(submission?.locale),
    timezone: hasOwn(original, 'timezone')
      ? cleanText(original.timezone)
      : cleanText(submission?.timezone),
    preferredTeammates: uniqueTextList(
      hasOwn(original, 'preferredTeammates')
        ? original.preferredTeammates
        : submission?.preferredTeammates
    ),
    stats: originalStats,
    commitment: originalCommitment,
  };
}

function timestampValue(value) {
  if (typeof value?.toMillis === 'function') return finiteNumber(value.toMillis());
  if (Number.isFinite(value?.seconds)) return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  if (Number.isFinite(numeric) && value !== '') return numeric;
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function effectiveAdminSubmission(submission = {}, review = submission?.review) {
  const stats = { ...(submission?.stats || {}) };
  for (const key of [
    ...CORRECTABLE_STAT_KEYS,
    't9TroopTypes',
    't10TroopTypes',
    'troopRoster',
    'readySpeedHeroes',
    'usableHeroNames',
    'researchProgressPct',
    'level50HeroCount',
  ]) {
    if (stats[key] == null && submission?.[key] != null) stats[key] = submission[key];
  }
  const mergedStats = { ...stats, ...(submission?.confirmedStats || {}) };
  const original = originalCorrectionSubmission({ ...submission, stats: mergedStats });
  const base = {
    ...submission,
    stats: mergedStats,
    commitment: { ...(submission?.commitment || {}) },
    originalStats: { ...original.stats },
    originalCommitment: { ...original.commitment },
    originalSubmission: {
      gameName: original.gameName,
      locale: original.locale,
      timezone: original.timezone,
      preferredTeammates: [...original.preferredTeammates],
      stats: { ...original.stats },
      commitment: { ...original.commitment },
    },
  };
  const originalName = cleanText(submission?.originalGameName) || playerName(submission);
  base.originalGameName = originalName;
  let output = base;
  try {
    output = applyAllStarBohSubmissionCorrections(base, review);
  } catch {
    // Keep malformed historical review data inspectable instead of breaking the admin table.
  }
  output.originalGameName = originalName;
  output.originalStats = { ...original.stats };
  output.originalCommitment = { ...original.commitment };
  output.originalSubmission = base.originalSubmission;
  if (cleanText(output.gameName)) output.displayName = cleanText(output.gameName);
  output.confirmedStats = output.stats;
  return output;
}

function adminSubmissionFields(record = {}) {
  const effective = effectiveAdminSubmission(record);
  const stats = effective.stats || {};
  const commitment = effective.commitment || {};
  const roles = uniqueTextList([
    ...list(effective.rolePreferences),
    commitment.preferredRole,
    commitment.secondaryRole,
  ]).map((value) => value.toLocaleLowerCase());
  const troopTypes = uniqueTextList([
    ...list(stats.t9TroopTypes),
    ...list(stats.t10TroopTypes),
    ...troopRosterTroopTypes(stats.troopRoster),
  ]).map((value) => value.toLocaleLowerCase());
  const originalName = effective.originalGameName || playerName(record);
  const effectiveName = playerName(effective) || playerId(record);
  const totalPower = finiteNumber(stats.totalCastlePower ?? stats.totalPower);
  const score = finiteNumber(effective.finalScore ?? effective.score?.total ?? effective.score);
  return {
    record,
    effective,
    stats,
    commitment,
    originalName,
    effectiveName,
    totalPower,
    score,
    status: submissionStatus(effective),
    roles,
    troopTypes,
    fightingTimes: uniqueTextList(commitment.fightingTimeIds || effective.fightingTimeIds),
    vtsMember: commitment.vts1097Member ?? effective.vts1097Member,
    updated: timestampValue(
      effective.updatedAtMs || effective.updatedAt || effective.submittedAt || effective.createdAt
    ),
  };
}

export function filterAdminSubmissions(records, filters = {}) {
  const search = cleanText(filters.search || filters.text).toLocaleLowerCase();
  const status = cleanText(filters.status).toLocaleLowerCase();
  const fightingTime = cleanText(
    filters.fightingTime || filters.fightingTimeId
  ).toLocaleLowerCase();
  const role = cleanText(filters.role || filters.rolePreference).toLocaleLowerCase();
  const troopType = cleanText(filters.troopType).toLocaleLowerCase();
  const vtsFilter = filters.vtsMember ?? filters.vts1097Member;
  const minPower = filters.minTotalPower === '' ? null : Number(filters.minTotalPower);
  const maxPower = filters.maxTotalPower === '' ? null : Number(filters.maxTotalPower);
  return list(records).filter((record) => {
    const fields = adminSubmissionFields(record);
    const haystack = [
      fields.effectiveName,
      fields.originalName,
      playerId(record),
      record.server,
      record.alliance,
    ]
      .map((value) => cleanText(value).toLocaleLowerCase())
      .join('\n');
    if (search && !haystack.includes(search)) return false;
    if (status && status !== 'all' && fields.status !== status) return false;
    if (
      fightingTime &&
      fightingTime !== 'all' &&
      !fields.fightingTimes.some((value) => value.toLocaleLowerCase() === fightingTime)
    ) {
      return false;
    }
    if (
      role &&
      role !== 'all' &&
      !fields.roles.includes(role) &&
      !fields.roles.includes('flexible')
    ) {
      return false;
    }
    if (troopType && troopType !== 'all' && !fields.troopTypes.includes(troopType)) return false;
    if (vtsFilter !== '' && vtsFilter != null && vtsFilter !== 'all') {
      const expected =
        vtsFilter === true || ['true', 'yes', 'member'].includes(cleanText(vtsFilter));
      if (fields.vtsMember !== expected) return false;
    }
    if (Number.isFinite(minPower) && fields.totalPower < minPower) return false;
    if (Number.isFinite(maxPower) && fields.totalPower > maxPower) return false;
    return true;
  });
}

export function sortAdminSubmissions(records, sort = {}) {
  const key = cleanText(typeof sort === 'string' ? sort : sort.key || sort.field) || 'updated';
  const direction = cleanText(sort.direction || sort.order).toLocaleLowerCase() === 'asc' ? 1 : -1;
  const valueFor = (fields) => {
    if (key === 'name') return fields.effectiveName.toLocaleLowerCase();
    if (key === 'power') return fields.totalPower;
    if (key === 'score') return fields.score;
    if (key === 'status') return fields.status;
    return fields.updated;
  };
  return list(records)
    .map((record, index) => ({ record, index, fields: adminSubmissionFields(record) }))
    .sort((left, right) => {
      const leftValue = valueFor(left.fields);
      const rightValue = valueFor(right.fields);
      const compared =
        typeof leftValue === 'string'
          ? leftValue.localeCompare(rightValue)
          : finiteNumber(leftValue) - finiteNumber(rightValue);
      return compared ? compared * direction : left.index - right.index;
    })
    .map(({ record }) => record);
}

const SCORE_AUDIT_SORT_KEYS = Object.freeze([
  'player',
  'totalPower',
  'calculated',
  'override',
  'commitment',
  'finalScore',
  'breakdown',
]);

function scoreAuditTotalPower(player) {
  const value =
    player?.totalCastlePower ?? player?.stats?.totalCastlePower ?? player?.stats?.totalPower;
  return value === undefined || value === null || value === '' ? null : finiteNumber(value);
}

export function sortAdminScoreBreakdownRows(records, sort = {}, options = {}) {
  const requestedKey = cleanText(sort.key || sort.field);
  if (!SCORE_AUDIT_SORT_KEYS.includes(requestedKey)) return list(records);
  const direction = cleanText(sort.direction || sort.order).toLocaleLowerCase() === 'desc' ? -1 : 1;
  const numericKeys = new Set(['totalPower', 'calculated', 'override', 'commitment', 'finalScore']);
  const collator = new Intl.Collator(cleanText(options.locale) || undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  const valueFor = (player) => {
    if (requestedKey === 'player') return cleanText(player?.displayName || player?.playerId);
    if (requestedKey === 'totalPower') return scoreAuditTotalPower(player);
    if (requestedKey === 'calculated') {
      return player?.calculatedScore === undefined || player?.calculatedScore === null
        ? scoreValue(player)
        : finiteNumber(player.calculatedScore);
    }
    if (requestedKey === 'override') {
      return player?.overrideScore === undefined || player?.overrideScore === null
        ? null
        : finiteNumber(player.overrideScore);
    }
    if (requestedKey === 'commitment') {
      return player?.commitmentScore === undefined || player?.commitmentScore === null
        ? null
        : finiteNumber(player.commitmentScore);
    }
    if (requestedKey === 'finalScore') return scoreValue(player);
    return cleanText(
      typeof options.breakdownText === 'function'
        ? options.breakdownText(player)
        : player?.breakdownText
    );
  };
  const missing = (value) =>
    value === undefined || value === null || (typeof value === 'string' && value === '');
  return list(records)
    .map((record, index) => ({ record, index, value: valueFor(record) }))
    .sort((left, right) => {
      const leftMissing = missing(left.value);
      const rightMissing = missing(right.value);
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      if (leftMissing) return left.index - right.index;
      const compared = numericKeys.has(requestedKey)
        ? finiteNumber(left.value) - finiteNumber(right.value)
        : collator.compare(String(left.value), String(right.value));
      return compared ? compared * direction : left.index - right.index;
    })
    .map(({ record }) => record);
}

function csvCell(value) {
  let text = String(value ?? '');
  const firstContent = [...text].find((character) => {
    const codePoint = character.codePointAt(0);
    return !/\s/u.test(character) && codePoint > 31 && codePoint !== 127;
  });
  if (firstContent && '=+-@'.includes(firstContent)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function troopRosterRows(value) {
  if (Array.isArray(value)) return value.map((item) => cleanText(item)).filter(Boolean);
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, count]) => `${cleanText(key)}|${cleanText(count)}`)
      .filter(Boolean);
  }
  return cleanText(value).split(/\r?\n/u).map(cleanText).filter(Boolean);
}

function troopRosterTroopTypes(value) {
  if (Array.isArray(value)) {
    return troopRosterRows(value).flatMap((row) => {
      if (!CORRECTION_TROOP_ROW_PATTERN.test(row)) return [];
      const troopType = cleanText(row.split('|', 1)[0]);
      return CORRECTION_TROOP_TYPES.includes(troopType) ? [troopType] : [];
    });
  }
  if (value && typeof value === 'object') return Object.keys(value);
  return [];
}

function parseTroopRosterCounts(value) {
  const counts = { lofty: 0, enhancedT10: 0, regularT10: 0, t9: 0 };
  const estimates = {};
  for (const row of troopRosterRows(value)) {
    const [kind = '', second = '', third = '', fourth = ''] = row.split('|').map(cleanText);
    const count = Math.max(0, finiteNumber(kind === 'estimate' ? third : fourth));
    if (kind === 'estimate') {
      const estimateKind = second.toLocaleLowerCase();
      if (['lofty', 'enhanced-t10', 't10', 't9'].includes(estimateKind)) {
        estimates[estimateKind] = count;
      }
      continue;
    }
    const tier = second.toLocaleUpperCase();
    const status = third.toLocaleLowerCase();
    if (['S', 'SS', 'SSS'].includes(tier)) counts.lofty += count;
    else if (tier === 'X' && status === 'enhanced') counts.enhancedT10 += count;
    else if (tier === 'X' && status === 'normal') counts.regularT10 += count;
    else if (tier === 'IX') counts.t9 += count;
  }
  return {
    lofty: estimates.lofty ?? counts.lofty,
    enhancedT10: estimates['enhanced-t10'] ?? counts.enhancedT10,
    regularT10: estimates.t10 ?? counts.regularT10,
    t9: estimates.t9 ?? counts.t9,
  };
}

function scoreDiagnosticCsvValue(fields) {
  const code = cleanText(fields.effective.scoreDiagnostic || fields.record?.scoreDiagnostic);
  return code || '';
}

function adminSubmissionCapture(record, options = {}) {
  if (record?.ocr?.used || record?.captureSource === 'ocr') {
    return cleanText(options.ocrLabel) || 'OCR + confirmed';
  }
  return cleanText(record?.entryMethod) || cleanText(options.manualLabel) || 'Manual';
}

export function buildSignupReviewCsv(records, options = {}) {
  const headers = [
    'Player ID',
    'Effective Name',
    'Original Name',
    'Server',
    'Current State',
    'Alliance',
    'Total Power',
    'Troop Power',
    'Building Power',
    'Technology Power',
    'Hero Combat Power',
    'Dragon Power',
    'Unit Specialty Power',
    'Artifact Power',
    'Royal Tech Power',
    'RoC Level',
    'Calculated Score',
    'Legacy Final Override',
    'Commitment Adjustment',
    'Final Score',
    'Score Diagnostic',
    'Canonical Troop Roster',
    'Lofty Count',
    'Enhanced T10 Count',
    'Regular T10 Count',
    'T9 Count',
    'Status',
    'Capture',
    'Updated',
    'Fighting Times',
    'Role Preferences',
    'T9 Troop Types',
    'T10 Troop Types',
    'VTS Member',
    'Locale',
    'Availability',
    'Leadership Support',
    'Can Teleport',
    'Can Use Voice',
    'Plan Commitment',
    'Preferred Teammates',
  ];
  const rows = list(records).map((record) => {
    const fields = adminSubmissionFields(record);
    const { effective, stats, commitment } = fields;
    const rosterRows = troopRosterRows(stats.troopRoster);
    const rosterCounts = parseTroopRosterCounts(stats.troopRoster);
    return [
      playerId(record),
      fields.effectiveName,
      fields.originalName,
      effective.server,
      commitment.currentState,
      effective.alliance,
      fields.totalPower,
      stats.troopPower,
      stats.buildingPower,
      stats.technologyPower,
      stats.heroCombatPower ?? stats.heroPower,
      stats.dragonPower,
      stats.unitSpecialtyPower,
      stats.artifactPower,
      stats.royalTechPower,
      stats.rocLevel,
      effective.calculatedScore ?? effective.score?.calculatedScore ?? effective.score?.total,
      effective.overrideScore ?? '',
      effective.commitmentScore ?? '',
      fields.score,
      scoreDiagnosticCsvValue(fields),
      rosterRows.join(' | '),
      rosterCounts.lofty,
      rosterCounts.enhancedT10,
      rosterCounts.regularT10,
      rosterCounts.t9,
      fields.status,
      adminSubmissionCapture(effective, options),
      effective.updatedAtMs || fields.updated,
      fields.fightingTimes.join(' | '),
      fields.roles.join(' | '),
      uniqueTextList(stats.t9TroopTypes).join(' | '),
      uniqueTextList(stats.t10TroopTypes).join(' | '),
      fields.vtsMember == null ? '' : fields.vtsMember ? 'Yes' : 'No',
      effective?.locale || record?.locale || '',
      commitment.availability || '',
      commitment.canHelpLead == null ? '' : commitment.canHelpLead ? 'Yes' : 'No',
      commitment.canTeleport == null ? '' : commitment.canTeleport ? 'Yes' : 'No',
      commitment.canUseVoice == null ? '' : commitment.canUseVoice ? 'Yes' : 'No',
      commitment.planCommitment == null ? '' : commitment.planCommitment ? 'Yes' : 'No',
      getAdminPreferredTeammateNames(effective).join(' | '),
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  return `${options.includeBom ? '\uFEFF' : ''}${csv}\r\n`;
}

function makeTranslator(translator) {
  return (key, fallback, values = null) => {
    let translated = '';
    try {
      translated = typeof translator === 'function' ? translator(key, values || {}) : '';
    } catch {
      translated = '';
    }
    const base = !translated || translated === key ? fallback : translated;
    if (!values) return String(base ?? '');
    return Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      String(base ?? '')
    );
  };
}

function resolveRoot(container) {
  if (typeof container === 'string') return document.querySelector(container);
  return container || document.getElementById('dashAllStarBohRoot');
}

function playerId(player) {
  return cleanText(player?.playerId || player?.memberId || player?.uid || player?.id);
}

function playerName(player) {
  return cleanText(
    player?.displayName ||
      player?.gameName ||
      player?.playerName ||
      player?.accountName ||
      player?.name
  );
}

function submissionStatus(submission) {
  return cleanText(submission?.reviewStatus || submission?.status || 'pending').toLowerCase();
}

function scoringVersion(snapshot) {
  return (
    snapshot?.scoring?.activeVersion ||
    snapshot?.scoring?.draftVersion ||
    list(snapshot?.scoring?.versions)[0] ||
    null
  );
}

function defaultWeights() {
  return Object.fromEntries(SCORE_COMPONENTS.map(([key, , , value]) => [key, value]));
}

function normalizeSeat(source, teamId, seatNumber) {
  return {
    id: cleanText(source?.id) || `${teamId}-seat-${seatNumber}`,
    rosterKey: cleanText(source?.rosterKey || source?.rosterSeatKey),
    seatNumber,
    playerId: cleanText(source?.playerId || source?.memberId),
    displayName: cleanText(source?.displayName || source?.playerName),
    roleGroupId: cleanText(source?.roleGroupId || source?.roleId),
    roleLabel: cleanText(source?.roleLabel),
    lane: cleanText(source?.lane),
    side: cleanText(source?.side),
    locked: Boolean(source?.locked),
    note: cleanText(source?.note),
    score:
      source?.score === null || source?.score === undefined ? null : finiteNumber(source.score),
  };
}

function parseApprovedRosterCsvRecords(input) {
  const text = String(input ?? '').replace(/^\uFEFF/u, '');
  const records = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/u, ''));
      if (row.some((value) => cleanText(value))) records.push(row);
      row = [];
      field = '';
    } else field += character;
  }
  if (quoted) throw new Error('The approved roster CSV contains an unclosed quoted value.');
  row.push(field.replace(/\r$/u, ''));
  if (row.some((value) => cleanText(value))) records.push(row);
  return records;
}

function approvedRosterHeaderKey(value) {
  return cleanText(value)
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function approvedRosterColumn(headers, aliases, required = false) {
  const accepted = new Set(aliases.map(approvedRosterHeaderKey));
  const index = headers.findIndex((header) => accepted.has(approvedRosterHeaderKey(header)));
  if (index < 0 && required) {
    throw new Error(`Approved roster CSV is missing the ${aliases[0]} column.`);
  }
  return index;
}

export function parseAdminAllStarBohApprovedRosterCsv(input) {
  const records = parseApprovedRosterCsvRecords(input);
  if (records.length < 2) throw new Error('The approved roster CSV has no player rows.');
  const headers = records[0];
  const teamColumn = approvedRosterColumn(
    headers,
    ['Team', 'Team name', 'Team number', 'Squad'],
    true
  );
  const nameColumn = approvedRosterColumn(
    headers,
    ['Name', 'Player', 'Player name', 'Game name', 'In-game name'],
    true
  );
  const seatColumn = approvedRosterColumn(headers, ['Seat', 'Seat number', 'Position']);
  const languageColumn = approvedRosterColumn(headers, ['Language', 'Locale']);
  const role1Column = approvedRosterColumn(headers, ['Role 1', 'Primary role', 'Role']);
  const role2Column = approvedRosterColumn(headers, ['Role 2', 'Secondary role']);
  const teams = new Map();
  records.slice(1).forEach((record, rowIndex) => {
    const teamName = cleanText(record[teamColumn]);
    const name = cleanText(record[nameColumn]);
    if (!teamName || !name) {
      throw new Error(`Approved roster CSV row ${rowIndex + 2} requires Team and Name.`);
    }
    if (!teams.has(teamName)) teams.set(teamName, []);
    const teamRows = teams.get(teamName);
    const explicitSeat = seatColumn < 0 ? 0 : integer(record[seatColumn]);
    const seatNumber = explicitSeat || teamRows.length + 1;
    if (seatNumber < 1 || seatNumber > ROSTER_SIZE) {
      throw new Error(`Approved roster CSV row ${rowIndex + 2} has an invalid seat.`);
    }
    if (teamRows.some((row) => row.seatNumber === seatNumber)) {
      throw new Error(`Approved roster team ${teamName} repeats seat ${seatNumber}.`);
    }
    teamRows.push({
      teamName,
      seatNumber,
      name,
      language: languageColumn < 0 ? '' : cleanText(record[languageColumn]),
      role1: role1Column < 0 ? '' : cleanText(record[role1Column]),
      role2: role2Column < 0 ? '' : cleanText(record[role2Column]),
      sourceRow: rowIndex + 2,
    });
  });
  if (teams.size !== TEAM_COUNT) {
    throw new Error(
      `Approved roster CSV requires exactly ${TEAM_COUNT} teams; found ${teams.size}.`
    );
  }
  const parsedTeams = [...teams].map(([teamName, rows]) => {
    if (rows.length !== ROSTER_SIZE) {
      throw new Error(
        `Approved roster team ${teamName} requires ${ROSTER_SIZE} names; found ${rows.length}.`
      );
    }
    return { teamName, rows: rows.sort((left, right) => left.seatNumber - right.seatNumber) };
  });
  return { teams: parsedTeams, playerCount: parsedTeams.length * ROSTER_SIZE };
}

function normalizeTeamCount(value, fallback = TEAM_COUNT) {
  const count = integer(value, fallback);
  return count >= MIN_TEAM_COUNT && count <= TEAM_COUNT ? count : fallback;
}

function normalizeBalanceMetric(value) {
  const metric = cleanText(value);
  return ['score', 'totalPower', 'balanced'].includes(metric) ? metric : 'score';
}

function balanceMetricLabel(state, metric) {
  const normalized = normalizeBalanceMetric(metric);
  if (normalized === 'totalPower') return state.tr('adminBohTotalGamePower', 'Total in-game power');
  if (normalized === 'balanced')
    return state.tr('adminBohBalancedScorePower', 'Balanced score + power');
  return state.tr('adminBohScoringPoints', 'Scoring points');
}

function normalizeTeams(sourceTeams, teamCount = TEAM_COUNT) {
  const teams = list(sourceTeams);
  return Array.from({ length: normalizeTeamCount(teamCount) }, (_, index) => {
    const number = index + 1;
    const source =
      teams.find((team) => integer(team?.number || team?.teamNumber) === number) ||
      teams[index] ||
      {};
    const id = cleanText(source.id) || `team-${number}`;
    const sourceSeats = list(source.seats || source.assignments);
    const seats = Array.from({ length: ROSTER_SIZE }, (_unused, seatIndex) => {
      const seatNumber = seatIndex + 1;
      const seat =
        sourceSeats.find(
          (candidate) => integer(candidate?.seatNumber || candidate?.number) === seatNumber
        ) ||
        sourceSeats[seatIndex] ||
        {};
      return normalizeSeat(seat, id, seatNumber);
    });
    return {
      id,
      number,
      name: cleanText(source.name || source.label) || `Team ${number}`,
      generatedName: !cleanText(source.name || source.label),
      color: cleanText(source.color),
      captainId: cleanText(source.captainId),
      coLeaderIds: uniqueTextList(
        source.coLeaderIds || source.coleaderIds || source.coLeaders
      ).slice(0, 2),
      notes: cleanText(source.notes),
      seats,
    };
  });
}

function normalizeRoleGroups(snapshot) {
  const roles = list(snapshot?.plan?.roleGroups || snapshot?.roleGroups || snapshot?.roles).map(
    (role, index) => ({
      id: cleanText(role?.id) || `role-${index + 1}`,
      label: cleanText(role?.label || role?.name) || `Role ${index + 1}`,
      generatedLabel: !cleanText(role?.label || role?.name),
      capacity: Math.max(0, integer(role?.capacity)),
      color: cleanText(role?.color) || '#64748b',
      order: integer(role?.order, index + 1),
    })
  );
  return roles.length
    ? roles.sort((a, b) => a.order - b.order)
    : [
        {
          id: 'unassigned',
          label: 'Unassigned',
          generatedLabel: true,
          capacity: ROSTER_SIZE,
          color: '#64748b',
          order: 1,
        },
      ];
}

function normalizePhases(snapshot) {
  const phases = list(snapshot?.plan?.phases || snapshot?.phases).map((phase, index) => ({
    id: cleanText(phase?.id) || `phase-${index + 1}`,
    label: cleanText(phase?.label || phase?.name) || `Phase ${index + 1}`,
    generatedLabel: !cleanText(phase?.label || phase?.name),
    startMinute: Math.max(0, integer(phase?.startMinute ?? phase?.start)),
    endMinute: Math.max(0, integer(phase?.endMinute ?? phase?.end)),
    order: integer(phase?.order, index + 1),
  }));
  return phases.length
    ? phases.sort((a, b) => a.order - b.order)
    : DEFAULT_PHASES.map((phase) => ({ ...phase, generatedLabel: true }));
}

function normalizeLegions(snapshot) {
  const legions = list(snapshot?.plan?.legions || snapshot?.legions).map((legion, index) => ({
    id: cleanText(legion?.id) || `legion-${index + 1}`,
    label: cleanText(legion?.label || legion?.name) || `Legion ${index + 1}`,
    generatedLabel: !cleanText(legion?.label || legion?.name),
    order: integer(legion?.order, index + 1),
  }));
  return legions.length
    ? legions.sort((a, b) => a.order - b.order)
    : DEFAULT_LEGIONS.map((legion) => ({ ...legion, generatedLabel: true }));
}

function normalizeEventSchedule(source = {}) {
  const schedule = source && typeof source === 'object' ? source : {};
  const status = cleanText(schedule.status) === 'published' ? 'published' : 'hidden';
  return {
    schemaVersion: 1,
    seasonId: cleanText(schedule.seasonId),
    status,
    eventStartsAt: normalizeEventDateTime(schedule.eventStartsAt),
    eventEndsAt: normalizeEventDateTime(schedule.eventEndsAt),
    milestones: list(schedule.milestones)
      .slice(0, MAX_EVENT_MILESTONES)
      .map((milestone, index) => ({
        id: cleanText(milestone?.id) || `milestone-${index + 1}`,
        label: cleanText(milestone?.label),
        startsAt: normalizeEventDateTime(milestone?.startsAt),
      })),
    teamGameTimes: list(schedule.teamGameTimes).map((entry) => ({
      teamId: cleanText(entry?.teamId),
      startsAt: normalizeEventDateTime(entry?.startsAt),
    })),
    revision: adapterRevision(schedule.revision),
    createdAt: schedule.createdAt || null,
    updatedAt: schedule.updatedAt || null,
    updatedBy: cleanText(schedule.updatedBy),
  };
}

function normalizeSnapshot(source = {}) {
  const snapshot = source && typeof source === 'object' ? source : {};
  const scoring = snapshot.scoring && typeof snapshot.scoring === 'object' ? snapshot.scoring : {};
  const plan = snapshot.plan && typeof snapshot.plan === 'object' ? snapshot.plan : {};
  const teamCount = normalizeTeamCount(
    snapshot.event?.teamCount ?? snapshot.teamCount ?? (list(snapshot.teams).length || TEAM_COUNT)
  );
  return {
    ...snapshot,
    revision: Math.max(0, integer(snapshot.revision)),
    event: {
      ...(snapshot.event || {}),
      teamCount,
      rosterSize: ROSTER_SIZE,
      fieldSize: teamCount * ROSTER_SIZE,
      balanceMetric: normalizeBalanceMetric(
        snapshot.event?.balanceMetric ?? snapshot.balanceMetric
      ),
    },
    submissions: list(snapshot.submissions),
    raceScores: list(snapshot.raceScores),
    scores: list(snapshot.scores || snapshot.scoredPlayers),
    scoring: {
      ...scoring,
      versions: list(scoring.versions),
    },
    teams: normalizeTeams(snapshot.teams, teamCount),
    plan: {
      ...plan,
      roleGroups: normalizeRoleGroups(snapshot),
      phases: normalizePhases(snapshot),
      legions: normalizeLegions(snapshot),
      instructions: list(plan.instructions || snapshot.instructions),
      rotations: list(plan.rotations || snapshot.rotations),
      objectives: list(plan.objectives || snapshot.objectives),
      notes: list(plan.notes || snapshot.notes),
    },
    publications:
      snapshot.publications && typeof snapshot.publications === 'object'
        ? snapshot.publications
        : {},
    eventSchedule: normalizeEventSchedule(snapshot.eventSchedule),
    validation:
      snapshot.validation && typeof snapshot.validation === 'object' ? snapshot.validation : {},
    documentRevisions: {
      ...(snapshot.documentRevisions && typeof snapshot.documentRevisions === 'object'
        ? snapshot.documentRevisions
        : {}),
      eventSchedule: adapterRevision(
        snapshot.documentRevisions?.eventSchedule ?? snapshot.eventSchedule?.revision
      ),
    },
  };
}

const VTS_SCORE_COMPARISON_FIELDS = Object.freeze([
  ['totalCastlePower', 'adminBohStatTotalPower', 'Total power'],
  ['troopPower', 'adminBohStatTroopPower', 'Troop power'],
  ['buildingPower', 'adminBohStatBuildingPower', 'Building power'],
  ['technologyPower', 'adminBohStatTechnologyPower', 'Technology power'],
  ['heroCombatPower', 'adminBohStatHeroPower', 'Hero combat power'],
  ['dragonPower', 'adminBohStatDragonPower', 'Dragon power'],
  ['unitSpecialtyPower', 'adminBohStatUnitSpecialtyPower', 'Unit specialty power'],
  ['artifactPower', 'adminBohStatArtifactPower', 'Artifact power'],
  ['royalTechPower', 'adminBohStatRoyalTechPower', 'Royal Tech power'],
]);
const VTS_SCORE_REQUIRED_COMPARISON_FIELDS = new Set(
  VTS_SCORE_COMPARISON_FIELDS.slice(0, 7).map(([field]) => field)
);

export function buildAdminVtsScoreRows(submissionsInput = [], raceScoresInput = []) {
  const scoreBySubmission = new Map(
    list(raceScoresInput)
      .map((score) => [cleanText(score?.submissionUid), score])
      .filter(([submissionUid]) => submissionUid)
  );
  return list(submissionsInput)
    .filter((submission) => cleanText(submission?.status) === 'submitted')
    .map((submission) => {
      const submissionUid = cleanText(
        submission?.submissionUid || submission?.uid || submission?.playerId || submission?.id
      );
      const score = scoreBySubmission.get(submissionUid) || null;
      const baselineSource =
        submission?.confirmedStats && typeof submission.confirmedStats === 'object'
          ? submission.confirmedStats
          : submission?.stats && typeof submission.stats === 'object'
            ? submission.stats
            : submission;
      const finalSource =
        score?.powerValues && typeof score.powerValues === 'object'
          ? score.powerValues
          : score && Number.isFinite(Number(score.dragonPower))
            ? { dragonPower: Number(score.dragonPower) }
            : {};
      const comparisons = VTS_SCORE_COMPARISON_FIELDS.map(([field]) => {
        const baselineRaw =
          field === 'totalCastlePower'
            ? (baselineSource?.totalCastlePower ?? baselineSource?.totalPower)
            : baselineSource?.[field];
        const baseline =
          baselineRaw !== null &&
          baselineRaw !== undefined &&
          baselineRaw !== '' &&
          Number.isFinite(Number(baselineRaw))
            ? Math.max(0, Number(baselineRaw))
            : null;
        const final =
          finalSource?.[field] !== null &&
          finalSource?.[field] !== undefined &&
          finalSource?.[field] !== '' &&
          Number.isFinite(Number(finalSource[field]))
            ? Math.max(0, Number(finalSource[field]))
            : null;
        const growth = baseline === null || final === null ? null : final - baseline;
        return {
          field,
          baseline,
          final,
          growth,
          growthPercent: growth === null || baseline <= 0 ? null : (growth / baseline) * 100,
        };
      });
      const comparisonByField = Object.fromEntries(
        comparisons.map((comparison) => [comparison.field, comparison])
      );
      const totalComparison = comparisonByField.totalCastlePower;
      const fullBreakdown =
        score?.schemaVersion === 2 &&
        [...VTS_SCORE_REQUIRED_COMPARISON_FIELDS].every(
          (field) => comparisonByField[field]?.final !== null
        );
      const baselineDragonPower = Math.max(
        0,
        finiteNumber(
          submission?.confirmedStats?.dragonPower ??
            submission?.stats?.dragonPower ??
            submission?.dragonPower
        )
      );
      const confidenceValues = Object.values(score?.ocr?.confidence || {}).filter((value) =>
        Number.isFinite(Number(value))
      );
      return {
        submissionUid,
        gameName: playerName(submission) || cleanText(score?.gameName) || submissionUid,
        tier: baselineDragonPower >= 7_000_000 ? 1 : 2,
        comparisons,
        baselineTotalPower: totalComparison.baseline ?? 0,
        finalTotalPower: totalComparison.final,
        growth: totalComparison.growth,
        growthPercent: totalComparison.growthPercent,
        submitted: fullBreakdown,
        hasUpload: Boolean(score),
        legacyUpload: Boolean(score) && !fullBreakdown,
        submittedAt: score?.updatedAt || score?.updatedAtMs || null,
        revision: integer(score?.revision),
        ocrCorrected:
          score?.ocr?.corrected === true || (score?.ocr?.correctedFields?.length || 0) > 0,
        ocrConfidence: confidenceValues.length
          ? confidenceValues.reduce((sum, value) => sum + Number(value), 0) /
            confidenceValues.length
          : typeof score?.ocr?.confidence === 'number'
            ? score.ocr.confidence
            : null,
      };
    })
    .sort(
      (left, right) =>
        left.tier - right.tier ||
        Number(right.submitted) - Number(left.submitted) ||
        (right.growth ?? Number.NEGATIVE_INFINITY) - (left.growth ?? Number.NEGATIVE_INFINITY) ||
        left.gameName.localeCompare(right.gameName, 'en', { sensitivity: 'base' })
    );
}

function preferenceRecords(source) {
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== 'object') return [];
  return Object.entries(source).map(([uid, preference]) => ({
    ...(preference && typeof preference === 'object' ? preference : {}),
    uid: cleanText(preference?.uid) || uid,
  }));
}

function timePreferenceOrder(value) {
  const numeric = Number(cleanText(value).replace(/^utc\s*/iu, ''));
  return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY;
}

export function getAdminPreferredTeammateNames(submission = {}) {
  return uniqueTextList(submission?.preferredTeammates);
}

export function buildAdminEpicShowdownPreferenceSummary(snapshot = {}) {
  const submissions = list(snapshot?.submissions);
  const submissionsByIdentifier = new Map();
  for (const submission of submissions) {
    const identifiers = uniqueTextList([
      playerId(submission),
      submission?.submissionUid,
      submission?.uid,
      submission?.id,
    ]);
    for (const identifier of identifiers) submissionsByIdentifier.set(identifier, submission);
  }

  const planningOverrides = new Map(
    list(snapshot?.epicPlanningOverrides).map((override) => [
      cleanText(override?.playerId),
      override,
    ])
  );
  const playersById = new Map();
  for (const rawPreference of preferenceRecords(snapshot?.epicPreferences)) {
    const identifier = playerId(rawPreference);
    if (!identifier) continue;
    const submission = submissionsByIdentifier.get(identifier) || null;
    const resolvedId = playerId(submission) || identifier;
    const lanes = uniqueTextList(rawPreference?.lanePreferences)
      .map((lane) => lane.toLocaleLowerCase())
      .filter((lane) => EPIC_LANE_IDS.includes(lane));
    const times = uniqueTextList(rawPreference?.timePreferences);
    const planning = planningOverrides.get(resolvedId) || planningOverrides.get(identifier) || {};
    const laneOverride = EPIC_LANE_IDS.includes(cleanText(planning?.laneOverride))
      ? cleanText(planning.laneOverride)
      : '';
    playersById.set(resolvedId, {
      playerId: resolvedId,
      displayName: playerName(rawPreference) || playerName(submission) || identifier,
      locale: cleanText(submission?.locale || rawPreference?.locale),
      lanes,
      times,
      flexibilityPreference: cleanText(rawPreference?.flexibilityPreference),
      excluded: planning?.excluded === true,
      laneOverride,
      groupId: cleanText(planning?.groupId),
      effectiveLane: '',
    });
  }

  const players = [...playersById.values()].sort((left, right) => {
    const nameCompared = left.displayName.localeCompare(right.displayName, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
    return (
      nameCompared || left.playerId.localeCompare(right.playerId, undefined, { numeric: true })
    );
  });
  const activePlayers = players.filter((player) => !player.excluded);
  for (const player of activePlayers.filter((candidate) => !candidate.groupId)) {
    player.effectiveLane =
      player.laneOverride || (player.lanes.length === 1 ? player.lanes[0] : '');
  }
  const groups = new Map();
  for (const player of activePlayers.filter((candidate) => candidate.groupId)) {
    if (!groups.has(player.groupId)) groups.set(player.groupId, []);
    groups.get(player.groupId).push(player);
  }
  const groupWarnings = [];
  for (const [groupId, members] of [...groups].sort(([left], [right]) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' })
  )) {
    const explicitLanes = uniqueTextList(members.map((member) => member.laneOverride));
    let effectiveLane = '';
    let code = '';
    if (explicitLanes.length > 1) code = 'conflict';
    else if (explicitLanes.length === 1) effectiveLane = explicitLanes[0];
    else {
      const preferredLanes = uniqueTextList(
        members.map((member) => (member.lanes.length === 1 ? member.lanes[0] : ''))
      );
      if (preferredLanes.length === 1 && members.every((member) => member.lanes.length === 1)) {
        effectiveLane = preferredLanes[0];
      } else code = 'unresolved';
    }
    for (const member of members) member.effectiveLane = effectiveLane;
    if (code) {
      groupWarnings.push({
        groupId,
        code,
        status: code,
        playerIds: members.map((member) => member.playerId),
      });
    }
  }
  const status = groupWarnings.some((warning) => warning.code === 'conflict')
    ? 'conflict'
    : groupWarnings.length
      ? 'unresolved'
      : 'ready';
  const laneCounts = Object.fromEntries(EPIC_LANE_IDS.map((lane) => [lane, 0]));
  const effectiveLaneCounts = Object.fromEntries(EPIC_LANE_IDS.map((lane) => [lane, 0]));
  const availableTimes = uniqueTextList(snapshot?.epicTimeSlotIds);
  const timeCounts = new Map(
    (availableTimes.length ? availableTimes : DEFAULT_EPIC_TIME_OPTIONS).map((time) => [time, 0])
  );
  for (const preference of players) {
    for (const lane of preference.lanes) laneCounts[lane] += 1;
    for (const time of preference.times) timeCounts.set(time, (timeCounts.get(time) || 0) + 1);
  }
  for (const player of activePlayers) {
    if (player.effectiveLane) effectiveLaneCounts[player.effectiveLane] += 1;
  }

  const times = [...timeCounts]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => {
      const numericDifference = timePreferenceOrder(left.value) - timePreferenceOrder(right.value);
      return Number.isFinite(numericDifference)
        ? numericDifference
        : left.value.localeCompare(right.value, undefined, { numeric: true });
    });

  return {
    players,
    activePlayers,
    laneCounts,
    effectiveLaneCounts,
    times,
    status,
    totalPlayers: players.length,
    activeTotal: activePlayers.length,
    activeCount: activePlayers.length,
    excludedPlayers: players.filter((player) => player.excluded),
    excludedTotal: players.length - activePlayers.length,
    excludedCount: players.length - activePlayers.length,
    groupWarnings,
  };
}

export function buildEpicShowdownPlanningCsv(summaryOrSnapshot = {}, options = {}) {
  const summary = Array.isArray(summaryOrSnapshot?.players)
    ? summaryOrSnapshot
    : buildAdminEpicShowdownPreferenceSummary(summaryOrSnapshot);
  const headers = [
    'Player ID',
    'Player',
    'Locale',
    'Preferred Lanes',
    'Preferred Times',
    'Flexibility',
    'Lane Override',
    'Effective Lane',
    'Group',
  ];
  const players = list(summary.players)
    .filter((player) => options.includeExcluded === true || player.excluded !== true)
    .sort((left, right) => {
      const nameCompared = cleanText(left?.displayName).localeCompare(
        cleanText(right?.displayName),
        undefined,
        { numeric: true, sensitivity: 'base' }
      );
      return (
        nameCompared ||
        cleanText(left?.playerId).localeCompare(cleanText(right?.playerId), undefined, {
          numeric: true,
        })
      );
    });
  const rows = players.map((player) => [
    player.playerId,
    player.displayName,
    player.locale,
    list(player.lanes).join(' | '),
    list(player.times).join(' | '),
    player.flexibilityPreference,
    player.laneOverride,
    player.effectiveLane,
    player.groupId,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  return `${options.includeBom ? '\uFEFF' : ''}${csv}\r\n`;
}

function planningMetadataEntries(source, identityKey = 'name') {
  if (typeof source === 'function') {
    try {
      return planningMetadataEntries(source(), identityKey);
    } catch {
      return [];
    }
  }
  if (Array.isArray(source)) return source;
  if (!source || typeof source !== 'object') return [];
  return Object.entries(source).map(([id, value]) => {
    if (value && typeof value === 'object') return { [identityKey]: id, ...value };
    return { [identityKey]: id, label: cleanText(value) };
  });
}

function planningValueKey(value) {
  return cleanText(value).normalize('NFKC').toLocaleLowerCase('en');
}

function canonicalHeroType(value) {
  const normalized = planningValueKey(value);
  if (['cavalry', 'cav'].includes(normalized)) return 'cavalry';
  if (['archer', 'archers', 'ranged'].includes(normalized)) return 'archers';
  if (['footman', 'footmen', 'infantry'].includes(normalized)) return 'footmen';
  if (['all', 'any', 'universal'].includes(normalized)) return 'all';
  return '';
}

function planningResearchLabels(options = {}) {
  const source =
    options.researchMetadata || options.researchCatalog || options.catalogs?.research || [];
  return new Map(
    planningMetadataEntries(source, 'id')
      .map((item) => {
        const id = cleanText(item?.id || item?.researchTreeId || item?.key);
        const label = cleanText(item?.label || item?.name) || id;
        return id ? [planningValueKey(id), label] : null;
      })
      .filter(Boolean)
  );
}

export function buildAdminSignupPlanningSignals(submission = {}, options = {}) {
  const stats = submission?.confirmedStats || submission?.stats || {};
  const commitment = submission?.commitment || {};
  const heroMetadata = planningMetadataEntries(
    options.heroMetadata || options.heroCatalog || options.catalogs?.heroes || []
  );
  const heroMetadataByName = new Map(
    heroMetadata
      .map((hero) => {
        const name = cleanText(hero?.name || hero?.label || hero?.id);
        return name ? [planningValueKey(name), hero] : null;
      })
      .filter(Boolean)
  );
  const usableHeroNames = uniqueTextList(stats?.usableHeroNames);
  const hasTypedHeroMetadata = usableHeroNames.some((name) => {
    const metadata = heroMetadataByName.get(planningValueKey(name));
    return canonicalHeroType(metadata?.Type || metadata?.type || metadata?.troopType);
  });
  const heroesByGroup = new Map();
  for (const name of usableHeroNames) {
    const metadata = heroMetadataByName.get(planningValueKey(name));
    const type = canonicalHeroType(metadata?.Type || metadata?.type || metadata?.troopType);
    const groupId = type || (hasTypedHeroMetadata ? 'other' : 'ungrouped');
    if (!heroesByGroup.has(groupId)) heroesByGroup.set(groupId, []);
    heroesByGroup.get(groupId).push(name);
  }
  const groupOrder = ['cavalry', 'archers', 'footmen', 'all', 'other', 'ungrouped'];
  const heroGroups = groupOrder
    .filter((groupId) => heroesByGroup.has(groupId))
    .map((groupId) => ({ groupId, names: heroesByGroup.get(groupId) }));

  const researchLabels = planningResearchLabels(options);
  const research = Object.entries(
    stats?.researchProgressPct && typeof stats.researchProgressPct === 'object'
      ? stats.researchProgressPct
      : {}
  )
    .map(([id, rawValue]) => {
      const progress = Number(rawValue);
      if (!Number.isFinite(progress) || progress < 0 || progress > 100) return null;
      return {
        id: cleanText(id),
        label: researchLabels.get(planningValueKey(id)) || cleanText(id),
        progress: Math.round(progress),
      };
    })
    .filter((item) => item?.id);
  const fightingTimeIds = uniqueTextList(commitment?.fightingTimeIds).slice(0, 2);
  const primaryRole = cleanText(commitment?.preferredRole);
  const secondaryRole = cleanText(commitment?.secondaryRole);
  const canHelpLead = commitment?.canHelpLead === true;
  const teamNamePreferences = uniqueTextList(commitment?.teamNamePreferences)
    .filter((id) => TEAM_NAME_LABELS[id])
    .map((id) => TEAM_NAME_LABELS[id]);
  const preferredTeammates = getAdminPreferredTeammateNames(submission);

  return {
    favoriteRole: primaryRole,
    primaryRole,
    secondaryRole,
    canHelpLead,
    teamNamePreferences,
    fightingTimeIds,
    heroGroups,
    preferredTeammates,
    research,
    usableHeroCount: usableHeroNames.length,
    hasSignals: Boolean(
      primaryRole ||
      secondaryRole ||
      canHelpLead ||
      teamNamePreferences.length ||
      fightingTimeIds.length ||
      heroGroups.length ||
      preferredTeammates.length ||
      research.length
    ),
  };
}

const ADAPTER_TEAM_COLORS = ['#7dd3fc', '#a78bfa', '#fb923c', '#34d399', '#f5c451', '#fb7185'];
const ADAPTER_LEGACY_OBJECTIVE_CODES = [
  'CC1',
  'CC2',
  'CC3',
  'CC4',
  'OP1',
  'OP2',
  'OP3',
  'OP4',
  'FH1',
  'FH2',
  'H1',
  'H2',
  'A1',
  'A2',
  'RP1',
  'RP2',
  'T3',
  'T5',
  'T6',
  'T7',
  'T8',
  'T9',
  'RUNE',
];

function adapterClone(value) {
  if (Array.isArray(value)) return value.map(adapterClone);
  if (value instanceof Date) return new Date(value.getTime());
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, adapterClone(item)])
    );
  }
  return value;
}

function adapterRevision(value) {
  return Math.max(0, integer(value));
}

function adapterError(code, message, details = {}) {
  const error = new Error(message || code);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function adapterDefaultPlan() {
  return {
    schemaVersion: BohModel.BOH_PLAN_SCHEMA_VERSION,
    id: 'all-star-boh-plan',
    label: 'All-Star BoH Team Plan',
    roleGroups: BohModel.BOH_DEFAULT_ROLE_GROUPS.map((role, index) => ({
      ...role,
      label: role.id === 'bottom' ? 'Bot Side' : role.label,
      color: ADAPTER_TEAM_COLORS[index % ADAPTER_TEAM_COLORS.length],
    })),
    phases: BohModel.BOH_DEFAULT_PHASES.map((phase) => ({ ...phase })),
    legions: BohModel.BOH_DEFAULT_LEGIONS.map((legion) => ({ ...legion })),
    objectives: [],
    roleDefaults: [],
    seatOverrides: [],
    playerOverrides: [],
    instructions: [],
    rotations: [],
    substitutions: [],
    playerResources: [],
    buildingAnnotations: [],
    notes: [],
  };
}

function adapterDefaultScoringVersion() {
  const profile = BohModel.BOH_2025_SCORING_PROFILE;
  return {
    id: profile.id,
    version: profile.version,
    label: profile.label,
    note: '',
    powerWeights: { ...profile.powerWeights },
    bonusWeights: { ...profile.bonusWeights },
    powerDivisor: profile.powerDivisor,
    precision: profile.precision,
  };
}

function adapterTeamCount(draft) {
  return normalizeTeamCount(draft?.teamCount);
}

function adapterFieldSize(draft) {
  return adapterTeamCount(draft) * ROSTER_SIZE;
}

function adapterDefaultTeamIds(teamCount = TEAM_COUNT) {
  return Array.from({ length: normalizeTeamCount(teamCount) }, (_, index) => `team-${index + 1}`);
}

function adapterPublicationCopy(draft, options = {}) {
  const source =
    draft?.publicationCopy && typeof draft.publicationCopy === 'object'
      ? draft.publicationCopy
      : {};
  return {
    eventName: cleanText(source.eventName),
    title:
      cleanText(source.title) || (options.fallbackTitle === false ? '' : cleanText(draft?.title)),
    subtitle: cleanText(source.subtitle),
    message: cleanText(source.message),
  };
}

function adapterDefaultDraft() {
  const scoringVersion = adapterDefaultScoringVersion();
  return {
    revision: 0,
    title: 'All-Star BoH 2026',
    note: '',
    activeScoringVersionId: scoringVersion.id,
    scoringVersions: [scoringVersion],
    scoreOverrides: [],
    teamCount: TEAM_COUNT,
    balanceMetric: 'score',
    forcedTeamAssignments: [],
    epicPlanningOverrides: [],
    commitmentScoreAdjustments: [],
    teamIds: adapterDefaultTeamIds(),
    playerIds: [],
    plan: adapterDefaultPlan(),
    publicationCopy: { eventName: '', title: '', subtitle: '', message: '' },
    publications: { announcement: false, plan: false },
  };
}

function adapterPlan(draft) {
  const source = draft?.plan && typeof draft.plan === 'object' ? draft.plan : {};
  const defaults = adapterDefaultPlan();
  return {
    ...defaults,
    ...adapterClone(source),
    roleGroups: list(source.roleGroups).length
      ? adapterClone(source.roleGroups)
      : defaults.roleGroups,
    phases: list(source.phases).length ? adapterClone(source.phases) : defaults.phases,
    legions: list(source.legions).length ? adapterClone(source.legions) : defaults.legions,
    objectives: adapterClone(list(source.objectives)),
    roleDefaults: adapterClone(list(source.roleDefaults)),
    seatOverrides: adapterClone(list(source.seatOverrides)),
    playerOverrides: adapterClone(list(source.playerOverrides)),
    instructions: adapterClone(list(source.instructions)),
    rotations: adapterClone(list(source.rotations)),
    substitutions: adapterClone(list(source.substitutions)),
    playerResources: adapterClone(list(source.playerResources)),
    buildingAnnotations: adapterClone(list(source.buildingAnnotations)),
    notes: adapterClone(list(source.notes)),
  };
}

function adapterTeamIds(draft) {
  const teamCount = adapterTeamCount(draft);
  const output = [];
  for (const rawId of list(draft?.teamIds)) {
    const id = cleanText(rawId);
    if (id && !output.includes(id)) output.push(id);
    if (output.length === teamCount) break;
  }
  for (const fallback of adapterDefaultTeamIds(teamCount)) {
    if (output.length === teamCount) break;
    if (!output.includes(fallback)) output.push(fallback);
  }
  return output;
}

function adapterSeatTemplate(plan) {
  try {
    return BohModel.createBohSeatTemplate(plan.roleGroups, { rosterSize: ROSTER_SIZE });
  } catch {
    return BohModel.createBohSeatTemplate(BohModel.BOH_DEFAULT_ROLE_GROUPS, {
      rosterSize: ROSTER_SIZE,
    });
  }
}

function adapterPlanHasAuthoredContent(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan) || plan.generated === true)
    return false;
  return [
    'roleGroups',
    'phases',
    'legions',
    'objectives',
    'roleDefaults',
    'seatOverrides',
    'playerOverrides',
    'instructions',
    'rotations',
    'substitutions',
    'playerResources',
    'buildingAnnotations',
    'notes',
  ].some((key) => list(plan[key]).length > 0);
}

/**
 * Build a fresh Stage-1 tactical plan for one team from the exported Stage-1 template.
 * Seats supply identity only (playerId plus gameName/displayName); every order, phase, legion,
 * and typed instruction flag comes from `bohStage1Timeline`. Callers get a distinct object each
 * time, so two teams never share mutable plan state.
 */
function adapterStage1PlayerOverrideRules(teamId, seats) {
  const rules = [];
  const occupiedSeats = list(seats)
    .filter((seat) => cleanText(seat?.playerId))
    .sort((left, right) => integer(left?.seatNumber) - integer(right?.seatNumber));
  for (const seat of occupiedSeats) {
    const seatNumber = integer(seat?.seatNumber);
    const playerId = cleanText(seat?.playerId);
    const gameName = cleanText(seat?.gameName || seat?.displayName) || playerId;
    const entries = bohStage1Timeline(seatNumber, {
      playerId,
      displayName: gameName,
      gameName,
      roleGroupId: cleanText(seat?.roleGroupId) || bohSeatRoleGroup(seatNumber),
      backup: ['backup', 'main'].includes(cleanText(seat?.lane))
        ? cleanText(seat?.lane) === 'backup'
        : undefined,
    });
    for (const entry of entries) {
      rules.push({
        id: `${BOH_STAGE1_PLAN_ID}-${teamId}-seat-${seatNumber}-${entry.phaseId}-${entry.legionId}`,
        teamId,
        phaseId: entry.phaseId,
        legionId: entry.legionId,
        seatNumber: entry.seatNumber,
        playerId,
        scope: 'player',
        scopeId: playerId,
        roleGroupId: entry.roleGroupId,
        roleLabel: entry.roleLabel,
        order: -100000 + rules.length,
        generated: true,
        instruction: { ...entry.instruction },
      });
    }
  }
  return rules;
}

function adapterStage1TeamPlan(teamId, seats, basePlan = adapterDefaultPlan()) {
  const playerOverrides = adapterStage1PlayerOverrideRules(teamId, seats);
  return {
    schemaVersion: BohModel.BOH_PLAN_SCHEMA_VERSION,
    id: BOH_STAGE1_PLAN_ID,
    label: 'All-Star BoH Stage 1 Plan',
    planId: BOH_STAGE1_PLAN_ID,
    generated: true,
    roleGroups: adapterClone(list(basePlan.roleGroups)),
    phases: BOH_STAGE1_PHASES.map((phase, order) => ({ ...phase, order: order + 1 })),
    legions: BOH_STAGE1_LEGIONS.map((legion, order) => ({ ...legion, order: order + 1 })),
    objectives: adapterClone(list(basePlan.objectives)),
    roleDefaults: adapterClone(list(basePlan.roleDefaults)),
    seatOverrides: adapterClone(list(basePlan.seatOverrides)),
    playerOverrides: [...playerOverrides, ...adapterClone(list(basePlan.playerOverrides))],
    instructions: adapterClone(list(basePlan.instructions)),
    rotations: adapterClone(list(basePlan.rotations)),
    notes: adapterClone(list(basePlan.notes)),
  };
}

function adapterPersistedStage1TeamPlan(teamId, seats, basePlan) {
  const plan = adapterStage1TeamPlan(teamId, seats, basePlan);
  return {
    ...plan,
    playerOverrides: plan.playerOverrides.map((rule, index) => ({
      ...rule,
      order: index + 1,
    })),
  };
}

function adapterMaterializeTeam(state, teamId, index) {
  const source = state.teams.get(teamId) || {};
  const plan = adapterPlan(state.draft);
  const template = adapterSeatTemplate(plan);
  const sourceSeats = list(source.seats);
  const seats = template.map((templateSeat) => {
    const stored = sourceSeats.find(
      (seat) => integer(seat?.seatNumber || seat?.number) === templateSeat.seatNumber
    );
    const storedPlayerId = cleanText(stored?.playerId || stored?.uid);
    const submission = storedPlayerId ? adapterFindSubmission(state, storedPlayerId) : null;
    const effective = submission ? adapterEffectiveSubmission(state, submission) : null;
    const score = submission ? adapterScoreRecord(state, submission) : null;
    return {
      id: cleanText(stored?.id) || `${teamId}-seat-${templateSeat.seatNumber}`,
      seatNumber: templateSeat.seatNumber,
      playerId: storedPlayerId,
      displayName:
        playerName(effective) || cleanText(stored?.displayName || stored?.gameName || stored?.name),
      roleGroupId: templateSeat.roleGroupId,
      roleLabel: templateSeat.roleLabel,
      side: cleanText(stored?.side),
      lane: cleanText(stored?.lane),
      locked: stored?.locked === true,
      score: score ? score.finalScore : finiteNumber(stored?.score),
      totalCastlePower: effective
        ? finiteNumber(effective.stats?.totalCastlePower ?? effective.stats?.totalPower)
        : finiteNumber(stored?.totalCastlePower),
    };
  });
  return {
    ...adapterClone(source),
    id: teamId,
    teamId,
    revision: adapterRevision(source.revision),
    number: integer(source.number, index + 1) || index + 1,
    name: cleanText(source.name || source.label) || `Team ${index + 1}`,
    color: cleanText(source.color) || ADAPTER_TEAM_COLORS[index % ADAPTER_TEAM_COLORS.length],
    captainId: cleanText(source.captainId),
    coLeaderIds: uniqueTextList(source.coLeaderIds || source.coleaderIds || source.coLeaders).slice(
      0,
      2
    ),
    seats,
    plan: adapterPlanHasAuthoredContent(source.plan)
      ? adapterClone(source.plan)
      : adapterStage1TeamPlan(teamId, seats, plan),
    scoreTotal: seats.reduce((total, seat) => total + finiteNumber(seat.score), 0),
    totalCastlePower: seats.reduce((total, seat) => total + finiteNumber(seat.totalCastlePower), 0),
    notes: cleanText(source.notes),
  };
}

function adapterSubmissionUid(submission) {
  return cleanText(submission?.uid || submission?.playerId || submission?.id);
}

function adapterSubmissionId(submission) {
  return cleanText(submission?.playerId || submission?.uid || submission?.id);
}

function adapterFindSubmission(state, identifier) {
  const id = cleanText(identifier);
  return (
    state.submissions.find(
      (submission) =>
        adapterSubmissionId(submission) === id || adapterSubmissionUid(submission) === id
    ) || null
  );
}

function adapterEffectiveSubmission(state, submission) {
  if (!submission) return null;
  return effectiveAdminSubmission(
    submission,
    state.reviews.get(adapterSubmissionUid(submission)) || submission.review
  );
}

function adapterReviewStatusToUi(status) {
  const map = {
    verified: 'confirmed',
    needs_changes: 'needs_correction',
    rejected: 'excluded',
    pending: 'pending',
  };
  return map[cleanText(status).toLowerCase()] || 'pending';
}

function adapterUiStatusToReview(status) {
  const map = {
    confirmed: 'verified',
    approved: 'verified',
    needs_correction: 'needs_changes',
    excluded: 'rejected',
    pending: 'pending',
  };
  return map[cleanText(status).toLowerCase()] || 'pending';
}

function adapterReviewIsFresh(submission, review) {
  return (
    submission?.status === 'submitted' &&
    review?.status === 'verified' &&
    review?.stale !== true &&
    Number.isInteger(submission?.revision) &&
    Number.isInteger(review?.submissionRevision) &&
    review.submissionRevision === submission.revision
  );
}

function adapterReviewMatchesSubmissionRevision(submission, review) {
  return Boolean(
    review &&
    review.stale !== true &&
    Number.isInteger(submission?.revision) &&
    Number.isInteger(review?.submissionRevision) &&
    review.submissionRevision === submission.revision
  );
}

function adapterActiveScoringVersion(state) {
  const versions = list(state.draft?.scoringVersions);
  const activeId = cleanText(state.draft?.activeScoringVersionId);
  return (
    versions.find((version) => version.id === activeId) ||
    versions.at(-1) ||
    adapterDefaultScoringVersion()
  );
}

function adapterUiScoringVersion(version) {
  const power = version?.powerWeights || {};
  const bonus = version?.bonusWeights || {};
  return {
    ...adapterClone(version),
    weights: {
      totalCastlePower: finiteNumber(power.totalCastlePower),
      troopPower: finiteNumber(power.troopPower, 0.05),
      buildingPower: finiteNumber(power.buildingPower, 0.3),
      technologyPower: finiteNumber(power.technologyPower, 0.7),
      heroCombatPower: finiteNumber(power.heroCombatPower, 0.8),
      dragonPower: finiteNumber(power.dragonPower, 1),
      unitSpecialtyPower: finiteNumber(power.unitSpecialtyPower ?? 0),
      t9TroopType: finiteNumber(bonus.t9TroopType, 3000),
      readySpeedHero: finiteNumber(bonus.readySpeedHero, 2500),
      level50Hero: finiteNumber(bonus.level50Hero, 750),
      bohUsefulRating: finiteNumber(bonus.bohUsefulRating, 1000),
      rocLevel: finiteNumber(bonus.rocLevel ?? 0),
      paidUsableHero: finiteNumber(bonus.paidUsableHero ?? 0),
      loftyTroopMillion: finiteNumber(bonus.loftyTroopMillion ?? 0),
      enhancedT10TroopMillion: finiteNumber(bonus.enhancedT10TroopMillion ?? 0),
    },
  };
}

function adapterScoreRecord(state, submission) {
  const uid = adapterSubmissionUid(submission);
  const id = adapterSubmissionId(submission);
  const review = state.reviews.get(uid) || null;
  const effective = adapterEffectiveSubmission(state, submission);
  const reviewMatchesSubmission =
    review?.stale !== true &&
    Number.isInteger(review?.submissionRevision) &&
    review.submissionRevision === submission?.revision;
  const profile = adapterActiveScoringVersion(state);
  let calculated;
  let scoreDiagnostic = '';
  try {
    calculated = BohModel.scoreBohSignup(
      { ...effective, playerId: id, gameName: playerName(effective) || id },
      profile,
      {
        adminUsefulnessRating: reviewMatchesSubmission
          ? (review?.adjustments?.bohUsefulRating ?? 0)
          : 0,
        paidUsableHeroNames: state.paidUsableHeroNames,
      }
    );
  } catch {
    calculated = { total: 0, breakdown: {} };
    scoreDiagnostic = 'calculation_failed';
  }
  const storedScore = review?.score && typeof review.score === 'object' ? review.score : null;
  if (!scoreDiagnostic && review && !reviewMatchesSubmission && !storedScore) {
    scoreDiagnostic = 'stale_submission';
  } else if (!scoreDiagnostic && adapterReviewIsFresh(submission, review) && !storedScore) {
    scoreDiagnostic = 'unverifiable';
  }
  if (!scoreDiagnostic && storedScore) {
    const storedProfileId = cleanText(storedScore.profileId);
    const storedProfileVersion = Number(storedScore.profileVersion);
    const storedTotal = Number(storedScore.total);
    const storedScoreIsVerifiable =
      storedProfileId &&
      Number.isInteger(storedProfileVersion) &&
      storedProfileVersion > 0 &&
      storedScore.total !== null &&
      storedScore.total !== '' &&
      Number.isFinite(storedTotal);
    if (!reviewMatchesSubmission) scoreDiagnostic = 'stale_submission';
    else if (!storedScoreIsVerifiable) scoreDiagnostic = 'unverifiable';
    else if (
      storedProfileId !== cleanText(calculated.profileId) ||
      storedProfileVersion !== Number(calculated.profileVersion)
    ) {
      scoreDiagnostic = 'stale_profile';
    } else {
      const precision = Math.max(0, Math.min(6, integer(calculated.precision)));
      const tolerance = 0.5 * 10 ** -precision;
      if (Math.abs(storedTotal - finiteNumber(calculated.total)) > tolerance) {
        scoreDiagnostic = 'stored_mismatch';
      }
    }
  }
  const override = list(state.draft?.scoreOverrides).find((item) => item.playerId === id);
  const commitment = list(state.draft?.commitmentScoreAdjustments).find(
    (item) => item.playerId === id
  );
  const calculatedScore = finiteNumber(calculated?.total);
  const measuredScore = override ? finiteNumber(override.score) : calculatedScore;
  const commitmentScore = commitment ? finiteNumber(commitment.score) : null;
  const finalScore = measuredScore + (commitmentScore ?? 0);
  return {
    playerId: id,
    uid,
    displayName: playerName(effective) || id,
    originalDisplayName: playerName(submission) || id,
    totalCastlePower: finiteNumber(
      effective?.stats?.totalCastlePower ?? effective?.stats?.totalPower
    ),
    reviewStatus: adapterReviewIsFresh(submission, review)
      ? adapterReviewStatusToUi(review?.status)
      : 'pending',
    reviewStale:
      Boolean(review) &&
      (review?.stale === true || review?.submissionRevision !== submission?.revision),
    calculatedScore,
    overrideScore: override ? finiteNumber(override.score) : null,
    overrideReason: cleanText(override?.reason),
    commitmentScore,
    commitmentScoreReason: cleanText(commitment?.reason),
    scoreDiagnostic,
    finalScore,
    score: { ...adapterClone(calculated), total: finalScore },
    scoreBreakdown: adapterClone(calculated?.breakdown || {}),
  };
}

function adapterDisplayRule(rule, scope) {
  const instruction =
    rule?.instruction && typeof rule.instruction === 'object' ? rule.instruction : {};
  return {
    ...adapterClone(rule),
    scope,
    scopeId:
      scope === 'role'
        ? cleanText(rule.roleGroupId)
        : scope === 'seat'
          ? integer(rule.seatNumber)
          : cleanText(rule.playerId),
    action: cleanText(instruction.action),
    startObjectiveId: cleanText(instruction.startObjectiveId),
    objectiveId: cleanText(instruction.objectiveId),
    objectiveCode: cleanText(instruction.targetLabel),
    viaObjectiveIds: adapterClone(list(instruction.viaObjectiveIds)),
    pathObjectiveIds: adapterClone(list(instruction.pathObjectiveIds)),
    loadout: cleanText(instruction.loadout),
    teleport: instruction.teleport,
    ...(hasOwn(instruction, 'standby') && typeof instruction.standby === 'boolean'
      ? { standby: instruction.standby }
      : {}),
    ...(hasOwn(instruction, 'gatherCrystals') && typeof instruction.gatherCrystals === 'boolean'
      ? { gatherCrystals: instruction.gatherCrystals }
      : {}),
    note: cleanText(instruction.note),
    instruction: cleanText(instruction.summary || instruction.note),
  };
}

function adapterUiPlan(state) {
  const plan = adapterPlan(state.draft);
  const runtimeDefaultTeams = adapterTeamIds(state.draft)
    .map((teamId, index) => adapterMaterializeTeam(state, teamId, index))
    .filter((team) => !adapterPlanHasAuthoredContent(state.teams.get(team.id)?.plan));
  const generatedPlayerOverrides = runtimeDefaultTeams.flatMap((team) =>
    adapterStage1PlayerOverrideRules(team.id, team.seats)
  );
  return {
    ...adapterClone(plan),
    phases: runtimeDefaultTeams.length
      ? BOH_STAGE1_PHASES.map((phase, order) => ({ ...phase, order: order + 1 }))
      : adapterClone(plan.phases),
    legions: runtimeDefaultTeams.length
      ? BOH_STAGE1_LEGIONS.map((legion, order) => ({ ...legion, order: order + 1 }))
      : adapterClone(plan.legions),
    playerOverrides: [...generatedPlayerOverrides, ...adapterClone(list(plan.playerOverrides))],
    instructions: [
      ...plan.roleDefaults.map((rule) => adapterDisplayRule(rule, 'role')),
      ...plan.seatOverrides.map((rule) => adapterDisplayRule(rule, 'seat')),
      ...generatedPlayerOverrides.map((rule) => adapterDisplayRule(rule, 'player')),
      ...plan.playerOverrides.map((rule) => adapterDisplayRule(rule, 'player')),
      ...plan.instructions.map((rule) => adapterDisplayRule(rule, rule.scope || 'global')),
    ],
  };
}

function adapterSnapshot(state) {
  const draft = state.draft || adapterDefaultDraft();
  const submissions = state.submissions.map((submission) => {
    const uid = adapterSubmissionUid(submission);
    const review = state.reviews.get(uid) || null;
    const effective = adapterEffectiveSubmission(state, submission);
    const score = adapterScoreRecord(state, submission);
    return {
      ...adapterClone(effective),
      playerId: adapterSubmissionId(submission),
      submissionUid: uid,
      originalGameName: playerName(submission),
      reviewStatus: adapterReviewIsFresh(submission, review)
        ? adapterReviewStatusToUi(review?.status)
        : 'pending',
      reviewStale:
        Boolean(review) &&
        (review?.stale === true || review?.submissionRevision !== submission?.revision),
      review: adapterClone(review),
      score: score.score,
      calculatedScore: score.calculatedScore,
      overrideScore: score.overrideScore,
      overrideReason: score.overrideReason,
      commitmentScore: score.commitmentScore,
      commitmentScoreReason: score.commitmentScoreReason,
      finalScore: score.finalScore,
      scoreDiagnostic: score.scoreDiagnostic,
    };
  });
  const scores = state.submissions.map((submission) => adapterScoreRecord(state, submission));
  const versions = list(draft.scoringVersions).map(adapterUiScoringVersion);
  const active = adapterUiScoringVersion(adapterActiveScoringVersion(state));
  const publication = state.publication || {};
  const announcementPublished = publication.announcementPublished === true;
  const planPublished = publication.planPublished === true;
  return {
    revision: state.revision,
    event: {
      teamCount: adapterTeamCount(draft),
      rosterSize: ROSTER_SIZE,
      fieldSize: adapterFieldSize(draft),
      balanceMetric: normalizeBalanceMetric(draft.balanceMetric),
    },
    submissions,
    raceScores: adapterClone(state.raceScores),
    epicPreferences: adapterClone(state.epicPreferences),
    epicTimeSlotIds: adapterClone(list(state.adminStore?.epicTimeSlotIds)),
    epicPlanningOverrides: adapterClone(list(draft.epicPlanningOverrides)),
    scores,
    eligiblePlayerIds: adapterClone(list(draft.playerIds)),
    forcedTeamAssignments: adapterClone(list(draft.forcedTeamAssignments)),
    balancePreview: adapterClone(state.balancePreview),
    scoring: {
      activeVersion: active,
      versions,
    },
    teams: adapterTeamIds(draft).map((teamId, index) =>
      adapterMaterializeTeam(state, teamId, index)
    ),
    plan: adapterUiPlan(state),
    publicationCopy: adapterPublicationCopy(draft),
    publications: {
      announcement: {
        status: announcementPublished ? 'published' : 'draft',
        revision: announcementPublished ? adapterRevision(publication.revision) : null,
        publishedAt: announcementPublished ? publication.updatedAt || null : null,
      },
      plan: {
        status: planPublished ? 'published' : 'draft',
        revision: planPublished ? adapterRevision(publication.revision) : null,
        publishedAt: planPublished ? publication.updatedAt || null : null,
      },
    },
    eventSchedule: normalizeEventSchedule(state.eventSchedule),
    validation: adapterClone(state.validation || {}),
    documentRevisions: {
      draft: adapterRevision(draft.revision),
      publication: state.publicationRevision,
      eventSchedule: state.eventScheduleRevision,
      teams: Object.fromEntries(
        adapterTeamIds(draft).map((teamId, index) => [
          teamId,
          adapterMaterializeTeam(state, teamId, index).revision,
        ])
      ),
      reviews: Object.fromEntries(
        [...state.reviews].map(([uid, review]) => [uid, adapterRevision(review?.revision)])
      ),
    },
  };
}

function adapterBalancePreviewMatchesCurrentSource(state) {
  return Boolean(
    state.balancePreview &&
    JSON.stringify(state.balancePreview.source) === JSON.stringify(adapterBalanceSource(state))
  );
}

function adapterNotify(state, changed = true, options = {}) {
  if (changed) {
    state.revision += 1;
    state.validation = {};
    if (options.preserveBalancePreview !== true) state.balancePreview = null;
  }
  const snapshot = adapterSnapshot(state);
  for (const listener of [...state.listeners]) {
    try {
      listener(snapshot);
    } catch (error) {
      state.options.onError?.(error, { action: 'adapter-subscription' });
    }
  }
  return snapshot;
}

function adapterHandleBackgroundError(state, error, action) {
  if (state.stopped) return;
  state.options.onError?.(error, { action });
}

async function adapterReadReviews(state, submissions = state.submissions) {
  const entries = await Promise.all(
    submissions.map(async (submission) => {
      const uid = adapterSubmissionUid(submission);
      if (!uid) return null;
      const review = await state.adminStore.getReview(uid);
      return [uid, review];
    })
  );
  return new Map(entries.filter(Boolean));
}

async function adapterLoadReviews(state) {
  state.reviews = await adapterReadReviews(state);
}

async function adapterReadTeams(state, draft = state.draft) {
  const teamIds = adapterTeamIds(draft);
  const entries = await Promise.all(
    teamIds.map(async (teamId) => [teamId, await state.adminStore.getDraftTeam(teamId)])
  );
  return new Map(entries);
}

async function adapterReadDraftTeams(state) {
  const draft = (await state.adminStore.getDraft()) || adapterDefaultDraft();
  const teams = await adapterReadTeams(state, draft);
  return { draft, teams };
}

async function adapterLoadTeams(state) {
  state.teams = await adapterReadTeams(state);
}

async function adapterReadPublication(state) {
  const getter = state.adminStore.getPublication || state.options.publicationStore?.getPublication;
  if (typeof getter !== 'function') {
    return {
      publication: state.publication,
      publicationRevision: state.publicationRevision,
    };
  }
  const owner = state.adminStore.getPublication ? state.adminStore : state.options.publicationStore;
  const publication = (await Promise.resolve(getter.call(owner))) || null;
  return {
    publication,
    publicationRevision: adapterRevision(publication?.revision ?? state.publicationRevision),
  };
}

async function adapterReadEventSchedule(state) {
  if (typeof state.adminStore.getEventSchedule !== 'function') {
    return state.eventSchedule || normalizeEventSchedule();
  }
  return normalizeEventSchedule(await state.adminStore.getEventSchedule());
}

async function adapterReadEpicPreferences(state) {
  if (typeof state.adminStore.getEpicShowdownPreferencesList !== 'function') {
    return [];
  }
  return list(await state.adminStore.getEpicShowdownPreferencesList());
}

async function adapterReadRaceScores(state) {
  if (typeof state.adminStore.listRaceScores !== 'function') return [];
  return list(await state.adminStore.listRaceScores());
}

async function adapterLoadAll(state, changed = true) {
  const [submissions, draft] = await Promise.all([
    state.adminStore.listSubmissions(),
    state.adminStore.getDraft(),
  ]);
  const nextSubmissions = list(submissions);
  const nextDraft = draft || adapterDefaultDraft();
  const [reviews, teams, publication, epicPreferences, eventSchedule, raceScores] =
    await Promise.all([
      adapterReadReviews(state, nextSubmissions),
      adapterReadTeams(state, nextDraft),
      adapterReadPublication(state),
      adapterReadEpicPreferences(state),
      adapterReadEventSchedule(state),
      adapterReadRaceScores(state),
    ]);
  state.submissions = nextSubmissions;
  state.reviews = reviews;
  state.publication = publication.publication;
  state.publicationRevision = publication.publicationRevision;
  state.epicPreferences = epicPreferences;
  state.eventSchedule = eventSchedule;
  state.raceScores = raceScores;
  state.eventScheduleRevision = adapterRevision(eventSchedule?.revision);
  if (state.teamUnsubscribers.size || state.unsubscribers.size) {
    await adapterAdoptDraftTeams(state, { draft: nextDraft, teams }, 'loadAll', false);
  } else {
    state.draft = nextDraft;
    state.teams = teams;
  }
  return adapterNotify(state, changed, {
    preserveBalancePreview: changed && adapterBalancePreviewMatchesCurrentSource(state),
  });
}

async function adapterReplaceTeamSubscriptions(state) {
  const desired = new Set(adapterTeamIds(state.draft));
  for (const [teamId, unsubscribe] of [...state.teamUnsubscribers]) {
    if (desired.has(teamId)) continue;
    try {
      unsubscribe?.();
    } catch {
      // Listener teardown is best-effort.
    }
    state.teamUnsubscribers.delete(teamId);
    state.teams.delete(teamId);
  }
  for (const teamId of desired) {
    if (state.teamUnsubscribers.has(teamId)) continue;
    const unsubscribe = await state.adminStore.subscribeDraftTeam(
      teamId,
      (team) => {
        if (state.stopped) return;
        const current = state.teams.get(teamId);
        if (
          state.teams.has(teamId) &&
          adapterRevision(team?.revision) <= adapterRevision(current?.revision)
        ) {
          return;
        }
        state.teams.set(teamId, team);
        if (!state.teamSubscriptionNotificationsSuspended) adapterNotify(state);
      },
      (error) => adapterHandleBackgroundError(state, error, 'subscribeDraftTeam')
    );
    state.teamUnsubscribers.set(teamId, unsubscribe);
  }
}

async function adapterAdoptDraftTeams(state, source, action, notify = true) {
  state.draft = source.draft || adapterDefaultDraft();
  state.teams =
    source.teams instanceof Map ? source.teams : new Map(Object.entries(source.teams || {}));
  state.teamSubscriptionNotificationsSuspended += 1;
  try {
    await adapterReplaceTeamSubscriptions(state);
  } catch (error) {
    adapterHandleBackgroundError(state, error, action);
  } finally {
    state.teamSubscriptionNotificationsSuspended -= 1;
  }
  if (notify) adapterNotify(state);
}

async function adapterStartSubscriptions(state) {
  const submissionsUnsubscribe = await state.adminStore.subscribeSubmissions(
    (submissions) => {
      if (state.stopped) return;
      state.submissions = list(submissions);
      void adapterLoadReviews(state)
        .then(() =>
          adapterNotify(state, true, {
            preserveBalancePreview: adapterBalancePreviewMatchesCurrentSource(state),
          })
        )
        .catch((error) => adapterHandleBackgroundError(state, error, 'subscribeSubmissions'));
    },
    (error) => adapterHandleBackgroundError(state, error, 'subscribeSubmissions')
  );
  state.unsubscribers.add(submissionsUnsubscribe);

  if (typeof state.adminStore.subscribeRaceScores === 'function') {
    const unsubscribe = await state.adminStore.subscribeRaceScores(
      (scores) => {
        if (state.stopped) return;
        state.raceScores = list(scores);
        adapterNotify(state, false);
      },
      (error) => adapterHandleBackgroundError(state, error, 'subscribeRaceScores')
    );
    state.unsubscribers.add(unsubscribe);
  }

  const draftUnsubscribe = await state.adminStore.subscribeDraft(
    (draft) => {
      if (state.stopped) return;
      const nextDraft = draft || adapterDefaultDraft();
      if (adapterRevision(nextDraft.revision) <= adapterRevision(state.draft?.revision)) return;
      state.draft = nextDraft;
      void adapterReplaceTeamSubscriptions(state)
        .then(() => adapterNotify(state))
        .catch((error) => adapterHandleBackgroundError(state, error, 'subscribeDraft'));
    },
    (error) => adapterHandleBackgroundError(state, error, 'subscribeDraft')
  );
  state.unsubscribers.add(draftUnsubscribe);
  await adapterReplaceTeamSubscriptions(state);

  const publicationSubscriber =
    state.adminStore.subscribePublication || state.options.publicationStore?.subscribePublication;
  if (typeof publicationSubscriber === 'function') {
    const owner = state.adminStore.subscribePublication
      ? state.adminStore
      : state.options.publicationStore;
    const unsubscribe = await publicationSubscriber.call(
      owner,
      (publication) => {
        if (state.stopped) return;
        state.publication = publication || null;
        state.publicationRevision = adapterRevision(
          publication?.revision ?? state.publicationRevision
        );
        adapterNotify(state);
      },
      (error) => adapterHandleBackgroundError(state, error, 'subscribePublication')
    );
    state.unsubscribers.add(unsubscribe);
  }

  if (typeof state.adminStore.subscribeEpicShowdownPreferences === 'function') {
    const unsubscribe = await state.adminStore.subscribeEpicShowdownPreferences(
      (preferences) => {
        if (state.stopped) return;
        state.epicPreferences = list(preferences);
        adapterNotify(state, false);
      },
      (error) => adapterHandleBackgroundError(state, error, 'subscribeEpicShowdownPreferences')
    );
    state.unsubscribers.add(unsubscribe);
  }

  if (typeof state.adminStore.subscribeEventSchedule === 'function') {
    const unsubscribe = await state.adminStore.subscribeEventSchedule(
      (schedule) => {
        if (state.stopped) return;
        state.eventSchedule = normalizeEventSchedule(schedule);
        state.eventScheduleRevision = adapterRevision(state.eventSchedule?.revision);
        adapterNotify(state, false);
      },
      (error) => adapterHandleBackgroundError(state, error, 'subscribeEventSchedule')
    );
    state.unsubscribers.add(unsubscribe);
  }
}

function adapterAssertRevision(state, payload, command) {
  const expected = adapterRevision(payload?.expectedRevision ?? command?.expectedRevision);
  if (expected !== state.revision) {
    throw adapterError(
      'all-star-boh-ui-conflict',
      `All-Star BoH data changed in another session (expected UI revision ${expected}, found ${state.revision}).`,
      { expectedRevision: expected, actualRevision: state.revision }
    );
  }
}

async function adapterSaveDraft(state, mutate, options = {}) {
  const current = adapterClone(state.draft || adapterDefaultDraft());
  current.teamIds = adapterTeamIds(current);
  current.plan = adapterPlan(current);
  const next = (await Promise.resolve(mutate(current))) || current;
  const saved = await state.adminStore.saveDraft(next, {
    expectedRevision: adapterRevision(state.draft?.revision),
  });
  state.draft = saved || next;
  if (options.notify !== false) adapterNotify(state);
  return state.draft;
}

async function adapterSavePublicationCopy(state, payload) {
  return adapterSaveDraft(state, (draft) => ({
    ...draft,
    publicationCopy: {
      eventName: cleanText(payload.eventName),
      title: cleanText(payload.title),
      subtitle: cleanText(payload.subtitle),
      message: cleanText(payload.message),
    },
  }));
}

async function adapterSaveTeam(state, teamId, mutate, options = {}) {
  const teamIds = adapterTeamIds(state.draft);
  const index = Math.max(0, teamIds.indexOf(teamId));
  const current = adapterMaterializeTeam(state, teamId, index);
  const next = (await Promise.resolve(mutate(adapterClone(current)))) || current;
  const saved = await state.adminStore.saveDraftTeam(teamId, next, {
    expectedRevision: adapterRevision(state.teams.get(teamId)?.revision),
  });
  state.teams.set(teamId, saved || next);
  if (options.notify !== false) adapterNotify(state);
  return state.teams.get(teamId);
}

async function adapterSaveEventSchedule(state, payload) {
  if (typeof state.adminStore.saveEventSchedule !== 'function') {
    throw adapterError(
      'all-star-boh-event-schedule-unavailable',
      'Event schedule storage is unavailable.'
    );
  }
  const teamIds = adapterTeamIds(state.draft).slice(0, TEAM_COUNT);
  const expectedRevision = adapterRevision(
    payload.expectedScheduleRevision ?? state.eventScheduleRevision
  );
  const published = cleanText(payload.status) === 'published';
  const schedule = normalizeEventSchedule({
    ...payload,
    revision: expectedRevision,
    status: published ? 'published' : 'hidden',
    // Hidden is an explicit public reset. Its save clears every public schedule field.
    eventStartsAt: published ? payload.eventStartsAt : '',
    eventEndsAt: published ? payload.eventEndsAt : '',
    milestones: published ? list(payload.milestones) : [],
    // Team game times are optional: a team with no chosen start is simply omitted. Submitting
    // { startsAt: '' } would fail the canonical schedule normalizer.
    teamGameTimes: published
      ? list(payload.teamGameTimes).filter(
          (entry) => teamIds.includes(cleanText(entry?.teamId)) && cleanText(entry?.startsAt)
        )
      : [],
  });
  const saved = await state.adminStore.saveEventSchedule(schedule, {
    expectedRevision,
    teamIds,
  });
  state.eventSchedule = normalizeEventSchedule(saved || schedule);
  state.eventScheduleRevision = adapterRevision(state.eventSchedule.revision);
  adapterNotify(state, false);
}

function adapterApprovedRosterNameKey(value) {
  return cleanText(value).normalize('NFKC').replace(/\s+/gu, ' ').toLocaleLowerCase('en');
}

function adapterMatchApprovedRoster(state, parsed) {
  const verified = state.submissions
    .map((submission) => {
      const uid = adapterSubmissionUid(submission);
      const review = state.reviews.get(uid) || null;
      if (!adapterReviewIsFresh(submission, review)) return null;
      const effective = adapterEffectiveSubmission(state, submission);
      return {
        playerId: adapterSubmissionId(submission),
        names: uniqueTextList([playerName(effective), playerName(submission)]),
      };
    })
    .filter((candidate) => candidate?.playerId);
  const byName = new Map();
  for (const candidate of verified) {
    for (const name of candidate.names) {
      const key = adapterApprovedRosterNameKey(name);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, new Map());
      byName.get(key).set(candidate.playerId, candidate);
    }
  }
  const warnings = [];
  const matchedTeams = parsed.teams.map((team) => ({
    ...team,
    rows: team.rows.map((row) => {
      const candidates = [...(byName.get(adapterApprovedRosterNameKey(row.name))?.values() || [])];
      if (candidates.length !== 1) {
        warnings.push({
          code: candidates.length ? 'ambiguous' : 'unmatched',
          teamName: row.teamName,
          seatNumber: row.seatNumber,
          name: row.name,
          candidateIds: candidates.map((candidate) => candidate.playerId),
        });
        return { ...row, playerId: '' };
      }
      return { ...row, playerId: candidates[0].playerId };
    }),
  }));
  const uses = new Map();
  for (const team of matchedTeams) {
    for (const row of team.rows) {
      if (!row.playerId) continue;
      if (!uses.has(row.playerId)) uses.set(row.playerId, []);
      uses.get(row.playerId).push(row);
    }
  }
  for (const [playerId, rows] of uses) {
    if (rows.length === 1) continue;
    for (const row of rows) row.playerId = '';
    warnings.push({
      code: 'duplicate-match',
      name: rows.map((row) => row.name).join(' / '),
      candidateIds: [playerId],
    });
  }
  const matchedCount = matchedTeams
    .flatMap((team) => team.rows)
    .filter((row) => row.playerId).length;
  return { teams: matchedTeams, matchedCount, warnings };
}

function adapterMatchMapperExactView(state, parsed) {
  const byName = new Map();
  for (const submission of state.submissions) {
    const uid = adapterSubmissionUid(submission);
    const review = state.reviews.get(uid) || null;
    if (!adapterReviewIsFresh(submission, review)) continue;
    const matchedPlayerId = adapterSubmissionId(submission);
    const effective = adapterEffectiveSubmission(state, submission);
    for (const name of uniqueTextList([playerName(effective), playerName(submission)])) {
      const key = BohModel.normalizeBohNameKey(name);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, new Map());
      byName.get(key).set(matchedPlayerId, { playerId: matchedPlayerId });
    }
  }
  const diagnostics = [];
  const teams = parsed.teams.map((team) => ({
    ...team,
    players: team.players.map((player) => {
      const candidates = [
        ...(byName.get(BohModel.normalizeBohNameKey(player.displayName))?.values() || []),
      ];
      if (candidates.length !== 1) {
        diagnostics.push({
          code: candidates.length ? 'boh-mapper-match-ambiguous' : 'boh-mapper-match-unmatched',
          message: candidates.length
            ? `${player.displayName} matches multiple fresh verified submissions.`
            : `${player.displayName} has no exact fresh verified submission match.`,
          teamId: team.id,
          seatNumber: player.seatNumber,
          displayName: player.displayName,
          candidateIds: candidates.map((candidate) => candidate.playerId),
        });
        return { ...player, teamId: team.id, playerId: '', matchSource: '' };
      }
      return {
        ...player,
        teamId: team.id,
        playerId: candidates[0].playerId,
        matchSource: 'exact',
      };
    }),
  }));
  const uses = new Map();
  for (const player of teams.flatMap((team) => team.players)) {
    if (!player.playerId) continue;
    if (!uses.has(player.playerId)) uses.set(player.playerId, []);
    uses.get(player.playerId).push(player);
  }
  for (const [matchedPlayerId, players] of uses) {
    if (players.length === 1) continue;
    for (const player of players) {
      player.playerId = '';
      player.matchSource = '';
    }
    for (const player of players) {
      diagnostics.push({
        code: 'boh-mapper-match-duplicate-use',
        message: 'One fresh verified submission would be reused for multiple imported seats.',
        teamId: player.teamId,
        seatNumber: player.seatNumber,
        displayName: player.displayName,
        candidateIds: [matchedPlayerId],
      });
    }
  }
  const matchedCount = teams
    .flatMap((team) => team.players)
    .filter((player) => player.playerId).length;
  return {
    format: parsed.format,
    version: parsed.version,
    teamCount: parsed.teamCount,
    playerCount: parsed.playerCount,
    matchedCount,
    unresolvedCount: parsed.playerCount - matchedCount,
    diagnostics,
    teams,
  };
}

function adapterMapperRefreshPreviewMetadata(state, preview) {
  const linkedIds = new Set(
    preview.teams.flatMap((team) =>
      team.players.map((player) => cleanText(player.playerId)).filter(Boolean)
    )
  );
  const candidates = state.submissions
    .filter((submission) =>
      adapterReviewIsFresh(submission, state.reviews.get(adapterSubmissionUid(submission)) || null)
    )
    .map((submission) => {
      const effective = adapterEffectiveSubmission(state, submission);
      const score = adapterScoreRecord(state, submission);
      return {
        playerId: adapterSubmissionId(submission),
        displayName: playerName(effective) || adapterSubmissionId(submission),
        originalDisplayName: playerName(submission) || adapterSubmissionId(submission),
        score: score.finalScore,
      };
    })
    .filter((candidate) => candidate.playerId)
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName, 'en', { sensitivity: 'base' })
    );
  const candidatesById = new Map(candidates.map((candidate) => [candidate.playerId, candidate]));
  for (const player of preview.teams.flatMap((team) => team.players)) {
    player.linkedCandidate = player.playerId
      ? adapterClone(candidatesById.get(player.playerId) || null)
      : null;
    player.linkedScore = player.linkedCandidate?.score ?? null;
  }
  const linkedSubmissions = state.submissions.filter((submission) =>
    linkedIds.has(adapterSubmissionId(submission))
  );
  preview.matchedCount = linkedIds.size;
  preview.unresolvedCount = preview.playerCount - linkedIds.size;
  preview.candidates = candidates.filter((candidate) => !linkedIds.has(candidate.playerId));
  preview.submissionRevisions = linkedSubmissions
    .map((submission) => [adapterSubmissionUid(submission), adapterRevision(submission.revision)])
    .sort(([left], [right]) => left.localeCompare(right));
  preview.reviewRevisions = linkedSubmissions
    .map((submission) => {
      const uid = adapterSubmissionUid(submission);
      const review = state.reviews.get(uid);
      return [uid, adapterRevision(review?.revision), adapterRevision(review?.submissionRevision)];
    })
    .sort(([left], [right]) => left.localeCompare(right));
  return preview;
}

function adapterPublicMapperPreview(preview) {
  if (!preview) return null;
  const {
    sourceRevision: _sourceRevision,
    submissionRevisions: _submissionRevisions,
    reviewRevisions: _reviewRevisions,
    ...publicPreview
  } = preview;
  return adapterClone(publicPreview);
}

function adapterPreviewMapperExactView(state, payload) {
  const parsed = parseAllStarBohMapperExactView(payload.jsonText);
  const preview = adapterMatchMapperExactView(state, parsed);
  state.mapperImportPreview = adapterMapperRefreshPreviewMetadata(state, {
    ...adapterClone(preview),
    planner: adapterClone(parsed.planner),
    sourceRevision: state.revision,
  });
  return adapterPublicMapperPreview(state.mapperImportPreview);
}

function adapterReconcileMapperExactView(state, payload) {
  const preview = state.mapperImportPreview;
  if (!preview) {
    throw adapterError(
      'boh-mapper-preview-required',
      'Choose and preview a mapper JSON file before reconciling names.'
    );
  }
  if (preview.sourceRevision !== state.revision) throw adapterPreviewStale();
  const team = preview.teams.find((item) => item.id === cleanText(payload.teamId));
  const player = team?.players.find((item) => item.seatNumber === integer(payload.seatNumber));
  if (!team || !player) {
    throw adapterError('boh-mapper-reconcile-seat', 'The imported mapper seat no longer exists.');
  }
  if (player.matchSource === 'exact') {
    throw adapterError(
      'boh-mapper-reconcile-exact',
      'Automatic exact matches cannot be replaced manually.'
    );
  }
  const nextPlayerId = cleanText(payload.playerId);
  if (!nextPlayerId) {
    player.playerId = '';
    player.matchSource = '';
    adapterMapperRefreshPreviewMetadata(state, preview);
    return adapterPublicMapperPreview(preview);
  }
  const submission = adapterFindSubmission(state, nextPlayerId);
  if (!submission) {
    throw adapterError('boh-mapper-reconcile-unknown', 'The selected signup no longer exists.');
  }
  const review = state.reviews.get(adapterSubmissionUid(submission)) || null;
  if (!adapterReviewIsFresh(submission, review)) {
    throw adapterError('boh-mapper-reconcile-unverified', 'Choose a fresh verified submission.');
  }
  const alreadyUsed = preview.teams
    .flatMap((item) => item.players)
    .find((item) => item !== player && cleanText(item.playerId) === nextPlayerId);
  if (alreadyUsed) {
    throw adapterError(
      'boh-mapper-reconcile-duplicate',
      'That verified submission is already linked to another imported seat.'
    );
  }
  player.playerId = nextPlayerId;
  player.matchSource = 'manual';
  adapterMapperRefreshPreviewMetadata(state, preview);
  return adapterPublicMapperPreview(preview);
}

function adapterMapperSafePlan(draft, planner) {
  const previous = adapterPlan(draft);
  const imported = planner?.plan;
  const provided = new Set(list(imported?.providedFields));
  const planField = (field) =>
    adapterClone(imported && provided.has(field) ? list(imported[field]) : list(previous[field]));
  const hasNoPlayer = (rule) => !cleanText(rule?.playerId) && cleanText(rule?.scope) !== 'player';
  return {
    ...previous,
    ...(imported
      ? {
          id: cleanText(imported.id) || previous.id,
          label: cleanText(imported.label) || previous.label,
        }
      : {}),
    roleGroups: planField('roleGroups'),
    phases: planField('phases'),
    legions: planField('legions'),
    objectives: planField('objectives'),
    roleDefaults: planField('roleDefaults').filter(hasNoPlayer),
    seatOverrides: planField('seatOverrides').filter(hasNoPlayer),
    playerOverrides: [],
    instructions: planField('instructions').filter(hasNoPlayer),
    rotations: [],
    notes: planField('notes'),
  };
}

async function adapterSaveMapperExactView(state) {
  const preview = state.mapperImportPreview;
  if (!preview) {
    throw adapterError(
      'boh-mapper-preview-required',
      'Choose and preview a mapper JSON file before saving.'
    );
  }
  if (preview.sourceRevision !== state.revision) throw adapterPreviewStale();
  const linkedPlayers = preview.teams
    .flatMap((team) => team.players)
    .filter((player) => player.playerId);
  const linkedIds = linkedPlayers.map((player) => player.playerId);
  if (new Set(linkedIds).size !== linkedIds.length) {
    throw adapterError(
      'boh-mapper-reconcile-duplicate',
      'One verified submission cannot be saved to multiple imported seats.'
    );
  }
  for (const player of linkedPlayers) {
    const submission = adapterFindSubmission(state, player.playerId);
    const review = submission ? state.reviews.get(adapterSubmissionUid(submission)) || null : null;
    if (!submission || !adapterReviewIsFresh(submission, review)) {
      throw adapterError(
        'boh-mapper-reconcile-unverified',
        'Every linked mapper seat must still use a fresh verified submission.'
      );
    }
  }
  const teamIds = preview.teams.map((team) => team.id);
  const seatSets = preview.teams.map((importedTeam, teamIndex) => {
    const current = adapterMaterializeTeam(state, importedTeam.id, teamIndex);
    const seats = importedTeam.players.map((player) => {
      const existing = current.seats.find((seat) => seat.seatNumber === player.seatNumber) || {};
      return {
        ...existing,
        id: cleanText(existing.id) || `${importedTeam.id}-seat-${player.seatNumber}`,
        rosterKey: `mapper-${importedTeam.id}-seat-${String(player.seatNumber).padStart(2, '0')}`,
        seatNumber: player.seatNumber,
        playerId: player.playerId,
        displayName: player.displayName,
        roleGroupId: player.planRole || existing.roleGroupId || bohSeatRoleGroup(player.seatNumber),
        lane: player.backup ? 'backup' : player.main ? 'main' : '',
        side: player.titleRole || '',
        locked: player.locked || player.userLockTeamId === importedTeam.id,
        score: player.playerId
          ? adapterScoreRecord(state, adapterFindSubmission(state, player.playerId)).finalScore
          : finiteNumber(player.score),
      };
    });
    return { importedTeam, current, seats };
  });
  const playerIds = seatSets.flatMap(({ seats }) =>
    seats.map((seat) => seat.playerId).filter(Boolean)
  );
  const nextDraft = {
    ...adapterClone(state.draft),
    teamCount: TEAM_COUNT,
    teamIds,
    playerIds,
    forcedTeamAssignments: seatSets.flatMap(({ importedTeam, seats }) =>
      seats
        .filter((seat) => seat.playerId)
        .map((seat) => ({ playerId: seat.playerId, teamId: importedTeam.id }))
    ),
    plan: adapterMapperSafePlan(state.draft, preview.planner),
  };
  const teams = seatSets.map(({ importedTeam, current, seats }) => {
    const linkedIds = new Set(seats.map((seat) => seat.playerId).filter(Boolean));
    const explicitLeader = importedTeam.players.find(
      (player) => player.commandRole === 'leader' && linkedIds.has(player.playerId)
    );
    const explicitColeaders = importedTeam.players
      .filter((player) => player.commandRole === 'coleader' && linkedIds.has(player.playerId))
      .map((player) => player.playerId)
      .slice(0, 2);
    const nextTeam = { ...current };
    return {
      ...nextTeam,
      id: importedTeam.id,
      teamId: importedTeam.id,
      number: teamIds.indexOf(importedTeam.id) + 1,
      name: importedTeam.name,
      color: importedTeam.color,
      seats,
      captainId: explicitLeader?.playerId || '',
      coLeaderIds: explicitColeaders,
      scoreTotal: seats.reduce((total, seat) => total + finiteNumber(seat.score), 0),
      scoreAverage:
        seats.filter((seat) => seat.playerId || seat.displayName).length > 0
          ? seats.reduce((total, seat) => total + finiteNumber(seat.score), 0) /
            seats.filter((seat) => seat.playerId || seat.displayName).length
          : 0,
      plan: adapterPersistedStage1TeamPlan(importedTeam.id, seats, nextDraft.plan),
    };
  });
  const teamEntries = Object.fromEntries(teams.map((team) => [team.id, team]));
  const saved = await state.adminStore.saveDraftBundle(
    { draft: nextDraft, teams: teamEntries },
    {
      expectedDraftRevision: adapterRevision(state.draft?.revision),
      expectedTeamRevisions: Object.fromEntries(
        teamIds.map((teamId) => [teamId, adapterRevision(state.teams.get(teamId)?.revision)])
      ),
      expectedSubmissionRevisions: adapterClone(preview.submissionRevisions),
      expectedReviewRevisions: adapterClone(preview.reviewRevisions),
    }
  );
  state.draft = saved?.draft || nextDraft;
  for (const [teamId, team] of Object.entries(saved?.teams || teamEntries)) {
    state.teams.set(teamId, team);
  }
  state.mapperImportPreview = null;
  adapterNotify(state);
  return {
    matchedCount: preview.matchedCount,
    totalCount: preview.playerCount,
    unresolvedCount: preview.unresolvedCount,
    unsupportedFields: adapterClone(list(preview.planner?.unsupportedFields)),
  };
}

function adapterPublicMapperPlanPreview(preview) {
  if (!preview) return null;
  const {
    sourceRevision: _sourceRevision,
    teamRevision: _teamRevision,
    teamRevisions: _teamRevisions,
    ...publicPreview
  } = preview;
  return adapterClone(publicPreview);
}

function adapterMapperPlanSeatAliases(state, team, seat) {
  const rawTeam = state.teams.get(team.id) || {};
  const rawSeat = list(rawTeam.seats).find(
    (candidate) => integer(candidate?.seatNumber || candidate?.number) === seat.seatNumber
  );
  const submission = seat.playerId ? adapterFindSubmission(state, seat.playerId) : null;
  const review = submission ? state.reviews.get(adapterSubmissionUid(submission)) || null : null;
  const verifiedNames =
    submission && adapterReviewIsFresh(submission, review)
      ? [playerName(adapterEffectiveSubmission(state, submission)), playerName(submission)]
      : [];
  return uniqueTextList([
    seat.displayName,
    rawSeat?.displayName,
    rawSeat?.gameName,
    rawSeat?.name,
    ...verifiedNames,
  ]);
}

function adapterPreviewMapperRolePlan(state, payload) {
  const parsed = parseAllStarBohMapperStage1RolePlan(payload.jsonText);
  const teamIds = adapterTeamIds(state.draft);
  const teamIndex = teamIds.indexOf(parsed.team.id);
  if (teamIndex < 0) {
    throw adapterError(
      'boh-mapper-plan-team-missing',
      'Role-plan team ' +
        parsed.team.id +
        ' is not present in the current draft. Import its team list first.'
    );
  }
  const team = adapterMaterializeTeam(state, parsed.team.id, teamIndex);
  const occupiedSeats = team.seats.filter((seat) => cleanText(seat.playerId));
  const byName = new Map();
  for (const seat of occupiedSeats) {
    for (const alias of adapterMapperPlanSeatAliases(state, team, seat)) {
      const key = BohModel.normalizeBohNameKey(alias);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, new Map());
      byName.get(key).set(seat.seatNumber, seat);
    }
  }
  const diagnostics = [];
  const players = parsed.players.map((player) => {
    const candidates = [...(byName.get(BohModel.normalizeBohNameKey(player.name))?.values() || [])];
    if (candidates.length !== 1) {
      diagnostics.push({
        code: candidates.length
          ? 'boh-mapper-plan-match-ambiguous'
          : 'boh-mapper-plan-match-unmatched',
        name: player.name,
        candidateSeatNumbers: candidates.map((seat) => seat.seatNumber),
        message: candidates.length
          ? player.name + ' matches more than one occupied seat.'
          : player.name + ' has no exact match in the current team draft.',
      });
      return { ...adapterClone(player), playerId: '', seatNumber: 0 };
    }
    const seat = candidates[0];
    return { ...adapterClone(player), playerId: seat.playerId, seatNumber: seat.seatNumber };
  });
  const seatUses = new Map();
  for (const player of players) {
    if (!player.seatNumber) continue;
    if (!seatUses.has(player.seatNumber)) seatUses.set(player.seatNumber, []);
    seatUses.get(player.seatNumber).push(player);
  }
  for (const [seatNumber, matches] of seatUses) {
    if (matches.length === 1) continue;
    for (const player of matches) {
      player.playerId = '';
      player.seatNumber = 0;
      diagnostics.push({
        code: 'boh-mapper-plan-match-duplicate-seat',
        name: player.name,
        candidateSeatNumbers: [seatNumber],
        message: 'More than one imported player resolves to the same occupied seat.',
      });
    }
  }
  const matchedCount = players.filter((player) => player.playerId).length;
  state.mapperPlanImportPreview = {
    format: parsed.format,
    version: parsed.version,
    team: adapterClone(parsed.team),
    playerCount: parsed.playerCount,
    phaseCount: parsed.phaseCount,
    instructionCount: parsed.playerCount * parsed.phaseCount * BOH_STAGE1_LEGIONS.length,
    matchedCount,
    unresolvedCount: parsed.playerCount - matchedCount,
    diagnostics,
    players,
    sourceRevision: state.revision,
    teamRevision: adapterRevision(state.teams.get(team.id)?.revision),
  };
  return adapterPublicMapperPlanPreview(state.mapperPlanImportPreview);
}

async function adapterSaveMapperRolePlanImport(state) {
  const preview = state.mapperPlanImportPreview;
  if (!preview) {
    throw adapterError(
      'boh-mapper-plan-preview-required',
      'Choose and preview a role-plan JSON file before saving it.'
    );
  }
  const teamId = cleanText(preview.team?.id);
  if (
    preview.sourceRevision !== state.revision ||
    preview.teamRevision !== adapterRevision(state.teams.get(teamId)?.revision)
  ) {
    throw adapterError(
      'boh-mapper-plan-preview-stale',
      'The role-plan preview is stale. Preview the JSON again before saving.'
    );
  }
  if (preview.matchedCount !== 12 || preview.unresolvedCount !== 0 || preview.diagnostics.length) {
    throw adapterError(
      'boh-mapper-plan-match-incomplete',
      'All 12 imported players must match exactly one occupied team seat before saving.'
    );
  }
  const prefix = 'mapper-plan-v2-';
  const saved = await adapterSaveTeam(
    state,
    teamId,
    (team) => {
      const previousPlan = adapterPlan({ plan: team.plan });
      const retainedOverrides = previousPlan.playerOverrides.filter(
        (rule) => !cleanText(rule?.id).startsWith(prefix)
      );
      const firstOrder = adapterNextPlanOrder(retainedOverrides);
      const importedOverrides = preview.players.flatMap((player, playerIndex) =>
        player.phases.flatMap((phase, phaseIndex) =>
          BOH_STAGE1_LEGIONS.map((legion, legionIndex) => {
            const note = cleanText(phase.note);
            return {
              id:
                prefix +
                teamId +
                '-seat-' +
                player.seatNumber +
                '-phase-' +
                (phaseIndex + 1) +
                '-legion-' +
                (legionIndex + 1),
              teamId,
              phaseId: BOH_STAGE1_PHASES[phaseIndex].id,
              legionId: legion.id,
              seatNumber: player.seatNumber,
              playerId: player.playerId,
              scope: 'player',
              scopeId: player.playerId,
              roleGroupId: player.roleKey,
              roleLabel: player.role.label,
              order:
                firstOrder +
                playerIndex * BOH_STAGE1_PHASES.length * BOH_STAGE1_LEGIONS.length +
                phaseIndex * BOH_STAGE1_LEGIONS.length +
                legionIndex,
              generated: false,
              instruction: {
                action: cleanText(legionIndex === 0 ? phase.legion1 : phase.legion2),
                teleport: note || null,
                note,
              },
            };
          })
        )
      );
      team.plan = {
        ...previousPlan,
        schemaVersion: BohModel.BOH_PLAN_SCHEMA_VERSION,
        phases: BOH_STAGE1_PHASES.map((phase, order) => ({ ...phase, order: order + 1 })),
        legions: BOH_STAGE1_LEGIONS.map((legion, order) => ({ ...legion, order: order + 1 })),
        playerOverrides: [...retainedOverrides, ...importedOverrides],
        generated: false,
      };
      return team;
    },
    { notify: false }
  );
  state.mapperPlanImportPreview = null;
  adapterNotify(state);
  return {
    teamId,
    teamName: cleanText(saved?.name || preview.team?.name),
    matchedCount: preview.matchedCount,
    instructionCount: preview.instructionCount,
  };
}

function adapterMapperRolePlanPayloads(jsonTexts) {
  if (jsonTexts.length < 1 || jsonTexts.length > TEAM_COUNT) {
    throw adapterError(
      'boh-mapper-plan-file-count',
      `Choose between 1 and ${TEAM_COUNT} single-team role-plan files, or one bundle.`
    );
  }
  if (jsonTexts.length === 1) {
    let root;
    try {
      root = JSON.parse(jsonTexts[0]);
    } catch {
      return { bundle: false, plans: [parseAllStarBohMapperStage1RolePlan(jsonTexts[0])] };
    }
    if (root?.format === BOH_MAPPER_PLAN_BUNDLE_FORMAT) {
      return {
        bundle: true,
        plans: parseAllStarBohMapperStage1RolePlanBundle(jsonTexts[0]).plans,
      };
    }
  }
  return {
    bundle: false,
    plans: jsonTexts.map((jsonText) => parseAllStarBohMapperStage1RolePlan(jsonText)),
  };
}

function adapterPreviewMapperRolePlanFiles(state, payload) {
  const jsonTexts = list(payload.jsonTexts).filter((value) => typeof value === 'string');
  const previousPreview = state.mapperPlanImportPreview;
  try {
    const { bundle, plans } = adapterMapperRolePlanPayloads(jsonTexts);
    const teamIds = plans.map((plan) => cleanText(plan.team?.id));
    if (new Set(teamIds).size !== teamIds.length) {
      throw adapterError(
        'boh-mapper-plan-duplicate-team',
        'Each imported role plan must target a different team.'
      );
    }
    if (bundle) {
      const currentIds = [...adapterTeamIds(state.draft)].sort();
      const importedIds = [...teamIds].sort();
      if (
        currentIds.length !== TEAM_COUNT ||
        importedIds.length !== TEAM_COUNT ||
        currentIds.some((teamId, index) => teamId !== importedIds[index])
      ) {
        throw adapterError(
          'boh-mapper-plan-bundle-team-mismatch',
          'The role-plan bundle must contain exactly the current six draft teams.'
        );
      }
    }
    const teams = plans.map((plan) => {
      adapterPreviewMapperRolePlan(state, {
        jsonText: JSON.stringify(plan, (_key, value) => (value === null ? undefined : value)),
      });
      return adapterClone(state.mapperPlanImportPreview);
    });
    const diagnostics = teams.flatMap((team) =>
      team.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        teamId: team.team.id,
        teamName: team.team.name,
      }))
    );
    state.mapperPlanImportPreview = {
      format: bundle ? BOH_MAPPER_PLAN_BUNDLE_FORMAT : BOH_MAPPER_PLAN_IMPORT_FORMAT,
      version: bundle ? BOH_MAPPER_PLAN_BUNDLE_VERSION : BOH_MAPPER_PLAN_IMPORT_VERSION,
      bundle,
      planCount: teams.length,
      team: teams.length === 1 ? adapterClone(teams[0].team) : null,
      teams,
      playerCount: teams.reduce((total, team) => total + team.playerCount, 0),
      phaseCount: teams.reduce((total, team) => total + team.phaseCount, 0),
      instructionCount: teams.reduce((total, team) => total + team.instructionCount, 0),
      matchedCount: teams.reduce((total, team) => total + team.matchedCount, 0),
      unresolvedCount: teams.reduce((total, team) => total + team.unresolvedCount, 0),
      diagnostics,
      sourceRevision: state.revision,
      teamRevisions: Object.fromEntries(teams.map((team) => [team.team.id, team.teamRevision])),
    };
    return adapterPublicMapperPlanPreview(state.mapperPlanImportPreview);
  } catch (error) {
    state.mapperPlanImportPreview = previousPreview;
    throw error;
  }
}

function adapterTeamWithMapperRolePlan(state, preview) {
  const teamId = cleanText(preview.team?.id);
  const team = adapterFindTeam(state, teamId);
  const previousPlan = adapterPlan({ plan: team.plan });
  const prefix = 'mapper-plan-v2-';
  const retainedOverrides = previousPlan.playerOverrides.filter(
    (rule) => !cleanText(rule?.id).startsWith(prefix)
  );
  const firstOrder = adapterNextPlanOrder(retainedOverrides);
  const importedOverrides = preview.players.flatMap((player, playerIndex) =>
    player.phases.flatMap((phase, phaseIndex) =>
      BOH_STAGE1_LEGIONS.map((legion, legionIndex) => {
        const note = cleanText(phase.note);
        return {
          id: `${prefix}${teamId}-seat-${player.seatNumber}-phase-${phaseIndex + 1}-legion-${legionIndex + 1}`,
          teamId,
          phaseId: BOH_STAGE1_PHASES[phaseIndex].id,
          legionId: legion.id,
          seatNumber: player.seatNumber,
          playerId: player.playerId,
          scope: 'player',
          scopeId: player.playerId,
          roleGroupId: player.roleKey,
          roleLabel: player.role.label,
          order:
            firstOrder +
            playerIndex * BOH_STAGE1_PHASES.length * BOH_STAGE1_LEGIONS.length +
            phaseIndex * BOH_STAGE1_LEGIONS.length +
            legionIndex,
          generated: false,
          instruction: {
            summary: cleanText(phase.stageRole),
            action: cleanText(legionIndex === 0 ? phase.legion1 : phase.legion2),
            target: cleanText(player.role.description),
            teleport: note || null,
            note,
          },
        };
      })
    )
  );
  team.plan = {
    ...previousPlan,
    schemaVersion: BohModel.BOH_PLAN_SCHEMA_VERSION,
    phases: BOH_STAGE1_PHASES.map((phase, order) => ({ ...phase, order: order + 1 })),
    legions: BOH_STAGE1_LEGIONS.map((legion, order) => ({ ...legion, order: order + 1 })),
    playerOverrides: [...retainedOverrides, ...importedOverrides],
    generated: false,
  };
  return team;
}

async function adapterSaveMapperRolePlanFiles(state) {
  const preview = state.mapperPlanImportPreview;
  if (!preview) {
    throw adapterError(
      'boh-mapper-plan-preview-required',
      'Choose and preview role-plan JSON before saving it.'
    );
  }
  const teams = list(preview.teams);
  const stale =
    preview.sourceRevision !== state.revision ||
    teams.some(
      (team) =>
        preview.teamRevisions?.[team.team.id] !==
        adapterRevision(state.teams.get(team.team.id)?.revision)
    );
  if (stale) {
    throw adapterError(
      'boh-mapper-plan-preview-stale',
      'The role-plan preview is stale. Preview the JSON again before saving.'
    );
  }
  if (
    !teams.length ||
    teams.some(
      (team) =>
        team.matchedCount !== ROSTER_SIZE ||
        team.unresolvedCount !== 0 ||
        list(team.diagnostics).length
    )
  ) {
    throw adapterError(
      'boh-mapper-plan-match-incomplete',
      'Every imported team must match all 12 players to occupied draft seats before saving.'
    );
  }
  const teamEntries = Object.fromEntries(
    teams.map((team) => [team.team.id, adapterTeamWithMapperRolePlan(state, team)])
  );
  const saved = await state.adminStore.saveDraftBundle(
    { teams: teamEntries },
    { expectedTeamRevisions: adapterClone(preview.teamRevisions) }
  );
  for (const [teamId, team] of Object.entries(saved?.teams || teamEntries)) {
    state.teams.set(teamId, team);
  }
  state.mapperPlanImportPreview = null;
  adapterNotify(state);
  return {
    planCount: teams.length,
    teamIds: teams.map((team) => team.team.id),
    ...(teams.length === 1 ? { teamId: teams[0].team.id, teamName: teams[0].team.name } : {}),
    matchedCount: preview.matchedCount,
    instructionCount: preview.instructionCount,
  };
}

async function adapterImportApprovedRoster(state, payload) {
  const parsed = parseAdminAllStarBohApprovedRosterCsv(payload.csvText);
  const matched = adapterMatchApprovedRoster(state, parsed);
  const targetTeamIds = adapterTeamIds(state.draft);
  if (targetTeamIds.length !== TEAM_COUNT) {
    throw adapterError(
      'all-star-boh-approved-roster-team-count',
      `The saved draft must contain exactly ${TEAM_COUNT} teams before import.`
    );
  }
  const teams = targetTeamIds.map((teamId, teamIndex) => {
    const current = adapterMaterializeTeam(state, teamId, teamIndex);
    const approved = matched.teams[teamIndex];
    const seats = approved.rows.map((row) => {
      const existing = current.seats.find((seat) => seat.seatNumber === row.seatNumber) || {};
      return {
        ...existing,
        id: cleanText(existing.id) || `${teamId}-seat-${row.seatNumber}`,
        rosterKey: `approved-${teamId}-seat-${String(row.seatNumber).padStart(2, '0')}`,
        seatNumber: row.seatNumber,
        playerId: row.playerId,
        displayName: row.name,
        locked: true,
        score: row.playerId
          ? adapterScoreRecord(state, adapterFindSubmission(state, row.playerId)).finalScore
          : null,
      };
    });
    const linkedIds = new Set(seats.map((seat) => seat.playerId).filter(Boolean));
    return {
      ...current,
      seats,
      captainId: linkedIds.has(current.captainId) ? current.captainId : '',
      coLeaderIds: current.coLeaderIds.filter((playerId) => linkedIds.has(playerId)),
    };
  });
  const playerIds = teams.flatMap((team) =>
    team.seats.map((seat) => seat.playerId).filter(Boolean)
  );
  const nextDraft = {
    ...adapterClone(state.draft),
    teamCount: TEAM_COUNT,
    playerIds,
    forcedTeamAssignments: teams.flatMap((team) =>
      team.seats
        .filter((seat) => seat.playerId)
        .map((seat) => ({ playerId: seat.playerId, teamId: team.id }))
    ),
  };
  const teamEntries = Object.fromEntries(teams.map((team) => [team.id, team]));
  const saved = await state.adminStore.saveDraftBundle(
    { draft: nextDraft, teams: teamEntries },
    {
      expectedDraftRevision: adapterRevision(state.draft?.revision),
      expectedTeamRevisions: Object.fromEntries(
        teams.map((team) => [team.id, adapterRevision(state.teams.get(team.id)?.revision)])
      ),
    }
  );
  state.draft = saved?.draft || nextDraft;
  for (const [teamId, team] of Object.entries(saved?.teams || teamEntries)) {
    state.teams.set(teamId, team);
  }
  adapterNotify(state);
  return {
    matchedCount: matched.matchedCount,
    totalCount: parsed.playerCount,
    warnings: matched.warnings,
  };
}

async function adapterSaveTeams(state, teams) {
  const teamEntries = Object.fromEntries(
    teams.map((team) => [cleanText(team.id || team.teamId), adapterClone(team)])
  );
  const expectedTeamRevisions = Object.fromEntries(
    Object.keys(teamEntries).map((teamId) => [
      teamId,
      adapterRevision(state.teams.get(teamId)?.revision),
    ])
  );
  try {
    const saved = await state.adminStore.saveDraftBundle(
      { teams: teamEntries },
      { expectedTeamRevisions }
    );
    for (const [teamId, team] of Object.entries(saved?.teams || teamEntries)) {
      state.teams.set(teamId, team);
    }
  } catch (error) {
    await adapterLoadTeams(state);
    adapterNotify(state);
    throw error;
  }
  adapterNotify(state);
}

async function adapterSaveTeamMetadata(state, payload) {
  const team = adapterFindTeam(state, payload.teamId);
  let captainId = hasOwn(payload, 'captainId') ? cleanText(payload.captainId) : team.captainId;
  let coLeaderIds = hasOwn(payload, 'coLeaderIds')
    ? uniqueTextList(payload.coLeaderIds).slice(0, 2)
    : uniqueTextList(team.coLeaderIds).slice(0, 2);
  const seatEdit =
    payload.seatEdit && typeof payload.seatEdit === 'object' ? payload.seatEdit : null;
  const targetSeat = seatEdit
    ? team.seats.find((seat) => seat.seatNumber === integer(seatEdit.seatNumber))
    : null;
  if (seatEdit && !targetSeat) {
    throw adapterError('all-star-boh-seat-unknown', 'The mapper seat no longer exists.');
  }
  if (targetSeat) {
    const deployment = cleanText(seatEdit.deployment);
    const roleGroupId = cleanText(seatEdit.roleGroupId);
    const titleRole = cleanText(seatEdit.titleRole);
    const commandRole = cleanText(seatEdit.commandRole);
    if (deployment && !['main', 'backup'].includes(deployment)) {
      throw adapterError('all-star-boh-deployment-invalid', 'Choose Main, Backup, or Not set.');
    }
    if (
      roleGroupId &&
      !adapterPlan(state.draft).roleGroups.some((role) => role.id === roleGroupId)
    ) {
      throw adapterError('all-star-boh-role-unknown', 'Choose a current mapper plan role.');
    }
    if (titleRole && !['kills', 'tower', 'escort', 'gathering'].includes(titleRole)) {
      throw adapterError('all-star-boh-title-role-invalid', 'Choose a supported title role.');
    }
    if (commandRole && !['leader', 'coleader'].includes(commandRole)) {
      throw adapterError('all-star-boh-command-role-invalid', 'Choose Leader, Co-leader, or none.');
    }
    if (commandRole && !targetSeat.playerId) {
      throw adapterError(
        'all-star-boh-command-role-empty',
        'Assign a verified player before setting command role.'
      );
    }
    if (commandRole === 'leader') {
      captainId = targetSeat.playerId;
      coLeaderIds = coLeaderIds.filter((playerId) => playerId !== targetSeat.playerId);
    } else if (commandRole === 'coleader') {
      if (captainId === targetSeat.playerId) captainId = '';
      coLeaderIds = [
        ...coLeaderIds.filter((playerId) => playerId !== targetSeat.playerId),
        targetSeat.playerId,
      ];
      if (coLeaderIds.length > 2) {
        throw adapterError(
          'all-star-boh-co-leader-count',
          'A team may have at most two co-leaders.'
        );
      }
    } else {
      if (captainId === targetSeat.playerId) captainId = '';
      coLeaderIds = coLeaderIds.filter((playerId) => playerId !== targetSeat.playerId);
    }
    const backupCount = team.seats.filter(
      (seat) => (seat === targetSeat ? deployment : cleanText(seat.lane)) === 'backup'
    ).length;
    if (backupCount > 2) {
      throw adapterError(
        'all-star-boh-backup-count',
        'A mapper draft may designate at most two backups per team.'
      );
    }
  }
  if (captainId && !team.seats.some((seat) => seat.playerId === captainId)) {
    throw adapterError(
      'all-star-boh-captain-not-on-team',
      'Choose a captain who is assigned to this team.'
    );
  }
  for (const coLeaderId of coLeaderIds) {
    if (!team.seats.some((seat) => seat.playerId === coLeaderId)) {
      throw adapterError(
        'all-star-boh-co-leader-not-on-team',
        'Choose co-leaders who are assigned to this team.'
      );
    }
  }
  if (captainId && coLeaderIds.includes(captainId)) {
    throw adapterError(
      'all-star-boh-leadership-duplicate',
      'Leader and co-leaders must be different players.'
    );
  }
  await adapterSaveTeam(state, team.id, (draftTeam) => {
    if (hasOwn(payload, 'name')) draftTeam.name = cleanText(payload.name);
    if (hasOwn(payload, 'color')) draftTeam.color = cleanText(payload.color);
    if (hasOwn(payload, 'notes')) draftTeam.notes = cleanText(payload.notes);
    draftTeam.captainId = captainId;
    draftTeam.coLeaderIds = coLeaderIds;
    if (targetSeat) {
      const draftSeat = adapterFindSeat(draftTeam, targetSeat.seatNumber);
      draftSeat.lane = cleanText(seatEdit.deployment);
      draftSeat.roleGroupId = cleanText(seatEdit.roleGroupId) || draftSeat.roleGroupId;
      draftSeat.side = cleanText(seatEdit.titleRole);
    }
    return draftTeam;
  });
}

function adapterRoleIdByPurpose(plan, purpose) {
  const aliases = {
    offensive: ['offensive', 'center', 'offense'],
    bottom: ['bottom', 'bot'],
    top: ['top'],
    rune: ['rune'],
  }[purpose];
  return (
    plan.roleGroups.find((role) =>
      aliases.some((alias) => cleanText(role.id).toLocaleLowerCase().includes(alias))
    )?.id ||
    plan.roleGroups.find((role) =>
      aliases.some((alias) => cleanText(role.label).toLocaleLowerCase().includes(alias))
    )?.id ||
    ''
  );
}

async function adapterAutoAssignRankedRoles(state) {
  const plan = adapterPlan(state.draft);
  const pattern = [
    'offensive',
    'offensive',
    'bottom',
    'top',
    'offensive',
    'offensive',
    'bottom',
    'top',
    'rune',
    'rune',
    'bottom',
    'top',
  ];
  const roleIds = Object.fromEntries(
    ['offensive', 'bottom', 'top', 'rune'].map((purpose) => [
      purpose,
      adapterRoleIdByPurpose(plan, purpose),
    ])
  );
  if (Object.values(roleIds).some((id) => !id)) {
    throw adapterError(
      'all-star-boh-ranked-role-missing',
      'Ranked role assignment needs Offensive, Top, Bot, and Rune role groups.'
    );
  }
  const teams = adapterTeamIds(state.draft).map((teamId, index) => {
    const team = adapterMaterializeTeam(state, teamId, index);
    const rankedSeats = team.seats
      .filter((seat) => seat.playerId)
      .sort(
        (left, right) =>
          finiteNumber(right.score) - finiteNumber(left.score) || left.seatNumber - right.seatNumber
      );
    rankedSeats.forEach((seat, index) => {
      seat.roleGroupId = roleIds[pattern[index] || 'offensive'];
      const role = plan.roleGroups.find((item) => item.id === seat.roleGroupId);
      seat.roleLabel =
        roleDisplayName({ tr: (key, fallback) => fallback }, role) || role?.label || '';
    });
    return team;
  });
  await adapterSaveTeams(state, teams);
}

function adapterUniqueId(prefix, state) {
  state.idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${state.idSequence.toString(36)}`;
}

function adapterFindTeam(state, teamId) {
  const ids = adapterTeamIds(state.draft);
  const index = ids.indexOf(cleanText(teamId));
  if (index < 0) {
    throw adapterError('all-star-boh-team-unknown', `Unknown All-Star team: ${teamId}`);
  }
  return adapterMaterializeTeam(state, ids[index], index);
}

function adapterFindSeat(team, seatNumber) {
  const number = integer(seatNumber);
  const seat = list(team?.seats).find((candidate) => candidate.seatNumber === number);
  if (!seat) {
    throw adapterError(
      'all-star-boh-seat-unknown',
      `Unknown seat ${number} in ${team?.name || team?.id}.`
    );
  }
  return seat;
}

function adapterPlayerFields(seat) {
  return {
    playerId: cleanText(seat?.playerId),
    displayName: cleanText(seat?.displayName),
    score: finiteNumber(seat?.score),
    totalCastlePower: finiteNumber(seat?.totalCastlePower),
  };
}

function adapterAssignPlayer(seat, player) {
  seat.playerId = cleanText(player?.playerId);
  seat.displayName = cleanText(player?.displayName);
  seat.score = finiteNumber(player?.score);
  seat.totalCastlePower = finiteNumber(player?.totalCastlePower);
}

function adapterReconcileCaptain(team) {
  if (team.captainId && !team.seats.some((seat) => seat.playerId === team.captainId)) {
    team.captainId = '';
  }
  const teamPlayerIds = new Set(team.seats.map((seat) => seat.playerId).filter(Boolean));
  team.coLeaderIds = uniqueTextList(team.coLeaderIds)
    .filter((id) => teamPlayerIds.has(id))
    .slice(0, 2);
  return team;
}

async function adapterReviewSubmission(state, payload) {
  const submission = adapterFindSubmission(state, payload.playerId);
  if (!submission) {
    throw adapterError('all-star-boh-submission-unknown', 'The selected signup no longer exists.');
  }
  const uid = adapterSubmissionUid(submission);
  const existing = state.reviews.get(uid) || {};
  const existingReviewIsCurrent = adapterReviewMatchesSubmissionRevision(submission, existing);
  const existingAdjustments = existingReviewIsCurrent
    ? adapterClone(existing.adjustments || {})
    : {};
  const reviewStatus = adapterUiStatusToReview(payload.status);
  const feedbackNote = Object.prototype.hasOwnProperty.call(payload, 'note')
    ? cleanText(payload.note)
    : cleanText(existingReviewIsCurrent ? existing.note : '');
  if (['needs_changes', 'rejected'].includes(reviewStatus) && !feedbackNote) {
    throw adapterError(
      'all-star-boh-feedback-required',
      'Player-facing feedback is required for a correction or exclusion.'
    );
  }
  const hasUsefulnessInput = Object.prototype.hasOwnProperty.call(payload, 'adminUsefulnessRating');
  const adminUsefulnessRating = hasUsefulnessInput
    ? payload.adminUsefulnessRating === null
      ? null
      : clamp(payload.adminUsefulnessRating, 0, 100)
    : (existingAdjustments.bohUsefulRating ?? null);
  const adjustments = {
    ...existingAdjustments,
    bohUsefulRating: adminUsefulnessRating,
  };
  let statCorrections = Object.prototype.hasOwnProperty.call(payload, 'statCorrections')
    ? adapterClone(payload.statCorrections)
    : adapterClone(existingReviewIsCurrent ? existing.statCorrections || {} : {});
  let gameNameCorrection = adapterClone(
    existingReviewIsCurrent ? existing.gameNameCorrection || null : null
  );
  if (Object.prototype.hasOwnProperty.call(payload, 'gameNameCorrection')) {
    const corrected = cleanText(payload.gameNameCorrection?.corrected);
    const reason = cleanText(payload.gameNameCorrection?.reason);
    if (corrected && !reason) {
      throw adapterError(
        'all-star-boh-name-correction-reason-required',
        'A reason is required when correcting a player name.'
      );
    }
    gameNameCorrection = corrected ? { corrected, reason } : null;
  }
  const hasSubmissionCorrection = Object.prototype.hasOwnProperty.call(
    payload,
    'submissionCorrection'
  );
  const submissionCorrection = hasSubmissionCorrection
    ? adapterClone(payload.submissionCorrection)
    : adapterClone(existingReviewIsCurrent ? existing.submissionCorrection || null : null);
  if (hasSubmissionCorrection) {
    const correctionReason = cleanText(submissionCorrection?.reason);
    const correctionValues = submissionCorrection?.values || {};
    statCorrections = Object.fromEntries(
      CORRECTABLE_STAT_KEYS.filter(
        (key) => hasOwn(correctionValues?.stats, key) && correctionValues.stats[key] !== null
      ).map((key) => [key, { corrected: correctionValues.stats[key], reason: correctionReason }])
    );
    const correctedName = cleanText(correctionValues.gameName);
    gameNameCorrection = correctedName
      ? { corrected: correctedName, reason: correctionReason }
      : null;
  }
  const prospectiveReview = {
    ...existing,
    submissionRevision: adapterRevision(submission.revision),
    stale: false,
    statCorrections,
    gameNameCorrection,
    submissionCorrection,
  };
  const effective = effectiveAdminSubmission(submission, prospectiveReview);
  let calculated;
  try {
    calculated = BohModel.scoreBohSignup(
      {
        ...effective,
        playerId: adapterSubmissionId(submission),
        gameName: playerName(effective) || adapterSubmissionId(submission),
      },
      adapterActiveScoringVersion(state),
      {
        adminUsefulnessRating: adminUsefulnessRating ?? 0,
        paidUsableHeroNames: state.paidUsableHeroNames,
      }
    );
  } catch {
    calculated = { total: 0, breakdown: {} };
  }
  const input = {
    status: reviewStatus,
    note: feedbackNote,
    internalNote: Object.prototype.hasOwnProperty.call(payload, 'internalNote')
      ? cleanText(payload.internalNote)
      : cleanText(existing.internalNote),
    roleTags: adapterClone(list(existing.roleTags)),
    locked: existing.locked === true,
    score: calculated,
    adjustments,
    statCorrections,
    submissionCorrection,
    ...(gameNameCorrection ? { gameNameCorrection } : {}),
    submissionRevision: adapterRevision(submission.revision),
  };
  const saved = await state.adminStore.saveReview(uid, input, {
    expectedRevision: adapterRevision(existing.revision),
    submissionRevision: adapterRevision(submission.revision),
  });
  state.reviews.set(uid, saved || input);
  adapterNotify(state);
}

async function adapterBatchReviewSubmissions(state, payload) {
  if (cleanText(payload.status) !== 'confirmed') {
    throw adapterError(
      'all-star-boh-batch-status-invalid',
      'Batch review currently supports confirmation only.'
    );
  }
  const playerIds = uniqueTextList(payload.playerIds);
  if (!playerIds.length) {
    throw adapterError('all-star-boh-batch-empty', 'Select at least one visible signup.');
  }
  const successfulPlayerIds = [];
  const failedPlayerIds = [];
  const failedPlayers = [];
  for (const playerIdValue of playerIds) {
    try {
      state.submissions = list(await state.adminStore.listSubmissions());
      const submission = adapterFindSubmission(state, playerIdValue);
      if (!submission) {
        throw adapterError(
          'all-star-boh-submission-unknown',
          'The selected signup no longer exists.'
        );
      }
      const uid = adapterSubmissionUid(submission);
      const review = await state.adminStore.getReview(uid);
      state.reviews.set(uid, review || null);
      await adapterReviewSubmission(state, {
        playerId: playerIdValue,
        status: 'confirmed',
        ...(Object.prototype.hasOwnProperty.call(payload, 'note')
          ? { note: cleanText(payload.note) }
          : {}),
      });
      successfulPlayerIds.push(playerIdValue);
    } catch {
      const submission = adapterFindSubmission(state, playerIdValue);
      failedPlayerIds.push(playerIdValue);
      failedPlayers.push(
        playerName(adapterEffectiveSubmission(state, submission)) ||
          playerName(submission) ||
          playerIdValue
      );
    }
  }
  if (failedPlayerIds.length) {
    throw adapterError(
      'all-star-boh-batch-partial',
      `Could not confirm: ${failedPlayers.join(', ')}.`,
      { successfulPlayerIds, failedPlayerIds, failedPlayers }
    );
  }
  return { successfulPlayerIds, failedPlayerIds, failedPlayers };
}

async function adapterDeleteSubmission(state, payload) {
  const submission = adapterFindSubmission(state, payload.playerId);
  if (!submission) {
    throw adapterError('all-star-boh-submission-unknown', 'The selected signup no longer exists.');
  }
  if (typeof state.adminStore.deleteSubmission !== 'function') {
    throw adapterError(
      'all-star-boh-action-unavailable',
      'Deleting signups is not connected to the admin store.'
    );
  }
  const uid = adapterSubmissionUid(submission);
  await state.adminStore.deleteSubmission(uid, {
    expectedRevision: adapterRevision(submission.revision),
  });
  state.submissions = state.submissions.filter(
    (candidate) => adapterSubmissionUid(candidate) !== uid
  );
  state.reviews.delete(uid);
  const playerIds = new Set([uid, adapterSubmissionId(submission)].filter(Boolean));
  const draft = adapterClone(state.draft || adapterDefaultDraft());
  draft.playerIds = list(draft.playerIds).filter((playerIdValue) => !playerIds.has(playerIdValue));
  draft.forcedTeamAssignments = list(draft.forcedTeamAssignments).filter(
    (assignment) => !playerIds.has(cleanText(assignment?.playerId))
  );
  draft.commitmentScoreAdjustments = list(draft.commitmentScoreAdjustments).filter(
    (adjustment) => !playerIds.has(cleanText(adjustment?.playerId))
  );
  draft.scoreOverrides = list(draft.scoreOverrides).filter(
    (override) => !playerIds.has(cleanText(override?.playerId))
  );
  draft.plan = adapterPlan(draft);
  draft.plan.playerOverrides = list(draft.plan.playerOverrides).filter(
    (rule) => !playerIds.has(cleanText(rule?.playerId))
  );
  draft.plan.instructions = list(draft.plan.instructions).filter(
    (rule) => !playerIds.has(cleanText(rule?.playerId))
  );
  draft.plan.rotations = list(draft.plan.rotations).filter(
    (rotation) => !playerIds.has(cleanText(rotation?.playerId))
  );
  state.draft = draft;
  for (const [teamId, currentTeam] of state.teams) {
    if (!list(currentTeam?.seats).some((seat) => playerIds.has(cleanText(seat?.playerId)))) {
      continue;
    }
    const team = adapterClone(currentTeam);
    team.seats = list(team.seats).map((seat) => {
      if (!playerIds.has(cleanText(seat?.playerId))) return seat;
      return {
        ...seat,
        playerId: '',
        displayName: '',
        score: null,
        totalCastlePower: null,
        locked: false,
      };
    });
    state.teams.set(teamId, adapterReconcileCaptain(team));
  }
  try {
    const refreshedDraftTeams = await adapterReadDraftTeams(state);
    await adapterAdoptDraftTeams(
      state,
      refreshedDraftTeams,
      'deleteSubmissionRefreshDraftTeams',
      false
    );
  } catch (error) {
    try {
      adapterHandleBackgroundError(state, error, 'deleteSubmissionRefreshDraftTeams');
    } catch {
      // Observer failures must not turn a committed deletion into a reported failure.
    }
  }
  adapterNotify(state);
}

async function adapterBatchDeleteSubmissions(state, payload) {
  const missing = ['listSubmissions', 'deleteSubmission'].filter(
    (name) => typeof state.adminStore?.[name] !== 'function'
  );
  if (missing.length) {
    throw adapterError(
      'all-star-boh-action-unavailable',
      `Deleting signups is not connected to the admin store: ${missing.join(', ')}.`
    );
  }
  const playerIds = uniqueTextList(payload.playerIds);
  if (!playerIds.length) {
    throw adapterError('all-star-boh-batch-empty', 'Select at least one visible signup.');
  }
  const successfulPlayerIds = [];
  const failedPlayerIds = [];
  const failedPlayers = [];
  for (const playerIdValue of playerIds) {
    let submission = null;
    try {
      state.submissions = list(await state.adminStore.listSubmissions());
      submission = adapterFindSubmission(state, playerIdValue);
      if (!submission) {
        throw adapterError(
          'all-star-boh-submission-unknown',
          'The selected signup no longer exists.'
        );
      }
      await adapterDeleteSubmission(state, {
        playerId: adapterSubmissionId(submission) || adapterSubmissionUid(submission),
      });
      successfulPlayerIds.push(playerIdValue);
    } catch {
      failedPlayerIds.push(playerIdValue);
      failedPlayers.push(
        playerName(adapterEffectiveSubmission(state, submission)) ||
          playerName(submission) ||
          playerIdValue
      );
    }
  }
  if (failedPlayerIds.length) {
    adapterNotify(state, false);
    throw adapterError(
      'all-star-boh-batch-delete-partial',
      `Could not delete: ${failedPlayers.join(', ')}.`,
      { successfulPlayerIds, failedPlayerIds, failedPlayers }
    );
  }
  return { successfulPlayerIds, failedPlayerIds, failedPlayers };
}

async function adapterCreateScoringVersion(state, payload) {
  const current = adapterActiveScoringVersion(state);
  const versions = list(state.draft?.scoringVersions);
  const versionNumber = Math.max(0, ...versions.map((version) => integer(version.version))) + 1;
  const weights = payload.weights || {};
  const version = {
    id: adapterUniqueId(`score-v${versionNumber}`, state),
    version: versionNumber,
    label: cleanText(payload.label),
    note: cleanText(payload.note),
    powerWeights: {
      totalCastlePower: finiteNumber(
        weights.totalCastlePower,
        current.powerWeights?.totalCastlePower
      ),
      troopPower: finiteNumber(weights.troopPower, current.powerWeights?.troopPower),
      buildingPower: finiteNumber(weights.buildingPower, current.powerWeights?.buildingPower),
      technologyPower: finiteNumber(weights.technologyPower, current.powerWeights?.technologyPower),
      heroCombatPower: finiteNumber(weights.heroCombatPower, current.powerWeights?.heroCombatPower),
      dragonPower: finiteNumber(weights.dragonPower, current.powerWeights?.dragonPower),
      unitSpecialtyPower: finiteNumber(
        weights.unitSpecialtyPower,
        current.powerWeights?.unitSpecialtyPower ?? 0
      ),
    },
    bonusWeights: {
      t9TroopType: finiteNumber(weights.t9TroopType, current.bonusWeights?.t9TroopType),
      readySpeedHero: finiteNumber(weights.readySpeedHero, current.bonusWeights?.readySpeedHero),
      level50Hero: finiteNumber(weights.level50Hero, current.bonusWeights?.level50Hero),
      bohUsefulRating: finiteNumber(weights.bohUsefulRating, current.bonusWeights?.bohUsefulRating),
      rocLevel: finiteNumber(weights.rocLevel, current.bonusWeights?.rocLevel ?? 0),
      paidUsableHero: finiteNumber(
        weights.paidUsableHero,
        current.bonusWeights?.paidUsableHero ?? 0
      ),
      loftyTroopMillion: finiteNumber(
        weights.loftyTroopMillion,
        current.bonusWeights?.loftyTroopMillion ?? 0
      ),
      enhancedT10TroopMillion: finiteNumber(
        weights.enhancedT10TroopMillion,
        current.bonusWeights?.enhancedT10TroopMillion ?? 0
      ),
    },
    powerDivisor: finiteNumber(current.powerDivisor, 1000),
    precision: integer(current.precision, 3),
  };
  await adapterSaveDraft(state, (draft) => {
    draft.scoringVersions = [...list(draft.scoringVersions).slice(-29), version];
    draft.activeScoringVersionId = version.id;
    return draft;
  });
}

async function adapterSetScoreOverride(state, payload) {
  const id = cleanText(payload.playerId);
  if (!adapterFindSubmission(state, id)) {
    throw adapterError('all-star-boh-submission-unknown', 'The selected player no longer exists.');
  }
  const reason = cleanText(payload.reason);
  if (!reason) {
    throw adapterError(
      'all-star-boh-score-override-reason-required',
      'A reason is required for a base score override.'
    );
  }
  await adapterSaveDraft(state, (draft) => {
    draft.scoreOverrides = [
      ...list(draft.scoreOverrides).filter((override) => override.playerId !== id),
      {
        playerId: id,
        score: Math.max(0, finiteNumber(payload.score)),
        reason,
      },
    ];
    return draft;
  });
}

async function adapterRemoveScoreOverride(state, payload) {
  const id = cleanText(payload.playerId);
  await adapterSaveDraft(state, (draft) => {
    draft.scoreOverrides = list(draft.scoreOverrides).filter(
      (override) => override.playerId !== id
    );
    return draft;
  });
}

async function adapterSavePlayerValues(state, payload) {
  const id = cleanText(payload.playerId);
  const submission = adapterFindSubmission(state, id);
  if (!submission) {
    throw adapterError('all-star-boh-submission-unknown', 'The selected player no longer exists.');
  }
  const uid = adapterSubmissionUid(submission);
  const review = state.reviews.get(uid) || {};
  const currentCorrection = adapterReviewMatchesSubmissionRevision(submission, review)
    ? adapterClone(review.submissionCorrection || null)
    : null;
  const original = originalCorrectionSubmission(submission);
  const values = adapterClone(currentCorrection?.values || {});
  const correctedName = cleanText(payload.displayName);
  if (!correctedName) {
    throw adapterError('all-star-boh-correction-name-required', 'Player name is required.');
  }
  if (correctionValuesEqual(correctedName, cleanText(original.gameName))) {
    delete values.gameName;
  } else {
    values.gameName = correctedName;
  }
  const totalPowerRaw = payload.totalCastlePower;
  if (totalPowerRaw === '' || totalPowerRaw === null || totalPowerRaw === undefined) {
    if (values.stats) delete values.stats.totalCastlePower;
  } else {
    const totalPower = Number(totalPowerRaw);
    if (
      !Number.isInteger(totalPower) ||
      totalPower < 0 ||
      totalPower > CORRECTION_NUMBER_LIMITS.totalCastlePower
    ) {
      throw adapterError(
        'all-star-boh-correction-power-invalid',
        `Total power must be a whole number from 0 to ${CORRECTION_NUMBER_LIMITS.totalCastlePower}.`
      );
    }
    const originalPower = originalCorrectionStatValue(original, 'totalCastlePower');
    if (correctionValuesEqual(totalPower, originalPower)) {
      if (values.stats) delete values.stats.totalCastlePower;
    } else {
      values.stats = { ...(values.stats || {}), totalCastlePower: totalPower };
    }
  }
  if (values.stats && !Object.keys(values.stats).length) delete values.stats;
  const correction = Object.keys(values).length
    ? {
        schemaVersion: 1,
        reason: cleanText(payload.correctionReason || currentCorrection?.reason),
        values,
      }
    : null;
  if (correction && !correction.reason) {
    throw adapterError(
      'all-star-boh-correction-reason-required',
      'A reason is required for a name or total-power correction.'
    );
  }
  const overrideRaw = payload.baseScoreOverride;
  const hasOverride = overrideRaw !== '' && overrideRaw !== null && overrideRaw !== undefined;
  const overrideScore = hasOverride ? Number(overrideRaw) : null;
  if (hasOverride && (!Number.isFinite(overrideScore) || overrideScore < 0)) {
    throw adapterError(
      'all-star-boh-score-override-invalid',
      'Base score override must be a non-negative number.'
    );
  }
  const overrideReason = cleanText(payload.overrideReason);
  if (hasOverride && !overrideReason) {
    throw adapterError(
      'all-star-boh-score-override-reason-required',
      'A reason is required for a base score override.'
    );
  }
  await adapterReviewSubmission(state, {
    playerId: id,
    status: adapterReviewStatusToUi(review.status),
    note: cleanText(review.note),
    internalNote: cleanText(review.internalNote),
    submissionCorrection: correction,
  });
  if (!hasOverride) {
    await adapterRemoveScoreOverride(state, { playerId: id });
  } else {
    await adapterSetScoreOverride(state, {
      playerId: id,
      score: overrideScore,
      reason: overrideReason,
    });
  }
}

async function adapterSaveCommitmentScores(state, payload) {
  const updates = list(payload.adjustments);
  const seen = new Set();
  const normalizedUpdates = updates.map((item) => {
    const playerIdValue = cleanText(item?.playerId);
    if (!playerIdValue || seen.has(playerIdValue)) {
      throw adapterError(
        'all-star-boh-commitment-score-player-invalid',
        'Each commitment score must target one unique player.'
      );
    }
    seen.add(playerIdValue);
    if (!adapterFindSubmission(state, playerIdValue)) {
      throw adapterError(
        'all-star-boh-submission-unknown',
        'A commitment score targets a player who no longer exists.'
      );
    }
    if (item?.score === null || item?.score === undefined || cleanText(item.score) === '') {
      return { playerId: playerIdValue, score: null };
    }
    const score = Number(item.score);
    if (!Number.isInteger(score) || score < 1 || score > 10_000) {
      throw adapterError(
        'all-star-boh-commitment-score-invalid',
        'Commitment/usefulness scores must be whole numbers from 1 to 10,000.'
      );
    }
    return { playerId: playerIdValue, score };
  });
  const reason = cleanText(payload.reason) || 'Commitment/usefulness assessment';
  if ([...reason].length > 2_000) {
    throw adapterError(
      'all-star-boh-commitment-score-reason-invalid',
      'The shared commitment score note must be 2,000 characters or fewer.'
    );
  }
  await adapterSaveDraft(state, (draft) => {
    const existing = new Map(
      list(draft.commitmentScoreAdjustments).map((item) => [item.playerId, item])
    );
    for (const update of normalizedUpdates) {
      if (update.score === null) existing.delete(update.playerId);
      else if (finiteNumber(existing.get(update.playerId)?.score, Number.NaN) !== update.score) {
        existing.set(update.playerId, {
          playerId: update.playerId,
          score: update.score,
          reason,
        });
      }
    }
    draft.commitmentScoreAdjustments = [...existing.values()];
    return draft;
  });
}

async function adapterSaveEpicPlanningOverrides(state, payload) {
  const overrides = list(payload?.overrides)
    .map((override) => ({
      playerId: cleanText(override?.playerId),
      excluded: override?.excluded === true,
      laneOverride: EPIC_LANE_IDS.includes(cleanText(override?.laneOverride))
        ? cleanText(override.laneOverride)
        : '',
      groupId: cleanText(override?.groupId),
    }))
    .filter(
      (override) =>
        override.playerId && (override.excluded || override.laneOverride || override.groupId)
    );
  await adapterSaveDraft(state, (draft) => {
    draft.epicPlanningOverrides = overrides;
    return draft;
  });
}

async function adapterSetSeatLock(state, payload) {
  const team = adapterFindTeam(state, payload.teamId);
  const seat = adapterFindSeat(team, payload.seatNumber);
  seat.locked = payload.locked === true;
  await adapterSaveTeam(state, team.id, () => team);
}

async function adapterMoveOrSwapSeat(state, payload, swap) {
  const sourceTeam = adapterFindTeam(state, payload.source?.teamId);
  const targetTeam =
    cleanText(payload.destination?.teamId) === sourceTeam.id
      ? sourceTeam
      : adapterFindTeam(state, payload.destination?.teamId);
  const sourceSeat = adapterFindSeat(sourceTeam, payload.source?.seatNumber);
  const targetSeat = adapterFindSeat(targetTeam, payload.destination?.seatNumber);
  if (sourceSeat.locked || targetSeat.locked) {
    throw adapterError('all-star-boh-seat-locked', 'Unlock both seats before moving players.');
  }
  if (!sourceSeat.playerId) {
    throw adapterError('all-star-boh-seat-empty', 'The source seat is empty.');
  }
  if (!swap && targetSeat.playerId) {
    throw adapterError('all-star-boh-seat-occupied', 'Use swap for an occupied destination seat.');
  }
  const sourcePlayer = adapterPlayerFields(sourceSeat);
  const targetPlayer = adapterPlayerFields(targetSeat);
  adapterAssignPlayer(targetSeat, sourcePlayer);
  adapterAssignPlayer(sourceSeat, swap ? targetPlayer : null);
  adapterReconcileCaptain(sourceTeam);
  adapterReconcileCaptain(targetTeam);
  if (sourceTeam.id === targetTeam.id) {
    await adapterSaveTeam(state, sourceTeam.id, () => sourceTeam);
    return;
  }
  await adapterSaveTeams(state, [sourceTeam, targetTeam]);
}

function adapterVerifiedPlayers(state) {
  return state.submissions
    .filter((submission) => {
      const review = state.reviews.get(adapterSubmissionUid(submission));
      return adapterReviewIsFresh(submission, review);
    })
    .map((submission) => {
      const effective = adapterEffectiveSubmission(state, submission);
      const score = adapterScoreRecord(state, submission);
      return {
        ...adapterClone(effective),
        playerId: adapterSubmissionId(submission),
        gameName: playerName(effective) || adapterSubmissionId(submission),
        score: score.finalScore,
        totalCastlePower: score.totalCastlePower,
        scoreBreakdown: score.scoreBreakdown,
      };
    });
}

function adapterSelectedPlayerIds(state, verifiedPlayers = adapterVerifiedPlayers(state)) {
  const verifiedIds = new Set(verifiedPlayers.map((player) => player.playerId));
  const explicit = list(state.draft?.playerIds)
    .map(cleanText)
    .filter((id, index, values) => id && verifiedIds.has(id) && values.indexOf(id) === index);
  if (explicit.length) return explicit;
  if (verifiedPlayers.length === adapterFieldSize(state.draft)) {
    return verifiedPlayers.map((player) => player.playerId);
  }
  return [];
}

function adapterBalancedPlayers(state) {
  const verifiedPlayers = adapterVerifiedPlayers(state);
  const selectedIds = adapterSelectedPlayerIds(state, verifiedPlayers);
  const fieldSize = adapterFieldSize(state.draft);
  if (selectedIds.length !== fieldSize) {
    throw adapterError(
      'all-star-boh-selection-incomplete',
      `Select exactly ${fieldSize} verified players before balancing teams.`
    );
  }
  const selected = new Set(selectedIds);
  return verifiedPlayers.filter((player) => selected.has(player.playerId));
}

async function adapterSaveEligiblePool(state, payload) {
  const verified = adapterVerifiedPlayers(state);
  const verifiedIds = new Set(verified.map((player) => player.playerId));
  const playerIds = list(payload.playerIds)
    .map(cleanText)
    .filter((id, index, values) => id && values.indexOf(id) === index);
  const fieldSize = adapterFieldSize(state.draft);
  if (playerIds.length !== fieldSize) {
    throw adapterError(
      'all-star-boh-selection-count',
      `Choose exactly ${fieldSize} verified players.`
    );
  }
  const unknown = playerIds.filter((id) => !verifiedIds.has(id));
  if (unknown.length) {
    throw adapterError(
      'all-star-boh-selection-unverified',
      `The selected pool contains unverified players: ${unknown.join(', ')}.`
    );
  }
  const selected = new Set(playerIds);
  const lockedOutsidePool = adapterTeamIds(state.draft)
    .map((teamId, index) => adapterMaterializeTeam(state, teamId, index))
    .flatMap((team) => team.seats)
    .filter((seat) => seat.locked && seat.playerId && !selected.has(seat.playerId));
  if (lockedOutsidePool.length) {
    throw adapterError(
      'all-star-boh-selection-locked-player',
      'Unlock seats before removing their players from the eligible field.'
    );
  }
  const forcedOutsidePool = list(state.draft?.forcedTeamAssignments).filter(
    (assignment) => !selected.has(cleanText(assignment?.playerId))
  );
  if (forcedOutsidePool.length) {
    throw adapterError(
      'all-star-boh-selection-forced-player',
      'Clear exact-team placements before removing those players from the eligible field.'
    );
  }
  await adapterSaveDraft(state, (draft) => {
    draft.playerIds = playerIds;
    return draft;
  });
}

function adapterForcedAssignments(state, input, draft = state.draft) {
  const teamIds = adapterTeamIds(draft);
  const activeTeams = new Set(teamIds);
  const selected = new Set(adapterSelectedPlayerIds(state));
  const verified = new Set(adapterVerifiedPlayers(state).map((player) => player.playerId));
  const byPlayer = new Map();
  for (const rawAssignment of list(input)) {
    const playerIdValue = cleanText(rawAssignment?.playerId);
    const teamId = cleanText(rawAssignment?.teamId);
    if (!playerIdValue && !teamId) continue;
    if (!verified.has(playerIdValue)) {
      throw adapterError(
        'all-star-boh-forced-player-unverified',
        `The exact-team player is not currently verified: ${playerIdValue || '(empty)'}.`
      );
    }
    if (!selected.has(playerIdValue)) {
      throw adapterError(
        'all-star-boh-forced-player-unselected',
        `Save ${playerIdValue} in the eligible field before placing them on an exact team.`
      );
    }
    if (!activeTeams.has(teamId)) {
      throw adapterError(
        'all-star-boh-forced-team-inactive',
        `The exact-team placement uses an inactive team: ${teamId || '(empty)'}.`
      );
    }
    const existing = byPlayer.get(playerIdValue);
    if (existing && existing !== teamId) {
      throw adapterError(
        'all-star-boh-forced-player-duplicate',
        `${playerIdValue} has conflicting exact-team placements.`
      );
    }
    byPlayer.set(playerIdValue, teamId);
  }
  for (const [index, teamId] of teamIds.entries()) {
    const team = adapterMaterializeTeam(state, teamId, index);
    for (const seat of team.seats) {
      const forcedTeamId = byPlayer.get(seat.playerId);
      if (seat.locked && forcedTeamId && forcedTeamId !== teamId) {
        throw adapterError(
          'all-star-boh-forced-locked-team-conflict',
          `${seat.displayName || seat.playerId} is locked to another team.`
        );
      }
    }
  }
  return [...byPlayer]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([playerIdValue, teamId]) => ({ playerId: playerIdValue, teamId }));
}

async function adapterSaveTeamBuilderSettings(state, payload) {
  const requestedCount = Number(payload.teamCount ?? state.draft?.teamCount ?? TEAM_COUNT);
  if (
    !Number.isInteger(requestedCount) ||
    requestedCount < MIN_TEAM_COUNT ||
    requestedCount > TEAM_COUNT
  ) {
    throw adapterError('all-star-boh-team-count-invalid', 'Choose between two and six teams.');
  }
  let authoritativeSource = null;
  if (requestedCount < adapterTeamCount(state.draft)) {
    authoritativeSource = await adapterReadDraftTeams(state);
  }
  const source = authoritativeSource || { draft: state.draft, teams: state.teams };
  const workingState = { ...state, draft: source.draft, teams: source.teams };
  let nextDraft;
  let currentTeamIds;
  let nextTeamIdList;
  let removedTeamIds;
  try {
    const requestedMetric = cleanText(payload.balanceMetric ?? workingState.draft?.balanceMetric);
    if (!['score', 'totalPower', 'balanced'].includes(requestedMetric)) {
      throw adapterError(
        'all-star-boh-balance-metric-invalid',
        'Choose scoring points, total in-game power, or balanced score + power.'
      );
    }
    nextDraft = {
      ...adapterClone(workingState.draft || adapterDefaultDraft()),
      teamCount: requestedCount,
      balanceMetric: requestedMetric,
    };
    currentTeamIds = adapterTeamIds(workingState.draft);
    nextTeamIdList = adapterTeamIds(nextDraft);
    const nextTeamIds = new Set(nextTeamIdList);
    removedTeamIds = currentTeamIds.filter((teamId) => !nextTeamIds.has(teamId));
    const lockedOnInactiveTeam = removedTeamIds
      .flatMap(
        (teamId) =>
          adapterMaterializeTeam(workingState, teamId, currentTeamIds.indexOf(teamId)).seats
      )
      .find((seat) => seat.locked && seat.playerId);
    if (lockedOnInactiveTeam) {
      throw adapterError(
        'all-star-boh-team-count-locked-player',
        'Unlock occupied seats on teams that would become inactive.'
      );
    }
    nextDraft.forcedTeamAssignments = adapterForcedAssignments(
      workingState,
      Object.prototype.hasOwnProperty.call(payload, 'forcedTeamAssignments')
        ? payload.forcedTeamAssignments
        : workingState.draft?.forcedTeamAssignments,
      nextDraft
    );
    nextDraft.teamIds = nextTeamIdList;
  } catch (error) {
    if (authoritativeSource) {
      await adapterAdoptDraftTeams(state, authoritativeSource, 'saveTeamBuilderSettingsValidation');
    }
    throw error;
  }

  if (!removedTeamIds.length) {
    const nextTeams = await adapterReadTeams(state, nextDraft);
    try {
      const savedDraft = await state.adminStore.saveDraft(nextDraft, {
        expectedRevision: adapterRevision(workingState.draft?.revision),
      });
      await adapterAdoptDraftTeams(
        state,
        { draft: savedDraft || nextDraft, teams: nextTeams },
        'saveTeamBuilderSettings'
      );
    } catch (error) {
      let refreshed = null;
      try {
        refreshed = await adapterReadDraftTeams(state);
      } catch (refreshError) {
        adapterHandleBackgroundError(state, refreshError, 'saveTeamBuilderSettingsConflictRefresh');
      }
      if (refreshed) {
        await adapterAdoptDraftTeams(state, refreshed, 'saveTeamBuilderSettingsConflict');
      }
      throw error;
    }
    return;
  }

  const removedTeamIdSet = new Set(removedTeamIds);
  const teamEntries = Object.fromEntries(
    currentTeamIds.map((teamId) => {
      const team = adapterMaterializeTeam(workingState, teamId, currentTeamIds.indexOf(teamId));
      if (!removedTeamIdSet.has(teamId)) return [teamId, team];
      team.captainId = '';
      team.coLeaderIds = [];
      team.scoreTotal = 0;
      team.totalScore = 0;
      team.scoreAverage = 0;
      team.averageScore = 0;
      team.totalCastlePower = 0;
      team.totalPower = 0;
      team.balanceTotal = 0;
      team.balanceAverage = 0;
      team.seats = team.seats.map((seat) => ({
        ...seat,
        playerId: '',
        displayName: '',
        locked: false,
        score: 0,
        totalCastlePower: 0,
      }));
      return [teamId, team];
    })
  );
  let saved;
  try {
    saved = await state.adminStore.saveDraftBundle(
      { draft: nextDraft, teams: teamEntries },
      {
        expectedDraftRevision: adapterRevision(workingState.draft?.revision),
        expectedTeamRevisions: Object.fromEntries(
          currentTeamIds.map((teamId) => [
            teamId,
            adapterRevision(workingState.teams.get(teamId)?.revision),
          ])
        ),
      }
    );
  } catch (error) {
    let refreshed = null;
    try {
      refreshed = await adapterReadDraftTeams(state);
    } catch (refreshError) {
      adapterHandleBackgroundError(state, refreshError, 'saveTeamBuilderSettingsConflictRefresh');
    }
    if (refreshed) {
      await adapterAdoptDraftTeams(state, refreshed, 'saveTeamBuilderSettingsConflict');
    }
    throw error;
  }
  await adapterAdoptDraftTeams(
    state,
    {
      draft: saved?.draft || nextDraft,
      teams: new Map(
        currentTeamIds.map((teamId) => [teamId, saved?.teams?.[teamId] || teamEntries[teamId]])
      ),
    },
    'saveTeamBuilderSettings'
  );
}

async function adapterAssignSeatPlayer(state, payload) {
  const targetTeam = adapterFindTeam(state, payload.teamId);
  const targetSeat = adapterFindSeat(targetTeam, payload.seatNumber);
  if (targetSeat.locked) {
    throw adapterError('all-star-boh-seat-locked', 'Unlock the destination seat first.');
  }
  const playerIdValue = cleanText(payload.playerId);
  const affected = new Map([[targetTeam.id, targetTeam]]);
  if (!playerIdValue) {
    adapterAssignPlayer(targetSeat, null);
    adapterReconcileCaptain(targetTeam);
    await adapterSaveTeam(state, targetTeam.id, () => targetTeam);
    return;
  }
  const verifiedPlayers = adapterVerifiedPlayers(state);
  const selectedIds = new Set(adapterSelectedPlayerIds(state, verifiedPlayers));
  if (!selectedIds.has(playerIdValue)) {
    throw adapterError(
      'all-star-boh-player-not-selected',
      `Choose a player from the saved eligible ${adapterFieldSize(state.draft)}.`
    );
  }
  const player = verifiedPlayers.find((candidate) => candidate.playerId === playerIdValue);
  if (!player) {
    throw adapterError(
      'all-star-boh-player-unverified',
      'This player no longer has a current review.'
    );
  }
  for (const [index, teamId] of adapterTeamIds(state.draft).entries()) {
    const team =
      teamId === targetTeam.id ? targetTeam : adapterMaterializeTeam(state, teamId, index);
    const existingSeat = team.seats.find((seat) => seat.playerId === playerIdValue);
    if (!existingSeat || existingSeat === targetSeat) continue;
    if (existingSeat.locked) {
      throw adapterError('all-star-boh-seat-locked', 'Unlock the player’s current seat first.');
    }
    adapterAssignPlayer(existingSeat, null);
    adapterReconcileCaptain(team);
    affected.set(team.id, team);
  }
  adapterAssignPlayer(targetSeat, {
    playerId: player.playerId,
    displayName: player.gameName,
    score: player.score,
    totalCastlePower: player.totalCastlePower,
  });
  adapterReconcileCaptain(targetTeam);
  affected.set(targetTeam.id, targetTeam);
  const teams = [...affected.values()];
  if (teams.length === 1) await adapterSaveTeam(state, targetTeam.id, () => targetTeam);
  else await adapterSaveTeams(state, teams);
}

function adapterBalanceSource(state) {
  const teamIds = adapterTeamIds(state.draft);
  const activeScoring = adapterActiveScoringVersion(state);
  const selectedPlayerIds = adapterSelectedPlayerIds(state);
  const selectedPlayerIdSet = new Set(selectedPlayerIds);
  const selectedSubmissions = state.submissions.filter((submission) =>
    selectedPlayerIdSet.has(adapterSubmissionId(submission))
  );
  return {
    draftRevision: adapterRevision(state.draft?.revision),
    teamRevisions: Object.fromEntries(
      teamIds.map((teamId) => [teamId, adapterRevision(state.teams.get(teamId)?.revision)])
    ),
    scoringVersion: [cleanText(activeScoring?.id), integer(activeScoring?.version)],
    submissionRevisions: selectedSubmissions
      .map((submission) => [
        adapterSubmissionUid(submission),
        adapterRevision(submission?.revision),
      ])
      .sort(([left], [right]) => left.localeCompare(right)),
    reviewRevisions: selectedSubmissions
      .map((submission) => {
        const uid = adapterSubmissionUid(submission);
        const review = state.reviews.get(uid);
        return [
          uid,
          adapterRevision(review?.revision),
          adapterRevision(review?.submissionRevision),
        ];
      })
      .sort(([left], [right]) => left.localeCompare(right)),
    settings: {
      teamCount: adapterTeamCount(state.draft),
      balanceMetric: normalizeBalanceMetric(state.draft?.balanceMetric),
      playerIds: selectedPlayerIds,
      forcedTeamAssignments: adapterClone(list(state.draft?.forcedTeamAssignments)),
      teamIds,
    },
  };
}

function adapterBuildBalancePreview(state) {
  const plan = adapterPlan(state.draft);
  const currentTeams = adapterTeamIds(state.draft).map((teamId, index) =>
    adapterMaterializeTeam(state, teamId, index)
  );
  const locks = currentTeams.flatMap((team) =>
    team.seats
      .filter((seat) => seat.locked && seat.playerId)
      .map((seat) => ({
        playerId: seat.playerId,
        teamId: team.id,
        seatNumber: seat.seatNumber,
        roleGroupId: seat.roleGroupId,
      }))
  );
  const forcedTeamAssignments = adapterForcedAssignments(state, state.draft?.forcedTeamAssignments);
  const result = BohModel.balanceBohTeams(adapterBalancedPlayers(state), {
    teamCount: adapterTeamCount(state.draft),
    balanceMetric: normalizeBalanceMetric(state.draft?.balanceMetric),
    roleGroups: plan.roleGroups,
    teams: currentTeams.map((team) => ({
      id: team.id,
      number: team.number,
      label: team.name,
    })),
    forcedTeamAssignments,
    lockedAssignments: locks,
  });
  const teams = result.teams.map((balanced, index) => {
    const current = currentTeams.find((team) => team.id === balanced.id) || currentTeams[index];
    const template = adapterSeatTemplate(plan);
    const nextTeam = {
      ...current,
      number: balanced.number,
      name: balanced.label || current.name,
      seats: template.map((seatTemplate) => {
        const assignment = balanced.players.find(
          (player) => player.seatNumber === seatTemplate.seatNumber
        );
        return {
          id: `${current.id}-seat-${seatTemplate.seatNumber}`,
          seatNumber: seatTemplate.seatNumber,
          playerId: assignment?.playerId || '',
          displayName: assignment?.gameName || '',
          roleGroupId: seatTemplate.roleGroupId,
          roleLabel: seatTemplate.roleLabel,
          side: '',
          lane: '',
          locked: assignment?.locked === true,
          score: finiteNumber(assignment?.score),
          totalCastlePower: finiteNumber(assignment?.totalCastlePower),
        };
      }),
      scoreTotal: finiteNumber(balanced.totalScore),
      scoreAverage: finiteNumber(balanced.averageScore),
      totalCastlePower: finiteNumber(balanced.totalCastlePower),
      balanceTotal: finiteNumber(balanced.balanceTotal),
    };
    return adapterReconcileCaptain(nextTeam);
  });
  return {
    source: adapterBalanceSource(state),
    draft: adapterClone(state.draft),
    settings: {
      teamCount: result.teamCount,
      balanceMetric: result.balanceMetric,
      forcedTeamAssignments,
    },
    teams,
    scoreSpread: finiteNumber(result.scoreSpread),
    powerSpread: finiteNumber(result.powerSpread),
    balanceSpread: finiteNumber(result.balanceSpread),
    balanceMetric: result.balanceMetric,
    applied: false,
  };
}

function adapterPreviewStale() {
  return adapterError(
    'all-star-boh-preview-stale',
    'The balance preview is stale. Create a new preview before applying it.'
  );
}

async function adapterPreviewBalanceTeams(state) {
  state.balancePreview = adapterBuildBalancePreview(state);
  adapterNotify(state, false);
}

function adapterDiscardBalancePreview(state) {
  state.balancePreview = null;
  adapterNotify(state, false);
}

async function adapterRefreshBalanceSources(state) {
  const [submissions, draft] = await Promise.all([
    state.adminStore.listSubmissions(),
    state.adminStore.getDraft(),
  ]);
  const nextSubmissions = list(submissions);
  const nextDraft = draft || adapterDefaultDraft();
  const [reviews, teams] = await Promise.all([
    adapterReadReviews(state, nextSubmissions),
    adapterReadTeams(state, nextDraft),
  ]);
  state.submissions = nextSubmissions;
  state.reviews = reviews;
  await adapterAdoptDraftTeams(state, { draft: nextDraft, teams }, 'refreshBalanceSources', false);
}

async function adapterApplyBalancePreview(state) {
  const preview = state.balancePreview;
  if (!preview || preview.applied) throw adapterPreviewStale();
  await adapterRefreshBalanceSources(state);
  if (JSON.stringify(preview.source) !== JSON.stringify(adapterBalanceSource(state))) {
    state.balancePreview = null;
    adapterNotify(state);
    throw adapterPreviewStale();
  }
  const teamEntries = Object.fromEntries(
    preview.teams.map((team) => [team.id, adapterClone(team)])
  );
  let saved;
  try {
    saved = await state.adminStore.saveDraftBundle(
      { draft: adapterClone(preview.draft), teams: teamEntries },
      {
        expectedDraftRevision: preview.source.draftRevision,
        expectedTeamRevisions: adapterClone(preview.source.teamRevisions),
        expectedSubmissionRevisions: adapterClone(preview.source.submissionRevisions),
        expectedReviewRevisions: adapterClone(preview.source.reviewRevisions),
      }
    );
  } catch (error) {
    if (error?.code === 'all-star-boh-conflict') {
      state.balancePreview = null;
      let refreshError = null;
      try {
        await adapterRefreshBalanceSources(state);
      } catch (cause) {
        refreshError = cause;
        try {
          adapterHandleBackgroundError(state, cause, 'applyBalancePreviewConflictRefresh');
        } catch {
          // The stale-preview contract must survive optional error-reporting failures.
        }
      }
      adapterNotify(state);
      const staleError = adapterPreviewStale();
      if (refreshError) staleError.cause = refreshError;
      throw staleError;
    }
    state.balancePreview = null;
    adapterNotify(state, false);
    throw error;
  }
  preview.applied = true;
  state.balancePreview = null;
  await adapterAdoptDraftTeams(
    state,
    {
      draft: saved?.draft || preview.draft,
      teams: new Map(Object.entries(saved?.teams || teamEntries)),
    },
    'applyBalancePreview'
  );
}

async function adapterBalanceTeams(state) {
  await adapterPreviewBalanceTeams(state);
  await adapterApplyBalancePreview(state);
}

async function adapterSaveRoleGroups(state, payload) {
  const roleGroups = list(payload.roleGroups).map((role, index) => ({
    id: cleanText(role.id) || adapterUniqueId('role', state),
    label: cleanText(role.label),
    capacity: Math.max(0, integer(role.capacity)),
    color: cleanText(role.color) || '#64748b',
    order: index + 1,
  }));
  BohModel.normalizeBohRoleGroups(roleGroups, { rosterSize: ROSTER_SIZE });
  const nextDraft = adapterClone(state.draft || adapterDefaultDraft());
  nextDraft.plan = adapterPlan(nextDraft);
  nextDraft.plan.roleGroups = roleGroups;
  const plan = adapterPlan(nextDraft);
  const template = adapterSeatTemplate(plan);
  const teams = adapterTeamIds(nextDraft).map((teamId, index) => {
    const team = adapterMaterializeTeam(state, teamId, index);
    team.seats = template.map((seatTemplate) => {
      const existing = team.seats.find((seat) => seat.seatNumber === seatTemplate.seatNumber);
      return {
        ...existing,
        id: existing?.id || `${team.id}-seat-${seatTemplate.seatNumber}`,
        seatNumber: seatTemplate.seatNumber,
        roleGroupId: seatTemplate.roleGroupId,
        roleLabel: seatTemplate.roleLabel,
      };
    });
    return team;
  });
  const teamEntries = Object.fromEntries(teams.map((team) => [team.id, team]));
  const expectedTeamRevisions = Object.fromEntries(
    teams.map((team) => [team.id, adapterRevision(state.teams.get(team.id)?.revision)])
  );
  try {
    const saved = await state.adminStore.saveDraftBundle(
      { draft: nextDraft, teams: teamEntries },
      {
        expectedDraftRevision: adapterRevision(state.draft?.revision),
        expectedTeamRevisions,
      }
    );
    state.draft = saved?.draft || nextDraft;
    for (const [teamId, team] of Object.entries(saved?.teams || teamEntries)) {
      state.teams.set(teamId, team);
    }
  } catch (error) {
    await adapterLoadAll(state, false);
    adapterNotify(state);
    throw error;
  }
  adapterNotify(state);
}

async function adapterSavePhases(state, payload) {
  const phases = list(payload.phases).map((phase, index) => ({
    id: cleanText(phase.id) || adapterUniqueId('phase', state),
    label: cleanText(phase.label),
    startMinute: Math.max(0, finiteNumber(phase.startMinute)),
    endMinute: Math.max(0, finiteNumber(phase.endMinute)),
    order: index + 1,
  }));
  if (phases.length !== 5) {
    throw adapterError('all-star-boh-phase-count', 'The plan must contain exactly five phases.');
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    draft.plan.phases = phases;
    return draft;
  });
}

async function adapterSaveMapperPlanDetails(state, payload) {
  const team = adapterFindTeam(state, payload.teamId);
  const occupiedSeats = team.seats.filter((seat) => cleanText(seat.playerId));
  const teamPlayerIds = new Set(occupiedSeats.map((seat) => cleanText(seat.playerId)));
  const backupIds = new Set(
    occupiedSeats
      .filter((seat) => cleanText(seat.lane) === 'backup')
      .map((seat) => cleanText(seat.playerId))
  );
  const starterIds = new Set(
    occupiedSeats
      .filter((seat) => cleanText(seat.lane) !== 'backup')
      .map((seat) => cleanText(seat.playerId))
  );
  if (starterIds.size > 10) {
    throw adapterError(
      'all-star-boh-active-player-limit',
      'A team may have at most 10 active starters.'
    );
  }

  const incoming = new Set();
  const outgoing = new Set();
  const substitutions = list(payload.substitutions).map((entry, index) => {
    const backupPlayerId = cleanText(entry.backupPlayerId);
    const replacesPlayerId = cleanText(entry.replacesPlayerId);
    const entryMinute = integer(entry.entryMinute);
    if (!backupIds.has(backupPlayerId)) {
      throw adapterError(
        'all-star-boh-substitution-backup-required',
        'Only a designated backup may enter the active roster.'
      );
    }
    if (!starterIds.has(replacesPlayerId)) {
      throw adapterError(
        'all-star-boh-substitution-starter-required',
        'A backup must replace an active starter on the same team.'
      );
    }
    if (
      backupPlayerId === replacesPlayerId ||
      incoming.has(backupPlayerId) ||
      outgoing.has(replacesPlayerId)
    ) {
      throw adapterError(
        'all-star-boh-substitution-duplicate',
        'Substitutions cannot reuse an incoming or outgoing player.'
      );
    }
    if (entryMinute < 3 || entryMinute > 60) {
      throw adapterError(
        'all-star-boh-substitution-minute',
        'Backup entry minute must be from 3 through 60.'
      );
    }
    incoming.add(backupPlayerId);
    outgoing.add(replacesPlayerId);
    return {
      id: cleanText(entry.id) || `mapper-substitution-${team.id}-${index + 1}`,
      teamId: team.id,
      backupPlayerId,
      replacesPlayerId,
      entryMinute,
      order: index + 1,
      note: cleanText(entry.note),
    };
  });

  const playerResources = list(payload.playerResources).map((entry) => {
    const playerId = cleanText(entry.playerId);
    const submission = adapterFindSubmission(state, playerId);
    const review = submission ? state.reviews.get(adapterSubmissionUid(submission)) : null;
    if (!teamPlayerIds.has(playerId) || !adapterReviewIsFresh(submission, review)) {
      throw adapterError(
        'all-star-boh-player-resource-unverified',
        'Player resources may be saved only for current verified players assigned to this team.'
      );
    }
    const meritBudget =
      entry.meritBudget === null || entry.meritBudget === undefined || entry.meritBudget === ''
        ? null
        : Number(entry.meritBudget);
    const queueCapacity =
      entry.queueCapacity === null ||
      entry.queueCapacity === undefined ||
      entry.queueCapacity === ''
        ? null
        : Number(entry.queueCapacity);
    return {
      playerId,
      meritBudget,
      queueCapacity,
      skillReservations: uniqueTextList(entry.skillIds).map((id, skillIndex) => ({
        id,
        order: skillIndex + 1,
      })),
    };
  });

  const annotationPrefix = `mapper-${team.id}-building-`;
  const buildingAnnotations = list(payload.buildingAnnotations).map((entry, index) => ({
    id: cleanText(entry.id) || `${annotationPrefix}${index + 1}`,
    buildingId: cleanText(entry.buildingId),
    note: cleanText(entry.note),
    order: index + 1,
  }));

  await adapterSaveDraft(state, (draft) => {
    const plan = adapterPlan(draft);
    plan.substitutions = [
      ...plan.substitutions.filter((entry) => cleanText(entry.teamId) !== team.id),
      ...substitutions,
    ];
    plan.playerResources = [
      ...plan.playerResources.filter((entry) => !teamPlayerIds.has(cleanText(entry.playerId))),
      ...playerResources,
    ];
    plan.buildingAnnotations = [
      ...plan.buildingAnnotations.filter(
        (entry) => !cleanText(entry.id).startsWith(annotationPrefix)
      ),
      ...buildingAnnotations,
    ];
    draft.plan = BohModel.normalizeBohPlan(plan);
    return draft;
  });
}

function adapterNextPlanOrder(entries) {
  const highest = Math.max(0, ...list(entries).map((entry) => integer(entry?.order)));
  return Math.min(100_000, highest + 1);
}

function adapterInstructionRule(state, payload, order) {
  const scope = cleanText(payload.scope);
  if (!['global', 'role', 'seat', 'player'].includes(scope)) {
    throw adapterError('all-star-boh-scope-invalid', 'Choose a valid instruction scope.');
  }
  const scopeId = cleanText(payload.scopeId);
  if (scope !== 'global' && !scopeId) {
    throw adapterError('all-star-boh-scope-target-required', 'Choose an instruction target.');
  }
  const team = adapterFindTeam(state, payload.teamId);
  if (
    scope === 'role' &&
    !adapterPlan(state.draft).roleGroups.some((role) => role.id === scopeId)
  ) {
    throw adapterError('all-star-boh-role-unknown', 'Choose a role from the current plan.');
  }
  if (scope === 'seat' && !team.seats.some((seat) => seat.seatNumber === integer(scopeId))) {
    throw adapterError('all-star-boh-seat-unknown', 'Choose a seat from the current team.');
  }
  if (scope === 'player' && !team.seats.some((seat) => seat.playerId === scopeId)) {
    throw adapterError('all-star-boh-player-unknown', 'Choose a player assigned to this team.');
  }
  const objectives = adapterPlan(state.draft).objectives;
  const objectiveLookup = new Map(
    objectives.flatMap((objective) =>
      [objective.id, objective.code, objective.label]
        .map(cleanText)
        .filter(Boolean)
        .map((value) => [value.toLocaleLowerCase(), objective.id])
    )
  );
  const canonicalObjectiveId = (value) => {
    const token = cleanText(value);
    if (!token) return '';
    const id = objectiveLookup.get(token.toLocaleLowerCase());
    if (!id) {
      throw adapterError('all-star-boh-objective-unknown', `Unknown route objective: ${token}.`);
    }
    return id;
  };
  const canonicalObjectiveIds = (values) =>
    list(values)
      .map(canonicalObjectiveId)
      .filter((id, index, ids) => id && ids.indexOf(id) === index);
  const startObjectiveId = canonicalObjectiveId(payload.startObjectiveId);
  const objectiveId = canonicalObjectiveId(payload.objectiveId);
  const viaObjectiveIds = canonicalObjectiveIds(payload.viaObjectiveIds);
  const explicitPathObjectiveIds = canonicalObjectiveIds(payload.pathObjectiveIds);
  const pathObjectiveIds = [
    startObjectiveId,
    ...viaObjectiveIds,
    ...explicitPathObjectiveIds,
    objectiveId,
  ].filter((id, index, ids) => id && ids.indexOf(id) === index);
  const instruction = {
    summary: cleanText(payload.instruction),
    action: cleanText(payload.action),
    target: '',
    startObjectiveId,
    objectiveId,
    targetLabel: '',
    loadout: cleanText(payload.loadout),
    teleport: payload.teleport === true ? true : cleanText(payload.teleport) || null,
    note: cleanText(payload.note),
    priority: null,
    viaObjectiveIds,
    pathObjectiveIds,
  };
  if (hasOwn(payload, 'standby') && typeof payload.standby === 'boolean') {
    instruction.standby = payload.standby;
  }
  if (hasOwn(payload, 'gatherCrystals') && typeof payload.gatherCrystals === 'boolean') {
    instruction.gatherCrystals = payload.gatherCrystals;
  }
  return {
    id: adapterUniqueId(scope === 'seat' ? 'seat-rule' : 'role-rule', state),
    teamId: cleanText(payload.teamId) || '*',
    phaseId: cleanText(payload.phaseId) || '*',
    legionId: cleanText(payload.legionId) || '*',
    roleGroupId: scope === 'role' ? cleanText(payload.roleGroupId || payload.scopeId) : '',
    seatNumber: scope === 'seat' ? integer(payload.seatNumber || payload.scopeId) : null,
    playerId: scope === 'player' ? cleanText(payload.playerId || payload.scopeId) : '',
    scope,
    scopeId: scope === 'global' ? '*' : scopeId,
    order,
    instruction,
  };
}

async function adapterSaveInstruction(state, payload) {
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    const existingRules = [
      ...draft.plan.roleDefaults,
      ...draft.plan.seatOverrides,
      ...draft.plan.playerOverrides,
      ...draft.plan.instructions,
    ];
    const rule = adapterInstructionRule(state, payload, adapterNextPlanOrder(existingRules));
    if (rule.scope === 'role') draft.plan.roleDefaults.push(rule);
    else if (rule.scope === 'seat') draft.plan.seatOverrides.push(rule);
    else if (rule.scope === 'player') draft.plan.playerOverrides.push(rule);
    else draft.plan.instructions.push(rule);
    return draft;
  });
}

async function adapterRemoveInstruction(state, payload) {
  const id = cleanText(payload.instructionId);
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    for (const key of ['roleDefaults', 'seatOverrides', 'playerOverrides', 'instructions']) {
      draft.plan[key] = list(draft.plan[key]).filter((rule) => rule.id !== id);
    }
    return draft;
  });
}

async function adapterSaveRotation(state, payload) {
  const team = adapterFindTeam(state, payload.teamId);
  const sourceSeat = adapterFindSeat(team, payload.sourceSeatNumber || payload.seatNumber);
  const targetSeat = adapterFindSeat(team, payload.targetSeatNumber);
  if (!sourceSeat.playerId) {
    throw adapterError(
      'all-star-boh-rotation-empty',
      'Assign a player before creating a rotation.'
    );
  }
  if (sourceSeat.seatNumber === targetSeat.seatNumber) {
    throw adapterError(
      'all-star-boh-rotation-same-seat',
      'Choose a different destination seat for the rotation.'
    );
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    const rotationId = cleanText(payload.rotationId);
    const existing = rotationId
      ? draft.plan.rotations.find((rotation) => rotation.id === rotationId)
      : null;
    const rotation = {
      id: rotationId || adapterUniqueId('rotation', state),
      teamId: team.id,
      phaseId: cleanText(payload.phaseId) || '*',
      legionId: cleanText(payload.legionId) || '*',
      playerId: sourceSeat.playerId,
      seatNumber: targetSeat.seatNumber,
      roleGroupId: targetSeat.roleGroupId,
      note: cleanText(payload.note),
      order: existing?.order ?? adapterNextPlanOrder(draft.plan.rotations),
    };
    draft.plan.rotations = [
      ...draft.plan.rotations.filter((item) => item.id !== rotation.id),
      rotation,
    ];
    return draft;
  });
}

async function adapterRemoveRotation(state, payload) {
  const id = cleanText(payload.rotationId);
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    draft.plan.rotations = draft.plan.rotations.filter((rotation) => rotation.id !== id);
    return draft;
  });
}

async function adapterSaveObjective(state, payload) {
  const id = cleanText(payload.id) || adapterUniqueId('objective', state);
  const objective = {
    id,
    code: cleanText(payload.code),
    label: cleanText(payload.label),
    type: cleanText(payload.type) || 'objective',
    x: clamp(payload.x, 0, 100),
    y: clamp(payload.y, 0, 100),
  };
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    draft.plan.objectives = [...draft.plan.objectives.filter((item) => item.id !== id), objective];
    return draft;
  });
}

async function adapterRemoveObjective(state, payload) {
  const id = cleanText(payload.objectiveId);
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    const referenced = [
      ...draft.plan.roleDefaults,
      ...draft.plan.seatOverrides,
      ...draft.plan.playerOverrides,
      ...draft.plan.instructions,
    ].some(
      (rule) =>
        rule.instruction?.startObjectiveId === id ||
        rule.instruction?.objectiveId === id ||
        list(rule.instruction?.viaObjectiveIds).includes(id) ||
        list(rule.instruction?.pathObjectiveIds).includes(id)
    );
    if (referenced) {
      throw adapterError(
        'all-star-boh-objective-in-use',
        'Remove this objective from plan instructions before deleting it.'
      );
    }
    draft.plan.objectives = draft.plan.objectives.filter((objective) => objective.id !== id);
    return draft;
  });
}

function adapterCopyRules(rules, predicate, transform, state, prefix) {
  return list(rules)
    .filter(predicate)
    .map((rule) => ({
      ...adapterClone(rule),
      ...transform(rule),
      id: adapterUniqueId(prefix, state),
    }));
}

async function adapterCopyPhaseTemplate(state, payload) {
  const source = cleanText(payload.sourcePhaseId);
  const target = cleanText(payload.targetPhaseId);
  if (!source || !target || source === target) {
    throw adapterError('all-star-boh-copy-phase-invalid', 'Choose two different plan phases.');
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    for (const key of ['roleDefaults', 'seatOverrides', 'playerOverrides', 'instructions']) {
      const keep = draft.plan[key].filter(
        (rule) =>
          !(
            rule.phaseId === target &&
            (rule.teamId === payload.teamId || rule.teamId === '*') &&
            (rule.legionId === payload.legionId || rule.legionId === '*')
          )
      );
      const copies = adapterCopyRules(
        draft.plan[key],
        (rule) =>
          rule.phaseId === source &&
          (rule.teamId === payload.teamId || rule.teamId === '*') &&
          (rule.legionId === payload.legionId || rule.legionId === '*'),
        () => ({ phaseId: target }),
        state,
        'phase-rule'
      );
      draft.plan[key] = [...keep, ...copies];
    }
    return draft;
  });
}

async function adapterCopyTeamPlan(state, payload) {
  const source = cleanText(payload.sourceTeamId);
  const target = cleanText(payload.targetTeamId);
  if (!source || !target || source === target) {
    throw adapterError('all-star-boh-copy-team-invalid', 'Choose two different teams.');
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    for (const key of ['roleDefaults', 'seatOverrides', 'instructions']) {
      const keep = draft.plan[key].filter((rule) => rule.teamId !== target);
      const copies = adapterCopyRules(
        draft.plan[key],
        (rule) => rule.teamId === source,
        () => ({ teamId: target }),
        state,
        'team-rule'
      );
      draft.plan[key] = [...keep, ...copies];
    }
    return draft;
  });
}

async function adapterCopyLegionPlan(state, payload) {
  const source = cleanText(payload.sourceLegionId);
  const target = cleanText(payload.targetLegionId);
  if (!source || !target || source === target) {
    throw adapterError('all-star-boh-copy-legion-invalid', 'Choose two different Legions.');
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    for (const key of ['roleDefaults', 'seatOverrides', 'playerOverrides', 'instructions']) {
      const keep = draft.plan[key].filter(
        (rule) => !(rule.legionId === target && rule.teamId === payload.teamId)
      );
      const copies = adapterCopyRules(
        draft.plan[key],
        (rule) => rule.legionId === source && rule.teamId === payload.teamId,
        () => ({ legionId: target }),
        state,
        'legion-rule'
      );
      draft.plan[key] = [...keep, ...copies];
    }
    draft.plan.rotations = [
      ...draft.plan.rotations.filter(
        (rotation) => !(rotation.legionId === target && rotation.teamId === payload.teamId)
      ),
      ...adapterCopyRules(
        draft.plan.rotations,
        (rotation) => rotation.legionId === source && rotation.teamId === payload.teamId,
        () => ({ legionId: target }),
        state,
        'legion-rotation'
      ),
    ];
    return draft;
  });
}

async function adapterApplyRoleDefault(state, payload) {
  const plan = adapterPlan(state.draft);
  const source = plan.roleDefaults
    .filter(
      (rule) =>
        rule.roleGroupId === payload.roleGroupId &&
        (rule.teamId === payload.teamId || rule.teamId === '*') &&
        (rule.phaseId === payload.phaseId || rule.phaseId === '*') &&
        (rule.legionId === payload.legionId || rule.legionId === '*')
    )
    .at(-1);
  if (!source) {
    throw adapterError(
      'all-star-boh-role-default-missing',
      'Create a matching role default before applying it to a seat.'
    );
  }
  const override = {
    ...adapterClone(source),
    id: adapterUniqueId('seat-rule', state),
    scope: 'seat',
    scopeId: String(integer(payload.seatNumber)),
    roleGroupId: '',
    seatNumber: integer(payload.seatNumber),
    teamId: cleanText(payload.teamId),
    phaseId: cleanText(payload.phaseId),
    legionId: cleanText(payload.legionId),
  };
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    draft.plan.seatOverrides = [
      ...draft.plan.seatOverrides.filter(
        (rule) =>
          !(
            rule.teamId === override.teamId &&
            rule.phaseId === override.phaseId &&
            rule.legionId === override.legionId &&
            rule.seatNumber === override.seatNumber
          )
      ),
      override,
    ];
    return draft;
  });
}

function adapterLegacyObjectives() {
  return ADAPTER_LEGACY_OBJECTIVE_CODES.map((code, index) => ({
    id: `legacy-${code.toLowerCase()}`,
    code,
    label: code === 'RUNE' ? 'Rune' : code,
    type: 'legacy-schematic',
    // Neutral review grid only; these are not asserted arena coordinates.
    x: 10 + (index % 5) * 20,
    y: 10 + (Math.floor(index / 5) % 5) * 20,
  }));
}

async function adapterApplyLegacyStructure(state, payload) {
  if (
    integer(payload.sourceSeatCount) !== 15 ||
    integer(payload.targetSeatCount) !== ROSTER_SIZE ||
    payload.copyPhases !== true ||
    payload.copyObjectiveCodes !== true ||
    payload.copyPlayerAssignments !== false ||
    payload.copyPlayerNames !== false ||
    payload.copyRoleCapacities !== false ||
    payload.requireExplicitRoleMapping !== true
  ) {
    throw adapterError(
      'all-star-boh-legacy-unsafe',
      'Legacy import was stopped because it attempted to map 15-seat player or role data into 12 seats.'
    );
  }
  await adapterSaveDraft(state, (draft) => {
    draft.plan = adapterPlan(draft);
    draft.plan.phases = BohModel.BOH_DEFAULT_PHASES.map((phase) => ({ ...phase }));
    const existing = new Map(draft.plan.objectives.map((objective) => [objective.id, objective]));
    for (const objective of adapterLegacyObjectives()) {
      if (!existing.has(objective.id)) existing.set(objective.id, objective);
    }
    draft.plan.objectives = [...existing.values()];
    return draft;
  });
}

function adapterModelTeams(state) {
  return adapterTeamIds(state.draft).map((teamId, index) => {
    const team = adapterMaterializeTeam(state, teamId, index);
    return {
      id: team.id,
      number: team.number,
      label: team.name,
      players: team.seats
        .filter((seat) => seat.playerId)
        .map((seat) => ({
          playerId: seat.playerId,
          gameName: seat.displayName || seat.playerId,
          seatNumber: seat.seatNumber,
          roleGroupId: seat.roleGroupId,
          roleLabel: seat.roleLabel,
        })),
    };
  });
}

function adapterValidationErrorText(error) {
  if (typeof error === 'string') return error;
  const code = cleanText(error?.code);
  const details = Object.entries(error || {})
    .filter(([key, value]) => key !== 'code' && value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' · ');
  return details ? `${code} (${details})` : code || 'all-star-boh-validation-error';
}

function adapterTeamMetadataErrors(state) {
  const errors = [];
  const teams = adapterTeamIds(state.draft).map((teamId, index) =>
    adapterMaterializeTeam(state, teamId, index)
  );
  const teamCount = adapterTeamCount(state.draft);
  if (teams.length !== teamCount) {
    errors.push(`all-star-boh-team-count (expected: ${teamCount}, actual: ${teams.length})`);
  }
  for (const team of teams) {
    if (!cleanText(team.name)) errors.push(`all-star-boh-team-name-required (team: ${team.id})`);
    if (!cleanText(team.color)) errors.push(`all-star-boh-team-color-required (team: ${team.id})`);
    const teamPlayerIds = new Set(team.seats.map((seat) => seat.playerId).filter(Boolean));
    if (cleanText(team.captainId) && !teamPlayerIds.has(team.captainId)) {
      errors.push(`all-star-boh-team-captain-unassigned (team: ${team.id})`);
    }
    for (const coLeaderId of uniqueTextList(team.coLeaderIds)) {
      if (!teamPlayerIds.has(coLeaderId)) {
        errors.push(`all-star-boh-team-co-leader-unassigned (team: ${team.id})`);
      }
    }
  }
  return errors;
}

function adapterValidate(state) {
  const plan = adapterUiPlan(state);
  const teams = adapterModelTeams(state);
  const teamValidation = BohModel.validateBohTeamAssignments(teams, {
    teamCount: adapterTeamCount(state.draft),
    roleGroups: plan.roleGroups,
    expectedPlayerIds: adapterSelectedPlayerIds(state),
    allowPartialTeams: true,
  });
  const planValidation = BohModel.validateBohPlan(plan, {
    teams,
    requireInstructions: true,
  });
  const announcementErrors = [
    ...list(teamValidation.errors).map(adapterValidationErrorText),
    ...adapterTeamMetadataErrors(state),
  ];
  const planErrors = [
    ...announcementErrors,
    ...list(planValidation.errors).map(adapterValidationErrorText),
  ];
  const planWarnings = [];
  if (!plan.objectives.length) planWarnings.push('boh_objective_map_empty');
  state.validation = {
    revision: state.revision,
    valid: planErrors.length === 0,
    errors: planErrors,
    warnings: planWarnings,
    announcement: {
      valid: announcementErrors.length === 0,
      errors: announcementErrors,
      warnings: [],
    },
    plan: {
      valid: planErrors.length === 0,
      errors: planErrors,
      warnings: planWarnings,
    },
  };
  adapterNotify(state, false);
}

function adapterSanitizedPlan(state, includePlan) {
  if (!includePlan) {
    return {
      schemaVersion: 1,
      id: 'all-star-boh-announcement',
      label: 'Team announcement',
      roleGroups: adapterClone(adapterPlan(state.draft).roleGroups),
      phases: [],
      legions: [],
      objectives: [],
      roleDefaults: [],
      seatOverrides: [],
      playerOverrides: [],
      instructions: [],
      rotations: [],
      notes: [],
    };
  }
  const plan = adapterPlan(state.draft);
  const usesRuntimeStage1Defaults = adapterTeamIds(state.draft).some(
    (teamId) => !adapterPlanHasAuthoredContent(state.teams.get(teamId)?.plan)
  );
  if (!usesRuntimeStage1Defaults) return plan;
  return {
    ...plan,
    phases: BOH_STAGE1_PHASES.map((phase, order) => ({ ...phase, order: order + 1 })),
    legions: BOH_STAGE1_LEGIONS.map((legion, order) => ({ ...legion, order: order + 1 })),
  };
}

function adapterCompactPublicationPlan(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    id: plan.id,
    label: plan.label,
    roleGroups: adapterClone(plan.roleGroups),
    phases: adapterClone(plan.phases),
    legions: adapterClone(plan.legions),
    objectives: adapterClone(plan.objectives),
    roleDefaults: [],
    seatOverrides: [],
    playerOverrides: [],
    instructions: [],
    rotations: [],
    notes: [],
  };
}

function adapterPublicationBundle(state, kind) {
  const currentPublication = state.publication || {};
  const publicationCopy = adapterPublicationCopy(state.draft, { fallbackTitle: false });
  const announcementPublished =
    kind === 'announcement' || kind === 'both' || currentPublication.announcementPublished === true;
  const planPublished =
    kind === 'plan' || kind === 'both' || currentPublication.planPublished === true;
  const includePlan = planPublished;
  const plan = adapterSanitizedPlan(state, includePlan);
  const teams = {};
  const players = {};
  for (const team of adapterTeamIds(state.draft).map((teamId, index) =>
    adapterMaterializeTeam(state, teamId, index)
  )) {
    const publishedTeam = {
      name: team.name,
      number: team.number,
      color: team.color,
      captainId: team.captainId,
      coLeaderIds: uniqueTextList(team.coLeaderIds).slice(0, 2),
      seats: team.seats
        .filter((seat) => seat.displayName)
        .map((seat) => ({
          id: seat.id,
          rosterKey: seat.rosterKey || seat.id || `${team.id}-seat-${seat.seatNumber}`,
          seatNumber: seat.seatNumber,
          playerId: seat.playerId,
          displayName: seat.displayName,
          roleGroupId: seat.roleGroupId,
          roleLabel: seat.roleLabel,
          side: seat.side,
          lane: seat.lane,
        })),
    };
    teams[team.id] = publishedTeam;
    const modelTeam = {
      id: team.id,
      number: team.number,
      label: team.name,
      players: team.seats
        .filter((seat) => seat.displayName)
        .map((seat) => ({
          playerId: seat.playerId || seat.rosterKey || seat.id,
          gameName: seat.displayName || seat.playerId,
          seatNumber: seat.seatNumber,
        })),
    };
    const teamPlan = includePlan
      ? adapterPlanHasAuthoredContent(team.plan)
        ? adapterClone(team.plan)
        : adapterStage1TeamPlan(team.id, team.seats, plan)
      : null;
    const compactPlan = teamPlan ? adapterCompactPublicationPlan(teamPlan) : null;
    for (const seat of team.seats.filter((item) => item.playerId)) {
      const submission = adapterFindSubmission(state, seat.playerId);
      const projectionUid = submission ? adapterSubmissionUid(submission) : '';
      if (!projectionUid) {
        throw adapterError(
          'all-star-boh-publication-submission-missing',
          `Player ${seat.playerId} has no matching submitted signup.`
        );
      }
      if (players[projectionUid]) {
        throw adapterError(
          'all-star-boh-publication-uid-duplicate',
          `Signup ${projectionUid} is assigned more than once.`
        );
      }
      const projection = {
        playerId: seat.playerId,
        displayName: seat.displayName || seat.playerId,
        teamId: team.id,
        teamName: team.name,
        teamNumber: team.number,
        teamColor: team.color,
        seatNumber: seat.seatNumber,
        roleGroupId: seat.roleGroupId,
        roleLabel: seat.roleLabel,
        announcement: '',
      };
      if (includePlan) {
        projection.plan = compactPlan;
        projection.timeline = BohModel.projectBohPlayerTimeline(
          teamPlan,
          modelTeam,
          seat.playerId
        ).map(({ instructionSources: _sources, ...entry }) => entry);
      }
      players[projectionUid] = projection;
    }
  }
  return {
    current: {
      revision: state.publicationRevision,
      status:
        planPublished && announcementPublished ? 'live' : planPublished ? 'plan' : 'announcement',
      eventName:
        publicationCopy.eventName ||
        cleanText(state.options.eventName) ||
        cleanText(state.draft?.title),
      title:
        publicationCopy.title ||
        cleanText(state.options.publicationTitle) ||
        cleanText(state.draft?.title),
      subtitle: publicationCopy.subtitle || cleanText(state.options.publicationSubtitle),
      message: publicationCopy.message || cleanText(state.options.publicationMessage),
      announcementPublished,
      planPublished,
      activePlanRevision: state.revision,
      teamCount: adapterTeamCount(state.draft),
      rosterSize: ROSTER_SIZE,
      teamIds: Object.keys(teams),
      phases: includePlan ? adapterClone(plan.phases) : [],
      legions: includePlan ? adapterClone(plan.legions) : [],
    },
    teams,
    players,
    sourceDraftRevision: adapterRevision(state.draft?.revision),
    sourceTeamRevisions: Object.fromEntries(
      adapterTeamIds(state.draft).map((teamId) => [
        teamId,
        adapterRevision(state.teams.get(teamId)?.revision),
      ])
    ),
  };
}

export function validateAdminAllStarBohPublicationBundle(bundle = {}) {
  const current = bundle.current || {};
  if (current.announcementPublished !== true && current.planPublished !== true) {
    const hiddenErrors = [];
    if (integer(current.teamCount) !== 0) hiddenErrors.push({ code: 'boh_hidden_team_count' });
    if (Object.keys(bundle.teams || {}).length) hiddenErrors.push({ code: 'boh_hidden_teams' });
    if (Object.keys(bundle.players || {}).length) hiddenErrors.push({ code: 'boh_hidden_players' });
    return { valid: hiddenErrors.length === 0, errors: hiddenErrors };
  }
  const teamCount = normalizeTeamCount(current.teamCount, 0);
  const teams = Object.entries(bundle.teams || {}).map(([teamId, team]) => ({
    id: teamId,
    number: team.number,
    label: team.name,
    players: list(team.seats)
      .filter((seat) => seat.displayName)
      .map((seat) => ({
        playerId: seat.playerId || seat.rosterKey || seat.id,
        gameName: seat.displayName || seat.playerId,
        seatNumber: seat.seatNumber,
      })),
  }));
  const players = Object.values(bundle.players || {});
  const deploymentErrors = Object.entries(bundle.teams || {}).flatMap(([teamId, team]) => {
    const occupiedSeats = list(team.seats).filter((seat) => seat.displayName || seat.playerId);
    const backups = occupiedSeats.filter((seat) => cleanText(seat.lane) === 'backup');
    return backups.length === 2 && occupiedSeats.length - backups.length <= 10
      ? []
      : [{ code: 'boh_backup_designation', teamId, expected: 2, actual: backups.length }];
  });
  const linkedSeatCount = Object.values(bundle.teams || {})
    .flatMap((team) => list(team.seats))
    .filter((seat) => seat.playerId).length;
  const roleGroups = players.find((player) => player?.plan)?.plan?.roleGroups || [];
  const errors = [
    ...deploymentErrors,
    ...list(
      BohModel.validateBohTeamAssignments(teams, {
        teamCount,
        roleGroups,
        expectedPlayerIds: teams.flatMap((team) => team.players.map((player) => player.playerId)),
      }).errors
    ),
  ];
  if (players.length !== linkedSeatCount) {
    errors.push({
      code: 'boh_player_projection_count',
      expected: linkedSeatCount,
      actual: players.length,
    });
  }
  if (current.planPublished !== true) return { valid: errors.length === 0, errors };
  const phaseIds = list(current.phases).map((phase) => phase.id);
  const legionIds = list(current.legions).map((legion) => legion.id);
  const expectedSteps = new Set(
    phaseIds.flatMap((phaseId) => legionIds.map((legionId) => `${phaseId}\u0000${legionId}`))
  );
  for (const player of players) {
    const timeline = list(player.timeline);
    const actualSteps = new Set(
      timeline.map((entry) => `${cleanText(entry.phaseId)}\u0000${cleanText(entry.legionId)}`)
    );
    if (
      timeline.length !== expectedSteps.size ||
      actualSteps.size !== expectedSteps.size ||
      [...expectedSteps].some((key) => !actualSteps.has(key))
    ) {
      errors.push({ code: 'boh_timeline_incomplete', playerId: player.playerId });
    }
    for (const entry of timeline) {
      if (!entry.instruction || !Object.keys(entry.instruction).length) {
        errors.push({
          code: 'boh_instruction_missing',
          playerId: player.playerId,
          phaseId: entry.phaseId,
          legionId: entry.legionId,
        });
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    message: errors.length ? adapterValidationErrorText(errors[0]) : '',
  };
}

async function adapterPublish(state, kind) {
  if (!['announcement', 'plan', 'both'].includes(kind)) {
    throw adapterError('all-star-boh-publish-kind-invalid', 'Choose a valid publication scope.');
  }
  if (kind === 'announcement' && state.publication?.planPublished === true) {
    throw adapterError(
      'all-star-boh-plan-publication-protected',
      'The published player plan is already live. Publish plan changes separately.'
    );
  }
  const readinessKind = kind === 'announcement' ? 'announcement' : 'plan';
  const readiness = state.validation?.[readinessKind];
  if (readiness?.valid !== true || adapterRevision(state.validation?.revision) !== state.revision) {
    throw adapterError(
      'all-star-boh-publish-not-validated',
      'Validate the current All-Star draft revision before publishing.'
    );
  }
  if (kind === 'plan' && state.publication?.announcementPublished !== true) {
    throw adapterError(
      'all-star-boh-announcement-required',
      'Publish the team announcement before publishing the personal plan.'
    );
  }
  const bundle = adapterPublicationBundle(state, kind);
  let result;
  try {
    result = await state.adminStore.publish(bundle, {
      expectedRevision: state.publicationRevision,
      sourceDraftRevision: bundle.sourceDraftRevision,
      sourceTeamRevisions: bundle.sourceTeamRevisions,
      validate: state.options.validatePublication || validateAdminAllStarBohPublicationBundle,
    });
  } catch (error) {
    if (error?.code === 'all-star-boh-conflict' && Number.isInteger(error.actualRevision)) {
      state.publicationRevision = error.actualRevision;
      adapterNotify(state);
    }
    throw error;
  }
  state.publication = result?.current || bundle.current;
  state.publicationRevision = adapterRevision(state.publication?.revision);
  adapterNotify(state);
}

/**
 * Adapt the revisioned Firestore primitives from createAllStarBohAdminStore()
 * into the aggregate controller contract. This layer owns no Firebase calls.
 */
export function createAdminAllStarBohStoreAdapter(adminStore, options = {}) {
  const required = [
    'listSubmissions',
    'subscribeSubmissions',
    'getReview',
    'saveReview',
    'getDraft',
    'subscribeDraft',
    'saveDraft',
    'getDraftTeam',
    'subscribeDraftTeam',
    'saveDraftTeam',
    'saveDraftBundle',
    'publish',
  ];
  const missing = required.filter((name) => typeof adminStore?.[name] !== 'function');
  if (missing.length) {
    throw new TypeError(`All-Star admin store adapter is missing: ${missing.join(', ')}.`);
  }
  const state = {
    adminStore,
    options,
    paidUsableHeroNames: uniqueTextList(options.paidUsableHeroNames),
    submissions: [],
    raceScores: [],
    epicPreferences: [],
    reviews: new Map(),
    draft: adapterDefaultDraft(),
    teams: new Map(),
    publication: null,
    publicationRevision: adapterRevision(options.publicationRevision),
    eventSchedule: normalizeEventSchedule(options.eventSchedule),
    eventScheduleRevision: adapterRevision(options.eventSchedule?.revision),
    validation: {},
    balancePreview: null,
    mapperImportPreview: null,
    mapperPlanImportPreview: null,
    revision: 0,
    listeners: new Set(),
    unsubscribers: new Set(),
    teamUnsubscribers: new Map(),
    teamSubscriptionNotificationsSuspended: 0,
    idSequence: 0,
    started: false,
    startPromise: null,
    stopped: false,
  };

  async function dispatch(command = {}) {
    const type = cleanText(command.type);
    const payload = command.payload && typeof command.payload === 'object' ? command.payload : {};
    let actionResult;
    if (type === 'applyBalancePreview') {
      const expected = adapterRevision(payload?.expectedRevision ?? command?.expectedRevision);
      if (expected !== state.revision) throw adapterPreviewStale();
    } else if (type === 'saveEventSchedule') {
      // Event schedule has an independent document revision and must not stale tactical validation.
    } else {
      adapterAssertRevision(state, payload, command);
    }
    if (type === 'reviewSubmission') await adapterReviewSubmission(state, payload);
    else if (type === 'importApprovedRoster') {
      actionResult = await adapterImportApprovedRoster(state, payload);
    } else if (type === 'previewMapperExactView') {
      actionResult = adapterPreviewMapperExactView(state, payload);
    } else if (type === 'reconcileMapperExactView') {
      actionResult = adapterReconcileMapperExactView(state, payload);
    } else if (type === 'saveMapperExactViewImport') {
      actionResult = await adapterSaveMapperExactView(state);
    } else if (type === 'previewMapperRolePlan') {
      actionResult = adapterPreviewMapperRolePlanFiles(state, {
        jsonTexts: payload.jsonTexts || [payload.jsonText],
      });
    } else if (type === 'saveMapperRolePlanImport') {
      actionResult = await adapterSaveMapperRolePlanFiles(state);
    } else if (type === 'batchReviewSubmissions') {
      actionResult = await adapterBatchReviewSubmissions(state, payload);
    } else if (type === 'deleteSubmission') await adapterDeleteSubmission(state, payload);
    else if (type === 'batchDeleteSubmissions') {
      actionResult = await adapterBatchDeleteSubmissions(state, payload);
    } else if (type === 'createScoringVersion') await adapterCreateScoringVersion(state, payload);
    else if (type === 'savePlayerValues') await adapterSavePlayerValues(state, payload);
    else if (type === 'setScoreOverride') await adapterSetScoreOverride(state, payload);
    else if (type === 'removeScoreOverride') await adapterRemoveScoreOverride(state, payload);
    else if (type === 'savePublicationCopy') {
      await adapterSavePublicationCopy(state, payload);
    } else if (type === 'saveCommitmentScores') {
      await adapterSaveCommitmentScores(state, payload);
    } else if (type === 'saveEpicPlanningOverrides') {
      await adapterSaveEpicPlanningOverrides(state, payload);
    } else if (type === 'setSeatLock') await adapterSetSeatLock(state, payload);
    else if (type === 'moveSeat') await adapterMoveOrSwapSeat(state, payload, false);
    else if (type === 'swapSeats') await adapterMoveOrSwapSeat(state, payload, true);
    else if (type === 'balanceTeams') await adapterBalanceTeams(state, payload);
    else if (type === 'previewBalanceTeams') await adapterPreviewBalanceTeams(state, payload);
    else if (type === 'applyBalancePreview') await adapterApplyBalancePreview(state, payload);
    else if (type === 'discardBalancePreview') adapterDiscardBalancePreview(state);
    else if (type === 'saveTeamBuilderSettings') {
      await adapterSaveTeamBuilderSettings(state, payload);
    } else if (type === 'saveEligiblePool') await adapterSaveEligiblePool(state, payload);
    else if (type === 'autoAssignRankedRoles') await adapterAutoAssignRankedRoles(state);
    else if (type === 'assignSeatPlayer') await adapterAssignSeatPlayer(state, payload);
    else if (type === 'saveTeamMetadata') await adapterSaveTeamMetadata(state, payload);
    else if (type === 'saveRoleGroups') await adapterSaveRoleGroups(state, payload);
    else if (type === 'savePhases') await adapterSavePhases(state, payload);
    else if (type === 'saveMapperPlanDetails') {
      await adapterSaveMapperPlanDetails(state, payload);
    } else if (type === 'saveInstruction') await adapterSaveInstruction(state, payload);
    else if (type === 'removeInstruction') await adapterRemoveInstruction(state, payload);
    else if (type === 'saveRotation') await adapterSaveRotation(state, payload);
    else if (type === 'removeRotation') await adapterRemoveRotation(state, payload);
    else if (type === 'saveObjective') await adapterSaveObjective(state, payload);
    else if (type === 'removeObjective') await adapterRemoveObjective(state, payload);
    else if (type === 'copyPhaseTemplate') await adapterCopyPhaseTemplate(state, payload);
    else if (type === 'copyTeamPlan') await adapterCopyTeamPlan(state, payload);
    else if (type === 'copyLegionPlan') await adapterCopyLegionPlan(state, payload);
    else if (type === 'applyRoleDefault') await adapterApplyRoleDefault(state, payload);
    else if (type === 'applyLegacyStructureTemplate') {
      await adapterApplyLegacyStructure(state, payload);
    } else if (type === 'validateRevision') adapterValidate(state);
    else if (type === 'saveEventSchedule') await adapterSaveEventSchedule(state, payload);
    else if (type === 'publishAnnouncement') await adapterPublish(state, 'announcement');
    else if (type === 'publishPlan') await adapterPublish(state, 'plan');
    else if (type === 'publishBoth') await adapterPublish(state, 'both');
    else {
      throw adapterError(
        'all-star-boh-action-unknown',
        `Unknown All-Star admin action: ${type || '(empty)'}.`
      );
    }
    return {
      snapshot: adapterSnapshot(state),
      ...(actionResult === undefined ? {} : { result: actionResult }),
    };
  }

  const adapter = {
    async start() {
      if (state.started) return state.startPromise;
      state.started = true;
      state.stopped = false;
      state.startPromise = (async () => {
        await adapterLoadAll(state);
        await adapterStartSubscriptions(state);
        return adapterSnapshot(state);
      })();
      try {
        return await state.startPromise;
      } catch (error) {
        state.started = false;
        state.startPromise = null;
        throw error;
      }
    },
    async refresh() {
      return adapterLoadAll(state);
    },
    getSnapshot() {
      return adapterSnapshot(state);
    },
    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('All-Star admin adapter subscriptions require a callback.');
      }
      state.listeners.add(listener);
      return () => state.listeners.delete(listener);
    },
    dispatch,
    stop() {
      if (state.stopped) return;
      state.stopped = true;
      for (const unsubscribe of state.unsubscribers) {
        try {
          unsubscribe?.();
        } catch {
          // Listener teardown is best-effort.
        }
      }
      for (const unsubscribe of state.teamUnsubscribers.values()) {
        try {
          unsubscribe?.();
        } catch {
          // Listener teardown is best-effort.
        }
      }
      state.unsubscribers.clear();
      state.teamUnsubscribers.clear();
      state.listeners.clear();
      if (options.stopAdminStoreOnDestroy !== false) adminStore.stop?.();
      if (
        options.publicationStore &&
        options.publicationStore !== adminStore &&
        options.stopPublicationStoreOnDestroy !== false
      ) {
        options.publicationStore.stop?.();
      }
    },
  };
  return Object.freeze(adapter);
}

const TEAM_WORKSPACE_VIEW_STORAGE_KEY = 'bohAdminTeamWorkspaceView';

function normalizeTeamWorkspaceView(value = {}) {
  const density = value?.density === 'compact' ? 'compact' : 'comfortable';
  const columns = [1, 2, 3].includes(Number(value?.columns)) ? Number(value.columns) : 3;
  return { density, columns };
}

function readTeamWorkspaceView() {
  try {
    const stored = globalThis.localStorage?.getItem(TEAM_WORKSPACE_VIEW_STORAGE_KEY);
    return normalizeTeamWorkspaceView(stored ? JSON.parse(stored) : {});
  } catch {
    return normalizeTeamWorkspaceView();
  }
}

function saveTeamWorkspaceView(state) {
  try {
    globalThis.localStorage?.setItem(
      TEAM_WORKSPACE_VIEW_STORAGE_KEY,
      JSON.stringify({ density: state.teamBoardDensity, columns: state.teamBoardColumns })
    );
  } catch {
    // Browser privacy modes may deny storage; the in-memory preference still applies.
  }
}

function makeInitialState(root, options) {
  const teamWorkspaceView = readTeamWorkspaceView();
  const snapshot = normalizeSnapshot(options.initialSnapshot);
  return {
    root,
    options,
    store: options.store || null,
    ownsStore: false,
    tr: makeTranslator(options.t),
    locale: cleanText(options.locale) || document.documentElement.lang || 'en',
    direction: cleanText(options.direction),
    snapshot,
    stage: (() => {
      try {
        const m = window.location.hash.match(/^#allstar\/(\w+)/);
        return m && STAGES.some(([id]) => id === m[1])
          ? m[1]
          : STAGES.some(([id]) => id === options.initialStage)
            ? options.initialStage
            : 'teams';
      } catch {
        return STAGES.some(([id]) => id === options.initialStage) ? options.initialStage : 'teams';
      }
    })(),
    signupFilter: (() => {
      try {
        return sessionStorage.getItem('bohAdminSignupFilter') || 'all';
      } catch {
        return 'all';
      }
    })(),
    signupSearch: (() => {
      try {
        return sessionStorage.getItem('bohAdminSignupSearch') || '';
      } catch {
        return '';
      }
    })(),
    signupFilters: {
      fightingTime: 'all',
      role: 'all',
      troopType: 'all',
      vtsMember: 'all',
      minTotalPower: '',
      maxTotalPower: '',
    },
    signupSort: (() => {
      try {
        const s = sessionStorage.getItem('bohAdminSignupSort');
        return s ? JSON.parse(s) : { key: 'updated', direction: 'desc' };
      } catch {
        return { key: 'updated', direction: 'desc' };
      }
    })(),
    _renderDirty: false,
    _renderPending: false,
    _snapshotDirty: false,
    epicSummaryOpen: (() => {
      try {
        return sessionStorage.getItem('bohAdminEpicSummaryOpen') === 'true';
      } catch {
        return false;
      }
    })(),
    scoreAuditSort: { key: '', direction: 'asc' },
    selectedSubmissionIds: new Set(),
    selectedSubmissionId: (() => {
      try {
        const m = window.location.hash.match(/^#allstar\/\w+\/player-(.+)/);
        return m ? decodeURIComponent(m[1]) : '';
      } catch {
        return '';
      }
    })(),
    correctionDrafts: new Map(),
    commitmentScoreDraft: null,
    selectedSourceSeat: null,
    approvedRosterImportReport: null,
    mapperImportPreview: null,
    mapperPlanImportPreview: null,
    mapperBoardSearch: '',
    mapperBoardFilter: 'all',
    playerValueEditor: null,
    teamBoardDensity: teamWorkspaceView.density,
    teamBoardColumns: teamWorkspaceView.columns,
    mapperPlanDialogTeamId: '',
    mapperPlanMode: 'overview',
    planTeamId: snapshot.teams[0]?.id || 'team-1',
    planPhaseId: snapshot.plan.phases[0]?.id || DEFAULT_PHASES[0].id,
    planLegionId: snapshot.plan.legions[0]?.id || DEFAULT_LEGIONS[0].id,
    planScope: 'role',
    previewKind: 'announcement',
    publishScope: 'both',
    selectedPreviewTeamId: snapshot.teams[0]?.id || '',
    selectedPreviewPlayerId: snapshot.teams[0]?.seats.find((seat) => seat.playerId)?.playerId || '',
    roleDrafts: null,
    phaseDrafts: null,
    objectiveDraftId: '',
    rotationDraftId: '',
    scheduleDraft: null,
    status: { message: '', tone: 'neutral' },
    pending: false,
    mounted: false,
    destroyed: false,
    eventsAbort: null,
    unsubscribe: null,
  };
}

function currentPlayers(state) {
  const byId = new Map();
  for (const submission of state.snapshot.submissions) {
    const id = playerId(submission);
    if (!id) continue;
    byId.set(id, { ...submission, playerId: id, displayName: playerName(submission) });
  }
  for (const score of state.snapshot.scores) {
    const id = playerId(score);
    if (!id) continue;
    byId.set(id, {
      ...(byId.get(id) || {}),
      ...score,
      playerId: id,
      displayName: playerName(score) || playerName(byId.get(id)),
    });
  }
  for (const team of state.snapshot.teams) {
    for (const seat of team.seats) {
      if (!seat.playerId || byId.has(seat.playerId)) continue;
      byId.set(seat.playerId, {
        playerId: seat.playerId,
        displayName: seat.displayName || seat.playerId,
      });
    }
  }
  return [...byId.values()];
}

function playerById(state, id) {
  return currentPlayers(state).find((player) => player.playerId === id) || null;
}

function scoreValue(player) {
  return finiteNumber(
    player?.finalScore ??
      player?.score?.total ??
      player?.scoreTotal ??
      player?.totalScore ??
      player?.score
  );
}

function formatNumber(state, value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(state.locale || undefined, { maximumFractionDigits }).format(
    finiteNumber(value)
  );
}

function formatDate(state, value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value?.toMillis?.() ?? value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(state.locale || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function stageLabel(state, stageId) {
  const definition = STAGES.find(([id]) => id === stageId) || STAGES[0];
  return state.tr(definition[1], definition[2]);
}

function teamDisplayName(state, team) {
  if (!team) return '';
  return team.generatedName
    ? state.tr('adminBohTeamNameFallback', 'Team {number}', { number: team.number })
    : team.name;
}

function roleDisplayName(state, role) {
  if (!role) return '';
  if (role.id === 'unassigned' && role.generatedLabel) {
    return state.tr('adminBohRoleUnassigned', 'Role unassigned');
  }
  return role.generatedLabel
    ? state.tr('adminBohRoleNameFallback', 'Role {number}', { number: role.order })
    : role.label;
}

function phaseDisplayName(state, phase) {
  if (!phase) return '';
  const defaults = {
    'phase-0-5': ['adminBohPhase0To5', '0–5 min'],
    'phase-5-10': ['adminBohPhase5To10', '5–10 min'],
    'phase-10-15': ['adminBohPhase10To15', '10–15 min'],
    'phase-15-30': ['adminBohPhase15To30', '15–30 min'],
  };
  const known = defaults[phase.id];
  if (phase.generatedLabel && known) return state.tr(known[0], known[1]);
  return phase.generatedLabel
    ? state.tr('adminBohPhaseNameFallback', 'Phase {number}', { number: phase.order })
    : phase.label;
}

function legionDisplayName(state, legion) {
  if (!legion) return '';
  return legion.generatedLabel
    ? state.tr('adminBohLegionNameFallback', 'Legion {number}', { number: legion.order })
    : legion.label;
}

function statusLabel(state, status) {
  const labels = {
    pending: ['adminBohStatusPending', 'Pending review'],
    confirmed: ['adminBohStatusConfirmed', 'Confirmed'],
    approved: ['adminBohStatusConfirmed', 'Confirmed'],
    needs_correction: ['adminBohStatusCorrection', 'Needs correction'],
    excluded: ['adminBohStatusExcluded', 'Excluded'],
    draft: ['adminBohDraft', 'Draft'],
    published: ['adminBohPublishedStatus', 'Published'],
  };
  const [key, fallback] = labels[status] || ['adminBohStatusUnknown', 'Unknown'];
  return state.tr(key, fallback);
}

function renderStageNavigation(state) {
  const pending = state.snapshot.submissions.filter(
    (submission) => submissionStatus(submission) === 'pending'
  ).length;
  const buttonFor = ([id, key, fallback]) => {
    const selected = state.stage === id;
    const badge =
      id === 'signups' && pending ? `<span class="boh-admin-nav-count">${pending}</span>` : '';
    return `<button type="button" role="tab" id="bohAdminTab-${id}"
      class="boh-admin-nav-button" data-action="stage" data-stage="${id}"
      aria-selected="${selected}" aria-controls="bohAdminStagePanel"
      tabindex="${selected ? '0' : '-1'}">
      <span>${escapeHtml(state.tr(key, fallback))}</span>${badge}
    </button>`;
  };
  return `<div class="boh-admin-workspace-bar__primary">${STAGES.slice(0, 3)
    .map(buttonFor)
    .join('')}</div>
    <div class="boh-admin-workspace-bar__secondary" aria-label="${escapeHtml(
      state.tr('adminBohSecondaryUtilities', 'Secondary review utilities')
    )}">${STAGES.slice(3).map(buttonFor).join('')}</div>`;
}

function renderShell(state) {
  const { root } = state;
  const focusSnap = snapshotFocus(root);
  const openCorrectionForm = root.querySelector?.('[data-form="submission-corrections"]');
  const openCorrectionId = cleanText(openCorrectionForm?.elements?.playerId?.value);
  if (openCorrectionForm && correctionDraftFor(state, openCorrectionId)) {
    captureCorrectionDraft(state, openCorrectionForm);
  }
  root.classList.add('boh-admin');
  if (state.direction) root.dir = state.direction;
  root.innerHTML = `
    <section class="boh-admin-shell" aria-labelledby="bohAdminTitle">
      <header class="boh-admin-hero">
        <div>
          <p class="boh-admin-kicker">${escapeHtml(
            state.tr('adminBohDynamicKicker', 'ALL-STAR BoH / {teams} TEAMS / {players} PLAYERS', {
              teams: snapshotTeamCount(state),
              players: snapshotFieldSize(state),
            })
          )}</p>
          <h2 id="bohAdminTitle">${escapeHtml(
            state.tr('adminBohTitle', 'All-Star BoH Mapper Workspace')
          )}</h2>
          <p>${escapeHtml(
            state.tr(
              'adminBohDynamicSubtitle',
              'Import the mapper exact view, reconcile verified signups, edit six teams and plans, then validate and publish explicitly.'
            )
          )}</p>
        </div>
        <div class="boh-admin-hero-meta">
          <span>${escapeHtml(state.tr('adminBohDraftRevision', 'Draft revision'))}</span>
          <strong>${state.snapshot.revision}</strong>
          <button type="button" class="boh-admin-button boh-admin-button-quiet" data-action="refresh">
            ${escapeHtml(state.tr('adminBohRefresh', 'Refresh'))}
          </button>
        </div>
      </header>

      <!-- bohAdminStatus rendered separately as persistent live region -->

      <nav class="boh-admin-nav boh-admin-workspace-bar" role="tablist" aria-label="${escapeHtml(
        state.tr('adminBohWorkflow', 'All-Star mapper workspace and secondary utilities')
      )}">
        ${renderStageNavigation(state)}
      </nav>

      <div id="bohAdminStagePanel" class="boh-admin-stage" role="tabpanel"
        aria-labelledby="bohAdminTab-${state.stage}" tabindex="0">
        ${renderCurrentStage(state)}
      </div>
    </section>`;
  root.setAttribute('aria-busy', String(state.pending));
  syncSignupSelectionCheckbox(state);
  syncEligiblePoolCount(state);
  syncEligiblePoolSearch(state);
  syncMapperBoardFilter(state);
  syncStickyOffsets(state);
  const stagePanel = root.querySelector('#bohAdminStagePanel');
  if (stagePanel) {
    stagePanel.inert = state.pending;
  }
  restoreFocus(root, focusSnap);
}

function syncStickyOffsets(state) {
  const table = state.root?.querySelector?.('.boh-admin-table');
  if (!table) return;
  const headerRow = table.querySelector('thead tr');
  if (!headerRow) return;
  const headers = [...headerRow.children];
  const cumWidths = [];
  let running = 0;
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const isSticky = h.classList.contains('boh-admin-col-sticky');
    cumWidths.push(isSticky ? running : 0);
    if (isSticky) running += h.offsetWidth;
  }
  if (!running) return;
  const isRtl = document?.dir === 'rtl' || state.root.closest?.('[dir="rtl"]');
  const prop = isRtl ? 'right' : 'left';
  for (let i = 0; i < headers.length; i++) {
    if (!cumWidths[i]) continue;
    headers[i].style[prop] = cumWidths[i] + 'px';
    table.querySelectorAll('tbody tr').forEach((tr) => {
      const cell = tr.children[i];
      if (cell) cell.style[prop] = cumWidths[i] + 'px';
    });
  }
}

function syncSignupSelectionCheckbox(state) {
  const checkbox = state.root.querySelector?.('[data-action="select-all-visible"]');
  if (!checkbox) return;
  const visibleIds = filteredSubmissions(state).map(playerId).filter(Boolean);
  const selectedCount = visibleIds.filter((id) => state.selectedSubmissionIds.has(id)).length;
  checkbox.indeterminate = selectedCount > 0 && selectedCount < visibleIds.length;
}

function syncBatchToolbar(state) {
  const toolbar = state.root.querySelector('[data-form="batch-review"]');
  if (!toolbar) return;
  const visible = filteredSubmissions(state);
  const visibleIds = visible.map(playerId).filter(Boolean);
  const selectedCount = visibleIds.filter((id) => state.selectedSubmissionIds.has(id)).length;
  const disabled = !selectedCount || state.pending;
  const btn1 = toolbar.querySelector('button[type="submit"]');
  const btn2 = toolbar.querySelector('[data-action="delete-selected-submissions"]');
  if (btn1) {
    btn1.disabled = disabled;
    btn1.textContent = state.tr('adminBohConfirmSelected', 'Confirm selected ({count})', {
      count: selectedCount,
    });
  }
  if (btn2) {
    btn2.disabled = disabled;
    btn2.textContent = state.tr('adminBohDeleteSelected', 'Delete selected ({count})', {
      count: selectedCount,
    });
  }
}

function syncEligiblePoolCount(state) {
  const form = state.root.querySelector('[data-form="eligible-pool"]');
  if (!form) return;
  const fieldSize = integer(form.dataset.eligibleFieldSize);
  const selectedCount = form.querySelectorAll('input[name="playerId"]:checked').length;
  const text = `${selectedCount} / ${fieldSize}`;
  const count = state.root.querySelector('[data-eligible-pool-count]');
  if (count) count.textContent = text;
  const save = form.querySelector('[data-eligible-pool-save]');
  if (save) {
    save.textContent = `${state.tr('adminBohSaveEligiblePool', 'Save eligible field')} (${text})`;
    save.disabled = state.pending;
  }
}

function syncEligiblePoolSearch(state) {
  const form = state.root.querySelector('[data-form="eligible-pool"]');
  if (!form) return;
  const input = form.querySelector('[data-action="eligible-pool-search"]');
  const filter = cleanText(form.querySelector('[data-action="eligible-pool-filter"]')?.value);
  const query = cleanText(input?.value).toLocaleLowerCase();
  let matches = 0;
  for (const row of form.querySelectorAll('[data-eligible-pool-row]')) {
    const haystack = cleanText(row.dataset.search).toLocaleLowerCase();
    const checkbox = row.querySelector('input[name="playerId"]');
    const selectionMatches =
      filter === 'selected'
        ? checkbox?.checked
        : filter === 'unselected'
          ? !checkbox?.checked
          : true;
    const visible = selectionMatches && (!query || haystack.includes(query));
    row.hidden = !visible;
    if (visible) matches += 1;
  }
  const counter = form.querySelector('[data-eligible-pool-search-count]');
  if (counter) {
    counter.textContent = query
      ? state.tr('adminBohEligiblePoolSearchCount', '{count} matches', { count: matches })
      : '';
  }
}

function syncMapperBoardFilter(state) {
  const query = cleanText(state.mapperBoardSearch).toLocaleLowerCase();
  const filter = cleanText(state.mapperBoardFilter) || 'all';
  for (const seat of state.root.querySelectorAll?.('.boh-admin-seat') || []) {
    const searchMatches =
      !query || cleanText(seat.dataset.search).toLocaleLowerCase().includes(query);
    const deployment = cleanText(seat.dataset.deployment);
    const filterMatches = filter === 'all' || deployment === filter;
    seat.hidden = !(searchMatches && filterMatches);
  }
  for (const team of state.root.querySelectorAll?.('.boh-admin-team') || []) {
    const visibleSeats = [...team.querySelectorAll('.boh-admin-seat')].some((seat) => !seat.hidden);
    team.hidden = !visibleSeats;
  }
}

function selectHighestEligiblePlayers(state) {
  const form = state.root.querySelector('[data-form="eligible-pool"]');
  if (!form) return;
  const fieldSize = integer(form.dataset.eligibleFieldSize);
  const selectedIds = new Set(
    teamBuilderCandidates(state)
      .slice(0, fieldSize)
      .map((player) => cleanText(player.playerId))
      .filter(Boolean)
  );
  for (const checkbox of form.querySelectorAll('input[name="playerId"]')) {
    checkbox.checked = selectedIds.has(cleanText(checkbox.value));
  }
  syncEligiblePoolCount(state);
  syncEligiblePoolSearch(state);
}

function renderVtsScores(state) {
  const rows = buildAdminVtsScoreRows(state.snapshot.submissions, state.snapshot.raceScores);
  const submitted = rows.filter((row) => row.submitted).length;
  const missing = rows.length - submitted;
  const tierOne = rows.filter((row) => row.tier === 1).length;
  const tierTwo = rows.length - tierOne;
  const tableRows = rows
    .map((row) => {
      const growth =
        row.growth === null
          ? '—'
          : `${row.growth > 0 ? '+' : ''}${formatNumber(state, row.growth)}`;
      const growthPercent =
        row.growthPercent === null
          ? '—'
          : `${row.growthPercent > 0 ? '+' : ''}${formatNumber(state, row.growthPercent, 2)}%`;
      const ocrStatus = row.legacyUpload
        ? 'Previous one-field upload · re-upload required'
        : !row.submitted
          ? state.tr('adminVtsScoreAwaiting', 'Awaiting upload')
          : row.ocrCorrected
            ? state.tr('adminVtsScoreCorrected', 'OCR corrected')
            : row.ocrConfidence === null
              ? state.tr('adminVtsScoreReviewed', 'Reviewed')
              : state.tr('adminVtsScoreConfidence', '{confidence}% OCR', {
                  confidence: Math.round(row.ocrConfidence * 100),
                });
      const breakdownRows = row.comparisons
        .map((comparison) => {
          const config = VTS_SCORE_COMPARISON_FIELDS.find(([field]) => field === comparison.field);
          const label = state.tr(config?.[1] || '', config?.[2] || comparison.field);
          const fieldGrowth =
            comparison.growth === null
              ? '—'
              : `${comparison.growth > 0 ? '+' : ''}${formatNumber(state, comparison.growth)}`;
          const fieldGrowthPercent =
            comparison.growthPercent === null
              ? '—'
              : `${comparison.growthPercent > 0 ? '+' : ''}${formatNumber(state, comparison.growthPercent, 2)}%`;
          return `<tr>
            <th scope="row">${escapeHtml(label)}</th>
            <td>${comparison.baseline === null ? '—' : escapeHtml(formatNumber(state, comparison.baseline))}</td>
            <td>${comparison.final === null ? '—' : escapeHtml(formatNumber(state, comparison.final))}</td>
            <td data-growth="${comparison.growth === null ? 'missing' : comparison.growth >= 0 ? 'positive' : 'negative'}">${escapeHtml(fieldGrowth)}</td>
            <td data-growth="${comparison.growthPercent === null ? 'missing' : comparison.growthPercent >= 0 ? 'positive' : 'negative'}">${escapeHtml(fieldGrowthPercent)}</td>
          </tr>`;
        })
        .join('');
      return `<tr data-vts-score-status="${row.submitted ? 'submitted' : row.legacyUpload ? 'incomplete' : 'missing'}">
        <th scope="row">
          <strong>${escapeHtml(row.gameName)}</strong>
          <details class="boh-admin-vts-score-breakdown">
            <summary>All power changes</summary>
            <div class="boh-admin-table-wrap">
              <table class="boh-admin-table">
                <thead><tr><th>Power type</th><th>Sign-up</th><th>Final</th><th>Change</th><th>Change %</th></tr></thead>
                <tbody>${breakdownRows}</tbody>
              </table>
            </div>
          </details>
        </th>
        <td><span class="boh-admin-chip">Tier ${row.tier}</span></td>
        <td>${escapeHtml(formatNumber(state, row.baselineTotalPower))}</td>
        <td>${row.finalTotalPower === null ? '—' : escapeHtml(formatNumber(state, row.finalTotalPower))}</td>
        <td data-growth="${row.growth === null ? 'missing' : row.growth >= 0 ? 'positive' : 'negative'}">${escapeHtml(growth)}</td>
        <td>${escapeHtml(growthPercent)}</td>
        <td>${escapeHtml(ocrStatus)}</td>
        <td>${row.submitted ? escapeHtml(formatDate(state, row.submittedAt)) : '—'}</td>
      </tr>`;
    })
    .join('');
  return `<section class="boh-admin-stack boh-admin-vts-score">
    <header class="boh-admin-stage-heading">
      <div>
        <p class="boh-admin-kicker">COMPETITION #11 · FINAL POWER</p>
        <h3>${escapeHtml(state.tr('adminVtsScoreTitle', 'VtsScore growth comparison'))}</h3>
        <p>${escapeHtml(
          state.tr(
            'adminVtsScoreDescription',
            'Compare each signed-up player’s original Total Power with tonight’s reviewed OCR upload.'
          )
        )}</p>
      </div>
    </header>
    <div class="boh-admin-summary-grid">
      ${summaryCard(submitted, state.tr('adminVtsScoreSubmitted', 'Final uploads'), 'positive')}
      ${summaryCard(missing, state.tr('adminVtsScoreMissing', 'Still missing'), missing ? 'warning' : 'positive')}
      ${summaryCard(tierOne, state.tr('adminVtsScoreTierOne', 'Tier 1 · Dragon 7M+'))}
      ${summaryCard(tierTwo, state.tr('adminVtsScoreTierTwo', 'Tier 2 · Dragon below 7M'))}
    </div>
    <section class="boh-admin-card">
      <div class="boh-admin-card-heading">
        <div><h4>${escapeHtml(state.tr('adminVtsScoreTable', 'Competition standings data'))}</h4>
        <p>${escapeHtml(
          state.tr(
            'adminVtsScoreSortHint',
            'Grouped by the original Dragon tier, then sorted by Total Power growth.'
          )
        )}</p></div>
      </div>
      <div class="boh-admin-table-wrap">
        <table class="boh-admin-table boh-admin-vts-score-table">
          <thead><tr>
            <th scope="col">${escapeHtml(state.tr('adminBohPlayer', 'Player'))}</th>
            <th scope="col">${escapeHtml(state.tr('adminVtsScoreTier', 'Tier'))}</th>
            <th scope="col">${escapeHtml(state.tr('adminVtsScoreBaseline', 'Sign-up Total Power'))}</th>
            <th scope="col">${escapeHtml(state.tr('adminVtsScoreFinal', 'Final Total Power'))}</th>
            <th scope="col">${escapeHtml(state.tr('adminVtsScoreGrowth', 'Growth'))}</th>
            <th scope="col">${escapeHtml(state.tr('adminVtsScoreGrowthPercent', 'Growth %'))}</th>
            <th scope="col">${escapeHtml(state.tr('adminVtsScoreOcr', 'OCR review'))}</th>
            <th scope="col">${escapeHtml(state.tr('adminVtsScoreUpdated', 'Submitted'))}</th>
          </tr></thead>
          <tbody>${
            tableRows ||
            `<tr><td colspan="8">${escapeHtml(
              state.tr('adminVtsScoreEmpty', 'No submitted All-Star signups are available yet.')
            )}</td></tr>`
          }</tbody>
        </table>
      </div>
    </section>
    ${renderBestVtsScoreGrowth(rows, state)}
  </section>`;
}

export const VTS_SCORE_TIERS = Object.freeze([1, 2]);

/**
 * Leaders per power category for one tier, ranked two ways at once. Absolute
 * growth favours the biggest accounts, percentage growth favours the smallest,
 * so neither alone tells leadership who actually pushed hardest.
 */
export function buildVtsScoreTierSummary(rows = [], tier = 1) {
  const all = list(rows).filter((row) => row?.tier === tier);
  const submitted = all.filter((row) => row?.submitted);
  const categories = VTS_SCORE_COMPARISON_FIELDS.map(([field, i18nKey, label]) => {
    let growthRow = null;
    let growthValue = null;
    let percentRow = null;
    let percentValue = null;
    for (const row of submitted) {
      const comparison = row.comparisons?.find((entry) => entry.field === field);
      if (!comparison) continue;
      if (comparison.growth !== null && (growthValue === null || comparison.growth > growthValue)) {
        growthValue = comparison.growth;
        growthRow = row;
      }
      if (
        comparison.growthPercent !== null &&
        (percentValue === null || comparison.growthPercent > percentValue)
      ) {
        percentValue = comparison.growthPercent;
        percentRow = row;
      }
    }
    return {
      field,
      i18nKey,
      label,
      growthPlayer: growthRow?.gameName || '',
      growth: growthValue,
      percentPlayer: percentRow?.gameName || '',
      growthPercent: percentValue,
    };
  });
  const totals = submitted.reduce(
    (accumulator, row) => {
      if (Number.isFinite(row.finalTotalPower)) accumulator.finalTotalPower += row.finalTotalPower;
      if (Number.isFinite(row.baselineTotalPower)) {
        accumulator.baselineTotalPower += row.baselineTotalPower;
      }
      if (Number.isFinite(row.growth)) accumulator.growth += row.growth;
      return accumulator;
    },
    { finalTotalPower: 0, baselineTotalPower: 0, growth: 0 }
  );
  return {
    tier,
    players: all.length,
    submitted: submitted.length,
    missing: all.length - submitted.length,
    categories,
    ...totals,
    growthPercent:
      totals.baselineTotalPower > 0 ? (totals.growth / totals.baselineTotalPower) * 100 : null,
  };
}

function renderVtsScoreTierSection(rows, state, tier) {
  const summary = buildVtsScoreTierSummary(rows, tier);
  if (!summary.players) return '';
  const signedNumber = (value, decimals = 0) =>
    value === null ? '\u2014' : `${value > 0 ? '+' : ''}${formatNumber(state, value, decimals)}`;
  const tone = (value) => (value === null ? 'missing' : value >= 0 ? 'positive' : 'negative');
  const categoryRows = summary.categories
    .map(
      (entry) => `<tr>
        <th scope="row">${escapeHtml(state.tr(entry.i18nKey, entry.label))}</th>
        <td><strong>${escapeHtml(entry.growthPlayer || '\u2014')}</strong></td>
        <td data-growth="${tone(entry.growth)}">${escapeHtml(signedNumber(entry.growth))}</td>
        <td><strong>${escapeHtml(entry.percentPlayer || '\u2014')}</strong></td>
        <td data-growth="${tone(entry.growthPercent)}">${escapeHtml(
          entry.growthPercent === null ? '\u2014' : `${signedNumber(entry.growthPercent, 2)}%`
        )}</td>
      </tr>`
    )
    .join('');
  const heading =
    tier === 1
      ? state.tr('adminVtsScoreTierOne', 'Tier 1 \u00b7 Dragon 7M+')
      : state.tr('adminVtsScoreTierTwo', 'Tier 2 \u00b7 Dragon below 7M');
  return `<section class="boh-admin-card boh-admin-vts-score-tier" data-vts-score-tier="${tier}">
    <div class="boh-admin-card-heading">
      <div>
        <h4>${escapeHtml(heading)}</h4>
        <p>${escapeHtml(
          state.tr(
            'adminVtsScoreTierHint',
            'Category leaders by raw growth and by percentage growth, plus the tier total.'
          )
        )}</p>
      </div>
    </div>
    <div class="boh-admin-summary-grid">
      ${summaryCard(
        `${summary.submitted}/${summary.players}`,
        state.tr('adminVtsScoreTierUploads', 'Uploads in'),
        summary.missing ? 'warning' : 'positive'
      )}
      ${summaryCard(
        formatNumber(state, summary.finalTotalPower),
        state.tr('adminVtsScoreTierTotalPower', 'Combined final Total Power')
      )}
      ${summaryCard(
        signedNumber(summary.growth),
        state.tr('adminVtsScoreTierTotalGrowth', 'Combined growth'),
        summary.growth >= 0 ? 'positive' : 'warning'
      )}
      ${summaryCard(
        summary.growthPercent === null ? '\u2014' : `${signedNumber(summary.growthPercent, 2)}%`,
        state.tr('adminVtsScoreTierTotalGrowthPercent', 'Tier growth %')
      )}
    </div>
    <div class="boh-admin-table-wrap">
      <table class="boh-admin-table boh-admin-vts-score-table">
        <thead><tr>
          <th scope="col">${escapeHtml(state.tr('adminVtsScoreCategory', 'Category'))}</th>
          <th scope="col">${escapeHtml(state.tr('adminVtsScoreTopGrowthPlayer', 'Top growth'))}</th>
          <th scope="col">${escapeHtml(state.tr('adminVtsScoreGrowth', 'Growth'))}</th>
          <th scope="col">${escapeHtml(state.tr('adminVtsScoreTopPercentPlayer', 'Top growth %'))}</th>
          <th scope="col">${escapeHtml(state.tr('adminVtsScoreGrowthPercent', 'Growth %'))}</th>
        </tr></thead>
        <tbody>${categoryRows}</tbody>
      </table>
    </div>
  </section>`;
}

function renderBestVtsScoreGrowth(rows, state) {
  const sections = VTS_SCORE_TIERS.map((tier) => renderVtsScoreTierSection(rows, state, tier))
    .filter(Boolean)
    .join('');
  if (!sections) return '';
  return `<section class="boh-admin-stack boh-admin-vts-score-tiers">
    <div class="boh-admin-card-heading">
      <div>
        <h4>${escapeHtml(state.tr('adminVtsScoreBestTitle', 'Best growth per category'))}</h4>
        <p>${escapeHtml(
          state.tr(
            'adminVtsScoreBestHint',
            'Category leaders within each Dragon tier, ranked by raw growth and by percentage growth side by side.'
          )
        )}</p>
      </div>
    </div>
    ${sections}
  </section>`;
}

function renderCurrentStage(state) {
  if (state.stage === 'scores') return renderVtsScores(state);
  if (state.stage === 'scoring') return renderScoring(state);
  if (state.stage === 'teams') return renderTeamBuilder(state);
  if (state.stage === 'plans') return renderPlans(state);
  if (state.stage === 'publish') return renderPublish(state);
  return renderSignupReview(state);
}

function summaryCard(value, label, tone = 'neutral') {
  return `<article class="boh-admin-summary-card" data-tone="${tone}">
    <strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span>
  </article>`;
}

function epicLaneLabel(state, lane) {
  const labels = {
    south: ['adminBohEpicLaneSouth', 'South'],
    center: ['adminBohEpicLaneCenter', 'Center'],
    north: ['adminBohEpicLaneNorth', 'North'],
  };
  const [key, fallback] = labels[lane] || ['', lane];
  return key ? state.tr(key, fallback) : fallback;
}

function playerCountLabel(state, count) {
  return state.tr('adminBohPlayersCount', '{count} players', { count });
}

function renderEpicShowdownPreferenceSummary(state) {
  const summary = buildAdminEpicShowdownPreferenceSummary(state.snapshot);
  const laneItems = EPIC_LANE_IDS.map(
    (lane) => `<li>
      <span>${escapeHtml(epicLaneLabel(state, lane))}</span>
      <strong>${escapeHtml(playerCountLabel(state, summary.laneCounts[lane]))}</strong>
    </li>`
  ).join('');
  const timeItems = summary.times
    .map(
      ({ value, count }) => `<li>
        <span>${escapeHtml(value)}</span>
        <strong>${escapeHtml(playerCountLabel(state, count))}</strong>
      </li>`
    )
    .join('');
  const preferenceRows = summary.players
    .map(
      (preference) => `<tr${preference.excluded ? ' data-epic-excluded="true"' : ''}>
        <th scope="row">${escapeHtml(preference.displayName || preference.playerId)}</th>
        <td>${escapeHtml(preference.locale || state.tr('adminBohNotProvided', 'Not provided'))}</td>
        <td>${escapeHtml(
          preference.lanes.map((lane) => epicLaneLabel(state, lane)).join(', ') ||
            state.tr('adminBohNotProvided', 'Not provided')
        )}</td>
        <td>${escapeHtml(
          preference.times.join(', ') || state.tr('adminBohNotProvided', 'Not provided')
        )}</td>
        <td>${escapeHtml(
          preference.flexibilityPreference || state.tr('adminBohNotProvided', 'Not provided')
        )}</td>
        <td><input class="boh-admin-selection-checkbox" type="checkbox" name="excluded.${escapeHtml(
          preference.playerId
        )}" ${preference.excluded ? 'checked' : ''} aria-label="${escapeHtml(
          state.tr('adminBohEpicExcludePlayer', 'Exclude {player} from Epic planning', {
            player: preference.displayName || preference.playerId,
          })
        )}"></td>
        <td><select class="boh-admin-select" name="laneOverride.${escapeHtml(
          preference.playerId
        )}" aria-label="${escapeHtml(
          state.tr('adminBohEpicLaneOverrideFor', 'Lane override for {player}', {
            player: preference.displayName || preference.playerId,
          })
        )}">
          <option value="">${escapeHtml(state.tr('adminBohEpicUsePreference', 'Use preference'))}</option>
          ${EPIC_LANE_IDS.map(
            (lane) =>
              `<option value="${escapeHtml(lane)}" ${preference.laneOverride === lane ? 'selected' : ''}>${escapeHtml(epicLaneLabel(state, lane))}</option>`
          ).join('')}
        </select><small>${escapeHtml(
          preference.effectiveLane
            ? state.tr('adminBohEpicEffectiveLane', 'Effective: {lane}', {
                lane: epicLaneLabel(state, preference.effectiveLane),
              })
            : state.tr('adminBohEpicLaneUnresolved', 'Effective lane unresolved')
        )}</small></td>
        <td><input class="boh-admin-input" name="groupId.${escapeHtml(
          preference.playerId
        )}" maxlength="160" value="${escapeHtml(preference.groupId)}" placeholder="${escapeHtml(
          state.tr('adminBohEpicGroupPlaceholder', 'Example: Turkish A')
        )}" aria-label="${escapeHtml(
          state.tr('adminBohEpicGroupFor', 'Keep-together group for {player}', {
            player: preference.displayName || preference.playerId,
          })
        )}"></td>
      </tr>`
    )
    .join('');
  const groupWarnings = summary.groupWarnings
    .map((warning) => {
      const message =
        warning.code === 'conflict'
          ? state.tr('adminBohEpicGroupConflict', 'Group {group} has conflicting lane overrides.', {
              group: warning.groupId,
            })
          : state.tr(
              'adminBohEpicGroupUnresolved',
              'Group {group} needs one shared lane override.',
              { group: warning.groupId }
            );
      return `<li>${escapeHtml(message)}</li>`;
    })
    .join('');

  const epicOpen = state.epicSummaryOpen ? ' open' : '';
  return `<details class="boh-admin-card boh-admin-epic-preferences"${epicOpen}>
    <summary class="boh-admin-epic-summary">
      <span class="boh-admin-epic-summary-title">${escapeHtml(
        state.tr('adminBohEpicShowdownPreferences', 'Epic Showdown preferences')
      )}</span>
      <strong class="boh-admin-preference-total">${escapeHtml(
        state.tr('adminBohEpicActiveExcluded', '{active} active · {excluded} excluded', {
          active: summary.activeCount,
          excluded: summary.excludedCount,
        })
      )}</strong>
    </summary>
    <p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohPlanningSignal', 'Planning signal only')
    )}</p>
    <p>${escapeHtml(
      state.tr(
        'adminBohEpicShowdownPreferencesHelp',
        'Player-selected lanes and game times for planning only. Multiple choices are allowed.'
      )
    )}</p>
    <div class="boh-admin-preference-overview">
      <section>
        <h5>${escapeHtml(state.tr('adminBohEpicLaneSummary', 'Lane interest'))}</h5>
        <ul>${laneItems}</ul>
      </section>
      <section>
        <h5>${escapeHtml(state.tr('adminBohEpicTimeSummary', 'Game-time interest'))}</h5>
        <ul>${timeItems}</ul>
      </section>
    </div>
    <details class="boh-admin-preference-details">
      <summary>${escapeHtml(
        state.tr('adminBohEpicPlayerPreferences', 'Player preference details')
      )}</summary>
      ${
        preferenceRows
          ? `<form data-form="epic-planning">
            ${
              groupWarnings
                ? `<ul class="boh-admin-epic-warnings" role="alert">${groupWarnings}</ul>`
                : ''
            }
            <div class="boh-admin-table-wrap" tabindex="0">
              <table class="boh-admin-table">
                <thead><tr>
                  <th scope="col">${escapeHtml(state.tr('adminBohPlayer', 'Player'))}</th>
                  <th scope="col">${escapeHtml(state.tr('adminBohLocale', 'Language / locale'))}</th>
                  <th scope="col">${escapeHtml(
                    state.tr('adminBohEpicLane', 'Preferred lanes')
                  )}</th>
                  <th scope="col">${escapeHtml(
                    state.tr('adminBohEpicTimes', 'Preferred game times')
                  )}</th>
                  <th scope="col">${escapeHtml(
                    state.tr('adminBohEpicFlexibility', 'Flexibility preference')
                  )}</th>
                  <th scope="col">${escapeHtml(state.tr('adminBohEpicExcluded', 'Exclude'))}</th>
                  <th scope="col">${escapeHtml(
                    state.tr('adminBohEpicLaneOverride', 'Lane override')
                  )}</th>
                  <th scope="col">${escapeHtml(
                    state.tr('adminBohEpicKeepTogetherGroup', 'Keep-together group')
                  )}</th>
                </tr></thead>
                <tbody>${preferenceRows}</tbody>
              </table>
            </div>
            <div class="boh-admin-stage-actions boh-admin-epic-actions">
              <button class="boh-admin-button boh-admin-button-primary" type="submit">${escapeHtml(
                state.tr('adminBohEpicSavePlanning', 'Save Epic planning controls')
              )}</button>
              <button class="boh-admin-button" type="button" data-action="export-epic-planning">${escapeHtml(
                state.tr('adminBohEpicExportPlanning', 'Export active Epic CSV')
              )}</button>
            </div>
          </form>`
          : `<p class="boh-admin-preference-empty">${escapeHtml(
              state.tr('adminBohEpicNoPreferences', 'No Epic Showdown preferences submitted yet.')
            )}</p>`
      }
    </details>
  </details>`;
}

function filteredSubmissions(state) {
  return sortAdminSubmissions(
    filterAdminSubmissions(state.snapshot.submissions, {
      search: state.signupSearch,
      status: state.signupFilter,
      ...state.signupFilters,
    }),
    state.signupSort
  );
}

function signupFilterOptions(state) {
  const fields = state.snapshot.submissions.map(adminSubmissionFields);
  return {
    fightingTimes: uniqueTextList(fields.flatMap((item) => item.fightingTimes)).sort(),
    roles: uniqueTextList(fields.flatMap((item) => item.roles)).sort(),
    troopTypes: uniqueTextList(fields.flatMap((item) => item.troopTypes)).sort(),
  };
}

function signupSortHeader(state, key, label, extraClass = '') {
  const active = state.signupSort.key === key;
  const ariaSort = active
    ? state.signupSort.direction === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';
  const cls = extraClass ? ` class="${escapeHtml(extraClass)}"` : '';
  return `<th scope="col"${cls} aria-sort="${ariaSort}"><button type="button" class="boh-admin-button boh-admin-button-quiet" data-action="signup-sort" data-sort-key="${key}">${escapeHtml(
    label
  )}</button></th>`;
}

function renderSignupReview(state) {
  const submissions = state.snapshot.submissions;
  const visible = filteredSubmissions(state);
  const filterOptions = signupFilterOptions(state);
  const visibleIds = visible.map(playerId).filter(Boolean);
  const selectedVisibleIds = visibleIds.filter((id) => state.selectedSubmissionIds.has(id));
  const allVisibleSelected = Boolean(
    visibleIds.length && visibleIds.every((id) => state.selectedSubmissionIds.has(id))
  );
  const disabled = state.pending ? 'disabled' : '';
  const pending = submissions.filter((item) => submissionStatus(item) === 'pending').length;
  const confirmed = submissions.filter((item) =>
    ['confirmed', 'approved'].includes(submissionStatus(item))
  ).length;
  const correction = submissions.filter(
    (item) => submissionStatus(item) === 'needs_correction'
  ).length;
  const selected = submissions.find((item) => playerId(item) === state.selectedSubmissionId);
  return `
    <header class="boh-admin-stage-header">
      <div>
        <p class="boh-admin-eyebrow">${escapeHtml(state.tr('adminBohStageOne', 'STAGE 1 OF 5'))}</p>
        <h3>${escapeHtml(stageLabel(state, 'signups'))}</h3>
        <p>${escapeHtml(
          state.tr(
            'adminBohSignupsHelp',
            'Compare player-confirmed values with OCR warnings. Screenshots are not exposed here unless the store explicitly supplies a protected review URL.'
          )
        )}</p>
      </div>
    </header>
    <div class="boh-admin-summary-grid">
      ${summaryCard(submissions.length, state.tr('adminBohTotalSignups', 'Total signups'))}
      ${summaryCard(pending, state.tr('adminBohPendingReview', 'Pending review'), 'warning')}
      ${summaryCard(confirmed, state.tr('adminBohConfirmed', 'Confirmed'), 'success')}
      ${summaryCard(correction, state.tr('adminBohNeedsCorrection', 'Needs correction'), 'danger')}
    </div>
    ${renderEpicShowdownPreferenceSummary(state)}
    <form class="boh-admin-toolbar" data-form="signup-filter">
      <label>
        <span>${escapeHtml(state.tr('adminBohSearchPlayers', 'Search players'))}</span>
        <input class="boh-admin-input" name="search" type="search" value="${escapeHtml(
          state.signupSearch
        )}" autocomplete="off" placeholder="${escapeHtml(
          state.tr('adminBohSearchPlaceholder', 'Game name, server, or alliance')
        )}" />
      </label>
      <label>
        <span>${escapeHtml(state.tr('adminBohReviewStatus', 'Review status'))}</span>
        <select class="boh-admin-select" name="status">
          ${signupStatusOptions(state)}
        </select>
      </label>
      <label><span>${escapeHtml(state.tr('adminBohFightingTime', 'Fighting time'))}</span>
        <select class="boh-admin-select" name="fightingTime">
          <option value="all">${escapeHtml(state.tr('adminBohAll', 'All'))}</option>
          ${filterOptions.fightingTimes
            .map(
              (value) =>
                `<option value="${escapeHtml(value)}" ${state.signupFilters.fightingTime === value ? 'selected' : ''}>${escapeHtml(value)}</option>`
            )
            .join('')}
        </select></label>
      <label><span>${escapeHtml(state.tr('adminBohRolePreference', 'Role preference'))}</span>
        <select class="boh-admin-select" name="role">
          <option value="all">${escapeHtml(state.tr('adminBohAll', 'All'))}</option>
          ${filterOptions.roles
            .map(
              (value) =>
                `<option value="${escapeHtml(value)}" ${state.signupFilters.role === value ? 'selected' : ''}>${escapeHtml(adminChoiceLabel(state, value))}</option>`
            )
            .join('')}
        </select></label>
      <label><span>${escapeHtml(state.tr('adminBohTroopType', 'Troop type'))}</span>
        <select class="boh-admin-select" name="troopType">
          <option value="all">${escapeHtml(state.tr('adminBohAll', 'All'))}</option>
          ${filterOptions.troopTypes
            .map(
              (value) =>
                `<option value="${escapeHtml(value)}" ${state.signupFilters.troopType === value ? 'selected' : ''}>${escapeHtml(adminChoiceLabel(state, value))}</option>`
            )
            .join('')}
        </select></label>
      <label><span>${escapeHtml(state.tr('adminBohVtsMember', 'VTS member'))}</span>
        <select class="boh-admin-select" name="vtsMember">
          <option value="all">${escapeHtml(state.tr('adminBohAll', 'All'))}</option>
          <option value="true" ${state.signupFilters.vtsMember === 'true' ? 'selected' : ''}>${escapeHtml(state.tr('adminBohYes', 'Yes'))}</option>
          <option value="false" ${state.signupFilters.vtsMember === 'false' ? 'selected' : ''}>${escapeHtml(state.tr('adminBohNo', 'No'))}</option>
        </select></label>
      <label><span>${escapeHtml(state.tr('adminBohMinimumPower', 'Minimum total power'))}</span>
        <input class="boh-admin-input" type="number" min="0" name="minTotalPower" value="${escapeHtml(state.signupFilters.minTotalPower)}" /></label>
      <label><span>${escapeHtml(state.tr('adminBohMaximumPower', 'Maximum total power'))}</span>
        <input class="boh-admin-input" type="number" min="0" name="maxTotalPower" value="${escapeHtml(state.signupFilters.maxTotalPower)}" /></label>
      <button class="boh-admin-button" type="submit">${escapeHtml(
        state.tr('adminBohApplyFilters', 'Apply filters')
      )}</button>
    </form>
    <form class="boh-admin-toolbar boh-admin-batch-toolbar" data-form="batch-review" aria-busy="${state.pending}">
      <label><span>${escapeHtml(
        state.tr('adminBohBatchNote', 'Optional confirmation note')
      )}</span><input class="boh-admin-input" name="note" maxlength="2000" ${disabled} /></label>
      <button class="boh-admin-button boh-admin-button-primary" type="submit" ${
        selectedVisibleIds.length && !state.pending ? '' : 'disabled'
      }>${escapeHtml(
        state.tr('adminBohConfirmSelected', 'Confirm selected ({count})', {
          count: selectedVisibleIds.length,
        })
      )}</button>
      <button class="boh-admin-button boh-admin-button-danger" type="button" data-action="delete-selected-submissions" ${
        selectedVisibleIds.length && !state.pending ? '' : 'disabled'
      }>${escapeHtml(
        state.tr('adminBohDeleteSelected', 'Delete selected ({count})', {
          count: selectedVisibleIds.length,
        })
      )}</button>
      <button class="boh-admin-button" type="button" data-action="export-signups" ${
        visible.length && !state.pending ? '' : 'disabled'
      }>${escapeHtml(state.tr('adminBohExportCsv', 'Export visible CSV'))}</button>
    </form>
    <div class="boh-admin-review-layout">
      <div class="boh-admin-table-wrap" tabindex="0">
        <table class="boh-admin-table">
          <caption>${escapeHtml(
            state.tr('adminBohSignupCaption', '{shown} of {total} signups', {
              shown: visible.length,
              total: submissions.length,
            })
          )}</caption>
          <thead><tr>
            <th scope="col" class="boh-admin-col-sticky boh-admin-col-sticky-1"><label><span class="boh-admin-sr">${escapeHtml(
              state.tr('adminBohSelectAllVisible', 'Select all visible signups')
            )}</span><input class="boh-admin-selection-checkbox" type="checkbox" data-action="select-all-visible" ${
              allVisibleSelected ? 'checked' : ''
            } ${disabled} /></label></th>
            ${signupSortHeader(state, 'name', state.tr('adminBohPlayer', 'Player'), 'boh-admin-col-sticky boh-admin-col-sticky-2')}
            ${signupSortHeader(state, 'status', state.tr('adminBohReviewStatus', 'Review status'), 'boh-admin-col-sticky boh-admin-col-sticky-3')}
            <th scope="col" class="boh-admin-col-sticky boh-admin-col-sticky-4"><span class="boh-admin-sr">${escapeHtml(
              state.tr('adminBohActions', 'Actions')
            )}</span></th>
            ${signupSortHeader(state, 'power', state.tr('adminBohStatTotalPower', 'Total power'))}
            ${signupSortHeader(state, 'score', state.tr('adminBohFinalScore', 'Final score'))}
            <th scope="col">${escapeHtml(
              state.tr('adminBohPreferredTeammates', 'Preferred teammates')
            )}</th>
            <th scope="col">${escapeHtml(state.tr('adminBohSource', 'Capture'))}</th>
            ${signupSortHeader(state, 'updated', state.tr('adminBohUpdated', 'Updated'))}
          </tr></thead>
          <tbody>${visible.length ? visible.map((item) => renderSignupRow(state, item)).join('') : renderEmptyRow(state, 9, 'adminBohNoSignups', 'No signups match these filters.')}</tbody>
        </table>
      </div>
      ${selected ? renderSignupDetail(state, selected) : renderSignupEmptyDetail(state)}
    </div>`;
}

function signupStatusOptions(state) {
  const options = [
    ['all', 'adminBohAllStatuses', 'All statuses'],
    ['pending', 'adminBohStatusPending', 'Pending review'],
    ['confirmed', 'adminBohStatusConfirmed', 'Confirmed'],
    ['needs_correction', 'adminBohStatusCorrection', 'Needs correction'],
    ['excluded', 'adminBohStatusExcluded', 'Excluded'],
  ];
  return options
    .map(
      ([value, key, fallback]) =>
        `<option value="${value}" ${state.signupFilter === value ? 'selected' : ''}>${escapeHtml(
          state.tr(key, fallback)
        )}</option>`
    )
    .join('');
}

function renderSignupRow(state, submission) {
  const id = playerId(submission);
  const fields = adminSubmissionFields(submission);
  const status = submissionStatus(submission);
  const capture = adminSubmissionCapture(submission, {
    ocrLabel: state.tr('adminBohCaptureOcrConfirmed', 'OCR + confirmed'),
    manualLabel: state.tr('adminBohCaptureManual', 'Manual'),
  });
  const preferredTeammates = getAdminPreferredTeammateNames(fields.effective);
  return `<tr ${state.selectedSubmissionId === id ? 'data-selected="true"' : ''}>
    <td class="boh-admin-col-sticky boh-admin-col-sticky-1"><input class="boh-admin-selection-checkbox" type="checkbox" data-action="select-submission-row" data-player-id="${escapeHtml(
      id
    )}" aria-label="${escapeHtml(
      state.tr('adminBohSelectSignupNamed', 'Select {player}', {
        player: fields.effectiveName || id,
      })
    )}" ${state.selectedSubmissionIds.has(id) ? 'checked' : ''} ${state.pending ? 'disabled' : ''} /></td>
    <th scope="row" class="boh-admin-col-sticky boh-admin-col-sticky-2"><strong>${escapeHtml(fields.effectiveName || id || '—')}</strong>
      <small>${escapeHtml(cleanText(submission?.server || submission?.alliance))}</small></th>
    <td class="boh-admin-col-sticky boh-admin-col-sticky-3" data-label="${escapeHtml(state.tr('adminBohReviewStatus', 'Review status'))}"><span class="boh-admin-status-chip" data-status="${escapeHtml(status)}">${escapeHtml(
      statusLabel(state, status)
    )}</span></td>
    <td class="boh-admin-col-sticky boh-admin-col-sticky-4" data-label="${escapeHtml(state.tr('adminBohActions', 'Actions'))}"><button type="button" class="boh-admin-button boh-admin-button-small" data-action="select-submission" data-player-id="${escapeHtml(
      id
    )}">${escapeHtml(state.tr('adminBohReview', 'Review'))}</button></td>
    <td data-label="${escapeHtml(state.tr('adminBohStatTotalPower', 'Total power'))}">${escapeHtml(formatNumber(state, fields.totalPower))}</td>
    <td data-label="${escapeHtml(state.tr('adminBohFinalScore', 'Final score'))}">${escapeHtml(formatNumber(state, fields.score))}${renderScoreDiagnostic(
      state,
      submission?.scoreDiagnostic
    )}</td>
    <td class="boh-admin-preferred-teammates-cell" data-label="${escapeHtml(state.tr('adminBohPreferredTeammates', 'Preferred teammates'))}">${escapeHtml(
      preferredTeammates.join(', ') || '—'
    )}</td>
    <td data-label="${escapeHtml(state.tr('adminBohSource', 'Capture'))}">${escapeHtml(capture)}</td>
    <td data-label="${escapeHtml(state.tr('adminBohUpdated', 'Updated'))}">${escapeHtml(formatDate(state, submission?.updatedAt || submission?.submittedAt))}</td>
  </tr>`;
}

function renderEmptyRow(state, colspan, key, fallback) {
  return `<tr><td class="boh-admin-empty" colspan="${colspan}">${escapeHtml(
    state.tr(key, fallback)
  )}</td></tr>`;
}

function renderSignupEmptyDetail(state) {
  return `<aside class="boh-admin-detail boh-admin-detail-empty">
    <span aria-hidden="true">◎</span>
    <h4>${escapeHtml(state.tr('adminBohSelectSignup', 'Select a signup'))}</h4>
    <p>${escapeHtml(
      state.tr(
        'adminBohSelectSignupHelp',
        'Open a player to inspect confirmed values and OCR warnings.'
      )
    )}</p>
  </aside>`;
}

function statEntries(state, submission) {
  const source = submission?.confirmedStats || submission?.stats || {};
  return [
    ['totalCastlePower', 'adminBohStatTotalPower', 'Total power'],
    ['troopPower', 'adminBohStatTroopPower', 'Troop power'],
    ['buildingPower', 'adminBohStatBuildingPower', 'Building power'],
    ['technologyPower', 'adminBohStatTechnologyPower', 'Technology power'],
    ['heroCombatPower', 'adminBohStatHeroPower', 'Hero combat power'],
    ['dragonPower', 'adminBohStatDragonPower', 'Dragon power'],
    ['unitSpecialtyPower', 'adminBohStatUnitSpecialtyPower', 'Unit specialty power'],
    ['artifactPower', 'adminBohStatArtifactPower', 'Artifact power'],
    ['royalTechPower', 'adminBohStatRoyalTechPower', 'Royal Tech power'],
    ['rocLevel', 'adminBohStatRocLevel', 'RoC level'],
    ['level50HeroCount', 'adminBohStatLevel50Heroes', 'Level 50 hero count'],
  ].map(([key, translationKey, fallback]) => ({
    key,
    label: state.tr(translationKey, fallback),
    value:
      key === 'heroCombatPower'
        ? (source.heroCombatPower ?? source.heroPower)
        : key === 'totalCastlePower'
          ? (source.totalCastlePower ?? source.totalPower)
          : source[key],
  }));
}

function adminBooleanLabel(state, value) {
  if (value === true) return state.tr('adminBohYes', 'Yes');
  if (value === false) return state.tr('adminBohNo', 'No');
  return state.tr('adminBohNotProvided', 'Not provided');
}

function adminChoiceLabel(state, value) {
  const normalized = cleanText(value).toLocaleLowerCase();
  const choices = {
    all: ['adminBohChoiceAllAvailability', 'All phases'],
    most: ['adminBohChoiceMostAvailability', 'Most phases'],
    backup: ['adminBohChoiceBackup', 'Backup'],
    unavailable: ['adminBohChoiceUnavailable', 'Unavailable'],
    flexible: ['adminBohChoiceFlexible', 'Flexible'],
    offensive: ['adminBohChoiceOffensive', 'Offensive team'],
    rune: ['adminBohChoiceRune', 'Rune team'],
    top: ['adminBohChoiceTop', 'Top side'],
    bottom: ['adminBohChoiceBottom', 'Bottom side'],
    cavalry: ['adminBohChoiceCavalry', 'Cavalry'],
    archers: ['adminBohChoiceArchers', 'Archers'],
    footmen: ['adminBohChoiceFootmen', 'Footmen'],
    lionheart: ['adminBohChoiceLionheart', 'LionHeart'],
    'cao cao': ['adminBohChoiceCaoCao', 'Cao Cao'],
    'cao-cao': ['adminBohChoiceCaoCao', 'Cao Cao'],
    'al fatih': ['adminBohChoiceAlFatih', 'Al Fatih'],
    'al-fatih': ['adminBohChoiceAlFatih', 'Al Fatih'],
  };
  const choice = choices[normalized];
  return choice ? state.tr(choice[0], choice[1]) : cleanText(value);
}

function submissionDetailEntries(state, submission) {
  const stats = submission?.confirmedStats || submission?.stats || {};
  const commitment = submission?.commitment || {};
  const textOrFallback = (value) =>
    cleanText(value) || state.tr('adminBohNotProvided', 'Not provided');
  const arrayOrFallback = (value) =>
    list(value)
      .map((item) => adminChoiceLabel(state, item))
      .filter(Boolean)
      .join(', ') || state.tr('adminBohNotProvided', 'Not provided');
  return [
    [state.tr('adminBohKnownNames', 'Known names'), arrayOrFallback(submission?.knownNames)],
    [state.tr('adminBohLocale', 'Language / locale'), textOrFallback(submission?.locale)],
    [state.tr('adminBohEntryMethod', 'Entry method'), textOrFallback(submission?.entryMethod)],
    [
      state.tr('adminBohRolePreferences', 'Role preferences'),
      arrayOrFallback(submission?.rolePreferences),
    ],
    [
      state.tr('adminBohEligibleRoles', 'Eligible roles'),
      arrayOrFallback(submission?.eligibleRoleIds),
    ],
    [
      state.tr('adminBohSubmittedAt', 'Submitted at'),
      submission?.submittedAt || submission?.submittedAtMs
        ? formatDate(state, submission.submittedAt || submission.submittedAtMs)
        : state.tr('adminBohNotProvided', 'Not provided'),
    ],
    [
      state.tr('adminBohT9Types', 'T10 troop types'),
      arrayOrFallback(stats.t10TroopTypes?.length ? stats.t10TroopTypes : stats.t9TroopTypes),
    ],
    [
      state.tr('adminBohReadySpeedHeroes', 'Ready speed heroes'),
      arrayOrFallback(stats.readySpeedHeroes),
    ],
    [
      state.tr('adminBohTroopInventory', 'Troop estimates'),
      stats.troopRoster?.length
        ? `${stats.troopRoster.length} ${state.tr('adminBohTroopRows', 'reported groups')}`
        : state.tr('adminBohNotProvided', 'Not provided'),
    ],
    [state.tr('adminBohTimezone', 'Timezone'), textOrFallback(submission?.timezone)],
    [
      state.tr('adminBohAvailability', 'Availability'),
      commitment.availability
        ? adminChoiceLabel(state, commitment.availability)
        : textOrFallback(''),
    ],
    [state.tr('adminBohPlayerNotes', 'Player notes'), textOrFallback(commitment.notes)],
    [
      state.tr('adminBohVtsMember', 'Plays in VTS 1097'),
      commitment.vts1097Member == null
        ? state.tr('adminBohNotProvided', 'Not provided')
        : commitment.vts1097Member
          ? state.tr('adminBohYes', 'Yes')
          : state.tr('adminBohNo', 'No'),
    ],
    [
      state.tr('adminBohContactNumber', 'Viber / WhatsApp'),
      textOrFallback(commitment.contactNumber),
    ],
    [state.tr('adminBohCurrentState', 'Current state'), textOrFallback(commitment.currentState)],
    [state.tr('adminBohJoinReason', 'Why VTS'), textOrFallback(commitment.joinReason)],
  ];
}

function renderTroopInventory(state, submission) {
  const stats = submission?.confirmedStats || submission?.stats || {};
  const rows = list(stats.troopRoster).flatMap((entry) => {
    const estimate = /^estimate\|(lofty|enhanced-t10|t10|t9)\|(\d{1,10})$/u.exec(cleanText(entry));
    if (estimate) {
      const labels = {
        lofty: state.tr('adminBohTroopEstimateLofty', 'S (Lofty)'),
        'enhanced-t10': state.tr('adminBohTroopEstimateEnhancedT10', 'Enhanced T10'),
        t10: state.tr('adminBohTroopEstimateT10', 'Regular T10'),
        t9: state.tr('adminBohTroopEstimateT9', 'T9'),
      };
      return [
        {
          troopType: labels[estimate[1]],
          tier: '—',
          enhanced: '—',
          count: formatNumber(state, Number(estimate[2])),
        },
      ];
    }
    const match =
      /^(footmen|cavalry|archers)\|(SSS|SS|S|X|IX|VIII|VII|VI|V|IV|III|II|I)\|(normal|enhanced)\|(\d{1,10})$/u.exec(
        cleanText(entry)
      );
    if (!match) return [];
    return [
      {
        troopType: adminChoiceLabel(state, match[1]),
        tier: match[2],
        enhanced:
          match[3] === 'enhanced'
            ? state.tr('adminBohTroopEnhanced', 'Enhanced')
            : state.tr('adminBohTroopNormal', 'Normal'),
        count: formatNumber(state, Number(match[4])),
      },
    ];
  });
  if (!rows.length) return '';
  return `<section class="boh-admin-card" aria-labelledby="bohAdminTroopInventoryTitle">
    <header><div><span>${escapeHtml(
      state.tr('adminBohTroopInventoryKicker', 'REPORTED TROOPS')
    )}</span><h4 id="bohAdminTroopInventoryTitle">${escapeHtml(
      state.tr('adminBohTroopInventory', 'Troop estimates')
    )}</h4></div></header>
    <div class="boh-admin-table-wrap" tabindex="0">
      <table class="boh-admin-table">
        <thead><tr>
          <th>${escapeHtml(state.tr('adminBohTroopType', 'Troop type'))}</th>
          <th>${escapeHtml(state.tr('adminBohTroopTier', 'Tier'))}</th>
          <th>${escapeHtml(state.tr('adminBohTroopStatus', 'Status'))}</th>
          <th>${escapeHtml(state.tr('adminBohTroopCount', 'Count'))}</th>
        </tr></thead>
        <tbody>${rows
          .map(
            (row) =>
              `<tr><td>${escapeHtml(row.troopType)}</td><td>${escapeHtml(
                row.tier
              )}</td><td>${escapeHtml(row.enhanced)}</td><td>${escapeHtml(row.count)}</td></tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
  </section>`;
}

function heroGroupLabel(state, groupId) {
  if (groupId === 'cavalry') return state.tr('adminBohChoiceCavalry', 'Cavalry');
  if (groupId === 'archers') return state.tr('adminBohChoiceArchers', 'Archers');
  if (groupId === 'footmen') return state.tr('adminBohChoiceFootmen', 'Footmen');
  if (groupId === 'all') return state.tr('adminBohHeroGroupAll', 'All troop types');
  if (groupId === 'other') return state.tr('adminBohOtherHeroes', 'Other heroes');
  return '';
}

function renderPlanningChips(values, className = '') {
  return `<ul class="boh-admin-signal-chips ${escapeHtml(className)}">${values
    .map((value) => `<li>${escapeHtml(value)}</li>`)
    .join('')}</ul>`;
}

function renderSignupPlanningSignals(state, submission) {
  const signals = buildAdminSignupPlanningSignals(submission, state.options);
  if (!signals.hasSignals) return '';
  const heroGroups = signals.heroGroups
    .map((group) => {
      const label = heroGroupLabel(state, group.groupId);
      return `<section>
        ${label ? `<h6>${escapeHtml(label)}</h6>` : ''}
        ${renderPlanningChips(group.names, 'boh-admin-hero-chips')}
      </section>`;
    })
    .join('');
  const researchRows = signals.research
    .map((item) => {
      const valueLabel =
        item.progress === 100
          ? state.tr('adminBohMax', 'MAX')
          : `${formatNumber(state, item.progress)}%`;
      return `<li>
        <div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(valueLabel)}</strong></div>
        <progress value="${item.progress}" max="100" aria-label="${escapeHtml(
          `${item.label}: ${valueLabel}`
        )}">${item.progress}%</progress>
      </li>`;
    })
    .join('');
  return `<section class="boh-admin-planning-signal" aria-labelledby="bohAdminSignupPlanningTitle">
    <header>
      <h5 id="bohAdminSignupPlanningTitle">${escapeHtml(
        state.tr('adminBohSignupPlanningSignals', 'Signup planning signals')
      )}</h5>
      <span>${escapeHtml(state.tr('adminBohPlanningSignal', 'Planning signal only'))}</span>
    </header>
    <p>${escapeHtml(
      state.tr(
        'adminBohSignupPlanningSignalsHelp',
        'Preferences guide planning and never lock assignments. Only enabled scoring components affect scores.'
      )
    )}</p>
    <div class="boh-admin-signal-compact-grid">
      ${
        signals.preferredTeammates.length
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohPreferredTeammates', 'Preferred teammates')
            )}</h6>${renderPlanningChips(signals.preferredTeammates)}</section>`
          : ''
      }
      ${
        signals.primaryRole
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohPrimaryRole', 'Primary role')
            )}</h6>${renderPlanningChips([adminChoiceLabel(state, signals.primaryRole)])}</section>`
          : ''
      }
      ${
        signals.secondaryRole
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohSecondaryRole', 'Secondary role')
            )}</h6>${renderPlanningChips([adminChoiceLabel(state, signals.secondaryRole)])}</section>`
          : ''
      }
      ${
        signals.canHelpLead
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohLeadershipInterest', 'Leadership support')
            )}</h6>${renderPlanningChips([
              state.tr('adminBohLeadershipInterestYes', 'Willing to lead or help manage'),
            ])}</section>`
          : ''
      }
      ${
        signals.fightingTimeIds.length
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohFightingTimes', 'Preferred fighting times')
            )}</h6>${renderPlanningChips(signals.fightingTimeIds)}</section>`
          : ''
      }
      ${
        signals.teamNamePreferences.length
          ? `<section><h6>${escapeHtml(
              state.tr('adminBohTeamNamePreferences', 'Favorite team names')
            )}</h6>${renderPlanningChips(signals.teamNamePreferences)}</section>`
          : ''
      }
    </div>
    ${
      signals.usableHeroCount
        ? `<details class="boh-admin-signal-disclosure">
            <summary><span>${escapeHtml(
              state.tr('adminBohUsableHeroes', 'Usable heroes')
            )}</span><strong>${escapeHtml(
              state.tr('adminBohHeroCount', '{count} heroes', {
                count: signals.usableHeroCount,
              })
            )}</strong></summary>
            <div class="boh-admin-hero-groups">${heroGroups}</div>
          </details>`
        : ''
    }
    ${
      researchRows
        ? `<section class="boh-admin-research-progress">
            <h6>${escapeHtml(state.tr('adminBohResearchProgress', 'Research progress'))}</h6>
            <ul>${researchRows}</ul>
          </section>`
        : ''
    }
  </section>`;
}

function correctionDraftFor(state, playerIdValue) {
  return state.correctionDrafts?.get(cleanText(playerIdValue)) || null;
}

function correctionFieldValues(state, playerIdValue, name, fallback = []) {
  const draft = correctionDraftFor(state, playerIdValue);
  if (draft?.fields && hasOwn(draft.fields, name)) return list(draft.fields[name]).map(String);
  return (Array.isArray(fallback) ? fallback : [fallback]).map((value) => String(value ?? ''));
}

function correctionFieldValue(state, playerIdValue, name, fallback = '') {
  return correctionFieldValues(state, playerIdValue, name, fallback)[0] ?? '';
}

function correctionOption(value, label, selectedValue) {
  return `<option value="${escapeHtml(value)}" ${String(selectedValue) === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function correctionSelectOptions(state, values, currentValue, { includeBlank = true } = {}) {
  const normalized = uniqueTextList(values);
  const current = cleanText(currentValue);
  if (current && !normalized.includes(current)) normalized.push(current);
  return `${
    includeBlank
      ? correctionOption('', state.tr('adminBohNotProvided', 'Not provided'), current)
      : ''
  }${normalized
    .map((value) => correctionOption(value, adminChoiceLabel(state, value), current))
    .join('')}`;
}

function renderCorrectionCheckboxes(state, id, name, values, selectedValues, labelFor) {
  const selected = new Set(selectedValues.map(cleanText));
  const options = uniqueTextList([...values, ...selectedValues]);
  return `<div class="boh-admin-correction-check-grid">${options
    .map(
      (value) => `<label class="boh-admin-check-option"><input type="checkbox" name="${escapeHtml(
        name
      )}" value="${escapeHtml(value)}" ${selected.has(value) ? 'checked' : ''} />
        <span>${escapeHtml(labelFor?.(value) || adminChoiceLabel(state, value) || value)}</span></label>`
    )
    .join('')}</div>`;
}

function correctionHeroNames(state, selectedValues = []) {
  const catalog = planningMetadataEntries(
    state.options.heroMetadata || state.options.heroCatalog || state.options.catalogs?.heroes || []
  )
    .map((hero) => cleanText(hero?.name || hero?.label || hero?.id))
    .filter(Boolean);
  return uniqueTextList([...catalog, ...selectedValues]);
}

function correctionResearchEntries(state, current = {}) {
  const source =
    state.options.researchMetadata ||
    state.options.researchCatalog ||
    state.options.catalogs?.research ||
    [];
  const byId = new Map();
  for (const item of planningMetadataEntries(source, 'id')) {
    const id = cleanText(item?.id || item?.researchTreeId || item?.key);
    if (!id) continue;
    byId.set(id, cleanText(item?.label || item?.name) || id);
  }
  for (const id of Object.keys(current || {})) {
    if (!byId.has(id)) byId.set(id, id);
  }
  return [...byId].map(([id, label]) => ({ id, label }));
}

function parseCorrectionTroopRow(value) {
  const normalized = cleanText(value);
  const estimate = /^estimate\|(lofty|enhanced-t10|t10|t9)\|(\d{1,10})$/u.exec(normalized);
  if (estimate) {
    return {
      kind: 'estimate',
      estimateKind: estimate[1],
      troopType: 'cavalry',
      tier: 'X',
      mode: 'normal',
      count: estimate[2],
    };
  }
  const detailed =
    /^(footmen|cavalry|archers)\|(SSS|SS|S|X|IX|VIII|VII|VI|V|IV|III|II|I)\|(normal|enhanced)\|(\d{1,10})$/u.exec(
      normalized
    );
  return {
    kind: 'detailed',
    estimateKind: 'lofty',
    troopType: detailed?.[1] || 'cavalry',
    tier: detailed?.[2] || 'X',
    mode: detailed?.[3] || 'normal',
    count: detailed?.[4] || '',
  };
}

function correctionTroopRows(state, id, persistedRows) {
  const draft = correctionDraftFor(state, id);
  if (!draft?.fields || !hasOwn(draft.fields, 'correction.troop.kind')) {
    const rows = list(persistedRows).map(parseCorrectionTroopRow);
    return rows.length ? rows : [parseCorrectionTroopRow('')];
  }
  const field = (name) => list(draft.fields[name]).map(String);
  return field('correction.troop.kind').map((kind, index) => ({
    kind: kind === 'estimate' ? 'estimate' : 'detailed',
    estimateKind: field('correction.troop.estimateKind')[index] || 'lofty',
    troopType: field('correction.troop.type')[index] || 'cavalry',
    tier: field('correction.troop.tier')[index] || 'X',
    mode: field('correction.troop.mode')[index] || 'normal',
    count: field('correction.troop.count')[index] || '',
  }));
}

function renderCorrectionTroopRow(state, row) {
  const detailed = row.kind !== 'estimate';
  const tiers = ['SSS', 'SS', 'S', 'X', 'IX', 'VIII', 'VII', 'VI', 'V', 'IV', 'III', 'II', 'I'];
  const estimates = [
    ['lofty', state.tr('adminBohTroopEstimateLofty', 'S (Lofty)')],
    ['enhanced-t10', state.tr('adminBohTroopEstimateEnhancedT10', 'Enhanced T10')],
    ['t10', state.tr('adminBohTroopEstimateT10', 'Regular T10')],
    ['t9', state.tr('adminBohTroopEstimateT9', 'T9')],
  ];
  return `<div class="boh-admin-correction-troop-row" data-correction-troop-row>
    <label><span>${escapeHtml(state.tr('adminBohTroopRowKind', 'Row kind'))}</span><select class="boh-admin-select" name="correction.troop.kind" data-correction-troop-kind>
      ${correctionOption('detailed', state.tr('adminBohTroopDetailedRow', 'Troop type and tier'), row.kind)}
      ${correctionOption('estimate', state.tr('adminBohTroopEstimateRow', 'Aggregate estimate'), row.kind)}
    </select></label>
    <div class="boh-admin-correction-troop-fields" data-troop-fields="detailed" ${detailed ? '' : 'hidden'}>
      <label><span>${escapeHtml(state.tr('adminBohTroopType', 'Troop type'))}</span><select class="boh-admin-select" name="correction.troop.type">${CORRECTION_TROOP_TYPES.map(
        (value) => correctionOption(value, adminChoiceLabel(state, value), row.troopType)
      ).join('')}</select></label>
      <label><span>${escapeHtml(state.tr('adminBohTroopTier', 'Tier'))}</span><select class="boh-admin-select" name="correction.troop.tier">${tiers
        .map((value) => correctionOption(value, value, row.tier))
        .join('')}</select></label>
      <label><span>${escapeHtml(state.tr('adminBohTroopStatus', 'Status'))}</span><select class="boh-admin-select" name="correction.troop.mode">
        ${correctionOption('normal', state.tr('adminBohTroopNormal', 'Normal'), row.mode)}
        ${correctionOption('enhanced', state.tr('adminBohTroopEnhanced', 'Enhanced'), row.mode)}
      </select></label>
    </div>
    <div class="boh-admin-correction-troop-fields" data-troop-fields="estimate" ${detailed ? 'hidden' : ''}>
      <label><span>${escapeHtml(state.tr('adminBohTroopEstimateKind', 'Estimate kind'))}</span><select class="boh-admin-select" name="correction.troop.estimateKind">${estimates
        .map(([value, label]) => correctionOption(value, label, row.estimateKind))
        .join('')}</select></label>
    </div>
    <label><span>${escapeHtml(state.tr('adminBohTroopCount', 'Count'))}</span><input class="boh-admin-input" type="number" name="correction.troop.count" min="0" max="9999999999" step="1" value="${escapeHtml(
      row.count
    )}" /></label>
    <button type="button" class="boh-admin-icon-button" data-action="remove-correction-troop-row" aria-label="${escapeHtml(
      state.tr('adminBohRemoveTroopRow', 'Remove troop row')
    )}">&times;</button>
  </div>`;
}

function serializeCorrectionTroopRows(form) {
  return [...form.querySelectorAll('[data-correction-troop-row]')]
    .map((row) => {
      const kind = cleanText(row.querySelector('[name="correction.troop.kind"]')?.value);
      const count = cleanText(row.querySelector('[name="correction.troop.count"]')?.value);
      if (!count) return '';
      if (kind === 'estimate') {
        const estimateKind = cleanText(
          row.querySelector('[name="correction.troop.estimateKind"]')?.value
        );
        return `estimate|${estimateKind}|${count}`;
      }
      const troopType = cleanText(row.querySelector('[name="correction.troop.type"]')?.value);
      const tier = cleanText(row.querySelector('[name="correction.troop.tier"]')?.value);
      const mode = cleanText(row.querySelector('[name="correction.troop.mode"]')?.value);
      return `${troopType}|${tier}|${mode}|${count}`;
    })
    .filter(Boolean);
}

function renderCorrectionBooleanSelect(state, id, field, value, label) {
  const name = `correction.commitment.${field}`;
  const current = correctionFieldValue(state, id, name, value == null ? '' : String(value));
  return `<label><span>${escapeHtml(label)}</span>
    <select class="boh-admin-select" name="${escapeHtml(name)}">
      ${correctionOption('', state.tr('adminBohNotProvided', 'Not provided'), current)}
      ${correctionOption('true', state.tr('adminBohYes', 'Yes'), current)}
      ${correctionOption('false', state.tr('adminBohNo', 'No'), current)}
    </select></label>`;
}

function renderFullCorrectionEditor(state, submission, effective) {
  const id = playerId(submission);
  const review = submission?.review || {};
  const stats = effective?.stats || {};
  const commitment = effective?.commitment || {};
  const draft = correctionDraftFor(state, id);
  const value = (name, fallback = '') => correctionFieldValue(state, id, name, fallback);
  const values = (name, fallback = []) => correctionFieldValues(state, id, name, fallback);
  const reason = value(
    'correction.reason',
    review?.submissionCorrection?.reason ||
      Object.values(review?.statCorrections || {})
        .map((item) => cleanText(item?.reason))
        .find(Boolean) ||
      review?.gameNameCorrection?.reason ||
      ''
  );
  const numericalLabels = new Map([
    ...statEntries(state, effective).map(({ key, label }) => [key, label]),
    ['level50HeroCount', state.tr('adminBohStatLevel50Heroes', 'Level 50 hero count')],
  ]);
  const numericFields = FULL_CORRECTION_STAT_KEYS.map((key) => {
    const name = `correction.stats.${key}`;
    const currentValue = value(name, stats[key] ?? '');
    const maximum = CORRECTION_NUMBER_LIMITS[key];
    if (OPTIONAL_POWER_KEYS.includes(key)) {
      const modeName = `${name}.mode`;
      const mode = value(modeName, stats[key] == null ? 'clear' : 'value');
      return `<div class="boh-admin-correction-number boh-admin-correction-number-optional">
        <label><span>${escapeHtml(numericalLabels.get(key) || key)}</span>
          <select class="boh-admin-select" name="${escapeHtml(modeName)}" data-correction-optional-mode="${escapeHtml(
            key
          )}">
            ${correctionOption('value', state.tr('adminBohCorrectionUseValue', 'Use value'), mode)}
            ${correctionOption('clear', state.tr('adminBohCorrectionClearValue', 'Clear value'), mode)}
          </select></label>
        <label><span class="boh-admin-sr">${escapeHtml(
          state.tr('adminBohCorrectionNumericValue', 'Corrected numeric value')
        )}</span><input class="boh-admin-input" type="number" name="${escapeHtml(
          name
        )}" min="0" max="${maximum}" step="1" value="${escapeHtml(currentValue)}" /></label>
      </div>`;
    }
    return `<label><span>${escapeHtml(numericalLabels.get(key) || key)}</span>
      <input class="boh-admin-input" type="number" name="${escapeHtml(
        name
      )}" min="0" max="${maximum}" step="1" value="${escapeHtml(
        currentValue === '' ? 0 : currentValue
      )}" required /></label>`;
  }).join('');
  const t9Values = values('correction.stats.t9TroopTypes', stats.t9TroopTypes || []);
  const t10Values = values('correction.stats.t10TroopTypes', stats.t10TroopTypes || []);
  const speedValues = values('correction.stats.readySpeedHeroes', stats.readySpeedHeroes || []);
  const heroValues = values('correction.stats.usableHeroNames', stats.usableHeroNames || []);
  const heroNames = correctionHeroNames(state, heroValues);
  const troopRows = correctionTroopRows(state, id, stats.troopRoster || []);
  const researchEntries = correctionResearchEntries(state, stats.researchProgressPct || {});
  const fightingValues = values(
    'correction.commitment.fightingTimeIds',
    commitment.fightingTimeIds || []
  );
  const teamValues = values(
    'correction.commitment.teamNamePreferences',
    commitment.teamNamePreferences || []
  );
  const preferredRole = value(
    'correction.commitment.preferredRole',
    commitment.preferredRole || ''
  );
  const secondaryRole = value(
    'correction.commitment.secondaryRole',
    commitment.secondaryRole || ''
  );
  const availability = value('correction.commitment.availability', commitment.availability || '');
  const teammateValues = values(
    'correction.preferredTeammates',
    effective?.preferredTeammates || []
  );
  while (teammateValues.length < BohModel.BOH_MAX_PREFERRED_TEAMMATES) teammateValues.push('');

  return `<section class="boh-admin-card boh-admin-correction-card" aria-labelledby="bohAdminCorrectionsTitle">
    <details open>
      <summary><span><strong id="bohAdminCorrectionsTitle">${escapeHtml(
        state.tr('adminBohFullCorrectionTitle', 'Full player-data corrections')
      )}</strong><small>${escapeHtml(
        `${state.tr('adminBohAdminCorrections', 'Admin corrections')} — ${state.tr(
          'adminBohFullCorrectionHelp',
          'Edit effective player data without changing the original submission or its evidence.'
        )}`
      )}</small></span><span class="boh-admin-correction-dirty" ${draft ? '' : 'hidden'}>${escapeHtml(
        state.tr('adminBohUnsavedCorrection', 'Unsaved draft')
      )}</span></summary>
      <form class="boh-admin-stack boh-admin-correction-form" data-form="submission-corrections" novalidate>
        <input type="hidden" name="playerId" value="${escapeHtml(id)}" />
        <fieldset class="boh-admin-correction-section"><legend>${escapeHtml(
          state.tr('adminBohCorrectionIdentity', 'Identity and account details')
        )}</legend>
          <div class="boh-admin-correction-grid">
            <label><span>${escapeHtml(
              state.tr('adminBohCorrectedPlayerName', 'Corrected player name')
            )}</span><small>${escapeHtml(
              state.tr('adminBohOriginalValue', 'Original: {value}', {
                value: originalCorrectionSubmission(submission).gameName || id,
              })
            )}</small><input class="boh-admin-input" name="correction.gameName" maxlength="160" value="${escapeHtml(
              value('correction.gameName', playerName(effective) || id)
            )}" required /></label>
            <label><span>${escapeHtml(
              state.tr('adminBohLocale', 'Language / locale')
            )}</span><input class="boh-admin-input" name="correction.locale" maxlength="20" value="${escapeHtml(
              value('correction.locale', effective?.locale || '')
            )}" /></label>
            <label><span>${escapeHtml(
              state.tr('adminBohTimezone', 'Timezone')
            )}</span><input class="boh-admin-input" name="correction.timezone" maxlength="80" value="${escapeHtml(
              value('correction.timezone', effective?.timezone || '')
            )}" /></label>
          </div>
          <div><span class="boh-admin-field-label">${escapeHtml(
            state.tr('adminBohPreferredTeammates', 'Preferred teammates')
          )}</span><div class="boh-admin-teammate-correction-grid">${teammateValues
            .slice(0, BohModel.BOH_MAX_PREFERRED_TEAMMATES)
            .map(
              (teammate, index) =>
                `<label><span>${escapeHtml(
                  state.tr('adminBohPreferredTeammateNumber', 'Teammate {number}', {
                    number: index + 1,
                  })
                )}</span><input class="boh-admin-input" name="correction.preferredTeammates" maxlength="160" value="${escapeHtml(
                  teammate
                )}" /></label>`
            )
            .join('')}</div></div>
        </fieldset>

        <fieldset class="boh-admin-correction-section"><legend>${escapeHtml(
          state.tr('adminBohCorrectionNumericStats', 'Power and numeric stats')
        )}</legend><div class="boh-admin-correction-grid">${numericFields}</div></fieldset>

        <fieldset class="boh-admin-correction-section"><legend>${escapeHtml(
          state.tr('adminBohCorrectionStructuredStats', 'Troops, heroes, and research')
        )}</legend>
          <div class="boh-admin-correction-choice-columns">
            <section><h6>${escapeHtml(state.tr('adminBohT9Types', 'T9 troop types'))}</h6>${renderCorrectionCheckboxes(
              state,
              id,
              'correction.stats.t9TroopTypes',
              CORRECTION_TROOP_TYPES,
              t9Values
            )}</section>
            <section><h6>${escapeHtml(state.tr('adminBohT10Types', 'T10 troop types'))}</h6>${renderCorrectionCheckboxes(
              state,
              id,
              'correction.stats.t10TroopTypes',
              CORRECTION_TROOP_TYPES,
              t10Values
            )}</section>
            <section><h6>${escapeHtml(
              state.tr('adminBohReadySpeedHeroes', 'Ready speed heroes')
            )}</h6>${renderCorrectionCheckboxes(
              state,
              id,
              'correction.stats.readySpeedHeroes',
              CORRECTION_SPEED_HEROES,
              speedValues
            )}</section>
          </div>
          <section class="boh-admin-correction-subsection"><header><div><h6>${escapeHtml(
            state.tr('adminBohTroopInventory', 'Troop roster rows')
          )}</h6><small>${escapeHtml(
            state.tr(
              'adminBohTroopRowHelp',
              'Choose the row kind, troop details, and count. Encoded storage values are handled automatically.'
            )
          )}</small></div><button type="button" class="boh-admin-button boh-admin-button-small" data-action="add-correction-troop-row">${escapeHtml(
            state.tr('adminBohAddTroopRow', 'Add row')
          )}</button></header><div data-correction-troop-rows>${troopRows
            .slice(0, 60)
            .map((row) => renderCorrectionTroopRow(state, row))
            .join('')}</div></section>
          <section class="boh-admin-correction-subsection"><h6>${escapeHtml(
            state.tr('adminBohUsableHeroes', 'Usable heroes')
          )}</h6><input class="boh-admin-input" type="search" data-action="filter-correction-heroes" placeholder="${escapeHtml(
            state.tr('adminBohSearchHeroes', 'Search heroes')
          )}" /><select class="boh-admin-select boh-admin-correction-multiselect" name="correction.stats.usableHeroNames" multiple size="8" aria-label="${escapeHtml(
            state.tr('adminBohUsableHeroes', 'Usable heroes')
          )}">${heroNames
            .map(
              (hero) =>
                `<option value="${escapeHtml(hero)}" ${heroValues.includes(hero) ? 'selected' : ''}>${escapeHtml(
                  hero
                )}</option>`
            )
            .join('')}</select></section>
          <section class="boh-admin-correction-subsection"><h6>${escapeHtml(
            state.tr('adminBohResearchProgress', 'Research progress')
          )}</h6><div class="boh-admin-research-correction-grid">${researchEntries
            .map((entry, index) => {
              const fieldName = `correction.stats.research.${index}`;
              return `<label><span>${escapeHtml(entry.label)}</span><input class="boh-admin-input" type="number" min="0" max="100" step="1" name="${escapeHtml(
                fieldName
              )}" data-research-id="${escapeHtml(entry.id)}" value="${escapeHtml(
                value(fieldName, stats.researchProgressPct?.[entry.id] ?? '')
              )}" /></label>`;
            })
            .join('')}</div></section>
        </fieldset>

        <fieldset class="boh-admin-correction-section"><legend>${escapeHtml(
          state.tr('adminBohCorrectionCommitment', 'Availability and commitment')
        )}</legend>
          <div class="boh-admin-correction-grid">
            <label><span>${escapeHtml(
              state.tr('adminBohAvailability', 'Availability')
            )}</span><select class="boh-admin-select" name="correction.commitment.availability">${correctionSelectOptions(
              state,
              BohModel.BOH_AVAILABILITY_VALUES,
              availability
            )}</select></label>
            <label><span>${escapeHtml(
              state.tr('adminBohPrimaryRole', 'Primary role')
            )}</span><select class="boh-admin-select" name="correction.commitment.preferredRole">${correctionSelectOptions(
              state,
              BohModel.BOH_PREFERRED_ROLES,
              preferredRole
            )}</select></label>
            <label><span>${escapeHtml(
              state.tr('adminBohSecondaryRole', 'Secondary role')
            )}</span><select class="boh-admin-select" name="correction.commitment.secondaryRole">${correctionSelectOptions(
              state,
              BohModel.BOH_PREFERRED_ROLES,
              secondaryRole
            )}</select></label>
            ${renderCorrectionBooleanSelect(
              state,
              id,
              'canHelpLead',
              commitment.canHelpLead,
              state.tr('adminBohLeadershipInterest', 'Can help lead')
            )}
            ${renderCorrectionBooleanSelect(
              state,
              id,
              'vts1097Member',
              commitment.vts1097Member,
              state.tr('adminBohVtsMember', 'Plays in VTS 1097')
            )}
            ${renderCorrectionBooleanSelect(
              state,
              id,
              'canTeleport',
              commitment.canTeleport,
              state.tr('adminBohCanTeleport', 'Can teleport')
            )}
            ${renderCorrectionBooleanSelect(
              state,
              id,
              'canUseVoice',
              commitment.canUseVoice,
              state.tr('adminBohCanUseVoice', 'Can use voice chat')
            )}
            ${renderCorrectionBooleanSelect(
              state,
              id,
              'planCommitment',
              commitment.planCommitment,
              state.tr('adminBohPlanCommitment', 'Will follow the team plan')
            )}
          </div>
          <div class="boh-admin-correction-choice-columns">
            <section><h6>${escapeHtml(
              state.tr('adminBohFightingTimes', 'Preferred fighting times')
            )}</h6>${renderCorrectionCheckboxes(
              state,
              id,
              'correction.commitment.fightingTimeIds',
              BohModel.BOH_FIGHTING_TIME_IDS,
              fightingValues,
              (time) => time
            )}</section>
            <section><h6>${escapeHtml(
              state.tr('adminBohTeamNamePreferences', 'Favorite team names')
            )}</h6>${renderCorrectionCheckboxes(
              state,
              id,
              'correction.commitment.teamNamePreferences',
              BohModel.BOH_TEAM_NAME_PREFERENCES,
              teamValues,
              (teamId) => TEAM_NAME_LABELS[teamId] || teamId
            )}</section>
          </div>
          <div class="boh-admin-correction-grid">
            ${Object.entries(CORRECTION_COMMITMENT_TEXT_LIMITS)
              .map(([field, maxLength]) => {
                const labels = {
                  unavailableTimes: state.tr('adminBohUnavailableTimes', 'Unavailable times'),
                  contactNumber: state.tr('adminBohContactNumber', 'Viber / WhatsApp'),
                  currentState: state.tr('adminBohCurrentState', 'Current state'),
                  joinReason: state.tr('adminBohJoinReason', 'Why VTS'),
                  notes: state.tr('adminBohPlayerNotes', 'Player notes'),
                };
                const fieldName = `correction.commitment.${field}`;
                const fieldValue = value(fieldName, commitment[field] || '');
                return `<label class="${['joinReason', 'notes'].includes(field) ? 'boh-admin-correction-wide' : ''}"><span>${escapeHtml(
                  labels[field]
                )}</span>${
                  ['unavailableTimes', 'joinReason', 'notes'].includes(field)
                    ? `<textarea class="boh-admin-textarea" name="${escapeHtml(
                        fieldName
                      )}" maxlength="${maxLength}" rows="3">${escapeHtml(fieldValue)}</textarea>`
                    : `<input class="boh-admin-input" name="${escapeHtml(
                        fieldName
                      )}" maxlength="${maxLength}" value="${escapeHtml(fieldValue)}" />`
                }</label>`;
              })
              .join('')}
          </div>
        </fieldset>

        <label><span>${escapeHtml(
          state.tr('adminBohCorrectionReason', 'Correction reason')
        )}</span><textarea class="boh-admin-textarea" name="correction.reason" rows="3" maxlength="500" aria-describedby="bohAdminCorrectionReasonHelp">${escapeHtml(
          reason
        )}</textarea><small id="bohAdminCorrectionReasonHelp">${escapeHtml(
          state.tr(
            'adminBohCorrectionReasonHelp',
            'Required when any corrected value differs from the original submission (maximum 500 characters).'
          )
        )}</small></label>
        <div class="boh-admin-correction-actions"><button class="boh-admin-button boh-admin-button-primary" type="submit">${escapeHtml(
          state.tr('adminBohSaveCorrections', 'Save corrections')
        )}</button><button class="boh-admin-button" type="button" data-action="discard-correction-draft" ${
          draft ? '' : 'disabled'
        }>${escapeHtml(state.tr('adminBohDiscardCorrections', 'Discard unsaved draft'))}</button></div>
      </form>
    </details>
  </section>`;
}

function renderSignupDetail(state, submission) {
  const id = playerId(submission);
  const warnings = list(submission?.ocr?.warnings || submission?.ocrWarnings);
  const review = submission?.review || {};
  const effective = effectiveAdminSubmission(submission, review);
  const reviewStatus = cleanText(submission?.reviewStatus).toLocaleLowerCase() || 'pending';
  const reviewMatchesSubmission = adapterReviewMatchesSubmissionRevision(submission, review);
  const selected = (value) => (reviewStatus === value ? ' selected' : '');
  return `<aside class="boh-admin-detail" aria-labelledby="bohSignupDetailTitle">
    <header>
      <div><span>${escapeHtml(state.tr('adminBohAccountSubmission', 'PLAYER SUBMISSION'))}</span>
      <h4 id="bohSignupDetailTitle" tabindex="-1">${escapeHtml(playerName(effective) || id)}</h4></div>
      <button type="button" class="boh-admin-icon-button" data-action="close-submission" aria-label="${escapeHtml(
        state.tr('adminBohCloseReview', 'Close signup review')
      )}">×</button>
    </header>
    ${renderScoreDiagnostic(state, submission?.scoreDiagnostic)}
    <dl class="boh-admin-stat-grid">
      ${statEntries(state, effective)
        .map(
          ({ label, value }) =>
            `<div><dt>${escapeHtml(label)}</dt><dd>${
              value === undefined || value === null || value === ''
                ? '—'
                : escapeHtml(formatNumber(state, value))
            }</dd></div>`
        )
        .join('')}
    </dl>
    ${renderFullCorrectionEditor(state, submission, effective)}
    <dl class="boh-admin-stat-grid">
      ${submissionDetailEntries(state, effective)
        .map(
          ([label, value]) =>
            `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
        )
        .join('')}
    </dl>
    ${renderTroopInventory(state, effective)}
    ${renderSignupPlanningSignals(state, effective)}
    <section class="boh-admin-warning-box" data-empty="${warnings.length === 0}">
      <h5>${escapeHtml(state.tr('adminBohOcrWarnings', 'OCR review notes'))}</h5>
      ${
        warnings.length
          ? `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning?.message || warning)}</li>`).join('')}</ul>`
          : `<p>${escapeHtml(state.tr('adminBohNoOcrWarnings', 'No OCR warnings were reported.'))}</p>`
      }
    </section>
    <form class="boh-admin-stack" data-form="review-submission">
      <input type="hidden" name="playerId" value="${escapeHtml(id)}" />
      <label><span>${escapeHtml(state.tr('adminBohDecision', 'Decision'))}</span>
        <select class="boh-admin-select" name="status" required>
          <option value="pending"${selected('pending')}>${escapeHtml(state.tr('adminBohPendingReview', 'Pending review'))}</option>
          <option value="confirmed"${selected('confirmed')}>${escapeHtml(state.tr('adminBohConfirmValues', 'Confirm values'))}</option>
          <option value="needs_correction"${selected('needs_correction')}>${escapeHtml(state.tr('adminBohRequestCorrection', 'Request correction'))}</option>
          <option value="excluded"${selected('excluded')}>${escapeHtml(state.tr('adminBohExcludeSignup', 'Exclude from selection'))}</option>
        </select>
      </label>
      <label><span>${escapeHtml(
        state.tr('adminBohPlayerFeedback', 'Player-facing feedback')
      )}</span>
        <textarea class="boh-admin-textarea" name="note" rows="3" maxlength="500" placeholder="${escapeHtml(
          state.tr(
            'adminBohPlayerFeedbackPlaceholder',
            'Explain any correction or exclusion. The player can read this message.'
          )
        )}">${escapeHtml(reviewMatchesSubmission ? review.note || '' : '')}</textarea>
      </label>
      <label><span>${escapeHtml(
        state.tr('adminBohInternalReviewNote', 'Private leadership note')
      )}</span>
        <textarea class="boh-admin-textarea" name="internalNote" rows="3" maxlength="2000" placeholder="${escapeHtml(
          state.tr(
            'adminBohInternalReviewNotePlaceholder',
            'Optional internal context. Players never receive this note.'
          )
        )}">${escapeHtml(review.internalNote || '')}</textarea>
      </label>
      <label><span>${escapeHtml(
        state.tr('adminBohAdminUsefulness', 'Leadership usefulness rating')
      )}</span>
        <input class="boh-admin-input" type="number" name="adminUsefulnessRating" min="0" max="100" step="0.1"
          value="${escapeHtml(reviewMatchesSubmission ? (review?.adjustments?.bohUsefulRating ?? '') : '')}" />
        <small>${escapeHtml(
          state.tr(
            'adminBohAdminUsefulnessHelp',
            'Admin-only 0–100 judgment. It is audited in this review and never accepted from player signup data.'
          )
        )}</small>
      </label>
      <button class="boh-admin-button boh-admin-button-primary" type="submit">${escapeHtml(
        state.tr('adminBohSaveReview', 'Save review')
      )}</button>
    </form>
    <section class="boh-admin-card">
      <h5>${escapeHtml(state.tr('adminBohDeleteSignup', 'Delete signup'))}</h5>
      <p>${escapeHtml(
        state.tr(
          'adminBohDeleteSignupHelp',
          'Permanently remove this signup, its review, and player feedback. Epic Showdown preferences are kept.'
        )
      )}</p>
      <button class="boh-admin-button boh-admin-button-danger" type="button" data-action="delete-submission" data-player-id="${escapeHtml(
        id
      )}">${escapeHtml(state.tr('adminBohDeleteSignupButton', 'Delete this signup'))}</button>
    </section>
  </aside>`;
}

function activeWeight(version, key) {
  const value =
    key === 'heroCombatPower'
      ? (version?.weights?.heroCombatPower ?? version?.weights?.heroPower)
      : version?.weights?.[key];
  return finiteNumber(value, defaultWeights()[key]);
}

function renderScoring(state) {
  const version = scoringVersion(state.snapshot);
  const players = currentPlayers(state).filter((player) =>
    ['confirmed', 'approved'].includes(submissionStatus(player))
  );
  const versions = state.snapshot.scoring.versions;
  const showsCommitmentDoubleCountWarning =
    finiteNumber(activeWeight(version, 'bohUsefulRating')) !== 0;
  return `
    <header class="boh-admin-stage-header">
      <div><p class="boh-admin-eyebrow">${escapeHtml(state.tr('adminBohStageTwo', 'STAGE 2 OF 5'))}</p>
        <h3>${escapeHtml(stageLabel(state, 'scoring'))}</h3>
        <p>${escapeHtml(
          state.tr(
            'adminBohCommitmentScoringIntro',
            'Formula changes create auditable versions. Leadership commitment/usefulness ratings are additive, batch-saved, and reasoned.'
          )
        )}</p></div>
      <div class="boh-admin-version-badge"><span>${escapeHtml(
        state.tr('adminBohActiveVersion', 'Active version')
      )}</span><strong>${escapeHtml(
        cleanText(version?.label || version?.id) || state.tr('adminBohDraft', 'Draft')
      )}</strong></div>
    </header>
    <div class="boh-admin-two-column">
      <form class="boh-admin-card boh-admin-stack" data-form="scoring-version">
        <header><div><p class="boh-admin-card-kicker">${escapeHtml(
          state.tr('adminBohFormulaBuilder', 'FORMULA BUILDER')
        )}</p><h4>${escapeHtml(state.tr('adminBohNewWeightVersion', 'Create scoring version'))}</h4></div></header>
        <div class="boh-admin-weight-grid">
          ${SCORE_COMPONENTS.map(
            ([key, translationKey, fallback]) => `<label>
              <span>${escapeHtml(state.tr(translationKey, fallback))}</span>
              <input class="boh-admin-input" type="number" name="weight.${key}" step="any"
                value="${escapeHtml(activeWeight(version, key))}" required />
            </label>`
          ).join('')}
        </div>
        <label><span>${escapeHtml(state.tr('adminBohVersionLabel', 'Version label'))}</span>
          <input class="boh-admin-input" name="label" maxlength="80" required placeholder="${escapeHtml(
            state.tr('adminBohVersionLabelPlaceholder', 'Example: 2026 selection v2')
          )}" />
        </label>
        <label><span>${escapeHtml(state.tr('adminBohChangeNote', 'Change note'))}</span>
          <textarea class="boh-admin-textarea" name="note" rows="3" maxlength="500" required></textarea>
        </label>
        <button class="boh-admin-button boh-admin-button-primary" type="submit">${escapeHtml(
          state.tr('adminBohSaveNewVersion', 'Save as new version')
        )}</button>
      </form>
      ${
        showsCommitmentDoubleCountWarning
          ? `<p class="boh-admin-template-warning" role="note">${escapeHtml(
              state.tr(
                'adminBohCommitmentDoubleCountWarning',
                'Commitment adjustments are a separate subjective input and may double-count judgment when BoH usefulness has weight.'
              )
            )}</p>`
          : ''
      }
      <section class="boh-admin-card" aria-labelledby="bohScoreOverrideTitle">
        <header><div><p class="boh-admin-card-kicker">${escapeHtml(
          state.tr('adminBohManualJudgment', 'MANUAL JUDGMENT')
        )}</p><h4 id="bohScoreOverrideTitle">${escapeHtml(
          `${state.tr('adminBohScoreOverride', 'Player score override')} — ${state.tr(
            'adminBohLegacyReadOnly',
            'legacy, read-only'
          )}`
        )}</h4><p>${escapeHtml(
          state.tr(
            'adminBohLegacyOverrideHelp',
            'Existing exact score replacements remain visible in the audit table. New leadership ratings are additive and are edited there.'
          )
        )}</p></div></header>
        <div class="boh-admin-version-list">
          <h5>${escapeHtml(state.tr('adminBohVersionHistory', 'Version history'))}</h5>
          ${
            versions.length
              ? `<ol>${versions
                  .map(
                    (
                      item
                    ) => `<li><strong>${escapeHtml(cleanText(item?.label || item?.id))}</strong>
                      <span>${escapeHtml(formatDate(state, item?.createdAt))}</span></li>`
                  )
                  .join('')}</ol>`
              : `<p class="boh-admin-muted">${escapeHtml(
                  state.tr('adminBohNoVersions', 'No saved scoring versions yet.')
                )}</p>`
          }
        </div>
      </section>
    </div>
    ${renderScoreBreakdown(state, players, version)}`;
}

function playerBreakdown(state, player) {
  const breakdown = player?.scoreBreakdown || player?.score?.breakdown || player?.breakdown || {};
  return SCORE_COMPONENTS.map(([key, translationKey, fallback]) => {
    const value =
      key === 'heroCombatPower'
        ? (breakdown.heroCombatPower ?? breakdown.heroPower)
        : key === 't9TroopType'
          ? (breakdown.t9TroopType ?? breakdown.t9Type)
          : key === 'readySpeedHero'
            ? (breakdown.readySpeedHero ?? breakdown.speedHero)
            : key === 'bohUsefulRating'
              ? (breakdown.bohUsefulRating ?? breakdown.bohUseful)
              : breakdown[key];
    return {
      key,
      label: state.tr(translationKey, fallback),
      value: finiteNumber(value?.points ?? value),
    };
  });
}

function scoreBreakdownText(state, player) {
  return playerBreakdown(state, player)
    .filter((item) => item.value)
    .map((item) => `${item.label}: ${formatNumber(state, item.value)}`)
    .join(' · ');
}

function scoreAuditSortHeader(state, key, label) {
  const active = state.scoreAuditSort.key === key;
  const direction = active ? state.scoreAuditSort.direction : '';
  const ariaSort = active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';
  const indicator = active ? (direction === 'asc' ? '↑' : '↓') : '';
  return `<th scope="col" aria-sort="${ariaSort}"><button type="button" class="boh-admin-button boh-admin-button-quiet boh-admin-sort-button" data-action="score-audit-sort" data-sort-key="${key}">${escapeHtml(
    label
  )}<span class="boh-admin-sort-indicator" aria-hidden="true">${indicator}</span></button></th>`;
}

function commitmentScoreDraftValue(state, player) {
  const id = cleanText(player?.playerId);
  if (hasOwn(state.commitmentScoreDraft?.scores, id)) {
    return state.commitmentScoreDraft.scores[id];
  }
  return player?.commitmentScore === undefined || player?.commitmentScore === null
    ? ''
    : String(player.commitmentScore);
}

function applyCommitmentScoreBatch(state, form) {
  if (!form) return 0;
  const mode = cleanText(form.querySelector('[name="commitmentBatchMode"]')?.value) || 'set';
  const amount = integer(form.querySelector('[name="commitmentBatchValue"]')?.value);
  const inputs = [...form.querySelectorAll('[data-commitment-score-player]')];
  if (mode !== 'clear' && (amount < 1 || amount > 10000)) {
    setStatus(
      state,
      state.tr('adminBohCommitmentBatchInvalid', 'Use a batch value from 1 to 10,000.'),
      'error'
    );
    return 0;
  }
  for (const input of inputs) {
    if (mode === 'clear') {
      input.value = '';
    } else if (mode === 'add') {
      const next = clamp(integer(input.value) + amount, 1, 10000);
      input.value = String(next);
    } else {
      input.value = String(amount);
    }
    input.setCustomValidity?.('');
    input.removeAttribute?.('aria-invalid');
  }
  captureCommitmentScoreDraft(state, form);
  setStatus(
    state,
    state.tr(
      'adminBohCommitmentBatchApplied',
      'Batch commitment values updated. Review, then save manual scores.'
    ),
    'success'
  );
  return inputs.length;
}

function scoreDiagnosticLabel(state, code) {
  const labels = {
    calculation_failed: [
      'adminBohScoreDiagnosticCalculationFailed',
      'Fresh score calculation failed',
    ],
    stale_submission: [
      'adminBohScoreDiagnosticStaleSubmission',
      'Stored score belongs to an older submission',
    ],
    stale_profile: ['adminBohScoreDiagnosticStaleProfile', 'Stored score uses another profile'],
    stored_mismatch: [
      'adminBohScoreDiagnosticMismatch',
      'Stored score differs from fresh calculation',
    ],
    unverifiable: ['adminBohScoreDiagnosticUnverifiable', 'Stored score cannot be verified'],
  };
  const [key, fallback] = labels[code] || ['', ''];
  return key ? state.tr(key, fallback) : '';
}

function renderScoreDiagnostic(state, code) {
  const normalizedCode = cleanText(code);
  const label = scoreDiagnosticLabel(state, normalizedCode);
  return label
    ? `<small class="boh-admin-score-diagnostic" data-score-diagnostic="${escapeHtml(
        normalizedCode
      )}">${escapeHtml(label)}</small>`
    : '';
}

function renderScoreBreakdown(state, players, version) {
  const sortedPlayers = sortAdminScoreBreakdownRows(players, state.scoreAuditSort, {
    locale: state.locale,
    breakdownText: (player) => scoreBreakdownText(state, player),
  });
  const ratedCount = players.filter(
    (player) => player.commitmentScore !== null && player.commitmentScore !== undefined
  ).length;
  return `<section class="boh-admin-card boh-admin-score-table" aria-labelledby="bohScoreBreakdownTitle">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohScoreAudit', 'SCORE AUDIT')
    )}</p><h4 id="bohScoreBreakdownTitle">${escapeHtml(
      state.tr('adminBohPlayerBreakdown', 'Player scoring breakdown')
    )}</h4></div><span>${escapeHtml(
      cleanText(version?.label || version?.id) || state.tr('adminBohDraft', 'Draft')
    )}</span><strong class="boh-admin-score-completeness">${escapeHtml(
      state.tr('adminBohCommitmentScoreCompleteness', '{rated} of {total} players rated', {
        rated: ratedCount,
        total: players.length,
      })
    )}</strong></header>
    <form class="boh-admin-stack" data-form="commitment-scores" novalidate>
      <div class="boh-admin-commitment-score-toolbar">
        <p>${escapeHtml(
          state.tr(
            'adminBohCommitmentScoreHelp',
            'Add 1–10,000 commitment/usefulness points to the calculated score. Score-based balancing uses the final total; Total Power balancing is unaffected. Blank removes a rating.'
          )
        )}</p>
        <label><span>${escapeHtml(
          state.tr('adminBohCommitmentScoreNote', 'Shared audit note for changed ratings')
        )}</span><input class="boh-admin-input" name="reason" maxlength="2000" value="${escapeHtml(
          state.commitmentScoreDraft?.reason || ''
        )}" placeholder="${escapeHtml(
          state.tr('adminBohCommitmentScoreDefaultReason', 'Commitment/usefulness assessment')
        )}" /></label>
        <div class="boh-admin-commitment-batch" aria-label="${escapeHtml(
          state.tr('adminBohCommitmentBatch', 'Batch commitment adjustment')
        )}">
          <label><span>${escapeHtml(
            state.tr('adminBohCommitmentBatchMode', 'Batch mode')
          )}</span><select class="boh-admin-input" name="commitmentBatchMode">
            <option value="set">${escapeHtml(state.tr('adminBohCommitmentBatchSet', 'Set to'))}</option>
            <option value="add">${escapeHtml(state.tr('adminBohCommitmentBatchAdd', 'Add on'))}</option>
            <option value="clear">${escapeHtml(state.tr('adminBohCommitmentBatchClear', 'Clear'))}</option>
          </select></label>
          <label><span>${escapeHtml(
            state.tr('adminBohCommitmentBatchValue', 'Value')
          )}</span><input class="boh-admin-input" name="commitmentBatchValue" type="number" min="1" max="10000" step="1" inputmode="numeric" placeholder="1-10000" /></label>
          <button class="boh-admin-button" type="button" data-action="apply-commitment-batch">${escapeHtml(
            state.tr('adminBohCommitmentBatchApply', 'Apply to visible rows')
          )}</button>
        </div>
        <button class="boh-admin-button boh-admin-button-primary" type="submit">${escapeHtml(
          state.tr('adminBohSaveCommitmentScores', 'Save manual scores')
        )}</button>
      </div>
    <div class="boh-admin-table-wrap" tabindex="0"><table class="boh-admin-table">
      <thead><tr>${scoreAuditSortHeader(state, 'player', state.tr('adminBohPlayer', 'Player'))}
        ${scoreAuditSortHeader(state, 'totalPower', state.tr('adminBohStatTotalPower', 'Total power'))}
        ${scoreAuditSortHeader(state, 'calculated', state.tr('adminBohCalculated', 'Calculated'))}
        ${scoreAuditSortHeader(state, 'override', state.tr('adminBohLegacyFinalOverride', 'Legacy final override'))}
        ${scoreAuditSortHeader(state, 'commitment', state.tr('adminBohCommitmentScore', 'Commitment'))}
        ${scoreAuditSortHeader(state, 'finalScore', state.tr('adminBohFinalScore', 'Final score'))}
        ${scoreAuditSortHeader(state, 'breakdown', state.tr('adminBohBreakdown', 'Breakdown / diagnostic'))}</tr></thead>
      <tbody>${
        sortedPlayers.length
          ? sortedPlayers
              .map((player) => {
                const breakdown = scoreBreakdownText(state, player);
                const totalPower = scoreAuditTotalPower(player);
                return `<tr><th scope="row">${escapeHtml(player.displayName || player.playerId)}</th>
                  <td>${
                    totalPower === null ? '—' : escapeHtml(formatNumber(state, totalPower))
                  }</td>
                  <td>${escapeHtml(formatNumber(state, player?.calculatedScore ?? scoreValue(player)))}</td>
                  <td class="boh-admin-legacy-override">${
                    player?.overrideScore === undefined || player?.overrideScore === null
                      ? '—'
                      : `<strong>${escapeHtml(
                          formatNumber(state, player.overrideScore)
                        )}</strong><small>${escapeHtml(
                          state.tr('adminBohLegacyOverrideWarning', 'Legacy exact replacement')
                        )}</small>`
                  }</td>
                  <td><label class="boh-admin-score-input"><span class="boh-admin-sr">${escapeHtml(
                    state.tr('adminBohCommitmentScoreForPlayer', 'Commitment score for {player}', {
                      player: player.displayName || player.playerId,
                    })
                  )}</span><input class="boh-admin-input" type="number" min="1" max="10000" step="1" inputmode="numeric" data-commitment-score-player="${escapeHtml(
                    player.playerId
                  )}" value="${escapeHtml(commitmentScoreDraftValue(state, player))}" aria-label="${escapeHtml(
                    state.tr('adminBohCommitmentScoreForPlayer', 'Commitment score for {player}', {
                      player: player.displayName || player.playerId,
                    })
                  )}" /></label></td>
                  <td><strong>${escapeHtml(formatNumber(state, scoreValue(player)))}</strong></td>
                  <td class="boh-admin-breakdown-cell"><span>${escapeHtml(
                    breakdown || '—'
                  )}</span>${renderScoreDiagnostic(state, player.scoreDiagnostic)}</td></tr>`;
              })
              .join('')
          : renderEmptyRow(
              state,
              7,
              'adminBohNoConfirmedScores',
              'Confirm signup records to calculate scores.'
            )
      }</tbody>
    </table></div>
    </form>
  </section>`;
}

function teamScore(state, team) {
  return team.seats.reduce(
    (total, seat) => total + scoreValue(playerById(state, seat.playerId)),
    0
  );
}

function playerTotalPower(player) {
  return finiteNumber(
    player?.totalCastlePower ??
      player?.stats?.totalCastlePower ??
      player?.confirmedStats?.totalCastlePower
  );
}

function teamPower(state, team) {
  return team.seats.reduce(
    (total, seat) => total + playerTotalPower(playerById(state, seat.playerId)),
    0
  );
}

function snapshotTeamCount(state) {
  return normalizeTeamCount(state.snapshot.event?.teamCount ?? state.snapshot.teams.length);
}

function snapshotFieldSize(state) {
  return snapshotTeamCount(state) * ROSTER_SIZE;
}

function teamBalance(state) {
  const scoreTotals = state.snapshot.teams.map((team) => teamScore(state, team));
  const powerTotals = state.snapshot.teams.map((team) => teamPower(state, team));
  const assigned = state.snapshot.teams
    .flatMap((team) => team.seats)
    .filter((seat) => seat.playerId).length;
  const scoreAverage =
    scoreTotals.reduce((sum, score) => sum + score, 0) / Math.max(1, scoreTotals.length);
  const powerAverage =
    powerTotals.reduce((sum, power) => sum + power, 0) / Math.max(1, powerTotals.length);
  return {
    scoreTotals,
    powerTotals,
    assigned,
    scoreAverage,
    powerAverage,
    scoreSpread: Math.max(...scoreTotals, 0) - Math.min(...scoreTotals, 0),
    powerSpread: Math.max(...powerTotals, 0) - Math.min(...powerTotals, 0),
  };
}

function teamBuilderCandidates(state) {
  return currentPlayers(state)
    .filter((player) => ['confirmed', 'approved'].includes(submissionStatus(player)))
    .sort(
      (left, right) =>
        scoreValue(right) - scoreValue(left) || playerName(left).localeCompare(playerName(right))
    );
}

function selectedTeamBuilderIds(state, candidates) {
  const candidateIds = new Set(candidates.map((player) => player.playerId));
  const explicit = list(state.snapshot.eligiblePlayerIds).filter((id) => candidateIds.has(id));
  if (explicit.length) return explicit;
  return candidates.slice(0, snapshotFieldSize(state)).map((player) => player.playerId);
}

function eligiblePoolHintLabels(state, player) {
  const signals = buildAdminSignupPlanningSignals(player, state.options);
  const hints = [];
  if (cleanText(player.locale)) {
    hints.push(`${state.tr('adminBohLocale', 'Language / locale')}: ${cleanText(player.locale)}`);
  }
  if (signals.primaryRole) {
    hints.push(
      `${state.tr('adminBohPrimaryRole', 'Primary role')}: ${adminChoiceLabel(
        state,
        signals.primaryRole
      )}`
    );
  }
  if (signals.secondaryRole) {
    hints.push(
      `${state.tr('adminBohSecondaryRole', 'Secondary role')}: ${adminChoiceLabel(
        state,
        signals.secondaryRole
      )}`
    );
  }
  if (signals.canHelpLead) {
    hints.push(state.tr('adminBohLeadershipInterestYes', 'Willing to lead or help manage'));
  }
  if (signals.fightingTimeIds.length) hints.push(signals.fightingTimeIds.join(' / '));
  if (signals.usableHeroCount) {
    hints.push(state.tr('adminBohHeroCount', '{count} heroes', { count: signals.usableHeroCount }));
  }
  return hints;
}

function renderEligiblePoolPlanningHints(state, player) {
  const hints = eligiblePoolHintLabels(state, player);
  if (!hints.length) return '';
  return `<small class="boh-admin-eligible-hints">${hints
    .map((hint) => `<span>${escapeHtml(hint)}</span>`)
    .join('')}</small>`;
}

function renderEligiblePool(state, candidates, selectedIds) {
  const selected = new Set(selectedIds);
  const fieldSize = snapshotFieldSize(state);
  const detailsOpen = selected.size === fieldSize ? '' : ' open';
  return `<details class="boh-admin-card boh-admin-eligible-pool"${detailsOpen}>
    <summary><strong>${escapeHtml(
      state.tr('adminBohEligiblePool', 'Eligible player pool')
    )}</strong> <span data-eligible-pool-count>${selected.size} / ${fieldSize}</span></summary>
    <p>${escapeHtml(
      state.tr(
        'adminBohEligiblePoolHelp',
        'Choose exactly {count} current, verified signups. Only this saved pool is used by balancing and direct seat assignment.',
        { count: fieldSize }
      )
    )}</p>
    <form class="boh-admin-stack" data-form="eligible-pool" data-eligible-field-size="${fieldSize}">
      <div class="boh-admin-eligible-toolbar">
        <label><span>${escapeHtml(
          state.tr('adminBohEligiblePoolSearch', 'Search eligible players')
        )}</span><input class="boh-admin-input" type="search" data-action="eligible-pool-search" placeholder="${escapeHtml(
          state.tr('adminBohEligiblePoolSearchPlaceholder', 'Name, role, time, language...')
        )}" autocomplete="off" /></label>
        <label><span>${escapeHtml(
          state.tr('adminBohEligiblePoolFilter', 'Show')
        )}</span><select class="boh-admin-input" data-action="eligible-pool-filter">
          <option value="all">${escapeHtml(state.tr('adminBohEligiblePoolFilterAll', 'All players'))}</option>
          <option value="selected">${escapeHtml(
            state.tr('adminBohEligiblePoolFilterSelected', 'Selected only')
          )}</option>
          <option value="unselected">${escapeHtml(
            state.tr('adminBohEligiblePoolFilterUnselected', 'Unselected only')
          )}</option>
        </select></label>
        <div class="boh-admin-eligible-actions">
          <button type="button" class="boh-admin-button boh-admin-button-small" data-action="select-highest-eligible">${escapeHtml(
            state.tr('adminBohSelectHighestEligible', 'Select highest {count}', {
              count: fieldSize,
            })
          )}</button>
          <small data-eligible-pool-search-count></small>
        </div>
      </div>
      <div class="boh-admin-repeat-list boh-admin-eligible-grid">
        ${candidates
          .map((player) => {
            const hints = eligiblePoolHintLabels(state, player);
            const searchText = [
              playerName(player),
              player.playerId,
              formatNumber(state, scoreValue(player)),
              ...hints,
            ].join(' ');
            return `<label class="boh-admin-confirm" data-eligible-pool-row data-search="${escapeHtml(
              searchText
            )}">
              <input type="checkbox" name="playerId" data-action="eligible-pool-player" value="${escapeHtml(player.playerId)}" ${
                selected.has(player.playerId) ? 'checked' : ''
              } />
              <span class="boh-admin-eligible-player">
                <span>${escapeHtml(playerName(player) || player.playerId)} · ${escapeHtml(
                  formatNumber(state, scoreValue(player))
                )}</span>
                ${renderEligiblePoolPlanningHints(state, player)}
              </span>
            </label>`;
          })
          .join('')}
      </div>
      <button class="boh-admin-button boh-admin-button-primary" type="submit" data-eligible-pool-save>${escapeHtml(
        state.tr('adminBohSaveEligiblePool', 'Save eligible field')
      )}</button>
    </form>
  </details>`;
}

function renderDirectAssignment(state, candidates, selectedIds) {
  const selected = new Set(selectedIds);
  const selectedCandidates = candidates.filter((player) => selected.has(player.playerId));
  return `<form class="boh-admin-card boh-admin-stack" data-form="direct-assignment">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohDirectAssignment', 'DIRECT ASSIGNMENT')
    )}</p><h4>${escapeHtml(
      state.tr('adminBohAssignReplaceRemove', 'Assign, replace, or remove a seat')
    )}</h4></div></header>
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohDestinationSeat', 'Destination seat'))}</span>
        <select class="boh-admin-select" name="targetSeat" required>
          <option value="">${escapeHtml(state.tr('adminBohSelectSeat', 'Select seat'))}</option>
          ${state.snapshot.teams
            .flatMap((team) =>
              team.seats.map(
                (seat) =>
                  `<option value="${escapeHtml(`${team.id}|${seat.seatNumber}`)}" ${
                    seat.locked ? 'disabled' : ''
                  }>${escapeHtml(teamDisplayName(state, team))} · ${escapeHtml(
                    state.tr('adminBohSeatNumber', 'Seat {number}', { number: seat.seatNumber })
                  )} · ${escapeHtml(seat.displayName || state.tr('adminBohEmptySeat', 'Empty'))}</option>`
              )
            )
            .join('')}
        </select>
      </label>
      <label><span>${escapeHtml(state.tr('adminBohPlayer', 'Player'))}</span>
        <select class="boh-admin-select" name="playerId">
          <option value="">${escapeHtml(state.tr('adminBohRemoveFromSeat', 'Remove from seat'))}</option>
          ${selectedCandidates
            .map(
              (player) =>
                `<option value="${escapeHtml(player.playerId)}">${escapeHtml(
                  playerName(player) || player.playerId
                )}</option>`
            )
            .join('')}
        </select>
      </label>
    </div>
    <button class="boh-admin-button" type="submit">${escapeHtml(
      state.tr('adminBohApplyAssignment', 'Apply seat change')
    )}</button>
  </form>`;
}

function renderTeamBuilderSettings(state, candidates, selectedIds) {
  const selected = new Set(selectedIds);
  const selectedCandidates = candidates.filter((player) => selected.has(player.playerId));
  const forced = new Map(
    list(state.snapshot.forcedTeamAssignments).map((assignment) => [
      cleanText(assignment?.playerId),
      cleanText(assignment?.teamId),
    ])
  );
  const teamCount = snapshotTeamCount(state);
  const balanceMetric = normalizeBalanceMetric(state.snapshot.event?.balanceMetric);
  return `<details class="boh-admin-card boh-admin-balance-config">
    <summary><span><span class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohBalanceConfiguration', 'BALANCE CONFIGURATION')
    )}</span><strong>${escapeHtml(
      state.tr('adminBohTeamCountAndMetric', 'Team count, metric, and exact-team placements')
    )}</strong></span></summary>
    <form class="boh-admin-stack" data-form="team-builder-settings">
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohTeamCount', 'Team count'))}</span>
        <select class="boh-admin-select" name="teamCount">${Array.from(
          { length: TEAM_COUNT - MIN_TEAM_COUNT + 1 },
          (_, index) => index + MIN_TEAM_COUNT
        )
          .map(
            (count) =>
              `<option value="${count}" ${count === teamCount ? 'selected' : ''}>${count} x ${ROSTER_SIZE}</option>`
          )
          .join('')}</select></label>
      <label><span>${escapeHtml(state.tr('adminBohBalanceMetric', 'Balance metric'))}</span>
        <select class="boh-admin-select" name="balanceMetric">
          <option value="score" ${balanceMetric === 'score' ? 'selected' : ''}>${escapeHtml(
            state.tr('adminBohScoringPoints', 'Scoring points')
          )}</option>
          <option value="totalPower" ${balanceMetric === 'totalPower' ? 'selected' : ''}>${escapeHtml(
            state.tr('adminBohTotalGamePower', 'Total in-game power')
          )}</option>
          <option value="balanced" ${balanceMetric === 'balanced' ? 'selected' : ''}>${escapeHtml(
            state.tr('adminBohBalancedScorePower', 'Balanced score + power')
          )}</option>
        </select></label>
    </div>
    <p>${escapeHtml(
      state.tr(
        'adminBohTeamSettingsHelp',
        'Save configuration separately. Changing it never changes the saved eligible player IDs.'
      )
    )}</p>
    <div class="boh-admin-repeat-list">
      ${selectedCandidates
        .map(
          (player) => `<label class="boh-admin-confirm"><span>${escapeHtml(
            playerName(player) || player.playerId
          )}</span><select class="boh-admin-select" name="forcedTeam.${escapeHtml(player.playerId)}">
            <option value="">${escapeHtml(state.tr('adminBohAnyTeam', 'Any team'))}</option>
            ${state.snapshot.teams
              .map(
                (team) =>
                  `<option value="${escapeHtml(team.id)}" ${forced.get(player.playerId) === team.id ? 'selected' : ''}>${escapeHtml(teamDisplayName(state, team))}</option>`
              )
              .join('')}
          </select></label>`
        )
        .join('')}
    </div>
    <button class="boh-admin-button" type="submit">${escapeHtml(
      state.tr('adminBohSaveBalanceConfiguration', 'Save balance configuration')
    )}</button>
    </form>
  </details>`;
}

function renderBalancePreview(state) {
  const preview = state.snapshot.balancePreview;
  if (!preview) {
    return `<section class="boh-admin-card"><p>${escapeHtml(
      state.tr(
        'adminBohNoBalancePreview',
        'Create a preview to compare both team totals before applying.'
      )
    )}</p></section>`;
  }
  const activeLabel = balanceMetricLabel(state, preview.balanceMetric);
  const activeMetric = normalizeBalanceMetric(preview.balanceMetric);
  return `<section class="boh-admin-card" aria-labelledby="bohBalancePreviewTitle">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohBalancePreview', 'BALANCE PREVIEW')
    )}</p><h4 id="bohBalancePreviewTitle">${escapeHtml(
      state.tr('adminBohActiveBalanceMetric', 'Active metric: {metric}', { metric: activeLabel })
    )}</h4></div></header>
    <div class="boh-admin-summary-grid">
      ${summaryCard(formatNumber(state, preview.scoreSpread), state.tr('adminBohScoreSpread', 'Score spread'))}
      ${summaryCard(formatNumber(state, preview.powerSpread), state.tr('adminBohPowerSpread', 'Power spread'))}
      ${
        activeMetric === 'balanced'
          ? ''
          : summaryCard(
              formatNumber(state, preview.balanceSpread),
              state.tr('adminBohActiveSpread', 'Active metric spread')
            )
      }
    </div>
    <div class="boh-admin-table-wrap" tabindex="0"><table class="boh-admin-table">
      <thead><tr><th scope="col">${escapeHtml(state.tr('adminBohTeam', 'Team'))}</th>
        <th scope="col">${escapeHtml(
          state.tr('adminBohScoreComparison', 'Current -> proposed scoring points')
        )}</th>
        <th scope="col">${escapeHtml(
          state.tr('adminBohPowerComparison', 'Current -> proposed total power')
        )}</th>
        <th scope="col">${escapeHtml(state.tr('adminBohProposedRoster', 'Proposed roster'))}</th></tr></thead>
      <tbody>${list(preview.teams)
        .map((team) => {
          const current = state.snapshot.teams.find((candidate) => candidate.id === team.id);
          const currentScore = current ? teamScore(state, current) : 0;
          const currentPower = current ? teamPower(state, current) : 0;
          return `<tr><th scope="row">${escapeHtml(team.name)}</th><td>${escapeHtml(
            `${formatNumber(state, currentScore)} -> ${formatNumber(state, team.scoreTotal)}`
          )}</td><td>${escapeHtml(
            `${formatNumber(state, currentPower)} -> ${formatNumber(state, team.totalCastlePower)}`
          )}</td><td>${escapeHtml(
            list(team.seats)
              .filter((seat) => seat.playerId)
              .map((seat) => seat.displayName || seat.playerId)
              .join(', ')
          )}</td></tr>`;
        })
        .join('')}</tbody>
    </table></div>
  </section>`;
}

function renderMapperExactViewPreview(state, preview, rows) {
  if (!preview) return '';
  const stateLabel = preview.savedToDraft
    ? state.tr(
        'adminBohMapperSavedState',
        'Saved to draft - not published. Unresolved names remain below for reconciliation.'
      )
    : state.tr('adminBohMapperPreviewState', 'Preview only - not saved or published.');
  const saveAction = preview.savedToDraft
    ? `<p>${escapeHtml(
        state.tr(
          'adminBohMapperContinueEditing',
          'Continue with the team and plan editors, then publish explicitly when ready.'
        )
      )}</p>`
    : `<p>${escapeHtml(
        state.tr(
          'adminBohMapperSaveWarning',
          'Saving replaces the six draft team documents. Publishing remains a separate explicit action.'
        )
      )}</p>
      <button type='button' class='boh-admin-button boh-admin-button-primary' data-action='save-mapper-import'>${escapeHtml(
        state.tr('adminBohMapperSaveDraft', 'Save import to draft')
      )}</button>`;
  return `<div class='boh-admin-mapper-summary' role='status'><strong>${escapeHtml(
    state.tr('adminBohMapperLinkedCount', '{matched} of {total} names linked', {
      matched: preview.matchedCount,
      total: preview.playerCount,
    })
  )}</strong><span>${escapeHtml(
    state.tr('adminBohMapperUnresolvedCount', '{count} unresolved', {
      count: preview.unresolvedCount,
    })
  )}</span>
    <span>${escapeHtml(stateLabel)}</span></div>
    <div class='boh-admin-table-wrap' tabindex='0'><table class='boh-admin-table'>
      <thead><tr><th>${escapeHtml(state.tr('adminBohTeam', 'Team'))}</th><th>${escapeHtml(
        state.tr('adminBohPlayer', 'Player')
      )}</th><th>${escapeHtml(state.tr('adminBohTroopStatus', 'Status'))}</th></tr></thead>
      <tbody>${
        rows ||
        `<tr><td colspan='3'>${escapeHtml(
          state.tr(
            'adminBohMapperAllLinked',
            'All imported names have unique fresh verified matches.'
          )
        )}</td></tr>`
      }</tbody></table></div>
    <footer class='boh-admin-mapper-actions'>${saveAction}</footer>`;
}

function renderMapperExactViewCard(state, preview, rows) {
  return `<section class='boh-admin-card boh-admin-stack boh-admin-mapper-import' aria-labelledby='bohMapperImportTitle'>
    <header><div><p class='boh-admin-card-kicker'>${escapeHtml(
      state.tr('adminBohMapperKicker', 'MAPPER EXACT VIEW')
    )}</p>
      <h4 id='bohMapperImportTitle'>${escapeHtml(
        state.tr('adminBohMapperTitle', 'Preview mapper team import')
      )}</h4>
      <p>${escapeHtml(
        state.tr(
          'adminBohMapperDescription',
          'Choose an exact-view JSON backup to reconcile its 6 teams and 72 names against fresh verified submissions. Previewing does not save or publish anything.'
        )
      )}</p></div>
      <label class='boh-admin-button boh-admin-button-import'>${escapeHtml(
        state.tr('adminBohMapperChooseFile', 'Choose mapper JSON')
      )}
        <input class='sr-only' type='file' accept='.json,application/json' data-action='preview-mapper-import' />
      </label></header>${renderMapperExactViewPreview(state, preview, rows)}
  </section>`;
}

function mapperImportIssueMessage(state, issue) {
  if (issue?.code === 'boh-mapper-match-ambiguous') {
    return state.tr(
      'adminBohMapperAmbiguous',
      '{name} matches multiple fresh verified submissions.',
      { name: issue.displayName }
    );
  }
  if (issue?.code === 'boh-mapper-match-duplicate-use') {
    return state.tr(
      'adminBohMapperDuplicateMatch',
      'One fresh verified submission would be reused for multiple imported seats.'
    );
  }
  return state.tr(
    'adminBohMapperUnmatched',
    '{name} has no exact fresh verified submission match.',
    { name: issue?.displayName || '' }
  );
}

function renderMapperReconciliationSelect(state, preview, team, player) {
  const used = new Set(
    preview.teams
      .flatMap((item) => item.players)
      .filter((item) => item !== player && item.playerId)
      .map((item) => item.playerId)
  );
  const candidates = [player.linkedCandidate, ...list(preview.candidates)]
    .filter((candidate) => candidate?.playerId)
    .filter(
      (candidate, index, items) =>
        items.findIndex((item) => item.playerId === candidate.playerId) === index &&
        (candidate.playerId === player.playerId || !used.has(candidate.playerId))
    );
  return `<label class="boh-admin-mapper-reconcile"><span class="sr-only">${escapeHtml(
    state.tr('adminBohMapperChooseVerified', 'Choose a fresh verified signup for {name}', {
      name: player.displayName,
    })
  )}</span><select class="boh-admin-select" data-action="reconcile-mapper-player"
    data-team-id="${escapeHtml(team.id)}" data-seat-number="${player.seatNumber}">
    <option value="">${escapeHtml(
      state.tr('adminBohMapperLeaveUnresolved', 'Leave unresolved')
    )}</option>
    ${candidates
      .map(
        (candidate) =>
          `<option value="${escapeHtml(candidate.playerId)}" ${
            candidate.playerId === player.playerId ? 'selected' : ''
          }>${escapeHtml(candidate.displayName)} - ${escapeHtml(
            state.tr('adminBohScore', 'Score')
          )} ${escapeHtml(formatNumber(state, candidate.score))}</option>`
      )
      .join('')}
  </select></label>`;
}

function renderMapperExactViewImport(state) {
  const preview = state.mapperImportPreview;
  const rows = list(preview?.teams)
    .flatMap((team) =>
      list(team.players)
        .filter((player) => player.matchSource !== 'exact')
        .map((player) => {
          const issue = list(preview?.diagnostics).find(
            (item) => item.teamId === team.id && item.seatNumber === player.seatNumber
          );
          const estimate =
            !player.playerId &&
            Boolean(cleanText(player.displayName)) &&
            Number.isFinite(Number(player.score)) &&
            finiteNumber(player.score) > 0
              ? `<small>${escapeHtml(
                  state.tr('adminBohMapperRoughEstimate', 'Mapper rough/manual estimate: {score}', {
                    score: formatNumber(state, player.score),
                  })
                )}</small>`
              : '';
          return `<tr><td>${escapeHtml(
            state.tr('adminBohMapperSeat', '{team} - Seat {seat}', {
              team: team.name,
              seat: player.seatNumber,
            })
          )}</td>
            <td><strong>${escapeHtml(player.displayName)}</strong>${estimate}</td><td>
              <span>${escapeHtml(
                player.matchSource === 'manual'
                  ? state.tr('adminBohMapperManualMatch', 'Manually linked')
                  : issue
                    ? mapperImportIssueMessage(state, issue)
                    : state.tr('adminBohMapperUnresolved', 'Unresolved')
              )}</span>
              ${renderMapperReconciliationSelect(state, preview, team, player)}
            </td></tr>`;
        })
    )
    .join('');
  return renderMapperExactViewCard(state, preview, rows);
}

function renderApprovedRosterImport(state) {
  const report = state.approvedRosterImportReport;
  const warnings = list(report?.warnings);
  return `<section class="boh-admin-card boh-admin-stack" aria-labelledby="bohApprovedRosterImportTitle">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohApprovedRosterImportKicker', 'APPROVED ROSTER')
    )}</p><h4 id="bohApprovedRosterImportTitle">${escapeHtml(
      state.tr('adminBohApprovedRosterImportTitle', 'Import approved team seats')
    )}</h4><p>${escapeHtml(
      state.tr(
        'adminBohApprovedRosterImportHelp',
        'Choose the approved CSV. Team order maps to Teams 1–6 and row order within each team maps to seats 1–12. Exact verified signup-name matches receive personal plans; every approved name remains visible on the public roster.'
      )
    )}</p></div>
    <label class="boh-admin-button boh-admin-button-primary">
      ${escapeHtml(state.tr('adminBohChooseApprovedRosterCsv', 'Choose approved CSV'))}
      <input class="sr-only" type="file" accept=".csv,text/csv" data-action="import-approved-roster" />
    </label></header>
    ${
      report
        ? `<p><strong>${escapeHtml(
            state.tr(
              'adminBohApprovedRosterMatched',
              '{matched} of {total} names matched verified signups.',
              {
                matched: report.matchedCount,
                total: report.totalCount,
              }
            )
          )}</strong></p>`
        : ''
    }
    ${
      warnings.length
        ? `<div class="boh-admin-callout boh-admin-callout-warning" role="alert">
            <strong>${escapeHtml(
              state.tr('adminBohApprovedRosterWarnings', 'Identity warnings ({count})', {
                count: warnings.length,
              })
            )}</strong>
            <ul>${warnings
              .map((warning) => {
                const location =
                  warning.teamName && warning.seatNumber
                    ? `${warning.teamName} · ${state.tr('adminBohSeatNumber', 'Seat {number}', {
                        number: warning.seatNumber,
                      })}: `
                    : '';
                const reason =
                  warning.code === 'ambiguous'
                    ? state.tr(
                        'adminBohApprovedRosterAmbiguous',
                        'matches multiple verified signups'
                      )
                    : warning.code === 'duplicate-match'
                      ? state.tr(
                          'adminBohApprovedRosterDuplicate',
                          'would reuse one signup for multiple seats'
                        )
                      : state.tr(
                          'adminBohApprovedRosterUnmatched',
                          'has no exact verified signup match'
                        );
                return `<li>${escapeHtml(`${location}${warning.name} — ${reason}`)}</li>`;
              })
              .join('')}</ul>
          </div>`
        : ''
    }
  </section>`;
}

function teamBuilderPlanActionCount(plan) {
  return [
    'instructions',
    'roleDefaults',
    'seatOverrides',
    'playerOverrides',
    'rotations',
    'substitutions',
    'playerResources',
    'buildingAnnotations',
    'notes',
  ].reduce((total, key) => total + list(plan?.[key]).length, 0);
}

function teamBuilderProgress(state, balance) {
  const teamCount = snapshotTeamCount(state);
  const expectedSeats = snapshotFieldSize(state);
  const occupiedSeats = balance.assigned;
  const teamsWithPlans = state.snapshot.teams.filter(
    (team) => teamBuilderPlanActionCount(team.plan) > 0
  ).length;
  const globalPlanActions = teamBuilderPlanActionCount(state.snapshot.plan);
  const validated = revisionValidation(state, 'plan').valid;
  const published = publicationRecord(state, 'plan').status === 'published';
  const completed = [
    occupiedSeats > 0,
    occupiedSeats === expectedSeats && state.snapshot.teams.length === teamCount,
    globalPlanActions > 0 || teamsWithPlans === teamCount,
    published,
  ];
  const currentIndex = completed.findIndex((value) => !value);
  return {
    currentIndex,
    expectedSeats,
    occupiedSeats,
    teamCount,
    teamsWithPlans,
    validated,
    published,
  };
}

function renderTeamBuilderWorkflow(state, balance) {
  const progress = teamBuilderProgress(state, balance);
  const steps = [
    {
      title: state.tr('adminBohWorkflowImportRoster', 'Import roster'),
      detail:
        progress.occupiedSeats > 0
          ? state.tr('adminBohWorkflowImportedSeats', '{count} occupied seats are in the draft.', {
              count: progress.occupiedSeats,
            })
          : state.tr('adminBohWorkflowNoImportedSeats', 'No imported seats yet.'),
    },
    {
      title: state.tr('adminBohWorkflowShapeTeams', 'Shape teams'),
      detail: state.tr(
        'adminBohWorkflowTeamShapeStatus',
        '{teams} teams ? {occupied}/{expected} occupied seats.',
        {
          teams: progress.teamCount,
          occupied: progress.occupiedSeats,
          expected: progress.expectedSeats,
        }
      ),
    },
    {
      title: state.tr('adminBohWorkflowAddPlans', 'Add plans'),
      detail: state.tr('adminBohWorkflowPlanStatus', '{count} of {teams} teams have saved plans.', {
        count: progress.teamsWithPlans,
        teams: progress.teamCount,
      }),
    },
    {
      title: state.tr('adminBohWorkflowValidatePublish', 'Validate & publish'),
      detail: progress.published
        ? state.tr('adminBohWorkflowPublished', 'A player plan is live.')
        : progress.validated
          ? state.tr('adminBohWorkflowValidated', 'This draft revision is validated.')
          : state.tr('adminBohWorkflowNeedsValidation', 'This draft revision needs validation.'),
    },
  ];
  return `<nav class="boh-admin-command-deck" aria-label="${escapeHtml(
    state.tr('adminBohGuidedBuilderWorkflow', 'Guided team builder workflow')
  )}"><ol>${steps
    .map((step, index) => {
      const status =
        progress.currentIndex < 0 || index < progress.currentIndex
          ? 'done'
          : index === progress.currentIndex
            ? 'current'
            : index === progress.currentIndex + 1
              ? 'next'
              : 'later';
      const statusLabel =
        status === 'done'
          ? state.tr('adminBohWorkflowDone', 'Done')
          : status === 'current'
            ? state.tr('adminBohWorkflowCurrent', 'Current')
            : status === 'next'
              ? state.tr('adminBohWorkflowNext', 'Next')
              : state.tr('adminBohWorkflowLater', 'Later');
      const icon =
        status === 'done'
          ? '&#10003;'
          : status === 'current'
            ? '&#9679;'
            : status === 'next'
              ? '&#8594;'
              : '&#183;';
      return `<li data-step-status="${status}" ${
        status === 'current' ? 'aria-current="step"' : ''
      }><span class="boh-admin-command-deck__number"><span aria-hidden="true">${icon}</span>${
        index + 1
      }</span><div><span class="boh-admin-command-deck__status">${escapeHtml(
        statusLabel
      )}</span><strong>${escapeHtml(step.title)}</strong><small>${escapeHtml(
        step.detail
      )}</small></div></li>`;
    })
    .join('')}</ol></nav>`;
}

function renderTeamBuilderReadiness(state, balance) {
  const progress = teamBuilderProgress(state, balance);
  return `<aside class="boh-admin-readiness-bar" aria-label="${escapeHtml(
    state.tr('adminBohDraftReadinessCommands', 'Draft readiness commands')
  )}"><dl><div><dt>${escapeHtml(
    state.tr('adminBohDraftRevision', 'Draft revision')
  )}</dt><dd>${state.snapshot.revision}</dd></div><div><dt>${escapeHtml(
    state.tr('adminBohAssignedSeats', 'Assigned seats')
  )}</dt><dd>${progress.occupiedSeats} / ${progress.expectedSeats}</dd></div><div><dt>${escapeHtml(
    state.tr('adminBohTeamCount', 'Team count')
  )}</dt><dd>${progress.teamCount}</dd></div></dl><span class="boh-admin-status-chip" data-status="pending">${escapeHtml(
    state.tr('adminBohDraftOnly', 'Draft only')
  )}</span><div class="boh-admin-readiness-bar__actions"><button type="button" class="boh-admin-button ${
    progress.validated ? '' : 'boh-admin-readiness-primary'
  }" data-action="validate-revision">${escapeHtml(
    state.tr('adminBohValidateDraft', 'Validate draft')
  )}</button><button type="button" class="boh-admin-button ${
    progress.validated ? 'boh-admin-readiness-primary' : ''
  }" data-action="stage" data-stage="publish">${escapeHtml(
    state.tr('adminBohReviewPublish', 'Review and publish')
  )}</button></div></aside>`;
}

function renderTeamBuilderImportCenter(state) {
  return `<section class="boh-admin-import-center" aria-labelledby="bohImportCenterTitle"><header><p class="boh-admin-card-kicker">${escapeHtml(
    state.tr('adminBohImportCenterKicker', 'IMPORT CENTER')
  )}</p><h4 id="bohImportCenterTitle">${escapeHtml(
    state.tr('adminBohImportCenterTitle', 'Bring in rosters and plans')
  )}</h4><p>${escapeHtml(
    state.tr(
      'adminBohImportCenterHelp',
      'Preview exact roster data first, then add one or more matching role-plan files. Imports remain draft-only.'
    )
  )}</p></header><div class="boh-admin-import-center__grid">${renderMapperExactViewImport(
    state
  )}${renderMapperRolePlanImport(state)}</div></section>`;
}

function renderAdvancedTeamActions(state, preview) {
  return `<section class="boh-admin-card boh-admin-advanced-team-actions"><header><div><p class="boh-admin-card-kicker">${escapeHtml(
    state.tr('adminBohBalanceAndRoleTools', 'BALANCE & ROLE TOOLS')
  )}</p><h4>${escapeHtml(
    state.tr('adminBohAdvancedTeamActions', 'Preview changes before applying them')
  )}</h4></div></header><div class="boh-admin-stage-actions"><button type="button" class="boh-admin-button" data-action="preview-balance-teams">${escapeHtml(
    state.tr('adminBohPreviewBalance', 'Preview balance')
  )}</button><button type="button" class="boh-admin-button" data-action="apply-balance-preview" ${
    preview ? '' : 'disabled'
  }>${escapeHtml(
    state.tr('adminBohApplyPreview', 'Apply preview')
  )}</button><button type="button" class="boh-admin-button" data-action="discard-balance-preview" ${
    preview ? '' : 'disabled'
  }>${escapeHtml(
    state.tr('adminBohDiscardPreview', 'Discard preview')
  )}</button><button type="button" class="boh-admin-button" data-action="auto-assign-ranked-roles">${escapeHtml(
    state.tr('adminBohAutoAssignRankedRoles', 'Auto roles by rank')
  )}</button></div></section>`;
}

function renderMapperBoardToolbar(state) {
  return `<section class="boh-admin-board-toolbar" aria-label="${escapeHtml(
    state.tr('adminBohMapperBoardControls', 'Mapper board controls')
  )}">
    <label><span>${escapeHtml(state.tr('adminBohSearchPlayers', 'Search players'))}</span>
      <input class="boh-admin-input" type="search" data-action="mapper-board-search"
        value="${escapeHtml(state.mapperBoardSearch)}" placeholder="${escapeHtml(
          state.tr('adminBohSearchPlayersPlaceholder', 'Name, team, role, or rank')
        )}" /></label>
    <label><span>${escapeHtml(state.tr('adminBohDeploymentFilter', 'Deployment'))}</span>
      <select class="boh-admin-select" data-action="mapper-board-filter">
        ${[
          ['all', 'All players'],
          ['main', 'Main'],
          ['backup', 'Backup'],
          ['unresolved', 'Unresolved identity'],
        ]
          .map(
            ([value, label]) =>
              `<option value="${value}" ${
                state.mapperBoardFilter === value ? 'selected' : ''
              }>${escapeHtml(label)}</option>`
          )
          .join('')}
      </select></label>
    <div class="boh-admin-board-view-controls">
      <fieldset class="boh-admin-segmented"><legend>${escapeHtml(
        state.tr('adminBohTeamBoardDensity', 'Density')
      )}</legend>${[
        ['comfortable', state.tr('adminBohComfortableDensity', 'Comfortable')],
        ['compact', state.tr('adminBohCompactDensity', 'Compact')],
      ]
        .map(
          ([value, label]) =>
            `<button type="button" data-action="team-board-density" data-value="${value}" aria-pressed="${
              state.teamBoardDensity === value
            }">${escapeHtml(label)}</button>`
        )
        .join('')}</fieldset>
      <fieldset class="boh-admin-segmented"><legend>${escapeHtml(
        state.tr('adminBohTeamBoardColumns', 'Columns')
      )}</legend>${[1, 2, 3]
        .map(
          (value) =>
            `<button type="button" data-action="team-board-columns" data-value="${value}" aria-pressed="${
              state.teamBoardColumns === value
            }">${value}</button>`
        )
        .join('')}</fieldset>
    </div>
  </section>`;
}

function renderMapperPlanDialog(state) {
  const team = state.snapshot.teams.find((item) => item.id === state.mapperPlanDialogTeamId);
  if (!team) return '';
  const occupied = team.seats.filter((seat) => seat.playerId || seat.displayName);
  const playerIds = new Set(occupied.map((seat) => seat.playerId).filter(Boolean));
  const starters = occupied.filter((seat) => seat.playerId && cleanText(seat.lane) !== 'backup');
  const backups = occupied.filter((seat) => seat.playerId && cleanText(seat.lane) === 'backup');
  const instructions = list(state.snapshot.plan.instructions).filter(
    (item) => item.teamId === team.id && (!item.playerId || playerIds.has(item.playerId))
  );
  const substitutions = list(state.snapshot.plan.substitutions).filter(
    (item) => item.teamId === team.id
  );
  const resourceByPlayer = new Map(
    list(state.snapshot.plan.playerResources).map((item) => [item.playerId, item])
  );
  const annotationPrefix = `mapper-${team.id}-building-`;
  const buildingAnnotation = list(state.snapshot.plan.buildingAnnotations).find((item) =>
    cleanText(item.id).startsWith(annotationPrefix)
  );
  const verifiedAssigned = occupied.filter((seat) => {
    if (!seat.playerId) return false;
    const player = playerById(state, seat.playerId);
    return ['confirmed', 'approved'].includes(submissionStatus(player));
  });
  const modes = ['overview', 'roles', 'timeline', 'resources', 'map'];
  const mode = modes.includes(state.mapperPlanMode) ? state.mapperPlanMode : 'overview';
  let content = '';

  if (mode === 'roles') {
    content = `<div class="boh-admin-team-plan-dialog__grid">${state.snapshot.plan.roleGroups
      .map((role) => {
        const members = occupied.filter((seat) => seat.roleGroupId === role.id);
        return `<section><h4>${escapeHtml(roleDisplayName(state, role))}</h4><ol>${members
          .map(
            (seat) =>
              `<li><strong>#${seat.seatNumber} ${escapeHtml(
                seat.displayName || playerName(playerById(state, seat.playerId)) || 'Unresolved'
              )}</strong><span>${escapeHtml(seat.lane || 'deployment not set')}</span></li>`
          )
          .join('')}</ol></section>`;
      })
      .join('')}</div>`;
  } else if (mode === 'timeline') {
    content = `<div class="boh-admin-team-plan-dialog__grid">${state.snapshot.plan.phases
      .map((phase) => {
        const rows = instructions.filter((item) => item.phaseId === phase.id);
        const phaseSwaps = substitutions.filter(
          (item) =>
            item.entryMinute >= finiteNumber(phase.startMinute) &&
            item.entryMinute <= finiteNumber(phase.endMinute)
        );
        return `<section><h4>${escapeHtml(phaseDisplayName(state, phase))}</h4>
          ${phaseSwaps
            .map((item) => {
              const incoming = occupied.find((seat) => seat.playerId === item.backupPlayerId);
              const outgoing = occupied.find((seat) => seat.playerId === item.replacesPlayerId);
              return `<p><strong>Minute ${item.entryMinute} substitution:</strong> ${escapeHtml(
                incoming?.displayName || item.backupPlayerId
              )} replaces ${escapeHtml(outgoing?.displayName || item.replacesPlayerId)}.</p>`;
            })
            .join('')}
          <ul>${rows
            .map((item) => {
              const seat = occupied.find((candidate) => candidate.playerId === item.playerId);
              const action = cleanText(item.action || item.instruction?.action || item.instruction);
              const crystal = item.instruction?.gatherCrystals === true;
              return `<li><strong>${escapeHtml(
                seat?.displayName ||
                  playerName(playerById(state, item.playerId)) ||
                  item.playerId ||
                  'Team'
              )} - ${escapeHtml(item.legionId || '')}</strong><span>${escapeHtml(action)}${
                crystal ? ' - Sacred Crystal duty' : ''
              }</span></li>`;
            })
            .join('')}</ul></section>`;
      })
      .join('')}</div>`;
  } else if (mode === 'resources') {
    content = `<form class="boh-admin-plan-details" data-form="mapper-plan-details">
      <input type="hidden" name="teamId" value="${escapeHtml(team.id)}" />
      <section class="boh-admin-card"><header><div><h4>Backup substitutions</h4><p>Private draft only. Standby is the default. An enabled backup must replace one active starter at minute 3-60; no more than 10 starters are active at once.</p></div><strong>${starters.length} / 10 active</strong></header>
        <div class="boh-admin-plan-details__grid">${
          backups
            .map((seat, index) => {
              const existing = substitutions.find((item) => item.backupPlayerId === seat.playerId);
              return `<fieldset><legend>#${seat.seatNumber} ${escapeHtml(
                seat.displayName || playerName(playerById(state, seat.playerId)) || seat.playerId
              )}</legend>
              <input type="hidden" name="substitutionId.${escapeHtml(
                seat.playerId
              )}" value="${escapeHtml(existing?.id || '')}" />
              <label><span>Deployment</span><select class="boh-admin-select" name="substitutionReplaces.${escapeHtml(
                seat.playerId
              )}"><option value="">Standby - does not play</option>${starters
                .map(
                  (starter) =>
                    `<option value="${escapeHtml(starter.playerId)}" ${
                      existing?.replacesPlayerId === starter.playerId ? 'selected' : ''
                    }>Replace #${starter.seatNumber} ${escapeHtml(
                      starter.displayName || starter.playerId
                    )}</option>`
                )
                .join('')}</select></label>
              <label><span>Entry minute</span><input class="boh-admin-input" type="number" min="3" max="60" name="substitutionMinute.${escapeHtml(
                seat.playerId
              )}" value="${escapeHtml(existing?.entryMinute ?? 3)}" /></label>
              <label><span>Private note</span><input class="boh-admin-input" maxlength="2000" name="substitutionNote.${escapeHtml(
                seat.playerId
              )}" value="${escapeHtml(existing?.note || '')}" /></label>
              <input type="hidden" name="substitutionOrder.${escapeHtml(
                seat.playerId
              )}" value="${index + 1}" />
            </fieldset>`;
            })
            .join('') || '<p>No designated backups on this team.</p>'
        }</div>
      </section>
      <section class="boh-admin-card"><header><div><h4>Player resources</h4><p>Private planning inputs for current verified assigned players. No merit conversion is calculated here. Battlefield Teleport reserves one personal teleport; other skills carry no invented effect.</p></div></header>
        <div class="boh-admin-plan-details__grid">${
          verifiedAssigned
            .map((seat) => {
              const resource = resourceByPlayer.get(seat.playerId) || {};
              const reserved = new Set(list(resource.skillReservations).map((item) => item.id));
              return `<fieldset><legend>#${seat.seatNumber} ${escapeHtml(
                seat.displayName || playerName(playerById(state, seat.playerId)) || seat.playerId
              )}</legend>
              <input type="hidden" name="resourcePlayerId" value="${escapeHtml(seat.playerId)}" />
              <label><span>Merit budget</span><input class="boh-admin-input" type="number" min="0" name="resourceMerit.${escapeHtml(
                seat.playerId
              )}" value="${escapeHtml(resource.meritBudget ?? '')}" /></label>
              <label><span>Queue capacity</span><input class="boh-admin-input" type="number" min="1" max="4" name="resourceQueue.${escapeHtml(
                seat.playerId
              )}" value="${escapeHtml(resource.queueCapacity ?? '')}" /></label>
              <div class="boh-admin-plan-details__skills">${BohModel.BOH_PLAYER_RESOURCE_SKILLS.map(
                (skill) =>
                  `<label><input type="checkbox" name="resourceSkill.${escapeHtml(
                    seat.playerId
                  )}" value="${escapeHtml(skill.id)}" ${
                    reserved.has(skill.id) ? 'checked' : ''
                  } /><span>${escapeHtml(skill.id)}${
                    skill.id === 'battlefield-teleport' ? ' (+1 personal teleport)' : ''
                  }</span></label>`
              ).join('')}</div>
            </fieldset>`;
            })
            .join('') || '<p>No current verified assigned players.</p>'
        }</div>
      </section>
      <section class="boh-admin-card"><header><div><h4>Building annotation</h4><p>This is configurable private mapping text, not a known building effect.</p></div></header>
        <input type="hidden" name="annotationId" value="${escapeHtml(
          buildingAnnotation?.id || ''
        )}" />
        <div class="boh-admin-field-pair"><label><span>Building ID</span><input class="boh-admin-input" name="annotationBuildingId" maxlength="160" value="${escapeHtml(
          buildingAnnotation?.buildingId || ''
        )}" /></label><label><span>Annotation</span><input class="boh-admin-input" name="annotationNote" maxlength="2000" value="${escapeHtml(
          buildingAnnotation?.note || ''
        )}" /></label></div>
      </section>
      <footer class="boh-admin-team-plan-dialog__footer"><p>These fields remain private in the draft and never publish automatically.</p><button type="submit" class="boh-admin-button boh-admin-button-primary">Save private plan details</button></footer>
    </form>`;
  } else if (mode === 'map') {
    content = `<section class="boh-admin-card"><h4>Connected tower territory route</h4><p>Each tower covers an adjacent or overlapping 5x5 footprint from HOME. Blue routes toward center and both Fortresses of Honor; red mirrors the route by 180 degrees.</p><ol><li>HOME - T1 - T2 - T3 - T4</li><li>Main: T4 - T5 through T14 - center / FH1</li><li>Branch: T4 - T15 - T16 - T17 - T18 - T19 - FH2</li></ol></section>`;
  } else {
    content = `<div class="boh-admin-team-plan-dialog__grid"><section><h4>Ranked roster</h4><ol>${occupied
      .map((seat) => {
        const command =
          seat.playerId === team.captainId
            ? 'Leader'
            : uniqueTextList(team.coLeaderIds).includes(seat.playerId)
              ? 'Co-leader'
              : '';
        return `<li><strong>#${seat.seatNumber} ${escapeHtml(
          seat.displayName || playerName(playerById(state, seat.playerId)) || 'Unresolved'
        )}</strong><span>${escapeHtml(
          [seat.lane || 'deployment not set', seat.side, command].filter(Boolean).join(' - ')
        )}</span></li>`;
      })
      .join(
        ''
      )}</ol></section><section><h4>Plan safety</h4><p>Draft only. Crystal tasks appear only on the assigned player, Legion, and phase. Publishing remains a separate validated action.</p></section></div>`;
  }

  return `<section class="boh-admin-team-plan-dialog" role="dialog" aria-modal="true" aria-labelledby="bohMapperPlanTitle">
    <button type="button" class="boh-admin-team-plan-dialog__backdrop" data-action="close-mapper-plan" aria-label="Close team plan"></button>
    <div class="boh-admin-team-plan-dialog__panel"><header class="boh-admin-team-plan-dialog__header"><div><p class="boh-admin-card-kicker">TEAM PLAN</p><h3 id="bohMapperPlanTitle" tabindex="-1">${escapeHtml(
      teamDisplayName(state, team)
    )}</h3></div><button type="button" class="boh-admin-button" data-action="close-mapper-plan">Close</button></header>
    <div class="boh-admin-team-plan-dialog__toolbar" role="tablist">${[
      ['overview', 'Overview'],
      ['roles', 'Roles'],
      ['timeline', 'Timeline'],
      ['resources', 'Resources'],
      ['map', 'Map'],
    ]
      .map(
        ([value, label]) =>
          `<button type="button" class="boh-admin-button" role="tab" data-action="mapper-plan-mode" data-mode="${value}" aria-selected="${
            mode === value
          }">${escapeHtml(label)}</button>`
      )
      .join('')}</div>
    ${content}<footer class="boh-admin-team-plan-dialog__footer"><button type="button" class="boh-admin-button boh-admin-button-validate" data-action="validate-revision">Validate draft</button><button type="button" class="boh-admin-button boh-admin-button-publish" data-action="stage" data-stage="publish">Review and publish</button></footer></div>
  </section>`;
}

function renderTeamBuilder(state) {
  const balance = teamBalance(state);
  const candidates = teamBuilderCandidates(state);
  const selectedIds = selectedTeamBuilderIds(state, candidates);
  const preview = state.snapshot.balancePreview;
  const activeMetric = normalizeBalanceMetric(state.snapshot.event?.balanceMetric);
  return `
    <header class="boh-admin-stage-header">
      <div><p class="boh-admin-eyebrow">${escapeHtml(
        state.tr('adminBohStageThree', 'MAPPER WORKSPACE')
      )}</p><h3>${escapeHtml(stageLabel(state, 'teams'))}</h3><p>${escapeHtml(
        state.tr(
          'adminBohMapperTeamsHelp',
          'Import the mapper exact view, reconcile verified identities, edit the six ranked team cards, inspect mapper-style plans, then validate and publish explicitly.'
        )
      )}</p></div>
      <div class="boh-admin-stage-header-actions">
        <a
          class="boh-admin-button"
          href="boh-mapper-admin.html"
          target="_blank"
          rel="noopener"
          data-boh-mapper-link="admin"
        >${escapeHtml(state.tr('adminBohOpenFullMapper', 'Open full battlefield mapper'))}</a>
        <button type="button" class="boh-admin-button" data-action="clear-seat-selection" ${
          state.selectedSourceSeat ? '' : 'disabled'
        }>${escapeHtml(state.tr('adminBohCancelMove', 'Cancel move'))}</button>
      </div>
    </header>
    <div class="boh-admin-summary-grid">
      ${summaryCard(`${balance.assigned} / ${snapshotFieldSize(state)}`, state.tr('adminBohAssignedSeats', 'Assigned seats'))}
      ${summaryCard(formatNumber(state, balance.scoreAverage), state.tr('adminBohAverageTeamScore', 'Average team score'))}
      ${summaryCard(formatNumber(state, balance.powerAverage), state.tr('adminBohAverageTeamPower', 'Average team power'))}
      ${summaryCard(balanceMetricLabel(state, activeMetric), state.tr('adminBohActiveBalanceMetricLabel', 'Active balance metric'), 'success')}
    </div>
    ${renderTeamBuilderWorkflow(state, balance)}
    ${renderTeamBuilderReadiness(state, balance)}
    ${renderTeamBuilderImportCenter(state)}
    ${renderMapperBoardToolbar(state)}
    ${renderSeatMoveNotice(state)}
    <div class="boh-admin-team-board" data-density="${state.teamBoardDensity}"
      data-columns="${state.teamBoardColumns}" style="--boh-team-count:${snapshotTeamCount(state)}" aria-label="${escapeHtml(
        state.tr('adminBohTeamBoard', '{count}-team assignment board', {
          count: snapshotTeamCount(state),
        })
      )}">${state.snapshot.teams
        .map((team, index) => renderTeamColumn(state, team, balance, index))
        .join('')}</div>
    <details class="boh-admin-advanced-tools"><summary><span>${escapeHtml(
      state.tr('adminBohAdvancedTeamTools', 'Advanced team tools')
    )}</span><small>${escapeHtml(
      state.tr(
        'adminBohAdvancedTeamToolsHelp',
        'Balance previews, automatic roles, compatibility imports, and exports'
      )
    )}</small></summary><div class="boh-admin-advanced-tools__body">
      ${renderAdvancedTeamActions(state, preview)}
      ${renderApprovedRosterImport(state)}${renderTeamBuilderSettings(state, candidates, selectedIds)}${renderEligiblePool(
        state,
        candidates,
        selectedIds
      )}${renderDirectAssignment(state, candidates, selectedIds)}${renderBalancePreview(
        state
      )}${renderTeamExportTools(state, balance)}
    </div></details>
    <div class="boh-admin-team-export-host" aria-hidden="true">${renderTeamExportCard(
      state,
      balance,
      'roles'
    )}${renderTeamExportCard(state, balance, 'scores')}</div>
    ${renderMapperPlanDialog(state)}
    ${renderPlayerValueEditor(state)}`;
}

function renderTeamExportTools(state, balance) {
  return `<section class="boh-admin-card boh-admin-team-export-tools">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohTeamExportKicker', 'TEAM EXPORT')
    )}</p><h4>${escapeHtml(
      state.tr('adminBohTeamExportTitle', 'Shareable team output')
    )}</h4><p>${escapeHtml(
      state.tr(
        'adminBohTeamExportHelp',
        'Exports the current teams as a clean roster with player scores and team totals.'
      )
    )}</p></div>
    <div class="boh-admin-stage-actions">
      <button type="button" class="boh-admin-button" data-action="export-team-board-csv">${escapeHtml(
        state.tr('adminBohExportTeamsCsv', 'Export teams CSV')
      )}</button>
      <button type="button" class="boh-admin-button" data-action="export-team-board-png" data-export-view="roles">${escapeHtml(
        state.tr('adminBohExportTeamsRolesPng', 'Roles PNG')
      )}</button>
      <button type="button" class="boh-admin-button boh-admin-button-primary" data-action="export-team-board-png" data-export-view="scores">${escapeHtml(
        state.tr('adminBohExportTeamsScoresPng', 'Scores PNG')
      )}</button>
    </div></header>
    <div class="boh-admin-team-export-mini" style="--boh-team-count:${snapshotTeamCount(state)}">
      ${state.snapshot.teams
        .map(
          (team, index) =>
            `<span style="--boh-team-color:${escapeHtml(team.color || '#7dd3fc')}">${escapeHtml(
              teamDisplayName(state, team)
            )}: ${escapeHtml(formatNumber(state, balance.scoreTotals[index] || 0))}</span>`
        )
        .join('')}
    </div>
  </section>`;
}

function renderTeamExportCard(state, balance, mode = 'scores') {
  const teamCount = snapshotTeamCount(state);
  const scoresMode = mode !== 'roles';
  return `<section class="boh-admin-team-export-card" data-team-export-card="${escapeHtml(
    mode
  )}" style="--boh-team-count:${teamCount}">
    <header>
      <div><p>${escapeHtml(state.tr('adminBohAllStarBoh', 'All-Star BoH'))}</p>
      <h2>${escapeHtml(
        state.tr(
          scoresMode ? 'adminBohTeamExportScoresRoster' : 'adminBohTeamExportRolesRoster',
          scoresMode ? '{count}-team score roster' : '{count}-team role roster',
          { count: teamCount }
        )
      )}</h2></div>
      <span>${escapeHtml(new Date().toISOString().slice(0, 10))}</span>
    </header>
    <div class="boh-admin-team-export-grid">
      ${state.snapshot.teams
        .map((team, index) => {
          const score = balance.scoreTotals[index] || 0;
          const power = balance.powerTotals[index] || 0;
          return `<article class="boh-admin-team-export-column" style="--boh-team-color:${escapeHtml(
            team.color || '#7dd3fc'
          )}">
            <h3>${escapeHtml(teamDisplayName(state, team))}</h3>
            <p>${escapeHtml(state.tr('adminBohScoringPoints', 'Scoring points'))}: ${escapeHtml(
              formatNumber(state, score)
            )} · ${escapeHtml(state.tr('adminBohTotalGamePower', 'Total in-game power'))}: ${escapeHtml(
              formatNumber(state, power)
            )}</p>
            <ol>${team.seats
              .map((seat) => {
                const player = playerById(state, seat.playerId);
                const role = state.snapshot.plan.roleGroups.find(
                  (item) => item.id === seat.roleGroupId
                );
                const name =
                  seat.displayName ||
                  playerName(player) ||
                  state.tr('adminBohEmptySeat', 'Empty seat');
                const playerScore =
                  seat.playerId && player ? formatNumber(state, scoreValue(player)) : '';
                const playerPower =
                  seat.playerId && seat.totalCastlePower
                    ? formatNumber(state, seat.totalCastlePower)
                    : player
                      ? formatNumber(state, scoreAuditTotalPower(player))
                      : '';
                const detail = scoresMode
                  ? [playerScore, playerPower].filter(Boolean).join(' / ')
                  : roleDisplayName(state, role) ||
                    state.tr('adminBohRoleUnassigned', 'Role unassigned');
                const leaderBadge =
                  seat.playerId === team.captainId
                    ? state.tr('adminBohLeaderShort', 'L')
                    : uniqueTextList(team.coLeaderIds).includes(seat.playerId)
                      ? state.tr('adminBohCoLeaderShort', 'CL')
                      : '';
                return `<li><span>${seat.seatNumber}</span><strong>${escapeHtml(
                  name
                )}${leaderBadge ? `<b>${escapeHtml(leaderBadge)}</b>` : ''}</strong><em>${escapeHtml(
                  detail
                )}</em></li>`;
              })
              .join('')}</ol>
          </article>`;
        })
        .join('')}
    </div>
  </section>`;
}

function renderSeatMoveNotice(state) {
  if (!state.selectedSourceSeat) return '';
  const team = state.snapshot.teams.find((item) => item.id === state.selectedSourceSeat.teamId);
  const seat = team?.seats.find((item) => item.seatNumber === state.selectedSourceSeat.seatNumber);
  return `<div class="boh-admin-move-notice" role="status">
    <strong>${escapeHtml(state.tr('adminBohMoveSelected', 'Move selected'))}:</strong>
    <span>${escapeHtml(teamDisplayName(state, team))} · ${escapeHtml(
      state.tr('adminBohSeatNumber', 'Seat {number}', { number: seat?.seatNumber || '' })
    )} · ${escapeHtml(seat?.displayName || playerName(playerById(state, seat?.playerId)) || '—')}</span>
    <span>${escapeHtml(
      state.tr('adminBohChooseDestination', 'Choose another unlocked seat to move or swap.')
    )}</span>
  </div>`;
}

function renderTeamColumn(state, team, balance, index) {
  const score = balance.scoreTotals[index];
  const power = balance.powerTotals[index];
  const activeMetric = normalizeBalanceMetric(state.snapshot.event?.balanceMetric);
  const powerMetric = activeMetric === 'totalPower';
  const balancedMetric = activeMetric === 'balanced';
  const displayedTotal = powerMetric ? power : score;
  const difference = powerMetric ? power - balance.powerAverage : score - balance.scoreAverage;
  const assigned = team.seats.filter((seat) => seat.playerId).length;
  return `<section class="boh-admin-team" data-team-id="${escapeHtml(team.id)}" aria-labelledby="bohTeamTitle-${team.number}">
    <header style="--boh-team-color:${escapeHtml(team.color || '#7dd3fc')}">
      <div><span>${escapeHtml(state.tr('adminBohTeamNumber', 'TEAM {number}', { number: team.number }))}</span>
        <h4 id="bohTeamTitle-${team.number}">${escapeHtml(teamDisplayName(state, team))}</h4></div>
      <div class="boh-admin-team-score">${
        balancedMetric
          ? `<span>${escapeHtml(balanceMetricLabel(state, activeMetric))}</span>`
          : `<strong data-balance-primary-total>${escapeHtml(
              formatNumber(state, displayedTotal)
            )}</strong><span>${escapeHtml(balanceMetricLabel(state, activeMetric))}</span>`
      }
        <span>${escapeHtml(state.tr('adminBohScoringPoints', 'Scoring points'))}: ${escapeHtml(
          formatNumber(state, score)
        )} / ${escapeHtml(state.tr('adminBohTotalGamePower', 'Total in-game power'))}: ${escapeHtml(
          formatNumber(state, power)
        )}</span>
        ${
          balancedMetric
            ? ''
            : `<span>${difference >= 0 ? '+' : ''}${escapeHtml(formatNumber(state, difference))} ${escapeHtml(
                state.tr('adminBohVsAverage', 'vs avg')
              )}</span>`
        }</div>
      <button type="button" class="boh-admin-button boh-admin-button-small boh-admin-button-plan" data-action="open-mapper-plan" data-team-id="${escapeHtml(team.id)}">Open team plan</button>
    </header>
    <form class="boh-admin-stack" data-form="team-metadata">
      <input type="hidden" name="teamId" value="${escapeHtml(team.id)}" />
      <div class="boh-admin-field-pair">
        <label><span>${escapeHtml(state.tr('adminBohTeamName', 'Team name'))}</span>
          <input class="boh-admin-input" name="name" maxlength="160" value="${escapeHtml(
            team.name
          )}" required /></label>
        <label><span>${escapeHtml(state.tr('adminBohTeamColor', 'Team color'))}</span>
          <input class="boh-admin-input" type="color" name="color" value="${escapeHtml(
            /^#[0-9a-f]{6}$/i.test(team.color) ? team.color : '#7dd3fc'
          )}" required /></label>
      </div>
      <label><span>${escapeHtml(state.tr('adminBohCaptain', 'Captain'))}</span>
        <select class="boh-admin-select" name="captainId">
          <option value="">${escapeHtml(state.tr('adminBohSelectCaptain', 'Select captain'))}</option>
          ${team.seats
            .filter((seat) => seat.playerId)
            .map(
              (seat) =>
                `<option value="${escapeHtml(seat.playerId)}" ${
                  seat.playerId === team.captainId ? 'selected' : ''
                }>${escapeHtml(seat.displayName || playerName(playerById(state, seat.playerId)))}</option>`
            )
            .join('')}
        </select>
      </label>
      <div class="boh-admin-field-pair">
        ${[0, 1]
          .map(
            (slot) => `<label><span>${escapeHtml(
              state.tr('adminBohCoLeaderNumber', 'Co-leader {number}', { number: slot + 1 })
            )}</span>
        <select class="boh-admin-select" name="coLeaderIds">
          <option value="">${escapeHtml(state.tr('adminBohSelectCoLeader', 'Select co-leader'))}</option>
          ${team.seats
            .filter((seat) => seat.playerId)
            .map(
              (seat) =>
                `<option value="${escapeHtml(seat.playerId)}" ${
                  seat.playerId === team.coLeaderIds?.[slot] ? 'selected' : ''
                }>${escapeHtml(seat.displayName || playerName(playerById(state, seat.playerId)))}</option>`
            )
            .join('')}
        </select></label>`
          )
          .join('')}
      </div>
      <label><span>${escapeHtml(state.tr('adminBohTeamNotes', 'Admin team notes'))}</span>
        <textarea class="boh-admin-textarea" name="notes" rows="2" maxlength="2000">${escapeHtml(
          team.notes || ''
        )}</textarea>
      </label>
      <button class="boh-admin-button boh-admin-button-small boh-admin-button-save" type="submit">${escapeHtml(
        state.tr('adminBohSaveTeamMetadata', 'Save team details')
      )}</button>
    </form>
    <div class="boh-admin-team-meter" aria-label="${escapeHtml(
      state.tr('adminBohTeamSeatsFilled', '{assigned} of 12 seats filled', { assigned })
    )}"><span style="width:${clamp((assigned / ROSTER_SIZE) * 100, 0, 100)}%"></span></div>
    <ol class="boh-admin-seat-list">
      ${team.seats.map((seat) => renderSeat(state, team, seat)).join('')}
    </ol>
  </section>`;
}

function renderSeat(state, team, seat) {
  const player = playerById(state, seat.playerId);
  const occupied = Boolean(seat.playerId);
  const selected =
    state.selectedSourceSeat?.teamId === team.id &&
    state.selectedSourceSeat?.seatNumber === seat.seatNumber;
  const sourceSelected = Boolean(state.selectedSourceSeat);
  const destinationDisabled = selected || seat.locked;
  const role = state.snapshot.plan.roleGroups.find((item) => item.id === seat.roleGroupId);
  const unresolvedMapperScore =
    !seat.playerId &&
    Boolean(cleanText(seat.displayName)) &&
    Number.isFinite(Number(seat.score)) &&
    finiteNumber(seat.score) > 0;
  const playerScore = player
    ? formatNumber(state, scoreValue(player))
    : unresolvedMapperScore
      ? formatNumber(state, seat.score)
      : '';
  const playerPower = occupied
    ? formatNumber(state, seat.totalCastlePower || scoreAuditTotalPower(player))
    : '';
  const commandRole =
    seat.playerId === team.captainId
      ? 'leader'
      : uniqueTextList(team.coLeaderIds).includes(seat.playerId)
        ? 'coleader'
        : '';
  const candidates = teamBuilderCandidates(state);
  const searchText = [
    teamDisplayName(state, team),
    seat.displayName || playerName(player),
    roleDisplayName(state, role),
    seat.lane,
    seat.side,
    commandRole,
    seat.seatNumber,
  ]
    .filter(Boolean)
    .join(' ');
  const estimate =
    !seat.playerId && playerScore
      ? state.tr('adminBohMapperRoughEstimate', 'Mapper rough/manual estimate: {score}', {
          score: playerScore,
        })
      : '';
  return `<li class="boh-admin-seat" data-occupied="${occupied}" data-locked="${seat.locked}"
    data-selected="${selected}" data-search="${escapeHtml(searchText)}"
    data-deployment="${escapeHtml(seat.playerId ? seat.lane || 'main' : 'unresolved')}">
    <span class="boh-admin-seat-number">#${seat.seatNumber}</span>
    <div class="boh-admin-seat-editor"><div class="boh-admin-seat-editor__identity">
      <button type="button" class="boh-admin-seat-main" data-action="${
        sourceSelected ? 'move-seat-here' : 'select-seat'
      }" data-team-id="${escapeHtml(team.id)}" data-seat-number="${seat.seatNumber}"
        ${sourceSelected && destinationDisabled ? 'disabled' : ''} aria-pressed="${selected}">
        <strong>${escapeHtml(
          seat.displayName || playerName(player) || state.tr('adminBohEmptySeat', 'Empty seat')
        )}</strong><small>${escapeHtml(
          [
            roleDisplayName(state, role) || state.tr('adminBohRoleUnassigned', 'Role unassigned'),
            playerScore ? `${state.tr('adminBohScore', 'Score')}: ${playerScore}` : '',
            playerPower ? `${state.tr('adminBohPower', 'Power')}: ${playerPower}` : '',
            estimate,
          ]
            .filter(Boolean)
            .join(' - ')
        )}</small></button>
      <button type="button" class="boh-admin-lock-button" data-action="toggle-seat-lock"
        data-team-id="${escapeHtml(team.id)}" data-seat-number="${seat.seatNumber}"
        aria-pressed="${seat.locked}" aria-label="${escapeHtml(
          seat.locked ? 'Unlock seat' : 'Lock seat'
        )}">${seat.locked ? 'Locked' : 'Open'}</button></div>
      <label><span class="sr-only">Player</span><select class="boh-admin-select" data-action="mapper-seat-player"
        data-team-id="${escapeHtml(team.id)}" data-seat-number="${seat.seatNumber}">
        <option value="">Unresolved / empty</option>
        ${candidates
          .map(
            (candidate) =>
              `<option value="${escapeHtml(candidate.playerId)}" ${
                candidate.playerId === seat.playerId ? 'selected' : ''
              }>${escapeHtml(candidate.gameName || candidate.displayName || candidate.playerId)}</option>`
          )
          .join('')}</select></label>
      ${
        occupied
          ? `<button type="button" class="boh-admin-button boh-admin-button-small boh-admin-button-plan" data-action="edit-player-values" data-team-id="${escapeHtml(team.id)}" data-seat-number="${seat.seatNumber}">${escapeHtml(state.tr('adminBohEditPlayerValues', 'Edit player values'))}</button>`
          : ''
      }
      <form class="boh-admin-seat-editor__controls" data-form="mapper-seat-details">
        <input type="hidden" name="teamId" value="${escapeHtml(team.id)}" /><input type="hidden" name="seatNumber" value="${seat.seatNumber}" />
        <label><span class="sr-only">Deployment</span><select class="boh-admin-select" name="deployment"><option value="">Not set</option><option value="main" ${
          seat.lane === 'main' ? 'selected' : ''
        }>Main</option><option value="backup" ${seat.lane === 'backup' ? 'selected' : ''}>Backup</option></select></label>
        <label><span class="sr-only">Plan role</span><select class="boh-admin-select" name="roleGroupId">${state.snapshot.plan.roleGroups
          .map(
            (item) =>
              `<option value="${escapeHtml(item.id)}" ${
                item.id === seat.roleGroupId ? 'selected' : ''
              }>${escapeHtml(roleDisplayName(state, item))}</option>`
          )
          .join('')}</select></label>
        <label><span class="sr-only">Title role</span><select class="boh-admin-select" name="titleRole"><option value="">No title role</option>${[
          ['kills', 'Kills'],
          ['tower', 'Tower'],
          ['escort', 'Escort'],
          ['gathering', 'Gathering'],
        ]
          .map(
            ([value, label]) =>
              `<option value="${value}" ${seat.side === value ? 'selected' : ''}>${label}</option>`
          )
          .join('')}</select></label>
        <label><span class="sr-only">Command role</span><select class="boh-admin-select" name="commandRole"><option value="">No command role</option><option value="leader" ${
          commandRole === 'leader' ? 'selected' : ''
        }>Leader</option><option value="coleader" ${commandRole === 'coleader' ? 'selected' : ''}>Co-leader</option></select></label>
        <button class="boh-admin-button boh-admin-button-small boh-admin-button-save" type="submit">Save card</button>
      </form></div>
  </li>`;
}

function renderPlayerValueEditor(state) {
  const editor = state.playerValueEditor;
  if (!editor) return '';
  const team = state.snapshot.teams.find((item) => item.id === editor.teamId);
  const seat = team?.seats.find((item) => item.seatNumber === editor.seatNumber);
  const submission = state.snapshot.submissions.find(
    (item) => playerId(item) === cleanText(seat?.playerId)
  );
  if (!seat?.playerId || !submission) return '';
  const score = state.snapshot.scores.find((item) => playerId(item) === seat.playerId) || {};
  const review = submission.review || {};
  const effectivePower =
    score.totalCastlePower ??
    submission.stats?.totalCastlePower ??
    submission.totalCastlePower ??
    '';
  const base = score.overrideScore ?? score.calculatedScore ?? 0;
  const commitment = score.commitmentScore ?? 0;
  const final = score.finalScore ?? base + commitment;
  return `<section class="boh-admin-player-editor" role="dialog" aria-modal="true" aria-labelledby="bohPlayerValueEditorTitle">
    <button type="button" class="boh-admin-player-editor__backdrop" data-action="close-player-values" aria-label="${escapeHtml(state.tr('adminBohClosePlayerValues', 'Close player values'))}"></button>
    <div class="boh-admin-player-editor__panel" tabindex="-1"><header><div><p class="boh-admin-card-kicker">${escapeHtml(state.tr('adminBohPrivatePlayerEditor', 'PRIVATE PLAYER EDITOR'))}</p><h3 id="bohPlayerValueEditorTitle">${escapeHtml(state.tr('adminBohEditPlayerValues', 'Edit player values'))}</h3></div><button type="button" class="boh-admin-button boh-admin-button-quiet" data-action="close-player-values">${escapeHtml(state.tr('adminBohClose', 'Close'))}</button></header>
    <form class="boh-admin-stack" data-form="player-value-editor">
      <input type="hidden" name="playerId" value="${escapeHtml(seat.playerId)}" />
      <div class="boh-admin-player-editor__identity">
        <label><span>${escapeHtml(state.tr('adminBohPlayerId', 'Player ID'))}</span><input class="boh-admin-input" value="${escapeHtml(seat.playerId)}" readonly aria-readonly="true" /></label>
        <label><span>${escapeHtml(state.tr('adminBohFirebaseUid', 'Firebase UID'))}</span><input class="boh-admin-input" value="${escapeHtml(submission.uid || seat.playerId)}" readonly aria-readonly="true" /></label>
      </div>
      <label><span>${escapeHtml(state.tr('adminBohCorrectedPlayerName', 'Corrected player name'))}</span><input class="boh-admin-input" name="displayName" maxlength="160" value="${escapeHtml(playerName(submission) || seat.displayName || seat.playerId)}" required /></label>
      <label><span>${escapeHtml(state.tr('adminBohCorrectedTotalPowerOptional', 'Corrected total power (optional)'))}</span><input class="boh-admin-input" type="number" name="totalCastlePower" min="0" max="${CORRECTION_NUMBER_LIMITS.totalCastlePower}" step="1" value="${escapeHtml(effectivePower)}" /></label>
      <label><span>${escapeHtml(state.tr('adminBohCorrectionReason', 'Correction reason'))}</span><textarea class="boh-admin-textarea" name="correctionReason" maxlength="500" rows="2">${escapeHtml(review.submissionCorrection?.reason || review.gameNameCorrection?.reason || '')}</textarea></label>
      <div class="boh-admin-player-editor__score">
        <label><span>${escapeHtml(state.tr('adminBohBaseScoreOverrideOptional', 'Base score override (optional)'))}</span><input class="boh-admin-input" type="number" name="baseScoreOverride" min="0" step="any" value="${score.overrideScore == null ? '' : escapeHtml(score.overrideScore)}" /></label>
        <label><span>${escapeHtml(state.tr('adminBohOverrideReason', 'Override reason'))}</span><input class="boh-admin-input" name="overrideReason" maxlength="2000" value="${escapeHtml(score.overrideReason || '')}" /></label>
        <p class="boh-admin-player-equation"><strong>${escapeHtml(formatNumber(state, base))}</strong><span>+ ${escapeHtml(formatNumber(state, commitment))} ${escapeHtml(state.tr('adminBohCommitmentScore', 'Commitment'))}</span><span>= ${escapeHtml(formatNumber(state, final))} ${escapeHtml(state.tr('adminBohTeamListScore', 'team-list score'))}</span></p>
      </div>
      <p class="boh-admin-player-editor__privacy">${escapeHtml(state.tr('adminBohPlayerEditorPrivacy', 'Corrected names become public on the next publish. Score and power remain private to admins and exports. Saving never publishes.'))}</p>
      <footer><button type="button" class="boh-admin-button boh-admin-button-quiet" data-action="clear-player-score-override" data-player-id="${escapeHtml(seat.playerId)}" ${score.overrideScore == null ? 'disabled' : ''}>${escapeHtml(state.tr('adminBohClearOverride', 'Clear override'))}</button><button type="submit" class="boh-admin-button boh-admin-button-save">${escapeHtml(state.tr('adminBohSavePlayerValues', 'Save player values'))}</button></footer>
    </form></div>
  </section>`;
}

function renderMapperRolePlanImport(state) {
  const preview = state.mapperPlanImportPreview;
  const complete =
    preview &&
    preview.matchedCount === preview.playerCount &&
    preview.unresolvedCount === 0 &&
    !list(preview.diagnostics).length;
  const teamSummary = preview
    ? '<ul class="boh-admin-role-plan-team-summary">' +
      list(preview.teams)
        .map(
          (team) =>
            `<li><strong>${escapeHtml(team.team?.name || team.team?.id)}</strong><span>${team.matchedCount} / ${team.playerCount}</span></li>`
        )
        .join('') +
      '</ul>'
    : '';
  let exportReason = '';
  try {
    buildAdminAllStarBohMapperPlanBundle(state.snapshot);
  } catch (error) {
    exportReason = cleanText(error?.message);
  }

  return (
    '<section class="boh-admin-card boh-admin-role-plan-import" aria-labelledby="bohRolePlanImportTitle">' +
    '<header><div><p class="boh-admin-card-kicker">' +
    escapeHtml(state.tr('adminBohRolePlanImportKicker', 'MAPPER ROLE-PLAN JSON')) +
    '</p><h4 id="bohRolePlanImportTitle">' +
    escapeHtml(state.tr('adminBohRolePlanImportTitle', 'Import team plans')) +
    '</h4><p>' +
    escapeHtml(
      state.tr(
        'adminBohRolePlanImportHelp',
        'Choose 1-6 single-team v2 files or one six-team bundle v1. Every file is validated before one atomic draft save.'
      )
    ) +
    '</p></div><div class="boh-admin-role-plan-actions"><button type="button" class="boh-admin-button boh-admin-button-plan" data-action="export-mapper-plan-bundle" ' +
    (exportReason ? `disabled title="${escapeHtml(exportReason)}"` : '') +
    '>' +
    escapeHtml(state.tr('adminBohExportAllPlansJson', 'Export all plans JSON')) +
    '</button><label class="boh-admin-button boh-admin-button-import">' +
    escapeHtml(state.tr('adminBohChooseRolePlanJson', 'Choose role-plan JSON')) +
    '<input class="sr-only" type="file" accept="application/json,.json" data-action="preview-mapper-role-plan" multiple /></label></div></header>' +
    (preview
      ? '<div class="boh-admin-role-plan-import-summary" data-complete="' +
        complete +
        '">' +
        '<dl><div><dt>' +
        escapeHtml(state.tr('adminBohTeam', 'Team')) +
        '</dt><dd>' +
        escapeHtml(
          preview.planCount === 1
            ? preview.team?.name || preview.team?.id
            : `${preview.planCount} teams`
        ) +
        '</dd></div>' +
        '<div><dt>' +
        escapeHtml(state.tr('adminBohPlayersLinked', 'Players linked')) +
        '</dt><dd>' +
        preview.matchedCount +
        ' / ' +
        preview.playerCount +
        '</dd></div>' +
        '<div><dt>' +
        escapeHtml(state.tr('adminBohPhases', 'Phases')) +
        '</dt><dd>' +
        preview.phaseCount +
        '</dd></div>' +
        '<div><dt>' +
        escapeHtml(state.tr('adminBohPersonalInstructions', 'Personal instructions')) +
        '</dt><dd>' +
        preview.instructionCount +
        '</dd></div></dl>' +
        (list(preview.diagnostics).length
          ? '<div class="boh-admin-validation-list" data-tone="error"><strong>' +
            escapeHtml(state.tr('adminBohBlockingIssues', 'Blocking issues')) +
            '</strong><ul>' +
            preview.diagnostics
              .map((item) => '<li>' + escapeHtml(item.message) + '</li>')
              .join('') +
            '</ul></div>'
          : '<p class="boh-admin-check-line">' +
            escapeHtml(
              state.tr('adminBohRolePlanReady', 'Ready: all 12 players are linked by exact name.')
            ) +
            '</p>') +
        teamSummary +
        '<button type="button" class="boh-admin-button boh-admin-button-save" data-action="save-mapper-role-plan" ' +
        (complete ? '' : 'disabled') +
        '>' +
        escapeHtml(state.tr('adminBohSaveRolePlanDraft', 'Save plan to draft')) +
        '</button></div>'
      : '<p class="boh-admin-role-plan-import-empty">' +
        escapeHtml(
          state.tr(
            'adminBohRolePlanImportEmpty',
            'Import the matching team list first, then choose its all-star-boh-stage1-role-plan version 2 JSON.'
          )
        ) +
        '</p>') +
    '</section>'
  );
}

function renderPlans(state) {
  const phases = state.snapshot.plan.phases;
  const legions = state.snapshot.plan.legions;
  const selectedTeam =
    state.snapshot.teams.find((team) => team.id === state.planTeamId) || state.snapshot.teams[0];
  const selectedPhase = phases.find((phase) => phase.id === state.planPhaseId) || phases[0];
  const selectedLegion = legions.find((legion) => legion.id === state.planLegionId) || legions[0];
  return `
    <header class="boh-admin-stage-header">
      <div><p class="boh-admin-eyebrow">${escapeHtml(state.tr('adminBohStageFour', 'STAGE 4 OF 5'))}</p>
        <h3>${escapeHtml(stageLabel(state, 'plans'))}</h3>
        <p>${escapeHtml(
          state.tr(
            'adminBohPlansHelp',
            'Set role capacity, four timed phases, Legion-specific defaults, seat overrides, rotations, and schematic objectives.'
          )
        )}</p></div>
    </header>
    ${renderMapperRolePlanImport(state)}
    <div class="boh-admin-plan-config">
      ${renderRoleConfiguration(state)}
      ${renderPhaseConfiguration(state)}
    </div>
    ${renderPlanTemplateTools(state, selectedTeam, selectedPhase, selectedLegion)}
    <section class="boh-admin-card boh-admin-plan-editor" aria-labelledby="bohPlanEditorTitle">
      <header><div><p class="boh-admin-card-kicker">${escapeHtml(
        state.tr('adminBohInstructionAuthoring', 'INSTRUCTION AUTHORING')
      )}</p><h4 id="bohPlanEditorTitle">${escapeHtml(
        state.tr('adminBohPlanMatrix', 'Team plan matrix')
      )}</h4></div></header>
      <div class="boh-admin-plan-context">
        <label><span>${escapeHtml(state.tr('adminBohTeam', 'Team'))}</span>
          <select class="boh-admin-select" data-plan-filter="team">${state.snapshot.teams
            .map(
              (team) =>
                `<option value="${escapeHtml(team.id)}" ${team.id === selectedTeam?.id ? 'selected' : ''}>${escapeHtml(
                  teamDisplayName(state, team)
                )}</option>`
            )
            .join('')}</select></label>
        <label><span>${escapeHtml(state.tr('adminBohPhase', 'Phase'))}</span>
          <select class="boh-admin-select" data-plan-filter="phase">${phases
            .map(
              (phase) =>
                `<option value="${escapeHtml(phase.id)}" ${phase.id === selectedPhase?.id ? 'selected' : ''}>${escapeHtml(
                  phaseDisplayName(state, phase)
                )}</option>`
            )
            .join('')}</select></label>
        <label><span>${escapeHtml(state.tr('adminBohLegion', 'Legion'))}</span>
          <select class="boh-admin-select" data-plan-filter="legion">${legions
            .map(
              (legion) =>
                `<option value="${escapeHtml(legion.id)}" ${legion.id === selectedLegion?.id ? 'selected' : ''}>${escapeHtml(
                  legionDisplayName(state, legion)
                )}</option>`
            )
            .join('')}</select></label>
        <fieldset class="boh-admin-segmented"><legend>${escapeHtml(
          state.tr('adminBohInstructionScope', 'Instruction scope')
        )}</legend>
          <button type="button" data-action="plan-scope" data-scope="global" aria-pressed="${state.planScope === 'global'}">${escapeHtml(
            state.tr('adminBohGlobal', 'Global')
          )}</button>
          <button type="button" data-action="plan-scope" data-scope="role" aria-pressed="${state.planScope === 'role'}">${escapeHtml(
            state.tr('adminBohGroupDefault', 'Role default')
          )}</button>
          <button type="button" data-action="plan-scope" data-scope="seat" aria-pressed="${state.planScope === 'seat'}">${escapeHtml(
            state.tr('adminBohSeatOverride', 'Seat override')
          )}</button>
          <button type="button" data-action="plan-scope" data-scope="player" aria-pressed="${state.planScope === 'player'}">${escapeHtml(
            state.tr('adminBohPlayer', 'Player')
          )}</button>
        </fieldset>
      </div>
      <div class="boh-admin-plan-workspace">
        ${renderInstructionForm(state, selectedTeam, selectedPhase, selectedLegion)}
        ${renderInstructionSummary(state, selectedTeam, selectedPhase, selectedLegion)}
      </div>
      ${renderRotationEditor(state, selectedTeam, selectedPhase, selectedLegion)}
    </section>
    ${renderMapEditor(state, selectedPhase, selectedLegion)}`;
}

function renderPlanTemplateTools(state, selectedTeam, selectedPhase, selectedLegion) {
  const targetTeams = state.snapshot.teams.filter((team) => team.id !== selectedTeam?.id);
  const targetPhases = state.snapshot.plan.phases.filter((phase) => phase.id !== selectedPhase?.id);
  const targetLegions = state.snapshot.plan.legions.filter(
    (legion) => legion.id !== selectedLegion?.id
  );
  return `<section class="boh-admin-card boh-admin-template-tools" aria-labelledby="bohTemplateToolsTitle">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohSafeTemplates', 'SAFE TEMPLATE TOOLS')
    )}</p><h4 id="bohTemplateToolsTitle">${escapeHtml(
      state.tr('adminBohReusePlanStructure', 'Reuse plan structure without copying players')
    )}</h4><p>${escapeHtml(
      state.tr(
        'adminBohTemplatePrivacy',
        'Template actions copy instructions or structure only. Team assignments, legacy player names, signup data, and scores never move with them.'
      )
    )}</p></div>
      <button type="button" class="boh-admin-button boh-admin-button-plan" data-action="start-legacy-structure">${escapeHtml(
        state.tr('adminBohStartLegacyStructure', 'Start from last-year structure')
      )}</button>
    </header>
    <div class="boh-admin-template-grid">
      <form data-form="copy-phase-template">
        <strong>${escapeHtml(state.tr('adminBohCopyPhaseTemplate', 'Copy phase template'))}</strong>
        <span>${escapeHtml(phaseDisplayName(state, selectedPhase))}</span>
        <label><span>${escapeHtml(state.tr('adminBohCopyTo', 'Copy to'))}</span>
          <select class="boh-admin-select" name="targetPhaseId" required>
            <option value="">${escapeHtml(state.tr('adminBohSelectPhase', 'Select phase'))}</option>
            ${targetPhases
              .map(
                (phase) =>
                  `<option value="${escapeHtml(phase.id)}">${escapeHtml(
                    phaseDisplayName(state, phase)
                  )}</option>`
              )
              .join('')}
          </select></label>
        <button class="boh-admin-button boh-admin-button-plan" type="submit" ${targetPhases.length ? '' : 'disabled'}>${escapeHtml(
          state.tr('adminBohCopyPhase', 'Copy phase')
        )}</button>
      </form>
      <form data-form="copy-team-plan">
        <strong>${escapeHtml(state.tr('adminBohCopyTeamPlan', 'Copy team plan'))}</strong>
        <span>${escapeHtml(teamDisplayName(state, selectedTeam))}</span>
        <label><span>${escapeHtml(state.tr('adminBohCopyTo', 'Copy to'))}</span>
          <select class="boh-admin-select" name="targetTeamId" required>
            <option value="">${escapeHtml(state.tr('adminBohSelectTeam', 'Select team'))}</option>
            ${targetTeams
              .map(
                (team) =>
                  `<option value="${escapeHtml(team.id)}">${escapeHtml(
                    teamDisplayName(state, team)
                  )}</option>`
              )
              .join('')}
          </select></label>
        <button class="boh-admin-button boh-admin-button-plan" type="submit" ${targetTeams.length ? '' : 'disabled'}>${escapeHtml(
          state.tr('adminBohCopyTeam', 'Copy team')
        )}</button>
      </form>
      <form data-form="copy-legion-plan">
        <strong>${escapeHtml(state.tr('adminBohCopyLegionPlan', 'Copy Legion plan'))}</strong>
        <span>${escapeHtml(legionDisplayName(state, selectedLegion))}</span>
        <label><span>${escapeHtml(state.tr('adminBohCopyTo', 'Copy to'))}</span>
          <select class="boh-admin-select" name="targetLegionId" required>
            <option value="">${escapeHtml(state.tr('adminBohSelectLegion', 'Select Legion'))}</option>
            ${targetLegions
              .map(
                (legion) =>
                  `<option value="${escapeHtml(legion.id)}">${escapeHtml(
                    legionDisplayName(state, legion)
                  )}</option>`
              )
              .join('')}
          </select></label>
        <button class="boh-admin-button boh-admin-button-plan" type="submit" ${targetLegions.length ? '' : 'disabled'}>${escapeHtml(
          state.tr('adminBohCopyLegion', 'Copy Legion')
        )}</button>
      </form>
      <form data-form="apply-role-default">
        <strong>${escapeHtml(state.tr('adminBohApplyRoleDefault', 'Apply role default'))}</strong>
        <label><span>${escapeHtml(state.tr('adminBohRoleGroup', 'Role group'))}</span>
          <select class="boh-admin-select" name="roleGroupId" required>
            <option value="">${escapeHtml(state.tr('adminBohSelectRole', 'Select role'))}</option>
            ${state.snapshot.plan.roleGroups
              .map(
                (role) =>
                  `<option value="${escapeHtml(role.id)}">${escapeHtml(
                    roleDisplayName(state, role)
                  )}</option>`
              )
              .join('')}
          </select></label>
        <label><span>${escapeHtml(state.tr('adminBohSeat', 'Seat'))}</span>
          <select class="boh-admin-select" name="seatNumber" required>
            <option value="">${escapeHtml(state.tr('adminBohSelectSeat', 'Select seat'))}</option>
            ${selectedTeam?.seats
              .map(
                (seat) =>
                  `<option value="${seat.seatNumber}">${escapeHtml(
                    state.tr('adminBohSeatPlayer', 'Seat {seat} · {player}', {
                      seat: seat.seatNumber,
                      player:
                        seat.displayName ||
                        playerName(playerById(state, seat.playerId)) ||
                        state.tr('adminBohEmptySeat', 'Empty'),
                    })
                  )}</option>`
              )
              .join('')}
          </select></label>
        <button class="boh-admin-button boh-admin-button-plan" type="submit">${escapeHtml(
          state.tr('adminBohApplyDefault', 'Apply default')
        )}</button>
      </form>
    </div>
    <p class="boh-admin-template-warning"><strong>${escapeHtml(
      state.tr('adminBohLegacyIs15Seats', 'Legacy plan warning:')
    )}</strong> ${escapeHtml(
      state.tr(
        'adminBohLegacySafeCopy',
        'Last year used 15 seats. This action copies only the four phase timings and objective codes. It will not import role capacities or player assignments into the 12-seat format.'
      )
    )}</p>
  </section>`;
}

function roleDrafts(state) {
  if (!state.roleDrafts)
    state.roleDrafts = state.snapshot.plan.roleGroups.map((role) => ({ ...role }));
  return state.roleDrafts;
}

function phaseDrafts(state) {
  if (!state.phaseDrafts)
    state.phaseDrafts = state.snapshot.plan.phases.map((phase) => ({ ...phase }));
  return state.phaseDrafts;
}

function renderRoleConfiguration(state) {
  const roles = roleDrafts(state);
  const capacity = roles.reduce((total, role) => total + Math.max(0, integer(role.capacity)), 0);
  return `<form class="boh-admin-card boh-admin-config-card" data-form="role-groups">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohRoleStructure', 'ROLE STRUCTURE')
    )}</p><h4>${escapeHtml(state.tr('adminBohRoleCapacity', 'Role groups and capacity'))}</h4></div>
      <span class="boh-admin-capacity" data-valid="${capacity === ROSTER_SIZE}">${escapeHtml(
        state.tr('adminBohCapacityCount', '{count} / 12 seats', { count: capacity })
      )}</span></header>
    <div class="boh-admin-repeat-list">
      ${roles
        .map(
          (role, index) => `<div class="boh-admin-repeat-row">
            <input type="hidden" name="roleId" value="${escapeHtml(role.id)}" />
            <label><span>${escapeHtml(state.tr('adminBohRoleName', 'Role name'))}</span>
              <input class="boh-admin-input" name="roleLabel" value="${escapeHtml(
                roleDisplayName(state, role)
              )}" maxlength="60" required /></label>
            <label><span>${escapeHtml(state.tr('adminBohCapacity', 'Capacity'))}</span>
              <input class="boh-admin-input" name="roleCapacity" value="${role.capacity}" type="number" min="0" max="12" required /></label>
            <label><span>${escapeHtml(state.tr('adminBohColor', 'Color'))}</span>
              <input class="boh-admin-color" name="roleColor" value="${escapeHtml(role.color)}" type="color" /></label>
            <button type="button" class="boh-admin-icon-button" data-action="remove-role" data-role-index="${index}" aria-label="${escapeHtml(
              state.tr('adminBohRemoveRole', 'Remove {role}', {
                role: roleDisplayName(state, role),
              })
            )}" ${roles.length === 1 ? 'disabled' : ''}>×</button>
          </div>`
        )
        .join('')}
    </div>
    <footer><button type="button" class="boh-admin-button boh-admin-button-plan" data-action="add-role">${escapeHtml(
      state.tr('adminBohAddRole', 'Add role')
    )}</button><button type="submit" class="boh-admin-button boh-admin-button-save" ${
      capacity === ROSTER_SIZE ? '' : 'disabled'
    }>${escapeHtml(state.tr('adminBohSaveRoles', 'Save role structure'))}</button></footer>
  </form>`;
}

function renderPhaseConfiguration(state) {
  const phases = phaseDrafts(state);
  return `<form class="boh-admin-card boh-admin-config-card" data-form="phases">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohTimeline', 'MATCH TIMELINE')
    )}</p><h4>${escapeHtml(state.tr('adminBohFourPhases', 'Four timed phases'))}</h4></div>
      <span class="boh-admin-capacity" data-valid="${phases.length === 4}">${escapeHtml(
        state.tr('adminBohPhaseCount', '{count} / 4 phases', { count: phases.length })
      )}</span></header>
    <div class="boh-admin-phase-grid">
      ${phases
        .map(
          (phase) => `<fieldset><legend>${escapeHtml(phaseDisplayName(state, phase))}</legend>
            <input type="hidden" name="phaseId" value="${escapeHtml(phase.id)}" />
            <label><span>${escapeHtml(state.tr('adminBohPhaseLabel', 'Label'))}</span>
              <input class="boh-admin-input" name="phaseLabel" value="${escapeHtml(
                phaseDisplayName(state, phase)
              )}" maxlength="40" required /></label>
            <div><label><span>${escapeHtml(state.tr('adminBohStartMinute', 'Start'))}</span>
              <input class="boh-admin-input" name="phaseStart" type="number" min="0" max="120" value="${phase.startMinute}" required /></label>
            <label><span>${escapeHtml(state.tr('adminBohEndMinute', 'End'))}</span>
              <input class="boh-admin-input" name="phaseEnd" type="number" min="0" max="120" value="${phase.endMinute}" required /></label></div>
          </fieldset>`
        )
        .join('')}
    </div>
    <footer><span>${escapeHtml(
      state.tr('adminBohPhaseRule', 'Phases must be ordered and non-overlapping.')
    )}</span><button type="submit" class="boh-admin-button boh-admin-button-save">${escapeHtml(
      state.tr('adminBohSaveTimeline', 'Save timeline')
    )}</button></footer>
  </form>`;
}

function renderInstructionForm(state, team, phase, legion) {
  const roles = state.snapshot.plan.roleGroups;
  const objectives = state.snapshot.plan.objectives;
  const scope = ['global', 'role', 'seat', 'player'].includes(state.planScope)
    ? state.planScope
    : 'role';
  const objectiveOptions = objectives
    .map(
      (objective) =>
        `<option value="${escapeHtml(objective.id)}">${escapeHtml(
          cleanText(objective.code || objective.label || objective.id)
        )}</option>`
    )
    .join('');
  return `<form class="boh-admin-stack boh-admin-instruction-form" data-form="instruction">
    <input type="hidden" name="teamId" value="${escapeHtml(team?.id)}" />
    <input type="hidden" name="phaseId" value="${escapeHtml(phase?.id)}" />
    <input type="hidden" name="legionId" value="${escapeHtml(legion?.id)}" />
    <input type="hidden" name="scope" value="${escapeHtml(scope)}" />
    ${
      scope === 'global'
        ? `<input type="hidden" name="scopeId" value="*" />`
        : `<label><span>${escapeHtml(
            scope === 'role'
              ? state.tr('adminBohRoleGroup', 'Role group')
              : scope === 'seat'
                ? state.tr('adminBohSeat', 'Seat')
                : state.tr('adminBohPlayer', 'Player')
          )}</span>
            <select class="boh-admin-select" name="scopeId" required>
              <option value="">${escapeHtml(
                scope === 'role'
                  ? state.tr('adminBohSelectRole', 'Select role')
                  : scope === 'seat'
                    ? state.tr('adminBohSelectSeat', 'Select seat')
                    : state.tr('adminBohSelectPlayer', 'Select player')
              )}</option>
              ${
                scope === 'role'
                  ? roles
                      .map(
                        (role) =>
                          `<option value="${escapeHtml(role.id)}">${escapeHtml(
                            roleDisplayName(state, role)
                          )}</option>`
                      )
                      .join('')
                  : scope === 'seat'
                    ? list(team?.seats)
                        .map(
                          (seat) =>
                            `<option value="${seat.seatNumber}">${escapeHtml(
                              state.tr('adminBohSeatPlayer', 'Seat {seat} · {player}', {
                                seat: seat.seatNumber,
                                player:
                                  seat.displayName ||
                                  playerName(playerById(state, seat.playerId)) ||
                                  state.tr('adminBohEmptySeat', 'Empty'),
                              })
                            )}</option>`
                        )
                        .join('')
                    : list(team?.seats)
                        .filter((seat) => seat.playerId)
                        .map(
                          (seat) =>
                            `<option value="${escapeHtml(seat.playerId)}">${escapeHtml(
                              seat.displayName ||
                                playerName(playerById(state, seat.playerId)) ||
                                seat.playerId
                            )}</option>`
                        )
                        .join('')
              }
            </select>
          </label>`
    }
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohAction', 'Action'))}</span>
        <input class="boh-admin-input" name="action" maxlength="100" required placeholder="${escapeHtml(
          state.tr('adminBohActionPlaceholder', 'Build, capture, defend, attack…')
        )}" /></label>
      <label><span>${escapeHtml(state.tr('adminBohTargetObjective', 'Target objective'))}</span>
        <select class="boh-admin-select" name="objectiveId"><option value="">${escapeHtml(
          state.tr('adminBohNoObjective', 'No mapped objective')
        )}</option>${objectiveOptions}</select></label>
    </div>
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohStartObjective', 'Start objective'))}</span>
        <select class="boh-admin-select" name="startObjectiveId"><option value="">${escapeHtml(
          state.tr('adminBohNoObjective', 'No mapped objective')
        )}</option>${objectiveOptions}</select></label>
      <label><span>${escapeHtml(state.tr('adminBohViaObjectives', 'Via objectives'))}</span>
        <select class="boh-admin-select" name="viaObjectiveIds" multiple size="${Math.min(
          4,
          Math.max(2, objectives.length)
        )}">${objectiveOptions}</select></label>
    </div>
    <label><span>${escapeHtml(state.tr('adminBohRoutePath', 'Ordered route path IDs'))}</span>
      <input class="boh-admin-input" name="pathObjectiveIds" maxlength="800" placeholder="${escapeHtml(
        state.tr('adminBohRoutePathPlaceholder', 'Example: CC2, T3, FH1')
      )}" />
      <small>${escapeHtml(
        state.tr(
          'adminBohRoutePathHelp',
          'Codes or IDs are resolved to map anchors and merged in this order: Start, Via, ordered path, Target.'
        )
      )}</small>
    </label>
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohLoadout', 'Troops / heroes'))}</span>
        <input class="boh-admin-input" name="loadout" maxlength="100" placeholder="${escapeHtml(
          state.tr('adminBohLoadoutPlaceholder', 'T1s, T9s, speed heroes…')
        )}" /></label>
      <label><span>${escapeHtml(state.tr('adminBohTeleport', 'Teleport instruction'))}</span>
        <input class="boh-admin-input" name="teleport" maxlength="120" placeholder="${escapeHtml(
          state.tr('adminBohTeleportPlaceholder', 'No teleport or destination')
        )}" /></label>
    </div>
    <label><span>${escapeHtml(state.tr('adminBohPlayerInstruction', 'Player-facing instruction'))}</span>
      <textarea class="boh-admin-textarea" name="instruction" rows="4" maxlength="800" required></textarea></label>
    <label><span>${escapeHtml(state.tr('adminBohChangeNote', 'Plan note'))}</span>
      <textarea class="boh-admin-textarea" name="note" rows="2" maxlength="800"></textarea></label>
    <button type="submit" class="boh-admin-button boh-admin-button-save">${escapeHtml(
      state.tr('adminBohSaveInstruction', 'Save instruction')
    )}</button>
  </form>`;
}

function matchingInstructions(state, team, phase, legion) {
  return state.snapshot.plan.instructions.filter(
    (item) =>
      (!item.teamId || item.teamId === '*' || item.teamId === team?.id) &&
      (!item.phaseId || item.phaseId === '*' || item.phaseId === phase?.id) &&
      (!item.legionId || item.legionId === '*' || item.legionId === legion?.id)
  );
}

function renderInstructionSummary(state, team, phase, legion) {
  const instructions = matchingInstructions(state, team, phase, legion);
  return `<section class="boh-admin-instruction-summary" aria-labelledby="bohInstructionSummaryTitle">
    <header><h5 id="bohInstructionSummaryTitle">${escapeHtml(
      state.tr('adminBohCurrentInstructions', 'Current instructions')
    )}</h5><span>${escapeHtml(phaseDisplayName(state, phase))} · ${escapeHtml(
      legionDisplayName(state, legion)
    )}</span></header>
    ${
      instructions.length
        ? `<ol>${instructions
            .map((item) => {
              const role = state.snapshot.plan.roleGroups.find(
                (candidate) => candidate.id === (item.roleGroupId || item.scopeId)
              );
              const scope =
                item.scope === 'seat' || item.seatNumber
                  ? state.tr('adminBohSeatNumber', 'Seat {number}', {
                      number: item.seatNumber || item.scopeId,
                    })
                  : item.scope === 'player' || item.playerId
                    ? playerName(playerById(state, item.playerId || item.scopeId)) ||
                      item.playerId ||
                      item.scopeId
                    : roleDisplayName(state, role) ||
                      (item.scope === 'global' || item.scopeId === '*'
                        ? state.tr('adminBohGlobal', 'Global')
                        : item.scopeId);
              return `<li><div><strong>${escapeHtml(scope)}</strong><span>${escapeHtml(
                cleanText(item.action || item.instruction)
              )}</span><small>${escapeHtml(
                [
                  item.startObjectiveId,
                  ...list(item.viaObjectiveIds),
                  ...list(item.pathObjectiveIds),
                  item.objectiveCode || item.objectiveId,
                  item.loadout,
                  item.teleport,
                  item.note,
                ]
                  .filter(Boolean)
                  .join(' · ')
              )}</small></div><button type="button" class="boh-admin-icon-button" data-action="remove-instruction" data-instruction-id="${escapeHtml(
                item.id
              )}" aria-label="${escapeHtml(state.tr('adminBohRemoveInstruction', 'Remove instruction'))}">×</button></li>`;
            })
            .join('')}</ol>`
        : `<p class="boh-admin-empty-panel">${escapeHtml(
            state.tr(
              'adminBohNoInstructions',
              'No instructions exist for this phase and Legion yet.'
            )
          )}</p>`
    }
  </section>`;
}

function renderRotationEditor(state, team, phase, legion) {
  const rotations = state.snapshot.plan.rotations.filter(
    (rotation) =>
      rotation.teamId === team?.id &&
      rotation.phaseId === phase?.id &&
      rotation.legionId === legion?.id
  );
  const draft = rotations.find((rotation) => rotation.id === state.rotationDraftId) || null;
  const sourceSeatNumber =
    team?.seats.find((seat) => seat.playerId && seat.playerId === draft?.playerId)?.seatNumber ||
    '';
  return `<form class="boh-admin-rotation" data-form="rotation">
    <div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohRoleRotation', 'ROLE ROTATION')
    )}</p><h5>${escapeHtml(state.tr('adminBohRotateAtPhase', 'Change a seat’s role at this phase'))}</h5></div>
    <input type="hidden" name="teamId" value="${escapeHtml(team?.id)}" />
    <input type="hidden" name="phaseId" value="${escapeHtml(phase?.id)}" />
    <input type="hidden" name="legionId" value="${escapeHtml(legion?.id)}" />
    <input type="hidden" name="rotationId" value="${escapeHtml(draft?.id || '')}" />
    <label><span>${escapeHtml(state.tr('adminBohRotationPlayerSeat', 'Player’s current seat'))}</span><select class="boh-admin-select" name="sourceSeatNumber" required>
      ${team?.seats.map((seat) => `<option value="${seat.seatNumber}" ${sourceSeatNumber === seat.seatNumber ? 'selected' : ''} ${seat.playerId ? '' : 'disabled'}>${seat.seatNumber} · ${escapeHtml(seat.displayName || playerName(playerById(state, seat.playerId)) || state.tr('adminBohEmptySeat', 'Empty'))}</option>`).join('')}
    </select></label>
    <label><span>${escapeHtml(state.tr('adminBohRotationDestination', 'Destination seat / role'))}</span><select class="boh-admin-select" name="targetSeatNumber" required>
      ${team?.seats
        .map((seat) => {
          const role = state.snapshot.plan.roleGroups.find(
            (candidate) => candidate.id === seat.roleGroupId
          );
          return `<option value="${seat.seatNumber}" ${draft?.seatNumber === seat.seatNumber ? 'selected' : ''}>${seat.seatNumber} · ${escapeHtml(
            roleDisplayName(state, role) || state.tr('adminBohRoleUnassigned', 'Role unassigned')
          )}</option>`;
        })
        .join('')}
    </select></label>
    <label><span>${escapeHtml(state.tr('adminBohChangeNote', 'Plan note'))}</span>
      <textarea class="boh-admin-textarea" name="note" rows="2" maxlength="800">${escapeHtml(draft?.note || '')}</textarea></label>
    ${
      rotations.length
        ? `<ol class="boh-admin-rotation-list">${rotations
            .map((rotation) => {
              const player = playerById(state, rotation.playerId);
              const target = team?.seats.find((seat) => seat.seatNumber === rotation.seatNumber);
              const targetRole = state.snapshot.plan.roleGroups.find(
                (role) => role.id === target?.roleGroupId
              );
              return `<li><span>${escapeHtml(playerName(player) || rotation.playerId)} → ${escapeHtml(
                roleDisplayName(state, targetRole) || String(rotation.seatNumber)
              )}</span><span><button type="button" class="boh-admin-button boh-admin-button-small boh-admin-button-plan" data-action="edit-rotation" data-rotation-id="${escapeHtml(
                rotation.id
              )}">${escapeHtml(state.tr('adminBohRoleRotation', 'Edit rotation'))}</button><button type="button" class="boh-admin-icon-button" data-action="remove-rotation" data-rotation-id="${escapeHtml(
                rotation.id
              )}" aria-label="${escapeHtml(
                state.tr('adminBohRemoveInstruction', 'Remove rotation')
              )}">×</button></span></li>`;
            })
            .join('')}</ol>`
        : ''
    }
    ${
      draft
        ? `<button class="boh-admin-button" type="button" data-action="cancel-rotation">${escapeHtml(
            state.tr('adminBohCancelMove', 'Cancel')
          )}</button>`
        : ''
    }
    <button class="boh-admin-button boh-admin-button-save" type="submit">${escapeHtml(
      state.tr('adminBohSaveRotation', 'Save rotation')
    )}</button>
  </form>`;
}

function objectiveDraft(state) {
  return (
    state.snapshot.plan.objectives.find((objective) => objective.id === state.objectiveDraftId) || {
      id: '',
      code: '',
      label: '',
      x: 50,
      y: 50,
      type: 'objective',
    }
  );
}

function renderMapEditor(state, phase, legion) {
  const objectives = state.snapshot.plan.objectives;
  const draft = objectiveDraft(state);
  return `<section class="boh-admin-card boh-admin-map-card" aria-labelledby="bohMapEditorTitle">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohSchematicMap', 'SCHEMATIC MAP')
    )}</p><h4 id="bohMapEditorTitle">${escapeHtml(
      state.tr('adminBohObjectiveEditor', 'Objective and route anchors')
    )}</h4><p>${escapeHtml(
      state.tr(
        'adminBohMapHelp',
        'Place labeled anchors on a neutral schematic. A future arena image can sit beneath the same coordinates without changing plan data.'
      )
    )}</p></div><span>${escapeHtml(phaseDisplayName(state, phase))} · ${escapeHtml(
      legionDisplayName(state, legion)
    )}</span></header>
    <div class="boh-admin-map-layout">
      <div class="boh-admin-map" role="img" aria-label="${escapeHtml(
        state.tr('adminBohMapAria', 'Editable schematic objective map')
      )}">
        <span class="boh-admin-map-axis" data-axis="x" aria-hidden="true"></span>
        <span class="boh-admin-map-axis" data-axis="y" aria-hidden="true"></span>
        ${objectives
          .map(
            (objective) =>
              `<button type="button" class="boh-admin-map-node" data-action="edit-objective" data-objective-id="${escapeHtml(
                objective.id
              )}" style="--boh-x:${clamp(objective.x, 0, 100)}%;--boh-y:${clamp(objective.y, 0, 100)}%" aria-label="${escapeHtml(
                state.tr('adminBohEditObjectiveLabel', 'Edit objective {objective}', {
                  objective: cleanText(objective.code || objective.label || objective.id),
                })
              )}"><strong>${escapeHtml(cleanText(objective.code || objective.label || '?'))}</strong><span>${escapeHtml(
                cleanText(objective.label)
              )}</span></button>`
          )
          .join('')}
        ${
          objectives.length
            ? ''
            : `<p class="boh-admin-map-empty">${escapeHtml(
                state.tr('adminBohNoObjectives', 'Add objective anchors to start the schematic.')
              )}</p>`
        }
      </div>
      <form class="boh-admin-stack boh-admin-objective-form" data-form="objective">
        <input type="hidden" name="id" value="${escapeHtml(draft.id)}" />
        <div class="boh-admin-field-pair"><label><span>${escapeHtml(
          state.tr('adminBohObjectiveCode', 'Code')
        )}</span><input class="boh-admin-input" name="code" value="${escapeHtml(draft.code)}" maxlength="20" required placeholder="CC1" /></label>
        <label><span>${escapeHtml(state.tr('adminBohObjectiveLabel', 'Label'))}</span><input class="boh-admin-input" name="label" value="${escapeHtml(
          draft.label
        )}" maxlength="80" required /></label></div>
        <div class="boh-admin-field-pair"><label><span>${escapeHtml(
          state.tr('adminBohHorizontalPosition', 'Horizontal %')
        )}</span><input class="boh-admin-input" name="x" type="number" min="0" max="100" value="${clamp(
          draft.x,
          0,
          100
        )}" required /></label><label><span>${escapeHtml(
          state.tr('adminBohVerticalPosition', 'Vertical %')
        )}</span><input class="boh-admin-input" name="y" type="number" min="0" max="100" value="${clamp(
          draft.y,
          0,
          100
        )}" required /></label></div>
        <div class="boh-admin-form-actions"><button class="boh-admin-button boh-admin-button-save" type="submit">${escapeHtml(
          state.tr(
            draft.id ? 'adminBohUpdateObjective' : 'adminBohAddObjective',
            draft.id ? 'Update objective' : 'Add objective'
          )
        )}</button>${
          draft.id
            ? `<button class="boh-admin-button boh-admin-button-danger" type="button" data-action="remove-objective" data-objective-id="${escapeHtml(
                draft.id
              )}">${escapeHtml(state.tr('adminBohDeleteObjective', 'Delete objective'))}</button>`
            : ''
        }</div>
      </form>
    </div>
  </section>`;
}

function deriveValidation(state, kind) {
  const seats = state.snapshot.teams.flatMap((team) =>
    team.seats.map((seat) => ({ ...seat, teamId: team.id }))
  );
  const assigned = seats.filter((seat) => seat.playerId);
  const ids = assigned.map((seat) => seat.playerId);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const roleCapacity = state.snapshot.plan.roleGroups.reduce(
    (total, role) => total + Math.max(0, integer(role.capacity)),
    0
  );
  const errors = [];
  const warnings = [];
  const fieldSize = snapshotFieldSize(state);
  const approvedPlayerCount = list(state.snapshot.eligiblePlayerIds).length;
  const expectedAssignedCount = approvedPlayerCount || fieldSize;
  if (assigned.length !== expectedAssignedCount) {
    errors.push(
      state.tr('adminBohValidationDynamicSeats', '{assigned} of {total} seats are assigned.', {
        assigned: assigned.length,
        total: expectedAssignedCount,
      })
    );
  }
  if (duplicates.length) {
    errors.push(
      state.tr('adminBohValidationDuplicates', '{count} players occupy more than one seat.', {
        count: duplicates.length,
      })
    );
  }
  if (roleCapacity !== ROSTER_SIZE) {
    errors.push(
      state.tr('adminBohValidationCapacity', 'Role capacity is {count}; it must equal 12.', {
        count: roleCapacity,
      })
    );
  }
  for (const team of state.snapshot.teams) {
    const backupCount = team.seats.filter((seat) => cleanText(seat.lane) === 'backup').length;
    if (backupCount !== 2) {
      errors.push(
        state.tr(
          'adminBohValidationBackups',
          '{team} has {count} designated backups; release requires exactly 2 backups and 10 starters.',
          { team: teamDisplayName(state, team), count: backupCount }
        )
      );
    }
    if (!cleanText(team.name) || !cleanText(team.color)) {
      errors.push(
        state.tr('adminBohValidationTeamMetadata', '{team} needs a name and color.', {
          team: teamDisplayName(state, team),
        })
      );
    }
    if (team.captainId && !team.seats.some((seat) => seat.playerId === team.captainId)) {
      errors.push(
        state.tr('adminBohValidationCaptain', '{team} has a captain who is not assigned.', {
          team: teamDisplayName(state, team),
        })
      );
    }
    const teamPlayerIds = new Set(team.seats.map((seat) => seat.playerId).filter(Boolean));
    for (const coLeaderId of uniqueTextList(team.coLeaderIds)) {
      if (!teamPlayerIds.has(coLeaderId)) {
        errors.push(
          state.tr('adminBohValidationCoLeader', '{team} has a co-leader who is not assigned.', {
            team: teamDisplayName(state, team),
          })
        );
      }
    }
  }
  if (kind === 'plan' && state.snapshot.plan.phases.length !== 5) {
    errors.push(state.tr('adminBohValidationPhases', 'The plan must contain exactly five phases.'));
  }
  if (kind === 'plan' && state.snapshot.plan.legions.length !== 2) {
    errors.push(
      state.tr('adminBohValidationLegions', 'The plan must contain Legion 1 and Legion 2.')
    );
  }
  if (kind === 'plan' && !state.snapshot.plan.instructions.length) {
    errors.push(
      state.tr('adminBohValidationInstructions', 'No player instructions have been authored.')
    );
  }
  if (kind === 'plan' && !state.snapshot.plan.objectives.length) {
    warnings.push(state.tr('adminBohValidationMap', 'No schematic objectives have been placed.'));
  }
  return { errors, warnings };
}

function revisionValidation(state, kind) {
  const validation = state.snapshot.validation;
  const readiness = validation?.[kind] || validation;
  const validatedRevision = integer(validation?.revision ?? validation?.validatedRevision, -1);
  return {
    validatedRevision,
    valid:
      validatedRevision === state.snapshot.revision &&
      readiness?.valid === true &&
      list(readiness?.errors).length === 0,
  };
}

function eventScheduleDraft(state) {
  if (!state.scheduleDraft) {
    const schedule = normalizeEventSchedule(state.snapshot.eventSchedule);
    const currentTeamTimes = new Map(
      list(schedule.teamGameTimes).map((entry) => [entry.teamId, entry.startsAt])
    );
    state.scheduleDraft = {
      ...schedule,
      milestones: schedule.milestones.map((milestone) => ({ ...milestone })),
      teamGameTimes: state.snapshot.teams.slice(0, TEAM_COUNT).map((team) => ({
        teamId: team.id,
        startsAt: currentTeamTimes.get(team.id) || '',
      })),
    };
  }
  return state.scheduleDraft;
}

function captureEventScheduleDraft(state, form) {
  if (!form) return eventScheduleDraft(state);
  const data = new FormData(form);
  const ids = data.getAll('milestoneId').map(cleanText);
  const labels = data.getAll('milestoneLabel').map(cleanText);
  const starts = data.getAll('milestoneStartsAt').map(localDateTimeToIso);
  state.scheduleDraft = {
    schemaVersion: 1,
    seasonId: cleanText(data.get('seasonId')) || cleanText(state.snapshot.eventSchedule?.seasonId),
    status: cleanText(data.get('status')) === 'published' ? 'published' : 'hidden',
    eventStartsAt: localDateTimeToIso(data.get('eventStartsAt')),
    eventEndsAt: localDateTimeToIso(data.get('eventEndsAt')),
    milestones: ids.slice(0, MAX_EVENT_MILESTONES).map((id, index) => ({
      id: id || `milestone-${Date.now().toString(36)}-${index + 1}`,
      label: labels[index] || '',
      startsAt: starts[index] || '',
    })),
    teamGameTimes: state.snapshot.teams.slice(0, TEAM_COUNT).map((team) => ({
      teamId: team.id,
      startsAt: localDateTimeToIso(data.get(`teamGameTime.${team.id}`)),
    })),
    revision: adapterRevision(state.snapshot.documentRevisions?.eventSchedule),
  };
  return state.scheduleDraft;
}

function eventScheduleValidationErrors(state, schedule) {
  const errors = [];
  // Hidden is an intentional public reset and may be saved with every public field empty.
  if (schedule.status !== 'published') return errors;
  const startTime = new Date(schedule.eventStartsAt).getTime();
  const endTime = new Date(schedule.eventEndsAt).getTime();
  const hasWindow = schedule.eventStartsAt && schedule.eventEndsAt;
  const validWindow = hasWindow && Number.isFinite(startTime) && Number.isFinite(endTime);
  if (!hasWindow) {
    errors.push(
      state.tr('adminBohScheduleEventTimeRequired', 'Add the event start and end times.')
    );
  } else if (!validWindow) {
    errors.push(
      state.tr('adminBohScheduleEventTimeInvalid', 'Use valid event start and end times.')
    );
  } else if (endTime <= startTime) {
    errors.push(
      state.tr('adminBohScheduleEventOrderInvalid', 'Event end must be after event start.')
    );
  }
  for (const milestone of schedule.milestones) {
    if (!milestone.label || !milestone.startsAt) {
      errors.push(
        state.tr('adminBohScheduleMilestoneRequired', 'Every milestone needs a label and time.')
      );
      break;
    }
  }
  const milestoneTimes = schedule.milestones.map((milestone) =>
    new Date(milestone.startsAt).getTime()
  );
  if (milestoneTimes.some((time) => !Number.isFinite(time))) {
    errors.push(state.tr('adminBohScheduleMilestoneTimeInvalid', 'Use valid milestone times.'));
  } else if (
    validWindow &&
    endTime > startTime &&
    milestoneTimes.some((time) => time < startTime || time > endTime)
  ) {
    errors.push(
      state.tr(
        'adminBohScheduleMilestoneOutsideWindow',
        'Milestone times must stay within the event start and end.'
      )
    );
  } else if (milestoneTimes.some((time, index) => index > 0 && time < milestoneTimes[index - 1])) {
    errors.push(
      state.tr(
        'adminBohScheduleMilestoneOrderInvalid',
        'Milestones must stay in chronological order.'
      )
    );
  }
  const teamTimes = schedule.teamGameTimes
    .filter((entry) => entry.startsAt)
    .map((entry) => new Date(entry.startsAt).getTime());
  if (teamTimes.some((time) => !Number.isFinite(time))) {
    errors.push(state.tr('adminBohScheduleTeamTimeInvalid', 'Use valid team game times.'));
  } else if (
    validWindow &&
    endTime > startTime &&
    teamTimes.some((time) => time < startTime || time > endTime)
  ) {
    errors.push(
      state.tr(
        'adminBohScheduleTeamTimeOutsideWindow',
        'Team game times must stay within the event start and end.'
      )
    );
  }
  return [...new Set(errors)];
}

function renderEventScheduleEditor(state) {
  const schedule = eventScheduleDraft(state);
  const revision = adapterRevision(state.snapshot.documentRevisions?.eventSchedule);
  const errors = eventScheduleValidationErrors(state, schedule);
  // Native constraint validation would otherwise block saving a deliberately empty hidden schedule.
  const requiredWhenPublished = schedule.status === 'published' ? 'required' : '';
  return `<form class="boh-admin-card boh-admin-schedule-editor" data-form="event-schedule" aria-labelledby="bohScheduleTitle">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohScheduleKicker', 'EVENT SCHEDULE')
    )}</p><h4 id="bohScheduleTitle">${escapeHtml(
      state.tr('adminBohScheduleTitle', 'Event schedule')
    )}</h4><p>${escapeHtml(
      state.tr(
        'adminBohScheduleHelp',
        'Set the public event window, ordered milestones, and optional per-team game times. Schedule edits do not change tactical draft validation.'
      )
    )}</p></div><span class="boh-admin-status-chip" data-status="${escapeHtml(
      schedule.status
    )}">${escapeHtml(
      schedule.status === 'published'
        ? state.tr('adminBohPublishedStatus', 'Published')
        : state.tr('adminBohScheduleHidden', 'Hidden')
    )}</span></header>
    <input type="hidden" name="seasonId" value="${escapeHtml(schedule.seasonId)}" />
    <div class="boh-admin-schedule-grid">
      <label><span>${escapeHtml(state.tr('adminBohScheduleStatus', 'Schedule status'))}</span>
        <select class="boh-admin-select" name="status" data-action="schedule-status">
          <option value="hidden" ${schedule.status === 'hidden' ? 'selected' : ''}>${escapeHtml(
            state.tr('adminBohScheduleHidden', 'Hidden')
          )}</option>
          <option value="published" ${schedule.status === 'published' ? 'selected' : ''}>${escapeHtml(
            state.tr('adminBohPublishedStatus', 'Published')
          )}</option>
        </select></label>
      <label><span>${escapeHtml(state.tr('adminBohScheduleEventStart', 'Event start'))}</span>
        <input class="boh-admin-input" name="eventStartsAt" type="datetime-local" value="${escapeHtml(
          localDateTimeInputValue(schedule.eventStartsAt)
        )}" ${requiredWhenPublished} /></label>
      <label><span>${escapeHtml(state.tr('adminBohScheduleEventEnd', 'Event end'))}</span>
        <input class="boh-admin-input" name="eventEndsAt" type="datetime-local" value="${escapeHtml(
          localDateTimeInputValue(schedule.eventEndsAt)
        )}" ${requiredWhenPublished} /></label>
    </div>
    ${
      schedule.status === 'hidden'
        ? `<div class="boh-admin-schedule-hidden-warning" role="note"><strong>${escapeHtml(
            state.tr('adminBohScheduleHiddenWarningTitle', 'Hidden removes the member schedule')
          )}</strong><p>${escapeHtml(
            state.tr(
              'adminBohScheduleHiddenWarning',
              'Saving while Hidden clears the public event window, milestones, and team times. Members will see no schedule.'
            )
          )}</p></div>`
        : ''
    }
    <section class="boh-admin-schedule-section"><div><div><strong>${escapeHtml(
      state.tr('adminBohScheduleMilestones', 'Milestones')
    )}</strong><span>${escapeHtml(
      state.tr('adminBohScheduleMilestoneLimit', '{count} / 8 milestones', {
        count: schedule.milestones.length,
      })
    )}</span></div><div class="boh-admin-schedule-section-actions">
      <button type="button" class="boh-admin-button boh-admin-button-small" data-action="add-schedule-milestone" ${
        schedule.milestones.length >= MAX_EVENT_MILESTONES ? 'disabled' : ''
      }>${escapeHtml(state.tr('adminBohScheduleAddMilestone', 'Add milestone'))}</button>
      <button type="button" class="boh-admin-button boh-admin-button-small boh-admin-button-danger" data-action="clear-schedule-milestones" ${
        schedule.milestones.length ? '' : 'disabled'
      }>${escapeHtml(state.tr('adminBohScheduleClearMilestones', 'Clear all milestones'))}</button>
    </div></div><div class="boh-admin-schedule-list">
      ${schedule.milestones
        .map(
          (milestone, index) => `<div class="boh-admin-schedule-row">
            <input type="hidden" name="milestoneId" value="${escapeHtml(milestone.id)}" />
            <label><span>${escapeHtml(
              state.tr('adminBohScheduleMilestoneLabel', 'Milestone label')
            )}</span><input class="boh-admin-input" name="milestoneLabel" value="${escapeHtml(
              milestone.label
            )}" maxlength="80" ${requiredWhenPublished} /></label>
            <label><span>${escapeHtml(
              state.tr('adminBohScheduleMilestoneStartsAt', 'Milestone time')
            )}</span><input class="boh-admin-input" name="milestoneStartsAt" type="datetime-local" value="${escapeHtml(
              localDateTimeInputValue(milestone.startsAt)
            )}" ${requiredWhenPublished} /></label>
            <span class="boh-admin-schedule-row-actions">
              <button type="button" class="boh-admin-button boh-admin-button-small boh-admin-button-quiet" data-action="move-schedule-milestone" data-direction="up" data-index="${index}" ${
                index === 0 ? 'disabled' : ''
              }>${escapeHtml(state.tr('adminBohScheduleMoveMilestoneUp', 'Move earlier'))}</button>
              <button type="button" class="boh-admin-button boh-admin-button-small boh-admin-button-quiet" data-action="move-schedule-milestone" data-direction="down" data-index="${index}" ${
                index === schedule.milestones.length - 1 ? 'disabled' : ''
              }>${escapeHtml(state.tr('adminBohScheduleMoveMilestoneDown', 'Move later'))}</button>
              <button type="button" class="boh-admin-button boh-admin-button-small boh-admin-button-plan" data-action="duplicate-schedule-milestone" data-index="${index}" ${
                schedule.milestones.length >= MAX_EVENT_MILESTONES ? 'disabled' : ''
              }>${escapeHtml(state.tr('adminBohScheduleDuplicateMilestone', 'Duplicate'))}</button>
              <button type="button" class="boh-admin-button boh-admin-button-small boh-admin-button-danger" data-action="remove-schedule-milestone" data-index="${index}">${escapeHtml(
                state.tr('adminBohScheduleRemoveMilestone', 'Remove')
              )}</button>
            </span>
          </div>`
        )
        .join('')}
    </div></section>
    <section class="boh-admin-schedule-section"><div><div><strong>${escapeHtml(
      state.tr('adminBohScheduleTeamGameTimes', 'Team game times')
    )}</strong><span>${escapeHtml(
      state.tr(
        'adminBohScheduleTeamGameTimesHelp',
        'Optional starts for the current six teams; each published time must stay inside the event window.'
      )
    )}</span></div></div><div class="boh-admin-schedule-team-grid">
      ${state.snapshot.teams
        .slice(0, TEAM_COUNT)
        .map((team) => {
          const entry = schedule.teamGameTimes.find((item) => item.teamId === team.id) || {};
          return `<div class="boh-admin-schedule-team-time"><label><span>${escapeHtml(
            teamDisplayName(state, team)
          )}</span><input class="boh-admin-input" name="teamGameTime.${escapeHtml(
            team.id
          )}" type="datetime-local" value="${escapeHtml(
            localDateTimeInputValue(entry.startsAt)
          )}" /></label><button type="button" class="boh-admin-button boh-admin-button-small boh-admin-button-quiet" data-action="clear-schedule-team-time" data-team-id="${escapeHtml(
            team.id
          )}" ${entry.startsAt ? '' : 'disabled'}>${escapeHtml(
            state.tr('adminBohScheduleClearTeamTime', 'Clear time')
          )}</button></div>`;
        })
        .join('')}
    </div></section>
    ${
      errors.length
        ? `<div class="boh-admin-validation-list" data-tone="error"><strong>${escapeHtml(
            state.tr('adminBohFixFirst', 'Fix this first')
          )}</strong><ul><li>${escapeHtml(errors[0])}</li></ul></div>`
        : ''
    }
    <footer><span>${escapeHtml(
      state.tr('adminBohScheduleRevision', 'Schedule revision {revision}', { revision })
    )}</span><button type="submit" class="boh-admin-button boh-admin-button-save" ${
      errors.length ? 'disabled' : ''
    }>${escapeHtml(state.tr('adminBohScheduleSave', 'Save schedule'))}</button></footer>
  </form>`;
}

function renderPublicationCopyCard(state) {
  const source =
    state.snapshot.publicationCopy && typeof state.snapshot.publicationCopy === 'object'
      ? state.snapshot.publicationCopy
      : {};
  const copy = {
    eventName: cleanText(source.eventName),
    title: cleanText(source.title),
    subtitle: cleanText(source.subtitle),
    message: cleanText(source.message),
  };
  const previewRows = [
    copy.eventName
      ? `<p class="boh-admin-publication-copy-event">${escapeHtml(copy.eventName)}</p>`
      : '',
    copy.title ? `<h5>${escapeHtml(copy.title)}</h5>` : '',
    copy.subtitle ? `<p>${escapeHtml(copy.subtitle)}</p>` : '',
    copy.message ? `<blockquote>${escapeHtml(copy.message)}</blockquote>` : '',
  ].filter(Boolean);
  return `<form class="boh-admin-card boh-admin-publication-copy" data-form="publication-copy" aria-labelledby="bohPublicationCopyTitle">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohAnnouncementComposerKicker', 'ANNOUNCEMENT COMPOSER')
    )}</p><h4 id="bohPublicationCopyTitle">${escapeHtml(
      state.tr('adminBohAnnouncementComposerTitle', 'Shape the public announcement')
    )}</h4><p>${escapeHtml(
      state.tr(
        'adminBohAnnouncementComposerHelp',
        'Save player-safe copy to this private draft. Nothing goes live until you publish the selected scope below.'
      )
    )}</p></div><span class="boh-admin-status-chip" data-status="draft">${escapeHtml(
      state.tr('adminBohDraftOnly', 'Draft only')
    )}</span></header>
    <div class="boh-admin-publication-copy-grid">
      <label><span>${escapeHtml(state.tr('adminBohEventLabel', 'Event label'))}</span>
        <input class="boh-admin-input" name="eventName" maxlength="160" value="${escapeHtml(copy.eventName)}" placeholder="All-Star BoH 2026" /></label>
      <label><span>${escapeHtml(state.tr('adminBohAnnouncementTitle', 'Announcement title'))}</span>
        <input class="boh-admin-input" name="title" maxlength="160" value="${escapeHtml(copy.title)}" placeholder="Teams are ready" /></label>
      <label class="boh-admin-publication-copy-wide"><span>${escapeHtml(
        state.tr('adminBohAnnouncementSubtitle', 'Subtitle')
      )}</span><input class="boh-admin-input" name="subtitle" maxlength="240" value="${escapeHtml(
        copy.subtitle
      )}" placeholder="A short line players see under the title" /></label>
      <label class="boh-admin-publication-copy-wide"><span>${escapeHtml(
        state.tr('adminBohLeadershipMessage', 'Leadership message')
      )}</span><textarea class="boh-admin-input" name="message" maxlength="2000" rows="4" placeholder="Add final reminders, expectations, or encouragement.">${escapeHtml(
        copy.message
      )}</textarea></label>
    </div>
    <section class="boh-admin-publication-copy-preview" aria-label="${escapeHtml(
      state.tr('adminBohAnnouncementCopyPreview', 'Announcement copy preview')
    )}"><span>${escapeHtml(state.tr('adminBohSavedCopyPreview', 'SAVED COPY PREVIEW'))}</span>
      ${
        previewRows.length
          ? previewRows.join('')
          : `<p>${escapeHtml(
              state.tr('adminBohAnnouncementCopyEmpty', 'No optional announcement copy saved yet.')
            )}</p>`
      }
    </section>
    <footer class="boh-admin-form-actions">
      <button type="button" class="boh-admin-button boh-admin-button-quiet" data-action="clear-publication-copy-message">${escapeHtml(
        state.tr('adminBohClearAnnouncementMessage', 'Clear subtitle + message')
      )}</button>
      <button type="submit" class="boh-admin-button boh-admin-button-save">${escapeHtml(
        state.tr('adminBohSaveAnnouncementDraft', 'Save announcement draft')
      )}</button>
    </footer>
  </form>`;
}

function renderPublish(state) {
  const readiness = Object.fromEntries(
    ['announcement', 'plan'].map((kind) => {
      const local = deriveValidation(state, kind);
      const revision = revisionValidation(state, kind);
      const external = state.snapshot.validation?.[kind] || {};
      const errors = [
        ...local.errors,
        ...list(external.errors).map((item) => cleanText(item?.message || item)),
      ];
      const warnings = [
        ...local.warnings,
        ...list(external.warnings).map((item) => cleanText(item?.message || item)),
      ];
      return [kind, { errors, warnings, revision, ready: errors.length === 0 && revision.valid }];
    })
  );
  return `
    <header class="boh-admin-stage-header">
      <div><p class="boh-admin-eyebrow">${escapeHtml(state.tr('adminBohStageFive', 'STAGE 5 OF 5'))}</p>
        <h3>${escapeHtml(stageLabel(state, 'publish'))}</h3>
        <p>${escapeHtml(
          state.tr(
            'adminBohPublishHelp',
            'Validate the exact draft revision, inspect the player-safe preview, then publish the selected scope in one revision-aligned snapshot.'
          )
        )}</p></div>
      <button type="button" class="boh-admin-button boh-admin-button-validate" data-action="validate-revision">${escapeHtml(
        state.tr('adminBohValidateRevision', 'Validate revision {revision}', {
          revision: state.snapshot.revision,
        })
      )}</button>
    </header>
    ${renderPublicationCopyCard(state)}
    <div class="boh-admin-publish-grid">
      ${renderValidationCard(state, 'announcement', readiness.announcement)}
      ${renderValidationCard(state, 'plan', readiness.plan)}
      ${renderPublicationScopeCard(state, readiness)}
    </div>
    ${renderEventScheduleEditor(state)}
    <section class="boh-admin-card boh-admin-preview" aria-labelledby="bohPublishPreviewTitle">
      <header><div><p class="boh-admin-card-kicker">${escapeHtml(
        state.tr('adminBohSanitizedPreview', 'SANITIZED PLAYER PREVIEW')
      )}</p><h4 id="bohPublishPreviewTitle">${escapeHtml(
        state.tr('adminBohExactlyWhatPlayersSee', 'Exactly what players will see')
      )}</h4><p>${escapeHtml(
        state.tr(
          'adminBohPreviewPrivacy',
          'Private signup values, OCR notes, score overrides, and admin audit fields are excluded.'
        )
      )}</p></div>
      <fieldset class="boh-admin-segmented"><legend>${escapeHtml(
        state.tr('adminBohPreviewType', 'Preview type')
      )}</legend>
        <button type="button" data-action="preview-kind" data-kind="announcement" aria-pressed="${
          state.previewKind === 'announcement'
        }">${escapeHtml(state.tr('adminBohAnnouncement', 'Announcement'))}</button>
        <button type="button" data-action="preview-kind" data-kind="plan" aria-pressed="${
          state.previewKind === 'plan'
        }">${escapeHtml(state.tr('adminBohTeamPlan', 'Team plan'))}</button>
      </fieldset></header>
      ${state.previewKind === 'plan' ? renderPlanPreview(state) : renderAnnouncementPreview(state)}
    </section>`;
}

function renderValidationCard(state, kind, readiness) {
  const { errors, warnings, revision } = readiness;
  const title = state.tr(
    kind === 'announcement' ? 'adminBohAnnouncementReadiness' : 'adminBohPlanReadiness',
    kind === 'announcement' ? 'Announcement readiness' : 'Plan readiness'
  );
  return `<section class="boh-admin-card boh-admin-validation" data-ready="${errors.length === 0 && revision.valid}">
    <header><div><p class="boh-admin-card-kicker">${escapeHtml(
      state.tr('adminBohReleaseGate', 'RELEASE GATE')
    )}</p><h4>${escapeHtml(title)}</h4></div>
      <span class="boh-admin-status-chip" data-status="${revision.valid ? 'confirmed' : 'pending'}">${escapeHtml(
        revision.valid
          ? state.tr('adminBohValidated', 'Validated')
          : state.tr('adminBohNotValidated', 'Not validated')
      )}</span></header>
    <dl><div><dt>${escapeHtml(state.tr('adminBohCurrentRevision', 'Current draft'))}</dt><dd>${state.snapshot.revision}</dd></div>
      <div><dt>${escapeHtml(state.tr('adminBohValidatedRevision', 'Validated revision'))}</dt><dd>${
        revision.validatedRevision >= 0 ? revision.validatedRevision : '—'
      }</dd></div></dl>
    ${
      errors.length
        ? `<div class="boh-admin-validation-list" data-tone="error"><strong>${escapeHtml(
            state.tr('adminBohBlockingIssues', 'Blocking issues')
          )}</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul></div>`
        : `<p class="boh-admin-check-line">Ready: ${escapeHtml(
            state.tr('adminBohLocalChecksPassed', 'Local structure checks passed.')
          )}</p>`
    }
    ${
      warnings.length
        ? `<div class="boh-admin-validation-list" data-tone="warning"><strong>${escapeHtml(
            state.tr('adminBohWarnings', 'Warnings')
          )}</strong><ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></div>`
        : ''
    }
  </section>`;
}

function publicationRecord(state, kind) {
  return state.snapshot.publications?.[kind] || {};
}

function renderPublicationScopeCard(state, readiness) {
  const announcementLive = publicationRecord(state, 'announcement').status === 'published';
  const planLive = publicationRecord(state, 'plan').status === 'published';
  const selected = ['announcement', 'plan', 'both'].includes(state.publishScope)
    ? state.publishScope
    : 'both';
  const announcementDisabled = planLive;
  const planDisabled = !announcementLive;
  const selectedReady =
    selected === 'announcement'
      ? readiness.announcement.ready && !announcementDisabled
      : selected === 'plan'
        ? readiness.plan.ready && !planDisabled
        : readiness.plan.ready;
  const scopeLabel =
    selected === 'announcement'
      ? state.tr('adminBohPublishTeamListOnly', 'Team list only')
      : selected === 'plan'
        ? state.tr('adminBohPublishPlanOnly', 'Plan update only')
        : state.tr('adminBohPublishBoth', 'Team list + plan');
  const scopeOptions = [
    {
      id: 'announcement',
      label: state.tr('adminBohPublishTeamListOnly', 'Team list only'),
      description: state.tr(
        'adminBohPublishTeamListOnlyHelp',
        'Publish assignments without personal plan instructions.'
      ),
      disabled: announcementDisabled,
    },
    {
      id: 'plan',
      label: state.tr('adminBohPublishPlanOnly', 'Plan update only'),
      description: state.tr(
        'adminBohPublishPlanOnlyHelp',
        'Update the plan while keeping the already-live team list visible.'
      ),
      disabled: planDisabled,
    },
    {
      id: 'both',
      label: state.tr('adminBohPublishBoth', 'Team list + plan'),
      description: state.tr(
        'adminBohPublishBothHelp',
        'Publish assignments and personal instructions together in one transaction.'
      ),
      disabled: false,
    },
  ];
  return (
    '<form class="boh-admin-card boh-admin-publication boh-admin-publication-scope" data-form="publish-scope">' +
    '<header><div><p class="boh-admin-card-kicker">' +
    escapeHtml(state.tr('adminBohPublicationScopeKicker', 'PUBLICATION SCOPE')) +
    '</p><h4>' +
    escapeHtml(state.tr('adminBohChoosePublishScope', 'Choose what goes live')) +
    '</h4><p>' +
    escapeHtml(
      state.tr(
        'adminBohPublishSnapshotCaveat',
        'All scopes publish one revision-aligned snapshot. A plan update retains team-list visibility but uses the current draft assignments.'
      )
    ) +
    '</p></div><span class="boh-admin-status-chip" data-status="' +
    (planLive ? 'live' : announcementLive ? 'published' : 'draft') +
    '">' +
    escapeHtml(
      planLive
        ? state.tr('adminBohLive', 'Live')
        : announcementLive
          ? state.tr('adminBohTeamListLive', 'Team list live')
          : state.tr('adminBohDraft', 'Draft')
    ) +
    '</span></header>' +
    '<fieldset class="boh-admin-publish-scope-options"><legend>' +
    escapeHtml(state.tr('adminBohPublicationScope', 'Publication scope')) +
    '</legend>' +
    scopeOptions
      .map(
        (option) =>
          '<label data-disabled="' +
          option.disabled +
          '"><input type="radio" name="scope" value="' +
          option.id +
          '" data-action="publish-scope" ' +
          (selected === option.id ? 'checked ' : '') +
          (option.disabled ? 'disabled ' : '') +
          '/><span><strong>' +
          escapeHtml(option.label) +
          '</strong><small>' +
          escapeHtml(option.description) +
          '</small></span></label>'
      )
      .join('') +
    '</fieldset>' +
    (announcementDisabled
      ? '<p class="boh-admin-publication-note">' +
        escapeHtml(
          state.tr(
            'adminBohTeamOnlyProtected',
            'Team-list-only publishing is disabled while a player plan is live.'
          )
        ) +
        '</p>'
      : '') +
    (planDisabled
      ? '<p class="boh-admin-publication-note">' +
        escapeHtml(
          state.tr(
            'adminBohPlanNeedsTeamList',
            'Plan update only becomes available after the team list is live. Use Team list + plan for the first combined release.'
          )
        ) +
        '</p>'
      : '') +
    '<label class="boh-admin-confirm"><input type="checkbox" name="confirmed" required /><span>' +
    escapeHtml(
      state.tr(
        'adminBohPublishConfirmation',
        'I reviewed the sanitized preview for revision {revision}.',
        { revision: state.snapshot.revision }
      )
    ) +
    '</span></label>' +
    '<button type="submit" class="boh-admin-button boh-admin-button-publish" ' +
    (selectedReady ? '' : 'disabled') +
    '>' +
    escapeHtml(state.tr('adminBohPublishSelectedScope', 'Publish {scope}', { scope: scopeLabel })) +
    '</button></form>'
  );
}

function renderAnnouncementPreview(state) {
  return `<div class="boh-admin-announcement-preview">
    ${state.snapshot.teams
      .map(
        (team) =>
          `<section><h5>${escapeHtml(teamDisplayName(state, team))}</h5><ol>${team.seats
            .map((seat) => {
              const role = state.snapshot.plan.roleGroups.find(
                (item) => item.id === seat.roleGroupId
              );
              return `<li><span>${seat.seatNumber}</span><strong>${escapeHtml(
                seat.displayName ||
                  playerName(playerById(state, seat.playerId)) ||
                  state.tr('adminBohUnassigned', 'Unassigned')
              )}</strong><small>${escapeHtml(roleDisplayName(state, role))}</small></li>`;
            })
            .join('')}</ol></section>`
      )
      .join('')}
  </div>`;
}

function renderPlanPreview(state) {
  const teams = state.snapshot.teams;
  const team =
    teams.find((candidate) => candidate.id === state.selectedPreviewTeamId) || teams[0] || null;
  const assignedSeats = list(team?.seats).filter((seat) => seat.playerId);
  const seat =
    assignedSeats.find((candidate) => candidate.playerId === state.selectedPreviewPlayerId) ||
    assignedSeats[0] ||
    null;
  state.selectedPreviewTeamId = team?.id || '';
  state.selectedPreviewPlayerId = seat?.playerId || '';
  const phases = state.snapshot.plan.phases;
  const legions = state.snapshot.plan.legions;
  const role = state.snapshot.plan.roleGroups.find((item) => item.id === seat?.roleGroupId);
  const captainSeat = team?.seats.find((item) => item.playerId === team.captainId);
  const previewRuleSources = [
    ...state.snapshot.plan.instructions,
    ...list(state.snapshot.plan.roleDefaults),
    ...list(state.snapshot.plan.seatOverrides),
    ...list(state.snapshot.plan.playerOverrides),
  ];
  const uniquePreviewRules = new Map(
    previewRuleSources.map((item, index) => [cleanText(item.id) || `preview-rule-${index}`, item])
  );
  const previewRules = [...uniquePreviewRules.values()].map((item) => ({
    ...item,
    instruction:
      item.instruction && typeof item.instruction === 'object'
        ? item.instruction
        : {
            summary: cleanText(item.instruction),
            action: cleanText(item.action),
            startObjectiveId: cleanText(item.startObjectiveId),
            objectiveId: cleanText(item.objectiveId),
            targetLabel: cleanText(item.objectiveCode),
            viaObjectiveIds: list(item.viaObjectiveIds),
            pathObjectiveIds: list(item.pathObjectiveIds),
            loadout: cleanText(item.loadout),
            teleport: item.teleport,
            note: cleanText(item.note),
          },
  }));
  const previewPlan = {
    ...state.snapshot.plan,
    instructions: previewRules.filter((item) => item.scope === 'global' || item.scopeId === '*'),
    roleDefaults: previewRules.filter((item) => item.scope === 'role'),
    seatOverrides: previewRules.filter((item) => item.scope === 'seat'),
    playerOverrides: previewRules.filter((item) => item.scope === 'player'),
  };
  const timeline = phases.map((phase) => ({
    phase,
    legions: legions.map((legion) => {
      let instruction = {};
      if (team && seat) {
        try {
          instruction = BohModel.resolveBohInstruction(previewPlan, {
            teamId: team.id,
            phaseId: phase.id,
            legionId: legion.id,
            roleGroupId: seat.roleGroupId,
            seatNumber: seat.seatNumber,
            playerId: seat.playerId,
          }).instruction;
        } catch {
          instruction = {};
        }
      }
      return { legion, instruction };
    }),
  }));
  const referencedObjectiveIds = new Set(
    timeline.flatMap(({ legions: phaseLegions }) =>
      phaseLegions.flatMap(({ instruction }) => [
        instruction.startObjectiveId,
        ...list(instruction.viaObjectiveIds),
        ...list(instruction.pathObjectiveIds),
        instruction.objectiveId,
      ])
    )
  );
  const objectives = state.snapshot.plan.objectives.filter((objective) =>
    referencedObjectiveIds.has(objective.id)
  );
  const instructionText = (instruction) =>
    [
      instruction.action,
      instruction.summary,
      instruction.note,
      instruction.loadout,
      instruction.teleport,
    ]
      .map(cleanText)
      .filter(Boolean)
      .join(' · ');
  return `<div class="boh-admin-player-preview">
    <div class="boh-admin-field-pair">
      <label><span>${escapeHtml(state.tr('adminBohTeam', 'Team'))}</span>
        <select class="boh-admin-select" data-action="preview-team">
          ${teams
            .map(
              (candidate) =>
                `<option value="${escapeHtml(candidate.id)}" ${candidate.id === team?.id ? 'selected' : ''}>${escapeHtml(
                  teamDisplayName(state, candidate)
                )}</option>`
            )
            .join('')}
        </select>
      </label>
      <label><span>${escapeHtml(state.tr('adminBohPlayer', 'Player'))}</span>
        <select class="boh-admin-select" data-action="preview-player" ${assignedSeats.length ? '' : 'disabled'}>
          ${
            assignedSeats.length
              ? assignedSeats
                  .map(
                    (candidate) =>
                      `<option value="${escapeHtml(candidate.playerId)}" ${candidate.playerId === seat?.playerId ? 'selected' : ''}>${escapeHtml(
                        candidate.displayName ||
                          playerName(playerById(state, candidate.playerId)) ||
                          candidate.playerId
                      )}</option>`
                  )
                  .join('')
              : `<option value="">${escapeHtml(
                  state.tr('adminBohNoAssignedPlayers', 'No assigned players')
                )}</option>`
          }
        </select>
      </label>
    </div>
    <header><span>${escapeHtml(state.tr('adminBohPreviewExample', 'PLAYER VIEW EXAMPLE'))}</span>
      <h5>${escapeHtml(
        seat?.displayName ||
          playerName(playerById(state, seat?.playerId)) ||
          state.tr('adminBohTeamPlan', 'Team plan')
      )}</h5>
      <p>${escapeHtml(
        state.tr(
          'adminBohPreviewInstruction',
          'Players see a phase timeline and only the instructions relevant to their assignment.'
        )
      )}</p></header>
    <dl class="boh-admin-stat-grid">
      <div><dt>${escapeHtml(state.tr('adminBohTeam', 'Team'))}</dt><dd>${escapeHtml(
        teamDisplayName(state, team)
      )}</dd></div>
      <div><dt>${escapeHtml(state.tr('adminBohSeat', 'Seat'))}</dt><dd>${escapeHtml(
        seat?.seatNumber || '—'
      )}</dd></div>
      <div><dt>${escapeHtml(state.tr('adminBohRoleGroup', 'Role'))}</dt><dd>${escapeHtml(
        roleDisplayName(state, role) || state.tr('adminBohRoleUnassigned', 'Role unassigned')
      )}</dd></div>
      <div><dt>${escapeHtml(state.tr('adminBohCaptain', 'Captain'))}</dt><dd>${escapeHtml(
        captainSeat?.displayName ||
          playerName(playerById(state, captainSeat?.playerId)) ||
          state.tr('adminBohNotAssigned', 'Not assigned')
      )}</dd></div>
    </dl>
    <ol class="boh-admin-preview-timeline">${timeline
      .map(
        ({ phase, legions: phaseLegions }) =>
          `<li><strong>${escapeHtml(phaseDisplayName(state, phase))}</strong>
            <div class="boh-admin-preview-legions">${phaseLegions
              .map(({ legion, instruction }) => {
                const text = instructionText(instruction);
                return `<span><strong>${escapeHtml(
                  legionDisplayName(state, legion)
                )}</strong><small>${escapeHtml(
                  text || state.tr('adminBohNoInstructions', 'No instructions')
                )}</small></span>`;
              })
              .join('')}</div>
          </li>`
      )
      .join('')}</ol>
    <section class="boh-admin-warning-box" data-empty="${objectives.length === 0}">
      <h5>${escapeHtml(state.tr('adminBohMapObjectives', 'Map objectives'))}</h5>
      ${
        objectives.length
          ? `<ul>${objectives
              .map(
                (objective) =>
                  `<li><strong>${escapeHtml(
                    cleanText(objective.code || objective.id)
                  )}</strong> ${escapeHtml(cleanText(objective.label))}</li>`
              )
              .join('')}</ul>`
          : `<p>${escapeHtml(
              state.tr('adminBohNoObjectivesForPlayer', 'No mapped objectives for this player.')
            )}</p>`
      }
    </section>
  </div>`;
}

function setStatus(state, message, tone = 'neutral') {
  state.status = { message: cleanText(message), tone };
  const element = document.getElementById('bohAdminStatus');
  if (!element) return;
  element.textContent = state.status.message;
  element.dataset.tone = tone;
  element.hidden = !state.status.message;
}

let confirmDialogActive = false;

function showConfirmDialog(state, message) {
  if (typeof document?.createElement !== 'function') {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    if (confirmDialogActive) {
      resolve(false);
      return;
    }
    confirmDialogActive = true;
    const existing = state.root.querySelector('.boh-admin-confirm-dialog');
    if (existing) existing.remove();
    const dialog = document.createElement('div');
    dialog.className = 'boh-admin-confirm-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'bohConfirmMsg');
    dialog.innerHTML = `<div class="boh-admin-confirm-backdrop"></div>
      <div class="boh-admin-confirm-panel" role="document">
        <p id="bohConfirmMsg">${escapeHtml(message)}</p>
        <div class="boh-admin-confirm-actions">
          <button class="boh-admin-button" data-confirm-action="cancel">${escapeHtml(state.tr('adminBohCancel', 'Cancel'))}</button>
          <button class="boh-admin-button boh-admin-button-primary" data-confirm-action="ok">${escapeHtml(state.tr('adminBohConfirm', 'Confirm'))}</button>
        </div>
      </div>`;
    state.root.appendChild(dialog);
    const focusable = dialog.querySelectorAll('button');
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };
    const cleanup = () => {
      confirmDialogActive = false;
      dialog.remove();
      document.removeEventListener('keydown', handleKeyDown);
    };
    document.addEventListener('keydown', handleKeyDown);
    dialog.querySelector('[data-confirm-action="ok"]')?.focus();
    dialog.addEventListener('click', (e) => {
      const action = e.target.closest('button')?.dataset?.confirmAction;
      if (action === 'ok') {
        cleanup();
        resolve(true);
      } else if (action === 'cancel') {
        cleanup();
        resolve(false);
      }
    });
  });
}

function renderProgressOverlay(state) {
  const existing = state.root.querySelector('.boh-admin-progress-overlay');
  if (existing) return;
  const overlay = document.createElement('div');
  overlay.className = 'boh-admin-progress-overlay';
  overlay.innerHTML =
    '<div class="boh-admin-progress-bar"><span class="boh-admin-progress-indeterminate"></span></div>';
  overlay.setAttribute('role', 'progressbar');
  state.root.appendChild(overlay);
}

function clearDeletedSubmissionState(state, playerIds) {
  const deletedIds = new Set(list(playerIds).map(cleanText).filter(Boolean));
  for (const id of deletedIds) {
    state.selectedSubmissionIds.delete(id);
    state.correctionDrafts?.delete(id);
  }
  if (deletedIds.has(state.selectedSubmissionId)) state.selectedSubmissionId = '';
}

function formValues(form) {
  return new FormData(form);
}

function arrayValues(formData, key) {
  return formData.getAll(key).map(cleanText);
}

function correctionDraftFields(form) {
  const fields = {};
  for (const control of form?.elements || []) {
    const name = cleanText(control?.name);
    if (name && name !== 'playerId' && !hasOwn(fields, name)) fields[name] = [];
  }
  for (const [name, rawValue] of new FormData(form).entries()) {
    if (name === 'playerId') continue;
    if (!hasOwn(fields, name)) fields[name] = [];
    fields[name].push(String(rawValue ?? ''));
  }
  return fields;
}

function captureCorrectionDraft(state, form) {
  if (!form?.matches?.('[data-form="submission-corrections"]')) return null;
  const id = cleanText(new FormData(form).get('playerId'));
  if (!id) return null;
  const draft = { playerId: id, fields: correctionDraftFields(form) };
  state.correctionDrafts.set(id, draft);
  const card = form.closest('.boh-admin-correction-card');
  const dirty = card?.querySelector('.boh-admin-correction-dirty');
  if (dirty) dirty.hidden = false;
  const discard = form.querySelector('[data-action="discard-correction-draft"]');
  if (discard) discard.disabled = false;
  return draft;
}

function captureCommitmentScoreDraft(state, form) {
  if (!form?.matches?.('[data-form="commitment-scores"]')) return null;
  const scores = Object.fromEntries(
    [...form.querySelectorAll('[data-commitment-score-player]')].map((control) => [
      cleanText(control.dataset.commitmentScorePlayer),
      String(control.value ?? ''),
    ])
  );
  state.commitmentScoreDraft = {
    scores,
    reason: String(form.elements?.reason?.value ?? ''),
  };
  return state.commitmentScoreDraft;
}

function pruneCorrectionDrafts(state) {
  const ids = new Set(state.snapshot.submissions.map(playerId));
  for (const id of state.correctionDrafts.keys()) {
    if (!ids.has(id)) state.correctionDrafts.delete(id);
  }
}

function snapshotFocus(root) {
  if (!root || typeof root?.contains !== 'function')
    return { activeId: null, activeName: null, scrollLefts: {} };
  const snapshot = { activeId: null, activeName: null, scrollLefts: {} };
  let active = null;
  try {
    active = root.ownerDocument?.activeElement;
  } catch {}
  if (active && root.contains(active)) {
    snapshot.activeId = active.id || null;
    snapshot.activeName = active.name || null;
    snapshot.activeDataFocusId = active.dataset?.focusId || null;
  }
  const tableWrap = root?.querySelector?.('.boh-admin-table-wrap');
  if (tableWrap) snapshot.scrollLefts.tableWrap = tableWrap.scrollLeft;
  const teamBoard = root?.querySelector?.('.boh-admin-team-board');
  if (teamBoard) snapshot.scrollLefts.teamBoard = teamBoard.scrollLeft;
  return snapshot;
}

function restoreFocus(root, snapshot) {
  if (!snapshot || !root) return;
  // Restore scroll positions
  if (snapshot.scrollLefts) {
    const tableWrap = root.querySelector('.boh-admin-table-wrap');
    if (tableWrap && snapshot.scrollLefts.tableWrap != null)
      tableWrap.scrollLeft = snapshot.scrollLefts.tableWrap;
    const teamBoard = root.querySelector('.boh-admin-team-board');
    if (teamBoard && snapshot.scrollLefts.teamBoard != null)
      teamBoard.scrollLeft = snapshot.scrollLefts.teamBoard;
  }
  // Restore focus
  if (!snapshot.activeId && !snapshot.activeName && !snapshot.activeDataFocusId) return;
  const selector = snapshot.activeId
    ? `#${CSS.escape(snapshot.activeId)}`
    : snapshot.activeDataFocusId
      ? `[data-focus-id="${snapshot.activeDataFocusId}"]`
      : snapshot.activeName
        ? `[name="${snapshot.activeName}"]`
        : null;
  if (!selector) return;
  const el = root.querySelector(selector);
  if (el && typeof el.focus === 'function') {
    try {
      el.focus({ preventScroll: true });
    } catch {}
  }
}

function restoreCorrectionFocus(state, snapshot) {
  if (!snapshot || !correctionDraftFor(state, snapshot.playerId)) return;
  const form = state.root.querySelector('[data-form="submission-corrections"]');
  if (cleanText(form?.elements?.playerId?.value) !== snapshot.playerId) return;
  const control = [...(form?.elements || [])].filter(
    (candidate) => candidate.name === snapshot.name
  )[snapshot.index];
  if (!control || control.disabled) return;
  control.focus?.({ preventScroll: true });
  if (snapshot.selectionStart !== null && typeof control.setSelectionRange === 'function') {
    control.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  }
}

function originalCorrectionStatValue(original, key) {
  if (key === 'totalCastlePower') {
    return original?.stats?.totalCastlePower ?? original?.stats?.totalPower ?? 0;
  }
  if (key === 'heroCombatPower') {
    return original?.stats?.heroCombatPower ?? original?.stats?.heroPower ?? 0;
  }
  if (OPTIONAL_POWER_KEYS.includes(key)) return original?.stats?.[key] ?? null;
  return original?.stats?.[key] ?? 0;
}

export function buildAdminSubmissionCorrectionOverlay(submission, proposed = {}, reason = '') {
  const original = originalCorrectionSubmission(submission);
  const values = {};
  const proposedName = cleanText(proposed.gameName);
  if (!correctionValuesEqual(proposedName, original.gameName)) values.gameName = proposedName;
  for (const key of ['locale', 'timezone']) {
    const proposedValue = cleanText(proposed[key]);
    if (!correctionValuesEqual(proposedValue, cleanText(original[key]))) {
      values[key] = proposedValue;
    }
  }
  const teammates = uniqueTextList(proposed.preferredTeammates);
  if (!correctionValuesEqual(teammates, original.preferredTeammates || [])) {
    values.preferredTeammates = teammates;
  }

  const statValues = {};
  for (const key of FULL_CORRECTION_STAT_KEYS) {
    if (!hasOwn(proposed.stats, key)) continue;
    if (!correctionValuesEqual(proposed.stats[key], originalCorrectionStatValue(original, key))) {
      statValues[key] = proposed.stats[key];
    }
  }
  for (const key of [
    't9TroopTypes',
    't10TroopTypes',
    'readySpeedHeroes',
    'troopRoster',
    'usableHeroNames',
  ]) {
    const proposedValue = uniqueTextList(proposed.stats?.[key]);
    const originalValue = uniqueTextList(original.stats?.[key]);
    if (!correctionValuesEqual(proposedValue, originalValue)) statValues[key] = proposedValue;
  }
  const proposedResearch = proposed.stats?.researchProgressPct || {};
  const originalResearch = original.stats?.researchProgressPct || {};
  if (!correctionValuesEqual(proposedResearch, originalResearch)) {
    statValues.researchProgressPct = proposedResearch;
  }
  if (Object.keys(statValues).length) values.stats = statValues;

  const commitmentValues = {};
  for (const key of ['availability', 'preferredRole', 'secondaryRole']) {
    const proposedValue = cleanText(proposed.commitment?.[key]);
    const originalValue = cleanText(original.commitment?.[key]);
    if (!correctionValuesEqual(proposedValue, originalValue)) {
      commitmentValues[key] = proposedValue;
    }
  }
  for (const key of CORRECTION_BOOLEAN_FIELDS) {
    const proposedValue = proposed.commitment?.[key] ?? null;
    const originalValue = original.commitment?.[key] ?? null;
    if (!correctionValuesEqual(proposedValue, originalValue)) {
      commitmentValues[key] = proposedValue;
    }
  }
  for (const key of Object.keys(CORRECTION_COMMITMENT_TEXT_LIMITS)) {
    const proposedValue = cleanText(proposed.commitment?.[key]);
    const originalValue = cleanText(original.commitment?.[key]);
    if (!correctionValuesEqual(proposedValue, originalValue)) {
      commitmentValues[key] = proposedValue;
    }
  }
  for (const key of ['fightingTimeIds', 'teamNamePreferences']) {
    const proposedValue = uniqueTextList(proposed.commitment?.[key]);
    const originalValue = uniqueTextList(original.commitment?.[key]);
    if (!correctionValuesEqual(proposedValue, originalValue)) {
      commitmentValues[key] = proposedValue;
    }
  }
  if (Object.keys(commitmentValues).length) values.commitment = commitmentValues;

  if (!Object.keys(values).length) return null;
  return {
    schemaVersion: 1,
    reason: cleanText(reason),
    values,
  };
}

function correctionBooleanValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function proposedCorrectionFromForm(form) {
  const data = new FormData(form);
  const stats = {};
  for (const key of FULL_CORRECTION_STAT_KEYS) {
    const rawValue = cleanText(data.get(`correction.stats.${key}`));
    if (OPTIONAL_POWER_KEYS.includes(key)) {
      stats[key] =
        cleanText(data.get(`correction.stats.${key}.mode`)) === 'clear'
          ? null
          : rawValue === ''
            ? Number.NaN
            : Number(rawValue);
    } else {
      stats[key] = rawValue === '' ? Number.NaN : Number(rawValue);
    }
  }
  stats.t9TroopTypes = uniqueTextList(data.getAll('correction.stats.t9TroopTypes'));
  stats.t10TroopTypes = uniqueTextList(data.getAll('correction.stats.t10TroopTypes'));
  stats.readySpeedHeroes = uniqueTextList(data.getAll('correction.stats.readySpeedHeroes'));
  stats.troopRoster = uniqueTextList(serializeCorrectionTroopRows(form));
  stats.usableHeroNames = uniqueTextList(data.getAll('correction.stats.usableHeroNames'));
  stats.researchProgressPct = {};
  for (const control of form.querySelectorAll('[data-research-id]')) {
    const rawValue = cleanText(control.value);
    if (rawValue !== '')
      stats.researchProgressPct[cleanText(control.dataset.researchId)] = Number(rawValue);
  }
  const commitment = {
    availability: cleanText(data.get('correction.commitment.availability')),
    preferredRole: cleanText(data.get('correction.commitment.preferredRole')),
    secondaryRole: cleanText(data.get('correction.commitment.secondaryRole')),
    fightingTimeIds: uniqueTextList(data.getAll('correction.commitment.fightingTimeIds')),
    teamNamePreferences: uniqueTextList(data.getAll('correction.commitment.teamNamePreferences')),
  };
  for (const key of CORRECTION_BOOLEAN_FIELDS) {
    commitment[key] = correctionBooleanValue(data.get(`correction.commitment.${key}`));
  }
  for (const key of Object.keys(CORRECTION_COMMITMENT_TEXT_LIMITS)) {
    commitment[key] = cleanText(data.get(`correction.commitment.${key}`));
  }
  return {
    playerId: cleanText(data.get('playerId')),
    reason: cleanText(data.get('correction.reason')),
    proposed: {
      gameName: cleanText(data.get('correction.gameName')),
      locale: cleanText(data.get('correction.locale')),
      timezone: cleanText(data.get('correction.timezone')),
      preferredTeammates: uniqueTextList(data.getAll('correction.preferredTeammates')),
      stats,
      commitment,
    },
  };
}

function correctionControl(form, name) {
  const entry = form?.elements?.namedItem?.(name);
  if (entry && typeof entry.setCustomValidity === 'function') return entry;
  return [...(form?.elements || [])].find((control) => control.name === name) || null;
}

function invalidateCorrectionControl(state, control, message) {
  if (!control) return false;
  control.setCustomValidity?.(message);
  control.setAttribute?.('aria-invalid', 'true');
  setStatus(state, message, 'error');
  control.focus?.();
  control.reportValidity?.();
  return false;
}

function validateCorrectionForm(state, form, submission, parsed) {
  clearCorrectionValidity(form);
  const original = originalCorrectionSubmission(submission);
  const { proposed } = parsed;
  if (!proposed.gameName) {
    return invalidateCorrectionControl(
      state,
      correctionControl(form, 'correction.gameName'),
      state.tr('adminBohCorrectionNameRequired', 'Player name is required.')
    );
  }
  for (const key of FULL_CORRECTION_STAT_KEYS) {
    const value = proposed.stats[key];
    if (OPTIONAL_POWER_KEYS.includes(key) && value === null) continue;
    const maximum = CORRECTION_NUMBER_LIMITS[key];
    if (!Number.isInteger(value) || value < 0 || value > maximum) {
      return invalidateCorrectionControl(
        state,
        correctionControl(form, `correction.stats.${key}`),
        state.tr('adminBohCorrectionNumberInvalid', 'Enter a whole number from 0 to {maximum}.', {
          maximum,
        })
      );
    }
  }
  if (proposed.preferredTeammates.length > BohModel.BOH_MAX_PREFERRED_TEAMMATES) {
    return invalidateCorrectionControl(
      state,
      correctionControl(form, 'correction.preferredTeammates'),
      state.tr('adminBohCorrectionTeammatesInvalid', 'Choose no more than six teammates.')
    );
  }
  if (
    proposed.preferredTeammates.some(
      (name) => planningValueKey(name) === planningValueKey(proposed.gameName)
    )
  ) {
    return invalidateCorrectionControl(
      state,
      correctionControl(form, 'correction.preferredTeammates'),
      state.tr('adminBohCorrectionSelfTeammate', 'A player cannot list their own account name.')
    );
  }
  const rosterRows = [...form.querySelectorAll('[data-correction-troop-row]')];
  const serializedRoster = serializeCorrectionTroopRows(form);
  for (const row of rosterRows) {
    const control = row.querySelector('[name="correction.troop.count"]');
    const count = cleanText(control?.value);
    if (
      count &&
      (!Number.isInteger(Number(count)) || Number(count) < 0 || Number(count) > 9_999_999_999)
    ) {
      return invalidateCorrectionControl(
        state,
        control,
        state.tr(
          'adminBohCorrectionTroopCountInvalid',
          'Troop count must be a whole number from 0 to 9,999,999,999.'
        )
      );
    }
  }
  if (serializedRoster.some((row) => !CORRECTION_TROOP_ROW_PATTERN.test(row))) {
    return invalidateCorrectionControl(
      state,
      rosterRows[0]?.querySelector('[name="correction.troop.count"]'),
      state.tr('adminBohCorrectionTroopRowInvalid', 'Use a valid structured troop row.')
    );
  }
  if (new Set(serializedRoster).size !== serializedRoster.length) {
    return invalidateCorrectionControl(
      state,
      rosterRows[0]?.querySelector('[name="correction.troop.count"]'),
      state.tr('adminBohCorrectionTroopRowDuplicate', 'Remove duplicate troop rows.')
    );
  }
  if (rosterRows.length > 60) {
    return invalidateCorrectionControl(
      state,
      rosterRows[0]?.querySelector('[name="correction.troop.count"]'),
      state.tr('adminBohCorrectionTroopRowsTooMany', 'Use no more than 60 troop rows.')
    );
  }
  if (proposed.stats.usableHeroNames.length > BohModel.BOH_MAX_USABLE_HERO_NAMES) {
    return invalidateCorrectionControl(
      state,
      correctionControl(form, 'correction.stats.usableHeroNames'),
      state.tr('adminBohCorrectionHeroesTooMany', 'Choose no more than 78 usable heroes.')
    );
  }
  for (const control of form.querySelectorAll('[data-research-id]')) {
    if (cleanText(control.value) === '') continue;
    const progress = Number(control.value);
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      return invalidateCorrectionControl(
        state,
        control,
        state.tr('adminBohCorrectionResearchInvalid', 'Research progress must be 0 to 100.')
      );
    }
  }
  const { commitment } = proposed;
  if (
    commitment.preferredRole &&
    commitment.secondaryRole &&
    commitment.preferredRole === commitment.secondaryRole
  ) {
    return invalidateCorrectionControl(
      state,
      correctionControl(form, 'correction.commitment.secondaryRole'),
      state.tr('adminBohCorrectionRolesDiffer', 'Primary and secondary roles must be different.')
    );
  }
  const fightingChanged = !correctionValuesEqual(
    commitment.fightingTimeIds,
    uniqueTextList(original.commitment?.fightingTimeIds)
  );
  if (
    fightingChanged &&
    (commitment.fightingTimeIds.length !== 2 ||
      commitment.fightingTimeIds.some((id) => !BohModel.BOH_FIGHTING_TIME_IDS.includes(id)))
  ) {
    return invalidateCorrectionControl(
      state,
      form.querySelector('[name="correction.commitment.fightingTimeIds"]'),
      state.tr(
        'adminBohCorrectionFightingTimesInvalid',
        'Choose exactly two current fighting slots: +12, +14, or +16.'
      )
    );
  }
  if (commitment.vts1097Member === false) {
    for (const [key, message] of [
      [
        'contactNumber',
        state.tr(
          'adminBohCorrectionContactRequired',
          'Contact number is required for a non-VTS player.'
        ),
      ],
      [
        'currentState',
        state.tr(
          'adminBohCorrectionStateRequired',
          'Current state is required for a non-VTS player.'
        ),
      ],
      [
        'joinReason',
        state.tr(
          'adminBohCorrectionJoinReasonRequired',
          'Join reason is required for a non-VTS player.'
        ),
      ],
    ]) {
      if (!commitment[key]) {
        return invalidateCorrectionControl(
          state,
          correctionControl(form, `correction.commitment.${key}`),
          message
        );
      }
    }
  }
  const overlay = buildAdminSubmissionCorrectionOverlay(submission, proposed, parsed.reason);
  if (overlay && !parsed.reason) {
    return invalidateCorrectionControl(
      state,
      correctionControl(form, 'correction.reason'),
      state.tr('adminBohCorrectionReasonRequired', 'Add one reason for these corrections.')
    );
  }
  return overlay;
}

async function invokeAction(state, name, payload, successMessage) {
  if (state.pending) return null;
  const store = state.store;
  const optionAction = state.options.actions?.[name];
  const storeAction = store?.[name];
  const handler =
    typeof optionAction === 'function'
      ? optionAction
      : typeof storeAction === 'function'
        ? storeAction
        : null;
  if (!handler && typeof store?.dispatch !== 'function') {
    const error = new Error(
      state.tr('adminBohActionUnavailable', 'This admin action is not connected yet: {action}', {
        action: name,
      })
    );
    setStatus(state, error.message, 'error');
    state.options.onError?.(error, { action: name, payload });
    return null;
  }
  state.pending = true;
  state.root.setAttribute('aria-busy', 'true');
  setStatus(state, state.tr('adminBohSaving', 'Saving…'), 'loading');
  renderProgressOverlay(state);
  try {
    const command = { ...payload, expectedRevision: state.snapshot.revision };
    const result = handler
      ? await Promise.resolve(handler.call(store || state.options.actions, command, state.snapshot))
      : await Promise.resolve(
          store.dispatch({
            type: name,
            payload: command,
            expectedRevision: state.snapshot.revision,
          })
        );
    if (result?.snapshot) state.snapshot = normalizeSnapshot(result.snapshot);
    else await refreshState(state);
    state.roleDrafts = null;
    state.phaseDrafts = null;
    if (name === 'saveEventSchedule') state.scheduleDraft = null;
    if (name === 'batchReviewSubmissions') {
      list(payload.playerIds).forEach((id) => state.selectedSubmissionIds.delete(cleanText(id)));
    } else if (name === 'batchDeleteSubmissions') {
      const successfulPlayerIds = list(
        result?.result?.successfulPlayerIds ?? result?.successfulPlayerIds
      );
      clearDeletedSubmissionState(
        state,
        successfulPlayerIds.length ? successfulPlayerIds : payload.playerIds
      );
    }
    setStatus(state, successMessage || state.tr('adminBohSaved', 'Saved.'), 'success');
    state.options.onActionComplete?.({ action: name, payload: command, result });
    scheduleRender(state);
    return result;
  } catch (error) {
    if (name === 'batchReviewSubmissions') {
      list(error?.successfulPlayerIds).forEach((id) =>
        state.selectedSubmissionIds.delete(cleanText(id))
      );
    } else if (name === 'batchDeleteSubmissions') {
      clearDeletedSubmissionState(state, error?.successfulPlayerIds);
      try {
        await refreshState(state);
      } catch (refreshError) {
        state.options.onError?.(refreshError, { action: 'batchDeleteSubmissionsRefresh' });
      }
    }
    if (error?.failedPlayerIds?.length) {
      error.failedPlayerIds.forEach((id) => {
        const row = state.root.querySelector(`[data-player-id="${CSS.escape(id)}"]`);
        if (row) {
          const tr = row.closest('tr');
          if (tr) tr.dataset.error = 'true';
        }
      });
    }
    setStatus(state, error?.message || String(error), 'error');
    state.options.onError?.(error, { action: name, payload });
    return null;
  } finally {
    state.pending = false;
    state.root.setAttribute('aria-busy', 'false');
    const overlay = state.root.querySelector('.boh-admin-progress-overlay');
    if (overlay) overlay.remove();
    scheduleRender(state);
    if (state._snapshotDirty) {
      state._snapshotDirty = false;
      state.options.onSnapshot?.(state.snapshot);
    }
  }
}

async function refreshState(state, suppliedSnapshot) {
  let snapshot = suppliedSnapshot;
  if (!snapshot && typeof state.store?.refresh === 'function') {
    snapshot = await Promise.resolve(state.store.refresh());
  }
  if (!snapshot && typeof state.store?.getSnapshot === 'function') {
    snapshot = await Promise.resolve(state.store.getSnapshot());
  }
  if (!snapshot && typeof state.options.getSnapshot === 'function') {
    snapshot = await Promise.resolve(state.options.getSnapshot());
  }
  if (snapshot) state.snapshot = normalizeSnapshot(snapshot);
  pruneCorrectionDrafts(state);
  return state.snapshot;
}

function findSeat(state, teamId, seatNumber) {
  const team = state.snapshot.teams.find((item) => item.id === teamId);
  const seat = team?.seats.find((item) => item.seatNumber === integer(seatNumber));
  return team && seat ? { team, seat } : null;
}

function downloadVisibleSignupCsv(state) {
  const records = filteredSubmissions(state);
  const csv = buildSignupReviewCsv(records, {
    includeBom: true,
    ocrLabel: state.tr('adminBohCaptureOcrConfirmed', 'OCR + confirmed'),
    manualLabel: state.tr('adminBohCaptureManual', 'Manual'),
  });
  if (typeof state.options.downloadSignupReviewCsv === 'function') {
    state.options.downloadSignupReviewCsv(csv, records);
    return records.length;
  }
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'all-star-boh-signup-review.csv';
  link.click();
  URL.revokeObjectURL(url);
  return records.length;
}

function downloadEpicPlanningCsv(state) {
  const summary = buildAdminEpicShowdownPreferenceSummary(state.snapshot);
  const csv = buildEpicShowdownPlanningCsv(summary, { includeBom: true });
  if (typeof state.options.downloadEpicPlanningCsv === 'function') {
    state.options.downloadEpicPlanningCsv(csv, summary.activePlayers);
    return summary.activeCount;
  }
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'epic-showdown-planning.csv';
  link.click();
  URL.revokeObjectURL(url);
  return summary.activeCount;
}

function buildTeamBoardCsv(state) {
  const balance = teamBalance(state);
  const headers = [
    'team',
    'teamScore',
    'teamPower',
    'seat',
    'player',
    'leadership',
    'playerPower',
    'playerScore',
    'role',
    'locked',
  ];
  const rows = state.snapshot.teams.flatMap((team, index) =>
    team.seats.map((seat) => {
      const player = playerById(state, seat.playerId);
      const role = state.snapshot.plan.roleGroups.find((item) => item.id === seat.roleGroupId);
      const leadership =
        seat.playerId === team.captainId
          ? 'leader'
          : uniqueTextList(team.coLeaderIds).includes(seat.playerId)
            ? 'co-leader'
            : '';
      return [
        teamDisplayName(state, team),
        balance.scoreTotals[index] || 0,
        balance.powerTotals[index] || 0,
        seat.seatNumber,
        seat.displayName || playerName(player) || '',
        leadership,
        seat.totalCastlePower || scoreAuditTotalPower(player) || '',
        player ? scoreValue(player) : '',
        roleDisplayName(state, role) || '',
        seat.locked ? 'yes' : '',
      ];
    })
  );
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

function mapperPlanExportError(message) {
  const error = new Error(message);
  error.code = 'boh-mapper-plan-export-incomplete';
  return error;
}

export function buildAdminAllStarBohMapperPlanBundle(snapshot, savedAt = new Date().toISOString()) {
  const teams = list(snapshot?.teams);
  if (teams.length !== TEAM_COUNT) {
    throw mapperPlanExportError('Export needs exactly six draft teams.');
  }
  const names = new Map(
    list(snapshot?.submissions).map((submission) => [playerId(submission), playerName(submission)])
  );
  const plans = teams.map((team) => {
    const occupied = list(team.seats)
      .filter((seat) => cleanText(seat?.playerId))
      .sort((left, right) => integer(left.seatNumber) - integer(right.seatNumber));
    if (occupied.length !== ROSTER_SIZE) {
      throw mapperPlanExportError(
        `${cleanText(team.name) || cleanText(team.id)} needs 12 occupied seats before export.`
      );
    }
    const rules = list(team.plan?.playerOverrides).filter((rule) =>
      cleanText(rule?.id).startsWith('mapper-plan-v2-')
    );
    const players = occupied.map((seat, index) => {
      const roleKeyRaw = cleanText(seat.roleGroupId).toLocaleLowerCase('en');
      const roleKey = roleKeyRaw === 'bot' ? 'bottom' : roleKeyRaw;
      if (!['offensive', 'top', 'bottom', 'rune'].includes(roleKey)) {
        throw mapperPlanExportError(
          `${cleanText(seat.displayName) || seat.playerId} needs a supported mapper role.`
        );
      }
      const phases = BOH_STAGE1_PHASES.map((phase, phaseIndex) => {
        const phaseRules = BOH_STAGE1_LEGIONS.map((legion) =>
          rules.find(
            (rule) =>
              cleanText(rule.playerId) === cleanText(seat.playerId) &&
              cleanText(rule.phaseId) === phase.id &&
              cleanText(rule.legionId) === legion.id
          )
        );
        if (phaseRules.some((rule) => !cleanText(rule?.instruction?.action))) {
          throw mapperPlanExportError(
            `${cleanText(seat.displayName) || seat.playerId} is missing a phase instruction.`
          );
        }
        const firstInstruction = phaseRules[0].instruction || {};
        return {
          time: ['0-5', '5-10', '10-15', '15-30', '30-60'][phaseIndex],
          stageRole: cleanText(firstInstruction.summary) || `Follow ${roleKey} assignment`,
          legion1: cleanText(phaseRules[0].instruction.action),
          legion2: cleanText(phaseRules[1].instruction.action),
          note: cleanText(firstInstruction.note || firstInstruction.teleport),
        };
      });
      const roleDescription =
        cleanText(
          rules.find((rule) => cleanText(rule.playerId) === cleanText(seat.playerId))?.instruction
            ?.target
        ) || `Stage-1 ${roleKey} role`;
      return {
        scoreRank: index + 1,
        name: cleanText(seat.displayName) || names.get(cleanText(seat.playerId)) || seat.playerId,
        locale: '',
        score: Number.isFinite(Number(seat.score)) ? Number(seat.score) : 0,
        power: Number.isFinite(Number(seat.totalCastlePower)) ? Number(seat.totalCastlePower) : 0,
        roleKey,
        role: {
          label: cleanText(seat.roleLabel) || roleKey,
          description: roleDescription,
        },
        phases,
      };
    });
    return {
      format: BOH_MAPPER_PLAN_IMPORT_FORMAT,
      version: BOH_MAPPER_PLAN_IMPORT_VERSION,
      savedAt,
      team: {
        id: cleanText(team.id),
        name: cleanText(team.name) || cleanText(team.id),
        score: players.reduce((total, player) => total + player.score, 0),
        power: players.reduce((total, player) => total + player.power, 0),
        displayLocale: '',
        dominantPlayerLocale: '',
      },
      rule: '',
      buildFocus: { center: '', top: '', bottom: '', rune: '' },
      titleBadges: [],
      players,
    };
  });
  return {
    format: BOH_MAPPER_PLAN_BUNDLE_FORMAT,
    version: BOH_MAPPER_PLAN_BUNDLE_VERSION,
    savedAt,
    plans,
  };
}

function downloadMapperPlanBundle(state) {
  const bundle = buildAdminAllStarBohMapperPlanBundle(state.snapshot);
  const json = JSON.stringify(bundle, null, 2) + '\n';
  if (typeof state.options.downloadMapperPlanBundle === 'function') {
    state.options.downloadMapperPlanBundle(json, bundle);
    return bundle.plans.length;
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'all-star-boh-stage1-role-plan-bundle.json';
  link.click();
  URL.revokeObjectURL(url);
  return bundle.plans.length;
}

function downloadTeamBoardCsv(state) {
  const csv = buildTeamBoardCsv(state);
  if (typeof state.options.downloadTeamBoardCsv === 'function') {
    state.options.downloadTeamBoardCsv(csv, state.snapshot.teams);
    return state.snapshot.teams.length;
  }
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'all-star-boh-teams.csv';
  link.click();
  URL.revokeObjectURL(url);
  return state.snapshot.teams.length;
}

function loadHtml2CanvasForBoh() {
  if (typeof window.html2canvas === 'function') return Promise.resolve(window.html2canvas);
  const existing = document.querySelector('script[data-html2canvas-loader="true"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.html2canvas), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load html2canvas.')), {
        once: true,
      });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.dataset.html2canvasLoader = 'true';
    script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
    script.onload = () => {
      if (typeof window.html2canvas === 'function') resolve(window.html2canvas);
      else reject(new Error('html2canvas loaded without exposing window.html2canvas'));
    };
    script.onerror = () => reject(new Error('Could not load html2canvas.'));
    document.head.appendChild(script);
  });
}

async function downloadTeamBoardPng(state, mode = 'scores') {
  const normalizedMode = mode === 'roles' ? 'roles' : 'scores';
  const target = state.root.querySelector(`[data-team-export-card="${normalizedMode}"]`);
  if (!target) throw new Error('Team export card is unavailable.');
  if (typeof state.options.downloadTeamBoardPng === 'function') {
    state.options.downloadTeamBoardPng(target, state.snapshot.teams, normalizedMode);
    return state.snapshot.teams.length;
  }
  const html2canvas = await loadHtml2CanvasForBoh();
  const canvas = await html2canvas(target, {
    backgroundColor: '#0b1020',
    scale: 2,
    useCORS: true,
    allowTaint: false,
  });
  const link = document.createElement('a');
  link.download = `all-star-boh-teams-${normalizedMode}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  return state.snapshot.teams.length;
}

async function handleClick(state, event) {
  const button = event.target.closest('button');
  if (!button || !state.root.contains(button) || button.disabled) return;
  const action = button.dataset.action;
  if (!action) return;
  if (action === 'team-board-density') {
    state.teamBoardDensity = button.dataset.value === 'compact' ? 'compact' : 'comfortable';
    saveTeamWorkspaceView(state);
    renderShell(state);
    return;
  }
  if (action === 'team-board-columns') {
    const columns = Number(button.dataset.value);
    if (![1, 2, 3].includes(columns)) return;
    state.teamBoardColumns = columns;
    saveTeamWorkspaceView(state);
    renderShell(state);
    return;
  }

  if (action === 'edit-player-values') {
    state.playerValueEditor = {
      teamId: cleanText(button.dataset.teamId),
      seatNumber: integer(button.dataset.seatNumber),
    };
    renderShell(state);
    state.root.querySelector('.boh-admin-player-editor__panel')?.focus?.();
    return;
  }
  if (action === 'close-player-values') {
    const focusId = state.playerValueEditor;
    state.playerValueEditor = null;
    renderShell(state);
    state.root
      .querySelector(
        `[data-action="edit-player-values"][data-team-id="${CSS.escape(focusId?.teamId || '')}"][data-seat-number="${integer(focusId?.seatNumber)}"]`
      )
      ?.focus?.();
    return;
  }
  if (action === 'clear-player-score-override') {
    const result = await invokeAction(
      state,
      'removeScoreOverride',
      { playerId: cleanText(button.dataset.playerId) },
      state.tr('adminBohScoreOverrideCleared', 'Base score override cleared.')
    );
    if (result !== null) renderShell(state);
    return;
  }
  if (action === 'export-mapper-plan-bundle') {
    const count = downloadMapperPlanBundle(state);
    setStatus(
      state,
      state.tr('adminBohExportedPlanBundle', 'Exported {count} team plans.', { count }),
      'success'
    );
    return;
  }
  if (action === 'save-mapper-role-plan') {
    const result = await invokeAction(
      state,
      'saveMapperRolePlanImport',
      {},
      state.tr(
        'adminBohRolePlanSavedDraftOnly',
        'Role plan saved to the team draft only. It has not been published.'
      )
    );
    if (result) state.mapperPlanImportPreview = null;
    renderShell(state);
    return result;
  }
  if (action === 'save-mapper-import') {
    const preview = state.mapperImportPreview;
    const result = await invokeAction(
      state,
      'saveMapperExactViewImport',
      {},
      state.tr(
        'adminBohMapperSavedDraftOnly',
        'Mapper import saved to the draft only. It has not been published.'
      )
    );
    if (result && preview) state.mapperImportPreview = { ...preview, savedToDraft: true };
    renderShell(state);
    return result;
  }
  if (action === 'select-highest-eligible') {
    selectHighestEligiblePlayers(state);
    return;
  }
  if (action === 'add-correction-troop-row') {
    const form = button.closest('[data-form="submission-corrections"]');
    const rows = form?.querySelector('[data-correction-troop-rows]');
    if (!rows || rows.children.length >= 60) return;
    rows.insertAdjacentHTML(
      'beforeend',
      renderCorrectionTroopRow(state, parseCorrectionTroopRow(''))
    );
    captureCorrectionDraft(state, form);
    rows.lastElementChild?.querySelector('[name="correction.troop.kind"]')?.focus();
    return;
  }
  if (action === 'remove-correction-troop-row') {
    const form = button.closest('[data-form="submission-corrections"]');
    const rows = form?.querySelector('[data-correction-troop-rows]');
    if (!rows) return;
    if (rows.children.length === 1) {
      rows.querySelector('[name="correction.troop.count"]').value = '';
    } else button.closest('.boh-admin-correction-troop-row')?.remove();
    captureCorrectionDraft(state, form);
    return;
  }
  if (action === 'discard-correction-draft') {
    const form = button.closest('[data-form="submission-corrections"]');
    const id = cleanText(form?.elements?.playerId?.value);
    if (!id) return;
    state.correctionDrafts.delete(id);
    renderShell(state);
    state.root
      .querySelector('[data-form="submission-corrections"] [name="correction.gameName"]')
      ?.focus();
    return;
  }
  if (action === 'signup-sort') {
    const key = cleanText(button.dataset.sortKey);
    const direction =
      state.signupSort.key === key && state.signupSort.direction === 'asc' ? 'desc' : 'asc';
    state.signupSort = { key, direction };
    renderShell(state);
    return;
  }
  if (action === 'score-audit-sort') {
    const key = cleanText(button.dataset.sortKey);
    if (!SCORE_AUDIT_SORT_KEYS.includes(key)) return;
    const direction =
      state.scoreAuditSort.key === key && state.scoreAuditSort.direction === 'asc' ? 'desc' : 'asc';
    state.scoreAuditSort = { key, direction };
    renderShell(state);
    return;
  }
  if (action === 'export-signups') {
    const count = downloadVisibleSignupCsv(state);
    setStatus(
      state,
      state.tr('adminBohExportedRows', 'Exported {count} visible signups.', { count }),
      'success'
    );
    return;
  }
  if (action === 'export-epic-planning') {
    const count = downloadEpicPlanningCsv(state);
    setStatus(
      state,
      state.tr('adminBohEpicExportedRows', 'Exported {count} active Epic players.', { count }),
      'success'
    );
    return;
  }
  if (action === 'export-team-board-csv') {
    const count = downloadTeamBoardCsv(state);
    setStatus(
      state,
      state.tr('adminBohTeamCsvExported', 'Exported {count} teams as CSV.', { count }),
      'success'
    );
    return;
  }
  if (action === 'export-team-board-png') {
    const count = await downloadTeamBoardPng(state, cleanText(button.dataset.exportView));
    setStatus(
      state,
      state.tr('adminBohTeamPngExported', 'Exported {count} teams as PNG.', { count }),
      'success'
    );
    return;
  }
  if (action === 'apply-commitment-batch') {
    applyCommitmentScoreBatch(state, button.closest('[data-form="commitment-scores"]'));
    return;
  }
  if (action === 'delete-selected-submissions') {
    const playerIds = filteredSubmissions(state)
      .map(playerId)
      .filter((id) => id && state.selectedSubmissionIds.has(id));
    if (!playerIds.length) return;
    const message = state.tr(
      'adminBohBatchDeletePrompt',
      'This cannot be undone. Permanently delete {count} selected visible signups, their reviews, and their player feedback? Epic Showdown preferences will be kept.',
      { count: playerIds.length }
    );
    const confirmed = await Promise.resolve(
      state.options.confirm?.(message) ?? showConfirmDialog(state, message)
    );
    if (!confirmed) return;
    await invokeAction(
      state,
      'batchDeleteSubmissions',
      { playerIds },
      state.tr('adminBohBatchDeleted', 'Selected visible signups deleted.')
    );
    return;
  }
  if (action === 'open-mapper-plan') {
    state.mapperPlanDialogTeamId = cleanText(button.dataset.teamId);
    state.mapperPlanMode = 'overview';
    renderShell(state);
    const dialogPanel = state.root.querySelector('.boh-admin-team-plan-dialog__panel');
    dialogPanel?.setAttribute('tabindex', '-1');
    dialogPanel?.focus?.();
    return;
  }
  if (action === 'close-mapper-plan') {
    const teamId = state.mapperPlanDialogTeamId;
    state.mapperPlanDialogTeamId = '';
    renderShell(state);
    state.root
      .querySelector(`[data-action="open-mapper-plan"][data-team-id="${CSS.escape(teamId)}"]`)
      ?.focus?.();
    return;
  }
  if (action === 'mapper-plan-mode') {
    state.mapperPlanMode = ['overview', 'roles', 'timeline', 'resources', 'map'].includes(
      button.dataset.mode
    )
      ? button.dataset.mode
      : 'overview';
    renderShell(state);
    return;
  }
  if (action === 'stage') {
    state.mapperPlanDialogTeamId = '';
    state.stage = button.dataset.stage;
    state.selectedSourceSeat = null;
    updateHash(state);
    renderNow(state);
    state.root.querySelector(`[data-stage="${state.stage}"]`)?.focus();
    return;
  }
  if (action === 'refresh') {
    await refreshState(state);
    setStatus(state, state.tr('adminBohRefreshed', 'All-Star data refreshed.'), 'success');
    renderShell(state);
    return;
  }
  if (action === 'select-submission') {
    state.selectedSubmissionId = cleanText(button.dataset.playerId);
    updateHash(state);
    renderShell(state);
    state.root.querySelector('#bohSignupDetailTitle')?.focus?.();
    return;
  }
  if (action === 'close-submission') {
    const closingPlayerId = state.selectedSubmissionId;
    state.selectedSubmissionId = '';
    updateHash(state);
    renderShell(state);
    [...state.root.querySelectorAll('[data-action="select-submission"]')]
      .find((candidate) => cleanText(candidate.dataset.playerId) === closingPlayerId)
      ?.focus();
    return;
  }
  if (action === 'delete-submission') {
    const targetId = cleanText(button.dataset.playerId);
    const submission = state.snapshot.submissions.find((item) => playerId(item) === targetId);
    if (!submission) return;
    const displayName = playerName(submission) || targetId;
    const message = state.tr(
      'adminBohDeleteSignupConfirm',
      'This cannot be undone. Permanently delete the signup for {player}, its review, and its player feedback? Epic Showdown preferences will be kept.',
      { player: displayName }
    );
    const confirmed = await Promise.resolve(
      state.options.confirm?.(message) ?? showConfirmDialog(state, message)
    );
    if (!confirmed) return;
    const result = await invokeAction(
      state,
      'deleteSubmission',
      { playerId: targetId },
      state.tr('adminBohSignupDeleted', 'Signup deleted.')
    );
    if (result === null) return;
    clearDeletedSubmissionState(state, [targetId]);
    renderShell(state);
    return;
  }
  if (action === 'select-seat') {
    const found = findSeat(state, button.dataset.teamId, button.dataset.seatNumber);
    if (!found || !found.seat.playerId || found.seat.locked) return;
    state.selectedSourceSeat = {
      teamId: found.team.id,
      seatNumber: found.seat.seatNumber,
    };
    renderShell(state);
    return;
  }
  if (action === 'clear-seat-selection') {
    state.selectedSourceSeat = null;
    renderShell(state);
    return;
  }
  if (action === 'move-seat-here') {
    const source = state.selectedSourceSeat;
    const destination = findSeat(state, button.dataset.teamId, button.dataset.seatNumber);
    const sourceEntry = source ? findSeat(state, source.teamId, source.seatNumber) : null;
    if (!sourceEntry || !destination || destination.seat.locked || sourceEntry.seat.locked) return;
    await invokeAction(
      state,
      destination.seat.playerId ? 'swapSeats' : 'moveSeat',
      {
        source: { teamId: sourceEntry.team.id, seatNumber: sourceEntry.seat.seatNumber },
        destination: { teamId: destination.team.id, seatNumber: destination.seat.seatNumber },
      },
      state.tr(
        destination.seat.playerId ? 'adminBohSeatsSwapped' : 'adminBohPlayerMoved',
        destination.seat.playerId ? 'Seats swapped.' : 'Player moved.'
      )
    );
    state.selectedSourceSeat = null;
    return;
  }
  if (action === 'toggle-seat-lock') {
    const found = findSeat(state, button.dataset.teamId, button.dataset.seatNumber);
    if (!found) return;
    await invokeAction(
      state,
      'setSeatLock',
      { teamId: found.team.id, seatNumber: found.seat.seatNumber, locked: !found.seat.locked },
      state.tr(
        found.seat.locked ? 'adminBohSeatUnlocked' : 'adminBohSeatLocked',
        found.seat.locked ? 'Seat unlocked.' : 'Seat locked.'
      )
    );
    return;
  }
  if (action === 'preview-balance-teams') {
    await invokeAction(
      state,
      'previewBalanceTeams',
      {},
      state.tr('adminBohBalancePreviewReady', 'Balance preview ready.')
    );
    return;
  }
  if (action === 'auto-assign-ranked-roles') {
    await invokeAction(
      state,
      'autoAssignRankedRoles',
      {},
      state.tr('adminBohRankedRolesApplied', 'Roles assigned by per-team score rank.')
    );
    return;
  }
  if (action === 'discard-balance-preview') {
    await invokeAction(
      state,
      'discardBalancePreview',
      {},
      state.tr('adminBohBalancePreviewDiscarded', 'Balance preview discarded.')
    );
    return;
  }
  if (action === 'apply-balance-preview') {
    const message = state.tr(
      'adminBohApplyBalanceConfirm',
      'Apply this exact balance preview in one atomic save?'
    );
    const confirmed = await Promise.resolve(
      state.options.confirm?.(message) ?? showConfirmDialog(state, message)
    );
    if (!confirmed) return;
    await invokeAction(
      state,
      'applyBalancePreview',
      {},
      state.tr('adminBohBalancePreviewApplied', 'Balance preview applied.')
    );
    return;
  }
  if (action === 'start-legacy-structure') {
    const message = state.tr(
      'adminBohLegacyConfirm',
      'Copy last year’s four phase timings and objective codes? The 15-seat roles and every legacy player name will be excluded.'
    );
    const confirmed = await Promise.resolve(
      state.options.confirm?.(message) ?? showConfirmDialog(state, message)
    );
    if (!confirmed) return;
    await invokeAction(
      state,
      'applyLegacyStructureTemplate',
      {
        templateId: 'boh-legacy-2025-structure',
        sourceSeatCount: 15,
        targetSeatCount: ROSTER_SIZE,
        copyPhases: true,
        copyObjectiveCodes: true,
        copyRoleCapacities: false,
        copyPlayerAssignments: false,
        copyPlayerNames: false,
        requireExplicitRoleMapping: true,
      },
      state.tr('adminBohLegacyStructureApplied', 'Last-year structure copied safely.')
    );
    return;
  }
  if (action === 'add-role') {
    roleDrafts(state).push({
      id: `draft-role-${Date.now()}`,
      label: state.tr('adminBohNewRole', 'New role'),
      capacity: 0,
      color: '#7dd3fc',
      order: roleDrafts(state).length + 1,
    });
    renderShell(state);
    return;
  }
  if (action === 'remove-role') {
    roleDrafts(state).splice(integer(button.dataset.roleIndex), 1);
    renderShell(state);
    return;
  }
  if (action === 'plan-scope') {
    const scope = cleanText(button.dataset.scope);
    state.planScope = ['global', 'role', 'seat', 'player'].includes(scope) ? scope : 'role';
    renderShell(state);
    return;
  }
  if (action === 'remove-instruction') {
    await invokeAction(
      state,
      'removeInstruction',
      { instructionId: cleanText(button.dataset.instructionId) },
      state.tr('adminBohInstructionRemoved', 'Instruction removed.')
    );
    return;
  }
  if (action === 'clear-publication-copy-message') {
    const form = button.closest('[data-form="publication-copy"]');
    for (const name of ['subtitle', 'message']) {
      const control = form?.querySelector?.(`[name="${name}"]`);
      if (control) control.value = '';
    }
    form?.querySelector?.('[name="subtitle"]')?.focus?.();
    return;
  }
  if (action === 'add-schedule-milestone') {
    captureEventScheduleDraft(state, button.closest('[data-form="event-schedule"]'));
    eventScheduleDraft(state).milestones.push({
      id: `milestone-${Date.now().toString(36)}`,
      label: '',
      startsAt: '',
    });
    renderShell(state);
    state.root.querySelector('[name="milestoneLabel"]:last-of-type')?.focus?.();
    return;
  }
  if (action === 'duplicate-schedule-milestone') {
    captureEventScheduleDraft(state, button.closest('[data-form="event-schedule"]'));
    const milestones = eventScheduleDraft(state).milestones;
    if (milestones.length >= MAX_EVENT_MILESTONES) return;
    const index = integer(button.dataset.index);
    const sourceMilestone = milestones[index];
    if (!sourceMilestone) return;
    milestones.splice(index + 1, 0, {
      ...sourceMilestone,
      id: `milestone-${Date.now().toString(36)}-copy-${index + 1}`,
      label: sourceMilestone.label
        ? state.tr('adminBohScheduleMilestoneCopy', '{label} copy', {
            label: sourceMilestone.label,
          })
        : '',
    });
    renderShell(state);
    return;
  }
  if (action === 'clear-schedule-milestones') {
    captureEventScheduleDraft(state, button.closest('[data-form="event-schedule"]'));
    const milestones = eventScheduleDraft(state).milestones;
    if (!milestones.length) return;
    const message = state.tr(
      'adminBohScheduleClearMilestonesConfirm',
      'Clear all {count} milestones from this draft? They are not removed publicly until you save the schedule.',
      { count: milestones.length }
    );
    const confirmed = await Promise.resolve(
      state.options.confirm?.(message) ?? showConfirmDialog(state, message)
    );
    if (!confirmed) return;
    milestones.splice(0, milestones.length);
    renderShell(state);
    return;
  }
  if (action === 'clear-schedule-team-time') {
    captureEventScheduleDraft(state, button.closest('[data-form="event-schedule"]'));
    const teamId = cleanText(button.dataset.teamId);
    const entry = eventScheduleDraft(state).teamGameTimes.find((item) => item.teamId === teamId);
    if (entry) entry.startsAt = '';
    renderShell(state);
    return;
  }
  if (action === 'remove-schedule-milestone') {
    captureEventScheduleDraft(state, button.closest('[data-form="event-schedule"]'));
    eventScheduleDraft(state).milestones.splice(integer(button.dataset.index), 1);
    renderShell(state);
    return;
  }
  if (action === 'move-schedule-milestone') {
    captureEventScheduleDraft(state, button.closest('[data-form="event-schedule"]'));
    const milestones = eventScheduleDraft(state).milestones;
    const index = integer(button.dataset.index);
    const target = button.dataset.direction === 'down' ? index + 1 : index - 1;
    if (target >= 0 && target < milestones.length) {
      [milestones[index], milestones[target]] = [milestones[target], milestones[index]];
      renderShell(state);
    }
    return;
  }
  if (action === 'edit-rotation') {
    state.rotationDraftId = cleanText(button.dataset.rotationId);
    renderShell(state);
    state.root.querySelector('.boh-admin-rotation select[name="sourceSeatNumber"]')?.focus();
    return;
  }
  if (action === 'cancel-rotation') {
    state.rotationDraftId = '';
    renderShell(state);
    return;
  }
  if (action === 'remove-rotation') {
    await invokeAction(
      state,
      'removeRotation',
      { rotationId: cleanText(button.dataset.rotationId) },
      state.tr('adminBohInstructionRemoved', 'Rotation removed.')
    );
    state.rotationDraftId = '';
    return;
  }
  if (action === 'edit-objective') {
    state.objectiveDraftId = cleanText(button.dataset.objectiveId);
    renderShell(state);
    state.root.querySelector('.boh-admin-objective-form input[name="code"]')?.focus();
    return;
  }
  if (action === 'remove-objective') {
    await invokeAction(
      state,
      'removeObjective',
      { objectiveId: cleanText(button.dataset.objectiveId) },
      state.tr('adminBohObjectiveRemoved', 'Objective removed.')
    );
    state.objectiveDraftId = '';
    return;
  }
  if (action === 'validate-revision') {
    await invokeAction(
      state,
      'validateRevision',
      { revision: state.snapshot.revision },
      state.tr('adminBohRevisionValidated', 'Draft revision validated.')
    );
    return;
  }
  if (action === 'preview-kind') {
    state.previewKind = button.dataset.kind === 'plan' ? 'plan' : 'announcement';
    renderShell(state);
  }
}

function clearCorrectionValidity(form) {
  for (const control of form?.querySelectorAll?.('[aria-invalid="true"]') || []) {
    control.removeAttribute('aria-invalid');
    control.setCustomValidity?.('');
  }
}

function handleInput(state, event) {
  if (event.target.matches?.('[data-action="mapper-board-search"]')) {
    state.mapperBoardSearch = cleanText(event.target.value);
    syncMapperBoardFilter(state);
    return;
  }
  if (event.target.matches?.('[data-action="eligible-pool-search"]')) {
    syncEligiblePoolSearch(state);
    return;
  }
  const scoreForm = event.target.closest?.('[data-form="commitment-scores"]');
  if (scoreForm) {
    event.target.setCustomValidity?.('');
    event.target.removeAttribute?.('aria-invalid');
    captureCommitmentScoreDraft(state, scoreForm);
    return;
  }
  const scheduleForm = event.target.closest?.('[data-form="event-schedule"]');
  if (scheduleForm) {
    captureEventScheduleDraft(state, scheduleForm);
    // Switching status flips which fields are required and which errors apply, so re-render.
    if (event.target.matches?.('[data-action="schedule-status"]')) scheduleRender(state);
    return;
  }
  const form = event.target.closest?.('[data-form="submission-corrections"]');
  if (!form) return;
  if (event.target.matches?.('[data-action="filter-correction-heroes"]')) {
    const query = cleanText(event.target.value).toLocaleLowerCase();
    for (const option of form.querySelectorAll(
      'select[name="correction.stats.usableHeroNames"] option'
    )) {
      option.hidden = Boolean(
        query && !cleanText(option.textContent).toLocaleLowerCase().includes(query)
      );
    }
    return;
  }
  clearCorrectionValidity(form);
  captureCorrectionDraft(state, form);
}

async function handleChange(state, event) {
  const action = cleanText(event.target.dataset.action);
  if (action === 'publish-scope') {
    state.publishScope = ['announcement', 'plan', 'both'].includes(event.target.value)
      ? event.target.value
      : 'both';
    state.previewKind = state.publishScope === 'announcement' ? 'announcement' : 'plan';
    renderShell(state);
    return;
  }
  if (action === 'mapper-board-filter') {
    state.mapperBoardFilter = cleanText(event.target.value) || 'all';
    syncMapperBoardFilter(state);
    return;
  }
  if (action === 'mapper-seat-player') {
    await invokeAction(
      state,
      'assignSeatPlayer',
      {
        teamId: cleanText(event.target.dataset.teamId),
        seatNumber: integer(event.target.dataset.seatNumber),
        playerId: cleanText(event.target.value),
      },
      state.tr('adminBohAssignmentApplied', 'Seat assignment updated.')
    );
    return;
  }
  if (action === 'reconcile-mapper-player') {
    const result = await invokeAction(
      state,
      'reconcileMapperExactView',
      {
        teamId: cleanText(event.target.dataset.teamId),
        seatNumber: integer(event.target.dataset.seatNumber),
        playerId: cleanText(event.target.value),
      },
      state.tr(
        'adminBohMapperReconciledPreview',
        'Mapper preview reconciliation updated. Nothing has been saved or published.'
      )
    );
    state.mapperImportPreview = result?.result || result?.actionResult || state.mapperImportPreview;
    renderShell(state);
    return;
  }
  if (action === 'preview-mapper-role-plan') {
    const input = event.target;
    const files = [...(input.files || [])];
    if (!files.length) return;
    try {
      if (files.length > TEAM_COUNT) {
        throw adapterError(
          'boh-mapper-plan-file-count',
          state.tr(
            'adminBohRolePlanFileCount',
            'Choose at most six single-team files or one bundle.'
          )
        );
      }
      const acceptedMimeTypes = new Set(['', 'application/json', 'text/json']);
      if (
        files.some(
          (file) => !/\.json$/iu.test(file.name || '') || !acceptedMimeTypes.has(file.type || '')
        )
      ) {
        throw adapterError(
          'boh-mapper-plan-file-type',
          state.tr('adminBohRolePlanFileType', 'Choose an All-Star BoH role-plan .json file.')
        );
      }
      const fileNames = files.map((file) => cleanText(file.name).toLocaleLowerCase());
      if (new Set(fileNames).size !== fileNames.length) {
        throw adapterError(
          'boh-mapper-plan-duplicate-file',
          state.tr('adminBohRolePlanDuplicateFile', 'Remove duplicate role-plan files.')
        );
      }
      const maximumBytes =
        files.length === 1
          ? BOH_MAPPER_PLAN_BUNDLE_IMPORT_MAX_BYTES
          : BOH_MAPPER_PLAN_IMPORT_MAX_BYTES;
      if (files.some((file) => file.size > maximumBytes)) {
        throw adapterError(
          'boh-mapper-plan-file-too-large',
          state.tr(
            'adminBohRolePlanFileTooLarge',
            'Role-plan import exceeds the {bytes}-byte limit.',
            {
              bytes: maximumBytes,
            }
          )
        );
      }
      const jsonTexts = await Promise.all(files.map((file) => file.text()));
      const result = await invokeAction(
        state,
        'previewMapperRolePlan',
        { jsonTexts },
        state.tr(
          'adminBohRolePlanPreviewReady',
          'Role-plan preview ready. All files passed validation; nothing has been saved or published.'
        )
      );
      state.mapperPlanImportPreview = result?.result || result?.actionResult || null;
      renderShell(state);
    } finally {
      input.value = '';
    }
    return;
  }
  if (action === 'preview-mapper-import') {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const acceptedMimeTypes = new Set(['', 'application/json', 'text/json']);
      if (!/\.json$/iu.test(file.name || '') || !acceptedMimeTypes.has(file.type || '')) {
        throw adapterError(
          'boh-mapper-file-type',
          state.tr('adminBohMapperFileType', 'Choose an All-Star BoH mapper .json file.')
        );
      }
      if (file.size > BOH_MAPPER_IMPORT_MAX_BYTES) {
        throw adapterError(
          'boh-mapper-file-too-large',
          state.tr('adminBohMapperFileTooLarge', 'Mapper import exceeds the {bytes}-byte limit.', {
            bytes: BOH_MAPPER_IMPORT_MAX_BYTES,
          })
        );
      }
      const jsonText = await file.text();
      const result = await invokeAction(
        state,
        'previewMapperExactView',
        { jsonText },
        state.tr(
          'adminBohMapperPreviewReady',
          'Mapper preview ready. Nothing has been saved or published.'
        )
      );
      state.mapperImportPreview = result?.result || result?.actionResult || null;
      renderShell(state);
    } finally {
      input.value = '';
    }
    return;
  }
  if (action === 'import-approved-roster') {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const csvText = await file.text();
      parseAdminAllStarBohApprovedRosterCsv(csvText);
      const result = await invokeAction(
        state,
        'importApprovedRoster',
        { csvText },
        state.tr('adminBohApprovedRosterImported', 'Approved roster imported.')
      );
      const report = result?.result || result?.actionResult;
      if (report) state.approvedRosterImportReport = report;
      renderShell(state);
    } finally {
      input.value = '';
    }
    return;
  }
  const correctionForm = event.target.closest?.('[data-form="submission-corrections"]');
  if (correctionForm) {
    if (event.target.matches?.('[data-correction-troop-kind]')) {
      const row = event.target.closest('[data-correction-troop-row]');
      for (const fields of row?.querySelectorAll?.('[data-troop-fields]') || []) {
        fields.hidden = fields.dataset.troopFields !== event.target.value;
      }
    }
    clearCorrectionValidity(correctionForm);
    captureCorrectionDraft(state, correctionForm);
    return;
  }
  if (action === 'eligible-pool-filter') {
    syncEligiblePoolSearch(state);
    return;
  }
  if (action === 'eligible-pool-player') {
    syncEligiblePoolCount(state);
    syncEligiblePoolSearch(state);
    return;
  }
  if (action === 'select-submission-row') {
    const id = cleanText(event.target.dataset.playerId);
    if (event.target.checked) state.selectedSubmissionIds.add(id);
    else state.selectedSubmissionIds.delete(id);
    // Direct DOM update instead of full re-render
    const selectAll = state.root.querySelector('[data-action="select-all-visible"]');
    if (selectAll) {
      const visible = filteredSubmissions(state);
      const selectedCount = visible.filter((s) =>
        state.selectedSubmissionIds.has(playerId(s))
      ).length;
      selectAll.indeterminate = selectedCount > 0 && selectedCount < visible.length;
      selectAll.checked = selectedCount === visible.length && visible.length > 0;
    }
    syncBatchToolbar(state);
    return;
  }
  if (action === 'select-all-visible') {
    const checked = event.target.checked;
    for (const submission of filteredSubmissions(state)) {
      const id = playerId(submission);
      if (checked) state.selectedSubmissionIds.add(id);
      else state.selectedSubmissionIds.delete(id);
    }
    // Direct DOM update
    state.root.querySelectorAll('[data-action="select-submission-row"]').forEach((cb) => {
      cb.checked = checked;
    });
    syncBatchToolbar(state);
    return;
  }
  if (action === 'preview-team') {
    state.selectedPreviewTeamId = cleanText(event.target.value);
    const team = state.snapshot.teams.find(
      (candidate) => candidate.id === state.selectedPreviewTeamId
    );
    state.selectedPreviewPlayerId = team?.seats.find((seat) => seat.playerId)?.playerId || '';
    renderShell(state);
    return;
  }
  if (action === 'preview-player') {
    state.selectedPreviewPlayerId = cleanText(event.target.value);
    renderShell(state);
    return;
  }
  const control = event.target.closest('[data-plan-filter]');
  if (!control) return;
  state.rotationDraftId = '';
  if (control.dataset.planFilter === 'team') state.planTeamId = control.value;
  if (control.dataset.planFilter === 'phase') state.planPhaseId = control.value;
  if (control.dataset.planFilter === 'legion') state.planLegionId = control.value;
  renderShell(state);
}

function parseRolePayload(formData) {
  const ids = arrayValues(formData, 'roleId');
  const labels = arrayValues(formData, 'roleLabel');
  const capacities = arrayValues(formData, 'roleCapacity');
  const colors = arrayValues(formData, 'roleColor');
  return ids.map((id, index) => ({
    id,
    label: labels[index],
    capacity: Math.max(0, integer(capacities[index])),
    color: colors[index] || '#64748b',
    order: index + 1,
  }));
}

function parsePhasePayload(formData) {
  const ids = arrayValues(formData, 'phaseId');
  const labels = arrayValues(formData, 'phaseLabel');
  const starts = arrayValues(formData, 'phaseStart');
  const ends = arrayValues(formData, 'phaseEnd');
  return ids.map((id, index) => ({
    id,
    label: labels[index],
    startMinute: Math.max(0, integer(starts[index])),
    endMinute: Math.max(0, integer(ends[index])),
    order: index + 1,
  }));
}

async function handleSubmit(state, event) {
  const form = event.target.closest('form[data-form]');
  if (!form || !state.root.contains(form)) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = formValues(form);
  const kind = form.dataset.form;
  if (kind === 'signup-filter') {
    state.signupSearch = cleanText(data.get('search'));
    state.signupFilter = cleanText(data.get('status')) || 'all';
    state.signupFilters = {
      fightingTime: cleanText(data.get('fightingTime')) || 'all',
      role: cleanText(data.get('role')) || 'all',
      troopType: cleanText(data.get('troopType')) || 'all',
      vtsMember: cleanText(data.get('vtsMember')) || 'all',
      minTotalPower: cleanText(data.get('minTotalPower')),
      maxTotalPower: cleanText(data.get('maxTotalPower')),
    };
    try {
      sessionStorage.setItem('bohAdminSignupFilter', state.signupFilter);
      sessionStorage.setItem('bohAdminSignupSearch', state.signupSearch);
      sessionStorage.setItem('bohAdminSignupSort', JSON.stringify(state.signupSort));
    } catch {}
    renderShell(state);
    return;
  }
  if (kind === 'batch-review') {
    const visible = new Set(filteredSubmissions(state).map(playerId));
    const playerIds = [...state.selectedSubmissionIds].filter((id) => visible.has(id));
    if (!playerIds.length) return;
    const message = state.tr(
      'adminBohBatchConfirmPrompt',
      'Confirm {count} visible selected signups?',
      { count: playerIds.length }
    );
    const confirmed = await Promise.resolve(
      state.options.confirm?.(message) ?? showConfirmDialog(state, message)
    );
    if (!confirmed) return;
    await invokeAction(
      state,
      'batchReviewSubmissions',
      {
        playerIds,
        status: 'confirmed',
        ...(cleanText(data.get('note')) ? { note: cleanText(data.get('note')) } : {}),
      },
      state.tr('adminBohBatchConfirmed', 'Selected visible signups confirmed.')
    );
    return;
  }
  if (kind === 'epic-planning') {
    const summary = buildAdminEpicShowdownPreferenceSummary(state.snapshot);
    const overrides = summary.players.map((player) => ({
      playerId: player.playerId,
      excluded: data.has(`excluded.${player.playerId}`),
      laneOverride: cleanText(data.get(`laneOverride.${player.playerId}`)),
      groupId: cleanText(data.get(`groupId.${player.playerId}`)),
    }));
    await invokeAction(
      state,
      'saveEpicPlanningOverrides',
      { overrides },
      state.tr('adminBohEpicPlanningSaved', 'Epic planning controls saved.')
    );
    return;
  }
  if (kind === 'copy-phase-template') {
    await invokeAction(
      state,
      'copyPhaseTemplate',
      {
        teamId: state.planTeamId,
        legionId: state.planLegionId,
        sourcePhaseId: state.planPhaseId,
        targetPhaseId: cleanText(data.get('targetPhaseId')),
        copyPlayerAssignments: false,
      },
      state.tr('adminBohPhaseCopied', 'Phase template copied.')
    );
    return;
  }
  if (kind === 'copy-team-plan') {
    await invokeAction(
      state,
      'copyTeamPlan',
      {
        sourceTeamId: state.planTeamId,
        targetTeamId: cleanText(data.get('targetTeamId')),
        copyInstructions: true,
        copyRotations: true,
        copyPlayerAssignments: false,
        copyPlayerNames: false,
      },
      state.tr('adminBohTeamPlanCopied', 'Team plan copied without player assignments.')
    );
    return;
  }
  if (kind === 'copy-legion-plan') {
    await invokeAction(
      state,
      'copyLegionPlan',
      {
        teamId: state.planTeamId,
        sourceLegionId: state.planLegionId,
        targetLegionId: cleanText(data.get('targetLegionId')),
        copyPlayerAssignments: false,
      },
      state.tr('adminBohLegionPlanCopied', 'Legion plan copied.')
    );
    return;
  }
  if (kind === 'apply-role-default') {
    await invokeAction(
      state,
      'applyRoleDefault',
      {
        teamId: state.planTeamId,
        phaseId: state.planPhaseId,
        legionId: state.planLegionId,
        roleGroupId: cleanText(data.get('roleGroupId')),
        seatNumber: integer(data.get('seatNumber')),
      },
      state.tr('adminBohRoleDefaultApplied', 'Role default applied to the seat.')
    );
    return;
  }
  if (kind === 'review-submission') {
    const usefulnessInput = cleanText(data.get('adminUsefulnessRating'));
    await invokeAction(
      state,
      'reviewSubmission',
      {
        playerId: cleanText(data.get('playerId')),
        status: cleanText(data.get('status')),
        note: cleanText(data.get('note')),
        internalNote: cleanText(data.get('internalNote')),
        adminUsefulnessRating: usefulnessInput === '' ? null : clamp(usefulnessInput, 0, 100),
      },
      state.tr('adminBohReviewSaved', 'Signup review saved.')
    );
    return;
  }
  if (kind === 'submission-corrections') {
    captureCorrectionDraft(state, form);
    const parsed = proposedCorrectionFromForm(form);
    const submission = state.snapshot.submissions.find(
      (item) => playerId(item) === parsed.playerId
    );
    if (!submission) return;
    const overlay = validateCorrectionForm(state, form, submission, parsed);
    if (overlay === false) return;
    const review = submission?.review || {};
    const result = await invokeAction(
      state,
      'reviewSubmission',
      {
        playerId: parsed.playerId,
        status: cleanText(submission.reviewStatus).toLocaleLowerCase() || 'pending',
        note: cleanText(
          adapterReviewMatchesSubmissionRevision(submission, review) ? review.note : ''
        ),
        internalNote: cleanText(review.internalNote),
        submissionCorrection: overlay,
      },
      state.tr('adminBohCorrectionsSaved', 'Admin corrections saved.')
    );
    if (result !== null) {
      state.correctionDrafts.delete(parsed.playerId);
      renderShell(state);
    }
    return;
  }
  if (kind === 'player-value-editor') {
    const baseScoreOverride = cleanText(data.get('baseScoreOverride'));
    const overrideReason = cleanText(data.get('overrideReason'));
    if (baseScoreOverride && !overrideReason) {
      const control = form.elements?.overrideReason;
      control?.setCustomValidity?.(
        state.tr('adminBohOverrideReasonRequired', 'Add a reason for the base score override.')
      );
      control?.reportValidity?.();
      control?.focus?.();
      return;
    }
    const result = await invokeAction(
      state,
      'savePlayerValues',
      {
        playerId: cleanText(data.get('playerId')),
        displayName: cleanText(data.get('displayName')),
        totalCastlePower: cleanText(data.get('totalCastlePower')),
        correctionReason: cleanText(data.get('correctionReason')),
        baseScoreOverride,
        overrideReason,
      },
      state.tr('adminBohPlayerValuesSaved', 'Player values saved to the draft.')
    );
    if (result !== null) renderShell(state);
    return;
  }
  if (kind === 'scoring-version') {
    const weights = Object.fromEntries(
      SCORE_COMPONENTS.map(([key]) => [key, finiteNumber(data.get(`weight.${key}`))])
    );
    await invokeAction(
      state,
      'createScoringVersion',
      { label: cleanText(data.get('label')), note: cleanText(data.get('note')), weights },
      state.tr('adminBohScoringVersionSaved', 'New scoring version saved.')
    );
    return;
  }
  if (kind === 'commitment-scores') {
    captureCommitmentScoreDraft(state, form);
    const adjustments = [];
    for (const control of form.querySelectorAll('[data-commitment-score-player]')) {
      control.setCustomValidity?.('');
      control.removeAttribute?.('aria-invalid');
      const rawScore = cleanText(control.value);
      if (rawScore) {
        const score = Number(rawScore);
        if (!Number.isInteger(score) || score < 1 || score > 10_000) {
          invalidateCorrectionControl(
            state,
            control,
            state.tr(
              'adminBohCommitmentScoreInvalid',
              'Enter a whole commitment score from 1 to 10,000, or leave it blank.'
            )
          );
          return;
        }
      }
      adjustments.push({
        playerId: cleanText(control.dataset.commitmentScorePlayer),
        score: rawScore || null,
      });
    }
    const result = await invokeAction(
      state,
      'saveCommitmentScores',
      {
        adjustments,
        reason: cleanText(form.elements?.reason?.value),
      },
      state.tr('adminBohCommitmentScoresSaved', 'Manual commitment scores saved.')
    );
    if (result !== null) {
      state.commitmentScoreDraft = null;
      renderShell(state);
    }
    return;
  }
  if (kind === 'team-builder-settings') {
    const forcedTeamAssignments = [...data.entries()]
      .filter(([name, teamId]) => name.startsWith('forcedTeam.') && cleanText(teamId))
      .map(([name, teamId]) => ({
        playerId: cleanText(name.slice('forcedTeam.'.length)),
        teamId: cleanText(teamId),
      }));
    await invokeAction(
      state,
      'saveTeamBuilderSettings',
      {
        teamCount: integer(data.get('teamCount')),
        balanceMetric: cleanText(data.get('balanceMetric')),
        forcedTeamAssignments,
      },
      state.tr('adminBohBalanceConfigurationSaved', 'Balance configuration saved.')
    );
    return;
  }
  if (kind === 'eligible-pool') {
    await invokeAction(
      state,
      'saveEligiblePool',
      { playerIds: data.getAll('playerId').map(cleanText).filter(Boolean) },
      state.tr('adminBohEligiblePoolSaved', 'Eligible player field saved.')
    );
    return;
  }
  if (kind === 'direct-assignment') {
    const [teamId, seatNumber] = cleanText(data.get('targetSeat')).split('|');
    await invokeAction(
      state,
      'assignSeatPlayer',
      {
        teamId: cleanText(teamId),
        seatNumber: integer(seatNumber),
        playerId: cleanText(data.get('playerId')),
      },
      state.tr('adminBohAssignmentApplied', 'Seat assignment updated.')
    );
    return;
  }
  if (kind === 'mapper-plan-details') {
    const teamId = cleanText(data.get('teamId'));
    const team = state.snapshot.teams.find((item) => item.id === teamId);
    if (!team) return;
    const substitutions = team.seats
      .filter((seat) => seat.playerId && cleanText(seat.lane) === 'backup')
      .map((seat, index) => {
        const replacesPlayerId = cleanText(data.get(`substitutionReplaces.${seat.playerId}`));
        if (!replacesPlayerId) return null;
        return {
          id: cleanText(data.get(`substitutionId.${seat.playerId}`)),
          backupPlayerId: seat.playerId,
          replacesPlayerId,
          entryMinute: integer(data.get(`substitutionMinute.${seat.playerId}`)),
          order: index + 1,
          note: cleanText(data.get(`substitutionNote.${seat.playerId}`)),
        };
      })
      .filter(Boolean);
    const playerResources = uniqueTextList(data.getAll('resourcePlayerId')).flatMap((playerId) => {
      const meritText = cleanText(data.get(`resourceMerit.${playerId}`));
      const queueText = cleanText(data.get(`resourceQueue.${playerId}`));
      const skillIds = uniqueTextList(data.getAll(`resourceSkill.${playerId}`));
      if (!meritText && !queueText && !skillIds.length) return [];
      return [
        {
          playerId,
          meritBudget: meritText ? Number(meritText) : null,
          queueCapacity: queueText ? Number(queueText) : null,
          skillIds,
        },
      ];
    });
    const annotationId = cleanText(data.get('annotationId'));
    const annotationBuildingId = cleanText(data.get('annotationBuildingId'));
    const annotationNote = cleanText(data.get('annotationNote'));
    if (annotationNote && !annotationBuildingId) {
      setStatus(state, 'Choose a building ID before saving its annotation.', 'error');
      return;
    }
    const buildingAnnotations = annotationBuildingId
      ? [
          {
            id: annotationId,
            buildingId: annotationBuildingId,
            note: annotationNote,
            order: 1,
          },
        ]
      : [];
    await invokeAction(
      state,
      'saveMapperPlanDetails',
      { teamId, substitutions, playerResources, buildingAnnotations },
      'Private mapper plan details saved to the draft.'
    );
    return;
  }
  if (kind === 'mapper-seat-details') {
    await invokeAction(
      state,
      'saveTeamMetadata',
      {
        teamId: cleanText(data.get('teamId')),
        seatEdit: {
          seatNumber: integer(data.get('seatNumber')),
          deployment: cleanText(data.get('deployment')),
          roleGroupId: cleanText(data.get('roleGroupId')),
          titleRole: cleanText(data.get('titleRole')),
          commandRole: cleanText(data.get('commandRole')),
        },
      },
      state.tr('adminBohMapperCardSaved', 'Mapper player card saved.')
    );
    return;
  }
  if (kind === 'team-metadata') {
    await invokeAction(
      state,
      'saveTeamMetadata',
      {
        teamId: cleanText(data.get('teamId')),
        name: cleanText(data.get('name')),
        color: cleanText(data.get('color')),
        captainId: cleanText(data.get('captainId')),
        coLeaderIds: uniqueTextList(data.getAll('coLeaderIds')),
        notes: cleanText(data.get('notes')),
      },
      state.tr('adminBohTeamMetadataSaved', 'Team details saved.')
    );
    return;
  }
  if (kind === 'role-groups') {
    const roleGroups = parseRolePayload(data);
    await invokeAction(
      state,
      'saveRoleGroups',
      { roleGroups },
      state.tr('adminBohRolesSaved', 'Role structure saved.')
    );
    return;
  }
  if (kind === 'phases') {
    const phases = parsePhasePayload(data);
    const invalid = phases.some((phase, index) => {
      if (phase.endMinute <= phase.startMinute) return true;
      return index > 0 && phase.startMinute < phases[index - 1].endMinute;
    });
    if (invalid || phases.length !== 5) {
      setStatus(
        state,
        state.tr('adminBohInvalidTimeline', 'Use exactly five ordered, non-overlapping phases.'),
        'error'
      );
      return;
    }
    await invokeAction(
      state,
      'savePhases',
      { phases },
      state.tr('adminBohTimelineSaved', 'Match timeline saved.')
    );
    return;
  }
  if (kind === 'instruction') {
    const scope = cleanText(data.get('scope'));
    const scopeId = cleanText(data.get('scopeId'));
    const pathObjectiveIds = cleanText(data.get('pathObjectiveIds'))
      .split(/[\s,>→]+/u)
      .map(cleanText)
      .filter(Boolean);
    await invokeAction(
      state,
      'saveInstruction',
      {
        teamId: cleanText(data.get('teamId')),
        phaseId: cleanText(data.get('phaseId')),
        legionId: cleanText(data.get('legionId')),
        scope,
        scopeId,
        roleGroupId: scope === 'role' ? scopeId : '',
        seatNumber: scope === 'seat' ? integer(scopeId) : null,
        playerId: scope === 'player' ? scopeId : '',
        action: cleanText(data.get('action')),
        startObjectiveId: cleanText(data.get('startObjectiveId')),
        viaObjectiveIds: data.getAll('viaObjectiveIds').map(cleanText).filter(Boolean),
        pathObjectiveIds,
        objectiveId: cleanText(data.get('objectiveId')),
        loadout: cleanText(data.get('loadout')),
        teleport: cleanText(data.get('teleport')),
        instruction: cleanText(data.get('instruction')),
        note: cleanText(data.get('note')),
      },
      state.tr('adminBohInstructionSaved', 'Plan instruction saved.')
    );
    return;
  }
  if (kind === 'publication-copy') {
    await invokeAction(
      state,
      'savePublicationCopy',
      {
        eventName: cleanText(data.get('eventName')),
        title: cleanText(data.get('title')),
        subtitle: cleanText(data.get('subtitle')),
        message: cleanText(data.get('message')),
      },
      state.tr('adminBohAnnouncementDraftSaved', 'Announcement draft saved.')
    );
    return;
  }
  if (kind === 'event-schedule') {
    const schedule = captureEventScheduleDraft(state, form);
    const errors = eventScheduleValidationErrors(state, schedule);
    if (errors.length) {
      setStatus(state, errors[0], 'error');
      return;
    }
    await invokeAction(
      state,
      'saveEventSchedule',
      {
        ...schedule,
        expectedScheduleRevision: adapterRevision(state.snapshot.documentRevisions?.eventSchedule),
      },
      state.tr('adminBohScheduleSaved', 'Event schedule saved.')
    );
    state.scheduleDraft = null;
    return;
  }
  if (kind === 'rotation') {
    await invokeAction(
      state,
      'saveRotation',
      {
        rotationId: cleanText(data.get('rotationId')),
        teamId: cleanText(data.get('teamId')),
        phaseId: cleanText(data.get('phaseId')),
        legionId: cleanText(data.get('legionId')),
        sourceSeatNumber: integer(data.get('sourceSeatNumber')),
        targetSeatNumber: integer(data.get('targetSeatNumber')),
        note: cleanText(data.get('note')),
      },
      state.tr('adminBohRotationSaved', 'Role rotation saved.')
    );
    state.rotationDraftId = '';
    return;
  }
  if (kind === 'objective') {
    await invokeAction(
      state,
      'saveObjective',
      {
        id: cleanText(data.get('id')),
        code: cleanText(data.get('code')),
        label: cleanText(data.get('label')),
        x: clamp(data.get('x'), 0, 100),
        y: clamp(data.get('y'), 0, 100),
        type: 'objective',
      },
      state.tr('adminBohObjectiveSaved', 'Map objective saved.')
    );
    state.objectiveDraftId = '';
    return;
  }
  if (kind === 'publish-scope') {
    const publicationKind = ['announcement', 'plan', 'both'].includes(cleanText(data.get('scope')))
      ? cleanText(data.get('scope'))
      : state.publishScope;
    const command =
      publicationKind === 'announcement'
        ? 'publishAnnouncement'
        : publicationKind === 'plan'
          ? 'publishPlan'
          : 'publishBoth';
    const title =
      publicationKind === 'announcement'
        ? state.tr('adminBohPublishTeamListOnly', 'Team list only')
        : publicationKind === 'plan'
          ? state.tr('adminBohPublishPlanOnly', 'Plan update only')
          : state.tr('adminBohPublishBoth', 'Team list + plan');
    await invokeAction(
      state,
      command,
      {
        revision: state.snapshot.revision,
        sanitizedPreviewConfirmed: data.get('confirmed') === 'on',
      },
      state.tr('adminBohPublished', '{title} published.', { title })
    );
  }
}

function handleStageKeys(state, event) {
  const tab = event.target.closest('[data-action="stage"]');
  if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const current = STAGES.findIndex(([id]) => id === tab.dataset.stage);
  const direction = getComputedStyle(state.root).direction === 'rtl' ? -1 : 1;
  let next = current;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = STAGES.length - 1;
  if (event.key === 'ArrowRight') next = (current + direction + STAGES.length) % STAGES.length;
  if (event.key === 'ArrowLeft') next = (current - direction + STAGES.length) % STAGES.length;
  state.stage = STAGES[next][0];
  renderNow(state);
  state.root.querySelector(`[data-stage="${state.stage}"]`)?.focus();
  state.root
    .querySelector(`[data-stage="${state.stage}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function bindEvents(state) {
  state.eventsAbort?.abort();
  state.eventsAbort = new AbortController();
  const { signal } = state.eventsAbort;
  state.root.addEventListener(
    'click',
    (event) => {
      void handleClick(state, event).catch((error) => {
        setStatus(state, error?.message || String(error), 'error');
        state.options.onError?.(error, { action: 'click' });
      });
    },
    { signal }
  );
  state.root.addEventListener('input', (event) => handleInput(state, event), { signal });
  state.root.addEventListener(
    'change',
    (event) => {
      void handleChange(state, event).catch((error) => {
        setStatus(state, error?.message || String(error), 'error');
        state.options.onError?.(error, { action: 'change' });
      });
    },
    { signal }
  );
  state.root.addEventListener(
    'submit',
    (event) => {
      void handleSubmit(state, event).catch((error) => {
        setStatus(state, error?.message || String(error), 'error');
        state.options.onError?.(error, { action: 'submit' });
      });
    },
    { signal }
  );
  state.root.addEventListener(
    'keydown',
    (event) => {
      handleStageKeys(state, event);
      if (event.key === 'Escape' && state.mapperPlanDialogTeamId) {
        state.mapperPlanDialogTeamId = '';
        renderNow(state);
        event.preventDefault();
        return;
      }
      if (event.key === 'Escape' && state.selectedSubmissionId) {
        const closingPlayerId = state.selectedSubmissionId;
        state.selectedSubmissionId = '';
        updateHash(state);
        renderNow(state);
        const escapedId = CSS.escape(closingPlayerId);
        state.root
          .querySelector(`[data-action="select-submission"][data-player-id="${escapedId}"]`)
          ?.focus();
        event.preventDefault();
      }
    },
    { signal }
  );
  state.root.addEventListener(
    'toggle',
    (event) => {
      if (event.target?.classList?.contains('boh-admin-epic-preferences')) {
        state.epicSummaryOpen = event.target.open;
        try {
          sessionStorage.setItem('bohAdminEpicSummaryOpen', event.target.open ? 'true' : '');
        } catch {}
      }
    },
    { signal, passive: true }
  );
}

async function startController(state) {
  if (state.mounted || state.destroyed) return;
  state.mounted = true;
  state.pending = true;
  renderShell(state);
  setStatus(state, state.tr('adminBohLoading', 'Loading All-Star administration…'), 'loading');
  try {
    if (!state.store && state.options.adminStore) {
      state.store = createAdminAllStarBohStoreAdapter(state.options.adminStore, {
        ...(state.options.adminStoreAdapterOptions || {}),
        onError: state.options.adminStoreAdapterOptions?.onError || state.options.onError,
      });
      state.ownsStore = true;
    }
    if (!state.store && typeof state.options.createStore === 'function') {
      state.store = await Promise.resolve(state.options.createStore());
      state.ownsStore = true;
    }
    if (
      state.store &&
      typeof state.store.getSnapshot !== 'function' &&
      typeof state.store.listSubmissions === 'function'
    ) {
      state.store = createAdminAllStarBohStoreAdapter(state.store, {
        ...(state.options.adminStoreAdapterOptions || {}),
        onError: state.options.adminStoreAdapterOptions?.onError || state.options.onError,
      });
      state.ownsStore = true;
    }
    const startedSnapshot =
      typeof state.store?.start === 'function' ? await Promise.resolve(state.store.start()) : null;
    await refreshState(state, startedSnapshot);
    if (typeof state.store?.subscribe === 'function') {
      state.unsubscribe = state.store.subscribe((change) => {
        if (state.destroyed) return;
        state.snapshot = normalizeSnapshot(change?.snapshot || change);
        pruneCorrectionDrafts(state);
        state.roleDrafts = null;
        state.phaseDrafts = null;
        state.scheduleDraft = null;
        if (state.pending) {
          state._snapshotDirty = true;
          return;
        }
        scheduleRender(state);
        state.options.onSnapshot?.(state.snapshot);
      });
    }
    setStatus(state, state.tr('adminBohReady', 'All-Star administration is live.'), 'success');
  } catch (error) {
    state.mounted = false;
    setStatus(state, error?.message || String(error), 'error');
    state.options.onError?.(error, { action: 'mount' });
    throw error;
  } finally {
    state.pending = false;
    renderShell(state);
  }
}

export function createAdminAllStarBohController(options = {}) {
  const root = resolveRoot(options.container || options.root);
  if (!root) throw new Error('All-Star BoH admin root was not found.');
  const existing = CONTROLLERS.get(root);
  if (existing) return existing;
  const state = makeInitialState(root, options);
  if (typeof document?.createElement === 'function' && !document.getElementById('bohAdminStatus')) {
    const statusEl = document.createElement('div');
    statusEl.id = 'bohAdminStatus';
    statusEl.className = 'boh-admin-status';
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');
    statusEl.hidden = true;
    root.parentNode?.insertBefore(statusEl, root);
  }
  bindEvents(state);
  renderShell(state);

  const controller = {
    async mount() {
      await startController(state);
      return controller;
    },
    async refresh(snapshot) {
      await refreshState(state, snapshot);
      state.roleDrafts = null;
      state.phaseDrafts = null;
      state.scheduleDraft = null;
      renderNow(state);
      return controller.getState();
    },
    setLanguage(translatorOrOptions, locale) {
      if (typeof translatorOrOptions === 'function') {
        state.tr = makeTranslator(translatorOrOptions);
        if (locale) state.locale = cleanText(locale);
      } else if (translatorOrOptions && typeof translatorOrOptions === 'object') {
        if (typeof translatorOrOptions.t === 'function') {
          state.tr = makeTranslator(translatorOrOptions.t);
        }
        if (translatorOrOptions.locale) state.locale = cleanText(translatorOrOptions.locale);
        if (translatorOrOptions.direction) {
          state.direction = cleanText(translatorOrOptions.direction);
          state.root.dir = state.direction;
        }
      }
      renderShell(state);
    },
    refreshLanguage(translator, locale) {
      controller.setLanguage(translator, locale);
    },
    setStage(stage) {
      if (!STAGES.some(([id]) => id === stage)) return false;
      state.stage = stage;
      updateHash(state);
      renderNow(state);
      return true;
    },
    getState() {
      return {
        stage: state.stage,
        revision: state.snapshot.revision,
        snapshot: state.snapshot,
        pending: state.pending,
        mounted: state.mounted,
      };
    },
    destroy() {
      if (state.destroyed) return;
      state.destroyed = true;
      state.eventsAbort?.abort();
      if (typeof state.unsubscribe === 'function') state.unsubscribe();
      else state.unsubscribe?.unsubscribe?.();
      if (state.ownsStore && typeof state.store?.stop === 'function') state.store.stop();
      CONTROLLERS.delete(root);
      root.classList.remove('boh-admin');
      root.removeAttribute('aria-busy');
      root.replaceChildren();
    },
  };

  CONTROLLERS.set(root, controller);
  return controller;
}

export async function mountAdminAllStarBoh(container, options = {}) {
  const controller = createAdminAllStarBohController({ ...options, container });
  await controller.mount();
  return controller;
}

export const initializeAdminAllStarBoh = mountAdminAllStarBoh;
