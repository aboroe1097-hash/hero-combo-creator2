import { normalizeBohName, normalizeBohNameKey } from './all-star-boh-model.js';

export const BOH_MAPPER_PLAN_IMPORT_MAX_BYTES = 256 * 1024;
export const BOH_MAPPER_PLAN_IMPORT_FORMAT = 'all-star-boh-stage1-role-plan';
export const BOH_MAPPER_PLAN_IMPORT_VERSION = 2;
export const BOH_MAPPER_PLAN_BUNDLE_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const BOH_MAPPER_PLAN_BUNDLE_FORMAT = 'all-star-boh-stage1-role-plan-bundle';
export const BOH_MAPPER_PLAN_BUNDLE_VERSION = 1;

const ROLE_KEYS = new Set(['offensive', 'top', 'bottom', 'rune']);
const PHASE_TIMES = Object.freeze(['0-5', '5-10', '10-15', '15-30', '30-60']);
const BUILD_FOCUS_KEYS = Object.freeze(['center', 'top', 'bottom', 'rune']);
const BUNDLE_PLAN_COUNT = 6;
const MAX_TEAM_ID_LENGTH = 80;
const MAX_NAME_LENGTH = 120;
const MAX_METADATA_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 600;
const MAX_INSTRUCTION_LENGTH = 1_000;
const MAX_SCORE = 10_000_000;
const MAX_POWER = 10_000_000_000_000;
const MAX_TITLE_BADGES = 12;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function record(value, code, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, message);
  return value;
}

function normalizedText(value, { code, label, max = MAX_METADATA_LENGTH, required = false }) {
  if (typeof value !== 'string') fail(code, `${label} must be a string.`);
  const result = normalizeBohName(value);
  if (required && !result) fail(code, `${label} is required.`);
  if (result.length > max) fail(code, `${label} is too long.`);
  return result;
}

function optionalText(value, options) {
  return value === undefined ? '' : normalizedText(value, options);
}

function optionalNumber(value, { code, label, max }) {
  if (value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
    fail(code, `${label} must be a finite number from 0 to ${max}.`);
  }
  return value;
}

function normalizeTeam(value) {
  const team = record(value, 'boh-mapper-plan-team-shape', 'Role-plan team must be an object.');
  return {
    id: normalizedText(team.id, {
      code: 'boh-mapper-plan-team-id',
      label: 'Role-plan team ID',
      max: MAX_TEAM_ID_LENGTH,
      required: true,
    }),
    name: normalizedText(team.name, {
      code: 'boh-mapper-plan-team-name',
      label: 'Role-plan team name',
      max: MAX_NAME_LENGTH,
      required: true,
    }),
    score: optionalNumber(team.score, {
      code: 'boh-mapper-plan-team-score',
      label: 'Role-plan team score',
      max: MAX_SCORE,
    }),
    power: optionalNumber(team.power, {
      code: 'boh-mapper-plan-team-power',
      label: 'Role-plan team power',
      max: MAX_POWER,
    }),
    displayLocale: optionalText(team.displayLocale, {
      code: 'boh-mapper-plan-team-locale',
      label: 'Role-plan team display locale',
      max: 40,
    }),
    dominantPlayerLocale: optionalText(team.dominantPlayerLocale, {
      code: 'boh-mapper-plan-team-locale',
      label: 'Role-plan team dominant player locale',
      max: 40,
    }),
  };
}

function normalizeBuildFocus(value) {
  if (value === undefined) return null;
  const focus = record(
    value,
    'boh-mapper-plan-build-focus',
    'Role-plan build focus must be an object.'
  );
  return Object.fromEntries(
    BUILD_FOCUS_KEYS.map((key) => [
      key,
      optionalText(focus[key], {
        code: 'boh-mapper-plan-build-focus',
        label: `Role-plan ${key} build focus`,
        max: MAX_DESCRIPTION_LENGTH,
      }),
    ])
  );
}

