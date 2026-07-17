import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_CONTRIBUTION_SHEET_URL,
  SPECIALIZATION_CONTRIBUTION_TEMPLATE_VERSION,
  SPECIALIZATION_DATA_REVISION,
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_SOURCE_METADATA,
  SPECIALIZATION_TROOPS,
  getSpecializationResearch,
} from '../../js/specialization-towers-v2-data.js';

const researchEntries = Object.entries(SPECIALIZATION_RESEARCH);
const researchValues = Object.values(SPECIALIZATION_RESEARCH);

test('specialization source provenance identifies the X28+ eight-column revision', () => {
  assert.equal(SPECIALIZATION_DATA_REVISION, '2026-07-17-progressive-paths');
  assert.deepEqual(SPECIALIZATION_SOURCE_METADATA, {
    title: 'Unit Specialization',
    publisher: 'ROCAcademy / Rise of Castles community guide',
    sourceType: 'community-guide',
    sourceUrl: 'https://www.riseofcastles.net/en/specializationtower',
    currentGuideUrl:
      'https://www.riseofcastles.net/en/feedrocbook/rise-of-castles-heroes/discussion/bc31587e-ebef-4d6c-93b2-5fff08cc993f',
    plannerUrl: 'https://tools.riseofcastles.net/specialization-tower-planner/',
    plannerDataUrl: 'https://tools.riseofcastles.net/specialization-tower-planner/app.js',
    legacyGuideUrl: 'https://www.riseofcastles.net/en/specializationtower',
    revisionDate: '2026-05-20',
    seasonScope: 'X28+',
    columnCount: 8,
    evidenceNotes: [
      'The May 20, 2026 current guide confirms 8 columns and Season X28+ coverage.',
      'The interactive planner data supplies the canonical node-level costs, bonuses, milestones, passive skills, and Legion Skills.',
    ],
  });
  assert.deepEqual(SPECIALIZATION_TROOPS, ['footman', 'archer', 'cavalry']);
});

test('community contribution sheet uses a real Google Sheets URL', () => {
  assert.equal(
    SPECIALIZATION_CONTRIBUTION_SHEET_URL === '' ||
      SPECIALIZATION_CONTRIBUTION_SHEET_URL.startsWith('https://docs.google.com/spreadsheets/'),
    true
  );
  assert.equal(
    SPECIALIZATION_CONTRIBUTION_SHEET_URL,
    'https://docs.google.com/spreadsheets/d/1b8KpSdvf02L5sGoi075MIO7J8IjKVMImBxHDDUWvF64/edit?usp=sharing'
  );
  assert.equal(SPECIALIZATION_CONTRIBUTION_TEMPLATE_VERSION, 2);
});

test('canonical corpus contains all research, attribute node, passive, and legion-skill records', () => {
  const attributeNodes = researchValues.flatMap((research) => research.nodes);
  const passiveResearches = researchValues.filter(
    (research) => research.passiveSkillNodeId !== null
  );
  const legionSkills = Object.values(SPECIALIZATION_LEGION_SKILLS).flatMap((skills) =>
    Object.values(skills)
  );

  assert.equal(researchValues.length, 32);
  assert.equal(attributeNodes.length, 718);
  assert.equal(passiveResearches.length, 17);
  assert.equal(Object.keys(SPECIALIZATION_COLUMNS).length, 8);
  assert.equal(legionSkills.length, 24);
});

