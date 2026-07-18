import {
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_SOURCE_METADATA,
} from './specialization-towers-v2-data.js';

export const ARCHER_SPECIALIZATION_DATA_REVISION = '2026-07-18-archer-columns-1-3';
export const ARCHER_SPECIALIZATION_ASSET_ROOT = 'docs/specialization/archer/assets';

const EVIDENCE_HASHES = {
  'archer-specialization-overview.jpeg':
    '2d161a3d0ea2424a9f32d436f1cc6660591327de1532e29bcb9c60598bf5275a',
  'column-1-archer-training-i.jpeg':
    '3888b1e6d75f696152615094556f7335994613b07d709bc1e11e8f8b1579b8d7',
  'column-1-call-of-glory-i.jpeg':
    'ff5f520879f04b4955ae6e1171ccdc62544738abc986c8216c38e0615c72888f',
  'column-1-encounter-battle-i.jpeg':
    'f7a8a74a8a46dba64c7b4a3a5d2084b9ecc38bca2e3f20432ef3b5c532ec516f',
  'column-1-enhanced-tactics-i.jpeg':
    'f36a88c58bb269fe1f96d152db691940734b3b4289141c32a10ba13f5299909d',
  'column-2-archer-training-ii.jpeg':
    'c903e2bd6d8469223c27a30652a00139902252fe71948692138a12c4e898c86a',
  'column-2-defensive-skill-i.jpeg':
    '173c48fc0d4b6a0172edea07e0a9c0f3ab81225e6c6da4ba526a9d56dd228c08',
  'column-2-neat-formation-i.jpeg':
    'e5a8812c3269b47d7b42b36022c15a47809d15b130e79186865b11327d0be3f2',
  'column-2-siege-skill-i.jpeg': '433a2549167dac8a5c64b0c08171c814db835c93c939e8301eae7e931ac574a5',
  'column-3-archer-training-iii.jpeg':
    '60fc7986cb273975bf43be7535e19176d218f1db5d8225cc87304d1721dca370',
  'column-3-call-of-glory-ii.jpeg':
    '10242650b8e1472c9c56666ab899db0b4655f5b9720f70239aeb144ff43abbc0',
  'column-3-encounter-battle-ii.jpeg':
    'efce2d0f5194edec538e35f873c77235e150059f82c052cc0f90555d928546b7',
  'column-3-enhanced-tactics-ii-left.jpeg':
    'fda940c2e5932bbdc50b0f6de1fc0a5040322c686138fe1b1b3a0208e40b6c6e',
  'column-3-enhanced-tactics-ii-right.jpeg':
    '766f8d5e44004d7389cf50dd6ab094443f85f865a33e7d338a591c77b1730068',
  'legion-skill-column-1-rapid-shots.jpeg':
    'd5f02fae3eefd2e7cda381305f380654e3e6bc0bbc36ad1e9b0640075bd04712',
  'legion-skill-column-2-sniper-archer.jpeg':
    'e5419cef174ec3cebda6d63eb642e39f753793456331a25dd6881c41146aee0f',
  'legion-skill-column-3-strong-resistance.jpeg':
    '631f39eece842bd6bcad6bd193a92b03f6c1c3c5fbeb57d8ba6591be3618b8b8',
};

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function evidence(filename) {
  return {
    id: `archer-screenshot:${filename.replace(/\.jpeg$/u, '')}`,
    asset: `${ARCHER_SPECIALIZATION_ASSET_ROOT}/evidence/${filename}`,
    sha256: EVIDENCE_HASHES[filename],
    sourceType: 'user-supplied-game-screenshot',
    observedAt: '2026-07-18',
    imageSize: { width: 716, height: 1600 },
  };
}

export const ARCHER_SPECIALIZATION_EVIDENCE = deepFreeze(
  Object.fromEntries(Object.keys(EVIDENCE_HASHES).map((filename) => [filename, evidence(filename)]))
);

const OVERVIEW = 'archer-specialization-overview.jpeg';

