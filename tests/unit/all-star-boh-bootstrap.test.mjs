import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { bootAllStarBohTab, createAllStarBohAccessGate } from '../../js/all-star-boh-bootstrap.js';

const NOW_MS = 1_750_000_000_000;
const GRANT = Object.freeze({
  seasonId: 'season-2026',
  expiresAt: Math.floor(NOW_MS / 1000) + 3600,
});

function createRoot() {
  const attributes = new Map();
  return {
    dataset: {},
    hidden: false,
    inert: false,
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
  };
}

function createGate(order = []) {
  let handlers = {};
  const states = [];
  const gate = {
    states,
    setHandlers(value) {
      order.push('gate-handlers');
      handlers = value;
    },
    setLocale(value) {
      gate.locale = value;
    },
    showChecking() {
      states.push('checking');
    },
    showClosed() {
      states.push('closed');
    },
    showLocked() {
      states.push('locked');
    },
    showBusy() {
      states.push('busy');
    },
    showExpired() {
      states.push('expired');
    },
    showError(error) {
      gate.error = error;
      states.push('error');
    },
    hide() {
      states.push('hidden');
    },
    destroy() {
      states.push('destroyed');
    },
    unlock(pin) {
      return handlers.unlock(pin);
    },
    retry() {
      return handlers.retry();
    },
  };
  return gate;
}

function createGateDocument(language = 'en') {
  function createNode(tagName = '') {
    const attributes = new Map();
    const listeners = new Map();
    const node = {
      tagName: String(tagName).toUpperCase(),
      children: [],
      parentNode: null,
      dataset: {},
      className: '',
      textContent: '',
      hidden: false,
      disabled: false,
      value: '',
      type: '',
      append(...children) {
        children.forEach((child) => {
          if (!child) return;
          child.parentNode = node;
          node.children.push(child);
        });
      },
      insertBefore(child, reference) {
        child.parentNode = node;
        const index = node.children.indexOf(reference);
        if (index < 0) node.children.push(child);
        else node.children.splice(index, 0, child);
      },
      remove() {
        const index = node.parentNode?.children.indexOf(node) ?? -1;
        if (index >= 0) node.parentNode.children.splice(index, 1);
        node.parentNode = null;
      },
      setAttribute(name, value) {
        attributes.set(name, String(value));
      },
      removeAttribute(name) {
        attributes.delete(name);
      },
      getAttribute(name) {
        return attributes.get(name) ?? null;
      },
      addEventListener(type, listener) {
        const entries = listeners.get(type) || [];
        entries.push(listener);
        listeners.set(type, entries);
      },
      async dispatch(type, event = {}) {
        await Promise.all((listeners.get(type) || []).map((listener) => listener(event)));
      },
      querySelector(selector) {
        const match = (candidate) => {
          const role = selector.match(/^\[data-role="([^"]+)"\]$/u)?.[1];
          if (role) return candidate.dataset.role === role;
          if (selector.startsWith('.')) {
            return candidate.className.split(/\s+/u).includes(selector.slice(1));
          }
          return candidate.tagName === selector.toUpperCase();
        };
        const queue = [...node.children];
        while (queue.length) {
          const candidate = queue.shift();
          if (match(candidate)) return candidate;
          queue.push(...candidate.children);
        }
        return null;
      },
      focus() {
        node.focused = true;
      },
    };
    return node;
  }

  const document = {
    documentElement: { lang: language },
    createElement: createNode,
  };
  const parent = createNode('div');
  const root = createNode('main');
  root.ownerDocument = document;
  parent.append(root);
  return { document, parent, root };
}

function createEventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
}

function createDomain(records = {}) {
  const controller = {
    destroyed: false,
    setLanguageCalls: [],
    destroy() {
      controller.destroyed = true;
    },
    setLanguage(...args) {
      controller.setLanguageCalls.push(args);
    },
  };
  return {
    controller: {
      initializeAllStarBoh(options) {
        records.controllerOptions = options;
        return controller;
      },
    },
    model: { model: true },
    ocr: { prepareBohStatsScreenshot() {} },
    store: {
      createAllStarBohPlayerStore(options) {
        records.storeOptions = options;
        return { seasonId: options.seasonId, stop() {} };
      },
    },
    i18n: {
      async loadAllStarBohLocale(locale) {
        (records.loadedLocales ||= []).push(locale);
      },
      applyAllStarBohTranslations(_root, locale) {
        (records.appliedLocales ||= []).push(locale);
      },
      allStarBohText(key) {
        return key;
      },
    },
    heroData: {
      allHeroesData: [
        { name: 'Hero One', Type: 'Cavalry', season: 'S1' },
        { name: 'Hero Two', Type: 'Archers', season: 'S2' },
      ],
    },
    researchData: {
      techDatabase: [
        { id: 'tree-one', name: 'Tree One', season: 'S1' },
        { id: 'tree-two', name: 'Tree Two', season: 'S2' },
      ],
    },
    researchI18n: {
      async loadResearchLocale(locale) {
        (records.loadedResearchLocales ||= []).push(locale);
      },
      researchTreeText(tree, field) {
        return tree?.[field] || '';
      },
    },
    firestore: { doc() {} },
    testController: controller,
  };
}

