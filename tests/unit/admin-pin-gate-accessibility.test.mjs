import assert from 'node:assert/strict';
import test from 'node:test';

class FakeElement {
  constructor(document, name) {
    this.document = document;
    this.name = name;
    this.attributes = new Map();
    this.listeners = new Map();
    this.disabled = false;
    this.hidden = false;
    this.inert = false;
    this.isConnected = false;
    this.value = '';
    this.focusCount = 0;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  emit(type, event = {}) {
    return Promise.all((this.listeners.get(type) || []).map((listener) => listener(event)));
  }

  focus(options) {
    this.focusCount += 1;
    this.focusOptions = options;
    this.document.activeElement = this;
  }
}

class FakeOverlay extends FakeElement {
  constructor(document) {
    super(document, 'overlay');
    this.nodes = new Map();
    this._innerHTML = '';
  }

  set innerHTML(value) {
    this._innerHTML = value;
    const dialog = new FakeElement(this.document, 'dialog');
    const form = new FakeElement(this.document, 'form');
    const error = new FakeElement(this.document, 'error');
    const cancel = new FakeElement(this.document, 'cancel');
    error.hidden = true;
    for (const node of [dialog, form, error, cancel]) node.overlay = this;
    this.nodes.set('.pin-gate-dialog', dialog);
    this.nodes.set('.pin-gate-form', form);
    this.nodes.set('.pin-gate-error', error);
    this.nodes.set('[data-pin-cancel]', cancel);

    if (value.includes('class="pin-gate-input"')) {
      const input = new FakeElement(this.document, 'input');
      const submit = new FakeElement(this.document, 'submit');
      input.overlay = this;
      submit.overlay = this;
      this.nodes.set('.pin-gate-input', input);
      this.nodes.set('.pin-gate-btn-primary', submit);
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  querySelector(selector) {
    return this.nodes.get(selector) || null;
  }

  querySelectorAll() {
    return [
      this.nodes.get('.pin-gate-input'),
      this.nodes.get('[data-pin-cancel]'),
      this.nodes.get('.pin-gate-btn-primary'),
    ].filter(Boolean);
  }

  contains(element) {
    return element === this || element?.overlay === this;
  }

  setConnected(isConnected) {
    this.isConnected = isConnected;
    for (const node of this.nodes.values()) node.isConnected = isConnected;
  }

  remove() {
    this.document.body.removeChild(this);
  }
}

class FakeBody {
  constructor(document) {
    this.document = document;
    this.children = [];
  }

  addInitial(element) {
    element.isConnected = true;
    this.children.push(element);
  }

  appendChild(element) {
    this.children.push(element);
    element.setConnected(true);
    return element;
  }

  removeChild(element) {
    this.children = this.children.filter((child) => child !== element);
    element.setConnected(false);
  }
}

class FakeDocument {
  constructor() {
    this.documentElement = { lang: 'en' };
    this.listeners = new Map();
    this.body = new FakeBody(this);
    this.activeElement = null;
  }

  createElement() {
    return new FakeOverlay(this);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.set(
      type,
      (this.listeners.get(type) || []).filter((candidate) => candidate !== listener)
    );
  }

  dispatchKey(key, shiftKey = false) {
    const event = {
      key,
      shiftKey,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    for (const listener of this.listeners.get('keydown') || []) listener(event);
    return event;
  }
}

function installBrowserHarness(auth = {}, storageBehavior = {}) {
  const document = new FakeDocument();
  const app = new FakeElement(document, 'app');
  const alreadyInert = new FakeElement(document, 'already-inert');
  alreadyInert.inert = true;
  document.body.addInitial(app);
  document.body.addInitial(alreadyInert);
  document.activeElement = app;

  const values = new Map();
  const storageCalls = { get: 0, set: 0 };
  const localStorage = {
    getItem(key) {
      storageCalls.get += 1;
      if (storageBehavior.throwOnGet) throw new Error('Storage access denied');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      storageCalls.set += 1;
      if (storageBehavior.throwOnSet) throw new Error('Storage access denied');
      values.set(key, String(value));
    },
  };
  const previous = new Map(
    ['window', 'document', 'localStorage', 'requestAnimationFrame'].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ])
  );

  globalThis.window = { VTS_ADMIN_AUTH: auth };
  globalThis.document = document;
  globalThis.localStorage = localStorage;
  globalThis.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };

