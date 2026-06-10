/**
 * Pure 3D vector math for the physics core.
 * No dependencies on React, three.js, or DOM.
 * Designed for clarity, testability, and reasonable performance in the N-body loop.
 *
 * Coordinate convention and units are documented in constants.ts.
 * All operations return new objects (simple immutability for safety in sim snapshots).
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const ZERO: Vec3 = { x: 0, y: 0, z: 0 };

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(v: Vec3): number {
  return Math.sqrt(dot(v, v));
}

export function lengthSq(v: Vec3): number {
  return dot(v, v);
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len === 0) return ZERO;
  return scale(v, 1 / len);
}

export function distance(a: Vec3, b: Vec3): number {
  return length(sub(a, b));
}

/** In-place accumulation helper for hot loops (performance). Mutates target. */
export function addInPlace(target: Vec3, delta: Vec3): void {
  target.x += delta.x;
  target.y += delta.y;
  target.z += delta.z;
}

/** Clone for snapshot safety. */
export function clone(v: Vec3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

/** Angular separation in degrees between two direction vectors (for eclipse validation etc). */
export function angularSeparationDegrees(a: Vec3, b: Vec3): number {
  const lenA = Math.hypot(a.x, a.y, a.z);
  const lenB = Math.hypot(b.x, b.y, b.z);
  if (lenA === 0 || lenB === 0) return 0;
  const dot = (a.x * b.x + a.y * b.y + a.z * b.z) / (lenA * lenB);
  const clamped = Math.max(-1, Math.min(1, dot));
  return (Math.acos(clamped) * 180) / Math.PI;
}
