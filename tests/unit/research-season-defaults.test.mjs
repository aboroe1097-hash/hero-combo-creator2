// The research season filter has gone stale twice now, silently. The default
// selection was written as the literal ['S4','X1','X2'] — correct as "the
// newest three" the day it was written — and then X8 shipped, and then X12
// shipped, and both landed switched off behind a filter nobody had a reason to
// touch. X12 research was in tech-db.js with all 59 nodes and full cost tables
// and still looked missing, because nothing selected it.
//
// These assertions tie the three things that have to agree: the season order,
// the default selection derived from it, and the buttons in index.html that
// let someone change it. state.js touches `document` at module scope so it
// cannot be imported here; reading the sources as text is how the other
// contract tests in this suite guard app source.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { techDatabase } from '../../js/tech-db.js';

const state = readFileSync('js/state.js', 'utf8');
const indexHtml = readFileSync('index.html', 'utf8');

const arrayLiteral = (source, name) => {
  const match = source.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  assert.ok(match, `${name} not found`);
  return match[1].match(/'([^']+)'/g).map((entry) => entry.replace(/'/g, ''));
};

const techSeasons = arrayLiteral(state, 'TECH_SEASON_ORDER');

const seasonButtons = [
  ...indexHtml.matchAll(/class="tech-season-btn([^"]*)" data-season="([^"]+)"/g),
].map(([, classes, season]) => ({ season, active: classes.includes('active') }));

test('the default research selection is derived, not a literal that goes stale', () => {
  assert.match(
    state,
    /activeTechSeasons = new Set\(\s*TECH_SEASON_ORDER\.slice\(-RESEARCH_DEFAULT_SEASON_COUNT\)/,
    'the default must be the tail of TECH_SEASON_ORDER, not a hand-written list'
  );
});

test('every research season has a button, and only those', () => {
  assert.deepEqual(
    seasonButtons.map((button) => button.season),
    techSeasons,
    'the season bar in index.html must match TECH_SEASON_ORDER exactly, in order'
  );
});

test('the buttons marked active match the derived default', () => {
  const count = Number(state.match(/RESEARCH_DEFAULT_SEASON_COUNT = (\d+)/)?.[1]);
  assert.ok(Number.isInteger(count) && count > 0, 'RESEARCH_DEFAULT_SEASON_COUNT is readable');

  const expected = techSeasons.slice(-count);
  const markedActive = seasonButtons.filter((button) => button.active).map((b) => b.season);
  assert.deepEqual(
    markedActive,
    expected,
    'index.html initial active classes must match the default, or the bar flashes the wrong state on boot'
  );
});

test('every season the default selects actually has research to show', () => {
  const count = Number(state.match(/RESEARCH_DEFAULT_SEASON_COUNT = (\d+)/)?.[1]);
  const seasonsWithTrees = new Set(techDatabase.map((tree) => tree.season));
  for (const season of techSeasons.slice(-count)) {
    assert.ok(
      seasonsWithTrees.has(season),
      `${season} is selected by default but has no tree in tech-db.js`
    );
  }
});
