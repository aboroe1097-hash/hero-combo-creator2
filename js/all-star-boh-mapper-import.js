import { normalizeBohName, normalizeBohNameKey } from './all-star-boh-model.js';

export const BOH_MAPPER_IMPORT_MAX_BYTES = 1024 * 1024;
export const BOH_MAPPER_IMPORT_FORMAT = 'all-star-boh-exact-view';
export const BOH_MAPPER_IMPORT_VERSION = 1;

const TEAM_IDS = Object.freeze(Array.from({ length: 6 }, (_, index) => `team-${index + 1}`));
const ROLE_GROUPS = new Set(['offensive', 'top', 'bottom', 'rune']);
const ROLE_BY_SCORE_RANK = Object.freeze({
  1: 'offensive',
  2: 'offensive',
  3: 'top',
  4: 'bottom',
  5: 'top',
  6: 'bottom',
  7: 'offensive',
  8: 'offensive',
  9: 'rune',
  10: 'rune',
  11: 'bottom',
  12: 'top',
});
const MAX_NAME_LENGTH = 120;
const MAX_METADATA_LENGTH = 80;
const MAX_SCORE = 10_000_000;
const MAX_POWER = 10_000_000_000_000;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function record(value, code, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code, message);
  return value;
}

function text(value, { code, label, max = MAX_METADATA_LENGTH, required = false }) {
  if (typeof value !== 'string') fail(code, `${label} must be a string.`);
  const result = normalizeBohName(value);
  if (required && !result) fail(code, `${label} is required.`);
  if (result.length > max) fail(code, `${label} is too long.`);
  return result;
}

function optionalText(value, options) {
  return value === undefined ? '' : text(value, options);
}

function boundedNumber(value, { code, label, max }) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
    fail(code, `${label} must be a finite number from 0 to ${max}.`);
  }
  return value;
}

function normalizePlayer(value, teamId, seatNumber, ids, names) {
  const player = record(
    value,
    'boh-mapper-player-shape',
    `Team ${teamId} seat ${seatNumber} must be a player object.`
  );
  const mapperId = text(player.id, {
    code: 'boh-mapper-player-id',
    label: `Team ${teamId} seat ${seatNumber} mapper player ID`,
    required: true,
  });
  if (ids.has(mapperId)) {
    fail('boh-mapper-duplicate-player-id', `Mapper player ID ${mapperId} is used more than once.`);
  }
  ids.add(mapperId);
  const displayName = text(player.name, {
    code: 'boh-mapper-player-name',
    label: `Team ${teamId} seat ${seatNumber} player name`,
    max: MAX_NAME_LENGTH,
    required: true,
  });
  const normalizedName = normalizeBohNameKey(displayName);
  if (names.has(normalizedName)) {
    fail(
      'boh-mapper-duplicate-player-name',
      `Imported player name ${displayName} is duplicated after normalization.`
    );
  }
  names.add(normalizedName);
  if (player.locked !== undefined && typeof player.locked !== 'boolean') {
    fail(
      'boh-mapper-player-lock',
      `Team ${teamId} seat ${seatNumber} locked value must be true or false.`
    );
  }
  const userLockTeamId = optionalText(player.userLockTeamId, {
    code: 'boh-mapper-player-lock',
    label: `Team ${teamId} seat ${seatNumber} user lock team ID`,
  });
  if (userLockTeamId && !TEAM_IDS.includes(userLockTeamId)) {
    fail(
      'boh-mapper-player-lock',
      `Team ${teamId} seat ${seatNumber} has an unsupported user lock team ID.`
    );
  }
  const planRole = optionalText(player.planRole, {
    code: 'boh-mapper-player-role',
    label: `Team ${teamId} seat ${seatNumber} plan role`,
  }).toLocaleLowerCase('en');
  if (planRole && !ROLE_GROUPS.has(planRole)) {
    fail(
      'boh-mapper-player-role',
      `Team ${teamId} seat ${seatNumber} has an unsupported plan role.`
    );
  }
  const rawRole = optionalText(player.commandRole, {
    code: 'boh-mapper-command-role',
    label: `Team ${teamId} seat ${seatNumber} command role`,
  }).toLocaleLowerCase('en');
  const rawSource = optionalText(player.commandRoleSource, {
    code: 'boh-mapper-command-role',
    label: `Team ${teamId} seat ${seatNumber} command role source`,
  }).toLocaleLowerCase('en');
  if (rawRole && !['leader', 'coleader'].includes(rawRole)) {
    fail(
      'boh-mapper-command-role',
      `Team ${teamId} seat ${seatNumber} has an unsupported command role.`
    );
  }
  if (rawSource && !['auto', 'explicit'].includes(rawSource)) {
    fail(
      'boh-mapper-command-role',
      `Team ${teamId} seat ${seatNumber} has an unsupported command role source.`
    );
  }
  if (Boolean(rawRole) !== Boolean(rawSource)) {
    fail(
      'boh-mapper-command-role',
      `Team ${teamId} seat ${seatNumber} has incomplete command role metadata.`
    );
  }
  const explicit = rawSource === 'explicit' && ['leader', 'coleader'].includes(rawRole);
  return {
    seatNumber,
    mapperId,
    displayName,
    score: boundedNumber(player.score, {
      code: 'boh-mapper-player-score',
      label: `Team ${teamId} seat ${seatNumber} score`,
      max: MAX_SCORE,
    }),
    power: boundedNumber(player.power, {
      code: 'boh-mapper-player-power',
      label: `Team ${teamId} seat ${seatNumber} power`,
      max: MAX_POWER,
    }),
    locked: player.locked === true,
    userLockTeamId,
    planRole,
    commandRole: explicit ? rawRole : '',
    commandRoleSource: explicit ? 'explicit' : '',
  };
}

