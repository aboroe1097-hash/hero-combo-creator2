import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { TOOLKIT_MAP } from '../../js/ai/toolkit-map.js';
import { VELO_ACTION_ROUTES } from '../../js/ai/ui-actions.js';

const read = (path) => readFileSync(path, 'utf8');
const indexHtml = read('index.html');
const shellSource = read('js/shell-v14.js');
const appSource = read('js/app.js');

// Every tab the index page renders a section for.
const sectionTabs = new Set([...indexHtml.matchAll(/id="([A-Za-z]+)Section"/gu)].map((m) => m[1]));

function mapKeys(source, name) {
  const start = source.indexOf(name);
  assert.ok(start >= 0, `${name} exists`);
  const block = source.slice(start, source.indexOf(']);', start));
  return [...block.matchAll(/\['([A-Za-z0-9]+)',/gu)].map((m) => m[1].toLowerCase());
}

function objectKeys(source, name) {
  const start = source.indexOf(name);
  assert.ok(start >= 0, `${name} exists`);
  const block = source.slice(start, source.indexOf('});', start));
  return [...block.matchAll(/^\s+([A-Za-z0-9]+):/gmu)].map((m) => m[1].toLowerCase());
}

function arrayValues(path, name) {
  const source = read(path);
  const start = source.indexOf(name);
  assert.ok(start >= 0, `${name} exists in ${path}`);
  const block = source.slice(start, source.indexOf(']', start));
  return [...block.matchAll(/'([A-Za-z]+)'/gu)].map((m) => m[1]);
}

// Hashes the shell and app resolve beyond the plain tab names.
const aliasHashes = new Set([
  ...mapKeys(shellSource, 'const legacyEdenHubHashes'),
  ...mapKeys(shellSource, 'const legacyResearchTowersHashes'),
  ...mapKeys(shellSource, 'const legacyHeroesCombosHashes'),
  ...mapKeys(shellSource, 'const tabHashAliases'),
  ...objectKeys(appSource, 'const TAB_HASH_ALIASES'),
]);

const HUB_SUBTABS = {
  edenhub: arrayValues('js/eden-hub.js', 'const EDEN_HUB_SUBTABS'),
  edenmap: arrayValues('js/eden-hub.js', 'const EDEN_HUB_SUBTABS'),
  researchtowers: arrayValues('js/research-towers-hub.js', 'RESEARCH_TOWERS_SUBTABS ='),
  heroescombos: arrayValues('js/heroes-combos-hub.js', 'HEROES_COMBOS_SUBTABS ='),
};

function assertHashResolves(hash, label) {
  const [base, query] = String(hash).split('?');
  const known =
    sectionTabs.has(base) ||
    [...sectionTabs].some((tab) => tab.toLowerCase() === base.toLowerCase()) ||
    aliasHashes.has(base.toLowerCase());
  assert.ok(known, `${label}: #${base} is a tab or a hash the shell/app resolves`);
  if (!query) return;
  const subtab = new URLSearchParams(query).get('subtab');
  assert.ok(subtab, `${label}: only ?subtab= deep links are used`);
  const subtabs = HUB_SUBTABS[base.toLowerCase()];
  assert.ok(subtabs, `${label}: #${base} is a hub with sub-tabs`);
  assert.ok(subtabs.includes(subtab), `${label}: ${subtab} is a ${base} sub-tab`);
}

function assertHrefResolves(href, label) {
  const [page, fragment] = String(href).split('#');
  assert.ok(existsSync(page), `${label}: ${page} is a deployed page`);
  if (page === 'index.html' && fragment) {
    assertHashResolves(fragment, label);
    return;
  }
  if (fragment) {
    assert.match(read(page), new RegExp(`id="${fragment}"`), `${label}: #${fragment} exists`);
  }
}

test('the toolkit map covers every part of the site Velo must know about', () => {
  const ids = TOOLKIT_MAP.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  for (const id of [
    'generator',
    'manual',
    'heroes',
    'research',
    'materials',
    'classDevelopment',
    'strife',
    'specialization',
    'edenMap',
    'arcade',
    'edenSiege',
    'edenX1',
    'battleSimulator',
    'downloads',
    'velo',
    'vtsScore',
    'buildings',
    'edenPathing',
    'edenOperations',
    'hubPdfs',
    'complaints',
    'edenX2Season',
  ]) {
    assert.ok(ids.includes(id), `toolkit map has ${id}`);
  }
  const byId = Object.fromEntries(TOOLKIT_MAP.map((entry) => [entry.id, entry]));
  assert.match(byId.edenSiege.name, /Velo's Rampart/u);
  assert.match(byId.edenSiege.summary, /Velo's Rampart/u);
  assert.match(byId.generator.summary, /X8 catch-up lineups/u);
  assert.match(byId.generator.summary, /only appear when the player owns the X8 heroes/u);
  assert.match(byId.vtsScore.summary, /Lord Info → Power screenshot/u);
  assert.match(byId.vtsScore.summary, /UTC−2/u);
  assert.match(byId.edenPathing.summary, /40 tiles per pather/u);
  assert.match(byId.edenOperations.summary, /shared by the whole alliance/u);
  assert.match(byId.buildings.summary, /Castle 26–30/u);
  assert.match(byId.buildings.summary, /Google Sheet/u);
  assert.match(byId.hubPdfs.summary, /dark or light theme/u);
  assert.match(byId.hubPdfs.summary, /PDF and PNG downloads/u);
  assert.equal(byId.complaints.href, 'eden-x2.html#edenX1Complaints');
  assert.match(byId.complaints.summary, /Contact Devs/u);
  assert.equal(byId.edenX2Season.href, 'eden-x2.html');
});

test('every toolkit route points at a real page, tab, hub sub-tab or section', () => {
  for (const entry of TOOLKIT_MAP) {
    if (entry.kind === 'drawer') {
      assert.equal(entry.hash ?? entry.href ?? null, null, `${entry.id} opens in place`);
      continue;
    }
    assert.ok(entry.hash || entry.href, `${entry.id} has a route`);
    if (entry.hash) assertHashResolves(entry.hash, entry.id);
    if (entry.href) assertHrefResolves(entry.href, entry.id);
    for (const hash of entry.alsoAt || []) assertHashResolves(hash, `${entry.id} alsoAt`);
  }
});

test('the complaint form link is the one every footer uses', () => {
  for (const page of ['index.html', 'arcade.html', 'admin.html', 'eden-x1.html', 'eden-x2.html']) {
    assert.match(read(page), /href="eden-x2\.html#edenX1Complaints"/u, `${page} footer`);
  }
  assert.match(read('js/tool-shell.js'), /eden-x2\.html#edenX1Complaints/u);
});

test('Velo answer buttons use routes that exist', () => {
  for (const [id, href] of Object.entries(VELO_ACTION_ROUTES)) assertHrefResolves(href, id);
});
