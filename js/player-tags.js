import { compactPlayerIdentity } from './ocr-name-normalizer.js';

const TAGS = Object.freeze({
  r5: Object.freeze({
    label: 'R5',
    className: 'r5',
    title: 'R5',
  }),
  r4: Object.freeze({
    label: 'R4',
    className: 'r4',
    title: 'R4 Management',
  }),
});

const R4_MANAGEMENT_KEYS = new Set([
  'ladyzubbs',
  'zubbs',
  'drzubbs',
  'drthunder',
  'kika',
  'kikaalt',
  'kikabanner',
  'kikabanner2',
  'angel',
  'angelbanner',
  'angelv2',
  'wickedrussian',
  'vickedrussian',
]);

function readPlayerTagCandidates(player) {
  if (typeof player === 'string') return [player];
  if (!player || typeof player !== 'object') return [];
  return [
    player.playerKey,
    player.playerName,
    player.name,
    player.displayName,
    player.sourceName,
  ].filter(Boolean);
}

export function getSpecialPlayerTag(player) {
  for (const candidate of readPlayerTagCandidates(player)) {
    const key = compactPlayerIdentity(candidate);
    if (!key) continue;
    if (key === 'malakabo') return TAGS.r5;
    if (R4_MANAGEMENT_KEYS.has(key)) return TAGS.r4;
  }
  return null;
}

export function renderSpecialPlayerTag(player, escapeHtml) {
  const tag = getSpecialPlayerTag(player);
  if (!tag) return '';
  const esc = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value || '');
  return `<span class="dash-player-rank-tag dash-player-rank-tag--${tag.className}" title="${esc(tag.title)}" aria-label="${esc(tag.title)}">${esc(tag.label)}</span>`;
}
