import {
  edenWorkspaceFirestorePath,
  edenWorkspacePublicUrl,
  normalizeEdenWorkspaceId,
} from './eden-workspaces.js';
import { isPublishedWorkspaceProjection } from './eden-public-season.js';

export async function discoverCurrentPublishedSeason({
  initFirebase,
  ensureAnonymousAuth,
  importFirestoreLite,
}) {
  const { configured, app } = initFirebase();
  if (!configured || !app) throw new Error('Season services are unavailable.');
  await ensureAnonymousAuth();
  const { getFirestore, doc, getDoc } = await importFirestoreLite();
  const db = getFirestore(app);
  const pointer = await getDoc(doc(db, 'vts_admin/public_season'));
  // Compatibility for deployments that predate the publication pointer only.
  const workspaceId = pointer.exists()
    ? normalizeEdenWorkspaceId(pointer.data()?.workspaceId)
    : 'eden-x2';
  if (!workspaceId) throw new Error('No current season is published.');
  if (workspaceId !== 'eden-x1') {
    const projection = await getDoc(
      doc(db, edenWorkspaceFirestorePath(workspaceId, 'publicProjection'))
    );
    if (!projection.exists() || !isPublishedWorkspaceProjection(projection.data(), workspaceId)) {
      throw new Error('No current season is published.');
    }
  }
  return workspaceId;
}

export function currentSeasonRedirectUrl(workspaceId, location, vote = false) {
  if (!normalizeEdenWorkspaceId(workspaceId)) throw new Error('Invalid season.');
  const url = new URL(edenWorkspacePublicUrl(workspaceId), new URL('../', location.href));
  for (const [key, value] of new URLSearchParams(location.search)) {
    if (key !== 'workspace' && key !== 'preview') url.searchParams.append(key, value);
  }
  url.hash = vote ? 'vote' : location.hash;
  return url.href;
}

async function openCurrentSeason(root) {
  let timer;
  try {
    const workspaceId = await Promise.race([
      (async () => {
        const [firebase, sdk] = await Promise.all([
          import('./firebase-eden.js'),
          import('./firebase-sdk.js'),
        ]);
        return discoverCurrentPublishedSeason({
          ...firebase,
          importFirestoreLite: sdk.importFirestoreLite,
        });
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Season services are unavailable.')), 12000);
      }),
    ]);
    window.location.replace(
      currentSeasonRedirectUrl(
        workspaceId,
        window.location,
        root.dataset.edenCurrentRedirect === 'vote'
      )
    );
  } catch {
    const status = root.querySelector('[role="status"]');
    if (status)
      status.textContent = 'The current season is unavailable or has not been published yet.';
  } finally {
    clearTimeout(timer);
  }
}

const root =
  typeof document !== 'undefined' ? document.querySelector('[data-eden-current-redirect]') : null;
if (root) void openCurrentSeason(root);
