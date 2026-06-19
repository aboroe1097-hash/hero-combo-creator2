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
import {
  STORAGE_KEY, AUTH_KEY, ROSTER_KEY, ROSTER_SNAPSHOTS_KEY, BANNER_KEY, FS_PATH, FS_ROSTER_PATH,
  ROSTER_USERS, ROSTER_AUTH_KEY, ALLIANCE_KEY, ALLIANCE_COUNT,
  LOG_KEY, AUTH_HASH, CLEAR_HASH, DURABILITY_TABLE,
  state, $id, esc, log, appendLogEntry, persistLog, restoreLogs,
  tryRepairJson, getSimilarity, getSimilarityAlphaNum, editDistance, findBestMatch,
  validateTotalDemolition, sha256, checkOcrService, qwenVisionRequest
} from './ocr-shared.js';

// --- Mutable State (initialized locally, synced to `state` for cross-module sharing) ---
state.dashData = null;
state.searchQ = '';
state.attackSearchQ = '';
state.rosterNames = [];
state.rosterSnapshots = [];
state.bannerRecords = [];
state.sortCol = 'total_demolition';
state.sortDir = 'desc';

// --- Roster Admin Functions (remain in dashboard scope) ---

// --- Sub-tab Switching ---

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
export async function saveRosterSnapshotsToFirestore() {
  try {
    await ensureAnonymousAuth();
    await setDoc(doc(getDb(), FS_ROSTER_PATH), { snapshots: state.rosterSnapshots, updated: new Date().toISOString() });
  } catch (e) {
    console.error('ROSTER FIRESTORE SAVE ERROR:', e);
  }
}
async function loadRosterSnapshotsFromFirestore() {
  try {
    const db = getDb();
    await ensureAnonymousAuth();
    if (state._fsRosterUnsub) state._fsRosterUnsub();
    const snap = await getDoc(doc(db, FS_ROSTER_PATH));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.snapshots)) {
        state.rosterSnapshots = data.snapshots;
        localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
      }
    }
    state._fsRosterUnsub = onSnapshot(doc(db, FS_ROSTER_PATH), (s) => {
      if (s.exists()) {
        const d = s.data();
        if (Array.isArray(d.snapshots)) {
          state.rosterSnapshots = d.snapshots;
          localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
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
  if (state._rosterProcessing) { log('Roster OCR already running...', 'warn'); return; }
  state._rosterProcessing = true;
  const valid = Array.from(files).filter(f => /\.(png|jpe?g)$/i.test(f.name));
  if (!valid.length) { state._rosterProcessing = false; return; }

  const prog = $id('dashRosterProgress');
  const progText = $id('dashRosterProgressText');
  if (prog) prog.classList.remove('hidden');

  log(`Scanning ${valid.length} roster screenshot(s)...`, 'info');

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
          raw = await qwenVisionRequest([{ role: 'user', content: [
            { type: 'text', text: promptTxt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
          ]}]);
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
  state._rosterProcessing = false;

  const unique = [...new Set(allNames.map(n => n.toLowerCase()))].map(k => allNames.find(n => n.toLowerCase() === k)).filter(Boolean).sort();

  if (!unique.length) {
    log('No member names found in the screenshot(s).', 'warn');
    alert('Could not extract any member names from the image. Check the log panel for details.');
    return;
  }

  log(`Extracted ${unique.length} unique member names from roster image(s).`, 'info');

  const prevText = state.rosterSnapshots.length ? state.rosterSnapshots[state.rosterSnapshots.length - 1].members.join('\n') : '';
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

export function isGuest() { return sessionStorage.getItem('vts_guest') === '1'; }
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
export async function saveData(data) {
  state.dashData = data;
  try { 
    const localLogs = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    state.dashData.logs = localLogs;
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
    if (saved) { state.dashData = JSON.parse(saved); render(); }
  } catch (e) {}
  try {
    const db = getDb();
    if (!db) { log('Firestore not available — using local storage only.', 'warn'); return; }
    await ensureAnonymousAuth();
    if (state._fsUnsub) state._fsUnsub();
    const snap = await getDoc(doc(db, FS_PATH));
    if (snap.exists()) {
      state.dashData = snap.data();
      try { 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dashData)); 
        if (state.dashData.logs) {
          localStorage.setItem(LOG_KEY, JSON.stringify(state.dashData.logs));
          restoreLogs();
        }
      } catch (e) {}
      render();
    }
    state._fsUnsub = onSnapshot(doc(db, FS_PATH), (snap) => {
      if (snap.exists()) {
        state.dashData = snap.data();
        try { 
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dashData)); 
          if (state.dashData.logs) {
            localStorage.setItem(LOG_KEY, JSON.stringify(state.dashData.logs));
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
  state.dashData = null;
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
function exportData() { if (!state.dashData) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state.dashData, null, 2)], { type: 'application/json' })); a.download = 'vts_admin_data.json'; a.click(); }
function exportToCsv() {
  if (!state.dashData?.players_summary) return;
  let csv = 'Rank,Member Name,Total Demolition,Hits,Avg per Hit\n';
  state.dashData.players_summary.forEach((p, i) => { const safeName = p.name.replace(/"/g, '""'); csv += `${i + 1},"${safeName}",${p.total_demolition},${p.participation_count},${Math.round(p.total_demolition/p.participation_count)}\n`; });
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
  if (!state.dashData?.attacks?.length) return;
  let csv = 'Start Time,End Time,Structure,Level,Player Name,Rank,Demolition Value\n';
  state.dashData.attacks.forEach(a => {
    const date = displayGameTime(a.game_time);
    const start = a.start_time ? a.start_time.replace(/"/g, '""') : '';
    (a.players||[]).forEach(p => { const safeName = p.name.replace(/"/g, '""'); csv += `"${start}","${date}","${a.structure_name}","${a.structure_level||''}","${safeName}",${p.rank},${p.value}\n`; });
  });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'vts_attack_details.csv'; a.click();
}
function exportDebugCsv() {
  if (!state.dashData?.attacks?.length) return;
  let csv = 'Attack ID,Start Time,End Time,Structure,Level,Raw Name,Grouped Name (Master),Demolition Value,Rank\n';
  state.dashData.attacks.forEach(a => {
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
      const m = {}; (state.dashData?.attacks||[]).forEach(a => m[a.id]=a); (imp.attacks||[]).forEach(a => m[a.id]=a);
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









export async function bootOcrDashboard() {
  if (state._booted) return; state._booted = true; loadRoster();
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
      const prevText = state.rosterSnapshots.length ? state.rosterSnapshots[state.rosterSnapshots.length - 1].members.join('\n') : '';
      const input = prompt('Paste member names (one per line):', prevText);
      if (input !== null && input.trim()) takeRosterSnapshot(input);
    };
  }

  // ── API status watcher ──────────────────────────────────
  let ocrReady = false;
  async function updateApiStatus() {
    const result = await checkOcrService();
    ocrReady = result.configured === true;
    const els = [
      { id: 'dashRosterApiStatus', zone: 'dashRosterUploadZone', drop: 'dashRosterDropZone', input: 'dashRosterFileInput' },
      { id: 'dashApiUploadStatus', zone: 'dashUploadZone', drop: 'dashDropZone', input: 'dashFileInput' },
      { id: 'dashOcrServiceStatus' },
    ];
    els.forEach(({ id, zone, drop, input }) => {
      const statusEl = $id(id);
      const dropEl = $id(drop);
      const inputEl = $id(input);
      if (!statusEl) return;
      if (ocrReady) {
        statusEl.className = 'dash-roster-api-status dash-api-ok';
        statusEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> OCR service ready';
        if (dropEl) { dropEl.style.opacity = '1'; dropEl.style.pointerEvents = ''; }
        if (inputEl) inputEl.disabled = false;
      } else {
        statusEl.className = 'dash-roster-api-status dash-api-missing';
        statusEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <b>OCR unavailable</b> - configure DASHSCOPE_API_KEY in the Worker';
        if (dropEl) { dropEl.style.opacity = '0.5'; dropEl.style.pointerEvents = 'none'; }
        if (inputEl) inputEl.disabled = true;
      }
    });
    return ocrReady;
  }
  function canUseOcr() {
    if (ocrReady) return true;
    updateApiStatus();
    return false;
  }

  // Run on boot and whenever key input changes
  updateApiStatus();
  const apiSaveBtn = $id('dashSaveApiBtn');
  if (apiSaveBtn) apiSaveBtn.addEventListener('click', updateApiStatus);

  // Roster: image upload
  const rosterZone = $id('dashRosterUploadZone');
  const rosterDrop = $id('dashRosterDropZone');
  const rosterInput = $id('dashRosterFileInput');
  if (rosterDrop && rosterInput) {
    rosterDrop.onclick = () => {
      if (!canUseOcr()) return;
      rosterInput.click();
    };
    rosterDrop.ondragover = e => { e.preventDefault(); rosterDrop.classList.add('dragover'); };
    rosterDrop.ondragleave = () => rosterDrop.classList.remove('dragover');
    rosterDrop.ondrop = e => {
      e.preventDefault(); rosterDrop.classList.remove('dragover');
      if (!canUseOcr()) return;
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

  try { localStorage.removeItem('qwen_api_key'); } catch (e) {}

  $id('dashClearDataBtn').onclick = async () => {
    const code = prompt('Enter admin override code:');
    if (!code) return;
    const h = await sha256(code);
    if (h === CLEAR_HASH) clearData(); else alert('Invalid code');
  };

  $id('dashModalClose').onclick = closeModal;
  $id('dashSearch').oninput = e => { state.searchQ = e.target.value; state.leaderLimit = 25; render(); };
  $id('dashLeaderFilter').onchange = () => { state.leaderLimit = 25; render(); };
  const tFilter = $id('dashTimeFilter');
  if (tFilter) tFilter.onchange = () => { state.leaderLimit = 25; render(); };
  $id('dashAttackSearch').oninput = e => { state.attackSearchQ = e.target.value; render(); };
  document.querySelectorAll('#ocrDashboardRoot th[data-sort]').forEach(th => th.onclick=()=>{ const c=th.dataset.sort; state.sortDir=state.sortCol===c?(state.sortDir==='desc'?'asc':'desc'):'desc'; state.sortCol=c; state.leaderLimit = 25; render(); });
  window.loadMoreLeaderboard = () => { state.leaderLimit += 25; render(); };
  
  const zone = $id('dashUploadZone'), drop = $id('dashDropZone'), inp = $id('dashFileInput');
  zone.classList.remove('hidden'); // Restore old visibility
  $id('dashUploadBtn').onclick = () => { if (!canUseOcr()) return; inp.click(); };
  drop.onclick = () => { if (!canUseOcr()) return; inp.click(); };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('dragover'); };
  drop.ondragleave = () => drop.classList.remove('dragover');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('dragover'); if (!canUseOcr()) return; if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files); };
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
  if(!attId || !state._booted || !state.dashData) return;
  const idx = state.dashData.attacks.findIndex(a => a.id === attId);
  if (idx !== -1) {
    const removed = state.dashData.attacks[idx];
    state.dashData.attacks.splice(idx, 1);
    const mockReturn = parseOcrResults([]); 
    state.dashData.players_summary = mockReturn ? mockReturn.players_summary : state.dashData.players_summary;
    state.dashData.total_attacks = state.dashData.attacks.length;
    await saveData(state.dashData);
    render(); closeModal();
    log(`Deleted attack: ${removed.structure_name} ${removed.structure_level}`, 'warn');
  }
};

window.editAttack = async function(attId) {
  if(!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find(a => a.id === attId);
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
  state.dashData.players_summary = mockReturn ? mockReturn.players_summary : state.dashData.players_summary;
  await saveData(state.dashData);
  render(); showModal('attack', att);
  log(`Updated attack to: ${att.structure_name} ${att.structure_level}`, 'info');
};

window.addPlayer = async function(attId) {
  if(!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find(a => a.id === attId);
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
  state.dashData.players_summary = mockReturn ? mockReturn.players_summary : state.dashData.players_summary;
  await saveData(state.dashData);
  render(); showModal('attack', att);
  log(`Added player ${pName} to ${att.structure_name}`, 'info');
};

window.editPlayer = async function(attId, encName) {
  if(!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find(a => a.id === attId);
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
  state.dashData.players_summary = mockReturn ? mockReturn.players_summary : state.dashData.players_summary;
  await saveData(state.dashData);
  render(); showModal('attack', att);
  log(`Edited player ${pName} in ${att.structure_name}`, 'info');
};

window.showPlayer = function(pNameEncoded) {
  if (!state.dashData) return;
  const pName = decodeURIComponent(pNameEncoded);
  const masterName = findBestMatch(pName);
  
  // Exact match first (using master name)
  let p = state.dashData.players_summary.find(x => x.name === masterName);
  // Fallback to raw name if master fails
  if (!p) p = state.dashData.players_summary.find(x => x.name === pName);
  // Fuzzy fallback: case-insensitive + trimmed
  if (!p) {
    const q = pName.trim().toLowerCase();
    p = state.dashData.players_summary.find(x => x.name.trim().toLowerCase() === q);
  }
  // Last resort: partial match (handles OCR name variants)
  if (!p) {
    const q = pName.trim().toLowerCase();
    p = state.dashData.players_summary.find(x =>
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
  if(!state.dashData) return;
  const att = state.dashData.attacks.find(a => a.id === attId);
  if(att) showModal('attack', att);
  else closeModal();
};

window.exportPlayerReport = function(pNameEncoded) {
  if(!state.dashData) return;
  const pName = decodeURIComponent(pNameEncoded);
  const p = state.dashData.players_summary.find(x => x.name === pName);
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
  if (key === 'alliance') state._rosterFilterAlliance = val;
  else if (key === 'status') state._rosterFilterStatus = val;
  else if (key === 'search') state._rosterSearchQ = val;
  renderRoster();
};
