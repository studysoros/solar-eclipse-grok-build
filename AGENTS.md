<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## Commit Discipline (Very Important for this project)

This repo follows a strict **senior-engineer commit style**.

**Read and follow `docs/commit-style.md` for all commit-related work.**

Key points:
- Never commit large amounts of work in a single "big bang" commit.
- Break changes into small, scoped, single-concern commits using conventional format (`feat(scope):`, `chore(scope):`, etc.).
- Commit messages must be explanatory (what + why + key patterns).
- When the user has a dirty tree after substantial implementation, first propose a commit breakdown plan, then use selective `git add <specific paths>` + good messages.
- Work on feature branches. Primary branch is `main`.
- History should tell a clear story and remain useful for review, blame, and onboarding.

Always reference `docs/commit-style.md` when the user asks you to implement features or help with commits.

## Coding Style (Senior-Level Code)

This project demands **senior-level code** — maintainable, scalable, well-structured, and a pleasure to work on months later.

**Read and follow `docs/coding-style.md` for all implementation work.**

Key expectations:
- Feature-sliced architecture (vertical slices under `features/`, shared code in `lib/`).
- TanStack Query for server/reference state + Zustand for live simulation control state.
- Zod schemas as the source of truth for external/reference data + strict TypeScript.
- Pure physics modules (no UI, no three.js) that are easy to test in isolation.
- Performance by default (Web Workers for integration loop, proper memoization in viz, client-only heavy 3D components).
- shadcn/ui + Tailwind as the UI foundation.
- Clear separation: pure physics/math → prediction/validation → state/hooks → presentation/viz.
- Code should be easy to test (physics conservation, eclipse logic, worker messaging).

Always reference `docs/coding-style.md` when writing or refactoring code.

## Solar Eclipse Simulator Specifics

- The heart of the project is accurate, verifiable N-body simulation and eclipse prediction. Physics code in `lib/physics/**` (and `lib/predict/**`) **must** be pure, dependency-free (except math), and unit-testable.
- Use `astronomy-engine` strictly for reference/validation snapshots and cross-checks, never as the source of truth for the live simulation.
- Numerical choices (integrator, timestep, units, initial conditions) must be documented in `docs/decisions/`.
- Visualization (three.js / R3F) is a consumer of simulation state snapshots only. Keep the render loop decoupled from the integrator.
- Validation against known eclipses (NASA catalogs) and reference ephemerides is a first-class, visible feature.
- All time handling uses Julian Dates (JD) internally for astronomical accuracy; expose Gregorian/ISO in the UI.
