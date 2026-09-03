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

// The named-selector assertions above only catch what someone remembered to
// list. Sixteen rules on the signed-in settings surface (save-state, settings
// nav, language, verification summary, the status toast) reached this branch
// with raw hex resolving to 1.0-2.4:1 against the light page ground, because no
// assertion named them. This sweep generalises the rule instead: any rule that
// paints text with a raw hex, has no background of its own, and has no
// light-theme override must still clear AA on the light page.
test('no rule paints unreadable raw-hex text on the light page ground', () => {
  const LIGHT_PAGE_GROUND = '#f5f8fc'; // [data-theme='light'] .account-page
  const lightBlockAt = css.indexOf("[data-theme='light']");
  const base = css.slice(0, lightBlockAt);
  const lightBlock = css.slice(lightBlockAt);

  const channel = (value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const toRgb = (hex) => {
    let value = hex.replace('#', '');
    if (value.length === 3) {
      value = value
        .split('')
        .map((c) => c + c)
        .join('');
    }
    return [0, 2, 4].map((i) => parseInt(value.substr(i, 2), 16));
  };
  const contrast = (a, b) => {
    const x = luminance(toRgb(a));
    const y = luminance(toRgb(b));
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const REGEXP_SPECIAL = new Set([
    '.',
    '*',
    '+',
    '?',
    '^',
    '$',
    '{',
    '}',
    '(',
    ')',
    '|',
    '[',
    ']',
    '\\',
  ]);
  const escapeSelector = (selector) =>
    [...selector].map((ch) => (REGEXP_SPECIAL.has(ch) ? `\\${ch}` : ch)).join('');

  const failures = [];
  const rulePattern = /([^{}]+)\{([^}]*)\}/g;
  let rule;
  while ((rule = rulePattern.exec(base))) {
    const selector = rule[1].trim().replace(/\s+/g, ' ');
    if (selector.startsWith('@') || selector.startsWith('/*')) continue;

    const declarations = rule[2];
    const color = declarations.match(/(?:^|[;\s])color:\s*(#[0-9a-fA-F]{3,6})/);
    if (!color) continue;
    // A rule painting its own background is judged against that, not the page.
    if (/background(?:-color)?:/.test(declarations)) continue;

    const firstSelector = selector.split(',')[0].trim();
    if (new RegExp(`${escapeSelector(firstSelector)}\\s*[,{]`).test(lightBlock)) continue;

    const ratio = contrast(color[1], LIGHT_PAGE_GROUND);
    if (ratio < 4.5) {
      failures.push(`${firstSelector} -> ${color[1]} is ${ratio.toFixed(2)}:1`);
    }
  }

  assert.deepEqual(
    failures,
    [],
    `raw-hex text fails AA in light theme; use a token or add a light override:\n  ${failures.join('\n  ')}`
  );
});

test('auth controls keep their touch floors', () => {
  const tabs = ruleBlock('\\.account-tabs button');
  const button = ruleBlock('\\.account-button');
  const textButton = ruleBlock('\\.account-button--text');

  assert.match(tabs, /min-height: 48px/);
  assert.match(button, /min-height: 48px/);
  assert.match(textButton, /min-height: 48px/);
});
