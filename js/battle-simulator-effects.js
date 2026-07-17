// Special equipment skills are deny-by-default. Add a rule ID here only when
// the deterministic battle engine has an implementation for that exact rule.
export const ALLOWED_EQUIPMENT_SPECIAL_RULE_IDS = Object.freeze([]);

const RULE_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,79}$/;

export function normalizeEquipmentSpecialRuleId(value, label = 'Equipment special rule ID') {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string.`);
  const normalized = value.trim().toLowerCase();
  if (!RULE_ID_PATTERN.test(normalized)) {
    throw new RangeError(
      `${label} must contain 1-80 lowercase letters, numbers, dots, colons, underscores, or hyphens.`
    );
  }
  return normalized;
}

export function createEquipmentSpecialRuleAllowlist(ruleIds = ALLOWED_EQUIPMENT_SPECIAL_RULE_IDS) {
  if (!Array.isArray(ruleIds) && !(ruleIds instanceof Set)) {
    throw new TypeError('Equipment special rule allowlist must be an array or Set.');
  }
  const normalized = new Set();
  for (const ruleId of ruleIds) {
    normalized.add(normalizeEquipmentSpecialRuleId(ruleId));
  }
  return normalized;
}

export function isEquipmentSpecialRuleAllowed(
  ruleId,
  ruleIds = ALLOWED_EQUIPMENT_SPECIAL_RULE_IDS
) {
  const normalizedRuleId = normalizeEquipmentSpecialRuleId(ruleId);
  return createEquipmentSpecialRuleAllowlist(ruleIds).has(normalizedRuleId);
}
