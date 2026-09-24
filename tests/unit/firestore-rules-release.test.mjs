import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  RulesApiError,
  findMatchingRuleset,
  getWithRetry,
  isEntryPoint,
  pointReleaseAt,
  rulesetSourceMatches,
  runRelease,
} from '../../scripts/firestore-rules-release.mjs';

const response = (status, json = null, text = '') => ({ status, json, text });
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scriptPath = fs.realpathSync(path.join(repoRoot, 'scripts/firestore-rules-release.mjs'));
const scriptUrl = pathToFileURL(scriptPath).href;
const quiet = { logger: () => {}, sleepFor: async () => {}, retryDelays: [0, 1, 2] };
const LIVE = 'projects/demo/rulesets/live';
const NEW = 'projects/demo/rulesets/new';

// A scripted fake of the Rules API. `routes` maps a matcher to a list of
// responses, served in order; the last one repeats.
function fakeApi(routes) {
  const calls = [];
  const served = new Map();
  const callApi = async (method, url, _token, body) => {
    calls.push({ method, url, body });
    const parsed = new URL(url);
    for (const [key, handler] of Object.entries(routes)) {
      const [routeMethod, suffix] = key.split(' ');
      if (routeMethod !== method || !parsed.pathname.endsWith(suffix)) continue;
      if (typeof handler === 'function') return handler(parsed, body);
      const index = served.get(key) ?? 0;
      served.set(key, index + 1);
      return handler[Math.min(index, handler.length - 1)];
    }
    assert.fail(`Unexpected API request: ${method} ${url}`);
  };
  return { callApi, calls };
}

const rules = (content, name = 'firestore.rules') => ({ source: { files: [{ name, content }] } });

test('probe does not count a matching old GET as proof that PATCH worked', async () => {
  const ok = await pointReleaseAt('projects/demo/rulesets/live', 'token', {
    retryDelays: [0],
    requireAcknowledgedPatch: true,
    logger: () => {},
    callApi: async (method) =>
      method === 'PATCH'
        ? response(503, null, 'temporarily unavailable')
        : response(200, { rulesetName: 'projects/demo/rulesets/live' }),
  });

  assert.equal(ok, false);
});

test('release accepts a 503 PATCH when read-back proves the change applied', async () => {
  const ok = await pointReleaseAt('projects/demo/rulesets/new', 'token', {
    retryDelays: [0],
    logger: () => {},
    callApi: async (method) =>
      method === 'PATCH'
        ? response(503, null, 'temporarily unavailable')
        : response(200, { rulesetName: 'projects/demo/rulesets/new' }),
  });

  assert.equal(ok, true);
});

test('release lookup follows pagination until it finds the exact rules source', async () => {
  const calls = [];
  const callApi = async (method, url) => {
    calls.push({ method, url });
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/rulesets')) {
      if (!parsed.searchParams.has('pageToken')) {
        return response(
          200,
          {
            rulesets: [{ name: 'projects/demo/rulesets/first' }],
            nextPageToken: 'second/page',
          },
          ''
        );
      }
      assert.equal(parsed.searchParams.get('pageToken'), 'second/page');
      return response(200, { rulesets: [{ name: 'projects/demo/rulesets/second' }] }, '');
    }
    if (parsed.pathname.endsWith('/first')) {
      return response(200, { source: { files: [{ content: 'old rules' }] } }, '');
    }
    if (parsed.pathname.endsWith('/second')) {
      return response(200, { source: { files: [{ content: 'current\nrules\n' }] } }, '');
    }
    assert.fail(`Unexpected API request: ${url}`);
  };

  const match = await findMatchingRuleset('current\r\nrules\r\n', 'token', {
    project: 'demo',
    callApi,
  });

  assert.equal(match.name, 'projects/demo/rulesets/second');
  const listUrls = calls.filter((call) => call.url.includes('/rulesets?'));
  assert.equal(listUrls.length, 2);
  assert.equal(new URL(listUrls[0].url).searchParams.get('pageSize'), '100');
});

test('release lookup stops when the API repeats a page token', async () => {
  await assert.rejects(
    findMatchingRuleset('current rules', 'token', {
      project: 'demo',
      callApi: async (_method, url) => {
        const parsed = new URL(url);
        return response(
          200,
          {
            rulesets: [],
            nextPageToken: parsed.searchParams.get('pageToken') || 'same-token',
          },
          ''
        );
      },
    }),
    /repeated a page token/
  );
});

