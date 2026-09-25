// js/combos-planner-ui.js
//
// The Combos planner interface, mountable on any page. Two hosts run this same
// module: the local tool (tools/combos-planner/host.js, which saves through its
// loopback server) and the VTS Admin tab (js/admin-combos.js, which rebuilds
// js/combos-db.js in the browser for review). Everything it needs from a host
// arrives through the adapter, and every element it touches lives under the mount
// element, so it never reaches outside itself.
//
// The work is keyboard-first: J/K walk the queue, Enter accepts the suggested
// slot, arrows nudge, digits + Enter place above a rank, Z undoes, Ctrl+S shows
// what Save will change. The logic behind it — rows, suggestions, auto-draft,
// history, paste import and the save summary — is the pure js/combo-workflow.js.
//
// adapter:
//   load()            -> Promise<view>   the planner view (heroes/base/x8/skipped)
//   save(plan)        -> Promise<view>   persists or hands back the plan
//   saveLabel         Save button text
//   idleHint          status line with nothing pending
//   loadedHint        status line after a load
//   dirtyHint         status line with unsaved changes
//   addedHint         message after adding lineups
//   savedHint         status line after a save
//   loadingHint       status line while loading
//   loadError(error)  status line when loading fails
//   removeHint        status line while a removal waits for its confirmation
//   howToSummary      title of the help block
//   howToHtml         body of the help block
//   storagePrefix     localStorage prefix for the view preferences and the draft
//   guardUnload       ask before leaving with unsaved changes
//   portraitFallback  image shown when a portrait fails (relative to the page)
//
// Returns { destroy() } so a host can unmount the tool.

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
} from './combo-lanes.js';
import { laneSlug } from './combo-plan.js';
import { createHeroMatcher } from './hero-name-match.js';
import {
  autoDraft,
  createHistory,
  createSuggester,
  gapAboveRank,
  gapLabel,
  groupByX8,
  mergeRows,
  moveGap,
  parsePastedLineups,
  placeBlock,
  planFromState,
  summarizePlan,
  viewSignature,
} from './combo-workflow.js';

const ID_PREFIX = 'cp-';
/** Rows shown on each side of the selected lineup in the focus view. */
const FOCUS_RADIUS = 15;

// A small brush: the skin-code mark on a lineup, explained by its tooltip.
const SKIN_ICON =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M18.4 3.6a2 2 0 0 1 2.8 2.8L12 15.6 8.4 12z"/><path d="M8 13.5c-2.2 0-3.6 1.5-3.6 3.4 0 1.5-.8 2.3-1.9 2.6 1 .9 2.6 1.4 4.2 1.4 2.9 0 4.8-1.9 4.8-4.3z"/></svg>';

const KEYS_HTML = `
  <table>
    <tr><th><kbd>J</kbd> / <kbd>K</kbd></th><td>Next / previous lineup in the queue</td></tr>
    <tr><th><kbd>Enter</kbd></th><td>Accept the suggested slot (or place the selection as a block)</td></tr>
    <tr><th><kbd>5</kbd><kbd>8</kbd> <kbd>Enter</kbd></th><td>Place above rank #58</td></tr>
    <tr><th><kbd>↑</kbd> / <kbd>↓</kbd></th><td>Move the selected placed lineup one row</td></tr>
    <tr><th><kbd>Shift</kbd>+<kbd>↑</kbd> / <kbd>↓</kbd></th><td>Move it ten rows</td></tr>
    <tr><th><kbd>U</kbd></th><td>Unplace it</td></tr>
    <tr><th><kbd>Z</kbd> / <kbd>Shift</kbd>+<kbd>Z</kbd></th><td>Undo / redo (also <kbd>Ctrl</kbd>+<kbd>Z</kbd>, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>)</td></tr>
    <tr><th><kbd>Ctrl</kbd>+<kbd>S</kbd></th><td>Review the changes, then save</td></tr>
    <tr><th><kbd>/</kbd></th><td>Search the queue</td></tr>
    <tr><th><kbd>Esc</kbd></th><td>Cancel: typed rank, placing, selection, dialog</td></tr>
    <tr><th>Shift / Ctrl-click</th><td>Select several queued lineups, then Enter or a gap places them together</td></tr>
  </table>
  <p>Keys do nothing while you type in a field.</p>`;

const TEMPLATE = `<div class="combos-planner">
  <header class="cphead">
    <div class="topbar">
      <h1>Combos Planner <span class="badge beta">Beta</span></h1>
      <div class="progress" id="cp-progress"></div>
      <div class="stats" id="cp-stats"></div>
      <div class="toolbar">
        <button type="button" id="cp-autoDraft" title="Place every unplaced lineup at its suggestion, as one step you can undo">Auto-draft all</button>
        <button type="button" id="cp-undo" aria-keyshortcuts="Z Control+Z" title="Undo (Z)" disabled>Undo</button>
        <button type="button" id="cp-redo" aria-keyshortcuts="Shift+Z Control+Shift+Z" title="Redo (Shift+Z)" disabled>Redo</button>
        <div class="seg" role="group" aria-label="Row density">
          <button type="button" data-density="compact" aria-pressed="true">Compact</button>
          <button type="button" data-density="comfortable" aria-pressed="false">Comfortable</button>
        </div>
        <div class="keyswrap">
          <button type="button" id="cp-keysBtn" aria-expanded="false" aria-controls="cp-keys" aria-keyshortcuts="?">Keys</button>
          <div class="keys" id="cp-keys" role="dialog" aria-label="Keyboard shortcuts" hidden>${KEYS_HTML}</div>
        </div>
      </div>
    </div>
    <details class="howto"><summary id="cp-howtoSummary"></summary><div id="cp-howtoBody"></div></details>
  </header>

  <div class="strip" id="cp-strip">
    <div class="draftbar" id="cp-draftBar" hidden>
      <span id="cp-draftText"></span>
      <span class="bannertool">
        <button type="button" class="primary" id="cp-draftRestore">Restore draft</button>
        <button type="button" id="cp-draftDiscard">Discard</button>
      </span>
    </div>
    <div class="banner" id="cp-banner" hidden>
      <span id="cp-bannerText"></span>
      <span class="bannertool">
        <button type="button" id="cp-cancelPlace">Cancel</button>
      </span>
    </div>
    <div class="savebar">
      <button type="button" class="primary" id="cp-saveBtn" aria-keyshortcuts="Control+S" disabled>Save</button>
      <button type="button" id="cp-revertBtn" disabled>Discard changes</button>
      <span id="cp-dirty" class="dirty" hidden>Unsaved changes</span>
      <span class="status" id="cp-status" role="status" aria-live="polite">Loading…</span>
    </div>
  </div>

  <div class="dialogwrap" id="cp-summary" hidden>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="cp-summaryTitle" aria-describedby="cp-summaryText">
      <h2 id="cp-summaryTitle">Save these changes?</h2>
      <p id="cp-summaryText"></p>
      <ol class="difflist" id="cp-summaryLines"></ol>
      <div class="dialogactions">
        <button type="button" class="primary" id="cp-summarySave">Save</button>
        <button type="button" id="cp-summaryCancel">Keep editing</button>
      </div>
    </div>
  </div>

  <div class="grid">
    <aside class="panel tray" aria-labelledby="cp-trayTitle">
      <div class="panelhead">
        <div class="headrow">
          <h2 id="cp-trayTitle">Queue</h2>
          <div class="seg" role="group" aria-label="Show">
            <button type="button" data-tray="unplaced" aria-pressed="true">To place</button>
            <button type="button" data-tray="placed" aria-pressed="false">Placed</button>
            <button type="button" data-tray="all" aria-pressed="false">All</button>
          </div>
        </div>
        <div class="controls">
          <input type="search" id="cp-traySearch" placeholder="Search hero  ( / )" aria-label="Search X8 lineups by hero">
          <select id="cp-trayTroop" aria-label="Troop of the queued lineups">
            <option value="">All troops</option><option value="Cavalry">Cavalry</option><option value="Archers">Archers</option><option value="Footmen">Footmen</option><option value="Mixed">Mixed</option>
          </select>
          <button type="button" id="cp-trayFilterToggle" aria-expanded="false" aria-controls="cp-trayFilterBox">Filters</button>
        </div>
        <div class="filterbox" id="cp-trayFilterBox" hidden>
          <select id="cp-trayCost" aria-label="X8 paid or free">
            <option value="">Paid and free</option><option value="free">Free heroes only</option><option value="paid">Has a paid hero</option>
          </select>
          <select id="cp-trayTier" aria-label="X8 tier">
            <option value="">All tiers</option><option value="S">S tier</option><option value="A">A tier</option><option value="B">B tier</option><option value="C">C tier</option><option value="none">No tier yet</option>
          </select>
          <select id="cp-traySort" aria-label="Sort X8 lineups" title="Tier and source score come from the ROC Academy list; they only order this list">
            <option value="new">New first</option><option value="score">Source score</option><option value="tier">Tier</option><option value="name">Name</option><option value="position">Ranking order</option>
          </select>
        </div>
        <div class="countrow">
          <span class="count" id="cp-trayCount"></span>
          <button type="button" class="link" id="cp-trayClear" hidden>Clear filters</button>
        </div>
        <div class="batchbar" id="cp-batchBar" hidden>
          <span id="cp-batchText"></span>
          <button type="button" class="primary" id="cp-batchPlace">Place as a block…</button>
          <button type="button" id="cp-batchClear">Clear</button>
        </div>
      </div>
      <div class="queue" id="cp-cards"></div>
      <details class="addbox" id="cp-pasteBox">
        <summary>Paste lineups</summary>
        <div class="pasteform">
          <textarea id="cp-pasteText" rows="5" spellcheck="false" aria-label="Lineups to add, one per line" placeholder="Lawman / Bjorn / The Avalanche&#10;Lawman, Bjorn, Avalanche 222"></textarea>
          <p class="hint">One lineup per line, Front / Middle / Back, separated by <b>/</b>, <b>,</b> or <b>-</b>. A trailing three-digit skin code (<b>3</b> must own, <b>2</b> recommended, <b>1</b> optional) is read too. Names are matched without case, "The", or small typos.</p>
          <button type="button" id="cp-pasteRead">Check the lines</button>
          <div class="pasteresult" id="cp-pasteResult" aria-live="polite"></div>
        </div>
      </details>
    </aside>
    <main class="panel ranking" aria-labelledby="cp-listTitle">
      <div class="panelhead">
        <div class="headrow">
          <h2 id="cp-listTitle">Ranking</h2>
          <span class="count" id="cp-listCount"></span>
        </div>
        <div class="focusbar" id="cp-focusBar"></div>
        <div class="controls">
          <input type="search" id="cp-listSearch" placeholder="Filter by hero" aria-label="Filter the ranking by hero">
          <select id="cp-troop" aria-label="Troop">
            <option value="">All troops</option><option value="Cavalry">Cavalry</option><option value="Archers">Archers</option><option value="Footmen">Footmen</option><option value="Mixed">Mixed</option>
          </select>
          <select id="cp-cost" aria-label="Paid or free">
            <option value="">Paid and free</option><option value="free">Free heroes only</option><option value="paid">Has a paid hero</option>
          </select>
          <select id="cp-near" aria-label="Rows shown">
            <option value="all">Every row</option><option value="near">Only rows near X8 lineups</option>
          </select>
          <form class="gotobox" id="cp-gotoForm">
            <input type="number" id="cp-gotoRank" min="1" inputmode="numeric" placeholder="Rank #" aria-label="Go to rank number">
            <button type="submit">Go</button>
          </form>
          <label class="checkline" title="Show the whole ranking instead of the rows around the selected lineup"><input type="checkbox" id="cp-showAll"> All rows</label>
          <label class="checkline" title="Change, reorder or remove lineups"><input type="checkbox" id="cp-editBase"> Edit mode</label>
        </div>
        <p class="warn" id="cp-editNote" hidden><b>Edit mode</b> — <b>Edit</b> changes a lineup's heroes or skin code, <b>▲▼</b> reorders an S0–X2 lineup, <b>✕</b> takes one out (press it twice). <button type="button" class="primary" id="cp-editDone">Done editing</button></p>
        <div class="legend" aria-label="Colour key" id="cp-legend">
          <span data-troop="Cavalry">Cavalry</span><span data-troop="Archers">Archers</span><span data-troop="Footmen">Footmen</span><span data-troop="Mixed">Mixed</span>
          <span class="key paid"><i></i>Paid</span><span class="key free"><i></i>Free</span><span class="key x8key"><i></i>New lineup</span><span class="key skin">${SKIN_ICON}Skin code</span><span class="key share"><i></i>Shares 2+ heroes</span>
        </div>
      </div>
      <div class="list" id="cp-list"></div>
    </main>
  </div>
  <datalist id="cp-heroNames"></datalist>
</div>`;

