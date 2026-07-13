import assert from 'node:assert/strict';
import test from 'node:test';

import { filterAllowedToolGroupsForAuth, handleRequest } from '../../workers/ai-handler.js';
import { ProviderStreamAssembler, buildGeminiRequest } from '../../workers/ai/gemini.js';
import { validateToolArguments } from '../../workers/ai/tools.js';
import {
  FIREBASE_APPCHECK_JWKS_URL,
  FIREBASE_AUTH_JWKS_URL,
  clearFirebaseJwksCacheForTests,
} from '../../workers/ai/firebase-jwt.js';

const ALLOWED_ORIGIN = 'https://abocombo.web.app';
const PROJECT_ID = 'abocombo';
const PROJECT_NUMBER = '103195597389';
const APP_ID = '1:103195597389:web:97788d99356b4e59839a04';

test('Gemini public API request omits Enterprise-only safety settings', () => {
  const request = buildGeminiRequest({
    model: 'gemini-3.1-flash-lite',
    providerInput: [{ type: 'user_input', content: [{ type: 'text', text: 'Hello' }] }],
    allowedToolGroups: ['static'],
    locale: 'en',
  });

  assert.equal('safety_settings' in request, false);
  assert.match(request.system_instruction, /You are Velo/);
  assert.match(request.system_instruction, /Your name is Velo/);
  assert.match(request.system_instruction, /Never say that you have no personal name/);
  assert.match(request.system_instruction, /heroes selected in the Combo Generator/);
  assert.match(request.system_instruction, /"yes", "okay please", and "continue"/);
  assert.match(request.system_instruction, /get_vts_player_context/);
  assert.match(request.system_instruction, /Use get_vts_guide_context/);
  assert.match(
    request.system_instruction,
    /dated plan is historical evidence, never a\ncurrent war order/
  );
  assert.match(request.system_instruction, /phase being played from targetSeason/);
  assert.match(request.system_instruction, /Community guide numbers never override/);
  assert.match(request.system_instruction, /calm, warm, and quietly confident/);
  assert.match(request.system_instruction, /lightly funny when it fits/);
  assert.match(request.system_instruction, /mascot and AI teammate of the VTS 1097 community/);
  assert.match(request.system_instruction, /Abo \(MalakAbo\) gave you the oversized helmet/);
  assert.match(request.system_instruction, /do not confuse\nAbo with the current user/);
  assert.match(request.system_instruction, /helmet is visibly separate from your scales/);
  assert.match(request.system_instruction, /Never claim that you do not\nwear a helmet/);
  assert.match(
    request.system_instruction,
    /Never\npromise to stop mentioning or wearing the helmet/
  );
  assert.match(request.system_instruction, /Whenever a user directly asks Velo for help/);
  assert.match(request.system_instruction, /nudge this helmet above my eyes/);
  assert.match(request.system_instruction, /at most one helmet beat per answer/);
  assert.match(request.system_instruction, /VTS 1097 dragons stick together/);
  assert.match(request.system_instruction, /personal:research_progress is allowed/);
  assert.match(
    request.system_instruction,
    /get_research_context with mode="catalog" and includeUserProgress=true/
  );
  assert.match(request.system_instruction, /generic game-account-access refusal/);
  assert.match(request.system_instruction, /damage,\nHP, tactical might\/resistance/);
  assert.match(request.system_instruction, /small and medium spenders/);
  assert.match(request.system_instruction, /Use calculate_eden_loyalty/);
  assert.match(request.system_instruction, /Use calculate_eden_upgrade_materials/);
  assert.match(request.system_instruction, /call calculate_dm_materials/);
  assert.match(request.system_instruction, /never claim that\nyou cannot calculate them/);
  assert.match(request.system_instruction, /server-gated by a verified Firebase admin claim/);
  assert.match(request.system_instruction, /CURRENT UI LANGUAGE supplied below is authoritative/);
  assert.match(
    request.system_instruction,
    /tool fields, canonical labels, or evidence are in\nEnglish/
  );
});

test('Velo disambiguates German Dragon Master set and piece requests', () => {
  const request = buildGeminiRequest({
    model: 'gemini-3.1-flash-lite',
    providerInput: [
      {
        type: 'user_input',
        content: [{ type: 'text', text: 'Wie viel kostet die Rüstung für mein drittes DM-Set?' }],
      },
    ],
    allowedToolGroups: ['static'],
    locale: 'de',
  });

  assert.match(request.system_instruction, /"Rüstung" and "Ausrüstung" can mean/);
  assert.match(request.system_instruction, /complete six-piece set or one equipment piece/);
  assert.match(request.system_instruction, /ask one short set-versus-piece clarification/);
  assert.match(request.system_instruction, /Owning two complete sets while\nbuilding a third/);
  assert.match(request.system_instruction, /one final Gold Dragon Master piece/);
  assert.match(request.system_instruction, /never one Purple DM piece/);
});

