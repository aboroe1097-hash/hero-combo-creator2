// js/hub-pdf/document.js
// Pure document model -> print-ready HTML for the hub PDFs tabs.
//
// A document is plain data:
//   {
//     title, subtitle,
//     choices:  [{ label, value }]            // what the reader picked, shown in the title block
//     sections: [{ title, blocks, subsections: [{ title, blocks }] }]
//     sources:  [{ label, url?, note? }]      // only rendered when settings.sources is on
//   }
// Blocks are { type: 'table' | 'paragraph' | 'list' | 'note', ... }. A table cell
// that is null or undefined is UNKNOWN and prints the localized "Unknown" label;
// it is never coerced to 0. A number prints with the reader's locale grouping.
//
// The HTML is a real paginated document: @page size and margins, a title block,
// a numbered table of contents, numbered sections, tables whose header row repeats
// on every page, and page-margin boxes carrying the site name, URL and page numbers.

import { formatLocaleNumber } from '../locale-format.js';
import { HERO_DESIGNS, heroDesignStyles, heroSectionClass } from './hero-designs.js';
import { assetUrl, renderComboCards, thumbnailCell } from './hero-cards.js';

export const PAPER_SIZES = Object.freeze(['a4', 'letter']);
export const ORIENTATIONS = Object.freeze(['portrait', 'landscape']);
export const DETAIL_LEVELS = Object.freeze(['summary', 'full']);

export function normalizeSettings(raw = {}) {
  return Object.freeze({
    paper: PAPER_SIZES.includes(raw.paper) ? raw.paper : 'a4',
    orientation: ORIENTATIONS.includes(raw.orientation) ? raw.orientation : 'portrait',
    detail: DETAIL_LEVELS.includes(raw.detail) ? raw.detail : 'summary',
    sources: raw.sources !== false && raw.sources !== 'false',
    design: HERO_DESIGNS.includes(raw.design) ? raw.design : 'classic',
  });
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// CSS string literal for generated content (page footer). Quotes, backslashes and
// line breaks are escaped so a translated label can never break out of the rule.
function cssString(value) {
  return `"${String(value ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replace(/[\r\n]+/g, ' ')}"`;
}

export function isUnknown(value) {
  if (value && typeof value === 'object' && 'value' in value) return isUnknown(value.value);
  return (
    value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))
  );
}

/** Text for one cell. Unknown stays unknown; numbers are locale-grouped. */
export function formatCell(value, { language = 'en', unknown = 'Unknown' } = {}) {
  if (isUnknown(value)) return unknown;
  // { value, suffix } marks a figure that needs a qualifier, e.g. a partial total.
  if (typeof value === 'object' && 'value' in value) {
    return `${formatCell(value.value, { language, unknown })}${value.suffix || ''}`;
  }
  if (typeof value === 'number') {
    return formatLocaleNumber(value, language, { maximumFractionDigits: 2 });
  }
  if (typeof value === 'boolean') return value ? '✓' : '—';
  return String(value);
}

/** Sum that stays unknown when any addend is unknown. */
export function sumKnown(values) {
  let total = 0;
  for (const value of values) {
    if (isUnknown(value)) return null;
    total += Number(typeof value === 'object' ? value.value : value);
  }
  return total;
}

/** Section numbering: "1", "2", then "2.1", "2.2" for subsections. */
export function numberSections(sections = []) {
  return sections.map((section, index) => ({
    ...section,
    number: String(index + 1),
    subsections: (section.subsections || []).map((sub, subIndex) => ({
      ...sub,
      number: `${index + 1}.${subIndex + 1}`,
    })),
  }));
}

// A contents list longer than this keeps only the numbered sections, so a
// full-detail document does not open with pages of contents.
export const TOC_MAX_ENTRIES = 40;

