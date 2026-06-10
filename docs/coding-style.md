# Senior-Level Coding Style for this Project

This document defines the expected **coding style and architectural patterns** for the solar-eclipse-grok-build project. The goal is maintainable, scalable, readable, and testable code that a senior engineer would be proud to review, maintain, or hand off.

All agents (Grok Build, Claude, etc.) and human contributors must follow these patterns.

> **Complements** `docs/commit-style.md`. Good commits are useless if the code itself is messy.

## Core Principles

1. **Feature-Sliced Architecture** (Vertical Slices)
   - Organize by **domain/feature**, not by technical layers.
   - Preferred structure:
     ```
     features/
       solar-system-viz/
         components/
         hooks/
       eclipse-predictor/
         components/
         hooks/
         schemas.ts     # Zod + inferred types for predictions + catalog
     lib/
       physics/         # PURE, testable, no UI deps — the crown jewel
       astro/           # reference ephemeris (astronomy-engine wrapper), eclipse catalog
       predict/         # eclipse search / circumstances (pure)
       workers/         # sim.worker.ts
       utils.ts
     components/ui/     # shadcn primitives (owned)
     ```
   - A feature or physics module should be movable or deletable with minimal impact on other code.

2. **Clear Separation of Concerns (Critical for Scientific Code)**
   - **Pure physics / math layer** (`lib/physics/**`): Vec3, constants, integrators, NBodySystem. Zero React, zero three.js, zero DOM. Only plain TS + numbers.
   - **Reference & validation data** (`lib/astro/**`): astronomy-engine calls, known eclipse catalog (Zod), JD helpers. Used for cross-checks and "sim vs reality".
   - **Prediction layer** (`lib/predict/**`): eclipse finder, syzygy detection, type classification, circumstances. Pure or lightly stateful.
   - **State orchestration** (hooks + Zustand): live simulation time, speed, camera mode, selected body. Worker messaging lives here.
   - **Visualization** (three.js consumers): dumb renderers driven by snapshots from the sim state. Heavy lifting stays in the worker + pure modules.
   - **Presentation** (UI components/pages): orchestrate via hooks; minimal logic.

3. **Type Safety First**
   - Strict TypeScript (tsconfig is already strict).
   - **Zod schemas** are the source of truth for any data coming from outside or that needs runtime validation (eclipse catalog, worker messages, saved sim states, reference positions).
   - Prefer `z.infer<typeof Schema>` over hand-written interfaces for external/reference data.
   - Never use `any` except in the rarest justified cases (and document why in a comment + ADR if architectural).

4. **Simulation State vs Reference Data**
   - **Zustand** for the live, mutable, client-only simulation control state (current JD/time, isPlaying, speed, trails, camera target). This is the "single source of truth" for what the user is seeing right now.
   - Reference data (catalogs, astronomy-engine snapshots) can use TanStack Query or simple cached modules.
   - The physics integrator itself runs in a Web Worker and communicates via postMessage with typed payloads (Zod validated on both sides where practical).

5. **Numerical & Physics Hygiene (Domain-Specific)**
   - All physics code must be **pure** and side-effect free (except the worker loop itself).
   - Units and coordinate conventions are documented in ONE place (`lib/physics/constants.ts` + comments). Prefer AU + solar masses + days for long-term stability.
   - Choose integrators deliberately (leapfrog/Verlet or higher-order symplectic preferred for conservation). RK4 is acceptable for short accurate bursts. Document the choice and its limitations in an ADR.
   - Validation is mandatory: energy/momentum drift tests, orbital period checks, and comparison against reference ephemeris at known epochs.
   - Time is kept in Julian Date (JD) internally for astronomical correctness.

6. **Performance by Default**
   - The integration loop belongs in a Web Worker so the React/Three render loop can stay at 60 fps.
   - Expensive re-renders → `useMemo`, `useCallback`, React.memo, and stable snapshots from the worker.
   - Trails and many bodies → buffer geometry + decimation / LOD.
   - Three.js heavy components must be client-only (`'use client'` + dynamic import with `ssr: false` where needed).
   - Camera and scale tricks are required because the real solar system spans many orders of magnitude.

