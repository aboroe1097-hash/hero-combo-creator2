const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 1200;
const ROUTE_CAPACITY = 100;
const RESERVED_SEATS = 5;

const COLORS = Object.freeze({
  background: '#07111f',
  surface: '#0d1a2b',
  surfaceRaised: '#122238',
  line: '#29415e',
  text: '#f3f7fc',
  muted: '#9db0c8',
  v3s: '#58c7e8',
  vts: '#a98cf5',
  reserved: '#f1bf52',
  success: '#55d6a5',
  warning: '#f0ae61',
});

function asNumber(value) {
  const parsed = Number(typeof value === 'string' ? value.replaceAll(',', '') : value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim();
}

function allianceId(row) {
  const value = asText(row?.allianceId || row?.alliance).toLocaleLowerCase();
  if (value.includes('v3s')) return 'v3s';
  if (value.includes('vts')) return 'vts';
  return value || 'other';
}

function isMatched(row) {
  return asText(row?.matchStatus) === 'matched';
}

function isManualMatch(row) {
  return isMatched(row) && asText(row?.matchMethod).toLocaleLowerCase().includes('manual');
}

function hasContribution(row) {
  return (
    asNumber(row?.contribution) !== 0 ||
    asNumber(row?.exGuild) !== 0 ||
    asNumber(row?.base) !== 0 ||
    asNumber(row?.extended) !== 0
  );
}

function compareByPower(left, right) {
  return (
    asNumber(right?.totalPower) - asNumber(left?.totalPower) ||
    asNumber(right?.castleLevel) - asNumber(left?.castleLevel) ||
    asText(left?.accountName).localeCompare(asText(right?.accountName), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );
}

function summarizeSelection(rows, capacity, reservedSeats) {
  const kept = rows.slice(0, Math.max(0, capacity - reservedSeats));
  const last = kept.at(-1);
  return {
    capacity,
    keptCount: kept.length,
    reservedSeats,
    openSeats: Math.max(0, capacity - reservedSeats - kept.length),
    cutoffPower: last ? asNumber(last.totalPower) : 0,
    c30Count: kept.filter((row) => asNumber(row.castleLevel) >= 30).length,
    allianceCounts: {
      v3s: kept.filter((row) => allianceId(row) === 'v3s').length,
      vts: kept.filter((row) => allianceId(row) === 'vts').length,
      other: kept.filter((row) => !['v3s', 'vts'].includes(allianceId(row))).length,
    },
  };
}

function summarizeAlliance(rows, id) {
  const allianceRows = rows.filter((row) => allianceId(row) === id);
  const matchedCount = allianceRows.filter(isMatched).length;
  return {
    id,
    accountCount: allianceRows.length,
    matchedCount,
    unmatchedCount: allianceRows.length - matchedCount,
    coveragePercent: allianceRows.length
      ? Math.round((matchedCount / allianceRows.length) * 100)
      : 0,
    c30Count: allianceRows.filter((row) => asNumber(row.castleLevel) >= 30).length,
    totalPower: allianceRows.reduce((total, row) => total + asNumber(row.totalPower), 0),
  };
}

/** Build a deterministic, presentation-ready summary from the currently loaded Alliance View rows. */
export function buildAllianceBriefModel(rows = [], options = {}) {
  const ranked = [...rows].sort(compareByPower);
  const matchedCount = ranked.filter(isMatched).length;
  const manualMatches = ranked.filter(isManualMatch);
  const generatedAt =
    options.generatedAt instanceof Date
      ? options.generatedAt
      : new Date(options.generatedAt || Date.now());

  return {
    generatedAt,
    season: asText(options.season) || '—',
    accountCount: ranked.length,
    matchedCount,
    unmatchedCount: ranked.length - matchedCount,
    manualMatchCount: manualMatches.length,
    manualWithContributionCount: manualMatches.filter(hasContribution).length,
    routeFull: summarizeSelection(ranked, ROUTE_CAPACITY, 0),
    routeReserve: summarizeSelection(ranked, ROUTE_CAPACITY, RESERVED_SEATS),
    alliances: {
      v3s: summarizeAlliance(ranked, 'v3s'),
      vts: summarizeAlliance(ranked, 'vts'),
    },
  };
}

function roundedRect(ctx, x, y, width, height, radius = 20) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function fillRoundedRect(ctx, x, y, width, height, radius, fill, stroke = '') {
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function createTextTools(ctx, locale, direction) {
  const rtl = direction === 'rtl';
  const numberFormat = new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: 0 });
  const compactFormat = new Intl.NumberFormat(locale || undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });

  function setFont(size, weight = 600) {
    ctx.font = `${weight} ${size}px Inter, "Segoe UI", Arial, sans-serif`;
  }

  function text(value, x, y, options = {}) {
    ctx.save();
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = options.align || (rtl ? 'right' : 'left');
    ctx.textBaseline = options.baseline || 'alphabetic';
    ctx.fillStyle = options.color || COLORS.text;
    setFont(options.size || 30, options.weight || 600);
    const target = String(value ?? '');
    if (options.maxWidth) ctx.fillText(target, x, y, options.maxWidth);
    else ctx.fillText(target, x, y);
    ctx.restore();
  }

  function wrappedText(value, x, y, maxWidth, options = {}) {
    const words = String(value ?? '')
      .split(/\s+/)
      .filter(Boolean);
    const lines = [];
    let line = '';
    ctx.save();
    ctx.direction = rtl ? 'rtl' : 'ltr';
    setFont(options.size || 26, options.weight || 500);
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    ctx.restore();
    const lineHeight = options.lineHeight || Math.round((options.size || 26) * 1.35);
    lines
      .slice(0, options.maxLines || 4)
      .forEach((lineText, index) =>
        text(lineText, x, y + index * lineHeight, { ...options, maxWidth })
      );
    return Math.min(lines.length, options.maxLines || 4) * lineHeight;
  }

  function fitText(value, x, y, maxWidth, options = {}) {
    const target = String(value ?? '');
    let size = options.size || 26;
    const minSize = options.minSize || 14;
    ctx.save();
    ctx.direction = rtl ? 'rtl' : 'ltr';
    while (size > minSize) {
      setFont(size, options.weight || 500);
      if (ctx.measureText(target).width <= maxWidth) break;
      size -= 1;
    }
    ctx.restore();
    text(target, x, y, { ...options, size, maxWidth });
    return size;
  }

  return {
    rtl,
    number: (value) => numberFormat.format(asNumber(value)),
    compact: (value) => compactFormat.format(asNumber(value)),
    text,
    wrappedText,
    fitText,
  };
}

