// Shared constants, state, and helpers for OCR dashboard modules
import { isLocalDevHost } from './utils.js';

// --- Storage Keys ---
export const STORAGE_KEY = 'vts_ocr_dashboard';
export const ROSTER_KEY = 'vts_ocr_roster';
export const ROSTER_SNAPSHOTS_KEY = 'vts_roster_snapshots';
export const BANNER_KEY = 'vts_ocr_banners';
export const DUTY_LIST_KEY = 'vts_ocr_duty_lists';
export const CONTRIBUTION_KEY = 'vts_ocr_contribution_lists';
export const FS_PATH = 'vts_admin/dashboard_data';
export const FS_ROSTER_PATH = 'vts_admin/roster_data';
export const LOG_KEY = 'vts_ocr_log';
export const MAX_ROSTER_SNAPSHOTS = 50;

// --- Roster Auth ---
export const ROSTER_USERS = ['V3S', 'VTS', 'BIG', 'NM5', 'PP5'];
const ADMIN_AUTH_CONFIG = window.VTS_ADMIN_AUTH || {};
export const ROSTER_PASS_HASH = ADMIN_AUTH_CONFIG.rosterPassHashes || {};
export const ROSTER_AUTH_KEY = 'vts_roster_auth';
export const ALLIANCE_KEY = 'vts_ocr_alliances';
export const ALLIANCE_COUNT = 5;

// --- General Utils ---
export async function sha256(str) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (e) {
    return null;
  }
}

export function sanitizeForFirestore(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((item) => {
      const clean = sanitizeForFirestore(item);
      return clean === undefined ? null : clean;
    });
  }
  if (typeof value === 'object') {
    const clean = {};
    Object.entries(value).forEach(([key, item]) => {
      const cleanedValue = sanitizeForFirestore(item);
      if (cleanedValue !== undefined) clean[key] = cleanedValue;
    });
    return clean;
  }
  return value;
}

// --- OCR ---
export const QWEN_WORKER_URL = 'https://delicate-term-725f.aboroe1097.workers.dev';
const SUPPORTED_OCR_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

function hasSupportedOcrImageExtension(file) {
  return /\.(png|jpe?g|webp)$/i.test(String(file?.name || ''));
}

export function isSupportedOcrImageFile(file) {
  const type = String(file?.type || '').toLowerCase();
  return SUPPORTED_OCR_IMAGE_MIME.has(type) || hasSupportedOcrImageExtension(file);
}

export function isGuest() {
  return false;
}

export function getSupportedOcrImageFiles(files) {
  return Array.from(files || []).filter(isSupportedOcrImageFile);
}

export function describeRejectedOcrImageFiles(files) {
  return Array.from(files || [])
    .filter(file => !isSupportedOcrImageFile(file))
    .map(file => file?.name || file?.type || 'unnamed image')
    .filter(Boolean);
}

export async function readOcrImageDataUrl(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(String(e.target?.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read selected image.'));
    reader.readAsDataURL(file);
  });
  if (/^data:image\//i.test(dataUrl)) return dataUrl;
  const base64 = dataUrl.split(',')[1] || '';
  const type = String(file?.type || '').toLowerCase();
  const mime = SUPPORTED_OCR_IMAGE_MIME.has(type) ? type : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

export async function checkOcrService(options = {}) {
  try {
    const res = await fetch(`${QWEN_WORKER_URL}/status`, { cache: 'no-store' });
    if (!res.ok) return { configured: false, error: `Worker status ${res.status}` };
    const data = await res.json();
    const hasOcrSecret = data.configured === true;
    const hasAppCheck = data.appCheckConfigured === true;
    if (hasOcrSecret && hasAppCheck) {
      const firebaseApi = await import('./firebase.js');
      const { getFirebaseSetupStatus } = firebaseApi;
      const firebaseStatus = getFirebaseSetupStatus?.();
      if (
        firebaseStatus &&
        (firebaseStatus.configured === false ||
          firebaseStatus.hasRecaptchaSiteKey === false ||
          Boolean(firebaseStatus.appCheckInitError))
      ) {
        return {
          configured: false,
          error: describeFirebaseAppCheckStatus(firebaseStatus),
        };
      }
      if (options.verifyAppCheckToken !== true) return { configured: true, error: '' };
      try {
        const { getFirebaseAppCheckToken } = firebaseApi;
        const appCheckToken = await getFirebaseAppCheckToken();
        if (appCheckToken) return { configured: true, error: '' };
        return {
          configured: false,
          error: describeFirebaseAppCheckStatus(getFirebaseSetupStatus?.()),
        };
      } catch (err) {
        return {
          configured: false,
          error: `Firebase App Check token unavailable: ${describeFirebaseAppCheckTokenError(err)}`,
        };
      }
    }
    const error =
      data.error ||
      (!hasOcrSecret
        ? 'Worker is missing DASHSCOPE_API_KEY'
        : 'Firebase App Check is missing FIREBASE_APP_CHECK_PROJECT_NUMBER');
    return { configured: false, error };
  } catch (err) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const localPortHint = /^http:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):(4173|4174|5173|5174|5175|5176|5177)$/.test(origin)
      ? ` ${origin} is not currently allowed by the OCR Worker. Add this origin to ALLOWED_ORIGINS or redeploy the Worker with LAN dev origins enabled.`
      : '';
    return {
      configured: false,
      error: `${err?.message || 'OCR worker unavailable'}${localPortHint}`,
    };
  }
}

function createQwenVisionRequestError(message, options = {}) {
  const err = new Error(message);
  err.name = 'QwenVisionRequestError';
  if (Number.isFinite(options.status)) err.status = options.status;
  if (Number.isFinite(options.retryAfter)) err.retryAfter = options.retryAfter;
  if (options.details) err.details = options.details;
  if (options.responseBody !== undefined) err.responseBody = options.responseBody;
  if (options.retryable === false) err.retryable = false;
  if (options.localConfiguration) err.localConfiguration = true;
  return err;
}

