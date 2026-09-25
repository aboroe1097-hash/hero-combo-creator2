// js/competition-schedule-admin.js
//
// The "Competition #12 schedule" panel in VTS Admin → 2027 Signups. A
// superadmin enters seven instants in game time (UTC−2); this module turns the
// form into the exact document firestore.rules accepts at
// `boh_allstar_competition/current`, explains which field breaks the order, and
// renders the phase timeline.
//
// Everything above `createCompetitionScheduleAdminView` is pure (no DOM, no
// Firestore) and is covered by tests/unit/competition-schedule-admin.test.mjs.

import {
  COMPETITION_SCHEDULE_DOC_PATH,
  COMPETITION_SCHEDULE_KEYS,
  gameTimeToMillis,
  getCompetitionPhase,
  millisToGameTime,
  normalizeCompetitionSchedule,
} from './competition-schedule.js';
import { formatGameClockZone, getGameTimeState } from './game-time.js';

export const COMPETITION_DEFAULT_TITLE = 'Competition #12';
export const COMPETITION_TITLE_MAX_LENGTH = 80;
const SEASON_PATTERN = /^[A-Za-z0-9_-]{1,80}$/u;

// Competition #12 runs under its own season id. The 2026 season still holds
// last season's signups, so the schedule refuses to attach to it.
export const COMPETITION_LEGACY_SEASON_ID = 'season-2026';
export const COMPETITION_SEASON_ID = 'competition-12';

/** The seven instants in form order, with their label keys and English copy. */
export const COMPETITION_SCHEDULE_FIELDS = Object.freeze([
  Object.freeze({
    key: 'opensAt',
    labelKey: 'adminCompScheduleOpensAt',
    fallback: 'Registration opens',
  }),
  Object.freeze({
    key: 'phase1ClosesAt',
    labelKey: 'adminCompSchedulePhase1ClosesAt',
    fallback: 'Phase 1 closes (no new sign-ups)',
  }),
  Object.freeze({
    key: 'deadlineAt',
    labelKey: 'adminCompScheduleDeadlineAt',
    fallback: 'Deadline (last edits)',
  }),
  Object.freeze({
    key: 'reuploadOpensAt',
    labelKey: 'adminCompScheduleReuploadOpensAt',
    fallback: 'Growth re-upload opens',
  }),
  Object.freeze({
    key: 'reuploadClosesAt',
    labelKey: 'adminCompScheduleReuploadClosesAt',
    fallback: 'Growth re-upload closes',
  }),
  Object.freeze({
    key: 'winnersStartAt',
    labelKey: 'adminCompScheduleWinnersStartAt',
    fallback: 'Winners shown from',
  }),
  Object.freeze({
    key: 'winnersEndAt',
    labelKey: 'adminCompScheduleWinnersEndAt',
    fallback: 'Winners shown until',
  }),
]);

// Each instant against the one before it. `strict` pairs must be strictly
// later; the others may coincide (a zero-length phase is allowed there). This
// mirrors normalizeCompetitionSchedule() and validAllStarBohCompetitionSchedule().
export const COMPETITION_SCHEDULE_ORDER = Object.freeze([
  Object.freeze({ key: 'phase1ClosesAt', previous: 'opensAt', strict: true }),
  Object.freeze({ key: 'deadlineAt', previous: 'phase1ClosesAt', strict: false }),
  Object.freeze({ key: 'reuploadOpensAt', previous: 'deadlineAt', strict: false }),
  Object.freeze({ key: 'reuploadClosesAt', previous: 'reuploadOpensAt', strict: true }),
  Object.freeze({ key: 'winnersStartAt', previous: 'reuploadClosesAt', strict: false }),
  Object.freeze({ key: 'winnersEndAt', previous: 'winnersStartAt', strict: true }),
]);

