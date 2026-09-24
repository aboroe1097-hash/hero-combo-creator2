// Shareable duty list PNGs (Banners / Pathing / Shield Walls). Each image is a
// per-player tally the officers post in the category's Viber group so players
// can confirm their count. Drawn natively on a canvas, lazy-loaded from the
// admin click handlers so none of it sits in the initial admin bundle.
import {
  collectDutyRecordGroups,
  dutyRecordDisplayTitle,
  dutyRecordInGroup,
  formatDutyRecordDay,
  normalizeDutyRecordGroup,
  normalizeDutyRecordTitle,
} from './duty-record-title.js';

export const DUTY_EXPORT_WIDTH = 1080;
export const DUTY_EXPORT_ROWS_PER_PAGE = 25;

export const DUTY_EXPORT_CATEGORIES = Object.freeze({
  banner: Object.freeze({ types: Object.freeze(['banner']), label: 'Banners' }),
  pather: Object.freeze({ types: Object.freeze(['pather', 'speed_tile']), label: 'Pathing' }),
  shield_wall: Object.freeze({ types: Object.freeze(['shield_wall']), label: 'Shield Walls' }),
});

const PALETTES = Object.freeze({
  dark: Object.freeze({
    background: '#0a1320',
    surface: '#101c2e',
    raised: '#15253b',
    line: '#243852',
    text: '#f3f7fc',
    muted: '#9db0c8',
    zebra: 'rgba(255,255,255,0.035)',
    accents: { banner: '#f1bf52', pather: '#4cc4ee', shield_wall: '#a98cf5' },
  }),
  light: Object.freeze({
    background: '#f4f7fb',
    surface: '#ffffff',
    raised: '#eef2f8',
    line: '#d5deea',
    text: '#0f1b2d',
    muted: '#51627a',
    zebra: 'rgba(15,27,45,0.04)',
    accents: { banner: '#b7791f', pather: '#0b7fb5', shield_wall: '#6d45d9' },
  }),
});

const FONT = 'Inter, "Segoe UI", "Noto Sans", Arial, sans-serif';

const DEFAULT_COPY = Object.freeze({
  adminDutyExportTotalDuties: 'Total duties',
  adminDutyExportPlayers: 'Players',
  adminDutyAccountMain: 'Main',
  adminDutyAccountBanner: 'Banner',
  adminSummaryUploads: 'Uploads',
  adminDutyExportUploadsHeading: 'Uploads included',
  adminDutyExportColPlayer: 'Player',
  adminDutyExportColCount: 'Count',
  adminDutyExportColPoints: 'Points',
  adminDutyExportScoringHeading: 'How this season scores it',
  adminDutyExportPerDuty: '{points} points per duty',
  adminDutyExportWeight: 'weight ×{weight}',
  adminDutyExportSupportNote: 'Support weight ×{weight} included',
  adminDutyExportPage: 'Page {page}/{pages}',
  adminDutyExportFooter: 'Check your name and count — reply in the group if anything is missing',
  adminDutyExportMore: '+{count} more',
  adminDutyExportNoRows: 'No duties recorded for this selection.',
  adminDutyExportDialogTitle: 'Share {label}',
  adminDutyExportGroupLabel: 'Uploads to include',
  adminDutyGroupFilterAll: 'All uploads',
  adminDutyExportPreviewSummary: 'Players: {players} · Duties: {duties} · Images: {pages}',
  adminDutyExportDownload: 'Download PNG',
  adminDutyExportShare: 'Share',
  adminDutyExportClose: 'Close',
  adminDutyExportWorking: 'Preparing image…',
  adminDutyExportFailed: 'The PNG could not be created. Try again.',
  adminDutyExportPreviewAlt: 'Preview of the first image',
});

function asText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

function categoryMeta(category) {
  return DUTY_EXPORT_CATEGORIES[category] || null;
}

function defaultResolveNames(entry) {
  const name = asText(entry?.confirmed || entry?.original || entry?.name);
  return name ? [name] : [];
}

function defaultAccountType(entry) {
  return String(entry?.accountType || '').toLowerCase() === 'banner' ? 'banner' : 'main';
}

function compareRecords(left, right) {
  return (
    String(left?.date || '').localeCompare(String(right?.date || '')) ||
    String(left?.createdAt || '').localeCompare(String(right?.createdAt || '')) ||
    String(left?.id || '').localeCompare(String(right?.id || ''))
  );
}

// With the season's scoring known, the list ranks by the points a player's
// duties are worth (a main duty can outweigh several banner ones), then count.
function compareRows(left, right) {
  return (
    (right.points ?? 0) - (left.points ?? 0) ||
    right.count - left.count ||
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base', numeric: true }) ||
    left.name.localeCompare(right.name)
  );
}

