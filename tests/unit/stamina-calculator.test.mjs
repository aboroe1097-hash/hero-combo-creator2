import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MS_PER_HOUR,
  buildStaminaOperationCard,
  computeStaminaProjection,
} from '../../js/stamina-calculator.js';

const startTime = new Date('2026-09-02T12:00:00Z').getTime();

test('projection computes time to full from regen rate', () => {
  const projection = computeStaminaProjection({
    capacity: 100,
    currentStamina: 20,
    regenPerHour: 10,
    ops: [],
    startTime,
  });
  assert.equal(projection.summary.hoursToFull, 8);
  assert.equal(projection.summary.timeToFullMs, 8 * MS_PER_HOUR);
  assert.equal(projection.timeline.length, 25);
});

test('timeline caps stamina at capacity', () => {
  const projection = computeStaminaProjection({
    capacity: 30,
    currentStamina: 20,
    regenPerHour: 10,
    ops: [],
    startTime,
  });
  for (const step of projection.timeline) {
    assert.ok(step.stamina <= 30);
  }
  assert.equal(projection.timeline[0].stamina, 20);
  assert.equal(projection.timeline[24].stamina, 30);
});

test('affordable ops respect cost and desired count', () => {
  const projection = computeStaminaProjection({
    capacity: 100,
    currentStamina: 20,
    regenPerHour: 10,
    ops: [
      { id: 'cheap', name: 'Cheap hit', cost: 20, desiredCount: 99 },
      { id: 'late', name: 'Late hit', cost: 90, desiredCount: 1 },
    ],
    startTime,
  });
  assert.ok(projection.timeline[0].affordable.includes('cheap'));
  assert.ok(!projection.timeline[0].affordable.includes('late'));
  const firstLate = projection.timeline.find((step) => step.affordable.includes('late'));
  assert.ok(firstLate);
  assert.ok(firstLate.atMs >= startTime + 7 * MS_PER_HOUR);
});

test('per-op capacity gaps merge consecutive hours', () => {
  const projection = computeStaminaProjection({
    capacity: 100,
    currentStamina: 0,
    regenPerHour: 10,
    ops: [{ id: 'big', name: 'Big hit', cost: 50, desiredCount: 1 }],
    startTime,
  });
  const op = projection.perOp[0];
  assert.equal(op.capacityGaps.length, 1);
  assert.equal(op.capacityGaps[0].fromMs, startTime);
  assert.equal(op.capacityGaps[0].toMs, startTime + 5 * MS_PER_HOUR);
  assert.equal(op.firstAvailableAt, new Date(startTime + 5 * MS_PER_HOUR).toISOString());
});

test('unrunnable ops are reported without crashing the projection', () => {
  const projection = computeStaminaProjection({
    capacity: 50,
    currentStamina: 0,
    regenPerHour: 5,
    ops: [{ id: 'huge', name: 'Huge hit', cost: 500, desiredCount: 1 }],
    startTime,
  });
  assert.deepEqual(projection.summary.zeroCapacityOps, ['huge']);
  assert.equal(projection.perOp[0].firstAvailableAt, null);
});

test('invalid inputs throw with actionable messages', () => {
  assert.throws(() => computeStaminaProjection({}), /capacity > 0/);
  assert.throws(
    () => computeStaminaProjection({ capacity: 10, regenPerHour: 0 }),
    /regenPerHour > 0/
  );
  assert.throws(
    () => computeStaminaProjection({ capacity: 10, regenPerHour: 1, startTime: 'nope' }),
    /valid startTime/
  );
});

test('operation card carries ops and summary lines without identifiers', () => {
  const projection = computeStaminaProjection({
    capacity: 100,
    currentStamina: 20,
    regenPerHour: 10,
    ops: [{ id: 'op-1', name: 'Rally', cost: 25, desiredCount: 2 }],
    startTime,
  });
  const card = buildStaminaOperationCard(projection, { title: 'Friday push' });
  assert.equal(card.title, 'Friday push');
  assert.ok(card.lines.some((line) => line.includes('Full in 8h')));
  assert.equal(card.ops.length, 1);
  const cardText = `${card.title}\n${card.lines.join('\n')}`;
  assert.ok(!/player|alliance|member/i.test(cardText));
  assert.throws(() => buildStaminaOperationCard(null), /requires a stamina projection/);
});

test('projection is deterministic for a fixed start time', () => {
  const a = computeStaminaProjection({
    capacity: 90,
    currentStamina: 15,
    regenPerHour: 12,
    ops: [{ id: 'x', name: 'X', cost: 30, desiredCount: 1 }],
    startTime,
  });
  const b = computeStaminaProjection({
    capacity: 90,
    currentStamina: 15,
    regenPerHour: 12,
    ops: [{ id: 'x', name: 'X', cost: 30, desiredCount: 1 }],
    startTime,
  });
  assert.deepEqual(a, b);
});
