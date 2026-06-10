'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSimulation } from '@/lib/sim/useSimulation';
import { validatedCatalog } from '@/lib/astro/eclipse-catalog';

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
      {/* MeshStandardMaterial gives more realistic response to the Sun's point light */}
      <meshStandardMaterial
        color={color}
        emissive={emissive || '#000000'}
        emissiveIntensity={emissive ? 0.25 : 0}
        metalness={0.05}
        roughness={0.85}
      />
    </mesh>
  );
}

// Simple trail using points of previous positions (updated from snapshots)
function BodyTrail({ id, color }: { id: string; color: string }) {
  const { bodies } = useSimulation();
  const pointsRef = useRef<THREE.Points>(null!);
  // Fixed buffer created once (avoids ref access during render)
  const positionsArray = useMemo(() => new Float32Array(300), []);
  const headRef = useRef(0);

  const body = useMemo(() => bodies.find((b) => b.id === id), [bodies, id]);

  useFrame(() => {
    if (!body || !pointsRef.current) return;

    // Mutate the typed array for three.js buffer performance (standard pattern)
    // eslint-disable-next-line react-hooks/immutability
    const idx = (headRef.current % 100) * 3;
    positionsArray[idx + 0] = body.pos.x;
    positionsArray[idx + 1] = body.pos.y;
    positionsArray[idx + 2] = body.pos.z;
    headRef.current += 1;

    const geom = pointsRef.current.geometry as THREE.BufferGeometry;
    const attr = geom.attributes.position as THREE.BufferAttribute;
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positionsArray, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color={color} sizeAttenuation={true} />
    </points>
  );
}

// Realistic starfield: thousands of distant points. Stars are visual only (do not contribute light at this scale).
function Starfield() {
  const count = 12000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      // Random points on a large sphere (far background)
      const r = 180 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i] = r * Math.sin(phi) * Math.cos(theta);
      pos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.6} color="#bbccff" sizeAttenuation={false} />
    </points>
  );
}

