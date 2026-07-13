// js/combo-share.js - URL-based combo sharing
const SHARE_VERSION = 1;
const MAX_SHARED_COMBOS = 5;
const MAX_HERO_NAME_LENGTH = 80;
const MAX_ENCODED_LENGTH = 8192;

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

function normalizeScore(value) {
  const score = Number.parseFloat(value);
  if (!Number.isFinite(score)) return '—';
  return String(Math.max(0, Math.min(100, score)));
}

function normalizeHeroes(value) {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const heroes = value.map((hero) => (typeof hero === 'string' ? hero.trim() : ''));
  if (
    heroes.some((hero) => !hero || hero.length > MAX_HERO_NAME_LENGTH) ||
    new Set(heroes).size !== heroes.length
  ) {
    return null;
  }
  return heroes;
}

function normalizeCombos(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_SHARED_COMBOS)
    .map((combo) => {
      const heroes = normalizeHeroes(combo?.h ?? combo?.heroes ?? combo);
      if (!heroes) return null;
      return {
        heroes,
        displayScore: normalizeScore(combo?.s ?? combo?.displayScore ?? combo?.score),
      };
    })
    .filter(Boolean);
}

export function encodeCombos(combos) {
  try {
    const normalized = normalizeCombos(combos);
    if (!normalized.length) return '';
    const payload = {
      v: SHARE_VERSION,
      c: normalized.map((combo) => ({ h: combo.heroes, s: combo.displayScore })),
    };
    return encodeBase64Url(JSON.stringify(payload));
  } catch {
    return '';
  }
}

export function decodeCombos(hash) {
  try {
    if (typeof hash !== 'string' || hash.length > MAX_ENCODED_LENGTH) return null;
    const decoded = JSON.parse(decodeBase64Url(hash));
    // Accept the original array payload so already-shared links keep working.
    const normalized = normalizeCombos(decoded?.v === SHARE_VERSION ? decoded.c : decoded);
    return normalized.length ? normalized : null;
  } catch {
    return null;
  }
}

export function buildComboShareUrl(combos) {
  const encoded = encodeCombos(combos);
  if (!encoded) return '';
  return `${window.location.origin}${window.location.pathname}#combo=${encoded}`;
}

export function parseComboShareUrl() {
  const match = window.location.hash.match(/^#combo=(.+)$/);
  if (!match) return null;
  return decodeCombos(match[1]);
}

export function copyShareUrl(combos) {
  const url = buildComboShareUrl(combos);
  if (!url) return false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).catch(() => {});
  }
  return url;
}
