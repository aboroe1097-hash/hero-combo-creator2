// js/combo-counters.js
// Counter helpers and reusable counter UI renderers.
import { escapeHtml } from './utils.js';
import {
  comboKey,
  getAllCounterMatchups,
  getCombosCounteredByHero,
  getCountersAgainstHero,
  getCountersForCombo,
  validateCounterDatabase,
} from './counter-db.js';

export {
  getAllCounterMatchups,
  getCombosCounteredByHero,
  getCountersAgainstHero,
  getCountersForCombo,
  validateCounterDatabase,
};

const DEFAULT_LABELS = {
  toggle: 'Counters ({n})',
  title: 'Counters',
  score: 'Score',
  hide: 'Hide counters',
  noCounters: 'No known counters',
  useCounter: 'Use this counter',
  why: 'Why',
  rank: 'Rank #{rank}',
  unranked: 'Unranked',
  counterNumber: 'Counter {n}',
  lineup: 'Counter lineup',
  pathOne: '{n} known counter path',
  pathMany: '{n} known counter paths',
  pickHelp: 'Pick a listed lineup to replace the current generator selection.',
  favoredHelp: 'These lineups are favored into the current combo.',
  targetCombo: 'Target combo',
  counter: 'Counter',
  beats: 'beats',
  target: 'Target',
  localizeReason: (_id, fallback) => fallback,
  localizeConfidence: (_id, fallback) => fallback,
};

let counterPanelSeq = 0;

export function getCounterCount(heroes) {
  return getCountersForCombo(heroes).length;
}

function counterPanelId(heroes) {
  let h = 0;
  const key = comboKey(heroes);
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  counterPanelSeq += 1;
  return `ctr-${Math.abs(h).toString(36)}-${counterPanelSeq}`;
}

export function getTopCounters(heroes, getComboRankInfo, limit = Infinity) {
  if (!Array.isArray(heroes) || heroes.length !== 3) return [];
  const counters = getCountersForCombo(heroes);
  if (!counters.length) return [];

  return counters.slice(0, limit).map((counter) => {
    const info = getComboRankInfo(counter.heroes);
    return {
      heroes: counter.heroes,
      reason: counter.reason,
      reasonId: counter.reasonId,
      confidence: counter.confidence,
      confidenceId: counter.confidenceId,
      rank: info?.rank ?? null,
      score: info?.score ?? null,
    };
  });
}

function renderHeroChips(heroes, getHeroImageUrl, variant = '') {
  const variantClass = variant ? ` counter-hero-chip--${variant}` : '';
  return heroes
    .map(
      (name) => `
    <span class="counter-hero-chip${variantClass}" title="${escapeHtml(name)}">
      <img src="${escapeHtml(getHeroImageUrl(name))}" alt="${escapeHtml(name)}" class="counter-hero-chip-img" loading="lazy">
      <span class="counter-hero-chip-name">${escapeHtml(name)}</span>
    </span>`
    )
    .join('');
}

function renderCounterReason(reason, reasonId, labels) {
  const localized = labels.localizeReason?.(reasonId, reason) || reason;
  return localized
    ? `<p class="counter-card-reason"><span>${escapeHtml(labels.why)}</span>${escapeHtml(localized)}</p>`
    : '';
}

function renderCounterUseButton(heroes, labels) {
  return `<button type="button" class="counter-use-btn" data-counter-use="${escapeHtml(heroes.join('|'))}">
    ${escapeHtml(labels.useCounter || DEFAULT_LABELS.useCounter)}
  </button>`;
}

function renderCounterCard(counter, index, getHeroImageUrl, labels, options = {}) {
  const rankLabel = counter.rank
    ? labels.rank.replace('{rank}', String(counter.rank))
    : labels.unranked;
  const scoreLabel = counter.score ? `${labels.score} ${counter.score}` : '';
  const confidence =
    labels.localizeConfidence?.(counter.confidenceId, counter.confidence) || counter.confidence;
  const confidenceHtml = confidence
    ? `<span class="counter-card-confidence">${escapeHtml(confidence)}</span>`
    : '';
  const actionHtml = options.showUseAction ? renderCounterUseButton(counter.heroes, labels) : '';
  const reasonHtml = renderCounterReason(counter.reason, counter.reasonId, labels);
  const footerHtml =
    reasonHtml || actionHtml
      ? `<div class="counter-card-foot">${reasonHtml}${actionHtml}</div>`
      : '';
  const reasonClass = reasonHtml ? ' counter-card--has-reason' : '';

  return `<article class="counter-card counter-card--mini-combo${reasonClass}" style="--counter-delay:${index * 55}ms">
    <div class="counter-card-head">
      <span class="counter-card-idx">${escapeHtml(labels.counterNumber.replace('{n}', String(index + 1)))}</span>
      <span class="counter-card-rank">${escapeHtml(rankLabel)}</span>
      ${scoreLabel ? `<span class="counter-card-score">${escapeHtml(scoreLabel)}</span>` : ''}
      ${confidenceHtml}
    </div>
    <div class="counter-lineup-block">
      <span class="counter-lineup-label">${escapeHtml(labels.lineup)}</span>
      <div class="counter-card-heroes">${renderHeroChips(counter.heroes, getHeroImageUrl, 'counter')}</div>
    </div>
    ${footerHtml}
  </article>`;
}

