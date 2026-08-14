import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { techDatabase } from '../../js/tech-db.js';

const indexSource = readFileSync('index.html', 'utf8');
const tabSource = readFileSync('tabs/all-star-boh.html', 'utf8');
const cssSource = readFileSync('css/all-star-boh.css', 'utf8');
const appSource = readFileSync('js/app.js', 'utf8');
const bootstrapSource = readFileSync('js/all-star-boh-bootstrap.js', 'utf8');
const controllerSource = readFileSync('js/all-star-boh.js', 'utf8');
const allStarI18nSource = readFileSync('js/i18n/all-star-boh/index.js', 'utf8');
const adminBohSource = readFileSync('js/admin-all-star-boh.js', 'utf8');
const rulesSource = readFileSync('firestore.rules', 'utf8');
const stateSource = readFileSync('js/state.js', 'utf8');
const shellSource = readFileSync('js/shell-v14.js', 'utf8');
const commandPaletteSource = readFileSync('js/command-palette.js', 'utf8');

test('RoC specialization level uses the in-game 160 maximum across UI and rules', () => {
  assert.match(tabSource, /name="rocLevel"[\s\S]{0,160}max="160"/u);
  assert.match(controllerSource, /label: 'RoC level',[\s\S]{0,100}maximum: 160/u);
  assert.match(rulesSource, /stats\.rocLevel <= 160/u);
});

test('failed signup writes preserve the filled form and do not masquerade as PIN expiry', () => {
  assert.match(bootstrapSource, /if \(error\?\.code === 'access_expired'\)/);
  assert.doesNotMatch(
    bootstrapSource,
    /error\?\.code === 'access_expired' \|\| error\?\.code === 'permission-denied'/
  );
  assert.match(controllerSource, /let preserveFormOnFailure = false/);
  assert.match(controllerSource, /preserveFormOnFailure = true/);
  assert.match(controllerSource, /if \(preserveFormOnFailure\) renderSubmissionControls\(state\)/);
});

