import {
  STRUCTURE_TYPES, X1_PLANNING_TARGETS, TEMPLE_TYPES, OVERVIEW_STRUCTURE_TYPES,
  getEdenSectors, getSectorStructures, getSectorBounds, getStructureLabel, getStructureShort,
  getStructurePoints, getSectorFaction, syncEdenSectorSelect, isEdenSectorKey,
  parseCoordInput, findStructureByCoords, findSectorForCoords, ensureEdenDatasetsLoaded,
} from './eden-map-data.js';
import { initEdenSeasonPicker } from './eden-map-season.js';
import {
  MAP_BOUNDS, drawTerrainLayer, findRoute, routeThroughWaypoints, getTerrainAt,
} from './eden-map-terrain.js';
import {
  preloadStructureIcons, onStructureIconsReady, getStructureIcon, isIconReady,
  loadStructureIcon, preloadReferenceMap, preloadScreenshotRefs, preloadSectorTiles,
  getSectorTileIds, getSectorTileImage, isSectorTileReady, isUserStructureIcon,
} from './eden-map-assets.js';
import { initEdenMapUI } from './eden-map-ui.js';
import {
  createEmptyPlan, loadPlansStore, savePlansStore, fuzzyIncludes,
  estimateTravelMinutes, formatTravelTime, hitTestPath, drawSegmentLabels,
  drawTerritoryOverlay, drawFogOfWar, drawHeatmap, drawSectorSheetFlat,
  maskReferenceCapitals, animateCamera, exportMapAsPng, drawPlanSketches,
  applySectorClip, drawSectorIsolateChrome, pathTouchesSector,
} from './eden-map-features.js';
import {
  startScoutSync, stopScoutSync, pullScoutIntel, pushScoutIntel, mergeScoutIntel,
} from './eden-map-scout.js';
import { translations } from './translations.js';
import { initEdenMapGuide, openEdenGuide } from './eden-map-guide.js';
import { openLoyaltyFromEden } from './loyalty-calculator.js';
import { mountGameClock } from './game-time.js';
import {
  EDEN_TEAM_IDS, getActiveTeamIds, getTeamInfo, getStructTeamMeta, isTeamPlanEnabled,
  normalizeTeamPlanSettings, pruneTeamAssignments, setStructTeamMeta,
  renderTeamBoardHtml,
} from './eden-map-teams.js';
import { initEdenControlTips } from './eden-tooltips.js';
import { EDEN_MAP_CONFIG } from './eden-map-config.js';

let _edenLiveMapApi = null;

function edenT(key) {
  const lang = localStorage.getItem('vts_hero_lang') || 'en';
  return translations[lang]?.[key] || translations.en[key] || key;
}

