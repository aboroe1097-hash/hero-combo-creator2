export const OPERATIONS_CONFIG_PATH = 'vts_admin/operations_config';
export const OPERATIONS_FEATURES = Object.freeze([
  'uploads',
  'votes',
  'comments',
  'ai',
  'competition',
  'combos',
]);

export function normalizeOperationsConfig(raw = {}, now = Date.now()) {
  const expiresAtMs =
    Number.isSafeInteger(raw.expiresAtMs) && raw.expiresAtMs >= 0 ? raw.expiresAtMs : 0;
  const expired = expiresAtMs > 0 && expiresAtMs <= now;
  return {
    notice: expired ? '' : String(raw.notice || '').slice(0, 2000),
    readOnly: !expired && raw.readOnly === true,
    disabledFeatures: expired
      ? []
      : [
          ...new Set(
            (Array.isArray(raw.disabledFeatures) ? raw.disabledFeatures : []).filter((key) =>
              OPERATIONS_FEATURES.includes(key)
            )
          ),
        ],
    expiresAtMs,
    updatedAtMs: Number.isSafeInteger(raw.updatedAtMs) ? raw.updatedAtMs : 0,
    updatedBy: String(raw.updatedBy || ''),
    revision: Number.isSafeInteger(raw.revision) && raw.revision > 0 ? raw.revision : 0,
  };
}

export function isOperationPaused(config, feature, { superadmin = false, now = Date.now() } = {}) {
  if (superadmin) return false;
  const effective = normalizeOperationsConfig(config, now);
  return effective.readOnly || effective.disabledFeatures.includes(feature);
}

export function assertClientOperationAvailable(feature) {
  if (
    isOperationPaused(globalThis.VTS_OPERATIONS_CONFIG, feature, {
      superadmin: globalThis.VTS_OPERATIONS_SUPERADMIN === true,
    })
  ) {
    throw new Error('This feature is temporarily paused by the team. Please try again later.');
  }
}
