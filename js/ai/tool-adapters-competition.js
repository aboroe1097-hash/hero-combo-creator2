// Competition #12 adapters: the public schedule (get_competition_status) and
// the signed-in member's own registration (get_my_competition).
//
// get_competition_status reads only what the signed-out VtsScore page reads.
// get_my_competition reads only documents the member's own Firebase account may
// read under firestore.rules — their member grant, their own sign-up, and the
// live public growth-board projection — and returns nothing about other members:
// board rows exist only for players who consented to a public comparison, and
// this adapter only ever looks for the member's own row.
import {
  COMPETITION_PAGE_HREF,
  COMPETITION_STATUS_SOURCE_ID,
  buildCompetitionStatus,
  loadPublishedCompetitionSchedule,
} from './competition-status.js';
import {
  COMPETITION_BOH_SLOTS,
  COMPETITION_EPIC_SLOTS,
  slotToGameClock,
} from '../competition-schedule.js';
import { VTS_SCORE_ENDPOINT } from '../all-star-boh-access.js';
import { AiToolInputError, rejectUnknownArguments, requirePlainArguments } from './tool-utils.js';

export const MY_COMPETITION_SOURCE_ID = 'my-competition';

const POWER_FIELDS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
  'unitSpecialtyPower',
  'artifactPower',
  'royalTechPower',
]);
const REQUIRED_POWER_FIELDS = Object.freeze(POWER_FIELDS.slice(0, 7));
const SEASON_PATTERN = /^[a-z0-9_-]{1,80}$/iu;
const GRANTS_COLLECTION = 'boh_allstar_member_grants';

function nowFrom(context) {
  return Number.isFinite(context.nowMs) ? context.nowMs : Date.now();
}

async function readStatus(context) {
  const read = context.readCompetitionSchedule;
  const raw = await loadPublishedCompetitionSchedule(read ? { read } : {});
  return buildCompetitionStatus(raw, {
    nowMs: nowFrom(context),
    locale: context.locale || 'en',
    timeZone: context.timeZone,
  });
}

export async function getCompetitionStatusAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, []);
  let status;
  try {
    status = await readStatus(context);
  } catch {
    throw new AiToolInputError(
      'data_unavailable',
      'The Competition #12 schedule could not be read right now; try again in a moment.'
    );
  }
  const warnings = [
    `Game time is ${status.gameTimeZone} (06:00 in Dubai is 00:00 game time). Give game time first; the local labels are the viewer's own time zone.`,
    'Slot catalogs are daily game-time slots in order of the catalog, not a member preference.',
  ];
  if (!status.published) {
    warnings.push(
      status.reason === 'schedule_invalid'
        ? 'The stored schedule is incomplete or out of order, so no phase or deadline can be stated.'
        : 'No Competition #12 schedule is published yet, so there is no phase or deadline to state.'
    );
  }
  return {
    data: status,
    meta: {
      sourceId: COMPETITION_STATUS_SOURCE_ID,
      asOf: status.now?.iso || null,
      filters: {},
      completeness: status.published ? 'complete' : 'unknown',
      warnings,
    },
  };
}

// ---------------------------------------------------------------------------
// My Competition #12

function millis(value) {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'string') return Date.parse(value);
  return NaN;
}

