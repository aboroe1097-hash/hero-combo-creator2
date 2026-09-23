import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

/**
 * Parsed stylesheet check for infinite animations that repaint (16.5.0 §4.11).
 *
 * Only transform/opacity-family properties are treated as compositor-friendly.
 * Everything else in an infinite animation is reported, because it can repaint
 * forever on a settled surface. Visibility, effective cascade, and actual
 * compositing cannot be proven from a stylesheet, so pre-existing violations
 * are baselined explicitly and only new ones fail. Do not "fix" an unrelated
 * baseline entry here; remove entries only with the CSS change that fixes it.
 */

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const COMPOSITOR_PROPERTIES = new Set(['transform', 'translate', 'scale', 'rotate', 'opacity']);

const ANIMATION_NAME_KEYWORDS = new Set([
  'none',
  'infinite',
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
  'forwards',
  'backwards',
  'both',
  'running',
  'paused',
  'initial',
  'inherit',
  'unset',
  'revert',
]);

// Recorded on fd177c38 (application 16.0.18), the 16.5.0 Phase 0 baseline.
// Every entry is a pre-existing infinite animation whose keyframes touch a
// repainting property; 16.5.0 does not require unrelated CSS remediation, so
// these stay until the surface that owns them is touched. Removing an entry is
// only correct together with the CSS change that makes the animation finite or
// compositor-only.
export const BASELINE = new Set([
  'css/app.css:eden-guide-pulse',
  'css/app.css:elementalPulse',
  'css/app.css:elementalPulseLight',
  'css/app.css:footerGlowShift',
  'css/app.css:iceFireShift',
  'css/app.css:intro-title-glow',
  'css/app.css:specAckShimmer',
  'css/eden-x1.css:eden-x1-progressive-pulse',
  'css/ocr-dashboard.css:dash-sigil-aura',
  'css/ocr-dashboard.css:dash-sigil-body-breathe',
  'css/ocr-dashboard.css:dash-sigil-emblem',
  'css/ocr-dashboard.css:dash-sigil-route-flow',
  'css/research-v14.css:research-complete-breathe',
  'css/secondary-tools-v14.css:secondary-status-pulse',
  'css/vts-score.css:vtsProgressSlide',
  'public/ai-launcher-critical.css:velo-helmet-eye-glint',
]);

export function collectStylesheetFiles(dir = rootDir) {
  const files = [];
  const cssDir = path.join(dir, 'css');
  for (const entry of fs.readdirSync(cssDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.css')) files.push(path.join(cssDir, entry.name));
  }
  const launcher = path.join(dir, 'public', 'ai-launcher-critical.css');
  if (fs.existsSync(launcher)) files.push(launcher);
  return files;
}

function keyframeSafety(css) {
  const safety = new Map();
  const conflicts = new Set();
  postcss.parse(css).walkAtRules(/^keyframes$/i, (atRule) => {
    const name = atRule.params.trim();
    let safe = true;
    atRule.walkDecls((decl) => {
      if (!COMPOSITOR_PROPERTIES.has(decl.prop.toLowerCase())) safe = false;
    });
    if (safety.has(name) && safety.get(name) !== safe) conflicts.add(name);
    safety.set(name, safe);
  });
  for (const name of conflicts) safety.set(name, false);
  return safety;
}

function animationNamesIn(value, knownNames) {
  const names = [];
  for (const token of value.split(/[\s,]+/u)) {
    if (!token || ANIMATION_NAME_KEYWORDS.has(token.toLowerCase())) continue;
    if (/^[\d.]+m?s$/u.test(token)) continue;
    if (knownNames.has(token)) names.push(token);
  }
  return names;
}

export function collectInfinitePaintAnimations(files = collectStylesheetFiles()) {
  const sources = files.map((file) => ({
    file,
    relative: path.relative(rootDir, file).replace(/\\/g, '/'),
    css: fs.readFileSync(file, 'utf8'),
  }));

  const knownNames = new Set();
  const safety = new Map();
  for (const { css } of sources) {
    for (const [name, safe] of keyframeSafety(css)) {
      knownNames.add(name);
      if (safety.has(name) && safety.get(name) !== safe) safety.set(name, false);
      else safety.set(name, safe);
    }
  }

  const violations = new Map();
  for (const { relative, css } of sources) {
    postcss.parse(css).walkRules((rule) => {
      const infiniteNames = new Set();
      let infinite = false;
      rule.walkDecls(/^animation(?:-name|-iteration-count)?$/iu, (decl) => {
        const property = decl.prop.toLowerCase();
        if (property === 'animation-iteration-count') {
          if (/\binfinite\b/iu.test(decl.value)) infinite = true;
          return;
        }
        if (/\binfinite\b/iu.test(decl.value)) infinite = true;
        for (const name of animationNamesIn(decl.value, knownNames)) infiniteNames.add(name);
      });
      if (!infinite) return;
      for (const name of infiniteNames) {
        if (safety.get(name) !== false) continue;
        const key = `${relative}:${name}`;
        if (!violations.has(key)) {
          violations.set(key, {
            file: relative,
            keyframes: name,
            selector: rule.selector,
          });
        }
      }
    });
  }
  return [...violations.values()].sort(
    (a, b) => a.file.localeCompare(b.file) || a.keyframes.localeCompare(b.keyframes)
  );
}

export function newInfinitePaintAnimations(violations = collectInfinitePaintAnimations()) {
  return violations.filter(
    (violation) => !BASELINE.has(`${violation.file}:${violation.keyframes}`)
  );
}

export function censusByFile(files = collectStylesheetFiles()) {
  const rows = [];
  for (const file of files) {
    const relative = path.relative(rootDir, file).replace(/\\/g, '/');
    const css = fs.readFileSync(file, 'utf8');
    let keyframes = 0;
    let infinite = 0;
    postcss.parse(css).walkAtRules(/^keyframes$/i, () => {
      keyframes += 1;
    });
    postcss.parse(css).walkRules((rule) => {
      let ruleInfinite = false;
      rule.walkDecls(/^animation(?:-name|-iteration-count)?$/iu, (decl) => {
        if (/\binfinite\b/iu.test(decl.value)) ruleInfinite = true;
      });
      if (ruleInfinite) infinite += 1;
    });
    rows.push({ file: relative, keyframes, infinite });
  }
  return rows;
}

function main() {
  const violations = collectInfinitePaintAnimations();
  const fresh = newInfinitePaintAnimations(violations);

  if (process.argv.includes('--census')) {
    console.log('file\tkeyframes\tinfinite rules');
    for (const row of censusByFile()) {
      console.log(`${row.file}\t${row.keyframes}\t${row.infinite}`);
    }
    return;
  }

  if (process.argv.includes('--print-baseline')) {
    for (const violation of violations) {
      console.log(`  '${violation.file}:${violation.keyframes}',`);
    }
    return;
  }

  console.log(`Infinite paint animations: ${violations.length} baselined, ${fresh.length} new.`);
  if (fresh.length) {
    console.error(
      'New infinite paint animations must be finite, compositor-only, or baselined with a reason:'
    );
    for (const violation of fresh) {
      console.error(`- ${violation.file} ${violation.selector} -> ${violation.keyframes}`);
    }
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
