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
  html2canvas(target, { backgroundColor: '#0b0f19', scale: 2 }).then(c => { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'vts_dashboard.png'; a.click(); }).catch(() => {});
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
    const d = document.createElement('div'); d.className = 'dash-attack-item';
    d.innerHTML = `<div><div class="dash-attack-name">${a.structure_name} ${a.structure_level}</div><div class="dash-attack-time">${a.game_time.split(' ')[1]?.slice(0,5)} GT · ${a.players_count} players</div></div><div style="text-align:right"><div class="dash-attack-val">${a.total_demolition.toLocaleString()}</div></div>`;
    d.onclick = () => showModal('attack', a); al.appendChild(d);
  });

  const tb = $id('dashLeaderBody'); tb.innerHTML = '';
  psum.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase())).forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="dash-rank">#${i+1}</td><td class="dash-pname">${p.name}</td><td class="dash-val">${p.total_demolition.toLocaleString()}</td><td style="text-align:center">${p.participation_count}</td><td class="dash-avg">${Math.round(p.total_demolition/p.participation_count).toLocaleString()}</td>`;
    tr.onclick = () => showModal('player', p); tb.appendChild(tr);
  });
}

function showModal(type, data) {
  const m = $id('dashModal'), body = $id('dashModalBody');
  $id('dashModalTitle').textContent = type === 'attack' ? data.structure_name + ' ' + (data.structure_level||'') : data.name;
  $id('dashModalSub').textContent = type === 'attack' ? `${data.game_time} · ${data.players_count} participants` : `${data.total_demolition.toLocaleString()} total demolition`;
  if (type === 'attack') {
    let h = `<div class="dash-modal-grid"><div class="dash-modal-stat"><div>Total Demolition</div><div style="color:#14b8a6;font-weight:700">${data.total_demolition.toLocaleString()}</div></div><div class="dash-modal-stat"><div>Participants</div><div style="color:#3b82f6;font-weight:700">${data.players_count}</div></div><div class="dash-modal-stat"><div>Game Time</div><div style="color:#8b5cf6;font-weight:700;font-size:0.85rem">${data.game_time.split(' ')[1]?.slice(0,5)}</div></div><div class="dash-modal-stat"><div>Structure</div><div style="color:#14b8a6;font-weight:700;font-size:0.85rem">${data.structure_name} ${data.structure_level||''}</div></div></div>`;
    h += `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">Player Breakdown</div><table class="dash-table"><thead><tr><th>#</th><th>Name</th><th style="text-align:right">Demolition</th></tr></thead><tbody>`;
    data.players.forEach(p => h += `<tr><td class="dash-rank ${p.rank<=3?'rank-'+p.rank:''}">#${p.rank}</td><td class="dash-pname">${p.name}</td><td class="dash-val">${p.value.toLocaleString()}</td></tr>`);
    body.innerHTML = h + '</tbody></table>';
  } else {
    body.innerHTML = `<div class="dash-modal-grid"><div class="dash-modal-stat"><div>Total Demolition</div><div style="color:#3b82f6;font-weight:700">${data.total_demolition.toLocaleString()}</div></div></div>` + 
      '<table class="dash-table"><thead><tr><th>Structure</th><th style="text-align:right">Value</th></tr></thead><tbody>' + data.attacks.map(att => `<tr><td>${att.structure_name}</td><td style="text-align:right">${att.val.toLocaleString()}</td></tr>`).join('') + '</tbody></table>';
  }
  m.classList.add('active');
}

function closeModal() { $id('dashModal')?.classList.remove('active'); document.body.style.overflow = ''; }

