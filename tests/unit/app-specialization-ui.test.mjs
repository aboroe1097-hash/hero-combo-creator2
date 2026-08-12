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

test('integrated troop tabs expose a localized accessible label with progress', () => {
  assert.match(appSource, /const label = `\$\{troopLabel\(troop\)\} \$\{p\}%`;/u);
  assert.match(
    appSource,
    /<button\b[^`]*role="tab"[^`]*aria-selected="\$\{active\}"[^`]*aria-label="\$\{escapeHtml\(label\)\}"[^`]*data-spec-troop="\$\{troop\}"/u
  );
  assert.match(
    appSource,
    /<span class="spec-troop-name">\$\{escapeHtml\(troopLabel\(troop\)\)\}<\/span>/u
  );
  assert.match(appSource, /<span class="spec-troop-pct">\$\{p\}%<\/span>/u);
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

  assert.match(
    integratedSpecCss,
    /\.spec-banner:nth-child\(6n \+ 1\)\s*\{\s*--spec-banner-accent:\s*var\(--spec-action\)/u
  );
  assert.match(
    integratedSpecCss,
    /\.spec-banner:nth-child\(6n \+ 2\)\s*\{\s*--spec-banner-accent:\s*var\(--spec-success\)/u
  );
  assert.match(
    integratedSpecCss,
    /\.spec-banner:nth-child\(6n \+ 3\)\s*\{\s*--spec-banner-accent:\s*var\(--spec-seasonal\)/u
  );
  assert.match(
    integratedSpecCss,
    /\.spec-banner:nth-child\(6n \+ 4\)\s*\{\s*--spec-banner-accent:\s*var\(--spec-urgency\)/u
  );
  assert.match(
    integratedSpecCss,
    /\.spec-banner:nth-child\(6n \+ 5\)\s*\{\s*--spec-banner-accent:\s*var\(--spec-gold\)/u
  );
  assert.match(
    integratedSpecCss,
    /\.spec-banner:nth-child\(6n \+ 6\)\s*\{\s*--spec-banner-accent:\s*var\(--spec-danger\)/u
  );
});

test('integrated quick actions expose semantic MAX and UNMAX states', () => {
  assert.match(
    appSource,
    /class="spec-badge-max\$\{progress\.isComplete \? ' is-unmax' : ''\}"[^>]*data-spec-quick-set="\$\{progress\.isComplete \? 'reset' : 'complete'\}"/u
  );
  assert.match(
    integratedSpecCss,
    /\.spec-badge-max\s*\{[\s\S]*?border:[^;]*var\(--spec-success\)[\s\S]*?color:\s*var\(--spec-success\)/u
  );
  assert.match(
    integratedSpecCss,
    /\.spec-badge-max\.is-unmax\s*\{[\s\S]*?border-color:[^;]*var\(--spec-danger\)[\s\S]*?color:\s*var\(--spec-danger\)/u
  );
  assert.doesNotMatch(
    integratedSpecCss,
    /\.spec-badge-max\s*\{[\s\S]*?border:[^;]*var\(--spec-banner-accent/u
  );
});

test('light Specialization actions and disabled progress use legible semantic colors', () => {
  assert.match(
    integratedSpecCss,
    /\[data-theme='light'\] \.spec-badge-max\s*\{[\s\S]*?color:\s*#0b6245[\s\S]*?background:\s*#e8f6f0/u
  );
  assert.match(
    integratedSpecCss,
    /\[data-theme='light'\] \.spec-badge-max\.is-unmax\s*\{[\s\S]*?color:\s*#a3123a[\s\S]*?background:\s*#fff0f3/u
  );
  assert.match(
    integratedSpecCss,
    /\[data-theme='light'\] \.spec-badge\[data-status='unstarted'\] \.spec-badge-pct\s*\{[\s\S]*?color:\s*#475569[\s\S]*?background:\s*#e2e8f0/u
  );
  assert.match(
    integratedSpecCss,
    /\[data-theme='light'\] \.spec-ring-node\[disabled\]\s*\{[\s\S]*?color:\s*#475569[\s\S]*?opacity:\s*0\.72/u
  );
});

test('integrated Specialization no longer hardcodes known brown surfaces and borders', () => {
  assert.doesNotMatch(
    integratedSpecCss,
    /rgba\((?:120, 90, 40|180, 140, 70|146, 94, 18|30, 22, 10|20, 14, 6|45, 32, 11|39, 27, 10|42, 29, 8|75, 52, 17|22, 17, 10|105, 73, 20|34, 24, 11)\b/u
  );
  assert.doesNotMatch(
    integratedSpecCss,
    /#(?:b45309|7c2d12|4b3a1c|1a120a|78350f|92400e|725c38)\b/iu
  );
});
