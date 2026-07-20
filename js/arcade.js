import {
  translations,
  applyLanguageDirection,
  createLatestLanguageLoader,
} from './translations.js';
import { mountGameClock, syncGameClockTitles } from './game-time.js';
import { resolveIntlLocale } from './locale-format.js';
import { initArcadeHub } from './arcade-hub.js';
import { initArcadeLobbyUI } from './arcade-lobby-ui.js';
import { setCurrentLanguage } from './state.js';

const APP_VERSION = '14.2.0';
const THEME_STORAGE_KEY = 'vts_theme';
const THEME_CHROME_COLORS = { light: '#f8fafc', dark: '#070b16' };
const THEME_MANIFESTS = { light: 'site-light.webmanifest', dark: 'site.webmanifest' };
const SUPPORTED_LANGUAGES = [
  'en',
  'es',
  'pt',
  'de',
  'fr',
  'hr',
  'tr',
  'ru',
  'id',
  'zh',
  'ar',
  'kr',
];

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

  const button = document.getElementById('themeToggle');
  if (button) button.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  const darkIcon = button?.querySelector('.theme-icon-dark');
  const lightIcon = button?.querySelector('.theme-icon-light');
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

  const button = document.getElementById('themeToggle');
  if (!button || button.dataset.themeWired) return;
  button.dataset.themeWired = '1';
  button.addEventListener('click', () => {
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
    if (SUPPORTED_LANGUAGES.includes(stored)) return stored;

    const primary = String(navigator.language || '')
      .toLowerCase()
      .split('-')[0];
    const mapped = primary === 'ko' ? 'kr' : primary;
    return SUPPORTED_LANGUAGES.includes(mapped) ? mapped : 'en';
  } catch {
    return 'en';
  }
}

function translatedValue(lang, key) {
  const value = translations[lang]?.[key] || translations.en?.[key];
  return typeof value === 'string' ? value.replaceAll('{version}', APP_VERSION) : '';
}

function updateTextContent(lang) {
  setCurrentLanguage(lang);
  window.VTS_TRANSLATIONS = translations;
  applyLanguageDirection(lang);
  document.documentElement.lang = resolveIntlLocale(lang);

  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) languageSelect.value = lang;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const value = translatedValue(lang, element.getAttribute('data-i18n'));
    if (value) element.textContent = value;
  });

  document.querySelectorAll('[data-i18n-ph]').forEach((element) => {
    const value = translatedValue(lang, element.getAttribute('data-i18n-ph'));
    if (value) element.placeholder = value;
  });

  document.querySelectorAll('[data-i18n-title]').forEach((element) => {
    const value = translatedValue(lang, element.getAttribute('data-i18n-title'));
    if (value) element.title = value;
  });

  document.querySelectorAll('[data-i18n-label]').forEach((element) => {
    const value = translatedValue(lang, element.getAttribute('data-i18n-label'));
    if (value) element.label = value;
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    const value = translatedValue(lang, element.getAttribute('data-i18n-aria'));
    if (value) element.setAttribute('aria-label', value);
  });

  document.querySelectorAll('[data-i18n-alt]').forEach((element) => {
    const value = translatedValue(lang, element.getAttribute('data-i18n-alt'));
    if (value) element.setAttribute('alt', value);
  });

  syncGameClockTitles();
  window.dispatchEvent(new CustomEvent('edenLanguageUpdate'));
  window.dispatchEvent(new CustomEvent('vts:language-change', { detail: { lang } }));
}

const requestArcadeLanguage = createLatestLanguageLoader((requestedLanguage) => {
  const loadedLanguage = translations[requestedLanguage] ? requestedLanguage : 'en';
  updateTextContent(loadedLanguage);
});

async function setLanguage(lang) {
  const requestedLanguage = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'en';
  const result = await requestArcadeLanguage(requestedLanguage);
  return result.applied ? requestedLanguage : null;
}

async function initArcade() {
  const savedLanguage = getLanguage();
  initTheme();
  mountGameClock(document.getElementById('globalGameClock'), { compact: true, showUae: false });
  document
    .getElementById('arcadeFooterYear')
    ?.replaceChildren(document.createTextNode(String(new Date().getFullYear())));
  await setLanguage(savedLanguage);
  initArcadeHub();
  initArcadeLobbyUI();

  document.getElementById('languageSelect')?.addEventListener('change', async (event) => {
    const nextLanguage = event.target.value || 'en';
    localStorage.setItem('vts_hero_lang', nextLanguage);
    applyLanguageDirection(nextLanguage);
    await setLanguage(nextLanguage);
  });

  window.VTSLoaderV14?.ready?.('arcade');

  const loaderEl = document.querySelector('[data-vts-loader]');
  if (loaderEl) {
    loaderEl.style.transition = 'opacity 0.35s ease';
    loaderEl.style.opacity = '0';
    setTimeout(() => {
      loaderEl.classList.add('hidden');
      document.getElementById('arcadeLobby')?.classList.remove('hidden');
      document.body.classList.remove('arcade-loading');
    }, 400);
  } else {
    document.getElementById('arcadeLobby')?.classList.remove('hidden');
    document.body.classList.remove('arcade-loading');
  }
}

initArcade();
