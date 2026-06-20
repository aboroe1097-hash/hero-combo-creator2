import { techDatabase } from '../js/tech-db.js';

const COST_FIELDS = ['costs', 'wisdomCosts', 'courageCosts', 'wb_costs', 'cm_costs'];
const issues = [];

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

if (issues.length) {
  console.error('Tech database check failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  console.error('Fix the source data instead of normalizing it at runtime.');
  process.exit(1);
}

console.log(`Tech database check passed: ${techDatabase.length} tech trees.`);
