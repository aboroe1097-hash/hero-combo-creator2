/**
 * Eden season lifecycle: the registry that names each season, the transitions a
 * superadmin performs from the dashboard (end the running season, start the
 * next, rename a label, browse an ended season read-only), and the dry-run-first
 * recall of a workspace snapshot.
 *
 * The registry lives at ONE global path (`vts_admin/season_registry`) rather
 * than beside each workspace, because it is the season timeline: the ordering,
 * the single-active-season invariant and the rename target span workspaces, and
 * the document has to stay writable after a workspace is archived — which is
 * exactly the moment the rollover happens.
 *
 * Everything here is pure. The dashboard owns the reads, the writes and the
 * Firestore sentinels; this module owns the decisions, so every transition and
 * every hostile-document case is unit-testable without a network.
 */

import { EDEN_WORKSPACE_IDS } from './eden-workspaces.js';

export const SEASON_REGISTRY_PATH = 'vts_admin/season_registry';
export const SEASON_REGISTRY_SCHEMA_VERSION = 1;

// 'draft' is a prepared season, 'active' is the one being played, 'ended' is
// over. Only one season may be active, and ending a season is what freezes its
// workspace.
export const SEASON_STATES = Object.freeze(['ended', 'active', 'draft']);

// The registry is pinned in firestore.rules, and rules cannot iterate a list,
// so the validator checks each entry position explicitly. Eight seasons is
// eight years of history and keeps that unrolled check honest.
export const MAX_SEASON_COUNT = 8;
export const MAX_SEASON_LABEL_LENGTH = 60;
export const MAX_SEASON_ID_LENGTH = 40;

// Same shape the rules pin, so an id the client accepts is never refused later.
export const SEASON_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,39}$/;

export const SEASON_END_REASONS = Object.freeze({
  UNKNOWN_SEASON: 'unknown-season',
  NOT_ACTIVE: 'season-not-active',
  ALREADY_ENDED: 'season-already-ended',
});

export const SEASON_START_REASONS = Object.freeze({
  ACTIVE_SEASON_EXISTS: 'active-season-exists',
  DUPLICATE_SEASON: 'duplicate-season-id',
  NO_FREE_WORKSPACE: 'no-free-workspace',
  UNKNOWN_WORKSPACE: 'unknown-workspace',
  WORKSPACE_ARCHIVED: 'workspace-archived',
  WORKSPACE_RETIRED: 'workspace-retired',
  WORKSPACE_IN_USE: 'workspace-in-use',
});

export const SEASON_RENAME_REASONS = Object.freeze({
  UNKNOWN_SEASON: 'unknown-season',
  EMPTY_LABEL: 'empty-label',
  UNCHANGED: 'label-unchanged',
});

export const SNAPSHOT_RECALL_REASONS = Object.freeze({
  UNREADABLE: 'snapshot-unreadable',
  UNSUPPORTED_SCHEMA: 'snapshot-unsupported-schema',
  EMPTY: 'snapshot-empty',
  WORKSPACE_MISMATCH: 'snapshot-workspace-mismatch',
  READ_ONLY: 'workspace-read-only',
});

// The export format the snapshot button writes, and the keys it carries. The
// recall reads exactly this shape: a snapshot from a future release that grew
// new keys still imports, unknown keys are ignored rather than guessed at.
export const EDEN_SNAPSHOT_SCHEMA = 'vts-eden-workspace-snapshot-v1';
export const EDEN_SNAPSHOT_DOC_KEYS = Object.freeze([
  'dashboardData',
  'rosterData',
  'voteSettings',
  'publicVoteResults',
  'publicProjection',
]);
export const EDEN_SNAPSHOT_COLLECTION_KEYS = Object.freeze([
  'votes',
  'voteHistory',
  'conductAdjustments',
]);

// Vote history is written once, by the voter, with `createdAt == request.time`
// and `voterAuthUid == request.auth.uid`; firestore.rules refuses every update.
// A recall therefore reports those rows and writes none of them, instead of
// half-importing a trail that can never be completed.
export const EDEN_SNAPSHOT_UNRECALLABLE_KEYS = Object.freeze(['voteHistory']);

