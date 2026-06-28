import {
  ROSTER_KEY,
  ROSTER_SNAPSHOTS_KEY,
  BANNER_KEY,
  DUTY_LIST_KEY,
  CONTRIBUTION_KEY,
  EX_GUILD_CONTRIBUTION_KEY,
  ALLIANCE_KEY,
  ROSTER_AUTH_KEY,
  ROSTER_USERS,
  ROSTER_PASS_HASH,
  ALLIANCE_COUNT,
  state,
  $id,
  esc,
  log,
  sha256,
  trimRosterSnapshots,
  qwenVisionRequest,
  describeOcrRequestError,
  tryRepairJson,
  getSimilarity,
  getSimilarityAlphaNum,
  findBestMatch,
  compactPlayerIdentity,
  getSupportedOcrImageFiles,
  describeRejectedOcrImageFiles,
  readOcrImageDataUrl,
  expandDutyRawNames,
  getDutyCreditedNames,
} from './ocr-shared.js';
import { closeModal } from './ocr-render.js';
import { pushUndoAction } from './state.js';
import { translations } from './translations.js';
import {
  canonicalizePlayerOptionNames,
  getSpecialAccountIdentityKey,
  resolveCanonicalPlayerIdentity,
  stripGuildTagsFromPlayerName,
  summarizeCanonicalPlayerRecords,
} from './ocr-name-normalizer.js';
import {
  buildWeightedContributionRows,
  getWeightedContributionRecordLabel,
} from './contribution-weighting.js';

function adminT(key, vars = {}) {
  let lang = 'en';
  try {
    lang = localStorage.getItem('vts_hero_lang') || 'en';
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
  const dictionaries = window.VTS_TRANSLATIONS || translations;
  let text =
    dictionaries[lang]?.[key] ||
    translations[lang]?.[key] ||
    dictionaries.en?.[key] ||
    translations.en?.[key] ||
    key;
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, String(value));
  });
  return text;
}

function hydrateDashboardTableLabels(root) {
  if (!root) return;
  root.querySelectorAll('table').forEach((table) => {
    const labels = Array.from(table.querySelectorAll('thead th')).map((th) =>
      (th.textContent || '').replace(/\s+/g, ' ').trim()
    );
    if (!labels.length) return;
    table.querySelectorAll('tbody tr').forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (cell.tagName === 'TD' && labels[index]) cell.dataset.label = labels[index];
      });
    });
  });
}

function loadRoster() {
  const raw = localStorage.getItem(ROSTER_KEY);
  state.rosterNames = raw
    ? raw
        .split('\n')
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
    : [];
}

function saveRoster(text) {
  const previous = localStorage.getItem(ROSTER_KEY) || '';
  localStorage.setItem(ROSTER_KEY, text);
  loadRoster();
  if (previous !== text) {
    pushUndoAction({
      label: 'Roster edit',
      undo: () => {
        localStorage.setItem(ROSTER_KEY, previous);
        loadRoster();
        renderRoster();
        log('Roster edit undone.', 'success');
      },
    });
  }
}

function showRosterModal() {
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  $id('dashModalTitle').textContent = 'Alliance Roster';
  $id('dashModalSub').textContent = 'Paste names (one per line) to improve OCR.';
  const rosterText = esc(localStorage.getItem(ROSTER_KEY) || '');
  body.innerHTML = `<textarea id="dashRosterInput" class="dash-input" style="height:300px;font-family:monospace;font-size:0.85rem">${rosterText}</textarea>
    <div style="margin-top:1rem;display:flex;gap:0.5rem"><button id="dashRosterSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">Save Roster</button><button id="dashRosterCancelBtn" class="dash-btn" style="flex:1">Cancel</button></div>`;
  $id('dashRosterSaveBtn').onclick = () => {
    saveRoster($id('dashRosterInput').value);
    closeModal();
  };
  $id('dashRosterCancelBtn').onclick = closeModal;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function loadRosterSnapshots() {
  try {
    const raw = localStorage.getItem(ROSTER_SNAPSHOTS_KEY);
    state.rosterSnapshots = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.rosterSnapshots)) state.rosterSnapshots = [];
    state.rosterSnapshots = trimRosterSnapshots(state.rosterSnapshots);
    localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
  } catch (e) {
    state.rosterSnapshots = [];
  }
}

function syncRosterSnapshotsToFirestore() {
  import('./ocr-dashboard.js')
    .then(({ saveRosterSnapshotsToFirestore }) => saveRosterSnapshotsToFirestore())
    .catch((err) => {
      console.error('Roster snapshot cloud sync failed:', err);
      log(`Roster cloud save failed: ${err?.message || err}`, 'error');
    });
}

function saveRosterSnapshots() {
  state.rosterSnapshots = trimRosterSnapshots(state.rosterSnapshots);
  try {
    localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
  } catch (e) {}
  syncRosterSnapshotsToFirestore();
}

function computeRosterDiff(oldMembers, newMembers) {
  const oldSet = new Set(oldMembers.map((n) => n.trim().toLowerCase()));
  const newSet = new Set(newMembers.map((n) => n.trim().toLowerCase()));
  const stayed = [],
    joined = [],
    left = [];
  newMembers.forEach((n) => {
    const key = n.trim().toLowerCase();
    if (oldSet.has(key)) stayed.push(n.trim());
    else joined.push(n.trim());
  });
  oldMembers.forEach((n) => {
    const key = n.trim().toLowerCase();
    if (!newSet.has(key)) left.push(n.trim());
  });
  return { stayed, joined, left };
}

function takeRosterSnapshot(namesText) {
  const members = namesText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!members.length) {
    log('No members to save.', 'warn');
    return;
  }
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const prev = state.rosterSnapshots.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1]
    : null;
  const diff = prev ? computeRosterDiff(prev.members, members) : null;
  const snapshot = { date: dateStr, members, diff };
  state.rosterSnapshots.push(snapshot);
  saveRosterSnapshots();
  localStorage.setItem(ROSTER_KEY, namesText);
  loadRoster();
  log(`Roster snapshot saved: ${members.length} members (${dateStr})`, 'success');
  renderRoster();
}

function deleteRosterSnapshot(index) {
  if (!confirm('Delete this roster snapshot?')) return;
  const [removed] = state.rosterSnapshots.splice(index, 1);
  pushUndoAction({
    label: 'Roster snapshot',
    undo: () => {
      state.rosterSnapshots.splice(index, 0, removed);
      saveRosterSnapshots();
      renderRoster();
      log('Roster snapshot restored.', 'success');
    },
  });
  saveRosterSnapshots();
  renderRoster();
  log('Roster snapshot deleted.', 'warn');
}

function loadAllianceList() {
  try {
    const raw = localStorage.getItem(ALLIANCE_KEY);
    if (raw) {
      const a = JSON.parse(raw);
      if (Array.isArray(a) && a.length === ALLIANCE_COUNT) state.allianceList = a;
    }
  } catch (e) {}
}

function saveAllianceList() {
  try {
    localStorage.setItem(ALLIANCE_KEY, JSON.stringify(state.allianceList));
  } catch (e) {}
}

function loadRosterAuth() {
  try {
    state._rosterLoggedUser = localStorage.getItem(ROSTER_AUTH_KEY) || '';
  } catch (e) {
    state._rosterLoggedUser = '';
  }
}

function saveRosterAuth() {
  try {
    localStorage.setItem(ROSTER_AUTH_KEY, state._rosterLoggedUser);
  } catch (e) {}
}

async function rosterLogin() {
  const user = $id('dashRosterLoginUser')?.value;
  const pass = $id('dashRosterLoginPass')?.value;
  if (!Object.keys(ROSTER_PASS_HASH).length) {
    log('Roster auth is not configured for this deployment.', 'error');
    return;
  }
  if (!user || !ROSTER_PASS_HASH[user]) {
    log('Invalid roster login credentials.', 'error');
    return;
  }
  const hashed = await sha256(pass);
  if (hashed !== ROSTER_PASS_HASH[user]) {
    log('Invalid roster login credentials.', 'error');
    return;
  }
  state._rosterLoggedUser = user;
  saveRosterAuth();
  log('Roster logged in as ' + user, 'success');
  const ai = state.allianceList.indexOf(user);
  if (ai >= 0) state._rosterFilterAlliance = String(ai);
  renderRoster();
}

function rosterLogout() {
  state._rosterLoggedUser = '';
  saveRosterAuth();
  renderRoster();
}

function _ensureMember(m) {
  if (typeof m === 'string')
    return { name: m, status: 'unknown', alliance: -1, verifiedBy: '', lastModified: '' };
  if (m.alliance === undefined) m.alliance = -1;
  if (m.verifiedBy === undefined) m.verifiedBy = '';
  if (m.lastModified === undefined) m.lastModified = '';
  return m;
}

function setRosterStatus(snapIndex, memberIndex, status) {
  const snap = state.rosterSnapshots[snapIndex];
  if (!snap) return;
  let m = snap.members[memberIndex];
  if (!m) return;
  m = snap.members[memberIndex] = _ensureMember(m);
  if (status === 'spy' && m.status === 'spy') status = 'unknown';
  m.status = status;
  if (state._rosterLoggedUser) {
    m.verifiedBy = state._rosterLoggedUser;
    m.lastModified = new Date().toISOString();
  }
  saveRosterSnapshots();
  renderRoster();
}

function setRosterAlliance(snapIndex, memberIndex, allianceIdx) {
  const snap = state.rosterSnapshots[snapIndex];
  if (!snap) return;
  let m = snap.members[memberIndex];
  if (!m) return;
  m = snap.members[memberIndex] = _ensureMember(m);
  m.alliance = m.alliance === allianceIdx ? -1 : allianceIdx;
  if (state._rosterLoggedUser) {
    m.verifiedBy = state._rosterLoggedUser;
    m.lastModified = new Date().toISOString();
  }
  saveRosterSnapshots();
  renderRoster();
}

function toggleBulkCheck(mi) {
  if (state._rosterSelectedIndices.has(mi)) state._rosterSelectedIndices.delete(mi);
  else state._rosterSelectedIndices.add(mi);
  renderRoster();
}

function toggleBulkSelectAll(jsonStr) {
  const indices = JSON.parse(jsonStr);
  if (state._rosterSelectedIndices.size === indices.length) state._rosterSelectedIndices.clear();
  else
    indices.forEach(function (i) {
      state._rosterSelectedIndices.add(i);
    });
  renderRoster();
}

function applyBulkStatus(status) {
  if (!state._rosterSelectedIndices.size) return;
  const snap = state.rosterSnapshots[state.rosterSnapshots.length - 1];
  state._rosterSelectedIndices.forEach(function (mi) {
    let m = snap.members[mi];
    m = snap.members[mi] = _ensureMember(m);
    m.status = status;
    if (state._rosterLoggedUser) {
      m.verifiedBy = state._rosterLoggedUser;
      m.lastModified = new Date().toISOString();
    }
  });
  state._rosterSelectedIndices.clear();
  saveRosterSnapshots();
  renderRoster();
}

function applyBulkAlliance(allianceIdx) {
  if (!state._rosterSelectedIndices.size) return;
  const snap = state.rosterSnapshots[state.rosterSnapshots.length - 1];
  state._rosterSelectedIndices.forEach(function (mi) {
    let m = snap.members[mi];
    m = snap.members[mi] = _ensureMember(m);
    m.alliance = allianceIdx;
    if (state._rosterLoggedUser) {
      m.verifiedBy = state._rosterLoggedUser;
      m.lastModified = new Date().toISOString();
    }
  });
  state._rosterSelectedIndices.clear();
  saveRosterSnapshots();
  renderRoster();
}

