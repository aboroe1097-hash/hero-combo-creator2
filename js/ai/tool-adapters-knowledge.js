import { VTS_GUIDE_KNOWLEDGE, VTS_GUIDE_KNOWLEDGE_VERSION } from './vts-guide-knowledge.js';
import {
  boundedInteger,
  boundedString,
  normalizeLookupToken,
  rejectUnknownArguments,
  requirePlainArguments,
} from './tool-utils.js';

function queryTokens(value) {
  return [
    ...new Set(
      normalizeLookupToken(value)
        .split(' ')
        .filter((token) => token.length > 1)
    ),
  ];
}

function searchableText(entry) {
  return normalizeLookupToken(
    [
      entry.topic,
      entry.title,
      entry.season,
      entry.phase,
      entry.targetSeason,
      entry.summary,
      ...entry.guidance,
      ...entry.tags,
    ].join(' ')
  );
}

function entrySeasonLabels(entry) {
  const phaseLabels = String(entry.phase || '').match(/\b(?:S|X)\d+\b/giu) || [];
  return new Set(
    [entry.season, entry.targetSeason, ...phaseLabels]
      .filter(Boolean)
      .map((value) => String(value).toUpperCase())
  );
}

function relevance(entry, normalizedQuery, tokens) {
  const haystack = searchableText(entry);
  const haystackTokens = new Set(queryTokens(haystack));
  const titleTokens = new Set(queryTokens(entry.title));
  const tagTokens = new Set(entry.tags.flatMap((tag) => queryTokens(tag)));
  let score = haystack.includes(normalizedQuery) ? 12 : 0;
  for (const token of tokens) {
    if (titleTokens.has(token)) score += 5;
    if (tagTokens.has(token)) score += 4;
    if (haystackTokens.has(token)) score += 1;
  }
  return score;
}

function publicEntry(entry) {
  return {
    id: entry.id,
    topic: entry.topic,
    title: entry.title,
    season: entry.season,
    phase: entry.phase || null,
    targetSeason: entry.targetSeason || null,
    sourceDate: entry.sourceDate,
    status: entry.status,
    requiresCurrentConfirmation: entry.requiresCurrentConfirmation,
    summary: entry.summary,
    guidance: [...entry.guidance],
  };
}

export function getVtsGuideContextAdapter(rawArguments) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['query', 'season', 'limit']);
  const query = boundedString(args.query, 'query', { maximum: 120 });
  const normalizedQuery = normalizeLookupToken(query);
  const tokens = queryTokens(query);
  const season =
    args.season === undefined
      ? null
      : boundedString(args.season, 'season', { maximum: 20 }).toUpperCase();
  const limit =
    args.limit === undefined ? 3 : boundedInteger(args.limit, 'limit', { minimum: 1, maximum: 5 });

  const ranked = VTS_GUIDE_KNOWLEDGE.map((entry, index) => ({
    entry,
    index,
    score: relevance(entry, normalizedQuery, tokens),
  }))
    .filter(({ entry, score }) => score > 0 && (!season || entrySeasonLabels(entry).has(season)))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.entry.sourceDate.localeCompare(left.entry.sourceDate) ||
        left.index - right.index
    );
  const selected = ranked.slice(0, limit).map(({ entry }) => publicEntry(entry));
  const warnings = [
    'Guide entries are curated public extracts, not live orders.',
    ...(selected.some((entry) => entry.requiresCurrentConfirmation)
      ? [
          'Confirm dated strategy or policy against the latest in-game mail or leadership announcement.',
        ]
      : []),
  ];

  return {
    data: {
      query,
      season,
      knowledgeVersion: VTS_GUIDE_KNOWLEDGE_VERSION,
      entries: selected,
      noMatch: selected.length === 0,
      availableTopics: VTS_GUIDE_KNOWLEDGE.map((entry) => entry.topic),
    },
    meta: {
      sourceId: 'vts-curated-guide-knowledge',
      asOf: selected.reduce(
        (latest, entry) => (!latest || entry.sourceDate > latest ? entry.sourceDate : latest),
        null
      ),
      filters: { query, season, limit },
      truncated: ranked.length > selected.length,
      completeness: selected.length > 0 ? 'partial' : 'unknown',
      warnings,
    },
  };
}
