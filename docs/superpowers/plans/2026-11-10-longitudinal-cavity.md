# Longitudinal cavity implementation

Goal: extend the existing Synrad2D teaching simulator with a virtual accelerating
cavity that demonstrates forward beaming during longitudinal acceleration.

Architecture: retain the existing wavelet history and fixed lab view. Add an
analytic constant-force straight path through the central half of the viewport,
with adjustable entrance β and energy gain Δγ. Use continuous incoming and
outgoing drifts and the existing fresh-history replay. Keep standalone and
bundled runtimes identical; preserve credits and GPL-3.0 attribution.

The comparison diagram uses the instantaneous emitted angular power per source
time, sin²θ/(1−β cosθ)⁵, normalized independently in each frame. It must show the
axial null and distinguish non-radiating drifts from the active gap. Place the
diagram below the field canvas so it cannot obscure the particle on phones.
The ideal gap omits RF phase, fringe fields, focusing, and radiation reaction.

- [x] Add failing tests for energy gain, trajectory continuity, subluminal
  displacement, angular peak/narrowing, axial null, and compatible replay history.
- [x] Implement `createCavityPath`, `longitudinalPattern`, and
  `longitudinalPeakAngle`; connect the path to Simulation and field tails.
- [x] Add the fifth preset, controls, gap arrows, live frame comparison,
  model labels, and documentation.
- [x] Review physics and responsive layout; move comparison below main canvas.
- [x] Synchronize standalone source and tests; run both suites and static build.
- [x] Verify browser initialization and cavity controls.
