// js/specialization-topologies.js
// Exact in-game node topologies, transcribed from screenshots of the live game.
//
// Every research draws as one or more closed loops of attribute nodes, each loop ending in
// an anchor node that carries the loop's headline effect (a Vitality node, or the
// research's immunity passive). The node ids below are the ids already used in
// SPECIALIZATION_RESEARCH, so this file only adds shape - never new nodes or values.
//
// Pilot set: three researches, one of each shape family. The remaining 29 follow once
// these are confirmed against the game.

export const SPECIALIZATION_TOPOLOGY_SOURCE = 'in-game-screenshots-2026-08-11';

export const SPECIALIZATION_TOPOLOGIES = Object.freeze({
  // Single loop, immunity passive at the bottom of the ring.
  // Screenshot: 13 attribute nodes around an oval, "Demonic Backlash" at the base,
  // "Survival in the Wild" (the HP node) at the crown.
  encounter4: Object.freeze({
    shape: 'loop',
    crownNodeId: 3,
    groups: Object.freeze([
      Object.freeze({
        id: 'main',
        loopNodeIds: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
        anchorNodeId: 14,
      }),
    ]),
  }),

  // Single loop, immunity passive at the crown.
  // Screenshot: 10 attribute nodes around a ring with "Solid Armor" at the top.
  training7: Object.freeze({
    shape: 'loop',
    crownNodeId: 11,
    groups: Object.freeze([
      Object.freeze({
        id: 'main',
        loopNodeIds: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        anchorNodeId: 11,
      }),
    ]),
  }),

  // Three identical loops, one per battle row. The node names carry the row: Vanguard's
  // (front), Great/Secret/Smart/Solid (mid), Rearguard's (back). Each loop closes on its
  // own Vitality node, which the game shows as a green heart.
  // Screenshot: two loops side by side above, one loop below, sharing the centre emblem.
  neat3: Object.freeze({
    shape: 'triple-loop',
    crownNodeId: null,
    groups: Object.freeze([
      Object.freeze({
        id: 'vanguard',
        row: 'front',
        loopNodeIds: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        anchorNodeId: 11,
      }),
      Object.freeze({
        id: 'centre',
        row: 'mid',
        loopNodeIds: Object.freeze([12, 13, 14, 15, 16, 17, 18, 19, 20, 21]),
        anchorNodeId: 22,
      }),
      Object.freeze({
        id: 'rearguard',
        row: 'back',
        loopNodeIds: Object.freeze([23, 24, 25, 26, 27, 28, 29, 30, 31, 32]),
        anchorNodeId: 33,
      }),
    ]),
  }),
});

export function getSpecializationTopology(researchId) {
  return SPECIALIZATION_TOPOLOGIES[researchId] || null;
}

export function hasSpecializationTopology(researchId) {
  return Boolean(SPECIALIZATION_TOPOLOGIES[researchId]);
}

/** Every node id a topology references, in draw order. */
export function getTopologyNodeIds(researchId) {
  const topology = getSpecializationTopology(researchId);
  if (!topology) return [];
  const ids = [];
  topology.groups.forEach((group) => {
    group.loopNodeIds.forEach((id) => ids.push(id));
    ids.push(group.anchorNodeId);
  });
  return ids;
}
