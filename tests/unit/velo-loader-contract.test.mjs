import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const loaderSource = fs.readFileSync(new URL('../../js/loader-v14.js', import.meta.url), 'utf8');
const loaderCss = fs.readFileSync(new URL('../../css/loader-v14.css', import.meta.url), 'utf8');
const motionCss = fs.readFileSync(
  new URL('../../public/ai-launcher-critical.css', import.meta.url),
  'utf8'
);

test('Velo walks every shared page, tab, comment, and player loading rail', () => {
  assert.match(
    loaderSource,
    /\[data-vts-loader\], \.tab-loading, \.comments-loading, \.youtube-player-loading, \.dash-connecting/
  );
  assert.match(loaderSource, /assets\/velo\/velo-body\.webp/);
  assert.match(loaderSource, /assets\/velo\/velo-helmet\.webp/);
  assert.match(loaderSource, /const runner = makeVeloRunner\(\)/);
  assert.match(loaderSource, /admin: presentation\(\{[\s\S]*identity: veloVisual\(\)/);
  assert.match(loaderSource, /'eden-x1': presentation\(\{[\s\S]*minimumVisibleMs: 900/);
  const adminPresentation = loaderSource.match(/admin: presentation\(\{[\s\S]*?\}\),/u)?.[0] || '';
  const edenPresentation =
    loaderSource.match(/'eden-x1': presentation\(\{[\s\S]*?\}\),/u)?.[0] || '';
  assert.doesNotMatch(adminPresentation, /dash-sigil-emblem/u);
  assert.doesNotMatch(edenPresentation, /dash-sigil-emblem/u);
  assert.match(loaderCss, /\.vts-loader__identity\.vts-loader__visual--velo/);
  assert.doesNotMatch(loaderSource, /velo-paw/);
  assert.match(loaderCss, /\.vts-loader__trail-fill,[\s\S]*display: block/);
  assert.match(
    loaderCss,
    /inset-inline-start: clamp\(1rem, calc\(var\(--vts-loader-progress\) \* 1%\), calc\(100% - 1rem\)\)/
  );
  assert.match(motionCss, /@keyframes vts-loader-velo-patrol/);
  assert.match(motionCss, /@keyframes vts-loader-velo-step/);
  assert.match(motionCss, /@keyframes vts-loader-velo-helmet/);
  assert.match(motionCss, /@keyframes vts-loader-velo-arrive/);
  assert.match(motionCss, /@keyframes vts-loader-velo-helmet-arrive/);
  assert.match(
    loaderCss,
    /prefers-reduced-motion: reduce[\s\S]*\.vts-loader__velo-body,[\s\S]*\.vts-loader__velo-helmet/
  );
});
