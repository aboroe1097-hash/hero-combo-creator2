// Combos Planner page. Loads the combo database from the local planner server,
// lets you place X8 lanes between the S0-X2 lanes and — in edit mode — change the
// S0-X2 list itself, then saves the result back to js/combos-db.js.
// Run with: npm run combos:plan
import {
  hasPaid as heroIsPaid,
  isFiltered,
  matchOf,
  nearMask,
  rankingMatches,
  selectLanes,
  tierOf,
  TRAY_DEFAULTS,
  troopIcon,
  troopOf as troopOfHeroes,
  TROOP_LABEL,
} from '/combo-lanes.js';

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const slug = (heroes, skin) =>
  'n-' +
  heroes
    .map((n) =>
      n
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    )
    .join('_') +
  (skin ? '-' + skin : '');

let H = {};
let BASE = [];
let lanes = new Map();
let baseOrder = [];
let edits = new Map();
let removed = new Set();
let holding = null;
let editing = null;
let pendingRemove = null;
let editMode = false;
let trayMode = 'unplaced';
let dirty = false;

const allLanes = () => [...lanes.values()].filter((l) => !removed.has(l.id));
const troopOf = (heroes) => troopOfHeroes(heroes, H);
const hasPaid = (heroes) => heroIsPaid(heroes, H);
const isX8Hero = (n) => H[n] && H[n].s === 'X8';
const rowClass = (heroes) => ' troop-' + troopOf(heroes) + (hasPaid(heroes) ? ' paid' : ' free');
const kindBadge = (heroes) =>
  hasPaid(heroes)
    ? '<span class="kind paid" title="Uses at least one paid hero">Paid</span>'
    : '<span class="kind free" title="Free heroes only">Free</span>';
const keyOf = (c) => c.heroes.join('|') + '#' + (c.skin || '');

const trayFilters = () => ({
  mode: trayMode,
  q: $('traySearch').value,
  troop: $('trayTroop').value,
  cost: $('trayCost').value,
  tier: $('trayTier').value,
  sort: $('traySort').value,
});
const rankFilters = () => ({
  hero: $('listSearch').value,
  troop: $('troop').value,
  cost: $('cost').value,
  near: $('near').value === 'near',
});
const rankFiltered = () => {
  const f = rankFilters();
  return !!(f.hero || f.troop || f.cost || f.near);
};

function load(data) {
  H = data.heroes;
  BASE = data.base;
  baseOrder = BASE.map((b) => b.id);
  edits = new Map();
  removed = new Set();
  editing = null;
  pendingRemove = null;
  lanes = new Map();
  const slots = new Map();
  for (const l of data.x8) {
    const n = (slots.get(l.anchor) || 0) + 1;
    slots.set(l.anchor, n);
    lanes.set(l.id, { ...l, ...tierOf(l.note), slot: n, added: !!l.queued });
  }
  $('heroNames').innerHTML = Object.keys(H)
    .sort()
    .map((n) => '<option value="' + esc(n) + '"></option>')
    .join('');
  $('placeRank').max = String(BASE.length);
  $('gotoRank').max = String(BASE.length);
  setDirty(false);
  render();
  if (data.skipped && data.skipped.length) {
    setStatus('Skipped in the queue files: ' + data.skipped.join('; '));
    return true;
  }
  return false;
}

function setDirty(value) {
  dirty = value;
  $('dirty').hidden = !value;
  $('saveBtn').disabled = !value;
  $('revertBtn').disabled = !value;
}
function setStatus(msg) {
  $('status').textContent = msg;
}
const touch = () => {
  setDirty(true);
  setStatus('Not saved yet. Press Save to write js/combos-db.js.');
};

// The panels stay put while the page scrolls, so keep them clear of the sticky
// save bar and the placing banner by measuring that strip.
function measureStrip() {
  document.documentElement.style.setProperty('--strip-h', $('strip').offsetHeight + 'px');
}

// Re-rendering replaces the scrolled list, so put the scroll position back.
function keepScroll(el, write) {
  const top = el.scrollTop;
  write();
  el.scrollTop = top;
}

function flash(el) {
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1500);
}
function revealRow(selector, block = 'center') {
  requestAnimationFrame(() => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ block, behavior: 'smooth' });
    el.focus({ preventScroll: true });
    flash(el);
  });
}

/** A lineup with any pending edit applied, so every view shows what will be saved. */
function laneFor(l) {
  const edit = edits.get(l.id);
  return edit ? { ...l, heroes: edit.heroes, skin: edit.skin, edited: true } : l;
}
const laneViews = () => allLanes().map(laneFor);

/** The S0-X2 list in the planned order, with removals and edits applied. */
function baseView() {
  const byId = new Map(BASE.map((b) => [b.id, b]));
  return baseOrder
    .filter((id) => !removed.has(id))
    .map((id, i) => {
      const original = byId.get(id) || { heroes: [], skin: '' };
      const edit = edits.get(id);
      return {
        id,
        heroes: edit ? edit.heroes : original.heroes,
        skin: edit ? edit.skin : original.skin,
        edited: !!edit,
        rank: i + 1,
      };
    });
}

