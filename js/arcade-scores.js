// js/arcade-scores.js
// Shared Arcade profile + score/leaderboard system for the five boot mini-games.
//
// Responsibilities (one module for all five games):
//   1. Player profile: a display Name + State, sanitized, stored locally and (best-effort)
//      mirrored to Firestore so the leaderboard can label each row.
//   2. Per-game personal bests: an authoritative local copy (localStorage, reusing each
//      game's existing `vts_proto_*` key) plus a best-effort cloud copy owned by the
//      anonymous Firebase uid.
//   3. Leaderboards: per-game bests and an overall sum of all five personal-best scores,
//      grouped by the player's sanitized Name + State so renewed anonymous sessions do not
//      create duplicate public rows.
//
// Security / trust model:
//   - Every cloud write targets `arcade_scores/{gameId}__{uid}__{playerId}` where uid is the
//     *server* auth uid and playerId is a device-local Arcade profile identity. The rules enforce
//     both fields and the complete document id,
//     so a client can never write a row owned by someone else — the client-supplied uid is
//     never trusted by the rules.
//   - The rules only allow monotonic best increases (new score >= stored score), so a
//     forged or replayed lower score cannot clobber a genuine best.
//   - App Check gates all traffic; this module warms App Check before writing.
//
// Resilience:
//   - Local bests always work with zero network. Cloud sync is best-effort: failures
//     (offline, App Check unavailable, Firestore unreachable) are captured as a pending
//     queue and retried on the next load / `online` event / next report. The current sync
//     state is exposed via getSyncState() and the `arcadeScoresUpdate` event so the UI can
//     show "saved locally, will sync".

const SCORE_KEY_PREFIX = 'vts_proto_';
const PROFILE_KEY = 'vts_arcade_profile';
const PENDING_KEY = 'vts_arcade_pending_scores';

// Canonical game ids (order = display order). gameId === scoreKey without the prefix.
export const GAME_IDS = Object.freeze([
  'merge_rush',
  'sort_hoard',
  'crystal_relay',
  'set_assembly',
  'hero_rumble',
]);

// i18n key + fallback title per game, so the leaderboard can label games without the DOM.
export const GAME_META = Object.freeze({
  merge_rush: { i18n: 'arcadeMergeRushTitle', label: 'Merge Rush' },
  sort_hoard: { i18n: 'arcadeSortHoardTitle', label: 'Sort the Hoard' },
  crystal_relay: { i18n: 'arcadeCrystalRelayTitle', label: 'Crystal Relay' },
  set_assembly: { i18n: 'arcadeSetAssemblyTitle', label: 'Set Assembly' },
  hero_rumble: { i18n: 'arcadeHeroRumbleTitle', label: 'Hero Rumble' },
});

export const NAME_MAX = 24;
export const STATE_MAX = 12;
const CLOUD_SCORE_CAP = 100_000_000; // guard against absurd/forged values before write
const LEADERBOARD_FETCH_CAP = 2000; // bounded single-collection read

const isBrowser = typeof window !== 'undefined';

/* ────────────────────────────── small utilities ───────────────────────────── */

function scoreKeyFor(gameId) {
  return `${SCORE_KEY_PREFIX}${gameId}`;
}