function drawSummaryMetric(
  ctx,
  tools,
  x,
  y,
  width,
  value,
  label,
  tone = COLORS.text,
  sublabel = ''
) {
  fillRoundedRect(ctx, x, y, width, 124, 18, COLORS.surfaceRaised, COLORS.line);
  const textX = tools.rtl ? x + width - 22 : x + 22;
  tools.text(value, textX, y + 44, { size: 34, weight: 800, color: tone });
  tools.fitText(label, textX, y + 78, width - 44, {
    size: 18,
    minSize: 13,
    weight: 650,
    color: COLORS.muted,
  });
  if (sublabel) {
    tools.fitText(sublabel, textX, y + 104, width - 44, {
      size: 17,
      minSize: 13,
      weight: 600,
      color: tone,
    });
  }
}

function drawCompositionBar(ctx, x, y, width, counts, reservedSeats = 0) {
  const total = counts.v3s + counts.vts + counts.other + reservedSeats;
  fillRoundedRect(ctx, x, y, width, 30, 15, COLORS.line);
  if (!total) return;
  ctx.save();
  roundedRect(ctx, x, y, width, 30, 15);
  ctx.clip();
  let cursor = x;
  const segments = [
    [counts.v3s, COLORS.v3s],
    [counts.vts, COLORS.vts],
    [counts.other, COLORS.muted],
    [reservedSeats, COLORS.reserved],
  ];
  for (const [value, color] of segments) {
    if (!value) continue;
    const segmentWidth = (value / total) * width;
    ctx.fillStyle = color;
    ctx.fillRect(cursor, y, segmentWidth, 30);
    cursor += segmentWidth;
  }
  ctx.restore();
  roundedRect(ctx, x, y, width, 30, 15);
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawLegendItem(ctx, tools, x, y, color, label) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 7, 8, 0, Math.PI * 2);
  ctx.fill();
  tools.text(label, x + 18, y, { size: 20, weight: 650, align: 'left' });
}

