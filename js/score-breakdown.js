// One itemised view of a weighted score, shared by every place that shows it:
// the admin dashboard and contribution tables, the public Eden page, and the
// player detail views. Each line is the exact number the scorer added, with
// the count and weight it came from, so a total can be checked by hand.
//
// Callers pass their own translator and number formatters, because the admin
// and the public page localise through different catalogs.

const DUTY_LABEL_KEYS = Object.freeze({
  banners: 'adminDutyWeightsBanners',
  pathers: 'adminDutyWeightsPathers',
  shieldWalls: 'adminDutyWeightsShieldWalls',
});

const CONDUCT_CATEGORY_KEYS = Object.freeze({
  banner_help: 'adminConductCategoryBannerHelp',
  connected_road: 'adminConductCategoryConnectedRoad',
  extra_effort: 'adminConductCategoryExtraEffort',
  merit_other: 'adminConductCategoryMeritOther',
  path_block: 'adminConductCategoryPathBlock',
  toxicity: 'adminConductCategoryToxicity',
  ignored_coordination: 'adminConductCategoryIgnoredCoordination',
  penalty_other: 'adminConductCategoryPenaltyOther',
  forfeit_premium: 'adminConductCategoryForfeitPremium',
  grant_premium: 'adminConductCategoryGrantPremium',
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function weightText(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(3)));
}

// "1,000,000 ÷ 20" reads better than "1,000,000 × 0.05" for the small
// demolition weights admins use.
function demolitionFormula(item, t, number) {
  const weight = Number(item.weight) || 0;
  const divisor = weight > 0 && weight < 1 ? 1 / weight : 0;
  if (divisor && Math.abs(divisor - Math.round(divisor)) < 1e-9) {
    return `${number(item.total)} ÷ ${number(Math.round(divisor))}`;
  }
  return t('scoreBreakdownTimesWeight', { count: number(item.total), weight: weightText(weight) });
}

export function conductCategoryKey(category) {
  return CONDUCT_CATEGORY_KEYS[String(category || '')] || '';
}

// Structured lines; renderers decide the markup.
export function buildScoreBreakdownLines(row = {}) {
  const lines = [];
  // The in-game term carries the season's contribution multiplier, so the lines
  // still add up to the displayed total when an operator has tuned it.
  const contributionWeight = Number(row.contributionWeight);
  const weight =
    Number.isFinite(contributionWeight) && contributionWeight >= 0 ? contributionWeight : 1;
  lines.push({ kind: 'contribution', points: Number(row.contributionScore) || 0, weight });
  lines.push({ kind: 'exGuild', points: Number(row.contributionExGuild) || 0, weight });
  if (row.demolitionCounted === false) {
    // Nothing to explain when demolition is off and the player has none.
    if (Number(row.totalDemolition) > 0)
      lines.push({
        kind: 'demolition',
        off: true,
        total: Number(row.totalDemolition) || 0,
        points: 0,
      });
  } else if (Number(row.demolitionPoints) || Number(row.totalDemolition)) {
    lines.push({
      kind: 'demolition',
      total: Number(row.totalDemolition) || 0,
      weight: Number(row.demolitionWeight) || 0,
      points: Number(row.demolitionPoints) || 0,
    });
  }
  const duty = row.dutyBreakdown;
  const dutyItems = [];
  (duty?.activities || []).forEach((activity) => {
    ['main', 'alt'].forEach((cls) => {
      const part = activity[cls];
      if (!part?.count) return;
      dutyItems.push({
        activity: activity.activity,
        cls,
        count: part.count,
        weight: part.weight,
        points: part.points,
      });
    });
  });
  lines.push({
    kind: 'duty',
    points: Number(row.dutyPoints) || 0,
    unit: duty?.unit || 10000,
    items: dutyItems,
  });
  lines.push({
    kind: 'conduct',
    bonus: Number(row.conductBonus) || 0,
    unit: Number(row.conductUnit) || 10000,
    points: Number(row.conductPoints) || 0,
    items: Array.isArray(row.conductItems) ? row.conductItems : [],
  });
  return lines;
}

// Summary figures for the "main vs secondary" question.
export function dutyClassTotals(row = {}) {
  const totals = { main: 0, alt: 0, mainPoints: 0, altPoints: 0 };
  (row.dutyBreakdown?.activities || []).forEach((activity) => {
    totals.main += activity.main?.count || 0;
    totals.alt += activity.alt?.count || 0;
    totals.mainPoints += activity.main?.points || 0;
    totals.altPoints += activity.alt?.points || 0;
  });
  return totals;
}

