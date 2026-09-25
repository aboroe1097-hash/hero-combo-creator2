// PNG and CSV export of the season's R5 Bonus Team Effort Points, grouped by
// player. Loaded on demand from the admin panel. Like the duty-list PNGs these
// are the alliance's own records, so the footer names the tool and date only.

import { csvLine, toIsoTimestamp, withCsvFooter } from './admin-export-model.js';
import { filterR5Adjustments } from './ocr-adjustments.js';

export const CONDUCT_EXPORT_WIDTH = 1080;
export const CONDUCT_EXPORT_LINES_PER_PAGE = 34;

const FONT = 'Inter, "Segoe UI", "Noto Sans", Arial, sans-serif';

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}

function createdAtMs(record) {
  const iso = toIsoTimestamp(record?.createdAt);
  if (iso) return Date.parse(iso);
  const parsed = Date.parse(text(record?.createdAt));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The season's adjustments grouped by player, each player's total, sorted by
 * total (highest first). `category` follows the panel's category filter.
 */
export function buildConductExportModel(adjustments = [], options = {}) {
  const season = text(options.season);
  const category = text(options.category);
  const categoryLabel = options.categoryLabel || ((key) => key);
  const records = filterR5Adjustments(adjustments, { season, category });
  const byPlayer = new Map();
  records.forEach((record) => {
    const key = text(record.playerKey || record.playerName).trim();
    if (!key) return;
    const player = byPlayer.get(key) || {
      playerKey: key,
      playerName: text(record.playerName) || key,
      total: 0,
      entries: [],
    };
    const points = Number(record.points) || 0;
    player.total += points;
    player.entries.push({
      id: text(record.id),
      category: text(record.category),
      categoryLabel: text(categoryLabel(record.category)),
      points,
      note: text(record.note),
      date: toIsoTimestamp(record.createdAt) || text(record.createdAt),
      ms: createdAtMs(record),
    });
    byPlayer.set(key, player);
  });
  const players = [...byPlayer.values()]
    .map((player) => ({
      ...player,
      entries: player.entries.sort((a, b) => b.ms - a.ms),
    }))
    .sort(
      (a, b) =>
        b.total - a.total || a.playerName.localeCompare(b.playerName, 'en', { sensitivity: 'base' })
    );
  return {
    season,
    category,
    categoryLabel: category ? text(categoryLabel(category)) : '',
    players,
    entryCount: records.length,
  };
}

export const CONDUCT_EXPORT_CSV_COLUMNS = Object.freeze([
  'Season',
  'Player',
  'Player total',
  'Category',
  'Points',
  'Note',
  'Date (ISO)',
]);

export function buildConductExportCsv(model, footerCellLines = []) {
  const lines = [csvLine(CONDUCT_EXPORT_CSV_COLUMNS)];
  (model?.players || []).forEach((player) => {
    player.entries.forEach((entry) => {
      lines.push(
        csvLine([
          model.season,
          player.playerName,
          player.total,
          entry.categoryLabel || entry.category,
          entry.points,
          entry.note,
          entry.date,
        ])
      );
    });
  });
  return withCsvFooter(lines.join('\n'), footerCellLines);
}

function slug(value) {
  return (
    text(value)
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'season'
  );
}

export function conductExportFileName(model, extension = 'png', pageIndex = 0, pageCount = 1) {
  const base = [
    'bonus-team-effort',
    slug(model?.season),
    model?.category ? slug(model.category) : '',
  ]
    .filter(Boolean)
    .join('-');
  return pageCount > 1
    ? `${base}-${pageIndex + 1}of${pageCount}.${extension}`
    : `${base}.${extension}`;
}

// One line per player header and per adjustment; pages break between lines.
export function layoutConductExportLines(model) {
  const lines = [];
  (model?.players || []).forEach((player) => {
    lines.push({ kind: 'player', player });
    player.entries.forEach((entry) => lines.push({ kind: 'entry', player, entry }));
  });
  return lines;
}

export function paginateConductExportLines(lines = [], perPage = CONDUCT_EXPORT_LINES_PER_PAGE) {
  const size = Math.max(1, Number(perPage) || CONDUCT_EXPORT_LINES_PER_PAGE);
  const pages = [];
  for (let index = 0; index < lines.length; index += size)
    pages.push(lines.slice(index, index + size));
  return pages.length ? pages : [[]];
}

function signed(points) {
  const value = Number(points) || 0;
  return value > 0 ? `+${value}` : String(value);
}

function fit(ctx, value, maxWidth) {
  let label = text(value);
  if (ctx.measureText(label).width <= maxWidth) return label;
  while (label.length > 1 && ctx.measureText(`${label}…`).width > maxWidth)
    label = label.slice(0, -1);
  return `${label}…`;
}

const HEADER = 150;
const LINE = 40;
const FOOTER = 90;

function drawPage(canvas, model, lines, pageIndex, pageCount, settings) {
  const { t, dark, branding, drawFooter } = settings;
  const width = CONDUCT_EXPORT_WIDTH;
  const height = HEADER + Math.max(1, lines.length) * LINE + FOOTER;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const bg = dark ? '#0b1220' : '#ffffff';
  const ink = dark ? '#e2e8f0' : '#0f172a';
  const muted = dark ? '#94a3b8' : '#475569';
  const band = dark ? '#111c2e' : '#f1f5f9';
  const positive = dark ? '#4ade80' : '#15803d';
  const negative = dark ? '#f87171' : '#b91c1c';
  const accent = '#6366f1';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 8);
  const pad = 48;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = ink;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(fit(ctx, t.title, width - pad * 2), pad, 64);
  ctx.font = `500 20px ${FONT}`;
  ctx.fillStyle = muted;
  const subtitle = [
    t.seasonLabel,
    model.categoryLabel,
    pageCount > 1 ? `${pageIndex + 1}/${pageCount}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  ctx.fillText(fit(ctx, subtitle, width - pad * 2), pad, 100);

  let y = HEADER;
  if (!lines.length) {
    ctx.fillStyle = muted;
    ctx.font = `500 22px ${FONT}`;
    ctx.fillText(fit(ctx, t.empty, width - pad * 2), pad, y + 26);
  }
  lines.forEach((line) => {
    if (line.kind === 'player') {
      ctx.fillStyle = band;
      ctx.fillRect(pad - 12, y + 2, width - (pad - 12) * 2, LINE - 4);
      ctx.fillStyle = ink;
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText(fit(ctx, line.player.playerName, width - pad * 2 - 220), pad, y + 28);
      ctx.textAlign = 'right';
      ctx.fillStyle = line.player.total >= 0 ? positive : negative;
      ctx.fillText(`${t.total} ${signed(line.player.total)}`, width - pad, y + 28);
      ctx.textAlign = 'left';
    } else {
      const entry = line.entry;
      ctx.font = `500 19px ${FONT}`;
      ctx.fillStyle = muted;
      ctx.fillText(fit(ctx, entry.categoryLabel || entry.category, 260), pad + 20, y + 27);
      ctx.fillStyle = ink;
      const note = entry.note ? entry.note : '';
      ctx.fillText(fit(ctx, note, 440), pad + 300, y + 27);
      ctx.fillStyle = muted;
      ctx.fillText(text(entry.date).slice(0, 10), width - pad - 230, y + 27);
      ctx.textAlign = 'right';
      ctx.fillStyle = entry.points >= 0 ? positive : negative;
      ctx.font = `700 19px ${FONT}`;
      ctx.fillText(signed(entry.points), width - pad, y + 27);
      ctx.textAlign = 'left';
    }
    y += LINE;
  });
  if (typeof drawFooter === 'function') {
    drawFooter(ctx, branding, { x: pad, y: height - FOOTER / 2, width: width - pad * 2 });
  }
  return canvas;
}

export async function renderConductExportPages(model, options = {}) {
  if (typeof document === 'undefined') throw new Error('PNG export requires a browser document.');
  const { drawCanvasFooter, getExportBranding } = await import('./export-branding.js');
  const lines = layoutConductExportLines(model);
  const pages = paginateConductExportLines(lines, options.perPage);
  const t = {
    title: options.title || 'R5 Bonus Team Effort Points',
    seasonLabel: options.seasonLabel || model.season,
    total: options.totalLabel || 'Total',
    empty: options.emptyLabel || 'Nothing to export.',
  };
  return pages.map((pageLines, index) => {
    const canvas = document.createElement('canvas');
    return drawPage(canvas, model, pageLines, index, pages.length, {
      t,
      dark: options.theme === 'dark',
      branding: getExportBranding(),
      drawFooter: drawCanvasFooter,
    });
  });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadConductExportPng(model, options = {}) {
  const canvases = await renderConductExportPages(model, options);
  for (let index = 0; index < canvases.length; index += 1) {
    const blob = await new Promise((resolve, reject) =>
      canvases[index].toBlob(
        (value) => (value ? resolve(value) : reject(new Error('PNG encoding failed.'))),
        'image/png'
      )
    );
    downloadBlob(blob, conductExportFileName(model, 'png', index, canvases.length));
    if (index < canvases.length - 1) await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return canvases.length;
}

export async function downloadConductExportCsv(model) {
  const { csvFooterCellLines, getExportBranding } = await import('./export-branding.js');
  const csv = buildConductExportCsv(model, csvFooterCellLines(getExportBranding()));
  downloadBlob(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }),
    conductExportFileName(model, 'csv')
  );
}
