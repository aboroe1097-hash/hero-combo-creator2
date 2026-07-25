export const API_VERSION = 1;
export const TURN_PATH = '/v1/assistant/turn';
export const HEALTH_PATH = '/healthz';
export const MANAGEMENT_VOTES_PATH = '/v1/public/management-votes';

export const LIMITS = Object.freeze({
  bodyBytes: 128 * 1024,
  messageCharacters: 4_000,
  historyPairs: 8,
  historyBytes: 64 * 1024,
  historyEntryCharacters: 16_000,
  toolResultBytes: 8 * 1024,
  toolResultsBytes: 24 * 1024,
  providerStateBytes: 80 * 1024,
  toolRounds: 2,
  toolCalls: 6,
  upstreamInteractions: 3,
  firstProviderEventMs: 30_000,
  idleProviderEventMs: 30_000,
  providerRoundMs: 90_000,
  wholeTurnMs: 180_000,
  continuationTtlMs: 5 * 60_000,
  userTurnsPerUtcDay: 40,
  initialTurnsPerMinute: 12,
  globalTurnsPerUtcDay: 500,
  globalInteractionsPerUtcDay: 1_500,
  requestReplayTtlMs: 24 * 60 * 60_000,
  maxOutputTokens: 1_536,
});

export const ALLOWED_MODELS = Object.freeze(['gemini-3.1-flash-lite', 'gemini-3.5-flash']);

export const SUPPORTED_LOCALES = Object.freeze([
  'ar',
  'de',
  'en',
  'es',
  'fr',
  'id',
  'it',
  'kr',
  'pt',
  'ru',
  'tr',
  'zh',
]);

export const TOOL_GROUPS = Object.freeze([
  'static',
  'personal:selected_heroes',
  'personal:explicit_skins',
  'personal:dm_plan',
  'personal:research_progress',
  'private:admin_dashboard',
]);

export const GEMINI_INTERACTIONS_URL =
  'https://generativelanguage.googleapis.com/v1beta/interactions';
export const GEMINI_API_REVISION = '2026-05-20';

export const SAFE_ERROR_CODES = Object.freeze({
  disabled: 'ai_disabled',
  badRequest: 'bad_request',
  oversizedInput: 'oversized_input',
  auth: 'auth_failed',
  appCheck: 'app_check_failed',
  origin: 'origin_not_allowed',
  dailyQuota: 'daily_quota',
  burstQuota: 'burst_quota',
  globalBudget: 'global_budget',
  abuseQuota: 'abuse_quota',
  duplicate: 'duplicate_request',
  continuation: 'invalid_continuation',
  malformedTool: 'malformed_tool_request',
  safety: 'safety_block',
  interrupted: 'interrupted_stream',
  timeout: 'timeout',
  provider: 'provider_outage',
});
