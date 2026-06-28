import {
  state,
  $id,
  esc,
  validateTotalDemolition,
  formatDatasetStructureLabel,
  getDatasetStructureTarget,
  normalizeStructureTarget,
  isGuest,
} from './ocr-shared.js';
import { displayGameTime } from './ocr-engine.js';
import { filterGameTimeAttacks, parseGameTimeDateMs } from './ocr-time-filter.js';
import { applyR5AdjustmentsToPlayerTotals, buildAdjustedGiftRanking } from './ocr-adjustments.js';
import {
  compactPlayerIdentity,
  resolveCanonicalPlayerIdentity,
  resolveCanonicalPlayerName,
  stripGuildTagsFromPlayerName,
} from './ocr-name-normalizer.js';
import {
  buildWeightedContributionRows,
  getWeightedContributionRecordLabel,
} from './contribution-weighting.js';
import { translations } from './translations.js';

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

function valueOf(input) {
  const n = Number(input || 0);
  return Number.isFinite(n) ? n : 0;
}

function attackPlayers(attack) {
  return Array.isArray(attack?.players) ? attack.players : [];
}

function compactValue(value) {
  const n = valueOf(value);
  if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString();
}

function formatSignedNumber(value) {
  const n = valueOf(value);
  if (!n) return '0';
  return `${n > 0 ? '+' : '-'}${Math.abs(n).toLocaleString()}`;
}

function formatSharePercent(count, total) {
  if (!total) return '0%';
  const share = (count / total) * 100;
  if (share > 0 && share < 1) return `${share.toFixed(1)}%`;
  if (share > 99 && share < 100) return `${share.toFixed(1)}%`;
  return `${Math.round(share)}%`;
}

function isAttackCompleteOverride(attack) {
  return attack?.data_complete_override === true;
}

function getAttackValidation(attack) {
  if (attack && Object.prototype.hasOwnProperty.call(attack, '_validation')) {
    return attack._validation;
  }
  const result = validateTotalDemolition?.(
    attack?.structure_name,
    attack?.structure_level,
    attack?.total_demolition
  );
  const validation = result ? { ...result, overridden: isAttackCompleteOverride(attack) } : null;
  if (attack) attack._validation = validation;
  return validation;
}

function parseGameTimeDate(gameTime) {
  const ms = parseGameTimeDateMs(gameTime);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function sortAttacksChrono(attacks) {
  return [...(attacks || [])].sort((a, b) => {
    const ad = parseGameTimeDate(a.game_time)?.getTime() || 0;
    const bd = parseGameTimeDate(b.game_time)?.getTime() || 0;
    return ad - bd;
  });
}

function getTimeFilteredAttacks(attacks) {
  let atts = [...(attacks || [])];
  if (!atts.length) return atts;
  const tf = state.timeFilter || 'all';
  if (tf !== 'daily' && tf !== 'weekly') return atts;

  return filterGameTimeAttacks(atts, tf);
}

function normalizeStructureLabel(name) {
  return String(name || 'Unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function structureKey(attack) {
  const source = getDatasetStructureTarget(attack);
  const target = normalizeStructureTarget(source.structure_name, source.structure_level);
  const name = normalizeStructureLabel(target.structure_name);
  const level = target.structure_level.toLowerCase().replace(/\s+/g, '').trim();
  return `${name}|${level}`;
}

function structureLabel(attack) {
  return formatDatasetStructureLabel(attack);
}

function normalizePlayerName(name) {
  return canonicalPlayerKey(name);
}

function canonicalPlayerKey(name, attackPlayers = []) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  try {
    return resolveCanonicalPlayerIdentity(
      { name: raw.replace(/\[[^\]]+\]/g, '') },
      { attackPlayers }
    ).playerKey;
  } catch {
    return compactPlayerIdentity(stripGuildTagsFromPlayerName(raw).replace(/\[[^\]]+\]/g, ''));
  }
}

function canonicalPlayerName(player, attackPlayers = []) {
  const rawName = typeof player === 'string' ? player : player?.name;
  return (
    resolveCanonicalPlayerName(player, { attackPlayers }) ||
    String(rawName || '').trim() ||
    'Unknown Player'
  );
}

function canonicalAggregationName(player, attackPlayers = []) {
  const rawName = typeof player === 'string' ? player : player?.name;
  return (
    resolveCanonicalPlayerName(player, { attackPlayers }) ||
    String(rawName || '').trim() ||
    'Unknown Player'
  );
}

function currentR5SeasonKey() {
  return String(state.r5Season || new Date().getUTCFullYear() || 'current-season');
}

function buildAdjustedLeaderboardRows(players) {
  const season = currentR5SeasonKey();
  const adjustments = Array.isArray(state.r5Adjustments) ? state.r5Adjustments : [];
  const adjustedRows = applyR5AdjustmentsToPlayerTotals(players, adjustments, season);
  const rankedRows = buildAdjustedGiftRanking(players, adjustments, season, {
    limit: players.length,
  });
  const adjustedByKey = new Map(adjustedRows.map((row) => [row.playerKey, row]));
  return rankedRows.map((row) => ({
    ...adjustedByKey.get(row.playerKey),
    ...row,
  }));
}

function rosterMemberName(member) {
  if (!member) return '';
  if (typeof member === 'string') return member;
  return member.name || '';
}

function rosterMemberAlliance(member) {
  return typeof member === 'object' && member ? Number(member.alliance ?? -1) : -1;
}

function rosterMemberStatus(member) {
  return typeof member === 'object' && member ? member.status || 'unknown' : 'unknown';
}

function buildPlayerSummary(attacks) {
  const globalSum = {};
  (attacks || []).forEach((a) => {
    const seen = new Set();
    const players = attackPlayers(a);
    players.forEach((p) => {
      const n = canonicalAggregationName(p, players);
      const displayName = n;
      const val = valueOf(p.value ?? p.val);
      if (!globalSum[n]) {
        globalSum[n] = {
          name: n,
          total_demolition: 0,
          participation_count: 0,
          attacks: [],
          unique_structures: new Set(),
          unique_structures_count: 0,
        };
      }
      globalSum[n].total_demolition += val;
      if (!seen.has(n)) {
        globalSum[n].participation_count++;
        seen.add(n);
        globalSum[n].unique_structures.add(structureKey(a));
      }
      globalSum[n].attacks.push({
        id: a.id,
        attack_id: a.id,
        name: a.structure_name,
        structure_name: a.structure_name,
        structure_level: a.structure_level,
        raw_structure_name: a.raw_structure_name,
        raw_structure_level: a.raw_structure_level,
        display_structure_name: a.display_structure_name,
        display_structure_level: a.display_structure_level,
        game_time: a.game_time,
        player_name: n,
        display_player_name: displayName,
        raw_player_name: p.name || '',
        val,
        value: val,
        rank: p.rank,
      });
    });
  });
  Object.values(globalSum).forEach((player) => {
    player.unique_structures_count = player.unique_structures.size;
  });
  return Object.values(globalSum).sort((a, b) => b.total_demolition - a.total_demolition);
}

function uniqueStructureCount(player) {
  if (player?.unique_structures instanceof Set) return player.unique_structures.size;
  if (Number.isFinite(Number(player?.unique_structures_count)))
    return Number(player.unique_structures_count);
  if (Number.isFinite(Number(player?.unique_structures))) return Number(player.unique_structures);
  if (player?.unique_structures && typeof player.unique_structures === 'object') {
    return Object.keys(player.unique_structures).length;
  }
  return 0;
}

function applyLeaderboardSort(players) {
  const dir = state.sortDir === 'asc' ? 1 : -1;
  const col = state.sortCol || 'adjustedTotal';
  const value = (player) => {
    if (col === 'name') return String(player.name || '').toLowerCase();
    if (col === 'participation') return valueOf(player.participation_count);
    if (col === 'bonusR5') return valueOf(player.bonusR5);
    if (col === 'adjustedTotal') return valueOf(player.adjustedTotal ?? player.total_demolition);
    if (col === 'avg_demolition') {
      return valueOf(player.total_demolition) / Math.max(valueOf(player.participation_count), 1);
    }
    return valueOf(player.total_demolition);
  };

  return [...players].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (typeof av === 'string' || typeof bv === 'string') {
      const cmp = String(av).localeCompare(String(bv));
      return cmp ? cmp * dir : String(a.name || '').localeCompare(String(b.name || ''));
    }
    const cmp = av === bv ? 0 : av > bv ? 1 : -1;
    return cmp ? cmp * dir : String(a.name || '').localeCompare(String(b.name || ''));
  });
}