/**
 * @param {object} row  A scored row from buildWeightedContributionRows.
 * @param {object} options
 * @param {(key: string, vars?: object) => string} options.t
 * @param {(value: number) => string} options.number
 * @param {(value: number) => string} options.signed
 * @param {string} [options.totalText]  Pre-formatted total.
 * @param {string} [options.conductNote]  Shown under the bonus line (privacy note).
 * @param {boolean} [options.hideDemolition]  Public views that never count it.
 */
export function renderScoreBreakdown(row, options) {
  const { t, number, signed } = options;
  const line = (label, value, note = '', extraClass = '') =>
    `<span class="score-breakdown-line${extraClass}"><span>${label}${note ? `<small>${note}</small>` : ''}</span><b>${value}</b></span>`;
  const sub = (label, value) =>
    `<span class="score-breakdown-sub"><span>${label}</span><b>${value}</b></span>`;
  const parts = [];
  buildScoreBreakdownLines(row).forEach((item) => {
    if (item.kind === 'contribution') {
      parts.push(
        line(
          escapeHtml(t('edenX1BreakdownContribution')),
          number(item.points),
          item.weight === 1
            ? ''
            : escapeHtml(
                t('scoreBreakdownTimesWeight', {
                  count: number(item.points),
                  weight: weightText(item.weight),
                })
              )
        )
      );
    } else if (item.kind === 'exGuild') {
      if (item.points)
        parts.push(
          line(
            escapeHtml(t('edenX1BreakdownExGuild')),
            number(item.points),
            item.weight === 1
              ? ''
              : escapeHtml(
                  t('scoreBreakdownTimesWeight', {
                    count: number(item.points),
                    weight: weightText(item.weight),
                  })
                )
          )
        );
    } else if (item.kind === 'demolition') {
      if (options.hideDemolition) return;
      parts.push(
        item.off
          ? line(
              escapeHtml(t('adminThDemo')),
              '—',
              escapeHtml(t('scoreBreakdownDemolitionOff', { total: number(item.total) }))
            )
          : line(
              escapeHtml(t('adminThDemo')),
              number(item.points),
              escapeHtml(demolitionFormula(item, t, number))
            )
      );
    } else if (item.kind === 'duty') {
      parts.push(
        line(
          escapeHtml(t('edenX1BreakdownDuty')),
          number(item.points),
          '',
          ' score-breakdown-group'
        )
      );
      if (!item.items.length) {
        parts.push(sub(escapeHtml(t('scoreBreakdownNoDuty')), '0'));
      }
      item.items.forEach((duty) => {
        const alt = duty.cls === 'alt';
        const label = `${escapeHtml(t(DUTY_LABEL_KEYS[duty.activity] || duty.activity))} <i class="score-breakdown-tag" data-account="${alt ? 'banner' : 'main'}">${escapeHtml(
          t(alt ? 'scoreBreakdownSecondary' : 'adminDutyAccountMain')
        )}</i><small>${escapeHtml(
          t('scoreBreakdownDutyFormula', {
            count: duty.count,
            weight: weightText(duty.weight),
            unit: number(item.unit),
          })
        )}</small>`;
        parts.push(sub(label, number(duty.points)));
      });
    } else if (item.kind === 'conduct') {
      parts.push(
        line(
          escapeHtml(t('edenX1BreakdownConductPoints')),
          signed(item.points),
          // A zero bonus needs no formula.
          item.bonus
            ? escapeHtml(
                t('scoreBreakdownConductFormula', {
                  bonus: signed(item.bonus),
                  unit: number(item.unit),
                })
              )
            : '',
          ' score-breakdown-group'
        )
      );
      item.items
        .slice()
        .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
        .forEach((entry) => {
          const key = conductCategoryKey(entry.category);
          const label = `${escapeHtml(key ? t(key) : entry.category)}${entry.count > 1 ? ` <em>×${entry.count}</em>` : ''}`;
          parts.push(sub(label, signed(entry.points)));
        });
      if (options.conductNote) {
        parts.push(
          `<small class="score-breakdown-note">${escapeHtml(options.conductNote)}</small>`
        );
      }
    }
  });
  const totals = dutyClassTotals(row);
  if (totals.main || totals.alt) {
    parts.push(
      `<small class="score-breakdown-note">${escapeHtml(
        t('scoreBreakdownClassSummary', {
          main: totals.main,
          alt: totals.alt,
          mainPoints: number(totals.mainPoints),
          altPoints: number(totals.altPoints),
        })
      )}</small>`
    );
  }
  parts.push(
    `<span class="score-breakdown-line score-breakdown-total"><span>${escapeHtml(
      t('edenX1BreakdownTotal')
    )}</span><b>${options.totalText ?? number(row.weightedScore)}</b></span>`
  );
  return `<span class="score-breakdown">${parts.join('')}</span>`;
}

