const FORBIDDEN_ENTITY_KEY_PATTERN = /(player|alliance|member|username|nickname|rank)/i;

export const GIFT_ESTIMATE_DISCLAIMER =
  'Estimate only: per-level costs come from the supplied model and must be verified against the game. Never attached to named players or alliances and never a ranking.';

export function buildGiftLevelEstimate(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Gift-level estimate input must be an object.');
  }
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_ENTITY_KEY_PATTERN.test(key)) {
      throw new TypeError(
        `Gift-level estimates must never reference "${key}" — estimates are never attached to named players or alliances.`
      );
    }
  }
  const perLevelCosts = (Array.isArray(input.perLevelCosts) ? input.perLevelCosts : [])
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (!perLevelCosts.length) {
    throw new TypeError('Gift-level estimates require at least one per-level cost.');
  }
  const targetLevel = Math.min(
    Math.max(Math.floor(Number(input.targetLevel) || 1), 1),
    perLevelCosts.length
  );
  const perLevel = perLevelCosts.slice(0, targetLevel);
  const total = perLevel.reduce((sum, value) => sum + value, 0);
  const assumptions = (Array.isArray(input.assumptions) ? input.assumptions : [])
    .map((assumption) => String(assumption))
    .filter((assumption) => assumption.trim())
    .slice(0, 40);
  if (!assumptions.length) {
    assumptions.push('Per-level costs taken from the supplied model; verify against the game.');
  }
  return Object.freeze({
    kind: 'gift-level-estimate',
    labelled: true,
    currencyLabel: String(input.currencyLabel || 'gifts').slice(0, 60),
    targetLevel,
    estimate: Object.freeze({
      total,
      perLevel: Object.freeze(perLevel),
    }),
    assumptions: Object.freeze(assumptions),
    disclaimer: GIFT_ESTIMATE_DISCLAIMER,
  });
}

export function validateGiftLevelEstimate(estimate) {
  const errors = [];
  if (!estimate || typeof estimate !== 'object') {
    errors.push('Estimate must be an object.');
    return errors;
  }
  if (estimate.kind !== 'gift-level-estimate') {
    errors.push('Estimate must declare kind "gift-level-estimate".');
  }
  if (estimate.labelled !== true) {
    errors.push('Estimate must carry an explicit estimate label.');
  }
  if (!estimate.disclaimer) {
    errors.push('Estimate must carry a disclaimer.');
  }
  if (!Array.isArray(estimate.assumptions) || estimate.assumptions.length === 0) {
    errors.push('Estimate must state at least one assumption.');
  }
  if (
    !estimate.estimate ||
    !Number.isFinite(Number(estimate.estimate.total)) ||
    Number(estimate.estimate.total) < 0
  ) {
    errors.push('Estimate must include a non-negative total.');
  }
  for (const key of Object.keys(estimate)) {
    if (FORBIDDEN_ENTITY_KEY_PATTERN.test(key)) {
      errors.push(`Estimate must not carry the identifier field "${key}".`);
    }
  }
  const serialized = JSON.stringify(estimate);
  if (/\b(player|alliance|member)\b/i.test(serialized)) {
    errors.push('Estimate payload must not reference players, alliances, or members.');
  }
  return errors;
}
