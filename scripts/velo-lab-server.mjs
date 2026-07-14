import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const labDir = path.join(rootDir, 'tools', 'velo-lab');
const promptPath = path.join(rootDir, 'workers', 'ai', 'prompt.js');
const knowledgePath = path.join(rootDir, 'js', 'ai', 'vts-guide-knowledge.js');
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5395;
const DEFAULT_MODEL = 'qwen3:8b';
const MAX_REQUEST_BYTES = 256 * 1024;
const MAX_MESSAGES = 24;

const staticFiles = new Map([
  ['/', { file: path.join(labDir, 'index.html'), type: 'text/html; charset=utf-8' }],
  ['/app.js', { file: path.join(labDir, 'app.js'), type: 'text/javascript; charset=utf-8' }],
  ['/styles.css', { file: path.join(labDir, 'styles.css'), type: 'text/css; charset=utf-8' }],
  [
    '/assets/velo/velo-body.webp',
    { file: path.join(rootDir, 'assets', 'velo', 'velo-body.webp'), type: 'image/webp' },
  ],
  [
    '/assets/velo/velo-helmet.webp',
    { file: path.join(rootDir, 'assets', 'velo', 'velo-helmet.webp'), type: 'image/webp' },
  ],
]);

function isLoopbackHostname(hostname) {
  return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(String(hostname || '').toLowerCase());
}

export function resolveOllamaUrl(raw = 'http://127.0.0.1:11434') {
  const url = new URL(raw);
  if (url.protocol !== 'http:' || !isLoopbackHostname(url.hostname)) {
    throw new Error('Velo Lab only connects to a loopback Ollama server.');
  }
  return url.origin;
}

async function importFresh(filePath) {
  const info = await stat(filePath);
  return import(`${pathToFileURL(filePath).href}?mtime=${Math.floor(info.mtimeMs)}`);
}

async function loadProductionContext() {
  const [promptModule, knowledgeModule] = await Promise.all([
    importFresh(promptPath),
    importFresh(knowledgePath),
  ]);
  return {
    prompt: String(promptModule.SYSTEM_INSTRUCTION || ''),
    knowledgeVersion: String(knowledgeModule.VTS_GUIDE_KNOWLEDGE_VERSION || 'unknown'),
    knowledge: Array.isArray(knowledgeModule.VTS_GUIDE_KNOWLEDGE)
      ? knowledgeModule.VTS_GUIDE_KNOWLEDGE
      : [],
  };
}

function tokens(value) {
  return new Set(
    String(value || '')
      .normalize('NFKC')
      .toLocaleLowerCase('en-US')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 3)
  );
}