function merged(excludeId) {
  const by = new Map();
  for (const l of laneViews()) {
    if (!l.anchor || l.id === excludeId) continue;
    if (!by.has(l.anchor)) by.set(l.anchor, []);
    by.get(l.anchor).push(l);
  }
  for (const arr of by.values()) arr.sort((x, y) => x.slot - y.slot);
  const out = [];
  for (const b of baseView()) {
    for (const l of by.get(b.id) || []) out.push({ type: 'x8', lane: l, above: b.rank });
    out.push({ type: 'base', b, rank: b.rank });
  }
  return out;
}

/** Lane id -> the rank it sits above, for the tray's "above #N" labels. */
function aboveMap() {
  return new Map(
    merged()
      .filter((e) => e.type === 'x8')
      .map((e) => [e.lane.id, e.above])
  );
}

// Where a lane lands when dropped in the gap before list[j] (j === length: unplaced tail).
function placementAt(list, j) {
  if (j >= list.length) return { anchor: '', slot: 0 };
  const e = list[j];
  const prev = list[j - 1];
  if (e.type === 'base') {
    const slot =
      prev && prev.type === 'x8' && prev.lane.anchor === e.b.id ? prev.lane.slot + 1 : 1;
    return { anchor: e.b.id, slot };
  }
  const slot =
    prev && prev.type === 'x8' && prev.lane.anchor === e.lane.anchor
      ? (prev.lane.slot + e.lane.slot) / 2
      : e.lane.slot - 1;
  return { anchor: e.lane.anchor, slot };
}

function update(id, patch) {
  lanes.set(id, { ...lanes.get(id), ...patch });
  touch();
  render();
}

function placeHolding(j) {
  if (!holding) return;
  const id = holding;
  const p = placementAt(merged(id), j);
  stopHolding();
  update(id, p);
  revealRow('[data-row="' + CSS.escape(id) + '"]');
}
/** Drop the held lane above a fixed rank number, without scrolling to the gap. */
function placeAboveRank(value) {
  if (!holding) return;
  const rank = Number(value);
  if (!Number.isInteger(rank) || rank < 1 || rank > BASE.length) {
    setStatus('Pick a rank between 1 and ' + BASE.length + '.');
    return;
  }
  const list = merged(holding);
  const j = list.findIndex((e) => e.type === 'base' && e.rank === rank);
  if (j < 0) return setStatus('There is no row #' + rank + '.');
  placeHolding(j);
}
function startHolding(id) {
  holding = id;
  document.body.classList.add('placing');
  $('banner').hidden = false;
  $('bannerText').innerHTML = bannerText(laneFor(lanes.get(id)));
  $('placeRank').value = '';
  render();
}
function stopHolding() {
  holding = null;
  document.body.classList.remove('placing');
  $('banner').hidden = true;
  render();
}
function moveBy(id, delta) {
  const list = merged(id);
  const k = merged().findIndex((e) => e.type === 'x8' && e.lane.id === id);
  const j = Math.max(0, Math.min(list.length - 1, k + (delta < 0 ? -1 : 1)));
  update(id, placementAt(list, j));
  revealRow('[data-row="' + CSS.escape(id) + '"]', 'nearest');
}
/** Nudge one S0-X2 lineup up or down; its X8 lanes travel with it. */
function moveBase(id, delta) {
  const i = baseOrder.indexOf(id);
  const j = i + (delta < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= baseOrder.length) return;
  [baseOrder[i], baseOrder[j]] = [baseOrder[j], baseOrder[i]];
  touch();
  render();
  revealRow('[data-rank="' + (j + 1) + '"]', 'nearest');
}
/** Scroll the ranking to a fixed rank number, clearing filters that would hide it. */
function jumpToRank(value) {
  const rank = Number(value);
  if (!Number.isInteger(rank) || rank < 1 || rank > BASE.length) {
    return setStatus('Rank must be a whole number between 1 and ' + BASE.length + '.');
  }
  clearRankFilters();
  revealRow('[data-rank="' + rank + '"]');
}

const findHero = (value) =>
  Object.keys(H).find((n) => n.toLowerCase() === String(value || '').trim().toLowerCase());

const rowOf = (e) => (e.type === 'x8' ? e.lane : e.b);
/** Where a row sits, for the placing banner: "#12", or "the X8 lane above #12". */
const whereOf = (e) => (e.type === 'base' ? '#' + e.rank : 'the X8 lane above #' + e.above);

/** What the lineup being placed has in common with every other lineup. */
function matchList(held) {
  return merged().map((e) => {
    if (e.type === 'x8' && e.lane.id === held.id) return null;
    return matchOf(rowOf(e), held);
  });
}

