// Competition #12 (VtsScore pre-season prep): schedule, phases and time slots.
//
// A superadmin sets seven instants in VTS Admin. Together they split the
// competition into phases that the member page, firestore.rules and the
// vtsScore Function all read the same way:
//
//   opensAt ─ registration ─ phase1ClosesAt ─ final check ─ deadlineAt
//     ─ waiting ─ reuploadOpensAt ─ re-upload ─ reuploadClosesAt
//     ─ results pending ─ winnersStartAt ─ winners ─ winnersEndAt ─ closed
//
// - registration: members sign up with their active times and first data.
// - final check: no new sign-ups; members who signed up may still edit.
// - re-upload: members upload their current values; growth is measured
//   against their baseline.
// - winners: the computed winners are shown.
//
// All instants are stored as absolute times. Admins enter them in game time,
// which is a fixed UTC−2: 06:00 in Dubai (UTC+4) is 00:00 game time. The
// offset comes from js/game-time.js, the same source as the header clock.

import { GAME_TIME_UTC_OFFSET_MINUTES } from './game-time.js';

export const COMPETITION_SCHEDULE_DOC_PATH = 'boh_allstar_competition/current';

export const COMPETITION_SCHEDULE_KEYS = Object.freeze([
  'opensAt',
  'phase1ClosesAt',
  'deadlineAt',
  'reuploadOpensAt',
  'reuploadClosesAt',
  'winnersStartAt',
  'winnersEndAt',
]);

export const COMPETITION_PHASES = Object.freeze([
  'unconfigured',
  'upcoming',
  'registration',
  'finalCheck',
  'waiting',
  'reupload',
  'resultsPending',
  'winners',
  'closed',
]);

// The owner's slots, in game time. BoH: 08:00, 12:00, 14:00, 20:00.
// Epic Showdown: 10:00, 13:00, 16:00, 19:00.
export const COMPETITION_BOH_SLOTS = Object.freeze(['+8', '+12', '+14', '+20']);
export const COMPETITION_EPIC_SLOTS = Object.freeze(['+10', '+13', '+16', '+19']);

export { GAME_TIME_UTC_OFFSET_MINUTES };

function isoOffset(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const pad = (n) => String(n).padStart(2, '0');
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** The game-time offset as an ISO 8601 suffix: "-02:00". */
export const GAME_TIME_UTC_OFFSET = isoOffset(GAME_TIME_UTC_OFFSET_MINUTES);

const GAME_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const GAME_TIME_PATTERN = /^\d{2}:\d{2}$/u;
const SEASON_PATTERN = /^[A-Za-z0-9_-]{1,80}$/u;

function toMillis(value) {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'string') return Date.parse(value);
  if (typeof value.seconds === 'number') {
    return value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1e6);
  }
  return NaN;
}

/** "2026-10-01" + "20:00" in game time → epoch milliseconds, or NaN. */
export function gameTimeToMillis(date, time) {
  const day = String(date || '').trim();
  const clock = String(time || '').trim();
  if (!GAME_DATE_PATTERN.test(day) || !GAME_TIME_PATTERN.test(clock)) return NaN;
  const ms = Date.parse(`${day}T${clock}:00${GAME_TIME_UTC_OFFSET}`);
  return Number.isFinite(ms) ? ms : NaN;
}

/** Epoch milliseconds → { date: 'YYYY-MM-DD', time: 'HH:MM' } in game time. */
export function millisToGameTime(ms) {
  if (!Number.isFinite(ms)) return { date: '', time: '' };
  const shifted = new Date(ms + GAME_TIME_UTC_OFFSET_MINUTES * 60 * 1000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/**
 * Normalizes a stored or entered schedule. Returns the season, title and the
 * seven instants in milliseconds, or null when any instant is missing or the
 * order is wrong (each phase must start no earlier than the one before ends).
 */
export function normalizeCompetitionSchedule(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const seasonId = String(raw.seasonId || '').trim();
  if (!SEASON_PATTERN.test(seasonId)) return null;
  const instants = {};
  for (const key of COMPETITION_SCHEDULE_KEYS) {
    const ms = toMillis(raw[key]);
    if (!Number.isFinite(ms)) return null;
    instants[key] = ms;
  }
  const ordered =
    instants.opensAt < instants.phase1ClosesAt &&
    instants.phase1ClosesAt <= instants.deadlineAt &&
    instants.deadlineAt <= instants.reuploadOpensAt &&
    instants.reuploadOpensAt < instants.reuploadClosesAt &&
    instants.reuploadClosesAt <= instants.winnersStartAt &&
    instants.winnersStartAt < instants.winnersEndAt;
  if (!ordered) return null;
  const title = String(raw.title || '')
    .trim()
    .slice(0, 80);
  return Object.freeze({ seasonId, title, ...instants });
}

/** The phase at `nowMs` for a normalized schedule (or 'unconfigured'). */
export function getCompetitionPhase(schedule, nowMs = Date.now()) {
  if (!schedule) return 'unconfigured';
  const now = Number(nowMs);
  if (!Number.isFinite(now)) return 'unconfigured';
  if (now < schedule.opensAt) return 'upcoming';
  if (now < schedule.phase1ClosesAt) return 'registration';
  if (now < schedule.deadlineAt) return 'finalCheck';
  if (now < schedule.reuploadOpensAt) return 'waiting';
  if (now < schedule.reuploadClosesAt) return 'reupload';
  if (now < schedule.winnersStartAt) return 'resultsPending';
  if (now < schedule.winnersEndAt) return 'winners';
  return 'closed';
}

/** The instant the current phase ends, for a countdown (or null). */
export function getCompetitionPhaseEndsAt(schedule, phase) {
  if (!schedule) return null;
  const endByPhase = {
    upcoming: schedule.opensAt,
    registration: schedule.phase1ClosesAt,
    finalCheck: schedule.deadlineAt,
    waiting: schedule.reuploadOpensAt,
    reupload: schedule.reuploadClosesAt,
    resultsPending: schedule.winnersStartAt,
    winners: schedule.winnersEndAt,
  };
  return Number.isFinite(endByPhase[phase]) ? endByPhase[phase] : null;
}

/** New sign-ups are accepted only in the registration phase. */
export function competitionAcceptsNewSignups(phase) {
  return phase === 'registration' || phase === 'unconfigured';
}

/** Existing sign-ups may be edited through the final check. */
export function competitionAcceptsSignupEdits(phase) {
  return phase === 'registration' || phase === 'finalCheck' || phase === 'unconfigured';
}

/** Growth re-uploads are accepted only in the re-upload window. */
export function competitionAcceptsReupload(phase) {
  return phase === 'reupload' || phase === 'unconfigured';
}

/**
 * An ordered selection of time slots: every value must be in the catalog, no
 * value twice, and the member's order of preference is kept.
 */
export function normalizeSlotSelection(values, catalog, { min = 1 } = {}) {
  const list = Array.isArray(values) ? values : values == null ? [] : [values];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const value = String(raw || '').trim();
    if (!value) continue;
    if (!catalog.includes(value)) {
      const error = new Error(`Unknown time slot ${value}.`);
      error.code = 'competition_slot_invalid';
      throw error;
    }
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  if (out.length < min) {
    const error = new Error('Pick at least one time slot.');
    error.code = 'competition_slot_required';
    throw error;
  }
  return out;
}

/** "+8" → "08:00" (game time) for display. */
export function slotToGameClock(slot) {
  const hours = Number(String(slot).replace('+', ''));
  return Number.isInteger(hours) && hours >= 0 && hours < 24
    ? `${String(hours).padStart(2, '0')}:00`
    : String(slot);
}