function normalizeTitleBadges(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_TITLE_BADGES) {
    fail(
      'boh-mapper-plan-title-badges',
      `Role-plan title badges must be an array of at most ${MAX_TITLE_BADGES} items.`
    );
  }
  return value.map((entry, index) => {
    const badge = record(
      entry,
      'boh-mapper-plan-title-badges',
      `Role-plan title badge ${index + 1} must be an object.`
    );
    return {
      label: normalizedText(badge.label, {
        code: 'boh-mapper-plan-title-badges',
        label: `Role-plan title badge ${index + 1} label`,
        required: true,
      }),
      value: normalizedText(badge.value, {
        code: 'boh-mapper-plan-title-badges',
        label: `Role-plan title badge ${index + 1} value`,
        max: MAX_DESCRIPTION_LENGTH,
        required: true,
      }),
    };
  });
}

function normalizePhase(value, playerName, index) {
  const phase = record(
    value,
    'boh-mapper-plan-phase-shape',
    `Role-plan player ${playerName} phase ${index + 1} must be an object.`
  );
  const time = normalizedText(phase.time, {
    code: 'boh-mapper-plan-phase-time',
    label: `Role-plan player ${playerName} phase ${index + 1} time`,
    max: 20,
    required: true,
  });
  const canonicalTime = time
    .toLocaleLowerCase('en')
    .replace(/[\u2013\u2014]/gu, '-')
    .replace(/\s+/gu, '')
    .replace(/(?:minutes?|mins?|\u5206\u949f)$/u, '');
  if (canonicalTime !== PHASE_TIMES[index]) {
    fail(
      'boh-mapper-plan-phase-time',
      `Role-plan player ${playerName} phase ${index + 1} time must be ${PHASE_TIMES[index]}.`
    );
  }
  return {
    time: PHASE_TIMES[index],
    stageRole: normalizedText(phase.stageRole, {
      code: 'boh-mapper-plan-phase-stage-role',
      label: `Role-plan player ${playerName} phase ${time} stage role`,
      max: MAX_DESCRIPTION_LENGTH,
      required: true,
    }),
    legion1: normalizedText(phase.legion1, {
      code: 'boh-mapper-plan-phase-legion',
      label: `Role-plan player ${playerName} phase ${time} legion 1 instruction`,
      max: MAX_INSTRUCTION_LENGTH,
      required: true,
    }),
    legion2: normalizedText(phase.legion2, {
      code: 'boh-mapper-plan-phase-legion',
      label: `Role-plan player ${playerName} phase ${time} legion 2 instruction`,
      max: MAX_INSTRUCTION_LENGTH,
      required: true,
    }),
    note: optionalText(phase.note, {
      code: 'boh-mapper-plan-phase-note',
      label: `Role-plan player ${playerName} phase ${time} note`,
      max: MAX_INSTRUCTION_LENGTH,
    }),
  };
}

