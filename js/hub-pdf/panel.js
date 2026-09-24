// js/hub-pdf/panel.js
// The "PDFs" sub-tab of each hub: a form built from the hub's data modules, and
// a client-side document generator. Everything here loads on first open of the
// tab; nothing is added to the initial route.
//
// Save as PDF writes the document into a hidden same-origin iframe and calls its
// print(), so the reader picks "Save as PDF" in the browser's own dialog: zero
// dependencies, vector output, selectable text in every script the browser can
// render. On touch devices, where some browsers print the parent page instead of
// an iframe, the document opens in a new tab and prints from there.

import '../../css/hub-pdf.css';
import { APP_VERSION, currentLanguage } from '../state.js';
import { SITE_NAME, SITE_URL } from '../seo.js';
import { getLanguageDirection } from '../translations.js';
import { formatLocaleDate } from '../locale-format.js';
import { loadHubPdfCopy, normalizeHubPdfLanguage } from '../i18n/hub-pdf/index.js';
import { escapeHtml, normalizeSettings, renderDocumentHtml } from './document.js';

const HUBS = Object.freeze({
  heroes: () => import('./heroes.js').then((module) => module.heroesPdf),
  research: () => import('./research.js').then((module) => module.researchPdf),
  class: () => import('./class.js').then((module) => module.classPdf),
  eden: () => import('./eden.js').then((module) => module.edenPdf),
});

export const HUB_PDF_FRAME_ID = 'hubPdfPrintFrame';
const DEFAULT_SETTINGS = Object.freeze({
  paper: 'a4',
  orientation: 'portrait',
  detail: 'summary',
  sources: true,
});

function fieldId(hub, name) {
  return `hubPdf-${hub}-${name}`;
}

function optionsHtml(options, value) {
  return options
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}"${String(option.value) === String(value) ? ' selected' : ''}>${escapeHtml(option.label)}</option>`
    )
    .join('');
}

function renderField(field, state) {
  const { hub, choices, copy } = state;
  if (field.type === 'heading')
    return `<h3 class="hub-pdf-subhead">${escapeHtml(field.label)}</h3>`;
  if (field.type === 'text') return `<p class="hub-pdf-note">${escapeHtml(field.label)}</p>`;
  if (field.type === 'select') {
    const id = fieldId(hub, field.name);
    return `<label class="hub-pdf-field" for="${id}"><span>${escapeHtml(field.label)}</span><select id="${id}" name="${field.name}" data-field="${field.name}">${optionsHtml(field.options, choices[field.name])}</select></label>`;
  }
  if (field.type === 'toggle') {
    return `<label class="hub-pdf-toggle"><input type="checkbox" name="${field.name}" data-field="${field.name}"${choices[field.name] ? ' checked' : ''}><span>${escapeHtml(field.label)}</span></label>`;
  }
  if (field.type === 'checks') {
    const selected = new Set((choices[field.name] || []).map(String));
    const bulk = field.bulk
      ? `<span class="hub-pdf-bulk"><button type="button" data-bulk="${field.name}" data-bulk-value="all">${escapeHtml(copy.selectAll)}</button><button type="button" data-bulk="${field.name}" data-bulk-value="none">${escapeHtml(copy.clearAll)}</button></span>`
      : '';
    return `<fieldset class="hub-pdf-field" data-field="${field.name}"><legend>${escapeHtml(field.label)}${bulk}</legend><div class="hub-pdf-chips">${field.options
      .map(
        (option) =>
          `<label class="hub-pdf-chip"><input type="checkbox" name="${field.name}" value="${escapeHtml(option.value)}"${selected.has(String(option.value)) && !option.disabled ? ' checked' : ''}${option.disabled ? ' disabled' : ''}><span>${escapeHtml(option.label)}</span></label>`
      )
      .join('')}</div></fieldset>`;
  }
  if (field.type === 'range') {
    const from = choices[field.fromName] ?? field.min;
    const to = choices[field.toName] ?? field.max;
    const input = (name, value, label) =>
      `<label><span>${escapeHtml(label)}</span><input type="number" inputmode="numeric" name="${name}" data-field="${name}" min="${field.min}" max="${field.max}" value="${escapeHtml(value)}"></label>`;
    return `<fieldset class="hub-pdf-field hub-pdf-range"><legend>${escapeHtml(field.label)}</legend>${input(field.fromName, from, copy.from)}${input(field.toName, to, copy.to)}</fieldset>`;
  }
  return '';
}

