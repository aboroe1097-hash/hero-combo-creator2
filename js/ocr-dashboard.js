// --- Serverless OCR Dashboard ---
// OCR runs in the cloud via Netlify Functions + Gemini 1.5 Flash API.
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { doc, getDoc, setDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const STORAGE_KEY = 'vts_ocr_dashboard';
const AUTH_KEY = 'vts_ocr_auth';
const ROSTER_KEY = 'vts_ocr_roster';
const FS_PATH = 'vts_admin/dashboard_data';

let dashData = null;
let rosterNames = [];
let sortCol = 'total_demolition';
let sortDir = 'desc';
let searchQ = '';
let _booted = false;
let _ocrProcessing = false;
let _fsUnsub = null;

function $id(id) { return document.getElementById(id); }

// --- Logger ---
function log(msg, type = 'info', file = null) {
  const out = $id('dashLogOutput');
  const area = $id('dashLogArea');
  if (!out || !area) return;
  area.classList.remove('hidden');
  
  const div = document.createElement('div');
  div.className = 'log-entry';
  const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  let html = `<span class="log-time">[${time}]</span>`;
  if (file) html += `<span class="log-file">[${file}]</span>`;
  html += `<span class="log-msg log-${type}">${msg}</span>`;
  div.innerHTML = html;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

// --- Fuzzy Matching ---
function getSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  let longer = s1, shorter = s2;
  if (s1.length < s2.length) { longer = s2; shorter = s1; }
  if (longer.length === 0) return 1.0;
  return (longer.length - editDistance(longer, shorter)) / longer.length;
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
const AUTH_HASH = '8990c6d5e99971bf351720e72583f7ca5796e57ffb9de710ab05417da867f878';
const CLEAR_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

async function sha256(str) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) { return str === 'vtsadmin' ? CLEAR_HASH : 'insecure'; }
}

function isAuthed() { return sessionStorage.getItem(AUTH_KEY) === '1'; }
function showApp() { $id('dashLogin')?.classList.add('hidden'); $id('dashApp')?.classList.remove('hidden'); }
function showLogin() { $id('dashLogin')?.classList.remove('hidden'); $id('dashApp')?.classList.add('hidden'); }

async function doLogin() {
  const u = $id('dashLoginUser').value.trim(), p = $id('dashLoginPass').value, err = $id('dashLoginErr');
  const h = await sha256(u + ':' + p);
  if (h === AUTH_HASH) { sessionStorage.setItem(AUTH_KEY, '1'); err.classList.add('hidden'); showApp(); loadData(); }
  else { err.textContent = 'Invalid credentials'; err.classList.remove('hidden'); }
}

// --- Persistence ---
async function saveData(data) {
  dashData = data;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  try { 
    await ensureAnonymousAuth();
    await setDoc(doc(getDb(), FS_PATH), data); 
    log('Synced to cloud.', 'info'); 
  } catch (e) { 
    log('Cloud sync failed: ' + e.message, 'warn'); 
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
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dashData)); } catch (e) {}
      render();
    }
    _fsUnsub = onSnapshot(doc(db, FS_PATH), (snap) => {
      if (snap.exists()) {
        dashData = snap.data();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dashData)); } catch (e) {}
        render();
      }
    });
    log('Cloud sync active.', 'info');
  } catch (e) { log('Cloud sync unavailable: ' + e.message, 'warn'); }
}

