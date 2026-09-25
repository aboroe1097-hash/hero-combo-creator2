import assert from 'node:assert/strict';
import test from 'node:test';

import { createCompetitionGrowthSection } from '../../js/vts-score-admin-view.js';

const H = 3_600_000;
const OPENS = Date.parse('2026-11-01T00:00:00Z');
const stats = (total) => ({ totalCastlePower: total, troopPower: total });

function snapshot(confirmations = {}) {
  return {
    season: 'competition-12',
    submissions: [
      {
        submissionUid: 'u1',
        status: 'submitted',
        gameName: 'MalakAbo',
        stats: stats(1_000),
        commitment: { publicComparisonConsent: true },
      },
    ],
    raceScores: [
      { submissionUid: 'u1', schemaVersion: 2, powerValues: stats(1_200), updatedAt: OPENS + H },
    ],
    baselineRaceScores: [
      { submissionUid: 'old-1', gameName: 'MalakAbo', schemaVersion: 2, powerValues: stats(800) },
    ],
    schedule: { reuploadOpensAt: OPENS, reuploadClosesAt: OPENS + 48 * H },
    confirmations,
  };
}

function fakeHost() {
  const buttons = [];
  return {
    buttons,
    innerHTML: '',
    querySelectorAll(selector) {
      const attribute = selector.slice(1, -1);
      const pattern = new RegExp(`<button[^>]*\\b${attribute}\\b[^>]*>`, 'g');
      return [...this.innerHTML.matchAll(pattern)].map(([tag]) => {
        const dataset = {};
        for (const [, name, value] of tag.matchAll(/data-comp12-(\w+)(?:="([^"]*)")?/g)) {
          dataset[`comp12${name[0].toUpperCase()}${name.slice(1)}`] = value ?? '';
        }
        const button = {
          tag,
          dataset,
          addEventListener: (type, handler) => {
            button.click = handler;
          },
        };
        buttons.push(button);
        return button;
      });
    },
  };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test('only saved, confirmed matches reach the published board', async () => {
  const published = [];
  const saved = [];
  let current = snapshot();
  globalThis.window = { confirm: () => true };
  const section = createCompetitionGrowthSection({
    t: (key, vars = {}) => `${key}${vars.name ? `:${vars.name}` : ''}`,
    num: (value) => String(value),
    signed: (value) => (value === null ? '—' : `${value > 0 ? '+' : ''}${value}`),
    canPublish: () => true,
    load: async () => current,
    saveDecisions: async (season, decisions) => saved.push([season, decisions]),
    publish: async (projection) => published.push(projection),
  });
  const host = fakeHost();
  section.mount(host);
  await settle();
  assert.match(host.innerHTML, /MalakAbo/);
  // Unconfirmed: the proposal is offered, and the baseline is the sign-up.
  assert.match(host.innerHTML, /c12Use:MalakAbo/);
  assert.match(host.innerHTML, /adminVtsScoreBaselineShort/);

  // Publishing now uses the sign-up baseline (+20%).
  host.buttons.length = 0;
  section.mount(host);
  host.buttons.find((button) => button.tag.includes('data-comp12-publish')).click();
  await settle();
  assert.equal(published.at(-1).rows[0].baselineSource, 'signup');
  assert.equal(published.at(-1).rows[0].growthPct, 20);

  // Confirm the match: publishing is blocked until the decision is saved.
  host.buttons.length = 0;
  section.mount(host);
  host.buttons.find((button) => button.dataset.comp12Candidate === 'old-1').click();
  assert.match(host.innerHTML, /data-comp12-publish disabled/);
  host.buttons.length = 0;
  section.mount(host);
  host.buttons.find((button) => button.tag.includes('data-comp12-save')).click();
  await settle();
  assert.deepEqual(saved.at(-1), [
    'competition-12',
    { u1: { decision: 'vtsscore', matchedSubmissionUid: 'old-1', matchedGameName: 'MalakAbo' } },
  ]);
  host.buttons.length = 0;
  section.mount(host);
  host.buttons.find((button) => button.tag.includes('data-comp12-publish')).click();
  await settle();
  assert.equal(published.at(-1).rows[0].baselineSource, 'vtsscore-2026');
  assert.equal(published.at(-1).rows[0].growthPct, 50);
  delete globalThis.window;
});

test('the server build button asks first, calls the function, reloads, and reports the result', async () => {
  let loads = 0;
  const calls = [];
  const statuses = [];
  let confirmAnswer = false;
  globalThis.window = { confirm: () => confirmAnswer };
  const section = createCompetitionGrowthSection({
    t: (key, vars = {}) => `${key}${Object.keys(vars).length ? JSON.stringify(vars) : ''}`,
    num: (value) => String(value),
    signed: (value) => String(value),
    canPublish: () => true,
    setStatus: (message, type) => statuses.push([message, type]),
    load: async () => {
      loads += 1;
      return snapshot();
    },
    saveDecisions: async () => {},
    publish: async () => {},
    buildOnServer: async () => {
      calls.push('build');
      return { board: { publicRows: 4, players: 9, needsDecision: 2 } };
    },
  });
  const host = fakeHost();
  section.mount(host);
  await settle();
  const serverButton = () =>
    host.buttons.find((button) => button.tag.includes('data-comp12-server'));
  assert.ok(serverButton());

  serverButton().click();
  await settle();
  assert.deepEqual(calls, []);

  confirmAnswer = true;
  host.buttons.length = 0;
  section.mount(host);
  serverButton().click();
  await settle();
  await settle();
  assert.deepEqual(calls, ['build']);
  assert.equal(loads, 2);
  assert.deepEqual(statuses.at(-1), [
    'c12ServerBuilt{"rows":4,"players":9,"pending":2}',
    'success',
  ]);
  delete globalThis.window;
});

test('a member without publish rights sees no server build button', async () => {
  const section = createCompetitionGrowthSection({
    t: (key) => key,
    num: String,
    signed: String,
    canPublish: () => false,
    load: async () => snapshot(),
    buildOnServer: async () => ({}),
  });
  const host = fakeHost();
  section.mount(host);
  await settle();
  assert.doesNotMatch(host.innerHTML, /data-comp12-server/);
});