function createPlayerId() {
  const uuid = globalThis.crypto?.randomUUID?.().replaceAll('-', '');
  if (uuid) return uuid.slice(0, 32);
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`.slice(0, 32);
}

function sanitizePlayerId(value) {
  const id = String(value || '')
    .replace(/[^a-z0-9]/giu, '')
    .slice(0, 40);
  return id.length >= 12 ? id : '';
}

function canonicalPlayerKey(row) {
  const name = sanitizeName(row?.name).normalize('NFKC').toLocaleLowerCase('en-US');
  const state = sanitizeState(row?.state)
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/^(?:s|#)(?=\d)/u, '');
  return JSON.stringify([name, state]);
}

function rowSourceKey(row) {
  return `${String(row?.uid || '')}|${String(row?.playerId || 'legacy')}`;
}

function isNewerLabel(row, current) {
  if (!current) return true;
  const rowUpdatedAt = Number(row.updatedAtMs) || 0;
  const currentUpdatedAt = Number(current.updatedAtMs) || 0;
  return (
    rowUpdatedAt > currentUpdatedAt ||
    (rowUpdatedAt === currentUpdatedAt && rowSourceKey(row) < rowSourceKey(current))
  );
}

/** Accept either a canonical gameId ('merge_rush') or a raw scoreKey ('vts_proto_merge_rush'). */
export function normalizeGameId(gameIdOrScoreKey) {
  if (!gameIdOrScoreKey) return '';
  const raw = String(gameIdOrScoreKey);
  const id = raw.startsWith(SCORE_KEY_PREFIX) ? raw.slice(SCORE_KEY_PREFIX.length) : raw;
  return GAME_IDS.includes(id) ? id : '';
}

function coerceScore(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, CLOUD_SCORE_CAP);
}

function readLocal(key, fallback = null) {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : raw;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage full / blocked — local best simply won't persist this run */
  }
}

function emitUpdate(detail) {
  if (!isBrowser) return;
  try {
    window.dispatchEvent(new CustomEvent('arcadeScoresUpdate', { detail }));
  } catch {
    /* CustomEvent unsupported — non-fatal */
  }
}

/* ─────────────────────────────── profile (name/state) ─────────────────────── */

/**
 * Sanitize a display name: strip control chars, collapse whitespace, trim, clamp length.
 * Returns '' for anything that reduces to empty.
 */
export function sanitizeName(raw) {
  if (raw == null) return '';
  const cleaned = String(raw)
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, NAME_MAX);
}

/**
 * Sanitize a state/kingdom tag. States in this game are short numeric-ish tags (e.g. "1097"
 * or "S1097"); keep letters/digits/#- and clamp hard.
 */
export function sanitizeState(raw) {
  if (raw == null) return '';
  const cleaned = String(raw)
    .replace(/\p{Cc}/gu, '')
    .replace(/[^\p{L}\p{N}#\- ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, STATE_MAX);
}

export function loadProfile() {
  const raw = readLocal(PROFILE_KEY);
  if (!raw) return { id: '', name: '', state: '' };
  try {
    const parsed = JSON.parse(raw);
    const profile = {
      id: sanitizePlayerId(parsed?.id),
      name: sanitizeName(parsed?.name),
      state: sanitizeState(parsed?.state),
    };
    if (profile.name && !profile.id) {
      profile.id = createPlayerId();
      writeLocal(PROFILE_KEY, JSON.stringify(profile));
    }
    return profile;
  } catch {
    return { id: '', name: '', state: '' };
  }
}

export function hasProfile() {
  return loadProfile().name.length > 0;
}

/**
 * Persist a sanitized profile locally, notify listeners, and best-effort mirror the new
 * name/state onto this user's existing cloud score rows. Returns the sanitized profile.
 */
export function saveProfile(input) {
  const previous = loadProfile();
  const profile = { name: sanitizeName(input?.name), state: sanitizeState(input?.state) };
  const playerChanged =
    Boolean(previous.name) &&
    Boolean(profile.name) &&
    previous.name.localeCompare(profile.name, undefined, { sensitivity: 'base' }) !== 0;
  profile.id = playerChanged ? createPlayerId() : previous.id || createPlayerId();
  writeLocal(PROFILE_KEY, JSON.stringify(profile));
  if (playerChanged) {
    resetLocalPlayerScores();
  } else if (profile.name) {
    queueLocalBestsForSync();
  }
  emitUpdate({ type: 'profile', profile });
  // State edits and case-only corrections keep this player's rows. A genuinely different
  // name starts a fresh anonymous identity so one shared browser cannot overwrite a prior
  // player's leaderboard label or inherit their scores.
  if (!playerChanged) void relabelCloudScores(profile);
  return profile;
}

function resetLocalPlayerScores() {
  if (!isBrowser) return;
  for (const gameId of GAME_IDS) {
    try {
      window.localStorage.removeItem(scoreKeyFor(gameId));
    } catch {
      // A blocked storage layer already behaves like an empty new-player scorecard.
    }
  }
  savePending({});
  setSyncState('idle');
}

/* ─────────────────────────────── local personal bests ─────────────────────── */

export function loadLocalBest(gameIdOrScoreKey) {
  const gameId = normalizeGameId(gameIdOrScoreKey);
  if (!gameId) return 0;
  return coerceScore(readLocal(scoreKeyFor(gameId), '0'));
}

function saveLocalBest(gameId, score) {
  const prev = loadLocalBest(gameId);
  if (score > prev) {
    writeLocal(scoreKeyFor(gameId), String(score));
    return score;
  }
  return prev;
}

export function getAllLocalBests() {
  const out = {};
  for (const gameId of GAME_IDS) out[gameId] = loadLocalBest(gameId);
  return out;
}

/* ─────────────────────────────── pending-sync queue ───────────────────────── */

function loadPending() {
  const raw = readLocal(PENDING_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function savePending(map) {
  if (Object.keys(map).length === 0) {
    if (isBrowser) {
      try {
        window.localStorage.removeItem(PENDING_KEY);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  writeLocal(PENDING_KEY, JSON.stringify(map));
}

function queuePending(gameId, score) {
  const map = loadPending();
  if (!map[gameId] || score > map[gameId]) {
    map[gameId] = score;
    savePending(map);
  }
}

/**
 * Seed every positive device best into the durable retry queue.
 *
 * This migrates scores created before cloud leaderboards existed and scores earned before a
 * player chose a display name. The cloud monotonic guard makes repeated seeding idempotent.
 */
export function queueLocalBestsForSync() {
  if (!loadProfile().name) return 0;
  let queued = 0;
  for (const gameId of GAME_IDS) {
    const score = loadLocalBest(gameId);
    if (score <= 0) continue;
    queuePending(gameId, score);
    queued += 1;
  }
  if (queued > 0 && syncState !== 'syncing') setSyncState('pending');
  return queued;
}

function clearPending(gameId, syncedScore) {
  const map = loadPending();
  // Only clear if nothing newer was queued in the meantime.
  if (map[gameId] != null && map[gameId] <= syncedScore) {
    delete map[gameId];
    savePending(map);
  }
}

export function hasPendingSync() {
  return Object.keys(loadPending()).length > 0;
}

/* ─────────────────────────────── firebase plumbing ────────────────────────── */

let syncState = 'idle'; // idle | syncing | synced | pending | offline | error | local-only
let firebaseWarmup = null;
let firebaseContext = null;

function setSyncState(next) {
  if (syncState === next) return;
  syncState = next;
  emitUpdate({ type: 'sync', state: next });
}

export function getSyncState() {
  if (isBrowser && typeof navigator !== 'undefined' && navigator.onLine === false) {
    return hasPendingSync() ? 'offline' : syncState;
  }
  if (hasPendingSync() && syncState !== 'syncing') return 'pending';
  return syncState;
}

/**
 * Initialize Firebase (anon auth + Firestore) and warm App Check exactly once.
 * Resolves to { db, uid, fs } or null when Firebase is unavailable/unconfigured/offline.
 */
async function ensureFirebase() {
  if (!isBrowser) return null;
  if (firebaseContext) return firebaseContext;
  if (firebaseWarmup) return firebaseWarmup;

  firebaseWarmup = (async () => {
    try {
      const [firebaseApi, fs] = await Promise.all([
        import('./firebase.js'),
        import('./firebase-sdk.js').then((m) => m.importFirestore()),
      ]);
      const {
        initFirebase,
        ensureAnonymousAuth,
        getDb,
        getFirebaseAppCheckToken,
        isFirebaseConfigured,
      } = firebaseApi;

      if (!isFirebaseConfigured()) {
        setSyncState('local-only');
        return null;
      }
      initFirebase();
      const user = await ensureAnonymousAuth();
      const db = getDb();
      if (!db || !user?.uid) return null;
      // Warm App Check so Firestore requests carry a token (best-effort; enforcement is
      // project-side, not in rules — a failure here just means the write may be rejected,
      // which we already handle by queueing).
      try {
        await getFirebaseAppCheckToken();
      } catch {
        /* App Check not ready; proceed and let the write succeed or queue */
      }
      firebaseContext = { db, uid: user.uid, fs };
      return firebaseContext;
    } catch {
      setSyncState(
        typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error'
      );
      return null;
    }
  })().finally(() => {
    // Keep a successful context, but let later online/retry events recover from a failed warmup.
    firebaseWarmup = null;
  });

  return firebaseWarmup;
}

function docIdFor(gameId, uid, playerId) {
  return `${gameId}__${uid}__${playerId}`;
}

/* ─────────────────────────────── cloud writes ─────────────────────────────── */

/**
 * Push a personal best to Firestore. Owner-scoped, monotonic, App-Check gated.
 * Never throws; returns true on success, false when it was queued for retry.
 */
async function syncScoreToCloud(gameId, score) {
  const ctx = await ensureFirebase();
  if (!ctx) {
    queuePending(gameId, score);
    if (!['offline', 'error', 'local-only'].includes(syncState)) setSyncState('error');
    return false;
  }
  const profile = loadProfile();
  if (!profile.name || !profile.id) {
    // No identity yet: keep locally, sync once a name is set.
    queuePending(gameId, score);
    setSyncState('pending');
    return false;
  }

  try {
    setSyncState('syncing');
    const { db, uid, fs } = ctx;
    const { doc, setDoc, getDoc, serverTimestamp } = fs;
    const ref = doc(db, 'arcade_scores', docIdFor(gameId, uid, profile.id));

    // Client-side monotonic guard (rules enforce it server-side too): don't downgrade.
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() || {} : {};
    const cloudBest = existing.exists() ? coerceScore(existingData.score) : 0;
    if (score <= cloudBest) {
      // Cloud already has an equal/better score. Only write when the public label changed.
      if (existingData.name !== profile.name || existingData.state !== profile.state) {
        await setDoc(
          ref,
          {
            gameId,
            uid,
            playerId: profile.id,
            name: profile.name,
            state: profile.state,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      clearPending(gameId, score);
      setSyncState('synced');
      return true;
    }

    await setDoc(ref, {
      gameId,
      uid,
      playerId: profile.id,
      name: profile.name,
      state: profile.state,
      score,
      updatedAt: serverTimestamp(),
    });
    clearPending(gameId, score);
    setSyncState('synced');
    return true;
  } catch {
    queuePending(gameId, score);
    setSyncState('error');
    return false;
  }
}

/** Update name/state on every existing cloud row for this user (after a profile edit). */
async function relabelCloudScores(profile) {
  if (!profile?.name) return;
  const ctx = await ensureFirebase();
  if (!ctx) return;
  try {
    const { db, uid, fs } = ctx;
    const { doc, setDoc, getDoc, serverTimestamp } = fs;
    await Promise.all(
      GAME_IDS.map(async (gameId) => {
        const ref = doc(db, 'arcade_scores', docIdFor(gameId, uid, profile.id));
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        await setDoc(
          ref,
          { name: profile.name, state: profile.state, updatedAt: serverTimestamp() },
          { merge: true }
        );
      })
    );
  } catch {
    /* best-effort re-label; leaderboard still works with the old label */
  }
}

/** Retry any queued scores. Called on init, on `online`, and after a profile is set. */
let flushInFlight = null;

export function flushPendingSync() {
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
    const entries = Object.entries(loadPending());
    for (const [gameId, score] of entries) {
      if (!normalizeGameId(gameId)) {
        clearPending(gameId, score);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await syncScoreToCloud(gameId, coerceScore(score));
    }
  })().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

/* ─────────────────────────────── public: report a score ───────────────────── */

/**
 * Record a finished game's score. Always updates the local best; best-effort syncs a new
 * best to the cloud. Safe to call from the game iframe or standalone game page.
 * Returns { gameId, best, isNewBest, synced }.
 */
export async function reportScore(gameIdOrScoreKey, rawScore) {
  const gameId = normalizeGameId(gameIdOrScoreKey);
  const score = coerceScore(rawScore);
  if (!gameId) return { gameId: '', best: score, isNewBest: false, synced: false };

  const prevBest = loadLocalBest(gameId);
  const best = saveLocalBest(gameId, score);
  const isNewBest = score > prevBest && score > 0;
  emitUpdate({ type: 'best', gameId, best, isNewBest });

  if (!isNewBest) return { gameId, best, isNewBest, synced: false };

  const synced = await syncScoreToCloud(gameId, best).catch(() => false);
  return { gameId, best, isNewBest, synced };
}

/**
 * Cloud-sync a score that the caller has already confirmed is a new local best (e.g. the
 * game shell, which owns the local best + game-over UI). Updates the local best defensively
 * (idempotent max) and always attempts the cloud write; the cloud does its own monotonic
 * check and offline failures are queued. Never throws.
 */
export async function pushBestToCloud(gameIdOrScoreKey, rawScore) {
  const gameId = normalizeGameId(gameIdOrScoreKey);
  const score = coerceScore(rawScore);
  if (!gameId || score <= 0) return false;
  saveLocalBest(gameId, score);
  emitUpdate({ type: 'best', gameId, best: loadLocalBest(gameId), isNewBest: true });
  return syncScoreToCloud(gameId, score).catch(() => false);
}

/* ─────────────────────────────── leaderboards ─────────────────────────────── */

/**
 * Fetch all arcade score rows (bounded). Returns [] when Firebase is unavailable.
 * Rows: { gameId, uid, playerId, name, state, score, updatedAtMs }.
 */
export async function fetchAllScores() {
  const ctx = await ensureFirebase();
  if (!ctx) throw new Error('Arcade leaderboard is unavailable');
  try {
    const { db, fs } = ctx;
    const { collection, query, limit, getDocs } = fs;
    const snap = await getDocs(
      query(collection(db, 'arcade_scores'), limit(LEADERBOARD_FETCH_CAP))
    );
    const rows = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data() || {};
      const gameId = normalizeGameId(d.gameId);
      if (!gameId) return;
      rows.push({
        gameId,
        uid: typeof d.uid === 'string' ? d.uid : '',
        playerId: sanitizePlayerId(d.playerId) || 'legacy',
        name: sanitizeName(d.name) || '—',
        state: sanitizeState(d.state),
        score: coerceScore(d.score),
        updatedAtMs: d.updatedAt?.toMillis ? d.updatedAt.toMillis() : 0,
      });
    });
    return rows;
  } catch (error) {
    setSyncState(
      typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error'
    );
    throw error;
  }
}

/** Per-game leaderboard: rows sorted by score desc, tie-broken by earliest update. */
export function buildGameLeaderboard(rows, gameId, topN = 25) {
  const id = normalizeGameId(gameId);
  if (!id) return [];

  const bestByPlayer = new Map();
  const latestLabelByPlayer = new Map();
  for (const row of rows) {
    if (row.gameId !== id || !row.uid || row.score <= 0) continue;
    const playerKey = canonicalPlayerKey(row);
    if (isNewerLabel(row, latestLabelByPlayer.get(playerKey))) {
      latestLabelByPlayer.set(playerKey, row);
    }
    const current = bestByPlayer.get(playerKey);
    if (
      !current ||
      row.score > current.score ||
      (row.score === current.score && row.updatedAtMs < current.updatedAtMs) ||
      (row.score === current.score &&
        row.updatedAtMs === current.updatedAtMs &&
        rowSourceKey(row) < rowSourceKey(current))
    ) {
      bestByPlayer.set(playerKey, row);
    }
  }

  return [...bestByPlayer.entries()]
    .map(([playerKey, row]) => {
      const label = latestLabelByPlayer.get(playerKey) || row;
      return { ...row, name: label.name, state: label.state, playerKey };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.updatedAtMs - b.updatedAtMs || a.playerKey.localeCompare(b.playerKey)
    )
    .slice(0, topN)
    .map(({ playerKey: _playerKey, ...row }, i) => ({ rank: i + 1, ...row }));
}

/**
 * Overall Arcade leaderboard requested by the owner: add each player's best
 * raw score from every game. Unplayed games contribute 0. `gamesPlayed` and
 * the per-game bests remain visible so the total can be checked directly.
 */
export function buildOverallLeaderboard(rows, topN = 25) {
  const totalGames = GAME_IDS.length;

  const bestByPlayerGame = new Map(); // `${playerKey}|${gameId}` -> score
  const playerInfo = new Map(); // playerKey -> { uid, playerId, name, state, latestMs }

  for (const r of rows) {
    if (!r.uid || r.score <= 0 || !GAME_IDS.includes(r.gameId)) continue;
    const playerId = r.playerId || 'legacy';
    const playerKey = canonicalPlayerKey(r);
    const key = `${playerKey}|${r.gameId}`;
    if (!bestByPlayerGame.has(key) || r.score > bestByPlayerGame.get(key)) {
      bestByPlayerGame.set(key, r.score);
    }
    const info = playerInfo.get(playerKey) || {
      uid: r.uid,
      playerId,
      name: r.name,
      state: r.state,
      latestMs: 0,
    };
    if (isNewerLabel(r, info.labelRow)) {
      info.uid = r.uid;
      info.playerId = playerId;
      info.name = r.name;
      info.state = r.state;
      info.latestMs = r.updatedAtMs;
      info.labelRow = r;
    }
    playerInfo.set(playerKey, info);
  }

  const players = [];
  for (const [playerKey, info] of playerInfo) {
    let totalScore = 0;
    let gamesPlayed = 0;
    const perGame = {};
    for (const gameId of GAME_IDS) {
      const best = bestByPlayerGame.get(`${playerKey}|${gameId}`);
      if (best == null) continue;
      gamesPlayed += 1;
      totalScore += best;
      perGame[gameId] = { score: best };
    }
    if (gamesPlayed === 0) continue;
    players.push({
      playerKey,
      uid: info.uid,
      playerId: info.playerId,
      name: info.name,
      state: info.state,
      rating: totalScore,
      gamesPlayed,
      totalGames,
      perGame,
    });
  }

  return players
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        b.gamesPlayed - a.gamesPlayed ||
        a.playerKey.localeCompare(b.playerKey)
    )
    .slice(0, topN)
    .map(({ playerKey: _playerKey, ...player }, i) => ({ rank: i + 1, ...player }));
}

/** Convenience: fetch once and build every board + this user's standing. */
export async function fetchLeaderboards({ topN = 25 } = {}) {
  const rows = await fetchAllScores();
  const perGame = {};
  for (const gameId of GAME_IDS) perGame[gameId] = buildGameLeaderboard(rows, gameId, topN);
  const overall = buildOverallLeaderboard(rows, topN);
  return { rows, perGame, overall, empty: rows.length === 0 };
}

/* ─────────────────────────────── lifecycle ────────────────────────────────── */

let initialized = false;

/** Warm sync + wire the `online` retry. Idempotent; safe to call from any arcade surface. */
export function initArcadeScores() {
  if (initialized || !isBrowser) return;
  initialized = true;
  queueLocalBestsForSync();
  if (hasPendingSync()) setSyncState('pending');
  window.addEventListener('online', () => {
    void flushPendingSync();
  });
  // Attempt a flush shortly after load so a returning player's queued bests sync up.
  if (hasPendingSync()) void flushPendingSync();
}

export const __testing__ = {
  scoreKeyFor,
  coerceScore,
  countLtEqRef: (sortedAsc, value) => sortedAsc.filter((s) => s <= value).length,
};