/** Timeline rows: each phase and the instants that bound it. */
export const COMPETITION_TIMELINE_PHASES = Object.freeze([
  Object.freeze({ phase: 'upcoming', startKey: null, endKey: 'opensAt' }),
  Object.freeze({ phase: 'registration', startKey: 'opensAt', endKey: 'phase1ClosesAt' }),
  Object.freeze({ phase: 'finalCheck', startKey: 'phase1ClosesAt', endKey: 'deadlineAt' }),
  Object.freeze({ phase: 'waiting', startKey: 'deadlineAt', endKey: 'reuploadOpensAt' }),
  Object.freeze({ phase: 'reupload', startKey: 'reuploadOpensAt', endKey: 'reuploadClosesAt' }),
  Object.freeze({
    phase: 'resultsPending',
    startKey: 'reuploadClosesAt',
    endKey: 'winnersStartAt',
  }),
  Object.freeze({ phase: 'winners', startKey: 'winnersStartAt', endKey: 'winnersEndAt' }),
  Object.freeze({ phase: 'closed', startKey: 'winnersEndAt', endKey: null }),
]);

export const COMPETITION_PHASE_LABEL_KEYS = Object.freeze({
  unconfigured: ['adminCompPhaseUnconfigured', 'No schedule'],
  upcoming: ['adminCompPhaseUpcoming', 'Not open yet'],
  registration: ['adminCompPhaseRegistration', 'Registration'],
  finalCheck: ['adminCompPhaseFinalCheck', 'Final check'],
  waiting: ['adminCompPhaseWaiting', 'Waiting for re-upload'],
  reupload: ['adminCompPhaseReupload', 'Growth re-upload'],
  resultsPending: ['adminCompPhaseResultsPending', 'Results pending'],
  winners: ['adminCompPhaseWinners', 'Winners shown'],
  closed: ['adminCompPhaseClosed', 'Closed'],
});

const defaultT = (_key, vars = {}, fallback = '') =>
  String(fallback).replace(/\{(\w+)\}/gu, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );

function translator(t) {
  return typeof t === 'function' ? t : defaultT;
}

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fieldFor(key) {
  return COMPETITION_SCHEDULE_FIELDS.find((field) => field.key === key);
}

export function competitionFieldLabel(key, t) {
  const field = fieldFor(key);
  if (!field) return String(key);
  return translator(t)(field.labelKey, {}, field.fallback);
}

export function competitionPhaseLabel(phase, t) {
  const [key, fallback] =
    COMPETITION_PHASE_LABEL_KEYS[phase] || COMPETITION_PHASE_LABEL_KEYS.unconfigured;
  return translator(t)(key, {}, fallback);
}

/* ------------------------------------------------------------------ *
 * Season
 * ------------------------------------------------------------------ */

export function isLegacyCompetitionSeason(seasonId) {
  return String(seasonId || '').trim() === COMPETITION_LEGACY_SEASON_ID;
}

/**
 * The season config written by "Start Competition #12 season": the stored
 * config with only `activeSeason` changed. `formConfig` (what the season form
 * shows) fills any stored value that is missing, so the write still carries
 * the four keys the rules pin; `acceptNewSignups` is preserved by
 * saveBohSignupSeasonConfig itself.
 */
export function buildCompetitionSeasonStart(storedConfig = {}, formConfig = {}) {
  const stored = storedConfig && typeof storedConfig === 'object' ? storedConfig : {};
  const form = formConfig && typeof formConfig === 'object' ? formConfig : {};
  const pick = (key, valid) => (valid(stored[key]) ? stored[key] : form[key]);
  const next = {
    activeSeason: COMPETITION_SEASON_ID,
    scoringProfileId: pick(
      'scoringProfileId',
      (value) => typeof value === 'string' && value.trim() !== ''
    ),
    open: pick('open', (value) => typeof value === 'boolean') === true,
    grantDurationMinutes: pick('grantDurationMinutes', (value) => Number.isInteger(value)),
  };
  if (typeof stored.acceptNewSignups === 'boolean') {
    next.acceptNewSignups = stored.acceptNewSignups;
  }
  return next;
}

