// Eden map season / dataset picker
import { translations } from './translations.js';
import {
  ensureEdenDatasetsLoaded,
  getEdenDatasetCatalog,
  applyEdenDataset,
  getDefaultEdenDatasetId,
  getEdenDatasetId,
  hasEdenDatasetChoice,
} from './eden-map-data.js';

const defaultDataApi = {
  ensureLoaded: ensureEdenDatasetsLoaded,
  getCatalog: getEdenDatasetCatalog,
  applyDataset: applyEdenDataset,
  getDefaultId: getDefaultEdenDatasetId,
  getDatasetId: getEdenDatasetId,
  hasChoice: hasEdenDatasetChoice,
};

function t(key) {
  const lang = localStorage.getItem('vts_hero_lang') || 'en';
  return translations[lang]?.[key] || translations.en[key] || key;
}

/**
 * @param {{ onDatasetApplied?: (id: string) => void }} api
 * @param {typeof defaultDataApi} dataApi
 */
export function initEdenSeasonPicker(api = {}, dataApi = defaultDataApi) {
  const modal = document.getElementById('edenSeasonModal');
  const choices = document.getElementById('edenSeasonChoices');
  const select = document.getElementById('edenDatasetSelect');
  const badge = document.getElementById('edenDatasetBadge');
  const status = document.getElementById('edenSeasonStatus');
  const retry = document.getElementById('edenSeasonRetry');
  const close = document.getElementById('edenSeasonClose');
  const changeButton = document.getElementById('edenChangeSeasonBtn');

  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  let state = 'loading';
  let dismissed = false;
  let refreshToken = 0;
  let lastFocused = null;
  let lastNotifiedId = null;

  const catalog = () => dataApi.getCatalog();

  function datasetLabel(id) {
    const dataset = catalog().find((entry) => entry.id === id);
    return dataset ? t(dataset.labelKey) : id;
  }

  function setModalOpen(open) {
    if (!modal) return;
    if (open) {
      dismissed = false;
      lastFocused = document.activeElement;
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      queueMicrotask(() => {
        focusFirstInModal();
      });
      return;
    }
    dismissed = true;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    lastFocused?.focus?.();
  }

  const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusableElements() {
    if (!modal) return [];
    return Array.from(modal.querySelectorAll(focusableSelector)).filter(
      (el) => el.offsetParent !== null || el.getClientRects().length > 0,
    );
  }

  function focusFirstInModal() {
    const elements = focusableElements();
    const firstChoice = choices?.querySelector?.('[data-dataset]');
    const target = firstChoice || elements[0] || (!retry?.classList.contains('hidden') ? retry : close);
    target?.focus?.();
  }

  function trapFocus(event) {
    if (modal?.hidden || event.key !== 'Tab') return;
    const elements = focusableElements();
    if (!elements.length) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setStatus(message, nextState) {
    state = nextState;
    if (!status) return;
    status.textContent = message;
    status.dataset.state = nextState;
    status.classList.toggle('hidden', !message);
  }

  function updateBadge() {
    if (!badge) return;
    const id = dataApi.getDatasetId();
    const hasDataset = Boolean(id && catalog().some((entry) => entry.id === id));
    badge.textContent = hasDataset ? datasetLabel(id) : '';
    badge.classList.toggle('hidden', !hasDataset);
  }

  function setSelectLoading(message) {
    if (!select) return;
    select.disabled = true;
    select.innerHTML = `<option value="">${message}</option>`;
    select.value = '';
  }

  function renderChoices() {
    if (!choices) return;
    choices.innerHTML = catalog().map((dataset) => {
      const count = dataset.structureCount
        ? t('edenDatasetCoordCount').replace('{n}', String(dataset.structureCount))
        : t('edenDatasetBaseMap');
      return `<button type="button" class="eden-season-choice" data-dataset="${dataset.id}">
        <span class="eden-season-choice-title">${t(dataset.labelKey)}</span>
        <span class="eden-season-choice-desc">${t(dataset.descKey)}</span>
        <span class="eden-season-choice-meta">${count}</span>
      </button>`;
    }).join('');
    choices.setAttribute('aria-busy', 'false');
  }

  function fillSelect() {
    if (!select) return;
    select.innerHTML = catalog().map((dataset) =>
      `<option value="${dataset.id}">${t(dataset.labelKey)}</option>`
    ).join('');
    select.disabled = false;
    select.value = dataApi.getDatasetId() || dataApi.getDefaultId();
  }

  function renderLoading() {
    const message = t('adminLoading');
    setStatus(message, 'loading');
    if (choices) {
      choices.innerHTML = '';
      choices.setAttribute('aria-busy', 'true');
    }
    retry?.classList.add('hidden');
    setSelectLoading(message);
  }

  function renderError() {
    const message = t('edenMapLoadFailed');
    setStatus(message, 'error');
    if (choices) {
      choices.innerHTML = '';
      choices.setAttribute('aria-busy', 'false');
    }
    retry?.classList.remove('hidden');
    setSelectLoading(message);
  }

  function renderReady() {
    setStatus('', 'ready');
    retry?.classList.add('hidden');
    renderChoices();
    fillSelect();
    updateBadge();
  }

  function notifyDatasetApplied(id) {
    if (id === lastNotifiedId) return;
    lastNotifiedId = id;
    api.onDatasetApplied?.(id);
  }

  function pick(id, { showToast = true } = {}) {
    if (!id || !dataApi.applyDataset(id)) return false;
    if (select) select.value = id;
    updateBadge();
    notifyDatasetApplied(id);
    setModalOpen(false);
    if (showToast && typeof window.showToast === 'function') {
      window.showToast(
        t('edenDatasetSwitched').replace('{name}', datasetLabel(id)),
        'info',
        2800
      );
    }
    return true;
  }

  function settleReady({ applySaved = false } = {}) {
    if (!catalog().length) {
      renderError();
      return false;
    }

    renderReady();
    if (applySaved && dataApi.hasChoice()) {
      const id = dataApi.getDatasetId();
      if (dataApi.applyDataset(id)) {
        updateBadge();
        notifyDatasetApplied(id);
        setModalOpen(false);
        return true;
      }
    }

    if (!dismissed) setModalOpen(true);
    return true;
  }

  async function refresh({ open = true, applySaved = false } = {}) {
    const token = ++refreshToken;
    if (open) setModalOpen(true);

    if (catalog().length) return settleReady({ applySaved });
    renderLoading();

    try {
      await dataApi.ensureLoaded();
    } catch (error) {
      if (token !== refreshToken) return false;
      console.warn('[eden] Dataset catalog failed to load:', error);
      renderError();
      return false;
    }

    if (token !== refreshToken) return false;
    return settleReady({ applySaved });
  }

  choices?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-dataset]');
    if (button) pick(button.dataset.dataset);
  });

  select?.addEventListener('change', () => {
    if (select.value && select.value !== dataApi.getDatasetId()) pick(select.value);
  });

  changeButton?.addEventListener('click', () => {
    refresh({ open: true, applySaved: false });
  });

  retry?.addEventListener('click', () => {
    refresh({ open: true, applySaved: true });
  });

  close?.addEventListener('click', () => setModalOpen(false));
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) setModalOpen(false);
  });
  modal?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setModalOpen(false);
      return;
    }
    trapFocus(event);
  });

  window.addEventListener('edenDatasetsLoaded', () => {
    if (catalog().length) renderReady();
  });

  window.addEventListener('edenDatasetsLoadFailed', () => {
    if (state === 'loading') renderError();
  });

  window.addEventListener('edenLanguageUpdate', () => {
    if (state === 'loading') renderLoading();
    else if (state === 'error') renderError();
    else renderReady();
  });

  const ready = catalog().length
    ? Promise.resolve(settleReady({ applySaved: true }))
    : refresh({ open: true, applySaved: true });

  return {
    openPicker: () => refresh({ open: true, applySaved: false }),
    closePicker: () => setModalOpen(false),
    refresh,
    ready,
  };
}
