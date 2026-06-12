// --- Fully client-side OCR Dashboard ---
// No server needed. OCR runs in the browser via Tesseract.js.
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

function findBestMatch(name) {
  if (!rosterNames.length) return name;
  let best = name, maxSim = 0;
  for (const rn of rosterNames) {
    const sim = getSimilarity(name, rn);
    if (sim > maxSim) { maxSim = sim; best = rn; }
  }
  return maxSim > 0.82 ? best : name;
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
  body.innerHTML = `<textarea id="dashRosterInput" class="dash-input" style="height:300px;font-family:monospace;font-size:0.85rem">${localStorage.getItem(ROSTER_KEY)||''}</textarea>
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
function saveData(data) {
  dashData = data;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  try { setDoc(doc(getDb(), FS_PATH), data); log('Synced to cloud.', 'info'); } catch (e) { log('Cloud sync failed: ' + e.message, 'warn'); }
}

async function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { dashData = JSON.parse(saved); render(); }
  } catch {}
  try {
    const db = getDb();
    if (!db) { log('Firestore not available — using local storage only.', 'warn'); return; }
    if (_fsUnsub) _fsUnsub();
    const snap = await getDoc(doc(db, FS_PATH));
    if (snap.exists()) {
      dashData = snap.data();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dashData)); } catch {}
      render();
    }
    _fsUnsub = onSnapshot(doc(db, FS_PATH), (snap) => {
      if (snap.exists()) {
        dashData = snap.data();
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dashData)); } catch {}
        render();
      }
    });
    log('Cloud sync active.', 'info');
  } catch (e) { log('Cloud sync unavailable: ' + e.message, 'warn'); }
}

function clearData() {
  dashData = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  try { setDoc(doc(getDb(), FS_PATH), {}); } catch {}
  render();
  log('Database wiped.', 'warn');
}

// --- Exports ---
function exportData() { if (!dashData) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(dashData, null, 2)], { type: 'application/json' })); a.download = 'vts_admin_data.json'; a.click(); }
function exportToCsv() {
  if (!dashData?.players_summary) return;
  let csv = 'Rank,Member Name,Total Demolition,Hits,Avg per Hit\n';
  dashData.players_summary.forEach((p, i) => csv += `${i + 1},"${p.name}",${p.total_demolition},${p.participation_count},${Math.round(p.total_demolition/p.participation_count)}\n`);
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
    (a.players||[]).forEach(p => csv += `"${date}","${a.structure_name}","${a.structure_level||''}","${p.name}",${p.rank},${p.value}\n`);
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
    w.innerHTML = `<div class="dash-top-bar" style="width:${(p.total_demolition/max)*100}%"></div><span class="dash-top-rank">#${i+1}</span><span class="dash-top-name">${p.name}</span><span class="dash-top-val">${(p.total_demolition/1000).toFixed(0)}k</span>`;
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
    d.innerHTML = `<div><div class="dash-attack-name">${a.structure_name} ${a.structure_level}${badge}</div><div class="dash-attack-time">${displayGameTime(a.game_time)} · ${a.players_count} players</div></div><div style="text-align:right"><div class="dash-attack-val">${a.total_demolition.toLocaleString()}</div></div>`;
    d.onclick = () => showModal('attack', a); al.appendChild(d);
  });

  const tb = $id('dashLeaderBody'); tb.innerHTML = '';
  psum.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase())).forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="dash-rank">#${i+1}</td><td class="dash-pname">${p.name}</td><td class="dash-val">${p.total_demolition.toLocaleString()}</td><td style="text-align:center">${p.participation_count}</td><td class="dash-avg">${Math.round(p.total_demolition/p.participation_count).toLocaleString()}</td>`;
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
    let h = `<div class="dash-modal-grid"><div class="dash-modal-stat"><div>Total Demolition</div><div style="color:#14b8a6;font-weight:700">${data.total_demolition.toLocaleString()}</div></div><div class="dash-modal-stat"><div>Participants</div><div style="color:#3b82f6;font-weight:700">${data.players_count}</div></div><div class="dash-modal-stat"><div>Avg per Hit</div><div style="color:#f59e0b;font-weight:700">${avg.toLocaleString()}</div></div><div class="dash-modal-stat"><div>Game Time</div><div style="color:#8b5cf6;font-weight:700;font-size:0.85rem">${displayGameTime(data.game_time)}</div></div><div class="dash-modal-stat"><div>Structure</div><div style="color:#14b8a6;font-weight:700;font-size:0.85rem">${data.structure_name} ${data.structure_level||''}</div></div></div>`;
    h += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Value Distribution</div><div class="dash-distrib">${Object.entries(tiers).filter(([k,v])=>v>0).map(([k,v]) => `<div class="dash-distrib-item"><span class="dash-distrib-bar" style="width:${(v/data.players_count)*100}%"></span><span class="dash-distrib-label">${k}</span><span class="dash-distrib-count">${v}</span></div>`).join('')}</div>`;
    h += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Player Breakdown</div><table class="dash-table"><thead><tr><th>#</th><th>Name</th><th style="text-align:right">Demolition</th></tr></thead><tbody>`;
    data.players.forEach(p => h += `<tr><td class="dash-rank ${p.rank<=3?'rank-'+p.rank:''}">#${p.rank}</td><td class="dash-pname">${p.name}</td><td class="dash-val">${p.value.toLocaleString()}</td></tr>`);
    body.innerHTML = h + '</tbody></table>';
  } else {
    body.innerHTML = `<div class="dash-modal-grid"><div class="dash-modal-stat"><div>Total Demolition</div><div style="color:#3b82f6;font-weight:700">${data.total_demolition.toLocaleString()}</div></div><div class="dash-modal-stat"><div>Structures Hit</div><div style="color:#14b8a6;font-weight:700">${data.attacks?.length||0}</div></div><div class="dash-modal-stat"><div>Avg per Hit</div><div style="color:#f59e0b;font-weight:700">${data.attacks?.length ? Math.round(data.total_demolition/data.attacks.length).toLocaleString() : '0'}</div></div></div>` + 
      '<table class="dash-table"><thead><tr><th>Structure</th><th style="text-align:right">Value</th><th style="text-align:center">Rank</th></tr></thead><tbody>' + data.attacks.map(att => `<tr><td>${att.name}</td><td style="text-align:right">${(att.val||0).toLocaleString()}</td><td style="text-align:center">#${att.rank||'-'}</td></tr>`).join('') + '</tbody></table>';
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
  if (typeof Tesseract === 'undefined') return;
  _ocrProcessing = true; const valid = Array.from(files).filter(f => /\.(png|jpe?g)$/i.test(f.name));
  if (!valid.length) return;
  $id('dashProgress').classList.remove('hidden');
  log(`Starting OCR on ${valid.length} files...`, 'info');
  const worker = await Tesseract.createWorker('eng', 1);
  await worker.setParameters({ tessedit_pageseg_mode: '6' });
  
  const allTexts = [];
  for (let i = 0; i < valid.length; i++) {
    const f = valid[i]; log(`Reading image data...`, 'info', f.name);
    const img = await new Promise(res => { const r = new FileReader(); r.onload = e => { const im = new Image(); im.onload = () => res(im); im.src = e.target.result; }; r.readAsDataURL(f); });
    const cv = document.createElement('canvas'), sc = 2.0; cv.width = img.width*sc; cv.height = img.height*sc;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const idat = ctx.getImageData(0,0,cv.width,cv.height), d = idat.data;
    for (let j=0; j<d.length; j+=4) {
      const r = d[j], gn = d[j+1], b = d[j+2];
      const isGold = r > 160 && gn > 100 && b < 80 && (r - b) > 80;
      const lum = 0.299*r + 0.587*gn + 0.114*b;
      const out = isGold ? 0 : (lum > 150 ? 255 : lum < 80 ? 0 : 255);
      d[j]=d[j+1]=d[j+2]=out;
    }
    ctx.putImageData(idat,0,0);
    log(`Running high-precision scan...`, 'info', f.name);
    const before = performance.now();
    const { data: { text, words } } = await worker.recognize(cv);
    const elapsed = ((performance.now() - before) / 1000).toFixed(1);
    const format = /MVP/i.test(text) ? 'paragraph' : /occupied/i.test(text) ? 'table+header' : 'table';
    const dt = extractDt(text);
    const sN = extractStructureName(text);
    log(`Scan complete (${elapsed}s, ${words.length} words) — ${format} format, ${sN || '?'}`, 'info', f.name);
    log(`Timestamp ${dt ? fmtDate(dt) : 'not found'}`, 'info', f.name);
    allTexts.push({ filename: f.name, text, words: words.map(w => ({...w, bbox: { x0: w.bbox.x0/sc, y0: w.bbox.y0/sc, x1: w.bbox.x1/sc, y1: w.bbox.y1/sc } })), _w: img.width, _h: img.height });
    $id('dashProgressFill').style.width = `${((i+1)/valid.length)*100}%`;
  }
  
  log(`Analyzing and merging results...`, 'info');
  const validated = allTexts.filter(r => {
    const textLower = r.text.toLowerCase();
    const hasIsabella = textLower.includes('isabella');
    const hasOccupied = textLower.includes('occupied');
    const hasMVP = /mvp|demolition\s+value/i.test(r.text);
    const hasRankValue = /[\d,]{4,}/.test(r.text);
    if (!hasIsabella && !hasOccupied && !hasMVP && !hasRankValue) {
      log(`Skipped — no report pattern detected`, 'warn', r.filename);
      return false;
    }
    return true;
  });
  if (!validated.length) { log(`No valid occupation reports found among uploaded images.`, 'err'); await worker.terminate(); _ocrProcessing = false; return; }
  if (validated.length < allTexts.length) log(`${allTexts.length - validated.length} image(s) skipped (not a report screenshot).`, 'warn');
  let parsed = parseOcrResults(validated);
  if (parsed) {
    const reRunIndices = [];
    for (let ai = 0; ai < parsed.attacks.length; ai++) {
      const att = parsed.attacks[ai];
      const val = validateTotalDemolition(att.structure_name, att.structure_level, att.total_demolition);
      if (val) {
        if (val.match) {
          log(`Durability: ${att.structure_name} ${att.structure_level} ✓ ${att.total_demolition.toLocaleString()} (expected ${val.expected.toLocaleString()})`, 'success');
        } else {
          log(`Durability: ${att.structure_name} ${att.structure_level} ✗ ${att.total_demolition.toLocaleString()} vs expected ${val.expected.toLocaleString()} (${(val.pct*100).toFixed(1)}% off)`, 'warn');
          const ts = parseInt(att.id.split('_').pop());
          validated.forEach(r => {
            const dt = extractDt(r.text);
            if (dt && Math.abs(dt.getTime() - ts) < 600000) {
              const fi = valid.findIndex(v => v.name === r.filename);
              if (fi >= 0 && !reRunIndices.includes(fi)) reRunIndices.push(fi);
            }
          });
        }
      }
    }
    if (reRunIndices.length) {
      log(`Re-running enhanced OCR on ${reRunIndices.length} image(s) from mismatched session(s)...`, 'warn');
      const hpWorker = await Tesseract.createWorker('eng', 1);
      await hpWorker.setParameters({ tessedit_pageseg_mode: '3' });
      for (const fi of reRunIndices) {
        const f = valid[fi];
        log(`Enhanced precision scan...`, 'info', f.name);
        const img = await new Promise(res => { const r = new FileReader(); r.onload = e => { const im = new Image(); im.onload = () => res(im); im.src = e.target.result; }; r.readAsDataURL(f); });
        const cv = document.createElement('canvas'), sc = 3.0;
        cv.width = img.width * sc; cv.height = img.height * sc;
        const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const idat = ctx.getImageData(0,0,cv.width,cv.height), d = idat.data;
        for (let j=0; j<d.length; j+=4) {
          const r = d[j], gn = d[j+1], b = d[j+2];
          const isGold = r > 160 && gn > 100 && b < 80 && (r - b) > 80;
          const lum = 0.299*r + 0.587*gn + 0.114*b;
          const out = isGold ? 0 : (lum > 150 ? 255 : lum < 80 ? 0 : lum);
          d[j]=d[j+1]=d[j+2]=out;
        }
        ctx.putImageData(idat,0,0);
        const { data: { text, words } } = await hpWorker.recognize(cv);
        const oldEntry = allTexts.find(t => t.filename === f.name);
        const wordDelta = words.length - (oldEntry?.words?.length || 0);
        log(`Enhanced scan: ${words.length} words (${wordDelta >= 0 ? '+' : ''}${wordDelta} vs initial)`, 'info', f.name);
        const vi = validated.findIndex(r => r.filename === f.name);
        if (vi >= 0) {
          validated[vi] = { ...validated[vi], text, words: words.map(w => ({...w, bbox: { x0: w.bbox.x0/sc, y0: w.bbox.y0/sc, x1: w.bbox.x1/sc, y1: w.bbox.y1/sc } })) };
        }
      }
      log(`Re-analyzing with corrected OCR data...`, 'info');
      parsed = parseOcrResults(validated);
      await hpWorker.terminate();
      if (parsed) {
        parsed.attacks.forEach(att => {
          const val = validateTotalDemolition(att.structure_name, att.structure_level, att.total_demolition);
          if (val) {
            if (val.match) log(`Durability after correction: ${att.structure_name} ${att.structure_level} ✓ ${att.total_demolition.toLocaleString()}`, 'success');
            else log(`Durability after correction: ${att.structure_name} ${att.structure_level} still ${(val.pct*100).toFixed(1)}% off`, 'warn');
          }
        });
      }
    }
    // Ask user about mismatched attacks to distinguish OCR error vs missing upload
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
      if (confirm(`📊 ${msg}\n\nCancel = OCR couldn't read everything.\nOK = missing data, upload remaining screenshots.`)) {
        log(`User indicated missing uploads for ${att.structure_name} ${att.structure_level} — upload remaining screenshots after this.`, 'warn');
      } else {
        log(`User confirmed all uploads done — OCR limitation on ${att.structure_name} ${att.structure_level}.`, 'warn');
      }
    }
    saveData(parsed); render();
    log(`Success! ${parsed.attacks.length} sessions updated`, 'success');
    log(`Total players in leaderboard: ${parsed.players_summary.length}`, 'info');
    log(`Cloud sync status: ${getDb() ? 'active' : 'local-only'}`, 'info');
  } else log(`Failed to identify valid reports.`, 'err');
  
  await worker.terminate(); _ocrProcessing = false; setTimeout(() => $id('dashProgress').classList.add('hidden'), 2000);
}