test('successful signup writes open an accessible revision confirmation dialog', () => {
  assert.match(tabSource, /<dialog[\s\S]*data-role="submission-confirmation"/);
  assert.match(tabSource, /aria-labelledby="bohSubmissionConfirmationTitle"/);
  assert.match(tabSource, /aria-describedby="bohSubmissionConfirmationDescription"/);
  assert.match(controllerSource, /function showSubmissionConfirmation/);
  assert.match(controllerSource, /edited: expectedRevision > 0/);
  assert.match(
    controllerSource,
    /if \(saved\) state\.submission = saved;\s*setSignupFormError\(state\)/
  );
  assert.match(controllerSource, /if \(confirmation\) showSubmissionConfirmation/);
  assert.match(cssSource, /\.boh-confirmation-dialog::backdrop/);
  assert.match(cssSource, /\.boh-confirmation-dialog \{[\s\S]*?z-index: 2147483000/);
});

test('member plan includes accessible schedule rail and projected battlefield map sockets', () => {
  assert.match(tabSource, /data-role="event-schedule"/);
  assert.match(tabSource, /data-role="schedule-rail"/);
  assert.match(tabSource, /data-role="schedule-team-times"/);
  assert.match(controllerSource, /subscribeEventSchedule/);
  assert.match(controllerSource, /getEventSchedule/);
  assert.match(controllerSource, /instruction\?\.standby === true/);
  assert.match(controllerSource, /instruction\?\.gatherCrystals === true/);
  assert.match(tabSource, /viewBox="0 0 972 507"/);
  assert.match(tabSource, /data-role="map-image"/);
  assert.match(tabSource, /data-role="map-network"/);
  assert.match(tabSource, /data-role="map-objective-detail"/);
  assert.match(controllerSource, /BohField\.bohStage1Objectives/);
  assert.match(
    controllerSource,
    /BohField\.bohStage1TerritoryNetwork\(BohField\.BOH_STAGE1_DEFAULT_SIDE\)/
  );
  assert.match(controllerSource, /data-role': 'map-objective'/);
  assert.match(controllerSource, /class: 'boh-map__flag-cloth'/);
  assert.match(controllerSource, /class: 'boh-map__flag-pole'/);
  // 72x76 user units keeps the touch target above 44 CSS px even at the 390px
  // mobile projection scale (~0.63 CSS px per unit), measured in-browser.
  assert.match(controllerSource, /class: 'boh-map__objective-hit'[\s\S]*?width: 72/);
  assert.match(controllerSource, /class: 'boh-map__objective-hit'[\s\S]*?height: 76/);
  assert.match(
    controllerSource,
    /BohField\.bohStructureLabel\(structure, BohField\.BOH_STAGE1_DEFAULT_SIDE\)/
  );
  assert.match(controllerSource, /`\$\{fieldStructure\.x\}:\$\{fieldStructure\.y\}`/);
  assert.match(controllerSource, /No personal assignment at this structure in your current plan\./);
  assert.doesNotMatch(controllerSource, /Current phase assignments/);
  assert.doesNotMatch(
    controllerSource,
    /No assigned player for this objective in your current phase\./
  );
  assert.doesNotMatch(
    controllerSource,
    /createSvgElement\(state\.root,\s*'circle',\s*\{[^}]*\}\)/,
    'objectives must use planted flags instead of circular pins'
  );
  assert.match(controllerSource, /selectedObjectiveId/);
  assert.match(controllerSource, /selectedMilestoneIsManual/);
  assert.match(cssSource, /\.boh-map__territory-square/);
  assert.match(cssSource, /\.boh-map__objective:focus-visible \.boh-map__objective-hit/);
  assert.match(cssSource, /\.boh-map-selection/);
  assert.match(cssSource, /\.boh-schedule-rail/);
});

test('commitment questions have generous vertical separation', () => {
  assert.match(tabSource, /class="boh-card boh-commitment-card"/);
  assert.match(
    cssSource,
    /\.boh-commitment-card\s*>\s*:is\([^)]*\.boh-fieldset[^)]*\.boh-field[^)]*\)\s*\{\s*margin-top:\s*clamp\(1\.5rem, 2vw, 2rem\)/s
  );
});

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
  assert.match(appSource, /function resolveTabName\(rawTabName, validTabNames\)/);
  assert.match(appSource, /name\.toLowerCase\(\) === normalized/);
  assert.match(appSource, /\{ btn: tabAllStarBohBtn, name: 'allStarBoh' \}/);

  const lazyBlock = appSource.match(
    /if \(tabName === 'allStarBoh'[\s\S]*?\n\s*}\n\s*\/\/ Legacy: Eden Loyalty/
  )?.[0];
  assert.ok(lazyBlock, 'Missing the All-Star BoH lazy bootstrap block');
  const templateIndex = lazyBlock.indexOf("loadTabTemplate('allStarBoh')");
  const importIndex = lazyBlock.indexOf("import('./all-star-boh-bootstrap.js')");
  const bootIndex = lazyBlock.indexOf('module?.bootAllStarBohTab()');
  assert.ok(templateIndex >= 0, 'the tab template must be loaded');
  assert.ok(templateIndex < importIndex, 'the protected bootstrap loads only after the template');
  assert.ok(importIndex < bootIndex, 'the lazy module must be imported before its boot hook runs');

  assert.match(shellSource, /\['tabAllStarBoh', 'allStarBoh'\]/);
  assert.match(
    commandPaletteSource,
    /key:\s*'tabAllStarBoh'[\s\S]*?name:\s*'allStarBoh'[\s\S]*?kind:\s*'tab'/
  );
});

