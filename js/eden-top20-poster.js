// Final Top 20 reward poster for the Eden season pages.
//
// Drawn straight onto a canvas rather than screenshotting the table: the table
// is laid out for the page (stacked on phones, clickable names, theme colours),
// while the shared image needs one fixed, readable layout in every language and
// theme. The module takes a finished model, so it knows nothing about rewards,
// votes or translations; eden-x1.js builds the model from the same rows the
// announcement table renders.
//
// Model:
//   {
//     kicker, title, subtitle, dateLabel, footer, congrats,
//     columns: { rank, player, group, reward, score, breakdown },
//     categories: [{ key, label, count }],
//     rows: [{ rank, name, tag, category, categoryLabel, reward, rewardLabel,
//              scoreLabel, scoreValue, breakdown: [string], placeholder }],
//     hallOfFame: { title, copy, entries: [{ name, tag, detail }] } | null,
//   }

export const POSTER_WIDTH = 1600;

const FONT_STACK =
  "'Sora', system-ui, -apple-system, 'Segoe UI', 'Noto Sans', 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";

export const POSTER_CATEGORY_RGB = Object.freeze({
  support: '94, 234, 212',
  contribution: '250, 204, 21',
  management: '167, 139, 250',
  team: '96, 165, 250',
});

const GOLD = '#f5c451';
const GOLD_LIGHT = '#fde68a';
const INK = '#f8fafc';
const MUTED = '#94a3b8';
const PAD = 72;
const ROW_H = 74;
const ROW_GAP = 8;

// Column x offsets and widths inside the content box.
const COLS = Object.freeze({
  rank: { x: 0, w: 70 },
  player: { x: 86, w: 320 },
  group: { x: 406, w: 200 },
  reward: { x: 606, w: 256 },
  score: { x: 862, w: 184 },
  breakdown: { x: 1046, w: 400 },
});

const font = (weight, size) => `${weight} ${size}px ${FONT_STACK}`;
const rgba = (rgb, alpha) => `rgba(${rgb}, ${alpha})`;

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// Shortens text with an ellipsis until it fits maxWidth at the current font.
export function fitText(ctx, text, maxWidth) {
  const value = String(text ?? '');
  if (ctx.measureText(value).width <= maxWidth) return value;
  const chars = Array.from(value);
  while (chars.length > 1 && ctx.measureText(`${chars.join('')}…`).width > maxWidth) {
    chars.pop();
  }
  return `${chars.join('')}…`;
}

// Greedy word wrap into at most maxLines lines; the last line is ellipsised.
export function wrapText(ctx, text, maxWidth, maxLines = 2) {
  const words = String(text ?? '')
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  const used = lines.join(' ').split(/\s+/).filter(Boolean).length;
  if (used < words.length && lines.length) {
    lines[lines.length - 1] = fitText(ctx, `${lines[lines.length - 1]} …`, maxWidth);
  }
  return lines.map((entry) => fitText(ctx, entry, maxWidth));
}

function pill(ctx, x, y, text, { rgb, filled = false, size = 17, padX = 14, h = 32 } = {}) {
  ctx.font = font(800, size);
  const w = ctx.measureText(text).width + padX * 2;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = filled ? rgba(rgb, 0.95) : rgba(rgb, 0.14);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = rgba(rgb, filled ? 1 : 0.55);
  ctx.stroke();
  ctx.fillStyle = filled ? '#1a1205' : `rgb(${rgb})`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  return w;
}

