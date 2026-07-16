import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('js/app-research.js', 'utf8');
const styles = readFileSync('css/research-v14.css', 'utf8');
const researchLocaleCodes = ['en', 'es', 'pt', 'de', 'fr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr'];

test('every dynamic Research UI key is translated in every supported locale', async () => {
  const dynamicKeys = [
    ...new Set([...source.matchAll(/appT\('(research[A-Za-z0-9]+)'/g)].map((match) => match[1])),
  ].sort();
  assert.ok(dynamicKeys.length > 0);

  for (const localeCode of researchLocaleCodes) {
    const locale = (await import(`../../js/i18n/${localeCode}.js`)).default;
    for (const key of dynamicKeys) {
      assert.equal(typeof locale[key], 'string', `${localeCode}.${key} must be a string`);
      assert.ok(locale[key].trim(), `${localeCode}.${key} must not be empty`);
      assert.notEqual(locale[key], key, `${localeCode}.${key} must not render its raw key`);
    }
  }
});

test('research catalog is feature-styled and auto-flows without database grid coordinates', () => {
  assert.match(source, /import '\.\.\/css\/research-v14\.css';/);
  assert.doesNotMatch(source, /dynamic-tech-grid-styles/);
  assert.doesNotMatch(source, /tech-card-pos/);
  assert.doesNotMatch(source, /--desk-(?:row|col)/);
  assert.match(source, /document\.createElement\('article'\)/);
  assert.match(
    styles,
    /\.research-grid\s*\{[\s\S]*?repeat\(auto-fit, minmax\(min\(100%, 280px\), 1fr\)\)/
  );
  assert.doesNotMatch(styles, /\.research-tech-card[^{]*\{[^}]*grid-(?:row|column)\s*:/);
});

test('catalog controls have a stable non-overlapping hierarchy', () => {
  assert.match(
    source,
    /class="research-card-actions"[\s\S]*?class="research-card-buffs"[\s\S]*?class="research-card-max[\s\S]*?class="research-card-cta"/
  );
  assert.match(styles, /\.research-card-buffs,[\s\S]*?position:\s*static\s*!important/);
  assert.match(styles, /\.research-card-actions\s*\{[\s\S]*?grid-template-columns:/);
  assert.match(source, /role="progressbar"[\s\S]*?aria-valuenow=/);
  assert.match(source, /function isTechComplete\(tech\)/);
  assert.match(
    source,
    /setStoredNodeLevels\([\s\S]*?tech\.nodes\.map\([\s\S]*?level: wasComplete \? 0 : node\.maxLevel/
  );
  assert.match(source, /research-tech-card--complete/);
  assert.match(source, /class="research-card-max[\s\S]*?aria-pressed="\$\{isComplete\}"/);
  assert.match(styles, /\.research-card-max\[aria-pressed='true'\]/);
  assert.match(styles, /@keyframes research-card-completion-pulse/);
});

test('Research buff previews use group semantics for their accessible name', () => {
  assert.match(
    source,
    /class="research-card-buff-preview" role="group" aria-label="\$\{escapeHtml\(appT\('researchBuffTopBuffsAria'\)\)\}"/
  );
  assert.doesNotMatch(
    source,
    /class="research-card-buff-preview" aria-label="\$\{escapeHtml\(appT\('researchBuffTopBuffsAria'\)\)\}"/
  );
});

test('season bands persist visibility, default completed seasons closed, and expose reversible MAX controls', () => {
  assert.match(
    source,
    /const RESEARCH_COLLAPSED_SEASONS_KEY = 'vts_research_collapsed_seasons_v1'/
  );
  assert.match(source, /localStorage\.getItem\(RESEARCH_COLLAPSED_SEASONS_KEY\)/);
  assert.match(source, /const RESEARCH_EXPANDED_SEASONS_KEY = 'vts_research_expanded_seasons_v1'/);
  assert.match(source, /localStorage\.setItem\([\s\S]*?RESEARCH_EXPANDED_SEASONS_KEY/);
  assert.match(
    source,
    /function isResearchSeasonCollapsed\(season\) \{[\s\S]*?return isResearchSeasonComplete\(season\);/
  );
  assert.match(source, /function toggleResearchSeasonCollapse\(event, season\)/);
  assert.match(
    source,
    /setResearchSeasonCollapsed\(season, !isCollapsed\);[\s\S]*?renderTechList\(\)/
  );
  assert.match(source, /function toggleResearchSeasonMax\(event, season\)/);
  assert.match(source, /seasonTechs\.length > 0 && seasonTechs\.every\(isTechComplete\)/);
  assert.match(source, /level: wasComplete \? 0 : node\.maxLevel/);
  assert.match(
    source,
    /setStoredNodeLevels\(updates\);[\s\S]*?setResearchSeasonCollapsed\(season, !wasComplete\);[\s\S]*?renderTechList\(\)/
  );
  assert.match(source, /data-research-season-action="collapse"[\s\S]*?aria-expanded=/);
  assert.match(source, /data-research-season-action="max"[\s\S]*?aria-pressed=/);
  assert.match(source, /className = 'research-season-card-group'/);
  assert.match(styles, /\.research-season-card-group\s*\{[\s\S]*?display:\s*contents/);
  assert.match(
    styles,
    /\.research-season-card-group\[hidden\]\s*\{[\s\S]*?display:\s*none\s*!important/
  );
  assert.match(
    styles,
    /:is\(\.research-season-collapse, \.research-season-max\)\s*\{[\s\S]*?min-height:\s*44px/
  );
});

test('filters, dialogs, and tab navigation expose keyboard state', () => {
  assert.match(source, /btn\.setAttribute\('aria-pressed', String\(isActive\)\)/);
  assert.match(source, /allBtn\?\.setAttribute\('aria-pressed', String\(isAll\)\)/);
  assert.match(source, /modal\.setAttribute\('aria-labelledby', 'researchBuffSummaryTitle'\)/);
  assert.match(source, /e\.key !== 'Tab'/);
  assert.match(source, /returnFocus\?\.isConnected/);
  assert.match(source, /function bindResearchTabArrowKeys\(/);
  assert.match(source, /function bindResearchCalculatorDialog\(/);
  assert.match(source, /container\.setAttribute\('role', 'dialog'\)/);
  assert.match(source, /container\.setAttribute\('aria-modal', 'true'\)/);
  assert.match(source, /data-research-section-target=/);
  assert.match(source, /class="research-node-inspector"/);
  assert.match(source, /aria-controls="branch_1"/);
});

test('opened trees expose progression states without changing research costs', () => {
  assert.match(source, /function getGameNodeState\(/);
  assert.match(source, /data-node-state="\$\{nodeState\}"/);
  assert.match(source, /class="game-tree-tier-block" data-tier-state=/);
  assert.match(source, /data-path-state="\$\{(?:tierState|state)\}"/);
  assert.match(styles, /\.game-tech-node-wrap\[data-node-state='progress'\]/);
  assert.match(styles, /\.game-tech-node-wrap\[data-node-state='complete'\]/);
  assert.match(styles, /\.game-tree-connector\[data-path-state='complete'\]/);
});

test('research workspace supports light theme, mobile focus mode, and reduced motion', () => {
  assert.match(source, /function moveResearchCalculatorToPortal\(/);
  assert.match(source, /portal\.className = 'research-v14-workspace'/);
  assert.match(
    styles,
    /:is\(#researchSection, \.research-v14-workspace\) \.research-calculator:not\(\.hidden\)/
  );
  assert.match(styles, /\[data-theme='light'\] :is\(#researchSection, \.research-v14-workspace\)/);
  assert.match(
    styles,
    /@media \(max-width: 640px\)[\s\S]*?\.research-calculator:not\(\.hidden\)[\s\S]*?100dvh/
  );
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /getResearchScrollBehavior\(\)/);
  assert.match(source, /class="research-calc-scrollport custom-scrollbar"/);
  assert.equal(
    (source.match(/class="research-calc-scrollport custom-scrollbar"/g) || []).length,
    2
  );
  assert.match(styles, /grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
  assert.match(
    styles,
    /\.research-calculator:not\(\.hidden\)\s*\{[\s\S]*?overflow:\s*hidden\s*!important/
  );
  assert.match(styles, /\.research-calc-scrollport\s*\{[\s\S]*?overflow:\s*auto\s*!important/);
  assert.match(styles, /\.research-calc-top\s*\{[\s\S]*?position:\s*static/);
  assert.match(styles, /\.research-calc-total\s*\{[\s\S]*?position:\s*static/);
  assert.match(
    styles,
    /\.research-game-tree-viewport\s*\{[\s\S]*?max-height:\s*none\s*!important[\s\S]*?overflow:\s*visible\s*!important/
  );
});

test('buff summary cards expose semantic accents in dark and light themes', () => {
  assert.match(source, /data-buff-tone="\$\{getResearchBuffTone\(buff\.canonicalLabel\)\}"/);
  for (const tone of ['tactical', 'might', 'resistance', 'hp', 'damage', 'speed', 'economy']) {
    assert.match(styles, new RegExp(`data-buff-tone='${tone}'`));
  }
  assert.match(
    styles,
    /\.research-buff-summary-item\s*\{[\s\S]*?--buff-accent:[\s\S]*?radial-gradient[\s\S]*?box-shadow:/
  );
  assert.match(
    styles,
    /\[data-theme='light'\] \.research-buff-summary-item\s*\{[\s\S]*?border-color:[\s\S]*?background:/
  );
});

test('screenshot-backed game trees use exact art and continuous canonical layouts', () => {
  assert.match(source, /import \{ RESEARCH_GAME_LAYOUTS \} from '\.\/research-game-layouts\.js'/);
  assert.match(source, /import \{ resolveResearchNodeArt \} from '\.\/research-game-art\.js'/);
  assert.match(source, /function resolveResearchGameLayout\(/);
  assert.match(source, /function renderGameTreeLayoutHtml\(/);
  assert.match(source, /function applyGameNodeArt\(/);
  assert.doesNotMatch(source, /renderTechNodeIconSvg|resolveTechNodeIcon/);
  assert.match(styles, /\.research-game-workspace\s*\{/);
  assert.match(styles, /\.research-node-inspector\s*\{/);
});

test('live research state resolves real captured art and records fallback provenance', () => {
  assert.match(source, /function getGameNodeArtState\(\) \{[\s\S]*?return 'idle'/);
  assert.match(
    source,
    /resolveResearchNodeArt\([\s\S]*?\{[\s\S]*?preferredState,[\s\S]*?nodeName: node\.name/
  );
  assert.match(source, /wrap\.dataset\.artProvenance = resolution\.provenance/);
  assert.match(source, /wrap\.dataset\.artRequestedKey = resolution\.requestedKey/);
  assert.match(source, /wrap\.dataset\.artSourceKey = resolution\.sourceKey/);
  assert.match(source, /wrap\.dataset\.artMatchedState = resolution\.matchedState/);
  assert.match(source, /resolution\.provenance === 'exact-node-state' \? 'available' : 'fallback'/);
  assert.match(source, /applyGameNodeArt\(wrap, tech, node, getGameNodeArtState\(node, level\)\)/);
  assert.doesNotMatch(
    source,
    /artTarget\.hidden = true;[\s\S]*?art\.observedState !== preferredState/
  );
  assert.match(styles, /\.game-tech-art\s*\{[\s\S]*?background-repeat:\s*no-repeat/);
  assert.match(styles, /data-node-state='idle'\]\s+\.game-tech-art\s*\{[\s\S]*?grayscale\(1\)/);
  assert.match(styles, /data-node-state='progress'\]\s+\.game-tech-art/);
  assert.match(styles, /data-node-state='complete'\]\s+\.game-tech-art/);
});

test('game tree opens at its first node and section navigation stays inside the calculator', () => {
  assert.match(source, /if \(scrollport\) scrollport\.scrollTop = 0/);
  assert.match(source, /scrollport\.scrollTo\(\{ top: Math\.max\(0, top - 8\)/);
});

test('authored research edges render as responsive source-to-target paths', () => {
  assert.match(source, /const authoredEdges = \(edges \|\| \[\]\)\.filter/);
  assert.match(source, /data-edge-from="\$\{escapeHtml\(fromNodeId\)\}"/);
  assert.match(source, /data-edge-to="\$\{escapeHtml\(toNodeId\)\}"/);
  assert.match(source, /layout\.edges/);
  assert.match(styles, /\.game-tree-connector--authored path\s*\{/);
  assert.match(styles, /\.game-tree-connector--authored\s+path\[data-path-state='complete'\]/);
});
