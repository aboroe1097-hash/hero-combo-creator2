// js/vts-eden-tabs.js
// Sub-tab switching for the VTS EDEN tab: the season-format briefing and the
// Eden Map planner. The map is left mounted but hidden so its own setup runs
// once; showing it fires a resize so the canvas re-fits to the revealed panel.

const PANELS = {
  format: { panel: 'vtsEdenFormatPanel', tab: 'vtsEdenTabFormat' },
  map: { panel: 'vtsEdenMapPanel', tab: 'vtsEdenTabMap' },
};

let activeView = 'format';

function showView(view) {
  if (!PANELS[view]) return;
  activeView = view;
  Object.entries(PANELS).forEach(([name, ids]) => {
    const panel = document.getElementById(ids.panel);
    const tab = document.getElementById(ids.tab);
    const isActive = name === view;
    if (panel) panel.hidden = !isActive;
    if (tab) {
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
  });
  if (view === 'map') {
    // The map sizes its canvas from the container, which had no box while it
    // was hidden.
    window.dispatchEvent(new Event('resize'));
  }
}

export function initVtsEdenTabs(root = document) {
  const nav = root.querySelector?.('.vts-eden');
  if (!nav || nav.dataset.vtsEdenWired === 'true') return;
  nav.dataset.vtsEdenWired = 'true';
  nav.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-vts-eden-tab]');
    if (!trigger) return;
    event.preventDefault();
    showView(trigger.dataset.vtsEdenTab);
  });
  showView(activeView);
}

export function getVtsEdenView() {
  return activeView;
}
