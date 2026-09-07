export const ALL_STAR_BOH_SIGNUP_WINDOW = Object.freeze({
  // Set both values to canonical ISO timestamps when leadership confirms the window.
  // Example: 2026-07-20T18:00:00.000Z
  opensAt: '',
  closesAt: '',
});

const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const ALL_STAR_BOH_EVENT_SCHEDULE_STATUS = new Set(['hidden', 'published']);
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/u;

export function normalizeAllStarBohSignupWindow(value = ALL_STAR_BOH_SIGNUP_WINDOW) {
  const normalize = (candidate) => {
    const text = typeof candidate === 'string' ? candidate.trim() : '';
    if (!ISO_TIMESTAMP_PATTERN.test(text)) return '';
    const timestamp = Date.parse(text);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === text ? text : '';
  };
  const opensAt = normalize(value?.opensAt);
  const closesAt = normalize(value?.closesAt);
  if (!opensAt || !closesAt || Date.parse(opensAt) >= Date.parse(closesAt)) {
    return Object.freeze({ opensAt: '', closesAt: '' });
  }
  return Object.freeze({ opensAt, closesAt });
}

export function getAllStarBohSignupWindowState(value, nowMs = Date.now()) {
  const window = normalizeAllStarBohSignupWindow(value);
  const now = Number(nowMs);
  if (!window.opensAt || !Number.isFinite(now)) {
    return Object.freeze({ phase: 'unconfigured', targetAt: '', remainingSeconds: 0, ...window });
  }
  const opensMs = Date.parse(window.opensAt);
  const closesMs = Date.parse(window.closesAt);
  const phase = now < opensMs ? 'upcoming' : now < closesMs ? 'open' : 'closed';
  const targetAt = phase === 'upcoming' ? window.opensAt : phase === 'open' ? window.closesAt : '';
  const remainingSeconds = targetAt
    ? Math.max(0, Math.ceil((Date.parse(targetAt) - now) / 1000))
    : 0;
  return Object.freeze({ phase, targetAt, remainingSeconds, ...window });
}

export function getAllStarBohCountdownParts(remainingSecondsInput = 0) {
  const remainingSeconds = Math.max(0, Math.trunc(Number(remainingSecondsInput) || 0));
  return Object.freeze({
    days: Math.floor(remainingSeconds / 86_400),
    hours: Math.floor((remainingSeconds % 86_400) / 3_600),
    minutes: Math.floor((remainingSeconds % 3_600) / 60),
    seconds: remainingSeconds % 60,
  });
}

function normalizeIsoTimestamp(value, label, options = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text && options.allowEmpty) return '';
  if (!ISO_TIMESTAMP_PATTERN.test(text)) {
    throw new TypeError(`${label} must be a canonical ISO timestamp.`);
  }
  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== text) {
    throw new TypeError(`${label} must be a canonical ISO timestamp.`);
  }
  return text;
}

function requiredIdentifier(value, label) {
  const text = String(value ?? '').trim();
  if (!text || text.length > 128 || !IDENTIFIER_PATTERN.test(text)) {
    throw new TypeError(`${label} must be an identifier-safe string.`);
  }
  return text;
}

function normalizeScheduleItem(input, index, range, kind) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const idKey = kind === 'milestone' ? 'id' : 'teamId';
  const id = requiredIdentifier(source[idKey], `${kind} ${index + 1} ${idKey}`);
  const startsAt = normalizeIsoTimestamp(source.startsAt, `${kind} ${index + 1} startsAt`);
  const startsMs = Date.parse(startsAt);
  if (startsMs < range.startsMs || startsMs > range.endsMs) {
    throw new TypeError(`${kind} ${index + 1} startsAt must be within the event range.`);
  }
  if (kind === 'milestone') {
    const label = String(source.label ?? '')
      .normalize('NFC')
      .trim();
    if (!label || label.length > 160) {
      throw new TypeError(`milestone ${index + 1} label must be 1-160 characters.`);
    }
    return { id, label, startsAt };
  }
  return { teamId: id, startsAt };
}

