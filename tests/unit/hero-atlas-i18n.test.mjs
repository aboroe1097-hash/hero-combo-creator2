import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { heroesExtendedData } from '../../js/heroes-info.js';
import { heroHiddenPowers, heroSkins } from '../../js/skins-db.js';
import {
  auditHeroAtlasPack,
  auditHeroAtlasUi,
  getActiveHeroAtlasLocale,
  heroContentText,
  heroPlacementText,
  heroSkillKey,
  heroSkillText,
  heroUi,
  installHeroAtlasLoaderForTests,
  installHeroAtlasPackForTests,
  loadHeroAtlasLocale,
  normalizeHeroAtlasLocale,
} from '../../js/i18n/hero-atlas/index.js';
import { HERO_ATLAS_REQUIRED_STRINGS } from '../../js/i18n/hero-atlas/content-contract.js';

const locales = ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh'];
const canonicalHeroesSnapshot = structuredClone(heroesExtendedData);
const canonicalSkinsSnapshot = structuredClone(heroSkins);
const canonicalHiddenPowersSnapshot = structuredClone(heroHiddenPowers);
const canonicalSkillCount = Object.values(heroesExtendedData).reduce(
  (total, hero) => total + (hero.skills?.length || 0),
  0
);

test('Hero Atlas UI catalog is complete for all twelve locales', () => {
  const audit = auditHeroAtlasUi();
  assert.equal(audit.complete, true, audit.errors.join('\n'));
  assert.equal(heroUi('bestSynergies', {}, 'ar'), 'أفضل التوليفات');
  assert.equal(heroUi('skill', {}, 'zh'), '技能');
  assert.equal(heroPlacementText('Front Row / Middle Row', 'kr'), '전열 / 중열');
});

test('Hero Atlas locale aliases normalize before loader and render comparisons', () => {
  assert.equal(normalizeHeroAtlasLocale('ko-KR'), 'kr');
  assert.equal(normalizeHeroAtlasLocale('de-DE'), 'de');
  assert.equal(normalizeHeroAtlasLocale('en-US'), 'en');
  assert.equal(normalizeHeroAtlasLocale('xx'), 'en');
});

test('Hero Atlas skill localization uses hero plus skill ID and leaves canonical data intact', () => {
  const first = heroesExtendedData.Immortal.skills[0];
  const other = heroesExtendedData['Wind-Walker'].skills[0];
  const canonical = structuredClone(heroesExtendedData.Immortal);
  installHeroAtlasPackForTests('ar', {
    skills: {
      [heroSkillKey('Immortal', first.id)]: {
        type: 'هجوم إضافي',
        target: 'عدو عشوائي واحد',
        desc: 'وصف مترجم',
      },
      [heroSkillKey('Wind-Walker', other.id)]: {
        type: 'مهارة حالة',
        target: 'حليف عشوائي واحد',
        desc: 'وصف آخر',
      },
    },
    strings: { Mythic: 'أسطوري' },
  });

  assert.notEqual(heroSkillKey('Immortal', 2), heroSkillKey('Wind-Walker', 2));
  assert.equal(heroSkillText('Immortal', first, 'desc', 'ar'), 'وصف مترجم');
  assert.equal(heroSkillText('Wind-Walker', other, 'desc', 'ar'), 'وصف آخر');
  assert.equal(heroContentText('Mythic', 'ar'), 'أسطوري');
  assert.deepEqual(heroesExtendedData.Immortal, canonical);
});

test('every non-English Hero Atlas content pack covers all skills and rendered skin/help copy', async () => {
  assert.equal(HERO_ATLAS_REQUIRED_STRINGS.length, 181);
  assert.ok(HERO_ATLAS_REQUIRED_STRINGS.includes('Arthur Pendragon the Once and Future King'));
  assert.ok(HERO_ATLAS_REQUIRED_STRINGS.includes('Advanced Biography Seal'));
  assert.ok(HERO_ATLAS_REQUIRED_STRINGS.includes('Only two heroes have Mythic skins.'));
  for (const locale of locales) {
    const packUrl = new URL(`../../js/i18n/hero-atlas/locales/${locale}.js`, import.meta.url);
    const source = await readFile(packUrl, 'utf8');
    assert.doesNotMatch(
      source,
      /__(?:SKILLS|STRINGS)__|\?|�|tokens truncated/iu,
      `${locale}: bad marker/text`
    );
    assert.doesNotMatch(
      source,
      /from ['"][^'"]*(?:heroes-info|skins-db)\.js['"]/u,
      `${locale}: pack must stay data-only`
    );
    const pack = (await import(packUrl.href)).default;
    assert.equal(
      Object.keys(pack.skills || {}).length,
      canonicalSkillCount,
      `${locale}: skill count`
    );
    assert.ok(
      Object.keys(pack.strings || {}).length >= HERO_ATLAS_REQUIRED_STRINGS.length,
      `${locale}: required string count`
    );
    const audit = auditHeroAtlasPack(pack, heroesExtendedData, HERO_ATLAS_REQUIRED_STRINGS);
    assert.equal(
      audit.complete,
      true,
      `${locale}: missing skills=${audit.missingSkills.slice(0, 5).join(', ')}; strings=${audit.missingStrings.slice(0, 5).join(' | ')}; numbers=${audit.alteredNumbers.slice(0, 5).join(', ')}; untranslated fields=${audit.untranslatedFields.slice(0, 5).join(', ')}; untranslated strings=${audit.untranslatedStrings.slice(0, 5).join(' | ')}; residual English=${audit.residualEnglish.slice(0, 5).join(', ')}; encoding=${audit.encodingErrors.slice(0, 5).join(', ')}`
    );
  }
  assert.deepEqual(heroesExtendedData, canonicalHeroesSnapshot);
  assert.deepEqual(heroSkins, canonicalSkinsSnapshot);
  assert.deepEqual(heroHiddenPowers, canonicalHiddenPowersSnapshot);
});