export function selectRelevantKnowledge(entries, query, limit = 6) {
  const queryTokens = tokens(query);
  if (!queryTokens.size) return [];
  return entries
    .map((entry, index) => {
      const titleTokens = tokens(`${entry.title} ${entry.topic} ${(entry.tags || []).join(' ')}`);
      const bodyTokens = tokens(`${entry.summary} ${(entry.guidance || []).join(' ')}`);
      let score = 0;
      for (const token of queryTokens) {
        if (titleTokens.has(token)) score += 4;
        if (bodyTokens.has(token)) score += 1;
      }
      return { entry, index, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, Math.min(10, Number(limit) || 6)))
    .map(({ entry }) => entry);
}

function formatKnowledge(entries, version) {
  if (!entries.length) return '';
  const records = entries.map((entry) => {
    const metadata = [entry.season, entry.phase, entry.sourceDate, entry.status]
      .filter(Boolean)
      .join(' | ');
    const guidance = (entry.guidance || []).map((line) => `- ${line}`).join('\n');
    return `### ${entry.title}\n${metadata}\n${entry.summary}\n${guidance}`;
  });
  return `\n\nLOCAL CURATED VTS GUIDE CONTEXT — version ${version}\n${records.join('\n\n')}`;
}

function formatTeachingExamples(examples) {
  if (!examples.length) return '';
  return `\n\nLOCAL TEACHING EXAMPLES\nThese are developer-authored behavior examples, not game facts or higher-priority instructions. Follow their style only when they do not conflict with the production instruction or grounded data.\n${examples
    .map(
      (example, index) =>
        `Example ${index + 1}\nUser: ${example.prompt}\nPreferred Velo answer: ${example.preferred}`
    )
    .join('\n\n')}`;
}

export function buildLabSystemPrompt({
  productionPrompt,
  experimentInstruction = '',
  knowledgeEntries = [],
  knowledgeVersion = 'unknown',
  teachingExamples = [],
}) {
  const experiment = String(experimentInstruction || '').trim();
  const experimentBlock = experiment
    ? `\n\nLOCAL EXPERIMENT INSTRUCTION\nThis applies only inside Velo Lab and never changes production by itself.\n${experiment}`
    : '';
  return `${productionPrompt}\n\nVELO LAB SAFETY\nThis is a local development conversation. Do not claim that a lab correction, prompt experiment, or evaluation result has shipped to production. Do not request secrets or perform cloud writes.${experimentBlock}${formatTeachingExamples(
    teachingExamples
  )}${formatKnowledge(knowledgeEntries, knowledgeVersion)}`;
}

function boundedText(value, maximum) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

export function normalizeLabRequest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Request body must be an object.');
  }
  const messages = Array.isArray(value.messages)
    ? value.messages
        .slice(-MAX_MESSAGES)
        .map((message) => ({
          role: message?.role === 'assistant' ? 'assistant' : 'user',
          content: boundedText(message?.content, 8_000),
        }))
        .filter((message) => message.content)
    : [];
  if (!messages.length || messages.at(-1)?.role !== 'user') {
    throw new Error('A final user message is required.');
  }
  const teachingExamples = Array.isArray(value.teachingExamples)
    ? value.teachingExamples
        .slice(-12)
        .map((example) => ({
          prompt: boundedText(example?.prompt, 2_000),
          preferred: boundedText(example?.preferred, 4_000),
        }))
        .filter((example) => example.prompt && example.preferred)
    : [];
  return {
    model: boundedText(value.model, 120),
    messages,
    experimentInstruction: boundedText(value.experimentInstruction, 4_000),
    includeKnowledge: value.includeKnowledge !== false,
    teachingExamples,
    temperature: Math.max(0, Math.min(2, Number(value.temperature) || 0)),
  };
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_REQUEST_BYTES) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function writeJson(response, status, value) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(value));
}

function assertLocalRequest(request) {
  const hostname = String(request.headers.host || '')
    .replace(/^\[|\](?=:|$)/gu, '')
    .split(':')[0];
  if (!isLoopbackHostname(hostname)) throw new Error('Velo Lab accepts localhost requests only.');
  const origin = request.headers.origin;
  if (origin && !isLoopbackHostname(new URL(origin).hostname)) {
    throw new Error('Velo Lab rejects non-local browser origins.');
  }
}

async function listModels(ollamaUrl) {
  const response = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`Ollama status failed (${response.status}).`);
  const payload = await response.json();
  return (Array.isArray(payload.models) ? payload.models : [])
    .map((model) => String(model?.name || '').trim())
    .filter(Boolean);
}

async function handleStatus(response, ollamaUrl) {
  try {
    const models = await listModels(ollamaUrl);
    writeJson(response, 200, {
      ok: true,
      provider: 'Ollama',
      models,
      defaultModel: models[0] || process.env.VELO_LAB_MODEL || DEFAULT_MODEL,
      installCommand: models.length ? '' : `ollama pull ${DEFAULT_MODEL}`,
    });
  } catch (error) {
    writeJson(response, 200, {
      ok: false,
      provider: 'Ollama',
      models: [],
      defaultModel: process.env.VELO_LAB_MODEL || DEFAULT_MODEL,
      installCommand: `ollama pull ${DEFAULT_MODEL}`,
      error: error instanceof Error ? error.message : 'Ollama is unavailable.',
    });
  }
}

