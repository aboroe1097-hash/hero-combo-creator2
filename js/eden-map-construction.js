import { EDEN_MAP_CONFIG } from './eden-map-config.js';

function edenT(key, fallback) {
  const lang = localStorage.getItem('vts_hero_lang') || 'en';
  const t = window.translations?.[lang] || window.translations?.en || {};
  return t[key] || fallback || key;
}

/** Lightweight boot while the live map asset is being built. */
export async function initEdenMapConstruction() {
  const root = document.getElementById('edenMapRoot');
  const panel = document.getElementById('edenMapConstruction');
  if (!root || !panel) return;

  root.classList.add('eden-map-under-construction');
  panel.classList.remove('hidden');
  panel.setAttribute('aria-hidden', 'false');

  const title = document.querySelector('#edenMapRoot .eden-map-header h2');
  const desc = document.querySelector('#edenMapRoot .eden-map-header p');
  if (title) title.textContent = edenT('edenMapConstructionTitle', 'Eden Map — Under Construction');
  if (desc) desc.textContent = edenT('edenMapConstructionDesc', 'We are stitching your in-game screenshots into a full 1600×1600 live map. Back soon.');

  panel.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = edenT(key, el.textContent);
  });
  const status = document.getElementById('edenConstructionEngineStatus');
  if (status && !status.dataset.ready) {
    status.textContent = edenT('edenConstructionEngineLoading', 'Preparing tile engine…');
  }

  if (EDEN_MAP_CONFIG.liveMapEnabled) {
    try {
      const { preloadEdenLiveMap } = await import('./eden-live-map.js');
      preloadEdenLiveMap(() => {
        const status = document.getElementById('edenConstructionEngineStatus');
        if (status) {
          status.dataset.ready = '1';
          status.textContent = edenT('edenConstructionEngineReady', 'Tile engine loaded — waiting for capture tiles.');
        }
      });
    } catch (err) {
      console.warn('Eden live map preload skipped', err);
    }
  }
}
