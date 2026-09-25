// scripts/combos-planner-server.mjs
//
// Local Combos Planner (npm run combos:plan). Serves tools/combos-planner on
// 127.0.0.1 and writes js/combos-db.js directly when you press Save.
//
// The S0-X2 list is fixed by default: the planner reorders it only when the
// page's edit mode sends a `baseOrder`, and edits a line only when it sends a
// matching `baseEdits` entry. X8 lanes (any lane with at least one X8 hero) can
// be placed directly above an S0-X2 lane; the ones left unplaced stay in the X8
// catch-up block at the end of the array. Every entry in rankedCombos is one
// line, so a save moves existing lines verbatim and only rewrites a line that an
// edit changed or that an added lane introduces.
//
// tools/combos-planner/x8-queue.json lists new X8 lanes waiting to be placed
// (for example from in-game screenshots). They show in the planner's list; a
// lane leaves the queue and enters combos-db.js once it is placed and saved.

import http from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildComboSource,
  buildView,
  describeCombos,
  editedEntryLine,
  entryLine,
  laneSlug,
  parseComboSource,
  readQueue,
} from '../js/combo-plan.js';

// The engine lives in js/combo-plan.js so the admin tab runs the same code; this
// re-export keeps the planner's contract tests pointed at the server module.
export {
  buildComboSource,
  buildView,
  describeCombos,
  editedEntryLine,
  entryLine,
  laneSlug,
  parseComboSource,
  readQueue,
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolDir = path.join(rootDir, 'tools', 'combos-planner');
const combosPath = path.join(rootDir, 'js', 'combos-db.js');
const queuePath = path.join(toolDir, 'x8-queue.json');
const queueJsPath = path.join(toolDir, 'x8-queue.js');
const heroesPath = path.join(rootDir, 'js', 'heroes-data.js');

const HOST = '127.0.0.1';
const DEFAULT_PORT = 5396;
const MAX_REQUEST_BYTES = 512 * 1024;

/** Exported so a test can check that every asset the page asks for is served. */
export const staticFiles = new Map([
  ['/', { file: path.join(toolDir, 'index.html'), type: 'text/html; charset=utf-8' }],
  ['/host.js', { file: path.join(toolDir, 'host.js'), type: 'text/javascript; charset=utf-8' }],
  ['/shell.css', { file: path.join(toolDir, 'shell.css'), type: 'text/css; charset=utf-8' }],
  // The interface, its styles and its engine live with the site so the admin tab
  // runs exactly the same code against a different transport.
  ['/combos-planner-ui.js', { file: path.join(rootDir, 'js', 'combos-planner-ui.js'), type: 'text/javascript; charset=utf-8' }],
  ['/combo-lanes.js', { file: path.join(rootDir, 'js', 'combo-lanes.js'), type: 'text/javascript; charset=utf-8' }],
  ['/combo-plan.js', { file: path.join(rootDir, 'js', 'combo-plan.js'), type: 'text/javascript; charset=utf-8' }],
  ['/combos-planner.css', { file: path.join(rootDir, 'css', 'combos-planner.css'), type: 'text/css; charset=utf-8' }],
]);

const imagesDir = path.join(rootDir, 'images');
const imageTypes = {
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// Local portraits are served from the repo's images/ folder; remote ones load directly.
function portraitUrl(url) {
  const value = String(url || '');
  if (/^https:\/\//.test(value)) return value;
  if (value.startsWith('images/')) return `/${value}`;
  return '/images/heroes/portrait-unavailable.svg';
}

async function importFresh(filePath) {
  const info = await stat(filePath);
  return import(`${pathToFileURL(filePath).href}?mtime=${Math.floor(info.mtimeMs)}`);
}

/** Combos to rank and add: the hand-written list in tools/combos-planner/x8-queue.js. */
async function readHandWritten() {
  try {
    const module = await importFresh(queueJsPath);
    const list = Array.isArray(module.lanes) ? module.lanes : [];
    return list.map((lane) => ({ ...lane, queuedFrom: 'x8-queue.js' }));
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ERR_MODULE_NOT_FOUND') return [];
    throw new Error(`x8-queue.js could not be read: ${error.message}`);
  }
}

async function loadAll() {
  const [source, combosModule, heroesModule] = await Promise.all([
    readFile(combosPath, 'utf8'),
    importFresh(combosPath),
    importFresh(heroesPath),
  ]);
  let queueJson = { lanes: [] };
  try {
    queueJson = JSON.parse(await readFile(queuePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT')
      throw new Error(`x8-queue.json is not valid JSON: ${error.message}`);
  }
  const view = buildView({
    source,
    combos: combosModule.rankedCombos,
    heroTable: heroesModule.allHeroesData,
    // Hand-written lineups first, then the ones the Add form has kept.
    queueLanes: [
      ...(await readHandWritten()),
      ...(Array.isArray(queueJson.lanes) ? queueJson.lanes : []),
    ],
    portraitUrl,
  });
  return { ...view, queueJson };
}

async function writeQueue(queueJson, lanes) {
  const next = {
    ...queueJson,
    lanes: lanes.map(({ heroes, skin, source }) => ({
      heroes,
      ...(skin ? { skin } : {}),
      ...(source ? { source } : {}),
    })),
  };
  await writeFile(queuePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}

const viewOf = ({ heroes, base, x8, skipped }) => ({ heroes, base, x8, skipped });

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) throw new Error('request too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// Assets are served with a stamp from their own mtimes: a browser that reuses the
// cached module would otherwise keep running the previous planner after an edit.
async function assetStamp() {
  const files = [
    path.join(toolDir, 'index.html'),
    path.join(toolDir, 'host.js'),
    path.join(toolDir, 'shell.css'),
    path.join(rootDir, 'css', 'combos-planner.css'),
    path.join(rootDir, 'js', 'combos-planner-ui.js'),
    path.join(rootDir, 'js', 'combo-lanes.js'),
    path.join(rootDir, 'js', 'combo-plan.js'),
  ];
  const times = await Promise.all(
    files.map((file) =>
      stat(file).then(
        (info) => info.mtimeMs,
        () => 0
      )
    )
  );
  return String(Math.round(Math.max(...times)));
}

async function stamped(pathname, body) {
  const stamp = await assetStamp();
  if (pathname === '/') return body.replaceAll('__STAMP__', stamp);
  // Every module import gets the stamp, so an edited interface is never served
  // from the browser's cache; the earlier single-import rewrite missed one file.
  if (pathname.endsWith('.js'))
    return body.replace(/from '([^']+\.js)'/g, (_match, spec) => `from '${spec}?${stamp}'`);
  return body;
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'content-type': type,
    // Browsers happily reuse a cached module or page across a reload, which would
    // hide an edited planner, so every response forbids caching.
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    pragma: 'no-cache',
    expires: '0',
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${HOST}`);
  if (req.method === 'GET' && staticFiles.has(url.pathname)) {
    const { file, type } = staticFiles.get(url.pathname);
    return send(res, 200, await stamped(url.pathname, await readFile(file, 'utf8')), type);
  }
  if (req.method === 'GET' && url.pathname.startsWith('/images/')) {
    const file = path.resolve(rootDir, `.${decodeURIComponent(url.pathname)}`);
    const type = imageTypes[path.extname(file).toLowerCase()];
    if (!file.startsWith(imagesDir + path.sep) || !type)
      return send(res, 404, { error: 'not found' });
    const body = await readFile(file).catch(() => null);
    if (!body) return send(res, 404, { error: 'not found' });
    res.writeHead(200, { 'content-type': type, 'cache-control': 'max-age=3600' });
    return res.end(body);
  }
  if (req.method === 'GET' && url.pathname === '/api/combos') {
    return send(res, 200, viewOf(await loadAll()));
  }
  if (req.method === 'POST' && url.pathname === '/api/combos') {
    if (req.headers.origin && new URL(req.headers.origin).hostname !== HOST) {
      return send(res, 403, { error: 'Saves are only accepted from the planner page.' });
    }
    const plan = await readBody(req);
    const { heroes, isX8Lane, parsed, queueJson } = await loadAll();
    const next = buildComboSource(parsed, plan, {
      heroNames: new Set(Object.keys(heroes)),
      isX8Lane,
    });
    const placed = new Set((plan.order || []).filter((o) => o.anchor).map((o) => o.id));
    await writeFile(combosPath, next, 'utf8');
    await writeQueue(
      queueJson,
      (plan.added || []).filter((lane) => !placed.has(lane.id))
    );
    return send(res, 200, viewOf(await loadAll()));
  }
  return send(res, 404, { error: 'not found' });
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (scriptPath && scriptPath === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.COMBOS_PLANNER_PORT) || DEFAULT_PORT;
  http
    .createServer((req, res) =>
      handle(req, res).catch((error) => send(res, 400, { error: error.message || String(error) }))
    )
    .listen(port, HOST, () => {
      console.log(`Combos Planner: http://${HOST}:${port}/`);
      console.log('Save writes js/combos-db.js. Review with git diff, then commit and push.');
    });
}