function normalizeTimestampMs(value) {
  if (typeof value?.toMillis === 'function') {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) && millis > 0 ? Math.floor(millis) : 0;
  }
  const millis = Number(value);
  if (!Number.isFinite(millis) || millis < 0) return 0;
  return Math.floor(millis);
}

export function normalizeEdenSeasonId(value) {
  const id = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!id || id.length > MAX_SEASON_ID_LENGTH) return '';
  return SEASON_ID_PATTERN.test(id) ? id : '';
}

export function normalizeEdenSeasonLabel(value, fallback = '') {
  const label = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SEASON_LABEL_LENGTH);
  return label || fallback;
}

export function normalizeEdenSeasonWorkspaceId(value) {
  const id = String(value ?? '')
    .trim()
    .toLowerCase();
  return EDEN_WORKSPACE_IDS.includes(id) ? id : '';
}

export function normalizeEdenSeasonState(value, fallback = 'draft') {
  return SEASON_STATES.includes(value) ? value : fallback;
}

/**
 * One season, or null when the entry has no usable key. A season without a
 * valid, well-formed id cannot be renamed, ended or browsed, so it is dropped
 * instead of being carried around as a half-object.
 */
export function normalizeEdenSeasonEntry(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = normalizeEdenSeasonId(raw.id);
  if (!id) return null;
  const state = normalizeEdenSeasonState(raw.state);
  return {
    id,
    label: normalizeEdenSeasonLabel(raw.label, id),
    state,
    // An unbound season is legal: the console or a future workspace table can
    // register a season before a workspace is free to host it.
    workspaceId: normalizeEdenSeasonWorkspaceId(raw.workspaceId),
    startedAtMs: normalizeTimestampMs(raw.startedAtMs),
    // A season that is not over carries no end stamp; a stale one is noise.
    endedAtMs: state === 'ended' ? normalizeTimestampMs(raw.endedAtMs) : 0,
  };
}

function compareSeasonEntries(a, b) {
  return a.startedAtMs - b.startedAtMs || a.id.localeCompare(b.id);
}

/**
 * Merges a stored registry document over nothing: unknown fields are dropped,
 * unusable entries are skipped, duplicate ids keep the first entry, and at most
 * one season stays active — the newest one, because an older season that was
 * left marked active is history that was never closed, and demoting it keeps
 * the panel's "current season" honest instead of picking arbitrarily.
 */
export function normalizeSeasonRegistry(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const entries = [];
  const seen = new Set();
  const rawSeasons = Array.isArray(source.seasons) ? source.seasons : [];
  for (const candidate of rawSeasons) {
    const entry = normalizeEdenSeasonEntry(candidate);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    entries.push(entry);
  }
  entries.sort(compareSeasonEntries);
  // Walk backwards, from the newest season: the newest season that claims to be
  // running is the current one, and any older season still marked active is
  // history that was never closed. Demote it to prepared rather than let one
  // document claim two running seasons.
  let activeSeen = false;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.state !== 'active') continue;
    if (activeSeen) {
      entry.state = 'draft';
      entry.endedAtMs = 0;
    }
    activeSeen = true;
  }
  const kept = entries.length > MAX_SEASON_COUNT ? entries.slice(-MAX_SEASON_COUNT) : entries;
  return {
    schemaVersion: SEASON_REGISTRY_SCHEMA_VERSION,
    seasons: kept.map((entry) => ({ ...entry })),
    updatedAtMs: normalizeTimestampMs(source.updatedAtMs ?? source.updatedAt),
    updatedBy: String(source.updatedBy ?? '').slice(0, 128),
  };
}

export function findEdenSeason(registry, seasonId) {
  const id = normalizeEdenSeasonId(seasonId);
  if (!id) return null;
  return registry.seasons.find((season) => season.id === id) || null;
}

export function activeEdenSeason(registry) {
  return registry.seasons.find((season) => season.state === 'active') || null;
}

export function nextEdenSeasonYear(registry, { nowMs = Date.now() } = {}) {
  const years = registry.seasons
    .map((season) => Number((/^season-(\d{4})$/.exec(season.id) || [])[1]))
    .filter((year) => Number.isFinite(year) && year > 0);
  if (years.length) return Math.max(...years) + 1;
  const year = new Date(Number(nowMs) || Date.now()).getUTCFullYear();
  return Number.isFinite(year) ? year : 2027;
}