const ICON_SPECS = {
  'research:archer-training': [OVERVIEW, [58, 294, 104, 104]],
  'research:encounter-battle': [OVERVIEW, [58, 567, 104, 104]],
  'research:call-of-glory': [OVERVIEW, [58, 834, 104, 104]],
  'research:enhanced-tactics': [OVERVIEW, [58, 1117, 104, 104]],
  'research:siege-skill': [OVERVIEW, [298, 567, 104, 104]],
  'research:defensive-skill': [OVERVIEW, [298, 834, 104, 104]],
  'research:neat-formation': [OVERVIEW, [298, 1117, 104, 104]],
  'legion:rapid-shots': [OVERVIEW, [52, 1397, 116, 116]],
  'legion:sniper-archer': [OVERVIEW, [292, 1397, 116, 116]],
  'legion:strong-resistance': [OVERVIEW, [532, 1397, 116, 116]],
  'node:crossed-swords': ['column-1-archer-training-i.jpeg', [345, 509, 56, 56]],
  'node:resistance-shield': ['column-1-archer-training-i.jpeg', [228, 579, 56, 56]],
  'node:revival-heart': ['column-1-archer-training-i.jpeg', [149, 782, 56, 56]],
  'node:archer-hourglass': ['column-1-archer-training-i.jpeg', [318, 1034, 96, 96]],
  'node:archer-bow': ['column-1-encounter-battle-i.jpeg', [343, 528, 96, 96]],
  'node:tactical-burst': ['column-1-encounter-battle-i.jpeg', [536, 789, 56, 56]],
  'node:legion-helmets': ['column-1-call-of-glory-i.jpeg', [258, 1123, 56, 56]],
  'node:siege-hammer': ['column-2-siege-skill-i.jpeg', [333, 1079, 96, 96]],
  'node:formation-strike': ['column-2-neat-formation-i.jpeg', [356, 873, 56, 56]],
};

function iconPath(iconId) {
  const [kind, name] = iconId.split(':');
  const folder = kind === 'legion' ? 'legion' : kind === 'research' ? 'research' : 'nodes';
  return `${ARCHER_SPECIALIZATION_ASSET_ROOT}/icons/${folder}/${name}.png`;
}

export const ARCHER_SPECIALIZATION_ICON_ASSETS = deepFreeze(
  Object.fromEntries(
    Object.entries(ICON_SPECS).map(([id, [source, crop]]) => [
      id,
      {
        id,
        asset: iconPath(id),
        sourceEvidenceId: evidence(source).id,
        crop: { x: crop[0], y: crop[1], width: crop[2], height: crop[3] },
        transform: 'direct-pixel-crop-no-resize',
      },
    ])
  )
);

