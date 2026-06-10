// Eden map season / dataset picker
import { translations } from './translations.js';
import {
  EDEN_DATASET_CATALOG,
  applyEdenDataset,
  getEdenDatasetId,
  hasEdenDatasetChoice,
} from './eden-map-data.js';

function t(key) {
  const lang = localStorage.getItem('vts_hero_lang') || 'en';
  return translations[lang]?.[key] || translations.en[key] || key;
}

/**
 * @param {{ onDatasetApplied?: (id: string) => void }} api
 */
export function initEdenSeasonPicker(api) {
  const modal = document.getElementById('edenSeasonModal');
  const choices = document.getElementById('edenSeasonChoices');
  const select = document.getElementById('edenDatasetSelect');
  const badge = document.getElementById('edenDatasetBadge');

  function datasetLabel(id) {
    const ds = EDEN_DATASET_CATALOG.find(d => d.id === id);
    return ds ? t(ds.labelKey) : id;
  }

  function updateBadge() {
    if (!badge) return;
    const id = getEdenDatasetId();
    badge.textContent = id ? datasetLabel(id) : '';
    badge.classList.toggle('hidden', !id);
  }

  function renderChoices() {
    if (!choices) return;
    choices.innerHTML = EDEN_DATASET_CATALOG.map((ds) => {
      const count = ds.structureCount
        ? t('edenDatasetCoordCount').replace('{n}', String(ds.structureCount))
        : t('edenDatasetBaseMap');
      return `<button type="button" class="eden-season-choice" data-dataset="${ds.id}">
        <span class="eden-season-choice-title">${t(ds.labelKey)}</span>
        <span class="eden-season-choice-desc">${t(ds.descKey)}</span>
        <span class="eden-season-choice-meta">${count}</span>
      </button>`;
    }).join('');
  }

  function fillSelect() {
    if (!select) return;
    select.innerHTML = EDEN_DATASET_CATALOG.map(ds =>
      `<option value="${ds.id}">${t(ds.labelKey)}</option>`
    ).join('');
    select.value = getEdenDatasetId() || EDEN_DATASET_CATALOG[0]?.id || '';
  }

  function pick(id, { showToast = true } = {}) {
    if (!id || !applyEdenDataset(id)) return;
    modal?.classList.add('hidden');
    if (select) select.value = id;
    updateBadge();
    api.onDatasetApplied?.(id);
    if (showToast && typeof window.showToast === 'function') {
      window.showToast(t('edenDatasetSwitched').replace('{name}', datasetLabel(id)), 'info', 2800);
    }
  }

  choices?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dataset]');
    if (btn) pick(btn.dataset.dataset);
  });

  select?.addEventListener('change', () => {
    if (select.value && select.value !== getEdenDatasetId()) pick(select.value);
  });

  document.getElementById('edenChangeSeasonBtn')?.addEventListener('click', () => {
    modal?.classList.remove('hidden');
  });

  window.addEventListener('edenLanguageUpdate', () => {
    renderChoices();
    fillSelect();
    updateBadge();
  });

  renderChoices();
  fillSelect();
  updateBadge();

  if (!hasEdenDatasetChoice()) {
    modal?.classList.remove('hidden');
  } else {
    applyEdenDataset(getEdenDatasetId());
    updateBadge();
    api.onDatasetApplied?.(getEdenDatasetId());
  }

  return { openPicker: () => modal?.classList.remove('hidden') };
}