function drawRouteCard(ctx, tools, model, x, y, width, height, copy, reserve = false) {
  const route = reserve ? model.routeReserve : model.routeFull;
  fillRoundedRect(ctx, x, y, width, height, 24, COLORS.surface, COLORS.line);
  const contentX = tools.rtl ? x + width - 32 : x + 32;
  const titleHeight = tools.wrappedText(
    reserve ? copy.routeReserve : copy.routeFull,
    contentX,
    y + 52,
    width - 64,
    {
      size: 27,
      lineHeight: 32,
      maxLines: 2,
      weight: 800,
    }
  );
  const titleExtra = Math.max(0, titleHeight - 32);
  tools.text(copy.powerBasis, contentX, y + 88 + titleExtra, {
    size: 20,
    weight: 600,
    color: COLORS.muted,
  });

  const keptLabel = `${tools.number(route.keptCount)} ${copy.kept}`;
  const reservedLabel = `${tools.number(route.reservedSeats)} ${copy.reserved}`;
  tools.text(keptLabel, contentX, y + 142 + titleExtra, { size: 38, weight: 850 });
  if (route.reservedSeats) {
    tools.text(reservedLabel, contentX, y + 176 + titleExtra, {
      size: 21,
      weight: 700,
      color: COLORS.reserved,
    });
  }

  drawCompositionBar(
    ctx,
    x + 32,
    y + 202 + titleExtra,
    width - 64,
    route.allianceCounts,
    route.reservedSeats
  );
  drawLegendItem(
    ctx,
    tools,
    x + 42,
    y + 270 + titleExtra,
    COLORS.v3s,
    `V3S ${tools.number(route.allianceCounts.v3s)}`
  );
  drawLegendItem(
    ctx,
    tools,
    x + 192,
    y + 270 + titleExtra,
    COLORS.vts,
    `VTS ${tools.number(route.allianceCounts.vts)}`
  );
  if (route.reservedSeats) {
    drawLegendItem(
      ctx,
      tools,
      x + 342,
      y + 270 + titleExtra,
      COLORS.reserved,
      `${copy.reserved} ${tools.number(route.reservedSeats)}`
    );
  }

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 32, y + 298 + titleExtra);
  ctx.lineTo(x + width - 32, y + 298 + titleExtra);
  ctx.stroke();

  const statWidth = (width - 80) / 2;
  const leftLabel = tools.rtl ? x + width - 32 : x + 32;
  const rightLabel = tools.rtl ? x + width - 32 - statWidth - 16 : x + 48 + statWidth;
  tools.text(copy.powerCutoff, leftLabel, y + 336 + titleExtra, {
    size: 19,
    color: COLORS.muted,
  });
  tools.text(tools.compact(route.cutoffPower), leftLabel, y + 376 + titleExtra, {
    size: 31,
    weight: 850,
  });
  tools.text(copy.c30Accounts, rightLabel, y + 336 + titleExtra, {
    size: 19,
    color: COLORS.muted,
  });
  tools.text(tools.number(route.c30Count), rightLabel, y + 376 + titleExtra, {
    size: 31,
    weight: 850,
    color: COLORS.success,
  });
}

function drawComparisonBar(ctx, tools, x, y, width, label, value, max, color, suffix = '') {
  tools.text(label, x, y, { size: 21, weight: 750, align: 'left' });
  tools.text(`${tools.number(value)}${suffix}`, x + width, y, {
    size: 21,
    weight: 800,
    align: 'right',
    color,
  });
  fillRoundedRect(ctx, x, y + 16, width, 18, 9, COLORS.line);
  const fillWidth = max > 0 ? Math.max(5, (value / max) * width) : 0;
  if (fillWidth) fillRoundedRect(ctx, x, y + 16, fillWidth, 18, 9, color);
}

