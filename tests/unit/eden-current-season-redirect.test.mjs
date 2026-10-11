import assert from 'node:assert/strict';
import test from 'node:test';
import {
  discoverCurrentPublishedSeason,
  currentSeasonRedirectUrl,
} from '../../js/eden-current-season-redirect.js';

function fixture(pointer, projection) {
  const reads = [];
  return {
    reads,
    initFirebase: () => ({ configured: true, app: {} }),
    ensureAnonymousAuth: async () => ({}),
    importFirestoreLite: async () => ({
      getFirestore: () => ({}),
      doc: (_db, path) => path,
      getDoc: async (path) => {
        reads.push(path);
        const data = path === 'vts_admin/public_season' ? pointer : projection;
        return { exists: () => data !== null, data: () => data };
      },
    }),
  };
}

test('short season routes discover the published X8 workspace', async () => {
  const sdk = fixture({ workspaceId: 'eden-x8' }, { workspace: 'eden-x8', published: true });
  assert.equal(await discoverCurrentPublishedSeason(sdk), 'eden-x8');
  assert.deepEqual(sdk.reads, [
    'vts_admin/public_season',
    'eden_seasons/eden-x8/data/public_projection',
  ]);
});

test('short links never redirect unpublished, mismatched or malformed pointers to an older season', async () => {
  for (const projection of [
    null,
    { workspace: 'eden-x8', published: false },
    { workspace: 'eden-x2', published: true },
  ]) {
    await assert.rejects(
      discoverCurrentPublishedSeason(fixture({ workspaceId: 'eden-x8' }, projection)),
      /No current season/
    );
  }
  const invalid = fixture({ workspaceId: '../../eden-x1' }, null);
  await assert.rejects(discoverCurrentPublishedSeason(invalid), /No current season/);
  assert.equal(invalid.reads.length, 1);
});

test('only an absent pointer enables the published legacy compatibility route', async () => {
  assert.equal(
    await discoverCurrentPublishedSeason(fixture(null, { workspace: 'eden-x2', published: true })),
    'eden-x2'
  );
  await assert.rejects(discoverCurrentPublishedSeason(fixture(null, null)), /No current season/);
});

test('short voting links retain their ballot hash and cannot override the public workspace or enable preview', () => {
  const location = new URL(
    'https://roc-vts.com/vote/?workspace=eden-x2&preview=1&utm_source=team#old'
  );
  assert.equal(
    currentSeasonRedirectUrl('eden-x8', location, true),
    'https://roc-vts.com/eden-season.html?workspace=eden-x8&utm_source=team#vote'
  );
  assert.equal(
    currentSeasonRedirectUrl('eden-x8', new URL('https://roc-vts.com/eden/#analysis')),
    'https://roc-vts.com/eden-season.html?workspace=eden-x8#analysis'
  );
});
