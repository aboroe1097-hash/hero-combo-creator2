// App-awareness adapters: what the toolkit contains, what changed recently,
// and the canonical Specialization Towers and skin-tier datasets. All tools
// here are read-only, static-consent, and must never guess unknown values.
import { TOOLKIT_MAP, TOOLKIT_MAP_VERSION } from './toolkit-map.js';
import { VELO_CHANGELOG_DIGEST, VELO_CHANGELOG_DIGEST_VERSION } from './changelog-digest.js';
import {
  AiToolInputError,
  boundedInteger,
  boundedString,
  normalizeLookupToken,
  rejectUnknownArguments,
  requirePlainArguments,
} from './tool-utils.js';

export function getToolkitMapAdapter(rawArguments) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['query']);
  const query =
    args.query === undefined ? '' : boundedString(args.query, 'query', { maximum: 120 });
  const normalizedQuery = normalizeLookupToken(query);
  const tokens = normalizedQuery.split(' ').filter((token) => token.length > 1);

  const scored = TOOLKIT_MAP.map((entry) => {
    if (!tokens.length) return { entry, score: 1 };
    const haystack = normalizeLookupToken(
      [entry.name, entry.summary, ...entry.answers, ...entry.keywords].join(' ')
    );
    let score = haystack.includes(normalizedQuery) ? 6 : 0;
    for (const token of tokens) if (haystack.includes(token)) score += 1;
    return { entry, score };
  }).filter(({ score }) => score > 0);

  const selected = (scored.length ? scored : TOOLKIT_MAP.map((entry) => ({ entry, score: 0 })))
    .sort((left, right) => right.score - left.score)
    .map(({ entry }) => ({
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      hash: entry.hash || null,
      href: entry.href || null,
      summary: entry.summary,
      answers: [...entry.answers],
    }));

  return {
    data: {
      query: query || null,
      mapVersion: TOOLKIT_MAP_VERSION,
      tools: selected,
      noMatch: Boolean(tokens.length) && !scored.length,
    },
    meta: {
      sourceId: 'vts-toolkit-map',
      filters: { query: query || null },
      completeness: 'complete',
      warnings: ['Tab hashes open sections of index.html; page hrefs are standalone routes.'],
    },
  };
}

export function getWhatsNewAdapter(rawArguments) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['limit']);
  const limit =
    args.limit === undefined
      ? 5
      : boundedInteger(args.limit, 'limit', { minimum: 1, maximum: 10 });
  const releases = VELO_CHANGELOG_DIGEST.slice(0, limit).map((release) => ({
    version: release.version,
    date: release.date,
    highlights: [...release.highlights],
  }));

  return {
    data: {
      currentVersion: VELO_CHANGELOG_DIGEST_VERSION,
      releases,
    },
    meta: {
      sourceId: 'vts-changelog-digest',
      asOf: releases[0]?.date ?? null,
      filters: { limit },
      truncated: VELO_CHANGELOG_DIGEST.length > releases.length,
      completeness: 'complete',
      warnings: ['Highlights are release summaries, not the full changelog text.'],
    },
  };
}

function specializationResearchSummary(research) {
  return {
    id: research.id,
    name: research.name,
    column: research.column,
    medalCost: Number.isFinite(research.cost) ? research.cost : null,
    nodeCount: Array.isArray(research.nodes) ? research.nodes.length : 0,
  };
}

function specializationResearchDetail(research, legionSkills) {
  const milestones = research.skillMilestones || {};
  return {
    ...specializationResearchSummary(research),
    nodes: (research.nodes || []).map((node) => ({
      id: node.id,
      name: node.name,
      effect: node.effect || null,
      context: node.context || null,
    })),
    skillMilestones: Object.fromEntries(
      Object.entries(milestones).map(([troop, list]) => [
        troop,
        (list || []).map((milestone) => ({
          percent: milestone.percent,
          effect: milestone.effect,
        })),
      ])
    ),
    columnLegionSkills: legionSkills || null,
  };
}

