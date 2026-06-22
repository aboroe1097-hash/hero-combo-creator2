import { translations, loadTranslationsForLanguage } from './translations.js';

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

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });

  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.getAttribute('data-i18n-ph');
    if (t[key]) el.placeholder = t[key];
  });
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
  await loadAdminTemplate();
  captureEarlyGuestIntent();
  updateTextContent(lang);
  const mod = await import('./ocr-dashboard.js?v=20260622_063500');
  await mod.bootOcrDashboard();
}

bootAdminPage().catch((err) => {
  console.error('Admin dashboard failed to load', err);
  const section = document.getElementById('ocrDashboardSection');
  if (section) {
    section.innerHTML = '<div class="p-8 text-center text-sm text-red-400">Failed to load admin dashboard. Refresh and try again.</div>';
  }
});
