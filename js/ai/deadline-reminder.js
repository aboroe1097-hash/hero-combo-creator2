// The one-line Competition #12 deadline reminder under the drawer header.
//
// It appears only while the drawer is open, only when an action phase
// (registration, final check or re-upload) closes within 48 hours, and it is
// built from the same schedule status get_competition_status returns, so the
// line and Velo's answer always agree. Nothing here is fetched until the
// drawer opens. Dismissal is remembered per phase deadline on this device.
import {
  buildCompetitionStatus,
  loadPublishedCompetitionSchedule,
  upcomingCompetitionDeadline,
} from './competition-status.js';

export const DEADLINE_DISMISS_KEY = 'vts_velo_deadline_dismissed_v1';
const MAX_REMEMBERED = 12;

export function readDismissedDeadlines(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(DEADLINE_DISMISS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((key) => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberDismissedDeadline(key, storage = globalThis.localStorage) {
  const next = [...readDismissedDeadlines(storage).filter((entry) => entry !== key), key].slice(
    -MAX_REMEMBERED
  );
  try {
    storage?.setItem(DEADLINE_DISMISS_KEY, JSON.stringify(next));
  } catch {
    // Private mode or blocked storage: the line simply returns next time.
  }
  return next;
}

/** App language code to an Intl locale ("kr" is the app's Korean code). */
export function intlLocale(language) {
  const code = String(language || 'en').toLowerCase();
  return code === 'kr' ? 'ko' : code;
}

/** "29h" / "45m" in the viewer's language. */
export function formatRemaining({ days = 0, hours = 0, minutes = 0 }, locale) {
  const totalHours = days * 24 + hours;
  const unit = totalHours >= 1 ? 'hour' : 'minute';
  const value = totalHours >= 1 ? totalHours : Math.max(1, minutes);
  try {
    return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'narrow' }).format(
      value
    );
  } catch {
    return `${value}${unit === 'hour' ? 'h' : 'm'}`;
  }
}

/** The reminder text for a deadline, or '' when there is none. */
export function reminderText(deadline, { translate, locale }) {
  if (!deadline) return '';
  return translate('ai.reminder.line', {
    phase: translate(`ai.reminder.phase.${deadline.phase}`),
    remaining: formatRemaining(deadline.remaining, locale),
    game: deadline.gameTime,
    zone: deadline.gameTimeZone,
    local: deadline.localClock || deadline.localLabel,
  });
}

/**
 * Mounts (or refreshes) the line after `header`. `translate(key, vars)` gives
 * the drawer copy; `onAsk(prompt)` sends the question to Velo.
 */
export async function refreshDeadlineReminder({
  header,
  translate,
  language,
  onAsk,
  storage = globalThis.localStorage,
  readSchedule,
  nowMs,
}) {
  if (!header?.parentNode) return null;
  let line = header.parentNode.querySelector('.ai-deadline');
  let raw;
  try {
    raw = await loadPublishedCompetitionSchedule(readSchedule ? { read: readSchedule } : {});
  } catch {
    raw = null;
  }
  const locale = intlLocale(language);
  const status = buildCompetitionStatus(raw, {
    nowMs: Number.isFinite(nowMs) ? nowMs : Date.now(),
    locale,
  });
  const deadline = upcomingCompetitionDeadline(status);
  if (!deadline || readDismissedDeadlines(storage).includes(deadline.key)) {
    line?.remove();
    return null;
  }
  if (!line) {
    line = document.createElement('div');
    line.className = 'ai-deadline';
    line.setAttribute('role', 'status');
    const ask = document.createElement('button');
    ask.type = 'button';
    ask.className = 'ai-deadline__ask';
    const text = document.createElement('span');
    text.dir = 'auto';
    ask.append(text);
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'ai-deadline__dismiss';
    dismiss.textContent = '×';
    line.append(ask, dismiss);
    header.after(line);
    ask.addEventListener('click', () => onAsk?.(translate('ai.reminder.prompt')));
    dismiss.addEventListener('click', () => {
      rememberDismissedDeadline(line.dataset.deadlineKey, storage);
      line.remove();
    });
  }
  line.dataset.deadlineKey = deadline.key;
  line.dataset.phase = deadline.phase;
  line.querySelector('.ai-deadline__ask span').textContent = reminderText(deadline, {
    translate,
    locale,
  });
  line.querySelector('.ai-deadline__ask').setAttribute('title', translate('ai.reminder.ask'));
  line
    .querySelector('.ai-deadline__dismiss')
    .setAttribute('aria-label', translate('ai.reminder.dismiss'));
  return line;
}
