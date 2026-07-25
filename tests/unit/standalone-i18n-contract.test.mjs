import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

await import('../../js/i18n/standalone-copy.js');

const i18n = globalThis.VTSStandaloneI18n;
const root = new URL('../../', import.meta.url);
const locales = ['en', 'es', 'pt', 'de', 'fr', 'hr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr', 'it'];

function read(relativePath) {
  return readFileSync(new URL(relativePath, root), 'utf8');
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

function assertSameShape(reference, candidate, path = '') {
  for (const [key, value] of Object.entries(reference)) {
    const nextPath = path ? `${path}.${key}` : key;
    assert.ok(Object.hasOwn(candidate, key), `${nextPath} is missing`);
    const translated = candidate[key];
    if (Array.isArray(value)) {
      assert.ok(Array.isArray(translated), `${nextPath} must be an array`);
      assert.ok(translated.length > 0, `${nextPath} must not be empty`);
      translated.forEach((entry) => assert.equal(typeof entry, 'string', `${nextPath} entries`));
    } else if (value && typeof value === 'object') {
      assert.equal(typeof translated, 'object', `${nextPath} must be an object`);
      assertSameShape(value, translated, nextPath);
    } else {
      assert.equal(typeof translated, 'string', `${nextPath} must be text`);
      assert.ok(translated.trim(), `${nextPath} must not be empty`);
      assert.deepEqual(placeholders(translated), placeholders(value), `${nextPath} placeholders`);
    }
  }
}

test('standalone domain copy resolves all thirteen supported locales', () => {
  assert.deepEqual(i18n.locales, locales);
  const english = i18n.getCopy('en');
  for (const locale of locales) assertSameShape(english, i18n.getCopy(locale), locale);
  assert.equal(i18n.normalizeLocale('ko-KR'), 'kr');
  assert.equal(i18n.normalizeLocale('it-IT'), 'it');
  assert.equal(i18n.normalizeLocale('not-supported'), 'en');
  assert.notEqual(i18n.getCopy('it'), english);
  assert.equal(i18n.getCopy('it').standalone.maintenance.title, 'Modalità manutenzione');
  assert.equal(i18n.getCopy('it').arcade.shell.again, 'Gioca ancora');
});

test('standalone page localization switches language, direction, title, and visible copy', () => {
  const nodes = new Map(
    ['title', 'message', 'status'].map((key) => [
      key,
      {
        textContent: '',
        getAttribute: () => key,
      },
    ])
  );
  const documentRef = {
    title: '',
    documentElement: { lang: '', dir: '' },
    querySelectorAll: () => [...nodes.values()],
  };

  i18n.localizeStandalone(documentRef, 'maintenance', 'ar');
  assert.equal(documentRef.documentElement.lang, 'ar');
  assert.equal(documentRef.documentElement.dir, 'rtl');
  assert.equal(documentRef.title, i18n.getCopy('ar').standalone.maintenance.documentTitle);
  assert.equal(nodes.get('title').textContent, i18n.getCopy('ar').standalone.maintenance.title);

  i18n.localizeStandalone(documentRef, 'maintenance', 'kr');
  assert.equal(documentRef.documentElement.lang, 'ko');
  assert.equal(documentRef.documentElement.dir, 'ltr');
  assert.equal(nodes.get('status').textContent, i18n.getCopy('kr').standalone.maintenance.status);
});

test('Arcade and shell consumers use the shared domain copy without embedded locale drift', () => {
  const shared = read('games/boot/shared.js');
  const shell = read('js/shell-v14.js');
  const palette = read('js/command-palette.js');
  const hub = read('js/arcade-hub.js');
  const postBuild = read('scripts/post-build.mjs');

  assert.doesNotMatch(shared, /const SHELL_COPY\s*=/);
  assert.match(shared, /VTSStandaloneI18n/);
  assert.match(shell, /standalone-copy\.js/);
  assert.doesNotMatch(shell, /const shellCopy\s*=/);
  assert.match(shell, /accessibility\.themeToggle/);
  assert.match(shell, /'#installAppBtn'/);
  assert.match(shell, /'#scrollTopBtn'/);
  assert.match(shell, /copy\.deckLabel/);
  assert.match(shell, /document\.title = `\$\{appTitle\} - VTS 1097`/);
  assert.match(shell, /\.tab-badge-new:not\(\[data-i18n\]\)/);
  assert.match(shell, /copy\.badges\.seasonal/);
  assert.match(palette, /commandCopy\(\)\.badges/);
  assert.match(palette, /commandCopy\(\)\.aliases/);
  assert.match(palette, /vts:language-change/);
  assert.match(hub, /standalone-copy\.js/);
  assert.match(hub, /shellAccessibilityCopy/);
  assert.match(hub, /document\.title = `\$\{pageTitle\}/);
  assert.match(postBuild, /js\/i18n\/standalone-copy\.js/);

  for (const file of [
    'games/boot/b-merge-rush.html',
    'games/boot/c-sort-hoard.html',
    'games/boot/e-crystal-relay.html',
    'games/boot/f-set-assembly.html',
    'games/boot/h-hero-rumble.html',
  ]) {
    const html = read(file);
    assert.ok(
      html.indexOf('/js/i18n/standalone-copy.js') < html.indexOf('./shared.js'),
      `${file} must load translations before the game shell`
    );
  }
});

test('visible Arcade result words and overlays use locale keys instead of English literals', () => {
  const merge = read('games/boot/b-merge-rush.html');
  const relay = read('games/boot/e-crystal-relay.html');
  const setAssembly = read('games/boot/f-set-assembly.html');
  const rumble = read('games/boot/h-hero-rumble.html');

  assert.doesNotMatch(merge, /`\s*JACKPOT|`MERGE/);
  assert.match(merge, /G\.text\('jackpot'/);
  assert.match(relay, /G\.text\('sweet'\)/);
  assert.doesNotMatch(setAssembly, /Forge ready!|Set complete/);
  assert.match(setAssembly, /G\.text\('setComplete'/);
  assert.doesNotMatch(rumble, /'\s*(?:K\.O\.|MISS!|WHIFF!)'/);
  assert.match(rumble, /G\.text\('knockout'\)/);
});
