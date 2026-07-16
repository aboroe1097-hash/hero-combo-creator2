const LAUNCHER_COMPACT_KEY = 'vts_ai_launcher_compact';

const launcherMarkup = `<div id="aiDrawerLauncherShell" class="ai-drawer-launcher-shell">
  <button id="aiDrawerLauncher" class="ai-drawer-launcher" type="button" aria-controls="aiDrawer" aria-expanded="false" aria-label="Talk with Velo">
    <span class="velo-mascot velo-mascot--launcher" aria-hidden="true">
      <span class="velo-mascot__stage">
        <img class="velo-mascot__body" src="assets/velo/velo-body-160.webp" alt="" width="160" height="162" decoding="async" draggable="false" />
        <img class="velo-mascot__body velo-mascot__body--angry" src="assets/velo/velo-body-160.webp" alt="" width="160" height="162" decoding="async" draggable="false" />
        <img class="velo-mascot__helmet" src="assets/velo/velo-helmet-160.webp" alt="" width="160" height="120" decoding="async" draggable="false" />
        <span class="velo-mascot__helmet-reaction">
          <img class="velo-mascot__horn velo-mascot__horn--left" src="assets/velo/velo-body-160.webp" alt="" width="160" height="162" decoding="async" draggable="false" />
          <img class="velo-mascot__horn velo-mascot__horn--right" src="assets/velo/velo-body-160.webp" alt="" width="160" height="162" decoding="async" draggable="false" />
          <span class="velo-mascot__eye velo-mascot__eye--left"></span>
          <span class="velo-mascot__eye velo-mascot__eye--right"></span>
        </span>
        <img class="velo-mascot__burst" src="assets/velo/velo-burst-160.webp" alt="" width="160" height="158" decoding="async" draggable="false" />
      </span>
    </span>
    <span class="ai-drawer-launcher__copy">
      <span class="ai-drawer-launcher__eyebrow">VTS Assistant</span>
      <span class="ai-drawer-launcher__label">Talk with Velo</span>
    </span>
  </button>
  <button id="aiDrawerLauncherCompact" class="ai-drawer-launcher__compact-toggle" type="button" aria-label="Collapse Velo launcher" aria-pressed="false">
    <span aria-hidden="true">›</span>
  </button>
</div>`;

document.body.insertAdjacentHTML('beforeend', launcherMarkup);

const shell = document.getElementById('aiDrawerLauncherShell');
const launcher = document.getElementById('aiDrawerLauncher');
const compactButton = document.getElementById('aiDrawerLauncherCompact');
let drawerModulePromise = null;

function languageKey() {
  try {
    const value = localStorage.getItem('vts_hero_lang') || document.documentElement.lang || 'en';
    const key = value.toLowerCase().split('-')[0];
    return key === 'ko' ? 'kr' : key;
  } catch {
    return 'en';
  }
}

function translate(key, fallback) {
  const table = window.VTS_TRANSLATIONS || {};
  return table[languageKey()]?.[key] || table.en?.[key] || fallback;
}

function setCompact(compact, persist = false) {
  shell?.classList.toggle('is-compact', compact);
  compactButton?.setAttribute('aria-pressed', String(compact));
  const label = compact
    ? translate('ai.launcherExpand', 'Expand Velo launcher')
    : translate('ai.launcherCollapse', 'Collapse Velo launcher');
  if (compactButton) {
    compactButton.setAttribute('aria-label', label);
    compactButton.title = label;
  }
  if (!persist) return;
  try {
    localStorage.setItem(LAUNCHER_COMPACT_KEY, compact ? '1' : '0');
  } catch {
    // The preference is optional.
  }
}

function localizeLauncher() {
  const label = translate('ai.nav', 'Talk with Velo');
  const kicker = translate('ai.kicker', 'VTS Assistant');
  launcher?.setAttribute('aria-label', label);
  const copy = launcher?.querySelector('.ai-drawer-launcher__label');
  const eyebrow = launcher?.querySelector('.ai-drawer-launcher__eyebrow');
  if (copy) copy.textContent = label;
  if (eyebrow) eyebrow.textContent = kicker;
  setCompact(shell?.classList.contains('is-compact') || false);
}

function loadDrawer() {
  if (!drawerModulePromise) {
    drawerModulePromise = import('./ai-drawer.js').catch((error) => {
      drawerModulePromise = null;
      window.VTS_ASSET_RECOVERY?.reportFailure?.(error, '');
      throw error;
    });
  }
  return drawerModulePromise;
}

try {
  setCompact(localStorage.getItem(LAUNCHER_COMPACT_KEY) === '1');
} catch {
  setCompact(false);
}
localizeLauncher();

['pointerenter', 'focus', 'pointerdown'].forEach((eventName) => {
  launcher?.addEventListener(eventName, () => void loadDrawer(), { passive: true });
});

launcher?.addEventListener('click', async () => {
  try {
    const module = await loadDrawer();
    await module.openAiDrawer();
  } catch (error) {
    console.error('Velo drawer failed to load', error);
  }
});

compactButton?.addEventListener('click', () => {
  setCompact(!shell?.classList.contains('is-compact'), true);
});
window.addEventListener('vts:language-change', localizeLauncher);