  return {
    app,
    alreadyInert,
    document,
    localStorage,
    storageCalls,
    overlay() {
      return document.body.children.find((element) => element.name === 'overlay');
    },
    restore() {
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    },
  };
}

let moduleSequence = 0;
async function loadGate() {
  moduleSequence += 1;
  return import(
    new URL(`../../js/admin-pin-gate.js?accessibility=${moduleSequence}`, import.meta.url)
  );
}

test('PIN dialog traps focus, preserves pending prompts, and restores inert and focus state', async (t) => {
  const harness = installBrowserHarness({ adminPin: '2468' });
  t.after(() => harness.restore());
  const gate = await loadGate();

  const result = gate.requireSensitiveAdminPin();
  assert.equal(gate.requireSensitiveAdminPin(), result, 'concurrent callers share one prompt');

  const overlay = harness.overlay();
  const input = overlay.querySelector('.pin-gate-input');
  const submit = overlay.querySelector('.pin-gate-btn-primary');
  assert.equal(harness.app.inert, true);
  assert.equal(harness.alreadyInert.inert, true);
  assert.equal(harness.document.activeElement, input, 'PIN receives initial focus');

  submit.focus();
  const forwardWrap = harness.document.dispatchKey('Tab');
  assert.equal(forwardWrap.defaultPrevented, true);
  assert.equal(harness.document.activeElement, input);

  input.focus();
  const backwardWrap = harness.document.dispatchKey('Tab', true);
  assert.equal(backwardWrap.defaultPrevented, true);
  assert.equal(harness.document.activeElement, submit);

  harness.app.focus();
  const outsideRecovery = harness.document.dispatchKey('Tab');
  assert.equal(outsideRecovery.defaultPrevented, true);
  assert.equal(harness.document.activeElement, input);

  const escape = harness.document.dispatchKey('Escape');
  assert.equal(escape.defaultPrevented, true);
  assert.equal(await result, false);
  assert.equal(harness.app.inert, false);
  assert.equal(harness.alreadyInert.inert, true, 'pre-existing inert state is retained');
  assert.equal(harness.document.activeElement, harness.app, 'focus returns to the opener');
  assert.equal(harness.overlay(), undefined);
});

test('PIN attempts are cleared before verification and successful unlock keeps no raw PIN', async (t) => {
  const harness = installBrowserHarness({ adminPin: '2468' });
  t.after(() => harness.restore());
  const gate = await loadGate();
  const result = gate.requireSensitiveAdminPin();
  const overlay = harness.overlay();
  const form = overlay.querySelector('.pin-gate-form');
  const input = overlay.querySelector('.pin-gate-input');
  const error = overlay.querySelector('.pin-gate-error');
  const submitEvent = () => ({ preventDefault() {} });

  input.value = 'wrong-secret';
  const rejected = form.emit('submit', submitEvent());
  assert.equal(input.value, '', 'raw attempt is removed from the DOM before awaiting verification');
  await rejected;
  assert.equal(error.hidden, false);
  assert.equal(overlay.innerHTML.includes('wrong-secret'), false);

  input.value = '2468';
  const accepted = form.emit('submit', submitEvent());
  assert.equal(input.value, '');
  await accepted;
  assert.equal(await result, true);
  assert.equal(harness.localStorage.getItem('vts_sensitive_admin_pin_ok'), '1');
  assert.equal(harness.localStorage.getItem('vts_eden_votes_pin_ok'), '1');
  assert.equal(overlay.innerHTML.includes('2468'), false);
  assert.equal(harness.document.activeElement, harness.app);
});

test('denied storage fails closed until verification and then unlocks the current document', async (t) => {
  const harness = installBrowserHarness(
    { adminPin: '2468' },
    { throwOnGet: true, throwOnSet: true }
  );
  t.after(() => harness.restore());
  const gate = await loadGate();

  assert.equal(gate.sensitiveAdminUnlocked(), false, 'a failed storage read is not an unlock');
  const result = gate.requireSensitiveAdminPin();
  const overlay = harness.overlay();
  assert.ok(overlay, 'dialog still opens when language and unlock storage reads fail');
  assert.match(overlay.innerHTML, /Enter admin PIN/);

  const form = overlay.querySelector('.pin-gate-form');
  const input = overlay.querySelector('.pin-gate-input');
  input.value = '2468';
  const accepted = form.emit('submit', { preventDefault() {} });
  assert.equal(input.value, '', 'the raw PIN is cleared before persistence is attempted');
  await accepted;

  assert.equal(await result, true);
  assert.equal(gate.sensitiveAdminUnlocked(), true, 'verified state survives in this document');
  assert.equal(await gate.requireSensitiveAdminPin(), true, 'no second dialog is required');
  assert.equal(harness.overlay(), undefined);
  assert.equal(overlay.innerHTML.includes('2468'), false);
  assert.ok(harness.storageCalls.get > 0);
  assert.equal(harness.storageCalls.set, 2, 'both compatibility markers are attempted safely');
});

test('unconfigured copy is overridable, IDs stay unique, and cancel/backdrop still close', async (t) => {
  const harness = installBrowserHarness();
  t.after(() => harness.restore());
  const gate = await loadGate();
  const options = {
    unconfiguredTitle: 'Beta Testers Only',
    unconfiguredPrompt: 'The beta tester PIN is not configured for this deployment.',
  };

  const cancelled = gate.requireSensitiveAdminPin(options);
  let overlay = harness.overlay();
  assert.match(overlay.innerHTML, /Beta Testers Only/);
  assert.match(overlay.innerHTML, /The beta tester PIN is not configured for this deployment\./);
  assert.equal(overlay.querySelector('.pin-gate-input'), null);
  assert.equal(harness.document.activeElement, overlay.querySelector('[data-pin-cancel]'));
  const firstTitleId = overlay.innerHTML.match(/aria-labelledby="([^"]+)"/)?.[1];
  assert.ok(firstTitleId);
  await overlay.querySelector('[data-pin-cancel]').emit('click');
  assert.equal(await cancelled, false);

  const backdropClosed = gate.requireSensitiveAdminPin(options);
  overlay = harness.overlay();
  const secondTitleId = overlay.innerHTML.match(/aria-labelledby="([^"]+)"/)?.[1];
  assert.ok(secondTitleId);
  assert.notEqual(secondTitleId, firstTitleId);
  await overlay.emit('click', { target: overlay });
  assert.equal(await backdropClosed, false);

  const defaults = gate.requireSensitiveAdminPin();
  overlay = harness.overlay();
  assert.match(overlay.innerHTML, /Owner PIN not configured/);
  assert.match(overlay.innerHTML, /Set VTS_EDEN_VOTES_PIN or VTS_EDEN_VOTES_PIN_HASH/);
  harness.document.dispatchKey('Escape');
  assert.equal(await defaults, false);
});