function renderSettings(state) {
  const { hub, settings, copy } = state;
  const select = (name, label, options) =>
    `<label class="hub-pdf-field" for="${fieldId(hub, name)}"><span>${escapeHtml(label)}</span><select id="${fieldId(hub, name)}" name="${name}" data-setting="${name}">${optionsHtml(options, settings[name])}</select></label>`;
  const design =
    hub === 'heroes'
      ? select('design', copy.design, [
          { value: 'dashboard', label: copy.designDashboard },
          { value: 'midnight', label: copy.designMidnight },
          { value: 'reference', label: copy.designReference },
        ])
      : '';
  return `<div class="hub-pdf-grid">${design}${select('paper', copy.paper, [
    { value: 'a4', label: copy.paperA4 },
    { value: 'letter', label: copy.paperLetter },
  ])}${select('orientation', copy.orientation, [
    { value: 'portrait', label: copy.portrait },
    { value: 'landscape', label: copy.landscape },
  ])}${select('detail', copy.detail, [
    { value: 'summary', label: copy.detailSummary },
    { value: 'full', label: copy.detailFull },
  ])}</div><label class="hub-pdf-toggle"><input type="checkbox" name="sources" data-setting="sources"${settings.sources ? ' checked' : ''}><span>${escapeHtml(copy.includeSources)}</span></label>`;
}

function renderQuick(state) {
  const { def, copy } = state;
  const items = (def.quick || [])
    .map(
      ([file, label]) =>
        `<li><a href="downloads/${escapeHtml(file)}" target="_blank" rel="noopener">${escapeHtml(label)}</a> <small>PDF</small></li>`
    )
    .join('');
  return `<aside class="hub-pdf-quick" aria-labelledby="${fieldId(state.hub, 'quick')}"><h3 id="${fieldId(state.hub, 'quick')}">${escapeHtml(copy.quickTitle)}</h3><p>${escapeHtml(copy.quickIntro)}</p>${items ? `<ul>${items}</ul>` : ''}<a href="downloads.html">${escapeHtml(copy.quickAll)} →</a></aside>`;
}

function renderPanel(panel, state) {
  const { copy, def } = state;
  const fields = def
    .form(copy, state.choices, state.ctx)
    .map((field) => renderField(field, state))
    .join('');
  panel.innerHTML = `<div class="hub-pdf" data-hub-pdf="${state.hub}">
    <div class="hub-pdf-main">
      <header class="hub-pdf-head"><h2>${escapeHtml(copy.panelTitle)}</h2><p>${escapeHtml(copy.panelIntro)}</p></header>
      <form class="hub-pdf-form" novalidate data-hub-pdf-form>
        <fieldset class="hub-pdf-fieldset"><legend>${escapeHtml(copy.contentLegend)}</legend>${fields}</fieldset>
        <fieldset class="hub-pdf-fieldset"><legend>${escapeHtml(copy.settingsLegend)}</legend>${renderSettings(state)}</fieldset>
        <div class="hub-pdf-actions">
          <button type="submit" class="hub-pdf-btn hub-pdf-btn--primary" data-hub-pdf-print>${escapeHtml(copy.savePdf)}</button>
          <button type="button" class="hub-pdf-btn" data-hub-pdf-open>${escapeHtml(copy.openDoc)}</button>
        </div>
        <p class="hub-pdf-hint">${escapeHtml(copy.saveHint)}${state.hub === 'heroes' ? ` ${escapeHtml(copy.designPrintHint)}` : ''}</p>
        <p class="hub-pdf-status" role="status" aria-live="polite" data-hub-pdf-status></p>
      </form>
    </div>
    ${renderQuick(state)}
  </div>`;
}