function describeFirebaseAppCheckStatus(status) {
  if (!status?.configured) {
    return 'Firebase web config is missing. Serve the app through Vite or deploy with VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID.';
  }
  if (!status.hasRecaptchaSiteKey) {
    return 'VITE_RECAPTCHA_SITE_KEY is missing. This must be the public reCAPTCHA Enterprise site key from Firebase App Check.';
  }
  if (status.appCheckInitError) {
    return `Firebase App Check failed to initialize: ${status.appCheckInitError}`;
  }
  if (status.appCheckTokenError) {
    if (/recaptcha/i.test(status.appCheckTokenError) && /timeout/i.test(status.appCheckTokenError)) {
      return 'Firebase App Check reCAPTCHA timed out. Check network/ad blockers, then click Check OCR or retry the upload.';
    }
    if (isAppCheckForbiddenMessage(status.appCheckTokenError)) {
      return describeAppCheckForbiddenStatus(status);
    }
    return `Firebase App Check token failed: ${status.appCheckTokenError}`;
  }
  return 'Firebase App Check is not initialized yet.';
}

function isAppCheckForbiddenMessage(message) {
  return /403|fetch-status-error|exchangeDebugToken|debug token|permission|unauthorized/i.test(String(message || ''));
}

function describeAppCheckForbiddenStatus(status = {}) {
  if (status.isLocalDevHost || isLocalDevHost()) {
    const tokenModeHint =
      status.appCheckDebugTokenMode === 'generated'
        ? ' Because .env uses VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=true, replace it with that registered UUID and restart Vite.'
        : '';
    return `Firebase App Check rejected the local debug token (HTTP 403). Add the UUID printed in DevTools as "App Check debug token" to Firebase Console > App Check > your web app > Manage debug tokens.${tokenModeHint}`;
  }
  return 'Firebase App Check rejected the token (HTTP 403). Confirm the reCAPTCHA Enterprise site key belongs to this Firebase web app and the domain is allowed in App Check.';
}

function describeFirebaseAppCheckTokenError(err) {
  const message = err?.message || 'Firebase App Check could not load.';
  if (/recaptcha/i.test(message) && /timeout/i.test(message)) {
    return 'Firebase App Check reCAPTCHA timed out. Check network/ad blockers, then click Check OCR or retry the upload.';
  }
  if (isAppCheckForbiddenMessage(message)) {
    return describeAppCheckForbiddenStatus();
  }
  return `${message} Confirm the reCAPTCHA Enterprise site key belongs to this Firebase project and register a debug token for local testing if needed.`;
}

async function getOcrAppCheckToken(options = {}) {
  const suppliedToken = String(options.appCheckToken || '').trim();
  if (suppliedToken) return suppliedToken;

  try {
    const { getFirebaseAppCheckToken, getFirebaseSetupStatus } = await import('./firebase.js');
    const appCheckToken = await getFirebaseAppCheckToken();
    if (appCheckToken) return appCheckToken;
    const reason = describeFirebaseAppCheckStatus(getFirebaseSetupStatus?.());
    throw createQwenVisionRequestError(
      `Firebase App Check token unavailable. ${reason} The reCAPTCHA Enterprise site key creates the token; it is not the token sent to the OCR Worker.`,
      { status: 401, retryable: false, localConfiguration: true }
    );
  } catch (err) {
    if (err?.name === 'QwenVisionRequestError') throw err;
    throw createQwenVisionRequestError(
      `Firebase App Check token unavailable. ${describeFirebaseAppCheckTokenError(err)}`,
      { status: 401, retryable: false, localConfiguration: true }
    );
  }
}

export async function qwenVisionRequest(messages, options = {}) {
  const appCheckToken = await getOcrAppCheckToken(options);
  const res = await fetch(QWEN_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Firebase-AppCheck': appCheckToken },
    body: JSON.stringify({ model: 'qwen-vl-plus', messages }),
    signal: options.signal,
  });
  const rawText = await res.text();
  let body = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const errorPayload = body?.error;
    const msg =
      errorPayload?.message ||
      (typeof errorPayload === 'string' ? errorPayload : '') ||
      (errorPayload ? JSON.stringify(errorPayload) : '') ||
      rawText ||
      `Qwen API Error (HTTP ${res.status})`;
    throw createQwenVisionRequestError(msg, {
      status: res.status,
      retryAfter: parseRetryAfterSeconds(res.headers.get('Retry-After')),
      details: body?.details,
      responseBody: body || rawText || null,
    });
  }
  return body;
}

function parseRetryAfterSeconds(value) {
  if (!value) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) return Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
  return null;
}

export function describeOcrRequestError(err) {
  const message = String(err?.message || '');
  if (err?.status === 403 && /workers endpoint access denied/i.test(message)) {
    return 'HTTP 403: DashScope/Worker permission denied. Check the Cloudflare Worker DASHSCOPE_BASE_URL, DASHSCOPE_API_KEY account permissions, and redeploy workers/qwen-cors-proxy.js.';
  }
  if (err?.status === 403 && /origin not allowed/i.test(message)) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'this origin';
    return `HTTP 403: OCR Worker blocked ${origin}. Add it to ALLOWED_ORIGINS or deploy the current Worker code with private Vite dev origins enabled.`;
  }
  const parts = [];
  if (Number.isFinite(err?.status)) parts.push(`HTTP ${err.status}`);
  parts.push(message || 'unknown OCR request error');
  const details = Array.isArray(err?.details)
    ? err.details.join('; ')
    : err?.details && typeof err.details === 'object'
      ? JSON.stringify(err.details)
      : '';
  return details ? `${parts.join(': ')} (${details})` : parts.join(': ');
}

export function isRetryableOcrRequestError(err) {
  if (err?.retryable === false || err?.localConfiguration) return false;
  if (!Number.isFinite(err?.status)) return true;
  return (
    err.status === 408 ||
    err.status === 409 ||
    err.status === 425 ||
    err.status === 429 ||
    err.status >= 500
  );
}

export function getOcrRetryDelayMs(err, attempt) {
  const retryAfter = Number(err?.retryAfter);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(60000, Math.max(1000, Math.ceil(retryAfter * 1000)));
  }
  return Math.min(30000, Math.max(1000, 2000 * attempt));
}

// --- Durability ---
export const DURABILITY_TABLE = {
  gates: { 1: 200000, 2: 400000, 3: 1200000, 4: 1500000, 5: 2000000 },
  bridge: { 1: 200000 },
  city: { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000 },
  cities: { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000 },
  capital: { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000, 6: 4200000, 7: 4500000 },
  capitol: { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000, 6: 4200000, 7: 4500000 },
  temple: { 1: 1000000 },
  stronghold: { 1: 1000000 },
  'large town': { 4: 3750000 },
};