export function renderCountersInline(
  heroes,
  getComboRankInfo,
  getHeroImageUrl,
  labels = DEFAULT_LABELS,
  options = {}
) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const counters = getTopCounters(heroes, getComboRankInfo, options.limit ?? Infinity);
  if (!counters.length) {
    return options.showEmpty
      ? `<div class="combo-counters-inline combo-counters-inline--empty"><p class="counter-empty-state">${escapeHtml(t.noCounters)}</p></div>`
      : '';
  }

  const rows = counters
    .map((counter, i) => renderCounterCard(counter, i, getHeroImageUrl, t, options))
    .join('');

  const contextClass = options.context
    ? ` combo-counters-inline--${escapeHtml(options.context)}`
    : '';
  const helperText = options.showUseAction ? t.pickHelp : t.favoredHelp;
  const pathLabel = (counters.length === 1 ? t.pathOne : t.pathMany).replace(
    '{n}',
    String(counters.length)
  );
  return `<div class="combo-counters-inline${contextClass}">
    <div class="counter-inline-head">
      <div class="counter-inline-copy">
        <span class="counter-inline-title">${escapeHtml(t.title)}</span>
        <strong>${escapeHtml(pathLabel)}</strong>
        <small>${escapeHtml(helperText)}</small>
      </div>
      <div class="counter-target-preview">
        <span>${escapeHtml(t.targetCombo)}</span>
        <div class="counter-target-chips">${renderHeroChips(heroes, getHeroImageUrl, 'target-mini')}</div>
      </div>
    </div>
    <div class="counter-cards">${rows}</div>
  </div>`;
}

export function renderCountersToggle(
  heroes,
  getComboRankInfo,
  getHeroImageUrl,
  labels = DEFAULT_LABELS,
  options = {}
) {
  const count = getCounterCount(heroes);
  const t = { ...DEFAULT_LABELS, ...labels };
  if (!count) {
    return options.showEmpty
      ? `<div class="combo-counters-wrap combo-counters-wrap--empty"><p class="counter-empty-state">${escapeHtml(t.noCounters)}</p></div>`
      : '';
  }

  const panelId = counterPanelId(heroes);
  const inner = renderCountersInline(heroes, getComboRankInfo, getHeroImageUrl, t, options);
  const toggleLabel = (t.toggle || DEFAULT_LABELS.toggle).replace('{n}', String(count));

  return `<div class="combo-counters-wrap" data-counter-count="${count}">
    <button type="button" class="counter-toggle-btn" data-counter-target="${panelId}" aria-expanded="false" aria-controls="${panelId}">
      <span class="counter-toggle-icon" aria-hidden="true">CTR</span>
      <span class="counter-toggle-label">${escapeHtml(toggleLabel)}</span>
      <span class="counter-toggle-chevron" aria-hidden="true"></span>
    </button>
    <div id="${panelId}" class="combo-counters-panel hidden" role="region" aria-label="${escapeHtml(t.title)}">${inner}</div>
  </div>`;
}

export function renderCounterMatchupList(
  matchups,
  getComboRankInfo,
  getHeroImageUrl,
  labels = DEFAULT_LABELS,
  options = {}
) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const visible = matchups.slice(0, options.limit ?? 6);

  if (!visible.length) {
    return `<p class="counter-empty-state">${escapeHtml(options.emptyText || t.noCounters)}</p>`;
  }

  return `<div class="counter-matchup-list">
    ${visible
      .map((matchup, index) => {
        const targetInfo = getComboRankInfo(matchup.target);
        const counterInfo = getComboRankInfo(matchup.counter);
        const actionHtml = options.showUseAction ? renderCounterUseButton(matchup.counter, t) : '';
        const confidence =
          t.localizeConfidence?.(matchup.confidenceId, matchup.confidence) || matchup.confidence;
        return `<article class="counter-matchup-card" style="--counter-delay:${index * 55}ms">
        <div class="counter-matchup-head">
          <span class="counter-matchup-label">${escapeHtml(options.label || t.title)}</span>
          ${confidence ? `<span class="counter-card-confidence">${escapeHtml(confidence)}</span>` : ''}
        </div>
        <div class="counter-matchup-grid">
          <div class="counter-matchup-side counter-matchup-side--winner">
            <span class="counter-matchup-side-title">${escapeHtml(options.counterLabel || t.counter)}</span>
            <span class="counter-matchup-rank">${counterInfo?.rank ? `#${counterInfo.rank}` : escapeHtml(t.unranked)}</span>
            <div class="counter-card-heroes">${renderHeroChips(matchup.counter, getHeroImageUrl, 'counter')}</div>
          </div>
          <div class="counter-matchup-vs">${escapeHtml(t.beats)}</div>
          <div class="counter-matchup-side">
            <span class="counter-matchup-side-title">${escapeHtml(options.targetLabel || t.target)}</span>
            <span class="counter-matchup-rank">${targetInfo?.rank ? `#${targetInfo.rank}` : escapeHtml(t.unranked)}</span>
            <div class="counter-card-heroes">${renderHeroChips(matchup.target, getHeroImageUrl, 'target')}</div>
          </div>
        </div>
        ${renderCounterReason(matchup.reason, matchup.reasonId, t)}
        ${actionHtml}
      </article>`;
      })
      .join('')}
  </div>`;
}
