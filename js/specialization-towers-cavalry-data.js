/**
 * Evidence-backed Cavalry Specialization overlay.
 *
 * Shared canonical research values remain in specialization-towers-v2-data.js.
 * This module adds only Cavalry-specific source evidence and exact supplied assets.
 * Fully learned screenshots prove visible layouts and node counts, but do not prove
 * learning order, directed prerequisites, or per-node medal costs. Those fields stay null.
 */

import {
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_SOURCE_METADATA,
} from './specialization-towers-v2-data.js';

export const CAVALRY_SPECIALIZATION_DATA_REVISION = '2026-07-18-cavalry-screenshots-v1';
export const CAVALRY_SPECIALIZATION_ASSET_ROOT =
  'database/specialization/cavalry/assets';
export const CAVALRY_SPECIALIZATION_ASSET_MANIFEST = `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/manifest.json`;

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const PLANNER_EVIDENCE = deepFreeze({
  id: 'canonical-planner-2026-05-20',
  kind: 'canonical-planner-data',
  url: SPECIALIZATION_SOURCE_METADATA.plannerDataUrl,
  confirms: [
    'canonical node identities',
    'canonical English node names',
    'Cavalry buffs and effects',
    'full-research medal totals',
  ],
});

const SCREENSHOT_EVIDENCE = deepFreeze({
  'cav-overview': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/01-overview.jpeg`,
    confirms: ['research order in columns 1-3', 'research names', 'research icon artwork'],
  },
  'cav-training-1': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/02-cavalry-training-i.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-training-2': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/03-cavalry-training-ii.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-training-3': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/04-cavalry-training-iii.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-encounter-1': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/05-encounter-battle-i.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-siege-1': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/06-siege-skill-i.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-encounter-2': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/07-encounter-battle-ii.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-call-glory-1': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/08-call-of-glory-i.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-defensive-1': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/09-defensive-skill-i.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-call-glory-2': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/10-call-of-glory-ii.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-enhanced-1': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/11-enhanced-tactics-i.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-neat-1': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/12-neat-formation-i.jpeg`,
    confirms: ['visible completed arrangement', 'visible node count', 'node icon artwork'],
  },
  'cav-enhanced-2-left': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/13-enhanced-tactics-ii-left.jpeg`,
    confirms: ['left portion of completed arrangement', 'node icon artwork'],
  },
  'cav-enhanced-2-right': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/14-enhanced-tactics-ii-right.jpeg`,
    confirms: ['right portion of completed arrangement', 'node icon artwork'],
  },
  'cav-legion-rescue': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/15-rescue-skills.jpeg`,
    confirms: ['Rescue Skills name', 'Rescue Skills effect', 'Legion Skill icon artwork'],
  },
  'cav-legion-suppression': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/16-vanguards-suppression.jpeg`,
    confirms: [
      "Vanguard's Suppression name",
      "Vanguard's Suppression effect",
      'Legion Skill icon artwork',
    ],
  },
  'cav-legion-breakout': {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/evidence/17-breakout.jpeg`,
    confirms: ['Breakout name', 'Breakout effect', 'Legion Skill icon artwork'],
  },
});

export const CAVALRY_SPECIALIZATION_EVIDENCE = deepFreeze({
  planner: PLANNER_EVIDENCE,
  screenshots: SCREENSHOT_EVIDENCE,
  observationDate: '2026-07-18',
  captureState: 'all supplied research graphs are shown at 100% completion',
  limitations: [
    'The screenshots do not expose per-node medal costs.',
    'A completed graph does not prove learning order or edge direction.',
    'Repeated same-art nodes cannot be mapped to one canonical numeric ID from artwork alone.',
    'Enhanced Tactics II requires two panned screenshots; neither image contains the full graph.',
  ],
});

const RESEARCH_DESCRIPTORS = [
  ['training1', 'Cavalry Training I', 1, 1, 11, 'cav-training-1', 'cavalry-training-i.png'],
  ['encounter1', 'Encounter Battle I', 1, 2, 14, 'cav-encounter-1', 'encounter-battle-i.png'],
  ['callofglory1', 'Call of Glory I', 1, 3, 17, 'cav-call-glory-1', 'call-of-glory-i.png'],
  ['enhanced1', 'Enhanced Tactics I', 1, 4, 24, 'cav-enhanced-1', 'enhanced-tactics-i.png'],
  ['training2', 'Cavalry Training II', 2, 1, 14, 'cav-training-2', 'cavalry-training-ii.png'],
  ['siege1', 'Siege Skill I', 2, 2, 18, 'cav-siege-1', 'siege-skill-i.png'],
  ['defensive1', 'Defensive Skill I', 2, 3, 23, 'cav-defensive-1', 'defensive-skill-i.png'],
  ['neat1', 'Neat Formation I', 2, 4, 28, 'cav-neat-1', 'neat-formation-i.png'],
  ['training3', 'Cavalry Training III', 3, 1, 17, 'cav-training-3', 'cavalry-training-iii.png'],
  ['encounter2', 'Encounter Battle II', 3, 2, 24, 'cav-encounter-2', 'encounter-battle-ii.png'],
  ['callofglory2', 'Call of Glory II', 3, 3, 29, 'cav-call-glory-2', 'call-of-glory-ii.png'],
  [
    'enhanced2',
    'Enhanced Tactics II',
    3,
    4,
    34,
    ['cav-enhanced-2-left', 'cav-enhanced-2-right'],
    'enhanced-tactics-ii.png',
  ],
];

function cavalryOverride(node, key) {
  return node.troopSpecific?.cavalry?.[key] ?? node[key] ?? null;
}

function canonicalNodeRecord(research, node, canonicalRecordOrder, passive = false) {
  const passiveRecord = passive ? research.passiveSkill?.cavalry : null;
  return {
    id: `${research.id}:${node.id}`,
    researchId: research.id,
    canonicalNodeId: node.id,
    canonicalRecordOrder,
    canonicalName: passive ? (passiveRecord?.name ?? null) : cavalryOverride(node, 'name'),
    effect: passive ? (passiveRecord?.effect ?? null) : cavalryOverride(node, 'effect'),
    context: passive ? (passiveRecord?.context ?? 'skill') : (node.context ?? null),
    bonusName: passive ? (passiveRecord?.bonusName ?? null) : cavalryOverride(node, 'bonusName'),
    bonusValue: passive ? (passiveRecord?.bonusValue ?? null) : cavalryOverride(node, 'bonusValue'),
    isPassive: passive,
    row: passive ? null : (node.row ?? null),
    iconAssetPath: null,
    arrangementSlotId: null,
    learningOrder: null,
    prerequisiteNodeIds: null,
    medalCost: null,
    provenance: {
      canonicalValues: PLANNER_EVIDENCE.id,
      icon: null,
      arrangement: null,
      prerequisites: null,
      medalCost: null,
    },
  };
}

function buildResearchRecord(descriptor) {
  const [id, canonicalName, column, orderInColumn, verifiedNodeCount, evidence, iconFilename] =
    descriptor;
  const research = SPECIALIZATION_RESEARCH[id];
  if (!research) throw new Error(`Unknown canonical Cavalry research: ${id}`);
  const evidenceIds = Array.isArray(evidence) ? evidence : [evidence];
  const nodes = research.nodes.map((node, index) => canonicalNodeRecord(research, node, index + 1));
  if (research.passiveSkillNodeId !== null) {
    nodes.push(
      canonicalNodeRecord(research, { id: research.passiveSkillNodeId }, nodes.length + 1, true)
    );
  }
  return {
    id,
    stableId: `cavalry:${id}`,
    troopId: 'cavalry',
    canonicalName,
    column,
    orderInColumn,
    verifiedNodeCount,
    totalMedalCost: research.cost,
    nodeMedalCostsComplete: false,
    researchIconAssetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/icons/research/${iconFilename}`,
    nodes,
    arrangement: {
      status: 'verified-completed-view',
      kind: evidenceIds.length === 1 ? 'single-screenshot' : 'panned-multi-screenshot',
      evidenceIds,
      nodeOrder: null,
      directedPrerequisites: null,
      note: 'The source preserves the exact in-game completed arrangement. Learning order and directed prerequisites remain unknown.',
    },
    provenance: {
      canonicalValues: PLANNER_EVIDENCE.id,
      researchName: 'cav-overview',
      researchIcon: 'cav-overview',
      nodeCount: evidenceIds,
      arrangement: evidenceIds,
      totalMedalCost: PLANNER_EVIDENCE.id,
      perNodeMedalCosts: null,
    },
  };
}

