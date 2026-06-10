'use client';

import { useEclipsePredictions } from '../hooks/useEclipsePredictions';
import { useSimulation } from '@/lib/sim/useSimulation';

export function EclipsePredictionTable() {
  const { jd } = useSimulation();
  const {
    predictions,
    daySpan,
    setDaySpan,
    runSearchFromNow,
    jumpTo,
    catalogCount,
  } = useEclipsePredictions();

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">Eclipse Predictions (Reference Model)</div>
          <div className="text-xs text-muted-foreground">
            Searched using astronomy-engine positions • {predictions.length} events in window • {catalogCount} in catalog
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span>Window:</span>
          <select
            value={daySpan}
            onChange={(e) => setDaySpan(Number(e.target.value))}
            className="bg-background border rounded px-2 py-1 text-sm"
          >
            <option value={365}>1 year</option>
            <option value={365 * 2}>2 years</option>
            <option value={365 * 5}>5 years</option>
          </select>
          <button
            onClick={() => runSearchFromNow(jd)}
            className="px-3 py-1 rounded bg-primary text-primary-foreground text-sm hover:opacity-90"
          >
            Search from current time
          </button>
        </div>
      </div>

      <div className="max-h-[280px] overflow-auto border rounded text-sm">
        <table className="w-full">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Date</th>
              <th className="p-2">Type</th>
              <th className="p-2">Sep (°)</th>
              <th className="p-2">In Catalog</th>
              <th className="p-2 w-24">Action</th>
            </tr>
          </thead>
          <tbody>
            {predictions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  No events found in window. Try a longer search or different start time.
                </td>
              </tr>
            )}
            {predictions.map((p, idx) => (
              <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-2 font-mono">{p.date}</td>
                <td className="p-2">
                  <span className={
                    p.type === 'Total' ? 'text-green-500' :
                    p.type === 'Annular' ? 'text-orange-500' : 'text-blue-400'
                  }>
                    {p.type}
                  </span>
                </td>
                <td className="p-2 font-mono">{p.separationDeg}</td>
                <td className="p-2">
                  {p.isInCatalog ? (
                    <span className="text-emerald-500">✓ Yes</span>
                  ) : (
                    <span className="text-muted-foreground">No (new)</span>
                  )}
                </td>
                <td className="p-2">
                  <button
                    onClick={() => jumpTo(p.jd)}
                    className="text-xs px-2 py-0.5 rounded border hover:bg-accent"
                  >
                    Jump sim
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[10px] text-muted-foreground">
        Predictions use reference ephemeris (accurate). Compare to live N-body sim by jumping and watching alignments.
        "In Catalog" means it matches one of the known real eclipses we hard-coded for validation.
      </div>
    </div>
  );
}