/* ------------------------------------------------------------------ *
 * Default 2-week schedule
 * ------------------------------------------------------------------ */

// The owner's default: every phase opens at 00:00 game time (+0) and closes at
// 22:00 game time (+22). Day 0 is the start date. Registration, the final
// check, the re-upload and the winners' display each get 2 game days; the
// competition runs 14 game days from sign-up to the re-upload close. The
// 2-hour gaps after each 22:00 close fall in the model's gap phases (waiting,
// results pending), which normalizeCompetitionSchedule() accepts.
export const COMPETITION_DEFAULT_OPEN_TIME = '00:00';
export const COMPETITION_DEFAULT_CLOSE_TIME = '22:00';
export const COMPETITION_DEFAULT_PLAN = Object.freeze({
  opensAt: Object.freeze({ day: 0, time: COMPETITION_DEFAULT_OPEN_TIME }),
  phase1ClosesAt: Object.freeze({ day: 1, time: COMPETITION_DEFAULT_CLOSE_TIME }),
  deadlineAt: Object.freeze({ day: 3, time: COMPETITION_DEFAULT_CLOSE_TIME }),
  reuploadOpensAt: Object.freeze({ day: 12, time: COMPETITION_DEFAULT_OPEN_TIME }),
  reuploadClosesAt: Object.freeze({ day: 13, time: COMPETITION_DEFAULT_CLOSE_TIME }),
  winnersStartAt: Object.freeze({ day: 14, time: COMPETITION_DEFAULT_OPEN_TIME }),
  winnersEndAt: Object.freeze({ day: 15, time: COMPETITION_DEFAULT_CLOSE_TIME }),
});

const GAME_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

/** "2026-10-01" + 3 → "2026-10-04" (calendar arithmetic, no time zone). */
export function addGameDays(gameDate, days) {
  const match = GAME_DATE_PATTERN.exec(String(gameDate || '').trim());
  if (!match || !Number.isInteger(days)) return '';
  const [, y, m, d] = match.map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  // Reject dates the calendar rolls over (2026-02-31).
  if (base.getUTCFullYear() !== y || base.getUTCMonth() !== m - 1 || base.getUTCDate() !== d) {
    return '';
  }
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** The game day after the one in progress at `nowMs` ("YYYY-MM-DD"). */
export function nextGameDay(nowMs = Date.now()) {
  return addGameDays(millisToGameTime(nowMs).date, 1);
}

/**
 * The default 2-week schedule starting on `startGameDate` (the next game day
 * when omitted or blank; pass `nowMs` to pin "now"). Pure: returns
 * `{ startDate, instants: { key: { date, time } } }` in the panel's form shape,
 * or null for an invalid start date. Nothing is saved.
 */
export function buildDefaultCompetitionSchedule(startGameDate, { nowMs = Date.now() } = {}) {
  const requested = String(startGameDate ?? '').trim();
  const startDate = requested || nextGameDay(nowMs);
  if (!addGameDays(startDate, 0)) return null;
  const instants = {};
  for (const key of COMPETITION_SCHEDULE_KEYS) {
    const { day, time } = COMPETITION_DEFAULT_PLAN[key];
    instants[key] = { date: addGameDays(startDate, day), time };
  }
  return { startDate, instants };
}

/* ------------------------------------------------------------------ *
 * Form values <-> schedule
 * ------------------------------------------------------------------ */

/**
 * The panel's form shape: `{ title, seasonId, instants: { key: { date, time } } }`.
 * A stored document (Firestore Timestamps, Dates or milliseconds) → form values
 * in game time. Missing or unreadable instants become empty inputs.
 */
export function competitionScheduleToFormValues(raw, options = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const instants = {};
  for (const key of COMPETITION_SCHEDULE_KEYS) {
    instants[key] = millisToGameTime(toMillis(source[key]));
  }
  const title = String(source.title ?? '').trim();
  return {
    title: title || COMPETITION_DEFAULT_TITLE,
    seasonId: String(options.seasonId ?? source.seasonId ?? '').trim(),
    instants,
  };
}

function toMillis(value) {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') {
    return value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1e6);
  }
  return NaN;
}

