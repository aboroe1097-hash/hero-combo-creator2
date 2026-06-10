// Eden team planning — 4 teams, structure assignments, timeline board
import { compareGameTimeMinutes, formatGameTimeMinutes, parseGameTimeInput } from './game-time.js';
import { getStructureLabel, getStructurePoints } from './eden-map-data.js';

export const EDEN_TEAM_IDS = ['t1', 't2', 't3', 't4'];

export const EDEN_TEAM_COLORS = {
  t1: '#ef4444',
  t2: '#3b82f6',
  t3: '#22c55e',
  t4: '#eab308',
};

export function defaultTeamNames() {
  return { t1: 'Team 1', t2: 'Team 2', t3: 'Team 3', t4: 'Team 4' };
}

export function getTeamInfo(plan, teamId) {
  if (!teamId || !EDEN_TEAM_IDS.includes(teamId)) return null;
  const names = { ...defaultTeamNames(), ...(plan?.teamNames || {}) };
  return { id: teamId, name: names[teamId] || teamId, color: EDEN_TEAM_COLORS[teamId] };
}

export function getStructTeamMeta(plan, structId) {
  return plan?.teamMeta?.[structId] || { team: '', gameTime: '', note: '' };
}

export function setStructTeamMeta(plan, structId, patch) {
  plan.teamMeta = plan.teamMeta || {};
  const prev = getStructTeamMeta(plan, structId);
  plan.teamMeta[structId] = { ...prev, ...patch };
  if (!plan.teamMeta[structId].team) {
    plan.teamMeta[structId].team = '';
  }
  const gt = plan.teamMeta[structId].gameTime;
  if (gt && parseGameTimeInput(gt) == null) {
    plan.teamMeta[structId].gameTime = '';
  }
}

export function collectTeamAssignments(plan, structures, edenT) {
  const rows = [];
  const meta = plan?.teamMeta || {};
  structures.forEach((s) => {
    const tm = meta[s.id];
    if (!tm?.team) return;
    rows.push({
      structId: s.id,
      teamId: tm.team,
      gameTime: tm.gameTime || '',
      note: tm.note || '',
      label: getStructureLabel(s.type),
      zone: s.zone,
      coords: `${s.x}:${s.y}`,
      points: getStructurePoints(s),
    });
  });
  rows.sort((a, b) => {
    const tc = compareGameTimeMinutes(a.gameTime, b.gameTime);
    if (tc !== 0) return tc;
    return a.teamId.localeCompare(b.teamId);
  });
  return rows;
}

export function groupAssignmentsByTeam(rows) {
  const groups = Object.fromEntries(EDEN_TEAM_IDS.map((id) => [id, []]));
  rows.forEach((r) => {
    if (groups[r.teamId]) groups[r.teamId].push(r);
  });
  return groups;
}

export function renderTeamBoardHtml(plan, structures, edenT) {
  const rows = collectTeamAssignments(plan, structures, edenT);
  const groups = groupAssignmentsByTeam(rows);
  const unassignedTargets = (plan.targets || []).filter((id) => !plan.teamMeta?.[id]?.team);

  let html = '';
  if (unassignedTargets.length) {
    html += `<div class="eden-team-board-hint">${edenT('edenTeamUnassignedHint').replace('{n}', String(unassignedTargets.length))}</div>`;
  }

  EDEN_TEAM_IDS.forEach((tid) => {
    const team = getTeamInfo(plan, tid);
    const items = groups[tid];
    html += `<div class="eden-team-board-group" style="--team-color:${team.color}">`;
    html += `<div class="eden-team-board-head"><span class="eden-team-dot"></span><strong>${team.name}</strong><span class="eden-team-board-count">${items.length}</span></div>`;
    if (!items.length) {
      html += `<p class="eden-team-board-empty">${edenT('edenTeamBoardEmpty')}</p>`;
    } else {
      html += '<ul class="eden-team-board-list">';
      items.forEach((item) => {
        const time = item.gameTime ? `<span class="eden-team-time">${item.gameTime}</span>` : '';
        const note = item.note ? `<span class="eden-team-note">${item.note}</span>` : '';
        html += `<li><button type="button" class="eden-team-board-item" data-team-jump="${item.structId}">${time}<span class="eden-team-item-label">${item.label} · ${item.zone}</span>${note}</button></li>`;
      });
      html += '</ul>';
    }
    html += '</div>';
  });
  return html;
}