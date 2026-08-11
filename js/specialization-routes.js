// js/specialization-routes.js
// Suggested paths through the specialization towers.
//
// Both routes keep the game's column order (I through VIII) and only decide which of a
// column's four researches to take first. Orders are derived from the research data rather
// than hard-coded, so they stay correct when costs or node tables change.
//
// - spender: rally leading and siege offence first. Ranks by how much of a research's
//   bonus sits on offensive contexts, then by medal efficiency.
// - f2p: easy fast wins. Ranks purely by medal efficiency (medals per 1% of bonus), so the
//   cheapest power lands first.

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

const spenderOrder = buildRoute(
  (a, b) => b.offensive - a.offensive || a.efficiency - b.efficiency || a.cost - b.cost
);

const f2pOrder = buildRoute((a, b) => a.efficiency - b.efficiency || a.cost - b.cost);

export const SPECIALIZATION_ROUTES = Object.freeze({
  spender: Object.freeze({ id: 'spender', order: Object.freeze(spenderOrder) }),
  f2p: Object.freeze({ id: 'f2p', order: Object.freeze(f2pOrder) }),
});

export function getRouteOrder(routeId) {
  return SPECIALIZATION_ROUTES[routeId]?.order || [];
}

/** 1-based position of a research in a route, or 0 when the route does not cover it. */
export function getRouteStep(routeId, researchId) {
  return getRouteOrder(routeId).indexOf(researchId) + 1;
}

/**
 * The first research in the route that is not finished yet.
 * `isComplete(researchId)` decides what counts as done for the current troop.
 */
export function getNextRouteResearch(routeId, isComplete) {
  return getRouteOrder(routeId).find((researchId) => !isComplete(researchId)) || null;
}
