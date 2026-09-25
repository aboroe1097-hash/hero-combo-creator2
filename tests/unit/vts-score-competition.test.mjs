import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMPETITION_BOH_SLOTS,
  COMPETITION_EPIC_SLOTS,
  COMPETITION_PHASES,
  gameTimeToMillis,
} from '../../js/competition-schedule.js';
import { VTS_SCORE_COPY_KEYS } from '../../js/vts-score-i18n.js';
import {
  formatGameTime,
  formatLocalTime,
  getCompetitionPageState,
  mountSlotPicker,
  parseSlotOrder,
  phaseCopyKeys,
  slotRank,
  splitCountdown,
  toggleSlotOrder,
} from '../../js/vts-score-competition.js';

test('slot order: taps append in preference order and a second tap removes', () => {
  let order = [];
  order = toggleSlotOrder(order, '+20', COMPETITION_BOH_SLOTS);
  order = toggleSlotOrder(order, '+8', COMPETITION_BOH_SLOTS);
  order = toggleSlotOrder(order, '+14', COMPETITION_BOH_SLOTS);
  assert.deepEqual(order, ['+20', '+8', '+14']);
  assert.equal(slotRank(order, '+8'), 2);
  assert.equal(slotRank(order, '+12'), 0);

  order = toggleSlotOrder(order, '+20', COMPETITION_BOH_SLOTS);
  assert.deepEqual(order, ['+8', '+14'], 'removing the first choice promotes the rest');
  assert.equal(slotRank(order, '+8'), 1);

  // Unknown slots (an Epic slot on the BoH picker) are ignored, never stored.
  assert.deepEqual(toggleSlotOrder(order, '+10', COMPETITION_BOH_SLOTS), ['+8', '+14']);
  assert.deepEqual(toggleSlotOrder('+10', '+19', COMPETITION_EPIC_SLOTS), ['+10', '+19']);
});

test('slot order parses the hidden comma list the signup document writes', () => {
  assert.deepEqual(parseSlotOrder('+20,+8', COMPETITION_BOH_SLOTS), ['+20', '+8']);
  assert.deepEqual(parseSlotOrder(' +20 , ,+8,+20,+99', COMPETITION_BOH_SLOTS), ['+20', '+8']);
  assert.deepEqual(parseSlotOrder(['+13', '+10'], COMPETITION_EPIC_SLOTS), ['+13', '+10']);
  assert.deepEqual(parseSlotOrder('', COMPETITION_BOH_SLOTS), []);
  assert.deepEqual(parseSlotOrder(undefined, COMPETITION_BOH_SLOTS), []);
});

test('phase → page state follows the Competition #12 windows', () => {
  const registered = { hasSignup: true };
  const newcomer = { hasSignup: false };
  const view = (phase, who) => {
    const state = getCompetitionPageState(phase, who);
    return [state.signup, state.upload, state.notice, state.growthBoard];
  };
  // No schedule: today's flow, registration then the final-score upload.
  assert.deepEqual(view('unconfigured', newcomer), ['open', 'none', '', false]);
  assert.deepEqual(view('unconfigured', registered), ['open', 'final', '', false]);
  assert.deepEqual(view('upcoming', registered), ['hidden', 'none', 'phaseNoticeUpcoming', false]);
  assert.deepEqual(view('registration', newcomer), ['open', 'none', '', false]);
  assert.deepEqual(view('registration', registered), ['open', 'none', '', false]);
  assert.deepEqual(view('finalCheck', registered), ['edit', 'none', 'phaseNowFinalCheck', false]);
  assert.deepEqual(view('finalCheck', newcomer), [
    'hidden',
    'none',
    'phaseNoticeFinalCheckClosed',
    false,
  ]);
  assert.deepEqual(view('waiting', registered), ['readonly', 'none', 'phaseNoticeWaiting', false]);
  assert.deepEqual(view('waiting', newcomer), [
    'hidden',
    'none',
    'phaseNoticeNotRegistered',
    false,
  ]);
  assert.deepEqual(view('reupload', registered), [
    'readonly',
    'reupload',
    'phaseNowReupload',
    false,
  ]);
  assert.deepEqual(view('reupload', newcomer), [
    'hidden',
    'none',
    'phaseNoticeNotRegistered',
    false,
  ]);
  assert.deepEqual(view('resultsPending', registered), [
    'readonly',
    'none',
    'phaseNoticeResultsPending',
    true,
  ]);
  assert.deepEqual(view('winners', newcomer), ['hidden', 'none', 'phaseNowWinners', true]);
  assert.deepEqual(view('closed', registered), ['hidden', 'none', 'phaseNowClosed', false]);
});

