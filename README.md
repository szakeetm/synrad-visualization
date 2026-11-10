# Synrad interactive lab

A browser teaching companion to **“Synrad tutorial”**, Márton Ady and Gabriel Saretti (CERN), CAS Prague, 16 November 2026. Nine experiments pair animations with controls, plots and equations. The first navigation item opens an included copy of the adjacent [Radiation 2D browser project](https://github.com/szakeetm/radiation2d-browser) in a new tab. Its source, license and provenance are preserved under `radiation2d/`.

## Run

Requires Node.js 20 or newer. No dependency installation or build step:

```sh
npm start
```

Open **http://localhost:4173**. Alternatively, serve this directory with any static HTTP server. JavaScript ES modules require HTTP rather than opening `index.html` through `file://`. All application assets are local.

```sh
npm test
```

The numerical tests check critical-energy scaling, the universal spectrum, directional aberration, polarization symmetry, attenuation, bounded reflection, roughness suppression and the undulator equation. Plot checks cover default values, all individual control extrema, spectrum visibility at low energy, and weak-K harmonic suppression. Browser checks complement these tests for navigation, controls, pause/reset and responsive layouts.

## Experiments

| View | What to change | Lecture slides |
| --- | --- | --- |
| Spectrum | Electron energy, bending radius, current | 7–12 |
| Reference frames | Demonstration Lorentz factor | 13 |
| Vertical distribution | Electron energy and photon energy / critical energy | 14–16 |
| Horizontal distribution | Electron energy, bend angle, screen distance | 17–18, 25 |
| Polarization | Observation angle and photon energy / critical energy | 16, 18 |
| Reflection | Photon energy, grazing angle, material | 20 |
| Penetration | Photon energy, thickness, material | 21 |
| Rough surfaces | Photon energy, grazing angle, RMS roughness | 22–23 |
| Insertion devices | Electron energy, K, magnetic period, number of periods | 5, 28–29 |

## Physics and limits

This is a teaching tool. Scene geometry, travel times and visible ray counts are schematic, with angular scales exaggerated where needed.

- **Spectrum:** `Ec [keV] = 2.218 E [GeV]³ / ρ [m]`. The universal function is `F(x) = x ∫ₓ∞ K₅⁄₃(u) du`. Critical energy divides total radiated power in half; its value is distinct from the spectral maximum. Spectral power density per unit photon energy and photon number per fixed relative bandwidth share the shape `F(x)`. Photon number per unit photon energy is proportional to `F(x) / x`.
- **Reference frames:** exact directional aberration, `cos θ = (cos θ′ + β) / (1 + β cos θ′)`. The deliberately modest demonstration γ keeps the cone visible; it is separate from the GeV electron energy used in the other experiments. Ray density is not a calibrated radiation power density.
- **Vertical distribution and polarization:** ideal single-electron, energy-resolved modified-Bessel components with `ξ = (Eph / 2Ec)(1 + γ²ψ²)³ᐟ²`. The perpendicular field vanishes in the orbit plane and changes phase sign across it. Electron-beam emittance, energy spread and finite detector acceptance are omitted.
- **Horizontal distribution:** a uniform range of tangent directions convolved with a finite-width kernel on the scale `1 / γ`. The footprint uses small-angle geometry; the model omits detailed short-magnet interference.
- **Reflection:** approximate free-electron optical constants and Fresnel reflection. This model does **not** use the Henke tables. Absorption edges, coatings, oxide layers and chemical state are omitted; material values are illustrative.
- **Penetration:** Beer–Lambert transmission, `T = exp(−μt)`, with an illustrative photoelectric energy power law for μ. This is **not** NIST attenuation data. Normal incidence and the uncollided primary beam are assumed; scattering, secondary photons and surface reflection are omitted.
- **Roughness:** coherent specular suppression `exp[−(4πσ sin θ / λ)²]`. Scattered ray directions are qualitative. Lost specular intensity does not all become diffuse reflection; the model does not calculate a measured BSDF or surface correlation function.
- **Insertion devices:** the planar-undulator resonance equation, odd-harmonic Bessel-J coupling factors and finite-period interference illustrate harmonics. The high-K broad envelope is a qualitative wiggler transition. A large K does not eliminate harmonics in a perfectly resolved single-electron on-axis spectrum; angular integration and finite beam properties matter.

## Sources

The lecture informed the topic order, explanations and equations. Its PDF was read locally and is **not redistributed** in this repository.

- [CERN Synrad CAS tutorial page](https://molflow.docs.cern.ch/guide/synrad/cas_synrad_tutorial/).
- Albert Hofmann, *The Physics of Synchrotron Radiation*, Cambridge University Press: angular distributions and polarization, also cited on lecture slide 16.
- [Lawrence Berkeley National Laboratory, X-Ray Data Booklet](https://xdb.lbl.gov/): synchrotron radiation and X-ray optics.
- [Henke/CXRO X-ray optical constants and reflectivity tools](https://henke.lbl.gov/optical_constants/): quantitative optical data and grazing-angle conventions. B. L. Henke, E. M. Gullikson and J. C. Davis, *Atomic Data and Nuclear Data Tables* **54** (1993), 181–342, cited on lecture slide 20.
- [NIST X-ray mass attenuation coefficients](https://physics.nist.gov/PhysRefData/XrayMassCoef/cover.html), J. H. Hubbell and S. M. Seltzer, cited on lecture slide 21. For quantitative attenuation calculations, use these tables or [NIST XCOM](https://physics.nist.gov/PhysRefData/Xcom/html/xcom1.html).
- T. Shintake, [“Real-time animation of synchrotron radiation”](https://doi.org/10.1016/S0168-9002(03)00844-1), *Nuclear Instruments and Methods A* **507** (2003), 89–92: the separate Radiation 2D demonstration referenced on lecture slide 2.

## Hosting

The app is a static site. The GitHub Pages workflow publishes the repository's application files without a compilation step. Enable GitHub Pages with **GitHub Actions** as the source in repository settings when deploying there.

## License

GPL-3.0-only; see [LICENSE](LICENSE). The included Radiation 2D app retains its own visible credits, [provenance](radiation2d/README.md) and license. No lecture PDF or Windows Radiation2D binary is redistributed.
