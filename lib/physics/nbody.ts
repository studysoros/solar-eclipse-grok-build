/**
 * N-body gravitational system and integrators.
 * Pure module — no React, no three.js, no side effects except math.
 *
 * Current implementation: simple leapfrog (velocity Verlet) for good
 * long-term energy behavior on solar-system scales.
 *
 * All functions operate on plain objects for easy worker transfer.
 */

import { add, scale, sub, lengthSq, type Vec3 } from "./vec3";
import { G } from "./constants";
import type { Body, SimulationState, Integrator, PropagateOptions } from "./types";

/**
 * Compute acceleration on each body due to all others (Newtonian gravity).
 * O(n^2) — fine for 10 bodies. Later we can add Barnes-Hut or other if n grows.
 */
function computeAccelerations(bodies: Body[]): Vec3[] {
  const n = bodies.length;
  const accs: Vec3[] = bodies.map(() => ({ x: 0, y: 0, z: 0 }));

  for (let i = 0; i < n; i++) {
    const bi = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const bj = bodies[j];
      const r = sub(bj.pos, bi.pos);
      const r2 = lengthSq(r);
      if (r2 === 0) continue; // avoid singularity (bodies at same point)

      // a = G * m / r^2  in direction of unit vector
      const invR = 1 / Math.sqrt(r2);
      const s = G * invR * invR * invR; // G / r^3

      const forceOnI = scale(r, s * bj.mass);
      const forceOnJ = scale(r, -s * bi.mass);

      accs[i] = add(accs[i], forceOnI);
      accs[j] = add(accs[j], forceOnJ);
    }
  }
  return accs;
}

/**
 * Leapfrog (velocity Verlet) single step.
 * Symplectic — excellent conservation properties for gravitational systems.
 * dt in days.
 */
export function leapfrogStep(state: SimulationState, dt: number): SimulationState {
  const { jd, bodies } = state;

  // Work on copies
  const newBodies: Body[] = bodies.map((b) => ({
    id: b.id,
    mass: b.mass,
    pos: { ...b.pos },
    vel: { ...b.vel },
  }));

  // 1. Half-step velocities using current accelerations
  const accs = computeAccelerations(newBodies);
  for (let i = 0; i < newBodies.length; i++) {
    const vHalf = add(newBodies[i].vel, scale(accs[i], dt / 2));
    newBodies[i].vel = vHalf;
  }

  // 2. Full-step positions using half velocities
  for (let i = 0; i < newBodies.length; i++) {
    newBodies[i].pos = add(newBodies[i].pos, scale(newBodies[i].vel, dt));
  }

  // 3. Recompute accelerations at new positions
  const accsNew = computeAccelerations(newBodies);

  // 4. Complete velocity step
  for (let i = 0; i < newBodies.length; i++) {
    newBodies[i].vel = add(newBodies[i].vel, scale(accsNew[i], dt / 2));
  }

  return {
    jd: jd + dt,
    bodies: newBodies,
  };
}

/** Default integrator (currently leapfrog). Swap here to experiment. */
export const defaultIntegrator: Integrator = leapfrogStep;

/**
 * Propagate the system forward by (dt * steps) days.
 * Returns the final state. Use onStep to record history (e.g. for trails).
 */
export function propagate(
  initial: SimulationState,
  options: PropagateOptions,
  integrator: Integrator = defaultIntegrator
): SimulationState {
  let state = initial;
  const { dt, steps, onStep } = options;

  for (let s = 0; s < steps; s++) {
    state = integrator(state, dt);
    if (onStep) onStep(state);
  }
  return state;
}

/** Convenience: create initial state from the constants catalog (for demos). */
export function createInitialState(bodies: Body[] = []): SimulationState {
  // If empty, caller should populate from INITIAL_BODIES mapped to Body shape.
  return {
    jd: 2451545.0, // J2000.0 approx
    bodies,
  };
}
