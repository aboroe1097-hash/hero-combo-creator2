const SOURCE_LABEL_KEYS = Object.freeze({
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
});

function sourceLabelKey(sourceId, tool) {
  if (SOURCE_LABEL_KEYS[sourceId]) return SOURCE_LABEL_KEYS[sourceId];
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

export function deriveDeterministicActions(results, translate = (_key, fallback) => fallback) {
  const actions = [];
  const sources = deriveExecutedSources(results, translate);
  const ids = sources.map((source) => source.sourceId.toLowerCase()).join(' ');
  const tools = (Array.isArray(results) ? results : [])
    .filter((result) => result?.ok)
    .map((result) => String(result.name || result.meta?.tool || '').toLowerCase())
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
