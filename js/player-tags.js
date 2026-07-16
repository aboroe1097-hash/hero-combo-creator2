import { getPublicVtsPlayerProfile } from './vts-public-players.js';
import { appT } from './utils.js';

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

function readPlayerTagCandidates(player) {
  if (typeof player === 'string') return [player];
  if (!player || typeof player !== 'object') return [];
  return [
    player.playerKey,
    player.playerName,
    player.player,
    player.name,
    player.displayName,
    player.sourceName,
  ].filter(Boolean);
}

export function getSpecialPlayerTag(player) {
  for (const candidate of readPlayerTagCandidates(player)) {
    const profile = getPublicVtsPlayerProfile(candidate);
    if (profile?.rank === 'R5') return TAGS.r5;
    if (profile?.rank === 'R4') return TAGS.r4;
  }
  return null;
}

export function renderSpecialPlayerTag(player, escapeHtml) {
  const tag = getSpecialPlayerTag(player);
  if (!tag) return '';
  const esc = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value || '');
  const title = tag.className === 'r4' ? appT('edenX1RewardManagementTitle') : tag.title;
  return `<span class="dash-player-rank-tag dash-player-rank-tag--${tag.className}" title="${esc(title)}" aria-label="${esc(title)}">${esc(tag.label)}</span>`;
}
