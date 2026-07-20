import {
  ALL_STAR_BOH_OCR_ENDPOINT,
  ALL_STAR_BOH_UNLOCK_ENDPOINT,
  AllStarBohAccessError,
  createAllStarBohAccessClient,
  readAllStarBohAccessGrant,
} from './all-star-boh-access.js';

const bootstraps = new WeakMap();
const SECURE_BOOT_TIMEOUT_MS = 12_000;
const MANUAL_LOCK_KEY = 'vts_all_star_boh_manual_lock';

const GATE_FALLBACKS = Object.freeze({
  kicker: 'VTS MEMBERS ONLY',
  title: 'Unlock the All-Star BoH hub',
  description:
    'Enter the current VTS member PIN. Team announcements and personal plans stay locked until secure access is confirmed.',
  pinLabel: 'Member PIN',
  pinHint: 'The PIN is checked securely and is never saved on this device.',
  unlock: 'Unlock hub',
  retry: 'Retry',
  showPin: 'Show PIN',
  hidePin: 'Hide PIN',
  checking: 'Checking your secure member access...',
  busy: 'Confirming member access...',
  expired: 'Your member access expired. Enter the current PIN to unlock it again.',
  invalidPin: 'Enter the current member PIN.',
  denied: 'That PIN did not match. Check it and try again.',
  locked: 'Too many attempts. Wait a moment, then try again.',
  closed: 'All-Star BoH access is not open right now.',
  auth: 'Secure sign-in could not be prepared. Please try again.',
  identityConflict:
    'This browser is signed into the leadership dashboard. To protect player signups, open this link in a private window and enter the member PIN there.',
  appCheck: 'Secure app verification could not be completed. Please try again.',
  network: 'The secure service could not be reached. Check your connection and try again.',
  secureServiceUnreachable:
    'The secure Google service required for signup cannot be reached from this network or region. Try a VPN or a different network, then press Retry. Your PIN has not been rejected.',
  generic: 'Member access could not be confirmed. Please try again.',
});

function secureServiceUnreachable(error) {
  if (error?.code === 'secure_service_unreachable') return error;
  return new AllStarBohAccessError(
    'secure_service_unreachable',
    'The secure signup service could not be reached.',
    { cause: error }
  );
}

function isSecureTransportError(error) {
  return error?.code === 'network_error' || error?.code === 'request_timeout';
}

function isFirebaseAuthNetworkError(error) {
  return String(error?.code || '').toLowerCase() === 'auth/network-request-failed';
}

function isAppCheckNetworkError(error) {
  const code = String(error?.code || '').toLowerCase();
  return (
    code === 'appcheck/fetch-network-error' ||
    code === 'app-check/fetch-network-error' ||
    code === 'appcheck/network-request-failed' ||
    code === 'app-check/network-request-failed'
  );
}

function isSecureResourceLoadError(error) {
  const message = String(error?.message || error || '');
  return /^(?:failed to fetch|fetch failed|load failed)$|failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|unable to preload|networkerror when attempting to fetch resource/iu.test(
    message
  );
}

function normalizeSecureTransportError(error) {
  return error?.code === 'secure_service_unreachable' ||
    isSecureTransportError(error) ||
    isFirebaseAuthNetworkError(error) ||
    isAppCheckNetworkError(error)
    ? secureServiceUnreachable(error)
    : error;
}

function normalizeLocale(value) {
  const locale = String(value || 'en')
    .trim()
    .toLowerCase()
    .replace('_', '-');
  if (locale === 'ko' || locale.startsWith('ko-')) return 'kr';
  const base = locale.split('-')[0];
  return ['ar', 'de', 'en', 'es', 'fr', 'hr', 'id', 'kr', 'pt', 'ru', 'tr', 'zh'].includes(base)
    ? base
    : 'en';
}

function currentLocale(documentRef, fallback = 'en') {
  return normalizeLocale(documentRef?.documentElement?.lang || fallback);
}

