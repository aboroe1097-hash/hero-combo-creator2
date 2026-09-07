import {
  buildShareUrl,
  decodeSharePayload,
  encodeSharePayload,
  parseShareUrl,
} from './codex-export.js';

export const PRESET_SHARE_KIND = 'preset';

export function encodePresetShare(treeId, name, allocation) {
  return encodeSharePayload(PRESET_SHARE_KIND, { t: treeId, n: name, a: allocation });
}

export function decodePresetShare(hash) {
  const payload = decodeSharePayload(PRESET_SHARE_KIND, hash);
  if (!payload || typeof payload !== 'object') return null;
  const treeId = String(payload.t || '');
  if (!treeId) return null;
  const allocation =
    payload.a && typeof payload.a === 'object' && !Array.isArray(payload.a) ? { ...payload.a } : {};
  return {
    treeId,
    name: String(payload.n || '').slice(0, 120),
    allocation,
  };
}

export function buildPresetShareUrl(treeId, name, allocation) {
  return buildShareUrl(PRESET_SHARE_KIND, { t: treeId, n: name, a: allocation });
}

export function parsePresetShareUrl() {
  return parseShareUrl(PRESET_SHARE_KIND);
}
