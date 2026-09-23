// The export catalogue. Each entry pairs an id with the builder that produces its
// document. Filenames come from the builder, so the catalogue and the output can
// never drift apart.

import { dmCrafting, dmEnhancement } from './datasets/dm.mjs';
import {
  edenHonorBuildings,
  edenSiegeStructures,
  edenSpecialtyHonor,
  edenTileLevels,
} from './datasets/eden.mjs';
import { edenMapStructures } from './datasets/eden-map.mjs';
import { artifacts, combosAndCounters } from './datasets/extras.mjs';
import { heroesBySeason, skinCatalogue } from './datasets/heroes.mjs';
import { researchCosts } from './datasets/research.mjs';
import { specializationMedals, specializationTowers } from './datasets/specialization.mjs';

export const EXPORTS = Object.freeze([
  { id: 'research-costs', build: researchCosts },
  { id: 'unit-specialisation-medals', build: specializationMedals },
  { id: 'specialisation-towers', build: specializationTowers },
  { id: 'eden-honor-buildings', build: edenHonorBuildings },
  { id: 'eden-specialty-honor', build: edenSpecialtyHonor },
  { id: 'eden-siege-structures', build: edenSiegeStructures },
  { id: 'eden-tile-levels', build: edenTileLevels },
  { id: 'eden-map-structures', build: edenMapStructures },
  { id: 'dragon-master-enhancement', build: dmEnhancement },
  { id: 'dragon-master-crafting', build: dmCrafting },
  { id: 'heroes-by-season', build: heroesBySeason },
  { id: 'skin-catalogue', build: skinCatalogue },
  { id: 'artifacts', build: artifacts },
  { id: 'combos-and-counters', build: combosAndCounters },
]);