export function nextEdenSeasonId(registry, options = {}) {
  return `season-${nextEdenSeasonYear(registry, options)}`;
}

export function defaultEdenSeasonLabel(seasonId) {
  const year = (/^season-(\d{4})$/.exec(String(seasonId || '')) || [])[1];
  return year ? `Eden ${year}` : String(seasonId || '');
}

function cloneRegistry(registry) {
  return {
    schemaVersion: SEASON_REGISTRY_SCHEMA_VERSION,
    seasons: registry.seasons.map((season) => ({ ...season })),
    updatedAtMs: registry.updatedAtMs,
    updatedBy: registry.updatedBy,
  };
}

/**
 * Marks the running season over. Nothing is deleted and nothing is renamed: the
 * caller archives the returned `season.workspaceId` through the existing
 * workspace lifecycle path, which is what freezes that season's records read
 * only. Retrying an end whose workspace archive already landed is safe, so the
 * registry write can follow the archive write.
 */
export function endEdenSeason(registry, seasonId, { nowMs = Date.now() } = {}) {
  const season = findEdenSeason(registry, seasonId);
  if (!season) return { ok: false, reason: SEASON_END_REASONS.UNKNOWN_SEASON };
  if (season.state === 'ended') return { ok: false, reason: SEASON_END_REASONS.ALREADY_ENDED };
  if (season.state !== 'active') return { ok: false, reason: SEASON_END_REASONS.NOT_ACTIVE };
  const endedAtMs = Math.max(1, normalizeTimestampMs(nowMs) || Date.now());
  const next = cloneRegistry(registry);
  const target = next.seasons.find((entry) => entry.id === season.id);
  target.state = 'ended';
  target.endedAtMs = Math.max(endedAtMs, target.startedAtMs);
  next.updatedAtMs = endedAtMs;
  return { ok: true, registry: next, season: { ...target } };
}

/**
 * Registers the season a workspace is already running. The registry starts
 * empty while the live workspace (eden-x2) already holds a season's records, so
 * without this there is nothing to end and no free workspace to start on. This
 * writes the registry only: the workspace and its records stay as they are.
 */
export function adoptEdenSeason(registry, options = {}) {
  const { nowMs = Date.now(), workspace = null, label = '' } = options;
  if (activeEdenSeason(registry)) {
    return { ok: false, reason: SEASON_START_REASONS.ACTIVE_SEASON_EXISTS };
  }
  const workspaceId = normalizeEdenSeasonWorkspaceId(workspace?.id);
  if (!workspaceId) return { ok: false, reason: SEASON_START_REASONS.UNKNOWN_WORKSPACE };
  if (workspace?.legacy) return { ok: false, reason: SEASON_START_REASONS.WORKSPACE_RETIRED };
  if (workspace?.lifecycle === 'archived') {
    return { ok: false, reason: SEASON_START_REASONS.WORKSPACE_ARCHIVED };
  }
  const id = normalizeEdenSeasonId(workspace?.holdsSeasonId);
  if (!id) return { ok: false, reason: SEASON_START_REASONS.NO_FREE_WORKSPACE };
  if (findEdenSeason(registry, id)) {
    return { ok: false, reason: SEASON_START_REASONS.DUPLICATE_SEASON };
  }
  const startedAtMs = Math.max(
    1,
    normalizeTimestampMs(workspace?.createdAtMs) || normalizeTimestampMs(nowMs) || Date.now()
  );
  const next = cloneRegistry(registry);
  const season = {
    id,
    label: normalizeEdenSeasonLabel(label, defaultEdenSeasonLabel(id)),
    state: 'active',
    workspaceId,
    startedAtMs,
    endedAtMs: 0,
  };
  next.seasons.push(season);
  next.seasons.sort(compareSeasonEntries);
  next.updatedAtMs = Math.max(1, normalizeTimestampMs(nowMs) || Date.now());
  return { ok: true, registry: next, season: { ...season } };
}

