import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path) => readFileSync(path, 'utf8');
const INLINE_EVENT_HANDLER = /\son[a-z][a-z0-9:_-]*\s*=/i;

test('inline handler detector covers every on* event attribute', () => {
  for (const attribute of [
    'onclick',
    'onload',
    'onerror',
    'onpointerdown',
    'onpointermove',
    'ontouchstart',
    'ontouchend',
  ]) {
    assert.match(`<div ${attribute}="run()"></div>`, INLINE_EVENT_HANDLER);
  }
});

test('Research MAX is wired by the module instead of an inline event handler', () => {
  const source = readSource('js/app-research.js');

  assert.doesNotMatch(source, INLINE_EVENT_HANDLER);
  assert.match(source, /function quickMaxTech\(/);
  assert.match(source, /data-tech-id=/);
  assert.match(source, /querySelector\('\.research-card-max'\)\?\.addEventListener\('click'/);
  assert.doesNotMatch(source, /window\.quickMaxTech\s*=/);
});

test('admin renderers do not emit CSP-blocked event attributes', () => {
  for (const path of ['js/ocr-render.js', 'js/ocr-roster.js']) {
    assert.doesNotMatch(readSource(path), INLINE_EVENT_HANDLER, `${path} should be CSP-safe`);
  }
});

test('admin controls retain module-owned click, change, and input behavior', () => {
  const roster = readSource('js/ocr-roster.js');
  const render = readSource('js/ocr-render.js');

  assert.match(roster, /function bindAdminControls\(/);
  assert.match(roster, /root\.addEventListener\('click'/);
  assert.match(roster, /root\.addEventListener\('change'/);
  assert.match(roster, /root\.addEventListener\('input'/);

  for (const action of [
    'roster-login',
    'set-roster-alliance',
    'delete-roster-snapshot',
    'edit-banner',
    'edit-duty',
    'remove-contribution-row',
    'set-contribution-primary',
    'set-contribution-reward',
    'delete-exguild-entry',
    'clear-exguild',
  ]) {
    assert.match(roster, new RegExp(`data-admin-action=["']${action}["']`));
    assert.match(roster, new RegExp(`case ["']${action}["']`));
  }

  assert.match(render, /querySelector\('\.dash-del-btn'\)\?\.addEventListener\('click'/);
  assert.match(
    render,
    /querySelector\('\.dash-clear-structure-filter'\)\?\.addEventListener\('click'/
  );
});
