import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const indexSource = readFileSync('index.html', 'utf8');
const tabSource = readFileSync('tabs/all-star-boh.html', 'utf8');
const cssSource = readFileSync('css/all-star-boh.css', 'utf8');
const appSource = readFileSync('js/app.js', 'utf8');
const bootstrapSource = readFileSync('js/all-star-boh-bootstrap.js', 'utf8');
const controllerSource = readFileSync('js/all-star-boh.js', 'utf8');
const stateSource = readFileSync('js/state.js', 'utf8');
const shellSource = readFileSync('js/shell-v14.js', 'utf8');
const commandPaletteSource = readFileSync('js/command-palette.js', 'utf8');

function openingTagById(source, id) {
  const match = source.match(new RegExp(`<[^>]*\\sid="${id}"[^>]*>`));
  assert.ok(match, `Missing element #${id}`);
  return match[0];
}

function exactIds(source) {
  return Array.from(source.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
}

function assertUnique(values, label) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  assert.deepEqual([...new Set(duplicates)], [], `${label} must not contain duplicate IDs`);
}

test('All-Star BoH is an internal lazy tab wired through the shell and command palette', () => {
  const tabButton = openingTagById(indexSource, 'tabAllStarBoh');
  const tabSection = openingTagById(indexSource, 'allStarBohSection');
  const protectedRoot = tabSource.match(/^<div[\s\S]*?>/)?.[0];

  assert.match(tabButton, /^<button\b/);
  assert.match(tabButton, /aria-label="Open the All-Star BoH member hub"/);
  assert.match(tabButton, /data-i18n-aria="tabAllStarBohAria"/);
  assert.match(tabButton, /data-i18n-title="tabAllStarBohAria"/);
  assert.match(indexSource, /data-i18n="tabAllStarBoh">All-Star BoH<\/span>/);
  assert.match(tabSection, /^<section\b/);
  assert.match(tabSection, /class="[^"]*\btab-panel\b[^"]*\bhidden\b/);
  assert.match(tabSection, /data-tab-src="tabs\/all-star-boh\.html\?v=[^"]+"/);
  assert.match(indexSource, /href="#allStarBoh" data-footer-tab="allStarBoh"/);
  assert.doesNotMatch(indexSource, /href="css\/all-star-boh\.css\?v=[^"]+"/);
  assert.match(bootstrapSource, /import\('\.\.\/css\/all-star-boh\.css'\)/);
  assert.ok(protectedRoot, 'the protected player root must be the template entrypoint');
  assert.match(protectedRoot, /\saria-hidden="true"/);
  assert.match(protectedRoot, /\shidden(?:\s|>)/);
  assert.match(protectedRoot, /\sinert(?:\s|>)/);

  assert.match(
    stateSource,
    /export const allStarBohSection = document\.getElementById\('allStarBohSection'\)/
  );
  assert.match(
    stateSource,
    /export const tabAllStarBohBtn = document\.getElementById\('tabAllStarBoh'\)/
  );
  assert.match(appSource, /allStarBoh:\s*'tabAllStarBoh'/);
  assert.match(appSource, /\{ btn: tabAllStarBohBtn, name: 'allStarBoh' \}/);

  const lazyBlock = appSource.match(
    /if \(tabName === 'allStarBoh'[\s\S]*?\n\s*}\n\s*if \(tabName === 'loyalty'\)/
  )?.[0];
  assert.ok(lazyBlock, 'Missing the All-Star BoH lazy bootstrap block');
  const templateIndex = lazyBlock.indexOf("loadTabTemplate('allStarBoh')");
  const importIndex = lazyBlock.indexOf("import('./all-star-boh-bootstrap.js')");
  const bootIndex = lazyBlock.indexOf('module.bootAllStarBohTab()');
  assert.ok(templateIndex >= 0, 'the tab template must be loaded');
  assert.ok(templateIndex < importIndex, 'the protected bootstrap loads only after the template');
  assert.ok(importIndex < bootIndex, 'the lazy module must be imported before its boot hook runs');

  assert.match(shellSource, /\['tabAllStarBoh', 'allStarBoh'\]/);
  assert.match(
    commandPaletteSource,
    /key:\s*'tabAllStarBoh'[\s\S]*?name:\s*'allStarBoh'[\s\S]*?kind:\s*'tab'/
  );
});

test('the four player subsections have bidirectional tab and tabpanel ARIA links', () => {
  const sections = [
    ['bohSignupTab', 'bohSignupPanel', 'signup'],
    ['bohAnnouncementTab', 'bohAnnouncementPanel', 'announcement'],
    ['bohPlanTab', 'bohPlanPanel', 'plan'],
    ['bohShowdownTab', 'bohShowdownPanel', 'showdown'],
  ];

  for (const [tabId, panelId, section] of sections) {
    const tab = openingTagById(tabSource, tabId);
    const panel = openingTagById(tabSource, panelId);
    assert.match(tab, /^<button\b/);
    assert.match(tab, /role="tab"/);
    assert.match(tab, new RegExp(`aria-controls="${panelId}"`));
    assert.match(tab, /data-role="section-tab"/);
    assert.match(tab, new RegExp(`data-section="${section}"`));
    assert.match(panel, /^<section\b/);
    assert.match(panel, /role="tabpanel"/);
    assert.match(panel, new RegExp(`aria-labelledby="${tabId}"`));
    assert.match(panel, /data-role="section-panel"/);
    assert.match(panel, new RegExp(`data-section="${section}"`));
  }

  const indexIds = exactIds(indexSource);
  const tabIds = exactIds(tabSource);
  assertUnique(indexIds, 'index.html');
  assertUnique(tabIds, 'All-Star BoH template');
  assert.deepEqual(
    tabIds.filter((id) => new Set(indexIds).has(id)),
    [],
    'lazy template IDs must not collide with the index shell'
  );
});

test('signup preserves the canonical combat fields and requires reviewable OCR', () => {
  const canonicalFields = [
    'gameName',
    'totalCastlePower',
    'troopPower',
    'buildingPower',
    'technologyPower',
    'heroCombatPower',
    'dragonPower',
    'unitSpecialtyPower',
    'artifactPower',
    'royalTechPower',
    't10Types',
    'speedHeroes',
    'rocLevel',
  ];
  for (const name of canonicalFields) {
    assert.match(tabSource, new RegExp(`name="${name}"`), `Missing signup field ${name}`);
  }

  for (const stat of [
    'totalCastlePower',
    'troopPower',
    'buildingPower',
    'technologyPower',
    'heroCombatPower',
    'dragonPower',
  ]) {
    assert.match(
      tabSource,
      new RegExp(
        `<input[^>]*name="${stat}"[^>]*required[^>]*data-stat="${stat}"[^>]*data-role="stat-input"[^>]*>`
      ),
      `${stat} must be a required, OCR-addressable input`
    );
  }

  for (const value of ['cavalry', 'archers', 'footmen', 'all']) {
    assert.match(tabSource, new RegExp(`name="t10Types" value="${value}"`));
  }
  for (const value of ['lionheart', 'cao-cao', 'al-fatih']) {
    assert.match(tabSource, new RegExp(`name="speedHeroes" value="${value}"`));
  }

  assert.match(tabSource, /data-role="ocr-file-input"/);
  assert.match(tabSource, /accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(tabSource, /data-role="ocr-consent"/);
  assert.match(tabSource, /data-role="ocr-review-badge"/);
  assert.match(tabSource, /data-role="ocr-review-alert"/);
  assert.match(tabSource, /data-role="ocr-warning-list"/);
  assert.match(tabSource, /data-role="ocr-review-confirmation"/);
  assert.match(tabSource, /data-role="ocr-values-confirmed"/);
  assert.match(tabSource, /id="bohPrivacyTitle" data-boh-i18n="signup\.privacyTitle"/);
  assert.match(tabSource, /data-boh-i18n="signup\.privacyDescription"/);
  assert.match(tabSource, /third-party AI service only to read the\s+visible numbers/);
  assert.match(tabSource, /Review and correct every value before you submit/);
  assert.match(tabSource, /no extracted value is accepted automatically/);
  assert.match(tabSource, /data-role="ocr-field-issue"/);
  assert.match(tabSource, /aria-describedby="bohPowerHelp bohOcrIssue-totalCastlePower"/);
  assert.match(tabSource, /id="bohDeviceIdentityTitle"/);
  assert.match(tabSource, /data-boh-i18n="signup\.deviceIdentityDescription"/);
  assert.match(tabSource, /submit again using the exact same in-game name/);
  assert.match(tabSource, /contact R5 to merge or confirm the entries/);
  assert.match(tabSource, /data-role="submission-feedback"/);
  assert.match(tabSource, /data-role="submission-feedback-note"/);
  assert.match(tabSource, /src="\/images\/boh-power-breakdown-example\.jpg"/);
  assert.match(tabSource, /src="\/images\/boh-roc-red-tree-example\.png"/);
  assert.match(tabSource, /name="preferredTeammates"/);
  assert.match(tabSource, /data-boh-i18n="signup\.preferredTeammates"/);
  assert.match(tabSource, /aria-describedby="bohPreferredTeammatesHint"/);
});

test('signup planning selectors are compact, optional where intended, and keyboard accessible', () => {
  const heroDisclosure = tabSource.match(/<details[^>]*data-role="hero-selector"[^>]*>/u)?.[0];
  const researchDisclosure = tabSource.match(
    /<details[^>]*data-role="research-selector"[^>]*>/u
  )?.[0];
  assert.ok(heroDisclosure);
  assert.ok(researchDisclosure);
  assert.doesNotMatch(heroDisclosure, /\sopen(?:\s|>)/u);
  assert.doesNotMatch(researchDisclosure, /\sopen(?:\s|>)/u);
  assert.match(tabSource, /enough copies to field in battle/iu);
  assert.match(tabSource, /They do not need to be\s+maxed/iu);
  for (const role of [
    'hero-search',
    'hero-troop-filter',
    'hero-season-filter',
    'hero-selected-count',
    'hero-results',
    'hero-list',
    'research-entered-count',
    'research-groups',
  ]) {
    assert.match(tabSource, new RegExp(`data-role="${role}"`));
  }
  assert.match(controllerSource, /name = 'usableHeroNames'/u);
  assert.match(controllerSource, /type = 'number'[\s\S]*?min = '0'[\s\S]*?max = '100'/u);
  assert.match(controllerSource, /\['25', '50', '75', '100', ''\]/u);
  assert.match(controllerSource, /researchTreeText\(tree, 'name', state\.language\)/u);
  assert.match(controllerSource, /const eden = \/\^X\(\[1-8\]\)\$\/u/u);
  assert.match(controllerSource, /seasonRank\(row\.dataset\.season\) <= selectedSeasonRank/u);
  assert.match(controllerSource, /portrait\.src = hero\.imageUrl/u);
  assert.match(controllerSource, /VERIFIED_RESEARCH_ART/u);
  assert.match(controllerSource, /\/assets\/research\/sources\/basic-combat-01\.jpg/u);
  assert.match(controllerSource, /art\.dataset\.verifiedResearchArt/u);
  assert.match(cssSource, /\.boh-research-row__art\s*\{/u);

  const fightingTimes = Array.from(
    tabSource.matchAll(/name="fightingTimeIds" value="([^"]+)"/gu),
    (match) => match[1]
  );
  assert.deepEqual(fightingTimes, ['+8', '+12', '+14', '+20']);
  assert.match(tabSource, /data-role="fighting-times-count"[^>]*role="status"/u);
  assert.match(tabSource, /data-role="fighting-times-error"[^>]*role="alert"/u);
  assert.match(controllerSource, /Only two fighting times can be selected/u);

  const preferredRole = tabSource.match(/<select name="preferredRole"[\s\S]*?<\/select>/u)?.[0];
  assert.ok(preferredRole);
  assert.match(preferredRole, /required/u);
  assert.match(preferredRole, /<option value=""[^>]*>Choose a role<\/option>/u);
  assert.match(preferredRole, /<option value="flexible"/u);
  assert.ok(preferredRole.indexOf('value=""') < preferredRole.indexOf('value="flexible"'));
  const secondaryRole = tabSource.match(/<select name="secondaryRole"[\s\S]*?<\/select>/u)?.[0];
  assert.ok(secondaryRole);
  assert.match(secondaryRole, /<option value=""[^>]*>No preference<\/option>/u);
  assert.match(tabSource, /class="boh-role-guide"/u);
  assert.match(tabSource, /data-boh-i18n="signup\.roleOffensiveDescription"/u);
  assert.doesNotMatch(tabSource, /name="unavailableTimes"/u);
  assert.doesNotMatch(tabSource, /name="planCommitment"/u);
  assert.doesNotMatch(tabSource, /name="canTeleport"/u);
  assert.doesNotMatch(tabSource, /name="canUseVoice"/u);
  assert.doesNotMatch(tabSource, /name="availability" value="backup"/u);
  assert.match(cssSource, /\.boh-catalog-disclosure > summary:focus-visible/u);
  assert.match(cssSource, /\.boh-catalog-list\s*\{[\s\S]*?overflow:\s*auto/u);
  assert.match(cssSource, /\.boh-research-row\s*\{[\s\S]*?minmax\(9rem, 1fr\)/u);
  assert.match(
    cssSource,
    /@media \(max-width: 620px\)[\s\S]*?\.boh-catalog-filters,[\s\S]*?\.boh-catalog-list\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/u
  );
});

test('Epic Showdown planning uses accessible independent multi-select lane and time controls', () => {
  assert.match(
    tabSource,
    /name="epicGameName"[\s\S]*?maxlength="160"[\s\S]*?required[\s\S]*?aria-describedby="bohShowdownGameNameHint"/
  );
  for (const lane of ['south', 'center', 'north']) {
    assert.match(
      tabSource,
      new RegExp(`type="checkbox" name="epicLanePreferences" value="${lane}"`)
    );
  }
  assert.match(tabSource, /data-role="showdown-time-options"/);
  assert.match(tabSource, /aria-describedby="bohShowdownTimeHint"/);
  assert.match(tabSource, /data-role="showdown-form"/);
  assert.match(tabSource, /data-role="showdown-submit"/);
  assert.match(tabSource, /data-role="showdown-save-state"[\s\S]*?aria-live="polite"/);
  assert.match(tabSource, /data-role="showdown-summary"[\s\S]*?aria-live="polite"/);
  assert.match(cssSource, /\.boh-subnav__track\s*\{[\s\S]*?repeat\(4,/);
  assert.match(cssSource, /\.boh-showdown-option:has\(input:focus-visible\)/);
});

test('announcement and plan surfaces retain explicit protected publication states', () => {
  for (const state of ['locked', 'unpublished', 'unassigned', 'assigned']) {
    assert.match(tabSource, new RegExp(`data-role="announcement-state-${state}"`));
  }
  for (const state of ['locked', 'unpublished', 'unassigned', 'published']) {
    assert.match(tabSource, new RegExp(`data-role="plan-state-${state}"`));
  }
  assert.equal(
    (tabSource.match(/data-role="unlock-request"/g) || []).length,
    3,
    'every private result or preference area must expose the member unlock action'
  );
  assert.match(
    tabSource,
    /Enter the current VTS member PIN before viewing private roster information/
  );
});

test('team announcement encodes six 12-player rosters without embedding real player names', () => {
  const teamIds = Array.from(
    tabSource.matchAll(/data-team-id="(team-[1-6])"/g),
    (match) => match[1]
  );
  assert.deepEqual(teamIds, ['team-1', 'team-2', 'team-3', 'team-4', 'team-5', 'team-6']);

  const seatIds = Array.from(tabSource.matchAll(/<li data-seat="(\d+)">/g), (match) =>
    Number(match[1])
  );
  assert.deepEqual(
    seatIds,
    Array.from({ length: 12 }, (_, index) => index + 1)
  );
  assert.match(tabSource, /6 TEAMS &middot; 72 PLAYERS/);
  assert.match(tabSource, /data-boh-i18n="announcement\.twelvePlayers">12 PLAYERS/);
  assert.match(tabSource, /data-role="team-overview-detail"/);
  assert.match(
    tabSource,
    /id="bohTeamOverviewDetail"[\s\S]*?data-role="team-overview-detail"[\s\S]*?aria-live="polite"/
  );

  const legacyNames = [
    'GoodnessGraycious',
    'Dizz.',
    '#MAKAY#',
    'Roman',
    'MalakaKiji',
    'Rohannis',
    'Maximus',
    'kassey',
    'RAKI',
    'Whitefyre',
    'Tazz',
    'Jasper99',
    'BiG BOIIE',
    'Neutrino10',
    'BabyKiji',
    'MalakAbo',
    'Sarafino',
    'Kratosk',
    'Adamant',
    'Dragon Master',
    'Peaceful Warrior',
    'Lord HtwoO',
    'RuCCaK',
    'Cold Heart',
    'MalikaZena',
    'Salazar',
    'Lord IKR',
    'Ligmaballs',
    'Fernando',
  ];
  const normalizedTemplate = tabSource.toLocaleLowerCase('en');
  for (const name of legacyNames) {
    assert.equal(
      normalizedTemplate.includes(name.toLocaleLowerCase('en')),
      false,
      `legacy player name must remain runtime data: ${name}`
    );
  }
});

test('personal plans expose both Legions, all four phases, and an accessible text map equivalent', () => {
  assert.match(tabSource, /name="bohLegion" value="legion-1" id="bohLegion1" checked/);
  assert.match(tabSource, /name="bohLegion" value="legion-2" id="bohLegion2"/);
  assert.match(tabSource, /for="bohLegion1" data-boh-i18n="plan\.legion1">Legion 1/);
  assert.match(tabSource, /for="bohLegion2" data-boh-i18n="plan\.legion2">Legion 2/);

  const ranges = ['0&ndash;5', '5&ndash;10', '10&ndash;15', '15&ndash;30'];
  for (let index = 0; index < 4; index += 1) {
    const tabId = `bohPhase${index}Tab`;
    const panelId = `bohPhase${index}Panel`;
    const phaseTab = openingTagById(tabSource, tabId);
    const phasePanel = openingTagById(tabSource, panelId);
    assert.match(phaseTab, /role="tab"/);
    assert.match(phaseTab, new RegExp(`aria-controls="${panelId}"`));
    assert.match(phaseTab, new RegExp(`data-phase-id="phase-${index}"`));
    assert.match(phasePanel, /role="tabpanel"/);
    assert.match(phasePanel, new RegExp(`aria-labelledby="${tabId}"`));
    assert.match(phasePanel, new RegExp(`data-phase-id="phase-${index}"`));
    assert.ok(
      tabSource.includes(`<strong>${ranges[index]}</strong`),
      `Missing ${ranges[index]} phase`
    );
  }

  assert.match(tabSource, /data-role="current-instruction"/);
  assert.match(tabSource, /data-role="next-instruction"/);
  assert.match(tabSource, /data-role="personal-map"/);
  assert.match(
    tabSource,
    /<svg[\s\S]*?role="img"[\s\S]*?aria-labelledby="bohMapSvgTitle bohMapSvgDesc"/
  );
  assert.match(tabSource, /<title id="bohMapSvgTitle"/);
  assert.match(tabSource, /<desc id="bohMapSvgDesc"/);
  assert.match(tabSource, /data-role="map-objectives"/);
  assert.doesNotMatch(
    tabSource,
    /data-objective-id=/,
    'objective nodes must be rendered only from the published plan'
  );
  assert.match(tabSource, /data-role="personal-route-text"/);
  assert.match(tabSource, /data-role="route-start"/);
  assert.match(tabSource, /data-role="route-via"/);
  assert.match(tabSource, /data-role="route-target"/);
});

test('the lazy template is CSP-friendly and its CSS covers mobile, RTL, and reduced motion', () => {
  assert.doesNotMatch(tabSource, /<script\b/i);
  assert.doesNotMatch(tabSource, /<[^>]+\son[a-z]+\s*=/i);

  assert.match(cssSource, /\[dir='rtl'\] \.boh-hub\s*\{[\s\S]*?direction:\s*rtl/);
  assert.match(cssSource, /\[dir='rtl'\] \.boh-plan-updated\s*\{[\s\S]*?text-align:\s*start/);
  assert.match(cssSource, /@media \(max-width: 820px\)/);
  assert.match(cssSource, /@media \(max-width: 620px\)/);
  assert.match(
    cssSource,
    /@media \(max-width: 620px\)[\s\S]*?\.boh-subnav\s*\{[\s\S]*?overflow-x:\s*auto/
  );
  assert.match(
    cssSource,
    /@media \(max-width: 620px\)[\s\S]*?\.boh-phase-tabs\s*\{[\s\S]*?overflow-x:\s*auto/
  );
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(
    cssSource,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration:\s*0\.01ms !important/
  );
  assert.match(
    cssSource,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation-duration:\s*0\.01ms !important/
  );
});