/** Table-of-contents entries; empty when the document has a single section. */
export function tableOfContents(sections = []) {
  const numbered = numberSections(sections);
  if (numbered.length <= 1) return [];
  const full = numbered.flatMap((section) => [
    { number: section.number, title: section.title, level: 1 },
    ...section.subsections.map((sub) => ({ number: sub.number, title: sub.title, level: 2 })),
  ]);
  return full.length > TOC_MAX_ENTRIES ? full.filter((entry) => entry.level === 1) : full;
}

function renderTable(block, ctx) {
  if (ctx.heroDesign && block.presentation === 'hero-combos' && block.rows.length) {
    return renderComboCards(block, {
      escape: escapeHtml,
      cell: (value) => escapeHtml(formatCell(value, ctx)),
      assetBase: ctx.assetBase,
    });
  }
  const columns = block.columns || [];
  const rows = block.rows || [];
  // Designed sheets mark every value element, so the document tests can prove a
  // themed rendering carries the same cells, in the same order, as the plain one.
  const marker = ctx.heroDesign ? ' data-cell' : '';
  // The designed roster shows the hero portrait beside the data.
  const thumbs =
    ctx.heroDesign && block.presentation === 'hero-list' ? block.portraits || [] : null;
  const cls = (column) => (column.align === 'num' ? ' class="num"' : '');
  const head = `<thead><tr>${thumbs ? '<th scope="col" class="thumb-head"></th>' : ''}${columns
    .map((column) => `<th scope="col"${cls(column)}>${escapeHtml(column.label)}</th>`)
    .join('')}</tr></thead>`;
  const bodyRows = rows.length
    ? rows
        .map((row, rowIndex) => {
          if (row && !Array.isArray(row) && row.group) {
            return `<tr class="group"><th colspan="${columns.length + (thumbs ? 1 : 0)}" scope="rowgroup">${escapeHtml(row.group)}</th></tr>`;
          }
          const lead = thumbs
            ? thumbnailCell(
                thumbs[rowIndex],
                Array.isArray(row) ? row[0] : '',
                ctx.assetBase,
                escapeHtml
              )
            : '';
          return `<tr>${lead}${row
            .map((cell, index) => {
              const unknown = isUnknown(cell);
              const classes = [
                columns[index]?.align === 'num' ? 'num' : '',
                unknown ? 'unknown' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return `<td${marker}${classes ? ` class="${classes}"` : ''}>${escapeHtml(formatCell(cell, ctx))}</td>`;
            })
            .join('')}</tr>`;
        })
        .join('')
    : `<tr><td colspan="${columns.length || 1}" class="empty">${escapeHtml(ctx.copy.docNoRows)}</td></tr>`;
  const foot = block.footer
    ? `<tfoot><tr>${block.footer
        .map((cell, index) => {
          const unknown = isUnknown(cell);
          const classes = [columns[index]?.align === 'num' ? 'num' : '', unknown ? 'unknown' : '']
            .filter(Boolean)
            .join(' ');
          return `<td${marker}${classes ? ` class="${classes}"` : ''}>${escapeHtml(formatCell(cell, ctx))}</td>`;
        })
        .join('')}</tr></tfoot>`
    : '';
  const caption =
    block.caption && ctx.settings.sources
      ? `<p class="table-note">${escapeHtml(block.caption)}</p>`
      : '';
  const wide = columns.length >= 7 ? ' wide' : '';
  return `<table class="data${wide}${ctx.heroDesign && !rows.length ? ' no-rows' : ''}">${head}<tbody>${bodyRows}</tbody>${foot}</table>${caption}`;
}

function renderBlock(block, ctx) {
  if (!block) return '';
  if (block.type === 'table') return renderTable(block, ctx);
  if (block.type === 'paragraph') return `<p>${escapeHtml(block.text)}</p>`;
  if (block.type === 'note') {
    return ctx.settings.sources ? `<p class="note">${escapeHtml(block.text)}</p>` : '';
  }
  if (block.type === 'list') {
    const tag = block.ordered ? 'ol' : 'ul';
    return `<${tag}>${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`;
  }
  if (block.type === 'definitions') {
    return `<dl class="defs">${(block.items || [])
      .map(
        (item) =>
          `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(formatCell(item.value, ctx))}</dd></div>`
      )
      .join('')}</dl>`;
  }
  return '';
}

