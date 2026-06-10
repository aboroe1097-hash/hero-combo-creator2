import {
  EDEN_SECTORS, STRUCTURE_TYPES, X1_PLANNING_TARGETS,
  getSectorStructures, getSectorBounds,
} from './eden-map-data.js';
import {
  MAP_BOUNDS, drawTerrainLayer, findRoute, routeThroughWaypoints,
} from './eden-map-terrain.js';

const PLAN_KEY = 'vts_eden_map_plan_v2';

function loadPlan() {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY) || localStorage.getItem('vts_eden_map_plan_v1') || '{}');
  } catch {
    return {};
  }
}

function savePlan(plan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export function initEdenMapPlanner() {
  const root = document.getElementById('edenMapRoot');
  const canvas = document.getElementById('edenMapCanvas');
  const sidebar = document.getElementById('edenMapSidebar');
  if (!root || !canvas || !sidebar) return;

  const ctx = canvas.getContext('2d');
  let sectorKey = 'FULL';
  let tool = 'select';
  let scale = 0.42;
  let offsetX = 0;
  let offsetY = 0;
  let panning = false;
  let lastPointer = { x: 0, y: 0 };
  let selectedId = null;
  let pathDraft = [];
  let measureA = null;
  let measureB = null;
  let plan = loadPlan();

  const iso = (x, y) => ({
    x: (x - y) * 0.5 * scale + offsetX,
    y: (x + y) * 0.25 * scale + offsetY,
  });

  const structures = () => {
    const base = getSectorStructures(sectorKey);
    const guilds = plan.guilds || {};
    return base.map(s => ({ ...s, guild: guilds[s.id] || s.guild || '' }));
  };

  function fitView() {
    const b = sectorKey === 'FULL' ? MAP_BOUNDS : getSectorBounds(sectorKey);
    const rect = canvas.parentElement.getBoundingClientRect();
    const mapW = (b.maxX - b.minX) * 0.5 * scale;
    const mapH = (b.maxX - b.minX + b.maxY - b.minY) * 0.25 * scale;
    offsetX = rect.width / 2 - ((b.minX + b.maxX) / 2 - (b.minY + b.maxY) / 2) * 0.5 * scale;
    offsetY = rect.height * 0.15;
    if (sectorKey !== 'FULL') {
      scale = Math.min(0.65, Math.min(rect.width / mapW, rect.height / mapH) * 0.85);
      offsetX = rect.width * 0.5 - ((b.minX + b.maxX) / 2 - (b.minY + b.maxY) / 2) * 0.5 * scale;
      offsetY = rect.height * 0.2;
    }
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = Math.max(420, rect.height) + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    if (!offsetX && !offsetY) fitView();
    draw();
  }

  function drawSectorLabel() {
    if (sectorKey === 'FULL') return;
    const sec = EDEN_SECTORS[sectorKey];
    if (!sec) return;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(sec.label, 12, 22);
  }

  function drawZoneOverlays() {
    if (sectorKey === 'FULL') return;
    const zones = EDEN_SECTORS[sectorKey]?.zoneCenters || {};
    Object.entries(zones).forEach(([zone, center]) => {
      const p = iso(center.x, center.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 36 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59,130,246,0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(96,165,250,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `bold ${Math.max(10, 12 * scale)}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText(zone, p.x, p.y + 3);
    });
  }

  function drawStructure(s) {
    const meta = STRUCTURE_TYPES[s.type] || STRUCTURE_TYPES.ST1;
    const p = iso(s.x, s.y);
    const r = meta.size * scale * 0.85;
    const isSel = selectedId === s.id;
    const isTarget = (plan.targets || []).includes(s.id);

    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r * 0.35, r * 1.1, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(p.x, p.y - r * 1.35);
    ctx.lineTo(p.x + r, p.y - r * 0.35);
    ctx.lineTo(p.x, p.y + r * 0.55);
    ctx.lineTo(p.x - r, p.y - r * 0.35);
    ctx.closePath();
    ctx.fillStyle = meta.color;
    ctx.fill();
    ctx.strokeStyle = isSel ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = isSel ? 2.5 : 1;
    ctx.stroke();

    if (isTarget) {
      ctx.beginPath();
      ctx.arc(p.x, p.y - r * 1.55, r * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (s.guild) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold ${Math.max(7, 8 * scale)}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText(s.guild.slice(0, 5), p.x, p.y - r * 1.65);
    }
  }

  function drawRoutedPath(points, color, label, distance) {
    if (!points?.length) return;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const p = iso(pt.x, pt.y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.stroke();

    if (label || distance) {
      const first = iso(points[0].x, points[0].y);
      ctx.fillStyle = color;
      ctx.font = 'bold 9px Inter';
      ctx.textAlign = 'left';
      const txt = [label, distance != null ? `${distance} tiles` : ''].filter(Boolean).join(' · ');
      ctx.fillText(txt, first.x + 4, first.y - 8);
    }
  }

  function drawPaths() {
    (plan.paths || []).forEach(path => {
      const routed = path.routedPath || path.points;
      drawRoutedPath(routed, path.color || '#ef4444', path.label, path.distance);
    });

    if (pathDraft.length >= 2) {
      const preview = routeThroughWaypoints(pathDraft);
      drawRoutedPath(preview.path, '#f97316', 'Draft', preview.distance);
    } else if (pathDraft.length === 1) {
      const p = iso(pathDraft[0].x, pathDraft[0].y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();
    }

    if (measureA) {
      const pa = iso(measureA.x, measureA.y);
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();
      ctx.fillStyle = '#cffafe';
      ctx.font = 'bold 9px Inter';
      ctx.fillText('A', pa.x + 10, pa.y - 4);
    }
    if (measureB) {
      const pb = iso(measureB.x, measureB.y);
      ctx.beginPath();
      ctx.arc(pb.x, pb.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#a78bfa';
      ctx.fill();
      const route = findRoute(measureA.x, measureA.y, measureB.x, measureB.y);
      drawRoutedPath(route.path, '#a78bfa', null, null);
      const mid = route.path[Math.floor(route.path.length / 2)];
      if (mid) {
        const pm = iso(mid.x, mid.y);
        ctx.fillStyle = '#e9d5ff';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`${route.distance} tiles`, pm.x, pm.y - 10);
      }
    }
  }

  function drawPlanningTargets() {
    (plan.customTargets || []).forEach(t => {
      const p = iso(t.x, t.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239,68,68,0.3)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function draw() {
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(0, 0, w, h);

    const terrainIso = (x, y, s) => iso(x, y);
    drawTerrainLayer(ctx, (x, y, _s) => terrainIso(x, y), scale);

    drawZoneOverlays();
    drawPaths();
    structures().forEach(drawStructure);
    drawPlanningTargets();
    drawSectorLabel();
    renderSidebar();
  }

  function hitTest(mx, my) {
    let best = null;
    let bestD = Infinity;
    structures().forEach(s => {
      const p = iso(s.x, s.y);
      const d = Math.hypot(mx - p.x, my - p.y);
      if (d < 16 * scale && d < bestD) { bestD = d; best = s; }
    });
    return best;
  }

  function screenToWorld(mx, my) {
    const sx = mx - offsetX;
    const sy = my - offsetY;
    const x = (sx / (0.5 * scale) + sy / (0.25 * scale)) / 2;
    const y = (sy / (0.25 * scale) - sx / (0.5 * scale)) / 2;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function updateZoneFilterOptions() {
    const sel = sidebar.querySelector('#edenZoneFilter');
    if (!sel) return;
    const zones = sectorKey === 'FULL'
      ? ['all', ...Object.values(EDEN_SECTORS).flatMap(s => s.zones)]
      : ['all', ...(EDEN_SECTORS[sectorKey]?.zones || [])];
    const cur = sel.value;
    sel.innerHTML = zones.map(z =>
      `<option value="${z}">${z === 'all' ? 'All zones' : z}</option>`
    ).join('');
    if (zones.includes(cur)) sel.value = cur;
  }

  function renderSidebar() {
    const list = structures();
    const zoneFilter = sidebar.querySelector('#edenZoneFilter')?.value || 'all';
    const typeFilter = sidebar.querySelector('#edenTypeFilter')?.value || 'all';
    const search = (sidebar.querySelector('#edenStructSearch')?.value || '').toLowerCase();

    const filtered = list.filter(s => {
      if (zoneFilter !== 'all' && s.zone !== zoneFilter) return false;
      if (typeFilter !== 'all') {
        if (typeFilter === 'CP1' && !s.type.startsWith('CP')) return false;
        else if (typeFilter !== 'CP1' && s.type !== typeFilter) return false;
      }
      if (search && !(`${s.zone} ${s.type} ${s.x}:${s.y} ${s.guild}`.toLowerCase().includes(search))) return false;
      return true;
    });

    const selected = list.find(s => s.id === selectedId);
    const selPanel = sidebar.querySelector('#edenSelectedPanel');

    if (selPanel) {
      if (tool === 'measure' && measureA && measureB) {
        const route = findRoute(measureA.x, measureA.y, measureB.x, measureB.y);
        const direct = Math.round(Math.hypot(measureB.x - measureA.x, measureB.y - measureA.y));
        selPanel.innerHTML = `
          <div class="eden-selected-card">
            <div class="eden-selected-title">Distance A → B</div>
            <div class="eden-selected-meta">Terrain route: <strong>${route.distance}</strong> tiles · Direct: ${direct} tiles</div>
            <div class="eden-selected-meta">${measureA.x}:${measureA.y} → ${measureB.x}:${measureB.y}</div>
            ${route.blocked ? '<p class="eden-hint">Partially blocked — route may cross mountains.</p>' : ''}
            <button type="button" id="edenClearMeasure" class="eden-action-btn">Clear Measure</button>
          </div>`;
        selPanel.querySelector('#edenClearMeasure')?.addEventListener('click', () => {
          measureA = measureB = null;
          draw();
        });
      } else if (!selected) {
        selPanel.innerHTML = '<p class="eden-hint">Select a structure, measure A→B, or draw a path. Terrain (rivers, mountains) affects route distance.</p>';
      } else {
        const meta = STRUCTURE_TYPES[selected.type];
        selPanel.innerHTML = `
          <div class="eden-selected-card">
            <div class="eden-selected-title">${meta?.label || selected.type} <span class="eden-zone-tag">${selected.zone}</span></div>
            <div class="eden-selected-meta">${selected.x}:${selected.y} · ${meta?.points || 0} pts</div>
            <label class="eden-guild-label">Guild / Team
              <input id="edenGuildInput" value="${selected.guild || ''}" placeholder="e.g. Team 1" />
            </label>
            <div class="eden-selected-actions">
              <button type="button" id="edenToggleTargetBtn" class="eden-action-btn ${(plan.targets||[]).includes(selected.id)?'active':''}">
                ${(plan.targets||[]).includes(selected.id) ? '★ Target' : '☆ Mark Target'}
              </button>
              <button type="button" id="edenCenterBtn" class="eden-action-btn">Center</button>
            </div>
          </div>`;
        selPanel.querySelector('#edenGuildInput')?.addEventListener('change', (e) => {
          plan.guilds = plan.guilds || {};
          plan.guilds[selected.id] = e.target.value.trim();
          savePlan(plan);
          draw();
        });
        selPanel.querySelector('#edenToggleTargetBtn')?.addEventListener('click', () => {
          plan.targets = plan.targets || [];
          const i = plan.targets.indexOf(selected.id);
          if (i >= 0) plan.targets.splice(i, 1);
          else plan.targets.push(selected.id);
          savePlan(plan);
          draw();
        });
        selPanel.querySelector('#edenCenterBtn')?.addEventListener('click', () => {
          const rect = canvas.getBoundingClientRect();
          offsetX = rect.width * 0.5 - (selected.x - selected.y) * 0.5 * scale;
          offsetY = rect.height * 0.35 - (selected.x + selected.y) * 0.25 * scale;
          draw();
        });
      }
    }

    const listEl = sidebar.querySelector('#edenStructList');
    if (listEl) {
      listEl.innerHTML = filtered.map(s => {
        const meta = STRUCTURE_TYPES[s.type];
        const isTarget = (plan.targets || []).includes(s.id);
        return `<button type="button" class="eden-struct-row ${selectedId===s.id?'active':''}" data-id="${s.id}">
          <span class="eden-struct-dot" style="background:${meta?.color}"></span>
          <span class="eden-struct-info"><strong>${s.type}</strong> ${s.zone} <em>${s.x}:${s.y}</em></span>
          <span class="eden-struct-pts">${meta?.points}p</span>
          ${isTarget ? '<span class="eden-target-star">★</span>' : ''}
        </button>`;
      }).join('');
      listEl.querySelectorAll('.eden-struct-row').forEach(btn => {
        btn.addEventListener('click', () => { selectedId = btn.dataset.id; draw(); });
      });
    }

    const statsEl = sidebar.querySelector('#edenMapStats');
    if (statsEl) {
      const pts = list.reduce((sum, s) => sum + (STRUCTURE_TYPES[s.type]?.points || 0), 0);
      const pathDist = (plan.paths || []).reduce((s, p) => s + (p.distance || 0), 0);
      statsEl.textContent = `${list.length} structures · ${pts} pts · ${(plan.targets||[]).length} targets · ${(plan.paths||[]).length} paths (${pathDist} tiles)`;
    }
  }

  function bindToolbar() {
    root.querySelector('#edenSectorSelect')?.addEventListener('change', (e) => {
      sectorKey = e.target.value;
      selectedId = null;
      pathDraft = [];
      updateZoneFilterOptions();
      fitView();
      draw();
    });

    root.querySelectorAll('[data-eden-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        tool = btn.dataset.edenTool;
        root.querySelectorAll('[data-eden-tool]').forEach(b => b.classList.toggle('active', b === btn));
        pathDraft = [];
        if (tool !== 'measure') { measureA = measureB = null; }
        draw();
      });
    });

    root.querySelector('#edenZoomIn')?.addEventListener('click', () => { scale = Math.min(1.2, scale + 0.06); draw(); });
    root.querySelector('#edenZoomOut')?.addEventListener('click', () => { scale = Math.max(0.2, scale - 0.06); draw(); });
    root.querySelector('#edenResetView')?.addEventListener('click', () => { fitView(); draw(); });

    root.querySelector('#edenFinishPath')?.addEventListener('click', () => {
      if (pathDraft.length < 2) return;
      const routed = routeThroughWaypoints(pathDraft);
      plan.paths = plan.paths || [];
      plan.paths.push({
        label: `Path ${plan.paths.length + 1}`,
        points: [...pathDraft],
        routedPath: routed.path,
        distance: routed.distance,
        color: '#ef4444',
      });
      pathDraft = [];
      savePlan(plan);
      draw();
      if (typeof window.showToast === 'function') window.showToast(`Path saved — ${routed.distance} tiles`, 'success');
    });

    root.querySelector('#edenClearPaths')?.addEventListener('click', () => {
      plan.paths = [];
      pathDraft = [];
      savePlan(plan);
      draw();
    });

    root.querySelector('#edenExportPlan')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'eden-x1-plan.json';
      a.click();
    });

    root.querySelector('#edenLoadX1Targets')?.addEventListener('click', () => {
      plan.customTargets = X1_PLANNING_TARGETS.filter(t => t.x && t.y).map(t => ({
        x: t.x, y: t.y, label: t.name, team: t.team,
      }));
      savePlan(plan);
      draw();
      if (typeof window.showToast === 'function') window.showToast('Loaded X1 planning targets', 'info');
    });
  }

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    scale = Math.min(1.2, Math.max(0.2, scale + (e.deltaY > 0 ? -0.04 : 0.04)));
    draw();
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    lastPointer = { x: mx, y: my };

    if (tool === 'pan' || e.button === 1 || e.altKey) { panning = true; return; }

    const hit = hitTest(mx, my);
    const world = hit ? { x: hit.x, y: hit.y } : screenToWorld(mx, my);

    if (tool === 'select') {
      selectedId = hit?.id || null;
      draw();
      return;
    }
    if (tool === 'measure') {
      if (!measureA) measureA = world;
      else if (!measureB) measureB = world;
      else { measureA = world; measureB = null; }
      draw();
      return;
    }
    if (tool === 'path') {
      pathDraft.push(world);
      draw();
      return;
    }
    if (tool === 'target') {
      plan.customTargets = plan.customTargets || [];
      plan.customTargets.push({ x: world.x, y: world.y, label: `T${plan.customTargets.length + 1}` });
      savePlan(plan);
      draw();
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!panning) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    offsetX += mx - lastPointer.x;
    offsetY += my - lastPointer.y;
    lastPointer = { x: mx, y: my };
    draw();
  });

  canvas.addEventListener('pointerup', () => { panning = false; });

  ['edenZoneFilter', 'edenTypeFilter', 'edenStructSearch'].forEach(id => {
    sidebar.querySelector('#' + id)?.addEventListener('input', () => draw());
    sidebar.querySelector('#' + id)?.addEventListener('change', () => draw());
  });

  updateZoneFilterOptions();
  bindToolbar();
  window.addEventListener('resize', resize);
  resize();
}
