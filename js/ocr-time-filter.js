const GAME_TIME_UTC_OFFSET_MINUTES = 120;

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function getGameTimeNow(nowMs = Date.now()) {
  return new Date(nowMs + GAME_TIME_UTC_OFFSET_MINUTES * 60_000);
}

export function formatGameTimeDatePrefix(gameTimeDate) {
  return `${pad2(gameTimeDate.getUTCDate())}/${pad2(gameTimeDate.getUTCMonth() + 1)}/${gameTimeDate.getUTCFullYear()}`;
}

export function parseGameTimeDateMs(gameTime) {
  const text = String(gameTime || '').trim();
  if (!text) return NaN;

  const dmY = text.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(?:[A-Za-z]+,\s*)?(\d{1,2}):(\d{2}))?/
  );
  if (dmY) {
    return Date.UTC(
      Number(dmY[3]),
      Number(dmY[2]) - 1,
      Number(dmY[1]),
      Number(dmY[4] || 0),
      Number(dmY[5] || 0)
    );
  }

  const isoMs = new Date(text).getTime();
  return Number.isNaN(isoMs) ? NaN : isoMs;
}

export function getGameWeekStartMs(gameTimeDate) {
  const dayOfWeek = gameTimeDate.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return Date.UTC(
    gameTimeDate.getUTCFullYear(),
    gameTimeDate.getUTCMonth(),
    gameTimeDate.getUTCDate() - daysSinceMonday
  );
}

export function filterGameTimeAttacks(attacks, filter, nowMs = Date.now()) {
  const atts = [...(attacks || [])];
  if (filter !== 'daily' && filter !== 'weekly') return atts;

  const gtNow = getGameTimeNow(nowMs);

  if (filter === 'daily') {
    const todayPrefix = formatGameTimeDatePrefix(gtNow);
    return atts.filter((attack) => String(attack?.game_time || '').startsWith(todayPrefix));
  }

  const startOfMonday = getGameWeekStartMs(gtNow);
  return atts.filter((attack) => {
    const attackMs = parseGameTimeDateMs(attack?.game_time);
    return Number.isFinite(attackMs) && attackMs >= startOfMonday;
  });
}