test('research and selectable-node identities are unique and internally consistent', () => {
  const researchIds = researchEntries.map(([key, research]) => {
    assert.equal(research.id, key);

    const attributeNodeIds = research.nodes.map((node) => node.id);
    assert.equal(new Set(attributeNodeIds).size, attributeNodeIds.length);
    assert.equal(attributeNodeIds.includes(research.passiveSkillNodeId), false);

    if (research.passiveSkillNodeId === null) {
      assert.equal(research.passiveSkill, null);
    } else {
      assert.equal(Number.isInteger(research.passiveSkillNodeId), true);
      assert.deepEqual(Object.keys(research.passiveSkill), SPECIALIZATION_TROOPS);
    }

    return research.id;
  });

  assert.equal(new Set(researchIds).size, 32);

  const selectableIds = researchValues.flatMap((research) => [
    ...research.nodes.map((node) => `${research.id}:${node.id}`),
    ...(research.passiveSkillNodeId === null
      ? []
      : [`${research.id}:${research.passiveSkillNodeId}`]),
  ]);
  assert.equal(new Set(selectableIds).size, selectableIds.length);
});

test('Enhanced Tactics IV records only the progressive path states proven by screenshots', () => {
  const research = getSpecializationResearch('enhanced4');
  assert.deepEqual(research.progressiveReveal, {
    status: 'partial-evidence',
    sourceType: 'user-supplied-game-screenshots',
    observationDate: '2026-07-17',
    note: 'At 0%, Defense Plan and Siege Plan are available while Swirling Wind is visible but locked. Downstream prerequisites remain unverified.',
  });

  const defenseRoot = research.nodes.find(({ id }) => id === 1);
  const siegeRoot = research.nodes.find(({ id }) => id === 12);
  const finalVisibleNode = research.nodes.find(({ id }) => id === 24);
  assert.deepEqual(defenseRoot.prerequisiteNodeIds, []);
  assert.equal(defenseRoot.pathBranch, 'defense');
  assert.deepEqual(siegeRoot.prerequisiteNodeIds, []);
  assert.equal(siegeRoot.pathBranch, 'siege');
  assert.equal(finalVisibleNode.visibleWhenLocked, true);
  assert.equal(finalVisibleNode.pathBranch, 'convergence');

  const knownIds = new Set(research.nodes.map(({ id }) => id));
  for (const node of research.nodes) {
    if (!Array.isArray(node.prerequisiteNodeIds)) continue;
    assert.equal(node.prerequisiteNodeIds.includes(node.id), false, `self edge ${node.id}`);
    for (const prerequisiteId of node.prerequisiteNodeIds) {
      assert.equal(knownIds.has(prerequisiteId), true, `unknown prerequisite ${prerequisiteId}`);
    }
  }
  assert.equal(
    research.nodes.filter(({ prerequisiteNodeIds }) => Array.isArray(prerequisiteNodeIds)).length,
    2,
    'downstream edges must remain absent until verified'
  );
});

test('each column has four researches and the canonical medal costs total 1,369,839', () => {
  const expectedCosts = [15_647, 31_294, 62_588, 125_176, 250_352, 500_704, 160_696, 223_382];
  const assignedResearchIds = [];

  for (const [index, column] of Object.values(SPECIALIZATION_COLUMNS).entries()) {
    assert.equal(column.researches.length, 4);
    assert.equal(column.totalCost, expectedCosts[index]);
    assert.equal(
      column.researches.reduce(
        (total, researchId) => total + getSpecializationResearch(researchId).cost,
        0
      ),
      column.totalCost
    );
    assignedResearchIds.push(...column.researches);
  }

  assert.equal(new Set(assignedResearchIds).size, 32);
  assert.deepEqual(new Set(assignedResearchIds), new Set(Object.keys(SPECIALIZATION_RESEARCH)));
  assert.equal(
    Object.values(SPECIALIZATION_COLUMNS).reduce((total, column) => total + column.totalCost, 0),
    1_369_839
  );
});

test('columns 1-6 unlock in S3 and columns 7-8 unlock in SX1', () => {
  assert.deepEqual(
    Object.values(SPECIALIZATION_COLUMNS).map(({ unlockSeason }) => unlockSeason),
    ['S3', 'S3', 'S3', 'S3', 'S3', 'S3', 'SX1', 'SX1']
  );
});