function currentCatalog(locale) {
  const catalogs = globalThis.VTS_TRANSLATIONS;
  return catalogs && typeof catalogs === 'object'
    ? catalogs[normalizeLocale(locale)] || catalogs.en || {}
    : {};
}

function accessText(catalog, key, fallback, legacyKey = '') {
  const translated = catalog?.[`bohAccess${key}`] || (legacyKey ? catalog?.[legacyKey] : '');
  return typeof translated === 'string' && translated.trim() ? translated : fallback;
}

function concealBohRoot(root) {
  if (!root) return;
  root.hidden = true;
  root.setAttribute?.('aria-hidden', 'true');
  root.setAttribute?.('inert', '');
  if ('inert' in root) root.inert = true;
}

function revealBohRoot(root) {
  if (!root) return;
  root.hidden = false;
  root.removeAttribute?.('aria-hidden');
  root.removeAttribute?.('inert');
  if ('inert' in root) root.inert = false;
}

function element(documentRef, tagName, className, text) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function append(parent, ...children) {
  parent.append(...children.filter(Boolean));
  return parent;
}

function gateErrorMessage(error, copy) {
  switch (error?.code) {
    case 'invalid_pin':
      return copy.invalidPin;
    case 'access_denied':
      return copy.denied;
    case 'temporarily_locked':
    case 'rate_limited':
      return error.retryAfterSeconds > 0
        ? `${copy.locked} (${error.retryAfterSeconds}s)`
        : copy.locked;
    case 'signups_closed':
      return copy.closed;
    case 'auth_required':
    case 'invalid_auth':
    case 'grant_verification_failed':
      return copy.auth;
    case 'member_identity_conflict':
      return copy.identityConflict;
    case 'app_check_required':
    case 'invalid_app_check':
      return copy.appCheck;
    case 'network_error':
    case 'request_timeout':
      return copy.network;
    case 'secure_service_unreachable':
      return copy.secureServiceUnreachable;
    case 'access_expired':
      return copy.expired;
    default:
      return copy.generic;
  }
}

