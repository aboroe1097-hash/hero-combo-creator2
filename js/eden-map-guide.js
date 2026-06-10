// Eden Map interactive guide — data-driven walkthrough (update EDEN_GUIDE_VERSION when features change)
import { translations } from './translations.js';

export const EDEN_GUIDE_VERSION = '2.4.0';

const PROGRESS_KEY = 'vts_eden_guide_progress_v1';

function t(key) {
  const lang = localStorage.getItem('vts_hero_lang') || 'en';
  return translations[lang]?.[key] || translations.en[key] || key;
}

/** @typedef {{ id: string, icon: string, titleKey: string, descKey: string, tips?: string[], action?: string, highlight?: string }} GuideStep */

export const EDEN_GUIDE_SECTIONS = [
  {
    id: 'start',
    icon: '🗺️',
    titleKey: 'edenGuideSecStart',
    steps: [
      { id: 'welcome', icon: '👋', titleKey: 'edenGuideWelcomeTitle', descKey: 'edenGuideWelcomeDesc', tips: ['edenGuideWelcomeTip1', 'edenGuideWelcomeTip2'] },
      { id: 'layout', icon: '🧭', titleKey: 'edenGuideLayoutTitle', descKey: 'edenGuideLayoutDesc', tips: ['edenGuideLayoutTip1', 'edenGuideLayoutTip2', 'edenGuideLayoutTip3'], highlight: '#edenMapCanvas' },
    ],
  },
  {
    id: 'navigate',
    icon: '🔍',
    titleKey: 'edenGuideSecNav',
    steps: [
      { id: 'zoom', icon: '🔎', titleKey: 'edenGuideZoomTitle', descKey: 'edenGuideZoomDesc', tips: ['edenGuideZoomTip1', 'edenGuideZoomTip2', 'edenGuideZoomTip3'], action: 'focus-canvas', highlight: '#edenZoomIn' },
      { id: 'pan', icon: '✋', titleKey: 'edenGuidePanTitle', descKey: 'edenGuidePanDesc', tips: ['edenGuidePanTip1', 'edenGuidePanTip2'], action: 'tool-navigate', highlight: '[data-eden-tool="navigate"]' },
      { id: 'sectors', icon: '📍', titleKey: 'edenGuideSectorTitle', descKey: 'edenGuideSectorDesc', tips: ['edenGuideSectorTip1', 'edenGuideSectorTip2'], action: 'sector-c', highlight: '#edenSectorSelect' },
      { id: 'minimap', icon: '🗾', titleKey: 'edenGuideMinimapTitle', descKey: 'edenGuideMinimapDesc', tips: ['edenGuideMinimapTip1'], highlight: '#edenMinimap' },
    ],
  },
  {
    id: 'explore',
    icon: '🏰',
    titleKey: 'edenGuideSecExplore',
    steps: [
      { id: 'select', icon: '👆', titleKey: 'edenGuideSelectTitle', descKey: 'edenGuideSelectDesc', tips: ['edenGuideSelectTip1', 'edenGuideSelectTip2'], action: 'tool-navigate', highlight: '#edenMapSidebar' },
      { id: 'sidebar', icon: '📋', titleKey: 'edenGuideSidebarTitle', descKey: 'edenGuideSidebarDesc', tips: ['edenGuideSidebarTip1', 'edenGuideSidebarTip2', 'edenGuideSidebarTip3'], highlight: '#edenSelectedPanel' },
      { id: 'filters', icon: '🔎', titleKey: 'edenGuideFiltersTitle', descKey: 'edenGuideFiltersDesc', tips: ['edenGuideFiltersTip1', 'edenGuideFiltersTip2'], highlight: '#edenOwnershipFilter' },
    ],
  },
  {
    id: 'tools',
    icon: '🛠️',
    titleKey: 'edenGuideSecTools',
    steps: [
      { id: 'measure', icon: '📏', titleKey: 'edenGuideMeasureTitle', descKey: 'edenGuideMeasureDesc', tips: ['edenGuideMeasureTip1', 'edenGuideMeasureTip2'], action: 'tool-measure', highlight: '[data-eden-tool="measure"]' },
      { id: 'path', icon: '🛤️', titleKey: 'edenGuidePathTitle', descKey: 'edenGuidePathDesc', tips: ['edenGuidePathTip1', 'edenGuidePathTip2', 'edenGuidePathTip3'], action: 'tool-path', highlight: '[data-eden-tool="path"]' },
      { id: 'target', icon: '🎯', titleKey: 'edenGuideTargetTitle', descKey: 'edenGuideTargetDesc', tips: ['edenGuideTargetTip1'], action: 'tool-target', highlight: '[data-eden-tool="target"]' },
      { id: 'route-mode', icon: '🧭', titleKey: 'edenGuideRouteModeTitle', descKey: 'edenGuideRouteModeDesc', tips: ['edenGuideRouteModeTip1', 'edenGuideRouteModeTip2'], action: 'view-route', highlight: '#edenViewMode' },
    ],
  },
  {
    id: 'plan',
    icon: '📦',
    titleKey: 'edenGuideSecPlan',
    steps: [
      { id: 'ownership', icon: '🟢', titleKey: 'edenGuideOwnTitle', descKey: 'edenGuideOwnDesc', tips: ['edenGuideOwnTip1', 'edenGuideOwnTip2'], highlight: '#edenStatusSelect' },
      { id: 'plans', icon: '📁', titleKey: 'edenGuidePlansTitle', descKey: 'edenGuidePlansDesc', tips: ['edenGuidePlansTip1', 'edenGuidePlansTip2'], highlight: '#edenPlanSelect' },
      { id: 'share', icon: '🔗', titleKey: 'edenGuideShareTitle', descKey: 'edenGuideShareDesc', tips: ['edenGuideShareTip1', 'edenGuideShareTip2'], highlight: '#edenSharePlan' },
      { id: 'scout', icon: '📡', titleKey: 'edenGuideScoutTitle', descKey: 'edenGuideScoutDesc', tips: ['edenGuideScoutTip1'], action: 'view-scout', highlight: '#edenScoutPull' },
    ],
  },
  {
    id: 'layers',
    icon: '🎨',
    titleKey: 'edenGuideSecLayers',
    steps: [
      { id: 'layers-toggle', icon: '👁️', titleKey: 'edenGuideLayersTitle', descKey: 'edenGuideLayersDesc', tips: ['edenGuideLayersTip1', 'edenGuideLayersTip2'], highlight: '.eden-layer-bar' },
      { id: 'ref-opacity', icon: '🖼️', titleKey: 'edenGuideRefTitle', descKey: 'edenGuideRefDesc', tips: ['edenGuideRefTip1'], highlight: '#edenRefOpacity' },
      { id: 'faction', icon: '⚔️', titleKey: 'edenGuideFactionTitle', descKey: 'edenGuideFactionDesc', tips: ['edenGuideFactionTip1'], highlight: '.eden-quick-jump' },
    ],
  },
  {
    id: 'shortcuts',
    icon: '⌨️',
    titleKey: 'edenGuideSecKeys',
    steps: [
      { id: 'keyboard', icon: '⌨️', titleKey: 'edenGuideKeysTitle', descKey: 'edenGuideKeysDesc', tips: ['edenGuideKeysTip1', 'edenGuideKeysTip2', 'edenGuideKeysTip3', 'edenGuideKeysTip4'] },
      { id: 'mobile', icon: '📱', titleKey: 'edenGuideMobileTitle', descKey: 'edenGuideMobileDesc', tips: ['edenGuideMobileTip1', 'edenGuideMobileTip2'] },
      { id: 'done', icon: '✅', titleKey: 'edenGuideDoneTitle', descKey: 'edenGuideDoneDesc', tips: ['edenGuideDoneTip1'] },
    ],
  },
];

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { version: EDEN_GUIDE_VERSION, completed: [], section: 0, step: 0 };
    const data = JSON.parse(raw);
    if (data.version !== EDEN_GUIDE_VERSION) return { version: EDEN_GUIDE_VERSION, completed: [], section: 0, step: 0 };
    return data;
  } catch {
    return { version: EDEN_GUIDE_VERSION, completed: [], section: 0, step: 0 };
  }
}

