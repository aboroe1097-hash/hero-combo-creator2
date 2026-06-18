// Extracted Roster System Module

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

function loadRosterSnapshots() {
  try {
    const raw = localStorage.getItem(ROSTER_SNAPSHOTS_KEY);
    rosterSnapshots = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(rosterSnapshots)) rosterSnapshots = [];
  } catch (e) { rosterSnapshots = []; }
}

function saveRosterSnapshots() {
  try { localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(rosterSnapshots)); } catch (e) {}
  saveRosterSnapshotsToFirestore();
}

function computeRosterDiff(oldMembers, newMembers) {
  const oldSet = new Set(oldMembers.map(n => n.trim().toLowerCase()));
  const newSet = new Set(newMembers.map(n => n.trim().toLowerCase()));
  const stayed = [], joined = [], left = [];
  newMembers.forEach(n => {
    const key = n.trim().toLowerCase();
    if (oldSet.has(key)) stayed.push(n.trim());
    else joined.push(n.trim());
  });
  oldMembers.forEach(n => {
    const key = n.trim().toLowerCase();
    if (!newSet.has(key)) left.push(n.trim());
  });
  return { stayed, joined, left };
}

function takeRosterSnapshot(namesText) {
  const members = namesText.split('\n').map(l => l.trim()).filter(Boolean);
  if (!members.length) { log('No members to save.', 'warn'); return; }
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const prev = rosterSnapshots.length ? rosterSnapshots[rosterSnapshots.length - 1] : null;
  const diff = prev ? computeRosterDiff(prev.members, members) : null;
  const snapshot = { date: dateStr, members, diff };
  rosterSnapshots.push(snapshot);
  saveRosterSnapshots();
  // Also update legacy roster for OCR matching
  localStorage.setItem(ROSTER_KEY, namesText);
  loadRoster();
  log(`Roster snapshot saved: ${members.length} members (${dateStr})`, 'success');
  renderRoster();
}

function deleteRosterSnapshot(index) {
  if (!confirm('Delete this roster snapshot?')) return;
  rosterSnapshots.splice(index, 1);
  saveRosterSnapshots();
  renderRoster();
  log('Roster snapshot deleted.', 'warn');
}

function loadAllianceList() {
  try {
    const raw = localStorage.getItem(ALLIANCE_KEY);
    if (raw) { const a = JSON.parse(raw); if (Array.isArray(a) && a.length === ALLIANCE_COUNT) allianceList = a; }
  } catch (e) {}
}

function saveAllianceList() {
  try { localStorage.setItem(ALLIANCE_KEY, JSON.stringify(allianceList)); } catch (e) {}
}

function loadRosterAuth() {
  try { _rosterLoggedUser = localStorage.getItem(ROSTER_AUTH_KEY) || ''; } catch (e) { _rosterLoggedUser = ''; }
}

function saveRosterAuth() {
  try { localStorage.setItem(ROSTER_AUTH_KEY, _rosterLoggedUser); } catch (e) {}
}

function rosterLogin() {
  const user = $id('dashRosterLoginUser')?.value;
  const pass = $id('dashRosterLoginPass')?.value;
  if (!user || pass !== ROSTER_PASS) { log('Invalid roster login credentials.', 'error'); return; }
  _rosterLoggedUser = user;
  saveRosterAuth();
  log('Roster logged in as ' + user, 'success');
  const ai = allianceList.indexOf(user);
  if (ai >= 0) _rosterFilterAlliance = String(ai);
  renderRoster();
}

function rosterLogout() {
  _rosterLoggedUser = '';
  saveRosterAuth();
  renderRoster();
}

function _ensureMember(m) {
  if (typeof m === 'string') return { name: m, status: 'unknown', alliance: -1, verifiedBy: '', lastModified: '' };
  if (m.alliance === undefined) m.alliance = -1;
  if (m.verifiedBy === undefined) m.verifiedBy = '';
  if (m.lastModified === undefined) m.lastModified = '';
  return m;
}