/**
 * Per-player tally for one duty category, optionally narrowed to one upload
 * group. Pure: no DOM, so it is unit tested directly.
 *
 * @param {Array} records  dutyRecords (every category; filtered here).
 * @param {object} options
 * @param {string} options.category  banner | pather | shield_wall
 * @param {string} [options.group]  Only uploads in this group ('' = all).
 * @param {string} [options.categoryLabel]  Localised category name.
 * @param {string} [options.locale]  Intl locale for day labels.
 * @param {Function} [options.resolveNames]  (entry, record) => credited names.
 * @param {Function} [options.accountTypeOf]  (entry, name, record) => 'main' | 'banner'.
 */
// The season's weights for this category, as the score uses them: a duty on a
// main is worth `main × unit × support`, on a banner (alt) `alt × unit × support`.
// Absent or unreadable weights leave the export without a scoring strip.
export function normalizeExportScoring(value) {
  if (!value || typeof value !== 'object') return null;
  const read = (raw, fallback) => {
    const number = Number(raw);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  };
  const mainWeight = read(value.main, NaN);
  const bannerWeight = read(value.banner, NaN);
  if (!Number.isFinite(mainWeight) || !Number.isFinite(bannerWeight)) return null;
  const unit = read(value.unit, 10000);
  const support = read(value.support, 1);
  const round = (number) => Math.round(number * 1000) / 1000;
  return {
    mainWeight,
    bannerWeight,
    support,
    unit,
    mainPoints: round(mainWeight * unit * support),
    bannerPoints: round(bannerWeight * unit * support),
  };
}

export function buildDutyExportModel(records = [], options = {}) {
  const category = String(options.category || '');
  const meta = categoryMeta(category);
  const types = meta ? meta.types : [category];
  const group = normalizeDutyRecordGroup(options.group);
  const locale = options.locale;
  const resolveNames =
    typeof options.resolveNames === 'function' ? options.resolveNames : defaultResolveNames;
  const accountTypeOf =
    typeof options.accountTypeOf === 'function' ? options.accountTypeOf : defaultAccountType;
  const categoryLabel = asText(options.categoryLabel) || meta?.label || category;
  const scoring = normalizeExportScoring(options.scoring);

  const selected = (Array.isArray(records) ? records : [])
    .filter((record) => record && types.includes(record.type) && dutyRecordInGroup(record, group))
    .slice()
    .sort(compareRecords);

  const uploads = selected.map((record, index) => ({
    id: String(record.id || `upload-${index + 1}`),
    label: dutyRecordDisplayTitle(record, locale),
    title: normalizeDutyRecordTitle(record.title),
    date: String(record.date || ''),
    count: 0,
  }));

  const players = new Map();
  let main = 0;
  let banner = 0;
  selected.forEach((record, index) => {
    const upload = uploads[index];
    (Array.isArray(record.entries) ? record.entries : []).forEach((entry) => {
      const names = [];
      const seen = new Set();
      (resolveNames(entry, record) || []).forEach((raw) => {
        const name = asText(raw);
        const key = name.toLocaleLowerCase();
        if (!name || seen.has(key)) return;
        seen.add(key);
        names.push(name);
      });
      names.forEach((name) => {
        const key = name.toLocaleLowerCase();
        let row = players.get(key);
        if (!row) {
          row = { name, count: 0, main: 0, banner: 0, uploadCounts: new Map() };
          players.set(key, row);
        }
        const account = accountTypeOf(entry, name, record) === 'banner' ? 'banner' : 'main';
        row.count += 1;
        row[account] += 1;
        if (account === 'banner') banner += 1;
        else main += 1;
        upload.count += 1;
        row.uploadCounts.set(upload.id, (row.uploadCounts.get(upload.id) || 0) + 1);
      });
    });
  });

  const pointsOf = (row) =>
    scoring ? row.main * scoring.mainPoints + row.banner * scoring.bannerPoints : null;
  players.forEach((row) => {
    row.points = pointsOf(row);
  });
  const sorted = Array.from(players.values()).sort(compareRows);
  let previousCount = null;
  let previousRank = 0;
  const rows = sorted.map((row, index) => {
    const tieKey = `${row.points ?? ''}|${row.count}`;
    const rank = tieKey === previousCount ? previousRank : index + 1;
    previousCount = tieKey;
    previousRank = rank;
    return {
      rank,
      name: row.name,
      count: row.count,
      main: row.main,
      banner: row.banner,
      points: row.points,
      uploads: uploads
        .filter((upload) => row.uploadCounts.has(upload.id))
        .map((upload) => ({
          id: upload.id,
          label: upload.label,
          count: row.uploadCounts.get(upload.id),
        })),
    };
  });

  const dates = selected
    .map((record) => String(record.date || ''))
    .filter((date) => /^\d{4}-\d{2}-\d{2}/.test(date))
    .sort();
  const dateFrom = dates[0] || '';
  const dateTo = dates.at(-1) || '';
  const fromLabel = dateFrom ? formatDutyRecordDay(dateFrom, locale) : '';
  const toLabel = dateTo ? formatDutyRecordDay(dateTo, locale) : '';
  const dateRange =
    fromLabel && toLabel && fromLabel !== toLabel ? `${fromLabel} – ${toLabel}` : fromLabel;

  return {
    category,
    categoryLabel,
    group,
    title: [categoryLabel, group, dateRange].filter(Boolean).join(' · '),
    dateFrom,
    dateTo,
    dateRange,
    uploads,
    scoring,
    summary: {
      points: scoring ? main * scoring.mainPoints + banner * scoring.bannerPoints : null,
      totalDuties: main + banner,
      uniquePlayers: rows.length,
      main,
      banner,
      uploads: uploads.length,
    },
    rows,
  };
}

