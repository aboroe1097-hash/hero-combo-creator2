export function normalizeSyncRevision(value) {
  const revision = Number(value);
  return Number.isInteger(revision) && revision >= 0 ? revision : 0;
}

export function classifyRemoteSnapshot({ currentRevision, incomingRevision, editing = false }) {
  const current = normalizeSyncRevision(currentRevision);
  const incoming = normalizeSyncRevision(incomingRevision);
  if (incoming < current) return 'stale';
  if (incoming === current) return 'duplicate';
  if (editing) return 'defer';
  return 'apply';
}

export function createAdminEditGuard() {
  let active = false;
  let dirty = false;
  let focused = false;
  let scope = '';
  let baseRevision = null;
  let deferredSnapshot = null;
  let deferredRevision = 0;

  function begin(nextScope = 'admin-form', revision = 0) {
    if (!active) {
      active = true;
      scope = String(nextScope || 'admin-form');
      baseRevision = normalizeSyncRevision(revision);
    }
    return baseRevision;
  }

  function focus(nextScope, revision) {
    begin(nextScope, revision);
    focused = true;
    return baseRevision;
  }

  function markDirty(nextScope, revision) {
    begin(nextScope, revision);
    dirty = true;
    return baseRevision;
  }

  function defer(snapshot, revision) {
    const nextRevision = normalizeSyncRevision(revision ?? snapshot?.syncRevision);
    if (!deferredSnapshot || nextRevision >= deferredRevision) {
      deferredSnapshot = snapshot;
      deferredRevision = nextRevision;
    }
    return deferredSnapshot;
  }

  function finish() {
    const deferred = deferredSnapshot;
    active = false;
    dirty = false;
    focused = false;
    scope = '';
    baseRevision = null;
    deferredSnapshot = null;
    deferredRevision = 0;
    return deferred;
  }

  function clearDeferred() {
    deferredSnapshot = null;
    deferredRevision = 0;
  }

  function dropDeferredThrough(revision) {
    if (deferredSnapshot && deferredRevision <= normalizeSyncRevision(revision)) clearDeferred();
  }

  function state() {
    return {
      active,
      dirty,
      focused,
      scope,
      baseRevision,
      deferredRevision,
      hasDeferredSnapshot: Boolean(deferredSnapshot),
    };
  }

  return Object.freeze({
    begin,
    focus,
    blur() {
      focused = false;
    },
    markDirty,
    shouldDeferRemoteSnapshot() {
      // Opening an edit surface freezes the revision immediately. Waiting for
      // the first focus/input event leaves prefilled values vulnerable to a
      // remote snapshot arriving between render and interaction.
      return active;
    },
    expectedBaseRevision(fallbackRevision) {
      return active ? baseRevision : normalizeSyncRevision(fallbackRevision);
    },
    defer,
    peekDeferred() {
      return deferredSnapshot;
    },
    clearDeferred,
    dropDeferredThrough,
    finish,
    state,
  });
}

export function createRevisionWriteQueue(runWrite, { onIdle } = {}) {
  if (typeof runWrite !== 'function') throw new TypeError('runWrite must be a function');
  let tail = Promise.resolve();
  let pending = 0;
  const rebases = new Map();
  const revisionKey = (value) => (value === null ? '__null__' : String(value ?? ''));

  function resolveRevision(requestedRevision) {
    let revision = requestedRevision === null ? null : String(requestedRevision ?? '');
    const seen = new Set();
    while (rebases.has(revisionKey(revision)) && !seen.has(revisionKey(revision))) {
      seen.add(revisionKey(revision));
      revision = rebases.get(revisionKey(revision));
    }
    return revision;
  }

  function enqueue(payload, requestedRevision = null) {
    if (pending === 0) rebases.clear();
    pending += 1;
    const requested = requestedRevision === null ? null : String(requestedRevision ?? '');
    const operation = tail.then(async () => {
      const effectiveRevision = resolveRevision(requested);
      const result = await runWrite(payload, effectiveRevision);
      if (result?.ok && result.revision !== undefined) {
        const nextRevision = result.revision === null ? null : String(result.revision);
        rebases.set(revisionKey(requested), nextRevision);
        rebases.set(revisionKey(effectiveRevision), nextRevision);
      }
      return result;
    });
    tail = operation.catch(() => null);
    return operation.finally(() => {
      pending -= 1;
      if (pending === 0 && typeof onIdle === 'function') onIdle();
    });
  }

  return Object.freeze({
    enqueue,
    state() {
      return { pending };
    },
  });
}

function timestampIdentity(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (Number.isFinite(Number(value?.seconds))) {
    return Number(value.seconds) * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1_000_000);
  }
  return String(value || '');
}

export function conductAdjustmentFingerprint(record) {
  if (!record || typeof record !== 'object') return '';
  return JSON.stringify({
    id: String(record.id || ''),
    season: String(record.season || ''),
    playerKey: String(record.playerKey || ''),
    playerName: String(record.playerName || ''),
    points: Number(record.points || 0),
    category: String(record.category || ''),
    note: String(record.note || ''),
    createdAt: timestampIdentity(record.createdAt),
    createdBy: String(record.createdBy || ''),
  });
}
