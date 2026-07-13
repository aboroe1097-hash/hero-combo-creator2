import assert from 'node:assert/strict';
import test from 'node:test';

class FakeClassList {
  constructor(...classes) {
    this.values = new Set(classes);
  }

  add(...classes) {
    classes.forEach((name) => this.values.add(name));
  }

  remove(...classes) {
    classes.forEach((name) => this.values.delete(name));
  }

  contains(name) {
    return this.values.has(name);
  }

  toggle(name, force) {
    const enabled = force ?? !this.contains(name);
    if (enabled) this.add(name);
    else this.remove(name);
    return enabled;
  }
}

class FakeElement {
  constructor(id, classes = []) {
    this.id = id;
    this.attributes = new Map();
    this.classList = new FakeClassList(...classes);
    this.dataset = {};
    this.disabled = false;
    this.innerHTML = '';
    this.listeners = new Map();
    this.parentElement = null;
    this.textContent = '';
    this.value = '';
    this._focusable = null;
    this._focusables = [];
    this.offsetParent = {};
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) {
      listener({ target: this, ...event });
    }
  }

  focus() {
    globalThis.document.activeElement = this;
  }

  querySelector(selector) {
    if (selector === '[data-dataset]') {
      const id = this.innerHTML.match(/data-dataset="([^"]+)"/)?.[1];
      if (!id) return null;
      const element = new FakeElement(`choice-${id}`);
      element.dataset.dataset = id;
      return element;
    }
    if (
      selector ===
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) {
      return this._focusable || null;
    }
    return null;
  }

  querySelectorAll(selector) {
    if (
      selector ===
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) {
      return this._focusables || [];
    }
    return [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

function createEnvironment() {
  const elements = {
    modal: new FakeElement('edenSeasonModal', ['eden-season-modal', 'hidden']),
    choices: new FakeElement('edenSeasonChoices'),
    select: new FakeElement('edenDatasetSelect'),
    badge: new FakeElement('edenDatasetBadge', ['hidden']),
    status: new FakeElement('edenSeasonStatus'),
    retry: new FakeElement('edenSeasonRetry', ['hidden']),
    close: new FakeElement('edenSeasonClose'),
    change: new FakeElement('edenChangeSeasonBtn'),
  };
  const byId = new Map(Object.values(elements).map((element) => [element.id, element]));
  const body = new FakeElement('body');
  body.appendChild = (element) => {
    element.parentElement = body;
  };

  globalThis.document = {
    activeElement: null,
    body,
    getElementById: (id) => byId.get(id) || null,
  };
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
  };
  const windowListeners = new Map();
  globalThis.window = {
    addEventListener(type, listener) {
      const listeners = windowListeners.get(type) || [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    },
    dispatchEvent(event) {
      for (const listener of windowListeners.get(event.type) || []) listener(event);
    },
  };

  return elements;
}

function createDataApi({ catalog = [], storedId = '', ensureLoaded } = {}) {
  let datasets = catalog;
  let selected = storedId;
  const applied = [];
  const defaultId = 'season5';

  return {
    applied,
    setCatalog(nextCatalog) {
      datasets = nextCatalog;
    },
    ensureLoaded: ensureLoaded || (async () => ({ catalog: datasets })),
    getCatalog: () => datasets,
    applyDataset(id) {
      if (!datasets.some((entry) => entry.id === id)) return false;
      selected = id;
      applied.push(id);
      return true;
    },
    getDefaultId: () => defaultId,
    getDatasetId: () => selected || defaultId,
    hasChoice: () => Boolean(selected && datasets.some((entry) => entry.id === selected)),
  };
}

const catalog = [
  {
    id: 'season5',
    labelKey: 'edenDatasetSeason5',
    descKey: 'edenDatasetSeason5Desc',
    structureCount: 622,
  },
  {
    id: 'season3',
    labelKey: 'edenDatasetSeason3',
    descKey: 'edenDatasetSeason3Desc',
    structureCount: 522,
  },
];

const { initEdenSeasonPicker } = await import('../../js/eden-map-season.js');

test('picker refreshes its choices when the async catalog arrives', async () => {
  const elements = createEnvironment();
  let resolveLoad;
  const load = new Promise((resolve) => {
    resolveLoad = resolve;
  });
  const dataApi = createDataApi({
    ensureLoaded: () => load,
  });
  const applied = [];
  const picker = initEdenSeasonPicker({ onDatasetApplied: (id) => applied.push(id) }, dataApi);

  assert.equal(elements.modal.classList.contains('hidden'), false);
  assert.equal(elements.modal.getAttribute('aria-hidden'), 'false');
  assert.equal(elements.choices.getAttribute('aria-busy'), 'true');
  assert.equal(elements.select.disabled, true);
  assert.equal(elements.status.dataset.state, 'loading');

  dataApi.setCatalog(catalog);
  resolveLoad({ catalog });
  assert.equal(await picker.ready, true);

  assert.equal(elements.status.dataset.state, 'ready');
  assert.match(elements.choices.innerHTML, /data-dataset="season5"/);
  assert.match(elements.choices.innerHTML, /data-dataset="season3"/);
  assert.equal(elements.select.disabled, false);
  assert.equal(elements.modal.classList.contains('hidden'), false);

  elements.choices.emit('click', {
    target: {
      closest: () => ({ dataset: { dataset: 'season5' } }),
    },
  });

  assert.deepEqual(dataApi.applied, ['season5']);
  assert.deepEqual(applied, ['season5']);
  assert.equal(elements.modal.classList.contains('hidden'), true);
  assert.equal(elements.modal.getAttribute('aria-hidden'), 'true');
  assert.equal(elements.badge.textContent, 'Season 5 — Wonder X1');
});

test('picker exposes error, close, and successful in-place retry states', async () => {
  const elements = createEnvironment();
  let attempts = 0;
  const dataApi = createDataApi();
  dataApi.ensureLoaded = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('temporary payload failure');
    dataApi.setCatalog(catalog);
    return { catalog };
  };
  const picker = initEdenSeasonPicker({}, dataApi);

  assert.equal(await picker.ready, false);
  assert.equal(elements.status.dataset.state, 'error');
  assert.equal(elements.retry.classList.contains('hidden'), false);
  assert.equal(elements.close.classList.contains('hidden'), false);

  elements.close.emit('click');
  assert.equal(elements.modal.classList.contains('hidden'), true);

  assert.equal(await picker.refresh({ open: true, applySaved: true }), true);
  assert.equal(attempts, 2);
  assert.equal(elements.status.dataset.state, 'ready');
  assert.match(elements.choices.innerHTML, /data-dataset="season5"/);
  assert.equal(elements.retry.classList.contains('hidden'), true);
  assert.equal(elements.modal.classList.contains('hidden'), false);
});

test('picker reapplies and closes with a persisted valid dataset', async () => {
  const elements = createEnvironment();
  const dataApi = createDataApi({ catalog, storedId: 'season3' });
  const applied = [];
  const picker = initEdenSeasonPicker({ onDatasetApplied: (id) => applied.push(id) }, dataApi);

  assert.equal(await picker.ready, true);
  assert.deepEqual(dataApi.applied, ['season3']);
  assert.deepEqual(applied, ['season3']);
  assert.equal(elements.select.value, 'season3');
  assert.equal(elements.modal.classList.contains('hidden'), true);
});

test('dataset loader clears a failed request so the next attempt can succeed', async () => {
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) return { ok: false, status: 503 };
    return {
      ok: true,
      json: async () => ({ builtAt: 'test', catalog, sectors: {}, overlays: {} }),
    };
  };
  const { loadEdenDatasetStore } = await import('../../js/eden-datasets-loader.js');

  await assert.rejects(loadEdenDatasetStore(), /HTTP 503/);
  const store = await loadEdenDatasetStore();

  assert.equal(attempts, 2);
  assert.deepEqual(store.catalog, catalog);
});

