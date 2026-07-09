import { translations } from './translations.js';

const LEGACY_EDEN_VOTES_PIN_KEY = 'vts_eden_votes_pin_ok';
const SENSITIVE_ADMIN_PIN_KEY = 'vts_sensitive_admin_pin_ok';
const SHA_256_HEX_RE = /^[a-f0-9]{64}$/i;
let pendingPrompt = null;

function getPinCopy(key, fallback) {
  const lang = localStorage.getItem('vts_hero_lang') || document.documentElement.lang || 'en';
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
  return (
    localStorage.getItem(SENSITIVE_ADMIN_PIN_KEY) === '1' ||
    localStorage.getItem(LEGACY_EDEN_VOTES_PIN_KEY) === '1'
  );
}

function markSensitiveAdminUnlocked() {
  localStorage.setItem(SENSITIVE_ADMIN_PIN_KEY, '1');
  localStorage.setItem(LEGACY_EDEN_VOTES_PIN_KEY, '1');
}

export function edenVotesUnlocked() {
  return sensitiveAdminUnlocked();
}

export function requireSensitiveAdminPin(options = {}) {
  if (sensitiveAdminUnlocked()) return Promise.resolve(true);
  if (!hasConfiguredPinGate()) return Promise.resolve(true);
  if (pendingPrompt) return pendingPrompt;

  const copy = {
    kicker: options.kicker || 'Admin Protected',
    title: options.titleKey
      ? getPinCopy(options.titleKey, options.title || 'Enter admin PIN')
      : options.title || getPinCopy('adminEdenVotesPinTitle', 'Enter admin PIN'),
    prompt: options.promptKey
      ? getPinCopy(
          options.promptKey,
          options.prompt || 'This admin view is protected. Enter the owner PIN to continue.'
        )
      : options.prompt ||
        getPinCopy(
          'adminEdenVotesPinPrompt',
          'This admin view is protected. Enter the owner PIN to continue.'
        ),
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
    const overlay = document.createElement('div');
    overlay.className = 'pin-gate-overlay';
    overlay.setAttribute('role', 'presentation');
    overlay.innerHTML = `
      <section class="pin-gate-dialog" role="dialog" aria-modal="true" aria-labelledby="sensitiveAdminPinTitle">
        <form class="pin-gate-form">
          <p class="pin-gate-kicker">${esc(copy.kicker)}</p>
          <h2 id="sensitiveAdminPinTitle">${esc(copy.title)}</h2>
          <p class="pin-gate-copy">${esc(copy.prompt)}</p>
          <label class="pin-gate-field">
            <span>${esc(copy.label)}</span>
            <input class="pin-gate-input" type="password" autocomplete="one-time-code" maxlength="64" aria-describedby="sensitiveAdminPinError" />
          </label>
          <p id="sensitiveAdminPinError" class="pin-gate-error" role="alert" hidden>${esc(
            copy.error
          )}</p>
          <div class="pin-gate-actions">
            <button class="pin-gate-btn pin-gate-btn-ghost" type="button" data-pin-cancel>${esc(
              copy.cancel
            )}</button>
            <button class="pin-gate-btn pin-gate-btn-primary" type="submit">${esc(
              copy.unlock
            )}</button>
          </div>
        </form>
      </section>`;

    const finish = (ok) => {
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      pendingPrompt = null;
      resolve(ok);
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape') finish(false);
    };

    const form = overlay.querySelector('.pin-gate-form');
    const input = overlay.querySelector('.pin-gate-input');
    const error = overlay.querySelector('.pin-gate-error');
    const submit = overlay.querySelector('.pin-gate-btn-primary');
    let checking = false;
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (checking) return;
      checking = true;
      if (submit) submit.disabled = true;
      if (error) error.hidden = true;
      const ok = await verifyPinAttempt(input?.value || '');
      checking = false;
      if (submit) submit.disabled = false;
      if (ok) {
        markSensitiveAdminUnlocked();
        finish(true);
        return;
      }
      if (error) error.hidden = false;
      if (input) {
        input.value = '';
        input.focus();
      }
    });
    overlay.querySelector('[data-pin-cancel]')?.addEventListener('click', () => finish(false));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(false);
    });
    document.addEventListener('keydown', onKeydown);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => input?.focus());
  });

  return pendingPrompt;
}

export function requireEdenVotesPin() {
  return requireSensitiveAdminPin({
    kicker: 'Eden X1 Votes',
    prompt: 'This voting panel is protected. Enter the owner PIN to continue.',
  });
}
