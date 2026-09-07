import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync('index.html', 'utf8');
const shellCss = readFileSync('css/shell-v14.css', 'utf8');
const appCss = readFileSync('css/app.css', 'utf8');
const shellJs = readFileSync('js/shell-v14.js', 'utf8');
const themePrepaint = readFileSync('js/theme-prepaint.js', 'utf8');
const specializationJs = readFileSync('js/app-specialization.js', 'utf8');
const standaloneCopy = readFileSync('js/i18n/standalone-copy.js', 'utf8');
const aiAssistantTemplate = readFileSync('tabs/ai-assistant.html', 'utf8');
const veloPrompt = readFileSync('workers/ai/prompt.js', 'utf8');
const edenHubTemplate = readFileSync('tabs/eden-map.html', 'utf8');

const countId = (id) => (index.match(new RegExp(`id="${id}"`, 'g')) || []).length;

test('Velo frontend badge matches the deployed b0.4 prompt contract', () => {
  assert.match(aiAssistantTemplate, /aria-label="Velo Beta 0\.4">Beta 0\.4</);
  assert.doesNotMatch(aiAssistantTemplate, /Beta 0\.1/);
  assert.match(veloPrompt, /Velo b0\.4/);
});

test('v14 shell assets load last without replacing established tool ids', () => {
  assert.ok(index.indexOf('css/shell-v14.css') > index.indexOf('css/mobile.css'));
  assert.ok(index.indexOf('js/shell-v14.js') > index.indexOf('js/app.js'));

  for (const id of [
    'tabHeroesCombos',
    'tabResearchTowers',
    'tabMaterials',
    'tabEdenMap',
    'tabStrife',
    'tabYouTube',
    'tabOcrDashboard',
  ]) {
    assert.equal(countId(id), 1, `${id} must remain unique`);
  }
});

test('deferred tab routing canonicalizes every hash casing before and after app boot', () => {
  assert.match(themePrepaint, /function resolveDeferredTabName\(/);
  assert.match(themePrepaint, /String\(rawTabName \|\| ''\)\.toLowerCase\(\)/);
  assert.match(themePrepaint, /'strife'/);
  assert.match(themePrepaint, /setAttribute\('data-initial-tab-pending', canonicalTab\)/);

  assert.match(shellJs, /function resolveCanonicalHashTabName\(/);
  assert.match(shellJs, /tabName\.toLowerCase\(\) === normalizedHash/);
  assert.ok(
    (shellJs.match(/resolveCanonicalHashTabName\(/g) || []).length >= 3,
    'the canonical resolver must serve active-tab and More-history comparisons'
  );
});

// The All-Star BoH member hub was removed with its command center, so index.html
// no longer carries a pending-first-paint rule for it. The shared rule that
// hides the default tool while any deferred tab is pending must still hold.
test('a pending deferred tab hides the default tool on first paint', () => {
  assert.match(
    appCss,
    /html\[data-initial-tab-pending\] #generatorSection\s*\{[\s\S]*?display:\s*none !important/
  );
  assert.doesNotMatch(index, /allStarBohSection/);
  assert.doesNotMatch(appCss, /data-initial-tab-pending='allStarBoh'/);
});

test('mobile exposes exactly three primary destinations and an accessible More sheet', () => {
  const mobilePrimaryIds = Array.from(
    index.matchAll(
      /<div\b(?=[^>]*class="[^"]*\btab-item\b)(?=[^>]*\bdata-shell-mobile-primary\b)[^>]*>\s*<(?:button|a)\b[^>]*\bid="([^"]+)"/g
    ),
    (match) => match[1]
  );

  // Heroes & Combos is the tab the app opens on, so it holds the first slot.
  assert.deepEqual(mobilePrimaryIds, ['tabHeroesCombos', 'tabResearchTowers', 'tabEdenMap']);
  assert.match(
    index,
    /id="shellMoreButton"[^>]*aria-expanded="false"[^>]*aria-controls="shellMorePanel"/
  );
  assert.match(
    index,
    /id="shellMorePanel"[^>]*role="dialog"[^>]*aria-modal="false"[^>]*aria-labelledby="shellMoreTitle"[^>]*hidden/
  );
  assert.match(index, /id="shellMoreClose"[^>]*aria-label="Close"/);
});

