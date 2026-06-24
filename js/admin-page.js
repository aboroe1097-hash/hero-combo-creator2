import { translations, loadTranslationsForLanguage } from './translations.js';
import { mountGameClock, syncGameClockTitles } from './game-time.js';
import { installShowToast } from './utils.js';

const APP_VERSION = '11.7.0';
const THEME_STORAGE_KEY = 'vts_theme';

function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f8fafc' : '#0f172a');

  const btn = document.getElementById('themeToggle');
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
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    localStorage.removeItem('theme');
    applyTheme(next);
  });
}

function getLanguage() {
  try {
    return localStorage.getItem('vts_hero_lang') || 'en';
  } catch {
    return 'en';
  }
}

function updateTextContent(lang) {
  const t = translations[lang] || translations.en;
  window.VTS_TRANSLATIONS = translations;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
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
  syncGameClockTitles();
  window.dispatchEvent(new CustomEvent('vts:admin-language-change', { detail: { lang } }));
}

async function loadAdminTemplate() {
  const section = document.getElementById('ocrDashboardSection');
  if (!section) return;
  const res = await fetch('tabs/admin.html', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Admin template failed: HTTP ${res.status}`);
  section.innerHTML = await res.text();
}

function captureEarlyGuestIntent() {
  const guestBtn = document.getElementById('dashGuestBtn');
  if (!guestBtn) return;
  guestBtn.addEventListener(
    'click',
    () => {
      try {
        localStorage.removeItem('vts_ocr_auth');
        sessionStorage.setItem('vts_guest', '1');
      } catch {
        // Storage can be unavailable; the dashboard's normal click handler will still run later.
      }
    },
    { capture: true }
  );
}

async function bootAdminPage() {
  const lang = getLanguage();
  await loadTranslationsForLanguage(lang);
  installShowToast();
  initTheme();
  mountGameClock(document.getElementById('globalGameClock'), { compact: true, showUae: false });
  document.getElementById('adminFooterYear')?.replaceChildren(document.createTextNode(String(new Date().getFullYear())));
  await loadAdminTemplate();
  captureEarlyGuestIntent();
  updateTextContent(lang);
  document.getElementById('languageSelect')?.addEventListener('change', async (e) => {
    const nextLang = e.target.value || 'en';
    localStorage.setItem('vts_hero_lang', nextLang);
    await loadTranslationsForLanguage(nextLang);
    updateTextContent(nextLang);
  });
  const mod = await import('./ocr-dashboard.js?v=20260624_164222');
  await mod.bootOcrDashboard();
}

if (!window.VTS_MAINTENANCE_ACTIVE) bootAdminPage().catch((err) => {
  console.error('Admin dashboard failed to load', err);
  const section = document.getElementById('ocrDashboardSection');
  if (section) {
    section.innerHTML = '<div class="p-8 text-center text-sm text-red-400">Failed to load admin dashboard. Refresh and try again.</div>';
  }
});
