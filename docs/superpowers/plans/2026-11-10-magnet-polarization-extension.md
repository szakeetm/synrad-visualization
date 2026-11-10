# Magnet and Polarization Extension Implementation Plan

> Use native execution with bounded scene tasks delegated to subagents, as authorized by the user.

Goal: add two source tabs and local angular polarization maps to the existing lab.
Spec: ../specs/2026-11-10-magnet-polarization-extension.md

- [x] Add failing numerical tests for field-zero/gradient/offset scaling, dipole formulas, local angular symmetries, pi nodal axes and integrated 7:1 power ratio.
- [x] Implement pure functions in physics.js and verify tests.
- [x] Add dipole/quadrupole metadata and quantitative view models; add polarization mode and slice controls with conditional visibility.
- [x] Delegate magnet-scenes.js and polarization-scenes.js; integrate render dispatch without changing existing modes.
- [x] Test all defaults/extrema, scene render smoke checks and browser interactions; review models and labels independently.
- [x] Update documentation and commit/push the verified extension to the established GitHub destination.

Review focus: spectral vs integrated polarization labels, common component normalization, zero offset with finite beam size, zero dipole field, mode switching/reset, narrow-layout control access.
