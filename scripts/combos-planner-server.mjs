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

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolDir = path.join(rootDir, 'tools', 'combos-planner');
const combosPath = path.join(rootDir, 'js', 'combos-db.js');
const queuePath = path.join(toolDir, 'x8-queue.json');
const heroesPath = path.join(rootDir, 'js', 'heroes-data.js');
const HOST = '127.0.0.1';
const DEFAULT_PORT = 5396;
const MAX_REQUEST_BYTES = 512 * 1024;
const ARRAY_START = 'export const rankedCombos = [';
const ENTRY_LINE = /^\s*\{ heroes: .*\},?\s*$/;

/** Exported so a test can check that every asset the page asks for is served. */
export const staticFiles = new Map([
  ['/', { file: path.join(toolDir, 'index.html'), type: 'text/html; charset=utf-8' }],
  ['/app.js', { file: path.join(toolDir, 'app.js'), type: 'text/javascript; charset=utf-8' }],
  ['/lanes.js', { file: path.join(toolDir, 'lanes.js'), type: 'text/javascript; charset=utf-8' }],
  ['/styles.css', { file: path.join(toolDir, 'styles.css'), type: 'text/css; charset=utf-8' }],
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

/**
 * Split combos-db.js source into the text before the array, the array's lines,
 * and the text after it, pairing each entry line with its parsed combo.
 */
export function parseComboSource(source, combos, isX8Lane) {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line.startsWith(ARRAY_START));
  if (start < 0) throw new Error('rankedCombos array not found in combos-db.js');
  const end = lines.findIndex((line, index) => index > start && line.startsWith('];'));
  if (end < 0) throw new Error('rankedCombos array has no closing line');
  const body = lines.slice(start + 1, end);
  const entryLines = body.filter((line) => ENTRY_LINE.test(line));
  if (entryLines.length !== combos.length) {
    throw new Error(
      `combos-db.js has ${combos.length} entries but ${entryLines.length} one-line entries; the planner needs one entry per line`
    );
  }
  let cursor = 0;
  const items = body.map((line) => {
    if (!ENTRY_LINE.test(line)) return { kind: 'text', line };
    const combo = combos[cursor++];
    return { kind: isX8Lane(combo) ? 'x8' : 'base', line, combo };
  });
  return { head: lines.slice(0, start + 1), items, tail: lines.slice(end) };
}

/** The planner's view: the fixed S0-X2 list plus every X8 lane and where it sits. */
export function describeCombos(parsed) {
  const base = [];
  const x8 = [];
  const lastBase = parsed.items.map((item) => item.kind).lastIndexOf('base');
  let pending = [];
  parsed.items.forEach((item, index) => {
    if (item.kind === 'base') {
      const id = `b${base.length}`;
      base.push({ id, heroes: item.combo.heroes, skin: item.combo.skin || '' });
      pending.forEach((lane) => (lane.anchor = id));
      pending = [];
    } else if (item.kind === 'x8') {
      const lane = {
        id: `x${x8.length}`,
        heroes: item.combo.heroes,
        skin: item.combo.skin || '',
        note: item.combo.note || '',
        anchor: '',
      };
      x8.push(lane);
      if (index < lastBase) pending.push(lane);
    }
  });
  return { base, x8 };
}

function quoteName(name) {
  return name.includes("'") ? JSON.stringify(name) : `'${name}'`;
}

export function entryLine({ heroes, skin }) {
  return `  { heroes: [${heroes.map(quoteName).join(', ')}]${skin ? `, skin: '${skin}'` : ''} },`;
}

const NOTE_IN_LINE = /,\s*note:\s*('(?:\\.|[^'])*'|"(?:\\.|[^"])*")/;

/** An edited entry in the file's own style, keeping the note the line already carried. */
export function editedEntryLine(line, { heroes, skin }) {
  const note = NOTE_IN_LINE.exec(line);
  const rebuilt = entryLine({ heroes, skin });
  return note ? rebuilt.replace(/ \},$/, `, note: ${note[1]} },`) : rebuilt;
}

/** The S0-X2 order to write: the plan's list of base ids, or the file's own order. */
export function readBaseOrder(plan, view) {
  if (!Array.isArray(plan.baseOrder)) return view.base.map((b) => b.id);
  const ids = plan.baseOrder.map(String);
  const known = new Set(view.base.map((b) => b.id));
  if (ids.length !== known.size)
    throw new Error('baseOrder must list every S0-X2 lineup exactly once');
  const seen = new Set();
  for (const id of ids) {
    if (!known.has(id)) throw new Error(`unknown S0-X2 lineup ${id}`);
    if (seen.has(id)) throw new Error(`S0-X2 lineup ${id} is listed twice`);
    seen.add(id);
  }
  return ids;
}

