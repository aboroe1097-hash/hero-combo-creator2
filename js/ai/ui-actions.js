export const SOURCE_LABEL_KEYS = Object.freeze({
  'heroes-db': 'ai.source.heroAtlas',
  'hero-atlas': 'ai.source.heroAtlas',
  'combos-db': 'ai.source.comboRankings',
  'combo-rankings': 'ai.source.comboRankings',
  'counter-db': 'ai.source.counters',
  'combo-counters': 'ai.source.counters',
  'strife-db': 'ai.source.strife',
  'strife-recommendations': 'ai.source.strife',
  'materials-plan': 'ai.source.materials',
  'material-plan': 'ai.source.materials',
  'research-db': 'ai.source.research',
  'research-context': 'ai.source.research',
  'eden-context': 'ai.source.eden',
  'vts-public-player-tags': 'ai.source.vtsPlayers',
  'competition-schedule': 'ai.source.competition',
  'my-competition': 'ai.source.myCompetition',
  'building-upgrades': 'ai.source.buildings',
  'eden-operations': 'ai.source.edenOperations',
});

// Every tool's source label, used when a result's sourceId has no entry above.
// tests/unit/velo-tool-parity.test.mjs keeps this in step with the registry and
// checks each label in all 13 locales.
export const TOOL_SOURCE_LABEL_KEYS = Object.freeze({
  get_hero_details: 'ai.source.heroAtlas',
  get_vts_player_context: 'ai.source.vtsPlayers',
  get_vts_guide_context: 'ai.source.guide',
  get_combo_recommendations: 'ai.source.comboRankings',
  get_combo_counters: 'ai.source.counters',
  get_strife_recommendations: 'ai.source.strife',
  get_material_plan_summary: 'ai.source.materials',
  calculate_dm_materials: 'ai.source.materials',
  get_research_context: 'ai.source.research',
  estimate_research_eta: 'ai.source.research',
  calculate_eden_loyalty: 'ai.source.eden',
  calculate_eden_upgrade_materials: 'ai.source.eden',
  get_eden_context: 'ai.source.eden',
  get_admin_context: 'ai.source.admin',
  get_toolkit_map: 'ai.source.toolkit',
  get_whats_new: 'ai.source.releaseNotes',
  get_specialization_context: 'ai.source.specialization',
  get_skin_tier_details: 'ai.source.skinTiers',
  get_arcade_leaderboard: 'ai.source.arcade',
  get_all_star_boh_mechanics: 'ai.source.allStarBoh',
  get_vts_score_mechanics: 'ai.source.vtsScore',
  get_competition_status: 'ai.source.competition',
  get_building_costs: 'ai.source.buildings',
  get_eden_operations: 'ai.source.edenOperations',
  get_my_competition: 'ai.source.myCompetition',
});

const SOURCE_LABEL_FALLBACKS = Object.freeze({
  'ai.source.heroAtlas': 'Hero Atlas',
  'ai.source.comboRankings': 'Combo Rankings',
  'ai.source.counters': 'Combo Counters',
  'ai.source.strife': 'Strife',
  'ai.source.materials': 'DM Materials',
  'ai.source.research': 'Research',
  'ai.source.eden': 'Eden X1',
  'ai.source.vtsPlayers': 'VTS Public Players',
  'ai.source.selectedHeroes': 'Selected Heroes',
  'ai.source.skins': 'Skin Ownership',
  'ai.source.competition': 'Competition #12 schedule',
  'ai.source.myCompetition': 'My Competition #12',
  'ai.source.buildings': 'Buildings planner',
  'ai.source.edenOperations': 'Eden Operations Lab',
});

// Real routes for the answer buttons. Index-page targets are hub sub-tabs.
export const VELO_ACTION_ROUTES = Object.freeze({
  vtsScore: 'vtsscore.html',
  buildings: 'index.html#researchTowers?subtab=buildings',
  edenPathing: 'index.html#edenHub?subtab=pathing',
  operationsLab: 'index.html#edenHub?subtab=operations',
  complaints: 'eden-x2.html#edenX1Complaints',
});

const ROUTE_ACTIONS = Object.freeze({
  vtsScore: ['ai.action.openVtsScore', 'Open VtsScore'],
  buildings: ['ai.action.openBuildings', 'Open Buildings planner'],
  edenPathing: ['ai.action.openEdenPathing', 'Open Eden Pathing'],
  operationsLab: ['ai.action.openOperationsLab', 'Open Operations Lab'],
  complaints: ['ai.action.openComplaints', 'Open the complaint form'],
});

