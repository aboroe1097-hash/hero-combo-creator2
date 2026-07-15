import '../css/ai-assistant.css';

import { translations } from './translations.js';
import { currentLanguage } from './state.js';
import {
  AI_LIMITS,
  AI_SUPPORTED_LOCALES,
  boundAiToolResults,
  resolveAiTurnEndpoint,
} from './ai/contracts.js';
import {
  acceptProviderDisclosure,
  clearSessionGrants,
  getAllowedToolGroups,
  getSessionGrants,
  hasAcceptedProviderDisclosure,
  hasRawSavedState,
  setSessionGrants,
} from './ai/consent.js';
import { installCodeCopyHandlers, renderSafeMarkdown } from './ai/renderer.js';
import {
  clearVisibleHistory,
  loadVisibleHistory,
  saveVisibleHistory,
  toVisibleWireHistory,
} from './ai/session-history.js';
import { AiTransportError, streamAssistantRequest } from './ai/sse-client.js';
import { createVeloMascot } from './velo-mascot.js';
import {
  applyConfirmedGeneratorSelection,
  deriveContextualActions,
  deriveDeterministicActions,
  deriveExecutedSources,
  deriveSetupActions,
  readCurrentGeneratorSelection,
} from './ai/ui-actions.js';

const FALLBACKS = Object.freeze({
  'ai.copy': 'Copy',
  'ai.copied': 'Copied',
  'ai.usedAppData': 'Used App Data',
  'ai.generalMode': 'General advice only',
  'ai.personalMode': 'Using selected saved data',
  'ai.status.connecting': 'Connecting',
  'ai.status.checkingCombos': 'Checking ranked combos',
  'ai.status.comparingHeroes': 'Comparing selected heroes',
  'ai.status.writing': 'Writing answer',
  'ai.status.generating': 'Generating answer',
  'ai.status.veloThinking': 'Velo is warming up a tiny fire…',
  'ai.status.answerReady': 'Answer ready',
  'ai.status.stopped': 'Stopped',
  'ai.status.onlineRestored': 'Connection restored',
  'ai.retry': 'Retry',
  'ai.error.offline':
    'AI needs an internet connection. Your other toolkit features still work offline.',
  'ai.error.auth': 'App verification could not be completed. Refresh and try again.',
  'ai.error.dailyQuota':
    'Your daily AI allowance has been used. Try again after the displayed reset time.',
  'ai.error.burstQuota': 'Too many questions were sent at once. Wait a moment, then retry.',
  'ai.error.globalBudget': 'The shared AI budget is currently paused. Please try again later.',
  'ai.error.oversizedInput': 'This request is too large. Shorten it and try again.',
  'ai.error.malformedTool': 'The assistant requested app data in an unsupported format.',
  'ai.error.safety': 'Velo could not answer that safely. Try rephrasing the request.',
  'ai.error.interrupted': 'The response was stopped before it finished.',
  'ai.error.timeout': 'The AI service took too long to respond.',
  'ai.error.provider': 'The AI provider is temporarily unavailable.',
  'ai.error.generic': 'Could not finish that answer. Try again.',
  'ai.action.useGeneratorTitle': 'Use this lineup in Generator?',
  'ai.action.currentSelection': 'Current selection',
  'ai.action.proposedSelection': 'Proposed selection',
  'ai.action.localOnly': 'This changes only your local Generator selection.',
  'ai.action.confirmUse': 'Use in Generator',
  'ai.newChatConfirmTitle': 'Start a new chat?',
  'ai.newChatConfirmBody':
    'This clears the visible conversation and personal permissions for this chat.',
  'ai.clearChat': 'Clear chat',
  'ai.cancel': 'Cancel',
  'ai.followup.lineups': 'Show three non-overlapping lineups',
  'ai.followup.counters': 'Check an exact counter',
  'ai.followup.crafting': 'Explain the next crafting step',
  'ai.followup.research': 'Compare research priorities',
  'ai.followup.strife': 'Compare another Strife target',
  'ai.followup.compare': 'Compare two heroes',
  'ai.setup.missingIntro':
    'Before I can personalize that review, save the highlighted account details in the toolkit:',
});

const ERROR_KEY_BY_CODE = Object.freeze({
  offline: 'ai.error.offline',
  auth_app_check_failure: 'ai.error.auth',
  auth_failure: 'ai.error.auth',
  daily_quota: 'ai.error.dailyQuota',
  burst_quota: 'ai.error.burstQuota',
  global_budget: 'ai.error.globalBudget',
  budget_exceeded: 'ai.error.globalBudget',
  oversized_input: 'ai.error.oversizedInput',
  input_too_large: 'ai.error.oversizedInput',
  malformed_tool_request: 'ai.error.malformedTool',
  safety_block: 'ai.error.safety',
  interrupted: 'ai.error.interrupted',
  timeout: 'ai.error.timeout',
  provider_outage: 'ai.error.provider',
});

const RETRYABLE_CODES = new Set([
  'offline',
  'interrupted',
  'timeout',
  'provider_outage',
  'malformed_tool_request',
]);
const STATUS_KEYS = Object.freeze({
  connecting: 'ai.status.connecting',
  checking_ranked_combos: 'ai.status.checkingCombos',
  checking_combos: 'ai.status.checkingCombos',
  comparing_selected_heroes: 'ai.status.comparingHeroes',
  comparing_heroes: 'ai.status.comparingHeroes',
  writing_answer: 'ai.status.writing',
  writing: 'ai.status.writing',
});

let activeController = null;

