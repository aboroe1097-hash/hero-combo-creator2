import { getCurrentUser, getDb, initFirebase, onUserChanged } from './firebase.js';
import { importFirestore } from './firebase-sdk.js';

export const ACCOUNT_SYNC_PENDING_KEY = 'vts_sync_pending_v1';
export const ACCOUNT_SYNC_SETTINGS_KEY = 'vts_sync_settings_v1';
export const ACCOUNT_SYNC_META_KEY = 'vts_sync_meta_v1';
export const ACCOUNT_SYNC_SCHEMA_VERSION = 1;
const MAX_PENDING_FEATURES = 16;
const MAX_PAYLOAD_BYTES = 720000;
const adapters = new Map();
const listeners = new Set();
let initialized = false;
let flushing = null;
let deviceId = '';

function storage() { try { return globalThis.localStorage || null; } catch { return null; } }
function readJson(key, fallback) { try { const value = JSON.parse(storage()?.getItem(key) || ''); return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback; } catch { return fallback; } }
function writeJson(key, value) { try { storage()?.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function getDeviceId() {
  if (deviceId) return deviceId;
  const saved = storage()?.getItem('vts_sync_device_id_v1') || '';
  deviceId = /^[a-z0-9]{12,40}$/iu.test(saved) ? saved : (globalThis.crypto?.randomUUID?.().replaceAll('-', '') || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).slice(0, 40);
  try { storage()?.setItem('vts_sync_device_id_v1', deviceId); } catch {}
  return deviceId;
}
function pendingQueue() { return readJson(ACCOUNT_SYNC_PENDING_KEY, {}); }
function settings() { return readJson(ACCOUNT_SYNC_SETTINGS_KEY, {}); }
function metadata() { return readJson(ACCOUNT_SYNC_META_KEY, {}); }
function adapterFor(id) { return adapters.get(id) || null; }
function isEnabled(id) { return settings()[id] !== false; }
function emit(detail) {
  const state = getAccountSyncState();
  listeners.forEach((listener) => listener({ ...state, ...detail }));
  try { globalThis.dispatchEvent(new CustomEvent('vts:account-sync', { detail: { ...state, ...detail } })); } catch {}
}
function payloadFor(featureId) {
  const adapter = adapterFor(featureId);
  if (!adapter || !isEnabled(featureId)) return null;
  try { const json = JSON.stringify(adapter.parse(adapter.serialize())); return json && json.length <= MAX_PAYLOAD_BYTES ? { json } : null; } catch { return null; }
}
function recordChange(featureId, savedAtMs = Date.now()) {
  const queue = pendingQueue();
  queue[featureId] = { savedAtMs: Math.floor(savedAtMs) };
  const ids = Object.keys(queue).sort((a, b) => queue[a].savedAtMs - queue[b].savedAtMs);
  while (ids.length > MAX_PENDING_FEATURES) delete queue[ids.shift()];
  writeJson(ACCOUNT_SYNC_PENDING_KEY, queue);
  const meta = metadata(); meta[featureId] = { ...(meta[featureId] || {}), localSavedAtMs: Math.floor(savedAtMs) }; writeJson(ACCOUNT_SYNC_META_KEY, meta);
}
export function registerAccountSyncAdapter(adapter) {
  if (!adapter?.featureId || !/^[a-z0-9-]{2,48}$/u.test(adapter.featureId)) throw new TypeError('Account sync adapter requires a safe featureId.');
  if (typeof adapter.serialize !== 'function' || typeof adapter.parse !== 'function') throw new TypeError(`${adapter.featureId} requires serialize and parse functions.`);
  adapters.set(adapter.featureId, Object.freeze({ schemaVersion: 1, ...adapter }));
  return () => adapters.delete(adapter.featureId);
}
export function getAccountSyncFeatures() { return [...adapters.values()].map(({ featureId, label, storageKey }) => ({ featureId, label: label || featureId, storageKey: storageKey || '', enabled: isEnabled(featureId) })); }
export function setAccountSyncEnabled(featureId, enabled) { if (!adapterFor(featureId)) return false; const next = settings(); next[featureId] = Boolean(enabled); writeJson(ACCOUNT_SYNC_SETTINGS_KEY, next); if (enabled) queueAccountSync(featureId); emit({ type: 'setting', featureId }); return true; }
export function getAccountSyncState() { const pending = Object.keys(pendingQueue()).filter(isEnabled); const online = typeof navigator === 'undefined' || navigator.onLine !== false; return { online, pending, status: online ? (pending.length ? 'pending' : 'synced') : 'offline', features: getAccountSyncFeatures(), metadata: metadata() }; }
export function onAccountSyncUpdate(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function queueAccountSync(featureId) { if (!adapterFor(featureId) || !isEnabled(featureId) || !payloadFor(featureId)) return false; recordChange(featureId); emit({ type: 'queued', featureId }); void flushAccountSync(); return true; }
// Sync belongs to a real account. A guest's anonymous uid is throwaway — the
// data would be stranded the moment they sign in or change device — and reading
// it is what produced "Missing or insufficient permissions" on every page load
// for signed-out visitors. No account, no sync.
async function activeUser() {
  const context = initFirebase();
  if (!context.configured || !getDb()) return null;
  const user = getCurrentUser();
  return user && !user.isAnonymous ? user : null;
}
async function writeFeature(user, featureId, savedAtMs) {
  const adapter = adapterFor(featureId); const payload = payloadFor(featureId); if (!adapter || !payload) return false;
  const { doc, serverTimestamp, setDoc } = await importFirestore();
  await setDoc(doc(getDb(), 'users', user.uid, 'featureSync', featureId), { schemaVersion: Number(adapter.schemaVersion) || ACCOUNT_SYNC_SCHEMA_VERSION, payload, savedAt: serverTimestamp(), savedAtMs: Math.floor(savedAtMs), deviceId: getDeviceId() });
  const meta = metadata(); meta[featureId] = { ...(meta[featureId] || {}), syncedAtMs: Date.now(), localSavedAtMs: savedAtMs }; writeJson(ACCOUNT_SYNC_META_KEY, meta); return true;
}
async function hydrateFeature(user, featureId) {
  const adapter = adapterFor(featureId); if (!adapter || !isEnabled(featureId)) return false;
  const { doc, getDoc } = await importFirestore();
  // A denied or offline read is an expected outcome, not a failure worth
  // rejecting on: these run in a Promise.all, so one throw used to reject the
  // whole hydrate batch and surface as an unhandled rejection.
  let snapshot;
  try { snapshot = await getDoc(doc(getDb(), 'users', user.uid, 'featureSync', featureId)); }
  catch { return false; }
  if (!snapshot.exists()) return false;
  const data = snapshot.data() || {}; const remoteSavedAt = Math.floor(Number(data.savedAtMs) || 0); const localMeta = metadata()[featureId] || {};
  if (!data.payload || typeof data.payload.json !== 'string' || remoteSavedAt < (localMeta.localSavedAtMs || 0)) return false;
  try { adapter.apply?.(adapter.parse(JSON.parse(data.payload.json))); const meta = metadata(); meta[featureId] = { ...localMeta, localSavedAtMs: remoteSavedAt, syncedAtMs: Date.now() }; writeJson(ACCOUNT_SYNC_META_KEY, meta); emit({ type: 'hydrated', featureId }); return true; } catch { return false; }
}
export async function flushAccountSync({ hydrate = false } = {}) {
  if (flushing) return flushing;
  // Callers fire this with `void flushAccountSync()`, so the promise must never
  // reject — anything escaping here lands as an unhandled rejection and, via
  // window.onerror, in the Firestore error queue.
  flushing = (async () => { const user = await activeUser(); if (!user || (typeof navigator !== 'undefined' && navigator.onLine === false)) return false; if (hydrate) await Promise.all([...adapters.keys()].map((id) => hydrateFeature(user, id))); const queue = pendingQueue(); for (const [id, entry] of Object.entries(queue)) { try { if (await writeFeature(user, id, entry.savedAtMs || Date.now())) delete queue[id]; } catch {} } writeJson(ACCOUNT_SYNC_PENDING_KEY, queue); emit({ type: 'flush' }); return true; })().catch(() => false).finally(() => { flushing = null; });
  return flushing;
}
export function initializeAccountSync() { if (initialized) return; initialized = true; globalThis.addEventListener?.('online', () => void flushAccountSync()); onUserChanged?.(() => void flushAccountSync({ hydrate: true })); void flushAccountSync({ hydrate: true }); }