test('the three player subsections have bidirectional tab and tabpanel ARIA links', () => {
  const sections = [
    ['bohSignupTab', 'bohSignupPanel', 'signup'],
    ['bohAnnouncementTab', 'bohAnnouncementPanel', 'announcement'],
    ['bohPlanTab', 'bohPlanPanel', 'plan'],
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
  assert.doesNotMatch(tabSource, /data-role="ocr-review-confirmation"/);
  assert.doesNotMatch(tabSource, /data-role="ocr-values-confirmed"/);
  assert.match(tabSource, /id="bohPrivacyTitle" data-boh-i18n="signup\.privacyTitle"/);
  assert.match(tabSource, /data-boh-i18n="signup\.privacyDescription"/);
  assert.match(tabSource, /third-party AI service only to read the\s+visible numbers/);
  assert.match(tabSource, /extracted power values are placed directly into the fields below/);
  assert.match(tabSource, /Edit any incorrect or missing number before submitting/);
  assert.doesNotMatch(tabSource, /data-role="field-timezone"/);
  assert.match(tabSource, /<input type="hidden" name="timezone" value="" \/>/);
  assert.match(tabSource, /data-role="ocr-field-issue"/);
  assert.match(tabSource, /aria-describedby="bohPowerHelp bohOcrIssue-totalCastlePower"/);
  assert.match(tabSource, /id="bohDeviceIdentityTitle"/);
  assert.match(tabSource, /data-boh-i18n="signup\.deviceIdentityDescription"/);
  assert.match(tabSource, /submit again using the exact same in-game name/);
  assert.match(tabSource, /contact R5 to merge or confirm the entries/);
  assert.match(tabSource, /id="bohAccountNoteTitle"/);
  assert.match(tabSource, /data-boh-i18n="signup\.accountNoteDescription"/);
  assert.match(
    tabSource,
    /Use a different browser, private\/incognito window, or a\s+different device/
  );
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
  assert.match(controllerSource, /art\.dataset\.verifiedResearchArt/u);
  assert.match(cssSource, /\.boh-research-row__art\s*\{/u);

  const fightingTimes = Array.from(
    tabSource.matchAll(/name="fightingTimeIds" value="([^"]+)"/gu),
    (match) => match[1]
  );
  assert.deepEqual(fightingTimes, ['+12', '+14', '+16']);
  assert.match(tabSource, /data-role="fighting-times-count"[^>]*role="status"/u);
  assert.match(tabSource, /data-role="fighting-times-error"[^>]*role="alert"/u);
  assert.match(controllerSource, /Only two fighting times can be selected/u);
  assert.match(
    controllerSource,
    /const FIGHTING_TIME_IDS = Object\.freeze\(\['\+12', '\+14', '\+16'\]\)/u
  );

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

test('optional troop estimates reuse troopRoster and hydrate for edits and admin review', () => {
  for (const field of [
    'troopEstimateLofty',
    'troopEstimateEnhancedT10',
    'troopEstimateT10',
    'troopEstimateT9',
  ]) {
    assert.match(tabSource, new RegExp(`name="${field}"`));
  }
  assert.match(tabSource, /if you have 7,000,000 troops, enter 7/iu);
  assert.match(controllerSource, /Math\.round\(millions \* 1_000_000\)/u);
  assert.match(controllerSource, /`estimate\|\$\{key\}\|\$\{count\}`/u);
  assert.match(controllerSource, /function troopEstimateTotals\(roster\)/u);
  assert.match(controllerSource, /updateInput\(form, field, count \?/u);
  assert.match(controllerSource, /stats\.troopRoster = troopEstimateRoster\(source\)/u);
  assert.doesNotMatch(rulesSource, /troopEstimate(?:Lofty|EnhancedT10|T10|T9)/u);
  assert.match(rulesSource, /'troopRoster'/u);
  assert.match(adminBohSource, /estimate\\\|\(lofty\|enhanced-t10\|t10\|t9\)/u);
});

test('Epic Showdown planning is included before the single combined signup action', () => {
  assert.doesNotMatch(tabSource, /id="bohShowdownTab"/);
  assert.match(tabSource, /data-role="signup-addon"/);
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
  assert.doesNotMatch(tabSource, /data-role="showdown-submit"/);
  assert.equal(Array.from(tabSource.matchAll(/data-role="signup-submit"/gu)).length, 1);
  assert.match(tabSource, /data-boh-i18n="signup\.submitAll"/);
  assert.match(tabSource, /data-role="showdown-save-state"[\s\S]*?aria-live="polite"/);
  assert.match(tabSource, /data-role="showdown-summary"[\s\S]*?aria-live="polite"/);
  assert.equal(Array.from(tabSource.matchAll(/name="epicFlexibilityPreference"/gu)).length, 3);
  assert.match(controllerSource, /'\+6',[\s\S]*?'\+20'/);
  assert.match(controllerSource, /function submitCombinedParticipation/);
  assert.match(
    controllerSource,
    /const signupSaved = await submitSignup\(state, signupForm\);[\s\S]*?if \(!signupSaved\) return;[\s\S]*?if \(state\.epicDirty\) \{[\s\S]*?await submitEpicPreferences\(state, showdownForm\)/
  );
  assert.doesNotMatch(
    controllerSource,
    /if \(state\.epicDirty\) \{[\s\S]*?submitEpicPreferences[\s\S]*?await submitSignup/
  );
  assert.match(
    controllerSource,
    /updateChecked\([\s\S]*?'epicFlexibilityPreference',[\s\S]*?flexibilityPreference/
  );
  assert.match(cssSource, /\.boh-subnav__track\s*\{[\s\S]*?repeat\(3,/);
  assert.match(cssSource, /\.boh-showdown-option:has\(input:focus-visible\)/);
});

test('Unit Specialty Power is visibly marked as required', () => {
  assert.match(
    tabSource,
    /data-boh-i18n="signup\.unitSpecialtyPower">Unit Specialty Power<\/span>[\s\S]*?<b aria-hidden="true">\*<\/b>[\s\S]*?name="unitSpecialtyPower"[\s\S]*?required/u
  );
  assert.doesNotMatch(tabSource, /class="boh-required"/u);
});

test('permission failures show a translated recovery step for both signup writes', () => {
  assert.match(controllerSource, /function isPermissionDeniedError\(error\)/u);
  assert.match(controllerSource, /error\?\.code === 'permission-denied'/u);
  assert.match(controllerSource, /insufficient permissions/iu);
  assert.match(controllerSource, /function permissionDeniedMessage\(state\)/u);
  assert.match(controllerSource, /'signup\.permissionDeniedError'/u);
  assert.match(
    controllerSource,
    /setSignupFormError\([\s\S]*?isPermissionDeniedError\(error\)[\s\S]*?permissionDeniedMessage\(state\)/u
  );
  assert.match(
    controllerSource,
    /action: 'save-epic-preferences'[\s\S]*?if \(isPermissionDeniedError\(error\)\)[\s\S]*?notice\([\s\S]*?state,[\s\S]*?'signup\.permissionDeniedError'/u
  );
});

test('participation choice supports an Epic-only path and mirrors the signup name', () => {
  assert.match(tabSource, /name="participationMode" value="allstar" checked/u);
  assert.match(tabSource, /name="participationMode" value="epic-only"/u);
  assert.match(controllerSource, /state\.participationMode === 'epic-only'/u);
  assert.match(
    controllerSource,
    /event\.target\?\.matches\?\.\('\[name="gameName"\]'\)[\s\S]*?!state\.epicNameTouched[\s\S]*?'epicGameName'/u
  );
  assert.match(controllerSource, /event\.target\?\.matches\?\.\('\[name="epicGameName"\]'\)/u);
});

test('non-VTS applicants provide required contact, state, and reason fields', () => {
  assert.match(tabSource, /name="vts1097Member" value="yes" required/u);
  assert.match(tabSource, /name="vts1097Member" value="no" required/u);
  for (const field of ['contactNumber', 'currentState', 'joinReason']) {
    assert.match(tabSource, new RegExp(`name="${field}"`));
    assert.match(controllerSource, new RegExp(`formValue\\(source, '${field}'\\)`));
    assert.match(rulesSource, new RegExp(`commitment\\.${field}`));
  }
  assert.match(rulesSource, /commitment\.vts1097Member is bool/u);
  assert.doesNotMatch(rulesSource, /commitment\.contactNumber\.size\(\) > 0/u);
});

test('hero season filter exposes only the requested cumulative milestones', () => {
  assert.match(
    controllerSource,
    /HERO_SEASON_MILESTONES\s*=\s*Object\.freeze\(\['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8'\]\)/
  );
  assert.doesNotMatch(tabSource, /data-boh-i18n="signup\.heroAllSeasons"/);
  assert.match(controllerSource, /\[data-role="hero-season-filter"\]'\)\?\.value \|\| 'X1'/u);
  assert.match(controllerSource, /currentSeason = seasonFilter\?\.value \|\| 'X1'/u);
});

test('research defaults to X1 and offers one Max all action per season', () => {
  assert.match(tabSource, /data-role="research-season-filter"/u);
  assert.match(tabSource, /<option value="X1" selected>X1<\/option>/u);
  assert.match(controllerSource, /group\.dataset\.role = 'research-season-group'/u);
  assert.match(controllerSource, /maxAll\.dataset\.role = 'research-season-max'/u);
  assert.match(controllerSource, /input\.value = '100'/u);
  assert.match(
    controllerSource,
    /group\.hidden = selectedRank !== null && groupRank !== null && groupRank > selectedRank/u
  );
  assert.match(cssSource, /\.boh-research-season__max\s*\{/u);
  assert.match(controllerSource, /const orderedSeasons = \[\.\.\.seasons\.entries\(\)\]\.sort/u);
  assert.deepEqual(
    techDatabase.filter(({ season }) => season === 'S1').map(({ name }) => name),
    ['Advanced Soldier Training']
  );
  assert.deepEqual(
    techDatabase.filter(({ season }) => season === 'X1').map(({ name }) => name),
    ['Art of War - Command', 'Solid Tactics']
  );
});

test('screenshot OCR uses a generation-safe, phase-rendered single flight', () => {
  const processStart = controllerSource.indexOf('async function processOcr(state)');
  const processEnd = controllerSource.indexOf('\nfunction syncOcrReviewFromForm', processStart);
  const processSource = controllerSource.slice(processStart, processEnd);

  assert.match(tabSource, /<progress[\s\S]*?data-role="ocr-progress"[\s\S]*?hidden/u);
  assert.match(controllerSource, /ocrGeneration: 0,[\s\S]*?ocrPhase: 'idle'/u);
  assert.match(
    processSource,
    /^async function processOcr\(state\) \{\s+if \(state\.ocrBusy\) return;/u
  );
  assert.match(
    processSource,
    /const file = state\.ocrFile;\s+const generation = state\.ocrGeneration;/u
  );
  assert.match(controllerSource, /state\.ocrGeneration \+= 1;/u);
  assert.equal(
    Array.from(controllerSource.matchAll(/state\.ocrGeneration \+= 1;/gu)).length,
    2,
    'selection and clearing must each invalidate older OCR requests'
  );
  assert.match(
    controllerSource,
    /return state\.ocrGeneration === generation && state\.ocrFile === file;/u
  );
  assert.match(processSource, /if \(!isCurrentOcrRequest\(state, file, generation\)\) return;/u);
  assert.match(processSource, /state\.ocrPhase = 'processing';/u);
  assert.match(processSource, /state\.ocrPhase = 'ready';/u);
  assert.match(
    processSource,
    /catch \(error\) \{\s+if \(!isCurrentOcrRequest\(state, file, generation\)\) return;\s+state\.ocrPhase = 'error';\s+throw error;/u
  );
  assert.match(controllerSource, /const isProcessing = state\.ocrPhase === 'processing';/u);
  assert.match(controllerSource, /setHidden\(progress, !isProcessing\)/u);
  assert.match(controllerSource, /setBusy\(process, state\.ocrBusy \|\| !state\.ocrFile\)/u);
  assert.match(controllerSource, /setText\(status, statusText \|\| ''\)/u);
  assert.equal(
    Array.from(controllerSource.matchAll(/\[data-role="ocr-status"\]/gu)).length,
    1,
    'only renderOcr may own OCR status output'
  );
  assert.doesNotMatch(processSource, /scrollIntoView/u);
  assert.match(
    allStarI18nSource,
    /Reading screenshot—keep this page open\. You may continue filling the form\./u
  );
  assert.match(allStarI18nSource, /Power values filled automatically\. Review the fields below\./u);
  assert.match(
    allStarI18nSource,
    /'signup\.ocrError':[\s\S]*?Screenshot reading failed\. Retry, or enter or correct the values manually—you can still save your update\./u
  );
  assert.match(cssSource, /\.boh-ocr-progress\s*\{/u);
});

test('signup asks explicitly whether the player can help lead or manage', () => {
  assert.match(tabSource, /data-role="leadership-interest-fieldset"/);
  assert.match(tabSource, /name="leadershipInterest" value="yes" required/);
  assert.match(tabSource, /name="leadershipInterest" value="no" required/);
});

test('specialty power is required and failed submission explains and focuses the first field', () => {
  assert.match(
    tabSource,
    /name="unitSpecialtyPower"[\s\S]*?required[\s\S]*?data-stat="unitSpecialtyPower"/
  );
  assert.match(tabSource, /data-role="signup-form-error"[\s\S]*?aria-live="assertive"/);
  assert.match(controllerSource, /form\.reportValidity\(\)/);
  assert.match(controllerSource, /firstInvalid\?\.focus\?\.\(\{/);
  assert.match(controllerSource, /firstInvalid\?\.scrollIntoView\?\.\(/);
});

test('signup includes six independently selectable animal team concepts with generated emblems', () => {
  assert.equal(Array.from(tabSource.matchAll(/name="teamNamePreferences"/gu)).length, 6);
  for (const id of [
    'iron-wolves',
    'storm-ravens',
    'ember-lions',
    'frost-bears',
    'night-falcons',
    'thunder-bulls',
  ]) {
    assert.match(tabSource, new RegExp(`value="${id}"`));
  }
  assert.match(cssSource, /url\('\/images\/boh-team-emblems\.webp'\)/);
  assert.match(controllerSource, /teamNamePreferences/);
});

test('authenticated hub offers a safe manual lock action', () => {
  assert.match(tabSource, /data-role="lock-hub"/);
  assert.match(controllerSource, /onLockHub/);
});

test('submitted members can explicitly return to their hydrated signup for edits', () => {
  assert.match(tabSource, /data-role="edit-signup"/);
  assert.match(controllerSource, /target\.matches\?\.\('\[data-role="edit-signup"\]'\)/);
  assert.match(controllerSource, /form\?\.scrollIntoView/);
});

test('T10 readiness maps the supplied portraits to cavalry, archers, and footmen', () => {
  assert.match(controllerSource, /const ALL_STAR_ICON_SPRITE =\s*'data:image\/webp;base64,/);
  assert.match(controllerSource, /root\.style\?\.setProperty\?\.\('--boh-all-star-icon-sprite'/);
  assert.match(cssSource, /background-image: var\(--boh-all-star-icon-sprite\)/);
  for (const troopType of ['cavalry', 'archers', 'footmen']) {
    assert.match(
      tabSource,
      new RegExp(`value="${troopType}"[\\s\\S]*?boh-t10-type-icon--${troopType}`)
    );
  }
  assert.match(cssSource, /\.boh-t10-type-icons\s*\{[\s\S]*?gap:\s*0\.25rem/u);
  assert.match(
    cssSource,
    /\.boh-t10-type-icons \.boh-t10-type-icon \+ \.boh-t10-type-icon\s*\{\s*margin-inline-start:\s*0/u
  );
});

test('mobile sticky actions are limited to the final signup footer', () => {
  assert.match(tabSource, /<div class="boh-form-actions boh-form-actions--inline">/u);
  assert.match(tabSource, /<footer class="boh-form-actions">/u);
  assert.match(
    cssSource,
    /@media \(max-width: 620px\)[\s\S]*?footer\.boh-form-actions\s*\{[\s\S]*?position:\s*sticky/u
  );
  assert.doesNotMatch(
    cssSource,
    /@media \(max-width: 620px\)[\s\S]*?\n\s{2}\.boh-form-actions\s*\{[\s\S]*?position:\s*sticky/u
  );
});

test('all 29 verified S0 through X8 research trees use exact cropped in-game icons', () => {
  const artMap = controllerSource.match(
    /const VERIFIED_RESEARCH_ART = Object\.freeze\(\{([\s\S]*?)\}\);/u
  )?.[1];
  assert.ok(artMap);
  assert.equal(Array.from(artMap.matchAll(/^\s+'[^']+': \d+,?$/gmu)).length, 29);
  for (let index = 3; index <= 31; index += 1) {
    assert.match(artMap, new RegExp(`: ${index},`));
  }
  assert.match(artMap, /'dragon blood blessing': 30/);
  assert.match(artMap, /'lofty legion': 31/);
  assert.match(controllerSource, /--boh-research-art-column/);
  assert.match(controllerSource, /--boh-research-art-row/);
  assert.match(cssSource, /background-size: 13\.8rem 13\.8rem/);
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

test('personal plans seed accessible phase sockets and expand the published timeline dynamically', () => {
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

  assert.match(controllerSource, /function ensureTimelinePhaseSockets\(state, count\)/);
  assert.match(controllerSource, /index < count/);
  assert.match(controllerSource, /aria-controls', panelId/);
  assert.match(controllerSource, /aria-labelledby', tabId/);
  assert.match(
    controllerSource,
    /state\.tr\('plan\.timelineTitleDynamic', 'Your \{count\} phases'/
  );

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
  assert.match(cssSource, /\.boh-map-wrap\s*\{[\s\S]*?overflow:\s*auto/);
  assert.match(cssSource, /\.boh-map-wrap\s*\{[\s\S]*?touch-action:\s*pan-x pan-y/);
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

test('published plans expose mapper orders, team plan, and map briefing as one command workspace', () => {
  for (const mode of ['my-orders', 'team-plan', 'map-briefing']) {
    assert.match(tabSource, new RegExp(`data-command-mode="${mode}"`));
  }
  assert.match(tabSource, /data-role="command-roster"/);
  assert.ok((tabSource.match(/data-role="command-phase-tab"/g) || []).length > 0);
  assert.match(controllerSource, /index < view\.phases\.length/);
  assert.match(controllerSource, /tab\.dataset\.role = 'command-phase-tab'/);
  assert.match(controllerSource, /const phase = view\.phases\[index\]/);
  assert.match(tabSource, /data-role="command-role-lanes"/);
  assert.match(tabSource, /data-role="command-map-list"/);
  assert.match(tabSource, /src="assets\/boh\/stage1-map\.webp"/);
  assert.match(cssSource, /\.boh-command-roster[\s\S]*?overflow-x:\s*auto/);
  assert.match(cssSource, /@media \(max-width: 390px\)[\s\S]*?\.boh-command-context/);
});