export class CompetitionScheduleError extends Error {
  constructor(code, details = {}) {
    super(`Invalid competition schedule: ${code}`);
    this.name = 'CompetitionScheduleError';
    this.code = code;
    this.field = details.field || '';
    this.previous = details.previous || '';
  }
}

/**
 * Validates the form values. Returns `{ ok: true, schedule }` (the normalized
 * schedule in milliseconds) or `{ ok: false, error }` naming the first field
 * that is missing or out of order.
 */
export function validateCompetitionScheduleForm(values = {}) {
  const seasonId = String(values.seasonId || '').trim();
  if (!SEASON_PATTERN.test(seasonId)) {
    return { ok: false, error: new CompetitionScheduleError('season') };
  }
  if (isLegacyCompetitionSeason(seasonId)) {
    return { ok: false, error: new CompetitionScheduleError('legacySeason') };
  }
  const title = String(values.title ?? '').trim() || COMPETITION_DEFAULT_TITLE;
  if (title.length > COMPETITION_TITLE_MAX_LENGTH) {
    return { ok: false, error: new CompetitionScheduleError('title', { field: 'title' }) };
  }
  const raw = { seasonId, title };
  const instants = values.instants && typeof values.instants === 'object' ? values.instants : {};
  for (const key of COMPETITION_SCHEDULE_KEYS) {
    const entry = instants[key] || {};
    const ms = gameTimeToMillis(entry.date, entry.time);
    if (!Number.isFinite(ms)) {
      return { ok: false, error: new CompetitionScheduleError('missing', { field: key }) };
    }
    raw[key] = ms;
  }
  for (const rule of COMPETITION_SCHEDULE_ORDER) {
    const later = raw[rule.key];
    const earlier = raw[rule.previous];
    if (rule.strict ? later <= earlier : later < earlier) {
      return {
        ok: false,
        error: new CompetitionScheduleError(rule.strict ? 'order' : 'orderSame', {
          field: rule.key,
          previous: rule.previous,
        }),
      };
    }
  }
  const schedule = normalizeCompetitionSchedule(raw);
  if (!schedule) return { ok: false, error: new CompetitionScheduleError('invalid') };
  return { ok: true, schedule };
}

/** A validation error → the sentence the panel shows. */
export function describeCompetitionScheduleError(error, t) {
  const tr = translator(t);
  const field = error?.field ? competitionFieldLabel(error.field, t) : '';
  const previous = error?.previous ? competitionFieldLabel(error.previous, t) : '';
  switch (error?.code) {
    case 'season':
      return tr(
        'adminCompScheduleErrorSeason',
        {},
        'Save an active season below before scheduling the competition.'
      );
    case 'legacySeason':
      return tr(
        'adminCompScheduleErrorLegacySeason',
        {},
        'Start the Competition #12 season first: the schedule cannot use last season’s id.'
      );
    case 'title':
      return tr('adminCompScheduleErrorTitle', {}, 'The title can be at most 80 characters.');
    case 'missing':
      return tr(
        'adminCompScheduleErrorMissing',
        { field },
        '{field}: enter both a game date and a game time.'
      );
    case 'order':
      return tr(
        'adminCompScheduleErrorOrder',
        { field, previous },
        '{field} must be after {previous}.'
      );
    case 'orderSame':
      return tr(
        'adminCompScheduleErrorOrderSame',
        { field, previous },
        '{field} cannot be before {previous}.'
      );
    default:
      return tr('adminCompScheduleErrorInvalid', {}, 'The schedule is not valid.');
  }
}

