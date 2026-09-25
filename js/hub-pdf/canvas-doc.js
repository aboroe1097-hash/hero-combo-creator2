// js/hub-pdf/canvas-doc.js
// Canvas renderer for the hub sheets. Every hub shares it: the builders hand
// back a section/block model and this module draws it as dense A4 portrait
// pages in a dark or a light theme. Only data, titles, the logo lockup, the
// page number and the site URL reach the paper — prose blocks are skipped on
// purpose, because these sheets are read for combos, not for explanations.

export const SHEET = Object.freeze({
  width: 794, // A4 portrait at 96 dpi: the unit the layout below is written in
  height: 1123,
  margin: 40,
  scale: 2, // drawn at 2x for print: 1588 x 2246 pixels per page
  headerHeight: 84,
  footerHeight: 44,
  maxPngHeight: 16000, // taller than this and browsers refuse the canvas
});

export const SHEET_THEMES = Object.freeze(['light', 'dark']);

const FONT_STACK = 'Inter, "Segoe UI", "Noto Sans", Arial, sans-serif';
const font = (weight, size) => `${weight} ${size}px ${FONT_STACK}`;

export const SHEET_PALETTES = Object.freeze({
  dark: Object.freeze({
    background: '#0d1622',
    surface: '#16202f',
    raised: '#1d2a3d',
    line: '#2c3d57',
    text: '#f2f6fb',
    muted: '#93a6bf',
    accent: '#63dddc',
    warm: '#f3cf80',
    onAccent: '#08222a',
    zebra: 'rgba(255,255,255,0.04)',
    troops: {
      archer: '#74d29b',
      footman: '#ef9c89',
      cavalry: '#86c5f4',
      universal: '#f3cf80',
      mixed: '#f3cf80',
    },
  }),
  light: Object.freeze({
    background: '#f6f8fb',
    surface: '#ffffff',
    raised: '#eef2f7',
    line: '#d3dce8',
    text: '#10203a',
    muted: '#5a6b82',
    accent: '#0f7c86',
    warm: '#9a6a12',
    onAccent: '#ffffff',
    zebra: 'rgba(16,32,58,0.045)',
    troops: {
      archer: '#1f7a45',
      footman: '#a8412c',
      cavalry: '#1f6ea8',
      universal: '#8a6d10',
      mixed: '#8a6d10',
    },
  }),
});

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function ellipsize(ctx, text, maxWidth) {
  const value = String(text ?? '');
  if (maxWidth <= 0 || ctx.measureText(value).width <= maxWidth) return value;
  let cut = value;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** Word wrap with a hard line cap; the last kept line is ellipsized if cut. */
function wrapLines(ctx, text, maxWidth, maxLines = 2) {
  const words = String(text ?? '')
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let current = '';
  let truncated = false;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = '';
    }
    if (lines.length === maxLines) {
      truncated = true;
      break;
    }
    current = word;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (truncated && lines.length) {
    lines[lines.length - 1] = ellipsize(ctx, `${lines[lines.length - 1]} …`, maxWidth);
  }
  if (!lines.length) lines.push('');
  return lines.slice(0, maxLines);
}

function isBlank(value) {
  return value === null || value === undefined || value === '';
}

function cellText(value, copy) {
  if (isBlank(value)) return copy?.docUnknown || 'Unknown';
  return String(value);
}

/** A portrait, cover-fit and rounded; a neutral tile when there is no image. */
function drawPortrait(ctx, image, x, y, size, palette) {
  ctx.save();
  roundRect(ctx, x, y, size, size, Math.max(3, size * 0.15));
  ctx.clip();
  if (image && image.width && image.height) {
    const ratio = image.width / image.height;
    const drawWidth = ratio >= 1 ? size * ratio : size;
    const drawHeight = ratio >= 1 ? size : size / ratio;
    ctx.drawImage(
      image,
      x + (size - drawWidth) / 2,
      y + (size - drawHeight) * 0.16,
      drawWidth,
      drawHeight
    );
  } else {
    ctx.fillStyle = palette.raised;
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, size - 1, size - 1, Math.max(3, size * 0.15));
  ctx.stroke();
}