function createFirebase() {
  const appCheckCalls = [];
  return {
    appCheckCalls,
    initFirebase() {
      return { configured: true, db: { name: 'db' } };
    },
    async ensureAnonymousAuth() {
      return { uid: 'member-uid', isAnonymous: true };
    },
    async getFirebaseAppCheckToken(forceRefresh) {
      appCheckCalls.push(forceRefresh);
      return 'app-check-token';
    },
  };
}

test('PIN visibility is accessible and resets after submit and secure state transitions', async () => {
  const { document, parent, root } = createGateDocument();
  const gate = createAllStarBohAccessGate({ root, document });
  const input = parent.querySelector('[data-role="boh-access-pin"]');
  const toggle = parent.querySelector('[data-role="boh-access-pin-toggle"]');
  const submit = parent.querySelector('[data-role="boh-access-submit"]');
  const retry = parent.querySelector('[data-role="boh-access-retry"]');
  const feedback = parent.querySelector('[data-role="boh-access-feedback"]');
  const form = parent.querySelector('.boh-access-form');
  const label = parent.querySelector('label');
  const hint = parent.querySelector('small');
  let receivedPin = '';
  let retryCalls = 0;

  gate.setHandlers({
    async unlock(pin) {
      receivedPin = pin;
    },
    async retry() {
      retryCalls += 1;
      gate.showChecking();
    },
  });
  gate.showLocked();

  assert.equal(label.getAttribute('for'), input.getAttribute('id'));
  assert.equal(input.getAttribute('aria-describedby'), hint.getAttribute('id'));
  assert.equal(label.parentNode, input.parentNode.parentNode);
  assert.equal(toggle.parentNode, input.parentNode);
  assert.notEqual(toggle.parentNode, label);
  assert.equal(input.type, 'password');
  assert.equal(toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(toggle.getAttribute('aria-label'), 'Show PIN');
  await toggle.dispatch('click');
  assert.equal(input.type, 'text');
  assert.equal(toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(toggle.getAttribute('aria-label'), 'Hide PIN');

  input.value = 'current-member-pin';
  await form.dispatch('submit', { preventDefault() {} });
  assert.equal(receivedPin, 'current-member-pin');
  assert.equal(input.value, '');
  assert.equal(input.type, 'password');
  assert.equal(toggle.getAttribute('aria-pressed'), 'false');

  gate.showError({ code: 'secure_service_unreachable' });
  assert.equal(input.disabled, true);
  assert.equal(submit.hidden, true);
  assert.equal(retry.hidden, false);
  assert.equal(feedback.getAttribute('role'), 'alert');
  assert.equal(
    feedback.textContent,
    'The secure Google service required for signup cannot be reached from this network or region. Try a VPN or a different network, then press Retry. Your PIN has not been rejected.'
  );
  await retry.dispatch('click');
  assert.equal(retryCalls, 1);
  assert.equal(input.type, 'password');
  assert.equal(input.value, '');

  gate.showError({ code: 'access_denied' });
  assert.equal(input.disabled, false);
  assert.equal(submit.hidden, false);
  assert.equal(retry.hidden, true);
  assert.equal(feedback.textContent, 'That PIN did not match. Check it and try again.');
  gate.destroy();
});

test('closed registration stays read-only and never initializes protected services', async (t) => {
  const previousTranslations = globalThis.VTS_TRANSLATIONS;
  globalThis.VTS_TRANSLATIONS = {
    ar: {
      bohAccessRegistrationClosedKicker: 'تم إغلاق التسجيل',
      bohAccessRegistrationClosedTitle: 'اكتملت الفرق',
      bohAccessRegistrationClosedDescription:
        'تم إغلاق التسجيل. بدأت مطابقة الفرق الآن، وسيتم إعلان تعيينات الفرق قريبًا.',
      bohAccessRegistrationClosedNotice: 'سيتم إعلان مطابقة الفرق قريبًا.',
    },
  };
  t.after(() => {
    if (previousTranslations === undefined) delete globalThis.VTS_TRANSLATIONS;
    else globalThis.VTS_TRANSLATIONS = previousTranslations;
  });

  const { document, parent, root } = createGateDocument();
  root.inert = false;
  root.dataset.registrationStatus = 'closed';
  const eventTarget = createEventTarget();
  const calls = { firebase: 0, access: 0, domain: 0 };
  let gate;

  const lifecycle = await bootAllStarBohTab({
    root,
    document,
    eventTarget,
    createGate(options) {
      gate = createAllStarBohAccessGate(options);
      return gate;
    },
    firebase: {
      initFirebase() {
        calls.firebase += 1;
        return { configured: true, db: {} };
      },
    },
    createAccessClient() {
      calls.access += 1;
      return {
        async getAccessGrant() {
          return GRANT;
        },
        async unlock() {
          return GRANT;
        },
        destroy() {},
      };
    },
    loadDomain: async () => {
      calls.domain += 1;
      return createDomain();
    },
    loadStylesheet: async () => {},
  });

  const kicker = parent.querySelector('.boh-eyebrow');
  const title = parent.querySelector('h2');
  const description = parent.querySelector('header').children[0].children[2];
  const field = parent.querySelector('.boh-field');
  const actions = parent.querySelector('.boh-form-actions');
  const form = parent.querySelector('.boh-access-form');
  const input = parent.querySelector('[data-role="boh-access-pin"]');
  const progress = parent.querySelector('[data-role="boh-access-progress"]');
  const notice = parent.querySelector('[data-role="boh-access-feedback"]');

  assert.equal(kicker.textContent, 'REGISTRATION CLOSED');
  assert.equal(title.textContent, 'Teams are full');
  assert.equal(
    description.textContent,
    'Registration is closed. Team matching is now underway, and team assignments will be announced soon.'
  );
  assert.equal(notice.textContent, 'Team matching will be announced soon.');
  assert.equal(field.hidden, true);
  assert.equal(actions.hidden, true);
  assert.equal(progress.hidden, true);
  assert.equal(root.hidden, true);
  assert.equal(root.inert, true);
  assert.equal(root.getAttribute('aria-hidden'), 'true');
  assert.equal(root.getAttribute('inert'), '');

  input.value = 'ignored-pin';
  await form.dispatch('submit', { preventDefault() {} });
  await lifecycle.retry();
  lifecycle.lock();
  await eventTarget.listeners.get('vts:language-change')?.({ detail: { lang: 'ar' } });

  assert.deepEqual(calls, { firebase: 0, access: 0, domain: 0 });
  assert.equal(kicker.textContent, 'تم إغلاق التسجيل');
  assert.equal(title.textContent, 'اكتملت الفرق');
  assert.equal(
    description.textContent,
    'تم إغلاق التسجيل. بدأت مطابقة الفرق الآن، وسيتم إعلان تعيينات الفرق قريبًا.'
  );
  assert.equal(notice.textContent, 'سيتم إعلان مطابقة الفرق قريبًا.');
  assert.equal(progress.hidden, true);
  assert.equal(root.hidden, true);
  lifecycle.destroy();
});

test('refuses to mount the member hub under an inherited leadership account', async () => {
  const root = createRoot();
  const gate = createGate();
  const firebase = createFirebase();
  firebase.ensureAnonymousAuth = async () => ({
    uid: 'shared-admin-uid',
    isAnonymous: false,
    email: 'leadership@example.test',
  });
  let domainLoads = 0;

  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase,
    eventTarget: createEventTarget(),
    accessClient: {
      async getAccessGrant() {
        return GRANT;
      },
      destroy() {},
    },
    now: () => NOW_MS,
    loadStylesheet: async () => {},
    loadDomain: async () => {
      domainLoads += 1;
      return createDomain({});
    },
    setTimeout: () => 1,
    clearTimeout: () => {},
  });

  assert.equal(root.hidden, true);
  assert.equal(domainLoads, 0);
  assert.equal(gate.states.at(-1), 'error');
  assert.equal(gate.error?.code, 'member_identity_conflict');
  lifecycle.destroy();
});

