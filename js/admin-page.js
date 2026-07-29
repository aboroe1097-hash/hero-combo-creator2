import {
  translations,
  loadTranslationsForLanguage,
  applyLanguageDirection,
  createLatestLanguageLoader,
} from './translations.js';
import { mountGameClock, syncGameClockTitles } from './game-time.js';
import { installShowToast, resolveIntlLocale } from './utils.js';
import { initUndoToasts } from './app-undo.js';
import { setCurrentLanguage } from './state.js';

const APP_VERSION = '14.3.0';
const THEME_STORAGE_KEY = 'vts_theme';
const STALE_ASSET_RECOVERY_KEY = 'vts_admin_stale_asset_recovery_v1';
const THEME_CHROME_COLORS = { light: '#f8fafc', dark: '#070b16' };
const THEME_MANIFESTS = { light: 'site-light.webmanifest', dark: 'site.webmanifest' };

function isDynamicImportLoadFailure(err) {
  const message = String(err?.message || err?.reason?.message || err || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload/i.test(
    message
  );
}

let staleAssetRecoveryAttempted = false;

async function recoverFromStaleAssetGraph(reason) {
  if (!isDynamicImportLoadFailure(reason)) return false;

  // In-memory guard first: if sessionStorage is unavailable (e.g. blocked
  // storage), the storage guard below can never engage and reloads would loop.
  if (staleAssetRecoveryAttempted) return false;
  staleAssetRecoveryAttempted = true;

  try {
    if (sessionStorage.getItem(STALE_ASSET_RECOVERY_KEY) === '1') return false;
    sessionStorage.setItem(STALE_ASSET_RECOVERY_KEY, '1');
  } catch {}

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (err) {
    console.warn('[assets] stale admin asset cleanup failed:', err);
  }

  console.warn('[assets] refreshing admin after stale asset graph:', reason);
  window.location.reload();
  return true;
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  recoverFromStaleAssetGraph(event.payload || event);
});

function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  const meta =
    document.getElementById('themeColorMeta') || document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_CHROME_COLORS[theme] || THEME_CHROME_COLORS.dark);

  const manifest =
    document.getElementById('manifestLink') || document.querySelector('link[rel="manifest"]');
  if (manifest) manifest.setAttribute('href', THEME_MANIFESTS[theme] || THEME_MANIFESTS.dark);

  const btn = document.getElementById('themeToggle');
  if (btn) btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  const darkIcon = btn?.querySelector('.theme-icon-dark');
  const lightIcon = btn?.querySelector('.theme-icon-light');
  if (darkIcon && lightIcon) {
    darkIcon.classList.toggle('hidden', theme === 'light');
    lightIcon.classList.toggle('hidden', theme !== 'light');
  }
}

function initTheme() {
  applyTheme(getPreferredTheme());
  if (!localStorage.getItem(THEME_STORAGE_KEY) && localStorage.getItem('theme')) {
    localStorage.setItem(THEME_STORAGE_KEY, localStorage.getItem('theme'));
    localStorage.removeItem('theme');
  }
  const btn = document.getElementById('themeToggle');
  if (!btn || btn.dataset.themeWired) return;
  btn.dataset.themeWired = '1';
  btn.addEventListener('click', () => {
    const current =
      document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    localStorage.removeItem('theme');
    applyTheme(next);
  });
}

function getLanguage() {
  try {
    const stored = localStorage.getItem('vts_hero_lang');
    if (stored) return stored;
    const supported = ['en', 'es', 'pt', 'de', 'fr', 'hr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr', 'it'];
    const primary = String(navigator.language || '')
      .toLowerCase()
      .split('-')[0];
    const mapped = primary === 'ko' ? 'kr' : primary;
    return supported.includes(mapped) ? mapped : 'en';
  } catch {
    return 'en';
  }
}

function updateTextContent(lang) {
  setCurrentLanguage(lang);
  const t = translations[lang] || translations.en;
  window.VTS_TRANSLATIONS = translations;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = resolveIntlLocale(lang);
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) languageSelect.value = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key].replace('{version}', APP_VERSION);
  });

  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.getAttribute('data-i18n-ph');
    if (t[key]) el.placeholder = t[key].replace('{version}', APP_VERSION);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (t[key]) el.title = t[key].replace('{version}', APP_VERSION);
  });

  document.querySelectorAll('[data-i18n-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-label');
    if (t[key]) el.label = t[key].replace('{version}', APP_VERSION);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (t[key]) el.setAttribute('aria-label', t[key].replace('{version}', APP_VERSION));
  });
  syncGameClockTitles();
  window.dispatchEvent(new CustomEvent('vts:admin-language-change', { detail: { lang } }));
  window.dispatchEvent(new CustomEvent('vts:language-change', { detail: { lang } }));
}

const requestAdminLanguage = createLatestLanguageLoader((lang) => {
  const loadedLanguage = translations[lang] ? lang : 'en';
  applyLanguageDirection(loadedLanguage);
  updateTextContent(loadedLanguage);
});

async function loadAdminTemplate() {
  const section = document.getElementById('ocrDashboardSection');
  if (!section) return;
  const res = await fetch('tabs/admin.html?v=20260729_175251');
  if (!res.ok) throw new Error(`Admin template failed: HTTP ${res.status}`);
  section.innerHTML = await res.text();
}

function bindAdminLanguageSelector() {
  const select = document.getElementById('languageSelect');
  if (!select || select.dataset.languageWired === '1') return;
  select.dataset.languageWired = '1';
  select.addEventListener('change', async (event) => {
    const nextLang = event.target.value || 'en';
    localStorage.setItem('vts_hero_lang', nextLang);
    await requestAdminLanguage(nextLang);
  });
}

async function bootAdminPage() {
  bindAdminLanguageSelector();
  await requestAdminLanguage(getLanguage());
  installShowToast();
  initUndoToasts();
  initTheme();
  mountGameClock(document.getElementById('globalGameClock'), { compact: true, showUae: false });
  document
    .getElementById('adminFooterYear')
    ?.replaceChildren(document.createTextNode(String(new Date().getFullYear())));
  await loadAdminTemplate();
  bindAdminLanguageSelector();
  await requestAdminLanguage(getLanguage());
  const mod = await import('./ocr-dashboard.js?v=20260729_175251');
  await mod.bootOcrDashboard();
}

if (!window.VTS_MAINTENANCE_ACTIVE)
  bootAdminPage().catch(async (err) => {
    console.error('Admin dashboard failed to load', err);
    if (await recoverFromStaleAssetGraph(err)) return;
    const section = document.getElementById('ocrDashboardSection');
    if (section) {
      const lang = getLanguage();
      await loadTranslationsForLanguage(lang);
      const message = translations[lang]?.adminLoadFailed || translations.en.adminLoadFailed;
      const error = document.createElement('div');
      error.className = 'admin-load-error';
      error.textContent = message;
      section.replaceChildren(error);
    }
  });
