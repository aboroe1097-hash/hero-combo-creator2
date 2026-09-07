import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('the dashboard token block is split into theme-scoped authorities', () => {
  const css = read('css/ocr-dashboard.css');

  const dark = css.match(/:root:not\(\[data-theme='light'\]\) #ocrDashboardRoot\s*\{/);
  const light = css.match(/:root\[data-theme='light'\] #ocrDashboardRoot\s*\{/);
  assert.ok(dark, 'dark color authority block must exist');
  assert.ok(light, 'light color authority block must exist');

  assert.match(
    css,
    /:root:not\(\[data-theme='light'\]\) #ocrDashboardRoot\s*\{[\s\S]*?--ff-text: #eef4ff;/
  );
  assert.match(
    css,
    /:root\[data-theme='light'\] #ocrDashboardRoot\s*\{[\s\S]*?--ff-text: #0f172a;/
  );
  assert.match(
    css,
    /:root\[data-theme='light'\] #ocrDashboardRoot\s*\{[\s\S]*?--ff-text-dim: #64748b;/
  );

  assert.ok(
    dark.index < light.index,
    'the light authority block must follow the dark block (source order decides the cascade)'
  );
});

test('retired per-rule light overrides are gone from the dashboard stylesheet', () => {
  const css = read('css/ocr-dashboard.css');

  assert.doesNotMatch(css, /\[data-theme='light'\] #ocrDashboardRoot \.dash-kpi-label\s*\{/);
  assert.doesNotMatch(css, /\[data-theme='light'\] #ocrDashboardRoot \.dash-ops-kicker\s*,/);
  assert.doesNotMatch(css, /\[data-theme='light'\] #ocrDashboardRoot \.dash-metric-label\s*\{/);
  assert.doesNotMatch(
    css,
    /\[data-theme='light'\] #ocrDashboardRoot \.dash-contribution-compare-empty\s*\{/
  );
});

test('promoted dashboard ink/surface pairs carry both theme halves', () => {
  const css = read('css/ocr-dashboard.css');

  assert.match(css, /--ff-dash-ink-0e7490-1: #67e8f9;/);
  assert.match(css, /--ff-dash-ink-0e7490-1: #0e7490;/);
  assert.match(css, /--ff-dash-ink-15803d-1: #86efac;/);
  assert.match(css, /--ff-dash-ink-15803d-1: #15803d;/);
  assert.match(css, /--ff-dash-surface-fff-1: rgba\(15, 23, 42, 0\.5\);/);
  assert.match(css, /--ff-dash-surface-fff-1: #fff;/);
});

test('the Eden frost token block is split into theme-scoped authorities', () => {
  const css = read('css/eden-x1.css');

  const dark = css.match(/:root:not\(\[data-theme='light'\]\) \.eden-x1-page\s*\{/);
  const light = css.match(/:root\[data-theme='light'\] \.eden-x1-page\s*\{/);
  assert.ok(dark, 'dark frost authority block must exist');
  assert.ok(light, 'light frost authority block must exist');
  assert.match(
    css,
    /:root:not\(\[data-theme='light'\]\) \.eden-x1-page\s*\{[\s\S]*?--frost-text: #eef4ff;/
  );
  assert.match(
    css,
    /:root\[data-theme='light'\] \.eden-x1-page\s*\{[\s\S]*?--frost-text: #0f172a;/
  );
  assert.ok(dark.index < light.index, 'the light frost block must follow the dark block');
});

test('towers primary actions are compounded under the page scope', () => {
  const css = read('css/specialization-towers-v2.css');

  assert.match(
    css,
    /\.specialization-towers-page \.specialization-action--primary,[\s\S]*?color: var\(--ff-on-accent\);/
  );
  assert.match(
    css,
    /\.specialization-towers-page \[data-specialization-action='export'\][\s\S]*?background: var\(--ff-action\);/
  );
});

test('the eager-preload regression net stays pinned in check-size', () => {
  const sizeCheck = read('scripts/check-size.mjs');
  assert.match(sizeCheck, /forbiddenInitialFeaturePattern\s*=[\s\S]*?eden-map\|hero-atlas/);
});
