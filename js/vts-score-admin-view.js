// js/vts-score-admin-view.js
//
// The VtsScore admin leader board, as its own admin tab.
//
// It renders three things from one snapshot: the per-player standings with a
// collapsible breakdown of every power category, the category leaders per
// Dragon tier (ranked by raw growth and by percentage growth side by side,
// because absolute growth favours the biggest accounts and percentage growth
// the smallest), and a PNG export of the combined board.
//
// The model lives in vts-score-admin.js and the reads in vts-score-store.js;
// this module only turns one into the other.

import {
  VTS_SCORE_ALL_TIERS,
  VTS_SCORE_COMPARISON_FIELDS,
  VTS_SCORE_TIERS,
  buildAdminVtsScoreRows,
  buildVtsScoreTierSummary,
  drawVtsScoreLeaderCanvas,
  readVtsScoreExemptions,
  vtsScoreExemptKey,
  writeVtsScoreExemptions,
} from './vts-score-admin.js';
import {
  COMPETITION_GROWTH_FIELDS,
  buildCompetitionGrowthRows,
  rankCompetitionGrowth,
} from './competition-growth.js';
import { buildVtsScoreAudit, downloadVtsScoreAudit } from './vts-score-audit.js';
import { normalizeVtsScoreSettings } from './vts-score-settings.js';
import { saveVtsScoreSettings } from './vts-score-store.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cleanText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim();
}

function summaryCard(value, label, tone = 'neutral') {
  return `<article class="vts-admin-summary-card" data-tone="${tone}">
    <strong>${esc(value)}</strong><span>${esc(label)}</span>
  </article>`;
}

function growthTone(value) {
  return value === null ? 'missing' : value >= 0 ? 'positive' : 'negative';
}

function renderAuditSummary(audit) {
  return `<details class="vts-admin-card"><summary>Data cross-check: ${audit.counts.signups} signups · ${audit.counts.finalUploads} final uploads · ${audit.counts.issues} items to review</summary><p>Exports include every loaded record and its source path, including invalid and unmatched records. Private export: keep it with authorized leadership.</p><ul>${
    audit.reconciliation
      .slice(0, 100)
      .map(
        (issue) =>
          `<li><strong>${esc(issue.code)}</strong> ${esc(issue.documentId)} — ${esc(issue.detail)}</li>`
      )
      .join('') ||
    '<li>No structural issues found. Review comparisons before awarding results.</li>'
  }</ul>${audit.counts.issues > 100 ? '<p>First 100 shown. Download JSON or CSV for every issue.</p>' : ''}</details>`;
}

// Competition #12 copy reuses existing admin keys wherever one fits, and its
// own keys use the short `c12` prefix, because every key ships in twelve
// language packs against the total JS size budget.
const NOT_RANKED_KEYS = Object.freeze({
  'no-reupload': 'c12NoUpload',
  'invalid-reupload': 'adminVtsScoreLegacy',
  'outside-window': 'c12OutsideWindow',
  'no-baseline': 'c12NotRanked',
});

/**
 * The two-player comparison: pick any two sign-ups and read every category
 * side by side, with the higher current value marked. Pure, so the admin view
 * and its tests share the exact markup.
 */