export async function getSpecializationContextAdapter(rawArguments) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['kind', 'columnId', 'researchName']);
  const kind = boundedString(args.kind, 'kind', { maximum: 20 });
  if (!['overview', 'column', 'research'].includes(kind)) {
    throw new AiToolInputError(
      'malformed_arguments',
      'kind must be overview, column, or research.'
    );
  }
  const data = await import('../specialization-towers-v2-data.js');
  const columns = data.SPECIALIZATION_COLUMNS;
  const researches = data.SPECIALIZATION_RESEARCH;
  const legionSkills = data.SPECIALIZATION_LEGION_SKILLS;
  const warnings = [
    'Medal costs come from the verified community dataset; unknown values stay unknown and are never estimated.',
    'A Legion Skill unlocks free when all four researches in its column reach 100%.',
  ];

  if (kind === 'overview') {
    return {
      data: {
        columns: Object.entries(columns).map(([id, column]) => ({
          id: Number(id),
          name: column.name,
          unlockSeason: column.unlockSeason,
          totalMedalCost: Number.isFinite(column.totalCost) ? column.totalCost : null,
          researches: column.researches.map((researchId) =>
            specializationResearchSummary(researches[researchId])
          ),
          legionSkills: legionSkills[id] || null,
        })),
      },
      meta: {
        sourceId: 'specialization-towers-data',
        completeness: 'complete',
        filters: { kind },
        warnings,
      },
    };
  }

  if (kind === 'research') {
    const query = normalizeLookupToken(
      boundedString(args.researchName, 'researchName', { maximum: 80 })
    );
    const match = Object.values(researches).find(
      (research) =>
        normalizeLookupToken(research.name) === query ||
        normalizeLookupToken(research.id) === query
    );
    if (!match) {
      return {
        data: {
          researchName: args.researchName,
          found: false,
          availableResearches: Object.values(researches).map((research) => research.name),
        },
        meta: {
          sourceId: 'specialization-towers-data',
          completeness: 'unknown',
          filters: { kind, researchName: args.researchName },
          warnings: ['No research matched this name; use one of availableResearches.'],
        },
      };
    }
    return {
      data: {
        found: true,
        research: specializationResearchDetail(match, legionSkills[match.column] || null),
        unlockSeason: columns[match.column]?.unlockSeason ?? null,
      },
      meta: {
        sourceId: 'specialization-towers-data',
        completeness: 'complete',
        filters: { kind, researchName: args.researchName },
        warnings,
      },
    };
  }

  const columnId = boundedInteger(args.columnId, 'columnId', { minimum: 1, maximum: 8 });
  const column = columns[columnId];
  return {
    data: {
      column: {
        id: columnId,
        name: column.name,
        unlockSeason: column.unlockSeason,
        totalMedalCost: Number.isFinite(column.totalCost) ? column.totalCost : null,
        researches: column.researches.map((researchId) =>
          specializationResearchDetail(researches[researchId], null)
        ),
        legionSkills: legionSkills[columnId] || null,
      },
    },
    meta: {
      sourceId: 'specialization-towers-data',
      completeness: 'complete',
      filters: { kind, columnId },
      warnings,
    },
  };
}

export async function getSkinTierDetailsAdapter(rawArguments) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, []);
  const skins = await import('../skins-db.js');
  const tiers = (skins.getSkinTiers?.() ?? skins.SKIN_TIERS ?? []).map((tier) => ({
    id: tier.id,
    name: tier.name,
    rank: tier.rank ?? null,
    summary: tier.summary,
    hasPreserving: tier.hasPreserving === true,
    star1: tier.star1 ?? null,
    star1To2: tier.star1To2 ?? null,
    star2To3: tier.star2To3 ?? null,
    maximizeTotal: tier.maximizeTotal ?? null,
    acquisition: Array.isArray(tier.acquisition) ? [...tier.acquisition] : [],
  }));

  return {
    data: { tiers },
    meta: {
      sourceId: 'skin-atlas-tiers',
      completeness: tiers.length ? 'complete' : 'unknown',
      filters: {},
      warnings: [
        'Star-up costs are the verified catalog values; per-hero availability comes from get_hero_details.',
      ],
    },
  };
}
