// js/specialization-routes.js
// Suggested paths through the specialization towers.
//
// The recommended orders are community plans captured from EndGameOdyssey/Cris'
// unit-specialty charts (2026-08-13), not derived numbers: the order a tower is
// worth funding in depends on which passives and legion skills pay off in real
// battles, which no cost heuristic can see. Each troop plans differently, and
// archers split further by whether you own the paid rally heroes:
//
// - spender: you have Ramses/Boudica, so archer power is worth front-loading.
// - f2p: no Ramses/Boudica, so the plan leans on the training line instead.
//
// Only columns I-IV are captured. Anything past that is appended by the old
// cost heuristic so a route still covers every research: cheapest power first.

import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
} from './specialization-towers-v2-data.js';

const OFFENSIVE_CONTEXTS = new Set([
  'initiatingRally',
  'siegeAttacks',
  'siege',
  'roc',
  'battlefield',
]);

export const SPECIALIZATION_ROUTE_IDS = ['spender', 'f2p'];
export const SPECIALIZATION_ROUTE_TROOPS = ['archer', 'cavalry', 'footman'];

// Why a step sits where it does, in the plan author's own terms. Keyed by troop
// then research; shown as guidance next to the step number. These describe game
// effects, so they live with the game data rather than the UI string files.
const ROUTE_RATIONALE = Object.freeze({
  cavalry: Object.freeze({
    training1: 'Every 25% power loss, 50% chance to steal 25% Might.',
    training2: 'Rounds 1-4, enemy first row takes +10% skill damage.',
    training3: 'Every 25% power loss, 50% chance to steal 5% skill and physical damage.',
    siege1: 'From round 1, +10% Might each round.',
    callofglory1: 'Rounds 3-6, if cavalry has the higher power, +80% Might.',
    callofglory2: 'Rounds 3-6, if cavalry has the lower power, +80% Resistance.',
    enhanced1: 'Rounds 1-4, enemy first row takes +10% skill damage.',
    enhanced2: 'Round 2, if cavalry has the lower power, -30% damage from the next attack.',
    encounter1: 'If the squad is all cavalry, +10 combat speed.',
    encounter2: 'Rounds 1-4, enemy first row takes +10% physical damage.',
    neat1: 'Rounds 6-8, if cavalry has the higher power, +10% skill damage.',
    defensive1: '-5% damage taken while in controlling status.',
  }),
});

// Where a plan is defined by owning specific heroes, say so instead of leaving
// the generic "paid heroes" wording. Each troop names the paid heroes whose kits
// the paid plan is built around; the full per-hero reasoning lives in
// `specialization-hero-paths.js`, which is what the in-tab path planner reads.
const ROUTE_LABELS = Object.freeze({
  archer: Object.freeze({
    spender: 'Boudica / Ramses II / Beowulf — full archers',
    f2p: 'No paid archers — archers in a mixed march',
  }),
  cavalry: Object.freeze({
    spender: "Jeanne d'Arc / Lancelot / Cyrus — full cavalry",
    f2p: 'No paid cavalry — cavalry in a mixed march',
  }),
  footman: Object.freeze({
    spender: 'King Arthur / Theodora / Alexander — full footmen',
    f2p: 'No paid footmen — footmen in a mixed march',
  }),
});

const ROUTE_HEROES = Object.freeze({
  archer: Object.freeze({ spender: Object.freeze(['Boudica', 'Ramses II', 'Beowulf']) }),
  cavalry: Object.freeze({ spender: Object.freeze(["Jeanne d'Arc", 'Lancelot', 'Cyrus']) }),
  footman: Object.freeze({ spender: Object.freeze(['King Arthur', 'Theodora', 'Alexander']) }),
});

/** Hero-specific label for a plan, or '' when the generic one should be used. */
export function getRouteLabel(routeId, troopId = 'cavalry') {
  return ROUTE_LABELS[troopId]?.[routeId] || '';
}

/** Heroes the plan assumes you own, or [] when it assumes none. */
export function getRouteHeroes(routeId, troopId = 'cavalry') {
  return ROUTE_HEROES[troopId]?.[routeId] || [];
}

