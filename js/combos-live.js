// js/combos-live.js
//
// The live combo ranking. A superadmin can publish the ranking from the VTS
// Admin Combos planner into Firestore (combos_plan/current); the site then uses
// that list without a commit. js/combos-db.js stays the shipped fallback and the
// reviewed history: this module only ever swaps a fully validated list into
// rankedCombos / baseRankedCombos in place, and restores the shipped list when the
// document asks for it (useShipped) or cannot be trusted.
//
// Order of events on a page load:
//   1. applyCachedLiveCombos() — synchronous: the last valid published list from
//      localStorage, so a returning visitor ranks with it from the first render;
//   2. loadLiveCombos() — after the app boots and signs in anonymously: reads the
//      document, validates every entry, applies it (or the shipped list) and
//      refreshes the cache.
// Either step dispatches `combos:updated` on window when the ranking changes, so
// the open Generator, Hero Atlas and counter tables re-render.

import { replaceRankedCombos, shippedRankedCombos } from './combos-db.js';

export const COMBOS_PLAN_DOC_PATH = 'combos_plan/current';
export const COMBOS_PLAN_MAX_ENTRIES = 600;
export const COMBOS_PLAN_NOTE_MAX = 200;
export const COMBOS_LIVE_CACHE_KEY = 'vts_combos_live_v1';
export const COMBOS_UPDATED_EVENT = 'combos:updated';
export const COMBOS_PLAN_KEYS = Object.freeze([
  'entries',
  'count',
  'shippedHash',
  'updatedAt',
  'updatedBy',
  'useShipped',
]);

const SKIN = /^[123]{3}$/;

/**
 * Validate a published list with the rules js/combo-plan.js applies to the file:
 * three different known heroes, an optional skin code of [123]{3}, an optional
 * note of at most 200 characters, no other keys, and no two entries with the
 * same heroes and skin. Returns { ok, entries } with clean copies, or
 * { ok: false, error } naming the first problem.
 */
