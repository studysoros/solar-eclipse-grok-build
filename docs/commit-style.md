# Commit Style Guide for this project

This project follows a **senior engineer** commit discipline. The goal is to keep history clean, reviewable, and useful for `git blame`, `git bisect`, future contributors, and yourself.

**Never** do big "everything at once" commits when significant work has been done.

## Core Rules

1. **One concern per commit**
   - Each commit should be small and focused on a single logical change or layer.
   - Examples of good boundaries:
     - Config + environment
     - Providers / DI setup
     - Data access layer (reference ephemeris, catalogs)
     - Pure physics (types, constants, vec3, integrators)
     - N-body system + worker
     - Type contracts / schemas / query keys
     - Feature hooks or business logic (eclipse prediction)
     - UI components / pages / viz (three.js consumers)
     - Styling / theme in isolation
     - Documentation / README / ADRs

2. **Use Conventional Commit format with scopes**
   - `feat(physics): ...`
   - `feat(viz): ...`
   - `feat(predict): ...`
   - `chore(config): ...`
   - `fix(integrator): ...`
   - `docs: ...`
   - `test(physics): ...`
   - `refactor(worker): ...`

3. **Commit messages must be explanatory**
   - Subject line: short and imperative.
   - Body: explain **why** this matters, key patterns used, important decisions, or gotchas.
   - Bad: `added nbody and three scene`
   - Good: `feat(physics): implement leapfrog integrator + nbody system with Vec3

     - pure module, no React/three deps
     - basic energy conservation test scaffold
     - units documented (AU, solar masses, days)

     This establishes the verifiable core that the viz and predictor will consume.`

4. **Order matters — tell a story**
   - Commits should usually flow in this kind of order when building new areas:
     1. Foundations / config / deps (npm)
     2. Shared utilities + providers + theme
     3. Data contracts / schemas / reference catalogs (Zod)
     4. Pure physics layer (lib/physics)
     5. Worker + simulation state (Zustand)
     6. Viz (three.js features)
     7. Prediction + validation logic
     8. UI composition + pages
     9. Polish, tests, docs, ADRs, README
   - Documentation (especially ADRs and README) usually comes toward the end or in its own commit.

5. **How to handle large amounts of uncommitted work**
   - Do **not** run `git add . && git commit -m "big feature"`.
   - First, propose a breakdown of commits (list of 5–12 scoped commits).
   - Then execute using selective staging:
     ```bash
     git add path/to/specific/files-or-dirs
     git commit -m "feat(scope): ..."
     ```
   - When backfilling history on a brand new repo (all work done locally with no commits), use an orphan branch + selective adds to create a clean root history.

6. **Branching**
   - Do work on feature branches: `git checkout -b feat/eclipse-finder`
   - Keep `main` (this repo's default branch) stable and with clean history.
   - Merge or rebase onto main only after the feature is broken into proper commits.

7. **Verification before finalizing commits**
   - After major commit batches, run:
     - `npm run typecheck`
     - `npm run build`
     - `npm run lint`
     - `npm test` (when present)
   - Leave the working tree clean (`git status` should be empty) when handing off.

## For New Features / Future Sessions

When the user asks you to implement something substantial:
1. Implement the code in the existing architecture (feature-sliced under `features/`, physics in `lib/physics`, etc.).
2. At the end (or at natural checkpoints), **stop** and propose a commit plan.
3. Get confirmation on the plan.
4. Then walk the user through (or directly execute) the series of scoped `git add` + `git commit` commands using the style above.
5. Update the README / docs / decisions/ folder when appropriate as part of the final commits.

## Current Branch

The primary branch for this repo is `main` (not `master`).

## Creating Pull Requests

After pushing a feature branch that has clean, senior-style commits:
1. **Always explicitly provide a recommended PR title and PR body** to the user.
2. Present the title and body in clear, copy-pasteable blocks.
3. Good PR titles are usually in the form:
   - `feat(physics): add leapfrog + basic nbody propagation with conservation tests`
   - `chore(config): add typecheck, vitest scripts and Zod dependency`
4. Include a short note that the branch follows the project commit style.

## Reference

This file exists so any agent (Grok Build or otherwise) can be told:
> "Follow the commit style in docs/commit-style.md exactly."

## Why This Matters

- Makes code review and onboarding dramatically easier.
- History remains useful 6–12 months later.
- Shows professional craftsmanship (important for portfolio / production-intent projects like this one).
- Avoids "atomic" commits that are actually 800-line monsters.

Use this as the model going forward. The initial history should establish clean foundations → physics → viz → predictions → docs.
