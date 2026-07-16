import * as AllianceModel from './alliance-view-model.js';
import * as AllianceStore from './alliance-view-store.js';

const ALLIANCE_IDS = AllianceStore.ALLIANCE_VIEW_ALLIANCE_IDS || ['v3s', 'vts'];
const CONTROLLERS = new WeakMap();
const DEFAULT_COLUMNS = new Set([
  'accountName',
  'alliance',
  'activity',
  'rank',
  'power',
  'match',
  'base',
  'extended',
  'active',
  'bonus',
]);

const METRICS = [
  ['extended', 'adminAllianceViewMetricExtended', 'Extended Weighted'],
  ['base', 'adminAllianceViewMetricBase', 'Base'],
  ['active', 'adminAllianceViewMetricActive', 'Active Admin Mode'],
  ['contribution', 'adminAllianceViewMetricContribution', 'Raw contribution'],
  ['exGuild', 'adminAllianceViewMetricExGuild', 'Ex-guild'],
  ['duties', 'adminAllianceViewMetricDuties', 'All duties'],
  ['banners', 'adminAllianceViewMetricBanners', 'Banners'],
  ['pathers', 'adminAllianceViewMetricPathers', 'Pathers'],
  ['shieldWalls', 'adminAllianceViewMetricShieldWalls', 'Shield walls'],
  ['bonusTeamEffort', 'adminAllianceViewMetricBonus', 'Bonus Team Effort'],
  ['totalPower', 'adminAllianceViewMetricPower', 'Total power'],
];

const COLUMN_DEFINITIONS = [
  ['accountName', 'adminAllianceViewColumnAccount', 'Account'],
  ['alliance', 'adminAllianceViewColumnAlliance', 'Alliance'],
  ['activity', 'adminAllianceViewColumnActivity', 'Activity'],
  ['rank', 'adminAllianceViewColumnRank', 'Roster rank'],
  ['server', 'adminAllianceViewColumnServer', 'Server'],
  ['castle', 'adminAllianceViewColumnCastle', 'Castle'],
  ['power', 'adminAllianceViewColumnPower', 'Power'],
  ['match', 'adminAllianceViewColumnMatch', 'Eden match'],
  ['base', 'adminAllianceViewColumnBase', 'Base'],
  ['extended', 'adminAllianceViewColumnExtended', 'Extended'],
  ['active', 'adminAllianceViewColumnActive', 'Active score'],
  ['bonus', 'adminAllianceViewColumnBonus', 'Bonus'],
];

function escapeHtml(value) {
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

function numberValue(value) {
  if (value === '' || value === null || value === undefined) return 0;
  const number = Number(typeof value === 'string' ? value.replaceAll(',', '') : value);
  return Number.isFinite(number) ? number : 0;
}

function nullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(typeof value === 'string' ? value.replaceAll(',', '') : value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat(document.documentElement.lang || undefined).format(
    Math.round(numberValue(value))
  );
}

function effectiveValue(member, key) {
  if (Object.prototype.hasOwnProperty.call(member?.overrides || {}, key)) {
    return member.overrides[key];
  }
  return member?.imported?.[key] ?? '';
}

function accountName(member) {
  return cleanText(effectiveValue(member, 'name')) || cleanText(member?.imported?.name);
}

function contributionRows(model) {
  if (Array.isArray(model)) return model;
  for (const key of ['rows', 'weightedRows', 'contributionRows', 'accounts']) {
    if (Array.isArray(model?.[key])) return model[key];
  }
  return [];
}

function contributionSourceId(row, index = 0) {
  const explicit = cleanText(row?.sourceId || row?.accountId || row?.id || row?.entryId);
  if (explicit) return explicit;
  const modelSourceId = cleanText(AllianceModel.getAllianceEdenSourceId?.(row));
  if (modelSourceId) return modelSourceId;
  const sourceName = contributionSourceName(row);
  return sourceName ? `eden-name-${stableTextHash(sourceName)}` : `eden-unresolved-${index}`;
}

function contributionSourceName(row) {
  return cleanText(row?.sourceName || row?.accountName || row?.playerName || row?.name);
}

function stableTextHash(value) {
  let hash = 2166136261;
  for (const character of cleanText(value).toLocaleLowerCase()) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function stableEdenRows(model) {
  const occurrences = new Map();
  return contributionRows(model).map((row, index) => {
    const baseSourceId = contributionSourceId(row, index);
    const occurrence = (occurrences.get(baseSourceId) || 0) + 1;
    occurrences.set(baseSourceId, occurrence);
    return {
      ...row,
      sourceId: occurrence === 1 ? baseSourceId : `${baseSourceId}_${occurrence}`,
    };
  });
}

function rosterMembers(rosters) {
  return ALLIANCE_IDS.flatMap((allianceId) => rosters?.[allianceId]?.members || []);
}

function makeEmptyRoster(allianceId) {
  return { allianceId, revision: 0, members: [], updatedAt: null, updatedBy: '' };
}

function cloneMember(member) {
  return {
    ...member,
    imported: { ...(member?.imported || {}) },
    overrides: { ...(member?.overrides || {}) },
    knownNames: [...(member?.knownNames || [])],
    edenAssignment: member?.edenAssignment ? { ...member.edenAssignment } : null,
  };
}

function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => cleanText(row?.[key])).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );
}

function fallbackRow(member, edenRow = null) {
  const contribution = numberValue(edenRow?.contribution ?? edenRow?.contributionScore);
  const exGuild = numberValue(edenRow?.exGuild ?? edenRow?.contributionExGuild);
  const banners = numberValue(edenRow?.banners);
  const pathers = numberValue(edenRow?.pathers);
  const shieldWalls = numberValue(edenRow?.shieldWalls);
  const bonusTeamEffort = numberValue(edenRow?.bonusTeamEffort ?? edenRow?.conductBonus);
  const duties = banners + pathers + shieldWalls;
  const extended = contribution + exGuild + 10000 * (duties + bonusTeamEffort);
  return {
    id: member.id,
    member,
    accountName: accountName(member),
    allianceId: member.allianceId,
    alliance: cleanText(effectiveValue(member, 'alliance')) || member.allianceId.toUpperCase(),
    rank: effectiveValue(member, 'rank'),
    server: effectiveValue(member, 'server'),
    castleLevel: nullableNumber(effectiveValue(member, 'castleLevel')),
    totalPower: nullableNumber(effectiveValue(member, 'totalPower')),
    activityAtMs:
      nullableNumber(member?.overrides?.activityAtMs) ?? nullableNumber(member?.activityAtMs),
    activityRaw: member?.activityRaw || member?.imported?.lastOnline || '',
    matchStatus: edenRow ? 'matched' : 'unmatched',
    matchMethod: member?.edenAssignment?.method || (edenRow ? 'manual' : ''),
    edenSourceId: edenRow ? contributionSourceId(edenRow) : '',
    edenSourceName: edenRow ? contributionSourceName(edenRow) : '',
    contribution,
    exGuild,
    base: contribution + exGuild,
    extended,
    active: numberValue(edenRow?.active ?? edenRow?.activeScore ?? extended),
    duties,
    shieldWalls,
    pathers,
    banners,
    bonusTeamEffort,
  };
}

function buildFallbackRows(members, edenRows) {
  const bySourceId = new Map(
    edenRows.map((row, index) => [contributionSourceId(row, index), row]).filter(([key]) => key)
  );
  return members.map((member) => {
    const assignedId = cleanText(member?.edenAssignment?.sourceId);
    const assignedName = cleanText(member?.edenAssignment?.sourceName).toLocaleLowerCase();
    const matched =
      bySourceId.get(assignedId) ||
      edenRows.find(
        (row) => assignedName && contributionSourceName(row).toLocaleLowerCase() === assignedName
      ) ||
      null;
    return fallbackRow(member, matched);
  });
}

function rowMetric(row, metric) {
  const map = {
    extended: row.extended ?? row.extendedScore ?? row.weightedScore,
    base: row.base ?? row.baseScore,
    active: row.active ?? row.activeScore,
    contribution: row.contribution ?? row.contributionScore,
    exGuild: row.exGuild ?? row.contributionExGuild,
    duties: row.duties ?? row.dutyPoints,
    banners: row.banners,
    pathers: row.pathers,
    shieldWalls: row.shieldWalls,
    bonusTeamEffort: row.bonusTeamEffort ?? row.conductBonus,
    totalPower: row.totalPower,
  };
  return numberValue(map[metric]);
}

function makeTr(translator) {
  return (key, fallback, values = null) => {
    let translated = '';
    try {
      translated = typeof translator === 'function' ? translator(key, values || {}) : '';
    } catch {
      translated = '';
    }
    const base = !translated || translated === key ? fallback : translated;
    if (!values) return String(base ?? '');
    return Object.entries(values).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
      String(base ?? '')
    );
  };
}

export async function initializeAdminAllianceView(options = {}) {
  const root =
    typeof options.container === 'string'
      ? document.querySelector(options.container)
      : options.container || document.getElementById('dashAllianceViewRoot');
  if (!root) throw new Error('Alliance View root was not found.');
  const existingController = CONTROLLERS.get(root);
  if (existingController) return existingController;

  const tr = makeTr(options.t);
  const state = {
    root,
    tr,
    store: null,
    rosters: Object.fromEntries(ALLIANCE_IDS.map((id) => [id, makeEmptyRoster(id)])),
    contributionModel: null,
    rows: [],
    visibleRows: [],
    filters: {
      search: '',
      alliance: '',
      rank: '',
      server: '',
      castleMin: '',
      powerMin: '',
      metricMin: '',
      metricMax: '',
      activity: '',
      matchStatus: '',
    },
    metric: 'extended',
    layout: 'combined',
    view: 'all',
    sort: { key: 'score', direction: 'desc' },
    columns: new Set(DEFAULT_COLUMNS),
    expanded: new Set(),
    importAllianceId: '',
    importDraft: null,
    editing: null,
    unsubscribeContribution: null,
    destroyed: false,
    options,
    eventsAbort: null,
    userUid: '',
  };

  renderShell(state);
  bindEvents(state, options);
  root.setAttribute('aria-busy', 'true');

  try {
    const getContext =
      options.getFirestoreContext || (() => window.getVtsAdminFirestoreContext?.());
    const context = await Promise.resolve(getContext());
    if (!context?.db || !context?.user || !context?.firestore) {
      throw new Error(
        tr('adminAllianceViewStorageUnavailable', 'Alliance storage is unavailable.')
      );
    }
    state.userUid = context.user.uid || '';
    state.store = AllianceStore.createAllianceRosterStore({
      ...context,
      onChange: ({ rosters }) => {
        if (state.destroyed) return;
        state.rosters = rosters;
        rebuildRows(state);
      },
      onError: ({ error }) => showStatus(state, error?.message || String(error), 'error'),
    });
    await state.store.start();
    state.rosters = state.store.getRosters();
    if (typeof options.getContributionModel === 'function') {
      state.contributionModel = await Promise.resolve(options.getContributionModel());
    }
    if (typeof options.subscribeContributionModel === 'function') {
      state.unsubscribeContribution = options.subscribeContributionModel((model) => {
        if (state.destroyed) return;
        state.contributionModel = model;
        rebuildRows(state);
        showStatus(
          state,
          tr('adminAllianceViewLiveRefreshed', 'Season contribution data refreshed.'),
          'success'
        );
      });
    }
    rebuildRows(state);
    showStatus(state, tr('adminAllianceViewReady', 'Alliance View is live.'), 'success');
  } catch (error) {
    state.store?.stop?.();
    if (typeof state.unsubscribeContribution === 'function') state.unsubscribeContribution();
    state.unsubscribeContribution = null;
    state.eventsAbort?.abort();
    showFatal(state, error, tr);
    throw error;
  } finally {
    root.setAttribute('aria-busy', 'false');
  }

  const controller = {
    refresh() {
      rebuildRows(state);
    },
    refreshLanguage(translator = options.t) {
      state.tr = makeTr(translator);
      renderShell(state);
      bindEvents(state, options);
      restoreControlState(state);
      populateDynamicFilters(state);
      renderSummary(state);
      renderResults(state);
    },
    setContributionModel(model) {
      state.contributionModel = model;
      rebuildRows(state);
    },
    getState() {
      return {
        rows: [...state.rows],
        visibleRows: [...state.visibleRows],
        rosters: state.rosters,
        metric: state.metric,
        layout: state.layout,
        view: state.view,
      };
    },
    destroy() {
      state.destroyed = true;
      state.eventsAbort?.abort();
      state.store?.stop?.();
      if (typeof state.unsubscribeContribution === 'function') state.unsubscribeContribution();
      CONTROLLERS.delete(root);
      root.replaceChildren();
    },
  };
  CONTROLLERS.set(root, controller);
  return controller;
}

