import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const indexHtml = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../../js/app.js', import.meta.url), 'utf8');
const drawerSource = fs.readFileSync(new URL('../../js/ai-drawer.js', import.meta.url), 'utf8');
const shellSource = fs.readFileSync(new URL('../../js/shell-v14.js', import.meta.url), 'utf8');
const assistantSource = fs.readFileSync(
  new URL('../../js/ai-assistant.js', import.meta.url),
  'utf8'
);
const assistantTemplate = fs.readFileSync(
  new URL('../../tabs/ai-assistant.html', import.meta.url),
  'utf8'
);
const standaloneHtml = ['admin', 'arcade', 'eden-x1']
  .map((page) => fs.readFileSync(new URL(`../../${page}.html`, import.meta.url), 'utf8'))
  .join('\n');
const standaloneLanguageSources = ['admin-page', 'arcade', 'eden-x1']
  .map((module) => fs.readFileSync(new URL(`../../js/${module}.js`, import.meta.url), 'utf8'))
  .join('\n');
const mascotSource = fs.readFileSync(new URL('../../js/velo-mascot.js', import.meta.url), 'utf8');
const launcherCss = fs.readFileSync(
  new URL('../../public/ai-launcher-critical.css', import.meta.url),
  'utf8'
);
const viteConfig = fs.readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8');
const assistantCss = fs.readFileSync(
  new URL('../../css/ai-assistant.css', import.meta.url),
  'utf8'
);
const translationsSource = fs.readFileSync(
  new URL('../../js/translations.js', import.meta.url),
  'utf8'
);
const localeSources = ['en', 'ar', 'de', 'es', 'fr', 'id', 'kr', 'pt', 'ru', 'tr', 'zh']
  .map((locale) => fs.readFileSync(new URL(`../../js/i18n/${locale}.js`, import.meta.url), 'utf8'))
  .join('\n');

