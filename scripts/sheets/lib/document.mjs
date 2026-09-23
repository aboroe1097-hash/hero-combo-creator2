// The A4 sheet document: one HTML page block per printed page (plan §2, §3).
//
// Each sheet page is a fixed-size block (210x297mm portrait, 297x210mm landscape)
// with its own header, body and footer. Because the block IS the page, the PDF and
// the 300 DPI PNG come from the same layout: the PDF pages the blocks at the CSS
// page size, and the PNG is a screenshot of one block with no reflow. That also
// makes page counts, bounds and overflow measurable before anything is published.

import { escapeHtml } from '../../pdf/lib/layout.mjs';
import { escapeAttribute, FONT_BODY, FONT_DISPLAY, FONT_MONO, icon, TOKENS } from './theme.mjs';

export const PAGE_SIZES = Object.freeze({
  portrait: Object.freeze({ widthMm: 210, heightMm: 297, widthPx: 794, heightPx: 1123 }),
  landscape: Object.freeze({ widthMm: 297, heightMm: 210, widthPx: 1123, heightPx: 794 }),
});

// Header artwork may occupy at most 20% of the page (plan §2). Portrait keeps a
// little margin under the cap so the title block still has room.
export const ART_BUDGET = Object.freeze({
  // The cap is 20% of the page; the default reservation is deliberately smaller so a
  // dense reference page keeps its content room. A sheet may reserve more (never
  // past the cap) with `artHeightMm`.
  portrait: { maxMm: 59.4, usedMm: 40 },
  landscape: { maxMm: 42, usedMm: 32 },
});

export function artBudgetMm(orientation) {
  return ART_BUDGET[orientation === 'landscape' ? 'landscape' : 'portrait'].usedMm;
}

/** The art band a sheet reserves, never more than its orientation's cap. */
export function artHeightMm(orientation, requested) {
  const budget = ART_BUDGET[orientation === 'landscape' ? 'landscape' : 'portrait'];
  if (!requested) return budget.usedMm;
  return Math.min(Math.max(Number(requested) || budget.usedMm, 12), budget.maxMm);
}

// 300 DPI: A4 is 2480x3508 at 300 DPI, reversed for landscape.
export const PNG_DPI = 300;
export const PNG_SCALE = PNG_DPI / 96;
export function pngSize(orientation) {
  const size = PAGE_SIZES[orientation === 'landscape' ? 'landscape' : 'portrait'];
  return {
    width: Math.round((size.widthMm / 25.4) * PNG_DPI),
    height: Math.round((size.heightMm / 25.4) * PNG_DPI),
  };
}

export function thumbnailSize(orientation) {
  const size = PAGE_SIZES[orientation === 'landscape' ? 'landscape' : 'portrait'];
  return {
    width: Math.round((size.widthMm / 25.4) * 72),
    height: Math.round((size.heightMm / 25.4) * 72),
  };
}

