import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appCss = readFileSync('css/app.css', 'utf8');
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
  assert.match(compactShell, /#app #globalGameClock \{[\s\S]*?flex: 0 0 84px/);
  assert.match(compactShell, /#app #globalGameClock::before \{\s*display: none/);
  assert.doesNotMatch(compactShell, /text-overflow: ellipsis/);
  assert.match(
    compactShell,
    /#app \.command-header \{[\s\S]*?position: relative !important;[\s\S]*?flex-direction: column;[\s\S]*?overflow: visible !important/
  );
  assert.match(compactShell, /#app \.command-brand \{[\s\S]*?flex-direction: column/);
  assert.match(
    compactShell,
    /#app \.version-ribbon \{[\s\S]*?display: block !important;[\s\S]*?width: auto !important;[\s\S]*?font-size: 0\.75rem !important;/
  );
  assert.match(
    compactShell,
    /#app \.command-header \.command-logo \.shell-brand-title \{[\s\S]*?display: block !important;[\s\S]*?font-size: 0\.75rem !important;/
  );
  assert.match(
    compactShell,
    /#app \.command-logo \.command-logo-copy \{\s*display: none !important;/
  );
  assert.match(
    compactShell,
    /#app \.lang-select-wrapper,[\s\S]*?#app \.lang-select-shell \{[\s\S]*?width: 44px/
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
