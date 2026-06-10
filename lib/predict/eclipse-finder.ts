/**
 * Eclipse prediction using the reference (astronomy-engine) layer for accuracy.
 * This is "what a high-fidelity model predicts".
 *
 * The N-body sim can be compared against it for validation ("sim vs reference").
 *
 * Simple but effective search:
 * - Sample time at ~0.5 day steps (eclipses last hours, seasons ~month).
 * - When sun-moon geo angular separation is small (< ~1.6° potential eclipse).
 * - Cluster nearby hits into single events (take the minimum separation time).
 * - Rough type classification using apparent diameters.
 *
 * For production, one would use proper Besselian elements or high-precision search,
 * but this is sufficient for senior demo + validation against the catalog.
 */

import { getSunMoonGeo, angularSeparationDegrees } from '@/lib/astro/reference';
import { z } from 'zod';

export const PredictedEclipseSchema = z.object({
  jd: z.number(),
  date: z.string(),
  separationDeg: z.number(),
  type: z.enum(['Total', 'Annular', 'Partial', 'None']),
  note: z.string(),
});

export type PredictedEclipse = z.infer<typeof PredictedEclipseSchema>;

/**
 * Approximate apparent angular diameter in degrees.
 * sunRadiusKm ~ 696000, moon ~ 1737
 */
function approxAngularDiameterKm(distAu: number, bodyRadiusKm: number): number {
  // 1 AU in km
  const AU_KM = 149597870.7;
  const distKm = distAu * AU_KM;
  const rad = Math.atan(bodyRadiusKm / distKm) * (180 / Math.PI) * 2;
  return rad;
}

/**
 * Search for solar eclipses in [startJd, startJd + daySpan].
 * Returns clustered events with min separation.
 */
export function findSolarEclipses(
  startJd: number,
  daySpan = 365 * 3,
  sampleStepDays = 0.4
): PredictedEclipse[] {
  const events: PredictedEclipse[] = [];
  let currentCluster: { jd: number; sep: number }[] = [];

  const endJd = startJd + daySpan;

  for (let jd = startJd; jd < endJd; jd += sampleStepDays) {
    const { sun, moon } = getSunMoonGeo(jd);
    const sep = angularSeparationDegrees(sun, moon);

    // Rough threshold for possible solar eclipse (includes partials)
    if (sep < 1.8) {
      currentCluster.push({ jd, sep });
    } else if (currentCluster.length > 0) {
      // End of cluster - pick the closest approach
      const best = currentCluster.reduce((a, b) => (a.sep < b.sep ? a : b));
      const type = classifyEclipseType(best.jd);
      events.push({
        jd: best.jd,
        date: new Date((best.jd - 2440587.5) * 86400000).toISOString().slice(0, 10),
        separationDeg: +best.sep.toFixed(3),
        type,
        note: type === 'Total' || type === 'Annular'
          ? 'Likely central eclipse (sim approx)'
          : 'Possible partial',
      });
      currentCluster = [];
    }
  }

  // flush last cluster
  if (currentCluster.length > 0) {
    const best = currentCluster.reduce((a, b) => (a.sep < b.sep ? a : b));
    const type = classifyEclipseType(best.jd);
    events.push({
      jd: best.jd,
      date: new Date((best.jd - 2440587.5) * 86400000).toISOString().slice(0, 10),
      separationDeg: +best.sep.toFixed(3),
      type,
      note: 'Edge of search window',
    });
  }

  return events;
}

function classifyEclipseType(jd: number): 'Total' | 'Annular' | 'Partial' {
  const { sun, moon } = getSunMoonGeo(jd);

  // Distance from earth
  const sunDist = Math.hypot(sun.x, sun.y, sun.z);
  const moonDist = Math.hypot(moon.x, moon.y, moon.z);

  const sunAng = approxAngularDiameterKm(sunDist, 696000);
  const moonAng = approxAngularDiameterKm(moonDist, 1737);

  if (moonAng > sunAng * 0.98) {
    // Moon appears at least almost as large as sun
    return 'Total';
  }
  if (moonAng < sunAng * 0.95) {
    return 'Annular';
  }
  return 'Partial';
}
