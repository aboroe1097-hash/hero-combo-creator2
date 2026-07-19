import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('late main-tool rules cannot re-darken light-theme controls and surfaces', () => {
  const css = read('css/app.css');
  const components = read('css/components.css');
  const heroTooltip = read('js/app-hero-tooltip.js');
  const mobile = read('css/mobile.css');

  assert.match(
    css,
    /\[data-theme='light'\] #comboFooterBar\s*\{[\s\S]*?background: rgba\(255, 255, 255, 0\.97\) !important/
  );
  assert.match(
    css,
    /\[data-theme='light'\] #saveComboBtn,[\s\S]*?linear-gradient\(135deg, #047857, #166534\) !important/
  );
  assert.match(
    css,
    /\[data-theme='light'\] #generateRandomBtn\s*\{[\s\S]*?linear-gradient\(135deg, #92400e, #9a3412\) !important/
  );
  assert.match(
    css,
    /\[data-theme='light'\] #feedbackMailBtn\s*\{[\s\S]*?background: #fffbeb !important/
  );
  assert.match(
    css,
    /@media \(min-width: 769px\)[\s\S]*?\.hero-card \.info-btn\s*\{[\s\S]*?width: 36px !important/
  );
  assert.match(
    mobile,
    /\[data-theme='light'\] #generatorSection #generateCombosBtn\s*\{[\s\S]*?linear-gradient\(135deg, #047857, #166534\) !important/
  );
  assert.match(
    mobile,
    /#heroesSortSelect,[\s\S]*?\.arcade-leaderboard-tab[\s\S]*?min-height: 44px !important/
  );
  assert.match(
    components,
    /\[data-theme='light'\] \.hero-tooltip-title\s*\{[\s\S]*?color: #0f172a;[\s\S]*?text-shadow: none/
  );
  assert.match(components, /\[data-theme='light'\] \.hero-tooltip-desc\s*\{[\s\S]*?color: #334155/);
  assert.match(
    components,
    /\.hero-tooltip-desc \.skill-value--percent[\s\S]*?background: #e0f2fe;[\s\S]*?color: #075985/
  );
  assert.match(
    heroTooltip,
    /window\.addEventListener\([\s\S]*?'resize'[\s\S]*?moveHeroTooltip\(\{[\s\S]*?window\.innerWidth \/ 2/
  );
  assert.match(heroTooltip, /aria-label="\$\{escapeHtml\(heroUi\('closeHeroInfo'\)\)\}"/);
  assert.match(
    components,
    /\[data-theme='light'\] \[data-core-tool\] \.generator-card\.generator-card-selected\s*\{[\s\S]*?border-color: #0284c7 !important;[\s\S]*?background:[\s\S]*?#ecfeff !important;[\s\S]*?generator-light-selection-pulse/
  );
  assert.match(
    components,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.generator-card\.generator-card-selected\s*\{[\s\S]*?animation: none !important/
  );
});

test('the retired cinematic entry gate cannot block the app shell', () => {
  const index = read('index.html');
  const loading = read('js/app-loading.js');
  assert.match(index, /<body>/);
  assert.doesNotMatch(index, /id="appBootSplash"|id="firstVisitIntro"|dreamy-wing|blazing-wing/);
  assert.match(index, /id="app" class="app-shell app-shell--revealed"/);
  assert.match(loading, /export function initAppLoading\(\) \{\s*revealAppShell\(\);/);
  assert.doesNotMatch(loading, /introPreview|vts_intro_v1_seen|setTimeout/);
});

test('the retired Quick Tour cannot activate on any device', () => {
  const runtime = [
    read('js/app.js'),
    read('js/app-shortcuts.js'),
    read('js/shell-v14.js'),
    read('css/app.css'),
    read('css/shell-v14.css'),
  ].join('\n');
  assert.doesNotMatch(runtime, /quickTour|quick-tour|vts_quick_tour_done/);
});

test('feature-owned light themes use readable action colors', () => {
  const shell = read('css/shell-v14.css');
  const research = read('css/research-v14.css');
  const materials = read('css/materials.css');
  const secondary = read('css/secondary-tools-v14.css');

  assert.match(
    shell,
    /\[data-theme='light'\] #app #tabNavScroll \.tab-pill\.tab-pill-active,[\s\S]*?color: #075985 !important/
  );
  assert.match(
    research,
    /research-season-max\s*\{\s*color: color-mix\(in srgb, var\(--season-color\) 36%, #10243b\)/
  );
  assert.match(materials, /dm-route-card\[data-dm-tier\][\s\S]*?color: var\(--dm-tier-ink\)/);
  assert.match(
    secondary,
    /\[data-theme='light'\] :is\(\.eden-layer-btn, \.eden-quick-btn\)\.active,[\s\S]*?color: #ffffff !important/
  );
  assert.match(
    secondary,
    /\.eden-guide-step-pill,[\s\S]*?\.eden-guide-done-btn,[\s\S]*?\.eden-guide-nav-btn[\s\S]*?min-height: 32px/
  );
  assert.match(
    secondary,
    /@media \(max-width: 768px\)[\s\S]*?#edenMapSection \.eden-tool-btn,[\s\S]*?min-height: 44px !important/
  );
  assert.match(
    materials,
    /button\[data-dm-focus-set\],[\s\S]*?button\[data-dm-view\][\s\S]*?min-height: 44px/
  );
  assert.match(
    materials,
    /button\[data-dm-complete-location='mobile'\][\s\S]*?color: #ffffff !important/
  );
});

test('standalone lobby and footer have explicit light surfaces', () => {
  const arcade = read('css/arcade.css');
  const dashboard = read('css/ocr-dashboard.css');
  const footer = read('css/standalone-footer-v14.css');
  const eden = read('tabs/eden-map.html');

  assert.match(
    arcade,
    /\[data-theme='light'\] \.arcade-panel \.arcade-card\s*\{[\s\S]*?background: rgba\(255, 255, 255, 0\.94\)/
  );
  assert.match(
    arcade,
    /@media \(max-width: 768px\)[\s\S]*?\.arcade-leaderboard-tab\s*\{[\s\S]*?min-height: 44px/
  );
  assert.match(
    footer,
    /\[data-theme='light'\] \.standalone-footer-legal \.disclaimer\s*\{[\s\S]*?color: #52657b !important/
  );
  assert.match(
    dashboard,
    /\[data-theme='light'\] #ocrDashboardRoot \.dash-login-title\s*\{[\s\S]*?color: #10243b/
  );
  assert.match(eden, /id="edenZoomOut"[^>]*data-i18n-aria="edenZoomOutTitle"/);
  assert.match(eden, /id="edenZoomIn"[^>]*data-i18n-aria="edenZoomInTitle"/);
});

test('aggregate CSS budget records the current route-isolated feature baseline', () => {
  const sizeCheck = read('scripts/check-size.mjs');

  assert.match(sizeCheck, /Specialization Towers, Alliance View, Skin Atlas, and All-Star BoH/);
  assert.match(sizeCheck, /8117\.7 KiB/);
  assert.match(sizeCheck, /1310\.6 KiB/);
  assert.match(sizeCheck, /totalJsBytes: 8125 \* 1024/);
  assert.match(sizeCheck, /entryCssBytes: 405 \* 1024/);
  assert.match(sizeCheck, /totalCssBytes: 1312 \* 1024/);
  assert.match(sizeCheck, /'arcade\.html': \{ desktop: 432 \* 1024, mobile: 525 \* 1024 \}/);
  assert.match(
    sizeCheck,
    /'battle-simulator\.html': \{ desktop: 52 \* 1024, mobile: 52 \* 1024 \}/
  );
  assert.match(
    sizeCheck,
    /'specialization-towers\.html': \{ desktop: 80 \* 1024, mobile: 80 \* 1024 \}/
  );
});
