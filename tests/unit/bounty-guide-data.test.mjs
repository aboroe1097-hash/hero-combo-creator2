// tests/unit/bounty-guide-data.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  BOUNTY_AIDING_RULES,
  BOUNTY_COMMISSION_LEVELS,
  BOUNTY_DAILY_RULES,
  BOUNTY_GUIDE_CREDITS,
  BOUNTY_GUIDE_VERSION,
  BOUNTY_HEROES,
  BOUNTY_LOOP,
  BOUNTY_MISSION_EXAMPLES,
  BOUNTY_QUICK_RULES,
  BOUNTY_SETUP_STEPS,
  BOUNTY_STATS,
} from '../../js/bounty-guide-data.js';
import { allHeroesData } from '../../js/heroes-data.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const edenMapHtml = readFileSync(path.join(rootDir, 'tabs', 'eden-map.html'), 'utf8');
const bountyGuideJs = readFileSync(path.join(rootDir, 'js', 'bounty-guide.js'), 'utf8');

test('Royal Bounty guide data covers the nine-hero roster with unique ids', () => {
  assert.equal(BOUNTY_HEROES.length, 9);
  const ids = BOUNTY_HEROES.map((hero) => hero.id);
  assert.equal(new Set(ids).size, 9, 'hero ids are unique');
  for (const hero of BOUNTY_HEROES) {
    assert.ok(hero.tier, `${hero.id} has a tier`);
    assert.ok(hero.skillName, `${hero.id} has an aiding skill name`);
    assert.ok(['day1', 'later'].includes(hero.unlock), `${hero.id} unlock label is supported`);
  }
});

test('every bounty hero maps to a real app roster hero for portraits and Atlas links', () => {
  const rosterNames = new Set(allHeroesData.map((hero) => hero.name));
  for (const hero of BOUNTY_HEROES) {
    assert.ok(rosterNames.has(hero.appName), `${hero.appName} exists in the app roster`);
  }
});

test('Royal Bounty guide sections carry the transcribed PDF facts', () => {
  assert.match(BOUNTY_GUIDE_VERSION, /^\d{4}\.\d{2}\.\d{2}$/);
  assert.equal(BOUNTY_STATS.length, 4);
  assert.ok(BOUNTY_LOOP.length >= 8, 'the bounty loop is a complete chain');
  assert.ok(BOUNTY_LOOP.some((step) => step.title === 'Reach Level 6'));
  assert.ok(BOUNTY_MISSION_EXAMPLES.length >= 5);
  assert.equal(BOUNTY_DAILY_RULES.length, 4);
  assert.equal(BOUNTY_COMMISSION_LEVELS.length, 10);
  assert.equal(
    BOUNTY_COMMISSION_LEVELS.find((entry) => entry.level === 6)?.note,
    'Aiding Skill unlocked'
  );
  assert.ok(
    BOUNTY_AIDING_RULES.length >= 3,
    'aiding rules cover unlock, hero max, conflict, one-per-legion'
  );
  assert.equal(BOUNTY_SETUP_STEPS.length, 4);
  assert.ok(BOUNTY_QUICK_RULES.length >= 3);
  assert.ok(BOUNTY_GUIDE_CREDITS.length >= 2);
});

test('the Eden Hub fragment hosts the Royal Bounty sub-tab', () => {
  assert.match(edenMapHtml, /data-eden-subtab="bounty"/);
  assert.match(edenMapHtml, /data-eden-subtab-panel="bounty"/);
  assert.match(edenMapHtml, /data-eden-subtab="loyalty"/);
  assert.match(edenMapHtml, /data-eden-subtab-panel="previous"/);
});

test('the Aiding Skills section includes the credited Royal Bounty 2.0 reference', () => {
  assert.match(bountyGuideJs, /assets\/bounty\/royal-bounty-aiding-skills\.webp/);
  assert.match(bountyGuideJs, /width: 540/);
  assert.match(bountyGuideJs, /height: 593/);
  assert.match(bountyGuideJs, /https:\/\/www\.riseofcastles\.net\/en\/eden-bounty/);
});
