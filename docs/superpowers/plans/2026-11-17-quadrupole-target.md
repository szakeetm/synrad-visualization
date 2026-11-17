# Quadrupole target implementation plan

> Use superpowers:executing-plans to implement task by task.

**Goal:** Show evolving quadrupole electron trajectories and photons traveling to a downstream target.
**Architecture:** A cached transport model supplies numerical readouts, photon packets, time snapshots and scene geometry. The app resets its clock on parameter changes; scene snapshots compute arrived hits without accumulating duplicate frames.
**Tech stack:** Existing JavaScript modules, Canvas 2D, SVG chart, node:test.
**Spec:** ../specs/2026-11-17-quadrupole-target-design.md

## Constraints
No dependencies. Preserve prior tab removal. Keep existing shared energy, pause/reset and entrance reference plot.

## Review focus
Zero gradient emits nothing; strong defocusing loses particles at the bore; no target hit before arrival; repeated/paused draws cannot duplicate hits; changed parameters restart the run.

## Tasks
- [x] Add tests for analytic focusing/defocusing, tangent ray propagation, wall interception, power integration, seeded sampling and arrival accounting. Run them red.
- [x] Implement src/quadrupole-model.js: quadrupoleTransport(initial, state, z), createQuadrupoleModel(state), getQuadrupoleModel(state), quadrupoleSnapshot(model, time). Run model tests green.
- [x] Add src/quadrupole-scene.js, route through renderMagnet; show entrance, two projections and 2D target with shared coordinates and arrived packet map. Add numeric Canvas verification.
- [x] Add controls and app clock/progress routing; update quadrupole readouts/explanation and README. Test restart, pause, completion and control extrema.
- [x] Run npm test and git diff --check, visually inspect the rendered scene, and obtain an independent review before completion.

Execution ruling: implement in the current shared checkout to preserve the user's active workspace; no branch integration or publishing is requested. Native execution follows the user's approval to implement; no further approval is needed for reversible edits.

## Verification record
All 114 tests passed during implementation, including seven model/render tests and the app pause/reset test. Independent review found no important defects. Canvas commands were rendered to standalone PNGs and inspected at mid-flight, completion and strong defocusing. Browser host was unavailable, so actual browser painting and responsive layout were not visually checked.

Ruling: finite 25 mm bore limits otherwise unbounded ideal defocusing; absorbed electrons stop emitting, photons terminate at first wall hit, and no secondary radiation is generated.
