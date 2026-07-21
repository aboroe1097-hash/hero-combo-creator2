import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_TROOPS,
} from '../../js/specialization-towers-v2-data.js';
import {
  buildContributionTemplateCsv,
  buildContributionTemplateRows,
  getContributionInitialVisibility,
} from '../../js/specialization-towers-v2-app.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), 'utf8');

const pageSource = read('specialization-towers.html');
const bootstrapSource = read('js/specialization-towers-v2.js');
const appSource = read('js/specialization-towers-v2-app.js');
const cssSource = read('css/specialization-towers-v2.css');
const viteSource = read('vite.config.js');
const sizeSource = read('scripts/check-size.mjs');

function collectFeatureSources(directory) {
  const sources = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      sources.push(...collectFeatureSources(absolutePath));
      continue;
    }
    const normalizedPath = absolutePath.replaceAll('\\', '/');
    if (
      entry.isFile() &&
      entry.name.endsWith('.js') &&
      normalizedPath.includes('specialization-towers-v2')
    ) {
      sources.push({ path: normalizedPath, source: readFileSync(absolutePath, 'utf8') });
    }
  }
  return sources;
}

function readTagAttributes(tagSource) {
  return new Map(
    [...tagSource.matchAll(/\b([^\s=/>]+)\s*=\s*(["'])(.*?)\2/gisu)].map((match) => [
      match[1].toLowerCase(),
      match[3],
    ])
  );
}

const featureFiles = collectFeatureSources(join(repoRoot, 'js'));
const featureSource = featureFiles.map(({ source }) => source).join('\n');
const renderedSource = `${pageSource}\n${appSource}`;

test('Specialization Towers v2 is a local-only, versioned, public standalone entry', () => {
  const cspMeta = [...pageSource.matchAll(/<meta\b[^>]*>/gisu)]
    .map((match) => readTagAttributes(match[0]))
    .find(
      (attributes) =>
        (attributes.get('http-equiv') || '').toLowerCase() === 'content-security-policy'
    );
  assert.ok(cspMeta, 'the standalone page must declare a Content-Security-Policy');

  const csp = cspMeta.get('content') || '';
  for (const directive of [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
  ]) {
    assert.match(csp, new RegExp(directive.replaceAll(' ', '\\s+')));
  }
  // Browsers ignore frame-ancestors in a meta-delivered policy and emit a console warning.
  // It belongs in an HTTP response header when the production host supports custom headers.
  assert.doesNotMatch(csp, /frame-ancestors/iu);
  assert.doesNotMatch(csp, /(?:https?:|\*)/iu);
  assert.doesNotMatch(appSource, /\bstyle\s*=/iu);
  assert.doesNotMatch(appSource, /\.style\s*\./u);

  for (const match of pageSource.matchAll(/<(?:img|link|script|source)\b[^>]*>/gisu)) {
    const attributes = readTagAttributes(match[0]);
    const asset = attributes.get('src') || attributes.get('href');
    if (!asset) continue;
    const rel = (attributes.get('rel') || '').toLowerCase();
    if (match[0].toLowerCase().startsWith('<link') && rel === 'canonical') continue;
    assert.doesNotMatch(asset, /^(?:https?:)?\/\//iu, `external page asset: ${asset}`);
  }
  assert.doesNotMatch(cssSource, /(?:@import\s+|url\()\s*["']?(?:https?:)?\/\//iu);

  assert.match(pageSource, /<link\b[^>]*href=["']css\/_tokens\.css\?v=[A-Za-z0-9._-]+["'][^>]*>/iu);
  assert.match(
    pageSource,
    /<link\b[^>]*href=["']css\/specialization-towers-v2\.css\?v=[A-Za-z0-9._-]+["'][^>]*>/iu
  );
  assert.match(
    pageSource,
    /<script\b(?=[^>]*type=["']module["'])(?=[^>]*src=["']js\/specialization-towers-v2\.js\?v=[A-Za-z0-9._-]+["'])[^>]*><\/script>/iu
  );
  assert.match(pageSource, /id=["']specializationTowersMount["']/u);
  assert.match(renderedSource, /<h1\b[^>]*>[\s\S]*?<\/h1>/iu);

  const publicSurface = `${pageSource}\n${featureSource}`;
  assert.doesNotMatch(
    publicSurface,
    /admin-pin-gate|admin-auth-config|requireSensitiveAdminPin|Beta Testers Only|\bis-locked\b/iu
  );
  assert.match(
    bootstrapSource,
    /(?:from\s+|import\s*\()["']\.\/specialization-towers-v2-app\.js["']/u
  );
});

test('the public shell exposes semantic theme and language controls', () => {
  assert.match(renderedSource, /<button\b[^>]*data-specialization-theme-toggle[^>]*>/iu);
  assert.match(renderedSource, /<select\b[^>]*data-specialization-language-select[^>]*>/iu);
  assert.match(featureSource, /['"]vts_theme['"]/u);
  assert.match(featureSource, /(?:dataset\.theme|setAttribute\(["']data-theme["'])/u);
  assert.match(featureSource, /vts:language-change/u);
  assert.match(featureSource, /specializationTowersV2Text/u);
});

test('the workspace models three towers and an eight-column game-like progression graph', () => {
  assert.match(appSource, /data-specialization-tower-tabs/u);
  assert.match(appSource, /role=["']tablist["']/u);
  assert.match(appSource, /<button\b[^>]*data-specialization-tower=/u);
  assert.match(appSource, /role=["']tab["']/u);
  assert.match(appSource, /aria-selected=/u);
  assert.deepEqual(SPECIALIZATION_TROOPS, ['footman', 'archer', 'cavalry']);
  assert.equal(Object.keys(SPECIALIZATION_COLUMNS).length, 8);
  for (const column of Object.values(SPECIALIZATION_COLUMNS)) {
    assert.equal(column.researches.length, 4);
  }
  assert.match(appSource, /data-specialization-tower-(?:graph|canvas)/u);
  assert.match(appSource, /data-specialization-column=/u);
  assert.match(appSource, /data-specialization-research=/u);
  assert.match(appSource, /data-specialization-column-progress/u);
  assert.match(appSource, /role=["']progressbar["']/u);
});

test('every column renders four research entries and one medal-free completion skill', () => {
  assert.match(appSource, /<button\b[^>]*data-specialization-open-research/u);
  assert.match(appSource, /data-specialization-column-skill/u);
  assert.match(
    featureSource,
    /(?:requiresMedals\s*:\s*false|medalCost\s*:\s*0|requires_medals\s*:\s*false)/u
  );
  assert.match(
    featureSource,
    /(?:isColumn(?:Skill)?Unlocked|allFourResearchesComplete|research(?:es)?\.every\s*\()/u
  );
  assert.match(
    featureSource,
    /(?:all four|all 4)[\s\S]{0,100}(?:research|badge)|(?:research|badge)[\s\S]{0,100}(?:all four|all 4)/iu
  );
  assert.match(featureSource, /(?:no medals?|medal-free|does not require medals?)/iu);
});

test('public planner research and Legion Skill emblems render from local assets', () => {
  assert.match(appSource, /getSpecializationResearchImage/u);
  assert.match(appSource, /getSpecializationLegionSkillImage/u);
  assert.match(appSource, /specialization-research-image/u);
  assert.match(appSource, /specialization-legion-skill-image/u);
  assert.match(appSource, /specialization-planner-sprite/u);
  assert.match(appSource, /specialization-selection-image/u);
  assert.match(cssSource, /\.specialization-research-image\s*\{/u);
  assert.match(cssSource, /\.specialization-legion-skill-image\s*\{/u);
  assert.doesNotMatch(appSource, /static\.wixstatic\.com/u);
});

test('research inspection exposes internal attribute nodes and four exact milestones', () => {
  assert.match(appSource, /data-specialization-inspector/u);
  assert.match(appSource, /(?:<dialog\b|role=["']dialog["'])/u);
  assert.match(appSource, /data-specialization-attribute-node/u);
  assert.match(appSource, /data-specialization-node-cost/u);
  assert.match(appSource, /data-specialization-milestone/u);
  assert.match(
    featureSource,
    /\b[A-Z_]*MILESTONES?(?:_PERCENTAGES)?\b\s*=\s*(?:Object\.freeze\s*\()?\s*\[\s*25\s*,\s*50\s*,\s*75\s*,\s*100\s*\]/u
  );
});

test('internal paths support evidence-backed progressive reveal without inferred edges', () => {
  assert.match(appSource, /getResearchNodeAccess/u);
  assert.match(appSource, /data-node-state=/u);
  assert.match(appSource, /data-layout=["']\$\{layout\}["']/u);
  assert.match(appSource, /data-specialization-path-evidence/u);
  assert.match(appSource, /data-specialization-hidden-node-count/u);
  assert.match(appSource, /access\.selectable/u);
  assert.match(appSource, /disabled/u);
  assert.match(featureSource, /progressiveReveal/u);
  assert.match(featureSource, /prerequisiteNodeIds/u);
  assert.match(featureSource, /visibleWhenLocked/u);
  for (const csvField of [
    'initial_visibility',
    'prerequisite_node_ids',
    'reveal_after_node_ids',
    'path_branch',
    'evidence_reference',
  ]) {
    assert.match(appSource, new RegExp(`['"]${csvField}['"]`, 'u'));
  }
});

test('contribution CSV rows align and distinguish roots from gated or unverified nodes', () => {
  const { headers, rows } = buildContributionTemplateRows();
  assert.equal(headers.length, 22);
  for (const row of rows) assert.equal(row.length, headers.length);

  const column = (row, name) => row[headers.indexOf(name)];
  const enhancedRows = rows.filter((row) => column(row, 'research_id') === 'enhanced4');
  const byNodeId = new Map(enhancedRows.map((row) => [column(row, 'node_id'), row]));
  assert.equal(column(byNodeId.get(1), 'initial_visibility'), 'available');
  assert.equal(column(byNodeId.get(1), 'path_branch'), 'defense');
  assert.equal(column(byNodeId.get(12), 'initial_visibility'), 'available');
  assert.equal(column(byNodeId.get(12), 'path_branch'), 'siege');
  assert.equal(column(byNodeId.get(2), 'initial_visibility'), 'available');
  assert.equal(column(byNodeId.get(24), 'initial_visibility'), 'visible_locked');
  assert.equal(column(byNodeId.get(24), 'path_branch'), 'convergence');
  assert.equal(
    getContributionInitialVisibility({}, { prerequisiteNodeIds: [1] }),
    'hidden_until_prerequisites'
  );
  assert.match(buildContributionTemplateCsv(), /^\uFEFF"template_version"/u);
});

test('medal totals use only recorded node costs and never a linear completion estimate', () => {
  assert.match(appSource, /data-specialization-recorded-medals/u);
  assert.match(
    featureSource,
    /Only confirmed medal costs are counted\. Unknown costs stay unknown\./u
  );
  assert.doesNotMatch(
    featureSource,
    /(?:estimated medals? spent|medal cost estimate|linear medal estimate|average remaining (?:medal )?cost)/iu
  );
  assert.doesNotMatch(
    featureSource,
    /(?:totalMedalCost|totalRecordedMedals|columnMedalCost)\s*\*\s*(?:completion|progress|percent)/iu
  );
  assert.doesNotMatch(
    featureSource,
    /(?:completion|progress|percent)\s*\*\s*(?:totalMedalCost|totalRecordedMedals|columnMedalCost)/iu
  );
});

test('planning controls cover history, portable state, reset, and contribution debugging', () => {
  for (const action of ['undo', 'redo', 'export', 'import', 'reset']) {
    assert.match(
      appSource,
      new RegExp(`<button\\b[^>]*data-specialization-action=["']${action}["']`, 'u')
    );
  }
  assert.match(
    appSource,
    /<input\b[^>]*type=["']file["'][^>]*accept=["'][^"']*(?:\.json|application\/json)/u
  );
  assert.match(featureSource, /['"]vts_specialization_towers_v2['"]/u);
  assert.match(appSource, /data-specialization-contribution-breakdown/u);
  assert.match(featureSource, /buildStatContributionSnapshot/u);
  assert.match(featureSource, /(?:statKey|effectKey)/u);
  assert.match(featureSource, /(?:sourceId|source\s*:)/u);
});

test('mobile CSS keeps toolbar, tabs, summary, dialogs, and graph reachable', () => {
  const mobile800 = cssSource.slice(cssSource.search(/@media\s*\(max-width:\s*800px\)/u));
  const mobile640 = cssSource.slice(cssSource.search(/@media\s*\(max-width:\s*640px\)/u));
  assert.match(mobile800, /\.specialization-toolbar[\s\S]*overflow-x:\s*auto/u);
  assert.match(mobile800, /\.specialization-toolbar-group[\s\S]*flex:\s*0\s+0\s+auto/u);
  assert.match(mobile800, /scrollbar-width:\s*thin/u);
  assert.match(mobile640, /\.specialization-tower-tabs[\s\S]*overflow-x:\s*auto/u);
  assert.match(mobile640, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/u);
  assert.match(
    cssSource,
    /@media\s*\(max-width:\s*900px\)[\s\S]*dialog\[data-specialization-inspector\][\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/u
  );
  assert.match(cssSource, /\.specialization-milestone-value[\s\S]*overflow-wrap:\s*anywhere/u);
  assert.match(cssSource, /100dvh/u);
  assert.match(cssSource, /scroll-padding-block:[^;]*--ff-safe/u);
  assert.match(cssSource, /\.specialization-title-block\s*\{[^}]*min-width:\s*0/u);
  assert.match(cssSource, /\.specialization-header__meta\s*\{[^}]*flex-wrap:\s*wrap/u);
  assert.match(
    cssSource,
    /\[dir=['"]rtl['"]\]\s+\.specialization-toolbar[\s\S]*mask-image:\s*linear-gradient\(270deg/u
  );
});

test('mobile app preserves active tower, column status, and medal editor context across refreshes', () => {
  assert.match(appSource, /ACTIVE_TOWER_KEY/u);
  assert.match(appSource, /tabScrollLeft/u);
  assert.match(appSource, /revealActiveTowerTab/u);
  assert.match(appSource, /mobileInspectorScrollTop/u);
  assert.match(appSource, /findMatchingControl\(mobileInspector, focusDescriptor\)/u);
  assert.match(appSource, /restoreControl/u);
  assert.match(appSource, /progress\.completedNodes\s*===\s*0/u);
  assert.match(appSource, /selectNodeBeforeMedals/u);
});

test('the specialization module family stays independent from Battle Simulator', () => {
  assert.ok(featureFiles.length >= 2, 'expected bootstrap and app modules in the feature family');
  for (const { path, source } of featureFiles) {
    assert.doesNotMatch(
      source,
      /(?:from\s+|import\s*\()["'][^"']*battle-simulator[^"']*["']/u,
      path
    );
  }
});

test('Vite and size checks treat Specialization Towers as a route-isolated entry', () => {
  assert.match(
    viteSource,
    /['"]specialization-towers['"]\s*:\s*resolve\(__dirname,\s*['"]specialization-towers\.html['"]\)/u
  );
  assert.match(
    sizeSource,
    /['"]specialization-towers\.html['"]\s*:\s*\{\s*desktop:\s*\d+\s*\*\s*1024,\s*mobile:\s*\d+\s*\*\s*1024\s*\}/u
  );
});