/**
 * The exact document the rules accept: season, title, seven Timestamps,
 * `updatedAt` (server time) and `updatedBy` (the signed-in uid).
 */
export function buildCompetitionSchedulePayload(schedule, { Timestamp, serverTimestamp, uid }) {
  if (!schedule) throw new CompetitionScheduleError('invalid');
  if (!uid) throw new CompetitionScheduleError('session');
  const payload = { seasonId: schedule.seasonId, title: schedule.title };
  for (const key of COMPETITION_SCHEDULE_KEYS) {
    payload[key] = Timestamp.fromMillis(schedule[key]);
  }
  payload.updatedAt = serverTimestamp();
  payload.updatedBy = String(uid);
  return payload;
}

/** Validates and writes the schedule. Throws CompetitionScheduleError first. */
export async function saveCompetitionSchedule(values, context) {
  const result = validateCompetitionScheduleForm(values);
  if (!result.ok) throw result.error;
  const { firestore, db } = context;
  const uid = context.user?.uid || '';
  const payload = buildCompetitionSchedulePayload(result.schedule, {
    Timestamp: firestore.Timestamp,
    serverTimestamp: firestore.serverTimestamp,
    uid,
  });
  await firestore.setDoc(firestore.doc(db, COMPETITION_SCHEDULE_DOC_PATH), payload);
  return result.schedule;
}

/* ------------------------------------------------------------------ *
 * Display
 * ------------------------------------------------------------------ */

/** "2026-10-01 20:00" style game-time label for an instant. */
export function formatGameTime(ms) {
  const { date, time } = millisToGameTime(ms);
  return date ? `${date} ${time}` : '—';
}

/** Epoch ms → "HH:MM" in the viewer's own time zone (the live clock line). */
export function formatLocalClock(ms, { locale, timeZone } = {}) {
  if (!Number.isFinite(ms)) return '—';
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(11, 16);
  }
}

// Left-to-right isolate (LRI … PDI): keeps "2026-10-01 00:00" and "UTC−2" in
// reading order inside right-to-left (Arabic) sentences.
const ltr = (value) => `\u2066${value}\u2069`;

/** A row hint: "Game 2026-10-01 00:00 (UTC−2) · Your time: 1 Oct 2026, 04:00". */
export function formatScheduleRowHint(ms, t, { locale, timeZone } = {}) {
  return translator(t)(
    'adminCompScheduleLocal',
    {
      game: ltr(formatGameTime(ms)),
      zone: ltr(formatGameClockZone()),
      time: formatLocalTime(ms, { locale, timeZone }),
    },
    'Game {game} ({zone}) · Your time: {time}'
  );
}

/** The live line: "Now: game 14:05 · your time 16:05". */
export function formatScheduleNowLine(nowMs, t, { locale, timeZone } = {}) {
  const game = getGameTimeState(new Date(nowMs)).formatted;
  return translator(t)(
    'adminCompScheduleNow',
    {
      game: ltr(`${game} (${formatGameClockZone()})`),
      local: formatLocalClock(nowMs, { locale, timeZone }),
    },
    'Now: game {game} · your time {local}'
  );
}