function exportRosterCSV() {
  if (!state.rosterSnapshots.length) return;
  const latest = state.rosterSnapshots[state.rosterSnapshots.length - 1];
  let csv = 'Name,Status,Alliance,VerifiedBy,LastModified\n';
  latest.members.forEach(function (m) {
    const mem = _ensureMember(m);
    const a = mem.alliance >= 0 ? state.allianceList[mem.alliance] : '';
    csv +=
      '"' +
      mem.name +
      '","' +
      mem.status +
      '","' +
      a +
      '","' +
      (mem.verifiedBy || '') +
      '","' +
      (mem.lastModified || '') +
      '"\n';
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
  if (!state.rosterSnapshots.length) return;
  const latest = state.rosterSnapshots[state.rosterSnapshots.length - 1];
  const names = latest.members
    .map(function (m) {
      return _ensureMember(m);
    })
    .filter(function (m) {
      return type === 'unassigned' ? m.alliance === -1 : m.status === type;
    })
    .map(function (m) {
      return m.name;
    })
    .join('\n');
  navigator.clipboard.writeText(names);
  log('Copied ' + names.split('\n').length + ' names.', 'success');
}

function showRosterSnapshotModal(index) {
  const snap = state.rosterSnapshots[index];
  const diff = snap.diff;
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  $id('dashModalTitle').textContent = 'Snapshot: ' + snap.date;
  $id('dashModalSub').textContent = snap.members.length + ' members';
  let gridHtml = '';
  snap.members.forEach(function (mem) {
    const mObj = _ensureMember(mem);
    const name = mObj.name;
    const status = mObj.status;
    let cls = 'dash-roster-name';
    if (status === 'trusted') cls += ' trusted';
    if (status === 'spy') cls += ' spy';
    if (
      diff &&
      diff.joined.some(function (j) {
        return j.toLowerCase() === name.trim().toLowerCase();
      })
    )
      cls += ' joined';
    if (
      diff &&
      diff.left.some(function (l) {
        return l.toLowerCase() === name.trim().toLowerCase();
      })
    )
      cls += ' left';
    gridHtml += '<div class="' + cls + '"><span>' + esc(name) + '</span></div>';
  });
  body.innerHTML =
    '<div class="dash-roster-grid">' +
    gridHtml +
    '</div><div style="margin-top:12px;text-align:right"><button class="dash-btn" onclick="closeModal()">Close</button></div>';
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function configureAlliances() {
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  $id('dashModalTitle').textContent = 'Configure Alliances';
  $id('dashModalSub').textContent = 'Name your 5 alliances for member assignment.';
  let inputsHtml = '';
  state.allianceList.forEach(function (a, i) {
    inputsHtml +=
      '<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem"><span style="width:24px;font-weight:700;color:var(--text-muted)">' +
      (i + 1) +
      '</span><input id="dashAllianceInput' +
      i +
      '" class="dash-input" value="' +
      esc(a) +
      '" style="flex:1;padding:6px 10px"></label>';
  });
  body.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px">' +
    inputsHtml +
    '<div style="display:flex;gap:8px;margin-top:8px"><button id="dashAllianceSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">Save</button><button id="dashAllianceCancelBtn" class="dash-btn" style="flex:1">Cancel</button></div></div>';
  $id('dashAllianceSaveBtn').onclick = function () {
    for (var i = 0; i < ALLIANCE_COUNT; i++) {
      var v = $id('dashAllianceInput' + i);
      if (v && v.value.trim()) state.allianceList[i] = v.value.trim();
    }
    saveAllianceList();
    closeModal();
    renderRoster();
  };
  $id('dashAllianceCancelBtn').onclick = closeModal;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderRoster() {
  const body = $id('dashRosterBody');
  if (!body) return;
  if (!state.rosterSnapshots.length) {
    body.innerHTML = `<div class="dash-empty">${esc(adminT('adminRosterEmpty'))}</div>`;
    return;
  }
  const snapIndex = state.rosterSnapshots.length - 1;
  const latest = state.rosterSnapshots[snapIndex];
  const diff = latest.diff;
  const members = latest.members;
  function mn(m) {
    return typeof m === 'string' ? m : m.name;
  }
  function mstatus(m) {
    return typeof m === 'string' ? 'unknown' : m.status || 'unknown';
  }
  function malliance(m) {
    return typeof m === 'string' ? -1 : m.alliance !== undefined ? m.alliance : -1;
  }
  var trusted = 0,
    spy = 0,
    unknown = 0,
    assigned = 0;
  members.forEach(function (m) {
    var s = mstatus(m);
    if (s === 'trusted') trusted++;
    else if (s === 'spy') spy++;
    else unknown++;
    if (malliance(m) >= 0) assigned++;
  });
  var total = members.length;
  var unassigned = total - assigned;
  var ocrMap = {};
  if (state.dashData && state.dashData.players_summary) {
    state.dashData.players_summary.forEach(function (p) {
      ocrMap[p.name.toLowerCase()] = p;
    });
  }
  var filtered = [];
  members.forEach(function (m, mi) {
    var s = mstatus(m);
    var a = malliance(m);
    var name = mn(m);
    if (state._rosterFilterStatus !== 'all' && s !== state._rosterFilterStatus) return;
    if (state._rosterFilterAlliance !== 'all') {
      if (state._rosterFilterAlliance === 'unassigned' && a >= 0) return;
      if (
        state._rosterFilterAlliance !== 'unassigned' &&
        a !== parseInt(state._rosterFilterAlliance)
      )
        return;
    }
    if (
      state._rosterSearchQ &&
      name.toLowerCase().indexOf(state._rosterSearchQ.toLowerCase()) === -1
    )
      return;
    filtered.push({ mi: mi, name: name, status: s, alliance: a });
  });
  var isLoggedIn = !!state._rosterLoggedUser;
  var lockOpenIcon =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
  var lockClosedIcon =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  var loginHtml = isLoggedIn
    ? '<div class="dash-roster-login-bar logged"><span class="dash-roster-login-user">' +
      lockOpenIcon +
      ' ' +
      esc(state._rosterLoggedUser) +
      '</span><button class="dash-btn dash-btn-sm" onclick="rosterLogout()">Logout</button></div>'
    : '<div class="dash-roster-login-bar"><span>' +
      lockClosedIcon +
      ' Roster Login:</span><select id="dashRosterLoginUser">' +
      ROSTER_USERS.map(function (u) {
        return '<option value="' + u + '">' + u + '</option>';
      }).join('') +
      '</select><input type="password" id="dashRosterLoginPass" placeholder="Password" value="" class="dash-input dash-roster-login-pass" style="width:90px"><button class="dash-btn dash-btn-sm" onclick="rosterLogin()">Login</button></div>';
  var bulkHtml = '';
  if (state._rosterSelectedIndices.size > 0 && isLoggedIn) {
    var allyOpts = state.allianceList
      .map(function (a, i) {
        return '<option value="' + i + '">' + esc(a) + '</option>';
      })
      .join('');
    bulkHtml =
      '<div class="dash-roster-bulk-actions"><span style="font-size:0.8rem;font-weight:bold;color:var(--brand)">' +
      state._rosterSelectedIndices.size +
      ' selected:</span><button class="dash-btn dash-btn-sm" onclick="applyBulkStatus(\'trusted\')">Mark Trusted</button><button class="dash-btn dash-btn-sm" onclick="applyBulkStatus(\'spy\')">Mark Spy</button><button class="dash-btn dash-btn-sm" onclick="applyBulkStatus(\'unknown\')">Clear Status</button><select class="dash-input dash-roster-bulk-select" style="width:100px" onchange="if(this.value){applyBulkAlliance(parseInt(this.value));this.value=\'\'}"><option value="">Assign to...</option><option value="-1">— Unassign —</option>' +
      allyOpts +
      '</select></div>';
  }
  var filterAllyOpts = state.allianceList
    .map(function (a, i) {
      return (
        '<option value="' +
        i +
        '"' +
        (state._rosterFilterAlliance === String(i) ? ' selected' : '') +
        '>' +
        esc(a) +
        '</option>'
      );
    })
    .join('');
  var rowsHtml = '';
  var indicesJson = JSON.stringify(
    filtered.map(function (f) {
      return f.mi;
    })
  ).replace(/"/g, '&quot;');
  filtered.forEach(function (item) {
    var mi = item.mi,
      name = item.name,
      status = item.status,
      alliance = item.alliance;
    var m = members[mi];
    var vb = typeof m === 'string' ? '' : m.verifiedBy || '';
    var lm = typeof m === 'string' ? '' : m.lastModified || '';
    var rowCls = 'dash-roster-row';
    if (status === 'trusted') rowCls += ' trusted';
    if (status === 'spy') rowCls += ' spy';
    if (
      diff &&
      diff.joined.some(function (j) {
        return j.toLowerCase() === name.trim().toLowerCase();
      })
    )
      rowCls += ' joined';
    if (
      diff &&
      diff.left.some(function (l) {
        return l.toLowerCase() === name.trim().toLowerCase();
      })
    )
      rowCls += ' left';
    var disabledAttr = isLoggedIn ? '' : 'disabled';
    var swordIcon =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px" aria-hidden="true"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/></svg>';
    var pStats = ocrMap[name.toLowerCase()];
    var ocrHtml = pStats
      ? '<span style="margin-left:6px;font-size:0.7rem;color:var(--brand-light)" title="' +
        pStats.total_demolition +
        ' Demolition / ' +
        pStats.participation_count +
        ' Attacks">' +
        swordIcon +
        ' ' +
        pStats.total_demolition +
        '</span>'
      : '<span style="margin-left:6px;font-size:0.7rem;opacity:0.25" title="No OCR data">' +
        swordIcon +
        ' —</span>';
    var auditHtml = '';
    if (vb)
      auditHtml +=
        '<span class="dash-roster-row-vb" title="Verified by ' +
        esc(vb) +
        (lm ? ' on ' + lm.slice(0, 10) : '') +
        '">@' +
        esc(vb) +
        '</span>';
    var allySelectHtml =
      '<select class="dash-roster-row-alliance" ' +
      disabledAttr +
      ' onchange="setRosterAlliance(' +
      snapIndex +
      ',' +
      mi +
      ',parseInt(this.value))"><option value="-1">—</option>' +
      state.allianceList
        .map(function (a, ai) {
          return (
            '<option value="' +
            ai +
            '"' +
            (alliance === ai ? ' selected' : '') +
            '>' +
            esc(a) +
            '</option>'
          );
        })
        .join('') +
      '</select>';
    rowsHtml +=
      '<div class="' +
      rowCls +
      '"><label style="margin-right:8px;display:flex;align-items:center;cursor:pointer"><input type="checkbox" class="bulk-cb" onchange="toggleBulkCheck(' +
      mi +
      ')"' +
      (state._rosterSelectedIndices.has(mi) ? ' checked' : '') +
      ' ' +
      disabledAttr +
      '></label><span class="dash-roster-row-name" style="flex:1">' +
      esc(name) +
      ocrHtml +
      '</span>' +
      allySelectHtml +
      auditHtml +
      '<span class="dash-roster-row-spy' +
      (status === 'spy' ? ' active' : '') +
      '" onclick="setRosterStatus(' +
      snapIndex +
      ',' +
      mi +
      ',\'spy\')" title="Toggle spy">🚫</span></div>';
  });
  var historyHtml = '';
  for (var i = state.rosterSnapshots.length - 2; i >= 0; i--) {
    var s = state.rosterSnapshots[i];
    var d = s.diff;
    historyHtml +=
      '<div class="dash-roster-history-item"><span class="dash-roster-history-date">' +
      esc(s.date) +
      '</span><span class="dash-roster-history-count">' +
      s.members.length +
      '</span>' +
      (d
        ? '<span class="dash-roster-history-diff">+' +
          d.joined.length +
          '/-' +
          d.left.length +
          '</span>'
        : '<span class="dash-roster-history-diff" style="opacity:0.4">—</span>') +
      '<button class="dash-btn" style="padding:2px 8px;font-size:0.7rem" onclick="showRosterSnapshotModal(' +
      i +
      ')">View</button><button class="dash-banner-del-btn" onclick="event.stopPropagation();deleteRosterSnapshot(' +
      i +
      ')" title="Delete">✕</button></div>';
  }
  if (!historyHtml)
    historyHtml =
      '<div style="padding:8px;font-size:0.8rem;color:var(--text-muted)">No older snapshots.</div>';
  body.innerHTML =
    loginHtml +
    '<div class="dash-roster-summary"><span class="dash-roster-summary-total">Total: ' +
    total +
    '</span><span class="dash-roster-summary-trusted">✅ ' +
    trusted +
    ' Trusted</span><span class="dash-roster-summary-unknown">⬜ ' +
    unknown +
    ' Unknown</span><span class="dash-roster-summary-spy">🚫 ' +
    spy +
    ' Spy</span><span class="dash-roster-summary-assigned">📋 ' +
    assigned +
    ' Assigned</span><span class="dash-roster-summary-unassigned">❓ ' +
    unassigned +
    ' Unassigned</span><button class="dash-banner-del-btn" onclick="if(confirm(\'Delete this snapshot?\'))deleteRosterSnapshot(' +
    snapIndex +
    ')" title="Delete current snapshot" style="margin-left:auto">✕</button></div>' +
    '<div class="dash-roster-toolbar"><div class="dash-roster-toolbar-filters"><label class="dash-roster-toolbar-label">Alliance <select onchange="setRosterFilter(\'alliance\',this.value)"><option value="all">All</option>' +
    filterAllyOpts +
    '<option value="unassigned"' +
    (state._rosterFilterAlliance === 'unassigned' ? ' selected' : '') +
    '>Unassigned</option></select></label><label class="dash-roster-toolbar-label">Status <select onchange="setRosterFilter(\'status\',this.value)"><option value="all">All</option><option value="trusted"' +
    (state._rosterFilterStatus === 'trusted' ? ' selected' : '') +
    '>Trusted</option><option value="unknown"' +
    (state._rosterFilterStatus === 'unknown' ? ' selected' : '') +
    '>Unknown</option><option value="spy"' +
    (state._rosterFilterStatus === 'spy' ? ' selected' : '') +
    '>Spy</option></select></label><input type="text" placeholder="Search name..." value="' +
    esc(state._rosterSearchQ) +
    '" oninput="setRosterFilter(\'search\',this.value)" class="dash-input dash-roster-search-input" style="width:140px"></div><div class="dash-roster-toolbar-actions">' +
    bulkHtml +
    '<button class="dash-btn dash-btn-sm" onclick="configureAlliances()" title="Edit alliance names">⚙️</button><button class="dash-btn dash-btn-sm" onclick="copyRosterNames(\'unassigned\')" title="Copy unassigned names">📋 Unassigned</button><button class="dash-btn dash-btn-sm" onclick="copyRosterNames(\'spy\')" title="Copy spy names">📋 Spies</button></div></div>' +
    '<div class="dash-roster-checklist"><div style="padding:4px 12px;border-bottom:1px solid var(--border);margin-bottom:4px;display:flex;align-items:center"><input type="checkbox" title="Select all visible" onchange="toggleBulkSelectAll(\'' +
    indicesJson +
    '\')"' +
    (state._rosterSelectedIndices.size > 0 && state._rosterSelectedIndices.size === filtered.length
      ? ' checked'
      : '') +
    ' style="margin-right:12px"><span style="font-size:0.75rem;color:var(--text-muted);font-weight:bold">SELECT ALL VISIBLE</span></div>' +
    rowsHtml +
    (filtered.length === 0
      ? '<div class="dash-roster-empty">No members match filters.</div>'
      : '') +
    '</div>' +
    '<div class="dash-roster-total-rows">Showing ' +
    filtered.length +
    ' of ' +
    total +
    ' members</div>' +
    "<div class=\"dash-roster-history\"><div class=\"dash-roster-history-head\" onclick=\"var b=this.nextElementSibling;b.classList.toggle('open');this.querySelector('.dash-roster-history-arrow').textContent=b.classList.contains('open')?'▼':'▶'\"><span>📁 Snapshot History (" +
    (state.rosterSnapshots.length - 1) +
    ' older)</span><span class="dash-roster-history-arrow">▶</span></div><div class="dash-roster-history-body">' +
    historyHtml +
    '</div></div>';
}

function loadBannerRecords() {
  try {
    const raw = localStorage.getItem(BANNER_KEY);
    state.bannerRecords = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.bannerRecords)) state.bannerRecords = [];
  } catch (e) {
    state.bannerRecords = [];
  }
}

function saveBannerRecords(options = {}) {
  try {
    localStorage.setItem(BANNER_KEY, JSON.stringify(state.bannerRecords));
  } catch (e) {}
  return syncDashboardAuxiliaryRecords(options);
}

function showBannerForm(existingIndex = null) {
  const m = $id('dashModal'),
    body = $id('dashModalBody');
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
  const edit = existingIndex !== null && state.bannerRecords[existingIndex];
  $id('dashModalTitle').textContent = edit ? 'Edit Banner Day' : 'New Banner Day';
  $id('dashModalSub').textContent = edit
    ? ''
    : 'Record banner assignments for a structure attack day.';
  const roster = state.rosterSnapshots.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1].members
    : [];
  const memberOptions = canonicalizePlayerOptionNames(roster)
    .map((name) => `<option value="${esc(name)}">${esc(name)}</option>`)
    .join('');
  const rec = edit
    ? state.bannerRecords[existingIndex]
    : { date: new Date().toISOString().slice(0, 10), event: '', teams: {} };
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
      ${
        teamNames.length
          ? teamNames
              .map(
                (team, ti) => `<div class="dash-banner-form-row" data-team-idx="${ti}">
        <label>Team</label>
        <input type="text" class="dash-banner-team-name" value="${esc(team)}" placeholder="Dawn/Dusk/Etc" style="flex:1">
        <label style="min-width:40px">Members</label>
        <select class="dash-banner-team-members" multiple style="flex:2;min-height:60px">${memberOptions}</select>
        <button class="dash-banner-del-btn dash-banner-remove-team" style="font-size:1rem">✕</button>
      </div>`
              )
              .join('')
          : '<div style="color:var(--text-dim);font-size:0.85rem;text-align:center;padding:1rem">No teams added yet. Add a team below.</div>'
      }
    </div>
    <button id="dashBannerAddTeamBtn" class="dash-btn" style="margin-top:0.5rem;width:100%">+ Add Team</button>
  </div>
  <div style="display:flex;gap:0.5rem">
    <button id="dashBannerSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">${edit ? 'Update' : 'Save'} Banner Day</button>
    <button id="dashBannerFormCancelBtn" class="dash-btn" style="flex:1">Cancel</button>
  </div>`;

  $id('dashBannerAddTeamBtn').onclick = () => {
    const list = $id('dashBannerTeamsList');
    const firstEmpty = list.querySelector('.dash-empty');
    if (firstEmpty) firstEmpty.remove();
    const div = document.createElement('div');
    div.className = 'dash-banner-form-row';
    div.innerHTML = `<label>Team</label>
      <input type="text" class="dash-banner-team-name" value="" placeholder="Dawn/Dusk/Etc" style="flex:1">
      <label style="min-width:40px">Members</label>
      <select class="dash-banner-team-members" multiple style="flex:2;min-height:60px">${memberOptions}</select>
      <button class="dash-banner-del-btn dash-banner-remove-team" style="font-size:1rem">✕</button>`;
    div.querySelector('.dash-banner-remove-team').onclick = () => div.remove();
    list.appendChild(div);
  };
  document
    .querySelectorAll('.dash-banner-remove-team')
    .forEach((btn) => (btn.onclick = () => btn.closest('.dash-banner-form-row').remove()));

  $id('dashBannerSaveBtn').onclick = async () => {
    const date = $id('dashBannerFormDate').value;
    const event = $id('dashBannerFormEvent').value.trim();
    const teamRows = document.querySelectorAll('#dashBannerTeamsList .dash-banner-form-row');
    const teams = {};
    let hasError = false;
    teamRows.forEach((row) => {
      const name = row.querySelector('.dash-banner-team-name').value.trim();
      if (!name) return;
      const sel = row.querySelector('.dash-banner-team-members');
      const members = Array.from(sel.selectedOptions).map((o) => o.value);
      if (!members.length) return;
      teams[name] = members;
    });
    if (!Object.keys(teams).length) {
      alert('Add at least one team with members.');
      return;
    }
    const record = { date, event, teams };
    if (edit) {
      state.bannerRecords[existingIndex] = record;
    } else {
      state.bannerRecords.push(record);
    }
    const saveBtn = $id('dashBannerSaveBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    const synced = await saveBannerRecords({ immediate: true, awaitCloud: true });
    closeModal();
    renderBanners();
    log(
      `Banner day ${edit ? 'updated' : 'saved'}: ${date}${event ? ' - ' + event : ''}`,
      'success'
    );
    notifySpecialListCloudResult(synced, 'Banner day');
  };
  $id('dashBannerFormCancelBtn').onclick = closeModal;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function deleteBannerRecord(index) {
  if (!confirm('Delete this banner record?')) return;
  state.bannerRecords.splice(index, 1);
  saveBannerRecords();
  renderBanners();
  log('Banner record deleted.', 'warn');
}

function renderBanners() {
  const body = $id('dashBannerBody');
  if (!body) return;
  if (!state.bannerRecords.length) {
    body.innerHTML =
      '<div class="dash-empty">No banner records yet. Click "New Banner Day" to start tracking.</div>';
    return;
  }
  let html = '';
  for (let i = state.bannerRecords.length - 1; i >= 0; i--) {
    const rec = state.bannerRecords[i];
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
        <table class="dash-banner-table dash-banner-team-table">
          <thead><tr><th>Team</th><th>Members</th><th>Count</th></tr></thead>
          <tbody>
            ${teamEntries
              .map(
                ([team, members]) => `<tr>
              <td><span class="dash-banner-team-tag" style="background:${getTeamColor(team)};color:#fff">${esc(team)}</span></td>
              <td>${members.map((m) => esc(m)).join(', ')}</td>
              <td style="text-align:right;font-weight:700;color:var(--text-muted)">${members.length}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }
  body.innerHTML = html;
  hydrateDashboardTableLabels(body);
}

function getTeamColor(teamName) {
  const colors = {
    dawn: '#f59e0b',
    dusk: '#6366f1',
    ice: '#06b6d4',
    fire: '#ef4444',
    frost: '#0ea5e9',
    ember: '#f97316',
    storm: '#8b5cf6',
    shadow: '#6b7280',
    light: '#eab308',
    void: '#8b5cf6',
    crystal: '#14b8a6',
    iron: '#64748b',
  };
  const key = teamName.toLowerCase().trim();
  return colors[key] || `hsl(${Math.abs(hashCode(teamName)) % 360}, 55%, 50%)`;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash |= 0;
  }
  return Math.abs(hash);
}