/** The mark a hero carries when the lane needs their skin. */
function drawSkinBadge(ctx, x, y, palette) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = palette.warm;
  ctx.strokeStyle = palette.background;
  ctx.lineWidth = 2;
  roundRect(ctx, -5, -5, 10, 10, 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function columnWidths(ctx, columns, rows, total) {
  const minimum = 48;
  const weights = columns.map((column, index) => {
    ctx.font = font(700, 10);
    let width = ctx.measureText(String(column?.label ?? '')).width;
    ctx.font = font(500, 10);
    for (const row of rows.slice(0, 40)) {
      const value = row[index];
      if (isBlank(value)) continue;
      width = Math.max(width, Math.min(ctx.measureText(String(value)).width, 240));
    }
    return Math.max(minimum, width + 18);
  });
  const sum = weights.reduce((total_, value) => total_ + value, 0);
  if (sum <= total) return weights;
  const factor = total / sum;
  return weights.map((value) => Math.max(minimum, Math.floor(value * factor)));
}

/**
 * The subtitle line: the document title, then the scope values the reader
 * chose. Choice labels stay out of it — they are the form's words, not the
 * sheet's.
 */
function sheetTitle(doc) {
  const parts = [doc.title];
  for (const entry of doc.choices || []) {
    const value = entry?.value;
    if (isBlank(value)) continue;
    const text = String(value);
    if (text.length > 26 || /^\d+$/.test(text)) continue;
    parts.push(text);
    if (parts.length === 3) break;
  }
  return parts.join(' · ');
}

/** One drawing surface per page, with a cursor the layouts advance. */
class Sheet {
  constructor(palette, { title, siteUrl, logo, copy, rtl = false }) {
    this.palette = palette;
    this.copy = copy;
    this.rtl = rtl;
    this.title = title;
    this.siteUrl = siteUrl;
    this.logo = logo;
    this.pages = [];
    this.newPage();
  }

  newPage() {
    const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
    if (!canvas) throw new Error('The hub sheets need a browser canvas.');
    canvas.width = SHEET.width * SHEET.scale;
    canvas.height = SHEET.height * SHEET.scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable.');
    ctx.scale(SHEET.scale, SHEET.scale);
    if (this.rtl) ctx.direction = 'rtl';
    this.ctx = ctx;
    this.canvas = canvas;
    this.pages.push(canvas);
    this.y = SHEET.headerHeight;
    this.#drawChrome();
  }

  get left() {
    return SHEET.margin;
  }

  get width() {
    return SHEET.width - SHEET.margin * 2;
  }

  get bottom() {
    return SHEET.height - SHEET.footerHeight;
  }

  #drawChrome() {
    const { ctx, palette } = this;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, SHEET.width, SHEET.height);
    const top = 22;
    const logoSize = 32;
    if (this.logo) {
      ctx.save();
      roundRect(ctx, this.left, top, logoSize, logoSize, 8);
      ctx.clip();
      ctx.drawImage(this.logo, this.left, top, logoSize, logoSize);
      ctx.restore();
    }
    const textX = this.rtl ? SHEET.width - this.left : this.left + logoSize + 10;
    ctx.textAlign = this.rtl ? 'right' : 'left';
    ctx.fillStyle = palette.text;
    ctx.font = font(800, 17);
    ctx.fillText('VTS 1097', textX, top + 16);
    ctx.font = font(600, 11);
    ctx.fillStyle = palette.muted;
    ctx.fillText(ellipsize(ctx, this.title, this.width - logoSize - 20), textX, top + 31);
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.line;
    ctx.fillRect(this.left, SHEET.headerHeight - 10, this.width, 1);
  }

  /** Footers need the page total, so they are drawn once at the end. */
  finish() {
    this.pages.forEach((canvas, index) => {
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.scale(SHEET.scale, SHEET.scale);
      ctx.fillStyle = this.palette.line;
      ctx.fillRect(this.left, SHEET.height - SHEET.footerHeight + 6, this.width, 1);
      ctx.font = font(500, 9);
      ctx.fillStyle = this.palette.muted;
      ctx.textAlign = 'left';
      ctx.fillText(this.siteUrl, this.left, SHEET.height - 18);
      ctx.textAlign = 'right';
      ctx.fillText(
        `${this.copy?.docPage || 'Page'} ${index + 1}/${this.pages.length}`,
        SHEET.width - this.left,
        SHEET.height - 18
      );
      ctx.restore();
    });
    return this.pages;
  }

  ensure(height) {
    if (this.y + height > this.bottom) this.newPage();
    return this.y;
  }

  label(text, { color, size = 12, gap = 6, indent = 0, keepWith = 0 } = {}) {
    // keepWith is the height of the first row under the label, so a group
    // heading never lands alone at the bottom of a page.
    this.ensure(size + gap + 4 + keepWith);
    // ensure() may have started a page: draw with the page we ended up on.
    const { ctx, palette } = this;
    ctx.font = font(700, size);
    ctx.fillStyle = color || palette.text;
    ctx.textAlign = this.rtl ? 'right' : 'left';
    const x = this.rtl ? SHEET.width - this.left - indent : this.left + indent;
    ctx.fillText(ellipsize(ctx, text, this.width - indent), x, this.y + size);
    ctx.textAlign = 'left';
    this.y += size + gap;
  }

  /**
   * Combo cards, four to a row: rank chip, three portraits with names, the
   * score, and a skin mark on the heroes whose lane needs one.
   */
  comboRow(combos) {
    const palette = this.palette;
    const gap = 8;
    const cardWidth = (this.width - gap * 3) / 4;
    const cardHeight = 88;
    const size = 42;
    const portraitGap = 5;
    const top = this.ensure(cardHeight + gap);
    const { ctx } = this;
    combos.forEach((combo, index) => {
      const x = this.left + index * (cardWidth + gap);
      const y = top;
      ctx.fillStyle = palette.surface;
      roundRect(ctx, x, y, cardWidth, cardHeight, 8);
      ctx.fill();
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = palette.accent;
      roundRect(ctx, x + 9, y + 7, 26, 16, 4);
      ctx.fill();
      ctx.fillStyle = palette.onAccent;
      ctx.font = font(800, 11);
      ctx.textAlign = 'center';
      ctx.fillText(ellipsize(ctx, String(combo.rank ?? ''), 22), x + 22, y + 19);
      ctx.font = font(800, 13);
      ctx.fillStyle = palette.accent;
      ctx.textAlign = 'right';
      ctx.fillText(ellipsize(ctx, String(combo.score ?? ''), 54), x + cardWidth - 9, y + 19);
      ctx.textAlign = 'left';

      const total = size * 3 + portraitGap * 2;
      const startX = x + (cardWidth - total) / 2;
      (combo.heroes || []).slice(0, 3).forEach((hero, heroIndex) => {
        const px = startX + heroIndex * (size + portraitGap);
        const py = y + 27;
        drawPortrait(ctx, combo.portraits?.[heroIndex], px, py, size, palette);
        if (combo.skins?.[heroIndex]) drawSkinBadge(ctx, px + size - 4, py + 4, palette);
        ctx.font = font(600, 8);
        ctx.textAlign = 'center';
        ctx.fillStyle = palette.text;
        wrapLines(ctx, hero, size + 8, 2).forEach((line, lineIndex) => {
          ctx.fillText(line, px + size / 2, py + size + 9 + lineIndex * 9);
        });
        ctx.textAlign = 'left';
      });
    });
    this.y = top + cardHeight + gap;
    return this.y;
  }

  /** Hero entries in three columns: portrait, name, the key stats. */
  heroEntries(rows, portraits = []) {
    const palette = this.palette;
    const columns = 3;
    const gap = 10;
    const entryWidth = (this.width - gap * (columns - 1)) / columns;
    const entryHeight = 54;
    const size = 40;
    for (let index = 0; index < rows.length; index += columns) {
      const slice = rows.slice(index, index + columns);
      const top = this.ensure(entryHeight);
      // A row group that does not fit moves to the next page; draw there.
      const { ctx } = this;
      slice.forEach((row, column) => {
        const x = this.left + column * (entryWidth + gap);
        drawPortrait(ctx, portraits[index + column], x, top, size, palette);
        const textX = x + size + 8;
        const textWidth = entryWidth - size - 8;
        ctx.textAlign = 'left';
        ctx.fillStyle = palette.text;
        ctx.font = font(700, 11);
        ctx.fillText(ellipsize(ctx, cellText(row[0], this.copy), textWidth), textX, top + 12);
        ctx.font = font(500, 9);
        ctx.fillStyle = palette.muted;
        ctx.fillText(
          ellipsize(
            ctx,
            [row[1], row[2], row[3]].filter((value) => !isBlank(value)).join(' · '),
            textWidth
          ),
          textX,
          top + 26
        );
        ctx.fillText(
          ellipsize(
            ctx,
            [row[4], row[5]].filter((value) => !isBlank(value)).join(' · '),
            textWidth
          ),
          textX,
          top + 38
        );
      });
      this.y = top + entryHeight;
    }
    return this.y;
  }

  /** Skin tiles: portrait, skin name, type and tier. */
  skinTiles(rows, portraits = []) {
    const palette = this.palette;
    const columns = 6;
    const gap = 8;
    const tileWidth = (this.width - gap * (columns - 1)) / columns;
    const tileHeight = 82;
    const size = 42;
    for (let index = 0; index < rows.length; index += columns) {
      const slice = rows.slice(index, index + columns);
      const top = this.ensure(tileHeight);
      const { ctx } = this;
      slice.forEach((row, column) => {
        const x = this.left + column * (tileWidth + gap);
        drawPortrait(
          ctx,
          portraits[index + column],
          x + (tileWidth - size) / 2,
          top,
          size,
          palette
        );
        ctx.textAlign = 'center';
        ctx.fillStyle = palette.text;
        ctx.font = font(600, 8);
        wrapLines(ctx, cellText(row[1], this.copy), tileWidth, 2).forEach((line, lineIndex) => {
          ctx.fillText(line, x + tileWidth / 2, top + size + 10 + lineIndex * 9);
        });
        ctx.fillStyle = palette.muted;
        ctx.font = font(500, 8);
        ctx.fillText(
          ellipsize(
            ctx,
            [row[2], row[3]].filter((value) => !isBlank(value)).join(' · '),
            tileWidth
          ),
          x + tileWidth / 2,
          top + tileHeight - 4
        );
        ctx.textAlign = 'left';
      });
      this.y = top + tileHeight;
    }
    return this.y;
  }

  /** A dense table; its header repeats on every page it spans. */
  dataTable(columns, rows, { footer } = {}) {
    const palette = this.palette;
    let ctx = this.ctx;
    const rowHeight = 20;
    const headerHeight = 22;
    const widths = columnWidths(ctx, columns, rows, this.width);
    const drawRow = (values, top, { head = false, strong = false } = {}) => {
      let x = this.left + 8;
      columns.forEach((column, index) => {
        const align = column?.align === 'num' ? 'right' : 'left';
        ctx.textAlign = align;
        if (head) {
          ctx.font = font(700, 10);
          ctx.fillStyle = palette.muted;
        } else {
          ctx.font = font(strong ? 700 : 500, 10);
          ctx.fillStyle = strong
            ? palette.accent
            : isBlank(values[index])
              ? palette.muted
              : palette.text;
        }
        ctx.fillText(
          ellipsize(ctx, cellText(values[index], this.copy), widths[index] - 10),
          align === 'right' ? x + widths[index] - 8 : x,
          top + 14
        );
        x += widths[index];
      });
      ctx.textAlign = 'left';
    };
    const drawHead = () => {
      const top = this.y;
      ctx.fillStyle = palette.raised;
      roundRect(ctx, this.left, top, this.width, headerHeight, 4);
      ctx.fill();
      drawRow(
        columns.map((column) => column?.label),
        top,
        { head: true }
      );
      this.y = top + headerHeight;
    };

    drawHead();
    rows.forEach((row, rowIndex) => {
      if (this.y + rowHeight > this.bottom) {
        this.newPage();
        ctx = this.ctx;
        drawHead();
      }
      if (rowIndex % 2 === 1) {
        ctx.fillStyle = palette.zebra;
        ctx.fillRect(this.left, this.y, this.width, rowHeight);
      }
      drawRow(row, this.y);
      this.y += rowHeight;
    });
    if (footer) {
      if (this.y + rowHeight > this.bottom) {
        this.newPage();
        ctx = this.ctx;
        drawHead();
      }
      ctx.strokeStyle = palette.line;
      ctx.beginPath();
      ctx.moveTo(this.left, this.y + 0.5);
      ctx.lineTo(this.left + this.width, this.y + 0.5);
      ctx.stroke();
      drawRow(footer, this.y, { strong: true });
      this.y += rowHeight + 4;
    }
    return this.y;
  }
}

