# CAS2026 - Synrad visualization

A browser teaching companion to **“Synrad tutorial”**, Márton Ady and Gabriel Saretti (CERN), CAS Prague, 16 November 2026. The experiments pair animations with controls, plots and equations. The **Radiation2D browser** tab embeds the bundled browser edition of Radiation2D inside the suite. Its local source, tests, credits and GPL-3.0 license are included in `synrad2d/`. **Tsumoru Shintake** created the original Radiation2D and wavelet visualization method. See [Radiation2D browser credits and provenance](synrad2d/README.md).

## Run

Requires Node.js 20 or newer. No dependency installation or build step:

```sh
npm start
```

Open **http://localhost:4173**. Alternatively, serve this directory with any static HTTP server. JavaScript ES modules require HTTP rather than opening `index.html` through `file://`. All application assets are local.

Each plot has independent **X axis** and **Y axis** Lin/Log controls. Scale choices are remembered per experiment while switching tabs; Reset restores the original defaults. Signed angular axes use **Sym log**, preserving negative angles and zero with a linear region within 1% of the largest displayed absolute angle. On nonnegative logarithmic axes zero is omitted, and values below the plotted range are clipped without an artificial floor.

The Reference frames γ slider starts at 1 and is spaced uniformly in rapidity (`γ = cosh η`), giving fine control near rest while retaining the range to γ = 30. Presets provide exact comparisons at 1, 1.01, 1.1, 2, 5 and 30; the readout shows actual γ, not slider position.

```sh
npm test
```

The numerical tests check critical-energy scaling, the universal spectrum, directional aberration, polarization symmetry, attenuation, bounded reflection, roughness suppression and the undulator equation. Plot checks cover default values, all individual control extrema, spectrum visibility at low energy, and weak-K harmonic suppression. Browser checks complement these tests for navigation, controls, pause/reset and responsive layouts.

## Experiments

| View | What to change | Lecture slides |
| --- | --- | --- |
| Radiation2D browser | Drag a charge, oscillator, dipole, wiggler, virtual cavity, field lines and wavefronts | 2 |
| Spectrum | Flux/power per 0.1% bandwidth, absolute/peak scale, energy presets, radius, dipole length, current | 7–12 |
| Reference frames | Shaded 3D dipole/forward lobes, demonstration Lorentz factor, angular slice plane | 13 |
| Vertical distribution | Electron energy and photon energy / critical energy | 14–16 |
| Horizontal distribution | Electron energy, bend angle, screen distance | 17–18, 25 |
| Polarization | Sampled σ/π/sum XY heatmaps, fixed zero-angle slice, energy-resolved samples | 16, 18 |
| Reflection | Photon energy, grazing angle, material | 20 |
| Penetration | Photon energy, thickness, material | 21 |
| Rough surfaces | Photon energy, grazing angle, RMS roughness | 22–23 |
| Dipole | Electron energy, uniform field, magnet length, current | 3, 11, 25 |
| Quadrupole | Electron energy, field gradient, round-beam size, offset, length | 26–27 |
| Insertion devices | Electron energy, K, magnetic period, number of periods | 5, 28–29 |
| Cavity radiation | Electron energy (default 45.6 GeV), cavity gain in MeV, aperture radius, packet escape and wall interception | Extension of 13 |
| Monte Carlo | 10 to 1,000,000 test photons, reflection/scattering checkboxes, independent samples and absorption convergence | Extension of 20–23 |

## Physics and limits

Vertical distribution, horizontal distribution, polarization (both modes), and penetration use finite photon runs with adjustable 1–30 second duration (default 5 seconds). Polarization starts with 1,000 photons and supports 10–10,000,000 samples. The other tabs support 10–1,000,000 samples. Each path is drawn once, the progress bar tracks drawn photons, and parameter changes restart the run. Vertical and horizontal scenes accumulate detector histograms sampled from the plotted distribution within its displayed range. Angular polarization uses the original three σ, π and sum XY heatmap panels, with each photon incrementing its channel pixel and the sum pixel. All panels share a fixed logarithmic hit-count scale. The full XY window samples relative angular power, and the plot below shows raw sampled counts from the central pixel column at zero horizontal angle and updates during the run. Energy-resolved polarization samples σ/π analyzer channels from the vertical distribution and plots the accumulated detector counts. Penetration samples exponential absorption depths using the same attenuation coefficient as its plot.

This is a teaching tool. Scene geometry, travel times and visible ray counts are schematic, with angular scales exaggerated where needed.

