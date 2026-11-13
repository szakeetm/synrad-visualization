import {createPolarizationMapRun, polarizationPhotonLimits} from './polarization-photons.js';
import {createPhotonRun, getMonteCarloRun, resetMonteCarloRun} from './monte-carlo.js';
import {getReferenceView} from './reference-views.js';
import {attenuation, transmission} from './physics.js';

const runs = new WeakMap();
const simulationIds = new Set(['monte-carlo', 'vertical', 'horizontal', 'polarization', 'penetration']);
export const hasPhotonSimulation = id => simulationIds.has(id);

export function createDistributionRun(id, state) {
  if (id === 'polarization' && state.polarizationModel === 'angular') return createPolarizationMapRun(state);
  if (id === 'penetration') {
    const mu = attenuation(state.photon, state.material);
    const survival = transmission(state.photon, state.thickness, state.material);
    return createPhotonRun(state, {absorbed: 1 - survival, transmitted: survival}, random => {
      const depth = -Math.log1p(-random()) / mu;
      return {outcome: depth < state.thickness ? 'absorbed' : 'transmitted', depth, position: random()};
    });
  }
  const view = getReferenceView(id, state);
  const polarized = id !== 'horizontal';
  const total = view.traces[polarized ? 2 : 0].points;
  const cumulative = [0];
  for (let i = 1; i < total.length; i++) {
    const area = (total[i][0] - total[i - 1][0]) * (total[i][1] + total[i - 1][1]) / 2;
    cumulative.push(cumulative[i - 1] + area);
  }
  const integral = cumulative.at(-1);
  const expected = polarized ? {sigma: 0, pi: 0} : {detected: 1};
  if (polarized) {
    let sigmaIntegral = 0;
    const sigma = view.traces[0].points;
    for (let i = 1; i < sigma.length; i++) {
      sigmaIntegral += (sigma[i][0] - sigma[i - 1][0]) * (sigma[i][1] + sigma[i - 1][1]) / 2;
    }
    expected.sigma = Math.max(0, Math.min(1, sigmaIntegral / integral));
    expected.pi = 1 - expected.sigma;
  }
  const run = createPhotonRun(state, expected, random => {
    const area = random() * integral;
    let low = 1, high = total.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (cumulative[middle] < area) low = middle + 1;
      else high = middle;
    }
    const i = low;
    const width = total[i][0] - total[i - 1][0];
    const localArea = area - cumulative[i - 1];
    const startDensity = total[i - 1][1];
    const slope = (total[i][1] - startDensity) / width;
    // Invert the integral of a linearly interpolated density in this interval.
    const denominator = startDensity + Math.sqrt(Math.max(0, startDensity ** 2 + 2 * slope * localArea));
    const offset = denominator > 0 ? 2 * localArea / denominator : 0;
    const fraction = Math.max(0, Math.min(1, offset / width));
    const coordinate = total[i - 1][0] + fraction * width;
    let outcome = 'detected';
    if (polarized) {
      const sigma = view.traces[0].points;
      const sigmaValue = sigma[i - 1][1] + fraction * (sigma[i][1] - sigma[i - 1][1]);
      const totalValue = startDensity + fraction * (total[i][1] - startDensity);
      outcome = random() * totalValue < sigmaValue ? 'sigma' : 'pi';
    }
    return {outcome, coordinate};
  }, id === 'polarization' ? polarizationPhotonLimits : undefined);
  run.range = view.xRange;
  run.axisLabel = view.xLabel;
  run.bins = Object.fromEntries(Object.keys(expected).map(key => [key, new Uint32Array(48)]));
  return run;
}

export function getPhotonSimulation(id, state) {
  if (id === 'monte-carlo') return getMonteCarloRun(state);
  const key = JSON.stringify([id, state]);
  let entry = runs.get(state);
  if (!entry || entry.key !== key) {
    entry = {key, run: createDistributionRun(id, state)};
    runs.set(state, entry);
  }
  return entry.run;
}

export function resetPhotonSimulation(id, state) {
  if (id === 'monte-carlo') resetMonteCarloRun(state);
  else runs.delete(state);
}
