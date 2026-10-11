import { normalizeEdenWorkspaceId, isPublishedEdenProjection } from './eden-workspaces.js';

// Generic routes must never silently become the legacy X1 dashboard.
export function resolvePublicEdenWorkspace({ workspace = '', search = '', pathname = '' } = {}) {
  const params = new URLSearchParams(search);
  if (params.has('workspace')) return normalizeEdenWorkspaceId(params.get('workspace'));
  const raw = String(workspace).toLowerCase();
  if (raw === 'dynamic' || pathname.endsWith('/eden-season.html')) return '';
  return normalizeEdenWorkspaceId(/^x\d+$/.test(raw) ? `eden-${raw}` : raw) || 'eden-x1';
}

export function isPublishedWorkspaceProjection(projection, workspaceId) {
  return Boolean(
    workspaceId && isPublishedEdenProjection(projection) && projection.workspace === workspaceId
  );
}

export function publicEdenCacheKey(workspaceId) {
  if (!normalizeEdenWorkspaceId(workspaceId)) return 'vts_eden_invalid_public_dashboard_cache_v1';
  return `vts_${workspaceId.replace('-', '_')}_public_dashboard_cache_v1`;
}

export async function consumeAdminEdenPreview(storage, workspaceId, user) {
  if (
    !normalizeEdenWorkspaceId(workspaceId) ||
    !user ||
    user.isAnonymous === true ||
    typeof user.getIdTokenResult !== 'function'
  ) {
    throw new Error('Sign in as an Admin to preview this season.');
  }
  const token = await user.getIdTokenResult(true);
  if (token?.claims?.admin !== true && token?.claims?.superadmin !== true) {
    throw new Error('An Admin role is required to preview this season.');
  }
  const key = `vts_eden_admin_preview__${workspaceId}`;
  const raw = storage.getItem(key);
  storage.removeItem(key);
  let projection;
  try {
    projection = JSON.parse(raw || 'null');
  } catch {
    /* Invalid snapshots fail closed below. */
  }
  if (!isPublishedWorkspaceProjection(projection, workspaceId)) {
    throw new Error('This preview is missing or expired. Open it again from VTS Admin.');
  }
  return projection;
}

export function resolvePublicEdenCatalog(registry, pointer, publishedIds = []) {
  const published = new Set(publishedIds);
  const entries = (registry?.seasons || []).filter(
    (entry) => entry.workspaceId && published.has(entry.workspaceId) && entry.state !== 'draft'
  );
  const pointerId = normalizeEdenWorkspaceId(pointer?.workspaceId);
  const active = entries.find((entry) => entry.workspaceId === pointerId) || null;
  return {
    current:
      pointerId && published.has(pointerId)
        ? {
            workspaceId: pointerId,
            label: String(active?.label || pointer?.label || `Eden X${pointerId.slice(6)}`),
          }
        : null,
    archives: entries.filter((entry) => entry.workspaceId !== pointerId),
  };
}