test('translated mobile labels preserve their icon-library artwork', () => {
  for (const id of ['tabResearchTowers', 'tabYouTube']) {
    assert.match(index, new RegExp(`id="${id}"[\\s\\S]*?<svg[\\s\\S]*?<span`));
  }
  assert.doesNotMatch(index, /id="(?:tabResearchTowers|tabYouTube)"[^>]*data-i18n=/);
});

test('language picker uses the branded accessible popover instead of the native menu', () => {
  assert.match(index, /id="languageMenuButton"[^>]*aria-haspopup="listbox"/);
  assert.match(index, /id="languageMenu"[^>]*role="listbox"[^>]*hidden/);
  assert.match(
    index,
    /<select\b(?=[^>]*\bid="languageSelect")(?=[^>]*class="[^"]*\bshell-native-language\b)(?=[^>]*\baria-hidden="true")[^>]*>/
  );
  assert.match(shellJs, /function buildLanguageMenu\(/);
  assert.match(shellJs, /handleLanguageOptionKeydown/);
  assert.match(shellCss, /\.shell-language-menu\s*\{/);
});

test('desktop rail is a single non-overlaying row with deterministic overflow', () => {
  const desktopPrimaryIds = Array.from(
    index.matchAll(
      /<div\b(?=[^>]*class="[^"]*\btab-item\b)(?=[^>]*\bdata-shell-desktop-primary\b)[^>]*>\s*<(?:button|a)\b[^>]*\bid="([^"]+)"/g
    ),
    (match) => match[1]
  );

  assert.deepEqual(desktopPrimaryIds, [
    'tabHeroesCombos',
    'tabResearchTowers',
    'tabMaterials',
    'tabEdenMap',
    'tabOcrDashboard',
  ]);
  assert.match(shellCss, /#app \.tool-nav-shell\s*\{[\s\S]*?position:\s*relative !important/);
  assert.match(shellCss, /#app #tabNavScroll\s*\{[\s\S]*?flex-wrap:\s*nowrap !important/);
  assert.match(shellCss, /#app #tabNavScroll\s*\{[\s\S]*?overflow-x:\s*auto !important/);
  assert.match(
    shellCss,
    /@media \(max-width: 640px\)[\s\S]*?#app \.tool-nav-shell\s*\{[\s\S]*?position:\s*fixed !important/
  );
  assert.match(shellCss, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\) !important/);
  assert.match(
    shellCss,
    /@media \(max-width: 640px\)[\s\S]*?#app \.tool-nav-inner\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 3fr\) minmax\(64px, 1fr\) !important/
  );
  assert.match(
    shellCss,
    /@media \(max-width: 640px\)[\s\S]*?#app \.shell-more-button\s*\{[\s\S]*?display:\s*inline-flex !important/
  );
});

