// tools/combos-planner/lanes.js
//
// Pure helpers for the local Combos Planner: troop, paid and tier facts, the
// tray and ranking filters, and the tray sort orders. The planner page and the
// unit tests both import this file, so it stays free of DOM and network access.

export const TROOPS = ['Cavalry', 'Archers', 'Footmen', 'Mixed'];
export const TIERS = ['S', 'A', 'B', 'C'];
export const TRAY_SORTS = ['new', 'score', 'tier', 'name', 'position'];
/** Sort key for a lane whose note carries no tier, so untiered lanes come last. */
export const NO_TIER = TIERS.length;
/** Every tray control at its neutral value. `mode` is the To place / Placed / All switch. */
export const TRAY_DEFAULTS = { mode: 'unplaced', q: '', troop: '', cost: '', tier: '', sort: 'new' };

/** Cavalry / Archers / Footmen when the three heroes agree, Mixed when they do not. */
export function troopOf(heroes, H) {
  const kinds = new Set(heroes.map((n) => H[n] && H[n].t).filter((t) => t && t !== 'All'));
  if (!kinds.size) return 'All';
  return kinds.size === 1 ? [...kinds][0] : 'Mixed';
}

export function hasPaid(heroes, H) {
  return heroes.some((n) => H[n] && H[n].p);
}

/** ROC Academy tier and score from an X8 lane note, e.g. "S tier (source score 340.6)". */
export function tierOf(note) {
  const m = /([SABCD]) tier \(source score ([\d.]+)\)/.exec(note || '');
  return m ? { tier: m[1], score: Number(m[2]) } : { tier: '', score: null };
}

/** Tier sort key: S first, then A, B, C, then the lanes with no tier in the note. */
export function tierRank(tier) {
  const i = TIERS.indexOf(tier);
  return i === -1 ? NO_TIER : i;
}

/** Does one X8 lane survive the tray filters? */
export function laneMatches(lane, filters, H) {
  const q = String(filters.q || '')
    .trim()
    .toLowerCase();
  if (q && !lane.heroes.some((n) => n.toLowerCase().includes(q))) return false;
  if (filters.troop && troopOf(lane.heroes, H) !== filters.troop) return false;
  if (filters.cost === 'paid' && !hasPaid(lane.heroes, H)) return false;
  if (filters.cost === 'free' && hasPaid(lane.heroes, H)) return false;
  if (filters.tier === 'none' && lane.tier) return false;
  if (filters.tier && filters.tier !== 'none' && lane.tier !== filters.tier) return false;
  return true;
}

/** Does one row of the fixed ranking survive the ranking filters? */
export function rankingMatches(heroes, filters, H) {
  const q = String(filters.hero || '')
    .trim()
    .toLowerCase();
  if (q && !heroes.some((n) => n.toLowerCase().includes(q))) return false;
  if (filters.troop && troopOf(heroes, H) !== filters.troop) return false;
  if (filters.cost === 'paid' && !hasPaid(heroes, H)) return false;
  if (filters.cost === 'free' && hasPaid(heroes, H)) return false;
  return true;
}

/** True when any tray control is off its neutral value, so Clear filters is worth showing. */
export function isFiltered(filters) {
  return Object.keys(TRAY_DEFAULTS).some((k) => (filters[k] || TRAY_DEFAULTS[k]) !== TRAY_DEFAULTS[k]);
}

const lineup = (lane) => lane.heroes.join(' / ');
const byName = (a, b) => lineup(a).localeCompare(lineup(b));
const scoreOf = (lane) => (lane.score == null ? -1 : lane.score);

/** Best score first, then the better tier, then the alphabetically first lineup. */
export function byScore(a, b) {
  return scoreOf(b) - scoreOf(a) || tierRank(a.tier) - tierRank(b.tier) || byName(a, b);
}

/**
 * The tray orders. `aboveOf(id)` is the rank a placed lane sits above, so
 * `position` can put the placements back in ranking order.
 */
export function sortLanes(items, sort, aboveOf = () => 0) {
  const out = [...items];
  if (sort === 'tier')
    return out.sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || byScore(a, b));
  if (sort === 'name') return out.sort(byName);
  if (sort === 'position')
    return out.sort((a, b) => {
      const pa = a.anchor ? aboveOf(a.id) : Infinity;
      const pb = b.anchor ? aboveOf(b.id) : Infinity;
      return pa - pb || byScore(a, b);
    });
  if (sort === 'new')
    return out.sort((a, b) => Number(!!b.added) - Number(!!a.added) || byScore(a, b));
  return out.sort(byScore);
}

/** The lanes the tray should show, already sorted, plus how many the mode holds. */
export function selectLanes(items, filters, H, aboveOf = () => 0) {
  const mode = filters.mode || 'all';
  const scope = items.filter((l) =>
    mode === 'placed' ? !!l.anchor : mode === 'unplaced' ? !l.anchor : true
  );
  const matched = scope.filter((lane) => laneMatches(lane, filters, H));
  return { items: sortLanes(matched, filters.sort, aboveOf), total: scope.length };
}

/** Marks every row within `radius` rows of an X8 lane, for "only rows near X8 lineups". */
export function nearMask(entries, radius = 4) {
  const keep = entries.map(() => false);
  entries.forEach((e, i) => {
    if (e.type !== 'x8') return;
    for (let d = -radius; d <= radius; d++) if (entries[i + d]) keep[i + d] = true;
  });
  return keep;
}

/** How many of the three heroes two lineups have in common. */
export function overlapOf(heroes, other) {
  return heroes.filter((name) => other.includes(name)).length;
}

/**
 * What a lineup has in common with the one being placed: the number of shared
 * heroes, and whether it already uses the same three heroes — a near duplicate
 * when only the skin code differs.
 */
export function matchOf(lane, held) {
  const shared = overlapOf(lane.heroes, held.heroes);
  return { shared, sameTrio: shared === 3 };
}

