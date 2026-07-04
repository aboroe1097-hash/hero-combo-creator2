import { initFirebase, ensureAnonymousAuth } from './firebase.js';
import { importFirestore } from './firebase-sdk.js';
import { buildWeightedContributionRows } from './contribution-weighting.js';
import { translations, loadTranslationsForLanguage } from './translations.js';
import { mountGameClock, syncGameClockTitles } from './game-time.js';

const APP_VERSION = '12.2.1';
const FS_PATH = 'vts_admin/dashboard_data';
const R5_COLLECTION_PATH = 'vts_admin/conduct_adjustments/records';
const THEME_STORAGE_KEY = 'vts_theme';
const WEIGHTED_CONTRIBUTION_COMPACT_KEY = 'vts_weighted_contribution_compact';

let currentLang = 'en';
let currentRows = [];
let currentRecordLabel = '';

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

function renderWeightedScorePopover(row, index) {
  const tooltipId = `edenX1WeightedScoreTip-${index}`;
  const dutyCount = row.banners + row.pathers + row.shieldWalls;
  const dutyNote = t('edenX1DutyFormula', {
    banners: row.banners,
    pathers: row.pathers,
    shieldWalls: row.shieldWalls,
    count: dutyCount,
  });
  const conductNote = t('edenX1ConductFormula', {
    conduct: formatSignedNumber(row.conductBonus),
  });
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

function renderFinalRewardPopover(row, index) {
  const tooltipId = `edenX1FinalRewardTip-${index}`;
  const baseReward = contributionRewardLabel(row.baseReward);
  const finalReward = contributionRewardLabel(row.finalReward);
  const reason =
    row.rewardReason === 'grant_premium'
      ? t('edenX1RewardReasonGrant', { rank: row.finalRank })
      : row.rewardReason === 'forfeit_premium'
        ? t('edenX1RewardReasonForfeit', { rank: row.finalRank })
        : t('edenX1RewardReasonRank', { rank: row.finalRank, reward: baseReward });
  return `<button class="dash-weighted-reward-trigger eden-x1-popover-trigger" type="button" aria-describedby="${tooltipId}" aria-label="${esc(t('edenX1RewardReasonAria', { player: row.playerName, reward: finalReward }))}">
    <span class="dash-weighted-reward-value">${esc(finalReward)}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover" role="tooltip">
      <strong>${esc(t('edenX1RewardReasonTitle'))}</strong>
      <span><span>${esc(t('adminContributionFinalRank'))}</span><b>#${row.finalRank}</b></span>
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

async function loadR5Adjustments(db) {
  try {
    const { collection, getDocs } = await importFirestore();
    const snapshot = await getDocs(collection(db, R5_COLLECTION_PATH));
    const adjustments = [];
    snapshot.forEach((doc) => {
      adjustments.push(doc.data());
    });
    return adjustments.filter(Boolean);
  } catch {
    return [];
  }
}

function renderTable(rows, recordLabel) {
  const compactView = isWeightedContributionCompactView();
  return `<div id="ocrDashboardRoot" class="dash-weighted-contribution-panel">
    <div class="dash-card dash-weighted-contribution-card dash-contribution-weighted-card eden-x1-weighted-card ${compactView ? 'dash-weighted-compact' : ''}">
      <div class="dash-card-hdr dash-card-hdr-wrap">
        <h2 class="dash-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span>${esc(t('edenX1WeightedTitle'))}</span>
        </h2>
        <div class="dash-weighted-table-controls">
          <span class="dash-weighted-contribution-meta">${esc(recordLabel || t('edenX1PageTitle'))} &middot; ${esc(t('edenX1ViewOnly'))}</span>
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
            <th class="dash-weighted-detail-col" style="text-align:right">${esc(t('edenX1ThConduct'))}</th>
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
              return `<tr>
                <td data-label="${esc(t('edenX1ThNumber'))}">${row.finalRank}</td>
                <td data-label="${esc(t('adminContributionMember'))}"><strong>${esc(row.playerName)}</strong></td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('adminContributionRank'))}">${row.currentRank ? `#${esc(row.currentRank)}` : '--'}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('adminContributionReward'))}">${esc(contributionRewardLabel(row.currentReward))}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThContribution'))}" style="text-align:right">${formatScore(row.contributionScore)}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThShieldWalls'))}" style="text-align:right">${row.shieldWalls}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThPathers'))}" style="text-align:right">${row.pathers}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThBanners'))}" style="text-align:right">${row.banners}</td>
                <td class="dash-weighted-detail-col" data-label="${esc(t('edenX1ThTotal'))}" style="text-align:right">${total.toLocaleString()}</td>
                <td class="dash-weighted-detail-col ${row.conductBonus >= 0 ? 'dash-positive' : 'dash-negative'}" data-label="${esc(t('edenX1ThConduct'))}" style="text-align:right">${formatSignedNumber(row.conductBonus)}</td>
                <td class="dash-weighted-score-cell" data-label="${esc(t('edenX1ThWeightedScore'))}" style="text-align:right">${renderWeightedScorePopover(row, index)}</td>
                <td class="dash-weighted-score-cell" data-label="${esc(t('adminContributionFinalRank'))}">${renderFinalRankPopover(row, index)}</td>
                <td class="dash-weighted-score-cell" data-label="${esc(t('adminContributionFinalReward'))}">${renderFinalRewardPopover(row, index)}</td>
              </tr>`;
            })
            .join('')}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function renderCurrentTable() {
  const panel = $('dashWeightedContributionPanel');
  if (!panel || !currentRows.length) return;
  panel.innerHTML = renderTable(currentRows, currentRecordLabel);
  bindWeightedContributionViewToggle(panel);
}

async function bootShell() {
  currentLang = getLanguage();
  await loadTranslationsForLanguage(currentLang);
  initTheme();
  mountGameClock($('globalGameClock'), { compact: true, showUae: false });
  $('edenX1FooterYear')?.replaceChildren(document.createTextNode(String(new Date().getFullYear())));
  updateTextContent(currentLang);

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

    const data = snap.data();
    const contributionRecords = Array.isArray(data.contributionRecords)
      ? data.contributionRecords
      : [];
    const dutyRecords = Array.isArray(data.dutyRecords) ? data.dutyRecords : [];
    const exGuildContributions = Array.isArray(data.exGuildContributions)
      ? data.exGuildContributions
      : [];
    const r5Adjustments = await loadR5Adjustments(db);
    const season = data.r5Season || '';

    const model = buildWeightedContributionRows({
      contributionRecords,
      dutyRecords,
      r5Adjustments,
      exGuildContributions,
      season,
    });

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

main();