function setRosterStatus(snapIndex, memberIndex, status) {
  const snap = rosterSnapshots[snapIndex];
  if (!snap) return;
  let m = snap.members[memberIndex];
  if (!m) return;
  m = snap.members[memberIndex] = _ensureMember(m);
  if (status === 'spy' && m.status === 'spy') status = 'unknown';
  m.status = status;
  if (_rosterLoggedUser) { m.verifiedBy = _rosterLoggedUser; m.lastModified = new Date().toISOString(); }
  saveRosterSnapshots();
  renderRoster();
}

function setRosterAlliance(snapIndex, memberIndex, allianceIdx) {
  const snap = rosterSnapshots[snapIndex];
  if (!snap) return;
  let m = snap.members[memberIndex];
  if (!m) return;
  m = snap.members[memberIndex] = _ensureMember(m);
  m.alliance = m.alliance === allianceIdx ? -1 : allianceIdx;
  if (_rosterLoggedUser) { m.verifiedBy = _rosterLoggedUser; m.lastModified = new Date().toISOString(); }
  saveRosterSnapshots();
  renderRoster();
}

function toggleBulkCheck(mi) {
  if (_rosterSelectedIndices.has(mi)) _rosterSelectedIndices.delete(mi);
  else _rosterSelectedIndices.add(mi);
  renderRoster();
}

function toggleBulkSelectAll(jsonStr) {
  const indices = JSON.parse(jsonStr);
  if (_rosterSelectedIndices.size === indices.length) _rosterSelectedIndices.clear();
  else indices.forEach(function(i) { _rosterSelectedIndices.add(i); });
  renderRoster();
}

function applyBulkStatus(status) {
  if (!_rosterSelectedIndices.size) return;
  const snap = rosterSnapshots[rosterSnapshots.length - 1];
  _rosterSelectedIndices.forEach(function(mi) {
    let m = snap.members[mi];
    m = snap.members[mi] = _ensureMember(m);
    m.status = status;
    if (_rosterLoggedUser) { m.verifiedBy = _rosterLoggedUser; m.lastModified = new Date().toISOString(); }
  });
  _rosterSelectedIndices.clear();
  saveRosterSnapshots();
  renderRoster();
}

function applyBulkAlliance(allianceIdx) {
  if (!_rosterSelectedIndices.size) return;
  const snap = rosterSnapshots[rosterSnapshots.length - 1];
  _rosterSelectedIndices.forEach(function(mi) {
    let m = snap.members[mi];
    m = snap.members[mi] = _ensureMember(m);
    m.alliance = allianceIdx;
    if (_rosterLoggedUser) { m.verifiedBy = _rosterLoggedUser; m.lastModified = new Date().toISOString(); }
  });
  _rosterSelectedIndices.clear();
  saveRosterSnapshots();
  renderRoster();
}

