import {
  OPERATIONS_CONFIG_PATH,
  normalizeOperationsConfig,
  isOperationPaused,
} from './operations-config.js';

const OPERATION_ENTRY_POINTS = Object.freeze({
  uploads:
    '#dashUploadBtn, #dashContributionUploadBtn, #dashExGuildUploadBtn, #dashBohMatchUploadBtn',
  ai: '#aiSendBtn',
  comments: '#edenX1ComplaintSubmit',
  competition: '#dashBohSignupSubmit, #dashBohMatchSaveBtn',
});

export function guardOperationEntryPoints(config, documentOverride = document) {
  for (const [feature, selector] of Object.entries(OPERATION_ENTRY_POINTS)) {
    documentOverride.querySelectorAll(selector).forEach((element) => {
      if (
        isOperationPaused(config, feature, {
          superadmin: globalThis.VTS_OPERATIONS_SUPERADMIN === true,
        })
      ) {
        if (element.dataset.operationsPreviousAria === undefined)
          element.dataset.operationsPreviousAria = element.getAttribute('aria-disabled') || '';
        element.setAttribute('aria-disabled', 'true');
        element.dataset.operationsPaused = 'true';
      } else if (element.dataset.operationsPaused) {
        const previous = element.dataset.operationsPreviousAria;
        if (previous) element.setAttribute('aria-disabled', previous);
        else element.removeAttribute('aria-disabled');
        delete element.dataset.operationsPreviousAria;
        delete element.dataset.operationsPaused;
      }
    });
  }
}

export function operationStatusText(config) {
  const effective = normalizeOperationsConfig(config);
  return [
    effective.notice,
    effective.readOnly ? 'Team changes are temporarily paused. Browsing remains available.' : '',
    effective.disabledFeatures.length
      ? `Temporarily paused: ${effective.disabledFeatures.join(', ')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function renderOperationsNotice(config, documentOverride = document) {
  const document = documentOverride;
  // The recovery dashboard must remain usable even during an incident.
  const adminPage = /(?:^|\/)admin(?:\.html)?\/?$/i.test(document.location?.pathname || '');
  let notice = document.getElementById('vtsOperationsNotice');
  const text = operationStatusText(config);
  if (!text || adminPage) {
    notice?.remove();
    return;
  }
  if (!notice) {
    notice = document.createElement('aside');
    notice.id = 'vtsOperationsNotice';
    notice.setAttribute('role', 'status');
    notice.style.cssText =
      'position:relative;z-index:1000;padding:12px 20px;background:#253047;color:#fff;border-bottom:2px solid #dfb463;font:inherit;line-height:1.5;white-space:pre-wrap';
    document.body.prepend(notice);
  }
  // Never interpret an operator message as HTML or a redirect.
  notice.textContent = text;
}

let started = false;
export async function initOperationsRuntime() {
  if (started || typeof document === 'undefined') return;
  started = true;
  try {
    const [{ initFirebase, ensureAnonymousAuth, getDb }, firestore] = await Promise.all([
      import('./firebase.js'),
      import('./firebase-sdk.js').then((sdk) => sdk.importFirestore()),
    ]);
    if (!initFirebase()?.configured) return;
    const user = await ensureAnonymousAuth();
    if (!user || !getDb()) return;
    globalThis.VTS_OPERATIONS_SUPERADMIN =
      (await user.getIdTokenResult?.())?.claims?.superadmin === true;
    let current = {};
    let expiryTimer;
    const apply = () => {
      const effective = normalizeOperationsConfig(current);
      window.VTS_OPERATIONS_CONFIG = effective;
      renderOperationsNotice(effective);
      guardOperationEntryPoints(effective);
      window.dispatchEvent(new CustomEvent('vts:operations', { detail: effective }));
      clearTimeout(expiryTimer);
      if (effective.expiresAtMs > Date.now()) {
        expiryTimer = setTimeout(
          apply,
          Math.min(effective.expiresAtMs - Date.now() + 10, 2147483647)
        );
      }
    };
    firestore.onSnapshot(
      firestore.doc(getDb(), OPERATIONS_CONFIG_PATH),
      (snapshot) => {
        current = snapshot.data() || {};
        apply();
      },
      () => {
        // A stale local pause must not outlive its explicit expiry. Backend
        // rules remain the authority when the network cannot refresh settings.
        apply();
      }
    );
    window.addEventListener('focus', apply);
    document.addEventListener(
      'click',
      (event) => {
        for (const [feature, selector] of Object.entries(OPERATION_ENTRY_POINTS)) {
          if (
            event.target.closest?.(selector) &&
            isOperationPaused(current, feature, {
              superadmin: globalThis.VTS_OPERATIONS_SUPERADMIN === true,
            })
          ) {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.showToast?.('This feature is temporarily paused by the team.', 'info');
            break;
          }
        }
      },
      true
    );
  } catch {
    // A notice service outage must not prevent visiting or recovering the site.
  }
}
