import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ARTIFACT_KEYS,
  ARTIFACT_LOCALES,
  artifactText,
  auditArtifactPack,
  resolveArtifactLocale,
} from '../../js/i18n/artifact.js';

const appSource = readFileSync(new URL('../../js/app-artifact.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../../css/artifact-v14.css', import.meta.url), 'utf8');

test('Artifact UI copy covers all thirteen app locales', () => {
  assert.equal(ARTIFACT_LOCALES.length, 13);
  assert.ok(ARTIFACT_KEYS.length >= 30);
  ARTIFACT_LOCALES.forEach((locale) => {
    assert.deepEqual(auditArtifactPack(locale), { missing: [], extra: [] }, locale);
  });
  assert.equal(resolveArtifactLocale('ko-KR'), 'kr');
  assert.equal(resolveArtifactLocale('xx'), 'en');
  assert.equal(artifactText('maxTier', { tier: 3 }, 'es'), 'Maximizar Nivel 3');
});

test('Artifact UI uses safe persistence, translated labels, and confirmed destructive reset', () => {
  assert.match(appSource, /parseArtifactProgress/);
  assert.match(appSource, /normalizeArtifactProgress/);
  assert.match(appSource, /queueAccountSync\('artifact-progress'\)/);
  assert.match(appSource, /window\.confirm\(t\('resetConfirm'\)\)/);
  assert.match(appSource, /vts:language-change/);
  assert.match(appSource, /aria-live="polite"/);
  assert.match(appSource, /role="progressbar"/);
  assert.match(appSource, /autocomplete="off"/);
  assert.match(appSource, /redemption-grail-emblem\.png/);
  assert.match(appSource, /artifact-soulstone\.png/);
  assert.match(appSource, /NODE_LAYOUT/);
  assert.doesNotMatch(appSource, /estimated|daysRemaining|dailyRGE|dailyAS/i);
  assert.doesNotMatch(appSource, /transition:\s*all/);
});

test('Artifact CSS supports light/dark themes, keyboard focus, RTL, touch, mobile, and reduced motion', () => {
  assert.match(cssSource, /\[data-theme='light'\] \.artifact-workspace/);
  assert.match(cssSource, /:focus-visible/);
  assert.match(cssSource, /\[dir='rtl'\]/);
  assert.match(cssSource, /touch-action:\s*manipulation/);
  assert.match(cssSource, /@media \(max-width: 520px\)/);
  assert.match(cssSource, /prefers-reduced-motion/);
  assert.doesNotMatch(cssSource, /transition:\s*all/);
});
