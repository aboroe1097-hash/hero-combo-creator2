/**
 * All-Star BoH — Stage 1 match plan template.
 *
 * Emits timeline entries in the published shape: five phases by two legions gives each member
 * exactly ten entries. A canonical team plan may project paired substitutions without changing
 * that phase contract.
 *
 * Vocabulary follows production, not the prototype this came from:
 *   seatNumber   1..12, score-ranked; seat 1 is the highest scorer
 *   roleGroupId  offensive | rune | top | bottom
 *   legionId     legion-1 | legion-2
 *
 * Backups default to no play. A substitution is explicit plan data with `backupPlayerId`,
 * `replacesPlayerId`, and an exact `entryMinute` from 3 through 60. The outgoing timeline ends
 * and the incoming timeline starts at the same minute, preserving the ten-player active cap.
 *
 * Typed instruction flags are sparse and optional for backend/UI integrators:
 *   standby        player is not deployed in this phase
 *   gatherCrystals this exact legion entry is assigned Sacred Crystal Mine gathering *
 * This is a default template only. A leadership override always wins, and nothing here is
 * authoritative once a publication exists.
 */

export const BOH_STAGE1_PLAN_ID = 'stage-1';
export const BOH_STAGE1_SEATS = 12;
export const BOH_STAGE1_BACKUP_SEATS = Object.freeze([11, 12]);
export const BOH_STAGE1_MAX_ACTIVE_PLAYERS = 10;
export const BOH_STAGE1_MIN_SUBSTITUTION_MINUTE = 3;
export const BOH_STAGE1_MATCH_END_MINUTE = 60;

export const BOH_STAGE1_LEGIONS = Object.freeze([
  Object.freeze({ id: 'legion-1', label: 'Legion 1', order: 1 }),
  Object.freeze({ id: 'legion-2', label: 'Legion 2', order: 2 }),
]);

export const BOH_STAGE1_PHASES = Object.freeze([
  Object.freeze({ id: 'phase-1', label: '0-5 Minutes', order: 1, startMinute: 0, endMinute: 5 }),
  Object.freeze({ id: 'phase-2', label: '5-10 Minutes', order: 2, startMinute: 5, endMinute: 10 }),
  Object.freeze({
    id: 'phase-3',
    label: '10-15 Minutes',
    order: 3,
    startMinute: 10,
    endMinute: 15,
  }),
  Object.freeze({
    id: 'phase-4',
    label: '15-30 Minutes',
    order: 4,
    startMinute: 15,
    endMinute: 30,
  }),
  Object.freeze({
    id: 'phase-5',
    label: '30-60 Minutes',
    order: 5,
    startMinute: 30,
    endMinute: 60,
  }),
]);

/** What unlocks each phase, plus shared-alliance teleport guidance. */
export const BOH_STAGE1_MILESTONES = Object.freeze([
  Object.freeze({
    phaseId: 'phase-1',
    unlocks: 'Stronghold, Watch Post and Command Center open',
    teleportTag: 'Hold teleports',
    teleport:
      'The alliance starts with 5 shared teleports. The first Command Center capture adds 5.',
  }),
  Object.freeze({
    phaseId: 'phase-2',
    unlocks: 'Hospital, Armory and Fortress of Honor unlock',
    teleportTag: 'Bank one every 5 minutes',
    teleport: 'A held Command Center generates one teleport every 5 minutes. Recapturing adds 2.',
  }),
  Object.freeze({
    phaseId: 'phase-3',
    unlocks: 'Fortress of Honor pays large periodic Alliance Points',
    teleportTag: 'Spend on the Fortress',
    teleport:
      'Spend teleports to contest the Fortress of Honor. You may only teleport into our own territory.',
  }),
  Object.freeze({
    phaseId: 'phase-4',
    unlocks: 'The Sanctuary opens and spawns the Divine Rune',
    teleportTag: 'Reserve for the Rune',
    teleport: 'Hold the remaining teleports for the Rune escort and Relay defence.',
  }),
  Object.freeze({
    phaseId: 'phase-5',
    unlocks: 'The final 30 minutes remain editable as the battlefield changes',
    teleportTag: 'Leadership call',
    teleport: 'Use the shared alliance pool only on the active leadership call.',
  }),
]);