/** The overlap mark on a row or card: the same trio, two shared heroes, or one. */
function matchChip(match) {
  if (!match || !match.shared) return '';
  if (match.sameTrio)
    return '<span class="kind duplicate" title="This lineup already uses the same three heroes">same trio</span>';
  return (
    '<span class="kind match' +
    match.shared +
    '" title="Shares ' +
    match.shared +
    ' hero' +
    (match.shared > 1 ? 'es' : '') +
    ' with the lineup you are placing">' +
    match.shared +
    ' same</span>'
  );
}
function matchClass(match) {
  if (!match || !match.shared) return '';
  return match.sameTrio ? ' same-trio' : ' match' + match.shared;
}

/** The placing banner names the closest existing lineups, so placement is informed. */
function bannerText(held) {
  const rows = [];
  merged().forEach((e) => {
    if (e.type === 'x8' && e.lane.id === held.id) return;
    rows.push({ match: matchOf(rowOf(e), held), where: whereOf(e) });
  });
  // Lineups still waiting in the tray are the likeliest duplicates, so count them too.
  for (const l of laneViews()) {
    if (l.id === held.id || l.anchor) continue;
    rows.push({ match: matchOf(l, held), where: 'the end of the list' });
  }
  const trio = rows.filter((r) => r.match.sameTrio);
  const duo = rows.filter((r) => r.match.shared === 2);
  const one = rows.filter((r) => r.match.shared === 1);
  const list = (kind) => {
    const names = [...new Set(kind.map((r) => r.where))];
    return names.slice(0, 5).join(', ') + (names.length > 5 ? '…' : '');
  };
  const parts = [
    'Placing <b>' + esc(held.heroes.join(' / ')) + '</b> — tap a gap, or type a rank and press Go.',
  ];
  if (trio.length)
    parts.push(
      '<b>Same three heroes</b> as ' +
        list(trio) +
        (held.skin ? ' (your lineup is skin ' + esc(held.skin) + ')' : '') +
        ', so check whether it is already covered.'
    );
  if (duo.length) parts.push('<b>' + duo.length + '</b> share two heroes: ' + list(duo) + '.');
  if (one.length) parts.push(one.length + ' share one hero.');
  if (!trio.length && !duo.length && !one.length)
    parts.push('No other lineup shares a hero with this one.');
  return parts.join(' ');
}

function heroHtml(n) {
  const h = H[n] || {};
  const troop = h.t || 'All';
  return (
    '<span class="hero' +
    (h.s === 'X8' ? ' isx8' : '') +
    '">' +
    (h.i
      ? '<img class="portrait" src="' +
        esc(h.i) +
        '" alt="" loading="lazy" width="32" height="32">'
      : '') +
    '<span class="troop ' +
    esc(troop) +
    '" title="' +
    esc(TROOP_LABEL[troop] || troop) +
    '">' +
    troopIcon(troop) +
    '</span>' +
    esc(n) +
    '</span>'
  );
}
function lineupHtml(heroes, skin) {
  return (
    '<div class="lineup">' +
    heroes.map(heroHtml).join('<span class="sep">/</span>') +
    (skin
      ? ' <span class="chip skin" title="Skin code: 3 must, 2 recommended, 1 optional">skin ' +
        esc(skin) +
        '</span>'
      : '') +
    '</div>'
  );
}

/** Tray card heroes stack as a portrait with the name underneath. */
function heroBoxHtml(n) {
  const h = H[n] || {};
  const troop = h.t || 'All';
  return (
    '<span class="herobox' +
    (h.s === 'X8' ? ' isx8' : '') +
    '" title="' +
    esc(n + ' — ' + (TROOP_LABEL[troop] || troop) + (h.p ? ', paid hero' : '')) +
    '">' +
    (h.i
      ? '<img class="portrait" src="' +
        esc(h.i) +
        '" alt="" loading="lazy" width="46" height="46">'
      : '<span class="portrait"></span>') +
    '<span class="heroname">' +
    esc(n) +
    '</span>' +
    '<span class="herofoot ' +
    esc(troop) +
    '">' +
    troopIcon(troop, 16) +
    '</span></span>'
  );
}
const stackHtml = (heroes) => '<div class="lineup stack">' + heroes.map(heroBoxHtml).join('') + '</div>';

/** Keep whatever has been typed into an open editor alive across re-renders. */
function captureEditing() {
  const form = document.querySelector('form[data-edit]');
  if (!form || !editing || form.dataset.edit !== editing.id) return;
  const value = (name) => {
    const el = form.querySelector('[name="' + name + '"]');
    return el ? el.value : '';
  };
  editing = {
    id: editing.id,
    front: value('front'),
    middle: value('middle'),
    back: value('back'),
    skin: value('skin'),
  };
}

