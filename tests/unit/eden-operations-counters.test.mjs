import assert from 'node:assert/strict';
import test from 'node:test';

import { counterRowHtml, staffingSectionHtml } from '../../js/eden-operations-counters.js';
import { MAX_SHARED_ASSIGNED } from '../../js/eden-operations-model.js';

const COPY = Object.freeze({
  attackers: 'Attackers',
  support: 'Support',
  assigned: 'Signed up',
  staffMissing: '{count} more players needed',
  countsReadOnly: 'Shared counts · changing them needs an admin sign-in and a connection',
});

const text = (key, values = {}) =>
  String(COPY[key] ?? key).replace(/\{(\w+)\}/g, (match, token) =>
    values[token] === undefined ? match : String(values[token])
  );
const formatNumber = (value) => String(value);
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const SIEGE = { attackers: 2, support: 8 };
const build = (staffing, canWrite) =>
  staffingSectionHtml({ staffing, siege: SIEGE, canWrite, text, formatNumber, escapeHtml });

test('a member without the claim reads the shared counts and gets no buttons', () => {
  const html = build({ attackers: 3, support: 1, missing: 6, ready: false }, false);
  assert.ok(!html.includes('data-ops-count'), 'no counter button is rendered');
  assert.ok(!html.includes('<button'), 'nothing at all to press');
  assert.match(html, /is-readonly/);
  assert.match(html, /eden-ops-counter-controls--readonly/);
  // The numbers and the shortfall are still there: reading is the point.
  assert.match(html, /<strong>3<\/strong> \/ 2/);
  assert.match(html, /<strong>1<\/strong> \/ 8/);
  assert.match(html, /6 more players needed/);
  assert.match(html, /Shared counts · changing them needs an admin sign-in/);
});

test('an admin gets the two buttons per counter and no read-only note', () => {
  const html = build({ attackers: 3, support: 1, missing: 6, ready: false }, true);
  assert.equal((html.match(/data-ops-count="attackers:1"/g) || []).length, 1);
  assert.equal((html.match(/data-ops-count="attackers:-1"/g) || []).length, 1);
  assert.equal((html.match(/data-ops-count="support:1"/g) || []).length, 1);
  assert.equal((html.match(/data-ops-count="support:-1"/g) || []).length, 1);
  assert.ok(!html.includes('is-readonly'));
  assert.ok(!html.includes('countsReadOnly'), 'the note is for readers only');
  // A counter already at zero cannot go lower.
  const met = build({ attackers: 0, support: 8, missing: 2, ready: false }, true);
  assert.match(met, /data-ops-count="attackers:-1" aria-label="− Attackers" disabled/);
  const capped = counterRowHtml({
    side: 'attackers',
    label: 'Attackers',
    value: MAX_SHARED_ASSIGNED,
    required: MAX_SHARED_ASSIGNED + 1,
    canWrite: true,
    formatNumber,
    escapeHtml,
  });
  assert.match(capped, /data-ops-count="attackers:1" aria-label="\+ Attackers" disabled/);
});

test('a counter that meets its requirement is marked, and a ready plan says nothing', () => {
  const met = build({ attackers: 2, support: 8, missing: 0, ready: true }, false);
  assert.equal((met.match(/is-met/g) || []).length, 2);
  assert.match(met, /eden-ops-staff-ok/);
  assert.ok(!met.includes('eden-ops-staff-status'), 'no shortfall line when the plan is met');
  assert.match(met, /--progress:100%/);
});

test('the counter labels and values are escaped, not pasted', () => {
  const html = counterRowHtml({
    side: 'attackers',
    label: '<img src=x>',
    value: 1,
    required: 2,
    canWrite: true,
    formatNumber,
    escapeHtml,
  });
  assert.ok(!html.includes('<img src=x>'));
  assert.match(html, /&lt;img src=x&gt;/);
});