/** Choices from the form, keyed by field name, using the hub's own field list. */
export function readChoices(form, fields, previous = {}) {
  const choices = { ...previous };
  for (const field of fields) {
    if (field.type === 'checks') {
      choices[field.name] = [...form.querySelectorAll(`input[name="${field.name}"]:checked`)].map(
        (input) => input.value
      );
    } else if (field.type === 'select') {
      const select = form.querySelector(`select[name="${field.name}"]`);
      if (select) choices[field.name] = select.value;
    } else if (field.type === 'toggle') {
      choices[field.name] = Boolean(form.querySelector(`input[name="${field.name}"]`)?.checked);
    } else if (field.type === 'range') {
      for (const name of [field.fromName, field.toName]) {
        const input = form.querySelector(`input[name="${name}"]`);
        if (input && input.value !== '') choices[name] = Number(input.value);
      }
    }
  }
  return choices;
}

function readSettings(form) {
  return normalizeSettings({
    paper: form.querySelector('[data-setting="paper"]')?.value,
    orientation: form.querySelector('[data-setting="orientation"]')?.value,
    detail: form.querySelector('[data-setting="detail"]')?.value,
    sources: Boolean(form.querySelector('[data-setting="sources"]')?.checked),
    design: form.querySelector('[data-setting="design"]')?.value,
  });
}

function hasContent(state) {
  const fields = state.def.form(state.copy, state.choices, state.ctx);
  const include = fields.find(
    (field) => field.type === 'checks' && (field.name === 'include' || field.name === 'stages')
  );
  return !include || (state.choices[include.name] || []).length > 0;
}

function buildHtml(state) {
  const lang = normalizeHubPdfLanguage(currentLanguage);
  const doc = state.def.build(state.choices, state.copy, state.settings, state.ctx);
  let generatedAt;
  try {
    generatedAt = formatLocaleDate(new Date(), lang, { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    generatedAt = new Date().toISOString();
  }
  return renderDocumentHtml(doc, state.settings, {
    copy: state.copy,
    language: lang,
    dir: getLanguageDirection(currentLanguage),
    branding: { siteName: SITE_NAME, siteUrl: SITE_URL, appVersion: APP_VERSION, generatedAt },
    assetBase: new URL('.', document.baseURI).href,
  });
}

function writeInto(targetDocument, html) {
  targetDocument.open();
  targetDocument.write(html);
  targetDocument.close();
}

function wirePrintButton(win) {
  win.document.querySelector('[data-doc-print]')?.addEventListener('click', () => win.print());
}

function afterLayout(targetDocument, callback) {
  // Portraits may be remote. Wait for them, but never hold the print dialog forever.
  const images = [...targetDocument.images];
  const ready = Promise.allSettled([
    targetDocument.fonts?.ready,
    ...images.map((image) => image.decode()),
  ]);
  let timer;
  Promise.race([
    ready,
    new Promise((resolve) => {
      timer = setTimeout(resolve, 8000);
    }),
  ]).then(() => {
    clearTimeout(timer);
    images.forEach((image) => {
      if (!image.complete || !image.naturalWidth) image.style.visibility = 'hidden';
    });
    setTimeout(callback, 60);
  });
}

function printInFrame(html, hub, settings) {
  document.getElementById(HUB_PDF_FRAME_ID)?.remove();
  const frame = document.createElement('iframe');
  frame.id = HUB_PDF_FRAME_ID;
  frame.title = 'PDF';
  frame.dataset.hubPdf = hub;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none;';
  const [short, long] = settings.paper === 'letter' ? [816, 1056] : [794, 1123];
  frame.style.width = `${settings.orientation === 'landscape' ? long : short}px`;
  frame.style.height = `${settings.orientation === 'landscape' ? short : long}px`;
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  writeInto(frame.contentDocument, html);
  wirePrintButton(win);
  afterLayout(frame.contentDocument, () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* The reader can still use Open document. */
    }
  });
}

