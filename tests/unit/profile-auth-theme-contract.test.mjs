import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync('css/account-profile.css', 'utf8');

function ruleBlock(selectorPattern) {
  const match = css.match(new RegExp(`${selectorPattern}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
}

test('profile auth controls consume shared design tokens, not raw hex', () => {
  const tabs = ruleBlock("\\.account-tabs button\\[aria-selected='true'\\]");
  const tabBase = ruleBlock('\\.account-tabs button');
  const button = ruleBlock('\\.account-button');
  const textButton = ruleBlock('\\.account-button--text');
  const kicker = ruleBlock('\\.account-kicker');
  const note = ruleBlock('\\.account-note');

  assert.doesNotMatch(tabs, /(?:color|border-color|background):\s*#[0-9a-f]/i);
  assert.doesNotMatch(tabBase, /(?:color|background):\s*#[0-9a-f]/i);
  assert.doesNotMatch(button, /(?:color|border|background):\s*#[0-9a-f]/i);
  assert.doesNotMatch(textButton, /color:\s*#[0-9a-f]/i);
  assert.doesNotMatch(kicker, /color:\s*#[0-9a-f]/i);
  assert.doesNotMatch(note, /border-inline-start:\s*3px solid #[0-9a-f]/i);
});

test('light-theme auth contrast resolves through the token chain', () => {
  const tabs = ruleBlock("\\.account-tabs button\\[aria-selected='true'\\]");
  const textButton = ruleBlock('\\.account-button--text');

  assert.match(tabs, /color: var\(--ff-text\)/);
  assert.match(tabs, /border-color: var\(--ff-action\)/);
  assert.match(textButton, /color: var\(--ff-action\)/);

  const tokens = readFileSync('css/_tokens.css', 'utf8');
  assert.match(tokens, /--ff-text: #101827;/);
  assert.match(tokens, /--ff-action: #0e7490;/);
});

test('auth controls keep their touch floors', () => {
  const tabs = ruleBlock('\\.account-tabs button');
  const button = ruleBlock('\\.account-button');
  const textButton = ruleBlock('\\.account-button--text');

  assert.match(tabs, /min-height: 48px/);
  assert.match(button, /min-height: 48px/);
  assert.match(textButton, /min-height: 48px/);
});
