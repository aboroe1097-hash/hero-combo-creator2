// Canvas export of the weekly assignments. Rows grow to keep every name and note.
import { THRONE_BUFFS, throneBuffInitials } from './throne-buffs-data.js';
import { drawCanvasFooter, getExportBranding } from './export-branding.js';

const CANVAS_WIDTH = 1200;
const COLORS = {
  background: '#07111f',
  card: '#0d1a2b',
  border: '#29415e',
  text: '#f3f7fc',
  muted: '#9db0c8',
  accent: '#58c7e8',
  gold: '#f1bf52',
};
const FONT = 'system-ui, "Noto Sans", "Segoe UI", sans-serif';

function rect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// Break long unspaced names too (CJK and in-game handles), without truncation.
export function wrapThroneText(ctx, value, maxWidth) {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) {
      lines.push(line);
      line = '';
    }
    for (const char of Array.from(word)) {
      if (line && ctx.measureText(line + char).width > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function isRtl(text) {
  return /^[^A-Za-z\u0590-\u08ff]*[\u0590-\u08ff]/u.test(text);
}
function textLines(ctx, lines, left, top, width, height) {
  lines.forEach((line, index) => {
    const rtl = isRtl(line);
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = rtl ? 'right' : 'left';
    ctx.fillText(line, rtl ? left + width : left, top + index * height);
  });
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
}

export async function loadThroneIcons() {
  return Object.fromEntries(
    await Promise.all(
      THRONE_BUFFS.map(
        (buff) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve([buff.id, img]);
            img.onerror = () => resolve([buff.id, null]);
            img.src = new URL(`../images/throne/${buff.id}.webp`, import.meta.url).href;
          })
      )
    )
  );
}

export function renderThroneCardCanvas(weekRecord, { icons = {} } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('PNG export is not supported in this browser.');
  const rows = THRONE_BUFFS.map((buff) => {
    ctx.font = `700 23px ${FONT}`;
    const names = wrapThroneText(ctx, weekRecord?.assignments?.[buff.id] || '— Unassigned —', 530);
    ctx.font = `500 17px ${FONT}`;
    const notes = wrapThroneText(ctx, weekRecord?.reasons?.[buff.id], 530);
    ctx.font = `700 21px ${FONT}`;
    const titles = wrapThroneText(ctx, buff.name, 260);
    const contentHeight = names.length * 29 + (notes.length ? 10 + notes.length * 24 : 0);
    return {
      buff,
      names,
      notes,
      titles,
      height: Math.max(100, contentHeight + 36, titles.length * 27 + 36),
    };
  });
  canvas.height = 260 + rows.reduce((height, row) => height + row.height + 10, 0) + 122;
  // Changing the canvas size resets its context, so apply drawing state below.
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  rect(ctx, 32, 32, 1136, canvas.height - 64, 26, COLORS.card, COLORS.border);
  ctx.font = `700 16px ${FONT}`;
  ctx.fillStyle = COLORS.accent;
  ctx.fillText('ICE & FIRE TOOLKIT · STATE 1097', 70, 83);
  ctx.font = `800 36px ${FONT}`;
  ctx.fillStyle = COLORS.text;
  ctx.fillText('Throne Buff Assignments', 70, 132);
  ctx.font = `700 20px ${FONT}`;
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(`WEEK ${String(weekRecord?.weekKey || 'Current Week')}`, 70, 174);
  ctx.font = `600 14px ${FONT}`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('THRONE TITLE', 158, 231);
  ctx.fillText('ASSIGNED MEMBER / NOTES', 580, 231);
  let y = 250;
  rows.forEach((row, index) => {
    rect(ctx, 60, y, 1080, row.height, 14, index % 2 ? COLORS.card : '#122238');
    const icon = icons[row.buff.id];
    rect(ctx, 76, y + 18, 64, 64, 12, '#1b324d', COLORS.border);
    if (icon) {
      const scale = Math.min(56 / (icon.naturalWidth || 56), 56 / (icon.naturalHeight || 56));
      const w = (icon.naturalWidth || 56) * scale,
        h = (icon.naturalHeight || 56) * scale;
      ctx.drawImage(icon, 108 - w / 2, y + 50 - h / 2, w, h);
    } else {
      ctx.font = `700 20px ${FONT}`;
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(throneBuffInitials(row.buff.id), 92, y + 57);
    }
    ctx.font = `700 21px ${FONT}`;
    ctx.fillStyle = COLORS.text;
    textLines(ctx, row.titles, 158, y + 38, 260, 27);
    ctx.font = `700 23px ${FONT}`;
    ctx.fillStyle = COLORS.accent;
    textLines(ctx, row.names, 580, y + 38, 530, 29);
    ctx.font = `500 17px ${FONT}`;
    ctx.fillStyle = COLORS.muted;
    textLines(ctx, row.notes, 580, y + 38 + row.names.length * 29 + 10, 530, 24);
    y += row.height + 10;
  });
  ctx.font = `500 14px ${FONT}`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(`Generated by VTS Admin · ${new Date().toISOString().slice(0, 10)}`, 70, y + 27);
  drawCanvasFooter(ctx, getExportBranding(), {
    x: 70,
    y: y + 58,
    width: 1060,
    fontLine1: `600 14px ${FONT}`,
    fontLine2: `500 12px ${FONT}`,
  });
  return canvas;
}

export async function exportThroneWeekPng(weekRecord, options = {}) {
  await document.fonts?.ready;
  const icons = options.icons || (await loadThroneIcons());
  const canvas = renderThroneCardCanvas(weekRecord, { ...options, icons });
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('Throne Buffs PNG export failed.'))),
      'image/png'
    )
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `throne-buffs-${String(weekRecord?.weekKey || 'week').replace(/[^a-z0-9-]/gi, '')}.png`;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { width: canvas.width, height: canvas.height, filename };
}
