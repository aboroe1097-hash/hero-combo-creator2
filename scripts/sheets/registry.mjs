// The reference-sheet catalogue (plan §3).
//
// One registry drives everything downstream: the build, the embedded "Reference
// sheets" menus, the Downloads catalogue, the coverage manifest, and the tests.
// Nothing else may invent a sheet id, a filename or an ordering.
//
// A sheet is an individual document: one PDF, one 300 DPI PNG per page, and one
// thumbnail per page. A bundle is a combination of sheets: it has its own PDF and a
// contents page that lists its constituents. The 14 community PDF exports that
// predate this system are registered as legacy bundles, so their ids, filenames and
// URLs keep working exactly as before.

/**
 * Public, player-facing tools. Administrative, account, authentication and
 * maintenance surfaces are deliberately absent (plan §0), and `excluded` records
 * why, so the coverage check can prove the omission was a decision.
 */
export const TOOLS = Object.freeze([
  // Heroes and combos hub.
  { id: 'manual', label: 'Manual Combo Builder', category: 'Heroes & Combos', hash: 'manual' },
  { id: 'generator', label: 'Combo Generator', category: 'Heroes & Combos', hash: 'generator' },
  { id: 'codex', label: 'Hero Codex', category: 'Heroes & Combos', hash: 'codex' },
  { id: 'heroes', label: 'Hero Atlas', category: 'Heroes & Combos', hash: 'heroes' },
  { id: 'skins', label: 'Skin Atlas', category: 'Heroes & Combos', hash: 'skins' },
  // Research and towers hub.
  { id: 'research', label: 'Tech Research', category: 'Research & Towers', hash: 'research' },
  {
    id: 'towers',
    label: 'Specialization Towers',
    category: 'Research & Towers',
    hash: 'specialization',
  },
  { id: 'artifact', label: 'Artifacts', category: 'Research & Towers', hash: 'artifact' },
  // Standing tabs.
  { id: 'materials', label: 'Dragon Master Materials', category: 'Progression', hash: 'materials' },
  {
    id: 'buildings',
    label: 'Buildings & Castle Planner',
    category: 'Progression',
    hash: 'research',
  },
  {
    id: 'classDevelopment',
    label: 'Class Development Hub',
    category: 'Progression',
    hash: 'classDevelopment',
  },
  { id: 'strife', label: 'Strife Guide', category: 'Progression', hash: 'strife' },
  // Eden hub.
  { id: 'edenMap', label: 'Eden Map', category: 'Eden', hash: 'edenMap' },
  { id: 'edenLoyalty', label: 'Eden Loyalty', category: 'Eden', hash: 'edenMap' },
  { id: 'edenOperations', label: 'Eden Operations', category: 'Eden', hash: 'edenMap' },
  { id: 'edenBounty', label: 'Royal Bounty', category: 'Eden', hash: 'edenMap' },
  { id: 'edenPlaybook', label: 'Eden Playbook', category: 'Eden', hash: 'edenMap' },
  { id: 'edenSeason', label: 'Eden Season', category: 'Eden', hash: 'edenMap' },
  { id: 'edenPrevious', label: 'Eden Previous Seasons', category: 'Eden', hash: 'edenMap' },
  { id: 'edenX1', label: 'Eden X1 Dashboard', category: 'Eden', page: 'eden-x1.html' },
  { id: 'edenX2', label: 'Eden X2 Dashboard', category: 'Eden', page: 'eden-x2.html' },
  // Standalone tools.
  {
    id: 'battleSimulator',
    label: 'Battle Simulator',
    category: 'Tools',
    page: 'battle-simulator.html',
  },
  { id: 'velo', label: 'Talk with Velo', category: 'Tools', drawer: true },
  // Arcade, including each game.
  { id: 'arcade', label: 'Arcade', category: 'Arcade', page: 'arcade.html' },
  {
    id: 'arcade-merge_rush',
    label: 'Arcade · Merge Rush',
    category: 'Arcade',
    page: 'arcade.html',
  },
  {
    id: 'arcade-sort_hoard',
    label: 'Arcade · Sort Hoard',
    category: 'Arcade',
    page: 'arcade.html',
  },
  {
    id: 'arcade-crystal_relay',
    label: 'Arcade · Crystal Relay',
    category: 'Arcade',
    page: 'arcade.html',
  },
  {
    id: 'arcade-set_assembly',
    label: 'Arcade · Set Assembly',
    category: 'Arcade',
    page: 'arcade.html',
  },
  {
    id: 'arcade-hero_rumble',
    label: 'Arcade · Hero Rumble',
    category: 'Arcade',
    page: 'arcade.html',
  },
  // The downloads hub itself carries the printable index of every sheet.
  { id: 'downloads', label: 'Community Downloads', category: 'Reference', page: 'downloads.html' },
]);