export function paginateDutyExportRows(rows = [], perPage = DUTY_EXPORT_ROWS_PER_PAGE) {
  const size = Math.max(1, Math.floor(Number(perPage) || DUTY_EXPORT_ROWS_PER_PAGE));
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [[]];
  const pages = [];
  for (let index = 0; index < list.length; index += size)
    pages.push(list.slice(index, index + size));
  return pages;
}

export { collectDutyRecordGroups };

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function makeTranslator(t) {
  return (key, vars = {}) => {
    let value = typeof t === 'function' ? t(key, vars) : '';
    if (!value || value === key) {
      value = DEFAULT_COPY[key] || key;
      Object.entries(vars).forEach(([name, replacement]) => {
        value = value.replaceAll(`{${name}}`, String(replacement));
      });
    }
    return String(value);
  };
}

function resolveTheme(theme) {
  if (theme === 'light' || theme === 'dark') return theme;
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement?.dataset?.theme === 'light' ? 'light' : 'dark';
}

function withAlpha(hex, alpha) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const value = Number.parseInt(match[1], 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

function createPainter(ctx, { width, rtl, locale }) {
  const numberFormat = new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: 0 });
  const mx = (x) => (rtl ? width - x : x);
  const mapAlign = (align = 'start') => {
    if (align === 'center') return 'center';
    if (align === 'end') return rtl ? 'left' : 'right';
    return rtl ? 'right' : 'left';
  };
  const setFont = (size, weight = 600) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
  };
  const measure = (value, size, weight = 600) => {
    ctx.save();
    setFont(size, weight);
    const result = ctx.measureText(String(value ?? '')).width;
    ctx.restore();
    return result;
  };
  const ellipsize = (value, size, weight, maxWidth) => {
    let label = String(value ?? '');
    if (!maxWidth || measure(label, size, weight) <= maxWidth) return label;
    while (label.length > 1 && measure(`${label}…`, size, weight) > maxWidth) {
      label = label.slice(0, -1);
    }
    return `${label}…`;
  };
  const text = (value, x, y, options = {}) => {
    const size = options.size || 24;
    const weight = options.weight || 600;
    ctx.save();
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = mapAlign(options.align);
    ctx.textBaseline = options.baseline || 'alphabetic';
    ctx.fillStyle = options.color || '#fff';
    setFont(size, weight);
    ctx.fillText(ellipsize(value, size, weight, options.maxWidth), mx(x), y);
    ctx.restore();
  };
  const fitText = (value, x, y, maxWidth, options = {}) => {
    let size = options.size || 24;
    const minSize = options.minSize || 16;
    while (size > minSize && measure(value, size, options.weight || 600) > maxWidth) size -= 1;
    text(value, x, y, { ...options, size, maxWidth });
    return size;
  };
  const rect = (x, y, w, h, radius, fill, stroke = '') => {
    const left = rtl ? width - x - w : x;
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(left + r, y);
    ctx.arcTo(left + w, y, left + w, y + h, r);
    ctx.arcTo(left + w, y + h, left, y + h, r);
    ctx.arcTo(left, y + h, left, y, r);
    ctx.arcTo(left, y, left + w, y, r);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };
  const wrap = (value, size, weight, maxWidth) => {
    const words = String(value ?? '')
      .split(/\s+/)
      .filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && measure(candidate, size, weight) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    return lines;
  };
  return {
    number: (value) => numberFormat.format(Number(value) || 0),
    measure,
    text,
    fitText,
    rect,
    wrap,
  };
}

const PAD = 48;
const ROW_HEIGHT = 74;
const TABLE_HEAD = 52;
// Heading (24) + label row (40) + 88px cards + 12px breathing room.
const SCORING_HEIGHT = 140;

