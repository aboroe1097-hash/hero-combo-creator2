// js/roster-share.js - URL-based roster (hero selection) sharing
export function encodeRoster(heroes) {
  try {
    return btoa(encodeURIComponent(JSON.stringify(Array.from(heroes))));
  } catch { return ''; }
}

export function decodeRoster(hash) {
  try {
    return JSON.parse(decodeURIComponent(atob(hash)));
  } catch { return null; }
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