const DUTY_ACTIVITY_SHORT_KEYS = Object.freeze({
  banners: 'adminDutyWeightsBanners',
  pathers: 'adminDutyWeightsPathers',
  shieldWalls: 'adminDutyWeightsShieldWalls',
});
const DUTY_ACTIVITY_ORDER = ['banners', 'pathers', 'shieldWalls'];

// Where the score came from, as shares of the positive parts, for the bar.
function scoreComposition(row) {
  const contributionScore = Number(row.contributionScore) || 0;
  const exGuild = Number(row.contributionExGuild) || 0;
  const contributionWeight = Number(row.contributionWeight);
  const weightedContribution =
    Number.isFinite(contributionWeight) && contributionWeight >= 0
      ? (contributionScore + exGuild) * contributionWeight
      : contributionScore + exGuild;
  const parts = [
    {
      key: 'contribution',
      label: 'edenX1BreakdownContribution',
      points: weightedContribution,
    },
    { key: 'duty', label: 'edenX1BreakdownDuty', points: Number(row.dutyPoints) || 0 },
    { key: 'demolition', label: 'adminThDemo', points: Number(row.demolitionPoints) || 0 },
    { key: 'bonus', label: 'edenX1BreakdownConductPoints', points: Number(row.conductPoints) || 0 },
  ].filter((part) => part.points !== 0);
  const positive = parts.reduce((sum, part) => sum + Math.max(0, part.points), 0) || 1;
  return parts.map((part) => ({
    ...part,
    share: Math.max(0, part.points) / positive,
  }));
}

let playerSeasonFilterBound = false;
let playerSeasonStylesRequested = false;

// The season view's stylesheet is not linked from any page: it is fetched the
// first time a view renders, and ahead of that when the browser is idle.
function loadPlayerSeasonStyles() {
  if (playerSeasonStylesRequested || typeof document === 'undefined') return;
  playerSeasonStylesRequested = true;
  import('../css/player-season.css').catch(() => {
    playerSeasonStylesRequested = false;
  });
}

// Only in a real browser: tests stub `window` without timers or idle callbacks.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(loadPlayerSeasonStyles, { timeout: 5000 });
  } else if (typeof window.setTimeout === 'function') {
    window.setTimeout(loadPlayerSeasonStyles, 2000);
  }
}

// One delegated listener serves every player view (admin and public).
function bindPlayerSeasonFilters() {
  if (playerSeasonFilterBound || typeof document === 'undefined') return;
  playerSeasonFilterBound = true;
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-ps-filter]');
    if (!button) return;
    const panel = button.closest('.player-season-duties-panel');
    if (!panel) return;
    event.stopPropagation();
    panel.dataset.filter = button.dataset.psFilter;
    panel.querySelectorAll('[data-ps-filter]').forEach((chip) => {
      chip.setAttribute('aria-pressed', chip === button ? 'true' : 'false');
    });
  });
}

/**
 * A player's season at a glance, used by the admin and public player views:
 * rank, score and reward, what the score is made of, the itemised score, and
 * every duty they were credited with (newest first, filterable by type) with
 * the account type it counted as.
 *
 * @param {object} options
 * @param {object} options.row  Scored row (primary account of the family).
 * @param {Array} options.duties  collectFamilyDutyEntries output.
 * @param {string} [options.rewardLabel]
 */