// Curated column I-IV orders, transcribed from the charts.
const CURATED_ORDERS = Object.freeze({
  archer: Object.freeze({
    // "Boudica/Ramses, full archers": rally payoffs first, training line after.
    spender: Object.freeze([
      'training1',
      'callofglory1',
      'enhanced1',
      'encounter1',
      'training2',
      'siege1',
      'neat1',
      'defensive1',
      'training3',
      'encounter2',
      'callofglory2',
      'enhanced2',
      'training4',
    ]),
    // "No Boudica/Ramses, archers in a mixed march": training line first.
    f2p: Object.freeze([
      'training1',
      'training2',
      'training3',
      'callofglory2',
      'callofglory1',
      'encounter2',
      'siege1',
      'enhanced1',
      'encounter1',
      'neat1',
      'defensive1',
      'enhanced2',
      'training4',
    ]),
  }),
  cavalry: Object.freeze({
    shared: Object.freeze([
      'training1',
      'training2',
      'siege1',
      'callofglory1',
      'training3',
      'callofglory2',
      'enhanced1',
      'encounter1',
      'neat1',
      'defensive1',
      'enhanced2',
      'encounter2',
    ]),
  }),
  footman: Object.freeze({
    shared: Object.freeze([
      'training1',
      'callofglory1',
      'training2',
      'siege1',
      'enhanced1',
      'training3',
      'enhanced2',
      'callofglory2',
      'encounter2',
      'encounter1',
      'defensive1',
      'neat1',
      'training4',
    ]),
  }),
});

function profileResearch(research) {
  let offensive = 0;
  let total = 0;
  (research?.nodes || []).forEach((node) => {
    const value = Number(node.bonusValue) || 0;
    total += value;
    if (OFFENSIVE_CONTEXTS.has(node.context || 'general')) offensive += value;
  });
  const cost = Number(research?.cost) || 0;
  return {
    offensive,
    total,
    cost,
    // Medals per 1% of bonus. A research with no measured bonus sorts last.
    efficiency: total > 0 ? cost / total : Number.POSITIVE_INFINITY,
  };
}

function buildRoute(compare) {
  const order = [];
  Object.keys(SPECIALIZATION_COLUMNS)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((columnId) => {
      const researches = (SPECIALIZATION_COLUMNS[columnId]?.researches || []).map((id) => ({
        id,
        ...profileResearch(SPECIALIZATION_RESEARCH[id]),
      }));
      researches.sort(compare).forEach((entry) => order.push(entry.id));
    });
  return order;
}

const HEURISTIC = Object.freeze({
  spender: Object.freeze(
    buildRoute(
      (a, b) => b.offensive - a.offensive || a.efficiency - b.efficiency || a.cost - b.cost
    )
  ),
  f2p: Object.freeze(buildRoute((a, b) => a.efficiency - b.efficiency || a.cost - b.cost)),
});

function curatedOrder(troopId, routeId) {
  const byTroop = CURATED_ORDERS[troopId];
  if (!byTroop) return [];
  return byTroop[routeId] || byTroop.shared || [];
}

// Curated prefix first, then whatever the heuristic covers that it did not.
function composeOrder(troopId, routeId) {
  const curated = curatedOrder(troopId, routeId).filter((id) => SPECIALIZATION_RESEARCH[id]);
  const seen = new Set(curated);
  const tail = (HEURISTIC[routeId] || HEURISTIC.f2p).filter((id) => !seen.has(id));
  return Object.freeze([...curated, ...tail]);
}

const ORDERS = Object.freeze(
  Object.fromEntries(
    SPECIALIZATION_ROUTE_TROOPS.map((troopId) => [
      troopId,
      Object.freeze(
        Object.fromEntries(
          SPECIALIZATION_ROUTE_IDS.map((routeId) => [routeId, composeOrder(troopId, routeId)])
        )
      ),
    ])
  )
);

export const SPECIALIZATION_ROUTES = Object.freeze(
  Object.fromEntries(
    SPECIALIZATION_ROUTE_IDS.map((routeId) => [
      routeId,
      Object.freeze({ id: routeId, byTroop: ORDERS }),
    ])
  )
);

/** How many of a route's researches come from the captured community plan. */
export function getCuratedLength(routeId, troopId = 'cavalry') {
  return curatedOrder(troopId, routeId).filter((id) => SPECIALIZATION_RESEARCH[id]).length;
}

export function getRouteOrder(routeId, troopId = 'cavalry') {
  return ORDERS[troopId]?.[routeId] || ORDERS.cavalry?.[routeId] || [];
}

/** 1-based position of a research in a route, or 0 when the route does not cover it. */
export function getRouteStep(routeId, researchId, troopId = 'cavalry') {
  return getRouteOrder(routeId, troopId).indexOf(researchId) + 1;
}

/** The plan author's reason for taking a research, or '' when none was captured. */
export function getRouteRationale(researchId, troopId = 'cavalry') {
  return ROUTE_RATIONALE[troopId]?.[researchId] || '';
}

/**
 * The first research in the route that is not finished yet.
 * `isComplete(researchId)` decides what counts as done for the current troop.
 */
export function getNextRouteResearch(routeId, isComplete, troopId = 'cavalry') {
  return getRouteOrder(routeId, troopId).find((researchId) => !isComplete(researchId)) || null;
}