export function validateComboEntries(entries, heroNames) {
  const known = heroNames instanceof Set ? heroNames : new Set(heroNames);
  if (!Array.isArray(entries)) return { ok: false, error: 'entries is not a list' };
  if (!entries.length) return { ok: false, error: 'entries is empty' };
  if (entries.length > COMBOS_PLAN_MAX_ENTRIES)
    return { ok: false, error: `more than ${COMBOS_PLAN_MAX_ENTRIES} entries` };
  const seen = new Set();
  const clean = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const at = `entry ${i + 1}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      return { ok: false, error: `${at} is not an object` };
    const extra = Object.keys(entry).filter((key) => !['heroes', 'skin', 'note'].includes(key));
    if (extra.length) return { ok: false, error: `${at} has unknown keys: ${extra.join(', ')}` };
    const { heroes, skin, note } = entry;
    if (!Array.isArray(heroes) || heroes.length !== 3)
      return { ok: false, error: `${at} needs three heroes` };
    if (heroes.some((name) => typeof name !== 'string' || !known.has(name)))
      return { ok: false, error: `${at} names an unknown hero` };
    if (new Set(heroes).size !== 3) return { ok: false, error: `${at} repeats a hero` };
    if (skin !== undefined && (typeof skin !== 'string' || !SKIN.test(skin)))
      return { ok: false, error: `${at} has a bad skin code` };
    if (
      note !== undefined &&
      (typeof note !== 'string' || note.length > COMBOS_PLAN_NOTE_MAX)
    )
      return { ok: false, error: `${at} has a bad note` };
    const key = heroes.join('|') + '#' + (skin || '');
    if (seen.has(key)) return { ok: false, error: `${at} repeats an earlier lineup` };
    seen.add(key);
    clean.push({
      heroes: [...heroes],
      ...(skin ? { skin } : {}),
      ...(note ? { note } : {}),
    });
  }
  return { ok: true, entries: clean };
}

/** A short fingerprint of a ranking (heroes, skin and note, in order). */
export function combosHash(entries) {
  const text = (entries || [])
    .map((c) => (c.heroes || []).join('|') + '#' + (c.skin || '') + '#' + (c.note || ''))
    .join('\n');
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return hash.toString(36) + '.' + entries.length.toString(36);
}

/** The shipped list's fingerprint, which a published document records as shippedHash. */
export const shippedCombosHash = () => combosHash(shippedRankedCombos);

/**
 * What a published document means for this page:
 *   { use: 'published', entries }  a valid list to rank with;
 *   { use: 'shipped', reason }     the shipped file (useShipped, missing, or invalid).
 */
export function readCombosPlanDoc(data, heroNames) {
  if (!data || typeof data !== 'object') return { use: 'shipped', reason: 'no published list' };
  if (data.useShipped === true) return { use: 'shipped', reason: 'the admin chose the shipped list' };
  if (data.count !== (Array.isArray(data.entries) ? data.entries.length : -1))
    return { use: 'shipped', reason: 'count does not match the entries' };
  const checked = validateComboEntries(data.entries, heroNames);
  if (!checked.ok) return { use: 'shipped', reason: checked.error };
  return { use: 'published', entries: checked.entries };
}

/** The document a publish writes, minus updatedAt / updatedBy which the writer stamps. */
export function buildCombosPlanDoc(entries, { useShipped = false } = {}) {
  const list = useShipped ? [] : entries.map((c) => ({ ...c, heroes: [...c.heroes] }));
  return {
    entries: list,
    count: list.length,
    shippedHash: shippedCombosHash(),
    useShipped: !!useShipped,
  };
}

// --- Applying a ranking -------------------------------------------------------------

let source = 'shipped';
let currentHash = null;

/** Where the live ranking came from: 'shipped', 'cache' or 'published'. */
export const liveCombosSource = () => source;

function notify(detail) {
  const target = typeof window !== 'undefined' ? window : globalThis;
  if (typeof target.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return;
  target.dispatchEvent(new CustomEvent(COMBOS_UPDATED_EVENT, { detail }));
}

/**
 * Swap `entries` (already validated) into the live ranking, or the shipped list
 * when `entries` is null. Returns true when the ranking changed.
 */
export function applyComboList(entries, from) {
  const next = entries || shippedRankedCombos;
  const hash = entries ? combosHash(entries) : shippedCombosHash();
  const was = currentHash || shippedCombosHash();
  source = entries ? from : 'shipped';
  currentHash = hash;
  if (hash === was) return false;
  replaceRankedCombos(entries ? entries.map((c) => ({ ...c, heroes: [...c.heroes] })) : next);
  notify({ source, count: next.length });
  return true;
}

function storageOf(storage) {
  if (storage !== undefined) return storage;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readCache(storage) {
  try {
    const raw = storage && storage.getItem(COMBOS_LIVE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeCache(storage, value) {
  try {
    if (!storage) return;
    if (value) storage.setItem(COMBOS_LIVE_CACHE_KEY, JSON.stringify(value));
    else storage.removeItem(COMBOS_LIVE_CACHE_KEY);
  } catch {
    /* private mode or a full quota: the next visit reads Firestore again */
  }
}

/**
 * Step 1: rank with the last published list this browser validated, if it was
 * built on the same shipped file. Synchronous and cheap; never throws.
 */
export function applyCachedLiveCombos({ heroNames, storage } = {}) {
  const store = storageOf(storage);
  const cached = readCache(store);
  if (!cached) return false;
  const checked =
    cached.shippedHash === shippedCombosHash() ? validateComboEntries(cached.entries, heroNames) : null;
  if (!checked || !checked.ok) {
    writeCache(store, null);
    return false;
  }
  return applyComboList(checked.entries, 'cache');
}

/**
 * Step 2: read the published document and rank with it, or with the shipped list.
 * `fetchDoc()` resolves to the document's data (or null when it does not exist);
 * the default reads Firestore after anonymous sign-in. A failure to read keeps
 * whatever is live now (the cache or the shipped list); only a document that says
 * so, or that fails validation, restores the shipped list.
 */
export async function loadLiveCombos({ heroNames, storage, fetchDoc = fetchPublishedDoc } = {}) {
  const store = storageOf(storage);
  let data;
  try {
    data = await fetchDoc();
  } catch (error) {
    return { use: source, reason: 'read failed: ' + (error && error.message ? error.message : error) };
  }
  const decision = readCombosPlanDoc(data, heroNames);
  if (decision.use === 'published') {
    applyComboList(decision.entries, 'published');
    writeCache(store, { shippedHash: shippedCombosHash(), entries: decision.entries });
  } else {
    applyComboList(null);
    writeCache(store, null);
  }
  return decision;
}

async function fetchPublishedDoc() {
  const [firebaseApi, { importFirestore }] = await Promise.all([
    import('./firebase.js'),
    import('./firebase-sdk.js'),
  ]);
  const firebase = firebaseApi.initFirebase();
  if (!firebase || !firebase.configured) throw new Error('Firebase is not configured');
  await firebaseApi.ensureAnonymousAuth();
  const { doc, getDoc } = await importFirestore();
  const snap = await getDoc(doc(firebaseApi.getDb(), COMBOS_PLAN_DOC_PATH));
  return snap.exists() ? snap.data() : null;
}
