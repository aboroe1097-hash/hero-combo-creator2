import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { heroSkins } from '../../js/skins-db.js';

const atlasSource = readFileSync('js/app-hero-atlas.js', 'utf8');
const detailCss = readFileSync('css/hero-atlas-detail-v14.css', 'utf8');
const heroesInfoSource = readFileSync('js/heroes-info.js', 'utf8');

test('Hero Atlas detail uses the scoped v14 hierarchy without changing section hooks', () => {
  assert.match(atlasSource, /import '\.\.\/css\/hero-atlas-detail-v14\.css';/);
  assert.match(atlasSource, /class="hero-detail-panel hero-atlas-detail-v14"/);

  const sectionOrder = ['synergies', 'skins', 'skills', 'combos', 'counters'].map((section) =>
    atlasSource.indexOf(`id="detail-section-${section}"`)
  );
  assert.ok(sectionOrder.every((position) => position >= 0));
  assert.deepEqual(
    sectionOrder,
    [...sectionOrder].sort((a, b) => a - b)
  );

  assert.match(detailCss, /\.hero-atlas-detail-v14 \.detail-skin-showcase/);
  assert.match(detailCss, /\.hero-atlas-detail-v14 \.detail-skills/);
  assert.match(detailCss, /\.detail-skills\[data-skill-count='3'\][\s\S]*?repeat\(3,/);
  assert.match(detailCss, /\.detail-skills\[data-skill-count='4'\][\s\S]*?repeat\(2,/);
  assert.match(atlasSource, /data-skill-count="\$\{ext\?\.skills\?\.length \|\| 0\}"/);
  assert.match(detailCss, /\.detail-skill-rail[\s\S]*?position: absolute/);
  assert.match(detailCss, /\.detail-skill-id[\s\S]*?display: none/);
  assert.match(detailCss, /\.hero-atlas-detail-v14 \.counter-matchup-list/);
  assert.match(detailCss, /@media \(max-width: 768px\)/);
  assert.match(detailCss, /@media \(prefers-reduced-motion: reduce\)/);
});

test('Hero Atlas light theme keeps metadata and skill values readable', () => {
  assert.match(
    detailCss,
    /\[data-theme='light'\] \.hero-atlas-detail-v14 \.detail-origin-season-tag \{[\s\S]*?color: #075985 !important;/
  );
  assert.match(
    detailCss,
    /\[data-theme='light'\] \.hero-atlas-detail-v14 \.detail-skill-rail \{[\s\S]*?color: #075985 !important;/
  );
  assert.match(
    detailCss,
    /\[data-theme='light'\] \.hero-atlas-detail-v14 \.skill-value--percent \{[\s\S]*?background: #dbeafe !important;[\s\S]*?color: #075985 !important;/
  );
  assert.match(
    detailCss,
    /\.heroes-combo-scope-hint,[\s\S]*?\.hero-detail-empty \{[\s\S]*?color: #52657a !important;/
  );
});

test('skill copy preserves apostrophe entities and excludes provisional Cyrus notes', () => {
  const cyrusSource = heroesInfoSource.slice(heroesInfoSource.indexOf('"Cyrus":'));
  assert.match(atlasSource, /\(\?<!&#\)\\b\(\\d\+\)\\b/);
  assert.match(cyrusSource, /Cyrus's squad has a 10% chance to Dodge/);
  assert.doesNotMatch(
    cyrusSource,
    /captured screenshot|third effect that needs confirmation|final screenshot line needs confirmation/i
  );
});

test('Biography artwork uses only exact local skin WebPs and hides failed art', () => {
  const skinEntries = Object.values(heroSkins).flat();
  assert.ok(skinEntries.length > 0);

  for (const skin of skinEntries) {
    assert.match(skin.imageUrl, /^assets\/skins\/[a-z0-9-]+\.webp$/i, skin.name);
    assert.equal(existsSync(skin.imageUrl), true, skin.imageUrl);
  }

  assert.match(atlasSource, /const skinAssetUrl = getExactSkinAssetUrl\(skin\);/);
  assert.match(atlasSource, /\$\{skinAssetUrl \? `[\s\S]*?data-skin-art>[\s\S]*?` : ''\}/);
  assert.match(
    atlasSource,
    /image\?\.matches\?\.\('img\[data-skin-art\]'\)[\s\S]*?image\.hidden = true;/
  );
  assert.doesNotMatch(
    atlasSource,
    /<img[^>]*(?:data-skin-art[^>]*data-fallback-src|data-fallback-src[^>]*data-skin-art)/
  );
});
