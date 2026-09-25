// js/combo-plan.js
//
// The ranking's plan engine, shared by the two hosts of the Combos planner: the
// local tool (scripts/combos-planner-server.mjs, which writes js/combos-db.js on
// disk) and the admin tab (js/admin-combos.js, which rebuilds the same file in the
// browser for review). It is pure — strings in, strings out, no fs and no DOM — so
// both hosts, and the tests, run exactly the same code.
//
// A plan is { order, added, baseOrder, edits, removed }: `order` places each lane
// above a current lineup, `added` holds lineups that are not in the file yet,
// `baseOrder` reorders the current list, `edits` renames or re-skins any lineup,
// and `removed` drops one. Every entry in rankedCombos stays one line, so an
// unchanged plan reproduces the file byte for byte.

export const ARRAY_START = 'export const rankedCombos = [';
export const ENTRY_LINE = /^\s*\{ heroes: .*\},?\s*$/;

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

/**
 * The planner's view: the fixed S0-X2 list plus every X8 lane and where it sits.
 * Each entry keeps its source `line`, so the save summary can quote the file.
 */
export function describeCombos(parsed) {
  const base = [];
  const x8 = [];
  const lastBase = parsed.items.map((item) => item.kind).lastIndexOf('base');
  let pending = [];
  parsed.items.forEach((item, index) => {
    if (item.kind === 'base') {
      const id = `b${base.length}`;
      base.push({ id, heroes: item.combo.heroes, skin: item.combo.skin || '', line: item.line });
      pending.forEach((lane) => (lane.anchor = id));
      pending = [];
    } else if (item.kind === 'x8') {
      const lane = {
        id: `x${x8.length}`,
        heroes: item.combo.heroes,
        skin: item.combo.skin || '',
        note: item.combo.note || '',
        anchor: '',
        line: item.line,
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
    throw new Error('baseOrder must list every current lineup exactly once');
  const seen = new Set();
  for (const id of ids) {
    if (!known.has(id)) throw new Error(`unknown current lineup ${id}`);
    if (seen.has(id)) throw new Error(`current lineup ${id} is listed twice`);
    seen.add(id);
  }
  return ids;
}

/** Changed lines, keyed by lineup id: S0-X2 (b…) or X8 (x…) alike. */
export function readLaneEdits(plan, { baseIds, x8Ids, heroNames, isX8Lane }) {
  const list = Array.isArray(plan.edits)
    ? plan.edits
    : Array.isArray(plan.baseEdits)
      ? plan.baseEdits
      : [];
  const edits = new Map();
  for (const edit of list) {
    const id = String((edit && edit.id) || '');
    const isBase = baseIds.has(id);
    if (!isBase && !x8Ids.has(id)) throw new Error(`unknown lineup ${id || '(no id)'}`);
    const heroes = Array.isArray(edit.heroes) ? edit.heroes.map(String) : [];
    if (heroes.length !== 3 || new Set(heroes).size !== 3)
      throw new Error('an edited lineup needs three different heroes');
    for (const name of heroes) if (!heroNames.has(name)) throw new Error(`unknown hero: ${name}`);
    const usesX8 = isX8Lane({ heroes });
    if (isBase && usesX8)
      throw new Error(
        `${heroes.join(' / ')} uses an X8 hero, so it stays out of the current lineups`
      );
    if (!isBase && !usesX8)
      throw new Error(`${heroes.join(' / ')} has no X8 hero, so it belongs in the current lineups`);
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
export function buildComboSource(parsed, plan, options) {
  return buildComboPlanOutput(parsed, plan, options).source;
}

/** The combo a written line stands for: { heroes, skin?, note? }, like rankedCombos holds. */
function entryOf({ heroes, skin, note }) {
  return {
    heroes: [...heroes],
    ...(skin ? { skin } : {}),
    ...(note ? { note } : {}),
  };
}

/**
 * The same rebuild, returning the file text and the ordered list of entries that
 * file's rankedCombos would hold: what the admin tab publishes live.
 */
export function buildComboPlanOutput(parsed, plan, { heroNames, isX8Lane }) {
  const view = describeCombos(parsed);
  const baseIds = new Set(view.base.map((b) => b.id));
  const lanes = new Map(view.x8.map((lane) => [lane.id, lane]));
  const added = Array.isArray(plan.added) ? plan.added : [];
  const keyOf = (combo) => `${combo.heroes.join('|')}#${combo.skin || ''}`;
  const x8Ids = new Set(view.x8.map((l) => l.id));
  const edits = readLaneEdits(plan, { baseIds, x8Ids, heroNames, isX8Lane });
  const baseOrder = readBaseOrder(plan, view);
  const base = view.base.map((b) => {
    const edit = edits.get(b.id);
    return edit ? { ...b, ...edit } : b;
  });
  const x8View = view.x8.map((l) => {
    const edit = edits.get(l.id);
    return edit ? { ...l, ...edit, edited: true } : l;
  });
  const keys = new Set([...base, ...x8View].map(keyOf));
  if (keys.size !== base.length + x8View.length)
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
  // Lineups the planner marked as not worth keeping: their lines leave the file.
  const removed = new Set((Array.isArray(plan.removed) ? plan.removed : []).map(String));
  for (const id of removed)
    if (!baseIds.has(id) && !x8Ids.has(id) && !lanes.has(id))
      throw new Error(`unknown lineup ${id} to remove`);
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
  // A removed lineup takes nothing with it: its anchored lanes fall back to the
  // tail block instead of disappearing, so no placement is lost by accident.
  for (const id of removed) placedAbove.delete(id);
  for (const [anchor, ids] of [...placedAbove]) {
    const keep = ids.filter((id) => !removed.has(id));
    if (keep.length) placedAbove.set(anchor, keep);
    else placedAbove.delete(anchor);
  }
  const x8Lines = parsed.items.filter((item) => item.kind === 'x8').map((item) => item.line);
  const x8IndexOf = new Map(view.x8.map((lane, i) => [lane.id, i]));
  const lineOf = (id) => {
    const lane = lanes.get(id);
    const line = lane.added ? entryLine(lane) : x8Lines[x8IndexOf.get(id)];
    const edit = edits.get(id);
    const note = lane.added ? '' : lane.note;
    return {
      line: edit ? editedEntryLine(line, edit) : line,
      entry: entryOf({ ...lane, ...(edit || {}), note }),
    };
  };
  const placedIds = new Set([...placedAbove.values()].flat());
  // Unplaced new lanes stay in the queue file; only placed ones enter the database.
  const tailLanes = view.x8
    .map((lane) => lane.id)
    .filter((id) => !placedIds.has(id) && !removed.has(id));
  const baseItems = parsed.items.filter((item) => item.kind === 'base');
  const baseLines = baseItems.map((item) => item.line);
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
    if (removed.has(id)) return null;
    const edit = edits.get(id);
    const combo = baseItems[original].combo;
    return {
      line: edit ? editedEntryLine(baseLines[original], edit) : baseLines[original],
      entry: entryOf({ ...combo, ...(edit || {}), note: combo.note || '' }),
    };
  });
  const written = out
    .map((line) => (typeof line === 'string' || line.line ? line : rendered[line.base]))
    .filter((line) => line !== null);
  return {
    source: [
      ...parsed.head,
      ...written.map((line) => (typeof line === 'string' ? line : line.line)),
      ...parsed.tail,
    ].join('\n'),
    entries: written.filter((line) => typeof line !== 'string').map((line) => line.entry),
  };
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
        queuedFrom: entry.queuedFrom ? String(entry.queuedFrom) : 'x8-queue.json',
      });
    }
  }
  return { lanes, skipped };
}

