'use client';

import { useMemo, useState } from 'react';
import { findSolarEclipses } from '@/lib/predict/eclipse-finder';
import { validatedCatalog, getEclipseByDate } from '@/lib/astro/eclipse-catalog';
import type { PredictedEclipseUI } from '../schemas';
import { useSimulation } from '@/lib/sim/useSimulation';

/**
 * Hook for eclipse predictions.
 * Uses high-fidelity reference (astronomy-engine) to search for events.
 * Cross-checks against the known catalog for validation.
 *
 * "Next piece" per plan: actual prediction/search + table + jump + validation.
 */
export function useEclipsePredictions() {
  const { setJd } = useSimulation();
  const [searchStartJd, setSearchStartJd] = useState(2451545.0); // J2000
  const [daySpan, setDaySpan] = useState(365 * 2);

  const rawPredictions = useMemo(() => {
    return findSolarEclipses(searchStartJd, daySpan);
  }, [searchStartJd, daySpan]);

  const predictions: PredictedEclipseUI[] = useMemo(() => {
    return rawPredictions.map((p) => {
      const catalogMatch = getEclipseByDate(p.date);
      return {
        ...p,
        isInCatalog: !!catalogMatch,
        note: catalogMatch ? `${p.note} • Matches catalog: ${catalogMatch.note}` : p.note,
      };
    });
  }, [rawPredictions]);

  const jumpTo = (jd: number) => {
    setJd(jd);
  };

  const runSearchFromNow = (currentJd: number) => {
    setSearchStartJd(currentJd);
  };

  return {
    predictions,
    searchStartJd,
    daySpan,
    setDaySpan,
    runSearchFromNow,
    jumpTo,
    catalogCount: validatedCatalog.length,
  };
}
