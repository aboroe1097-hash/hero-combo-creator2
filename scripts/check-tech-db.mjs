import { techDatabase } from '../js/tech-db.js';
import { findMissingBuffValueNodes } from '../js/research-buffs.js';

const COST_FIELDS = ['costs', 'wisdomCosts', 'courageCosts', 'wb_costs', 'cm_costs'];
const issues = [];
const strictBuffs = process.argv.includes('--strict-buffs');

for (const tech of techDatabase) {
  for (const node of tech.nodes || []) {
    for (const field of COST_FIELDS) {
      const values = node[field];
      if (!Array.isArray(values) || values.length === 0) continue;
      if (values.length < node.maxLevel) {
        issues.push(`${tech.id || tech.name}.${node.id || node.name}.${field} has ${values.length}/${node.maxLevel} levels`);
      }
    }
  }
}

const missingS0Buffs = findMissingBuffValueNodes(techDatabase, { seasons: ['S0'] });
if (missingS0Buffs.length) {
  const message = `${missingS0Buffs.length} S0 multi-level nodes are missing quantitative buff values.`;
  if (strictBuffs) {
    issues.push(message);
  } else {
    console.warn(`Tech database warning: ${message}`);
    console.warn('Add buffStats metadata to js/tech-db.js for exact S0 node values, or run with --strict-buffs to fail this check.');
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

console.log(`Tech database check passed: ${techDatabase.length} tech trees.`);
