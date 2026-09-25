// js/admin-combos.js
// The VTS Admin host of the Combos planner (Beta). It mounts the same interface the
// local tool runs — js/combos-planner-ui.js — against the database that ships with
// the site, so an admin gets the identical tool: filters, the overlap answer while
// placing, edit mode, and removal.
//
// Save cannot change a deployed file from the browser, so it rebuilds
// js/combos-db.js in place (exactly the text the local planner would write, because
// both run js/combo-plan.js) and hands that file over for download and the
// clipboard. Committing it keeps the reviewed history. Lineups added in the tab
// that were not placed stay in a local draft, the way the local tool keeps them in
// x8-queue.json.
//
// A superadmin can also publish live: the ranking the plan builds goes to the
// Firestore document combos_plan/current (js/combos-live.js), and the site ranks
// with it from the next page load, with no commit. "Use shipped list" points the
// site back at the file. The download stays, so the file can be committed later.

import { allHeroesData, HERO_PORTRAIT_FALLBACK } from './heroes-data.js';
import { shippedRankedCombos } from './combos-db.js';
import { buildComboPlanOutput, buildComboSource, buildView, planFromEntries } from './combo-plan.js';
import {
  buildCombosPlanDoc,
  COMBOS_PLAN_DOC_PATH,
  combosHash,
  readCombosPlanDoc,
  shippedCombosHash,
  validateComboEntries,
} from './combos-live.js';
import { mountCombosPlanner } from './combos-planner-ui.js';

const SOURCE_URL = 'js/combos-db.js';
const DRAFT_KEY = 'vts_combos_draft_v1';

const HOW_TO = `
  <ul>
    <li>This is the same tool as the local planner (<code>npm run combos:plan</code>), pointed at the list that ships in <code>js/combos-db.js</code>.</li>
    <li><kbd>J</kbd> / <kbd>K</kbd> walk the queue, <kbd>Enter</kbd> accepts the suggested slot, <kbd>↑</kbd>/<kbd>↓</kbd> adjusts it, digits then <kbd>Enter</kbd> place above a rank, <kbd>Z</kbd> undoes. <b>Keys</b> lists them all; <b>Auto-draft all</b> places everything at its suggestion in one undoable step.</li>
    <li><b>Edit mode</b> renames a lineup's heroes or skin code, reorders a current lineup, and takes one out with a two-step ✕.</li>
    <li><b>Save</b> (<kbd>Ctrl</kbd>+<kbd>S</kbd>) lists the changed lines, then rebuilds <code>js/combos-db.js</code> and downloads it. Players keep the current list until that file is committed, which is the step that publishes a change.</li>
    <li>Unsaved work is kept as a draft in this browser and offered back when you return. Lineups you paste but do not place stay in the queue after Save.</li>
    <li><b>Skin code</b> is one digit per hero in Front / Middle / Back order: <b>3</b> you must own that hero's skin, <b>2</b> the skin is recommended, <b>1</b> it is optional.</li>
  </ul>`;

function readDraft() {
  try {
    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeDraft(lanes) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(lanes));
  } catch {
    /* private mode: the draft lives only for this session */
  }
}

/** Hands the rebuilt file to the admin: a download, plus the clipboard when allowed. */
function handOver(source) {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'combos-db.js';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    // Best effort: the download is the deliverable, the clipboard is a convenience.
    navigator.clipboard.writeText(source).catch(() => {});
  }
}

