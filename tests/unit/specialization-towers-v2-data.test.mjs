import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  SPECIALIZATION_PLANNER_ASSETS,
  SPECIALIZATION_PLANNER_SPRITE_URL,
} from '../../js/specialization-towers-v2-assets.js';
import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_CONTRIBUTION_SHEET_URL,
  SPECIALIZATION_CONTRIBUTION_TEMPLATE_VERSION,
  SPECIALIZATION_DATA_REVISION,
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_LEGION_SKILL_IMAGES,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_RESEARCH_IMAGES,
  SPECIALIZATION_ROYAL_TECH_BOOKS,
  SPECIALIZATION_SOURCE_METADATA,
  SPECIALIZATION_TECHNOLOGY_SUMMARY,
  SPECIALIZATION_TROOPS,
  getRoyalTechBook,
  getRoyalTechBooks,
  getSpecializationLegionSkillImage,
  getSpecializationResearch,
  getSpecializationResearchImage,
} from '../../js/specialization-towers-v2-data.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const researchEntries = Object.entries(SPECIALIZATION_RESEARCH);
const researchValues = Object.values(SPECIALIZATION_RESEARCH);

test('specialization source provenance identifies the X28+ eight-column revision', () => {
  assert.equal(SPECIALIZATION_DATA_REVISION, '2026-07-18-public-planner-assets');
  assert.deepEqual(SPECIALIZATION_SOURCE_METADATA, {
    title: 'Unit Specialization',
    publisher: 'ROCAcademy / Rise of Castles community guide',
    sourceType: 'community-guide',
    sourceUrl: 'https://www.riseofcastles.net/en/specializationtower',
    currentGuideUrl:
      'https://www.riseofcastles.net/en/feedrocbook/rise-of-castles-heroes/discussion/bc31587e-ebef-4d6c-93b2-5fff08cc993f',
    plannerUrl: 'https://tools.riseofcastles.net/specialization-tower-planner/',
    plannerDataUrl: 'https://tools.riseofcastles.net/specialization-tower-planner/app.js',
    plannerDataSha256: '46516975281b529b9d4d1460c2abc9121f8f256429f4aef4c9d7c236ac5c155e',
    plannerAssetCount: 33,
    legacyGuideUrl: 'https://www.riseofcastles.net/en/specializationtower',
    revisionDate: '2026-05-20',
    seasonScope: 'X28+',
    columnCount: 8,
    evidenceNotes: [
      'The May 20, 2026 current guide confirms 8 columns and Season X28+ coverage.',
      'The interactive planner data supplies canonical research-level medal totals, bonuses, milestones, passive skills, and Legion Skills; per-node costs remain unknown unless directly evidenced.',
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

test('Enhanced Tactics IV exposes the complete public catalog without inventing path edges', () => {
  const research = getSpecializationResearch('enhanced4');
  assert.deepEqual(research.progressiveReveal, {
    status: 'catalog-complete-path-unverified',
    sourceType: 'public-planner-and-user-supplied-game-screenshots',
    observationDate: '2026-07-18',
    note: 'The public planner confirms all 24 nodes and their buffs. Screenshots confirm both roots and the visible final node; downstream dependency edges remain unverified and are not claimed.',
  });
  assert.equal(research.nodes.length, 24);

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

test('all 33 public planner emblems are local, hashed, and mapped to the canonical corpus', () => {
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, 'tests/fixtures/specialization-planner-assets.json'), 'utf8')
  );
  assert.equal(manifest.sourceUrl, SPECIALIZATION_SOURCE_METADATA.plannerDataUrl);
  assert.equal(manifest.sourceSha256, SPECIALIZATION_SOURCE_METADATA.plannerDataSha256);
  assert.equal(manifest.assetCount, 33);
  assert.equal(manifest.researchAssetCount, 9);
  assert.equal(manifest.legionSkillAssetCount, 24);
  assert.equal(manifest.localBytes, 39584);
  assert.equal(manifest.plannerGridBytes, 36760);
  assert.ok(manifest.plannerGridBytes < manifest.sourceBytes / 20);

  const mappedAssets = new Set([
    ...Object.values(SPECIALIZATION_RESEARCH_IMAGES).flatMap((asset) =>
      asset?.src ? [asset] : Object.values(asset)
    ),
    ...Object.values(SPECIALIZATION_LEGION_SKILL_IMAGES).flat(),
  ]);
  const spriteAssets = new Set(Object.values(SPECIALIZATION_PLANNER_ASSETS));
  assert.deepEqual(mappedAssets, spriteAssets);
  assert.deepEqual(
    new Set(Object.keys(SPECIALIZATION_PLANNER_ASSETS)),
    new Set(manifest.assets.map(({ assetKey }) => assetKey))
  );

  const spriteBytes = readFileSync(join(repoRoot, manifest.sprite.path));
  assert.equal(SPECIALIZATION_PLANNER_SPRITE_URL, manifest.sprite.path);
  assert.equal(spriteBytes.length, manifest.localBytes);
  assert.equal(createHash('sha256').update(spriteBytes).digest('hex'), manifest.sprite.sha256);
  assert.equal(
    new Set(
      Object.values(SPECIALIZATION_PLANNER_ASSETS).map(({ column, row }) => `${column}:${row}`)
    ).size,
    33
  );

  for (const asset of manifest.assets) {
    const sprite = SPECIALIZATION_PLANNER_ASSETS[asset.assetKey];
    assert.equal(sprite.src, manifest.sprite.path);
    assert.equal(sprite.columns, manifest.sprite.columns);
    assert.equal(sprite.rows, manifest.sprite.rows);
    assert.ok(sprite.column >= 0 && sprite.column < sprite.columns, asset.assetKey);
    assert.ok(sprite.row >= 0 && sprite.row < sprite.rows, asset.assetKey);
    assert.equal(asset.contentType, 'image/webp');
    assert.equal(asset.sourceContentType, 'image/png');
    assert.match(asset.sourceSha256, /^[a-f0-9]{64}$/u);
    assert.ok(asset.bytes < asset.sourceBytes, asset.assetKey);
    assert.ok(asset.width >= 110 && asset.height >= 110, asset.path);
  }

  for (const research of researchValues) {
    for (const troop of SPECIALIZATION_TROOPS) {
      assert.ok(getSpecializationResearchImage(research.id, troop), `${research.id}/${troop}`);
    }
  }
  for (const columnId of Object.keys(SPECIALIZATION_COLUMNS)) {
    for (const troop of SPECIALIZATION_TROOPS) {
      assert.ok(getSpecializationLegionSkillImage(columnId, troop), `${columnId}/${troop}`);
    }
  }
  assert.equal(getSpecializationResearchImage(null, 'cavalry'), null);
  assert.equal(getSpecializationLegionSkillImage('missing', 'cavalry'), null);
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

test('royal tech books VII, VIII, IX, and full 13-book series are recorded with exact FM counts', () => {
  assert.equal(SPECIALIZATION_ROYAL_TECH_BOOKS.length, 13);
  assert.equal(Object.isFrozen(SPECIALIZATION_ROYAL_TECH_BOOKS), true);

  const book7 = getRoyalTechBook(7);
  assert.equal(book7.name, 'Judgement of Order');
  assert.equal(book7.roman, 'VII');
  assert.equal(book7.fmCount, 1_555_200);

  const book8 = getRoyalTechBook(8);
  assert.equal(book8.name, 'Ultimate Oath');
  assert.equal(book8.roman, 'VIII');
  assert.equal(book8.fmCount, 2_565_489);

  const book9 = getRoyalTechBook(9);
  assert.equal(book9.name, 'Throne of Justice');
  assert.equal(book9.roman, 'IX');
  assert.equal(book9.fmCount, 3_521_166);

  const totalFM = getRoyalTechBooks().reduce((sum, b) => sum + b.fmCount, 0);
  assert.equal(totalFM, 24_350_468);

  assert.equal(SPECIALIZATION_TECHNOLOGY_SUMMARY.length, 3);
  assert.equal(SPECIALIZATION_TECHNOLOGY_SUMMARY[0].cmCount, 3_476_740);
  assert.equal(SPECIALIZATION_TECHNOLOGY_SUMMARY[1].cmCount, 4_763_500);
  assert.equal(SPECIALIZATION_TECHNOLOGY_SUMMARY[2].cmCount, 4_792_600);
  assert.equal(SPECIALIZATION_TECHNOLOGY_SUMMARY[2].fmCount, 1_959_520);
});
