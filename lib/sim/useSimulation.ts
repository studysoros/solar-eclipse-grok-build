/**
 * useSimulation hook
 *
 * Responsibilities:
 * - Creates and manages the Web Worker (sim.worker.ts)
 * - Wires the worker to the Zustand store
 * - Provides a high-level API: play/pause, set time, reset, change speed
 * - Drives the simulation when isPlaying is true (via requestAnimationFrame)
 *
 * This is the main integration point between the pure physics (worker) and the UI/viz.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from './store';
import type { Vec3 } from '@/lib/physics/vec3';

type WorkerMessage =
  | { type: 'snapshot'; jd: number; bodies: Array<{ id: string; pos: Vec3 }> }
  | { type: string; [key: string]: unknown };

// Module-level singleton so multiple hook calls share one worker (avoids duplicate workers)
let sharedWorker: Worker | null = null;
let workerUserCount = 0;

export function useSimulation() {
  const store = useSimulationStore();
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Create or attach to shared worker (singleton pattern for multiple consumers)
  useEffect(() => {
    if (!sharedWorker) {
      sharedWorker = new Worker(
        new URL('../workers/sim.worker.ts', import.meta.url)
      );

      sharedWorker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const msg = event.data as WorkerMessage;
        if (msg && msg.type === 'snapshot') {
          const snap = msg as { jd: number; bodies: Array<{ id: string; pos: Vec3 }> };
          useSimulationStore.getState().updateFromSnapshot({
            jd: snap.jd,
            bodies: snap.bodies,
          });
        }
      };

      sharedWorker.postMessage({ type: 'init' });
    }

    workerUserCount += 1;

    return () => {
      workerUserCount -= 1;
      if (workerUserCount <= 0 && sharedWorker) {
        sharedWorker.terminate();
        sharedWorker = null;
        workerUserCount = 0;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);  // empty deps: setup once per component tree mount for the hook users

  // Drive loop - defined early to avoid temporal dead zone issues with effects
  // Use a ref to hold the current drive function so we can recurse without TDZ / lint issues
  const driveLoopRef = useRef<() => void>(() => {});

  const driveLoop = useCallback(() => {
    const worker = sharedWorker;
    if (!worker || !store.isPlaying) {
      rafRef.current = null;
      return;
    }

    const now = performance.now();
    const realDeltaSec = Math.max(0.001, (now - lastFrameTimeRef.current) / 1000);
    lastFrameTimeRef.current = now;

    const simDaysToAdvance = realDeltaSec * store.speed;
    const stepSize = Math.min(2, Math.max(0.1, simDaysToAdvance / 8));
    const steps = Math.max(1, Math.round(simDaysToAdvance / stepSize));

    worker.postMessage({ type: 'step', dt: stepSize, steps });
    rafRef.current = requestAnimationFrame(driveLoopRef.current);
  }, [store.isPlaying, store.speed]);

  // Keep the latest driveLoop in the ref so the RAF can call the current version without stale closures
  useEffect(() => {
    driveLoopRef.current = driveLoop;
  }, [driveLoop]);

  // Manage the RAF playback loop
  useEffect(() => {
    if (store.isPlaying) {
      lastFrameTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(driveLoopRef.current);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [store.isPlaying, store.speed]);

  // Public API
  const setJd = useCallback(
    (jd: number) => {
      const worker = sharedWorker;
      if (worker) {
        worker.postMessage({ type: 'setJd', jd });
      } else {
        store.setJd(jd);
      }
    },
    [store]
  );

  const togglePlay = useCallback(() => {
    store.togglePlay();
  }, [store]);

  const setSpeed = useCallback(
    (speed: number) => {
      store.setSpeed(speed);
    },
    [store]
  );

  const reset = useCallback(() => {
    const worker = sharedWorker;
    if (worker) {
      worker.postMessage({ type: 'reset' });
    }
    store.reset();
  }, [store]);

  return {
    jd: store.jd,
    bodies: store.bodies,
    isPlaying: store.isPlaying,
    speed: store.speed,
    setJd,
    togglePlay,
    setSpeed,
    reset,
  };
}
