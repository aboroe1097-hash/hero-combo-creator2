// Presentation primitives shared by the four sheet templates (plan §2).
//
// Templates are presentation only: they receive an already-shaped model from an
// adapter and turn it into these blocks. Nothing here reads data or computes a
// figure, so a template can never disagree with the tool it documents.

import { escapeHtml, formatNumber } from '../../pdf/lib/layout.mjs';
import { escapeAttribute, icon } from './theme.mjs';

const TONES = new Set(['gold', 'teal', 'purple', 'danger', 'neutral']);

function toneOf(value) {
  return TONES.has(value) ? value : 'neutral';
}

// The pill from the reference: "TIER 1 · WINGS" — a solid accent chip on a card.
export function pill(text, tone = 'gold') {
  return `<span class="sh-pill sh-pill--${toneOf(tone)}">${escapeHtml(text)}</span>`;
}

export function number(value, { dash = '—' } = {}) {
  if (value === null || value === undefined || value === '') return dash;
  if (typeof value !== 'number') return escapeHtml(value);
  return Number.isFinite(value) ? formatNumber(value) : dash;
}

// A prominent total: icon, big figure, unit, and a caption. Right-aligned in the
// reference cards, so `align: 'end'` is the default.
export function totalBlock({ iconName, value, unit, caption, tone = 'gold', raw = false }) {
  return `<div class="sh-total sh-total--${toneOf(tone)}">
    ${iconName ? icon(iconName, { size: '6mm', className: 'sh-total__icon' }) : ''}
    <span class="sh-total__value">${raw ? value : number(value)}</span>
    ${unit ? `<span class="sh-total__unit">${escapeHtml(unit)}</span>` : ''}
    ${caption ? `<span class="sh-total__caption">${escapeHtml(caption)}</span>` : ''}
  </div>`;
}

// The icon row from the reference tier cards: dark rounded tiles, each with an
// optional quantity underneath.
export function itemTiles(items, { tone = 'gold' } = {}) {
  if (!items.length) return '';
  const tiles = items
    .map((entry) => {
      const label = entry.value === null || entry.value === undefined ? '' : number(entry.value);
      return `<div class="sh-tile${entry.unknown ? ' is-unknown' : ''}">
        <span class="sh-tile__art">${icon(entry.iconName || 'info', { size: '6.4mm' })}</span>
        ${label ? `<span class="sh-tile__value">${label}</span>` : ''}
        ${entry.label ? `<span class="sh-tile__label">${escapeHtml(entry.label)}</span>` : ''}
      </div>`;
    })
    .join('');
  return `<div class="sh-tiles sh-tiles--${toneOf(tone)}">${tiles}</div>`;
}

// The tier-card shell: accent rail, pill row, title, an optional right-aligned
// total, then any body blocks.
export function card({ pillText, pillTone = 'gold', title, subtitle, right, body, note, tone }) {
  const accent = toneOf(tone || pillTone);
  const head = `<div class="sh-card__head">
      ${pillText ? pill(pillText, pillTone) : ''}
      ${title ? `<span class="sh-card__title">${escapeHtml(title)}</span>` : ''}
      ${right ? `<span class="sh-card__right">${right}</span>` : ''}
    </div>`;
  return `<article class="sh-card sh-card--${accent}">
    ${head}
    ${subtitle ? `<p class="sh-card__sub">${escapeHtml(subtitle)}</p>` : ''}
    ${body || ''}
    ${note ? `<p class="sh-card__note">${escapeHtml(note)}</p>` : ''}
  </article>`;
}

// Label/value grid for inputs, rules, and short facts.
export function statGrid(items, { columns = 3, tone = 'neutral' } = {}) {
  if (!items.length) return '';
  const cells = items
    .map(
      (entry) => `<div class="sh-stat">
      <span class="sh-stat__label">${escapeHtml(entry.label)}</span>
      <span class="sh-stat__value${entry.unknown ? ' is-unknown' : ''}">${
        entry.unknown ? escapeHtml(entry.valueText || 'Unknown') : number(entry.value)
      }</span>
      ${entry.hint ? `<span class="sh-stat__hint">${escapeHtml(entry.hint)}</span>` : ''}
    </div>`
    )
    .join('');
  return `<div class="sh-stats sh-stats--${columns} sh-stats--${toneOf(tone)}">${cells}</div>`;
}

// The big summary card ("18 WINGS / won by the alliance / V4S 8 · V2S 6 ...").
export function summaryCard({
  eyebrow,
  value,
  unit,
  caption,
  parts = [],
  tone = 'gold',
  raw = false,
}) {
  const partLine = parts.filter(Boolean).join(' &nbsp;·&nbsp; ');
  return `<section class="sh-summary sh-summary--${toneOf(tone)}">
    ${eyebrow ? `<span class="sh-summary__eyebrow">${escapeHtml(eyebrow)}</span>` : ''}
    <div class="sh-summary__figure">
      <span class="sh-summary__value">${raw ? value : number(value)}</span>
      ${unit ? `<span class="sh-summary__unit">${escapeHtml(unit)}</span>` : ''}
    </div>
    ${caption ? `<span class="sh-summary__caption">${escapeHtml(caption)}</span>` : ''}
    ${partLine ? `<div class="sh-summary__parts">${partLine}</div>` : ''}
  </section>`;
}

