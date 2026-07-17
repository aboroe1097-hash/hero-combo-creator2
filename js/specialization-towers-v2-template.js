// js/specialization-towers-v2-template.js
// Builds the community contribution template (one row per node) so people can
// fill in the exact medal cost of each Specialization node directly. Derived
// from the verified dataset; no game data is defined here.

import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_CONTRIBUTION_TEMPLATE_VERSION,
} from './specialization-towers-v2-data.js';

const RESEARCH_IDS = Object.values(SPECIALIZATION_RESEARCH)
  .slice()
  .sort(
    (left, right) =>
      Number(left.column) - Number(right.column) ||
      Number(left.sequence) - Number(right.sequence) ||
      String(left.id).localeCompare(String(right.id))
  )
  .map((research) => research.id);

export const CONTRIBUTION_TEMPLATE_HEADERS = Object.freeze([
  'template_version',
  'season',
  'column',
  'research_id',
  'research_name',
  'node_position',
  'node_id',
  'node_name',
  'current_effect',
  'footman_effect',
  'archer_effect',
  'cavalry_effect',
  'medal_cost',
  'initial_visibility',
  'prerequisite_node_ids',
  'contributor',
  'verification_status',
  'notes',
]);

function nodeEffectForTroop(node, troopId) {
  const override = node.troopSpecific?.[troopId];
  return override?.effect || override?.desc || node.effect || node.desc || '';
}

function initialVisibility(research, node) {
  if (Array.isArray(node?.prerequisiteNodeIds)) {
    if (node.prerequisiteNodeIds.length === 0) return 'available';
    return node.visibleWhenLocked ? 'visible_locked' : 'hidden_until_prerequisites';
  }
  if (node?.visibleWhenLocked) return 'visible_locked';
  return research?.progressiveReveal ? 'hidden_unverified' : '';
}

export function buildContributionTemplateRows() {
  const rows = [];
  for (const researchId of RESEARCH_IDS) {
    const research = SPECIALIZATION_RESEARCH[researchId];
    const column = SPECIALIZATION_COLUMNS[research.column];
    research.nodes.forEach((node, index) => {
      rows.push([
        SPECIALIZATION_CONTRIBUTION_TEMPLATE_VERSION,
        column.unlockSeason,
        research.column,
        research.id,
        research.name,
        index + 1,
        node.id,
        node.name,
        node.effect || '',
        nodeEffectForTroop(node, 'footman'),
        nodeEffectForTroop(node, 'archer'),
        nodeEffectForTroop(node, 'cavalry'),
        '',
        initialVisibility(research, node),
        Array.isArray(node.prerequisiteNodeIds) ? node.prerequisiteNodeIds.join('|') : '',
        '',
        'unverified',
        '',
      ]);
    });
    if (research.passiveSkillNodeId !== null && research.passiveSkillNodeId !== undefined) {
      rows.push([
        SPECIALIZATION_CONTRIBUTION_TEMPLATE_VERSION,
        column.unlockSeason,
        research.column,
        research.id,
        research.name,
        research.nodes.length + 1,
        research.passiveSkillNodeId,
        'Passive Skill',
        '',
        research.passiveSkill?.footman?.effect || '',
        research.passiveSkill?.archer?.effect || '',
        research.passiveSkill?.cavalry?.effect || '',
        '',
        '',
        '',
        '',
        'unverified',
        '',
      ]);
    }
  }
  return { headers: CONTRIBUTION_TEMPLATE_HEADERS.slice(), rows };
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function buildContributionTemplateCsv() {
  const { headers, rows } = buildContributionTemplateRows();
  const bom = String.fromCharCode(0xfeff);
  return `${bom}${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}
