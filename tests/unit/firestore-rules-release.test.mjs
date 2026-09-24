import assert from 'node:assert/strict';
import test from 'node:test';

import { findMatchingRuleset, pointReleaseAt } from '../../scripts/firestore-rules-release.mjs';

const response = (status, json = null, text = '') => ({ status, json, text });

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

  assert.equal(match, 'projects/demo/rulesets/second');
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
