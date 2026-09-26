// js/dead-troops.js
//
// Dead-troops power helper for VtsScore registration and score review. The
// game separates temporarily dead troops from alive troop power; competition
// power includes both, so this module adds the dead troops back to the total.
//
// Three troop types, five tiers each: Lofty (T11) 8.2 power per troop, T10 and
// T10 Enhanced 7.5, T9 and T9 Enhanced 7.0. Members enter counts in thousands
// exactly as shown in game by default, or in thousands or millions. These are pure helpers
// so the numbers can be tested before they reach a screen.

export const DEAD_TROOP_CLASSES = Object.freeze(['footmen', 'cavalry', 'archers']);
export const DEAD_TROOP_VARIANTS = Object.freeze(['lofty', 't10', 't10e', 't9', 't9e']);
export const DEAD_TROOP_UNITS = Object.freeze(['troops', 'thousands', 'millions']);

const DEAD_TROOP_CLASS_NAMES = Object.freeze({
  footmen: 'Footmen',
  cavalry: 'Cavalry',
  archers: 'Archers',
});
const DEAD_TROOP_VARIANT_NAMES = Object.freeze({
  lofty: 'Lofty',
  t10: 'T10',
  t10e: 'T10Enhanced',
  t9: 'T9',
  t9e: 'T9Enhanced',
});
const DEAD_TROOP_MAX_COUNT = 1_000_000_000_000;
export const DEAD_TROOP_COUNT_KEYS = Object.freeze(
  DEAD_TROOP_CLASSES.flatMap((className) =>
    DEAD_TROOP_VARIANTS.map((variant) => deadTroopCountKey(className, variant))
  )
);

export function deadTroopCountKey(className, variant) {
  const classPart = DEAD_TROOP_CLASS_NAMES[className];
  const variantPart = DEAD_TROOP_VARIANT_NAMES[variant];
  return classPart && variantPart ? `${classPart}${variantPart}` : '';
}

/** Canonical, unit-independent count record used by persisted sign-ups. */
export function normalizeDeadTroopCounts(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  if (Object.keys(source).some((key) => !DEAD_TROOP_COUNT_KEYS.includes(key))) return null;
  const counts = {};
  for (const key of DEAD_TROOP_COUNT_KEYS) {
    const value = source[key] ?? 0;
    if (!Number.isSafeInteger(value) || value < 0 || value > DEAD_TROOP_MAX_COUNT) return null;
    counts[key] = value;
  }
  return counts;
}

export function deadTroopPowerFromCounts(source) {
  const counts = normalizeDeadTroopCounts(source);
  if (!counts) return null;
  const rows = [];
  for (const className of DEAD_TROOP_CLASSES) {
    for (const variant of DEAD_TROOP_VARIANTS) {
      rows.push({
        variant,
        count: counts[deadTroopCountKey(className, variant)],
      });
    }
  }
  return deadTroopsTotalPower(rows, 'troops');
}

function adjustDeadTroopPowerInStats(stats, counts, direction) {
  const deadPower = deadTroopPowerFromCounts(counts);
  if (!stats || typeof stats !== 'object' || deadPower === null) return null;
  const offset = direction * deadPower;
  return {
    ...stats,
    troopPower: Math.max(0, (Number(stats.troopPower) || 0) + offset),
    totalCastlePower: Math.max(0, (Number(stats.totalCastlePower) || 0) + offset),
  };
}

/** Remove a saved dead-troop component before reopening a signup for editing. */
export function removeDeadTroopPowerFromStats(stats, counts) {
  return adjustDeadTroopPowerInStats(stats, counts, -1);
}

/** Add the current dead-troop component to the competition power fields. */
export function addDeadTroopPowerToStats(stats, counts) {
  return adjustDeadTroopPowerInStats(stats, counts, 1);
}

/** Per-unit power for one troop type + tier cell. */
export function deadTroopMultiplier(variant) {
  if (variant === 'lofty') return 8.2;
  return variant === 't10e' || variant === 't10' ? 7.5 : 7;
}

/** How many troops one entered number stands for. */
export function deadTroopUnitScale(unit) {
  if (unit === 'troops') return 1;
  return unit === 'millions' ? 1_000_000 : 1000;
}

/** Keep the actual troop count stable when the display unit changes. */
export function convertDeadTroopCountUnit(count, fromUnit, toUnit) {
  if (count === '') return '';
  const value = Number(count);
  if (!Number.isFinite(value) || value < 0) return count;
  return String(
    Number(((value * deadTroopUnitScale(fromUnit)) / deadTroopUnitScale(toUnit)).toPrecision(12))
  );
}

/**
 * Power one grid cell returns: count × unit scale × per-unit power, rounded to
 * whole power. A blank, non-numeric or negative count is zero.
 */
export function deadTroopRowPower(count, { variant, unit } = {}) {
  const entered = typeof count === 'string' ? count.trim() : count;
  const troops = deadTroopActualCount(entered, unit);
  return Math.round(troops * deadTroopMultiplier(variant));
}

/**
 * The real troop count an entered number stands for: 20 entered in thousands
 * is 20,000 troops. Blank or hostile input is zero.
 */
export function deadTroopActualCount(count, unit) {
  const entered = typeof count === 'string' ? count.trim() : count;
  const troops = Number(entered);
  if (entered === '' || !Number.isFinite(troops) || troops < 0) return 0;
  return Math.round(troops * deadTroopUnitScale(unit));
}

/**
 * Power the whole grid returns. `rows` are { variant, count } cells (the troop
 * type only labels the row); anything malformed contributes zero instead of
 * poisoning the total.
 */
export function deadTroopsTotalPower(rows, unit) {
  let total = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    total += deadTroopRowPower(row?.count, { variant: row?.variant, unit });
  }
  return total;
}
