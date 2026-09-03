import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { heroSkins } from '../../js/skins-db.js';

const atlasSource = readFileSync('js/app-hero-atlas.js', 'utf8');
const appSource = readFileSync('js/app.js', 'utf8');
const tooltipSource = readFileSync('js/app-hero-tooltip.js', 'utf8');
const detailCss = readFileSync('css/hero-atlas-detail-v14.css', 'utf8');
const sharedCss = readFileSync('css/app.css', 'utf8');
const heroesInfoSource = readFileSync('js/heroes-info.js', 'utf8');
const metadataSource = readFileSync('scripts/update-build-metadata.mjs', 'utf8');

test('Hero Atlas detail uses the scoped v14 hierarchy without changing section hooks', () => {
  assert.match(atlasSource, /import '\.\.\/css\/hero-atlas-detail-v14\.css';/);
  assert.match(atlasSource, /class="hero-detail-panel hero-atlas-detail-v14"/);

  const panelSource = atlasSource.slice(
    atlasSource.indexOf('function renderHeroDetailPanel('),
    atlasSource.indexOf('function codexSortHeroes(')
  );
  const sectionOrder = ['synergies', 'skins', 'skills', 'combos', 'duels', 'counters'].map(
    (section) =>
      section === 'duels'
        ? panelSource.indexOf('${renderDuelSection(selected)}')
        : panelSource.indexOf(`id="detail-section-${section}"`)
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
  assert.match(atlasSource, /data-skill-count="\$\{mergedSkills\.length \|\| 0\}"/);
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

test('Hero Atlas lazy chunk receives the current build cache key', () => {
  assert.match(appSource, /import\('\.\/app-hero-atlas\.js\?v=[0-9A-Za-z_-]+'\)/);
  assert.match(metadataSource, /app-hero-atlas\|app-research/);
});

test('Skin Atlas styles remain lazy, responsive, keyboard-visible, and RTL-safe', () => {
  assert.doesNotMatch(sharedCss, /\.atlas-mode-toggle|\.skin-tier-card/);
  assert.match(detailCss, /min-height: 44px/);
  assert.match(detailCss, /\.atlas-mode-btn:focus-visible/);
  assert.match(detailCss, /minmax\(min\(19rem, 100%\), 1fr\)/);
  assert.match(detailCss, /padding-inline-start: 0\.9rem/);
  assert.match(detailCss, /inset-inline-start: 0/);
  assert.match(detailCss, /\[data-theme='light'\] \.skin-tier-rank,[\s\S]*?color: #1e293b/);
});

test('Skins view reserves item icon slots and styles the gallery for both themes', () => {
  assert.match(detailCss, /\.skin-item-icon \{[\s\S]*?28px/);
  assert.match(detailCss, /\.skin-item-icon--empty \{[\s\S]*?border-style: dashed/);
  assert.match(detailCss, /\.skin-item-icon-img \{[\s\S]*?object-fit: cover/);
  assert.match(detailCss, /\.skin-gallery-card \{/);
  assert.match(detailCss, /\.skin-gallery-card:focus-visible \{[\s\S]*?outline: 3px/);
  assert.match(detailCss, /\.skin-star-track::before \{[\s\S]*?inset-inline-start: 0\.34rem/);
  assert.match(detailCss, /\.skin-tier-hero-chip--link:focus-visible \{[\s\S]*?outline: 3px/);
  assert.match(
    detailCss,
    /\[data-theme='light'\] \.skin-gallery-card \{[\s\S]*?linear-gradient\(180deg, rgba\(255, 255, 255, 0\.98\)/
  );
  assert.match(detailCss, /\[data-theme='light'\] \.skin-item-icon \{/);
  assert.match(
    detailCss,
    /@media \(max-width: 768px\) \{[\s\S]*?\.skin-gallery-grid \{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/
  );
  assert.match(
    detailCss,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.skin-gallery-card/
  );
  assert.match(atlasSource, /data-skins-view="gallery"/);
  assert.match(atlasSource, /data-skins-view="tiers"/);
  assert.match(atlasSource, /id="skinsGallerySearch"/);
  assert.match(atlasSource, /heroUi\('skinGalleryCount'/);
  assert.match(atlasSource, /getSkinItemIconUrl\(item\)/);
});

test('skill copy preserves apostrophe entities and excludes provisional Cyrus notes', () => {
  const cyrusSource = heroesInfoSource.slice(heroesInfoSource.indexOf('"Cyrus":'));
  assert.match(atlasSource, /\(\?<!&#\)\\b\(\\d\+\)\\b/);
  assert.match(tooltipSource, /\(\?<!&#\)\\b\(\\d\+\)\\b/);
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
  assert.match(
    atlasSource,
    /\$\{\s*skinAssetUrl\s*\?\s*`[\s\S]*?data-skin-art>[\s\S]*?`\s*:\s*''\s*\}/
  );
  assert.match(
    atlasSource,
    /image\?\.matches\?\.\('img\[data-skin-art\]'\)[\s\S]*?image\.hidden = true;/
  );
  assert.doesNotMatch(
    atlasSource,
    /<img[^>]*(?:data-skin-art[^>]*data-fallback-src|data-fallback-src[^>]*data-skin-art)/
  );
});
