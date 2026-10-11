import {
  EDEN_WORKSPACE_COLLECTION_PATH,
  buildEmptyEdenWorkspaceDashboard,
  buildEdenPublicProjection,
  edenWorkspaceFirestorePath,
  getEdenWorkspace,
  normalizeEdenWorkspaceId,
  parseEdenWorkspaceRecord,
} from './eden-workspaces.js';
import {
  SEASON_REGISTRY_PATH,
  activeEdenSeason,
  adoptEdenSeason,
  normalizeSeasonRegistry,
  prepareNextEdenSeason,
} from './eden-seasons.js';

export const PUBLIC_SEASON_PATH = 'vts_admin/public_season';

function registryPayload(registry, uid, timestamp) {
  return { schemaVersion: 1, seasons: registry.seasons, updatedAt: timestamp(), updatedBy: uid };
}

function requireWorkspace(workspaceId) {
  if (!normalizeEdenWorkspaceId(workspaceId) || getEdenWorkspace(workspaceId).legacy) {
    throw new Error('Choose a supported season workspace.');
  }
}

// Every bootstrap write is in the same transaction. Retrying an existing draft
// never clears uploaded records, and two leaders cannot claim the same season.
export async function createSeasonDraft({
  db,
  firestore,
  uid,
  workspaceId,
  label,
  sourceWorkspaceId,
  copyRoster = false,
  copySettings = false,
}) {
  requireWorkspace(workspaceId);
  const { doc, runTransaction, serverTimestamp } = firestore;
  const workspace = getEdenWorkspace(workspaceId);
  return runTransaction(db, async (tx) => {
    const registryRef = doc(db, SEASON_REGISTRY_PATH);
    const metadataRef = doc(db, EDEN_WORKSPACE_COLLECTION_PATH, workspaceId);
    const dashboardRef = doc(db, edenWorkspaceFirestorePath(workspaceId, 'dashboardData'));
    const [registrySnap, metadataSnap, dashboardSnap] = await Promise.all([
      tx.get(registryRef),
      tx.get(metadataRef),
      tx.get(dashboardRef),
    ]);
    let registry = normalizeSeasonRegistry(registrySnap.exists() ? registrySnap.data() : null);
    if (metadataSnap.exists() || dashboardSnap.exists()) {
      const existing = registry.seasons.find((entry) => entry.workspaceId === workspaceId);
      if (existing && metadataSnap.data()?.lifecycle !== 'archived') {
        return { created: false, season: existing };
      }
      throw new Error('This workspace already contains records. Choose another season.');
    }
    const source =
      sourceWorkspaceId && normalizeEdenWorkspaceId(sourceWorkspaceId)
        ? getEdenWorkspace(sourceWorkspaceId)
        : null;
    const sourceReads = {};
    if (source) {
      const sourceMetadata = await tx.get(doc(db, EDEN_WORKSPACE_COLLECTION_PATH, source.id));
      const sourceView =
        parseEdenWorkspaceRecord(sourceMetadata.exists() ? sourceMetadata.data() : null) || source;
      for (const key of [
        'dashboardData',
        ...(copyRoster ? ['rosterData'] : []),
        ...(copySettings ? ['dutyPointWeights', 'rewardSettings'] : []),
      ]) {
        const snap = await tx.get(doc(db, edenWorkspaceFirestorePath(source.id, key)));
        sourceReads[key] = snap.exists() ? snap.data() : null;
      }
      const held = sourceReads.dashboardData?.r5Season;
      if (
        !source.legacy &&
        sourceView.lifecycle !== 'archived' &&
        held &&
        !activeEdenSeason(registry) &&
        !registry.seasons.some((entry) => entry.workspaceId === source.id)
      ) {
        const adopted = adoptEdenSeason(registry, {
          workspace: { ...sourceView, holdsSeasonId: held },
        });
        if (adopted.ok) registry = adopted.registry;
      }
    }
    const result = prepareNextEdenSeason(registry, {
      workspaceId,
      seasonId: workspace.defaultSeason,
      label: label || workspace.label,
    });
    if (!result.ok) throw new Error(`Season could not be prepared: ${result.reason}`);
    const dashboard = buildEmptyEdenWorkspaceDashboard(workspace.defaultSeason);
    delete dashboard.date;
    if (copyRoster && sourceReads.dashboardData?.playerRegistry) {
      dashboard.playerRegistry = sourceReads.dashboardData.playerRegistry;
    }
    tx.set(metadataRef, {
      id: workspaceId,
      lifecycle: 'draft',
      active: false,
      createdAtMs: Date.now(),
      publication: null,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
    tx.set(dashboardRef, { ...dashboard, syncRevision: 1, updatedAtMs: Date.now() });
    tx.set(doc(db, edenWorkspaceFirestorePath(workspaceId, 'rosterData')), {
      snapshots: copyRoster ? (sourceReads.rosterData?.snapshots || []).slice(-1) : [],
      updated: new Date().toISOString(),
    });
    tx.set(doc(db, edenWorkspaceFirestorePath(workspaceId, 'voteSettings')), {
      season: workspace.defaultSeason,
      votingOpen: false,
      allowEditing: false,
      showPublicResults: false,
      showMemberResults: false,
      showManagementResults: false,
      showVoterNames: false,
      contributionRankingMode: 'extended',
      closesAt: '',
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
    for (const key of ['dutyPointWeights', 'rewardSettings']) {
      if (copySettings && sourceReads[key]) {
        tx.set(doc(db, edenWorkspaceFirestorePath(workspaceId, key)), {
          ...sourceReads[key],
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
      }
    }
    tx.set(registryRef, registryPayload(result.registry, uid, serverTimestamp));
    return { created: true, season: result.season };
  });
}

export function publicationHistoryPath(workspaceId, revision) {
  requireWorkspace(workspaceId);
  return `eden_seasons/${workspaceId}/publications/${revision}`;
}

// Publish cloud data, never a partially loaded browser cache. A failed roster
// read aborts the transaction along with every other publication write.
export async function publishSeason({
  db,
  firestore,
  uid,
  workspaceId,
  unpublish = false,
  expectedActiveWorkspace = null,
  restoreRevision = null,
}) {
  requireWorkspace(workspaceId);
  if (restoreRevision !== null && (!Number.isInteger(restoreRevision) || restoreRevision < 1)) {
    throw new Error('Choose a valid publication revision.');
  }
  const { doc, runTransaction, serverTimestamp } = firestore;
  return runTransaction(db, async (tx) => {
    const registryRef = doc(db, SEASON_REGISTRY_PATH);
    const pointerRef = doc(db, PUBLIC_SEASON_PATH);
    const metadataRef = doc(db, EDEN_WORKSPACE_COLLECTION_PATH, workspaceId);
    const projectionRef = doc(db, edenWorkspaceFirestorePath(workspaceId, 'publicProjection'));
    const [registrySnap, pointerSnap, metadataSnap, projectionSnap] = await Promise.all([
      tx.get(registryRef),
      tx.get(pointerRef),
      tx.get(metadataRef),
      tx.get(projectionRef),
    ]);
    if (metadataSnap.data()?.lifecycle === 'archived')
      throw new Error('Archived seasons are read-only.');
    if (!metadataSnap.exists() && workspaceId !== 'eden-x2')
      throw new Error('Prepare the season first.');
    const registry = normalizeSeasonRegistry(registrySnap.exists() ? registrySnap.data() : null);
    const active = activeEdenSeason(registry);
    if (
      expectedActiveWorkspace !== null &&
      (active?.workspaceId || '') !== expectedActiveWorkspace
    ) {
      throw new Error('Another leader changed the season. Refresh and review before publishing.');
    }
    let previousMetadataRef = null;
    let previousMetadata = null;
    if (!unpublish && active?.workspaceId && active.workspaceId !== workspaceId) {
      previousMetadataRef = doc(db, EDEN_WORKSPACE_COLLECTION_PATH, active.workspaceId);
      const snap = await tx.get(previousMetadataRef);
      previousMetadata = snap.exists() ? snap.data() : null;
    }
    let projection;
    const revision = (Number(projectionSnap.data()?.revision) || 0) + 1;
    if (restoreRevision !== null) {
      const history = await tx.get(doc(db, publicationHistoryPath(workspaceId, restoreRevision)));
      if (!history.exists() || history.data()?.workspace !== workspaceId) {
        throw new Error('That publication revision is unavailable.');
      }
      projection = {
        ...history.data(),
        revision,
        published: true,
        publishedAtMs: Date.now(),
        updatedBy: uid,
      };
    } else {
      const records = {};
      for (const key of [
        'dashboardData',
        'rosterData',
        'voteSettings',
        'publicVoteResults',
        'dutyPointWeights',
        'rewardSettings',
        'managementVotes',
      ]) {
        const path = edenWorkspaceFirestorePath(workspaceId, key);
        if (!path) continue;
        const snap = await tx.get(doc(db, path));
        records[key] = snap.exists() ? snap.data() : null;
      }
      if (!unpublish && !records.dashboardData)
        throw new Error('The cloud dashboard is not ready.');
      const weights = records.dutyPointWeights;
      projection = buildEdenPublicProjection({
        workspace: workspaceId,
        revision,
        published: !unpublish,
        updatedBy: uid,
        dashboardData: records.dashboardData,
        rosterSnapshots: records.rosterData?.snapshots || [],
        voteSettings: records.voteSettings,
        publicVoteResults: records.publicVoteResults,
        scoring: weights ? { ...weights, dutyPointWeights: weights.weights } : null,
        rewardSettings: records.rewardSettings,
        managementVotes: records.managementVotes?.rows,
      });
    }
    const currentMetadata = metadataSnap.data() || {};
    tx.set(projectionRef, projection);
    tx.set(doc(db, publicationHistoryPath(workspaceId, revision)), projection);
    tx.set(metadataRef, {
      id: workspaceId,
      lifecycle: unpublish ? 'draft' : 'active',
      active: !unpublish,
      createdAtMs: currentMetadata.createdAtMs || Date.now(),
      publication: unpublish
        ? null
        : { revision, publishedAtMs: projection.publishedAtMs, updatedBy: uid },
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
    const selected = registry.seasons.find((entry) => entry.workspaceId === workspaceId);
    if (selected) {
      selected.state = unpublish ? 'draft' : 'active';
      selected.endedAtMs = 0;
      if (!unpublish && !selected.startedAtMs) selected.startedAtMs = Date.now();
    }
    if (!unpublish && active && active.workspaceId !== workspaceId) {
      active.state = 'ended';
      active.endedAtMs = Date.now();
      if (previousMetadataRef)
        tx.set(previousMetadataRef, {
          ...previousMetadata,
          id: active.workspaceId,
          lifecycle: 'archived',
          active: false,
          createdAtMs: previousMetadata?.createdAtMs || active.startedAtMs,
          archivedAtMs: Date.now(),
          publication: previousMetadata?.publication || null,
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
    }
    if (selected || (!unpublish && active))
      tx.set(registryRef, registryPayload(registry, uid, serverTimestamp));
    if (!unpublish || pointerSnap.data()?.workspaceId === workspaceId) {
      // An unpublished pointer remains a valid route but its projection hides
      // content. Never silently redirect visitors to an older season.
      tx.set(pointerRef, {
        workspaceId,
        seasonId: projection.season,
        label: selected?.label || getEdenWorkspace(workspaceId).label,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
      });
    }
    return { projection, revision };
  });
}

export async function readSeasonPreview({ db, firestore, uid, workspaceId }) {
  requireWorkspace(workspaceId);
  const { doc, getDoc } = firestore;
  const records = {};
  for (const key of [
    'dashboardData',
    'rosterData',
    'voteSettings',
    'publicVoteResults',
    'dutyPointWeights',
    'rewardSettings',
    'managementVotes',
  ]) {
    const path = edenWorkspaceFirestorePath(workspaceId, key);
    if (!path) continue;
    const snap = await getDoc(doc(db, path));
    records[key] = snap.exists() ? snap.data() : null;
  }
  if (!records.dashboardData) throw new Error('The cloud dashboard is not ready.');
  return buildEdenPublicProjection({
    workspace: workspaceId,
    published: true,
    updatedBy: uid,
    dashboardData: records.dashboardData,
    rosterSnapshots: records.rosterData?.snapshots || [],
    voteSettings: records.voteSettings,
    publicVoteResults: records.publicVoteResults,
    scoring: records.dutyPointWeights
      ? { ...records.dutyPointWeights, dutyPointWeights: records.dutyPointWeights.weights }
      : null,
    rewardSettings: records.rewardSettings,
    managementVotes: records.managementVotes?.rows,
  });
}

export function parseManagementVotesCsv(text) {
  const rows = String(text || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
  if (!rows.length || rows.length > 1001) throw new Error('Use a CSV with at most 1,000 players.');
  const result = [];
  for (let i = 0; i < rows.length; i += 1) {
    const match = rows[i].match(/^\s*(?:"((?:[^"]|"")*)"|([^,\t]+))[,\t]\s*([\d.]+)\s*$/);
    if (!match && i === 0 && /name/i.test(rows[i]) && /votes/i.test(rows[i])) continue;
    if (!match) throw new Error(`Row ${i + 1}: use Name,Votes with a non-negative number.`);
    const playerName = (match[1] ?? match[2]).replace(/""/g, '"').trim();
    const votes = Number(match[3]);
    if (
      !playerName ||
      playerName.length > 100 ||
      !Number.isFinite(votes) ||
      votes < 0 ||
      votes > 1e9
    ) {
      throw new Error(`Row ${i + 1} is invalid.`);
    }
    if (result.some((row) => row.playerName.toLowerCase() === playerName.toLowerCase())) {
      throw new Error(`Duplicate player: ${playerName}`);
    }
    result.push({ playerName, votes });
  }
  return result;
}