test('all three troops reuse each research node structure and requirements', () => {
  for (const research of researchValues) {
    const sharedStructure = {
      researchId: research.id,
      badgeCost: research.cost,
      nodeIds: research.nodes.map(({ id }) => id),
      passiveSkillNodeId: research.passiveSkillNodeId,
    };
    const structureByTroop = Object.fromEntries(
      SPECIALIZATION_TROOPS.map((troop) => [troop, sharedStructure])
    );

    for (const troop of SPECIALIZATION_TROOPS) {
      assert.strictEqual(structureByTroop[troop], sharedStructure);
      assert.deepEqual(structureByTroop[troop].nodeIds, sharedStructure.nodeIds);
    }
  }
});

test('every troop and research has the four 25/50/75/100 milestone records', () => {
  let milestoneCount = 0;

  for (const research of researchValues) {
    assert.deepEqual(Object.keys(research.skillMilestones), SPECIALIZATION_TROOPS);

    for (const troop of SPECIALIZATION_TROOPS) {
      const milestones = research.skillMilestones[troop];
      assert.equal(milestones.length, 4, `${research.id}/${troop}`);
      assert.deepEqual(
        milestones.map(({ percent }) => percent),
        [25, 50, 75, 100],
        `${research.id}/${troop}`
      );
      milestoneCount += milestones.length;
    }
  }

  assert.equal(milestoneCount, 384);
});

test('special node metadata and raw English effects survive normalization', () => {
  const defensiveSecondBonus = getSpecializationResearch('defensive1').nodes.find(
    ({ id }) => id === 23
  );
  assert.deepEqual(defensiveSecondBonus.secondBonus, {
    bonusName: 'Tactical Resistance All',
    bonusValue: 5,
  });
  assert.equal(defensiveSecondBonus.effect, 'Tactical Might +5%, Tactical Resistance +5%');

  const trainingOverride = getSpecializationResearch('training4').nodes.find(({ id }) => id === 6);
  assert.deepEqual(trainingOverride.troopSpecific.cavalry, {
    name: 'Energetic',
    effect: 'Base HP +2%',
    bonusName: 'Base HP All',
    bonusValue: 2,
  });

  const branched = getSpecializationResearch('neat1');
  assert.equal(branched.rowBranched, true);
  assert.deepEqual(
    new Set(branched.nodes.map(({ row }) => row)),
    new Set(['front', 'mid', 'back'])
  );

  assert.equal(
    getSpecializationResearch('encounter1').nodes.find(({ id }) => id === 14).isFlat,
    true
  );
  assert.equal(
    getSpecializationResearch('callofglory1').skillMilestones.footman[3].isConditional,
    true
  );

  const contexts = new Set();
  for (const research of researchValues) {
    for (const node of research.nodes) contexts.add(node.context);
    if (research.passiveSkill) {
      for (const passive of Object.values(research.passiveSkill)) {
        if (passive.context) contexts.add(passive.context);
      }
    }
    for (const milestones of Object.values(research.skillMilestones)) {
      for (const milestone of milestones) contexts.add(milestone.context);
    }
  }
  assert.deepEqual([...contexts].sort(), [
    'baseAttributes',
    'battlefield',
    'general',
    'initiatingRally',
    'nonSiege',
    'rallyJoin',
    'reinforcingAllies',
    'roc',
    'siege',
    'siegeAttacks',
    'siegeDefense',
    'skill',
  ]);
});

test('canonical records are immutable and lookup returns null for unknown IDs', () => {
  assert.equal(Object.isFrozen(SPECIALIZATION_SOURCE_METADATA.evidenceNotes), true);
  assert.equal(Object.isFrozen(SPECIALIZATION_RESEARCH), true);
  assert.equal(Object.isFrozen(getSpecializationResearch('training1').nodes[0]), true);
  assert.equal(Object.isFrozen(SPECIALIZATION_LEGION_SKILLS[1].footman), true);
  assert.equal(getSpecializationResearch('missing'), null);
  assert.equal(getSpecializationResearch(null), null);
});