function translate(key, fallback = FALLBACKS[key] || key, variables = {}) {
  const dictionary = translations[currentLanguage] || translations.en || {};
  let value = dictionary[key] || translations.en?.[key] || fallback;
  for (const [name, replacement] of Object.entries(variables)) {
    value = String(value).replaceAll(`{${name}}`, String(replacement));
  }
  return String(value);
}

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const RESEARCH_TOPIC_PATTERN =
  /\b(?:research|technology|tech\s*tree|forschung|recherche|investigaci[oó]n|pesquisa|riset|araştırma)\b|研究|연구|исследов|بحث/iu;
const PERSONAL_STATUS_PATTERN =
  /\b(?:my|mine|current|saved|progress|status|finished|complete|completed|done|mein(?:e|er|en)?|aktuell|gespeichert|fortschritt|mon|ma|mes|actuel|progr[eè]s|mi|actual|guardad[oa]|meu|minha|atual|progresso|moy|tekush|sohran|benim|mevcut|ilerleme|saya|tersimpan)\b|我的|当前|进度|내|현재|진행|мой|текущ|сохран|لدي|الحالي|التقدم/iu;

const SAVED_SETUP_COMPLETION_PATTERN =
  /\b(?:i(?:'ve| have)?\s+)?(?:saved|selected|added|finished|completed|set(?:\s+(?:it|them))?\s+up)\b|\b(?:done|ready)\b|guard(?:é|ado)|salvei|gespeichert|fertig|enregistr(?:é|e)|pr[êe]t|kaydet|hazır|сохран|выбрал|готов|simpan|selesai|保存|选好|選好|저장|선택|완료|حفظ|جاهز|تم/iu;

export function isSavedSetupCompletionPrompt(prompt) {
  const text = String(prompt || '').trim();
  return text.length > 0 && text.length <= 160 && SAVED_SETUP_COMPLETION_PATTERN.test(text);
}

export function inferSavedDataCategory(prompt) {
  const text = String(prompt || '').trim();
  if (/\b(?:admin(?:\s+(?:dashboard|data))?|private roster|management data)\b/iu.test(text)) {
    return 'admin_dashboard';
  }
  if (RESEARCH_TOPIC_PATTERN.test(text) && PERSONAL_STATUS_PATTERN.test(text)) {
    return 'research_progress';
  }
  return '';
}

export function inferRequiredSavedCategories(prompt) {
  const text = String(prompt || '').trim();
  const personal = PERSONAL_STATUS_PATTERN.test(text);
  if (!personal) return [];
  if (
    /\b(?:overall\s+account|account\s+(?:progress|status)|full\s+account\s+review)\b/iu.test(text)
  ) {
    return ['selected_heroes', 'research_progress', 'dm_plan'];
  }
  if (RESEARCH_TOPIC_PATTERN.test(text)) return ['research_progress'];
  if (/\b(?:hero(?:es)?|combo(?:s)?|lineup(?:s)?|formation(?:s)?|roster)\b/iu.test(text)) {
    return ['selected_heroes'];
  }
  if (
    /\b(?:dragon master|dm\s+(?:set|inventory|plan)|material(?:s)?|craft(?:ing)?)\b/iu.test(text)
  ) {
    return ['dm_plan'];
  }
  return [];
}

export function resolveAiEndpoint(root) {
  const candidates = [
    root?.dataset?.endpoint,
    globalThis.VTS_AI_WORKER_URL,
    import.meta.env?.VITE_AI_WORKER_URL,
    document.querySelector('meta[name="vts-ai-endpoint"]')?.content,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const endpoint = resolveAiTurnEndpoint(candidate);
      if (endpoint) return endpoint;
    } catch {}
  }
  return '';
}

function isNearBottom(element) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < 96;
}

function normalizeLocale(value) {
  const locale =
    value === 'ko'
      ? 'kr'
      : String(value || '')
          .toLowerCase()
          .split('-')[0];
  return AI_SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
}

function toolStage(calls) {
  const names = (Array.isArray(calls) ? calls : []).map((call) => call?.name).join(' ');
  if (/combo|counter/.test(names)) return 'checking_ranked_combos';
  if (/hero/.test(names)) return 'comparing_selected_heroes';
  return 'writing_answer';
}

class AiAssistantController {
  constructor(root) {
    this.root = root;
    this.elements = this.collectElements();
    this.messages = loadVisibleHistory();
    this.grants = getSessionGrants();
    this.busy = false;
    this.activeAbort = null;
    this.activeStopCode = '';
    this.activeToolResults = [];
    this.lastFocused = null;
    this.pendingPrompt = null;
    this.pendingConsentCategory = '';
    this.pendingSetupCategories = new Set();
    this.confirmMode = '';
    this.confirmLineup = null;
    this.confirmReturnFocus = null;
    this.tabVisible = document.body?.dataset?.activeTab === 'ai';
    this.userNearBottom = true;
    this.isComposing = false;
    this.timeoutHandles = new Set();
    this.wireEvents();
    this.refreshLocalizedChrome();
    this.syncPersonalSuggestions();
    this.renderTranscript();
    this.updateConnectivity(false);
    this.syncConsentUi();
    this.updateComposerState();
    if (!hasAcceptedProviderDisclosure()) this.openConsent();
  }