const RESEARCH_SPECS = [
  {
    id: 'training1',
    column: 1,
    order: 1,
    displayName: 'Archer Training I',
    iconId: 'research:archer-training',
    evidence: ['column-1-archer-training-i.jpeg'],
    masteryCenter: [371, 853],
    slots: [
      [373, 537],
      [256, 607],
      [483, 607],
      [541, 696],
      [195, 697],
      [177, 810],
      [559, 811],
      [196, 923],
      [511, 923],
      [261, 1017],
      [366, 1082],
    ],
  },
  {
    id: 'encounter1',
    column: 1,
    order: 2,
    displayName: 'Encounter Battle I',
    iconId: 'research:encounter-battle',
    evidence: ['column-1-encounter-battle-i.jpeg'],
    masteryCenter: [372, 835],
    slots: [
      [391, 576],
      [307, 648],
      [468, 648],
      [251, 725],
      [526, 725],
      [210, 816],
      [564, 817],
      [322, 908],
      [452, 909],
      [226, 933],
      [549, 934],
      [276, 1024],
      [499, 1024],
      [386, 1036],
    ],
  },
  {
    id: 'callofglory1',
    column: 1,
    order: 3,
    displayName: 'Call of Glory I',
    iconId: 'research:call-of-glory',
    evidence: ['column-1-call-of-glory-i.jpeg'],
    masteryCenter: [371, 819],
    slots: [
      [524, 483],
      [262, 484],
      [267, 621],
      [515, 621],
      [184, 713],
      [599, 713],
      [300, 731],
      [482, 731],
      [306, 889],
      [487, 891],
      [578, 958],
      [222, 961],
      [390, 1041],
      [184, 1062],
      [604, 1073],
      [286, 1151],
      [507, 1151],
    ],
  },
  {
    id: 'enhanced1',
    column: 1,
    order: 4,
    displayName: 'Enhanced Tactics I',
    iconId: 'research:enhanced-tactics',
    evidence: ['column-1-enhanced-tactics-i.jpeg'],
    masteryCenter: [371, 965],
    slots: [
      [309, 564],
      [488, 564],
      [400, 578],
      [227, 587],
      [569, 589],
      [519, 656],
      [277, 657],
      [395, 682],
      [566, 742],
      [230, 743],
      [399, 777],
      [309, 786],
      [487, 786],
      [226, 841],
      [571, 841],
      [398, 870],
      [519, 911],
      [277, 912],
      [255, 1000],
      [543, 1000],
      [344, 1064],
      [454, 1064],
      [250, 1089],
      [547, 1090],
    ],
  },
  {
    id: 'training2',
    column: 2,
    order: 1,
    displayName: 'Archer Training II',
    iconId: 'research:archer-training',
    evidence: ['column-2-archer-training-ii.jpeg'],
    masteryCenter: [370, 817],
    slots: [
      [311, 537],
      [442, 537],
      [207, 597],
      [547, 602],
      [265, 714],
      [599, 727],
      [167, 800],
      [592, 858],
      [158, 909],
      [488, 936],
      [193, 1015],
      [557, 1091],
      [285, 1100],
      [414, 1131],
    ],
  },
  {
    id: 'siege1',
    column: 2,
    order: 2,
    displayName: 'Siege Skill I',
    iconId: 'research:siege-skill',
    evidence: ['column-2-siege-skill-i.jpeg'],
    masteryCenter: [372, 831],
    slots: [
      [383, 419],
      [272, 537],
      [381, 537],
      [490, 538],
      [381, 661],
      [286, 701],
      [176, 702],
      [470, 702],
      [586, 702],
      [142, 811],
      [620, 811],
      [176, 920],
      [285, 920],
      [476, 920],
      [586, 921],
      [272, 1064],
      [490, 1064],
      [381, 1127],
    ],
  },
  {
    id: 'defensive1',
    column: 2,
    order: 3,
    displayName: 'Defensive Skill I',
    iconId: 'research:defensive-skill',
    evidence: ['column-2-defensive-skill-i.jpeg'],
    masteryCenter: [370, 832],
    slots: [
      [372, 493],
      [278, 572],
      [467, 572],
      [521, 649],
      [225, 650],
      [186, 731],
      [296, 733],
      [450, 734],
      [556, 738],
      [167, 832],
      [574, 839],
      [485, 840],
      [260, 841],
      [580, 940],
      [165, 941],
      [255, 952],
      [491, 952],
      [372, 991],
      [574, 1041],
      [174, 1042],
      [378, 1118],
      [243, 1119],
      [503, 1119],
    ],
  },
  {
    id: 'neat1',
    column: 2,
    order: 4,
    displayName: 'Neat Formation I',
    iconId: 'research:neat-formation',
    evidence: ['column-2-neat-formation-i.jpeg'],
    masteryCenter: [371, 831],
    slots: [
      [219, 569],
      [550, 569],
      [122, 573],
      [647, 575],
      [294, 614],
      [474, 614],
      [117, 672],
      [655, 673],
      [226, 677],
      [547, 677],
      [431, 687],
      [338, 688],
      [160, 747],
      [607, 748],
      [316, 766],
      [454, 766],
      [237, 791],
      [533, 791],
      [382, 917],
      [309, 948],
      [458, 948],
      [381, 991],
      [289, 1025],
      [478, 1026],
      [383, 1081],
      [309, 1105],
      [458, 1106],
      [384, 1159],
    ],
  },
  {
    id: 'training3',
    column: 3,
    order: 1,
    displayName: 'Archer Training III',
    iconId: 'research:archer-training',
    evidence: ['column-3-archer-training-iii.jpeg'],
    masteryCenter: [369, 821],
    slots: [
      [381, 588],
      [381, 692],
      [571, 742],
      [192, 743],
      [297, 753],
      [469, 753],
      [235, 822],
      [525, 825],
      [468, 903],
      [296, 904],
      [437, 992],
      [210, 996],
      [325, 996],
      [554, 997],
      [241, 1077],
      [521, 1088],
      [378, 1092],
    ],
  },
  {
    id: 'encounter2',
    column: 3,
    order: 2,
    displayName: 'Encounter Battle II',
    iconId: 'research:encounter-battle',
    evidence: ['column-3-encounter-battle-ii.jpeg'],
    masteryCenter: [371, 972],
    slots: [
      [387, 507],
      [190, 544],
      [586, 544],
      [294, 567],
      [482, 567],
      [389, 649],
      [542, 678],
      [235, 679],
      [301, 725],
      [476, 726],
      [486, 813],
      [385, 814],
      [589, 814],
      [285, 819],
      [183, 820],
      [300, 913],
      [475, 913],
      [233, 954],
      [541, 960],
      [294, 1071],
      [482, 1071],
      [184, 1089],
      [582, 1089],
      [393, 1116],
    ],
  },
  {
    id: 'callofglory2',
    column: 3,
    order: 3,
    displayName: 'Call of Glory II',
    iconId: 'research:call-of-glory',
    evidence: ['column-3-call-of-glory-ii.jpeg'],
    masteryCenter: [371, 828],
    slots: [
      [350, 495],
      [352, 563],
      [267, 638],
      [433, 638],
      [351, 639],
      [349, 712],
      [242, 743],
      [419, 744],
      [486, 817],
      [217, 818],
      [281, 890],
      [458, 892],
      [157, 910],
      [546, 912],
      [352, 922],
      [68, 937],
      [633, 938],
      [350, 995],
      [267, 997],
      [434, 998],
      [48, 1010],
      [653, 1010],
      [170, 1012],
      [531, 1012],
      [352, 1071],
      [225, 1108],
      [471, 1108],
      [352, 1151],
      [347, 1240],
    ],
  },
  {
    id: 'enhanced2',
    column: 3,
    order: 4,
    displayName: 'Enhanced Tactics II',
    iconId: 'research:enhanced-tactics',
    evidence: ['column-3-enhanced-tactics-ii-left.jpeg', 'column-3-enhanced-tactics-ii-right.jpeg'],
    coordinateSpace: 'mastery-center-relative-pixels',
    masteryCenter: [0, 0],
    slots: [
      [-162, -202],
      [166, -201],
      [2, -170],
      [-252, -167],
      [255, -166],
      [-141, -128],
      [146, -127],
      [-276, -77],
      [280, -77],
      [-82, -57],
      [86, -57],
      [-213, -13],
      [218, -13],
      [-276, 52],
      [-126, 52],
      [132, 52],
      [282, 52],
      [345, 116],
      [-340, 117],
      [68, 120],
      [-62, 121],
      [188, 130],
      [-261, 160],
      [266, 160],
      [-142, 176],
      [145, 177],
      [0, 196],
      [-170, 256],
      [176, 256],
      [-62, 270],
      [68, 271],
      [-128, 334],
      [133, 334],
      [null, null],
    ],
    layoutCompleteness: 'one-node-position-unknown',
  },
];