function openInWindow(html, { print = false } = {}) {
  const win = window.open('', '_blank');
  if (!win) return false;
  writeInto(win.document, html);
  wirePrintButton(win);
  afterLayout(win.document, () => {
    if (print) win.print();
  });
  return true;
}

function prefersNewTabPrint() {
  try {
    return window.matchMedia?.('(pointer: coarse)').matches === true;
  } catch {
    return false;
  }
}

function setStatus(panel, message, tone = '') {
  const status = panel.querySelector('[data-hub-pdf-status]');
  if (!status) return;
  status.textContent = message;
  if (tone) status.dataset.tone = tone;
  else delete status.dataset.tone;
}

function applyRefresh(panel, state) {
  if (!state.def.refresh) return;
  const result = state.def.refresh(state.choices, state.copy, state.ctx);
  state.choices = result.choices;
  for (const [name, options] of Object.entries(result.fields || {})) {
    const select = panel.querySelector(`select[name="${name}"]`);
    if (select) select.innerHTML = optionsHtml(options, state.choices[name]);
  }
}

function bind(panel, state) {
  const form = panel.querySelector('[data-hub-pdf-form]');
  if (!form) return;
  const sync = () => {
    const fields = state.def.form(state.copy, state.choices, state.ctx);
    state.choices = readChoices(form, fields, state.choices);
    state.settings = readSettings(form);
  };
  form.addEventListener('change', () => {
    sync();
    applyRefresh(panel, state);
  });
  form.addEventListener('click', (event) => {
    const bulk = event.target.closest('[data-bulk]');
    if (!bulk) return;
    const all = bulk.dataset.bulkValue === 'all';
    form.querySelectorAll(`input[name="${bulk.dataset.bulk}"]`).forEach((input) => {
      if (!input.disabled) input.checked = all;
    });
    sync();
  });
  const run = (mode) => {
    sync();
    if (!hasContent(state)) {
      setStatus(panel, state.copy.emptySelection, 'error');
      return;
    }
    setStatus(panel, state.copy.preparing);
    let html;
    try {
      html = buildHtml(state);
    } catch (error) {
      console.error('[hub-pdf] document build failed', error);
      setStatus(panel, state.copy.buildFailed, 'error');
      return;
    }
    state.lastHtml = html;
    if (mode === 'open') {
      setStatus(panel, openInWindow(html) ? state.copy.docOpened : state.copy.popupBlocked, '');
      return;
    }
    if (prefersNewTabPrint() && openInWindow(html, { print: true })) {
      setStatus(panel, state.copy.printOpened);
      return;
    }
    printInFrame(html, state.hub, state.settings);
    setStatus(panel, state.copy.printOpened);
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run('print');
  });
  form.querySelector('[data-hub-pdf-open]')?.addEventListener('click', () => run('open'));
}

/** Mount the PDFs form for a hub ('heroes' | 'research' | 'class' | 'eden'). */
export async function renderHubPdfPanel(panel, hub) {
  const loadDef = HUBS[hub];
  if (!panel || !loadDef) return false;
  const [def, copy] = await Promise.all([loadDef(), loadHubPdfCopy(currentLanguage)]);
  panel.innerHTML = `<p class="hub-pdf-note" role="status">${escapeHtml(copy.loadingData)}</p>`;
  const ctx = (await def.prepare?.()) || {};
  const state = {
    hub,
    def,
    copy,
    ctx,
    choices: def.defaults(),
    settings: {
      ...DEFAULT_SETTINGS,
      ...(hub === 'heroes' ? { design: 'dashboard', orientation: 'landscape' } : {}),
    },
  };
  if (def.refresh) state.choices = def.refresh(state.choices, copy, ctx).choices;
  renderPanel(panel, state);
  bind(panel, state);

  window.addEventListener('vts:language-change', async () => {
    if (!panel.isConnected) return;
    state.copy = await loadHubPdfCopy(currentLanguage);
    renderPanel(panel, state);
    bind(panel, state);
  });
  return true;
}