function renderBlocks(blocks, ctx) {
  return (blocks || []).map((block) => renderBlock(block, ctx)).join('');
}

function withoutEmptySubsections(section, emptyText) {
  if (!section.subsections?.length) return section;
  const subsections = section.subsections.filter((sub) =>
    (sub.blocks || []).some((block) => block.type !== 'table' || (block.rows || []).length)
  );
  if (subsections.length) return { ...section, subsections };
  return {
    ...section,
    subsections: [],
    blocks: [...(section.blocks || []), { type: 'note', text: emptyText }],
  };
}

export function documentStyles(settings, copy, branding) {
  const size = `${settings.paper === 'letter' ? 'letter' : 'A4'} ${settings.orientation}`;
  const footerLeft = cssString(
    `${branding.siteName} · ${branding.siteUrl.replace(/^https?:\/\//, '')}`
  );
  const pageWord = cssString(`${copy.docPage} `);
  const ofWord = cssString(` ${copy.docOf} `);
  return `
@page { size: ${size}; margin: 16mm 14mm 18mm;
  @bottom-left { content: ${footerLeft}; font-size: 7.5pt; font-family: Arial, 'Noto Sans', sans-serif; color: #555; }
  @bottom-right { content: ${pageWord} counter(page) ${ofWord} counter(pages); font-size: 7.5pt; font-family: Arial, 'Noto Sans', sans-serif; color: #555; }
}
:root {
  --sans: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Noto Sans Arabic', 'PingFang SC',
    'Microsoft YaHei', 'Noto Sans CJK SC', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  --serif: Georgia, Cambria, 'Times New Roman', 'Noto Serif', 'Noto Naskh Arabic', 'Songti SC',
    'SimSun', serif;
}
* { box-sizing: border-box; }
html { background: #fff; color: #111; }
body { margin: 0; font: 10pt/1.45 var(--serif); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
main { max-width: 190mm; margin: 0 auto; padding: 12mm 0 18mm; }
@media print { main { max-width: none; padding: 0; } .screen-only { display: none !important; } }
@media screen { body { background: #e9e9e9; } main { background: #fff; padding: 14mm 14mm 18mm; margin: 12px auto; box-shadow: 0 1px 4px rgba(0,0,0,.25); }
  .screen-only { position: sticky; top: 0; z-index: 2; display: flex; gap: 8px; align-items: center; justify-content: space-between;
    padding: 10px 14px; background: #1f2933; color: #fff; font: 13px/1.3 var(--sans); }
  .screen-only button { font: 600 14px/1 var(--sans); padding: 10px 14px; border: 0; border-radius: 6px; background: #fff; color: #111; cursor: pointer; }
}
@media screen and (max-width: 640px) { main { padding: 8mm 5mm 12mm; margin: 0; box-shadow: none; } }
header.title-block { border-bottom: 1.5pt solid #111; padding-bottom: 8pt; margin-bottom: 12pt; }
.site { font: 600 8pt/1.2 var(--sans); letter-spacing: .06em; text-transform: uppercase; color: #444; margin: 0 0 6pt; }
h1 { font: 700 20pt/1.2 var(--sans); margin: 0 0 4pt; }
.subtitle { margin: 0 0 8pt; color: #333; }
dl.choices, dl.defs { display: grid; grid-template-columns: max-content 1fr; gap: 2pt 12pt; margin: 6pt 0 0; font: 8.5pt/1.35 var(--sans); }
dl.choices div, dl.defs div { display: contents; }
dl.choices dt, dl.defs dt { font-weight: 700; color: #333; }
dl.choices dd, dl.defs dd { margin: 0; }
nav.toc { margin: 0 0 14pt; break-after: auto; }
nav.toc h2 { font: 700 11pt/1.3 var(--sans); margin: 0 0 4pt; }
nav.toc ol { list-style: none; margin: 0; padding: 0; font: 9pt/1.5 var(--sans); }
nav.toc li.sub { padding-inline-start: 14pt; color: #333; }
nav.toc .n { display: inline-block; min-width: 2.4em; font-variant-numeric: tabular-nums; }
section.doc-section { margin: 0 0 12pt; }
h2.section-title { font: 700 13pt/1.3 var(--sans); margin: 14pt 0 6pt; padding-bottom: 2pt; border-bottom: .75pt solid #999; break-after: avoid; }
h3.sub-title { font: 700 10.5pt/1.3 var(--sans); margin: 10pt 0 4pt; break-after: avoid; }
p { margin: 0 0 6pt; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 6pt; padding-inline-start: 16pt; }
p.note, p.table-note { font: 8pt/1.4 var(--sans); color: #444; }
p.table-note { margin-top: 3pt; }
table.data { width: 100%; border-collapse: collapse; margin: 4pt 0 2pt; font: 8.5pt/1.3 var(--sans); table-layout: auto; }
table.data.wide { font-size: 7.5pt; }
table.data thead { display: table-header-group; }
table.data tfoot { display: table-row-group; }
table.data tr { break-inside: avoid; page-break-inside: avoid; }
table.data th, table.data td { border-bottom: .5pt solid #bbb; padding: 3pt 4pt; text-align: start; vertical-align: top; overflow-wrap: break-word; }
table.data thead th { border-top: 1pt solid #111; border-bottom: 1pt solid #111; background: #f0f0f0; font-weight: 700; }
table.data tfoot td { border-top: 1pt solid #111; border-bottom: 1pt solid #111; font-weight: 700; }
table.data tr.group th { background: #fafafa; font-weight: 700; padding-top: 5pt; }
table.data .num { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
table.data td.unknown { color: #666; font-style: italic; }
table.data td.empty { color: #666; font-style: italic; text-align: center; }
section.sources { break-before: auto; }
section.sources li { font: 8.5pt/1.45 var(--sans); overflow-wrap: anywhere; }
footer.colophon { margin-top: 14pt; padding-top: 6pt; border-top: .5pt solid #999; font: 7.5pt/1.4 var(--sans); color: #555; }
`;
}