/** Changed S0-X2 lines, keyed by base id. Every edit is checked against the hero list. */
export function readBaseEdits(plan, { baseIds, heroNames, isX8Lane }) {
  const edits = new Map();
  for (const edit of Array.isArray(plan.baseEdits) ? plan.baseEdits : []) {
    const id = String((edit && edit.id) || '');
    if (!baseIds.has(id)) throw new Error(`unknown S0-X2 lineup ${id || '(no id)'}`);
    const heroes = Array.isArray(edit.heroes) ? edit.heroes.map(String) : [];
    if (heroes.length !== 3 || new Set(heroes).size !== 3)
      throw new Error('an edited lineup needs three different heroes');
    for (const name of heroes) if (!heroNames.has(name)) throw new Error(`unknown hero: ${name}`);
    if (isX8Lane({ heroes }))
      throw new Error(`${heroes.join(' / ')} uses an X8 hero, so it stays out of the S0-X2 list`);
    const skin = edit.skin ? String(edit.skin) : '';
    if (skin && !/^[123]{3}$/.test(skin)) throw new Error('skin code must be three digits of 1-3');
    edits.set(id, { heroes, skin });
  }
  return edits;
}

/**
 * Rebuild combos-db.js from a plan: `placements` maps an X8 lane id to the base
 * id it sits directly above (in `order`), `added` holds new lanes. Unplaced
 * lanes go to the tail block in their existing order, new ones after them.
 */
export function buildComboSource(parsed, plan, { heroNames, isX8Lane }) {
  const view = describeCombos(parsed);
  const baseIds = new Set(view.base.map((b) => b.id));
  const lanes = new Map(view.x8.map((lane) => [lane.id, lane]));
  const added = Array.isArray(plan.added) ? plan.added : [];
  const keyOf = (combo) => `${combo.heroes.join('|')}#${combo.skin || ''}`;
  const edits = readBaseEdits(plan, { baseIds, heroNames, isX8Lane });
  const baseOrder = readBaseOrder(plan, view);
  const base = view.base.map((b) => {
    const edit = edits.get(b.id);
    return edit ? { ...b, ...edit } : b;
  });
  const keys = new Set([...base, ...view.x8].map(keyOf));
  if (keys.size !== base.length + view.x8.length)
    throw new Error('that edit would make two lineups in combos-db.js identical');
  for (const lane of added) {
    if (!/^n-[a-z0-9_-]{1,200}$/.test(String(lane.id))) throw new Error('bad id for an added lane');
    if (!Array.isArray(lane.heroes) || lane.heroes.length !== 3)
      throw new Error('a lane needs three heroes');
    if (new Set(lane.heroes).size !== 3) throw new Error('a lane needs three different heroes');
    for (const name of lane.heroes)
      if (!heroNames.has(name)) throw new Error(`unknown hero: ${name}`);
    if (lane.skin && !/^[123]{3}$/.test(lane.skin))
      throw new Error('skin code must be three digits of 1-3');
    if (!isX8Lane(lane)) throw new Error(`${lane.heroes.join(' / ')} has no X8 hero`);
    if (keys.has(keyOf(lane)))
      throw new Error(`${lane.heroes.join(' / ')} is already in the database`);
    keys.add(keyOf(lane));
    lanes.set(lane.id, { ...lane, added: true });
  }
  const placedAbove = new Map();
  const order = Array.isArray(plan.order) ? plan.order : [];
  const seen = new Set();
  for (const { id, anchor } of order) {
    if (!lanes.has(id)) throw new Error(`unknown lane ${id}`);
    if (seen.has(id)) throw new Error(`lane ${id} is placed twice`);
    seen.add(id);
    if (!anchor) continue;
    if (!baseIds.has(anchor)) throw new Error(`unknown anchor ${anchor}`);
    if (!placedAbove.has(anchor)) placedAbove.set(anchor, []);
    placedAbove.get(anchor).push(id);
  }
  const lineOf = (id) => {
    const lane = lanes.get(id);
    if (lane.added) return entryLine(lane);
    return parsed.items.find((item) => item.kind === 'x8' && item.combo.heroes === lane.heroes)
      .line;
  };
  const placedIds = new Set([...placedAbove.values()].flat());
  // Unplaced new lanes stay in the queue file; only placed ones enter the database.
  const tailLanes = view.x8.map((lane) => lane.id).filter((id) => !placedIds.has(id));
  const baseLines = parsed.items.filter((item) => item.kind === 'base').map((item) => item.line);
  // Base lines are held as slot placeholders: a slot keeps its comment lines, and
  // the plan's order decides which S0-X2 lineup is written into each one.
  const out = [];
  let slot = 0;
  let textRun = [];
  const lastBase = parsed.items.map((item) => item.kind).lastIndexOf('base');
  parsed.items.forEach((item, index) => {
    if (item.kind === 'text') {
      textRun.push(item.line);
      return;
    }
    if (item.kind === 'base') {
      // X8 lanes stay with the lineup they are anchored to wherever the plan moved
      // it: this slot holds baseOrder[slot], whose lanes are anchored to its own id.
      const original = Number(String(baseOrder[slot]).slice(1));
      for (const laneId of placedAbove.get(`b${original}`) || []) out.push(lineOf(laneId));
      out.push(...textRun, { base: slot });
      slot += 1;
      textRun = [];
      return;
    }
    // An X8 line: it is re-emitted from the plan, never where it used to be.
    if (index > lastBase) {
      if (tailLanes.length) out.push(...textRun);
      textRun = [];
    } else {
      textRun = textRun.filter((line) => line.trim() !== '');
    }
  });
  if (!parsed.items.slice(lastBase + 1).some((item) => item.kind === 'x8') && tailLanes.length) {
    out.push('', '  // --- X8 CATCH-UP BRACKET ---', '');
  }
  for (const id of tailLanes) out.push(lineOf(id));
  out.push(...textRun);
  const rendered = baseOrder.map((id) => {
    const original = Number(String(id).slice(1));
    const edit = edits.get(id);
    return edit ? editedEntryLine(baseLines[original], edit) : baseLines[original];
  });
  const written = out.map((line) => (typeof line === 'string' ? line : rendered[line.base]));
  return [...parsed.head, ...written, ...parsed.tail].join('\n');
}

