import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { allHeroesData, HERO_PORTRAIT_FALLBACK } from '../../js/heroes-data.js';
import { techDatabase } from '../../js/tech-db.js';
import { getPlannerFamily } from '../../js/research-planner-model.js';

test('every published research season has a visible selector', () => {
  // Only that a selector exists. Which ones start active is the default
  // selection's business and is asserted against the derived value in
  // research-season-defaults.test.mjs. This test used to pin the active set to
  // a literal ['S0'...'X1'], which meant it happily passed while X8 and then
  // X12 shipped switched off — it encoded the bug rather than catching it.
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  for (const season of new Set(techDatabase.map((tree) => tree.season))) {
    assert.match(
      html,
      new RegExp(`class="tech-season-btn(?: active)?" data-season="${season}"`),
      season
    );
  }
});

test('every hero has a nonempty portrait source and the shared fallback is shipped locally', () => {
  assert.ok(existsSync(new URL(`../../${HERO_PORTRAIT_FALLBACK}`, import.meta.url)));
  for (const hero of allHeroesData) assert.ok(hero.imageUrl, hero.name);
});

test('X12 missing topology is a list and both unresolved data sets remain unverified', () => {
  assert.equal(techDatabase.find((tree) => tree.id === 'b57d6bf9').layoutMode, 'list');
  for (const id of ['b57d6bf9', '9c5d4006']) {
    const family = getPlannerFamily(id);
    assert.ok(family.nodes.every((node) => node.verificationStatus === 'unverified'));
    assert.ok(family.nodes.some((node) => node.costs.warBadges.some((cost) => cost > 0)));
  }
});
