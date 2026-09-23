// Print-focused HTML layout for the community PDF exports.
//
// Everything here renders to vector text in Chromium, so the same markup that
// looks right on screen produces selectable, searchable PDF content. Charts are
// CSS-width bars rather than canvas: no dependency, crisp at any zoom, and they
// inherit the table's text metrics.

const ACCENT = '#4f46e5';
const ACCENT_SOFT = '#eef2ff';
const INK = '#0f172a';
const MUTED = '#64748b';
const RULE = '#dbe2ea';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return escapeHtml(value);
  return numeric.toLocaleString('en-US');
}

export function formatDuration(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return '—';
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes && !days) parts.push(`${minutes}m`);
  return parts.length ? parts.join(' ') : `${total}s`;
}

function styles() {
  return `
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, 'DejaVu Sans', sans-serif;
  font-size: 9.5pt;
  line-height: 1.5;
  color: ${INK};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.brandbar { height: 3pt; background: ${ACCENT}; margin: 0 0 2.5mm; }
.brandline {
  font-size: 7.5pt; color: ${MUTED}; margin: 0 0 4mm; letter-spacing: .01em;
}
.brandline b { color: #3730a3; font-weight: 700; }
.brandurl { color: ${MUTED}; }
.eyebrow {
  font-size: 7.5pt; font-weight: 600; letter-spacing: .09em; text-transform: uppercase;
  color: ${ACCENT}; margin: 0 0 1.5mm;
}
h1 { font-size: 19pt; line-height: 1.15; margin: 0 0 2mm; letter-spacing: -.3pt; }
.subtitle { font-size: 9.5pt; color: #475569; margin: 0 0 4mm; max-width: 165mm; }
.meta { display: flex; flex-wrap: wrap; gap: 0 5mm; font-size: 8pt; color: ${MUTED}; margin: 0 0 6mm; }
.meta span { white-space: nowrap; }
.meta b { color: #334155; font-weight: 600; }

h2 {
  font-size: 11pt; margin: 7mm 0 2.5mm; padding-bottom: 1.2mm;
  border-bottom: .75pt solid ${RULE}; letter-spacing: -.1pt;
  break-after: avoid;
}
h3 { font-size: 9.5pt; margin: 4mm 0 1.5mm; color: #1e293b; break-after: avoid; }
p { margin: 0 0 2.5mm; }
section { break-inside: auto; }

table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 0 0 3mm; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th, td { padding: 1.5mm 2mm; border-bottom: .4pt solid ${RULE}; text-align: right; }
th {
  background: ${ACCENT_SOFT}; color: #3730a3; font-size: 7.5pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: .045em; border-bottom: .6pt solid #c7d2fe;
}
th:first-child, td:first-child { text-align: left; }
td.num, th.num { font-variant-numeric: tabular-nums; }
tbody tr:nth-child(even) { background: #f8fafc; }
tbody td:first-child { font-weight: 600; }
tfoot td {
  font-weight: 700; background: #f1f5f9; border-top: .9pt solid #94a3b8; border-bottom: none;
}
td.muted, .muted { color: ${MUTED}; font-weight: 400; }
td.gap { color: #b45309; font-style: italic; font-weight: 400; }
.subgroup td { background: #eef2ff; font-weight: 700; color: #3730a3; }

.kpis { display: flex; flex-wrap: wrap; gap: 3mm; margin: 0 0 5mm; }
.kpi {
  flex: 1 1 30mm; border: .5pt solid ${RULE}; border-left: 2.5pt solid ${ACCENT};
  border-radius: 2pt; padding: 2.5mm 3mm; background: #fff;
}
.kpi-label { font-size: 7pt; text-transform: uppercase; letter-spacing: .06em; color: ${MUTED}; }
.kpi-value {
  font-size: 14pt; font-weight: 700; letter-spacing: -.4pt;
  font-variant-numeric: tabular-nums; color: #1e1b4b;
}
.kpi-hint { font-size: 7pt; color: ${MUTED}; }

.bars { margin: 0 0 4mm; }
.bar-row { display: flex; align-items: center; gap: 3mm; margin: 0 0 1.4mm; break-inside: avoid; }
.bar-label { width: 34mm; font-size: 8pt; font-weight: 600; text-align: right; flex: none; }
.bar-track { flex: 1 1 auto; background: #f1f5f9; height: 4.6mm; border-radius: 1pt; }
.bar-fill { height: 100%; border-radius: 1pt; background: ${ACCENT}; }
.bar-value {
  width: 24mm; font-size: 8pt; font-variant-numeric: tabular-nums; flex: none; color: #334155;
}

.callout {
  border: .5pt solid #fcd34d; background: #fffbeb; border-radius: 2pt;
  padding: 2.5mm 3mm; margin: 0 0 3mm; font-size: 8.5pt; break-inside: avoid;
}
.callout.info { border-color: #bfdbfe; background: #eff6ff; }
.callout strong { display: block; margin-bottom: .8mm; }
.note { font-size: 7.5pt; color: ${MUTED}; margin: 1.5mm 0 4mm; }
.sources { margin-top: 7mm; padding-top: 2.5mm; border-top: .5pt solid ${RULE}; }
.sources h2 { margin-top: 0; border: none; padding-bottom: 0; }
.sources ul { margin: 0; padding-left: 4mm; font-size: 8pt; color: #475569; }
.sources li { margin-bottom: .8mm; }
.pagebreak { break-before: page; }
.avoid { break-inside: avoid; }
`;
}

