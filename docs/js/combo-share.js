// js/combo-share.js - URL-based combo sharing
export function encodeCombos(combos) {
  try {
    const data = combos.map(c => ({ h: c.heroes || c, s: c.displayScore || c.score || '' }));
    return btoa(encodeURIComponent(JSON.stringify(data)));
  } catch { return ''; }
}

export function decodeCombos(hash) {
  try {
    const raw = JSON.parse(decodeURIComponent(atob(hash)));
    return raw.map(r => ({ heroes: r.h, score: r.s }));
  } catch { return null; }
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
