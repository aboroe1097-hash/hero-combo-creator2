// Eden Map Structure Coordinates — base layout (Classic ~2023 reference)
import { loadEdenDatasetStore } from './eden-datasets-loader.js';

const EDEN_DATASET_STORAGE_KEY = 'vts_eden_dataset';
const DEFAULT_EDEN_DATASET_ID = 'season5';
const LEGACY_DATASET_IDS = { classic: 'season3', wonders: 'season5' };

let datasetStore = null;
let datasetLoadPromise = null;

export async function ensureEdenDatasetsLoaded() {
  if (datasetStore) return datasetStore;
  if (!datasetLoadPromise) {
    datasetLoadPromise = loadEdenDatasetStore().then((store) => {
      datasetStore = store;
      return store;
    });
  }
  return datasetLoadPromise;
}

function getCatalog() {
  return datasetStore?.catalog ?? [];
}

export function getEdenDatasetCatalog() {
  return getCatalog();
}

export function getDefaultEdenDatasetId() {
  const catalog = getCatalog();
  return catalog.some(d => d.id === DEFAULT_EDEN_DATASET_ID)
    ? DEFAULT_EDEN_DATASET_ID
    : (catalog[0]?.id || DEFAULT_EDEN_DATASET_ID);
}
export const TEMPLE_TYPES = new Set(['AT', 'WCB', 'WC8']);
/** In-game overview zoom: capitals, strongholds, and temple only. */
export const OVERVIEW_STRUCTURE_TYPES = new Set(['C5', 'C6', 'CS', 'STRHD', 'AT', 'WCB', 'WC8']);
let activeDatasetId = null;
let activeSectors = null;

// In-game names per Rise of Castles Eden occupation guide (Gates, Towns, Capitals, Temple).
export const STRUCTURE_TYPES = {
  CP1:  { label: 'Gate Lv1',           short: 'G1', category: 'gate',       points: 5,   color: '#94a3b8', size: 8  },
  CP2:  { label: 'Gate Lv2',           short: 'G2', category: 'gate',       points: 5,   color: '#a8b4c4', size: 8  },
  CP3:  { label: 'Gate Lv3',           short: 'G3', category: 'gate',       points: 5,   color: '#7dd3fc', size: 8  },
  CP4:  { label: 'Gate Lv4',           short: 'G4', category: 'gate',       points: 5,   color: '#38bdf8', size: 8  },
  CP5:  { label: 'Gate Lv5',           short: 'G5', category: 'gate',       points: 5,   color: '#0ea5e9', size: 8  },
  CP7:  { label: 'Gate Lv7',           short: 'G7', category: 'gate',       points: 5,   color: '#0284c7', size: 8  },
  ST1:  { label: 'Small Town Lv1',     short: 'ST1', category: 'town',      points: 15,  color: '#4ade80', size: 7  },
  ST3:  { label: 'Small Town Lv3',     short: 'ST3', category: 'town',      points: 20,  color: '#16a34a', size: 7  },
  ST2:  { label: 'Small Town Lv2',     short: 'ST2', category: 'town',      points: 20,  color: '#22c55e', size: 7  },
  LT3:  { label: 'Large Town Lv3',     short: 'LT3', category: 'town',      points: 30,  color: '#3b82f6', size: 7  },
  LT2:  { label: 'Large Town Lv2',     short: 'LT2', category: 'town',      points: 30,  color: '#2563eb', size: 7  },
  LT4:  { label: 'Large Town Lv4',     short: 'LT4', category: 'town',      points: 50,  color: '#6366f1', size: 7  },
  STRHD:{ label: 'Stronghold',         short: 'SH', category: 'stronghold', points: 10,  color: '#f59e0b', size: 9  },
  C5:   { label: 'Capital Lv5',        short: 'C5', category: 'capital',   points: 70,  color: '#f59e0b', size: 13 },
  C6:   { label: 'Capital Lv6',        short: 'C6', category: 'capital',   points: 100, color: '#ef4444', size: 14 },
  CS:   { label: 'Stronghold',         short: 'SH', category: 'stronghold', points: 70,  color: '#f59e0b', size: 10 },
  AT:   { label: 'Ancient Temple',     short: 'AT', category: 'temple',    points: 600, color: '#ec4899', size: 12 },
  WCB:  { label: 'Wonder Capital',     short: 'WCB', category: 'temple',   points: 600, color: '#d946ef', size: 12 },
  WC8:  { label: 'Wonder Capital Lv8', short: 'WC8', category: 'temple',   points: 600, color: '#c026d3', size: 12 },
};

export function getStructurePoints(s) {
  if (s?.points != null && s.points !== '') return Number(s.points) || 0;
  return STRUCTURE_TYPES[s?.type]?.points || 0;
}

export function getStructureLabel(type) {
  return STRUCTURE_TYPES[type]?.label || type;
}

export function getStructureShort(type) {
  return STRUCTURE_TYPES[type]?.short || type;
}

