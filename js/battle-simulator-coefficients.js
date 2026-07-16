export const DEFAULT_BATTLE_COEFFICIENTS = Object.freeze({
  baseCasualtyRate: 0.08,
  mightScale: 1,
  damageScale: 1,
  resistanceScale: 1,
  hpScale: 1,
  mightExponent: 1,
  damageExponent: 1,
  resistanceExponent: 1,
  hpExponent: 1,
  casualtyRateCap: 0.95,
});

const COEFFICIENT_KEYS = Object.freeze(Object.keys(DEFAULT_BATTLE_COEFFICIENTS));
const RATE_KEYS = new Set(['baseCasualtyRate', 'casualtyRateCap']);

function normalizeCoefficientValue(value, key) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Battle coefficient "${key}" must be a finite number.`);
  }

  const maximum = RATE_KEYS.has(key) ? 1 : 10;
  if (value <= 0 || value > maximum) {
    throw new RangeError(
      `Battle coefficient "${key}" must be greater than 0 and at most ${maximum}.`
    );
  }
  return value;
}

export function normalizeBattleCoefficients(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('Battle coefficients must be provided as an object.');
  }

  for (const key of Object.keys(raw)) {
    if (!Object.hasOwn(DEFAULT_BATTLE_COEFFICIENTS, key)) {
      throw new TypeError(`Unknown battle coefficient "${key}".`);
    }
  }

  return Object.freeze(
    Object.fromEntries(
      COEFFICIENT_KEYS.map((key) => [
        key,
        Object.hasOwn(raw, key)
          ? normalizeCoefficientValue(raw[key], key)
          : DEFAULT_BATTLE_COEFFICIENTS[key],
      ])
    )
  );
}