/** The workspace an adopt would register, when the registry has no running season. */
export function adoptableEdenWorkspace({ registry, workspaces = [] } = {}) {
  if (activeEdenSeason(registry)) return null;
  return (
    workspaces.find(
      (workspace) =>
        !workspace?.legacy &&
        workspace?.lifecycle !== 'archived' &&
        normalizeEdenSeasonId(workspace?.holdsSeasonId) &&
        !findEdenSeason(registry, normalizeEdenSeasonId(workspace.holdsSeasonId))
    ) || null
  );
}

/**
 * Describes which workspaces can host a season that has not started yet.
 *
 * `workspaces` are resolved workspace views (`id`, `label`, `lifecycle`,
 * `legacy`, plus the season the workspace currently holds). A workspace is a
 * candidate only when it is still published-from-capable (not the retired
 * legacy archive), not archived, not already bound to a season that has not
 * ended, and not holding another season's live records.
 */
export function seasonWorkspaceCandidates({ registry, workspaces = [] } = {}) {
  const bound = new Set(
    registry.seasons
      .filter((season) => season.state !== 'ended')
      .map((season) => season.workspaceId)
      .filter(Boolean)
  );
  const candidates = [];
  const blocked = [];
  for (const workspace of workspaces) {
    const id = normalizeEdenSeasonWorkspaceId(workspace?.id);
    if (!id) continue;
    const reason = workspaceBlockReason(workspace, id, bound);
    const row = { id, label: String(workspace?.label || id), reason };
    if (reason) blocked.push(row);
    else candidates.push(row);
  }
  return { candidates, blocked };
}

function workspaceBlockReason(workspace, id, bound) {
  // The retired legacy archive can hold records but can never publish a season
  // again, so a season started there would be invisible to members.
  if (workspace?.legacy) return SEASON_START_REASONS.WORKSPACE_RETIRED;
  if (workspace?.lifecycle === 'archived') return SEASON_START_REASONS.WORKSPACE_ARCHIVED;
  if (bound.has(id)) return SEASON_START_REASONS.WORKSPACE_IN_USE;
  if (workspace?.holdsSeasonId) return SEASON_START_REASONS.WORKSPACE_IN_USE;
  return '';
}

/**
 * Starts the next season on a free workspace and makes it the active one. The
 * previous season must already have been ended — starting on top of a running
 * season would leave two seasons claiming the same workspace.
 *
 * The workspace is what makes this step possible or impossible: a season needs
 * a workspace the release still serves, unarchived and empty of another
 * season's records. When none is available the reason is returned instead of a
 * registry, and the panel says so rather than writing a season that has no home.
 */
export function startNextEdenSeason(registry, options = {}) {
  const {
    nowMs = Date.now(),
    seasonId = '',
    label = '',
    workspaceId = '',
    workspaces = [],
  } = options;
  const existing = activeEdenSeason(registry);
  if (existing) return { ok: false, reason: SEASON_START_REASONS.ACTIVE_SEASON_EXISTS };
  const id = normalizeEdenSeasonId(seasonId) || nextEdenSeasonId(registry, { nowMs });
  if (findEdenSeason(registry, id)) {
    return { ok: false, reason: SEASON_START_REASONS.DUPLICATE_SEASON };
  }
  const requested = normalizeEdenSeasonWorkspaceId(workspaceId);
  if (workspaceId && !requested) {
    return { ok: false, reason: SEASON_START_REASONS.UNKNOWN_WORKSPACE };
  }
  const { candidates, blocked } = seasonWorkspaceCandidates({ registry, workspaces });
  const target = requested ? candidates.find((row) => row.id === requested) : candidates[0];
  if (!target) {
    const named = requested ? blocked.find((row) => row.id === requested) : null;
    return { ok: false, reason: named ? named.reason : SEASON_START_REASONS.NO_FREE_WORKSPACE };
  }
  const startedAtMs = Math.max(1, normalizeTimestampMs(nowMs) || Date.now());
  const next = cloneRegistry(registry);
  const season = {
    id,
    label: normalizeEdenSeasonLabel(label, defaultEdenSeasonLabel(id)),
    state: 'active',
    workspaceId: target.id,
    startedAtMs,
    endedAtMs: 0,
  };
  next.seasons.push(season);
  next.seasons.sort(compareSeasonEntries);
  next.updatedAtMs = startedAtMs;
  return { ok: true, registry: next, season: { ...season } };
}

