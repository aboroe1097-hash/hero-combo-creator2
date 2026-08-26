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

export function createVtsScoreAdminView(options = {}) {
  const t = typeof options.t === 'function' ? options.t : (key, vars, fallback) => fallback || key;
  const locale = () => (typeof options.locale === 'function' ? options.locale() : 'en');
  const setStatus = typeof options.setStatus === 'function' ? options.setStatus : () => {};

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
      }`;

    bind(root, rows, snapshot);
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