function resolveCopy(tr) {
  const translate = (key, fallback, values) => tr?.(key, fallback, values) || fallback;
  return {
    title: translate(
      'adminAllianceViewBriefTitle',
      'Alliance merge briefing: 100 now or 95 + 5 reserved'
    ),
    subtitle: translate(
      'adminAllianceViewBriefSubtitle',
      'Live roster strength and Eden coverage for the V3S–VTS merge'
    ),
    routeFull: translate('adminAllianceViewBriefRouteFull', 'Route A · Fill 100 now'),
    routeReserve: translate(
      'adminAllianceViewBriefRouteReserve',
      'Route B · Keep 95 + reserve 5 immigrant seats'
    ),
    powerBasis: translate('adminAllianceViewBriefPowerBasis', 'Ranked by total power'),
    powerCutoff: translate('adminAllianceViewBriefPowerCutoff', 'Power cutoff'),
    castleStrength: translate('adminAllianceViewBriefCastleStrength', 'Castle strength'),
    c30Accounts: translate('adminAllianceViewBriefC30Accounts', 'C30 accounts'),
    edenCoverage: translate('adminAllianceViewBriefEdenCoverage', 'Eden contribution coverage'),
    manualMatches: translate(
      'adminAllianceViewBriefRecoveredMatches',
      'Manual / recovered matches'
    ),
    withContribution: translate(
      'adminAllianceViewBriefWithContribution',
      '{count} with contribution'
    ),
    coverageCaveat: translate(
      'adminAllianceViewBriefCoverageCaveat',
      'Eden tracking coverage differs by alliance, so both routes use total power for a fair comparison.'
    ),
    feederNote: translate(
      'adminAllianceViewBriefFeederNote',
      'Accounts outside the keep route are feeder candidates, not automatic removals.'
    ),
    accounts: translate('adminAllianceViewSummaryAccounts', 'Accounts'),
    matched: translate('adminAllianceViewSummaryMatched', 'Matched'),
    unmatched: translate('adminAllianceViewSummaryUnmatched', 'Unmatched'),
    kept: translate('adminAllianceViewBriefKept', 'kept'),
    reserved: translate('adminAllianceViewBriefReserved', 'reserved'),
    generated: translate('adminAllianceViewBriefGenerated', 'Generated {date} · Season {season}'),
  };
}