const DUTY_TYPES = {
  banner: {
    labelKey: 'adminBannerListTitle',
    singularKey: 'adminDutyBannerSingular',
    bodyId: 'dashBannerListBody',
    progressId: 'dashBannerListProgress',
    progressTextId: 'dashBannerListProgressText',
  },
  pather: {
    labelKey: 'adminPatherListTitle',
    singularKey: 'adminDutyPlanSingular',
    bodyId: 'dashPatherListBody',
    progressId: 'dashPatherListProgress',
    progressTextId: 'dashPatherListProgressText',
    recordTypes: ['pather', 'speed_tile'],
  },
  speed_tile: {
    labelKey: 'adminPatherListTitle',
    singularKey: 'adminDutyPlanSingular',
    bodyId: 'dashPatherListBody',
    progressId: 'dashPatherListProgress',
    progressTextId: 'dashPatherListProgressText',
  },
  shield_wall: {
    labelKey: 'adminShieldWallTitle',
    singularKey: 'adminDutyShieldWallSingular',
    bodyId: 'dashShieldWallBody',
  },
};

function dutyLabel(type) {
  const meta = DUTY_TYPES[type];
  return meta ? adminT(meta.labelKey) : '';
}

function dutySingular(type) {
  const meta = DUTY_TYPES[type];
  return meta ? adminT(meta.singularKey) : '';
}

function loadDutyRecords() {
  try {
    const raw = localStorage.getItem(DUTY_LIST_KEY);
    state.dutyRecords = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.dutyRecords)) state.dutyRecords = [];
  } catch (e) {
    state.dutyRecords = [];
  }
}

function saveDutyRecords(options = {}) {
  try {
    localStorage.setItem(DUTY_LIST_KEY, JSON.stringify(state.dutyRecords));
  } catch (e) {}
  return syncDashboardAuxiliaryRecords(options);
}

function getRosterMemberName(member) {
  if (!member) return '';
  if (typeof member === 'string') return member.trim();
  return String(member.name || '').trim();
}

function getRosterDatabaseNames() {
  const names = [];
  const latest = state.rosterSnapshots.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1]
    : null;
  if (latest && Array.isArray(latest.members)) {
    latest.members.forEach((member) => {
      const name = getRosterMemberName(member);
      if (name) names.push(name);
    });
  }
  if (Array.isArray(state.rosterNames)) {
    state.rosterNames.forEach((name) => {
      const text = String(name || '').trim();
      if (text) names.push(text);
    });
  }
  return canonicalizePlayerOptionNames(names);
}

function normalizeDutyName(name) {
  return compactPlayerIdentity(name);
}

function getDutySuggestions(rawName) {
  const roster = getRosterDatabaseNames();
  const raw = String(rawName || '').trim();
  if (!raw || !roster.length) return [];
  const canonical = findBestMatch(raw, 55);
  const rows = roster.map((name) => {
    const compactScore = getSimilarityAlphaNum(raw, name);
    const textScore = getSimilarity(raw.toLowerCase(), name.toLowerCase());
    const canonicalBoost = canonical === name ? 0.15 : 0;
    return { name, score: Math.min(1, Math.max(compactScore, textScore) + canonicalBoost) };
  });
  if (canonical && !rows.some((row) => row.name === canonical))
    rows.push({ name: canonical, score: 0.75 });
  return rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 8);
}

function getDutyMatchStatus(rawName, confirmedName) {
  if (!confirmedName) return 'unmatched';
  const rawKey = normalizeDutyName(rawName);
  const confirmedKey = normalizeDutyName(confirmedName);
  if (rawKey && rawKey === confirmedKey) return 'exact';
  const score = Math.max(
    getSimilarityAlphaNum(rawName, confirmedName),
    getSimilarity(String(rawName || '').toLowerCase(), String(confirmedName || '').toLowerCase())
  );
  if (score >= 0.72) return 'likely';
  if (score >= 0.45) return 'weak';
  return 'manual';
}

function parseDutyNamesFromText(text) {
  return parseDutyEntriesFromText(text).map((entry) => entry.name);
}

function normalizeDutyUsageTime(rawTime) {
  const text = String(rawTime || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{1,2})(?:[.:](\d{1,2}))?$/);
  if (!match) return text;
  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return text;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return text;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeDutyGameTime(rawTime) {
  const text = String(rawTime || '').trim();
  if (!text) return '';
  const normalized = normalizeDutyUsageTime(text.replace(/\s*GT$/i, ''));
  return normalized ? `${normalized} GT` : text;
}