function editorHtml(lane) {
  const value = (name, fallback) =>
    esc(editing && editing.id === lane.id && editing[name] != null ? editing[name] : fallback);
  const field = (name, label, current) =>
    '<input type="text" name="' +
    name +
    '" list="heroNames" value="' +
    current +
    '" placeholder="' +
    label +
    '" aria-label="' +
    label +
    ' hero" autocomplete="off">';
  return (
    '<form class="editrow" data-edit="' +
    esc(lane.id) +
    '">' +
    '<div class="rank">edit</div>' +
    '<div class="editfields">' +
    field('front', 'Front', value('front', lane.heroes[0])) +
    field('middle', 'Middle', value('middle', lane.heroes[1])) +
    field('back', 'Back', value('back', lane.heroes[2])) +
    '<input type="text" name="skin" value="' +
    value('skin', lane.skin) +
    '" placeholder="Skin code" aria-label="Skin code" inputmode="numeric" maxlength="3">' +
    '<button type="submit" class="primary">Save lineup</button>' +
    '<button type="button" data-canceledit>Cancel</button>' +
    '<p class="hint skinhint">Skin code is one digit per hero in Front / Middle / Back order: <b>3</b> you must own that hero\'s skin, <b>2</b> the skin is recommended, <b>1</b> it is optional. Leave it empty when no skin changes the lineup.</p>' +
    '</div></form>'
  );
}

function baseActions(b) {
  if (!editMode) return '';
  return (
    '<button type="button" data-baseup="' +
    esc(b.id) +
    '" aria-label="Move this lineup up one rank">▲</button>' +
    '<button type="button" data-basedown="' +
    esc(b.id) +
    '" aria-label="Move this lineup down one rank">▼</button>' +
    '<button type="button" data-edit="' +
    esc(b.id) +
    '" aria-label="Edit this lineup">Edit</button>' +
    '<button type="button" class="iconbtn danger" data-remove="' +
    esc(b.id) +
    '" title="Remove this lineup" aria-label="Remove this lineup">✕</button>'
  );
}

function renderList() {
  captureEditing();
  const full = merged();
  const held = holding ? laneFor(lanes.get(holding)) : null;
  // While a lineup is being placed, every row says how many heroes it shares.
  const marks = held ? matchList(held) : null;
  const list = holding ? merged(holding) : full;
  const indexIn = new Map(list.map((e, i) => [e.type === 'base' ? e.b.id : e.lane.id, i]));
  const filters = rankFilters();
  const vis = full.map((e) =>
    rankingMatches(e.type === 'x8' ? e.lane.heroes : e.b.heroes, filters, H)
  );
  const near = filters.near ? nearMask(full) : null;
  const parts = [];
  let shown = 0;
  full.forEach((e, i) => {
    if (!vis[i] || (near && !near[i])) return;
    shown++;
    const key = e.type === 'base' ? e.b.id : e.lane.id;
    if (holding && indexIn.has(key)) {
      parts.push(
        '<button type="button" class="gap" data-gap="' +
          indexIn.get(key) +
          '" aria-label="Place here"><span>Place here</span></button>'
      );
    }
    if (e.type === 'base') {
      const b = e.b;
      const mark = marks ? marks[i] : null;
      parts.push(
        '<div class="row base' +
          rowClass(b.heroes) +
          (b.edited ? ' edited' : '') +
          matchClass(mark) +
          '" data-rank="' +
          b.rank +
          '" tabindex="0" aria-label="' +
          esc(b.heroes.join(' / ')) +
          ', rank ' +
          b.rank +
          '"><div class="rank">#' +
          b.rank +
          '</div>' +
          lineupHtml(b.heroes, b.skin) +
          '<div class="actions">' +
          matchChip(mark) +
          (b.edited ? '<span class="kind edited" title="Changed, not saved yet">edited</span>' : '') +
          kindBadge(b.heroes) +
          baseActions(b) +
          '</div></div>'
      );
      if (editing && editing.id === b.id) parts.push(editorHtml(b));
      return;
    }
    const l = e.lane;
    parts.push(
      '<div class="row x8' +
        rowClass(l.heroes) +
        (l.id === holding ? ' holding' : '') +
        matchClass(marks ? marks[i] : null) +
        '" draggable="true" tabindex="0" data-row="' +
        esc(l.id) +
        '" aria-label="' +
        esc(l.heroes.join(' / ')) +
        ', X8 lineup above rank ' +
        e.above +
        '"><div class="rank">X8<br><small>above #' +
        e.above +
        '</small></div>' +
        lineupHtml(l.heroes, l.skin) +
        '<div class="actions">' +
        matchChip(marks ? marks[i] : null) +
        kindBadge(l.heroes) +
        '<button type="button" data-up="' +
        esc(l.id) +
        '" aria-label="Move up">▲</button>' +
        '<button type="button" data-down="' +
        esc(l.id) +
        '" aria-label="Move down">▼</button>' +
        '<button type="button" data-move="' +
        esc(l.id) +
        '">Move</button>' +
        '<button type="button" data-unplace="' +
        esc(l.id) +
        '">Unplace</button></div></div>'
    );
  });
  if (holding) {
    parts.push(
      '<button type="button" class="gap" data-gap="' +
        list.length +
        '" aria-label="Leave it waiting at the end of the list"><span>Leave it waiting at the end</span></button>'
    );
  }
  const html = shown
    ? parts.join('')
    : '<div class="empty">No rows match these filters. ' +
      '<button type="button" class="link" data-clearrank>Clear filters</button></div>';
  keepScroll($('list'), () => {
    $('list').innerHTML = html;
  });
  $('listCount').textContent = 'Showing ' + shown + ' of ' + full.length + ' rows';
  $('showAllRows').hidden = !(holding && rankFiltered());
  $('editNote').hidden = !editMode;
  $('matchLegend').hidden = !holding;
}

