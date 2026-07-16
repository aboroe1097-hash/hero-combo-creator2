import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('js/command-palette.js', 'utf8');

function between(start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing ${start}`);
  assert.notEqual(endIndex, -1, `Missing ${end}`);
  return source.slice(startIndex, endIndex);
}

test('command palette exposes the twelve deterministic tool destinations', () => {
  const destinations = between('const DESTS = [', '];');
  const keys = Array.from(destinations.matchAll(/\bkey:\s*'([^']+)'/g), (match) => match[1]);

  assert.deepEqual(keys, [
    'tabManual',
    'tabGenerator',
    'tabHeroes',
    'tabResearch',
    'tabMaterials',
    'tabEdenMap',
    'tabStrife',
    'tabLoyalty',
    'tabYouTube',
    'tabOcrDashboard',
    'tabArcade',
    'tabBattleSimulator',
  ]);
  assert.match(destinations, /name:\s*'manual'[\s\S]*?kind:\s*'tab'/);
  assert.match(destinations, /key:\s*'tabOcrDashboard'[\s\S]*?href:\s*'admin\.html'/);
  assert.match(destinations, /key:\s*'tabArcade'[\s\S]*?name:\s*'arcade'[\s\S]*?kind:\s*'tab'/);
  assert.match(
    destinations,
    /key:\s*'tabBattleSimulator'[\s\S]*?href:\s*'battle-simulator\.html'[\s\S]*?kind:\s*'link'/
  );
});

test('reopening reads the shared language and refreshes all localized dialog copy', () => {
  const refresh = between('function refreshLocalizedCopy()', 'function render(');
  const open = between('function open()', 'function close()');

  assert.match(source, /localStorage\.getItem\('vts_hero_lang'\)/);
  assert.doesNotMatch(source, /vts_language/);
  assert.match(refresh, /els\.overlay\.setAttribute\('aria-label',\s*title\)/);
  assert.match(refresh, /els\.input\.placeholder\s*=\s*placeholder/);
  assert.match(refresh, /els\.input\.setAttribute\('aria-label',\s*placeholder\)/);
  assert.match(refresh, /els\.hint\.textContent\s*=\s*t\('cmdkHint'/);
  assert.match(open, /refreshLocalizedCopy\(\)/);
  assert.match(open, /render\(''\)/);
});

test('keyboard operation supports open, wrapped navigation, Escape, and focus restore', () => {
  const inputKeys = between('function onInputKeydown(e)', 'function go(dest)');
  const close = between('function close()', 'function toggle()');
  const init = between('function init()', "if (document.readyState === 'loading')");

  assert.match(init, /\(e\.ctrlKey \|\| e\.metaKey\)/);
  assert.match(init, /e\.key === 'k' \|\| e\.key === 'K'/);
  assert.match(init, /e\.preventDefault\(\)[\s\S]*?toggle\(\)/);
  assert.match(inputKeys, /e\.key === 'ArrowDown'[\s\S]*?setActive\(active \+ 1\)/);
  assert.match(inputKeys, /e\.key === 'ArrowUp'[\s\S]*?setActive\(active - 1\)/);
  assert.match(inputKeys, /e\.key === 'Enter'[\s\S]*?go\(results\[active\]\)/);
  assert.match(inputKeys, /e\.key === 'Escape'[\s\S]*?close\(\)/);
  assert.match(inputKeys, /e\.key === 'Tab'[\s\S]*?els\.input\.focus\(\)/);
  assert.match(source, /active = \(i \+ results\.length\) % results\.length/);
  assert.match(close, /lastFocused[\s\S]*?lastFocused\.focus\(\{ preventScroll: true \}\)/);
  assert.match(close, /els\.input\.removeAttribute\('aria-activedescendant'\)/);
});

test('command palette has no network, telemetry, or AI execution path', () => {
  for (const api of [
    /\bfetch\s*\(/,
    /\bXMLHttpRequest\b/,
    /\bWebSocket\b/,
    /\bEventSource\b/,
    /\bsendBeacon\b/,
    /\bfirebase\b/i,
    /\bopenai\b/i,
    /\banthropic\b/i,
  ]) {
    assert.doesNotMatch(source, api);
  }
  assert.match(source, /import \{ translations \} from '\.\/translations\.js'/);
});
