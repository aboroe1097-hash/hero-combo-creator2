import { buildWeightedContributionRows } from './contribution-weighting.js';
import { translations, loadTranslationsForLanguage } from './translations.js';
import { mountGameClock, syncGameClockTitles } from './game-time.js';

const APP_VERSION = '12.2.1';
const FS_PATH = 'vts_admin/dashboard_data';
const THEME_STORAGE_KEY = 'vts_theme';
const WEIGHTED_CONTRIBUTION_COMPACT_KEY = 'vts_weighted_contribution_compact';
const EDEN_X1_TEST_MODE = Boolean(globalThis.VTS_EDEN_X1_TEST_MODE);

let currentLang = 'en';
let currentRows = [];
let currentRecordLabel = '';
let currentRewardView = 'support';

function $(id) {
  return document.getElementById(id);
}

function esc(str) {
  if (!str) return '';
  const el = document.createElement('div');
  el.textContent = String(str);
  return el.innerHTML;
}

function t(key, vars = {}) {
  const dict = translations[currentLang] || translations.en || {};
  let value = dict[key] || translations.en?.[key] || key;
  Object.entries({ version: APP_VERSION, ...vars }).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });
  return value;
}

function valueOf(input) {
  const n = Number(input || 0);
  return Number.isFinite(n) ? n : 0;
}

function formatSignedNumber(n) {
  if (n > 0) return `+${n}`;
  return String(n);
}

function formatScore(value) {
  return valueOf(value).toLocaleString();
}

function formatWeightedScore(value) {
  return valueOf(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function isWeightedContributionCompactView() {
  try {
    return localStorage.getItem(WEIGHTED_CONTRIBUTION_COMPACT_KEY) === '1';
  } catch {
    return false;
  }
}

function setWeightedContributionCompactView(enabled) {
  try {
    localStorage.setItem(WEIGHTED_CONTRIBUTION_COMPACT_KEY, enabled ? '1' : '0');
  } catch {
    // Keep the toggle functional even in storage-restricted browsers.
  }
  document
    .querySelectorAll('#dashWeightedContributionPanel .dash-contribution-weighted-card')
    .forEach((card) => {
      card.classList.toggle('dash-weighted-compact', enabled);
      card.querySelectorAll('[data-weighted-compact-toggle]').forEach((button) => {
        button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        button.textContent = enabled ? t('edenX1FullView') : t('edenX1CompactView');
      });
    });
}

function renderWeightedContributionViewToggle(compact) {
  return `<button class="dash-btn dash-btn-xs dash-weighted-view-toggle" type="button" data-weighted-compact-toggle aria-pressed="${compact ? 'true' : 'false'}">${esc(compact ? t('edenX1FullView') : t('edenX1CompactView'))}</button>`;
}

function bindWeightedContributionViewToggle(host) {
  host.querySelectorAll('[data-weighted-compact-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      setWeightedContributionCompactView(!isWeightedContributionCompactView());
    });
  });
}

function rewardViewTitleKey(view) {
  return (
    {
      contribution: 'edenX1RewardLeaderboardTitle',
      support: 'edenX1RewardSupportTitle',
      management: 'edenX1RewardManagementTitle',
      team: 'edenX1RewardTeamTitle',
    }[view] || 'edenX1WeightedTitle'
  );
}

function rewardViewMetaKey(view) {
  return (
    {
      contribution: 'edenX1RewardContributionMeta',
      support: 'edenX1RewardSupportMeta',
      management: 'edenX1RewardManagementMeta',
      team: 'edenX1RewardTeamMeta',
    }[view] || ''
  );
}

function updateRewardFlowControls() {
  document.querySelectorAll('[data-reward-view]').forEach((button) => {
    const view = button.dataset.rewardView || '';
    const active = view === currentRewardView;
    const titleKey = button.dataset.rewardTitleKey || rewardViewTitleKey(view);
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute('aria-label', t('edenX1RewardViewAria', { title: t(titleKey) }));
  });
}