function renderTray() {
  const filters = trayFilters();
  const above = aboveMap();
  const held = holding ? laneFor(lanes.get(holding)) : null;
  const { items, total } = selectLanes(laneViews(), filters, H, (id) => above.get(id));
  const active = [filters.troop, filters.cost, filters.tier].filter(Boolean).length;
  $('trayCount').textContent = total
    ? items.length + ' of ' + total + ' shown'
    : trayMode === 'unplaced'
      ? 'Every new lineup is placed'
      : 'Nothing in this view';
  $('trayClear').hidden = !isFiltered(filters);
  $('trayFilterToggle').textContent = active ? 'Filters · ' + active : 'Filters';
  $('trayFilterToggle').classList.toggle('on', active > 0);
  const html = items.length
    ? items
        .map(
          (l) =>
            cardHtml(l, above.get(l.id), held && l.id !== held.id ? matchOf(l, held) : null) +
            (editing && editing.id === l.id ? editorHtml(l) : '')
        )
        .join('')
    : '<div class="empty">' +
      (isFiltered(filters)
        ? 'No X8 lineup matches these filters. <button type="button" class="link" data-cleartray>Clear filters</button>'
        : trayMode === 'unplaced'
          ? 'Every new lineup is placed.'
          : 'Nothing here yet.') +
      '</div>';
  keepScroll($('cards'), () => {
    $('cards').innerHTML = html;
  });
}

function cardHtml(l, aboveRank, match) {
  const placed = !!l.anchor;
  const confirming = pendingRemove === l.id;
  const where = placed
    ? '<button type="button" class="link" data-show="' +
      esc(l.id) +
      '" title="Scroll the list to this lineup">above #' +
      aboveRank +
      '</button>'
    : '<span>' +
      (l.queued
        ? 'in ' + esc(l.queuedFrom || 'x8-queue.json')
        : l.added
          ? 'new, not saved'
          : 'not placed yet') +
      '</span>';
  const removeButton = confirming
    ? ''
    : '<button type="button" class="iconbtn danger" data-remove="' +
      esc(l.id) +
      '" title="Remove this lineup" aria-label="Remove this lineup">✕</button>';
  return (
    '<div class="card' +
    rowClass(l.heroes) +
    (placed ? ' placed' : '') +
    (l.id === holding ? ' holding' : '') +
    (l.edited ? ' edited' : '') +
    matchClass(match) +
    '" draggable="true" tabindex="0" data-card="' +
    esc(l.id) +
    '" aria-label="' +
    esc(l.heroes.join(' / ')) +
    (placed ? ', placed above rank ' + aboveRank : '') +
    '">' +
    stackHtml(l.heroes) +
    '<div class="meta">' +
    (l.skin
      ? '<span class="chip skin" title="Skin code: 3 must own the skin, 2 recommended, 1 optional">skin ' +
        esc(l.skin) +
        '</span>'
      : '') +
    (l.tier
      ? '<span class="chip tier" title="ROC Academy tier and source score, used only to order this list">' +
        esc(l.tier) +
        (l.score != null ? ' · ' + l.score : '') +
        '</span>'
      : '') +
    (l.edited ? '<span class="kind edited" title="Changed, not saved yet">edited</span>' : '') +
    (l.added ? '<span class="chip">new</span>' : '') +
    matchChip(match) +
    where +
    '<span class="spacer"></span>' +
    (editMode
      ? '<button type="button" data-edit="' +
        esc(l.id) +
        '" aria-label="Change this lineup\'s heroes or skin code">Edit</button>'
      : '') +
    '<button type="button" data-move="' +
    esc(l.id) +
    '">' +
    (placed ? 'Move' : 'Place') +
    '</button>' +
    (placed ? '<button type="button" data-unplace="' + esc(l.id) + '">Unplace</button>' : '') +
    (l.added ? '<button type="button" data-delete="' + esc(l.id) + '">Delete</button>' : '') +
    (l.added ? '' : removeButton) +
    (confirming
      ? '<button type="button" class="danger" data-remove="' +
        esc(l.id) +
        '">Remove?</button>'
      : '') +    '</div></div>'
  );
}

