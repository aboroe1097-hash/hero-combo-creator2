import assert from 'node:assert/strict';
import test from 'node:test';

import { techDatabase } from '../../js/tech-db.js';

const loftyWarrior = techDatabase.find((tree) => tree.id === '77db4a78');
const nodes = new Map(loftyWarrior.nodes.map((node) => [node.id, node]));

const curves = Object.freeze({
  baseMight: [90, 135, 185, 230, 275, 370, 465, 555, 740, 930],
  baseResistance: [100, 155, 205, 260, 310, 415, 520, 625, 835, 1000],
  baseHp: [115, 170, 230, 290, 345, 465, 580, 695, 930, 1100],
  unlock: [3000],
  loftyStats: [480, 720, 960, 1400, 2400],
  standardStats: [
    220, 335, 445, 555, 670, 780, 890, 1100, 1300, 1500, 1700, 2000, 2200, 2600, 3300,
  ],
  firstLimit: [560, 840, 1100, 1600, 2800],
  utility: [275, 415, 555, 695, 845, 975, 1100, 1300, 1600, 1900, 2200, 2500, 2700, 3300, 4100],
  secondLimit: [
    305, 460, 610, 765, 920, 1000, 1200, 1300, 1500, 1600, 1800, 2100, 2400, 2700, 3000, 3300, 3600,
    4300, 5200, 6100,
  ],
  finalStats: [
    430, 650, 865, 1000, 1215, 1500, 1700, 1900, 2100, 2300, 2600, 3400, 3600, 3900, 4300, 4700,
    5200, 6000, 7300, 8600,
  ],
  damage: [
    545, 815, 1000, 1300, 1600, 1900, 2100, 2400, 2700, 3000, 3200, 3800, 4300, 4900, 5400, 6000,
    6500, 7600, 9200, 10900,
  ],
});

function expectNode(id, { name, troop, buff, curve }) {
  const node = nodes.get(id);
  assert.ok(node, id);
  assert.equal(node.name, name, `${id} name`);
  assert.equal(node.troop, troop, `${id} troop`);
  assert.equal(node.buff, buff, `${id} buff`);
  assert.deepEqual(node.wisdomCosts, curves[curve], `${id} costs`);
  assert.equal(node.maxLevel, curves[curve].length, `${id} max level`);
}