const NAME_ONLY_STRUCTURES = new Set(['stronghold']);

const STRUCTURE_NAME_CORRECTIONS = {
  bridge: 'Bridge',
  bridges: 'Bridge',
  capita1: 'Capital',
  capital: 'Capital',
  capitals: 'Capital',
  capitol: 'Capital',
  cates: 'Gates',
  checkpoint: 'Gates',
  'check point': 'Gates',
  'check points': 'Gates',
  city: 'City',
  cities: 'City',
  cily: 'City',
  gate: 'Gates',
  gate5: 'Gates',
  gates: 'Gates',
  'large town': 'Large Town',
  'small town': 'Small Town',
  strongho1d: 'Stronghold',
  stronghold: 'Stronghold',
  structure: 'Stronghold',
  temp1e: 'Temple',
  tempi: 'Temple',
  temple: 'Temple',
  town: 'Town',
  ruln: 'Ruins',
  ruin5: 'Ruins',
  ruins: 'Ruins',
};

function normalizeStructureLevel(level) {
  const text = String(level || '').trim();
  const match = text.match(/\b(?:lv\.?|level)?\s*([0-9]+)\b/i);
  return match ? `Lv${Number(match[1])}` : '';
}

function extractStructureLevelFromName(name) {
  const text = String(name || '').trim();
  const explicit = text.match(/\b(?:lv\.?|level)\s*([0-9]+)\b/i);
  if (explicit) return `Lv${Number(explicit[1])}`;
  const trailing = text.match(/\s+([0-9]+)\s*$/);
  return trailing ? `Lv${Number(trailing[1])}` : '';
}