test('getWithRetry retries 503, 500 and 429, then returns the 200 response', async () => {
  const { callApi, calls } = fakeApi({
    'GET /thing': [response(503), response(500), response(429), response(200, { ok: true })],
  });
  const res = await getWithRetry('https://example.test/thing', 'token', {
    ...quiet,
    retryDelays: [0, 1, 2, 3],
    callApi,
  });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 4);
});

test('getWithRetry gives up with RulesApiError after the retries run out', async () => {
  const { callApi, calls } = fakeApi({ 'GET /thing': [response(503, null, 'down')] });
  await assert.rejects(
    getWithRetry('https://example.test/thing', 'token', { ...quiet, callApi }),
    (error) => error instanceof RulesApiError && error.status === 503
  );
  assert.equal(calls.length, 3);
});

test('getWithRetry does not retry a 403', async () => {
  const { callApi, calls } = fakeApi({ 'GET /thing': [response(403, null, 'denied')] });
  await assert.rejects(
    getWithRetry('https://example.test/thing', 'token', { ...quiet, callApi }),
    (error) => error instanceof RulesApiError && error.status === 403
  );
  assert.equal(calls.length, 1);
});

test('findMatchingRuleset retries a 503 list GET and a 429 ruleset GET', async () => {
  const { callApi, calls } = fakeApi({
    'GET /rulesets': [response(503), response(200, { rulesets: [{ name: NEW }] })],
    'GET /new': [response(429), response(200, rules('current rules'))],
  });
  const match = await findMatchingRuleset('current rules', 'token', {
    ...quiet,
    project: 'demo',
    callApi,
  });
  assert.equal(match.name, NEW);
  assert.equal(calls.length, 4);
});

test('a multi-file ruleset is never a match, even when one file is identical', async () => {
  const multi = {
    source: {
      files: [
        { name: 'firestore.rules', content: 'current rules' },
        { name: 'extra.rules', content: 'more' },
      ],
    },
  };
  assert.equal(
    rulesetSourceMatches(multi, [{ name: 'firestore.rules', content: 'current rules' }]),
    false
  );
  assert.equal(
    rulesetSourceMatches(rules('current\r\nrules'), [
      { name: 'firestore.rules', content: 'current\nrules' },
    ]),
    true
  );

  const { callApi } = fakeApi({
    'GET /rulesets': [response(200, { rulesets: [{ name: 'projects/demo/rulesets/multi' }] })],
    'GET /multi': [response(200, multi)],
  });
  const match = await findMatchingRuleset('current rules', 'token', {
    ...quiet,
    project: 'demo',
    callApi,
  });
  assert.equal(match, null);
});

test('the newest of two identical rulesets wins, even when listed second on a later page', async () => {
  const { callApi } = fakeApi({
    'GET /rulesets': (url) =>
      url.searchParams.has('pageToken')
        ? response(200, {
            rulesets: [
              { name: 'projects/demo/rulesets/newer', createTime: '2026-09-24T17:00:00Z' },
            ],
          })
        : response(200, {
            rulesets: [
              { name: 'projects/demo/rulesets/older', createTime: '2026-09-23T10:00:00Z' },
            ],
            nextPageToken: 'p2',
          }),
    'GET /older': [response(200, rules('same'))],
    'GET /newer': [response(200, rules('same'))],
  });
  const match = await findMatchingRuleset('same', 'token', { ...quiet, project: 'demo', callApi });
  assert.deepEqual(match, {
    name: 'projects/demo/rulesets/newer',
    createTime: '2026-09-24T17:00:00Z',
  });
});

test('runRelease retries a 500 on the live release GET', async () => {
  const { callApi, calls } = fakeApi({
    'GET /cloud.firestore': [response(500), response(200, { rulesetName: NEW })],
    'GET /rulesets': [response(200, { rulesets: [{ name: NEW }] })],
    'GET /new': [response(200, rules('current rules'))],
  });
  const code = await runRelease({ localRules: 'current rules', token: 'token', callApi, ...quiet });
  assert.equal(code, 0);
  assert.equal(calls.filter((call) => call.method === 'PATCH').length, 0);
});

