# Cavity radiation packets

User request: remove the optional cavity walls from standalone Synrad2D and
add a separate teaching-lab experiment showing outward-moving radiation
packets and forward transmission through a cavity.

Design: the new `#cavity` tab follows the existing lab's Canvas/SVG/control
layout. Controls set entrance Lorentz factor, energy gain and pipe aperture.
A constant longitudinal force accelerates an electron along a 1 m gap.
Equal-energy packets sample the full axisymmetric angular power and source
time. Packet centers travel at c with the electron's clock; paired tracks
represent meridional sections of radiation rings. The scene preserves one
geometrical scale and terminates packets at the first wall hit. The plot
compares normalized entrance/exit angular power with lin/log controls.

Port and wall fractions are geometrical estimates. Absorbing walls, no RF
phase or electromagnetic wall response, no reflection/diffraction/interference,
no spectrum or radiation reaction. A downstream port is a finite observation
plane, not guaranteed escape through an arbitrary beam pipe.

Files: `src/cavity-physics.js` owns source motion, angular sampling and exact
ray/polygon intersection. `src/cavity-scene.js` owns animation. Existing
experiments/views/app modules provide navigation, controls, metrics and plot.
Standalone Synrad2D remains separate and externally linked.

- [x] Remove outline and toggle from standalone, retaining acceleration mode.
- [x] Write failing model tests; implement motion, power sampling and first hits.
- [x] Add scene, experiment, chart and model documentation.
- [x] Check all existing experiments and axis-scale combinations.
- [x] Review model and rendered UI; label arrows as force on the electron.

Deployment: both repositories are published independently; the teaching lab
links to standalone Radiation2D rather than bundling it.