export function renderPlayerSeasonSummary(options) {
  const { row, t, number, signed } = options;
  if (!row) return '';
  loadPlayerSeasonStyles();
  bindPlayerSeasonFilters();
  const duties = Array.isArray(options.duties) ? options.duties : [];
  const composition = scoreComposition(row);
  const countBy = (activity) => duties.filter((duty) => duty.activity === activity).length;
  const activityLabel = (activity) => t(DUTY_ACTIVITY_SHORT_KEYS[activity] || activity);

  const dutyRow = (duty) => {
    const when = [duty.date, duty.usageTime || duty.gameTime].filter(Boolean).join(' · ');
    const banner = duty.accountClass === 'alt';
    return `<li class="player-season-duty" data-activity="${escapeHtml(duty.activity)}">
        <span class="player-season-duty-what"><strong>${escapeHtml(activityLabel(duty.activity))}</strong>${duty.target ? `<span>${escapeHtml(duty.target)}</span>` : ''}</span>
        <span class="player-season-duty-when">${escapeHtml(when || '—')}</span>
        <span class="player-season-duty-chip" data-account="${banner ? 'banner' : 'main'}">${escapeHtml(t(banner ? 'adminDutyAccountBanner' : 'adminDutyAccountMain'))}${banner && duty.accountName ? ` · ${escapeHtml(duty.accountName)}` : ''}</span>
      </li>`;
  };
  const filters = [
    `<button type="button" class="player-season-filter" data-ps-filter="all" aria-pressed="true">${escapeHtml(t('playerSeasonFilterAll'))} <b>${duties.length}</b></button>`,
    ...DUTY_ACTIVITY_ORDER.filter((activity) => countBy(activity)).map(
      (activity) =>
        `<button type="button" class="player-season-filter" data-ps-filter="${activity}" data-activity="${activity}" aria-pressed="false">${escapeHtml(activityLabel(activity))} <b>${countBy(activity)}</b></button>`
    ),
  ].join('');

  const bar = composition.length
    ? `<div class="player-season-bar" role="img" aria-label="${escapeHtml(t('playerSeasonComposition'))}">${composition
        .filter((part) => part.share > 0)
        .map(
          (part) =>
            `<span data-part="${part.key}" style="flex-grow:${(part.share * 1000).toFixed(0)}"></span>`
        )
        .join('')}</div>
      <ul class="player-season-legend">${composition
        .map(
          (part) =>
            `<li data-part="${part.key}"><i aria-hidden="true"></i>${escapeHtml(t(part.label))} <b>${
              part.key === 'bonus' ? signed(part.points) : number(part.points)
            }</b>${part.share > 0 ? `<small>${Math.round(part.share * 100)}%</small>` : ''}</li>`
        )
        .join('')}</ul>`
    : '';

  return `<section class="player-season" aria-label="${escapeHtml(t('playerSeasonTitle'))}">
    <div class="player-season-hero">
      <div class="player-season-rank"><span>${escapeHtml(t('adminContributionFinalRank'))}</span><b>${row.finalRank ? `#${escapeHtml(row.finalRank)}` : '—'}</b></div>
      <div class="player-season-score"><span>${escapeHtml(t('edenX1ThWeightedScore'))}</span><b>${options.totalText ?? number(row.weightedScore)}</b></div>
      ${options.rewardLabel ? `<div class="player-season-reward"><span>${escapeHtml(t('playerSeasonReward'))}</span><b>${escapeHtml(options.rewardLabel)}</b></div>` : ''}
    </div>
    ${bar}
    <div class="player-season-grid">
      <div class="player-season-panel">
        <div class="player-season-panel-title">${escapeHtml(t('edenX1WeightedBreakdownTitle'))}</div>
        ${renderScoreBreakdown(row, options)}
      </div>
      <div class="player-season-panel player-season-duties-panel" data-filter="all">
        <div class="player-season-panel-title">${escapeHtml(t('playerSeasonDutyList', { count: duties.length }))}</div>
        ${
          duties.length
            ? `<div class="player-season-filters" role="group">${filters}</div>
              <ul class="player-season-duties">${duties.map(dutyRow).join('')}</ul>`
            : `<p class="player-season-empty">${escapeHtml(t('scoreBreakdownNoDuty'))}</p>`
        }
      </div>
    </div>
  </section>`;
}

/**
 * A duty count for a table cell, with the alt / banner share called out so
 * the split behind the points is visible without opening the breakdown.
 */
export function renderDutyCountCell(row, activity, t) {
  const count = Number(row?.[activity]) || 0;
  const split = row?.dutiesByClass?.[activity] || { main: count, alt: 0 };
  if (!split.alt) return String(count);
  const title = t('scoreBreakdownCountSplit', { main: split.main, alt: split.alt });
  return `<span class="duty-count" title="${escapeHtml(title)}">${count}<small class="duty-count-alt"> ${escapeHtml(
    t('scoreBreakdownAltCount', { count: split.alt })
  )}</small></span>`;
}
