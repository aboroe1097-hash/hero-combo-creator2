# Velo — moving the assistant to DeepSeek

Ships with PR #153. Worker change only: `workers/` deploys separately from Pages
and Firestore, so this does not block the rest of #153.

## Diagnosis first — what is actually wrong

Probed 2026-08-16:

```
GET  /healthz              → {"ok":true,"enabled":true}
POST /v1/assistant/turn    → {"code":"origin_not_allowed"}
```

The Worker **is deployed and fully configured**. `missingConfiguration()` in
`workers/ai-handler.js` requires `AI_ENABLED`, `GEMINI_API_KEY`,
`AI_CONTINUATION_SECRET`, `AI_MODEL` and the three Firebase values, and health
reports `ok:true`, so all of them are present. The `origin_not_allowed` is the
correct answer to a curl that sends no `Origin` header.

So the fault is one of the two things health cannot see:

1. **The upstream key is dead or out of quota.** Health checks that
   `GEMINI_API_KEY` is a non-empty string, never that it works. An expired or
   exhausted key looks perfectly healthy here and fails at request time.
2. **`ALLOWED_ORIGINS` no longer covers the site.** Check it lists the exact
   origin the browser sends, including scheme.

Before writing any code, open Velo in the browser and read the network response
for `/v1/assistant/turn`, or run `npx wrangler tail` against the AI worker while
sending one message. That single line says which of the two it is.

**Switching provider is still worth doing for cost** — the token credit is the
real reason. But do the diagnosis anyway, because if the cause is
`ALLOWED_ORIGINS` then DeepSeek will fail in exactly the same way.

## Why this is an adapter, not a config change

`AI_MODEL` selects a model *within* the Gemini adapter. It cannot point at
DeepSeek, because `workers/ai/gemini.js` speaks Gemini's wire format end to end:

```
pickModel()                          model choice per tab/input
buildGeminiRequest()                 Gemini contents/parts/tools shape
prepareGeminiUpstream()              endpoint, headers, auth
fetchGeminiInteraction()             the call itself
createNormalizedInteractionStream()  Gemini SSE → Velo's normalized events
buildFunctionResultSteps()           functionResponse parts
buildContinuationProviderInput()     resuming after a tool call
sourcesFromResults()                 citations
```

DeepSeek is OpenAI-compatible (`POST https://api.deepseek.com/chat/completions`,
`messages[]`, `tools[]`, `tool_calls`, SSE `data:` frames), so every one of those
has a direct counterpart — but the shapes differ and must be translated.

**The real porting risk is tool calling.** Velo's tools are load-bearing: live
Arcade leaderboards, All-Star BoH mechanics, the VtsScore power contract, the
active-tab context. Gemini returns `functionCall` parts inline in the stream;
DeepSeek returns `tool_calls` with **fragmented arguments across SSE deltas**
that must be accumulated by index before the JSON parses. Get that wrong and
tools silently never fire while ordinary chat looks fine.

## Approach: add a provider, keep the old one

Do **not** edit `gemini.js` in place. Add `workers/ai/deepseek.js` exporting the
same surface, and select between them with a new `AI_PROVIDER` env var
(`gemini` | `deepseek`, defaulting to `gemini`). Rollback then costs one
`wrangler` command instead of a redeploy under pressure.

## Secrets

The key never enters the repo, a commit, or a PR description:

```bash
npx wrangler secret put DEEPSEEK_API_KEY
```

Add `DEEPSEEK_API_KEY` to `missingConfiguration()` only when
`AI_PROVIDER === 'deepseek'`, so a Gemini deployment does not start reporting
itself unhealthy.

---

## WO-V1 — DeepSeek provider adapter

**Prompt:**

