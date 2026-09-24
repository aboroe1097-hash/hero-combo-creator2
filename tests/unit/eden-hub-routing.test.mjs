import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveEdenHubInitialRoute } from '../../js/eden-hub-routing.js';

function createHistory(initialUrl, initialState) {
  let url = new URL(initialUrl);
  let state = initialState;
  const calls = [];

  return {
    get hash() {
      return url.hash;
    },
    get state() {
      return state;
    },
    calls,
    replaceState(nextState, title, nextUrl) {
      calls.push({ nextState, title, nextUrl });
      state = nextState;
      url = new URL(nextUrl, url);
    },
  };
}

test('a same-session clicked subtab clears its stale hash and uses the current-season default', () => {
  const clickedState = { edenHubSubtabClicked: 'bounty', source: 'same-entry' };
  const history = createHistory('https://roc-vts.com/#edenHub?subtab=bounty', clickedState);

  const route = resolveEdenHubInitialRoute('bounty', 'bounty', history);

  assert.deepEqual(route, { intent: '', useCurrentSeasonDefault: true });
  assert.equal(history.hash, '#edenHub');
  assert.equal(history.state, clickedState);
  assert.deepEqual(history.calls, [{ nextState: clickedState, title: '', nextUrl: '#edenHub' }]);
});

test('a shared subtab link remains explicit without a matching click history marker', () => {
  const history = createHistory('https://roc-vts.com/#edenHub?subtab=bounty', null);

  const route = resolveEdenHubInitialRoute('bounty', null, history);

  assert.deepEqual(route, { intent: 'bounty', useCurrentSeasonDefault: false });
  assert.equal(history.hash, '#edenHub?subtab=bounty');
  assert.deepEqual(history.calls, []);
});

test('a same-session current-season click keeps the explicit season intent', () => {
  const history = createHistory('https://roc-vts.com/#edenHub?subtab=season', {
    edenHubSubtabClicked: 'season',
  });

  const route = resolveEdenHubInitialRoute('season', 'season', history);

  assert.deepEqual(route, { intent: 'season', useCurrentSeasonDefault: false });
  assert.equal(history.hash, '#edenHub?subtab=season');
  assert.deepEqual(history.calls, []);
});

test('vote links and different subtab links remain explicit intents', () => {
  const voteHistory = createHistory('https://roc-vts.com/#edenHub?subtab=season&vote=1', {
    edenHubSubtabClicked: 'season',
  });
  const otherLinkHistory = createHistory('https://roc-vts.com/#edenHub?subtab=bounty', {
    edenHubSubtabClicked: 'playbook',
  });

  assert.deepEqual(resolveEdenHubInitialRoute('vote', 'season', voteHistory), {
    intent: 'vote',
    useCurrentSeasonDefault: false,
  });
  assert.deepEqual(resolveEdenHubInitialRoute('bounty', 'playbook', otherLinkHistory), {
    intent: 'bounty',
    useCurrentSeasonDefault: false,
  });
  assert.equal(voteHistory.calls.length, 0);
  assert.equal(otherLinkHistory.calls.length, 0);
});

test('no subtab intent uses the current-season default route', () => {
  const history = createHistory('https://roc-vts.com/#edenHub', null);

  assert.deepEqual(resolveEdenHubInitialRoute(null, null, history), {
    intent: null,
    useCurrentSeasonDefault: true,
  });
  assert.deepEqual(history.calls, []);
});