export const CAVALRY_SPECIALIZATION_RESEARCH = deepFreeze(
  Object.fromEntries(
    RESEARCH_DESCRIPTORS.map((descriptor) => [descriptor[0], buildResearchRecord(descriptor)])
  )
);

export const CAVALRY_SPECIALIZATION_NODE_ICON_ASSETS = deepFreeze({
  redCrossedSwords: {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/icons/nodes/red-crossed-swords.png`,
    evidenceId: 'cav-training-1',
    canonicalMeaning: null,
  },
  greenHeart: {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/icons/nodes/green-heart.png`,
    evidenceId: 'cav-training-1',
    canonicalMeaning: null,
  },
  purpleShield: {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/icons/nodes/purple-shield.png`,
    evidenceId: 'cav-training-1',
    canonicalMeaning: null,
  },
  purpleHourglass: {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/icons/nodes/purple-hourglass.png`,
    evidenceId: 'cav-training-1',
    canonicalMeaning: null,
  },
  purpleHead: {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/icons/nodes/purple-head.png`,
    evidenceId: 'cav-training-2',
    canonicalMeaning: null,
  },
  purpleImpact: {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/icons/nodes/purple-impact.png`,
    evidenceId: 'cav-encounter-1',
    canonicalMeaning: null,
  },
  purpleMarching: {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/icons/nodes/purple-marching.png`,
    evidenceId: 'cav-encounter-1',
    canonicalMeaning: null,
  },
  purpleHelmet: {
    assetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/icons/nodes/purple-helmet.png`,
    evidenceId: 'cav-call-glory-1',
    canonicalMeaning: null,
  },
});

