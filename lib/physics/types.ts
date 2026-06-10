/**
 * Core domain types for the pure physics layer.
 * These are the contracts between the integrator, system, worker, and viz.
 * Keep them minimal and serializable (for worker postMessage).
 */

import type { Vec3 } from "./vec3";

export interface Body {
  id: string;
  mass: number;
  /** Position in AU (per unit policy in constants.ts) */
  pos: Vec3;
  /** Velocity in AU/day */
  vel: Vec3;
}

export interface SimulationState {
  /** Simulation time as Julian Date (JD). Internal canonical time. */
  jd: number;
  bodies: Body[];
}

export interface SimulationSnapshot {
  jd: number;
  bodies: Array<{
    id: string;
    pos: Vec3; // AU
  }>;
}

/** Function that advances the system by dt (days) and mutates or returns new state. */
export type Integrator = (state: SimulationState, dt: number) => SimulationState;

/** Options for propagation. */
export interface PropagateOptions {
  /** Time step in days (smaller = more accurate, slower). */
  dt: number;
  /** Number of steps to take. */
  steps: number;
  /** Optional callback after each step (useful for recording trails in worker). */
  onStep?: (state: SimulationState) => void;
}
