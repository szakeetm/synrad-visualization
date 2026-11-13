import {angularPolarization} from './physics.js';
import {createPhotonRun} from './monte-carlo.js';

export const polarizationGridSize = 221;
export const polarizationRange = 3;
export const polarizationPhotonLimits = {defaultPhotons: 1000, maxPhotons: 10000000};
let grid;

function getGrid() {
  if (grid) return grid;
  const size = polarizationGridSize;
  const length = size * size;
  const cumulative = new Float64Array(length);
  const sigma = new Float64Array(length);
  const total = new Float64Array(length);
  let integral = 0, sigmaIntegral = 0, peak = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = -polarizationRange + (x + .5) * 2 * polarizationRange / size;
    const v = polarizationRange - (y + .5) * 2 * polarizationRange / size;
    const values = angularPolarization(u, v);
    const index = y * size + x;
    sigma[index] = values.sigma;
    total[index] = values.total;
    integral += values.total;
    sigmaIntegral += values.sigma;
    cumulative[index] = integral;
    peak = Math.max(peak, values.total);
  }
  grid = {cumulative, sigma, total, integral, sigmaShare: sigmaIntegral / integral, peak};
  return grid;
}

export function createPolarizationMapRun(state) {
  const distribution = getGrid();
  const size = polarizationGridSize;
  const run = createPhotonRun(state, {sigma: distribution.sigmaShare, pi: 1 - distribution.sigmaShare}, random => {
    const value = random() * distribution.integral;
    let low = 0, high = distribution.cumulative.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (distribution.cumulative[middle] <= value) low = middle + 1;
      else high = middle;
    }
    const outcome = random() * distribution.total[low] < distribution.sigma[low] ? 'sigma' : 'pi';
    return {outcome, x: low % size, y: Math.floor(low / size)};
  }, polarizationPhotonLimits);
  run.maps = {
    sigma: new Uint32Array(size * size),
    pi: new Uint32Array(size * size),
    total: new Uint32Array(size * size),
  };
  // One fixed count scale for all panels throughout this run.
  run.colorMaximum = Math.max(1, Math.ceil(run.target * distribution.peak / distribution.integral));
  return run;
}

export function recordPolarizationHits(run, photons) {
  const changed = {sigma: new Set(), pi: new Set(), total: new Set()};
  for (const photon of photons) {
    const index = photon.y * polarizationGridSize + photon.x;
    run.maps[photon.outcome][index]++;
    run.maps.total[index]++;
    changed[photon.outcome].add(index);
    changed.total.add(index);
  }
  return changed;
}