test('Lofty Warrior matches the L96 T10 research sheet', () => {
  assert.ok(loftyWarrior);
  assert.equal(loftyWarrior.name, 'Lofty Warrior');
  assert.equal(loftyWarrior.primaryResource, 'War Badges');
  assert.equal(nodes.size, 63);

  const trunk = [
    ['node_1', 'Power Strike', 'Footmen', '20% Footmen Might', 'baseMight'],
    ['node_2', 'Enhanced Arrow', 'Archer', '20% Archer Might', 'baseMight'],
    ['node_3', 'Ferocious Charge', 'Cavalry', '20% Cavalry Might', 'baseMight'],
    ['node_4', 'Unstoppable', 'ALL', '10% ALL Unit Might', 'baseMight'],
    ['node_5', 'Mastercraft Armor', 'Footmen', '20% Footmen Resistance', 'baseResistance'],
    ['node_6', 'Enhanced Arm Guard', 'Archer', '20% Archer Resistance', 'baseResistance'],
    ['node_7', 'Enhanced Barding', 'Cavalry', '20% Cavalry Resistance', 'baseResistance'],
    ['node_8', 'Fully Armed', 'ALL', '10% ALL Unit Resistance', 'baseResistance'],
    ['node_9', 'Physical Enhancement', 'Footmen', '10% Footmen HP', 'baseHp'],
    ['node_10', 'Mana Potion', 'Archer', '10% Archer HP', 'baseHp'],
    ['node_11', 'Heavy Rider', 'Cavalry', '10% Cavalry HP', 'baseHp'],
    ['node_12', 'Fullmetal Jacket', 'ALL', '5% ALL HP', 'baseHp'],
    ['node_13_F', 'Unlock T10', 'Footmen', 'T10 Footmen Unlock', 'unlock'],
    ['node_13_A', 'Unlock T10', 'Archer', 'T10 Archer Unlock', 'unlock'],
    ['node_13_C', 'Unlock T10', 'Cavalry', 'T10 Cavalry Unlock', 'unlock'],
  ];
  for (const [id, name, troop, buff, curve] of trunk) {
    expectNode(id, { name, troop, buff, curve });
  }

  const branches = {
    F: {
      standardTroop: 'Footmen',
      loftyTroop: 'Lofty Footmen',
      names: [
        'Chaos Blade',
        'Refined Armor',
        'Metal Frame',
        'Power Strike',
        'Mastercraft Armor',
        'Physical Enhancement',
        'Tactical Squad',
        'Military Exercise',
        'Jerkies',
        'Emergency Protocol',
        'Regeneration',
        'Tactical Squad II',
        'Power Strike II',
        'Mastercraft Armor II',
        'Physical Enhancement II',
        'Close Contact',
      ],
      buffs: [
        '9% Lofty Footmen Might',
        '6% Lofty Footmen Resistance',
        '3% Lofty Footmen HP',
        '30% Footmen Might',
        '30% Footmen Resistance',
        '15% Footmen HP',
        '+200k Lofty Cap',
        '+50% Lofty Footmen Training Speed',
        '-50% Lofty Footmen Training Cost',
        '+50% Lofty Footmen Healing Speed',
        '-50% Lofty Footmen Healing Cost',
        '+800k Lofty Cap',
        '40% Footmen Might',
        '40% Footmen Resistance',
        '20% Footmen HP',
        '20% Lofty Footmen Damage',
      ],
    },
    A: {
      standardTroop: 'Archer',
      loftyTroop: 'Lofty Archer',
      names: [
        'Deadly Bolt',
        'Disguise',
        'Tactical Protection',
        'Enhanced Arrow',
        'Enhanced Arm Guard',
        'Mana Potion',
        'Elite Archer',
        'Shooting Practice',
        'Arrow Conservation',
        'Field Medic',
        'Survival Instinct',
        'Elite Archer II',
        'Enhanced Arrow II',
        'Enhanced Arm Guard II',
        'Mana Potion II',
        'Sharpest Arrow',
      ],
      buffs: [
        '9% Lofty Archer Might',
        '6% Lofty Archer Resistance',
        '3% Lofty Archer HP',
        '30% Archer Might',
        '30% Archer Resistance',
        '15% Archer HP',
        '+200k Lofty Cap',
        '+50% Lofty Archer Training Speed',
        '-50% Lofty Archer Training Cost',
        '+50% Lofty Archer Healing Speed',
        '-50% Lofty Archer Healing Cost',
        '+800k Lofty Cap',
        '40% Archer Might',
        '40% Archer Resistance',
        '20% Archer HP',
        '20% Lofty Archer Damage',
      ],
    },
    C: {
      standardTroop: 'Cavalry',
      loftyTroop: 'Lofty Cavalry',
      names: [
        'Deadly Assault',
        'Quality Horse Armor',
        'High Class Horse Armor',
        'Ferocious Charge',
        'Enhanced Barding',
        'Heavy Rider',
        'Chaos Rider',
        'Obstacle Training',
        'Mass Production',
        'Back-up Potion',
        'Miracle Cure',
        'Chaos Rider II',
        'Ferocious Charge II',
        'Enhanced Barding II',
        'Heavy Rider II',
        'Courageous Assault',
      ],
      buffs: [
        '9% Lofty Cavalry Might',
        '6% Lofty Cavalry Resistance',
        '3% Lofty Cavalry HP',
        '30% Cavalry Might',
        '30% Cavalry Resistance',
        '15% Cavalry HP',
        '+200k Lofty Cap',
        '+50% Lofty Cav Training Speed',
        '-50% Lofty Cav Training Cost',
        '+50% Lofty Cav Healing Speed',
        '-50% Lofty Cav Healing Cost',
        '+800k Lofty Cap',
        '40% Cavalry Might',
        '40% Cavalry Resistance',
        '20% Cavalry HP',
        '20% Lofty Cavalry Damage',
      ],
    },
  };
  const branchCurves = [
    'loftyStats',
    'loftyStats',
    'loftyStats',
    'standardStats',
    'standardStats',
    'standardStats',
    'firstLimit',
    'utility',
    'utility',
    'utility',
    'utility',
    'secondLimit',
    'finalStats',
    'finalStats',
    'finalStats',
    'damage',
  ];

  for (const [suffix, branch] of Object.entries(branches)) {
    for (let index = 0; index < branch.names.length; index += 1) {
      const nodeNumber = index + 14;
      const troop =
        index < 3 || (index >= 6 && index <= 11) || index === 15
          ? branch.loftyTroop
          : branch.standardTroop;
      expectNode(`node_${nodeNumber}_${suffix}`, {
        name: branch.names[index],
        troop,
        buff: branch.buffs[index],
        curve: branchCurves[index],
      });
    }
  }

  const total = loftyWarrior.nodes.reduce(
    (sum, node) => sum + node.wisdomCosts.reduce((nodeSum, cost) => nodeSum + cost, 0),
    0
  );
  assert.equal(total, 1_545_795);
});