export function createAllStarBohAccessGate(options = {}) {
  const root = options.root;
  const documentRef = options.document || root?.ownerDocument || globalThis.document;
  if (!root || !documentRef?.createElement || !root.parentNode?.insertBefore) {
    throw new TypeError('All-Star BoH access gate requires a mounted player hub.');
  }

  const container = element(documentRef, 'section', 'boh-hub boh-access-gate');
  container.dataset.role = 'boh-access-gate';
  container.setAttribute('aria-labelledby', 'bohAccessTitle');

  const hero = element(documentRef, 'header', 'boh-hero');
  const heroCopy = element(documentRef, 'div', 'boh-hero__copy');
  const kicker = element(documentRef, 'p', 'boh-eyebrow');
  const title = element(documentRef, 'h2');
  title.id = 'bohAccessTitle';
  const description = element(documentRef, 'p');
  append(heroCopy, kicker, title, description);
  append(hero, heroCopy);

  const card = element(documentRef, 'div', 'boh-card boh-access-card');
  const form = element(documentRef, 'form', 'boh-form boh-access-form');
  form.noValidate = true;
  const field = element(documentRef, 'div', 'boh-field');
  const pinLabel = element(documentRef, 'label');
  const input = element(documentRef, 'input');
  const pinInputId = 'bohAccessPin';
  const pinHintId = 'bohAccessPinHint';
  input.type = 'password';
  input.setAttribute('id', pinInputId);
  input.setAttribute('aria-describedby', pinHintId);
  pinLabel.setAttribute('for', pinInputId);
  input.name = 'bohMemberPin';
  input.autocomplete = 'off';
  input.autocapitalize = 'none';
  input.spellcheck = false;
  input.maxLength = 128;
  input.required = true;
  input.dataset.role = 'boh-access-pin';
  const pinHint = element(documentRef, 'small');
  pinHint.setAttribute('id', pinHintId);
  const pinControl = element(documentRef, 'div', 'boh-pin-control');
  const togglePin = element(documentRef, 'button', 'boh-pin-toggle');
  togglePin.type = 'button';
  togglePin.dataset.role = 'boh-access-pin-toggle';
  togglePin.setAttribute('aria-pressed', 'false');
  const togglePinIcon = element(documentRef, 'span', 'boh-pin-toggle__icon', '◉');
  togglePinIcon.setAttribute('aria-hidden', 'true');
  append(togglePin, togglePinIcon);
  append(pinControl, input, togglePin);
  append(field, pinLabel, pinControl, pinHint);

  const feedback = element(documentRef, 'p', 'boh-feedback');
  feedback.dataset.role = 'boh-access-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');

  const actions = element(documentRef, 'div', 'boh-form-actions');
  const submit = element(documentRef, 'button', 'boh-button boh-button--primary');
  submit.type = 'submit';
  submit.dataset.role = 'boh-access-submit';
  const retry = element(documentRef, 'button', 'boh-button boh-button--primary');
  retry.type = 'button';
  retry.dataset.role = 'boh-access-retry';
  retry.hidden = true;
  append(actions, submit, retry);
  append(form, field, feedback, actions);
  const progress = element(documentRef, 'div', 'boh-access-progress');
  progress.dataset.role = 'boh-access-progress';
  progress.hidden = true;
  const loader = element(documentRef, 'div');
  loader.dataset.vtsLoader = '';
  loader.dataset.vtsLoaderContext = 'admin';
  loader.dataset.vtsLoaderVariant = 'compact';
  loader.dataset.vtsLoaderProgress = 'indeterminate';
  append(progress, loader);
  append(card, form, progress);
  append(container, hero, card);
  root.parentNode.insertBefore(container, root);

  let locale = normalizeLocale(options.locale || currentLocale(documentRef));
  let copy = {};
  let unlockHandler = null;
  let retryHandler = null;
  let state = 'checking';
  let lastError = null;

  function resetPin() {
    input.value = '';
    input.type = 'password';
    togglePin.setAttribute('aria-pressed', 'false');
    togglePin.setAttribute('aria-label', copy.showPin || GATE_FALLBACKS.showPin);
  }

  function updateCopy() {
    const catalog = options.getCatalog?.(locale) || currentCatalog(locale) || Object.create(null);
    copy = {
      kicker: accessText(catalog, 'Kicker', GATE_FALLBACKS.kicker),
      title: accessText(catalog, 'Title', GATE_FALLBACKS.title, 'tabAllStarBoh'),
      description: accessText(catalog, 'Description', GATE_FALLBACKS.description),
      pinLabel: accessText(catalog, 'PinLabel', GATE_FALLBACKS.pinLabel, 'adminEdenVotesPinLabel'),
      pinHint: accessText(catalog, 'PinHint', GATE_FALLBACKS.pinHint),
      unlock: accessText(catalog, 'Unlock', GATE_FALLBACKS.unlock, 'adminEdenVotesPinUnlock'),
      retry: accessText(catalog, 'Retry', GATE_FALLBACKS.retry),
      showPin: accessText(catalog, 'ShowPin', GATE_FALLBACKS.showPin),
      hidePin: accessText(catalog, 'HidePin', GATE_FALLBACKS.hidePin),
      checking: accessText(catalog, 'Checking', GATE_FALLBACKS.checking),
      busy: accessText(catalog, 'Busy', GATE_FALLBACKS.busy),
      expired: accessText(catalog, 'Expired', GATE_FALLBACKS.expired),
      invalidPin: accessText(catalog, 'ErrorInvalidPin', GATE_FALLBACKS.invalidPin),
      denied: accessText(catalog, 'ErrorDenied', GATE_FALLBACKS.denied, 'adminEdenVotesPinError'),
      locked: accessText(catalog, 'ErrorLocked', GATE_FALLBACKS.locked),
      closed: accessText(catalog, 'ErrorClosed', GATE_FALLBACKS.closed),
      auth: accessText(catalog, 'ErrorAuth', GATE_FALLBACKS.auth),
      identityConflict: accessText(
        catalog,
        'ErrorIdentityConflict',
        GATE_FALLBACKS.identityConflict
      ),
      appCheck: accessText(catalog, 'ErrorAppCheck', GATE_FALLBACKS.appCheck),
      network: accessText(catalog, 'ErrorNetwork', GATE_FALLBACKS.network),
      secureServiceUnreachable: accessText(
        catalog,
        'ErrorSecureServiceUnreachable',
        GATE_FALLBACKS.secureServiceUnreachable
      ),
      generic: accessText(catalog, 'ErrorGeneric', GATE_FALLBACKS.generic),
    };
    kicker.textContent = copy.kicker;
    title.textContent = copy.title;
    description.textContent = copy.description;
    pinLabel.textContent = copy.pinLabel;
    pinHint.textContent = copy.pinHint;
    retry.textContent = copy.retry;
    togglePin.setAttribute('aria-label', input.type === 'text' ? copy.hidePin : copy.showPin);
    loader.dataset.vtsLoaderKicker = 'VELO';
    loader.dataset.vtsLoaderTitle = copy.busy;
    loader.dataset.vtsLoaderStatus = copy.checking;
    const mountedKicker = loader.querySelector?.('.vts-loader__kicker');
    const mountedTitle = loader.querySelector?.('.vts-loader__title');
    const mountedStatus = loader.querySelector?.('.vts-loader__status');
    if (mountedKicker) mountedKicker.textContent = 'VELO';
    if (mountedTitle) mountedTitle.textContent = copy.busy;
    if (mountedStatus) mountedStatus.textContent = copy.checking;
  }

  function render() {
    updateCopy();
    const busy = state === 'checking' || state === 'busy';
    const unlocking = state === 'busy';
    const secureError = state === 'secure-error';
    form.hidden = unlocking;
    progress.hidden = !unlocking;
    field.hidden = secureError;
    input.disabled = busy || secureError;
    togglePin.disabled = busy || secureError;
    submit.hidden = secureError;
    submit.disabled = busy || secureError;
    retry.hidden = !secureError;
    retry.disabled = !secureError;
    submit.setAttribute('aria-busy', String(state === 'busy'));
    submit.textContent = state === 'busy' ? copy.busy : copy.unlock;
    feedback.dataset.tone =
      state === 'error' || state === 'secure-error' || state === 'expired' ? 'error' : 'neutral';
    const assertive = state === 'error' || state === 'secure-error' || state === 'expired';
    feedback.setAttribute('role', assertive ? 'alert' : 'status');
    feedback.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    if (state === 'checking') feedback.textContent = copy.checking;
    else if (state === 'busy') feedback.textContent = copy.busy;
    else if (state === 'expired') feedback.textContent = copy.expired;
    else if (state === 'error' || state === 'secure-error')
      feedback.textContent = gateErrorMessage(lastError, copy);
    else feedback.textContent = '';
  }

  togglePin.addEventListener('click', () => {
    if (togglePin.disabled) return;
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    togglePin.setAttribute('aria-pressed', String(!visible));
    togglePin.setAttribute('aria-label', visible ? copy.showPin : copy.hidePin);
    input.focus?.();
  });

  retry.addEventListener('click', async () => {
    if (state !== 'secure-error') return;
    resetPin();
    await retryHandler?.();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state === 'busy' || state === 'checking' || state === 'secure-error') return;
    const pin = input.value;
    resetPin();
    await unlockHandler?.(pin);
  });
  updateCopy();
  render();

  return Object.freeze({
    setHandlers(handlers = {}) {
      unlockHandler = typeof handlers.unlock === 'function' ? handlers.unlock : null;
      retryHandler = typeof handlers.retry === 'function' ? handlers.retry : null;
    },
    setLocale(value) {
      locale = normalizeLocale(value);
      render();
    },
    showChecking() {
      resetPin();
      state = 'checking';
      lastError = null;
      container.hidden = false;
      render();
    },
    showLocked() {
      resetPin();
      state = 'locked';
      lastError = null;
      container.hidden = false;
      render();
      input.focus?.();
    },
    showBusy() {
      resetPin();
      state = 'busy';
      lastError = null;
      container.hidden = false;
      render();
    },
    showExpired() {
      resetPin();
      state = 'expired';
      lastError = null;
      container.hidden = false;
      render();
      input.focus?.();
    },
    showError(error) {
      resetPin();
      state = error?.code === 'secure_service_unreachable' ? 'secure-error' : 'error';
      lastError = error;
      container.hidden = false;
      render();
      if (state === 'secure-error') retry.focus?.();
      else input.focus?.();
    },
    hide() {
      resetPin();
      container.hidden = true;
    },
    destroy() {
      resetPin();
      unlockHandler = null;
      retryHandler = null;
      container.remove();
    },
  });
}