function stripStructureLevelFromName(name) {
  return String(name || '')
    .replace(/\b(?:lv\.?|level)\s*[0-9]+\b/gi, '')
    .replace(/\s+[0-9]+\s*$/, '')
    .replace(/\s+unknown$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalizeStructureName(name, level) {
  const cleaned = stripStructureLevelFromName(name);
  const lower = cleaned.toLowerCase().trim();
  const compact = lower.replace(/[^a-z0-9]+/g, '');
  let canonical =
    STRUCTURE_NAME_CORRECTIONS[lower] || STRUCTURE_NAME_CORRECTIONS[compact] || cleaned;

  if (canonical === 'Town') {
    if (level === 'Lv4') canonical = 'Large Town';
    else if (level === 'Lv1') canonical = 'Small Town';
  }

  if (canonical === 'Gates' && level === 'Lv1') canonical = 'Bridge';

  return canonical;
}

export function isNameOnlyStructure(name) {
  return NAME_ONLY_STRUCTURES.has(
    String(name || '')
      .toLowerCase()
      .trim()
  );
}

export function normalizeStructureLevelForName(name, level) {
  if (isNameOnlyStructure(name)) return '';
  return normalizeStructureLevel(level);
}

export function normalizeStructureName(name) {
  if (!name) return name;
  return normalizeStructureTarget(name, '').structure_name;
}

export function normalizeStructureTarget(name, level = '') {
  if (!name && !level) return { structure_name: name, structure_level: '' };
  const extractedLevel = normalizeStructureLevel(level) || extractStructureLevelFromName(name);
  const structureName = canonicalizeStructureName(name, extractedLevel);
  const structureLevel =
    structureName === 'Bridge'
      ? 'Lv1'
      : normalizeStructureLevelForName(structureName, extractedLevel);
  return { structure_name: structureName, structure_level: structureLevel };
}

export function formatStructureLabel(name, level) {
  const target = normalizeStructureTarget(name || 'Unknown Structure', level);
  return `${target.structure_name} ${target.structure_level}`.trim();
}

function formatDisplayStructureLevel(level) {
  const text = String(level || '').trim();
  if (!text || /^unknown$/i.test(text)) return '';
  const match = text.match(/\b(?:lv\.?|level)?\s*([0-9]+)\b/i);
  return match ? `Lv${Number(match[1])}` : text;
}

function parseStructureTargetFromId(id) {
  const text = String(id || '').trim();
  const match = text.match(/^(.+)_([^_]+)_\d{10,}$/);
  if (!match) return null;
  const name = match[1].replace(/_/g, ' ').trim();
  if (!name || /^structure$/i.test(name)) return null;
  return { structure_name: name, structure_level: match[2] };
}

export function getDatasetStructureTarget(attack) {
  if (!attack) return { structure_name: 'Unknown Structure', structure_level: '' };
  const displayName = attack.display_structure_name;
  const displayLevel = attack.display_structure_level;
  if (displayName || displayLevel) {
    return {
      structure_name: displayName || attack.structure_name || 'Unknown Structure',
      structure_level: displayLevel ?? attack.structure_level ?? '',
    };
  }
  const rawName = attack.raw_structure_name;
  const rawLevel = attack.raw_structure_level;
  const canonicalName = attack.structure_name || attack.name;
  if (/^ruins?$/i.test(String(rawName || '').trim()) && canonicalName && !/^ruins?$/i.test(canonicalName)) {
    return {
      structure_name: canonicalName,
      structure_level: attack.structure_level || '',
    };
  }
  if (rawName || rawLevel) {
    return {
      structure_name: rawName || attack.structure_name || 'Unknown Structure',
      structure_level: rawLevel ?? attack.structure_level ?? '',
    };
  }
  const idTarget = parseStructureTargetFromId(attack.id || attack.attack_id);
  if (idTarget) return idTarget;
  return {
    structure_name: attack.structure_name || attack.name || 'Unknown Structure',
    structure_level: attack.structure_level || '',
  };
}

export function formatDatasetStructureLabel(attack) {
  const target = getDatasetStructureTarget(attack);
  const name = String(target.structure_name || 'Unknown Structure')
    .replace(/\s+/g, ' ')
    .trim();
  const level = formatDisplayStructureLevel(target.structure_level);
  return `${name}${level ? ` ${level}` : ''}`.trim();
}

// --- Mutable State ---
const sharedState = globalThis.__vtsOcrDashboardState || {
  dashData: null,
  searchQ: '',
  attackSearchQ: '',
  timeFilter: 'all',
  rosterNames: [],
  rosterSnapshots: [],
  bannerRecords: [],
  dutyRecords: [],
  sortCol: 'total_demolition',
  sortDir: 'desc',
  leaderLimit: 20,
  leaderPageSize: 20,
  _lastRenderedAttacks: [],
  _lastRenderedPlayerSummary: [],
  _lastRenderedFilterLabel: '',
  _lastRenderedTimeLabel: '',
  _analyticsAnimated: false,
  _booted: false,
  _ocrProcessing: false,
  _rosterProcessing: false,
  _fsUnsub: null,
  _fsRosterUnsub: null,
  allianceList: ['V3S', 'VTS', 'BIG', 'NM5', 'PP5'],
  _rosterLoggedUser: '',
  _rosterFilterStatus: 'all',
  _rosterFilterAlliance: 'all',
  _rosterSearchQ: '',
  _rosterSelectedIndices: new Set(),
};
globalThis.__vtsOcrDashboardState = sharedState;
export const state = sharedState;

// --- Destructive Action Overrides ---
export const CLEAR_HASH = ADMIN_AUTH_CONFIG.clearHash || '';
export const DELETE_HASHES = new Set(ADMIN_AUTH_CONFIG.deleteHashes || []);

// --- DOM Helper ---
export function $id(id) {
  return document.getElementById(id);
}

// --- Escape ---
export function esc(str) {
  if (!str) return '';
  return String(str).replace(
    /[&<>'"]/g,
    (match) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[match]
  );
}

// --- Logger ---
const LOG_TYPES = new Set(['info', 'warn', 'error', 'success']);

function normalizeLogType(type) {
  const normalized = type === 'err' ? 'error' : String(type || 'info');
  return LOG_TYPES.has(normalized) ? normalized : 'info';
}

export function log(msg, type = 'info', file = null) {
  const out = $id('dashLogOutput');
  const area = $id('dashLogArea');
  if (!out || !area) return;
  area.classList.remove('hidden');
  const entry = {
    time: new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    msg,
    type: normalizeLogType(type),
    file,
  };
  appendLogEntry(out, entry);
  persistLog(entry);
  out.scrollTop = out.scrollHeight;
}

export function appendLogEntry(out, entry) {
  const div = document.createElement('div');
  div.className = 'log-entry';
  const type = normalizeLogType(entry.type);
  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = `[${entry.time}]`;
  div.appendChild(time);
  if (entry.file) {
    const file = document.createElement('span');
    file.className = 'log-file';
    file.textContent = `[${entry.file}]`;
    div.appendChild(file);
  }
  const msg = document.createElement('span');
  msg.className = `log-msg log-${type}`;
  msg.textContent = String(entry.msg ?? '');
  div.appendChild(msg);
  out.appendChild(div);
}

export function persistLog(entry) {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    logs.push(entry);
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

export function restoreLogs() {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    if (!logs.length) return;
    const out = $id('dashLogOutput');
    const area = $id('dashLogArea');
    if (!out || !area) return;
    out.innerHTML = '';
    area.classList.remove('hidden');
    logs.forEach((e) => appendLogEntry(out, e));
    out.scrollTop = out.scrollHeight;
  } catch {
    // Ignore corrupt or unavailable saved logs; the live dashboard can continue.
  }
}

// --- JSON Repair ---
export function tryRepairJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    if (
      !e.message.includes('Bad escaped character') &&
      !e.message.includes('Invalid escape') &&
      !e.message.includes('Unexpected token') &&
      !e.message.includes('Expected')
    )
      throw e;
  }
  let repaired = text;
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  repaired = repaired.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
  // eslint-disable-next-line no-control-regex
  repaired = repaired.replace(/[\x00-\x1f]/g, (match) => {
    const code = match.charCodeAt(0);
    if (code === 0x08) return '\\b';
    if (code === 0x09) return '\\t';
    if (code === 0x0a) return '\\n';
    if (code === 0x0c) return '\\f';
    if (code === 0x0d) return '\\r';
    return '\\u' + code.toString(16).padStart(4, '0');
  });
  try {
    return JSON.parse(repaired);
  } catch (e2) {
    throw new Error(
      `Failed to parse JSON even after repair: ${e2.message}. Snippet: ${text.substring(0, 100)}...`
    );
  }
}

// --- Fuzzy Matching ---
export function getSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  let longer = s1,
    shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

export function getSimilarityAlphaNum(s1, s2) {
  if (!s1 || !s2) return 0;
  const c1 = compactPlayerIdentity(s1);
  const c2 = compactPlayerIdentity(s2);
  if (!c1 || !c2) return getSimilarity(s1, s2);
  return getSimilarity(c1, c2);
}

export function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lv = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let nv = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) nv = Math.min(Math.min(nv, lv), costs[j]) + 1;
        costs[j - 1] = lv;
        lv = nv;
      }
    }
    if (i > 0) costs[s2.length] = lv;
  }
  return costs[s2.length];
}

export function getProtectedPlayerIdentity(name) {
  const text = String(name || '').trim();
  if (!/kika/i.test(text)) return '';
  if (/banner\s*2/i.test(text)) return '꧁Kika-banner2꧂';
  if (/banner/i.test(text)) return '꧁ Kika-banner ꧂';
  if (/[༺༻≪≫]/.test(text)) return '꧁༺ Kika ༻꧂';
  return '꧁ Kika ꧂';
}