function exportRosterCSV() {
  if (!rosterSnapshots.length) return;
  const latest = rosterSnapshots[rosterSnapshots.length - 1];
  let csv = 'Name,Status,Alliance,VerifiedBy,LastModified\\n';
  latest.members.forEach(function(m) {
    const mem = _ensureMember(m);
    const a = mem.alliance >= 0 ? allianceList[mem.alliance] : '';
    csv += '"' + mem.name + '","' + mem.status + '","' + a + '","' + (mem.verifiedBy || '') + '","' + (mem.lastModified || '') + '"\\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'roster_export_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  log('Roster exported to CSV.', 'success');
}

function copyRosterNames(type) {
  if (!rosterSnapshots.length) return;
  const latest = rosterSnapshots[rosterSnapshots.length - 1];
  const names = latest.members
    .map(function(m) { return _ensureMember(m); })
    .filter(function(m) { return type === 'unassigned' ? m.alliance === -1 : m.status === type; })
    .map(function(m) { return m.name; })
    .join('\\n');
  navigator.clipboard.writeText(names);
  log('Copied ' + names.split('\\n').length + ' names.', 'success');
}

function showRosterSnapshotModal(index) {
  const snap = rosterSnapshots[index];
  const diff = snap.diff;
  const m = $id('dashModal'), body = $id('dashModalBody');
  $id('dashModalTitle').textContent = 'Snapshot: ' + snap.date;
  $id('dashModalSub').textContent = snap.members.length + ' members';
  let gridHtml = '';
  snap.members.forEach(function(mem) {
    const mObj = _ensureMember(mem);
    const name = mObj.name;
    const status = mObj.status;
    let cls = 'dash-roster-name';
    if (status === 'trusted') cls += ' trusted';
    if (status === 'spy') cls += ' spy';
    if (diff && diff.joined.some(function(j) { return j.toLowerCase() === name.trim().toLowerCase(); })) cls += ' joined';
    if (diff && diff.left.some(function(l) { return l.toLowerCase() === name.trim().toLowerCase(); })) cls += ' left';
    gridHtml += '<div class="' + cls + '"><span>' + esc(name) + '</span></div>';
  });
  body.innerHTML = '<div class="dash-roster-grid">' + gridHtml + '</div><div style="margin-top:12px;text-align:right"><button class="dash-btn" onclick="closeModal()">Close</button></div>';
  m.classList.add('active'); document.body.style.overflow = 'hidden';
}

function configureAlliances() {
  const m = $id('dashModal'), body = $id('dashModalBody');
  $id('dashModalTitle').textContent = 'Configure Alliances';
  $id('dashModalSub').textContent = 'Name your 5 alliances for member assignment.';
  let inputsHtml = '';
  allianceList.forEach(function(a, i) {
    inputsHtml += '<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem"><span style="width:24px;font-weight:700;color:var(--text-muted)">' + (i + 1) + '</span><input id="dashAllianceInput' + i + '" class="dash-input" value="' + esc(a) + '" style="flex:1;padding:6px 10px"></label>';
  });
  body.innerHTML = '<div style="display:flex;flex-direction:column;gap:8px">' + inputsHtml + '<div style="display:flex;gap:8px;margin-top:8px"><button id="dashAllianceSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">Save</button><button id="dashAllianceCancelBtn" class="dash-btn" style="flex:1">Cancel</button></div></div>';
  $id('dashAllianceSaveBtn').onclick = function() {
    for (var i = 0; i < ALLIANCE_COUNT; i++) {
      var v = $id('dashAllianceInput' + i);
      if (v && v.value.trim()) allianceList[i] = v.value.trim();
    }
    saveAllianceList();
    closeModal();
    renderRoster();
  };
  $id('dashAllianceCancelBtn').onclick = closeModal;
  m.classList.add('active'); document.body.style.overflow = 'hidden';
}

function renderRoster() {
  const body = $id('dashRosterBody');
  if (!body) return;
  if (!rosterSnapshots.length) {
    body.innerHTML = '<div class="dash-empty">No roster snapshots yet. Click "New Snapshot" to save this week\'s roster.</div>';
    return;
  }
  const snapIndex = rosterSnapshots.length - 1;
  const latest = rosterSnapshots[snapIndex];
  const diff = latest.diff;
  const members = latest.members;
  function mn(m) { return typeof m === 'string' ? m : m.name; }
  function mstatus(m) { return typeof m === 'string' ? 'unknown' : (m.status || 'unknown'); }
  function malliance(m) { return typeof m === 'string' ? -1 : (m.alliance !== undefined ? m.alliance : -1); }
  var trusted = 0, spy = 0, unknown = 0, assigned = 0;
  members.forEach(function(m) {
    var s = mstatus(m);
    if (s === 'trusted') trusted++;
    else if (s === 'spy') spy++;
    else unknown++;
    if (malliance(m) >= 0) assigned++;
  });
  var total = members.length;
  var unassigned = total - assigned;
  var ocrMap = {};
  if (dashData && dashData.players_summary) {
    dashData.players_summary.forEach(function(p) { ocrMap[p.name.toLowerCase()] = p; });
  }
  var filtered = [];
  members.forEach(function(m, mi) {
    var s = mstatus(m);
    var a = malliance(m);
    var name = mn(m);
    if (_rosterFilterStatus !== 'all' && s !== _rosterFilterStatus) return;
    if (_rosterFilterAlliance !== 'all') {
      if (_rosterFilterAlliance === 'unassigned' && a >= 0) return;
      if (_rosterFilterAlliance !== 'unassigned' && a !== parseInt(_rosterFilterAlliance)) return;
    }
    if (_rosterSearchQ && name.toLowerCase().indexOf(_rosterSearchQ.toLowerCase()) === -1) return;
    filtered.push({ mi: mi, name: name, status: s, alliance: a });
  });
  var isLoggedIn = !!_rosterLoggedUser;
  var loginHtml = isLoggedIn
    ? '<div class="dash-roster-login-bar logged"><span class="dash-roster-login-user">🔓 ' + esc(_rosterLoggedUser) + '</span><button class="dash-btn dash-btn-sm" onclick="rosterLogout()">Logout</button></div>'
    : '<div class="dash-roster-login-bar"><span>🔒 Roster Login:</span><select id="dashRosterLoginUser">' + ROSTER_USERS.map(function(u) { return '<option value="' + u + '">' + u + '</option>'; }).join('') + '</select><input type="password" id="dashRosterLoginPass" placeholder="Password" value="" class="dash-input" style="width:90px;padding:3px 6px;font-size:0.78rem"><button class="dash-btn dash-btn-sm" onclick="rosterLogin()">Login</button></div>';
  var bulkHtml = '';
  if (_rosterSelectedIndices.size > 0 && isLoggedIn) {
    var allyOpts = allianceList.map(function(a, i) { return '<option value="' + i + '">' + esc(a) + '</option>'; }).join('');
    bulkHtml = '<div class="dash-roster-bulk-actions"><span style="font-size:0.8rem;font-weight:bold;color:var(--brand)">' + _rosterSelectedIndices.size + ' selected:</span><button class="dash-btn dash-btn-sm" onclick="applyBulkStatus(\'trusted\')">Mark Trusted</button><button class="dash-btn dash-btn-sm" onclick="applyBulkStatus(\'spy\')">Mark Spy</button><button class="dash-btn dash-btn-sm" onclick="applyBulkStatus(\'unknown\')">Clear Status</button><select class="dash-input" style="font-size:0.75rem;padding:2px;width:100px" onchange="if(this.value){applyBulkAlliance(parseInt(this.value));this.value=\'\'}"><option value="">Assign to...</option><option value="-1">— Unassign —</option>' + allyOpts + '</select></div>';
  }
  var filterAllyOpts = allianceList.map(function(a, i) { return '<option value="' + i + '"' + (_rosterFilterAlliance === String(i) ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('');
  var rowsHtml = '';
  var indicesJson = JSON.stringify(filtered.map(function(f) { return f.mi; })).replace(/"/g, '&quot;');
  filtered.forEach(function(item) {
    var mi = item.mi, name = item.name, status = item.status, alliance = item.alliance;
    var m = members[mi];
    var vb = typeof m === 'string' ? '' : (m.verifiedBy || '');
    var lm = typeof m === 'string' ? '' : (m.lastModified || '');
    var rowCls = 'dash-roster-row';
    if (status === 'trusted') rowCls += ' trusted';
    if (status === 'spy') rowCls += ' spy';
    if (diff && diff.joined.some(function(j) { return j.toLowerCase() === name.trim().toLowerCase(); })) rowCls += ' joined';
    if (diff && diff.left.some(function(l) { return l.toLowerCase() === name.trim().toLowerCase(); })) rowCls += ' left';
    var disabledAttr = isLoggedIn ? '' : 'disabled';
    var pStats = ocrMap[name.toLowerCase()];
    var ocrHtml = pStats
      ? '<span style="margin-left:6px;font-size:0.7rem;color:var(--brand-light)" title="' + pStats.total_demolition + ' Demolition / ' + pStats.participation_count + ' Attacks">⚔️ ' + pStats.total_demolition + '</span>'
      : '<span style="margin-left:6px;font-size:0.7rem;opacity:0.25" title="No OCR data">⚔️ —</span>';
    var auditHtml = '';
    if (vb) auditHtml += '<span class="dash-roster-row-vb" title="Verified by ' + esc(vb) + (lm ? ' on ' + lm.slice(0,10) : '') + '">@' + esc(vb) + '</span>';
    var allySelectHtml = '<select class="dash-roster-row-alliance" ' + disabledAttr + ' onchange="setRosterAlliance(' + snapIndex + ',' + mi + ',parseInt(this.value))"><option value="-1">—</option>' + allianceList.map(function(a, ai) { return '<option value="' + ai + '"' + (alliance === ai ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select>';
    rowsHtml += '<div class="' + rowCls + '"><label style="margin-right:8px;display:flex;align-items:center;cursor:pointer"><input type="checkbox" class="bulk-cb" onchange="toggleBulkCheck(' + mi + ')"' + (_rosterSelectedIndices.has(mi) ? ' checked' : '') + ' ' + disabledAttr + '></label><span class="dash-roster-row-name" style="flex:1">' + esc(name) + ocrHtml + '</span>' + allySelectHtml + auditHtml + '<span class="dash-roster-row-spy' + (status === 'spy' ? ' active' : '') + '" onclick="setRosterStatus(' + snapIndex + ',' + mi + ',\'spy\')" title="Toggle spy">🚫</span></div>';
  });
  var historyHtml = '';
  for (var i = rosterSnapshots.length - 2; i >= 0; i--) {
    var s = rosterSnapshots[i];
    var d = s.diff;
    historyHtml += '<div class="dash-roster-history-item"><span class="dash-roster-history-date">' + esc(s.date) + '</span><span class="dash-roster-history-count">' + s.members.length + '</span>' + (d ? '<span class="dash-roster-history-diff">+' + d.joined.length + '/-' + d.left.length + '</span>' : '<span class="dash-roster-history-diff" style="opacity:0.4">—</span>') + '<button class="dash-btn" style="padding:2px 8px;font-size:0.7rem" onclick="showRosterSnapshotModal(' + i + ')">View</button><button class="dash-banner-del-btn" onclick="event.stopPropagation();deleteRosterSnapshot(' + i + ')" title="Delete">✕</button></div>';
  }
  if (!historyHtml) historyHtml = '<div style="padding:8px;font-size:0.8rem;color:var(--text-muted)">No older snapshots.</div>';
  body.innerHTML = loginHtml
    + '<div class="dash-roster-summary"><span class="dash-roster-summary-total">Total: ' + total + '</span><span class="dash-roster-summary-trusted">✅ ' + trusted + ' Trusted</span><span class="dash-roster-summary-unknown">⬜ ' + unknown + ' Unknown</span><span class="dash-roster-summary-spy">🚫 ' + spy + ' Spy</span><span class="dash-roster-summary-assigned">📋 ' + assigned + ' Assigned</span><span class="dash-roster-summary-unassigned">❓ ' + unassigned + ' Unassigned</span><button class="dash-banner-del-btn" onclick="if(confirm(\'Delete this snapshot?\'))deleteRosterSnapshot(' + snapIndex + ')" title="Delete current snapshot" style="margin-left:auto">✕</button></div>'
    + '<div class="dash-roster-toolbar"><div class="dash-roster-toolbar-filters"><label class="dash-roster-toolbar-label">Alliance <select onchange="setRosterFilter(\'alliance\',this.value)"><option value="all">All</option>' + filterAllyOpts + '<option value="unassigned"' + (_rosterFilterAlliance === 'unassigned' ? ' selected' : '') + '>Unassigned</option></select></label><label class="dash-roster-toolbar-label">Status <select onchange="setRosterFilter(\'status\',this.value)"><option value="all">All</option><option value="trusted"' + (_rosterFilterStatus === 'trusted' ? ' selected' : '') + '>Trusted</option><option value="unknown"' + (_rosterFilterStatus === 'unknown' ? ' selected' : '') + '>Unknown</option><option value="spy"' + (_rosterFilterStatus === 'spy' ? ' selected' : '') + '>Spy</option></select></label><input type="text" placeholder="Search name..." value="' + esc(_rosterSearchQ) + '" oninput="setRosterFilter(\'search\',this.value)" class="dash-input" style="width:140px;padding:4px 8px;font-size:0.78rem"></div><div class="dash-roster-toolbar-actions">' + bulkHtml + '<button class="dash-btn dash-btn-sm" onclick="configureAlliances()" title="Edit alliance names">⚙️</button><button class="dash-btn dash-btn-sm" onclick="copyRosterNames(\'unassigned\')" title="Copy unassigned names">📋 Unassigned</button><button class="dash-btn dash-btn-sm" onclick="copyRosterNames(\'spy\')" title="Copy spy names">📋 Spies</button></div></div>'
    + '<div class="dash-roster-checklist"><div style="padding:4px 12px;border-bottom:1px solid var(--border);margin-bottom:4px;display:flex;align-items:center"><input type="checkbox" title="Select all visible" onchange="toggleBulkSelectAll(\'' + indicesJson + '\')"' + (_rosterSelectedIndices.size > 0 && _rosterSelectedIndices.size === filtered.length ? ' checked' : '') + ' style="margin-right:12px"><span style="font-size:0.75rem;color:var(--text-muted);font-weight:bold">SELECT ALL VISIBLE</span></div>' + rowsHtml + (filtered.length === 0 ? '<div class="dash-roster-empty">No members match filters.</div>' : '') + '</div>'
    + '<div class="dash-roster-total-rows">Showing ' + filtered.length + ' of ' + total + ' members</div>'
    + '<div class="dash-roster-history"><div class="dash-roster-history-head" onclick="var b=this.nextElementSibling;b.classList.toggle(\'open\');this.querySelector(\'.dash-roster-history-arrow\').textContent=b.classList.contains(\'open\')?\'▼\':\'▶\'"><span>📁 Snapshot History (' + (rosterSnapshots.length - 1) + ' older)</span><span class="dash-roster-history-arrow">▶</span></div><div class="dash-roster-history-body">' + historyHtml + '</div></div>';
}

function loadBannerRecords() {
  try {
    const raw = localStorage.getItem(BANNER_KEY);
    bannerRecords = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(bannerRecords)) bannerRecords = [];
  } catch (e) { bannerRecords = []; }
}

function saveBannerRecords() {
  try { localStorage.setItem(BANNER_KEY, JSON.stringify(bannerRecords)); } catch (e) {}
}

function showBannerForm(existingIndex = null) {
  const m = $id('dashModal'), body = $id('dashModalBody');
  // Re-parent modal to body-level portal to avoid position:fixed breakage from ancestor transforms/filters
  if (m && m.parentElement && !document.getElementById('ocrDashModalPortal')) {
    const portal = document.createElement('div');
    portal.id = 'ocrDashModalPortal';
    const fakeRoot = document.createElement('div');
    fakeRoot.id = 'ocrDashboardRoot';
    m.remove();
    fakeRoot.appendChild(m);
    portal.appendChild(fakeRoot);
    document.body.appendChild(portal);
  }
  const edit = existingIndex !== null && bannerRecords[existingIndex];
  $id('dashModalTitle').textContent = edit ? 'Edit Banner Day' : 'New Banner Day';
  $id('dashModalSub').textContent = edit ? '' : 'Record banner assignments for a structure attack day.';

  const roster = rosterSnapshots.length ? rosterSnapshots[rosterSnapshots.length - 1].members : [];
  const memberOptions = roster.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');

  const rec = edit ? bannerRecords[existingIndex] : { date: new Date().toISOString().slice(0, 10), event: '', teams: {} };
  const teamNames = Object.keys(rec.teams);

  body.innerHTML = `<div class="dash-banner-form-row">
    <label>Date</label>
    <input type="date" id="dashBannerFormDate" value="${rec.date}" style="flex:1">
  </div>
  <div class="dash-banner-form-row">
    <label>Event</label>
    <input type="text" id="dashBannerFormEvent" value="${esc(rec.event || '')}" placeholder="e.g. Capital Attack, KE, SvS" style="flex:1">
  </div>
  <div style="margin:1rem 0;padding:1rem;background:var(--surface);border:1px solid var(--border);border-radius:12px">
    <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.05em">Team / Banner Assignments</div>
    <div id="dashBannerTeamsList">
      ${teamNames.length ? teamNames.map((team, ti) => `<div class="dash-banner-form-row" data-team-idx="${ti}">
        <label>Team</label>
        <input type="text" class="dash-banner-team-name" value="${esc(team)}" placeholder="Dawn/Dusk/Etc" style="flex:1">
        <label style="min-width:40px">Members</label>
        <select class="dash-banner-team-members" multiple style="flex:2;min-height:60px">${memberOptions}</select>
        <button class="dash-banner-del-btn dash-banner-remove-team" style="font-size:1rem">✕</button>
      </div>`).join('') : '<div style="color:var(--text-dim);font-size:0.85rem;text-align:center;padding:1rem">No teams added yet. Add a team below.</div>'}
    </div>
    <button id="dashBannerAddTeamBtn" class="dash-btn" style="margin-top:0.5rem;width:100%">+ Add Team</button>
  </div>
  <div style="display:flex;gap:0.5rem">
    <button id="dashBannerSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">${edit ? 'Update' : 'Save'} Banner Day</button>
    <button id="dashBannerFormCancelBtn" class="dash-btn" style="flex:1">Cancel</button>
  </div>`;

  // Wire up "Add Team" — keeps previous entries
  $id('dashBannerAddTeamBtn').onclick = () => {
    const list = $id('dashBannerTeamsList');
    const firstEmpty = list.querySelector('.dash-empty');
    if (firstEmpty) firstEmpty.remove();
    const div = document.createElement('div'); div.className = 'dash-banner-form-row';
    div.innerHTML = `<label>Team</label>
      <input type="text" class="dash-banner-team-name" value="" placeholder="Dawn/Dusk/Etc" style="flex:1">
      <label style="min-width:40px">Members</label>
      <select class="dash-banner-team-members" multiple style="flex:2;min-height:60px">${memberOptions}</select>
      <button class="dash-banner-del-btn dash-banner-remove-team" style="font-size:1rem">✕</button>`;
    div.querySelector('.dash-banner-remove-team').onclick = () => div.remove();
    list.appendChild(div);
  };
  document.querySelectorAll('.dash-banner-remove-team').forEach(btn => btn.onclick = () => btn.closest('.dash-banner-form-row').remove());

  $id('dashBannerSaveBtn').onclick = () => {
    const date = $id('dashBannerFormDate').value;
    const event = $id('dashBannerFormEvent').value.trim();
    const teamRows = document.querySelectorAll('#dashBannerTeamsList .dash-banner-form-row');
    const teams = {};
    let hasError = false;
    teamRows.forEach(row => {
      const name = row.querySelector('.dash-banner-team-name').value.trim();
      if (!name) return;
      const sel = row.querySelector('.dash-banner-team-members');
      const members = Array.from(sel.selectedOptions).map(o => o.value);
      if (!members.length) return;
      teams[name] = members;
    });
    if (!Object.keys(teams).length) { alert('Add at least one team with members.'); return; }
    const record = { date, event, teams };
    if (edit) { bannerRecords[existingIndex] = record; }
    else { bannerRecords.push(record); }
    saveBannerRecords();
    closeModal();
    renderBanners();
    log(`Banner day ${edit ? 'updated' : 'saved'}: ${date}${event ? ' - ' + event : ''}`, 'success');
  };
  $id('dashBannerFormCancelBtn').onclick = closeModal;
  m.classList.add('active'); document.body.style.overflow = 'hidden';
}

function deleteBannerRecord(index) {
  if (!confirm('Delete this banner record?')) return;
  bannerRecords.splice(index, 1);
  saveBannerRecords();
  renderBanners();
  log('Banner record deleted.', 'warn');
}

function renderBanners() {
  const body = $id('dashBannerBody');
  if (!body) return;
  if (!bannerRecords.length) {
    body.innerHTML = '<div class="dash-empty">No banner records yet. Click "New Banner Day" to start tracking.</div>';
    return;
  }
  let html = '';
  for (let i = bannerRecords.length - 1; i >= 0; i--) {
    const rec = bannerRecords[i];
    const teamEntries = Object.entries(rec.teams);
    const totalMembers = teamEntries.reduce((s, [, m]) => s + m.length, 0);
    html += `<div class="dash-banner-card">
      <div class="dash-banner-head">
        <div class="dash-banner-date">
          <span>${esc(rec.date)}</span>
          ${rec.event ? `<span class="dash-banner-event">${esc(rec.event)}</span>` : ''}
          <span class="dash-banner-count">${teamEntries.length} teams, ${totalMembers} players</span>
        </div>
        <div style="display:flex;gap:6px">
          <button class="dash-btn" style="padding:4px 10px;font-size:0.72rem;min-height:0" onclick="showBannerForm(${i})">Edit</button>
          <button class="dash-banner-del-btn" onclick="deleteBannerRecord(${i})" title="Delete">✕</button>
        </div>
      </div>
      <div class="dash-banner-body">
        <table class="dash-banner-table">
          <thead><tr><th>Team</th><th>Members</th><th>Count</th></tr></thead>
          <tbody>
            ${teamEntries.map(([team, members]) => `<tr>
              <td><span class="dash-banner-team-tag" style="background:${getTeamColor(team)};color:#fff">${esc(team)}</span></td>
              <td>${members.map(m => esc(m)).join(', ')}</td>
              <td style="text-align:right;font-weight:700;color:var(--text-muted)">${members.length}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }
  body.innerHTML = html;
}

function getTeamColor(teamName) {
  const colors = {
    'dawn': '#f59e0b', 'dusk': '#6366f1', 'ice': '#06b6d4', 'fire': '#ef4444',
    'frost': '#0ea5e9', 'ember': '#f97316', 'storm': '#8b5cf6', 'shadow': '#6b7280',
    'light': '#eab308', 'void': '#8b5cf6', 'crystal': '#14b8a6', 'iron': '#64748b',
  };
  const key = teamName.toLowerCase().trim();
  return colors[key] || `hsl(${Math.abs(hashCode(teamName)) % 360}, 55%, 50%)`;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); hash = ((hash << 5) - hash) + c; hash |= 0; }
  return Math.abs(hash);
}

export { 
  loadRoster, saveRoster, showRosterModal,
  loadRosterSnapshots, saveRosterSnapshots, computeRosterDiff, takeRosterSnapshot, deleteRosterSnapshot,
  loadAllianceList, saveAllianceList, loadRosterAuth, saveRosterAuth, rosterLogin, rosterLogout,
  _ensureMember, setRosterStatus, setRosterAlliance,
  toggleBulkCheck, toggleBulkSelectAll, applyBulkStatus, applyBulkAlliance,
  exportRosterCSV, copyRosterNames,
  showRosterSnapshotModal, configureAlliances, renderRoster,
  loadBannerRecords, saveBannerRecords, showBannerForm, deleteBannerRecord, renderBanners, getTeamColor, hashCode
};
