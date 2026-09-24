// Competition #12 phase sync.
//
// The schedule document (boh_allstar_competition/current) is the source of
// truth for when members may sign up, edit, and re-upload. firestore.rules
// cannot afford to evaluate the schedule on the member write path (the
// submission validator runs within a few expressions of the per-request limit),
// so it reads two booleans on the season config instead:
//
//   open              registration or final check: sign-ups may be edited;
//   acceptNewSignups  registration only: new sign-ups are accepted.
//
// Every ten minutes this job recomputes the phase and flips those two flags
// when, and only when, they differ. Nothing else on the config is touched:
// validAllStarBohConfig() pins the config's keys, so an extra key written here
// would make every later admin save fail.
//
// normalizeCompetitionSchedule() and getCompetitionPhase() are copies of the
// browser module js/competition-schedule.js (the Functions package cannot
// import from the site). tests/unit/competition-phase-sync.test.mjs asserts the
// two implementations agree.
//
// Dependencies are injected so the logic is unit-tested without the Admin SDK.

export const COMPETITION_SCHEDULE_DOC_PATH = 'boh_allstar_competition/current';
export const ALL_STAR_BOH_CONFIG_DOC_PATH = 'boh_allstar_config/current';

export const COMPETITION_SCHEDULE_KEYS = Object.freeze([
  'opensAt',
  'phase1ClosesAt',
  'deadlineAt',
  'reuploadOpensAt',
  'reuploadClosesAt',
  'winnersStartAt',
  'winnersEndAt',
]);

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

/** Copy of js/competition-schedule.js normalizeCompetitionSchedule(). */
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

/** Copy of js/competition-schedule.js getCompetitionPhase(). */
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

/** The config flags a phase implies. */
export function competitionFlagsForPhase(phase) {
  return {
    open: phase === 'registration' || phase === 'finalCheck',
    acceptNewSignups: phase === 'registration',
  };
}

/**
 * @param {object} deps
 * @param {() => number} deps.now
 * @param {() => Promise<object|null>} deps.readSchedule
 * @param {() => Promise<object|null>} deps.readConfig
 * @param {(changes: object) => Promise<void>} deps.updateConfig
 */
export async function syncCompetitionPhase(deps) {
  const [rawSchedule, config] = await Promise.all([deps.readSchedule(), deps.readConfig()]);
  const activeSeason = String(config?.activeSeason || '').trim();
  if (!config || !SEASON_PATTERN.test(activeSeason)) {
    return { status: 'skipped', reason: 'no_config', changes: {} };
  }
  const schedule = normalizeCompetitionSchedule(rawSchedule);
  if (!schedule) return { status: 'skipped', reason: 'no_schedule', changes: {} };
  if (schedule.seasonId !== activeSeason) {
    return { status: 'skipped', reason: 'other_season', changes: {} };
  }
  const phase = getCompetitionPhase(schedule, deps.now());
  if (phase === 'unconfigured') return { status: 'skipped', reason: 'no_phase', changes: {} };
  const wanted = competitionFlagsForPhase(phase);
  const changes = {};
  for (const [key, value] of Object.entries(wanted)) {
    // An absent acceptNewSignups reads as true in the rules, so it is written
    // whenever the wanted value is not already stored as exactly that boolean.
    if (config[key] !== value) changes[key] = value;
  }
  if (!Object.keys(changes).length) return { status: 'unchanged', phase, changes };
  await deps.updateConfig(changes);
  return { status: 'updated', phase, changes };
}

/** Wires the job to the Admin SDK's Firestore. */
export function createCompetitionPhaseSyncJob({ db, now = Date.now }) {
  const configRef = db.doc(ALL_STAR_BOH_CONFIG_DOC_PATH);
  return () =>
    syncCompetitionPhase({
      now,
      async readSchedule() {
        const snapshot = await db.doc(COMPETITION_SCHEDULE_DOC_PATH).get();
        return snapshot.exists ? snapshot.data() : null;
      },
      async readConfig() {
        const snapshot = await configRef.get();
        return snapshot.exists ? snapshot.data() : null;
      },
      async updateConfig(changes) {
        await configRef.update(changes);
      },
    });
}
