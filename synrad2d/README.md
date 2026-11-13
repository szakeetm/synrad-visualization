# Radiation2D browser · CAS2026 suite edition

An interactive, dependency-free Canvas 2D visualization of radiation from a moving charge. Drag with a mouse or touch, or explore an oscillator, a dipole bending magnet, and a wiggler. Selecting Free drag resets the charge to rest at the center.

## Run

This copy is bundled inside the CAS2026 Synrad visualization suite. Run `npm start` from the suite repository root and open **http://localhost:4173/#synrad2d**. The suite includes all runtime assets locally.

The browser implementation was imported from `synrad2d-browser` at commit `122ba9e221c5a562d353e5d1a6234cd29800130c`. The suite adds local navigation, embedded sizing, and full-name credits. The physics and rendering implementation and its tests are included here.

## Controls

- Free drag: press anywhere in the canvas and move the pointer. The charge follows with damped, relativistic motion; it cannot exceed c.
- Oscillator: one charge oscillating vertically, demonstrating dipole radiation. Peak speed is βc; amplitude A gives angular frequency β/A.
- Dipole: a 30° sector bending magnet with tangent straight entry/exit paths, at constant speed βc. Adjust the bend radius. Repeat pass (on by default) replays from the entrance with fresh incoming field history after the charge and its glow have fully left the viewport; turn it off for a continuous exit into the laboratory frame. Replaying resets the demonstration, rather than teleporting a particle within retained physical history.
- Wiggler: straight entry from the left edge; sinusoidal transverse momentum in the magnetic region from 25% to 75% of the viewport width; straight exit to the right edge. K is peak transverse momentum / mc. The app limits K to 0.98γβ so forward motion stays possible at the selected total speed. Defaults distinguish gentle and stronger deflection; both presets share the same equations.
- Magnet periods selects 1–8 complete periods inside the finite magnetic region. Repeat pass is at the top of **02 Tune the particle** for Dipole and Wiggler (on by default). It returns to the entrance with fresh field history at the end of each pass; turn it off to let the charge continue out of view. c = 1 throughout.
- Switch field lines, pink wavefronts, and yellow trajectory independently. The view stays fixed in the laboratory frame: the particle moves through the viewport. There are no zoom or follow-camera controls.
- Pause, single step, reset, playback speed (0.25×–4×, default 2×) and field-detail controls. Space pauses/resumes, `.` steps while paused, R resets. Focus the canvas and use arrow keys to move the free-drag target.
- **Low power** in the display controls helps older laptops: it displays at most 36 field lines, caps canvas resolution at one backing pixel per CSS pixel, and renders at up to 30 fps. The simulation keeps its fixed physics timestep and selected playback speed. Switching it on or off preserves the current motion and history; switching it off restores the selected field detail and normal resolution.
- Motion/particle parameter changes reset and prefill compatible field history. Display-only changes preserve the simulation. Reduced-motion preferences start playback paused.

## Physics and limits

Each emission stores the position and velocity of the charge. Equally spaced rest-frame directions are Lorentz-aberrated into the laboratory frame, following Shintake's equation (4). Each resulting wavelet travels straight at c; its position is emission position + age × direction, equation (5). Connecting corresponding direction labels across emission history draws field lines. Pink circles show emission wavefronts.

The simulation uses a fixed 1/120 normalized-time step and at most 15 time units of history (1801 emissions). The initial scene is prefilled with 12 units of trajectory. For the finite magnetic trajectories, earlier field geometry is reconstructed analytically from their incoming drift, magnetic region, and outgoing drift. Their field lines extend beyond the viewport even at high β or on wide displays, without enlarging the stored history. Traveling demonstrations reset their history between repeated passes, avoiding radiation artifacts from position wrapping. Resizing the viewport restarts the wiggler pass so the magnetic region remains at the quarter and three-quarter marks. Canvas draws a planar slice of a 3D field. Line crowding qualitatively illustrates field geometry; brightness is not calibrated field strength or radiation power. Wavefronts exist for a static charge too, and do not by themselves signify energy loss. No power spectrum, multi-particle effects, or interference calculation is performed.

## Credits and provenance

**Tsumoru Shintake** created the original **Radiation2D** and the wavelet visualization method. The screenshots and equations from his LINAC2002 paper inspired this implementation:

- Tsumoru Shintake, [“New Real-Time Simulation Technique for Synchrotron and Undulator Radiations”](https://accelconf.web.cern.ch/l02/PAPERS/TH426.PDF), Proceedings of LINAC2002, Gyeongju, Korea, pp. 659–661.
- Tsumoru Shintake, [“Real-time animation of synchrotron radiation”](https://doi.org/10.1016/S0168-9002(03)00844-1), Nuclear Instruments and Methods in Physics Research A **507** (2003), 89–92.
- [Original software and manuals at OIST](https://www.oist.jp/research/research-units/qwmu/software).

**Andrei Frolov** wrote the open-source [Radiation 2D Swift reimplementation for macOS and iOS](https://github.com/andrei-v-frolov/radiation-2d) (2023), licensed under GPL-3.0. Its trajectory and relativistic pointer-following model informed this browser version. Source inspected at commit `e8ce0d0c6e862d07025fa33ee80fc9f6ed5f36d4`. This browser version implements its own JavaScript physics and rendering; the inspected Swift revision contains trajectory/UI scaffolding rather than the complete field-line renderer.

Credits are also visible in the app footer and its Science & credits dialog. This browser version is released under **GPL-3.0-only**; see [LICENSE](LICENSE). The original Windows program's licensing is separate; no Windows binary or source is included.

## Verify

Run from the suite repository root to include the bundled tests.

```sh
npm test
```

Node's built-in tests check Lorentz aberration, light propagation, subluminal trajectories and dragging, K normalization, reset, and bounded history. Browser interaction checks complement these physics tests.

The renderer simplifies field paths with a screen-space error tolerance of
0.35 CSS pixels (1 pixel in low power), retaining endpoints and sharp bends.
Unchanged paused scenes are not repainted. Regression tests cover the geometric
error bound, reduced drawing work, display invalidation, and low-power playback
timing. Canvas command counts measure reduced drawing work; actual FPS depends
on the laptop and browser.

## Virtual accelerating cavity

The fifth preset accelerates the charge along +x through a finite ideal gap.
Entrance speed and energy gain Δγ are adjustable; the central gap applies
constant force (`dp/dt = F`, `dγ/dx = F`, c=m=1). Straight drifts join the
gap continuously; Repeat pass restarts with compatible incoming field history.
There is no RF phase, fringe field, focusing, or radiation reaction.

A separate live diagram compares the instantaneous rest-frame and lab-frame
angular power shapes. Radial length is `dP/dΩ` per source time, each curve
normalized to its own peak: `sin²θ / (1 − β cosθ)⁵` for longitudinal acceleration.
The lab pattern is an axisymmetric hollow forward cone with a dark axis;
the displayed two lobes are a planar slice. Peak angle tends to `1/(2γ)`.
In drifts the diagram is labeled as a reference shape: actual radiation is off.
The field-line brightness remains qualitative.

Reference: Jackson, *Classical Electrodynamics*, §14.2 (angular distribution
for linear motion).

The cavity preset shows accelerating electric-field arrows above and below
the beam axis. No cavity walls or wall-interaction model are displayed.
