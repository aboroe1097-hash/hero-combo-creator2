import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import test from 'node:test';
import { DEAD_TROOP_COUNT_KEYS } from '../../js/dead-troops.js';

// js/competition-board.js imports its stylesheet (Vite bundles it); Node gets
// an empty module for .css instead.
register(
  `data:text/javascript,${encodeURIComponent(
    "export async function load(url, context, next) { if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true }; return next(url, context); }"
  )}`
);

const board = await import('../../js/competition-board.js');
const growth = await import('../../js/competition-growth.js');

const PROJECTION = Object.freeze({
  schemaVersion: 1,
  seasonId: 'competition-12',
  publishedAt: '2026-11-05T10:00:00.000Z',
  rows: [
    {
      rank: 2,
      gameName: 'Public <b>Winner</b>',
      baselineSource: 'vtsscore-2026',
      growthPct: 30,
      growthAbs: 300,
      fields: { totalCastlePower: { abs: 300, pct: 30 }, troopPower: { abs: 240, pct: 30 } },
    },
    {
      rank: 4,
      gameName: 'Zed Other',
      baselineSource: 'signup',
      growthPct: 5,
      growthAbs: 5000,
      fields: {},
    },
  ],
  winners: [
    { rank: 1, gameName: 'Private Winner' },
    { rank: 2, gameName: 'Public <b>Winner</b>', growthPct: 30, growthAbs: 300 },
  ],
  notRanked: 3,
});

const tEmpty = () => '';