test('navigation placement keeps the 640/641 and 1439/1440 contracts distinct', () => {
  assert.match(shellJs, /matchMedia\('\(max-width: 640px\)'\)/);
  assert.match(shellJs, /matchMedia\('\(min-width: 1440px\)'\)/);
  // The three hubs lead the rail: layoutNavigation() appends in array order.
  assert.match(shellJs, /const hubIds = \['tabHeroesCombos', 'tabResearchTowers', 'tabEdenMap'\];/);
  // VTS Admin holds the fifth desktop slot; All-Star BoH lives in More.
  assert.match(
    shellJs,
    /const desktopPrimaryIds = \[\.\.\.hubIds, 'tabMaterials', 'tabOcrDashboard'\];/
  );
  assert.match(
    shellJs,
    /const wideDesktopPrimaryIds = \[\s*\.\.\.desktopPrimaryIds,\s*'tabStrife',\s*'tabYouTube',?\s*\];/
  );
  // Phones expose exactly the three hub destinations, with no truncated fourth
  // leaf tool competing for label width.
  assert.match(
    shellJs,
    /const mobilePrimaryIds = \['tabHeroesCombos', 'tabResearchTowers', 'tabEdenMap'\];/
  );

  // All-Star BoH is deliberately absent: it runs for a few weeks a season, so
  // it lives in More rather than holding a rail slot year-round.
  for (const id of ['tabStrife', 'tabYouTube']) {
    assert.match(
      index,
      new RegExp(
        `<div\\b(?=[^>]*\\bdata-shell-wide-primary\\b)[^>]*>\\s*<(?:button|a)\\b[^>]*\\bid="${id}"`
      )
    );
  }
  assert.match(
    index,
    /<div\b(?=[^>]*\bdata-shell-mobile-primary\b)[^>]*>\s*<button\b[^>]*\bid="tabHeroesCombos"/
  );
  // Each hub pill is marked so the rail can show a container differently from a
  // leaf tool without a separator, which reordering would break.
  for (const id of ['tabHeroesCombos', 'tabResearchTowers', 'tabEdenMap']) {
    assert.match(
      index,
      new RegExp(`<div\\b(?=[^>]*\\bdata-shell-hub\\b)[^>]*>\\s*<button\\b[^>]*\\bid="${id}"`)
    );
  }
  assert.match(shellCss, /#app #tabNavScroll \[data-shell-hub\] \.tab-pill::before/);
});

test('first-focus skip link follows the active tool and respects reduced motion', () => {
  assert.match(
    index,
    /<body>\s*<a\b(?=[^>]*\bid="skipCurrentTool")(?=[^>]*\bhref="#generatorSection")(?=[^>]*\bdata-i18n="skipToCurrentTool")[^>]*>/
  );
  assert.match(shellJs, /skipCurrentTool\.setAttribute\('href', `#\$\{tabName\}Section`\)/);
  assert.match(shellJs, /function focusTabDestination\(tabName, \{ scroll = false \} = \{\}\)/);
  assert.match(shellJs, /prefersReducedMotion\(\) \? 'auto' : 'smooth'/);
  assert.match(shellJs, /skipCurrentTool\?\.addEventListener\('click'/);
  assert.match(shellJs, /focusTabDestination\(activeTabName\(\), \{ scroll: true \}\)/);
  assert.match(shellCss, /\.shell-skip-current-tool:focus-visible\s*\{/);
});

test('mobile branding keeps the single page heading in the accessibility tree', () => {
  assert.equal(countId('appTitle'), 1);
  assert.doesNotMatch(shellCss, /#app \.command-logo > :not\(picture\)/);
  assert.match(
    shellCss,
    /#app \.command-logo #appTitle\s*\{[\s\S]*?clip-path:\s*inset\(50%\) !important/
  );
});

test('More controller localizes all supported languages and preserves keyboard focus', () => {
  assert.match(shellJs, /standaloneI18n\?\.getCopy\(language\)\?\.shell/);
  assert.match(shellJs, /import\('\.\/i18n\/standalone-copy\.js'\)/);
  for (const language of ['en', 'es', 'pt', 'de', 'fr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr']) {
    assert.match(standaloneCopy, new RegExp(`\\b${language}: \\{`));
  }

  assert.match(shellJs, /event\.key === 'Escape'/);
  assert.match(shellJs, /event\.key !== 'Tab'/);
  assert.match(shellJs, /moreButton\.setAttribute\('aria-expanded', 'true'\)/);
  assert.match(shellJs, /returnFocusTarget\.focus\(\{ preventScroll: true \}\)/);
  assert.match(shellJs, /container\.appendChild\(item\)/);
  assert.match(shellJs, /moreTools\.contains\(item\)/);
  assert.doesNotMatch(shellJs, /cloneNode\(/);
  const readyIndex = shellJs.indexOf("document.documentElement.dataset.shellNavReady = '1'");
  assert.ok(readyIndex > shellJs.indexOf("moreButton.addEventListener('click'"));
  assert.ok(readyIndex > shellJs.indexOf('window.vtsShellOpenMore'));
});

test('Towers Specialization lives inside the Research & Towers Hub', () => {
  assert.doesNotMatch(index, /specialization-towers\.html/);
  // The tab pill is the hub; Towers Specialization is its default sub-tab.
  assert.doesNotMatch(index, /id="tabSpecialization"/);
  assert.match(index, /id="tabResearchTowers"[\s\S]*?data-i18n="tabResearchTowers"/);
  assert.match(index, /data-hub-subtab="towers"[\s\S]*?data-i18n="tabTowersSpecialization"/);
  assert.match(index, /data-hub-subtab="research"[\s\S]*?data-i18n="tabResearch"/);
  assert.match(index, /data-hub-subtab="artifact"[\s\S]*?data-i18n="tabArtifact"/);
  // Both former tabs keep working as deep links through the hub.
  assert.match(shellJs, /\['tabResearchTowers',\s*'researchTowers'\]/);
  assert.match(shellJs, /legacyResearchTowersHashes/);
  assert.match(shellJs, /\['specialization',\s*'towers'\]/);
  assert.doesNotMatch(shellJs, /tabSpecializationTowers/);
  assert.match(specializationJs, /querySelector\('\.specialization-loading'\)\?\.remove\(\)/);
  assert.doesNotMatch(specializationJs, /ACKNOWLEDGMENTS|Old\.Faithful|Raven G|\bPtr\b/);
  assert.match(
    specializationJs,
    /\$\{renderCommunity\(\)\}[\s\S]*?\$\{renderAcknowledgments\(\)\}/
  );
  assert.match(specializationJs, /data-spec-set-selected-node/);
  assert.match(specializationJs, /data-spec-help-node/);
  assert.match(specializationJs, /function contributionNodeKey\(/);
  assert.match(specializationJs, /getSpecializationResearchImage/);
  assert.match(specializationJs, /getSpecializationLegionSkillImage/);
  assert.match(appCss, /\.spec-badge-emblem \.specialization-planner-sprite/);
  assert.match(appCss, /\.spec-crest-emblem \.specialization-planner-sprite/);
  assert.match(appCss, /\.spec-ring-node\[data-selected='true'\]/);
  assert.match(appCss, /\/\* Acknowledgments \/ Hall of Honor \*\//);
  assert.match(appCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.spec-ack-plate/);
});

test('main destinations use Hub badges while status badges stay on their subtools', () => {
  for (const id of ['tabHeroesCombos', 'tabResearchTowers', 'tabEdenMap']) {
    assert.match(index, new RegExp(`id="${id}"[\\s\\S]*?<span class="tab-badge[^>]*>HUB<`));
  }
  assert.match(edenHubTemplate, /data-eden-subtab="map"[\s\S]*?data-subtool-badge="SOON"/);
  assert.match(edenHubTemplate, /data-eden-subtab="playbook"[\s\S]*?data-subtool-badge="NEW"/);
  assert.match(edenHubTemplate, /data-eden-subtab="bounty"[\s\S]*?data-subtool-badge="NEW"/);
  assert.match(index, /data-hub-subtab="towers"[\s\S]*?data-subtool-badge="BETA"/);
  assert.match(index, /data-hub-subtab="artifact"[\s\S]*?data-subtool-badge="NEW"/);
  assert.doesNotMatch(shellJs, /shell-more-building-note|To be completed before next season/);
  assert.doesNotMatch(shellCss, /shell-more-tool--building|shell-more-building-note/);
});

test('shared shell includes light, RTL, reduced-motion, and touch contracts', () => {
  assert.match(shellCss, /\[data-theme='light'\] #app\.app-shell/);
  assert.match(shellCss, /\[dir='rtl'\] #app \.shell-more-panel/);
  assert.match(shellCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(shellCss, /#app #themeToggle,[\s\S]*?min-height:\s*44px !important/);
  assert.match(shellCss, /#app \.shell-more-close\s*\{[\s\S]*?height:\s*44px/);
});

test('footer is one compact community strip and keeps tab-link behavior', () => {
  assert.doesNotMatch(index, /class="footer-section links-section"/);
  assert.match(index, /class="footer-tool-links"/);
  assert.match(index, /data-footer-tab="manual"/);
  assert.match(index, /data-footer-tab="generator"/);
  assert.match(
    index,
    /id="tabBattleSimulator"[\s\S]*?data-i18n="tabBattleSimulator">Battle Simulator<\/span>/
  );
  assert.match(
    index,
    /href="battle-simulator\.html" data-i18n="tabBattleSimulator">Battle Simulator<\/a>/
  );
  assert.match(index, /href="#specialization"[\s\S]*?data-footer-tab="specialization"/);
  assert.match(index, /id="footerYear"/);
  assert.match(
    shellCss,
    /#app \.site-footer \.footer-content\s*\{[\s\S]*?grid-template-columns:\s*auto minmax\(0, 1fr\) auto !important/
  );
  assert.match(
    shellCss,
    /@media \(max-width: 640px\)[\s\S]*?#app \.footer-tool-links\s*\{[\s\S]*?display:\s*none/
  );
});