- **Spectrum:** `Ec [keV] = 2.218 E [GeV]³ / ρ [m]`. Both axes default to logarithmic, matching lecture slides 9–10. The universal function is `F(x) = x ∫ₓ∞ K₅⁄₃(u) du`. Photon flux per fixed relative bandwidth follows `F(x)` and peaks near `0.286 Ec`; power per the same bandwidth follows `x F(x)` and peaks near `1.328 Ec`. The vertical selector chooses absolute rates or independent peak normalization. A 0.1% band has width `0.001 Eph`. Absolute photon rates use `Nmag = 8.084e20 E I[A] L / (2πρ)` and `dN/dt per 0.1% BW = 0.001 Nmag F(x) / (5π/3)`. Absolute power uses `0.001 Pmag xF(x) / [8π/(9√3)]`. These narrow-band expressions integrate over `d ln Eph / 0.001` to the magnet totals; rounded lecture constants agree to approximately 0.1%. Default radius 33.33 m and length 1 m give the lecture's approximately 30 mrad bend, with presets at 1, 5, 10, 50, 100 and 500 GeV. Critical energy divides integrated power in half; equal visible area on a log–log plot does not imply equal power. The separate dipole tab intentionally shows peak-normalized spectral power **per linear photon energy**, proportional to `F(x)`, with its own label.
- **Reference frames:** shaded 3D angular-power surfaces inspired by lecture slide 13 (whose illustration credits S. Mobilio and A. Balerna). The exact classical transverse-acceleration pattern is `dP/dΩ ∝ |n × [(n − β) × a]|² / (1 − n·β)⁵`, with velocity along z and acceleration along x. Surface radius is linear in angular power normalized to each frame’s own peak, not photon position, a wavefront, or a measure of total power. The particle frame uses γ = 1; the lab uses the demonstration γ. Both selectable plot slices use this same model. Mesh directions are sampled using exact angular aberration to resolve narrow cones. The deliberately modest γ is separate from the GeV energy used elsewhere.
- **Vertical distribution and polarization:** ideal single-electron, energy-resolved modified-Bessel components with `ξ = (Eph / 2Ec)(1 + γ²ψ²)³ᐟ²`. The perpendicular field vanishes in the orbit plane and changes phase sign across it. Electron-beam emittance, energy spread and finite detector acceptance are omitted.
- **Local angular polarization:** frequency-integrated instantaneous angular power from an ultrarelativistic transverse acceleration. With `u = γθx`, `v = γθy`, the components are `σ = (1 − u² + v²)² / (1 + u² + v²)⁵` and `π = 4u²v² / (1 + u² + v²)⁵`. Slice plots use one common normalization. Their all-angle integrals give 7/8 and 1/8 of total power; the finite sampled angular slice is not used to estimate those fractions. This local angular pattern (lecture slide 18) is distinct from the long-bend energy-resolved Bessel distribution in the energy-resolved mode.
- **Dipole:** magnetic rigidity `Bρ = E / 0.2998`, uniform field, `Ec [keV] = 0.665 B E²`, and single-magnet power `14.08 E⁴ I L / ρ²` in kW. Uses the ultrarelativistic, long-magnet approximation with negligible energy loss. Zero magnetic field gives a straight trajectory and zero synchrotron radiation.
- **Quadrupole:** `Bx = −Gy`, `By = −Gx`. The entrance-plane round Gaussian has `⟨B²⟩ = G²(2σ² + x₀²)`, with lengths converted to meters. Its projected power-source density weights the particles by `B²` before integrating over y. Readout power assumes 100 mA and holds the entrance beam size constant throughout the magnet; a real calculation integrates the changing envelope. The RMS-field critical energy is an indicative equivalent-dipole value, not an exact quadrupole spectrum. The scene shows local source geometry and forces, not a downstream radiation footprint.
- **Horizontal distribution:** a uniform range of tangent directions convolved with a finite-width kernel on the scale `1 / γ`. The footprint uses small-angle geometry; the model omits detailed short-magnet interference.
- **Reflection:** approximate free-electron optical constants and Fresnel reflection. This model does **not** use the Henke tables. Absorption edges, coatings, oxide layers and chemical state are omitted; material values are illustrative.
- **Penetration:** Beer–Lambert transmission, `T = exp(−μt)`, with an illustrative photoelectric energy power law for μ. This is **not** NIST attenuation data. Normal incidence and the uncollided primary beam are assumed; scattering, secondary photons and surface reflection are omitted.
- **Roughness:** coherent specular suppression `exp[−(4πσ sin θ / λ)²]`. Scattered ray directions are qualitative. Lost specular intensity does not all become diffuse reflection; the model does not calculate a measured BSDF or surface correlation function.
- **Monte Carlo:** an equal-weight, single-surface photon-transport model with illustrative probabilities of 30% specular reflection, 20% diffuse scattering and 50% absorption. Disabling a channel transfers its probability to absorption. Reflection and scattering start disabled. Every selected photon is traced once over an adjustable duration of 1–30 seconds (default 5 seconds), with trajectories accumulated on the canvas and a progress bar showing completion. Totals and convergence history include only photons already drawn. Changing parameters starts a fresh run using a seeded random sequence. The absorption estimate is compared with the exact model probability and an approximate pointwise 95% sampling range, with standard error `√[A(1−A)/N]`. New sample changes the random seed. Geometry and probabilities are schematic.
- **Insertion devices:** the planar-undulator resonance equation, odd-harmonic Bessel-J coupling factors and finite-period interference illustrate harmonics. The high-K broad envelope is a qualitative wiggler transition. A large K does not eliminate harmonics in a perfectly resolved single-electron on-axis spectrum; angular integration and finite beam properties matter.