async function loadAllStarBohDomain() {
  const [controller, model, ocr, store, i18n, heroData, researchData, researchI18n, firebaseSdk] =
    await Promise.all([
      import('./all-star-boh.js'),
      import('./all-star-boh-model.js'),
      import('./all-star-boh-ocr.js'),
      import('./all-star-boh-store.js'),
      import('./i18n/all-star-boh/index.js'),
      import('./heroes-data.js'),
      import('./tech-db.js'),
      import('./i18n/research/index.js'),
      import('./firebase-sdk.js'),
    ]);
  const firestore = await firebaseSdk.importFirestore();
  return {
    controller,
    model,
    ocr,
    store,
    i18n,
    heroData,
    researchData,
    researchI18n,
    firestore,
  };
}

async function loadAllStarBohStylesheet() {
  await import('../css/all-star-boh.css');
}

function validateGrant(grant, now) {
  return readAllStarBohAccessGrant(grant, { minimumRemainingSeconds: 0, now });
}

function withSecureBootTimeout(task, options = {}) {
  const setTimer = options.setTimeout;
  const clearTimer = options.clearTimeout;
  const timeoutMs = Number.isFinite(Number(options.timeoutMs))
    ? Math.max(1, Math.trunc(Number(options.timeoutMs)))
    : SECURE_BOOT_TIMEOUT_MS;
  if (typeof setTimer !== 'function') return Promise.resolve(task);
  let timer = null;
  return Promise.race([
    Promise.resolve(task),
    new Promise((_resolve, reject) => {
      timer = setTimer(() => {
        reject(
          new AllStarBohAccessError(
            'secure_service_unreachable',
            'Secure member access could not be prepared in time.'
          )
        );
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timer !== null && typeof clearTimer === 'function') clearTimer(timer);
  });
}

export async function bootAllStarBohTab(options = {}) {
  const documentRef = options.document || globalThis.document;
  const root =
    options.root || documentRef?.querySelector?.('#allStarBohSection [data-role="boh-root"]');
  if (!root) throw new TypeError('All-Star BoH player hub root was not found.');
  const existing = bootstraps.get(root);
  if (existing) return existing;

  concealBohRoot(root);
  const gate =
    options.gate ||
    (options.createGate || createAllStarBohAccessGate)({
      root,
      document: documentRef,
      locale: options.locale || currentLocale(documentRef),
      getCatalog: options.getCatalog,
    });
  const loadingPlaceholder =
    options.loadingPlaceholder || root.parentNode?.querySelector?.('.tab-loading');
  loadingPlaceholder?.remove?.();
  await (options.loadStylesheet || loadAllStarBohStylesheet)();
  const now = options.now || Date.now;
  const setTimer = options.setTimeout || globalThis.setTimeout?.bind(globalThis);
  const clearTimer = options.clearTimeout || globalThis.clearTimeout?.bind(globalThis);
  const eventTarget = options.eventTarget || documentRef?.defaultView || globalThis.window;
  let locale = normalizeLocale(options.locale || currentLocale(documentRef));
  let destroyed = false;
  let busy = false;
  let firebasePromise = null;
  let domainPromise = null;
  let firebase = null;
  let firebaseContext = null;
  let accessClient = options.accessClient || null;
  let playerController = null;
  let expiryTimer = null;
  let languageGeneration = 0;
  let lifecycleGeneration = 0;
  let manuallyLockedInMemory = false;
  let lockStorage = options.lockStorage || null;
  if (!lockStorage) {
    try {
      lockStorage = globalThis.localStorage;
    } catch {
      lockStorage = null;
    }
  }

  function isManuallyLocked() {
    try {
      return manuallyLockedInMemory || lockStorage?.getItem?.(MANUAL_LOCK_KEY) === '1';
    } catch {
      return manuallyLockedInMemory;
    }
  }

  function setManuallyLocked(locked) {
    manuallyLockedInMemory = Boolean(locked);
    try {
      if (locked) lockStorage?.setItem?.(MANUAL_LOCK_KEY, '1');
      else lockStorage?.removeItem?.(MANUAL_LOCK_KEY);
    } catch {
      // The in-memory lock still protects the currently mounted private view.
    }
  }

  function clearExpiryTimer() {
    if (expiryTimer !== null && typeof clearTimer === 'function') clearTimer(expiryTimer);
    expiryTimer = null;
  }

  function unmountDomain() {
    clearExpiryTimer();
    playerController?.destroy?.();
    playerController = null;
  }

  function relockExpired() {
    if (destroyed) return;
    unmountDomain();
    concealBohRoot(root);
    gate.showExpired();
  }

  function lockHub() {
    if (destroyed) return;
    lifecycleGeneration += 1;
    setManuallyLocked(true);
    unmountDomain();
    concealBohRoot(root);
    gate.showLocked();
  }

  function scheduleExpiry(grant) {
    clearExpiryTimer();
    if (typeof setTimer !== 'function') return;
    const delay = Math.max(0, grant.expiresAt * 1000 - Number(now()) + 50);
    expiryTimer = setTimer(relockExpired, delay);
  }

  async function ensureFirebase() {
    if (firebaseContext) return firebaseContext;
    if (!firebasePromise) {
      const bootstrapTask = (async () => {
        if (options.firebase) {
          firebase = options.firebase;
        } else {
          try {
            firebase = await (options.loadFirebase || (() => import('./firebase.js')))();
          } catch (error) {
            if (isSecureResourceLoadError(error)) throw secureServiceUnreachable(error);
            throw error;
          }
        }
        let initialized;
        try {
          initialized = await firebase.initFirebase?.();
        } catch (error) {
          if (isSecureResourceLoadError(error)) throw secureServiceUnreachable(error);
          throw error;
        }
        if (!initialized?.configured || !initialized.db) {
          throw new AllStarBohAccessError(
            'auth_required',
            'Firebase is not configured for All-Star access.'
          );
        }
        let user;
        try {
          user = await firebase.ensureAnonymousAuth?.();
        } catch (error) {
          if (isFirebaseAuthNetworkError(error) || isSecureResourceLoadError(error)) {
            throw secureServiceUnreachable(error);
          }
          throw error;
        }
        if (!user?.uid) {
          throw new AllStarBohAccessError('auth_required', 'Firebase sign-in is unavailable.');
        }
        if (user.isAnonymous !== true) {
          throw new AllStarBohAccessError(
            'member_identity_conflict',
            'The All-Star member signup cannot use a leadership account.'
          );
        }
        firebaseContext = { db: initialized.db, user };
        if (!accessClient) {
          accessClient = (options.createAccessClient || createAllStarBohAccessClient)({
            getUser: () => firebaseContext.user,
            getAppCheckToken: (forceRefresh) =>
              firebase.getFirebaseAppCheckToken?.(Boolean(forceRefresh)),
            fetch: options.fetch,
            unlockEndpoint: options.unlockEndpoint || ALL_STAR_BOH_UNLOCK_ENDPOINT,
            ocrEndpoint: options.ocrEndpoint || ALL_STAR_BOH_OCR_ENDPOINT,
            grantEndpoint: options.grantEndpoint,
            now,
          });
        }
        return firebaseContext;
      })();
      firebasePromise = withSecureBootTimeout(bootstrapTask, {
        setTimeout: setTimer,
        clearTimeout: clearTimer,
        timeoutMs: options.firebaseTimeoutMs,
      }).catch((error) => {
        firebasePromise = null;
        throw error;
      });
    }
    return firebasePromise;
  }

  async function ensureAppCheck() {
    let token;
    try {
      token = await withSecureBootTimeout(firebase?.getFirebaseAppCheckToken?.(false), {
        setTimeout: setTimer,
        clearTimeout: clearTimer,
        timeoutMs: options.firebaseTimeoutMs,
      });
    } catch (error) {
      if (
        error?.code === 'secure_service_unreachable' ||
        isAppCheckNetworkError(error) ||
        isSecureResourceLoadError(error)
      ) {
        throw secureServiceUnreachable(error);
      }
      throw error;
    }
    if (typeof token !== 'string' || !token) {
      throw new AllStarBohAccessError('app_check_required', 'Secure app verification is required.');
    }
  }

  async function getDomain() {
    if (!domainPromise) {
      domainPromise = Promise.resolve()
        .then(() => (options.loadDomain || loadAllStarBohDomain)())
        .catch((error) => {
          domainPromise = null;
          throw isSecureResourceLoadError(error) ? secureServiceUnreachable(error) : error;
        });
    }
    return domainPromise;
  }

  async function mountDomain(grantInput) {
    const mountGeneration = lifecycleGeneration;
    let grant = validateGrant(grantInput, now);
    if (!grant) throw new AllStarBohAccessError('access_expired', 'Member access expired.');
    await ensureAppCheck();
    if (destroyed || mountGeneration !== lifecycleGeneration) return false;
    const domain = await getDomain();
    if (destroyed || mountGeneration !== lifecycleGeneration) return false;
    if (
      typeof domain?.store?.createAllStarBohPlayerStore !== 'function' ||
      typeof domain?.controller?.initializeAllStarBoh !== 'function' ||
      typeof domain?.i18n?.allStarBohText !== 'function'
    ) {
      throw new TypeError('All-Star BoH domain modules are incomplete.');
    }
    await Promise.all([
      domain.i18n.loadAllStarBohLocale?.(locale),
      domain.researchI18n?.loadResearchLocale?.(locale),
    ]);
    if (destroyed || mountGeneration !== lifecycleGeneration) return false;
    grant = validateGrant(grant, now);
    if (!grant) throw new AllStarBohAccessError('access_expired', 'Member access expired.');
    domain.i18n.applyAllStarBohTranslations?.(root, locale);
    unmountDomain();
    const heroes = Array.isArray(domain.heroData?.allHeroesData)
      ? domain.heroData.allHeroesData
      : [];
    const researchTrees = Array.isArray(domain.researchData?.techDatabase)
      ? domain.researchData.techDatabase
      : [];
    const heroNames = heroes.map((hero) => String(hero?.name || '').trim()).filter(Boolean);
    const researchTreeIds = researchTrees
      .map((tree) => String(tree?.id || '').trim())
      .filter(Boolean);
    const store = domain.store.createAllStarBohPlayerStore({
      db: firebaseContext.db,
      firestore: domain.firestore,
      seasonId: grant.seasonId,
      uid: firebaseContext.user.uid,
      heroNames,
      researchTreeIds,
    });
    const ocrService = Object.freeze({
      ...domain.ocr,
      process: (request) => accessClient.processOcr(request),
    });
    playerController = domain.controller.initializeAllStarBoh({
      root,
      store,
      ocrService,
      model: domain.model,
      text: domain.i18n.allStarBohText,
      language: locale,
      seasonId: grant.seasonId,
      heroes,
      researchTrees,
      researchTreeText: domain.researchI18n?.researchTreeText,
      loadResearchLocale: domain.researchI18n?.loadResearchLocale,
      onError(error, context) {
        if (error?.code === 'access_expired') {
          relockExpired();
        }
        options.onError?.(error, context);
      },
      onNotice: options.onNotice,
      onLockHub: lockHub,
    });
    revealBohRoot(root);
    gate.hide();
    scheduleExpiry(grant);
    return true;
  }

  async function unlock(pin) {
    if (destroyed || busy) return;
    busy = true;
    gate.showBusy();
    try {
      await ensureFirebase();
      const grant = await accessClient.unlock(pin);
      if (destroyed) return;
      const mounted = await mountDomain(grant);
      if (mounted) setManuallyLocked(false);
    } catch (error) {
      if (!destroyed) {
        concealBohRoot(root);
        gate.showError(normalizeSecureTransportError(error));
      }
    } finally {
      busy = false;
    }
  }

  gate.showChecking();

  const languageHandler = async (event) => {
    const generation = ++languageGeneration;
    locale = normalizeLocale(event?.detail?.lang || currentLocale(documentRef, locale));
    gate.setLocale(locale);
    if (!playerController || !domainPromise) return;
    try {
      const domain = await domainPromise;
      await Promise.all([
        domain.i18n.loadAllStarBohLocale?.(locale),
        domain.researchI18n?.loadResearchLocale?.(locale),
      ]);
      if (destroyed || generation !== languageGeneration || !playerController) return;
      domain.i18n.applyAllStarBohTranslations?.(root, locale);
      playerController.setLanguage?.(locale, domain.i18n.allStarBohText);
    } catch (error) {
      options.onError?.(error, { action: 'language' });
    }
  };
  eventTarget?.addEventListener?.('vts:language-change', languageHandler);

  const lifecycle = Object.freeze({
    async retry() {
      if (destroyed || busy) return lifecycle;
      if (isManuallyLocked()) {
        concealBohRoot(root);
        gate.showLocked();
        return lifecycle;
      }
      busy = true;
      gate.showChecking();
      try {
        await ensureFirebase();
        const grant = await accessClient.getAccessGrant();
        if (grant) await mountDomain(grant);
        else gate.showLocked();
      } catch (error) {
        if (!destroyed) gate.showError(normalizeSecureTransportError(error));
      } finally {
        busy = false;
      }
      return lifecycle;
    },
    lock() {
      lockHub();
      return lifecycle;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      lifecycleGeneration += 1;
      unmountDomain();
      accessClient?.destroy?.();
      gate.destroy();
      concealBohRoot(root);
      eventTarget?.removeEventListener?.('vts:language-change', languageHandler);
      bootstraps.delete(root);
    },
  });
  gate.setHandlers({ unlock, retry: lifecycle.retry });
  bootstraps.set(root, lifecycle);
  await lifecycle.retry();
  return lifecycle;
}

export function destroyAllStarBohTab(
  root = globalThis.document?.querySelector?.('[data-role="boh-root"]')
) {
  bootstraps.get(root)?.destroy();
}

// The template is fetched before this module. Conceal it during module
// evaluation so the editable form cannot flash before the secure gate mounts.
concealBohRoot(globalThis.document?.querySelector?.('#allStarBohSection [data-role="boh-root"]'));