> Create ONLY `workers/ai/deepseek.js`. Touch no other file.
>
> Implement a DeepSeek provider exposing exactly the same exported names and
> signatures as `workers/ai/gemini.js`: `pickModel`, `buildDeepseekRequest` (the
> counterpart of `buildGeminiRequest`), `prepareDeepseekUpstream`,
> `fetchDeepseekInteraction`, `createNormalizedInteractionStream`,
> `buildFunctionResultSteps`, `buildContinuationProviderInput` and
> `sourcesFromResults`. Read `workers/ai/gemini.js` first and mirror its
> structure, its normalized event shapes and its error handling — the handler
> must be able to swap one module for the other without changing.
>
> DeepSeek is OpenAI-compatible:
> - `POST https://api.deepseek.com/chat/completions`
> - `Authorization: Bearer ${env.DEEPSEEK_API_KEY}`
> - body `{ model, messages, tools, stream: true, max_tokens, temperature }`
> - models `deepseek-chat` (default) and `deepseek-reasoner`
>
> Translation rules:
> - Gemini `contents[].parts[].text` becomes `messages[].content`, with roles
>   mapped `user`→`user`, `model`→`assistant`, and the system instruction sent
>   as a leading `{ role: 'system' }` message.
> - Gemini `functionDeclarations` become `tools[].function` entries with
>   `{ name, description, parameters }`.
> - A tool result becomes `{ role: 'tool', tool_call_id, content }`.
>
> **Streaming, the part most likely to break:** DeepSeek sends SSE frames whose
> `choices[0].delta.tool_calls[]` carry `function.arguments` as *fragments* split
> across frames, keyed by `index`. Accumulate the fragments per index and only
> emit a tool-call event once `[DONE]` arrives or `finish_reason` is
> `tool_calls`, then `JSON.parse` the joined string. Never parse a fragment on
> its own. Text deltas arrive as `choices[0].delta.content` and stream through
> unchanged.
>
> `sourcesFromResults` has no DeepSeek equivalent for grounded citations —
> return sources derived from tool results only, exactly as the Gemini adapter
> does for its own tool results, and return an empty array when there are none.
>
> No secrets in the file. Read the key only from `env.DEEPSEEK_API_KEY`. Do not
> log request bodies, keys, or user text.

**Acceptance:** `npx eslint workers/ai/deepseek.js`

---

## WO-V2 — Provider selection in the handler

**Prompt:**

> Edit ONLY `workers/ai-handler.js`. Touch no other file.
>
> Replace the static import from `./ai/gemini.js` with provider selection on
> `env.AI_PROVIDER`, defaulting to `'gemini'` when unset so existing deployments
> are unaffected. `'deepseek'` selects `./ai/deepseek.js`. Any other value is a
> configuration error, reported the same way a missing variable is.
>
> In `missingConfiguration(env)`, require `GEMINI_API_KEY` only when the provider
> is gemini, and `DEEPSEEK_API_KEY` only when it is deepseek. Every other
> requirement stays as it is.
>
> Change nothing else: routes, quota, Firebase JWT verification, CORS and the
> abuse limiter all stay exactly as they are.

**Acceptance:** `npx eslint workers/ai-handler.js && npm run test:unit`

---

## WO-V3 — Velo model references in the app

Once the Worker runs on DeepSeek, the user-facing copy naming the model is
wrong. `js/ai/vts-guide-knowledge.js` and the CHANGELOG describe Velo as running
`gemini-3.5-flash`.

Grep before editing, since the string appears in more than one place:

```bash
grep -rn "gemini" js/ docs/ CHANGELOG.md README.md | grep -v node_modules
```

Update user-visible copy to name DeepSeek, and add the new keys to every locale
using the WO-6 prompt in `docs/pr153-delegation-plan.md`.

---

## Rollout

1. `npx wrangler secret put DEEPSEEK_API_KEY`
2. Deploy the Worker with `AI_PROVIDER` still unset — Gemini keeps serving, the
   new adapter ships dormant.
3. Set `AI_PROVIDER=deepseek` and redeploy.
4. Send one message covering each capability, because chat succeeding proves
   very little on its own: a plain question, one that triggers an Arcade
   leaderboard tool call, one mid-conversation continuation after a tool result,
   and one long enough to exercise streaming.
5. `npx wrangler tail` during those four, watching for tool calls that never
   fire — the failure mode where text streams fine and tools silently do nothing.

Rollback is unsetting `AI_PROVIDER` and redeploying.

**This is a Worker deploy.** Per `AGENTS.md` it ships separately from GitHub
Pages and must be called out in the PR.