/** Personal skills are separate from the shared alliance teleport pool. */
export const BOH_STAGE1_BATTLEFIELD_SKILLS = Object.freeze([
  Object.freeze({
    id: 'battlefield-teleport',
    label: 'Battlefield Teleport',
    battleMeritCost: 1000,
    effect: 'Adds one personal battlefield teleport.',
  }),
  Object.freeze({
    id: 'emergency-treatment',
    label: 'Emergency Treatment',
    battleMeritCost: 1000,
    effect: null,
  }),
  Object.freeze({ id: 'rapid-freeze', label: 'Rapid Freeze', battleMeritCost: 3000, effect: null }),
  Object.freeze({ id: 'meteor-fall', label: 'Meteor Fall', battleMeritCost: 6000, effect: null }),
]);

export const BOH_STAGE1_BATTLE_MERIT = Object.freeze({
  conversionRate: null,
  configurablePerPlayer: true,
});

export const BOH_STAGE1_BUILDING_BUFFS = Object.freeze({
  provisional: true,
  exactStructureMapping: null,
  knownBuffs: Object.freeze(['march-speed', 'occupation-speed', 'four-march-queues']),
});
const BOH_STAGE1_SCHEMATIC_BOUNDS = Object.freeze({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
function bohDeepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(bohDeepFreeze);
  return Object.freeze(value);
}
function bohSchematicNode([id, kind, x, y, parentId = null]) {
  return {
    id,
    kind,
    parentId,
    x,
    y,
    coordinateKind: 'schematic',
    coverage: { minX: x - 2, minY: y - 2, maxX: x + 2, maxY: y + 2, width: 5, height: 5 },
  };
}
const BOH_STAGE1_BLUE_SCHEMATIC_NODES = [
  ['HOME', 'home', 50, 90],
  ['T1', 'tower', 50, 85, 'HOME'],
  ['T2', 'tower', 50, 80, 'T1'],
  ['T3', 'tower', 50, 75, 'T2'],
  ['T4', 'tower', 50, 70, 'T3'],
  ['T5', 'tower', 48, 65, 'T4'],
  ['T6', 'tower', 46, 60, 'T5'],
  ['T7', 'tower', 44, 55, 'T6'],
  ['T8', 'tower', 42, 50, 'T7'],
  ['T9', 'tower', 40, 45, 'T8'],
  ['T10', 'tower', 38, 40, 'T9'],
  ['T11', 'tower', 36, 35, 'T10'],
  ['T12', 'tower', 34, 30, 'T11'],
  ['T13', 'tower', 32, 25, 'T12'],
  ['T14', 'tower', 30, 20, 'T13'],
  ['T15', 'tower', 54, 67, 'T4'],
  ['T16', 'tower', 58, 64, 'T15'],
  ['T17', 'tower', 62, 61, 'T16'],
  ['T18', 'tower', 66, 58, 'T17'],
  ['T19', 'tower', 70, 55, 'T18'],
  ['FH1', 'fortress-of-honor', 30, 15],
  ['FH2', 'fortress-of-honor', 75, 55],
].map(bohSchematicNode);
const BOH_STAGE1_SCHEMATIC_LINKS = BOH_STAGE1_BLUE_SCHEMATIC_NODES.filter((n) => n.parentId)
  .map((n) => ({ from: n.parentId, to: n.id, kind: 'territory' }))
  .concat([
    { from: 'T14', to: 'FH1', kind: 'objective' },
    { from: 'T19', to: 'FH2', kind: 'objective' },
  ]);
function bohMirrorSchematicNode(n) {
  return bohSchematicNode([n.id, n.kind, 100 - n.x, 100 - n.y, n.parentId]);
}
export const BOH_STAGE1_TOWER_TOPOLOGY = bohDeepFreeze({
  coordinateSystem: {
    kind: 'schematic',
    label: 'Schematic planning grid; not in-game coordinates',
    bounds: BOH_STAGE1_SCHEMATIC_BOUNDS,
    coverage: 'Each node claims a 5x5 grid footprint.',
    redTransform: '180-degree mirror of blue',
  },
  sides: {
    blue: { nodes: BOH_STAGE1_BLUE_SCHEMATIC_NODES, links: BOH_STAGE1_SCHEMATIC_LINKS },
    red: {
      nodes: BOH_STAGE1_BLUE_SCHEMATIC_NODES.map(bohMirrorSchematicNode),
      links: BOH_STAGE1_SCHEMATIC_LINKS.map((link) => ({ ...link })),
    },
  },
});
function bohFootprintsTouch(a, b) {
  return (
    a.minX <= b.maxX + 1 && a.maxX + 1 >= b.minX && a.minY <= b.maxY + 1 && a.maxY + 1 >= b.minY
  );
}
export function bohValidateStage1TowerTopology(topology = BOH_STAGE1_TOWER_TOPOLOGY) {
  const errors = [];
  if (topology?.coordinateSystem?.kind !== 'schematic')
    errors.push('coordinate system must be schematic');
  ['blue', 'red'].forEach((sideName) => {
    const side = topology?.sides?.[sideName],
      nodes = Array.isArray(side?.nodes) ? side.nodes : [],
      links = Array.isArray(side?.links) ? side.links : [],
      byId = new Map(nodes.map((n) => [n.id, n]));
    if (byId.size !== nodes.length) errors.push(`${sideName}: duplicate node id`);
    nodes.forEach((n) => {
      if (n.coverage?.width !== 5 || n.coverage?.height !== 5)
        errors.push(`${sideName}:${n.id} must claim 5x5 coverage`);
      if (n.kind === 'tower') {
        const p = byId.get(n.parentId);
        if (!p)
          errors.push(`${sideName}:${n.id} parent ${n.parentId || '(missing)'} does not exist`);
        else if (!bohFootprintsTouch(n.coverage, p.coverage))
          errors.push(`${sideName}:${n.id} territory is disconnected from ${p.id}`);
      }
    });
    links.forEach((l) => {
      if (!byId.has(l.from) || !byId.has(l.to))
        errors.push(`${sideName}: invalid link ${l.from}->${l.to}`);
    });
    const reachable = new Set(['HOME']);
    let changed = true;
    while (changed) {
      changed = false;
      links.forEach((l) => {
        if (reachable.has(l.from) && !reachable.has(l.to)) {
          reachable.add(l.to);
          changed = true;
        }
      });
    }
    nodes.forEach((n) => {
      if (!reachable.has(n.id)) errors.push(`${sideName}:${n.id} is not connected to HOME`);
    });
  });
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
/**
 * Orders keyed by seat, then by phase index. Each row is
 * [roleLabel, legion 1 action, legion 2 action, teleport note].
 * Seats 1-10 come from the leadership template; 11-12 resolve through the backup rules.
 */
const STAGE1_ORDERS = Object.freeze({
  1: [
    [
      'Offensive Team',
      'Capture & Defend Our Command Center [CC1]',
      'Build Towers - T1s & Speed Heroes',
      'No Teleport',
    ],
    [
      'Offensive Team',
      'Secure TOP Fortress of Honor [FH1]',
      'Capture & Defend Our Command Center [CC1]',
      'No Teleport',
    ],
    [
      'Offensive Team',
      'Build Towers - T9s',
      'Attack Enemy Towers / Enemy Castles',
      'Teleport to Relay2 [RP2] - Tower 7 [T7]',
    ],
    [
      'Offensive Team',
      'Protect Rune at Relay (or attack enemy Rune path)',
      'Protect Rune at Relay (or attack enemy Rune path)',
      'Teleport to Center Building [S] - Tower 8/9 [T8]',
    ],
  ],
  2: [
    [
      'Offensive Team',
      'Capture & Defend Our Bot Outposts [OP1]',
      'Build Towers - T1s & Speed Heroes',
      'No Teleport',
    ],
    [
      'Offensive Team',
      'Secure BOT Fortress of Honor [FH2]',
      'Capture & Defend Our Bot Outposts [OP1]',
      'No Teleport',
    ],
    [
      'Offensive Team',
      'Build Towers - T9s',
      'Attack Enemy Towers / Enemy Castles',
      'Teleport to Relay2 [RP2] - Tower 7 [T7]',
    ],
    [
      'Offensive Team',
      'Protect Rune at Relay (or attack enemy Rune path)',
      'Protect Rune at Relay (or attack enemy Rune path)',
      'Teleport to Center Building [S] - Tower 8/9 [T8]',
    ],
  ],
  3: [
    [
      'Offensive Team',
      'Capture Enemy Command Center [CC2]',
      'Gather Crystals - T1s',
      'No Teleport',
    ],
    [
      'Rune Team',
      'Capture & Defend Our Hospital [H1]',
      'Build Towers - T1s & Speed Heroes',
      'No Teleport',
    ],
    [
      'Rune Team',
      'Build Towers - T9s',
      'Attack Enemy Towers / Enemy Castles',
      'Teleport to Relay2 [RP2] - Tower 7 [T7]',
    ],
    [
      'Rune Team',
      'Protect Rune at Relay (Garrison/Defend Rune)',
      'TAKE THE RUNE (Primary Rune Runner) - T1s & Speed Heroes',
      'No Teleport',
    ],
  ],
  4: [
    ['Rune Team', 'Capture Enemy Outpost [OP2]', 'Gather Crystals - T1s', 'No Teleport'],
    [
      'Rune Team',
      'Capture & Defend Our Arsenal [A1]',
      'Build Towers - T1s & Speed Heroes',
      'No Teleport',
    ],
    [
      'Rune Team',
      'Build Towers - T9s',
      'Attack Enemy Towers / Enemy Castles',
      'Teleport to Relay2 [RP2] - Tower 7 [T7]',
    ],
    [
      'Rune Team',
      'Protect Rune at Relay (Garrison/Defend Rune)',
      'TAKE THE RUNE (Primary Rune Runner) - T1s & Speed Heroes',
      'No Teleport',
    ],
  ],
  5: [
    ['Rune Team', 'Build Towers - T1s & Speed Heroes', 'Gather Crystals - T1s', 'No Teleport'],
    [
      'Joker Team',
      'Attack Enemy Towers',
      'Build Towers - T1s & Speed Heroes',
      'Teleport to Relay1 [RP1] - Tower 5 [T5]',
    ],
    ['Joker Team', 'Secure TOP Fortress of Honor [FH1]', 'Build Towers - T9s', 'No Teleport'],
    [
      'Joker Team',
      'Protect Rune at Relay (Garrison/Defend Rune)',
      'Attack Enemy Towers',
      'No Teleport',
    ],
  ],
  6: [
    ['Rune Team', 'Build Towers - T1s & Speed Heroes', 'Gather Crystals - T1s', 'No Teleport'],
    [
      'Joker Team',
      'Attack Enemy Towers',
      'Build Towers - T1s & Speed Heroes',
      'Teleport to Relay1 [RP1] - Tower 5 [T5]',
    ],
    ['Joker Team', 'Secure BOT Fortress of Honor [FH2]', 'Build Towers - T9s', 'No Teleport'],
    [
      'Joker Team',
      'Protect Rune at Relay (Garrison/Defend Rune)',
      'Attack Enemy Towers',
      'No Teleport',
    ],
  ],
  7: [
    [
      'Defensive Team - Top',
      'Build Towers - T1s & Speed Heroes',
      'Gather Crystals - T1s',
      'Teleport to Tower 3 [T3] - be on the side opposing the bot map',
    ],
    [
      'Defensive Team - Top',
      'Attack Enemy Arsenal [A2]',
      'Build Towers - T1s & Speed Heroes',
      'No Teleport',
    ],
    [
      'Defensive Team - Top',
      'Capture & Defend Our Command Center [CC1]',
      'Capture Enemy Command Center [CC2]',
      'No Teleport',
    ],
    [
      'Defensive Team - Top',
      'Protect Rune at Relay (Reinforce as needed)',
      'Capture & Defend Our Command Center [CC1]',
      'No Teleport',
    ],
  ],
  8: [
    [
      'Defensive Team - Top',
      'Build Towers - T1s & Speed Heroes',
      'Gather Crystals - T1s',
      'Teleport to Tower 3 [T3] - be on the side opposing the bot map',
    ],
    [
      'Defensive Team - Top',
      'Capture Enemy Hospital [H2]',
      'Build Towers - T1s & Speed Heroes',
      'No Teleport',
    ],
    [
      'Defensive Team - Top',
      'Capture & Defend Our Bot Outposts [OP1]',
      'Capture Enemy Outpost [OP2]',
      'No Teleport',
    ],
    [
      'Defensive Team - Top',
      'Protect Rune at Relay (Reinforce as needed)',
      'Capture & Defend Our Bot Outposts [OP1]',
      'No Teleport',
    ],
  ],
  9: [
    [
      'Defensive Team - Top',
      'Build Towers - T1s & Speed Heroes',
      'Gather Crystals - T1s',
      'Teleport to Tower 3 [T3] - be on the side opposing the bot map',
    ],
    [
      'Defensive Team - Bot',
      'Capture Enemy Command Center [CC2]',
      'Build Towers - T1s & Speed Heroes',
      'No Teleport',
    ],
    [
      'Defensive Team - Bot',
      'Capture & Defend Our Hospital [H1]',
      'Attack Enemy Arsenal [A2]',
      'No Teleport',
    ],
    [
      'Defensive Team - Bot',
      'Protect Rune at Relay (Reinforce as needed)',
      'Capture & Defend Our Hospital [H1]',
      'No Teleport',
    ],
  ],
  10: [
    [
      'Defensive Team - Bot',
      'Build Towers - T1s & Speed Heroes',
      'Gather Crystals - T1s',
      'Teleport to Tower 3 [T3] - be on the side opposing the bot map',
    ],
    [
      'Defensive Team - Bot',
      'Capture Enemy Outpost [OP2]',
      'Build Towers - T1s & Speed Heroes',
      'No Teleport',
    ],
    [
      'Defensive Team - Bot',
      'Capture & Defend Our Arsenal [A1]',
      'Attack Enemy Hospital [H2]',
      'No Teleport',
    ],
    [
      'Defensive Team - Bot',
      'Protect Rune at Relay (Reinforce as needed)',
      'Capture & Defend Our Arsenal [A1]',
      'No Teleport',
    ],
  ],
});

/** Default instruction for a backup who has no paired substitution event. */
export const BOH_STAGE1_STANDBY_ORDER = Object.freeze({
  roleLabel: 'Backup - Standby',
  action: 'Default no play - stand by unless leadership records a paired substitution',
  note: 'Not deployed. A backup enters only through a paired substitution at minute 3 or later.',
});

/** A backup's instruction after a valid paired substitution event. */
export const BOH_STAGE1_BACKUP_ORDER = Object.freeze({
  roleLabel: 'Backup - Substitution',
  legion1: 'Take over the outgoing starter Legion 1 task',
  legion2: 'Take over the outgoing starter Legion 2 task',
  note: 'Use the outgoing starter plan unless leadership edits it.',
});

export function bohIsBackupSeat(seatNumber) {
  return BOH_STAGE1_BACKUP_SEATS.includes(Number(seatNumber));
}

/** True when a backup has no substitution, or the substitution has not reached this phase. */
export function bohIsStandby(seatNumber, phaseIndex, substitution = null) {
  if (!bohIsBackupSeat(seatNumber)) return false;
  if (!substitution?.plays) return true;
  const phase = BOH_STAGE1_PHASES[Number(phaseIndex)];
  return !phase || Number(substitution.entryMinute) >= phase.endMinute;
}
function bohInstructionExtras(action, standby) {
  const extras = {};
  if (standby) extras.standby = true;
  if (/^Gather Crystals\b/iu.test(String(action || ''))) extras.gatherCrystals = true;
  return extras;
}

/** Default role group for a seat, matching the score-rank rule leadership uses. */
export function bohSeatRoleGroup(seatNumber) {
  const seat = Number(seatNumber);
  if ([1, 2, 8].includes(seat)) return 'offensive';
  if ([3, 5, 12].includes(seat)) return 'top';
  if ([4, 6, 11].includes(seat)) return 'bottom';
  if ([7, 9, 10].includes(seat)) return 'rune';
  return 'offensive';
}

function bohRosterPlayer(p, i) {
  return {
    playerId: String(p?.playerId || p?.id || ''),
    seatNumber: Number(p?.seatNumber ?? i + 1),
    backup: p?.backup === true,
    active: p?.active !== false,
  };
}
export function bohValidateStage1Roster(players = [], { release = false } = {}) {
  const roster = Array.isArray(players) ? players.map(bohRosterPlayer) : [],
    errors = [],
    ids = new Set(),
    seats = new Set();
  roster.forEach((p) => {
    if (!p.playerId) errors.push('every roster player requires playerId');
    else if (ids.has(p.playerId)) errors.push(`duplicate playerId ${p.playerId}`);
    ids.add(p.playerId);
    if (!Number.isInteger(p.seatNumber) || p.seatNumber < 1 || p.seatNumber > 12)
      errors.push(`invalid seat ${p.seatNumber}`);
    else if (seats.has(p.seatNumber)) errors.push(`duplicate seat ${p.seatNumber}`);
    seats.add(p.seatNumber);
  });
  const backups = roster.filter((p) => p.backup),
    starters = roster.filter((p) => !p.backup && p.active);
  if (roster.length > 12) errors.push('roster cannot exceed 12 players');
  if (backups.length > 2) errors.push('draft cannot exceed 2 backups');
  if (starters.length > BOH_STAGE1_MAX_ACTIVE_PLAYERS)
    errors.push('no more than 10 starters may be active');
  if (release && roster.length !== 12) errors.push('release roster requires exactly 12 players');
  if (release && backups.length !== 2)
    errors.push('release roster requires exactly 2 explicit backups');
  if (release && starters.length !== 10)
    errors.push('release roster requires exactly 10 active starters');
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    counts: Object.freeze({
      roster: roster.length,
      backups: backups.length,
      activeStarters: starters.length,
    }),
  });
}
export function bohValidateStage1Substitutions(players = [], subs = []) {
  const roster = (Array.isArray(players) ? players : []).map(bohRosterPlayer),
    base = bohValidateStage1Roster(players),
    errors = [...base.errors],
    byId = new Map(roster.map((p) => [p.playerId, p])),
    usedB = new Set(),
    usedR = new Set(),
    events = [];
  (Array.isArray(subs) ? subs : []).forEach((s, i) => {
    const bId = String(s?.backupPlayerId || ''),
      rId = String(s?.replacesPlayerId || ''),
      minute = Number(s?.entryMinute),
      backup = byId.get(bId),
      replaced = byId.get(rId),
      tag = `substitution ${i + 1}`;
    if (!backup?.backup) errors.push(`${tag} requires a designated backup`);
    if (!replaced || replaced.backup || !replaced.active)
      errors.push(`${tag} requires an active replaced starter`);
    if (bId && bId === rId) errors.push(`${tag} cannot replace the same player`);
    if (!Number.isInteger(minute) || minute < 3 || minute > 60)
      errors.push(`${tag} minute must be 3..60`);
    if (usedB.has(bId)) errors.push(`backup ${bId} has multiple events`);
    if (usedR.has(rId)) errors.push(`starter ${rId} is replaced twice`);
    usedB.add(bId);
    usedR.add(rId);
    events.push(
      Object.freeze({
        id: s?.id || '',
        teamId: s?.teamId || '',
        backupPlayerId: bId,
        replacesPlayerId: rId,
        entryMinute: minute,
        order: Number.isFinite(Number(s?.order)) ? Number(s.order) : i + 1,
        note: String(s?.note || ''),
      })
    );
  });
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    events: Object.freeze(events),
  });
}
export function bohStage1SubstitutionEvents(players = [], subs = []) {
  const r = bohValidateStage1Substitutions(players, subs);
  return r.valid ? r.events : Object.freeze([]);
}