test('every page language has a complete copy with the same placeholders', () => {
  const keys = Object.keys(board.COMPETITION_BOARD_COPY_EN);
  assert.deepEqual(Object.keys(board.COMPETITION_BOARD_COPY).sort(), [
    'ar',
    'de',
    'en',
    'es',
    'fr',
    'hr',
    'id',
    'it',
    'kr',
    'pt',
    'ru',
    'tr',
    'zh',
  ]);
  for (const [lang, copy] of Object.entries(board.COMPETITION_BOARD_COPY)) {
    assert.deepEqual(Object.keys(copy).sort(), [...keys].sort(), lang);
    for (const key of keys) {
      const tokens = (value) => [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      assert.deepEqual(
        tokens(copy[key]),
        tokens(board.COMPETITION_BOARD_COPY_EN[key]),
        `${lang}.${key}`
      );
      assert.ok(copy[key].trim(), `${lang}.${key}`);
    }
  }
});

test('the page translator wins, then the locale copy, then English', () => {
  const pageT = (key) => (key === 'competitionBoardTitle' ? 'Page title' : key);
  const text = board.createCompetitionBoardTranslator({ t: pageT, locale: 'fr-FR' });
  assert.equal(text('competitionBoardTitle'), 'Page title');
  assert.equal(text('competitionBoardWinnersTitle'), 'Gagnants');
  assert.equal(
    board.createCompetitionBoardTranslator({ locale: 'ja' })('competitionBoardWinnersTitle'),
    'Winners'
  );
  assert.equal(
    board.createCompetitionBoardTranslator({ locale: 'de' })('competitionBoardShowing', {
      shown: 1,
      total: 2,
    }),
    '1 von 2 angezeigt'
  );
});

test('the board escapes names, names private winners without values, and notes consent', () => {
  const html = board.buildCompetitionBoardHtml(PROJECTION, { t: tEmpty, locale: 'en' });
  assert.doesNotMatch(html, /<b>Winner<\/b>/);
  assert.match(html, /Public &lt;b&gt;Winner&lt;\/b&gt;/);
  assert.match(html, /Private Winner[\s\S]*?Values private/);
  assert.match(html, /Only players who agreed to a public comparison/);
  assert.match(html, /3 players are not ranked/);
  assert.match(html, /\+30\.00%/);
  assert.match(html, /2026 VtsScore/);
  assert.match(html, /Showing 2 of 2/);
  assert.match(html, /dir="ltr"/);
  // Private Winner has no row in the standings.
  const tbody = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'));
  assert.doesNotMatch(tbody, /Private Winner/);
});

test('Arabic renders right-to-left with the Arabic copy', () => {
  const html = board.buildCompetitionBoardHtml(PROJECTION, { locale: 'ar' });
  assert.match(html, /dir="rtl"/);
  assert.match(html, /الفائزون/);
});

test('a row renders the full comparison: summary cards, category table, baseline note', () => {
  const projection = {
    schemaVersion: 1,
    seasonId: 'competition-12',
    publishedAt: '2026-11-05T10:00:00.000Z',
    rows: [
      {
        // All three waypoints: the July upload, today's sign-up, the re-upload.
        rank: 1,
        gameName: 'Grower',
        baselineSource: 'vtsscore-2026',
        baselineAliveOnly: true,
        finalSource: 'reupload',
        growthPct: 30,
        growthAbs: 300,
        waypoints: {
          signup: { totalCastlePower: 1100, troopPower: 880, buildingPower: 105 },
          reupload: { totalCastlePower: 1300, troopPower: 1040, buildingPower: 110 },
        },
        steps: {
          baselineToSignup: {
            growthAbs: 100,
            growthPct: 10,
            fields: {
              totalCastlePower: { abs: 100, pct: 10 },
              troopPower: { abs: 80, pct: 10 },
            },
          },
          signupToReupload: {
            growthAbs: 200,
            growthPct: 18.18,
            fields: {
              totalCastlePower: { abs: 200, pct: 18.18 },
              troopPower: { abs: 160, pct: 18.18 },
            },
          },
          baselineToReupload: {
            growthAbs: 300,
            growthPct: 30,
            fields: {
              totalCastlePower: { abs: 300, pct: 30 },
              troopPower: { abs: 240, pct: 30 },
            },
          },
        },
        fields: {
          totalCastlePower: { baseline: 1000, final: 1300, abs: 300, pct: 30 },
          troopPower: { baseline: 800, final: 1040, abs: 240, pct: 30 },
          buildingPower: { baseline: 100, final: 110, abs: 10, pct: 10 },
        },
      },
      {
        // A prior upload with no sign-up values yet: baseline only.
        rank: null,
        gameName: 'Pending',
        baselineSource: 'vtsscore-2026',
        growthPct: null,
        growthAbs: null,
        fields: {
          totalCastlePower: { baseline: 500, final: null, abs: null, pct: null },
        },
      },
      {
        // A prior upload compared with today's sign-up: no re-upload yet.
        rank: 2,
        gameName: 'Fresh',
        baselineSource: 'vtsscore-2026',
        finalSource: 'signup',
        growthPct: 5,
        growthAbs: 50,
        waypoints: {
          signup: { totalCastlePower: 1050, troopPower: 820 },
        },
        steps: {
          baselineToSignup: {
            growthAbs: 50,
            growthPct: 5,
            fields: { totalCastlePower: { abs: 50, pct: 5 }, troopPower: { abs: 20, pct: 2.5 } },
          },
        },
        fields: {
          totalCastlePower: { baseline: 1000, final: 1050, abs: 50, pct: 5 },
          troopPower: { baseline: 800, final: 820, abs: 20, pct: 2.5 },
        },
      },
      {
        // No earlier upload: the sign-up itself is the baseline.
        rank: null,
        gameName: 'Newbie',
        baselineSource: 'signup',
        growthPct: null,
        growthAbs: null,
        fields: {
          totalCastlePower: { baseline: 700, final: null, abs: null, pct: null },
        },
      },
    ],
    winners: [],
    notRanked: 1,
  };
  const html = board.buildCompetitionBoardHtml(projection, { locale: 'en' });
  // Summary cards for the ranked row.
  assert.match(html, /Total power change/);
  assert.match(html, /Without troops/);
  assert.match(html, /Biggest driver/);
  // Category table headers and values: every waypoint column and each pair.
  assert.match(html, /Full comparison/);
  assert.match(html, />Category</);
  assert.match(html, />Last season data</);
  assert.match(html, />Sign-up</);
  assert.match(html, />Final upload</);
  assert.match(html, /Last season → Sign-up/);
  assert.match(html, /Sign-up → Final upload/);
  assert.match(html, /Last season → Final upload/);
  assert.match(html, /1,300/);
  assert.match(html, /1,100/);
  // The pending row keeps its baseline and carries the earlier-upload note.
  assert.match(html, />500</);
  assert.match(html, /Last season data: an earlier VtsScore upload\./);
  // Which side is "now" is spelled out: sign-up values until the final upload.
  assert.match(html, /Now: the Competition #12 sign-up record/);
  assert.match(html, /Last season data: an earlier record without a dead-troop split/);
  // A player with no earlier upload shows the sign-up itself as the baseline.
  assert.match(html, /Baseline: the Competition #12 sign-up record\./);
});

test('a board without results shows the empty state', () => {
  for (const projection of [null, {}, { rows: [], winners: [] }]) {
    const html = board.buildCompetitionBoardHtml(projection, { locale: 'es' });
    assert.match(html, /La tabla de crecimiento aparecerá/);
    assert.doesNotMatch(html, /<table/);
  }
});

test('the normalizer drops unknown keys and malformed rows', () => {
  const normalized = board.normalizeCompetitionBoard({
    ...PROJECTION,
    rows: [
      ...PROJECTION.rows,
      { rank: 9, gameName: '', growthPct: 1 },
      {
        rank: 'x',
        gameName: 'Odd',
        growthPct: 'NaN',
        secret: 123,
        fields: { troopPower: { abs: 'x' } },
      },
    ],
    extra: 'nope',
  });
  assert.equal(normalized.rows.length, 3);
  assert.deepEqual(normalized.rows[2], {
    rank: null,
    gameName: 'Odd',
    baselineSource: 'signup',
    baselineAliveOnly: false,
    finalSource: null,
    waypoints: { signup: null, reupload: null },
    steps: { baselineToSignup: null, signupToReupload: null, baselineToReupload: null },
    growthPct: null,
    growthAbs: null,
    fields: {},
    uploads: [],
  });
  assert.equal('extra' in normalized, false);
  assert.equal(normalized.winners[0].gameName, 'Private Winner');
  assert.equal('growthPct' in normalized.winners[0], false);
});

test('rows sort by rank/growth %, absolute growth, or name, and filter by search', () => {
  const rows = board.normalizeCompetitionBoard(PROJECTION).rows;
  const names = (list) => list.map((row) => row.gameName);
  assert.deepEqual(names(board.filterAndSortBoardRows(rows, { sort: 'pct' })), [
    'Public <b>Winner</b>',
    'Zed Other',
  ]);
  assert.deepEqual(names(board.filterAndSortBoardRows(rows, { sort: 'abs' })), [
    'Zed Other',
    'Public <b>Winner</b>',
  ]);
  assert.deepEqual(names(board.filterAndSortBoardRows(rows, { sort: 'name' })), [
    'Public <b>Winner</b>',
    'Zed Other',
  ]);
  assert.deepEqual(names(board.filterAndSortBoardRows(rows, { query: '  zed ' })), ['Zed Other']);
});

function fakeContainer() {
  const listeners = {};
  const element = (name) => ({
    name,
    innerHTML: '',
    textContent: '',
    hidden: false,
    dataset: {},
    attributes: {},
    setAttribute(key, value) {
      this.attributes[key] = value;
    },
    addEventListener(type, handler) {
      listeners[`${name}:${type}`] = handler;
    },
  });
  const search = element('search');
  const rows = element('rows');
  const count = element('count');
  const noResults = element('none');
  const sorts = ['pct', 'abs', 'name'].map((key) => {
    const button = element(`sort-${key}`);
    button.dataset.compBoardSort = key;
    return button;
  });
  return {
    listeners,
    rows,
    count,
    noResults,
    sorts,
    innerHTML: '',
    querySelector(selector) {
      return {
        '[data-comp-board-search]': search,
        '[data-comp-board-rows]': rows,
        '[data-comp-board-count]': count,
        '[data-comp-board-no-results]': noResults,
      }[selector];
    },
    querySelectorAll(selector) {
      return selector === '[data-comp-board-sort]' ? sorts : [];
    },
  };
}

test('renderCompetitionBoard wires search and sorting without touching Firebase', () => {
  const container = fakeContainer();
  const handle = board.renderCompetitionBoard(container, PROJECTION, { t: tEmpty, locale: 'en' });
  assert.match(container.innerHTML, /comp-board/);
  container.listeners['search:input']({ target: { value: 'nobody' } });
  assert.equal(container.rows.innerHTML, '');
  assert.equal(container.noResults.hidden, false);
  assert.equal(container.count.textContent, 'Showing 0 of 2');
  container.listeners['search:input']({ target: { value: '' } });
  container.listeners['sort-abs:click']();
  assert.ok(
    container.rows.innerHTML.indexOf('Zed Other') < container.rows.innerHTML.indexOf('Public')
  );
  assert.equal(container.sorts[1].attributes['aria-pressed'], 'true');
  assert.equal(container.sorts[0].attributes['aria-pressed'], 'false');
  handle.update(null);
  assert.match(container.innerHTML, /will appear after the final upload window closes/);
});

test('loadCompetitionBoard reads the published board document', async () => {
  const calls = [];
  const firestore = {
    doc: (db, path) => {
      calls.push(path);
      return { path };
    },
    getDoc: async () => ({ exists: () => true, data: () => PROJECTION }),
  };
  const loaded = await board.loadCompetitionBoard({ db: {}, firestore });
  assert.deepEqual(calls, ['boh_allstar_competition/board']);
  assert.equal(loaded.rows.length, 2);
  const missing = await board.loadCompetitionBoard({
    db: {},
    firestore: { ...firestore, getDoc: async () => ({ exists: () => false }) },
  });
  assert.equal(missing, null);
  await assert.rejects(() => board.loadCompetitionBoard({}), /not available/);
});

test('a projection built by competition-growth renders without leaking private values', () => {
  const H = 3_600_000;
  const opens = Date.parse('2026-11-01T00:00:00Z');
  const stats = (total) => ({ totalCastlePower: total, troopPower: total });
  const deadTroopCounts = Object.fromEntries(DEAD_TROOP_COUNT_KEYS.map((key) => [key, 0]));
  const rows = growth.buildCompetitionGrowthRows({
    submissions: [
      {
        submissionUid: 'a',
        status: 'submitted',
        gameName: 'Shown',
        stats: stats(1000),
        commitment: { publicComparisonConsent: true },
      },
      {
        submissionUid: 'b',
        status: 'submitted',
        gameName: 'Hidden',
        stats: stats(1000),
        commitment: { publicComparisonConsent: false },
      },
    ],
    raceScores: [
      {
        submissionUid: 'a',
        schemaVersion: 2,
        powerValues: stats(1100),
        deadTroopCounts,
        updatedAt: opens + H,
      },
      {
        submissionUid: 'b',
        schemaVersion: 2,
        powerValues: stats(9_876_543),
        deadTroopCounts,
        updatedAt: opens + H,
      },
    ],
    window: { opensAt: opens, closesAt: opens + 48 * H },
  });
  const projection = growth.buildGrowthBoardProjection(rows, { seasonId: 'competition-12' });
  const html = board.buildCompetitionBoardHtml(projection, { locale: 'en' });
  assert.doesNotMatch(html, /Hidden/);
  assert.doesNotMatch(html, /9,875,543|9875543|987,554|98,754/);
});

test('the board stylesheet is theme-scoped, mobile-first and avoids the 768px boundary', () => {
  const css = readFileSync('css/competition-board.css', 'utf8');
  const source = readFileSync('js/competition-board.js', 'utf8');
  assert.match(source, /^import '\.\.\/css\/competition-board\.css';$/m);
  assert.match(css, /:root:not\(\[data-theme='light'\]\) \.comp-board \{/);
  assert.match(css, /:root\[data-theme='light'\] \.comp-board \{/);
  assert.match(css, /@media \(min-width: 640px\)/);
  assert.doesNotMatch(css, /min-width:\s*768px/);
  assert.doesNotMatch(source, /firebase-sdk|firebase\.js|initializeApp/);
});

test('an earlier-season baseline from the server build keeps its own label', () => {
  const normalized = board.normalizeCompetitionBoard({
    ...PROJECTION,
    rows: [{ ...PROJECTION.rows[0], baselineSource: 'vtsscore-prior' }, PROJECTION.rows[1]],
  });
  assert.equal(normalized.rows[0].baselineSource, 'vtsscore-prior');
  assert.equal(
    board.normalizeCompetitionBoard({
      ...PROJECTION,
      rows: [{ ...PROJECTION.rows[0], baselineSource: 'made-up' }],
    }).rows[0].baselineSource,
    'signup'
  );
  const t = board.createCompetitionBoardTranslator({ locale: 'de' });
  assert.equal(t('competitionBoardSourceVtsScorePrior'), 'Früherer VtsScore');
});
