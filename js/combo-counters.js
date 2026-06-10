// Code-defined counter combos — edit COMBO_COUNTERS below to add/update matchups.
// Shown automatically next to combo scores (top 3 counters + their ranks).

function comboKey(heroes) {
  return [...heroes].sort().join('|');
}

/**
 * Each entry: target combo (3 heroes) → up to 3 counter lineups (each 3 heroes).
 * Ranks are resolved automatically from combos-db.js at runtime.
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
      ['Defender', 'Tarantula', 'Sakura'],
      ['Lawman', 'Army Breaker', 'The Avalanche'],
      ['Hunk', 'Spectral Reaper', 'Ramses II'],
    ],
  },
  {
    target: ['King Arthur', 'Cleopatra VII', 'Theodora'],
    counters: [
      ['Octavius', 'Cleopatra VII', 'Caesar'],
      ['Ramses II', 'Cleopatra VII', 'Jade Eagle'],
      ['Lawman', 'Defender', 'The Avalanche'],
    ],
  },
  {
    target: ['Ramses II', 'Leonidas', 'Beowulf'],
    counters: [
      ['Defender', 'Sakura', 'Jade Eagle'],
      ['Lawman', 'Rozen Blade', 'The Avalanche'],
      ['Immortal Guardian', 'ELK', 'Tarantula'],
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
      ['King Arthur', 'Cleopatra VII', 'Alexander'],
      ['Theodora', 'Boudica', 'Jade Eagle'],
      ['Ramses II', 'Cleopatra VII', 'Jade Eagle'],
    ],
  },
];

const _lookup = new Map(
  COMBO_COUNTERS.map(e => [comboKey(e.target), e.counters])
);

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

  return counters.slice(0, limit).map(counterHeroes => {
    const info = getComboRankInfo(counterHeroes);
    return {
      heroes: counterHeroes,
      rank: info?.rank ?? null,
      score: info?.score ?? null,
    };
  });
}

export function renderCountersInline(heroes, getComboRankInfo, getHeroImageUrl, compact = false) {
  const counters = getTopCounters(heroes, getComboRankInfo);
  if (!counters.length) return '';

  const rows = counters.map((c, i) => {
    const rankLabel = c.rank ? `#${c.rank}` : '—';
    const scoreLabel = c.score ? c.score : '';
    const imgs = c.heroes.map(h =>
      `<img src="${getHeroImageUrl(h)}" alt="${h}" title="${h}" class="counter-hero-thumb">`
    ).join('');
    if (compact) {
      return `<div class="counter-inline-row">
        <span class="counter-inline-rank">${rankLabel}</span>
        <span class="counter-inline-heroes">${c.heroes.join(' / ')}</span>
        ${scoreLabel ? `<span class="counter-inline-score">${scoreLabel}</span>` : ''}
      </div>`;
    }
    return `<div class="counter-inline-row counter-inline-row--full">
      <span class="counter-inline-idx">${i + 1}</span>
      <span class="counter-inline-rank">${rankLabel}</span>
      <div class="counter-inline-imgs">${imgs}</div>
      <span class="counter-inline-names">${c.heroes.join(' · ')}</span>
      ${scoreLabel ? `<span class="counter-inline-score">${scoreLabel}</span>` : ''}
    </div>`;
  }).join('');

  return `<div class="combo-counters-inline">
    <div class="counter-inline-title">Counters</div>
    ${rows}
  </div>`;
}

export function renderCountersToggle(heroes, getComboRankInfo, getHeroImageUrl, compact = false) {
  const count = getCounterCount(heroes);
  if (!count) return '';

  const panelId = counterPanelId(heroes);
  const inner = renderCountersInline(heroes, getComboRankInfo, getHeroImageUrl, compact);

  return `<div class="combo-counters-wrap">
    <button type="button" class="counter-toggle-btn" data-counter-target="${panelId}" aria-expanded="false">
      Counters (${count})
    </button>
    <div id="${panelId}" class="combo-counters-panel hidden">${inner}</div>
  </div>`;
}