function buildActiveAttackView(attacks) {
  const filterEl = $id('dashLeaderFilter');
  let selectedAttackId = filterEl?.value || '';
  let selectedAttackLabel = '';
  let structureFilterLabel = '';
  let activeAttacks = [...attacks];

  if (filterEl) {
    const sortedAttacks = [...attacks].sort((a, b) => {
      const aTime = parseGameTimeDate(a.game_time)?.getTime() || 0;
      const bTime = parseGameTimeDate(b.game_time)?.getTime() || 0;
      return bTime - aTime;
    });
    const hasSelectedAttack =
      selectedAttackId && sortedAttacks.some((a) => a.id === selectedAttackId);
    if (selectedAttackId && !hasSelectedAttack) {
      selectedAttackId = '';
      if (typeof window.showToast === 'function') {
        window.showToast('Selected target no longer exists. Showing all targets.', 'info', 2600);
      }
    }
    const signature = sortedAttacks
      .map((a) => `${a.id}:${a.game_time}:${structureKey(a)}`)
      .join('|');
    if (filterEl.dataset.attsSignature !== signature) {
      let opts = '<option value="">All Uploaded Targets</option>';
      sortedAttacks.forEach((a) => {
        const label = `${structureLabel(a)} (${displayGameTime(a.game_time)})`;
        opts += `<option value="${esc(a.id)}">${esc(label)}</option>`;
      });
      filterEl.innerHTML = opts;
      filterEl.dataset.attsSignature = signature;
    }
    filterEl.value = selectedAttackId;
  }

  if (selectedAttackId) {
    state.structureFilterKey = '';
    activeAttacks = attacks.filter((a) => a.id === selectedAttackId);
    const selectedAttack = activeAttacks[0];
    if (selectedAttack) {
      selectedAttackLabel = `${structureLabel(selectedAttack)} (${displayGameTime(selectedAttack.game_time)})`;
    }
  } else if (state.structureFilterKey) {
    const filteredAttacks = attacks.filter((a) => structureKey(a) === state.structureFilterKey);
    if (filteredAttacks.length) {
      activeAttacks = filteredAttacks;
      structureFilterLabel = structureLabel(filteredAttacks[0]);
    } else {
      state.structureFilterKey = '';
    }
  }

  return { activeAttacks, structureFilterLabel, selectedAttackId, selectedAttackLabel };
}

function updateLeaderboardSortHeaders() {
  document.querySelectorAll('#ocrDashboardRoot th[data-sort]').forEach((th) => {
    th.querySelector('.dash-sort-glyph')?.remove();
    th.removeAttribute('aria-sort');
    if (th.dataset.sort !== state.sortCol) return;
    th.setAttribute('aria-sort', state.sortDir === 'asc' ? 'ascending' : 'descending');
    const glyph = document.createElement('span');
    glyph.className = 'dash-sort-glyph';
    glyph.textContent = state.sortDir === 'asc' ? ' ▲' : ' ▼';
    th.appendChild(glyph);
  });
}

function renderSparkline(values, color = 'var(--blue-400)') {
  const w = 150;
  const h = 48;
  const safe = values.length ? values : [0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const range = Math.max(max - min, 1);
  const pts = safe.map((v, i) => {
    const x = safe.length === 1 ? w / 2 : (i / (safe.length - 1)) * w;
    const y = h - 5 - ((v - min) / range) * (h - 10);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const fillPts = `0,${h} ${pts.join(' ')} ${w},${h}`;
  return `<svg class="dash-sparkline" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polygon points="${fillPts}" fill="${color}" opacity="0.12"></polygon><polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>`;
}

function setAnalyticsEmpty() {
  [
    'dashStructureChart',
    'dashPlayerTrends',
    'dashHeatmap',
    'dashHitDistribution',
    'dashConsistencyInsights',
    'dashAllianceInsights',
    'dashStreaks',
  ].forEach((id) => {
    const el = $id(id);
    if (el) el.innerHTML = '<div class="dash-empty">No attack data yet</div>';
  });
  const summary = $id('dashAnalyticsSummary');
  if (summary) summary.innerHTML = '<span>No data</span>';
}

function animateAnalyticsCards() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (state._analyticsAnimated) return;
  state._analyticsAnimated = true;
  const cards = document.querySelectorAll('#dashSubtabAnalytics .dash-analytics-card');
  cards.forEach((card, index) => {
    card.style.setProperty('--dash-stagger', `${index * 45}ms`);
    card.classList.remove('dash-analytics-in');
  });
  requestAnimationFrame(() => {
    cards.forEach((card) => card.classList.add('dash-analytics-in'));
  });
}

function renderStructurePerformance(attacks) {
  const host = $id('dashStructureChart');
  if (!host) return;

  const groups = new Map();
  attacks.forEach((a) => {
    const key = structureKey(a);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: structureLabel(a),
        attacks: 0,
        total: 0,
        attendance: 0,
        players: new Map(),
      });
    }
    const group = groups.get(key);
    group.attacks++;
    group.total += valueOf(a.total_demolition);
    group.attendance += attackPlayers(a).length;
    const players = attackPlayers(a);
    players.forEach((p) => {
      const n = canonicalAggregationName(p, players);
      group.players.set(n, (group.players.get(n) || 0) + valueOf(p.value ?? p.val));
    });
  });

  const rows = [...groups.values()]
    .map((group) => {
      const mvp = [...group.players.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        ...group,
        avgDemo: group.attacks ? Math.round(group.total / group.attacks) : 0,
        avgAttendance: group.attacks ? Math.round(group.attendance / group.attacks) : 0,
        mvpName: mvp?.[0] || '---',
        mvpValue: mvp?.[1] || 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  if (!rows.length) {
    host.innerHTML = '<div class="dash-empty">No structure data yet</div>';
    return;
  }

  const max = Math.max(...rows.map((r) => r.total), 1);
  const activeRow = rows.find((r) => r.key === state.structureFilterKey);
  const filterNote = activeRow
    ? `<div class="dash-analytics-filter-note">Leaderboard filtered by <strong>${esc(activeRow.label)}</strong><button id="dashClearStructureFilter" type="button">Clear</button></div>`
    : '';

  host.innerHTML =
    filterNote +
    rows
      .map((row) => {
        const pct = Math.max(4, Math.round((row.total / max) * 100));
        const isActive = row.key === state.structureFilterKey ? ' is-active' : '';
        return `<button type="button" class="dash-structure-item${isActive}" data-structure-key="${esc(row.key)}">
      <span class="dash-structure-bar" style="width:${pct}%"></span>
      <span class="dash-structure-main">
        <strong>${esc(row.label)}</strong>
        <span>${row.attacks} hits · ${compactValue(row.avgDemo)} avg demo · ${row.avgAttendance} avg players</span>
      </span>
      <span class="dash-structure-side">
        <strong>${compactValue(row.total)}</strong>
        <span>MVP ${esc(row.mvpName)} · ${compactValue(row.mvpValue)}</span>
      </span>
    </button>`;
      })
      .join('');

  host.querySelectorAll('[data-structure-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.structureFilterKey = btn.dataset.structureKey || '';
      state.leaderLimit = 20;
      const filter = $id('dashLeaderFilter');
      if (filter) filter.value = '';
      render();
    });
  });
  $id('dashClearStructureFilter')?.addEventListener('click', () => {
    state.structureFilterKey = '';
    render();
  });
}

function renderPlayerTrends(attacks, psum) {
  const host = $id('dashPlayerTrends');
  if (!host) return;
  const ordered = sortAttacksChrono(attacks).slice(-12);
  const top = psum.slice(0, 6);
  if (!ordered.length || !top.length) {
    host.innerHTML = '<div class="dash-empty">No player trend data yet</div>';
    return;
  }

  host.innerHTML = top
    .map((player, index) => {
      const vals = ordered.map((attack) => {
        const players = attackPlayers(attack);
        return players.reduce((sum, p) => {
          return canonicalAggregationName(p, players) === player.name
            ? sum + valueOf(p.value ?? p.val)
            : sum;
        }, 0);
      });
      const first = vals.find((v) => v > 0) || 0;
      const last = [...vals].reverse().find((v) => v > 0) || 0;
      const delta = last - first;
      const color =
        index % 3 === 0 ? 'var(--blue-400)' : index % 3 === 1 ? 'var(--green)' : 'var(--yellow)';
      return `<div class="dash-trend-row">
      <div class="dash-trend-person">
        <strong>${esc(player.name)}</strong>
        <span>${player.participation_count} hits · ${compactValue(player.total_demolition)}</span>
      </div>
      ${renderSparkline(vals, color)}
      <span class="dash-trend-delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${compactValue(delta)}</span>
    </div>`;
    })
    .join('');
}

function attackHour(attack) {
  const startTimeMatch = String(attack?.start_time || '').match(/(\d{1,2}):\d{2}/);
  if (startTimeMatch) return Number(startTimeMatch[1]);
  const date = parseGameTimeDate(attack?.game_time);
  return date ? date.getUTCHours() : 0;
}

