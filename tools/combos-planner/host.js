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
    <li><kbd>J</kbd> / <kbd>K</kbd> walk the queue; the ranking follows with the rows around the suggested slot, and rows sharing two heroes are tinted. <kbd>Enter</kbd> accepts the suggestion, <kbd>↑</kbd>/<kbd>↓</kbd> (with <kbd>Shift</kbd>: ten rows) adjusts it, digits then <kbd>Enter</kbd> place above that rank, <kbd>U</kbd> unplaces, <kbd>Z</kbd> undoes. <b>Keys</b> lists them all.</li>
    <li>A suggestion comes from the current lineup that shares two heroes (the X8 hero in the replaced hero's slot), shifted the way you placed the same swap before, and below a run of paid lineups when the new one is free. With no such lineup, the ROC Academy tier maps to where you placed that tier; otherwise it waits.</li>
    <li><b>Auto-draft all</b> places every lineup at its suggestion as one undoable step, so you only fix the wrong ones. Shift/Ctrl-click selects several queued lineups to place as one block.</li>
    <li><b>Save</b> (<kbd>Ctrl</kbd>+<kbd>S</kbd>) first lists every line of <code>js/combos-db.js</code> it changes. Unsaved work is kept as a draft in this browser and offered back next time.</li>
    <li><b>Paste lineups</b> reads lines like <code>Lawman / Bjorn / The Avalanche</code> or <code>Lawman, Bjorn, Avalanche 222</code>; lineups also come from <code>tools/combos-planner/x8-queue.js</code>, and unplaced pasted ones are kept in <code>x8-queue.json</code> on Save.</li>
    <li><b>Skin code</b> is one digit per hero in Front / Middle / Back order: <b>3</b> you must own that hero's skin, <b>2</b> the skin is recommended, <b>1</b> it is optional. The brush mark's tooltip spells it out.</li>
    <li>Gold names are the X8 heroes, a filled dot marks a lineup with a paid hero, and the left stripe is the troop. The tier is the ROC Academy source ranking; it only orders the queue.</li>
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