const EDEN_SECTORS_BASE = {

  // ─── CENTRAL (C) ───────────────────────────────────────────────────────────
  C: {
    label: 'Central Sector',
    zones: ['C'],
    bounds: { minX: 750, maxX: 950, minY: 750, maxY: 950 },
    zoneCenters: { C: { x: 800, y: 800 } },
    structures: [
      { id: 'c-at-1',   zone: 'C', type: 'AT',  x: 800, y: 800, guild: '' },
      { id: 'c-cp1-1',  zone: 'C', type: 'CP1', x: 848, y: 883, guild: '' },
      { id: 'c-cp1-2',  zone: 'C', type: 'CP1', x: 691, y: 880, guild: '' },
      { id: 'c-cp1-3',  zone: 'C', type: 'CP1', x: 711, y: 780, guild: '' },
      { id: 'c-cp1-4',  zone: 'C', type: 'CP1', x: 688, y: 716, guild: '' },
      { id: 'c-cp1-5',  zone: 'C', type: 'CP1', x: 770, y: 686, guild: '' },
      { id: 'c-cp1-6',  zone: 'C', type: 'CP1', x: 843, y: 565, guild: '' },
      { id: 'c-cp1-7',  zone: 'C', type: 'CP1', x: 893, y: 762, guild: '' },
      { id: 'c-cp1-8',  zone: 'C', type: 'CP1', x: 928, y: 826, guild: '' },
    ],
  },

  // ─── NORTH CENTRAL (NC) ───────────────────────────────────────────────────
  NC: {
    label: 'North Central Sector',
    zones: ['NC1', 'NC2', 'NC3', 'NC4'],
    bounds: { minX: 440, maxX: 860, minY: 490, maxY: 780 },
    zoneCenters: {
      NC1: { x: 530, y: 640 },
      NC2: { x: 640, y: 530 },
      NC3: { x: 760, y: 560 },
      NC4: { x: 660, y: 650 },
    },
    structures: [
      // NC1
      { id: 'nc1-st2-1',  zone: 'NC1', type: 'ST2', x: 528, y: 594, guild: '' },
      { id: 'nc1-st2-2',  zone: 'NC1', type: 'ST2', x: 480, y: 673, guild: '' },
      { id: 'nc1-lt4-1',  zone: 'NC1', type: 'LT4', x: 551, y: 660, guild: '' },
      { id: 'nc1-cp1-1',  zone: 'NC1', type: 'CP1', x: 564, y: 690, guild: '' },
      { id: 'nc1-cp1-2',  zone: 'NC1', type: 'CP1', x: 561, y: 649, guild: '' },
      { id: 'nc1-cp2-1',  zone: 'NC1,4', type: 'CP2', x: 573, y: 638, guild: '' },
      { id: 'nc1-cp1-3',  zone: 'NC1', type: 'CP1', x: 561, y: 649, guild: '' },
      { id: 'nc1-cp1-4',  zone: 'NC1', type: 'CP1', x: 513, y: 633, guild: '' },
      { id: 'nc1-cp2-2',  zone: 'NC1,2', type: 'CP2', x: 539, y: 543, guild: '' },
      // NC2
      { id: 'nc2-lt4-1',  zone: 'NC2', type: 'LT4', x: 602, y: 528, guild: '' },
      { id: 'nc2-st2-1',  zone: 'NC2', type: 'ST2', x: 666, y: 517, guild: '' },
      { id: 'nc2-st2-2',  zone: 'NC2', type: 'ST2', x: 728, y: 501, guild: '' },
      { id: 'nc2-cp1-1',  zone: 'NC2', type: 'CP1', x: 587, y: 549, guild: '' },
      { id: 'nc2-cp2-1',  zone: 'NC2,4', type: 'CP2', x: 670, y: 547, guild: '' },
      { id: 'nc2-cp2-2',  zone: 'NC2,3', type: 'CP2', x: 776, y: 504, guild: '' },
      // NC3
      { id: 'nc3-st2-1',  zone: 'NC3', type: 'ST2', x: 815, y: 513, guild: '' },
      { id: 'nc3-lt4-1',  zone: 'NC3', type: 'LT4', x: 787, y: 572, guild: '' },
      { id: 'nc3-cp1-1',  zone: 'NC3', type: 'CP1', x: 833, y: 545, guild: '' },
      { id: 'nc3-cp2-1',  zone: 'NC3,4', type: 'CP2', x: 768, y: 619, guild: '' },
      // NC4
      { id: 'nc4-st2-1',  zone: 'NC4', type: 'ST2', x: 624, y: 657, guild: '' },
      { id: 'nc4-c6-1',   zone: 'NC4', type: 'C6',  x: 613, y: 605, guild: '' },
      { id: 'nc4-st2-2',  zone: 'NC4', type: 'ST2', x: 674, y: 583, guild: '' },
      { id: 'nc4-cp1-1',  zone: 'NC4', type: 'CP1', x: 701, y: 608, guild: '' },
      { id: 'nc4-cp5-1',  zone: 'NC4,C', type: 'CP5', x: 709, y: 647, guild: '' },
      { id: 'nc4-cp1-2',  zone: 'NC4', type: 'CP1', x: 670, y: 648, guild: '' },
      { id: 'nc4-cp1-3',  zone: 'NC4', type: 'CP1', x: 655, y: 603, guild: '' },
    ],
  },

  // ─── NORTH EAST (NE) ──────────────────────────────────────────────────────
  NE: {
    label: 'North East Sector',
    zones: ['NE1', 'NE2', 'NE3', 'NE4', 'NE5', 'NE6'],
    bounds: { minX: 900, maxX: 1430, minY: 60, maxY: 420 },
    zoneCenters: {
      NE1: { x: 1000, y: 150 },
      NE2: { x: 1150, y: 120 },
      NE3: { x: 1200, y: 300 },
      NE4: { x: 970,  y: 330 },
      NE5: { x: 1100, y: 200 },
      NE6: { x: 1280, y: 200 },
    },
    structures: [
      // NE1
      { id: 'ne1-st1-1',  zone: 'NE1', type: 'ST1', x: 956,  y: 80,  guild: '' },
      { id: 'ne1-lt3-1',  zone: 'NE1', type: 'LT3', x: 1090, y: 91,  guild: '' },
      { id: 'ne1-st1-2',  zone: 'NE1', type: 'ST1', x: 1360, y: 108, guild: '' },
      { id: 'ne1-st1-3',  zone: 'NE1', type: 'ST1', x: 1227, y: 70,  guild: '' },
      { id: 'ne1-cp2-1',  zone: 'NE1', type: 'CP2', x: 990,  y: 134, guild: '' },
      { id: 'ne1-cp2-2',  zone: 'NE1,5', type: 'CP2', x: 1126, y: 61, guild: '' },
      { id: 'ne1-cp2-3',  zone: 'NE1,6', type: 'CP2', x: 1364, y: 167, guild: '' },
      { id: 'ne1-cp2-4',  zone: 'NE1,2', type: 'CP2', x: 1130, y: 105, guild: '' },
      { id: 'ne1-cp2-5',  zone: 'NE1,6', type: 'CP2', x: 1364, y: 167, guild: '' },
      // NE2
      { id: 'ne2-st1-1',  zone: 'NE2', type: 'ST1', x: 1488, y: 70,  guild: '' },
      { id: 'ne2-lt3-1',  zone: 'NE2', type: 'LT3', x: 1334, y: 325, guild: '' },
      { id: 'ne2-st1-2',  zone: 'NE2', type: 'ST1', x: 1482, y: 277, guild: '' },
      { id: 'ne2-cp1-1',  zone: 'NE2', type: 'CP1', x: 1436, y: 61,  guild: '' },
      { id: 'ne2-cp1-2',  zone: 'NE2', type: 'CP1', x: 1529, y: 182, guild: '' },
      { id: 'ne2-cp1-3',  zone: 'NE2', type: 'CP1', x: 1518, y: 285, guild: '' },
      { id: 'ne2-cp1-4',  zone: 'NE2', type: 'CP1', x: 1469, y: 320, guild: '' },
      { id: 'ne2-cp2-1',  zone: 'NE2,6', type: 'CP2', x: 1422, y: 250, guild: '' },
      // NE3
      { id: 'ne3-st1-1',  zone: 'NE3', type: 'ST1', x: 1163, y: 436, guild: '' },
      { id: 'ne3-lt3-1',  zone: 'NE3', type: 'LT3', x: 1166, y: 345, guild: '' },
      { id: 'ne3-lt3-2',  zone: 'NE3', type: 'LT3', x: 1107, y: 354, guild: '' },
      { id: 'ne3-st1-2',  zone: 'NE3', type: 'ST1', x: 1288, y: 363, guild: '' },
      { id: 'ne3-cp1-1',  zone: 'NE3', type: 'CP1', x: 1311, y: 419, guild: '' },
      { id: 'ne3-cp1-2',  zone: 'NE3', type: 'CP1', x: 1254, y: 313, guild: '' },
      { id: 'ne3-cp1-3',  zone: 'NE3', type: 'CP1', x: 1214, y: 375, guild: '' },
      { id: 'ne3-cp1-4',  zone: 'NE3', type: 'CP1', x: 1134, y: 395, guild: '' },
      { id: 'ne3-cp2-1',  zone: 'NE3,5', type: 'CP2', x: 1162, y: 299, guild: '' },
      { id: 'ne3-cp2-2',  zone: 'NE3,5', type: 'CP2', x: 1075, y: 375, guild: '' },
      // NE4
      { id: 'ne4-lt3-1',  zone: 'NE4', type: 'LT3', x: 1010, y: 398, guild: '' },
      { id: 'ne4-st1-1',  zone: 'NE4', type: 'ST1', x: 920,  y: 365, guild: '' },
      { id: 'ne4-st1-2',  zone: 'NE4', type: 'ST1', x: 948,  y: 415, guild: '' },
      { id: 'ne4-cp1-1',  zone: 'NE4', type: 'CP1', x: 966,  y: 371, guild: '' },
      { id: 'ne4-cp1-2',  zone: 'NE4', type: 'CP1', x: 937,  y: 348, guild: '' },
      { id: 'ne4-cp1-3',  zone: 'NE4', type: 'CP1', x: 925,  y: 319, guild: '' },
      { id: 'ne4-cp1-4',  zone: 'NE4', type: 'CP1', x: 900,  y: 375, guild: '' },
      { id: 'ne4-cp4-1',  zone: 'NE4,NC3', type: 'CP4', x: 868, y: 522, guild: '' },
      // NE5
      { id: 'ne5-lt3-1',  zone: 'NE5', type: 'LT3', x: 1064, y: 190, guild: '' },
      { id: 'ne5-st1-1',  zone: 'NE5', type: 'ST1', x: 1092, y: 274, guild: '' },
      { id: 'ne5-st1-2',  zone: 'NE5', type: 'ST1', x: 937,  y: 320, guild: '' },
      { id: 'ne5-cp1-1',  zone: 'NE5', type: 'CP1', x: 1051, y: 255, guild: '' },
      { id: 'ne5-cp1-2',  zone: 'NE5', type: 'CP1', x: 1004, y: 212, guild: '' },
      { id: 'ne5-cp1-3',  zone: 'NE5', type: 'CP1', x: 1142, y: 214, guild: '' },
      { id: 'ne5-cp1-4',  zone: 'NE5', type: 'CP1', x: 1160, y: 250, guild: '' },
      { id: 'ne5-cp2-1',  zone: 'NE5,6', type: 'CP2', x: 1212, y: 239, guild: '' },
      // NE6
      { id: 'ne6-cs-1',   zone: 'NE6', type: 'CS',  x: 1237, y: 149, guild: '' },
      { id: 'ne6-st1-1',  zone: 'NE6', type: 'ST1', x: 1338, y: 214, guild: '' },
      { id: 'ne6-st1-2',  zone: 'NE6', type: 'ST1', x: 1162, y: 163, guild: '' },
      { id: 'ne6-cp1-1',  zone: 'NE6', type: 'CP1', x: 1300, y: 207, guild: '' },
      { id: 'ne6-cp1-2',  zone: 'NE6', type: 'CP1', x: 1265, y: 258, guild: '' },
    ],
  },

  // ─── NORTH (N) ────────────────────────────────────────────────────────────
  N: {
    label: 'North Sector',
    zones: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'],
    bounds: { minX: 340, maxX: 920, minY: 60, maxY: 480 },
    zoneCenters: {
      N1: { x: 430, y: 150 },
      N2: { x: 570, y: 120 },
      N3: { x: 720, y: 200 },
      N4: { x: 830, y: 290 },
      N5: { x: 500, y: 300 },
      N6: { x: 450, y: 400 },
    },
    structures: [
      // N1
      { id: 'n1-lt3-1',  zone: 'N1', type: 'LT3', x: 352,  y: 119, guild: '' },
      { id: 'n1-st1-1',  zone: 'N1', type: 'ST1', x: 447,  y: 55,  guild: '' },
      { id: 'n1-st1-2',  zone: 'N1', type: 'ST1', x: 237,  y: 60,  guild: '' },
      { id: 'n1-st1-3',  zone: 'N1', type: 'ST1', x: 299,  y: 141, guild: '' },
      { id: 'n1-cp1-1',  zone: 'N1', type: 'CP1', x: 324,  y: 111, guild: '' },
      { id: 'n1-cp2-1',  zone: 'N1,6', type: 'CP2', x: 370, y: 145, guild: '' },
      { id: 'n1-cp2-2',  zone: 'N1,2', type: 'CP2', x: 505, y: 46,  guild: '' },
      // N2
      { id: 'n2-lt3-1',  zone: 'N2', type: 'LT3', x: 768,  y: 72,  guild: '' },
      { id: 'n2-st1-1',  zone: 'N2', type: 'ST1', x: 682,  y: 99,  guild: '' },
      { id: 'n2-st1-2',  zone: 'N2', type: 'ST1', x: 808,  y: 76,  guild: '' },
      { id: 'n2-st1-3',  zone: 'N2', type: 'ST1', x: 241,  y: 880, guild: '' },
      { id: 'n2-cp1-1',  zone: 'N2', type: 'CP1', x: 838,  y: 51,  guild: '' },
      { id: 'n2-cp2-1',  zone: 'N2,6', type: 'CP2', x: 576, y: 108, guild: '' },
      { id: 'n2-cp3-1',  zone: 'N2,NE5', type: 'CP3', x: 905, y: 130, guild: '' },
      { id: 'n2-cp2-2',  zone: 'N2,3', type: 'CP2', x: 661, y: 178, guild: '' },
      // N3
      { id: 'n3-st1-1',  zone: 'N3', type: 'ST1', x: 615,  y: 285, guild: '' },
      { id: 'n3-st1-2',  zone: 'N3', type: 'ST1', x: 749,  y: 200, guild: '' },
      { id: 'n3-st1-3',  zone: 'N3', type: 'ST1', x: 671,  y: 199, guild: '' },
      { id: 'n3-lt3-1',  zone: 'N3', type: 'LT3', x: 832,  y: 166, guild: '' },
      { id: 'n3-cp1-1',  zone: 'N3', type: 'CP1', x: 748,  y: 285, guild: '' },
      { id: 'n3-cp2-1',  zone: 'N3,4', type: 'CP2', x: 750, y: 325, guild: '' },
      { id: 'n3-cp2-2',  zone: 'N3,6', type: 'CP2', x: 673, y: 291, guild: '' },
      // N4
      { id: 'n4-st1-1',  zone: 'N4', type: 'ST1', x: 804,  y: 448, guild: '' },
      { id: 'n4-st1-2',  zone: 'N4', type: 'ST1', x: 707,  y: 332, guild: '' },
      { id: 'n4-lt3-1',  zone: 'N4', type: 'LT3', x: 763,  y: 415, guild: '' },
      { id: 'n4-cp1-1',  zone: 'N4', type: 'CP1', x: 809,  y: 402, guild: '' },
      { id: 'n4-cp3-1',  zone: 'N4,NE4', type: 'CP3', x: 869, y: 395, guild: '' },
      { id: 'n4-cp2-1',  zone: 'N4,5', type: 'CP2', x: 696, y: 406, guild: '' },
      { id: 'n4-cp4-1',  zone: 'N4,NC3', type: 'CP4', x: 858, y: 493, guild: '' },
      // N5
      { id: 'n5-st1-1',  zone: 'N5', type: 'ST1', x: 448,  y: 315, guild: '' },
      { id: 'n5-st1-2',  zone: 'N5', type: 'ST1', x: 568,  y: 401, guild: '' },
      { id: 'n5-lt3-1',  zone: 'N5', type: 'LT3', x: 499,  y: 272, guild: '' },
      { id: 'n5-lt3-2',  zone: 'N5', type: 'LT3', x: 499,  y: 272, guild: '' },
      { id: 'n5-cp1-1',  zone: 'N5', type: 'CP1', x: 535,  y: 330, guild: '' },
      { id: 'n5-cp1-2',  zone: 'N5', type: 'CP1', x: 396,  y: 335, guild: '' },
      { id: 'n5-cp4-1',  zone: 'N5,NC2', type: 'CP4', x: 422, y: 694, guild: '' },
      // N6
      { id: 'n6-st1-1',  zone: 'N6', type: 'ST1', x: 434,  y: 112, guild: '' },
      { id: 'n6-st1-2',  zone: 'N6', type: 'ST1', x: 456,  y: 180, guild: '' },
      { id: 'n6-cs-1',   zone: 'N6', type: 'CS',  x: 570,  y: 211, guild: '' },
      { id: 'n6-cp1-1',  zone: 'N6', type: 'CP1', x: 381,  y: 238, guild: '' },
      { id: 'n6-cp1-2',  zone: 'N6', type: 'CP1', x: 452,  y: 192, guild: '' },
      { id: 'n6-cp1-3',  zone: 'N6', type: 'CP1', x: 622,  y: 261, guild: '' },
      { id: 'n6-cp1-4',  zone: 'N6', type: 'CP1', x: 643,  y: 199, guild: '' },
    ],
  },

  // ─── NORTH WEST (NW) ──────────────────────────────────────────────────────
  NW: {
    label: 'North West Sector',
    zones: ['NW1', 'NW2', 'NW3', 'NW4', 'NW5', 'NW6'],
    bounds: { minX: 20, maxX: 520, minY: 220, maxY: 640 },
    zoneCenters: {
      NW1: { x: 130, y: 340 },
      NW2: { x: 140, y: 230 },
      NW3: { x: 290, y: 280 },
      NW4: { x: 430, y: 480 },
      NW5: { x: 360, y: 600 },
      NW6: { x: 220, y: 440 },
    },
    structures: [
      // NW1
      { id: 'nw1-st1-1',  zone: 'NW1', type: 'ST1', x: 103,  y: 335, guild: '' },
      { id: 'nw1-st1-2',  zone: 'NW1', type: 'ST1', x: 65,   y: 404, guild: '' },
      { id: 'nw1-st1-3',  zone: 'NW1', type: 'ST1', x: 70,   y: 472, guild: '' },
      { id: 'nw1-lt3-1',  zone: 'NW1', type: 'LT3', x: 196,  y: 376, guild: '' },
      { id: 'nw1-cp2-1',  zone: 'NW1,6', type: 'CP2', x: 115, y: 434, guild: '' },
      { id: 'nw1-cp1-1',  zone: 'NW1', type: 'CP1', x: 59,   y: 366, guild: '' },
      { id: 'nw1-cp1-2',  zone: 'NW1', type: 'CP1', x: 80,   y: 308, guild: '' },
      { id: 'nw1-cp2-2',  zone: 'NW1,2', type: 'CP2', x: 35,  y: 279, guild: '' },
      // NW2
      { id: 'nw2-lt3-1',  zone: 'NW2', type: 'LT3', x: 157,  y: 229, guild: '' },
      { id: 'nw2-st1-1',  zone: 'NW2', type: 'ST1', x: 64,   y: 245, guild: '' },
      { id: 'nw2-st1-2',  zone: 'NW2', type: 'ST1', x: 133,  y: 284, guild: '' },
      { id: 'nw2-st1-3',  zone: 'NW2', type: 'ST1', x: 141,  y: 140, guild: '' },
      { id: 'nw2-cp2-1',  zone: 'NW2,3', type: 'CP2', x: 233, y: 246, guild: '' },
      { id: 'nw2-cp1-1',  zone: 'NW2', type: 'CP1', x: 207,  y: 183, guild: '' },
      { id: 'nw2-cp2-2',  zone: 'NW2,N', type: 'CP2', x: 176, y: 98,  guild: '' },
      { id: 'nw2-cp3-1',  zone: 'NW2', type: 'CP3', x: 175,  y: 56,  guild: '' },
      // NW3
      { id: 'nw3-st1-1',  zone: 'NW3', type: 'ST1', x: 321,  y: 270, guild: '' },
      { id: 'nw3-lt3-1',  zone: 'NW3', type: 'LT3', x: 239,  y: 211, guild: '' },
      { id: 'nw3-st1-2',  zone: 'NW3', type: 'ST1', x: 270,  y: 304, guild: '' },
      { id: 'nw3-cp1-1',  zone: 'NW3', type: 'CP1', x: 270,  y: 253, guild: '' },
      { id: 'nw3-cp2-1',  zone: 'NW3,6', type: 'CP2', x: 263, y: 337, guild: '' },
      { id: 'nw3-cp1-2',  zone: 'NW3', type: 'CP1', x: 287,  y: 325, guild: '' },
      { id: 'nw3-cp2-2',  zone: 'NW3,4', type: 'CP2', x: 297, y: 342, guild: '' },
      { id: 'nw3-cp3-1',  zone: 'NW3,NS', type: 'CP3', x: 360, y: 291, guild: '' },
      // NW4
      { id: 'nw4-st1-1',  zone: 'NW4', type: 'ST1', x: 467,  y: 503, guild: '' },
      { id: 'nw4-st1-2',  zone: 'NW4', type: 'ST1', x: 354,  y: 351, guild: '' },
      { id: 'nw4-st1-3',  zone: 'NW4', type: 'ST1', x: 422,  y: 534, guild: '' },
      { id: 'nw4-lt3-1',  zone: 'NW4', type: 'LT3', x: 391,  y: 418, guild: '' },
      { id: 'nw4-cp1-1',  zone: 'NW4', type: 'CP1', x: 417,  y: 455, guild: '' },
      { id: 'nw4-cp1-2',  zone: 'NW4', type: 'CP1', x: 403,  y: 321, guild: '' },
      { id: 'nw4-cp1-3',  zone: 'NW4', type: 'CP1', x: 495,  y: 394, guild: '' },
      { id: 'nw4-cp2-1',  zone: 'NW4,6', type: 'CP2', x: 371, y: 468, guild: '' },
      { id: 'nw4-cp4-1',  zone: 'NW4,NC1', type: 'CP4', x: 498, y: 557, guild: '' },
      { id: 'nw4-cp2-2',  zone: 'NW4,5', type: 'CP2', x: 456, y: 622, guild: '' },
      // NW5
      { id: 'nw5-st1-1',  zone: 'NW5', type: 'ST1', x: 332,  y: 622, guild: '' },
      { id: 'nw5-st1-2',  zone: 'NW5', type: 'ST1', x: 399,  y: 616, guild: '' },
      { id: 'nw5-lt3-1',  zone: 'NW5', type: 'LT3', x: 350,  y: 541, guild: '' },
      { id: 'nw5-cp1-1',  zone: 'NW5', type: 'CP1', x: 413,  y: 596, guild: '' },
      { id: 'nw5-cp1-2',  zone: 'NW5', type: 'CP1', x: 353,  y: 583, guild: '' },
      { id: 'nw5-cp1-3',  zone: 'NW5', type: 'CP1', x: 370,  y: 633, guild: '' },
      { id: 'nw5-cp2-1',  zone: 'NW5,6', type: 'CP2', x: 293, y: 587, guild: '' },
      // NW6
      { id: 'nw6-cs-1',   zone: 'NW6', type: 'CS',  x: 277,  y: 425, guild: '' },
      { id: 'nw6-st1-1',  zone: 'NW6', type: 'ST1', x: 269,  y: 515, guild: '' },
      { id: 'nw6-st1-2',  zone: 'NW6', type: 'ST1', x: 168,  y: 480, guild: '' },
      { id: 'nw6-cp1-1',  zone: 'NW6', type: 'CP1', x: 372,  y: 485, guild: '' },
      { id: 'nw6-cp1-2',  zone: 'NW6', type: 'CP1', x: 279,  y: 504, guild: '' },
      { id: 'nw6-cp1-3',  zone: 'NW6', type: 'CP1', x: 208,  y: 483, guild: '' },
      { id: 'nw6-cp1-4',  zone: 'NW6', type: 'CP1', x: 251,  y: 384, guild: '' },
      { id: 'nw6-cp4-1',  zone: 'N1,W', type: 'CP4', x: 190, y: 509, guild: '' },
    ],
  },

  // ─── EASTERN CENTRAL (EC) ─────────────────────────────────────────────────
  EC: {
    label: 'Eastern Central Sector',
    zones: ['EC1', 'EC2', 'EC3', 'EC4'],
    bounds: { minX: 880, maxX: 1140, minY: 520, maxY: 800 },
    zoneCenters: {
      EC1: { x: 950,  y: 620 },
      EC2: { x: 1050, y: 550 },
      EC3: { x: 1010, y: 700 },
      EC4: { x: 1080, y: 750 },
    },
    structures: [
      // EC1
      { id: 'ec1-lt4-1',  zone: 'EC1', type: 'LT4', x: 924,  y: 632, guild: '' },
      { id: 'ec1-lt4-2',  zone: 'EC1', type: 'LT4', x: 877,  y: 571, guild: '' },
      { id: 'ec1-cp2-1',  zone: 'EC1,3', type: 'CP2', x: 957, y: 643, guild: '' },
      { id: 'ec1-cp2-2',  zone: 'EC1,2', type: 'CP2', x: 907, y: 537, guild: '' },
      { id: 'ec1-cp2-3',  zone: 'EC1', type: 'CP2', x: 828,  y: 571, guild: '' },
      // EC2
      { id: 'ec2-st2-1',  zone: 'EC2', type: 'ST2', x: 1140, y: 547, guild: '' },
      { id: 'ec2-st2-2',  zone: 'EC2', type: 'ST2', x: 931,  y: 530, guild: '' },
      { id: 'ec2-lt4-1',  zone: 'EC2', type: 'LT4', x: 1059, y: 523, guild: '' },
      { id: 'ec2-cp2-1',  zone: 'EC2,3', type: 'CP2', x: 986, y: 563, guild: '' },
      { id: 'ec2-cp2-2',  zone: 'EC2,NE4', type: 'CP2', x: 972, y: 462, guild: '' },
      { id: 'ec2-cp1-1',  zone: 'EC2', type: 'CP1', x: 1075, y: 487, guild: '' },
      { id: 'ec2-cp1-2',  zone: 'EC2', type: 'CP1', x: 1099, y: 523, guild: '' },
      // EC3
      { id: 'ec3-st2-1',  zone: 'EC3', type: 'ST2', x: 971,  y: 591, guild: '' },
      { id: 'ec3-st2-2',  zone: 'EC3', type: 'ST2', x: 1052, y: 621, guild: '' },
      { id: 'ec3-c6-1',   zone: 'EC3', type: 'C6',  x: 991,  y: 702, guild: '' },
      { id: 'ec3-cp2-1',  zone: 'EC3,4', type: 'CP2', x: 1042, y: 663, guild: '' },
      { id: 'ec3-cp5-1',  zone: 'EC3,C', type: 'CP5', x: 953, y: 716, guild: '' },
      // EC4
      { id: 'ec4-st2-1',  zone: 'EC4', type: 'ST2', x: 989,  y: 793, guild: '' },
      { id: 'ec4-lt4-1',  zone: 'EC4', type: 'LT4', x: 1049, y: 751, guild: '' },
      { id: 'ec4-st2-2',  zone: 'EC4', type: 'ST2', x: 1135, y: 825, guild: '' },
      { id: 'ec4-cp1-1',  zone: 'EC4', type: 'CP1', x: 1078, y: 746, guild: '' },
      { id: 'ec4-cp1-2',  zone: 'EC4', type: 'CP1', x: 1084, y: 793, guild: '' },
    ],
  },

  // ─── EAST (E) ─────────────────────────────────────────────────────────────
  E: {
    label: 'East Sector',
    zones: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
    bounds: { minX: 1140, maxX: 1700, minY: 430, maxY: 880 },
    zoneCenters: {
      E1: { x: 1350, y: 500 },
      E2: { x: 1540, y: 510 },
      E3: { x: 1410, y: 620 },
      E4: { x: 1280, y: 700 },
      E5: { x: 1380, y: 760 },
      E6: { x: 1280, y: 830 },
    },
    structures: [
      // E1
      { id: 'e1-st2-1',   zone: 'E1', type: 'ST2', x: 1532, y: 474, guild: '' },
      { id: 'e1-lt3-1',   zone: 'E1', type: 'LT3', x: 1432, y: 488, guild: '' },
      { id: 'e1-st1-1',   zone: 'E1', type: 'ST1', x: 1512, y: 509, guild: '' },
      { id: 'e1-cp3-1',   zone: 'E1,NE2', type: 'CP3', x: 1462, y: 376, guild: '' },
      { id: 'e1-cp1-1',   zone: 'E1', type: 'CP1', x: 1453, y: 428, guild: '' },
      { id: 'e1-cp2-1',   zone: 'E1,2', type: 'CP2', x: 1569, y: 509, guild: '' },
      { id: 'e1-cp2-2',   zone: 'E1,6', type: 'CP2', x: 1395, y: 538, guild: '' },
      // E2
      { id: 'e2-lt3-1',   zone: 'E2', type: 'LT3', x: 1431, y: 717, guild: '' },
      { id: 'e2-st1-1',   zone: 'E2', type: 'ST1', x: 1537, y: 799, guild: '' },
      { id: 'e2-st1-2',   zone: 'E2', type: 'ST1', x: 1495, y: 635, guild: '' },
      { id: 'e2-st1-3',   zone: 'E2', type: 'ST1', x: 1570, y: 615, guild: '' },
      { id: 'e2-cp1-1',   zone: 'E2', type: 'CP1', x: 1522, y: 767, guild: '' },
      { id: 'e2-cp1-2',   zone: 'E2,3', type: 'CP2', x: 1437, y: 708, guild: '' },
      { id: 'e2-cp1-3',   zone: 'E2', type: 'CP1', x: 1690, y: 834, guild: '' },
      // E3
      { id: 'e3-c5-1',    zone: 'E3', type: 'C5',  x: 1385, y: 606, guild: '' },
      { id: 'e3-st1-1',   zone: 'E3', type: 'ST1', x: 1390, y: 776, guild: '' },
      { id: 'e3-st1-2',   zone: 'E3', type: 'ST1', x: 1354, y: 682, guild: '' },
      { id: 'e3-cp1-1',   zone: 'E3', type: 'CP1', x: 1399, y: 698, guild: '' },
      { id: 'e3-cp1-2',   zone: 'E3', type: 'CP1', x: 1284, y: 720, guild: '' },
      { id: 'e3-cp2-1',   zone: 'E3,5', type: 'CP2', x: 1340, y: 592, guild: '' },
      { id: 'e3-cp2-2',   zone: 'E3,6', type: 'CP2', x: 1343, y: 570, guild: '' },
      // E4
      { id: 'e4-st1-1',   zone: 'E4', type: 'ST1', x: 1228, y: 877, guild: '' },
      { id: 'e4-lt3-1',   zone: 'E4', type: 'LT3', x: 1261, y: 809, guild: '' },
      { id: 'e4-st1-2',   zone: 'E4', type: 'ST1', x: 1190, y: 931, guild: '' },
      { id: 'e4-cp2-1',   zone: 'E4,5', type: 'CP2', x: 1199, y: 759, guild: '' },
      { id: 'e4-cp4-1',   zone: 'E4,EC4', type: 'CP4', x: 1176, y: 846, guild: '' },
      { id: 'e4-cp1-1',   zone: 'E4', type: 'CP1', x: 1160, y: 881, guild: '' },
      { id: 'e4-cp1-2',   zone: 'E4', type: 'CP1', x: 1207, y: 862, guild: '' },
      // E5
      { id: 'e5-lt3-1',   zone: 'E5', type: 'LT3', x: 1152, y: 666, guild: '' },
      { id: 'e5-st1-1',   zone: 'E5', type: 'ST1', x: 1250, y: 736, guild: '' },
      { id: 'e5-st1-2',   zone: 'E5', type: 'ST1', x: 1159, y: 736, guild: '' },
      { id: 'e5-cp1-1',   zone: 'E5', type: 'CP1', x: 1236, y: 692, guild: '' },
      { id: 'e5-cp1-2',   zone: 'E5', type: 'CP1', x: 1004, y: 212, guild: '' },
      { id: 'e5-cp4-1',   zone: 'E5,EC2', type: 'CP4', x: 1137, y: 610, guild: '' },
      // E6
      { id: 'e6-st1-1',   zone: 'E6', type: 'ST1', x: 1199, y: 561, guild: '' },
      { id: 'e6-lt3-1',   zone: 'E6', type: 'LT3', x: 1291, y: 567, guild: '' },
      { id: 'e6-st1-2',   zone: 'E6', type: 'ST1', x: 1224, y: 532, guild: '' },
      { id: 'e6-st1-3',   zone: 'E6', type: 'ST1', x: 1336, y: 506, guild: '' },
      { id: 'e6-cp1-1',   zone: 'E6', type: 'CP1', x: 1171, y: 535, guild: '' },
      { id: 'e6-cp1-2',   zone: 'E6', type: 'CP1', x: 1324, y: 550, guild: '' },
      { id: 'e6-cp1-3',   zone: 'E6', type: 'CP1', x: 1259, y: 583, guild: '' },
      { id: 'e6-cp3-1',   zone: 'E6,NE3', type: 'CP3', x: 1229, y: 452, guild: '' },
    ],
  },

  // ─── WEST CENTRAL (WC) ────────────────────────────────────────────────────
  WC: {
    label: 'West Central Sector',
    zones: ['WC1', 'WC2', 'WC3', 'WC4'],
    bounds: { minX: 490, maxX: 760, minY: 940, maxY: 1110 },
    zoneCenters: {
      WC1: { x: 560, y: 1020 },
      WC2: { x: 630, y: 970 },
      WC3: { x: 640, y: 1050 },
      WC4: { x: 700, y: 980 },
    },
    structures: [
      // WC1
      { id: 'wc1-st2-1',  zone: 'WC1', type: 'ST2', x: 582,  y: 1065, guild: '' },
      { id: 'wc1-st2-2',  zone: 'WC1', type: 'ST2', x: 527,  y: 1047, guild: '' },
      { id: 'wc1-lt4-1',  zone: 'WC1', type: 'LT4', x: 566,  y: 1005, guild: '' },
      { id: 'wc1-cp1-1',  zone: 'WC1', type: 'CP1', x: 549,  y: 1039, guild: '' },
      { id: 'wc1-cp1-2',  zone: 'WC1', type: 'CP1', x: 533,  y: 1007, guild: '' },
      { id: 'wc1-cp1-3',  zone: 'WC1', type: 'CP1', x: 574,  y: 1034, guild: '' },
      { id: 'wc1-cp2-1',  zone: 'WC1,2', type: 'CP2', x: 522, y: 954, guild: '' },
      { id: 'wc1-cp2-2',  zone: 'WC1,4', type: 'CP2', x: 595, y: 1005, guild: '' },
      // WC2
      { id: 'wc2-st2-1',  zone: 'WC2', type: 'ST2', x: 503,  y: 806, guild: '' },
      { id: 'wc2-lt4-1',  zone: 'WC2', type: 'LT4', x: 534,  y: 881, guild: '' },
      { id: 'wc2-st2-2',  zone: 'WC2', type: 'ST2', x: 506,  y: 934, guild: '' },
      { id: 'wc2-cp1-1',  zone: 'WC2', type: 'CP1', x: 492,  y: 913, guild: '' },
      { id: 'wc2-cp1-2',  zone: 'WC2', type: 'CP1', x: 509,  y: 892, guild: '' },
      { id: 'wc2-cp2-1',  zone: 'WC2,3', type: 'CP2', x: 514, y: 781, guild: '' },
      // WC3
      { id: 'wc3-st2-1',  zone: 'WC3', type: 'ST2', x: 584,  y: 735, guild: '' },
      { id: 'wc3-lt4-1',  zone: 'WC3', type: 'LT4', x: 567,  y: 800, guild: '' },
      { id: 'wc3-cp1-1',  zone: 'WC3', type: 'CP1', x: 565,  y: 735, guild: '' },
      { id: 'wc3-cp4-1',  zone: 'WC3,NC1', type: 'CP4', x: 605, y: 722, guild: '' },
      { id: 'wc3-cp2-1',  zone: 'WC3,4', type: 'CP2', x: 588, y: 815, guild: '' },
      // WC4
      { id: 'wc4-c6-1',   zone: 'WC4', type: 'C6',  x: 634,  y: 942, guild: '' },
      { id: 'wc4-st2-1',  zone: 'WC4', type: 'ST2', x: 704,  y: 894, guild: '' },
      { id: 'wc4-cp1-1',  zone: 'WC4', type: 'CP1', x: 604,  y: 871, guild: '' },
      { id: 'wc4-cp5-1',  zone: 'WC4,C', type: 'CP5', x: 627, y: 855, guild: '' },
    ],
  },

  // ─── WEST (W) ─────────────────────────────────────────────────────────────
  W: {
    label: 'West Sector',
    zones: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
    bounds: { minX: 60, maxX: 520, minY: 620, maxY: 1120 },
    zoneCenters: {
      W1: { x: 180, y: 1020 },
      W2: { x: 280, y: 920 },
      W3: { x: 130, y: 830 },
      W4: { x: 290, y: 780 },
      W5: { x: 460, y: 730 },
      W6: { x: 410, y: 860 },
    },
    structures: [
      // W1
      { id: 'w1-st1-1',  zone: 'W1', type: 'ST1', x: 97,   y: 983,  guild: '' },
      { id: 'w1-st1-2',  zone: 'W1', type: 'ST1', x: 101,  y: 1114, guild: '' },
      { id: 'w1-lt3-1',  zone: 'W1', type: 'LT3', x: 200,  y: 1092, guild: '' },
      { id: 'w1-st1-3',  zone: 'W1', type: 'ST1', x: 309,  y: 1046, guild: '' },
      { id: 'w1-cp1-1',  zone: 'W1', type: 'CP1', x: 143,  y: 1046, guild: '' },
      { id: 'w1-cp1-2',  zone: 'W1', type: 'CP1', x: 253,  y: 1137, guild: '' },
      { id: 'w1-cp1-3',  zone: 'W1', type: 'CP1', x: 278,  y: 1052, guild: '' },
      { id: 'w1-cp2-1',  zone: 'W1,2', type: 'CP2', x: 89,  y: 918, guild: '' },
      // W2
      { id: 'w2-lt3-1',  zone: 'W2', type: 'LT3', x: 173,  y: 916, guild: '' },
      { id: 'w2-st1-1',  zone: 'W2', type: 'ST1', x: 63,   y: 915, guild: '' },
      { id: 'w2-st1-2',  zone: 'W2', type: 'ST1', x: 241,  y: 880, guild: '' },
      { id: 'w2-cp1-1',  zone: 'W2', type: 'CP1', x: 130,  y: 904, guild: '' },
      { id: 'w2-cp2-1',  zone: 'W2,4', type: 'CP2', x: 327, y: 937, guild: '' },
      { id: 'w2-cp2-2',  zone: 'W2,3', type: 'CP2', x: 145, y: 1200, guild: '' },
      // W3
      { id: 'w3-lt3-1',  zone: 'W3', type: 'LT3', x: 101,  y: 640, guild: '' },
      { id: 'w3-st1-1',  zone: 'W3', type: 'ST1', x: 106,  y: 575, guild: '' },
      { id: 'w3-st1-2',  zone: 'W3', type: 'ST1', x: 60,   y: 703, guild: '' },
      { id: 'w3-st1-3',  zone: 'W3', type: 'ST1', x: 163,  y: 722, guild: '' },
      { id: 'w3-cp1-1',  zone: 'W3', type: 'CP1', x: 87,   y: 682, guild: '' },
      { id: 'w3-cp1-2',  zone: 'W3', type: 'CP1', x: 118,  y: 623, guild: '' },
      { id: 'w3-cp1-3',  zone: 'W3', type: 'CP1', x: 57,   y: 566, guild: '' },
      { id: 'w3-cp2-1',  zone: 'W3,NW1', type: 'CP2', x: 37, y: 544, guild: '' },
      { id: 'w3-cp2-2',  zone: 'W3,4', type: 'CP2', x: 232, y: 682, guild: '' },
      // W4
      { id: 'w4-st1-1',  zone: 'W4', type: 'ST1', x: 256,  y: 619, guild: '' },
      { id: 'w4-c5-1',   zone: 'W4', type: 'C5',  x: 262,  y: 850, guild: '' },
      { id: 'w4-lt3-1',  zone: 'W4', type: 'LT3', x: 329,  y: 778, guild: '' },
      { id: 'w4-st1-2',  zone: 'W4', type: 'ST1', x: 219,  y: 752, guild: '' },
      { id: 'w4-cp1-1',  zone: 'W4', type: 'CP1', x: 276,  y: 691, guild: '' },
      { id: 'w4-cp1-2',  zone: 'W4', type: 'CP1', x: 303,  y: 789, guild: '' },
      { id: 'w4-cp2-1',  zone: 'W4', type: 'CP2', x: 343,  y: 829, guild: '' },
      // W5
      { id: 'w5-st1-1',  zone: 'W5', type: 'ST1', x: 458,  y: 726, guild: '' },
      { id: 'w5-lt3-1',  zone: 'W5', type: 'LT3', x: 427,  y: 730, guild: '' },
      { id: 'w5-cp3-1',  zone: 'W5,NC2', type: 'CP3', x: 371, y: 661, guild: '' },
      { id: 'w5-cp1-1',  zone: 'W5', type: 'CP1', x: 394,  y: 705, guild: '' },
      { id: 'w5-cp1-2',  zone: 'W5', type: 'CP1', x: 421,  y: 710, guild: '' },
      { id: 'w5-cp4-1',  zone: 'W5,NC1', type: 'CP4', x: 472, y: 694, guild: '' },
      // W6
      { id: 'w6-st1-1',  zone: 'W6', type: 'ST1', x: 391,  y: 907, guild: '' },
      { id: 'w6-st1-2',  zone: 'W6', type: 'ST1', x: 381,  y: 827, guild: '' },
      { id: 'w6-lt3-1',  zone: 'W6', type: 'LT3', x: 403,  y: 792, guild: '' },
      { id: 'w6-cs-1',   zone: 'W6', type: 'CS',  x: 570,  y: 211, guild: '' },
      { id: 'w6-cp1-1',  zone: 'W6', type: 'CP1', x: 413,  y: 775, guild: '' },
      { id: 'w6-cp4-1',  zone: 'W6,WC2', type: 'CP4', x: 459, y: 868, guild: '' },
    ],
  },

  // ─── SOUTH CENTRAL (SC) ───────────────────────────────────────────────────
  SC: {
    label: 'South Central Sector',
    zones: ['SC1', 'SC2', 'SC3', 'SC4', 'SC5'],
    bounds: { minX: 660, maxX: 1090, minY: 830, maxY: 1100 },
    zoneCenters: {
      SC1: { x: 760,  y: 1000 },
      SC2: { x: 830,  y: 900  },
      SC3: { x: 860,  y: 970  },
      SC4: { x: 1010, y: 940  },
      SC5: { x: 1040, y: 1050 },
    },
    structures: [
      // SC1
      { id: 'sc1-lt4-1',  zone: 'SC1', type: 'LT4', x: 704,  y: 1055, guild: '' },
      { id: 'sc1-st2-1',  zone: 'SC1', type: 'ST2', x: 763,  y: 1180, guild: '' },
      { id: 'sc1-cp1-1',  zone: 'SC1', type: 'CP1', x: 727,  y: 1124, guild: '' },
      { id: 'sc1-cp1-2',  zone: 'SC1', type: 'CP1', x: 761,  y: 1121, guild: '' },
      { id: 'sc1-cp4-1',  zone: 'SC1,WC1', type: 'CP4', x: 647, y: 1047, guild: '' },
      { id: 'sc1-cp2-1',  zone: 'SC1,2', type: 'CP2', x: 671, y: 1006, guild: '' },
      // SC2
      { id: 'sc2-st2-1',  zone: 'SC2', type: 'ST2', x: 689,  y: 993, guild: '' },
      { id: 'sc2-lt4-1',  zone: 'SC2', type: 'LT4', x: 775,  y: 1021, guild: '' },
      { id: 'sc2-st2-2',  zone: 'SC2', type: 'ST2', x: 842,  y: 1021, guild: '' },
      { id: 'sc2-cp1-1',  zone: 'SC2', type: 'CP1', x: 757,  y: 1031, guild: '' },
      { id: 'sc2-cp1-2',  zone: 'SC2', type: 'CP1', x: 855,  y: 1010, guild: '' },
      { id: 'sc2-cp2-1',  zone: 'SC2,3', type: 'CP2', x: 894, y: 1021, guild: '' },
      { id: 'sc2-cp2-2',  zone: 'SC2,5', type: 'CP2', x: 953, y: 1077, guild: '' },
      // SC3
      { id: 'sc3-st2-1',  zone: 'SC3', type: 'ST2', x: 889,  y: 966, guild: '' },
      { id: 'sc3-c6-1',   zone: 'SC3', type: 'C6',  x: 813,  y: 947, guild: '' },
      { id: 'sc3-st2-2',  zone: 'SC3', type: 'ST2', x: 727,  y: 936, guild: '' },
      { id: 'sc3-cp5-1',  zone: 'SC3,C', type: 'CP5', x: 836, y: 920, guild: '' },
      { id: 'sc3-cp1-1',  zone: 'SC3', type: 'CP1', x: 921,  y: 885, guild: '' },
      { id: 'sc3-cp2-1',  zone: 'SC3,5', type: 'CP2', x: 988, y: 1010, guild: '' },
      // SC4
      { id: 'sc4-st2-1',  zone: 'SC4', type: 'ST2', x: 1036, y: 975, guild: '' },
      { id: 'sc4-st2-2',  zone: 'SC4', type: 'ST2', x: 990,  y: 848, guild: '' },
      { id: 'sc4-st2-3',  zone: 'SC4', type: 'ST2', x: 990,  y: 848, guild: '' },
      { id: 'sc4-cp2-1',  zone: 'SC4', type: 'CP2', x: 983,  y: 924, guild: '' },
      { id: 'sc4-cp1-1',  zone: 'SC4', type: 'CP1', x: 1010, y: 916, guild: '' },
      { id: 'sc4-cp4-1',  zone: 'SC4,EC4', type: 'CP4', x: 1080, y: 830, guild: '' },
      { id: 'sc4-cp2-2',  zone: 'SC4', type: 'CP2', x: 1072, y: 1012, guild: '' },
      // SC5
      { id: 'sc5-st2-1',  zone: 'SC5', type: 'ST2', x: 1020, y: 1091, guild: '' },
      { id: 'sc5-lt4-1',  zone: 'SC5', type: 'LT4', x: 1170, y: 1091, guild: '' },
      { id: 'sc5-st2-2',  zone: 'SC5', type: 'ST2', x: 1012, y: 1018, guild: '' },
      { id: 'sc5-cp1-1',  zone: 'SC5', type: 'CP1', x: 992,  y: 1080, guild: '' },
      { id: 'sc5-cp1-2',  zone: 'SC5', type: 'CP1', x: 1052, y: 1027, guild: '' },
    ],
  },

  // ─── SOUTH EAST (SE) ──────────────────────────────────────────────────────
  SE: {
    label: 'South East Sector',
    zones: ['SE1', 'SE2', 'SE3', 'SE4', 'SE5', 'SE6'],
    bounds: { minX: 960, maxX: 1580, minY: 900, maxY: 1360 },
    zoneCenters: {
      SE1: { x: 1300, y: 1100 },
      SE2: { x: 1480, y: 1050 },
      SE3: { x: 1310, y: 1200 },
      SE4: { x: 1040, y: 1100 },
      SE5: { x: 1200, y: 1250 },
      SE6: { x: 1400, y: 1300 },
    },
    structures: [
      // SE1
      { id: 'se1-st1-1',  zone: 'SE1', type: 'ST1', x: 1489, y: 992,  guild: '' },
      { id: 'se1-lt3-1',  zone: 'SE1', type: 'LT3', x: 1471, y: 1041, guild: '' },
      { id: 'se1-st1-2',  zone: 'SE1', type: 'ST1', x: 1487, y: 1124, guild: '' },
      { id: 'se1-st1-3',  zone: 'SE1', type: 'ST1', x: 1429, y: 1162, guild: '' },
      { id: 'se1-cp3-1',  zone: 'SE1,E2', type: 'CP3', x: 1550, y: 899, guild: '' },
      { id: 'se1-cp1-1',  zone: 'SE1', type: 'CP1', x: 1501, y: 927, guild: '' },
      { id: 'se1-cp1-2',  zone: 'SE1', type: 'CP1', x: 1451, y: 947, guild: '' },
      { id: 'se1-cp1-3',  zone: 'SE1', type: 'CP1', x: 1468, y: 1010, guild: '' },
      { id: 'se1-cp1-4',  zone: 'SE1', type: 'CP1', x: 1442, y: 1116, guild: '' },
      { id: 'se1-cp2-1',  zone: 'SE1', type: 'CP2', x: 1476, y: 1200, guild: '' },
      { id: 'se1-cp2-2',  zone: 'SE1,3', type: 'CP2', x: 1317, y: 1128, guild: '' },
      // SE2
      { id: 'se2-lt3-1',  zone: 'SE2', type: 'LT3', x: 1540, y: 1339, guild: '' },
      { id: 'se2-st1-1',  zone: 'SE2', type: 'ST1', x: 1471, y: 1472, guild: '' },
      { id: 'se2-st1-2',  zone: 'SE2', type: 'ST1', x: 1469, y: 1267, guild: '' },
      { id: 'se2-cp1-1',  zone: 'SE2', type: 'CP1', x: 1442, y: 1233, guild: '' },
      { id: 'se2-cp1-2',  zone: 'SE2', type: 'CP1', x: 1505, y: 1304, guild: '' },
      { id: 'se2-cp1-3',  zone: 'SE2', type: 'CP1', x: 1411, y: 1343, guild: '' },
      { id: 'se2-cp1-4',  zone: 'SE2', type: 'CP1', x: 1458, y: 1364, guild: '' },
      { id: 'se2-cp2-1',  zone: 'SE2,3', type: 'CP2', x: 1411, y: 1343, guild: '' },
      { id: 'se2-cp1-5',  zone: 'SE2', type: 'CP1', x: 1431, y: 1446, guild: '' },
      // SE3
      { id: 'se3-st1-1',  zone: 'SE3', type: 'ST1', x: 1308, y: 1272, guild: '' },
      { id: 'se3-lt3-1',  zone: 'SE3', type: 'LT3', x: 1256, y: 1058, guild: '' },
      { id: 'se3-cs-1',   zone: 'SE3', type: 'CS',  x: 1376, y: 1244, guild: '' },
      { id: 'se3-st1-2',  zone: 'SE3', type: 'ST1', x: 1268, y: 1169, guild: '' },
      { id: 'se3-cp1-1',  zone: 'SE3', type: 'CP1', x: 1411, y: 1311, guild: '' },
      { id: 'se3-cp1-2',  zone: 'SE3', type: 'CP1', x: 1322, y: 1243, guild: '' },
      { id: 'se3-cp1-3',  zone: 'SE3', type: 'CP1', x: 1295, y: 1103, guild: '' },
      { id: 'se3-cp2-1',  zone: 'SE3,6', type: 'CP2', x: 1338, y: 1091, guild: '' },
      { id: 'se3-cp2-2',  zone: 'SE3,5', type: 'CP2', x: 1189, y: 1092, guild: '' },
      // SE4
      { id: 'se4-st1-1',  zone: 'SE4', type: 'ST1', x: 1268, y: 1313, guild: '' },
      { id: 'se4-st1-2',  zone: 'SE4', type: 'ST1', x: 852,  y: 1073, guild: '' },
      { id: 'se4-lt3-1',  zone: 'SE4', type: 'LT3', x: 1069, y: 1197, guild: '' },
      { id: 'se4-cp2-1',  zone: 'SE4,5', type: 'CP2', x: 1038, y: 1233, guild: '' },
      { id: 'se4-cp1-1',  zone: 'SE4', type: 'CP1', x: 1104, y: 1178, guild: '' },
      { id: 'se4-cp1-2',  zone: 'SE4', type: 'CP1', x: 960,  y: 1166, guild: '' },
      { id: 'se4-cp4-1',  zone: 'SE4,5CS4', type: 'CP4', x: 981, y: 1106, guild: '' },
      { id: 'se4-cp4-2',  zone: 'SE4,5C1', type: 'CP4', x: 1183, y: 1103, guild: '' },
      // SE5
      { id: 'se5-lt3-1',  zone: 'SE5', type: 'LT3', x: 1192, y: 1025, guild: '' },
      { id: 'se5-st1-1',  zone: 'SE5', type: 'ST1', x: 1163, y: 1064, guild: '' },
      { id: 'se5-st1-2',  zone: 'SE5', type: 'ST1', x: 1138, y: 937,  guild: '' },
      { id: 'se5-cp1-1',  zone: 'SE5', type: 'CP1', x: 1173, y: 1046, guild: '' },
      { id: 'se5-cp1-2',  zone: 'SE5', type: 'CP1', x: 1146, y: 1009, guild: '' },
      { id: 'se5-cp1-3',  zone: 'SE5', type: 'CP1', x: 1163, y: 981,  guild: '' },
      { id: 'se5-cp3-1',  zone: 'SE5,E4', type: 'CP3', x: 1189, y: 973, guild: '' },
      // SE6
      { id: 'se6-st1-1',  zone: 'SE6', type: 'ST1', x: 1315, y: 1018, guild: '' },
      { id: 'se6-lt3-1',  zone: 'SE6', type: 'LT3', x: 1406, y: 915,  guild: '' },
      { id: 'se6-st1-2',  zone: 'SE6', type: 'ST1', x: 1135, y: 825,  guild: '' },
      { id: 'se6-cp1-1',  zone: 'SE6', type: 'CP1', x: 1378, y: 1105, guild: '' },
      { id: 'se6-cp1-2',  zone: 'SE6', type: 'CP1', x: 1406, y: 1063, guild: '' },
      { id: 'se6-cp1-3',  zone: 'SE6', type: 'CP1', x: 1345, y: 954,  guild: '' },
      { id: 'se6-cp3-1',  zone: 'SE6,E4', type: 'CP3', x: 1240, y: 930, guild: '' },
    ],
  },

  // ─── SOUTH (S) ────────────────────────────────────────────────────────────
  S: {
    label: 'South Sector',
    zones: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    bounds: { minX: 570, maxX: 1200, minY: 1220, maxY: 1560 },
    zoneCenters: {
      S1: { x: 720,  y: 1430 },
      S2: { x: 820,  y: 1350 },
      S3: { x: 920,  y: 1400 },
      S4: { x: 840,  y: 1250 },
      S5: { x: 1000, y: 1300 },
      S6: { x: 1060, y: 1400 },
    },
    structures: [
      // S1
      { id: 's1-st1-1',  zone: 'S1', type: 'ST1', x: 1389, y: 1497, guild: '' },
      { id: 's1-lt3-1',  zone: 'S1', type: 'LT3', x: 1292, y: 1406, guild: '' },
      { id: 's1-st1-2',  zone: 'S1', type: 'ST1', x: 1230, y: 1386, guild: '' },
      { id: 's1-st1-3',  zone: 'S1', type: 'ST1', x: 1330, y: 1518, guild: '' },
      { id: 's1-cp3-1',  zone: 'S1,SE2', type: 'CP3', x: 1419, y: 1430, guild: '' },
      { id: 's1-cp1-1',  zone: 'S1', type: 'CP1', x: 1335, y: 1423, guild: '' },
      { id: 's1-cp1-2',  zone: 'S1', type: 'CP1', x: 1273, y: 1513, guild: '' },
      { id: 's1-cp1-3',  zone: 'S1', type: 'CP1', x: 1190, y: 1482, guild: '' },
      { id: 's1-cp1-4',  zone: 'S1', type: 'CP1', x: 1167, y: 1320, guild: '' },
      { id: 's1-cp2-1',  zone: 'S1,2', type: 'CP2', x: 1149, y: 1405, guild: '' },
      { id: 's1-cp2-2',  zone: 'S1,6', type: 'CP2', x: 1198, y: 1403, guild: '' },
      // S2
      { id: 's2-st1-1',  zone: 'S2', type: 'ST1', x: 1121, y: 1516, guild: '' },
      { id: 's2-lt3-1',  zone: 'S2', type: 'LT3', x: 1054, y: 1497, guild: '' },
      { id: 's2-st1-2',  zone: 'S2', type: 'ST1', x: 1178, y: 1475, guild: '' },
      { id: 's2-st1-3',  zone: 'S2', type: 'ST1', x: 975,  y: 1148, guild: '' },
      { id: 's2-cp1-1',  zone: 'S2', type: 'CP1', x: 1146, y: 1522, guild: '' },
      { id: 's2-cp1-2',  zone: 'S2', type: 'CP1', x: 1070, y: 1477, guild: '' },
      { id: 's2-cp2-1',  zone: 'S2,6', type: 'CP2', x: 1069, y: 1437, guild: '' },
      // S3
      { id: 's3-st1-1',  zone: 'S3', type: 'ST1', x: 886,  y: 1454, guild: '' },
      { id: 's3-st1-2',  zone: 'S3', type: 'ST1', x: 821,  y: 1415, guild: '' },
      { id: 's3-lt3-1',  zone: 'S3', type: 'LT3', x: 800,  y: 1368, guild: '' },
      { id: 's3-st1-3',  zone: 'S3', type: 'ST1', x: 755,  y: 1350, guild: '' },
      { id: 's3-cp2-1',  zone: 'S3,6', type: 'CP2', x: 913, y: 1480, guild: '' },
      { id: 's3-cp1-1',  zone: 'S3', type: 'CP1', x: 870,  y: 1478, guild: '' },
      { id: 's3-cp2-2',  zone: 'S3,4', type: 'CP2', x: 933, y: 1480, guild: '' },
      // S4
      { id: 's4-st1-1',  zone: 'S4', type: 'ST1', x: 817,  y: 1221, guild: '' },
      { id: 's4-lt3-1',  zone: 'S4', type: 'LT3', x: 750,  y: 1242, guild: '' },
      { id: 's4-st1-2',  zone: 'S4', type: 'ST1', x: 748,  y: 1144, guild: '' },
      { id: 's4-cp4-1',  zone: 'S4,WC1', type: 'CP4', x: 585, y: 1096, guild: '' },
      { id: 's4-cp4-2',  zone: 'S4,SC1', type: 'CP4', x: 585, y: 1096, guild: '' },
      { id: 's4-cp1-1',  zone: 'S4', type: 'CP1', x: 713,  y: 1228, guild: '' },
      { id: 's4-cp2-1',  zone: 'S4,6', type: 'CP2', x: 844, y: 1293, guild: '' },
      { id: 's4-cp2-2',  zone: 'S4,5', type: 'CP2', x: 886, y: 1255, guild: '' },
      // S5
      { id: 's5-st1-1',  zone: 'S5', type: 'ST1', x: 908,  y: 1272, guild: '' },
      { id: 's5-st1-2',  zone: 'S5', type: 'ST1', x: 1093, y: 1286, guild: '' },
      { id: 's5-st1-3',  zone: 'S5', type: 'ST1', x: 1059, y: 1361, guild: '' },
      { id: 's5-cp1-1',  zone: 'S5', type: 'CP1', x: 965,  y: 1261, guild: '' },
      { id: 's5-cp1-2',  zone: 'S5', type: 'CP1', x: 932,  y: 1195, guild: '' },
      { id: 's5-cp2-1',  zone: 'S5,SE4', type: 'CP2', x: 1034, y: 1300, guild: '' },
      // S6
      { id: 's6-cs-1',   zone: 'S6', type: 'CS',  x: 974,  y: 1374, guild: '' },
      { id: 's6-st1-1',  zone: 'S6', type: 'ST1', x: 1009, y: 1410, guild: '' },
      { id: 's6-st1-2',  zone: 'S6', type: 'ST1', x: 1072, y: 1374, guild: '' },
      { id: 's6-st1-3',  zone: 'S6', type: 'ST1', x: 1039, y: 1395, guild: '' },
      { id: 's6-cp1-1',  zone: 'S6', type: 'CP1', x: 1039, y: 1385, guild: '' },
      { id: 's6-cp1-2',  zone: 'S6', type: 'CP1', x: 997,  y: 1333, guild: '' },
      { id: 's6-cp1-3',  zone: 'S6', type: 'CP1', x: 976,  y: 1468, guild: '' },
      { id: 's6-cp1-4',  zone: 'S6', type: 'CP1', x: 931,  y: 1462, guild: '' },
      { id: 's6-cp1-5',  zone: 'S6', type: 'CP1', x: 906,  y: 1365, guild: '' },
      { id: 's6-cp1-6',  zone: 'S6', type: 'CP1', x: 902,  y: 1326, guild: '' },
    ],
  },

  // ─── SOUTH WEST (SW) ──────────────────────────────────────────────────────
  SW: {
    label: 'South West Sector',
    zones: ['SW1', 'SW2', 'SW3', 'SW4', 'SW5', 'SW6'],
    bounds: { minX: 70, maxX: 650, minY: 1000, maxY: 1580 },
    zoneCenters: {
      SW1: { x: 380, y: 1520 },
      SW2: { x: 200, y: 1380 },
      SW3: { x: 310, y: 1260 },
      SW4: { x: 480, y: 1160 },
      SW5: { x: 600, y: 1350 },
      SW6: { x: 520, y: 1470 },
    },
    structures: [
      // SW1
      { id: 'sw1-st1-1',  zone: 'SW1', type: 'ST1', x: 295,  y: 1509, guild: '' },
      { id: 'sw1-lt3-1',  zone: 'SW1', type: 'LT3', x: 177,  y: 1473, guild: '' },
      { id: 'sw1-st1-2',  zone: 'SW1', type: 'ST1', x: 399,  y: 1521, guild: '' },
      { id: 'sw1-st1-3',  zone: 'SW1', type: 'ST1', x: 521,  y: 1518, guild: '' },
      { id: 'sw1-cp2-1',  zone: 'SW1,2', type: 'CP2', x: 276, y: 1529, guild: '' },
      { id: 'sw1-cp1-1',  zone: 'SW1', type: 'CP1', x: 331,  y: 1509, guild: '' },
      { id: 'sw1-cp2-2',  zone: 'SW1,6', type: 'CP2', x: 321, y: 1431, guild: '' },
      { id: 'sw1-cp1-2',  zone: 'SW1', type: 'CP1', x: 398,  y: 1417, guild: '' },
      { id: 'sw1-cp1-3',  zone: 'SW1', type: 'CP1', x: 458,  y: 1509, guild: '' },
      { id: 'sw1-cp2-3',  zone: 'SW1,6', type: 'CP2', x: 493, y: 1551, guild: '' },
      // SW2
      { id: 'sw2-st1-1',  zone: 'SW2', type: 'ST1', x: 177,  y: 1473, guild: '' },
      { id: 'sw2-st1-2',  zone: 'SW2', type: 'ST1', x: 106,  y: 1272, guild: '' },
      { id: 'sw2-lt3-1',  zone: 'SW2', type: 'LT3', x: 95,   y: 1340, guild: '' },
      { id: 'sw2-st1-3',  zone: 'SW2', type: 'ST1', x: 132,  y: 1545, guild: '' },
      { id: 'sw2-cp1-1',  zone: 'SW2', type: 'CP1', x: 195,  y: 1440, guild: '' },
      { id: 'sw2-cp1-2',  zone: 'SW2', type: 'CP1', x: 132,  y: 1490, guild: '' },
      { id: 'sw2-cp1-3',  zone: 'SW2', type: 'CP1', x: 94,   y: 1219, guild: '' },
      { id: 'sw2-cp2-1',  zone: 'SW2,6', type: 'CP2', x: 269, y: 1203, guild: '' },
      { id: 'sw2-cp2-2',  zone: 'SW2,3', type: 'CP2', x: 145, y: 1200, guild: '' },
      { id: 'sw2-cp3-1',  zone: 'SW2,W1', type: 'CP3', x: 105, y: 1175, guild: '' },
      // SW3
      { id: 'sw3-lt3-1',  zone: 'SW3', type: 'LT3', x: 269,  y: 1184, guild: '' },
      { id: 'sw3-st1-1',  zone: 'SW3', type: 'ST1', x: 326,  y: 1230, guild: '' },
      { id: 'sw3-st1-2',  zone: 'SW3', type: 'ST1', x: 394,  y: 1238, guild: '' },
      { id: 'sw3-st1-3',  zone: 'SW3', type: 'ST1', x: 167,  y: 1247, guild: '' },
      { id: 'sw3-cp1-1',  zone: 'SW3', type: 'CP1', x: 329,  y: 1189, guild: '' },
      { id: 'sw3-cp1-2',  zone: 'SW3', type: 'CP1', x: 356,  y: 1125, guild: '' },
      { id: 'sw3-cp2-1',  zone: 'SW3,4', type: 'CP2', x: 376, y: 1125, guild: '' },
      { id: 'sw3-cp3-1',  zone: 'SW3,NS', type: 'CP3', x: 314, y: 1139, guild: '' },
      // SW4
      { id: 'sw4-st1-1',  zone: 'SW4', type: 'ST1', x: 389,  y: 1014, guild: '' },
      { id: 'sw4-st1-2',  zone: 'SW4', type: 'ST1', x: 479,  y: 1082, guild: '' },
      { id: 'sw4-lt3-1',  zone: 'SW4', type: 'LT3', x: 454,  y: 1210, guild: '' },
      { id: 'sw4-cp4-1',  zone: 'SW4,WC1', type: 'CP4', x: 454, y: 1210, guild: '' },
      { id: 'sw4-cp1-1',  zone: 'SW4', type: 'CP1', x: 487,  y: 1091, guild: '' },
      { id: 'sw4-cp1-2',  zone: 'SW4', type: 'CP1', x: 481,  y: 1117, guild: '' },
      { id: 'sw4-cp1-3',  zone: 'SW4', type: 'CP1', x: 512,  y: 1304, guild: '' },
      { id: 'sw4-cp2-1',  zone: 'SW4,6', type: 'CP2', x: 466, y: 1306, guild: '' },
      // SW5
      { id: 'sw5-st1-1',  zone: 'SW5', type: 'ST1', x: 643,  y: 1388, guild: '' },
      { id: 'sw5-st1-2',  zone: 'SW5', type: 'ST1', x: 545,  y: 1195, guild: '' },
      { id: 'sw5-lt3-1',  zone: 'SW5', type: 'LT3', x: 583,  y: 1563, guild: '' },
      { id: 'sw5-cp3-1',  zone: 'SW5,S4', type: 'CP3', x: 627, y: 1188, guild: '' },
      { id: 'sw5-cp1-1',  zone: 'SW5', type: 'CP1', x: 611,  y: 1275, guild: '' },
      { id: 'sw5-cp1-2',  zone: 'SW5', type: 'CP1', x: 600,  y: 1356, guild: '' },
      { id: 'sw5-cp1-3',  zone: 'SW5,53', type: 'CP1', x: 677, y: 1418, guild: '' },
      { id: 'sw5-cp1-4',  zone: 'SW5', type: 'CP1', x: 578,  y: 1418, guild: '' },
      { id: 'sw5-cp2-1',  zone: 'SW5,6', type: 'CP2', x: 557, y: 1422, guild: '' },
      // SW6
      { id: 'sw6-cs-1',   zone: 'SW6', type: 'CS',  x: 617,  y: 1479, guild: '' },
      { id: 'sw6-st1-1',  zone: 'SW6', type: 'ST1', x: 492,  y: 1363, guild: '' },
      { id: 'sw6-st1-2',  zone: 'SW6', type: 'ST1', x: 323,  y: 1291, guild: '' },
      { id: 'sw6-cp1-1',  zone: 'SW6', type: 'CP1', x: 675,  y: 1542, guild: '' },
      { id: 'sw6-cp1-2',  zone: 'SW6', type: 'CP1', x: 537,  y: 1431, guild: '' },
      { id: 'sw6-cp1-3',  zone: 'SW6', type: 'CP1', x: 359,  y: 1338, guild: '' },
    ],
  },
};

