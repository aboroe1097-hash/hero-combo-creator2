// js/admin-combos.js
// The VTS Admin host of the Combos planner (Beta). It mounts the same interface the
// local tool runs — js/combos-planner-ui.js — against the database that ships with
// the site, so an admin gets the identical tool: filters, the overlap answer while
// placing, edit mode, and removal.
//
// Save cannot change a deployed file from the browser, so it rebuilds
// js/combos-db.js in place (exactly the text the local planner would write, because
// both run js/combo-plan.js) and hands that file over for download and the
// clipboard. Committing it is what publishes the change to players. Lineups added
// in the tab that were not placed stay in a local draft, the way the local tool
// keeps them in x8-queue.json.

import { allHeroesData } from './heroes-data.js';
import { rankedCombos } from './combos-db.js';
import { buildComboSource, buildView } from './combo-plan.js';
import { mountCombosPlanner } from './combos-planner-ui.js';

const SOURCE_URL = 'js/combos-db.js';
const DRAFT_KEY = 'vts_combos_draft_v1';

const HOW_TO = `
  <ul>
    <li>This is the same tool as the local planner (<code>npm run combos:plan</code>), pointed at the list that ships in <code>js/combos-db.js</code>.</li>
    <li>Drag a lineup onto a gap, or press <b>Place</b> and then <b>Place here</b>; while placing, the banner and the rows name the lineups that already share heroes with yours.</li>
    <li><b>Edit mode</b> renames a lineup's heroes or skin code, reorders a current lineup, and takes one out with a two-step ✕.</li>
    <li><b>Save</b> rebuilds <code>js/combos-db.js</code> and downloads it. Players keep the current list until that file is committed, which is the step that publishes a change.</li>
    <li>Lineups you add but do not place stay in this browser as a draft, and are listed again next time you open the tab.</li>
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
      combos: rankedCombos,
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

  mountCombosPlanner(mount, {
    load,
    save,
    saveLabel: 'Rebuild combos-db.js',
    guardUnload: false,
    storagePrefix: 'vtsCombosAdmin',
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
