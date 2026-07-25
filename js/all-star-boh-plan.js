/**
 * All-Star BoH — Stage 1 match plan template.
 *
 * Four phases, twelve score-ranked positions, two legions each. Position 1 is the highest
 * scorer on the team, 12 the lowest. Positions 11 and 12 are the designated backups: they
 * enter the battlefield at 5:00, so they hold no orders during the opening phase.
 *
 * This is the default template. Leadership can override any assignment per team; the shape
 * here is what an override must conform to.
 */

export const BOH_STAGE1_POSITIONS = 12;
export const BOH_STAGE1_BACKUP_POSITIONS = Object.freeze([11, 12]);
/** Backups are not deployed before this phase index. */
export const BOH_STAGE1_BACKUP_ENTRY_PHASE = 1;

/** What unlocks in each phase, and the shared-alliance teleport and crystal guidance. */
export const BOH_STAGE1_MILESTONES = Object.freeze([
  Object.freeze({
    time: '0-5 Minutes',
    unlocks: 'Stronghold · Watch Post · Command Center open',
    teleportTag: 'Hold teleports',
    teleport: 'Alliance starts with 5 shared teleports. First Command Center capture = +5.',
    crystal: 'Send spare legions to Sacred Crystal Mines. 200 crystals = 1 Sentry Tower.',
  }),
  Object.freeze({
    time: '5-10 Minutes',
    unlocks: 'Hospital · Armory · Fortress of Honor unlock',
    teleportTag: 'Bank +1 / 5 min',
    teleport: 'Occupied Command Center generates +1 teleport every 5 min. Repeat capture = +2.',
    crystal: 'Keep 1 legion gathering. Armory (+50% atk/def) and Hospital stack — take them.',
  }),
  Object.freeze({
    time: '10-15 Minutes',
    unlocks: 'Fortress of Honor pays large periodic Alliance Points',
    teleportTag: 'Spend on FoH',
    teleport:
      'Spend teleports to contest Fortress of Honor. You may only teleport into your own territory.',
    crystal: 'Convert crystals into Sentry Towers to expand territory before the Rune.',
  }),
  Object.freeze({
    time: '15-30 Minutes',
    unlocks: 'Sanctuary opens and spawns the Divine Rune',
    teleportTag: 'Reserve for Rune',
    teleport: 'Reserve remaining teleports for Rune escort and Relay defense.',
    crystal: 'Stop gathering — all legions to Rune escort. Losing your Relay fails the escort.',
  }),
]);

