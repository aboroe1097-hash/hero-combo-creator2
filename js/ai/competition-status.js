// Competition #12 status for Velo: the phase now, the next deadline, every
// phase's open/close instants and the BoH / Epic Showdown slot catalogs.
//
// It reads exactly what the signed-out VtsScore member page reads: the public
// schedule document (boh_allstar_competition/current, readable by any signed-in
// account, the page's anonymous one included). Phase logic, game-time
// conversion and labels are the member page's own helpers, so Velo, the drawer
// deadline line and vtsscore.html can never disagree about a deadline.
//
// Times are reported twice: in game time (a fixed UTC−2, js/game-time.js) and
// in the viewer's own time zone.

import { GAME_TIME_UTC_OFFSET_MINUTES, formatGameClockZone } from '../game-time.js';
import {
  COMPETITION_BOH_SLOTS,
  COMPETITION_EPIC_SLOTS,
  COMPETITION_SCHEDULE_DOC_PATH,
  competitionAcceptsNewSignups,
  competitionAcceptsReupload,
  competitionAcceptsSignupEdits,
  getCompetitionPhase,
  getCompetitionPhaseEndsAt,
  millisToGameTime,
  normalizeCompetitionSchedule,
  slotToGameClock,
} from '../competition-schedule.js';
import { formatGameTime, formatLocalTime } from '../vts-score-competition.js';

export const COMPETITION_STATUS_SOURCE_ID = 'competition-schedule';
export const COMPETITION_PAGE_HREF = 'vtsscore.html';

// Each phase with the schedule keys that open and close it.
const PHASE_WINDOWS = Object.freeze([
  ['registration', 'opensAt', 'phase1ClosesAt'],
  ['finalCheck', 'phase1ClosesAt', 'deadlineAt'],
  ['waiting', 'deadlineAt', 'reuploadOpensAt'],
  ['reupload', 'reuploadOpensAt', 'reuploadClosesAt'],
  ['resultsPending', 'reuploadClosesAt', 'winnersStartAt'],
  ['winners', 'winnersStartAt', 'winnersEndAt'],
]);

// What happens when the current phase ends.
const PHASE_END_EVENTS = Object.freeze({
  upcoming: 'registration_opens',
  registration: 'registration_closes',
  finalCheck: 'final_check_closes',
  waiting: 'reupload_opens',
  reupload: 'reupload_closes',
  resultsPending: 'winners_announced',
  winners: 'winners_window_ends',
});

/** Phases in which a member has something to finish before the phase ends. */
export const COMPETITION_ACTION_PHASES = Object.freeze(['registration', 'finalCheck', 'reupload']);

const SCHEDULE_CACHE_MS = 60_000;
let cachedSchedule = null;
let scheduleInFlight = null;

function viewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function localClock(ms, locale, timeZone) {
  try {
    return new Intl.DateTimeFormat(locale, {
      ...(timeZone ? { timeZone } : {}),
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(ms));
  } catch {
    return null;
  }
}

/** One instant as game time and the viewer's local time. */
export function describeCompetitionInstant(ms, { locale = 'en', timeZone } = {}) {
  if (!Number.isFinite(ms)) return null;
  const game = millisToGameTime(ms);
  return {
    iso: new Date(ms).toISOString(),
    gameDate: game.date,
    gameTime: game.time,
    gameLabel: formatGameTime(ms, locale),
    localLabel: formatLocalTime(ms, locale, timeZone || undefined),
    localClock: localClock(ms, locale, timeZone),
  };
}

/** Remaining time as whole days, hours and minutes (never negative). */
export function splitRemaining(remainingMs) {
  const totalMinutes = Math.max(0, Math.floor(Number(remainingMs) / 60_000) || 0);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

/** A daily game-time slot ("+20") with its game clock and today's local clock. */
function describeSlot(slot, nowMs, locale, timeZone) {
  const gameClock = slotToGameClock(slot);
  const { date } = millisToGameTime(nowMs);
  const ms = Date.parse(`${date}T${gameClock}:00Z`) - GAME_TIME_UTC_OFFSET_MINUTES * 60_000;
  return {
    slot,
    gameClock,
    localClock: Number.isFinite(ms) ? localClock(ms, locale, timeZone) : null,
  };
}

/**
 * The full status for a raw schedule document (or null when none is
 * published). Pure: the caller supplies the document and the clock.
 */
export function buildCompetitionStatus(rawSchedule, options = {}) {
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  const locale = options.locale || 'en';
  const timeZone = options.timeZone || viewerTimeZone();
  const describe = (ms) => describeCompetitionInstant(ms, { locale, timeZone });
  const slotCatalogs = {
    boh: COMPETITION_BOH_SLOTS.map((slot) => describeSlot(slot, nowMs, locale, timeZone)),
    epic: COMPETITION_EPIC_SLOTS.map((slot) => describeSlot(slot, nowMs, locale, timeZone)),
  };
  const base = {
    competition: 'Competition #12',
    page: COMPETITION_PAGE_HREF,
    gameTimeZone: formatGameClockZone(),
    gameTimeUtcOffsetMinutes: GAME_TIME_UTC_OFFSET_MINUTES,
    viewerTimeZone: timeZone,
    now: describe(nowMs),
    slotCatalogs,
  };
  const schedule = normalizeCompetitionSchedule(rawSchedule);
  if (!schedule) {
    return {
      ...base,
      published: false,
      reason: rawSchedule ? 'schedule_invalid' : 'no_schedule_published',
      phase: 'unconfigured',
      nextDeadline: null,
      phases: [],
      acceptsNewSignups: competitionAcceptsNewSignups('unconfigured'),
      acceptsSignupEdits: competitionAcceptsSignupEdits('unconfigured'),
      acceptsReupload: competitionAcceptsReupload('unconfigured'),
    };
  }
  const phase = getCompetitionPhase(schedule, nowMs);
  const endsAt = getCompetitionPhaseEndsAt(schedule, phase);
  return {
    ...base,
    published: true,
    seasonId: schedule.seasonId,
    title: schedule.title || null,
    phase,
    nextDeadline: Number.isFinite(endsAt)
      ? {
          phase,
          event: PHASE_END_EVENTS[phase] || 'phase_ends',
          at: describe(endsAt),
          remainingMs: Math.max(0, endsAt - nowMs),
          remaining: splitRemaining(endsAt - nowMs),
        }
      : null,
    phases: PHASE_WINDOWS.map(([name, openKey, closeKey]) => ({
      phase: name,
      current: name === phase,
      opens: describe(schedule[openKey]),
      closes: describe(schedule[closeKey]),
    })),
    acceptsNewSignups: competitionAcceptsNewSignups(phase),
    acceptsSignupEdits: competitionAcceptsSignupEdits(phase),
    acceptsReupload: competitionAcceptsReupload(phase),
  };
}

/**
 * The deadline line the drawer shows: only when an action phase (registration,
 * final check or re-upload) closes within `windowMs`. Returns null otherwise.
 */
export function upcomingCompetitionDeadline(status, { windowMs = 48 * 3_600_000 } = {}) {
  const deadline = status?.nextDeadline;
  if (!status?.published || !deadline) return null;
  if (!COMPETITION_ACTION_PHASES.includes(deadline.phase)) return null;
  if (!(deadline.remainingMs > 0) || deadline.remainingMs > windowMs) return null;
  return {
    key: `${status.seasonId}:${deadline.phase}:${deadline.at.iso}`,
    phase: deadline.phase,
    remaining: deadline.remaining,
    gameTime: deadline.at.gameTime,
    gameTimeZone: status.gameTimeZone,
    localClock: deadline.at.localClock,
    localLabel: deadline.at.localLabel,
  };
}

async function readScheduleDocument() {
  const [firebase, { importFirestore }] = await Promise.all([
    import('../firebase.js'),
    import('../firebase-sdk.js'),
  ]);
  const setup = firebase.initFirebase();
  if (!setup?.configured || !setup.db) throw new Error('Firebase is not configured.');
  await firebase.ensureAnonymousAuth();
  const { doc, getDoc } = await importFirestore();
  const snapshot = await getDoc(doc(setup.db, COMPETITION_SCHEDULE_DOC_PATH));
  return snapshot?.exists?.() ? snapshot.data() : null;
}

/**
 * The published schedule document, cached for a minute so the drawer line and
 * a Velo answer in the same session share one read. Resolves null when no
 * schedule is published; rejects when the read itself failed.
 */
export async function loadPublishedCompetitionSchedule({ forceRefresh = false, read } = {}) {
  const now = Date.now();
  if (!forceRefresh && !read && cachedSchedule && now - cachedSchedule.at < SCHEDULE_CACHE_MS) {
    return cachedSchedule.value;
  }
  if (read) return read();
  if (!scheduleInFlight) {
    scheduleInFlight = readScheduleDocument()
      .then((value) => {
        cachedSchedule = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        scheduleInFlight = null;
      });
  }
  return scheduleInFlight;
}