function normalizeScheduleItems(items, options) {
  if (!Array.isArray(items)) throw new TypeError(`${options.label} must be an array.`);
  if (items.length > options.maxItems) {
    throw new TypeError(`${options.label} exceeds ${options.maxItems} entries.`);
  }
  const seen = new Set();
  return items.map((item, index) => {
    const normalized = normalizeScheduleItem(item, index, options.range, options.kind);
    const id = options.kind === 'milestone' ? normalized.id : normalized.teamId;
    if (seen.has(id)) throw new TypeError(`${options.label} contains duplicate identifiers.`);
    seen.add(id);
    return normalized;
  });
}

export function normalizeAllStarBohEventSchedule(input = {}, options = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const seasonId = requiredIdentifier(source.seasonId ?? options.seasonId, 'Schedule seasonId');
  const status = String(source.status ?? 'hidden')
    .trim()
    .toLowerCase();
  if (!ALL_STAR_BOH_EVENT_SCHEDULE_STATUS.has(status)) {
    throw new TypeError('Schedule status must be hidden or published.');
  }
  const revision = Number.isInteger(Number(source.revision)) ? Number(source.revision) : 0;
  if (revision < 0) throw new TypeError('Schedule revision must be a non-negative integer.');
  const base = {
    schemaVersion: 1,
    seasonId,
    status,
    eventStartsAt: '',
    eventEndsAt: '',
    milestones: [],
    teamGameTimes: [],
    revision,
    createdAt: source.createdAt ?? null,
    updatedAt: source.updatedAt ?? null,
    updatedBy: String(source.updatedBy ?? '').trim(),
  };
  if (status === 'hidden') return Object.freeze(base);
  const eventStartsAt = normalizeIsoTimestamp(source.eventStartsAt, 'Schedule eventStartsAt');
  const eventEndsAt = normalizeIsoTimestamp(source.eventEndsAt, 'Schedule eventEndsAt');
  const startsMs = Date.parse(eventStartsAt);
  const endsMs = Date.parse(eventEndsAt);
  if (startsMs >= endsMs) throw new TypeError('Schedule event times must be ordered.');
  const range = { startsMs, endsMs };
  return Object.freeze({
    ...base,
    eventStartsAt,
    eventEndsAt,
    milestones: normalizeScheduleItems(source.milestones ?? [], {
      label: 'Schedule milestones',
      kind: 'milestone',
      maxItems: 8,
      range,
    }),
    teamGameTimes: normalizeScheduleItems(source.teamGameTimes ?? [], {
      label: 'Schedule team game times',
      kind: 'team',
      maxItems: 6,
      range,
    }),
  });
}

export function deriveAllStarBohEventScheduleState(scheduleInput = {}, nowMs = Date.now()) {
  const schedule = normalizeAllStarBohEventSchedule(scheduleInput);
  const now = Number(nowMs);
  if (schedule.status !== 'published' || !Number.isFinite(now)) {
    return Object.freeze({ phase: 'hidden', countdown: null, current: null, next: null });
  }
  const startsMs = Date.parse(schedule.eventStartsAt);
  const endsMs = Date.parse(schedule.eventEndsAt);
  const items = [
    {
      type: 'event-start',
      id: 'event-start',
      label: 'Event starts',
      startsAt: schedule.eventStartsAt,
    },
    ...schedule.milestones.map((item) => ({ type: 'milestone', ...item })),
    ...schedule.teamGameTimes.map((item) => ({ type: 'team-game', id: item.teamId, ...item })),
    { type: 'event-end', id: 'event-end', label: 'Event ends', startsAt: schedule.eventEndsAt },
  ].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  const current = [...items].reverse().find((item) => Date.parse(item.startsAt) <= now) || null;
  const next = items.find((item) => Date.parse(item.startsAt) > now) || null;
  const targetAt = next?.startsAt || '';
  const phase = now < startsMs ? 'upcoming' : now < endsMs ? 'live' : 'ended';
  return Object.freeze({
    phase,
    countdown: targetAt
      ? { targetAt, remainingSeconds: Math.max(0, Math.ceil((Date.parse(targetAt) - now) / 1000)) }
      : null,
    current,
    next,
  });
}

export { ISO_TIMESTAMP_PATTERN };
