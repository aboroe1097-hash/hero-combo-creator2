/**
 * Per-node medal evidence from the user's public Unit Specialisation workbook.
 *
 * The main planner corpus is shared across troops and currently ends at Column
 * VIII. These records deliberately stay troop- and sheet-scoped: VII is
 * complete, while VIII and IX retain only cells that the workbook actually
 * supplies. Missing cells remain absent and must never be inferred from a
 * research total.
 */

export const SPECIALIZATION_MEDAL_EVIDENCE_SOURCE = Object.freeze({
  spreadsheetId: '1b6vZo20rXYCYDENSW0r1YAJ8di9DuHZ5Xfphoala8RU',
  sourceUrl:
    'https://docs.google.com/spreadsheets/d/1b6vZo20rXYCYDENSW0r1YAJ8di9DuHZ5Xfphoala8RU/edit',
  observedAt: '2026-08-18',
  sheets: Object.freeze({
    7: Object.freeze({ gid: '1492876894', title: 'Unit Specilisation VII' }),
    8: Object.freeze({ gid: '542598214', title: 'Unit Specilisation VIII' }),
    9: Object.freeze({ gid: '1153935173', title: 'Unit Specilisation IX' }),
  }),
});

function evidenceRow(sourceRow, name, costs) {
  return { sourceRow: String(sourceRow), name, costs };
}

function section({ tower, troop, sourceSection, researchId = null, title, complete, rows }) {
  return {
    tower,
    troop,
    sourceSection,
    researchId,
    title,
    complete,
    rows,
    knownCostTotal: rows.reduce(
      (sectionTotal, row) =>
        sectionTotal + row.costs.reduce((rowTotal, cost) => rowTotal + cost, 0),
      0
    ),
  };
}

const r = evidenceRow;

