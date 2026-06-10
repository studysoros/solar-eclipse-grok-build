/**
 * Physical and astronomical constants + unit policy for the simulator.
 *
 * UNIT POLICY (critical — read before editing any physics code):
 * - Length: Astronomical Units (AU). 1 AU ≈ 1.495978707e11 m (Earth-Sun average).
 * - Mass: Solar masses (M☉). Sun = 1.0.
 * - Time: Days (mean solar days). This combination gives reasonable numbers for
 *   solar-system scale N-body (G in these units is ~2.959e-4 AU^3 day^-2 M☉^-1).
 * - G (gravitational constant) is precomputed for the chosen units below.
 *
 * Why these units?
 * - Long-term numerical stability for symplectic integrators.
 * - Avoids extreme dynamic range (meters + kg + seconds produces tiny or huge numbers).
 * - Common in solar system dynamics literature and tools (JPL, REBOUND examples).
 *
 * When converting from other sources (JPL Horizons, Wikipedia):
 * - Positions are usually in AU or km — convert to AU.
 * - Velocities in AU/day or km/s — convert consistently.
 * - Masses: use M☉ (planet masses are << 1).
 *
 * All values are approximate but sufficient for educational / demonstrative
 * eclipse-season accuracy (target: hours-level timing for events within a few years).
 *
 * For higher precision later: switch to a better ephemeris or canonical units,
 * or extract this module to a WASM crate with arbitrary precision if needed.
 */

import { vec3, type Vec3 } from "./vec3";

/** Gravitational constant in AU^3 day^-2 M☉^-1 (approx). */
export const G = 2.9591220828559115e-4;

/** Solar mass (by definition in our units). */
export const SOLAR_MASS = 1.0;

/** Approximate planet masses in solar masses (useful starting point). */
export const MASSES: Record<string, number> = {
  sun: 1.0,
  mercury: 1.660114e-7,
  venus: 2.4478383e-6,
  earth: 3.0034806e-6,
  mars: 3.227156e-7,
  jupiter: 9.54591e-4,
  saturn: 2.85886e-4,
  uranus: 4.366244e-5,
  neptune: 5.151389e-5,
  // Moon treated as separate body for eclipse accuracy (mass relative to Earth)
  moon: 3.6943e-8, // approx Earth mass * 0.0123
};

/**
 * Very rough initial conditions at a J2000-ish epoch (simplified, for demo).
 * Real work will source better state vectors (from Horizons snippets or VSOP)
 * and will live in lib/astro or a data module.
 *
 * These are NOT high-accuracy and are only to get the sim "moving" plausibly.
 * Positions in AU, velocities in AU/day.
 */
export interface InitialBody {
  id: string;
  mass: number;
  pos: Vec3;
  vel: Vec3;
}

export const INITIAL_BODIES: InitialBody[] = [
  {
    id: "sun",
    mass: MASSES.sun,
    pos: vec3(0, 0, 0),
    vel: vec3(0, 0, 0),
  },
  {
    id: "mercury",
    mass: MASSES.mercury,
    pos: vec3(0.387, 0, 0),
    vel: vec3(0, 0.0474, 0), // very rough circular
  },
  {
    id: "venus",
    mass: MASSES.venus,
    pos: vec3(0.723, 0, 0),
    vel: vec3(0, 0.0350, 0),
  },
  {
    id: "earth",
    mass: MASSES.earth,
    pos: vec3(1.0, 0, 0),
    vel: vec3(0, 0.0172, 0),
  },
  {
    id: "mars",
    mass: MASSES.mars,
    pos: vec3(1.524, 0, 0),
    vel: vec3(0, 0.0140, 0),
  },
  {
    id: "jupiter",
    mass: MASSES.jupiter,
    pos: vec3(5.203, 0, 0),
    vel: vec3(0, 0.0075, 0),
  },
  {
    id: "saturn",
    mass: MASSES.saturn,
    pos: vec3(9.539, 0, 0),
    vel: vec3(0, 0.0055, 0),
  },
  {
    id: "uranus",
    mass: MASSES.uranus,
    pos: vec3(19.18, 0, 0),
    vel: vec3(0, 0.0039, 0),
  },
  {
    id: "neptune",
    mass: MASSES.neptune,
    pos: vec3(30.06, 0, 0),
    vel: vec3(0, 0.0031, 0),
  },
  // Moon — placed near Earth with relative velocity for demo (not accurate)
  {
    id: "moon",
    mass: MASSES.moon,
    pos: vec3(1.00257, 0, 0), // ~0.00257 AU (~384,000 km)
    vel: vec3(0, 0.0172 + 0.00065, 0), // rough orbital addition around Earth
  },
];

/**
 * One day in seconds (for any future time conversions if needed).
 */
export const SECONDS_PER_DAY = 86400;
