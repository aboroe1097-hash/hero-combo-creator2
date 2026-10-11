import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolvePublicEdenWorkspace,
  publicEdenCacheKey,
  isPublishedWorkspaceProjection,
  resolvePublicEdenCatalog,
  consumeAdminEdenPreview,
} from '../../js/eden-public-season.js';
import { localizeEdenX1Shell } from '../../js/i18n/eden-x1-shell.js';
import {
  buildManagementVotesUrl,
  loadManagementVotesPayloadWithFallback,
} from '../../js/eden-x1-management-votes.js';

test('cold generic links resolve X8 and reject missing or invalid workspace without legacy fallback', () => {
  assert.equal(
    resolvePublicEdenWorkspace({ workspace: 'dynamic', search: '?workspace=eden-x8' }),
    'eden-x8'
  );
  for (const search of [
    '',
    '?workspace=../../eden-x1',
    '?workspace=eden-x0',
    '?workspace=eden-x10000',
  ]) {
    assert.equal(resolvePublicEdenWorkspace({ workspace: 'dynamic', search }), '');
  }
  assert.equal(resolvePublicEdenWorkspace({ workspace: 'x2' }), 'eden-x2');
  assert.equal(resolvePublicEdenWorkspace({ pathname: '/eden-x1.html' }), 'eden-x1');
});

test('public caches and publication validation cannot mix seasons', () => {
  assert.equal(publicEdenCacheKey('eden-x1'), 'vts_eden_x1_public_dashboard_cache_v1');
  assert.equal(publicEdenCacheKey('eden-x8'), 'vts_eden_x8_public_dashboard_cache_v1');
  assert.equal(
    isPublishedWorkspaceProjection({ workspace: 'eden-x8', published: true }, 'eden-x8'),
    true
  );
  assert.equal(
    isPublishedWorkspaceProjection({ workspace: 'eden-x2', published: true }, 'eden-x8'),
    false
  );
  assert.equal(
    isPublishedWorkspaceProjection({ workspace: 'eden-x8', published: false }, 'eden-x8'),
    false
  );
});

test('publication pointer chooses current while ended published seasons remain archives', () => {
  const registry = {
    seasons: [
      { workspaceId: 'eden-x2', label: 'Eden X2 final', state: 'ended' },
      { workspaceId: 'eden-x8', label: 'Autumn campaign', state: 'active' },
      { workspaceId: 'eden-x9', label: 'Next draft', state: 'draft' },
    ],
  };
  assert.deepEqual(
    resolvePublicEdenCatalog(registry, { workspaceId: 'eden-x8', label: 'Autumn campaign' }, [
      'eden-x2',
      'eden-x8',
    ]),
    {
      current: { workspaceId: 'eden-x8', label: 'Autumn campaign' },
      archives: [registry.seasons[0]],
    }
  );
  const unpublished = resolvePublicEdenCatalog(registry, { workspaceId: 'eden-x8' }, ['eden-x2']);
  assert.equal(unpublished.current, null);
  assert.deepEqual(unpublished.archives, [registry.seasons[0]]);
});

test('localized titles and landmarks accept future season labels', () => {
  const doc = { querySelector: () => null, querySelectorAll: () => [] };
  localizeEdenX1Shell(doc, 'en', { season: 'X8', label: 'Autumn campaign' });
  assert.match(doc.title, /Autumn campaign/);
  assert.doesNotMatch(doc.title, /X1|X2/);
  localizeEdenX1Shell(doc, 'ar', { season: 'X8' });
  assert.match(doc.title, /X8/);
});

test('unconfigured future management Sheets cannot fall back to X2', async () => {
  assert.throws(() => buildManagementVotesUrl({ workspace: 'eden-x8' }), /not configured/);
  await assert.rejects(
    loadManagementVotesPayloadWithFallback({ workspace: 'eden-x8' }),
    /not configured/
  );
});

test('private draft previews require a verified Admin and consume only their workspace snapshot', async () => {
  const saved = new Map([
    ['vts_eden_admin_preview__eden-x8', JSON.stringify({ workspace: 'eden-x8', published: true })],
  ]);
  const storage = { getItem: (key) => saved.get(key), removeItem: (key) => saved.delete(key) };
  await assert.rejects(
    consumeAdminEdenPreview(storage, 'eden-x8', { isAnonymous: true }),
    /Sign in/
  );
  await assert.rejects(
    consumeAdminEdenPreview(storage, 'eden-x8', { getIdTokenResult: async () => ({ claims: {} }) }),
    /Admin role/
  );
  assert.equal(saved.size, 1);
  const admin = { getIdTokenResult: async () => ({ claims: { admin: true } }) };
  assert.equal((await consumeAdminEdenPreview(storage, 'eden-x8', admin)).workspace, 'eden-x8');
  assert.equal(saved.size, 0);
  await assert.rejects(consumeAdminEdenPreview(storage, 'eden-x8', admin), /missing or expired/);
});