export const SPECIALIZATION_TROOP_MEDAL_EVIDENCE = [
  section({
    tower: 7,
    troop: 'archer',
    sourceSection: 1,
    researchId: 'training7',
    title: 'Archer Training VII',
    complete: true,
    rows: [
      r(1, 'Courage', [811]), r(2, 'Revival', [852]), r(3, 'Courage', [894]),
      r(4, 'Defense', [939]), r(5, 'Unstoppable Force', [1600, 1700]),
      r(6, 'Defense', [1000]), r(7, 'Courage', [1000]), r(8, 'Revival', [1100]),
      r(9, 'Defense', [1100]), r(10, 'Revival', [1200]), r(11, 'Solid Armor', [3700]),
    ],
  }),
  section({
    tower: 7,
    troop: 'archer',
    sourceSection: 2,
    researchId: 'encounter4',
    title: 'Encounter Battle IV',
    complete: true,
    rows: [
      r(1, 'Raid', [1500]), r(2, 'Extermination', [1500]),
      r(3, 'Survival in the Wild', [2800, 2900]), r(4, 'Raid', [1700]),
      r(5, 'Raid', [1800]), r(6, 'Field Intel', [1900]),
      r(7, 'Ambush in the Wild', [2000]), r(8, 'Raid', [2100]),
      r(9, 'Extermination', [1700]), r(10, 'Extermination', [1800]),
      r(11, 'Ambush in the Wild', [1900]), r(12, 'Field Intel', [2000]),
      r(13, 'Extermination', [2100]), r(14, 'Demonic Backlash', [4400]),
    ],
  }),
  section({
    tower: 7,
    troop: 'archer',
    sourceSection: 3,
    researchId: 'callofglory4',
    title: 'Call of Glory IV',
    complete: true,
    rows: [
      r(1, 'March', [1800]), r(2, 'March', [1900]), r(3, 'March', [2000]),
      r(4, 'Solidarity', [2100]), r(5, 'Charge', [1800]), r(6, 'Charge', [1900]),
      r(7, 'Charge', [2000]), r(8, 'Cooperation', [2100]),
      r(10, 'Oathkeeping', [5800]), r(11, 'Unyielding', [1800]),
      r(12, 'Unyielding', [1900]), r(13, 'Unyielding', [2000]),
      r(14, 'Battlefield Revival', [3700, 3900]), r(15, 'Stronghold', [1800]),
      r(16, 'Stronghold', [1900]), r(17, 'Stronghold', [2000]),
      r(18, 'Revival in Chaos', [3700, 3900]),
    ],
  }),
  section({
    tower: 7,
    troop: 'archer',
    sourceSection: 4,
    researchId: 'enhanced4',
    title: 'Enhanced Tactics IV',
    complete: true,
    rows: [
      r(1, 'Siege Plan', [1900]), r(2, 'Siege Plan', [2000]), r(3, 'Siege Plan', [2100]),
      r(4, 'Cooperation', [2200]), r(5, 'Siege Intel', [2300]),
      r(6, 'Siege Intel', [2400]), r(7, 'Siege Intel', [2400]),
      r(8, 'Defense Plan', [1900]), r(9, 'Defense Plan', [2000]),
      r(10, 'Defense Plan', [2100]), r(11, 'Solidarity', [2200]),
      r(12, 'Defense Intel', [2300]), r(13, 'Defense Intel', [2400]),
      r(14, 'Defense Intel', [2400]), r(15, 'Cooperation', [2600]),
      r(16, 'Solidarity', [2500]), r(17, 'Swirling Wind', [5600]),
      r(18, 'Ambush in the Wild', [2500]), r(19, 'Ambush in the Wild', [2600]),
      r(20, 'Ambush in the Wild', [2800]), r(21, 'Field Intel', [2500]),
      r(22, 'Field Intel', [2600]), r(23, 'Field Intel', [2800]),
      r(24, 'Revival', [3700, 3900]),
    ],
  }),
  section({
    tower: 8,
    troop: 'archer',
    sourceSection: 1,
    researchId: 'training8',
    title: 'Archer Training VIII',
    complete: true,
    rows: [
      r(1, 'Courage', [947]), r(2, 'Courage', [994]), r(3, 'Courage', [1000]),
      r(4, 'Revival', [1000]), r(5, 'Courage', [1100]), r(6, 'Courage', [1200]),
      r(7, 'Armor Piercer', [5600]), r(8, 'Defense', [947]), r(9, 'Defense', [994]),
      r(10, 'Defense', [1000]), r(11, 'Revival', [1000]), r(12, 'Defense', [1100]),
      r(13, 'Defense', [1200]), r(14, 'Fight Hard Fight Soft', [2100, 2200]),
      r(15, 'Armor Piercer', [5600]),
    ],
  }),
  section({
    tower: 8,
    troop: 'archer',
    sourceSection: 2,
    researchId: 'siege4',
    title: 'Siege Battle IV',
    complete: false,
    rows: [r(1, 'Motionless', [1600]), r(2, 'Plunder', [1700]), r(3, 'Excited', [3100, 3200])],
  }),
  section({
    tower: 8,
    troop: 'archer',
    sourceSection: 3,
    researchId: 'defensive4',
    title: 'Defensive Battle IV',
    complete: false,
    rows: [
      r(1, 'Perseverance', [1700]), r(8, 'Encircle', [2100]),
      r(9, 'Perseverance', [2200]), r(12, 'Encircle', [2600]),
      r(13, 'Perseverance', [2700]), r(14, 'Perseverance', [2200]),
      r(15, 'Inception', [2100]), r(16, 'Stronghold', [2200]),
      r(17, 'Inception', [2400]), r(18, 'Stronghold', [2500]),
      r(19, 'Inception', [2600]), r('19b', 'Stronghold', [2700]),
      r(20, 'Perseverance', [2900]), r(21, 'Stronghold', [2200]),
      r(22, 'Altered Impact', [5900]), r(23, 'Tougher Defense', [5000, 5200]),
    ],
  }),
  section({
    tower: 8,
    troop: 'archer',
    sourceSection: 4,
    researchId: 'neat4',
    title: 'Neat Formation IV',
    complete: true,
    rows: [
      r(1, "Vanguard's Intel", [2300]), r(2, 'Frontal Defense', [2400]),
      r(3, 'Frontal Defense', [2600]), r(4, 'Frontal Defense', [2700]),
      r(5, "Vanguard's Courage", [2400]), r(6, "Vanguard's Courage", [2600]),
      r(7, "Vanguard's Courage", [2700]), r(8, "Vanguard's Scheme", [2800]),
      r(9, "Vanguard's Vitality", [3800, 4000]), r(10, 'Secret Intel', [2300]),
      r(11, 'Solid Defense', [2400]), r(12, 'Solid Defense', [2600]),
      r(13, 'Solid Defense', [2700]), r(14, 'Great Courage', [2400]),
      r(15, 'Great Courage', [2600]), r(16, 'Great Courage', [2700]),
      r(17, 'Smart Scheme', [2800]), r(18, 'Great Vitality', [3800, 4000]),
      r(19, "Rearguard's Intel", [2300]), r(20, "Rearguard's Defense", [2400]),
      r(21, "Rearguard's Defense", [2600]), r(22, "Rearguard's Defense", [2700]),
      r(23, "Rearguard's Courage", [2400]), r(24, "Rearguard's Courage", [2600]),
      r(25, "Rearguard's Courage", [2700]), r(26, "Rearguard's Scheme", [2800]),
      r(27, "Rearguard's Vitality", [3800, 4000]),
    ],
  }),
  section({
    tower: 9,
    troop: 'footman',
    sourceSection: 1,
    title: 'Footman Training IX',
    complete: true,
    rows: [
      r(1, 'Revival', [1600]), r(2, 'Revival', [1600]), r(3, 'Energetic', [2200]),
      r(4, 'Courage', [1300]), r(5, 'Courage', [1400]), r(6, 'Courage', [1500]),
      r(7, 'Courage', [1600]), r(8, 'Revival', [2100, 2100]),
      r(9, 'Defense', [1300]), r(10, 'Defense', [1400]), r(11, 'Defense', [1500]),
      r(12, 'Defense', [1600]), r(13, 'Revival', [2100, 2200]),
      r(14, 'Unstoppable Force', [6000]),
    ],
  }),
  section({
    tower: 9,
    troop: 'footman',
    sourceSection: 2,
    title: 'Unit Specialisation IX · section 2',
    complete: false,
    rows: [r(1, 'March', [1900]), r(2, 'March', [2000])],
  }),
  section({
    tower: 9,
    troop: 'footman',
    sourceSection: 3,
    title: 'Unit Specialisation IX · section 3',
    complete: true,
    rows: [
      r(1, 'Survival in the Wild', [2200]), r(2, 'Survival in the Wild', [2200]),
      r(3, 'Survival in the Wild', [2200]), r(4, 'Survival in the Wild', [2400, 2400]),
      r(5, 'Raid', [1700]), r(6, 'Raid', [1800]), r(7, 'Raid', [1900, 1900]),
      r(8, 'Extermination', [1700]), r(9, 'Extermination', [1800]),
      r(10, 'Extermination', [1900]), r(11, 'Ambush in the Wild', [1700]),
      r(12, 'Ambush in the Wild', [1800]), r(13, 'Ambush in the Wild', [1900, 1900]),
      r(14, 'Field Intel', [1700]), r(15, 'Field Intel', [1800]),
      r(16, 'Field Intel', [1900, 1900]), r(17, 'Marching', [6200]),
    ],
  }),
  section({
    tower: 9,
    troop: 'footman',
    sourceSection: 4,
    title: 'Unit Specialisation IX · section 4',
    complete: false,
    rows: [
      r(1, 'Siege Plan', [5000]), r(2, 'Ambush in the Wild', [5200]),
      r(3, 'Siege Plan', [5000]), r(4, 'Siege Plan', [5200]),
      r(5, 'Siege Plan', [5500]), r(6, 'Defense Plan', [5800]),
    ],
  }),
];

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

deepFreeze(SPECIALIZATION_TROOP_MEDAL_EVIDENCE);

export function getSpecializationMedalEvidence({ tower, troop, researchId } = {}) {
  return SPECIALIZATION_TROOP_MEDAL_EVIDENCE.filter(
    (entry) =>
      (tower == null || entry.tower === Number(tower)) &&
      (troop == null || entry.troop === troop) &&
      (researchId == null || entry.researchId === researchId)
  );
}
