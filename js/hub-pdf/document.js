// js/hub-pdf/document.js
// The shared document model for the hub sheets. Each hub builder produces
// sections of blocks with this vocabulary; canvas-doc.js draws them as dense
// pages and pdf-writer.js wraps those pages into a PDF. There is no HTML
// document any more — the sheets are drawn, not printed — so nothing here
// knows about paper, orientation or a print dialog.

/** A table block: columns from textCol/numCol, rows of raw values (null = unknown). */
export function table(columns, rows, extra = {}) {
  return { type: 'table', columns, rows, ...extra };
}

export function textCol(label) {
  return { label, align: 'text' };
}

export function numCol(label) {
  return { label, align: 'num' };
}

export function paragraph(text) {
  return { type: 'paragraph', text };
}

export function note(text) {
  return { type: 'note', text };
}

export function list(items, ordered = false) {
  return { type: 'list', items, ordered };
}

/** Fill {tokens} in a copy string; an unknown token is left as it was. */
export function interpolate(template, values = {}) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key])
  );
}

/** A value the data has no record for. Null and undefined are the only unknowns. */
export function isUnknown(value) {
  return value === null || value === undefined;
}

/** Add up the values that are known; one unknown makes the total unknown. */
export function sumKnown(values) {
  let total = 0;
  for (const value of values) {
    if (isUnknown(value)) return null;
    total += Number(typeof value === 'object' ? value.value : value);
  }
  return total;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
