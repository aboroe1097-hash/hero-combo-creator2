import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { baseRankedCombos, filterCombosForSkinMode, rankedCombos } from '../../js/combos-db.js';
import { projectSkinModeRankDeltas } from '../../js/codex-rank-projection.js';
import {
  codexStatusRank,
  eraForGameVersion,
  isRenderable,
  worstCodexStatus,
} from '../../js/codex-ui.js';
import { SKIN_TIERS, getHeroSkins, getHeroHiddenPower } from '../../js/skins-db.js';

const atlasSource = readFileSync('js/app-hero-atlas.js', 'utf8');
const hubSource = readFileSync('js/heroes-combos-hub.js', 'utf8');
const heroesInfoSource = readFileSync('js/heroes-info.js', 'utf8');
const detailCss = readFileSync('css/hero-atlas-detail-v14.css', 'utf8');
const indexSource = readFileSync('index.html', 'utf8');

const CODEX_PRESETS = ['free', 'paid', 'skins-paid'];

test('Codex mode renders one Atlas mode with three filter presets', () => {
  assert.match(atlasSource, /mode === 'codex'/);
  assert.match(atlasSource, /function renderCodexView\(\)/);
  for (const preset of CODEX_PRESETS) {
    assert.match(atlasSource, new RegExp(`data-codex-preset="\\$\\{preset\\}"`));
    assert.match(atlasSource, new RegExp(`heroUi\\(preset === 'free' \\? 'codexPresetFree'`));
  }
  assert.match(atlasSource, /normalizeCodexPreset/);
  assert.match(atlasSource, /data-codex-state="\$\{loadStatus\}"/);
  // Codex is reachable from the Atlas view switch, not a sub-tab of its own.
  // Three sibling sub-tabs that all opened this same panel read as three
  // separate tools, so Heroes / Skins / Hero Tables are one control again.
  assert.match(indexSource, /data-atlas-mode="codex"[\s\S]*?data-i18n="tabCodex"/);
  assert.doesNotMatch(
    indexSource,
    /data-hub-subtab="codex"/,
    'Codex must not regain a sub-tab button beside Heroes'
  );
});

