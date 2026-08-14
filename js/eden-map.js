import {
  STRUCTURE_TYPES,
  X1_PLANNING_TARGETS,
  TEMPLE_TYPES,
  OVERVIEW_STRUCTURE_TYPES,
  getEdenSectors,
  getSectorStructures,
  getSectorBounds,
  getStructureLabel,
  getStructureShort,
  getStructurePoints,
  getSectorFaction,
  syncEdenSectorSelect,
  isEdenSectorKey,
  parseCoordInput,
  findStructureByCoords,
  findSectorForCoords,
  ensureEdenDatasetsLoaded,
} from './eden-map-data.js';
import { initEdenSeasonPicker } from './eden-map-season.js?v=20260708_101500';
import {
  MAP_BOUNDS,
  drawTerrainLayer,
  findRoute,
  routeThroughWaypoints,
  getTerrainAt,
} from './eden-map-terrain.js?v=20260708_101500';
import {
  preloadStructureIcons,
  onStructureIconsReady,
  getStructureIcon,
  isIconReady,
  loadStructureIcon,
  preloadReferenceMap,
  preloadScreenshotRefs,
  preloadSectorTiles,
  preloadStrategyFloor,
  getSectorTileIds,
  getSectorTileImage,
  isSectorTileReady,
  isUserStructureIcon,
  EDEN_STRATEGY_FLOOR,
} from './eden-map-assets.js?v=20260708_101500';
import { initEdenMapUI } from './eden-map-ui.js?v=20260708_101500';
import {
  createEmptyPlan,
  loadPlansStore,
  savePlansStore,
  fuzzyIncludes,
  estimateTravelMinutes,
  formatTravelTime,
  hitTestPath,
  drawSegmentLabels,
  drawTerritoryOverlay,
  drawFogOfWar,
  drawHeatmap,
  drawSectorSheetFlat,
  maskReferenceCapitals,
  animateCamera,
  exportMapAsPng,
  drawPlanSketches,
  applySectorClip,
  drawSectorIsolateChrome,
  pathTouchesSector,
} from './eden-map-features.js?v=20260708_101500';
import {
  startScoutSync,
  stopScoutSync,
  pullScoutIntel,
  pushScoutIntel,
  mergeScoutIntel,
} from './eden-map-scout.js';
import { translations } from './translations.js';
import { currentLanguage } from './state.js';
import { initEdenMapGuide, openEdenGuide } from './eden-map-guide.js';
import { openLoyaltyFromEden } from './loyalty-calculator.js';
import { mountGameClock } from './game-time.js';
import {
  EDEN_TEAM_IDS,
  getActiveTeamIds,
  getTeamInfo,
  getStructTeamMeta,
  isTeamPlanEnabled,
  normalizeTeamPlanSettings,
  pruneTeamAssignments,
  setStructTeamMeta,
  renderTeamBoardHtml,
} from './eden-map-teams.js';
import { initEdenControlTips } from './eden-tooltips.js?v=20260708_101500';
import { EDEN_MAP_CONFIG } from './eden-map-config.js';
import { renderSidebar as renderSidebarModule } from './eden-map-sidebar.js?v=20260708_101500';
import { bindToolbar as bindToolbarModule } from './eden-map-toolbar.js';
import {
  applyEdenMapDomTranslations,
  edenMapText,
  getEdenMissionDisplayLabel,
  getEdenPlanDisplayName,
  getEdenPresetTargetDisplayLabel,
  getEdenSectorDisplayLabel,
  getEdenStoredRouteDisplayLabel,
  getEdenStructureDisplayLabel,
  getEdenTerrainDisplayLabel,
  loadEdenMapLocale,
} from './i18n/eden-map/index.js';

let _edenLiveMapApi = null;
let refreshEdenMapPlannerViewport = () => false;

/** Re-measure the canvas after the Eden Hub reveals the Map sub-tab. */
export function refreshEdenMapViewport() {
  return refreshEdenMapPlannerViewport();
}
let edenMapLanguageGeneration = 0;
let refreshEdenMapLanguage = async () => {
  const requestId = ++edenMapLanguageGeneration;
  await loadEdenMapLocale();
  if (requestId !== edenMapLanguageGeneration) return false;
  applyEdenMapDomTranslations(document.getElementById('edenMapRoot'));
  return true;
};

window.addEventListener('edenLanguageUpdate', () => {
  void refreshEdenMapLanguage();
});

function edenT(key) {
  const lang =
    currentLanguage || window.VTS_INITIAL_LANGUAGE || document.documentElement.lang || 'en';
  return translations[lang]?.[key] || translations.en[key] || key;
}

const PLAN_KEY = 'vts_eden_map_plan_v2';
const MIN_SCALE = 0.12;
const MAX_SCALE = 3.2;
const ZOOM_OVERVIEW_MAX = 0.54;
const ZOOM_DETAIL_MIN = 0.82;
const ZOOM_PRESETS = [0.25, 0.42, 0.54, 0.75, 0.82, 1.0, 1.5, 2.0, MAX_SCALE];
const STATUS_COLORS = {
  owned: '#22c55e',
  contested: '#f59e0b',
  enemy: '#ef4444',
  neutral: '#94a3b8',
};
const CATEGORY_ROW_CLASS = {
  gate: 'eden-row-gate',
  town: 'eden-row-town',
  capital: 'eden-row-capital',
  stronghold: 'eden-row-capital',
  temple: 'eden-row-temple',
};
const MISSION_FALLBACK = {
  id: 'vts',
  name: 'VTS',
  color: '#22d3ee',
  side: 'ours',
  teams: ['all'],
  time: '',
  label: '',
};
const CANVAS_RENDER_SCALE_MIN = 2;
const CANVAS_RENDER_SCALE_MAX = 2.5;
const POINTER_DRAG_THRESHOLD_PX = 6;
const TARGET_STRUCTURE_SNAP_RADIUS_MUL = 2.35;
function getCanvasRenderScale() {
  const dpr = Number(window.devicePixelRatio) || 1;
  return Math.min(CANVAS_RENDER_SCALE_MAX, Math.max(CANVAS_RENDER_SCALE_MIN, dpr));
}
function normalizePlan(raw) {
  const plan = { ...createEmptyPlan(), ...raw };
  normalizeTeamPlanSettings(plan);
  return plan;
}

