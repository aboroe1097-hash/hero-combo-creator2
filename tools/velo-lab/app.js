const STORAGE_KEY = 'vts_velo_lab_v1';
const STATE_VERSION = 1;

const elements = Object.fromEntries(
  [
    'newSessionBtn',
    'sessionCount',
    'sessionList',
    'testCount',
    'testList',
    'clearDataBtn',
    'sessionTitle',
    'modelBadge',
    'responseMetric',
    'emptyState',
    'emptyFocusBtn',
    'messageList',
    'chatError',
    'composerForm',
    'composerInput',
    'composerCount',
    'sendBtn',
    'refreshStatusBtn',
    'providerStatus',
    'modelSelect',
    'installHint',
    'experimentInput',
    'resetExperimentBtn',
    'knowledgeToggle',
    'knowledgeMeta',
    'correctionsToggle',
    'correctionCount',
    'temperatureInput',
    'temperatureOutput',
    'promptMeta',
    'promptPreview',
    'reloadPromptBtn',
    'selectedTurnLabel',
    'preferredAnswerInput',
    'correctionNoteInput',
    'saveCorrectionBtn',
    'mustIncludeInput',
    'mustNotIncludeInput',
    'saveTestBtn',
    'runTestsBtn',
    'evaluationSummary',
    'exportBtn',
    'importInput',
    'footerProvider',
    'footerStorage',
  ].map((id) => [id, document.getElementById(id)])
);

function id(prefix) {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random()}`}`;
}

function defaultState() {
  const now = new Date().toISOString();
  const session = {
    id: id('session'),
    title: 'New Velo session',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  return {
    version: STATE_VERSION,
    activeSessionId: session.id,
    sessions: [session],
    corrections: [],
    tests: [],
    settings: {
      model: '',
      experimentInstruction: '',
      includeKnowledge: true,
      useCorrections: true,
      temperature: 0.3,
    },
  };
}

function normalizeState(value) {
  const fallback = defaultState();
  if (!value || typeof value !== 'object' || value.version !== STATE_VERSION) return fallback;
  const sessions = Array.isArray(value.sessions)
    ? value.sessions
        .slice(-50)
        .map((session) => ({
          id: String(session?.id || id('session')).slice(0, 100),
          title: String(session?.title || 'Velo session').slice(0, 80),
          createdAt: String(session?.createdAt || new Date().toISOString()),
          updatedAt: String(session?.updatedAt || new Date().toISOString()),
          messages: Array.isArray(session?.messages)
            ? session.messages.slice(-100).map((message) => ({
                id: String(message?.id || id('message')).slice(0, 100),
                role: message?.role === 'assistant' ? 'assistant' : 'user',
                content: String(message?.content || '').slice(0, 32_000),
                createdAt: String(message?.createdAt || new Date().toISOString()),
                meta: message?.meta && typeof message.meta === 'object' ? message.meta : {},
              }))
            : [],
        }))
        .filter((session) => session.id)
    : [];
  if (!sessions.length) return fallback;
  const settings = value.settings && typeof value.settings === 'object' ? value.settings : {};
  return {
    version: STATE_VERSION,
    activeSessionId: sessions.some((session) => session.id === value.activeSessionId)
      ? value.activeSessionId
      : sessions[0].id,
    sessions,
    corrections: Array.isArray(value.corrections) ? value.corrections.slice(-200) : [],
    tests: Array.isArray(value.tests) ? value.tests.slice(-100) : [],
    settings: {
      model: String(settings.model || '').slice(0, 120),
      experimentInstruction: String(settings.experimentInstruction || '').slice(0, 4_000),
      includeKnowledge: settings.includeKnowledge !== false,
      useCorrections: settings.useCorrections !== false,
      temperature: Math.max(0, Math.min(2, Number(settings.temperature) || 0)),
    },
  };
}

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return defaultState();
  }
}