export const initAdminAllianceView = initializeAdminAllianceView;

function keyedText(key, fallback) {
  return `data-admin-i18n="${key}">${escapeHtml(fallback)}`;
}

function renderShell(state) {
  const { root, tr } = state;
  const metricOptions = METRICS.map(
    ([value, key, fallback]) => `<option value="${value}">${escapeHtml(tr(key, fallback))}</option>`
  ).join('');
  const columnOptions = COLUMN_DEFINITIONS.map(
    ([value, key, fallback]) => `
      <label class="dash-alliance-check">
        <input type="checkbox" name="columns" value="${value}" ${
          state.columns.has(value) ? 'checked' : ''
        } ${value === 'accountName' ? 'disabled' : ''} />
        <span ${keyedText(key, tr(key, fallback))}</span>
      </label>`
  ).join('');

  root.innerHTML = `
    <section class="dash-card dash-alliance-card" aria-labelledby="dashAllianceViewTitle">
      <header class="dash-card-hdr dash-alliance-hero">
        <div>
          <div class="dash-alliance-kicker" ${keyedText(
            'adminAllianceViewKicker',
            tr('adminAllianceViewKicker', 'MERGE PLANNING · LIVE EDEN DATA')
          )}</div>
          <h2 id="dashAllianceViewTitle" class="dash-card-title">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/>
              <path d="M2.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M10.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6"/>
            </svg>
            <span ${keyedText(
              'adminAllianceViewTitle',
              tr('adminAllianceViewTitle', 'Alliance View')
            )}</span>
          </h2>
          <p class="dash-card-subtitle" ${keyedText(
            'adminAllianceViewSubtitle',
            tr(
              'adminAllianceViewSubtitle',
              'Rank every V3S and VTS castle against live, season-long Eden contribution.'
            )
          )}</p>
        </div>
        <div class="dash-card-actions dash-alliance-actions">
          <button class="dash-btn" type="button" data-action="import" data-alliance="v3s">
            <span aria-hidden="true">↥</span>
            <span ${keyedText(
              'adminAllianceViewImportV3s',
              tr('adminAllianceViewImportV3s', 'Import V3S')
            )}</span>
          </button>
          <button class="dash-btn" type="button" data-action="import" data-alliance="vts">
            <span aria-hidden="true">↥</span>
            <span ${keyedText(
              'adminAllianceViewImportVts',
              tr('adminAllianceViewImportVts', 'Import VTS')
            )}</span>
          </button>
          <button class="dash-btn dash-btn-primary" type="button" data-action="add">
            <span aria-hidden="true">＋</span>
            <span ${keyedText(
              'adminAllianceViewAddAccount',
              tr('adminAllianceViewAddAccount', 'Add account')
            )}</span>
          </button>
        </div>
      </header>

      <div id="dashAllianceViewStatus" class="dash-alliance-status" role="status" aria-live="polite"></div>
      <div id="dashAllianceViewSummary" class="dash-alliance-summary" aria-live="polite"></div>

      <div class="dash-alliance-toolbar" aria-label="${escapeHtml(
        tr('adminAllianceViewControls', 'Alliance View controls')
      )}">
        <div class="dash-alliance-control dash-alliance-control-wide">
          <label for="dashAllianceSearch" ${keyedText(
            'adminAllianceViewSearchLabel',
            tr('adminAllianceViewSearchLabel', 'Search accounts')
          )}</label>
          <div class="dash-alliance-search-wrap">
            <span aria-hidden="true">⌕</span>
            <input id="dashAllianceSearch" class="dash-input" type="search"
              placeholder="${escapeHtml(
                tr('adminAllianceViewSearchPlaceholder', 'Name, server, rank, or Eden match')
              )}" data-admin-i18n-placeholder="adminAllianceViewSearchPlaceholder" autocomplete="off" />
          </div>
        </div>
        <div class="dash-alliance-control">
          <label for="dashAllianceMetric" ${keyedText(
            'adminAllianceViewRankingMetric',
            tr('adminAllianceViewRankingMetric', 'Ranking metric')
          )}</label>
          <select id="dashAllianceMetric" class="dash-select">${metricOptions}</select>
        </div>
        <fieldset class="dash-alliance-segment" aria-label="${escapeHtml(
          tr('adminAllianceViewRowsShown', 'Rows shown')
        )}">
          <legend class="sr-only">${escapeHtml(
            tr('adminAllianceViewRowsShown', 'Rows shown')
          )}</legend>
          <button class="dash-btn dash-btn-primary" type="button" data-view="all" aria-pressed="true">
            <span ${keyedText('adminAllianceViewAll', tr('adminAllianceViewAll', 'All'))}</span>
          </button>
          <button class="dash-btn" type="button" data-view="top100" aria-pressed="false">
            <span ${keyedText(
              'adminAllianceViewTop100',
              tr('adminAllianceViewTop100', 'Top 100')
            )}</span>
          </button>
        </fieldset>
        <fieldset class="dash-alliance-segment" aria-label="${escapeHtml(
          tr('adminAllianceViewLayout', 'Table layout')
        )}">
          <legend class="sr-only">${escapeHtml(tr('adminAllianceViewLayout', 'Table layout'))}</legend>
          <button class="dash-btn dash-btn-primary" type="button" data-layout="combined" aria-pressed="true">
            <span ${keyedText(
              'adminAllianceViewCombined',
              tr('adminAllianceViewCombined', 'Combined')
            )}</span>
          </button>
          <button class="dash-btn" type="button" data-layout="split" aria-pressed="false">
            <span ${keyedText('adminAllianceViewSplit', tr('adminAllianceViewSplit', 'Split'))}</span>
          </button>
        </fieldset>
      </div>

      <details class="dash-alliance-filter-panel">
        <summary>
          <span ${keyedText(
            'adminAllianceViewFiltersColumns',
            tr('adminAllianceViewFiltersColumns', 'Filters and columns')
          )}</span>
          <span id="dashAllianceFilterCount" class="dash-alliance-filter-count">0</span>
        </summary>
        <div class="dash-alliance-filter-grid">
          ${renderFilterSelect(
            'dashAllianceFilterAlliance',
            'alliance',
            tr('adminAllianceViewFilterAlliance', 'Alliance'),
            [
              ['', tr('adminAllianceViewFilterAll', 'All')],
              ['v3s', 'V3S'],
              ['vts', 'VTS'],
            ]
          )}
          ${renderFilterSelect(
            'dashAllianceFilterRank',
            'rank',
            tr('adminAllianceViewFilterRank', 'Roster rank'),
            [['', tr('adminAllianceViewFilterAll', 'All')]]
          )}
          ${renderFilterSelect(
            'dashAllianceFilterServer',
            'server',
            tr('adminAllianceViewFilterServer', 'Server'),
            [['', tr('adminAllianceViewFilterAll', 'All')]]
          )}
          ${renderFilterInput(
            'dashAllianceFilterCastle',
            'castleMin',
            tr('adminAllianceViewFilterCastle', 'Minimum castle'),
            'number',
            '0'
          )}
          ${renderFilterInput(
            'dashAllianceFilterPower',
            'powerMin',
            tr('adminAllianceViewFilterPower', 'Minimum power'),
            'number',
            '0'
          )}
          ${renderFilterInput(
            'dashAllianceFilterMetricMin',
            'metricMin',
            tr('adminAllianceViewFilterMetricMin', 'Minimum metric score'),
            'number',
            '-999999999'
          )}
          ${renderFilterInput(
            'dashAllianceFilterMetricMax',
            'metricMax',
            tr('adminAllianceViewFilterMetricMax', 'Maximum metric score'),
            'number',
            '-999999999'
          )}
          ${renderFilterSelect(
            'dashAllianceFilterActivity',
            'activity',
            tr('adminAllianceViewFilterActivity', 'Activity'),
            [
              ['', tr('adminAllianceViewFilterAll', 'All')],
              ['current', tr('adminAllianceViewActivityCurrent', 'Within 48 hours')],
              ['watch', tr('adminAllianceViewActivityWatch', '48 hours–7 days')],
              ['stale', tr('adminAllianceViewActivityStale', 'Over 7 days')],
              ['unknown', tr('adminAllianceViewActivityUnknown', 'Unknown')],
            ]
          )}
          ${renderFilterSelect(
            'dashAllianceFilterMatch',
            'matchStatus',
            tr('adminAllianceViewFilterMatch', 'Match status'),
            [
              ['', tr('adminAllianceViewFilterAll', 'All')],
              ['matched', tr('adminAllianceViewMatched', 'Matched')],
              ['suggested', tr('adminAllianceViewSuggested', 'Needs review')],
              ['unmatched', tr('adminAllianceViewUnmatched', 'Unmatched')],
            ]
          )}
          <div class="dash-alliance-filter-actions">
            <button class="dash-btn" type="button" data-action="clear-filters">
              <span ${keyedText(
                'adminAllianceViewClearFilters',
                tr('adminAllianceViewClearFilters', 'Clear filters')
              )}</span>
            </button>
          </div>
        </div>
        <fieldset class="dash-alliance-columns">
          <legend ${keyedText(
            'adminAllianceViewChooseColumns',
            tr('adminAllianceViewChooseColumns', 'Choose columns')
          )}</legend>
          ${columnOptions}
        </fieldset>
      </details>

      <div class="dash-alliance-result-bar">
        <p id="dashAllianceViewResultCount"></p>
        <div class="dash-card-actions">
          <button class="dash-btn" type="button" data-action="export-filtered">
            <span ${keyedText(
              'adminAllianceViewExportFiltered',
              tr('adminAllianceViewExportFiltered', 'Export filtered')
            )}</span>
          </button>
          <button class="dash-btn" type="button" data-action="export-all">
            <span ${keyedText(
              'adminAllianceViewExportAll',
              tr('adminAllianceViewExportAll', 'Export complete')
            )}</span>
          </button>
        </div>
      </div>
      <div id="dashAllianceViewTables" class="dash-alliance-table-region"></div>
    </section>

    <input id="dashAllianceRosterFile" class="dash-native-file-input" type="file"
      accept=".csv,text/csv" aria-hidden="true" tabindex="-1" />
    ${renderImportDialog(state)}
    ${renderEditorDialog(state)}
  `;
}