export function kpis(items) {
  if (!items.length) return '';
  const cards = items
    .map(
      (item) => `<div class="kpi">
      <div class="kpi-label">${escapeHtml(item.label)}</div>
      <div class="kpi-value">${item.raw ? item.value : formatNumber(item.value)}</div>
      ${item.hint ? `<div class="kpi-hint">${escapeHtml(item.hint)}</div>` : ''}
    </div>`
    )
    .join('');
  return `<div class="kpis">${cards}</div>`;
}

// columns: [{ label, align?, render? }]
// rows: array of arrays (raw values) or objects for custom render
export function table({ columns, rows, footer, caption }) {
  const head = columns
    .map((c) => `<th class="${c.align === 'left' ? '' : 'num'}">${escapeHtml(c.label)}</th>`)
    .join('');
  const body = rows
    .map((row) => {
      if (row && row.__subgroup) {
        return `<tr class="subgroup"><td colspan="${columns.length}">${escapeHtml(
          row.__subgroup
        )}</td></tr>`;
      }
      const cells = columns
        .map((column, index) => {
          const value = Array.isArray(row) ? row[index] : row[column.key];
          if (column.render) {
            return `<td class="${column.className || 'num'}">${column.render(value, row)}</td>`;
          }
          const isNumeric = column.align !== 'left' && typeof value === 'number';
          return `<td class="${isNumeric ? 'num' : column.align === 'left' ? '' : ''}">${
            value === null || value === undefined
              ? '<span class="gap">not supplied</span>'
              : escapeHtml(isNumeric ? formatNumber(value) : value)
          }</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  const footerRow = footer
    ? `<tfoot><tr>${footer
        .map(
          (cell, index) =>
            `<td class="${index === 0 ? '' : 'num'}">${
              cell === null || cell === undefined
                ? '<span class="gap">not supplied</span>'
                : escapeHtml(typeof cell === 'number' ? formatNumber(cell) : cell)
            }</td>`
        )
        .join('')}</tr></tfoot>`
    : '';
  const captionHtml = caption ? `<div class="note">${escapeHtml(caption)}</div>` : '';
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${footerRow}</table>${captionHtml}`;
}

// Simple horizontal bar chart. `items`: [{ label, value, display? }]
export function bars({ items, formatter = formatNumber, color = ACCENT }) {
  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);
  const rows = items
    .map((item) => {
      const value = Number(item.value) || 0;
      const width = Math.max((value / max) * 100, value > 0 ? 1 : 0);
      const display = item.display ?? formatter(value);
      return `<div class="bar-row">
      <div class="bar-label">${escapeHtml(item.label)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${width.toFixed(
        2
      )}%;background:${color}"></div></div>
      <div class="bar-value">${escapeHtml(display)}</div>
    </div>`;
    })
    .join('');
  return `<div class="bars">${rows}</div>`;
}

export function callout({ title, body, tone = 'warn' }) {
  return `<div class="callout ${tone === 'info' ? 'info' : ''}">
    <strong>${escapeHtml(title)}</strong>${escapeHtml(body)}
  </div>`;
}

export function section(title, inner) {
  return `<section><h2>${escapeHtml(title)}</h2>${inner}</section>`;
}

// Assembles the full document. `sections` is an array of HTML strings.
export function renderDocument({ branding, eyebrow, title, subtitle, meta = [], sections }) {
  const metaHtml = meta.length
    ? `<div class="meta">${meta
        .map((entry) => `<span>${escapeHtml(entry.label)} <b>${escapeHtml(entry.value)}</b></span>`)
        .join('')}</div>`
    : '';
  const generatedDate = branding.generatedAt.slice(0, 10);
  const revision = branding.datasetRevision ? branding.datasetRevision : 'unversioned';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${styles()}</style></head>
<body>
<div class="brandbar"></div>
<div class="brandline"><b>${escapeHtml(branding.displayName)}</b> v${escapeHtml(
    branding.appVersion
  )} <span class="brandurl">${escapeHtml(branding.siteUrl)}</span></div>
${eyebrow ? `<div class="eyebrow">${escapeHtml(eyebrow)}</div>` : ''}
<h1>${escapeHtml(title)}</h1>
${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
${metaHtml}
${sections.join('\n')}
<div class="sources">
  <h2>About this data</h2>
  <ul>
    <li>Generated ${escapeHtml(generatedDate)} from the ${escapeHtml(
      branding.siteName
    )} dataset (revision ${escapeHtml(revision)}${
      branding.verificationStatus ? `, ${escapeHtml(branding.verificationStatus)}` : ''
    }).</li>
    <li>Sources: ${escapeHtml(branding.sourceCredits.join(', '))}.</li>
    <li>Community data may change with game updates. Verify against the live game before committing resources.</li>
  </ul>
</div>
</body></html>`;
}

export const PALETTE = Object.freeze({
  accent: ACCENT,
  accentSoft: ACCENT_SOFT,
  ink: INK,
  muted: MUTED,
  rule: RULE,
});