function bohTimelineSubstitution(identity, plan) {
  const players = Array.isArray(plan?.players)
      ? plan.players
      : Array.isArray(plan?.roster)
        ? plan.roster
        : [],
    events = bohStage1SubstitutionEvents(players, plan?.substitutions || []),
    playerId = String(identity?.playerId || ''),
    event = events.find(
      (item) => item.backupPlayerId === playerId || item.replacesPlayerId === playerId
    );
  if (!event) return null;
  const roster = players.map(bohRosterPlayer),
    backup = roster.find((player) => player.playerId === event.backupPlayerId),
    replaced = roster.find((player) => player.playerId === event.replacesPlayerId);
  return {
    kind: event.backupPlayerId === playerId ? 'incoming' : 'outgoing',
    event,
    backup,
    replaced,
  };
}

/**
 * The ten timeline entries for one seat: five phases by two legions, in the published shape.
 * `identity` supplies playerId, gameName, and optionally backup; everything else derives from
 * the template. An explicit backup value overrides the legacy seat 11/12 fallback.
 */
export function bohStage1Timeline(seatNumber, identity = {}, plan = {}) {
  const seat = Number(seatNumber);
  if (!Number.isInteger(seat) || seat < 1 || seat > BOH_STAGE1_SEATS) return [];
  const roleGroupId = identity.roleGroupId || bohSeatRoleGroup(seat);
  const hasExplicitBackup = typeof identity.backup === 'boolean';
  const backup = hasExplicitBackup ? identity.backup === true : bohIsBackupSeat(seat);
  const rows = backup ? null : STAGE1_ORDERS[seat] || null;
  const swap = bohTimelineSubstitution(identity, plan);
  const substitution = swap?.event || null;
  const incoming = swap?.kind === 'incoming';
  const outgoing = swap?.kind === 'outgoing';
  const entries = [];

  BOH_STAGE1_PHASES.forEach((phase, phaseIndex) => {
    const entryInPhase =
      substitution &&
      substitution.entryMinute >= phase.startMinute &&
      substitution.entryMinute < phase.endMinute;
    const standby = backup && (!incoming || substitution.entryMinute >= phase.endMinute);
    const substitutedOut = outgoing && substitution.entryMinute <= phase.startMinute;
    const template = rows ? rows[Math.min(phaseIndex, rows.length - 1)] : null;
    BOH_STAGE1_LEGIONS.forEach((legion) => {
      const isLegionOne = legion.id === 'legion-1';
      let roleLabel;
      let action;
      let note;
      if (standby || substitutedOut) {
        roleLabel = substitutedOut
          ? 'Starter - Substituted Out'
          : BOH_STAGE1_STANDBY_ORDER.roleLabel;
        action = substitutedOut
          ? `Substituted out at @${substitution.entryMinute}:00 - remain off the battlefield`
          : BOH_STAGE1_STANDBY_ORDER.action;
        note = substitutedOut
          ? 'The designated backup is active; follow leadership from off field.'
          : BOH_STAGE1_STANDBY_ORDER.note;
      } else if (template) {
        roleLabel = template[0];
        action = isLegionOne ? template[1] : template[2];
        note = template[3];
      } else {
        roleLabel = BOH_STAGE1_BACKUP_ORDER.roleLabel;
        action = isLegionOne ? BOH_STAGE1_BACKUP_ORDER.legion1 : BOH_STAGE1_BACKUP_ORDER.legion2;
        note =
          (entryInPhase
            ? '@' +
              substitution.entryMinute +
              ':00 replace the starter in seat ' +
              swap.replaced.seatNumber +
              '. '
            : '') + BOH_STAGE1_BACKUP_ORDER.note;
      }
      if (outgoing && entryInPhase) {
        action += ` until @${substitution.entryMinute}:00, then swap out for the designated backup`;
        note = `Leave the battlefield at @${substitution.entryMinute}:00; the incoming backup starts at the same minute.`;
      }
      entries.push({
        playerId: identity.playerId || '',
        gameName: identity.gameName || '',
        phaseId: phase.id,
        phaseLabel: phase.label,
        startMinute: incoming && entryInPhase ? substitution.entryMinute : phase.startMinute,
        endMinute:
          outgoing && entryInPhase && substitution.entryMinute > phase.startMinute
            ? substitution.entryMinute
            : phase.endMinute,
        legionId: legion.id,
        legionLabel: legion.label,
        seatNumber: seat,
        baseSeatNumber: seat,
        roleGroupId,
        roleLabel,
        rotated: false,
        instruction: {
          action,
          target: '',
          loadout: '',
          teleport: note || null,
          note: note || '',
          priority: null,
          ...bohInstructionExtras(action, standby || substitutedOut),
        },
      });
    });
  });
  return entries;
}

/** Milestone guidance for a phase id, for the shared teleport and crystal strips. */
export function bohStage1Milestone(phaseId) {
  return BOH_STAGE1_MILESTONES.find((milestone) => milestone.phaseId === phaseId) || null;
}