/** The viewer's local time for an instant (the live hint next to each row). */
export function formatLocalTime(ms, { locale, timeZone } = {}) {
  if (!Number.isFinite(ms)) return '—';
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

/** Timeline rows with the current phase marked. Zero-length phases are skipped. */
export function buildCompetitionTimeline(schedule, nowMs = Date.now()) {
  if (!schedule) return [];
  const current = getCompetitionPhase(schedule, nowMs);
  return COMPETITION_TIMELINE_PHASES.filter(({ startKey, endKey }) => {
    if (!startKey || !endKey) return true;
    return schedule[endKey] > schedule[startKey];
  }).map(({ phase, startKey, endKey }) => ({
    phase,
    startsAt: startKey ? schedule[startKey] : null,
    endsAt: endKey ? schedule[endKey] : null,
    current: phase === current,
  }));
}

export function renderCompetitionTimeline(schedule, t, nowMs = Date.now()) {
  const tr = translator(t);
  const rows = buildCompetitionTimeline(schedule, nowMs);
  if (!rows.length) {
    return `<p class="dash-comp-timeline-empty">${esc(
      tr(
        'adminCompScheduleNone',
        {},
        'No schedule saved yet. Registration follows the Open switch below.'
      )
    )}</p>`;
  }
  const items = rows
    .map((row) => {
      const when =
        row.startsAt === null
          ? `→ ${formatGameTime(row.endsAt)}`
          : row.endsAt === null
            ? `${formatGameTime(row.startsAt)} →`
            : `${formatGameTime(row.startsAt)} → ${formatGameTime(row.endsAt)}`;
      return `<li class="dash-comp-timeline-step${row.current ? ' is-current' : ''}"${
        row.current ? ' aria-current="step"' : ''
      } data-comp-phase="${esc(row.phase)}">
        <span class="dash-comp-timeline-name">${esc(competitionPhaseLabel(row.phase, t))}</span>
        <span class="dash-comp-timeline-when" dir="ltr">${esc(when)}</span>
      </li>`;
    })
    .join('');
  const current = rows.find((row) => row.current);
  const summary = tr(
    'adminCompScheduleCurrent',
    { phase: competitionPhaseLabel(current?.phase || 'unconfigured', t) },
    'Current phase: {phase}'
  );
  return `<p class="dash-comp-timeline-current">${esc(summary)}</p>
    <ol class="dash-comp-timeline">${items}</ol>`;
}

/* ------------------------------------------------------------------ *
 * DOM view
 * ------------------------------------------------------------------ */

/**
 * Reads and fills `#dashCompScheduleForm`. Inputs are addressed by
 * `data-comp-schedule-date="<key>"` / `data-comp-schedule-time="<key>"`.
 */
export function createCompetitionScheduleAdminView(options = {}) {
  const t = translator(options.t);
  const locale = () => (typeof options.locale === 'function' ? options.locale() : undefined);
  const state = { stored: null, seasonId: '', dirty: false };

  const form = (root) => root.querySelector('#dashCompScheduleForm');

  function readValues(root) {
    const host = form(root);
    const instants = {};
    for (const key of COMPETITION_SCHEDULE_KEYS) {
      instants[key] = {
        date: host?.querySelector(`[data-comp-schedule-date="${key}"]`)?.value || '',
        time: host?.querySelector(`[data-comp-schedule-time="${key}"]`)?.value || '',
      };
    }
    return {
      title: host?.querySelector('#dashCompScheduleTitle')?.value || '',
      seasonId: state.seasonId,
      instants,
    };
  }

  function updateLocalHints(root) {
    const host = form(root);
    if (!host) return;
    const values = readValues(root);
    for (const key of COMPETITION_SCHEDULE_KEYS) {
      const hint = host.querySelector(`[data-comp-schedule-local="${key}"]`);
      if (!hint) continue;
      const ms = gameTimeToMillis(values.instants[key].date, values.instants[key].time);
      hint.textContent = formatScheduleRowHint(ms, t, { locale: locale() });
    }
  }

  let clockTimer = null;
  function tickNow(root) {
    const line = root.querySelector('#dashCompScheduleNow');
    if (!line || !line.isConnected) {
      if (clockTimer) clearInterval(clockTimer);
      clockTimer = null;
      return;
    }
    line.textContent = formatScheduleNowLine(Date.now(), t, { locale: locale() });
  }

  function startClock(root) {
    tickNow(root);
    if (clockTimer || typeof setInterval !== 'function') return;
    if (!root.querySelector('#dashCompScheduleNow')) return;
    clockTimer = setInterval(() => tickNow(root), 15_000);
  }

  function writeInstants(root, instants) {
    const host = form(root);
    if (!host) return;
    for (const key of COMPETITION_SCHEDULE_KEYS) {
      const date = host.querySelector(`[data-comp-schedule-date="${key}"]`);
      const time = host.querySelector(`[data-comp-schedule-time="${key}"]`);
      if (date) date.value = instants[key]?.date || '';
      if (time) time.value = instants[key]?.time || '';
    }
  }

  function defaultStartInput(root) {
    return form(root)?.querySelector('#dashCompScheduleDefaultStart') || null;
  }

  /**
   * "Fill 2-week default": writes the default into the seven inputs from the
   * start-date field (the next game day when blank). Never saves.
   */
  function fillDefault(root, nowMs = Date.now()) {
    const input = defaultStartInput(root);
    const built = buildDefaultCompetitionSchedule(input?.value, { nowMs });
    if (!built) return false;
    if (input) input.value = built.startDate;
    writeInstants(root, built.instants);
    state.dirty = true;
    updateLocalHints(root);
    renderTimeline(root, nowMs);
    return true;
  }

  function renderTimeline(root, nowMs = Date.now()) {
    const target = root.querySelector('#dashCompScheduleTimeline');
    if (!target) return;
    // The preview follows the form even before the Competition #12 season is
    // started, so it validates the instants against the target season id.
    const result = validateCompetitionScheduleForm({
      ...readValues(root),
      seasonId: COMPETITION_SEASON_ID,
    });
    const schedule = result.ok ? result.schedule : state.stored;
    // An unsaved form (the prefilled default) is previewed under the "No
    // schedule saved yet" note, so a preview never reads as the live schedule.
    const unsavedNote = !state.stored && schedule ? renderCompetitionTimeline(null, t) : '';
    target.innerHTML = unsavedNote + renderCompetitionTimeline(schedule, t, nowMs);
  }

  function renderSeason(root) {
    const season = root.querySelector('#dashCompScheduleSeason');
    if (season) season.textContent = state.seasonId || '—';
    const legacy = isLegacyCompetitionSeason(state.seasonId);
    const warning = root.querySelector('#dashCompScheduleLegacy');
    if (warning) warning.hidden = !legacy;
    const save = root.querySelector('#dashCompScheduleSave');
    if (save) save.disabled = legacy || !state.seasonId;
  }

  function fill(root, stored) {
    const host = form(root);
    if (!host) return;
    const values = competitionScheduleToFormValues(stored || {});
    const title = host.querySelector('#dashCompScheduleTitle');
    if (title) title.value = values.title;
    const startInput = defaultStartInput(root);
    const hasStored = COMPETITION_SCHEDULE_KEYS.some((key) =>
      Number.isFinite(toMillis(stored?.[key]))
    );
    if (hasStored) {
      writeInstants(root, values.instants);
      if (startInput) startInput.value = values.instants.opensAt.date;
    } else {
      // No schedule stored yet: prefill the 2-week default from the next game
      // day. It is only a suggestion; nothing is written until "Save".
      const built = buildDefaultCompetitionSchedule(startInput?.value);
      if (startInput && built) startInput.value = built.startDate;
      writeInstants(root, built ? built.instants : values.instants);
    }
    state.dirty = false;
  }

  /** `snapshot`: `{ config, schedule }` from the signups loader. */
  function render(root, snapshot = {}) {
    state.seasonId = String(snapshot.config?.activeSeason || '').trim();
    state.stored = normalizeCompetitionSchedule(snapshot.schedule) || null;
    // Keep what the superadmin is typing across a background refresh.
    if (!state.dirty) fill(root, snapshot.schedule);
    renderSeason(root);
    updateLocalHints(root);
    renderTimeline(root);
    startClock(root);
  }

  function onInput(root) {
    state.dirty = true;
    updateLocalHints(root);
    renderTimeline(root);
  }

  function markSaved() {
    state.dirty = false;
  }

  return Object.freeze({ render, readValues, onInput, fillDefault, markSaved, state });
}