const LEGION_SKILL_EVIDENCE = {
  1: ['cav-legion-rescue', 'rescue-skills.png'],
  2: ['cav-legion-suppression', 'vanguards-suppression.png'],
  3: ['cav-legion-breakout', 'breakout.png'],
};

export const CAVALRY_SPECIALIZATION_LEGION_SKILLS = deepFreeze(
  Object.fromEntries(
    Object.entries(LEGION_SKILL_EVIDENCE).map(([columnId, [evidenceId, iconFilename]]) => {
      const canonical = SPECIALIZATION_LEGION_SKILLS[columnId]?.cavalry;
      if (!canonical) throw new Error(`Unknown canonical Cavalry Legion Skill column: ${columnId}`);
      return [
        Number(columnId),
        {
          id: `cavalry:column-${columnId}:legion-skill`,
          troopId: 'cavalry',
          column: Number(columnId),
          canonicalName: canonical.name,
          effect: canonical.desc,
          medalCost: 0,
          iconAssetPath: `${CAVALRY_SPECIALIZATION_ASSET_ROOT}/icons/legion-skills/${iconFilename}`,
          provenance: {
            canonicalValues: PLANNER_EVIDENCE.id,
            inGameConfirmation: evidenceId,
            icon: evidenceId,
          },
        },
      ];
    })
  )
);

export function getCavalrySpecializationResearch(id) {
  return typeof id === 'string' ? (CAVALRY_SPECIALIZATION_RESEARCH[id] ?? null) : null;
}
