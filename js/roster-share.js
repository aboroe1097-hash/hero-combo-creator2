// js/roster-share.js - URL-based roster (hero selection) sharing
const SHARE_VERSION = 1;
const MAX_SHARED_HEROES = 120;
const MAX_HERO_NAME_LENGTH = 80;
const MAX_ENCODED_LENGTH = 65536;

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

function normalizeRoster(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .slice(0, MAX_SHARED_HEROES)
        .map((hero) => (typeof hero === 'string' ? hero.trim() : ''))
        .filter((hero) => hero && hero.length <= MAX_HERO_NAME_LENGTH)
    ),
  ];
}

export function encodeRoster(heroes) {
  try {
    const normalized = normalizeRoster(Array.isArray(heroes) ? heroes : Array.from(heroes || []));
    if (!normalized.length) return '';
    return encodeBase64Url(JSON.stringify({ v: SHARE_VERSION, h: normalized }));
  } catch {
    return '';
  }
}

export function decodeRoster(hash) {
  try {
    if (typeof hash !== 'string' || hash.length > MAX_ENCODED_LENGTH) return null;
    const decoded = JSON.parse(decodeBase64Url(hash));
    // Accept the original array payload so already-shared links keep working.
    const normalized = normalizeRoster(decoded?.v === SHARE_VERSION ? decoded.h : decoded);
    return normalized.length ? normalized : null;
  } catch {
    return null;
  }
}

export function buildRosterShareUrl(heroes) {
  const encoded = encodeRoster(heroes);
  if (!encoded) return '';
  return `${window.location.origin}${window.location.pathname}#roster=${encoded}`;
}

export function parseRosterShareUrl() {
  const match = window.location.hash.match(/^#roster=(.+)$/);
  if (!match) return null;
  return decodeRoster(match[1]);
}

export function copyRosterShareUrl(heroes) {
  const url = buildRosterShareUrl(heroes);
  if (!url) return false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).catch(() => {});
  }
  return url;
}
