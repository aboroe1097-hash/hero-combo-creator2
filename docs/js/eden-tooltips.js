// Eden control deck — rich hover tooltips (desktop) + focus hints

import { translations } from './translations.js';

let tipEl = null;
let activeEl = null;
let hideTimer = null;

function edenLang() {
  return localStorage.getItem('vts_hero_lang') || 'en';
}

function edenT(key) {
  const lang = edenLang();
  return translations[lang]?.[key] || translations.en[key] || key;
}

function ensureTipEl() {
  if (tipEl) return tipEl;
  tipEl = document.getElementById('edenFloatingTip');
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'edenFloatingTip';
    tipEl.className = 'eden-floating-tip';
    tipEl.setAttribute('role', 'tooltip');
    tipEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

function getTipSource(el) {
  if (!el) return null;
  return el.closest('.eden-has-tip, [data-i18n-title], [data-tip]');
}

function readTipText(el) {
  return (
    el.getAttribute('data-tip')
    || el.getAttribute('title')
    || ''
  ).trim();
}

function applyTipToEl(el) {
  const jump = el.getAttribute('data-eden-jump');
  if (jump && el.hasAttribute('data-i18n-title')) {
    const key = el.getAttribute('data-i18n-title');
    const tpl = edenT(key);
    if (tpl && tpl !== key) {
      el.setAttribute('data-tip', tpl.replace('{sector}', jump));
      el.removeAttribute('title');
      return;
    }
  }

  const title = el.getAttribute('title');
  if (title) {
    el.setAttribute('data-tip', title);
    el.removeAttribute('title');
  }
}

export function syncEdenControlTipText() {
  const deck = document.querySelector('.eden-control-deck');
  if (!deck) return;
  deck.querySelectorAll('[data-i18n-title], [title], [data-eden-jump]').forEach(applyTipToEl);
  if (activeEl) {
    const text = readTipText(activeEl);
    if (text && tipEl) tipEl.textContent = text;
  }
}

function positionTip(target) {
  const tip = ensureTipEl();
  const rect = target.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const margin = 10;
  let placeBelow = false;

  let top = rect.top - margin;
  if (top - tipRect.height < 8) {
    top = rect.bottom + margin;
    placeBelow = true;
  }

  let left = rect.left + rect.width / 2;
  const half = tipRect.width / 2 + 8;
  left = Math.max(half, Math.min(window.innerWidth - half, left));

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  tip.classList.toggle('eden-floating-tip--below', placeBelow);
}

function showTip(target) {
  const text = readTipText(target);
  if (!text) return hideTip();

  const tip = ensureTipEl();
  activeEl = target;
  tip.textContent = text;
  tip.classList.add('visible');
  tip.setAttribute('aria-hidden', 'false');
  positionTip(target);
}

function hideTip() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  activeEl = null;
  if (!tipEl) return;
  tipEl.classList.remove('visible', 'eden-floating-tip--below');
  tipEl.setAttribute('aria-hidden', 'true');
}

function onPointerOver(e) {
  const deck = document.querySelector('.eden-control-deck');
  if (!deck?.contains(e.target)) return;
  const src = getTipSource(e.target);
  if (!src || src === activeEl) return;
  if (hideTimer) clearTimeout(hideTimer);
  showTip(src);
}

function onPointerOut(e) {
  const deck = document.querySelector('.eden-control-deck');
  if (!deck || !activeEl) return;
  const related = e.relatedTarget;
  if (related && (activeEl.contains(related) || getTipSource(related) === activeEl)) return;
  hideTimer = setTimeout(hideTip, 80);
}

function onScrollOrResize() {
  if (activeEl) positionTip(activeEl);
}

export function initEdenControlTips() {
  const deck = document.querySelector('.eden-control-deck');
  if (!deck || deck.dataset.tipsReady === '1') return;
  deck.dataset.tipsReady = '1';

  ensureTipEl();
  syncEdenControlTipText();

  deck.addEventListener('mouseover', onPointerOver);
  deck.addEventListener('mouseout', onPointerOut);
  deck.addEventListener('focusin', (e) => {
    const src = getTipSource(e.target);
    if (src) showTip(src);
  });
  deck.addEventListener('focusout', () => hideTimer = setTimeout(hideTip, 120));

  window.addEventListener('scroll', onScrollOrResize, true);
  window.addEventListener('resize', onScrollOrResize);
  window.addEventListener('edenLanguageUpdate', syncEdenControlTipText);
}