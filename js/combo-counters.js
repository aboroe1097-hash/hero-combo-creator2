// Code-defined counter combos — edit COMBO_COUNTERS below to add/update matchups.
// Each counter can be a hero array OR { heroes: [...], reason: "optional note" }.

import { escapeHtml } from './utils.js';

function comboKey(heroes) {
  return [...heroes].sort().join('|');
}

/** @typedef {{ heroes: string[], reason: string|null }} CounterEntry */

/**
 * @param {string[] | { heroes: string[], reason?: string }} raw
 * @returns {CounterEntry | null}
 */
function normalizeCounter(raw) {
  if (Array.isArray(raw) && raw.length === 3) {
    return { heroes: raw, reason: null };
  }
  if (raw && Array.isArray(raw.heroes) && raw.heroes.length === 3) {
    const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
    return { heroes: raw.heroes, reason: reason || null };
  }
  return null;
}

/**
 * Each entry: target combo (3 heroes) → up to 3 counter lineups.
 * Ranks are resolved automatically from combos-db.js at runtime.
 *
 * Example with optional reasoning:
 *   counters: [
 *     ['King Arthur', 'Theodora', 'Alexander'],
 *     { heroes: ['Lawman', 'Lancelot', 'The Avalanche'], reason: 'Silence + burst before their skills land' },
 *   ]
 */
export const COMBO_COUNTERS = [
  {
    target: ['Alexander', 'Cleopatra VII', 'Theodora'],
    counters: [
      ['King Arthur', 'Theodora', 'Alexander'],
      ['Immortal Guardian', 'Ramses II', 'Beowulf'],
      ['Lawman', 'Lancelot', 'The Avalanche'],
    ],
  },
  {
    target: ['Immortal Guardian', 'Ramses II', 'Beowulf'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Arthur sustain and pressure are favored into Ramses + Beowulf lines' },
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['King Arthur', 'Theodora', 'Alexander'],
      ['Defender', 'Tarantula', 'Sakura'],
      ['Lawman', 'Army Breaker', 'The Avalanche'],
      ['Hunk', 'Spectral Reaper', 'Ramses II'],
    ],
  },
  {
    target: ['King Arthur', 'Cleopatra VII', 'Theodora'],
    counters: [
      { heroes: ['Octavius', 'Rozen Blade', 'Caesar'], reason: 'Octavius + Rozen + Caesar is favored into King Arthur sustain lines' },
      ['Lawman', 'Defender', 'The Avalanche'],
    ],
  },
  {
    target: ['Ramses II', 'Leonidas', 'Beowulf'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Arthur sustain and pressure are favored into Ramses + Beowulf lines' },
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['King Arthur', 'Theodora', 'Alexander'],
      ['Lawman', 'Rozen Blade', 'The Avalanche'],
      ['Immortal Guardian', 'ELK', 'Tarantula'],
    ],
  },
  {
    target: ['Hunk', 'Ramses II', 'Beowulf'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Arthur sustain and pressure are favored into Ramses + Beowulf lines' },
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['King Arthur', 'Theodora', 'Alexander'],
    ],
  },
  {
    target: ['Bleeding Steed', 'Ramses II', 'Beowulf'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Arthur sustain and pressure are favored into Ramses + Beowulf lines' },
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['King Arthur', 'Theodora', 'Alexander'],
    ],
  },
  {
    target: ['Rozen Blade', 'Ramses II', 'Beowulf'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Arthur sustain and pressure are favored into Ramses + Beowulf lines' },
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['King Arthur', 'Theodora', 'Alexander'],
    ],
  },
  {
    target: ['King Arthur', 'Theodora', 'Alexander'],
    counters: [
      { heroes: ['Octavius', 'Rozen Blade', 'Caesar'], reason: 'Octavius + Rozen + Caesar is favored into King Arthur sustain lines' },
    ],
  },
  {
    target: ['King Arthur', 'Cleopatra VII', 'Alexander'],
    counters: [
      { heroes: ['Octavius', 'Rozen Blade', 'Caesar'], reason: 'Octavius + Rozen + Caesar is favored into King Arthur sustain lines' },
    ],
  },
  {
    target: ['Lawman', 'Lancelot', 'The Avalanche'],
    counters: [
      ['Defender', 'Tarantula', 'Sakura'],
      ['Black Prince', 'Lancelot', 'The Avalanche'],
      ['Ramses II', 'Leonidas', 'Jade Eagle'],
    ],
  },
  {
    target: ['Defender', 'Tarantula', 'Sakura'],
    counters: [
      ['Ramses II', 'Leonidas', 'Beowulf'],
      ['Lawman', 'War Lord', 'Jane'],
      ['Immortal Guardian', 'Ramses II', 'Beowulf'],
    ],
  },
  {
    target: ['Octavius', 'Cleopatra VII', 'Caesar'],
    counters: [
      { heroes: ['Immortal Guardian', 'Ramses II', 'Beowulf'], reason: 'Ramses + Beowulf lineups are favored into Octavius + Caesar cavalry' },
      ['Hunk', 'Ramses II', 'Beowulf'],
      ['Bleeding Steed', 'Ramses II', 'Beowulf'],
      ['Rozen Blade', 'Ramses II', 'Beowulf'],
      ['Ramses II', 'Leonidas', 'Beowulf'],
    ],
  },
  {
    target: ['Octavius', 'Rozen Blade', 'Caesar'],
    counters: [
      { heroes: ['Immortal Guardian', 'Ramses II', 'Beowulf'], reason: 'Ramses + Beowulf lineups are favored into Octavius + Rozen + Caesar' },
      ['Hunk', 'Ramses II', 'Beowulf'],
      ['Bleeding Steed', 'Ramses II', 'Beowulf'],
      ['Rozen Blade', 'Ramses II', 'Beowulf'],
      ['Ramses II', 'Leonidas', 'Beowulf'],
    ],
  },
  {
    target: ['Immortal Guardian', 'ELK', 'Tarantula'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], reason: 'Heavy sustain outlasts their damage output' },
      ['Lawman', 'Rozen Blade', 'The Avalanche'],
      ['Defender', 'Sakura', 'Jade Eagle'],
    ],
  },
  {
    target: ['Black Prince', 'Lancelot', 'The Avalanche'],
    counters: [
      { heroes: ['Ramses II', 'Leonidas', 'Beowulf'], reason: 'Leonidas disrupts their initial burst setup' },
      ['Lawman', 'Defender', 'The Avalanche'],
      ['Defender', 'Tarantula', 'Sakura'],
    ],
  },
  {
    target: ['Hunk', 'Spectral Reaper', 'Ramses II'],
    counters: [
      { heroes: ['King Arthur', 'Cleopatra VII', 'Alexander'], reason: 'Cleo cleanses debuffs and outheals the pressure' },
      ['Immortal Guardian', 'Ramses II', 'Beowulf'],
      ['Lawman', 'Lancelot', 'The Avalanche'],
    ],
  }
];