export function buildCompetitionComparisonHtml(rows, options = {}) {
  const t = options.t || ((key) => key);
  const label = options.label || ((field) => field);
  const num = typeof options.num === 'function' ? options.num : (value) => String(value);
  const signed = typeof options.signed === 'function' ? options.signed : (value) => String(value);
  const list = Array.isArray(rows) ? rows : [];
  // Key on the account id: two different players can share a game name, and a
  // name-keyed picker would silently compare the same row with itself.
  const keyOf = (row) => String(row?.submissionUid || row?.gameName || '');
  const left = list.find((row) => keyOf(row) === options.left) || null;
  const right = list.find((row) => keyOf(row) === options.right) || null;
  const value = (number) => (Number.isFinite(number) ? num(number) : '—');
  const change = (number) => (number === null || number === undefined ? '—' : signed(number));
  const leads = (number, other) => number !== null && other !== null && number > other;
  const pick = (labelKey, side, selected) => `
    <label class="vts-admin-compare__pick">
      <span>${esc(t(labelKey))}</span>
      <select class="dash-input" data-compare="${side}">
        <option value="">—</option>
        ${list
          .map(
            (row) =>
              `<option value="${esc(keyOf(row))}"${keyOf(row) === selected ? ' selected' : ''}>${esc(row.gameName)}</option>`
          )
          .join('')}
      </select>
    </label>`;
  const body =
    left && right
      ? `<div class="vts-admin-table-wrap"><table class="vts-admin-table vts-admin-compare__table">
          <thead>
            <tr>
              <th scope="col" rowspan="2">${esc(t('adminVtsScoreCategory'))}</th>
              <th scope="colgroup" colspan="3">${esc(left.gameName)}</th>
              <th scope="colgroup" colspan="3">${esc(right.gameName)}</th>
            </tr>
            <tr>
              <th scope="col">${esc(t('adminVtsScoreBaselineShort'))}</th>
              <th scope="col">${esc(t('adminVtsScoreFinalShort'))}</th>
              <th scope="col">${esc(t('adminVtsScoreChange'))}</th>
              <th scope="col">${esc(t('adminVtsScoreBaselineShort'))}</th>
              <th scope="col">${esc(t('adminVtsScoreFinalShort'))}</th>
              <th scope="col">${esc(t('adminVtsScoreChange'))}</th>
            </tr>
          </thead>
          <tbody>${COMPETITION_GROWTH_FIELDS.map((field) => {
            const leftEntry = left.fields?.[field] || {};
            const rightEntry = right.fields?.[field] || {};
            const leftFinal = Number.isFinite(leftEntry.final) ? leftEntry.final : null;
            const rightFinal = Number.isFinite(rightEntry.final) ? rightEntry.final : null;
            return `<tr>
              <th scope="row">${esc(label(field))}</th>
              <td>${esc(value(leftEntry.baseline))}</td>
              <td${leads(leftFinal, rightFinal) ? ' data-leads="true"' : ''}>${esc(value(leftFinal))}</td>
              <td data-growth="${growthTone(leftEntry.abs ?? null)}">${esc(change(leftEntry.abs ?? null))}</td>
              <td>${esc(value(rightEntry.baseline))}</td>
              <td${leads(rightFinal, leftFinal) ? ' data-leads="true"' : ''}>${esc(value(rightFinal))}</td>
              <td data-growth="${growthTone(rightEntry.abs ?? null)}">${esc(change(rightEntry.abs ?? null))}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`
      : `<p class="vts-admin-muted">${esc(t('c12CompareHint'))}</p>`;
  return `<h4 class="vts-admin-compare__title">${esc(t('c12CompareTitle'))}</h4>
    <div class="vts-admin-compare__picks">${pick('c12CompareLeft', 'left', options.left)}<span class="vts-admin-compare__vs">vs</span>${pick('c12CompareRight', 'right', options.right)}</div>
    ${body}`;
}

/**
 * Competition #12 read-only 2026 growth preview. The live public board is
 * generated by the vtsScore function from all earlier seasons.
 */
export function createCompetitionGrowthSection(options = {}) {
  const t = options.t || ((key) => key);
  const label = options.label || ((field) => field);
  const { num, signed } = options;
  const state = {
    snapshot: null,
    loading: false,
    failed: false,
    compareLeft: '',
    compareRight: '',
  };
  let host = null;

  const rowsFor = () =>
    buildCompetitionGrowthRows({
      ...state.snapshot,
      window: state.snapshot?.schedule,
      autoMatch: true,
      seasonId: state.snapshot?.season || '',
    });

  // Every upload this name ever had, newest first: the owner's window into
  // previous members' values and what each sign-up maps to.
  function historyDetails(row) {
    const uploads = Array.isArray(row.uploads) ? row.uploads : [];
    if (!uploads.length) return '';
    const items = uploads
      .map((upload) => {
        const when =
          upload.uploadedAt > 0
            ? new Date(upload.uploadedAt).toISOString().slice(0, 10)
            : upload.seasonId || '—';
        const values = Object.entries(upload.values || {})
          .map(
            ([field, value]) =>
              `<span class="vts-admin-muted">${esc(label(field))} ${esc(num(value))}</span>`
          )
          .join(' ');
        return `<li><strong>${esc(when)}</strong> ${values}</li>`;
      })
      .join('');
    return `<details class="vts-admin-history"><summary>${esc(
      t('c12SourceVtsScorePrior')
    )}</summary><ul>${items}</ul></details>`;
  }

  function matchCell(row) {
    const match = row.match;
    return esc(
      match.automatic
        ? match.candidate?.gameName || '—'
        : match.status === 'ambiguous'
          ? t('c12Ambiguous')
          : '—'
    );
  }

  function comparisonPanel(rows) {
    return buildCompetitionComparisonHtml(rows, {
      left: state.compareLeft,
      right: state.compareRight,
      t,
      label,
      num,
      signed,
    });
  }

  function tableRow(row) {
    const total = row.fields.totalCastlePower;
    const reason = NOT_RANKED_KEYS[row.notRankedReason];
    const pct = row.growthPct === null ? '—' : `${signed(row.growthPct, 2)}%`;
    // A legacy baseline has no dead-troop split, so this row compares
    // alive-to-alive and its Final column shows the comparable value.
    const aliveMarker = row.baselineAliveOnly
      ? `<br><span class="vts-admin-muted">${esc(t('c12AliveOnly'))}</span>`
      : '';
    // The signup's dead-troop values drive every comparison: flag the rows
    // whose owner never entered them so leadership can chase the numbers.
    const deadMarker = row.deadValuesMissing
      ? `<br><span class="vts-admin-warn">${esc(t('adminBohSignupDeadMissing'))}</span>`
      : '';
    return `<tr><td>${row.rank ? `${row.rank}${row.tied ? '=' : ''}` : '—'}</td><th scope="row"><strong>${esc(row.gameName)}</strong>${deadMarker}${reason ? `<br><span class="vts-admin-muted">${esc(t(reason))}</span>` : ''}${historyDetails(row)}</th><td><span class="vts-admin-chip">${esc(
      row.baselineSource === 'vtsscore-2026'
        ? t('c12SourceVtsScore')
        : row.baselineSource === 'vtsscore-prior'
          ? t('c12SourceVtsScorePrior')
          : row.baselineSource
            ? t('adminVtsScoreBaselineShort')
            : '—'
    )}</span>${aliveMarker}</td><td>${matchCell(row)}</td><td>${esc(total.baseline === null ? '—' : num(total.baseline))}</td><td>${esc(total.final === null ? '—' : num(total.final))}</td><td data-growth="${growthTone(row.growthAbs)}">${esc(signed(row.growthAbs))}</td><td data-growth="${growthTone(row.growthPct)}">${esc(pct)}</td><td>${esc(t(row.consent ? 'adminYes' : 'adminNo'))}</td></tr>`;
  }

  function paint() {
    if (!host) return;
    let body;
    if (!state.snapshot) {
      body = `<div class="dash-empty"${state.failed ? ' role="alert"' : ''}>${esc(
        t(state.failed ? 'adminVtsScoreUnavailable' : 'adminLoading')
      )}</div>`;
    } else {
      const { ranked, notRanked } = rankCompetitionGrowth(rowsFor());
      const all = [...ranked, ...notRanked];
      const pending = all.filter((row) => row.match.status === 'ambiguous').length;
      const heads = [
        'adminThRank',
        'adminVtsScorePlayer',
        'adminContributionBaseline',
        'c12Match',
        'c12BaselineTotal',
        'adminVtsScoreFinal',
        'adminVtsScoreGrowth',
        'adminVtsScoreGrowthPercent',
        'c12Public',
      ]
        .map((key) => `<th scope="col">${esc(t(key))}</th>`)
        .join('');
      body = `<div class="vts-admin-summary-grid">${summaryCard(notRanked.length, t('c12NotRanked'), notRanked.length ? 'warning' : 'positive')}
          ${summaryCard(pending, t('c12ToReview'), pending ? 'warning' : 'positive')}</div><div class="vts-admin-table-wrap"><table class="vts-admin-table"><thead><tr>${heads}</tr></thead><tbody>${all.map(tableRow).join('') || `<tr><td colspan="9">${esc(t('adminVtsScoreEmpty'))}</td></tr>`}</tbody></table></div><div class="vts-admin-compare">${comparisonPanel(all)}</div>`;
    }
    host.innerHTML = `<div class="vts-admin-card-heading"><div><h3>${esc(t('c12Title'))}</h3><p>${esc(t('c12Hint'))}</p></div><div class="vts-admin-chip-row"><button type="button" class="dash-btn" data-comp12-reload>${esc(t('adminVtsScoreRefresh'))}</button>${state.snapshot ? '<button type="button" class="dash-btn" data-comp12-export="json">Export competition JSON</button><button type="button" class="dash-btn" data-comp12-export="csv">Export competition CSV</button>' : ''}</div></div>${state.snapshot ? renderAuditSummary(buildVtsScoreAudit(state.snapshot, { includeCompetition: true })) : ''}${body}`;
    bind();
  }

  function bind() {
    const on = (selector, handler) =>
      host.querySelectorAll(selector).forEach((element) => {
        element.addEventListener('click', () => handler(element.dataset));
      });
    on('[data-comp12-reload]', () => void load());
    on('[data-comp12-export]', (dataset) =>
      downloadVtsScoreAudit(state.snapshot, dataset.comp12Export, { includeCompetition: true })
    );
    host.querySelectorAll('[data-compare]').forEach((select) => {
      select.addEventListener('change', () => {
        if (select.dataset.compare === 'left') state.compareLeft = select.value;
        else state.compareRight = select.value;
        paint();
        // Choosing the first player moves focus to the second so both picks
        // happen in one pass. The panel repainted, so re-find the element.
        if (select.dataset.compare === 'left') {
          host.querySelector('[data-compare="right"]')?.focus();
        }
      });
    });
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    state.failed = false;
    state.snapshot = null;
    paint();
    try {
      state.snapshot = await options.load();
    } catch {
      state.failed = true;
    }
    state.loading = false;
    paint();
  }

  function mount(element, { reload = false } = {}) {
    host = element;
    if (!host) return;
    if (reload || (!state.snapshot && !state.loading && !state.failed)) void load();
    else paint();
  }

  return { mount };
}

export function createVtsScoreAdminView(options = {}) {
  const t = typeof options.t === 'function' ? options.t : (key, vars, fallback) => fallback || key;
  const locale = () => (typeof options.locale === 'function' ? options.locale() : 'en');
  const setStatus = typeof options.setStatus === 'function' ? options.setStatus : () => {};
  const growthSection = options.growth
    ? createCompetitionGrowthSection({
        ...options.growth,
        t,
        setStatus,
        num: (value, decimals) => num(value, decimals),
        signed: (value, decimals) => signed(value, decimals),
        label: categoryLabel,
      })
    : null;
  let lastSnapshot = null;
  let effectiveSettings = normalizeVtsScoreSettings();

  function num(value, decimals = 0) {
    if (!Number.isFinite(Number(value))) return '—';
    return new Intl.NumberFormat(locale(), {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Number(value));
  }

  function signed(value, decimals = 0) {
    if (value === null || !Number.isFinite(Number(value))) return '—';
    return `${Number(value) > 0 ? '+' : ''}${num(value, decimals)}`;
  }

  function date(value) {
    const raw = typeof value?.toDate === 'function' ? value.toDate() : value;
    const parsed = raw instanceof Date ? raw : new Date(raw ?? '');
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' });
  }

  function categoryLabel(field) {
    const config = VTS_SCORE_COMPARISON_FIELDS.find(([key]) => key === field);
    return t(config?.[1] || '', {}, config?.[2] || field);
  }

  function renderBreakdown(row) {
    const rows = row.comparisons
      .map(
        (comparison) => `<tr>
        <th scope="row">${esc(categoryLabel(comparison.field))}</th>
        <td>${esc(comparison.baseline === null ? '—' : num(comparison.baseline))}</td>
        <td>${esc(comparison.final === null ? '—' : num(comparison.final))}</td>
        <td data-growth="${growthTone(comparison.growth)}">${esc(signed(comparison.growth))}</td>
        <td data-growth="${growthTone(comparison.growthPercent)}">${esc(
          comparison.growthPercent === null ? '—' : `${signed(comparison.growthPercent, 2)}%`
        )}</td>
      </tr>`
      )
      .join('');
    return `<details class="vts-admin-breakdown">
      <summary>${esc(t('adminVtsScoreBreakdown', {}, 'All power changes'))}</summary>
      <div class="vts-admin-table-wrap">
        <table class="vts-admin-table">
          <thead><tr>
            <th scope="col">${esc(t('adminVtsScoreCategory', {}, 'Category'))}</th>
            <th scope="col">${esc(t('adminVtsScoreBaselineShort', {}, 'Sign-up'))}</th>
            <th scope="col">${esc(t('adminVtsScoreFinalShort', {}, 'Final'))}</th>
            <th scope="col">${esc(t('adminVtsScoreChange', {}, 'Change'))}</th>
            <th scope="col">${esc(t('adminVtsScoreChangePercent', {}, 'Change %'))}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>`;
  }

  function ocrStatusLabel(row) {
    if (row.legacyUpload) return t('adminVtsScoreLegacy', {}, 'Legacy upload - re-upload required');
    if (!row.submitted) return t('adminVtsScoreAwaiting', {}, 'Awaiting upload');
    if (row.ocrCorrected) return t('adminVtsScoreCorrected', {}, 'OCR corrected');
    if (row.ocrConfidence === null) return t('adminVtsScoreReviewed', {}, 'Reviewed');
    return t(
      'adminVtsScoreConfidence',
      { confidence: Math.round(row.ocrConfidence * 100) },
      '{confidence}% OCR'
    );
  }

  function renderStandings(rows) {
    const body = rows
      .map(
        (
          row
        ) => `<tr data-vts-score-status="${row.submitted ? 'submitted' : row.legacyUpload ? 'incomplete' : 'missing'}">
        <th scope="row"><strong>${esc(row.gameName)}</strong>${renderBreakdown(row)}</th>
        <td><span class="vts-admin-chip">${esc(t('adminVtsScoreTierChip', { tier: row.tier }, 'Tier {tier}'))}</span></td>
        <td>${esc(num(row.baselineTotalPower))}</td>
        <td>${esc(row.finalTotalPower === null ? '—' : num(row.finalTotalPower))}</td>
        <td data-growth="${growthTone(row.growth)}">${esc(signed(row.growth))}</td>
        <td data-growth="${growthTone(row.growthPercent)}">${esc(
          row.growthPercent === null ? '—' : `${signed(row.growthPercent, 2)}%`
        )}</td>
        <td>${esc(ocrStatusLabel(row))}</td>
        <td>${row.submitted ? esc(date(row.submittedAt)) : '—'}</td>
      </tr>`
      )
      .join('');
    return `<section class="vts-admin-card">
      <div class="vts-admin-card-heading">
        <div>
          <h3>${esc(t('adminVtsScoreTable', {}, 'Competition standings'))}</h3>
          <p>${esc(t('adminVtsScoreSortHint', {}, 'Grouped by the original Dragon tier, then sorted by Total Power growth.'))}</p>
        </div>
      </div>
      <div class="vts-admin-table-wrap">
        <table class="vts-admin-table">
          <thead><tr>
            <th scope="col">${esc(t('adminVtsScorePlayer', {}, 'Player'))}</th>
            <th scope="col">${esc(t('adminVtsScoreTier', {}, 'Tier'))}</th>
            <th scope="col">${esc(t('adminVtsScoreBaseline', {}, 'Sign-up Total Power'))}</th>
            <th scope="col">${esc(t('adminVtsScoreFinal', {}, 'Final Total Power'))}</th>
            <th scope="col">${esc(t('adminVtsScoreGrowth', {}, 'Growth'))}</th>
            <th scope="col">${esc(t('adminVtsScoreGrowthPercent', {}, 'Growth %'))}</th>
            <th scope="col">${esc(t('adminVtsScoreOcr', {}, 'OCR review'))}</th>
            <th scope="col">${esc(t('adminVtsScoreUpdated', {}, 'Submitted'))}</th>
          </tr></thead>
          <tbody>${body || `<tr><td colspan="8">${esc(t('adminVtsScoreEmpty', {}, 'No submitted VtsScore signups yet.'))}</td></tr>`}</tbody>
        </table>
      </div>
    </section>`;
  }

  function tierHeading(tier) {
    if (tier === VTS_SCORE_ALL_TIERS) return t('adminVtsScoreAllTiers', {}, 'Both tiers combined');
    return `Tier ${tier} — Dragon ${tier === 1 ? '≥' : '<'} ${num(effectiveSettings.dragonTierCutoff)}`;
  }

  function renderTierSection(rows, tier, exemptions) {
    const summary = buildVtsScoreTierSummary(rows, tier, exemptions);
    if (!summary.players) return '';
    const categoryRows = summary.categories
      .map(
        (entry) => `<tr>
        <th scope="row">${esc(t(entry.i18nKey, {}, entry.label))}</th>
        <td><strong>${esc(entry.growthPlayer || '—')}</strong></td>
        <td data-growth="${growthTone(entry.growth)}">${esc(signed(entry.growth))}</td>
        <td><strong>${esc(entry.percentPlayer || '—')}</strong></td>
        <td data-growth="${growthTone(entry.growthPercent)}">${esc(
          entry.growthPercent === null ? '—' : `${signed(entry.growthPercent, 2)}%`
        )}</td>
      </tr>`
      )
      .join('');
    return `<section class="vts-admin-card" data-vts-score-tier="${esc(tier)}">
      <div class="vts-admin-card-heading">
        <div>
          <h3>${esc(tierHeading(tier))}</h3>
          <p>${esc(t('adminVtsScoreTierHint', {}, 'Category leaders by raw growth and by percentage growth, plus the tier total.'))}</p>
        </div>
      </div>
      <div class="vts-admin-summary-grid">
        ${summaryCard(`${summary.submitted}/${summary.players}`, t('adminVtsScoreTierUploads', {}, 'Uploads in'), summary.missing ? 'warning' : 'positive')}
        ${summaryCard(num(summary.finalTotalPower), t('adminVtsScoreTierTotalPower', {}, 'Combined final Total Power'))}
        ${summaryCard(signed(summary.growth), t('adminVtsScoreTierTotalGrowth', {}, 'Combined growth'), summary.growth >= 0 ? 'positive' : 'warning')}
        ${summaryCard(
          summary.growthPercent === null ? '—' : `${signed(summary.growthPercent, 2)}%`,
          t('adminVtsScoreTierTotalGrowthPercent', {}, 'Tier growth %')
        )}
      </div>
      <div class="vts-admin-table-wrap">
        <table class="vts-admin-table">
          <thead><tr>
            <th scope="col">${esc(t('adminVtsScoreCategory', {}, 'Category'))}</th>
            <th scope="col">${esc(t('adminVtsScoreTopGrowthPlayer', {}, 'Top growth'))}</th>
            <th scope="col">${esc(t('adminVtsScoreGrowth', {}, 'Growth'))}</th>
            <th scope="col">${esc(t('adminVtsScoreTopPercentPlayer', {}, 'Top growth %'))}</th>
            <th scope="col">${esc(t('adminVtsScoreGrowthPercent', {}, 'Growth %'))}</th>
          </tr></thead>
          <tbody>${categoryRows}</tbody>
        </table>
      </div>
    </section>`;
  }

  function renderExemptions(exemptions) {
    const chips = exemptions.length
      ? exemptions
          .map(
            (name) => `<span class="vts-admin-chip vts-admin-exempt-chip">${esc(name)}
        <button type="button" data-vts-exempt-remove="${esc(name)}" aria-label="${esc(
          t('adminVtsScoreExemptRemove', { name }, 'Remove {name} from the exempt list')
        )}">&times;</button></span>`
          )
          .join('')
      : `<span class="vts-admin-muted">${esc(t('adminVtsScoreExemptNone', {}, 'Nobody is exempt.'))}</span>`;
    return `<section class="vts-admin-card">
      <div class="vts-admin-card-heading">
        <div>
          <h3>${esc(t('adminVtsScoreExemptTitle', {}, 'Exempt from the leader boards'))}</h3>
          <p>${esc(t('adminVtsScoreExemptHint', {}, 'Exempt players still appear in the standings; they are left out of the category leaders.'))}</p>
        </div>
      </div>
      <div class="vts-admin-chip-row">${chips}</div>
      <div class="vts-admin-exempt-form">
        <label for="dashVtsScoreExemptInput">${esc(t('adminVtsScoreExemptName', {}, 'Player name'))}</label>
        <input id="dashVtsScoreExemptInput" class="dash-input" type="text" autocomplete="off" list="dashVtsScoreExemptOptions">
        <button type="button" class="dash-btn" data-vts-exempt-add>${esc(t('adminVtsScoreExemptAdd', {}, 'Exempt'))}</button>
      </div>
    </section>`;
  }

  function render(root, snapshot) {
    if (!root) return;
    effectiveSettings = normalizeVtsScoreSettings(snapshot?.settings);
    const rows = buildAdminVtsScoreRows(
      snapshot?.submissions,
      snapshot?.raceScores,
      effectiveSettings
    );
    const audit = buildVtsScoreAudit(snapshot);
    const exemptions = readVtsScoreExemptions();
    const submitted = rows.filter((row) => row.submitted).length;
    const tierOne = rows.filter((row) => row.tier === 1).length;
    const nameOptions = rows
      .map((row) => cleanText(row?.gameName))
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))
      .map((name) => `<option value="${esc(name)}"></option>`)
      .join('');
    const tierSections = [...VTS_SCORE_TIERS, VTS_SCORE_ALL_TIERS]
      .map((tier) => renderTierSection(rows, tier, exemptions))
      .filter(Boolean)
      .join('');

    root.innerHTML = `<section class="vts-admin-card"><h3>Review and export</h3><p>Season ${esc(snapshot?.season || '—')}. JSON preserves all stored fields; CSV includes every signup, upload, team result and reconciliation item.</p><div class="vts-admin-chip-row"><button type="button" class="dash-btn" data-vts-audit-export="json">Download full JSON</button><button type="button" class="dash-btn" data-vts-audit-export="csv">Download full CSV</button></div><form data-vts-cutoff-form><label>Tier 1 Dragon power cutoff <input class="dash-input" name="dragonTierCutoff" type="number" min="0" max="1000000000000" step="1" required value="${effectiveSettings.dragonTierCutoff}"></label><label>Absolute growth review threshold <input class="dash-input" name="growthWarningAbsolute" type="number" min="0" max="1000000000000" step="1" required value="${effectiveSettings.growthWarningAbsolute}"></label><label>Growth percentage review threshold <input class="dash-input" name="growthWarningPercent" type="number" min="0" max="1000000000" step="1" required value="${effectiveSettings.growthWarningPercent}"></label><button class="dash-btn" type="submit">Save shared settings</button><p>Uses signup Dragon power. Tier 1 includes the cutoff. Changing it updates all Admin tier summaries and images; competition growth formulas are unchanged.</p></form></section>${renderAuditSummary(audit)}<div class="vts-admin-summary-grid">
        ${summaryCard(submitted, t('adminVtsScoreSubmitted', {}, 'Final uploads'), 'positive')}
        ${summaryCard(rows.length - submitted, t('adminVtsScoreMissing', {}, 'Still missing'), rows.length - submitted ? 'warning' : 'positive')}
        ${summaryCard(tierOne, tierHeading(1))}
        ${summaryCard(rows.length - tierOne, tierHeading(2))}
      </div>
      ${renderStandings(rows)}
      ${
        tierSections
          ? `<div class="vts-admin-card-heading vts-admin-leaders-heading">
              <div>
                <h3>${esc(t('adminVtsScoreBestTitle', {}, 'Best growth per category'))}</h3>
                <p>${esc(t('adminVtsScoreBestHint', {}, 'Category leaders per Dragon tier and across both tiers, ranked by raw growth and by percentage growth side by side.'))}</p>
              </div>
              <div class="vts-admin-chip-row"><label>Image tier <select class="dash-input" data-vts-image-tier><option value="all">Both tiers</option><option value="1">${esc(tierHeading(1))}</option><option value="2">${esc(tierHeading(2))}</option></select></label><label>Image category <select class="dash-input" data-vts-image-category><option value="all">All categories</option>${VTS_SCORE_COMPARISON_FIELDS.map(([field]) => `<option value="${field}">${esc(categoryLabel(field))}</option>`).join('')}</select></label><button type="button" class="dash-btn dash-btn-primary" data-vts-export>${esc(t('adminVtsScoreExportPng', {}, 'Export PNG'))}</button><button type="button" class="dash-btn" data-vts-share>Share image</button></div>
            </div>
            <datalist id="dashVtsScoreExemptOptions">${nameOptions}</datalist>
            ${renderExemptions(exemptions)}
            ${tierSections}`
          : ''
      }
      ${growthSection ? '<section class="vts-admin-card" data-comp12-growth></section>' : ''}`;

    bind(root, rows, snapshot);
    if (growthSection) {
      // A new snapshot (the tab's Refresh) reloads the growth data too.
      growthSection.mount(root.querySelector('[data-comp12-growth]'), {
        reload: Boolean(lastSnapshot) && lastSnapshot !== snapshot,
      });
    }
    lastSnapshot = snapshot;
  }

  async function exportLeaderPng(rows, root, snapshot, share = false) {
    const chosenTier = root.querySelector('[data-vts-image-tier]')?.value || 'all';
    const tier = chosenTier === 'all' ? VTS_SCORE_ALL_TIERS : Number(chosenTier);
    const summary = buildVtsScoreTierSummary(rows, tier, readVtsScoreExemptions());
    const category = root.querySelector('[data-vts-image-category]')?.value || 'all';
    if (category !== 'all')
      summary.categories = summary.categories.filter((entry) => entry.field === category);
    if (!summary.submitted) {
      setStatus(t('adminVtsScoreExportEmpty', {}, 'No uploads to export yet.'), 'warn');
      return;
    }
    const canvas = document.createElement('canvas');
    const iconPaths = {
      totalCastlePower: 'assets/eden-reference/icons/user-town-marker.webp',
      buildingPower: 'assets/eden-reference/icons/st1.png',
      troopPower: 'assets/dm/equipment/dragon-master/weapon.png',
      dragonPower: 'assets/dm/resources/dragonite.png',
      artifactPower: 'assets/artifact/sword/Artifacts_icon_jian.png',
      heroCombatPower: 'assets/skins/king-arthur-arthur-pendragon-icon.webp',
      unitSpecialtyPower: 'images/throne/royal-guard.webp',
    };
    const icons = {};
    await Promise.all(
      Object.entries(iconPaths).map(async ([field, path]) => {
        try {
          const image = new Image();
          image.src = path;
          await image.decode();
          icons[field] = image;
        } catch {
          /* Canvas keeps an accessible category number when an optional icon fails. */
        }
      })
    );
    drawVtsScoreLeaderCanvas(canvas, summary, {
      icons,
      title: t('adminVtsScoreExportTitle', {}, 'VtsScore - best growth per category'),
      subtitle: t(
        'adminVtsScoreExportSubtitle',
        { count: summary.submitted },
        '{count} final uploads'
      ).replaceAll('{count}', String(summary.submitted)),
      formatNumber: (value, decimals = 0) => num(value, decimals),
      labelFor: (entry) => t(entry.i18nKey, {}, entry.label),
      provenance: `${snapshot?.season || 'Season'} · ${tierHeading(tier)} · Dragon cutoff ${num(effectiveSettings.dragonTierCutoff)} · ${new Date().toISOString().slice(0, 10)} UTC`,
      footer: `Source: Admin cloud snapshot · ${summary.submitted} uploads · ${readVtsScoreExemptions().length} local exemptions · Review before sharing`,
    });
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setStatus(t('adminVtsScoreExportFailed', {}, 'Could not build the image.'), 'error');
        return;
      }
      if (share && navigator.canShare && navigator.share) {
        const file = new File(
          [blob],
          `vtsscore-${snapshot?.season || 'leaders'}-${chosenTier}-${category}.png`,
          { type: 'image/png' }
        );
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: 'VtsScore category leaders' });
            setStatus('Image shared.', 'success');
            return;
          } catch (error) {
            if (error.name === 'AbortError') return;
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vtsscore-${snapshot?.season || 'leaders'}-${chosenTier}-${category}.png`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(t('adminVtsScoreExportDone', {}, 'Leader board image downloaded.'), 'success');
    });
  }

  function bind(root, rows, snapshot) {
    root
      .querySelectorAll('[data-vts-audit-export]')
      .forEach((button) =>
        button.addEventListener('click', () =>
          downloadVtsScoreAudit(snapshot, button.dataset.vtsAuditExport)
        )
      );
    root.querySelector('[data-vts-cutoff-form]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        const settings = await (options.saveSettings || saveVtsScoreSettings)(
          Number(form.elements.dragonTierCutoff.value),
          effectiveSettings.revision,
          undefined,
          {
            growthWarningAbsolute: Number(form.elements.growthWarningAbsolute.value),
            growthWarningPercent: Number(form.elements.growthWarningPercent.value),
          }
        );
        render(root, { ...snapshot, settings });
        setStatus('Shared Dragon cutoff saved.', 'success');
      } catch (error) {
        setStatus(error.message, 'error');
        button.disabled = false;
      }
    });
    root
      .querySelector('[data-vts-export]')
      ?.addEventListener('click', () => void exportLeaderPng(rows, root, snapshot));
    root
      .querySelector('[data-vts-share]')
      ?.addEventListener('click', () => void exportLeaderPng(rows, root, snapshot, true));
    root.querySelectorAll('[data-vts-exempt-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        const name = button.dataset.vtsExemptRemove;
        writeVtsScoreExemptions(
          readVtsScoreExemptions().filter(
            (entry) => vtsScoreExemptKey(entry) !== vtsScoreExemptKey(name)
          )
        );
        render(root, snapshot);
      });
    });
    root.querySelector('[data-vts-exempt-add]')?.addEventListener('click', () => {
      const input = root.querySelector('#dashVtsScoreExemptInput');
      const name = cleanText(input?.value);
      if (!name) return;
      const current = readVtsScoreExemptions();
      if (!current.some((entry) => vtsScoreExemptKey(entry) === vtsScoreExemptKey(name))) {
        writeVtsScoreExemptions([...current, name]);
      }
      render(root, snapshot);
    });
  }

  return { render };
}
