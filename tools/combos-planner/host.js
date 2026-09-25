// tools/combos-planner/host.js
//
// The local host of the Combos planner. It mounts the shared interface
// (js/combos-planner-ui.js) against the loopback server in
// scripts/combos-planner-server.mjs: the server reads js/combos-db.js and the two
// queue files, and writes js/combos-db.js back when the interface saves.
//
// Run with: npm run combos:plan  ->  http://127.0.0.1:5396/

import { mountCombosPlanner } from '/combos-planner-ui.js';

const HOW_TO = `
  <ul>
    <li>Drag a lineup onto a gap, or press <b>Place</b> and then <b>Place here</b>.</li>
    <li><b>▲▼</b> nudges one row; <b>Unplace</b> sends it to the end of the list, where it waits rather than shipping.</li>
    <li>While placing, the banner names the lineups that already share heroes with yours, and <b>Place above #</b> drops it at a rank without scrolling.</li>
    <li>Keyboard: <kbd>Enter</kbd> on a lineup starts placing, <kbd>↑</kbd>/<kbd>↓</kbd> on a placed row nudges it, <kbd>Esc</kbd> cancels.</li>
    <li><b>Skin code</b> is one digit per hero in Front / Middle / Back order: <b>3</b> you must own that hero's skin, <b>2</b> the skin is recommended, <b>1</b> it is optional. Empty means no skins needed.</li>
    <li>Gold names are the X8 heroes and a <span class="kind paid">Paid</span> badge marks a lineup that needs one. Lineups to rank and add go in <code>tools/combos-planner/x8-queue.js</code>; the Add form keeps its own list in <code>x8-queue.json</code>.</li>
    <li>The tier and score are the ROC Academy source ranking; they only order the X8 list, so in-game scoring can still change.</li>
  </ul>`;

/** Reads the planner view from the loopback server. */
async function load() {
  const response = await fetch('/api/combos', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'load failed');
  return data;
}

/** Posts the plan; the server rebuilds js/combos-db.js and answers with the new view. */
async function save(plan) {
  const response = await fetch('/api/combos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(plan),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'save failed');
  return data;
}

const root = document.getElementById('combos-root');
try {
  mountCombosPlanner(root, {
    load,
    save,
    saveLabel: 'Save to combos-db.js',
    idleHint: 'Loaded js/combos-db.js.',
    dirtyHint: 'Not saved yet. Press Save to write js/combos-db.js.',
    savedHint:
      'Saved js/combos-db.js and x8-queue.json. Check them with git diff, then commit and push.',
    loadingHint: 'Loading js/combos-db.js…',
    loadError: (error) =>
      'Could not load the combo database: ' +
      error.message +
      '. Is npm run combos:plan still running?',
    removeHint: 'Press Remove? again to take that lineup out of js/combos-db.js.',
    howToSummary: 'How placing works',
    howToHtml: HOW_TO,
    storagePrefix: 'combosPlanner',
    guardUnload: true,
  });
} catch (error) {
  // A half-rendered tool is worse than a clear message: say what failed.
  root.textContent = 'The planner failed to start: ' + error.message;
  throw error;
}
