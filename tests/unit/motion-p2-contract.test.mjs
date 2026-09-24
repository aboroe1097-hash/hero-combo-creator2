import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

import { collectStylesheetFiles } from '../../scripts/check-motion-css.mjs';

const COMPOSITOR = new Set(['transform', 'translate', 'scale', 'rotate', 'opacity']);

function keyframes(css, name) {
  let found = null;
  postcss.parse(css).walkAtRules(/^keyframes$/i, (rule) => {
    if (rule.params.trim() === name) found = rule;
  });
  return found;
}

function assertCompositorOnly(css, name) {
  const rule = keyframes(css, name);
  assert.ok(rule, `missing @keyframes ${name}`);
  rule.walkDecls((decl) => {
    assert.ok(COMPOSITOR.has(decl.prop), `${name} animates ${decl.prop}`);
  });
}

function animationDeclsUsing(css, name) {
  const decls = [];
  postcss.parse(css).walkDecls(/^animation(-name)?$/i, (decl) => {
    if (decl.value.split(/[\s,]+/).includes(name)) decls.push(decl);
  });
  return decls;
}

test('the motion gate also scans the Arcade game stylesheet', () => {
  const files = collectStylesheetFiles().map((file) => file.replace(/\\/g, '/'));
  assert.ok(files.some((file) => file.endsWith('games/boot/shared.css')));
});

test('P2 tower connector reveal is finite, transform-only and gated by reduced motion', () => {
  const css = readFileSync('css/specialization-towers-v2.css', 'utf8');
  assertCompositorOnly(css, 'specialization-connector-draw');
  const uses = animationDeclsUsing(css, 'specialization-connector-draw');
  assert.equal(uses.length, 1);
  assert.doesNotMatch(uses[0].value, /infinite/);
  assert.equal(uses[0].parent.parent.params, '(prefers-reduced-motion: no-preference)');
});

test('P2 Arcade text pop stays compositor-only; reduced motion only fades', () => {
  const css = readFileSync('games/boot/shared.css', 'utf8');
  assertCompositorOnly(css, 'float-up');
  const fade = keyframes(css, 'float-fade');
  fade.walkDecls((decl) => assert.equal(decl.prop, 'opacity'));
});

test('P2 route playback and cost curves add no CSS animation', () => {
  const eden = readFileSync('css/secondary-tools-v14.css', 'utf8');
  const research = readFileSync('css/research-v14.css', 'utf8');
  for (const [css, prefix] of [
    [eden, '.eden-route-playback'],
    [research, '.research-cost-curve'],
  ]) {
    postcss.parse(css).walkRules((rule) => {
      if (!rule.selector.includes(prefix)) return;
      rule.walkDecls((decl) => {
        assert.ok(!/^(animation|transition)/.test(decl.prop), `${rule.selector} ${decl.prop}`);
      });
    });
  }
});
