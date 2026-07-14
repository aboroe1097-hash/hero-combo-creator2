import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appCss = readFileSync('css/app.css', 'utf8');
const shellCss = readFileSync('css/shell-v14.css', 'utf8');
const mobileCss = readFileSync('css/mobile.css', 'utf8');
const edenCss = readFileSync('css/eden-x1.css', 'utf8');
const manualBuilder = readFileSync('js/app-builder.js', 'utf8');

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

test('compact shell clock drops the status dot and reserves readable timer width', () => {
  const compactShell = shellCss.match(/@media \(max-width: 640px\) \{[\s\S]*?\n\}/)?.[0] ?? '';
  assert.match(compactShell, /#app #globalGameClock \{[\s\S]*?flex: 0 0 84px/);
  assert.match(compactShell, /#app #globalGameClock::before \{\s*display: none/);
  assert.doesNotMatch(compactShell, /text-overflow: ellipsis/);
  assert.match(compactShell, /#app \.command-brand \{[\s\S]*?flex: 0 0 36px/);
  assert.match(
    compactShell,
    /#app \.command-header \.command-logo \.command-logo-copy \{[\s\S]*?display: none !important;/
  );
  assert.match(
    compactShell,
    /#app \.lang-select-wrapper,[\s\S]*?#app \.lang-select-shell \{[\s\S]*?width: 44px/
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
    /body\.keyboard-open \.floating-tool-btn,[\s\S]*?visibility:\s*hidden !important/
  );
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
