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
import { vec3, type Vec3 } from "@/lib/physics/vec3";

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
 * Convert a Julian Date to an Astronomy Time object.
 */
function jdToAstroTime(jd: number): Astronomy.Time {
  // astronomy-engine Time can be constructed from a JS Date or from a 'tt' value.
  // A simple reliable way: create a Date near the JD and let it handle the conversion,
  // or use the 'from' helpers. For precision we use the known J2000 anchor.
  // astronomy-engine exposes Time.Make or we can use a UTC date approximation.
  // For our purposes, using the built-in conversion via a date is acceptable.
  // JD 2451545.0 = 2000-01-01 12:00 TT
  const date = new Date((jd - 2440587.5) * 86400000); // rough JD to ms since 1970
  return Astronomy.MakeTime(date);
}

/**
 * Returns heliocentric position of a body at the given Julian Date (in AU).
 * For the Sun this returns (0,0,0) by definition in helio coords.
 */
export function getHelioPosition(jd: number, body: ReferenceBody): Vec3 {
  if (body === "sun") return vec3(0, 0, 0);

  const time = jdToAstroTime(jd);
  const astroBody = BODY_MAP[body];
  const vec = Astronomy.HelioVector(astroBody, time);

  // astronomy-engine returns AU for these vectors
  return vec3(vec.x, vec.y, vec.z);
}

/**
 * Returns geocentric position of the Moon (or other body) at the given JD (in AU).
 * Particularly useful for eclipse geometry (Sun-Earth-Moon alignment).
 */
export function getGeoPosition(jd: number, body: ReferenceBody): Vec3 {
  const time = jdToAstroTime(jd);
  const astroBody = BODY_MAP[body];
  const vec = Astronomy.GeoVector(astroBody, time, false); // false = no aberration for simplicity

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

/**
 * Very rough angular separation in degrees between two directions (for validation).
 * Not high-precision astrometry, but good enough to detect near-alignments.
 */
export function angularSeparationDegrees(a: Vec3, b: Vec3): number {
  // Treat as directions (normalize)
  const dot = (a.x * b.x + a.y * b.y + a.z * b.z) /
    (Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z));
  const clamped = Math.max(-1, Math.min(1, dot));
  return (Math.acos(clamped) * 180) / Math.PI;
}
