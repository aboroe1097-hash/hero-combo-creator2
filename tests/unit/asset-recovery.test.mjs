import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync('js/theme-prepaint.js', 'utf8');

function createHarness(options = {}) {
  const windowListeners = new Map();
  const documentListeners = new Map();
  const sessionValues = options.sessionValues || new Map();
  const replacements = [];
  const appended = [];
  const timers = [];

  function element(tagName) {
    const listeners = new Map();
    return {
      tagName: tagName.toUpperCase(),
      children: [],
      style: {},
      attributes: new Map(),
      setAttribute(name, value) {
        this.attributes.set(name, String(value));
      },
      getAttribute(name) {
        return this.attributes.get(name) || null;
      },
      addEventListener(name, callback) {
        listeners.set(name, callback);
      },
      append(...children) {
        this.children.push(...children);
      },
      click() {
        listeners.get('click')?.({ currentTarget: this });
      },
    };
  }

  const document = {
    currentScript: { src: 'https://roc-vts.com/js/theme-prepaint.js?v=build-1' },
    readyState: 'complete',
    body: {
      appendChild(node) {
        appended.push(node);
      },
    },
    documentElement: {
      setAttribute() {},
    },
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    createElement: element,
    addEventListener(name, callback) {
      documentListeners.set(name, callback);
    },
  };
  const location = {
    href: 'https://roc-vts.com/index.html',
    origin: 'https://roc-vts.com',
    pathname: '/index.html',
    replace(url) {
      replacements.push(url);
    },
    reload() {
      replacements.push('reload');
    },
  };
  const window = {
    location,
    addEventListener(name, callback) {
      windowListeners.set(name, callback);
    },
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
  };
  const context = {
    window,
    document,
    navigator: { onLine: options.online !== false },
    localStorage: { getItem: () => null },
    sessionStorage: {
      getItem: (key) => sessionValues.get(key) || null,
      setItem: (key, value) => sessionValues.set(key, String(value)),
    },
    URL,
    console: { warn() {} },
  };
  vm.runInNewContext(source, context, { filename: 'theme-prepaint.js' });

  return {
    window,
    windowListeners,
    sessionValues,
    replacements,
    appended,
    timers,
    dispatchAssetError(url = 'https://roc-vts.com/assets/index-ABCDEF12.js') {
      windowListeners.get('error')?.({ target: { tagName: 'SCRIPT', src: url, href: '' } });
    },
  };
}

test('online boot-time hashed asset failures trigger one cache-busted reload per build', () => {
  const harness = createHarness();

  harness.dispatchAssetError();
  harness.dispatchAssetError();

  assert.equal(harness.replacements.length, 1);
  assert.match(harness.replacements[0], /asset-reload=build-1-/);
  assert.equal(harness.sessionValues.size, 1);
  assert.equal(harness.appended.length, 1, 'a second failure offers refresh instead of looping');
});

test('offline hashed asset failures do not reload or prompt', () => {
  const harness = createHarness({ online: false });

  harness.dispatchAssetError();

  assert.deepEqual(harness.replacements, []);
  assert.equal(harness.appended.length, 0);
});

test('post-boot hashed asset failures show an accessible manual Refresh prompt', () => {
  const harness = createHarness();
  harness.window.VTS_ASSET_RECOVERY.markBootComplete();

  harness.dispatchAssetError('https://roc-vts.com/assets/ai-drawer-12345678.css');

  assert.equal(harness.replacements.length, 0);
  assert.equal(harness.appended.length, 1);
  const prompt = harness.appended[0];
  assert.equal(prompt.getAttribute('role'), 'alert');
  assert.equal(prompt.getAttribute('aria-live'), 'assertive');
  assert.equal(prompt.children[1].textContent, 'Refresh');
  prompt.children[1].click();
  assert.deepEqual(harness.replacements, ['reload']);
});

test('non-asset errors are ignored by the shared recovery helper', () => {
  const harness = createHarness();

  assert.equal(
    harness.window.VTS_ASSET_RECOVERY.reportFailure(new Error('API request failed'), ''),
    false
  );
  assert.deepEqual(harness.replacements, []);
});