test('Gemini tool contract supports Mary formations and public VTS player lookup', () => {
  const request = buildGeminiRequest({
    model: 'gemini-3.1-flash-lite',
    providerInput: [{ type: 'user_input', content: [{ type: 'text', text: 'Who is Abo?' }] }],
    allowedToolGroups: ['static'],
    locale: 'en',
  });
  const declarations = request.tools;
  const names = declarations.map((tool) => tool.name);
  assert.ok(names.includes('get_vts_player_context'));
  assert.ok(names.includes('get_vts_guide_context'));
  const combos = declarations.find((tool) => tool.name === 'get_combo_recommendations');
  assert.deepEqual(combos.parameters.properties.mode.enum, ['ranked', 'non_overlap']);
  assert.equal(combos.parameters.required, undefined);
  assert.equal(combos.parameters.properties.filters.properties.heroes.maxItems, 3);
  assert.equal(combos.parameters.properties.filters.properties.states.maxItems, 2);
  assert.deepEqual(combos.parameters.properties.spendTier.enum, [
    'small',
    'medium',
    'large',
    'ultra',
  ]);
  assert.equal(
    validateToolArguments('get_combo_recommendations', {
      filters: { heroes: ['Mary Tudor'] },
    }),
    true
  );
  assert.equal(validateToolArguments('get_vts_player_context', { names: ['Abo'] }), true);
  assert.equal(
    validateToolArguments('get_vts_guide_context', {
      query: 'stop stamina',
      season: 'X1',
      limit: 3,
    }),
    true
  );
  assert.equal(
    validateToolArguments('get_vts_guide_context', {
      query: 'stop stamina',
      privateChat: true,
    }),
    false
  );
  assert.equal(
    validateToolArguments('get_combo_recommendations', {
      filters: { states: ['Free'] },
      spendTier: 'small',
    }),
    true
  );
  assert.equal(
    validateToolArguments('calculate_eden_loyalty', { acLevels: [20, 16, 12, 10] }),
    true
  );
  assert.equal(
    validateToolArguments('calculate_eden_upgrade_materials', {
      kind: 'site_requirement',
      targetSite: 'T12',
    }),
    true
  );
  assert.equal(
    validateToolArguments('calculate_eden_upgrade_materials', {
      kind: 'building_materials',
      building: 'AC1',
      currentLevel: 17,
      targetLevel: 20,
    }),
    true
  );
  assert.equal(
    validateToolArguments('calculate_eden_upgrade_materials', {
      kind: 'site_requirement',
      targetSite: 'T17',
    }),
    false
  );
  assert.equal(
    validateToolArguments('calculate_dm_materials', {
      route: 'purple',
      sets: 1,
      normalGearOwned: true,
    }),
    true
  );
  assert.equal(
    validateToolArguments('get_eden_context', {
      kind: 'rankings',
      season: 'X1',
      limit: 10,
    }),
    true
  );
});

test('Gemini exposes the private admin tool only for the server-approved admin group', () => {
  const base = {
    model: 'gemini-3.1-flash-lite',
    providerInput: [{ type: 'user_input', content: [{ type: 'text', text: 'Admin summary' }] }],
    locale: 'en',
  };
  const general = buildGeminiRequest({ ...base, allowedToolGroups: ['static'] });
  const admin = buildGeminiRequest({
    ...base,
    allowedToolGroups: ['static', 'private:admin_dashboard'],
  });
  assert.equal(
    general.tools.some((tool) => tool.name === 'get_admin_context'),
    false
  );
  assert.equal(
    admin.tools.some((tool) => tool.name === 'get_admin_context'),
    true
  );
  assert.deepEqual(
    filterAllowedToolGroupsForAuth(['static', 'private:admin_dashboard'], { admin: false }),
    ['static']
  );
  assert.deepEqual(
    filterAllowedToolGroupsForAuth(['static', 'private:admin_dashboard'], { admin: true }),
    ['static', 'private:admin_dashboard']
  );
});

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

async function createSigner() {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return {
    jwk: { ...jwk, alg: 'RS256', kid: 'test-key', use: 'sig' },
    async token(payload) {
      const header = base64Url(JSON.stringify({ alg: 'RS256', kid: 'test-key', typ: 'JWT' }));
      const body = base64Url(JSON.stringify(payload));
      const input = `${header}.${body}`;
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        pair.privateKey,
        new TextEncoder().encode(input)
      );
      return `${input}.${base64Url(Buffer.from(signature))}`;
    },
  };
}