function archerNodeData(research, node, passive = false) {
  const troopValue = passive ? research.passiveSkill?.archer : node.troopSpecific?.archer;
  const value = troopValue || node;
  const canonicalNodeId = passive ? research.passiveSkillNodeId : node.id;
  const buffs = passive
    ? []
    : [
        value.bonusName
          ? {
              name: value.bonusName,
              value: value.bonusValue ?? null,
              context: value.context ?? node.context ?? null,
              isFlat: value.isFlat === true || node.isFlat === true,
            }
          : null,
        value.secondBonus || node.secondBonus || null,
      ].filter(Boolean);
  return {
    id: `archer:${research.id}:node:${canonicalNodeId}`,
    researchId: research.id,
    canonicalNodeId,
    passive,
    name: value?.name ?? (passive ? 'Passive Skill' : null),
    effect: value?.effect ?? null,
    buffs,
    medalCost: null,
    medalCostEvidence: null,
    prerequisiteNodeIds: null,
    prerequisiteEvidence: null,
    iconAsset: null,
    arrangementSlotId: null,
    canonicalValueEvidence: {
      sourceType: SPECIALIZATION_SOURCE_METADATA.sourceType,
      sourceUrl: SPECIALIZATION_SOURCE_METADATA.plannerDataUrl,
      revisionDate: SPECIALIZATION_SOURCE_METADATA.revisionDate,
    },
  };
}

