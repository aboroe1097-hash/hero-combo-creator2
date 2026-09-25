// js/combo-workflow.js
//
// The placement workflow behind the Combos planner (js/combos-planner-ui.js): the
// ranking as a flat list of rows, where a new lineup lands for a given gap, the
// suggested slot for every unplaced lineup, auto-draft, the undo history, the paste
// import and the summary shown before Save. Pure — no DOM, no storage, no network —
// so both hosts and the unit tests run exactly this code.
//
// A row is one line of the merged ranking:
//   { type: 'base', id, heroes, rank }           a current S0-X2 lineup (#rank)
//   { type: 'x8', id, heroes, anchor, slot, … }  a new lineup placed above `anchor`
// A gap is an index into rows: gap g sits directly before rows[g], and
// rows.length is the end of the list, where unplaced lineups wait.

import { byScore } from './combo-lanes.js';
import { editedEntryLine, entryLine } from './combo-plan.js';
import { createHeroMatcher } from './hero-name-match.js';

/* ------------------------------------------------------------------ rows */

/**
 * The merged ranking: current lineups in order, each preceded by the new lineups
 * anchored above it (ordered by slot). `bases` is [{ id, heroes, … }] in rank
 * order; `lanes` is every new lineup, placed or not.
 */
export function mergeRows(bases, lanes) {
  const above = new Map();
  for (const lane of lanes) {
    if (!lane.anchor) continue;
    if (!above.has(lane.anchor)) above.set(lane.anchor, []);
    above.get(lane.anchor).push(lane);
  }
  for (const list of above.values()) list.sort((a, b) => a.slot - b.slot);
  const rows = [];
  bases.forEach((base, index) => {
    const rank = index + 1;
    for (const lane of above.get(base.id) || []) rows.push({ ...lane, type: 'x8', above: rank });
    rows.push({ ...base, type: 'base', rank });
  });
  return rows;
}

/** Where every new lineup in `rows` sits: id -> { anchor, slot }, slots 1, 2, 3… per anchor. */
export function slotsFrom(rows) {
  const out = new Map();
  let pending = [];
  for (const row of rows) {
    if (row.type === 'x8') {
      pending.push(row.id);
      continue;
    }
    pending.forEach((id, i) => out.set(id, { anchor: row.id, slot: i + 1 }));
    pending = [];
  }
  // Nothing sits below the last current lineup: a lineup left there waits at the end.
  for (const id of pending) out.set(id, { anchor: '', slot: 0 });
  return out;
}

/** The rows with the given lineups taken out. */
export function withoutIds(rows, ids) {
  const drop = new Set(ids);
  return rows.filter((row) => !drop.has(row.id));
}

/**
 * Place `lanes` (in the given order) as one contiguous block at `gap`, a gap of
 * `rows` as they are now — the lanes may be among them (a move) or not (a new
 * placement). Returns the placement of every new lineup in the result, so the
 * caller can apply it in one step.
 */
export function placeBlock(rows, lanes, gap) {
  const ids = new Set(lanes.map((lane) => lane.id));
  const at = rows.slice(0, Math.max(0, gap)).filter((row) => !ids.has(row.id)).length;
  const rest = rows.filter((row) => !ids.has(row.id));
  const block = lanes.map((lane) => ({ ...lane, type: 'x8' }));
  return slotsFrom([...rest.slice(0, at), ...block, ...rest.slice(at)]);
}

/** The gap directly above current lineup #rank (after any new lineups already there). */
export function gapAboveRank(rows, rank) {
  return rows.findIndex((row) => row.type === 'base' && row.rank === rank);
}

/**
 * The gap (in `rows`, the lineup still among them) a placed lineup moves to when
 * nudged `delta` rows, negative being up. It never leaves the ranking: the lowest
 * place is directly above the last lineup. Returns -1 for an unknown id, and a gap
 * equal to its own index or the next one when it cannot move that way.
 */
export function moveGap(rows, id, delta) {
  const from = rows.findIndex((row) => row.id === id);
  if (from < 0) return -1;
  if (delta < 0) return Math.max(0, from + delta);
  return Math.min(rows.length - 1, from + delta + 1);
}

/** "above #12", or "below #11" when asked for and the gap directly follows #11. */
export function gapLabel(rows, gap, prefer = 'above') {
  if (gap >= rows.length) return 'at the end';
  const prev = rows[gap - 1];
  if (prefer === 'below' && prev && prev.type === 'base') return 'below #' + prev.rank;
  const next = rows.slice(gap).find((row) => row.type === 'base');
  return next ? 'above #' + next.rank : 'at the end';
}