function normalizePlayer(value, index, names, ranks) {
  const player = record(
    value,
    'boh-mapper-plan-player-shape',
    `Role-plan player ${index + 1} must be an object.`
  );
  const name = normalizedText(player.name, {
    code: 'boh-mapper-plan-player-name',
    label: `Role-plan player ${index + 1} name`,
    max: MAX_NAME_LENGTH,
    required: true,
  });
  const nameKey = normalizeBohNameKey(name);
  if (names.has(nameKey)) {
    fail(
      'boh-mapper-plan-duplicate-player-name',
      `Role-plan player name ${name} is duplicated after normalization.`
    );
  }
  names.add(nameKey);
  if (!Number.isInteger(player.scoreRank) || player.scoreRank < 1 || player.scoreRank > 12) {
    fail(
      'boh-mapper-plan-player-rank',
      `Role-plan player ${name} score rank must be an integer from 1 to 12.`
    );
  }
  if (ranks.has(player.scoreRank)) {
    fail(
      'boh-mapper-plan-duplicate-player-rank',
      `Role-plan score rank ${player.scoreRank} is used more than once.`
    );
  }
  ranks.add(player.scoreRank);
  const roleKey = normalizedText(player.roleKey, {
    code: 'boh-mapper-plan-player-role',
    label: `Role-plan player ${name} role key`,
    max: 20,
    required: true,
  }).toLocaleLowerCase('en');
  if (!ROLE_KEYS.has(roleKey)) {
    fail('boh-mapper-plan-player-role', `Role-plan player ${name} has an unsupported role key.`);
  }
  const role = record(
    player.role,
    'boh-mapper-plan-player-role',
    `Role-plan player ${name} role must be an object.`
  );
  if (!Array.isArray(player.phases) || player.phases.length !== PHASE_TIMES.length) {
    fail(
      'boh-mapper-plan-phase-count',
      `Role-plan player ${name} must contain exactly ${PHASE_TIMES.length} phases.`
    );
  }
  return {
    scoreRank: player.scoreRank,
    name,
    locale: optionalText(player.locale, {
      code: 'boh-mapper-plan-player-locale',
      label: `Role-plan player ${name} locale`,
      max: 40,
    }),
    score: optionalNumber(player.score, {
      code: 'boh-mapper-plan-player-score',
      label: `Role-plan player ${name} score`,
      max: MAX_SCORE,
    }),
    power: optionalNumber(player.power, {
      code: 'boh-mapper-plan-player-power',
      label: `Role-plan player ${name} power`,
      max: MAX_POWER,
    }),
    roleKey,
    role: {
      label: normalizedText(role.label, {
        code: 'boh-mapper-plan-player-role',
        label: `Role-plan player ${name} role label`,
        required: true,
      }),
      description: normalizedText(role.description, {
        code: 'boh-mapper-plan-player-role',
        label: `Role-plan player ${name} role description`,
        max: MAX_DESCRIPTION_LENGTH,
        required: true,
      }),
    },
    phases: player.phases.map((phase, phaseIndex) => normalizePhase(phase, name, phaseIndex)),
  };
}

function normalizeSavedAt(value, { code, label, required = false }) {
  const savedAt = required
    ? normalizedText(value, { code, label, max: 40, required: true })
    : optionalText(value, { code, label, max: 40 });
  if (savedAt && Number.isNaN(Date.parse(savedAt))) {
    fail(code, `${label} must be an ISO date-time string.`);
  }
  return savedAt;
}

function normalizeRolePlan(payload) {
  const root = record(
    payload,
    'boh-mapper-plan-package-shape',
    'Role-plan import must be a JSON object.'
  );
  if (root.format !== BOH_MAPPER_PLAN_IMPORT_FORMAT) {
    fail(
      'boh-mapper-plan-wrong-format',
      `Role-plan import format must be ${BOH_MAPPER_PLAN_IMPORT_FORMAT}.`
    );
  }
  if (root.version !== BOH_MAPPER_PLAN_IMPORT_VERSION) {
    fail(
      'boh-mapper-plan-wrong-version',
      `Role-plan import version must be ${BOH_MAPPER_PLAN_IMPORT_VERSION}.`
    );
  }
  if (!Array.isArray(root.players) || root.players.length !== 12) {
    fail('boh-mapper-plan-player-count', 'Role-plan import must contain exactly 12 players.');
  }
  const savedAt = normalizeSavedAt(root.savedAt, {
    code: 'boh-mapper-plan-saved-at',
    label: 'Role-plan save timestamp',
  });
  const names = new Set();
  const ranks = new Set();
  return {
    format: BOH_MAPPER_PLAN_IMPORT_FORMAT,
    version: BOH_MAPPER_PLAN_IMPORT_VERSION,
    savedAt,
    team: normalizeTeam(root.team),
    rule: optionalText(root.rule, {
      code: 'boh-mapper-plan-rule',
      label: 'Role-plan rule',
      max: MAX_DESCRIPTION_LENGTH,
    }),
    buildFocus: normalizeBuildFocus(root.buildFocus),
    titleBadges: normalizeTitleBadges(root.titleBadges),
    playerCount: 12,
    phaseCount: PHASE_TIMES.length,
    players: root.players.map((player, index) => normalizePlayer(player, index, names, ranks)),
  };
}

