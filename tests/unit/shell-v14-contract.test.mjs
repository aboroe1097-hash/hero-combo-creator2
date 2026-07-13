import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync('index.html', 'utf8');
const shellCss = readFileSync('css/shell-v14.css', 'utf8');
const shellJs = readFileSync('js/shell-v14.js', 'utf8');

const countId = (id) => (index.match(new RegExp(`id="${id}"`, 'g')) || []).length;

test('v14 shell assets load last without replacing established tool ids', () => {
  assert.ok(index.indexOf('css/shell-v14.css') > index.indexOf('css/mobile.css'));
  assert.ok(index.indexOf('js/shell-v14.js') > index.indexOf('js/app.js'));

  for (const id of [
    'tabManual',
    'tabGenerator',
    'tabHeroes',
    'tabResearch',
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

test('mobile exposes exactly four primary destinations and an accessible More sheet', () => {
  const mobilePrimaryIds = Array.from(
    index.matchAll(
      /<div\b(?=[^>]*class="[^"]*\btab-item\b)(?=[^>]*\bdata-shell-mobile-primary\b)[^>]*>\s*<(?:button|a)\b[^>]*\bid="([^"]+)"/g
    ),
    (match) => match[1]
  );

  assert.deepEqual(mobilePrimaryIds, ['tabGenerator', 'tabResearch', 'tabYouTube', 'tabArcade']);
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
  for (const id of ['tabGenerator', 'tabResearch', 'tabYouTube', 'tabArcade']) {
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

test('More controller localizes all supported languages and preserves keyboard focus', () => {
  for (const language of ['en', 'es', 'pt', 'de', 'fr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr']) {
    assert.match(shellJs, new RegExp(`\\b${language}: \\{ more:`));
  }

  assert.match(shellJs, /event\.key === 'Escape'/);
  assert.match(shellJs, /event\.key !== 'Tab'/);
  assert.match(shellJs, /moreButton\.setAttribute\('aria-expanded', 'true'\)/);
  assert.match(shellJs, /returnFocusTarget\.focus\(\{ preventScroll: true \}\)/);
  assert.match(shellJs, /container\.appendChild\(item\)/);
  assert.match(shellJs, /moreTools\.contains\(item\)/);
  assert.doesNotMatch(shellJs, /cloneNode\(/);
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
  assert.match(index, /id="footerYear"/);
  assert.match(
    shellCss,
    /#app \.site-footer \.footer-content\s*\{[\s\S]*?grid-template-columns:\s*auto minmax\(0, 1fr\) auto !important/
  );
});
