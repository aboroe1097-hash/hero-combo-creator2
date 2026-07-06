import { X1_PLANNING_TARGETS, getEdenSectors, parseCoordInput } from './eden-map-data.js';
import { estimateTravelMinutes, formatTravelTime, createEmptyPlan } from './eden-map-features.js';
import { routeThroughWaypoints } from './eden-map-terrain.js';
import {
  isTeamPlanEnabled,
  pruneTeamAssignments,
  normalizeTeamPlanSettings,
} from './eden-map-teams.js';
import { translations } from './translations.js';

function edenT(key) {
  const lang = localStorage.getItem('vts_hero_lang') || 'en';
  return translations[lang]?.[key] || translations.en[key] || key;
}

export function bindToolbar(state, ctx) {
  const { plan, layers, pathDraft, root, canvas } = state;

  document
    .getElementById('edenSectorSelect')
    ?.addEventListener('change', (e) => ctx.setSector(e.target.value));

  document
    .getElementById('edenIsolateSector')
    ?.addEventListener('click', () => ctx.toggleSectorIsolate());

  document.querySelectorAll('[data-eden-sector]').forEach((btn) => {
    btn.addEventListener('click', () => ctx.setSector(btn.dataset.edenSector));
  });

  document.querySelectorAll('[data-eden-tool]').forEach((btn) => {
    btn.addEventListener('click', () => ctx.setTool(btn.dataset.edenTool));
  });

  document
    .getElementById('edenMissionAlliance')
    ?.addEventListener('change', ctx.syncMissionControls);
  document.getElementById('edenMissionLabel')?.addEventListener('input', ctx.syncMissionControls);
  document.getElementById('edenMissionTime')?.addEventListener('input', ctx.syncMissionControls);
  document.querySelectorAll('[data-eden-mission-team]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const team = btn.dataset.edenMissionTeam;
      const allBtn = document.querySelector('[data-eden-mission-team="all"]');
      if (team === 'all') {
        document
          .querySelectorAll('[data-eden-mission-team]')
          .forEach((b) => b.classList.toggle('active', b === btn));
      } else {
        allBtn?.classList.remove('active');
        btn.classList.toggle('active');
        const anyTeam = [
          ...document.querySelectorAll(
            '[data-eden-mission-team]:not([data-eden-mission-team="all"])'
          ),
        ].some((b) => b.classList.contains('active'));
        if (!anyTeam) allBtn?.classList.add('active');
      }
      ctx.syncMissionControls();
    });
  });
  document
    .getElementById('edenMissionUseTarget')
    ?.addEventListener('click', () => ctx.setTool('target'));
  document
    .getElementById('edenMissionUsePath')
    ?.addEventListener('click', () => ctx.setTool('path'));
  document
    .getElementById('edenMissionUseDraw')
    ?.addEventListener('click', () => ctx.setTool('draw'));
  document.getElementById('edenDeleteLastTarget')?.addEventListener('click', () => {
    if (!plan.customTargets?.length) return;
    plan.customTargets.pop();
    ctx.savePlan();
    ctx.draw();
  });
  ctx.syncMissionControls();

  document.getElementById('edenFitView')?.addEventListener('click', () => {
    ctx.fitView();
    ctx.draw();
  });

  document.querySelectorAll('[data-eden-layer]').forEach((btn) => {
    const layer = btn.dataset.edenLayer;
    layers[layer] = btn.classList.contains('active');
    btn.addEventListener('click', () => {
      ctx.toggleLayer(layer);
    });
  });

  document.getElementById('edenSortSelect')?.addEventListener('change', (e) => {
    ctx.setListSort(e.target.value);
  });

  const coordInput = document.getElementById('edenCoordSearch');
  const coordGo = () => ctx.submitCoordSearch(coordInput?.value);
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
      ctx.submitCoordSearch(e.target.value);
    }
  });

  document.getElementById('edenZoomIn')?.addEventListener('click', () => ctx.zoomStep(1));
  document.getElementById('edenZoomOut')?.addEventListener('click', () => ctx.zoomStep(-1));
  document.getElementById('edenResetView')?.addEventListener('click', () => {
    ctx.fitView();
    ctx.draw();
  });
  document.getElementById('edenFullscreen')?.addEventListener('click', ctx.toggleFullscreen);

  document.getElementById('edenUndoPath')?.addEventListener('click', () => {
    pathDraft.pop();
    ctx.draw();
  });

  document.getElementById('edenFinishPath')?.addEventListener('click', () => {
    if (pathDraft.length < 2) return;
    const routed = routeThroughWaypoints(pathDraft);
    const mission = ctx.createMissionPayload(`Route ${(plan.paths?.length || 0) + 1}`);
    const color = mission.color || document.getElementById('edenPathColor')?.value || '#ef4444';
    const customLabel = document.getElementById('edenPathLabel')?.value?.trim();
    const travelMins = estimateTravelMinutes(routed.distance, plan.speed || 1);
    plan.paths = plan.paths || [];
    plan.paths.push({
      label: customLabel || mission.label || `Route ${plan.paths.length + 1}`,
      points: [...pathDraft],
      routedPath: routed.path,
      distance: routed.distance,
      travelMinutes: travelMins,
      color,
      alliance: mission.alliance,
      allianceName: mission.allianceName,
      side: mission.side,
      teams: mission.teams,
      time: mission.time,
    });
    pathDraft.length = 0;
    ctx.savePlan();
    ctx.draw();
    if (typeof window.showToast === 'function') {
      window.showToast(
        edenT('edenPathSavedToast')
          .replace('{distance}', String(routed.distance))
          .replace('{time}', formatTravelTime(travelMins)),
        'success'
      );
    }
  });

  document.getElementById('edenClearPaths')?.addEventListener('click', () => {
    plan.paths = [];
    pathDraft.length = 0;
    ctx.savePlan();
    ctx.draw();
  });

  document.getElementById('edenUndoDraw')?.addEventListener('click', () => {
    ctx.undoDrawStroke();
  });

  document.getElementById('edenClearDraw')?.addEventListener('click', () => {
    ctx.clearDrawings();
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
        const imported = createEmptyPlan();
        Object.assign(imported, JSON.parse(reader.result));
        normalizeTeamPlanSettings(imported);
        ctx.replacePlan(imported);
        ctx.savePlan();
        ctx.draw();
        if (typeof window.showToast === 'function')
          window.showToast(edenT('edenPlanImportedToast'), 'success');
      } catch {
        if (typeof window.showToast === 'function')
          window.showToast(edenT('edenInvalidPlanToast'), 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('edenSharePlan')?.addEventListener('click', ctx.sharePlanLink);

  document.getElementById('edenRefOpacity')?.addEventListener('input', (e) => {
    ctx.setRefOpacity(Number(e.target.value) / 100);
  });

  document.querySelectorAll('[data-eden-faction]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ctx.setFactionFilter(btn.dataset.edenFaction);
      document
        .querySelectorAll('[data-eden-faction]')
        .forEach((b) => b.classList.toggle('active', b === btn));
      ctx.draw();
    });
  });

  document.getElementById('edenLoadX1Targets')?.addEventListener('click', () => {
    plan.customTargets = X1_PLANNING_TARGETS.filter((t) => t.x && t.y).map((t) => ({
      x: t.x,
      y: t.y,
      label: t.name,
      team: t.team,
    }));
    ctx.savePlan();
    ctx.draw();
    if (typeof window.showToast === 'function')
      window.showToast(edenT('edenX1TargetsLoadedToast'), 'info');
  });

  document
    .getElementById('edenPlanSelect')
    ?.addEventListener('change', (e) => ctx.switchPlan(e.target.value));
  document.getElementById('edenPlanNew')?.addEventListener('click', () => {
    const id = `plan_${Date.now()}`;
    const name = prompt(
      edenT('edenPlanPrompt'),
      `Plan ${(Object.keys(ctx.getPlansStore().plans).length || 0) + 1}`
    );
    if (!name) return;
    ctx.flushSavePlan();
    const store = ctx.getPlansStore();
    store.plans[id] = { name, plan: createEmptyPlan() };
    ctx.setActivePlanId(id);
    ctx.replacePlan(createEmptyPlan());
    ctx.savePlan();
    ctx.syncPlanSelector();
    ctx.draw();
  });
  document.getElementById('edenPlanRename')?.addEventListener('click', () => {
    const store = ctx.getPlansStore();
    const entry = store.plans[ctx.getActivePlanId()];
    if (!entry) return;
    const name = prompt(edenT('edenPlanRenamePrompt'), entry.name || ctx.getActivePlanId());
    if (!name) return;
    entry.name = name;
    ctx.savePlan();
    ctx.syncPlanSelector();
  });
  document.getElementById('edenPlanDelete')?.addEventListener('click', () => {
    const store = ctx.getPlansStore();
    if (Object.keys(store.plans).length <= 1) {
      if (typeof window.showToast === 'function')
        window.showToast(edenT('edenKeepOnePlanToast'), 'error');
      return;
    }
    ctx.flushSavePlan();
    delete store.plans[ctx.getActivePlanId()];
    const nextId = Object.keys(store.plans)[0];
    ctx.setActivePlanId(nextId);
    const raw = store.plans[nextId].plan;
    const nextPlan = { ...createEmptyPlan(), ...raw };
    normalizeTeamPlanSettings(nextPlan);
    ctx.replacePlan(nextPlan);
    ctx.savePlan();
    ctx.syncPlanSelector();
    ctx.draw();
  });

  document.getElementById('edenTeamPlanEnabled')?.addEventListener('change', (e) => {
    plan.teamPlanEnabled = e.target.checked;
    if (plan.teamPlanEnabled) {
      layers.teams = true;
      document.querySelector('[data-eden-layer="teams"]')?.classList.add('active');
      document.getElementById('edenTeamPanel')?.setAttribute('open', '');
    }
    ctx.syncTeamPlanUi();
    ctx.savePlan();
    ctx.draw();
  });

  document.getElementById('edenTeamCount')?.addEventListener('change', (e) => {
    plan.teamCount = Number(e.target.value);
    pruneTeamAssignments(plan);
    ctx.syncTeamPlanUi();
    ctx.savePlan();
    ctx.draw();
  });

  document.getElementById('edenViewMode')?.addEventListener('change', async (e) => {
    ctx.setViewMode(e.target.value);
    ctx.clearRoute();
    if (ctx.getViewMode() === 'teams') {
      if (!isTeamPlanEnabled(plan)) {
        ctx.setViewMode('strategic');
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
    if (ctx.getViewMode() === 'scout' && !ctx.getScoutActive()) {
      const res = await ctx.startScoutSync((intel) => {
        if (!intel) return;
        ctx.mergeScoutIntel(intel);
        ctx.savePlan();
        ctx.draw();
      });
      ctx.setScoutActive(res.ok);
      if (!res.ok && typeof window.showToast === 'function') {
        window.showToast(
          edenT('edenScoutOfflineToast').replace('{error}', res.error || ''),
          'info'
        );
      }
    }
    if (ctx.getViewMode() !== 'scout') {
      ctx.stopScoutSync();
      ctx.setScoutActive(false);
    }
    ctx.draw();
  });

  document.getElementById('edenMarchSpeed')?.addEventListener('input', (e) => {
    plan.speed = Math.max(0.25, Number(e.target.value) / 100);
    document
      .getElementById('edenMarchSpeedVal')
      ?.replaceChildren(document.createTextNode(`${plan.speed.toFixed(2)}×`));
    ctx.draw();
  });

  document.getElementById('edenExportImage')?.addEventListener('click', async () => {
    const isolated = ctx.isSectorIsolated();
    if (isolated) ctx.fitView();
    ctx.drawCanvas();
    if (typeof window.showToast === 'function') {
      window.showToast(edenT('edenExportPngWorking'), 'info', 1800);
    }
    const planName =
      ctx.getPlansStore().plans[ctx.getActivePlanId()]?.name || ctx.getActivePlanId();
    const sec = getEdenSectors()[ctx.getSectorKey()];
    const slug = ctx.getSectorKey() === 'FULL' ? 'full' : ctx.getSectorKey().toLowerCase();
    const filename = isolated
      ? `eden-${slug}-${ctx.getActivePlanId()}.png`
      : `eden-${ctx.getActivePlanId()}.png`;
    await ctx.exportMapAsPng(canvas, filename, {
      title: isolated ? sec?.label || ctx.getSectorKey() : edenT('edenMapTitle'),
      subtitle: isolated ? `${edenT('edenIsolateActive')} · ${planName}` : planName,
      footer: 'VTS 1097 · Hero Combo Creator',
    });
    if (typeof window.showToast === 'function') {
      window.showToast(edenT('edenExportPngDone'), 'success', 2800);
    }
  });

  document.getElementById('edenScoutPull')?.addEventListener('click', async () => {
    const intel = await ctx.pullScoutIntel();
    if (!intel) {
      if (typeof window.showToast === 'function')
        window.showToast(edenT('edenNoScoutIntelToast'), 'info');
      return;
    }
    ctx.mergeScoutIntel(intel);
    ctx.savePlan();
    ctx.draw();
    if (typeof window.showToast === 'function')
      window.showToast(edenT('edenScoutIntelMergedToast'), 'success');
  });

  document.getElementById('edenScoutPush')?.addEventListener('click', async () => {
    const res = await ctx.pushScoutIntel(plan);
    if (typeof window.showToast === 'function') {
      window.showToast(
        res.ok
          ? edenT('edenIntelPushedToast')
          : edenT('edenPushFailedToast').replace('{error}', res.error || ''),
        res.ok ? 'success' : 'error'
      );
    }
  });

  document.getElementById('edenDeletePath')?.addEventListener('click', () => {
    ctx.deleteSelectedPath();
  });

  ctx.syncPlanSelector();
  const speedInput = document.getElementById('edenMarchSpeed');
  if (speedInput) {
    speedInput.value = Math.round((plan.speed || 1) * 100);
    document
      .getElementById('edenMarchSpeedVal')
      ?.replaceChildren(document.createTextNode(`${(plan.speed || 1).toFixed(2)}×`));
  }
}
