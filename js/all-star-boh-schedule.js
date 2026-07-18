export const ALL_STAR_BOH_SIGNUP_WINDOW = Object.freeze({
  // Set both values to canonical ISO timestamps when leadership confirms the window.
  // Example: 2026-07-20T18:00:00.000Z
  opensAt: '',
  closesAt: '',
});

const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

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

export { ISO_TIMESTAMP_PATTERN };
