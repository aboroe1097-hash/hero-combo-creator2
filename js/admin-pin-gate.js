import { translations } from './translations.js';
import { resolveRuntimeLocale } from './locale-format.js';

const LEGACY_EDEN_VOTES_PIN_KEY = 'vts_eden_votes_pin_ok';
const SENSITIVE_ADMIN_PIN_KEY = 'vts_sensitive_admin_pin_ok';
const SHA_256_HEX_RE = /^[a-f0-9]{64}$/i;
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');
let pendingPrompt = null;
let promptSequence = 0;
let sessionUnlocked = false;

function readStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // A verified PIN still unlocks this document when persistence is unavailable.
  }
}

function getPinCopy(key, fallback) {
  const lang = resolveRuntimeLocale(readStorage('vts_hero_lang') || undefined);
  const dictionaries = window.VTS_TRANSLATIONS || translations;
  return (
    dictionaries?.[lang]?.[key] ||
    translations?.[lang]?.[key] ||
    dictionaries?.en?.[key] ||
    translations?.en?.[key] ||
    fallback
  );
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[ch] || ch;
  });
}

function configuredPinHash() {
  const hash = String(
    window.VTS_ADMIN_AUTH?.edenVotesPinHash || window.VTS_ADMIN_AUTH?.adminPinHash || ''
  ).trim();
  return SHA_256_HEX_RE.test(hash) ? hash.toLowerCase() : '';
}

function configuredPin() {
  return String(window.VTS_ADMIN_AUTH?.adminPin || '');
}

function hasConfiguredPinGate() {
  return Boolean(configuredPinHash() || configuredPin());
}

async function sha256Hex(value) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return '';
  const bytes = new TextEncoder().encode(String(value ?? ''));
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPinAttempt(value) {
  const hash = configuredPinHash();
  if (hash) return (await sha256Hex(value)) === hash;
  return String(value ?? '') === configuredPin();
}

export function sensitiveAdminUnlocked() {
  if (!hasConfiguredPinGate()) return false;
  return (
    sessionUnlocked ||
    readStorage(SENSITIVE_ADMIN_PIN_KEY) === '1' ||
    readStorage(LEGACY_EDEN_VOTES_PIN_KEY) === '1'
  );
}

function markSensitiveAdminUnlocked() {
  sessionUnlocked = true;
  writeStorage(SENSITIVE_ADMIN_PIN_KEY, '1');
  writeStorage(LEGACY_EDEN_VOTES_PIN_KEY, '1');
}

export function edenVotesUnlocked() {
  return sensitiveAdminUnlocked();
}