function readGroupedPlayerValue(player) {
  const value = Number(player?.value ?? player?.val ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function readGroupedPlayerRank(player, fallbackRank) {
  const rank = Number(player?.rank ?? fallbackRank);
  return Number.isFinite(rank) ? rank : fallbackRank;
}

const CYRILLIC_LATIN_HOMOGLYPHS = Object.freeze({
  А: 'A',
  а: 'a',
  В: 'B',
  Е: 'E',
  е: 'e',
  К: 'K',
  к: 'k',
  М: 'M',
  Н: 'H',
  О: 'O',
  о: 'o',
  Р: 'P',
  р: 'p',
  С: 'C',
  с: 'c',
  Т: 'T',
  Х: 'X',
  х: 'x',
  У: 'Y',
  у: 'y',
});

export function compactPlayerIdentity(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[АаВЕеКкМНОоРрСсТХхУу]/g, (ch) => CYRILLIC_LATIN_HOMOGLYPHS[ch] || ch)
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}

let rosterMatchNamesRef = null;
let rosterMatchNamesLength = -1;
let rosterExactNameIndex = new Map();
let rosterCompactNameIndex = new Map();
let rosterMatchCache = new Map();

function getRosterMatchIndex() {
  const names = Array.isArray(state.rosterNames) ? state.rosterNames : [];
  if (names === rosterMatchNamesRef && names.length === rosterMatchNamesLength) {
    return { exact: rosterExactNameIndex, compact: rosterCompactNameIndex };
  }

  rosterMatchNamesRef = names;
  rosterMatchNamesLength = names.length;
  rosterExactNameIndex = new Map();
  rosterCompactNameIndex = new Map();
  rosterMatchCache = new Map();

  const compactBuckets = new Map();
  names.forEach((rosterName) => {
    const exactName = String(rosterName || '').trim();
    if (!exactName) return;
    rosterExactNameIndex.set(exactName, rosterName);

    const compactKey = compactPlayerIdentity(exactName);
    if (!compactKey) return;
    if (!compactBuckets.has(compactKey)) compactBuckets.set(compactKey, new Set());
    compactBuckets.get(compactKey).add(exactName);
  });

  compactBuckets.forEach((bucket, compactKey) => {
    if (bucket.size !== 1) return;
    const [exactName] = bucket;
    rosterCompactNameIndex.set(compactKey, rosterExactNameIndex.get(exactName) || exactName);
  });

  return { exact: rosterExactNameIndex, compact: rosterCompactNameIndex };
}

export function trimRosterSnapshots(snapshots, limit = MAX_ROSTER_SNAPSHOTS) {
  if (!Array.isArray(snapshots)) return [];
  return snapshots.slice(-limit);
}

export function resolvePlayerNameForAttack(player, attackPlayers = []) {
  const rawName = typeof player === 'string' ? player : player?.name;
  const baseName = findBestMatch(rawName);
  if (!Array.isArray(attackPlayers) || attackPlayers.length < 2) return baseName;

  const groupedRows = attackPlayers
    .map((entry, index) => ({
      entry,
      index,
      rawName: String(entry?.name || '').trim(),
      baseName: findBestMatch(entry?.name),
      rawKey: compactPlayerIdentity(entry?.name),
      value: readGroupedPlayerValue(entry),
      rank: readGroupedPlayerRank(entry, index + 1),
    }))
    .filter((row) => row.baseName === baseName);

  if (groupedRows.length < 2) return baseName;
  const current = groupedRows.find((row) => row.entry === player);
  if (!current) return baseName;

  const hasDifferentValues = new Set(groupedRows.map((row) => row.value)).size > 1;
  const hasDifferentRawNames = new Set(groupedRows.map((row) => row.rawKey)).size > 1;
  if (!hasDifferentValues && !hasDifferentRawNames) return baseName;

  const byImpact = [...groupedRows].sort(
    (a, b) => b.value - a.value || a.rank - b.rank || a.index - b.index
  );
  const impactPosition = byImpact.findIndex((row) => row.entry === player);

  if (baseName === '꧁ Kika ꧂') {
    if (impactPosition <= 0) return '꧁ Kika ꧂';
    if (impactPosition === 1) return '꧁༺ Kika ༻꧂';
    return `꧁ Kika ꧂ alt ${impactPosition + 1}`;
  }

  if (!hasDifferentRawNames || !hasDifferentValues || impactPosition <= 0) return baseName;
  return current.rawName || `${baseName} alt ${impactPosition + 1}`;
}

export function findBestMatch(name, minConfidence = 100) {
  if (!name) return name;
  if (typeof name === 'string') {
    if (name.includes('UNDEAD')) {
      name = name
        .replace(/^[○◎ØODQ]{1,2}/i, '')
        .replace(/[○◎ØODQ]{1,2}$/i, '')
        .trim();
    }
    name = name.replace(/^Н/, 'H');
    const protectedIdentity = getProtectedPlayerIdentity(name);
    if (protectedIdentity) return protectedIdentity;
    const aliasMap = {
      'كي미 kimmy': '키미 kimmy',
      'キミ kimmy': '키미 kimmy',
      'كيمي kimmy': '키미 kimmy',
      'кими kimmy': '키미 kimmy',
      '키키 kimmy': '키미 kimmy',
      'EightBall _W/_': 'EightBall _V/_',
      'EightBall _N/_': 'EightBall _V/_',
      'EightBall_/V/_': 'EightBall _V/_',
      'EightBall _\\/_': 'EightBall _V/_',
      'EightBall_\\/_': 'EightBall _V/_',
      'EightBall _/_': 'EightBall _V/_',
      'АК Чапай': 'AK Чапай',
      АКЧапай: 'AK Чапай',
      'AK Чанай': 'AK Чапай',
      AKЧанай: 'AK Чапай',
      AKЧапай: 'AK Чапай',
      'AK Чапаń': 'AK Чапай',
      'AK Чапаи': 'AK Чапай',
      'AK Чанаý': 'AK Чапай',
      '!!Uzumaki !!': '!!Uzumaki!!',
      '!! Uzumaki !!': '!!Uzumaki!!',
      Uzumaki: '!!Uzumaki!!',
      UzuBanner: '!!Uzumaki!!',
      '● AGAM ●': 'AGAM',
      '●●AGAM ●●': 'AGAM',
      '●● AGAM ●●': 'AGAM',
      '●AGAM●': 'AGAM',
      MasterVjoo: 'MasterVj',
      '~MasterVj~': 'MasterVj',
      '≽ MasterVj ≡': 'MasterVj',
      '~MasterVjoe~': 'MasterVj',
      MasterVjper: 'MasterVj',
      '~MasterVjoo~': 'MasterVj',
      MasterVjso: 'MasterVj',
      '○UNDEADO○': 'UNDEAD',
      '○UNDEAD○': 'UNDEAD',
      '◎UNDEADO◎': 'UNDEAD',
      ØUNDEADØ: 'UNDEAD',
      UNDEADO: 'UNDEAD',
      '© I N d O / Made3110': 'Made3110',
      '\\xind\\Made3110': 'Made3110',
      'Sind?Made3110': 'Made3110',
      '© I N d ō/Made3110': 'Made3110',
      'yind?Made3110': 'Made3110',
      '~I n d ø/Made3110': 'Made3110',
      'I N d O)Made3110': 'Made3110',
      'I nd°/Made3110': 'Made3110',
      gindMade3110: 'Made3110',
      'vind?Made3110': 'Made3110',
      'x N d o /Made3110': 'Made3110',
      Kika: '꧁ Kika ꧂',
      '≽ Kika ≡': '꧁ Kika ꧂',
      '~Kika~': '꧁ Kika ꧂',
      '✨Kika✨': '꧁ Kika ꧂',
      ' Kika ': '꧁ Kika ꧂',
      '✨Kika-banner✨': '꧁ Kika-banner ꧂',
      '~Kika ~': '꧁ Kika ꧂',
      тynгзахур: 'түнгзахурп',
      тyнг3ахур: 'түнгзахурп',
      тунгзахурп: 'түнгзахурп',
      түнгэахур: 'түнгзахурп',
      түнгзахур: 'түнгзахурп',
      тунгзахур: 'түнгзахурп',
      тynгзахyp: 'түнгзахурп',
      тyHГ3ахур: 'түнгзахурп',
      тyнгзахур: 'түнгзахурп',
      'REDBULL§': 'REDBULLS',
      'RedBull©': 'REDBULLS',
      'RedBull@': 'REDBULLS',
      'RedBull®': 'REDBULLS',
      'Redbull@': 'REDBULLS',
      REDBULL$: 'REDBULLS',
      'Ar Ran★_YG+62': 'Ar Ran ★_YG+62',
      'Ar Ran ★YG+62': 'Ar Ran ★_YG+62',
      'hunter killer.': 'Hunter killer.',
      'htar killer.': 'Hunter killer.',
      'htubter killer.': 'Hunter killer.',
      'hunster killer.': 'Hunter killer.',
      'һunter killer.': 'Hunter killer.',
      '+DarkPrinceSSt': 'tDarkPrinceSS$t',
      DarkPrinceSt: 'tDarkPrinceSS$t',
      Doedoom: 'Doedoem',
      Dneanmon: 'Dheahmon',
      '↑ Anne ↑': 'Anne',
      ŸAnneŸ: 'Anne',
      '^ Anne ^': 'Anne',
      '^Anne ^': 'Anne',
      '^^ Anne ^^': 'Anne',
      'q. Immortalis': 'q. Immortal',
      'D off y.': 'D offy.',
      'Doffy.': 'D offy.',
      'D off.y.': 'D offy.',
      'D o f f y.': 'D offy.',
      'terribile ivan': 'terrible ivan',
      '★KoThawwKa★': 'KoThawwKa',
      '★ KoThawwKa ★': 'KoThawwKa',
      БратХрабрепц: 'БратХрабрец',
      БратХрапець: 'БратХрабрец',
      洋人在弄啥嘢: '洋人在弄啥嘞',
      洋人在弄哈嘞: '洋人在弄啥嘞',
      '_._5G': '_5G',
      '-----5G': '_5G',
      ___5G: '_5G',
      __5G: '_5G',
      ΛNGƎL: 'ANGEL',
      ΛNGEL: 'ANGEL',
      ANGƎL: 'ANGEL',
      '-L7-': '- L7 -',
      '~Pink~': '~ Pink ~',
      'DvD18 x2': 'DvD18',
      '..WAE.L..': '..WAEL..',
      '..WAEI..': '..WAEL..',
      Neutriino10: 'Neutrino10',
      耶比耶耶耶: '耶比耶比耶',
      '真庭道主-': '-真庭道主-',
      真庭道主: '-真庭道主-',
      乃厶口毛: '乃ㄥ口毛',
      乃ㄥ山毛: '乃ㄥ口毛',
      '乃∠口毛': '乃ㄥ口毛',
      ylii90: 'ylli90',
      '~★RuCCaK★~': '~RuCCaK~',
      'Lord Chandu!': 'Lord Chandu !',
      '★Mariska★': 'Mariska',
      '☆Mariska☆': 'Mariska',
      '*Mariska*': 'Mariska',
      'Opua 2025': 'Opwa 2025',
      'Орша 2025': 'Opwa 2025',
      'Sarafino~': '~Sarafino~',
      Sarafino: '~Sarafino~',
      '*Molly*': 'Molly',
      'jJamaica pete': 'Jjamaica pete',
      '*Lisavetka*': '•Lisavetka•',
      Surtiiiiii: 'Surtiiiii',
      'Феюшка))': 'Феечка))',
      'Φελώσκα))': 'Феечка))',
      БрюHerKaЯ: 'БрюНетКаЯ',
      БрюНерКаЯ: 'БрюНетКаЯ',
      БрЮНеТКаЯ: 'БрюНетКаЯ',
      'Бешеный-Енот~': 'Бешенный-Енот~',
      'A n d ē R $': 'A n d e R $',
      АηdεR$: 'A n d e R $',
      AηdεR$: 'A n d e R $',
      'А η d ě R $': 'A n d e R $',
      Anders: 'A n d e R $',
      Àñděř$: 'A n d e R $',
      'A n d é R $': 'A n d e R $',
      'A nødëR $': 'A n d e R $',
      AnděRS: 'A n d e R $',
      ÀñäëR$: 'A n d e R $',
      AηdēR$: 'A n d e R $',
      'Dizz..': 'Dizz.',
      '★★★ 3BEPb ★★★': '3BEPb',
      ЗВЕРЬ: '3BEPb',
      '*** 3BEPb ***': '3BEPb',
      '*** ЗВЕРЬ ***': '3BEPb',
      'REFORMASIJILID2*': 'REFORMASIJILID2·',
      СоBob: 'CoBoP',
      СоБоР: 'CoBoP',
      '★ Aqua ★': '★Aqua★',
      '*Aqua*': '★Aqua★',
      '☆Aqua☆': '★Aqua★',
      '☆Aqua ☆': '★Aqua★',
      '.Jasper.@': '@.Jasper.@',
      '.Jasper.': '@.Jasper.@',
      '*r@mze$$$*': '★r@mze$$$★',
      '☆r@nze$$$☆': '★r@mze$$$★',
      'I D NÓ/Dragon.Gold': 'IDN Dragon.Gold',
      'IDNÓ/Dragon.Gold': 'IDN Dragon.Gold',
      'IDNÓ|Dragon.Gold': 'IDN Dragon.Gold',
      'IDN°/Dragon.Gold': 'IDN Dragon.Gold',
      '↘I D N ø/Dragon.Gold': 'IDN Dragon.Gold',
      'МяТная Лапка': 'Мятная Лапка',
      'yousef المحارب': 'المحارب yousef',
      '*DEAN JR*': '*DEAN*',
      Moldo1313: 'Moldo1313',
      MalakAdo: 'MalakAdo',
      MalakAbo: 'MalakAbo',
      'WICKED RUSSIANO': 'WICKED RUSSIAN',
      'Indomie.telor': 'Indomie.telor....',
      'キ미 kimmy': '키미 kimmy',
      UNDEA: 'UNDEAD',
      BlackDragOn09: 'BlackDrag0n09',
      _EDDY_: '_EDDDY_',
      mohmmmedsaif: 'mohmmedsaif',
      'Anne...': 'Anne',
      '^Anne^': 'Anne',
      '✨ Anne ✨': 'Anne',
      '≪Kika≫': '꧁ Kika ꧂',
      '✨ Kika ✨': '꧁ Kika ꧂',
      '꧁ Kika ꧂': '꧁ Kika ꧂',
      '꧁Kika꧂': '꧁ Kika ꧂',
      '꧁༺ Kika ༻꧂': '꧁༺ Kika ༻꧂',
      '꧁༺Kika༻꧂': '꧁༺ Kika ༻꧂',
      '༺ Kika ༻': '꧁༺ Kika ༻꧂',
      '༺Kika༻': '꧁༺ Kika ༻꧂',
      'Kika-banner': '꧁ Kika-banner ꧂',
      '꧁ Kika-banner ꧂': '꧁ Kika-banner ꧂',
      '꧁Kika-banner꧂': '꧁ Kika-banner ꧂',
      'Kika-banner2': '꧁Kika-banner2꧂',
      '꧁ Kika-banner2 ꧂': '꧁Kika-banner2꧂',
      '꧁Kika-banner2꧂': '꧁Kika-banner2꧂',
      'MasterVj~': 'MasterVj',
      '✨MasterVj✨': 'MasterVj',
      '●■AGAM ■●': 'AGAM',
      '•◄ AGAM ►•': 'AGAM',
      Aqua: '★Aqua★',
      Lisavetka: '•Lisavetka•',
      '.Lisavetka.': '•Lisavetka•',
      'r@mze$$$': '★r@mze$$$★',
      '★r@mze$$$☆': '★r@mze$$$★',
      'WICKED WOMEN★': 'WICKED WOMEN☆',
      '!! LÜ BU !!': '!!LÜ BU!!',
      'AK Чапа́й': 'AK Чапай',
      '~☆RuCCaK☆~': '~RuCCaK~',
      'A n d ě R $': 'A n d e R $',
      Серей: 'Сергей',
      'Jjamaica pete': 'Jjamaica pete',
      '★★★ЗВЕРЬ★★★': '★★★ ЗВЕРЬ ★★★',
      '~Sarafina~': '~Sarafina~',
      Sarafina: '~Sarafina~',
      'Sarafina~': '~Sarafina~',
      // --- 2026-06 debug-export dedup audit: decoration/diacritic + OCR-typo variants ---
      // (Kika / Sarafino-Sarafina / MalakAbo-MalakAdo are intentionally kept separate.)
      '~Anne~': 'Anne',
      '⌂ Anne ₿': 'Anne',
      '✨Anne ✨': 'Anne',
      'Neutrin010': 'Neutrino10',
      'Åñdëř$': 'A n d e R $',
      'AndërS': 'A n d e R $',
      'AndëRS': 'A n d e R $',
      '— L7 —': '- L7 -',
      'Hunter Killer.': 'Hunter killer.',
      'гутер killer.': 'Hunter killer.',
      'WICKED WOMEN': 'WICKED WOMEN☆',
      '☆r@mze$$$☆': '★r@mze$$$★',
      '·Lisavetka·': '•Lisavetka•',
      '✨Nosferatu✨': 'Nosferatu',
      'Batou-Zar': 'Batou~Zar',
      '★ DEAN ★': '*DEAN*',
      'ОUNDEA': 'UNDEAD',
      'Spoilagege': 'Spoilage',
      'Mr. AHPD': 'Mr. AHDP',
      'mohmedsaif': 'mohmmedsaif',
      'BiG BOiE': 'BiG BOiiE',
      'Oblitereted': 'Obliterated',
      'MasterVjs': 'MasterVj',
      // Duty (Banner/Pather) cleaned-name stragglers the roster fuzzy match can't bridge:
      'Dvd': 'DvD18',
      'BOiiE': 'BiG BOiiE',
      'Uz': '!!Uzumaki!!',
      Moldo1313: 'Moldo',
      'Uzumaki 1097 R4': '!!Uzumaki!!',
      Uzumaki: '!!Uzumaki!!',
      // OCR typo for the RedBull owner tag; do not collapse separate
      // RedBull-family banner/operator accounts.
      redbull: 'RedBull',
      redull: 'RedBull',
      ostio: 'osito',
      tersait: 'Teresita',
    };
    if (aliasMap[name]) return aliasMap[name];
    if (/pixel/i.test(name)) return '༄Pixel';
  }
  if (!state.rosterNames.length) return name;
  const rosterIndex = getRosterMatchIndex();
  const exactName = String(name || '').trim();
  const compactName = compactPlayerIdentity(exactName);
  const exactMatch = rosterIndex.exact.get(exactName);
  if (exactMatch) return exactMatch;
  const compactMatch = rosterIndex.compact.get(compactName);
  if (compactMatch) return compactMatch;
  if (compactName.length < 5) return name;

  const cacheKey = `${minConfidence}|${exactName}`;
  if (rosterMatchCache.has(cacheKey)) return rosterMatchCache.get(cacheKey);

  let best = name,
    maxSim = 0;
  for (const rn of state.rosterNames) {
    const sim = getSimilarity(name, rn);
    if (sim > maxSim) {
      maxSim = sim;
      best = rn;
    }
  }
  let threshold = 0.82;
  if (compactName.length <= 8) threshold = 0.72;
  if (minConfidence < 70) threshold -= 0.08;
  const result = maxSim > threshold ? best : name;
  rosterMatchCache.set(cacheKey, result);
  return result;
}

// --- Duty (Banner / Pather) name resolution ---
// Banner & Pather rows are OCR'd from Viber screenshots and carry noise the
// structures/attacks pipeline never sees: Viber @tags, target words merged into the
// cell (e.g. "bridge @Roha"), "(note)" parentheticals, banner-label suffixes, and OCR
// junk. We strip that noise, then fall back to the SAME findBestMatch authority — no
// separate merge list.
//
// Credit goes to the BANNER ACCOUNT / @-tagged owner — the main token before any
// parenthetical. The parenthetical is metadata only and is preserved separately via
// getDutyOperatorNote(): it records either who physically operated the account at that
// time ("Angel Banner (zubbs)" -> credit ANGEL, zubbs operated it) or which of an
// owner's banners was used ("@redbull (osito)" -> credit redbull, osito is the banner).
const DUTY_TARGET_PREFIX = /^(?:bridges?|gates?|capital|reserve|team\s*\d*|town\s*[il]?v?l?\s*\d*|gate\s*[il]?\s*\d*)\b[\s:_·.\-]*/i;
const DUTY_BANNER_SUFFIX = /[\s_\-]*banner\s*\d*$/i;

// The parenthetical note (operator / banner label). Metadata — preserved, but not the
// primary credited name. It may *also* earn credit (see getDutyCreditedNames).
export function getDutyOperatorNote(raw) {
  const m = String(raw || '').match(/\(([^)]*)\)/);
  return m ? m[1].trim() : '';
}

