import {
  STRUCTURE_TYPES, getSectorStructures, getStructureLabel, getStructureShort,
  getStructurePoints, getSectorFaction,
} from './eden-map-data.js';
import { getStructureIcon, isIconReady } from './eden-map-assets.js';
import {
  estimateTravelMinutes, formatTravelTime, fuzzyIncludes,
} from './eden-map-features.js';
import { findRoute } from './eden-map-terrain.js';
import {
  isTeamPlanEnabled, getActiveTeamIds, getTeamInfo, getStructTeamMeta,
  renderTeamBoardHtml,
} from './eden-map-teams.js';
import { translations } from './translations.js';

const STATUS_COLORS = { owned: '#22c55e', contested: '#f59e0b', enemy: '#ef4444', neutral: '#94a3b8' };
const CATEGORY_ROW_CLASS = { gate: 'eden-row-gate', town: 'eden-row-town', capital: 'eden-row-capital', stronghold: 'eden-row-capital', temple: 'eden-row-temple' };

function edenT(key) {
  const lang = localStorage.getItem('vts_hero_lang') || 'en';
  return translations[lang]?.[key] || translations.en[key] || key;
}

function getStructures(plan, sectorKey) {
  const base = getSectorStructures(sectorKey);
  const guilds = plan.guilds || {};
  const statuses = plan.status || {};
  return base.map((s) => ({
    ...s,
    guild: guilds[s.id] || s.guild || '',
    status: statuses[s.id] || 'neutral',
  }));
}

function getStructureStatus(plan, s) {
  return plan.status?.[s.id] || 'neutral';
}

function structurePassesFaction(s, factionFilter, sectorKey) {
  if (factionFilter === 'all') return true;
  const sk = s.sector || sectorKey;
  return getSectorFaction(sk) === factionFilter;
}

function structurePassesOwnership(s) {
  const ownFilter = document.getElementById('edenOwnershipFilter')?.value || 'all';
  if (ownFilter === 'all') return true;
  return getStructureStatus(s) === ownFilter;
}

function structureVisible(s, factionFilter, sectorKey) {
  return structurePassesFaction(s, factionFilter, sectorKey) && structurePassesOwnership(s);
}