/**
 * Surfaces that must NOT have a sheet, with the reason. The coverage check reads
 * this so "we forgot" and "we decided not to" are different states.
 */
export const EXCLUDED_SURFACES = Object.freeze([
  { id: 'admin', reason: 'Administrative surface (plan §0).' },
  { id: 'vtsscore', reason: 'Administrative scoring surface (plan §0).' },
  { id: 'profile', reason: 'Account and authentication surface (plan §0).' },
  { id: 'maintenance', reason: 'Maintenance page (plan §0).' },
  { id: 'player-records', reason: 'Private player and alliance records (plan §0).' },
]);

const SOURCE_WORKBOOK = 'Unit Specilization workbook (Ivan & CrazyDD / ΜΟΛΩΝ ΛΑΒΕ)';
const SOURCE_REPO = 'RoC VTS Toolkit canonical data';

/**
 * Sheets, in catalogue order. `order` is the single source of ordering; a gap is
 * intentional room for a related sheet to slot in without renumbering.
 *
 * `adapter` is `module#exportName` under scripts/sheets/adapters/, resolved and
 * called by the build with `adapterArgs`. An adapter selects and groups canonical
 * data and calls the toolkit's own calculation functions; the template only paints.
 */
export const SHEETS = Object.freeze([
  // ── Specialization Towers: one sheet per troop, plus the recorded extra towers.
  {
    id: 'specialization-archer',
    toolId: 'towers',
    title: 'Specialization — Archer',
    eyebrow: 'Unit Specialisation',
    category: 'Research & Towers',
    template: 'progression',
    orientation: 'portrait',
    order: 100,
    adapter: 'specialization#troopSheet',
    adapterArgs: { troop: 'archer' },
    sourceLabel: SOURCE_WORKBOOK,
    sourceRevision: '2026-09-23',
    sources: ['js/specialization-towers-v2-data.js', 'js/specialization-towers-medal-evidence.js'],
    art: 'specialization',
    artHeightMm: 24,
  },
  {
    id: 'specialization-cavalry',
    toolId: 'towers',
    title: 'Specialization — Cavalry',
    eyebrow: 'Unit Specialisation',
    category: 'Research & Towers',
    template: 'progression',
    orientation: 'portrait',
    order: 101,
    adapter: 'specialization#troopSheet',
    adapterArgs: { troop: 'cavalry' },
    sourceLabel: SOURCE_WORKBOOK,
    sourceRevision: '2026-09-23',
    sources: ['js/specialization-towers-v2-data.js', 'js/specialization-towers-medal-evidence.js'],
    art: 'specialization',
    artHeightMm: 24,
  },
  {
    id: 'specialization-footman',
    toolId: 'towers',
    title: 'Specialization — Footman',
    eyebrow: 'Unit Specialisation',
    category: 'Research & Towers',
    template: 'progression',
    orientation: 'portrait',
    order: 102,
    adapter: 'specialization#troopSheet',
    adapterArgs: { troop: 'footman' },
    sourceLabel: SOURCE_WORKBOOK,
    sourceRevision: '2026-09-23',
    sources: ['js/specialization-towers-v2-data.js', 'js/specialization-towers-medal-evidence.js'],
    art: 'specialization',
    artHeightMm: 24,
  },
  {
    id: 'specialization-extra-towers',
    toolId: 'towers',
    title: 'Specialization — Recorded Extra Towers',
    eyebrow: 'Unit Specialisation · beyond the current columns',
    category: 'Research & Towers',
    template: 'progression',
    orientation: 'portrait',
    order: 103,
    adapter: 'specialization#extraTowersSheet',
    sourceLabel: SOURCE_WORKBOOK,
    sourceRevision: '2026-09-23',
    sources: ['js/specialization-towers-v2-data.js', 'js/specialization-towers-medal-evidence.js'],
    art: 'specialization',
    artHeightMm: 24,
  },
  {
    id: 'specialization-medals-by-troop',
    toolId: 'towers',
    title: 'Specialization — Medal Totals by Troop',
    eyebrow: 'Unit Specialisation · totals',
    category: 'Research & Towers',
    template: 'comparison',
    orientation: 'landscape',
    order: 104,
    adapter: 'specialization#medalComparisonSheet',
    sourceLabel: SOURCE_WORKBOOK,
    sourceRevision: '2026-09-23',
    sources: ['js/specialization-towers-v2-data.js', 'js/specialization-towers-medal-evidence.js'],
    art: 'specialization',
    artHeightMm: 24,
  },

  // ── Heroes and combos.
  {
    id: 'hero-combos-top',
    toolId: 'generator',
    title: 'Top Combos and Counters',
    eyebrow: 'Combo Generator · ranked reference',
    category: 'Heroes & Combos',
    template: 'comparison',
    orientation: 'portrait',
    order: 200,
    adapter: 'combos#topCombosSheet',
    sourceLabel: 'Community combo rankings',
    sourceRevision: 'canonical dataset',
    sources: ['js/combos-db.js', 'js/counter-db.js'],
    art: 'combos',
    artHeightMm: 36,
  },
]);