function renderHeatmap(attacks) {
  const host = $id('dashHeatmap');
  if (!host) return;
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const from = index * 2;
    const to = from + 1;
    const label = String(from).padStart(2, '0');
    return {
      label,
      fullLabel: `${label}-${String(to).padStart(2, '0')}`,
      from,
      to,
    };
  });
  const cells = new Map();
  attacks.forEach((a) => {
    const date = parseGameTimeDate(a.game_time);
    if (!date) return;
    const hour = attackHour(a);
    const bucket = buckets.find((b) => hour >= b.from && hour <= b.to) || buckets[0];
    const key = `${date.getUTCDay()}|${bucket.label}`;
    const current = cells.get(key) || { attacks: 0, hits: 0, demo: 0, players: new Set() };
    const players = attackPlayers(a);
    current.attacks++;
    current.demo += valueOf(a.total_demolition);
    players.forEach((p) => {
      const val = valueOf(p.value ?? p.val);
      if (val <= 0) return;
      current.hits++;
      current.players.add(canonicalAggregationName(p, players));
    });
    cells.set(key, current);
  });

  if (!cells.size) {
    host.innerHTML = '<div class="dash-empty">No timestamped attacks yet</div>';
    return;
  }

  const max = Math.max(...[...cells.values()].map((c) => c.players.size), 1);
  let html = '<div class="dash-heatmap-grid"><span></span>';
  buckets.forEach((b) => {
    html += `<span class="dash-heatmap-label">${b.label}</span>`;
  });
  weekdays.forEach((day, dayIndex) => {
    html += `<span class="dash-heatmap-day">${day}</span>`;
    buckets.forEach((bucket) => {
      const cell = cells.get(`${dayIndex}|${bucket.label}`) || {
        attacks: 0,
        hits: 0,
        demo: 0,
        players: new Set(),
      };
      const participants = cell.players.size;
      const heat = participants ? (0.15 + (participants / max) * 0.85).toFixed(2) : 0;
      html += `<span class="dash-heatmap-cell" style="--heat:${heat}" title="${day} ${bucket.fullLabel}: ${participants} unique players, ${cell.hits} player rows, ${cell.attacks} uploaded targets, ${compactValue(cell.demo)} demo">
        ${participants ? `<strong>${participants}</strong><small>${compactValue(cell.demo)}</small>` : ''}
      </span>`;
    });
  });
  html +=
    '</div><div class="dash-analytics-hint">Cells show unique players and total demolition by 2-hour game-time window. Hover for uploaded targets and player-row counts.</div>';
  host.innerHTML = html;
}

function renderDistribution(attacks) {
  const host = $id('dashHitDistribution');
  if (!host) return;
  const buckets = [
    { label: 'Below 5K', min: 0, max: 5000 },
    { label: '5K-10K', min: 5000, max: 10000 },
    { label: '10K-25K', min: 10000, max: 25000 },
    { label: '25K-50K', min: 25000, max: 50000 },
    { label: '50K-75K', min: 50000, max: 75000 },
    { label: '75K-100K', min: 75000, max: 100000 },
    { label: '100K+', min: 100000, max: Infinity },
  ].map((b) => ({ ...b, count: 0, total: 0 }));

  let ignoredRows = 0;
  attacks.forEach((a) =>
    attackPlayers(a).forEach((p) => {
      const val = valueOf(p.value ?? p.val);
      if (val <= 0) {
        ignoredRows++;
        return;
      }
      const bucket = buckets.find((b) => val >= b.min && val < b.max);
      if (bucket) {
        bucket.count++;
        bucket.total += val;
      }
    })
  );

  const totalHits = buckets.reduce((sum, b) => sum + b.count, 0);
  if (!totalHits) {
    host.innerHTML = '<div class="dash-empty">No hit values yet</div>';
    return;
  }
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  host.innerHTML =
    buckets
      .map((bucket) => {
        const pct = Math.round((bucket.count / maxCount) * 100);
        const fill = bucket.count ? Math.max(3, pct) : 0;
        const share = formatSharePercent(bucket.count, totalHits);
        return `<div class="dash-dist-row">
      <span class="dash-dist-label">${bucket.label}</span>
      <span class="dash-dist-track"><span class="dash-dist-fill" style="width:${fill}%"></span></span>
      <span class="dash-dist-value">${bucket.count.toLocaleString()} <small>${share}</small></span>
    </div>`;
      })
      .join('') +
    `<div class="dash-analytics-hint">${totalHits.toLocaleString()} valid player hit rows · ${compactValue(buckets.reduce((sum, b) => sum + b.total, 0))} demolition total · ${compactValue(buckets.reduce((sum, b) => sum + b.total, 0) / totalHits)} avg per row${ignoredRows ? ` · ${ignoredRows.toLocaleString()} zero/blank OCR rows ignored` : ''}.</div>`;
}

function average(values) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

function renderConsistency(psum) {
  const host = $id('dashConsistencyInsights');
  if (!host) return;
  const scored = psum
    .filter((p) => (p.attacks || []).length >= 2)
    .map((p) => {
      const values = sortAttacksChrono(p.attacks).map((a) => valueOf(a.val ?? a.value));
      const avg = average(values);
      const variance = average(values.map((v) => Math.pow(v - avg, 2)));
      const coeff = avg ? Math.sqrt(variance) / avg : 99;
      const half = Math.floor(values.length / 2);
      const span = Math.min(5, half || 1);
      const first = average(values.slice(0, span));
      const last = average(values.slice(-span));
      return { ...p, values, coeff, delta: last - first };
    });

  if (!scored.length) {
    host.innerHTML = '<div class="dash-empty">Need at least two hits per player</div>';
    return;
  }

  const consistent = [...scored].sort((a, b) => a.coeff - b.coeff).slice(0, 5);
  const improvers = [...scored]
    .filter((p) => p.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 4);
  const decliners = [...scored]
    .filter((p) => p.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 4);
  const list = (title, rows, kind) => `<div class="dash-insight-list">
    <strong>${title}</strong>
    ${rows.length ? rows.map((p) => `<span><em>${esc(p.name)}</em><b class="${kind}">${kind === 'steady' ? `${Math.round((1 - Math.min(p.coeff, 1)) * 100)}% steady` : `${p.delta >= 0 ? '+' : ''}${compactValue(p.delta)}`}</b></span>`).join('') : '<span class="muted">Not enough movement yet</span>'}
  </div>`;

  host.innerHTML =
    list('Most consistent', consistent, 'steady') +
    list('Biggest improvers', improvers, 'up') +
    list('Decliners to watch', decliners, 'down');
}

function renderAllianceInsights(psum) {
  const host = $id('dashAllianceInsights');
  if (!host) return;
  const latest = state.rosterSnapshots?.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1]
    : null;
  const roster = latest?.members || [];
  if (!roster.length) {
    host.innerHTML =
      '<div class="dash-empty">No roster snapshot yet. Add a roster to compare participation gaps.</div>';
    return;
  }

  const participantNorm = new Set(psum.map((p) => normalizePlayerName(p.name)).filter(Boolean));
  const rosterRows = roster
    .map((member) => ({
      name: rosterMemberName(member),
      norm: normalizePlayerName(rosterMemberName(member)),
      alliance: rosterMemberAlliance(member),
      status: rosterMemberStatus(member),
    }))
    .filter((r) => r.norm);
  const missing = rosterRows.filter((r) => !participantNorm.has(r.norm));
  const rosterNorm = new Set(rosterRows.map((r) => r.norm));
  const unmapped = psum.filter((p) => !rosterNorm.has(normalizePlayerName(p.name)));
  const byAlliance = new Map();
  rosterRows.forEach((row) => {
    const label =
      row.alliance >= 0
        ? state.allianceList?.[row.alliance] || `Team ${row.alliance + 1}`
        : 'Unassigned';
    const current = byAlliance.get(label) || { total: 0, active: 0 };
    current.total++;
    if (participantNorm.has(row.norm)) current.active++;
    byAlliance.set(label, current);
  });
  const trustedMisses = missing.filter((m) => m.status === 'trusted').length;

  host.innerHTML = `
    <div class="dash-roster-stats">
      <span><strong>${rosterRows.length}</strong><small>Roster</small></span>
      <span><strong>${rosterRows.length - missing.length}</strong><small>Active</small></span>
      <span><strong>${missing.length}</strong><small>Missing</small></span>
      <span><strong>${unmapped.length}</strong><small>Unmapped</small></span>
    </div>
    <div class="dash-insight-list">
      <strong>Alliance participation</strong>
      ${[...byAlliance.entries()]
        .map(([label, stat]) => {
          const pct = stat.total ? Math.round((stat.active / stat.total) * 100) : 0;
          return `<span><em>${esc(label)}</em><b>${pct}% · ${stat.active}/${stat.total}</b></span>`;
        })
        .join('')}
    </div>
    <div class="dash-analytics-hint">${trustedMisses ? `${trustedMisses} trusted members did not appear in the filtered data.` : 'No trusted roster gaps detected in this view.'}${
      unmapped.length
        ? ` Unmapped hits: ${unmapped
            .slice(0, 4)
            .map((p) => esc(p.name))
            .join(', ')}${unmapped.length > 4 ? '...' : ''}`
        : ''
    }</div>`;
}

