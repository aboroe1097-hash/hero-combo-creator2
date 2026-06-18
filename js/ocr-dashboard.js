import { 
  loadRoster, saveRoster, showRosterModal,
  loadRosterSnapshots, saveRosterSnapshots, computeRosterDiff, takeRosterSnapshot, deleteRosterSnapshot,
  loadAllianceList, saveAllianceList, loadRosterAuth, saveRosterAuth, rosterLogin, rosterLogout,
  _ensureMember, setRosterStatus, setRosterAlliance,
  toggleBulkCheck, toggleBulkSelectAll, applyBulkStatus, applyBulkAlliance,
  exportRosterCSV, copyRosterNames,
  showRosterSnapshotModal, configureAlliances, renderRoster,
  loadBannerRecords, saveBannerRecords, showBannerForm, deleteBannerRecord, renderBanners, getTeamColor, hashCode
} from './ocr-roster.js';

import { render, showModal, closeModal } from './ocr-render.js';
import { processFiles, normalizeStructureName, parseOcrResults, fmtDate, displayGameTime } from './ocr-engine.js';
// --- Serverless OCR Dashboard ---
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const STORAGE_KEY = 'vts_ocr_dashboard';
const AUTH_KEY = 'vts_ocr_auth';
const ROSTER_KEY = 'vts_ocr_roster';
const ROSTER_SNAPSHOTS_KEY = 'vts_roster_snapshots';
const BANNER_KEY = 'vts_ocr_banners';
const FS_PATH = 'vts_admin/dashboard_data';
const FS_ROSTER_PATH = 'vts_admin/roster_data';

let dashData = null;
let searchQ = '';
let attackSearchQ = '';
let rosterNames = [];
let rosterSnapshots = [];
let bannerRecords = [];
let sortCol = 'total_demolition';
let sortDir = 'desc';
let leaderLimit = 25;
let _booted = false;
let _ocrProcessing = false;
let _rosterProcessing = false;
let _fsUnsub = null;
let _fsRosterUnsub = null;

const ROSTER_USERS = ['V3S', 'VTS', 'BIG', 'NM5', 'PP5'];
const ROSTER_PASS = '1097';
const ROSTER_AUTH_KEY = 'vts_roster_auth';
const ALLIANCE_KEY = 'vts_ocr_alliances';
const ALLIANCE_COUNT = 5;
let allianceList = ['V3S', 'VTS', 'BIG', 'NM5', 'PP5'];
let _rosterLoggedUser = '';
let _rosterFilterStatus = 'all';
let _rosterFilterAlliance = 'all';
let _rosterSearchQ = '';
let _rosterSelectedIndices = new Set();


function $id(id) { return document.getElementById(id); }
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[match]);
}

const LOG_KEY = 'vts_ocr_log';

// --- Logger ---
function log(msg, type = 'info', file = null) {
  const out = $id('dashLogOutput');
  const area = $id('dashLogArea');
  if (!out || !area) return;
  area.classList.remove('hidden');
  
  const entry = {
    time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    msg,
    type,
    file
  };
  appendLogEntry(out, entry);
  persistLog(entry);
  out.scrollTop = out.scrollHeight;
}

function appendLogEntry(out, entry) {
  const div = document.createElement('div');
  div.className = 'log-entry';
  let html = `<span class="log-time">[${entry.time}]</span>`;
  if (entry.file) html += `<span class="log-file">[${entry.file}]</span>`;
  html += `<span class="log-msg log-${entry.type}">${entry.msg}</span>`;
  div.innerHTML = html;
  out.appendChild(div);
}

function persistLog(entry) {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    logs.push(entry);
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch (e) {}
}

function restoreLogs() {
  try {
    const logs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    if (!logs.length) return;
    const out = $id('dashLogOutput');
    if (!out || !area) return;
    out.innerHTML = '';
    area.classList.remove('hidden');
    logs.forEach(e => appendLogEntry(out, e));
    out.scrollTop = out.scrollHeight;
  } catch (e) {}
}

// --- JSON Repair Helper ---
// Fixes common JSON escaping issues from LLM outputs
function tryRepairJson(text) {
  // First, try parsing as-is
  try {
    return JSON.parse(text);
  } catch (e) {
    // Continue to repair only for common JSON errors
    if (!e.message.includes('Bad escaped character') && 
        !e.message.includes('Invalid escape') && 
        !e.message.includes('Unexpected token') &&
        !e.message.includes('Expected')) {
      throw e;
    }
  }
  
  let repaired = text;
  
  // Step 1: Remove trailing commas before } or ] (handle newlines/spaces)
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  
  // Step 2: Fix bad escape sequences: replace \X (where X is not a valid escape char) with \\X
  // Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
  repaired = repaired.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
  
  // Step 3: Fix any unescaped control characters
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
    throw new Error(`Failed to parse JSON even after repair: ${e2.message}. Snippet: ${text.substring(0, 100)}...`);
  }
}

// --- Fuzzy Matching ---

function getSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  let longer = s1, shorter = s2;
  if (s1.length < s2.length) { longer = s2; shorter = s1; }
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

function getSimilarityAlphaNum(s1, s2) {
  if (!s1 || !s2) return 0;
  const c1 = s1.replace(/[^a-zA-Z0-9а-яА-Я]/g, '').toLowerCase();
  const c2 = s2.replace(/[^a-zA-Z0-9а-яА-Я]/g, '').toLowerCase();
  if (!c1 || !c2) return getSimilarity(s1, s2);
  return getSimilarity(c1, c2);
}

