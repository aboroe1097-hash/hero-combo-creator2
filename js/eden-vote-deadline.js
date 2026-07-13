const EDEN_VOTE_ISO_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function normalizeEdenVoteClosesAt(value = '') {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate || !EDEN_VOTE_ISO_PATTERN.test(candidate)) return '';
  const deadlineMs = Date.parse(candidate);
  if (!Number.isFinite(deadlineMs)) return '';
  const canonical = new Date(deadlineMs).toISOString();
  return canonical === candidate ? canonical : '';
}

export function edenVoteDeadlineMs(value = '') {
  const closesAt = normalizeEdenVoteClosesAt(value);
  return closesAt ? Date.parse(closesAt) : 0;
}

export function isEdenVoteDeadlineExpired(value = '', nowMs = Date.now()) {
  const deadlineMs = edenVoteDeadlineMs(value);
  return deadlineMs > 0 && Number(nowMs) >= deadlineMs;
}

export function fromEdenVoteDatetimeLocal(value = '') {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(candidate)) return '';
  const deadline = new Date(candidate);
  if (!Number.isFinite(deadline.getTime())) return '';
  const closesAt = deadline.toISOString();
  return toEdenVoteDatetimeLocal(closesAt) === candidate ? closesAt : '';
}

export function toEdenVoteDatetimeLocal(value = '') {
  const deadlineMs = edenVoteDeadlineMs(value);
  if (!deadlineMs) return '';
  const deadline = new Date(deadlineMs);
  const pad = (part) => String(part).padStart(2, '0');
  return `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(
    deadline.getDate()
  )}T${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`;
}

export function getEdenVoteCountdownParts(value = '', nowMs = Date.now()) {
  const deadlineMs = edenVoteDeadlineMs(value);
  const remainingSeconds = deadlineMs
    ? Math.max(0, Math.ceil((deadlineMs - Number(nowMs)) / 1000))
    : 0;
  const days = Math.floor(remainingSeconds / 86_400);
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600);
  const minutes = Math.floor((remainingSeconds % 3_600) / 60);
  const seconds = remainingSeconds % 60;
  return { deadlineMs, remainingSeconds, days, hours, minutes, seconds };
}

export { EDEN_VOTE_ISO_PATTERN };
