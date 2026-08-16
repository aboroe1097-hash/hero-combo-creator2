// tests/css-computed-baseline.spec.js
//
// Computed-style baseline for the mobile-first CSS refactor.
//
// The refactor moves declarations between css/app.css and css/mobile.css and
// changes which of them is the base layer. That is only safe if what the
// browser actually computes stays the same, and the repo's visual-regression
// specs skip in CI (Windows baselines vs the Linux runner), so nothing
// automated would catch a silent change.
//
// This spec captures the computed value of the properties the refactor can
// plausibly move, for every element carrying a class or id, on each route, at
// each guarded breakpoint, in both themes. Run it before the refactor to write
// the baseline and after to compare:
//
//   CSS_BASELINE_WRITE=1 npx playwright test tests/css-computed-baseline.spec.js
//   npx playwright test tests/css-computed-baseline.spec.js
//
// A pass means every recorded element computes identically. It is a guard, not
// a smoke test, so it is deliberately outside `npm run smoke`.

import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const WRITE = process.env.CSS_BASELINE_WRITE === '1';
const BASELINE_DIR = path.join(process.cwd(), 'tests', '__css_baseline__');

// The four widths the project's overflow rule already guards, plus the two
// sides of the 768px mobile.css boundary, which is the line the refactor moves.
const WIDTHS = [390, 768, 769, 1024, 1440];
const THEMES = ['dark', 'light'];

// Only the routes that load mobile.css — the others have no override layer to
// invert, so recording them would be noise.
const ROUTES = ['/index.html', '/admin.html', '/arcade.html', '/eden-x1.html'];

// Properties an override layer realistically fights over. Colors and fonts are
// included because the inversion moves theme-dependent declarations too.
const PROPERTIES = [
  'display',
  'position',
  'width',
  'height',
  'min-height',
  'max-width',
  'margin',
  'padding',
  'font-size',
  'font-weight',
  'line-height',
  'color',
  'background-color',
  'border-radius',
  'border-width',
  'flex-direction',
  'grid-template-columns',
  'gap',
  'overflow-x',
  'overflow-y',
  'text-align',
  'z-index',
  'opacity',
  'transform',
  'visibility',
];

function baselineFile(route, width, theme) {
  const slug = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return path.join(BASELINE_DIR, `${slug}-${width}-${theme}.json`);
}

async function captureComputedStyles(page, properties) {
  return page.evaluate((props) => {
    const out = {};
    // A stable key per element: its own identity plus its position among
    // siblings, so the map survives unrelated DOM churn between runs.
    const keyFor = (element) => {
      const parts = [];
      let node = element;
      while (node && node.nodeType === 1 && parts.length < 6) {
        const parent = node.parentElement;
        const index = parent ? [...parent.children].indexOf(node) : 0;
        parts.unshift(`${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}:${index}`);
        node = parent;
      }
      return parts.join('>');
    };

    for (const element of document.querySelectorAll('[class], [id]')) {
      // Skip anything the browser is not laying out; its computed box values
      // are not meaningful and churn between runs.
      const style = getComputedStyle(element);
      if (style.display === 'none' && !element.id) continue;
      const record = {};
      for (const prop of props) record[prop] = style.getPropertyValue(prop);
      out[keyFor(element)] = record;
    }
    return out;
  }, properties);
}

test.describe('computed-style baseline', () => {
  test.describe.configure({ mode: 'serial' });

  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      for (const theme of THEMES) {
        test(`${route} @ ${width}px ${theme}`, async ({ page }) => {
          test.setTimeout(120000);
          await page.setViewportSize({ width, height: 900 });
          await page.addInitScript((value) => {
            try {
              localStorage.setItem('vts_theme', value);
            } catch {
              /* storage unavailable */
            }
          }, theme);
          // Not 'load': these routes pull Firebase and third-party media, and a
          // blocked or slow external host means the load event never fires.
          // Layout is settled well before that anyway.
          await page.goto(route, { waitUntil: 'domcontentloaded' });
          await page.evaluate(
            (value) => document.documentElement.setAttribute('data-theme', value),
            theme
          );
          // Let lazy route CSS and the shell's layout pass settle.
          // Deliberately no document.fonts.ready wait: webfonts come from an
          // external host that may be blocked here, leaving that promise
          // pending forever. None of the recorded properties depend on a font
          // file having arrived.
          await page.waitForTimeout(1500);

          const actual = await captureComputedStyles(page, PROPERTIES);
          const file = baselineFile(route, width, theme);

          if (WRITE) {
            fs.mkdirSync(BASELINE_DIR, { recursive: true });
            fs.writeFileSync(file, JSON.stringify(actual, null, 2));
            expect(Object.keys(actual).length).toBeGreaterThan(0);
            return;
          }

          expect(fs.existsSync(file), `missing baseline ${file}; run with CSS_BASELINE_WRITE=1`).toBe(
            true
          );
          const expected = JSON.parse(fs.readFileSync(file, 'utf8'));

          // Report every changed element at once: a refactor regression is
          // usually a whole cluster, and one-at-a-time is unusable.
          const drift = [];
          for (const [key, expectedProps] of Object.entries(expected)) {
            const actualProps = actual[key];
            if (!actualProps) {
              drift.push(`${key}: element disappeared`);
              continue;
            }
            for (const [prop, value] of Object.entries(expectedProps)) {
              if (actualProps[prop] !== value) {
                drift.push(`${key} { ${prop}: ${value} -> ${actualProps[prop]} }`);
              }
            }
          }
          expect(drift.slice(0, 40).join('\n'), `${drift.length} computed-style changes`).toBe('');
        });
      }
    }
  }
});
