import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const adminPage = readFileSync('admin.html', 'utf8');
const adminTab = readFileSync('tabs/admin.html', 'utf8');
const adminModule = readFileSync('js/admin-all-star-boh.js', 'utf8');
const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

test('Admin VTS places the lazy All-Star BoH tab between Alliance View and Eden votes', () => {
  const allianceTab = adminTab.indexOf('data-subtab="allianceView"');
  const allStarTab = adminTab.indexOf('data-subtab="allStarBoh"');
  const edenVotesTab = adminTab.indexOf('data-subtab="edenVotes"');

  assert.ok(allianceTab >= 0, 'Alliance View tab should exist');
  assert.ok(allStarTab > allianceTab, 'All-Star BoH should follow Alliance View');
  assert.ok(edenVotesTab > allStarTab, 'All-Star BoH should precede Eden X1 Votes');
  assert.match(adminTab, /id="dashSubtabAllStarBoh"[\s\S]*?id="dashAllStarBohRoot"/);
  assert.match(adminTab, /data-i18n="adminBohTab">All-Star BoH</);
  assert.doesNotMatch(adminPage, /href="css\/admin-all-star-boh\.css(?:\?[^"\s]+)?"/);
  assert.match(dashboard, /import\('\.\.\/css\/admin-all-star-boh\.css'\)/);
});

test('Admin VTS loads the All-Star modules only when their tab renders', () => {
  assert.doesNotMatch(
    dashboard,
    /^import\s+[\s\S]*?from\s+['"]\.\/(?:admin-)?all-star-boh[^'"]*['"]/m
  );
  assert.match(dashboard, /let allStarBohModulePromise = null;/);
  assert.match(dashboard, /let allStarBohMountPromise = null;/);
  assert.match(dashboard, /let allStarBohController = null;/);
  assert.match(
    dashboard,
    /if \(name === 'allStarBoh'\) void ensureAllStarBohMountedOrUpdated\(\);/
  );
  assert.match(
    dashboard,
    /Promise\.all\(\[[\s\S]*?import\('\.\/admin-all-star-boh\.js'\)[\s\S]*?import\('\.\/all-star-boh-store\.js'\)[\s\S]*?import\('\.\/i18n\/admin-all-star-boh\/index\.js'\)[\s\S]*?import\('\.\.\/css\/admin-all-star-boh\.css'\)[\s\S]*?\]\)/
  );
  assert.match(dashboard, /adminModule\.initializeAdminAllStarBoh\(/);
});

test('Admin All-Star mount injects the verified admin context and authoritative BoH season', () => {
  assert.match(dashboard, /await window\.getVtsAdminFirestoreContext\(\)/);
  assert.match(dashboard, /const uid = String\(context\?\.user\?\.uid \|\| ''\)\.trim\(\);/);
  assert.match(dashboard, /tokenResult\?\.claims\?\.admin === true/);
  assert.match(
    dashboard,
    /storeModule\.getAllStarBohActiveConfig\(\{[\s\S]*?db: context\.db,[\s\S]*?firestore: context\.firestore,[\s\S]*?\}\)/
  );
  assert.match(dashboard, /seasonId: config\.activeSeason/);
  const optionsLoader = dashboard.match(
    /async function getAllStarBohAdminStoreOptions[\s\S]*?\n\}/
  )?.[0];
  assert.ok(optionsLoader, 'All-Star admin store options loader should exist');
  assert.doesNotMatch(optionsLoader, /currentEdenVoteSeason/);
  assert.match(
    dashboard,
    /storeModule\.createAllStarBohAdminStore\(\{\s*\.\.\.\(await getAllStarBohAdminStoreOptions\(storeModule\)\),[\s\S]*?heroNames:[\s\S]*?researchTreeIds:[\s\S]*?\}\)/
  );
  assert.match(dashboard, /heroMetadata:\s*heroModule\.allHeroesData \|\| \[\]/);
  assert.match(
    dashboard,
    /researchMetadata:\s*\(\) =>[\s\S]*?researchI18nModule\.researchTreeText/
  );
  assert.match(
    dashboard,
    /adminModule\.createAdminAllStarBohStoreAdapter\(adminStore,[\s\S]*?ALL-STAR BOH ADMIN LIVE REFRESH ERROR/
  );
  assert.match(
    dashboard,
    /validatePublication:\s*adminModule\.validateAdminAllStarBohPublicationBundle/
  );
  assert.match(
    dashboard,
    /paidUsableHeroNames:\s*\(heroModule\.allHeroesData \|\| \[\]\)[\s\S]*?\.filter\(\(hero\) => hero\.State === 'Paid'\)[\s\S]*?\.map\(\(hero\) => hero\.name\)/
  );
});

test('Admin scoring builder registers every new component with a zero default', () => {
  const rows = [
    ['unitSpecialtyPower', 'adminBohScoreUnitSpecialtyPower', 'Unit specialty power'],
    ['rocLevel', 'adminBohScoreRocLevel', 'RoC level'],
    ['paidUsableHero', 'adminBohScorePaidUsableHero', 'Each paid usable hero'],
    [
      'loftyTroopMillion',
      'adminBohScoreLoftyTroopMillion',
      'S (Lofty) troops — points per 1 million',
    ],
    [
      'enhancedT10TroopMillion',
      'adminBohScoreEnhancedT10TroopMillion',
      'Enhanced T10 troops — points per 1 million',
    ],
  ];
  for (const [key, translationKey, label] of rows) {
    const tuple = new RegExp(
      `'${key}',\\s*'${translationKey}',\\s*'${label.replace(/[()]/g, '\\$&')}',\\s*0`,
      'u'
    );
    assert.match(adminModule, tuple);
  }
  assert.match(adminModule, /SCORE_COMPONENTS\.map\([\s\S]*?name="weight\.\$\{key\}"/u);
});

test('Admin All-Star lifecycle refreshes live state and language, then destroys on sign-out', () => {
  assert.match(
    dashboard,
    /if \(allStarBohController\) \{[\s\S]*?await allStarBohController\.refresh\?\.\(\);[\s\S]*?return allStarBohController;/
  );
  assert.match(
    dashboard,
    /allStarBohController\?\.refreshLanguage\?\.\(allStarBohAdminT, getDashboardLang\(\)\)/
  );
  assert.match(
    dashboard,
    /state\._signingOut = true;[\s\S]*?allStarBohController\?\.destroy\?\.\(\);[\s\S]*?allStarBohController = null;/
  );
  assert.match(
    dashboard,
    /window\.VTS_ALL_STAR_BOH_TRANSLATE \|\| window\.allStarBohText[\s\S]*?return dashT\(key, vars\);/
  );
});
