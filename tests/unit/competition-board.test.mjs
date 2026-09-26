import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import test from 'node:test';

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
    'pt',
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
    board.createCompetitionBoardTranslator({ locale: 'kr' })('competitionBoardWinnersTitle'),
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
  assert.match(container.innerHTML, /will appear after the re-upload window closes/);
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
      { submissionUid: 'a', schemaVersion: 2, powerValues: stats(1100), updatedAt: opens + H },
      { submissionUid: 'b', schemaVersion: 2, powerValues: stats(9_876_543), updatedAt: opens + H },
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