test('keeps the form concealed and private domain chunks unloaded without a valid grant', async () => {
  const order = [];
  const root = createRoot();
  const gate = createGate(order);
  const firebase = createFirebase();
  const eventTarget = createEventTarget();
  let domainLoads = 0;
  const accessClient = {
    async getAccessGrant() {
      return null;
    },
    async unlock() {
      throw new Error('not used');
    },
    destroy() {},
  };

  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase,
    accessClient,
    eventTarget,
    now: () => NOW_MS,
    loadStylesheet: async () => order.push('stylesheet'),
    loadDomain: async () => {
      domainLoads += 1;
      return createDomain();
    },
  });

  assert.equal(root.hidden, true);
  assert.equal(root.inert, true);
  assert.equal(root.getAttribute('aria-hidden'), 'true');
  assert.equal(root.getAttribute('inert'), '');
  assert.equal(domainLoads, 0);
  assert.equal(gate.states.at(-1), 'locked');
  assert.ok(order.indexOf('stylesheet') < order.indexOf('gate-handlers'));

  assert.equal(gate.states.includes('hidden'), false);
  lifecycle.destroy();
});

test('mounts the gate and only then removes the static loader before awaiting the stylesheet', async () => {
  const order = [];
  const root = createRoot();
  const gate = createGate();
  let finishStylesheet;
  const stylesheetPending = new Promise((resolve) => {
    finishStylesheet = resolve;
  });
  root.parentNode = {
    querySelector(selector) {
      assert.equal(selector, '.tab-loading');
      return {
        remove() {
          order.push('loader-removed');
        },
      };
    },
  };

  const boot = bootAllStarBohTab({
    root,
    createGate() {
      order.push('gate-created');
      return gate;
    },
    firebase: createFirebase(),
    eventTarget: createEventTarget(),
    accessClient: {
      async getAccessGrant() {
        return null;
      },
      destroy() {},
    },
    loadStylesheet() {
      order.push('stylesheet-started');
      return stylesheetPending;
    },
  });

  await Promise.resolve();
  assert.deepEqual(order, ['gate-created', 'loader-removed', 'stylesheet-started']);
  assert.equal(root.hidden, true);
  finishStylesheet();
  const lifecycle = await boot;
  assert.equal(gate.states.at(-1), 'locked');
  lifecycle.destroy();
});