export function renderAllianceBriefCanvas(model, options = {}) {
  if (typeof document === 'undefined') {
    throw new Error('Alliance briefing PNG export requires a browser document.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable.');

  const locale = options.locale || document.documentElement.lang || 'en';
  const direction = options.direction || document.documentElement.dir || 'ltr';
  const tools = createTextTools(ctx, locale, direction);
  const copy = resolveCopy(options.tr);
  const dateText = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    model.generatedAt
  );
  const generatedText = copy.generated
    .replaceAll('{date}', dateText)
    .replaceAll('{season}', model.season);

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const headerX = tools.rtl ? 1536 : 64;
  tools.fitText(copy.title, headerX, 78, 1472, { size: 42, minSize: 30, weight: 850 });
  tools.fitText(copy.subtitle, headerX, 119, 1472, {
    size: 24,
    minSize: 18,
    color: COLORS.muted,
    weight: 600,
  });
  tools.text(generatedText, headerX, 155, { size: 18, color: COLORS.muted, weight: 550 });

  const metricWidth = 350;
  const metricGap = 20;
  drawSummaryMetric(
    ctx,
    tools,
    64,
    186,
    metricWidth,
    tools.number(model.accountCount),
    copy.accounts
  );
  drawSummaryMetric(
    ctx,
    tools,
    64 + metricWidth + metricGap,
    186,
    metricWidth,
    tools.number(model.matchedCount),
    copy.matched,
    COLORS.success
  );
  drawSummaryMetric(
    ctx,
    tools,
    64 + (metricWidth + metricGap) * 2,
    186,
    metricWidth,
    tools.number(model.unmatchedCount),
    copy.unmatched,
    COLORS.warning
  );
  const recoveredLabel = copy.withContribution.replaceAll(
    '{count}',
    tools.number(model.manualWithContributionCount)
  );
  drawSummaryMetric(
    ctx,
    tools,
    64 + (metricWidth + metricGap) * 3,
    186,
    metricWidth,
    tools.number(model.manualMatchCount),
    copy.manualMatches,
    COLORS.v3s,
    recoveredLabel
  );

  drawRouteCard(ctx, tools, model, 64, 330, 716, 420, copy, false);
  drawRouteCard(ctx, tools, model, 820, 330, 716, 420, copy, true);

  fillRoundedRect(ctx, 64, 780, 716, 252, 24, COLORS.surface, COLORS.line);
  tools.fitText(copy.castleStrength, tools.rtl ? 748 : 96, 828, 652, {
    size: 28,
    minSize: 20,
    weight: 850,
  });
  tools.text(copy.c30Accounts, tools.rtl ? 748 : 96, 860, {
    size: 19,
    color: COLORS.muted,
  });
  const maxC30 = Math.max(model.alliances.v3s.c30Count, model.alliances.vts.c30Count, 1);
  drawComparisonBar(
    ctx,
    tools,
    96,
    906,
    652,
    'V3S',
    model.alliances.v3s.c30Count,
    maxC30,
    COLORS.v3s
  );
  drawComparisonBar(
    ctx,
    tools,
    96,
    966,
    652,
    'VTS',
    model.alliances.vts.c30Count,
    maxC30,
    COLORS.vts
  );

  fillRoundedRect(ctx, 820, 780, 716, 252, 24, COLORS.surface, COLORS.line);
  tools.fitText(copy.edenCoverage, tools.rtl ? 1504 : 852, 828, 652, {
    size: 28,
    minSize: 20,
    weight: 850,
  });
  const maxCoverage = 100;
  drawComparisonBar(
    ctx,
    tools,
    852,
    890,
    652,
    `V3S · ${tools.number(model.alliances.v3s.matchedCount)}/${tools.number(model.alliances.v3s.accountCount)}`,
    model.alliances.v3s.coveragePercent,
    maxCoverage,
    COLORS.v3s,
    '%'
  );
  drawComparisonBar(
    ctx,
    tools,
    852,
    966,
    652,
    `VTS · ${tools.number(model.alliances.vts.matchedCount)}/${tools.number(model.alliances.vts.accountCount)}`,
    model.alliances.vts.coveragePercent,
    maxCoverage,
    COLORS.vts,
    '%'
  );

  fillRoundedRect(ctx, 64, 1062, 1472, 94, 20, '#152438', COLORS.warning);
  const noteX = tools.rtl ? 1504 : 96;
  tools.fitText(copy.coverageCaveat, noteX, 1100, 1398, {
    size: 21,
    minSize: 16,
    weight: 750,
    color: COLORS.warning,
  });
  tools.fitText(copy.feederNote, noteX, 1132, 1398, {
    size: 19,
    minSize: 15,
    weight: 600,
    color: COLORS.muted,
  });

  return canvas;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Alliance briefing PNG encoding failed.'));
    }, 'image/png');
  });
}

export async function exportAllianceBriefPng(options = {}) {
  if (document.fonts?.ready) await document.fonts.ready;
  const model = buildAllianceBriefModel(options.rows, {
    season: options.season,
    generatedAt: options.generatedAt,
  });
  const canvas = renderAllianceBriefCanvas(model, options);
  const blob = await canvasBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = model.generatedAt.toISOString().slice(0, 10);
  link.href = url;
  link.download = `alliance-merge-briefing-${date}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { model, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
}

export const ALLIANCE_BRIEF_CANVAS_SIZE = Object.freeze({
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
});
