// --- Serverless OCR Dashboard ---
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const STORAGE_KEY = 'vts_ocr_dashboard';
const AUTH_KEY = 'vts_ocr_auth';
const ROSTER_KEY = 'vts_ocr_roster';
const FS_PATH = 'vts_admin/dashboard_data';

let dashData = null;
let searchQ = '';
let attackSearchQ = '';
let rosterNames = [];
let sortCol = 'total_demolition';
let sortDir = 'desc';
let leaderLimit = 25;
let _booted = false;
let _ocrProcessing = false;
let _fsUnsub = null;

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
function loadRoster() {
  const raw = localStorage.getItem(ROSTER_KEY);
  rosterNames = raw ? raw.split('\n').map(n => n.trim()).filter(n => n.length > 0) : [];
}

function saveRoster(text) {
  localStorage.setItem(ROSTER_KEY, text);
  loadRoster();
}

function showRosterModal() {
  const m = $id('dashModal'), body = $id('dashModalBody');
  $id('dashModalTitle').textContent = 'Alliance Roster';
  $id('dashModalSub').textContent = 'Paste names (one per line) to improve OCR.';
  const rosterText = esc(localStorage.getItem(ROSTER_KEY) || '');
  body.innerHTML = `<textarea id="dashRosterInput" class="dash-input" style="height:300px;font-family:monospace;font-size:0.85rem">${rosterText}</textarea>
    <div style="margin-top:1rem;display:flex;gap:0.5rem"><button id="dashRosterSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">Save Roster</button><button id="dashRosterCancelBtn" class="dash-btn" style="flex:1">Cancel</button></div>`;
  $id('dashRosterSaveBtn').onclick = () => { saveRoster($id('dashRosterInput').value); closeModal(); };
  $id('dashRosterCancelBtn').onclick = closeModal;
  m.classList.add('active'); document.body.style.overflow = 'hidden';
}

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
function exportToPng() {
  if (typeof html2canvas === 'undefined') return;
  const target = $id('dashApp')?.querySelector('.dash-container') || $id('dashApp');
  if (!target) return;
  html2canvas(target, { backgroundColor: '#0b0f19', scale: 2, allowTaint: false, useCORS: true }).then(c => { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'vts_dashboard.png'; a.click(); }).catch(() => {});
}
function exportChartPng() {
  const chart = $id('dashChart');
  if (!chart || typeof html2canvas === 'undefined') return;
  
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
window.shareChartImage = function() {
  const chart = $id('dashChart');
  if (!chart || typeof html2canvas === 'undefined') return;
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
function render() {
  if (!dashData) {
    ['dashKpiAttacks','dashKpiDemo','dashKpiPlayers'].forEach(id => $id(id).textContent = '0');
    $id('dashKpiMvp').textContent = '---'; $id('dashChart').innerHTML = '<div class="dash-empty">Ready for upload</div>';
    $id('dashAttackList').innerHTML = '<div class="dash-empty">Empty</div>';
    $id('dashLeaderBody').innerHTML = '<tr><td colspan="5" class="dash-empty">No data</td></tr>';
    return;
  }
  let atts = dashData.attacks || [];
  
  const timeFilter = $id('dashTimeFilter');
  if (timeFilter && atts.length > 0) {
    const tf = timeFilter.value;
    if (tf === 'daily' || tf === 'weekly') {
      const gtNow = new Date(Date.now() + (new Date().getTimezoneOffset() - 120) * 60000);
      const pad = n => n.toString().padStart(2, '0');
      
      if (tf === 'daily') {
        const todayPrefix = `${pad(gtNow.getDate())}/${pad(gtNow.getMonth()+1)}/${gtNow.getFullYear()}`;
        atts = atts.filter(a => a.game_time && a.game_time.startsWith(todayPrefix));
      } else if (tf === 'weekly') {
        const dayOfWeek = gtNow.getDay();
        const daysSinceMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        const startOfMonday = new Date(gtNow.getFullYear(), gtNow.getMonth(), gtNow.getDate() - daysSinceMonday).getTime();
        atts = atts.filter(a => {
          if (!a.game_time) return false;
          const p1 = a.game_time.split(' ')[0].split('/');
          if (p1.length !== 3) return false;
          const attackTime = new Date(p1[2], parseInt(p1[1])-1, p1[0]).getTime();
          return attackTime >= startOfMonday;
        });
      }
    }
  }
  // Dynamically calculate global players summary so any findBestMatch rules apply retroactively
  const globalSum = {};
  atts.forEach(a => {
    const seen = new Set();
    a.players.forEach(p => { 
      const n = findBestMatch(p.name); 
      if (!globalSum[n]) globalSum[n] = { name: n, total_demolition: 0, participation_count: 0, attacks: [], unique_structures: new Set() }; 
      globalSum[n].total_demolition += (p.value||p.val||0); 
      if (!seen.has(n)) { globalSum[n].participation_count++; seen.add(n); globalSum[n].unique_structures.add((a.structure_name||'') + '_' + (a.structure_level||'')); }
      globalSum[n].attacks.push({ id: a.id, name: a.structure_name, structure_level: a.structure_level, game_time: a.game_time, val: (p.value||p.val||0), rank: p.rank }); 
    });
  });
  let psum = Object.values(globalSum).sort((a,b) => b.total_demolition - a.total_demolition);

  const filterEl = $id('dashLeaderFilter');
  if (filterEl && atts.length > 0) {
    const currentVal = filterEl.value;
    const sortedAtts = [...atts].sort((a,b) => (b.game_time||'').localeCompare(a.game_time||''));
    let opts = '<option value="">All Uploaded Targets</option>';
    sortedAtts.forEach(a => {
      const label = `${a.structure_name} ${a.structure_level||''} (${displayGameTime(a.game_time)})`;
      opts += `<option value="${a.id}" ${a.id===currentVal?'selected':''}>${esc(label)}</option>`;
    });
    filterEl.innerHTML = opts;

    if (currentVal) {
      const filteredAttacks = atts.filter(a => a.id === currentVal);
      const sum = {}; 
      filteredAttacks.forEach(a => {
        const seen = new Set();
        a.players.forEach(p => { 
          const n = findBestMatch(p.name); 
          if (!sum[n]) sum[n] = { name: n, total_demolition: 0, participation_count: 0, attacks: [], unique_structures: new Set() }; 
          sum[n].total_demolition += (p.value||p.val||0); 
          if (!seen.has(n)) { sum[n].participation_count++; seen.add(n); sum[n].unique_structures.add((a.structure_name||'') + '_' + (a.structure_level||'')); }
          sum[n].attacks.push({ id: a.id, name: a.structure_name, structure_level: a.structure_level, game_time: a.game_time, val: (p.value||p.val||0), rank: p.rank }); 
        });
      });
      psum = Object.values(sum).sort((a,b) => b.total_demolition - a.total_demolition);
    }
  }

  const total = atts.reduce((s, a) => s + (a.total_demolition || 0), 0);
  $id('dashKpiAttacks').textContent = atts.length;
  $id('dashKpiDemo').textContent = total > 1e6 ? (total/1e6).toFixed(1)+'M' : total.toLocaleString();
  $id('dashKpiPlayers').textContent = psum.length;
  $id('dashKpiMvp').textContent = psum[0]?.name || '---';
  
  const psumWithRank = psum.map((p, i) => ({ ...p, original_rank: i + 1 }));

  const c = $id('dashChart'); c.innerHTML = '';
  const top = psumWithRank.slice(0, 10), max = top[0]?.total_demolition || 1;
  top.forEach((p) => {
    const w = document.createElement('div'); w.className = 'dash-top-item'; w.style.cursor = 'pointer';
    w.style.display = 'grid'; w.style.gridTemplateColumns = '36px 1fr auto'; w.style.gap = '0 12px'; w.style.alignItems = 'center';
    const pct = Math.round((p.total_demolition/max)*100);
    w.innerHTML = `<span class="dash-top-rank">#${p.original_rank}</span><div style="position:relative; display:flex; align-items:center; min-width:0; padding:4px 0;"><div class="dash-top-bar" style="width:${pct}%; top:2px; bottom:2px;"></div><span class="dash-top-name" style="position:relative; z-index:1; margin-left:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:8px;">${esc(p.name)}</span><span style="position:relative; z-index:1; margin-left:auto; margin-right:8px; font-size:0.7rem; color:#94a3b8; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:10px; white-space:nowrap; line-height:1; display:inline-flex; align-items:center; flex-shrink:0;">${p.participation_count} hits (${p.unique_structures?.size||0} structs)</span></div><span class="dash-top-val">${(p.total_demolition/1000).toFixed(0)}k</span>`;
    w.onclick = () => showModal('player', p); c.appendChild(w);
  });

  const lc = $id('dashLowestChart');
  if (lc) {
    lc.innerHTML = '';
    const lowest = psumWithRank.slice(-10).reverse();
    if (lowest.length === 0) {
      lc.innerHTML = '<div class="dash-empty">No data</div>';
    } else {
      const lowestMax = Math.max(...lowest.map(p => p.total_demolition), 1);
      lowest.forEach(p => {
        const w = document.createElement('div'); w.className = 'dash-top-item'; w.style.cursor = 'pointer';
        w.style.display = 'grid'; w.style.gridTemplateColumns = '36px 1fr auto'; w.style.gap = '0 12px'; w.style.alignItems = 'center';
        const pct = Math.round((p.total_demolition/lowestMax)*100); 
        w.innerHTML = `<span class="dash-top-rank" style="color:#f87171">#${p.original_rank}</span><div style="position:relative; display:flex; align-items:center; min-width:0; padding:4px 0;"><div class="dash-top-bar" style="width:${pct}%; top:2px; bottom:2px; background: linear-gradient(90deg, rgba(248,113,113,0.1), rgba(248,113,113,0.25)); border-right-color: rgba(248,113,113,0.4)"></div><span class="dash-top-name" style="position:relative; z-index:1; margin-left:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:8px;">${esc(p.name)}</span><span style="position:relative; z-index:1; margin-left:auto; margin-right:8px; font-size:0.7rem; color:rgba(248,113,113,0.8); background:rgba(248,113,113,0.06); padding:2px 6px; border-radius:10px; white-space:nowrap; line-height:1; display:inline-flex; align-items:center; flex-shrink:0;">${p.participation_count} hits (${p.unique_structures?.size||0} structs)</span></div><span class="dash-top-val" style="color:#f87171; text-shadow: 0 0 10px rgba(248,113,113,0.3)">${(p.total_demolition/1000).toFixed(0)}k</span>`;
        w.onclick = () => showModal('player', p); lc.appendChild(w);
      });
    }
  }

  const al = $id('dashAttackList'); al.innerHTML = '';
  const filteredAttacks = atts.filter(a => {
    const term = attackSearchQ.toLowerCase();
    const day = (a.game_time||'').split(' ')[0].toLowerCase();
    return (a.structure_name||'').toLowerCase().includes(term) || (a.structure_level||'').toLowerCase().includes(term) || day.includes(term);
  });
  
  if (filteredAttacks.length === 0) {
    al.innerHTML = '<div class="dash-empty">No matching attacks</div>';
  } else {
    const grouped = {};
    filteredAttacks.forEach(a => {
      const day = a.game_time && a.game_time.includes(',') ? a.game_time.split(',')[0] : (a.game_time||'Unknown Day').split(' ')[0];
      if(!grouped[day]) grouped[day] = [];
      grouped[day].push(a);
    });
    const sortedDays = Object.keys(grouped).sort((a,b) => new Date(b) - new Date(a));
    sortedDays.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.style.cssText = 'padding: 6px 10px; background: rgba(255,255,255,0.06); font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; border-radius: 4px;';
      dayHeader.textContent = day;
      al.appendChild(dayHeader);
      grouped[day].forEach(a => {
        const val = validateTotalDemolition(a.structure_name, a.structure_level, a.total_demolition);
        let badge = '';
        if (val) {
          badge = val.match
            ? `<span class="dash-val-badge dash-val-ok" title="✓ ${(a.total_demolition || 0).toLocaleString()} / ${val.expected.toLocaleString()}">✓</span>`
            : `<span class="dash-val-badge dash-val-warn" title="✗ ${(a.total_demolition || 0).toLocaleString()} vs ${val.expected.toLocaleString()} (${(val.pct*100).toFixed(1)}% off)">!</span>`;
        }
        const d = document.createElement('div'); d.className = 'dash-attack-item'; d.style.cursor = 'pointer';
        let timeStr = displayGameTime(a.game_time);
        if (a.start_time) {
           const match = timeStr.match(/(.*(?:,\s*|\s+))(\d{1,2}:\d{2}(?:\s*GT)?)$/i);
           if (match) timeStr = `${match[1]}${esc(a.start_time)} - ${match[2]}`;
           else timeStr = `${esc(a.start_time)} - ${timeStr}`;
        }
        d.innerHTML = `<div><div class="dash-attack-name">${esc(a.structure_name)} ${esc(a.structure_level)}${badge}</div><div class="dash-attack-time">${timeStr} · ${a.players_count} players</div></div><div style="display:flex;align-items:center;gap:12px"><div class="dash-attack-val" style="text-align:right">${(a.total_demolition || 0).toLocaleString()}</div><button class="dash-del-btn" title="Delete Attack" onclick="event.stopPropagation(); window.deleteAttack('${a.id}')">✕</button></div>`;
        d.onclick = () => showModal('attack', a); al.appendChild(d);
      });
    });
  }

  const tb = $id('dashLeaderBody'); tb.innerHTML = '';
  
  const filteredLeader = psumWithRank.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase()));
  const toShow = filteredLeader.slice(0, leaderLimit);
  
  toShow.forEach(p => {
    const tr = document.createElement('tr'); tr.style.cursor = 'pointer';
    tr.innerHTML = `<td class="dash-rank">#${p.original_rank}</td><td class="dash-pname">${esc(p.name)}</td><td class="dash-val">${(p.total_demolition||0).toLocaleString()}</td><td style="text-align:center">${p.participation_count}</td><td class="dash-avg">${Math.round((p.total_demolition||0)/Math.max(p.participation_count,1)).toLocaleString()}</td>`;
    tr.onclick = () => showModal('player', p); tb.appendChild(tr);
  });
  
  if (filteredLeader.length > leaderLimit) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="text-align:center; padding: 1rem;"><button class="dash-btn" style="width:100%; justify-content:center" onclick="window.loadMoreLeaderboard()">Show More (25)</button></td>`;
    tb.appendChild(tr);
  }

  // --- Insights ---
  let activeAttacks = atts;
  const filterEl2 = $id('dashLeaderFilter');
  if (filterEl2 && filterEl2.value) {
    activeAttacks = atts.filter(a => a.id === filterEl2.value);
  }

  const $avgAttend = $id('dashAvgAttend');
  const $avgDemo = $id('dashAvgDemo');
  if ($avgAttend && $avgDemo) {
    let totalAttend = 0;
    let totalDemoObj = 0;
    activeAttacks.forEach(a => {
      totalAttend += (a.players || []).length;
      totalDemoObj += (a.total_demolition || 0);
    });
    const avgA = activeAttacks.length ? Math.round(totalAttend / activeAttacks.length) : 0;
    const avgD = totalAttend ? Math.round(totalDemoObj / totalAttend) : 0;
    $avgAttend.textContent = avgA.toLocaleString();
    $avgDemo.textContent = avgD >= 1000 ? (avgD/1000).toFixed(1) + 'k' : avgD.toLocaleString();
  }

  const partSpread = { high: 0, medium: 0, low: 0 };
  psum.forEach(p => {
    const pct = p.participation_count / atts.length;
    if (pct >= 0.5) partSpread.high++;
    else if (pct >= 0.25) partSpread.medium++;
    else partSpread.low++;
  });
  const totalP = partSpread.high + partSpread.medium + partSpread.low;
  const $pct = $id('dashInsightPartPct');
  if ($pct) $pct.textContent = totalP ? `${Math.round((partSpread.high/totalP)*100)}% Core` : '0%';
  const $pie = $id('dashPartChart');
  if ($pie) {
    if (totalP) {
      const highPct = Math.round((partSpread.high/totalP)*100);
      const medPct = Math.round((partSpread.medium/totalP)*100);
      const lowPct = Math.round((partSpread.low/totalP)*100);
      $pie.innerHTML = `
        <div style="display:flex;gap:4px;height:24px;border-radius:12px;overflow:hidden;margin-bottom:12px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.3)">
           <div style="width:${highPct}%;background:linear-gradient(90deg,#10b981,#34d399);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;color:#022c22;transition:width 0.5s" title="Core Active (${partSpread.high})">${highPct>10?highPct+'%':''}</div>
           <div style="width:${medPct}%;background:linear-gradient(90deg,#f59e0b,#fbbf24);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;color:#451a03;transition:width 0.5s" title="Casual (${partSpread.medium})">${medPct>10?medPct+'%':''}</div>
           <div style="width:${lowPct}%;background:linear-gradient(90deg,#ef4444,#f87171);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;color:#450a0a;transition:width 0.5s" title="Inactive (${partSpread.low})">${lowPct>10?lowPct+'%':''}</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:#cbd5e1;font-weight:700">
           <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981"></span> Core (${partSpread.high})</div>
           <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;box-shadow:0 0 6px #f59e0b"></span> Casual (${partSpread.medium})</div>
           <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444"></span> Missed (${partSpread.low})</div>
        </div>
      `;
    } else {
      $pie.innerHTML = '<div style="color:#64748b;font-size:0.8rem;text-align:center;padding:1rem 0">No data available</div>';
    }
  }
  const $trend = $id('dashTrendChart');
  if ($trend) {
    const dayMap = {};
    atts.forEach(a => {
      const day = a.game_time && a.game_time.includes(',') ? a.game_time.split(',')[0] : (a.game_time||'').split(' ')[0];
      if (!dayMap[day]) dayMap[day] = { targets: 0, demo: 0, participants: new Set() };
      dayMap[day].targets++;
      dayMap[day].demo += (a.total_demolition || 0);
      (a.players || []).forEach(p => dayMap[day].participants.add(p.name));
    });
    const days = Object.keys(dayMap).sort().slice(-7);
    const maxCount = Math.max(...days.map(d => dayMap[d].targets), 1);

    if (days.length === 0) {
      $trend.innerHTML = '<div style="color:#64748b;font-size:0.8rem;text-align:center;padding:2rem 0">No activity yet</div>';
    } else if (days.length === 1) {
      const d = dayMap[days[0]];
      const totalDemoStr = d.demo > 1e6 ? (d.demo/1e6).toFixed(1)+'M' : (d.demo/1000).toFixed(0)+'k';
      $trend.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;height:100%;align-items:center;text-align:center">
          <div style="display:flex;flex-direction:column;color:#3b82f6"><div style="font-size:1.8rem;font-weight:900;text-shadow:0 0 20px rgba(59,130,246,0.5)">${d.targets}</div><div style="font-size:0.7rem;color:#94a3b8;margin-top:4px;font-weight:700;text-transform:uppercase">Targets</div></div>
          <div style="display:flex;flex-direction:column;color:#10b981"><div style="font-size:1.8rem;font-weight:900;text-shadow:0 0 20px rgba(16,185,129,0.5)">${totalDemoStr}</div><div style="font-size:0.7rem;color:#94a3b8;margin-top:4px;font-weight:700;text-transform:uppercase">Demo</div></div>
          <div style="display:flex;flex-direction:column;color:#8b5cf6"><div style="font-size:1.8rem;font-weight:900;text-shadow:0 0 20px rgba(139,92,246,0.5)">${d.participants.size}</div><div style="font-size:0.7rem;color:#94a3b8;margin-top:4px;font-weight:700;text-transform:uppercase">Members</div></div>
        </div>
        <div style="text-align:center;font-size:0.7rem;color:#64748b;margin-top:8px;font-weight:600">Activity on ${days[0]}</div>
      `;
    } else {
      const w = 350; const h = 140;
      const padX = 30; const padY = 30;
      const usableW = w - padX*2; const usableH = h - padY*2;
      
      let pts = [];
      days.forEach((d, i) => {
         const x = padX + (i / (days.length - 1)) * usableW;
         const y = h - padY - (dayMap[d].targets / maxCount) * usableH;
         pts.push(`${x},${y}`);
      });
      
      const polyPts = `${padX},${h-padY} ${pts.join(' ')} ${padX + usableW},${h-padY}`;
      
      let svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="overflow:visible">`;
      svg += `<line x1="${padX}" y1="${padY}" x2="${w-padX}" y2="${padY}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>`;
      svg += `<line x1="${padX}" y1="${padY + usableH/2}" x2="${w-padX}" y2="${padY + usableH/2}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>`;
      svg += `<line x1="${padX}" y1="${h-padY}" x2="${w-padX}" y2="${h-padY}" stroke="rgba(255,255,255,0.15)"/>`;
      svg += `<defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(59,130,246,0.5)"/><stop offset="100%" stop-color="rgba(59,130,246,0)"/></linearGradient></defs>`;
      svg += `<polygon points="${polyPts}" fill="url(#trendGrad)"/>`;
      svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 4px 6px rgba(59,130,246,0.4))"/>`;
      
      days.forEach((d, i) => {
         const x = padX + (i / (days.length - 1)) * usableW;
         const y = h - padY - (dayMap[d].targets / maxCount) * usableH;
         svg += `<circle cx="${x}" cy="${y}" r="5" fill="#0b0f19" stroke="#60a5fa" stroke-width="2.5" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>`;
         svg += `<text x="${x}" y="${h-8}" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle" font-family="sans-serif">${d}</text>`;
      });
      svg += '</svg>';
      $trend.innerHTML = svg;
    }
  }
}