test('secure Firebase preparation timeout becomes a regional secure-service error', async () => {
  const root = createRoot();
  const gate = createGate();
  const timers = [];
  const boot = bootAllStarBohTab({
    root,
    gate,
    firebase: {
      initFirebase() {
        return { configured: true, db: { name: 'db' } };
      },
      ensureAnonymousAuth() {
        return new Promise(() => {});
      },
    },
    eventTarget: createEventTarget(),
    loadStylesheet: async () => {},
    firebaseTimeoutMs: 5,
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout() {},
  });

  await Promise.resolve();
  await Promise.resolve();
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 5);
  timers[0].callback();

  const lifecycle = await boot;
  assert.equal(root.hidden, true);
  assert.equal(gate.states.at(-1), 'error');
  assert.equal(gate.error?.code, 'secure_service_unreachable');
  lifecycle.destroy();
});

test('Firebase Auth network failures become regional secure-service errors', async () => {
  const root = createRoot();
  const gate = createGate();
  const firebase = createFirebase();
  firebase.ensureAnonymousAuth = async () => {
    throw Object.assign(new Error('Network request failed'), {
      code: 'auth/network-request-failed',
    });
  };

  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase,
    eventTarget: createEventTarget(),
    loadStylesheet: async () => {},
  });

  assert.equal(root.hidden, true);
  assert.equal(gate.error?.code, 'secure_service_unreachable');
  lifecycle.destroy();
});

test('secure Firebase module fetch failures become regional secure-service errors', async () => {
  const root = createRoot();
  const gate = createGate();
  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    eventTarget: createEventTarget(),
    loadFirebase: async () => {
      throw new TypeError('Failed to fetch dynamically imported module');
    },
    loadStylesheet: async () => {},
  });

  assert.equal(root.hidden, true);
  assert.equal(gate.error?.code, 'secure_service_unreachable');
  assert.equal(gate.error?.cause?.message, 'Failed to fetch dynamically imported module');
  lifecycle.destroy();
});

test('exact Safari Load failed module errors become regional secure-service errors', async () => {
  const root = createRoot();
  const gate = createGate();
  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    eventTarget: createEventTarget(),
    loadFirebase: async () => {
      throw new TypeError('Load failed');
    },
    loadStylesheet: async () => {},
  });

  assert.equal(gate.error?.code, 'secure_service_unreachable');
  assert.equal(gate.error?.cause?.message, 'Load failed');
  lifecycle.destroy();
});

test('semantic Firebase loader text containing load failed remains unchanged and generic', async () => {
  const { document, parent, root } = createGateDocument();
  const renderedGate = createAllStarBohAccessGate({ root, document });
  const semanticError = Object.assign(new Error('configuration load failed validation'), {
    code: 'firebase_config_rejected',
  });
  let receivedError = null;
  const gate = {
    setHandlers(handlers) {
      renderedGate.setHandlers(handlers);
    },
    setLocale(locale) {
      renderedGate.setLocale(locale);
    },
    showChecking() {
      renderedGate.showChecking();
    },
    showLocked() {
      renderedGate.showLocked();
    },
    showBusy() {
      renderedGate.showBusy();
    },
    showExpired() {
      renderedGate.showExpired();
    },
    showError(error) {
      receivedError = error;
      renderedGate.showError(error);
    },
    hide() {
      renderedGate.hide();
    },
    destroy() {
      renderedGate.destroy();
    },
  };

  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    document,
    eventTarget: createEventTarget(),
    loadFirebase: async () => {
      throw semanticError;
    },
    loadStylesheet: async () => {},
  });

  const feedback = parent.querySelector('[data-role="boh-access-feedback"]');
  const retry = parent.querySelector('[data-role="boh-access-retry"]');
  assert.equal(receivedError, semanticError);
  assert.equal(receivedError.code, 'firebase_config_rejected');
  assert.equal(receivedError.message, 'configuration load failed validation');
  assert.equal(feedback.textContent, 'Member access could not be confirmed. Please try again.');
  assert.doesNotMatch(feedback.textContent, /secure Google service|VPN|different network/iu);
  assert.equal(retry.hidden, true);
  lifecycle.destroy();
});