function extractStructureName(text) {
  const m = text.match(/occupied\s+the\s+(.+?)\s+(Lv\.?\s*\d+|Level\s+\d+)/i) || text.match(/([A-Z][A-Za-z\s'-]{2,30})\s+(Lv\.?\s*\d+|Level\s+\d+)/i);
  if (m) return m[1].trim();
  const ruM = text.match(/(\w+)\s+Occupation\s+Notice/i);
  if (ruM) return ruM[1];
  return null;
}

function extractStructureLevel(text) {
  const m = text.match(/Lv\.?\s*(\d+)/i);
  return m ? m[1] : null;
}

function parseOcrResults(results) {
  const withMeta = results.map(r => ({ dt: extractDt(r.text) || new Date(), sN: extractStructureName(r.text), sL: extractStructureLevel(r.text), r })).sort((a,b) => a.dt - b.dt);
  const groups = [];
  for (const item of withMeta) {
    let f = false;
    for (const g of groups) { if (Math.abs(g.dt - item.dt) < 30000 && g.sN === item.sN && g.sL === item.sL) { g.results.push(item.r); f = true; break; } }
    if (!f) groups.push({ dt: item.dt, sN: item.sN, sL: item.sL, results: [item.r] });
  }
  log(`Grouped ${results.length} images into ${groups.length} session(s)`, 'info');
  groups.forEach((g, i) => log(`Group ${i+1}: ${g.results.length} image(s), time=${fmtDate(g.dt)}, structure=${g.sN || '?'}${g.sL ? ' Lv.'+g.sL : ''}`, 'info'));
  const attacks = [];
  for (const g of groups) {
    const txt = g.results.map(r => r.text).join('\n');
    if (isParagraphFormat(txt)) {
      const att = parseParagraphFormat(txt);
      if (att) { log(`Paragraph format: ${att.structure_name} ${att.structure_level}, ${att.players_count} players`, 'info'); attacks.push(att); }
      continue;
    }
    let sN = 'Structure', sL = 'Unknown';
    const m = txt.match(/occupied\s+the\s+(.+?)\s+(Lv\.?\s*\d+|Level\s+\d+)/i) || txt.match(/([A-Z][A-Za-z\s'-]{2,30})\s+(Lv\.?\s*\d+|Level\s+\d+)/i);
    if (m) { sN = m[1].trim(); sL = m[2].trim(); }
    else {
      for (const r of g.results) {
        const m2 = r.text.match(/occupied\s+the\s+(.+?)\s+(Lv\.?\s*\d+|Level\s+\d+)/i) || r.text.match(/([A-Z][A-Za-z\s'-]{2,30})\s+(Lv\.?\s*\d+|Level\s+\d+)/i);
        if (m2) { sN = m2[1].trim(); sL = m2[2].trim(); log(`Structure name found in individual image: ${sN} ${sL}`, 'info'); break; }
      }
    }
    const allRaw = []; g.results.forEach(r => allRaw.push(...parseImagePlayers(r)));
    const byV = {}; allRaw.forEach(p => { if (!byV[p.value]) byV[p.value] = []; byV[p.value].push(p); });
    const players = [];
    for (const v in byV) {
      const rows = byV[v]; if (rows.length === 1) { players.push(rows[0]); continue; }
      const sgs = []; rows.forEach(r => { let f=false; sgs.forEach(sg => { if (getSimilarity(r.name, sg[0].name) > 0.55) { sg.push(r); f=true; } }); if(!f) sgs.push([r]); });
      sgs.forEach(sg => { sg.sort((a,b) => (rosterNames.includes(a.name)?-1:1) || b.name.length - a.name.length); players.push(sg[0]); });
    }
    if (players.length) {
      players.sort((a,b) => b.value - a.value).forEach((p,i) => p.rank = i+1);
      const ts = g.dt.getTime();
      if (sN === 'Structure' && dashData) {
        const existing = dashData.attacks.find(a => { const p = a.id.split('_'); return p[p.length-1] === String(ts); });
        if (existing) { sN = existing.structure_name; sL = existing.structure_level; log(`Inherited structure from existing session: ${sN} ${sL}`, 'info'); }
      }
      log(`Table format: ${sN} ${sL}, ${players.length} players, total=${players.reduce((s,p)=>s+p.value,0).toLocaleString()}`, 'info');
      attacks.push({ id: `${sN}_${sL}_${ts}`, structure_name: sN, structure_level: sL, game_time: fmtDate(new Date(g.dt - 6*3600000)), players_count: players.length, total_demolition: players.reduce((s,p)=>s+p.value,0), players });
    }
  }
  if (!attacks.length) return null;
  const merged = {};
  const mergePlayers = (target, src) => {
    const pMap = {};
    target.players.forEach(p => pMap[p.value] = p);
    src.players.forEach(p => { if (!pMap[p.value]) pMap[p.value] = p; });
    target.players = Object.values(pMap).sort((x,y) => y.value - x.value);
    target.players.forEach((p,i) => p.rank = i+1);
    target.players_count = target.players.length;
    target.total_demolition = target.players.reduce((s,p) => s + p.value, 0);
  };
  [...((dashData && dashData.attacks) || []), ...attacks].forEach(a => {
    const ts = a.id.split('_').pop();
    if (merged[a.id]) { mergePlayers(merged[a.id], a); log(`Merged players into same-ID attack ${a.id}`, 'info'); return; }
    const existing = Object.values(merged).find(x => x.id.split('_').pop() === ts);
    if (existing) {
      mergePlayers(existing, a);
      const mergedFrom = `${existing.structure_name} ${existing.structure_level}`;
      const mergedInto = `${a.structure_name} ${a.structure_level}`;
      if (existing.structure_name === 'Structure' && a.structure_name !== 'Structure') {
        existing.structure_name = a.structure_name;
        existing.structure_level = a.structure_level;
        existing.id = a.id;
        log(`Structure fix: "${mergedFrom}" → "${a.structure_name} ${a.structure_level}" (real name from split upload)`, 'info');
      } else {
        log(`Merged split upload into ${existing.structure_name} ${existing.structure_level} (${existing.players_count} players)`, 'info');
      }
      return;
    }
    merged[a.id] = { ...a };
  });
  const sorted = Object.values(merged).sort((a,b) => b.game_time.localeCompare(a.game_time));
  const sum = {}; sorted.forEach(a => a.players.forEach(p => { const n = findBestMatch(p.name); if (!sum[n]) sum[n] = { name: n, total_demolition: 0, participation_count: 0, attacks: [] }; sum[n].total_demolition += p.value; sum[n].participation_count++; sum[n].attacks.push({ id: a.id, name: a.structure_name, val: p.value, rank: p.rank }); }));
  log(`Final: ${sorted.length} attack(s), ${Object.values(sum).length} unique player(s)`, 'info');
  return { last_updated: fmtDate(new Date()), total_attacks: sorted.length, attacks: sorted, players_summary: Object.values(sum).sort((a,b) => b.total_demolition - a.total_demolition) };
}

function parseImagePlayers(r) {
  const words = r.words || [], body = words.filter(w => { const yc = ((w.bbox.y0 + w.bbox.y1)/2)/r._h; return yc >= 0.04 && yc <= 0.96; });
  if (body.length < 5) return [];
  body.sort((a,b) => (a.bbox.y0 + a.bbox.y1)/2 - (b.bbox.y0 + b.bbox.y1)/2);
  const rowThresh = r._h * 0.035; const rows = []; let cur = []; body.forEach(w => { if (!cur.length || Math.abs((w.bbox.y0+w.bbox.y1)/2 - (cur[0].bbox.y0+cur[0].bbox.y1)/2) < rowThresh) cur.push(w); else { rows.push(cur); cur = [w]; } }); if (cur.length) rows.push(cur);
  const ps = []; rows.forEach(row => {
    row.sort((a,b) => a.bbox.x0 - b.bbox.x0);
    const rowText = row.map(w => w.text).join(' ').toLowerCase();
    const hasDigitRank = row.some(w => (w.bbox.x0+w.bbox.x1)/2/r._w < 0.16 && /\d/.test(w.text)) || /\d{2,}/.test(rowText);
    const hasHeaderKeywords = /member|participant|ranking|congratulation|total|demolition|value|more|collapse|occupied|notice|isabella|occupation|alliance|guild|enjoy/i.test(rowText);
    if (!hasDigitRank && hasHeaderKeywords) return;
    let nP = [], vT = ''; row.forEach(w => { const xc = (w.bbox.x0+w.bbox.x1)/2/r._w; if (xc > 0.65) vT += w.text; else if (xc > 0.16) nP.push(w.text); });
    let name = nP.join(' ').replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim().replace(/\s+members$/i, '').trim();
    const val = parseValueFromDigits(vT);
    if (name && name.length > 1 && val !== null && val > 0) ps.push({ name, value: val });
  });
  if (ps.length < 3) return ps;
  const medianVal = ps.map(p => p.value).sort((a,b) => a-b)[Math.floor(ps.length/2)];
  return ps.filter(p => p.value > medianVal * 0.001);
}

function parseValueFromDigits(t) {
  const cleaned = t.replace(/[,.]/g, '');
  const m = cleaned.match(/\d{3,8}$/);
  return m && m[0].length >= 4 ? parseInt(m[0]) : null;
}

function fmtDate(d) { const p = n => String(n).padStart(2, '0'); const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}, ${days[d.getDay()]}, ${p(d.getHours())}:${p(d.getMinutes())} GT`; }
function displayGameTime(gt) { return gt && gt.includes(',') ? gt : (gt ? gt.split(' ').slice(0,2).join(' ').replace(/-/g,'/') + ' GT' : ''); }
function extractDt(t) {
  let m = t.match(/(\d{4})[-./](\d{2})[-./](\d{2})\s+(\d{2})[-.:](\d{2})[-.:](\d{2})/);
  if (m) try { return new Date(+m[1], m[2]-1, +m[3], +m[4], +m[5], +m[6]); } catch {}
  m = t.match(/(\d{4})[-./](\d{2})[-./](\d{2})\s+(\d{2})[.:](\d{2})/);
  if (m) try { return new Date(+m[1], m[2]-1, +m[3], +m[4], +m[5]); } catch {}
  return null;
}

function isParagraphFormat(t) { return /MVP\s+and\s+total\s+Demolition\s+Value/i.test(t); }

function parseParagraphFormat(text) {
  const normalized = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  let sN = 'Ruins', sL = '1';
  const ruM = normalized.match(/(\w+)\s+Occupation\s+Notice/i);
  if (ruM) { sN = ruM[1]; const lM = normalized.match(/Lv\.?\s*(\d+)/i); if (lM) sL = lM[1]; }
  else {
    const occM = normalized.match(/occupied\s+the\s+(.+?)\s+(Lv\.?\s*\d+|Level\s+\d+)/i);
    if (occM) { sN = occM[1].trim(); sL = occM[2].trim(); }
  }

  const mvpM = normalized.match(/MVP\s+and\s+total\s+Demolition\s+Value:\s*(.*?)(?=\s*Participants\s|$)/i);
  const partM = normalized.match(/Participants\s+and\s+total\s+Demolition\s+Value:\s*(.*?)$/i);

  const seen = new Map();
  for (const section of [mvpM?.[1], partM?.[1]]) {
    if (!section) continue;
    const values = []; const vr = /(\d{4,6})(?!\d)/g; let vm;
    while ((vm = vr.exec(section)) !== null) values.push({ v: +vm[1], i: vm.index });
    if (values.length < 1) continue;
    const highVals = values.filter(x => x.v >= 10000);
    const use = highVals.length >= 3 ? highVals : values;
    for (let i = 0; i < use.length; i++) {
      const start = i === 0 ? 0 : use[i-1].i + String(use[i-1].v).length;
      const end = use[i].i;
      let name = section.slice(start, end).replace(/^['"`~\s*@#.\-,:;&|()!\[\]{}<>\/\\+=\^%$]+|['"`~\s*@#.\-,:;&|()!\[\]{}<>\/\\+=\^%$]+$/g, '').trim();
      if (name && name.length > 1) {
        const val = use[i].v;
        if (!seen.has(name) || seen.get(name) < val) seen.set(name, val);
      }
    }
  }

  const players = Array.from(seen.entries()).map(([name, value]) => ({ name, value }));
  if (!players.length) return null;
  players.sort((a, b) => b.value - a.value);
  players.forEach((p, i) => p.rank = i + 1);

  const dt = extractDt(normalized) || new Date();
  const id = `${sN}_${sL}_${dt.getTime()}`;
  return {
    id, structure_name: sN, structure_level: sL,
    game_time: fmtDate(new Date(dt - 6 * 3600000)),
    players_count: players.length,
    total_demolition: players.reduce((s, p) => s + p.value, 0),
    players
  };
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
