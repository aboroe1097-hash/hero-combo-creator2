import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const gameNames = [
  'b-merge-rush.html',
  'c-sort-hoard.html',
  'e-crystal-relay.html',
  'f-set-assembly.html',
  'h-hero-rumble.html',
];
const visibleModes = [
  ['b-merge-rush.html', 'A', 'Merge Rush'],
  ['c-sort-hoard.html', 'B', 'Sort the Hoard'],
  ['e-crystal-relay.html', 'C', 'Crystal Relay'],
  ['f-set-assembly.html', 'D', 'Set Assembly'],
  ['h-hero-rumble.html', 'E', 'Hero Rumble'],
];
const localeIds = ['en', 'es', 'pt', 'de', 'fr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr'];
const localizedGameKeys = [
  'arcadeModeA',
  'arcadeModeB',
  'arcadeModeC',
  'arcadeModeD',
  'arcadeModeE',
  'arcadeMergeRushTitle',
  'arcadeMergeRushDesc',
  'arcadeSortHoardTitle',
  'arcadeSortHoardDesc',
  'arcadeCrystalRelayTitle',
  'arcadeCrystalRelayDesc',
  'arcadeSetAssemblyTitle',
  'arcadeSetAssemblyDesc',
  'arcadeHeroRumbleTitle',
  'arcadeHeroRumbleDesc',
];

test('Arcade entry and all five games are part of the production artifact contract', () => {
  const arcade = readFileSync('arcade.html', 'utf8');
  const viteConfig = readFileSync('vite.config.js', 'utf8');
  const postBuild = readFileSync('scripts/post-build.mjs', 'utf8');
  const metadata = readFileSync('scripts/update-build-metadata.mjs', 'utf8');
  const versionCheck = readFileSync('scripts/check-version-consistency.mjs', 'utf8');

  assert.match(viteConfig, /arcade:\s*resolve\(__dirname, 'arcade\.html'\)/);
  assert.match(postBuild, /const copyDirs = \[[^\]]*'games'/);
  for (const script of ['loader-v14.js', 'shell-v14.js', 'standalone-language-v14.js']) {
    assert.match(postBuild, new RegExp(`js/${script.replace('.', '\\.')}`));
  }
  assert.match(metadata, /entryHtmlFiles = \[[^\]]*'arcade\.html'/);
  assert.match(versionCheck, /'js\/arcade\.js'/);
  assert.match(versionCheck, /'arcade\.html'/);

  for (const gameName of gameNames) {
    assert.match(arcade, new RegExp(`/games/boot/${gameName.replace('.', '\\.')}`));
    assert.ok(existsSync(`games/boot/${gameName}`), `missing Arcade game: ${gameName}`);
  }
  assert.deepEqual(
    readdirSync('games/boot').sort(),
    [...gameNames, 'shared.css', 'shared.js'].sort()
  );
});

test('Arcade lobby and game shells expose the five-mode A-E sequence', () => {
  for (const [gameName, mode, title] of visibleModes) {
    const source = readFileSync(`games/boot/${gameName}`, 'utf8');
    assert.match(source, new RegExp(`<title>${mode} - ${title}<\\/title>`));
    assert.match(source, new RegExp(`modeId: 'Mode ${mode}'`));
  }
});