test('App Check network failures become regional secure-service errors', async () => {
  const root = createRoot();
  const gate = createGate();
  const firebase = createFirebase();
  firebase.getFirebaseAppCheckToken = async () => {
    throw Object.assign(new Error('App Check fetch failed'), {
      code: 'appCheck/fetch-network-error',
    });
  };
  let domainLoads = 0;

  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase,
    eventTarget: createEventTarget(),
    accessClient: {
      async getAccessGrant() {
        return GRANT;
      },
      destroy() {},
    },
    now: () => NOW_MS,
    loadStylesheet: async () => {},
    loadDomain: async () => {
      domainLoads += 1;
      return createDomain();
    },
  });

  assert.equal(root.hidden, true);
  assert.equal(domainLoads, 0);
  assert.equal(gate.error?.code, 'secure_service_unreachable');
  lifecycle.destroy();
});

test('App Check network failures during grant lookup become regional secure-service errors', async () => {
  const root = createRoot();
  const gate = createGate();
  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase: createFirebase(),
    eventTarget: createEventTarget(),
    accessClient: {
      async getAccessGrant() {
        throw Object.assign(new Error('App Check fetch failed'), {
          code: 'appCheck/fetch-network-error',
        });
      },
      destroy() {},
    },
    loadStylesheet: async () => {},
  });

  assert.equal(root.hidden, true);
  assert.equal(gate.error?.code, 'secure_service_unreachable');
  lifecycle.destroy();
});

test('semantic Firebase Auth and App Check rejection codes are not relabeled', async () => {
  const authRoot = createRoot();
  const authGate = createGate();
  const authFirebase = createFirebase();
  authFirebase.ensureAnonymousAuth = async () => {
    throw Object.assign(new Error('Authentication rejected'), { code: 'invalid_auth' });
  };
  const authLifecycle = await bootAllStarBohTab({
    root: authRoot,
    gate: authGate,
    firebase: authFirebase,
    eventTarget: createEventTarget(),
    loadStylesheet: async () => {},
  });
  assert.equal(authGate.error?.code, 'invalid_auth');
  authLifecycle.destroy();

  const appCheckRoot = createRoot();
  const appCheckGate = createGate();
  const appCheckFirebase = createFirebase();
  appCheckFirebase.getFirebaseAppCheckToken = async () => {
    throw Object.assign(new Error('App Check rejected'), { code: 'invalid_app_check' });
  };
  const appCheckLifecycle = await bootAllStarBohTab({
    root: appCheckRoot,
    gate: appCheckGate,
    firebase: appCheckFirebase,
    eventTarget: createEventTarget(),
    accessClient: {
      async getAccessGrant() {
        return GRANT;
      },
      destroy() {},
    },
    now: () => NOW_MS,
    loadStylesheet: async () => {},
  });
  assert.equal(appCheckGate.error?.code, 'invalid_app_check');
  appCheckLifecycle.destroy();
});

test('wrong PIN errors remain semantic and keep the normal PIN flow', async () => {
  const root = createRoot();
  const gate = createGate();
  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase: createFirebase(),
    eventTarget: createEventTarget(),
    accessClient: {
      async getAccessGrant() {
        return null;
      },
      async unlock() {
        throw Object.assign(new Error('That PIN did not match.'), { code: 'access_denied' });
      },
      destroy() {},
    },
    loadStylesheet: async () => {},
  });

  await gate.unlock('wrong-pin');
  assert.equal(root.hidden, true);
  assert.equal(gate.error?.code, 'access_denied');
  assert.equal(gate.states.at(-1), 'error');
  lifecycle.destroy();
});

test('secure access errors persist through failure and Retry returns to PIN when no grant exists', async () => {
  const root = createRoot();
  const gate = createGate();
  let grantReads = 0;
  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase: createFirebase(),
    eventTarget: createEventTarget(),
    accessClient: {
      async getAccessGrant() {
        grantReads += 1;
        if (grantReads < 3) {
          throw Object.assign(new Error('Secure request failed'), { code: 'network_error' });
        }
        return null;
      },
      destroy() {},
    },
    loadStylesheet: async () => {},
  });

  assert.equal(gate.error?.code, 'secure_service_unreachable');
  await gate.retry();
  assert.equal(gate.error?.code, 'secure_service_unreachable');
  assert.equal(gate.states.at(-1), 'error');
  await gate.retry();
  assert.equal(grantReads, 3);
  assert.equal(gate.states.at(-1), 'locked');
  assert.equal(root.hidden, true);
  lifecycle.destroy();
});