function cloneBaseSectors() {
  return JSON.parse(JSON.stringify(EDEN_SECTORS_BASE));
}

function ensureSector(sectors, sectorKey, structures) {
  if (sectors[sectorKey]) return;
  const zones = [...new Set(structures.map(s => s.zone))];
  const xs = structures.map(s => s.x);
  const ys = structures.map(s => s.y);
  const pad = 48;
  sectors[sectorKey] = {
    label: `${sectorKey} Sector`,
    zones,
    bounds: {
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minY: Math.min(...ys) - pad,
      maxY: Math.max(...ys) + pad,
    },
    zoneCenters: Object.fromEntries(zones.map((z) => {
      const zs = structures.filter(s => s.zone === z);
      const ax = zs.reduce((n, s) => n + s.x, 0) / zs.length;
      const ay = zs.reduce((n, s) => n + s.y, 0) / zs.length;
      return [z, { x: Math.round(ax), y: Math.round(ay) }];
    })),
    structures: [],
  };
}

function updateCenterLandmark(sectorData, structures) {
  const landmark = structures.find(s => TEMPLE_TYPES.has(s.type));
  if (!landmark || !sectorData.zoneCenters) return;
  const key = landmark.zone in sectorData.zoneCenters ? landmark.zone : Object.keys(sectorData.zoneCenters)[0];
  if (key) sectorData.zoneCenters[key] = { x: landmark.x, y: landmark.y };
}

