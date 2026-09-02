import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const atlasSource = readFileSync('js/app-hero-atlas.js', 'utf8');
const shellSource = readFileSync('js/shell-v14.js', 'utf8');
const hubSource = readFileSync('js/heroes-combos-hub.js', 'utf8');
const appSource = readFileSync('js/app.js', 'utf8');

test('legacy ?atlas=skins and ?atlas=heroes keep resolving; codex is a third arm', () => {
  assert.match(atlasSource, /atlasMode === 'skins' \? 'skins' : atlasMode === 'codex' \? 'codex' : 'heroes'/);
  assert.match(atlasSource, /params\.get\('atlas'\)/);
});

test('legacy hub hashes stay intact and #codex is not added to the legacy map', () => {
  assert.match(
    shellSource,
    /const legacyHeroesCombosHashes = new Map\(\[\s*\['manual', 'manual'\],\s*\['generator', 'generator'\],\s*\['heroes', 'heroes'\],\s*\['skins', 'skins'\],\s*\]\)/
  );
  assert.doesNotMatch(shellSource, /\['codex',/);
  // Eden + research legacy maps are untouched.
  assert.match(shellSource, /\['royalbounty', 'bounty'\]/);
  assert.match(shellSource, /\['specialization', 'towers'\]/);
});

test('share-intent hashes (#combo= / #roster=) still guard the sub-tab hash write', () => {
  assert.match(hubSource, /startsWith\('combo='\) \|\| base\.startsWith\('roster='\)/);
  assert.match(hubSource, /updateSubtabHash/);
});

test('canonical sub-tab deep links include codex without breaking the existing four', () => {
  assert.match(hubSource, /HEROES_COMBOS_SUBTABS = Object\.freeze\(\[\s*'manual',\s*'generator',\s*'codex',\s*'heroes',\s*'skins',\s*\]\)/);
  assert.match(appSource, /HEROES_HUB_ALIASES = new Map\(\[\s*\['manual', 'manual'\],\s*\['generator', 'generator'\],\s*\['heroes', 'heroes'\],\s*\['skins', 'skins'\],\s*\]\)/);
});

test('URL writes keep the hub sub-tab canonical and codexPreset scoped to codex mode', () => {
  assert.match(atlasSource, /params\.delete\('atlas'\)/);
  assert.match(atlasSource, /_heroesTabState\.mode === 'codex' && _heroesTabState\.codexPreset !== 'free'/);
  assert.match(atlasSource, /params\.delete\('codexPreset'\)/);
});

test('troop/state/hero deep-link params are unchanged', () => {
  assert.match(atlasSource, /function normalizeTroopParam\(value\)/);
  assert.match(atlasSource, /params\.get\('heroSearch'\) \|\| params\.get\('search'\)/);
  assert.match(atlasSource, /params\.set\('hero', _heroesTabState\.selected\)/);
});