## Sources

The lecture informed the topic order, explanations and equations. Its PDF was read locally and is **not redistributed** in this repository.

- [CERN Synrad CAS tutorial page](https://molflow.docs.cern.ch/guide/synrad/cas_synrad_tutorial/).
- Albert Hofmann, *The Physics of Synchrotron Radiation*, Cambridge University Press: angular distributions and polarization, also cited on lecture slide 16.
- [CERN, Synchrotron radiation spectrum in quadrupoles](https://indico.cern.ch/event/714078/contributions/2933971/attachments/1622086/2581385/FCC_ee_Optics_SR_quad_2018_03_23.pdf): field and critical energy scale with radius; power weights the beam by radius squared; an equivalent RMS-field dipole only approximates the spectrum.
- [CERN, High-Intensity Synchrotron Radiation Effects](https://cds.cern.ch/record/1641418/files/CERN-2016-002.pdf): transverse-acceleration angular power and relativistic beaming.
- [Lawrence Berkeley National Laboratory, X-Ray Data Booklet](https://xdb.lbl.gov/): synchrotron radiation and X-ray optics.
- [Henke/CXRO X-ray optical constants and reflectivity tools](https://henke.lbl.gov/optical_constants/): quantitative optical data and grazing-angle conventions. B. L. Henke, E. M. Gullikson and J. C. Davis, *Atomic Data and Nuclear Data Tables* **54** (1993), 181–342, cited on lecture slide 20.
- [NIST X-ray mass attenuation coefficients](https://physics.nist.gov/PhysRefData/XrayMassCoef/cover.html), J. H. Hubbell and S. M. Seltzer, cited on lecture slide 21. For quantitative attenuation calculations, use these tables or [NIST XCOM](https://physics.nist.gov/PhysRefData/Xcom/html/xcom1.html).
- Tsumoru Shintake, [“Real-time animation of synchrotron radiation”](https://doi.org/10.1016/S0168-9002(03)00844-1), *Nuclear Instruments and Methods A* **507** (2003), 89–92: the integrated Radiation2D browser demonstration referenced on lecture slide 2.

## Hosting

The app is a static site. The GitHub Pages workflow publishes the repository's application files without a compilation step. Enable GitHub Pages with **GitHub Actions** as the source in repository settings when deploying there.

## License

GPL-3.0-only; see [LICENSE](LICENSE). The bundled [Radiation2D browser edition](synrad2d/README.md) includes its visible credits, provenance and [GPL-3.0 license](synrad2d/LICENSE). No lecture PDF or Windows Radiation2D binary is redistributed.

## Cavity radiation packets

The **Cavity radiation** tab (`#cavity`) follows equal-energy radiation packets
through a 1 m virtual accelerating gap and short beam pipes. Entrance total
electron energy (GeV), cavity gain (MeV) and aperture radius are adjustable.
The default is 45.6 GeV with 20 MeV gain and a 25 mm aperture radius. Its
longitudinal power peaks at about 5.6 µrad, a free-space offset of 5.6 µm
after 1 m. All displayed default packets clear the cavity; percentages are
finite-sample estimates, not proof of zero radiation in the angular tails.
The lower panel compares shaded longitudinal radiation lobes in the
instantaneous particle frame and lab frame at the entrance energy. Each
surface radius is independently peak-normalized angular power. The lab
surface has an explicitly labelled transverse magnification to reveal the
otherwise subpixel cone; it is not a photon trajectory. The packet drawing
labels micrometre-scale spread against the millimetre-scale aperture. Packet centers retain true geometry;
dot sizes are enlarged for visibility. A logarithmic energy slider and low
energy presets retain broad-angle comparisons. Electron rest energy is
[0.51099895069 MeV, CODATA 2022](https://physics.nist.gov/cgi-bin/cuu/Value?mec2mev).
A stable half-angle formula resolves the cone at high γ without subtracting
nearly equal cosines. The electron follows
constant longitudinal force; packets travel at c on straight paths, stopping
at their first intersection with an axisymmetric absorbing wall. Upper/lower
tracks represent meridional slices of radiation rings. Their angles are not
exaggerated. Interception and port percentages weight the full solid-angle
energy distribution and source time, rather than an unweighted 2D angular slice.

This is a geometrical transport teaching model, not a cavity electromagnetic
solver. It omits conducting-wall modification of emission, RF phase, reflection,
diffraction, interference, spectra and radiation reaction. Downstream means
the plane 0.3 m beyond the gap; a longer pipe could intercept more radiation.
At zero energy gain no radiation packets are emitted.

Physics reference: [Fitzpatrick, angular distribution of radiation, equations
1661–1666](https://farside.ph.utexas.edu/teaching/em/lectures/node132.html).
