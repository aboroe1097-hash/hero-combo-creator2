// Run sharing for Velo's Rampart: a procedural result card composited on a
// canvas and handed to the Web Share API as a PNG, with a download fallback.
// Everything is drawn with canvas paths — no assets — and every dependency is
// injected so the module runs in plain Node.

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const FONT = `'Segoe UI', system-ui, sans-serif`;
const FILE_NAME = 'velo-rampart-run.png';
const TEXT_X = 80;

export function shareTextFor(data) {
  const stars =
    Number.isInteger(data.stars) && data.stars >= 0 && data.stars <= 3
      ? `${'★'.repeat(data.stars)}${'☆'.repeat(3 - data.stars)} `
      : '';
  const score = Math.round(data.score).toLocaleString('en-US');
  return `${data.title} — ${data.modeLabel} · ${data.mapLabel} · ${stars}${score} · ${data.waveLabel} ${data.wavesCleared} · ${data.seed} · ${data.footer}`;
}

export function renderShareCard(data, canvas) {
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.save();
  drawBackdrop(ctx);
  drawText(ctx, data);
  drawEmblem(ctx, 935, 300);
  ctx.restore();
  return canvas;
}

export async function shareRun(data, deps = {}) {
  const { navigator: nav, document: doc, URL: Url = globalThis.URL } = deps;
  const canvas = deps.canvasFactory();
  if (!canvas) throw new Error('shareRun: canvasFactory returned nothing');
  renderShareCard(data, canvas);

  const blob = await canvasPng(canvas);
  if (blob) {
    const file = typeof File === 'function' ? new File([blob], FILE_NAME, { type: 'image/png' }) : blob;
    if (typeof nav?.share === 'function' && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file] });
        return 'shared';
      } catch {
        // Cancelled or refused: fall through and keep the card as a download.
      }
    }
    const anchor = doc.createElement('a');
    anchor.href = Url.createObjectURL(blob);
    anchor.download = FILE_NAME;
    anchor.click();
    Url.revokeObjectURL(anchor.href);
    return 'saved';
  }

  const anchor = doc.createElement('a');
  anchor.href = typeof canvas.toDataURL === 'function' ? canvas.toDataURL('image/png') : '';
  anchor.download = FILE_NAME;
  anchor.click();
  return 'saved';
}

function canvasPng(canvas) {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') return resolve(null);
    canvas.toBlob((blob) => resolve(blob || null), 'image/png');
  });
}

function drawBackdrop(ctx) {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const wash = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  wash.addColorStop(0, 'rgba(255, 120, 40, 0.25)');
  wash.addColorStop(0.55, 'rgba(30, 60, 110, 0.1)');
  wash.addColorStop(1, 'rgba(80, 200, 255, 0.2)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const vignette = ctx.createRadialGradient(
    CARD_WIDTH / 2,
    CARD_HEIGHT / 2,
    90,
    CARD_WIDTH / 2,
    CARD_HEIGHT / 2,
    780
  );
  vignette.addColorStop(0, 'rgba(3, 6, 12, 0)');
  vignette.addColorStop(1, 'rgba(3, 6, 12, 0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
}

function drawText(ctx, data) {
  ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
  ctx.font = `600 22px ${FONT}`;
  ctx.letterSpacing = '4px';
  ctx.fillText(data.kicker, TEXT_X, 96);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = '#f8fafc';
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillText(data.title, TEXT_X, 172);

  drawStars(ctx, TEXT_X + 30, 238, earnedStars(data.stars));

  ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText(data.scoreLabel, TEXT_X, 332);

  ctx.fillStyle = '#f8fafc';
  ctx.font = `bold 88px ${FONT}`;
  ctx.fillText(Math.round(data.score).toLocaleString('en-US'), TEXT_X, 416);

  ctx.fillStyle = 'rgba(203, 213, 225, 0.92)';
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText(
    `${data.modeLabel} · ${data.mapLabel} · ${data.waveLabel} ${data.wavesCleared} · ${data.seed}`,
    TEXT_X,
    488
  );

  ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
  ctx.font = `400 18px ${FONT}`;
  ctx.fillText(data.footer, TEXT_X, 574);
}

function earnedStars(stars) {
  return Number.isInteger(stars) ? Math.min(3, Math.max(0, stars)) : 0;
}

function drawStars(ctx, x, y, earned) {
  for (let i = 0; i < 3; i += 1) {
    starPath(ctx, x + i * 78, y, 30, 13);
    if (i < earned) {
      ctx.fillStyle = '#fbbf24';
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

function starPath(ctx, x, y, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? outer : inner;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// The "Velo" emblem: an abstract dragon — one swept wing, two horns, a glowing
// eye, a scatter of sparks. Deliberately geometric; a detailed creature would
// turn to mush at card sizes.
function drawEmblem(ctx, cx, cy) {
  const halo = ctx.createRadialGradient(cx, cy, 20, cx, cy, 270);
  halo.addColorStop(0, 'rgba(80, 200, 255, 0.12)');
  halo.addColorStop(1, 'rgba(80, 200, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, 270, 0, Math.PI * 2);
  ctx.fill();

  const wing = ctx.createLinearGradient(cx - 150, cy + 150, cx + 180, cy - 130);
  wing.addColorStop(0, '#1e293b');
  wing.addColorStop(1, '#334155');
  ctx.beginPath();
  ctx.moveTo(cx - 150, cy + 150);
  ctx.bezierCurveTo(cx + 40, cy + 170, cx + 210, cy + 30, cx + 170, cy - 130);
  ctx.bezierCurveTo(cx + 70, cy - 60, cx - 20, cy - 20, cx - 150, cy + 150);
  ctx.closePath();
  ctx.fillStyle = wing;
  ctx.fill();
  ctx.strokeStyle = 'rgba(80, 200, 255, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(80, 200, 255, 0.18)';
  ctx.lineWidth = 3;
  for (const [x1, y1, x2, y2, x3, y3] of [
    [cx - 95, cy + 115, cx + 55, cy + 95, cx + 145, cy - 75],
    [cx - 45, cy + 65, cx + 55, cy + 45, cx + 118, cy - 95],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x2, y2, x3, y3);
    ctx.stroke();
  }

  ctx.fillStyle = '#64748b';
  for (const points of [
    [cx - 10, cy - 110, cx + 30, cy - 215, cx + 75, cy - 105],
    [cx + 85, cy - 105, cx + 155, cy - 185, cx + 150, cy - 80],
  ]) {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    ctx.lineTo(points[2], points[3]);
    ctx.lineTo(points[4], points[5]);
    ctx.closePath();
    ctx.fill();
  }

  const eyeX = cx + 30;
  const eyeY = cy - 55;
  const glow = ctx.createRadialGradient(eyeX, eyeY, 2, eyeX, eyeY, 34);
  glow.addColorStop(0, 'rgba(125, 211, 252, 0.9)');
  glow.addColorStop(1, 'rgba(125, 211, 252, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(251, 146, 60, 0.85)';
  for (const [x, y, r] of [
    [cx - 195, cy - 40, 6],
    [cx + 215, cy + 115, 5],
    [cx - 70, cy + 215, 4],
    [cx + 235, cy - 140, 3],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