test('focus trap wraps Tab at last element to first, and Shift+Tab at first to last', async () => {
  const elements = createEnvironment();
  const dataApi = createDataApi({ catalog });
  const picker = initEdenSeasonPicker({}, dataApi);

  await picker.ready;

  const firstBtn = new FakeElement('first-btn');
  const lastBtn = new FakeElement('last-btn');
  elements.modal._focusables = [firstBtn, lastBtn];

  let focused = null;
  firstBtn.focus = () => {
    focused = firstBtn;
    globalThis.document.activeElement = firstBtn;
  };
  lastBtn.focus = () => {
    focused = lastBtn;
    globalThis.document.activeElement = lastBtn;
  };
  elements.modal.hidden = false;

  globalThis.document.activeElement = lastBtn;
  elements.modal.emit('keydown', { key: 'Tab', shiftKey: false, preventDefault: () => {} });
  assert.equal(focused, firstBtn);

  globalThis.document.activeElement = firstBtn;
  elements.modal.emit('keydown', { key: 'Tab', shiftKey: true, preventDefault: () => {} });
  assert.equal(focused, lastBtn);
});

test('focus returns to invoking element when modal closes', async () => {
  const elements = createEnvironment();
  const dataApi = createDataApi({ catalog });
  const trigger = new FakeElement('edenChangeSeasonBtn');
  elements.change = trigger;
  const byId = new Map(Object.values(elements).map((e) => [e.id, e]));
  byId.set('edenChangeSeasonBtn', trigger);
  globalThis.document.getElementById = (id) => byId.get(id) || null;

  trigger.focus();
  const picker = initEdenSeasonPicker({}, dataApi);
  await picker.ready;

  assert.equal(elements.modal.classList.contains('hidden'), false);

  picker.closePicker();

  assert.equal(elements.modal.classList.contains('hidden'), true);
  assert.equal(globalThis.document.activeElement, trigger);
});

test('loader succeeds with plain JSON payload (no decompression needed)', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ builtAt: 'test', catalog, sectors: {}, overlays: {} }),
  });

  const { loadEdenDatasetStore } = await import('../../js/eden-datasets-loader.js');
  const store = await loadEdenDatasetStore();
  assert.deepEqual(store.catalog, catalog);
});