/**
 * Renames the label only. The season key is deliberately immutable: conduct,
 * vote and history documents all carry it in a `season` field, so renaming the
 * key would mean rewriting every one of them. Label-only keeps the rename a
 * single safe write.
 */
export function renameEdenSeason(registry, seasonId, label, { nowMs = Date.now() } = {}) {
  const season = findEdenSeason(registry, seasonId);
  if (!season) return { ok: false, reason: SEASON_RENAME_REASONS.UNKNOWN_SEASON };
  const nextLabel = normalizeEdenSeasonLabel(label);
  if (!nextLabel) return { ok: false, reason: SEASON_RENAME_REASONS.EMPTY_LABEL };
  if (nextLabel === season.label) return { ok: false, reason: SEASON_RENAME_REASONS.UNCHANGED };
  const next = cloneRegistry(registry);
  const target = next.seasons.find((entry) => entry.id === season.id);
  target.label = nextLabel;
  next.updatedAtMs = Math.max(1, normalizeTimestampMs(nowMs) || Date.now());
  return { ok: true, registry: next, season: { ...target } };
}

// --- Snapshot recall -----------------------------------------------------

// Plain JSON, order-insensitive comparison. Both sides of a diff are
// Firestore-shaped data, so canonicalizing keys is enough to tell a changed
// document from an identical one. A Firestore Timestamp is normalized to its
// millisecond value first: the live document holds a Timestamp class and the
// snapshot holds the same instant as `{ type, seconds, nanoseconds }` after its
// JSON round trip, and those two must not read as "changed".
function timestampMillis(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (typeof value.toMillis === 'function') {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) ? millis : null;
  }
  const keys = Object.keys(value);
  if (!keys.includes('seconds') || !keys.includes('nanoseconds')) return null;
  if (keys.some((key) => !['type', 'seconds', 'nanoseconds'].includes(key))) return null;
  const seconds = Number(value.seconds);
  const nanoseconds = Number(value.nanoseconds);
  if (!Number.isFinite(seconds) || !Number.isFinite(nanoseconds)) return null;
  return seconds * 1000 + nanoseconds / 1e6;
}

function canonicalJson(value) {
  const millis = timestampMillis(value);
  if (millis !== null) return `{"__ts":${millis}}`;
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

/**
 * Turns the snapshot's JSON timestamps back into real Firestore timestamps.
 * A restored conduct record has to keep `createdAt is timestamp` to satisfy its
 * validator, and a JSON round trip cannot carry the class.
 */
export function reviveEdenSnapshotTimestamps(value, toTimestamp) {
  const millis = timestampMillis(value);
  if (millis !== null) return typeof toTimestamp === 'function' ? toTimestamp(millis) : value;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((entry) => reviveEdenSnapshotTimestamps(entry, toTimestamp));
  }
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = reviveEdenSnapshotTimestamps(entry, toTimestamp);
  }
  return out;
}

