/**
 * Basic physics tests for the pure N-body core.
 * These run in plain Node/Vitest with no browser or DOM.
 *
 * Goals (MVP):
 * - 2-body closed(ish) orbit period sanity check.
 * - Energy is "reasonably" conserved over many steps with leapfrog.
 */

import { describe, it, expect } from "vitest";
import { leapfrogStep, propagate, createInitialState } from "../../lib/physics/nbody";
import { INITIAL_BODIES } from "../../lib/physics/constants";
import { dot } from "../../lib/physics/vec3";
import type { SimulationState } from "../../lib/physics/types";

function totalEnergy(state: SimulationState): number {
  // Kinetic
  let ke = 0;
  for (const b of state.bodies) {
    const v2 = dot(b.vel, b.vel);
    ke += 0.5 * b.mass * v2;
  }

  // Potential (pairwise, avoid double count)
  let pe = 0;
  const G = 2.9591220828559115e-4; // same as constants
  for (let i = 0; i < state.bodies.length; i++) {
    for (let j = i + 1; j < state.bodies.length; j++) {
      const bi = state.bodies[i];
      const bj = state.bodies[j];
      const dx = bi.pos.x - bj.pos.x;
      const dy = bi.pos.y - bj.pos.y;
      const dz = bi.pos.z - bj.pos.z;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (r > 0) pe -= G * bi.mass * bj.mass / r;
    }
  }
  return ke + pe;
}

describe("leapfrog N-body (pure)", () => {
  it("advances time and does not explode on a few bodies", () => {
    // Use a small subset for speed in test (Sun + Earth + Moon)
    const sun = INITIAL_BODIES.find((b) => b.id === "sun")!;
    const earth = INITIAL_BODIES.find((b) => b.id === "earth")!;
    const moon = INITIAL_BODIES.find((b) => b.id === "moon")!;

    const initial: SimulationState = createInitialState([
      { id: sun.id, mass: sun.mass, pos: { ...sun.pos }, vel: { ...sun.vel } },
      { id: earth.id, mass: earth.mass, pos: { ...earth.pos }, vel: { ...earth.vel } },
      { id: moon.id, mass: moon.mass, pos: { ...moon.pos }, vel: { ...moon.vel } },
    ]);

    const final = propagate(initial, { dt: 1, steps: 365 }, leapfrogStep);

    expect(final.jd).toBeCloseTo(initial.jd + 365, 6);
    expect(final.bodies.length).toBe(3);

    // Earth should still be roughly 1 AU from Sun after ~1 year (very rough with our init)
    const earthFinal = final.bodies.find((b) => b.id === "earth")!;
    const sunFinal = final.bodies.find((b) => b.id === "sun")!;
    const dist = Math.sqrt(
      (earthFinal.pos.x - sunFinal.pos.x) ** 2 +
        (earthFinal.pos.y - sunFinal.pos.y) ** 2 +
        (earthFinal.pos.z - sunFinal.pos.z) ** 2
    );
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(1.8);
  });

  it("conserves energy reasonably well over many steps (leapfrog property)", () => {
    const sun = INITIAL_BODIES.find((b) => b.id === "sun")!;
    const jupiter = INITIAL_BODIES.find((b) => b.id === "jupiter")!;

    const initial: SimulationState = createInitialState([
      { id: sun.id, mass: sun.mass, pos: { ...sun.pos }, vel: { ...sun.vel } },
      { id: jupiter.id, mass: jupiter.mass, pos: { ...jupiter.pos }, vel: { ...jupiter.vel } },
    ]);

    const e0 = totalEnergy(initial);

    const final = propagate(initial, { dt: 5, steps: 200 }, leapfrogStep); // ~1000 days

    const e1 = totalEnergy(final);
    const relDrift = Math.abs(e1 - e0) / Math.max(1e-12, Math.abs(e0));

    // With our crude initial conditions and leapfrog, we expect small relative drift.
    // This is a smoke test; real validation will compare against reference ephemeris.
    expect(relDrift).toBeLessThan(0.02); // 2% is very loose but sufficient for this starter
  });
});
