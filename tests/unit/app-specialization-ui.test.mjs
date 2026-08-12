import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), 'utf8');

const appSource = read('js/app-specialization.js');
const cssSource = read('css/app.css');
const integratedSpecCss = cssSource.slice(
  cssSource.indexOf('Specialization Towers — integrated tab'),
  cssSource.indexOf('@keyframes specAckRuleDraw')
);
const mobileSpecCss = cssSource.slice(
  cssSource.indexOf('/* Specialization mobile command view */')
);

test('the tab renders a thin wrapper, not a second graph renderer', () => {
  assert.match(appSource, /data-spec-open-planner/u);
  assert.match(appSource, /href="specialization-towers.html"/u);
  assert.match(appSource, /specialization-towers-v2-model\.js/u);
  assert.doesNotMatch(appSource, /renderRing|renderTree|renderNodeGraph/u);
  assert.doesNotMatch(appSource, /BADGE_ICON|NODE_ICON/u);
  assert.doesNotMatch(appSource, /spec-badge-max|data-spec-quick-set/u);
  assert.doesNotMatch(appSource, /data-spec-open-research|data-spec-legion/u);
});

test('the thin wrapper keeps the summary, troop tabs, community, and acknowledgments', () => {
  for (const symbol of [
    'renderSummary',
    'renderTroopTabs',
    'renderPlannerCard',
    'renderCommunity',
    'renderAcknowledgments',
  ]) {
    assert.match(appSource, new RegExp(`function ${symbol}\\(`, 'u'));
  }
  assert.match(appSource, /initSpecializationTool\(\)/u);
  assert.match(appSource, /loadSpecializationState/u);
  assert.match(appSource, /getSpecializationSummary/u);
  assert.match(appSource, /getCurrentUser|onUserChanged/u);
});

test('integrated Specialization uses scoped semantic VTS tokens', () => {
  for (const token of [
    '--spec-panel',
    '--spec-border',
    '--spec-text',
    '--spec-action',
    '--spec-success',
    '--spec-danger',
    '--spec-gold',
    '--spec-primary-gradient',
  ]) {
    assert.match(integratedSpecCss, new RegExp(`${token}:\\s*var\\(\\s*--ff-`, 'u'));
  }
});

test('the planner card is styled with spec tokens and a primary link', () => {
  assert.match(
    integratedSpecCss,
    /\.spec-planner-card\s*\{[\s\S]*?background:[\s\S]*?var\(--spec-panel\)/u
  );
  assert.match(
    integratedSpecCss,
    /\.spec-planner-card-link\s*\{[\s\S]*?background:\s*var\(--spec-primary-gradient\)/u
  );
  assert.match(
    integratedSpecCss,
    /\.spec-planner-card-link:focus-visible\s*\{[\s\S]*?--spec-focus-ring/u
  );
});

test('mobile planner card stacks to one full-width column', () => {
  assert.match(
    cssSource,
    /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.spec-planner-card\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/u
  );
  assert.match(cssSource, /\.spec-planner-card-link\s*\{[\s\S]*?justify-self:\s*stretch/u);
});

test('mobile integrated troop tabs become three compact icon-only controls', () => {
  assert.match(
    mobileSpecCss,
    /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.spec-troop-tabs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/u
  );
  assert.match(mobileSpecCss, /\.spec-troop-tab\s*\{[\s\S]*?min-height:\s*44px/u);
  assert.match(mobileSpecCss, /\.spec-troop-tab\s*\{[\s\S]*?place-items:\s*center/u);
  assert.match(mobileSpecCss, /\.spec-troop-icon\s*\{[\s\S]*?font-size:\s*1\.42rem/u);
  assert.match(
    mobileSpecCss,
    /\.spec-troop-name,\s*\.spec-troop-pct\s*\{[\s\S]*?clip-path:\s*inset\(50%\)/u
  );
  assert.match(
    integratedSpecCss,
    /\.spec-troop-tab:focus-visible\s*\{[\s\S]*?box-shadow:\s*var\(--spec-focus-ring\)/u
  );
});

test('light theme keeps summary and community surfaces legible', () => {
  assert.match(cssSource, /\[data-theme='light'\] \.spec-summary[\s\S]*?var\(--spec-panel\)/u);
  assert.match(
    cssSource,
    /\[data-theme='light'\] \.spec-community[\s\S]*?background:\s*var\(--spec-panel\)/u
  );
});