function hallOfFameLayout(ctx, hall, contentW) {
  if (!hall?.entries?.length) return { height: 0, rows: [] };
  ctx.font = font(800, 22);
  const chipH = 64;
  const gap = 14;
  const rows = [[]];
  let lineW = 0;
  for (const entry of hall.entries) {
    ctx.font = font(800, 22);
    const nameW = ctx.measureText(entry.name).width;
    ctx.font = font(600, 15);
    const detailW = entry.detail ? ctx.measureText(entry.detail).width : 0;
    const tagW = entry.tag ? 46 : 0;
    const w = Math.min(contentW, Math.max(nameW + tagW, detailW) + 64 + 36);
    if (lineW && lineW + gap + w > contentW) {
      rows.push([]);
      lineW = 0;
    }
    rows[rows.length - 1].push({ entry, w });
    lineW += (lineW ? gap : 0) + w;
  }
  const height = 132 + rows.length * chipH + (rows.length - 1) * gap + 30;
  return { height, rows, chipH, gap };
}

// Height needed for a model, so the caller can size the canvas first.
export function measurePoster(ctx, model) {
  const contentW = POSTER_WIDTH - PAD * 2;
  const rowsH = model.rows.length * (ROW_H + ROW_GAP);
  const hall = hallOfFameLayout(ctx, model.hallOfFame, contentW - 64);
  return PAD + 300 + 56 + rowsH + 24 + (hall.height ? hall.height + 32 : 0) + 120 + PAD;
}