function getFilteredStructures(plan, sectorKey, listSort, factionFilter) {
  const list = getStructures(plan, sectorKey);
  const zoneFilter = document.getElementById('edenZoneFilter')?.value || 'all';
  const typeFilter = document.getElementById('edenTypeFilter')?.value || 'all';
  const teamFilter = isTeamPlanEnabled(plan)
    ? (document.getElementById('edenTeamFilter')?.value || 'all')
    : 'all';
  const search = (document.getElementById('edenStructSearch')?.value || '').toLowerCase();

  const filtered = list.filter((s) => {
    if (!structureVisible(s, factionFilter, sectorKey)) return false;
    if (zoneFilter !== 'all' && s.zone !== zoneFilter) return false;
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    const assignedTeam = getStructTeamMeta(plan, s.id).team;
    if (isTeamPlanEnabled(plan) && teamFilter === 'unassigned' && assignedTeam) return false;
    if (isTeamPlanEnabled(plan) && teamFilter !== 'all' && teamFilter !== 'unassigned' && assignedTeam !== teamFilter) return false;
    const label = getStructureLabel(s.type);
    const hay = `${s.zone} ${s.type} ${label} ${s.x}:${s.y} ${s.guild} ${getStructureStatus(plan, s)} ${assignedTeam}`;
    if (search && !fuzzyIncludes(search, hay)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (listSort === 'zone') return a.zone.localeCompare(b.zone) || a.type.localeCompare(b.type);
    if (listSort === 'type') return a.type.localeCompare(b.type) || a.zone.localeCompare(b.zone);
    const pa = getStructurePoints(a);
    const pb = getStructurePoints(b);
    return pb - pa || a.zone.localeCompare(b.zone);
  });
  return filtered;
}

function populateFilters(plan, sectorKey, filtersPopulatedFor, force = false) {
  if (!force && filtersPopulatedFor.value === sectorKey) return;
  filtersPopulatedFor.value = sectorKey;

  const structs = getStructures(plan, sectorKey);
  const zones = [...new Set(structs.map((s) => s.zone))].sort();
  const types = [...new Set(structs.map((s) => s.type))].sort((a, b) =>
    getStructureLabel(a).localeCompare(getStructureLabel(b))
  );

  const zoneSelect = document.getElementById('edenZoneFilter');
  const typeSelect = document.getElementById('edenTypeFilter');
  if (!zoneSelect || !typeSelect) return;

  const prevZone = zoneSelect.value;
  const prevType = typeSelect.value;

  zoneSelect.innerHTML = `<option value="all">${edenT('edenAllZones')}</option>` +
    zones.map((z) => `<option value="${z}">${z}</option>`).join('');
  typeSelect.innerHTML = `<option value="all">${edenT('edenAllTypes')}</option>` +
    types.map((t) => `<option value="${t}">${getStructureLabel(t)}</option>`).join('');

  if ([...zoneSelect.options].some((o) => o.value === prevZone)) zoneSelect.value = prevZone;
  if ([...typeSelect.options].some((o) => o.value === prevType)) typeSelect.value = prevType;
}

export function renderSidebar(state) {
  const {
    plan, selectedId, tool, measureA, measureB,
    sectorKey, viewMode, listSort, factionFilter, filtersPopulatedFor, onSyncTeamPlanUi,
  } = state;

  populateFilters(plan, sectorKey, filtersPopulatedFor);

  const list = getStructures(plan, sectorKey);
  const filtered = getFilteredStructures(plan, sectorKey, listSort, factionFilter);
  const selected = list.find((s) => s.id === selectedId);
  const selPanel = document.getElementById('edenSelectedPanel');

  if (selPanel) {
    if (tool === 'measure' && measureA && measureB) {
      const route = findRoute(measureA.x, measureA.y, measureB.x, measureB.y);
      const direct = Math.round(Math.hypot(measureB.x - measureA.x, measureB.y - measureA.y));
      const travelMins = estimateTravelMinutes(route.distance, plan.speed || 1);
      selPanel.innerHTML = `
        <div class="eden-selected-card">
          <div class="eden-selected-title">${edenT('edenMeasureTitle')}</div>
          <div class="eden-selected-meta">${edenT('edenMeasureTerrain')} <strong>${route.distance}</strong> ${edenT('edenMeasureTiles')} · ${edenT('edenMeasureDirect')} ${direct} ${edenT('edenMeasureTiles')}</div>
          <div class="eden-selected-meta">${edenT('edenMeasureMarch')} <strong>${formatTravelTime(travelMins)}</strong> @ speed ${plan.speed || 1}×</div>
          <div class="eden-selected-meta">${measureA.x}:${measureA.y} → ${measureB.x}:${measureB.y}</div>
          ${route.blocked ? `<p class="eden-hint">${edenT('edenMeasureBlocked')}</p>` : ''}
          <button type="button" id="edenClearMeasure" class="eden-action-btn">${edenT('edenClearMeasure')}</button>
        </div>`;
    } else if (!selected) {
      selPanel.innerHTML = `<p class="eden-hint">${edenT('edenHintEmpty')} <a href="#edenHelpPanel" class="eden-help-link">${edenT('edenGuideBtn')}</a></p>`;
    } else {
      const meta = STRUCTURE_TYPES[selected.type];
      const icon = getStructureIcon(selected.type);
      const status = getStructureStatus(plan, selected);
      const tm = getStructTeamMeta(plan, selected.id);
      const teamOptions = isTeamPlanEnabled(plan)
        ? getActiveTeamIds(plan).map((tid) => {
          const t = getTeamInfo(plan, tid);
          return `<option value="${tid}" ${tm.team === tid ? 'selected' : ''}>${t.name}</option>`;
        }).join('')
        : '';
      const iconHtml = isIconReady(icon)
        ? `<img class="eden-selected-icon" src="${icon instanceof HTMLImageElement ? icon.src : icon.toDataURL()}" alt="">`
        : `<span class="eden-struct-dot eden-selected-dot" style="background:${meta?.color}"></span>`;
      selPanel.innerHTML = `
        <div class="eden-selected-card">
          <div class="eden-selected-head">
            ${iconHtml}
            <div>
              <div class="eden-selected-title">${meta?.label || selected.type} <span class="eden-zone-tag">(${getStructureShort(selected.type)})</span></div>
              <div class="eden-selected-meta">${edenT('edenZoneFieldLabel')} ${selected.zone} · X:${selected.x} Y:${selected.y}</div>
              <div class="eden-selected-ov"><svg class="eden-inline-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${edenT('edenOvLabel')} <strong>${meta?.points || 0}</strong></div>
            </div>
          </div>
          <label class="eden-guild-label eden-status-label">${edenT('edenStatusLabel')}
            <span class="eden-ownership-dot eden-status-dot ${status || 'neutral'}" id="edenStatusDot" aria-hidden="true"></span>
            <select id="edenStatusSelect" class="eden-filter-select eden-status-select">
              <option value="neutral" ${status === 'neutral' ? 'selected' : ''}>${edenT('edenStatusNeutral')}</option>
              <option value="owned" ${status === 'owned' ? 'selected' : ''}>${edenT('edenStatusOwned')}</option>
              <option value="contested" ${status === 'contested' ? 'selected' : ''}>${edenT('edenStatusContested')}</option>
              <option value="enemy" ${status === 'enemy' ? 'selected' : ''}>${edenT('edenStatusEnemy')}</option>
            </select>
          </label>
          <label class="eden-guild-label">${edenT('edenGuildLabel')}
            <input id="edenGuildInput" value="${selected.guild || ''}" placeholder="${edenT('edenGuildPh')}" />
          </label>
          ${isTeamPlanEnabled(plan) ? `
          <div class="eden-team-assign-block">
            <label class="eden-guild-label">${edenT('edenTeamAssignLabel')}
              <select id="edenTeamSelect" class="eden-filter-select">
                <option value="">${edenT('edenTeamUnassigned')}</option>
                ${teamOptions}
              </select>
            </label>
            <label class="eden-guild-label">${edenT('edenTeamTimeLabel')}
              <input id="edenTeamTime" type="text" inputmode="numeric" maxlength="5" value="${tm.gameTime || ''}" placeholder="${edenT('edenTeamTimePh')}" />
            </label>
            <label class="eden-guild-label">${edenT('edenTeamNoteLabel')}
              <input id="edenTeamNote" type="text" maxlength="48" value="${tm.note || ''}" placeholder="${edenT('edenTeamNotePh')}" />
            </label>
          </div>` : ''}
          <div class="eden-selected-meta">${edenT('edenMarchFromHint')}</div>
          <div class="eden-selected-actions">
            <button type="button" id="edenToggleTargetBtn" class="eden-action-btn ${(plan.targets || []).includes(selected.id) ? 'active' : ''}">
              ${(plan.targets || []).includes(selected.id) ? edenT('edenMarkedTarget') : edenT('edenMarkTarget')}
            </button>
            <button type="button" id="edenCenterBtn" class="eden-action-btn">${edenT('edenCenter')}</button>
            <button type="button" id="edenZoomStructBtn" class="eden-action-btn">${edenT('edenZoomStruct')}</button>
            <button type="button" id="edenCopyCoordsBtn" class="eden-action-btn" data-coords="${selected.x}:${selected.y}">${edenT('edenCopyCoords')}</button>
            <button type="button" id="edenComboLinkBtn" class="eden-action-btn eden-combo-link">${edenT('edenBuildCombo')}</button>
            <button type="button" id="edenLoyaltyLinkBtn" class="eden-action-btn eden-loyalty-link">${edenT('edenOpenLoyalty')}</button>
          </div>
        </div>`;
    }
  }

  const listEl = document.getElementById('edenStructList');
  if (listEl) {
    listEl.innerHTML = filtered.map((s) => {
      const meta = STRUCTURE_TYPES[s.type];
      const isTarget = (plan.targets || []).includes(s.id);
      const tm = getStructTeamMeta(plan, s.id);
      const team = isTeamPlanEnabled(plan) && tm.team ? getTeamInfo(plan, tm.team) : null;
      const icon = getStructureIcon(s.type);
      const thumb = isIconReady(icon)
        ? `<img class="eden-struct-thumb" src="${icon instanceof HTMLImageElement ? icon.src : icon.toDataURL()}" alt="">`
        : `<span class="eden-struct-dot" style="background:${meta?.color}"></span>`;
      const rowClass = CATEGORY_ROW_CLASS[meta?.category] || '';
      const ring = STATUS_COLORS[getStructureStatus(plan, s)] || STATUS_COLORS.neutral;
      return `<button type="button" class="eden-struct-row ${rowClass} ${selectedId === s.id ? 'active' : ''}" data-id="${s.id}">
        <span class="eden-status-ring" style="--ring:${ring}"></span>
        ${thumb}
        <span class="eden-struct-info"><strong>${getStructureLabel(s.type)}</strong> ${s.zone} <em>${s.x}:${s.y}</em></span>
        <span class="eden-struct-pts">${meta?.points} OV</span>
        ${team ? `<span class="eden-team-pill" style="--team-color:${team.color}" title="${team.name}${tm.gameTime ? ' @ ' + tm.gameTime : ''}">${tm.gameTime || team.name.slice(-1)}</span>` : ''}
        ${isTarget ? '<span class="eden-target-star">★</span>' : ''}
      </button>`;
    }).join('');
  }

  const statsEl = document.getElementById('edenMapStats');
  if (statsEl) {
    const pts = list.reduce((sum, s) => sum + getStructurePoints(s), 0);
    const pathDist = (plan.paths || []).reduce((s, p) => s + (p.distance || 0), 0);
    const pathTime = formatTravelTime(estimateTravelMinutes(pathDist, plan.speed || 1));
    const assignedCount = isTeamPlanEnabled(plan)
      ? list.filter((s) => getStructTeamMeta(plan, s.id).team).length
      : 0;
    const modeLabel = viewMode === 'scout' ? ` · ${edenT('edenModeScout')}` : viewMode === 'route' ? ` · ${edenT('edenModeRoute')}` : viewMode === 'teams' ? ` · ${edenT('edenModeTeams')}` : '';
    statsEl.textContent = `${filtered.length}/${list.length} ${edenT('edenStatsShown')} · ${pts.toLocaleString()} OV · ${assignedCount} ${edenT('edenStatsTeams')} · ${(plan.targets || []).length} ${edenT('edenStatsTargets')} · ${(plan.paths || []).length} ${edenT('edenStatsPaths')} (${pathDist.toLocaleString()} ${edenT('edenMeasureTiles')}, ~${pathTime})${modeLabel}`;
  }

  const boardEl = document.getElementById('edenTeamBoard');
  if (boardEl) {
    boardEl.innerHTML = renderTeamBoardHtml(plan, list, edenT);
  }

  onSyncTeamPlanUi();
}