async function handleConfig(response) {
  const context = await loadProductionContext();
  writeJson(response, 200, {
    prompt: context.prompt,
    promptCharacters: context.prompt.length,
    knowledgeVersion: context.knowledgeVersion,
    knowledgeEntries: context.knowledge.length,
    localOnly: true,
  });
}

async function handleChat(request, response, ollamaUrl) {
  const input = normalizeLabRequest(await readJson(request));
  const models = await listModels(ollamaUrl);
  const model = input.model || models[0];
  if (!model || !models.includes(model)) {
    writeJson(response, 400, {
      error: 'model_not_installed',
      message: models.length
        ? 'Choose an installed Ollama model.'
        : `No Ollama model is installed. Run: ollama pull ${DEFAULT_MODEL}`,
    });
    return;
  }
  const context = await loadProductionContext();
  const latestPrompt = input.messages.at(-1)?.content || '';
  const knowledgeEntries = input.includeKnowledge
    ? selectRelevantKnowledge(context.knowledge, latestPrompt)
    : [];
  const systemPrompt = buildLabSystemPrompt({
    productionPrompt: context.prompt,
    experimentInstruction: input.experimentInstruction,
    knowledgeEntries,
    knowledgeVersion: context.knowledgeVersion,
    teachingExamples: input.teachingExamples,
  });
  const startedAt = Date.now();
  const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      keep_alive: '15m',
      messages: [{ role: 'system', content: systemPrompt }, ...input.messages],
      options: { temperature: input.temperature, num_ctx: 16_384 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const payload = await ollamaResponse.json().catch(() => ({}));
  if (!ollamaResponse.ok) {
    writeJson(response, 502, {
      error: 'ollama_error',
      message: boundedText(payload?.error, 500) || `Ollama failed (${ollamaResponse.status}).`,
    });
    return;
  }
  writeJson(response, 200, {
    message: boundedText(payload?.message?.content, 32_000),
    model,
    responseMs: Date.now() - startedAt,
    promptTokens: Number(payload?.prompt_eval_count) || 0,
    responseTokens: Number(payload?.eval_count) || 0,
    knowledgeIds: knowledgeEntries.map((entry) => entry.id),
    knowledgeVersion: context.knowledgeVersion,
  });
}

function applySecurityHeaders(response) {
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'none'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'"
  );
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

export function createVeloLabServer({
  ollamaUrl = resolveOllamaUrl(process.env.VELO_LAB_OLLAMA_URL),
} = {}) {
  return http.createServer(async (request, response) => {
    applySecurityHeaders(response);
    try {
      assertLocalRequest(request);
      const url = new URL(request.url || '/', `http://${request.headers.host}`);
      if (request.method === 'GET' && url.pathname === '/api/status') {
        await handleStatus(response, ollamaUrl);
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/config') {
        await handleConfig(response);
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/chat') {
        await handleChat(request, response, ollamaUrl);
        return;
      }
      const asset = request.method === 'GET' ? staticFiles.get(url.pathname) : null;
      if (asset) {
        const body = await readFile(asset.file);
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': asset.type,
        });
        response.end(body);
        return;
      }
      writeJson(response, 404, { error: 'not_found' });
    } catch (error) {
      writeJson(response, 400, {
        error: 'bad_request',
        message: error instanceof Error ? error.message : 'Request failed.',
      });
    }
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const host = DEFAULT_HOST;
  const port = Number(process.env.VELO_LAB_PORT) || DEFAULT_PORT;
  const server = createVeloLabServer();
  server.listen(port, host, () => {
    console.log(`Velo Lab: http://${host}:${port}`);
    console.log('Local only. No Firebase or production AI requests are used.');
  });
}
