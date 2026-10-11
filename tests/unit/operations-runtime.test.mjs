import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import {
  operationStatusText,
  renderOperationsNotice,
  guardOperationEntryPoints,
} from '../../js/operations-runtime.js';

test('notice renders operator content as text and leaves Admin recovery alone', () => {
  let node;
  const doc = {
    location: { pathname: '/' },
    getElementById: () => node,
    createElement: () => ({
      style: {},
      setAttribute() {},
      remove() {
        node = null;
      },
    }),
    body: {
      prepend(value) {
        node = value;
      },
    },
  };
  renderOperationsNotice({ notice: '<script>bad()</script>' }, doc);
  assert.equal(node.textContent, '<script>bad()</script>');
  assert.equal(node.innerHTML, undefined);
  doc.location.pathname = '/admin.html';
  renderOperationsNotice({ notice: 'Paused', readOnly: true }, doc);
  assert.equal(node, null);
  assert.match(operationStatusText({ readOnly: true }), /Browsing remains available/);
});

test('entry points reflect feature pauses and restore their prior accessibility state', () => {
  const attributes = new Map();
  const button = {
    dataset: {},
    getAttribute: (key) => attributes.get(key),
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: (key) => attributes.delete(key),
  };
  const doc = { querySelectorAll: (selector) => (selector === '#aiSendBtn' ? [button] : []) };
  guardOperationEntryPoints({ disabledFeatures: ['ai'] }, doc);
  assert.equal(attributes.get('aria-disabled'), 'true');
  assert.equal(button.dataset.operationsPaused, 'true');
  guardOperationEntryPoints({}, doc);
  assert.equal(attributes.has('aria-disabled'), false);
  assert.equal(button.dataset.operationsPaused, undefined);
});

function errorHarness(addDoc) {
  const storage = new Map();
  const sandbox = {
    localStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    },
    location: { pathname: '/', search: '', hash: '' },
    navigator: { userAgent: 'test' },
    console: { warn() {}, info() {} },
    mockContext: async () => ({ db: {}, user: { uid: 'user' } }),
    importFirestore: async () => ({
      collection: () => 'errors',
      addDoc,
      serverTimestamp: () => 'server',
    }),
  };
  let source = readFileSync('js/app-error-reporting.js', 'utf8');
  source = source
    .replace(/^import .*;\r?\n/m, '')
    .replace(
      /async function getReportingContext\(\) \{[\s\S]*?\n\}/,
      'const getReportingContext = mockContext;'
    )
    .replaceAll('export ', '');
  vm.runInNewContext(`${source}\nthis.api = {logClientError,flushClientErrors};`, sandbox);
  return {
    api: sandbox.api,
    queue: () => JSON.parse(storage.get('vts_error_report_queue') || '[]'),
  };
}

test('a failed diagnostic delivery retains the failed entry and retry sends it', async () => {
  let fail = true;
  const delivered = [];
  const harness = errorHarness(async (_, entry) => {
    if (fail) throw new Error('offline');
    delivered.push(entry.error.message);
  });
  harness.api.logClientError('test', new Error('retained'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.queue().length, 1);
  fail = false;
  await harness.api.flushClientErrors();
  assert.deepEqual(delivered, ['retained']);
  assert.equal(harness.queue().length, 0);
});

test('errors arriving during a delivery remain queued and are also delivered', async () => {
  let harness;
  const delivered = [];
  harness = errorHarness(async (_, entry) => {
    delivered.push(entry.error.message);
    if (entry.error.message === 'first') harness.api.logClientError('test', new Error('second'));
  });
  harness.api.logClientError('test', new Error('first'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(delivered, ['first', 'second']);
  assert.equal(harness.queue().length, 0);
});

test('diagnostics continue to queue after reporting permission is denied', async () => {
  const harness = errorHarness(async () => {
    throw Object.assign(new Error('denied'), { code: 'permission-denied' });
  });
  harness.api.logClientError('test', new Error('first'));
  await new Promise((resolve) => setImmediate(resolve));
  harness.api.logClientError('test', new Error('second'));
  assert.deepEqual(
    harness.queue().map((entry) => entry.error.message),
    ['first', 'second']
  );
});
