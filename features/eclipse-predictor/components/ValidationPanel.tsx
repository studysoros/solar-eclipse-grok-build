'use client';

import { useState } from 'react';
import { validatedCatalog } from '@/lib/astro/eclipse-catalog';
import { getSunMoonGeo, angularSeparationDegrees } from '@/lib/astro/reference';
import { getSimSunMoonSeparationAt } from '@/lib/physics/nbody';
import { useSimulation } from '@/lib/sim/useSimulation';

/**
 * Stronger validation surface for MVP.
 * Shows "sim vs reference" and "sim vs catalog" deltas at known real eclipse dates.
 * - Ref Sep: accurate separation from astronomy-engine at the exact catalog date.
 * - Sim Sep: what our N-body sim computes for the same date (propagated from initial conditions).
 * - Delta: difference in separation (degrees). Lower is better match.
 * Also allows jumping the live sim to the date to visually inspect the alignment.
 */
export function ValidationPanel() {
  const { setJd } = useSimulation();
  const [computed, setComputed] = useState<Record<string, { refSep: number; simSep: number; delta: number }>>({});

  const validateDate = (date: string) => {
    const d = new Date(date);
    // Approximate JD from date (sufficient for this validation)
    const targetJd = 2440587.5 + (d.getTime() / 86400000);

    const refGeo = getSunMoonGeo(targetJd);
    const refSep = angularSeparationDegrees(refGeo.sun, refGeo.moon);

    const simSep = getSimSunMoonSeparationAt(targetJd);

    const delta = Math.abs(simSep - refSep);

    setComputed(prev => ({
      ...prev,
      [date]: { refSep: +refSep.toFixed(4), simSep: +simSep.toFixed(4), delta: +delta.toFixed(4) }
    }));
  };

  const validateAll = () => {
    validatedCatalog.forEach(e => validateDate(e.date));
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">Validation Surface</div>
          <div className="text-xs text-muted-foreground">
            Sim vs Reference (and vs Catalog) at known real eclipse dates. Click "Validate" to compute deltas.
          </div>
        </div>
        <button
          onClick={validateAll}
          className="text-sm px-3 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
        >
          Validate All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Date (Catalog)</th>
              <th className="p-2">Type</th>
              <th className="p-2">Ref Sep (°)</th>
              <th className="p-2">Sim Sep (°)</th>
              <th className="p-2">Delta (°)</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {validatedCatalog.map((e) => {
              const c = computed[e.date];
              return (
                <tr key={e.date} className="border-b last:border-none hover:bg-muted/30">
                  <td className="p-2 font-mono">{e.date}</td>
                  <td className="p-2">{e.type}</td>
                  <td className="p-2 font-mono">{c ? c.refSep : '—'}</td>
                  <td className="p-2 font-mono">{c ? c.simSep : '—'}</td>
                  <td className="p-2 font-mono">
                    {c ? (
                      <span className={c.delta < 0.5 ? 'text-emerald-500' : c.delta < 2 ? 'text-yellow-500' : 'text-red-400'}>
                        {c.delta}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => validateDate(e.date)}
                      className="text-xs px-2 py-0.5 border rounded hover:bg-accent"
                    >
                      Validate
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date(e.date);
                        const jd = 2440587.5 + d.getTime() / 86400000;
                        setJd(jd);
                      }}
                      className="text-xs px-2 py-0.5 border rounded hover:bg-accent"
                    >
                      Jump sim
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-muted-foreground">
        Ref = astronomy-engine (high accuracy). Sim = our leapfrog N-body propagated to the exact date from J2000 initial conditions.
        Small delta = our sim matches reality well at that epoch. Use "Jump sim" to visually inspect the 3D alignment at that moment.
      </div>
    </div>
  );
}