/**
 * Bundles. `legacy` entries are the 14 community exports that shipped before this
 * system; the sheet build never touches their files, and the catalogue keeps
 * advertising them unchanged. `sheet` bundles combine registered sheets and list
 * their constituents on a contents page.
 */
export const BUNDLES = Object.freeze([
  {
    id: 'specialization-complete',
    kind: 'sheets',
    title: 'Specialization — Complete Set',
    category: 'Research & Towers',
    order: 100,
    // A bundle is one document, so it only combines sheets of one orientation. The
    // landscape comparison sheet is read on its own.
    sheetIds: [
      'specialization-archer',
      'specialization-cavalry',
      'specialization-footman',
      'specialization-extra-towers',
    ],
  },
]);

// The 14 exports that predate the sheet system. Kept as data so the catalogue can
// assert that a legacy entry still has an export registered.
export const LEGACY_EXPORT_IDS = Object.freeze([
  'research-costs',
  'unit-specialisation-medals',
  'specialisation-towers',
  'eden-honor-buildings',
  'eden-specialty-honor',
  'eden-siege-structures',
  'eden-tile-levels',
  'eden-map-structures',
  'dragon-master-enhancement',
  'dragon-master-crafting',
  'heroes-by-season',
  'skin-catalogue',
  'artifacts',
  'combos-and-counters',
]);

const TOOL_BY_ID = new Map(TOOLS.map((tool) => [tool.id, tool]));

export function toolById(id) {
  const tool = TOOL_BY_ID.get(id);
  if (!tool) throw new Error(`Unknown tool id in the sheet registry: ${id}`);
  return tool;
}

export function sheetUrl(tool, baseUrl = 'https://roc-vts.com') {
  if (tool.page) return `${baseUrl}/${tool.page}`;
  if (tool.hash) return `${baseUrl}/#${tool.hash}`;
  return baseUrl;
}

export function toolLabel(tool) {
  return tool.label;
}

export function sheetById(id) {
  const sheet = SHEETS.find((entry) => entry.id === id);
  if (!sheet) throw new Error(`Unknown sheet id: ${id}`);
  return sheet;
}

export function bundleById(id) {
  const bundle = BUNDLES.find((entry) => entry.id === id);
  if (!bundle) throw new Error(`Unknown bundle id: ${id}`);
  return bundle;
}

/** Sheets in catalogue order. */
export function orderedSheets() {
  return SHEETS.slice().sort((a, b) => a.order - b.order);
}

export function sheetsForTool(toolIdValue) {
  return orderedSheets().filter((sheet) => sheet.toolId === toolIdValue);
}

/** The name of every artifact a sheet publishes, derived from its id. */
export function sheetArtifacts(sheet, pageCount) {
  const names = {
    pdf: `${sheet.id}.pdf`,
    pngs: [],
    thumbnails: [],
  };
  for (let index = 1; index <= pageCount; index += 1) {
    names.pngs.push(`${sheet.id}-p${index}.png`);
    names.thumbnails.push(`${sheet.id}-p${index}-thumb.png`);
  }
  return names;
}