/** Combo rows carry the lane's per-hero skin requirements alongside the data. */
function comboEntries(table) {
  const skinFlags = table.skinFlags || [];
  const portraits = table.portraits || [];
  return (table.rows || []).map((row, index) => ({
    rank: row[0],
    score: row[4],
    heroes: [row[1], row[2], row[3]],
    skins: skinFlags[index] || [],
    portraits: (portraits[index] || []).map((href) => href),
  }));
}

/** Group a combos table into rows of four, with the skin marks in place. */
function drawComboTable(sheet, table, images) {
  const entries = comboEntries(table);
  for (let index = 0; index < entries.length; index += 4) {
    sheet.comboRow(
      entries.slice(index, index + 4).map((entry) => ({
        ...entry,
        portraits: entry.portraits.map((href) => images.get(href) || null),
      }))
    );
  }
}

function tableBlocks(doc) {
  const blocks = [];
  for (const section of doc.sections || []) {
    const own = (section.blocks || []).filter((block) => block.type === 'table');
    const subs = [];
    for (const sub of section.subsections || []) {
      for (const block of sub.blocks || []) {
        if (block.type === 'table') subs.push({ block, title: sub.title });
      }
    }
    const hasRows = (block) => (block.rows || []).length > 0;
    if (own.some(hasRows) || subs.some((entry) => hasRows(entry.block))) {
      blocks.push({
        section,
        own: own.filter(hasRows),
        subs: subs.filter((entry) => hasRows(entry.block)),
      });
    }
  }
  return blocks;
}

