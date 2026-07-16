import { escapeHtml } from './utils.js';
// Extracted Hero Tooltip Module
import { allHeroesData } from './heroes-data.js';
import {
  currentLanguage,
  heroInfoEnabled,
  getTroopColorClass,
  getLocalizedTroop,
  getHeroImageUrl,
} from './state.js';
import { baseRankedCombos } from './combos-db.js';

let heroTooltip = null;
let heroInfoPromise = null;
let heroI18nPromise = null;

let cachedTooltipW = 0;
let cachedTooltipH = 0;
let moveRaf = 0;
let pendingMoveEvent = null;
let activeHeroName = null;
let activePointerEvent = null;
let activeTooltipTrigger = null;
let tooltipRequestId = 0;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'resize',
    () => {
      cachedTooltipW = 0;
      cachedTooltipH = 0;
      if (!heroTooltip || heroTooltip.classList.contains('hidden')) return;

      const rect = heroTooltip.getBoundingClientRect();
      cachedTooltipW = rect.width;
      cachedTooltipH = rect.height;
      const pointerX = Number(pendingMoveEvent?.clientX);
      const pointerY = Number(pendingMoveEvent?.clientY);
      moveHeroTooltip({
        clientX:
          Number.isFinite(pointerX) && pointerX >= 0 && pointerX <= window.innerWidth
            ? pointerX
            : window.innerWidth / 2,
        clientY:
          Number.isFinite(pointerY) && pointerY >= 0 && pointerY <= window.innerHeight
            ? pointerY
            : window.innerHeight / 2,
      });
    },
    { passive: true }
  );
}

function loadHeroInfoData() {
  if (!heroInfoPromise) {
    heroInfoPromise = import('./heroes-info.js').then((mod) => mod.heroesExtendedData || {});
  }
  return heroInfoPromise;
}

function loadHeroI18n() {
  if (!heroI18nPromise) {
    heroI18nPromise = import('./i18n/hero-atlas/index.js');
  }
  return heroI18nPromise;
}

function formatSkillText(text = '') {
  let counter = 0;
  const tokens = {};
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  function tokenize(html) {
    const token = `_TK${alpha[counter++]}_`;
    tokens[token] = html;
    return token;
  }

  let formatted = escapeHtml(
    String(text || '')
      .replace(/<\/?b>/gi, '')
      .replace(/<\/?u>/gi, '')
  );
  formatted = formatted.replace(/([+-]?\d+(?:\.\d+)?%)/g, (match) =>
    tokenize(`<span class="skill-value skill-value--percent">${match}</span>`)
  );
  formatted = formatted.replace(
    /(\d+\s*(?:turns|turn|rounds|round|times|time|layers|layer|roun|min|hr))/gi,
    (match) => tokenize(`<span class="skill-value skill-value--duration">${match}</span>`)
  );
  formatted = formatted.replace(/(?<!&#)\b(\d+)\b/g, (match) =>
    tokenize(`<span class="skill-value skill-value--number">${match}</span>`)
  );

  for (const [token, html] of Object.entries(tokens)) {
    formatted = formatted.replace(token, html);
  }
  return formatted;
}

function getSynergies(heroName) {
  const containingCombos = baseRankedCombos.filter((c) => c?.heroes?.includes(heroName));
  const top5 = containingCombos.slice(0, 5);
  if (top5.length === 0) return [];

  const counts = {};
  top5.forEach((combo) => {
    combo.heroes.forEach((h) => {
      if (h !== heroName) counts[h] = (counts[h] || 0) + 1;
    });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0])
    .slice(0, 3);
}

function getHeroTooltip() {
  if (heroTooltip && document.body.contains(heroTooltip)) return heroTooltip;
  heroTooltip = document.getElementById('heroTooltip');
  if (heroTooltip) return heroTooltip;

  heroTooltip = document.createElement('div');
  heroTooltip.id = 'heroTooltip';
  heroTooltip.className =
    'hero-tooltip-shell hero-tooltip-shell--passive hero-tooltip-shell--hidden hidden';
  heroTooltip.setAttribute('role', 'dialog');
  heroTooltip.setAttribute('aria-modal', 'false');
  heroTooltip.setAttribute('aria-labelledby', 'heroTooltipTitle');
  heroTooltip.setAttribute('tabindex', '-1');
  heroTooltip.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    hideHeroTooltip();
  });
  heroTooltip.style.zIndex = '5000';
  document.body.appendChild(heroTooltip);
  return heroTooltip;
}

