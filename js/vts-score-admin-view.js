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
  buildCompetitionGrowthRows,
  buildGrowthBoardProjection,
  rankCompetitionGrowth,
} from './competition-growth.js';

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
 * Competition #12 growth: the ranked table with each player's baseline source,
 * the superadmin's review of proposed 2026 VtsScore name matches (a match is
 * used only once confirmed and saved), and "Publish growth board". The model is
 * js/competition-growth.js; reads and writes arrive as options.
 */
export function createCompetitionGrowthSection(options = {}) {
  const t = options.t || ((key) => key);
  const { num, signed } = options;
  const setStatus = options.setStatus || (() => {});
  const canEdit = () => options.canPublish?.() === true;
  const state = { snapshot: null, loading: false, failed: false, draft: {}, dirty: false };
  let host = null;

  const rowsFor = (decisions) =>
    buildCompetitionGrowthRows({
      ...state.snapshot,
      confirmations: decisions,
      window: state.snapshot?.schedule,
    });
  const button = (attrs, label, pressed = false) =>
    `<button type="button" class="dash-btn dash-btn-xs" ${attrs} aria-pressed="${pressed}">${esc(label)}</button>`;

  function matchCell(row) {
    const match = row.match;
    const decision = state.draft[row.submissionUid]?.decision;
    const name = match.candidate?.gameName;
    const label = match.confirmed
      ? t('c12Confirmed', { name })
      : decision === 'signup'
        ? t('adminVtsScoreBaselineShort')
        : match.status === 'ambiguous'
          ? t('c12Ambiguous')
          : '—';
    if (!canEdit() || !match.candidates.length) return esc(label);
    const uid = esc(row.submissionUid);
    const choices = match.candidates.map((candidate) =>
      button(
        `data-comp12-uid="${uid}" data-comp12-candidate="${esc(candidate.submissionUid)}" data-comp12-name="${esc(candidate.gameName)}"`,
        t('c12Use', {
          name: candidate.gameName,
          total: num(candidate.values.totalCastlePower),
        }),
        match.confirmed && match.candidate.submissionUid === candidate.submissionUid
      )
    );
    choices.push(
      button(`data-comp12-uid="${uid}"`, t('adminVtsScoreBaselineShort'), decision === 'signup')
    );
    return `${esc(label)}<div class="vts-admin-chip-row">${choices.join('')}</div>`;
  }

  function tableRow(row) {
    const total = row.fields.totalCastlePower;
    const reason = NOT_RANKED_KEYS[row.notRankedReason];
    const pct = row.growthPct === null ? '—' : `${signed(row.growthPct, 2)}%`;
    return `<tr><td>${row.rank ? `${row.rank}${row.tied ? '=' : ''}` : '—'}</td><th scope="row"><strong>${esc(row.gameName)}</strong>${reason ? `<br><span class="vts-admin-muted">${esc(t(reason))}</span>` : ''}</th><td><span class="vts-admin-chip">${esc(
      row.baselineSource === 'vtsscore-2026'
        ? t('c12SourceVtsScore')
        : row.baselineSource
          ? t('adminVtsScoreBaselineShort')
          : '—'
    )}</span></td><td>${matchCell(row)}</td><td>${esc(total.baseline === null ? '—' : num(total.baseline))}</td><td>${esc(total.final === null ? '—' : num(total.final))}</td><td data-growth="${growthTone(row.growthAbs)}">${esc(signed(row.growthAbs))}</td><td data-growth="${growthTone(row.growthPct)}">${esc(pct)}</td><td>${esc(t(row.consent ? 'adminYes' : 'adminNo'))}</td></tr>`;
  }

  function paint() {
    if (!host) return;
    let body;
    let actions = '';
    if (!state.snapshot) {
      body = `<div class="dash-empty"${state.failed ? ' role="alert"' : ''}>${esc(
        t(state.failed ? 'adminVtsScoreUnavailable' : 'adminLoading')
      )}</div>`;
    } else {
      const { ranked, notRanked } = rankCompetitionGrowth(rowsFor(state.draft));
      const all = [...ranked, ...notRanked];
      const pending = all.filter(
        (row) =>
          row.match.candidates.length && !row.match.confirmed && !state.draft[row.submissionUid]
      ).length;
      if (canEdit()) {
        actions = `<button type="button" class="dash-btn" data-comp12-save ${state.dirty ? '' : 'disabled'}>${esc(t('c12Save'))}</button><button type="button" class="dash-btn dash-btn-primary" data-comp12-publish ${ranked.length && !state.dirty ? '' : 'disabled'}>${esc(t('c12Publish'))}</button>`;
      }
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
          ${summaryCard(pending, t('c12ToReview'), pending ? 'warning' : 'positive')}</div><div class="vts-admin-table-wrap"><table class="vts-admin-table"><thead><tr>${heads}</tr></thead><tbody>${all.map(tableRow).join('') || `<tr><td colspan="9">${esc(t('adminVtsScoreEmpty'))}</td></tr>`}</tbody></table></div>`;
    }
    host.innerHTML = `<div class="vts-admin-card-heading"><div><h3>${esc(t('c12Title'))}</h3><p>${esc(t('c12Hint'))}</p></div><div class="vts-admin-chip-row"><button type="button" class="dash-btn" data-comp12-reload>${esc(t('adminVtsScoreRefresh'))}</button>${actions}</div></div>${body}`;
    bind();
  }

  async function run(action) {
    try {
      await action();
      setStatus(t('c12Done'), 'success');
    } catch {
      setStatus(t('c12Failed'), 'error');
    }
    paint();
  }

  const saveDecisions = () =>
    run(async () => {
      await options.saveDecisions(state.snapshot.season, state.draft);
      state.snapshot = { ...state.snapshot, confirmations: { ...state.draft } };
      state.dirty = false;
    });

  function publish() {
    if (state.dirty) return;
    // Only saved decisions reach the public board.
    const projection = buildGrowthBoardProjection(rowsFor(state.snapshot.confirmations), {
      seasonId: state.snapshot.season,
    });
    if (!window.confirm(t('c12PublishAsk', { count: projection.rows.length }))) return;
    void run(() => options.publish(projection));
  }

  function decide(uid, decision) {
    state.draft = { ...state.draft, [uid]: decision };
    state.dirty = true;
    paint();
  }

  function bind() {
    const on = (selector, handler) =>
      host.querySelectorAll(selector).forEach((element) => {
        element.addEventListener('click', () => handler(element.dataset));
      });
    on('[data-comp12-reload]', () => void load());
    if (!canEdit()) return;
    on('[data-comp12-save]', () => void saveDecisions());
    on('[data-comp12-publish]', publish);
    on('[data-comp12-uid]', (data) =>
      decide(data.comp12Uid, {
        decision: data.comp12Candidate ? 'vtsscore' : 'signup',
        matchedSubmissionUid: data.comp12Candidate || '',
        matchedGameName: data.comp12Name || '',
      })
    );
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    state.failed = false;
    state.snapshot = null;
    paint();
    try {
      state.snapshot = await options.load();
      state.draft = { ...state.snapshot.confirmations };
      state.dirty = false;
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
      })
    : null;
  let lastSnapshot = null;

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
    return tier === 1
      ? t('adminVtsScoreTierOne', {}, 'Tier 1 - Dragon 7M+')
      : t('adminVtsScoreTierTwo', {}, 'Tier 2 - Dragon below 7M');
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
    const rows = buildAdminVtsScoreRows(snapshot?.submissions, snapshot?.raceScores);
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

    root.innerHTML = `<div class="vts-admin-summary-grid">
        ${summaryCard(submitted, t('adminVtsScoreSubmitted', {}, 'Final uploads'), 'positive')}
        ${summaryCard(rows.length - submitted, t('adminVtsScoreMissing', {}, 'Still missing'), rows.length - submitted ? 'warning' : 'positive')}
        ${summaryCard(tierOne, t('adminVtsScoreTierOne', {}, 'Tier 1 - Dragon 7M+'))}
        ${summaryCard(rows.length - tierOne, t('adminVtsScoreTierTwo', {}, 'Tier 2 - Dragon below 7M'))}
      </div>
      ${renderStandings(rows)}
      ${
        tierSections
          ? `<div class="vts-admin-card-heading vts-admin-leaders-heading">
              <div>
                <h3>${esc(t('adminVtsScoreBestTitle', {}, 'Best growth per category'))}</h3>
                <p>${esc(t('adminVtsScoreBestHint', {}, 'Category leaders per Dragon tier and across both tiers, ranked by raw growth and by percentage growth side by side.'))}</p>
              </div>
              <button type="button" class="dash-btn dash-btn-primary" data-vts-export>${esc(t('adminVtsScoreExportPng', {}, 'Export PNG'))}</button>
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

  function exportLeaderPng(rows) {
    const summary = buildVtsScoreTierSummary(rows, VTS_SCORE_ALL_TIERS, readVtsScoreExemptions());
    if (!summary.submitted) {
      setStatus(t('adminVtsScoreExportEmpty', {}, 'No uploads to export yet.'), 'warn');
      return;
    }
    const canvas = document.createElement('canvas');
    drawVtsScoreLeaderCanvas(canvas, summary, {
      title: t('adminVtsScoreExportTitle', {}, 'VtsScore - best growth per category'),
      subtitle: t(
        'adminVtsScoreExportSubtitle',
        { count: summary.submitted },
        '{count} uploads across both tiers'
      ),
      formatNumber: (value, decimals = 0) => num(value, decimals),
      labelFor: (entry) => t(entry.i18nKey, {}, entry.label),
    });
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus(t('adminVtsScoreExportFailed', {}, 'Could not build the image.'), 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vtsscore-leaders.png';
      link.click();
      URL.revokeObjectURL(url);
      setStatus(t('adminVtsScoreExportDone', {}, 'Leader board image downloaded.'), 'success');
    });
  }

  function bind(root, rows, snapshot) {
    root.querySelector('[data-vts-export]')?.addEventListener('click', () => exportLeaderPng(rows));
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
