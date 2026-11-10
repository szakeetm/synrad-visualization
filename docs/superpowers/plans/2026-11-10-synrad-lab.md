# Synrad Lab Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the approved nine-view browser teaching lab and push it to the requested GitHub repository.

**Architecture:** Pure numerical functions in src/physics.js, experiment descriptions and controls in src/experiments.js, rendering in src/render.js, application state and SVG charts in src/app.js. No runtime dependencies.

**Tech Stack:** HTML, CSS, JavaScript ES modules, Canvas, SVG, Node test runner.

**Spec:** docs/superpowers/specs/2026-11-10-synrad-lab-design.md

## Global Constraints
- Nine experiments, labeled units, visible assumptions and slide references.
- No external dependencies, user data uploads, or redistributed PDF.
- GitHub is the delivery destination; no separate hosting service.

## Review Focus
- Parameter extrema must produce finite values and useful plots.
- Pause and reduced-motion must stop time without blocking control updates.
- Mobile viewport must keep controls reachable without horizontal overflow.
- Reset must restore controls and the shared electron energy consistently.
- Photon flux and power labels must match the quantity plotted.

## Task 1: Numerical models
Files: src/physics.js, tests/physics.test.js, package.json.
Interface: exported gamma, criticalEnergy, spectrum, vertical, aberrate, reflectivity, transmission, specularFraction, undulatorEnergy functions.
- [x] Write tests for known critical energy, E³ scaling, aberration limits, zero perpendicular intensity on-axis, spectrum peak and equal-power critical split, Beer-Lambert limits, bounded reflection and roughness, undulator scaling.
- [x] Run npm test; confirm missing implementation fails.
- [x] Implement the functions with documented units and assumptions.
- [x] Run npm test; expect all tests pass.

## Task 2: Interactive teaching app
Files: index.html, styles.css, src/experiments.js, src/render.js, src/app.js.
Interface: experiment metadata defines controls/defaults; renderScene(ctx, width, height, experiment, state, time) draws animation; app owns state and plot generation.
- [x] Implement nine tabs, shared energy, accessible controls, derived metrics and chart traces.
- [x] Add animated scenes and responsive styling; support pause, reset and reduced motion.
- [x] Serve locally and verify each tab, pause/reset and narrow layout in Safari. Numerical control extrema checked in automated tests.

## Task 3: Delivery
Files: README.md, .github/workflows/pages.yml, .gitignore.
- [x] Document run/test instructions and model limitations with primary references.
- [x] Add a GitHub Pages workflow, requiring no application build.
- [x] Run npm test and syntax checks; review files and browser output.
- [ ] Commit and push main to the supplied empty repository; verify remote commit.