function mergeStructureList(base, overlay) {
  const byId = new Map(base.map(s => [s.id, { ...s }]));
  for (const row of overlay) {
    if (byId.has(row.id)) {
      Object.assign(byId.get(row.id), row);
      continue;
    }
    const near = [...byId.values()].find(s =>
      s.type === row.type && Math.hypot(s.x - row.x, s.y - row.y) <= 12
    );
    if (near) Object.assign(near, row);
    else byId.set(row.id, { ...row });
  }
  return [...byId.values()];
}

function applyOverlay(sectors, overlay, entry) {
  const replaceSet = new Set(entry.replaceSectors || []);
  for (const [sectorKey, rows] of Object.entries(overlay)) {
    ensureSector(sectors, sectorKey, rows);
    if (entry.sectorMode === 'replace_list' && replaceSet.has(sectorKey)) {
      sectors[sectorKey].structures = rows.map(s => ({ ...s }));
    } else {
      sectors[sectorKey].structures = mergeStructureList(sectors[sectorKey].structures || [], rows);
    }
    updateCenterLandmark(sectors[sectorKey], sectors[sectorKey].structures);
  }
}

function migrateDatasetId(id) {
  return LEGACY_DATASET_IDS[id] || id;
}

export function getEdenDatasetId() {
  const raw = activeDatasetId || localStorage.getItem(EDEN_DATASET_STORAGE_KEY) || '';
  const migrated = migrateDatasetId(raw);
  return migrated || getDefaultEdenDatasetId();
}