function disabledEnv() {
  return {
    AI_ENABLED: 'false',
    ALLOWED_ORIGINS: ALLOWED_ORIGIN,
  };
}

function quotaNamespace() {
  return {
    getByName(name) {
      return {
        async acceptUserTurn() {
          return { allowed: true, remaining: 39, resetAt: Date.now() + 60_000 };
        },
        async acceptGlobalTurnAndInteraction() {
          return { allowed: true };
        },
        async acceptContinuation() {
          return { allowed: true };
        },
        async acceptGlobalInteraction() {
          return { allowed: true };
        },
        async releaseUserTurn() {
          return { released: true };
        },
        async rollbackContinuation() {
          return { released: true };
        },
        async releaseGlobalReservation() {
          return { released: true };
        },
        name,
      };
    },
  };
}

function enabledEnv() {
  return {
    AI_ENABLED: 'true',
    AI_MODEL: 'gemini-3.1-flash-lite',
    AI_CONTINUATION_SECRET: 'test-only-continuation-secret-32-bytes-minimum',
    GEMINI_API_KEY: 'test-only-provider-key',
    FIREBASE_PROJECT_ID: PROJECT_ID,
    FIREBASE_PROJECT_NUMBER: PROJECT_NUMBER,
    FIREBASE_APP_ID: APP_ID,
    ALLOWED_ORIGINS: ALLOWED_ORIGIN,
    AI_USER_QUOTA: quotaNamespace(),
    AI_GLOBAL_QUOTA: quotaNamespace(),
    AI_ABUSE_LIMITER: {
      async limit() {
        return { success: true };
      },
    },
    ENVIRONMENT: 'test',
  };
}

test('health and preflight remain safe while the provider is disabled', async () => {
  const health = await handleRequest(new Request('https://worker.test/healthz'), disabledEnv());
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, enabled: false });

  const preflight = await handleRequest(
    new Request('https://worker.test/v1/assistant/turn', {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED_ORIGIN },
    }),
    disabledEnv()
  );
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN);

  const disabled = await handleRequest(
    new Request('https://worker.test/v1/assistant/turn', {
      method: 'POST',
      headers: { Origin: ALLOWED_ORIGIN, 'Content-Type': 'application/json' },
      body: '{}',
    }),
    disabledEnv()
  );
  assert.equal(disabled.status, 503);
  assert.equal((await disabled.json()).code, 'ai_disabled');
});

test('current Gemini step streams retain initial text, thought signatures, and tool arguments', () => {
  const assembler = new ProviderStreamAssembler({ allowedToolGroups: ['static'] });
  assert.deepEqual(
    assembler.accept({
      event_type: 'step.start',
      index: 0,
      step: { type: 'model_output', content: [{ type: 'text', text: 'Hello' }] },
    }),
    { text: 'Hello' }
  );
  assert.deepEqual(
    assembler.accept({
      event_type: 'step.delta',
      index: 0,
      delta: { type: 'text', text: ' commander.' },
    }),
    { text: ' commander.' }
  );
  assembler.accept({ event_type: 'step.stop', index: 0 });
  assembler.accept({
    event_type: 'step.start',
    index: 1,
    step: { type: 'thought', signature: 'signed-thought' },
  });
  assembler.accept({ event_type: 'step.stop', index: 1 });
  assembler.accept({
    event_type: 'step.start',
    index: 2,
    step: {
      type: 'function_call',
      id: 'fc_1',
      name: 'get_research_context',
      signature: 'signed-function-call',
    },
  });
  assembler.accept({
    event_type: 'step.delta',
    index: 2,
    delta: {
      type: 'arguments',
      partial_arguments: '{"mode":"priorities","troop":"footmen","includeUserProgress":false}',
    },
  });
  assembler.accept({ event_type: 'step.stop', index: 2 });
  assert.equal(assembler.steps[0].content[0].text, 'Hello commander.');
  assert.equal(assembler.steps[1].signature, 'signed-thought');
  assert.deepEqual(assembler.calls[0].arguments, {
    mode: 'priorities',
    troop: 'footmen',
    includeUserProgress: false,
  });
  assert.equal(assembler.steps[2].signature, 'signed-function-call');
});

