// The block vocabulary every template renders (plan §2, §3).
//
// An adapter decides *what* goes on a page; a template decides how it looks. Both
// sides meet here: one renderer per block kind, so the four templates stay thin and
// a new sheet never invents a new visual.

import {
  barRows,
  bulletList,
  callout,
  card,
  dataTable,
  itemTiles,
  mapFrame,
  number,
  sectionTitle,
  split,
  statGrid,
  stepList,
  summaryCard,
  totalBlock,
} from '../chrome.mjs';

const RENDERERS = {
  sectionTitle: (block) => sectionTitle(block.text, { hint: block.hint }),

  paragraph: (block) => `<p class="sh-subtitle">${escapeText(block.text)}</p>`,

  callout: (block) => callout({ title: block.title, body: block.body, tone: block.tone }),

  note: (block) => `<p class="sh-note">${escapeText(block.text)}</p>`,

  stats: (block) => statGrid(block.items, { columns: block.columns, tone: block.tone }),

  steps: (block) => stepList(block.items),

  list: (block) => bulletList(block.items, { tone: block.tone }),

  bars: (block) => barRows(block.items, { tone: block.tone }),

  summary: (block) => summaryCard(block),

  tiles: (block) => itemTiles(block.items, { tone: block.tone }),

  totals: (block) =>
    `<div class="sh-grid sh-grid--${block.columns || 2}">${block.items
      .map((entry) =>
        totalBlock({
          iconName: entry.iconName,
          value: entry.value,
          unit: entry.unit,
          caption: entry.caption,
          tone: entry.tone,
          raw: entry.raw,
        })
      )
      .join('')}</div>`,

  table: (block) =>
    dataTable({
      columns: block.columns,
      rows: block.rows,
      footer: block.footer,
      note: block.note,
      tone: block.tone,
      compact: block.compact,
    }),

  // A card takes pre-rendered `body` markup or nested `blocks`; anything a card is
  // given must reach the page, so an unknown shape is an error rather than a
  // silently empty card.
  cards: (block) =>
    `<div class="sh-grid sh-grid--${block.columns || 2}">${block.items
      .map((entry) =>
        card({
          pillText: entry.pillText,
          pillTone: entry.pillTone,
          title: entry.title,
          subtitle: entry.subtitle,
          right: entry.right,
          body: entry.body ?? (entry.blocks ? renderBlocks(entry.blocks) : ''),
          note: entry.note,
          tone: entry.tone,
        })
      )
      .join('')}</div>`,

  split: (block) =>
    split(renderBlocks(block.left || []), renderBlocks(block.right || []), {
      leftLabel: block.leftLabel,
      rightLabel: block.rightLabel,
    }),

  map: (block) =>
    mapFrame({ svg: block.svg, caption: block.caption, legendItems: block.legend || [] }),

  spacer: (block) => `<div style="height:${Number(block.height) || 4}mm"></div>`,
};

function escapeText(value) {
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

/**
 * Render a list of blocks. Unknown kinds throw instead of rendering nothing: a
 * silently dropped block is a sheet that lies about its own coverage.
 */
export function renderBlocks(blocks) {
  return (blocks || [])
    .map((block) => {
      if (!block || !block.kind) return '';
      const renderer = RENDERERS[block.kind];
      if (!renderer) throw new Error(`Unknown sheet block kind: ${block.kind}`);
      return renderer(block);
    })
    .filter(Boolean)
    .join('\n');
}

export { number };