function renderStreaks(attacks, psum) {
  const host = $id('dashStreaks');
  if (!host) return;
  const ordered = sortAttacksChrono(attacks);
  if (!ordered.length) {
    host.innerHTML = '<div class="dash-empty">No attacks yet</div>';
    return;
  }
  const attackSets = ordered.map((a) => {
    const players = attackPlayers(a);
    return new Set(
      players.map((p) => canonicalPlayerKey(canonicalPlayerName(p, players))).filter(Boolean)
    );
  });
  const recent = attackSets.slice(-Math.min(3, attackSets.length));
  const latestRoster = state.rosterSnapshots?.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1].members
    : [];
  const trackedRosterRows = latestRoster
    .map((member) => {
      const name = rosterMemberName(member);
      const status = rosterMemberStatus(member).toLowerCase();
      return { name, status, key: canonicalPlayerKey(name) };
    })
    .filter((row) => row.name && row.key && (row.status === 'trusted' || row.status === 'active'));

  const names = [...new Set(psum.map((p) => p.name).filter(Boolean))];
  const rows = names.map((name) => {
    const norm = canonicalPlayerKey(name);
    let streak = 0;
    for (let i = attackSets.length - 1; i >= 0; i--) {
      if (!attackSets[i].has(norm)) break;
      streak++;
    }
    return { name, streak };
  });
  const top = rows
    .filter((r) => r.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 6);
  const atRisk = trackedRosterRows
    .map((row) => {
      const hasPriorAttendance = attackSets.some((set) => set.has(row.key));
      const missedRecent =
        hasPriorAttendance && recent.length ? recent.every((set) => !set.has(row.key)) : false;
      return { name: row.name, missedRecent };
    })
    .filter((r) => r.missedRecent)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);

  host.innerHTML = `<div class="dash-streak-columns">
    <div class="dash-insight-list">
      <strong>Current streaks</strong>
      ${top.length ? top.map((r) => `<span><em>${esc(r.name)}</em><b class="up">${r.streak} in a row</b></span>`).join('') : '<span class="muted">No active streaks yet</span>'}
    </div>
    <div class="dash-insight-list">
      <strong>At risk</strong>
      ${atRisk.length ? atRisk.map((r) => `<span><em>${esc(r.name)}</em><b class="down">missed last ${Math.min(3, attackSets.length)}</b></span>`).join('') : '<span class="muted">No one missed the latest run window</span>'}
    </div>
  </div>`;
}

function renderAnalytics(attacks, psum) {
  if (!$id('dashSubtabAnalytics')) return;
  state._analyticsDirty = false;
  if (!attacks.length) {
    setAnalyticsEmpty();
    return;
  }
  const totalDemo = attacks.reduce((sum, a) => sum + valueOf(a.total_demolition), 0);
  const summary = $id('dashAnalyticsSummary');
  if (summary) {
    summary.innerHTML = `
      <span><strong>${attacks.length}</strong><small>Structures</small></span>
      <span><strong>${psum.length}</strong><small>Players</small></span>
      <span><strong>${compactValue(totalDemo)}</strong><small>Demo</small></span>`;
  }
  renderStructurePerformance(attacks);
  renderPlayerTrends(attacks, psum);
  renderHeatmap(attacks);
  renderDistribution(attacks);
  renderConsistency(psum);
  renderAllianceInsights(psum);
  renderStreaks(attacks, psum);
}