// A parenthetical in a duty cell is either an OPERATOR (the person who physically ran
// the banner account at that target, e.g. "(zubbs)") or a label ("(RedBull banner)" =
// which of an owner's banners was used). Only operators earn a second credit; labels
// stay metadata. We reject banner/reserve/team words and leading target tokens.
export function looksLikeDutyOperator(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/banner|reserve|^team\b/i.test(v)) return false;
  if (DUTY_TARGET_PREFIX.test(v)) return false;
  return /[A-Za-zÀ-￿Ѐ-ӿ]/.test(v);
}

export function cleanDutyRawName(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  s = s.replace(/[",'`]+$/g, '').trim(); // trailing OCR quote/comma junk
  // Strip the parenthetical note — the credited identity is the @-owner / banner account
  // before it, not the operator/banner inside it.
  s = s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.includes('@')) {
    // keep the first @-segment that isn't a pure target word (handles multi-tag cells)
    const segs = s.split('@').map((x) => x.trim()).filter(Boolean);
    s = segs.find((p) => !DUTY_TARGET_PREFIX.test(p)) || segs[segs.length - 1] || '';
  }
  s = s.replace(DUTY_TARGET_PREFIX, '').trim(); // leading target word without an @
  s = s.replace(/[\s+]+$/g, '').replace(/^[\s+]+/g, '').trim(); // '+' reinforcement markers
  s = s.replace(DUTY_BANNER_SUFFIX, '').trim(); // banner-label suffix -> owner player
  s = s.replace(/^[\s_·.\-]+|[\s_·.\-]+$/g, '').trim();
  return s;
}

export function resolveDutyPlayerName(raw) {
  const cleaned = cleanDutyRawName(raw);
  if (!cleaned) return String(raw || '').trim();
  return findBestMatch(cleaned);
}

// The credited canonical names for one duty cell. Per product decision, BOTH the banner
// account / @-tagged owner AND the operator earn credit for the duty work:
//   "Angel Banner (zubbs)" -> credit ANGEL (account) AND zubbs (who operated it)
//   "@redbull (osito)"     -> credit redbull (owner)  AND osito (banner account/operator)
//   "Moldo (zubbs)"        -> credit Moldo AND zubbs
//   "redbull (RedBull banner)" -> credit redbull only (label, not an operator)
//   "Moldo (Moldo)"        -> credit Moldo once (operator == owner, de-duped)
// ownerCredited is the name the aggregation already credits (admin Confirmed Name or a
// raw fallback). The operator (if any) is resolved through the same authority and de-duped
// against the owner's canonical form. The owner always comes first in the returned list.
export function getDutyCreditedNames(raw, ownerCredited) {
  const owner = String(ownerCredited || '').trim();
  const names = owner ? [owner] : [];
  const note = getDutyOperatorNote(raw);
  if (!looksLikeDutyOperator(note)) return names;
  const op = resolveDutyPlayerName(note);
  if (!op) return names;
  const ownerCanon = owner ? resolveDutyPlayerName(owner) : '';
  if (op === ownerCanon) return names; // operator is the same player as the owner
  if (!names.includes(op)) names.push(op);
  return names;
}

// Expand ONE raw duty/banner cell into all credited canonical player names.
// Handles: leading structure/target words ("town lvl1", "gate"), banner-label
// suffixes, "+" reinforcement markers, the parenthetical operator (dual credit),
// and MULTI-PLAYER cells where several @-tagged players share one target
// ("gate @redull @+ Ezeta TV" -> RedBull + Ezeta TV). Viber "@" tags are stripped;
// each token is resolved to its canonical roster identity. Returns [] for cells
// that are only a structure name (no real player).
export function expandDutyRawNames(raw) {
  const s = String(raw || '').trim();
  if (!s) return [];
  const note = getDutyOperatorNote(s); // parenthetical operator (dual credit)
  const body = s
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let tokens;
  if (body.includes('@')) {
    // Each @-segment is a separate player; drop pure target words (the structure).
    tokens = body
      .split('@')
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((p) => !DUTY_TARGET_PREFIX.test(p));
  } else {
    tokens = [body];
  }
  const out = [];
  const push = (rawToken) => {
    const cleaned = cleanDutyRawName(rawToken);
    if (!cleaned) return;
    const canon = findBestMatch(cleaned);
    if (canon && !out.includes(canon)) out.push(canon);
  };
  tokens.forEach(push);
  if (looksLikeDutyOperator(note)) push(note);
  return out;
}

// --- Durability Validation ---
export function validateTotalDemolition(sN, sL, total) {
  const target = normalizeStructureTarget(sN, sL);
  const entry = DURABILITY_TABLE[(target.structure_name || '').toLowerCase()];
  if (!entry) return null;
  const levelNum = isNameOnlyStructure(target.structure_name)
    ? Number(Object.keys(entry)[0])
    : parseInt(String(target.structure_level || '').replace(/[^0-9]/g, ''));
  if (!levelNum) return null;
  const expected = entry && entry[levelNum];
  if (!expected) return null;
  const diff = Math.abs(total - expected);
  const pct = diff / expected;
  return { expected, diff, pct, match: pct < 0.05, levelNum };
}