// Simple but effective rings for Saturn (tilted like reality)
function SaturnRings() {
  const { bodies } = useSimulation();
  const ringRef = useRef<THREE.Mesh>(null!);

  const body = useMemo(() => bodies.find((b) => b.id === 'saturn'), [bodies]);

  useFrame(() => {
    if (ringRef.current && body) {
      const p = body.pos;
      ringRef.current.position.set(p.x, p.y, p.z);
    }
  });

  return (
    <mesh ref={ringRef} rotation={[1.25, 0.2, 0]}>
      <ringGeometry args={[0.72, 1.35, 80]} />
      <meshBasicMaterial
        color="#e8d9b8"
        side={THREE.DoubleSide}
        transparent
        opacity={0.65}
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

  // Much stronger light from the Sun for realistic planet illumination
  return <pointLight ref={lightRef} intensity={4.5} color="#fff8e7" />;
}

// Enhanced Sun with core + soft glow for more realistic star appearance.
// The glow helps sell the "star" look without post-processing.
function Sun() {
  const { bodies } = useSimulation();
  const coreRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);

  const body = useMemo(() => bodies.find((b) => b.id === 'sun'), [bodies]);

  useFrame(() => {
    if (body) {
      const p = body.pos;
      if (coreRef.current) coreRef.current.position.set(p.x, p.y, p.z);
      if (glowRef.current) glowRef.current.position.set(p.x, p.y, p.z);
    }
  });

  return (
    <group>
      {/* Bright core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.75]} />
        <meshBasicMaterial color="#ffffdd" />
      </mesh>
      {/* Soft outer glow (corona-like) */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.2]} />
        <meshBasicMaterial color="#ffcc66" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Scene({ focusedBody, isEarthMoonCloseup }: { focusedBody: string | null; isEarthMoonCloseup: boolean }) {
  const { bodies } = useSimulation();
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Initial camera position (looking at inner solar system)
  useEffect(() => {
    camera.position.set(0, 8, 18);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Better scale/camera handling (MVP): follow the focused body by continuously updating
  // the OrbitControls target. This lets the user orbit/zoom *around* the body (great for
  // Earth-Moon relative view without losing context of the sim).
  // For Earth-Moon closeup we also pull the camera in closer automatically.
  useFrame(() => {
    if (focusedBody && controlsRef.current) {
      const body = bodies.find((b: any) => b.id === focusedBody);
      if (body) {
        const target = controlsRef.current.target;
        target.set(body.pos.x, body.pos.y, body.pos.z);

        if (isEarthMoonCloseup && focusedBody === 'earth') {
          // Nudge camera to a close relative distance so Moon orbit is clearly visible
          const currentDist = camera.position.distanceTo(target);
          const desired = 0.035; // tuned for exaggerated Moon size in viz units
          if (currentDist > desired * 1.8) {
            const dir = camera.position.clone().sub(target).normalize();
            camera.position.copy(target).add(dir.multiplyScalar(desired));
          }
        }

        controlsRef.current.update();
      }
    }
  });

  // Visual properties. Sizes still exaggerated for visibility at solar system scale.
  // Colors chosen to be more realistic.
  const bodyVisuals = useMemo<Record<string, { color: string; radius: number; emissive?: string }>>(
    () => ({
      sun: { color: '#ffdd66', radius: 0.7, emissive: '#ffcc44' },
      mercury: { color: '#8c8c8c', radius: 0.16 },
      venus: { color: '#d4b48c', radius: 0.26 },
      earth: { color: '#3a6ea5', radius: 0.28 },
      mars: { color: '#b35c3a', radius: 0.2 },
      jupiter: { color: '#c5a16e', radius: 0.52 },
      saturn: { color: '#d8c8a0', radius: 0.45 },
      uranus: { color: '#9ad0e6', radius: 0.38 },
      neptune: { color: '#5b6fc7', radius: 0.36 },
      moon: { color: '#999999', radius: 0.11 },
    }),
    []
  );

  return (
    <>
      {/* Very low ambient for realistic dark space. Sun provides the main light. */}
      <ambientLight intensity={0.04} />
      <SunLight />

      {/* Distant realistic starfield (visual only) */}
      <Starfield />

      {Object.entries(bodyVisuals).map(([id, visual]) => {
        if (id === 'sun') {
          // Sun gets special treatment for realistic star look + lighting
          return (
            <group key={id}>
              <Sun />
              <BodyTrail id={id} color="#ffdd66" />
            </group>
          );
        }

        const groupContent = (
          <>
            <BodyMesh
              id={id}
              color={visual.color}
              radius={visual.radius}
              emissive={visual.emissive}
            />
            <BodyTrail id={id} color={visual.color} />
            {id === 'saturn' && <SaturnRings />}
          </>
        );

        return <group key={id}>{groupContent}</group>;
      })}

      <OrbitControls
        ref={controlsRef}
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
  const { jd, isPlaying, speed, togglePlay, setSpeed, reset, setJd } = useSimulation();

  // Camera / scale handling state for better MVP UX
  const [focusedBody, setFocusedBody] = useState<string | null>(null);
  const [isEarthMoonCloseup, setIsEarthMoonCloseup] = useState(false);

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
        <Scene focusedBody={focusedBody} isEarthMoonCloseup={isEarthMoonCloseup} />
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

          {/* Quick jumps using the real eclipse catalog we already have */}
          <div className="ml-2 flex gap-1 text-[10px] opacity-70">
            {validatedCatalog.slice(0, 4).map((e) => (
              <button
                key={e.date}
                onClick={() => {
                  // Convert YYYY-MM-DD to approximate JD (good enough for demo jumps)
                  const d = new Date(e.date);
                  const jdApprox = 2440587.5 + d.getTime() / 86400000;
                  setJd(jdApprox);
                }}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10"
                title={e.note}
              >
                {e.date}
              </button>
            ))}
          </div>
        </div>

        {/* Better scale / camera handling - MVP feature */}
        <div className="flex items-center gap-1 text-[10px] opacity-70 mt-1">
          <span className="mr-1">Camera:</span>
          <button
            onClick={() => { setFocusedBody(null); setIsEarthMoonCloseup(false); }}
            className={`px-2 py-0.5 rounded border ${!focusedBody ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Free
          </button>
          <button
            onClick={() => { setFocusedBody('sun'); setIsEarthMoonCloseup(false); }}
            className={`px-2 py-0.5 rounded border ${focusedBody === 'sun' ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Follow Sun
          </button>
          <button
            onClick={() => { setFocusedBody('earth'); setIsEarthMoonCloseup(false); }}
            className={`px-2 py-0.5 rounded border ${focusedBody === 'earth' && !isEarthMoonCloseup ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Follow Earth
          </button>
          <button
            onClick={() => { setFocusedBody('earth'); setIsEarthMoonCloseup(true); }}
            className={`px-2 py-0.5 rounded border ${isEarthMoonCloseup ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Earth-Moon Zoom
          </button>
          <button
            onClick={() => { setFocusedBody('moon'); setIsEarthMoonCloseup(false); }}
            className={`px-2 py-0.5 rounded border ${focusedBody === 'moon' ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
          >
            Follow Moon
          </button>
          <span className="ml-2 text-[9px]">(target follows body; scroll to zoom around it)</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-4 text-[10px] text-white/50 font-mono">
        Drag to orbit • Scroll to zoom around focus • Use Camera buttons for follow modes &amp; Earth-Moon relative view • Sizes exaggerated
      </div>
    </div>
  );
}