// A toolkit-map answer whose best match is one of these offers its button.
const TOOLKIT_ROUTE_ACTIONS = Object.freeze({
  vtsScore: 'vtsScore',
  buildings: 'buildings',
  edenPathing: 'edenPathing',
  edenOperations: 'operationsLab',
  complaints: 'complaints',
});

function routeAction(id, translate) {
  const [key, fallback] = ROUTE_ACTIONS[id];
  return { type: 'navigate-page', href: VELO_ACTION_ROUTES[id], label: translate(key, fallback) };
}

function sourceLabelKey(sourceId, tool) {
  if (SOURCE_LABEL_KEYS[sourceId]) return SOURCE_LABEL_KEYS[sourceId];
  if (TOOL_SOURCE_LABEL_KEYS[tool]) return TOOL_SOURCE_LABEL_KEYS[tool];
  const value = `${sourceId || ''} ${tool || ''}`.toLowerCase();
  if (value.includes('counter')) return 'ai.source.counters';
  if (value.includes('combo')) return 'ai.source.comboRankings';
  if (value.includes('hero')) return 'ai.source.heroAtlas';
  if (value.includes('strife')) return 'ai.source.strife';
  if (value.includes('material')) return 'ai.source.materials';
  if (value.includes('research')) return 'ai.source.research';
  if (value.includes('eden')) return 'ai.source.eden';
  if (value.includes('vts') && value.includes('player')) return 'ai.source.vtsPlayers';
  return '';
}

export function deriveExecutedSources(results, translate = (_key, fallback) => fallback) {
  const unique = new Map();
  for (const result of Array.isArray(results) ? results : []) {
    if (!result?.ok || !result.meta?.sourceId) continue;
    const sourceId = String(result.meta.sourceId);
    const key = sourceLabelKey(sourceId, result.meta.tool || result.name);
    if (!key || unique.has(sourceId)) continue;
    unique.set(sourceId, {
      sourceId,
      evidenceId: result.meta.evidenceId || null,
      label: translate(key, SOURCE_LABEL_FALLBACKS[key] || sourceId),
    });
  }
  return Array.from(unique.values());
}