async function clearData() {
  dashData = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  try { 
    await ensureAnonymousAuth();
    await setDoc(doc(getDb(), FS_PATH), {}); 
  } catch (e) {}
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
  html2canvas(chart.closest('.dash-card') || chart, { backgroundColor: '#0b0f19', scale: 2 }).then(c => { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'vts_top_performers.png'; a.click(); }).catch(() => {});
}
function exportAttackCsv() {
  if (!dashData?.attacks?.length) return;
  let csv = 'Date,Structure,Level,Player Name,Rank,Demolition Value\n';
  dashData.attacks.forEach(a => {
    const date = displayGameTime(a.game_time);
    (a.players||[]).forEach(p => { const safeName = p.name.replace(/"/g, '""'); csv += `"${date}","${a.structure_name}","${a.structure_level||''}","${safeName}",${p.rank},${p.value}\n`; });
  });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'vts_attack_details.csv'; a.click();
}
function importData(file) {
  const r = new FileReader(); r.onload = e => {
    try {
      const imp = JSON.parse(e.target.result); if (!imp.attacks) throw 'Invalid';
      const m = {}; (dashData?.attacks||[]).forEach(a => m[a.id]=a); (imp.attacks||[]).forEach(a => m[a.id]=a);
      const sorted = Object.values(m).sort((a,b) => b.game_time.localeCompare(a.game_time));
      const sum = {}; sorted.forEach(a => a.players.forEach(p => {
        const n = findBestMatch(p.name); if (!sum[n]) sum[n] = { name: n, total_demolition: 0, participation_count: 0, attacks: [] };
        sum[n].total_demolition += p.value; sum[n].participation_count++;
        sum[n].attacks.push({ attack_id: a.id, structure_name: a.structure_name, game_time: a.game_time, value: p.value, rank: p.rank });
      }));
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
  const atts = dashData.attacks || [], psum = dashData.players_summary || [];
  const total = atts.reduce((s, a) => s + (a.total_demolition || 0), 0);
  $id('dashKpiAttacks').textContent = atts.length;
  $id('dashKpiDemo').textContent = total > 1e6 ? (total/1e6).toFixed(1)+'M' : total.toLocaleString();
  $id('dashKpiPlayers').textContent = psum.length;
  $id('dashKpiMvp').textContent = psum[0]?.name || '---';
  
  const c = $id('dashChart'); c.innerHTML = '';
  const top = psum.slice(0, 10), max = top[0]?.total_demolition || 1;
  top.forEach((p, i) => {
    const w = document.createElement('div'); w.className = 'dash-top-item';
    w.innerHTML = `<div class="dash-top-bar" style="width:${(p.total_demolition/max)*100}%"></div><span class="dash-top-rank">#${i+1}</span><span class="dash-top-name">${esc(p.name)}</span><span class="dash-top-val">${(p.total_demolition/1000).toFixed(0)}k</span>`;
    w.onclick = () => showModal('player', p); c.appendChild(w);
  });

  const al = $id('dashAttackList'); al.innerHTML = '';
  atts.forEach(a => {
    const val = validateTotalDemolition(a.structure_name, a.structure_level, a.total_demolition);
    let badge = '';
    if (val) {
      badge = val.match
        ? `<span class="dash-val-badge dash-val-ok" title="✓ ${a.total_demolition.toLocaleString()} / ${val.expected.toLocaleString()}">✓</span>`
        : `<span class="dash-val-badge dash-val-warn" title="✗ ${a.total_demolition.toLocaleString()} vs ${val.expected.toLocaleString()} (${(val.pct*100).toFixed(1)}% off)">!</span>`;
    }
    const d = document.createElement('div'); d.className = 'dash-attack-item';
    d.innerHTML = `<div><div class="dash-attack-name">${esc(a.structure_name)} ${esc(a.structure_level)}${badge}</div><div class="dash-attack-time">${displayGameTime(a.game_time)} · ${a.players_count} players</div></div><div style="text-align:right"><div class="dash-attack-val">${a.total_demolition.toLocaleString()}</div></div>`;
    d.onclick = () => showModal('attack', a); al.appendChild(d);
  });

  const tb = $id('dashLeaderBody'); tb.innerHTML = '';
  psum.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase())).forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="dash-rank">#${i+1}</td><td class="dash-pname">${esc(p.name)}</td><td class="dash-val">${p.total_demolition.toLocaleString()}</td><td style="text-align:center">${p.participation_count}</td><td class="dash-avg">${Math.round(p.total_demolition/p.participation_count).toLocaleString()}</td>`;
    tr.onclick = () => showModal('player', p); tb.appendChild(tr);
  });

  // --- Insights ---
  const partSpread = { high: 0, medium: 0, low: 0 };
  psum.forEach(p => {
    const pct = p.participation_count / atts.length;
    if (pct >= 0.5) partSpread.high++;
    else if (pct >= 0.25) partSpread.medium++;
    else partSpread.low++;
  });
  const totalP = partSpread.high + partSpread.medium + partSpread.low;
  const $pct = $id('dashInsightPartPct');
  if ($pct) $pct.textContent = totalP ? `${Math.round((partSpread.high/totalP)*100)}% active` : '0%';
  const $pie = $id('dashPartChart');
  if ($pie) {
    if (totalP) {
      $pie.innerHTML = `<div class="dash-stack-bar"><div class="dash-stack-seg dash-stack-high" style="width:${(partSpread.high/totalP)*100}%" title="High (${partSpread.high})"></div><div class="dash-stack-seg dash-stack-med" style="width:${(partSpread.medium/totalP)*100}%" title="Medium (${partSpread.medium})"></div><div class="dash-stack-seg dash-stack-low" style="width:${(partSpread.low/totalP)*100}%" title="Low (${partSpread.low})"></div></div><div class="dash-stack-labels"><span>High 50%+</span><span>Med 25%+</span><span>Low</span></div>`;
    } else {
      $pie.innerHTML = '<div class="dash-stack-bar"><div class="dash-stack-seg dash-stack-low" style="width:100%"></div></div>';
    }
  }
  const $trend = $id('dashTrendChart');
  if ($trend) {
    const dayMap = {};
    atts.forEach(a => {
      const day = a.game_time && a.game_time.includes(',') ? a.game_time.split(',')[0] : (a.game_time||'').split(' ')[0];
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    const days = Object.keys(dayMap).sort().slice(-7);
    const maxCount = Math.max(...days.map(d => dayMap[d]), 1);
    $trend.innerHTML = '<div class="dash-trend-bars">' + days.map(d => `<div class="dash-trend-col"><div class="dash-trend-bar" style="height:${(dayMap[d]/maxCount)*100}%"></div><div class="dash-trend-label">${d.slice(-5)}</div></div>`).join('') + '</div>';
  }
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function showModal(type, data) {
  const m = $id('dashModal'), body = $id('dashModalBody');
  $id('dashModalTitle').textContent = type === 'attack' ? data.structure_name + ' ' + (data.structure_level||'') : data.name;
  $id('dashModalSub').textContent = type === 'attack' ? `${displayGameTime(data.game_time)} · ${data.players_count} participants` : `${data.total_demolition.toLocaleString()} total demolition`;
  if (type === 'attack') {
    const avg = Math.round(data.total_demolition / data.players_count);
    const tiers = { '1M+': 0, '500K+': 0, '100K+': 0, '<100K': 0 };
    data.players.forEach(p => {
      if (p.value >= 1000000) tiers['1M+']++;
      else if (p.value >= 500000) tiers['500K+']++;
      else if (p.value >= 100000) tiers['100K+']++;
      else tiers['<100K']++;
    });
    let h = `<div class="dash-modal-grid"><div class="dash-modal-stat"><div>Total Demolition</div><div style="color:#14b8a6;font-weight:700">${data.total_demolition.toLocaleString()}</div></div><div class="dash-modal-stat"><div>Participants</div><div style="color:#3b82f6;font-weight:700">${data.players_count}</div></div><div class="dash-modal-stat"><div>Avg per Hit</div><div style="color:#f59e0b;font-weight:700">${avg.toLocaleString()}</div></div><div class="dash-modal-stat"><div>Game Time</div><div style="color:#8b5cf6;font-weight:700;font-size:0.85rem">${displayGameTime(data.game_time)}</div></div><div class="dash-modal-stat"><div>Structure</div><div style="color:#14b8a6;font-weight:700;font-size:0.85rem">${esc(data.structure_name)} ${esc(data.structure_level||'')}</div></div></div>`;
    h += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Value Distribution</div><div class="dash-distrib">${Object.entries(tiers).filter(([k,v])=>v>0).map(([k,v]) => `<div class="dash-distrib-item"><span class="dash-distrib-bar" style="width:${(v/data.players_count)*100}%"></span><span class="dash-distrib-label">${k}</span><span class="dash-distrib-count">${v}</span></div>`).join('')}</div>`;
    h += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Player Breakdown</div><table class="dash-table"><thead><tr><th>#</th><th>Name</th><th style="text-align:right">Demolition</th></tr></thead><tbody>`;
    data.players.forEach(p => h += `<tr><td class="dash-rank ${p.rank<=3?'rank-'+p.rank:''}">#${p.rank}</td><td class="dash-pname">${esc(p.name)}</td><td class="dash-val">${p.value.toLocaleString()}</td></tr>`);
    body.innerHTML = h + '</tbody></table>';
  } else {
    body.innerHTML = `<div class="dash-modal-grid"><div class="dash-modal-stat"><div>Total Demolition</div><div style="color:#3b82f6;font-weight:700">${data.total_demolition.toLocaleString()}</div></div><div class="dash-modal-stat"><div>Structures Hit</div><div style="color:#14b8a6;font-weight:700">${data.attacks?.length||0}</div></div><div class="dash-modal-stat"><div>Avg per Hit</div><div style="color:#f59e0b;font-weight:700">${data.attacks?.length ? Math.round(data.total_demolition/data.attacks.length).toLocaleString() : '0'}</div></div></div>` + 
      '<table class="dash-table"><thead><tr><th>Structure</th><th style="text-align:right">Value</th><th style="text-align:center">Rank</th></tr></thead><tbody>' + data.attacks.map(att => `<tr><td>${esc(att.name)}</td><td style="text-align:right">${(att.val||0).toLocaleString()}</td><td style="text-align:center">#${att.rank||'-'}</td></tr>`).join('') + '</tbody></table>';
  }
  m.classList.add('active');
}

function closeModal() { $id('dashModal')?.classList.remove('active'); document.body.style.overflow = ''; }

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
async function processFiles(files) {
  if (_ocrProcessing) { log('OCR is already running. Please wait...', 'warn'); return; }
  _ocrProcessing = true; 
  const valid = Array.from(files).filter(f => /\.(png|jpe?g)$/i.test(f.name));
  if (!valid.length) { _ocrProcessing = false; return; }
  
  $id('dashProgress').classList.remove('hidden');
  log(`Starting Gemini API OCR on ${valid.length} files...`, 'info');
  
  const allJson = [];
  for (let i = 0; i < valid.length; i++) {
    const f = valid[i]; log(`Reading image data...`, 'info', f.name);
    const base64 = await new Promise(res => { 
      const r = new FileReader(); r.onload = e => res(e.target.result.split(',')[1]); r.readAsDataURL(f); 
    });
    
    log(`Sending to Gemini API...`, 'info', f.name);
    try {
      const before = performance.now();
      let data = null;
      let useLocalFallback = false;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      try {
        if (isLocalhost) throw new Error('Force fallback on localhost');
        const netlifyRes = await fetch('/.netlify/functions/gemini-ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 })
        });
         if (netlifyRes.status === 404 || netlifyRes.status === 405) {
            useLocalFallback = true;
         } else if (!netlifyRes.ok) {
            log(`Server function error (${netlifyRes.status})`, 'warn', f.name);
            const textResponse = await netlifyRes.text();
            try {
               const errData = JSON.parse(textResponse);
               log(`Server: ${errData.error}`, 'warn', f.name);
            } catch (e) {}
            useLocalFallback = true;
         } else {
            const textResponse = await netlifyRes.text();
            try {
              data = JSON.parse(textResponse);
            } catch(err) {
              if (textResponse.startsWith('<')) { log('Server returned HTML instead of JSON — function not deployed', 'warn', f.name); useLocalFallback = true; }
              else throw new Error('Invalid response from server');
            }
          }
      } catch (err) {
        useLocalFallback = true;
      }
      
      if (useLocalFallback) {
        let localKey = sessionStorage.getItem('gemini_dev_key');
        if (!localKey) {
          localKey = prompt('Serverless functions unavailable (Netlify not detected). Please paste your Gemini API key to run OCR locally in the browser:');
          if (localKey) sessionStorage.setItem('gemini_dev_key', localKey);
        }
        if (!localKey) throw new Error('No API key provided for local fallback.');
        
        log(`Using local client-side Gemini API fallback...`, 'info', f.name);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${localKey}`;
        const promptTxt = `Analyze this game screenshot containing an attack report.
Extract the following:
1. 'structure_name' (e.g. Capital, Stronghold, Temple, Gates, City. If not visible, null)
2. 'structure_level' (e.g. '5' for Lv.5. If not visible, null)
3. 'timestamp' (if visible, format as 'YYYY-MM-DD HH:MM:SS', otherwise null)
4. 'players': array of objects with 'name' (string) and 'value' (integer demolition score).

Return STRICTLY valid JSON ONLY. No markdown formatting, no \`\`\`json blocks. Just the raw JSON object.`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [ { text: promptTxt }, { inlineData: { mimeType: 'image/jpeg', data: base64 } } ] }]
          })
        });
        const raw = await res.json();
        if (!res.ok) throw new Error(raw.error?.message || 'Gemini API Error');
        let text = raw.candidates[0].content.parts[0].text;
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        data = JSON.parse(text);
      }

      const elapsed = ((performance.now() - before) / 1000).toFixed(1);
      const pCount = data.players ? data.players.length : 0;
      log(`Scan complete (${elapsed}s) — ${data.structure_name || '?'} ${data.structure_level || '?'}, ${pCount} players found.`, 'success', f.name);
      allJson.push({ filename: f.name, json: data });
    } catch (e) {
      log(`Network error: ${e.message}`, 'err', f.name);
    }
    $id('dashProgressFill').style.width = `${((i+1)/valid.length)*100}%`;
  }
  
  if (!allJson.length) { log(`No valid data extracted.`, 'err'); _ocrProcessing = false; return; }
  
  log(`Analyzing and merging results...`, 'info');
  const parsed = parseGeminiResults(allJson);
  
  if (parsed) {
    const mismatched = parsed.attacks.filter(att => {
      const val = validateTotalDemolition(att.structure_name, att.structure_level, att.total_demolition);
      return val && !val.match;
    });
    for (const att of mismatched) {
      const val = validateTotalDemolition(att.structure_name, att.structure_level, att.total_demolition);
      if (!val) continue;
      const shortfall = val.expected - att.total_demolition;
      const msg = `${att.structure_name} ${att.structure_level}: got ${att.total_demolition.toLocaleString()} / expected ${val.expected.toLocaleString()} (missing ${shortfall.toLocaleString()}). All screenshots uploaded?`;
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
  const corrections = { 'capita1': 'Capital', 'capitol': 'Capital', 'cates': 'Gates', 'gate5': 'Gates', 'cily': 'City', 'temp1e': 'Temple', 'tempi': 'Temple', 'strongho1d': 'Stronghold', 'ruln': 'Ruins', 'ruin5': 'Ruins' };
  const lower = name.toLowerCase().trim();
  return corrections[lower] || name.trim();
}

function fmtDate(d) { const p = n => String(n).padStart(2, '0'); const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}, ${days[d.getDay()]}, ${p(d.getHours())}:${p(d.getMinutes())} GT`; }

function displayGameTime(gt) { return gt && gt.includes(',') ? gt : (gt ? gt.split(' ').slice(0,2).join(' ').replace(/-/g,'/') + ' GT' : ''); }

function parseGeminiResults(results) {
  const groups = [];
  for (const item of results) {
    const j = item.json;
    let dt = new Date();
    if (j.timestamp) {
       const m = j.timestamp.match(/(\d{4})[-./](\d{2})[-./](\d{2})\s+(\d{2})[-.:](\d{2})/);
       if (m) dt = new Date(+m[1], m[2]-1, +m[3], +m[4], +m[5]);
    }
    
    const sN = normalizeStructureName(j.structure_name) || null;
    const sL = j.structure_level ? j.structure_level.replace(/[^0-9]/g, '') : null;
    
    let f = false;
    for (const g of groups) {
      if (Math.abs(g.dt - dt) < 600000 && (!g.sN || !sN || getSimilarity(g.sN, sN) > 0.8) && g.sL === sL) {
        if (j.players) g.players.push(...j.players);
        f = true; break;
      }
    }
    if (!f) groups.push({ dt, sN, sL, players: j.players ? [...j.players] : [] });
  }
  
  log(`Grouped ${results.length} images into ${groups.length} session(s)`, 'info');
  
  const attacks = [];
  groups.forEach((g) => {
    let sN = g.sN || 'Structure';
    let sL = g.sL || 'Unknown';
    
    const pMap = new Map();
    g.players.forEach(p => {
      if (!p.name || !p.value) return;
      const fuzzyMatch = [...pMap.values()].find(v => getSimilarity(v.name, p.name) > 0.8 && Math.abs(v.value - p.value) <= 100);
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
        game_time: displayGameTime(fmtDate(new Date(g.dt - 6*3600000))),
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
       existing.players.forEach(p => pMap.set(`${p.name}_${p.value}`, p));
       a.players.forEach(p => {
         const fuzzyMatch = [...pMap.values()].find(v => getSimilarity(v.name, p.name) > 0.8 && Math.abs(v.value - p.value) <= 100);
         if (!fuzzyMatch) pMap.set(`${p.name}_${p.value}`, p);
       });
       existing.players = [...pMap.values()].sort((x,y) => y.value - x.value);
       existing.players.forEach((p,i) => p.rank = i+1);
       existing.players_count = existing.players.length;
       existing.total_demolition = existing.players.reduce((s,p) => s + p.value, 0);
       
       if (existing.structure_name.includes('Structure') && !a.structure_name.includes('Structure')) {
         existing.structure_name = a.structure_name;
         existing.structure_level = a.structure_level;
       }
    } else {
       merged[a.id] = { ...a };
    }
  });
  
  const sorted = Object.values(merged).sort((a,b) => b.game_time.localeCompare(a.game_time));
  const sum = {}; sorted.forEach(a => a.players.forEach(p => { const n = findBestMatch(p.name); if (!sum[n]) sum[n] = { name: n, total_demolition: 0, participation_count: 0, attacks: [] }; sum[n].total_demolition += p.value; sum[n].participation_count++; sum[n].attacks.push({ id: a.id, name: a.structure_name, val: p.value, rank: p.rank }); }));
  
  return { last_updated: fmtDate(new Date()), total_attacks: sorted.length, attacks: sorted, players_summary: Object.values(sum).sort((a,b) => b.total_demolition - a.total_demolition) };
}

export async function bootOcrDashboard() {
  if (_booted) return; _booted = true; loadRoster();
  // Keep log panel always visible
  const logArea = $id('dashLogArea'); if (logArea) logArea.classList.remove('hidden');
  log('VTS Admin Dashboard loaded.', 'info');
  if (isAuthed()) { showApp(); loadData(); } else { showLogin(); }
  $id('dashLoginBtn').onclick = doLogin;
  $id('dashRefreshBtn').onclick = () => { loadData(); render(); };
  $id('dashRosterBtn').onclick = showRosterModal;
  const clearLogBtn = $id('dashClearLogBtn'); if (clearLogBtn) clearLogBtn.onclick = () => $id('dashLogOutput').innerHTML = '';
  
  $id('dashExportMenuBtn').onclick = (e) => { e.stopPropagation(); $id('dashExportMenu').classList.toggle('active'); };
  window.addEventListener('click', () => $id('dashExportMenu').classList.remove('active'));

  $id('dashExpCsv').onclick = exportToCsv;
  $id('dashExpAttackCsv').onclick = exportAttackCsv;
  $id('dashExpPdf').onclick = () => window.print();
  $id('dashExpPng').onclick = exportToPng;
  $id('dashExpJson').onclick = exportData;
  const chartBtn = $id('dashExportChartBtn'); if (chartBtn) chartBtn.onclick = exportChartPng;
  $id('dashImportBtn').onclick = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
    inp.onchange = () => { if (inp.files.length) importData(inp.files[0]); }; inp.click();
  };

  $id('dashClearDataBtn').onclick = async () => {
    const code = prompt('Enter admin override code:');
    if (!code) return;
    const h = await sha256(code);
    if (h === CLEAR_HASH) clearData(); else alert('Invalid code');
  };

  $id('dashModalClose').onclick = closeModal;
  $id('dashSearch').oninput = e => { searchQ = e.target.value; render(); };
  document.querySelectorAll('#ocrDashboardRoot th[data-sort]').forEach(th => th.onclick=()=>{ const c=th.dataset.sort; sortDir=sortCol===c?(sortDir==='desc'?'asc':'desc'):'desc'; sortCol=c; render(); });
  
  const zone = $id('dashUploadZone'), drop = $id('dashDropZone'), inp = $id('dashFileInput');
  zone.classList.remove('hidden'); // Restore old visibility
  $id('dashUploadBtn').onclick = () => inp.click();
  drop.onclick = () => inp.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('dragover'); };
  drop.ondragleave = () => drop.classList.remove('dragover');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('dragover'); if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files); };
  inp.onchange = () => { if (inp.files.length) processFiles(inp.files); };
}
