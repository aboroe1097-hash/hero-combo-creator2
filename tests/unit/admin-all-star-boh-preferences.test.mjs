import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildAdminEpicShowdownPreferenceSummary,
  buildAdminSignupPlanningSignals,
  createAdminAllStarBohController,
  createAdminAllStarBohStoreAdapter,
  getAdminPreferredTeammateNames,
} from '../../js/admin-all-star-boh.js';

function createAdminStoreFixture() {
  let epicNext = null;
  const submissions = Array.from({ length: 72 }, (_, index) => {
    const number = index + 1;
    return {
      uid: index === 0 ? 'firebase-alpha' : `firebase-player-${number}`,
      playerId: index === 0 ? 'player-alpha' : `player-${number}`,
      gameName: index === 0 ? 'Alpha' : `Player ${number}`,
      revision: 1,
      status: 'submitted',
      preferredTeammates: index === 0 ? ['Bravo'] : [],
    };
  });
  let epicPreferences = [
    {
      uid: 'firebase-alpha',
      lanePreferences: ['south', 'center'],
      timePreferences: ['+8', '+12'],
    },
  ];
  const store = {
    epicTimeSlotIds: Object.freeze(['+8', '+10', '+12']),
    async listSubmissions() {
      return structuredClone(submissions);
    },
    subscribeSubmissions() {
      return () => {};
    },
    async getReview() {
      return { revision: 0, submissionRevision: 1, status: 'verified' };
    },
    async saveReview() {
      return null;
    },
    async getDraft() {
      return null;
    },
    subscribeDraft() {
      return () => {};
    },
    async saveDraft(value) {
      return value;
    },
    async getDraftTeam() {
      return null;
    },
    subscribeDraftTeam() {
      return () => {};
    },
    async saveDraftTeam(_teamId, value) {
      return value;
    },
    async saveDraftBundle(value) {
      return value;
    },
    async publish(value) {
      return value;
    },
    async getEpicShowdownPreferencesList() {
      return structuredClone(epicPreferences);
    },
    subscribeEpicShowdownPreferences(next) {
      epicNext = next;
      return () => {
        epicNext = null;
      };
    },
    emitEpicPreferences(value) {
      epicPreferences = structuredClone(value);
      epicNext?.(structuredClone(value));
    },
  };
  return store;
}

test('preferred teammate names stay optional, trimmed, unique, and account supplied', () => {
  assert.deepEqual(
    getAdminPreferredTeammateNames({
      preferredTeammates: [' Bravo ', 'Álpha', 'Bravo', '', null],
      teammateNames: ['Ignored alias'],
    }),
    ['Bravo', 'Álpha']
  );
  assert.deepEqual(getAdminPreferredTeammateNames({}), []);
});

test('signup planning signals group known heroes and preserve entered research and timing', () => {
  const signals = buildAdminSignupPlanningSignals(
    {
      preferredTeammates: ['Bravo'],
      stats: {
        usableHeroNames: ['Lionheart', 'Al Fatih', 'Unknown Hero'],
        researchProgressPct: { Military: 100, Production: 48 },
      },
      commitment: {
        preferredRole: 'top',
        fightingTimeIds: ['+8', '+12'],
      },
    },
    {
      heroMetadata: [
        { name: 'Lionheart', Type: 'Cavalry' },
        { name: 'Al Fatih', Type: 'Archers' },
      ],
      researchMetadata: () => ({
        Military: 'Military research',
        Production: 'Production research',
      }),
    }
  );

  assert.deepEqual(signals.heroGroups, [
    { groupId: 'cavalry', names: ['Lionheart'] },
    { groupId: 'archers', names: ['Al Fatih'] },
    { groupId: 'other', names: ['Unknown Hero'] },
  ]);
  assert.deepEqual(signals.research, [
    { id: 'Military', label: 'Military research', progress: 100 },
    { id: 'Production', label: 'Production research', progress: 48 },
  ]);
  assert.deepEqual(signals.fightingTimeIds, ['+8', '+12']);
  assert.equal(signals.favoriteRole, 'top');
  assert.equal(signals.usableHeroCount, 3);
  assert.equal(signals.hasSignals, true);

  const fallback = buildAdminSignupPlanningSignals(
    { stats: { researchProgressPct: { '<tree>': 25 } } },
    {
      researchMetadata() {
        throw new Error('locale pack unavailable');
      },
    }
  );
  assert.deepEqual(fallback.research, [{ id: '<tree>', label: '<tree>', progress: 25 }]);
});

