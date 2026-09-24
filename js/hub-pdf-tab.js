// js/hub-pdf-tab.js
// Small helpers the hub controllers share to add sub-tabs that index.html has no
// byte headroom for (the hub "PDFs" tab and the Research & Towers "Buildings"
// tab). Only the button and an empty panel are created here; the PDF form, its
// document builders and their data load from mountHubPdfPanel's dynamic import
// the first time the tab opens.

import { translations } from './translations.js';
import { currentLanguage } from './state.js';

const ICONS = Object.freeze({
  pdfs: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  buildings: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6',
});

/** Label from the canonical catalog, like the hubs' other lazily added copy. */
export function hubTabLabel(key, fallback) {
  const catalog = globalThis.VTS_TRANSLATIONS || translations;
  return catalog[currentLanguage]?.[key] || catalog.en?.[key] || fallback;
}

/** A sub-tab button in the hub's own markup pattern. */
export function createHubTabButton({
  name,
  i18nKey,
  fallback,
  attribute,
  className,
  controls,
  id,
}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('role', 'tab');
  button.setAttribute('aria-selected', 'false');
  button.tabIndex = -1;
  button.dataset[attribute] = name;
  if (id) button.id = id;
  if (controls) button.setAttribute('aria-controls', controls);
  const path = ICONS[name];
  if (path) {
    button.innerHTML = `<svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${path}"/></svg>`;
  }
  const label = document.createElement('span');
  label.dataset.i18n = i18nKey;
  label.textContent = hubTabLabel(i18nKey, fallback);
  button.append(label);
  return button;
}

/** An empty, hidden tab panel. */
export function createHubTabPanel({ id, attribute, name, className, labelledBy }) {
  const panel = document.createElement('section');
  panel.id = id;
  panel.className = className;
  panel.dataset[attribute] = name;
  panel.setAttribute('role', 'tabpanel');
  if (labelledBy) panel.setAttribute('aria-labelledby', labelledBy);
  panel.hidden = true;
  return panel;
}

/** Load the PDFs form into a panel once. `hub` is heroes | research | class | eden. */
export function mountHubPdfPanel(hub, panel) {
  if (!panel || panel.dataset.hubPdfMounted === '1') return;
  panel.dataset.hubPdfMounted = '1';
  panel.innerHTML = `<div class="tab-loading" aria-busy="true"><div class="spinner"></div></div>`;
  import('./hub-pdf/panel.js')
    .then((module) => module.renderHubPdfPanel(panel, hub))
    .catch((error) => {
      console.warn('[hub-pdf] PDFs tab failed to load', error);
      delete panel.dataset.hubPdfMounted;
      const template =
        hubTabLabel('edenHubLoadFailed', '') || '{tab} failed to load. Refresh and try again.';
      panel.textContent = template.replace('{tab}', hubTabLabel('hubPdfsTab', 'PDFs'));
    });
}