function layoutUploadChips(paint, uploads, maxWidth, tr, number) {
  const chipHeight = 42;
  const gap = 10;
  const maxLines = 3;
  const chips = uploads.map((upload) => {
    const label = `${upload.label} · ${number(upload.count)}`;
    return { label, width: Math.min(maxWidth, paint.measure(label, 20, 650) + 32) };
  });
  const placed = [];
  let x = 0;
  let line = 0;
  for (let index = 0; index < chips.length; index += 1) {
    const chip = chips[index];
    if (x > 0 && x + chip.width > maxWidth) {
      line += 1;
      x = 0;
    }
    if (line >= maxLines) {
      const remaining = chips.length - index;
      const more = tr('adminDutyExportMore', { count: number(remaining) });
      // Replace the last chip of the final line with the overflow marker.
      const last = placed.at(-1);
      if (last) {
        last.label = more;
        last.width = paint.measure(more, 20, 650) + 32;
        last.more = true;
      }
      break;
    }
    placed.push({ ...chip, x, line });
    x += chip.width + gap;
  }
  const lines = placed.length ? Math.max(...placed.map((chip) => chip.line)) + 1 : 0;
  return { placed, height: lines ? lines * chipHeight + (lines - 1) * gap : 0, chipHeight, gap };
}

function drawPage(canvas, model, pageRows, pageIndex, pageCount, settings) {
  const { tr, palette, accent, rtl, locale, branding, drawFooter } = settings;
  const width = DUTY_EXPORT_WIDTH;
  const inner = width - PAD * 2;
  const measureCtx = canvas.getContext('2d');
  const paint0 = createPainter(measureCtx, { width, rtl, locale });
  const first = pageIndex === 0;

  // Measure the variable parts first; resizing the canvas resets its context.
  const chipLayout = first
    ? layoutUploadChips(paint0, model.uploads, inner - 48, tr, paint0.number)
    : null;
  const footerLines = paint0.wrap(tr('adminDutyExportFooter'), 26, 750, inner - 64);
  const headerHeight = first ? 214 : 176;
  const scoringHeight = first && model.scoring ? 24 + SCORING_HEIGHT : 0;
  const summaryHeight = first ? 150 + 56 + scoringHeight : 0;
  const uploadsHeight = first && chipLayout.placed.length ? 60 + chipLayout.height + 40 : 0;
  const tableHeight = TABLE_HEAD + Math.max(1, pageRows.length) * ROW_HEIGHT + 16;
  const footerHeight = 40 + footerLines.length * 36 + 40 + 96;
  const height = headerHeight + summaryHeight + uploadsHeight + tableHeight + footerHeight;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const paint = createPainter(ctx, { width, rtl, locale });
  const { number } = paint;

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createLinearGradient(0, 0, 0, 260);
  glow.addColorStop(0, withAlpha(accent, 0.22));
  glow.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, 260);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 10);

  // Header
  paint.text(branding.displayName, PAD, 58, {
    size: 20,
    weight: 700,
    color: palette.muted,
    maxWidth: inner - 220,
  });
  if (pageCount > 1) {
    const pageLabel = tr('adminDutyExportPage', { page: pageIndex + 1, pages: pageCount });
    const pillWidth = paint.measure(pageLabel, 20, 750) + 32;
    paint.rect(width - PAD - pillWidth, 32, pillWidth, 38, 19, withAlpha(accent, 0.18), accent);
    paint.text(pageLabel, width - PAD - pillWidth / 2, 58, {
      size: 20,
      weight: 750,
      color: palette.text,
      align: 'center',
    });
  }
  paint.fitText(model.categoryLabel, PAD, first ? 124 : 116, inner, {
    size: first ? 56 : 44,
    minSize: 30,
    weight: 850,
    color: palette.text,
  });
  const subtitle = [
    model.group,
    model.dateRange,
    `${tr('adminSummaryUploads')}: ${number(model.summary.uploads)}`,
  ]
    .filter(Boolean)
    .join('  ·  ');
  paint.fitText(subtitle, PAD, first ? 170 : 156, inner, {
    size: 26,
    minSize: 18,
    weight: 650,
    color: accent,
  });

  let y = headerHeight;

  if (first) {
    const tiles = [
      [tr('adminDutyExportTotalDuties'), model.summary.totalDuties, accent],
      [tr('adminDutyExportPlayers'), model.summary.uniquePlayers, palette.text],
      [tr('adminDutyAccountMain'), model.summary.main, palette.text],
      [tr('adminDutyAccountBanner'), model.summary.banner, palette.text],
    ];
    const gap = 16;
    const tileWidth = (inner - gap * 3) / 4;
    tiles.forEach(([label, value, tone], index) => {
      const x = PAD + index * (tileWidth + gap);
      paint.rect(x, y, tileWidth, 130, 20, palette.surface, palette.line);
      paint.text(number(value), x + 24, y + 70, { size: 50, weight: 850, color: tone });
      paint.fitText(label, x + 24, y + 108, tileWidth - 48, {
        size: 22,
        minSize: 15,
        weight: 650,
        color: palette.muted,
      });
    });
    y += 150;
    // Main vs banner split bar
    const total = model.summary.main + model.summary.banner;
    const barY = y + 6;
    paint.rect(PAD, barY, inner, 18, 9, palette.raised);
    if (total > 0) {
      const mainWidth = Math.round((inner * model.summary.main) / total);
      if (mainWidth > 0) paint.rect(PAD, barY, mainWidth, 18, 9, accent);
      if (inner - mainWidth > 0) {
        paint.rect(PAD + mainWidth, barY, inner - mainWidth, 18, 9, withAlpha(accent, 0.4));
      }
    }
    const pct = (value) => (total ? Math.round((value / total) * 100) : 0);
    paint.text(`${tr('adminDutyAccountMain')} ${pct(model.summary.main)}%`, PAD, barY + 48, {
      size: 20,
      weight: 700,
      color: palette.muted,
    });
    paint.text(
      `${tr('adminDutyAccountBanner')} ${pct(model.summary.banner)}%`,
      width - PAD,
      barY + 48,
      { size: 20, weight: 700, color: palette.muted, align: 'end' }
    );
    y += 56;

    if (model.scoring) {
      y += 24;
      // How the season scores this category: one card per account class with
      // its weight and what one duty is worth, so members can check their points.
      const scoring = model.scoring;
      paint.text(tr('adminDutyExportScoringHeading'), PAD, y + 24, {
        size: 22,
        weight: 800,
        color: palette.text,
        maxWidth: inner * 0.6,
      });
      if (scoring.support !== 1) {
        paint.text(
          tr('adminDutyExportSupportNote', { weight: number(scoring.support) }),
          width - PAD,
          y + 24,
          { size: 18, weight: 650, color: palette.muted, align: 'end', maxWidth: inner * 0.38 }
        );
      }
      const cardY = y + 40;
      const cardGap = 16;
      const cardWidth = (inner - cardGap) / 2;
      [
        [tr('adminDutyAccountMain'), scoring.mainWeight, scoring.mainPoints, accent],
        [tr('adminDutyAccountBanner'), scoring.bannerWeight, scoring.bannerPoints, palette.text],
      ].forEach(([label, weight, points, tone], index) => {
        const x = PAD + index * (cardWidth + cardGap);
        paint.rect(x, cardY, cardWidth, 88, 18, palette.surface, palette.line);
        paint.text(label, x + 22, cardY + 36, {
          size: 22,
          weight: 800,
          color: tone,
          maxWidth: cardWidth * 0.45,
        });
        paint.text(
          tr('adminDutyExportWeight', { weight: number(weight) }),
          x + cardWidth - 22,
          cardY + 36,
          {
            size: 20,
            weight: 700,
            color: palette.muted,
            align: 'end',
            maxWidth: cardWidth * 0.5,
          }
        );
        paint.fitText(
          tr('adminDutyExportPerDuty', { points: number(points) }),
          x + 22,
          cardY + 72,
          cardWidth - 44,
          {
            size: 24,
            minSize: 16,
            weight: 750,
            color: palette.text,
          }
        );
      });
      y += SCORING_HEIGHT;
    }

    if (chipLayout.placed.length) {
      y += 20;
      paint.text(tr('adminDutyExportUploadsHeading'), PAD, y + 26, {
        size: 22,
        weight: 800,
        color: palette.text,
      });
      y += 44;
      chipLayout.placed.forEach((chip) => {
        const chipY = y + chip.line * (chipLayout.chipHeight + chipLayout.gap);
        paint.rect(
          PAD + chip.x,
          chipY,
          chip.width,
          chipLayout.chipHeight,
          chipLayout.chipHeight / 2,
          chip.more ? palette.raised : withAlpha(accent, 0.14),
          chip.more ? palette.line : withAlpha(accent, 0.55)
        );
        paint.text(chip.label, PAD + chip.x + 16, chipY + 28, {
          size: 20,
          weight: 650,
          color: palette.text,
          maxWidth: chip.width - 32,
        });
      });
      y += chipLayout.height + 36;
    }
  }

  // Table
  const withPoints = Boolean(model.scoring);
  const cols = withPoints
    ? {
        rank: { x: PAD + 20, w: 56 },
        name: { x: PAD + 92 },
        points: { x: width - PAD - 20 },
        count: { x: width - PAD - 170 },
        banner: { x: width - PAD - 262 },
        main: { x: width - PAD - 362 },
      }
    : {
        rank: { x: PAD + 20, w: 56 },
        name: { x: PAD + 92 },
        count: { x: width - PAD - 20 },
        banner: { x: width - PAD - 150 },
        main: { x: width - PAD - 262 },
      };
  const nameWidth = cols.main.x - 70 - cols.name.x;
  paint.rect(PAD, y, inner, tableHeight - 16, 22, palette.surface, palette.line);
  paint.text('#', cols.rank.x + cols.rank.w / 2, y + 34, {
    size: 19,
    weight: 800,
    color: palette.muted,
    align: 'center',
  });
  paint.text(tr('adminDutyExportColPlayer'), cols.name.x, y + 34, {
    size: 19,
    weight: 800,
    color: palette.muted,
    maxWidth: nameWidth,
  });
  [
    ['main', tr('adminDutyAccountMain')],
    ['banner', tr('adminDutyAccountBanner')],
    ['count', tr('adminDutyExportColCount')],
    ...(withPoints ? [['points', tr('adminDutyExportColPoints')]] : []),
  ].forEach(([key, label]) => {
    paint.text(label, cols[key].x, y + 34, {
      size: 19,
      weight: 800,
      color: key === 'count' || key === 'points' ? accent : palette.muted,
      align: 'end',
      maxWidth: key === 'points' ? 130 : 90,
    });
  });
  ctx.fillStyle = palette.line;
  ctx.fillRect(PAD, y + TABLE_HEAD, inner, 2);
  y += TABLE_HEAD;

  if (!pageRows.length) {
    paint.text(tr('adminDutyExportNoRows'), width / 2, y + ROW_HEIGHT / 2 + 8, {
      size: 22,
      weight: 650,
      color: palette.muted,
      align: 'center',
    });
  }
  pageRows.forEach((row, index) => {
    const rowY = y + index * ROW_HEIGHT;
    if (index % 2 === 1) {
      ctx.fillStyle = palette.zebra;
      ctx.fillRect(PAD + 2, rowY, inner - 4, ROW_HEIGHT);
    }
    const top3 = row.rank <= 3;
    const badgeX = cols.rank.x + cols.rank.w / 2;
    if (top3) {
      ctx.beginPath();
      ctx.arc(rtl ? width - badgeX : badgeX, rowY + ROW_HEIGHT / 2, 20, 0, Math.PI * 2);
      ctx.fillStyle = withAlpha(accent, 0.9);
      ctx.fill();
    }
    paint.text(number(row.rank), badgeX, rowY + ROW_HEIGHT / 2 + 8, {
      size: 22,
      weight: 850,
      color: top3 ? palette.background : palette.muted,
      align: 'center',
    });
    const breakdown = row.uploads
      .map((upload) =>
        upload.count > 1 ? `${upload.label} ×${number(upload.count)}` : upload.label
      )
      .join(' · ');
    paint.text(row.name, cols.name.x, rowY + (breakdown ? 33 : 46), {
      size: 26,
      weight: 750,
      color: palette.text,
      maxWidth: nameWidth,
    });
    if (breakdown) {
      paint.text(breakdown, cols.name.x, rowY + 60, {
        size: 18,
        weight: 550,
        color: palette.muted,
        maxWidth: nameWidth,
      });
    }
    paint.text(number(row.main), cols.main.x, rowY + 46, {
      size: 24,
      weight: 650,
      color: row.main ? palette.text : palette.muted,
      align: 'end',
    });
    paint.text(number(row.banner), cols.banner.x, rowY + 46, {
      size: 24,
      weight: 650,
      color: row.banner ? palette.text : palette.muted,
      align: 'end',
    });
    paint.text(number(row.count), cols.count.x, rowY + 47, {
      size: 30,
      weight: 850,
      color: accent,
      align: 'end',
    });
    if (withPoints) {
      paint.text(number(row.points), cols.points.x, rowY + 46, {
        size: 24,
        weight: 800,
        color: palette.text,
        align: 'end',
        maxWidth: 140,
      });
    }
    if (index < pageRows.length - 1) {
      ctx.fillStyle = withAlpha(palette.line, 0.6);
      ctx.fillRect(PAD + 16, rowY + ROW_HEIGHT - 1, inner - 32, 1);
    }
  });
  y += Math.max(1, pageRows.length) * ROW_HEIGHT + 16;

  // Footer call to action
  y += 32;
  const calloutHeight = footerLines.length * 36 + 32;
  paint.rect(PAD, y, inner, calloutHeight, 18, withAlpha(accent, 0.12), withAlpha(accent, 0.6));
  paint.rect(PAD, y, 8, calloutHeight, 4, accent);
  footerLines.forEach((line, index) => {
    paint.text(line, PAD + 32, y + 42 + index * 36, {
      size: 26,
      weight: 750,
      color: palette.text,
      maxWidth: inner - 64,
    });
  });
  y += calloutHeight + 44;

  ctx.save();
  if (rtl) ctx.direction = 'ltr';
  drawFooter(ctx, branding, {
    x: PAD,
    y,
    width: inner,
    accentColor: accent,
    mutedColor: palette.muted,
    fontLine1: `700 18px ${FONT}`,
    fontLine2: `500 15px ${FONT}`,
    lineGap: 24,
  });
  ctx.restore();
  return canvas;
}

