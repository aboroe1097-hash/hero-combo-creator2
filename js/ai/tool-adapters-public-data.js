// Public, read-only adapters: Arcade leaderboards (Firestore, public-read),
// All-Star BoH mechanics (static app data), and VtsScore mechanics (static app
// data). None of these tools touch private rosters, ballots, or PIN-gated data.
import {
  BOH_2025_SCORING_PROFILE,
  BOH_DEFAULT_LEGIONS,
  BOH_DEFAULT_PHASES,
  BOH_DEFAULT_ROLE_GROUPS,
  BOH_ENTRY_METHODS,
  BOH_FIGHTING_TIME_IDS,
  BOH_PLAYER_RESOURCE_SKILLS,
  BOH_TEAM_COUNT,
  BOH_TEAM_SIZE,
} from '../all-star-boh-model.js';
import { getAllStarBohSignupWindowState } from '../all-star-boh-schedule.js';
import { BOH_STATS_OPTIONAL_POWER_FIELDS, BOH_STATS_REQUIRED_POWER_FIELDS } from '../all-star-boh-ocr.js';
import {
  VTS_SCORE_MAX_POWER,
  VTS_SCORE_POWER_FIELDS,
  VTS_SCORE_VERSION,
} from '../vts-score-model.js';
import {
  AiToolInputError,
  boundedInteger,
  boundedString,
  rejectUnknownArguments,
  requirePlainArguments,
} from './tool-utils.js';

const ARCADE_GAMES = Object.freeze([
  'merge_rush',
  'sort_hoard',
  'crystal_relay',
  'set_assembly',
  'hero_rumble',
]);

async function defaultFetchArcadeLeaderboards({ topN }) {
  const firebase = await import('../firebase.js');
  await firebase.initFirebase?.();
  const arcade = await import('../arcade-scores.js');
  return arcade.fetchLeaderboards({ topN });
}

function publicGameRow(row) {
  return { rank: row.rank, name: row.name, state: row.state, score: row.score };
}

function publicOverallRow(row) {
  const perGame = {};
  for (const [gameId, entry] of Object.entries(row.perGame || {})) {
    if (ARCADE_GAMES.includes(gameId)) perGame[gameId] = entry.score;
  }
  return {
    rank: row.rank,
    name: row.name,
    state: row.state,
    rating: row.rating,
    gamesPlayed: row.gamesPlayed,
    totalGames: row.totalGames,
    perGame,
  };
}

export async function getArcadeLeaderboardAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['kind', 'gameId', 'topN']);
  const kind = boundedString(args.kind, 'kind', { maximum: 12 });
  if (!['overall', 'per_game'].includes(kind)) {
    throw new AiToolInputError('malformed_arguments', 'kind must be overall or per_game.');
  }
  const topN =
    args.topN === undefined
      ? 25
      : boundedInteger(args.topN, 'topN', { minimum: 1, maximum: 50 });
  let gameId = null;
  if (kind === 'per_game') {
    gameId = boundedString(args.gameId, 'gameId', { maximum: 30 });
    if (!ARCADE_GAMES.includes(gameId)) {
      throw new AiToolInputError('malformed_arguments', 'gameId is not a known Arcade game.');
    }
  }

  const fetchLeaderboards = context.fetchLeaderboards ?? defaultFetchArcadeLeaderboards;
  let boards;
  try {
    boards = await fetchLeaderboards({ topN });
  } catch {
    throw new AiToolInputError(
      'data_unavailable',
      'The Arcade leaderboard is temporarily unavailable; try again in a moment.'
    );
  }
  const empty = Boolean(boards?.empty);
  const warnings = [
    'Leaderboard rows are public aggregate scores; player names come from their own Arcade profile.',
  ];
  if (kind === 'per_game') {
    const rows = ((boards?.perGame || {})[gameId] || []).map(publicGameRow);
    return {
      data: { kind, gameId, topN, empty, rows },
      meta: {
        sourceId: 'vts-arcade-leaderboard',
        filters: { kind, gameId, topN },
        truncated: rows.length === topN,
        completeness: empty ? 'unknown' : 'complete',
        warnings,
      },
    };
  }
  const rows = (boards?.overall || []).map(publicOverallRow);
  return {
    data: { kind, topN, empty, rows },
    meta: {
      sourceId: 'vts-arcade-leaderboard',
      filters: { kind, topN },
      truncated: rows.length === topN,
      completeness: empty ? 'unknown' : 'complete',
      warnings,
    },
  };
}

function signupWindowState(nowMs) {
  const { phase, opensAt, closesAt, remainingSeconds } = getAllStarBohSignupWindowState(
    undefined,
    nowMs
  );
  return { phase, opensAt, closesAt, remainingSeconds };
}

export async function getAllStarBohMechanicsAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['kind']);
  const kind = boundedString(args.kind, 'kind', { maximum: 12 });
  if (!['overview', 'scoring'].includes(kind)) {
    throw new AiToolInputError('malformed_arguments', 'kind must be overview or scoring.');
  }
  const nowMs = Number.isFinite(context.nowMs) ? context.nowMs : Date.now();
  const warnings = [
    'These are the public All-Star BoH mechanics; signup contents, rosters, and access status are member-only.',
  ];

  if (kind === 'scoring') {
    const profile = BOH_2025_SCORING_PROFILE;
    return {
      data: {
        id: profile.id,
        label: profile.label,
        powerDivisor: profile.powerDivisor,
        precision: profile.precision,
        powerWeights: { ...profile.powerWeights },
        bonusWeights: { ...profile.bonusWeights },
      },
      meta: {
        sourceId: 'all-star-boh-mechanics',
        filters: { kind },
        completeness: 'complete',
        warnings,
      },
    };
  }

  return {
    data: {
      teamCount: BOH_TEAM_COUNT,
      teamSize: BOH_TEAM_SIZE,
      fightingTimeIds: [...BOH_FIGHTING_TIME_IDS],
      entryMethods: [...BOH_ENTRY_METHODS],
      roleGroups: BOH_DEFAULT_ROLE_GROUPS.map(({ id, label, capacity }) => ({
        id,
        label,
        capacity,
      })),
      phases: BOH_DEFAULT_PHASES.map(({ id, label, startMinute, endMinute }) => ({
        id,
        label,
        startMinute,
        endMinute,
      })),
      legions: BOH_DEFAULT_LEGIONS.map(({ id, label }) => ({ id, label })),
      resourceSkills: BOH_PLAYER_RESOURCE_SKILLS.map(({ id, meritCost }) => ({
        id,
        meritCost,
      })),
      signupWindow: signupWindowState(nowMs),
    },
    meta: {
      sourceId: 'all-star-boh-mechanics',
      filters: { kind },
      completeness: 'complete',
      warnings,
    },
  };
}

export async function getVtsScoreMechanicsAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, []);
  return {
    data: {
      version: VTS_SCORE_VERSION,
      maxPower: VTS_SCORE_MAX_POWER,
      requiredPowerFields: [...BOH_STATS_REQUIRED_POWER_FIELDS],
      optionalPowerFields: [...BOH_STATS_OPTIONAL_POWER_FIELDS],
      allPowerFields: [...VTS_SCORE_POWER_FIELDS],
    },
    meta: {
      sourceId: 'vts-score-mechanics',
      filters: {},
      completeness: 'complete',
      warnings: [
        'VtsScore is leadership-reviewed final score upload; individual player scores and signup data are member-only.',
      ],
    },
  };
}
