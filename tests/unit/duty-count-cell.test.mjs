import test from 'node:test';
import assert from 'node:assert/strict';

const { renderDutyCountCell, dutyClassTotals, renderScoreBreakdown } =
  await import('../../js/score-breakdown.js');

// Stand-in translator: the assertions only care that the right keys are asked
// for, not that any particular locale has them.
const t = (key, vars = {}) => (Object.keys(vars).length ? `${key}:${JSON.stringify(vars)}` : key);
const number = (value) => Number(value).toLocaleString('en-US');

const pathersRow = {
  pathers: 11,
  dutiesByClass: { pathers: { main: 8, alt: 3 } },
  dutyBreakdown: {
    unit: 10000,
    activities: [
      {
        activity: 'pathers',
        main: { count: 8, weight: 3, points: 240000 },
        alt: { count: 3, weight: 1, points: 30000 },
      },
    ],
  },
};

test('the duty count opens into a main / alt breakdown', () => {
  const html = renderDutyCountCell(pathersRow, 'pathers', t, { number });

  // The number is the disclosure control, with the collapsed alt hint kept so
  // the cell still reads the way it always did before it is opened.
  assert.match(html, /^<details class="duty-count-details">/);
  assert.match(html, /<summary class="duty-count"/);
  assert.match(html, />11<small class="duty-count-alt">/);
  assert.match(html, /scoreBreakdownAltCount/);

  // Opening it spells out what each share was worth, formatted by the caller.
  assert.match(html, /8 × 3 = 240,000/);
  assert.match(html, /3 × 1 = 30,000/);
  assert.match(html, /data-account="main"/);
  assert.match(html, /data-account="banner"/);

  // The sentence that used to live in a hover-only tooltip survives as the
  // accessible name of the control, so touch and screen readers get it too.
  assert.match(html, /title="scoreBreakdownCountSplit/);
  assert.match(html, /aria-label="scoreBreakdownCountSplit/);
});

test('rows without a per-class breakdown keep the previous rendering', () => {
  // No breakdown, no alt share: a bare number, exactly as before.
  assert.equal(renderDutyCountCell({ pathers: 4 }, 'pathers', t), '4');

  // A legacy alt share without weights keeps the plain tooltip span rather than
  // inventing a weight and a points figure for it.
  const legacy = renderDutyCountCell(
    { pathers: 5, dutiesByClass: { pathers: { main: 4, alt: 1 } } },
    'pathers',
    t
  );
  assert.match(legacy, /^<span class="duty-count" title="/);
  assert.doesNotMatch(legacy, /<details/);
  assert.doesNotMatch(legacy, /×/);
});

test('a main-only row still opens, without an alt line', () => {
  const html = renderDutyCountCell(
    {
      banners: 4,
      dutiesByClass: { banners: { main: 4, alt: 0 } },
      dutyBreakdown: {
        unit: 10000,
        activities: [
          {
            activity: 'banners',
            main: { count: 4, weight: 1, points: 40000 },
            alt: { count: 0, weight: 0.5, points: 0 },
          },
        ],
      },
    },
    'banners',
    t,
    { number }
  );
  assert.match(html, /<details class="duty-count-details">/);
  assert.match(html, /4 × 1 = 40,000/);
  assert.doesNotMatch(html, /data-account="banner"/);
  assert.doesNotMatch(html, /duty-count-alt/);
});

test('a secondary-linked account is its own line, chip and summary', () => {
  // The third account class has to be readable everywhere a split is shown, not
  // only where the weights are edited.
  const row = {
    banners: 3,
    dutiesByClass: { banners: { main: 1, alt: 1, secondary: 1 } },
    dutyBreakdown: {
      unit: 10000,
      activities: [
        {
          activity: 'banners',
          main: { count: 1, weight: 1, points: 10000 },
          alt: { count: 1, weight: 0.5, points: 5000 },
          secondary: { count: 1, weight: 0.5, points: 5000 },
        },
      ],
    },
  };

  const cell = renderDutyCountCell(row, 'banners', t, { number });
  assert.match(cell, /3<small class="duty-count-alt"> scoreBreakdownAltCount/);
  assert.match(cell, /scoreBreakdownSecondaryCount/);
  // Three counted lines with their own weights and points, and the third one is
  // not quietly folded into the alt line.
  assert.match(cell, /1 × 1 = 10,000/);
  assert.equal([...cell.matchAll(/1 × 0\.5 = 5,000/g)].length, 2);
  assert.match(cell, /adminDutyWeightsSecondary/);
  assert.match(cell, /data-account="main"/);
  assert.equal([...cell.matchAll(/data-account="banner"/g)].length, 2);

  // The overview sentence and the itemised breakdown both carry the class.
  const summary = renderScoreBreakdown(row, {
    t,
    number,
    signed: (value) => String(value),
    totalText: '20000',
  });
  assert.match(summary, /scoreBreakdownClassSummary/);
  assert.match(summary, /scoreBreakdownSecondarySummary/);
  // The tag on the secondary duty line names the third class, and the alt line
  // keeps the label it has always carried.
  assert.match(summary, /data-account="banner">adminDutyWeightsSecondary/);
  assert.match(summary, /data-account="banner">scoreBreakdownSecondary/);

  // Totals keep the three classes apart for the caller.
  assert.deepEqual(dutyClassTotals(row), {
    main: 1,
    alt: 1,
    secondary: 1,
    mainPoints: 10000,
    altPoints: 5000,
    secondaryPoints: 5000,
  });
});
