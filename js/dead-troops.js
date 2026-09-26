// js/dead-troops.js
//
// Dead-troops power helper for the VtsScore power breakdown. A member's
// in-game power excludes troops that are dead, so the helper counts what those
// troops return once they heal and adds it on top of the entered Troop Power
// and Total Combat Power.
//
// Per-unit power is the owner's rule: every Lofty row is 8.2, T10 is 7.5 and
// T9 is 7.0, with Enhanced and normal variants sharing their tier's number.
// Members enter counts in thousands by default, or millions when the dead
// count is large. These are pure helpers so the numbers can be tested before
// they reach a screen.

export const DEAD_TROOP_CLASSES = Object.freeze(['lofty', 'footmen', 'cavalry', 'archers']);
export const DEAD_TROOP_VARIANTS = Object.freeze(['t10e', 't10', 't9e', 't9']);
export const DEAD_TROOP_UNITS = Object.freeze(['thousands', 'millions']);

/** Per-unit power for one class + variant cell. */
export function deadTroopMultiplier(className, variant) {
  if (className === 'lofty') return 8.2;
  return variant === 't10e' || variant === 't10' ? 7.5 : 7;
}

/** How many troops one entered number stands for. */
export function deadTroopUnitScale(unit) {
  return unit === 'millions' ? 1_000_000 : 1000;
}

/**
 * Power one grid cell returns: count × unit scale × per-unit power, rounded to
 * whole power. A blank, non-numeric or negative count is zero.
 */
export function deadTroopRowPower(count, { className, variant, unit } = {}) {
  const entered = typeof count === 'string' ? count.trim() : count;
  const troops = Number(entered);
  if (entered === '' || !Number.isFinite(troops) || troops < 0) return 0;
  return Math.round(troops * deadTroopUnitScale(unit) * deadTroopMultiplier(className, variant));
}

/**
 * Power the whole grid returns. `rows` are { className, variant, count }
 * cells; anything malformed contributes zero instead of poisoning the total.
 */
export function deadTroopsTotalPower(rows, unit) {
  let total = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    total += deadTroopRowPower(row?.count, {
      className: row?.className,
      variant: row?.variant,
      unit,
    });
  }
  return total;
}