function sameDocument(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function isRecallableDoc(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRecallableCollection(value) {
  return Array.isArray(value);
}

/**
 * Parses a downloaded snapshot file. Anything that is not the documented
 * envelope is refused with a reason the panel can translate, so a renamed or
 * unrelated JSON file never reaches the diff.
 */
export function parseEdenSnapshotJson(text) {
  let parsed = null;
  try {
    parsed = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    return { ok: false, reason: SNAPSHOT_RECALL_REASONS.UNREADABLE };
  }
  return normalizeEdenSnapshot(parsed);
}

export function normalizeEdenSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reason: SNAPSHOT_RECALL_REASONS.UNREADABLE };
  }
  if (value.schema !== EDEN_SNAPSHOT_SCHEMA) {
    return { ok: false, reason: SNAPSHOT_RECALL_REASONS.UNSUPPORTED_SCHEMA };
  }
  const docs = value.docs && typeof value.docs === 'object' ? value.docs : {};
  const hasDoc = EDEN_SNAPSHOT_DOC_KEYS.some((key) => isRecallableDoc(docs[key]));
  const hasCollection = EDEN_SNAPSHOT_COLLECTION_KEYS.some((key) =>
    isRecallableCollection(docs[key])
  );
  if (!hasDoc && !hasCollection) {
    return { ok: false, reason: SNAPSHOT_RECALL_REASONS.EMPTY };
  }
  return {
    ok: true,
    snapshot: {
      schema: EDEN_SNAPSHOT_SCHEMA,
      workspace: String(value.workspace || ''),
      label: String(value.label || ''),
      exportedAt: String(value.exportedAt || ''),
      docs: {
        ...Object.fromEntries(
          EDEN_SNAPSHOT_DOC_KEYS.map((key) => [key, isRecallableDoc(docs[key]) ? docs[key] : null])
        ),
        ...Object.fromEntries(
          EDEN_SNAPSHOT_COLLECTION_KEYS.map((key) => [
            key,
            isRecallableCollection(docs[key])
              ? docs[key]
                  .filter((entry) => entry && typeof entry === 'object' && entry.id !== undefined)
                  .map((entry) => ({ id: String(entry.id), data: entry.data ?? {} }))
              : [],
          ])
        ),
      },
    },
  };
}

/**
 * The dry run. Compares a snapshot against what the workspace holds right now
 * and reports what an import would touch, per collection, without writing
 * anything. `live` is the same shape the export reads: `docs[key]` is the
 * stored document or null, `collections[key]` is a list of `{ id, data }`.
 *
 * A workspace whose lifecycle refuses writes is refused here, before the diff,
 * so the panel never offers an import the archive guard would block.
 */
export function buildEdenSnapshotRecallPlan(options = {}) {
  const {
    snapshot,
    live = { docs: {}, collections: {} },
    workspaceId = '',
    workspaceLabel = '',
    writable = true,
  } = options;
  if (!writable) {
    return { ok: false, reason: SNAPSHOT_RECALL_REASONS.READ_ONLY };
  }
  const snapshotWorkspace = String(snapshot?.workspace || '');
  if (!snapshotWorkspace || snapshotWorkspace !== String(workspaceId || '')) {
    return { ok: false, reason: SNAPSHOT_RECALL_REASONS.WORKSPACE_MISMATCH };
  }
  const snapshotDocs = snapshot?.docs || {};
  const liveDocs = live.docs || {};
  const liveCollections = live.collections || {};
  const rows = [];
  const warnings = [];
  const totals = { create: 0, update: 0, unchanged: 0, skipped: 0 };
  const snapshotSeason = String(snapshotDocs.dashboardData?.r5Season || '');
  const liveSeason = String(liveDocs.dashboardData?.r5Season || '');
  for (const key of EDEN_SNAPSHOT_DOC_KEYS) {
    const incoming = snapshotDocs[key];
    if (!isRecallableDoc(incoming)) {
      rows.push({ key, kind: 'doc', mode: 'skipped', create: 0, update: 0, unchanged: 0 });
      totals.skipped += 1;
      continue;
    }
    const current = isRecallableDoc(liveDocs[key]) ? liveDocs[key] : null;
    const mode = !current ? 'create' : sameDocument(incoming, current) ? 'unchanged' : 'update';
    rows.push({
      key,
      kind: 'doc',
      mode,
      create: mode === 'create' ? 1 : 0,
      update: mode === 'update' ? 1 : 0,
      unchanged: mode === 'unchanged' ? 1 : 0,
    });
    if (mode !== 'skipped') totals[mode] += 1;
  }
  for (const key of EDEN_SNAPSHOT_COLLECTION_KEYS) {
    const incoming = Array.isArray(snapshotDocs[key]) ? snapshotDocs[key] : [];
    const current = new Map(
      (Array.isArray(liveCollections[key]) ? liveCollections[key] : [])
        .filter((entry) => entry && entry.id !== undefined)
        .map((entry) => [String(entry.id), entry.data ?? {}])
    );
    const unreachable = EDEN_SNAPSHOT_UNRECALLABLE_KEYS.includes(key);
    let create = 0;
    let update = 0;
    let unchanged = 0;
    // The ids that actually differ: a recall writes these and nothing else, so
    // an unchanged document is never rewritten (and never re-stamped).
    const changedIds = [];
    for (const entry of incoming) {
      const id = String(entry.id);
      if (!current.has(id)) {
        create += 1;
        changedIds.push(id);
      } else if (sameDocument(entry.data ?? {}, current.get(id))) unchanged += 1;
      else {
        update += 1;
        changedIds.push(id);
      }
    }
    const row = {
      key,
      kind: 'collection',
      mode: unreachable ? 'skipped' : create || update ? 'write' : 'unchanged',
      create,
      update,
      unchanged,
      skipped: unreachable ? create + update : 0,
      readOnly: unreachable,
      changedIds,
    };
    rows.push(row);
    if (unreachable) {
      totals.skipped += create + update;
      if (create || update) warnings.push('vote-history-append-only');
      continue;
    }
    totals.create += create;
    totals.update += update;
    totals.unchanged += unchanged;
    if (key === 'conductAdjustments' && create) warnings.push('conduct-create-needs-author');
  }
  if (snapshotSeason && liveSeason && snapshotSeason !== liveSeason) {
    warnings.push('season-mismatch');
  }
  return {
    ok: true,
    workspaceId,
    workspaceLabel,
    snapshotSeason,
    liveSeason,
    totals,
    rows,
    warnings,
  };
}

