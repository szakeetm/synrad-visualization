// All energies are keV for photons and GeV for electrons; lengths named in units.
export const gamma = energyGeV => energyGeV / 0.00051099895;
export const criticalEnergy = (energyGeV, radiusM) => 2.218 * energyGeV ** 3 / radiusM;

export function dipoleProperties(energyGeV, fieldT, lengthM, currentMA) {
  const radius = fieldT === 0 ? Infinity : energyGeV / (.2998 * Math.abs(fieldT));
  return { radius, bendMrad: 1000 * lengthM / radius,
    criticalKeV: .665 * Math.abs(fieldT) * energyGeV ** 2,
    powerKW: 14.08 * energyGeV ** 4 / radius ** 2 * currentMA / 1000 * lengthM };
}
export function quadrupoleField(gradientTm, xMm, yMm) {
  const bx = -gradientTm * yMm / 1000, by = -gradientTm * xMm / 1000;
  return { bx, by, magnitude: Math.hypot(bx, by) };
}
export function quadrupoleProperties(energyGeV, gradientTm, sigmaMm, offsetMm, lengthM, currentMA = 100) {
  // Round Gaussian, fixed transverse distribution: <r²> = 2 sigma² + offset².
  const rmsField = Math.abs(gradientTm) * Math.sqrt(2 * sigmaMm ** 2 + offsetMm ** 2) / 1000;
  const dipole = dipoleProperties(energyGeV, rmsField, lengthM, currentMA);
  return { rmsField, criticalKeV: dipole.criticalKeV, powerKW: dipole.powerKW };
}
export function quadrupoleSourceDensity(xMm, gradientTm, sigmaMm, offsetMm) {
  // Integrate B² times round Gaussian over y, leaving T²/mm along magnetic x.
  return gradientTm ** 2 * (xMm ** 2 + sigmaMm ** 2) * 1e-6
    * Math.exp(-.5 * ((xMm - offsetMm) / sigmaMm) ** 2) / (Math.sqrt(2 * Math.PI) * sigmaMm);
}
export function angularPolarization(u, v) {
  // Frequency-integrated local radiation per solid angle, ultrarelativistic
  // transverse acceleration along x. Normalization: total at u=v=0 equals 1.
  const denom = (1 + u * u + v * v) ** 5;
  const sigma = (1 - u * u + v * v) ** 2 / denom;
  const pi = 4 * u * u * v * v / denom;
  return { sigma, pi, total: sigma + pi };
}