function renderStats() {
  const all = laneViews();
  const placed = all.filter((l) => l.anchor).length;
  const changed = edits.size + baseOrder.filter((id, i) => id !== BASE[i].id).length;
  $('stats').innerHTML =
    '<div class="stat"><b>' +
    baseView().length +
    '</b><span>Current lineups' +
    (editMode ? ' (edit mode)' : '') +
    '</span></div>' +
    '<div class="stat"><b>' +
    placed +
    '</b><span>New placed</span></div>' +
    '<div class="stat"><b>' +
    (all.length - placed) +
    '</b><span>New waiting at the end</span></div>' +
    (changed
      ? '<div class="stat warn"><b>' + changed + '</b><span>lines changed</span></div>'
      : '') +
    (removed.size
      ? '<div class="stat warn"><b>' + removed.size + '</b><span>marked to remove</span></div>'
      : '');
}

function render() {
  renderStats();
  renderTray();
  renderList();
  measureStrip();
}

function clearTrayFilters() {
  ['trayTroop', 'trayCost', 'trayTier'].forEach((id) => ($(id).value = ''));
  $('traySort').value = TRAY_DEFAULTS.sort;
  renderTray();
}
function clearRankFilters() {
  $('listSearch').value = '';
  $('troop').value = '';
  $('cost').value = '';
  $('near').value = 'all';
  renderList();
}

/** Save the three heroes and the skin code typed into an open editor. */
function applyEdit(form) {
  const id = form.dataset.edit;
  const isBase = id.startsWith('b');
  const current = isBase
    ? baseView().find((b) => b.id === id)
    : laneViews().find((l) => l.id === id);
  if (!current) return;
  const field = (name) => {
    const el = form.querySelector('[name="' + name + '"]');
    return el ? el.value : '';
  };
  const raw = ['front', 'middle', 'back'].map(field);
  const heroes = raw.map(findHero);
  const fail = (text) => {
    setStatus(text);
    flash(form);
  };
  const bad = raw.filter((value, i) => !heroes[i]);
  if (bad.length)
    return fail('Unknown hero: ' + bad.map((v) => v || '(empty)').join(', ') + '.');
  if (new Set(heroes).size < 3) return fail('A lineup needs three different heroes.');
  const usesX8 = heroes.some(isX8Hero);
  if (isBase && usesX8)
    return fail('That lineup uses an X8 hero, so it belongs in the X8 list, not the S0–X2 list.');
  if (!isBase && !usesX8)
    return fail('That lineup has no X8 hero, so it belongs in the S0–X2 list.');
  const skin = field('skin').trim();
  if (skin && !/^[123]{3}$/.test(skin)) return fail('Skin code is three digits of 1, 2 or 3.');
  const key = heroes.join('|') + '#' + skin;
  const others = [...baseView().filter((b) => b.id !== id), ...laneViews().filter((l) => l.id !== id)];
  if (others.some((l) => keyOf(l) === key))
    return fail('Another lineup already uses those three heroes and skin code.');
  editing = null;
  if (keyOf(current) === key) return render();
  edits.set(id, { heroes, skin });
  touch();
  render();
  const selector = isBase ? '[data-rank="' + current.rank + '"]' : '[data-row="' + CSS.escape(id) + '"]';
  revealRow(selector, 'nearest');
}

/** Two-step removal: the ✕ on a lineup asks once, then takes it out of the file. */
function removeLane(id) {
  if (pendingRemove !== id) {
    pendingRemove = id;
    setStatus('Press Remove? again to take that lineup out of js/combos-db.js.');
    return render();
  }
  pendingRemove = null;
  if (editing && editing.id === id) editing = null;
  if (holding === id) stopHolding();
  const lane = lanes.get(id);
  if (lane && lane.added) lanes.delete(id);
  else removed.add(id);
  touch();
  render();
}

async function save() {
  const order = [
    ...merged()
      .filter((e) => e.type === 'x8')
      .map((e) => ({ id: e.lane.id, anchor: e.lane.anchor })),
    ...allLanes()
      .filter((l) => !l.anchor)
      .map((l) => ({ id: l.id, anchor: '' })),
  ];
  const added = lanes
    .values()
    .filter((l) => l.added && !removed.has(l.id))
    .map((l) => ({ id: l.id, heroes: laneFor(l).heroes, skin: laneFor(l).skin }));
  const editList = [...edits.entries()]
    .filter(([id]) => !(lanes.get(id) && lanes.get(id).added) && !removed.has(id))
    .map(([id, edit]) => ({ id, heroes: edit.heroes, skin: edit.skin }));
  $('saveBtn').disabled = true;
  setStatus('Saving…');
  try {
    const res = await fetch('/api/combos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        order,
        added,
        baseOrder,
        edits: editList,
        removed: [...removed],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'save failed');
    if (!load(data))
      setStatus(
        'Saved js/combos-db.js and x8-queue.json. Check them with git diff, then commit and push.'
      );
  } catch (err) {
    $('saveBtn').disabled = false;
    setStatus('Not saved: ' + err.message);
  }
}