test('every phase has its name, "now" line and notice in the VtsScore catalogue', () => {
  for (const phase of COMPETITION_PHASES) {
    const keys = phaseCopyKeys(phase);
    assert.ok(VTS_SCORE_COPY_KEYS.includes(keys.name), keys.name);
    assert.ok(VTS_SCORE_COPY_KEYS.includes(keys.now), keys.now);
    for (const who of [{ hasSignup: true }, { hasSignup: false }]) {
      const { notice } = getCompetitionPageState(phase, who);
      if (notice) assert.ok(VTS_SCORE_COPY_KEYS.includes(notice), notice);
    }
  }
});

test('game time is UTC−2 and the countdown never goes negative', () => {
  const ms = gameTimeToMillis('2026-10-05', '20:00');
  assert.equal(formatGameTime(ms, 'en'), '05 Oct 20:00');
  assert.equal(formatGameTime(gameTimeToMillis('2026-10-06', '00:30'), 'en'), '06 Oct 00:30');
  assert.equal(formatLocalTime(ms, 'en', 'UTC'), 'Mon 05 Oct 22:00');
  // 00:00 game time = 02:00Z (06:00 in Dubai).
  assert.equal(formatGameTime(Date.parse('2026-10-06T02:00:00Z'), 'en'), '06 Oct 00:00');
  assert.equal(formatGameTime(Date.parse('2026-10-06T01:59:00Z'), 'en'), '05 Oct 23:59');
  assert.equal(formatGameTime(NaN), '');

  assert.deepEqual(splitCountdown(((2 * 24 + 4) * 3600 + 12 * 60 + 9) * 1000), {
    days: 2,
    clock: '04:12:09',
  });
  assert.deepEqual(splitCountdown(59_999), { days: 0, clock: '00:00:59' });
  assert.deepEqual(splitCountdown(-5000), { days: 0, clock: '00:00:00' });
});

function fakeNode(tag) {
  const listeners = {};
  const node = {
    tag,
    children: [],
    attributes: {},
    dataset: {},
    className: '',
    textContent: '',
    disabled: false,
    value: '',
    append(...nodes) {
      node.children.push(...nodes);
    },
    setAttribute(name, value) {
      node.attributes[name] = String(value);
    },
    addEventListener(type, handler) {
      (listeners[type] ||= []).push(handler);
    },
    dispatch(type) {
      for (const handler of listeners[type] || []) handler({ type });
    },
    querySelector(selector) {
      if (selector === 'small') return node.children.find((child) => child.tag === 'small');
      const className = selector.replace(/^\./u, '');
      return node.children.find((child) => child.className === className);
    },
    focus() {},
  };
  return node;
}

test('the slot picker writes the hidden list and restores a loaded order', () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: fakeNode };
  try {
    const list = fakeNode('div');
    const input = fakeNode('input');
    const text = (key, values = {}) =>
      ({
        slotGameTime: `${values.time} game time`,
        slotGameTimeShort: 'game time',
        slotChosenLabel: `${values.label}, choice ${values.rank}`,
        slotNotChosenLabel: `${values.label}, not chosen`,
      })[key];
    const picker = mountSlotPicker({ list, input, catalog: COMPETITION_BOH_SLOTS, text });
    const [b8, b12, , b20] = list.children;
    assert.equal(list.children.length, 4);
    assert.equal(b8.children[1].textContent, '08:00');
    assert.equal(b8.attributes['aria-pressed'], 'false');
    assert.equal(b8.attributes['aria-label'], '08:00 game time, not chosen');

    b20.dispatch('click');
    b8.dispatch('click');
    assert.equal(input.value, '+20,+8');
    assert.equal(b20.attributes['aria-pressed'], 'true');
    assert.equal(b8.attributes['aria-label'], '08:00 game time, choice 2');
    assert.equal(b8.children[0].textContent, '2');

    b20.dispatch('click');
    assert.equal(input.value, '+8');
    assert.equal(b8.children[0].textContent, '1');

    // Loading a stored signup sets the value and dispatches 'change'.
    input.value = '+12,+20';
    input.dispatch('change');
    assert.equal(b12.attributes['aria-label'], '12:00 game time, choice 1');
    assert.equal(b20.attributes['aria-label'], '20:00 game time, choice 2');
    assert.equal(b8.attributes['aria-pressed'], 'false');

    picker.setDisabled(true);
    assert.ok(list.children.every((button) => button.disabled));
  } finally {
    globalThis.document = previous;
  }
});