export function laneSlug({ heroes, skin }) {
  const names = heroes.map((n) =>
    n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  );
  return `n-${names.join('_')}${skin ? `-${skin}` : ''}`;
}

/** Queue entries that are valid and not yet in the database, plus the reasons others were skipped. */
export function readQueue(json, { heroNames, isX8Lane, existingKeys }) {
  const lanes = [];
  const skipped = [];
  const seen = new Set(existingKeys);
  for (const entry of Array.isArray(json?.lanes) ? json.lanes : []) {
    const heroes = Array.isArray(entry?.heroes) ? entry.heroes.map(String) : [];
    const skin = entry?.skin ? String(entry.skin) : '';
    const label = heroes.join(' / ') || '(empty)';
    const key = `${heroes.join('|')}#${skin}`;
    if (heroes.length !== 3 || heroes.some((n) => !heroNames.has(n)))
      skipped.push(`${label}: unknown hero name`);
    else if (skin && !/^[123]{3}$/.test(skin)) skipped.push(`${label}: bad skin code`);
    else if (!isX8Lane({ heroes })) skipped.push(`${label}: no X8 hero`);
    else if (seen.has(key)) skipped.push(`${label}: already in the database or listed twice`);
    else {
      seen.add(key);
      lanes.push({
        id: laneSlug({ heroes, skin }),
        heroes,
        skin,
        source: entry.source ? String(entry.source) : '',
      });
    }
  }
  return { lanes, skipped };
}

async function loadAll() {
  const [source, combosModule, heroesModule] = await Promise.all([
    readFile(combosPath, 'utf8'),
    importFresh(combosPath),
    importFresh(heroesPath),
  ]);
  const heroes = {};
  for (const hero of heroesModule.allHeroesData) {
    heroes[hero.name] = {
      s: hero.season,
      t: hero.Type,
      p: hero.State === 'Paid' ? 1 : 0,
      i: portraitUrl(hero.imageUrl),
    };
  }
  const isX8Lane = (combo) => combo.heroes.some((name) => heroes[name]?.s === 'X8');
  const parsed = parseComboSource(source, combosModule.rankedCombos, isX8Lane);
  let queueJson = { lanes: [] };
  try {
    queueJson = JSON.parse(await readFile(queuePath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT')
      throw new Error(`x8-queue.json is not valid JSON: ${error.message}`);
  }
  const existingKeys = combosModule.rankedCombos.map(
    (c) => `${c.heroes.join('|')}#${c.skin || ''}`
  );
  const queue = readQueue(queueJson, {
    heroNames: new Set(Object.keys(heroes)),
    isX8Lane,
    existingKeys,
  });
  return { heroes, isX8Lane, parsed, queue, queueJson };
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

function viewOf({ heroes, parsed, queue }) {
  const view = describeCombos(parsed);
  return {
    heroes,
    base: view.base,
    x8: [...view.x8, ...queue.lanes.map((l) => ({ ...l, anchor: '', queued: true }))],
    skipped: queue.skipped,
  };
}

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
  const files = ['index.html', 'app.js', 'lanes.js', 'styles.css'].map((name) =>
    path.join(toolDir, name)
  );
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
  if (pathname === '/app.js') return body.replace("'/lanes.js'", `'/lanes.js?${stamp}'`);
  return body;
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
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
