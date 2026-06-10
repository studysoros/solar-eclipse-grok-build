'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useSimulation } from '@/lib/sim/useSimulation';
import type { Vec3 } from '@/lib/physics/vec3';

interface BodyMeshProps {
  id: string;
  color: string;
  radius: number;
  emissive?: string;
}

function BodyMesh({ id, color, radius, emissive }: BodyMeshProps) {
  const { bodies } = useSimulation();
  const meshRef = useRef<THREE.Mesh>(null!);

  const body = useMemo(() => bodies.find((b) => b.id === id), [bodies, id]);

  useFrame(() => {
    if (meshRef.current && body) {
      const p = body.pos;
      meshRef.current.position.set(p.x, p.y, p.z);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius]} />
      <meshPhongMaterial
        color={color}
        emissive={emissive || '#000000'}
        shininess={30}
      />
    </mesh>
  );
}

function SunLight() {
  const { bodies } = useSimulation();
  const lightRef = useRef<THREE.PointLight>(null!);

  useFrame(() => {
    const sun = bodies.find((b) => b.id === 'sun');
    if (sun && lightRef.current) {
      const p = sun.pos;
      lightRef.current.position.set(p.x, p.y, p.z);
    }
  });

  return <pointLight ref={lightRef} intensity={1.2} />;
}

function Scene() {
  const { bodies } = useSimulation();
  const { camera } = useThree();

  // Initial camera position (looking at inner solar system)
  useEffect(() => {
    camera.position.set(0, 8, 18);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Very rough visual scaling (AU are huge, so we exaggerate planet sizes for visibility)
  const bodyVisuals = useMemo<Record<string, { color: string; radius: number; emissive?: string }>>(
    () => ({
      sun: { color: '#ffdd44', radius: 0.6, emissive: '#ffaa00' },
      mercury: { color: '#aaaaaa', radius: 0.18 },
      venus: { color: '#e8c070', radius: 0.28 },
      earth: { color: '#4488ff', radius: 0.3 },
      mars: { color: '#cc6644', radius: 0.22 },
      jupiter: { color: '#d2b48c', radius: 0.55 },
      saturn: { color: '#e8d4a8', radius: 0.48 },
      uranus: { color: '#a0d8ff', radius: 0.4 },
      neptune: { color: '#5070ff', radius: 0.38 },
      moon: { color: '#cccccc', radius: 0.12 },
    }),
    []
  );

  return (
    <>
      <ambientLight intensity={0.15} />
      <SunLight />

      {Object.entries(bodyVisuals).map(([id, visual]) => (
        <BodyMesh
          key={id}
          id={id}
          color={visual.color}
          radius={visual.radius}
          emissive={visual.emissive}
        />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        minDistance={2}
        maxDistance={80}
      />

      {/* Very simple reference grid for sense of scale */}
      <gridHelper args={[40, 40, '#334455', '#223344']} position={[0, -0.01, 0]} />
    </>
  );
}

export function SolarSystemCanvas() {
  const { jd, isPlaying, speed, togglePlay, setSpeed, reset } = useSimulation();

  // Simple JD to approximate Gregorian date for display
  const displayDate = useMemo(() => {
    const date = new Date((jd - 2440587.5) * 86400000);
    return date.toISOString().slice(0, 10);
  }, [jd]);

  return (
    <div className="relative w-full h-[620px] rounded-xl overflow-hidden border bg-black">
      <Canvas
        camera={{ position: [0, 8, 18], fov: 55 }}
        style={{ background: '#000814' }}
      >
        <Scene />
      </Canvas>

      {/* HUD / Controls overlay */}
      <div className="absolute top-4 left-4 right-4 flex flex-col gap-3 text-sm text-white/90">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur px-4 py-2 rounded-lg w-fit">
          <div>
            <span className="font-mono text-xs opacity-70">JD</span>{' '}
            <span className="font-mono tabular-nums">{jd.toFixed(2)}</span>
          </div>
          <div className="opacity-70">•</div>
          <div className="font-medium">{displayDate}</div>
          <div className="opacity-70">•</div>
          <div>
            Speed: <span className="font-mono">{speed.toFixed(0)}x</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/20 active:bg-white/30 transition"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={reset}
            className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 active:bg-white/30 transition"
          >
            Reset
          </button>

          {[1, 50, 500, 5000, 20000].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1.5 rounded text-xs transition ${
                Math.abs(speed - s) < 1
                  ? 'bg-white text-black'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-3 right-4 text-[10px] text-white/50 font-mono">
        Drag to orbit • Scroll to zoom • Bodies are visually exaggerated for visibility
      </div>
    </div>
  );
}
