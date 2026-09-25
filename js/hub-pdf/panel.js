// js/hub-pdf/panel.js
// The "PDFs" sub-tab of each hub. The panel markup lives in panel-view.js; this
// module owns the behaviour: read the scope choices, draw the sheet, and hand the
// reader a file. Nothing prints — the sheet is drawn onto canvases and the PDF is
// those page images wrapped by the tiny writer in pdf-writer.js. The renderer,
// the writer and the hub's own data all load on the first click.

import '../../css/hub-pdf.css';
import { currentLanguage } from '../state.js';
import { SITE_LOGO, SITE_URL } from '../seo.js';
import { getLanguageDirection } from '../translations.js';
import { loadHubPdfCopy, normalizeHubPdfLanguage } from '../i18n/hub-pdf/index.js';
import { PANEL_SETTINGS, renderPanelHtml, sheetFileName } from './panel-view.js';

const HUBS = Object.freeze({
  heroes: () => import('./heroes.js').then((module) => module.heroesPdf),
  research: () => import('./research.js').then((module) => module.researchPdf),
  class: () => import('./class.js').then((module) => module.classPdf),
  eden: () => import('./eden.js').then((module) => module.edenPdf),
});

function setStatus(panel, message) {
  const node = panel.querySelector('.hub-pdf-status');
  if (node) node.textContent = message || '';
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari needs the object URL to outlive the click.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function exportSheet(panel, state, format) {
  const { copy } = state;
  setStatus(panel, copy.preparing);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const base = sheetFileName(state, format);
  try {
    const [renderer, writer] = await Promise.all([
      import('./canvas-doc.js'),
      format === 'pdf' ? import('./pdf-writer.js') : Promise.resolve(null),
    ]);
    const doc = state.def.build(state.choices, copy, { ...state.settings, ...state.ctx });
    if (!renderer.documentHasContent(doc)) {
      setStatus(panel, copy.emptySelection);
      return;
    }
    const [images, logo] = await Promise.all([
      renderer.loadPortraits(renderer.portraitUrls(doc)),
      renderer.loadLogo(SITE_LOGO),
    ]);
    const pages = renderer.renderHubPages({
      doc,
      copy,
      theme: state.settings.theme,
      siteUrl: SITE_URL,
      images,
      logo,
      rtl: getLanguageDirection(state.language) === 'rtl',
    });
    if (format === 'pdf') {
      const jpegPages = await renderer.pagesToJpeg(pages);
      const bytes = writer.buildJpegPdf(jpegPages, { title: base });
      triggerDownload(new Blob([bytes], { type: 'application/pdf' }), base);
    } else {
      const background = renderer.SHEET_PALETTES[state.settings.theme]?.background || '#ffffff';
      const blobs = await renderer.pagesToPng(renderer.stitchPages(pages, { background }));
      blobs.forEach((blob, index) => {
        const name = blobs.length > 1 ? base.replace(/\.png$/, `-${index + 1}.png`) : base;
        triggerDownload(blob, name);
      });
    }
    setStatus(panel, copy.downloaded);
  } catch (error) {
    console.warn('[hub-pdf] download failed', error);
    setStatus(panel, copy.buildFailed);
  }
}

/** Read the form back into the choices, keeping the option order the form showed. */
function readChoices(state, form) {
  const choices = { ...state.choices };
  // Chips carry only name/value, so fields are matched by name, not data-field.
  form.querySelectorAll('[name]').forEach((node) => {
    const name = node.name;
    const field = state.fields.find((entry) => entry.name === name);
    if (!field) return;
    if (field.type === 'checks') {
      if (node.type !== 'checkbox') return;
      const list = new Set((Array.isArray(choices[name]) ? choices[name] : []).map(String));
      if (node.checked) list.add(node.value);
      else list.delete(node.value);
      choices[name] = (field.options || [])
        .map((option) => option.value)
        .filter((value) => list.has(String(value)));
    } else if (node.type === 'checkbox') {
      choices[name] = node.checked;
    } else if (field.type === 'range') {
      if (node.value !== '') choices[name] = Number(node.value);
    } else {
      choices[name] = node.value;
    }
  });
  return choices;
}

function applyBulk(state, name, bulkValue) {
  const field = state.fields.find((entry) => entry.name === name);
  const options = (field?.options || []).filter((option) => !option.disabled);
  state.choices = {
    ...state.choices,
    [name]: bulkValue === 'all' ? options.map((option) => option.value) : [],
  };
}

function bind(panel, state) {
  const form = panel.querySelector('form');
  if (!form) return;
  form.addEventListener('change', (event) => {
    const node = event.target;
    // Every control in the scope form feeds the choices; the two settings do not.
    if (node.dataset?.setting) {
      state.settings = { ...state.settings, [node.dataset.setting]: node.value };
      return;
    }
    state.choices = readChoices(state, form);
  });
  form.addEventListener('click', (event) => {
    const download = event.target.closest?.('[data-download]');
    if (download) {
      exportSheet(panel, state, download.dataset.download);
      return;
    }
    const bulk = event.target.closest?.('[data-bulk]');
    if (bulk) {
      applyBulk(state, bulk.dataset.bulk, bulk.dataset.bulkValue);
      renderPanel(panel, state);
    }
  });
}

function renderPanel(panel, state) {
  panel.innerHTML = renderPanelHtml(state);
  bind(panel, state);
}

/** Mount the panel: the hub's own scope choices, then the two downloads. */
export async function renderHubPdfPanel(panel, hub) {
  const def = await HUBS[hub]();
  const language = normalizeHubPdfLanguage(currentLanguage);
  const copy = await loadHubPdfCopy(language);
  const ctx = { language };
  const state = {
    hub,
    def,
    copy,
    ctx,
    language,
    choices: def.defaults(),
    settings: { ...PANEL_SETTINGS },
    fields: [],
  };
  if (def.refresh) state.choices = def.refresh(state.choices, copy, ctx).choices;
  state.fields = def.form(copy, state.choices, ctx);
  renderPanel(panel, state);
}
