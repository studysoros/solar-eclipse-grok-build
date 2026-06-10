/**
 * Thin, pure-ish wrapper around astronomy-engine for reference positions.
 *
 * IMPORTANT: This is **reference / validation data only**.
 * The live N-body simulation (lib/physics) is the source of truth for the interactive sim.
 * Use these functions to:
 *   - Validate our integrator at known epochs
 *   - Provide "real" positions for comparison in the UI
 *   - Seed or cross-check eclipse predictions
 *
 * astronomy-engine is based on VSOP87 (planets) + ELP (Moon) and is accurate to roughly
 * ±1 arcminute for positions over centuries — more than good enough for our validation needs.
 */

import * as Astronomy from "astronomy-engine";
import { vec3, type Vec3, angularSeparationDegrees } from "@/lib/physics/vec3";

/** Supported bodies for reference lookups (extend as needed). */
export type ReferenceBody =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "moon";

const BODY_MAP: Record<ReferenceBody, Astronomy.Body> = {
  sun: Astronomy.Body.Sun,
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  earth: Astronomy.Body.Earth,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
  moon: Astronomy.Body.Moon,
};

/**
 * Convert Julian Date (approx) to a JS Date for astronomy-engine.
 * astronomy-engine's MakeTime / Vector functions accept Date or AstroTime.
 */
function jdToDate(jd: number): Date {
  // JD 2440587.5 ≈ 1970-01-01 00:00 UTC
  return new Date((jd - 2440587.5) * 86400000);
}

/**
 * Returns heliocentric position of a body at the given Julian Date (in AU).
 * For the Sun this returns (0,0,0) by definition in helio coords.
 */
export function getHelioPosition(jd: number, body: ReferenceBody): Vec3 {
  if (body === "sun") return vec3(0, 0, 0);

  const date = jdToDate(jd);
  const astroBody = BODY_MAP[body];
  const vec = Astronomy.HelioVector(astroBody, date);

  // astronomy-engine returns AU for these vectors
  return vec3(vec.x, vec.y, vec.z);
}

/**
 * Returns geocentric position of the Moon (or other body) at the given JD (in AU).
 * Particularly useful for eclipse geometry (Sun-Earth-Moon alignment).
 */
export function getGeoPosition(jd: number, body: ReferenceBody): Vec3 {
  const date = jdToDate(jd);
  const astroBody = BODY_MAP[body];
  const vec = Astronomy.GeoVector(astroBody, date, false); // false = no aberration for simplicity

  return vec3(vec.x, vec.y, vec.z);
}

/**
 * Convenience: get both Sun and Moon geocentric positions (common for eclipse checks).
 */
export function getSunMoonGeo(jd: number): { sun: Vec3; moon: Vec3 } {
  return {
    sun: getGeoPosition(jd, "sun"),
    moon: getGeoPosition(jd, "moon"),
  };
}

// Re-export the shared implementation for convenience in astro code
export { angularSeparationDegrees } from "@/lib/physics/vec3";
