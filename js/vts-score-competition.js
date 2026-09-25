// Competition #12 on the member page: pure helpers for the ordered slot
// pickers, the phase → page-state mapping and the game-time labels. No DOM
// access here beyond `mountSlotPicker`, which only touches the nodes it is
// handed, so the logic is testable in Node.
//
// The page gates by phase for clarity only; firestore.rules and the vtsScore
// Function enforce the same windows server-side.

import {
  COMPETITION_BOH_SLOTS,
  COMPETITION_EPIC_SLOTS,
  GAME_TIME_UTC_OFFSET_MINUTES,
  slotToGameClock,
} from './competition-schedule.js';

export const VTS_SCORE_SLOT_CATALOGS = Object.freeze({
  boh: COMPETITION_BOH_SLOTS,
  epic: COMPETITION_EPIC_SLOTS,
});

/** "+20,+8" → ['+20', '+8'], keeping order, dropping blanks, repeats and unknown slots. */
export function parseSlotOrder(value, catalog) {
  const parts = Array.isArray(value) ? value : String(value ?? '').split(',');
  const out = [];
  for (const raw of parts) {
    const slot = String(raw ?? '').trim();
    if (!slot || out.includes(slot)) continue;
    if (catalog && !catalog.includes(slot)) continue;
    out.push(slot);
  }
  return out;
}

/** Tapping a slot: not chosen → appended as the next rank; chosen → removed. */
export function toggleSlotOrder(order, slot, catalog) {
  const current = parseSlotOrder(order, catalog);
  if (catalog && !catalog.includes(slot)) return current;
  return current.includes(slot) ? current.filter((value) => value !== slot) : [...current, slot];
}

/** 1-based rank of a slot in the order, or 0 when it is not chosen. */
export function slotRank(order, slot) {
  return parseSlotOrder(order).indexOf(slot) + 1;
}

/**
 * What the member page shows in each phase.
 *
 * - signup: 'open' (new and existing), 'edit' (existing only), 'readonly'
 *   (summary of an existing signup), 'hidden'.
 * - upload: 'final' (today's final-score upload), 'reupload' (the same
 *   workspace as the growth re-upload) or 'none'.
 * - notice: an i18n key for the phase note under the form, or ''.
 * - growthBoard: whether the growth board mount point is visible.
 */
export function getCompetitionPageState(phase, { hasSignup = false } = {}) {
  const readonly = hasSignup ? 'readonly' : 'hidden';
  switch (phase) {
    case 'upcoming':
      return pageState('hidden', 'none', 'phaseNoticeUpcoming', false);
    case 'registration':
      return pageState('open', 'none', '', false);
    case 'finalCheck':
      return hasSignup
        ? pageState('edit', 'none', 'phaseNowFinalCheck', false)
        : pageState('hidden', 'none', 'phaseNoticeFinalCheckClosed', false);
    case 'waiting':
      return pageState(
        readonly,
        'none',
        hasSignup ? 'phaseNoticeWaiting' : 'phaseNoticeNotRegistered',
        false
      );
    case 'reupload':
      return hasSignup
        ? pageState('readonly', 'reupload', 'phaseNowReupload', false)
        : pageState('hidden', 'none', 'phaseNoticeNotRegistered', false);
    case 'resultsPending':
      return pageState(readonly, 'none', 'phaseNoticeResultsPending', true);
    case 'winners':
      return pageState(readonly, 'none', 'phaseNowWinners', true);
    case 'closed':
      return pageState('hidden', 'none', 'phaseNowClosed', false);
    default:
      // No schedule document: today's behaviour, registration then final upload.
      return pageState('open', hasSignup ? 'final' : 'none', '', false);
  }
}

function pageState(signup, upload, notice, growthBoard) {
  return Object.freeze({ signup, upload, notice, growthBoard });
}

/** i18n key for the phase name and the "what you can do now" line. */
export function phaseCopyKeys(phase) {
  const suffix = phase ? phase[0].toUpperCase() + phase.slice(1) : 'Unconfigured';
  return Object.freeze({ name: `phaseName${suffix}`, now: `phaseNow${suffix}` });
}

function dateParts(ms, locale, options) {
  const parts = new Intl.DateTimeFormat(locale, options).formatToParts(new Date(ms));
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

// IANA "Etc/GMT+N" zones have an inverted sign: Etc/GMT+2 is UTC−2.
const GAME_TIME_IANA_ZONE = `Etc/GMT${GAME_TIME_UTC_OFFSET_MINUTES <= 0 ? '+' : '-'}${Math.abs(
  GAME_TIME_UTC_OFFSET_MINUTES / 60
)}`;

/** Epoch ms → "05 Oct 20:00" in game time (UTC−2), localized month and digits. */
export function formatGameTime(ms, locale = 'en') {
  if (!Number.isFinite(ms)) return '';
  const part = dateParts(ms, locale, {
    timeZone: GAME_TIME_IANA_ZONE,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${part.day} ${part.month} ${part.hour}:${part.minute}`;
}

/** Epoch ms → "Mon 05 Oct 22:00" in the viewer's own time zone. */
export function formatLocalTime(ms, locale = 'en', timeZone) {
  if (!Number.isFinite(ms)) return '';
  const part = dateParts(ms, locale, {
    ...(timeZone ? { timeZone } : {}),
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${part.weekday} ${part.day} ${part.month} ${part.hour}:${part.minute}`;
}

/** Remaining milliseconds → { days, clock: 'HH:MM:SS' }, never negative. */
export function splitCountdown(remainingMs) {
  const total = Math.max(0, Math.floor(Number(remainingMs) / 1000) || 0);
  const days = Math.floor(total / 86_400);
  const pad = (value) => String(value).padStart(2, '0');
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return Object.freeze({ days, clock: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` });
}

/**
 * Wires one ordered slot picker. `input` is the hidden
 * `data-boh-list="true"` field the signup document reads; the buttons are
 * rebuilt from its value whenever it changes (a stored signup being loaded
 * dispatches 'change'), so the input is the single source of truth.
 */
export function mountSlotPicker({ list, input, catalog, text }) {
  const buttons = new Map();
  for (const slot of catalog) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'vts-score-slot';
    button.dataset.slot = slot;
    const rank = document.createElement('span');
    rank.className = 'vts-score-slot__rank';
    rank.setAttribute('aria-hidden', 'true');
    const clock = document.createElement('strong');
    clock.textContent = slotToGameClock(slot);
    const zone = document.createElement('small');
    button.append(rank, clock, zone);
    button.addEventListener('click', () => {
      input.value = toggleSlotOrder(input.value, slot, catalog).join(',');
      render();
    });
    buttons.set(slot, button);
    list.append(button);
  }

  function render() {
    const order = parseSlotOrder(input.value, catalog);
    for (const [slot, button] of buttons) {
      const rank = order.indexOf(slot) + 1;
      const label = text('slotGameTime', { time: slotToGameClock(slot) });
      button.setAttribute('aria-pressed', String(rank > 0));
      button.setAttribute(
        'aria-label',
        rank ? text('slotChosenLabel', { label, rank }) : text('slotNotChosenLabel', { label })
      );
      button.querySelector('.vts-score-slot__rank').textContent = rank ? String(rank) : '+';
      button.querySelector('small').textContent = text('slotGameTimeShort');
    }
  }

  input.addEventListener('change', render);
  render();
  return Object.freeze({
    render,
    focus: () => buttons.get(catalog[0])?.focus(),
    setDisabled(disabled) {
      for (const button of buttons.values()) button.disabled = Boolean(disabled);
    },
  });
}
