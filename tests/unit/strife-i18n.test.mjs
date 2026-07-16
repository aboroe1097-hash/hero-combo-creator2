import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { STRIFE_MONSTER_COMBOS, STRIFE_MONSTERS } from '../../js/strife-db.js';
import {
  STRIFE_CONTENT_LOCALES,
  auditStrifePack,
  loadStrifeLocale,
  strifeMonsterText,
  strifeSkillKey,
  strifeSkillText,
  strifeTermText,
} from '../../js/i18n/strife/index.js';
import { STRIFE_MONSTER_IDS, STRIFE_SKILL_IDS } from '../../js/i18n/strife/schema.js';

const NON_ENGLISH_LOCALES = STRIFE_CONTENT_LOCALES.filter((locale) => locale !== 'en');

test('Strife uses stable compound IDs for every canonical skill', () => {
  const keys = STRIFE_MONSTERS.flatMap((monster) =>
    monster.skills.map((skill) => strifeSkillKey(monster, skill))
  );
  assert.equal(keys.length, 33);
  assert.equal(new Set(keys).size, 33);
  assert.ok(keys.includes('gambosate:power-of-the-legion'));
  assert.ok(keys.includes('titanus:power-of-the-legion'));
  assert.ok(keys.includes('noisy-noel:power-of-the-legion'));
  assert.ok(keys.includes('trident-north-sea:power-of-the-legion'));
  assert.deepEqual(
    STRIFE_MONSTER_IDS,
    STRIFE_MONSTERS.map((monster) => monster.id)
  );
  assert.deepEqual(STRIFE_SKILL_IDS, keys);
});

test('every non-English Strife pack covers monsters, skills, guides, timings, targets, and tags', async () => {
  for (const locale of NON_ENGLISH_LOCALES) {
    const module = await import(`../../js/i18n/strife/${locale}.js`);
    const audit = auditStrifePack(module.default || module.strifeContent, STRIFE_MONSTERS);
    assert.equal(audit.complete, true, `${locale}: ${JSON.stringify(audit)}`);
  }
});

test('Strife display localization never mutates canonical recommendation data', async () => {
  const monster = STRIFE_MONSTERS.find((entry) => entry.id === 'pivana');
  const skill = monster.skills.find((entry) => entry.id === 'furious-strike');
  const canonical = Object.freeze({
    monsterName: monster.name,
    skillName: skill.name,
    effect: skill.effect,
    timing: skill.timing,
  });

  await loadStrifeLocale('zh');
  assert.equal(strifeMonsterText(monster, 'name'), '皮尔瓦娜');
  assert.equal(strifeSkillText(monster, skill, 'name'), '狂怒一击');
  assert.equal(strifeTermText('timings', skill.timing), '第1–3回合');
  assert.deepEqual(
    {
      monsterName: monster.name,
      skillName: skill.name,
      effect: skill.effect,
      timing: skill.timing,
    },
    canonical
  );
});

test('English and unsupported Strife locales fall back to canonical content', async () => {
  const monster = STRIFE_MONSTERS[0];
  const skill = monster.skills[0];
  await loadStrifeLocale('en');
  assert.equal(strifeMonsterText(monster, 'name'), monster.name);
  assert.equal(strifeSkillText(monster, skill, 'effect'), skill.effect);
  assert.equal(strifeTermText('tags', skill.tags[0]), skill.tags[0]);

  await loadStrifeLocale('xx');
  assert.equal(strifeMonsterText(monster, 'name'), monster.name);
});

test('Strife reloads its lazy content pack and renders canonical note IDs', async () => {
  const source = await readFile(new URL('../../js/app-strife.js', import.meta.url), 'utf8');
  const appSource = await readFile(new URL('../../js/app.js', import.meta.url), 'utf8');
  assert.match(source, /await\s+loadStrifeLocale\(currentLanguage\)/);
  assert.match(
    source,
    /export async function refreshStrifeLocale\(locale = currentLanguage\)[\s\S]*?await\s+loadStrifeLocale\(locale\)/
  );
  assert.match(source, /combo\.noteId === 'recommended-formation'/);
  assert.match(source, /noteId: entry\.noteId \|\| ''/);
  assert.doesNotMatch(source, /Recommended \(P2W\|F2P\)/);
  assert.match(
    appSource,
    /import\('\.\/app-strife\.js[^']*'\)[\s\S]*?\.then\(\(mod\) => mod\.initStrifeTool\(\)\)[\s\S]*?_strifeReady = true/
  );
});

test('every authored recommendation carries a stable localized note ID', () => {
  const formations = Object.values(STRIFE_MONSTER_COMBOS).flat();
  assert.equal(formations.length, 32);
  for (const formation of formations) {
    assert.equal(formation.noteId, 'recommended-formation');
    assert.match(formation.note, /^Recommended (?:F2P|P2W) formation:/);
  }
});
