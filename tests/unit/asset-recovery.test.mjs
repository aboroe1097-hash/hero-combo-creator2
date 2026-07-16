import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync('js/theme-prepaint.js', 'utf8');
const pwaSource = readFileSync('js/pwa-register.js', 'utf8');

function createHarness(options = {}) {
  const windowListeners = new Map();
  const documentListeners = new Map();
  const sessionValues = options.sessionValues || new Map();
  const replacements = [];
  const appended = [];
  const timers = [];
  const documentAttributes = new Map();
  const localValues = options.localValues || new Map();

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
      className: options.rootClass || '',
      setAttribute(name, value) {
        documentAttributes.set(name, String(value));
      },
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
  const navigator = {
    language: options.language || 'en-US',
    onLine: options.online !== false,
  };
  const localStorage = {
    getItem: (key) => localValues.get(key) || null,
    setItem: (key, value) => localValues.set(key, String(value)),
  };
  const window = {
    location,
    localStorage,
    navigator,
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
    navigator,
    localStorage,
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
    documentAttributes,
    localValues,
    dispatchAssetError(url = 'https://roc-vts.com/assets/index-ABCDEF12.js') {
      windowListeners.get('error')?.({ target: { tagName: 'SCRIPT', src: url, href: '' } });
    },
  };
}

test('prepaint PWA copy packs cover every stable message ID in all 11 locales', () => {
  const harness = createHarness();
  const runtime = harness.window.VTS_PWA_I18N;
  const audit = runtime.audit();

  assert.equal(audit.ok, true);
  assert.deepEqual([...audit.missing], []);
  assert.deepEqual([...audit.unexpected], []);
  assert.deepEqual(
    [...runtime.locales],
    ['en', 'es', 'pt', 'de', 'fr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr']
  );
  assert.equal(runtime.ids.length, 12);
  for (const locale of runtime.locales.filter((value) => value !== 'en')) {
    for (const id of runtime.ids) {
      assert.notEqual(
        runtime.text(id, locale),
        runtime.text(id, 'en'),
        `${locale}:${id} must not fall back to English`
      );
    }
  }
});

test('language prepaint migrates Korean locale aliases and applies Arabic RTL before modules run', () => {
  const koreanValues = new Map([['vts_hero_lang', 'ko-KR']]);
  const korean = createHarness({ localValues: koreanValues });
  assert.equal(korean.window.VTS_INITIAL_LANGUAGE, 'kr');
  assert.equal(korean.localValues.get('vts_hero_lang'), 'kr');
  assert.equal(korean.documentAttributes.get('lang'), 'ko-KR');
  assert.equal(korean.documentAttributes.get('dir'), 'ltr');

  const arabic = createHarness({ localValues: new Map([['vts_hero_lang', 'ar']]) });
  assert.equal(arabic.window.VTS_INITIAL_LANGUAGE, 'ar');
  assert.equal(arabic.documentAttributes.get('lang'), 'ar');
  assert.equal(arabic.documentAttributes.get('dir'), 'rtl');
});

test('English-only Battle Simulator beta ignores stored locale and keeps recovery copy English', () => {
  const localValues = new Map([['vts_hero_lang', 'ar']]);
  const battle = createHarness({ localValues, rootClass: 'battle-simulator-root' });

  assert.equal(battle.window.VTS_INITIAL_LANGUAGE, 'en');
  assert.equal(battle.localValues.get('vts_hero_lang'), 'ar');
  assert.equal(battle.documentAttributes.get('lang'), 'en');
  assert.equal(battle.documentAttributes.get('dir'), 'ltr');

  battle.window.VTS_ASSET_RECOVERY.markBootComplete();
  battle.dispatchAssetError();
  const prompt = battle.appended[0];
  assert.equal(prompt.children[1].textContent, 'Refresh');

  battle.windowListeners.get('vts:language-change')?.({ detail: { lang: 'ar' } });
  assert.equal(prompt.children[1].textContent, 'Refresh');
});

test('install and update UI consume stable PWA copy IDs and refresh on language changes', () => {
  assert.match(pwaSource, /pwaText\('updateAvailable'/);
  assert.match(pwaSource, /data-pwa-copy="installTitle"/);
  assert.match(pwaSource, /data-pwa-copy="iosAddToHome"/);
  assert.match(pwaSource, /data-pwa-copy-aria="dismiss"/);
  assert.match(pwaSource, /pwaText\('installing', activeLocale\)/);
  assert.match(pwaSource, /addEventListener\('vts:language-change', refreshVisibleCopy\)/);
});

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

test('asset recovery prompt uses the persisted locale and updates while it remains open', () => {
  const localValues = new Map([['vts_hero_lang', 'es']]);
  const harness = createHarness({ localValues });
  harness.window.VTS_ASSET_RECOVERY.markBootComplete();

  harness.dispatchAssetError();

  const prompt = harness.appended[0];
  assert.equal(
    prompt.children[0].textContent,
    'No se pudo cargar un archivo actualizado del sitio. Actualiza cuando quieras.'
  );
  assert.equal(prompt.children[1].textContent, 'Actualizar');

  localValues.set('vts_hero_lang', 'ar');
  harness.windowListeners.get('vts:language-change')?.({ detail: { lang: 'ar' } });
  assert.equal(prompt.children[1].textContent, 'تحديث الصفحة');
});

test('non-asset errors are ignored by the shared recovery helper', () => {
  const harness = createHarness();

  assert.equal(
    harness.window.VTS_ASSET_RECOVERY.reportFailure(new Error('API request failed'), ''),
    false
  );
  assert.deepEqual(harness.replacements, []);
});