let state = loadState();
let config = null;
let provider = { ok: false, models: [] };
let busy = false;
let selectedAssistantId = '';

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    elements.footerStorage.textContent = `Local storage: ${Math.ceil(
      new Blob([JSON.stringify(state)]).size / 1024
    )} KB`;
  } catch {
    elements.footerStorage.textContent = 'Local storage unavailable';
  }
}

function activeSession() {
  return (
    state.sessions.find((session) => session.id === state.activeSessionId) || state.sessions[0]
  );
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function truncate(value, maximum = 42) {
  const text = String(value || '')
    .replace(/\s+/gu, ' ')
    .trim();
  return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
}

function clearNode(node) {
  node.replaceChildren();
}

function makeButton(label, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function renderSessions() {
  clearNode(elements.sessionList);
  elements.sessionCount.textContent = String(state.sessions.length);
  for (const session of [...state.sessions].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `session-button${session.id === state.activeSessionId ? ' is-active' : ''}`;
    const title = document.createElement('strong');
    title.textContent = session.title;
    const time = document.createElement('small');
    time.textContent = formatTime(session.updatedAt);
    const remove = document.createElement('span');
    remove.className = 'session-delete';
    remove.setAttribute('aria-hidden', 'true');
    remove.textContent = '×';
    button.append(title, time, remove);
    button.addEventListener('click', (event) => {
      if (event.target === remove) {
        deleteSession(session.id);
        return;
      }
      state.activeSessionId = session.id;
      selectedAssistantId = '';
      persist();
      renderAll();
    });
    item.append(button);
    elements.sessionList.append(item);
  }
}

function splitCriteria(value) {
  return String(value || '')
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function renderTests() {
  clearNode(elements.testList);
  elements.testCount.textContent = String(state.tests.length);
  for (const testCase of state.tests) {
    const row = document.createElement('div');
    row.className = `test-row${testCase.lastResult ? ` is-${testCase.lastResult}` : ''}`;
    const status = document.createElement('span');
    status.className = 'test-row__status';
    status.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.className = 'test-row__copy';
    const title = document.createElement('strong');
    title.textContent = truncate(testCase.prompt, 30);
    const detail = document.createElement('small');
    detail.textContent = testCase.lastResult
      ? `${testCase.lastResult === 'passed' ? 'Passed' : 'Failed'} · ${formatTime(testCase.lastRunAt)}`
      : `${(testCase.mustInclude || []).length} required · ${(testCase.mustNotInclude || []).length} forbidden`;
    copy.append(title, detail);
    const remove = makeButton('×', 'test-delete', () => {
      state.tests = state.tests.filter((entry) => entry.id !== testCase.id);
      persist();
      renderTests();
    });
    remove.setAttribute('aria-label', `Delete evaluation: ${truncate(testCase.prompt, 40)}`);
    row.append(status, copy, remove);
    elements.testList.append(row);
  }
}

function findPromptForAssistant(session, assistantId) {
  const index = session.messages.findIndex((message) => message.id === assistantId);
  if (index < 1) return null;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (session.messages[cursor].role === 'user') return session.messages[cursor];
  }
  return null;
}

function selectAssistant(message) {
  const session = activeSession();
  const prompt = findPromptForAssistant(session, message.id);
  if (!prompt) return;
  selectedAssistantId = message.id;
  elements.selectedTurnLabel.textContent = truncate(prompt.content, 34);
  const existing = state.corrections.find((entry) => entry.assistantId === message.id);
  elements.preferredAnswerInput.value = existing?.preferred || message.content;
  elements.correctionNoteInput.value = existing?.note || '';
  elements.mustIncludeInput.value = '';
  elements.mustNotIncludeInput.value = '';
  renderMessages();
  elements.preferredAnswerInput.focus();
}

function saveGoodExample(message) {
  const session = activeSession();
  const prompt = findPromptForAssistant(session, message.id);
  if (!prompt) return;
  const next = {
    id: id('correction'),
    assistantId: message.id,
    prompt: prompt.content,
    original: message.content,
    preferred: message.content,
    note: 'Marked as a good Velo answer.',
    rating: 'good',
    createdAt: new Date().toISOString(),
  };
  state.corrections = state.corrections.filter((entry) => entry.assistantId !== message.id);
  state.corrections.push(next);
  persist();
  renderSettings();
  renderMessages();
}

function renderMessages() {
  const session = activeSession();
  clearNode(elements.messageList);
  const hasMessages = session.messages.length > 0;
  elements.emptyState.classList.toggle('hidden', hasMessages);
  elements.messageList.classList.toggle('hidden', !hasMessages);
  for (const message of session.messages) {
    const item = document.createElement('li');
    item.className = `message message--${message.role}`;
    const avatar = document.createElement('span');
    avatar.className = 'message__avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = message.role === 'assistant' ? 'V' : 'YOU';
    const content = document.createElement('div');
    content.className = 'message__content';
    const meta = document.createElement('div');
    meta.className = 'message__meta';
    const author = document.createElement('strong');
    author.textContent = message.role === 'assistant' ? 'Velo' : 'You';
    const timestamp = document.createElement('span');
    timestamp.textContent = formatTime(message.createdAt);
    meta.append(author, timestamp);
    const bubble = document.createElement('div');
    bubble.className = 'message__bubble';
    bubble.textContent = message.content;
    content.append(meta, bubble);
    if (message.role === 'assistant') {
      const actions = document.createElement('div');
      actions.className = 'message__actions';
      const good = state.corrections.some(
        (entry) => entry.assistantId === message.id && entry.rating === 'good'
      );
      const goodButton = makeButton('Good answer', good ? 'is-selected' : '', () =>
        saveGoodExample(message)
      );
      const teachButton = makeButton(
        'Needs work',
        selectedAssistantId === message.id ? 'is-selected' : '',
        () => selectAssistant(message)
      );
      actions.append(goodButton, teachButton);
      content.append(actions);
    }
    item.append(avatar, content);
    elements.messageList.append(item);
  }
  if (busy) {
    const pending = document.createElement('li');
    pending.className = 'message message--assistant message--pending';
    const avatar = document.createElement('span');
    avatar.className = 'message__avatar';
    avatar.textContent = 'V';
    const content = document.createElement('div');
    content.className = 'message__content';
    const bubble = document.createElement('div');
    bubble.className = 'message__bubble';
    bubble.textContent = 'Velo is nudging his helmet into place and thinking…';
    content.append(bubble);
    pending.append(avatar, content);
    elements.messageList.append(pending);
  }
  elements.sessionTitle.textContent = session.title;
  elements.messageList.scrollTop = elements.messageList.scrollHeight;
}

function renderSettings() {
  elements.experimentInput.value = state.settings.experimentInstruction;
  elements.knowledgeToggle.checked = state.settings.includeKnowledge;
  elements.correctionsToggle.checked = state.settings.useCorrections;
  elements.temperatureInput.value = String(state.settings.temperature);
  elements.temperatureOutput.value = String(state.settings.temperature.toFixed(1));
  elements.correctionCount.textContent = `${state.corrections.length} teaching example${
    state.corrections.length === 1 ? '' : 's'
  }`;
  elements.modelBadge.textContent = state.settings.model || 'No model';
}

function renderAll() {
  renderSessions();
  renderTests();
  renderMessages();
  renderSettings();
  persist();
}

function newSession() {
  const now = new Date().toISOString();
  const session = {
    id: id('session'),
    title: 'New Velo session',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  state.sessions.push(session);
  state.activeSessionId = session.id;
  selectedAssistantId = '';
  persist();
  renderAll();
  elements.composerInput.focus();
}

function deleteSession(sessionId) {
  if (state.sessions.length === 1) {
    newSession();
  }
  state.sessions = state.sessions.filter((session) => session.id !== sessionId);
  if (!state.sessions.some((session) => session.id === state.activeSessionId)) {
    state.activeSessionId = state.sessions.at(-1)?.id || '';
  }
  selectedAssistantId = '';
  persist();
  renderAll();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request failed (${response.status}).`);
  return payload;
}

async function refreshProviderStatus() {
  elements.providerStatus.className = 'provider-status is-checking';
  elements.providerStatus.querySelector('span:last-child').textContent = 'Checking local service…';
  provider = await api('/api/status').catch((error) => ({
    ok: false,
    models: [],
    error: error.message,
    defaultModel: 'qwen3:8b',
    installCommand: 'ollama pull qwen3:8b',
  }));
  const statusText = elements.providerStatus.querySelector('span:last-child');
  elements.providerStatus.className = `provider-status ${provider.ok ? 'is-ready' : 'is-error'}`;
  statusText.textContent = provider.ok
    ? provider.models.length
      ? `${provider.models.length} local model${provider.models.length === 1 ? '' : 's'} ready`
      : 'Ollama is running; install a model'
    : provider.error || 'Ollama is not available';
  clearNode(elements.modelSelect);
  const models = provider.models.length ? provider.models : [provider.defaultModel || 'qwen3:8b'];
  for (const model of models) {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    elements.modelSelect.append(option);
  }
  if (!models.includes(state.settings.model)) state.settings.model = models[0];
  elements.modelSelect.value = state.settings.model;
  elements.installHint.classList.toggle('hidden', !provider.installCommand);
  elements.installHint.textContent = provider.installCommand || '';
  elements.sendBtn.disabled = busy || !provider.ok || !provider.models.length;
  elements.runTestsBtn.disabled = busy || !provider.ok || !provider.models.length;
  elements.responseMetric.textContent = provider.ok
    ? provider.models.length
      ? 'Ready'
      : 'Model required'
    : 'Offline';
  elements.footerProvider.textContent = `Provider: Ollama · ${provider.ok ? 'local' : 'offline'}`;
  persist();
  renderSettings();
}

async function refreshConfig() {
  config = await api('/api/config');
  elements.promptPreview.textContent = config.prompt;
  elements.promptMeta.textContent = `${config.promptCharacters.toLocaleString()} chars`;
  elements.knowledgeMeta.textContent = `${config.knowledgeEntries} entries · ${config.knowledgeVersion}`;
}

function teachingExamples() {
  if (!state.settings.useCorrections) return [];
  return state.corrections
    .filter((entry) => entry.prompt && entry.preferred)
    .slice(-12)
    .map((entry) => ({ prompt: entry.prompt, preferred: entry.preferred }));
}

async function requestVelo(messages) {
  return api('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: state.settings.model,
      messages: messages.map(({ role, content }) => ({ role, content })),
      experimentInstruction: state.settings.experimentInstruction,
      includeKnowledge: state.settings.includeKnowledge,
      teachingExamples: teachingExamples(),
      temperature: state.settings.temperature,
    }),
  });
}

function setError(message = '') {
  elements.chatError.textContent = message;
  elements.chatError.classList.toggle('hidden', !message);
}

function setBusy(next) {
  busy = next;
  elements.sendBtn.disabled = next || !provider.ok || !provider.models.length;
  elements.runTestsBtn.disabled = next || !provider.ok || !provider.models.length;
  elements.composerInput.disabled = next;
  renderMessages();
}

async function sendMessage(text) {
  const prompt = String(text || '').trim();
  if (!prompt || busy) return;
  if (!provider.models.length) {
    setError(`Install a local model first: ${provider.installCommand || 'ollama pull qwen3:8b'}`);
    return;
  }
  const session = activeSession();
  const now = new Date().toISOString();
  session.messages.push({
    id: id('message'),
    role: 'user',
    content: prompt,
    createdAt: now,
    meta: {},
  });
  if (session.messages.filter((message) => message.role === 'user').length === 1) {
    session.title = truncate(prompt, 54) || 'Velo session';
  }
  session.updatedAt = now;
  elements.composerInput.value = '';
  updateComposerCount();
  setError();
  setBusy(true);
  persist();
  renderSessions();
  try {
    const result = await requestVelo(session.messages);
    session.messages.push({
      id: id('message'),
      role: 'assistant',
      content: result.message || '(Ollama returned an empty answer.)',
      createdAt: new Date().toISOString(),
      meta: {
        model: result.model,
        responseMs: result.responseMs,
        promptTokens: result.promptTokens,
        responseTokens: result.responseTokens,
        knowledgeIds: result.knowledgeIds,
      },
    });
    session.updatedAt = new Date().toISOString();
    elements.responseMetric.textContent = `${(result.responseMs / 1000).toFixed(1)}s · ${
      result.responseTokens
    } tokens`;
  } catch (error) {
    setError(error.message);
  } finally {
    setBusy(false);
    persist();
    renderAll();
    elements.composerInput.focus();
  }
}

function selectedPromptAndAnswer() {
  const session = activeSession();
  const assistant = session.messages.find((message) => message.id === selectedAssistantId);
  const prompt = assistant ? findPromptForAssistant(session, assistant.id) : null;
  if (assistant && prompt) return { prompt, assistant };
  const user = [...session.messages].reverse().find((message) => message.role === 'user');
  return user ? { prompt: user, assistant: null } : null;
}

function saveCorrection() {
  const selected = selectedPromptAndAnswer();
  const preferred = elements.preferredAnswerInput.value.trim();
  if (!selected?.assistant) {
    setError('Select a Velo answer with “Needs work” first.');
    return;
  }
  if (!preferred) {
    setError('Write the preferred Velo answer before saving the correction.');
    return;
  }
  const correction = {
    id: id('correction'),
    assistantId: selected.assistant.id,
    prompt: selected.prompt.content,
    original: selected.assistant.content,
    preferred,
    note: elements.correctionNoteInput.value.trim().slice(0, 500),
    rating: 'corrected',
    createdAt: new Date().toISOString(),
  };
  state.corrections = state.corrections.filter(
    (entry) => entry.assistantId !== selected.assistant.id
  );
  state.corrections.push(correction);
  setError();
  persist();
  renderSettings();
  renderMessages();
  elements.selectedTurnLabel.textContent = 'Correction saved locally';
}

function saveTestCase() {
  const selected = selectedPromptAndAnswer();
  if (!selected?.prompt) {
    setError('Send or select a user prompt before saving an evaluation case.');
    return;
  }
  const mustInclude = splitCriteria(elements.mustIncludeInput.value);
  const mustNotInclude = splitCriteria(elements.mustNotIncludeInput.value);
  if (!mustInclude.length && !mustNotInclude.length) {
    setError('Add at least one required or forbidden phrase.');
    return;
  }
  state.tests.push({
    id: id('test'),
    prompt: selected.prompt.content,
    mustInclude,
    mustNotInclude,
    createdAt: new Date().toISOString(),
    lastResult: '',
    lastRunAt: '',
    lastResponse: '',
    failures: [],
  });
  elements.mustIncludeInput.value = '';
  elements.mustNotIncludeInput.value = '';
  setError();
  persist();
  renderTests();
}

function evaluateText(answer, testCase) {
  const normalized = String(answer || '').toLocaleLowerCase();
  const missing = (testCase.mustInclude || []).filter(
    (phrase) => !normalized.includes(String(phrase).toLocaleLowerCase())
  );
  const forbidden = (testCase.mustNotInclude || []).filter((phrase) =>
    normalized.includes(String(phrase).toLocaleLowerCase())
  );
  return {
    passed: missing.length === 0 && forbidden.length === 0,
    failures: [
      ...missing.map((phrase) => `Missing: ${phrase}`),
      ...forbidden.map((phrase) => `Forbidden: ${phrase}`),
    ],
  };
}

async function runEvaluations() {
  if (!state.tests.length || busy) {
    elements.evaluationSummary.textContent = state.tests.length
      ? 'An evaluation is already running.'
      : 'Save at least one evaluation case first.';
    return;
  }
  setBusy(true);
  elements.evaluationSummary.className = 'evaluation-summary';
  let passed = 0;
  try {
    for (let index = 0; index < state.tests.length; index += 1) {
      const testCase = state.tests[index];
      elements.evaluationSummary.textContent = `Running ${index + 1} of ${state.tests.length}: ${truncate(
        testCase.prompt,
        38
      )}`;
      try {
        const result = await requestVelo([{ role: 'user', content: testCase.prompt }]);
        const evaluation = evaluateText(result.message, testCase);
        testCase.lastResult = evaluation.passed ? 'passed' : 'failed';
        testCase.lastResponse = result.message;
        testCase.failures = evaluation.failures;
        if (evaluation.passed) passed += 1;
      } catch (error) {
        testCase.lastResult = 'failed';
        testCase.lastResponse = '';
        testCase.failures = [error.message];
      }
      testCase.lastRunAt = new Date().toISOString();
      persist();
      renderTests();
    }
    elements.evaluationSummary.textContent = `${passed}/${state.tests.length} evaluation cases passed.`;
    elements.evaluationSummary.className = `evaluation-summary ${
      passed === state.tests.length ? 'is-passed' : 'is-failed'
    }`;
  } finally {
    setBusy(false);
    persist();
  }
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    source: 'Velo Lab local export',
    promptCharacters: config?.promptCharacters || 0,
    knowledgeVersion: config?.knowledgeVersion || '',
    state,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `velo-lab-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    state = normalizeState(payload?.state || payload);
    selectedAssistantId = '';
    persist();
    renderAll();
    setError();
  } catch {
    setError('That file is not a valid Velo Lab export.');
  } finally {
    elements.importInput.value = '';
  }
}

function updateComposerCount() {
  const length = elements.composerInput.value.length;
  elements.composerCount.textContent = `${length} / 8000`;
}

elements.newSessionBtn.addEventListener('click', newSession);
elements.emptyFocusBtn.addEventListener('click', () => elements.composerInput.focus());
elements.composerInput.addEventListener('input', updateComposerCount);
elements.composerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void sendMessage(elements.composerInput.value);
});
elements.refreshStatusBtn.addEventListener('click', () => void refreshProviderStatus());
elements.modelSelect.addEventListener('change', () => {
  state.settings.model = elements.modelSelect.value;
  persist();
  renderSettings();
});
elements.experimentInput.addEventListener('input', () => {
  state.settings.experimentInstruction = elements.experimentInput.value;
  persist();
});
elements.resetExperimentBtn.addEventListener('click', () => {
  state.settings.experimentInstruction = '';
  elements.experimentInput.value = '';
  persist();
});
elements.knowledgeToggle.addEventListener('change', () => {
  state.settings.includeKnowledge = elements.knowledgeToggle.checked;
  persist();
});
elements.correctionsToggle.addEventListener('change', () => {
  state.settings.useCorrections = elements.correctionsToggle.checked;
  persist();
});
elements.temperatureInput.addEventListener('input', () => {
  state.settings.temperature = Number(elements.temperatureInput.value);
  elements.temperatureOutput.value = state.settings.temperature.toFixed(1);
  persist();
});
elements.reloadPromptBtn.addEventListener('click', () => void refreshConfig());
elements.saveCorrectionBtn.addEventListener('click', saveCorrection);
elements.saveTestBtn.addEventListener('click', saveTestCase);
elements.runTestsBtn.addEventListener('click', () => void runEvaluations());
elements.exportBtn.addEventListener('click', exportData);
elements.importInput.addEventListener(
  'change',
  () => void importData(elements.importInput.files?.[0])
);
elements.clearDataBtn.addEventListener('click', () => {
  if (!globalThis.confirm('Delete every local Velo Lab session, correction, and evaluation?'))
    return;
  state = defaultState();
  selectedAssistantId = '';
  persist();
  renderAll();
});

renderAll();
updateComposerCount();
await Promise.all([
  refreshProviderStatus(),
  refreshConfig().catch((error) => setError(error.message)),
]);