  collectElements() {
    const byId = (id) => this.root.querySelector(`#${id}`);
    return {
      conversation: byId('aiConversation'),
      welcome: byId('aiWelcome'),
      transcript: byId('aiTranscript'),
      jump: byId('aiJumpLatestBtn'),
      offline: byId('aiOfflineBanner'),
      error: byId('aiErrorBanner'),
      errorTitle: byId('aiErrorTitle'),
      errorBody: byId('aiErrorBody'),
      errorRetry: byId('aiErrorRetryBtn'),
      status: byId('aiStatus'),
      form: byId('aiComposerForm'),
      composer: byId('aiComposer'),
      count: byId('aiComposerCount'),
      send: byId('aiSendBtn'),
      stop: byId('aiStopBtn'),
      mode: byId('aiModeLabel'),
      quota: byId('aiQuotaLabel'),
      newChat: byId('aiNewChatBtn'),
      privacy: byId('aiPrivacyBtn'),
      moreIdeas: byId('aiMoreIdeas'),
      moreIdeasButton: byId('aiMoreIdeasBtn'),
      consentOverlay: byId('aiConsentOverlay'),
      consentDialog: byId('aiConsentDialog'),
      consentClose: byId('aiConsentCloseBtn'),
      consentGeneral: byId('aiConsentGeneralBtn'),
      consentAllow: byId('aiConsentAllowBtn'),
      consentSetup: byId('aiConsentSetupHint'),
      confirmOverlay: byId('aiConfirmOverlay'),
      confirmDialog: byId('aiConfirmDialog'),
      confirmTitle: byId('aiConfirmTitle'),
      confirmBody: byId('aiConfirmBody'),
      lineupCompare: byId('aiLineupCompare'),
      confirmLocalNote: byId('aiConfirmLocalNote'),
      currentLineup: byId('aiCurrentLineup'),
      proposedLineup: byId('aiProposedLineup'),
      confirmCancel: byId('aiConfirmCancelBtn'),
      confirmApply: byId('aiConfirmApplyBtn'),
    };
  }