/** Renders the Combos tool into the provided mount point. */
export function renderCombos(mount) {
  if (!mount) return;
  let state = null;

  async function readSource() {
    const response = await fetch(SOURCE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('could not read ' + SOURCE_URL);
    return response.text();
  }

  function stateFor(source, draft) {
    const view = buildView({
      source,
      // The file as it ships, whatever the live ranking on this page is.
      combos: shippedRankedCombos,
      heroTable: allHeroesData,
      queueLanes: draft,
    });
    return {
      source,
      view,
      heroNames: new Set(Object.keys(view.heroes)),
      isX8Lane: view.isX8Lane,
    };
  }

  async function load() {
    state = stateFor(await readSource(), readDraft());
    return state.view;
  }

  async function save(plan) {
    if (!state) await load();
    const source = buildComboSource(state.parsed ?? state.view.parsed, plan, {
      heroNames: state.heroNames,
      isX8Lane: state.isX8Lane,
    });
    handOver(source);
    // Placed lineups are in the file now; the rest stay in the draft.
    const placed = new Set(plan.order.filter((entry) => entry.anchor).map((entry) => entry.id));
    const keep = (plan.added || []).filter((lane) => !placed.has(lane.id));
    writeDraft(keep);
    state = stateFor(source, keep);
    return state.view;
  }

  // --- Live publishing -------------------------------------------------------------
  async function firestoreContext() {
    if (typeof window.getVtsAdminFirestoreContext !== 'function')
      throw new Error('sign in to VTS Admin first');
    return window.getVtsAdminFirestoreContext();
  }
  async function isSuperAdmin() {
    try {
      const { user } = await firestoreContext();
      const token = await user?.getIdTokenResult?.();
      return token?.claims?.superadmin === true;
    } catch {
      return false;
    }
  }
  async function readLiveDoc() {
    const { db, firestore } = await firestoreContext();
    const snap = await firestore.getDoc(firestore.doc(db, COMBOS_PLAN_DOC_PATH));
    return snap.exists() ? snap.data() : null;
  }
  async function writeLiveDoc(body) {
    const { db, user, firestore } = await firestoreContext();
    const uid = String(user?.uid || '');
    if (!uid) throw new Error('sign in as a superadmin first');
    await firestore.setDoc(firestore.doc(db, COMBOS_PLAN_DOC_PATH), {
      ...body,
      updatedAt: firestore.serverTimestamp(),
      updatedBy: uid,
    });
    return uid;
  }
  const heroNamesOf = () => new Set(allHeroesData.map((hero) => hero.name));
  async function publishedEntries() {
    const decision = readCombosPlanDoc(await readLiveDoc(), heroNamesOf());
    return decision.use === 'published' ? decision.entries : null;
  }
  const whenOf = (value) => {
    const date = value && typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    return isNaN(date) ? 'at an unknown time' : date.toLocaleString();
  };

  const live = {
    async status() {
      const canPublish = await isSuperAdmin();
      let doc;
      try {
        doc = await readLiveDoc();
      } catch (error) {
        return { text: 'Live: unknown (' + error.message + ')', differs: false, canPublish };
      }
      const decision = readCombosPlanDoc(doc, heroNamesOf());
      if (decision.use !== 'published')
        return {
          text:
            'Live: shipped file' +
            (doc && !doc.useShipped ? ' (the published list was refused: ' + decision.reason + ')' : ''),
          differs: false,
          canPublish,
        };
      const me = (await firestoreContext().catch(() => ({})))?.user?.uid;
      const who = doc.updatedBy === me ? 'you' : String(doc.updatedBy || 'unknown').slice(0, 8) + '…';
      return {
        text: `Live: published ${whenOf(doc.updatedAt)} by ${who} (${decision.entries.length} lineups)`,
        differs: combosHash(decision.entries) !== shippedCombosHash(),
        canPublish,
      };
    },
    async publish(plan) {
      if (!state) await load();
      const { entries } = buildComboPlanOutput(state.view.parsed, plan, {
        heroNames: state.heroNames,
        isX8Lane: state.isX8Lane,
      });
      const checked = validateComboEntries(entries, heroNamesOf());
      if (!checked.ok) throw new Error(checked.error);
      await writeLiveDoc(buildCombosPlanDoc(checked.entries));
      return `Published ${checked.entries.length} lineups live: players rank with them from their next page load. Download combos-db.js and commit it to keep the history.`;
    },
    async useShipped() {
      await writeLiveDoc(buildCombosPlanDoc([], { useShipped: true }));
      return 'The site uses the shipped js/combos-db.js again from the next page load.';
    },
    async download() {
      if (!state) await load();
      const entries = await publishedEntries();
      if (!entries) return 'Nothing is published live.';
      const plan = planFromEntries(state.view, entries, {
        heroNames: state.heroNames,
        isX8Lane: state.isX8Lane,
      });
      handOver(buildComboSource(state.view.parsed, plan, {
        heroNames: state.heroNames,
        isX8Lane: state.isX8Lane,
      }));
      return 'Downloaded combos-db.js for the published list. Commit it to make the file match.';
    },
    published: publishedEntries,
  };

  mountCombosPlanner(mount, {
    live,
    load,
    save,
    saveLabel: 'Rebuild combos-db.js',
    guardUnload: false,
    storagePrefix: 'vtsCombosAdmin',
    // Relative to admin.html, so it resolves wherever the site is served from.
    portraitFallback: HERO_PORTRAIT_FALLBACK,
    idleHint: 'Showing the list that ships in js/combos-db.js.',
    loadedHint: 'Showing the list that ships in js/combos-db.js.',
    dirtyHint: 'Not saved yet. Press Save to rebuild js/combos-db.js.',
    savedHint:
      'Rebuilt js/combos-db.js and downloaded it. Commit that file to publish the change; players keep the current list until then.',
    loadingHint: 'Loading js/combos-db.js…',
    loadError: (error) => 'Could not read js/combos-db.js: ' + error.message,
    howToSummary: 'How this tab works',
    howToHtml: HOW_TO,
  });
}