export function hasEdenDatasetChoice() {
  const id = getEdenDatasetId();
  return !!id && getCatalog().some(d => d.id === id);
}

export function applyEdenDataset(id) {
  const resolvedId = migrateDatasetId(id);
  const entry = getCatalog().find(d => d.id === resolvedId);
  if (!entry || !datasetStore) return false;
  activeDatasetId = resolvedId;

  if (entry.sectorMode === 'full' && datasetStore.sectors[resolvedId]) {
    activeSectors = JSON.parse(JSON.stringify(datasetStore.sectors[resolvedId]));
  } else {
    activeSectors = cloneBaseSectors();
    const overlay = datasetStore.overlays[resolvedId];
    if (overlay) applyOverlay(activeSectors, overlay, entry);
  }

  localStorage.setItem(EDEN_DATASET_STORAGE_KEY, resolvedId);
  window.dispatchEvent(new CustomEvent('edenDatasetChange', { detail: { id: resolvedId, entry } }));
  return true;
}

export function syncEdenSectorSelect(selectEl, { fullLabel = 'Full Map' } = {}) {
  const el = selectEl || document.getElementById('edenSectorSelect');
  if (!el) return;
  const prev = el.value;
  const sectors = getEdenSectors();
  const opts = [`<option value="FULL">${fullLabel}</option>`];
  for (const [key, sec] of Object.entries(sectors).sort((a, b) => a[0].localeCompare(b[0]))) {
    const label = sec.label ? `${sec.label} (${key})` : key;
    opts.push(`<option value="${key}">${label}</option>`);
  }
  el.innerHTML = opts.join('');
  el.value = (prev === 'FULL' || sectors[prev]) ? prev : 'FULL';
}

