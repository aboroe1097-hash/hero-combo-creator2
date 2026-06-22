import { translations, loadTranslationsForLanguage } from './translations.js';
import { mountGameClock, syncGameClockTitles } from './game-time.js';

const APP_VERSION = '11.2.0';

function getPreferredTheme() {
  const stored = localStorage.getItem('theme');
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
  const btn = document.getElementById('themeToggle');
  if (!btn || btn.dataset.themeWired) return;
  btn.dataset.themeWired = '1';
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', next);
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
}

window.showToast = function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  window.setTimeout(() => {
    toast.style.animation = 'toast-in 0.3s ease reverse both';
    window.setTimeout(() => toast.remove(), 300);
  }, duration);
};

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
  const mod = await import('./ocr-dashboard.js?v=20260622_183931');
  await mod.bootOcrDashboard();
}

bootAdminPage().catch((err) => {
  console.error('Admin dashboard failed to load', err);
  const section = document.getElementById('ocrDashboardSection');
  if (section) {
    section.innerHTML = '<div class="p-8 text-center text-sm text-red-400">Failed to load admin dashboard. Refresh and try again.</div>';
  }
});