/* ----------------------------------------------------------- suggestions */

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
};
const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

/**
 * The current lineups that share two of a lineup's three heroes. `samePattern`
 * is true when the two shared heroes sit in the same positions, so the new
 * lineup's X8 hero takes exactly the slot of `replaced`.
 */
export function analoguesOf(heroes, bases) {
  const out = [];
  for (const base of bases) {
    const shared = heroes.filter((name) => base.heroes.includes(name));
    if (shared.length !== 2) continue;
    const replaced = base.heroes.find((name) => !heroes.includes(name));
    const samePattern = heroes.every(
      (name, i) => !shared.includes(name) || base.heroes[i] === name
    );
    out.push({ base, shared, replaced, samePattern });
  }
  return out;
}

/**
 * The suggestion engine for one state of the ranking. For each lineup it works
 * through four signals, in order:
 *   (a) analogue: a current lineup that shares two heroes, preferring the one where
 *       the X8 hero takes the replaced hero's position; the suggestion is directly
 *       above it;
 *   (b) learned: when you have already placed lineups where the same X8 hero
 *       replaces the same hero, the new one keeps the same offset from its
 *       analogue (the median of yours);
 *   (c) paid: a lineup without a paid hero goes below a run of paid lineups that
 *       directly follows the suggested gap;
 *   (d) tier: with no analogue, the ROC Academy tier maps to where you placed that
 *       tier so far (the median rank); with no such placement it waits at the end.
 * `rows` is the ranking without the lineup being suggested for.
 */
export function createSuggester({ heroes: H, rows }) {
  const isX8 = (name) => !!(H[name] && H[name].s === 'X8');
  const isPaid = (heroes) => heroes.some((name) => H[name] && H[name].p);
  const bases = rows.filter((row) => row.type === 'base');
  const count = bases.length;
  const indexOfRank = new Map(bases.map((base) => [base.rank, rows.indexOf(base)]));
  const learned = new Map();
  const tierRanks = new Map();
  const keyOf = (x8, replaced) => x8 + '>' + replaced;

  // Learn from what is already placed: each placed lineup with one X8 hero and an
  // analogue records how far from that analogue it went, keyed by the swap it made.
  for (const row of rows) {
    if (row.type !== 'x8') continue;
    if (row.tier) {
      if (!tierRanks.has(row.tier)) tierRanks.set(row.tier, []);
      tierRanks.get(row.tier).push(row.above);
    }
    const x8 = row.heroes.filter(isX8);
    if (x8.length !== 1) continue;
    const found = analoguesOf(row.heroes, bases);
    if (!found.length) continue;
    found.sort(
      (a, b) =>
        Number(b.samePattern) - Number(a.samePattern) ||
        Math.abs(a.base.rank - row.above) - Math.abs(b.base.rank - row.above)
    );
    const key = keyOf(x8[0], found[0].replaced);
    if (!learned.has(key)) learned.set(key, []);
    learned.get(key).push(row.above - found[0].base.rank);
  }

  /** Move a gap below a run of paid lineups when the lineup itself is free. */
  function paidRule(lane, gap, parts, signals) {
    if (gap >= rows.length || isPaid(lane.heroes)) return gap;
    let end = gap;
    while (end < rows.length && isPaid(rows[end].heroes)) end++;
    if (end === gap) return gap;
    const run = rows.slice(gap, end);
    const ranks = run.filter((row) => row.type === 'base').map((row) => row.rank);
    const span = ranks.length
      ? ' (#' + ranks[0] + (ranks.length > 1 ? '–#' + ranks[ranks.length - 1] : '') + ')'
      : '';
    signals.push('paid');
    parts.push('below ' + plural(run.length, 'paid lineup') + span + ', since this one is free');
    return end;
  }

  function suggest(lane) {
    const signals = [];
    const parts = [];
    let gap = null;
    let prefer = 'above';
    let analogue = null;
    const x8 = lane.heroes.filter(isX8);
    if (x8.length === 1 && count) {
      const found = analoguesOf(lane.heroes, bases);
      if (found.length) {
        const has = (c) => Number(learned.has(keyOf(x8[0], c.replaced)));
        found.sort(
          (a, b) =>
            Number(b.samePattern) - Number(a.samePattern) ||
            has(b) - has(a) ||
            a.base.rank - b.base.rank
        );
        const best = found[0];
        analogue = {
          id: best.base.id,
          rank: best.base.rank,
          heroes: best.base.heroes,
          shared: best.shared,
          replaced: best.replaced,
          samePattern: best.samePattern,
          others: found.length - 1,
        };
        signals.push('analogue');
        const key = keyOf(x8[0], best.replaced);
        let offset = 0;
        if (learned.has(key)) {
          const offsets = learned.get(key);
          offset = median(offsets);
          signals.push('learned');
        }
        if (offset <= 0) {
          const rank = Math.max(1, Math.min(count, best.base.rank + offset));
          gap = indexOfRank.get(rank);
        } else {
          const rank = Math.max(1, Math.min(count - 1, best.base.rank + offset - 1));
          gap = indexOfRank.get(rank) + 1;
          prefer = 'below';
        }
        parts.push(
          'shares ' + best.shared.join(' + ') + ' with #' + best.base.rank,
          ...(best.samePattern ? [x8[0] + ' in ' + best.replaced + "'s slot"] : [])
        );
        if (learned.has(key)) {
          const n = learned.get(key).length;
          const where =
            offset === 0
              ? 'directly above'
              : offset < 0
                ? plural(-offset, 'row') + ' above'
                : plural(offset, 'row') + ' below';
          parts.push(
            'like ' +
              plural(n, 'lineup') +
              ' you placed with ' +
              x8[0] +
              ' for ' +
              best.replaced +
              ', ' +
              where +
              ' ' +
              (n === 1 ? 'its' : 'their') +
              ' analogue'
          );
        }
      }
    }
    if (gap == null) {
      const ranks = lane.tier ? tierRanks.get(lane.tier) : null;
      if (ranks && ranks.length && count) {
        const rank = Math.max(1, Math.min(count, median(ranks)));
        gap = indexOfRank.get(rank);
        signals.push('tier');
        parts.push(
          lane.tier +
            ' tier: your ' +
            lane.tier +
            '-tier placements sit around #' +
            rank +
            ' (' +
            plural(ranks.length, 'lineup') +
            ')'
        );
      } else {
        signals.push('end');
        parts.push(
          lane.tier
            ? 'no analogue shares two heroes, and no ' + lane.tier + '-tier lineup is placed yet'
            : 'no analogue shares two heroes, and it has no tier'
        );
        return {
          gap: rows.length,
          before: null,
          end: true,
          label: 'at the end',
          reason: 'waits at the end · ' + parts.join(' · '),
          signals,
          analogue,
        };
      }
    }
    const unmoved = gap;
    gap = paidRule(lane, gap, parts, signals);
    if (gap !== unmoved) prefer = 'below';
    const end = gap >= rows.length;
    const label = gapLabel(rows, gap, prefer);
    const before = end ? null : rows[gap].id;
    return { gap, before, end, label, reason: [label, ...parts].join(' · '), signals, analogue };
  }

  return { suggest, learned, tierRanks };
}

