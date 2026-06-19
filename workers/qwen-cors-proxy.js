// Cloudflare Worker - secured proxy for Qwen/DashScope OCR.
//
// Required secret:
//   wrangler secret put DASHSCOPE_API_KEY
//
// Optional variable:
//   ALLOWED_ORIGINS=https://roc-vts.com,http://localhost:5173

const DASHSCOPE_URL = 'https://ws-ui65ry41vh934ty5.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions';

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowlist = allowedOrigins(env);
  const allowOrigin = allowlist.length === 0 || allowlist.includes(origin) ? (origin || '*') : allowlist[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(data, init = {}, request, env) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
      ...(init.headers || {}),
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    if (request.method === 'GET' && url.pathname === '/status') {
      return json({ configured: Boolean(env.DASHSCOPE_API_KEY) }, {}, request, env);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
    }

    if (!env.DASHSCOPE_API_KEY) {
      return json({ error: 'OCR worker is missing DASHSCOPE_API_KEY' }, { status: 503 }, request, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 }, request, env);
    }

    try {
      const dashscopeResponse = await fetch(DASHSCOPE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.DASHSCOPE_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await dashscopeResponse.text();
      return new Response(responseBody, {
        status: dashscopeResponse.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(request, env),
        },
      });
    } catch (err) {
      return json({ error: err?.message || 'OCR proxy failed' }, { status: 500 }, request, env);
    }
  },
};
