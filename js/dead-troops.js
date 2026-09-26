// js/dead-troops.js
//
// Dead-troops power helper for the VtsScore power breakdown. A member's
// in-game power excludes troops that are dead, so the helper counts what those
// troops return once they heal and adds it on top of the entered Troop Power
// and Total Combat Power.
//
// Three troop types, five tiers each: Lofty (T11) 8.2 power per troop, T10 and
// T10 Enhanced 7.5, T9 and T9 Enhanced 7.0. Members enter counts in thousands
// exactly as shown in game by default, or in thousands or millions. These are pure helpers
// so the numbers can be tested before they reach a screen.

export const DEAD_TROOP_CLASSES = Object.freeze(['footmen', 'cavalry', 'archers']);
export const DEAD_TROOP_VARIANTS = Object.freeze(['lofty', 't10', 't10e', 't9', 't9e']);
export const DEAD_TROOP_UNITS = Object.freeze(['troops', 'thousands', 'millions']);

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
  const troops = Number(entered);
  if (entered === '' || !Number.isFinite(troops) || troops < 0) return 0;
  return Math.round(troops * deadTroopUnitScale(unit) * deadTroopMultiplier(variant));
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