/**
 * Place every lineup at its suggestion as one step. Suggestions are all taken
 * from the ranking as it is now (auto-drafted lineups do not teach each other),
 * and lineups that land on the same gap go in source-score order. Lineups whose
 * suggestion is the end stay unplaced.
 */
export function autoDraft({ heroes, rows, lanes }) {
  const { suggest } = createSuggester({ heroes, rows });
  const byGap = new Map();
  const left = [];
  for (const lane of [...lanes].sort(byScore)) {
    const s = suggest(lane);
    if (s.end) {
      left.push(lane.id);
      continue;
    }
    if (!byGap.has(s.gap)) byGap.set(s.gap, []);
    byGap.get(s.gap).push({ ...lane, type: 'x8' });
  }
  const out = [];
  rows.forEach((row, gap) => {
    out.push(...(byGap.get(gap) || []), row);
  });
  const placements = slotsFrom(out);
  return { placements, placed: lanes.length - left.length, left };
}

/* ------------------------------------------------------ grouping, queue */

/**
 * The queue grouped by X8 hero. A lineup with two X8 heroes joins the group of
 * the one with more lineups, so the groups stay few and large.
 */
export function groupByX8(lanes, H) {
  const isX8 = (name) => !!(H[name] && H[name].s === 'X8');
  const tally = new Map();
  for (const lane of lanes)
    for (const name of new Set(lane.heroes.filter(isX8))) tally.set(name, (tally.get(name) || 0) + 1);
  const groups = new Map();
  for (const lane of lanes) {
    const x8 = [...new Set(lane.heroes.filter(isX8))].sort(
      (a, b) => tally.get(b) - tally.get(a) || a.localeCompare(b)
    );
    const hero = x8[0] || 'Other';
    if (!groups.has(hero)) groups.set(hero, { hero, lanes: [], placed: 0 });
    const group = groups.get(hero);
    group.lanes.push(lane);
    if (lane.anchor) group.placed += 1;
  }
  return [...groups.values()]
    .map((group) => ({ ...group, total: group.lanes.length }))
    .sort((a, b) => a.hero.localeCompare(b.hero));
}

