import test from 'node:test';
import assert from 'node:assert/strict';

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = '';
    this.textContent = '';
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

Object.defineProperty(FakeElement.prototype, 'innerHTML', {
  set() {
    throw new Error('innerHTML must not be used for log entries');
  },
});

globalThis.window = {
  VTS_ADMIN_AUTH: {},
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};
globalThis.document = {
  createElement: (tagName) => new FakeElement(tagName),
  getElementById: () => null,
};

const {
  appendLogEntry,
  checkOcrService,
  describeOcrRequestError,
  qwenVisionRequest,
  sanitizeForFirestore,
} = await import('../../js/ocr-shared.js');
const workerModule = await import('../../workers/qwen-cors-proxy.js');
const worker = workerModule.default;
const {
  isAllowedDashscopeEndpoint,
  readJsonBodyWithLimit,
  requestBodySize,
  resolveDashscopeChatCompletionsUrl,
} = workerModule;

function request(path, init = {}) {
  return new Request(`https://worker.example${path}`, {
    ...init,
    headers: {
      Origin: 'https://roc-vts.com',
      ...(init.headers || {}),
    },
  });
}

test('OCR log entries render untrusted text without innerHTML', () => {
  const out = new FakeElement('div');

  appendLogEntry(out, {
    time: '10:00:00',
    type: 'warn',
    file: '<img src=x onerror=alert(1)>',
    msg: '<script>alert(1)</script>',
  });

  assert.equal(out.children.length, 1);
  const row = out.children[0];
  assert.equal(row.className, 'log-entry');
  assert.deepEqual(
    row.children.map((child) => child.textContent),
    ['[10:00:00]', '[<img src=x onerror=alert(1)>]', '<script>alert(1)</script>']
  );
  assert.equal(row.children[2].className, 'log-msg log-warn');
});

test('OCR log entry type is restricted before becoming a class name', () => {
  const out = new FakeElement('div');

  appendLogEntry(out, {
    time: '10:00:01',
    type: 'warn bad-class',
    msg: 'message',
  });

  assert.equal(out.children[0].children[1].className, 'log-msg log-info');
});

test('Firestore sanitizer removes undefined values from OCR dashboard data', () => {
  const input = {
    last_updated: 'now',
    attacks: [
      {
        id: 'attack-1',
        structure_level: undefined,
        players: [{ name: 'Alpha', value: 1, rank: undefined }, undefined],
      },
    ],
    optional: undefined,
  };

  const clean = sanitizeForFirestore(input);

  assert.deepEqual(clean, {
    last_updated: 'now',
    attacks: [
      {
        id: 'attack-1',
        players: [{ name: 'Alpha', value: 1 }, null],
      },
    ],
  });
  assert.equal(JSON.stringify(clean).includes('undefined'), false);
});

test('Qwen worker requires Firebase App Check configuration before proxying', async () => {
  const response = await worker.fetch(
    request('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify({ model: 'qwen-vl-plus', messages: [{ role: 'user', content: 'hi' }] }),
    }),
    { DASHSCOPE_API_KEY: 'secret' }
  );
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.match(body.error, /FIREBASE_APP_CHECK_PROJECT_NUMBER/);
});

test('Qwen worker rejects missing Firebase App Check tokens before proxying', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('upstream fetch should not run without App Check');
  };
  try {
    const response = await worker.fetch(
      request('/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify({
          model: 'qwen-vl-plus',
          messages: [{ role: 'user', content: 'hi' }],
        }),
      }),
      {
        DASHSCOPE_API_KEY: 'secret',
        FIREBASE_APP_CHECK_PROJECT_NUMBER: '123456789',
      }
    );
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.match(body.error, /App Check token/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Qwen worker status reports whether App Check is configured', async () => {
  const response = await worker.fetch(request('/status'), {
    DASHSCOPE_API_KEY: 'secret',
    FIREBASE_APP_CHECK_PROJECT_NUMBER: '123456789',
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.configured, true);
  assert.equal(body.appCheckConfigured, true);
  assert.equal(body.rateLimitDurable, false);
  assert.equal(body.rateLimitBackend, 'memory');
});

test('Qwen worker status reports durable rate limiting when KV is bound', async () => {
  const response = await worker.fetch(request('/status'), {
    DASHSCOPE_API_KEY: 'secret',
    FIREBASE_APP_CHECK_PROJECT_NUMBER: '123456789',
    RATE_LIMIT_KV: {},
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.rateLimitDurable, true);
  assert.equal(body.rateLimitBackend, 'kv');
});

test('Qwen worker parses bounded request body size from Content-Length only', () => {
  assert.equal(
    requestBodySize(
      new Request('https://worker.example/', { headers: { 'Content-Length': '512' } })
    ),
    512
  );
  assert.equal(
    requestBodySize(
      new Request('https://worker.example/', { headers: { 'Content-Length': '-1' } })
    ),
    null
  );
  assert.equal(requestBodySize(new Request('https://worker.example/')), null);
});

test('Qwen worker reads JSON bodies without Content-Length using a hard byte cap', async () => {
  assert.deepEqual(
    await readJsonBodyWithLimit(
      new Request('https://worker.example/', {
        method: 'POST',
        body: JSON.stringify({ ok: true }),
      }),
      1024
    ),
    { ok: true }
  );

  await assert.rejects(
    () =>
      readJsonBodyWithLimit(
        new Request('https://worker.example/', {
          method: 'POST',
          body: JSON.stringify({ text: 'x'.repeat(64) }),
        }),
        16
      ),
    /Payload too large/
  );
});

test('Qwen worker allows Vite fallback dev origin on port 5174', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/status', {
      headers: { Origin: 'http://127.0.0.1:5174' },
    }),
    {
      DASHSCOPE_API_KEY: 'secret',
      FIREBASE_APP_CHECK_PROJECT_NUMBER: '123456789',
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:5174');
});