function renderFilterSelect(id, filter, label, options) {
  return `<label class="dash-alliance-control" for="${id}">
    <span>${escapeHtml(label)}</span>
    <select id="${id}" class="dash-select" data-filter="${filter}">
      ${options
        .map(([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`)
        .join('')}
    </select>
  </label>`;
}

function renderFilterInput(id, filter, label, type, min) {
  return `<label class="dash-alliance-control" for="${id}">
    <span>${escapeHtml(label)}</span>
    <input id="${id}" class="dash-input" data-filter="${filter}" type="${type}" min="${min}" inputmode="numeric" />
  </label>`;
}

function renderImportDialog(state) {
  const { tr } = state;
  return `<dialog id="dashAllianceImportDialog" class="dash-alliance-dialog" aria-labelledby="dashAllianceImportTitle">
    <form method="dialog" class="dash-alliance-dialog-card">
      <header>
        <div>
          <p class="dash-alliance-kicker" ${keyedText(
            'adminAllianceViewImportKicker',
            tr('adminAllianceViewImportKicker', 'REVIEW BEFORE REPLACE')
          )}</p>
          <h3 id="dashAllianceImportTitle">${escapeHtml(
            tr('adminAllianceViewImportPreview', 'Roster import preview')
          )}</h3>
        </div>
        <button class="dash-btn dash-alliance-icon-btn" value="cancel" aria-label="${escapeHtml(
          tr('adminAllianceViewClose', 'Close')
        )}">×</button>
      </header>
      <div id="dashAllianceImportBody" class="dash-alliance-import-body"></div>
      <footer>
        <button class="dash-btn" value="cancel">
          <span ${keyedText('adminAllianceViewCancel', tr('adminAllianceViewCancel', 'Cancel'))}</span>
        </button>
        <button class="dash-btn dash-btn-primary" type="button" data-action="apply-import">
          <span ${keyedText(
            'adminAllianceViewReplaceRoster',
            tr('adminAllianceViewReplaceRoster', 'Replace roster')
          )}</span>
        </button>
      </footer>
    </form>
  </dialog>`;
}

function renderEditorDialog(state) {
  const { tr } = state;
  return `<dialog id="dashAllianceEditorDialog" class="dash-alliance-dialog" aria-labelledby="dashAllianceEditorTitle">
    <form id="dashAllianceEditorForm" class="dash-alliance-dialog-card">
      <header>
        <div>
          <p class="dash-alliance-kicker" ${keyedText(
            'adminAllianceViewEditorKicker',
            tr('adminAllianceViewEditorKicker', 'ACCOUNT-SPECIFIC RECORD')
          )}</p>
          <h3 id="dashAllianceEditorTitle">${escapeHtml(
            tr('adminAllianceViewEditAccount', 'Edit account')
          )}</h3>
        </div>
        <button class="dash-btn dash-alliance-icon-btn" type="button" data-action="close-editor" aria-label="${escapeHtml(
          tr('adminAllianceViewClose', 'Close')
        )}">×</button>
      </header>
      <div class="dash-alliance-editor-grid">
        ${editorInput('name', tr('adminAllianceViewFieldName', 'Account name'), true)}
        <label class="dash-alliance-control" for="dashAllianceEditAlliance">
          <span>${escapeHtml(tr('adminAllianceViewFieldAlliance', 'Alliance'))}</span>
          <select id="dashAllianceEditAlliance" class="dash-select" name="allianceId" required>
            <option value="v3s">V3S</option><option value="vts">VTS</option>
          </select>
        </label>
        ${editorInput('rank', tr('adminAllianceViewFieldRank', 'Roster rank'))}
        ${editorInput('server', tr('adminAllianceViewFieldServer', 'Server'))}
        ${editorInput('castleLevel', tr('adminAllianceViewFieldCastle', 'Castle level'), false, 'number')}
        ${editorInput('totalPower', tr('adminAllianceViewFieldPower', 'Total power'), false, 'number')}
        ${editorInput('lastOnline', tr('adminAllianceViewFieldLastOnline', 'Last Online text'))}
        ${editorInput(
          'activityAt',
          tr('adminAllianceViewFieldActivityAt', 'Activity timestamp'),
          false,
          'datetime-local'
        )}
        <label class="dash-alliance-control dash-alliance-control-full" for="dashAllianceEditEden">
          <span>${escapeHtml(tr('adminAllianceViewFieldEdenMatch', 'Eden account match'))}</span>
          <select id="dashAllianceEditEden" class="dash-select" name="edenSourceId">
            <option value="">${escapeHtml(
              tr('adminAllianceViewNoEdenMatch', 'No Eden match — zero contribution')
            )}</option>
          </select>
          <small>${escapeHtml(
            tr(
              'adminAllianceViewEdenUniqueHint',
              'One Eden source can belong to only one roster account.'
            )
          )}</small>
        </label>
      </div>
      <div id="dashAllianceEditorError" class="dash-alliance-form-error" role="alert" tabindex="-1"></div>
      <footer>
        <button class="dash-btn" type="button" data-action="close-editor">
          <span ${keyedText('adminAllianceViewCancel', tr('adminAllianceViewCancel', 'Cancel'))}</span>
        </button>
        <button class="dash-btn dash-btn-primary" type="submit">
          <span ${keyedText(
            'adminAllianceViewSaveAccount',
            tr('adminAllianceViewSaveAccount', 'Save account')
          )}</span>
        </button>
      </footer>
    </form>
  </dialog>`;
}

function editorInput(name, label, required = false, type = 'text') {
  const id = `dashAllianceEdit${name[0].toUpperCase()}${name.slice(1)}`;
  return `<label class="dash-alliance-control" for="${id}">
    <span>${escapeHtml(label)}</span>
    <input id="${id}" class="dash-input" name="${name}" type="${type}" ${
      required ? 'required' : ''
    } ${type === 'number' ? 'min="0" inputmode="numeric"' : ''} />
  </label>`;
}

function bindEvents(state, options) {
  const { root } = state;
  state.eventsAbort?.abort();
  state.eventsAbort = new AbortController();
  const { signal } = state.eventsAbort;
  root.addEventListener(
    'click',
    async (event) => {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      try {
        if (button.dataset.view) {
          state.view = button.dataset.view;
          updatePressedGroup(root, '[data-view]', 'view', state.view);
          renderResults(state);
          return;
        }
        if (button.dataset.layout) {
          state.layout = button.dataset.layout;
          updatePressedGroup(root, '[data-layout]', 'layout', state.layout);
          renderTables(state);
          return;
        }
        if (button.dataset.sort) {
          const key = button.dataset.sort;
          state.sort = {
            key,
            direction: state.sort.key === key && state.sort.direction === 'desc' ? 'asc' : 'desc',
          };
          renderResults(state);
          return;
        }
        const action = button.dataset.action;
        if (!action) return;
        if (action === 'import') beginImport(state, button.dataset.alliance);
        if (action === 'add') openEditor(state, null, 'v3s');
        if (action === 'clear-filters') clearFilters(state);
        if (action === 'export-filtered') exportRows(state, state.visibleRows, 'filtered');
        if (action === 'export-all') exportRows(state, rankRows(state, state.rows), 'complete');
        if (action === 'toggle-row') toggleRow(state, button.dataset.memberId, button);
        if (action === 'edit') openEditorById(state, button.dataset.memberId);
        if (action === 'remove') await removeMember(state, button.dataset.memberId);
        if (action === 'reset') await resetMember(state, button.dataset.memberId);
        if (action === 'confirm-name') await confirmMemberName(state, button.dataset.memberId);
        if (action === 'confirm-match') openEditorById(state, button.dataset.memberId, true);
        if (action === 'confirm-import-rename') {
          toggleImportRename(state, Number(button.dataset.renameIndex));
        }
        if (action === 'apply-import') await applyImport(state);
        if (action === 'close-editor') closeEditor(state);
      } catch (error) {
        showStatus(state, localizedError(state, error), 'error');
      }
    },
    { signal }
  );

  root.addEventListener(
    'input',
    (event) => {
      if (event.target.id === 'dashAllianceSearch') {
        state.filters.search = event.target.value;
        renderResults(state);
      }
      if (event.target.matches('[data-filter]')) {
        state.filters[event.target.dataset.filter] = event.target.value;
        renderResults(state);
      }
    },
    { signal }
  );

  root.addEventListener(
    'change',
    (event) => {
      if (event.target.id === 'dashAllianceMetric') {
        state.metric = event.target.value;
        state.sort = { key: 'score', direction: 'desc' };
        renderSummary(state);
        renderResults(state);
      }
      if (event.target.matches('input[name="columns"]')) {
        if (event.target.checked) state.columns.add(event.target.value);
        else state.columns.delete(event.target.value);
        renderTables(state);
      }
    },
    { signal }
  );

  root
    .querySelector('#dashAllianceRosterFile')
    ?.addEventListener('change', (event) => readRosterFile(state, event.target.files?.[0]), {
      signal,
    });
  root
    .querySelector('#dashAllianceEditorForm')
    ?.addEventListener('submit', (event) => saveEditor(state, event), { signal });

  for (const dialog of root.querySelectorAll('dialog')) {
    dialog.addEventListener(
      'click',
      (event) => {
        if (event.target === dialog) dialog.close('cancel');
      },
      { signal }
    );
  }

  if (typeof options.onReady === 'function') options.onReady({ root });
}

function restoreControlState(state) {
  const search = state.root.querySelector('#dashAllianceSearch');
  if (search) search.value = state.filters.search;
  const metric = state.root.querySelector('#dashAllianceMetric');
  if (metric) metric.value = state.metric;
  for (const control of state.root.querySelectorAll('[data-filter]')) {
    control.value = state.filters[control.dataset.filter] ?? '';
  }
  for (const checkbox of state.root.querySelectorAll('input[name="columns"]')) {
    checkbox.checked = state.columns.has(checkbox.value);
  }
  updatePressedGroup(state.root, '[data-view]', 'view', state.view);
  updatePressedGroup(state.root, '[data-layout]', 'layout', state.layout);
}

function updatePressedGroup(root, selector, dataKey, active) {
  for (const button of root.querySelectorAll(selector)) {
    const selected = button.dataset[dataKey] === active;
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('dash-btn-primary', selected);
  }
}

function rebuildRows(state) {
  const members = rosterMembers(state.rosters).map((member) => ({
    ...member,
    activityAtMs: Object.prototype.hasOwnProperty.call(member?.overrides || {}, 'activityAtMs')
      ? member.overrides.activityAtMs
      : member.activityAtMs,
    activityRaw: Object.prototype.hasOwnProperty.call(member?.overrides || {}, 'lastOnline')
      ? member.overrides.lastOnline
      : member.activityRaw,
  }));
  const edenRows = stableEdenRows(state.contributionModel);
  try {
    const matches = AllianceModel.matchRosterAccounts(members, edenRows, {
      registryAliases:
        state.contributionModel?.registryAliases || state.contributionModel?.playerRegistry || [],
    });
    state.rows = AllianceModel.buildAllianceViewRows(matches, {
      activeMode:
        state.contributionModel?.activeMode ||
        state.contributionModel?.rankingMode ||
        state.contributionModel?.mode ||
        'extended',
    });
  } catch (error) {
    console.warn('ALLIANCE VIEW MODEL FALLBACK:', error);
    state.rows = buildFallbackRows(members, edenRows);
  }
  populateDynamicFilters(state);
  renderSummary(state);
  renderResults(state);
}

function populateDynamicFilters(state) {
  const configs = [
    ['#dashAllianceFilterRank', 'rank'],
    ['#dashAllianceFilterServer', 'server'],
  ];
  for (const [selector, key] of configs) {
    const select = state.root.querySelector(selector);
    if (!select) continue;
    const selected = state.filters[key];
    const allText = state.tr('adminAllianceViewFilterAll', 'All');
    select.replaceChildren(new Option(allText, ''));
    for (const value of uniqueValues(state.rows, key)) select.add(new Option(value, value));
    select.value = selected;
  }
  populateEdenOptions(state);
}

function populateEdenOptions(state, selected) {
  const select = state.root.querySelector('#dashAllianceEditEden');
  if (!select) return;
  const desiredSelection = selected === undefined ? select.value : selected;
  const edenRows = stableEdenRows(state.contributionModel);
  const first = new Option(
    state.tr('adminAllianceViewNoEdenMatch', 'No Eden match — zero contribution'),
    ''
  );
  select.replaceChildren(first);
  edenRows
    .map((row, index) => ({
      id: contributionSourceId(row, index),
      name: contributionSourceName(row) || contributionSourceId(row, index),
      score: numberValue(row?.weightedScore ?? row?.extended ?? row?.contributionScore),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .forEach((row) => select.add(new Option(`${row.name} · ${formatNumber(row.score)}`, row.id)));
  select.value = desiredSelection;
}

function filterRows(state, rows) {
  const search = state.filters.search.toLocaleLowerCase();
  const now = Date.now();
  return rows.filter((row) => {
    const haystack = [
      row.accountName,
      row.alliance,
      row.allianceId,
      row.rank,
      row.server,
      row.edenSourceName,
      row.matchMethod,
    ]
      .join(' ')
      .toLocaleLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (state.filters.alliance && row.allianceId !== state.filters.alliance) return false;
    if (state.filters.rank && cleanText(row.rank) !== state.filters.rank) return false;
    if (state.filters.server && cleanText(row.server) !== state.filters.server) return false;
    if (
      state.filters.castleMin &&
      numberValue(row.castleLevel) < numberValue(state.filters.castleMin)
    )
      return false;
    if (state.filters.powerMin && numberValue(row.totalPower) < numberValue(state.filters.powerMin))
      return false;
    const selectedMetricValue = rowMetric(row, state.metric);
    if (
      state.filters.metricMin !== '' &&
      selectedMetricValue < numberValue(state.filters.metricMin)
    )
      return false;
    if (
      state.filters.metricMax !== '' &&
      selectedMetricValue > numberValue(state.filters.metricMax)
    )
      return false;
    if (state.filters.activity && activityBand(row.activityAtMs, now) !== state.filters.activity)
      return false;
    if (state.filters.matchStatus && normalizedMatchStatus(row) !== state.filters.matchStatus)
      return false;
    return true;
  });
}

function metricRankRows(state, rows) {
  let ranked;
  try {
    ranked = AllianceModel.rankAllianceRows(rows, {
      metric: state.metric,
      direction: 'desc',
    });
  } catch {
    ranked = [...rows].sort((a, b) => {
      return (
        rowMetric(b, state.metric) - rowMetric(a, state.metric) ||
        cleanText(a.accountName).localeCompare(cleanText(b.accountName))
      );
    });
  }
  return ranked.map((row, index) => ({
    ...row,
    metricRank: index + 1,
    allianceViewRank: index + 1,
  }));
}

function sortRowsForDisplay(state, rows) {
  const factor = state.sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (['accountName', 'alliance', 'rank', 'server'].includes(state.sort.key)) {
      const left = state.sort.key === 'alliance' ? a.allianceId : a[state.sort.key];
      const right = state.sort.key === 'alliance' ? b.allianceId : b[state.sort.key];
      const comparison = cleanText(left).localeCompare(cleanText(right), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      return factor * comparison || a.allianceViewRank - b.allianceViewRank;
    }
    const av =
      state.sort.key === 'score' ? rowMetric(a, state.metric) : numberValue(a[state.sort.key]);
    const bv =
      state.sort.key === 'score' ? rowMetric(b, state.metric) : numberValue(b[state.sort.key]);
    return factor * (av - bv) || a.allianceViewRank - b.allianceViewRank;
  });
}

function rankRows(state, rows) {
  return sortRowsForDisplay(state, metricRankRows(state, rows));
}

function renderResults(state) {
  const filtered = filterRows(state, state.rows);
  const metricRanked = metricRankRows(state, filtered);
  const selected = state.view === 'top100' ? metricRanked.slice(0, 100) : metricRanked;
  state.visibleRows = sortRowsForDisplay(state, selected);
  const count = state.root.querySelector('#dashAllianceViewResultCount');
  if (count) {
    const configuredMode = cleanText(
      state.contributionModel?.activeMode ||
        state.contributionModel?.rankingMode ||
        state.contributionModel?.mode
    ).toLowerCase();
    const activeMode =
      configuredMode === 'base' || configuredMode === 'default'
        ? state.tr('adminAllianceViewMetricBase', 'Base')
        : state.tr('adminAllianceViewMetricExtended', 'Extended Weighted');
    count.textContent = state.tr(
      'adminAllianceViewResultCount',
      '{shown} of {total} accounts shown · Active admin mode: {mode}',
      { shown: state.visibleRows.length, total: state.rows.length, mode: activeMode }
    );
  }
  const activeFilterCount = Object.values(state.filters).filter(Boolean).length;
  const filterCount = state.root.querySelector('#dashAllianceFilterCount');
  if (filterCount) {
    filterCount.textContent = String(activeFilterCount);
    filterCount.dataset.active = String(activeFilterCount > 0);
    filterCount.setAttribute(
      'aria-label',
      state.tr('adminAllianceViewActiveFilters', '{count} active filters', {
        count: activeFilterCount,
      })
    );
  }
  renderTables(state);
}

function renderSummary(state) {
  let ranked;
  try {
    ranked = metricRankRows(state, state.rows);
  } catch {
    ranked = [...state.rows].sort(
      (left, right) =>
        rowMetric(right, state.metric) - rowMetric(left, state.metric) ||
        cleanText(left.accountName).localeCompare(cleanText(right.accountName))
    );
  }
  ranked = ranked.slice(0, 100);
  const matched = state.rows.filter((row) => normalizedMatchStatus(row) === 'matched').length;
  const unmatched = state.rows.length - matched;
  const v3sTop = ranked.filter((row) => row.allianceId === 'v3s').length;
  const vtsTop = ranked.filter((row) => row.allianceId === 'vts').length;
  const items = [
    ['accounts', state.rows.length, 'adminAllianceViewSummaryAccounts', 'Accounts'],
    ['matched', matched, 'adminAllianceViewSummaryMatched', 'Matched'],
    ['unmatched', unmatched, 'adminAllianceViewSummaryUnmatched', 'Unmatched'],
    ['v3s', v3sTop, 'adminAllianceViewSummaryV3sTop', 'V3S in Top 100'],
    ['vts', vtsTop, 'adminAllianceViewSummaryVtsTop', 'VTS in Top 100'],
  ];
  const target = state.root.querySelector('#dashAllianceViewSummary');
  if (!target) return;
  target.innerHTML = items
    .map(
      ([
        tone,
        value,
        key,
        fallback,
      ]) => `<article class="dash-alliance-summary-card" data-tone="${tone}">
        <strong>${formatNumber(value)}</strong>
        <span data-admin-i18n="${key}">${escapeHtml(state.tr(key, fallback))}</span>
      </article>`
    )
    .join('');
}

function renderTables(state) {
  const target = state.root.querySelector('#dashAllianceViewTables');
  if (!target) return;
  if (!state.visibleRows.length) {
    target.innerHTML = `<div class="dash-empty dash-alliance-empty">
      <strong>${escapeHtml(state.tr('adminAllianceViewNoResults', 'No accounts match this view.'))}</strong>
      <span>${escapeHtml(
        state.tr('adminAllianceViewNoResultsHint', 'Clear filters or import an alliance roster.')
      )}</span>
    </div>`;
    return;
  }
  if (state.layout === 'split') {
    target.innerHTML = ALLIANCE_IDS.map((allianceId) => {
      const rows = state.visibleRows.filter((row) => row.allianceId === allianceId);
      return `<section class="dash-alliance-split-section" aria-labelledby="dashAllianceHeading-${allianceId}">
        <header><h3 id="dashAllianceHeading-${allianceId}">${allianceId.toUpperCase()}</h3>
          <span>${escapeHtml(
            state.tr('adminAllianceViewAccountCount', '{count} accounts', { count: rows.length })
          )}</span></header>
        ${rows.length ? renderTable(state, rows, allianceId) : renderEmptyAlliance(state)}
      </section>`;
    }).join('');
  } else {
    target.innerHTML = renderTable(state, state.visibleRows, 'combined');
  }
}

function renderEmptyAlliance(state) {
  return `<div class="dash-empty">${escapeHtml(
    state.tr(
      'adminAllianceViewNoAllianceRows',
      'No accounts from this alliance in the current view.'
    )
  )}</div>`;
}

function renderTable(state, rows, suffix) {
  const visibleColumns = COLUMN_DEFINITIONS.filter(([key]) => state.columns.has(key));
  const headerCells = visibleColumns
    .map(([key, translationKey, fallback]) => {
      const sortKey = key === 'accountName' || key === 'alliance' ? key : sortableRowKey(key);
      const active =
        state.sort.key === sortKey || (state.sort.key === 'score' && sortKey === state.metric);
      const direction = active ? state.sort.direction : 'none';
      return `<th scope="col" data-column="${key}" aria-sort="${
        active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }"><button type="button" data-sort="${sortKey}">
        <span data-admin-i18n="${translationKey}">${escapeHtml(
          state.tr(translationKey, fallback)
        )}</span><span class="dash-alliance-sort" aria-hidden="true">${
          active ? (direction === 'asc' ? '↑' : '↓') : '↕'
        }</span>
      </button></th>`;
    })
    .join('');
  const colSpan = visibleColumns.length + 2;
  const caption = state.tr('adminAllianceViewTableCaption', 'Ranked alliance accounts');
  return `<div class="dash-alliance-table-wrap" role="region" tabindex="0" aria-label="${escapeHtml(
    caption
  )}">
    <table class="dash-alliance-table" id="dashAllianceTable-${suffix}">
      <caption class="sr-only">${escapeHtml(caption)}</caption>
      <thead><tr>
        <th scope="col" class="dash-alliance-position">#</th>
        ${headerCells}
        <th scope="col" class="dash-alliance-expand-heading"><span class="sr-only">${escapeHtml(
          state.tr('adminAllianceViewDetails', 'Details')
        )}</span></th>
      </tr></thead>
      <tbody>${rows.map((row) => renderRow(state, row, visibleColumns, colSpan)).join('')}</tbody>
    </table>
  </div>`;
}

function sortableRowKey(column) {
  return (
    {
      activity: 'activityAtMs',
      rank: 'rank',
      server: 'server',
      castle: 'castleLevel',
      power: 'totalPower',
      match: 'matchConfidence',
      base: 'base',
      extended: 'extended',
      active: 'active',
      bonus: 'bonusTeamEffort',
    }[column] || 'score'
  );
}

function renderRow(state, row, visibleColumns, colSpan) {
  const memberId = escapeHtml(row.id);
  const expanded = state.expanded.has(row.id);
  const cells = visibleColumns.map(([key]) => renderCell(state, row, key)).join('');
  return `<tr class="dash-alliance-row" data-member-id="${memberId}">
      <td class="dash-alliance-position" data-label="#"><strong>${formatNumber(
        row.allianceViewRank
      )}</strong></td>
      ${cells}
      <td class="dash-alliance-expand-cell">
        <button class="dash-alliance-expand" type="button" data-action="toggle-row"
          data-member-id="${memberId}" data-account-name="${escapeHtml(
            row.accountName
          )}" aria-expanded="${expanded}" aria-controls="dashAllianceDetails-${memberId}"
          aria-label="${escapeHtml(
            state.tr('adminAllianceViewToggleDetails', 'Show details for {name}', {
              name: row.accountName,
            })
          )}">${expanded ? '−' : '+'}</button>
      </td>
    </tr>
    <tr id="dashAllianceDetails-${memberId}" class="dash-alliance-detail-row ${
      expanded ? '' : 'hidden'
    }" data-detail-for="${memberId}">
      <td colspan="${colSpan}">${renderRowDetails(state, row)}</td>
    </tr>`;
}

function renderCell(state, row, key) {
  const definition = COLUMN_DEFINITIONS.find(([column]) => column === key);
  const label = definition ? state.tr(definition[1], definition[2]) : key;
  if (key === 'accountName') {
    return `<th scope="row" data-label="${escapeHtml(label)}"><div class="dash-alliance-name">
      <strong>${escapeHtml(row.accountName || state.tr('adminAllianceViewUnnamed', 'Unnamed'))}</strong>
      <small>${escapeHtml(row.id)}</small>
    </div></th>`;
  }
  if (key === 'alliance') {
    return `<td data-label="${escapeHtml(label)}"><span class="dash-alliance-tag" data-alliance="${escapeHtml(
      row.allianceId
    )}">${escapeHtml((row.alliance || row.allianceId).toUpperCase())}</span></td>`;
  }
  if (key === 'activity') return renderActivityCell(state, row, label);
  if (key === 'rank') return plainCell(label, row.rank || '—');
  if (key === 'server') return plainCell(label, row.server || '—');
  if (key === 'castle') return plainCell(label, row.castleLevel ?? '—');
  if (key === 'power') return numericCell(label, row.totalPower);
  if (key === 'match') return renderMatchCell(state, row, label);
  if (key === 'base') return numericCell(label, row.base, 'dash-alliance-score');
  if (key === 'extended') {
    const band = extendedBand(row.extended);
    return `<td data-label="${escapeHtml(label)}"><span class="dash-alliance-score" data-score-band="${band}" aria-label="${escapeHtml(
      state.tr('adminAllianceViewExtendedScoreLabel', 'Extended score {score}, {band} band', {
        score: formatNumber(row.extended),
        band: extendedBandLabel(state, band),
      })
    )}">${formatNumber(row.extended)}<small>${escapeHtml(extendedBandLabel(state, band))}</small></span></td>`;
  }
  if (key === 'active') return numericCell(label, row.active, 'dash-alliance-score');
  if (key === 'bonus') return renderBonusCell(state, row, label);
  return plainCell(label, row[key] ?? '—');
}