// The branding helpers reach into the app state module, which needs a browser;
// loading them on first render keeps the model importable in Node tests.
let brandingModulePromise = null;

/** Render every page of the model; resolves to one canvas per page. */
export async function renderDutyExportPages(model, options = {}) {
  if (typeof document === 'undefined') {
    throw new Error('Duty list PNG export requires a browser document.');
  }
  const tr = makeTranslator(options.t);
  const theme = resolveTheme(options.theme);
  const palette = PALETTES[theme];
  const accent = options.accent || palette.accents[model.category] || palette.accents.banner;
  const direction = options.direction || document.documentElement?.dir || 'ltr';
  brandingModulePromise ||= import('./export-branding.js');
  const { drawCanvasFooter, getExportBranding } = await brandingModulePromise;
  // Duty lists are the alliance's own records, so they carry no data credits.
  const branding = options.branding || { ...getExportBranding(), sourceCredits: [] };
  const pages = paginateDutyExportRows(model.rows, options.perPage);
  return pages.map((rows, index) => {
    const canvas = document.createElement('canvas');
    canvas.width = DUTY_EXPORT_WIDTH;
    canvas.height = 10;
    if (!canvas.getContext('2d')) throw new Error('Canvas 2D is unavailable.');
    return drawPage(canvas, model, rows, index, pages.length, {
      tr,
      palette,
      accent,
      rtl: direction === 'rtl',
      locale: options.locale,
      branding,
      drawFooter: drawCanvasFooter,
    });
  });
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Duty list PNG encoding failed.'));
    }, 'image/png');
  });
}