/**
 * Full HTML for a document. `branding` carries { siteName, siteUrl, appVersion,
 * generatedAt } so this module stays free of the site's DOM-bound modules.
 */
export function renderDocumentHtml(
  doc,
  rawSettings,
  { copy, language = 'en', dir = 'ltr', branding, assetBase = branding.siteUrl }
) {
  const settings = normalizeSettings(rawSettings);
  const heroDesign = doc.kind === 'heroes' && HERO_DESIGNS.includes(settings.design);
  const ctx = { copy, language, settings, unknown: copy.docUnknown, heroDesign, assetBase };
  // Put the visual lineups first in the designed Heroes sheets.
  const orderedSections = heroDesign
    ? [...(doc.sections || [])].sort(
        (a, b) => Number(b.role === 'combos') - Number(a.role === 'combos')
      )
    : doc.sections || [];
  // A designed sheet does not print "0 of 0" troop groups: an empty subsection is
  // dropped, and a section left with none says so once.
  const preparedSections = heroDesign
    ? orderedSections.map((section) => withoutEmptySubsections(section, copy.docNoRows))
    : orderedSections;
  const sections = numberSections(preparedSections);
  const toc = heroDesign ? [] : tableOfContents(doc.sections || []);
  const generated = branding.generatedAt || '';
  const choices = [
    ...(doc.choices || []),
    { label: copy.paper, value: settings.paper === 'letter' ? copy.paperLetter : copy.paperA4 },
    {
      label: copy.orientation,
      value: settings.orientation === 'landscape' ? copy.landscape : copy.portrait,
    },
    {
      label: copy.detail,
      value: settings.detail === 'full' ? copy.detailFull : copy.detailSummary,
    },
    { label: copy.docGenerated, value: generated },
  ];

  const tocHtml = toc.length
    ? `<nav class="toc" aria-label="${escapeHtml(copy.docContents)}"><h2>${escapeHtml(copy.docContents)}</h2><ol>${toc
        .map(
          (entry) =>
            `<li class="${entry.level === 2 ? 'sub' : 'top'}"><span class="n">${escapeHtml(entry.number)}</span> ${escapeHtml(entry.title)}</li>`
        )
        .join('')}</ol></nav>`
    : '';

  const sectionsHtml = sections
    .map(
      (section) =>
        `<section class="doc-section${heroDesign ? heroSectionClass(section) : ''}"><h2 class="section-title">${escapeHtml(section.number)}. ${escapeHtml(section.title)}</h2>${renderBlocks(
          section.blocks,
          ctx
        )}${section.subsections
          .map(
            (sub) =>
              `${heroDesign ? '<div class="hero-subsection">' : ''}<h3 class="sub-title">${escapeHtml(sub.number)} ${escapeHtml(sub.title)}</h3>${renderBlocks(sub.blocks, ctx)}${heroDesign ? '</div>' : ''}`
          )
          .join('')}</section>`
    )
    .join('');

  const sources =
    settings.sources && doc.sources?.length
      ? `<section class="doc-section sources"><h2 class="section-title">${escapeHtml(copy.docSources)}</h2><ol>${doc.sources
          .map(
            (source) =>
              `<li><strong>${escapeHtml(source.label)}</strong>${source.note ? ` — ${escapeHtml(source.note)}` : ''}${source.url ? `<br>${escapeHtml(source.url)}` : ''}</li>`
          )
          .join('')}</ol></section>`
      : '';

  return `<!doctype html>
<html lang="${escapeHtml(language === 'kr' ? 'ko' : language)}" dir="${dir === 'rtl' ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(doc.fileTitle || doc.title)}</title>
<style>${documentStyles(settings, copy, branding)}${heroDesign ? heroDesignStyles(settings.design, settings) : ''}</style>
</head>
<body${heroDesign ? ` data-hero-design="${settings.design}"` : ''}>
<div class="screen-only"><span>${escapeHtml(copy.docPrintHint)}${heroDesign ? ` ${escapeHtml(copy.designPrintHint)}` : ''}</span><button type="button" data-doc-print>${escapeHtml(copy.docPrint)}</button></div>
<main>
<header class="title-block">
${heroDesign ? `<div class="brand-lockup"><img class="brand-crest" src="${escapeHtml(assetUrl('images/logo-120.webp', assetBase))}" alt=""><span class="brand-wordmark">VTS <b>1097</b></span><span class="brand-edition">${escapeHtml(copy[{ dashboard: 'designDashboard', midnight: 'designMidnight', reference: 'designReference' }[settings.design]])} · v${escapeHtml(branding.appVersion)}</span></div>` : ''}
<p class="site">${escapeHtml(branding.siteName)} · ${escapeHtml(branding.siteUrl)}</p>
<h1>${escapeHtml(doc.title)}</h1>
${doc.subtitle ? `<p class="subtitle">${escapeHtml(doc.subtitle)}</p>` : ''}
<dl class="choices">${choices
    .map(
      (choice) =>
        `<div><dt>${escapeHtml(choice.label)}</dt><dd>${escapeHtml(formatCell(choice.value, ctx))}</dd></div>`
    )
    .join('')}</dl>
</header>
${tocHtml}
${heroDesign ? `<div class="hero-sections">${sectionsHtml}</div>` : sectionsHtml}
${sources}
<footer class="colophon">${escapeHtml(branding.siteName)} v${escapeHtml(branding.appVersion)} · ${escapeHtml(branding.siteUrl)} · ${escapeHtml(copy.docGenerated)} ${escapeHtml(generated)}</footer>
</main>
</body>
</html>`;
}

/** Shared helpers for the builders. */
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
export function interpolate(template, values = {}) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key])
  );
}