const _lookup = new Map(
  COMBO_COUNTERS.map((entry) => {
    const counters = (entry.counters || [])
      .map(normalizeCounter)
      .filter(Boolean);
    return [comboKey(entry.target), counters];
  }),
);

const DEFAULT_LABELS = {
  toggle: 'Counters ({n})',
  title: 'Counters',
  score: 'Score',
  hide: 'Hide counters',
};

export function getCounterCount(heroes) {
  if (!Array.isArray(heroes) || heroes.length !== 3) return 0;
  return _lookup.get(comboKey(heroes))?.length || 0;
}

function counterPanelId(heroes) {
  let h = 0;
  const key = comboKey(heroes);
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  return `ctr-${Math.abs(h).toString(36)}`;
}

export function getTopCounters(heroes, getComboRankInfo, limit = 3) {
  if (!Array.isArray(heroes) || heroes.length !== 3) return [];
  const counters = _lookup.get(comboKey(heroes));
  if (!counters?.length) return [];

  return counters.slice(0, limit).map((counter) => {
    const info = getComboRankInfo(counter.heroes);
    return {
      heroes: counter.heroes,
      reason: counter.reason,
      rank: info?.rank ?? null,
      score: info?.score ?? null,
    };
  });
}

function renderHeroChips(heroes, getHeroImageUrl) {
  return heroes.map((name) => `
    <span class="counter-hero-chip" title="${escapeHtml(name)}">
      <img src="${escapeHtml(getHeroImageUrl(name))}" alt="${escapeHtml(name)}" class="counter-hero-chip-img" loading="lazy">
      <span class="counter-hero-chip-name">${escapeHtml(name)}</span>
    </span>`).join('');
}

export function renderCountersInline(heroes, getComboRankInfo, getHeroImageUrl, labels = DEFAULT_LABELS) {
  const counters = getTopCounters(heroes, getComboRankInfo);
  if (!counters.length) return '';

  const t = { ...DEFAULT_LABELS, ...labels };
  const rows = counters.map((c, i) => {
    const rankLabel = c.rank ? `#${c.rank}` : '—';
    const scoreLabel = c.score ? `${t.score} ${c.score}` : '';
    const reasonHtml = c.reason
      ? `<p class="counter-card-reason">${escapeHtml(c.reason)}</p>`
      : '';

    return `<article class="counter-card" style="--counter-delay:${i * 60}ms">
      <div class="counter-card-head">
        <span class="counter-card-idx">${i + 1}</span>
        <span class="counter-card-rank">${rankLabel}</span>
        ${scoreLabel ? `<span class="counter-card-score">${escapeHtml(scoreLabel)}</span>` : ''}
      </div>
      <div class="counter-card-heroes">${renderHeroChips(c.heroes, getHeroImageUrl)}</div>
      ${reasonHtml}
    </article>`;
  }).join('');

  return `<div class="combo-counters-inline">
    <div class="counter-inline-title">${escapeHtml(t.title)}</div>
    <div class="counter-cards">${rows}</div>
  </div>`;
}

export function renderCountersToggle(heroes, getComboRankInfo, getHeroImageUrl, labels = DEFAULT_LABELS) {
  const count = getCounterCount(heroes);
  if (!count) return '';

  const t = { ...DEFAULT_LABELS, ...labels };
  const panelId = counterPanelId(heroes);
  const inner = renderCountersInline(heroes, getComboRankInfo, getHeroImageUrl, t);
  const toggleLabel = (t.toggle || DEFAULT_LABELS.toggle).replace('{n}', String(count));

  return `<div class="combo-counters-wrap">
    <button type="button" class="counter-toggle-btn" data-counter-target="${panelId}" aria-expanded="false" aria-controls="${panelId}">
      <span class="counter-toggle-icon" aria-hidden="true">⚔</span>
      <span class="counter-toggle-label">${escapeHtml(toggleLabel)}</span>
      <span class="counter-toggle-chevron" aria-hidden="true"></span>
    </button>
    <div id="${panelId}" class="combo-counters-panel hidden" role="region" aria-label="${escapeHtml(t.title)}">${inner}</div>
  </div>`;
}
