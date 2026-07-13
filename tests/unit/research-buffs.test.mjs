import test from 'node:test';
import assert from 'node:assert/strict';

import {
  describeNodeBuffProgress,
  findMissingBuffValueNodes,
  getNodeBuffEffects,
  getResearchBuffTone,
  getResearchPriority,
  summarizeTechBuffs,
} from '../../js/research-buffs.js';

test('classifies buff labels into stable semantic color tones', () => {
  assert.equal(getResearchBuffTone('Tactical Might'), 'tactical');
  assert.equal(getResearchBuffTone('Archer Might'), 'might');
  assert.equal(getResearchBuffTone('Cavalry Resistance'), 'resistance');
  assert.equal(getResearchBuffTone('All units HP'), 'hp');
  assert.equal(getResearchBuffTone('Footman deals more Damage'), 'damage');
  assert.equal(getResearchBuffTone('Archer Training Speed'), 'speed');
  assert.equal(getResearchBuffTone('Resource Gathering Capacity'), 'economy');
  assert.equal(getResearchBuffTone('Hero EXP'), 'season');
});

test('orders research priorities damage, HP, tactical, base combat, then training speed', () => {
  const labels = [
    { name: 'Drill', buff: 'Training Speed +5%' },
    { name: 'Guard', buff: 'Resistance +5%' },
    { name: 'Tactics', buff: 'Tactical Resistance +5%' },
    { name: 'Vitality', buff: 'All Units HP +5%' },
    { name: 'Lethal Blow', buff: 'Damage +5%' },
  ];
  assert.deepEqual(
    labels.map(getResearchPriority).map((priority) => priority.rank),
    [5, 4, 3, 2, 1]
  );
  assert.equal(getResearchPriority({ buff: 'Marching Speed +5%' }).key, 'other');
});

test('derives per-level percentage buffs from explicit per-level labels', () => {
  const summary = describeNodeBuffProgress(
    {
      name: 'Fertilizer',
      buff: '+3% Food Income per Level',
      maxLevel: 10,
    },
    4
  );

  assert.equal(summary.status, 'known');
  assert.equal(summary.currentLabel, '+12%');
  assert.equal(summary.maxLabel, '+30%');
  assert.equal(summary.currentWithLabel, '+12% Food Income');
  assert.deepEqual(summary.effectLabels, ['Food Income']);
  assert.equal(summary.remainingLabel, '+18%');
  assert.equal(summary.perLevelLabel, '+3%/lvl');
});

test('derives total percentage buffs across max levels', () => {
  const summary = describeNodeBuffProgress(
    {
      name: 'Power Strike',
      buff: '10% Might',
      maxLevel: 10,
    },
    4
  );

  assert.equal(summary.status, 'known');
  assert.equal(summary.currentLabel, '+4%');
  assert.equal(summary.maxLabel, '+10%');
  assert.equal(summary.currentWithLabel, '+4% Might');
  assert.equal(summary.remainingLabel, '+6%');
  assert.equal(summary.perLevelLabel, '+1%/lvl');
});

test('keeps negative cost reductions signed', () => {
  const summary = describeNodeBuffProgress(
    {
      name: 'Footmen Recruitment',
      buff: '-15% Training Cost',
      maxLevel: 15,
    },
    5
  );

  assert.equal(summary.status, 'known');
  assert.equal(summary.currentLabel, '-5%');
  assert.equal(summary.maxLabel, '-15%');
  assert.equal(summary.remainingLabel, '-10%');
});

test('treats single-level nonnumeric nodes as unlocks', () => {
  const summary = describeNodeBuffProgress(
    {
      name: 'Hero Command',
      buff: 'Deploy 3 Heroes',
      maxLevel: 1,
    },
    0
  );

  assert.equal(summary.status, 'unlock');
  assert.equal(summary.currentLabel, 'Locked');
  assert.equal(summary.maxLabel, 'Lv 1');
});

test('uses explicit level value tables for non-linear buffs', () => {
  const summary = describeNodeBuffProgress(
    {
      name: 'Footmen Immunity',
      buff: 'Resistance +35%',
      maxLevel: 10,
      buffStats: {
        label: 'Resistance Footmen Legion II',
        unit: '%',
        levelValues: [2, 4, 6, 8, 10, 13, 16, 20, 25, 35],
      },
    },
    6
  );

  assert.equal(summary.status, 'known');
  assert.equal(summary.currentLabel, '+13%');
  assert.equal(summary.maxLabel, '+35%');
  assert.equal(summary.currentWithLabel, '+13% Resistance Footmen Legion II');
  assert.equal(summary.perLevelLabel, 'varies/lvl');
});

test('flags multi-level nonnumeric nodes as missing buff value data', () => {
  const node = {
    name: 'Footmen Assault',
    buff: 'Might',
    maxLevel: 10,
  };

  assert.deepEqual(getNodeBuffEffects(node), []);
  assert.equal(describeNodeBuffProgress(node, 3).status, 'missing');
});

test('finds missing buff value nodes by season', () => {
  const missing = findMissingBuffValueNodes(
    [
      {
        name: 'S0 Tree',
        season: 'S0',
        nodes: [{ name: 'Missing', buff: 'Might', maxLevel: 10 }],
      },
      {
        name: 'X1 Tree',
        season: 'X1',
        nodes: [{ name: 'Known', buff: '+5% Damage Dealt', maxLevel: 10 }],
      },
    ],
    { seasons: ['S0'] }
  );

  assert.equal(missing.length, 1);
  assert.equal(missing[0].node.name, 'Missing');
});

test('summarizes tech buffs by effect label', () => {
  const tech = {
    id: 'x8',
    nodes: [
      { id: 'a', name: 'A', buff: '+10% Might Cavalry', maxLevel: 20 },
      { id: 'b', name: 'B', buff: '+10% Might Cavalry', maxLevel: 20 },
      { id: 'c', name: 'C', buff: '+500k Capacity Lofty Cavalry', maxLevel: 20 },
    ],
  };

  const summary = summarizeTechBuffs(tech, {
    getLevel: (node) => (node.id === 'a' ? 10 : 0),
  });

  const might = summary.known.find((item) => item.label === 'Might Cavalry');
  const capacity = summary.known.find((item) => item.label === 'Capacity Lofty Cavalry');

  assert.equal(might.currentLabel, '+5%');
  assert.equal(might.maxLabel, '+20%');
  assert.equal(might.nodeCount, 2);
  assert.equal(capacity.maxLabel, '+500k');
});