function editDistance(s1, s2) {
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

function findBestMatch(name, minConfidence = 100) {
  if (!name) return name;
  if (typeof name === 'string') {
    if (name.includes('UNDEAD')) {
      name = name.replace(/^[○◎ØODQ]{1,2}/i, '').replace(/[○◎ØODQ]{1,2}$/i, '').trim();
    }
    name = name.replace(/^Н/, 'H'); // Replace Cyrillic Н with Latin H at start
    const aliasMap = {
      'كي미 kimmy': '키미 kimmy', 'キミ kimmy': '키미 kimmy', 'كيمي kimmy': '키미 kimmy', 'кими kimmy': '키미 kimmy', '키키 kimmy': '키미 kimmy',
      'EightBall _W/_': 'EightBall _V/_', 'EightBall _N/_': 'EightBall _V/_', 'EightBall_/V/_': 'EightBall _V/_', 'EightBall _\\/_': 'EightBall _V/_', 'EightBall_\\/_': 'EightBall _V/_', 'EightBall _/_': 'EightBall _V/_',
      'AK Чанай': 'AK Чапай', 'AK Чапаń': 'AK Чапай', 'AK Чапаи': 'AK Чапай', 'AK Чанаý': 'AK Чапай',
      '!!Uzumaki !!': '!!Uzumaki!!', '!! Uzumaki !!': '!!Uzumaki!!', 'Uzumaki': '!!Uzumaki!!', 'UzuBanner': '!!Uzumaki!!',
      '● AGAM ●': 'AGAM', '●●AGAM ●●': 'AGAM', '●● AGAM ●●': 'AGAM', '●AGAM●': 'AGAM',
      'MasterVjoo': 'MasterVj', '~MasterVj~': 'MasterVj', '≽ MasterVj ≡': 'MasterVj', '~MasterVjoe~': 'MasterVj', 'MasterVjper': 'MasterVj', '~MasterVjoo~': 'MasterVj', 'MasterVjso': 'MasterVj',
      '○UNDEADO○': 'UNDEAD', '○UNDEAD○': 'UNDEAD', '◎UNDEADO◎': 'UNDEAD', 'ØUNDEADØ': 'UNDEAD', 'UNDEADO': 'UNDEAD',
      '© I N d O / Made3110': 'Made3110', '\\xind\\Made3110': 'Made3110', 'Sind?Made3110': 'Made3110', '© I N d ō/Made3110': 'Made3110', 'yind?Made3110': 'Made3110',
      '≽ Kika ≡': 'Kika', '~Kika~': 'Kika', '✨Kika✨': 'Kika', ' Kika ': 'Kika', '✨Kika-banner✨': 'Kika-banner', '~Kika ~': 'Kika',
      'тynгзахур': 'түнгзахурп', 'тyнг3ахур': 'түнгзахурп', 'тунгзахурп': 'түнгзахурп', 'түнгэахур': 'түнгзахурп', 'тynгзахyp': 'түнгзахурп', 'тyHГ3ахур': 'түнгзахурп', 'тyнгзахур': 'түнгзахурп',
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
      'A n d ē R $': 'A n d e R $', 'АηdεR$': 'A n d e R $', 'Anders': 'A n d e R $',
      'Dizz..': 'Dizz.',
      '★★★ 3BEPb ★★★': '3BEPb', 'ЗВЕРЬ': '3BEPb', '*** 3BEPb ***': '3BEPb', '*** ЗВЕРЬ ***': '3BEPb',
      'REFORMASIJILID2*': 'REFORMASIJILID2·',
      'СоBob': 'CoBoP', 'СоБоР': 'CoBoP',
      '★ Aqua ★': '★Aqua★', '*Aqua*': '★Aqua★', '☆Aqua☆': '★Aqua★', '☆Aqua ☆': '★Aqua★',
      '.Jasper.@': '@.Jasper.@', '.Jasper.': '@.Jasper.@',
      '*r@mze$$$*': '★r@mze$$$★', '☆r@nze$$$☆': '★r@mze$$$★',
      'I D NÓ/Dragon.Gold': 'IDN Dragon.Gold', 'IDN°/Dragon.Gold': 'IDN Dragon.Gold', '↘I D N ø/Dragon.Gold': 'IDN Dragon.Gold',
      'МяТная Лапка': 'Мятная Лапка',
      'yousef المحارب': 'المحارب yousef',
      '*DEAN JR*': '*DEAN*',
      'Moldo1313': 'Moldo1313', 'MalakAdo': 'MalakAdo', 'MalakAbo': 'MalakAbo',
      'WICKED RUSSIANO': 'WICKED RUSSIAN',
      'Indomie.telor': 'Indomie.telor....'
    };
    if (aliasMap[name]) return aliasMap[name];
    if (/pixel/i.test(name)) return '༄Pixel';
  }

  if (!rosterNames.length) return name;
  let best = name, maxSim = 0;
  for (const rn of rosterNames) {
    const sim = getSimilarity(name, rn);
    if (sim > maxSim) { maxSim = sim; best = rn; }
  }
  let threshold = 0.82;
  if (name.length < 5) threshold = 0.6;
  else if (name.length <= 8) threshold = 0.72;
  if (minConfidence < 70) threshold -= 0.08;
  return maxSim > threshold ? best : name;
}

// --- Roster ---



// ── Sub-tab Switching ────────────────────────────────────
function switchDashSubtab(name) {
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-btn').forEach(b => b.classList.remove('dash-subtab-active'));
  const panel = $id('dashSubtab' + name.charAt(0).toUpperCase() + name.slice(1));
  if (panel) panel.classList.remove('hidden');
  const btn = document.querySelector(`#ocrDashboardRoot .dash-subtab-btn[data-subtab="${name}"]`);
  if (btn) btn.classList.add('dash-subtab-active');
  if (name === 'roster') renderRoster();
  if (name === 'banners') renderBanners();
}

// ── Roster Snapshots (local + Firestore) ──────────────────
async function saveRosterSnapshotsToFirestore() {
  try {
    await ensureAnonymousAuth();
    await setDoc(doc(getDb(), FS_ROSTER_PATH), { snapshots: rosterSnapshots, updated: new Date().toISOString() });
  } catch (e) {
    console.error('ROSTER FIRESTORE SAVE ERROR:', e);
  }
}
async function loadRosterSnapshotsFromFirestore() {
  try {
    const db = getDb();
    await ensureAnonymousAuth();
    if (_fsRosterUnsub) _fsRosterUnsub();
    const snap = await getDoc(doc(db, FS_ROSTER_PATH));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.snapshots)) {
        rosterSnapshots = data.snapshots;
        localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(rosterSnapshots));
      }
    }
    _fsRosterUnsub = onSnapshot(doc(db, FS_ROSTER_PATH), (s) => {
      if (s.exists()) {
        const d = s.data();
        if (Array.isArray(d.snapshots)) {
          rosterSnapshots = d.snapshots;
          localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(rosterSnapshots));
          renderRoster();
        }
      }
    }, (err) => console.error('ROSTER SYNC ERROR:', err));
  } catch (e) {
    console.error('ROSTER FIRESTORE LOAD ERROR:', e);
  }
}