/** Per-phase, per-position orders. Missing positions fall back to the backup support order. */
export const BOH_STAGE1_FLOW = Object.freeze([
  Object.freeze({
    time: '0-5 Minutes',
    rows: Object.freeze({
      1: Object.freeze({
        stageRole: 'Offensive Team',
        l1: 'Capture & Defend Our Command Center [CC1]',
        l2: 'Build Towers - T1s & Speed Heroes',
        note: 'No Teleport',
      }),
      2: Object.freeze({
        stageRole: 'Offensive Team',
        l1: 'Capture & Defend Our Bot Outposts [OP1]',
        l2: 'Build Towers - T1s & Speed Heroes',
        note: 'No Teleport',
      }),
      3: Object.freeze({
        stageRole: 'Offensive Team',
        l1: 'Capture Enemy Command Center [CC2]',
        l2: 'Gather Crystals - T1s',
        note: 'No Teleport',
      }),
      4: Object.freeze({
        stageRole: 'Rune Team',
        l1: 'Capture Enemy Outpost [OP2]',
        l2: 'Gather Crystals - T1s',
        note: 'No Teleport',
      }),
      5: Object.freeze({
        stageRole: 'Rune Team',
        l1: 'Build Towers - T1s & Speed Heroes',
        l2: 'Gather Crystals - T1s',
        note: 'No Teleport',
      }),
      6: Object.freeze({
        stageRole: 'Rune Team',
        l1: 'Build Towers - T1s & Speed Heroes',
        l2: 'Gather Crystals - T1s',
        note: 'No Teleport',
      }),
      7: Object.freeze({
        stageRole: 'Defensive Team - Top',
        l1: 'Build Towers - T1s & Speed Heroes',
        l2: 'Gather Crystals - T1s',
        note: 'Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map',
      }),
      8: Object.freeze({
        stageRole: 'Defensive Team - Top',
        l1: 'Build Towers - T1s & Speed Heroes',
        l2: 'Gather Crystals - T1s',
        note: 'Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map',
      }),
      9: Object.freeze({
        stageRole: 'Defensive Team - Top',
        l1: 'Build Towers - T1s & Speed Heroes',
        l2: 'Gather Crystals - T1s',
        note: 'Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map',
      }),
      10: Object.freeze({
        stageRole: 'Defensive Team - Bot',
        l1: 'Build Towers - T1s & Speed Heroes',
        l2: 'Gather Crystals - T1s',
        note: 'Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map',
      }),
      11: Object.freeze({
        stageRole: 'Defensive Team - Bot',
        l1: 'Build Towers - T1s & Speed Heroes',
        l2: 'Gather Crystals - T1s',
        note: 'Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map',
      }),
      12: Object.freeze({
        stageRole: 'Defensive Team - Bot',
        l1: 'Build Towers - T1s & Speed Heroes',
        l2: 'Gather Crystals - T1s',
        note: 'Teleport to Tower 3 [T3] - Be on the Side Opposing Bot Map',
      }),
    }),
  }),
  Object.freeze({
    time: '5-10 Minutes',
    rows: Object.freeze({
      1: Object.freeze({
        stageRole: 'Offensive Team',
        l1: 'Secure TOP Fortress of Honor [FH1]',
        l2: 'Capture & Defend Our Command Center [CC1]',
        note: 'No Teleport',
      }),
      2: Object.freeze({
        stageRole: 'Offensive Team',
        l1: 'Secure BOT Fortress of Honor [FH2]',
        l2: 'Capture & Defend Our Bot Outposts [OP1]',
        note: 'No Teleport',
      }),
      3: Object.freeze({
        stageRole: 'Rune Team',
        l1: 'Capture & Defend Our Hospital [H1]',
        l2: 'Build Towers - T1s & Speed Heroes',
        note: 'No Teleport',
      }),
      4: Object.freeze({
        stageRole: 'Rune Team',
        l1: 'Capture & Defend Our Arsenal [A1]',
        l2: 'Build Towers - T1s & Speed Heroes',
        note: 'No Teleport',
      }),
      5: Object.freeze({
        stageRole: 'Joker Team',
        l1: 'Attack Enemy Towers',
        l2: 'Build Towers - T1s & Speed Heroes',
        note: 'Teleport to Relay1 [RP1] - Tower 5 [T5]',
      }),
      6: Object.freeze({
        stageRole: 'Joker Team',
        l1: 'Attack Enemy Towers',
        l2: 'Build Towers - T1s & Speed Heroes',
        note: 'Teleport to Relay1 [RP1] - Tower 5 [T5]',
      }),
      7: Object.freeze({
        stageRole: 'Defensive Team - Top',
        l1: 'Attack Enemy Arsenal [A2]',
        l2: 'Build Towers - T1s & Speed Heroes',
        note: 'No Teleport',
      }),
      8: Object.freeze({
        stageRole: 'Defensive Team - Top',
        l1: 'Capture Enemy Hospital [H2]',
        l2: 'Build Towers - T1s & Speed Heroes',
        note: 'No Teleport',
      }),
      9: Object.freeze({
        stageRole: 'Defensive Team - Bot',
        l1: 'Capture Enemy Command Center [CC2]',
        l2: 'Build Towers - T1s & Speed Heroes',
        note: 'No Teleport',
      }),
      10: Object.freeze({
        stageRole: 'Defensive Team - Bot',
        l1: 'Capture Enemy Outpost [OP2]',
        l2: 'Build Towers - T1s & Speed Heroes',
        note: 'No Teleport',
      }),
    }),
  }),
  Object.freeze({
    time: '10-15 Minutes',
    rows: Object.freeze({
      1: Object.freeze({
        stageRole: 'Offensive Team',
        l1: 'Build Towers - T9s',
        l2: 'Attack Enemy Towers / Enemy Castles',
        note: 'Teleport to Relay2 [RP2] - Tower 7 [T7]',
      }),
      2: Object.freeze({
        stageRole: 'Offensive Team',
        l1: 'Build Towers - T9s',
        l2: 'Attack Enemy Towers / Enemy Castles',
        note: 'Teleport to Relay2 [RP2] - Tower 7 [T7]',
      }),
      3: Object.freeze({
        stageRole: 'Rune Team',
        l1: 'Build Towers - T9s',
        l2: 'Attack Enemy Towers / Enemy Castles',
        note: 'Teleport to Relay2 [RP2] - Tower 7 [T7]',
      }),
      4: Object.freeze({
        stageRole: 'Rune Team',
        l1: 'Build Towers - T9s',
        l2: 'Attack Enemy Towers / Enemy Castles',
        note: 'Teleport to Relay2 [RP2] - Tower 7 [T7]',
      }),
      5: Object.freeze({
        stageRole: 'Joker Team',
        l1: 'Secure TOP Fortress of Honor [FH1]',
        l2: 'Build Towers - T9s',
        note: 'No Teleport',
      }),
      6: Object.freeze({
        stageRole: 'Joker Team',
        l1: 'Secure BOT Fortress of Honor [FH2]',
        l2: 'Build Towers - T9s',
        note: 'No Teleport',
      }),
      7: Object.freeze({
        stageRole: 'Defensive Team - Top',
        l1: 'Capture & Defend Our Command Center [CC1]',
        l2: 'Capture Enemy Command Center [CC2]',
        note: 'No Teleport',
      }),
      8: Object.freeze({
        stageRole: 'Defensive Team - Top',
        l1: 'Capture & Defend Our Bot Outposts [OP1]',
        l2: 'Capture Enemy Outpost [OP2]',
        note: 'No Teleport',
      }),
      9: Object.freeze({
        stageRole: 'Defensive Team - Bot',
        l1: 'Capture & Defend Our Hospital [H1]',
        l2: 'Attack Enemy Arsenal [A2]',
        note: 'No Teleport',
      }),
      10: Object.freeze({
        stageRole: 'Defensive Team - Bot',
        l1: 'Capture & Defend Our Arsenal [A1]',
        l2: 'Capture Enemy Hospital [H2]',
        note: 'No Teleport',
      }),
    }),
  }),
  Object.freeze({
    time: '15-30 Minutes',
    rows: Object.freeze({
      1: Object.freeze({
        stageRole: 'Offensive Team',
        l1: 'Protect Rune at Relay (or attack enemy Rune path)',
        l2: 'Protect Rune at Relay (or attack enemy Rune path)',
        note: 'Teleport to Center Building [S] - Tower 8/9 [T8/T9]',
      }),
      2: Object.freeze({
        stageRole: 'Offensive Team',
        l1: 'Protect Rune at Relay (or attack enemy Rune path)',
        l2: 'Protect Rune at Relay (or attack enemy Rune path)',
        note: 'Teleport to Center Building [S] - Tower 8/9 [T8/T9]',
      }),
      3: Object.freeze({
        stageRole: 'Rune Team',
        l1: 'Protect Rune at Relay (Garrison/Defend Rune)',
        l2: 'TAKE THE RUNE (Primary Rune Runner) - T1s & Speed Heroes',
        note: 'No Teleport',
      }),
      4: Object.freeze({
        stageRole: 'Rune Team',
        l1: 'Protect Rune at Relay (Garrison/Defend Rune)',
        l2: 'TAKE THE RUNE (Primary Rune Runner) - T1s & Speed Heroes',
        note: 'No Teleport',
      }),
      5: Object.freeze({
        stageRole: 'Joker Team',
        l1: 'Protect Rune at Relay (Garrison/Defend Rune)',
        l2: 'Attack Enemy Towers',
        note: 'No Teleport',
      }),
      6: Object.freeze({
        stageRole: 'Joker Team',
        l1: 'Protect Rune at Relay (Garrison/Defend Rune)',
        l2: 'Attack Enemy Towers',
        note: 'No Teleport',
      }),
      7: Object.freeze({
        stageRole: 'Defensive Team - Top',
        l1: 'Protect Rune at Relay (Reinforce as needed)',
        l2: 'Capture & Defend Our Command Center [CC1]',
        note: 'No Teleport',
      }),
      8: Object.freeze({
        stageRole: 'Defensive Team - Top',
        l1: 'Protect Rune at Relay (Reinforce as needed)',
        l2: 'Capture & Defend Our Bot Outposts [OP1]',
        note: 'No Teleport',
      }),
      9: Object.freeze({
        stageRole: 'Defensive Team - Bot',
        l1: 'Protect Rune at Relay (Reinforce as needed)',
        l2: 'Capture & Defend Our Hospital [H1]',
        note: 'No Teleport',
      }),
      10: Object.freeze({
        stageRole: 'Defensive Team - Bot',
        l1: 'Protect Rune at Relay (Reinforce as needed)',
        l2: 'Capture & Defend Our Arsenal [A1]',
        note: 'No Teleport',
      }),
    }),
  }),
]);

