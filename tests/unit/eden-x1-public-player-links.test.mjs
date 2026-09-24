import assert from 'node:assert/strict';
import test from 'node:test';
import { bindPublicPlayerLinks } from '../../js/eden-x1-public-player-links.js';

function createContainer() {
  const listeners = new Map();
  const descendants = new Set();
  return {
    dataset: {},
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    contains(element) {
      return descendants.has(element);
    },
    dispatchClick(target) {
      listeners.get('click')?.({ target });
    },
    addDescendant(element) {
      descendants.add(element);
    },
  };
}

function createPlayerButton(key) {
  return {
    getAttribute(name) {
      return name === 'data-public-player' ? key : null;
    },
  };
}

test('player clicks in the announcement, overview, and dashboard panels open details', () => {
  const announcementPanel = createContainer();
  const overview = createContainer();
  const dashboard = createContainer();
  const containers = new Map([
    ['dashWeightedContributionPanel', announcementPanel],
    ['edenX1PublicOverview', overview],
    ['edenX1PublicDashboard', dashboard],
  ]);
  const documentRef = { getElementById: (id) => containers.get(id) };
  const openedPlayers = [];

  bindPublicPlayerLinks(documentRef, (key) => openedPlayers.push(key));

  for (const [index, panel] of [announcementPanel, overview, dashboard].entries()) {
    const button = createPlayerButton(`player-${index + 1}`);
    panel.addDescendant(button);
    panel.dispatchClick({
      closest: (selector) => (selector === '[data-public-player]' ? button : null),
    });
  }

  assert.deepEqual(openedPlayers, ['player-1', 'player-2', 'player-3']);
});

test('delegated player links ignore clicks outside their container and bind only once', () => {
  const announcementPanel = createContainer();
  const containers = new Map([['dashWeightedContributionPanel', announcementPanel]]);
  const documentRef = { getElementById: (id) => containers.get(id) };
  const openedPlayers = [];

  bindPublicPlayerLinks(documentRef, (key) => openedPlayers.push(key));
  bindPublicPlayerLinks(documentRef, () => assert.fail('duplicate listener should not be bound'));

  const button = createPlayerButton('player-outside');
  announcementPanel.dispatchClick({ closest: () => button });

  assert.deepEqual(openedPlayers, []);
});
