const DEFAULT_PHASES = Object.freeze([
  Object.freeze({ id: 'phase-1', label: '0-5 Minutes', startMinute: 0, endMinute: 5 }),
  Object.freeze({ id: 'phase-2', label: '5-10 Minutes', startMinute: 5, endMinute: 10 }),
  Object.freeze({ id: 'phase-3', label: '10-15 Minutes', startMinute: 10, endMinute: 15 }),
  Object.freeze({ id: 'phase-4', label: '15-30 Minutes', startMinute: 15, endMinute: 30 }),
  Object.freeze({ id: 'phase-5', label: '30-60 Minutes', startMinute: 30, endMinute: 60 }),
]);

export const BOH_COMMAND_MODES = Object.freeze([
  Object.freeze({ id: 'my-orders', label: 'My Orders' }),
  Object.freeze({ id: 'team-plan', label: 'Team Plan' }),
  Object.freeze({ id: 'map-briefing', label: 'Map Briefing' }),
]);

function text(value) {
  return String(value ?? '').trim();
}

function seatNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function phaseList(phases) {
  const list = Array.isArray(phases) && phases.length ? phases : DEFAULT_PHASES;
  return list
    .filter((phase) => text(phase?.id))
    .map((phase, index) => ({
      id: text(phase.id),
      label: text(phase.label) || `Phase ${index + 1}`,
      startMinute: Number.isFinite(Number(phase.startMinute)) ? Number(phase.startMinute) : 0,
      endMinute: Number.isFinite(Number(phase.endMinute)) ? Number(phase.endMinute) : 0,
      order: Number.isFinite(Number(phase.order)) ? Number(phase.order) : index + 1,
    }))
    .sort((left, right) => left.order - right.order);
}

function commandRole(seat, team) {
  const playerId = text(seat?.playerId);
  if (playerId && playerId === text(team?.captainId)) return 'captain';
  if ((team?.coLeaderIds || []).map(text).includes(playerId)) return 'co-leader';
  return '';
}

function normalizeSeat(seat, team, signedInPlayerId) {
  const playerId = text(seat?.playerId);
  const lane = seat?.lane === 'backup' ? 'backup' : 'main';
  return {
    playerId,
    displayName: text(seat?.displayName || seat?.gameName) || 'Assigned player',
    seatNumber: seatNumber(seat?.seatNumber),
    lane,
    isBackup: lane === 'backup',
    side: text(seat?.side || seat?.roleLabel || seat?.roleGroupId || seat?.roleId) || 'flex',
    commandRole: commandRole(seat, team),
    isCurrentPlayer: Boolean(playerId && playerId === text(signedInPlayerId)),
  };
}

function instructionText(entry) {
  const instruction = entry?.instruction || {};
  return [
    instruction.action,
    instruction.target,
    instruction.note,
    instruction.teleport,
    instruction.routeText,
    instruction.objectiveLabel,
    instruction.objectiveId,
  ]
    .map(text)
    .filter(Boolean);
}

function instructionTargetCodes(entry, structureCodes, knownCodes) {
  const codes = [];
  for (const line of instructionText(entry)) {
    const extracted =
      typeof structureCodes === 'function'
        ? structureCodes(line)
        : line.match(/\[([A-Z]{1,3}\d{0,2})\]/gu);
    for (const rawCode of extracted || []) {
      const code = text(rawCode)
        .replace(/^\[|\]$/gu, '')
        .toUpperCase();
      if (code && !codes.includes(code)) codes.push(code);
    }
    const direct = line.toUpperCase();
    if (knownCodes.has(direct) && !codes.includes(direct)) codes.push(direct);
  }
  return codes;
}

function phaseOrders(timeline, phaseId) {
  return (Array.isArray(timeline) ? timeline : [])
    .filter((entry) => entry?.phaseId === phaseId)
    .sort((left, right) => text(left?.legionId).localeCompare(text(right?.legionId)))
    .map((entry, index) => ({
      legionId: text(entry?.legionId) || `legion-${index + 1}`,
      legionLabel: text(entry?.legionLabel) || `Legion ${index + 1}`,
      roleLabel: text(entry?.roleLabel),
      action: text(entry?.instruction?.action) || 'Await live call',
      target: text(entry?.instruction?.target),
      note: text(entry?.instruction?.note),
      teleport: text(entry?.instruction?.teleport),
      standby: entry?.instruction?.standby === true,
      gatherCrystals: entry?.instruction?.gatherCrystals === true,
      entry,
    }));
}

export function extractBohMapTargets(assignments = [], options = {}) {
  const objectives = Array.isArray(options.objectives) ? options.objectives : [];
  const known = new Map(
    objectives
      .map((objective) => [text(objective?.code).toUpperCase(), objective])
      .filter(([code]) => code)
  );
  const targets = [];
  for (const assignment of assignments) {
    for (const order of assignment.orders || []) {
      const codes = instructionTargetCodes(
        order.entry || order,
        options.structureCodes,
        new Set(known.keys())
      );
      for (const code of codes) {
        if (
          targets.some((target) => target.playerId === assignment.playerId && target.code === code)
        ) {
          continue;
        }
        const objective = known.get(code);
        targets.push({
          playerId: assignment.playerId,
          displayName: assignment.displayName,
          isCurrentPlayer: assignment.isCurrentPlayer === true,
          code,
          label: text(objective?.label) || code,
          type: text(objective?.type),
          x: Number.isFinite(Number(objective?.x)) ? Number(objective.x) : null,
          y: Number.isFinite(Number(objective?.y)) ? Number(objective.y) : null,
        });
      }
    }
  }
  return targets;
}

export function buildBohCommandView(input = {}) {
  const phases = phaseList(input.phases);
  const phaseId = phases.some((phase) => phase.id === input.phaseId)
    ? input.phaseId
    : phases[0]?.id || '';
  const team = input.team || {};
  const roster = (team.seats || team.players || [])
    .map((seat) => normalizeSeat(seat, team, input.playerId))
    .filter((seat) => seat.seatNumber)
    .sort((left, right) => left.seatNumber - right.seatNumber);
  const buildTimeline = input.timelineBuilder;
  const assignments = roster.map((seat) => {
    const timeline =
      typeof buildTimeline === 'function'
        ? buildTimeline(seat.seatNumber, {
            playerId: seat.playerId,
            gameName: seat.displayName,
            roleGroupId: seat.side,
            backup: seat.isBackup,
          })
        : [];
    return {
      ...seat,
      timeline: Array.isArray(timeline) ? timeline : [],
      orders: phaseOrders(timeline, phaseId),
    };
  });
  const roleLanes = [];
  for (const assignment of assignments) {
    const laneId = assignment.isBackup ? 'backup' : assignment.side.toLowerCase();
    let lane = roleLanes.find((entry) => entry.id === laneId);
    if (!lane) {
      lane = {
        id: laneId,
        label: assignment.isBackup ? 'Backups' : assignment.side,
        players: [],
      };
      roleLanes.push(lane);
    }
    lane.players.push(assignment);
  }
  const milestones = Array.isArray(input.milestones) ? input.milestones : [];
  const milestone = milestones.find((entry) => entry?.phaseId === phaseId) || null;
  return {
    phaseId,
    phase: phases.find((phase) => phase.id === phaseId) || null,
    phases,
    roster,
    assignments,
    roleLanes,
    milestone,
    mapTargets: extractBohMapTargets(assignments, {
      objectives: input.objectives,
      structureCodes: input.structureCodes,
    }),
  };
}