7. **Component & Hook Hygiene**
   - Components in `features/*/components/` should be small and focused.
   - Extract complex logic (time stepping, prediction search, camera behaviors) into custom hooks or pure modules.
   - Prefer composition.
   - Use shadcn/ui primitives as building blocks.

8. **Error Handling, UX & Scientific UX**
   - Every data / prediction boundary should have loading, error, and empty states.
   - Validation results ("sim predicts eclipse 2024-04-08, delta to catalog: 1.2 hours") should be visible and not buried in console.
   - Use sonner toasts for non-blocking feedback.
   - "Last known good" simulation state is better than a crashed or frozen view.

9. **Naming & Readability**
   - Names reveal intent (`useSimulation`, `propagateLeapfrog`, `findSolarEclipses`, `EclipseCatalogSchema`).
   - Files and folders named after primary responsibility.
   - Keep functions small. Physics functions especially should do one thing.
   - Comments explain *why* (numerical stability trade-off, coordinate frame choice, approximation), not *what*.

10. **Testing Mindset**
    - Physics modules are designed to be tested with plain Vitest (no DOM).
    - Worker messaging should be testable.
    - Future tests: Vitest + React Testing Library + jsdom + MSW (if any network reference data).

## Technology-Specific Conventions

- **Next.js 16 (App Router)**: Server Components by default. `'use client'` as deep as possible. Route handlers only if/when we add proxies for external data.
- **shadcn/ui + Tailwind v4**: Use the design system. Adapt the multi-theme setup from the reference crypto project (data-theme + CSS vars). A "space" / dark-first aesthetic is natural.
- **Three.js / R3F**: Scene is a pure consumer of `SimulationSnapshot[]`. Do not put integration math in components. Use drei helpers for controls, but keep custom camera behaviors in hooks.
- **Workers**: `lib/workers/sim.worker.ts` (or similar). Post plain serializable objects. Version the message protocol.
- **Local Persistence**: Use `localStorage` + Zustand persist middleware only for UI prefs (speed presets, last camera mode, watchlist of bodies). Never for authoritative simulation state.
- **Astronomy Engine**: Import for reference only. Wrap in `lib/astro/reference.ts`. Never use its positions as the live simulation truth unless explicitly in a "reference mode" (documented).

## What Senior Code Does *Not* Do Here

- Put physics calculations inside React components or effects.
- Mix three.js Vector3 directly into the integrator (keep a small pure Vec3 or use a typed array view).
- Treat the simulation as "good enough" without visible validation against real data.
- Big god components that own time, physics, prediction, and rendering.
- Magic numbers or undocumented coordinate/unit choices.
- Over-engineering the first integrator (start with leapfrog, prove it, then add alternatives behind an interface).

## How to Apply This When Implementing

When asked to build a new feature or module:
1. Identify the vertical slice or physics subdomain.
2. Start with data contracts (Zod schemas + pure TS types for Body/State).
3. Implement the pure layer first (`lib/physics` or `lib/predict`).
4. Add worker contract + Zustand store / hook if live state is involved.
5. Build the visualization or UI consumers (small components).
6. Wire validation / comparison where relevant.
7. Add loading/error/empty states.
8. Verify: `npm run typecheck`, `npm run build`, `npm run lint`, relevant tests.
9. Update `docs/decisions/` with an ADR for any significant numerical or architectural choice.

Update `docs/decisions/` with an ADR when you make a significant architectural choice (integrator, units, eclipse algorithm approach, worker protocol, etc.).

## Related Documents

- `docs/commit-style.md` — How we commit (equally important).
- `README.md` — High-level project status and getting started.
- `docs/decisions/` — Record of important architectural decisions (mandatory for physics choices).
- `AGENTS.md` — High-level rules + simulator-specific notes.

---

This file exists so that any future agent or contributor can be told:
> "Follow the coding style in `docs/coding-style.md` and the commit style in `docs/commit-style.md`."

Senior code is not about clever tricks — it is about code that is a pleasure to work with six months from now, when the requirements have changed and the original author is gone. For a scientific simulation, that also means the results remain explainable and the approximations are documented.
