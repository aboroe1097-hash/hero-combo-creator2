// js/hub-pdf/panel-view.js
// The "PDFs" panel markup, kept apart from the DOM plumbing so it can be read
// and tested on its own. The panel shows the hub's own scope choices, the two
// settings that matter (detail and theme) and the two downloads — nothing about
// paper, orientation, printing or source notes exists here.

import { escapeHtml } from './document.js';

export const PANEL_SETTINGS = Object.freeze({ detail: 'summary', theme: 'dark' });

// The filename reads best scope-first: seasons, then troop, then access.
// Field name -> the word a reader expects in a file name.
const SLUG_LABELS = Object.freeze({ troop: 'troops' });

const SLUG_FIELDS = Object.freeze([
  'seasons',
  'troop',
  'access',
  'season',
  'dataset',
  'sector',
  'class',
  'family',
]);

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
    return `<fieldset class="hub-pdf-field hub-pdf-fieldset" data-field="${field.name}"><legend>${escapeHtml(field.label)}${bulk}</legend><div class="hub-pdf-chips">${field.options
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

/** Detail, theme and the two downloads: nothing else belongs in the settings. */
function renderSettings(state) {
  const { hub, settings, copy } = state;
  const select = (name, label, options) =>
    `<label class="hub-pdf-field" for="${fieldId(hub, name)}"><span>${escapeHtml(label)}</span><select id="${fieldId(hub, name)}" name="${name}" data-setting="${name}">${optionsHtml(options, settings[name])}</select></label>`;
  return `<div class="hub-pdf-grid hub-pdf-settings">${select('detail', copy.detail, [
    { value: 'summary', label: copy.detailSummary },
    { value: 'full', label: copy.detailFull },
  ])}${select('theme', copy.theme, [
    { value: 'dark', label: copy.themeDark },
    { value: 'light', label: copy.themeLight },
  ])}</div>`;
}

function renderQuick(state) {
  const { def, copy } = state;
  const items = (def.quick || [])
    .map(
      ([file, label]) =>
        `<li><a href="downloads/${escapeHtml(file)}" download>${escapeHtml(label)}</a></li>`
    )
    .join('');
  if (!items) return '';
  return `<aside class="hub-pdf-quick" aria-labelledby="${fieldId(state.hub, 'quick')}"><h3 id="${fieldId(state.hub, 'quick')}">${escapeHtml(copy.quickTitle)}</h3><ul>${items}</ul><a href="downloads.html">${escapeHtml(copy.quickAll)} →</a></aside>`;
}

/** The panel markup, with the hub's scope form above the settings. */
export function renderPanelHtml(state) {
  const { copy, def, hub } = state;
  const fields = def.form(copy, state.choices, state.ctx);
  return `<div class="hub-pdf-head"><h2>${escapeHtml(copy.panelTitle)}</h2></div><form class="hub-pdf-form" data-hub="${escapeHtml(hub)}"><div class="hub-pdf-scope">${fields
    .map((field) => renderField(field, state))
    .join(
      ''
    )}</div>${renderSettings(state)}<div class="hub-pdf-actions"><button type="button" class="hub-pdf-btn hub-pdf-btn--primary" data-download="pdf">${escapeHtml(copy.downloadPdf)}</button><button type="button" class="hub-pdf-btn" data-download="png">${escapeHtml(copy.downloadImage)}</button></div><p class="hub-pdf-status" role="status" aria-live="polite"></p></form>${renderQuick(state)}`;
}

function slugPart(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'all'
  );
}

/** roc-<hub>-<scope>-<theme>.<ext>, with the scope taken from the choices. */
export function sheetFileName(state, format) {
  const { hub, choices, settings, fields } = state;
  const parts = [];
  for (const name of SLUG_FIELDS) {
    const field = (fields || []).find((entry) => entry.name === name);
    if (!field) continue;
    const value = choices[name];
    if (field.type === 'checks') {
      if (!Array.isArray(value) || !value.length) continue;
      const options = (field.options || []).filter((option) => !option.disabled);
      parts.push(value.length >= options.length ? `all-${name}` : value.join('-'));
    } else if (field.type === 'select') {
      const text = String(value ?? '');
      if (!text || /^\d+$/.test(text)) continue;
      // "All troops" reads better than a bare "all" in a filename.
      parts.push(text === 'all' ? `all-${SLUG_LABELS[name] || name}` : text);
    }
    // Two scope words are enough: the sheet title carries the same pair.
    if (parts.length >= 2) break;
  }
  const slug = (parts.length ? parts : ['all']).map(slugPart).join('-');
  return `roc-${hub}-${slug}-${settings.theme}.${format}`;
}