export function getEdenSectors() {
  if (!activeSectors) {
    const saved = migrateDatasetId(localStorage.getItem(EDEN_DATASET_STORAGE_KEY) || '');
    const catalog = getCatalog();
    const id = (saved && catalog.some(d => d.id === saved))
      ? saved
      : getDefaultEdenDatasetId();
    if (id && datasetStore && applyEdenDataset(id)) {
      /* applied */
    } else {
      activeSectors = cloneBaseSectors();
    }
  }
  return activeSectors;
}

// Season 5: N1–N4 / S1–S4 = faction staging; C, EC, E, W, WC = central war zone.
export const SECTOR_FACTION = {
  N1: 'north', N2: 'north', N3: 'north', N4: 'north',
  S1: 'south', S2: 'south', S3: 'south', S4: 'south',
  C: 'central', EC: 'central', E: 'central', W: 'central', WC: 'central',
  // Legacy Season 3 keys
  N: 'north', NE: 'north', NW: 'north',
  S: 'south', SE: 'south', SW: 'south',
  NC: 'central', SC: 'central',
};

export const PATH_COLORS = [
  { id: 'red', label: 'Red Alliance', color: '#ef4444' },
  { id: 'blue', label: 'Blue Alliance', color: '#3b82f6' },
  { id: 'purple', label: 'Purple Route', color: '#a855f7' },
  { id: 'yellow', label: 'Yellow Route', color: '#eab308' },
  { id: 'green', label: 'Green / Friendly', color: '#22c55e' },
  { id: 'orange', label: 'Scout / Draft', color: '#f97316' },
];