function slug(value) {
  return (
    String(value || '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'duty'
  );
}

export function dutyExportFileName(model, pageIndex = 0, pageCount = 1) {
  const parts = ['duty', slug(model.category), model.group ? slug(model.group) : '', model.dateTo];
  const base = parts.filter(Boolean).join('-');
  return pageCount > 1 ? `${base}-${pageIndex + 1}of${pageCount}.png` : `${base}.png`;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Share the pages through the system share sheet when the browser can share
 * files (phones), otherwise download each page.
 * @returns {Promise<'shared'|'downloaded'|'cancelled'>}
 */
export async function deliverDutyExportPages(model, canvases, options = {}) {
  const blobs = await Promise.all(canvases.map(canvasBlob));
  const names = blobs.map((_, index) => dutyExportFileName(model, index, blobs.length));
  if (options.share && typeof navigator !== 'undefined' && typeof File === 'function') {
    const files = blobs.map((blob, index) => new File([blob], names[index], { type: 'image/png' }));
    if (navigator.canShare?.({ files }) && typeof navigator.share === 'function') {
      try {
        await navigator.share({ files, title: model.title });
        return 'shared';
      } catch (error) {
        if (error?.name === 'AbortError') return 'cancelled';
        // Fall through to downloads when the share sheet refuses the files.
      }
    }
  }
  for (let index = 0; index < blobs.length; index += 1) {
    downloadBlob(blobs[index], names[index]);
    if (index < blobs.length - 1) await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return 'downloaded';
}

/** Build, render and deliver in one call (used by tests and quick actions). */
export async function exportDutyListPng(records, options = {}) {
  if (typeof document !== 'undefined' && document.fonts?.ready) await document.fonts.ready;
  const model = buildDutyExportModel(records, options);
  const canvases = await renderDutyExportPages(model, options);
  const result = await deliverDutyExportPages(model, canvases, options);
  return { model, pages: canvases.length, result };
}

// ---------------------------------------------------------------------------
// Chooser dialog: pick the uploads (all or one group), preview, then share.
// ---------------------------------------------------------------------------

const DIALOG_STYLE_ID = 'dutyListExportStyles';
const DIALOG_CSS = `
.duty-export-dialog{border:1px solid var(--border,#2a3b55);border-radius:16px;padding:0;max-width:min(560px,calc(100vw - 32px));width:100%;background:var(--surface,#101c2e);color:var(--text-primary,#f3f7fc);box-shadow:0 24px 64px rgba(0,0,0,.45)}
.duty-export-dialog::backdrop{background:rgba(5,10,18,.6)}
.duty-export-dialog form{display:flex;flex-direction:column;gap:14px;padding:20px}
.duty-export-dialog h2{margin:0;font-size:1.1rem}
.duty-export-dialog label{display:flex;flex-direction:column;gap:6px;font-size:.8rem;color:var(--text-muted,#9db0c8)}
.duty-export-dialog select{min-height:40px;border-radius:10px;padding:0 10px;font:inherit;font-size:.95rem;color:inherit;background:var(--surface-2,rgba(255,255,255,.06));border:1px solid var(--border,#2a3b55)}
.duty-export-dialog [data-duty-export-summary]{margin:0;font-size:.85rem;color:var(--text-muted,#9db0c8);min-height:1.2em}
.duty-export-dialog .duty-export-preview{display:flex;justify-content:center;background:rgba(0,0,0,.18);border-radius:12px;padding:8px;max-height:46vh;overflow:auto}
.duty-export-dialog .duty-export-preview img{max-width:100%;height:auto;border-radius:8px}
.duty-export-dialog .duty-export-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
`;

function ensureDialogStyles() {
  if (document.getElementById(DIALOG_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = DIALOG_STYLE_ID;
  style.textContent = DIALOG_CSS;
  document.head.append(style);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Open the chooser for one duty category. `records` are that category's
 * uploads; the rest of the options pass through to buildDutyExportModel and
 * renderDutyExportPages.
 */
export function openDutyExportDialog(options = {}) {
  const tr = makeTranslator(options.t);
  const records = Array.isArray(options.records) ? options.records : [];
  const meta = categoryMeta(options.category);
  const inCategory = records.filter((record) => !meta || meta.types.includes(record?.type));
  const groups = collectDutyRecordGroups(inCategory);
  const initialGroup = groups.find(
    (group) =>
      group.toLocaleLowerCase() ===
      normalizeDutyRecordGroup(options.initialGroup).toLocaleLowerCase()
  );
  const categoryLabel = asText(options.categoryLabel) || meta?.label || '';
  ensureDialogStyles();
  document.querySelectorAll('dialog.duty-export-dialog').forEach((node) => node.remove());
  const dialog = document.createElement('dialog');
  dialog.className = 'duty-export-dialog';
  if (options.direction) dialog.dir = options.direction;
  const countIn = (group) => inCategory.filter((record) => dutyRecordInGroup(record, group)).length;
  const canShareFiles =
    typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';
  dialog.innerHTML = `<form method="dialog">
    <h2>${escapeHtml(tr('adminDutyExportDialogTitle', { label: categoryLabel }))}</h2>
    <label>${escapeHtml(tr('adminDutyExportGroupLabel'))}
      <select data-duty-export-group name="dutyExportGroup">
        <option value="">${escapeHtml(tr('adminDutyGroupFilterAll'))} (${countIn('')})</option>
        ${groups
          .map(
            (group) =>
              `<option value="${escapeHtml(group)}"${group === initialGroup ? ' selected' : ''}>${escapeHtml(group)} (${countIn(group)})</option>`
          )
          .join('')}
      </select>
    </label>
    <p data-duty-export-summary aria-live="polite"></p>
    <div class="duty-export-preview"><img data-duty-export-preview alt="${escapeHtml(tr('adminDutyExportPreviewAlt'))}" hidden></div>
    <div class="duty-export-actions">
      <button type="button" class="dash-btn" data-duty-export-close>${escapeHtml(tr('adminDutyExportClose'))}</button>
      <button type="button" class="dash-btn" data-duty-export-download>${escapeHtml(tr('adminDutyExportDownload'))}</button>
      ${canShareFiles ? `<button type="button" class="dash-btn dash-btn-primary" data-duty-export-share>${escapeHtml(tr('adminDutyExportShare'))}</button>` : ''}
    </div>
  </form>`;
  (options.container || document.body).append(dialog);

  const select = dialog.querySelector('[data-duty-export-group]');
  const summary = dialog.querySelector('[data-duty-export-summary]');
  const preview = dialog.querySelector('[data-duty-export-preview]');
  const buttons = Array.from(
    dialog.querySelectorAll('[data-duty-export-download], [data-duty-export-share]')
  );
  let current = null;
  let previewUrl = '';
  let renderSeq = 0;

  const setBusy = (busy) => {
    buttons.forEach((button) => {
      button.disabled = busy;
    });
  };

  const refresh = async () => {
    const seq = (renderSeq += 1);
    summary.textContent = tr('adminDutyExportWorking');
    setBusy(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const model = buildDutyExportModel(inCategory, {
        ...options,
        categoryLabel,
        group: select.value,
      });
      const canvases = await renderDutyExportPages(model, options);
      if (seq !== renderSeq) return;
      current = { model, canvases };
      summary.textContent = tr('adminDutyExportPreviewSummary', {
        players: model.summary.uniquePlayers,
        duties: model.summary.totalDuties,
        pages: canvases.length,
      });
      const blob = await canvasBlob(canvases[0]);
      if (seq !== renderSeq) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
      preview.src = previewUrl;
      preview.hidden = false;
      setBusy(false);
    } catch (error) {
      console.error('[duty-export]', error);
      summary.textContent = tr('adminDutyExportFailed');
    }
  };

  const deliver = async (share) => {
    if (!current) return;
    setBusy(true);
    try {
      await deliverDutyExportPages(current.model, current.canvases, { share });
    } catch (error) {
      console.error('[duty-export]', error);
      summary.textContent = tr('adminDutyExportFailed');
    } finally {
      setBusy(false);
    }
  };

  select.addEventListener('change', () => {
    options.onGroupChange?.(select.value);
    refresh();
  });
  dialog
    .querySelector('[data-duty-export-download]')
    ?.addEventListener('click', () => deliver(false));
  dialog.querySelector('[data-duty-export-share]')?.addEventListener('click', () => deliver(true));
  dialog.querySelector('[data-duty-export-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    dialog.remove();
  });
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  refresh();
  return dialog;
}