function drawBackground(ctx, w, h) {
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, '#050a16');
  base.addColorStop(0.5, '#0a1730');
  base.addColorStop(1, '#060d1d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w / 2, 40, 20, w / 2, 40, w * 0.62);
  glow.addColorStop(0, 'rgba(245, 196, 81, 0.24)');
  glow.addColorStop(0.45, 'rgba(244, 114, 182, 0.07)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const lowGlow = ctx.createRadialGradient(w * 0.15, h, 10, w * 0.15, h, w * 0.5);
  lowGlow.addColorStop(0, 'rgba(94, 234, 212, 0.10)');
  lowGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = lowGlow;
  ctx.fillRect(0, 0, w, h);

  // A faint diagonal hatch keeps large dark areas from looking flat.
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.035)';
  ctx.lineWidth = 1;
  for (let x = -h; x < w; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
  }
  ctx.restore();

  // Double gold frame with corner diamonds.
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 196, 81, 0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, 24, 24, w - 48, h - 48, 26);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(245, 196, 81, 0.18)';
  ctx.lineWidth = 1;
  roundRect(ctx, 34, 34, w - 68, h - 68, 20);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  for (const [cx, cy] of [
    [w / 2, 24],
    [w / 2, h - 24],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 9);
    ctx.lineTo(cx + 9, cy);
    ctx.lineTo(cx, cy + 9);
    ctx.lineTo(cx - 9, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawTrophy(ctx, cx, cy, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const g = ctx.createLinearGradient(0, -48, 0, 48);
  g.addColorStop(0, GOLD_LIGHT);
  g.addColorStop(1, '#d97706');
  ctx.fillStyle = g;
  ctx.strokeStyle = g;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-30, -40);
  ctx.lineTo(30, -40);
  ctx.lineTo(26, -6);
  ctx.quadraticCurveTo(0, 22, -26, -6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-32, -24, 13, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(32, -24, 13, Math.PI * 1.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.fillRect(-5, 12, 10, 18);
  roundRect(ctx, -22, 30, 44, 12, 4);
  ctx.fill();
  ctx.restore();
}

function drawHeader(ctx, model, w) {
  const centerX = w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  drawTrophy(ctx, centerX, PAD + 50, 1);

  ctx.font = font(800, 20);
  ctx.fillStyle = 'rgb(103, 232, 249)';
  const kicker = String(model.kicker || '').toUpperCase();
  ctx.letterSpacing = '6px';
  ctx.fillText(kicker, centerX, PAD + 136);
  ctx.letterSpacing = '0px';

  const titleGrad = ctx.createLinearGradient(0, PAD + 150, 0, PAD + 220);
  titleGrad.addColorStop(0, '#fff7d6');
  titleGrad.addColorStop(0.55, GOLD);
  titleGrad.addColorStop(1, '#d97706');
  ctx.font = font(900, 84);
  ctx.fillStyle = titleGrad;
  ctx.shadowColor = 'rgba(245, 196, 81, 0.35)';
  ctx.shadowBlur = 28;
  ctx.fillText(fitText(ctx, model.title, w - PAD * 2), centerX, PAD + 222);
  ctx.shadowBlur = 0;

  ctx.font = font(500, 23);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(fitText(ctx, model.subtitle, w - PAD * 2), centerX, PAD + 262);

  // Category tally, centred under the subtitle.
  const chips = model.categories.filter((entry) => entry.count > 0);
  ctx.font = font(800, 17);
  const widths = chips.map(
    (entry) => ctx.measureText(`${entry.label} · ${entry.count}`).width + 28
  );
  const total = widths.reduce((sum, value) => sum + value, 0) + (chips.length - 1) * 12;
  let x = centerX - total / 2;
  ctx.textAlign = 'left';
  chips.forEach((entry, index) => {
    pill(ctx, x, PAD + 286, `${entry.label} · ${entry.count}`, {
      rgb: POSTER_CATEGORY_RGB[entry.key] || '148, 163, 184',
    });
    x += widths[index] + 12;
  });

  if (model.dateLabel) {
    ctx.textAlign = 'right';
    ctx.font = font(600, 17);
    ctx.fillStyle = MUTED;
    ctx.fillText(model.dateLabel, w - PAD, PAD + 20);
  }
  ctx.textAlign = 'left';
}

function drawTableHead(ctx, model, left, y) {
  ctx.font = font(800, 15);
  ctx.fillStyle = MUTED;
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '2px';
  for (const [key, col] of Object.entries(COLS)) {
    const label = String(model.columns?.[key] || '').toUpperCase();
    ctx.fillText(fitText(ctx, label, col.w - 18), left + col.x + 18, y);
  }
  ctx.letterSpacing = '0px';
  ctx.strokeStyle = 'rgba(245, 196, 81, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y + 22);
  ctx.lineTo(POSTER_WIDTH - PAD, y + 22);
  ctx.stroke();
}

function drawRow(ctx, row, left, y, width) {
  const rgb = POSTER_CATEGORY_RGB[row.category] || '148, 163, 184';
  const midY = y + ROW_H / 2;

  const bg = ctx.createLinearGradient(left, 0, left + width, 0);
  bg.addColorStop(0, rgba(rgb, 0.13));
  bg.addColorStop(0.35, 'rgba(15, 23, 42, 0.78)');
  bg.addColorStop(1, 'rgba(15, 23, 42, 0.62)');
  roundRect(ctx, left, y, width, ROW_H, 16);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = rgba(rgb, 0.22);
  ctx.lineWidth = 1;
  ctx.stroke();
  roundRect(ctx, left, y + 10, 5, ROW_H - 20, 3);
  ctx.fillStyle = `rgb(${rgb})`;
  ctx.fill();

  // Rank medallion.
  const cx = left + COLS.rank.x + 42;
  ctx.beginPath();
  ctx.arc(cx, midY, 24, 0, Math.PI * 2);
  const medal = ctx.createLinearGradient(cx, midY - 24, cx, midY + 24);
  medal.addColorStop(0, rgba(rgb, 0.4));
  medal.addColorStop(1, rgba(rgb, 0.12));
  ctx.fillStyle = medal;
  ctx.fill();
  ctx.strokeStyle = rgba(rgb, 0.85);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = font(900, 21);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(row.rank), cx, midY + 1);
  ctx.textAlign = 'left';

  // Player name and rank tag.
  const nameX = left + COLS.player.x + 18;
  ctx.font = font(800, 25);
  ctx.fillStyle = row.placeholder ? MUTED : INK;
  const tagW = row.tag ? 50 : 0;
  const name = fitText(ctx, row.name, COLS.player.w - tagW - 12);
  ctx.fillText(name, nameX, midY + 1);
  if (row.tag) {
    const nameW = ctx.measureText(name).width;
    const tagRgb = row.tag === 'R5' ? '244, 114, 182' : '250, 204, 21';
    pill(ctx, nameX + nameW + 12, midY - 13, row.tag, { rgb: tagRgb, size: 13, padX: 9, h: 26 });
  }

  ctx.font = font(800, 15);
  pill(
    ctx,
    left + COLS.group.x + 18,
    midY - 16,
    fitText(ctx, row.categoryLabel, COLS.group.w - 50),
    {
      rgb,
      size: 15,
    }
  );

  const gm = row.reward === 'guild_master';
  ctx.font = font(800, 15);
  pill(
    ctx,
    left + COLS.reward.x + 18,
    midY - 16,
    fitText(ctx, `${gm ? '♛ ' : '★ '}${row.rewardLabel}`, COLS.reward.w - 46),
    { rgb: gm ? '245, 196, 81' : '244, 114, 182', filled: gm, size: 15 }
  );

  // Score: the headline number with its unit underneath.
  const scoreX = left + COLS.score.x + 18;
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(900, 26);
  ctx.fillStyle = row.scoreValue ? GOLD_LIGHT : MUTED;
  ctx.fillText(fitText(ctx, row.scoreValue || '—', COLS.score.w - 18), scoreX, midY + 4);
  ctx.font = font(600, 12);
  ctx.fillStyle = MUTED;
  ctx.fillText(fitText(ctx, row.scoreLabel || '', COLS.score.w - 24), scoreX, midY + 24);

  // Breakdown: up to two short lines.
  ctx.font = font(600, 14);
  ctx.fillStyle = '#cbd5e1';
  const lines = (Array.isArray(row.breakdown) ? row.breakdown : []).slice(0, 2);
  const lineY = lines.length > 1 ? midY - 10 : midY;
  ctx.textBaseline = 'middle';
  lines.forEach((line, index) => {
    ctx.fillText(
      fitText(ctx, line, COLS.breakdown.w - 10),
      left + COLS.breakdown.x + 6,
      lineY + index * 22
    );
  });
}

function drawLaurel(ctx, cx, cy, side) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(side, 1);
  ctx.strokeStyle = GOLD;
  ctx.fillStyle = 'rgba(245, 196, 81, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(30, 0, 30, Math.PI * 0.6, Math.PI * 1.4);
  ctx.stroke();
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI * (0.64 + i * 0.145);
    const lx = 30 + Math.cos(angle) * 30;
    const ly = Math.sin(angle) * 30;
    for (const offset of [-0.9, 0.9]) {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle + Math.PI / 2 + offset);
      ctx.beginPath();
      ctx.ellipse(-8, 0, 9, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawHallOfFame(ctx, model, left, y, width) {
  const hall = model.hallOfFame;
  const layout = hallOfFameLayout(ctx, hall, width - 64);
  if (!layout.height) return 0;

  roundRect(ctx, left, y, width, layout.height, 24);
  const bg = ctx.createLinearGradient(0, y, 0, y + layout.height);
  bg.addColorStop(0, 'rgba(245, 196, 81, 0.13)');
  bg.addColorStop(1, 'rgba(245, 196, 81, 0.03)');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 196, 81, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const centerX = left + width / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(900, 38);
  ctx.fillStyle = GOLD;
  const title = fitText(ctx, hall.title, width - 220);
  ctx.fillText(title, centerX, y + 66);
  const titleW = ctx.measureText(title).width;
  drawLaurel(ctx, centerX - titleW / 2 - 50, y + 54, 1);
  drawLaurel(ctx, centerX + titleW / 2 + 50, y + 54, -1);

  ctx.font = font(500, 19);
  ctx.fillStyle = '#e2e8f0';
  wrapText(ctx, hall.copy, width - 120, 1).forEach((line) => ctx.fillText(line, centerX, y + 104));
  ctx.textAlign = 'left';

  let rowY = y + 132;
  for (const rowChips of layout.rows) {
    const rowW =
      rowChips.reduce((sum, chip) => sum + chip.w, 0) + (rowChips.length - 1) * layout.gap;
    let x = centerX - rowW / 2;
    for (const { entry, w } of rowChips) {
      roundRect(ctx, x, rowY, w, layout.chipH, 18);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 196, 81, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Star seal.
      ctx.fillStyle = GOLD;
      ctx.font = font(900, 24);
      ctx.textBaseline = 'middle';
      ctx.fillText('✦', x + 18, rowY + layout.chipH / 2 + 1);
      ctx.font = font(800, 22);
      ctx.fillStyle = INK;
      const textX = x + 52;
      const nameY = entry.detail ? rowY + 24 : rowY + layout.chipH / 2 + 1;
      const tagSpace = entry.tag ? 46 : 0;
      const name = fitText(ctx, entry.name, w - 52 - 18 - tagSpace);
      ctx.fillText(name, textX, nameY);
      if (entry.tag) {
        const nameW = ctx.measureText(name).width;
        const tagRgb = entry.tag === 'R5' ? '244, 114, 182' : '250, 204, 21';
        pill(ctx, textX + nameW + 8, nameY - 11, entry.tag, {
          rgb: tagRgb,
          size: 12,
          padX: 7,
          h: 22,
        });
      }
      if (entry.detail) {
        ctx.font = font(600, 15);
        ctx.fillStyle = 'rgba(253, 230, 138, 0.85)';
        ctx.fillText(fitText(ctx, entry.detail, w - 52 - 18), textX, rowY + 46);
      }
      x += w + layout.gap;
    }
    rowY += layout.chipH + layout.gap;
  }
  return layout.height;
}

function drawFooter(ctx, model, w, y) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(900, 30);
  const g = ctx.createLinearGradient(w / 2 - 300, 0, w / 2 + 300, 0);
  g.addColorStop(0, 'rgb(244, 114, 182)');
  g.addColorStop(0.5, GOLD_LIGHT);
  g.addColorStop(1, 'rgb(94, 234, 212)');
  ctx.fillStyle = g;
  ctx.fillText(fitText(ctx, model.congrats || '', w - PAD * 2), w / 2, y + 40);
  ctx.font = font(600, 17);
  ctx.fillStyle = MUTED;
  ctx.fillText(fitText(ctx, model.footer || '', w - PAD * 2), w / 2, y + 76);
  ctx.textAlign = 'left';
}

// Draws the poster onto `canvas` (resizing it) and returns the canvas.
export function drawTop20Poster(canvas, model, { scale = 1 } = {}) {
  const ctx = canvas.getContext('2d');
  const height = Math.ceil(measurePoster(ctx, model));
  canvas.width = Math.round(POSTER_WIDTH * scale);
  canvas.height = Math.round(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textAlign = 'left';

  drawBackground(ctx, POSTER_WIDTH, height);
  drawHeader(ctx, model, POSTER_WIDTH);

  const left = PAD;
  const width = POSTER_WIDTH - PAD * 2;
  let y = PAD + 300 + 28;
  drawTableHead(ctx, model, left, y);
  y += 40;
  for (const row of model.rows) {
    drawRow(ctx, row, left, y, width);
    y += ROW_H + ROW_GAP;
  }
  y += 24;
  const hallH = drawHallOfFame(ctx, model, left, y, width);
  if (hallH) y += hallH + 32;
  drawFooter(ctx, model, POSTER_WIDTH, y);
  return canvas;
}

export async function downloadTop20Poster(model, filename) {
  if (document.fonts?.ready) {
    try {
      await document.fonts.load(font(800, 24));
      await document.fonts.ready;
    } catch {
      // Fall back to the system stack; the layout does not depend on Sora metrics.
    }
  }
  const canvas = drawTop20Poster(document.createElement('canvas'), model, { scale: 2 });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const link = document.createElement('a');
  link.download = filename;
  if (blob) {
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  } else {
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}