/**
 * Orders for a backup once they are on the field. The source template only specifies the ten
 * starters, so backups take a support brief rather than invented tactical detail: they cover
 * whichever role has gone quiet.
 */
export const BOH_STAGE1_BACKUP_ORDER = Object.freeze({
  stageRole: 'Backup - Support',
  l1: 'Replace any missing member and take over their Legion 1 task',
  l2: 'Reinforce towers, gathering, or the rune escort as needed',
  note: 'No Teleport',
});

/** Orders shown to a backup before they enter at 5:00. */
export const BOH_STAGE1_STANDBY_ORDER = Object.freeze({
  stageRole: 'Standby',
  l1: 'Not deployed - you enter at 5:00',
  l2: 'Not deployed - stay ready',
  note: 'No Teleport',
});

export function bohIsBackupPosition(position) {
  return BOH_STAGE1_BACKUP_POSITIONS.includes(Number(position));
}

export function bohIsStandby(position, phaseIndex) {
  return bohIsBackupPosition(position) && Number(phaseIndex) < BOH_STAGE1_BACKUP_ENTRY_PHASE;
}

/**
 * The order for one position in one phase, resolving backup standby and the support fallback.
 * Returns null when the phase does not exist.
 */
export function bohStage1Order(position, phaseIndex) {
  const phase = BOH_STAGE1_FLOW[Number(phaseIndex)];
  if (!phase) return null;
  const slot = Number(position);
  if (bohIsStandby(slot, phaseIndex)) return BOH_STAGE1_STANDBY_ORDER;
  return phase.rows[slot] || BOH_STAGE1_BACKUP_ORDER;
}
