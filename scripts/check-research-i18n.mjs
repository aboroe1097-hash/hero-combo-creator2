import { auditResearchPack, deriveResearchEffectLabel } from '../js/i18n/research/index.js';
import { getNodeBuffEffects } from '../js/research-buffs.js';
import { techDatabase } from '../js/tech-db.js';

const locales = ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh'];
const errors = [];

for (const locale of locales) {
  const module = await import(`../js/i18n/research/${locale}.js`);
  const pack = module.default || module.researchContent;
  const audit = auditResearchPack(pack, techDatabase);
  if (!audit.complete) {
    errors.push(
      `${locale}: missing ${audit.missingTrees.length} trees and ${audit.missingNodes.length} compound nodes`
    );
  }

  const missingPages = [];
  const missingEffects = [];
  for (const tech of techDatabase) {
    const canonicalPages = Array.isArray(tech.treePages) ? tech.treePages : [];
    const localizedPages = pack?.trees?.[tech.id]?.pages;
    if (
      canonicalPages.length > 0 &&
      (!Array.isArray(localizedPages) ||
        localizedPages.length !== canonicalPages.length ||
        localizedPages.some((page) => !String(page || '').trim()))
    ) {
      missingPages.push(tech.id);
    }

    for (const node of tech.nodes || []) {
      const canonicalEffects = getNodeBuffEffects(node);
      if (!canonicalEffects.length) continue;
      const nodeKey = `${tech.id}:${node.id}`;
      const localizedEffects = pack?.nodes?.[nodeKey]?.effects;
      const explicitEffectsComplete =
        Array.isArray(localizedEffects) &&
        localizedEffects.length === canonicalEffects.length &&
        localizedEffects.every((effect) => String(effect || '').trim());
      const derivedEffect = deriveResearchEffectLabel(pack?.nodes?.[nodeKey]?.buff, locale);
      if (!explicitEffectsComplete && !derivedEffect) {
        missingEffects.push(nodeKey);
      }
    }
  }

  if (missingPages.length || missingEffects.length) {
    errors.push(
      `${locale}: missing or incomplete ${missingPages.length} tree page sets and ${missingEffects.length} parsed buff-effect label sets`
    );
  }
}

if (errors.length) {
  console.error('Research i18n coverage failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Research i18n coverage passed: ${techDatabase.length} trees across ${locales.length} non-English locales.`
);
