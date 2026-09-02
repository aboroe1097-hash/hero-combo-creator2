import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appCss = readFileSync('css/app.css', 'utf8');
const componentsCss = readFileSync('css/components.css', 'utf8');
const shellCss = readFileSync('css/shell-v14.css', 'utf8');
const mobileCss = readFileSync('css/mobile.css', 'utf8');
const edenCss = readFileSync('css/eden-x1.css', 'utf8');
const manualBuilder = readFileSync('js/app-builder.js', 'utf8');
const appSource = readFileSync('js/app.js', 'utf8');
const pwaSource = readFileSync('js/pwa-register.js', 'utf8');
const aiLauncherCss = readFileSync('public/ai-launcher-critical.css', 'utf8');

test('Hero Atlas keeps an always-loaded stacked command deck for wide mobile viewports', () => {
  assert.match(
    appCss,
    /#heroesSection \.heroes-toolbar-sticky \{[\s\S]*?position: relative;[\s\S]*?top: auto;[\s\S]*?z-index: auto;/
  );
  assert.match(
    appCss,
    /@media \(max-width: 960px\)[\s\S]*?#heroesSection \.heroes-toolbar \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/
  );
  assert.match(
    appCss,
    /#heroesSection \.heroes-toolbar-actions \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/
  );
  assert.match(
    appCss,
    /#heroesSection \.heroes-filter-deck \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/
  );
});

