import { withCors } from './cors.js';

const MANAGEMENT_VOTES_SHEET_ID = '14gUmeDyTT-Bb9Yvqhz21HcyVKxrkK_hxvkTwpVLKwcM';
const MANAGEMENT_VOTES_SHEETS = new Set(['Vote Results', 'Form Responses 1']);

function json(body, status, origin, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCors(
      {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        ...headers,
      },
      origin
    ),
  });
}

export function buildManagementVotesSheetUrl(sheetName) {
  const sheet = String(sheetName || 'Vote Results').trim();
  if (!MANAGEMENT_VOTES_SHEETS.has(sheet)) {
    throw new Error('Unsupported management vote sheet');
  }
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${MANAGEMENT_VOTES_SHEET_ID}/gviz/tq`
  );
  url.searchParams.set('sheet', sheet);
  url.searchParams.set('tqx', 'out:json');
  return url.toString();
}

function parseManagementVotesSheetResponse(source) {
  const text = String(source || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Invalid management vote Sheet response');
  const payload = JSON.parse(text.slice(start, end + 1));
  if (payload?.status !== 'ok' || !payload?.table) {
    throw new Error('Management vote Sheet returned no table');
  }
  return payload;
}

export async function proxyManagementVotes(url, origin, fetchFn = globalThis.fetch) {
  let upstreamUrl;
  try {
    upstreamUrl = buildManagementVotesSheetUrl(url.searchParams.get('sheet'));
  } catch (error) {
    return json({ error: error.message }, 400, origin);
  }

  try {
    const response = await fetchFn(upstreamUrl, {
      headers: { Accept: 'application/javascript' },
      cf: { cacheEverything: true, cacheTtl: 60 },
    });
    if (!response.ok) {
      return json({ error: `Management vote Sheet returned ${response.status}` }, 502, origin);
    }
    const payload = parseManagementVotesSheetResponse(await response.text());
    return json(payload, 200, origin, { 'Cache-Control': 'public, max-age=60' });
  } catch {
    return json({ error: 'Management vote Sheet is temporarily unavailable' }, 502, origin);
  }
}