async function fetchCombos() {
  setStatus('Loading js/combos-db.js…');
  try {
    const res = await fetch('/api/combos', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'load failed');
    if (!load(data)) {
      const queued = data.x8.filter((l) => l.queued).length;
      setStatus(
        'Loaded ' +
          data.base.length +
          ' current and ' +
          data.x8.length +
          ' new lineups (' +
          queued +
          ' from the queue files).'
      );
    }
  } catch (err) {
    setStatus(
      'Could not load the combo database: ' +
        err.message +
        '. Is npm run combos:plan still running?'
    );
  }
}

document.addEventListener('click', (ev) => {
  const t = ev.target.closest('button');
  if (!t) return;
  const d = t.dataset;
  if (pendingRemove && d.remove !== pendingRemove) {
    pendingRemove = null;
    render();
  }
  if (d.gap != null) return placeHolding(Number(d.gap));
  if (d.move) return holding === d.move ? stopHolding() : startHolding(d.move);
  if (d.up) return moveBy(d.up, -1);
  if (d.down) return moveBy(d.down, 1);
  if (d.unplace) return update(d.unplace, { anchor: '', slot: 0 });
  if (d.baseup) return moveBase(d.baseup, -1);
  if (d.basedown) return moveBase(d.basedown, 1);
  if (d.remove) return removeLane(d.remove);
  if (d.edit) {
    const isBase = d.edit.startsWith('b');
    const lane = isBase
      ? baseView().find((b) => b.id === d.edit)
      : laneViews().find((l) => l.id === d.edit);
    editing = lane
      ? { id: lane.id, front: lane.heroes[0], middle: lane.heroes[1], back: lane.heroes[2], skin: lane.skin }
      : null;
    render();
    const form = document.querySelector('form[data-edit]');
    if (form) {
      form.scrollIntoView({ block: 'nearest' });
      const first = form.querySelector('[name="front"]');
      if (first) first.focus();
    }
    return;
  }
  if (d.canceledit) {
    editing = null;
    return render();
  }
  if (d.show) {
    clearRankFilters();
    return revealRow('[data-row="' + CSS.escape(d.show) + '"]');
  }
  if (d.cleartray) return clearTrayFilters();
  if (d.clearrank) return clearRankFilters();
  if (d.delete) {
    lanes.delete(d.delete);
    touch();
    return render();
  }
  if (d.tray) {
    trayMode = d.tray;
    document
      .querySelectorAll('[data-tray]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b === t)));
    renderTray();
  }
});
document.addEventListener('submit', (ev) => {
  const form = ev.target.closest('form[data-edit]');
  if (!form) return;
  ev.preventDefault();
  applyEdit(form);
});
// A portrait that fails to load shows the site's placeholder instead of a broken image.
document.addEventListener(
  'error',
  (ev) => {
    const img = ev.target;
    if (
      img instanceof HTMLImageElement &&
      img.classList.contains('portrait') &&
      !img.dataset.fallback
    ) {
      img.dataset.fallback = '1';
      img.src = '/images/heroes/portrait-unavailable.svg';
    }
  },
  true
);
$('cancelPlace').addEventListener('click', stopHolding);
$('saveBtn').addEventListener('click', save);
$('revertBtn').addEventListener('click', fetchCombos);
$('trayClear').addEventListener('click', clearTrayFilters);
$('showAllRows').addEventListener('click', clearRankFilters);
$('trayFilterToggle').addEventListener('click', () => setFiltersOpen(!filtersOpen()));
$('placeRankGo').addEventListener('click', () => placeAboveRank($('placeRank').value));
$('placeRank').addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    placeAboveRank($('placeRank').value);
  }
});
$('gotoForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  jumpToRank($('gotoRank').value);
});
$('compactRows').addEventListener('change', (ev) => setCompact(ev.target.checked));
$('editDone').addEventListener('click', () => setEditMode(false));
$('editBase').addEventListener('change', (ev) => setEditMode(ev.target.checked));

function setEditMode(on) {
  editMode = on;
  editing = null;
  pendingRemove = null;
  $('editBase').checked = on;
  render();
  setStatus(
    on
      ? 'Edit mode: change a lineup with Edit, reorder an S0–X2 lineup with ▲▼, or take one out with ✕. Press Done editing to finish.'
      : 'Edit mode off. Everything stays as it is until you press Save.'
  );
}