test('Merge Rush overload meter can reach danger and reports its localized state', () => {
  const merge = readFileSync('games/boot/b-merge-rush.html', 'utf8');
  const shared = readFileSync('games/boot/shared.js', 'utf8');
  assert.match(merge, /maxPieces: 12/);
  assert.match(merge, /state\.overflowTimer \+= elapsed/);
  assert.match(merge, /role', 'progressbar'/);
  assert.match(merge, /copy\.overloadCritical\.replace/);
  assert.equal((shared.match(/overloadCritical:/g) || []).length, localeIds.length);
});

test('every Arcade game declares its translated title, instruction, mode, and control scheme', () => {
  const expected = new Map([
    ['b-merge-rush.html', ['arcadeModeA', 'arcadeMergeRushTitle', 'arcadeMergeRushDesc', 'merge']],
    ['c-sort-hoard.html', ['arcadeModeB', 'arcadeSortHoardTitle', 'arcadeSortHoardDesc', 'sort']],
    [
      'e-crystal-relay.html',
      ['arcadeModeC', 'arcadeCrystalRelayTitle', 'arcadeCrystalRelayDesc', 'relay'],
    ],
    [
      'f-set-assembly.html',
      ['arcadeModeD', 'arcadeSetAssemblyTitle', 'arcadeSetAssemblyDesc', 'set'],
    ],
    [
      'h-hero-rumble.html',
      ['arcadeModeE', 'arcadeHeroRumbleTitle', 'arcadeHeroRumbleDesc', 'rumble'],
    ],
  ]);

  for (const [gameName, [modeKey, titleKey, hintKey, controlScheme]] of expected) {
    const source = readFileSync(`games/boot/${gameName}`, 'utf8');
    assert.match(source, new RegExp(`modeKey: '${modeKey}'`));
    assert.match(source, new RegExp(`titleKey: '${titleKey}'`));
    assert.match(source, new RegExp(`hintKey: '${hintKey}'`));
    assert.match(source, new RegExp(`controlScheme: '${controlScheme}'`));
  }
});

test('all supported locales include every Arcade game title and instruction', async () => {
  for (const locale of localeIds) {
    const module = await import(new URL(`../../js/i18n/${locale}.js`, import.meta.url));
    for (const key of localizedGameKeys) {
      assert.equal(typeof module.default[key], 'string', `${locale}.${key}`);
      assert.ok(module.default[key].trim(), `${locale}.${key} must not be empty`);
    }
  }
});

test('shared game shell integrates Velo and synchronizes theme and language from its host', () => {
  const shared = readFileSync('games/boot/shared.js', 'utf8');
  const sharedCss = readFileSync('games/boot/shared.css', 'utf8');
  const hub = readFileSync('js/arcade-hub.js', 'utf8');

  assert.match(shared, /assets\/velo\/velo-body\.webp/);
  assert.match(shared, /assets\/velo\/velo-helmet\.webp/);
  assert.doesNotMatch(shared, /import\('\/js\/translations\.js'\)/);
  assert.match(shared, /typeof config\.title === 'string'/);
  assert.match(shared, /typeof config\.description === 'string'/);
  assert.match(shared, /typeof config\.mode === 'string'/);
  assert.match(shared, /event\.origin !== window\.location\.origin/);
  assert.match(shared, /vts:arcade-config/);
  assert.match(sharedCss, /\[data-theme=['"]light['"]\]/);
  assert.match(sharedCss, /\.game-brief\s*\{/);
  assert.match(sharedCss, /@keyframes game-velo-breathe/);
  assert.match(sharedCss, /@keyframes game-velo-attention/);
  assert.match(sharedCss, /@keyframes game-velo-helmet/);
  assert.match(sharedCss, /@keyframes game-velo-cheer/);
  assert.match(shared, /classList\.add\('is-cheering'\)/);
  assert.match(sharedCss, /\.control-cues\s*\{/);
  assert.match(hub, /frame\.contentWindow\.postMessage\(config, window\.location\.origin\)/);
  assert.match(hub, /new MutationObserver\(syncFrameConfig\)/);
});

test('gameplay chrome avoids untranslated helper sentences', () => {
  const sources = gameNames.map((name) => readFileSync(`games/boot/${name}`, 'utf8')).join('\n');
  assert.doesNotMatch(sources, />need</i);
  assert.doesNotMatch(sources, /Collect set:/i);
  assert.doesNotMatch(sources, /Window side:/i);
  assert.doesNotMatch(sources, /x Kill/);
});

test('every game clamps frame deltas and the shared shell pauses hidden tabs', () => {
  const shared = readFileSync('games/boot/shared.js', 'utf8');
  const sharedCss = readFileSync('games/boot/shared.css', 'utf8');

  for (const gameName of gameNames) {
    const source = readFileSync(`games/boot/${gameName}`, 'utf8');
    assert.match(source, /const dt = Math\.min\(32, t - state\.last\)/, gameName);
  }

  assert.match(shared, /if \(e\.repeat\) return/);
  assert.match(shared, /document\.addEventListener\('visibilitychange'/);
  assert.match(shared, /document\.hidden && pause\?\.dataset\.paused !== 'true'/);
  assert.match(sharedCss, /contain:\s*layout paint/);
});

test('every Arcade game maps to exactly one canonical leaderboard score key', () => {
  const expected = new Map([
    ['b-merge-rush.html', 'vts_proto_merge_rush'],
    ['c-sort-hoard.html', 'vts_proto_sort_hoard'],
    ['e-crystal-relay.html', 'vts_proto_crystal_relay'],
    ['f-set-assembly.html', 'vts_proto_set_assembly'],
    ['h-hero-rumble.html', 'vts_proto_hero_rumble'],
  ]);

  for (const [gameName, scoreKey] of expected) {
    const source = readFileSync(`games/boot/${gameName}`, 'utf8');
    assert.equal(source.match(/const SCORE_KEY = '([^']+)'/g)?.length, 1, gameName);
    assert.match(source, new RegExp(`const SCORE_KEY = '${scoreKey}'`));
    assert.match(source, /scoreKey: SCORE_KEY/);
    assert.match(source, /animateGameOver\([^;]*SCORE_KEY/);
  }
});

test('Arcade game shell references only existing shared production assets', () => {
  const shared = readFileSync('games/boot/shared.js', 'utf8');
  const staticAssetPaths = [
    ...shared.matchAll(/const (?:WING_LEFT|WING_RIGHT|LOGO) = '([^']+)'/g),
  ].map((match) => match[1]);

  assert.equal(staticAssetPaths.length, 3);
  for (const assetPath of staticAssetPaths) {
    assert.ok(assetPath.startsWith('/'));
    assert.ok(existsSync(assetPath.slice(1)), `missing shared Arcade asset: ${assetPath}`);
  }

  for (const color of ['blue', 'gold', 'purple']) {
    for (const type of ['claw', 'coil', 'feather', 'ingot']) {
      const materialPath = `assets/dm/materials/${color}/${type}.png`;
      assert.ok(existsSync(materialPath), `missing Arcade material: ${materialPath}`);
    }
  }

  const skinFiles = [...shared.matchAll(/\{ file: '([^']+)', name:/g)].map((match) => match[1]);
  assert.equal(skinFiles.length, 20);
  for (const skinFile of skinFiles) {
    assert.ok(existsSync(`assets/skins/${skinFile}`), `missing Arcade skin: ${skinFile}`);
  }

  assert.match(shared, /class="btn ghost nav-back"[^>]*href="\/arcade\.html"/);
  assert.match(shared, /Go Back to Game List/);
  assert.match(shared, /localStorage\.getItem\('vts_hero_lang'\)/);
  assert.ok(existsSync('assets/velo/velo-body.webp'));
  assert.ok(existsSync('assets/velo/velo-helmet.webp'));
});

test('Hero Rumble alone exposes a short-window elimination streak', () => {
  const rumble = readFileSync('games/boot/h-hero-rumble.html', 'utf8');
  assert.match(rumble, /const STREAK_RESET_MS = 4000/);
  assert.match(rumble, /recordElimination\('left'\)/);
  assert.match(rumble, /recordElimination\('right'\)/);
  assert.match(rumble, /`\$\{streak\.count\}×`/);
  assert.doesNotMatch(rumble, /x Kill/);

  for (const gameName of gameNames.filter((name) => name !== 'h-hero-rumble.html')) {
    assert.doesNotMatch(
      readFileSync(`games/boot/${gameName}`, 'utf8'),
      /recordElimination|kill-streak/
    );
  }
});

test('Arcade migrates device bests and every game has a terminal cloud-save path', () => {
  const scores = readFileSync('js/arcade-scores.js', 'utf8');
  const shared = readFileSync('games/boot/shared.js', 'utf8');
  const rumble = readFileSync('games/boot/h-hero-rumble.html', 'utf8');

  assert.match(scores, /export function queueLocalBestsForSync\(\)/);
  assert.match(scores, /export function saveProfile[\s\S]*queueLocalBestsForSync\(\)/);
  assert.match(scores, /export function initArcadeScores[\s\S]*queueLocalBestsForSync\(\)/);
  assert.match(scores, /if \(!ctx\) throw new Error\('Arcade leaderboard is unavailable'\)/);
  assert.match(scores, /firebaseWarmup = null/);
  assert.match(shared, /pushBestToCloud\(scoreKey, score\)/);
  assert.match(rumble, /const ROUND_MS = 60_000/);
  assert.match(rumble, /function finishRound\(\)[\s\S]*G\.animateGameOver\(/);
});

test('switching player names cannot relabel or inherit the previous player scorecard', () => {
  const scores = readFileSync('js/arcade-scores.js', 'utf8');
  assert.match(scores, /const playerChanged =/);
  assert.match(scores, /profile\.id = playerChanged \? createPlayerId\(\)/);
  assert.match(scores, /if \(playerChanged\) \{[\s\S]*resetLocalPlayerScores\(\)/);
  assert.match(scores, /if \(!playerChanged\) void relabelCloudScores\(profile\)/);
  assert.match(scores, /docIdFor\(gameId, uid, profile\.id\)/);
  assert.match(scores, /const playerKey = `\$\{r\.uid\}\|\$\{playerId\}`/);
});

test('Arcade cloud verification covers browser sync and the live Firestore rules contract', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const browserVerifier = readFileSync('scripts/verify-arcade-cloud.mjs', 'utf8');
  const rulesVerifier = readFileSync('scripts/verify-arcade-firestore-contract.mjs', 'utf8');

  assert.match(packageJson.scripts['firebase:verify-arcade'], /verify-arcade-cloud\.mjs/);
  assert.match(
    packageJson.scripts['firebase:verify-arcade-contract'],
    /verify-arcade-firestore-contract\.mjs/
  );
  assert.doesNotMatch(browserVerifier, /import\('\/js\/arcade-scores\.js'\)/);
  assert.match(browserVerifier, /arcade-sync-pill\.is-synced/);
  assert.match(rulesVerifier, /signInWithPassword/);
  assert.match(rulesVerifier, /assert\.equal\(lowerWrite\.status, 403/);
  assert.match(rulesVerifier, /finally \{[\s\S]*await cleanup\(admin\)/);
});