export function requireSensitiveAdminPin(options = {}) {
  if (sensitiveAdminUnlocked()) return Promise.resolve(true);
  if (pendingPrompt) return pendingPrompt;

  const configured = hasConfiguredPinGate();
  const copy = {
    kicker: options.kicker || 'Admin Protected',
    title: configured
      ? options.titleKey
        ? getPinCopy(options.titleKey, options.title || 'Enter admin PIN')
        : options.title || getPinCopy('adminEdenVotesPinTitle', 'Enter admin PIN')
      : options.unconfiguredTitle || 'Owner PIN not configured',
    prompt: configured
      ? options.promptKey
        ? getPinCopy(
            options.promptKey,
            options.prompt || 'This admin view is protected. Enter the owner PIN to continue.'
          )
        : options.prompt ||
          getPinCopy(
            'adminEdenVotesPinPrompt',
            'This admin view is protected. Enter the owner PIN to continue.'
          )
      : options.unconfiguredPrompt ||
        'Set VTS_EDEN_VOTES_PIN or VTS_EDEN_VOTES_PIN_HASH in GitHub Pages secrets before opening this protected panel.',
    label: options.labelKey
      ? getPinCopy(options.labelKey, options.label || 'PIN')
      : options.label || getPinCopy('adminEdenVotesPinLabel', 'PIN'),
    error: options.errorKey
      ? getPinCopy(options.errorKey, options.error || 'Incorrect PIN.')
      : options.error || getPinCopy('adminEdenVotesPinError', 'Incorrect PIN.'),
    cancel: options.cancelKey
      ? getPinCopy(options.cancelKey, options.cancel || 'Cancel')
      : options.cancel || getPinCopy('adminCancel', 'Cancel'),
    unlock: options.unlockKey
      ? getPinCopy(options.unlockKey, options.unlock || 'Unlock')
      : options.unlock || getPinCopy('adminEdenVotesPinUnlock', 'Unlock'),
  };

  pendingPrompt = new Promise((resolve) => {
    const promptId = ++promptSequence;
    const titleId = `sensitiveAdminPinTitle-${promptId}`;
    const copyId = `sensitiveAdminPinCopy-${promptId}`;
    const errorId = `sensitiveAdminPinError-${promptId}`;
    const restoreTarget = document.activeElement;
    const inertStates = Array.from(document.body.children, (element) => ({
      element,
      inert: element.inert,
    }));
    inertStates.forEach(({ element }) => {
      element.inert = true;
    });

    const overlay = document.createElement('div');
    overlay.className = 'pin-gate-overlay';
    overlay.setAttribute('role', 'presentation');
    overlay.innerHTML = `
      <section class="pin-gate-dialog" role="dialog" aria-modal="true" aria-labelledby="${titleId}" aria-describedby="${copyId}" tabindex="-1">
        <form class="pin-gate-form">
          <p class="pin-gate-kicker">${esc(copy.kicker)}</p>
          <h2 id="${titleId}">${esc(copy.title)}</h2>
          <p id="${copyId}" class="pin-gate-copy">${esc(copy.prompt)}</p>
          ${
            configured
              ? `<label class="pin-gate-field">
                  <span>${esc(copy.label)}</span>
                  <input class="pin-gate-input" type="password" autocomplete="one-time-code" maxlength="64" aria-describedby="${errorId}" />
                </label>`
              : ''
          }
          <p id="${errorId}" class="pin-gate-error" role="alert" hidden>${esc(copy.error)}</p>
          <div class="pin-gate-actions">
            <button class="pin-gate-btn pin-gate-btn-ghost" type="button" data-pin-cancel>${esc(
              copy.cancel
            )}</button>
            ${
              configured
                ? `<button class="pin-gate-btn pin-gate-btn-primary" type="submit">${esc(
                    copy.unlock
                  )}</button>`
                : ''
            }
          </div>
        </form>
      </section>`;

    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      inertStates.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      pendingPrompt = null;
      if (restoreTarget?.isConnected && typeof restoreTarget.focus === 'function') {
        restoreTarget.focus({ preventScroll: true });
      }
      resolve(ok);
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(overlay.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) =>
          !element.disabled && !element.hidden && element.getAttribute('aria-hidden') !== 'true'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        overlay.querySelector('.pin-gate-dialog')?.focus({ preventScroll: true });
        return;
      }

      const active = document.activeElement;
      if (event.shiftKey && (active === first || !overlay.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || !overlay.contains(active))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const form = overlay.querySelector('.pin-gate-form');
    const input = overlay.querySelector('.pin-gate-input');
    const error = overlay.querySelector('.pin-gate-error');
    const submit = overlay.querySelector('.pin-gate-btn-primary');
    let checking = false;
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!configured) return;
      if (checking) return;
      checking = true;
      if (submit) submit.disabled = true;
      if (error) error.hidden = true;
      const attempt = input?.value || '';
      if (input) input.value = '';
      const ok = await verifyPinAttempt(attempt);
      if (settled) return;
      checking = false;
      if (submit) submit.disabled = false;
      if (ok) {
        markSensitiveAdminUnlocked();
        finish(true);
        return;
      }
      if (error) error.hidden = false;
      if (input) {
        input.focus();
      }
    });
    overlay.querySelector('[data-pin-cancel]')?.addEventListener('click', () => finish(false));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(false);
    });
    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      (
        input ||
        overlay.querySelector('[data-pin-cancel]') ||
        overlay.querySelector('.pin-gate-dialog')
      )?.focus({ preventScroll: true });
    });
  });

  return pendingPrompt;
}

export function requireEdenVotesPin() {
  return requireSensitiveAdminPin({
    kicker: 'Eden X1 Votes',
    prompt: 'This voting panel is protected. Enter the owner PIN to continue.',
  });
}
