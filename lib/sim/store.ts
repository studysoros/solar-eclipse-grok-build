/**
 * Client-side simulation state (Zustand).
 *
 * This is the "UI-facing" view of the simulation:
 * - Current Julian Date
 * - Lean body positions for rendering
 * - Playback controls (isPlaying, speed)
 *
 * The authoritative full state (positions + velocities) lives in the Web Worker.
 * This store is updated via snapshots posted from the worker.
 */

import { create } from 'zustand';
import type { Vec3 } from '@/lib/physics/vec3';

export interface SimBody {
  id: string;
  pos: Vec3;
}

interface SimulationState {
  jd: number;
  bodies: SimBody[];
  isPlaying: boolean;
  speed: number; // simulation days advanced per real-time second (when playing)
  setJd: (jd: number) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  updateFromSnapshot: (snapshot: { jd: number; bodies: SimBody[] }) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  jd: 2451545.0, // J2000.0 approx
  bodies: [],
  isPlaying: false,
  speed: 1, // 1 simulated day per real second by default (very slow visually - user will crank it)

  setJd: (jd) => set({ jd }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setSpeed: (speed) => set({ speed: Math.max(0.01, speed) }),

  updateFromSnapshot: ({ jd, bodies }) => set({ jd, bodies }),

  reset: () =>
    set({
      jd: 2451545.0,
      bodies: [],
      isPlaying: false,
    }),
}));