/**
 * The planner view a file and a queue describe: heroes, the current lineups, and
 * every new lineup with the current one it sits above (or none, when it waits at
 * the end). Both hosts build their state through this, so the ids, the anchors and
 * the skipped-entry reasons cannot drift.
 */
export function buildView({
  source,
  combos,
  heroTable,
  queueLanes = [],
  queueSkipped = [],
  portraitUrl = (url) => url,
}) {
  const heroes = {};
  for (const hero of heroTable) {
    heroes[hero.name] = {
      s: hero.season,
      t: hero.Type,
      p: hero.State === 'Paid' ? 1 : 0,
      i: portraitUrl(hero.imageUrl),
    };
  }
  const isX8Lane = (combo) => combo.heroes.some((name) => heroes[name] && heroes[name].s === 'X8');
  const parsed = parseComboSource(source, combos, isX8Lane);
  const view = describeCombos(parsed);
  const existingKeys = combos.map((c) => `${c.heroes.join('|')}#${c.skin || ''}`);
  const queue = readQueue(
    { lanes: queueLanes },
    { heroNames: new Set(Object.keys(heroes)), isX8Lane, existingKeys }
  );
  return {
    heroes,
    isX8Lane,
    parsed,
    base: view.base,
    x8: [...view.x8, ...queue.lanes.map((lane) => ({ ...lane, anchor: '', queued: true }))],
    skipped: [...queueSkipped, ...queue.skipped],
  };
}