test('runRelease returns 4 with a bootstrap message when the release does not exist', async () => {
  const lines = [];
  const { callApi } = fakeApi({ 'GET /cloud.firestore': [response(404, null, 'not found')] });
  const code = await runRelease({
    localRules: 'current rules',
    token: 'token',
    callApi,
    ...quiet,
    logger: (line) => lines.push(line),
  });
  assert.equal(code, 4);
  assert.match(lines.join('\n'), /cannot bootstrap/);
});

test('runRelease returns 3 without any PATCH when nothing matches', async () => {
  const { callApi, calls } = fakeApi({
    'GET /cloud.firestore': [response(200, { rulesetName: LIVE })],
    'GET /rulesets': [response(200, { rulesets: [{ name: LIVE }] })],
    'GET /live': [response(200, rules('old rules'))],
  });
  const code = await runRelease({ localRules: 'current rules', token: 'token', callApi, ...quiet });
  assert.equal(code, 3);
  assert.equal(calls.filter((call) => call.method === 'PATCH').length, 0);
});

test('runRelease returns 1 when the release is still unconfirmed after all retries', async () => {
  const { callApi, calls } = fakeApi({
    'PATCH /cloud.firestore': [response(503, null, 'down')],
    'GET /cloud.firestore': [response(200, { rulesetName: LIVE })],
    'GET /rulesets': [response(200, { rulesets: [{ name: NEW }] })],
    'GET /new': [response(200, rules('current rules'))],
  });
  const code = await runRelease({ localRules: 'current rules', token: 'token', callApi, ...quiet });
  assert.equal(code, 1);
  assert.equal(calls.filter((call) => call.method === 'PATCH').length, quiet.retryDelays.length);
});

test('runRelease --dry-run logs the candidate and makes no PATCH', async () => {
  const lines = [];
  const { callApi, calls } = fakeApi({
    'GET /cloud.firestore': [response(200, { rulesetName: LIVE })],
    'GET /rulesets': [
      response(200, { rulesets: [{ name: NEW, createTime: '2026-09-24T17:00:00Z' }] }),
    ],
    'GET /new': [response(200, rules('current rules'))],
  });
  const code = await runRelease({
    localRules: 'current rules',
    token: 'token',
    dryRun: true,
    callApi,
    ...quiet,
    logger: (line) => lines.push(line),
  });
  const output = lines.join('\n');
  assert.equal(code, 0);
  assert.equal(calls.filter((call) => call.method === 'PATCH').length, 0);
  assert.match(output, /candidate ruleset : projects\/demo\/rulesets\/new/);
  assert.match(output, /2026-09-24T17:00:00Z/);
  assert.match(output, /live ruleset\s+: projects\/demo\/rulesets\/live/);
  assert.match(output, /DRY RUN: release not changed\./);
});

for (const status of [400, 403]) {
  test(`a PATCH ${status} stops at once with RulesApiError`, async () => {
    const { callApi, calls } = fakeApi({
      'PATCH /cloud.firestore': [response(status, null, 'rejected')],
      'GET /cloud.firestore': [response(200, { rulesetName: LIVE })],
    });
    await assert.rejects(
      pointReleaseAt(NEW, 'token', { ...quiet, callApi }),
      (error) => error instanceof RulesApiError && error.status === status
    );
    assert.equal(calls.filter((call) => call.method === 'PATCH').length, 1);
  });
}

test('isEntryPoint ignores case on Windows, accepts no extension and rejects other files', () => {
  assert.equal(isEntryPoint(scriptPath.toUpperCase(), scriptUrl, 'win32'), true);
  assert.equal(isEntryPoint(scriptPath, scriptUrl), true);
  assert.equal(isEntryPoint(scriptPath.replace(/\.mjs$/, ''), scriptUrl), true);
  assert.equal(
    isEntryPoint(path.join(repoRoot, 'scripts/firestore-rules-status.mjs'), scriptUrl),
    false
  );
  assert.equal(isEntryPoint(undefined, scriptUrl), false);
});

for (const args of [[], ['bogus'], ['probe', '--dry-run']]) {
  test(`the CLI exits 2 with usage on stderr for [${args.join(' ')}]`, () => {
    const result = spawnSync(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, FIREBASE_TOKEN: '' },
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage/);
  });
}