function bindRewardFlowControls() {
  document.querySelectorAll('[data-reward-view]').forEach((button) => {
    if (button.dataset.rewardBound) return;
    button.dataset.rewardBound = '1';
    button.addEventListener('click', () => {
      const view = button.dataset.rewardView || 'all';
      currentRewardView = view;
      renderCurrentTable();
    });
  });
  updateRewardFlowControls();
}

function getContributionRewardRows() {
  const supportPlayerKeys = new Set(getSupportRewardRows().map((row) => row.playerKey));
  return currentRows
    .filter((row) => Number(row.currentRank) > 0 && !supportPlayerKeys.has(row.playerKey))
    .slice()
    .sort(
      (a, b) =>
        Number(a.currentRank) - Number(b.currentRank) ||
        valueOf(b.contributionScore) - valueOf(a.contributionScore)
    )
    .slice(0, 10);
}

function getSupportRewardRows() {
  return currentRows.slice(0, 4);
}

function rewardSlotRows(view) {
  if (view === 'management') {
    return Array.from({ length: 4 }, (_, index) => ({
      slot: index + 1,
      player: 'MalakAbo',
      group: t('edenX1RewardManagementTitle'),
      status: t('edenX1RewardAssigned'),
    }));
  }
  if (view === 'team') {
    return Array.from({ length: 2 }, (_, index) => ({
      slot: index + 1,
      player: t('edenX1Tba'),
      group: t('edenX1RewardTeamTitle'),
      status: t('edenX1RewardVotePending'),
    }));
  }
  return [];
}

function renderWeightedScorePopover(row, index) {
  const tooltipId = `edenX1WeightedScoreTip-${index}`;
  const dutyCount = row.banners + row.pathers + row.shieldWalls;
  const dutyNote = t('edenX1DutyFormula', {
    banners: row.banners,
    pathers: row.pathers,
    shieldWalls: row.shieldWalls,
    count: dutyCount,
  });
  const conductNote = t('edenX1ConductPrivateNotice');
  return `<button class="dash-weighted-score-trigger eden-x1-popover-trigger" type="button" aria-describedby="${tooltipId}" aria-label="${esc(t('edenX1WeightedBreakdownAria', { player: row.playerName }))}">
    <span class="dash-weighted-score-value">${formatWeightedScore(row.weightedScore)}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover" role="tooltip">
      <strong>${esc(t('edenX1WeightedBreakdownTitle'))}</strong>
      <span><span>${esc(t('edenX1BreakdownContribution'))}</span><b>${formatScore(row.contributionScore)}</b></span>
      <span><span>${esc(t('edenX1BreakdownExGuild'))}</span><b>${formatScore(row.contributionExGuild || 0)}</b></span>
      <span><span>${esc(t('edenX1BreakdownDuty'))}<small>${esc(dutyNote)}</small></span><b>${formatScore(row.dutyPoints || 0)}</b></span>
      <span><span>${esc(t('edenX1BreakdownConductPoints'))}<small>${esc(conductNote)}</small></span><b>${formatSignedNumber(row.conductPoints || 0)}</b></span>
      <span class="dash-weighted-score-popover-total"><span>${esc(t('edenX1BreakdownTotal'))}</span><b>${formatWeightedScore(row.weightedScore)}</b></span>
    </span>
  </button>`;
}

function renderConductScorePopover(row, index) {
  const tooltipId = `edenX1ConductTip-${index}`;
  return `<button class="dash-weighted-score-trigger dash-weighted-conduct-trigger eden-x1-popover-trigger ${row.conductBonus >= 0 ? 'dash-positive' : 'dash-negative'}" type="button" aria-describedby="${tooltipId}" aria-label="${esc(t('edenX1ConductAria', { player: row.playerName }))}">
    <span class="dash-weighted-score-value">${formatSignedNumber(row.conductBonus)}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover" role="tooltip">
      <strong>${esc(t('edenX1BreakdownConductPoints'))}</strong>
      <span><span>${esc(t('edenX1ThConduct'))}</span><b>${formatSignedNumber(row.conductBonus)}</b></span>
      <span><span>${esc(t('edenX1BreakdownConductPoints'))}<small>${esc(t('edenX1ConductPrivateNotice'))}</small></span><b>${formatSignedNumber(row.conductPoints || 0)}</b></span>
    </span>
  </button>`;
}

