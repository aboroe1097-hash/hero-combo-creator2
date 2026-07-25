/**
 * All-Star BoH — Stage 1 match plan template.
 *
 * Emits timeline entries in the shape the published contract already uses, so the admin side
 * can project this straight into `publishedPlayers/{uid}.timeline` without translation: four
 * phases by two legions gives each member exactly eight entries.
 *
 * Vocabulary follows production, not the prototype this came from:
 *   seatNumber   1..12, score-ranked; seat 1 is the highest scorer
 *   roleGroupId  offensive | rune | top | bottom
 *   legionId     legion-1 | legion-2
 *
 * Seats 11 and 12 are the designated backups. They enter at 5:00, so only their opening
 * entries carry `instruction.standby: true`.
 *
 * Typed instruction flags are sparse and optional for backend/UI integrators:
 *   standby        backup seat 11/12 is not deployed yet in the opening 0-5 phase
 *   gatherCrystals this exact legion entry is assigned Sacred Crystal Mine gathering
 *
 * This is a default template only. A leadership override always wins, and nothing here is
 * authoritative once a publication exists.
 */

export const BOH_STAGE1_PLAN_ID = 'stage-1';
export const BOH_STAGE1_SEATS = 12;
export const BOH_STAGE1_BACKUP_SEATS = Object.freeze([11, 12]);
/** Backups are not on the field before this phase index. */
export const BOH_STAGE1_BACKUP_ENTRY_PHASE = 1;
export const BOH_STAGE1_BACKUP_ENTRY_MINUTE = 5;

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
]);

/** What unlocks each phase, plus the shared-alliance teleport and crystal guidance. */
export const BOH_STAGE1_MILESTONES = Object.freeze([
  Object.freeze({
    phaseId: 'phase-1',
    unlocks: 'Stronghold, Watch Post and Command Center open',
    teleportTag: 'Hold teleports',
    teleport:
      'The alliance starts with 5 shared teleports. The first Command Center capture adds 5.',
    crystal: 'Send spare legions to Sacred Crystal Mines. 200 crystals builds one Sentry Tower.',
  }),
  Object.freeze({
    phaseId: 'phase-2',
    unlocks: 'Hospital, Armory and Fortress of Honor unlock',
    teleportTag: 'Bank one every 5 minutes',
    teleport: 'A held Command Center generates one teleport every 5 minutes. Recapturing adds 2.',
    crystal: 'Keep one legion gathering. Armory and Hospital bonuses stack, so take them.',
  }),
  Object.freeze({
    phaseId: 'phase-3',
    unlocks: 'Fortress of Honor pays large periodic Alliance Points',
    teleportTag: 'Spend on the Fortress',
    teleport:
      'Spend teleports to contest the Fortress of Honor. You may only teleport into our own territory.',
    crystal: 'Convert crystals into Sentry Towers to widen our territory before the Rune spawns.',
  }),
  Object.freeze({
    phaseId: 'phase-4',
    unlocks: 'The Sanctuary opens and spawns the Divine Rune',
    teleportTag: 'Reserve for the Rune',
    teleport: 'Hold the remaining teleports for the Rune escort and Relay defence.',
    crystal: 'Stop gathering. Every legion moves to the Rune escort; losing our Relay fails it.',
  }),
]);

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

/**
 * A backup's opening instruction. The late start stays legible in action/note, with the typed
 * `instruction.standby` flag emitted only on these opening backup entries.
 */
export const BOH_STAGE1_STANDBY_ORDER = Object.freeze({
  roleLabel: 'Backup - Standby',
  action: `Stand by until ${BOH_STAGE1_BACKUP_ENTRY_MINUTE}:00 - you are not on the field yet`,
  note: `Not deployed. You enter at ${BOH_STAGE1_BACKUP_ENTRY_MINUTE}:00; hold both legions until then.`,
});

/** A backup's instruction once on the field. */
export const BOH_STAGE1_BACKUP_ORDER = Object.freeze({
  roleLabel: 'Backup - Support',
  legion1: 'Replace any missing member and take over their Legion 1 task',
  legion2: 'Reinforce towers, gathering, or the rune escort as needed',
  note: 'No Teleport',
});

export function bohIsBackupSeat(seatNumber) {
  return BOH_STAGE1_BACKUP_SEATS.includes(Number(seatNumber));
}

/** True while a backup has not yet entered the battlefield. */
export function bohIsStandby(seatNumber, phaseIndex) {
  return bohIsBackupSeat(seatNumber) && Number(phaseIndex) < BOH_STAGE1_BACKUP_ENTRY_PHASE;
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

/**
 * The eight timeline entries for one seat: four phases by two legions, in the published shape.
 * `identity` supplies playerId and gameName; everything else derives from the template.
 */
export function bohStage1Timeline(seatNumber, identity = {}) {
  const seat = Number(seatNumber);
  if (!Number.isInteger(seat) || seat < 1 || seat > BOH_STAGE1_SEATS) return [];
  const roleGroupId = identity.roleGroupId || bohSeatRoleGroup(seat);
  const rows = STAGE1_ORDERS[seat] || null;
  const entries = [];

  BOH_STAGE1_PHASES.forEach((phase, phaseIndex) => {
    const standby = bohIsStandby(seat, phaseIndex);
    const template = rows ? rows[phaseIndex] : null;
    BOH_STAGE1_LEGIONS.forEach((legion) => {
      const isLegionOne = legion.id === 'legion-1';
      let roleLabel;
      let action;
      let note;
      if (standby) {
        roleLabel = BOH_STAGE1_STANDBY_ORDER.roleLabel;
        action = BOH_STAGE1_STANDBY_ORDER.action;
        note = BOH_STAGE1_STANDBY_ORDER.note;
      } else if (template) {
        roleLabel = template[0];
        action = isLegionOne ? template[1] : template[2];
        note = template[3];
      } else {
        roleLabel = BOH_STAGE1_BACKUP_ORDER.roleLabel;
        action = isLegionOne ? BOH_STAGE1_BACKUP_ORDER.legion1 : BOH_STAGE1_BACKUP_ORDER.legion2;
        note = BOH_STAGE1_BACKUP_ORDER.note;
      }
      entries.push({
        playerId: identity.playerId || '',
        gameName: identity.gameName || '',
        phaseId: phase.id,
        phaseLabel: phase.label,
        startMinute: phase.startMinute,
        endMinute: phase.endMinute,
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
          ...bohInstructionExtras(action, standby),
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
