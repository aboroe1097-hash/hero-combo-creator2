import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { bootAllStarBohTab } from '../../js/all-star-boh-bootstrap.js';

const NOW_MS = 1_750_000_000_000;
const GRANT = Object.freeze({
  seasonId: 'season-2026',
  expiresAt: Math.floor(NOW_MS / 1000) + 3600,
});

function createRoot() {
  const attributes = new Map();
  return {
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
  };
  return gate;
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

test('secure Firebase preparation times out fail-closed and leaves the PIN gate retryable', async () => {
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
  assert.equal(gate.error?.code, 'request_timeout');
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

test('bootstrap keeps CSS lazy, permits the two secure endpoints, and statically gates domain imports', async () => {
  const [index, source] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../js/all-star-boh-bootstrap.js', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(index, /<link[^>]+all-star-boh\.css/iu);
  assert.match(source, /import\('\.\.\/css\/all-star-boh\.css'\)/u);
  assert.match(source, /import\('\.\/heroes-data\.js'\)/u);
  assert.match(source, /import\('\.\/tech-db\.js'\)/u);
  assert.match(source, /import\('\.\/i18n\/research\/index\.js'\)/u);
  assert.match(index, /https:\/\/us-central1-abocombo\.cloudfunctions\.net/u);
  assert.match(index, /https:\/\/delicate-term-725f\.aboroe1097\.workers\.dev/u);
  assert.doesNotMatch(source, /from ['"]\.\/all-star-boh(?:-model|-ocr|-store)?\.js['"]/u);
  assert.ok(
    source.indexOf('await (options.loadStylesheet || loadAllStarBohStylesheet)()') <
      source.indexOf('options.createGate || createAllStarBohAccessGate')
  );
  assert.match(source, /input\.type = 'password'/u);
  assert.match(source, /input\.value = '';\s*await unlockHandler/u);
  assert.match(source, /progress\.dataset\.role = 'boh-access-progress'/u);
  assert.match(source, /loader\.dataset\.vtsLoaderContext = 'admin'/u);
  assert.match(source, /progress\.hidden = !unlocking/u);
  assert.doesNotMatch(source, /boh-access-cancel|Not now|showCanceled/u);
  assert.match(source, /onLockHub: lockHub/u);
});