/** The member's own active grant, or null. Mirrors the rules' shape check. */
export function readOwnGrant(raw, uid, nowMs) {
  if (!raw || typeof raw !== 'object') return null;
  const seasonId = String(raw.seasonId || '').trim();
  if (!SEASON_PATTERN.test(seasonId) || String(raw.uid || '') !== uid) return null;
  const expiresAt = millis(raw.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return null;
  return { seasonId, expiresAt };
}

function nameKey(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .replace(/^(?:\s*\((?:vts|vet|s)\))+\s*/iu, '')
    .replace(/\s+/gu, ' ')
    .toLowerCase();
}

function slots(values, catalog) {
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter((value) => catalog.includes(value))
    .map((slot) => ({ slot, gameClock: slotToGameClock(slot) }));
}

/** What a member may be told about their own sign-up: which fields, not other people. */
export function summarizeOwnSignup(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  const commitment = raw.commitment && typeof raw.commitment === 'object' ? raw.commitment : {};
  const filled = POWER_FIELDS.filter((field) => {
    const value = Number(stats[field]);
    return stats[field] !== null && stats[field] !== '' && Number.isFinite(value) && value > 0;
  });
  const rocLevel = Number(stats.rocLevel);
  const submittedAt = Number(raw.submittedAtMs);
  return {
    status: ['draft', 'submitted', 'withdrawn'].includes(raw.status) ? raw.status : 'draft',
    gameName: String(raw.gameName || '').trim() || null,
    submittedAt:
      Number.isFinite(submittedAt) && submittedAt > 0 ? new Date(submittedAt).toISOString() : null,
    filledPowerFields: filled,
    missingRequiredPowerFields: REQUIRED_POWER_FIELDS.filter((field) => !filled.includes(field)),
    missingOptionalPowerFields: POWER_FIELDS.slice(7).filter((field) => !filled.includes(field)),
    rocLevel: Number.isInteger(rocLevel) && rocLevel > 0 ? rocLevel : null,
    activeTimes: {
      boh: slots(commitment.bohTimeSlots, COMPETITION_BOH_SLOTS),
      epic: slots(commitment.epicTimeSlots, COMPETITION_EPIC_SLOTS),
    },
    publicComparisonConsent: commitment.publicComparisonConsent === true,
  };
}

/** The member's own place on the public board, and nothing else from it. */
export function findOwnBoardEntry(board, { seasonId, gameName, consent }) {
  if (!board || typeof board !== 'object') {
    return { available: false, note: 'The Growth Board is not available yet.' };
  }
  if (String(board.seasonId || '') !== seasonId) {
    return { available: false, note: 'The Growth Board belongs to another season.' };
  }
  const key = nameKey(gameName);
  const rows = Array.isArray(board.rows) ? board.rows : [];
  const winners = Array.isArray(board.winners) ? board.winners : [];
  const row = key ? rows.find((entry) => nameKey(entry?.gameName) === key) : null;
  const winner = key ? winners.find((entry) => nameKey(entry?.gameName) === key) : null;
  const available = {
    available: true,
    updatedAt:
      typeof (board.updatedAt || board.publishedAt) === 'string'
        ? board.updatedAt || board.publishedAt
        : null,
    winnerRank: winner ? Number(winner.rank) || null : null,
  };
  if (row && consent) {
    return {
      ...available,
      listed: true,
      rank: Number(row.rank) || null,
      baselineSource: ['vtsscore-2026', 'vtsscore-prior', 'signup'].includes(row.baselineSource)
        ? row.baselineSource
        : null,
      growthPct: Number.isFinite(row.growthPct) ? row.growthPct : null,
      growthAbs: Number.isFinite(row.growthAbs) ? row.growthAbs : null,
    };
  }
  return {
    ...available,
    listed: false,
    note: consent
      ? 'Not listed yet: a valid re-upload within the window is required.'
      : 'Your values stay private while public sharing is off.',
  };
}

async function readPublicGrowthBoard(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('Public board fetch is unavailable.');
  const response = await fetchImpl(`${VTS_SCORE_ENDPOINT}?view=competition-growth`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  if (!response?.ok) throw new Error('The public growth board could not be read.');
  const payload = await response.json();
  if (
    payload?.schemaVersion !== 1 ||
    (payload.board !== null &&
      (!payload.board || typeof payload.board !== 'object' || !Array.isArray(payload.board.rows)))
  ) {
    throw new Error('The public growth board response is invalid.');
  }
  return payload.board;
}

async function defaultReadMyCompetition(context = {}) {
  const [firebase, { importFirestore }] = await Promise.all([
    import('../firebase.js'),
    import('../firebase-sdk.js'),
  ]);
  const setup = firebase.initFirebase();
  if (!setup?.configured || !setup.db) return { user: null };
  const user = firebase.getCurrentUser() || (await firebase.waitForAuthReady());
  if (!user?.uid) return { user: null };
  const { doc, getDoc } = await importFirestore();
  const readDoc = async (path) => {
    try {
      const snapshot = await getDoc(doc(setup.db, path));
      return snapshot?.exists?.() ? snapshot.data() : null;
    } catch (error) {
      if (String(error?.code || '').includes('permission-denied')) return null;
      throw error;
    }
  };
  return {
    user: { uid: user.uid },
    readGrant: () => readDoc(`${GRANTS_COLLECTION}/${user.uid}`),
    readSignup: (seasonId) => readDoc(`boh_allstar/${seasonId}/submissions/${user.uid}`),
    readBoard: () => readPublicGrowthBoard(context.fetch || globalThis.fetch),
  };
}

function signedOut(reason) {
  return {
    data: {
      signedIn: false,
      reason,
      page: COMPETITION_PAGE_HREF,
      message:
        reason === 'no_member_access'
          ? 'Unlock VtsScore with your member PIN, then ask again to see your Competition #12 registration.'
          : 'Sign in on VtsScore to see your Competition #12 registration.',
    },
    meta: {
      sourceId: MY_COMPETITION_SOURCE_ID,
      filters: {},
      completeness: 'unknown',
      warnings: [
        'Never ask for the member PIN in chat; the member unlocks VtsScore on its own page.',
      ],
    },
  };
}

export async function getMyCompetitionAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, []);
  const nowMs = nowFrom(context);
  let session;
  try {
    session = await (context.readMyCompetition || defaultReadMyCompetition)(context);
  } catch {
    throw new AiToolInputError(
      'data_unavailable',
      'Your Competition #12 registration could not be read right now; try again in a moment.'
    );
  }
  if (!session?.user?.uid) return signedOut('not_signed_in');
  let grant;
  try {
    grant = readOwnGrant(await session.readGrant(), session.user.uid, nowMs);
  } catch {
    grant = null;
  }
  if (!grant) return signedOut('no_member_access');

  let signupRaw;
  let board;
  let status = null;
  try {
    [signupRaw, board] = await Promise.all([
      session.readSignup(grant.seasonId),
      session.readBoard().catch(() => null),
    ]);
  } catch {
    throw new AiToolInputError(
      'data_unavailable',
      'Your Competition #12 registration could not be read right now; try again in a moment.'
    );
  }
  try {
    status = await readStatus(context);
  } catch {
    status = null;
  }
  const signup =
    signupRaw && String(signupRaw.uid || '') === session.user.uid
      ? summarizeOwnSignup(signupRaw)
      : null;
  const growth = signup
    ? findOwnBoardEntry(board, {
        seasonId: grant.seasonId,
        gameName: signup.gameName,
        consent: signup.publicComparisonConsent,
      })
    : null;
  return {
    data: {
      signedIn: true,
      seasonId: grant.seasonId,
      page: COMPETITION_PAGE_HREF,
      phase: status?.phase ?? null,
      acceptsSignupEdits: status ? status.acceptsSignupEdits : null,
      acceptsReupload: status ? status.acceptsReupload : null,
      registered: Boolean(signup),
      registration: signup,
      growth,
    },
    meta: {
      sourceId: MY_COMPETITION_SOURCE_ID,
      filters: {},
      completeness: signup ? 'complete' : 'partial',
      warnings: [
        "This is the signed-in member's own registration only; never compare it with another member's private values.",
        'Power values are not repeated here: only which fields are filled. The member can review exact values on VtsScore.',
        'Baseline source and growth are available when the live Growth Board is ready.',
      ],
    },
  };
}