export function parseAllStarBohMapperStage1RolePlan(input) {
  if (typeof input !== 'string') {
    fail('boh-mapper-plan-input-type', 'Role-plan import must be JSON text.');
  }
  if (new TextEncoder().encode(input).byteLength > BOH_MAPPER_PLAN_IMPORT_MAX_BYTES) {
    fail(
      'boh-mapper-plan-file-too-large',
      `Role-plan import exceeds the ${BOH_MAPPER_PLAN_IMPORT_MAX_BYTES}-byte limit.`
    );
  }
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    fail('boh-mapper-plan-invalid-json', 'Role-plan import is not valid JSON.');
  }
  return normalizeRolePlan(payload);
}

export function parseAllStarBohMapperStage1RolePlanBundle(input) {
  if (typeof input !== 'string') {
    fail('boh-mapper-plan-bundle-input-type', 'Role-plan bundle import must be JSON text.');
  }
  if (new TextEncoder().encode(input).byteLength > BOH_MAPPER_PLAN_BUNDLE_IMPORT_MAX_BYTES) {
    fail(
      'boh-mapper-plan-bundle-file-too-large',
      `Role-plan bundle import exceeds the ${BOH_MAPPER_PLAN_BUNDLE_IMPORT_MAX_BYTES}-byte limit.`
    );
  }
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    fail('boh-mapper-plan-bundle-invalid-json', 'Role-plan bundle import is not valid JSON.');
  }
  const root = record(
    payload,
    'boh-mapper-plan-bundle-package-shape',
    'Role-plan bundle import must be a JSON object.'
  );
  if (root.format !== BOH_MAPPER_PLAN_BUNDLE_FORMAT) {
    fail(
      'boh-mapper-plan-bundle-wrong-format',
      `Role-plan bundle import format must be ${BOH_MAPPER_PLAN_BUNDLE_FORMAT}.`
    );
  }
  if (root.version !== BOH_MAPPER_PLAN_BUNDLE_VERSION) {
    fail(
      'boh-mapper-plan-bundle-wrong-version',
      `Role-plan bundle import version must be ${BOH_MAPPER_PLAN_BUNDLE_VERSION}.`
    );
  }
  if (!Array.isArray(root.plans) || root.plans.length !== BUNDLE_PLAN_COUNT) {
    fail(
      'boh-mapper-plan-bundle-plan-count',
      `Role-plan bundle import must contain exactly ${BUNDLE_PLAN_COUNT} plans.`
    );
  }
  const savedAt = normalizeSavedAt(root.savedAt, {
    code: 'boh-mapper-plan-bundle-saved-at',
    label: 'Role-plan bundle save timestamp',
    required: true,
  });
  const teamIds = new Set();
  const plans = root.plans.map((plan) => {
    const normalized = normalizeRolePlan(plan);
    const teamIdKey = normalizeBohNameKey(normalized.team.id);
    if (teamIds.has(teamIdKey)) {
      fail(
        'boh-mapper-plan-bundle-duplicate-team-id',
        `Role-plan bundle team ID ${normalized.team.id} is duplicated after normalization.`
      );
    }
    teamIds.add(teamIdKey);
    return normalized;
  });
  return {
    format: BOH_MAPPER_PLAN_BUNDLE_FORMAT,
    version: BOH_MAPPER_PLAN_BUNDLE_VERSION,
    savedAt,
    planCount: BUNDLE_PLAN_COUNT,
    playerCount: BUNDLE_PLAN_COUNT * 12,
    phaseCount: BUNDLE_PLAN_COUNT * PHASE_TIMES.length,
    plans,
  };
}