/** True when a model carries at least one row worth drawing. */
export function documentHasContent(doc) {
  return tableBlocks(doc).some(({ own, subs }) =>
    [...own, ...subs.map((entry) => entry.block)].some(
      // A static reference table is not a sign that the reader chose anything.
      (block) => !block.static && (block.rows || []).length
    )
  );
}

/** Every portrait URL a document wants drawn. */
export function portraitUrls(doc) {
  const urls = [];
  for (const { own, subs } of tableBlocks(doc)) {
    for (const block of [...own, ...subs.map((entry) => entry.block)]) {
      for (const list of block.portraits || []) {
        if (Array.isArray(list)) {
          for (const href of list) if (typeof href === 'string' && href) urls.push(href);
        } else if (typeof list === 'string' && list) {
          urls.push(list);
        }
      }
    }
  }
  return [...new Set(urls)];
}

/**
 * Render a hub document model into A4 portrait page canvases.
 *
 * @param {object} options
 * @param {object} options.doc  the hub builder's document model
 * @param {object} options.copy hub PDF copy for the current language
 * @param {'dark'|'light'} [options.theme]
 * @param {string} [options.siteUrl]
 * @param {Map<string, CanvasImageSource>} [options.images] portrait URL -> image
 * @param {CanvasImageSource|null} [options.logo]
 * @returns {HTMLCanvasElement[]}
 */
