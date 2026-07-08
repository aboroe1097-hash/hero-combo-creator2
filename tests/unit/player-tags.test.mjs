import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  VTS_ADMIN_AUTH: {},
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { getSpecialPlayerTag, renderSpecialPlayerTag } = await import('../../js/player-tags.js');

test('special player tags identify R5 and R4 management names', () => {
  assert.equal(getSpecialPlayerTag('MalakAbo')?.label, 'R5');
  assert.equal(getSpecialPlayerTag('MalakAdo'), null);

  for (const player of [
    'Goodness',
    '~Sarafino~',
    'BiG BOiiE',
    'Bil',
    'BoneSmoker 1097',
    'Dr Thunder (VTS R4)',
    'Jasper',
    'Juli',
    'Lisaveta',
    'MasterVj-1097',
    'Moldo',
    'Peter',
    'Redbull',
    'Roha',
    'RuCCaK',
    'Tazz',
    'Uzumaki',
    'Victoria ~Kika~',
    'Lady Zubbs',
    'Dr Thunder',
    'Kika',
    'ANGEL',
    'ANGEL 1097',
    'Wicked Russian NM5 1111',
    'Wicked Russian',
    'ZenaXeya',
    'Irop (Peaceful Warrior)',
  ]) {
    assert.equal(getSpecialPlayerTag(player)?.label, 'R4');
  }
});

test('special player tags use canonical player keys for known variants', () => {
  assert.equal(getSpecialPlayerTag({ playerName: 'Kika', playerKey: 'kikaalt' })?.label, 'R4');
  assert.equal(
    getSpecialPlayerTag({ playerName: 'Angel Banner', playerKey: 'angel' })?.label,
    'R4'
  );
  assert.equal(getSpecialPlayerTag({ playerName: 'Zubbs', playerKey: 'zubbs' })?.label, 'R4');
  assert.equal(
    getSpecialPlayerTag({ playerName: 'Vicked Russian', playerKey: 'wickedrussian' })?.label,
    'R4'
  );
  assert.equal(getSpecialPlayerTag({ player: 'Wicked Russian' })?.label, 'R4');
});

test('special player tag HTML is escaped through the renderer callback', () => {
  const html = renderSpecialPlayerTag('MalakAbo', (value) => `safe:${value}`);
  assert.match(html, /dash-player-rank-tag--r5/);
  assert.match(html, /safe:R5/);
});