function plainCell(label, value) {
  return `<td data-label="${escapeHtml(label)}">${escapeHtml(value)}</td>`;
}

function numericCell(label, value, className = '') {
  const empty = value === null || value === undefined || value === '';
  return `<td data-label="${escapeHtml(label)}"><span class="${className}">${
    empty ? '—' : formatNumber(value)
  }</span></td>`;
}

function renderActivityCell(state, row, label) {
  const band = activityBand(row.activityAtMs);
  const text = activityLabel(state, band);
  const raw = cleanText(row.activityRaw);
  const age = activityAge(row.activityAtMs);
  return `<td data-label="${escapeHtml(label)}"><span class="dash-alliance-activity" data-activity="${band}"
    aria-label="${escapeHtml(`${text}${raw ? `: ${raw}` : ''}`)}"><span aria-hidden="true">${
      { current: '●', watch: '▲', stale: '!', unknown: '?' }[band]
    }</span><span>${escapeHtml(raw || age || text)}</span><small>${escapeHtml(text)}</small></span></td>`;
}

function renderMatchCell(state, row, label) {
  const status = normalizedMatchStatus(row);
  const statusText =
    status === 'matched'
      ? state.tr('adminAllianceViewMatched', 'Matched')
      : status === 'suggested'
        ? state.tr('adminAllianceViewSuggested', 'Needs review')
        : state.tr('adminAllianceViewUnmatched', 'Unmatched');
  return `<td data-label="${escapeHtml(label)}"><span class="dash-alliance-match" data-match="${status}">
    <span aria-hidden="true">${status === 'matched' ? '✓' : status === 'suggested' ? '!' : '○'}</span>
    <span><strong>${escapeHtml(statusText)}</strong><small>${escapeHtml(
      row.edenSourceName ||
        matchMethodLabel(state, row.matchMethod) ||
        state.tr('adminAllianceViewZeroContribution', '0 contribution')
    )}</small></span></span></td>`;
}

