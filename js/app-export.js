import { getHeroImageUrl } from './state.js';

async function loadImageCrossOrigin(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y,     x + r, y,             r);
  ctx.closePath();
}

function circleClipImage(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  else {
    ctx.fillStyle = '#1e293b';
    ctx.fill();
  }
  ctx.restore();
}

async function renderCombosToCanvas(combosData, title) {
  const S        = 2;
  const W        = 820;
  const PAD      = 28;
  const HDR_H    = 72;
  const CARD_H   = 160;
  const CARD_GAP = 12;
  const FOOT_H   = 42;
  const n        = combosData.length;
  const H        = HDR_H + PAD + n * (CARD_H + CARD_GAP) - CARD_GAP + PAD + FOOT_H;

  const canvas  = document.createElement('canvas');
  canvas.width  = W * S;
  canvas.height = H * S;
  const ctx     = canvas.getContext('2d');
  ctx.scale(S, S);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   '#0d1628');
  bg.addColorStop(1,   '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(37,99,235,0.04)';
  for (let gx = 0; gx < W; gx += 28)
    for (let gy = 0; gy < H; gy += 28)
      { ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI*2); ctx.fill(); }

  const logoImg = await loadImageCrossOrigin('images/logo.png');
  if (logoImg) {
    const lSize = 44;
    ctx.save();
    roundRect(ctx, PAD, (HDR_H - lSize) / 2, lSize, lSize, 10);
    ctx.clip();
    ctx.drawImage(logoImg, PAD, (HDR_H - lSize) / 2, lSize, lSize);
    ctx.restore();
  }
  const titleX = logoImg ? PAD + 54 : PAD;

  ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, titleX, 30);

  ctx.font = '600 12px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText('TEAM VTS — STATE 1097  •  Rise of Castles: Ice & Fire', titleX, 50);

  const grad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  grad.addColorStop(0,   'rgba(59,130,246,0.6)');
  grad.addColorStop(0.5, 'rgba(59,130,246,0.2)');
  grad.addColorStop(1,   'rgba(59,130,246,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, HDR_H - 1);
  ctx.lineTo(W - PAD, HDR_H - 1);
  ctx.stroke();

  const IMG_R   = 54;
  const IMG_D   = IMG_R * 2;
  const HEROES  = 3;
  const NAME_H  = 18;
  const ITEM_W  = IMG_D + 20;
  const HEROES_BLOCK_W = HEROES * ITEM_W + (HEROES - 1) * 10;

  const allUrls = combosData.flatMap(c => c.heroes.map(n2 => getHeroImageUrl(n2)));
  const imgCache = {};
  await Promise.all([...new Set(allUrls)].map(async url => {
    imgCache[url] = await loadImageCrossOrigin(url);
  }));

  for (let i = 0; i < n; i++) {
    const combo = combosData[i];
    const cardY = HDR_H + PAD + i * (CARD_H + CARD_GAP);

    ctx.save();
    roundRect(ctx, PAD, cardY, W - PAD * 2, CARD_H, 16);
    const cardBg = ctx.createLinearGradient(PAD, cardY, W - PAD, cardY + CARD_H);
    cardBg.addColorStop(0, '#1e2d47');
    cardBg.addColorStop(1, '#182135');
    ctx.fillStyle = cardBg;
    ctx.fill();
    roundRect(ctx, PAD, cardY, W - PAD * 2, CARD_H, 16);
    ctx.strokeStyle = 'rgba(51,65,85,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    const BADGE_R = 20;
    const badgeX  = PAD + 38;
    const badgeY  = cardY + CARD_H / 2;
    const badgeGrad = ctx.createRadialGradient(badgeX, badgeY - 4, 2, badgeX, badgeY, BADGE_R);
    badgeGrad.addColorStop(0, '#fb923c');
    badgeGrad.addColorStop(1, '#ea580c');
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, BADGE_R, 0, Math.PI * 2);
    ctx.fillStyle = badgeGrad;
    ctx.fill();
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), badgeX, badgeY + 5.5);
    ctx.textAlign = 'left';

    const heroesStartX = PAD + 80;
    const availW       = (W - PAD * 2) - 80 - 140;
    const heroSpacing  = availW / HEROES;
    const imgCY        = cardY + CARD_H / 2 - NAME_H / 2 - 4;

    combo.heroes.forEach((heroName, hi) => {
      const cx = heroesStartX + hi * heroSpacing + heroSpacing / 2;
      const url = getHeroImageUrl(heroName);
      const img = imgCache[url];

      ctx.save();
      ctx.shadowColor = 'rgba(59,130,246,0.35)';
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(cx, imgCY, IMG_R + 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59,130,246,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      circleClipImage(ctx, img, cx, imgCY, IMG_R);

      const nameY = imgCY + IMG_R + 14;
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.textAlign = 'center';
      let label = heroName;
      while (ctx.measureText(label).width > heroSpacing - 8 && label.length > 3)
        label = label.slice(0, -1);
      if (label !== heroName) label += '…';
      ctx.fillText(label, cx, nameY);
      ctx.textAlign = 'left';
    });

    const scoreX = W - PAD - 120;
    const scoreY = cardY + CARD_H / 2;
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('SCORE', scoreX + 50, scoreY - 14);
    ctx.letterSpacing = '0px';

    const score = combo.displayScore || combo.score || '—';
    ctx.font = 'bold 32px Inter, system-ui, sans-serif';
    ctx.fillStyle = i === 0 ? '#38bdf8' : i === 1 ? '#60a5fa' : i === 2 ? '#818cf8' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText(String(score), scoreX + 50, scoreY + 16);
    ctx.textAlign = 'left';

    const medals = ['🥇', '🥈', '🥉'];
    if (i < 3) {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(medals[i], scoreX + 50, scoreY + 38);
    }
    ctx.textAlign = 'left';
  }

  const footY = H - FOOT_H + 10;
  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(100,116,139,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('Generated by VTS 1097 Hero Combo Creator  •  Rise of Castles: Ice & Fire', W / 2, footY);
  ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), W / 2, footY + 18);
  ctx.textAlign = 'left';

  return canvas;
}

async function downloadComboImage(combosData, title, filename) {
  if (!combosData || !combosData.length) return;
  if (typeof window.showToast === 'function') window.showToast('⏳ Building image…', 'info', 2000);
  try {
    const canvas = await renderCombosToCanvas(combosData, title);
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    if (typeof window.showToast === 'function') window.showToast('✅ Image downloaded!', 'success');
  } catch (err) {
    console.error('Canvas render error:', err);
    if (typeof window.showToast === 'function') window.showToast('❌ Image failed', 'error');
  }
}

function captureElementAsImage(element, filename) {
  const h2c = window.html2canvas;
  if (!h2c) return;
  h2c(element, { backgroundColor: '#020617', useCORS: true, scale: 2 })
    .then(canvas => {
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(err => console.error('html2canvas error:', err));
}

export { renderCombosToCanvas, downloadComboImage, captureElementAsImage };
