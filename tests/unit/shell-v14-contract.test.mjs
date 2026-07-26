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

const countId = (id) => (index.match(new RegExp(`id="${id}"`, 'g')) || []).length;

test('Velo frontend badge matches the deployed b0.3 prompt contract', () => {
  assert.match(aiAssistantTemplate, /aria-label="Velo Beta 0\.3">Beta 0\.3</);
  assert.doesNotMatch(aiAssistantTemplate, /Beta 0\.1/);
  assert.match(veloPrompt, /Velo b0\.3/);
});

test('v14 shell assets load last without replacing established tool ids', () => {
  assert.ok(index.indexOf('css/shell-v14.css') > index.indexOf('css/mobile.css'));
  assert.ok(index.indexOf('js/shell-v14.js') > index.indexOf('js/app.js'));

  for (const id of [
    'tabManual',
    'tabGenerator',
    'tabHeroes',
    'tabResearch',
    'tabSpecialization',
    'tabMaterials',
    'tabEdenMap',
    'tabStrife',
    'tabLoyalty',
    'tabYouTube',
    'tabOcrDashboard',
  ]) {
    assert.equal(countId(id), 1, `${id} must remain unique`);
  }
});

test('All-Star routing canonicalizes every hash casing before and after app boot', () => {
  assert.match(themePrepaint, /function resolveDeferredTabName\(/);
  assert.match(themePrepaint, /String\(rawTabName \|\| ''\)\.toLowerCase\(\)/);
  assert.match(themePrepaint, /'allStarBoh'/);
  assert.match(themePrepaint, /setAttribute\('data-initial-tab-pending', canonicalTab\)/);

  assert.match(shellJs, /function resolveCanonicalHashTabName\(/);
  assert.match(shellJs, /tabName\.toLowerCase\(\) === normalizedHash/);
  assert.ok(
    (shellJs.match(/resolveCanonicalHashTabName\(/g) || []).length >= 3,
    'the canonical resolver must serve active-tab and More-history comparisons'
  );
});

test('pending All-Star first paint exposes only its static route loader', () => {
  assert.match(
    index,
    /html\[data-initial-tab-pending='allStarBoh'\] #allStarBohSection\s*\{[\s\S]*?display:\s*block !important/
  );
  assert.match(
    index,
    /html\[data-initial-tab-pending='allStarBoh'\] #allStarBohSection > \.tab-loading\s*\{[\s\S]*?display:\s*flex !important/
  );
  assert.match(
    appCss,
    /html\[data-initial-tab-pending\] #generatorSection\s*\{[\s\S]*?display:\s*none !important/
  );
  assert.doesNotMatch(appCss, /data-initial-tab-pending='allStarBoh'/);
  assert.doesNotMatch(appCss, /data-initial-tab-pending='allStarBoh'[^\n]*boh-root/);
});

test('mobile exposes exactly four primary destinations and an accessible More sheet', () => {
  const mobilePrimaryIds = Array.from(
    index.matchAll(
      /<div\b(?=[^>]*class="[^"]*\btab-item\b)(?=[^>]*\bdata-shell-mobile-primary\b)[^>]*>\s*<(?:button|a)\b[^>]*\bid="([^"]+)"/g
    ),
    (match) => match[1]
  );

  assert.deepEqual(mobilePrimaryIds, ['tabResearch', 'tabEdenX1', 'tabAllStarBoh', 'tabYouTube']);
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
  for (const id of ['tabResearch', 'tabEdenX1', 'tabAllStarBoh', 'tabYouTube']) {
    assert.match(index, new RegExp(`id="${id}"[\\s\\S]*?<svg[\\s\\S]*?<span`));
  }
  assert.doesNotMatch(index, /id="(?:tabResearch|tabYouTube)"[^>]*data-i18n=/);
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
      /<div\b(?=[^>]*class="[^"]*\btab-item\b)(?=[^>]*\bdata-shell-desktop-primary\b)[^>]*>\s*<button\b[^>]*\bid="([^"]+)"/g
    ),
    (match) => match[1]
  );

  assert.deepEqual(desktopPrimaryIds, [
    'tabManual',
    'tabGenerator',
    'tabHeroes',
    'tabResearch',
    'tabMaterials',
    'tabArcade',
  ]);
  assert.match(shellCss, /#app \.tool-nav-shell\s*\{[\s\S]*?position:\s*relative !important/);
  assert.match(shellCss, /#app #tabNavScroll\s*\{[\s\S]*?flex-wrap:\s*nowrap !important/);
  assert.match(shellCss, /#app #tabNavScroll\s*\{[\s\S]*?overflow-x:\s*auto !important/);
  assert.match(
    shellCss,
    /@media \(max-width: 640px\)[\s\S]*?#app \.tool-nav-shell\s*\{[\s\S]*?position:\s*fixed !important/
  );
  assert.match(shellCss, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\) !important/);
});

test('navigation placement keeps the 640/641 and 1439/1440 contracts distinct', () => {
  assert.match(shellJs, /matchMedia\('\(max-width: 640px\)'\)/);
  assert.match(shellJs, /matchMedia\('\(min-width: 1440px\)'\)/);
  assert.match(
    shellJs,
    /const wideDesktopPrimaryIds = \[\s*\.\.\.desktopPrimaryIds,\s*'tabStrife',\s*'tabSpecialization',\s*'tabLoyalty',\s*'tabYouTube',?\s*\];/
  );
  assert.match(
    shellJs,
    /const mobilePrimaryIds = \['tabResearch', 'tabYouTube', 'tabAllStarBoh', 'tabEdenX1'\];/
  );

  for (const id of ['tabStrife', 'tabSpecialization', 'tabLoyalty', 'tabYouTube']) {
    assert.match(
      index,
      new RegExp(
        `<div\\b(?=[^>]*\\bdata-shell-wide-primary\\b)[^>]*>\\s*<(?:button|a)\\b[^>]*\\bid="${id}"`
      )
    );
  }
  assert.match(
    index,
    /<div\b(?=[^>]*\bdata-shell-mobile-primary\b)[^>]*>\s*<button\b[^>]*\bid="tabYouTube"/
  );
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

test('Specialization uses only the integrated tab destination', () => {
  assert.doesNotMatch(index, /specialization-towers\.html/);
  assert.match(index, /id="tabSpecialization"[\s\S]*?data-i18n="tabSpecialization"/);
  assert.match(shellJs, /\['tabSpecialization',\s*'specialization'\]/);
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

test('Eden Map uses a compact Soon badge without an injected building note', () => {
  assert.match(index, /id="tabEdenMap"[\s\S]*?data-i18n="tabEdenMapBadge">Soon<\/span>/);
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