function renderBonusCell(state, row, label) {
  const value = numberValue(row.bonusTeamEffort);
  const band = bonusBand(value);
  const sign = value > 0 ? '+' : '';
  return `<td data-label="${escapeHtml(label)}"><span class="dash-alliance-bonus" data-bonus="${band}"
    aria-label="${escapeHtml(
      state.tr('adminAllianceViewBonusLabel', 'Bonus Team Effort {value}, {band}', {
        value: `${sign}${formatNumber(value)}`,
        band: bonusBandLabel(state, band),
      })
    )}"><span aria-hidden="true">${bonusIcon(band)}</span>${sign}${formatNumber(value)}<small>${escapeHtml(
      bonusBandLabel(state, band)
    )}</small></span></td>`;
}

function renderRowDetails(state, row) {
  const breakdown = [
    ['adminAllianceViewMetricContribution', 'Contribution', row.contribution],
    ['adminAllianceViewMetricExGuild', 'Ex-guild', row.exGuild],
    ['adminAllianceViewMetricBanners', 'Banners', row.banners],
    ['adminAllianceViewMetricPathers', 'Pathers', row.pathers],
    ['adminAllianceViewMetricShieldWalls', 'Shield walls', row.shieldWalls],
    ['adminAllianceViewMetricBonus', 'Bonus Team Effort', row.bonusTeamEffort],
  ];
  const matchStatus = normalizedMatchStatus(row);
  return `<div class="dash-alliance-detail-grid">
    <section>
      <h4>${escapeHtml(state.tr('adminAllianceViewFullBreakdown', 'Full contribution breakdown'))}</h4>
      <dl class="dash-alliance-breakdown">${breakdown
        .map(
          ([key, fallback, value]) =>
            `<div><dt>${escapeHtml(
              state.tr(key, fallback)
            )}</dt><dd>${formatNumber(value)}</dd></div>`
        )
        .join('')}
        <div><dt>${escapeHtml(state.tr('adminAllianceViewColumnBase', 'Base'))}</dt><dd>${formatNumber(
          row.base
        )}</dd></div>
        <div><dt>${escapeHtml(
          state.tr('adminAllianceViewColumnExtended', 'Extended')
        )}</dt><dd>${formatNumber(row.extended)}</dd></div>
      </dl>
      <p class="dash-alliance-formula">${escapeHtml(
        state.tr(
          'adminAllianceViewFormula',
          'Extended = Contribution + Ex-guild + 10,000 × (Banners + Pathers + Shield Walls + signed Bonus Team Effort)'
        )
      )}</p>
    </section>
    <section>
      <h4>${escapeHtml(state.tr('adminAllianceViewMatchAudit', 'Match audit'))}</h4>
      <dl class="dash-alliance-audit">
        <div><dt>${escapeHtml(state.tr('adminAllianceViewMatchStatus', 'Status'))}</dt><dd>${escapeHtml(
          matchStatusLabel(state, matchStatus)
        )}</dd></div>
        <div><dt>${escapeHtml(state.tr('adminAllianceViewMatchMethod', 'Method'))}</dt><dd>${escapeHtml(
          matchMethodLabel(state, row.matchMethod) || '—'
        )}</dd></div>
        <div><dt>${escapeHtml(state.tr('adminAllianceViewEdenSource', 'Eden source'))}</dt><dd>${escapeHtml(
          row.edenSourceName || row.edenSourceId || '—'
        )}</dd></div>
        <div><dt>${escapeHtml(
          state.tr('adminAllianceViewMatchConfidence', 'Confidence')
        )}</dt><dd>${
          Number.isFinite(Number(row.matchConfidence))
            ? `${Math.round(Number(row.matchConfidence) * 100)}%`
            : '—'
        }</dd></div>
        <div><dt>${escapeHtml(state.tr('adminAllianceViewMatchReason', 'Reason'))}</dt><dd>${escapeHtml(
          matchReasonLabel(state, row.matchReason) || '—'
        )}</dd></div>
        <div><dt>${escapeHtml(
          state.tr('adminAllianceViewKnownNames', 'Known names')
        )}</dt><dd>${escapeHtml((row.member?.knownNames || []).join(' · ') || '—')}</dd></div>
      </dl>
      <div class="dash-card-actions dash-alliance-row-actions">
        <button class="dash-btn dash-btn-small" type="button" data-action="edit" data-member-id="${escapeHtml(
          row.id
        )}">${escapeHtml(state.tr('adminAllianceViewEdit', 'Edit'))}</button>
        <button class="dash-btn dash-btn-small" type="button" data-action="reset" data-member-id="${escapeHtml(
          row.id
        )}">${escapeHtml(state.tr('adminAllianceViewResetImported', 'Reset imported values'))}</button>
        <button class="dash-btn dash-btn-small" type="button" data-action="confirm-name" data-member-id="${escapeHtml(
          row.id
        )}">${escapeHtml(state.tr('adminAllianceViewConfirmName', 'Confirm name change'))}</button>
        ${
          matchStatus === 'suggested'
            ? `<button class="dash-btn dash-btn-small dash-btn-primary" type="button" data-action="confirm-match" data-member-id="${escapeHtml(
                row.id
              )}">${escapeHtml(state.tr('adminAllianceViewReviewMatch', 'Review match'))}</button>`
            : ''
        }
        <button class="dash-btn dash-btn-small dash-alliance-danger" type="button" data-action="remove" data-member-id="${escapeHtml(
          row.id
        )}">${escapeHtml(state.tr('adminAllianceViewRemove', 'Remove'))}</button>
      </div>
    </section>
  </div>`;
}

function matchStatusLabel(state, status) {
  return {
    matched: state.tr('adminAllianceViewMatched', 'Matched'),
    suggested: state.tr('adminAllianceViewSuggested', 'Needs review'),
    unmatched: state.tr('adminAllianceViewUnmatched', 'Unmatched'),
  }[status];
}

function matchMethodLabel(state, method) {
  const key = cleanText(method);
  return (
    {
      exact_source_name: state.tr('adminAllianceViewMethodExact', 'Exact source name'),
      unique_normalized_name: state.tr(
        'adminAllianceViewMethodNormalized',
        'Unique normalized name'
      ),
      verified_registry_alias: state.tr(
        'adminAllianceViewMethodRegistryAlias',
        'Verified registry alias'
      ),
      manual_account_mapping: state.tr('adminAllianceViewMethodManual', 'Manual assignment'),
      fuzzy_suggestion: state.tr('adminAllianceViewMethodFuzzy', 'Fuzzy suggestion'),
      none: state.tr('adminAllianceViewMethodNone', 'No match'),
    }[key] || key
  );
}

function matchReasonLabel(state, reason) {
  const key = cleanText(reason);
  return (
    {
      no_match: state.tr('adminAllianceViewReasonNoMatch', 'No matching Eden account'),
      fuzzy_requires_confirmation: state.tr(
        'adminAllianceViewReasonFuzzyReview',
        'Fuzzy match requires confirmation'
      ),
      fuzzy_candidates_close: state.tr(
        'adminAllianceViewReasonFuzzyClose',
        'Multiple fuzzy candidates are close'
      ),
      multiple_exact_sources: state.tr(
        'adminAllianceViewReasonExactAmbiguous',
        'Multiple exact Eden sources'
      ),
      normalized_name_not_unique: state.tr(
        'adminAllianceViewReasonNormalizedAmbiguous',
        'Normalized name is not unique'
      ),
      eden_source_already_assigned: state.tr(
        'adminAllianceViewReasonDuplicate',
        'Eden source is already assigned'
      ),
      manual_source_not_found: state.tr(
        'adminAllianceViewReasonMissingManual',
        'Saved manual source no longer exists'
      ),
    }[key] || key
  );
}

function normalizedMatchStatus(row) {
  const status = cleanText(row?.matchStatus).toLowerCase();
  if (
    row?.requiresConfirmation ||
    status.includes('fuzzy') ||
    status.includes('suggest') ||
    status.includes('ambiguous') ||
    status.includes('conflict') ||
    status.includes('missing')
  ) {
    return 'suggested';
  }
  if (status === 'matched' || status === 'manual' || row?.edenSourceId || row?.edenSourceName) {
    return 'matched';
  }
  return 'unmatched';
}

function activityBand(timestamp, now = Date.now()) {
  const value = nullableNumber(timestamp);
  if (value === null) return 'unknown';
  const age = Math.max(0, now - value);
  if (age <= 48 * 60 * 60 * 1000) return 'current';
  if (age <= 7 * 24 * 60 * 60 * 1000) return 'watch';
  return 'stale';
}

function activityAge(timestamp) {
  const value = nullableNumber(timestamp);
  if (value === null) return '';
  const hours = Math.max(0, (Date.now() - value) / 3600000);
  const unit = hours < 48 ? 'hour' : 'day';
  const amount = unit === 'hour' ? Math.round(hours) : Math.round(hours / 24);
  try {
    return new Intl.RelativeTimeFormat(document.documentElement.lang || undefined, {
      numeric: 'always',
      style: 'short',
    }).format(-amount, unit);
  } catch {
    return `${formatNumber(amount)} ${unit === 'hour' ? 'h' : 'd'}`;
  }
}

function activityLabel(state, band) {
  return {
    current: state.tr('adminAllianceViewActivityCurrent', 'Within 48 hours'),
    watch: state.tr('adminAllianceViewActivityWatch', '48 hours–7 days'),
    stale: state.tr('adminAllianceViewActivityStale', 'Over 7 days'),
    unknown: state.tr('adminAllianceViewActivityUnknown', 'Unknown'),
  }[band];
}

function bonusBand(value) {
  if (value < 0) return 'negative';
  if (value === 0) return 'zero';
  if (value <= 2) return 'teal';
  if (value <= 5) return 'green';
  return 'gold';
}

function bonusIcon(band) {
  return { negative: '▼', zero: '•', teal: '◆', green: '▲', gold: '★' }[band];
}

function bonusBandLabel(state, band) {
  return {
    negative: state.tr('adminAllianceViewBonusNegative', 'Negative'),
    zero: state.tr('adminAllianceViewBonusZero', 'Zero'),
    teal: state.tr('adminAllianceViewBonusTeal', '+1–2'),
    green: state.tr('adminAllianceViewBonusGreen', '+3–5'),
    gold: state.tr('adminAllianceViewBonusGold', '+6 or more'),
  }[band];
}

function extendedBand(value) {
  const score = numberValue(value);
  if (score < 10000) return 'under10k';
  if (score < 50000) return '10k';
  if (score < 100000) return '50k';
  if (score < 200000) return '100k';
  return '200k';
}

function extendedBandLabel(state, band) {
  return {
    under10k: state.tr('adminAllianceViewBandUnder10k', 'Under 10k'),
    '10k': state.tr('adminAllianceViewBand10k', '10k–49,999'),
    '50k': state.tr('adminAllianceViewBand50k', '50k–99,999'),
    '100k': state.tr('adminAllianceViewBand100k', '100k–199,999'),
    '200k': state.tr('adminAllianceViewBand200k', '200k+'),
  }[band];
}

function toggleRow(state, memberId, button) {
  if (state.expanded.has(memberId)) state.expanded.delete(memberId);
  else state.expanded.add(memberId);
  const detail = state.root.querySelector(`[data-detail-for="${CSS.escape(memberId)}"]`);
  const expanded = state.expanded.has(memberId);
  detail?.classList.toggle('hidden', !expanded);
  button.setAttribute('aria-expanded', String(expanded));
  const accountName = cleanText(button.dataset.accountName);
  button.setAttribute(
    'aria-label',
    expanded
      ? `${state.tr('adminAllianceViewClose', 'Close')}: ${accountName}`
      : state.tr('adminAllianceViewToggleDetails', 'Show details for {name}', {
          name: accountName,
        })
  );
  button.textContent = expanded ? '−' : '+';
}

function clearFilters(state) {
  state.filters = {
    search: '',
    alliance: '',
    rank: '',
    server: '',
    castleMin: '',
    powerMin: '',
    metricMin: '',
    metricMax: '',
    activity: '',
    matchStatus: '',
  };
  const search = state.root.querySelector('#dashAllianceSearch');
  if (search) search.value = '';
  for (const control of state.root.querySelectorAll('[data-filter]')) control.value = '';
  renderResults(state);
}

function beginImport(state, allianceId) {
  if (!ALLIANCE_IDS.includes(allianceId)) return;
  state.importAllianceId = allianceId;
  const input = state.root.querySelector('#dashAllianceRosterFile');
  input.value = '';
  input.click();
}

async function readRosterFile(state, file) {
  if (!file || !state.importAllianceId) return;
  showStatus(
    state,
    state.tr('adminAllianceViewReadingRoster', 'Reading {alliance} roster…', {
      alliance: state.importAllianceId.toUpperCase(),
    }),
    'loading'
  );
  try {
    const csv = await file.text();
    const parsed = AllianceModel.parseAllianceRosterCsv(csv, {
      allianceId: state.importAllianceId,
      now: Date.now(),
      importedAt: Date.now(),
    });
    const current =
      state.rosters[state.importAllianceId] || makeEmptyRoster(state.importAllianceId);
    const preview = AllianceModel.reconcileAllianceRoster(current.members, parsed);
    state.importDraft = {
      allianceId: state.importAllianceId,
      parsed,
      preview,
      fileName: file.name,
      confirmedRenames: new Set(),
      expectedRevision: current.revision,
    };
    renderImportPreview(state);
    state.root.querySelector('#dashAllianceImportDialog')?.showModal();
  } catch (error) {
    showStatus(state, localizedError(state, error), 'error');
  }
}

function previewItems(preview, key) {
  const value = preview?.[key];
  return Array.isArray(value) ? value : [];
}

function previewItemName(item) {
  return cleanText(
    item?.name ||
      item?.accountName ||
      item?.member?.imported?.name ||
      item?.incoming?.imported?.name ||
      item?.after?.imported?.name ||
      item?.before?.imported?.name ||
      item?.row?.name ||
      item?.raw?.name ||
      (Array.isArray(item?.errors) ? item.errors.join(', ') : '') ||
      item?.reason
  );
}

function renderImportPreview(state) {
  const target = state.root.querySelector('#dashAllianceImportBody');
  const title = state.root.querySelector('#dashAllianceImportTitle');
  const { preview, parsed, allianceId, fileName } = state.importDraft;
  title.textContent = state.tr('adminAllianceViewImportTitle', '{alliance} import preview', {
    alliance: allianceId.toUpperCase(),
  });
  const categories = [
    ['added', 'adminAllianceViewPreviewAdded', 'Added', 'added'],
    ['removed', 'adminAllianceViewPreviewRemoved', 'Removed', 'removed'],
    ['updated', 'adminAllianceViewPreviewUpdated', 'Updated', 'updated'],
    ['malformed', 'adminAllianceViewPreviewMalformed', 'Malformed', 'malformed'],
    ['possibleRenamed', 'adminAllianceViewPreviewRenamed', 'Possible renamed', 'renamed'],
    ['unresolved', 'adminAllianceViewPreviewUnresolved', 'Unresolved', 'unresolved'],
  ];
  const headerErrors = parsed?.headerErrors || [];
  target.innerHTML = `<div class="dash-alliance-import-meta">
      <span>${escapeHtml(fileName)}</span><strong>${escapeHtml(allianceId.toUpperCase())}</strong>
    </div>
    ${
      headerErrors.length
        ? `<div class="dash-alliance-import-warning" role="alert"><strong>${escapeHtml(
            state.tr('adminAllianceViewHeaderError', 'CSV headers need attention')
          )}</strong><span>${escapeHtml(headerErrors.join(' · '))}</span></div>`
        : ''
    }
    ${
      preview?.hasBlockingErrors
        ? `<div class="dash-alliance-import-warning" role="alert"><strong>${escapeHtml(
            state.tr('adminAllianceViewImportBlocked', 'Resolve import issues before replacing')
          )}</strong><span>${escapeHtml(
            state.tr(
              'adminAllianceViewImportBlockedHint',
              'Malformed or unresolved rows must be corrected so no account is lost by accident.'
            )
          )}</span></div>`
        : ''
    }
    <div class="dash-alliance-preview-grid">${categories
      .map(([key, translationKey, fallback, tone]) => {
        const items = previewItems(preview, key);
        return `<section class="dash-alliance-preview-card" data-tone="${tone}">
          <header><strong>${formatNumber(items.length)}</strong><span>${escapeHtml(
            state.tr(translationKey, fallback)
          )}</span></header>
          <ul>${renderPreviewItems(state, key, items)}</ul>
          ${
            items.length > 12
              ? `<small>${escapeHtml(
                  state.tr('adminAllianceViewPreviewMore', '+{count} more', {
                    count: items.length - 12,
                  })
                )}</small>`
              : ''
          }
        </section>`;
      })
      .join('')}</div>
    <p class="dash-alliance-import-note">${escapeHtml(
      state.tr(
        'adminAllianceViewImportSafety',
        'Fuzzy and possible-renamed rows are never accepted automatically. Unmatched accounts stay visible with zero contribution.'
      )
    )}</p>`;
  const apply = state.root.querySelector('[data-action="apply-import"]');
  if (apply) apply.disabled = headerErrors.length > 0 || Boolean(preview?.hasBlockingErrors);
}

function renderPreviewItems(state, key, items) {
  if (!items.length) {
    return `<li>${escapeHtml(state.tr('adminAllianceViewPreviewNone', 'None'))}</li>`;
  }
  return items
    .slice(0, 12)
    .map((item, index) => {
      if (key !== 'possibleRenamed') {
        return `<li>${escapeHtml(previewItemName(item) || '—')}</li>`;
      }
      const before = accountName(item.before || {});
      const after = accountName(item.after || {});
      const confirmed = state.importDraft.confirmedRenames.has(index);
      return `<li class="dash-alliance-rename-review">
        <span><s>${escapeHtml(before || '—')}</s><span aria-hidden="true">→</span><strong>${escapeHtml(
          after || '—'
        )}</strong></span>
        <button class="dash-btn dash-btn-small ${confirmed ? 'dash-btn-primary' : ''}" type="button"
          data-action="confirm-import-rename" data-rename-index="${index}" aria-pressed="${confirmed}">${escapeHtml(
            confirmed
              ? state.tr('adminAllianceViewRenameConfirmed', 'Confirmed')
              : state.tr('adminAllianceViewConfirmRename', 'Confirm rename')
          )}</button>
      </li>`;
    })
    .join('');
}

function toggleImportRename(state, index) {
  if (!state.importDraft || !Number.isInteger(index)) return;
  if (state.importDraft.confirmedRenames.has(index)) {
    state.importDraft.confirmedRenames.delete(index);
  } else {
    state.importDraft.confirmedRenames.add(index);
  }
  renderImportPreview(state);
}

async function applyImport(state) {
  const draft = state.importDraft;
  if (!draft) return;
  const current = state.rosters[draft.allianceId];
  const nextMembers = [...(draft.preview?.nextMembers || draft.parsed?.rows || [])];
  const renameSuggestions = previewItems(draft.preview, 'possibleRenamed');
  for (const index of draft.confirmedRenames) {
    const suggestion = renameSuggestions[index];
    if (!suggestion?.before || !suggestion?.after) continue;
    const merged = AllianceModel.confirmRosterNameChange(suggestion.before, suggestion.after, {
      now: Date.now(),
    });
    merged.overrides = { ...(merged.overrides || {}) };
    delete merged.overrides.name;
    const previousMatch = state.rows.find(
      (row) => row.id === suggestion.before.id && normalizedMatchStatus(row) === 'matched'
    );
    if (!merged.edenAssignment && previousMatch?.edenSourceId) {
      merged.edenAssignment = {
        sourceId: previousMatch.edenSourceId,
        sourceName: previousMatch.edenSourceName,
        playerKey: cleanText(previousMatch.member?.edenAssignment?.playerKey),
        method: 'name_change_confirmation',
        confirmedAtMs: Date.now(),
        confirmedBy: state.userUid,
      };
    }
    const incomingIndex = nextMembers.findIndex((member) => member.id === suggestion.after.id);
    if (incomingIndex >= 0) nextMembers.splice(incomingIndex, 1, merged);
    else nextMembers.push(merged);
  }
  await state.store.saveRoster(
    draft.allianceId,
    { ...current, members: nextMembers },
    { expectedRevision: draft.expectedRevision }
  );
  state.root.querySelector('#dashAllianceImportDialog')?.close('saved');
  state.importDraft = null;
  showStatus(
    state,
    state.tr('adminAllianceViewImportSaved', '{alliance} roster replaced safely.', {
      alliance: draft.allianceId.toUpperCase(),
    }),
    'success'
  );
}

function findMember(state, memberId) {
  for (const allianceId of ALLIANCE_IDS) {
    const member = state.rosters[allianceId]?.members?.find((item) => item.id === memberId);
    if (member) return { member, allianceId };
  }
  return null;
}

function openEditorById(state, memberId) {
  const found = findMember(state, memberId);
  if (!found)
    throw new Error(state.tr('adminAllianceViewAccountMissing', 'Account no longer exists.'));
  const row = state.rows.find((item) => item.id === memberId);
  openEditor(state, found.member, found.allianceId, row);
}

function openEditor(state, member, defaultAllianceId = 'v3s', suggestion = null) {
  const form = state.root.querySelector('#dashAllianceEditorForm');
  const dialog = state.root.querySelector('#dashAllianceEditorDialog');
  if (!form || !dialog) return;
  form.reset();
  state.editing = {
    memberId: member?.id || '',
    originalAllianceId: member?.allianceId || '',
    expectedRevisions: Object.fromEntries(
      ALLIANCE_IDS.map((allianceId) => [allianceId, state.rosters[allianceId]?.revision || 0])
    ),
  };
  const title = state.root.querySelector('#dashAllianceEditorTitle');
  title.textContent = member
    ? state.tr('adminAllianceViewEditAccountName', 'Edit {name}', { name: accountName(member) })
    : state.tr('adminAllianceViewAddAccount', 'Add account');
  form.elements.name.value = member ? accountName(member) : '';
  form.elements.allianceId.value = member?.allianceId || defaultAllianceId;
  form.elements.rank.value = member ? effectiveValue(member, 'rank') : '';
  form.elements.server.value = member ? effectiveValue(member, 'server') : '';
  form.elements.castleLevel.value = member ? (effectiveValue(member, 'castleLevel') ?? '') : '';
  form.elements.totalPower.value = member ? (effectiveValue(member, 'totalPower') ?? '') : '';
  form.elements.lastOnline.value = member ? effectiveValue(member, 'lastOnline') : '';
  const activityAtMs =
    nullableNumber(member?.overrides?.activityAtMs) ?? nullableNumber(member?.activityAtMs);
  form.elements.activityAt.value = activityAtMs ? toDateTimeLocal(activityAtMs) : '';
  const suggestedId =
    suggestion?.matchSuggestion?.sourceId ||
    suggestion?.suggestedSourceId ||
    suggestion?.edenSourceId ||
    '';
  populateEdenOptions(state, suggestedId || member?.edenAssignment?.sourceId || '');
  state.root.querySelector('#dashAllianceEditorError').textContent = '';
  dialog.showModal();
  queueMicrotask(() => form.elements.name.focus());
}

function closeEditor(state) {
  state.root.querySelector('#dashAllianceEditorDialog')?.close('cancel');
  state.editing = null;
}

function toDateTimeLocal(timestamp) {
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function stableMemberId(allianceId) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  return `${allianceId}-${random}`;
}

function formValues(form) {
  const data = new FormData(form);
  return {
    name: cleanText(data.get('name')),
    allianceId: cleanText(data.get('allianceId')).toLowerCase(),
    rank: cleanText(data.get('rank')),
    server: cleanText(data.get('server')),
    castleLevel: nullableNumber(data.get('castleLevel')),
    totalPower: nullableNumber(data.get('totalPower')),
    lastOnline: cleanText(data.get('lastOnline')),
    activityAtMs: data.get('activityAt') ? new Date(data.get('activityAt')).getTime() : null,
    edenSourceId: cleanText(data.get('edenSourceId')),
  };
}

function validateUniqueEdenAssignment(state, sourceId, editingMemberId = '') {
  if (!sourceId) return;
  const duplicate = rosterMembers(state.rosters).find(
    (member) => member.id !== editingMemberId && member?.edenAssignment?.sourceId === sourceId
  );
  const matchedRow = state.rows.find(
    (row) =>
      row.id !== editingMemberId &&
      row.edenSourceId === sourceId &&
      normalizedMatchStatus(row) === 'matched'
  );
  if (duplicate || matchedRow) {
    throw new Error(
      state.tr(
        'adminAllianceViewEdenAlreadyAssigned',
        'That Eden account is already assigned to {name}.',
        {
          name: duplicate ? accountName(duplicate) : matchedRow.accountName,
        }
      )
    );
  }
}

function assignmentFromSource(state, sourceId) {
  if (!sourceId) return null;
  const edenRows = stableEdenRows(state.contributionModel);
  const index = edenRows.findIndex(
    (row, rowIndex) => contributionSourceId(row, rowIndex) === sourceId
  );
  const row = index >= 0 ? edenRows[index] : null;
  return {
    sourceId,
    sourceName: contributionSourceName(row) || sourceId,
    playerKey: cleanText(row?.playerKey),
    method: 'manual',
    confirmedAtMs: Date.now(),
    confirmedBy: state.userUid,
  };
}

async function saveEditor(state, event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorTarget = state.root.querySelector('#dashAllianceEditorError');
  try {
    const values = formValues(form);
    if (!values.name)
      throw new Error(state.tr('adminAllianceViewNameRequired', 'Account name is required.'));
    if (!ALLIANCE_IDS.includes(values.allianceId)) {
      throw new Error(state.tr('adminAllianceViewAllianceRequired', 'Choose V3S or VTS.'));
    }
    validateUniqueEdenAssignment(state, values.edenSourceId, state.editing?.memberId);
    const edenAssignment = assignmentFromSource(state, values.edenSourceId);
    if (!state.editing?.memberId) {
      let member;
      try {
        member = AllianceModel.createManualRosterMember(values, {
          allianceId: values.allianceId,
          id: stableMemberId(values.allianceId),
          now: Date.now(),
        });
      } catch {
        member = {
          id: stableMemberId(values.allianceId),
          allianceId: values.allianceId,
          imported: {
            name: values.name,
            alliance: values.allianceId.toUpperCase(),
            rank: values.rank,
            server: values.server,
            castleLevel: values.castleLevel,
            totalPower: values.totalPower,
            lastOnline: values.lastOnline,
          },
          overrides: {},
          knownNames: [values.name],
          activityAtMs: values.activityAtMs,
          activityRaw: values.lastOnline,
          edenAssignment,
        };
      }
      member.edenAssignment = edenAssignment;
      if (values.activityAtMs !== null) {
        member.activityAtMs = values.activityAtMs;
        member.importedActivityAtMs = values.activityAtMs;
      }
      const roster = state.rosters[values.allianceId];
      await state.store.saveRoster(
        values.allianceId,
        { ...roster, members: [...roster.members, member] },
        {
          expectedRevision:
            state.editing?.expectedRevisions?.[values.allianceId] ?? roster.revision,
        }
      );
    } else {
      const found = findMember(state, state.editing.memberId);
      if (!found)
        throw new Error(state.tr('adminAllianceViewAccountMissing', 'Account no longer exists.'));
      const original = found.member;
      const next = cloneMember(original);
      const oldName = accountName(original);
      next.overrides = {
        ...next.overrides,
        name: values.name,
        alliance: values.allianceId.toUpperCase(),
        rank: values.rank,
        server: values.server,
        castleLevel: values.castleLevel,
        totalPower: values.totalPower,
        lastOnline: values.lastOnline,
        activityAtMs: values.activityAtMs,
      };
      if (oldName && oldName.toLocaleLowerCase() !== values.name.toLocaleLowerCase()) {
        next.knownNames = [...new Set([...(next.knownNames || []), oldName, values.name])];
      }
      next.allianceId = values.allianceId;
      next.edenAssignment = edenAssignment;
      if (found.allianceId === values.allianceId) {
        const roster = state.rosters[found.allianceId];
        const members = roster.members.map((member) => (member.id === next.id ? next : member));
        await state.store.saveRoster(
          found.allianceId,
          { ...roster, members },
          {
            expectedRevision:
              state.editing.expectedRevisions?.[found.allianceId] ?? roster.revision,
          }
        );
      } else {
        const source = state.rosters[found.allianceId];
        const target = state.rosters[values.allianceId];
        await state.store.saveRosters(
          {
            [found.allianceId]: {
              ...source,
              members: source.members.filter((member) => member.id !== next.id),
            },
            [values.allianceId]: { ...target, members: [...target.members, next] },
          },
          {
            expectedRevisions: {
              [found.allianceId]:
                state.editing.expectedRevisions?.[found.allianceId] ?? source.revision,
              [values.allianceId]:
                state.editing.expectedRevisions?.[values.allianceId] ?? target.revision,
            },
          }
        );
      }
    }
    closeEditor(state);
    showStatus(state, state.tr('adminAllianceViewAccountSaved', 'Account saved.'), 'success');
  } catch (error) {
    errorTarget.textContent = localizedError(state, error);
    errorTarget.focus?.();
  }
}

async function removeMember(state, memberId) {
  const found = findMember(state, memberId);
  if (!found) return;
  if (
    !window.confirm(
      state.tr('adminAllianceViewRemoveConfirm', 'Remove {name} from the current roster?', {
        name: accountName(found.member),
      })
    )
  )
    return;
  const roster = state.rosters[found.allianceId];
  await state.store.saveRoster(
    found.allianceId,
    { ...roster, members: roster.members.filter((member) => member.id !== memberId) },
    { expectedRevision: roster.revision }
  );
  showStatus(state, state.tr('adminAllianceViewAccountRemoved', 'Account removed.'), 'success');
}

async function resetMember(state, memberId) {
  const found = findMember(state, memberId);
  if (!found) return;
  const reset = { ...cloneMember(found.member), overrides: {} };
  const roster = state.rosters[found.allianceId];
  await state.store.saveRoster(
    found.allianceId,
    {
      ...roster,
      members: roster.members.map((member) => (member.id === memberId ? reset : member)),
    },
    { expectedRevision: roster.revision }
  );
  showStatus(
    state,
    state.tr('adminAllianceViewImportedReset', 'Imported values restored.'),
    'success'
  );
}

async function confirmMemberName(state, memberId) {
  const found = findMember(state, memberId);
  if (!found) return;
  const name = accountName(found.member);
  let confirmed;
  try {
    const incoming = cloneMember(found.member);
    incoming.imported = { ...incoming.imported, name };
    incoming.importedRaw = { ...(incoming.importedRaw || {}), name };
    confirmed = AllianceModel.confirmRosterNameChange(found.member, incoming, { now: Date.now() });
    confirmed.overrides = { ...(confirmed.overrides || {}) };
    delete confirmed.overrides.name;
  } catch {
    confirmed = cloneMember(found.member);
    confirmed.knownNames = [...new Set([...(confirmed.knownNames || []), name])];
  }
  const roster = state.rosters[found.allianceId];
  await state.store.saveRoster(
    found.allianceId,
    {
      ...roster,
      members: roster.members.map((member) => (member.id === memberId ? confirmed : member)),
    },
    { expectedRevision: roster.revision }
  );
  showStatus(
    state,
    state.tr('adminAllianceViewNameConfirmed', 'Name change confirmed.'),
    'success'
  );
}

function fallbackCsv(rows) {
  const headers = [
    'Rank',
    'Account Name',
    'Alliance',
    'Roster Rank',
    'Server',
    'Castle Level',
    'Total Power',
    'Last Online',
    'Activity Timestamp',
    'Match Status',
    'Match Method',
    'Eden Source ID',
    'Eden Source Name',
    'Contribution',
    'Ex-Guild',
    'Base',
    'Banners',
    'Pathers',
    'Shield Walls',
    'Bonus Team Effort',
    'Extended',
    'Active Score',
  ];
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const records = rows.map((row) =>
    [
      row.allianceViewRank,
      row.accountName,
      row.allianceId,
      row.rank,
      row.server,
      row.castleLevel,
      row.totalPower,
      row.activityRaw,
      row.activityAtMs ? new Date(row.activityAtMs).toISOString() : '',
      normalizedMatchStatus(row),
      row.matchMethod,
      row.edenSourceId,
      row.edenSourceName,
      row.contribution,
      row.exGuild,
      row.base,
      row.banners,
      row.pathers,
      row.shieldWalls,
      row.bonusTeamEffort,
      row.extended,
      row.active,
    ].map(quote)
  );
  return [headers.map(quote), ...records].map((record) => record.join(',')).join('\r\n');
}

function exportRows(state, rows, scope) {
  let csv;
  try {
    csv = AllianceModel.exportAllianceRowsCsv(rows, {
      metric: state.metric,
      includeMatchAudit: true,
      scope,
    });
  } catch {
    csv = fallbackCsv(rows);
  }
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `alliance-view-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showStatus(
    state,
    state.tr('adminAllianceViewExported', 'Exported {count} accounts.', { count: rows.length }),
    'success'
  );
}