// Integral representations of K_nu and x integral_x^infinity K_5/3(t) dt.
// Simpson quadrature with a tail suppressed by exp(-45) relative to its start.
function integral(x, fn) {
  if (!(x > 0) || x > 745) return 0;
  const upper = Math.acosh(1 + 45 / x);
  const n = Math.max(80, 2 * Math.ceil(upper / .07));
  const h = upper / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const t = i * h;
    sum += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * Math.exp(-x * Math.cosh(t)) * fn(t);
  }
  return sum * h / 3;
}
export function spectrum(x) {
  return x * integral(x, t => Math.cosh(5 * t / 3) / Math.cosh(t));
}
export function photonFluxPerBandwidth(energyGeV, radiusM, currentMA, lengthM, photonKeV) {
  const totalFlux = 8.084e20 * energyGeV * (currentMA / 1000) * lengthM / (2 * Math.PI * radiusM);
  return totalFlux * .001 * spectrum(photonKeV / criticalEnergy(energyGeV, radiusM)) / (5 * Math.PI / 3);
}
export function powerPerBandwidth(energyGeV, radiusM, currentMA, lengthM, photonKeV) {
  const totalWatts = 14.08 * energyGeV ** 4 / radiusM ** 2 * (currentMA / 1000) * lengthM * 1000;
  const x = photonKeV / criticalEnergy(energyGeV, radiusM);
  return totalWatts * .001 * x * spectrum(x) / (8 * Math.PI / (9 * Math.sqrt(3)));
}
export function vertical(u, ratio) {
  const a = 1 + u * u;
  const xi = .5 * ratio * a ** 1.5;
  const k23 = integral(xi, t => Math.cosh(2 * t / 3));
  const k13 = integral(xi, t => Math.cosh(t / 3));
  return { sigma: ratio ** 2 * a ** 2 * k23 ** 2, pi: ratio ** 2 * u ** 2 * a * k13 ** 2 };
}
export function aberrate(theta, lorentzGamma) {
  const beta = Math.sqrt(1 - 1 / lorentzGamma ** 2);
  // atan2 preserves backward rays and remains stable near theta = pi.
  return Math.atan2(Math.sin(theta) / lorentzGamma, Math.cos(theta) + beta);
}
export const materials = {
  Cu: { name: 'Copper', delta10: 1.7e-5, mu10: .15, color: '#b87b5b' },
  Al: { name: 'Aluminium', delta10: 5.4e-6, mu10: .007, color: '#a9bac8' },
  Si: { name: 'Silicon', delta10: 4.8e-6, mu10: .008, color: '#8b86b1' },
};
export const attenuation = (photonKeV, material = 'Cu') => materials[material].mu10 * (10 / photonKeV) ** 3;
export const transmission = (photonKeV, thicknessUm, material = 'Cu') => Math.exp(-attenuation(photonKeV, material) * thicknessUm);
export function reflectivity(photonKeV, grazingMrad, material = 'Cu') {
  const delta = materials[material].delta10 * (10 / photonKeV) ** 2;
  const beta = attenuation(photonKeV, material) * (.001239841984 / photonKeV) / (4 * Math.PI);
  const sin = Math.sin(grazingMrad / 1000);
  // Grazing-angle Fresnel s reflectivity, q = sqrt(alpha^2 - 2 delta + 2 i beta).
  const re = sin ** 2 - 2 * delta, im = 2 * beta;
  const abs = Math.hypot(re, im);
  const qr = Math.sqrt((abs + re) / 2), qi = Math.sqrt(Math.max(0, (abs - re) / 2));
  return Math.max(0, Math.min(1, ((sin - qr) ** 2 + qi ** 2) / ((sin + qr) ** 2 + qi ** 2)));
}
export const criticalAngle = (photonKeV, material = 'Cu') => 1000 * Math.sqrt(2 * materials[material].delta10) * 10 / photonKeV;
export const specularFraction = (photonKeV, grazingMrad, rmsNm) => Math.exp(-((4 * Math.PI * rmsNm * Math.sin(grazingMrad / 1000) / (1.239841984 / photonKeV)) ** 2));
export const undulatorEnergy = (energyGeV, periodMm, K, thetaGamma = 0) => .949634 * energyGeV ** 2 / (periodMm / 10) / (1 + K ** 2 / 2 + thetaGamma ** 2);
export const sinc = x => Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x;
// Integer-order J_n series; the insertion model only uses n <= 5, |x| <= 4.5.
function besselJ(n, x) {
  let term = 1;
  for (let i = 1; i <= n; i++) term *= x / (2 * i);
  let sum = term;
  for (let k = 1; k < 60; k++) {
    term *= -x * x / (4 * k * (k + n)); sum += term;
    if (Math.abs(term) < 1e-15) break;
  }
  return sum;
}
export function harmonicCoupling(n, K) {
  const q = n * K * K / (4 + 2 * K * K);
  return n * n * K * K / (1 + K * K / 2) ** 2 * (besselJ((n - 1) / 2, q) - besselJ((n + 1) / 2, q)) ** 2;
}
export function harmonicIntensity(x, periods) {
  // Finite train of N coherent periods, normalized peak = 1.
  const d = Math.sin(Math.PI * x);
  return Math.abs(d) < 1e-9 ? 1 : (Math.sin(periods * Math.PI * x) / (periods * d)) ** 2;
}
