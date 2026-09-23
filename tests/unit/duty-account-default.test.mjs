// Owner decision "Banner on every list": uploaded Banners, Pathing and Shield
// Wall rows are guessed as Banner unless the account is on the registry's
// "always main" list. An operator's pick and a saved type always stand.
import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = { VTS_ADMIN_AUTH: {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { MAX_MAIN_ACCOUNTS, isMainAccount, normalizePlayerRegistry } =
  await import('../../js/player-registry.js');
const { state } = await import('../../js/ocr-shared.js');
const { dutyRowAccountType, guessDutyAccountType } = await import('../../js/ocr-roster.js');
const { dutyEntryAccountClass } = await import('../../js/contribution-weighting.js');

function withRegistry(registry, run) {
  const previous = state.playerRegistry;
  state.playerRegistry = normalizePlayerRegistry(registry);
  try {
    run();
  } finally {
    state.playerRegistry = previous;
  }
}

test('the registry keeps a deduplicated, capped main-account list', () => {
  const registry = normalizePlayerRegistry({
    mainAccounts: ['MalakAbo', ' malakabo ', 'Malak-Abo', '', null, 'Roha'],
  });
  assert.deepEqual(registry.mainAccounts, ['MalakAbo', 'Roha']);
  assert.deepEqual(normalizePlayerRegistry({}).mainAccounts, []);
  const many = Array.from({ length: MAX_MAIN_ACCOUNTS + 20 }, (_, i) => `Player${i}`);
  assert.equal(normalizePlayerRegistry({ mainAccounts: many }).mainAccounts.length, 300);
  assert.equal(isMainAccount('malak abo', registry), true);
  assert.equal(isMainAccount('Someone', registry), false);
  assert.equal(isMainAccount('', registry), false);
});

test('an unknown name is guessed as Banner', () => {
  withRegistry({}, () => {
    assert.equal(guessDutyAccountType('Totally Unknown'), 'banner');
    assert.equal(guessDutyAccountType('MalakAbo', 'malakabo'), 'banner');
    assert.equal(guessDutyAccountType(), 'banner');
  });
});

test('a name on the always-main list is guessed as Main', () => {
  withRegistry({ mainAccounts: ['MalakAbo', 'Angel'] }, () => {
    assert.equal(guessDutyAccountType('MalakAbo', 'malak abo'), 'main');
    assert.equal(guessDutyAccountType('', 'MALAKABO'), 'main');
    // The uploaded text still says banner, so the row stays a Banner row.
    assert.equal(guessDutyAccountType('Angel', 'Angel banner'), 'banner');
    assert.equal(guessDutyAccountType('Someone Else'), 'banner');
  });
});

test('an operator choice or a saved type is never replaced by the guess', () => {
  withRegistry({ mainAccounts: ['MalakAbo'] }, () => {
    assert.equal(
      dutyRowAccountType({ accountType: 'banner', accountTypeSource: 'operator' }, 'MalakAbo'),
      'banner'
    );
    assert.equal(
      dutyRowAccountType({ accountType: 'main', accountTypeSource: 'operator' }, 'Unknown'),
      'main'
    );
    assert.equal(dutyRowAccountType({ accountType: 'main' }, 'Unknown'), 'main');
    assert.equal(dutyRowAccountType({}, 'Unknown'), 'banner');
    assert.equal(dutyRowAccountType({}, 'MalakAbo'), 'main');
  });
  // Scoring obeys the operator's pick whatever the default guess is.
  assert.equal(
    dutyEntryAccountClass({ accountType: 'main', accountTypeSource: 'operator' }, 'x'),
    'main'
  );
  assert.equal(
    dutyEntryAccountClass({ accountType: 'banner', accountTypeSource: 'operator' }, 'x'),
    'alt'
  );
});
