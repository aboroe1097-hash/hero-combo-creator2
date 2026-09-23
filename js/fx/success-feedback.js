/**
 * Confirmed-success celebration entry point (16.5.0 plan §4.3).
 *
 * celebrate(anchor) is called only after an existing action has already
 * confirmed success, and it is purely additive: it returns false and does
 * nothing when motion is not allowed, when the particle module cannot run, or
 * when the pool is at its rate/node cap. Callers must never gate success UI on
 * this function, and it never throws, so a missing import or a blocked WAAPI
 * cannot turn a successful save into an error.
 */

import { createMotionPolicy } from './motion-policy.js';
import { createParticlePool } from './particles.js';

let policy = null;
let pool = null;

export function celebrate(anchor, options = {}) {
  try {
    const doc = options.document || globalThis.document;
    const win = options.window || globalThis;
    if (!doc || !anchor) return false;
    if (!policy) policy = createMotionPolicy({ window: win, document: doc });
    if (!policy.snapshot().allowed) return false;
    if (!pool) pool = createParticlePool({ document: doc });
    return pool.burst(anchor, options);
  } catch {
    return false;
  }
}

export function disposeSuccessFeedback() {
  pool?.dispose();
  pool = null;
  policy?.dispose();
  policy = null;
}
