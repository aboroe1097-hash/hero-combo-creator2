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
  // Two rounds only ever allowed "gather, then answer". Three lets Velo gather, act on
  // what it learned, then verify or fill a gap before answering - the shape most real
  // strategy questions need. toolCalls still caps total work per turn.
  toolRounds: 3,
  toolCalls: 8,
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
  // A reasoning model spends part of this budget on reasoning_content before it writes
  // a visible token, so the old 4k ceiling could truncate the answer itself.
  maxOutputTokens: 8_192,
});

export const ALLOWED_MODELS = Object.freeze(['gemini-3.1-flash-lite', 'gemini-3.5-flash']);
export const ALLOWED_DEEPSEEK_MODELS = Object.freeze(['deepseek-chat', 'deepseek-reasoner']);

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
export const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

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