export function renderHubPages({
  doc,
  copy,
  theme = 'dark',
  siteUrl = '',
  images = new Map(),
  logo = null,
  rtl = false,
}) {
  const palette = SHEET_PALETTES[SHEET_THEMES.includes(theme) ? theme : 'dark'];
  const sheet = new Sheet(palette, { title: sheetTitle(doc), siteUrl, logo, copy, rtl });
  // Portraits arrive as URLs; the layouts draw images, so resolve them once.
  const resolve = (list) =>
    (list || []).map((href) =>
      typeof href === 'string' ? images.get(href) || null : href || null
    );

  for (const { section, own, subs } of tableBlocks(doc)) {
    sheet.label(section.title, { color: palette.accent, size: 12, gap: 8, keepWith: 96 });
    for (const block of own) {
      if (block.presentation === 'hero-combos') drawComboTable(sheet, block, images);
      else if (block.presentation === 'hero-list')
        sheet.heroEntries(block.rows, resolve(block.portraits));
      else if (block.presentation === 'hero-skins')
        sheet.skinTiles(block.rows, resolve(block.portraits));
      else {
        sheet.dataTable(block.columns || [], block.rows, { footer: block.footer });
        sheet.y += 6;
      }
    }
    for (const { block, title } of subs) {
      const tone = block.troop ? palette.troops[block.troop] : palette.accent;
      sheet.label(title, { color: tone || palette.accent, size: 11, gap: 5, keepWith: 96 });
      if (block.presentation === 'hero-combos') drawComboTable(sheet, block, images);
      else if (block.presentation === 'hero-list')
        sheet.heroEntries(block.rows, resolve(block.portraits));
      else if (block.presentation === 'hero-skins')
        sheet.skinTiles(block.rows, resolve(block.portraits));
      else {
        sheet.dataTable(block.columns || [], block.rows, { footer: block.footer });
        sheet.y += 6;
      }
    }
  }

  return sheet.finish();
}

