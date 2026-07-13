import {
  AI_LIMITS,
  AI_TOOL_GROUPS,
  isPlainObject,
  normalizeAllowedToolGroups,
} from './contracts.js';
import {
  getComboCountersAdapter,
  getComboRecommendationsAdapter,
  getHeroDetailsAdapter,
  getStrifeRecommendationsAdapter,
} from './tool-adapters-strategy.js';
import {
  calculateDmMaterialsAdapter,
  calculateEdenUpgradeMaterialsAdapter,
  calculateEdenLoyaltyAdapter,
  estimateResearchEtaAdapter,
  getEdenContextAdapter,
  getMaterialPlanSummaryAdapter,
  getResearchContextAdapter,
} from './tool-adapters-planning.js';
import { getVtsPlayerContextAdapter } from './tool-adapters-community.js';
import { getVtsGuideContextAdapter } from './tool-adapters-knowledge.js';
import { getAdminContextAdapter } from './tool-adapters-admin.js';
import { createToolError, createToolSuccess } from './tool-envelope.js';
import { AiToolInputError } from './tool-utils.js';

const DEFINITIONS = {
  get_hero_details: {
    execute: getHeroDetailsAdapter,
    requiredGroups: () => [AI_TOOL_GROUPS.STATIC],
  },
  get_vts_player_context: {
    execute: getVtsPlayerContextAdapter,
    requiredGroups: () => [AI_TOOL_GROUPS.STATIC],
  },
  get_vts_guide_context: {
    execute: getVtsGuideContextAdapter,
    requiredGroups: () => [AI_TOOL_GROUPS.STATIC],
  },
  get_combo_recommendations: {
    execute: getComboRecommendationsAdapter,
    requiredGroups: (args) => [
      AI_TOOL_GROUPS.STATIC,
      ...(args?.useSelectedHeroes === true ? [AI_TOOL_GROUPS.SELECTED_HEROES] : []),
      ...(args?.useExplicitSkins === true ? [AI_TOOL_GROUPS.EXPLICIT_SKINS] : []),
    ],
  },
  get_combo_counters: {
    execute: getComboCountersAdapter,
    requiredGroups: (args) => [
      AI_TOOL_GROUPS.STATIC,
      ...(args?.ownedOnly === true ? [AI_TOOL_GROUPS.SELECTED_HEROES] : []),
    ],
  },
  get_strife_recommendations: {
    execute: getStrifeRecommendationsAdapter,
    requiredGroups: (args) => [
      AI_TOOL_GROUPS.STATIC,
      ...(args?.ownedOnly === true ? [AI_TOOL_GROUPS.SELECTED_HEROES] : []),
    ],
  },
  get_material_plan_summary: {
    execute: getMaterialPlanSummaryAdapter,
    requiredGroups: () => [AI_TOOL_GROUPS.STATIC, AI_TOOL_GROUPS.DM_PLAN],
  },
  calculate_dm_materials: {
    execute: calculateDmMaterialsAdapter,
    requiredGroups: () => [AI_TOOL_GROUPS.STATIC],
  },
  get_research_context: {
    execute: getResearchContextAdapter,
    requiredGroups: (args) => [
      AI_TOOL_GROUPS.STATIC,
      ...(args?.includeUserProgress === true ? [AI_TOOL_GROUPS.RESEARCH_PROGRESS] : []),
    ],
  },
  estimate_research_eta: {
    execute: estimateResearchEtaAdapter,
    requiredGroups: () => [AI_TOOL_GROUPS.STATIC, AI_TOOL_GROUPS.RESEARCH_PROGRESS],
  },
  calculate_eden_loyalty: {
    execute: calculateEdenLoyaltyAdapter,
    requiredGroups: () => [AI_TOOL_GROUPS.STATIC],
  },
  calculate_eden_upgrade_materials: {
    execute: calculateEdenUpgradeMaterialsAdapter,
    requiredGroups: () => [AI_TOOL_GROUPS.STATIC],
  },
  get_eden_context: {
    execute: getEdenContextAdapter,
    requiredGroups: () => [AI_TOOL_GROUPS.STATIC],
  },
  get_admin_context: {
    execute: getAdminContextAdapter,
    requiredGroups: () => [AI_TOOL_GROUPS.STATIC, AI_TOOL_GROUPS.ADMIN_DASHBOARD],
  },
};

export const AI_TOOL_EXECUTORS = Object.freeze(
  Object.fromEntries(
    Object.entries(DEFINITIONS).map(([name, definition]) => [name, definition.execute])
  )
);

export const AI_TOOL_NAMES = Object.freeze(Object.keys(DEFINITIONS));