function showModal(type, data) {
  try {
    const m = $id('dashModal'), body = $id('dashModalBody');
    if (m && m.parentElement && m.parentElement.id !== 'ocrDashboardRoot_portal_inner') {
      const portal = document.createElement('div');
      portal.id = 'ocrDashModalPortal';
      const fakeRoot = document.createElement('div');
      fakeRoot.id = 'ocrDashboardRoot_portal_inner';
      // We will temporarily rename the CSS selectors in app.css to match both the real root and this inner portal class.
      // Actually, if we just use the ID 'ocrDashboardRoot', we'll have duplicate IDs, but that's fine for CSS matching.
      // Let's just use the exact duplicate ID to make 100% sure the CSS matches perfectly.
      fakeRoot.id = 'ocrDashboardRoot';
      fakeRoot.appendChild(m);
      portal.appendChild(fakeRoot);
      document.body.appendChild(portal);
    }
    window._modalDepth = (window._modalDepth || 0) + 1;
    document.body.style.overflow = 'hidden';
    $id('dashModalTitle').textContent = type === 'attack' ? data.structure_name + ' ' + (data.structure_level||'') : data.name;
    $id('dashModalSub').textContent = type === 'attack' ? `${displayGameTime(data.game_time)} · ${data.players_count} participants` : `${(data.total_demolition||0).toLocaleString()} total demolition`;
    if (type === 'attack') {
      const avg = Math.round(data.total_demolition / data.players_count);
      const tiers = { '1M+': 0, '500K+': 0, '100K+': 0, '<100K': 0 };
      data.players.forEach(p => {
        if (p.value >= 1000000) tiers['1M+']++;
        else if (p.value >= 500000) tiers['500K+']++;
        else if (p.value >= 100000) tiers['100K+']++;
        else tiers['<100K']++;
      });
      let h = '';
      if (!isGuest()) {
        h = `<div style="display:flex;gap:8px;margin-bottom:12px;justify-content:flex-end"><button class="dash-btn dash-btn-xs" style="background:var(--bg-card);border-color:var(--border)" onclick="window.addPlayer('${data.id}')">➕ Add Player</button><button class="dash-btn dash-btn-xs" style="background:var(--bg-card);border-color:var(--border)" onclick="window.editAttack('${data.id}')">✏️ Edit Details</button><button class="dash-btn dash-btn-xs" style="background:rgba(239,68,68,0.1);color:#ef4444;border-color:rgba(239,68,68,0.2)" onclick="window.deleteAttack('${data.id}')">🗑️ Delete</button></div>`;
      }
      h += `<div class="dash-modal-grid"><div class="dash-modal-stat"><div>Total Demolition</div><div style="color:#14b8a6;font-weight:700">${(data.total_demolition||0).toLocaleString()}</div></div><div class="dash-modal-stat"><div>Participants</div><div style="color:#3b82f6;font-weight:700">${data.players_count}</div></div><div class="dash-modal-stat"><div>Avg per Hit</div><div style="color:#f59e0b;font-weight:700">${(avg||0).toLocaleString()}</div></div><div class="dash-modal-stat"><div>Start Time</div><div style="color:#8b5cf6;font-weight:700;font-size:0.85rem">${data.start_time ? esc(data.start_time) : '---'}</div></div><div class="dash-modal-stat"><div>End Time</div><div style="color:#8b5cf6;font-weight:700;font-size:0.85rem">${displayGameTime(data.game_time)}</div></div><div class="dash-modal-stat"><div>Structure</div><div style="color:#14b8a6;font-weight:700;font-size:0.85rem">${esc(data.structure_name)} ${esc(data.structure_level||'')}</div></div></div>`;
      h += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Value Distribution</div><div class="dash-distrib">${Object.entries(tiers).filter(([k,v])=>v>0).map(([k,v]) => `<div class="dash-distrib-item"><span class="dash-distrib-bar" style="width:${(v/data.players_count)*100}%"></span><span class="dash-distrib-label">${k}</span><span class="dash-distrib-count">${v}</span></div>`).join('')}</div>`;
      h += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Player Breakdown</div><table class="dash-table"><thead><tr><th>#</th><th>Name</th><th style="text-align:right">Demolition</th>${!isGuest()?'<th style="width:30px"></th>':''}</tr></thead><tbody>`;
      data.players.forEach(p => {
        const encName = encodeURIComponent(p.name).replace(/'/g, "%27");
        h += `<tr style="cursor:pointer" onclick="window.showPlayer('${encName}')"><td class="dash-rank ${p.rank<=3?'rank-'+p.rank:''}">#${p.rank}</td><td class="dash-pname" style="color:var(--text-primary);text-decoration:underline;text-decoration-color:rgba(255,255,255,0.2)">${esc(p.name)}</td><td class="dash-val">${(p.value||p.val||0).toLocaleString()}</td>`;
        if (!isGuest()) {
          h += `<td style="text-align:right"><button class="dash-btn dash-btn-xs" style="padding:2px 6px; font-size:0.7rem; background:transparent" onclick="event.stopPropagation(); window.editPlayer('${data.id}', '${encName}')">✏️</button></td>`;
        }
        h += `</tr>`;
      });
      body.innerHTML = h + '</tbody></table>';
    } else {
      if (data._not_in_summary) {
        body.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);">
          <div style="font-size:2rem;margin-bottom:0.75rem;">👤</div>
          <div style="font-weight:700;font-size:0.95rem;color:var(--text-primary);margin-bottom:0.5rem;">${esc(data.name)}</div>
          <div style="font-size:0.82rem;">This player appeared in one attack but hasn't been fully aggregated yet.</div>
          <div style="font-size:0.75rem;margin-top:0.5rem;opacity:0.6;">Upload more screenshots or refresh the dashboard to see their full profile.</div>
        </div>`;
        m.classList.add('active');
        return;
      }
      const sortedAttacks = [...(data.attacks || [])].sort((a,b) => (b.game_time||'').localeCompare(a.game_time||''));
      const hrMap = {};
      for(let i=0; i<24; i++) hrMap[i] = 0;
      sortedAttacks.forEach(att => {
        let hr = null;
        if(att.start_time) {
          hr = parseInt(att.start_time.split(':')[0], 10);
        } else if(att.game_time) {
          const parts = att.game_time.split(', ');
          if(parts.length > 2) {
            hr = parseInt(parts[2].split(':')[0], 10);
          }
        }
        if (hr !== null && !isNaN(hr) && hr >= 0 && hr <= 23) hrMap[hr]++;
      });
      const hrs = Object.keys(hrMap).map(Number).sort((a,b)=>a-b);
      let chartHtml = '';
      if(hrs.some(h => hrMap[h] > 0)) {
        const maxHr = Math.max(...Object.values(hrMap), 1);
        chartHtml = `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:1rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Active Hours (Game Time)</div>
          <div style="display:flex;gap:2px;height:50px;align-items:flex-end;margin-bottom:0.5rem;background:rgba(0,0,0,0.1);padding:4px 4px 0 4px;border-radius:4px;border:1px solid var(--border)">
          ${hrs.map(hr => {
             const val = hrMap[hr];
             const pct = (val/maxHr)*100;
             const bg = val > 0 ? (pct>70?'#3b82f6':(pct>30?'#60a5fa':'#93c5fd')) : 'transparent';
             return `<div style="flex:1;background:${bg};height:${pct}%;min-height:${val>0?'4px':'0'};border-radius:2px 2px 0 0" title="${hr}:00 - ${hr}:59 GT (${val} hits)"></div>`;
          }).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--text-dim);margin-top:-4px;margin-bottom:12px;padding:0 2px">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
          </div>`;
      }

      const encPname = encodeURIComponent(data.name).replace(/'/g, "%27");
      let pb = `<div style="display:flex;gap:8px;margin-bottom:12px;justify-content:flex-end"><button class="dash-btn dash-btn-xs" style="background:var(--bg-card);border-color:var(--border)" onclick="window.exportPlayerReport('${encPname}')">📥 Export CSV Report</button></div>`;
      
      body.innerHTML = pb + `<div class="dash-modal-grid"><div class="dash-modal-stat"><div>Total Demolition</div><div style="color:#3b82f6;font-weight:700">${(data.total_demolition||0).toLocaleString()}</div></div><div class="dash-modal-stat"><div>Structures Hit</div><div style="color:#14b8a6;font-weight:700">${data.attacks?.length||0}</div></div><div class="dash-modal-stat"><div>Avg per Hit</div><div style="color:#f59e0b;font-weight:700">${data.attacks?.length ? Math.round((data.total_demolition||0)/data.attacks.length).toLocaleString() : '0'}</div></div></div>` + chartHtml + 
        '<table class="dash-table" style="margin-top:1rem"><thead><tr><th>Time</th><th>Target</th><th style="text-align:right">Value</th><th style="text-align:center">Rank</th></tr></thead><tbody>' + 
        sortedAttacks.map(att => `<tr style="cursor:pointer" onclick="window.showAttack('${att.id || att.attack_id}')"><td style="font-size:0.8rem">${displayGameTime(att.game_time)}</td><td style="color:var(--text-primary);text-decoration:underline;text-decoration-color:rgba(255,255,255,0.2)">${esc(att.name||att.structure_name||'')} ${esc(att.structure_level||'')}</td><td style="text-align:right">${(att.val||att.value||0).toLocaleString()}</td><td style="text-align:center">#${att.rank||'-'}</td></tr>`).join('') + 
        '</tbody></table>' +
        '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:1rem;text-align:center;font-style:italic">Buildings are typically attackable only on Sunday, Tuesday, Thursday (server schedule). Active times reflect participation on those days.</div>';
    }
    m.classList.add('active');

    if (!m._backdropListener) {
      m._backdropListener = (e) => {
        if (e.target === m) closeModal();
      };
      m.addEventListener('click', m._backdropListener);
    }
  } catch (err) {
    const m = $id('dashModal');
    if(m) {
      m.classList.add('active');
      $id('dashModalBody').innerHTML = `<div style="color:red;padding:2rem"><b>Error in showModal:</b><br>${err.stack||err}</div>`;
    }
    console.error('showModal Error:', err);
  }

  // Escape key to close
  if (!window._modalEscListener) {
    window._modalEscListener = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', window._modalEscListener);
  }
}

function closeModal() {
  $id('dashModal')?.classList.remove('active');
  window._modalDepth = Math.max(0, (window._modalDepth || 1) - 1);
  if (window._modalDepth === 0) {
    document.body.style.overflow = '';
    document.body.style.overflowY = '';
  }
}

// --- Durability Validation ---
const DURABILITY_TABLE = {
  gates:    { 1: 200000, 2: 400000, 3: 1200000, 4: 1500000, 5: 2000000 },
  cities:   { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000 },
  capital:  { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000, 6: 4500000, 7: 5000000 },
  capitol:  { 1: 1500000, 2: 2000000, 3: 3500000, 4: 3750000, 5: 4000000, 6: 4500000, 7: 5000000 },
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

async function processFiles(files) {
  if (_ocrProcessing) { log('OCR is already running. Please wait...', 'warn'); return; }
  _ocrProcessing = true; 
  const valid = Array.from(files).filter(f => /\.(png|jpe?g)$/i.test(f.name));
  if (!valid.length) { _ocrProcessing = false; return; }
  
  $id('dashProgress').classList.remove('hidden');
  log(`Preparing to scan ${valid.length} screenshots...`, 'info');
  
  const allJson = [];
  for (let i = 0; i < valid.length; i++) {
    const f = valid[i];
    $id('dashProgressText').textContent = `Scanning image ${i+1}/${valid.length}...`;
    const base64 = await new Promise(res => { 
      const r = new FileReader(); r.onload = e => res(e.target.result.split(',')[1]); r.readAsDataURL(f); 
    });
    
    try {
      const before = performance.now();
      let data = null;
      
      let localKey = localStorage.getItem('qwen_api_key');
      if (!localKey) {
        throw new Error('No API key provided. Please enter your API key in the top bar and click Confirm.');
      }
      
      const promptTxt = `You are an expert game data analyzer. Analyze this screenshot of an attack/demolition report.
Extract ALL visible player entries accurately.

RULES FOR EXTRACTION:
1. 'structure_name': the name of the attacked building (e.g. Capital, Stronghold, Temple, Gates, City, Town). This is usually located at the very top of the report in the header or title. Look carefully. Even if partially cut off or obscured, provide your best guess. Only return null if it is completely missing from the image.
2. 'structure_level': the integer level of the structure (e.g. "5" from "Lv.5"). Look closely at the header next to the structure name. Provide your best guess if partially obscured. Only return null if completely missing.
3. 'timestamp': the date/time shown, formatted strictly as 'YYYY-MM-DD HH:MM:SS'. If not visible, null.
4. 'start_time': the "Start Time" of the attack if clearly visible (e.g., "14:30"). If not visible, null.
5. 'players': an array of objects, each containing exactly two keys: 'name' and 'value'.
   - 'name' (string): Extract the player's FULL name exactly as written. INCLUDE any alliance tags (e.g., "[ABC]Player"), numbers, and special characters. Do NOT truncate or simplify.
   - 'value' (integer): Extract the Demolition damage score or points for the player. Remove any commas (e.g., convert "1,234,567" to 1234567). Only extract the demolition score, NOT troop counts or power levels.

CRITICAL JSON FORMATTING RULES:
- Output ONLY valid, raw JSON.
- Do NOT wrap the JSON in markdown blocks (no \`\`\`json).
- Do NOT include any commentary, explanations, or text outside the JSON object.

EXPECTED JSON SCHEMA:
{
  "structure_name": "Capital",
  "structure_level": "5",
  "timestamp": "2026-06-12 14:13:00",
  "start_time": "14:00",
  "players": [
    {"name": "[VTS]Lord_IKR", "value": 81357},
    {"name": "Gamer123", "value": 1500}
  ]
}`;

      let maxRetries = 3;
      let raw = null;
      let res = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          res = await fetch(QWEN_WORKER_URL, {
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
          raw = await res.json();
          if (!res.ok) throw new Error(raw.error?.message || `Qwen API Error (HTTP ${res.status})`);
          break; // Success, exit retry loop
        } catch (err) {
          if (attempt === maxRetries) throw err;
          log(`Rate limit or network error, retrying (${attempt}/${maxRetries})...`, 'warn', f.name);
          await new Promise(r => setTimeout(r, 2000 * attempt)); // backoff delay
        }
      }

      let text = raw.choices[0].message.content;
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      data = tryRepairJson(text);

      const elapsed = ((performance.now() - before) / 1000).toFixed(1);
      const pCount = data.players ? data.players.length : 0;
      if (pCount < 10) {
        log(`Warning: Only ${pCount} players found. Check extraction logic. Snippet: ${text.substring(0, 50)}...`, 'warn', f.name);
      }
      log(`Successfully read screenshot ${i+1}/${valid.length} — ${data.structure_name || '?'} ${data.structure_level || '?'}, found ${pCount} players.`, 'success', f.name);
      allJson.push({ filename: f.name, json: data });

      // Progressive save so the user doesn't lose data if browser is backgrounded/killed
      if (data) {
        const progressiveParsed = parseOcrResults([{ filename: f.name, json: data }]);
        if (progressiveParsed) {
          await saveData(progressiveParsed);
          render();
        }
      }
    } catch (e) {
      log(`Network error: ${e.message}`, 'err', f.name);
    }
    $id('dashProgressFill').style.width = `${((i+1)/valid.length)*100}%`;
  }
  
  if (!allJson.length) { log(`No valid data extracted.`, 'err'); _ocrProcessing = false; return; }
  
  log(`Analyzing and merging results...`, 'info');
  const parsed = parseOcrResults(allJson);
  
  if (parsed) {
    const mismatched = parsed.attacks.filter(att => {
      const val = validateTotalDemolition(att.structure_name, att.structure_level, att.total_demolition);
      return val && !val.match;
    });
    for (const att of mismatched) {
      const val = validateTotalDemolition(att.structure_name, att.structure_level, att.total_demolition);
      if (!val) continue;
      const shortfall = val.expected - att.total_demolition;
      const msg = `${att.structure_name} ${att.structure_level}: got ${(att.total_demolition||0).toLocaleString()} / expected ${val.expected.toLocaleString()} (missing ${shortfall.toLocaleString()}). All screenshots uploaded?`;
      log(`Confirm: ${msg}`, 'warn');
      if (confirm(`📊 ${msg}\n\nCancel = Missing data, wait for more uploads.\nOK = Ignore and save anyway.`)) {
        log(`User ignored missing data for ${att.structure_name} ${att.structure_level}.`, 'warn');
      } else {
        log(`Waiting for more uploads for ${att.structure_name} ${att.structure_level}.`, 'warn');
      }
    }
    saveData(parsed); render();
    log(`Success! ${parsed.attacks.length} sessions updated`, 'success');
    log(`Total players in leaderboard: ${parsed.players_summary.length}`, 'info');
    log(`Cloud sync status: ${getDb() ? 'active' : 'local-only'}`, 'info');
  } else log(`Failed to parse extracted reports.`, 'err');
  
  _ocrProcessing = false; setTimeout(() => $id('dashProgress').classList.add('hidden'), 2000);
}

function normalizeStructureName(name) {
  if (!name) return name;
  const corrections = { 'capita1': 'Capital', 'capitol': 'Capital', 'cates': 'Gates', 'gate5': 'Gates', 'cily': 'City', 'temp1e': 'Temple', 'tempi': 'Temple', 'strongho1d': 'Stronghold', 'ruln': 'Ruins', 'ruin5': 'Ruins', 'structure': 'Stronghold' };
  const lower = name.toLowerCase().trim();
  return corrections[lower] || name.trim();
}

function fmtDate(d) { const p = n => String(n).padStart(2, '0'); const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}, ${days[d.getDay()]}, ${p(d.getHours())}:${p(d.getMinutes())} GT`; }

function displayGameTime(gt) { 
  if (!gt) return '';
  const m = gt.match(/^(\d{4})-(\d{2})-(\d{2}),\s*(\d{2}:\d{2})$/);
  if (m) {
     const dt = new Date(+m[1], m[2]-1, +m[3]);
     const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
     return `${m[3]}/${m[2]}/${m[1]}, ${days[dt.getDay()]}, ${m[4]} GT`;
  }
  return gt.includes(',') ? gt : (gt.split(' ').slice(0,2).join(' ').replace(/-/g,'/') + ' GT'); 
}

function parseOcrResults(results) {
  const groups = [];
  for (const item of results) {
    const j = item.json;
    let dt = new Date();
    if (j.timestamp) {
       const m = j.timestamp.match(/(\d{4})[-./](\d{2})[-./](\d{2})\s+(\d{2})[-.:](\d{2})/);
       if (m) dt = new Date(+m[1], m[2]-1, +m[3], +m[4], +m[5]);
    }
    
    const sN = normalizeStructureName(j.structure_name) || null;
    let sL = j.structure_level ? String(j.structure_level).replace(/^(?:Lv|Level)\s*/i, '').trim() : null;
    if (sL) sL = 'Lv' + sL.replace(/[^0-9]/g, '');

    let start_time = j.start_time || null;
    
    let f = false;
    for (const g of groups) {
      const nameMatch = (!g.sN || !sN || getSimilarity(g.sN, sN) > 0.8);
      const levelMatch = (!g.sL || !sL || g.sL === sL);
      if (Math.abs(g.dt - dt) < 600000 && nameMatch && levelMatch) {
        if (j.players) g.players.push(...j.players);
        if (!g.sN && sN) g.sN = sN;
        if (!g.sL && sL) g.sL = sL;
        if (!g.start_time && start_time) g.start_time = start_time;
        f = true; break;
      }
    }
    if (!f) groups.push({ dt, sN, sL, start_time, players: j.players ? [...j.players] : [] });
  }
  
  log(`Grouped ${results.length} images into ${groups.length} session(s)`, 'info');
  
  const attacks = [];
  groups.forEach((g) => {
    let sN = g.sN || 'Structure';
    let sL = g.sL || 'Unknown';
    
    const pMap = new Map();
    g.players.forEach(p => {
      if (!p.name || !p.value) return;
      p.value = Number(p.value);
      const fuzzyMatch = [...pMap.values()].find(v => (getSimilarity(v.name, p.name) > 0.8 || getSimilarityAlphaNum(v.name, p.name) > 0.8) && Math.abs(v.value - p.value) <= 100);
      if (!fuzzyMatch) pMap.set(`${p.name}_${p.value}`, p);
      else if (pMap.get(`${fuzzyMatch.name}_${fuzzyMatch.value}`).value < p.value) {
         pMap.set(`${p.name}_${p.value}`, p);
         pMap.delete(`${fuzzyMatch.name}_${fuzzyMatch.value}`);
      }
    });
    
    const deduped = [...pMap.values()].sort((a,b) => b.value - a.value);
    deduped.forEach((p, rank) => p.rank = rank + 1);
    
    const id = `${sN.replace(/\s+/g,'_')}_${sL}_${g.dt.getTime()}`;
    if (deduped.length > 0) {
      attacks.push({
        id,
        game_time: displayGameTime(fmtDate(new Date(g.dt.getTime() + (g.dt.getTimezoneOffset() - 120) * 60000))),
        start_time: g.start_time || null,
        structure_name: sN,
        structure_level: sL,
        players: deduped,
        players_count: deduped.length,
        total_demolition: deduped.reduce((sum, p) => sum + p.value, 0)
      });
    }
  });
  
  const merged = dashData?.attacks ? Object.fromEntries(dashData.attacks.map(a => [a.id, a])) : {};
  attacks.forEach(a => {
    const ts = a.id.split('_').pop();
    const existing = Object.values(merged).find(x => x.id.split('_').pop() === ts);
    if (existing) {
       const pMap = new Map();
        existing.players.forEach(p => { p.value = Number(p.value); pMap.set(`${p.name}_${p.value}`, p); });
        a.players.forEach(p => {
          p.value = Number(p.value);
          const fuzzyMatch = [...pMap.values()].find(v => (getSimilarity(v.name, p.name) > 0.8 || getSimilarityAlphaNum(v.name, p.name) > 0.8) && Math.abs(v.value - p.value) <= 100);
         if (!fuzzyMatch) pMap.set(`${p.name}_${p.value}`, p);
       });
       existing.players = [...pMap.values()].sort((x,y) => y.value - x.value);
       existing.players.forEach((p,i) => p.rank = i+1);
       existing.players_count = existing.players.length;
       existing.total_demolition = existing.players.reduce((s,p) => s + p.value, 0);
       
       if (existing.structure_name.includes('Structure') && !a.structure_name.includes('Structure')) {
         existing.structure_name = a.structure_name;
         existing.structure_level = a.structure_level;
         const oldId = existing.id;
         existing.id = a.id;
         merged[a.id] = existing;
         delete merged[oldId];
       }
    } else {
       merged[a.id] = { ...a };
    }
  });
  
  const sorted = Object.values(merged).sort((a,b) => b.game_time.localeCompare(a.game_time));
  const sum = {}; sorted.forEach(a => {
    const seen = new Set();
    a.players.forEach(p => { 
      const n = findBestMatch(p.name); 
      if (!sum[n]) sum[n] = { name: n, total_demolition: 0, participation_count: 0, attacks: [], unique_structures: new Set() }; 
      sum[n].total_demolition += p.value; 
      if (!seen.has(n)) { sum[n].participation_count++; seen.add(n); sum[n].unique_structures.add((a.structure_name||'') + '_' + (a.structure_level||'')); }
      sum[n].attacks.push({ id: a.id, name: a.structure_name, structure_level: a.structure_level, game_time: a.game_time, val: p.value, rank: p.rank }); 
    });
  });
  
  return { last_updated: fmtDate(new Date()), total_attacks: sorted.length, attacks: sorted, players_summary: Object.values(sum).map(p => { p.unique_structures = p.unique_structures.size; return p; }).sort((a,b) => b.total_demolition - a.total_demolition) };
}

export async function bootOcrDashboard() {
  if (_booted) return; _booted = true; loadRoster();
  // Keep log panel always visible
  const logArea = $id('dashLogArea'); if (logArea) logArea.classList.remove('hidden');
  restoreLogs();
  log('VTS Admin Dashboard loaded.', 'info');
  if (isAuthed()) { showApp(); loadData(); } else { showLogin(); }
  $id('dashLoginBtn').onclick = doLogin;
  $id('dashGuestBtn').onclick = () => { sessionStorage.setItem('vts_guest', '1'); $id('dashLoginErr').classList.add('hidden'); showApp(); loadData(); };
  $id('dashRefreshBtn').onclick = () => { loadData(); render(); };
  $id('dashRosterBtn').onclick = showRosterModal;
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

  const apiInput = $id('dashApiKeyInput');
  const apiSaveBtn = $id('dashSaveApiBtn');
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
  $id('dashUploadBtn').onclick = () => inp.click();
  drop.onclick = () => inp.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('dragover'); };
  drop.ondragleave = () => drop.classList.remove('dragover');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('dragover'); if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files); };
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
