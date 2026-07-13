import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RESEARCH_FRAME_ATLAS,
  RESEARCH_GAME_ART,
  RESEARCH_GAME_ART_GAPS,
  getResearchFrameArt,
  getResearchNodeArt,
} from '../js/research-game-art.js';
import { RESEARCH_GAME_LAYOUTS } from '../js/research-game-layouts.js';
import { techDatabase } from '../js/tech-db.js';
import { findMissingBuffValueNodes } from '../js/research-buffs.js';
import { validateResearchContracts } from './lib/research-contracts.mjs';

const COST_FIELDS = ['costs', 'wisdomCosts', 'courageCosts', 'wb_costs', 'cm_costs'];
const issues = [];
const strictBuffs = process.argv.includes('--strict-buffs');
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

for (const tech of techDatabase) {
  for (const node of tech.nodes || []) {
    for (const field of COST_FIELDS) {
      const values = node[field];
      if (!Array.isArray(values) || values.length === 0) continue;
      if (values.length < node.maxLevel) {
        issues.push(
          `${tech.id || tech.name}.${node.id || node.name}.${field} has ${values.length}/${node.maxLevel} levels`
        );
      }
    }
  }
}

const researchContracts = validateResearchContracts({
  techDatabase,
  layouts: RESEARCH_GAME_LAYOUTS,
  art: RESEARCH_GAME_ART,
  frameAtlas: RESEARCH_FRAME_ATLAS,
  artGaps: RESEARCH_GAME_ART_GAPS,
  getResearchNodeArt,
  getResearchFrameArt,
  persistenceSource: readFileSync(resolve(repoRoot, 'js/app-research.js'), 'utf8'),
  repoRoot,
});
issues.push(...researchContracts.issues);

const missingS0Buffs = findMissingBuffValueNodes(techDatabase, { seasons: ['S0'] });
if (missingS0Buffs.length) {
  const message = `${missingS0Buffs.length} S0 multi-level nodes are missing quantitative buff values.`;
  if (strictBuffs) {
    issues.push(message);
  } else {
    console.warn(`Tech database warning: ${message}`);
    console.warn(
      'Add buffStats metadata to js/tech-db.js for exact S0 node values, or run with --strict-buffs to fail this check.'
    );
    missingS0Buffs.slice(0, 12).forEach(({ tech, node }) => {
      console.warn(`- ${tech.name}.${node.name}: "${node.buff}" (${node.maxLevel} levels)`);
    });
    if (missingS0Buffs.length > 12) {
      console.warn(`- ...and ${missingS0Buffs.length - 12} more`);
    }
  }
}

if (issues.length) {
  console.error('Tech database check failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  console.error('Fix the source data instead of normalizing it at runtime.');
  process.exit(1);
}

console.log(
  `Tech database check passed: ${techDatabase.length} tech trees, ` +
    `${researchContracts.stats.layoutTreeCount} exact-source layouts, ` +
    `${researchContracts.stats.artNodeCount} exact node-art mappings, and ` +
    `${researchContracts.stats.missingNodeCount} declared node-art gaps.`
);