function showStatus(state, message, tone = '') {
  const target = state.root.querySelector('#dashAllianceViewStatus');
  if (!target) return;
  target.textContent = message || '';
  target.dataset.tone = tone;
  target.classList.toggle('hidden', !message);
}

function localizedError(state, error) {
  if (error instanceof AllianceStore.AllianceRosterConflictError || error?.code === 'conflict') {
    return state.tr(
      'adminAllianceViewConflictError',
      'This roster changed in another session. Close this editor, review the latest data, and try again.'
    );
  }
  if (
    error instanceof AllianceStore.AllianceRosterDuplicateAssignmentError ||
    error?.code === 'duplicate-eden-assignment'
  ) {
    return state.tr(
      'adminAllianceViewDuplicateError',
      'That Eden source is already assigned to another roster account.'
    );
  }
  if (error instanceof AllianceStore.AllianceRosterAdminRequiredError) {
    return state.tr(
      'adminAllianceViewAdminRequired',
      'Sign in with a Firebase admin account and try again.'
    );
  }
  return error?.message || String(error);
}

function showFatal(state, error, tr) {
  console.error('ALLIANCE VIEW INITIALIZATION ERROR:', error);
  const message = localizedError(state, error);
  const card = state.root.querySelector('.dash-alliance-card');
  if (!card) {
    state.root.innerHTML = `<div class="dash-card dash-alliance-fatal" role="alert"><strong>${escapeHtml(
      tr('adminAllianceViewUnavailable', 'Alliance View is unavailable.')
    )}</strong><p>${escapeHtml(message)}</p></div>`;
    return;
  }
  showStatus(state, message, 'error');
  const tables = state.root.querySelector('#dashAllianceViewTables');
  if (tables) {
    tables.innerHTML = `<div class="dash-empty dash-alliance-fatal" role="alert"><strong>${escapeHtml(
      tr('adminAllianceViewUnavailable', 'Alliance View is unavailable.')
    )}</strong><span>${escapeHtml(
      tr('adminAllianceViewAdminRequired', 'Sign in with a Firebase admin account and try again.')
    )}</span></div>`;
  }
}