function buildResearch(spec) {
  const research = SPECIALIZATION_RESEARCH[spec.id];
  if (!research) throw new Error(`Unknown Archer Specialization research: ${spec.id}`);
  const nodes = research.nodes.map((node) => archerNodeData(research, node));
  if (research.passiveSkillNodeId !== null && research.passiveSkillNodeId !== undefined) {
    nodes.push(archerNodeData(research, {}, true));
  }
  const slots = spec.slots.map(([x, y], index) => ({
    id: `archer:${spec.id}:slot:${String(index + 1).padStart(2, '0')}`,
    x,
    y,
    canonicalNodeId: null,
    evidenceStatus: x === null || y === null ? 'unknown' : 'screenshot-confirmed-position',
  }));
  return {
    id: `archer:${spec.id}`,
    troop: 'archer',
    researchId: spec.id,
    column: spec.column,
    order: spec.order,
    name: spec.displayName,
    iconAsset: ARCHER_SPECIALIZATION_ICON_ASSETS[spec.iconId].asset,
    nodeCount: nodes.length,
    totalMedalCost: research.cost,
    totalMedalCostEvidence: {
      sourceType: SPECIALIZATION_SOURCE_METADATA.sourceType,
      sourceUrl: SPECIALIZATION_SOURCE_METADATA.plannerDataUrl,
      revisionDate: SPECIALIZATION_SOURCE_METADATA.revisionDate,
    },
    nodes,
    arrangement: {
      coordinateSpace: spec.coordinateSpace || 'source-screenshot-pixels',
      imageSize: spec.coordinateSpace ? null : { width: 716, height: 1600 },
      masteryCenter: { x: spec.masteryCenter[0], y: spec.masteryCenter[1] },
      slots,
      slotToCanonicalNodeMapping: null,
      connections: null,
      prerequisiteDirection: null,
      completeness: spec.layoutCompleteness || 'all-node-centers-observed',
      evidence: spec.evidence.map((filename) => evidence(filename)),
    },
  };
}

export const ARCHER_SPECIALIZATION_RESEARCH = deepFreeze(
  Object.fromEntries(RESEARCH_SPECS.map((spec) => [spec.id, buildResearch(spec)]))
);

export const ARCHER_SPECIALIZATION_RESEARCH_ORDER = deepFreeze({
  1: ['training1', 'encounter1', 'callofglory1', 'enhanced1'],
  2: ['training2', 'siege1', 'defensive1', 'neat1'],
  3: ['training3', 'encounter2', 'callofglory2', 'enhanced2'],
  evidence: evidence(OVERVIEW),
});

const LEGION_EVIDENCE = {
  1: ['rapid-shots', 'legion-skill-column-1-rapid-shots.jpeg'],
  2: ['sniper-archer', 'legion-skill-column-2-sniper-archer.jpeg'],
  3: ['strong-resistance', 'legion-skill-column-3-strong-resistance.jpeg'],
};

export const ARCHER_SPECIALIZATION_LEGION_SKILLS = deepFreeze(
  Object.fromEntries(
    Object.entries(LEGION_EVIDENCE).map(([column, [iconName, filename]]) => [
      column,
      {
        id: `archer:column:${column}:legion-skill`,
        column: Number(column),
        name: SPECIALIZATION_LEGION_SKILLS[column].archer.name,
        effect: SPECIALIZATION_LEGION_SKILLS[column].archer.desc,
        iconAsset: `${ARCHER_SPECIALIZATION_ASSET_ROOT}/icons/legion/${iconName}.png`,
        evidence: evidence(filename),
      },
    ])
  )
);

export function getArcherSpecializationResearch(researchId) {
  return typeof researchId === 'string'
    ? (ARCHER_SPECIALIZATION_RESEARCH[researchId] ?? null)
    : null;
}
