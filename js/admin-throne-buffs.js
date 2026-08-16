// js/admin-throne-buffs.js
// Admin UI controller for the Throne Buffs weekly assignment program.
//
// Throne Buffs are global (Alliance side) and sit outside Eden season scopes.
// Admins assign the 9 throne titles each week, track rotation fairness,
// search historical assignments, and export summary cards as PNGs.

import {
  THRONE_BUFFS,
  THRONE_BUFF_IDS,
  throneBuffIconPath,
  throneBuffInitials,
} from './throne-buffs-data.js';
import {
  buildFairnessTable,
  buildNameSuggestions,
  isoWeekKey,
  normalizeWeekAssignment,
  searchAssignmentHistory,
  summarizeThroneBuffs,
} from './throne-buffs-model.js';
import { exportThroneWeekPng } from './throne-buffs-export.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function t(key, vars = {}) {
  if (typeof window !== 'undefined' && typeof window.dashT === 'function') {
    return window.dashT(key, vars);
  }
  return key;
}

/**
 * Renders the Throne Buffs administration panel into the provided mount point.
 *
 * @param {HTMLElement} mount The DOM container to render into.
 * @param {Object} options Configuration and data options.
 * @param {Array} options.history Past week records.
 * @param {Array} options.rosterMembers Available alliance members for suggestions.
 * @param {Function} options.onSave Callback receiving normalized week assignment when saved.
 * @param {Function} [options.onExport] Optional custom export handler.
 */