test('Retry mounts a still-valid secure grant without requesting the PIN', async () => {
  const root = createRoot();
  const gate = createGate();
  let grantReads = 0;
  let unlockCalls = 0;
  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase: createFirebase(),
    eventTarget: createEventTarget(),
    accessClient: {
      async getAccessGrant() {
        grantReads += 1;
        if (grantReads === 1) {
          throw Object.assign(new Error('Secure request timed out'), { code: 'request_timeout' });
        }
        return GRANT;
      },
      async unlock() {
        unlockCalls += 1;
        return GRANT;
      },
      destroy() {},
      processOcr() {},
    },
    now: () => NOW_MS,
    loadStylesheet: async () => {},
    loadDomain: async () => createDomain(),
  });

  assert.equal(gate.error?.code, 'secure_service_unreachable');
  await gate.retry();
  assert.equal(grantReads, 2);
  assert.equal(unlockCalls, 0);
  assert.equal(root.hidden, false);
  assert.equal(gate.states.at(-1), 'hidden');
  lifecycle.destroy();
});

test('stylesheet or bootstrap failure leaves the fail-closed template inert', async () => {
  const root = createRoot();
  await assert.rejects(
    bootAllStarBohTab({
      root,
      gate: createGate(),
      loadStylesheet: async () => {
        throw new Error('stylesheet unavailable');
      },
    }),
    /stylesheet unavailable/
  );
  assert.equal(root.hidden, true);
  assert.equal(root.getAttribute('aria-hidden'), 'true');
  assert.equal(root.getAttribute('inert'), '');
});

test('loads and mounts private modules only after server unlock returns a verified grant', async () => {
  const root = createRoot();
  const gate = createGate();
  const firebase = createFirebase();
  const eventTarget = createEventTarget();
  const records = {};
  const domain = createDomain(records);
  let domainLoads = 0;
  let receivedPin = '';
  let ocrRequest = null;
  const accessClient = {
    async getAccessGrant() {
      return null;
    },
    async unlock(pin) {
      receivedPin = pin;
      return GRANT;
    },
    async processOcr(request) {
      ocrRequest = request;
      return { schemaVersion: 1 };
    },
    destroy() {},
  };
  const timers = [];

  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase,
    accessClient,
    eventTarget,
    now: () => NOW_MS,
    loadStylesheet: async () => {},
    loadDomain: async () => {
      domainLoads += 1;
      return domain;
    },
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout() {},
  });
  assert.equal(domainLoads, 0);

  await gate.unlock('current-member-pin');
  assert.equal(receivedPin, 'current-member-pin');
  assert.equal(domainLoads, 1);
  assert.equal(root.hidden, false);
  assert.equal(root.inert, false);
  assert.equal(root.getAttribute('aria-hidden'), null);
  assert.equal(root.getAttribute('inert'), null);
  assert.equal(gate.states.at(-1), 'hidden');
  assert.equal(records.storeOptions.seasonId, GRANT.seasonId);
  assert.equal(records.storeOptions.uid, 'member-uid');
  assert.deepEqual(records.storeOptions.heroNames, ['Hero One', 'Hero Two']);
  assert.deepEqual(records.storeOptions.researchTreeIds, ['tree-one', 'tree-two']);
  assert.equal(records.controllerOptions.store.seasonId, GRANT.seasonId);
  assert.deepEqual(records.controllerOptions.heroes, domain.heroData.allHeroesData);
  assert.deepEqual(records.controllerOptions.researchTrees, domain.researchData.techDatabase);
  assert.equal(records.controllerOptions.researchTreeText, domain.researchI18n.researchTreeText);
  assert.equal(records.loadedResearchLocales.at(-1), 'en');
  assert.equal(typeof records.controllerOptions.ocrService.process, 'function');
  await records.controllerOptions.ocrService.process({ fixed: true });
  assert.deepEqual(ocrRequest, { fixed: true });
  assert.deepEqual(firebase.appCheckCalls, [false]);
  assert.equal(timers.filter(({ delay }) => delay === 12_000).length, 2);
  const expiryTimer = timers.find(({ delay }) => delay > 12_000);
  assert.ok(expiryTimer);

  const gateStateCount = gate.states.length;
  records.controllerOptions.onError({ code: 'permission-denied' }, { action: 'save-submission' });
  assert.equal(root.hidden, false, 'a rejected write must keep the member hub visible');
  assert.equal(gate.states.length, gateStateCount, 'a rejected write is not proof of grant expiry');
  assert.equal(domain.testController.destroyed, false);

  await eventTarget.listeners.get('vts:language-change')?.({ detail: { lang: 'ar' } });
  assert.equal(records.loadedResearchLocales.at(-1), 'ar');
  assert.deepEqual(domain.testController.setLanguageCalls.at(-1), [
    'ar',
    domain.i18n.allStarBohText,
  ]);

  expiryTimer.callback();
  assert.equal(root.hidden, true);
  assert.equal(gate.states.at(-1), 'expired');
  assert.equal(domain.testController.destroyed, true);
  lifecycle.destroy();
});