// --- OCR Engine ---
async function processFiles(files) {
  if (typeof Tesseract === 'undefined') return;
  _ocrProcessing = true; const valid = Array.from(files).filter(f => /\.(png|jpe?g)$/i.test(f.name));
  if (!valid.length) return;
  $id('dashProgress').classList.remove('hidden');
  log(`Starting OCR on ${valid.length} files...`, 'info');
  const worker = await Tesseract.createWorker('eng', 1);
  await worker.setParameters({ tessedit_pageseg_mode: '6', tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ,. :()-[]|?~@#*&+=' });
  
  const allTexts = [];
  for (let i = 0; i < valid.length; i++) {
    const f = valid[i]; log(`Reading image data...`, 'info', f.name);
    const img = await new Promise(res => { const r = new FileReader(); r.onload = e => { const im = new Image(); im.onload = () => res(im); im.src = e.target.result; }; r.readAsDataURL(f); });
    const cv = document.createElement('canvas'), sc = 2.0; cv.width = img.width*sc; cv.height = img.height*sc;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const idat = ctx.getImageData(0,0,cv.width,cv.height), d = idat.data;
    for (let j=0; j<d.length; j+=4) { const g = 0.299*d[j]+0.587*d[j+1]+0.114*d[j+2]; d[j]=d[j+1]=d[j+2]=g>180?255:g<60?0:(g-60)*(255/120); }
    ctx.putImageData(idat,0,0);
    log(`Running high-precision scan...`, 'info', f.name);
    const { data: { text, words } } = await worker.recognize(cv);
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
  const parsed = parseOcrResults(validated);
  if (parsed) { saveData(parsed); render(); log(`Success! ${parsed.attacks.length} sessions updated.`, 'success'); }
  else log(`Failed to identify valid reports.`, 'err');
  
  await worker.terminate(); _ocrProcessing = false; setTimeout(() => $id('dashProgress').classList.add('hidden'), 2000);
}

function extractStructureName(text) {
  const m = text.match(/occupied\s+the\s+(.+?)\s+(Lv\.?\s*\d+|Level\s+\d+)/i) || text.match(/([A-Z][A-Za-z\s'-]{2,30})\s+(Lv\.?\s*\d+|Level\s+\d+)/i);
  if (m) return m[1].trim();
  const ruM = text.match(/(\w+)\s+Occupation\s+Notice/i);
  if (ruM) return ruM[1];
  return null;
}

function parseOcrResults(results) {
  const withMeta = results.map(r => ({ dt: extractDt(r.text) || new Date(), sN: extractStructureName(r.text), r })).sort((a,b) => a.dt - b.dt);
  const groups = [];
  for (const item of withMeta) {
    let f = false;
    for (const g of groups) { if (Math.abs(g.dt - item.dt) < 600000 && g.sN === item.sN) { g.results.push(item.r); f = true; break; } }
    if (!f) groups.push({ dt: item.dt, sN: item.sN, results: [item.r] });
  }
  const attacks = [];
  for (const g of groups) {
    const txt = g.results.map(r => r.text).join('\n');
    if (isParagraphFormat(txt)) {
      const att = parseParagraphFormat(txt);
      if (att) attacks.push(att);
      continue;
    }
    let sN = 'Structure', sL = 'Unknown';
    const m = txt.match(/occupied\s+the\s+(.+?)\s+(Lv\.?\s*\d+|Level\s+\d+)/i) || txt.match(/([A-Z][A-Za-z\s'-]{2,30})\s+(Lv\.?\s*\d+|Level\s+\d+)/i);
    if (m) { sN = m[1].trim(); sL = m[2].trim(); }
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
      attacks.push({ id: `${sN}_${sL}_${g.dt.getTime()}`, structure_name: sN, structure_level: sL, game_time: fmtDate(new Date(g.dt - 6*3600000)), players_count: players.length, total_demolition: players.reduce((s,p)=>s+p.value,0), players });
    }
  }
  if (!attacks.length) return null;
  const merged = {};
  [...((dashData && dashData.attacks) || []), ...attacks].forEach(a => {
    if (merged[a.id]) {
      const pMap = {};
      merged[a.id].players.forEach(p => pMap[p.value] = p);
      a.players.forEach(p => { if (!pMap[p.value]) pMap[p.value] = p; });
      merged[a.id].players = Object.values(pMap).sort((x,y) => y.value - x.value);
      merged[a.id].players.forEach((p,i) => p.rank = i+1);
      merged[a.id].players_count = merged[a.id].players.length;
      merged[a.id].total_demolition = merged[a.id].players.reduce((s,p) => s + p.value, 0);
    } else {
      merged[a.id] = { ...a };
    }
  });
  const sorted = Object.values(merged).sort((a,b) => b.game_time.localeCompare(a.game_time));
  const sum = {}; sorted.forEach(a => a.players.forEach(p => { const n = findBestMatch(p.name); if (!sum[n]) sum[n] = { name: n, total_demolition: 0, participation_count: 0, attacks: [] }; sum[n].total_demolition += p.value; sum[n].participation_count++; sum[n].attacks.push({ id: a.id, name: a.structure_name, val: p.value, rank: p.rank }); }));
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
  // Only extract ACTUAL digits. Don't turn letters into digits unless they are clearly in a number block.
  const digits = t.replace(/,/g,'').match(/\d+/);
  if (!digits) return null;
  let valStr = digits[0];
  // Common visual fixes ONLY if they are part of a digit string
  valStr = valStr.replace(/S/g,'5').replace(/[IL|]/g,'1');
  return parseInt(valStr) || 0;
}

function fmtDate(d) { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }
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
  $id('dashExpPdf').onclick = () => window.print();
  $id('dashExpPng').onclick = exportToPng;
  $id('dashExpJson').onclick = exportData;
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