  wireEvents() {
    const { elements } = this;
    elements.form?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submitComposer();
    });
    elements.composer?.addEventListener('input', () => {
      this.resizeComposer();
      this.updateComposerState();
    });
    elements.composer?.addEventListener('compositionstart', () => {
      this.isComposing = true;
    });
    elements.composer?.addEventListener('compositionend', () => {
      this.isComposing = false;
    });
    elements.composer?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.busy) {
        event.preventDefault();
        event.stopPropagation();
        this.stopGeneration('interrupted');
        return;
      }
      if (
        event.key !== 'Enter' ||
        event.shiftKey ||
        this.isComposing ||
        event.isComposing ||
        event.keyCode === 229
      )
        return;
      event.preventDefault();
      this.submitComposer();
    });
    elements.stop?.addEventListener('click', () => this.stopGeneration('interrupted'));
    elements.errorRetry?.addEventListener('click', () => this.retryLastTurn());
    elements.newChat?.addEventListener('click', () => this.requestNewChat());
    elements.privacy?.addEventListener('click', () => this.openConsent({ settings: true }));
    elements.moreIdeasButton?.addEventListener('click', () => this.toggleMoreIdeas());
    elements.jump?.addEventListener('click', () => this.scrollToLatest(true));
    elements.conversation?.addEventListener(
      'scroll',
      () => {
        this.userNearBottom = isNearBottom(elements.conversation);
        elements.jump?.classList.toggle(
          'hidden',
          this.messages.length === 0 || this.userNearBottom
        );
      },
      { passive: true }
    );
    this.root.addEventListener('click', (event) => this.handleRootClick(event));
    elements.consentClose?.addEventListener('click', () => this.closeConsent());
    elements.consentGeneral?.addEventListener('click', () => this.commitConsent(new Set()));
    elements.consentAllow?.addEventListener('click', () => {
      const selected = new Set(
        Array.from(this.root.querySelectorAll('.ai-consent-option input:checked')).map(
          (input) => input.value
        )
      );
      this.commitConsent(selected);
    });
    elements.consentDialog?.addEventListener('keydown', (event) =>
      this.trapDialogFocus(event, elements.consentDialog, () => this.closeConsent())
    );
    elements.confirmCancel?.addEventListener('click', () => this.closeConfirm());
    elements.confirmApply?.addEventListener('click', () => this.applyConfirmation());
    elements.confirmDialog?.addEventListener('keydown', (event) =>
      this.trapDialogFocus(event, elements.confirmDialog, () => this.closeConfirm())
    );
    globalThis.addEventListener('online', () => this.updateConnectivity(true));
    globalThis.addEventListener('offline', () => this.updateConnectivity(false));
    globalThis.addEventListener('edenLanguageUpdate', () => this.refreshLocalizedChrome());
  }

  handleRootClick(event) {
    const suggestion = event.target.closest('[data-ai-prompt]');
    if (suggestion && this.root.contains(suggestion)) {
      const prompt = suggestion.dataset.aiPrompt || suggestion.textContent.trim();
      const requiredCategories = String(suggestion.dataset.aiCategories || '')
        .split(',')
        .filter(Boolean);
      this.sendMessage(prompt, { requiredCategories });
      return;
    }
    const nav = event.target.closest('[data-ai-nav]');
    if (nav) this.navigate(nav.dataset.aiNav);
    const action = event.target.closest('[data-ai-action-index]');
    if (action) {
      const messageIndex = Number(action.dataset.messageIndex);
      const actionIndex = Number(action.dataset.aiActionIndex);
      this.runMessageAction(this.messages[messageIndex]?.actions?.[actionIndex]);
    }
  }

  refreshLocalizedChrome() {
    this.root.querySelectorAll('[data-ai-key]').forEach((button) => {
      const key = button.dataset.aiKey;
      const fallback = button.dataset.aiPrompt || button.textContent.trim();
      const localized = translate(key, fallback);
      button.textContent = localized;
      button.dataset.aiPrompt = localized;
    });
    this.elements.mode.textContent = this.grants.size
      ? translate('ai.personalMode', FALLBACKS['ai.personalMode'])
      : translate('ai.generalMode', FALLBACKS['ai.generalMode']);
    this.renderTranscript();
  }

  syncPersonalSuggestions() {
    this.root.querySelectorAll('[data-ai-categories]').forEach((button) => {
      const categories = button.dataset.aiCategories.split(',').filter(Boolean);
      button.classList.toggle(
        'ai-suggestion--setup-needed',
        categories.some((category) => !hasRawSavedState(category))
      );
    });
  }

  toggleMoreIdeas() {
    const expanded = this.elements.moreIdeasButton.getAttribute('aria-expanded') === 'true';
    this.elements.moreIdeasButton.setAttribute('aria-expanded', String(!expanded));
    this.elements.moreIdeas.classList.toggle('hidden', expanded);
  }

  resizeComposer() {
    const composer = this.elements.composer;
    if (!composer) return;
    composer.style.height = 'auto';
    composer.style.height = `${Math.min(composer.scrollHeight, 160)}px`;
  }

  updateComposerState() {
    const text = this.elements.composer?.value || '';
    const offline = globalThis.navigator?.onLine === false;
    this.elements.count.textContent = `${text.length}/${AI_LIMITS.maxMessageCharacters}`;
    this.elements.send.disabled =
      this.busy || offline || !text.trim() || text.length > AI_LIMITS.maxMessageCharacters;
    this.elements.composer.disabled = false;
    this.elements.composer.setAttribute(
      'aria-invalid',
      String(text.length > AI_LIMITS.maxMessageCharacters)
    );
    this.elements.stop.classList.toggle('hidden', !this.busy);
    this.elements.send.classList.toggle('hidden', this.busy);
    this.root.setAttribute('aria-busy', String(this.busy));
    this.root.dataset.veloState = this.busy ? 'thinking' : 'idle';
    this.root.querySelectorAll('.ai-suggestion').forEach((button) => {
      button.disabled = this.busy || offline;
    });
  }

  updateConnectivity(announceRestored) {
    const offline = globalThis.navigator?.onLine === false;
    this.elements.offline.classList.toggle('hidden', !offline);
    if (offline && this.busy) this.stopGeneration('offline');
    if (!offline && announceRestored) this.setStatus('onlineRestored');
    this.updateComposerState();
  }

  setStatus(keyOrStage, variables = {}) {
    const key = STATUS_KEYS[keyOrStage] || `ai.status.${keyOrStage}`;
    const fallback = FALLBACKS[key] || String(keyOrStage).replaceAll('_', ' ');
    this.elements.status.textContent = translate(key, fallback, variables);
  }

  clearStatus() {
    this.elements.status.textContent = '';
  }

  submitComposer() {
    const text = this.elements.composer.value.trim();
    if (!text || this.busy) return;
    this.sendMessage(text);
  }

  async sendMessage(text, options = {}) {
    const prompt = String(text || '').trim();
    if (!prompt || this.busy) return;
    if (globalThis.navigator?.onLine === false) {
      this.showError('offline');
      return;
    }
    if (prompt.length > AI_LIMITS.maxMessageCharacters) {
      this.showError('oversized_input');
      return;
    }
    let requiredCategories = options.requiredCategories?.length
      ? options.requiredCategories
      : inferRequiredSavedCategories(prompt);
    if (
      !requiredCategories.length &&
      this.pendingSetupCategories.size &&
      isSavedSetupCompletionPrompt(prompt)
    ) {
      requiredCategories = Array.from(this.pendingSetupCategories).filter((category) =>
        hasRawSavedState(category)
      );
    }
    const missingCategories = requiredCategories.filter((category) => !hasRawSavedState(category));
    if (missingCategories.length) {
      this.showSavedSetupGuide(prompt, missingCategories);
      return;
    }
    const ungrantedCategory = requiredCategories.find((category) => !this.grants.has(category));
    if (ungrantedCategory) {
      this.openConsent({ category: ungrantedCategory, prompt });
      return;
    }
    const inferredCategory = inferSavedDataCategory(prompt);
    if (
      inferredCategory &&
      hasRawSavedState(inferredCategory) &&
      !this.grants.has(inferredCategory)
    ) {
      this.openConsent({ category: inferredCategory, prompt });
      return;
    }
    if (!hasAcceptedProviderDisclosure()) {
      this.openConsent({ prompt });
      return;
    }

    let assistantIndex = options.assistantIndex;
    let priorHistory = options.priorHistory;
    if (!Number.isInteger(assistantIndex)) {
      priorHistory = toVisibleWireHistory(this.messages);
      this.messages.push({ role: 'user', text: prompt, complete: true });
      this.messages.push({ role: 'assistant', text: '', complete: false, pending: true });
      while (this.messages.length > AI_LIMITS.maxHistoryEntries) this.messages.splice(0, 2);
      assistantIndex = this.messages.length - 1;
    } else {
      this.messages[assistantIndex] = {
        role: 'assistant',
        text: '',
        complete: false,
        pending: true,
      };
    }

    this.persistVisibleHistory();
    this.renderTranscript();
    this.hideError();
    this.elements.composer.value = '';
    this.resizeComposer();
    this.updateComposerState();
    this.userNearBottom = true;
    this.scrollToLatest();
    await this.runTurn({ prompt, assistantIndex, priorHistory: priorHistory || [] });
  }

  showSavedSetupGuide(prompt, categories) {
    categories.forEach((category) => this.pendingSetupCategories.add(category));
    const setupByCategory = {
      selected_heroes: {
        tab: 'generator',
        label: translate('ai.setup.generator', 'Select heroes in the Generator first.'),
      },
      research_progress: {
        tab: 'research',
        label: translate('ai.setup.research', 'Save research progress first.'),
      },
      dm_plan: {
        tab: 'materials',
        label: translate('ai.setup.materials', 'Set up your DM inventory first.'),
      },
    };
    const actions = categories.map((category) => ({
      type: 'navigate',
      ...setupByCategory[category],
    }));
    this.messages.push(
      { role: 'user', text: prompt, complete: true },
      {
        role: 'assistant',
        text: translate('ai.setup.missingIntro', FALLBACKS['ai.setup.missingIntro']),
        complete: true,
        actions,
      }
    );
    this.persistVisibleHistory();
    this.renderTranscript();
  }

  async runTurn({ prompt, assistantIndex, priorHistory }) {
    this.busy = true;
    this.activeAbort = new AbortController();
    this.activeStopCode = '';
    this.activeToolResults = [];
    this.updateComposerState();
    this.setStatus('connecting');

    const requestId = createRequestId();
    const allowedToolGroups = getAllowedToolGroups(this.grants);
    let body = {
      version: 1,
      requestId,
      history: priorHistory,
      input: { kind: 'message', text: prompt, locale: normalizeLocale(currentLanguage) },
      allowedToolGroups,
    };
    let round = 0;
    let callCount = 0;
    let completed = false;
    let sawText = false;
    let bufferedText = '';
    let roundCalls = [];
    let doneStatus = '';

    const wholeTurnTimer = this.armTimeout(AI_LIMITS.requestTimeoutMs, 'timeout');
    try {
      while (!completed) {
        roundCalls = [];
        doneStatus = '';
        let sawEvent = false;
        let continuationState = null;

        const result = await streamAssistantRequest({
          endpoint: resolveAiEndpoint(this.root),
          body,
          signal: this.activeAbort.signal,
          onEvent: async ({ event, data }) => {
            sawEvent = true;
            if (event === 'start') {
              this.setStatus('connecting');
              this.updateQuota(data);
            } else if (event === 'status') {
              this.setStatus(data?.stage || data?.status || 'generating');
            } else if (event === 'text_delta') {
              const delta = typeof data === 'string' ? data : data?.text;
              if (typeof delta === 'string' && delta) {
                sawText = true;
                bufferedText += delta;
              }
            } else if (event === 'tool_calls') {
              roundCalls = Array.isArray(data?.calls) ? data.calls : [];
              this.setStatus(toolStage(roundCalls));
            } else if (event === 'state') {
              if (data?.providerState && typeof data.continuationToken === 'string') {
                continuationState = {
                  providerState: data.providerState,
                  continuationToken: data.continuationToken,
                };
              }
            } else if (event === 'usage') {
              this.updateQuota(data);
            } else if (event === 'done') {
              doneStatus = data?.status || 'completed';
              this.updateQuota(data);
            } else if (event === 'error') {
              throw new AiTransportError(
                data?.code || 'provider_outage',
                data?.message || 'AI stream failed.'
              );
            }
          },
        });
        this.updateQuotaFromHeaders(result.response?.headers);

        if (!sawEvent || (!doneStatus && !roundCalls.length)) {
          throw new AiTransportError(
            sawText ? 'interrupted' : 'provider_outage',
            'AI stream ended unexpectedly.'
          );
        }

        if (roundCalls.length) {
          if (!continuationState) {
            throw new AiTransportError('interrupted', 'AI continuation state was missing.');
          }
          if (
            round >= AI_LIMITS.maxToolRounds ||
            callCount + roundCalls.length > AI_LIMITS.maxToolCalls
          ) {
            throw new AiTransportError('malformed_tool_request', 'Tool-call limit exceeded.');
          }
          const registry = await import('./ai/tool-registry.js');
          const executedToolResults = await registry.executeAiToolCalls(roundCalls, {
            allowedToolGroups,
            storage: globalThis.localStorage,
            runtimeState: globalThis.__vtsHeroComboRuntimeState,
          });
          const toolResults = boundAiToolResults(executedToolResults);
          this.activeToolResults.push(...executedToolResults);
          callCount += roundCalls.length;
          round += 1;
          body = {
            version: 1,
            requestId,
            round,
            providerState: continuationState.providerState,
            continuationToken: continuationState.continuationToken,
            input: { kind: 'tool_results', results: toolResults },
          };
          this.setStatus('writing');
          continue;
        }

        if (doneStatus === 'incomplete' || doneStatus === 'cancelled') {
          throw new AiTransportError('interrupted', 'Answer was incomplete.');
        }
        if (doneStatus === 'budget_exceeded')
          throw new AiTransportError('global_budget', 'Budget exceeded.');
        if (doneStatus === 'failed')
          throw new AiTransportError('provider_outage', 'Provider failed.');
        completed = doneStatus === 'completed' || doneStatus === 'done';
        if (!completed)
          throw new AiTransportError('provider_outage', 'Unexpected completion state.');
      }

      const message = this.messages[assistantIndex];
      message.text = bufferedText;
      message.complete = true;
      message.pending = false;
      message.sources = deriveExecutedSources(this.activeToolResults, translate);
      const candidateActions = [
        ...deriveSetupActions(this.activeToolResults, translate),
        ...deriveContextualActions(bufferedText, translate),
        ...deriveDeterministicActions(this.activeToolResults, translate),
      ];
      message.actions = candidateActions
        .filter(
          (action, index, actions) =>
            actions.findIndex(
              (candidate) =>
                candidate.type === action.type &&
                candidate.tab === action.tab &&
                candidate.href === action.href
            ) === index
        )
        .slice(0, 3);
      message.followups = this.deriveFollowups(this.activeToolResults);
      this.persistVisibleHistory();
      this.renderMessageAt(assistantIndex);
      this.setStatus('answerReady');
    } catch (error) {
      const code =
        error?.name === 'AbortError'
          ? this.activeStopCode || 'interrupted'
          : error?.code || 'provider_outage';
      const message = this.messages[assistantIndex];
      if (message) {
        message.text = '';
        message.complete = false;
        message.pending = false;
      }
      this.persistVisibleHistory();
      this.renderMessageAt(assistantIndex);
      this.showError(code, error?.retryAfter);
      this.setStatus(code === 'interrupted' ? 'stopped' : code === 'offline' ? 'offline' : '');
    } finally {
      this.clearTimeoutHandle(wholeTurnTimer);
      this.clearAllTimeouts();
      this.busy = false;
      this.activeAbort = null;
      this.activeStopCode = '';
      this.activeToolResults = [];
      this.updateComposerState();
      this.elements.composer.focus({ preventScroll: true });
    }
  }

  armTimeout(delay, code) {
    const handle = setTimeout(() => {
      if (!this.activeAbort || this.activeAbort.signal.aborted) return;
      this.activeStopCode = code;
      this.activeAbort.abort();
    }, delay);
    this.timeoutHandles.add(handle);
    return handle;
  }

  clearTimeoutHandle(handle) {
    if (!handle) return;
    clearTimeout(handle);
    this.timeoutHandles.delete(handle);
  }

  clearAllTimeouts() {
    this.timeoutHandles.forEach((handle) => clearTimeout(handle));
    this.timeoutHandles.clear();
  }

  stopGeneration(code = 'interrupted') {
    if (!this.activeAbort || this.activeAbort.signal.aborted) return;
    this.activeStopCode = code;
    this.activeAbort.abort();
  }

  retryLastTurn() {
    if (this.busy || globalThis.navigator?.onLine === false) return;
    let assistantIndex = -1;
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      if (this.messages[index].role === 'assistant' && this.messages[index].complete === false) {
        assistantIndex = index;
        break;
      }
    }
    if (assistantIndex < 1) return;
    let userIndex = assistantIndex - 1;
    while (userIndex >= 0 && this.messages[userIndex].role !== 'user') userIndex -= 1;
    if (userIndex < 0) return;
    const priorHistory = toVisibleWireHistory(this.messages.slice(0, userIndex));
    this.sendMessage(this.messages[userIndex].text, { assistantIndex, priorHistory });
  }

  persistVisibleHistory() {
    saveVisibleHistory(this.messages);
  }

  renderTranscript() {
    const hasMessages = this.messages.length > 0;
    this.elements.welcome.classList.toggle('hidden', hasMessages);
    this.elements.transcript.classList.toggle('hidden', !hasMessages);
    if (!hasMessages) {
      this.userNearBottom = true;
      this.elements.jump.classList.add('hidden');
    }
    this.elements.transcript.replaceChildren();
    this.messages.forEach((_message, index) =>
      this.elements.transcript.append(this.createMessageElement(index))
    );
    if (hasMessages && this.userNearBottom) this.scrollToLatest();
  }

  createMessageElement(index) {
    const message = this.messages[index];
    const item = document.createElement('li');
    item.className = `ai-message ai-message--${message.role}`;
    item.dataset.messageIndex = String(index);
    item.dir = 'auto';

    const label = document.createElement('span');
    label.className = 'ai-message-label';
    label.textContent =
      message.role === 'user' ? translate('ai.you', 'You') : translate('ai.assistantLabel', 'Velo');
    if (message.role === 'assistant') label.prepend(createVeloMascot('message'));
    const pending = message.role === 'assistant' && message.pending === true;
    const body = document.createElement('div');
    body.className = 'ai-message-body';
    if (pending) {
      body.classList.add('ai-message-body--pending');
      body.setAttribute(
        'aria-label',
        translate('ai.status.veloThinking', FALLBACKS['ai.status.veloThinking'])
      );
      const typingLabel = document.createElement('span');
      typingLabel.className = 'ai-typing-label';
      typingLabel.textContent = translate(
        'ai.status.veloThinking',
        FALLBACKS['ai.status.veloThinking']
      );
      body.append(createVeloMascot('typing'), typingLabel);
    } else if (message.role === 'assistant') {
      body.innerHTML = renderSafeMarkdown(message.text, {
        copyLabel: translate('ai.copy', FALLBACKS['ai.copy']),
        copiedLabel: translate('ai.copied', FALLBACKS['ai.copied']),
      });
      installCodeCopyHandlers(body);
    } else {
      body.textContent = message.text;
    }
    if (message.role === 'assistant' && !pending && !message.text) item.hidden = true;
    item.append(label, body);
    if (message.sources?.length) item.append(this.createSources(message.sources));
    if (message.actions?.length) item.append(this.createActions(message.actions, index));
    if (message.followups?.length) item.append(this.createFollowups(message.followups));
    return item;
  }

  renderMessageAt(index) {
    const existing = this.elements.transcript.querySelector(`[data-message-index="${index}"]`);
    existing?.replaceWith(this.createMessageElement(index));
    if (this.userNearBottom) this.scrollToLatest();
  }

  createSources(sources) {
    const section = document.createElement('div');
    section.className = 'ai-sources';
    const label = document.createElement('span');
    label.className = 'ai-sources-label';
    label.textContent = translate('ai.usedAppData', FALLBACKS['ai.usedAppData']);
    section.append(label);
    sources.forEach((source) => {
      const chip = document.createElement('span');
      chip.className = 'ai-source-chip';
      chip.textContent = source.evidenceId
        ? `${source.label} · ${source.evidenceId}`
        : source.label;
      section.append(chip);
    });
    return section;
  }

  createActions(actions, messageIndex) {
    const group = document.createElement('div');
    group.className = 'ai-message-actions';
    actions.forEach((action, actionIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ai-answer-action';
      button.textContent = action.label;
      button.dataset.messageIndex = String(messageIndex);
      button.dataset.aiActionIndex = String(actionIndex);
      group.append(button);
    });
    return group;
  }

  createFollowups(followups) {
    const group = document.createElement('div');
    group.className = 'ai-followups';
    followups.slice(0, 3).forEach((followup) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ai-followup';
      button.textContent = followup;
      button.dataset.aiPrompt = followup;
      group.append(button);
    });
    return group;
  }

  deriveFollowups(results) {
    const tools = (Array.isArray(results) ? results : [])
      .filter((result) => result?.ok)
      .map((result) => result.name || result.meta?.tool)
      .join(' ');
    const followups = [];
    if (/combo/.test(tools))
      followups.push(
        translate('ai.followup.lineups', FALLBACKS['ai.followup.lineups']),
        translate('ai.followup.counters', FALLBACKS['ai.followup.counters'])
      );
    if (/material/.test(tools))
      followups.push(translate('ai.followup.crafting', FALLBACKS['ai.followup.crafting']));
    if (/research/.test(tools))
      followups.push(translate('ai.followup.research', FALLBACKS['ai.followup.research']));
    if (/strife/.test(tools))
      followups.push(translate('ai.followup.strife', FALLBACKS['ai.followup.strife']));
    if (/hero/.test(tools))
      followups.push(translate('ai.followup.compare', FALLBACKS['ai.followup.compare']));
    return Array.from(new Set(followups)).slice(0, 3);
  }

  scrollToLatest(force = false) {
    if (!this.tabVisible && !force) return;
    const conversation = this.elements.conversation;
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    conversation.scrollTo?.({
      top: conversation.scrollHeight,
      behavior: force && !reduceMotion ? 'smooth' : 'auto',
    });
    if (!conversation.scrollTo) conversation.scrollTop = conversation.scrollHeight;
    this.userNearBottom = true;
    this.elements.jump.classList.add('hidden');
  }

  showError(code, retryAfter = null) {
    const normalized = ERROR_KEY_BY_CODE[code] ? code : 'provider_outage';
    const key = ERROR_KEY_BY_CODE[normalized] || 'ai.error.generic';
    let body = translate(key, FALLBACKS[key] || FALLBACKS['ai.error.generic']);
    if (retryAfter)
      body += ` ${translate('ai.error.retryAfter', 'Retry after {time}.', { time: retryAfter })}`;
    this.elements.errorBody.textContent = body;
    this.elements.error.classList.remove('hidden');
    const retryable = RETRYABLE_CODES.has(normalized);
    this.elements.errorRetry.classList.toggle('hidden', !retryable);
    this.elements.errorRetry.disabled =
      normalized === 'offline' && globalThis.navigator?.onLine === false;
  }

  hideError() {
    this.elements.error.classList.add('hidden');
    this.elements.errorRetry.classList.add('hidden');
  }

  updateQuota(data) {
    const quota = data?.quota || data;
    if (Number.isFinite(quota?.remaining)) {
      const remaining = translate('ai.quota.remaining', '{remaining} AI questions remaining', {
        remaining: quota.remaining,
      });
      const reset = quota.reset
        ? translate('ai.quota.reset', 'Resets {reset}', { reset: quota.reset })
        : '';
      this.elements.quota.textContent = [remaining, reset].filter(Boolean).join(' · ');
    }
  }

  updateQuotaFromHeaders(headers) {
    if (!headers?.get) return;
    const remaining = Number(headers.get('X-AI-Quota-Remaining'));
    const reset = headers.get('X-AI-Quota-Reset');
    if (Number.isFinite(remaining)) this.updateQuota({ remaining, reset });
  }

  openConsent({ category = '', prompt = null, settings = false } = {}) {
    this.lastFocused = document.activeElement;
    this.pendingPrompt = prompt;
    this.pendingConsentCategory = category;
    this.syncConsentUi(category);
    this.elements.consentAllow.textContent = settings
      ? translate('ai.consent.saveSettings', 'Save privacy settings')
      : translate('ai.consent.allowSelected', 'Allow selected data for this chat');
    this.elements.consentOverlay.classList.remove('hidden');
    document.body.classList.add('ai-dialog-open');
    requestAnimationFrame(() => {
      const preferred = category
        ? this.root.querySelector(`[data-ai-consent-option="${category}"] input:not(:disabled)`)
        : this.elements.consentDialog;
      preferred?.focus({ preventScroll: true });
    });
  }

  syncConsentUi(preferredCategory = '') {
    this.root.querySelectorAll('.ai-consent-option').forEach((option) => {
      const category = option.dataset.aiConsentOption;
      const input = option.querySelector('input');
      const available = hasRawSavedState(category);
      input.disabled = !available;
      // Access still requires the explicit dialog action. Preselect every
      // available category so a user can grant their complete saved toolkit
      // context without four easy-to-miss checkbox clicks.
      input.checked = available;
      option.classList.toggle('ai-consent-option--unavailable', !available);
    });
    this.elements.consentSetup.classList.toggle(
      'hidden',
      !preferredCategory || hasRawSavedState(preferredCategory)
    );
  }

  commitConsent(nextGrants) {
    acceptProviderDisclosure();
    const removed = Array.from(this.grants).some((category) => !nextGrants.has(category));
    this.grants = setSessionGrants(nextGrants);
    nextGrants.forEach((category) => this.pendingSetupCategories.delete(category));
    if (removed) {
      this.stopGeneration('interrupted');
      this.activeToolResults = [];
    }
    this.elements.mode.textContent = this.grants.size
      ? translate('ai.personalMode', FALLBACKS['ai.personalMode'])
      : translate('ai.generalMode', FALLBACKS['ai.generalMode']);
    const prompt = this.pendingPrompt;
    this.closeConsent({ restoreFocus: !prompt });
    if (prompt) this.sendMessage(prompt);
  }

  closeConsent({ restoreFocus = true } = {}) {
    this.elements.consentOverlay.classList.add('hidden');
    document.body.classList.remove('ai-dialog-open');
    this.pendingPrompt = null;
    this.pendingConsentCategory = '';
    if (restoreFocus) this.lastFocused?.focus?.({ preventScroll: true });
  }

  trapDialogFocus(event, dialog, close) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      dialog.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async requestNewChat() {
    if (this.busy) this.stopGeneration('interrupted');
    if (!this.messages.length) {
      this.clearChat();
      return;
    }
    this.confirmMode = 'new-chat';
    this.confirmReturnFocus = this.elements.newChat;
    this.elements.confirmTitle.textContent = translate(
      'ai.newChatConfirmTitle',
      FALLBACKS['ai.newChatConfirmTitle']
    );
    this.elements.confirmBody.textContent = translate(
      'ai.newChatConfirmBody',
      FALLBACKS['ai.newChatConfirmBody']
    );
    this.elements.confirmBody.classList.remove('hidden');
    this.elements.lineupCompare.classList.add('hidden');
    this.elements.confirmLocalNote.classList.add('hidden');
    this.elements.confirmApply.textContent = translate('ai.clearChat', FALLBACKS['ai.clearChat']);
    this.openConfirm();
  }

  clearChat() {
    this.stopGeneration('interrupted');
    this.messages = [];
    clearVisibleHistory();
    clearSessionGrants();
    this.grants = new Set();
    this.activeToolResults = [];
    this.pendingSetupCategories.clear();
    this.hideError();
    this.clearStatus();
    this.renderTranscript();
    this.syncConsentUi();
    this.elements.mode.textContent = translate('ai.generalMode', FALLBACKS['ai.generalMode']);
    this.closeConfirm({ restoreFocus: false });
    this.elements.composer.focus({ preventScroll: true });
  }

  async runMessageAction(action) {
    if (!action) return;
    if (action.type === 'navigate') {
      this.navigate(action.tab);
    } else if (action.type === 'navigate-page') {
      globalThis.location.assign(action.href);
    } else if (action.type === 'use-generator') {
      const current = await readCurrentGeneratorSelection();
      this.confirmMode = 'use-generator';
      this.confirmLineup = action.heroes;
      this.confirmReturnFocus = document.activeElement;
      this.elements.confirmTitle.textContent = translate(
        'ai.action.useGeneratorTitle',
        FALLBACKS['ai.action.useGeneratorTitle']
      );
      this.elements.currentLineup.textContent = current.length ? current.join(' / ') : '—';
      this.elements.proposedLineup.textContent = action.heroes.join(' / ');
      this.elements.confirmBody.classList.add('hidden');
      this.elements.lineupCompare.classList.remove('hidden');
      this.elements.confirmLocalNote.classList.remove('hidden');
      this.elements.confirmApply.textContent = translate(
        'ai.action.confirmUse',
        FALLBACKS['ai.action.confirmUse']
      );
      this.openConfirm();
    }
  }

  navigate(tab) {
    if (!tab) return;
    if (typeof globalThis.vtsSwitchTab === 'function') {
      globalThis.vtsSwitchTab(tab, true, { scrollToSection: true });
      return;
    }
    globalThis.location.assign(`index.html#${encodeURIComponent(tab)}`);
  }

  openConfirm() {
    this.elements.confirmOverlay.classList.remove('hidden');
    document.body.classList.add('ai-dialog-open');
    requestAnimationFrame(() => this.elements.confirmDialog.focus({ preventScroll: true }));
  }

  closeConfirm({ restoreFocus = true } = {}) {
    this.elements.confirmOverlay.classList.add('hidden');
    document.body.classList.remove('ai-dialog-open');
    this.confirmMode = '';
    this.confirmLineup = null;
    if (restoreFocus) this.confirmReturnFocus?.focus?.({ preventScroll: true });
  }

  async applyConfirmation() {
    if (this.confirmMode === 'new-chat') {
      this.clearChat();
      return;
    }
    if (this.confirmMode !== 'use-generator' || !this.confirmLineup) return;
    const lineup = [...this.confirmLineup];
    this.elements.confirmApply.disabled = true;
    try {
      await applyConfirmedGeneratorSelection(lineup);
      this.closeConfirm({ restoreFocus: false });
    } finally {
      this.elements.confirmApply.disabled = false;
    }
  }

  notifyVisibility(isActive) {
    this.tabVisible = Boolean(isActive);
    if (this.tabVisible && this.userNearBottom) this.scrollToLatest();
  }

  focusComposer() {
    this.elements.composer?.focus({ preventScroll: true });
  }
}

export function initAiAssistant(root = document.getElementById('aiAssistantRoot')) {
  if (!root) throw new Error('AI Assistant template must load before its module.');
  if (activeController?.root === root) return activeController;
  activeController = new AiAssistantController(root);
  return activeController;
}

export function focusAiComposer() {
  activeController?.focusComposer();
}

export function notifyAiTabVisibility(isActive) {
  activeController?.notifyVisibility(isActive);
}

export function notifyAiLanguageChange() {
  activeController?.refreshLocalizedChrome();
}
