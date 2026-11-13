import {getReferenceView, colors, fmt} from './reference-views.js';
import {getPhotonSimulation} from './photon-simulation.js';
import {polarizationGridSize, polarizationRange} from './polarization-photons.js';

export {colors, fmt};

export function getView(id, state) {
  if (id !== 'polarization') return getReferenceView(id, state);
  const run = getPhotonSimulation(id, state);
  const angular = state.polarizationModel === 'angular';
  const range = angular ? [-polarizationRange, polarizationRange] : run.range;
  const size = angular ? polarizationGridSize : run.bins.sigma.length;
  const width = (range[1] - range[0]) / size;
  const bins = {};
  for (const component of ['sigma', 'pi', 'total']) {
    bins[component] = Array.from({length: size}, (_, i) => {
      if (angular) {
        const row = size - 1 - i;
        const column = (size - 1) / 2;
        return run.maps[component][row * size + column];
      }
      if (component === 'total') return run.bins.sigma[i] + run.bins.pi[i];
      return run.bins[component][i];
    });
  }
  const sliceHits = bins.total.reduce((sum, count) => sum + count, 0);
  const channelShare = count => run.n ? `${fmt(100 * count / run.n, 1)}%` : '—';
  const makeTrace = (component, name, color, dashed = false) => ({
    name, color, dashed,
    points: bins[component].flatMap((count, i) => [
      [range[0] + i * width, count],
      [range[0] + (i + 1) * width, count],
    ]),
  });
  return {
    title: angular ? 'Sampled vertical slice · γθx = 0' : 'Energy-resolved sampled photon arrivals',
    xLabel: angular ? 'Scaled vertical angle · γθy' : run.axisLabel,
    xRange: range,
    yLabel: angular ? 'Sampled hits per pixel' : 'Sampled hits per bin',
    yRange: [0, Math.max(1, Math.max(...bins.total) * 1.1)],
    traces: [
      makeTrace('sigma', 'Sampled σ · parallel', colors.cyan),
      makeTrace('pi', 'Sampled π · perpendicular', colors.amber),
      makeTrace('total', 'Sampled sum', colors.grey, true),
    ],
    markers: [],
    metrics: [
      {name: 'Photons sampled', value: `${run.n.toLocaleString('en-US')} / ${run.target.toLocaleString('en-US')}`},
      {name: angular ? 'Hits in zero-angle slice' : 'Detector hits', value: sliceHits.toLocaleString('en-US')},
      {name: 'Sampled σ share', value: channelShare(run.counts.sigma)},
      {name: 'Sampled π share', value: channelShare(run.counts.pi)},
    ],
    badge: run.n === run.target ? 'RUN COMPLETE' : 'SAMPLING PHOTONS',
    caption: angular
      ? 'Raw counts from the central pixel column of the σ, π and sum heatmaps at γθx = 0. Each histogram bin is one map pixel. Counts update as photons arrive.'
      : 'Raw counts from the σ and π detector arrivals in this energy-resolved run. The sum adds the two channels in each bin. Counts update as photons arrive.',
    legend: [['σ analyzer channel', '#55d9d0'], ['π analyzer channel', '#f5bc70']],
    note: angular
      ? `The zero-angle slice spans one map pixel in x, with width ${fmt(2 * polarizationRange / polarizationGridSize, 4)} in γθx. Shares use all sampled hits across the XY window. Reset and parameter changes clear the sampled maps and plot.`
      : 'Each plotted count comes from a photon already drawn in the detector scene. Reset and parameter changes clear the sampled arrivals and plot.',
  };
}
