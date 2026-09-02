export const STAMINA_PROJECTION_HOURS = 24;
export const MS_PER_HOUR = 3_600_000;

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeOp(value, index) {
  if (!value || typeof value !== 'object') return null;
  const id = String(value.id || `op-${index + 1}`);
  const cost = normalizeNumber(value.cost, 0);
  if (cost <= 0) return null;
  return {
    id,
    name: String(value.name || id).slice(0, 120),
    cost,
    desiredCount: Math.max(Math.floor(normalizeNumber(value.desiredCount, 1)), 0),
  };
}

function normalizeProjectionInput(input) {
  const capacity = normalizeNumber(input?.capacity, 0);
  if (capacity <= 0) throw new TypeError('Stamina projection requires capacity > 0.');
  const regenPerHour = normalizeNumber(input?.regenPerHour, 0);
  if (regenPerHour <= 0) throw new TypeError('Stamina projection requires regenPerHour > 0.');
  const currentStamina = Math.min(Math.max(normalizeNumber(input?.currentStamina, 0), 0), capacity);
  const ops = Array.isArray(input?.ops)
    ? input.ops.map(normalizeOp).filter(Boolean).slice(0, 50)
    : [];
  let startTime;
  if (input?.startTime === undefined || input?.startTime === null) {
    startTime = new Date();
  } else {
    const epoch = Number(input.startTime);
    if (!Number.isFinite(epoch)) {
      throw new TypeError('Stamina projection requires a valid startTime.');
    }
    startTime = new Date(epoch);
  }
  if (Number.isNaN(startTime.getTime())) throw new TypeError('Stamina projection requires a valid startTime.');
  return { capacity, regenPerHour, currentStamina, ops, startTime };
}

function staminaAt(capacity, currentStamina, regenPerHour, hours) {
  return Math.min(capacity, currentStamina + hours * regenPerHour);
}

export function computeStaminaProjection(input) {
  const { capacity, regenPerHour, currentStamina, ops, startTime } = normalizeProjectionInput(input);
  const hoursToFull =
    capacity - currentStamina <= 0 ? 0 : Math.ceil((capacity - currentStamina) / regenPerHour);
  const timeToFullMs = hoursToFull * MS_PER_HOUR;

  const timeline = [];
  for (let hour = 0; hour <= STAMINA_PROJECTION_HOURS; hour++) {
    const stamina = staminaAt(capacity, currentStamina, regenPerHour, hour);
    const atMs = startTime.getTime() + hour * MS_PER_HOUR;
    const affordable = ops
      .filter((op) => op.desiredCount > 0 && stamina >= op.cost)
      .map((op) => op.id);
    timeline.push(
      Object.freeze({
        atMs,
        iso: new Date(atMs).toISOString(),
        stamina: Math.floor(stamina * 100) / 100,
        affordable: Object.freeze(affordable),
      })
    );
  }

  const perOp = ops.map((op) => {
    const firstAffordableHour = timeline.findIndex((step) => step.affordable.includes(op.id));
    let gapStart = null;
    const capacityGaps = [];
    timeline.forEach((step, index) => {
      const inGap = step.stamina < op.cost;
      if (inGap && gapStart === null) gapStart = index;
      if (!inGap && gapStart !== null) {
        capacityGaps.push(
          Object.freeze({
            fromMs: timeline[gapStart].atMs,
            toMs: step.atMs,
          })
        );
        gapStart = null;
      }
    });
    if (gapStart !== null) {
      capacityGaps.push(
        Object.freeze({
          fromMs: timeline[gapStart].atMs,
          toMs: timeline[timeline.length - 1].atMs + MS_PER_HOUR,
        })
      );
    }
    return Object.freeze({
      id: op.id,
      name: op.name,
      cost: op.cost,
      desiredCount: op.desiredCount,
      firstAvailableAt: firstAffordableHour >= 0 ? timeline[firstAffordableHour].iso : null,
      capacityGaps: Object.freeze(capacityGaps),
    });
  });

  const summary = Object.freeze({
    hoursToFull,
    timeToFullMs,
    opsCount: ops.length,
    zeroCapacityOps: ops.filter((op) => op.cost > capacity).map((op) => op.id),
  });

  return Object.freeze({
    capacity,
    regenPerHour,
    currentStamina,
    startTimeIso: startTime.toISOString(),
    timeline: Object.freeze(timeline),
    perOp: Object.freeze(perOp),
    summary,
  });
}

export function buildStaminaOperationCard(projection, options = {}) {
  if (!projection || typeof projection !== 'object') {
    throw new TypeError('Operation card requires a stamina projection.');
  }
  const title = String(options.title || 'Stamina Operation Card').slice(0, 140);
  const lines = [
    `Capacity ${projection.capacity} · Regen ${projection.regenPerHour}/h · Now ${projection.currentStamina}`,
    `Full in ${projection.summary.hoursToFull}h (${projection.summary.timeToFullMs} ms)`,
  ];
  for (const op of projection.perOp) {
    lines.push(
      `${op.name} · ${op.cost}/op · x${op.desiredCount} · first ${op.firstAvailableAt || 'never'}`
    );
  }
  if (projection.summary.zeroCapacityOps.length) {
    lines.push(`Unrunnable at capacity: ${projection.summary.zeroCapacityOps.join(', ')}`);
  }
  return Object.freeze({
    title,
    lines: Object.freeze(lines),
    ops: Object.freeze(
      projection.perOp.map((op) =>
        Object.freeze({
          id: op.id,
          name: op.name,
          cost: op.cost,
          desiredCount: op.desiredCount,
          firstAvailableAt: op.firstAvailableAt,
        })
      )
    ),
    generatedAt: new Date().toISOString(),
  });
}
