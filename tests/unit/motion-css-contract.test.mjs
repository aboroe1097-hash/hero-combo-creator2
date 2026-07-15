import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const componentsCss = readFileSync('css/components.css', 'utf8');
const shellCss = readFileSync('css/shell-v14.css', 'utf8');

test('component motion enumerates only the properties each state changes', () => {
  assert.doesNotMatch(componentsCss, /transition\s*:\s*all\b/i);
  assert.match(
    componentsCss,
    /\.toggle-thumb\s*\{[^}]*transition:\s*transform 0\.3s,\s*background-color 0\.3s;/
  );
  assert.match(
    componentsCss,
    /\.combo-footer-bar\s*\{[^}]*transition:\s*background-color 0\.15s,\s*border-color 0\.15s,\s*box-shadow 0\.15s;/
  );
});

test('the final shell cascade disables known repeated and transition motion', () => {
  const reducedMotionQuery = '@media (prefers-reduced-motion: reduce)';
  const finalReducedMotionStart = shellCss.lastIndexOf(reducedMotionQuery);
  const finalReducedMotion = shellCss.slice(finalReducedMotionStart).trim();

  assert.ok(finalReducedMotionStart >= 0, 'shell must include a reduced-motion fallback');
  assert.ok(
    finalReducedMotion.startsWith(reducedMotionQuery) && finalReducedMotion.endsWith('}'),
    'reduced-motion fallback must be the final shell cascade block'
  );
  assert.match(finalReducedMotion, /#app #appTitle\s*\{[^}]*animation:\s*none !important/);
  assert.match(
    finalReducedMotion,
    /#app #tabNavScroll \.tab-pill,\s*#app \.shell-more-button\s*\{[^}]*transition:\s*none !important/
  );
  assert.match(
    finalReducedMotion,
    /#app \.command-header::before,\s*#app \.shell-more-panel,\s*#app \.shell-more-backdrop\s*\{[^}]*animation:\s*none !important/
  );
});
