// Eden Map UI — minimap, keyboard shortcuts, quick-jump, mobile sidebar

const MAJOR_TYPES = new Set(['C5', 'C6', 'CS', 'AT']);
const MINIMAP_SIZE = 150;

export function initEdenMapUI(api) {
  const minimap = document.getElementById('edenMinimap');
  if (minimap) setupMinimap(minimap, api);
  setupQuickJump(api);
  setupKeyboard(api);
  setupMobileSidebar(api);
}

function setupMinimap(canvas, api) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = MINIMAP_SIZE * dpr;
  canvas.height = MINIMAP_SIZE * dpr;
  canvas.style.width = `${MINIMAP_SIZE}px`;
  canvas.style.height = `${MINIMAP_SIZE}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  function render() {
    const bounds = api.getMapBounds();
    const view = api.getViewBounds();
    const structs = api.getStructures().filter(s => MAJOR_TYPES.has(s.type) || api.getScale() >= 0.25);
    const w = MINIMAP_SIZE;
    const h = MINIMAP_SIZE;
    const bw = bounds.maxX - bounds.minX || 1;
    const bh = bounds.maxY - bounds.minY || 1;

    const proj = (x, y) => ({
      x: ((x - bounds.minX) / bw) * (w - 8) + 4,
      y: ((y - bounds.minY) / bh) * (h - 8) + 4,
    });

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(15,12,8,0.92)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(99,102,241,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    structs.forEach(s => {
      const p = proj(s.x, s.y);
      const meta = api.getStructureMeta(s.type);
      ctx.beginPath();
      ctx.arc(p.x, p.y, MAJOR_TYPES.has(s.type) ? 3 : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = meta?.color || '#94a3b8';
      ctx.fill();
    });

    (api.getPaths?.() || []).forEach(path => {
      const pts = path.routedPath || path.points;
      if (!pts?.length) return;
      const color = path.color || '#ef4444';
      ctx.beginPath();
      pts.forEach((pt, i) => {
        const p = proj(pt.x, pt.y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    const tl = proj(view.minX, view.minY);
    const br = proj(view.maxX, view.maxY);
    const rx = Math.min(tl.x, br.x);
    const ry = Math.min(tl.y, br.y);
    const rw = Math.abs(br.x - tl.x);
    const rh = Math.abs(br.y - tl.y);
    ctx.strokeStyle = 'rgba(250,204,21,0.95)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, Math.max(6, rw), Math.max(6, rh));
    ctx.fillStyle = 'rgba(250,204,21,0.12)';
    ctx.fillRect(rx, ry, Math.max(6, rw), Math.max(6, rh));
  }

  api.onRedraw(render);

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const bounds = api.getMapBounds();
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    const x = bounds.minX + ((mx - 4) / (MINIMAP_SIZE - 8)) * bw;
    const y = bounds.minY + ((my - 4) / (MINIMAP_SIZE - 8)) * bh;
    api.centerOn(x, y);
    api.redraw();
  });

  render();
}

function setupQuickJump(api) {
  document.querySelectorAll('[data-eden-jump]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.edenJump;
      if (key === 'AT') {
        api.jumpToTemple();
        return;
      }
      api.setSector(key);
    });
  });
}

const SECTOR_HOTKEYS = {
  '1': 'FULL', '2': 'N', '3': 'NE', '4': 'E', '5': 'S', '6': 'W', '7': 'C', '8': 'NC',
};

function setupKeyboard(api) {
  const root = document.getElementById('edenMapSection');
  if (!root) return;

  const PAN_STEP = 48;

  document.addEventListener('keydown', (e) => {
    const edenActive = root && !root.classList.contains('hidden');
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    if (edenActive && !typing) {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'f') { e.preventDefault(); api.fitView(); api.redraw(); }
      else if (k === '+' || k === '=') { e.preventDefault(); api.zoomIn(); }
      else if (k === '-') { e.preventDefault(); api.zoomOut(); }
      else if (k === 'arrowleft') { e.preventDefault(); api.panBy(PAN_STEP, 0); }
      else if (k === 'arrowright') { e.preventDefault(); api.panBy(-PAN_STEP, 0); }
      else if (k === 'arrowup') { e.preventDefault(); api.panBy(0, PAN_STEP); }
      else if (k === 'arrowdown') { e.preventDefault(); api.panBy(0, -PAN_STEP); }
      else if (k === 'p') { api.setTool('path'); }
      else if (k === 'm') { api.setTool('measure'); }
      else if (k === 'escape') { api.setTool('navigate'); api.clearMeasure(); }
      else if (k === 'delete' || k === 'backspace') { api.deleteSelectedPath(); }
      else if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); api.undoPathPoint(); }
      else if (k === 'r' && !e.ctrlKey && !e.metaKey) { api.resetLayers(); }
      else if (SECTOR_HOTKEYS[e.key]) {
        const sk = SECTOR_HOTKEYS[e.key];
        if (sk === 'FULL') api.setSector('FULL');
        else api.setSector(sk);
      }
    }
  });
}

function setupMobileSidebar(api) {
  const sidebar = document.getElementById('edenMapSidebar');
  const closeBtn = document.getElementById('edenSidebarClose');
  if (!sidebar) return;

  closeBtn?.addEventListener('click', () => {
    sidebar.classList.remove('eden-sidebar-open');
    api.clearSelection();
  });

  api.onSelectionChange((hasSelection) => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      sidebar.classList.toggle('eden-sidebar-open', hasSelection);
    }
  });
}

export { MAJOR_TYPES };