test('Qwen worker status includes safe diagnostics and allows current Vite dev origin', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/status', {
      headers: { Origin: 'http://127.0.0.1:5173' },
    }),
    {
      DASHSCOPE_API_KEY: 'secret',
      FIREBASE_APP_CHECK_PROJECT_NUMBER: '123456789',
    }
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:5173');
  assert.equal(body.configured, true);
  assert.equal(body.appCheckConfigured, true);
  assert.equal(body.origin, 'http://127.0.0.1:5173');
  assert.equal(body.originAllowed, true);
  assert.match(body.workerBuild, /^\d{4}-\d{2}-\d{2}\./);
  assert.equal(body.upstreamHost, 'dashscope-intl.aliyuncs.com');
});

test('Qwen worker allows additional local Vite ports used for phone testing', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/status', {
      headers: { Origin: 'http://127.0.0.1:5176' },
    }),
    {
      DASHSCOPE_API_KEY: 'secret',
      FIREBASE_APP_CHECK_PROJECT_NUMBER: '123456789',
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://127.0.0.1:5176');
});

test('Qwen worker allows LAN Vite dev origins for phone testing', async () => {
  const response = await worker.fetch(
    new Request('https://worker.example/status', {
      headers: { Origin: 'http://192.168.1.199:5174' },
    }),
    {
      ALLOWED_ORIGINS: 'https://roc-vts.com',
      DASHSCOPE_API_KEY: 'secret',
      FIREBASE_APP_CHECK_PROJECT_NUMBER: '123456789',
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'http://192.168.1.199:5174');
});

test('Qwen worker defaults to Alibaba Cloud international compatible endpoint', () => {
  assert.equal(
    resolveDashscopeChatCompletionsUrl({}),
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions'
  );
  assert.equal(
    resolveDashscopeChatCompletionsUrl({
      DASHSCOPE_BASE_URL: 'https://example.test/compatible-mode/v1',
    }),
    'https://example.test/compatible-mode/v1/chat/completions'
  );
  assert.equal(
    resolveDashscopeChatCompletionsUrl({
      DASHSCOPE_BASE_URL: 'https://example.test/compatible-mode/v1/chat/completions',
    }),
    'https://example.test/compatible-mode/v1/chat/completions'
  );
});

test('Qwen worker rejects workers.dev as a DashScope upstream endpoint', () => {
  assert.equal(
    isAllowedDashscopeEndpoint(
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions'
    ),
    true
  );
  assert.equal(
    isAllowedDashscopeEndpoint(
      'https://delicate-term-725f.aboroe1097.workers.dev/chat/completions'
    ),
    false
  );
  assert.equal(
    isAllowedDashscopeEndpoint('http://dashscope-intl.aliyuncs.com/compatible-mode/v1'),
    false
  );
});

test('OCR status helper requires both OCR secret and App Check worker config', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ configured: true, appCheckConfigured: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  try {
    const result = await checkOcrService();

    assert.equal(result.configured, false);
    assert.match(result.error, /App Check/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Qwen request errors preserve HTTP status and Retry-After', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Rate limit exceeded. Please retry shortly.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '17' },
    });
  try {
    await assert.rejects(
      () =>
        qwenVisionRequest([{ role: 'user', content: 'hi' }], {
          appCheckToken: 'test-app-check-token',
        }),
      (err) => {
        assert.equal(err.name, 'QwenVisionRequestError');
        assert.equal(err.status, 429);
        assert.equal(err.retryAfter, 17);
        assert.match(err.message, /Rate limit exceeded/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Qwen request explains Cloudflare Worker upstream permission denials', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response('Workers endpoint access denied.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    });
  try {
    await assert.rejects(
      () =>
        qwenVisionRequest([{ role: 'user', content: 'hi' }], {
          appCheckToken: 'test-app-check-token',
        }),
      (err) => {
        assert.equal(err.name, 'QwenVisionRequestError');
        assert.equal(err.status, 403);
        assert.match(describeOcrRequestError(err), /DASHSCOPE_BASE_URL/);
        assert.match(describeOcrRequestError(err), /DASHSCOPE_API_KEY/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Qwen request does not call OCR worker without a Firebase App Check token', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('worker should not be called without App Check');
  };
  try {
    await assert.rejects(
      () => qwenVisionRequest([{ role: 'user', content: 'hi' }]),
      (err) => {
        assert.equal(err.name, 'QwenVisionRequestError');
        assert.equal(err.status, 401);
        assert.equal(err.retryable, false);
        assert.equal(err.localConfiguration, true);
        assert.match(err.message, /Firebase App Check token unavailable/);
        return true;
      }
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