test('turn endpoint rejects unlisted and missing browser origins', async () => {
  for (const origin of ['', 'https://attacker.example']) {
    const headers = { 'Content-Type': 'application/json' };
    if (origin) headers.Origin = origin;
    const response = await handleRequest(
      new Request('https://worker.test/v1/assistant/turn', {
        method: 'POST',
        headers,
        body: '{}',
      }),
      disabledEnv()
    );
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'origin_not_allowed');
  }
});

test('authenticated initial turn enforces Firebase tokens and streams normalized SSE', async () => {
  clearFirebaseJwksCacheForTests();
  const signer = await createSigner();
  const now = Math.floor(Date.now() / 1000);
  const authToken = await signer.token({
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    sub: 'test-user',
    iat: now - 1,
    exp: now + 300,
    auth_time: now - 1,
    firebase: { sign_in_provider: 'anonymous' },
  });
  const appCheckToken = await signer.token({
    iss: `https://firebaseappcheck.googleapis.com/${PROJECT_NUMBER}`,
    aud: [`projects/${PROJECT_NUMBER}`],
    sub: APP_ID,
    iat: now - 1,
    exp: now + 300,
  });

  const originalFetch = globalThis.fetch;
  let providerRequestCount = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (url === FIREBASE_AUTH_JWKS_URL || url === FIREBASE_APPCHECK_JWKS_URL) {
      return Response.json(
        { keys: [signer.jwk] },
        { headers: { 'Cache-Control': 'public, max-age=3600' } }
      );
    }
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['x-goog-api-key'], 'test-only-provider-key');
    assert.equal(init.headers['Api-Revision'], '2026-05-20');
    providerRequestCount += 1;
    const events =
      providerRequestCount === 1
        ? [
            { event_type: 'step.start', index: 0, step: { type: 'model_output' } },
            {
              event_type: 'step.delta',
              index: 0,
              delta: { type: 'text', text: 'Hello commander.' },
            },
            { event_type: 'step.stop', index: 0 },
            {
              event_type: 'interaction.completed',
              interaction: { status: 'completed', usage: { total_tokens: 4 } },
            },
          ]
        : [
            {
              event_type: 'step.start',
              index: 0,
              step: {
                type: 'function_call',
                id: 'fc_live',
                name: 'get_research_context',
                signature: 'live-signed-function-call',
              },
            },
            {
              event_type: 'step.delta',
              index: 0,
              delta: {
                type: 'arguments_delta',
                arguments: '{"mode":"priorities","troop":"footmen","includeUserProgress":false}',
              },
            },
            { event_type: 'step.stop', index: 0 },
            {
              event_type: 'interaction.completed',
              interaction: { status: 'completed', usage: { total_tokens: 8 } },
            },
          ];
    const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
  };

  try {
    const response = await handleRequest(
      new Request('https://worker.test/v1/assistant/turn', {
        method: 'POST',
        headers: {
          Origin: ALLOWED_ORIGIN,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'X-Firebase-AppCheck': appCheckToken,
        },
        body: JSON.stringify({
          version: 1,
          requestId: 'f2de24a4-2347-4acf-8b8f-324a343f3b12',
          history: [],
          input: { kind: 'message', text: 'Hello', locale: 'en' },
          allowedToolGroups: ['static'],
        }),
      }),
      enabledEnv()
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Content-Type'), /text\/event-stream/u);
    assert.equal(response.headers.get('X-AI-Quota-Remaining'), '39');
    const stream = await response.text();
    assert.match(stream, /event: text_delta\ndata: \{"text":"Hello commander\."\}/u);
    assert.match(stream, /event: done\ndata: \{"status":"completed"/u);

    const toolResponse = await handleRequest(
      new Request('https://worker.test/v1/assistant/turn', {
        method: 'POST',
        headers: {
          Origin: ALLOWED_ORIGIN,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'X-Firebase-AppCheck': appCheckToken,
        },
        body: JSON.stringify({
          version: 1,
          requestId: '9aea3310-9cd6-42e2-b0d1-2895f5036cbb',
          history: [],
          input: { kind: 'message', text: 'Prioritize Footmen research', locale: 'en' },
          allowedToolGroups: ['static'],
        }),
      }),
      enabledEnv()
    );
    const toolStream = await toolResponse.text();
    assert.match(toolStream, /event: tool_calls/u);
    assert.match(toolStream, /"name":"get_research_context"/u);
    assert.match(toolStream, /event: state/u);
    assert.match(toolStream, /"signature":"live-signed-function-call"/u);
    assert.match(toolStream, /event: done\ndata: \{"status":"requires_action"\}/u);
  } finally {
    globalThis.fetch = originalFetch;
    clearFirebaseJwksCacheForTests();
  }
});
