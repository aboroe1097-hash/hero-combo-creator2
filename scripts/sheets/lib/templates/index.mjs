// The four shared templates (plan §2): progression, comparison, catalogue,
// map/diagram.
//
// A template is a page arrangement, not a data path. Each one takes the adapter's
// pages — already grouped by the adapter, which is the only side that knows what
// belongs together — and turns them into printed page bodies. All four share the
// block renderer, so the visual language is identical across the catalogue.

import { renderBlocks } from './blocks.mjs';

export const TEMPLATE_IDS = Object.freeze(['progression', 'comparison', 'catalogue', 'map']);

function pageHeader(sheet, page, index, total) {
  const continued = index > 0;
  return {
    eyebrow: page.eyebrow || (continued ? `${sheet.category} · continued` : sheet.eyebrow),
    title: page.title || sheet.title,
    subtitle: page.subtitle,
    meta: page.meta || [],
    // Only the first page carries the focal illustration, and it is dropped on a
    // continuation page so the extra room goes to content.
    art: continued ? '' : page.art || sheet.art || '',
  };
}

function arrange(sheet, model, { dense = false } = {}) {
  const pages = model.pages?.length ? model.pages : [{ blocks: model.blocks || [] }];
  return pages.map((page, index) => ({
    header: pageHeader(sheet, page, index, pages.length),
    body: renderBlocks(page.blocks),
    dense: page.dense ?? dense,
  }));
}

export const TEMPLATES = Object.freeze({
  // Cost rules, inputs, budgets, level-by-level ladders: anything that walks a
  // reader through a progression.
  progression: {
    id: 'progression',
    defaultOrientation: 'portrait',
    render: (sheet, model) => arrange(sheet, model),
  },

  // Side-by-side options, loadouts and before/after comparisons. Landscape when
  // the adapter says the columns are wide.
  comparison: {
    id: 'comparison',
    defaultOrientation: 'portrait',
    render: (sheet, model) => arrange(sheet, model),
  },

  // Long reference lists: every hero, every skin, every artifact. Dense by
  // default because these pages are tables, not prose.
  catalogue: {
    id: 'catalogue',
    defaultOrientation: 'portrait',
    render: (sheet, model) => arrange(sheet, model, { dense: true }),
  },

  // Annotated reference views with their legend.
  map: {
    id: 'map',
    defaultOrientation: 'landscape',
    render: (sheet, model) => arrange(sheet, model),
  },
});

export function getTemplate(id) {
  const template = TEMPLATES[id];
  if (!template) {
    throw new Error(`Unknown sheet template: ${id} (expected one of ${TEMPLATE_IDS.join(', ')})`);
  }
  return template;
}