export function mountCombosPlanner(root, adapter = {}) {
  if (!root) return { destroy() {} };
  const prefs = adapter.storagePrefix || 'combosPlanner';
  const saveLabel = adapter.saveLabel || 'Save';
  const idleHint = adapter.idleHint || 'Nothing pending.';
  const loadingHint = adapter.loadingHint || 'Loading the combo database…';
  const portraitFallback = adapter.portraitFallback || 'images/heroes/portrait-unavailable.svg';
  root.innerHTML = TEMPLATE;
  const $ = (id) => root.querySelector('#' + ID_PREFIX + id);
  const shell = root.querySelector('.combos-planner');
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  const store = {
    get(key) {
      try {
        return localStorage.getItem(prefs + key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        if (value == null) localStorage.removeItem(prefs + key);
        else localStorage.setItem(prefs + key, value);
      } catch {
        /* private mode or a full quota: the setting lives for this page only */
      }
    },
  };

  // --- State -----------------------------------------------------------------
  let view = null; // the loaded view, for the save summary and the draft check
  let H = {};
  let BASE = [];
  let lanes = new Map();
  let baseOrder = [];
  let edits = new Map();
  let removed = new Set();
  let holding = null; // ids being placed with the mouse (a gap click drops them)
  let editing = null;
  let pendingRemove = null;
  let editMode = false;
  let trayMode = 'unplaced';
  let dirty = false;
  let current = null; // the selected lineup
  let picked = new Set(); // multi-selection in the queue
  let pickFrom = null; // where a Shift-click range starts
  let queueIndex = 0; // where the selection was in the queue, for J/K after it leaves
  let digits = '';
  let showAll = false;
  let viewCenter = null; // a rank the ranking is centred on after "Go to rank"
  let collapsed = new Set();
  let loadedKey = '';
  let pendingDraft = null;
  const history = createHistory(300);
  let cache = null;

  const troopOf = (heroes) => troopOfHeroes(heroes, H);
  const hasPaid = (heroes) => heroIsPaid(heroes, H);
  const isX8Hero = (n) => H[n] && H[n].s === 'X8';
  const keyOf = (c) => c.heroes.join('|') + '#' + (c.skin || '');
  const label = (heroes) => heroes.join(' / ');

  /** A lineup with any pending edit applied, so every view shows what will be saved. */
  function laneFor(l) {
    const edit = edits.get(l.id);
    return edit ? { ...l, heroes: edit.heroes, skin: edit.skin, edited: true } : l;
  }
  const allLanes = () => [...lanes.values()].filter((l) => !removed.has(l.id));
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

  // Everything derived from the state is computed once per change, not per key.
  function derived() {
    if (cache) return cache;
    const bases = baseView();
    const lv = laneViews();
    const rows = mergeRows(bases, lv);
    const index = new Map(rows.map((r, i) => [r.id, i]));
    const suggester = createSuggester({ heroes: H, rows });
    const suggestions = new Map();
    for (const l of lv) if (!l.anchor) suggestions.set(l.id, suggester.suggest(l));
    cache = { bases, lanes: lv, rows, index, suggestions, byId: new Map(lv.map((l) => [l.id, l])) };
    return cache;
  }
  const invalidate = () => (cache = null);

  /** The suggestion for any lineup: queued ones from the cache, placed ones without themselves. */
  function suggestionFor(id) {
    const d = derived();
    if (d.suggestions.has(id)) return d.suggestions.get(id);
    const lane = d.byId.get(id);
    if (!lane) return null;
    const rows = d.rows.filter((r) => r.id !== id);
    return createSuggester({ heroes: H, rows }).suggest(lane);
  }

  // --- Snapshots, history, draft ----------------------------------------------
  function snapshot() {
    return {
      lanes: [...lanes.values()].map((l) => ({ ...l })),
      baseOrder: [...baseOrder],
      edits: [...edits.entries()].map(([id, e]) => [id, { heroes: [...e.heroes], skin: e.skin }]),
      removed: [...removed],
    };
  }
  function restore(state) {
    lanes = new Map(state.lanes.map((l) => [l.id, { ...l }]));
    baseOrder = [...state.baseOrder];
    edits = new Map(state.edits.map(([id, e]) => [id, { heroes: [...e.heroes], skin: e.skin }]));
    removed = new Set(state.removed);
    if (current && !lanes.has(current) && !baseOrder.includes(current)) current = null;
    picked = new Set([...picked].filter((id) => lanes.has(id)));
    editing = null;
    pendingRemove = null;
  }
  const stateKey = () => JSON.stringify(snapshot());

  /** Record the state before a change, so Z can bring it back. */
  const remember = () => history.push(snapshot());

  let draftTimer = 0;
  function scheduleDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(writeDraft, 300);
  }
  function writeDraft() {
    if (!view) return;
    if (!dirty) return store.set('Draft', null);
    store.set(
      'Draft',
      JSON.stringify({ v: 1, sig: viewSignature(view), at: Date.now(), state: snapshot() })
    );
  }
  function readDraft() {
    try {
      const draft = JSON.parse(store.get('Draft') || 'null');
      if (!draft || draft.v !== 1 || !draft.state || !Array.isArray(draft.state.lanes)) return null;
      return draft;
    } catch {
      return null;
    }
  }

  /** After any change: recompute, mark dirty, redraw, keep the draft, announce. */
  function changed(message) {
    invalidate();
    setDirty(stateKey() !== loadedKey);
    render();
    scheduleDraft();
    if (message) setStatus(message);
    else if (dirty) setStatus(adapter.dirtyHint || 'Not saved yet. Press Save to apply it.');
  }

  function undo() {
    const state = history.undo(snapshot());
    if (!state) return setStatus('Nothing to undo.');
    restore(state);
    changed('Undone. Shift+Z redoes it.');
  }
  function redo() {
    const state = history.redo(snapshot());
    if (!state) return setStatus('Nothing to redo.');
    restore(state);
    changed('Redone.');
  }

  // --- Loading ------------------------------------------------------------------
  function applyView(data) {
    view = data;
    H = data.heroes;
    BASE = data.base;
    baseOrder = BASE.map((b) => b.id);
    edits = new Map();
    removed = new Set();
    editing = null;
    pendingRemove = null;
    holding = null;
    picked = new Set();
    digits = '';
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
    $('gotoRank').max = String(BASE.length);
    history.clear();
    loadedKey = stateKey();
    invalidate();
    setDirty(false);
    if (!current || !lanes.has(current)) current = firstQueued();
    render();
    if (current) focusRanking();
    if (data.skipped && data.skipped.length) {
      setStatus('Skipped in the queue files: ' + data.skipped.join('; '));
      return true;
    }
    return false;
  }

  function offerDraft() {
    const draft = readDraft();
    pendingDraft = null;
    $('draftBar').hidden = true;
    if (!draft || !view) return;
    if (draft.sig !== viewSignature(view)) {
      store.set('Draft', null);
      setStatus('An older draft was for a different combos-db.js, so it was set aside.');
      return;
    }
    if (JSON.stringify(draft.state) === loadedKey) return store.set('Draft', null);
    pendingDraft = draft;
    let summary = '';
    try {
      const saved = snapshot();
      restore(draft.state);
      invalidate();
      summary = summarizePlan(view, currentPlan()).text;
      restore(saved);
      invalidate();
    } catch {
      summary = 'unsaved changes';
    }
    const when = new Date(draft.at);
    $('draftText').textContent =
      'You have an unsaved draft from ' +
      (isNaN(when) ? 'earlier' : when.toLocaleString()) +
      ': ' +
      summary +
      '.';
    $('draftBar').hidden = false;
    measureStrip();
  }
  function restoreDraft() {
    if (!pendingDraft) return;
    remember();
    restore(pendingDraft.state);
    pendingDraft = null;
    $('draftBar').hidden = true;
    changed('Draft restored. Z undoes the restore.');
    measureStrip();
  }
  function discardDraft() {
    pendingDraft = null;
    store.set('Draft', null);
    $('draftBar').hidden = true;
    setStatus('Draft discarded.');
    measureStrip();
  }

  function setDirty(value) {
    dirty = value;
    $('dirty').hidden = !value;
    $('saveBtn').disabled = !value;
    $('revertBtn').disabled = !value;
    $('undo').disabled = !history.canUndo;
    $('redo').disabled = !history.canRedo;
  }
  function setStatus(msg) {
    $('status').textContent = msg;
  }

  // The panels stay put while the page scrolls, so keep them clear of the sticky
  // save bar and the banners by measuring that strip.
  function measureStrip() {
    shell.style.setProperty('--strip-h', $('strip').offsetHeight + 'px');
  }

  function flash(el) {
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1500);
  }
  /** Scroll a row into its panel's view without moving the page more than needed. */
  function reveal(selector, { block = 'nearest', focus = false, blink = false } = {}) {
    requestAnimationFrame(() => {
      const el = root.querySelector(selector);
      if (!el) return;
      el.scrollIntoView({ block, behavior: 'auto' });
      if (focus) el.focus({ preventScroll: true });
      if (blink) flash(el);
    });
  }

  // --- Placing ------------------------------------------------------------------
  /** Apply a { id -> { anchor, slot } } placement map to every lineup it names. */
  function applyPlacements(placements) {
    for (const [id, where] of placements) {
      const lane = lanes.get(id);
      if (lane) lanes.set(id, { ...lane, anchor: where.anchor, slot: where.slot });
    }
  }
  /**
   * Place lineups as one contiguous block at a gap of the current rows (the
   * lineups may already be in them): one undo step.
   */
  function placeIds(ids, gap, verb = 'Placed') {
    const d = derived();
    const block = ids.map((id) => d.byId.get(id)).filter(Boolean);
    if (!block.length) return;
    remember();
    applyPlacements(placeBlock(d.rows, block, gap));
    invalidate();
    const what = block.length === 1 ? label(block[0].heroes) : block.length + ' lineups';
    changed(verb + ' ' + what + ' ' + placedLabel(block[0].id) + '. Z undoes it.');
    if (block.length === 1)
      select(block[0].id, { keepQueue: true, blink: true, redrawQueue: false });
    else focusRanking({ blink: true });
  }
  function placeAboveRank(value, ids = selectionIds()) {
    if (!ids.length) return setStatus('Select a lineup first (J / K or click one).');
    const rank = Number(value);
    const total = derived().bases.length;
    if (!Number.isInteger(rank) || rank < 1 || rank > total)
      return setStatus('Pick a rank between 1 and ' + total + '.');
    stopHolding(false);
    placeIds(ids, gapAboveRank(derived().rows, rank));
  }
  function acceptSuggestion(ids = selectionIds()) {
    if (!ids.length) return setStatus('Select a lineup first (J / K or click one).');
    const s = suggestionFor(ids[0]);
    if (!s || s.end)
      return setStatus(
        'No suggested slot for ' +
          label(derived().byId.get(ids[0]).heroes) +
          ' yet: type a rank and press Enter, or drag it.'
      );
    const lane = derived().byId.get(ids[0]);
    if (ids.length === 1 && lane.anchor)
      return setStatus('Already placed. ↑ / ↓ moves it, U unplaces it, digits + Enter moves it to a rank.');
    // The suggestion names the row it goes above; find that row in the full list.
    placeIds(ids, s.before ? derived().index.get(s.before) : derived().rows.length);
  }
  function moveCurrent(delta) {
    const lane = current && derived().byId.get(current);
    if (!lane) return false;
    if (!lane.anchor) {
      setStatus('That lineup is not placed yet: Enter accepts the suggestion.');
      return true;
    }
    const d = derived();
    const gap = moveGap(d.rows, lane.id, delta);
    const from = d.index.get(lane.id);
    if (gap === from || gap === from + 1) {
      setStatus(delta < 0 ? 'Already at the top.' : 'Already directly above the last lineup.');
      return true;
    }
    placeIds([lane.id], gap, 'Moved');
    return true;
  }
  function unplace(id = current) {
    const lane = id && lanes.get(id);
    if (!lane || !lane.anchor) return setStatus('Select a placed lineup to unplace it.');
    remember();
    lanes.set(id, { ...lane, anchor: '', slot: 0 });
    changed('Unplaced ' + label(laneFor(lane).heroes) + '; it waits at the end again. Z undoes it.');
    focusRanking();
  }
  function autoDraftAll() {
    const d = derived();
    const queued = d.lanes.filter((l) => !l.anchor);
    if (!queued.length) return setStatus('Every new lineup is placed already.');
    const draft = autoDraft({ heroes: H, rows: d.rows, lanes: queued });
    if (!draft.placed)
      return setStatus('No lineup has a suggestion yet: place a few by hand first, then auto-draft.');
    remember();
    applyPlacements(draft.placements);
    changed(
      'Auto-drafted ' +
        draft.placed +
        ' lineup' +
        (draft.placed === 1 ? '' : 's') +
        (draft.left.length ? '; ' + draft.left.length + ' had no suggestion and still wait' : '') +
        '. Fix the wrong ones, or Z undoes the whole draft.'
    );
  }

  // Mouse placing: pick a lineup (or the selection), then click a gap.
  function startHolding(ids) {
    holding = ids;
    shell.classList.add('placing');
    $('banner').hidden = false;
    $('bannerText').innerHTML = bannerText(ids);
    render();
    measureStrip();
  }
  function stopHolding(redraw = true) {
    if (!holding) return;
    holding = null;
    shell.classList.remove('placing');
    $('banner').hidden = true;
    measureStrip();
    if (redraw) render();
  }
  function bannerText(ids) {
    const d = derived();
    const lane = d.byId.get(ids[0]);
    const what =
      ids.length > 1 ? ids.length + ' lineups as one block' : '<b>' + esc(label(lane.heroes)) + '</b>';
    return (
      'Placing ' +
      what +
      ' — click a gap in the ranking, or type a rank and press Enter. <b>Esc</b> cancels.'
    );
  }

  // --- Selection ------------------------------------------------------------------
  /** The queue as it is listed: groups in order, collapsed groups skipped. */
  function queueOrder() {
    return queueItems().flatMap((g) => (collapsed.has(g.hero) ? [] : g.items.map((l) => l.id)));
  }
  /** The first queued lineup that has a suggestion, else the first queued one. */
  function firstQueued() {
    const d = derived();
    const ids = queueOrder().filter((id) => !d.byId.get(id).anchor);
    const ready = ids.find((id) => !d.suggestions.get(id).end);
    return ready || ids[0] || queueOrder()[0] || null;
  }
  const selectionIds = () => {
    if (picked.size > 1) return queueOrder().filter((id) => picked.has(id));
    return current && lanes.has(current) ? [current] : [];
  };
  function select(id, { keepQueue = false, blink = false, redrawQueue = true } = {}) {
    const before = current;
    current = id;
    viewCenter = null;
    digits = '';
    const order = queueOrder();
    if (!keepQueue && order.includes(id)) queueIndex = order.indexOf(id);
    if (redrawQueue) renderTray();
    else markQueueCurrent(before, id);
    reveal('#cp-cards [data-card="' + CSS.escape(id) + '"]');
    focusRanking({ blink });
  }
  /** Move the queue's highlight without redrawing it (J / K on a long queue). */
  function markQueueCurrent(before, id) {
    for (const [key, add] of [
      [before, false],
      [id, true],
    ]) {
      const entry = key && queueEls.get('lane:' + key);
      if (!entry) continue;
      entry.el.classList.toggle('current', add);
      entry.html = null; // no longer the cached markup
    }
  }
  function step(delta) {
    const order = queueOrder();
    if (!order.length) return setStatus('The queue is empty in this view.');
    let i = order.indexOf(current);
    if (i < 0) i = delta > 0 ? queueIndex - 1 : queueIndex;
    const next = Math.max(0, Math.min(order.length - 1, i + delta));
    const redrawQueue = picked.size > 0;
    picked = new Set();
    select(order[next], { redrawQueue });
    const lane = derived().byId.get(order[next]);
    const s = suggestionFor(order[next]);
    setStatus(
      label(lane.heroes) +
        (lane.anchor
          ? ' — placed ' + placedLabel(lane.id)
          : s && !s.end
            ? ' — suggested ' + s.reason
            : ' — no suggestion yet: type a rank and press Enter')
    );
  }
  function placedLabel(id) {
    const d = derived();
    const i = d.index.get(id);
    return i == null ? 'at the end' : gapLabel(d.rows, i);
  }
  /** Scroll the ranking so the selection (or its suggestion, or a rank) is in the middle. */
  function focusRanking({ blink = false } = {}) {
    refreshList();
    const list = $('list');
    const target = viewCenter
      ? list.querySelector('.centre')
      : list.querySelector('.row.current') || list.querySelector('.suggestmark');
    if (!target) return;
    requestAnimationFrame(() => {
      const panel = list.closest('.panel');
      const scroller = panel && panel.scrollHeight > panel.clientHeight ? panel : null;
      if (scroller) {
        const top =
          target.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop -
          scroller.clientHeight / 2 +
          target.offsetHeight / 2;
        scroller.scrollTop = Math.max(0, top);
      } else {
        target.scrollIntoView({ block: 'nearest' });
      }
      if (blink) flash(target);
    });
  }

  // --- Rendering: shared bits ---------------------------------------------------------
  function portrait(n, size) {
    const h = H[n] || {};
    return h.i
      ? '<img class="portrait" src="' +
          esc(h.i) +
          '" alt="" loading="lazy" decoding="async" width="' +
          size +
          '" height="' +
          size +
          '">'
      : '<span class="portrait"></span>';
  }
  function heroHtml(n) {
    const h = H[n] || {};
    const troop = h.t || 'All';
    return (
      '<span class="hero' +
      (h.s === 'X8' ? ' isx8' : '') +
      '" title="' +
      esc(n + ' — ' + (TROOP_LABEL[troop] || troop) + (h.p ? ', paid hero' : '')) +
      '">' +
      portrait(n, 24) +
      '<span class="troop ' +
      esc(troop) +
      '">' +
      troopIcon(troop, 13) +
      '</span><span class="name">' +
      esc(n) +
      '</span></span>'
    );
  }
  function skinHtml(skin) {
    if (!skin) return '';
    const words = { 3: 'must own', 2: 'recommended', 1: 'optional' };
    const title =
      'Skin code ' +
      skin +
      ': Front ' +
      words[skin[0]] +
      ', Middle ' +
      words[skin[1]] +
      ', Back ' +
      words[skin[2]];
    return (
      '<span class="skin" title="' +
      esc(title) +
      '">' +
      SKIN_ICON +
      '<span class="skintext">skin ' +
      esc(skin) +
      '</span></span>'
    );
  }
  function lineupHtml(heroes, skin) {
    return (
      '<span class="lineup">' +
      heroes.map(heroHtml).join('<span class="sep" aria-hidden="true">/</span>') +
      skinHtml(skin) +
      '</span>'
    );
  }
  /** Troop and paid/free as colour, with the same facts in words for screen readers. */
  function factsHtml(heroes) {
    const troop = troopOf(heroes);
    const paid = hasPaid(heroes);
    return (
      '<span class="kind ' +
      (paid ? 'paid' : 'free') +
      '" title="' +
      (paid ? 'Uses at least one paid hero' : 'Free heroes only') +
      '"><span class="kindtext">' +
      (paid ? 'Paid' : 'Free') +
      '</span></span><span class="sr">, ' +
      esc(TROOP_LABEL[troop] || troop) +
      '</span>'
    );
  }
  const rowClass = (heroes) => ' troop-' + troopOf(heroes) + (hasPaid(heroes) ? ' paid' : ' free');
  function matchChip(match) {
    if (!match || match.shared < 2) return '';
    return match.sameTrio
      ? '<span class="chip duplicate" title="The same three heroes">same trio</span>'
      : '<span class="chip match2" title="Shares two heroes with the selected lineup">2 same</span>';
  }
  function matchClass(match) {
    if (!match || match.shared < 2) return '';
    return match.sameTrio ? ' same-trio' : ' match2';
  }

  // --- Rendering: the ranking ---------------------------------------------------------
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

  function rowHtml(r, match) {
    if (r.type === 'base') {
      return (
        '<div class="row base' +
        rowClass(r.heroes) +
        (r.edited ? ' edited' : '') +
        (r.id === current ? ' current' : '') +
        (pendingRemove === r.id ? ' confirming' : '') +
        matchClass(match) +
        (viewCenter === r.rank ? ' centre' : '') +
        '" data-rank="' +
        r.rank +
        '" data-base="' +
        esc(r.id) +
        '"><span class="rank">' +
        r.rank +
        '</span>' +
        lineupHtml(r.heroes, r.skin) +
        '<span class="actions">' +
        matchChip(match) +
        (r.edited ? '<span class="chip edited" title="Changed, not saved yet">edited</span>' : '') +
        factsHtml(r.heroes) +
        baseActions(r) +
        (pendingRemove === r.id
          ? '<button type="button" class="danger" data-remove="' + esc(r.id) + '">Remove?</button>'
          : '') +
        '</span></div>'
      );
    }
    return (
      '<div class="row x8' +
      rowClass(r.heroes) +
      (r.id === current ? ' current' : '') +
      (picked.has(r.id) ? ' picked' : '') +
      (holding && holding.includes(r.id) ? ' holding' : '') +
      (r.edited ? ' edited' : '') +
      matchClass(match) +
      '" draggable="true" data-row="' +
      esc(r.id) +
      '" aria-label="' +
      esc(label(r.heroes)) +
      ', new lineup above rank ' +
      r.above +
      '"><span class="rank" title="New lineup, above #' +
      r.above +
      '">X8</span>' +
      lineupHtml(r.heroes, r.skin) +
      '<span class="actions">' +
      matchChip(match) +
      factsHtml(r.heroes) +
      '<button type="button" class="mini" data-up="' +
      esc(r.id) +
      '" aria-label="Move up one row" title="Move up (↑)">▲</button>' +
      '<button type="button" class="mini" data-down="' +
      esc(r.id) +
      '" aria-label="Move down one row" title="Move down (↓)">▼</button>' +
      '<button type="button" class="mini" data-unplace="' +
      esc(r.id) +
      '" title="Unplace (U)">Unplace</button></span></div>'
    );
  }

  function renderList() {
    captureEditing();
    const d = derived();
    const rows = d.rows;
    const filters = rankFilters();
    const near = filters.near ? nearMask(rows) : null;
    const shown = [];
    rows.forEach((r, i) => {
      if (near && !near[i]) return;
      if (!rankingMatches(r.heroes, filters, H)) return;
      shown.push(i);
    });
    const sel = current ? d.byId.get(current) || d.bases.find((b) => b.id === current) : null;
    const suggestion = sel && sel.type !== 'base' && !sel.anchor ? suggestionFor(sel.id) : null;
    // The suggestion gap is counted in the rows without the lineup; it is not in
    // the rows anyway when it is queued, so the indexes agree.
    const suggestGap = suggestion && !suggestion.end && !holding ? suggestion.gap : -1;
    // Centre of the focus view: the selected row, its suggestion, or a rank.
    let centre = -1;
    if (viewCenter) centre = gapAboveRank(rows, viewCenter);
    else if (sel && d.index.has(sel.id)) centre = d.index.get(sel.id);
    else if (suggestGap >= 0) centre = suggestGap;
    let from = 0;
    let to = shown.length;
    const windowed = !showAll && centre >= 0;
    if (windowed) {
      let at = shown.findIndex((i) => i >= centre);
      if (at < 0) at = shown.length - 1;
      from = Math.max(0, at - FOCUS_RADIUS);
      to = Math.min(shown.length, at + FOCUS_RADIUS + 1);
    }
    // Each part is [key, html]: rows keep their element across renders when their
    // markup is unchanged, so a move re-creates a handful of rows, not hundreds.
    const parts = [];
    if (windowed && from > 0)
      parts.push([
        'more-above',
        '<button type="button" class="more" data-showall>' +
          from +
          ' rows above hidden — show all rows</button>',
      ]);
    const heldIds = holding || [];
    for (let k = from; k < to; k++) {
      const i = shown[k];
      const r = rows[i];
      // A gap index counts the rows with the held lineups still in them, as placeBlock does.
      if (holding && !heldIds.includes(r.id)) {
        const where = esc(gapLabel(rows, i));
        parts.push([
          'gap:' + i,
          '<button type="button" class="gap" data-gap="' +
            i +
            '" aria-label="Place ' +
            where +
            '"><span>Place ' +
            where +
            '</span></button>',
        ]);
      }
      if (i === suggestGap) parts.push(['suggest', suggestMarkHtml(sel, suggestion)]);
      const match = sel && r.id !== sel.id ? matchOf(r, sel) : null;
      parts.push(['row:' + r.id, rowHtml(r, match)]);
      if (editing && editing.id === r.id) parts.push(['edit:' + r.id, editorHtml(r)]);
    }
    if (holding && to === shown.length)
      parts.push([
        'gap:end',
        '<button type="button" class="gap" data-gap="' +
          rows.length +
          '" aria-label="Leave it waiting at the end of the list"><span>Leave it waiting at the end</span></button>',
      ]);
    if (windowed && to < shown.length)
      parts.push([
        'more-below',
        '<button type="button" class="more" data-showall>' +
          (shown.length - to) +
          ' rows below hidden — show all rows</button>',
      ]);
    if (!shown.length)
      parts.push([
        'empty',
        '<div class="empty">No rows match these filters. ' +
          '<button type="button" class="link" data-clearrank>Clear filters</button></div>',
      ]);
    listEls = reconcile($('list'), listEls, parts);
    $('listCount').textContent =
      (windowed ? 'Rows ' + (from + 1) + '–' + to + ' of ' : 'Showing ') +
      shown.length +
      (shown.length !== rows.length ? ' (filtered from ' + rows.length + ')' : ' rows');
    $('showAll').checked = showAll;
    $('editNote').hidden = !editMode;
    drawn = { cache: d, filters: JSON.stringify(filters), windowed, holding, editing, editMode, pendingRemove };
    renderFocusBar();
  }

  /**
   * Bring a container's children in line with [key, html] parts, keeping every
   * element whose markup did not change (and moving it if needed). Returns the new
   * key -> { html, el } map for the next call.
   */
  function reconcile(container, previous, parts) {
    const keys = new Set(parts.map(([key]) => key));
    // Drop what is no longer listed first, so the walk below only meets moves.
    for (const [key, entry] of previous)
      if (!keys.has(key) && entry.el.parentNode === container) entry.el.remove();
    const known = new Set([...previous.values()].map((entry) => entry.el));
    for (const child of [...container.children]) if (!known.has(child)) child.remove();
    const next = new Map();
    const template = root.ownerDocument.createElement('template');
    let cursor = container.firstElementChild;
    for (const [key, html] of parts) {
      let entry = previous.get(key);
      if (!entry || entry.html !== html || next.has(key)) {
        if (entry && entry.el.parentNode === container) {
          if (entry.el === cursor) cursor = cursor.nextElementSibling;
          entry.el.remove();
        }
        template.innerHTML = html;
        entry = { html, el: template.content.firstElementChild };
      }
      next.set(key, entry);
      if (entry.el === cursor) cursor = cursor.nextElementSibling;
      else container.insertBefore(entry.el, cursor);
    }
    while (cursor) {
      const after = cursor.nextElementSibling;
      cursor.remove();
      cursor = after;
    }
    return next;
  }
  let listEls = new Map();
  let queueEls = new Map();

  // What the list last drew. With every row shown, a new selection only changes a
  // few classes, the shared-hero chips and the suggestion marker, so patch those
  // instead of rebuilding a few hundred rows on every J / K.
  let drawn = null;
  function refreshList() {
    const same =
      drawn &&
      !drawn.windowed &&
      showAll &&
      drawn.cache === derived() &&
      drawn.filters === JSON.stringify(rankFilters()) &&
      !holding &&
      !editing &&
      !drawn.holding &&
      !drawn.editing &&
      drawn.editMode === editMode &&
      drawn.pendingRemove === pendingRemove;
    if (same) patchSelection();
    else renderList();
  }
  function patchSelection() {
    const d = derived();
    const list = $('list');
    // A patched row no longer matches its cached markup: forget the markup so the
    // next full render rebuilds it.
    const touched = (el) => {
      const key = 'row:' + (el.dataset.base || el.dataset.row);
      const entry = listEls.get(key);
      if (entry) entry.html = null;
    };
    list.querySelectorAll('.row.current, .row.match2, .row.same-trio').forEach((el) => {
      el.classList.remove('current', 'match2', 'same-trio');
      touched(el);
    });
    list.querySelectorAll('.chip.match2, .chip.duplicate, .suggestmark').forEach((el) => el.remove());
    listEls.delete('suggest');
    const elOf = (r) => {
      const entry = listEls.get('row:' + r.id);
      const el = entry && entry.el.isConnected ? entry.el : null;
      if (el) touched(el);
      return el;
    };
    const sel = current ? d.byId.get(current) : null;
    if (sel) {
      for (const r of d.rows) {
        if (r.id === sel.id) continue;
        const match = matchOf(r, sel);
        if (match.shared < 2) continue;
        const el = elOf(r);
        if (!el) continue;
        el.classList.add(match.sameTrio ? 'same-trio' : 'match2');
        el.querySelector('.actions').insertAdjacentHTML('afterbegin', matchChip(match));
      }
      if (d.index.has(sel.id)) {
        const own = elOf(d.rows[d.index.get(sel.id)]);
        if (own) own.classList.add('current');
      } else {
        const s = suggestionFor(sel.id);
        const target = s && !s.end ? elOf(d.rows[s.gap]) : null;
        if (target) {
          target.insertAdjacentHTML('beforebegin', suggestMarkHtml(sel, s));
          listEls.set('suggest', { html: null, el: target.previousElementSibling });
        }
      }
    }
    renderFocusBar();
  }

  function suggestMarkHtml(sel, s) {
    return (
      '<div class="suggestmark" role="note">' +
      '<span class="arrow" aria-hidden="true">➜</span><span class="text"><b>Suggested for ' +
      esc(label(sel.heroes)) +
      ':</b> ' +
      esc(s.reason) +
      '</span><button type="button" class="primary mini" data-accept="' +
      esc(sel.id) +
      '">Accept ⏎</button></div>'
    );
  }

  function renderFocusBar() {
    const d = derived();
    const bar = $('focusBar');
    const ids = selectionIds();
    const lane = ids.length ? d.byId.get(ids[0]) : null;
    const rankInput =
      '<form class="rankjump" data-rankform><label>Place above #<input type="number" name="rank" min="1" inputmode="numeric" value="' +
      esc(digits) +
      '" aria-label="Place above rank number"></label><button type="submit">Go</button></form>';
    if (!lane) {
      bar.innerHTML =
        '<span class="muted">Select a lineup in the queue — <kbd>J</kbd> / <kbd>K</kbd> or a click — to see where it fits.</span>';
      return;
    }
    const typed = digits
      ? '<span class="typed" aria-live="polite">Place above <b>#' +
        esc(digits) +
        '</b> — press <kbd>Enter</kbd></span>'
      : '';
    if (ids.length > 1) {
      bar.innerHTML =
        '<b>' +
        ids.length +
        ' lineups selected</b> <span class="muted">Enter places them together at the first one\'s suggestion; digits + Enter above a rank; or</span> <button type="button" data-holdpicked>Pick a gap</button>' +
        typed +
        rankInput;
      return;
    }
    const s = lane.anchor ? null : suggestionFor(lane.id);
    bar.innerHTML =
      '<span class="who">' +
      lineupHtml(lane.heroes, lane.skin) +
      '</span>' +
      (lane.anchor
        ? '<span class="where">placed <b>' +
          esc(placedLabel(lane.id)) +
          '</b></span><button type="button" data-up="' +
          esc(lane.id) +
          '" title="↑">▲</button><button type="button" data-down="' +
          esc(lane.id) +
          '" title="↓">▼</button><button type="button" data-unplace="' +
          esc(lane.id) +
          '" title="U">Unplace</button>'
        : s && !s.end
          ? '<span class="where" title="' +
            esc(s.reason) +
            '">suggested <b>' +
            esc(s.label) +
            '</b></span><button type="button" class="primary" data-accept="' +
            esc(lane.id) +
            '">Accept ⏎</button>'
          : '<span class="where" title="' +
            esc(s ? s.reason : '') +
            '">no suggestion: ' +
            esc(s ? s.reason.replace(/^waits at the end · /, '') : '') +
            ' — type a rank and press Enter</span>') +
      '<button type="button" data-hold="' +
      esc(lane.id) +
      '" title="Then click a gap">Pick a gap</button>' +
      typed +
      rankInput;
  }

  // --- Rendering: the queue -------------------------------------------------------------
  const trayFilters = () => ({
    mode: trayMode,
    q: $('traySearch').value,
    troop: $('trayTroop').value,
    cost: $('trayCost').value,
    tier: $('trayTier').value,
    sort: $('traySort').value,
  });
  /** The queue's visible lineups, grouped by X8 hero, with each group's progress. */
  function queueItems() {
    const d = derived();
    const filters = trayFilters();
    const above = (id) => {
      const i = d.index.get(id);
      return i == null ? Infinity : d.rows[i].above;
    };
    const { items } = selectLanes(d.lanes, filters, H, above);
    const visible = new Set(items.map((l) => l.id));
    const order = new Map(items.map((l, i) => [l.id, i]));
    return groupByX8(d.lanes, H)
      .map((g) => ({
        ...g,
        items: g.lanes
          .filter((l) => visible.has(l.id))
          .sort((a, b) => order.get(a.id) - order.get(b.id)),
      }))
      .filter((g) => g.items.length);
  }

  function queueRowHtml(l, held) {
    const d = derived();
    const placed = !!l.anchor;
    const s = placed ? null : d.suggestions.get(l.id);
    const confirming = pendingRemove === l.id;
    const match = held && held.id !== l.id ? matchOf(l, held) : null;
    const where = placed
      ? '<button type="button" class="link where" data-show="' +
        esc(l.id) +
        '" title="Show it in the ranking">' +
        esc(placedLabel(l.id)) +
        '</button>'
      : s && !s.end
        ? '<span class="where sugg" title="' + esc(s.reason) + '">→ ' + esc(s.label) + '</span>'
        : '<span class="where none" title="' + esc(s ? s.reason : '') + '">no suggestion</span>';
    return (
      '<div class="qrow' +
      rowClass(l.heroes) +
      (placed ? ' placed' : '') +
      (l.id === current ? ' current' : '') +
      (picked.has(l.id) ? ' picked' : '') +
      (holding && holding.includes(l.id) ? ' holding' : '') +
      (l.edited ? ' edited' : '') +
      matchClass(match) +
      '" draggable="true" tabindex="-1" data-card="' +
      esc(l.id) +
      '" aria-label="' +
      esc(label(l.heroes)) +
      (placed ? ', placed ' + esc(placedLabel(l.id)) : '') +
      '">' +
      '<span class="pick" aria-hidden="true"></span>' +
      lineupHtml(l.heroes, l.skin) +
      '<span class="meta">' +
      (l.tier
        ? '<span class="chip tier" title="ROC Academy tier' +
          (l.score != null ? ', source score ' + l.score : '') +
          '">' +
          esc(l.tier) +
          '</span>'
        : '') +
      (l.added ? '<span class="chip new" title="Not in combos-db.js yet">new</span>' : '') +
      (l.edited ? '<span class="chip edited" title="Changed, not saved yet">edited</span>' : '') +
      factsHtml(l.heroes) +
      where +
      (placed
        ? '<button type="button" class="mini" data-unplace="' + esc(l.id) + '" title="Unplace (U)">↩</button>'
        : s && !s.end
          ? '<button type="button" class="mini primary" data-accept="' +
            esc(l.id) +
            '" title="Accept the suggestion (Enter)" aria-label="Accept the suggestion">✓</button>'
          : '') +
      (editMode
        ? '<button type="button" class="mini" data-edit="' +
          esc(l.id) +
          '" aria-label="Change this lineup\'s heroes or skin code">Edit</button>'
        : '') +
      (l.added
        ? '<button type="button" class="mini" data-delete="' + esc(l.id) + '" aria-label="Delete this new lineup">✕</button>'
        : confirming
          ? '<button type="button" class="mini danger" data-remove="' + esc(l.id) + '">Remove?</button>'
          : editMode
            ? '<button type="button" class="mini danger" data-remove="' +
              esc(l.id) +
              '" title="Remove this lineup" aria-label="Remove this lineup">✕</button>'
            : '') +
      '</span></div>'
    );
  }

  function renderTray() {
    const d = derived();
    const filters = trayFilters();
    const held = holding && holding.length === 1 ? d.byId.get(holding[0]) : null;
    const groups = queueItems();
    const inView = d.lanes.filter((l) =>
      trayMode === 'placed' ? l.anchor : trayMode === 'unplaced' ? !l.anchor : true
    ).length;
    const shown = groups.reduce((n, g) => n + g.items.length, 0);
    const active = [filters.troop, filters.cost, filters.tier].filter(Boolean).length;
    $('trayCount').textContent = inView
      ? shown + ' of ' + inView + ' shown'
      : trayMode === 'unplaced'
        ? 'Every new lineup is placed'
        : 'Nothing in this view';
    $('trayClear').hidden = !isFiltered(filters);
    const hidden = [filters.cost, filters.tier].filter(Boolean).length;
    $('trayFilterToggle').textContent = hidden ? 'Filters · ' + hidden : 'Filters';
    $('trayFilterToggle').classList.toggle('on', active > 0);
    const parts = [];
    for (const g of groups) {
      const open = !collapsed.has(g.hero);
      parts.push([
        'group:' + g.hero,
        '<button type="button" class="qhead" data-toggle="' +
          esc(g.hero) +
          '" aria-expanded="' +
          open +
          '"><span class="caret" aria-hidden="true">' +
          (open ? '▾' : '▸') +
          '</span>' +
          portrait(g.hero, 20) +
          '<b>' +
          esc(g.hero) +
          '</b><span class="gcount">' +
          g.placed +
          '/' +
          g.total +
          '</span><span class="bar" aria-hidden="true"><i style="width:' +
          Math.round((100 * g.placed) / g.total) +
          '%"></i></span></button>',
      ]);
      if (!open) continue;
      for (const l of g.items) {
        parts.push(['lane:' + l.id, queueRowHtml(l, held)]);
        if (editing && editing.id === l.id) parts.push(['edit:' + l.id, editorHtml(l)]);
      }
    }
    if (!groups.length)
      parts.push([
        'empty',
        '<div class="empty">' +
          (isFiltered(filters)
            ? 'No X8 lineup matches these filters. <button type="button" class="link" data-cleartray>Clear filters</button>'
            : trayMode === 'unplaced'
              ? 'Every new lineup is placed.'
              : 'Nothing here yet.') +
          '</div>',
      ]);
    // The panel around the queue scrolls, not the queue itself, so nothing here
    // reads a scroll position (a read would force a layout).
    queueEls = reconcile($('cards'), queueEls, parts);
    $('batchBar').hidden = picked.size < 2;
    $('batchText').textContent = picked.size + ' selected';
  }

  function renderStats() {
    const d = derived();
    const placed = d.lanes.filter((l) => l.anchor).length;
    const total = d.lanes.length;
    const changedLines = edits.size + baseOrder.filter((id, i) => BASE[i] && id !== BASE[i].id).length;
    $('progress').innerHTML =
      '<b>' +
      placed +
      '/' +
      total +
      '</b> placed<span class="bar" aria-hidden="true"><i style="width:' +
      (total ? Math.round((100 * placed) / total) : 0) +
      '%"></i></span>';
    $('stats').innerHTML =
      '<span class="stat"><b>' +
      d.bases.length +
      '</b> current</span>' +
      (changedLines ? '<span class="stat warn"><b>' + changedLines + '</b> lines edited</span>' : '') +
      (removed.size ? '<span class="stat warn"><b>' + removed.size + '</b> to remove</span>' : '');
    $('undo').disabled = !history.canUndo;
    $('redo').disabled = !history.canRedo;
    $('autoDraft').disabled = !d.lanes.some((l) => !l.anchor);
  }

  function render() {
    renderStats();
    renderTray();
    renderList();
  }

  function clearTrayFilters() {
    ['trayTroop', 'trayCost', 'trayTier'].forEach((id) => ($(id).value = ''));
    $('traySearch').value = '';
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
  function setTrayMode(mode) {
    trayMode = mode;
    root
      .querySelectorAll('[data-tray]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tray === mode)));
    renderTray();
  }

  // --- Editing and removing (edit mode) -------------------------------------------------------
  const findHero = (value) =>
    Object.keys(H).find(
      (n) =>
        n.toLowerCase() ===
        String(value || '')
          .trim()
          .toLowerCase()
    );

  /** Keep whatever has been typed into an open editor alive across re-renders. */
  function captureEditing() {
    const form = root.querySelector('form[data-edit]');
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
    const field = (name, text, currentValue) =>
      '<input type="text" name="' +
      name +
      '" list="cp-heroNames" value="' +
      currentValue +
      '" placeholder="' +
      text +
      '" aria-label="' +
      text +
      ' hero" autocomplete="off">';
    return (
      '<form class="editrow" data-edit="' +
      esc(lane.id) +
      '">' +
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

  /** Save the three heroes and the skin code typed into an open editor. */
  function applyEdit(form) {
    const id = form.dataset.edit;
    const isBase = !lanes.has(id);
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
    if (bad.length) return fail('Unknown hero: ' + bad.map((v) => v || '(empty)').join(', ') + '.');
    if (new Set(heroes).size < 3) return fail('A lineup needs three different heroes.');
    const usesX8 = heroes.some(isX8Hero);
    if (isBase && usesX8)
      return fail('That lineup uses an X8 hero, so it belongs in the X8 list, not the S0–X2 list.');
    if (!isBase && !usesX8)
      return fail('That lineup has no X8 hero, so it belongs in the S0–X2 list.');
    const skin = field('skin').trim();
    if (skin && !/^[123]{3}$/.test(skin)) return fail('Skin code is three digits of 1, 2 or 3.');
    const key = heroes.join('|') + '#' + skin;
    const others = [
      ...baseView().filter((b) => b.id !== id),
      ...laneViews().filter((l) => l.id !== id),
    ];
    if (others.some((l) => keyOf(l) === key))
      return fail('Another lineup already uses those three heroes and skin code.');
    editing = null;
    if (keyOf(current) === key) return render();
    remember();
    edits.set(id, { heroes, skin });
    changed('Edited ' + label(heroes) + '. Z undoes it.');
  }

  /** Two-step removal: the ✕ on a lineup asks once, then takes it out of the file. */
  function removeLane(id) {
    if (pendingRemove !== id) {
      pendingRemove = id;
      setStatus(adapter.removeHint || 'Press Remove? again to take that lineup out of the list.');
      return render();
    }
    pendingRemove = null;
    if (editing && editing.id === id) editing = null;
    if (holding && holding.includes(id)) stopHolding(false);
    remember();
    const lane = lanes.get(id);
    if (lane && lane.added) lanes.delete(id);
    else removed.add(id);
    picked.delete(id);
    changed('Marked for removal. Z undoes it.');
  }
  /** Nudge one S0-X2 lineup up or down; its X8 lanes travel with it. */
  function moveBase(id, delta) {
    const i = baseOrder.indexOf(id);
    let j = i;
    do j += delta < 0 ? -1 : 1;
    while (j >= 0 && j < baseOrder.length && removed.has(baseOrder[j]));
    if (i < 0 || j < 0 || j >= baseOrder.length) return;
    remember();
    [baseOrder[i], baseOrder[j]] = [baseOrder[j], baseOrder[i]];
    changed('Reordered. Z undoes it.');
  }
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

  // --- Paste import -----------------------------------------------------------------------
  let pasted = [];
  function readPaste() {
    pasted = parsePastedLineups($('pasteText').value, Object.keys(H));
    renderPaste();
  }
  function renderPaste() {
    const box = $('pasteResult');
    if (!pasted.length) {
      box.innerHTML = '<p class="hint">No lineups found in the text.</p>';
      return;
    }
    const rows = pasted.map((p, i) => {
      if (p.problem && p.problem.startsWith('needs'))
        return '<li class="bad">' + esc(p.text) + ' — ' + esc(p.problem) + '</li>';
      const cells = p.names.map((name, k) =>
        p.heroes[k]
          ? '<span class="ok">' + esc(p.heroes[k]) + '</span>'
          : '<input type="text" list="cp-heroNames" data-fix="' +
            i +
            ':' +
            k +
            '" value="' +
            esc(name) +
            '" aria-label="Correct the hero name ' +
            esc(name) +
            '" placeholder="' +
            esc((p.suggestions[k] || []).join(', ') || 'hero name') +
            '">'
      );
      return (
        '<li class="' +
        (p.problem ? 'bad' : 'good') +
        '">' +
        cells.join(' / ') +
        (p.skin ? ' <span class="chip">skin ' + esc(p.skin) + '</span>' : '') +
        (p.fuzzy.length ? ' <span class="hint">(' + esc(p.fuzzy.join(', ')) + ')</span>' : '') +
        (p.problem && p.problem !== 'unknown hero name' ? ' — ' + esc(p.problem) : '') +
        '</li>'
      );
    });
    const unmatched = pasted.reduce((n, p) => n + p.heroes.filter((h) => !h).length, 0);
    box.innerHTML =
      '<ol class="pastelist">' +
      rows.join('') +
      '</ol>' +
      (unmatched
        ? '<p class="hint">' +
          unmatched +
          ' name' +
          (unmatched === 1 ? '' : 's') +
          ' not recognised: correct them above, or leave those lines out.</p>'
        : '') +
      '<button type="button" class="primary" id="cp-pasteAdd">Add the matched lineups to the queue</button>';
  }
  function addPasted() {
    const match = createHeroMatcher(Object.keys(H));
    root.querySelectorAll('[data-fix]').forEach((input) => {
      const [i, k] = input.dataset.fix.split(':').map(Number);
      const found = match(input.value);
      if (found.name && pasted[i]) pasted[i].heroes[k] = found.name;
    });
    const existing = new Set([...baseView(), ...laneViews()].map(keyOf));
    const fresh = [];
    const skipped = [];
    for (const p of pasted) {
      const lane = { heroes: p.heroes, skin: p.skin };
      const why = p.heroes.some((h) => !h)
        ? 'unknown hero'
        : new Set(p.heroes).size < 3
          ? 'the same hero twice'
          : !p.heroes.some(isX8Hero)
            ? 'no X8 hero'
            : existing.has(keyOf(lane))
              ? 'already listed'
              : '';
      if (why) {
        skipped.push(p.text + ' (' + why + ')');
        continue;
      }
      existing.add(keyOf(lane));
      fresh.push(lane);
    }
    pasted = [];
    $('pasteResult').innerHTML =
      '<p class="hint">' +
      (fresh.length
        ? 'Added ' + fresh.length + ' lineup' + (fresh.length === 1 ? '' : 's') + ' to the queue.'
        : 'Nothing added.') +
      (skipped.length ? ' Skipped: ' + esc(skipped.join('; ')) + '.' : '') +
      '</p>';
    if (!fresh.length) return;
    remember();
    for (const lane of fresh) {
      const id = laneSlug(lane);
      edits.delete(id);
      removed.delete(id);
      lanes.set(id, {
        id,
        heroes: lane.heroes,
        skin: lane.skin,
        note: '',
        tier: '',
        score: null,
        anchor: '',
        slot: 0,
        added: true,
      });
    }
    $('pasteText').value = '';
    trayMode = 'unplaced';
    root
      .querySelectorAll('[data-tray]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tray === 'unplaced')));
    changed(
      adapter.addedHint ||
        'Added ' +
          fresh.length +
          ' lineup' +
          (fresh.length === 1 ? '' : 's') +
          ' to the queue. Place them, or Save to keep them for later.'
    );
    select(laneSlug(fresh[0]));
  }

  // --- Saving ---------------------------------------------------------------------------
  function currentPlan() {
    const d = derived();
    return planFromState({
      rows: d.rows,
      lanes: [...lanes.values()],
      baseOrder,
      edits,
      removed: [...removed],
    });
  }
  let lastFocus = null;
  function openSummary() {
    if (!view) return;
    const plan = currentPlan();
    const summary = summarizePlan(view, plan);
    const queuedOnly = !summary.lines.length && dirty;
    if (!summary.lines.length && !queuedOnly) return setStatus('Nothing to save: no line of combos-db.js changes.');
    $('summaryText').textContent =
      summary.text +
      (queuedOnly ? ' in combos-db.js; only the list of lineups waiting to be placed changes.' : '.') +
      ' ' +
      saveLabel +
      ' writes the lines below.';
    const kinds = {
      placed: '+',
      added: '+',
      moved: '↕',
      unplaced: '↩',
      edited: '✎',
      removed: '−',
      reordered: '↕',
    };
    const shownLines = summary.lines.slice(0, 400);
    $('summaryLines').innerHTML =
      shownLines
        .map(
          (line) =>
            '<li class="' +
            line.kind +
            '"><span class="mark" aria-hidden="true">' +
            kinds[line.kind] +
            '</span><span class="sr">' +
            line.kind +
            ': </span><code>' +
            esc(line.text) +
            '</code><span class="detail">' +
            esc(line.detail) +
            '</span></li>'
        )
        .join('') +
      (summary.lines.length > shownLines.length
        ? '<li>… and ' + (summary.lines.length - shownLines.length) + ' more</li>'
        : '');
    $('summarySave').textContent = saveLabel;
    lastFocus = root.ownerDocument.activeElement;
    $('summary').hidden = false;
    $('summarySave').focus();
  }
  function closeSummary() {
    $('summary').hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  async function save() {
    closeSummary();
    const plan = currentPlan();
    $('saveBtn').disabled = true;
    setStatus('Saving…');
    try {
      const data = await adapter.save(plan);
      store.set('Draft', null);
      if (data) applyView(data);
      setStatus(adapter.savedHint || 'Saved.');
    } catch (err) {
      $('saveBtn').disabled = false;
      setStatus('Not saved: ' + err.message);
    }
  }

  async function loadView() {
    setStatus(loadingHint);
    try {
      const skipped = applyView(await adapter.load());
      if (!skipped) setStatus(adapter.loadedHint || idleHint);
      offerDraft();
    } catch (error) {
      setStatus(
        adapter.loadError
          ? adapter.loadError(error)
          : 'Could not load the combo database: ' + error.message
      );
    }
  }
  async function revert() {
    const before = snapshot();
    store.set('Draft', null);
    await loadView();
    // Discard changes is one more step you can undo.
    history.push(before);
    setDirty(false);
    setStatus('Changes discarded. Z brings them back.');
  }

  // --- Mouse ------------------------------------------------------------------------------
  function clickQueueRow(ev, id) {
    if (ev.shiftKey && pickFrom) {
      const order = queueOrder();
      const a = order.indexOf(pickFrom);
      const b = order.indexOf(id);
      if (a >= 0 && b >= 0) {
        picked = new Set(order.slice(Math.min(a, b), Math.max(a, b) + 1));
        current = id;
        render();
        return setStatus(picked.size + ' lineups selected. Enter places them as a block.');
      }
    }
    if (ev.ctrlKey || ev.metaKey) {
      if (!picked.size && current && current !== id) picked.add(current);
      if (picked.has(id)) picked.delete(id);
      else picked.add(id);
      pickFrom = id;
      current = id;
      render();
      return setStatus(picked.size + ' selected. Enter places them as a block.');
    }
    picked = new Set();
    pickFrom = id;
    select(id);
  }

  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('button');
    if (!t) {
      const card = ev.target.closest('[data-card]');
      if (card) return clickQueueRow(ev, card.dataset.card);
      const row = ev.target.closest('[data-row]');
      if (row) {
        const before = current;
        current = row.dataset.row;
        if (picked.size) {
          picked = new Set();
          renderTray();
        } else markQueueCurrent(before, current);
        return refreshList();
      }
      if (!ev.target.closest('.keyswrap')) closeKeys();
      return;
    }
    const d = t.dataset;
    if (!t.closest('.keyswrap')) closeKeys();
    if (pendingRemove && d.remove !== pendingRemove) {
      pendingRemove = null;
      render();
    }
    if (d.gap != null) {
      const ids = holding || [];
      stopHolding(false);
      return placeIds(ids, Number(d.gap));
    }
    if (d.accept) {
      if (!selectionIds().includes(d.accept)) {
        picked = new Set();
        current = d.accept;
      }
      return acceptSuggestion();
    }
    if (d.hold) return holding ? stopHolding() : startHolding([d.hold]);
    if (d.holdpicked != null) return startHolding(selectionIds());
    if (d.up || d.down) {
      current = d.up || d.down;
      return moveCurrent(d.up ? -1 : 1);
    }
    if (d.unplace) return unplace(d.unplace);
    if (d.baseup) return moveBase(d.baseup, -1);
    if (d.basedown) return moveBase(d.basedown, 1);
    if (d.remove) return removeLane(d.remove);
    if (d.toggle) {
      if (collapsed.has(d.toggle)) collapsed.delete(d.toggle);
      else collapsed.add(d.toggle);
      return renderTray();
    }
    if (d.showall != null) {
      showAll = true;
      return focusRanking();
    }
    if (d.edit) {
      const lane = lanes.has(d.edit)
        ? laneViews().find((l) => l.id === d.edit)
        : baseView().find((b) => b.id === d.edit);
      editing = lane
        ? {
            id: lane.id,
            front: lane.heroes[0],
            middle: lane.heroes[1],
            back: lane.heroes[2],
            skin: lane.skin,
          }
        : null;
      render();
      const form = root.querySelector('form[data-edit]');
      if (form) {
        form.scrollIntoView({ block: 'nearest' });
        const first = form.querySelector('[name="front"]');
        if (first) first.focus();
      }
      return;
    }
    if (d.canceledit != null) {
      editing = null;
      return render();
    }
    if (d.show) {
      clearRankFilters();
      picked = new Set();
      return select(d.show);
    }
    if (d.cleartray != null) return clearTrayFilters();
    if (d.clearrank != null) return clearRankFilters();
    if (d.delete) {
      remember();
      lanes.delete(d.delete);
      picked.delete(d.delete);
      if (current === d.delete) current = null;
      return changed('Deleted that new lineup. Z undoes it.');
    }
    if (d.tray) return setTrayMode(d.tray);
    if (d.density) return setDensity(d.density);
    if (t.id === 'cp-pasteAdd') return addPasted();
  });
  root.addEventListener('submit', (ev) => {
    const form = ev.target.closest('form');
    if (!form) return;
    if (form.matches('form[data-edit]')) {
      ev.preventDefault();
      return applyEdit(form);
    }
    if (form.matches('form[data-rankform]')) {
      ev.preventDefault();
      return placeAboveRank(form.querySelector('[name="rank"]').value);
    }
  });
  // A portrait that fails to load shows the site's placeholder instead of a broken image.
  root.addEventListener(
    'error',
    (ev) => {
      const img = ev.target;
      if (
        img instanceof HTMLImageElement &&
        img.classList.contains('portrait') &&
        !img.dataset.fallback
      ) {
        img.dataset.fallback = '1';
        img.src = portraitFallback;
      }
    },
    true
  );
  $('cancelPlace').addEventListener('click', () => stopHolding());
  $('saveBtn').addEventListener('click', openSummary);
  $('summarySave').addEventListener('click', () => void save());
  $('summaryCancel').addEventListener('click', closeSummary);
  $('summary').addEventListener('click', (ev) => {
    if (ev.target === $('summary')) closeSummary();
  });
  $('revertBtn').addEventListener('click', () => void revert());
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('autoDraft').addEventListener('click', autoDraftAll);
  $('draftRestore').addEventListener('click', restoreDraft);
  $('draftDiscard').addEventListener('click', discardDraft);
  $('batchPlace').addEventListener('click', () => startHolding(selectionIds()));
  $('batchClear').addEventListener('click', () => {
    picked = new Set();
    render();
  });
  $('trayClear').addEventListener('click', clearTrayFilters);
  $('trayFilterToggle').addEventListener('click', () => setFiltersOpen(!filtersOpen()));
  $('pasteRead').addEventListener('click', readPaste);
  $('gotoForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const rank = Number($('gotoRank').value);
    if (!Number.isInteger(rank) || rank < 1 || rank > derived().bases.length)
      return setStatus('Rank must be a whole number between 1 and ' + derived().bases.length + '.');
    clearRankFilters();
    viewCenter = rank;
    focusRanking();
    reveal('[data-rank="' + rank + '"]', { blink: true });
  });
  $('showAll').addEventListener('change', (ev) => {
    showAll = ev.target.checked;
    focusRanking();
  });
  $('editDone').addEventListener('click', () => setEditMode(false));
  $('editBase').addEventListener('change', (ev) => setEditMode(ev.target.checked));
  ['listSearch', 'troop', 'cost', 'near'].forEach((id) =>
    $(id).addEventListener('input', renderList)
  );
  ['traySearch', 'trayTroop', 'trayCost', 'trayTier', 'traySort'].forEach((id) =>
    $(id).addEventListener('input', renderTray)
  );

  // --- Keys -------------------------------------------------------------------------------
  const keysOpen = () => !$('keys').hidden;
  function toggleKeys(open = !keysOpen()) {
    $('keys').hidden = !open;
    $('keysBtn').setAttribute('aria-expanded', String(open));
  }
  const closeKeys = () => keysOpen() && toggleKeys(false);
  $('keysBtn').addEventListener('click', () => toggleKeys());

  const isTyping = (el) =>
    el instanceof Element &&
    (el.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"]') ||
      el.isContentEditable);
  /**
   * Shortcuts only act while the planner is on screen: the admin tab hides its
   * panel with a class. A DOM check, so a key press never forces a layout.
   */
  const onScreen = () => root.isConnected && !root.closest('[hidden], .hidden');

  function cancel() {
    if (!$('summary').hidden) return closeSummary(), true;
    if (keysOpen()) return toggleKeys(false), true;
    if (digits) {
      digits = '';
      renderFocusBar();
      return true;
    }
    if (holding) return stopHolding(), true;
    if (pendingRemove) {
      pendingRemove = null;
      render();
      return true;
    }
    if (editing) {
      editing = null;
      render();
      return true;
    }
    if (picked.size) {
      picked = new Set();
      render();
      return true;
    }
    return false;
  }

  function onKey(ev) {
    if (!onScreen() || ev.defaultPrevented || ev.altKey) return;
    const target = ev.target;
    const inside = target instanceof Node && root.contains(target);
    const onPage = target instanceof Element && (target.tagName === 'BODY' || target.tagName === 'HTML');
    if (!inside && !onPage) return;
    const mod = ev.ctrlKey || ev.metaKey;
    const key = ev.key;
    // Ctrl+S reviews and saves from anywhere in the planner, even a field.
    if (mod && (key === 's' || key === 'S')) {
      ev.preventDefault();
      if (!$('summary').hidden) return void save();
      return openSummary();
    }
    if (key === 'Escape') {
      if (isTyping(target)) {
        if (target instanceof HTMLInputElement && target.type === 'search' && target.value) {
          target.value = '';
          target.dispatchEvent(new Event('input'));
          return;
        }
        if (editing || holding) {
          cancel();
          return;
        }
        target.blur();
        return;
      }
      if (cancel()) ev.preventDefault();
      return;
    }
    if (isTyping(target)) return;
    if (!$('summary').hidden) return; // the dialog's own buttons take the keys
    if (target instanceof HTMLButtonElement && (key === 'Enter' || key === ' ')) return;
    if (mod && (key === 'z' || key === 'Z')) {
      ev.preventDefault();
      return ev.shiftKey ? redo() : undo();
    }
    if (mod && (key === 'y' || key === 'Y')) {
      ev.preventDefault();
      return redo();
    }
    if (mod) return;
    if (key === '?') {
      ev.preventDefault();
      return toggleKeys();
    }
    if (key === '/') {
      ev.preventDefault();
      return $('traySearch').focus();
    }
    if (key === 'j' || key === 'J') {
      ev.preventDefault();
      return step(1);
    }
    if (key === 'k' || key === 'K') {
      ev.preventDefault();
      return step(-1);
    }
    if (key === 'z' || key === 'Z') {
      ev.preventDefault();
      return ev.shiftKey ? redo() : undo();
    }
    if (key === 'u' || key === 'U') {
      ev.preventDefault();
      return unplace();
    }
    if (/^[0-9]$/.test(key)) {
      ev.preventDefault();
      digits = (digits + key).replace(/^0+/, '').slice(0, 4);
      renderFocusBar();
      return setStatus(digits ? 'Place above #' + digits + ': press Enter.' : '');
    }
    if (key === 'Backspace' && digits) {
      ev.preventDefault();
      digits = digits.slice(0, -1);
      return renderFocusBar();
    }
    if (key === 'Enter') {
      ev.preventDefault();
      if (digits) {
        const value = digits;
        digits = '';
        return placeAboveRank(value, holding || selectionIds());
      }
      if (holding) return setStatus('Type a rank and press Enter, or click a gap.');
      return acceptSuggestion();
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const lane = current && derived().byId.get(current);
      if (!lane || !lane.anchor) return; // let the page scroll
      ev.preventDefault();
      return moveCurrent((key === 'ArrowUp' ? -1 : 1) * (ev.shiftKey ? 10 : 1));
    }
  }
  const view_ = root.ownerDocument.defaultView || window;
  view_.addEventListener('keydown', onKey);

  const onResize = () => measureStrip();
  view_.addEventListener('resize', onResize);
  const guardUnload = adapter.guardUnload !== false;
  const onBeforeUnload = (event) => {
    if (dirty) event.preventDefault();
  };
  if (guardUnload) view_.addEventListener('beforeunload', onBeforeUnload);

  // --- Drag and drop -------------------------------------------------------------------------
  let dropped = false;
  root.addEventListener('dragstart', (ev) => {
    const src = ev.target.closest('[data-card],[data-row]');
    if (!src) return;
    dropped = false;
    const id = src.dataset.card || src.dataset.row;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', id);
    const ids = picked.has(id) && picked.size > 1 ? selectionIds() : [id];
    current = id;
    startHolding(ids);
  });
  root.addEventListener('dragover', (ev) => {
    const g = ev.target.closest('.gap');
    if (!g || !holding) return;
    ev.preventDefault();
    root.querySelectorAll('.gap.over').forEach((x) => x !== g && x.classList.remove('over'));
    g.classList.add('over');
  });
  root.addEventListener('dragleave', (ev) => {
    const g = ev.target.closest('.gap');
    if (g) g.classList.remove('over');
  });
  root.addEventListener('drop', (ev) => {
    const g = ev.target.closest('.gap');
    if (!g || !holding) return;
    ev.preventDefault();
    dropped = true;
    const ids = holding;
    stopHolding(false);
    placeIds(ids, Number(g.dataset.gap));
  });
  root.addEventListener('dragend', () => {
    if (!dropped && holding) stopHolding();
  });

  // --- Preferences ---------------------------------------------------------------------------
  // Compact rows are the default; Comfortable brings back the larger rows and text
  // badges. Both hosts remember the choice under their own prefix.
  function setDensity(mode) {
    const comfortable = mode === 'comfortable';
    shell.classList.toggle('comfortable', comfortable);
    shell.classList.toggle('compact', !comfortable);
    root
      .querySelectorAll('[data-density]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.density === (comfortable ? 'comfortable' : 'compact'))));
    store.set('Density', comfortable ? 'comfortable' : 'compact');
    measureStrip();
  }
  const filtersOpen = () => !$('trayFilterBox').hidden;
  function setFiltersOpen(open) {
    $('trayFilterBox').hidden = !open;
    $('trayFilterToggle').setAttribute('aria-expanded', String(open));
    store.set('Filters', open ? '1' : '0');
  }

  $('howtoSummary').textContent = adapter.howToSummary || 'How this works';
  $('howtoBody').innerHTML = adapter.howToHtml || '';
  $('saveBtn').textContent = saveLabel + ' (Ctrl+S)';
  setDensity(store.get('Density') === 'comfortable' ? 'comfortable' : 'compact');
  setFiltersOpen(store.get('Filters') === '1');
  // The key carries the same mini troop logos the rows use.
  root.querySelectorAll('#cp-legend [data-troop]').forEach((el) => {
    el.classList.add('troop', el.dataset.troop);
    el.insertAdjacentHTML('afterbegin', troopIcon(el.dataset.troop, 14));
  });
  void loadView();
  return {
    destroy() {
      clearTimeout(draftTimer);
      view_.removeEventListener('keydown', onKey);
      view_.removeEventListener('resize', onResize);
      if (guardUnload) view_.removeEventListener('beforeunload', onBeforeUnload);
      root.innerHTML = '';
    },
  };
}
