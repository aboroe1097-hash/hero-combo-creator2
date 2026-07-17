import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), 'utf8');

const pageSource = read('specialization-towers.html');
const bootstrapSource = read('js/specialization-towers-v2.js');
const appSource = read('js/specialization-towers-v2-app.js');
const cssSource = read('css/specialization-towers-v2.css');
const renderedSource = `${pageSource}\n${appSource}`;

test('the standalone page has one named main workspace and labelled global controls', () => {
  assert.match(pageSource, /<html\b[^>]*lang=["'][^"']+["']/iu);
  assert.match(appSource, /<main\b[^>]*>[\s\S]*?<\/main>/iu);
  assert.match(appSource, /<h1\b[^>]*>[\s\S]*?<\/h1>/iu);
  assert.match(
    renderedSource,
    /<button\b(?=[^>]*data-specialization-theme-toggle)(?=[^>]*aria-label=)[^>]*>/u
  );
  assert.match(
    renderedSource,
    /<select\b(?=[^>]*data-specialization-language-select)(?=[^>]*aria-label=)[^>]*>/u
  );
  assert.match(
    renderedSource,
    /<[^>]+(?=[^>]*data-specialization-tower-(?:graph|canvas))(?=[^>]*role=["']region["'])[^>]*>/u
  );
});

test('tower tabs expose selection state and keyboard navigation', () => {
  assert.match(appSource, /role=["']tablist["']/u);
  assert.match(appSource, /role=["']tab["']/u);
  assert.match(appSource, /aria-selected=/u);
  assert.match(appSource, /aria-controls=/u);
  assert.match(appSource, /tabindex=/u);
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
    assert.match(appSource, new RegExp(`["']${key}["']`, 'u'));
  }
  assert.match(appSource, /\.focus\(\{?[^)]*\)?/u);
});

test('progress, milestones, and internal nodes expose their state to assistive technology', () => {
  assert.match(
    appSource,
    /<[^>]+(?=[^>]*role=["']progressbar["'])(?=[^>]*aria-valuemin=["']0["'])(?=[^>]*aria-valuemax=["']100["'])[^>]*>/u
  );
  assert.match(appSource, /aria-valuenow=/u);
  assert.match(appSource, /aria-valuetext=/u);
  assert.match(
    appSource,
    /<[^>]+(?=[^>]*data-specialization-milestone)(?=[^>]*(?:aria-current|data-status)=)[^>]*>/u
  );
  assert.match(
    appSource,
    /<button\b(?=[^>]*data-specialization-attribute-node)(?=[^>]*aria-pressed=)[^>]*>/u
  );
  assert.match(appSource, /data-node-state=/u);
  assert.match(appSource, /access\.selectable/u);
  assert.match(appSource, /\? ' disabled' : ''/u);
  assert.match(appSource, /data-specialization-node-cost/u);
});

test('all state-changing graph controls are native buttons rather than clickable containers', () => {
  for (const hook of [
    'data-specialization-tower=',
    'data-specialization-open-research',
    'data-specialization-attribute-node',
    'data-specialization-action=',
  ]) {
    assert.match(appSource, new RegExp(`<button\\b[^>]*${hook}`, 'u'));
  }
  assert.doesNotMatch(appSource, /\sonclick\s*=/iu);
  assert.doesNotMatch(
    appSource,
    /<(?:article|div|li)\b[^>]*(?:role=["']button["']|data-specialization-(?:open-research|attribute-node|action)=?)/iu
  );
});

test('the research inspector is modal, Escape-closeable, and restores focus', () => {
  assert.match(appSource, /data-specialization-inspector/u);
  assert.match(appSource, /(?:<dialog\b|role=["']dialog["'])/u);
  assert.match(appSource, /aria-modal=["']true["']/u);
  assert.match(appSource, /aria-labelledby=/u);
  assert.match(appSource, /data-specialization-close-inspector/u);
  assert.match(appSource, /(?:document\.activeElement|returnFocus|restoreTarget|inspectorOpener)/u);
  assert.match(appSource, /(?:event|e)\.key\s*===\s*["']Escape["']/u);
  assert.match(appSource, /(?:showModal\(\)|(?:event|e)\.key\s*!==\s*["']Tab["'])/u);
  assert.match(
    appSource,
    /(?:returnFocus|restoreTarget|inspectorOpener)[\s\S]{0,240}\.focus\(\{?[^)]*\)?/u
  );
});

test('status changes and toasts are announced without stealing focus', () => {
  assert.match(
    renderedSource,
    /<[^>]+(?=[^>]*data-specialization-live)(?=[^>]*role=["']status["'])(?=[^>]*aria-live=["']polite["'])[^>]*>/u
  );
  assert.match(
    renderedSource,
    /<[^>]+(?=[^>]*data-specialization-live)(?=[^>]*aria-atomic=["']true["'])[^>]*>/u
  );
  assert.match(renderedSource, /data-specialization-toast/u);
  assert.match(
    renderedSource,
    /<[^>]+(?=[^>]*data-specialization-toast)(?=[^>]*aria-live=["']polite["'])[^>]*>/u
  );
  assert.doesNotMatch(appSource, /data-specialization-toast[^\n]{0,200}\.focus\(/u);
});

test('theme and locale changes update document state without a reload', () => {
  assert.match(appSource, /['"]vts_theme['"]/u);
  assert.match(appSource, /(?:dataset\.theme|setAttribute\(["']data-theme["'])/u);
  assert.match(appSource, /data-specialization-theme-toggle/u);
  assert.match(appSource, /aria-pressed/u);
  assert.match(appSource, /data-specialization-language-select/u);
  assert.match(appSource, /document\.documentElement\.(?:lang|dir)/u);
  assert.match(appSource, /vts:language-change/u);
  assert.doesNotMatch(bootstrapSource, /location\.reload\(/u);
});

test('feature CSS supports focus, touch targets, light theme, RTL, mobile, and reduced motion', () => {
  assert.match(cssSource, /:focus-visible/u);
  assert.match(cssSource, /min-height:\s*44px/u);
  assert.match(cssSource, /\[data-theme=["']light["']\][^{]*(?:specialization|spec-tower)/u);
  assert.match(cssSource, /\[dir=["']rtl["']\][^{]*(?:specialization|spec-tower)/u);
  assert.match(cssSource, /unicode-bidi:\s*isolate/u);
  assert.match(cssSource, /@media\s*\(max-width:\s*(?:640|720|768)px\)/u);
  assert.match(
    cssSource,
    /data-specialization-tower-(?:graph|canvas)[^{]*\{[\s\S]*?overflow-x:\s*auto/u
  );
  assert.match(cssSource, /@media\s*\(prefers-reduced-motion:\s*reduce\)/u);
  const reducedMotion = cssSource.slice(
    cssSource.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)/u)
  );
  assert.match(reducedMotion, /animation(?:-duration)?:\s*(?:none|0(?:s|ms)?|0\.01ms)/u);
  assert.match(reducedMotion, /transition(?:-duration)?:\s*(?:none|0(?:s|ms)?|0\.01ms)/u);
});
