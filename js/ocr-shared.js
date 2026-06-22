// Shared constants, state, and helpers for OCR dashboard modules

// --- Storage Keys ---
export const STORAGE_KEY = 'vts_ocr_dashboard';
export const AUTH_KEY = 'vts_ocr_auth';
export const ROSTER_KEY = 'vts_ocr_roster';
export const ROSTER_SNAPSHOTS_KEY = 'vts_roster_snapshots';
export const BANNER_KEY = 'vts_ocr_banners';
export const DUTY_LIST_KEY = 'vts_ocr_duty_lists';
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
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}

// --- OCR ---
export const QWEN_WORKER_URL = 'https://delicate-term-725f.aboroe1097.workers.dev';

export async function checkOcrService() {
  try {
    const res = await fetch(`${QWEN_WORKER_URL}/status`, { cache: 'no-store' });
    if (!res.ok) return { configured: false, error: `Worker status ${res.status}` };
    const data = await res.json();
    return { configured: data.configured === true, error: data.error || '' };
  } catch (err) {
    return { configured: false, error: err?.message || 'OCR worker unavailable' };
  }
}

export async function qwenVisionRequest(messages, options = {}) {
  const res = await fetch(QWEN_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen-vl-plus', messages }),
    signal: options.signal,
  });
  const rawText = await res.text();
  let body = null;
  try { body = rawText ? JSON.parse(rawText) : null; } catch {}
  if (!res.ok) {
    const msg = body?.error?.message || body?.error || rawText || `Qwen API Error (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return body;
}

// --- Durability ---
export const DURABILITY_TABLE = {
  gates:    { 1: 200000, 2: 400000, 3: 1200000, 4: 1500000, 5: 2000000 },
  bridge:   { 1: 200000 },
  city:     { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000 },
  cities:   { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000 },
  capital:  { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000, 6: 4200000, 7: 5000000 },
  capitol:  { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000, 6: 4200000, 7: 5000000 },
  temple:   { 1: 1000000 },
  stronghold: { 1: 1000000 },
  'large town': { 4: 3750000 },
};

const NAME_ONLY_STRUCTURES = new Set(['stronghold']);

const STRUCTURE_NAME_CORRECTIONS = {
  bridge: 'Bridge',
  bridges: 'Bridge',
  capita1: 'Capital',
  capital: 'Capital',
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
  let canonical = STRUCTURE_NAME_CORRECTIONS[lower] || STRUCTURE_NAME_CORRECTIONS[compact] || cleaned;

  if (canonical === 'Town') {
    if (level === 'Lv4') canonical = 'Large Town';
    else if (level === 'Lv1') canonical = 'Small Town';
  }

  if (canonical === 'Gates' && level === 'Lv1') canonical = 'Bridge';

  return canonical;
}

export function isNameOnlyStructure(name) {
  return NAME_ONLY_STRUCTURES.has(String(name || '').toLowerCase().trim());
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
  const rawName = attack.raw_structure_name ?? attack.display_structure_name;
  const rawLevel = attack.raw_structure_level ?? attack.display_structure_level;
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
  const name = String(target.structure_name || 'Unknown Structure').replace(/\s+/g, ' ').trim();
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
  leaderLimit: 25,
  leaderPageSize: 25,
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

// --- Auth ---
export const AUTH_HASH = ADMIN_AUTH_CONFIG.adminHash || '';
export const CLEAR_HASH = ADMIN_AUTH_CONFIG.clearHash || '';
export const DELETE_HASHES = new Set(ADMIN_AUTH_CONFIG.deleteHashes || []);

// --- DOM Helper ---
export function $id(id) { return document.getElementById(id); }

// --- Escape ---
export function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[match]);
}

// --- Logger ---
function normalizeLogType(type) {
  return type === 'err' ? 'error' : type || 'info';
}

export function log(msg, type = 'info', file = null) {
  const out = $id('dashLogOutput');
  const area = $id('dashLogArea');
  if (!out || !area) return;
  area.classList.remove('hidden');
  const entry = {
    time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    msg,
    type: normalizeLogType(type),
    file
  };
  appendLogEntry(out, entry);
  persistLog(entry);
  out.scrollTop = out.scrollHeight;
}

export function appendLogEntry(out, entry) {
  const div = document.createElement('div');
  div.className = 'log-entry';
  const type = normalizeLogType(entry.type);
  let html = `<span class="log-time">[${entry.time}]</span>`;
  if (entry.file) html += `<span class="log-file">[${entry.file}]</span>`;
  html += `<span class="log-msg log-${type}">${entry.msg}</span>`;
  div.innerHTML = html;
  out.appendChild(div);
}

export function persistLog(entry) {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    logs.push(entry);
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch (e) {}
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
    logs.forEach(e => appendLogEntry(out, e));
    out.scrollTop = out.scrollHeight;
  } catch (e) {}
}

// --- JSON Repair ---
export function tryRepairJson(text) {
  try { return JSON.parse(text); } catch (e) {
    if (!e.message.includes('Bad escaped character') && !e.message.includes('Invalid escape') && !e.message.includes('Unexpected token') && !e.message.includes('Expected')) throw e;
  }
  let repaired = text;
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  repaired = repaired.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
  repaired = repaired.replace(/[\x00-\x1f]/g, match => {
    const code = match.charCodeAt(0);
    if (code === 0x08) return '\\b';
    if (code === 0x09) return '\\t';
    if (code === 0x0a) return '\\n';
    if (code === 0x0c) return '\\f';
    if (code === 0x0d) return '\\r';
    return '\\u' + code.toString(16).padStart(4, '0');
  });
  try { return JSON.parse(repaired); } catch (e2) { throw new Error(`Failed to parse JSON even after repair: ${e2.message}. Snippet: ${text.substring(0, 100)}...`); }
}

// --- Fuzzy Matching ---
export function getSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  let longer = s1, shorter = s2;
  if (s1.length < s2.length) { longer = s2; shorter = s1; }
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

export function getSimilarityAlphaNum(s1, s2) {
  if (!s1 || !s2) return 0;
  const c1 = s1.replace(/[^a-zA-Z0-9а-яА-Я]/g, '').toLowerCase();
  const c2 = s2.replace(/[^a-zA-Z0-9а-яА-Я]/g, '').toLowerCase();
  if (!c1 || !c2) return getSimilarity(s1, s2);
  return getSimilarity(c1, c2);
}

export function editDistance(s1, s2) {
  s1 = s1.toLowerCase(); s2 = s2.toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lv = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let nv = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) nv = Math.min(Math.min(nv, lv), costs[j]) + 1;
        costs[j - 1] = lv; lv = nv;
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

function compactPlayerIdentity(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
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
    .filter(row => row.baseName === baseName);

  if (groupedRows.length < 2) return baseName;
  const current = groupedRows.find(row => row.entry === player);
  if (!current) return baseName;

  const hasDifferentValues = new Set(groupedRows.map(row => row.value)).size > 1;
  const hasDifferentRawNames = new Set(groupedRows.map(row => row.rawKey)).size > 1;
  if (!hasDifferentValues && !hasDifferentRawNames) return baseName;

  const byImpact = [...groupedRows].sort(
    (a, b) => b.value - a.value || a.rank - b.rank || a.index - b.index
  );
  const impactPosition = byImpact.findIndex(row => row.entry === player);

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
      name = name.replace(/^[○◎ØODQ]{1,2}/i, '').replace(/[○◎ØODQ]{1,2}$/i, '').trim();
    }
    name = name.replace(/^Н/, 'H');
    const protectedIdentity = getProtectedPlayerIdentity(name);
    if (protectedIdentity) return protectedIdentity;
    const aliasMap = {
      'كي미 kimmy': '키미 kimmy', 'キミ kimmy': '키미 kimmy', 'كيمي kimmy': '키미 kimmy', 'кими kimmy': '키미 kimmy', '키키 kimmy': '키미 kimmy',
      'EightBall _W/_': 'EightBall _V/_', 'EightBall _N/_': 'EightBall _V/_', 'EightBall_/V/_': 'EightBall _V/_', 'EightBall _\\/_': 'EightBall _V/_', 'EightBall_\\/_': 'EightBall _V/_', 'EightBall _/_': 'EightBall _V/_',
      'AK Чанай': 'AK Чапай', 'AKЧанай': 'AK Чапай', 'AKЧапай': 'AK Чапай', 'AK Чапаń': 'AK Чапай', 'AK Чапаи': 'AK Чапай', 'AK Чанаý': 'AK Чапай',
      '!!Uzumaki !!': '!!Uzumaki!!', '!! Uzumaki !!': '!!Uzumaki!!', 'Uzumaki': '!!Uzumaki!!', 'UzuBanner': '!!Uzumaki!!',
      '● AGAM ●': 'AGAM', '●●AGAM ●●': 'AGAM', '●● AGAM ●●': 'AGAM', '●AGAM●': 'AGAM',
      'MasterVjoo': 'MasterVj', '~MasterVj~': 'MasterVj', '≽ MasterVj ≡': 'MasterVj', '~MasterVjoe~': 'MasterVj', 'MasterVjper': 'MasterVj', '~MasterVjoo~': 'MasterVj', 'MasterVjso': 'MasterVj',
      '○UNDEADO○': 'UNDEAD', '○UNDEAD○': 'UNDEAD', '◎UNDEADO◎': 'UNDEAD', 'ØUNDEADØ': 'UNDEAD', 'UNDEADO': 'UNDEAD',
      '© I N d O / Made3110': 'Made3110', '\\xind\\Made3110': 'Made3110', 'Sind?Made3110': 'Made3110', '© I N d ō/Made3110': 'Made3110', 'yind?Made3110': 'Made3110', '~I n d ø/Made3110': 'Made3110', 'I N d O)Made3110': 'Made3110', 'I nd°/Made3110': 'Made3110', 'gindMade3110': 'Made3110', 'vind?Made3110': 'Made3110', 'x N d o /Made3110': 'Made3110',
      'Kika': '꧁ Kika ꧂', '≽ Kika ≡': '꧁ Kika ꧂', '~Kika~': '꧁ Kika ꧂', '✨Kika✨': '꧁ Kika ꧂', ' Kika ': '꧁ Kika ꧂', '✨Kika-banner✨': '꧁ Kika-banner ꧂', '~Kika ~': '꧁ Kika ꧂',
      'тynгзахур': 'түнгзахурп', 'тyнг3ахур': 'түнгзахурп', 'тунгзахурп': 'түнгзахурп', 'түнгэахур': 'түнгзахурп', 'түнгзахур': 'түнгзахурп', 'тунгзахур': 'түнгзахурп', 'тynгзахyp': 'түнгзахурп', 'тyHГ3ахур': 'түнгзахурп', 'тyнгзахур': 'түнгзахурп',
      'REDBULL§': 'REDBULLS', 'RedBull©': 'REDBULLS', 'RedBull@': 'REDBULLS', 'RedBull®': 'REDBULLS', 'Redbull@': 'REDBULLS', 'REDBULL$': 'REDBULLS',
      'Ar Ran★_YG+62': 'Ar Ran ★_YG+62', 'Ar Ran ★YG+62': 'Ar Ran ★_YG+62',
      'hunter killer.': 'Hunter killer.', 'htar killer.': 'Hunter killer.', 'htubter killer.': 'Hunter killer.', 'hunster killer.': 'Hunter killer.', 'һunter killer.': 'Hunter killer.',
      '+DarkPrinceSSt': 'tDarkPrinceSS$t', 'DarkPrinceSt': 'tDarkPrinceSS$t',
      'Doedoom': 'Doedoem', 'Dneanmon': 'Dheahmon', '↑ Anne ↑': 'Anne', 'ŸAnneŸ': 'Anne', '^ Anne ^': 'Anne', '^Anne ^': 'Anne', '^^ Anne ^^': 'Anne',
      'q. Immortalis': 'q. Immortal', 'D off y.': 'D offy.', 'Doffy.': 'D offy.', 'D off.y.': 'D offy.', 'D o f f y.': 'D offy.',
      'terribile ivan': 'terrible ivan', '★KoThawwKa★': 'KoThawwKa', '★ KoThawwKa ★': 'KoThawwKa',
      'БратХрабрепц': 'БратХрабрец', '洋人在弄啥嘢': '洋人在弄啥嘞', '洋人在弄哈嘞': '洋人在弄啥嘞',
      '_._5G': '_5G', '-----5G': '_5G', '___5G': '_5G', '__5G': '_5G', 'ΛNGƎL': 'ANGEL', 'ΛNGEL': 'ANGEL', 'ANGƎL': 'ANGEL', '-L7-': '- L7 -', '~Pink~': '~ Pink ~',
      'DvD18 x2': 'DvD18', '..WAE.L..': '..WAEL..', '..WAEI..': '..WAEL..', 'Neutriino10': 'Neutrino10',
      '耶比耶耶耶': '耶比耶比耶', '真庭道主-': '-真庭道主-', '真庭道主': '-真庭道主-',
      '乃厶口毛': '乃ㄥ口毛', '乃ㄥ山毛': '乃ㄥ口毛', '乃∠口毛': '乃ㄥ口毛',
      'ylii90': 'ylli90', '~★RuCCaK★~': '~RuCCaK~', 'Lord Chandu!': 'Lord Chandu !',
      '★Mariska★': 'Mariska', '☆Mariska☆': 'Mariska', '*Mariska*': 'Mariska', 'Opua 2025': 'Opwa 2025', 'Орша 2025': 'Opwa 2025',
      'Sarafino~': '~Sarafino~', 'Sarafino': '~Sarafino~',
      '*Molly*': 'Molly',
      'jJamaica pete': 'Jjamaica pete',
      '*Lisavetka*': '•Lisavetka•',
      'Surtiiiiii': 'Surtiiiii',
      'Феюшка))': 'Феечка))', 'Φελώσκα))': 'Феечка))',
      'БрюHerKaЯ': 'БрюНетКаЯ',
      'A n d ē R $': 'A n d e R $', 'АηdεR$': 'A n d e R $', 'AηdεR$': 'A n d e R $', 'А η d ě R $': 'A n d e R $', 'Anders': 'A n d e R $', 'Àñděř$': 'A n d e R $', 'A n d é R $': 'A n d e R $', 'A nødëR $': 'A n d e R $', 'AnděRS': 'A n d e R $', 'ÀñäëR$': 'A n d e R $', 'AηdēR$': 'A n d e R $',
      'Dizz..': 'Dizz.',
      '★★★ 3BEPb ★★★': '3BEPb', 'ЗВЕРЬ': '3BEPb', '*** 3BEPb ***': '3BEPb', '*** ЗВЕРЬ ***': '3BEPb',
      'REFORMASIJILID2*': 'REFORMASIJILID2·',
      'СоBob': 'CoBoP', 'СоБоР': 'CoBoP',
      '★ Aqua ★': '★Aqua★', '*Aqua*': '★Aqua★', '☆Aqua☆': '★Aqua★', '☆Aqua ☆': '★Aqua★',
      '.Jasper.@': '@.Jasper.@', '.Jasper.': '@.Jasper.@',
      '*r@mze$$$*': '★r@mze$$$★', '☆r@nze$$$☆': '★r@mze$$$★',
      'I D NÓ/Dragon.Gold': 'IDN Dragon.Gold', 'IDNÓ/Dragon.Gold': 'IDN Dragon.Gold', 'IDNÓ|Dragon.Gold': 'IDN Dragon.Gold', 'IDN°/Dragon.Gold': 'IDN Dragon.Gold', '↘I D N ø/Dragon.Gold': 'IDN Dragon.Gold',
      'МяТная Лапка': 'Мятная Лапка',
      'yousef المحارب': 'المحارب yousef',
      '*DEAN JR*': '*DEAN*',
      'Moldo1313': 'Moldo1313', 'MalakAdo': 'MalakAdo', 'MalakAbo': 'MalakAbo',
      'WICKED RUSSIANO': 'WICKED RUSSIAN',
      'Indomie.telor': 'Indomie.telor....',
      'キ미 kimmy': '키미 kimmy',
      'UNDEA': 'UNDEAD',
      'BlackDragOn09': 'BlackDrag0n09',
      '_EDDY_': '_EDDDY_',
      'mohmmmedsaif': 'mohmmedsaif',
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
      'Aqua': '★Aqua★',
      'Lisavetka': '•Lisavetka•',
      '.Lisavetka.': '•Lisavetka•',
      'r@mze$$$': '★r@mze$$$★',
      '★r@mze$$$☆': '★r@mze$$$★',
      'WICKED WOMEN★': 'WICKED WOMEN☆',
      '!! LÜ BU !!': '!!LÜ BU!!',
      'AK Чапа́й': 'AK Чапай',
      '~☆RuCCaK☆~': '~RuCCaK~',
      'A n d ě R $': 'A n d e R $',
      'Серей': 'Сергей',
      'Jjamaica pete': 'Jjamaica pete',
      '★★★ЗВЕРЬ★★★': '★★★ ЗВЕРЬ ★★★',
      '~Sarafina~': '~Sarafina~',
      'Sarafina': '~Sarafina~',
      'Sarafina~': '~Sarafina~'
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

  let best = name, maxSim = 0;
  for (const rn of state.rosterNames) {
    const sim = getSimilarity(name, rn);
    if (sim > maxSim) { maxSim = sim; best = rn; }
  }
  let threshold = 0.82;
  if (compactName.length <= 8) threshold = 0.72;
  if (minConfidence < 70) threshold -= 0.08;
  const result = maxSim > threshold ? best : name;
  rosterMatchCache.set(cacheKey, result);
  return result;
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