export function getSectorFaction(sectorKey) {
  return SECTOR_FACTION[sectorKey] || 'all';
}

export function getSectorStructures(sectorKey) {
  const sectors = getEdenSectors();
  if (sectorKey === 'FULL') {
    return Object.entries(sectors).flatMap(([sk, sec]) =>
      sec.structures.map(s => ({ ...s, sector: sk }))
    );
  }
  const sec = sectors[sectorKey];
  return sec ? sec.structures.map(s => ({ ...s, sector: sectorKey })) : [];
}

export function getSectorBounds(sectorKey) {
  const sectors = getEdenSectors();
  if (sectorKey === 'FULL') return { minX: 0, maxX: 1700, minY: 0, maxY: 1600 };
  return sectors[sectorKey]?.bounds || { minX: 0, maxX: 1700, minY: 0, maxY: 1600 };
}

/** Priority order for toolbar quick-jump buttons — filtered to active dataset sectors. */
const QUICK_JUMP_ORDER = [
  'C', 'EC', 'WC', 'E', 'W',
  'NC', 'SC', 'N', 'S',
  'N1', 'N2', 'N3', 'N4',
  'S1', 'S2', 'S3', 'S4',
  'NE', 'NW', 'SE', 'SW',
];

export function getQuickJumpSectors(max = 7) {
  const available = new Set(Object.keys(getEdenSectors()));
  const picked = [];
  for (const key of QUICK_JUMP_ORDER) {
    if (!available.has(key)) continue;
    picked.push(key);
    if (picked.length >= max) break;
  }
  return picked;
}