function styles() {
  const t = TOKENS;
  return `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: ${t.bg}; }
body {
  font-family: ${FONT_BODY};
  font-size: 10pt;
  line-height: 1.45;
  color: ${t.ink};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── Page frame ───────────────────────────────────────────────────────────── */
.sh-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 210mm;
  height: 297mm;
  padding: 0;
  overflow: hidden;
  background:
    radial-gradient(120% 60% at 50% -8%, rgba(53, 214, 196, 0.10), transparent 60%),
    radial-gradient(90% 45% at 100% 0%, rgba(169, 139, 250, 0.10), transparent 55%),
    linear-gradient(180deg, ${t.bgLift} 0%, ${t.bg} 42%, #060d18 100%);
  break-after: page;
}
.sh-page--landscape { width: 297mm; height: 210mm; }
.sh-page:last-child { break-after: auto; }
.sh-page__inner {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  padding: 11mm 12mm 8mm;
}
.sh-page__body { display: flex; flex: 1 1 auto; flex-direction: column; gap: 3mm; min-height: 0; }

/* ── Header ───────────────────────────────────────────────────────────────── */
.sh-head { display: flex; flex-direction: column; gap: 3mm; margin-bottom: 4mm; }
.sh-head__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 6mm; }
.sh-head__brand {
  display: flex; align-items: center; gap: 2.4mm;
  font-size: 8.5pt; letter-spacing: .06em; text-transform: uppercase; color: ${t.muted};
}
.sh-head__brand b { color: ${t.inkSoft}; font-weight: 700; letter-spacing: .04em; }
.sh-head__mark {
  display: grid; place-items: center; width: 9mm; height: 9mm; border-radius: 2.2mm;
  border: .5pt solid ${t.border}; background: ${t.panelSoft}; color: ${t.gold};
}
.sh-head__tool {
  font-size: 8.5pt; color: ${t.muted}; text-align: right; max-width: 70mm;
}
.sh-head__tool a { color: ${t.teal}; text-decoration: none; }
.sh-title-block { display: flex; flex-direction: column; gap: 1.4mm; }
.sh-eyebrow {
  font-size: 9pt; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
  color: ${t.teal};
}
.sh-title {
  font-family: ${FONT_DISPLAY};
  font-size: 30pt; line-height: 1.02; font-weight: 800; font-stretch: 88%;
  letter-spacing: .012em; text-transform: uppercase; color: #fff; margin: 0;
}
.sh-page--landscape .sh-title { font-size: 25pt; }
.sh-subtitle { font-size: 10.5pt; color: ${t.inkSoft}; margin: 0; max-width: 165mm; }
.sh-meta { display: flex; flex-wrap: wrap; gap: 0 5mm; margin: 0; font-size: 9pt; color: ${t.muted}; }
.sh-meta b { color: ${t.inkSoft}; font-weight: 600; }
.sh-head__art {
  position: relative; overflow: hidden; border-radius: 4mm;
  border: .5pt solid ${t.border};
  background:
    radial-gradient(120% 140% at 50% 0%, rgba(242, 178, 60, 0.16), transparent 62%),
    linear-gradient(180deg, #132340 0%, #0c1729 100%);
  margin-bottom: 4mm;
}
.sh-head__art svg { display: block; width: 100%; height: 100%; }

/* ── Footer ───────────────────────────────────────────────────────────────── */
.sh-foot {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 5mm;
  margin-top: 4mm; padding-top: 2.4mm; border-top: .5pt solid ${t.border};
  font-size: 8pt; color: ${t.muted};
}
.sh-foot__cell { display: flex; flex-direction: column; gap: .4mm; min-width: 0; }
.sh-foot__cell--end { text-align: right; align-items: flex-end; }
.sh-foot span { overflow-wrap: anywhere; }
.sh-foot b { color: ${t.inkSoft}; font-weight: 600; }
.sh-foot a { color: ${t.teal}; text-decoration: none; }
.sh-foot__page { font-family: ${FONT_MONO}; color: ${t.inkSoft}; white-space: nowrap; }

/* ── Cards, pills, totals ─────────────────────────────────────────────────── */
.sh-card {
  position: relative;
  padding: 4mm 4.5mm 4mm 5.5mm;
  border: .5pt solid ${t.border};
  border-left: 1.6mm solid ${t.gold};
  border-radius: 3mm;
  background: linear-gradient(180deg, rgba(21, 37, 66, 0.92), rgba(12, 22, 40, 0.92));
  break-inside: avoid;
}
.sh-card--teal { border-left-color: ${t.teal}; }
.sh-card--purple { border-left-color: ${t.purple}; }
.sh-card--danger { border-left-color: ${t.danger}; }
.sh-card--neutral { border-left-color: ${t.borderStrong}; }
.sh-card__head { display: flex; align-items: center; gap: 3mm; flex-wrap: wrap; }
.sh-card__title {
  font-family: ${FONT_DISPLAY}; font-weight: 700; font-stretch: 90%;
  font-size: 13pt; letter-spacing: .01em; color: #fff;
}
.sh-card__right { margin-left: auto; }
.sh-card__sub { margin: 1.6mm 0 0; font-size: 8.5pt; color: ${t.muted}; }
.sh-card__note { margin: 2mm 0 0; font-size: 8.5pt; color: ${t.muted}; }
.sh-pill {
  display: inline-flex; align-items: center;
  padding: .7mm 2.6mm; border-radius: 99mm;
  font-family: ${FONT_DISPLAY}; font-weight: 700; font-stretch: 88%;
  font-size: 9pt; letter-spacing: .1em; text-transform: uppercase;
  background: ${t.gold}; color: #241a04;
}
.sh-pill--teal { background: ${t.teal}; color: #04241f; }
.sh-pill--purple { background: ${t.purple}; color: #1c1039; }
.sh-pill--danger { background: ${t.danger}; color: #2a1204; }
.sh-pill--neutral { background: rgba(146, 178, 220, 0.22); color: ${t.ink}; }

.sh-total { display: flex; align-items: center; gap: 2mm; color: ${t.gold}; }
.sh-total--teal { color: ${t.teal}; }
.sh-total--purple { color: ${t.purple}; }
.sh-total--neutral { color: ${t.ink}; }
.sh-total__icon { flex: none; }
.sh-total__value {
  font-family: ${FONT_DISPLAY}; font-weight: 800; font-stretch: 88%;
  font-size: 17pt; line-height: 1; color: inherit;
}
.sh-total__unit { font-size: 9.5pt; color: ${t.inkSoft}; }
.sh-total__caption { font-size: 8pt; color: ${t.muted}; }

/* ── Icon tiles ───────────────────────────────────────────────────────────── */
.sh-tiles { display: flex; flex-wrap: wrap; gap: 2mm; margin-top: 2.6mm; }
.sh-tile {
  display: grid; justify-items: center; align-content: center; gap: .6mm;
  min-width: 13.5mm; padding: 1.6mm 1.4mm 1.4mm;
  border: .5pt solid ${t.border}; border-radius: 2.2mm;
  background: rgba(8, 17, 32, 0.72);
  color: ${t.gold};
}
.sh-tiles--teal .sh-tile { color: ${t.teal}; }
.sh-tiles--purple .sh-tile { color: ${t.purple}; }
.sh-tile.is-unknown { color: ${t.muted}; border-style: dashed; }
.sh-tile__value {
  font-family: ${FONT_DISPLAY}; font-weight: 700; font-size: 10pt; color: #fff;
}
.sh-tile__label { font-size: 8pt; color: ${t.muted}; text-align: center; }

/* ── Stats ────────────────────────────────────────────────────────────────── */
.sh-stats { display: grid; gap: 2mm; }
.sh-stats--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.sh-stats--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.sh-stats--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.sh-stat {
  display: flex; flex-direction: column; gap: .4mm; min-width: 0;
  padding: 2.2mm 2.6mm; border: .5pt solid ${t.border}; border-radius: 2.4mm;
  background: rgba(8, 17, 32, 0.6);
}
.sh-stat__label { font-size: 8.5pt; color: ${t.muted}; text-transform: uppercase; letter-spacing: .07em; }
.sh-stat__value { font-family: ${FONT_DISPLAY}; font-weight: 700; font-size: 15pt; color: #fff; }
.sh-stat__value.is-unknown { font-size: 11pt; color: ${t.muted}; }
.sh-stat__hint { font-size: 8pt; color: ${t.muted}; }

/* ── Summary card ─────────────────────────────────────────────────────────── */
.sh-summary {
  display: flex; flex-direction: column; align-items: center; gap: 1.4mm;
  padding: 5mm 5mm 4.5mm; text-align: center;
  border: .5pt solid rgba(242, 178, 60, 0.42); border-radius: 3.4mm;
  background:
    radial-gradient(90% 130% at 50% 0%, rgba(242, 178, 60, 0.14), transparent 70%),
    linear-gradient(180deg, rgba(21, 37, 66, 0.9), rgba(10, 19, 34, 0.9));
  break-inside: avoid;
}
.sh-summary--teal { border-color: rgba(53, 214, 196, 0.42); }
.sh-summary--purple { border-color: rgba(169, 139, 250, 0.42); }
.sh-summary__eyebrow {
  font-size: 9pt; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: ${t.muted};
}
.sh-summary__figure { display: flex; align-items: baseline; gap: 2.4mm; }
.sh-summary__value {
  font-family: ${FONT_DISPLAY}; font-weight: 800; font-stretch: 86%;
  font-size: 40pt; line-height: 1; color: ${t.gold};
}
.sh-summary--teal .sh-summary__value { color: ${t.teal}; }
.sh-summary--purple .sh-summary__value { color: ${t.purple}; }
.sh-summary__unit {
  font-family: ${FONT_DISPLAY}; font-weight: 800; font-size: 20pt; letter-spacing: .08em;
  text-transform: uppercase; color: #fff;
}
.sh-summary__caption { font-size: 9pt; color: ${t.muted}; }
.sh-summary__parts { font-size: 10pt; color: ${t.inkSoft}; }

/* ── Tables ───────────────────────────────────────────────────────────────── */
.sh-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
.sh-table.is-compact { font-size: 9pt; }
.sh-table thead { display: table-header-group; }
.sh-table th {
  padding: 2mm 2.4mm; text-align: right; font-size: 8.5pt; font-weight: 700;
  text-transform: uppercase; letter-spacing: .09em; color: ${t.muted};
  border-bottom: .6pt solid ${t.borderStrong};
}
.sh-table td { padding: 1.9mm 2.4mm; text-align: right; border-bottom: .4pt solid ${t.border}; }
.sh-table th.is-left, .sh-table td.is-left { text-align: left; }
.sh-table tbody tr:nth-child(even) { background: rgba(146, 178, 220, 0.045); }
.sh-table td:first-child { color: ${t.ink}; }
.sh-table td.is-unknown { color: ${t.muted}; font-style: italic; }
.sh-table .sh-t--gold { color: ${t.gold}; font-weight: 700; }
.sh-table .sh-t--teal { color: ${t.teal}; font-weight: 700; }
.sh-table .sh-table .sh-t--purple, .sh-table .sh-t--purple { color: ${t.purple}; font-weight: 700; }
.sh-table tfoot td {
  border-top: .8pt solid ${t.borderStrong}; border-bottom: none;
  font-family: ${FONT_DISPLAY}; font-weight: 700; font-stretch: 92%; color: #fff;
}
.sh-table tr.sh-row--group td {
  text-align: left; text-transform: uppercase; letter-spacing: .1em; font-size: 8.5pt;
  color: ${t.teal}; background: ${t.tealSoft}; font-weight: 700;
}
.sh-note { margin: 1mm 0 0; font-size: 8.5pt; color: ${t.muted}; }

/* ── Section titles, lists, callouts ──────────────────────────────────────── */
.sh-section-title { display: flex; align-items: baseline; justify-content: space-between; gap: 4mm; margin: 1mm 0 -1mm; }
.sh-section-title h2 {
  margin: 0; font-family: ${FONT_DISPLAY}; font-weight: 700; font-stretch: 90%;
  font-size: 14pt; letter-spacing: .08em; text-transform: uppercase; color: ${t.ink};
}
.sh-section-title span { font-size: 8.5pt; color: ${t.muted}; }
.sh-list { margin: 0; padding-left: 5mm; font-size: 10pt; color: ${t.inkSoft}; }
.sh-list li { margin-bottom: 1mm; }
.sh-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1.8mm; }
.sh-steps li { display: flex; gap: 2.6mm; align-items: flex-start; font-size: 10pt; color: ${t.inkSoft}; }
.sh-steps li strong { color: ${t.ink}; display: block; font-weight: 700; }
.sh-steps__index {
  flex: none; display: grid; place-items: center; width: 6mm; height: 6mm; border-radius: 50%;
  background: ${t.goldSoft}; color: ${t.gold}; font-family: ${FONT_DISPLAY}; font-weight: 700;
  font-size: 9pt; border: .5pt solid rgba(242, 178, 60, 0.4);
}
.sh-callout {
  display: flex; gap: 2.6mm; align-items: flex-start;
  padding: 3mm 3.4mm; border-radius: 2.6mm;
  border: .5pt solid rgba(53, 214, 196, 0.36); background: ${t.tealSoft};
  font-size: 10pt; color: ${t.inkSoft}; break-inside: avoid;
}
.sh-callout--danger { border-color: rgba(251, 146, 60, 0.4); background: ${t.dangerSoft}; }
.sh-callout--gold { border-color: rgba(242, 178, 60, 0.4); background: ${t.goldSoft}; }
.sh-callout__icon { flex: none; color: ${t.teal}; }
.sh-callout--danger .sh-callout__icon { color: ${t.danger}; }
.sh-callout--gold .sh-callout__icon { color: ${t.gold}; }
.sh-callout strong { display: block; color: ${t.ink}; }

/* ── Bars, split, legend, map ─────────────────────────────────────────────── */
.sh-bars { display: flex; flex-direction: column; gap: 1.6mm; }
.sh-bar { display: flex; align-items: center; gap: 2.6mm; }
.sh-bar__label { width: 46mm; flex: none; font-size: 10pt; color: ${t.inkSoft}; text-align: right; }
.sh-bar__track {
  flex: 1 1 auto; height: 4.6mm; border-radius: 99mm;
  background: rgba(146, 178, 220, 0.12); overflow: hidden;
}
.sh-bar__fill { display: block; height: 100%; border-radius: 99mm; background: ${t.gold}; }
.sh-bars--teal .sh-bar__fill { background: ${t.teal}; }
.sh-bars--purple .sh-bar__fill { background: ${t.purple}; }
.sh-bar__value {
  width: 30mm; flex: none; font-family: ${FONT_DISPLAY}; font-weight: 700; font-size: 10.5pt; color: #fff;
}
.sh-bar.is-unknown .sh-bar__value { color: ${t.muted}; font-style: italic; }
.sh-split { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4mm; }
.sh-split__side { display: flex; flex-direction: column; gap: 2.4mm; min-width: 0; }
.sh-split__label {
  font-size: 8.5pt; letter-spacing: .1em; text-transform: uppercase; color: ${t.muted};
}
.sh-legend { list-style: none; margin: 2.6mm 0 0; padding: 0; display: flex; flex-direction: column; gap: 1.6mm; }
.sh-legend li { display: flex; align-items: center; gap: 2.6mm; font-size: 10pt; color: ${t.inkSoft}; }
.sh-legend__swatch {
  flex: none; display: grid; place-items: center; width: 7mm; height: 7mm; border-radius: 2mm;
  border: .5pt solid ${t.borderStrong}; background: rgba(146, 178, 220, 0.12);
  font-family: ${FONT_DISPLAY}; font-weight: 700; font-size: 9pt; color: ${t.ink};
}
.sh-legend__swatch--gold { background: ${t.goldSoft}; border-color: rgba(242, 178, 60, 0.5); color: ${t.gold}; }
.sh-legend__swatch--teal { background: ${t.tealSoft}; border-color: rgba(53, 214, 196, 0.5); color: ${t.teal}; }
.sh-legend__swatch--purple { background: ${t.purpleSoft}; border-color: rgba(169, 139, 250, 0.5); color: ${t.purple}; }
.sh-legend__swatch--danger { background: ${t.dangerSoft}; border-color: rgba(251, 146, 60, 0.5); color: ${t.danger}; }
.sh-legend__label { font-weight: 700; color: ${t.ink}; min-width: 34mm; }
.sh-legend__text { color: ${t.muted}; font-size: 9.5pt; }
.sh-map { display: flex; flex-direction: column; }
.sh-map__canvas {
  border: .5pt solid ${t.border}; border-radius: 3mm; overflow: hidden;
  background: linear-gradient(180deg, #0b1729, #070f1c);
}
.sh-map__canvas svg { display: block; width: 100%; height: auto; }
.sh-map__caption { margin: 2mm 0 0; font-size: 8.5pt; color: ${t.muted}; }

/* ── Grids used by the catalogue and progression templates ────────────────── */
.sh-grid { display: grid; gap: 2.6mm; }
.sh-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.sh-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.sh-grid--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.sh-grid--2x4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.sh-icon { flex: none; }
.sh-page--dense .sh-card { padding: 2.6mm 3.2mm 2.6mm 4mm; }

/* Dense cards. A 2x4 grid of eight column cards has to fit one A4 page, so the
   in-card table loses padding rather than font size: the body text stays 10pt and
   each research row stays on one line. */
.sh-card .sh-table { margin-bottom: 0; }
.sh-card .sh-table th,
.sh-card .sh-table td { padding: .9mm 2mm; line-height: 1.25; }
.sh-card .sh-table th { font-size: 8pt; }
.sh-card .sh-table td.is-left { white-space: nowrap; }
/* An inline icon sets the row's line box, so it is sized to sit inside the text
   line instead of pushing every research row taller. */
.sh-card .sh-table .sh-icon { width: 3.6mm; height: 3.6mm; vertical-align: -0.5mm; }
.sh-card .sh-card__title { font-size: 9.5pt; white-space: nowrap; }
.sh-card .sh-total { gap: 1.6mm; }
.sh-card .sh-total__value { font-size: 12.5pt; }
.sh-card .sh-total__unit { font-size: 8.5pt; }
.sh-card .sh-total__caption { font-size: 7.5pt; }
.sh-card__head { gap: 2.4mm; }

/* Light print fallback: a reader who prints on paper gets the same structure on
   white, because the midnight surface would otherwise flood the page in ink. */
@media print {
  .sh-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
}

export function renderIcon(name, options) {
  return icon(name, options);
}

/**
 * One printed page.
 *
 * `art` is optional inline SVG for the focal illustration and is capped at the
 * orientation's art budget by the caller (`artBudgetMm`). `body` is the page's
 * content; the template decides what goes on which page.
 */
export function sheetPage({
  orientation = 'portrait',
  branding,
  sheet,
  pageIndex,
  pageCount,
  header,
  body,
  dense = false,
}) {
  const art = header.art
    ? `<div class="sh-head__art" data-art="1" style="height:${artHeightMm(
        orientation,
        sheet.artHeightMm
      )}mm">${header.art}</div>`
    : '';
  const meta = (header.meta || []).length
    ? `<p class="sh-meta">${header.meta
        .map((entry) => `<span>${escapeHtml(entry.label)} <b>${escapeHtml(entry.value)}</b></span>`)
        .join('')}</p>`
    : '';
  const toolHref = sheet.toolUrl || branding.siteUrl;
  return `<section class="sh-page sh-page--${orientation}${dense ? ' sh-page--dense' : ''}"
    data-sheet-page="${pageIndex + 1}">
  <div class="sh-page__inner">
    <header class="sh-head">
      <div class="sh-head__top">
        <span class="sh-head__brand">
          <span class="sh-head__mark">${icon('artifact', { size: '5.4mm' })}</span>
          <span><b>${escapeHtml(branding.displayName)}</b> v${escapeHtml(branding.appVersion)}</span>
        </span>
        <span class="sh-head__tool">
          ${escapeHtml(sheet.toolLabel || '')} ·
          <a href="${escapeAttribute(toolHref)}">${escapeHtml(
            String(toolHref).replace(/^https?:\/\//, '')
          )}</a>
        </span>
      </div>
      <div class="sh-title-block">
        ${header.eyebrow ? `<span class="sh-eyebrow">${escapeHtml(header.eyebrow)}</span>` : ''}
        <h1 class="sh-title">${escapeHtml(header.title)}</h1>
        ${header.subtitle ? `<p class="sh-subtitle">${escapeHtml(header.subtitle)}</p>` : ''}
        ${meta}
      </div>
    </header>
    ${art}
    <div class="sh-page__body">${body}</div>
    <footer class="sh-foot">
      <span class="sh-foot__cell">
        <span><b>${escapeHtml(branding.displayName)}</b> · ${escapeHtml(
          String(branding.siteUrl).replace(/^https?:\/\//, '')
        )} · sheet language English</span>
        <span>Source: <b>${escapeHtml(sheet.sourceLabel || 'not stated')}</b>${
          sheet.sourceRevision ? ` · data revision <b>${escapeHtml(sheet.sourceRevision)}</b>` : ''
        }</span>
      </span>
      <span class="sh-foot__cell sh-foot__cell--end">
        <span>Tool: <a href="${escapeAttribute(toolHref)}">${escapeHtml(sheet.toolLabel || toolHref)}</a></span>
        <span class="sh-foot__page">Page ${pageIndex + 1} of ${pageCount}</span>
      </span>
    </footer>
  </div>
</section>`;
}

export function renderSheetDocument({ branding, sheet, pages }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(sheet.title)} — ${escapeHtml(branding.displayName)}</title>
<meta name="vts-sheet-id" content="${escapeAttribute(sheet.id)}">
<style>${styles()}</style></head>
<body>
${pages.join('\n')}
</body></html>`;
}

export function pageCss() {
  return styles();
}