export function renderThroneBuffs(
  mount,
  { history = [], rosterMembers = [], onSave, onExport } = {}
) {
  if (!mount) return;

  const currentHistory = Array.isArray(history) ? [...history] : [];
  let selectedWeek = isoWeekKey(new Date());
  let searchQuery = '';

  function getActiveRecord(weekKey) {
    const existing = currentHistory.find((record) => record?.weekKey === weekKey);
    if (existing) {
      return normalizeWeekAssignment(existing, THRONE_BUFF_IDS);
    }
    return normalizeWeekAssignment({ weekKey, assignments: {}, reasons: {} }, THRONE_BUFF_IDS);
  }

  let currentWeekRecord = getActiveRecord(selectedWeek);

  function getSuggestions() {
    return buildNameSuggestions({
      rosterMembers,
      history: currentHistory,
      buffIds: THRONE_BUFF_IDS,
    });
  }

  function render() {
    const summary = summarizeThroneBuffs(currentHistory, THRONE_BUFF_IDS, currentWeekRecord);
    const fairness = buildFairnessTable(currentHistory, THRONE_BUFF_IDS);
    const searchHits = searchQuery
      ? searchAssignmentHistory(currentHistory, THRONE_BUFF_IDS, searchQuery)
      : [];
    const suggestions = getSuggestions();

    const openSlotsText = t('adminThroneOpenSlots', {
      n: summary.filledSlots,
      total: summary.slotCount,
    });

    const duplicateWarnings = summary.duplicateMembers
      .map((name) => t('adminThroneDuplicateWarning', { name }))
      .join(' ');

    const html = `
      <div class="throne-admin-wrap dash-card">
        <header class="throne-admin-header">
          <div class="throne-week-picker-group">
            <label for="throneWeekPicker" class="throne-label" data-i18n="adminThroneWeekLabel">
              ${escapeHtml(t('adminThroneWeekLabel'))}
            </label>
            <input
              type="week"
              id="throneWeekPicker"
              class="dash-input throne-week-input"
              value="${escapeHtml(selectedWeek)}"
              aria-label="${escapeHtml(t('adminThroneWeekLabel'))}"
            />
          </div>

          <div class="throne-summary-badges" role="status" aria-live="polite">
            <span class="throne-badge throne-badge-slots" data-i18n="adminThroneOpenSlots">
              ${escapeHtml(openSlotsText)}
            </span>
            ${
              duplicateWarnings
                ? `<span class="throne-badge throne-badge-warning" role="alert">
                    ${escapeHtml(duplicateWarnings)}
                  </span>`
                : ''
            }
          </div>

          <div class="throne-header-actions">
            <button
              type="button"
              id="throneExportBtn"
              class="dash-btn"
              data-i18n="adminThroneExportBtn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>${escapeHtml(t('adminThroneExportBtn'))}</span>
            </button>
            <button
              type="button"
              id="throneSaveBtn"
              class="dash-btn dash-btn-primary"
              data-i18n="adminThroneSaveBtn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>${escapeHtml(t('adminThroneSaveBtn'))}</span>
            </button>
          </div>
        </header>

        <datalist id="throneMemberDatalist">
          ${suggestions
            .map(
              (s) =>
                `<option value="${escapeHtml(s.name)}">${escapeHtml(
                  s.alliance ? `${s.name} (${s.alliance})` : s.name
                )}</option>`
            )
            .join('')}
        </datalist>

        <div class="throne-table-responsive">
          <table class="dash-table throne-table">
            <thead>
              <tr>
                <th scope="col" class="throne-col-icon" aria-hidden="true"></th>
                <th scope="col" class="throne-col-title" data-i18n="adminThroneSlotColumn">
                  ${escapeHtml(t('adminThroneSlotColumn'))}
                </th>
                <th scope="col" class="throne-col-member" data-i18n="adminThroneMemberColumn">
                  ${escapeHtml(t('adminThroneMemberColumn'))}
                </th>
                <th scope="col" class="throne-col-reason" data-i18n="adminThroneReasonColumn">
                  ${escapeHtml(t('adminThroneReasonColumn'))}
                </th>
              </tr>
            </thead>
            <tbody>
              ${THRONE_BUFFS.map((buff) => {
                const memberVal = currentWeekRecord.assignments[buff.id] || '';
                const reasonVal = currentWeekRecord.reasons[buff.id] || '';
                const effectsText = buff.effects
                  .map((e) => `${escapeHtml(e.label)}: ${escapeHtml(e.value)}`)
                  .join(' · ');

                return `
                  <tr data-buff-id="${escapeHtml(buff.id)}">
                    <td class="throne-col-icon">
                      <img
                        src="${escapeHtml(throneBuffIconPath(buff.id))}"
                        alt=""
                        loading="lazy"
                        class="throne-buff-icon"
                        onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='inline-flex';"
                      />
                      <span class="throne-buff-fallback-initials" style="display:none;" aria-hidden="true">
                        ${escapeHtml(throneBuffInitials(buff.id))}
                      </span>
                    </td>
                    <td class="throne-col-title">
                      <div class="throne-title-name">${escapeHtml(buff.name)}</div>
                      ${effectsText ? `<div class="throne-title-effects">${effectsText}</div>` : ''}
                    </td>
                    <td class="throne-col-member">
                      <input
                        type="text"
                        class="dash-input throne-input-member"
                        list="throneMemberDatalist"
                        data-slot-buff="${escapeHtml(buff.id)}"
                        value="${escapeHtml(memberVal)}"
                        placeholder="${escapeHtml(t('adminThroneMemberColumn'))}"
                        maxlength="40"
                        autocomplete="off"
                        spellcheck="false"
                      />
                    </td>
                    <td class="throne-col-reason">
                      <input
                        type="text"
                        class="dash-input throne-input-reason"
                        data-slot-reason="${escapeHtml(buff.id)}"
                        value="${escapeHtml(reasonVal)}"
                        placeholder="${escapeHtml(t('adminThroneReasonColumn'))}"
                        maxlength="120"
                        autocomplete="off"
                      />
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <section class="throne-search-section">
          <label for="throneSearchInput" class="throne-label" data-i18n="adminThroneSearchLabel">
            ${escapeHtml(t('adminThroneSearchLabel'))}
          </label>
          <input
            type="search"
            id="throneSearchInput"
            class="dash-input throne-search-input"
            value="${escapeHtml(searchQuery)}"
            placeholder="${escapeHtml(t('adminThroneSearchPlaceholder'))}"
            data-i18n-ph="adminThroneSearchPlaceholder"
          />
          ${
            searchQuery
              ? `<div class="throne-search-results">
                  ${
                    searchHits.length === 0
                      ? `<p class="dash-empty throne-empty-text" data-i18n="adminThroneEmptyHistory">
                          ${escapeHtml(t('adminThroneEmptyHistory'))}
                        </p>`
                      : `<ul class="throne-hits-list">
                          ${searchHits
                            .map(
                              (hit) => `
                              <li class="throne-hit-item">
                                <span class="throne-hit-week">${escapeHtml(hit.weekKey)}</span>
                                <strong class="throne-hit-title">${escapeHtml(
                                  THRONE_BUFFS.find((b) => b.id === hit.buffId)?.name || hit.buffId
                                )}</strong>
                                <span class="throne-hit-member">${escapeHtml(hit.member)}</span>
                                ${
                                  hit.reason
                                    ? `<span class="throne-hit-reason">${escapeHtml(
                                        hit.reason
                                      )}</span>`
                                    : ''
                                }
                              </li>
                            `
                            )
                            .join('')}
                        </ul>`
                  }
                </div>`
              : ''
          }
        </section>

        <section class="throne-fairness-section">
          <h3 class="throne-section-title" data-i18n="adminThroneFairnessTitle">
            ${escapeHtml(t('adminThroneFairnessTitle'))}
          </h3>
          ${
            fairness.rows.length === 0
              ? `<p class="dash-empty throne-empty-text" data-i18n="adminThroneEmptyHistory">
                  ${escapeHtml(t('adminThroneEmptyHistory'))}
                </p>`
              : `<div class="throne-table-responsive">
                  <table class="dash-table throne-fairness-table">
                    <thead>
                      <tr>
                        <th scope="col" data-i18n="adminThroneMemberColumn">
                          ${escapeHtml(t('adminThroneMemberColumn'))}
                        </th>
                        <th scope="col" data-i18n="adminThroneFairnessTotal">
                          ${escapeHtml(t('adminThroneFairnessTotal'))}
                        </th>
                        <th scope="col" data-i18n="adminThroneFairnessLast">
                          ${escapeHtml(t('adminThroneFairnessLast'))}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      ${fairness.rows
                        .map(
                          (row) => `
                          <tr>
                            <td class="throne-fairness-member">${escapeHtml(row.member)}</td>
                            <td class="throne-fairness-total">${row.total}</td>
                            <td class="throne-fairness-last">${row.weeksSinceLast}</td>
                          </tr>
                        `
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>`
          }
        </section>
      </div>
    `;

    mount.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    const weekPicker = mount.querySelector('#throneWeekPicker');
    if (weekPicker) {
      weekPicker.addEventListener('change', (e) => {
        selectedWeek = e.target.value;
        currentWeekRecord = getActiveRecord(selectedWeek);
        render();
      });
    }

    const memberInputs = mount.querySelectorAll('.throne-input-member');
    memberInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const buffId = e.target.dataset.slotBuff;
        if (buffId) {
          currentWeekRecord.assignments[buffId] = e.target.value;
          updateLiveSummary();
        }
      });
    });

    const reasonInputs = mount.querySelectorAll('.throne-input-reason');
    reasonInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const buffId = e.target.dataset.slotReason;
        if (buffId) {
          currentWeekRecord.reasons[buffId] = e.target.value;
        }
      });
    });

    const saveBtn = mount.querySelector('#throneSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const payload = normalizeWeekAssignment(currentWeekRecord, THRONE_BUFF_IDS);
        if (typeof onSave === 'function') {
          onSave(payload);
        }
      });
    }

    const exportBtn = mount.querySelector('#throneExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const payload = normalizeWeekAssignment(currentWeekRecord, THRONE_BUFF_IDS);
        if (typeof onExport === 'function') {
          onExport(payload);
        } else {
          void exportThroneWeekPng(payload);
        }
      });
    }

    const searchInput = mount.querySelector('#throneSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        render();
        const freshSearch = mount.querySelector('#throneSearchInput');
        if (freshSearch) {
          freshSearch.focus();
          freshSearch.setSelectionRange(searchQuery.length, searchQuery.length);
        }
      });
    }
  }

  function updateLiveSummary() {
    const summary = summarizeThroneBuffs(currentHistory, THRONE_BUFF_IDS, currentWeekRecord);
    const badgesContainer = mount.querySelector('.throne-summary-badges');
    if (badgesContainer) {
      const openSlotsText = t('adminThroneOpenSlots', {
        n: summary.filledSlots,
        total: summary.slotCount,
      });
      const duplicateWarnings = summary.duplicateMembers
        .map((name) => t('adminThroneDuplicateWarning', { name }))
        .join(' ');

      badgesContainer.innerHTML = `
        <span class="throne-badge throne-badge-slots" data-i18n="adminThroneOpenSlots">
          ${escapeHtml(openSlotsText)}
        </span>
        ${
          duplicateWarnings
            ? `<span class="throne-badge throne-badge-warning" role="alert">
                ${escapeHtml(duplicateWarnings)}
              </span>`
            : ''
        }
      `;
    }
  }

  render();
}
