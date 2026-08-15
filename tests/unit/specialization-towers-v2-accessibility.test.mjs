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
const integratedAppSource = read('js/app-specialization.js');
const integratedCssSource = read('css/app.css');

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
  assert.match(appSource, /addEventListener\(["']cancel["'],\s*handleDialogCancel,\s*true\)/u);
  assert.match(appSource, /removeEventListener\(["']cancel["'],\s*handleDialogCancel,\s*true\)/u);
  assert.match(appSource, /event\.target\.hasAttribute\(["']data-specialization-inspector["']\)/u);
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

test('mobile graph exposes an atomic column position status without replacing graph scroll', () => {
  assert.match(renderedSource, /data-specialization-column-position/u);
  assert.match(
    renderedSource,
    /<[^>]+(?=[^>]*data-specialization-column-position)(?=[^>]*role=["']status["'])(?=[^>]*aria-live=["']polite["'])(?=[^>]*aria-atomic=["']true["'])[^>]*>/u
  );
  assert.match(appSource, /progressOf/u);
  assert.match(appSource, /columnPositionText/u);
  assert.match(appSource, /leadingVisibleColumnId/u);
  assert.match(appSource, /requestAnimationFrame/u);
  assert.match(appSource, /SPECIALIZATION_COLUMN_COUNT/u);
  assert.match(cssSource, /\.specialization-column-position-dot/u);
  assert.match(
    cssSource,
    /data-specialization-tower-(?:graph|canvas)[^{]*\{[\s\S]*?overflow-x:\s*auto/u
  );
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

test('the integrated path planner exposes hero synergies through a native disclosure', () => {
  // Native details/summary: keyboard accessible by construction, and the full
  // mechanic notes (hero note + keyMechanics) must not be capped to a preview.
  assert.match(
    integratedAppSource,
    /<details class="spec-synergy" data-spec-synergies>\s*<summary>/u
  );
  assert.match(integratedAppSource, /renderHeroSynergies/u);
  assert.doesNotMatch(integratedAppSource, /\.slice\(0,\s*3\)/u);
  assert.match(integratedAppSource, /entry\.mechanics/u);
  assert.match(integratedAppSource, /entry\.note/u);
  // The always-open flat notes block is gone, along with its 3-note cap.
  assert.doesNotMatch(integratedAppSource, /spec-path-notes/u);
  // render() must carry the disclosure's open state across re-renders, exactly
  // like the contribution columns it already preserved.
  assert.match(integratedAppSource, /spec-synergy\[open\]/u);
});

test('the integrated path radiogroup wires roving tabindex and arrow-key navigation', () => {
  assert.match(
    integratedAppSource,
    /role="radio" aria-checked="\$\{active\}" tabindex="\$\{active \? 0 : -1\}" data-spec-plan-mode/u
  );
  const keydownStart = integratedAppSource.indexOf('function onKeyDown');
  const keydownBody = integratedAppSource.slice(
    keydownStart,
    integratedAppSource.indexOf('function ', keydownStart + 10)
  );
  assert.ok(keydownStart >= 0, 'onKeyDown exists');
  assert.match(keydownBody, /\[data-spec-plan-mode\]/u);
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
    assert.match(
      keydownBody,
      new RegExp(`["']${key}["']`, 'u'),
      `${key} handled by the radiogroup`
    );
  }
  assert.match(keydownBody, /\[data-spec-plan-mode="\$\{target\}"\]`\)\?\.focus\(/u);
});

test('per-step plan reasons are exposed to assistive tech, not only the title tooltip', () => {
  assert.match(integratedAppSource, /<span class="spec-sr-only" id="\$\{reasonId\}">/u);
  assert.match(integratedAppSource, /aria-describedby="\$\{reasonId\}"/u);
  assert.match(integratedCssSource, /\.spec-sr-only\s*\{[\s\S]*?clip-path:\s*inset\(50%\)/u);
});

test('route step chips use theme tokens instead of hardcoded colors', () => {
  // Every rule that styles .spec-route-step must speak in --spec-step-* tokens,
  // so the light theme can supply its own AA pair (as it already did for text).
  // Light-theme blocks are the one sanctioned exception: their literal inks are
  // AA overrides in the .spec-badge-max tradition.
  const stepRules = [...integratedCssSource.matchAll(/([^{}]+)\.spec-route-step\s*\{([^}]*)\}/gu)];
  assert.ok(stepRules.length >= 3, 'the step chip base and state rules exist');
  for (const [, selector, body] of stepRules) {
    if (selector.includes("[data-theme='light']")) continue;
    assert.doesNotMatch(
      body,
      /(?:rgba?\(|#)[0-9a-f,()\s.]{3,}/iu,
      `no hardcoded colors in a .spec-route-step rule: ${body.slice(0, 60)}`
    );
  }
  // The tokens are declared on .spec-tool; the ink pair that must flip for the
  // light theme is re-declared there, matching the --spec-gold-ink AA
  // precedent. (The amber "next" fill keeps its near-black ink in both themes.)
  for (const token of [
    '--spec-step-bg',
    '--spec-step-ink',
    '--spec-step-border',
    '--spec-step-shadow',
    '--spec-step-next-bg',
    '--spec-step-next-ink',
  ]) {
    assert.match(integratedCssSource, new RegExp(`\\.spec-tool\\s*\\{[\\s\\S]*?${token}:`, 'u'));
  }
  for (const token of ['--spec-step-bg', '--spec-step-ink']) {
    assert.match(
      integratedCssSource,
      new RegExp(`\\[data-theme='light'\\] \\.spec-tool\\s*\\{[\\s\\S]*?${token}:`, 'u')
    );
  }
  // Gold-as-text on the new disclosure chips goes through gold-ink, which the
  // light theme already darkens to its AA amber.
  assert.match(
    integratedCssSource,
    /\.spec-synergy-mechanic\s*\{[\s\S]*?color:\s*var\(--spec-gold-ink\)/u
  );
});

test('feature CSS supports focus, touch targets, light theme, RTL, mobile, and reduced motion', () => {
  assert.match(cssSource, /:focus-visible/u);
  assert.match(cssSource, /min-height:\s*44px/u);
  assert.match(cssSource, /touch-action:\s*manipulation/u);
  assert.match(cssSource, /\[data-theme=["']light["']\][^{]*(?:specialization|spec-tower)/u);
  assert.match(cssSource, /\[dir=["']rtl["']\][^{]*(?:specialization|spec-tower)/u);
  assert.match(cssSource, /unicode-bidi:\s*isolate/u);
  assert.match(cssSource, /@media\s*\(max-width:\s*(?:640|720|768)px\)/u);
  assert.match(cssSource, /100dvh/u);
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
