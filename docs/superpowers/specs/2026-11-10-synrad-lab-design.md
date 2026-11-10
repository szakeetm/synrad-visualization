# Synrad interactive lab

Approved in conversation: a tabbed teaching lab with nine animated experiments, sliders, live plots, lecture references, and clearly labeled model assumptions.

Source: Márton Ady and Gabriel Saretti, CERN, “Synrad tutorial”, CAS Prague, 16 November 2026, 44 pages. Read from the user's Downloads folder. The original PDF is not redistributed.

## Intent
Make the lecture's radiation physics tangible for students. Change a parameter and see the geometry, distribution, and derived quantities respond together.

## Experience
Nine views: spectrum, reference frames, vertical distribution, horizontal distribution, polarization, reflection, penetration, rough surfaces, insertion devices. Each has an animated Canvas scene, an accessible SVG plot with units, controls, live numeric readouts, explanation, equation and lecture slide references. Shared electron energy persists across relevant experiments. Pause, reset, keyboard navigation, mobile layout and reduced-motion support are required.

## Approaches
Chosen: a tabbed lab, focused on one experiment at a time. Alternative: a scrolling lesson, easier for linear reading but less convenient for returning to individual experiments. A full numerical engineering simulator was excluded in favor of the user's requested teaching tool.

## Implementation decisions
Builder's choice: dependency-free ES modules, HTML/CSS, Canvas animation and SVG plots. Node's built-in test runner tests numerical invariants. Static assets run from any HTTP server and GitHub Pages. GitHub is the requested delivery destination; no separate Sites hosting is needed.

Use numerical modified-Bessel integration for the universal SR spectrum and energy-resolved vertical polarization components. Use exact aberration of directions for the frame comparison. Horizontal fan geometry is a uniform bend convolved with a finite angular width. Material optics uses a free-electron refractive-index approximation and attenuation uses an illustrative photoelectric power law, with limitations visible beside the controls. Roughness suppresses specular reflection and a qualitative microfacet scene illustrates scattering. Undulator harmonics use finite-period interference; the wiggler limit is shown as a qualitative broad envelope.

## Constraints
No external dependencies, user data uploads, or redistributed PDF. No claims of tabulated material accuracy or engineering-grade predictions. Preserve the lecture's distinction between photon flux per relative bandwidth and spectral power density. Push to the supplied repository after verification. Use sources and assumptions visibly in the app.