// Dark table with per-column tinting, uppercase muted heads, and an explicit
// unknown marker that never reads as a zero.
export function dataTable({ columns, rows, footer, note, tone = 'neutral', compact = false }) {
  const head = columns
    .map(
      (column) =>
        `<th class="sh-t${column.align === 'left' ? ' is-left' : ''}${
          column.tone ? ` sh-t--${toneOf(column.tone)}` : ''
        }">${escapeHtml(column.label)}</th>`
    )
    .join('');
  const body = rows
    .map((row) => {
      if (row && row.__group) {
        return `<tr class="sh-row--group"><td colspan="${columns.length}">${escapeHtml(
          row.__group
        )}</td></tr>`;
      }
      const cells = columns
        .map((column, index) => {
          const value = Array.isArray(row) ? row[index] : row[column.key];
          const classes = [
            column.align === 'left' ? 'is-left' : '',
            column.tone ? `sh-t--${toneOf(column.tone)}` : '',
            value === null || value === undefined ? 'is-unknown' : '',
          ]
            .filter(Boolean)
            .join(' ');
          const text =
            value === null || value === undefined ? column.unknownText || 'Unknown' : number(value);
          return `<td class="${classes}">${text}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  const foot = footer
    ? `<tfoot><tr>${footer
        .map(
          (cell, index) =>
            `<td class="${index === 0 ? 'is-left' : ''}">${
              cell === null || cell === undefined ? 'Unknown' : number(cell)
            }</td>`
        )
        .join('')}</tr></tfoot>`
    : '';
  return `<table class="sh-table${compact ? ' is-compact' : ''} sh-table--${toneOf(tone)}">
    <thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>
    ${note ? `<p class="sh-note">${escapeHtml(note)}</p>` : ''}`;
}

export function callout({ title, body, tone = 'info' }) {
  const toneName = toneOf(tone);
  return `<div class="sh-callout sh-callout--${toneName}">
    ${icon(toneName === 'danger' ? 'warning' : 'info', { size: '5mm', className: 'sh-callout__icon' })}
    <div><strong>${escapeHtml(title)}</strong>${body ? `<span>${escapeHtml(body)}</span>` : ''}</div>
  </div>`;
}

export function sectionTitle(text, { hint } = {}) {
  return `<div class="sh-section-title"><h2>${escapeHtml(text)}</h2>${
    hint ? `<span>${escapeHtml(hint)}</span>` : ''
  }</div>`;
}

export function bulletList(items, { tone = 'neutral' } = {}) {
  if (!items.length) return '';
  return `<ul class="sh-list sh-list--${toneOf(tone)}">${items
    .map((entry) => `<li>${escapeHtml(entry)}</li>`)
    .join('')}</ul>`;
}

// Numbered step list, for procedures and rules.
export function stepList(steps) {
  if (!steps.length) return '';
  return `<ol class="sh-steps">${steps
    .map(
      (entry, index) =>
        `<li><span class="sh-steps__index">${index + 1}</span><div>${
          entry.title ? `<strong>${escapeHtml(entry.title)}</strong>` : ''
        }${entry.text ? `<span>${escapeHtml(entry.text)}</span>` : ''}</div></li>`
    )
    .join('')}</ol>`;
}

// Legend for maps and diagrams: a colour swatch, a name, and what it means.
export function legend(items) {
  if (!items.length) return '';
  return `<ul class="sh-legend">${items
    .map(
      (entry) => `<li>
      <span class="sh-legend__swatch sh-legend__swatch--${toneOf(entry.tone || 'neutral')}">${
        entry.glyph ? escapeHtml(entry.glyph) : ''
      }</span>
      <span class="sh-legend__label">${escapeHtml(entry.label)}</span>
      ${entry.text ? `<span class="sh-legend__text">${escapeHtml(entry.text)}</span>` : ''}
    </li>`
    )
    .join('')}</ul>`;
}

// A labelled bar row, used by progression sheets for budget and share figures.
export function barRows(items, { formatter = formatNumber, tone = 'gold' } = {}) {
  if (!items.length) return '';
  const max = Math.max(...items.map((entry) => Number(entry.value) || 0), 1);
  return `<div class="sh-bars sh-bars--${toneOf(tone)}">${items
    .map((entry) => {
      const value = Number(entry.value) || 0;
      const width = Math.max((value / max) * 100, value > 0 ? 1.2 : 0);
      const display = entry.display ?? (entry.unknown ? 'Unknown' : formatter(value));
      return `<div class="sh-bar${entry.unknown ? ' is-unknown' : ''}">
        <span class="sh-bar__label">${escapeHtml(entry.label)}</span>
        <span class="sh-bar__track"><span class="sh-bar__fill" style="width:${width.toFixed(
          2
        )}%"></span></span>
        <span class="sh-bar__value">${escapeHtml(String(display))}</span>
      </div>`;
    })
    .join('')}</div>`;
}

// Two-column split used by comparison sheets.
export function split(left, right, { leftLabel, rightLabel } = {}) {
  return `<div class="sh-split">
    <div class="sh-split__side">${leftLabel ? `<span class="sh-split__label">${escapeHtml(leftLabel)}</span>` : ''}${left}</div>
    <div class="sh-split__side">${rightLabel ? `<span class="sh-split__label">${escapeHtml(rightLabel)}</span>` : ''}${right}</div>
  </div>`;
}

// Map page: an SVG drawing slot plus its legend.
export function mapFrame({ svg, caption, legendItems = [] }) {
  return `<div class="sh-map">
    <div class="sh-map__canvas">${svg}</div>
    ${caption ? `<p class="sh-map__caption">${escapeHtml(caption)}</p>` : ''}
    ${legendItems.length ? legend(legendItems) : ''}
  </div>`;
}

export { escapeHtml, escapeAttribute, icon };