test('Hero Atlas audit rejects short English gaming terms that were not translated', () => {
  const audit = auditHeroAtlasPack(
    {
      skills: {
        'Tester:1': { type: 'Tipo', target: 'Objetivo', desc: 'Descripcion localizada' },
      },
      strings: { Bleeding: 'Bleeding' },
    },
    { Tester: { skills: [{ id: 1, type: 'Type', target: 'Target', desc: 'Description' }] } },
    ['Bleeding']
  );
  assert.equal(audit.complete, false);
  assert.deepEqual(audit.untranslatedStrings, ['Bleeding']);
});

test('Hero Atlas loader keeps the newest locale active and retries a failed chunk', async () => {
  let resolveArabic;
  let resolveFrench;
  const restoreArabic = installHeroAtlasLoaderForTests(
    'ar',
    () => new Promise((resolve) => (resolveArabic = resolve))
  );
  const restoreFrench = installHeroAtlasLoaderForTests(
    'fr',
    () => new Promise((resolve) => (resolveFrench = resolve))
  );
  try {
    const arabic = loadHeroAtlasLocale('ar-SA');
    const french = loadHeroAtlasLocale('fr-FR');
    resolveFrench({ default: { skills: {}, strings: {} } });
    await french;
    assert.equal(getActiveHeroAtlasLocale(), 'fr');
    resolveArabic({ default: { skills: {}, strings: {} } });
    await arabic;
    assert.equal(getActiveHeroAtlasLocale(), 'fr');
  } finally {
    restoreFrench();
    restoreArabic();
  }

  let attempts = 0;
  const restoreGerman = installHeroAtlasLoaderForTests('de', () => {
    attempts += 1;
    return attempts === 1
      ? Promise.reject(new Error('simulated chunk failure'))
      : Promise.resolve({ default: { skills: {}, strings: {} } });
  });
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await loadHeroAtlasLocale('de');
    assert.equal(getActiveHeroAtlasLocale(), 'en');
    await loadHeroAtlasLocale('de');
    assert.equal(getActiveHeroAtlasLocale(), 'de');
    assert.equal(attempts, 2);
  } finally {
    console.warn = originalWarn;
    restoreGerman();
  }
});

test('Hero Atlas renderers resolve translated content without rewriting canonical datasets', async () => {
  const atlas = await readFile(new URL('../../js/app-hero-atlas.js', import.meta.url), 'utf8');
  const tooltip = await readFile(new URL('../../js/app-hero-tooltip.js', import.meta.url), 'utf8');
  const adapter = await readFile(
    new URL('../../js/i18n/hero-atlas/index.js', import.meta.url),
    'utf8'
  );
  assert.match(atlas, /heroSkillText\(selected, sk, 'desc'\)/);
  assert.match(atlas, /heroContentText\(skin\.preservingSkill\.description\)/);
  assert.match(atlas, /heroContentText\(skin\.fullName\)/);
  assert.match(atlas, /heroContentText\(tier\.summary\)/);
  assert.match(atlas, /heroContentText\(item\.name\)/);
  assert.match(atlas, /aria-pressed="\$\{comboScope === 'all'\}"/);
  assert.match(atlas, /vts:language-change/);
  assert.match(
    tooltip,
    /import\('\.\/i18n\/hero-atlas\/index\.js'\)[\s\S]*?module\.loadHeroAtlasLocale\(currentLanguage\)/
  );
  assert.doesNotMatch(tooltip, /^import[\s\S]*?from '\.\/i18n\/hero-atlas\/index\.js';/m);
  for (const locale of locales) {
    assert.match(
      adapter,
      new RegExp(`${locale}: \\(\\) => import\\('\\.\\/locales\\/${locale}\\.js'\\)`)
    );
  }
  assert.doesNotMatch(adapter, /^import[\s\S]*?from ['"]\.\/locales\//m);
  assert.doesNotMatch(atlas, /heroesExtendedData\[[^\]]+\]\s*=/);
  assert.match(tooltip, /setAttribute\('role', 'dialog'\)/);
  assert.match(tooltip, /aria-labelledby', 'heroTooltipTitle'/);
  assert.match(tooltip, /closeBtn\.focus\(\{ preventScroll: true \}\)/);
  assert.match(tooltip, /returnFocus\.focus\(\{ preventScroll: true \}\)/);
});