function renderFinalRankPopover(row, index) {
  const tooltipId = `edenX1FinalRankTip-${index}`;
  const cur = Number(row.currentRank);
  const hasCur = Number.isFinite(cur) && cur > 0;
  const delta = hasCur ? cur - row.finalRank : 0;
  const movement = !hasCur
    ? '--'
    : delta > 0
      ? t('edenX1RankUp', { count: delta })
      : delta < 0
        ? t('edenX1RankDown', { count: Math.abs(delta) })
        : t('edenX1RankSame');
  return `<button class="dash-weighted-rank-trigger eden-x1-popover-trigger" type="button" aria-describedby="${tooltipId}" aria-label="${esc(t('edenX1RankReasonAria', { player: row.playerName }))}">
    <span class="dash-weighted-score-value">#${row.finalRank}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover" role="tooltip">
      <strong>${esc(t('edenX1RankReasonTitle'))}</strong>
      <span><span>${esc(t('edenX1RankedBy'))}</span><b>${esc(t('edenX1ThWeightedScore'))}</b></span>
      <span><span>${esc(t('edenX1ThWeightedScore'))}</span><b>${formatWeightedScore(row.weightedScore)}</b></span>
      <span><span>${esc(t('adminContributionRank'))}</span><b>${hasCur ? `#${cur}` : '--'}</b></span>
      <span><span>${esc(t('edenX1RankMovement'))}</span><b>${esc(movement)}</b></span>
      <span class="dash-weighted-score-popover-total"><span>${esc(t('adminContributionFinalRank'))}</span><b>#${row.finalRank}</b></span>
    </span>
  </button>`;
}

function renderFinalRewardPopover(row, index, context = {}) {
  const tooltipId = `edenX1FinalRewardTip-${index}`;
  const baseReward = contributionRewardLabel(context.baseReward || row.baseReward);
  const finalReward = contributionRewardLabel(context.finalReward || row.finalReward);
  const rankLabel = context.rankLabel || t('adminContributionFinalRank');
  const rankValue = context.rank || row.finalRank;
  const hasPrivateR5Decision =
    row.rewardReason === 'grant_premium' || row.rewardReason === 'forfeit_premium';
  const reason = context.reason
    ? context.reason
    : hasPrivateR5Decision
      ? t('edenX1ConductPrivateNotice')
      : t('edenX1RewardReasonRank', { rank: row.finalRank, reward: baseReward });
  return `<button class="dash-weighted-reward-trigger eden-x1-popover-trigger" type="button" aria-describedby="${tooltipId}" aria-label="${esc(t('edenX1RewardReasonAria', { player: row.playerName, reward: finalReward }))}">
    <span class="dash-weighted-reward-value">${esc(finalReward)}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover" role="tooltip">
      <strong>${esc(t('edenX1RewardReasonTitle'))}</strong>
      <span><span>${esc(t('edenX1RankedBy'))}</span><b>${esc(t('edenX1ThWeightedScore'))}</b></span>
      <span><span>${esc(t('edenX1ThWeightedScore'))}</span><b>${formatWeightedScore(row.weightedScore)}</b></span>
      <span><span>${esc(rankLabel)}</span><b>#${rankValue}</b></span>
      <span><span>${esc(t('adminContributionReward'))}</span><b>${esc(baseReward)}</b></span>
      <span><span>${esc(t('adminContributionFinalReward'))}</span><b>${esc(finalReward)}</b></span>
      <small>${esc(reason)}</small>
    </span>
  </button>`;
}

function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f8fafc' : '#060b13');

  const btn = $('themeToggle');
  const darkIcon = btn?.querySelector('.theme-icon-dark');
  const lightIcon = btn?.querySelector('.theme-icon-light');
  if (darkIcon && lightIcon) {
    darkIcon.classList.toggle('hidden', theme === 'light');
    lightIcon.classList.toggle('hidden', theme !== 'light');
  }
}

function initTheme() {
  applyTheme(getPreferredTheme());
  if (!localStorage.getItem(THEME_STORAGE_KEY) && localStorage.getItem('theme')) {
    localStorage.setItem(THEME_STORAGE_KEY, localStorage.getItem('theme'));
    localStorage.removeItem('theme');
  }
  const btn = $('themeToggle');
  if (!btn || btn.dataset.themeWired) return;
  btn.dataset.themeWired = '1';
  btn.addEventListener('click', () => {
    const current =
      document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    localStorage.removeItem('theme');
    applyTheme(next);
  });
}

function getLanguage() {
  try {
    return localStorage.getItem('vts_hero_lang') || 'en';
  } catch {
    return 'en';
  }
}

function contributionRewardLabel(reward) {
  if (!reward) return '--';
  const labels = {
    guild_master: t('adminContributionRewardGuildMaster'),
    core: t('adminContributionRewardCore'),
    power_house: t('adminContributionRewardPowerHouse'),
    members: t('adminContributionRewardMembers'),
    standard: t('adminContributionRewardStandard'),
    premium: t('adminContributionRewardPremium'),
    review: t('adminContributionRewardReview'),
    none: t('adminContributionRewardNone'),
  };
  return labels[reward] || reward;
}

function updateTextContent(lang) {
  currentLang = lang;
  const dict = translations[lang] || translations.en;
  window.VTS_TRANSLATIONS = translations;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  const languageSelect = $('languageSelect');
  if (languageSelect) languageSelect.value = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.getAttribute('data-i18n-ph');
    if (dict[key]) el.placeholder = t(key);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) el.title = t(key);
  });

  syncGameClockTitles();
  renderCurrentTable();
}

function renderTable(rows, recordLabel, options = {}) {
  const compactView = isWeightedContributionCompactView();
  const title = options.title || t('edenX1WeightedTitle');
  const meta = options.meta || `${recordLabel || t('edenX1PageTitle')} - ${t('edenX1ViewOnly')}`;
  const numberMode = options.numberMode || 'final';
  const rewardContextForRow =
    typeof options.rewardContextForRow === 'function' ? options.rewardContextForRow : () => ({});
  return `<div id="ocrDashboardRoot" class="dash-weighted-contribution-panel">
    <div class="dash-card dash-weighted-contribution-card dash-contribution-weighted-card eden-x1-weighted-card ${compactView ? 'dash-weighted-compact' : ''}">
      <div class="dash-card-hdr dash-card-hdr-wrap">
        <h2 class="dash-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span>${esc(title)}</span>
        </h2>
        <div class="dash-weighted-table-controls">
          <span class="dash-weighted-contribution-meta">${esc(meta)}</span>
          ${renderWeightedContributionViewToggle(compactView)}
        </div>
      </div>
      <div class="dash-contribution-compare-table-wrap dash-weighted-contribution-table-wrap">
        <table class="dash-banner-table dash-contribution-compare-table dash-contribution-weighted-table">
          <thead><tr>
            <th>${esc(t('edenX1ThNumber'))}</th>
            <th>${esc(t('adminContributionMember'))}</th>
            <th class="dash-weighted-detail-col">${esc(t('adminContributionRank'))}</th>
            <th class="dash-weighted-detail-col">${esc(t('adminContributionReward'))}</th>
            <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThContribution'))}</th>
            <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThShieldWalls'))}</th>
            <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThPathers'))}</th>
            <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThBanners'))}</th>
            <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThTotal'))}</th>
            <th class="dash-weighted-detail-col dash-weighted-conduct-col" style="text-align:right">${esc(t('edenX1ThConduct'))}</th>
            <th style="text-align:right">${esc(t('edenX1ThWeightedScore'))}</th>
            <th>${esc(t('adminContributionFinalRank'))}</th>
            <th>${esc(t('adminContributionFinalReward'))}</th>
          </tr></thead>
          <tbody>${rows
            .map((row, index) => {
              const total =
                valueOf(row.contributionScore) +
                row.shieldWalls +
                row.pathers +
                row.banners +
                row.conductBonus;
              const numberValue =
                numberMode === 'current'
                  ? row.currentRank || index + 1
                  : numberMode === 'index'
                    ? index + 1
                    : row.finalRank;
              const rewardContext = rewardContextForRow(row, index, numberValue);
              return `<tr>
                <td data-label="${esc(t('edenX1ThNumber'))}">${numberValue}</td>
                <td data-label="${esc(t('adminContributionMember'))}"><strong>${esc(row.playerName)}</strong></td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('adminContributionRank'))}">${row.currentRank ? `#${esc(row.currentRank)}` : '--'}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('adminContributionReward'))}">${esc(contributionRewardLabel(row.currentReward))}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThContribution'))}" style="text-align:right">${formatScore(row.contributionScore)}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThShieldWalls'))}" style="text-align:right">${row.shieldWalls}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThPathers'))}" style="text-align:right">${row.pathers}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThBanners'))}" style="text-align:right">${row.banners}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThTotal'))}" style="text-align:right">${total.toLocaleString()}</td>
                <td class="dash-weighted-detail-col dash-weighted-conduct-col" data-label="${esc(t('edenX1ThConduct'))}" style="text-align:right">${renderConductScorePopover(row, index)}</td>
                <td class="dash-weighted-score-cell" data-label="${esc(t('edenX1ThWeightedScore'))}" style="text-align:right">${renderWeightedScorePopover(row, index)}</td>
                <td class="dash-weighted-score-cell" data-label="${esc(t('adminContributionFinalRank'))}">${renderFinalRankPopover(row, index)}</td>
                <td class="dash-weighted-score-cell" data-label="${esc(t('adminContributionFinalReward'))}">${renderFinalRewardPopover(row, index, rewardContext)}</td>
              </tr>`;
            })
            .join('')}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function renderRewardSlotTable(view) {
  const title = t(rewardViewTitleKey(view));
  const metaKey = rewardViewMetaKey(view);
  const rows = rewardSlotRows(view);
  return `<div id="ocrDashboardRoot" class="dash-weighted-contribution-panel">
    <div class="dash-card dash-weighted-contribution-card dash-contribution-weighted-card eden-x1-weighted-card eden-x1-slots-card">
      <div class="dash-card-hdr dash-card-hdr-wrap">
        <h2 class="dash-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span>${esc(title)}</span>
        </h2>
        <div class="dash-weighted-table-controls">
          <span class="dash-weighted-contribution-meta">${esc(metaKey ? t(metaKey) : t('edenX1ViewOnly'))}</span>
        </div>
      </div>
      <div class="dash-contribution-compare-table-wrap dash-weighted-contribution-table-wrap">
        <table class="dash-banner-table dash-contribution-compare-table dash-contribution-weighted-table eden-x1-slots-table">
          <thead><tr>
            <th>${esc(t('edenX1ThNumber'))}</th>
            <th>${esc(t('adminContributionMember'))}</th>
            <th>${esc(t('edenX1RewardSlotGroup'))}</th>
            <th>${esc(t('edenX1RewardSlotStatus'))}</th>
          </tr></thead>
          <tbody>${rows
            .map(
              (row) => `<tr>
                <td data-label="${esc(t('edenX1ThNumber'))}">${row.slot}</td>
                <td data-label="${esc(t('adminContributionMember'))}"><strong>${esc(row.player)}</strong></td>
                <td data-label="${esc(t('edenX1RewardSlotGroup'))}">${esc(row.group)}</td>
                <td data-label="${esc(t('edenX1RewardSlotStatus'))}">${esc(row.status)}</td>
              </tr>`
            )
            .join('')}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function renderCurrentTable() {
  const panel = $('dashWeightedContributionPanel');
  if (!panel) return;
  if (currentRewardView === 'management' || currentRewardView === 'team') {
    panel.innerHTML = renderRewardSlotTable(currentRewardView);
    updateRewardFlowControls();
    return;
  }
  if (!currentRows.length) return;

  let rows = currentRows;
  let options = {};
  if (currentRewardView === 'contribution') {
    rows = getContributionRewardRows();
    options = {
      title: t('edenX1RewardLeaderboardTitle'),
      meta: t('edenX1RewardContributionMeta'),
      numberMode: 'current',
    };
  } else if (currentRewardView === 'support') {
    rows = getSupportRewardRows();
    options = {
      title: t('edenX1RewardSupportTitle'),
      meta: t('edenX1RewardSupportMeta'),
      numberMode: 'index',
      rewardContextForRow: (_row, index, numberValue) => {
        const reward = index === 0 ? 'guild_master' : 'core';
        const label = contributionRewardLabel(reward);
        return {
          rank: numberValue,
          rankLabel: t('edenX1RewardSupportTitle'),
          baseReward: reward,
          finalReward: reward,
          reason: `${t('edenX1RewardSupportTitle')} #${numberValue}. ${t('adminContributionFinalReward')}: ${label}.`,
        };
      },
    };
  }
  panel.innerHTML = renderTable(rows, currentRecordLabel, options);
  bindWeightedContributionViewToggle(panel);
  updateRewardFlowControls();
}

async function bootShell() {
  currentLang = getLanguage();
  await loadTranslationsForLanguage(currentLang);
  initTheme();
  mountGameClock($('globalGameClock'), { compact: true, showUae: false });
  $('edenX1FooterYear')?.replaceChildren(document.createTextNode(String(new Date().getFullYear())));
  updateTextContent(currentLang);
  bindRewardFlowControls();

  $('languageSelect')?.addEventListener('change', async (e) => {
    const nextLang = e.target.value || 'en';
    localStorage.setItem('vts_hero_lang', nextLang);
    await loadTranslationsForLanguage(nextLang);
    updateTextContent(nextLang);
  });
}

async function main() {
  await bootShell();
  const panel = $('dashWeightedContributionPanel');
  const errorEl = $('edenX1Error');

  try {
    const [{ initFirebase, ensureAnonymousAuth }, { importFirestore }] = await Promise.all([
      import('./firebase.js'),
      import('./firebase-sdk.js'),
    ]);
    const { configured, db } = initFirebase();
    if (!configured || !db) {
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.textContent = t('edenX1NoFirebase');
      }
      if (panel) panel.innerHTML = '';
      return;
    }

    await ensureAnonymousAuth();

    const { doc, getDoc } = await importFirestore();
    const snap = await getDoc(doc(db, FS_PATH));

    if (!snap.exists()) {
      if (panel) panel.innerHTML = `<div class="dash-empty">${esc(t('edenX1NoData'))}</div>`;
      return;
    }

    applyDashboardData(snap.data());
  } catch (err) {
    console.error('Eden X1 view failed:', err);
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.textContent = t('edenX1LoadFailed', {
        error: err?.message || err || 'Unknown error',
      });
    }
    if (panel) panel.innerHTML = '';
  }
}

function applyDashboardData(data = {}) {
  const contributionRecords = Array.isArray(data.contributionRecords)
    ? data.contributionRecords
    : [];
  const dutyRecords = Array.isArray(data.dutyRecords) ? data.dutyRecords : [];
  const exGuildContributions = Array.isArray(data.exGuildContributions)
    ? data.exGuildContributions
    : [];
  const season = data.r5Season || '';
  const r5Adjustments = Array.isArray(data.publicConductAdjustments)
    ? data.publicConductAdjustments
    : [];

  const model = buildWeightedContributionRows({
    contributionRecords,
    dutyRecords,
    r5Adjustments,
    exGuildContributions,
    season,
  });

  const panel = $('dashWeightedContributionPanel');
  if (!model.rows || !model.rows.length) {
    if (panel) panel.innerHTML = `<div class="dash-empty">${esc(t('edenX1NoRows'))}</div>`;
    return;
  }

  const dateStr = data.date || data.updatedAt || '';
  currentRows = model.rows;
  currentRecordLabel = dateStr
    ? `Eden X1 - ${String(dateStr).split('T')[0] || dateStr}`
    : t('edenX1PageTitle');
  renderCurrentTable();
}

window.setEdenX1DataForTest = function setEdenX1DataForTest(data) {
  applyDashboardData(data);
};

if (EDEN_X1_TEST_MODE) {
  bootShell().catch((err) => console.error('Eden X1 test shell failed:', err));
} else {
  main();
}