function isDashboardSubtabVisible(name) {
  const id = `dashSubtab${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  const panel = $id(id);
  return Boolean(panel && !panel.classList.contains('hidden'));
}

function renderAnalyticsWhenVisible(attacks, psum) {
  if (isDashboardSubtabVisible('analytics')) {
    renderAnalytics(attacks, psum);
    return;
  }
  state._analyticsDirty = true;
}

function dutyRecordsFor(type) {
  const records = Array.isArray(state.dutyRecords) ? state.dutyRecords : [];
  if (type === 'pather') {
    return records.filter((record) => record.type === 'pather' || record.type === 'speed_tile');
  }
  return records.filter((record) => record.type === type);
}

function countDutyRows(records) {
  return records.reduce(
    (sum, record) => sum + (Array.isArray(record.entries) ? record.entries.length : 0),
    0
  );
}

function countDutyMatched(records) {
  return records.reduce((sum, record) => {
    return (
      sum +
      (Array.isArray(record.entries) ? record.entries.filter((entry) => entry.confirmed).length : 0)
    );
  }, 0);
}

function latestRecord(records) {
  return [...records].sort((a, b) => {
    const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
    if (dateCmp) return dateCmp;
    return String(b.updatedAt || b.createdAt || '').localeCompare(
      String(a.updatedAt || a.createdAt || '')
    );
  })[0];
}

function contributionReward(entry, record) {
  const override = String(entry?.rewardOverride || entry?.reward || '')
    .trim()
    .toLowerCase();
  if (
    override === 'premium' ||
    override === 'standard' ||
    override === 'review' ||
    override === 'none'
  ) {
    return override;
  }
  return Number(entry?.rank || 0) > 0 &&
    Number(entry?.rank || 0) <= Number(record?.premiumCutoff || record?.premiumSlots || 20)
    ? 'premium'
    : 'standard';
}

function contributionRewardLabel(tier) {
  return (
    {
      premium: adminT('adminContributionRewardPremium'),
      standard: adminT('adminContributionRewardStandard'),
      review: adminT('adminContributionRewardReview'),
      none: adminT('adminContributionRewardNone'),
    }[tier] || adminT('adminContributionRewardAuto')
  );
}

function renderWeightedContributionDashboard() {
  const host = $id('dashWeightedContributionPanel');
  if (!host) return;

  const model = buildWeightedContributionRows({
    contributionRecords: state.contributionRecords,
    dutyRecords: state.dutyRecords,
    r5Adjustments: state.r5Adjustments,
    season: state.r5Season,
  });
  const rows = model.rows || [];

  if (!rows.length) {
    host.innerHTML = '';
    host.classList.add('hidden');
    return;
  }

  const recordLabel = getWeightedContributionRecordLabel(model.record);
  host.classList.remove('hidden');
  host.innerHTML = `<div class="dash-card dash-weighted-contribution-card">
    <div class="dash-card-hdr">
      <h2 class="dash-card-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20V10" />
          <path d="M18 20V4" />
          <path d="M6 20v-6" />
        </svg>
        <span>Weighted Total Contribution</span>
      </h2>
      <span class="dash-weighted-contribution-meta">${esc(recordLabel || 'Latest contribution snapshot')} &middot; Top ${esc(model.premiumCutoff)} Premium</span>
    </div>
    <div class="dash-contribution-compare-table-wrap dash-weighted-contribution-table-wrap">
      <table class="dash-banner-table dash-contribution-compare-table dash-contribution-weighted-table">
        <thead><tr><th>Player</th><th>Current rank</th><th>Reward</th><th style="text-align:right">Contribution score</th><th style="text-align:right">#Shield Walls</th><th style="text-align:right">#Pathers</th><th style="text-align:right">#Banners</th><th style="text-align:right">Conduct (R5) bonus</th><th style="text-align:right">Weighted score</th><th>Final rank</th><th>Final reward</th></tr></thead>
        <tbody>${rows
          .map(
            (row) => `<tr>
          <td><strong>${esc(row.playerName)}</strong></td>
          <td>${row.currentRank ? `#${esc(row.currentRank)}` : '--'}</td>
          <td>${esc(contributionRewardLabel(row.currentReward))}</td>
          <td style="text-align:right">${valueOf(row.contributionScore).toLocaleString()}</td>
          <td style="text-align:right">${row.shieldWalls}</td>
          <td style="text-align:right">${row.pathers}</td>
          <td style="text-align:right">${row.banners}</td>
          <td style="text-align:right" class="${row.conductBonus >= 0 ? 'dash-positive' : 'dash-negative'}">${formatSignedNumber(row.conductBonus)}</td>
          <td style="text-align:right;font-weight:900;color:var(--brand-light)">${row.weightedScore.toFixed(1)}</td>
          <td>#${row.finalRank}</td>
          <td>${esc(contributionRewardLabel(row.finalReward))}</td>
        </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
  </div>`;
  hydrateDashboardTableLabels(host);
}

function getContributionSnapshotSummary() {
  const records = Array.isArray(state.contributionRecords) ? state.contributionRecords : [];
  const latest = latestRecord(records);
  if (!latest) return { records, latest: null, rows: 0, premium: 0, total: 0, topName: '---' };
  const entries = Array.isArray(latest.entries) ? latest.entries : [];
  return {
    records,
    latest,
    rows: entries.length,
    premium: entries.filter((entry) => contributionReward(entry, latest) === 'premium').length,
    total: entries.reduce((sum, entry) => sum + valueOf(entry.contribution), 0),
    topName: entries[0]?.name || '---',
  };
}

function renderSpecialOpsCards() {
  const bannerRecords = dutyRecordsFor('banner');
  const patherRecords = dutyRecordsFor('pather');
  const shieldRecords = dutyRecordsFor('shield_wall');
  const contribution = getContributionSnapshotSummary();
  const bannerRows = countDutyRows(bannerRecords);
  const patherRows = countDutyRows(patherRecords);
  const shieldRows = countDutyRows(shieldRecords);
  const hasSpecial =
    bannerRows || patherRows || shieldRows || contribution.rows || contribution.records.length;
  if (!hasSpecial) return '';
  const bannerLatest = latestRecord(bannerRecords);
  const patherLatest = latestRecord(patherRecords);
  const shieldLatest = latestRecord(shieldRecords);
  return `
    <div class="dash-ops-card dash-ops-card-special dash-ops-card-banners">
      <span class="dash-ops-label">Banners</span>
      <strong>${bannerRows ? `${bannerRows} names` : 'No records'}</strong>
      <p>${bannerRecords.length} upload${bannerRecords.length === 1 ? '' : 's'} &middot; ${countDutyMatched(bannerRecords)} matched${bannerLatest ? ` &middot; latest ${esc(bannerLatest.date || 'saved')}` : ''}</p>
    </div>
    <div class="dash-ops-card dash-ops-card-special dash-ops-card-pathers">
      <span class="dash-ops-label">Pathers / Speed Tiles</span>
      <strong>${patherRows ? `${patherRows} assignments` : 'No records'}</strong>
      <p>${patherRecords.length} plan${patherRecords.length === 1 ? '' : 's'} &middot; ${countDutyMatched(patherRecords)} matched${patherLatest ? ` &middot; latest ${esc(patherLatest.date || 'saved')}` : ''}</p>
    </div>
    <div class="dash-ops-card dash-ops-card-special dash-ops-card-shield">
      <span class="dash-ops-label">Shield Wall</span>
      <strong>${shieldRows ? `${shieldRows} names` : 'No records'}</strong>
      <p>${shieldRecords.length} list${shieldRecords.length === 1 ? '' : 's'} &middot; ${countDutyMatched(shieldRecords)} matched${shieldLatest ? ` &middot; latest ${esc(shieldLatest.date || 'saved')}` : ''}</p>
    </div>
    <div class="dash-ops-card dash-ops-card-special dash-ops-card-contributions">
      <span class="dash-ops-label">${esc(adminT('adminContributionsTab'))}</span>
      <strong>${contribution.rows ? esc(adminT('adminContributionPremiumSlots', { count: contribution.premium })) : esc(adminT('adminContributionNoSnapshots'))}</strong>
      <p>${esc(adminT('adminContributionSnapshotSummary', { count: contribution.records.length }))}${contribution.rows ? ` &middot; ${esc(adminT('adminContributionTotalCount', { total: compactValue(contribution.total) }))} &middot; ${esc(adminT('adminContributionTopPlayer', { name: contribution.topName }))}` : ''}</p>
    </div>`;
}

function renderOpsOverview(attacks, psum) {
  const host = $id('dashOpsCards');
  const jumpBtn = $id('dashOpenAnalyticsBtn');
  if (jumpBtn) {
    jumpBtn.onclick = () => {
      document
        .querySelector('#ocrDashboardRoot .dash-subtab-btn[data-subtab="analytics"]')
        ?.click();
      $id('dashSubtabAnalytics')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }
  if (!host) return;

  const specialCards = renderSpecialOpsCards();
  if (!attacks.length && !specialCards) {
    host.innerHTML =
      '<div class="dash-ops-card dash-ops-card-empty">Upload attack screenshots or special lists to unlock officer insights.</div>';
    return;
  }

  if (!attacks.length) {
    host.innerHTML =
      '<div class="dash-ops-card dash-ops-card-empty">No structure uploads yet. Special-list breakdown is still available below.</div>' +
      specialCards;
    return;
  }

  const grouped = new Map();
  attacks.forEach((attack) => {
    const key = structureKey(attack);
    const current = grouped.get(key) || {
      label: structureLabel(attack),
      count: 0,
      total: 0,
      players: 0,
    };
    current.count++;
    current.total += valueOf(attack.total_demolition);
    current.players += attackPlayers(attack).length;
    grouped.set(key, current);
  });
  const structures = [...grouped.values()].sort((a, b) => b.total - a.total);
  const topStructure = structures[0] || { label: 'Unknown', count: 0, total: 0, players: 0 };
  const avgAttendance = attacks.length
    ? Math.round(attacks.reduce((sum, a) => sum + attackPlayers(a).length, 0) / attacks.length)
    : 0;
  const bestPlayer = psum
    .map((player) => ({
      ...player,
      avg: valueOf(player.total_demolition) / Math.max(valueOf(player.participation_count), 1),
    }))
    .sort((a, b) => b.avg - a.avg)[0];
  const lowParticipation = psum
    .filter((player) => valueOf(player.participation_count) / Math.max(attacks.length, 1) < 0.25)
    .sort((a, b) => a.participation_count - b.participation_count)
    .slice(0, 3);
  const latest = sortAttacksChrono(attacks).at(-1);
  const validationIssues = attacks.reduce((sum, attack) => {
    const result = getAttackValidation(attack);
    return sum + (result && !result.match && !result.overridden ? 1 : 0);
  }, 0);

  const lowNames = lowParticipation.map((p) => esc(p.name)).join(', ');
  host.innerHTML = `
    <div class="dash-ops-card dash-ops-card-target">
      <span class="dash-ops-label">Target Mix</span>
      <strong>${esc(topStructure.label)}</strong>
      <p>${topStructure.count} hit${topStructure.count === 1 ? '' : 's'} · ${compactValue(topStructure.total)} demo · ${structures.length} unique target groups</p>
    </div>
    <div class="dash-ops-card dash-ops-card-attendance">
      <span class="dash-ops-label">Attendance Risk</span>
      <strong>${avgAttendance} avg players</strong>
      <p>${lowParticipation.length ? `${lowParticipation.length} low-frequency names: ${lowNames}` : 'No low-frequency names in the current filter.'}</p>
    </div>
    <div class="dash-ops-card dash-ops-card-mvp">
      <span class="dash-ops-label">Best Per Hit</span>
      <strong>${esc(bestPlayer?.name || '---')}</strong>
      <p>${bestPlayer ? `${compactValue(bestPlayer.avg)} avg · ${bestPlayer.participation_count} hit${bestPlayer.participation_count === 1 ? '' : 's'}` : 'No player data yet.'}</p>
    </div>
    <div class="dash-ops-card dash-ops-card-health">
      <span class="dash-ops-label">Data Health</span>
      <strong>${validationIssues ? `${validationIssues} review` : 'Clean'}</strong>
      <p>${latest ? `Latest: ${esc(structureLabel(latest))} · ${displayGameTime(latest.game_time)}` : 'No recent target found.'}</p>
    </div>`;
  if (specialCards) host.insertAdjacentHTML('beforeend', specialCards);
}

window.clearStructureLeaderboardFilter = function () {
  state.structureFilterKey = '';
  state.leaderLimit = 20;
  render();
};

function renderPerformerRow(row, player, pct, danger = false) {
  row.className = `dash-top-item dash-top-item--wide${danger ? ' dash-top-item--danger' : ''}`;
  row.style.setProperty('--dash-top-pct', `${pct}%`);
  row.innerHTML = `<span class="dash-top-rank">#${player.original_rank}</span><div class="dash-top-main"><div class="dash-top-bar"></div><span class="dash-top-name" title="${esc(player.name)}">${esc(player.name)}</span><span class="dash-top-meta">${player.participation_count} hits (${uniqueStructureCount(player)} structs)</span></div><span class="dash-top-val">${(player.total_demolition / 1000).toFixed(0)}k</span>`;
}

function render() {
  if (!state.dashData) {
    state._lastRenderedAttacks = [];
    state._lastRenderedPlayerSummary = [];
    state._lastRenderedFilterLabel = '';
    state._lastRenderedTimeLabel = 'All Time';
    ['dashKpiAttacks', 'dashKpiDemo', 'dashKpiPlayers'].forEach(
      (id) => ($id(id).textContent = '0')
    );
    $id('dashKpiMvp').textContent = '---';
    $id('dashChart').innerHTML = '<div class="dash-empty">Ready for upload</div>';
    $id('dashAttackList').innerHTML = '<div class="dash-empty">Empty</div>';
    $id('dashLeaderBody').innerHTML = '<tr><td colspan="7" class="dash-empty">No data</td></tr>';
    renderOpsOverview([], []);
    renderWeightedContributionDashboard();
    renderAnalyticsWhenVisible([], []);
    return;
  }
  const timeAttacks = getTimeFilteredAttacks(state.dashData.attacks || []);
  const { activeAttacks, structureFilterLabel, selectedAttackLabel } =
    buildActiveAttackView(timeAttacks);
  const rankedPsum = buildPlayerSummary(activeAttacks);
  const adjustedRankedPsum = buildAdjustedLeaderboardRows(rankedPsum);
  state._lastRenderedAttacks = activeAttacks;
  state._lastRenderedPlayerSummary = rankedPsum;
  state._lastRenderedAdjustedPlayerSummary = adjustedRankedPsum;
  state._lastRenderedFilterLabel = selectedAttackLabel || structureFilterLabel || '';
  state._lastRenderedTimeLabel =
    state.timeFilter === 'daily'
      ? 'Today'
      : state.timeFilter === 'weekly'
        ? 'This Week'
        : 'All Time';
  const leaderPsum = applyLeaderboardSort(adjustedRankedPsum);
  updateLeaderboardSortHeaders();

  renderAnalyticsWhenVisible(activeAttacks, rankedPsum);
  renderOpsOverview(activeAttacks, rankedPsum);
  renderWeightedContributionDashboard();

  const total = activeAttacks.reduce((s, a) => s + (a.total_demolition || 0), 0);
  $id('dashKpiAttacks').textContent = activeAttacks.length;
  $id('dashKpiDemo').textContent =
    total > 1e6 ? (total / 1e6).toFixed(1) + 'M' : total.toLocaleString();
  $id('dashKpiPlayers').textContent = rankedPsum.length;
  $id('dashKpiMvp').textContent = rankedPsum[0]?.name || '---';

  const rankedPsumWithRank = rankedPsum.map((p, i) => ({ ...p, original_rank: i + 1 }));
  const leaderPsumWithRank = leaderPsum.map((p, i) => ({
    ...p,
    original_rank: p.adjustedRank || i + 1,
  }));

  const c = $id('dashChart');
  c.innerHTML = '';
  const top = rankedPsumWithRank.slice(0, 10),
    max = top[0]?.total_demolition || 1;
  top.forEach((p) => {
    const w = document.createElement('div');
    const pct = Math.round((p.total_demolition / max) * 100);
    renderPerformerRow(w, p, pct);
    w.onclick = () => showModal('player', p);
    c.appendChild(w);
  });

  const lc = $id('dashLowestChart');
  if (lc) {
    lc.innerHTML = '';
    const lowest = rankedPsumWithRank.slice(-10).reverse();
    if (lowest.length === 0) {
      lc.innerHTML = '<div class="dash-empty">No data</div>';
    } else {
      const lowestMax = Math.max(...lowest.map((p) => p.total_demolition), 1);
      lowest.forEach((p) => {
        const w = document.createElement('div');
        const pct = Math.round((p.total_demolition / lowestMax) * 100);
        renderPerformerRow(w, p, pct, true);
        w.onclick = () => showModal('player', p);
        lc.appendChild(w);
      });
    }
  }

  const al = $id('dashAttackList');
  al.innerHTML = '';
  const filteredAttacks = activeAttacks.filter((a) => {
    const term = state.attackSearchQ.toLowerCase();
    const day = (a.game_time || '').split(' ')[0].toLowerCase();
    const target = structureLabel(a).toLowerCase();
    return target.includes(term) || day.includes(term);
  });

  if (filteredAttacks.length === 0) {
    al.innerHTML = '<div class="dash-empty">No matching attacks</div>';
  } else {
    const grouped = {};
    filteredAttacks.forEach((a) => {
      const day =
        a.game_time && a.game_time.includes(',')
          ? a.game_time.split(',')[0]
          : (a.game_time || 'Unknown Day').split(' ')[0];
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(a);
    });
    const sortedDays = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    sortedDays.forEach((day) => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'dash-attack-day-header';
      dayHeader.textContent = day;
      al.appendChild(dayHeader);
      grouped[day].forEach((a) => {
        const val = getAttackValidation(a);
        let badge = '';
        if (val) {
          badge = val.overridden
            ? `<span class="dash-val-badge dash-val-override" title="Marked complete by admin override">✓</span>`
            : val.match
              ? `<span class="dash-val-badge dash-val-ok" title="✓ ${(a.total_demolition || 0).toLocaleString()} / ${val.expected.toLocaleString()}">✓</span>`
              : `<span class="dash-val-badge dash-val-warn" title="✗ ${(a.total_demolition || 0).toLocaleString()} vs ${val.expected.toLocaleString()} (${(val.pct * 100).toFixed(1)}% off)">!</span>`;
        }
        const d = document.createElement('div');
        d.className = 'dash-attack-item';
        let timeStr = displayGameTime(a.game_time);
        if (a.start_time) {
          const match = timeStr.match(/(.*(?:,\s*|\s+))(\d{1,2}:\d{2}(?:\s*GT)?)$/i);
          if (match) timeStr = `${match[1]}${esc(a.start_time)} - ${match[2]}`;
          else timeStr = `${esc(a.start_time)} - ${timeStr}`;
        }
        d.innerHTML = `<div><div class="dash-attack-name">${esc(structureLabel(a))}${badge}</div><div class="dash-attack-time">${timeStr} · ${a.players_count} players</div></div><div class="dash-attack-actions"><div class="dash-attack-val dash-attack-val--right">${(a.total_demolition || 0).toLocaleString()}</div><button class="dash-del-btn" title="Delete Attack" onclick="event.stopPropagation(); window.deleteAttack('${a.id}')">✕</button></div>`;
        d.onclick = () => showModal('attack', a);
        al.appendChild(d);
      });
    });
  }

  const tb = $id('dashLeaderBody');
  tb.innerHTML = '';

  const filteredLeader = leaderPsumWithRank.filter((p) =>
    p.name.toLowerCase().includes(state.searchQ.toLowerCase())
  );
  const toShow = filteredLeader.slice(0, state.leaderLimit);

  if (structureFilterLabel) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" class="dash-leader-filter-note">Filtered by ${esc(structureFilterLabel)} <button type="button" onclick="window.clearStructureLeaderboardFilter()">Clear</button></td>`;
    tb.appendChild(tr);
  }

  toShow.forEach((p) => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    const bonus = valueOf(p.bonusR5);
    tr.innerHTML = `<td class="dash-rank">#${p.original_rank}</td><td class="dash-pname">${esc(p.name)}</td><td class="dash-val">${(p.total_demolition || 0).toLocaleString()}</td><td class="dash-val ${bonus >= 0 ? 'dash-positive' : 'dash-negative'}">${formatSignedNumber(bonus)}</td><td class="dash-val dash-adjusted-total">${valueOf(p.adjustedTotal ?? p.total_demolition).toLocaleString()}</td><td class="dash-table-center">${p.participation_count}</td><td class="dash-avg">${Math.round((p.total_demolition || 0) / Math.max(p.participation_count, 1)).toLocaleString()}</td>`;
    tr.onclick = () => showModal('player', p);
    tb.appendChild(tr);
  });

  if (!filteredLeader.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="7" class="dash-empty">No matching members</td>';
    tb.appendChild(tr);
  }

  if (filteredLeader.length > state.leaderLimit) {
    const tr = document.createElement('tr');
    const remaining = filteredLeader.length - state.leaderLimit;
    const pageSize = Math.min(state.leaderPageSize || 20, remaining);
    tr.innerHTML = `<td colspan="7" class="dash-load-more-cell"><button type="button" class="dash-btn dash-load-more-btn">Show More (${pageSize})</button></td>`;
    tr.querySelector('.dash-load-more-btn')?.addEventListener('click', () => {
      state.leaderLimit += pageSize;
      render();
    });
    tb.appendChild(tr);
  }

  const $avgAttend = $id('dashAvgAttend');
  const $avgDemo = $id('dashAvgDemo');
  if ($avgAttend && $avgDemo) {
    let totalAttend = 0;
    let totalDemoObj = 0;
    activeAttacks.forEach((a) => {
      totalAttend += (a.players || []).length;
      totalDemoObj += a.total_demolition || 0;
    });
    const avgA = activeAttacks.length ? Math.round(totalAttend / activeAttacks.length) : 0;
    const avgD = totalAttend ? Math.round(totalDemoObj / totalAttend) : 0;
    $avgAttend.textContent = avgA.toLocaleString();
    $avgDemo.textContent = avgD >= 1000 ? (avgD / 1000).toFixed(1) + 'k' : avgD.toLocaleString();
  }

  const partSpread = { high: 0, medium: 0, low: 0 };
  rankedPsum.forEach((p) => {
    const pct = p.participation_count / Math.max(activeAttacks.length, 1);
    if (pct >= 0.5) partSpread.high++;
    else if (pct >= 0.25) partSpread.medium++;
    else partSpread.low++;
  });
  const totalP = partSpread.high + partSpread.medium + partSpread.low;
  const $pct = $id('dashInsightPartPct');
  if ($pct)
    $pct.textContent = totalP ? `${Math.round((partSpread.high / totalP) * 100)}% Core` : '0%';
  const $pie = $id('dashPartChart');
  if ($pie) {
    if (totalP) {
      const highPct = Math.round((partSpread.high / totalP) * 100);
      const medPct = Math.round((partSpread.medium / totalP) * 100);
      const lowPct = Math.round((partSpread.low / totalP) * 100);
      $pie.innerHTML = `
        <div style="display:flex;gap:4px;height:24px;border-radius:12px;overflow:hidden;margin-bottom:12px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.3)">
           <div style="width:${highPct}%;background:linear-gradient(90deg,#10b981,#34d399);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;color:#022c22;transition:width 0.5s" title="Core Active (${partSpread.high})">${highPct > 10 ? highPct + '%' : ''}</div>
           <div style="width:${medPct}%;background:linear-gradient(90deg,#f59e0b,#fbbf24);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;color:#451a03;transition:width 0.5s" title="Casual (${partSpread.medium})">${medPct > 10 ? medPct + '%' : ''}</div>
           <div style="width:${lowPct}%;background:linear-gradient(90deg,#ef4444,#f87171);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;color:#450a0a;transition:width 0.5s" title="Inactive (${partSpread.low})">${lowPct > 10 ? lowPct + '%' : ''}</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:#cbd5e1;font-weight:700">
           <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981"></span> Core (${partSpread.high})</div>
           <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;box-shadow:0 0 6px #f59e0b"></span> Casual (${partSpread.medium})</div>
           <div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444"></span> Missed (${partSpread.low})</div>
        </div>
      `;
    } else {
      $pie.innerHTML =
        '<div style="color:#64748b;font-size:0.8rem;text-align:center;padding:1rem 0">No data available</div>';
    }
  }
  const $trend = $id('dashTrendChart');
  if ($trend) {
    $trend.classList.add('dash-activity-rendered');
    const dayMap = new Map();
    const padDate = (n) => String(n).padStart(2, '0');
    activeAttacks.forEach((a) => {
      const parsedDate = parseGameTimeDate(a.game_time);
      const key = parsedDate
        ? `${parsedDate.getUTCFullYear()}-${padDate(parsedDate.getUTCMonth() + 1)}-${padDate(parsedDate.getUTCDate())}`
        : (a.game_time || 'Unknown').split(',')[0];
      const label = parsedDate
        ? `${padDate(parsedDate.getUTCDate())}/${padDate(parsedDate.getUTCMonth() + 1)}`
        : key;
      const fullLabel = parsedDate
        ? `${padDate(parsedDate.getUTCDate())}/${padDate(parsedDate.getUTCMonth() + 1)}/${parsedDate.getUTCFullYear()}`
        : key;
      const current = dayMap.get(key) || {
        order: parsedDate
          ? Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate())
          : 0,
        label,
        fullLabel,
        targets: 0,
        demo: 0,
        participants: new Set(),
      };
      current.targets++;
      current.demo += valueOf(a.total_demolition);
      const players = attackPlayers(a);
      players.forEach((p) => current.participants.add(canonicalPlayerName(p, players)));
      dayMap.set(key, current);
    });
    const days = [...dayMap.values()].sort((a, b) => a.order - b.order).slice(-8);
    const maxTargets = Math.max(...days.map((d) => d.targets), 1);
    const maxMembers = Math.max(...days.map((d) => d.participants.size), 1);

    if (days.length === 0) {
      $trend.innerHTML =
        '<div style="color:#64748b;font-size:0.8rem;text-align:center;padding:2rem 0">No activity yet</div>';
    } else {
      const w = 560;
      const h = 205;
      const left = 44;
      const right = 18;
      const top = 26;
      const bottom = 42;
      const chartW = w - left - right;
      const chartH = h - top - bottom;
      const slot = chartW / Math.max(days.length, 1);
      const barW = Math.min(34, Math.max(14, slot * 0.42));
      const busiest = [...days].sort(
        (a, b) => b.targets - a.targets || b.participants.size - a.participants.size
      )[0];
      const avgTargets = days.reduce((sum, d) => sum + d.targets, 0) / days.length;
      const avgMembers = days.reduce((sum, d) => sum + d.participants.size, 0) / days.length;
      const memberPoints = days.map((d, i) => {
        const x = left + i * slot + slot / 2;
        const y = top + chartH - (d.participants.size / maxMembers) * chartH;
        return { x, y, d };
      });
      const linePoints = memberPoints.map((p) => `${p.x},${p.y}`).join(' ');
      const labelIndexes = new Set([0, days.length - 1, Math.floor((days.length - 1) / 2)]);
      if (days.length <= 4) days.forEach((_, index) => labelIndexes.add(index));

      let svg = `<svg class="dash-activity-svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" role="img" aria-label="Activity trend by day">`;
      svg += `<defs>
        <linearGradient id="activityBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#67e8f9"/>
          <stop offset="100%" stop-color="#0891b2"/>
        </linearGradient>
        <linearGradient id="activityMemberArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(167,139,250,0.28)"/>
          <stop offset="100%" stop-color="rgba(167,139,250,0)"/>
        </linearGradient>
      </defs>`;
      [0, 0.5, 1].forEach((ratio) => {
        const y = top + chartH * ratio;
        svg += `<line class="dash-activity-grid-line" x1="${left}" y1="${y}" x2="${w - right}" y2="${y}" stroke-dasharray="${ratio === 1 ? '0' : '4 8'}"/>`;
      });
      svg += `<text class="dash-activity-axis-label" x="${left - 10}" y="${top + 4}" font-size="11" font-weight="800" text-anchor="end">${maxTargets}</text>`;
      svg += `<text class="dash-activity-axis-label" x="${left - 10}" y="${top + chartH + 4}" font-size="11" font-weight="800" text-anchor="end">0</text>`;
      days.forEach((d, i) => {
        const x = left + i * slot + slot / 2;
        const barH = Math.max(4, (d.targets / maxTargets) * chartH);
        const y = top + chartH - barH;
        svg += `<g>
          <title>${d.fullLabel}: ${d.targets} target${d.targets === 1 ? '' : 's'}, ${d.participants.size} members, ${compactValue(d.demo)} demo</title>
          <rect x="${x - barW / 2}" y="${y}" width="${barW}" height="${barH}" rx="5" fill="url(#activityBarGrad)" opacity="0.95"/>
        </g>`;
        if (labelIndexes.has(i)) {
          svg += `<text class="dash-activity-axis-label" x="${x}" y="${h - 13}" font-size="12" font-weight="800" text-anchor="middle">${d.label}</text>`;
        } else {
          svg += `<circle class="dash-activity-axis-dot" cx="${x}" cy="${h - 18}" r="2"/>`;
        }
      });
      if (days.length > 1) {
        const areaPoints = `${left + slot / 2},${top + chartH} ${linePoints} ${left + (days.length - 1) * slot + slot / 2},${top + chartH}`;
        svg += `<polygon points="${areaPoints}" fill="url(#activityMemberArea)"/>`;
        svg += `<polyline points="${linePoints}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      memberPoints.forEach(({ x, y, d }) => {
        svg += `<circle class="dash-activity-point" cx="${x}" cy="${y}" r="5" stroke-width="2.5">
          <title>${d.fullLabel}: ${d.participants.size} unique members</title>
        </circle>`;
      });
      svg += '</svg>';
      $trend.innerHTML = `
        <div class="dash-activity-kpis">
          <div class="dash-activity-kpi">
            <div class="dash-activity-kpi-label">Busiest</div>
            <div class="dash-activity-kpi-value">${busiest.label}</div>
            <div class="dash-activity-kpi-note dash-activity-kpi-note--accent">${busiest.targets} target${busiest.targets === 1 ? '' : 's'}</div>
          </div>
          <div class="dash-activity-kpi">
            <div class="dash-activity-kpi-label">Pace</div>
            <div class="dash-activity-kpi-value">${avgTargets.toFixed(1)}</div>
            <div class="dash-activity-kpi-note">targets/day</div>
          </div>
          <div class="dash-activity-kpi">
            <div class="dash-activity-kpi-label">Crew</div>
            <div class="dash-activity-kpi-value">${Math.round(avgMembers)}</div>
            <div class="dash-activity-kpi-note">members/day</div>
          </div>
        </div>
        <div class="dash-activity-chart-panel">${svg}</div>
        <div class="dash-activity-legend">
          <span class="dash-activity-legend-item"><b class="dash-activity-swatch dash-activity-swatch--targets"></b>Targets</span>
          <span class="dash-activity-legend-item"><b class="dash-activity-swatch dash-activity-swatch--members"></b>Members</span>
          <span class="dash-activity-legend-muted">${days.length} active day${days.length === 1 ? '' : 's'}</span>
        </div>`;
    }
  }
}

function showModal(type, data) {
  try {
    const m = $id('dashModal'),
      body = $id('dashModalBody');
    if (m && m.parentElement && m.parentElement.id !== 'ocrDashboardRoot_portal_inner') {
      const portal = document.createElement('div');
      portal.id = 'ocrDashModalPortal';
      const fakeRoot = document.createElement('div');
      fakeRoot.id = 'ocrDashboardRoot_portal_inner';
      fakeRoot.id = 'ocrDashboardRoot';
      fakeRoot.appendChild(m);
      portal.appendChild(fakeRoot);
      document.body.appendChild(portal);
    }
    window._overlayStack = (window._overlayStack || 0) + 1;
    document.body.style.overflow = 'hidden';
    $id('dashModalTitle').textContent = type === 'attack' ? structureLabel(data) : data.name;
    $id('dashModalSub').textContent =
      type === 'attack'
        ? `${displayGameTime(data.game_time)} · ${data.players_count} participants`
        : `${(data.total_demolition || 0).toLocaleString()} total demolition`;
    if (type === 'attack') {
      const avg = Math.round(data.total_demolition / data.players_count);
      const tiers = { '1M+': 0, '500K+': 0, '100K+': 0, '<100K': 0 };
      data.players.forEach((p) => {
        if (p.value >= 1000000) tiers['1M+']++;
        else if (p.value >= 500000) tiers['500K+']++;
        else if (p.value >= 100000) tiers['100K+']++;
        else tiers['<100K']++;
      });
      let h = '';
      const validation = getAttackValidation(data);
      if (validation && !validation.match) {
        const missing = Math.max(0, validation.expected - (data.total_demolition || 0));
        if (validation.overridden) {
          h += `<div class="dash-validation-card dash-validation-card--complete"><div><strong>Marked Complete</strong><span>Admin override accepted this structure as complete.</span></div></div>`;
        } else {
          h += `<div class="dash-validation-card dash-validation-card--warn"><div><strong>Missing Data Warning</strong><span>Current ${(data.total_demolition || 0).toLocaleString()} / expected ${validation.expected.toLocaleString()}${missing ? ` - missing ${missing.toLocaleString()}` : ''}.</span></div>${!isGuest() ? `<button type="button" class="dash-btn dash-btn-xs dash-complete-override-btn" onclick="window.markAttackComplete('${data.id}')">Mark Complete</button>` : ''}</div>`;
        }
      }
      if (!isGuest()) {
        h += `<div class="dash-modal-actions"><button class="dash-btn dash-btn-xs dash-btn-soft" onclick="window.addPlayer('${data.id}')">Add Player</button><button class="dash-btn dash-btn-xs dash-btn-soft" onclick="window.editAttack('${data.id}')">Edit Details</button><button class="dash-btn dash-btn-xs dash-btn-danger-soft" onclick="window.deleteAttack('${data.id}')">Delete</button></div>`;
      }
      h += `<div class="dash-modal-grid"><div class="dash-modal-stat"><div>Total Demolition</div><div class="dash-modal-stat-value dash-modal-stat-value--teal">${(data.total_demolition || 0).toLocaleString()}</div></div><div class="dash-modal-stat"><div>Participants</div><div class="dash-modal-stat-value dash-modal-stat-value--blue">${data.players_count}</div></div><div class="dash-modal-stat"><div>Avg per Hit</div><div class="dash-modal-stat-value dash-modal-stat-value--amber">${(avg || 0).toLocaleString()}</div></div><div class="dash-modal-stat"><div>Start Time</div><div class="dash-modal-stat-value dash-modal-stat-value--purple">${data.start_time ? esc(data.start_time) : '---'}</div></div><div class="dash-modal-stat"><div>End Time</div><div class="dash-modal-stat-value dash-modal-stat-value--purple">${displayGameTime(data.game_time)}</div></div><div class="dash-modal-stat"><div>Structure</div><div class="dash-modal-stat-value dash-modal-stat-value--teal">${esc(structureLabel(data))}</div></div></div>`;
      h += `<div class="dash-modal-section-label">Value Distribution</div><div class="dash-distrib">${Object.entries(
        tiers
      )
        .filter(([, v]) => v > 0)
        .map(
          ([k, v]) =>
            `<div class="dash-distrib-item"><span class="dash-distrib-bar" style="width:${(v / data.players_count) * 100}%"></span><span class="dash-distrib-label">${k}</span><span class="dash-distrib-count">${v}</span></div>`
        )
        .join('')}</div>`;
      h += `<div class="dash-modal-section-label">Player Breakdown</div><table class="dash-table dash-table--stack"><thead><tr><th>#</th><th>Name</th><th class="dash-table-right">Demolition</th>${!isGuest() ? '<th></th>' : ''}</tr></thead><tbody>`;
      data.players.forEach((p) => {
        const encName = encodeURIComponent(p.name).replace(/'/g, '%27');
        h += `<tr onclick="window.showPlayer('${encName}')"><td data-label="Rank" class="dash-rank ${p.rank <= 3 ? 'rank-' + p.rank : ''}">#${p.rank}</td><td data-label="Name" class="dash-pname dash-table-link">${esc(p.name)}</td><td data-label="Demolition" class="dash-val">${(p.value || p.val || 0).toLocaleString()}</td>`;
        if (!isGuest()) {
          h += `<td data-label="Edit" class="dash-table-right"><button class="dash-btn dash-btn-xs dash-btn-soft" onclick="event.stopPropagation(); window.editPlayer('${data.id}', '${encName}')">Edit</button></td>`;
        }
        h += `</tr>`;
      });
      body.innerHTML = h + '</tbody></table>';
    } else {
      if (data._not_in_summary) {
        body.innerHTML = `<div class="dash-player-empty-state">
          <div class="dash-player-empty-icon">?</div>
          <div class="dash-player-empty-name">${esc(data.name)}</div>
          <div>This player appeared in one attack but hasn't been fully aggregated yet.</div>
          <div class="dash-player-empty-hint">Upload more screenshots or refresh the dashboard to see their full profile.</div>
        </div>`;
        m.classList.add('active');
        return;
      }
      const sortedAttacks = [...(data.attacks || [])].sort((a, b) =>
        (b.game_time || '').localeCompare(a.game_time || '')
      );
      window._dashCurrentPlayerReport = data;
      const hrMap = {};
      for (let i = 0; i < 24; i++) hrMap[i] = 0;
      sortedAttacks.forEach((att) => {
        let hr = null;
        if (att.start_time) {
          hr = parseInt(att.start_time.split(':')[0], 10);
        } else if (att.game_time) {
          const parts = att.game_time.split(', ');
          if (parts.length > 2) {
            hr = parseInt(parts[2].split(':')[0], 10);
          }
        }
        if (hr !== null && !isNaN(hr) && hr >= 0 && hr <= 23) hrMap[hr]++;
      });
      const hrs = Object.keys(hrMap)
        .map(Number)
        .sort((a, b) => a - b);
      let chartHtml = '';
      if (hrs.some((h) => hrMap[h] > 0)) {
        const maxHr = Math.max(...Object.values(hrMap), 1);
        chartHtml = `<div class="dash-active-hours"><div class="dash-modal-section-label">Active Hours (Game Time)</div>
          <div class="dash-active-hours-track">
          ${hrs
            .map((hr) => {
              const val = hrMap[hr];
              const pct = (val / maxHr) * 100;
              const bg =
                val > 0
                  ? pct > 70
                    ? 'var(--blue-400)'
                    : pct > 30
                      ? 'var(--brand-light)'
                      : 'var(--text-dim)'
                  : 'transparent';
              return `<div class="dash-active-hour-bar" style="--active-hour-bg:${bg};--active-hour-height:${pct}%;--active-hour-min:${val > 0 ? '4px' : '0'}" title="${hr}:00 - ${hr}:59 GT (${val} hits)"></div>`;
            })
            .join('')}
          </div>
          <div class="dash-active-hours-axis">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
          </div></div>`;
      }

      const encPname = encodeURIComponent(data.name).replace(/'/g, '%27');
      let pb = `<div class="dash-modal-actions"><button type="button" class="dash-btn dash-btn-xs dash-btn-soft" onclick="event.stopPropagation(); window.exportPlayerReport('${encPname}')">Export CSV Report</button></div>`;

      body.innerHTML =
        pb +
        `<div class="dash-modal-grid"><div class="dash-modal-stat"><div>Total Demolition</div><div class="dash-modal-stat-value dash-modal-stat-value--blue">${(data.total_demolition || 0).toLocaleString()}</div></div><div class="dash-modal-stat"><div>Structures Hit</div><div class="dash-modal-stat-value dash-modal-stat-value--teal">${data.attacks?.length || 0}</div></div><div class="dash-modal-stat"><div>Avg per Hit</div><div class="dash-modal-stat-value dash-modal-stat-value--amber">${data.attacks?.length ? Math.round((data.total_demolition || 0) / data.attacks.length).toLocaleString() : '0'}</div></div></div>` +
        chartHtml +
        '<table class="dash-table dash-table--stack"><thead><tr><th>Time</th><th>Target</th><th class="dash-table-right">Value</th><th class="dash-table-center">Rank</th></tr></thead><tbody>' +
        sortedAttacks
          .map(
            (att) =>
              `<tr onclick="window.showAttack('${att.id || att.attack_id}')"><td data-label="Time">${displayGameTime(att.game_time)}</td><td data-label="Target" class="dash-table-link">${esc(formatDatasetStructureLabel(att))}</td><td data-label="Value" class="dash-table-right">${(att.val || att.value || 0).toLocaleString()}</td><td data-label="Rank" class="dash-table-center">#${att.rank || '-'}</td></tr>`
          )
          .join('') +
        '</tbody></table>' +
        '<div class="dash-modal-note">Buildings are typically attackable only on Sunday, Tuesday, Thursday (server schedule). Active times reflect participation on those days.</div>';
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
    if (m) {
      m.classList.add('active');
      $id('dashModalBody').innerHTML =
        `<div style="color:red;padding:2rem"><b>Error in showModal:</b><br>${err.stack || err}</div>`;
    }
    console.error('showModal Error:', err);
  }

  if (!window._modalEscListener) {
    window._modalEscListener = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', window._modalEscListener);
  }
}

function closeModal() {
  $id('dashModal')?.classList.remove('active');
  window._overlayStack = Math.max(0, (window._overlayStack || 1) - 1);
  if (window._overlayStack === 0) {
    document.body.style.overflow = '';
    document.body.style.overflowY = '';
  }
}

export {
  render,
  showModal,
  closeModal,
  buildPlayerSummary,
  uniqueStructureCount,
  animateAnalyticsCards,
};