/** Portraits, loaded cross-origin clean so the canvas is never tainted. */
export async function loadPortraits(urls, { timeout = 15000 } = {}) {
  const images = new Map();
  const list = [...new Set((urls || []).filter(Boolean))];
  await Promise.all(
    list.map(
      (url) =>
        new Promise((resolve) => {
          if (typeof Image === 'undefined') return resolve();
          const image = new Image();
          image.crossOrigin = 'anonymous';
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            if (image.naturalWidth) images.set(url, image);
            resolve();
          };
          image.onload = done;
          image.onerror = done;
          setTimeout(done, timeout);
          image.src = url;
        })
    )
  );
  return images;
}

/** The logo lockup image the header draws. */
export async function loadLogo(url) {
  if (!url || typeof Image === 'undefined') return null;
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/** Stack pages into tall sheets, split before a browser refuses the canvas. */
export function stitchPages(
  canvases,
  { maxHeight = SHEET.maxPngHeight, background = '#ffffff' } = {}
) {
  if (!canvases.length) return [];
  const width = canvases[0].width;
  const pageHeight = canvases[0].height;
  const sheets = [];
  let stack = [];
  let height = 0;
  const flush = () => {
    if (!stack.length) return;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    let y = 0;
    for (const page of stack) {
      ctx.drawImage(page, 0, y);
      y += page.height;
    }
    sheets.push(canvas);
    stack = [];
    height = 0;
  };
  for (const page of canvases) {
    if (height + pageHeight > maxHeight) flush();
    stack.push(page);
    height += pageHeight;
  }
  flush();
  return sheets;
}

/** JPEG bytes per page, ready for the PDF writer. */
export async function pagesToJpeg(canvases, quality = 0.86) {
  const pages = [];
  for (const canvas of canvases) {
    const blob = await new Promise((resolve) =>
      canvas.toBlob((value) => resolve(value), 'image/jpeg', quality)
    );
    if (!blob) throw new Error('The page image could not be encoded.');
    pages.push({
      bytes: new Uint8Array(await blob.arrayBuffer()),
      width: canvas.width,
      height: canvas.height,
    });
  }
  return pages;
}

/** PNG blobs for the stacked sheet images. */
export async function pagesToPng(canvases) {
  const blobs = [];
  for (const canvas of canvases) {
    const blob = await new Promise((resolve) =>
      canvas.toBlob((value) => resolve(value), 'image/png')
    );
    if (!blob) throw new Error('The sheet image could not be encoded.');
    blobs.push(blob);
  }
  return blobs;
}