test('Hub sub-tab registry is flagship-first and keeps legacy subtabs intact', () => {
  assert.match(
    hubSource,
    /HEROES_COMBOS_SUBTABS = Object\.freeze\(\[[\s\S]*?'manual',\s*'generator',\s*'codex',\s*'heroes',\s*'skins',\s*\]\)/
  );
  assert.match(hubSource, /PANEL_FOR_SUBTAB = Object\.freeze\(\{[\s\S]*?codex: 'heroes',/);
  assert.match(hubSource, /ATLAS_MODE_FOR_SUBTAB = Object\.freeze\(\{[\s\S]*?codex: 'codex',/);
});

test('Skin-mode rank deltas project the override block without re-ranking combos', () => {
  const skinModeCombos = filterCombosForSkinMode(rankedCombos, true, () => true);
  const names = ['Immortal Guardian', 'Ramses II', 'Beowulf', 'King Arthur', 'Cleopatra VII'];
  const deltas = projectSkinModeRankDeltas(baseRankedCombos, skinModeCombos, names);
  assert.ok(deltas instanceof Map);
  for (const name of names) assert.ok(deltas.has(name), name);
  // The skin '321' override lane (Immortal Guardian / Ramses II / Beowulf)
  // outranks its base position, so its best delta must be positive.
  assert.ok(deltas.get('Immortal Guardian') > 0);
  assert.ok(deltas.get('Ramses II') > 0);
  assert.ok(deltas.get('Beowulf') > 0);
});

test('Skin-mode rank deltas ignore unknown heroes and non-positive moves', () => {
  const deltas = projectSkinModeRankDeltas(
    [{ heroes: ['C'] }, { heroes: ['A', 'B'] }],
    [{ heroes: ['A', 'B'] }, { heroes: ['C'] }],
    ['A', 'B', 'C', 'Unknown']
  );
  assert.equal(deltas.get('A'), 1);
  assert.equal(deltas.get('B'), 1);
  assert.equal(deltas.get('C'), 0);
  assert.equal(deltas.has('Unknown'), true);
  assert.equal(deltas.get('Unknown'), 0);
});

test('Codex star-up cost follows tier maximize totals (Mythic has no preserving step)', () => {
  const mythic = SKIN_TIERS.find((tier) => tier.id === 'mythic');
  const everlasting = SKIN_TIERS.find((tier) => tier.id === 'everlasting');
  assert.ok(mythic.star2To3 === null);
  assert.ok(everlasting.maximizeTotal.some((item) => item.name === 'Advanced Biography Seal'));
  // Source contract: the codex column renders the tier cost summary, not a
  // per-skin invented number.
  assert.match(atlasSource, /function skinStarUpCostSummary\(skin\)/);
  assert.match(atlasSource, /maximizeTotal/);
});

test('Skills 1-8 are payload-only; heroes-info stays the community baseline', () => {
  assert.match(atlasSource, /function mergeHeroSkills\(/);
  assert.match(atlasSource, /sourceSurface: 'codex'/);
  assert.match(atlasSource, /never copied into\s*\n?\s*\/\/ js\/heroes-info\.js/);
  // heroes-info keeps only its captured subset; payload skills never land here.
  assert.doesNotMatch(heroesInfoSource, /id: 1,|id: 6,/);
  assert.match(detailCss, /\.hero-atlas-detail-v14 \.detail-skills\[data-skill-count='8'\]/);
});

test('Verification chips and era badges resolve from the provenance gate', () => {
  assert.match(atlasSource, /function renderVerificationChip\(status/);
  assert.match(atlasSource, /data-codex-status="\$\{safeStatus\}"/);
  assert.match(atlasSource, /function renderEraBadge\(gameVersionScope\)/);
  assert.match(atlasSource, /heroUi\('duelEvidenceOnly'\)/);
  assert.match(atlasSource, /duelRecordsForHero/);
  assert.equal(codexStatusRank('current'), 2);
  assert.equal(codexStatusRank('historical'), 1);
  assert.equal(codexStatusRank('unverified'), 0);
  assert.equal(codexStatusRank('bogus'), -1);
});

test('Era mapping resolves single seasons and ranges to the upper bound', () => {
  assert.equal(eraForGameVersion('X12').eraKey, 'eraX12');
  assert.equal(eraForGameVersion('X10').eraKey, 'eraX10');
  assert.equal(eraForGameVersion('X8').eraKey, 'eraX1X8');
  assert.equal(eraForGameVersion('S0').eraKey, 'eraS0S4');
  assert.equal(eraForGameVersion('S0-X17').eraKey, 'eraX15Plus');
  assert.equal(eraForGameVersion('X15').eraKey, 'eraX15Plus');
  assert.equal(eraForGameVersion('X24').eraKey, 'eraX15Plus');
  assert.equal(eraForGameVersion(''), null);
  assert.equal(eraForGameVersion('garbage'), null);
});

test('worstCodexStatus aggregates records through the 5-field envelope', () => {
  const current = {
    provenance: {
      source: 's',
      credit: 'c',
      captureDate: '2026-01-01',
      gameVersionScope: 'X12',
      verificationStatus: 'current',
    },
  };
  const historical = {
    provenance: {
      source: 's',
      credit: 'c',
      captureDate: '2026-01-01',
      gameVersionScope: 'X10',
      verificationStatus: 'historical',
    },
  };
  const broken = { provenance: { source: 's' } };
  assert.equal(worstCodexStatus([historical, current]), 'current');
  assert.equal(worstCodexStatus([historical, broken]), 'historical');
  assert.equal(worstCodexStatus([broken]), 'unverified');
  assert.equal(isRenderable(current), true);
  assert.equal(isRenderable(broken), false);
});

test('Codex additions stay token-only and lazy (no raw hex, no eager route CSS)', () => {
  const codexSection = detailCss.slice(detailCss.indexOf('.codex-table {'));
  assert.ok(codexSection.length > 0);
  assert.doesNotMatch(codexSection, /#[0-9a-fA-F]{3,8}\b/);
  assert.match(codexSection, /var\(--ff-[a-z-]+\)/);
  assert.match(atlasSource, /import \{ loadCodexStore \} from '\.\/codex-loader\.js'/);
});

test('CSV export emits the current codex preset columns', () => {
  assert.match(atlasSource, /function exportCodexCsv\(stats\)/);
  assert.match(atlasSource, /hero-codex-\$\{codexPreset\}/);
  assert.match(atlasSource, /heroUi\('codexExportCsv', \{ preset: codexPreset \}\)/);
});

test('Codex skins-paid preset joins skins with hidden power and star costs', () => {
  assert.match(atlasSource, /getHeroSkins\(hero\.name\)\.length > 0 \|\| hero\.State === 'Paid'/);
  assert.match(atlasSource, /getHeroHiddenPower\(hero\.name\)/);
  assert.ok(getHeroSkins('King Arthur').length > 0);
  assert.ok(getHeroHiddenPower('King Arthur'));
});