export function isEdenSectorKey(key) {
  return key === 'FULL' || Boolean(getEdenSectors()[key]);
}

/** Parse in-game coord strings: 800:800, 800,800, 800 800, X:800 Y:800 */
export function parseCoordInput(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;

  let m = s.match(/x\s*:?\s*(\d+)\s*[,;\s]+\s*y\s*:?\s*(\d+)/i);
  if (m) return { x: Number(m[1]), y: Number(m[2]) };

  m = s.match(/^(\d{1,4})\s*[:;,]\s*(\d{1,4})$/);
  if (m) return { x: Number(m[1]), y: Number(m[2]) };

  m = s.match(/^(\d{1,4})\s+(\d{1,4})$/);
  if (m) return { x: Number(m[1]), y: Number(m[2]) };

  return null;
}

/** Nearest occupation structure within tolerance (game tiles). */
export function findStructureByCoords(x, y, tolerance = 14) {
  let best = null;
  let bestD = Infinity;
  for (const [sector, sec] of Object.entries(getEdenSectors())) {
    for (const s of sec.structures) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d <= tolerance && d < bestD) {
        best = { ...s, sector };
        bestD = d;
      }
    }
  }
  return best;
}

/** Smallest sector bounds that contain the point. */
export function findSectorForCoords(x, y) {
  let best = null;
  let bestArea = Infinity;
  for (const [sk, sec] of Object.entries(getEdenSectors())) {
    const b = sec.bounds;
    if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) {
      const area = (b.maxX - b.minX) * (b.maxY - b.minY);
      if (area < bestArea) {
        best = sk;
        bestArea = area;
      }
    }
  }
  return best;
}

export function getTempleCoords() {
  const c = getEdenSectors().C?.structures || [];
  const landmark = c.find(s => TEMPLE_TYPES.has(s.type));
  return landmark ? { x: landmark.x, y: landmark.y } : { x: 800, y: 800 };
}

export const X1_PLANNING_TARGETS = [
  { name: 'Temple Push', team: 'Alliance', x: 800, y: 800 },
  { name: 'NC1 Cap', team: 'North', x: 551, y: 660 },
  { name: 'W Gate Line', team: 'West', x: 280, y: 720 },
  { name: 'E Stronghold', team: 'East', x: 1280, y: 640 },
  { name: 'S Desert Town', team: 'South', x: 620, y: 1180 },
  { name: 'NE Rally', team: 'North', x: 980, y: 420 },
];
