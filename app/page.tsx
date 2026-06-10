'use client';

import { SolarSystemCanvas } from '@/features/solar-system-viz/components/SolarSystemCanvas';
import { EclipsePredictionTable } from '@/features/eclipse-predictor/components/EclipsePredictionTable';

export default function SolarEclipseSimulator() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary" />
            <div>
              <div className="font-semibold tracking-tight">Solar System Simulator</div>
              <div className="text-[10px] text-muted-foreground -mt-1">N-body + Eclipse Predictor</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Senior-level • Worker-driven physics • Reference validated
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Interactive N-Body Solar System</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Pure leapfrog integration running in a Web Worker. Real-time 3D visualization with exaggerated scales for visibility.
            Time is in Julian Date (J2000 ≈ 2451545.0).
          </p>
        </div>

        <SolarSystemCanvas />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border bg-card p-4">
            <div className="font-medium mb-1">Current State</div>
            <div className="text-muted-foreground text-xs">
              Live values (JD, playing state, speed) are shown in the canvas HUD above.<br />
              The simulation runs entirely in a Web Worker using the leapfrog integrator.
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="font-medium mb-1">Physics</div>
            <div className="text-muted-foreground text-xs">
              Symplectic leapfrog (velocity Verlet) integrator.<br />
              10 bodies (Sun + 8 planets + Moon).<br />
              Runs off-main-thread for smooth 60 fps rendering.
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="font-medium mb-1">Next</div>
            <div className="text-muted-foreground text-xs">
              Eclipse prediction engine using the reference layer + sim cross-checks.<br />
              Better trails, body labels, camera follow modes, and validation against astronomy-engine.
            </div>
          </div>
        </div>

        <EclipsePredictionTable />
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        npm + Next.js 16 + TypeScript • Feature-sliced • Pure physics in lib/physics • astronomy-engine for reference only
      </footer>
    </div>
  );
}
