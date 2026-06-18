// Cloudflare Worker — CORS proxy for Qwen (DashScope) API
// Deploy: wrangler deploy, or paste into Cloudflare Dashboard > Workers & Pages > Create Worker

const DASHSCOPE_URL = 'https://ws-ui65ry41vh934ty5.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions';

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const dashscopeResponse = await fetch(DASHSCOPE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || '',
        },
        body: await request.text(),
      });

      const responseBody = await dashscopeResponse.text();

      return new Response(responseBody, {
        status: dashscopeResponse.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }
  },
};
