# ADR 001: Tech Stack and High-Level Architecture

**Status:** Accepted

**Date:** 2026 (initial project setup)

## Context

We are starting a senior-level, scalable, maintainable web application that performs N-body gravitational simulation of the solar system and predicts solar eclipses. The directory was empty. We have a strong local reference project (`crypto-dashboard`) that demonstrates the exact senior patterns, commit discipline, and folder conventions expected in this workspace/Grok Build environment.

Key requirements driving the choice:
- Rich interactive 3D visualization + real-time controls (play, scrub, focus, trails).
- Verifiable numerical physics that can be tested independently and evolved.
- Shareable / zero-install experience (important for educational/scientific tool).
- Long-term maintainability: pure physics core, clear boundaries, ADRs for numerical decisions.
- Consistency with existing senior projects in the workspace.

## Decision

**Use Next.js 16 (App Router) + React 19 + TypeScript (strict) + npm as the foundation.**

**Core runtime additions:**
- `@react-three/fiber` + `three` + `@react-three/drei` for 3D scene.
- `zustand` for live simulation control state.
- `zod` for all external/reference data contracts.
- `astronomy-engine` (pure JS/TS, VSOP87) **strictly for reference positions and validation**, not as the live simulator.
- Web Workers for the physics integration loop.
- Later: shadcn/ui + Tailwind (multi-theme), TanStack Query for any reference data, Vitest for tests.

**High-level architecture (layers):**
1. `lib/physics/*` — pure, side-effect-free (Vec3, constants with documented units, integrators, NBodySystem). This is the most important module for correctness and future portability (WASM extraction path).
2. `lib/astro/*` + `lib/predict/*` — reference ephemeris wrapper + eclipse catalog + pure prediction/search logic.
3. Worker + Zustand orchestration layer.
4. Three.js visualization (pure consumer of snapshots).
5. Feature-sliced UI (`features/*/`) following the crypto-dashboard model.

**Package manager:** npm (package-lock.json committed). Explicitly chosen to match the reference project and user preference.

## Consequences

**Positive:**
- Matches workspace conventions → immediate reuse of AGENTS.md patterns, coding/commit style, shadcn primitives, providers, hook/data patterns, small-commit discipline.
- Excellent DX for interactive 3D + tables of predictions + time controls.
- Easy deployment (Vercel) and sharing via URL.
- Physics core remains testable and evolvable without touching React/three.
- astronomy-engine gives high-quality ground truth for validation without shipping large kernels or requiring network for every frame.
- Workers give credible performance/scalability story from the start.

**Negative / Trade-offs:**
- Browser double-precision + chosen integrator will have measurable drift vs JPL DE over long timespans. We accept this for an educational/exploratory simulator and surface validation deltas prominently. (Mitigated by symplectic integrators, documented tolerances, and reference mode.)
- Three.js scene will require careful handling of scale (AU vs Earth-Moon). Multiple camera/LOD modes will be needed.
- Not the absolute highest numerical accuracy possible (Python + REBOUND/WHFast or SPICE would be stronger there). We chose the stack for interactive senior web app quality + workspace alignment. A Python companion CLI or WASM core is a documented future evolution path.

## Alternatives Considered

- Pure Python scientific stack (astropy/poliastro/skyfield + rebound + Streamlit/Dash/PyVista): Superior accuracy and existing astro libs out of the box. Rejected for primary implementation because the interactive polished 3D "playable" experience and consistency with demonstrated senior web patterns in the workspace would suffer. May be added as companion tool later.
- Rust core (WASM) from day 1: Best long-term perf/precision. Rejected for initial empty-dir start due to added complexity and slower iteration on the UI/viz/prediction experience. Physics module is deliberately designed to be extractable later.
- Godot/Unity or Tauri desktop first: Loses zero-install web shareability and workspace pattern match.
- Pure Keplerian elements (no N-body): Too limited for "simulates the solar system" and interesting dynamics/perturbations. Still useful as fast reference mode (we may implement a hybrid toggle).

## Verification

- The stack choice is reflected in the first working `npm run dev` experience (3D + controls).
- All major follow-on numerical decisions (specific integrator, units, eclipse search approach, initial conditions source) will receive their own ADR in `docs/decisions/`.
- After scaffold + first physics + viz slices: `npm run typecheck && npm run build && npm run lint` must pass cleanly.

## References
- crypto-dashboard project structure, AGENTS, coding-style, commit-style (sibling directory).
- astronomy-engine npm package and VSOP87 accuracy claims.
- Public three.js solar system examples (scene setup, scaling, trails).
- Literature on symplectic integrators (leapfrog, Yoshida, Wisdom-Holman/WHFast) for solar system stability.
- NASA GSFC eclipse catalogs for validation data.

This ADR (and all future ones) must be referenced in commit messages and planning when relevant changes are made.