function saveProgress(data) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...data, version: EDEN_GUIDE_VERSION }));
}

function allStepIds() {
  return EDEN_GUIDE_SECTIONS.flatMap(s => s.steps.map(st => st.id));
}

/**
 * @param {object} api — callbacks from eden-map.js
 */
export function initEdenMapGuide(api) {
  const root = document.getElementById('edenGuideRoot');
  if (!root) return;

  let progress = loadProgress();
  let activeSection = progress.section || 0;
  let activeStep = progress.step || 0;

  const actions = {
    'focus-canvas': () => document.getElementById('edenMapCanvas')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    'tool-navigate': () => api.setTool?.('navigate'),
    'tool-measure': () => api.setTool?.('measure'),
    'tool-path': () => api.setTool?.('path'),
    'tool-target': () => api.setTool?.('target'),
    'view-route': () => { const el = document.getElementById('edenViewMode'); if (el) { el.value = 'route'; el.dispatchEvent(new Event('change')); } },
    'view-scout': () => { const el = document.getElementById('edenViewMode'); if (el) { el.value = 'scout'; el.dispatchEvent(new Event('change')); } },
    'sector-c': () => api.setSector?.('C'),
    'fit-view': () => { api.fitView?.(); api.redraw?.(); },
  };

  function clearHighlights() {
    document.querySelectorAll('.eden-guide-highlight').forEach(el => el.classList.remove('eden-guide-highlight'));
  }

  function highlightSelector(sel) {
    clearHighlights();
    if (!sel) return;
    const el = document.querySelector(sel);
    if (el) {
      el.classList.add('eden-guide-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  function markComplete(stepId) {
    if (!progress.completed.includes(stepId)) {
      progress.completed.push(stepId);
      saveProgress(progress);
    }
  }

  function progressPct() {
    const total = allStepIds().length;
    const done = progress.completed.length;
    return total ? Math.round((done / total) * 100) : 0;
  }

  function renderSectionNav() {
    const nav = root.querySelector('.eden-guide-sections');
    if (!nav) return;
    nav.innerHTML = EDEN_GUIDE_SECTIONS.map((sec, i) => {
      const done = sec.steps.every(st => progress.completed.includes(st.id));
      const active = i === activeSection;
      const secDone = sec.steps.filter(st => progress.completed.includes(st.id)).length;
      return `<button type="button" class="eden-guide-sec-btn ${active ? 'active' : ''} ${done ? 'complete' : ''}" data-sec="${i}" title="${t(sec.titleKey)}">
        <span class="eden-guide-sec-icon">${sec.icon}</span>
        <span class="eden-guide-sec-label">${t(sec.titleKey)}</span>
        <span class="eden-guide-sec-count">${secDone}/${sec.steps.length}</span>
      </button>`;
    }).join('');
  }

  function renderStepList() {
    const list = root.querySelector('.eden-guide-steps');
    if (!list) return;
    const sec = EDEN_GUIDE_SECTIONS[activeSection];
    list.innerHTML = sec.steps.map((st, i) => {
      const done = progress.completed.includes(st.id);
      const active = i === activeStep;
      return `<button type="button" class="eden-guide-step-pill ${active ? 'active' : ''} ${done ? 'done' : ''}" data-step="${i}">
        <span class="eden-guide-step-num">${done ? '✓' : i + 1}</span>
        <span>${t(st.titleKey)}</span>
      </button>`;
    }).join('');
  }

  function renderMainStep() {
    const main = root.querySelector('.eden-guide-main');
    if (!main) return;
    const sec = EDEN_GUIDE_SECTIONS[activeSection];
    const step = sec.steps[activeStep];
    if (!step) return;

    const tipsHtml = (step.tips || []).map(tipKey => `<li>${t(tipKey)}</li>`).join('');

    main.innerHTML = `
      <div class="eden-guide-step-card">
        <div class="eden-guide-step-head">
          <span class="eden-guide-step-icon">${step.icon}</span>
          <div>
            <div class="eden-guide-step-eyebrow">${sec.icon} ${t(sec.titleKey)} · ${t('edenGuideStepLabel')} ${activeStep + 1}/${sec.steps.length}</div>
            <h4 class="eden-guide-step-title">${t(step.titleKey)}</h4>
          </div>
        </div>
        <p class="eden-guide-step-desc">${t(step.descKey)}</p>
        ${tipsHtml ? `<ul class="eden-guide-step-tips">${tipsHtml}</ul>` : ''}
        <div class="eden-guide-step-actions">
          ${step.action ? `<button type="button" class="eden-guide-try-btn" data-action="${step.action}">${t('edenGuideTryIt')}</button>` : ''}
          <button type="button" class="eden-guide-done-btn" data-mark="${step.id}">${t('edenGuideMarkDone')}</button>
        </div>
      </div>
      <div class="eden-guide-nav-row">
        <button type="button" class="eden-guide-nav-btn" data-nav="prev" ${activeSection === 0 && activeStep === 0 ? 'disabled' : ''}>← ${t('edenGuidePrev')}</button>
        <button type="button" class="eden-guide-nav-btn eden-guide-nav-primary" data-nav="next">${t('edenGuideNext')} →</button>
      </div>`;

    highlightSelector(step.highlight);
    if (step.action && step.highlight) setTimeout(() => highlightSelector(step.highlight), 300);
  }

  function renderProgress() {
    const bar = root.querySelector('.eden-guide-progress-fill');
    const label = root.querySelector('.eden-guide-progress-text');
    const pct = progressPct();
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = t('edenGuideProgress').replace('{pct}', String(pct)).replace('{done}', String(progress.completed.length)).replace('{total}', String(allStepIds().length));
  }

  function render() {
    renderSectionNav();
    renderStepList();
    renderMainStep();
    renderProgress();
    const ver = root.querySelector('.eden-guide-version');
    if (ver) ver.textContent = t('edenGuideVersion').replace('{v}', EDEN_GUIDE_VERSION);
  }

  function goNext() {
    const sec = EDEN_GUIDE_SECTIONS[activeSection];
    markComplete(sec.steps[activeStep].id);
    if (activeStep < sec.steps.length - 1) {
      activeStep++;
    } else if (activeSection < EDEN_GUIDE_SECTIONS.length - 1) {
      activeSection++;
      activeStep = 0;
    } else {
      activeStep = sec.steps.length - 1;
      if (typeof window.showToast === 'function') window.showToast(t('edenGuideCompleteToast'), 'success', 4000);
    }
    progress.section = activeSection;
    progress.step = activeStep;
    saveProgress(progress);
    render();
  }

  function goPrev() {
    if (activeStep > 0) activeStep--;
    else if (activeSection > 0) {
      activeSection--;
      activeStep = EDEN_GUIDE_SECTIONS[activeSection].steps.length - 1;
    }
    progress.section = activeSection;
    progress.step = activeStep;
    saveProgress(progress);
    render();
  }

  root.addEventListener('click', (e) => {
    const secBtn = e.target.closest('[data-sec]');
    if (secBtn) {
      activeSection = Number(secBtn.dataset.sec);
      activeStep = 0;
      progress.section = activeSection;
      progress.step = 0;
      saveProgress(progress);
      render();
      return;
    }
    const stepPill = e.target.closest('[data-step]');
    if (stepPill) {
      activeStep = Number(stepPill.dataset.step);
      progress.step = activeStep;
      saveProgress(progress);
      render();
      return;
    }
    const tryBtn = e.target.closest('[data-action]');
    if (tryBtn) {
      const fn = actions[tryBtn.dataset.action];
      fn?.();
      const sec = EDEN_GUIDE_SECTIONS[activeSection];
      const step = sec.steps[activeStep];
      if (step?.highlight) setTimeout(() => highlightSelector(step.highlight), 400);
      return;
    }
    const markBtn = e.target.closest('[data-mark]');
    if (markBtn) {
      markComplete(markBtn.dataset.mark);
      render();
      if (typeof window.showToast === 'function') window.showToast(t('edenGuideStepDoneToast'), 'success', 2000);
      return;
    }
    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) {
      if (navBtn.dataset.nav === 'next') goNext();
      else goPrev();
      return;
    }
    if (e.target.closest('[data-reset-guide]')) {
      progress = { version: EDEN_GUIDE_VERSION, completed: [], section: 0, step: 0 };
      activeSection = 0;
      activeStep = 0;
      saveProgress(progress);
      clearHighlights();
      render();
      if (typeof window.showToast === 'function') window.showToast(t('edenGuideResetToast'), 'info');
    }
    if (e.target.closest('[data-start-tour]')) {
      const panel = document.getElementById('edenHelpPanel');
      if (panel) panel.open = true;
      activeSection = 0;
      activeStep = 0;
      render();
      root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  window.addEventListener('edenLanguageUpdate', () => render());

  render();

  if (!progress.completed.length) {
    const panel = document.getElementById('edenHelpPanel');
    if (panel) panel.open = true;
  }

  return {
    open: () => {
      const panel = document.getElementById('edenHelpPanel');
      if (panel) panel.open = true;
      render();
    },
    reset: () => {
      progress = { version: EDEN_GUIDE_VERSION, completed: [], section: 0, step: 0 };
      activeSection = 0;
      activeStep = 0;
      saveProgress(progress);
      render();
    },
  };
}

export function openEdenGuide() {
  const panel = document.getElementById('edenHelpPanel');
  if (panel) panel.open = true;
  document.getElementById('edenGuideRoot')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}