/**
 * The plan that rebuilds a given ranking (a list of { heroes, skin?, note? },
 * such as a list published live) from the file the view describes: lines that
 * match keep their place in the file, the rest pair up as edits of lines that
 * are gone, and what is still left over is added (an X8 lineup) or removed.
 * Throws when the list cannot be written as combos-db.js, so the caller never
 * hands over a file that differs from the list.
 */
export function planFromEntries(view, entries, { heroNames, isX8Lane }) {
  const keyOf = (c) => `${c.heroes.join('|')}#${c.skin || ''}`;
  const fileX8 = view.x8.filter((lane) => !lane.queued);
  const byKey = new Map();
  for (const b of view.base) byKey.set(keyOf(b), { id: b.id, kind: 'base' });
  for (const l of fileX8) byKey.set(keyOf(l), { id: l.id, kind: 'x8' });
  const used = new Set();
  const rows = entries.map((entry) => {
    const found = byKey.get(keyOf(entry));
    if (found && !used.has(found.id)) {
      used.add(found.id);
      return { entry, id: found.id, kind: found.kind };
    }
    return { entry, id: '', kind: isX8Lane(entry) ? 'x8' : 'base' };
  });
  const spare = {
    base: view.base.filter((b) => !used.has(b.id)),
    x8: fileX8.filter((l) => !used.has(l.id)),
  };
  const edits = [];
  for (const row of rows) {
    if (row.id) continue;
    const line = spare[row.kind].shift();
    if (!line) continue;
    row.id = line.id;
    edits.push({ id: line.id, heroes: [...row.entry.heroes], skin: row.entry.skin || '' });
  }
  const added = [];
  for (const row of rows) {
    if (row.id) continue;
    if (row.kind === 'base')
      throw new Error(`${row.entry.heroes.join(' / ')} is a new S0-X2 lineup the file cannot take`);
    row.id = laneSlug(row.entry);
    added.push({ id: row.id, heroes: [...row.entry.heroes], skin: row.entry.skin || '' });
  }
  const removed = [...spare.base, ...spare.x8].map((line) => line.id);
  const order = [];
  let pending = [];
  for (const row of rows) {
    if (row.kind === 'x8') {
      pending.push(row.id);
      continue;
    }
    for (const id of pending) order.push({ id, anchor: row.id });
    pending = [];
  }
  for (const id of pending) order.push({ id, anchor: '' });
  // A removed line keeps its slot in the file, so the comments around it stay put.
  const baseOrder = rows.filter((r) => r.kind === 'base').map((r) => r.id);
  for (const line of spare.base)
    baseOrder.splice(Math.min(baseOrder.length, Number(line.id.slice(1))), 0, line.id);
  const plan = { order, added, baseOrder, edits, removed };
  const rebuilt = buildComboPlanOutput(view.parsed, plan, { heroNames, isX8Lane }).entries;
  const same = (a, b) =>
    a.length === b.length &&
    a.every((c, i) => keyOf(c) === keyOf(b[i]) && (c.note || '') === (b[i].note || ''));
  if (!same(rebuilt, entries))
    throw new Error('that list cannot be written as combos-db.js without changing its order');
  return plan;
}