async function showHeroTooltip(e, heroName) {
  if (!heroInfoEnabled) return;
  if (e?.type?.startsWith('pointer') && window.innerWidth < 1024) return;
  const requestId = ++tooltipRequestId;
  const tooltip = getHeroTooltip();
  const interactiveRequest = e?.type === 'click' || e?.type === 'keydown';
  const invokingElement =
    interactiveRequest && typeof e?.currentTarget?.focus === 'function' ? e.currentTarget : null;

  const [heroesExtendedData, heroI18n] = await Promise.all([
    loadHeroInfoData(),
    loadHeroI18n().then(async (module) => {
      await module.loadHeroAtlasLocale(currentLanguage);
      return module;
    }),
  ]);
  if (requestId !== tooltipRequestId) return;
  if (!heroInfoEnabled) return;
  const data = heroesExtendedData[heroName];
  if (!data) return;

  const baseData = allHeroesData.find((h) => h.name === heroName);
  const troopType = baseData ? baseData.Type : 'Unknown';
  const troopColorClass = getTroopColorClass(troopType);
  const localizedTroop = getLocalizedTroop(troopType);
  const { heroPlacementText, heroSkillText, heroUi } = heroI18n;
  activeHeroName = heroName;
  activePointerEvent = e;
  if (invokingElement) {
    activeTooltipTrigger = invokingElement;
    invokingElement.setAttribute?.('aria-controls', 'heroTooltip');
    invokingElement.setAttribute?.('aria-expanded', 'true');
  }
  else if (!interactiveRequest) activeTooltipTrigger = null;

  let skillsHtml = data.skills
    .map((s) => {
      const formattedDesc = formatSkillText(heroSkillText(heroName, s, 'desc'));
      const localizedType = heroSkillText(heroName, s, 'type');
      const localizedTarget = heroSkillText(heroName, s, 'target');
      const isEnemy = s.target.toLowerCase().includes('enemy');
      const targetClass = isEnemy ? 'hero-tooltip-target--enemy' : 'hero-tooltip-target--ally';

      return `
      <div class="hero-tooltip-skill">
        <div class="hero-tooltip-skill-head">
          <span class="hero-tooltip-skill-id">${escapeHtml(heroUi('skill'))} ${s.id}</span>
          <div class="hero-tooltip-skill-meta">
            <span class="hero-tooltip-skill-type">${escapeHtml(localizedType)}</span>
            ${s.range !== '-' ? `<span class="hero-tooltip-skill-range">${escapeHtml(heroUi('range'))}: <span class="hero-tooltip-range-value">${s.range}</span></span>` : ''}
          </div>
        </div>
        <p class="hero-tooltip-target ${targetClass}">
          <svg class="hero-tooltip-target-icon" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-5.029-5.912c.328-.521.529-1.134.529-1.788a4.991 4.991 0 00-1.854-3.791A3.99 3.99 0 0114 12H6a3.99 3.99 0 012.354-8.491A4.991 4.991 0 006.5 7.3c0 .654.2 1.267.529 1.788A5.972 5.972 0 002 15v3h14z"></path></svg>
          ${escapeHtml(localizedTarget)}
        </p>
        <p class="hero-tooltip-desc">${formattedDesc}</p>
      </div>
    `;
    })
    .join('');

  let synergyHtml = '';
  const synergies = getSynergies(heroName);
  if (synergies.length > 0) {
    const synTags = synergies
      .map(
        (syn) => `
      <div class="hero-tooltip-synergy-card">
         <img src="${getHeroImageUrl(syn)}" alt="${escapeHtml(syn)}" loading="lazy" decoding="async" crossorigin="anonymous" class="hero-tooltip-synergy-img">
         <span class="hero-tooltip-synergy-name">${escapeHtml(syn)}</span>
      </div>
    `
      )
      .join('');

    synergyHtml = `
      <div class="hero-tooltip-synergy-block">
        <span class="hero-tooltip-label">${escapeHtml(heroUi('bestSynergies'))}</span>
        <div class="hero-tooltip-synergy-list">
          ${synTags}
        </div>
      </div>
    `;
  }

  tooltip.innerHTML = `
    <div class="hero-tooltip-head">
      <div class="hero-tooltip-title-wrap">
        <h4 id="heroTooltipTitle" class="hero-tooltip-title">${escapeHtml(heroName)}</h4>
        <div class="hero-tooltip-meta-panel">
          <div class="hero-tooltip-meta-col">
            <span class="hero-tooltip-meta-label">${escapeHtml(heroUi('placement'))}</span>
            <span class="hero-tooltip-meta-value">${escapeHtml(heroPlacementText(data.placement || 'Any'))}</span>
          </div>
          <div class="hero-tooltip-meta-separator"></div>
          <div class="hero-tooltip-meta-col">
            <span class="hero-tooltip-meta-label">${escapeHtml(heroUi('troop'))}</span>
            <span class="hero-tooltip-meta-value ${troopColorClass}">${localizedTroop}</span>
          </div>
        </div>
      </div>
      
      <button id="closeTooltipBtn" class="hero-tooltip-close" type="button" aria-label="${escapeHtml(heroUi('closeHeroInfo'))}" title="${escapeHtml(heroUi('close'))}">
        <svg class="hero-tooltip-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <div class="hero-tooltip-copy-row">
      <p class="hero-tooltip-copy">${escapeHtml(heroUi('min'))}: <span class="hero-tooltip-copy-badge">${data.minCopies || 34} ${escapeHtml(heroUi('copies'))}</span></p>
      <p class="hero-tooltip-copy">${escapeHtml(heroUi('max'))}: <span class="hero-tooltip-copy-badge hero-tooltip-copy-badge--max">${data.maxCopies || 34} ${escapeHtml(heroUi('copies'))}</span></p>
    </div>

    <div class="hero-tooltip-body custom-scrollbar">
      ${skillsHtml || `<p class="hero-tooltip-empty">${escapeHtml(heroUi('noSkillData'))}</p>`}
      ${synergyHtml}
    </div>
  `;

  tooltip.classList.remove('hidden');
  const rect = tooltip.getBoundingClientRect();
  cachedTooltipW = rect.width;
  cachedTooltipH = rect.height;
  requestAnimationFrame(() => {
    tooltip.classList.remove('hero-tooltip-shell--hidden');
  });
  moveHeroTooltip(e);

  const closeBtn = document.getElementById('closeTooltipBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      hideHeroTooltip();
    });
    closeBtn.addEventListener(
      'touchstart',
      (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        hideHeroTooltip();
      },
      { passive: false }
    );
    if (invokingElement) closeBtn.focus({ preventScroll: true });
  }
}