// ── Roster Image OCR ─────────────────────────────────────
async function processRosterImages(files) {
  if (_rosterProcessing) { log('Roster OCR already running...', 'warn'); return; }
  _rosterProcessing = true;
  const valid = Array.from(files).filter(f => /\.(png|jpe?g)$/i.test(f.name));
  if (!valid.length) { _rosterProcessing = false; return; }

  const prog = $id('dashRosterProgress');
  const progText = $id('dashRosterProgressText');
  if (prog) prog.classList.remove('hidden');

  log(`Scanning ${valid.length} roster screenshot(s)...`, 'info');

  let localKey = localStorage.getItem('qwen_api_key');
  if (!localKey) {
    log('No API key set. Enter it in the top bar and try again.', 'error');
    if (prog) prog.classList.add('hidden');
    _rosterProcessing = false;
    alert('No API key found. Please enter your API key in the top bar and click Confirm, then upload again.');
    return;
  }

  let allNames = [];

  for (let i = 0; i < valid.length; i++) {
    const f = valid[i];
    if (progText) progText.textContent = `Scanning roster image ${i + 1}/${valid.length}...`;
    const base64 = await new Promise(res => {
      const r = new FileReader(); r.onload = e => res(e.target.result.split(',')[1]); r.readAsDataURL(f);
    });

    try {
      const promptTxt = `You are analyzing a game alliance roster or member list screenshot.

Extract ALL player names visible in the image. Return them as a flat JSON array of strings.

RULES:
- Output ONLY valid JSON: an array of strings like ["Name1", "Name2", ...]
- Do NOT wrap in markdown blocks. No commentary.
- Include alliance/clan tags if visible (e.g. "[VTS]PlayerName").
- Remove duplicate names.
- Ignore headers, column titles, rank numbers, power levels, or any non-name text.
- If no names are clearly visible, return [].

JSON SCHEMA: ["Player One", "Player Two", "Player Three"]`;

      let raw = null;
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch(QWEN_WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localKey}` },
            body: JSON.stringify({
              model: 'qwen-vl-plus',
              messages: [{ role: 'user', content: [
                { type: 'text', text: promptTxt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
              ]}]
            })
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`API ${res.status}${errText ? ': ' + errText.slice(0, 80) : ''}`);
          }
          raw = await res.json();
          if (raw?.choices?.[0]?.message?.content) break;
        } catch (e) {
          lastErr = e;
          if (attempt === 3) throw e;
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
      }

      const text = raw?.choices?.[0]?.message?.content || '';
      let names = [];
      try {
        const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
        names = JSON.parse(cleaned);
      } catch (e) {
        names = text.split('\n').map(l => l.replace(/^[\d\s."'[\],]+/, '').trim()).filter(Boolean);
      }
      if (!Array.isArray(names)) names = [];
      names = names.filter(n => typeof n === 'string' && n.trim().length > 0).map(n => n.trim());
      allNames.push(...names);
    } catch (e) {
      log(`Roster OCR error (${f.name}): ${e.message}`, 'error');
    }
  }

  if (prog) prog.classList.add('hidden');
  _rosterProcessing = false;

  const unique = [...new Set(allNames.map(n => n.toLowerCase()))].map(k => allNames.find(n => n.toLowerCase() === k)).filter(Boolean).sort();

  if (!unique.length) {
    log('No member names found in the screenshot(s).', 'warn');
    alert('Could not extract any member names from the image. Check the log panel for details.');
    return;
  }

  log(`Extracted ${unique.length} unique member names from roster image(s).`, 'info');

  const prevText = rosterSnapshots.length ? rosterSnapshots[rosterSnapshots.length - 1].members.join('\n') : '';
  const input = prompt(
    `Edit extracted member names (one per line):\n${unique.length} names found from image.`,
    unique.join('\n')
  );
  if (input !== null && input.trim()) {
    takeRosterSnapshot(input);
  } else {
    log('Roster snapshot cancelled.', 'warn');
  }
}




// ── Banner Records ────────────────────────────────────────

// --- Auth ---
const AUTH_HASH = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
const CLEAR_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

async function sha256(str) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return null; }
}

function isGuest() { return sessionStorage.getItem('vts_guest') === '1'; }
function isAuthed() { return localStorage.getItem(AUTH_KEY) === '1' || isGuest(); }
function showApp() { 
  $id('dashLogin')?.classList.add('hidden'); 
  $id('dashApp')?.classList.remove('hidden'); 
  if (isGuest()) {
    if (document.querySelector('.dash-actions')) document.querySelector('.dash-actions').style.display = 'none';
    if ($id('dashUploadZone')) $id('dashUploadZone').style.display = 'none';
    if ($id('dashLogArea')) $id('dashLogArea').style.display = 'none';
    if ($id('dashApiKeyContainer')) $id('dashApiKeyContainer').style.display = 'none';
    if ($id('dashInsightsCard')) $id('dashInsightsCard').style.display = 'none';
    if ($id('dashAttackHistoryCard')) $id('dashAttackHistoryCard').style.display = 'none';
    if (document.querySelector('.dash-kpi-grid')) document.querySelector('.dash-kpi-grid').style.display = 'none';
    
    let guestBanner = $id('dashGuestBanner');
    if (!guestBanner) {
      guestBanner = document.createElement('div');
      guestBanner.id = 'dashGuestBanner';
      guestBanner.style.cssText = 'background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.3); padding: 15px; margin-bottom: 20px; border-radius: 8px; color: #93c5fd; font-size: 0.9rem; text-align: center;';
      guestBanner.innerHTML = '<strong>Guest Mode:</strong> You are viewing the dashboard in read-only mode. Uploads are disabled. If charts are stuck on "Loading...", there is no data to display.';
      const dashContainer = $id('dashApp').querySelector('.dash-container');
      if (dashContainer) {
        dashContainer.insertBefore(guestBanner, dashContainer.firstChild);
      }
    }
  } else {
    if (document.querySelector('.dash-actions')) document.querySelector('.dash-actions').style.display = '';
    if ($id('dashUploadZone')) $id('dashUploadZone').style.display = '';
    if ($id('dashApiKeyContainer')) $id('dashApiKeyContainer').style.display = 'flex';
    if ($id('dashInsightsCard')) $id('dashInsightsCard').style.display = '';
    if ($id('dashAttackHistoryCard')) $id('dashAttackHistoryCard').style.display = '';
    if (document.querySelector('.dash-kpi-grid')) document.querySelector('.dash-kpi-grid').style.display = '';
  }
}
function showLogin() { $id('dashLogin')?.classList.remove('hidden'); $id('dashApp')?.classList.add('hidden'); }

async function doLogin() {
  const p = $id('dashLoginPass').value, err = $id('dashLoginErr');
  const h = await sha256(p);
  if (h === AUTH_HASH) { localStorage.setItem(AUTH_KEY, '1'); err.classList.add('hidden'); showApp(); loadData(); }
  else { err.textContent = 'Invalid access code'; err.classList.remove('hidden'); }
}

// --- Persistence ---
async function saveData(data) {
  dashData = data;
  try { 
    const localLogs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    dashData.logs = localLogs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); 
  } catch (e) {}
  try { 
    await ensureAnonymousAuth();
    await setDoc(doc(getDb(), FS_PATH), data); 
    log('Synced to cloud.', 'info'); 
  } catch (e) { 
    console.error("FIREBASE SAVE ERROR:", e);
    log('Save error: ' + (e.message || e.code), 'error'); 
  }
}

async function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { dashData = JSON.parse(saved); render(); }
  } catch (e) {}
  try {
    const db = getDb();
    if (!db) { log('Firestore not available — using local storage only.', 'warn'); return; }
    await ensureAnonymousAuth();
    if (_fsUnsub) _fsUnsub();
    const snap = await getDoc(doc(db, FS_PATH));
    if (snap.exists()) {
      dashData = snap.data();
      try { 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dashData)); 
        if (dashData.logs) {
          localStorage.setItem(LOG_KEY, JSON.stringify(dashData.logs));
          restoreLogs();
        }
      } catch (e) {}
      render();
    }
    _fsUnsub = onSnapshot(doc(db, FS_PATH), (snap) => {
      if (snap.exists()) {
        dashData = snap.data();
        try { 
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dashData)); 
          if (dashData.logs) {
            localStorage.setItem(LOG_KEY, JSON.stringify(dashData.logs));
            restoreLogs();
          }
        } catch (e) {}
        render();
        const ind = $id('dashSyncIndicator');
        if (ind) {
          ind.classList.remove('hidden');
          setTimeout(() => ind.classList.add('hidden'), 3500);
        }
      }
    }, (err) => {
      console.error("FIREBASE SYNC ERROR:", err);
      log('Sync listener error: ' + (err.message || err.code), 'error');
    });
    log('Cloud sync active.', 'info');
  } catch (e) { 
    console.error("FIREBASE AUTH ERROR:", e);
    log('Load auth error: ' + (e.message || e.code), 'error'); 
  }
}

async function clearData() {
  dashData = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  try { localStorage.removeItem(LOG_KEY); } catch (e) {}
  try { 
    await ensureAnonymousAuth();
    await setDoc(doc(getDb(), FS_PATH), {}); 
  } catch (e) {}
  const out = $id('dashLogOutput'); if (out) out.innerHTML = '';
  render();
  log('Database wiped.', 'warn');
}

// --- Exports ---
function exportData() { if (!dashData) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(dashData, null, 2)], { type: 'application/json' })); a.download = 'vts_admin_data.json'; a.click(); }
function exportToCsv() {
  if (!dashData?.players_summary) return;
  let csv = 'Rank,Member Name,Total Demolition,Hits,Avg per Hit\n';
  dashData.players_summary.forEach((p, i) => { const safeName = p.name.replace(/"/g, '""'); csv += `${i + 1},"${safeName}",${p.total_demolition},${p.participation_count},${Math.round(p.total_demolition/p.participation_count)}\n`; });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'vts_leaderboard.csv'; a.click();
}
async function exportToPng() {
  const html2canvas = await window.loadHtml2Canvas();
  const target = $id('dashApp')?.querySelector('.dash-container') || $id('dashApp');
  if (!target) return;
  html2canvas(target, { backgroundColor: '#0b0f19', scale: 2, allowTaint: false, useCORS: true }).then(c => { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'vts_dashboard.png'; a.click(); }).catch(() => {});
}
async function exportChartPng() {
  const chart = $id('dashChart');
  if (!chart) return;
  const html2canvas = await window.loadHtml2Canvas();
  
  const card = chart.closest('.dash-card');
  const clone = card.cloneNode(true);
  
  // Remove export buttons from clone
  const cloneBtns = clone.querySelectorAll('.dash-btn');
  cloneBtns.forEach(b => b.remove());
  
  const filterEl = $id('dashLeaderFilter');
  let subTitle = "Global Top Performers · All Time";
  if (filterEl && filterEl.value) {
     const opt = filterEl.options[filterEl.selectedIndex];
     if (opt) subTitle = opt.textContent;
  }
  const tf = $id('dashTimeFilter');
  if (tf && tf.value !== 'all') {
     const opt = tf.options[tf.selectedIndex];
     if (opt) subTitle += ` · ${opt.textContent}`;
  }
  
  const titleH2 = clone.querySelector('h2.dash-card-title');
  if (titleH2) {
    titleH2.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="margin-right:10px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <span style="font-size:1.4rem;text-shadow:0 0 10px rgba(59,130,246,0.5)">Top Performers</span>`;
    const subDiv = document.createElement('div');
    subDiv.style.cssText = 'font-size:0.85rem; color:#94a3b8; margin-top:8px; margin-left:34px; font-weight:600; letter-spacing:0.02em;';
    subDiv.textContent = subTitle;
    titleH2.parentElement.appendChild(subDiv);
    titleH2.parentElement.style.flexDirection = 'column';
    titleH2.parentElement.style.alignItems = 'flex-start';
    titleH2.parentElement.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    titleH2.parentElement.style.paddingBottom = '1rem';
    titleH2.parentElement.style.marginBottom = '1rem';
  }

  const cloneChart = clone.querySelector('.dash-chart');
  if (cloneChart) cloneChart.style.gap = '0.9rem';

  const items = clone.querySelectorAll('.dash-top-item');
  items.forEach(item => {
     item.style.overflow = 'visible';
     item.style.borderRadius = '0';
     const bar = item.querySelector('.dash-top-bar');
     if (bar) {
       bar.style.borderRadius = '8px';
       bar.style.background = 'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(59,130,246,0.3))';
     }
     const spans = item.querySelectorAll('span');
     spans.forEach(s => s.style.transform = 'translateY(1px)');
  });

  clone.style.position = 'absolute';
  clone.style.top = '0px';
  clone.style.left = '-9999px';
  clone.style.width = Math.max(card.offsetWidth, 500) + 'px'; // Ensure sufficient width for export
  clone.style.background = '#0b0f19'; // Force explicit background on clone
  clone.style.border = '1px solid rgba(255,255,255,0.05)';
  
  // Append to the root so CSS applies!
  const root = $id('ocrDashboardRoot') || document.body;
  root.appendChild(clone);

  html2canvas(clone, { backgroundColor: '#0b0f19', scale: 2 }).then(c => { 
    clone.remove();
    c.toBlob(blob => {
      const file = new File([blob], 'vts_top_performers.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // We have a share button now, maybe just download directly here unless explicitly sharing
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vts_top_performers.png'; a.click();
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vts_top_performers.png'; a.click(); 
      }
    });
  }).catch(() => {
    clone.remove();
  });
}
window.shareChartImage = async function() {
  const chart = $id('dashChart');
  if (!chart) return;
  const html2canvas = await window.loadHtml2Canvas();
  const card = chart.closest('.dash-card');
  const clone = card.cloneNode(true);
  const cloneBtns = clone.querySelectorAll('.dash-btn'); cloneBtns.forEach(b => b.remove());
  const filterEl = $id('dashLeaderFilter'); let subTitle = "Global Top Performers · All Time";
  if (filterEl && filterEl.value) { const opt = filterEl.options[filterEl.selectedIndex]; if (opt) subTitle = opt.textContent; }
  const tf = $id('dashTimeFilter');
  if (tf && tf.value !== 'all') { const opt = tf.options[tf.selectedIndex]; if (opt) subTitle += ` · ${opt.textContent}`; }
  const titleH2 = clone.querySelector('h2.dash-card-title');
  if (titleH2) {
    titleH2.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="margin-right:10px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <span style="font-size:1.4rem;text-shadow:0 0 10px rgba(59,130,246,0.5)">Top Performers</span>`;
    const subDiv = document.createElement('div'); subDiv.style.cssText = 'font-size:0.85rem; color:#94a3b8; margin-top:8px; margin-left:34px; font-weight:600; letter-spacing:0.02em;'; subDiv.textContent = subTitle;
    titleH2.parentElement.appendChild(subDiv); titleH2.parentElement.style.flexDirection = 'column'; titleH2.parentElement.style.alignItems = 'flex-start';
    titleH2.parentElement.style.borderBottom = '1px solid rgba(255,255,255,0.1)'; titleH2.parentElement.style.paddingBottom = '1rem'; titleH2.parentElement.style.marginBottom = '1rem';
  }
  const cloneChart = clone.querySelector('.dash-chart');
  if (cloneChart) cloneChart.style.gap = '0.9rem';

  const items = clone.querySelectorAll('.dash-top-item');
  items.forEach(item => {
     item.style.overflow = 'visible'; item.style.borderRadius = '0';
     const bar = item.querySelector('.dash-top-bar'); if (bar) { bar.style.borderRadius = '8px'; bar.style.background = 'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(59,130,246,0.3))'; }
     const spans = item.querySelectorAll('span'); spans.forEach(s => s.style.transform = 'translateY(1px)');
  });
  clone.style.position = 'absolute'; clone.style.top = '0px'; clone.style.left = '-9999px'; clone.style.width = card.offsetWidth + 'px'; clone.style.background = '#0b0f19'; clone.style.border = '1px solid rgba(255,255,255,0.05)';
  const root = $id('ocrDashboardRoot') || document.body; root.appendChild(clone);
  html2canvas(clone, { backgroundColor: '#0b0f19', scale: 2 }).then(c => { 
    clone.remove();
    c.toBlob(blob => {
      const file = new File([blob], 'vts_top_performers.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ title: 'Top Performers', files: [file] }).catch(()=>{});
      } else {
        alert('Sharing not supported on this browser. Use the download button instead.');
      }
    });
  }).catch(() => { clone.remove(); });
}
function exportAttackCsv() {
  if (!dashData?.attacks?.length) return;
  let csv = 'Start Time,End Time,Structure,Level,Player Name,Rank,Demolition Value\n';
  dashData.attacks.forEach(a => {
    const date = displayGameTime(a.game_time);
    const start = a.start_time ? a.start_time.replace(/"/g, '""') : '';
    (a.players||[]).forEach(p => { const safeName = p.name.replace(/"/g, '""'); csv += `"${start}","${date}","${a.structure_name}","${a.structure_level||''}","${safeName}",${p.rank},${p.value}\n`; });
  });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'vts_attack_details.csv'; a.click();
}
function exportDebugCsv() {
  if (!dashData?.attacks?.length) return;
  let csv = 'Attack ID,Start Time,End Time,Structure,Level,Raw Name,Grouped Name (Master),Demolition Value,Rank\n';
  dashData.attacks.forEach(a => {
    const date = displayGameTime(a.game_time);
    const start = a.start_time ? a.start_time.replace(/"/g, '""') : '';
    (a.players||[]).forEach(p => { 
      const rawName = p.name.replace(/"/g, '""'); 
      const groupedName = findBestMatch(p.name).replace(/"/g, '""');
      csv += `"${a.id}","${start}","${date}","${a.structure_name}","${a.structure_level||''}","${rawName}","${groupedName}",${p.value},${p.rank}\n`; 
    });
  });
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' })); link.download = `vts_debug_export_${new Date().getTime()}.csv`; link.click();
}
function importData(file) {
  const r = new FileReader(); r.onload = e => {
    try {
      const imp = JSON.parse(e.target.result); if (!imp.attacks) throw 'Invalid';
      const m = {}; (dashData?.attacks||[]).forEach(a => m[a.id]=a); (imp.attacks||[]).forEach(a => m[a.id]=a);
      const sorted = Object.values(m).sort((a,b) => b.game_time.localeCompare(a.game_time));
      const sum = {}; sorted.forEach(a => {
        const seen = new Set();
        a.players.forEach(p => {
          const n = findBestMatch(p.name); if (!sum[n]) sum[n] = { name: n, total_demolition: 0, participation_count: 0, attacks: [] };
          sum[n].total_demolition += p.value; 
          if (!seen.has(n)) { sum[n].participation_count++; seen.add(n); }
          sum[n].attacks.push({ attack_id: a.id, structure_name: a.structure_name, game_time: a.game_time, value: p.value, rank: p.rank });
        });
      });
      saveData({ last_updated: fmtDate(new Date()), total_attacks: sorted.length, attacks: sorted, players_summary: Object.values(sum).sort((a,b)=>b.total_demolition-a.total_demolition)});
      render(); log('Import successful.', 'success');
    } catch (err) { alert('Import failed'); }
  }; r.readAsText(file);
}

// --- Render ---



// --- Durability Validation ---
const DURABILITY_TABLE = {
  gates:    { 1: 200000, 2: 400000, 3: 1200000, 4: 1500000, 5: 2000000 },
  cities:   { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000 },
  capital:  { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000, 6: 4200000, 7: 5000000 },
  capitol:  { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000, 6: 4200000, 7: 5000000 },
  temple:   { 1: 1000000 },
  stronghold: { 1: 1000000 },
};

function validateTotalDemolition(sN, sL, total) {
  const levelNum = parseInt(String(sL || '').replace(/[^0-9]/g, ''));
  if (!levelNum) return null;
  const entry = DURABILITY_TABLE[(sN || '').toLowerCase()];
  const expected = entry && entry[levelNum];
  if (!expected) return null;
  const diff = Math.abs(total - expected);
  const pct = diff / expected;
  return { expected, diff, pct, match: pct < 0.05, levelNum };
}

// --- OCR Engine ---
// Set this to your Cloudflare Worker URL after deploying workers/qwen-cors-proxy.js:
const QWEN_WORKER_URL = 'https://delicate-term-725f.aboroe1097.workers.dev';






export async function bootOcrDashboard() {
  if (_booted) return; _booted = true; loadRoster();
  loadRosterSnapshots();
  loadRosterSnapshotsFromFirestore();
  loadBannerRecords();
  loadAllianceList();
  loadRosterAuth();
  // Keep log panel always visible
  const logArea = $id('dashLogArea'); if (logArea) logArea.classList.remove('hidden');
  restoreLogs();
  log('VTS Admin Dashboard loaded.', 'info');
  if (isAuthed()) { showApp(); loadData(); } else { showLogin(); }
  $id('dashLoginBtn').onclick = doLogin;
  $id('dashGuestBtn').onclick = () => { sessionStorage.setItem('vts_guest', '1'); $id('dashLoginErr').classList.add('hidden'); showApp(); loadData(); };
  $id('dashRefreshBtn').onclick = () => { loadData(); render(); };
  $id('dashRosterBtn').onclick = showRosterModal;
  const expBtn = $id('dashRosterExportBtn'); if (expBtn) expBtn.onclick = exportRosterCSV;
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-btn').forEach(btn => btn.onclick = () => switchDashSubtab(btn.dataset.subtab));

  // Roster: manual snapshot button with dynamic day name
  const newSnapBtn = $id('dashRosterSnapshotBtn');
  if (newSnapBtn) {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    newSnapBtn.querySelector('span').textContent = `New Snapshot (${days[new Date().getDay()]})`;
    newSnapBtn.onclick = () => {
      const prevText = rosterSnapshots.length ? rosterSnapshots[rosterSnapshots.length - 1].members.join('\n') : '';
      const input = prompt('Paste member names (one per line):', prevText);
      if (input !== null && input.trim()) takeRosterSnapshot(input);
    };
  }

  // ── API status watcher ──────────────────────────────────
  function updateApiStatus() {
    const key = localStorage.getItem('qwen_api_key');
    const ok = key && key.trim().length > 20;
    const els = [
      { id: 'dashRosterApiStatus', zone: 'dashRosterUploadZone', drop: 'dashRosterDropZone', input: 'dashRosterFileInput' },
      { id: 'dashApiUploadStatus', zone: 'dashUploadZone', drop: 'dashDropZone', input: 'dashFileInput' },
    ];
    els.forEach(({ id, zone, drop, input }) => {
      const statusEl = $id(id);
      const zoneEl = $id(zone);
      const dropEl = $id(drop);
      const inputEl = $id(input);
      if (!statusEl) return;
      if (ok) {
        statusEl.className = 'dash-roster-api-status dash-api-ok';
        statusEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> API key set & verified';
        if (dropEl) { dropEl.style.opacity = '1'; dropEl.style.pointerEvents = ''; }
        if (inputEl) inputEl.disabled = false;
      } else {
        statusEl.className = 'dash-roster-api-status dash-api-missing';
        statusEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <b>API key required</b> — paste a Qwen API key above & click <b>Confirm</b> before uploading';
        if (dropEl) { dropEl.style.opacity = '0.5'; dropEl.style.pointerEvents = 'none'; }
        if (inputEl) inputEl.disabled = true;
      }
    });
  }

  // Run on boot and whenever key input changes
  updateApiStatus();
  const apiInput = $id('dashApiKeyInput');
  if (apiInput) {
    apiInput.addEventListener('input', updateApiStatus);
    apiInput.addEventListener('change', updateApiStatus);
  }
  const apiSaveBtn = $id('dashSaveApiBtn');
  if (apiSaveBtn) apiSaveBtn.addEventListener('click', updateApiStatus);

  // Roster: image upload
  const rosterZone = $id('dashRosterUploadZone');
  const rosterDrop = $id('dashRosterDropZone');
  const rosterInput = $id('dashRosterFileInput');
  if (rosterDrop && rosterInput) {
    rosterDrop.onclick = () => {
      const key = localStorage.getItem('qwen_api_key');
      if (!key || key.trim().length <= 20) { updateApiStatus(); return; }
      rosterInput.click();
    };
    rosterDrop.ondragover = e => { e.preventDefault(); rosterDrop.classList.add('dragover'); };
    rosterDrop.ondragleave = () => rosterDrop.classList.remove('dragover');
    rosterDrop.ondrop = e => {
      e.preventDefault(); rosterDrop.classList.remove('dragover');
      const key = localStorage.getItem('qwen_api_key');
      if (!key || key.trim().length <= 20) { updateApiStatus(); return; }
      if (e.dataTransfer.files.length) processRosterImages(e.dataTransfer.files);
    };
    rosterInput.onchange = () => {
      if (rosterInput.files.length) processRosterImages(rosterInput.files);
    };
  }

  const newBannerBtn = $id('dashBannerAddBtn'); if (newBannerBtn) newBannerBtn.onclick = () => showBannerForm();
  const clearLogBtn = $id('dashClearLogBtn'); if (clearLogBtn) clearLogBtn.onclick = () => { $id('dashLogOutput').innerHTML = ''; try { localStorage.removeItem(LOG_KEY); } catch (e) {} };
  
  $id('dashExportMenuBtn').onclick = (e) => { e.stopPropagation(); $id('dashExportMenu').classList.toggle('active'); };
  window.addEventListener('click', () => $id('dashExportMenu').classList.remove('active'));

  $id('dashExpCsv').onclick = exportToCsv;
  $id('dashExpAttackCsv').onclick = exportAttackCsv;
  const dashExpDebug = $id('dashExpDebugCsv'); if (dashExpDebug) dashExpDebug.onclick = exportDebugCsv;
  $id('dashExpPdf').onclick = () => window.print();
  $id('dashExpPng').onclick = exportToPng;
  $id('dashExpJson').onclick = exportData;
  const chartBtn = $id('dashExportChartBtn'); if (chartBtn) chartBtn.onclick = exportChartPng;
  const shareBtn = $id('dashShareChartBtn'); if (shareBtn) shareBtn.onclick = window.shareChartImage;
  $id('dashImportBtn').onclick = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
    inp.onchange = () => { if (inp.files.length) importData(inp.files[0]); }; inp.click();
  };

  if (apiInput) {
    apiInput.value = localStorage.getItem('qwen_api_key') || '';
    apiInput.oninput = (e) => {
      const val = e.target.value.trim();
      if (val) localStorage.setItem('qwen_api_key', val);
      else localStorage.removeItem('qwen_api_key');
    };
  }
  if (apiSaveBtn && apiInput) {
    apiSaveBtn.onclick = () => {
      const val = apiInput.value.trim();
      if (val) {
        localStorage.setItem('qwen_api_key', val);
        // Trigger the file input immediately to retain trusted user gesture context
        const inp = $id('dashFileInput');
        if (inp) inp.click();
        log('API accepted and added. You can now start uploading.', 'success');
      } else {
        localStorage.removeItem('qwen_api_key');
        alert('API Key cleared. Please enter an API key to upload images.');
      }
    };
  }

  $id('dashClearDataBtn').onclick = async () => {
    const code = prompt('Enter admin override code:');
    if (!code) return;
    const h = await sha256(code);
    if (h === CLEAR_HASH) clearData(); else alert('Invalid code');
  };

  $id('dashModalClose').onclick = closeModal;
  $id('dashSearch').oninput = e => { searchQ = e.target.value; leaderLimit = 25; render(); };
  $id('dashLeaderFilter').onchange = () => { leaderLimit = 25; render(); };
  const tFilter = $id('dashTimeFilter');
  if (tFilter) tFilter.onchange = () => { leaderLimit = 25; render(); };
  $id('dashAttackSearch').oninput = e => { attackSearchQ = e.target.value; render(); };
  document.querySelectorAll('#ocrDashboardRoot th[data-sort]').forEach(th => th.onclick=()=>{ const c=th.dataset.sort; sortDir=sortCol===c?(sortDir==='desc'?'asc':'desc'):'desc'; sortCol=c; leaderLimit = 25; render(); });
  window.loadMoreLeaderboard = () => { leaderLimit += 25; render(); };
  
  const zone = $id('dashUploadZone'), drop = $id('dashDropZone'), inp = $id('dashFileInput');
  zone.classList.remove('hidden'); // Restore old visibility
  $id('dashUploadBtn').onclick = () => { const key = localStorage.getItem('qwen_api_key'); if (!key || key.trim().length <= 20) { updateApiStatus(); return; } inp.click(); };
  drop.onclick = () => { const key = localStorage.getItem('qwen_api_key'); if (!key || key.trim().length <= 20) { updateApiStatus(); return; } inp.click(); };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('dragover'); };
  drop.ondragleave = () => drop.classList.remove('dragover');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('dragover'); const key = localStorage.getItem('qwen_api_key'); if (!key || key.trim().length <= 20) { updateApiStatus(); return; } if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files); };
  inp.onchange = () => { if (inp.files.length) processFiles(inp.files); };
}

window.deleteAttack = async function(attId) {
  const pwd = prompt('Enter Admin Overdrive Password to delete this structure data:');
  if (pwd === null) return;
  const hash = await sha256(pwd);
  if (hash !== '857c3b259b7c496dc834575b66009ce3fedd8c1eb1503c1b927f4e415d5672a0' && hash !== '235aa062e6372588dbae00552abf36b8ff9c315e3da56cf02786980e764630e9') {
    alert('Incorrect password.');
    return;
  }
  if(!attId || !_booted || !dashData) return;
  const idx = dashData.attacks.findIndex(a => a.id === attId);
  if (idx !== -1) {
    const removed = dashData.attacks[idx];
    dashData.attacks.splice(idx, 1);
    const mockReturn = parseOcrResults([]); 
    dashData.players_summary = mockReturn ? mockReturn.players_summary : dashData.players_summary;
    dashData.total_attacks = dashData.attacks.length;
    await saveData(dashData);
    render(); closeModal();
    log(`Deleted attack: ${removed.structure_name} ${removed.structure_level}`, 'warn');
  }
};

window.editAttack = async function(attId) {
  if(!attId || !_booted || !dashData) return;
  const att = dashData.attacks.find(a => a.id === attId);
  if(!att) return;
  const newName = prompt("Edit Structure Name (e.g. Capital, Gates, City):", att.structure_name);
  if(newName === null) return;
  const newLevel = prompt("Edit Structure Level (e.g. Lv.1, Lv.5):", att.structure_level);
  if(newLevel === null) return;
  const newTime = prompt("Edit End Time (Game Time) (format: YYYY-MM-DD, HH:mm):", att.game_time);
  if(newTime === null) return;
  const newStartTime = prompt("Edit Start Time (Game Time) (Optional, leave blank if unknown):", att.start_time || "");
  if(newStartTime === null) return;
  att.structure_name = normalizeStructureName(newName.trim());
  att.structure_level = newLevel.trim();
  att.game_time = newTime.trim();
  att.start_time = newStartTime.trim();
  const mockReturn = parseOcrResults([]); 
  dashData.players_summary = mockReturn ? mockReturn.players_summary : dashData.players_summary;
  await saveData(dashData);
  render(); showModal('attack', att);
  log(`Updated attack to: ${att.structure_name} ${att.structure_level}`, 'info');
};

window.addPlayer = async function(attId) {
  if(!attId || !_booted || !dashData) return;
  const att = dashData.attacks.find(a => a.id === attId);
  if(!att) return;
  const pName = prompt("Enter new Player Name:");
  if(!pName) return;
  const pVal = prompt(`Enter Demolition Value for ${pName}:`);
  if(!pVal || isNaN(pVal)) return;
  
  att.players.push({ name: pName.trim(), value: Number(pVal), rank: 0 });
  att.players.sort((a,b) => b.value - a.value);
  att.players.forEach((p, i) => p.rank = i + 1);
  att.players_count = att.players.length;
  att.total_demolition = att.players.reduce((sum, p) => sum + (p.value || p.val || 0), 0);
  
  const mockReturn = parseOcrResults([]); 
  dashData.players_summary = mockReturn ? mockReturn.players_summary : dashData.players_summary;
  await saveData(dashData);
  render(); showModal('attack', att);
  log(`Added player ${pName} to ${att.structure_name}`, 'info');
};

window.editPlayer = async function(attId, encName) {
  if(!attId || !_booted || !dashData) return;
  const att = dashData.attacks.find(a => a.id === attId);
  if(!att) return;
  const pName = decodeURIComponent(encName);
  const pIdx = att.players.findIndex(p => p.name === pName);
  if(pIdx === -1) return;
  
  const action = prompt(`Editing ${pName}.\nType new Demolition Value to update, or type 'DELETE' to remove this player:`, att.players[pIdx].value || att.players[pIdx].val);
  if(!action) return;
  
  if (action.trim().toUpperCase() === 'DELETE') {
     att.players.splice(pIdx, 1);
  } else {
     const pVal = Number(action);
     if(isNaN(pVal)) { alert('Invalid value'); return; }
     const newName = prompt(`Edit Player Name:`, pName);
     if (newName) att.players[pIdx].name = newName.trim();
     att.players[pIdx].value = pVal;
  }
  
  att.players.sort((a,b) => b.value - a.value);
  att.players.forEach((p, i) => p.rank = i + 1);
  att.players_count = att.players.length;
  att.total_demolition = att.players.reduce((sum, p) => sum + (p.value || p.val || 0), 0);
  
  const mockReturn = parseOcrResults([]); 
  dashData.players_summary = mockReturn ? mockReturn.players_summary : dashData.players_summary;
  await saveData(dashData);
  render(); showModal('attack', att);
  log(`Edited player ${pName} in ${att.structure_name}`, 'info');
};

window.showPlayer = function(pNameEncoded) {
  if (!dashData) return;
  const pName = decodeURIComponent(pNameEncoded);
  const masterName = findBestMatch(pName);
  
  // Exact match first (using master name)
  let p = dashData.players_summary.find(x => x.name === masterName);
  // Fallback to raw name if master fails
  if (!p) p = dashData.players_summary.find(x => x.name === pName);
  // Fuzzy fallback: case-insensitive + trimmed
  if (!p) {
    const q = pName.trim().toLowerCase();
    p = dashData.players_summary.find(x => x.name.trim().toLowerCase() === q);
  }
  // Last resort: partial match (handles OCR name variants)
  if (!p) {
    const q = pName.trim().toLowerCase();
    p = dashData.players_summary.find(x =>
      x.name.toLowerCase().includes(q) || q.includes(x.name.toLowerCase())
    );
  }
  if (p) {
    showModal('player', p);
  } else {
    // Player exists in attack but not aggregated yet — build a minimal view
    const minimalPlayer = {
      name: pName,
      total_demolition: 0,
      participation_count: 0,
      attacks: [],
      _not_in_summary: true
    };
    showModal('player', minimalPlayer);
  }
};

window.showAttack = function(attId) {
  if(!dashData) return;
  const att = dashData.attacks.find(a => a.id === attId);
  if(att) showModal('attack', att);
  else closeModal();
};

window.exportPlayerReport = function(pNameEncoded) {
  if(!dashData) return;
  const pName = decodeURIComponent(pNameEncoded);
  const p = dashData.players_summary.find(x => x.name === pName);
  if(!p) return;
  let csv = "Time,Target,Value,Rank\n";
  const sortedAttacks = [...(p.attacks || [])].sort((a,b) => new Date(b.game_time || 0) - new Date(a.game_time || 0));
  sortedAttacks.forEach(att => {
    csv += `"${att.game_time}","${att.name} ${att.structure_level}",${att.val||att.value||0},${att.rank||''}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `VTS_Report_${pName.replace(/[^a-z0-9]/gi, '_')}.csv`; a.click();
};

window.rosterLogin = rosterLogin;
window.rosterLogout = rosterLogout;
window.setRosterStatus = setRosterStatus;
window.setRosterAlliance = setRosterAlliance;
window.toggleBulkCheck = toggleBulkCheck;
window.toggleBulkSelectAll = toggleBulkSelectAll;
window.applyBulkStatus = applyBulkStatus;
window.applyBulkAlliance = applyBulkAlliance;
window.copyRosterNames = copyRosterNames;
window.showRosterSnapshotModal = showRosterSnapshotModal;
window.configureAlliances = configureAlliances;
window.deleteRosterSnapshot = deleteRosterSnapshot;
window.showBannerForm = showBannerForm;
window.deleteBannerRecord = deleteBannerRecord;
window.closeModal = closeModal;
window.renderRoster = renderRoster;
window.setRosterFilter = function(key, val) {
  if (key === 'alliance') _rosterFilterAlliance = val;
  else if (key === 'status') _rosterFilterStatus = val;
  else if (key === 'search') _rosterSearchQ = val;
  renderRoster();
};
