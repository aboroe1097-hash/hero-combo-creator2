import { translations } from './translations.js';

const EDEN_VOTES_PIN_KEY = 'vts_eden_votes_pin_ok';
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

function configuredPin() {
  return String(window.VTS_ADMIN_AUTH?.adminPin || '');
}

export function edenVotesUnlocked() {
  return localStorage.getItem(EDEN_VOTES_PIN_KEY) === '1';
}

export function requireEdenVotesPin() {
  if (edenVotesUnlocked()) return Promise.resolve(true);
  if (!configuredPin()) return Promise.resolve(true);
  if (pendingPrompt) return pendingPrompt;

  pendingPrompt = new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'pin-gate-overlay';
    overlay.setAttribute('role', 'presentation');
    overlay.innerHTML = `
      <section class="pin-gate-dialog" role="dialog" aria-modal="true" aria-labelledby="edenVotesPinTitle">
        <form class="pin-gate-form">
          <p class="pin-gate-kicker">Eden X1 Votes</p>
          <h2 id="edenVotesPinTitle">${getPinCopy(
            'adminEdenVotesPinTitle',
            'Enter admin PIN'
          )}</h2>
          <p class="pin-gate-copy">${getPinCopy(
            'adminEdenVotesPinPrompt',
            'This voting panel is protected. Enter the admin PIN to continue.'
          )}</p>
          <label class="pin-gate-field">
            <span>${getPinCopy('adminEdenVotesPinLabel', 'PIN')}</span>
            <input class="pin-gate-input" type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="12" aria-describedby="edenVotesPinError" />
          </label>
          <p id="edenVotesPinError" class="pin-gate-error" role="alert" hidden>${getPinCopy(
            'adminEdenVotesPinError',
            'Incorrect PIN.'
          )}</p>
          <div class="pin-gate-actions">
            <button class="pin-gate-btn pin-gate-btn-ghost" type="button" data-pin-cancel>${getPinCopy(
              'adminCancel',
              'Cancel'
            )}</button>
            <button class="pin-gate-btn pin-gate-btn-primary" type="submit">${getPinCopy(
              'adminEdenVotesPinUnlock',
              'Unlock'
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
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (String(input?.value || '') === configuredPin()) {
        localStorage.setItem(EDEN_VOTES_PIN_KEY, '1');
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