function moveHeroTooltip(e) {
  pendingMoveEvent = e;
  if (moveRaf) return;
  moveRaf = requestAnimationFrame(() => {
    moveRaf = 0;
    const ev = pendingMoveEvent;
    if (!ev) return;
    const tooltip = getHeroTooltip();
    if (tooltip.classList.contains('hidden')) return;

    if (window.innerWidth < 1024) {
      tooltip.style.left = '50%';
      tooltip.style.top = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
      tooltip.style.maxHeight = '90vh';
      return;
    }

    tooltip.style.transform = 'none';
    tooltip.style.maxHeight = '85vh';

    let clientX = ev.clientX !== undefined ? ev.clientX : window.innerWidth / 2;
    let clientY = ev.clientY !== undefined ? ev.clientY : window.innerHeight / 2;

    let x = clientX + 15;
    let y = clientY + 15;

    const w = cachedTooltipW;
    const h = cachedTooltipH;

    if (x + w > window.innerWidth) x = clientX - w - 15;
    if (y + h > window.innerHeight) y = window.innerHeight - h - 15;

    if (y < 10) y = 10;
    if (x < 10) x = 10;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  });
}

function hideHeroTooltip() {
  tooltipRequestId += 1;
  const tooltip = getHeroTooltip();
  tooltip.classList.add('hero-tooltip-shell--hidden');
  setTimeout(() => {
    if (tooltip.classList.contains('hero-tooltip-shell--hidden')) tooltip.classList.add('hidden');
  }, 200);
  activeHeroName = null;
  activePointerEvent = null;
  const returnFocus = activeTooltipTrigger;
  activeTooltipTrigger = null;
  if (returnFocus && document.contains(returnFocus)) {
    returnFocus.setAttribute?.('aria-expanded', 'false');
    returnFocus.focus({ preventScroll: true });
  }
}

function forceHideHeroTooltip() {
  tooltipRequestId += 1;
  const tooltip = getHeroTooltip();
  tooltip.classList.add('hidden', 'hero-tooltip-shell--hidden');
  activeHeroName = null;
  activePointerEvent = null;
  activeTooltipTrigger?.setAttribute?.('aria-expanded', 'false');
  activeTooltipTrigger = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('vts:language-change', async () => {
    if (!activeHeroName || !heroTooltip || heroTooltip.classList.contains('hidden')) return;
    await showHeroTooltip(activePointerEvent || {}, activeHeroName);
  });
}

window.showHeroTooltip = showHeroTooltip;
window.moveHeroTooltip = moveHeroTooltip;
window.hideHeroTooltip = hideHeroTooltip;
window.forceHideHeroTooltip = forceHideHeroTooltip;

export { showHeroTooltip, moveHeroTooltip, hideHeroTooltip, forceHideHeroTooltip };
