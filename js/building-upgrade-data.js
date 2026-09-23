import data from '../database/building-upgrades-26-30.json' with { type: 'json' };

// Source facts are exposed as named constants so the building planner can use
// the community table and Castle direct costs independently.
export const BUILDING_UPGRADE_DATA = Object.freeze({
  sourceUrl: data.sourceUrl,
  observedAt: data.observedAt,
  currency: data.currency,
  totalOrichalcum: data.totalOrichalcum,
  sourceRowCount: data.sourceRowCount,
  sourceColumns: data.sourceColumns,
  sourceCaveat: data.sourceCaveat,
  buildings: data.buildings,
});

export const CASTLE_UPGRADE_COSTS = data.castleUpgradeCosts;
export const CASTLE_UPGRADE_COST_SOURCE = Object.freeze(data.castleUpgradeCostSource);
