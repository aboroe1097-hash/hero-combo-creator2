// Extracted OCR Render Module

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
    w.style.display = 'flex'; w.style.alignItems = 'stretch'; w.style.gap = '12px';
    const pct = Math.round((p.total_demolition/max)*100);
    w.innerHTML = `<span class="dash-top-rank" style="flex: 0 0 36px; display:flex; align-items:center;">#${p.original_rank}</span><div style="flex: 1; position:relative; display:flex; align-items:center; min-width:0; padding:4px 0;"><div class="dash-top-bar" style="width:${pct}%; top:2px; bottom:2px;"></div><span class="dash-top-name" style="position:relative; z-index:1; margin-left:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:8px;">${esc(p.name)}</span><span style="position:relative; z-index:1; margin-left:auto; margin-right:8px; font-size:0.7rem; color:#94a3b8; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:10px; white-space:nowrap; line-height:1; display:inline-flex; align-items:center; flex-shrink:0;">${p.participation_count} hits (${p.unique_structures?.size||0} structs)</span></div><span class="dash-top-val" style="flex: 0 0 auto; display:flex; align-items:center;">${(p.total_demolition/1000).toFixed(0)}k</span>`;
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
        w.style.display = 'flex'; w.style.alignItems = 'stretch'; w.style.gap = '12px';
        const pct = Math.round((p.total_demolition/lowestMax)*100); 
        w.innerHTML = `<span class="dash-top-rank" style="color:#f87171; flex: 0 0 36px; display:flex; align-items:center;">#${p.original_rank}</span><div style="flex: 1; position:relative; display:flex; align-items:center; min-width:0; padding:4px 0;"><div class="dash-top-bar" style="width:${pct}%; top:2px; bottom:2px; background: linear-gradient(90deg, rgba(248,113,113,0.1), rgba(248,113,113,0.25)); border-right-color: rgba(248,113,113,0.4)"></div><span class="dash-top-name" style="position:relative; z-index:1; margin-left:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-right:8px;">${esc(p.name)}</span><span style="position:relative; z-index:1; margin-left:auto; margin-right:8px; font-size:0.7rem; color:rgba(248,113,113,0.8); background:rgba(248,113,113,0.06); padding:2px 6px; border-radius:10px; white-space:nowrap; line-height:1; display:inline-flex; align-items:center; flex-shrink:0;">${p.participation_count} hits (${p.unique_structures?.size||0} structs)</span></div><span class="dash-top-val" style="color:#f87171; text-shadow: 0 0 10px rgba(248,113,113,0.3); flex: 0 0 auto; display:flex; align-items:center;">${(p.total_demolition/1000).toFixed(0)}k</span>`;
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

export { render, showModal, closeModal };