const PLAN_KEY = 'vts_eden_map_plan_v2';
const MIN_SCALE = 0.12;
const MAX_SCALE = 3.2;
const ZOOM_OVERVIEW_MAX = 0.54;
const ZOOM_DETAIL_MIN = 0.82;
const ZOOM_PRESETS = [0.25, 0.42, 0.54, 0.75, 0.82, 1.0, 1.5, 2.0, MAX_SCALE];
const STATUS_COLORS = { owned: '#22c55e', contested: '#f59e0b', enemy: '#ef4444', neutral: '#94a3b8' };
const CATEGORY_ROW_CLASS = { gate: 'eden-row-gate', town: 'eden-row-town', capital: 'eden-row-capital', stronghold: 'eden-row-capital', temple: 'eden-row-temple' };
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
  let lastPointer = { x: 0, y: 0 };
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
  let filtersPopulatedFor = null;
  let listSort = 'points';

  const layers = {
    reference: true,
    screenshots: false,
    terrain: false,
    structures: true,
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

  function savePlan() {
    plansStore.plans[activePlanId] = plansStore.plans[activePlanId] || { name: 'Plan', plan: createEmptyPlan() };
    plansStore.plans[activePlanId].plan = plan;
    plansStore.activeId = activePlanId;
    savePlansStore(plansStore);
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  }

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
    activePlanId = id;
    plan = normalizePlan(plansStore.plans[id].plan);
    selectedId = null;
    selectedPathIdx = null;
    pathDraft = [];
    applyTeamPlanLayerState();
    notifySelection();
    syncPlanSelector();
    draw();
  }

  function syncPlanSelector() {
    const sel = document.getElementById('edenPlanSelect');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = Object.entries(plansStore.plans).map(([id, entry]) =>
      `<option value="${id}">${entry.name || id}</option>`
    ).join('');
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
    const keys = (wonderIds.length ? wonderIds : [])
      .filter((k) => sectors[k])
      .sort();
    if (!keys.length) {
      syncEdenSectorSelect(el);
      return;
    }
    const opts = [`<option value="FULL">${edenT('edenSectorFull')}</option>`];
    keys.forEach((key) => {
      const sec = sectors[key];
      const label = sec?.label ? `${sec.label} (${key})` : key;
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
    return base.map(s => ({
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
    document.querySelectorAll('[data-eden-tool]').forEach(b => {
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
    return document.getElementById('edenDrawColor')?.value
      || document.getElementById('edenPathColor')?.value
      || '#f97316';
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
    if (tool !== 'path') pathDraft = [];
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
    ZOOM_PRESETS.forEach(p => {
      const d = Math.abs(p - val);
      if (d < bestD) { bestD = d; best = p; }
    });
    return clampScale(best);
  }

  function nextPresetScale(direction) {
    if (direction > 0) {
      const next = ZOOM_PRESETS.find(p => p > scale + 0.008);
      return next ?? MAX_SCALE;
    }
    const prev = [...ZOOM_PRESETS].reverse().find(p => p < scale - 0.008);
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
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
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

  function canvasPointer(e) {
    const rect = canvas.getBoundingClientRect();
    return { mx: e.clientX - rect.left, my: e.clientY - rect.top };
  }

  function panBy(dx, dy) {
    offsetX += dx;
    offsetY += dy;
    scheduleDraw({ sidebar: false });
  }

  function loadPlanFromHash() {
    const m = location.hash.match(/eden=([^&]+)/);
    if (!m) return;
    try {
      plan = normalizePlan(JSON.parse(decodeURIComponent(escape(atob(m[1])))));
      savePlan();
      if (typeof window.showToast === 'function') window.showToast('Plan loaded from share link', 'success');
    } catch { /* ignore bad hash */ }
  }

  function sharePlanLink() {
    try {
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify(plan))));
      const url = `${location.origin}${location.pathname}#eden=${payload}`;
      navigator.clipboard?.writeText(url).then(() => {
        if (typeof window.showToast === 'function') window.showToast('Share link copied', 'success');
      });
    } catch {
      if (typeof window.showToast === 'function') window.showToast('Could not create share link', 'error');
    }
  }

  function populateFilters(force = false) {
    if (!force && filtersPopulatedFor === sectorKey) return;
    filtersPopulatedFor = sectorKey;

    const structs = structures();
    const zones = [...new Set(structs.map(s => s.zone))].sort();
    const types = [...new Set(structs.map(s => s.type))].sort((a, b) =>
      getStructureLabel(a).localeCompare(getStructureLabel(b))
    );

    const zoneSelect = document.getElementById('edenZoneFilter');
    const typeSelect = document.getElementById('edenTypeFilter');
    if (!zoneSelect || !typeSelect) return;

    const prevZone = zoneSelect.value;
    const prevType = typeSelect.value;

    zoneSelect.innerHTML = `<option value="all">${edenT('edenAllZones')}</option>` +
      zones.map(z => `<option value="${z}">${z}</option>`).join('');
    typeSelect.innerHTML = `<option value="all">${edenT('edenAllTypes')}</option>` +
      types.map(t => `<option value="${t}">${getStructureLabel(t)}</option>`).join('');

    if ([...zoneSelect.options].some(o => o.value === prevZone)) zoneSelect.value = prevZone;
    if ([...typeSelect.options].some(o => o.value === prevType)) typeSelect.value = prevType;
  }

  function fitViewToBounds(b, { sectorFocus = false } = {}) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const pad = sectorFocus ? 0.07 : 0.1;
    const wAt1 = Math.max((b.maxX - b.minX) * 0.5, 40);
    const hAt1 = Math.max((b.maxX - b.minX + b.maxY - b.minY) * 0.25, 40);
    let nextScale = Math.min(
      (rect.width * (1 - pad * 2)) / wAt1,
      (rect.height * (1 - pad * 2)) / hAt1,
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
      offsetY: rect.height * (sectorFocus ? 0.42 : 0.15) - (cx + cy) * 0.25 * snapped,
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
          },
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
        },
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
        (cam) => { offsetX = cam.offsetX; offsetY = cam.offsetY; scale = cam.scale; },
        target,
        () => scheduleDraw({ sidebar: false }),
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
      (cam) => { offsetX = cam.offsetX; offsetY = cam.offsetY; scale = cam.scale; },
      target,
      () => scheduleDraw({ sidebar: false }),
    );
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = Math.max(480, rect.height) + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    if (!offsetX && !offsetY) fitView();
    draw();
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
        ? `${sec.label} (${sectorKey})`
        : sec.label;
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
      ctx.lineWidth = isSel ? 3 : (mode === 'compact' ? 1.5 : 2);
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
    const screenPts = points.map(pt => iso(pt.x, pt.y));

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

  /** Per-sector reference sheet — show parchment only (no planner overlays). */
  function isSectorSheetView() {
    return sectorKey !== 'FULL';
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
        ? `${sec?.label || sectorKey} · ${edenT('edenIsolateActive')}`
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
    setTimeout(() => { isolateToggleLock = false; }, 320);
  }

  function drawPaths() {
    if (!layers.paths) return;
    const isolated = isSectorIsolated();
    const planPaths = (plan.paths || []).filter((p) => !isolated || pathTouchesSector(p, sectorKey));

    planPaths.forEach((path, idx) => {
      const realIdx = (plan.paths || []).indexOf(path);
      const routed = path.routedPath || path.points;
      const color = path.color || '#ef4444';
      const selected = selectedPathIdx === realIdx;
      const showSeg = selected || hoverPathHit?.pathIdx === realIdx;
      drawRoutedPath(routed, color, path.label, path.distance, { lineWidth: selected ? 5 : 3.5 });
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
      const draftColor = document.getElementById('edenPathColor')?.value || '#f97316';
      drawRoutedPath(preview.path, draftColor, 'Draft', preview.distance, { dashed: true, arrows: true });
    } else if (pathDraft.length === 1) {
      const p = iso(pathDraft[0].x, pathDraft[0].y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
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
    (plan.customTargets || []).filter((t) => pointInCurrentSector(t.x, t.y)).forEach(t => {
      const p = iso(t.x, t.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239,68,68,0.35)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (layers.labels && t.label) {
        ctx.fillStyle = '#fecaca';
        ctx.font = 'bold 8px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(t.label, p.x, p.y - 14);
      }
    });
  }

  function updateCoordHud() {
    const hud = document.getElementById('edenCoordHud');
    const hoverPanel = document.getElementById('edenHoverInfo');
    if (!hud) return;
    if (!hoverWorld) {
      hud.classList.add('hidden');
      hoverPanel?.classList.add('hidden');
      return;
    }
    const terrain = getTerrainAt(hoverWorld.x, hoverWorld.y);
    const terrainLabel = terrain.charAt(0).toUpperCase() + terrain.slice(1);
    let text = `X:${hoverWorld.x} Y:${hoverWorld.y} | ${terrainLabel}`;
    if (hoverStruct) {
      const meta = STRUCTURE_TYPES[hoverStruct.type];
      text = `X:${hoverStruct.x} Y:${hoverStruct.y} | ${terrainLabel} | Zone: ${hoverStruct.zone} | ${getStructureLabel(hoverStruct.type)} · ${meta?.points || 0} OV`;
    }
    hud.textContent = text;
    hud.classList.remove('hidden');

    if (hoverPanel) {
      if (hoverStruct) {
        let extra = `${getStructureLabel(hoverStruct.type)} · ${hoverStruct.zone} · ${hoverStruct.x}:${hoverStruct.y}`;
        const sel = structures().find(s => s.id === selectedId);
        if (sel && sel.id !== hoverStruct.id) {
          const route = findRoute(sel.x, sel.y, hoverStruct.x, hoverStruct.y);
          extra += ` · ${route.distance} tiles from selected`;
        }
        hoverPanel.textContent = extra;
        hoverPanel.classList.remove('hidden');
      } else {
        hoverPanel.classList.add('hidden');
      }
    }
  }

  function getViewBounds() {
    const corners = [
      screenToWorld(0, 0),
      screenToWorld(canvas.width / devicePixelRatio, 0),
      screenToWorld(0, canvas.height / devicePixelRatio),
      screenToWorld(canvas.width / devicePixelRatio, canvas.height / devicePixelRatio),
    ];
    return {
      minX: Math.min(...corners.map(c => c.x)),
      maxX: Math.max(...corners.map(c => c.x)),
      minY: Math.min(...corners.map(c => c.y)),
      maxY: Math.max(...corners.map(c => c.y)),
    };
  }

  function drawCanvas() {
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    const isolated = isSectorIsolated();
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = (isSectorSheetView() || isolated) ? '#0c0a08' : '#1a140c';
    ctx.fillRect(0, 0, w, h);

    const fastMode = interacting || panning;
    if (isSectorSheetView()) {
      if (layers.reference) {
        drawSectorSheetFlat(ctx, w, h, sectorKey, refOpacity, { scale, offsetX, offsetY });
      }
      onRedrawExtra?.();
      document.getElementById('edenZoomLevel')?.replaceChildren(
        document.createTextNode(`${Math.round(scale * 100)}%`)
      );
      return;
    }

    let isolateClipActive = false;
    if (isolated) {
      applySectorClip(ctx, iso, sectorKey);
      isolateClipActive = true;
    }

    let liveReferenceDrew = false;
    if (layers.reference && EDEN_MAP_CONFIG.liveMapEnabled && _edenLiveMapApi?.isEdenLiveMapReady?.()) {
      liveReferenceDrew = _edenLiveMapApi.drawEdenLiveMapLayer(
        ctx, (x, y) => iso(x, y), scale, getViewBounds(), refOpacity,
      );
    }

    drawTerrainLayer(ctx, (x, y) => iso(x, y), scale, {
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

    if (!fastMode) drawZoneOverlays();
    if (layers.territory && !fastMode) drawTerritoryOverlay(ctx, iso);
    if (layers.reference && layers.structures) {
      const capitals = structures().filter((s) => STRUCTURE_TYPES[s.type]?.category === 'capital');
      maskReferenceCapitals(ctx, iso, capitals, scale);
    }
    if (layers.heatmap && !fastMode) {
      const heatStructs = structures().filter(structureVisible).map(s => ({
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

    document.getElementById('edenZoomLevel')?.replaceChildren(
      document.createTextNode(`${Math.round(scale * 100)}%`)
    );
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
    structures().forEach(s => {
      if (!shouldDrawStructure(s) && radiusMul <= 1) return;
      const p = iso(s.x, s.y);
      const d = Math.hypot(mx - p.x, my - p.y);
      if (d < hitRadius && d < bestD) { bestD = d; best = s; }
    });
    return best;
  }

  function snapPoint(mx, my) {
    const hit = hitTest(mx, my, 1.85);
    if (hit) return { x: hit.x, y: hit.y, struct: hit };
    const w = screenToWorld(mx, my);
    return { x: w.x, y: w.y, struct: null };
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
      if (typeof window.showToast === 'function') window.showToast(edenT('edenRouteStartToast'), 'info', 2000);
      draw();
      return;
    }
    routeEnd = { x: pt.x, y: pt.y };
    const routed = routeThroughWaypoints([routeStart, routeEnd]);
    const color = document.getElementById('edenPathColor')?.value || '#3b82f6';
    plan.paths = plan.paths || [];
    plan.paths.push({
      label: document.getElementById('edenPathLabel')?.value?.trim() || `Route ${plan.paths.length + 1}`,
      points: [routeStart, routeEnd],
      routedPath: routed.path,
      distance: routed.distance,
      travelMinutes: estimateTravelMinutes(routed.distance, plan.speed || 1),
      color,
    });
    routeStart = routeEnd = null;
    savePlan();
    draw();
    if (typeof window.showToast === 'function') {
      window.showToast(`Route planned — ${routed.distance} tiles`, 'success');
    }
  }

  function jumpToTemple() {
    setSector('C');
    const temple = structures().find(s => TEMPLE_TYPES.has(s.type));
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
    filtersPopulatedFor = null;
    const sel = document.getElementById('edenSectorSelect');
    if (sel) sel.value = key;
    document.querySelectorAll('[data-eden-sector]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.edenSector === key);
    });
  }

  function goToCoords(x, y) {
    if (
      x < MAP_BOUNDS.minX || x > MAP_BOUNDS.maxX
      || y < MAP_BOUNDS.minY || y > MAP_BOUNDS.maxY
    ) {
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
            .replace('{name}', getStructureLabel(struct.type))
            .replace('{x}', String(struct.x))
            .replace('{y}', String(struct.y)),
          'success',
          3000,
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
        (cam) => { offsetX = cam.offsetX; offsetY = cam.offsetY; scale = cam.scale; },
        target,
        () => scheduleDraw({ sidebar: false }),
      );
      coordSearchPin = { x, y, until: Date.now() + 5000 };
      if (typeof window.showToast === 'function') {
        window.showToast(
          edenT('edenCoordJumped').replace('{x}', String(x)).replace('{y}', String(y)),
          'info',
          2500,
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

  function getFilteredStructures() {
    const list = structures();
    const zoneFilter = document.getElementById('edenZoneFilter')?.value || 'all';
    const typeFilter = document.getElementById('edenTypeFilter')?.value || 'all';
    const teamFilter = isTeamPlanEnabled(plan)
      ? (document.getElementById('edenTeamFilter')?.value || 'all')
      : 'all';
    const search = (document.getElementById('edenStructSearch')?.value || '').toLowerCase();

    const filtered = list.filter(s => {
      if (!structureVisible(s)) return false;
      if (zoneFilter !== 'all' && s.zone !== zoneFilter) return false;
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      const assignedTeam = getStructTeamMeta(plan, s.id).team;
      if (isTeamPlanEnabled(plan) && teamFilter === 'unassigned' && assignedTeam) return false;
      if (isTeamPlanEnabled(plan) && teamFilter !== 'all' && teamFilter !== 'unassigned' && assignedTeam !== teamFilter) return false;
      const label = getStructureLabel(s.type);
      const hay = `${s.zone} ${s.type} ${label} ${s.x}:${s.y} ${s.guild} ${getStructureStatus(s)} ${assignedTeam}`;
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

  function renderSidebar() {
    populateFilters();

    const list = structures();
    const filtered = getFilteredStructures();
    const selected = list.find(s => s.id === selectedId);
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
        const status = getStructureStatus(selected);
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
                <div class="eden-selected-ov">⭐ ${edenT('edenOvLabel')} <strong>${meta?.points || 0}</strong></div>
              </div>
            </div>
            <label class="eden-guild-label">${edenT('edenStatusLabel')}
              <select id="edenStatusSelect" class="eden-filter-select eden-status-select">
                <option value="neutral" ${status==='neutral'?'selected':''}>${edenT('edenStatusNeutral')}</option>
                <option value="owned" ${status==='owned'?'selected':''}>${edenT('edenStatusOwned')}</option>
                <option value="contested" ${status==='contested'?'selected':''}>${edenT('edenStatusContested')}</option>
                <option value="enemy" ${status==='enemy'?'selected':''}>${edenT('edenStatusEnemy')}</option>
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
              <button type="button" id="edenToggleTargetBtn" class="eden-action-btn ${(plan.targets||[]).includes(selected.id)?'active':''}">
                ${(plan.targets||[]).includes(selected.id) ? edenT('edenMarkedTarget') : edenT('edenMarkTarget')}
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
      listEl.innerHTML = filtered.map(s => {
        const meta = STRUCTURE_TYPES[s.type];
        const isTarget = (plan.targets || []).includes(s.id);
        const tm = getStructTeamMeta(plan, s.id);
        const team = isTeamPlanEnabled(plan) && tm.team ? getTeamInfo(plan, tm.team) : null;
        const icon = getStructureIcon(s.type);
        const thumb = isIconReady(icon)
          ? `<img class="eden-struct-thumb" src="${icon instanceof HTMLImageElement ? icon.src : icon.toDataURL()}" alt="">`
          : `<span class="eden-struct-dot" style="background:${meta?.color}"></span>`;
        const rowClass = CATEGORY_ROW_CLASS[meta?.category] || '';
        const ring = STATUS_COLORS[getStructureStatus(s)] || STATUS_COLORS.neutral;
        return `<button type="button" class="eden-struct-row ${rowClass} ${selectedId===s.id?'active':''}" data-id="${s.id}">
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
      statsEl.textContent = `${filtered.length}/${list.length} ${edenT('edenStatsShown')} · ${pts.toLocaleString()} OV · ${assignedCount} ${edenT('edenStatsTeams')} · ${(plan.targets||[]).length} ${edenT('edenStatsTargets')} · ${(plan.paths||[]).length} ${edenT('edenStatsPaths')} (${pathDist.toLocaleString()} ${edenT('edenMeasureTiles')}, ~${pathTime})${modeLabel}`;
    }

    const boardEl = document.getElementById('edenTeamBoard');
    if (boardEl) {
      boardEl.innerHTML = renderTeamBoardHtml(plan, list, edenT);
    }
    syncTeamPlanUi();
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
        window.showToast(`Sector "${key}" is not in this season's map`, 'error', 2800);
      }
      return;
    }
    const wonderIds = getSectorTileIds();
    if (key !== 'FULL' && wonderIds.length && !wonderIds.includes(key)) {
      if (typeof window.showToast === 'function') {
        window.showToast(`No reference sheet for sector "${key}"`, 'error', 2800);
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
    filtersPopulatedFor = null;
    const sectorSel = document.getElementById('edenSectorSelect');
    if (sectorSel && sectorSel.value !== key) sectorSel.value = key;
    document.querySelectorAll('[data-eden-sector]').forEach(btn => {
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
    document.getElementById('edenSectorSelect')?.addEventListener('change', (e) => setSector(e.target.value));

    document.getElementById('edenIsolateSector')?.addEventListener('click', () => toggleSectorIsolate());

    document.querySelectorAll('[data-eden-sector]').forEach(btn => {
      btn.addEventListener('click', () => setSector(btn.dataset.edenSector));
    });

    document.querySelectorAll('[data-eden-tool]').forEach(btn => {
      btn.addEventListener('click', () => setTool(btn.dataset.edenTool));
    });

    document.getElementById('edenFitView')?.addEventListener('click', () => { fitView(); draw(); });

    document.querySelectorAll('[data-eden-layer]').forEach(btn => {
      const layer = btn.dataset.edenLayer;
      layers[layer] = btn.classList.contains('active');
      btn.addEventListener('click', () => {
        if (layer === 'teams' && !isTeamPlanEnabled(plan)) return;
        layers[layer] = !layers[layer];
        btn.classList.toggle('active', layers[layer]);
        if (layer === 'reference') ensureReferenceLoaded();
        if (layer === 'screenshots') ensureScreenshotsLoaded();
        if (layer === 'reference' || layer === 'sectorTiles') ensureSectorTilesLoaded();
        draw();
      });
    });

    document.getElementById('edenSortSelect')?.addEventListener('change', (e) => {
      listSort = e.target.value;
      draw();
    });

    const coordInput = document.getElementById('edenCoordSearch');
    const coordGo = () => submitCoordSearch(coordInput?.value);
    document.getElementById('edenCoordGo')?.addEventListener('click', coordGo);
    coordInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        coordGo();
      }
    });
    document.getElementById('edenStructSearch')?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const parsed = parseCoordInput(e.target.value);
      if (parsed) {
        e.preventDefault();
        submitCoordSearch(e.target.value);
      }
    });

    document.getElementById('edenZoomIn')?.addEventListener('click', () => zoomStep(1));
    document.getElementById('edenZoomOut')?.addEventListener('click', () => zoomStep(-1));
    document.getElementById('edenResetView')?.addEventListener('click', () => { fitView(); draw(); });

    document.getElementById('edenUndoPath')?.addEventListener('click', () => {
      pathDraft.pop();
      draw();
    });

    document.getElementById('edenFinishPath')?.addEventListener('click', () => {
      if (pathDraft.length < 2) return;
      const routed = routeThroughWaypoints(pathDraft);
      const color = document.getElementById('edenPathColor')?.value || '#ef4444';
      const customLabel = document.getElementById('edenPathLabel')?.value?.trim();
      const travelMins = estimateTravelMinutes(routed.distance, plan.speed || 1);
      plan.paths = plan.paths || [];
      plan.paths.push({
        label: customLabel || `Route ${plan.paths.length + 1}`,
        points: [...pathDraft],
        routedPath: routed.path,
        distance: routed.distance,
        travelMinutes: travelMins,
        color,
      });
      pathDraft = [];
      savePlan();
      draw();
      if (typeof window.showToast === 'function') {
        window.showToast(`Path saved — ${routed.distance} tiles (~${formatTravelTime(travelMins)})`, 'success');
      }
    });

    document.getElementById('edenClearPaths')?.addEventListener('click', () => {
      plan.paths = [];
      pathDraft = [];
      savePlan();
      draw();
    });

    document.getElementById('edenUndoDraw')?.addEventListener('click', () => {
      if (drawDraft) {
        drawDraft = null;
        drawing = false;
      } else if (plan.drawings?.length) {
        plan.drawings.pop();
        savePlan();
      }
      draw();
    });

    document.getElementById('edenClearDraw')?.addEventListener('click', () => {
      drawDraft = null;
      drawing = false;
      plan.drawings = [];
      savePlan();
      draw();
    });

    document.getElementById('edenExportPlan')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'eden-x1-plan.json';
      a.click();
    });

    document.getElementById('edenImportPlan')?.addEventListener('click', () => {
      document.getElementById('edenImportFile')?.click();
    });

    document.getElementById('edenImportFile')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          plan = normalizePlan(JSON.parse(reader.result));
          savePlan();
          draw();
          if (typeof window.showToast === 'function') window.showToast('Plan imported', 'success');
        } catch {
          if (typeof window.showToast === 'function') window.showToast('Invalid plan file', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    document.getElementById('edenSharePlan')?.addEventListener('click', sharePlanLink);

    document.getElementById('edenRefOpacity')?.addEventListener('input', (e) => {
      refOpacity = Number(e.target.value) / 100;
      draw();
    });

    document.querySelectorAll('[data-eden-faction]').forEach(btn => {
      btn.addEventListener('click', () => {
        factionFilter = btn.dataset.edenFaction;
        document.querySelectorAll('[data-eden-faction]').forEach(b => b.classList.toggle('active', b === btn));
        draw();
      });
    });

    document.getElementById('edenLoadX1Targets')?.addEventListener('click', () => {
      plan.customTargets = X1_PLANNING_TARGETS.filter(t => t.x && t.y).map(t => ({
        x: t.x, y: t.y, label: t.name, team: t.team,
      }));
      savePlan();
      draw();
      if (typeof window.showToast === 'function') window.showToast('Loaded X1 planning targets', 'info');
    });

    document.getElementById('edenPlanSelect')?.addEventListener('change', (e) => switchPlan(e.target.value));
    document.getElementById('edenPlanNew')?.addEventListener('click', () => {
      const id = `plan_${Date.now()}`;
      const name = prompt(edenT('edenPlanPrompt'), `Plan ${Object.keys(plansStore.plans).length + 1}`);
      if (!name) return;
      plansStore.plans[id] = { name, plan: createEmptyPlan() };
      activePlanId = id;
      plan = createEmptyPlan();
      savePlan();
      syncPlanSelector();
      draw();
    });
    document.getElementById('edenPlanRename')?.addEventListener('click', () => {
      const entry = plansStore.plans[activePlanId];
      if (!entry) return;
      const name = prompt(edenT('edenPlanRenamePrompt'), entry.name || activePlanId);
      if (!name) return;
      entry.name = name;
      savePlan();
      syncPlanSelector();
    });
    document.getElementById('edenPlanDelete')?.addEventListener('click', () => {
      if (Object.keys(plansStore.plans).length <= 1) {
        if (typeof window.showToast === 'function') window.showToast('Keep at least one plan', 'error');
        return;
      }
      delete plansStore.plans[activePlanId];
      activePlanId = Object.keys(plansStore.plans)[0];
      plan = normalizePlan(plansStore.plans[activePlanId].plan);
      savePlan();
      syncPlanSelector();
      draw();
    });

    document.getElementById('edenTeamPlanEnabled')?.addEventListener('change', (e) => {
      plan.teamPlanEnabled = e.target.checked;
      if (plan.teamPlanEnabled) {
        layers.teams = true;
        document.querySelector('[data-eden-layer="teams"]')?.classList.add('active');
        document.getElementById('edenTeamPanel')?.setAttribute('open', '');
      }
      syncTeamPlanUi();
      savePlan();
      draw();
    });

    document.getElementById('edenTeamCount')?.addEventListener('change', (e) => {
      plan.teamCount = Number(e.target.value);
      pruneTeamAssignments(plan);
      syncTeamPlanUi();
      savePlan();
      draw();
    });

    document.getElementById('edenViewMode')?.addEventListener('change', async (e) => {
      viewMode = e.target.value;
      routeStart = routeEnd = null;
      if (viewMode === 'teams') {
        if (!isTeamPlanEnabled(plan)) {
          viewMode = 'strategic';
          e.target.value = 'strategic';
          if (typeof window.showToast === 'function') {
            window.showToast(edenT('edenTeamPlanEnableFirst') || 'Enable team plan first', 'info');
          }
          return;
        }
        layers.teams = true;
        document.querySelector('[data-eden-layer="teams"]')?.classList.add('active');
        document.getElementById('edenTeamPanel')?.setAttribute('open', '');
      }
      if (viewMode === 'scout' && !scoutActive) {
        const res = await startScoutSync((intel) => {
          if (!intel) return;
          plan = mergeScoutIntel(plan, intel);
          savePlan();
          draw();
        });
        scoutActive = res.ok;
        if (!res.ok && typeof window.showToast === 'function') {
          window.showToast(`Scout offline: ${res.error}`, 'info');
        }
      }
      if (viewMode !== 'scout') {
        stopScoutSync();
        scoutActive = false;
      }
      draw();
    });

    document.getElementById('edenMarchSpeed')?.addEventListener('input', (e) => {
      plan.speed = Math.max(0.25, Number(e.target.value) / 100);
      document.getElementById('edenMarchSpeedVal')?.replaceChildren(
        document.createTextNode(`${(plan.speed).toFixed(2)}×`)
      );
      draw();
    });

    document.getElementById('edenExportImage')?.addEventListener('click', async () => {
      const isolated = isSectorIsolated();
      if (isolated) fitView();
      drawCanvas();
      if (typeof window.showToast === 'function') {
        window.showToast(edenT('edenExportPngWorking'), 'info', 1800);
      }
      const planName = plansStore.plans[activePlanId]?.name || activePlanId;
      const sec = getEdenSectors()[sectorKey];
      const slug = sectorKey === 'FULL' ? 'full' : sectorKey.toLowerCase();
      const filename = isolated
        ? `eden-${slug}-${activePlanId}.png`
        : `eden-${activePlanId}.png`;
      await exportMapAsPng(canvas, filename, {
        title: isolated ? (sec?.label || sectorKey) : edenT('edenMapTitle'),
        subtitle: isolated
          ? `${edenT('edenIsolateActive')} · ${planName}`
          : planName,
        footer: 'VTS 1097 · Hero Combo Creator',
      });
      if (typeof window.showToast === 'function') {
        window.showToast(edenT('edenExportPngDone'), 'success', 2800);
      }
    });

    document.getElementById('edenScoutPull')?.addEventListener('click', async () => {
      const intel = await pullScoutIntel();
      if (!intel) {
        if (typeof window.showToast === 'function') window.showToast('No scout intel found', 'info');
        return;
      }
      plan = mergeScoutIntel(plan, intel);
      savePlan();
      draw();
      if (typeof window.showToast === 'function') window.showToast('Scout intel merged', 'success');
    });

    document.getElementById('edenScoutPush')?.addEventListener('click', async () => {
      const res = await pushScoutIntel(plan);
      if (typeof window.showToast === 'function') {
        window.showToast(res.ok ? 'Intel pushed to cloud' : `Push failed: ${res.error}`, res.ok ? 'success' : 'error');
      }
    });

    document.getElementById('edenDeletePath')?.addEventListener('click', () => {
      if (selectedPathIdx != null && plan.paths?.[selectedPathIdx]) {
        plan.paths.splice(selectedPathIdx, 1);
        selectedPathIdx = selectedWaypointIdx = null;
        savePlan();
        draw();
        return;
      }
      if (pathDraft.length) { pathDraft.pop(); draw(); return; }
      if (plan.paths?.length) { plan.paths.pop(); savePlan(); draw(); }
    });

    syncPlanSelector();
    const speedInput = document.getElementById('edenMarchSpeed');
    if (speedInput) {
      speedInput.value = Math.round((plan.speed || 1) * 100);
      document.getElementById('edenMarchSpeedVal')?.replaceChildren(
        document.createTextNode(`${(plan.speed || 1).toFixed(2)}×`)
      );
    }
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
      const s = structures().find(st => st.id === selectedId);
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
      const s = structures().find(st => st.id === selectedId);
      if (s) centerOn(s.x, s.y, true);
      draw();
      return;
    }
    if (e.target.closest('#edenZoomStructBtn')) {
      const s = structures().find(st => st.id === selectedId);
      if (s) zoomToStructure(s);
      return;
    }
    if (e.target.closest('#edenComboLinkBtn')) {
      const s = structures().find(st => st.id === selectedId);
      document.getElementById('tabGenerator')?.click();
      if (typeof window.showToast === 'function' && s) {
        window.showToast(`Combo Creator — plan for ${s.zone} (${getStructureLabel(s.type)})`, 'info', 4000);
      }
      return;
    }
    if (e.target.closest('#edenLoyaltyLinkBtn')) {
      const s = structures().find(st => st.id === selectedId);
      openLoyaltyFromEden(s ? { zone: s.zone, name: getStructureLabel(s.type) } : null);
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
      navigator.clipboard?.writeText(text).then(() => {
        if (typeof window.showToast === 'function') window.showToast(`Copied ${text}`, 'success');
      });
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

  sidebar.addEventListener('blur', (e) => {
    if (e.target.id === 'edenTeamTime' && selectedId) {
      setStructTeamMeta(plan, selectedId, { gameTime: e.target.value.trim() });
      savePlan();
      draw();
    }
  }, true);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { mx, my } = canvasPointer(e);
    const factor = e.deltaY > 0 ? 0.92 : 1.09;
    zoomAt(mx, my, scale * factor);
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    lastPointer = { x: mx, y: my };
    dragMoved = false;
    pointerDownHit = null;

    if (e.button === 1) {
      panning = true;
      markInteracting();
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (isSectorSheetView()) {
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
      else { measureA = { x: pt.x, y: pt.y }; measureB = null; }
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
      else { measureA = { x: pt.x, y: pt.y }; measureB = null; }
      draw();
      return;
    }

    if (tool === 'target') {
      const pt = snapPoint(mx, my);
      plan.customTargets = plan.customTargets || [];
      plan.customTargets.push({ x: pt.x, y: pt.y, label: `T${plan.customTargets.length + 1}` });
      savePlan();
      draw();
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
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (isSectorSheetView()) {
      if (panning) {
        if (Math.hypot(mx - lastPointer.x, my - lastPointer.y) > 2) dragMoved = true;
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

    if (pointerDownHit && !panning && Math.hypot(mx - lastPointer.x, my - lastPointer.y) > 5) {
      pointerDownHit = null;
      panning = true;
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
      if (Math.hypot(mx - lastPointer.x, my - lastPointer.y) > 2) dragMoved = true;
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
    const pathHoverChanged = (hoverPathHit?.pathIdx !== nextPathHit?.pathIdx);
    hoverPathHit = nextPathHit;

    const nextHover = hitTest(mx, my);
    const hoverChanged = (nextHover?.id || null) !== (hoverStruct?.id || null);
    hoverStruct = nextHover;
    hoverWorld = hoverStruct ? { x: hoverStruct.x, y: hoverStruct.y } : screenToWorld(mx, my);

    const pathMode = tool === 'path' || e.shiftKey;
    const snap = pathMode ? snapPoint(mx, my) : null;
    const nextSnap = snap?.struct ? { x: snap.x, y: snap.y } : null;
    const snapChanged = (snapPreview?.x !== nextSnap?.x || snapPreview?.y !== nextSnap?.y);
    snapPreview = nextSnap;

    updateCoordHud();
    if (hoverChanged || snapChanged || pathHoverChanged) scheduleDraw({ sidebar: false });
  });

  canvas.addEventListener('pointerleave', () => {
    hoverStruct = null;
    hoverWorld = null;
    updateCoordHud();
  });

  canvas.addEventListener('pointerup', () => {
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
    panning = false;
    if (!dragMoved && pointerDownHit) {
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

  ['edenZoneFilter', 'edenTypeFilter', 'edenStructSearch', 'edenTeamFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', refreshSidebar);
      el.addEventListener('change', refreshSidebar);
    }
  });
  const ownFilterEl = document.getElementById('edenOwnershipFilter');
  if (ownFilterEl) {
    ownFilterEl.addEventListener('change', () => draw());
    ownFilterEl.addEventListener('input', () => draw());
  }

  mountGameClock(document.getElementById('edenGameClock'), { showUae: false });
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
    clearMeasure: () => { measureA = measureB = null; draw(); },
    clearSelection: () => { selectedId = null; draw(); },
    undoPathPoint: () => { pathDraft.pop(); draw(); },
    deleteSelectedPath: () => {
      if (selectedPathIdx != null && plan.paths?.[selectedPathIdx]) {
        plan.paths.splice(selectedPathIdx, 1);
        selectedPathIdx = selectedWaypointIdx = null;
        savePlan();
        draw();
        return;
      }
      if (pathDraft.length) { pathDraft.pop(); draw(); return; }
      if ((plan.paths || []).length) {
        plan.paths.pop();
        savePlan();
        draw();
      }
    },
    resetLayers: () => {
      Object.assign(layers, {
        reference: true, terrain: false, structures: true, paths: true, targets: true,
        teams: isTeamPlanEnabled(plan),
        labels: false, zones: false, fog: false, heatmap: false, territory: false, sectorTiles: false,
      });
      document.querySelectorAll('[data-eden-layer]').forEach(btn => {
        btn.classList.toggle('active', layers[btn.dataset.edenLayer]);
      });
      draw();
    },
    onRedraw: (fn) => { onRedrawExtra = fn; },
    onSelectionChange: (fn) => { onSelectionChange = fn; },
  });
  syncQuickJump = ui?.syncQuickJump || (() => {});

  let touchPinch = null;
  canvas.addEventListener('touchstart', (e) => {
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
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!touchPinch || e.touches.length < 2) return;
    e.preventDefault();
    const a = e.touches[0];
    const b = e.touches[1];
    const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    const factor = dist / touchPinch.dist;
    const rect = canvas.getBoundingClientRect();
    const mx = (a.clientX + b.clientX) / 2 - rect.left;
    const my = (a.clientY + b.clientY) / 2 - rect.top;
    zoomAt(mx, my, touchPinch.scale0 * factor);
    touchPinch.mx = mx;
    touchPinch.my = my;
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    if (touchPinch) {
      touchPinch = null;
      endInteraction();
    }
  });

  initEdenSeasonPicker({
    onDatasetApplied: () => {
      syncEdenSectorSelect(null, { fullLabel: edenT('edenSectorFull') });
      if (sectorKey !== 'FULL' && !getEdenSectors()[sectorKey]) {
        sectorIsolate = false;
        switchSectorForNav('FULL');
      }
      syncQuickJump(sectorKey);
      syncIsolateUi();
      filtersPopulatedFor = null;
      selectedId = null;
      notifySelection();
      populateFilters(true);
      fitView();
      draw();
    },
  });

  window.addEventListener('edenLanguageUpdate', () => {
    syncEdenSectorSelect(null, { fullLabel: edenT('edenSectorFull') });
    populateFilters(true);
    renderSidebar();
  });

  window.addEventListener('resize', resize);
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

  await ensureEdenDatasetsLoaded();
  preloadStructureIcons(EDEN_ICON_PRELOAD);

  if (EDEN_MAP_CONFIG.liveMapEnabled) {
    const liveMod = await import('./eden-live-map.js');
    _edenLiveMapApi = liveMod;
    await liveMod.preloadEdenLiveMap();
  }

  initEdenMapPlanner();
}