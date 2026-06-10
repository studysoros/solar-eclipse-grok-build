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
import { computeEclipseCircumstances, type EclipseCircumstances } from './circumstances';
import { z } from 'zod';

export const PredictedEclipseSchema = z.object({
  jd: z.number(),
  date: z.string(),
  separationDeg: z.number(),
  type: z.enum(['Total', 'Annular', 'Partial', 'None']),
  note: z.string(),
  magnitude: z.number().optional(),
  gamma: z.number().optional(),
  durationMinutes: z.number().optional(),
});

export type PredictedEclipse = z.infer<typeof PredictedEclipseSchema> & Partial<EclipseCircumstances>;

/**
 * Search for solar eclipses in [startJd, startJd + daySpan].
 * Returns events enriched with circumstances (magnitude, gamma, duration).
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
      const circ = computeEclipseCircumstances(best.jd);
      events.push({
        jd: best.jd,
        date: new Date((best.jd - 2440587.5) * 86400000).toISOString().slice(0, 10),
        separationDeg: circ.separationDeg,
        type: circ.type,
        note: circ.type === 'Total' || circ.type === 'Annular'
          ? 'Central eclipse (reference model)'
          : 'Partial eclipse (reference model)',
        magnitude: circ.magnitude,
        gamma: circ.gamma,
        durationMinutes: circ.durationMinutes,
      });
      currentCluster = [];
    }
  }

  // flush last cluster
  if (currentCluster.length > 0) {
    const best = currentCluster.reduce((a, b) => (a.sep < b.sep ? a : b));
    const circ = computeEclipseCircumstances(best.jd);
    events.push({
      jd: best.jd,
      date: new Date((best.jd - 2440587.5) * 86400000).toISOString().slice(0, 10),
      separationDeg: circ.separationDeg,
      type: circ.type,
      note: 'Edge of search window',
      magnitude: circ.magnitude,
      gamma: circ.gamma,
      durationMinutes: circ.durationMinutes,
    });
  }

  return events;
}