test('signup planning signal HTML escapes every player-entered label and value', async (t) => {
  const previousDocument = globalThis.document;
  t.after(() => {
    globalThis.document = previousDocument;
  });
  const listeners = new Map();
  const root = {
    innerHTML: '',
    dir: '',
    classList: { add() {}, remove() {} },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    contains() {
      return true;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    removeAttribute() {},
    replaceChildren() {
      this.innerHTML = '';
    },
    setAttribute() {},
  };
  globalThis.document = { documentElement: { lang: 'en' } };
  const controller = createAdminAllStarBohController({
    root,
    initialSnapshot: {
      submissions: [
        {
          playerId: 'malicious-player',
          gameName: 'Safe display name',
          preferredTeammates: ['<img src=x onerror=alert(1)>'],
          stats: {
            usableHeroNames: ['<script>alert(2)</script>'],
            researchProgressPct: { '<svg onload=alert(3)>': 100 },
          },
          commitment: {
            preferredRole: '<iframe src=javascript:alert(4)>',
            fightingTimeIds: ['<img src=x>', '+12'],
          },
        },
      ],
    },
  });
  t.after(() => controller.destroy());

  const button = {
    dataset: { action: 'select-submission', playerId: 'malicious-player' },
    disabled: false,
  };
  listeners.get('click')({
    target: { closest: (selector) => (selector === 'button' ? button : null) },
  });
  await Promise.resolve();

  assert.doesNotMatch(root.innerHTML, /<(?:img|script|svg|iframe)\b/iu);
  assert.match(root.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/u);
  assert.match(root.innerHTML, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/u);
  assert.match(root.innerHTML, /&lt;svg onload=alert\(3\)&gt;/u);
  assert.match(root.innerHTML, />MAX</u);
  assert.match(root.innerHTML, /value="100" max="100"/u);
});

test('Epic Showdown summary counts multi-select lanes and times per player', () => {
  const summary = buildAdminEpicShowdownPreferenceSummary({
    submissions: [
      { uid: 'firebase-alpha', playerId: 'player-alpha', gameName: 'Alpha' },
      { uid: 'firebase-bravo', playerId: 'player-bravo', gameName: 'Bravo' },
    ],
    epicTimeSlotIds: ['+8', '+10', '+12', '+14'],
    epicPreferences: {
      'firebase-alpha': {
        lanePreferences: ['south', 'NORTH', 'south', 'invalid'],
        timePreferences: ['+8', '+12', '+8'],
      },
      'firebase-bravo': {
        lanePreferences: ['center', 'north'],
        timePreferences: ['+10', '+14'],
      },
    },
  });

  assert.equal(summary.totalPlayers, 2);
  assert.deepEqual(summary.laneCounts, { south: 1, center: 1, north: 2 });
  assert.deepEqual(summary.times, [
    { value: '+8', count: 1 },
    { value: '+10', count: 1 },
    { value: '+12', count: 1 },
    { value: '+14', count: 1 },
  ]);
  assert.deepEqual(
    summary.players.map(({ playerId, displayName, lanes, times }) => ({
      playerId,
      displayName,
      lanes,
      times,
    })),
    [
      {
        playerId: 'player-alpha',
        displayName: 'Alpha',
        lanes: ['south', 'north'],
        times: ['+8', '+12'],
      },
      {
        playerId: 'player-bravo',
        displayName: 'Bravo',
        lanes: ['center', 'north'],
        times: ['+10', '+14'],
      },
    ]
  );
});

test('Epic Showdown summary keeps legacy empty responses visible for admin review', () => {
  const summary = buildAdminEpicShowdownPreferenceSummary({
    epicPreferences: {
      'firebase-empty': {
        gameName: 'Needs follow-up',
        lanePreferences: [],
        timePreferences: [],
      },
    },
  });

  assert.equal(summary.totalPlayers, 1);
  assert.deepEqual(summary.players[0], {
    playerId: 'firebase-empty',
    displayName: 'Needs follow-up',
    lanes: [],
    times: [],
  });
});

test('Epic-only preference records show their game name instead of an opaque user ID', () => {
  const summary = buildAdminEpicShowdownPreferenceSummary({
    submissions: [],
    epicPreferences: [
      {
        uid: 'firebase-opaque-uid',
        gameName: 'Epic Only Player',
        lanePreferences: ['center'],
        timePreferences: ['+12'],
      },
    ],
  });

  assert.equal(summary.players[0].displayName, 'Epic Only Player');
  assert.equal(summary.players[0].playerId, 'firebase-opaque-uid');
});

test('admin adapter loads and live-refreshes Epic preferences without changing BoH revision', async () => {
  const store = createAdminStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(store);
  const initial = await adapter.start();

  assert.deepEqual(initial.epicTimeSlotIds, ['+8', '+10', '+12']);
  assert.equal(initial.epicPreferences.length, 1);
  const initialRevision = initial.revision;
  const validated = await adapter.dispatch({
    type: 'validateRevision',
    expectedRevision: initialRevision,
  });
  const validationBeforeEpicRefresh = structuredClone(validated.snapshot.validation);

  store.emitEpicPreferences([
    {
      uid: 'firebase-alpha',
      lanePreferences: ['north'],
      timePreferences: ['+10'],
    },
  ]);
  const refreshed = adapter.getSnapshot();
  assert.equal(refreshed.revision, initialRevision);
  assert.deepEqual(refreshed.validation, validationBeforeEpicRefresh);
  assert.deepEqual(refreshed.epicPreferences[0].lanePreferences, ['north']);
  assert.deepEqual(refreshed.epicPreferences[0].timePreferences, ['+10']);

  adapter.stop();
});

test('admin preference signals never feed automatic balance or assignment logic', () => {
  const source = readFileSync('js/admin-all-star-boh.js', 'utf8');
  const balanceStart = source.indexOf('async function adapterBalanceTeams(state)');
  const balanceEnd = source.indexOf('\nasync function', balanceStart + 1);
  const balanceFunction = source.slice(balanceStart, balanceEnd);

  assert.ok(balanceStart >= 0 && balanceEnd > balanceStart, 'balance function should be present');
  assert.doesNotMatch(
    balanceFunction,
    /preferredTeammates|epicPreferences|usableHeroNames|researchProgressPct|fightingTimeIds/u
  );
  const candidateStart = source.indexOf('function teamBuilderCandidates(state)');
  const candidateEnd = source.indexOf('\nfunction', candidateStart + 1);
  const candidateFunction = source.slice(candidateStart, candidateEnd);
  assert.doesNotMatch(
    candidateFunction,
    /preferredTeammates|usableHeroNames|researchProgressPct|fightingTimeIds/u
  );
  const signupTableStart = source.indexOf('function renderSignupReview(state)');
  const signupTableEnd = source.indexOf('\nfunction signupStatusOptions', signupTableStart + 1);
  const signupTableFunction = source.slice(signupTableStart, signupTableEnd);
  assert.doesNotMatch(
    signupTableFunction,
    /adminBohUsableHeroes|adminBohResearchProgress|adminBohFightingTimes|adminBohPrimaryRole|adminBohSecondaryRole/u
  );
  assert.match(source, /They do not change scores or lock assignments\./u);
  assert.match(source, /adapterNotify\(state, false\)/u);
});