/**
 * Turns a reviewed plan into the exact list of writes to perform: one entry per
 * new or changed document. Nothing is ever deleted, and a plan with no changes
 * produces an empty list rather than a no-op write.
 *
 * Two validators need the write itself to move: the dashboard document carries
 * an exact `syncRevision + 1` contract and a monotonic `updatedAtMs`, and vote
 * and settings documents require `updatedAt == request.time`, which the caller
 * stamps with a server value. `stamp` marks the documents that need it.
 */
export function planEdenSnapshotRecallWrites(plan, snapshot) {
  if (!plan?.ok) return [];
  const docs = snapshot?.docs || {};
  const writes = [];
  for (const row of plan.rows) {
    if (row.kind === 'doc') {
      if (row.mode !== 'create' && row.mode !== 'update') continue;
      writes.push({
        key: row.key,
        kind: 'doc',
        id: null,
        data: { ...docs[row.key] },
        mode: row.mode,
      });
      continue;
    }
    if (row.readOnly) continue;
    const incoming = Array.isArray(docs[row.key]) ? docs[row.key] : [];
    const changed = Array.isArray(row.changedIds) ? new Set(row.changedIds) : null;
    for (const entry of incoming) {
      if (changed && !changed.has(String(entry.id))) continue;
      writes.push({
        key: row.key,
        kind: 'collection',
        id: String(entry.id),
        data: { ...(entry.data ?? {}) },
        mode: 'write',
      });
    }
  }
  return writes;
}

export function edenSnapshotRecallKeyNeedsTimestamp(key) {
  return key === 'votes' || key === 'voteSettings' || key === 'publicVoteResults';
}

export function edenSnapshotRecallKeyNeedsAuthorStamp(key) {
  return key === 'voteSettings' || key === 'publicVoteResults';
}

/**
 * Applies the two field contracts the rules enforce on a restored dashboard
 * document: the revision has to be exactly one higher than the stored one, and
 * `updatedAtMs` may not move backwards.
 */
export function edenRecallDashboardWrite(incoming, live, { nowMs = Date.now() } = {}) {
  const currentRevision = Number(live?.syncRevision);
  const nextRevision =
    Number.isFinite(currentRevision) && currentRevision > 0 ? currentRevision + 1 : 1;
  const currentUpdatedAtMs = Number(live?.updatedAtMs) || 0;
  return {
    ...incoming,
    syncRevision: nextRevision,
    updatedAtMs: Math.max(nowMs, currentUpdatedAtMs),
  };
}

export function summarizeEdenSnapshotRecallPlan(plan) {
  if (!plan?.ok) return '';
  return plan.rows
    .map((row) =>
      row.kind === 'doc'
        ? `${row.key}:${row.mode}`
        : `${row.key}:+${row.create}~${row.update}=${row.unchanged}${row.readOnly ? ' (read-only)' : ''}`
    )
    .join(' ');
}