test('AI assistant is exposed as a floating drawer instead of a main navigation tab', () => {
  assert.match(drawerSource, /id="aiDrawerLauncher"/);
  assert.match(drawerSource, /id="aiDrawer"[\s\S]*role="dialog"/);
  assert.match(indexHtml, /src="js\/ai-drawer\.js\?v=/);
  assert.doesNotMatch(appSource, /import ['"]\.\/ai-drawer\.js['"]/);
  assert.doesNotMatch(indexHtml, /id="tabAi"/);
  assert.match(drawerSource, /fetch\('tabs\/ai-assistant\.html'\)/);
  assert.doesNotMatch(drawerSource, /ai-assistant\.css/);
  assert.match(assistantSource, /ai-assistant\.css/);
  assert.match(drawerSource, /event\.key === 'Escape'/);
  assert.match(drawerSource, /aria-modal="false"/);
  assert.match(drawerSource, /matchMedia\?\.\('\(max-width: 620px\)'\)/);
  assert.match(drawerSource, /backdrop\.hidden = !open \|\| !modal/);
  assert.match(drawerSource, /event\.key !== 'Tab' \|\| !isModalDrawer\(\)/);
  assert.doesNotMatch(indexHtml, /id="aiMobileMoreEntry"/);
  assert.doesNotMatch(drawerSource, /vtsShellCloseMore/);
  assert.match(shellSource, /else if \(!consumeHistory\) replaceMoreHistoryState\(\)/);
  assert.match(
    launcherCss,
    /body:has\(#shellMoreTools\) \.ai-drawer-launcher-shell \{[\s\S]*bottom: calc\(96px \+ env\(safe-area-inset-bottom\)\)/
  );
  assert.match(
    indexHtml,
    /name="vts-ai-endpoint"\s+content="https:\/\/vts-ai-strategy-assistant\.aboroe1097\.workers\.dev"/
  );
  assert.match(
    indexHtml,
    /connect-src[^;]*https:\/\/vts-ai-strategy-assistant\.aboroe1097\.workers\.dev/
  );
  assert.doesNotMatch(
    indexHtml,
    /name="vts-ai-endpoint"\s+content="https:\/\/delicate-term-725f\.aboroe1097\.workers\.dev"/
  );
  assert.equal((standaloneHtml.match(/src="js\/ai-drawer\.js\?v=/g) || []).length, 3);
  assert.equal((standaloneHtml.match(/name="vts-ai-endpoint"/g) || []).length, 3);
  assert.equal(
    (standaloneHtml.match(/https:\/\/vts-ai-strategy-assistant\.aboroe1097\.workers\.dev/g) || [])
      .length,
    6
  );
});

test('the eager launcher stylesheet is available during local Vite development', () => {
  assert.match(viteConfig, /function serveAiLauncherCriticalCss\(\)/);
  assert.match(viteConfig, /pathname !== '\/ai-launcher-critical\.css'/);
  assert.match(viteConfig, /plugins: \[serveAiLauncherCriticalCss\(\)\]/);
});

test('Velo branding replaces provider-led assistant chrome with an animated mascot', () => {
  assert.match(drawerSource, /Talk with Velo/);
  assert.match(drawerSource, /VTS Assistant/);
  assert.match(assistantTemplate, /data-i18n="ai\.kicker">VTS Assistant<\/span>/);
  assert.match(assistantTemplate, /data-ai-nav="arcade"[\s\S]*?data-i18n="ai\.suggestion\.arcade"/);
  assert.doesNotMatch(localeSources, /VTS Assistant ·/);
  assert.doesNotMatch(`${drawerSource}\n${assistantTemplate}\n${localeSources}`, /Veteran Losers/i);
  assert.match(mascotSource, /VELO_ASSET_ROOT = 'assets\/velo'/);
  assert.match(mascotSource, /velo-body\.webp/);
  assert.match(mascotSource, /velo-helmet\.webp/);
  assert.match(mascotSource, /velo-burst\.webp/);
  assert.match(mascotSource, /velo-mascot__horn--left/);
  assert.match(mascotSource, /velo-mascot__eye--right/);
  assert.match(assistantTemplate, /data-velo-mascot="hero"/);
  assert.match(assistantSource, /dataset\.veloState = this\.busy \? 'thinking' : 'idle'/);
  assert.match(assistantSource, /createVeloMascot\('typing'\)/);
  assert.doesNotMatch(assistantSource, /ai-incomplete-badge/);
  assert.match(assistantSource, /let bufferedText = ''/);
  assert.match(assistantSource, /remaining: quota\.remaining/);
  assert.match(assistantSource, /reset: quota\.reset/);
  assert.match(assistantCss, /prefers-reduced-motion: reduce/);
  assert.match(assistantCss, /\.ai-button \{[\s\S]*?min-height: 44px;/);
  assert.match(assistantCss, /\.ai-more-ideas \{[\s\S]*?min-height: 44px;/);
  assert.match(assistantCss, /\.ai-consent-option > span \{[\s\S]*?flex-direction: column;/);
  assert.match(assistantCss, /\.ai-dialog-actions \{[\s\S]*?display: flex;/);
  assert.match(assistantCss, /\.ai-dialog \{[\s\S]*?overscroll-behavior: contain;/);
  assert.match(launcherCss, /@keyframes velo-helmet-story/);
  assert.match(launcherCss, /@keyframes velo-anger-tint/);
  assert.match(launcherCss, /@keyframes velo-rage-burst/);
  assert.match(launcherCss, /@keyframes velo-helmet-reaction/);
  assert.match(launcherCss, /@keyframes velo-helmet-eye-glint/);
  assert.match(launcherCss, /@keyframes velo-fire-puff/);
  assert.match(launcherCss, /@keyframes velo-header-thinking/);
  assert.match(drawerSource, /LAUNCHER_COMPACT_KEY = 'vts_ai_launcher_compact'/);
  assert.match(drawerSource, /id="aiDrawerLauncherCompact"/);
  assert.match(drawerSource, /setLauncherCompact\(compact, \{ persist: true \}\)/);
  assert.match(
    launcherCss,
    /\.ai-drawer-launcher \.velo-mascot__burst \{[\s\S]*animation: velo-rage-burst 20s/
  );
  assert.match(launcherCss, /20s helmet story: calm 2s, slip\/fix, calm 3s, slip\/fix/);
  assert.match(launcherCss, /calm 4s, rage\/burst,[\s\S]*away 4s/);
  assert.match(launcherCss, /0%,\s*10% \{\s*transform: translateY\(-29%\)/);
  assert.match(launcherCss, /18%,\s*33% \{\s*transform: translateY\(-29%\)/);
  assert.match(launcherCss, /41%,\s*61% \{\s*transform: translateY\(-29%\)/);
  assert.match(launcherCss, /\.velo-mascot__horn--left[\s\S]*clip-path/);
  assert.match(launcherCss, /\.velo-mascot__eye[\s\S]*radial-gradient/);
  assert.match(launcherCss, /68%,\s*74% \{[\s\S]*#ff4a3d[\s\S]*#a60000/);
  assert.match(launcherCss, /75\.1%,\s*95% \{[\s\S]*opacity: 0/);
  assert.match(launcherCss, /72% \{[\s\S]*opacity: 1;[\s\S]*scale\(1\.04\)/);
  assert.doesNotMatch(
    assistantCss,
    /\.velo-mascot--header \.velo-mascot__burst \{[\s\S]*display: none;/
  );
  assert.match(assistantCss, /\.velo-mascot--hero\s*\{[\s\S]*drop-shadow/);
  assert.match(
    assistantCss,
    /\.velo-mascot--typing \.velo-mascot__burst \{[\s\S]*inset: 24% auto auto 49%/
  );
  assert.match(assistantCss, /\.ai-message\[hidden\] \{[\s\S]*display: none;/);
  assert.match(assistantSource, /'malformed_tool_request'/);
  assert.match(assistantSource, /deriveContextualActions\(bufferedText, translate\)/);
  assert.match(assistantCss, /\.velo-mascot--message \.velo-mascot__helmet,[\s\S]*display: none;/);
  assert.match(assistantCss, /\.ai-drawer \.ai-assistant \{[\s\S]*height: 100%/);
  assert.match(
    assistantCss,
    /@media \(max-width: 620px\)[\s\S]*\.ai-drawer \.ai-composer \{[\s\S]*display: grid;/
  );
  assert.match(assistantSource, /this\.messages\.length === 0 \|\| this\.userNearBottom/);
  assert.match(
    launcherCss,
    /\.ai-drawer-launcher \.velo-mascot \{[\s\S]*width: 3\.15rem;[\s\S]*height: 3\.15rem;[\s\S]*overflow: visible;/
  );
  assert.match(launcherCss, /\.ai-drawer-launcher \.velo-mascot img \{[\s\S]*position: absolute;/);
  assert.doesNotMatch(assistantTemplate, /strategy sidekick/i);
  assert.doesNotMatch(`${drawerSource}\n${assistantSource}\n${assistantTemplate}`, /gemini/i);
  assert.doesNotMatch(localeSources, /gemini/i);
  assert.equal((localeSources.match(/'ai\.assistantLabel': 'Velo'/g) || []).length, 11);
  assert.equal((localeSources.match(/'ai\.you':/g) || []).length, 11);
  assert.equal((localeSources.match(/'ai\.status\.veloThinking':/g) || []).length, 11);
  assert.equal((localeSources.match(/'ai\.launcherCollapse':/g) || []).length, 11);
  assert.equal((localeSources.match(/'ai\.launcherExpand':/g) || []).length, 11);
  assert.doesNotMatch(translationsSource, /i18n\/[a-z]+\.js\?v=/);
  assert.match(drawerSource, /loadTranslationsForLanguage\(currentLanguage\)/);
  assert.match(drawerSource, /vts:language-change/);
  assert.match(drawerSource, /notifyAiLanguageChange/);
  assert.match(appSource, /vts:language-change/);
  assert.equal((standaloneLanguageSources.match(/setCurrentLanguage\(lang\)/g) || []).length, 3);
  assert.equal((standaloneLanguageSources.match(/vts:language-change/g) || []).length, 3);
  assert.match(localeSources, /dmPlannerTitle: 'Dragon-Master-Set-Planer'/);
});

test('legacy Bug and Data floating pills are no longer initialized', () => {
  assert.doesNotMatch(appSource, /initBugReportWidget/);
  assert.doesNotMatch(appSource, /initUserDataPortability/);
});

test('tool continuations capture the signed state event before sending results', () => {
  assert.match(assistantSource, /event === 'state'/);
  assert.match(assistantSource, /providerState: continuationState\.providerState/);
  assert.match(assistantSource, /continuationToken: continuationState\.continuationToken/);
  assert.doesNotMatch(
    assistantSource,
    /input: \{ kind: 'tool_results', results: toolResults \},\s*history:/
  );
});

test('saved Research status requests are routed through consented app progress', () => {
  assert.match(assistantSource, /export function inferSavedDataCategory\(prompt\)/);
  assert.match(assistantSource, /export function inferRequiredSavedCategories\(prompt\)/);
  assert.match(assistantSource, /showSavedSetupGuide\(prompt, missingCategories\)/);
  assert.match(assistantTemplate, /data-ai-categories="selected_heroes,research_progress,dm_plan"/);
  assert.match(assistantTemplate, /data-ai-key="ai\.suggestion\.account"/);
  assert.match(assistantSource, /return 'research_progress'/);
  assert.match(
    assistantSource,
    /inferredCategory &&[\s\S]*?hasRawSavedState\(inferredCategory\)[\s\S]*?!this\.grants\.has\(inferredCategory\)[\s\S]*?openConsent\(\{ category: inferredCategory, prompt \}\)/
  );
  assert.match(
    assistantSource,
    /syncConsentUi\(preferredCategory = ''\)[\s\S]*?input\.checked = available;/
  );
});
