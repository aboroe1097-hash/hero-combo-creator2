import '../css/ai-drawer.css';
import { loadTranslationsForLanguage, translations } from './translations.js';
import { currentLanguage } from './state.js';
import { mountVeloMascots } from './velo-mascot.js';

await loadTranslationsForLanguage(currentLanguage);

document.body.insertAdjacentHTML(
  'beforeend',
  `<div id="aiDrawerBackdrop" class="ai-drawer-backdrop" hidden></div>
  <aside id="aiDrawer" class="ai-drawer" role="dialog" aria-modal="false" aria-labelledby="aiDrawerTitle" hidden>
    <h2 id="aiDrawerTitle" class="sr-only" data-i18n="ai.title">Talk with Velo</h2>
    <button id="aiDrawerClose" class="ai-drawer__close" type="button" data-i18n-aria="ai.close" aria-label="Close">×</button>
    <div id="aiDrawerContent" class="ai-drawer__content" aria-live="polite">
      <div class="tab-loading" aria-busy="true"><div class="spinner"></div><span data-i18n="ai.loading">Velo is getting ready…</span></div>
    </div>
  </aside>`
);

const launcher = document.getElementById('aiDrawerLauncher');
const drawer = document.getElementById('aiDrawer');
const backdrop = document.getElementById('aiDrawerBackdrop');
const closeButton = document.getElementById('aiDrawerClose');
const content = document.getElementById('aiDrawerContent');
const modalDrawerQuery = globalThis.matchMedia?.('(max-width: 620px)');

let assistantModule = null;
let loadPromise = null;
let returnFocus = null;

function translate(key, fallback = key) {
  return translations[currentLanguage]?.[key] || translations.en?.[key] || fallback;
}

function localize(root) {
  if (!root) return;
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = translate(element.dataset.i18n, element.textContent);
  });
  root.querySelectorAll('[data-i18n-ph]').forEach((element) => {
    element.placeholder = translate(element.dataset.i18nPh, element.placeholder);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute(
      'aria-label',
      translate(element.dataset.i18nAria, element.getAttribute('aria-label') || '')
    );
  });
}

function isModalDrawer() {
  return Boolean(modalDrawerQuery?.matches);
}

function syncDrawerMode() {
  const open = !drawer.hidden;
  const modal = isModalDrawer();
  drawer.setAttribute('aria-modal', String(modal));
  backdrop.hidden = !open || !modal;
  document.body.classList.toggle('ai-drawer-modal-open', open && modal);
}

function renderLoadError() {
  content.replaceChildren();
  const message = document.createElement('p');
  message.className = 'ai-drawer-load-error';
  message.setAttribute('role', 'alert');
  message.textContent = translate('ai.error.provider', 'Velo could not load. Please try again.');
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'ai-drawer-retry';
  retry.textContent = translate('edenX1Retry', 'Retry');
  retry.addEventListener('click', async () => {
    retry.disabled = true;
    try {
      await loadAssistant();
      assistantModule?.focusAiComposer?.();
    } catch {
      retry.disabled = false;
    }
  });
  content.append(message, retry);
}

async function loadAssistant() {
  if (assistantModule) return assistantModule;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const response = await fetch('tabs/ai-assistant.html');
    if (!response.ok) throw new Error(`AI template failed to load (${response.status}).`);
    content.innerHTML = await response.text();
    mountVeloMascots(content);
    localize(content);
    assistantModule = await import('./ai-assistant.js');
    assistantModule.initAiAssistant(content.querySelector('#aiAssistantRoot'));
    return assistantModule;
  })().catch((error) => {
    loadPromise = null;
    window.VTS_ASSET_RECOVERY?.reportFailure?.(error, '');
    renderLoadError();
    throw error;
  });
  return loadPromise;
}

function setOpen(open) {
  drawer.hidden = !open;
  launcher?.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('ai-drawer-open', open);
  syncDrawerMode();
  assistantModule?.notifyAiTabVisibility?.(open);
  if (open) {
    drawer.dataset.veloGreeting = 'true';
    globalThis.setTimeout(() => delete drawer.dataset.veloGreeting, 850);
  }
}

export async function openAiDrawer() {
  returnFocus = document.activeElement;
  setOpen(true);
  closeButton.focus({ preventScroll: true });
  try {
    const module = await loadAssistant();
    module.notifyAiTabVisibility?.(true);
    module.focusAiComposer?.();
  } catch (error) {
    console.error('Velo assistant failed to load', error);
  }
}

function closeDrawer() {
  setOpen(false);
  returnFocus?.focus?.({ preventScroll: true });
}

async function refreshLanguage() {
  await loadTranslationsForLanguage(currentLanguage);
  localize(drawer);
  localize(content);
  assistantModule?.notifyAiLanguageChange?.();
}

closeButton?.addEventListener('click', closeDrawer);
backdrop?.addEventListener('click', closeDrawer);
drawer?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDrawer();
    return;
  }
  if (event.key !== 'Tab' || !isModalDrawer()) return;
  const focusable = [
    ...drawer.querySelectorAll(
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    ),
  ].filter((element) => !element.hidden && element.getClientRects().length);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !event.defaultPrevented && !drawer.hidden) closeDrawer();
});
window.addEventListener('vts:language-change', refreshLanguage);
modalDrawerQuery?.addEventListener?.('change', syncDrawerMode);
localize(drawer);
