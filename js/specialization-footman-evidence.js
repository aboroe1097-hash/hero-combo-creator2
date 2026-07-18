/**
 * Footmen-only in-game evidence for Unit Specialization columns I-III.
 *
 * This module deliberately does not mutate the shared canonical research corpus.
 * The supplied captures show completed graphs, so they prove final visual order,
 * node counts, artwork, and visible labels, but not unlock direction, individual
 * node details, or medal costs. Unknown fields stay null until stronger evidence
 * is supplied.
 */

export const FOOTMAN_SPECIALIZATION_EVIDENCE_REVISION = '2026-07-18-footmen-columns-1-3';
export const FOOTMAN_SPECIALIZATION_ASSET_ROOT =
  'database/specialization/footmen/evidence/2026-07-18/';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const SOURCE_ASSETS = {
  overview: {
    file: 'overview-columns-1-3.jpeg',
    sha256: 'b553a57455dc4e2df3aaf11515fef0421f7289fd109b839040d9d9a4f54e8f3e',
    width: 716,
    height: 1600,
    evidenceKind: 'tower-overview',
  },
  training1: {
    file: 'training-i.jpeg',
    sha256: '2f6b7c66eb05e453b6c64ab9d48e83e8cccc7de290c8d3689cd36c0f65ed045e',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  training2: {
    file: 'training-ii.jpeg',
    sha256: '9f2a8b3288ee84133cd4becbb4c2928a50c0860e5663556eabb595f46c10ddfe',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  training3: {
    file: 'training-iii.jpeg',
    sha256: 'a44b53d5b02fc7c464784f534a1585d6ad07d90df7a8096a8e4901655987407d',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  encounter1: {
    file: 'encounter-battle-i.jpeg',
    sha256: '42bdb47a142c202d65241568e42aee4c24b72859fa71219844e24fcd51f3eb0b',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  siege1: {
    file: 'siege-skill-i.jpeg',
    sha256: '7921cb84dfe1f53835aaaf033e8d9972ccafac2537930ff59cd701e607704c28',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  encounter2: {
    file: 'encounter-battle-ii.jpeg',
    sha256: 'c372aa9d889dc1b5f73bd38eebec88d389ca3a69f49b03d7a3ec0c9af59d74a6',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  callofglory1: {
    file: 'call-of-glory-i.jpeg',
    sha256: '8b3389c68db0198ce2915355774746d67467ec4d2473878d02711fa8b2766f35',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  defensive1: {
    file: 'defensive-skill-i.jpeg',
    sha256: '213bd83d5b955b5c3b042de91487548f99f93bc26e2e4e8ba1177be7e736a30d',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  callofglory2: {
    file: 'call-of-glory-ii.jpeg',
    sha256: '518142345dc1f2f23a3548abb0091cc2fd28455f2aa2ce1dab766f796bf5f8c3',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  enhanced1: {
    file: 'enhanced-tactics-i.jpeg',
    sha256: '135f519219b29aff79904ba1e9ce398516d4a0cc6a100ece153b11f174c4c44b',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  neat1: {
    file: 'neat-formation-i.jpeg',
    sha256: 'a80eab393a8d82caf815050c9ca61834afddef7c48f02b4e1a42ea719c6af5c3',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph',
  },
  enhanced2Left: {
    file: 'enhanced-tactics-ii-left.jpeg',
    sha256: '6197af098ed98ab92f4a5f70b68c424d4da1f1c58d7036159dd49450e9023696',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph-frame',
  },
  enhanced2Right: {
    file: 'enhanced-tactics-ii-right.jpeg',
    sha256: 'ee906a6c3da8d3d224a2812d0a0fc791f94dafb8dd877ed5b52c8663206796f9',
    width: 716,
    height: 1600,
    evidenceKind: 'completed-research-graph-frame',
  },
  legion1: {
    file: 'legion-skill-1-reserve-supply.jpeg',
    sha256: '161a97c5cf290d738c5abe01580d91b4a2d2f1ee64a5cee67a48f31346705eac',
    width: 716,
    height: 1600,
    evidenceKind: 'legion-skill-detail',
  },
  legion2: {
    file: 'legion-skill-2-targeted-tactics.jpeg',
    sha256: '76dffa18a11808592ceb5061251f5bdab7141dc2d8ee2378d3d87ecc9cf9db02',
    width: 716,
    height: 1600,
    evidenceKind: 'legion-skill-detail',
  },
  legion3: {
    file: 'legion-skill-3-cover-the-weak-point.jpeg',
    sha256: '1ed12ec74fc4d8ecbfa6a7dbe1ff162be75dff63be873c10fa79ca3d7b38746a',
    width: 716,
    height: 1600,
    evidenceKind: 'legion-skill-detail',
  },
};

export const FOOTMAN_SPECIALIZATION_SOURCE = deepFreeze({
  sourceType: 'user-supplied-game-screenshots',
  observationDate: '2026-07-18',
  archiveName: 'footmen.zip',
  archiveBytes: 1193507,
  archiveSha256: 'aa026381902e382d6112a547fb80718bf38993aabee75c48ff801953c2099fe8',
  troopId: 'footman',
  completionState: '100-percent',
  evidenceBoundary:
    'Completed graphs verify visible final arrangements and counts, but not prerequisite direction, hidden reveal order, canonical per-node labels or effects, or per-node medal costs.',
  assets: SOURCE_ASSETS,
});

function crop(assetId, x, y, width, height) {
  return { assetId, x, y, width, height };
}

/**
 * Pixel-preserving crop descriptors into the byte-identical evidence JPEGs.
 * Consumers can extract these regions without committing generated or redrawn art.
 */
export const FOOTMAN_SPECIALIZATION_ICON_CROPS = deepFreeze({
  research: {
    training1: crop('overview', 44, 286, 128, 128),
    training2: crop('overview', 286, 286, 128, 128),
    training3: crop('overview', 528, 286, 128, 128),
    encounter1: crop('overview', 44, 558, 128, 128),
    siege1: crop('overview', 286, 558, 128, 128),
    encounter2: crop('overview', 528, 558, 128, 128),
    callofglory1: crop('overview', 44, 824, 128, 128),
    defensive1: crop('overview', 286, 824, 128, 128),
    callofglory2: crop('overview', 528, 824, 128, 128),
    enhanced1: crop('overview', 44, 1088, 128, 128),
    neat1: crop('overview', 286, 1088, 128, 128),
    enhanced2: crop('overview', 528, 1088, 128, 128),
  },
  nodeSamples: {
    hp: crop('training1', 247, 622, 52, 52),
    might: crop('training1', 459, 696, 52, 52),
    resistance: crop('training1', 198, 697, 52, 52),
    passive: crop('training1', 328, 544, 76, 76),
    tactical: crop('encounter1', 527, 791, 52, 52),
    formation: crop('callofglory1', 224, 448, 52, 52),
  },
  legionSkill: {
    1: crop('overview', 35, 1358, 145, 145),
    2: crop('overview', 278, 1358, 145, 145),
    3: crop('overview', 520, 1358, 145, 145),
  },
});

function visualNodeSlots(researchId, nodeCount, evidenceAssetIds) {
  return Array.from({ length: nodeCount }, (_, index) => ({
    id: `footman:${researchId}:visual-node-${String(index + 1).padStart(2, '0')}`,
    visualOrder: index + 1,
    canonicalNodeId: null,
    canonicalName: null,
    buffEffect: null,
    prerequisiteNodeIds: null,
    medalCost: null,
    evidenceAssetIds,
  }));
}

function researchEvidence({
  researchId,
  inGameName,
  column,
  columnOrder,
  nodeCount,
  evidenceFrames,
}) {
  const evidenceAssetIds = evidenceFrames.map(({ assetId }) => assetId);
  return {
    researchId,
    troopId: 'footman',
    inGameName,
    column,
    columnOrder,
    selectableNodeCount: nodeCount,
    masteryEmblemCount: 1,
    researchIcon: FOOTMAN_SPECIALIZATION_ICON_CROPS.research[researchId],
    arrangement: {
      status: 'verified-completed-graph',
      coordinateSystem: 'source-frame-pixels',
      orderingRule: 'top-to-bottom-then-left-to-right-in-evidence-frame',
      canonicalNodeOrder: null,
      visibleConnections: 'preserved-in-evidence-frames',
      prerequisiteDirection: null,
      evidenceFrames,
    },
    nodes: visualNodeSlots(researchId, nodeCount, evidenceAssetIds),
  };
}

export const FOOTMAN_SPECIALIZATION_RESEARCH_EVIDENCE = deepFreeze([
  researchEvidence({
    researchId: 'training1',
    inGameName: 'Footman Training I',
    column: 1,
    columnOrder: 1,
    nodeCount: 11,
    evidenceFrames: [{ assetId: 'training1', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'encounter1',
    inGameName: 'Encounter Battle I',
    column: 1,
    columnOrder: 2,
    nodeCount: 14,
    evidenceFrames: [{ assetId: 'encounter1', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'callofglory1',
    inGameName: 'Call of Glory I',
    column: 1,
    columnOrder: 3,
    nodeCount: 17,
    evidenceFrames: [{ assetId: 'callofglory1', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'enhanced1',
    inGameName: 'Enhanced Tactics I',
    column: 1,
    columnOrder: 4,
    nodeCount: 24,
    evidenceFrames: [{ assetId: 'enhanced1', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'training2',
    inGameName: 'Footman Training II',
    column: 2,
    columnOrder: 1,
    nodeCount: 14,
    evidenceFrames: [{ assetId: 'training2', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'siege1',
    inGameName: 'Siege Skill I',
    column: 2,
    columnOrder: 2,
    nodeCount: 18,
    evidenceFrames: [{ assetId: 'siege1', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'defensive1',
    inGameName: 'Defensive Skill I',
    column: 2,
    columnOrder: 3,
    nodeCount: 23,
    evidenceFrames: [{ assetId: 'defensive1', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'neat1',
    inGameName: 'Neat Formation I',
    column: 2,
    columnOrder: 4,
    nodeCount: 28,
    evidenceFrames: [{ assetId: 'neat1', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'training3',
    inGameName: 'Footman Training III',
    column: 3,
    columnOrder: 1,
    nodeCount: 17,
    evidenceFrames: [{ assetId: 'training3', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'encounter2',
    inGameName: 'Encounter Battle II',
    column: 3,
    columnOrder: 2,
    nodeCount: 24,
    evidenceFrames: [{ assetId: 'encounter2', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'callofglory2',
    inGameName: 'Call of Glory II',
    column: 3,
    columnOrder: 3,
    nodeCount: 29,
    evidenceFrames: [{ assetId: 'callofglory2', offsetX: 0, offsetY: 0 }],
  }),
  researchEvidence({
    researchId: 'enhanced2',
    inGameName: 'Enhanced Tactics II',
    column: 3,
    columnOrder: 4,
    nodeCount: 34,
    evidenceFrames: [
      { assetId: 'enhanced2Left', offsetX: 135, offsetY: 0 },
      { assetId: 'enhanced2Right', offsetX: 0, offsetY: 0 },
    ],
  }),
]);

export const FOOTMAN_SPECIALIZATION_LEGION_SKILL_EVIDENCE = deepFreeze({
  1: {
    column: 1,
    troopId: 'footman',
    name: 'Reserve Supply',
    effect:
      'When your troop power drops below 50% for the first time, 100% chance to restore some of your troop power instantly (recovery rate: 120%).',
    evidenceAssetId: 'legion1',
    icon: FOOTMAN_SPECIALIZATION_ICON_CROPS.legionSkill[1],
  },
  2: {
    column: 2,
    troopId: 'footman',
    name: 'Targeted Tactics',
    effect:
      'During round 5-8, after casting a combat skill, (the number of Footman squads of the Legion*8%) chance to activate the Targeted Attack status, dealing damage to the enemy while ignoring its dodging effect, lasting 1 round(s).',
    evidenceAssetId: 'legion2',
    icon: FOOTMAN_SPECIALIZATION_ICON_CROPS.legionSkill[2],
  },
  3: {
    column: 3,
    troopId: 'footman',
    name: 'Cover the Weak Point',
    effect:
      'In battles, if your Footman squad is the one with the lowest troop power among all enemy and friendly squads, the squad will have a 35% chance to split the damage it takes with all your friendly squads, lasting 1 round(s).',
    evidenceAssetId: 'legion3',
    icon: FOOTMAN_SPECIALIZATION_ICON_CROPS.legionSkill[3],
  },
});

export function getFootmanSpecializationResearchEvidence(researchId) {
  return (
    FOOTMAN_SPECIALIZATION_RESEARCH_EVIDENCE.find(
      (research) => research.researchId === researchId
    ) ?? null
  );
}