/* ------------------------------------------------------------- history */

/**
 * Undo / redo over whole-state snapshots. Call push(state) with the state as it
 * was *before* a change; undo(current) hands back the state to restore and keeps
 * `current` for redo. A new change clears the redo side.
 */
export function createHistory(limit = 200) {
  let past = [];
  let future = [];
  return {
    push(state) {
      past.push(state);
      if (past.length > limit) past.shift();
      future = [];
    },
    undo(current) {
      if (!past.length) return null;
      future.push(current);
      return past.pop();
    },
    redo(current) {
      if (!future.length) return null;
      past.push(current);
      return future.pop();
    },
    clear() {
      past = [];
      future = [];
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
  };
}

/* ---------------------------------------------------------- the plan */

/**
 * The plan Save sends, from the planner's state. `rows` is the merged ranking,
 * `lanes` every new lineup (placed or not), `edits` a Map of id -> { heroes, skin }.
 */
export function planFromState({ rows, lanes, baseOrder, edits, removed }) {
  const gone = new Set(removed);
  const live = lanes.filter((lane) => !gone.has(lane.id));
  const placed = rows.filter((row) => row.type === 'x8').map((row) => row.id);
  const placedSet = new Set(placed);
  const byId = new Map(live.map((lane) => [lane.id, lane]));
  const anchors = slotsFrom(rows);
  const edited = (lane) => edits.get(lane.id) || lane;
  return {
    order: [
      ...placed
        .filter((id) => byId.has(id))
        .map((id) => ({ id, anchor: anchors.get(id).anchor })),
      ...live.filter((lane) => !placedSet.has(lane.id)).map((lane) => ({ id: lane.id, anchor: '' })),
    ],
    added: live
      .filter((lane) => lane.added)
      .map((lane) => ({ id: lane.id, heroes: edited(lane).heroes, skin: edited(lane).skin || '' })),
    baseOrder: [...baseOrder],
    edits: [...edits.entries()]
      .filter(([id]) => !(byId.get(id) && byId.get(id).added) && !gone.has(id))
      .map(([id, edit]) => ({ id, heroes: edit.heroes, skin: edit.skin || '' })),
    removed: [...gone],
  };
}

/**
 * What Save is about to change, counted and listed line by line against the
 * loaded view (whose entries carry their `line` from js/combos-db.js).
 */
export function summarizePlan(view, plan) {
  const removed = new Set(plan.removed || []);
  const baseById = new Map(view.base.map((b) => [b.id, b]));
  const laneById = new Map(view.x8.map((l) => [l.id, l]));
  const addedById = new Map((plan.added || []).map((l) => [l.id, l]));
  const oldRank = new Map(view.base.map((b, i) => [b.id, i + 1]));
  const order = plan.baseOrder || view.base.map((b) => b.id);
  const newRank = new Map(order.filter((id) => !removed.has(id)).map((id, i) => [id, i + 1]));
  const editById = new Map((plan.edits || []).map((e) => [e.id, e]));
  const lineOf = (entry) => String(entry.line || entryLine(entry)).trim();
  const counts = { placed: 0, moved: 0, unplaced: 0, added: 0, edited: 0, removed: 0, reordered: 0 };
  const lines = [];
  const push = (kind, text, detail) => {
    counts[kind] += 1;
    lines.push({ kind, text, detail });
  };
  for (const { id, anchor } of plan.order || []) {
    const lane = laneById.get(id);
    const where = anchor ? 'above #' + newRank.get(anchor) : 'at the end';
    if (!lane || lane.queued) {
      const added = addedById.get(id);
      if (anchor && added) push('added', entryLine(added).trim(), 'new line, ' + where);
      continue;
    }
    const current = editById.has(id) ? editedEntryLine(lane.line || entryLine(lane), editById.get(id)) : lineOf(lane);
    if (!lane.anchor && anchor) push('placed', current.trim(), where);
    else if (lane.anchor && !anchor)
      push('unplaced', current.trim(), 'above #' + oldRank.get(lane.anchor) + ' → the end block');
    else if (lane.anchor && anchor !== lane.anchor)
      push('moved', current.trim(), 'above #' + oldRank.get(lane.anchor) + ' → ' + where);
  }
  for (const edit of plan.edits || []) {
    const entry = baseById.get(edit.id) || laneById.get(edit.id);
    if (!entry || removed.has(edit.id)) continue;
    push('edited', editedEntryLine(entry.line || entryLine(entry), edit).trim(), 'was ' + lineOf(entry));
  }
  for (const id of removed) {
    const entry = baseById.get(id) || laneById.get(id);
    if (entry) push('removed', lineOf(entry), 'taken out');
  }
  // A reorder is a lineup whose place among the kept lineups changed; a removal
  // shifts the ranks below it without reordering anything.
  const keptBefore = view.base.map((b) => b.id).filter((id) => !removed.has(id));
  order
    .filter((id) => !removed.has(id))
    .forEach((id, i) => {
      if (keptBefore[i] !== id)
        push('reordered', lineOf(baseById.get(id)), '#' + oldRank.get(id) + ' → #' + newRank.get(id));
    });
  const words = {
    placed: 'placed',
    moved: 'moved',
    unplaced: 'unplaced',
    added: 'new',
    edited: 'edited',
    removed: 'removed',
    reordered: 'reordered',
  };
  const text =
    Object.keys(words)
      .filter((k) => counts[k])
      .map((k) => counts[k] + ' ' + words[k])
      .join(', ') || 'No changes';
  return { counts, lines, text };
}

/** A short fingerprint of a loaded view, so a draft is only offered for the same file. */
export function viewSignature(view) {
  const text = [
    ...view.base.map((b) => b.id + ':' + b.heroes.join('|') + '#' + (b.skin || '')),
    ...view.x8.map((l) => l.id + ':' + l.heroes.join('|') + '#' + (l.skin || '') + '@' + (l.anchor || '')),
  ].join('\n');
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return hash.toString(36) + '.' + text.length.toString(36);
}

/* --------------------------------------------------------- paste import */

const SKIN_AT_END = /(?:^|[\s,;/|])(?:skin\s*[:#]?\s*)?([123]{3})\s*$/i;
const SEPARATORS = /\s*(?:\/|,|;|\||\+|\t|\s-\s|\s–\s)\s*/;

/** Split "Lawman Bjorn The Avalanche" into three names when every part is a hero. */
function splitBySpaces(words, match) {
  let best = null;
  for (let i = 1; i < words.length - 1; i++)
    for (let j = i + 1; j < words.length; j++) {
      const parts = [words.slice(0, i), words.slice(i, j), words.slice(j)].map((w) => w.join(' '));
      const found = parts.map(match);
      const score = found.reduce(
        (sum, f) => sum + (f.name ? (f.how === 'exact' || f.how === 'alias' ? 2 : 1) : 0),
        0
      );
      if (!best || score > best.score) best = { parts, score };
    }
  return best && best.score >= 4 ? best.parts : null;
}

/**
 * Read pasted lineups, one per line: "Lawman / Bjorn / The Avalanche",
 * "Lawman, Bjorn, Avalanche 222", "1. lawman - bjorn - avalanche skin 321".
 * Each result is { text, names: [raw ×3], heroes: [name|null ×3], skin, fuzzy,
 * suggestions, problem }; blank lines and comments (#, //) are skipped.
 */
export function parsePastedLineups(text, heroNames, aliases) {
  const match = createHeroMatcher(heroNames, aliases);
  const out = [];
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    line = line.replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '');
    let skin = '';
    const skinMatch = SKIN_AT_END.exec(line);
    if (skinMatch) {
      skin = skinMatch[1];
      line = line.slice(0, skinMatch.index).replace(/[\s,;/|]+$/, '');
    }
    let names = line.split(SEPARATORS).filter(Boolean);
    if (names.length === 1) names = splitBySpaces(line.split(/\s+/), match) || names;
    const entry = { text: rawLine.trim(), names, heroes: [], skin, fuzzy: [], suggestions: [], problem: '' };
    if (names.length !== 3) {
      entry.problem = 'needs three heroes, found ' + names.length;
      entry.heroes = [null, null, null];
      entry.names = [...names, '', '', ''].slice(0, 3);
      out.push(entry);
      continue;
    }
    names.forEach((name, i) => {
      const found = match(name);
      entry.heroes[i] = found.name;
      entry.suggestions[i] = found.suggestions || [];
      if (found.name && (found.how === 'typo' || found.how === 'prefix'))
        entry.fuzzy.push(name + ' → ' + found.name);
    });
    if (entry.heroes.some((h) => !h)) entry.problem = 'unknown hero name';
    else if (new Set(entry.heroes).size < 3) entry.problem = 'the same hero twice';
    out.push(entry);
  }
  return out;
}
