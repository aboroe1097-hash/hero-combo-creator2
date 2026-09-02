import { normalizeVerificationStatus } from './research-planner-model.js';

export function normalizeDiscountPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < 0) return 0;
  return Math.min(percent, 100);
}

export function normalizeDiscounts(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return Object.freeze({
    architect: normalizeDiscountPercent(source.architect),
    builder: normalizeDiscountPercent(source.builder),
    research: normalizeDiscountPercent(source.research),
  });
}

export function computeDiscountFactor(discounts) {
  const { architect, builder, research } = normalizeDiscounts(discounts);
  return (1 - architect / 100) * (1 - builder / 100) * (1 - research / 100);
}

export function normalizeCastleCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    throw new TypeError('Castle catalog must be an object.');
  }
  if (Array.isArray(catalog.buildings)) {
    return Object.freeze({ castleLevels: catalog.castleLevels, buildings: catalog.buildings });
  }
  const castleLevels = Array.isArray(catalog.castleLevels)
    ? catalog.castleLevels.map((entry) => {
        const level = Number(entry?.level);
        if (!Number.isFinite(level) || level < 1) {
          throw new TypeError('Castle catalog has a castleLevels entry without a valid level.');
        }
        const requires = {};
        for (const [buildingId, requiredLevel] of Object.entries(entry.requires || {})) {
          const levelValue = Number(requiredLevel);
          if (Number.isFinite(levelValue) && levelValue >= 0) {
            requires[buildingId] = Math.floor(levelValue);
          }
        }
        return Object.freeze({ level: Math.floor(level), requires: Object.freeze(requires) });
      })
    : [];
  const buildings = Object.entries(catalog.buildings || {}).map(([buildingId, building]) => {
    if (!building || typeof building !== 'object') {
      throw new TypeError(`Castle catalog building "${buildingId}" must be an object.`);
    }
    const levels = Array.isArray(building.levels)
      ? building.levels
          .map((entry) => ({
            level: Number(entry?.level),
            resources: Object.freeze(
              (Array.isArray(entry?.resources) ? entry.resources : [])
                .map((resource) =>
                  Object.freeze({
                    type: String(resource?.type || 'resource'),
                    amount: Number(resource?.amount) >= 0 ? Number(resource.amount) : 0,
                  })
                )
                .filter((resource) => resource.amount > 0)
            ),
            timeMinutes: Number(entry?.timeMinutes) >= 0 ? Number(entry.timeMinutes) : 0,
            gems: Number(entry?.gems) >= 0 ? Number(entry.gems) : 0,
          }))
          .filter((entry) => Number.isFinite(entry.level) && entry.level >= 1)
      : [];
    return Object.freeze({
      id: String(buildingId),
      name: String(building?.name || buildingId),
      maxLevel: Number(building?.maxLevel) >= 0 ? Number(building.maxLevel) : 0,
      verificationStatus: normalizeVerificationStatus(building?.verificationStatus),
      source: String(building?.source || ''),
      credit: String(building?.credit || ''),
      levels: Object.freeze(levels),
    });
  });
  return Object.freeze({ castleLevels: Object.freeze(castleLevels), buildings: Object.freeze(buildings) });
}

export function findCastleBlockers(catalog, currentLevels, targetCastleLevel) {
  const normalized = normalizeCastleCatalog(catalog);
  const target = normalized.castleLevels.find((entry) => entry.level === Number(targetCastleLevel));
  if (!target) return null;
  const levels = currentLevels && typeof currentLevels === 'object' ? currentLevels : {};
  const blockers = [];
  for (const [buildingId, requiredLevel] of Object.entries(target.requires)) {
    const current = Math.max(Math.floor(Number(levels[buildingId]) || 0), 0);
    if (current < requiredLevel) {
      const building = normalized.buildings.find((candidate) => candidate.id === buildingId);
      blockers.push(
        Object.freeze({
          buildingId,
          name: building?.name || buildingId,
          currentLevel: current,
          requiredLevel,
          shortage: requiredLevel - current,
          verificationStatus: building?.verificationStatus || 'unverified',
        })
      );
    }
  }
  return Object.freeze(blockers);
}

export function roundUpDiscount(value) {
  return Math.ceil(Math.round(Number(value) * 100) / 100);
}

export function computeCastlePlan(catalog, input = {}) {
  const normalized = normalizeCastleCatalog(catalog);
  const targetCastleLevel = Number(input?.targetCastleLevel);
  const blockers = findCastleBlockers(normalized, input?.currentLevels, targetCastleLevel);
  if (!blockers) return null;

  const discounts = normalizeDiscounts(input?.discounts);
  const factor = computeDiscountFactor(discounts);
  const buildingById = new Map(normalized.buildings.map((building) => [building.id, building]));

  const upgrades = [];
  for (const blocker of blockers) {
    const building = buildingById.get(blocker.buildingId);
    const levelEntries = building?.levels || [];
    const levelsByValue = new Map(levelEntries.map((entry) => [entry.level, entry]));
    for (let level = blocker.currentLevel + 1; level <= blocker.requiredLevel; level++) {
      const entry = levelsByValue.get(level);
      if (!entry) {
        upgrades.push(
          Object.freeze({
            buildingId: blocker.buildingId,
            name: blocker.name,
            from: level - 1,
            to: level,
            missingData: true,
            quarantined: blocker.verificationStatus !== 'current',
            verificationStatus: blocker.verificationStatus,
            costs: Object.freeze({ resources: [], timeMinutes: 0, gems: 0 }),
          })
        );
        continue;
      }
      const resources = entry.resources.map((resource) =>
        Object.freeze({
          type: resource.type,
          amount: roundUpDiscount(resource.amount * factor),
        })
      );
      upgrades.push(
        Object.freeze({
          buildingId: blocker.buildingId,
          name: blocker.name,
          from: level - 1,
          to: level,
          missingData: false,
          quarantined: blocker.verificationStatus !== 'current',
          verificationStatus: blocker.verificationStatus,
          costs: Object.freeze({
            resources: Object.freeze(resources),
            timeMinutes: roundUpDiscount(entry.timeMinutes * factor),
            gems: entry.gems,
          }),
        })
      );
    }
  }

  const verified = upgrades.filter((upgrade) => !upgrade.quarantined);
  const unverified = upgrades.filter((upgrade) => upgrade.quarantined);
  const summarize = (subset) => {
    const resources = {};
    let timeMinutes = 0;
    let gems = 0;
    for (const upgrade of subset) {
      timeMinutes += upgrade.costs.timeMinutes;
      gems += upgrade.costs.gems;
      for (const resource of upgrade.costs.resources) {
        resources[resource.type] = (resources[resource.type] || 0) + resource.amount;
      }
    }
    return Object.freeze({
      resources: Object.freeze(
        Object.entries(resources).map(([type, amount]) => Object.freeze({ type, amount }))
      ),
      timeMinutes,
      gems,
    });
  };

  return Object.freeze({
    targetCastleLevel,
    blockers,
    upgrades: Object.freeze(upgrades),
    totals: Object.freeze({
      verified: summarize(verified),
      unverified: summarize(unverified),
    }),
    verified: unverified.length === 0,
    discounts,
    assumptions: Object.freeze([
      'Discounts compose multiplicatively: (1 - architect) x (1 - builder) x (1 - research).',
      'Discounted resource and time amounts are rounded up; gem costs are never discounted.',
      'Buildings whose data is not marked current are excluded from verified totals.',
    ]),
  });
}
