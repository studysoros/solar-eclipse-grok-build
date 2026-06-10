/**
 * Detailed eclipse circumstances computation.
 *
 * This expands the basic finder with magnitude, gamma, and approximate central duration.
 * Uses the reference (astronomy-engine) positions for accuracy.
 *
 * These are geocentric circumstances suitable for MVP validation and display.
 * For observer-specific (topocentric) or full Besselian elements, more work would be needed.
 */

import { getSunMoonGeo, angularSeparationDegrees } from '@/lib/astro/reference';

/** 1 AU in km (for angular size) */
const AU_KM = 149597870.7;
const SUN_RADIUS_KM = 696000;
const MOON_RADIUS_KM = 1737;
const EARTH_RADIUS_AU = 4.2635e-5;

export interface EclipseCircumstances {
  jd: number;
  separationDeg: number;
  sunAngularDiameterDeg: number;
  moonAngularDiameterDeg: number;
  magnitude: number;          // >1 for total, <1 for partial/annular at max
  gamma: number;              // approx distance of shadow axis from Earth center (Earth radii). |gamma| < ~1.5 for eclipse possible
  durationMinutes?: number;   // central (totality or annularity) duration; undefined for partials
  type: 'Total' | 'Annular' | 'Partial' | 'None';
}

function approxAngularDiameter(distAu: number, radiusKm: number): number {
  const distKm = distAu * AU_KM;
  return (Math.atan(radiusKm / distKm) * 180 / Math.PI) * 2;
}

/**
 * Compute detailed circumstances at a given JD (ideally the time of maximum eclipse / minimum separation).
 */
export function computeEclipseCircumstances(jd: number): EclipseCircumstances {
  const { sun, moon } = getSunMoonGeo(jd);

  const sunDist = Math.hypot(sun.x, sun.y, sun.z);
  const moonDist = Math.hypot(moon.x, moon.y, moon.z);

  const sunAng = approxAngularDiameter(sunDist, SUN_RADIUS_KM);
  const moonAng = approxAngularDiameter(moonDist, MOON_RADIUS_KM);

  const sep = angularSeparationDegrees(sun, moon);

  // Gamma approximation: perpendicular distance from Earth center to shadow axis in Earth radii
  const sepRad = (sep * Math.PI) / 180;
  const gamma = (sepRad * moonDist) / EARTH_RADIUS_AU;

  // Magnitude (fraction of solar diameter covered at maximum)
  let magnitude = (moonAng - sep) / sunAng;
  if (magnitude < 0) magnitude = 0;

  // Determine type
  let type: EclipseCircumstances['type'] = 'Partial';
  let durationMinutes: number | undefined;

  if (sep > sunAng + moonAng) {
    type = 'None';
  } else if (moonAng > sunAng) {
    // Moon larger → potential total
    if (sep < moonAng - sunAng) {
      type = 'Total';
      durationMinutes = estimateCentralDuration(sep, sunAng, moonAng);
    } else {
      type = 'Partial'; // or annular if grazing, but treat as partial for simplicity
    }
  } else {
    // Sun larger → potential annular
    if (sep < sunAng - moonAng) {
      type = 'Annular';
      durationMinutes = estimateCentralDuration(sep, sunAng, moonAng);
    } else {
      type = 'Partial';
    }
  }

  return {
    jd,
    separationDeg: +sep.toFixed(4),
    sunAngularDiameterDeg: +sunAng.toFixed(4),
    moonAngularDiameterDeg: +moonAng.toFixed(4),
    magnitude: +magnitude.toFixed(4),
    gamma: +gamma.toFixed(3),
    durationMinutes: durationMinutes ? +durationMinutes.toFixed(1) : undefined,
    type,
  };
}

/**
 * Rough estimate of central eclipse duration in minutes.
 * Based on relative angular speeds and the "chord" length of the overlap.
 * This is approximate; real calculations use more precise ephemeris derivatives.
 */
function estimateCentralDuration(sep: number, sunAng: number, moonAng: number): number {
  // Approximate relative motion: Moon moves ~0.5°/hour w.r.t. Sun near new moon
  const relativeSpeedDegPerHour = 0.5;

  const overlap = Math.abs(moonAng - sunAng) - sep; // "depth" of central overlap in degrees
  if (overlap <= 0) return 0;

  // Very rough chord duration (diameter of overlap zone / speed)
  // Treat as passing across the diameter for central case
  const effectiveWidth = Math.sqrt(overlap * (2 * Math.min(sunAng, moonAng) - overlap)); // approx chord
  const hours = effectiveWidth / relativeSpeedDegPerHour;
  return Math.max(0, hours * 60);
}