test('a still-valid persisted grant mounts directly without requesting a PIN', async () => {
  const root = createRoot();
  delete root.inert;
  const gate = createGate();
  const firebase = createFirebase();
  const records = {};
  let unlockCalls = 0;
  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase,
    eventTarget: createEventTarget(),
    accessClient: {
      async getAccessGrant() {
        return GRANT;
      },
      async unlock() {
        unlockCalls += 1;
        return GRANT;
      },
      destroy() {},
      processOcr() {},
    },
    now: () => NOW_MS,
    loadStylesheet: async () => {},
    loadDomain: async () => createDomain(records),
    setTimeout: () => 1,
    clearTimeout: () => {},
  });

  assert.equal(root.hidden, false);
  assert.equal(root.getAttribute('inert'), null);
  assert.equal('inert' in root, false);
  assert.equal(unlockCalls, 0);
  assert.equal(gate.states.at(-1), 'hidden');
  lifecycle.destroy();
});

test('manual Lock hub conceals private content and requires PIN without replacing user identity', async () => {
  const root = createRoot();
  const gate = createGate();
  const records = {};
  const values = new Map();
  const lockStorage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
  let grantReads = 0;
  let unlockCalls = 0;
  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase: createFirebase(),
    eventTarget: createEventTarget(),
    lockStorage,
    accessClient: {
      async getAccessGrant() {
        grantReads += 1;
        return GRANT;
      },
      async unlock() {
        unlockCalls += 1;
        return GRANT;
      },
      destroy() {},
      processOcr() {},
    },
    now: () => NOW_MS,
    loadStylesheet: async () => {},
    loadDomain: async () => createDomain(records),
    setTimeout: () => 1,
    clearTimeout: () => {},
  });

  assert.equal(root.hidden, false);
  lifecycle.lock();
  assert.equal(root.hidden, true);
  assert.equal(root.inert, true);
  assert.equal(values.get('vts_all_star_boh_manual_lock'), '1');
  assert.equal(gate.states.at(-1), 'locked');

  await lifecycle.retry();
  assert.equal(grantReads, 1, 'manual lock must not silently reuse the server grant');
  assert.equal(root.hidden, true);

  await gate.unlock('current-member-pin');
  assert.equal(unlockCalls, 1);
  assert.equal(root.hidden, false);
  assert.equal(values.has('vts_all_star_boh_manual_lock'), false);
  assert.equal(records.storeOptions.uid, 'member-uid');
  lifecycle.destroy();
});

test('destroy invalidates an in-flight private mount before it can reveal the hub', async () => {
  const root = createRoot();
  const gate = createGate();
  const records = {};
  let resolveDomain;
  let domainLoadStarted;
  const domainStarted = new Promise((resolve) => {
    domainLoadStarted = resolve;
  });
  const pendingDomain = new Promise((resolve) => {
    resolveDomain = resolve;
  });
  const lifecycle = await bootAllStarBohTab({
    root,
    gate,
    firebase: createFirebase(),
    eventTarget: createEventTarget(),
    accessClient: {
      async getAccessGrant() {
        return null;
      },
      async unlock() {
        return GRANT;
      },
      destroy() {},
      processOcr() {},
    },
    now: () => NOW_MS,
    loadStylesheet: async () => {},
    loadDomain: async () => {
      domainLoadStarted();
      return pendingDomain;
    },
  });

  const unlock = gate.unlock('current-member-pin');
  await domainStarted;
  lifecycle.destroy();
  resolveDomain(createDomain(records));
  await unlock;

  assert.equal(records.controllerOptions, undefined);
  assert.equal(records.storeOptions, undefined);
  assert.equal(root.hidden, true);
  assert.equal(root.inert, true);
  assert.equal(root.getAttribute('aria-hidden'), 'true');
  assert.equal(root.getAttribute('inert'), '');
  assert.equal(gate.states.includes('hidden'), false);
  assert.equal(gate.states.at(-1), 'destroyed');
});

