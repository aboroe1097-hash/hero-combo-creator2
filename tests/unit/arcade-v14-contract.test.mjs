import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const arcadeSource = readFileSync('js/arcade.js', 'utf8');
const arcadeLobbySource = readFileSync('js/arcade-lobby-ui.js', 'utf8');
const arcadeCss = readFileSync('css/arcade.css', 'utf8');

test('Arcade overall leaderboard names every played game score and explains its sum', () => {
  assert.match(arcadeLobbySource, /row\.perGame\?\.\[gameId\]\?\.score/);
  assert.match(arcadeLobbySource, /class: 'arcade-lb-game-name', text: gameName\(gameId\)/);
  assert.match(arcadeLobbySource, /class: 'arcade-lb-game-score'/);
  assert.doesNotMatch(arcadeLobbySource, /arcade-lb-rating-max/);
  assert.match(arcadeLobbySource, /sum of your personal-best scores/);
  assert.match(arcadeCss, /\.arcade-lb-game-bests\s*\{[\s\S]*?flex-wrap: wrap/);
  assert.match(
    arcadeCss,
    /@media \(max-width: 560px\)[\s\S]*?\.arcade-lb-player\s*\{[\s\S]*?min-width: 3\.75rem/
  );
});

test('Arcade uses the shared language preference and localizes every supported attribute', () => {
  assert.match(arcadeSource, /localStorage\.getItem\('vts_hero_lang'\)/);
  assert.match(arcadeSource, /localStorage\.setItem\('vts_hero_lang', nextLanguage\)/);
  assert.doesNotMatch(arcadeSource, /vts_language/);
  assert.match(arcadeSource, /replaceAll\('\{version\}', APP_VERSION\)/);

  for (const attribute of [
    'data-i18n',
    'data-i18n-ph',
    'data-i18n-title',
    'data-i18n-label',
    'data-i18n-aria',
    'data-i18n-alt',
  ]) {
    assert.match(arcadeSource, new RegExp(`querySelectorAll\\('\\[${attribute}\\]'\\)`));
  }
});

test('Arcade language changes load translations and synchronize direction and locale', () => {
  assert.match(arcadeSource, /createLatestLanguageLoader/);
  assert.match(arcadeSource, /requestArcadeLanguage\(requestedLanguage\)/);
  assert.match(arcadeSource, /applyLanguageDirection\(nextLanguage\)/);
  assert.match(arcadeSource, /document\.documentElement\.lang = resolveIntlLocale\(lang\)/);
  assert.match(arcadeSource, /languageSelect\.value = lang/);
  assert.match(arcadeSource, /new CustomEvent\('edenLanguageUpdate'\)/);
  assert.match(
    arcadeLobbySource,
    /window\.addEventListener\('edenLanguageUpdate',[\s\S]*profile\.relabel\(\)/
  );
  assert.match(
    arcadeLobbySource,
    /const relabel = \(\) => \{[\s\S]*arcadeProfileNameLabel[\s\S]*arcadeProfileSave[\s\S]*renderSummary\(\)/
  );
  assert.match(
    arcadeLobbySource,
    /const relabelTabs = \(\) => \{[\s\S]*wrap\.setAttribute\('aria-label', t\('arcadeLeaderboardHeading'/
  );
});

test('Arcade theme follows the standalone light-dark storage contract', () => {
  assert.match(arcadeSource, /const THEME_STORAGE_KEY = 'vts_theme'/);
  assert.match(arcadeSource, /root\.setAttribute\('data-theme', 'light'\)/);
  assert.match(arcadeSource, /root\.removeAttribute\('data-theme'\)/);
  assert.match(arcadeSource, /button\.setAttribute\('aria-pressed'/);
  assert.match(arcadeSource, /darkIcon\.classList\.toggle\('hidden'/);
  assert.match(arcadeSource, /lightIcon\.classList\.toggle\('hidden'/);
  assert.match(arcadeSource, /localStorage\.removeItem\('theme'\)/);
});

test('Arcade initializes its clock and year while retaining the lobby loader handoff', () => {
  assert.match(
    arcadeSource,
    /mountGameClock\(document\.getElementById\('globalGameClock'\), \{ compact: true, showUae: false \}\)/
  );
  assert.match(arcadeSource, /getElementById\('arcadeFooterYear'\)/);
  assert.match(arcadeSource, /new Date\(\)\.getFullYear\(\)/);
  assert.match(arcadeSource, /VTSLoaderV14\?\.ready\?\.\('arcade'\)/);
  assert.match(arcadeSource, /loaderEl\.style\.opacity = '0'/);
  assert.match(arcadeSource, /loaderEl\.classList\.add\('hidden'\)/);
  assert.match(arcadeSource, /getElementById\('arcadeLobby'\)\?\.classList\.remove\('hidden'\)/);
  assert.match(arcadeSource, /document\.body\.classList\.remove\('arcade-loading'\)/);
});

test('Arcade desktop intro copy stays within the clipped standalone brand panel', () => {
  assert.match(arcadeCss, /@media \(min-width: 769px\) and \(max-width: 1180px\)/);
  assert.match(arcadeCss, /@media \(min-width: 1181px\)/);
  assert.match(
    arcadeCss,
    /\.arcade-page \.admin-shell-copy\s*\{[\s\S]*?width: calc\(100% - clamp\(140px, 10vw, 176px\)/
  );
  assert.match(arcadeCss, /max-width: none !important/);
});
