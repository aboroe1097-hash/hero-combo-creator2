// Eden / ROC game time — 06:00 UAE (Asia/Dubai) = 00:00 game time
export const GAME_DAY_START_UAE_HOUR = 6;
export const UAE_TIMEZONE = 'Asia/Dubai';

export function getUaeDateParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: UAE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function uaeInstantMs(uae) {
  const iso = `${uae.year}-${pad2(uae.month)}-${pad2(uae.day)}T${pad2(uae.hour)}:${pad2(uae.minute)}:${pad2(uae.second)}+04:00`;
  return new Date(iso).getTime();
}

function gameDayStartMs(uae) {
  const startToday = new Date(`${uae.year}-${pad2(uae.month)}-${pad2(uae.day)}T0${GAME_DAY_START_UAE_HOUR}:00:00+04:00`).getTime();
  const now = uaeInstantMs(uae);
  if (now >= startToday) return startToday;
  return startToday - 24 * 60 * 60 * 1000;
}

/** @returns {{ gameHour: number, gameMinute: number, gameSecond: number, gameDayKey: string, formatted: string, formattedFull: string, uaeFormatted: string, uaeFull: string, minutesSinceMidnight: number }} */
export function getGameTimeState(date = new Date()) {
  const uae = getUaeDateParts(date);
  const startMs = gameDayStartMs(uae);
  const nowMs = uaeInstantMs(uae);
  const elapsedMs = Math.max(0, nowMs - startMs);
  const totalSec = Math.floor(elapsedMs / 1000);
  const gameHour = Math.floor(totalSec / 3600) % 24;
  const gameMinute = Math.floor((totalSec % 3600) / 60);
  const gameSecond = totalSec % 60;

  const startDate = new Date(startMs);
  const startUae = getUaeDateParts(startDate);
  const gameDayKey = `${startUae.year}-${pad2(startUae.month)}-${pad2(startUae.day)}`;

  return {
    gameHour,
    gameMinute,
    gameSecond,
    gameDayKey,
    formatted: `${pad2(gameHour)}:${pad2(gameMinute)}`,
    formattedFull: `${pad2(gameHour)}:${pad2(gameMinute)}:${pad2(gameSecond)}`,
    uaeFormatted: `${pad2(uae.hour)}:${pad2(uae.minute)}`,
    uaeFull: `${pad2(uae.hour)}:${pad2(uae.minute)}:${pad2(uae.second)}`,
    minutesSinceMidnight: gameHour * 60 + gameMinute,
  };
}

/** Parse HH:MM or H:MM → minutes since game midnight, or null */
export function parseGameTimeInput(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function formatGameTimeMinutes(mins) {
  if (mins == null || Number.isNaN(mins)) return '';
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

export function compareGameTimeMinutes(a, b) {
  const am = parseGameTimeInput(a);
  const bm = parseGameTimeInput(b);
  if (am == null && bm == null) return 0;
  if (am == null) return 1;
  if (bm == null) return -1;
  return am - bm;
}

let clockTimer = null;
const clockEls = new Set();

export function syncGameClockTitles() {
  clockEls.forEach((el) => {
    if (el.isConnected) el.dataset.gameClockBase = el.title || el.dataset.gameClockBase || '';
  });
}

export function mountGameClock(el, options = {}) {
  if (!el) return;
  const { showUae = true, showDay = true, compact = false } = options;
  el.dataset.gameClock = '1';
  el.dataset.showUae = showUae ? '1' : '0';
  el.dataset.showDay = showDay ? '1' : '0';
  el.dataset.compact = compact ? '1' : '0';
  el.dataset.gameClockBase = el.title || el.dataset.gameClockBase || '';
  clockEls.add(el);
  tickGameClocks();
  if (!clockTimer) {
    clockTimer = setInterval(tickGameClocks, 1000);
  }
}

function tickGameClocks() {
  const state = getGameTimeState();
  clockEls.forEach((el) => {
    if (!el.isConnected) {
      clockEls.delete(el);
      return;
    }
    const showUae = el.dataset.showUae === '1';
    const showDay = el.dataset.showDay === '1';
    const compact = el.dataset.compact === '1';
    const baseTitle = el.dataset.gameClockBase || 'Game time — 06:00 UAE = 00:00';
    if (compact) {
      el.textContent = state.formatted;
      el.title = `${baseTitle} · ${state.formattedFull} · UAE ${state.uaeFull}`;
      return;
    }
    const parts = [`🕐 ${state.formattedFull}`];
    if (showDay) parts.push(`Day ${state.gameDayKey}`);
    if (showUae) parts.push(`UAE ${state.uaeFull}`);
    el.textContent = parts.join(' · ');
    el.title = baseTitle;
  });
  if (clockEls.size === 0 && clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}