function normalizeTeam(value, index, ids, names) {
  const expectedId = TEAM_IDS[index];
  const team = record(value, 'boh-mapper-team-shape', `Team ${index + 1} must be an object.`);
  const id = text(team.id, {
    code: 'boh-mapper-team-id',
    label: `Team ${index + 1} ID`,
    required: true,
  });
  if (id !== expectedId) {
    fail('boh-mapper-team-id', `Team ${index + 1} must have ID ${expectedId}.`);
  }
  if (!Array.isArray(team.players) || team.players.length !== 12) {
    fail('boh-mapper-team-player-count', `Team ${id} must contain exactly 12 players.`);
  }
  const name = text(team.name, {
    code: 'boh-mapper-team-name',
    label: `Team ${id} name`,
    max: MAX_NAME_LENGTH,
    required: true,
  });
  const color = text(team.color, {
    code: 'boh-mapper-team-color',
    label: `Team ${id} color`,
    required: true,
  });
  if (!/^(?:#[0-9a-f]{6}|[a-z][a-z0-9-]{0,31})$/iu.test(color)) {
    fail('boh-mapper-team-color', `Team ${id} has an unsupported color.`);
  }
  const fightTime = optionalText(team.fightTime, {
    code: 'boh-mapper-team-metadata',
    label: `Team ${id} fight time`,
  });
  const tier = optionalText(team.tier, {
    code: 'boh-mapper-team-metadata',
    label: `Team ${id} tier`,
  });
  const players = team.players.map((player, playerIndex) =>
    normalizePlayer(player, id, playerIndex + 1, ids, names)
  );
  if (
    players.filter((player) => player.commandRole === 'leader').length > 1 ||
    players.filter((player) => player.commandRole === 'coleader').length > 2
  ) {
    fail(
      'boh-mapper-command-role-count',
      `Team ${id} may contain at most one explicit leader and two explicit co-leaders.`
    );
  }
  const derivedRoles = new Map(
    players
      .slice()
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.power - left.power ||
          left.displayName.localeCompare(right.displayName)
      )
      .map((player, rankIndex) => [player.mapperId, ROLE_BY_SCORE_RANK[rankIndex + 1]])
  );
  const normalizedPlayers = players.map(({ score, power, ...player }) => ({
    ...player,
    planRole: player.planRole || derivedRoles.get(player.mapperId),
  }));
  return { id, name, color, fightTime, tier, players: normalizedPlayers };
}

export function parseAllStarBohMapperExactView(input) {
  if (typeof input !== 'string') fail('boh-mapper-input-type', 'Mapper import must be JSON text.');
  if (new TextEncoder().encode(input).byteLength > BOH_MAPPER_IMPORT_MAX_BYTES) {
    fail(
      'boh-mapper-file-too-large',
      `Mapper import exceeds the ${BOH_MAPPER_IMPORT_MAX_BYTES}-byte limit.`
    );
  }
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    fail('boh-mapper-invalid-json', 'Mapper import is not valid JSON.');
  }
  const root = record(payload, 'boh-mapper-package-shape', 'Mapper import must be a JSON object.');
  if (root.format !== BOH_MAPPER_IMPORT_FORMAT) {
    fail('boh-mapper-wrong-format', `Mapper import format must be ${BOH_MAPPER_IMPORT_FORMAT}.`);
  }
  if (root.version !== BOH_MAPPER_IMPORT_VERSION) {
    fail('boh-mapper-wrong-version', `Mapper import version must be ${BOH_MAPPER_IMPORT_VERSION}.`);
  }
  const state = record(
    root.state,
    'boh-mapper-state-shape',
    'Mapper import state must be an object.'
  );
  if (!Array.isArray(state.teams) || state.teams.length !== 6) {
    fail('boh-mapper-team-count', 'Mapper import must contain exactly 6 teams.');
  }
  const seenTeamIds = new Set();
  for (const team of state.teams) {
    const id = typeof team?.id === 'string' ? normalizeBohName(team.id) : '';
    if (id && seenTeamIds.has(id)) {
      fail('boh-mapper-duplicate-team-id', `Mapper team ID ${id} is used more than once.`);
    }
    if (id) seenTeamIds.add(id);
  }
  const ids = new Set();
  const names = new Set();
  const teams = state.teams.map((team, index) => normalizeTeam(team, index, ids, names));
  return {
    format: BOH_MAPPER_IMPORT_FORMAT,
    version: BOH_MAPPER_IMPORT_VERSION,
    teamCount: 6,
    playerCount: 72,
    teams,
  };
}