export const AI_TOOL_DECLARATIONS = Object.freeze([
  Object.freeze({
    name: 'get_admin_context',
    description:
      'Read a bounded admin dashboard summary or exact private-roster name lookup after explicit consent and verified Firebase admin authentication.',
    parameters: Object.freeze({
      type: 'object',
      required: ['kind'],
      properties: {
        kind: { type: 'string', enum: ['summary', 'roster_lookup'] },
        names: { type: 'array', minItems: 1, maxItems: 12, items: { type: 'string' } },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'get_hero_details',
    description: 'Get canonical hero, placement, available skill, and catalog skin evidence.',
    parameters: Object.freeze({
      type: 'object',
      required: ['names'],
      properties: {
        names: { type: 'array', minItems: 1, maxItems: 12, items: { type: 'string' } },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'get_vts_player_context',
    description:
      'Get public VTS 1097 player and leadership labels, including known public nicknames.',
    parameters: Object.freeze({
      type: 'object',
      required: ['names'],
      properties: {
        names: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'string' } },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'get_vts_guide_context',
    description:
      'Search curated public VTS guide knowledge. Results include gameplay phase, target season, source dates, and whether current leadership confirmation is required.',
    parameters: Object.freeze({
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 120 },
        season: { type: 'string', minLength: 1, maxLength: 20 },
        limit: { type: 'integer', minimum: 1, maximum: 5 },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'get_combo_recommendations',
    description:
      'Get ordered ranked or non-overlapping Front/Middle/Back formations, optionally requiring named heroes or the current Combo Generator selection.',
    parameters: Object.freeze({
      type: 'object',
      properties: {
        filters: {
          type: 'object',
          properties: {
            seasons: { type: 'array', minItems: 1, maxItems: 12, items: { type: 'string' } },
            troops: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string' } },
            heroes: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string' } },
            states: {
              type: 'array',
              minItems: 1,
              maxItems: 2,
              items: { type: 'string', enum: ['Free', 'Paid'] },
            },
          },
          additionalProperties: false,
        },
        mode: { type: 'string', enum: ['ranked', 'non_overlap'] },
        useSelectedHeroes: { type: 'boolean' },
        useExplicitSkins: { type: 'boolean' },
        spendTier: { type: 'string', enum: ['small', 'medium', 'large', 'ultra'] },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'get_combo_counters',
    description: 'Look up exact evidence for one three-hero target formation.',
    parameters: Object.freeze({
      type: 'object',
      required: ['targetHeroes'],
      properties: {
        targetHeroes: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
        ownedOnly: { type: 'boolean' },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'get_strife_recommendations',
    description: 'Get monster skills and supported S0-X2 Strife formations.',
    parameters: Object.freeze({
      type: 'object',
      required: ['monster', 'season'],
      properties: {
        monster: { type: 'string' },
        season: { type: 'string' },
        tier: { type: 'string', enum: ['all', 'f2p', 'p2w'] },
        ownedOnly: { type: 'boolean' },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'get_material_plan_summary',
    description:
      'Summarize the consented saved Dragon Master plan, including exact per-piece/per-set costs and current shortfalls.',
    parameters: Object.freeze({ type: 'object', properties: {}, additionalProperties: false }),
  }),
  Object.freeze({
    name: 'calculate_dm_materials',
    description:
      'Calculate exact Dragon Master resource and diamond/gem requirements from an explicit route and number of sets or pieces; no saved personal data is required.',
    parameters: Object.freeze({
      type: 'object',
      required: ['route', 'normalGearOwned'],
      properties: {
        route: { type: 'string', enum: ['blue', 'purple', 'gold'] },
        sets: { type: 'integer', minimum: 1, maximum: 5 },
        pieces: { type: 'integer', minimum: 1, maximum: 30 },
        normalGearOwned: { type: 'boolean' },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'get_research_context',
    description:
      "Get research catalog, tree detail, known costs, or the user's consented saved progress. Catalog plus includeUserProgress returns a compact percentage/maxed overview with priority unfinished nodes.",
    parameters: Object.freeze({
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['catalog', 'details', 'priorities'] },
        treeIds: { type: 'array', maxItems: 8, items: { type: 'string' } },
        troop: { type: 'string' },
        includeUserProgress: { type: 'boolean' },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'estimate_research_eta',
    description: 'Estimate known research duration from explicit daily medal incomes.',
    parameters: Object.freeze({
      type: 'object',
      required: ['dailyWarBadges', 'dailyCourageMedals'],
      properties: {
        dailyWarBadges: { type: 'number', minimum: 0 },
        dailyCourageMedals: { type: 'number', minimum: 0 },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'calculate_eden_loyalty',
    description:
      'Calculate Eden loyalty, extraction site, poison thresholds, and optionally a bounded Alliance Center upgrade plan.',
    parameters: Object.freeze({
      type: 'object',
      required: ['acLevels'],
      properties: {
        acLevels: {
          type: 'array',
          minItems: 4,
          maxItems: 4,
          items: { type: 'integer', minimum: 0, maximum: 20 },
        },
        bonusPoints: { type: 'number', minimum: 0 },
        savedUnits: { type: 'number', minimum: 0 },
        campHourlyProduction: { type: 'number', minimum: 0 },
        processingTimeHours: { type: 'number', minimum: 0 },
        unitsPerPatch: { type: 'number', minimum: 0 },
        numPatches: { type: 'integer', minimum: 0 },
        includeUpgradePlan: { type: 'boolean' },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'calculate_eden_upgrade_materials',
    description:
      'Get an exact T1-T16 loyalty requirement, calculate one Alliance Center level range, or find the cheapest Alliance Center material path from four current levels to a target tile.',
    parameters: Object.freeze({
      type: 'object',
      required: ['kind'],
      properties: {
        kind: {
          type: 'string',
          enum: ['site_requirement', 'site_materials', 'building_materials'],
        },
        targetSite: {
          type: 'string',
          enum: Array.from({ length: 16 }, (_, index) => `T${index + 1}`),
        },
        acLevels: {
          type: 'array',
          minItems: 4,
          maxItems: 4,
          items: { type: 'integer', minimum: 0, maximum: 20 },
        },
        bonusPoints: { type: 'number', minimum: 0 },
        savedUnits: { type: 'number', minimum: 0 },
        building: { type: 'string', enum: ['AC1', 'AC2', 'AC3', 'AC4'] },
        currentLevel: { type: 'integer', minimum: 0, maximum: 20 },
        targetLevel: { type: 'integer', minimum: 0, maximum: 20 },
      },
      additionalProperties: false,
    }),
  }),
  Object.freeze({
    name: 'get_eden_context',
    description:
      'Get public Eden guide, scoring, current rankings, player breakdowns, rewards, voting, or published-result status.',
    parameters: Object.freeze({
      type: 'object',
      required: ['kind'],
      properties: {
        kind: {
          type: 'string',
          enum: [
            'overview',
            'guide',
            'scoring_rules',
            'rankings',
            'player',
            'rewards',
            'voting',
            'published_status',
          ],
        },
        season: { type: 'string' },
        playerName: { type: 'string' },
        offset: { type: 'integer', minimum: 0 },
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
      additionalProperties: false,
    }),
  }),
]);

function normalizeCall(call) {
  if (!isPlainObject(call)) return null;
  const name = typeof call.name === 'string' ? call.name : '';
  const callIdValue = call.callId ?? call.id;
  const callId =
    typeof callIdValue === 'string' && callIdValue.length > 0 && callIdValue.length <= 100
      ? callIdValue
      : null;
  return {
    callId,
    name,
    arguments: call.arguments ?? call.args ?? {},
  };
}

function resultContext(context, call, evidenceIndex) {
  return {
    ...context,
    callId: call?.callId || null,
    evidenceIndex,
  };
}

export function getRequiredToolGroups(name, args = {}) {
  const definition = DEFINITIONS[name];
  return definition ? Object.freeze([...definition.requiredGroups(args)]) : Object.freeze([]);
}

export async function executeAiToolCall(rawCall, context = {}) {
  const call = normalizeCall(rawCall);
  const evidenceIndex = Math.max(1, Number(context.evidenceIndex) || 1);
  const envelopeContext = resultContext(context, call, evidenceIndex);
  if (!call) {
    return createToolError(
      'unknown',
      'malformed_tool_request',
      'Tool request must be an object.',
      {},
      envelopeContext
    );
  }
  const definition = DEFINITIONS[call.name];
  if (!definition) {
    return createToolError(
      call.name || 'unknown',
      'unknown_tool',
      'The requested tool is not available.',
      {},
      envelopeContext
    );
  }

  const allowedGroups = new Set(normalizeAllowedToolGroups(context.allowedToolGroups));
  const requiredGroups = definition.requiredGroups(
    isPlainObject(call.arguments) ? call.arguments : {}
  );
  const missingGroups = requiredGroups.filter((group) => !allowedGroups.has(group));
  if (missingGroups.length) {
    return createToolError(
      call.name,
      'tool_not_allowed',
      'This tool needs consent that is not enabled for the active chat.',
      { filters: { requiredToolGroups: missingGroups } },
      envelopeContext
    );
  }

  try {
    const adapterResult = await definition.execute(call.arguments, context);
    return createToolSuccess(call.name, adapterResult.data, adapterResult.meta, envelopeContext);
  } catch (error) {
    if (error instanceof AiToolInputError) {
      return createToolError(call.name, error.code, error.message, error.options, envelopeContext);
    }
    return createToolError(
      call.name,
      'tool_failed',
      'The local read-only tool could not complete.',
      {},
      envelopeContext
    );
  }
}

export async function executeAiToolCalls(calls, context = {}) {
  if (!Array.isArray(calls)) {
    return [
      createToolError(
        'unknown',
        'malformed_tool_request',
        'Tool calls must be an array.',
        {},
        { ...context, evidenceIndex: 1 }
      ),
    ];
  }
  return Promise.all(
    calls.map((call, index) => {
      if (index >= AI_LIMITS.maxToolCalls) {
        const normalized = normalizeCall(call);
        return createToolError(
          normalized?.name || 'unknown',
          'tool_call_limit',
          `A turn can execute at most ${AI_LIMITS.maxToolCalls} local tools.`,
          {},
          resultContext(context, normalized, index + 1)
        );
      }
      return executeAiToolCall(call, { ...context, evidenceIndex: index + 1 });
    })
  );
}