test('bootstrap keeps CSS lazy, mounts the gate first, and statically gates domain imports', async () => {
  const [index, source, appSource, cssSource] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../js/all-star-boh-bootstrap.js', import.meta.url), 'utf8'),
    readFile(new URL('../../js/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../css/all-star-boh.css', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(index, /<link[^>]+all-star-boh\.css/iu);
  assert.match(source, /import\('\.\.\/css\/all-star-boh\.css'\)/u);
  assert.match(source, /import\('\.\/heroes-data\.js'\)/u);
  assert.match(source, /import\('\.\/tech-db\.js'\)/u);
  assert.match(source, /import\('\.\/i18n\/research\/index\.js'\)/u);
  assert.match(index, /https:\/\/us-central1-abocombo\.cloudfunctions\.net/u);
  assert.match(index, /https:\/\/delicate-term-725f\.aboroe1097\.workers\.dev/u);
  assert.doesNotMatch(source, /from ['"]\.\/all-star-boh(?:-model|-ocr|-store)?\.js['"]/u);
  const gateIndex = source.indexOf('options.createGate || createAllStarBohAccessGate');
  const loaderRemovalIndex = source.indexOf('loadingPlaceholder?.remove?.()');
  const stylesheetIndex = source.indexOf(
    'await (options.loadStylesheet || loadAllStarBohStylesheet)()'
  );
  assert.ok(gateIndex < loaderRemovalIndex);
  assert.ok(loaderRemovalIndex < stylesheetIndex);
  assert.match(source, /querySelector\?\.\('\.tab-loading'\)/u);
  assert.match(source, /loadingPlaceholder\?\.remove\?\.\(\)/u);
  assert.match(source, /input\.type = 'password'/u);
  assert.match(source, /togglePin\.setAttribute\('aria-pressed', 'false'\)/u);
  assert.match(source, /togglePin\.setAttribute\('aria-label'/u);
  assert.match(source, /input\.value = '';\s*input\.type = 'password'/u);
  assert.match(source, /setHandlers\(handlers = \{\}\)[\s\S]*retryHandler/u);
  assert.match(source, /state = error\?\.code === 'secure_service_unreachable' \? 'secure-error'/u);
  assert.match(source, /progress\.dataset\.role = 'boh-access-progress'/u);
  assert.match(source, /loader\.dataset\.vtsLoaderContext = 'admin'/u);
  assert.match(source, /progress\.hidden = !unlocking/u);
  assert.match(cssSource, /\.boh-pin-toggle\s*\{/u);
  assert.match(appSource, /section\.insertAdjacentHTML\('beforeend', html\)/u);
  assert.match(appSource, /protectedRoot\.setAttribute\('inert', ''\)/u);
  assert.match(
    appSource,
    /isDynamicImportLoadFailure\(error\) && recoverFromStaleAssetGraph\(error\)/u
  );
  assert.doesNotMatch(source, /boh-access-cancel|Not now|showCanceled/u);
  assert.match(source, /onLockHub: lockHub/u);
});

test('regional copy and PIN controls are present in every main translation catalog', async () => {
  const translations = {
    en: ['Retry', 'Show PIN', 'Hide PIN'],
    zh: ['重试', '显示 PIN', '隐藏 PIN'],
    ar: ['إعادة المحاولة', 'إظهار رمز PIN', 'إخفاء رمز PIN'],
    de: ['Erneut versuchen', 'PIN anzeigen', 'PIN ausblenden'],
    es: ['Reintentar', 'Mostrar PIN', 'Ocultar PIN'],
    fr: ['Réessayer', 'Afficher le PIN', 'Masquer le PIN'],
    hr: ['Pokušaj ponovno', 'Prikaži PIN', 'Sakrij PIN'],
    id: ['Coba lagi', 'Tampilkan PIN', 'Sembunyikan PIN'],
    kr: ['다시 시도', 'PIN 표시', 'PIN 숨기기'],
    pt: ['Tentar novamente', 'Mostrar PIN', 'Ocultar PIN'],
    ru: ['Повторить', 'Показать PIN', 'Скрыть PIN'],
    tr: ['Tekrar dene', 'PIN’i göster', 'PIN’i gizle'],
  };
  const sources = Object.fromEntries(
    await Promise.all(
      Object.keys(translations).map(async (locale) => [
        locale,
        await readFile(new URL(`../../js/i18n/${locale}.js`, import.meta.url), 'utf8'),
      ])
    )
  );

  for (const [locale, [retry, showPin, hidePin]] of Object.entries(translations)) {
    assert.match(sources[locale], new RegExp(`bohAccessRetry: '${retry}'`, 'u'));
    assert.match(sources[locale], new RegExp(`bohAccessShowPin: '${showPin}'`, 'u'));
    assert.match(sources[locale], new RegExp(`bohAccessHidePin: '${hidePin}'`, 'u'));
    assert.match(sources[locale], /bohAccessRegistrationClosedKicker: '/u);
    assert.match(sources[locale], /bohAccessRegistrationClosedTitle: '/u);
    assert.match(sources[locale], /bohAccessRegistrationClosedDescription:/u);
    assert.match(sources[locale], /bohAccessRegistrationClosedNotice: '/u);
  }
  assert.match(
    sources.en,
    /The secure Google service required for signup cannot be reached from this network or region\. Try a VPN or a different network, then press Retry\. Your PIN has not been rejected\./u
  );
  assert.match(
    sources.zh,
    /当前网络或地区无法连接报名所需的 Google 安全服务。请尝试使用 VPN 或切换网络，然后点击“重试”。这并不表示您的 PIN 错误。/u
  );
});
