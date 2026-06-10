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

export function useSimulation() {
  const store = useSimulationStore();
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Create worker once
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/sim.worker.ts', import.meta.url)
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data as WorkerMessage;
      if (msg && msg.type === 'snapshot') {
        const snap = msg as { jd: number; bodies: Array<{ id: string; pos: Vec3 }> };
        store.updateFromSnapshot({
          jd: snap.jd,
          bodies: snap.bodies,
        });
      }
    };

    // Kick off initialization
    worker.postMessage({ type: 'init' });

    return () => {
      worker.terminate();
      workerRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [store]);

  // Drive loop - defined early to avoid temporal dead zone issues with effects
  // Use a ref to hold the current drive function so we can recurse without TDZ / lint issues
  const driveLoopRef = useRef<() => void>(() => {});

  const driveLoop = useCallback(() => {
    const worker = workerRef.current;
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
      const worker = workerRef.current;
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
    const worker = workerRef.current;
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