function parseDutyEntryFromLine(line, context = {}) {
  let text = String(line || '')
    .replace(/^\s*[-*\u2022]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (/^@all\b/i.test(text)) return null;
  if (/^speed\s+tile\s+order:?$/i.test(text)) return null;

  let order = '';
  const orderMatch = text.match(/^(\d+)[.)-]\s*/);
  if (orderMatch) {
    order = orderMatch[1];
    text = text.slice(orderMatch[0].length).trim();
  }

  let usageTime = '';
  const timeMatch = text.match(/^\+?\s*(\d{1,2}(?:[.:]\d{1,2})?)\b/);
  if (timeMatch) {
    usageTime = normalizeDutyUsageTime(timeMatch[1]);
    text = text.slice(timeMatch[0].length).trim();
  } else if (!order) {
    text = text.replace(/^\s*\d+[.)-]\s*/, '').trim();
  }

  const checked = /[✅✓✔]/.test(text);
  text = text
    .replace(/[✅✓✔]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let pad = '';
  text = text
    .replace(/\[Pad:\s*([^\]]+)\]/i, (_, value) => {
      pad = String(value || '').trim();
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();

  const bracketValues = [];
  text = text
    .replace(/\[([^\]]+)\]/g, (_, value) => {
      const clean = String(value || '').trim();
      if (clean) bracketValues.push(clean);
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();

  let name = '';
  const atMatch = text.match(/@(.+)$/);
  if (atMatch) {
    name = atMatch[1].trim();
    text = text.slice(0, atMatch.index).trim();
  } else {
    name = text.trim();
    text = '';
  }

  const target = text.replace(/\s+/g, ' ').trim();
  name = name.replace(/^@+/, '').trim();
  if (!name || name.length <= 1) return null;
  return {
    name,
    original: line,
    usageTime,
    target,
    group: context.group || '',
    groupCount: context.groupCount || '',
    order,
    pad,
    checked,
    allowedColors: bracketValues.join(', '),
  };
}

function parseDutyEntriesFromText(text) {
  const entries = [];
  const context = { group: '', groupCount: '' };
  String(text || '')
    .split(/\r?\n|,/)
    .forEach((line) => {
      const groupMatch = String(line || '')
        .trim()
        .match(/^([^:\[\]]+):(?:\s*\[([^\]]+)\])?\s*$/);
      if (groupMatch && !/^\d+[.)-]/.test(String(line || '').trim())) {
        context.group = groupMatch[1].trim();
        context.groupCount = String(groupMatch[2] || '').trim();
        return;
      }
      const entry = parseDutyEntryFromLine(line, context);
      if (entry) entries.push(entry);
    });
  const seen = new Set();
  return entries.filter((entry) => {
    const key =
      `${entry.name}|${entry.usageTime}|${entry.target}|${entry.group}|${entry.order}|${entry.pad}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function showDutyPasteForm(type) {
  const meta = DUTY_TYPES[type];
  if (!meta) return;
  const label = dutyLabel(type);
  const text = prompt(adminT('adminDutyPastePrompt', { label }), '');
  if (text === null) return;
  const entries = parseDutyEntriesFromText(text);
  if (!entries.length) {
    log(adminT('adminDutyNoNamesLog', { label }), 'warn');
    return;
  }
  showDutyConfirmModal(type, entries, adminT('adminDutyManualPaste'));
}

function normalizeDutyEntries(input) {
  const rows = Array.isArray(input) ? input : [];
  return rows
    .map((item) => {
      if (item && typeof item === 'object') {
        const original = String(item.original || item.name || '').trim();
        const name = String(item.name || item.original || item.confirmed || '').trim();
        return {
          name,
          original: original || name,
          confirmed: String(item.confirmed || '').trim(),
          usageTime: normalizeDutyUsageTime(item.usageTime || item.usage_time || item.time || ''),
          target: String(item.target || item.structure || item.location || '').trim(),
          group: String(item.group || item.color || item.tileColor || item.tile_color || '').trim(),
          groupCount: String(
            item.groupCount || item.group_count || item.count || item.capacity || ''
          ).trim(),
          order: String(item.order || item.index || '').trim(),
          pad: String(item.pad || item.padLocation || item.pad_location || '').trim(),
          checked: Boolean(item.checked || item.done || item.confirmedUsage),
          allowedColors: Array.isArray(item.allowedColors || item.allowed_colors)
            ? (item.allowedColors || item.allowed_colors).join(', ')
            : String(item.allowedColors || item.allowed_colors || '').trim(),
          status: item.status || '',
        };
      }
      const name = String(item || '').trim();
      return {
        name,
        original: name,
        confirmed: '',
        usageTime: '',
        target: '',
        group: '',
        groupCount: '',
        order: '',
        pad: '',
        checked: false,
        allowedColors: '',
        status: '',
      };
    })
    .filter((entry) => entry.name);
}

function renderDutyMatchRows(entries) {
  return entries
    .map((entry, index) => {
      const rawName = entry.name;
      const suggestions = getDutySuggestions(rawName);
      const best = entry.confirmed || suggestions[0]?.name || '';
      const status = getDutyMatchStatus(rawName, best);
      const options = [`<option value="">${esc(adminT('adminDutyMatchUnmatchedOption'))}</option>`]
        .concat(
          suggestions.map(
            (row) =>
              `<option value="${esc(row.name)}"${row.name === best ? ' selected' : ''}>${esc(row.name)} (${Math.round(row.score * 100)}%)</option>`
          )
        )
        .join('');
      return `<div class="dash-duty-match-row" data-raw="${esc(entry.original || rawName)}" data-name="${esc(rawName)}" data-order="${esc(entry.order || '')}" data-checked="${entry.checked ? '1' : ''}" data-allowed-colors="${esc(entry.allowedColors || '')}">
      <div class="dash-duty-raw"><span>${esc(adminT('adminDutyUploaded'))} #${index + 1}</span><strong>${esc(rawName)}</strong><small>${esc(status)}</small></div>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyRosterMatch'))}</span><select class="dash-duty-match-select">${options}</select></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyManualCorrectionPh'))}</span><input class="dash-duty-manual-input" type="text" placeholder="${esc(adminT('adminDutyManualCorrectionPh'))}" value="${entry.confirmed && !suggestions.some((row) => row.name === entry.confirmed) ? esc(entry.confirmed) : ''}"></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyTime'))}</span><input class="dash-duty-time-input" type="text" placeholder="HH:MM" value="${esc(entry.usageTime || '')}" title="${esc(adminT('adminDutyUsageTimeTitle'))}"></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyTarget'))}</span><input class="dash-duty-target-input" type="text" placeholder="${esc(adminT('adminDutyTarget'))}" value="${esc(entry.target || '')}" title="${esc(adminT('adminDutyTargetTitle'))}"></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyGroup'))}</span><input class="dash-duty-group-input" type="text" placeholder="${esc(adminT('adminDutyGroup'))}" value="${esc(entry.group || '')}" title="${esc(adminT('adminDutyGroupTitle'))}"></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyPad'))}</span><input class="dash-duty-pad-input" type="text" placeholder="${esc(adminT('adminDutyPad'))}" value="${esc(entry.pad || '')}" title="${esc(adminT('adminDutyPadTitle'))}"></label>
    </div>`;
    })
    .join('');
}

function showDutyConfirmModal(type, names, sourceLabel = '', existingRecordId = null) {
  const meta = DUTY_TYPES[type];
  if (!meta) return;
  const cleanEntries = normalizeDutyEntries(names);
  if (!cleanEntries.length) return;
  const existingRecord = existingRecordId
    ? state.dutyRecords.find((record) => record.id === existingRecordId)
    : null;
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  const label = dutyLabel(type);
  const singular = dutySingular(type);
  $id('dashModalTitle').textContent = adminT(
    existingRecord ? 'adminDutyEditTitle' : 'adminDutyConfirmTitle',
    { label }
  );
  $id('dashModalSub').textContent = adminT('adminDutyConfirmSub', { count: cleanEntries.length });
  body.innerHTML = `<div class="dash-banner-form-row">
    <label>${esc(adminT('adminDutyDateLabel'))}</label>
    <input type="date" id="dashDutyDate" value="${existingRecord?.date || new Date().toISOString().slice(0, 10)}" style="flex:1">
  </div>
  <div class="dash-banner-form-row">
    <label>${esc(adminT('adminDutyNoteLabel'))}</label>
    <input type="text" id="dashDutyNote" value="${esc(existingRecord?.note || sourceLabel)}" placeholder="${esc(adminT('adminDutyNotePh'))}" style="flex:1">
  </div>
  <div class="dash-banner-form-row">
    <label>${esc(adminT('adminDutyGameTimeLabel'))}</label>
    <input type="text" id="dashDutyGameTime" value="${esc(existingRecord?.gameTime || '')}" placeholder="${esc(adminT('adminDutyGameTimePh'))}" style="flex:1">
  </div>
  <div class="dash-duty-match-list">${renderDutyMatchRows(cleanEntries)}</div>
  <div style="display:flex;gap:0.5rem;margin-top:1rem">
    <button id="dashDutySaveBtn" class="dash-btn dash-btn-primary" style="flex:1">${esc(adminT(existingRecord ? 'adminDutyUpdateRecord' : 'adminDutySaveRecord', { singular }))}</button>
    <button id="dashDutyCancelBtn" class="dash-btn" style="flex:1">${esc(adminT('adminCancel'))}</button>
  </div>`;
  $id('dashDutySaveBtn').onclick = async () => {
    const entries = Array.from(body.querySelectorAll('.dash-duty-match-row')).map((row) => {
      const original = row.dataset.raw || '';
      const rawName = row.dataset.name || original;
      const manual = row.querySelector('.dash-duty-manual-input')?.value.trim() || '';
      const selected = row.querySelector('.dash-duty-match-select')?.value || '';
      const confirmed = manual || selected;
      const usageTime = normalizeDutyUsageTime(
        row.querySelector('.dash-duty-time-input')?.value || ''
      );
      const target = row.querySelector('.dash-duty-target-input')?.value.trim() || '';
      const group = row.querySelector('.dash-duty-group-input')?.value.trim() || '';
      const pad = row.querySelector('.dash-duty-pad-input')?.value.trim() || '';
      const order = row.dataset.order || '';
      const checked = row.dataset.checked === '1';
      const allowedColors = row.dataset.allowedColors || '';
      return {
        name: rawName,
        original,
        confirmed,
        usageTime,
        target,
        group,
        order,
        pad,
        checked,
        allowedColors,
        status: getDutyMatchStatus(rawName, confirmed),
        note: '',
      };
    });
    const record = {
      id: existingRecord?.id || `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      date: $id('dashDutyDate')?.value || new Date().toISOString().slice(0, 10),
      gameTime: normalizeDutyGameTime($id('dashDutyGameTime')?.value || ''),
      note: $id('dashDutyNote')?.value.trim() || '',
      entries,
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existingRecord) {
      const index = state.dutyRecords.findIndex((item) => item.id === existingRecord.id);
      if (index >= 0) state.dutyRecords[index] = record;
    } else {
      state.dutyRecords.push(record);
    }
    const saveBtn = $id('dashDutySaveBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    const synced = await saveDutyRecords({ immediate: true, awaitCloud: true });
    closeModal();
    renderDutyRecords();
    refreshDashboardOverview();
    log(
      adminT(existingRecord ? 'adminDutyUpdatedLog' : 'adminDutySavedLog', {
        label,
        count: entries.length,
      }),
      'success'
    );
    notifySpecialListCloudResult(synced, label);
  };
  $id('dashDutyCancelBtn').onclick = closeModal;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function processDutyImages(type, files) {
  const meta = DUTY_TYPES[type];
  if (!meta) return;
  const label = dutyLabel(type);
  if (state._dutyProcessing) {
    log(adminT('adminDutyOcrAlreadyRunning'), 'warn');
    return;
  }
  const valid = getSupportedOcrImageFiles(files);
  if (!valid.length) {
    const rejected = describeRejectedOcrImageFiles(files);
    log(
      rejected.length
        ? `No supported ${label} image selected. Use PNG, JPG, or WebP. Rejected: ${rejected.slice(0, 3).join(', ')}`
        : `No ${label} image selected.`,
      'warn'
    );
    return;
  }
  state._dutyProcessing = true;
  const progress = meta.progressId ? $id(meta.progressId) : null;
  const progressText = meta.progressTextId ? $id(meta.progressTextId) : null;
  if (progress) progress.classList.remove('hidden');
  log(adminT('adminDutyScanningImagesLog', { count: valid.length, label }), 'info');
  let allEntries = [];
  for (let i = 0; i < valid.length; i++) {
    const file = valid[i];
    if (progressText)
      progressText.textContent = adminT('adminDutyScanningImageProgress', {
        label,
        current: i + 1,
        total: valid.length,
      });
    const imageUrl = await readOcrImageDataUrl(file);
    try {
      const promptTxt = `Extract duty usage rows from this ${label} screenshot.

Return ONLY valid JSON in this shape:
{"entries":[{"name":"Name One","time":"23:25","target":"Gate l5","group":"Pink","order":"1","pad":"1253:645","checked":true,"allowedColors":"Red, light blue, brown"}]}

Rules:
- Include every visible player name or nickname.
- When a row starts with a time like +23.25, +23:55, +2, +2.35, +3, +4, or +8, convert it to HH:MM as the "time" field.
- Put the structure or assignment between the time and name in "target", for example "Gate l5", "Gate l2", or "bridge".
- For speed tile plans, preserve section headings like Pink, Yellow, Light Green, Dark Green, or Other as "group"; preserve list order numbers as "order"; preserve [Pad: 1253:645] as "pad"; preserve color brackets as "allowedColors"; set "checked" true when a green check mark is visible.
- If the row has no target, use an empty string.
- Ignore headers, roles, scores, alliance names, and decorative text.
- Preserve symbols and spacing in names when visible.
- Remove duplicates.
- If no player names are visible, return {"entries":[]}.`;
      const raw = await qwenVisionRequest([
        {
          role: 'user',
          content: [
            { type: 'text', text: promptTxt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ]);
      const text = raw?.choices?.[0]?.message?.content || '';
      const cleaned = text
        .replace(/```(?:json)?\s*/gi, '')
        .replace(/```/g, '')
        .trim();
      let parsed;
      try {
        parsed = tryRepairJson(cleaned);
      } catch (e) {
        parsed = parseDutyEntriesFromText(cleaned);
      }
      const entries = Array.isArray(parsed)
        ? parsed.every((item) => typeof item === 'string')
          ? parseDutyEntriesFromText(parsed.join('\n'))
          : normalizeDutyEntries(parsed)
        : Array.isArray(parsed?.entries)
          ? normalizeDutyEntries(parsed.entries)
          : Array.isArray(parsed?.names)
            ? parseDutyEntriesFromText(parsed.names.join('\n'))
            : [];
      allEntries.push(...entries);
    } catch (e) {
      log(
        adminT('adminDutyOcrErrorLog', {
          label,
          file: file.name,
          error: describeOcrRequestError(e),
        }),
        'error'
      );
    }
  }
  if (progress) progress.classList.add('hidden');
  state._dutyProcessing = false;
  const unique = normalizeDutyEntries(allEntries);
  if (!unique.length) {
    log(adminT('adminDutyNoNamesInImagesLog', { label }), 'warn');
    alert(adminT('adminDutyExtractFailedAlert', { label }));
    return;
  }
  showDutyConfirmModal(type, unique, valid.map((f) => f.name).join(', '));
}

function editDutyRecord(id) {
  const record = state.dutyRecords.find((item) => item.id === id);
  if (!record) return;
  const entries = (record.entries || []).map((entry) => ({
    ...entry,
    name: entry.name || entry.confirmed || entry.original || '',
  }));
  showDutyConfirmModal(record.type, entries, record.note || '', record.id);
}

function deleteDutyRecord(id) {
  const index = state.dutyRecords.findIndex((record) => record.id === id);
  if (index < 0) return;
  if (!confirm(adminT('adminDutyDeleteConfirm'))) return;
  state.dutyRecords.splice(index, 1);
  saveDutyRecords();
  renderDutyRecords();
  refreshDashboardOverview();
  log(adminT('adminDutyDeletedLog'), 'warn');
}

function dutyRecordTypesFor(type) {
  const meta = DUTY_TYPES[type];
  return meta?.recordTypes || [type];
}

function dutyRecordsForType(type) {
  const recordTypes = dutyRecordTypesFor(type);
  return (state.dutyRecords || []).filter((record) => recordTypes.includes(record.type));
}

function summarizeDutyValues(values, limit = 3) {
  const clean = Array.from(
    new Set(values.map((value) => String(value || '').trim()).filter(Boolean))
  );
  if (!clean.length) return '<span style="color:var(--text-dim)">--</span>';
  const visible = clean.slice(0, limit).map(esc).join(', ');
  return clean.length > limit ? `${visible} +${clean.length - limit}` : visible;
}

function getDutyEntryCreditedNames(entry) {
  const raw = entry?.name || entry?.original || '';
  const confirmed = String(entry?.confirmed || '').trim();
  return confirmed ? getDutyCreditedNames(raw, confirmed) : expandDutyRawNames(raw);
}

function resolveDutySummaryIdentity(name) {
  try {
    const identity = resolveCanonicalPlayerIdentity(name);
    return {
      ...identity,
      playerKey: getSpecialAccountIdentityKey(identity.playerName, identity.playerKey),
    };
  } catch {
    const playerName = String(name || '').trim();
    const playerKey = getSpecialAccountIdentityKey(playerName, compactPlayerIdentity(playerName));
    return playerKey ? { playerKey, playerName } : null;
  }
}

function collectDutyPlayerSummary(records) {
  const rows = [];
  records.forEach((record) => {
    const entries = Array.isArray(record.entries) ? record.entries : [];
    entries.forEach((entry) => {
      // Confirmed rows still go through the duty resolver so owner/operator
      // dual credit and special account identity stay consistent.
      const credited = getDutyEntryCreditedNames(entry);
      credited.forEach((name) => {
        rows.push({
          ...entry,
          name,
          time: entry.usageTime || record.gameTime,
        });
      });
    });
  });
  return summarizeCanonicalPlayerRecords(rows, {
    timeField: 'time',
    preserveSpecialAccounts: true,
  });
}

function renderDutyPlayerSummary(type, hostId) {
  const host = $id(hostId);
  if (!host) return;
  const records = dutyRecordsForType(type).slice().reverse();
  if (!records.length) {
    host.innerHTML = '';
    return;
  }
  const rows = collectDutyPlayerSummary(records);
  const totalRows = rows.reduce((sum, row) => sum + row.entries, 0);
  const latest = records[0]?.date || '--';
  host.innerHTML = `<div class="dash-duty-upload-summary">
    <div class="dash-duty-summary-kpis">
      <div class="dash-duty-summary-kpi"><strong>${records.length}</strong><span>uploads</span></div>
      <div class="dash-duty-summary-kpi"><strong>${totalRows}</strong><span>entries</span></div>
      <div class="dash-duty-summary-kpi"><strong>${rows.length}</strong><span>players</span></div>
      <div class="dash-duty-summary-kpi"><strong>${esc(latest)}</strong><span>latest</span></div>
    </div>
    <div class="dash-duty-summary-table-wrap">
      <table class="dash-duty-summary-table">
        <thead><tr><th>${esc(adminT('adminDutySummaryPlayer'))}</th><th>${esc(adminT('adminDutySummaryEntries'))}</th><th>${esc(adminT('adminDutySummaryTimes'))}</th></tr></thead>
        <tbody>${rows
          .map(
            (row) => `<tr>
          <td><strong>${esc(row.playerName)}</strong></td>
          <td>${row.entries}</td>
          <td>${summarizeDutyValues(row.times, 8)}</td>
        </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
  </div>`;
  hydrateDashboardTableLabels(host);
}
function renderDutyType(type) {
  const meta = DUTY_TYPES[type];
  const body = meta ? $id(meta.bodyId) : null;
  if (!meta || !body) return;
  const recordTypes = meta.recordTypes || [type];
  const records = (state.dutyRecords || [])
    .filter((record) => recordTypes.includes(record.type))
    .slice()
    .reverse();
  if (!records.length) {
    body.innerHTML = `<div class="dash-empty">${esc(adminT('adminDutyEmptyRecords', { label: dutyLabel(type) }))}</div>`;
    return;
  }
  body.innerHTML = records
    .map((record) => {
      const entries = Array.isArray(record.entries) ? record.entries : [];
      const confirmed = entries.filter((entry) => entry.confirmed).length;
      const weak = entries.filter(
        (entry) => entry.status === 'weak' || entry.status === 'unmatched'
      ).length;
      return `<div class="dash-banner-card">
      <div class="dash-banner-head">
        <div class="dash-banner-date">
          <span>${esc(record.date || '')}</span>
          <span class="dash-banner-event">${esc(dutySingular(record.type) || dutySingular(type))}</span>
          ${record.gameTime ? `<span class="dash-banner-event">${esc(record.gameTime)}</span>` : ''}
          ${record.note ? `<span class="dash-banner-event">${esc(record.note)}</span>` : ''}
          <span class="dash-banner-count">${esc(adminT('adminDutyMatchedCount', { confirmed, total: entries.length }))}${weak ? `, ${esc(adminT('adminDutyReviewCount', { count: weak }))}` : ''}</span>
        </div>
        <div style="display:flex;gap:6px">
          <button class="dash-btn" style="padding:4px 10px;font-size:0.72rem;min-height:0" onclick="editDutyRecord('${esc(record.id)}')">${esc(adminT('adminEdit'))}</button>
          <button class="dash-banner-del-btn" onclick="deleteDutyRecord('${esc(record.id)}')" title="${esc(adminT('adminDelete'))}">x</button>
        </div>
      </div>
      <div class="dash-banner-body">
        <table class="dash-banner-table dash-duty-detail-table">
          <thead><tr><th>${esc(adminT('adminDutyGroup'))}</th><th>${esc(adminT('adminDutyOrder'))}</th><th>${esc(adminT('adminDutyTime'))}</th><th>${esc(adminT('adminDutyTarget'))}</th><th>${esc(adminT('adminDutyPad'))}</th><th>${esc(adminT('adminDutyUploaded'))}</th><th>${esc(adminT('adminDutyRosterMatch'))}</th><th>${esc(adminT('adminDutyStatus'))}</th></tr></thead>
          <tbody>${entries
            .map(
              (entry) => `<tr>
            <td>${entry.group ? esc(entry.group) : '<span style="color:var(--text-dim)">--</span>'}</td>
            <td>${entry.order ? esc(entry.order) : entry.checked ? '✓' : '<span style="color:var(--text-dim)">--</span>'}</td>
            <td>${entry.usageTime ? esc(entry.usageTime) : '<span style="color:var(--text-dim)">--</span>'}</td>
            <td>${entry.target ? esc(entry.target) : '<span style="color:var(--text-dim)">--</span>'}</td>
            <td>${entry.pad ? esc(entry.pad) : entry.allowedColors ? esc(entry.allowedColors) : '<span style="color:var(--text-dim)">--</span>'}</td>
            <td>${esc(entry.original || entry.name || '')}</td>
            <td>${entry.confirmed ? esc(entry.confirmed) : `<span style="color:var(--text-dim)">${esc(adminT('adminDutyUnmatched'))}</span>`}</td>
            <td>${esc(entry.status || 'unmatched')}</td>
          </tr>`
            )
            .join('')}</tbody>
        </table>
      </div>
    </div>`;
    })
    .join('');
  hydrateDashboardTableLabels(body);
}

function renderDutySummary() {
  const host = $id('dashDutySummary');
  if (!host) return;
  const counts = new Map();
  (state.dutyRecords || []).forEach((record) => {
    (record.entries || []).forEach((entry) => {
      const credited = getDutyEntryCreditedNames(entry);
      credited.forEach((name) => {
        const identity = resolveDutySummaryIdentity(name);
        if (!identity) return;
        if (!counts.has(identity.playerKey))
          counts.set(identity.playerKey, {
            name: identity.playerName,
            total: 0,
            banner: 0,
            pather: 0,
            speed_tile: 0,
            shield_wall: 0,
          });
        const row = counts.get(identity.playerKey);
        row.total += 1;
        if (row[record.type] !== undefined) row[record.type] += 1;
      });
    });
  });
  const rows = Array.from(counts.values())
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 12);
  host.innerHTML = rows.length
    ? rows
        .map(
          (row) =>
            `<div class="dash-duty-summary-row"><strong>${esc(row.name)}</strong><span>${esc(adminT('adminDutyTotalLabel', { count: row.total }))}</span><small>B ${row.banner} / ${esc(adminT('adminDutyPlanAbbrev'))} ${row.pather + row.speed_tile} / ${esc(adminT('adminDutyShieldWallAbbrev'))} ${row.shield_wall}</small></div>`
        )
        .join('')
    : `<div class="dash-empty">${esc(adminT('adminDutySummaryEmpty'))}</div>`;
}

function renderDutyRecords() {
  renderDutyPlayerSummary('banner', 'dashBannerListSummary');
  renderDutyPlayerSummary('pather', 'dashPatherListSummary');
  renderDutyType('banner');
  renderDutyType('pather');
  renderDutyType('shield_wall');
  renderDutySummary();
}

function loadContributionRecords() {
  try {
    const raw = localStorage.getItem(CONTRIBUTION_KEY);
    state.contributionRecords = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.contributionRecords)) state.contributionRecords = [];
  } catch (e) {
    state.contributionRecords = [];
  }
}

function saveContributionRecords(options = {}) {
  try {
    localStorage.setItem(CONTRIBUTION_KEY, JSON.stringify(state.contributionRecords || []));
  } catch (e) {}
  return syncDashboardAuxiliaryRecords(options);
}

export function loadExGuildContributions() {
  try {
    const raw = localStorage.getItem(EX_GUILD_CONTRIBUTION_KEY);
    state.exGuildContributions = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.exGuildContributions)) state.exGuildContributions = [];
  } catch (e) {
    state.exGuildContributions = [];
  }
}

function saveExGuildContributions(options = {}) {
  try {
    localStorage.setItem(
      EX_GUILD_CONTRIBUTION_KEY,
      JSON.stringify(state.exGuildContributions || [])
    );
  } catch (e) {}
  return syncDashboardAuxiliaryRecords(options);
}

function deleteExGuildEntry(id) {
  state.exGuildContributions = (state.exGuildContributions || []).filter((e) => e.id !== id);
  saveExGuildContributions();
  renderExGuildTable();
}

function clearExGuildData() {
  state.exGuildContributions = [];
  saveExGuildContributions();
  renderExGuildTable();
}

function parseContributionValue(value) {
  const text = String(value || '').replace(/[^\d]/g, '');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatContributionValue(value) {
  return parseContributionValue(value).toLocaleString();
}

function formatSignedContributionValue(value) {
  const parsed = Number(value || 0);
  const sign = parsed >= 0 ? '+' : '-';
  return `${sign}${formatContributionValue(Math.abs(parsed))}`;
}

function safeContributionFilenamePart(value) {
  return (
    String(value || 'snapshot')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'snapshot'
  );
}

function refreshDashboardOverview() {
  if (typeof window.refreshOcrDashboardFromStorage === 'function') {
    window.refreshOcrDashboardFromStorage();
  }
}

async function syncDashboardAuxiliaryRecords(options = {}) {
  if (typeof window.syncDashboardAuxiliaryRecordsToCloud === 'function') {
    return window.syncDashboardAuxiliaryRecordsToCloud(options);
  }
  return false;
}

function notifySpecialListCloudResult(ok, label) {
  if (ok) return;
  const message = `${label} saved on this device only. Cloud sync did not confirm, so other admins may not see it yet.`;
  log(message, 'warn');
  alert(message);
}

function normalizeRewardTier(value) {
  const tier = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-');
  if (tier === 'premium' || tier === 'top' || tier === 'top-premium') return 'premium';
  if (tier === 'standard' || tier === 'normal') return 'standard';
  if (tier === 'review' || tier === 'manual') return 'review';
  if (tier === 'none' || tier === 'no-reward' || tier === 'skip') return 'none';
  return '';
}

function getContributionReward(entry, record) {
  const override = normalizeRewardTier(entry?.rewardOverride || entry?.reward);
  if (override) return override;
  const rank = Number(entry?.rank || 0);
  const cutoff = Number(record?.premiumCutoff || record?.premiumSlots || 20);
  return rank > 0 && rank <= cutoff ? 'premium' : 'standard';
}

function getContributionRewardLabel(tier) {
  return (
    {
      guild_master: adminT('adminContributionRewardGuildMaster'),
      core: adminT('adminContributionRewardCore'),
      power_house: adminT('adminContributionRewardPowerHouse'),
      members: adminT('adminContributionRewardMembers'),
      premium: adminT('adminContributionRewardPremium'),
      standard: adminT('adminContributionRewardStandard'),
      review: adminT('adminContributionRewardReview'),
      none: adminT('adminContributionRewardNone'),
    }[tier] || adminT('adminContributionRewardAuto')
  );
}

function normalizeContributionEntries(input) {
  const rows = Array.isArray(input) ? input : [];
  const seen = new Set();
  return rows
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rank = Number(
        String(item.rank || item.order || item.index || '').replace(/[^\d]/g, '')
      );
      const name = String(item.name || item.member || item.player || item.members || '').trim();
      const guild = String(item.guild || item.alliance || item.team || '')
        .replace(/^guild\s*[:：]\s*/i, '')
        .trim();
      const contribution = parseContributionValue(
        item.contribution || item.value || item.points || item.total || item.score
      );
      const position = String(item.position || item.role || item.title || '').trim();
      const rewardOverride = normalizeRewardTier(item.rewardOverride || item.reward || '');
      if (!name || !contribution) return null;
      return {
        rank: Number.isFinite(rank) && rank > 0 ? rank : '',
        name,
        guild,
        contribution,
        position,
        rewardOverride,
      };
    })
    .filter(Boolean)
    .filter((entry) => {
      const key =
        `${entry.rank}|${compactPlayerIdentity(entry.name)}|${entry.contribution}|${entry.guild}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) => Number(a.rank || 9999) - Number(b.rank || 9999) || b.contribution - a.contribution
    );
}

function parseContributionEntriesFromText(text) {
  const entries = [];
  String(text || '')
    .split(/\r?\n/)
    .forEach((line) => {
      let row = String(line || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!row || /^(total contribution|members|contribution|position|my ranking)$/i.test(row))
        return;
      let rank = '';
      const rankMatch = row.match(/^#?\s*(\d{1,4})[\s.)-]+(.+)$/);
      if (rankMatch) {
        rank = Number(rankMatch[1]);
        row = rankMatch[2].trim();
      }
      const numericMatches = Array.from(row.matchAll(/\b\d{1,3}(?:,\d{3})+\b|\b\d{4,}\b/g));
      if (!numericMatches.length) return;
      const valueMatch = numericMatches[numericMatches.length - 1];
      const contribution = parseContributionValue(valueMatch[0]);
      if (!contribution) return;
      let guild = '';
      let beforeValue = row
        .slice(0, valueMatch.index)
        .replace(/[|,;:-]+$/g, '')
        .trim();
      const guildMatch = beforeValue.match(/\bGuild\s*[:：]\s*(.+)$/i);
      if (guildMatch) {
        guild = String(guildMatch[1] || '').trim();
        beforeValue = beforeValue.slice(0, guildMatch.index).trim();
      }
      const afterValue = row
        .slice(valueMatch.index + valueMatch[0].length)
        .replace(/^[|,;:-]+/g, '')
        .trim();
      const name = beforeValue.replace(/\bGuild\s*[:：].*$/i, '').trim();
      if (!name) return;
      entries.push({ rank, name, guild, contribution, position: afterValue, rewardOverride: '' });
    });
  return normalizeContributionEntries(entries);
}

function renderContributionMatchRows(entries, mode = 'normal') {
  if (mode === 'exguild') {
    return entries
      .map(
        (entry, index) => `<div class="dash-contribution-match-row">
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionMember'))}</span><input class="dash-contribution-name-input" type="text" placeholder="${esc(adminT('adminContributionMemberNamePh'))}" value="${esc(entry.name || '')}"></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionValue'))}</span><input class="dash-contribution-value-input" type="text" inputmode="numeric" placeholder="${esc(adminT('adminContributionValuePh'))}" value="${entry.contribution ? esc(formatContributionValue(entry.contribution)) : ''}"></label>
      <button class="dash-banner-del-btn" type="button" title="${esc(adminT('adminContributionRemoveRow'))}" onclick="this.closest('.dash-contribution-match-row').remove()">x</button>
    </div>`
      )
      .join('');
  }
  return entries
    .map(
      (entry, index) => `<div class="dash-contribution-match-row">
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionRank'))}</span><input class="dash-contribution-rank-input" type="number" min="1" placeholder="#" value="${esc(entry.rank || '')}"></label>
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionMember'))}</span><input class="dash-contribution-name-input" type="text" placeholder="${esc(adminT('adminContributionMemberNamePh'))}" value="${esc(entry.name || '')}"></label>
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionGuild'))}</span><input class="dash-contribution-guild-input" type="text" placeholder="${esc(adminT('adminContributionGuildPh'))}" value="${esc(entry.guild || '')}"></label>
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionValue'))}</span><input class="dash-contribution-value-input" type="text" inputmode="numeric" placeholder="${esc(adminT('adminContributionValuePh'))}" value="${entry.contribution ? esc(formatContributionValue(entry.contribution)) : ''}"></label>
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionPosition'))}</span><input class="dash-contribution-position-input" type="text" placeholder="${esc(adminT('adminContributionPositionPh'))}" value="${esc(entry.position || '')}"></label>
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionReward'))}</span><select class="dash-contribution-reward-input" title="${esc(adminT('adminContributionRewardOverrideTitle'))}">
      <option value=""${!entry.rewardOverride ? ' selected' : ''}>${esc(adminT('adminContributionRewardAuto'))}</option>
      <option value="premium"${entry.rewardOverride === 'premium' ? ' selected' : ''}>${esc(adminT('adminContributionRewardPremium'))}</option>
      <option value="standard"${entry.rewardOverride === 'standard' ? ' selected' : ''}>${esc(adminT('adminContributionRewardStandard'))}</option>
      <option value="review"${entry.rewardOverride === 'review' ? ' selected' : ''}>${esc(adminT('adminContributionRewardReview'))}</option>
      <option value="none"${entry.rewardOverride === 'none' ? ' selected' : ''}>${esc(adminT('adminContributionRewardNone'))}</option>
    </select></label>
    <button class="dash-banner-del-btn" type="button" title="${esc(adminT('adminContributionRemoveRow'))}" onclick="this.closest('.dash-contribution-match-row').remove()">x</button>
  </div>`
    )
    .join('');
}

function showContributionConfirmModal(
  entries,
  sourceLabel = '',
  existingRecordId = null,
  mode = 'normal'
) {
  const cleanEntries = normalizeContributionEntries(entries);
  if (!cleanEntries.length) return;
  const isExGuild = mode === 'exguild';
  const existingRecord = existingRecordId
    ? state.contributionRecords.find((record) => record.id === existingRecordId)
    : null;
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  $id('dashModalTitle').textContent = isExGuild
    ? adminT('adminExGuildConfirmTitle')
    : existingRecord
      ? adminT('adminContributionEditTitle')
      : adminT('adminContributionConfirmTitle');
  $id('dashModalSub').textContent = adminT('adminContributionModalSub', {
    count: cleanEntries.length,
  });
  body.innerHTML =
    (isExGuild
      ? ''
      : `<div class="dash-banner-form-row">
    <label>${esc(adminT('adminContributionDateLabel'))}</label>
    <input type="date" id="dashContributionDate" value="${existingRecord?.date || new Date().toISOString().slice(0, 10)}" style="flex:1">
  </div>
  <div class="dash-banner-form-row">
    <label>${esc(adminT('adminContributionNoteLabel'))}</label>
    <input type="text" id="dashContributionNote" value="${esc(existingRecord?.note || sourceLabel)}" placeholder="${esc(adminT('adminContributionNotePh'))}" style="flex:1">
  </div>
  <div class="dash-banner-form-row">
    <label>${esc(adminT('adminContributionPremiumLabel'))}</label>
    <input type="number" id="dashContributionPremiumCutoff" min="1" max="100" value="${esc(existingRecord?.premiumCutoff || 20)}" style="width:110px">
    <span class="dash-form-hint">${esc(adminT('adminContributionPremiumHint'))}</span>
  </div>`) +
    `<div class="dash-contribution-match-head">${
      isExGuild
        ? `<span>${esc(adminT('adminContributionMember'))}</span><span>${esc(adminT('adminContributionValue'))}</span><span></span>`
        : `<span>${esc(adminT('adminContributionRank'))}</span><span>${esc(adminT('adminContributionMember'))}</span><span>${esc(adminT('adminContributionGuild'))}</span><span>${esc(adminT('adminContributionValue'))}</span><span>${esc(adminT('adminContributionPosition'))}</span><span>${esc(adminT('adminContributionReward'))}</span><span></span>`
    }
  </div>
  <div class="dash-contribution-match-list">${renderContributionMatchRows(existingRecord?.entries || cleanEntries, mode)}</div>
  <div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap">
    <button id="dashContributionAddRowBtn" class="dash-btn" type="button">${esc(adminT(isExGuild ? 'adminExGuildAddRow' : 'adminContributionAddRow'))}</button>
    <button id="dashContributionSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">${esc(isExGuild ? adminT('adminExGuildSaveList') : existingRecord ? adminT('adminContributionUpdateList') : adminT('adminContributionSaveList'))}</button>
    <button id="dashContributionCancelBtn" class="dash-btn" style="flex:1">${esc(adminT('adminCancel'))}</button>
  </div>`;
  $id('dashContributionAddRowBtn').onclick = () => {
    const list = body.querySelector('.dash-contribution-match-list');
    const emptyRow = isExGuild
      ? [{ name: '', contribution: '' }]
      : [{ rank: '', name: '', guild: '', contribution: '', position: '', rewardOverride: '' }];
    list.insertAdjacentHTML('beforeend', renderContributionMatchRows(emptyRow, mode));
  };
  $id('dashContributionSaveBtn').onclick = async () => {
    const rows = Array.from(body.querySelectorAll('.dash-contribution-match-row')).map((row) => {
      const base = {
        name: row.querySelector('.dash-contribution-name-input')?.value || '',
        contribution: row.querySelector('.dash-contribution-value-input')?.value || '',
      };
      if (isExGuild) return base;
      return {
        ...base,
        rank: row.querySelector('.dash-contribution-rank-input')?.value || '',
        guild: row.querySelector('.dash-contribution-guild-input')?.value || '',
        position: row.querySelector('.dash-contribution-position-input')?.value || '',
        rewardOverride: row.querySelector('.dash-contribution-reward-input')?.value || '',
      };
    });
    const normalized = normalizeContributionEntries(rows);
    if (!normalized.length) {
      alert(adminT('adminContributionNoValidRowsAlert'));
      return;
    }
    if (isExGuild) {
      const sourceNote = $id('dashContributionNote')?.value.trim() || sourceLabel;
      normalized.forEach((entry) => {
        state.exGuildContributions.push({
          id: `exg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          playerName: entry.name || '',
          contribution: entry.contribution || entry.value || 0,
          sourceNote,
        });
      });
      const saveBtn = $id('dashContributionSaveBtn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }
      const synced = await saveExGuildContributions({ immediate: true, awaitCloud: true });
      closeModal();
      renderContributions();
      refreshDashboardOverview();
      log(adminT('adminExGuildSavedLog', { count: normalized.length }), 'success');
      notifySpecialListCloudResult(synced, adminT('adminExGuildTab'));
      return;
    }
    const record = {
      id:
        existingRecord?.id ||
        `contribution_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: $id('dashContributionDate')?.value || new Date().toISOString().slice(0, 10),
      note: $id('dashContributionNote')?.value.trim() || '',
      premiumCutoff: Math.max(1, Number($id('dashContributionPremiumCutoff')?.value || 20)),
      entries: normalized,
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existingRecord) {
      const index = state.contributionRecords.findIndex((item) => item.id === existingRecord.id);
      if (index >= 0) state.contributionRecords[index] = record;
    } else {
      if (!state.contributionRecords.length) record.isPrimary = true;
      state.contributionRecords.push(record);
    }
    const saveBtn = $id('dashContributionSaveBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    const synced = await saveContributionRecords({ immediate: true, awaitCloud: true });
    closeModal();
    renderContributions();
    refreshDashboardOverview();
    log(
      adminT(existingRecord ? 'adminContributionUpdatedLog' : 'adminContributionSavedLog', {
        count: normalized.length,
      }),
      'success'
    );
    notifySpecialListCloudResult(synced, adminT('adminContributionsTab'));
  };
  $id('dashContributionCancelBtn').onclick = closeModal;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function showContributionPasteForm() {
  const text = prompt(adminT('adminContributionPastePrompt'), '');
  if (text === null) return;
  const entries = parseContributionEntriesFromText(text);
  if (!entries.length) {
    log(adminT('adminContributionNoRowsLog'), 'warn');
    return;
  }
  showContributionConfirmModal(entries, adminT('adminContributionManualPaste'));
}

function showExGuildPasteForm() {
  const text = prompt(adminT('adminExGuildPastePrompt'), '');
  if (text === null) return;
  const entries = parseContributionEntriesFromText(text);
  if (!entries.length) {
    log(adminT('adminContributionNoRowsLog'), 'warn');
    return;
  }
  showContributionConfirmModal(entries, adminT('adminExGuildManualPaste'), null, 'exguild');
}

function setContributionUploadStatus(message, type = 'error') {
  const el = $id('dashContributionStatus');
  if (!el) return;
  el.className = `dash-upload-status ${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearContributionUploadStatus() {
  const el = $id('dashContributionStatus');
  if (!el) return;
  el.classList.add('hidden');
  el.textContent = '';
}

async function processContributionImages(files, mode = 'normal') {
  if (state._contributionProcessing) {
    log(adminT('adminContributionOcrRunningLog'), 'warn');
    return;
  }
  const valid = getSupportedOcrImageFiles(files);
  if (!valid.length) {
    const rejected = describeRejectedOcrImageFiles(files);
    const message = rejected.length
      ? `No supported contribution image selected. Use PNG, JPG, or WebP. Rejected: ${rejected.slice(0, 3).join(', ')}`
      : 'No contribution image selected.';
    log(message, 'warn');
    setContributionUploadStatus(message, 'warn');
    return;
  }
  state._contributionProcessing = true;
  clearContributionUploadStatus();
  const progress = $id('dashContributionProgress');
  const progressText = $id('dashContributionProgressText');
  if (progress) progress.classList.remove('hidden');
  log(adminT('adminContributionScanningImagesLog', { count: valid.length }), 'info');
  let allEntries = [];
  let blockingError = '';
  for (let i = 0; i < valid.length; i++) {
    const file = valid[i];
    if (progressText)
      progressText.textContent = adminT('adminContributionScanningImageProgress', {
        current: i + 1,
        total: valid.length,
      });
    try {
      const imageUrl = await readOcrImageDataUrl(file);
      const promptTxt = `Extract Total Contribution leaderboard rows from this Rise of Castles screenshot.

Return ONLY valid JSON in this shape:
{"entries":[{"rank":1,"name":"(Vts)Player Name","guild":"VTS X1","contribution":192983,"position":"Guild master"}]}

Rules:
- Include every visible member row, including a bottom "My Ranking" row if visible.
- Use the number at the far left as "rank".
- Use the number in the Contribution column as "contribution".
- Put only the player/member text in "name"; move any Guild: text into "guild".
- Put role text from the Position column, such as Guild master, into "position".
- Preserve symbols, spacing, and non-Latin characters in names.
- Ignore title bars, phone time, avatars, buttons, headers, and decorative text.
- If no contribution rows are visible, return {"entries":[]}.`;
      const raw = await qwenVisionRequest([
        {
          role: 'user',
          content: [
            { type: 'text', text: promptTxt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ]);
      const text = raw?.choices?.[0]?.message?.content || '';
      const cleaned = text
        .replace(/```(?:json)?\s*/gi, '')
        .replace(/```/g, '')
        .trim();
      let parsed;
      try {
        parsed = tryRepairJson(cleaned);
      } catch (e) {
        parsed = { entries: parseContributionEntriesFromText(cleaned) };
      }
      const entries = Array.isArray(parsed)
        ? normalizeContributionEntries(parsed)
        : Array.isArray(parsed?.entries)
          ? normalizeContributionEntries(parsed.entries)
          : [];
      allEntries.push(...entries);
    } catch (e) {
      const errorMessage = describeOcrRequestError(e);
      log(
        adminT('adminContributionOcrErrorLog', { file: file.name, error: errorMessage }),
        'error'
      );
      if (!blockingError) blockingError = errorMessage;
      if (e?.localConfiguration) break;
    }
  }
  if (progress) progress.classList.add('hidden');
  state._contributionProcessing = false;
  const unique = normalizeContributionEntries(allEntries);
  if (!unique.length) {
    log(adminT('adminContributionNoRowsInImagesLog'), 'warn');
    if (blockingError) {
      const message = adminT('adminContributionOcrBlockedStatus', { error: blockingError });
      setContributionUploadStatus(message, 'error');
      if (typeof window.showToast === 'function')
        window.showToast(adminT('adminContributionOcrBlockedToast'), 'error', 5000);
    } else {
      setContributionUploadStatus(adminT('adminContributionNoRowsInImagesLog'), 'warn');
      alert(adminT('adminContributionExtractFailedAlert'));
    }
    return;
  }
  clearContributionUploadStatus();
  showContributionConfirmModal(unique, valid.map((f) => f.name).join(', '), null, mode);
}

function setContributionReward(recordId, entryIndex, rewardTier) {
  const record = state.contributionRecords.find((item) => item.id === recordId);
  if (!record || !Array.isArray(record.entries) || !record.entries[entryIndex]) return;
  record.entries[entryIndex].rewardOverride = normalizeRewardTier(rewardTier);
  record.updatedAt = new Date().toISOString();
  saveContributionRecords();
  renderContributions();
  refreshDashboardOverview();
}

function editContributionRecord(id) {
  const record = state.contributionRecords.find((item) => item.id === id);
  if (!record) return;
  showContributionConfirmModal(record.entries || [], record.note || '', record.id);
}

function deleteContributionRecord(id) {
  const index = state.contributionRecords.findIndex((record) => record.id === id);
  if (index < 0) return;
  if (!confirm(adminT('adminContributionDeleteConfirm'))) return;
  state.contributionRecords.splice(index, 1);
  saveContributionRecords();
  renderContributions();
  refreshDashboardOverview();
  log(adminT('adminContributionDeletedLog'), 'warn');
}

function setContributionPrimary(id) {
  (state.contributionRecords || []).forEach((record) => {
    record.isPrimary = record.id === id;
  });
  saveContributionRecords();
  renderContributions();
  refreshDashboardOverview();
}

function buildContributionCsv(recordId = '') {
  const records = (state.contributionRecords || []).filter(
    (record) => !recordId || record.id === recordId
  );
  const lines = [
    [
      adminT('adminContributionCsvRecordDate'),
      adminT('adminContributionNoteLabel'),
      adminT('adminContributionRank'),
      adminT('adminContributionMemberName'),
      adminT('adminContributionGuild'),
      adminT('adminContributionValue'),
      adminT('adminContributionPosition'),
      adminT('adminContributionReward'),
      adminT('adminContributionOverride'),
    ],
  ];
  records.forEach((record) => {
    (record.entries || []).forEach((entry) => {
      const reward = getContributionReward(entry, record);
      lines.push([
        record.date || '',
        record.note || '',
        entry.rank || '',
        entry.name || '',
        entry.guild || '',
        entry.contribution || '',
        entry.position || '',
        getContributionRewardLabel(reward),
        normalizeRewardTier(entry.rewardOverride) ? adminT('adminYes') : adminT('adminNo'),
      ]);
    });
  });
  return lines
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function exportContributionRecords(recordId = '') {
  if (!state.contributionRecords?.length) return;
  const csv = buildContributionCsv(recordId);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vts_total_contribution_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  log(adminT('adminContributionSheetExportedLog'), 'success');
}

function getContributionRecordLabel(record, fallbackIndex = 0) {
  const date = record?.date || `Snapshot ${fallbackIndex + 1}`;
  const note = String(record?.note || '').trim();
  const count = Array.isArray(record?.entries) ? record.entries.length : 0;
  return `${date}${note ? ` - ${note}` : ''} (${count} rows)`;
}

function getContributionIdentity(entry) {
  const name = String(entry?.name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const guild = String(entry?.guild || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return `${name}|${guild}`;
}

function buildContributionComparison(baseRecord, finalRecord) {
  const baseMap = new Map();
  const finalMap = new Map();
  (baseRecord?.entries || []).forEach((entry) => {
    const key = getContributionIdentity(entry);
    if (key !== '|') baseMap.set(key, entry);
  });
  (finalRecord?.entries || []).forEach((entry) => {
    const key = getContributionIdentity(entry);
    if (key !== '|') finalMap.set(key, entry);
  });
  const keys = new Set([...baseMap.keys(), ...finalMap.keys()]);
  return Array.from(keys)
    .map((key) => {
      const base = baseMap.get(key);
      const final = finalMap.get(key);
      const baseValue = parseContributionValue(base?.contribution);
      const finalValue = parseContributionValue(final?.contribution);
      const baseRank = Number(base?.rank || 0);
      const finalRank = Number(final?.rank || 0);
      const rewardBefore = base ? getContributionReward(base, baseRecord) : '';
      const rewardAfter = final ? getContributionReward(final, finalRecord) : '';
      return {
        key,
        name: final?.name || base?.name || '',
        guild: final?.guild || base?.guild || '',
        baseRank,
        finalRank,
        rankDelta: baseRank && finalRank ? baseRank - finalRank : 0,
        baseValue,
        finalValue,
        delta: finalValue - baseValue,
        rewardBefore,
        rewardAfter,
        status: base && final ? 'tracked' : final ? 'new' : 'missing',
      };
    })
    .sort(
      (a, b) => b.delta - a.delta || b.finalValue - a.finalValue || a.name.localeCompare(b.name)
    );
}

function getSelectedContributionCompareRecords() {
  const baseId = $id('dashContributionCompareBase')?.value || '';
  const finalId = $id('dashContributionCompareFinal')?.value || '';
  const records = state.contributionRecords || [];
  return {
    baseRecord: records.find((record) => record.id === baseId) || null,
    finalRecord: records.find((record) => record.id === finalId) || null,
  };
}

function buildContributionComparisonCsv(baseRecord, finalRecord) {
  const rows = buildContributionComparison(baseRecord, finalRecord);
  const lines = [
    [
      adminT('adminContributionMemberName'),
      adminT('adminContributionGuild'),
      adminT('adminContributionBaselineRank'),
      adminT('adminContributionFinalRank'),
      adminT('adminContributionRankMovement'),
      adminT('adminContributionBaselineContribution'),
      adminT('adminContributionFinalContribution'),
      adminT('adminContributionDelta'),
      adminT('adminContributionBaselineReward'),
      adminT('adminContributionFinalReward'),
      adminT('adminContributionStatus'),
    ],
  ];
  rows.forEach((row) => {
    lines.push([
      row.name,
      row.guild,
      row.baseRank || '',
      row.finalRank || '',
      row.rankDelta || '',
      row.baseValue || '',
      row.finalValue || '',
      row.delta || 0,
      row.rewardBefore ? getContributionRewardLabel(row.rewardBefore) : '',
      row.rewardAfter ? getContributionRewardLabel(row.rewardAfter) : '',
      adminT(`adminContributionStatus${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`),
    ]);
  });
  return lines
    .map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function exportContributionComparison() {
  const { baseRecord, finalRecord } = getSelectedContributionCompareRecords();
  if (!baseRecord || !finalRecord || baseRecord.id === finalRecord.id) return;
  const csv = buildContributionComparisonCsv(baseRecord, finalRecord);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vts_contribution_delta_${safeContributionFilenamePart(baseRecord.date || 'baseline')}_to_${safeContributionFilenamePart(finalRecord.date || 'final')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  log(adminT('adminContributionComparisonExportedLog'), 'success');
}

function renderContributionComparison() {
  const host = $id('dashContributionComparePanel');
  if (!host) return;
  const records = Array.isArray(state.contributionRecords) ? state.contributionRecords : [];
  if (records.length < 2) {
    host.innerHTML = `<div class="dash-contribution-compare-empty">${esc(adminT('adminContributionCompareEmpty'))}</div>`;
    return;
  }
  const sorted = records
    .slice()
    .sort(
      (a, b) =>
        String(a.date || '').localeCompare(String(b.date || '')) ||
        String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    );
  const baseDefault = sorted[0]?.id || '';
  const finalDefault = sorted[sorted.length - 1]?.id || '';
  const selectedBase = $id('dashContributionCompareBase')?.value || baseDefault;
  const selectedFinal = $id('dashContributionCompareFinal')?.value || finalDefault;
  const options = sorted
    .map(
      (record, index) =>
        `<option value="${esc(record.id)}">${esc(getContributionRecordLabel(record, index))}</option>`
    )
    .join('');
  host.innerHTML = `<div class="dash-contribution-compare-card">
    <div class="dash-contribution-compare-head">
      <div>
        <strong>${esc(adminT('adminContributionCompareTitle'))}</strong>
        <span>${esc(adminT('adminContributionCompareSubtitle'))}</span>
      </div>
      <button id="dashContributionCompareExportBtn" class="dash-btn">${esc(adminT('adminContributionExportDelta'))}</button>
    </div>
    <div class="dash-contribution-compare-controls">
      <label>${esc(adminT('adminContributionBaseline'))} <select id="dashContributionCompareBase">${options}</select></label>
      <label>${esc(adminT('adminContributionFinal'))} <select id="dashContributionCompareFinal">${options}</select></label>
    </div>
    <div id="dashContributionCompareBody"></div>
  </div>`;
  const baseSelect = $id('dashContributionCompareBase');
  const finalSelect = $id('dashContributionCompareFinal');
  if (baseSelect)
    baseSelect.value = sorted.some((record) => record.id === selectedBase)
      ? selectedBase
      : baseDefault;
  if (finalSelect)
    finalSelect.value = sorted.some((record) => record.id === selectedFinal)
      ? selectedFinal
      : finalDefault;
  const renderSelected = () => {
    const { baseRecord, finalRecord } = getSelectedContributionCompareRecords();
    const body = $id('dashContributionCompareBody');
    if (!body) return;
    if (!baseRecord || !finalRecord || baseRecord.id === finalRecord.id) {
      body.innerHTML = `<div class="dash-empty">${esc(adminT('adminContributionChooseDifferent'))}</div>`;
      return;
    }
    const rows = buildContributionComparison(baseRecord, finalRecord);
    const totalDelta = rows.reduce((sum, row) => sum + row.delta, 0);
    const newCount = rows.filter((row) => row.status === 'new').length;
    const missingCount = rows.filter((row) => row.status === 'missing').length;
    const premiumMoved = rows.filter((row) => row.rewardBefore !== row.rewardAfter).length;
    body.innerHTML = `<div class="dash-contribution-compare-stats">
      <span>${esc(adminT('adminContributionDelta'))} <strong class="${totalDelta >= 0 ? 'dash-positive' : 'dash-negative'}">${formatSignedContributionValue(totalDelta)}</strong></span>
      <span>${esc(adminT('adminContributionNew'))} <strong>${newCount}</strong></span>
      <span>${esc(adminT('adminContributionMissing'))} <strong>${missingCount}</strong></span>
      <span>${esc(adminT('adminContributionRewardChanges'))} <strong>${premiumMoved}</strong></span>
    </div>
    <div class="dash-contribution-compare-table-wrap">
      <table class="dash-banner-table dash-contribution-compare-table">
        <thead><tr><th>${esc(adminT('adminContributionMember'))}</th><th>${esc(adminT('adminContributionRank'))}</th><th style="text-align:right">${esc(adminT('adminContributionBaseline'))}</th><th style="text-align:right">${esc(adminT('adminContributionFinal'))}</th><th style="text-align:right">${esc(adminT('adminContributionGain'))}</th><th>${esc(adminT('adminContributionReward'))}</th><th>${esc(adminT('adminContributionStatus'))}</th></tr></thead>
        <tbody>${rows
          .slice(0, 30)
          .map(
            (row) => `<tr>
          <td><strong>${esc(row.name)}</strong>${row.guild ? `<small>${esc(row.guild)}</small>` : ''}</td>
          <td>${row.baseRank || '--'} -> ${row.finalRank || '--'}${row.rankDelta ? `<em class="${row.rankDelta > 0 ? 'up' : 'down'}">${row.rankDelta > 0 ? '+' : ''}${row.rankDelta}</em>` : ''}</td>
          <td style="text-align:right">${formatContributionValue(row.baseValue)}</td>
          <td style="text-align:right">${formatContributionValue(row.finalValue)}</td>
          <td style="text-align:right" class="${row.delta >= 0 ? 'dash-positive' : 'dash-negative'}">${formatSignedContributionValue(row.delta)}</td>
          <td>${row.rewardBefore ? getContributionRewardLabel(row.rewardBefore) : '--'} -> ${row.rewardAfter ? getContributionRewardLabel(row.rewardAfter) : '--'}</td>
          <td><span class="dash-contribution-status dash-contribution-status-${row.status}">${esc(adminT(`adminContributionStatus${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`))}</span></td>
        </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>`;
    hydrateDashboardTableLabels(body);
  };
  baseSelect?.addEventListener('change', renderSelected);
  finalSelect?.addEventListener('change', renderSelected);
  $id('dashContributionCompareExportBtn').onclick = exportContributionComparison;
  renderSelected();
}

function formatConductContributionBonus(value) {
  return Number(value || 0) ? formatSignedContributionValue(value) : '0';
}

const WEIGHTED_CONTRIBUTION_COMPACT_KEY = 'vts_weighted_contribution_compact';

function isWeightedContributionCompactView() {
  try {
    return localStorage.getItem(WEIGHTED_CONTRIBUTION_COMPACT_KEY) === '1';
  } catch {
    // Some restricted browser contexts block localStorage; default to the full table.
    return false;
  }
}

function setWeightedContributionCompactView(enabled) {
  try {
    localStorage.setItem(WEIGHTED_CONTRIBUTION_COMPACT_KEY, enabled ? '1' : '0');
  } catch {
    // Keep the in-page toggle usable even when localStorage is unavailable.
  }
  document.querySelectorAll('#ocrDashboardRoot .dash-contribution-weighted-card').forEach((card) => {
    card.classList.toggle('dash-weighted-compact', enabled);
    card.querySelectorAll('[data-weighted-compact-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      button.textContent = enabled ? 'Full View' : 'Compact View';
    });
  });
}

function renderWeightedContributionViewToggle(compact) {
  return `<button class="dash-btn dash-btn-xs dash-weighted-view-toggle" type="button" data-weighted-compact-toggle aria-pressed="${compact ? 'true' : 'false'}">${compact ? 'Full View' : 'Compact View'}</button>`;
}

function bindWeightedContributionViewToggle(host) {
  const compact = isWeightedContributionCompactView();
  host
    .querySelectorAll('.dash-contribution-weighted-card')
    .forEach((card) => card.classList.toggle('dash-weighted-compact', compact));
  host.querySelectorAll('[data-weighted-compact-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      setWeightedContributionCompactView(!isWeightedContributionCompactView());
    });
  });
}

function renderWeightedScorePopover(row, index, prefix = 'dashContributionWeightedScoreTip') {
  const tooltipId = `${prefix}-${index}`;
  const dutyCount = row.banners + row.pathers + row.shieldWalls;
  const dutyNote = `${row.banners} banners + ${row.pathers} pathers + ${row.shieldWalls} shield walls`;
  const conductNote = `${formatConductContributionBonus(row.conductBonus)} conduct x 10,000`;
  return `<button class="dash-weighted-score-trigger" type="button" aria-describedby="${tooltipId}" aria-label="Weighted score breakdown for ${esc(row.playerName)}">
    <span class="dash-weighted-score-value">${row.weightedScore.toFixed(1)}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover" role="tooltip">
      <strong>Weighted score breakdown</strong>
      <span><span>Contribution</span><b>${formatContributionValue(row.contributionScore)}</b></span>
      <span><span>Ex-guild contribution</span><b>${formatContributionValue(row.contributionExGuild || 0)}</b></span>
      <span><span>Duty points <small>${esc(dutyNote)} = ${dutyCount} x 10,000</small></span><b>${formatContributionValue(row.dutyPoints || 0)}</b></span>
      <span><span>Conduct points <small>${esc(conductNote)}</small></span><b>${formatSignedContributionValue(row.conductPoints || 0)}</b></span>
      <span class="dash-weighted-score-popover-total"><span>Total</span><b>${row.weightedScore.toFixed(1)}</b></span>
    </span>
  </button>`;
}

function renderWeightedContributionTable() {
  const host = $id('dashContributionWeightedPanel');
  if (!host) return;

  const model = buildWeightedContributionRows({
    contributionRecords: state.contributionRecords,
    dutyRecords: state.dutyRecords,
    r5Adjustments: state.r5Adjustments,
    season: state.r5Season,
    exGuildContributions: state.exGuildContributions,
  });
  const rows = model.rows || [];

  if (!rows.length) {
    host.innerHTML = '';
    return;
  }

  const recordLabel = getWeightedContributionRecordLabel(model.record);
  const compactView = isWeightedContributionCompactView();
  host.innerHTML = `<div class="dash-contribution-compare-card dash-contribution-weighted-card ${compactView ? 'dash-weighted-compact' : ''}">
    <div class="dash-contribution-compare-head">
      <div>
        <strong>Weighted Total Contribution</strong>
        <span>${esc(recordLabel || 'Latest contribution snapshot')} &middot; Top ${esc(model.premiumCutoff)} uses Premium reward tier</span>
      </div>
      ${renderWeightedContributionViewToggle(compactView)}
    </div>
    <div class="dash-contribution-compare-table-wrap">
      <table class="dash-banner-table dash-contribution-compare-table dash-contribution-weighted-table">
        <thead><tr><th>Player</th><th class="dash-weighted-detail-col">Current rank</th><th class="dash-weighted-detail-col">Reward</th><th class="dash-weighted-detail-col" style="text-align:right">Contribution score</th><th class="dash-weighted-detail-col" style="text-align:right">#Shield Walls</th><th class="dash-weighted-detail-col" style="text-align:right">#Pathers</th><th class="dash-weighted-detail-col" style="text-align:right">#Banners</th><th class="dash-weighted-detail-col" style="text-align:right">Conduct (R5) bonus</th><th style="text-align:right">Weighted score</th><th>Final rank</th><th>Final reward</th></tr></thead>
        <tbody>${rows
          .map(
            (row, index) => `<tr>
          <td><strong>${esc(row.playerName)}</strong></td>
          <td class="dash-weighted-detail-col">${row.currentRank ? `#${esc(row.currentRank)}` : '--'}</td>
          <td class="dash-weighted-detail-col">${esc(getContributionRewardLabel(row.currentReward))}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${formatContributionValue(row.contributionScore)}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${row.shieldWalls}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${row.pathers}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${row.banners}</td>
          <td class="dash-weighted-detail-col ${row.conductBonus >= 0 ? 'dash-positive' : 'dash-negative'}" style="text-align:right">${formatConductContributionBonus(row.conductBonus)}</td>
          <td class="dash-weighted-score-cell" style="text-align:right">${renderWeightedScorePopover(row, index)}</td>
          <td>#${row.finalRank}</td>
          <td>${esc(getContributionRewardLabel(row.finalReward))}</td>
        </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
  </div>`;
  bindWeightedContributionViewToggle(host);
  hydrateDashboardTableLabels(host);
}

function renderContributions() {
  const body = $id('dashContributionBody');
  renderContributionComparison();
  renderWeightedContributionTable();
  if (!body) return;
  const records = Array.isArray(state.contributionRecords)
    ? state.contributionRecords.slice().reverse()
    : [];
  if (!records.length) {
    body.innerHTML = `<div class="dash-empty">${esc(adminT('adminContributionEmptyDetailed'))}</div>`;
    return;
  }
  body.innerHTML = records
    .map((record) => {
      const entries = Array.isArray(record.entries) ? record.entries.slice() : [];
      const total = entries.reduce(
        (sum, entry) => sum + parseContributionValue(entry.contribution),
        0
      );
      const premiumCount = entries.filter(
        (entry) => getContributionReward(entry, record) === 'premium'
      ).length;
      const isPrimary = record.isPrimary === true;
      return `<div class="dash-banner-card dash-contribution-card ${isPrimary ? 'dash-contribution-primary' : ''}">
      <div class="dash-banner-head">
        <div class="dash-banner-date">
          <span style="cursor:pointer" onclick="setContributionPrimary('${esc(record.id)}')" title="${esc(adminT(isPrimary ? 'adminContributionPrimaryTitle' : 'adminContributionSetPrimaryTitle'))}">${isPrimary ? '★' : '☆'}</span>
          <span>${esc(record.date || '')}</span>
          ${record.note ? `<span class="dash-banner-event">${esc(record.note)}</span>` : ''}
          <span class="dash-banner-count">${esc(adminT('adminContributionRowsCount', { count: entries.length }))}</span>
          <span class="dash-banner-count">${esc(adminT('adminContributionTotalCount', { total: formatContributionValue(total) }))}</span>
          <span class="dash-contribution-premium-pill">${esc(adminT('adminContributionPremiumCount', { count: premiumCount }))}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="dash-btn" style="padding:4px 10px;font-size:0.72rem;min-height:0" onclick="exportContributionRecords('${esc(record.id)}')">${esc(adminT('adminBtnExport'))}</button>
          <button class="dash-btn" style="padding:4px 10px;font-size:0.72rem;min-height:0" onclick="editContributionRecord('${esc(record.id)}')">${esc(adminT('adminEdit'))}</button>
          <button class="dash-banner-del-btn" onclick="deleteContributionRecord('${esc(record.id)}')" title="${esc(adminT('adminDelete'))}">x</button>
        </div>
      </div>
      <div class="dash-banner-body">
        <table class="dash-banner-table dash-contribution-table">
          <thead><tr><th>${esc(adminT('adminContributionRank'))}</th><th>${esc(adminT('adminContributionMember'))}</th><th>${esc(adminT('adminContributionGuild'))}</th><th style="text-align:right">${esc(adminT('adminContributionValue'))}</th><th>${esc(adminT('adminContributionPosition'))}</th><th>${esc(adminT('adminContributionReward'))}</th></tr></thead>
          <tbody>${entries
            .map((entry, index) => {
              const reward = getContributionReward(entry, record);
              return `<tr>
              <td class="dash-contribution-rank">${entry.rank ? `#${esc(entry.rank)}` : '--'}</td>
              <td><strong>${esc(stripGuildTagsFromPlayerName(entry.name || ''))}</strong></td>
              <td>${entry.guild ? esc(entry.guild) : '<span style="color:var(--text-dim)">--</span>'}</td>
              <td style="text-align:right;font-weight:800;color:var(--brand-light)">${formatContributionValue(entry.contribution)}</td>
              <td>${entry.position ? esc(entry.position) : '<span style="color:var(--text-dim)">--</span>'}</td>
              <td>
                <select class="dash-contribution-reward-select dash-contribution-reward-${reward}" onchange="setContributionReward('${esc(record.id)}', ${index}, this.value)">
                  <option value=""${!normalizeRewardTier(entry.rewardOverride) ? ' selected' : ''}>${esc(getContributionRewardLabel(reward))}${normalizeRewardTier(entry.rewardOverride) ? '' : ` ${esc(adminT('adminContributionAutoSuffix'))}`}</option>
                  <option value="premium"${normalizeRewardTier(entry.rewardOverride) === 'premium' ? ' selected' : ''}>${esc(adminT('adminContributionRewardPremium'))}</option>
                  <option value="standard"${normalizeRewardTier(entry.rewardOverride) === 'standard' ? ' selected' : ''}>${esc(adminT('adminContributionRewardStandard'))}</option>
                  <option value="review"${normalizeRewardTier(entry.rewardOverride) === 'review' ? ' selected' : ''}>${esc(adminT('adminContributionRewardReview'))}</option>
                  <option value="none"${normalizeRewardTier(entry.rewardOverride) === 'none' ? ' selected' : ''}>${esc(adminT('adminContributionRewardNone'))}</option>
                </select>
              </td>
            </tr>`;
            })
            .join('')}</tbody>
        </table>
      </div>
    </div>`;
    })
    .join('');
  hydrateDashboardTableLabels(body);
  renderExGuildTable();
}

function renderExGuildTable() {
  const host = $id('dashExGuildBody');
  if (!host) return;
  const entries = state.exGuildContributions || [];
  const primaryRecord = (state.contributionRecords || []).find((r) => r.isPrimary) ||
    (state.contributionRecords || [])[state.contributionRecords.length - 1];
  const primaryKeys = new Set();
  (primaryRecord?.entries || []).forEach((entry) => {
    try { primaryKeys.add(compactPlayerIdentity(entry.name || '')); } catch {}
  });
  if (!entries.length) {
    host.innerHTML = `<div class="dash-empty">${esc(adminT('adminExGuildEmpty'))}</div>`;
    return;
  }
  const rowsHtml = entries
    .map((entry) => {
      const matched = primaryKeys.has(compactPlayerIdentity(entry.playerName || ''));
      const statusBadge = matched
        ? `<span class="dash-badge dash-badge-ok">${esc(adminT('adminExGuildMatched'))}</span>`
        : `<span class="dash-badge">${esc(adminT('adminExGuildUnmatched'))}</span>`;
      return `<tr>
        <td>${esc(entry.playerName || '')}</td>
        <td style="text-align:right;font-weight:800">${formatContributionValue(entry.contribution)}</td>
        <td style="font-size:0.72rem;color:var(--text-dim)">${esc(entry.sourceNote || '')}</td>
        <td>${statusBadge}</td>
        <td><button class="dash-banner-del-btn" onclick="deleteExGuildEntry('${esc(entry.id)}')" title="${esc(adminT('adminDelete'))}">x</button></td>
      </tr>`;
    })
    .join('');
  host.innerHTML = `<table class="dash-banner-table">
    <thead><tr><th>${esc(adminT('adminContributionMember'))}</th><th style="text-align:right">${esc(adminT('adminContributionValue'))}</th><th>${esc(adminT('adminContributionNoteLabel'))}</th><th>${esc(adminT('adminExGuildStatus'))}</th><th></th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div style="margin-top:0.5rem">
    <button class="dash-btn" onclick="clearExGuildData()" style="font-size:0.75rem">${esc(adminT('adminExGuildClearAll'))}</button>
  </div>`;
  hydrateDashboardTableLabels(host);
}

export {
  loadRoster,
  saveRoster,
  showRosterModal,
  loadRosterSnapshots,
  saveRosterSnapshots,
  computeRosterDiff,
  takeRosterSnapshot,
  deleteRosterSnapshot,
  loadAllianceList,
  saveAllianceList,
  loadRosterAuth,
  saveRosterAuth,
  rosterLogin,
  rosterLogout,
  _ensureMember,
  setRosterStatus,
  setRosterAlliance,
  toggleBulkCheck,
  toggleBulkSelectAll,
  applyBulkStatus,
  applyBulkAlliance,
  exportRosterCSV,
  copyRosterNames,
  showRosterSnapshotModal,
  configureAlliances,
  renderRoster,
  loadBannerRecords,
  saveBannerRecords,
  showBannerForm,
  deleteBannerRecord,
  renderBanners,
  getTeamColor,
  hashCode,
  loadDutyRecords,
  saveDutyRecords,
  showDutyPasteForm,
  showDutyConfirmModal,
  processDutyImages,
  editDutyRecord,
  deleteDutyRecord,
  renderDutyRecords,
  loadContributionRecords,
  saveContributionRecords,
  showContributionPasteForm,
  showContributionConfirmModal,
  processContributionImages,
  editContributionRecord,
  deleteContributionRecord,
  setContributionReward,
  exportContributionRecords,
  renderContributions,
};
