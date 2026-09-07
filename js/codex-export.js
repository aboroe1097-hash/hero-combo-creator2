import {
  csvFooterLines,
  jsonMetaBlock,
  getExportBranding,
  assertNoForbiddenWatermarks,
} from './export-branding.js';

export const CODEX_EXPORT_SHARE_VERSION = 1;
export const MAX_SHARED_PAYLOAD_LENGTH = 8192;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSensitiveKey(key) {
  const words = String(key)
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const compact = words.join('');
  if (compact.includes('localstorage') || compact.includes('sessionstorage')) return true;
  if (
    words.some(
      (word) =>
        word.startsWith('password') ||
        word.startsWith('passcode') ||
        word.startsWith('secret') ||
        word.startsWith('credential')
    )
  ) {
    return true;
  }
  if (
    words.includes('auth') ||
    words.includes('authorization') ||
    words.includes('authentication') ||
    words.includes('authenticator')
  ) {
    return true;
  }
  if (words.includes('pin') || compact.endsWith('pinhash') || compact.endsWith('pincode'))
    return true;
  if ((words.includes('api') || words.includes('private')) && words.includes('key')) return true;
  return words.includes('token') && !words.includes('troop');
}

export function sanitizeForExport(value, ancestors = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol')
    return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return undefined;
  if (ancestors.has(value)) throw new TypeError('Export data must not contain cycles.');
  ancestors.add(value);
  if (Array.isArray(value)) {
    const output = value.map((item) => sanitizeForExport(item, ancestors) ?? null);
    ancestors.delete(value);
    return output;
  }
  const output = {};
  for (const key of Object.keys(value).sort()) {
    if (isSensitiveKey(key)) continue;
    const clean = sanitizeForExport(value[key], ancestors);
    if (clean !== undefined) output[key] = clean;
  }
  ancestors.delete(value);
  return output;
}

export function csvCell(value) {
  const raw = value == null ? '' : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function buildCsvText({ columns, rows, meta = {}, branding }) {
  const brand = branding || getExportBranding(meta);
  const lines = [columns.map(csvCell).join(',')];
  rows.forEach((row) => {
    lines.push(columns.map((column) => csvCell(row[column])).join(','));
  });
  assertNoForbiddenWatermarks(lines.join('\n'));
  csvFooterLines(brand).forEach((line) => lines.push(`#${line.replace(/"/g, "'")}`));
  return `\uFEFF${lines.join('\n')}`;
}

export function buildJsonDocument({ schema, schemaVersion, payload, meta = {}, branding }) {
  const brand = branding || getExportBranding(meta);
  const cleanPayload = sanitizeForExport(payload);
  assertNoForbiddenWatermarks(JSON.stringify(cleanPayload));
  const document = {
    ...jsonMetaBlock(brand, schema, schemaVersion),
    payload: cleanPayload,
  };
  return { document, text: JSON.stringify(document, null, 2) };
}

export function slugifyExportName(name) {
  return String(name || 'export')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'export';
}

export function datedExportFilename(toolName, extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `vts-${slugifyExportName(toolName)}-${date}.${extension}`;
}

function encodeBase64Url(value) {
  return btoa(encodeURIComponent(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const normalized = String(value || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return decodeURIComponent(atob(padded));
}

export function encodeSharePayload(kind, payload) {
  try {
    const text = JSON.stringify({ v: CODEX_EXPORT_SHARE_VERSION, k: kind, p: sanitizeForExport(payload) });
    if (text.length > MAX_SHARED_PAYLOAD_LENGTH) return '';
    return encodeBase64Url(text);
  } catch {
    return '';
  }
}

export function decodeSharePayload(kind, hash) {
  try {
    if (typeof hash !== 'string' || hash.length > MAX_SHARED_PAYLOAD_LENGTH) return null;
    const decoded = JSON.parse(decodeBase64Url(hash));
    if (decoded?.v !== CODEX_EXPORT_SHARE_VERSION) return null;
    if (kind && decoded.k !== kind) return null;
    return decoded.p ?? null;
  } catch {
    return null;
  }
}

export function buildShareUrl(kind, payload) {
  const encoded = encodeSharePayload(kind, payload);
  if (!encoded) return '';
  return `${window.location.origin}${window.location.pathname}#share-${kind}=${encoded}`;
}

export function parseShareUrl(kind) {
  const match = window.location.hash.match(new RegExp(`^#share-${kind}=(.+)$`));
  if (!match) return null;
  return decodeSharePayload(kind, match[1]);
}

export function downloadText(text, filename, mimeType) {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

export function exportCsv({ columns, rows, meta, branding, filename, toolName }) {
  const text = buildCsvText({ columns, rows, meta, branding });
  return downloadText(
    text,
    filename || datedExportFilename(toolName || 'export', 'csv'),
    'text/csv;charset=utf-8'
  );
}

export function exportJson({ schema, schemaVersion, payload, meta, branding, filename, toolName }) {
  const { text } = buildJsonDocument({ schema, schemaVersion, payload, meta, branding });
  return downloadText(
    text,
    filename || datedExportFilename(toolName || 'export', 'json'),
    'application/json'
  );
}

export function exportPngCanvas(canvas, filename) {
  if (typeof document === 'undefined' || !canvas || typeof canvas.toDataURL !== 'function') {
    return false;
  }
  const link = document.createElement('a');
  link.download = filename || datedExportFilename('card', 'png');
  link.href = canvas.toDataURL('image/png');
  link.click();
  return true;
}

export function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  return false;
}