export function initEdenMapPlanner() {
  const root = document.getElementById('edenMapRoot');
  const canvas = document.getElementById('edenMapCanvas');
  const sidebar = document.getElementById('edenMapSidebar');
  if (!root || !canvas || !sidebar) return;

  applyEdenMapDomTranslations(root);

  const ctx = canvas.getContext('2d');
  let sectorKey = 'FULL';
  let sectorIsolate = false;
  let fitAnimGen = 0;
  let isolateToggleLock = false;
  let tool = 'navigate';
  let snapPreview = null;
  let selectedPathIdx = null;
  let selectedWaypointIdx = null;
  let draggingWaypoint = null;
  let hoverPathHit = null;
  let viewMode = 'strategic';
  let routeStart = null;
  let routeEnd = null;
  let scoutActive = false;
  let onSelectionChange = null;
  let onRedrawExtra = null;
  let scale = 0.42;
  let offsetX = 0;
  let offsetY = 0;
  let panning = false;
  let interacting = false;
  let dragMoved = false;
  let pointerDownHit = null;
  let drawRaf = 0;
  let interactEndTimer = 0;
  let sidebarDirty = true;
  let pointerStart = { x: 0, y: 0 };
  let lastPointer = { x: 0, y: 0 };

  let cachedCanvasRect = null;
  let coordHudEl = null;
  let hoverPanelEl = null;
  let lastHudText = '';
  let lastHoverPanelText = '';
  let lastRouteKey = '';
  let lastRouteDistance = 0;
  let resizeTimer = 0;
  let pendingTargetPlacement = null;
  let selectedId = null;
  let pathDraft = [];
  let measureA = null;
  let measureB = null;
  let drawDraft = null;
  let drawing = false;
  let hoverStruct = null;
  let hoverWorld = null;
  let plansStore = loadPlansStore();
  let activePlanId = plansStore.activeId || 'default';
  let plan = normalizePlan(plansStore.plans[activePlanId]?.plan);
  let refOpacity = 0.96;
  let screenshotOpacity = 0.72;
  let factionFilter = 'all';
  let coordSearchPin = null;
  let listSort = 'points';

  const layers = {
    strategyFloor: true,
    reference: false,
    screenshots: false,
    terrain: false,
    structures: false,
    paths: true,
    targets: true,
    teams: false,
    labels: false,
    zones: false,
    fog: false,
    heatmap: false,
    territory: false,
    sectorTiles: false,
  };

  const sidebarState = { filtersPopulatedFor: null };
  const toolbarState = { plan, layers, pathDraft, canvas, root };

  function syncOfflineStatus() {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const status = document.getElementById('edenOfflineStatus');
    root.classList.toggle('eden-map-offline', offline);
    if (!status) return;
    status.classList.toggle('hidden', !offline);
    status.textContent = offline ? edenMapText('offline') : '';
  }

  syncOfflineStatus();
  window.addEventListener('online', () => {
    syncOfflineStatus();
    ensureStrategyFloorLoaded();
    ensureReferenceLoaded();
    ensureScreenshotsLoaded();
    ensureSectorTilesLoaded();
    scheduleDraw();
  });
  window.addEventListener('offline', syncOfflineStatus);

  let savePlanTimer = null;
  let savePlanPending = null;
  function persistPlan(planId, nextPlan) {
    plansStore.plans[planId] = plansStore.plans[planId] || {
      name: 'Plan',
      plan: createEmptyPlan(),
    };
    plansStore.plans[planId].plan = nextPlan;
    if (planId === activePlanId) {
      plansStore.activeId = planId;
      localStorage.setItem(PLAN_KEY, JSON.stringify(nextPlan));
    }
    savePlansStore(plansStore);
  }
  function flushSavePlan() {
    if (savePlanTimer) clearTimeout(savePlanTimer);
    savePlanTimer = null;
    if (!savePlanPending) return;
    const pending = savePlanPending;
    savePlanPending = null;
    persistPlan(pending.id, pending.plan);
  }
  function savePlan() {
    if (savePlanTimer) clearTimeout(savePlanTimer);
    savePlanPending = { id: activePlanId, plan };
    savePlanTimer = setTimeout(() => {
      flushSavePlan();
    }, 150);
  }
  window.addEventListener('beforeunload', flushSavePlan);

  function applyTeamPlanLayerState() {
    const teamsLayerBtn = document.querySelector('[data-eden-layer="teams"]');
    if (isTeamPlanEnabled(plan)) {
      layers.teams = true;
      teamsLayerBtn?.classList.add('active');
    } else {
      layers.teams = false;
      teamsLayerBtn?.classList.remove('active');
      if (viewMode === 'teams') {
        viewMode = 'strategic';
        const viewModeSel = document.getElementById('edenViewMode');
        if (viewModeSel) viewModeSel.value = 'strategic';
      }
    }
  }

  function switchPlan(id) {
    if (!plansStore.plans[id]) return;
    flushSavePlan();
    activePlanId = id;
    plan = normalizePlan(plansStore.plans[id].plan);
    selectedId = null;
    selectedPathIdx = null;
    pathDraft = [];
    toolbarState.plan = plan;
    toolbarState.pathDraft = pathDraft;
    applyTeamPlanLayerState();
    notifySelection();
    syncPlanSelector();
    draw();
  }

  function syncPlanSelector() {
    const sel = document.getElementById('edenPlanSelect');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = Object.entries(plansStore.plans)
      .map(
        ([id, entry]) => `<option value="${id}">${getEdenPlanDisplayName(id, entry.name)}</option>`
      )
      .join('');
    if (plansStore.plans[prev]) sel.value = prev;
    else sel.value = activePlanId;
  }

  function markSectorExplored(key) {
    if (key === 'FULL') return;
    plan.explored = plan.explored || {};
    if (!plan.explored[key]) {
      plan.explored[key] = true;
      savePlan();
    }
  }

  function syncWonderSectorSelect() {
    const el = document.getElementById('edenSectorSelect');
    if (!el) return;
    const prev = el.value;
    const wonderIds = getSectorTileIds();
    const sectors = getEdenSectors();
    const keys = (wonderIds.length ? wonderIds : []).filter((k) => sectors[k]).sort();
    if (!keys.length) {
      syncEdenSectorSelect(el, {
        fullLabel: edenT('edenSectorFull'),
        getSectorLabel: (key, label) => getEdenSectorDisplayLabel(key, label),
      });
      return;
    }
    const opts = [`<option value="FULL">${edenT('edenSectorFull')}</option>`];
    keys.forEach((key) => {
      const sec = sectors[key];
      const label = `${getEdenSectorDisplayLabel(key, sec?.label)} (${key})`;
      opts.push(`<option value="${key}">${label}</option>`);
    });
    el.innerHTML = opts.join('');
    const valid = prev === 'FULL' || keys.includes(prev);
    el.value = valid ? prev : 'FULL';
    if (!valid && prev !== 'FULL') {
      sectorKey = 'FULL';
      sectorIsolate = false;
    }
  }

  onStructureIconsReady(() => scheduleDraw());
  preloadStrategyFloor(() => scheduleDraw());
  preloadReferenceMap(() => scheduleDraw());
  preloadSectorTiles(() => {
    syncWonderSectorSelect();
    syncQuickJump(sectorKey);
    scheduleDraw();
  });
  preloadStructureIcons([...OVERVIEW_STRUCTURE_TYPES]);
  const deferIcons = () => preloadStructureIcons(Object.keys(STRUCTURE_TYPES));
  if (typeof requestIdleCallback === 'function') requestIdleCallback(deferIcons, { timeout: 1200 });
  else setTimeout(deferIcons, 80);

  function ensureReferenceLoaded() {
    if (!layers.reference) return;
    preloadReferenceMap(() => scheduleDraw());
  }
  function ensureStrategyFloorLoaded() {
    if (!layers.strategyFloor) return;
    preloadStrategyFloor(() => scheduleDraw());
  }
  function ensureScreenshotsLoaded() {
    if (!layers.screenshots) return;
    preloadScreenshotRefs(() => scheduleDraw());
  }
  function ensureSectorTilesLoaded() {
    preloadSectorTiles(() => scheduleDraw());
  }

  const iso = (x, y) => ({
    x: (x - y) * 0.5 * scale + offsetX,
    y: (x + y) * 0.25 * scale + offsetY,
  });

  const structures = () => {
    const base = getSectorStructures(sectorKey);
    const guilds = plan.guilds || {};
    const statuses = plan.status || {};
    return base.map((s) => ({
      ...s,
      guild: guilds[s.id] || s.guild || '',
      status: statuses[s.id] || 'neutral',
    }));
  };

  function getMapBounds() {
    return sectorKey === 'FULL' ? MAP_BOUNDS : getSectorBounds(sectorKey);
  }

  function getStructureStatus(s) {
    return plan.status?.[s.id] || 'neutral';
  }

  function structureRenderMode() {
    if (scale >= ZOOM_DETAIL_MIN) return 'full';
    if (scale >= ZOOM_OVERVIEW_MAX) return 'compact';
    return 'overview';
  }

  function shouldDrawStructure(s) {
    if (structureRenderMode() === 'overview') return OVERVIEW_STRUCTURE_TYPES.has(s.type);
    return true;
  }

  const CATEGORY_ICON_BOOST = {
    gate: 1.35,
    town: 1.1,
    stronghold: 1.1,
    capital: 1.55,
    temple: 1.05,
  };

  function structureIconScale(mode) {
    if (mode === 'overview') return 1.45;
    if (mode === 'compact') return 1.25;
    return 1.55;
  }

  function structureCategoryBoost(type) {
    const cat = STRUCTURE_TYPES[type]?.category;
    return CATEGORY_ICON_BOOST[cat] || 1;
  }

  function notifySelection() {
    onSelectionChange?.(!!selectedId);
  }

  function syncToolButtons() {
    document.querySelectorAll('[data-eden-tool]').forEach((b) => {
      const on = b.dataset.edenTool === tool;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const pathTools = document.getElementById('edenPathTools');
    const drawTools = document.getElementById('edenDrawTools');
    const showPathOpts = tool === 'path' || tool === 'measure';
    const showDrawOpts = tool === 'draw';
    pathTools?.classList.toggle('eden-path-tools--visible', showPathOpts);
    drawTools?.classList.toggle('eden-path-tools--visible', showDrawOpts);
    const root = document.getElementById('edenMapRoot');
    root?.classList.toggle('eden-tool-path-active', tool === 'path');
    root?.classList.toggle('eden-tool-measure-active', tool === 'measure');
    root?.classList.toggle('eden-tool-draw-active', tool === 'draw');
    canvas.style.cursor = tool === 'navigate' ? 'grab' : 'crosshair';
  }

  function getDrawColor() {
    return (
      getMissionConfig().color ||
      document.getElementById('edenDrawColor')?.value ||
      document.getElementById('edenPathColor')?.value ||
      '#f97316'
    );
  }

  function getMissionConfig() {
    const allianceSelect = document.getElementById('edenMissionAlliance');
    const option = allianceSelect?.selectedOptions?.[0];
    const selectedTeams = [...document.querySelectorAll('[data-eden-mission-team].active')]
      .map((btn) => btn.dataset.edenMissionTeam)
      .filter(Boolean);
    const teams =
      selectedTeams.includes('all') || !selectedTeams.length
        ? ['all']
        : selectedTeams.filter((team) => EDEN_TEAM_IDS.includes(team));
    return {
      ...MISSION_FALLBACK,
      id: allianceSelect?.value || MISSION_FALLBACK.id,
      name: option?.dataset.canonicalName || MISSION_FALLBACK.name,
      color: option?.dataset?.color || MISSION_FALLBACK.color,
      side: option?.dataset?.side || MISSION_FALLBACK.side,
      teams,
      time: document.getElementById('edenMissionTime')?.value?.trim() || '',
      label: document.getElementById('edenMissionLabel')?.value?.trim() || '',
    };
  }

  function syncMissionControls() {
    const mission = getMissionConfig();
    const pathColor = document.getElementById('edenPathColor');
    const drawColor = document.getElementById('edenDrawColor');
    const preview = document.getElementById('edenMissionPreview');
    if (pathColor?.querySelector(`option[value="${mission.color}"]`))
      pathColor.value = mission.color;
    if (drawColor?.querySelector(`option[value="${mission.color}"]`))
      drawColor.value = mission.color;
    if (preview) {
      const teams = mission.teams.includes('all')
        ? 'VTS'
        : mission.teams.map((team) => team.replace('t', '')).join('+');
      preview.textContent = mission.id === 'vts' ? teams : getEdenMissionDisplayLabel(mission.id);
      preview.style.setProperty('--mission-color', mission.color);
    }
    root?.style.setProperty('--eden-mission-color', mission.color);
    draw();
  }

  function createMissionPayload(fallbackLabel = '') {
    const mission = getMissionConfig();
    return {
      alliance: mission.id,
      allianceName: mission.name,
      side: mission.side,
      color: mission.color,
      teams: [...mission.teams],
      time: mission.time,
      label: mission.label || fallbackLabel,
    };
  }

  function formatTargetTeamLabel(target) {
    if (!target?.teams?.length || target.teams.includes('all'))
      return target?.alliance === 'vts' ? 'VTS' : '';
    return target.teams.map((team) => team.replace('t', '')).join('+');
  }

  function targetDisplayLabel(target, fallback = '') {
    return target?.label || target?.structureName || target?.allianceName || fallback;
  }

  function finishDrawStroke() {
    if (!drawDraft) return;
    if (drawDraft.points.length >= 2) {
      plan.drawings = plan.drawings || [];
      plan.drawings.push(drawDraft);
      savePlan();
    }
    drawDraft = null;
    drawing = false;
  }

  function setTool(next, opts = {}) {
    if (tool === 'draw') {
      if (opts.cancelDraw) {
        drawDraft = null;
        drawing = false;
      } else {
        finishDrawStroke();
      }
    }
    tool = next;
    if (tool !== 'measure') measureA = measureB = null;
    if (tool !== 'path') {
      pathDraft = [];
      toolbarState.pathDraft = pathDraft;
    }
    if (tool !== 'draw') {
      drawDraft = null;
      drawing = false;
    }
    syncToolButtons();
    draw();
  }

  function structurePassesFaction(s) {
    if (factionFilter === 'all') return true;
    const sk = s.sector || sectorKey;
    return getSectorFaction(sk) === factionFilter;
  }

  function structurePassesOwnership(s) {
    const ownFilter = document.getElementById('edenOwnershipFilter')?.value || 'all';
    if (ownFilter === 'all') return true;
    return getStructureStatus(s) === ownFilter;
  }

  function structureVisible(s) {
    return structurePassesFaction(s) && structurePassesOwnership(s);
  }

  function clampScale(val) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, val));
  }

  function snapScale(val) {
    let best = val;
    let bestD = 0.06;
    ZOOM_PRESETS.forEach((p) => {
      const d = Math.abs(p - val);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    });
    return clampScale(best);
  }

  function nextPresetScale(direction) {
    if (direction > 0) {
      const next = ZOOM_PRESETS.find((p) => p > scale + 0.008);
      return next ?? MAX_SCALE;
    }
    const prev = [...ZOOM_PRESETS].reverse().find((p) => p < scale - 0.008);
    return prev ?? MIN_SCALE;
  }

  function screenToWorldPrecise(mx, my) {
    const sx = mx - offsetX;
    const sy = my - offsetY;
    return {
      x: (sx / (0.5 * scale) + sy / (0.25 * scale)) / 2,
      y: (sy / (0.25 * scale) - sx / (0.5 * scale)) / 2,
    };
  }

  /** Keep world point under (mx, my) fixed while changing scale — fixes zoom drift. */
  function zoomAtSheet(mx, my, newScale) {
    const dpr = getCanvasRenderScale();
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const img = getSectorTileImage(sectorKey);
    if (!isSectorTileReady(img)) {
      scale = clampScale(newScale);
      return;
    }
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const pad = 0.02;
    const baseFit = Math.min((w * (1 - pad * 2)) / iw, (h * (1 - pad * 2)) / ih);
    const prevScale = scale;
    scale = clampScale(newScale);
    const oldDw = iw * baseFit * prevScale;
    const oldDh = ih * baseFit * prevScale;
    const oldDx = (w - oldDw) * 0.5 + offsetX;
    const oldDy = (h - oldDh) * 0.5 + offsetY;
    const ix = oldDw > 0 ? (mx - oldDx) / oldDw : 0.5;
    const iy = oldDh > 0 ? (my - oldDy) / oldDh : 0.5;
    const newDw = iw * baseFit * scale;
    const newDh = ih * baseFit * scale;
    offsetX = mx - ix * newDw - (w - newDw) * 0.5;
    offsetY = my - iy * newDh - (h - newDh) * 0.5;
    markInteracting();
    scheduleDraw({ sidebar: false });
    endInteraction();
  }

  function zoomAt(mx, my, newScale) {
    if (isSectorSheetView()) {
      zoomAtSheet(mx, my, newScale);
      return;
    }
    const world = screenToWorldPrecise(mx, my);
    scale = clampScale(newScale);
    const screen = iso(world.x, world.y);
    offsetX += mx - screen.x;
    offsetY += my - screen.y;
    markInteracting();
    scheduleDraw({ sidebar: false });
    endInteraction();
  }

  function zoomStep(direction) {
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, nextPresetScale(direction));
  }

  function getCanvasRect() {
    if (!cachedCanvasRect) cachedCanvasRect = canvas.getBoundingClientRect();
    return cachedCanvasRect;
  }

  function canvasPointer(e) {
    const rect = getCanvasRect();
    return { mx: e.clientX - rect.left, my: e.clientY - rect.top };
  }

  function panBy(dx, dy) {
    offsetX += dx;
    offsetY += dy;
    scheduleDraw({ sidebar: false });
  }

  function loadPlanFromHash() {
    const storeMatch = location.hash.match(/edenStore=([^&]+)/);
    const planMatch = location.hash.match(/eden=([^&]+)/);
    try {
      if (storeMatch) {
        const payload = JSON.parse(decodeURIComponent(atob(storeMatch[1])));
        if (payload?.plans && typeof payload.plans === 'object') {
          plansStore = {
            activeId: payload.activeId || Object.keys(payload.plans)[0] || 'default',
            plans: payload.plans,
          };
          activePlanId = plansStore.activeId;
          plan = normalizePlan(plansStore.plans[activePlanId]?.plan);
          savePlansStore(plansStore);
          savePlan();
          syncPlanSelector();
          if (typeof window.showToast === 'function')
            window.showToast(edenT('edenPlanLoadedToast'), 'success');
        }
        return;
      }
      if (!planMatch) return;
      plan = normalizePlan(JSON.parse(decodeURIComponent(atob(planMatch[1]))));
      savePlan();
      if (typeof window.showToast === 'function')
        window.showToast(edenT('edenPlanLoadedToast'), 'success');
    } catch {
      /* ignore bad hash */
    }
  }

  function sharePlanLink() {
    try {
      plansStore.plans[activePlanId] = plansStore.plans[activePlanId] || {
        name: 'Plan',
        plan: createEmptyPlan(),
      };
      plansStore.plans[activePlanId].plan = plan;
      plansStore.activeId = activePlanId;
      const payload = btoa(
        encodeURIComponent(
          JSON.stringify({
            version: 2,
            activeId: activePlanId,
            plans: plansStore.plans,
          })
        )
      );
      const url = `${location.origin}${location.pathname}#edenStore=${payload}`;
      navigator.clipboard?.writeText(url).then(() => {
        if (typeof window.showToast === 'function')
          window.showToast(edenT('edenShareCopiedToast'), 'success');
      });
    } catch {
      if (typeof window.showToast === 'function')
        window.showToast(edenT('edenShareFailedToast'), 'error');
    }
  }

  function populateFilters(force = false) {
    if (!force && sidebarState.filtersPopulatedFor === sectorKey) return;
    sidebarState.filtersPopulatedFor = sectorKey;

    const structs = structures();
    const zones = [...new Set(structs.map((s) => s.zone))].sort();
    const types = [...new Set(structs.map((s) => s.type))].sort((a, b) =>
      getEdenStructureDisplayLabel(a).localeCompare(getEdenStructureDisplayLabel(b))
    );

    const zoneSelect = document.getElementById('edenZoneFilter');
    const typeSelect = document.getElementById('edenTypeFilter');
    if (!zoneSelect || !typeSelect) return;

    const prevZone = zoneSelect.value;
    const prevType = typeSelect.value;

    zoneSelect.innerHTML =
      `<option value="all">${edenT('edenAllZones')}</option>` +
      zones.map((z) => `<option value="${z}">${z}</option>`).join('');
    typeSelect.innerHTML =
      `<option value="all">${edenT('edenAllTypes')}</option>` +
      types.map((t) => `<option value="${t}">${getEdenStructureDisplayLabel(t)}</option>`).join('');

    if ([...zoneSelect.options].some((o) => o.value === prevZone)) zoneSelect.value = prevZone;
    if ([...typeSelect.options].some((o) => o.value === prevType)) typeSelect.value = prevType;
  }

  function fitViewToBounds(b, { sectorFocus = false } = {}) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const pad = sectorFocus ? 0.07 : 0.1;
    const flatStrategyFloor =
      !sectorFocus &&
      sectorKey === 'FULL' &&
      layers.strategyFloor &&
      EDEN_STRATEGY_FLOOR.layout === 'screen';
    const projectedWAt1 = Math.max((b.maxX - b.minX + b.maxY - b.minY) * 0.5, 40);
    const wAt1 = flatStrategyFloor ? projectedWAt1 : Math.max((b.maxX - b.minX) * 0.5, 40);
    const hAt1 = flatStrategyFloor
      ? Math.max(projectedWAt1 / (EDEN_STRATEGY_FLOOR.screenAspect || 1.6), 40)
      : Math.max((b.maxX - b.minX + b.maxY - b.minY) * 0.25, 40);
    let nextScale = Math.min(
      (rect.width * (1 - pad * 2)) / wAt1,
      (rect.height * (1 - pad * 2)) / hAt1
    );

    if (sectorFocus) {
      // Zoom into sector so gates/towns stay visible (overview mode hides them below 0.54×).
      nextScale = clampScale(Math.max(ZOOM_DETAIL_MIN * 0.92, Math.min(MAX_SCALE, nextScale)));
    } else {
      nextScale = clampScale(Math.min(ZOOM_OVERVIEW_MAX, nextScale * 0.95));
    }

    const snapped = snapScale(nextScale);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    return {
      scale: snapped,
      offsetX: rect.width * 0.5 - (cx - cy) * 0.5 * snapped,
      offsetY:
        rect.height * (flatStrategyFloor ? 0.5 : sectorFocus ? 0.42 : 0.15) -
        (cx + cy) * 0.25 * snapped,
    };
  }

  function applyCamera(target) {
    offsetX = target.offsetX;
    offsetY = target.offsetY;
    scale = target.scale;
  }

  function fitView(smooth = false) {
    if (isSectorSheetView()) {
      const target = { scale: 1, offsetX: 0, offsetY: 0 };
      const gen = ++fitAnimGen;
      if (smooth) {
        return animateCamera(
          () => ({ offsetX, offsetY, scale }),
          (cam) => {
            if (gen !== fitAnimGen) return;
            applyCamera(cam);
          },
          target,
          () => {
            if (gen !== fitAnimGen) return;
            scheduleDraw({ sidebar: false });
          }
        );
      }
      applyCamera(target);
      return;
    }
    const b = sectorKey === 'FULL' ? MAP_BOUNDS : getSectorBounds(sectorKey);
    const sectorFocus = sectorKey !== 'FULL';
    const target = fitViewToBounds(b, { sectorFocus });
    const gen = ++fitAnimGen;

    if (smooth && sectorKey !== 'FULL') {
      return animateCamera(
        () => ({ offsetX, offsetY, scale }),
        (cam) => {
          if (gen !== fitAnimGen) return;
          applyCamera(cam);
        },
        target,
        () => {
          if (gen !== fitAnimGen) return;
          scheduleDraw({ sidebar: false });
        }
      );
    }

    applyCamera(target);
  }

  function centerOn(x, y, smooth = false) {
    const rect = canvas.getBoundingClientRect();
    const target = {
      offsetX: rect.width * 0.5 - (x - y) * 0.5 * scale,
      offsetY: rect.height * 0.4 - (x + y) * 0.25 * scale,
      scale,
    };
    if (smooth) {
      return animateCamera(
        () => ({ offsetX, offsetY, scale }),
        (cam) => {
          offsetX = cam.offsetX;
          offsetY = cam.offsetY;
          scale = cam.scale;
        },
        target,
        () => scheduleDraw({ sidebar: false })
      );
    }
    offsetX = target.offsetX;
    offsetY = target.offsetY;
  }

  function zoomToStructure(s, targetScale = 1.2) {
    const rect = canvas.getBoundingClientRect();
    const nextScale = snapScale(Math.min(MAX_SCALE, Math.max(0.5, targetScale)));
    const target = {
      offsetX: rect.width * 0.5 - (s.x - s.y) * 0.5 * nextScale,
      offsetY: rect.height * 0.42 - (s.x + s.y) * 0.25 * nextScale,
      scale: nextScale,
    };
    return animateCamera(
      () => ({ offsetX, offsetY, scale }),
      (cam) => {
        offsetX = cam.offsetX;
        offsetY = cam.offsetY;
        scale = cam.scale;
      },
      target,
      () => scheduleDraw({ sidebar: false })
    );
  }

  function resize() {
    cachedCanvasRect = null;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = getCanvasRenderScale();
    const cssWidth = Math.max(1, Math.floor(rect.width));
    const cssHeight = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = cssHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (!offsetX && !offsetY) fitView();
    draw();
  }

  function debouncedResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }

  function syncFullscreenState() {
    const active =
      document.fullscreenElement === root ||
      root.classList.contains('eden-map-fullscreen-fallback');
    root.classList.toggle('eden-map-fullscreen', active);
    const btn = document.getElementById('edenFullscreen');
    if (btn) {
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.textContent = active ? edenMapText('exitFullscreen') : edenMapText('fullscreen');
      btn.title = active ? edenMapText('exitFullscreenTitle') : edenMapText('fullscreenTitle');
    }
    window.setTimeout(() => {
      resize();
      scheduleDraw({ sidebar: true });
    }, 80);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === root) {
        await document.exitFullscreen();
        return;
      }
      if (root.requestFullscreen) {
        await root.requestFullscreen();
        return;
      }
    } catch {
      // Fall through to the CSS fallback below.
    }
    root.classList.toggle('eden-map-fullscreen-fallback');
    syncFullscreenState();
  }

  function drawSectorLabel() {
    if (sectorKey === 'FULL') return;
    const sec = getEdenSectors()[sectorKey];
    if (!sec) return;
    if (isSectorIsolated() || layers.labels) {
      ctx.save();
      ctx.fillStyle = 'rgba(15,23,42,0.82)';
      ctx.strokeStyle = 'rgba(129,140,248,0.45)';
      ctx.lineWidth = 1;
      const label = isSectorIsolated()
        ? `${getEdenSectorDisplayLabel(sectorKey, sec.label)} (${sectorKey})`
        : getEdenSectorDisplayLabel(sectorKey, sec.label);
      ctx.font = `bold ${isSectorIsolated() ? 15 : 14}px Inter, sans-serif`;
      const tw = ctx.measureText(label).width + 24;
      const th = 28;
      ctx.beginPath();
      ctx.roundRect?.(12, 10, tw, th, 8);
      if (!ctx.roundRect) ctx.rect(12, 10, tw, th);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 24, 24);
      ctx.restore();
    }
  }

  function drawZoneOverlays() {
    if (!layers.zones || sectorKey === 'FULL') return;
    const zones = getEdenSectors()[sectorKey]?.zoneCenters || {};
    Object.entries(zones).forEach(([zone, center]) => {
      const p = iso(center.x, center.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 40 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59,130,246,0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(96,165,250,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (layers.labels) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `bold ${Math.max(10, 12 * scale)}px Inter`;
        ctx.textAlign = 'center';
        ctx.fillText(zone, p.x, p.y + 4);
      }
    });
  }

  function drawStrategyFocusSectors() {
    if (!layers.strategyFloor) return;
    const focus = EDEN_STRATEGY_FLOOR.focusSectors || [];
    if (!focus.length) return;

    ctx.save();
    focus.forEach((key, index) => {
      if (sectorKey !== 'FULL' && sectorKey !== key) return;
      const bounds = getSectorBounds(key);
      const sec = getEdenSectors()[key];
      if (!bounds || !sec) return;
      const p0 = iso(bounds.minX, bounds.minY);
      const p1 = iso(bounds.maxX, bounds.minY);
      const p2 = iso(bounds.maxX, bounds.maxY);
      const p3 = iso(bounds.minX, bounds.maxY);
      const color = index % 2 === 0 ? '#facc15' : '#22d3ee';

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fillStyle = index % 2 === 0 ? 'rgba(250,204,21,0.08)' : 'rgba(34,211,238,0.08)';
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, 2.5 * scale);
      ctx.setLineDash([Math.max(8, 16 * scale), Math.max(5, 10 * scale)]);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.restore();
  }

  function drawStructure(s) {
    if (!shouldDrawStructure(s)) return;
    const meta = STRUCTURE_TYPES[s.type] || STRUCTURE_TYPES.ST1;
    const p = iso(s.x, s.y);
    const isSel = selectedId === s.id;
    const isHover = hoverStruct?.id === s.id;
    const isTarget = (plan.targets || []).includes(s.id);
    const status = getStructureStatus(s);
    const mode = structureRenderMode();
    const statusColor = STATUS_COLORS[status] || STATUS_COLORS.neutral;

    const iconMul = structureIconScale(mode) * structureCategoryBoost(s.type);
    const iconSize = Math.max(mode === 'compact' ? 10 : 12, (meta.size || 9) * scale * iconMul);
    const icon = getStructureIcon(s.type) || loadStructureIcon(s.type);

    ctx.beginPath();
    ctx.ellipse(p.x, p.y + iconSize * 0.1, iconSize * 0.5, iconSize * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(40,28,16,0.22)';
    ctx.fill();

    let iw = iconSize;
    let ih = iconSize;
    let iconTop = p.y - iconSize * 0.82;
    let iconBottom = p.y + iconSize * 0.08;

    if (isIconReady(icon)) {
      const sw = icon.naturalWidth || icon.width || 1;
      const sh = icon.naturalHeight || icon.height || 1;
      const fit = iconSize / Math.max(sw, sh);
      iw = sw * fit;
      ih = sh * fit;
      iconBottom = p.y + iconSize * 0.08;
      iconTop = iconBottom - ih;
      if (isUserStructureIcon(s.type)) {
        ctx.save();
        ctx.shadowColor = 'rgba(15,23,42,0.5)';
        ctx.shadowBlur = Math.max(2, 3 * scale);
        ctx.shadowOffsetY = 1;
        ctx.drawImage(icon, p.x - iw / 2, iconTop, iw, ih);
        ctx.restore();
      } else {
        ctx.drawImage(icon, p.x - iw / 2, iconTop, iw, ih);
      }
    } else {
      const r = meta.size * scale * 0.85;
      iconTop = p.y - r * 1.35;
      iconBottom = p.y + r * 0.55;
      iw = r * 2;
      ih = r * 1.9;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r * 1.35);
      ctx.lineTo(p.x + r, p.y - r * 0.35);
      ctx.lineTo(p.x, p.y + r * 0.55);
      ctx.lineTo(p.x - r, p.y - r * 0.35);
      ctx.closePath();
      ctx.fillStyle = meta.color;
      ctx.fill();
    }

    const iconMidY = iconTop + ih * 0.45;

    if (mode !== 'overview' || isSel || isHover) {
      ctx.beginPath();
      ctx.arc(p.x, iconMidY, Math.min(iw, ih) * 0.52, 0, Math.PI * 2);
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = isSel ? 3 : mode === 'compact' ? 1.5 : 2;
      ctx.stroke();
    }

    if (isSel || isHover) {
      const ringR = Math.max(12, Math.min(iw, ih) * 0.72);
      ctx.beginPath();
      ctx.arc(p.x, iconMidY, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = isSel ? '#fff' : '#a5b4fc';
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.stroke();
    }

    if (isTarget) {
      ctx.beginPath();
      ctx.arc(p.x, iconTop - 4 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const teamMeta = getStructTeamMeta(plan, s.id);
    if (isTeamPlanEnabled(plan) && layers.teams && teamMeta.team) {
      const team = getTeamInfo(plan, teamMeta.team);
      if (team) {
        const bx = p.x + iw * 0.38;
        const by = iconTop + ih * 0.1;
        const br = Math.max(5, 6 * scale);
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = team.color;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (teamMeta.gameTime && scale > 0.3) {
          ctx.fillStyle = '#f8fafc';
          ctx.font = `bold ${Math.max(6, 7 * scale)}px Inter`;
          ctx.textAlign = 'center';
          ctx.fillText(teamMeta.gameTime, bx, by - br - 2);
        }
      }
    }

    if (layers.labels && mode === 'full' && (scale > 0.35 || isSel || isHover)) {
      const label = s.guild ? s.guild.slice(0, 6) : getStructureShort(s.type);
      ctx.fillStyle = isSel ? '#fff' : '#cbd5e1';
      ctx.font = `bold ${Math.max(7, 8 * scale)}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText(label, p.x, iconTop - Math.max(6, 8 * scale));
    }
  }

  function drawSnapPreview() {
    if (!snapPreview) return;
    const p = iso(snapPreview.x, snapPreview.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(249,115,22,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawArrowhead(from, to, color, size = 9) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.save();
    ctx.translate(to.x, to.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.45);
    ctx.lineTo(-size, size * 0.45);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawRoutedPath(points, color, label, distance, opts = {}) {
    if (!points?.length) return;
    const { dashed = false, arrows = true, lineWidth = 3.5 } = opts;
    const screenPts = points.map((pt) => iso(pt.x, pt.y));

    ctx.beginPath();
    screenPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = dashed ? 2.5 : lineWidth;
    ctx.setLineDash(dashed ? [10, 7] : []);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.setLineDash([]);

    screenPts.forEach((p, i) => {
      if (i === 0 || i === screenPts.length - 1) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    });

    if (arrows && screenPts.length >= 2) {
      const n = screenPts.length;
      drawArrowhead(screenPts[n - 2], screenPts[n - 1], color);
    }

    if (layers.labels && (label || distance != null)) {
      const first = screenPts[0];
      ctx.fillStyle = color;
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'left';
      const txt = [label, distance != null ? `${distance} tiles` : ''].filter(Boolean).join(' · ');
      ctx.fillText(txt, first.x + 6, first.y - 10);
    }
  }

  function isSectorIsolated() {
    return sectorIsolate && sectorKey !== 'FULL';
  }

  /** Per-sector reference sheet — only when the dedicated Sector HD layer is active. */
  function isSectorSheetView() {
    return sectorKey !== 'FULL' && layers.sectorTiles;
  }

  function syncIsolateUi() {
    const btn = document.getElementById('edenIsolateSector');
    const badge = document.getElementById('edenIsolateBadge');
    const active = isSectorIsolated();
    btn?.classList.toggle('active', active);
    btn?.setAttribute('aria-pressed', active ? 'true' : 'false');
    if (btn) btn.disabled = sectorKey === 'FULL';
    root?.classList.toggle('eden-sector-isolated', active);
    if (badge) {
      const sec = getEdenSectors()[sectorKey];
      badge.textContent = active
        ? `${getEdenSectorDisplayLabel(sectorKey, sec?.label)} · ${edenT('edenIsolateActive')}`
        : '';
      badge.classList.toggle('hidden', !active);
    }
  }

  function toggleSectorIsolate(force) {
    if (isolateToggleLock) return;
    if (sectorKey === 'FULL') {
      if (typeof window.showToast === 'function') {
        window.showToast(edenT('edenIsolateNeedSector'), 'info', 3200);
      }
      return;
    }
    const next = typeof force === 'boolean' ? force : !sectorIsolate;
    if (next === sectorIsolate) return;

    isolateToggleLock = true;
    sectorIsolate = next;
    syncIsolateUi();
    fitView(false);
    draw();
    setTimeout(() => {
      isolateToggleLock = false;
    }, 320);
  }

  function drawPaths() {
    if (!layers.paths) return;
    const isolated = isSectorIsolated();
    const planPaths = (plan.paths || []).filter(
      (p) => !isolated || pathTouchesSector(p, sectorKey)
    );

    planPaths.forEach((path, idx) => {
      const realIdx = (plan.paths || []).indexOf(path);
      const routed = path.routedPath || path.points;
      const color = path.color || '#ef4444';
      const selected = selectedPathIdx === realIdx;
      const showSeg = selected || hoverPathHit?.pathIdx === realIdx;
      drawRoutedPath(routed, color, getEdenStoredRouteDisplayLabel(path.label), path.distance, {
        lineWidth: selected ? 5 : 3.5,
      });
      if (showSeg) drawSegmentLabels(ctx, iso, path, color, layers.labels || selected);
      if (selected && routed?.length) {
        routed.forEach((pt, wi) => {
          const p = iso(pt.x, pt.y);
          ctx.beginPath();
          ctx.arc(p.x, p.y, wi === selectedWaypointIdx ? 8 : 5, 0, Math.PI * 2);
          ctx.fillStyle = wi === selectedWaypointIdx ? '#fff' : color;
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }
    });

    if (pathDraft.length >= 2) {
      const preview = routeThroughWaypoints(pathDraft);
      const draftColor =
        getMissionConfig().color || document.getElementById('edenPathColor')?.value || '#f97316';
      drawRoutedPath(preview.path, draftColor, edenMapText('draft'), preview.distance, {
        dashed: true,
        arrows: true,
      });
    } else if (pathDraft.length === 1) {
      const p = iso(pathDraft[0].x, pathDraft[0].y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = getMissionConfig().color || '#f97316';
      ctx.fill();
    }

    if (measureA) {
      const pa = iso(measureA.x, measureA.y);
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();
      if (layers.labels) {
        ctx.fillStyle = '#cffafe';
        ctx.font = 'bold 10px Inter';
        ctx.fillText('A', pa.x + 12, pa.y - 4);
      }
    }
    if (viewMode === 'route' && routeStart) {
      const p = iso(routeStart.x, routeStart.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (layers.labels) {
        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 10px Inter';
        ctx.fillText('Start', p.x + 10, p.y - 6);
      }
    }

    if (measureB) {
      const pb = iso(measureB.x, measureB.y);
      ctx.beginPath();
      ctx.arc(pb.x, pb.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#a78bfa';
      ctx.fill();
      const route = findRoute(measureA.x, measureA.y, measureB.x, measureB.y);
      drawRoutedPath(route.path, '#a78bfa', null, null);
      const mid = route.path[Math.floor(route.path.length / 2)];
      if (layers.labels && mid) {
        const pm = iso(mid.x, mid.y);
        ctx.fillStyle = '#e9d5ff';
        ctx.font = 'bold 11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`${route.distance} tiles`, pm.x, pm.y - 12);
      }
    }
  }

  function drawCoordSearchPin() {
    if (!coordSearchPin || Date.now() > coordSearchPin.until) {
      coordSearchPin = null;
      return;
    }
    const p = iso(coordSearchPin.x, coordSearchPin.y);
    const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 220);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(250,204,21,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250,204,21,0.85)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (layers.labels) {
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 9px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${coordSearchPin.x}:${coordSearchPin.y}`, p.x, p.y - 16);
    }
    requestAnimationFrame(() => scheduleDraw({ sidebar: false }));
  }

  function pointInCurrentSector(x, y) {
    if (!isSectorIsolated()) return true;
    const b = getSectorBounds(sectorKey);
    return x >= b.minX - 8 && x <= b.maxX + 8 && y >= b.minY - 8 && y <= b.maxY + 8;
  }

  function strokeInCurrentSector(stroke) {
    if (!isSectorIsolated()) return true;
    return stroke.points?.some((pt) => pointInCurrentSector(pt.x, pt.y));
  }

  function drawSketches() {
    if (!layers.paths) return;
    const strokes = (plan.drawings || []).filter(strokeInCurrentSector);
    drawPlanSketches(ctx, iso, strokes, scale, drawDraft);
  }

  function drawPlanningTargets() {
    if (!layers.targets) return;
    (plan.customTargets || [])
      .filter((t) => pointInCurrentSector(t.x, t.y))
      .forEach((t) => {
        const p = iso(t.x, t.y);
        const color = t.color || '#ef4444';
        const teamLabel = formatTargetTeamLabel(t);
        const title = getEdenPresetTargetDisplayLabel(t) || targetDisplayLabel(t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = `${color}55`;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f8fafc';
        ctx.fill();
        if (t.time || teamLabel || title) {
          const top = p.y - 20;
          if (t.time) {
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 10px Inter';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(2,6,23,0.86)';
            ctx.lineWidth = 3;
            ctx.strokeText(t.time, p.x, top);
            ctx.fillText(t.time, p.x, top);
          }
          if (layers.labels || scale > 0.34) {
            const meta = [teamLabel, title].filter(Boolean).join(' · ');
            if (meta) {
              ctx.fillStyle = color;
              ctx.font = 'bold 8px Inter';
              ctx.textAlign = 'center';
              ctx.strokeStyle = 'rgba(2,6,23,0.88)';
              ctx.lineWidth = 3;
              ctx.strokeText(meta, p.x, top + 12);
              ctx.fillText(meta, p.x, top + 12);
            }
          }
        } else if (layers.labels && t.label) {
          ctx.fillStyle = color;
          ctx.font = 'bold 8px Inter';
          ctx.textAlign = 'center';
          ctx.fillText(getEdenPresetTargetDisplayLabel(t), p.x, p.y - 14);
        }
      });
  }

  function updateCoordHud() {
    if (!coordHudEl) coordHudEl = document.getElementById('edenCoordHud');
    if (!hoverPanelEl) hoverPanelEl = document.getElementById('edenHoverInfo');
    const hud = coordHudEl;
    const hoverPanel = hoverPanelEl;
    if (!hud) return;
    if (!hoverWorld) {
      if (!hud.classList.contains('hidden')) hud.classList.add('hidden');
      if (hoverPanel && !hoverPanel.classList.contains('hidden'))
        hoverPanel.classList.add('hidden');
      lastHudText = '';
      lastHoverPanelText = '';
      lastRouteKey = '';
      return;
    }
    const terrain = getTerrainAt(hoverWorld.x, hoverWorld.y);
    const terrainLabel = getEdenTerrainDisplayLabel(terrain);
    let text = `X:${hoverWorld.x} Y:${hoverWorld.y} | ${terrainLabel}`;
    if (hoverStruct) {
      const meta = STRUCTURE_TYPES[hoverStruct.type];
      text = `X:${hoverStruct.x} Y:${hoverStruct.y} | ${terrainLabel} | ${edenMapText('zone')}: ${hoverStruct.zone} | ${getEdenStructureDisplayLabel(hoverStruct.type)} · ${meta?.points || 0} ${edenMapText('ov')}`;
    }
    if (text !== lastHudText) {
      hud.textContent = text;
      lastHudText = text;
    }
    if (hud.classList.contains('hidden')) hud.classList.remove('hidden');

    if (hoverPanel) {
      if (hoverStruct) {
        let extra = `${getEdenStructureDisplayLabel(hoverStruct.type)} · ${hoverStruct.zone} · ${hoverStruct.x}:${hoverStruct.y}`;
        const sel = structures().find((s) => s.id === selectedId);
        if (sel && sel.id !== hoverStruct.id) {
          const routeKey = `${sel.id}|${hoverStruct.id}`;
          if (routeKey !== lastRouteKey) {
            const route = findRoute(sel.x, sel.y, hoverStruct.x, hoverStruct.y);
            lastRouteDistance = route.distance;
            lastRouteKey = routeKey;
          }
          extra += ` · ${edenMapText('tilesFromSelected', { distance: lastRouteDistance })}`;
        }
        if (extra !== lastHoverPanelText) {
          hoverPanel.textContent = extra;
          lastHoverPanelText = extra;
        }
        if (hoverPanel.classList.contains('hidden')) hoverPanel.classList.remove('hidden');
      } else {
        if (!hoverPanel.classList.contains('hidden')) hoverPanel.classList.add('hidden');
        lastHoverPanelText = '';
        lastRouteKey = '';
      }
    }
  }

  function getViewBounds() {
    const dpr = getCanvasRenderScale();
    const corners = [
      screenToWorld(0, 0),
      screenToWorld(canvas.width / dpr, 0),
      screenToWorld(0, canvas.height / dpr),
      screenToWorld(canvas.width / dpr, canvas.height / dpr),
    ];
    return {
      minX: Math.min(...corners.map((c) => c.x)),
      maxX: Math.max(...corners.map((c) => c.x)),
      minY: Math.min(...corners.map((c) => c.y)),
      maxY: Math.max(...corners.map((c) => c.y)),
    };
  }

  function drawCanvas() {
    const dpr = getCanvasRenderScale();
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const isolated = isSectorIsolated();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = isSectorSheetView() || isolated ? '#0c0a08' : '#1a140c';
    ctx.fillRect(0, 0, w, h);

    const fastMode = interacting || panning;
    if (isSectorSheetView()) {
      if (layers.reference || layers.sectorTiles) {
        drawSectorSheetFlat(ctx, w, h, sectorKey, refOpacity, { scale, offsetX, offsetY });
      }
      onRedrawExtra?.();
      document
        .getElementById('edenZoomLevel')
        ?.replaceChildren(document.createTextNode(`${Math.round(scale * 100)}%`));
      return;
    }

    let isolateClipActive = false;
    if (isolated) {
      applySectorClip(ctx, iso, sectorKey);
      isolateClipActive = true;
    }

    let liveReferenceDrew = false;
    if (
      layers.reference &&
      EDEN_MAP_CONFIG.liveMapEnabled &&
      _edenLiveMapApi?.isEdenLiveMapReady?.()
    ) {
      liveReferenceDrew = _edenLiveMapApi.drawEdenLiveMapLayer(
        ctx,
        (x, y) => iso(x, y),
        scale,
        getViewBounds(),
        refOpacity
      );
    }

    drawTerrainLayer(ctx, (x, y) => iso(x, y), scale, {
      showStrategyFloor: layers.strategyFloor,
      strategyFloorOpacity: refOpacity,
      showReference: layers.reference && !liveReferenceDrew,
      referenceOpacity: refOpacity,
      showScreenshots: layers.screenshots,
      screenshotOpacity,
      sectorKey,
      showTiles: layers.terrain,
      showRivers: layers.terrain && !fastMode,
      showMountains: layers.terrain && !fastMode,
      fastMode,
      viewBounds: getViewBounds(),
    });

    if (!fastMode) drawStrategyFocusSectors();
    if (!fastMode) drawZoneOverlays();
    if (layers.territory && !fastMode) drawTerritoryOverlay(ctx, iso);
    if (layers.reference && layers.structures) {
      const capitals = structures().filter((s) => STRUCTURE_TYPES[s.type]?.category === 'capital');
      maskReferenceCapitals(ctx, iso, capitals, scale);
    }
    if (layers.heatmap && !fastMode) {
      const heatStructs = structures()
        .filter(structureVisible)
        .map((s) => ({
          ...s,
          points: getStructurePoints(s),
        }));
      drawHeatmap(ctx, iso, heatStructs, scale);
    }
    if (layers.fog && !fastMode) drawFogOfWar(ctx, iso, plan.explored || {}, sectorKey);
    drawPaths();
    drawSketches();
    if (layers.structures) structures().filter(structureVisible).forEach(drawStructure);
    drawSnapPreview();
    if (!fastMode) drawPlanningTargets();
    if (!fastMode) drawSectorLabel();
    if (!fastMode) drawCoordSearchPin();

    if (isolateClipActive) {
      ctx.restore();
      if (!fastMode) drawSectorIsolateChrome(ctx, iso, sectorKey);
    }

    onRedrawExtra?.();

    document
      .getElementById('edenZoomLevel')
      ?.replaceChildren(document.createTextNode(`${Math.round(scale * 100)}%`));
  }

  function scheduleDraw(opts = {}) {
    if (opts.sidebar) sidebarDirty = true;
    if (drawRaf) return;
    drawRaf = requestAnimationFrame(() => {
      drawRaf = 0;
      drawCanvas();
      if (sidebarDirty) {
        sidebarDirty = false;
        renderSidebar();
      }
    });
  }

  function draw(opts = {}) {
    scheduleDraw({ sidebar: true, ...opts });
  }

  function markInteracting() {
    interacting = true;
    clearTimeout(interactEndTimer);
  }

  function endInteraction() {
    clearTimeout(interactEndTimer);
    interactEndTimer = setTimeout(() => {
      if (!panning) {
        interacting = false;
        scheduleDraw({ sidebar: false });
      }
    }, 100);
  }

  function refreshSidebar() {
    renderSidebar();
  }

  function hitTest(mx, my, radiusMul = 1) {
    let best = null;
    let bestD = Infinity;
    const hitRadius = Math.max(14, 22 * scale) * radiusMul;
    structures().forEach((s) => {
      if (!shouldDrawStructure(s) && radiusMul <= 1) return;
      const p = iso(s.x, s.y);
      const d = Math.hypot(mx - p.x, my - p.y);
      if (d < hitRadius && d < bestD) {
        bestD = d;
        best = s;
      }
    });
    return best;
  }

  function snapPoint(mx, my, radiusMul = 1.85) {
    const hit = hitTest(mx, my, radiusMul);
    if (hit) return { x: hit.x, y: hit.y, struct: hit };
    const w = screenToWorld(mx, my);
    return { x: w.x, y: w.y, struct: null };
  }

  function addPlanningTarget(mx, my) {
    const pt = snapPoint(mx, my, TARGET_STRUCTURE_SNAP_RADIUS_MUL);
    plan.customTargets = plan.customTargets || [];
    const label = `T${plan.customTargets.length + 1}`;
    const target = {
      x: pt.x,
      y: pt.y,
      ...createMissionPayload(label),
    };
    if (pt.struct) {
      target.structureId = pt.struct.id;
      target.structureType = pt.struct.type;
      target.structureName = getStructureLabel(pt.struct.type);
      target.structureSector = pt.struct.sector || sectorKey;
    }
    plan.customTargets.push(target);
    savePlan();
    draw();
  }

  function addPathPoint(mx, my) {
    const pt = snapPoint(mx, my);
    pathDraft.push({ x: pt.x, y: pt.y });
  }

  function reroutePath(idx) {
    const p = plan.paths?.[idx];
    if (!p?.points?.length) return;
    const routed = routeThroughWaypoints(p.points);
    p.routedPath = routed.path;
    p.distance = routed.distance;
    p.travelMinutes = estimateTravelMinutes(routed.distance, plan.speed || 1);
  }

  function handleRoutePlannerClick(mx, my) {
    const pt = snapPoint(mx, my);
    if (!routeStart) {
      routeStart = { x: pt.x, y: pt.y };
      if (typeof window.showToast === 'function')
        window.showToast(edenT('edenRouteStartToast'), 'info', 2000);
      draw();
      return;
    }
    routeEnd = { x: pt.x, y: pt.y };
    const routed = routeThroughWaypoints([routeStart, routeEnd]);
    const mission = createMissionPayload(`Route ${(plan.paths?.length || 0) + 1}`);
    const color = mission.color || document.getElementById('edenPathColor')?.value || '#3b82f6';
    plan.paths = plan.paths || [];
    plan.paths.push({
      label:
        document.getElementById('edenPathLabel')?.value?.trim() || `Route ${plan.paths.length + 1}`,
      points: [routeStart, routeEnd],
      routedPath: routed.path,
      distance: routed.distance,
      travelMinutes: estimateTravelMinutes(routed.distance, plan.speed || 1),
      color,
      alliance: mission.alliance,
      allianceName: mission.allianceName,
      side: mission.side,
      teams: mission.teams,
      time: mission.time,
    });
    routeStart = routeEnd = null;
    savePlan();
    draw();
    if (typeof window.showToast === 'function') {
      window.showToast(
        edenT('edenRoutePlannedToast').replace('{distance}', String(routed.distance)),
        'success'
      );
    }
  }

  function jumpToTemple() {
    setSector('C');
    const temple = structures().find((s) => TEMPLE_TYPES.has(s.type));
    if (temple) {
      selectedId = temple.id;
      zoomToStructure(temple);
    } else {
      centerOn(800, 800);
      selectedId = null;
    }
    notifySelection();
    draw();
  }

  function switchSectorForNav(key) {
    sectorKey = key;
    markSectorExplored(key);
    pathDraft = [];
    toolbarState.pathDraft = pathDraft;
    sidebarState.filtersPopulatedFor = null;
    const sel = document.getElementById('edenSectorSelect');
    if (sel) sel.value = key;
    document.querySelectorAll('[data-eden-sector]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.edenSector === key);
    });
  }

  function goToCoords(x, y) {
    if (x < MAP_BOUNDS.minX || x > MAP_BOUNDS.maxX || y < MAP_BOUNDS.minY || y > MAP_BOUNDS.maxY) {
      if (typeof window.showToast === 'function') {
        window.showToast(edenT('edenCoordInvalid'), 'error', 3500);
      }
      return false;
    }

    const struct = findStructureByCoords(x, y);
    const targetSector = struct?.sector || findSectorForCoords(x, y) || 'FULL';

    if (sectorKey !== targetSector) {
      switchSectorForNav(targetSector);
      fitView();
    }

    if (struct) {
      selectedId = struct.id;
      notifySelection();
      zoomToStructure(struct);
      if (typeof window.showToast === 'function') {
        window.showToast(
          edenT('edenCoordFoundStruct')
            .replace('{name}', getEdenStructureDisplayLabel(struct.type))
            .replace('{x}', String(struct.x))
            .replace('{y}', String(struct.y)),
          'success',
          3000
        );
      }
      coordSearchPin = null;
    } else {
      selectedId = null;
      notifySelection();
      const rect = canvas.getBoundingClientRect();
      const nextScale = snapScale(Math.max(scale, 0.9));
      const target = {
        offsetX: rect.width * 0.5 - (x - y) * 0.5 * nextScale,
        offsetY: rect.height * 0.42 - (x + y) * 0.25 * nextScale,
        scale: nextScale,
      };
      animateCamera(
        () => ({ offsetX, offsetY, scale }),
        (cam) => {
          offsetX = cam.offsetX;
          offsetY = cam.offsetY;
          scale = cam.scale;
        },
        target,
        () => scheduleDraw({ sidebar: false })
      );
      coordSearchPin = { x, y, until: Date.now() + 5000 };
      if (typeof window.showToast === 'function') {
        window.showToast(
          edenT('edenCoordJumped').replace('{x}', String(x)).replace('{y}', String(y)),
          'info',
          2500
        );
      }
    }

    draw();
    return true;
  }

  function submitCoordSearch(raw) {
    const parsed = parseCoordInput(raw);
    if (!parsed) {
      if (typeof window.showToast === 'function') {
        window.showToast(edenT('edenCoordInvalid'), 'error', 3500);
      }
      return false;
    }
    return goToCoords(parsed.x, parsed.y);
  }

  function screenToWorld(mx, my) {
    const sx = mx - offsetX;
    const sy = my - offsetY;
    const x = (sx / (0.5 * scale) + sy / (0.25 * scale)) / 2;
    const y = (sy / (0.25 * scale) - sx / (0.5 * scale)) / 2;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function renderSidebar() {
    renderSidebarModule({
      plan,
      selectedId,
      tool,
      measureA,
      measureB,
      sectorKey,
      viewMode,
      listSort,
      factionFilter,
      filtersPopulatedFor: sidebarState,
      onSyncTeamPlanUi: syncTeamPlanUi,
    });
  }

  function populateTeamFilter() {
    const sel = document.getElementById('edenTeamFilter');
    if (!sel) return;
    const prev = sel.value;
    if (!isTeamPlanEnabled(plan)) {
      sel.innerHTML = '';
      return;
    }
    let html = `<option value="all">${edenT('edenTeamFilterAll')}</option>`;
    getActiveTeamIds(plan).forEach((tid) => {
      const t = getTeamInfo(plan, tid);
      if (t) html += `<option value="${tid}">${t.name}</option>`;
    });
    html += `<option value="unassigned">${edenT('edenTeamUnassigned')}</option>`;
    sel.innerHTML = html;
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
    else sel.value = 'all';
  }

  function syncTeamPlanUi() {
    const enabled = isTeamPlanEnabled(plan);
    const enableCb = document.getElementById('edenTeamPlanEnabled');
    const countSel = document.getElementById('edenTeamCount');
    const countWrap = document.getElementById('edenTeamCountWrap');
    const board = document.getElementById('edenTeamBoard');
    const offHint = document.getElementById('edenTeamPlanOffHint');
    const teamFilterWrap = document.getElementById('edenTeamFilterWrap');
    const teamsLayerBtn = document.querySelector('[data-eden-layer="teams"]');
    const viewModeSel = document.getElementById('edenViewMode');
    const teamsOption = viewModeSel?.querySelector('option[value="teams"]');

    if (enableCb) enableCb.checked = enabled;
    if (countSel) countSel.value = String(plan.teamCount || 4);
    countWrap?.classList.toggle('hidden', !enabled);
    board?.classList.toggle('hidden', !enabled);
    offHint?.classList.toggle('hidden', enabled);
    teamFilterWrap?.classList.toggle('hidden', !enabled);

    if (teamsLayerBtn) {
      teamsLayerBtn.disabled = !enabled;
      teamsLayerBtn.classList.toggle('eden-layer-disabled', !enabled);
      if (!enabled) {
        layers.teams = false;
        teamsLayerBtn.classList.remove('active');
      }
    }

    if (teamsOption) teamsOption.hidden = !enabled;
    if (!enabled && viewMode === 'teams') {
      viewMode = 'strategic';
      if (viewModeSel) viewModeSel.value = 'strategic';
    }

    populateTeamFilter();
  }

  let syncQuickJump = () => {};

  function setSector(key, smooth = false) {
    if (key !== 'FULL' && !isEdenSectorKey(key)) {
      if (typeof window.showToast === 'function') {
        window.showToast(
          edenT('edenSectorUnavailableToast').replace('{sector}', key),
          'error',
          2800
        );
      }
      return;
    }
    const wonderIds = getSectorTileIds();
    if (key !== 'FULL' && wonderIds.length && !wonderIds.includes(key)) {
      if (typeof window.showToast === 'function') {
        window.showToast(
          edenT('edenSectorReferenceMissingToast').replace('{sector}', key),
          'error',
          2800
        );
      }
      return;
    }
    if (key === sectorKey && !smooth) {
      syncIsolateUi();
      syncQuickJump(key);
      return;
    }
    sectorKey = key;
    if (key === 'FULL') sectorIsolate = false;
    markSectorExplored(key);
    selectedId = null;
    notifySelection();
    pathDraft = [];
    toolbarState.pathDraft = pathDraft;
    sidebarState.filtersPopulatedFor = null;
    const sectorSel = document.getElementById('edenSectorSelect');
    if (sectorSel && sectorSel.value !== key) sectorSel.value = key;
    document.querySelectorAll('[data-eden-sector]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.edenSector === key);
    });
    syncIsolateUi();
    syncQuickJump(key);
    if (key !== 'FULL') ensureSectorTilesLoaded();
    fitView(key !== 'FULL');
    draw();
  }

  window.addEventListener('edenDatasetChange', () => {
    syncWonderSectorSelect();
    syncQuickJump(sectorKey);
  });

  function bindToolbar() {
    bindToolbarModule(toolbarState, {
      setTool,
      setSector,
      toggleSectorIsolate,
      fitView,
      draw,
      savePlan,
      syncPlanSelector,
      submitCoordSearch,
      zoomStep,
      toggleFullscreen,
      switchPlan,
      syncTeamPlanUi,
      sharePlanLink,
      syncMissionControls,
      toggleLayer: (layer) => {
        if (layer === 'teams' && !isTeamPlanEnabled(plan)) return;
        layers[layer] = !layers[layer];
        const btn = document.querySelector(`[data-eden-layer="${layer}"]`);
        if (btn) btn.classList.toggle('active', layers[layer]);
        if (layer === 'strategyFloor') ensureStrategyFloorLoaded();
        if (layer === 'reference') ensureReferenceLoaded();
        if (layer === 'screenshots') ensureScreenshotsLoaded();
        if (layer === 'reference' || layer === 'sectorTiles') ensureSectorTilesLoaded();
        draw();
      },
      setListSort: (val) => {
        listSort = val;
        draw();
      },
      setRefOpacity: (val) => {
        refOpacity = val;
        draw();
      },
      setFactionFilter: (val) => {
        factionFilter = val;
      },
      setViewMode: (val) => {
        viewMode = val;
        routeStart = routeEnd = null;
      },
      getViewMode: () => viewMode,
      getScoutActive: () => scoutActive,
      setScoutActive: (val) => {
        scoutActive = val;
      },
      clearRoute: () => {
        routeStart = routeEnd = null;
      },
      getPlansStore: () => plansStore,
      getActivePlanId: () => activePlanId,
      setActivePlanId: (id) => {
        activePlanId = id;
      },
      getSectorKey: () => sectorKey,
      replacePlan: (p) => {
        plan = p;
        toolbarState.plan = plan;
      },
      createMissionPayload,
      startScoutSync,
      stopScoutSync,
      pullScoutIntel,
      pushScoutIntel,
      mergeScoutIntel: (intel) => {
        plan = mergeScoutIntel(plan, intel);
        toolbarState.plan = plan;
      },
      exportMapAsPng,
      flushSavePlan,
      isSectorIsolated,
      drawCanvas,
      undoDrawStroke: () => {
        if (drawDraft) {
          drawDraft = null;
          drawing = false;
        } else if (plan.drawings?.length) {
          plan.drawings.pop();
          savePlan();
        }
        draw();
      },
      clearDrawings: () => {
        drawDraft = null;
        drawing = false;
        plan.drawings = [];
        savePlan();
        draw();
      },
      deleteSelectedPath: () => {
        if (selectedPathIdx != null && plan.paths?.[selectedPathIdx]) {
          plan.paths.splice(selectedPathIdx, 1);
          selectedPathIdx = selectedWaypointIdx = null;
          savePlan();
          draw();
          return;
        }
        if (pathDraft.length) {
          pathDraft.pop();
          draw();
          return;
        }
        if (plan.paths?.length) {
          plan.paths.pop();
          savePlan();
          draw();
        }
      },
    });
  }

  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('.eden-help-link')) {
      openEdenGuide();
      edenGuide?.open?.();
      return;
    }
    const row = e.target.closest('.eden-struct-row');
    if (row) {
      selectedId = row.dataset.id;
      const s = structures().find((st) => st.id === selectedId);
      if (s) centerOn(s.x, s.y);
      notifySelection();
      draw();
      return;
    }
    if (e.target.closest('#edenClearMeasure')) {
      measureA = measureB = null;
      draw();
      return;
    }
    if (e.target.closest('#edenCenterBtn')) {
      const s = structures().find((st) => st.id === selectedId);
      if (s) centerOn(s.x, s.y, true);
      draw();
      return;
    }
    if (e.target.closest('#edenZoomStructBtn')) {
      const s = structures().find((st) => st.id === selectedId);
      if (s) zoomToStructure(s);
      return;
    }
    if (e.target.closest('#edenComboLinkBtn')) {
      const s = structures().find((st) => st.id === selectedId);
      document.getElementById('tabGenerator')?.click();
      if (typeof window.showToast === 'function' && s) {
        window.showToast(
          edenT('edenComboPlannerToast')
            .replace('{zone}', s.zone)
            .replace('{type}', getEdenStructureDisplayLabel(s.type)),
          'info',
          4000
        );
      }
      return;
    }
    if (e.target.closest('#edenLoyaltyLinkBtn')) {
      const s = structures().find((st) => st.id === selectedId);
      openLoyaltyFromEden(s ? { zone: s.zone, name: getEdenStructureDisplayLabel(s.type) } : null);
      return;
    }
    if (e.target.closest('#edenToggleTargetBtn')) {
      plan.targets = plan.targets || [];
      const i = plan.targets.indexOf(selectedId);
      if (i >= 0) plan.targets.splice(i, 1);
      else plan.targets.push(selectedId);
      savePlan();
      draw();
    }
    const teamJump = e.target.closest('[data-team-jump]');
    if (teamJump) {
      selectedId = teamJump.dataset.teamJump;
      const s = structures().find((st) => st.id === selectedId);
      if (s) zoomToStructure(s);
      notifySelection();
      draw();
    }
    if (e.target.closest('#edenCopyCoordsBtn')) {
      const btn = e.target.closest('#edenCopyCoordsBtn');
      const text = btn?.dataset.coords || '';
      navigator.clipboard
        ?.writeText(text)
        .then(() => {
          if (typeof window.showToast === 'function')
            window.showToast(edenT('edenCopiedToast').replace('{text}', text), 'success');
        })
        .catch(() => {});
    }
  });

  sidebar.addEventListener('change', (e) => {
    if (e.target.id === 'edenGuildInput') {
      plan.guilds = plan.guilds || {};
      plan.guilds[selectedId] = e.target.value.trim();
      savePlan();
      draw();
    }
    if (e.target.id === 'edenStatusSelect') {
      plan.status = plan.status || {};
      plan.status[selectedId] = e.target.value;
      const dot = document.getElementById('edenStatusDot');
      if (dot) dot.className = 'eden-ownership-dot eden-status-dot ' + e.target.value;
      savePlan();
      draw();
    }
    if (e.target.id === 'edenTeamSelect' && selectedId && isTeamPlanEnabled(plan)) {
      const val = e.target.value;
      if (val && !getActiveTeamIds(plan).includes(val)) return;
      setStructTeamMeta(plan, selectedId, { team: val });
      savePlan();
      draw();
    }
    if (e.target.id === 'edenTeamTime' && selectedId) {
      setStructTeamMeta(plan, selectedId, { gameTime: e.target.value.trim() });
      savePlan();
      draw();
    }
    if (e.target.id === 'edenTeamNote' && selectedId) {
      setStructTeamMeta(plan, selectedId, { note: e.target.value.trim() });
      savePlan();
      draw();
    }
  });

  sidebar.addEventListener(
    'blur',
    (e) => {
      if (e.target.id === 'edenTeamTime' && selectedId) {
        setStructTeamMeta(plan, selectedId, { gameTime: e.target.value.trim() });
        savePlan();
        draw();
      }
    },
    true
  );

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const { mx, my } = canvasPointer(e);
      const factor = e.deltaY > 0 ? 0.92 : 1.09;
      zoomAt(mx, my, scale * factor);
    },
    { passive: false }
  );

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    pointerStart = { x: mx, y: my };
    lastPointer = { x: mx, y: my };
    dragMoved = false;
    pointerDownHit = null;
    pendingTargetPlacement = null;

    if (e.button === 1) {
      panning = true;
      markInteracting();
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (
      isSectorSheetView() &&
      !['target', 'path', 'measure', 'draw'].includes(tool) &&
      viewMode !== 'route'
    ) {
      panning = true;
      markInteracting();
      canvas.style.cursor = 'grabbing';
      return;
    }

    const hit = hitTest(mx, my);

    if (viewMode === 'route') {
      handleRoutePlannerClick(mx, my);
      return;
    }

    if (e.altKey) {
      const pt = snapPoint(mx, my);
      if (!measureA) measureA = { x: pt.x, y: pt.y };
      else if (!measureB) measureB = { x: pt.x, y: pt.y };
      else {
        measureA = { x: pt.x, y: pt.y };
        measureB = null;
      }
      draw();
      return;
    }

    if (tool === 'navigate' && (plan.paths || []).length) {
      const hit = hitTestPath(mx, my, plan.paths, (x, y) => iso(x, y));
      if (hit) {
        selectedPathIdx = hit.pathIdx;
        selectedWaypointIdx = hit.waypointIdx;
        draggingWaypoint = { pathIdx: hit.pathIdx, waypointIdx: hit.waypointIdx };
        selectedId = null;
        notifySelection();
        draw();
        return;
      }
    }

    if (e.shiftKey || tool === 'path') {
      addPathPoint(mx, my);
      draw();
      return;
    }

    if (tool === 'measure') {
      const pt = snapPoint(mx, my);
      if (!measureA) measureA = { x: pt.x, y: pt.y };
      else if (!measureB) measureB = { x: pt.x, y: pt.y };
      else {
        measureA = { x: pt.x, y: pt.y };
        measureB = null;
      }
      draw();
      return;
    }

    if (tool === 'target') {
      const pt = snapPoint(mx, my, TARGET_STRUCTURE_SNAP_RADIUS_MUL);
      pendingTargetPlacement = { x: mx, y: my };
      snapPreview = pt.struct ? { x: pt.x, y: pt.y } : null;
      hoverWorld = pt.struct ? { x: pt.x, y: pt.y } : screenToWorld(mx, my);
      updateCoordHud();
      scheduleDraw({ sidebar: false });
      return;
    }

    if (tool === 'draw') {
      markInteracting();
      drawing = true;
      const w = screenToWorld(mx, my);
      drawDraft = { color: getDrawColor(), width: 3, points: [{ x: w.x, y: w.y }] };
      return;
    }

    // navigate: click structure to select, drag empty (or any) to pan
    if (hit) {
      pointerDownHit = hit;
      return;
    }
    panning = true;
    markInteracting();
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = getCanvasRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isSectorSheetView()) {
      if (
        pendingTargetPlacement &&
        !panning &&
        Math.hypot(mx - pointerStart.x, my - pointerStart.y) > POINTER_DRAG_THRESHOLD_PX
      ) {
        pendingTargetPlacement = null;
        snapPreview = null;
        dragMoved = true;
        panning = true;
        markInteracting();
        canvas.style.cursor = 'grabbing';
      }
      if (panning) {
        if (Math.hypot(mx - pointerStart.x, my - pointerStart.y) > 2) dragMoved = true;
        offsetX += mx - lastPointer.x;
        offsetY += my - lastPointer.y;
        lastPointer = { x: mx, y: my };
        markInteracting();
        scheduleDraw({ sidebar: false });
      }
      hoverStruct = null;
      hoverWorld = screenToWorld(mx, my);
      updateCoordHud();
      return;
    }

    if (
      pendingTargetPlacement &&
      !panning &&
      Math.hypot(mx - pointerStart.x, my - pointerStart.y) > POINTER_DRAG_THRESHOLD_PX
    ) {
      pendingTargetPlacement = null;
      snapPreview = null;
      dragMoved = true;
      panning = true;
      markInteracting();
      canvas.style.cursor = 'grabbing';
    }

    if (
      pointerDownHit &&
      !panning &&
      Math.hypot(mx - pointerStart.x, my - pointerStart.y) > POINTER_DRAG_THRESHOLD_PX
    ) {
      pointerDownHit = null;
      panning = true;
      dragMoved = true;
      markInteracting();
      canvas.style.cursor = 'grabbing';
    }

    if (draggingWaypoint) {
      const w = screenToWorld(mx, my);
      const p = plan.paths[draggingWaypoint.pathIdx];
      if (p?.points?.[draggingWaypoint.waypointIdx]) {
        p.points[draggingWaypoint.waypointIdx] = { x: w.x, y: w.y };
        reroutePath(draggingWaypoint.pathIdx);
        scheduleDraw({ sidebar: false });
      }
      return;
    }

    if (drawing && tool === 'draw' && drawDraft) {
      const w = screenToWorld(mx, my);
      const pts = drawDraft.points;
      const last = pts[pts.length - 1];
      if (Math.hypot(w.x - last.x, w.y - last.y) >= 1.5) {
        pts.push({ x: w.x, y: w.y });
        markInteracting();
        scheduleDraw({ sidebar: false });
      }
      return;
    }

    if (panning) {
      if (Math.hypot(mx - pointerStart.x, my - pointerStart.y) > 2) dragMoved = true;
      offsetX += mx - lastPointer.x;
      offsetY += my - lastPointer.y;
      lastPointer = { x: mx, y: my };
      markInteracting();
      scheduleDraw({ sidebar: false });
      return;
    }

    const nextPathHit = (plan.paths || []).length
      ? hitTestPath(mx, my, plan.paths, (x, y) => iso(x, y), 14)
      : null;
    const pathHoverChanged = hoverPathHit?.pathIdx !== nextPathHit?.pathIdx;
    hoverPathHit = nextPathHit;

    const nextHover = hitTest(mx, my);
    const hoverChanged = (nextHover?.id || null) !== (hoverStruct?.id || null);
    hoverStruct = nextHover;
    hoverWorld = hoverStruct ? { x: hoverStruct.x, y: hoverStruct.y } : screenToWorld(mx, my);

    const pathMode = tool === 'path' || e.shiftKey;
    const targetMode = tool === 'target';
    const snap =
      pathMode || targetMode
        ? snapPoint(mx, my, targetMode ? TARGET_STRUCTURE_SNAP_RADIUS_MUL : 1.85)
        : null;
    const nextSnap = snap?.struct ? { x: snap.x, y: snap.y } : null;
    const snapChanged = snapPreview?.x !== nextSnap?.x || snapPreview?.y !== nextSnap?.y;
    snapPreview = nextSnap;

    updateCoordHud();
    if (hoverChanged || snapChanged || pathHoverChanged) scheduleDraw({ sidebar: false });
  });

  canvas.addEventListener('pointerleave', () => {
    hoverStruct = null;
    hoverWorld = null;
    if (tool === 'target') {
      snapPreview = null;
      scheduleDraw({ sidebar: false });
    }
    updateCoordHud();
  });

  canvas.addEventListener('pointerup', (e) => {
    const { mx, my } = canvasPointer(e);
    if (drawing && tool === 'draw') {
      finishDrawStroke();
      endInteraction();
      draw();
      syncToolButtons();
      return;
    }
    if (draggingWaypoint) {
      savePlan();
      draggingWaypoint = null;
    }
    const wasPanning = panning;
    const hadSnapPreview = Boolean(snapPreview);
    const shouldPlaceTarget =
      tool === 'target' &&
      pendingTargetPlacement &&
      !wasPanning &&
      !dragMoved &&
      Math.hypot(mx - pointerStart.x, my - pointerStart.y) <= POINTER_DRAG_THRESHOLD_PX;
    panning = false;
    if (shouldPlaceTarget) {
      snapPreview = null;
      addPlanningTarget(mx, my);
    } else if (!dragMoved && pointerDownHit) {
      selectedId = pointerDownHit.id;
      notifySelection();
      draw();
    } else if (wasPanning && tool === 'navigate' && !dragMoved && !pointerDownHit) {
      selectedId = null;
      notifySelection();
      draw();
    } else if (wasPanning) {
      endInteraction();
    }
    syncToolButtons();
    pointerDownHit = null;
    pendingTargetPlacement = null;
    if (tool !== 'path') {
      snapPreview = null;
      if (hadSnapPreview && !shouldPlaceTarget) scheduleDraw({ sidebar: false });
    }
  });

  canvas.addEventListener('dblclick', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = hitTest(mx, my);
    if (hit) {
      selectedId = hit.id;
      notifySelection();
      zoomToStructure(hit);
      draw();
      return;
    }
    fitView();
    draw();
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (tool === 'path' && pathDraft.length) {
      pathDraft.pop();
      draw();
      return;
    }
    if (tool === 'draw') {
      if (drawDraft) {
        drawDraft = null;
        drawing = false;
      } else if (plan.drawings?.length) {
        plan.drawings.pop();
        savePlan();
      }
      draw();
    }
  });

  let sidebarRefreshTimer = 0;
  const debouncedRefreshSidebar = () => {
    clearTimeout(sidebarRefreshTimer);
    sidebarRefreshTimer = setTimeout(refreshSidebar, 120);
  };

  ['edenZoneFilter', 'edenTypeFilter', 'edenStructSearch', 'edenTeamFilter'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', debouncedRefreshSidebar);
      el.addEventListener('change', refreshSidebar);
    }
  });
  const ownFilterEl = document.getElementById('edenOwnershipFilter');
  const ownDotEl = document.getElementById('edenOwnershipDot');
  function syncOwnershipDot() {
    if (ownDotEl) {
      ownDotEl.className = 'eden-ownership-dot ' + (ownFilterEl?.value || 'all');
    }
  }
  if (ownFilterEl) {
    ownFilterEl.addEventListener('change', () => {
      syncOwnershipDot();
      draw();
    });
    ownFilterEl.addEventListener('input', () => {
      syncOwnershipDot();
      draw();
    });
    syncOwnershipDot();
  }

  const mountLocalizedGameClock = () => {
    mountGameClock(document.getElementById('edenGameClock'), {
      showUae: false,
      dayLabel: edenMapText('day'),
      uaeLabel: 'UAE',
    });
  };
  mountLocalizedGameClock();
  initEdenControlTips();
  bindToolbar();
  syncToolButtons();
  populateFilters(true);
  markSectorExplored(sectorKey);

  loadPlanFromHash();

  const edenGuide = initEdenMapGuide({
    setTool,
    setSector: (key) => setSector(key, true),
    fitView,
    redraw: draw,
  });

  document.getElementById('edenOpenGuide')?.addEventListener('click', () => {
    edenGuide?.open?.() ?? openEdenGuide();
  });

  const ui = initEdenMapUI({
    getMapBounds: getMapBounds,
    getViewBounds,
    getStructures: structures,
    getPaths: () => plan.paths || [],
    getStructureMeta: (type) => STRUCTURE_TYPES[type],
    getScale: () => scale,
    getSectorKey: () => sectorKey,
    centerOn: (x, y) => centerOn(x, y, true),
    fitView,
    panBy,
    setSector: (key) => setSector(key, true),
    toggleSectorIsolate,
    isSectorIsolated,
    redraw: () => scheduleDraw({ sidebar: false }),
    setTool,
    jumpToTemple,
    zoomIn: () => zoomStep(1),
    zoomOut: () => zoomStep(-1),
    clearMeasure: () => {
      measureA = measureB = null;
      draw();
    },
    clearSelection: () => {
      selectedId = null;
      draw();
    },
    undoPathPoint: () => {
      pathDraft.pop();
      draw();
    },
    deleteSelectedPath: () => {
      if (selectedPathIdx != null && plan.paths?.[selectedPathIdx]) {
        plan.paths.splice(selectedPathIdx, 1);
        selectedPathIdx = selectedWaypointIdx = null;
        savePlan();
        draw();
        return;
      }
      if (pathDraft.length) {
        pathDraft.pop();
        draw();
        return;
      }
      if ((plan.paths || []).length) {
        plan.paths.pop();
        savePlan();
        draw();
      }
    },
    resetLayers: () => {
      Object.assign(layers, {
        strategyFloor: true,
        reference: false,
        terrain: false,
        structures: false,
        paths: true,
        targets: true,
        teams: isTeamPlanEnabled(plan),
        labels: false,
        zones: false,
        fog: false,
        heatmap: false,
        territory: false,
        sectorTiles: false,
      });
      document.querySelectorAll('[data-eden-layer]').forEach((btn) => {
        btn.classList.toggle('active', layers[btn.dataset.edenLayer]);
      });
      draw();
    },
    onRedraw: (fn) => {
      onRedrawExtra = fn;
    },
    onSelectionChange: (fn) => {
      onSelectionChange = fn;
    },
  });
  syncQuickJump = ui?.syncQuickJump || (() => {});

  let touchPinch = null;
  canvas.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const a = e.touches[0];
        const b = e.touches[1];
        const rect = canvas.getBoundingClientRect();
        touchPinch = {
          dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
          mx: (a.clientX + b.clientX) / 2 - rect.left,
          my: (a.clientY + b.clientY) / 2 - rect.top,
          scale0: scale,
        };
        markInteracting();
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (!touchPinch || e.touches.length < 2) return;
      e.preventDefault();
      const a = e.touches[0];
      const b = e.touches[1];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const factor = dist / touchPinch.dist;
      const rect = getCanvasRect();
      const mx = (a.clientX + b.clientX) / 2 - rect.left;
      const my = (a.clientY + b.clientY) / 2 - rect.top;
      zoomAt(mx, my, touchPinch.scale0 * factor);
      touchPinch.mx = mx;
      touchPinch.my = my;
    },
    { passive: false }
  );

  canvas.addEventListener('touchend', () => {
    if (touchPinch) {
      touchPinch = null;
      endInteraction();
    }
  });

  initEdenSeasonPicker({
    onDatasetApplied: () => {
      syncEdenSectorSelect(null, {
        fullLabel: edenT('edenSectorFull'),
        getSectorLabel: (key, label) => getEdenSectorDisplayLabel(key, label),
      });
      if (sectorKey !== 'FULL' && !getEdenSectors()[sectorKey]) {
        sectorIsolate = false;
        switchSectorForNav('FULL');
      }
      syncQuickJump(sectorKey);
      syncIsolateUi();
      sidebarState.filtersPopulatedFor = null;
      selectedId = null;
      notifySelection();
      populateFilters(true);
      fitView();
      draw();
    },
  });

  refreshEdenMapLanguage = async () => {
    const requestId = ++edenMapLanguageGeneration;
    await loadEdenMapLocale();
    if (requestId !== edenMapLanguageGeneration) return false;
    applyEdenMapDomTranslations(root);
    mountLocalizedGameClock();
    syncEdenSectorSelect(null, {
      fullLabel: edenT('edenSectorFull'),
      getSectorLabel: (key, label) => getEdenSectorDisplayLabel(key, label),
    });
    syncWonderSectorSelect();
    syncPlanSelector();
    syncFullscreenState();
    syncMissionControls();
    syncQuickJump(sectorKey);
    syncOfflineStatus();
    syncIsolateUi();
    updateCoordHud();
    populateFilters(true);
    renderSidebar();
    draw();
    return true;
  };

  // Royal Bounty is the hub landing page, which means the map initializes
  // while its panel is hidden. Re-measure only when the Map sub-tab is shown.
  refreshEdenMapPlannerViewport = () => {
    if (root.closest('[hidden]') || canvas.closest('[hidden]')) return false;
    resize();
    scheduleDraw({ sidebar: true });
    return true;
  };

  window.addEventListener('resize', debouncedResize);
  window.addEventListener(
    'scroll',
    () => {
      cachedCanvasRect = null;
    },
    { passive: true, capture: true }
  );
  document.addEventListener('fullscreenchange', syncFullscreenState);
  applyTeamPlanLayerState();
  syncIsolateUi();
  resize();
}

const EDEN_ICON_PRELOAD = ['C5', 'C6', 'CS', 'STRHD', 'CP1', 'ST2', 'LT2', 'AT', 'WC8'];

export async function bootEdenMapPlanner() {
  if (EDEN_MAP_CONFIG.underConstruction) {
    const { initEdenMapConstruction } = await import('./eden-map-construction.js');
    await initEdenMapConstruction();
    return;
  }

  await refreshEdenMapLanguage();

  try {
    await ensureEdenDatasetsLoaded();
  } catch (error) {
    console.warn('[eden] Starting with the embedded base map while datasets retry:', error);
  }
  preloadStructureIcons(EDEN_ICON_PRELOAD);

  if (EDEN_MAP_CONFIG.liveMapEnabled) {
    const liveMod = await import('./eden-live-map.js');
    _edenLiveMapApi = liveMod;
    await liveMod.preloadEdenLiveMap();
  }

  initEdenMapPlanner();
  await refreshEdenMapLanguage();
}
import '../css/secondary-tools-v14.css';