test('compact shell keeps readable brand, version, and controls in normal header flow', () => {
  const compactShell = shellCss.match(/@media \(max-width: 640px\) \{[\s\S]*?\n\}/)?.[0] ?? '';
  const narrowShell = shellCss.match(/@media \(max-width: 370px\) \{[\s\S]*?\n\}/)?.[0] ?? '';
  assert.match(compactShell, /#app #globalGameClock::before \{\s*display: none/);
  assert.match(
    compactShell,
    /#app \.command-header \{[\s\S]*?position: relative !important;[\s\S]*?display: grid !important;[\s\S]*?grid-template-columns: minmax\(52px, 0\.55fr\) minmax\(0, 3fr\) !important;[\s\S]*?grid-template-rows: auto auto !important;[\s\S]*?overflow: visible !important/
  );
  assert.match(compactShell, /#app \.command-brand \{\s*display: contents !important;\s*\}/);
  assert.match(
    compactShell,
    /#app \.version-ribbon \{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?display: block !important;[\s\S]*?box-sizing: border-box;[\s\S]*?width: 100% !important;[\s\S]*?max-width: none;[\s\S]*?text-align: center;/
  );
  assert.match(
    compactShell,
    /#app \.command-logo \{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 2;[\s\S]*?grid-template-rows: 52px auto !important;[\s\S]*?justify-items: center !important;/
  );
  assert.match(
    compactShell,
    /#app \.command-logo picture,[\s\S]*?#app \.command-logo \.main-logo \{[\s\S]*?width: 52px !important;[\s\S]*?height: 52px !important;/
  );
  assert.match(
    compactShell,
    /#app \.command-header \.command-logo \.shell-brand-title \{[\s\S]*?display: block !important;[\s\S]*?text-align: center !important;/
  );
  assert.match(
    compactShell,
    /#app \.command-logo \.command-logo-copy \{\s*display: none !important;/
  );
  assert.match(
    compactShell,
    /#app \.app-control-row \{[\s\S]*?display: grid !important;[\s\S]*?grid-template-columns: minmax\(52px, 1fr\) repeat\(4, 44px\) !important;[\s\S]*?grid-template-rows: 44px 44px !important;[\s\S]*?grid-auto-rows: 44px;/
  );
  assert.match(
    compactShell,
    /#app #globalGameClock \{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 1;[\s\S]*?width: 100% !important;/
  );
  assert.match(
    compactShell,
    /#app #commandPaletteTrigger \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1;/
  );
  assert.match(
    compactShell,
    /#app #shareCurrentViewBtn \{[\s\S]*?grid-column: 3;[\s\S]*?grid-row: 1;/
  );
  assert.match(
    compactShell,
    /#app \.shell-account-slot \{[\s\S]*?grid-column: 4;[\s\S]*?grid-row: 1;/
  );
  assert.match(
    compactShell,
    /#app \.account-link,[\s\S]*?#app #commandPaletteTrigger \{[\s\S]*?width: 44px !important;[\s\S]*?min-width: 44px !important;/
  );
  assert.match(
    compactShell,
    /#app #shareCurrentViewBtn,\s*#app #commandPaletteTrigger \{[\s\S]*?width: 44px !important;[\s\S]*?min-width: 44px !important;/
  );
  assert.match(
    compactShell,
    /#app \.account-link,[\s\S]*?#app #commandPaletteTrigger \{[\s\S]*?min-height: 44px !important;[\s\S]*?height: 44px !important;/
  );
  assert.match(appCss, /\.account-link \{[\s\S]*?display: inline-flex;[\s\S]*?min-height: 44px;/);
  assert.match(
    appCss,
    /@media \(max-width: 640px\) \{[\s\S]*?\.account-link \{[\s\S]*?width: 44px;/
  );
  assert.match(
    appCss,
    /\.account-link-label \{[\s\S]*?position: absolute;[\s\S]*?width: 1px;[\s\S]*?height: 1px;[\s\S]*?overflow: hidden;[\s\S]*?clip: rect\(0 0 0 0\);/
  );
  assert.match(compactShell, /#app #themeToggle \{[\s\S]*?grid-column: 5;[\s\S]*?grid-row: 1;/);
  assert.match(
    compactShell,
    /#app \.app-control-row \.lang-select-wrapper \{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?grid-row: 2;/
  );
  assert.match(
    compactShell,
    /#app \.lang-select-wrapper,[\s\S]*?#app \.lang-select-shell \{[\s\S]*?width: 100% !important;[\s\S]*?min-width: 0 !important;[\s\S]*?max-width: none !important;/
  );
  assert.match(
    compactShell,
    /#app \.language-menu-button \{[\s\S]*?grid-template-columns: 18px minmax\(0, 1fr\) 14px;[\s\S]*?color: var\(--text-primary\) !important;[\s\S]*?text-align: start;/
  );
  assert.match(compactShell, /#app \.lang-select-icon \{\s*display: inline-flex !important;/);
  assert.match(
    compactShell,
    /#app \.language-menu-label \{[\s\S]*?font-size: 0\.75rem !important;[\s\S]*?letter-spacing: 0;/
  );
  assert.match(
    compactShell,
    /#app #installAppBtn \{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?grid-row: 3;[\s\S]*?width: 100% !important;/
  );
  assert.match(
    compactShell,
    /#app #installAppBtn\.hidden,[\s\S]*?#app #installAppBtn\[hidden\] \{\s*display: none !important;\s*\}/
  );
  assert.match(
    narrowShell,
    /#app \.lang-select-wrapper,[\s\S]*?#app \.lang-select-shell \{[\s\S]*?width: 100% !important;[\s\S]*?min-width: 0 !important;/
  );
  assert.match(narrowShell, /#app #globalGameClock \{[\s\S]*?display: none !important;/);
  assert.match(
    narrowShell,
    /#app \.app-control-row \{[\s\S]*?grid-template-columns: repeat\(4, 44px\) !important;/
  );
  assert.match(
    compactShell,
    /#app \.shell-account-slot\.vts-account-chip-mount,[\s\S]*?width: 44px;[\s\S]*?height: 44px;/
  );
});

test('mobile hub labels wrap inside their two-column grid', () => {
  assert.match(
    componentsCss,
    /@media \(max-width: 640px\) \{[\s\S]*?\.vts-hub-subtab \{[\s\S]*?min-width: 0;[\s\S]*?white-space: normal;/
  );
});

test('mobile resets legacy clipping and keeps the safe-area nav separate from the header', () => {
  const compactShell = shellCss.match(/@media \(max-width: 640px\) \{[\s\S]*?\n\}/)?.[0] ?? '';
  assert.match(
    compactShell,
    /#app \.command-header,[\s\S]*?#app \.command-actions,[\s\S]*?#app \.version-ribbon \{\s*clip-path: none !important;/
  );
  assert.match(
    compactShell,
    /#app \.tool-nav-shell \{[\s\S]*?position: fixed !important;[\s\S]*?bottom: 0;/
  );
  assert.match(
    compactShell,
    /#app \.tool-nav-inner \{[\s\S]*?min-height: calc\(68px \+ var\(--ff-safe-bottom\)\);[\s\S]*?padding: 3px 3px calc\(3px \+ var\(--ff-safe-bottom\)\) !important;/
  );
  assert.match(
    compactShell,
    /padding-block: max\(7px, var\(--ff-safe-top\)\) var\(--shell-mobile-nav-clearance\) !important;/
  );
  assert.match(
    compactShell,
    /--shell-mobile-nav-clearance: calc\(96px \+ var\(--ff-safe-bottom\)\)/
  );
});

test('admin and Eden mobile headers reserve full-width clocks', () => {
  assert.match(
    mobileCss,
    /body\.admin-standalone-page \.admin-command-actions \.global-game-clock \{[\s\S]*?overflow: visible !important;[\s\S]*?white-space: nowrap !important;/
  );
  assert.match(
    edenCss,
    /grid-template-columns: minmax\(7rem, 0\.85fr\) minmax\(7\.5rem, 1fr\) 40px !important;/
  );
  assert.match(
    edenCss,
    /\.eden-x1-page \.admin-control-row \.global-game-clock \{[\s\S]*?overflow: visible !important;/
  );
});

test('mobile bottom layers share one safe dock clearance after Comments retirement', () => {
  assert.match(shellCss, /--shell-mobile-nav-clearance:\s*calc\(96px \+ var\(--ff-safe-bottom\)\)/);
  assert.match(
    shellCss,
    /body \.floating-tool-btn--data \{[\s\S]*?bottom:\s*var\(--shell-mobile-nav-clearance\) !important/
  );
  assert.match(
    shellCss,
    /body \.bug-report-fab \{[\s\S]*?bottom:\s*calc\(var\(--shell-mobile-nav-clearance\) \+ var\(--shell-mobile-utility-step\)\) !important/
  );
  assert.doesNotMatch(shellCss, /#commentsSection|\.comments-list/);
  assert.match(
    shellCss,
    /body\.keyboard-open #app \.tool-nav-shell,[\s\S]*?visibility:\s*hidden !important/
  );
});

test('mobile writing mode reacts to focus before the visual viewport and clears after recovery', () => {
  assert.match(appSource, /document\.addEventListener\('focusin'/);
  assert.match(appSource, /focusedEditable \|\| viewportKeyboardOpen/);
  assert.match(appSource, /document\.body\.classList\.toggle\('keyboard-open', keyboardOpen\)/);
  assert.match(appSource, /focusRecoveryTimer = setTimeout\([\s\S]*?180\)/);
  assert.match(
    shellCss,
    /body\.keyboard-open #app \.tool-nav-shell,[\s\S]*?body\.keyboard-open #comboFooterBar \{[\s\S]*?pointer-events:\s*none !important/
  );
  assert.match(
    aiLauncherCss,
    /body\.keyboard-open \.ai-drawer-launcher-shell \{[\s\S]*?pointer-events:\s*none !important/
  );
});

test('mobile install prompt is brief and gets out of the way when writing begins', () => {
  assert.match(pwaSource, /const A2HS_VISIBLE_MS = 20_000/);
  assert.match(
    pwaSource,
    /autoDismissTimer = setTimeout\(\(\) => dismissA2hs\(\{ remember: false \}\), A2HS_VISIBLE_MS\)/
  );
  assert.match(pwaSource, /document\.addEventListener\('focusin'/);
  assert.match(mobileCss, /body\.keyboard-open \.a2hs-banner \{[\s\S]*?pointer-events:\s*none/);
});

test('Manual Builder keeps a compact floating drop dock without stealing hero-list scrolling', () => {
  assert.match(
    mobileCss,
    /#comboFooterBar:not\(\.hidden\) \{[\s\S]*?position: fixed !important;[\s\S]*?bottom: calc\(72px \+ var\(--safe-bottom\)\)/
  );
  assert.match(mobileCss, /#comboFooterBar \.combo-slot \{[\s\S]*?height: 78px !important/);
  assert.match(manualBuilder, /const TOUCH_DRAG_HOLD_MS = 180/);
  assert.match(
    manualBuilder,
    /if \(distance > TOUCH_SCROLL_SLOP_PX\) clearTouchDragCandidate\(\);[\s\S]*?if \(!touchDragHero \|\| !touchDragGhost\) return;[\s\S]*?e\.preventDefault\(\)/
  );
  assert.match(manualBuilder, /if \(suppressTouchClickHero === hero\.name\)/);
});

test('Combo Generator mobile controls stay in document flow without an empty Velo launcher', () => {
  assert.match(
    mobileCss,
    /#generatorSection \.core-tool-commandbar \{[\s\S]*?position: relative;[\s\S]*?top: auto;[\s\S]*?box-shadow: none;/
  );
  assert.doesNotMatch(
    mobileCss,
    /#generatorSection:has\(#genSelectedCount:not\(\.hidden\)\) \.gen-buttons-row \{[\s\S]*?position: fixed;/
  );
  assert.doesNotMatch(shellCss, /body #generatorSection:has\(#genSelectedCount:not\(\.hidden\)\)/);
  assert.match(aiLauncherCss, /\.ai-drawer-launcher \.velo-mascot__stage \{\s*animation: none;/);
  assert.match(
    aiLauncherCss,
    /body:has\(#generatorSection:not\(\.hidden\)\):has\(#shellMoreTools\) \.ai-drawer-launcher-shell \{[\s\S]*?position: relative;/
  );
});

test('mobile shell and generator text keep a twelve-pixel legibility floor', () => {
  assert.match(
    mobileCss,
    /@media \(max-width: 768px\)[\s\S]*?\.generator-source-note,[\s\S]*?#genClearAllBtn,[\s\S]*?font-size: 0\.75rem !important;/
  );
  assert.match(
    shellCss,
    /@media \(max-width: 768px\)[\s\S]*?#app #tabNavScroll \.tab-pill,[\s\S]*?#app \.site-footer \.footer-disclaimer[\s\S]*?font-size: 0\.75rem !important;/
  );
});