['listSearch', 'troop', 'cost', 'near'].forEach((id) =>
  $(id).addEventListener('input', renderList)
);
['traySearch', 'trayTroop', 'trayCost', 'trayTier', 'traySort'].forEach((id) =>
  $(id).addEventListener('input', renderTray)
);
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    if (holding) return stopHolding();
    if (pendingRemove) {
      pendingRemove = null;
      return render();
    }
    if (editing) {
      editing = null;
      return render();
    }
    const t = ev.target;
    if (t instanceof HTMLInputElement && t.type === 'search' && t.value) {
      t.value = '';
      t.dispatchEvent(new Event('input'));
    }
    return;
  }
  if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement) return;
  const card = ev.target instanceof Element ? ev.target.closest('[data-card]') : null;
  if (card && ev.target === card && !holding && (ev.key === 'Enter' || ev.key === ' ')) {
    ev.preventDefault();
    return startHolding(card.dataset.card);
  }
  const row = ev.target instanceof Element ? ev.target.closest('[data-row]') : null;
  if (row && ev.target === row && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) {
    ev.preventDefault();
    moveBy(row.dataset.row, ev.key === 'ArrowUp' ? -1 : 1);
  }
});
window.addEventListener('resize', measureStrip);
window.addEventListener('beforeunload', (ev) => {
  if (dirty) ev.preventDefault();
});

let dropped = false;
document.addEventListener('dragstart', (ev) => {
  const src = ev.target.closest('[data-card],[data-row]');
  if (!src) return;
  dropped = false;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', src.dataset.card || src.dataset.row);
  startHolding(src.dataset.card || src.dataset.row);
});
document.addEventListener('dragover', (ev) => {
  const g = ev.target.closest('.gap');
  if (!g || !holding) return;
  ev.preventDefault();
  document.querySelectorAll('.gap.over').forEach((x) => x !== g && x.classList.remove('over'));
  g.classList.add('over');
});
document.addEventListener('dragleave', (ev) => {
  const g = ev.target.closest('.gap');
  if (g) g.classList.remove('over');
});
document.addEventListener('drop', (ev) => {
  const g = ev.target.closest('.gap');
  if (!g || !holding) return;
  ev.preventDefault();
  dropped = true;
  placeHolding(Number(g.dataset.gap));
});
document.addEventListener('dragend', () => {
  if (!dropped && holding) stopHolding();
});

$('addForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const raw = [$('addFront').value, $('addMiddle').value, $('addBack').value];
  const heroes = raw.map(findHero);
  const msg = $('addMsg');
  const bad = raw.filter((v, i) => !heroes[i]);
  if (bad.length)
    return (msg.textContent =
      'Unknown hero: ' + bad.map((v) => v || '(empty)').join(', ') + '. Pick names from the list.');
  if (new Set(heroes).size < 3)
    return (msg.textContent = 'A lineup needs three different heroes.');
  if (!heroes.some(isX8Hero))
    return (msg.textContent =
      'This lineup has no X8 hero. Use edit mode to change an S0–X2 lineup instead.');
  const skin = $('addSkin').value.trim();
  if (skin && !/^[123]{3}$/.test(skin))
    return (msg.textContent = 'Skin code is three digits of 1, 2 or 3, e.g. 222.');
  const key = heroes.join('|') + '#' + skin;
  if ([...laneViews(), ...baseView()].some((l) => keyOf(l) === key && !removed.has(l.id)))
    return (msg.textContent = 'That lineup is already in the database.');
  const id = slug(heroes, skin);
  edits.delete(id);
  removed.delete(id);
  lanes.set(id, {
    id,
    heroes,
    skin,
    note: '',
    tier: '',
    score: null,
    anchor: '',
    slot: 0,
    added: true,
  });
  ['addFront', 'addMiddle', 'addBack', 'addSkin'].forEach((f) => ($(f).value = ''));
  msg.textContent = 'Added. Place it now, or Save to keep it in x8-queue.json for later.';
  touch();
  trayMode = 'unplaced';
  document
    .querySelectorAll('[data-tray]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tray === 'unplaced')));
  render();
});

// Compact rows fit roughly twice as many lineups on screen; the filter panel and
// the compact toggle both remember their state.
function setCompact(on) {
  document.body.classList.toggle('compact', on);
  $('compactRows').checked = on;
  try {
    localStorage.setItem('combosPlannerCompact', on ? '1' : '0');
  } catch (err) {
    /* private mode: keep the setting for this page only */
  }
}
function readCompact() {
  try {
    return localStorage.getItem('combosPlannerCompact') === '1';
  } catch (err) {
    return false;
  }
}
const filtersOpen = () => !$('trayFilterBox').hidden;
function setFiltersOpen(open) {
  $('trayFilterBox').hidden = !open;
  $('trayFilterToggle').setAttribute('aria-expanded', String(open));
  try {
    localStorage.setItem('combosPlannerFilters', open ? '1' : '0');
  } catch (err) {
    /* private mode */
  }
}
function readFiltersOpen() {
  try {
    return localStorage.getItem('combosPlannerFilters') === '1';
  } catch (err) {
    return false;
  }
}

setCompact(readCompact());
setFiltersOpen(readFiltersOpen());
// The key carries the same mini troop logos the rows use.
document.querySelectorAll('#legend [data-troop]').forEach((el) => {
  el.insertAdjacentHTML('afterbegin', troopIcon(el.dataset.troop));
});
fetchCombos();
