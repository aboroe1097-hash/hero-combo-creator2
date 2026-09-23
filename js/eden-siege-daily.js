// Today's Daily Siege, as a tiny dependency-free module.
//
// It lives outside js/eden-siege/ on purpose: the Arcade banner and the
// homepage callout need to name today's run, and anything under that folder is
// bundled into the lazy siege engine chunk, which no other route may load.
//
// The daily run is the same for every player on the same UTC date: the map
// rotates by day number and the seed is derived from the date alone, so the
// deterministic simulation replays an identical siege for everyone.

export const DAILY_MAPS = ['keep', 'ship'];

export function utcStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function dailySiegeFor(date = new Date()) {
  const stamp = utcStamp(date);
  const day = Math.floor(Date.parse(`${stamp}T00:00:00Z`) / 86400000);
  const mapId = DAILY_MAPS[((day % DAILY_MAPS.length) + DAILY_MAPS.length) % DAILY_MAPS.length];
  return { stamp, mapId, seed: `daily:${mapId}:${stamp}` };
}