function findLineup(value, depth = 0) {
  if (depth > 5 || value == null) return null;
  if (Array.isArray(value)) {
    if (value.length === 3 && value.every((entry) => typeof entry === 'string' && entry.trim())) {
      return value.map((entry) => entry.trim());
    }
    for (const item of value) {
      const found = findLineup(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  for (const key of [
    'heroes',
    'lineup',
    'formation',
    'recommendedHeroes',
    'recommendations',
    'combos',
    'results',
  ]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const found = findLineup(value[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export function extractProposedLineup(results) {
  for (const result of Array.isArray(results) ? results : []) {
    if (!result?.ok || !/combo/i.test(String(result.name || result.meta?.tool || ''))) continue;
    const lineup = findLineup(result.data);
    if (lineup) return lineup;
  }
  return null;
}

/** Route buttons for the post-1.0 tools, in the order they should appear. */
function deriveRouteActions(results) {
  const ids = [];
  for (const result of Array.isArray(results) ? results : []) {
    if (!result?.ok) continue;
    const name = String(result.name || result.meta?.tool || '');
    if (name === 'get_competition_status' || name === 'get_my_competition') ids.push('vtsScore');
    else if (name === 'get_building_costs') ids.push('buildings');
    else if (name === 'get_eden_operations') {
      ids.push(result.data?.kind === 'pathing_rule' ? 'edenPathing' : 'operationsLab');
    } else if (name === 'get_toolkit_map' && !result.data?.noMatch && result.data?.query) {
      const top = TOOLKIT_ROUTE_ACTIONS[result.data?.tools?.[0]?.id];
      if (top) ids.push(top);
    }
  }
  return [...new Set(ids)];
}

export function deriveDeterministicActions(results, translate = (_key, fallback) => fallback) {
  const routeIds = deriveRouteActions(results);
  const actions = routeIds.map((id) => routeAction(id, translate));
  const sources = deriveExecutedSources(results, translate);
  // The Operations Lab and Pathing are Eden tools but have their own buttons;
  // they must not also offer the Eden X1 page.
  const ids = sources
    .map((source) => source.sourceId.toLowerCase())
    .filter((id) => id !== 'eden-operations')
    .join(' ');
  const tools = (Array.isArray(results) ? results : [])
    .filter((result) => result?.ok)
    .map((result) => String(result.name || result.meta?.tool || '').toLowerCase())
    .filter((name) => name !== 'get_eden_operations')
    .join(' ');
  const haystack = `${ids} ${tools}`;

  if (haystack.includes('hero')) {
    actions.push({
      type: 'navigate',
      tab: 'heroes',
      label: translate('ai.action.openHeroAtlas', 'Open Hero Atlas'),
    });
  }
  if (haystack.includes('research')) {
    actions.push({
      type: 'navigate',
      tab: 'research',
      label: translate('ai.action.openResearch', 'Open Research'),
    });
  }
  if (haystack.includes('material')) {
    actions.push({
      type: 'navigate',
      tab: 'materials',
      label: translate('ai.action.openMaterials', 'Open Materials'),
    });
  }
  if (haystack.includes('strife')) {
    actions.push({
      type: 'navigate',
      tab: 'strife',
      label: translate('ai.action.openStrife', 'Open Strife'),
    });
  }
  if (haystack.includes('loyalty')) {
    actions.push({
      type: 'navigate',
      tab: 'loyalty',
      label: translate('ai.action.openLoyalty', 'Open Loyalty Calculator'),
    });
  }
  if (haystack.includes('eden')) {
    actions.push({
      type: 'navigate-page',
      href: 'eden-x1.html',
      label: translate('ai.action.openEden', 'Open Eden X1'),
    });
  }

  const lineup = extractProposedLineup(results);
  if (lineup) {
    actions.unshift({
      type: 'use-generator',
      heroes: lineup,
      label: translate('ai.action.useGenerator', 'Use in Generator'),
    });
  }
  return actions.slice(0, 3);
}

export function deriveSetupActions(results, translate = (_key, fallback) => fallback) {
  const actions = [];
  const seen = new Set();
  for (const result of Array.isArray(results) ? results : []) {
    if (result?.ok) continue;
    const setup = result?.error?.setupAction;
    const code = String(result?.error?.code || '');
    let tab = '';
    let key = '';
    let fallback = '';
    if (setup?.tab) {
      tab = setup.tab;
      key = setup.labelKey || '';
      fallback = setup.label || `Open ${tab}`;
    } else if (/selected|generator|roster/i.test(code)) {
      tab = 'generator';
      key = 'ai.setup.generator';
      fallback = 'Set up selected heroes';
    } else if (/material|plan/i.test(code)) {
      tab = 'materials';
      key = 'ai.setup.materials';
      fallback = 'Set up a DM plan';
    } else if (/research|progress/i.test(code)) {
      tab = 'research';
      key = 'ai.setup.research';
      fallback = 'Set up research progress';
    } else if (/skin/i.test(code)) {
      tab = 'generator';
      key = 'ai.setup.skins';
      fallback = 'Set up skin ownership';
    }
    if (!tab || seen.has(tab)) continue;
    seen.add(tab);
    actions.push({ type: 'navigate', tab, label: translate(key, fallback) });
  }
  return actions.slice(0, 2);
}

export function deriveContextualActions(text, translate = (_key, fallback) => fallback) {
  const answer = String(text || '');
  if (!/combo generator/i.test(answer)) return [];
  return [
    {
      type: 'navigate',
      tab: 'generator',
      label: translate('ai.action.openGenerator', 'Open Combo Generator'),
    },
  ];
}

export async function readCurrentGeneratorSelection() {
  const state = await import('../state.js');
  return Array.from(state.generatorSelectedHeroes || []);
}

export async function applyConfirmedGeneratorSelection(heroes) {
  const safeHeroes = Array.from(
    new Set(Array.isArray(heroes) ? heroes.filter((hero) => typeof hero === 'string') : [])
  ).slice(0, 3);
  if (safeHeroes.length !== 3) throw new Error('A Generator lineup requires exactly three heroes.');
  const state = await import('../state.js');
  const generator = await import('../app-generator.js');
  state.generatorSelectedHeroes.clear();
  safeHeroes.forEach((hero) => state.generatorSelectedHeroes.add(hero));
  generator.markGeneratorSelectionChanged({ immediate: true });
  generator.renderGeneratorHeroes();
  globalThis.vtsSwitchTab?.('generator', true, { scrollToSection: true });
  return safeHeroes;
}
