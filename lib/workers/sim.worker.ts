/**
 * Web Worker for the N-body simulation.
 *
 * Runs the pure physics (leapfrog) off the main thread so the UI and three.js
 * rendering stay responsive even at high simulation speeds.
 *
 * Communication protocol (simple, serializable messages):
 * - Main -> Worker: { type: 'init' }
 * - Main -> Worker: { type: 'step', dt: number, steps?: number }
 * - Main -> Worker: { type: 'setJd', jd: number }
 * - Main -> Worker: { type: 'reset' }
 * - Worker -> Main: { type: 'snapshot', jd: number, bodies: Array<{ id: string; pos: Vec3 }> }
 *
 * The worker owns the full authoritative SimulationState.
 * It only sends lean snapshots (positions only) for visualization.
 */

import { leapfrogStep, createInitialState } from '../physics/nbody';
import { INITIAL_BODIES } from '../physics/constants';
import type { SimulationState } from '../physics/types';
import type { Vec3 } from '../physics/vec3';

// Map the rough initial data to full Body objects with velocity.
const initialBodies = INITIAL_BODIES.map((b) => ({
  id: b.id,
  mass: b.mass,
  pos: { ...b.pos },
  vel: { ...b.vel },
}));

let state: SimulationState = createInitialState(initialBodies);

function postSnapshot() {
  const snapshot = {
    type: 'snapshot' as const,
    jd: state.jd,
    bodies: state.bodies.map((b) => ({
      id: b.id,
      pos: { x: b.pos.x, y: b.pos.y, z: b.pos.z } as Vec3,
    })),
  };
  // Worker postMessage - cast to satisfy TS in worker context
  (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(snapshot);
}

self.onmessage = (event: MessageEvent) => {
  const msg = event.data;

  switch (msg?.type) {
    case 'init':
      postSnapshot();
      break;

    case 'step': {
      const dt = typeof msg.dt === 'number' ? msg.dt : 1;
      const steps = typeof msg.steps === 'number' ? msg.steps : 1;

      for (let i = 0; i < steps; i++) {
        state = leapfrogStep(state, dt);
      }
      postSnapshot();
      break;
    }

    case 'setJd': {
      if (typeof msg.jd === 'number') {
        // Simple approach: reset to initial and advance to target JD.
        // For a more advanced version we could integrate backward/forward.
        state = createInitialState(initialBodies);
        const targetJd = msg.jd;
        const delta = targetJd - state.jd;
        if (delta > 0) {
          // Advance in reasonable chunks to keep accuracy
          const chunk = Math.min(5, delta);
          let remaining = delta;
          while (remaining > 0) {
            const stepDt = Math.min(chunk, remaining);
            state = leapfrogStep(state, stepDt);
            remaining -= stepDt;
          }
        }
        postSnapshot();
      }
      break;
    }

    case 'reset':
      state = createInitialState(initialBodies);
      postSnapshot();
      break;

    default:
      // Unknown message - ignore for robustness
      break;
  }
};

// Send an initial snapshot as soon as the worker starts
postSnapshot();
