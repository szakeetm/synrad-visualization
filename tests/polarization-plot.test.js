import test from 'node:test';
import assert from 'node:assert/strict';
import {getView} from '../src/views.js';
import {getPhotonSimulation, resetPhotonSimulation} from '../src/photon-simulation.js';
import {advanceMonteCarlo} from '../src/monte-carlo.js';
import {recordPolarizationHits, polarizationGridSize} from '../src/polarization-photons.js';
import {renderPhotonSimulation} from '../src/photon-scenes.js';

const counts = trace => trace.points.filter((_, i) => i % 2 === 0).map(([, y]) => y);

test('angular plot shows precisely the sampled central column at each stage of the run', () => {
  const state = {polarizationModel: 'angular', photons: 100000};
  let view = getView('polarization', state);
  assert.ok(view.traces.every(t => t.points.every(([, y]) => y === 0)));
  const run = getPhotonSimulation('polarization', state);
  const center = (polarizationGridSize - 1) / 2;
  for (const time of [2.5, 5]) {
    advanceMonteCarlo(run, time, batch => recordPolarizationHits(run, batch));
    view = getView('polarization', state);
    for (const [i, component] of ['sigma', 'pi', 'total'].entries()) {
      const actual = counts(view.traces[i]);
      const expected = Array.from({length: polarizationGridSize}, (_, row) =>
        run.maps[component][(polarizationGridSize - 1 - row) * polarizationGridSize + center]);
      assert.deepEqual(actual, expected);
    }
    const sliceTotal = counts(view.traces[2]).reduce((sum, value) => sum + value, 0);
    assert.ok(sliceTotal > 0 && sliceTotal < run.n);
    assert.equal(view.metrics[1].value, sliceTotal.toLocaleString('en-US'));
  }
  resetPhotonSimulation('polarization', state);
  view = getView('polarization', state);
  assert.ok(view.traces.every(t => t.points.every(([, y]) => y === 0)));
});

test('spectral plot counts only photon arrivals already drawn by the scene', () => {
  const state = {polarizationModel: 'spectral', ratio: 1, photons: 1000};
  const context = new Proxy({}, {get: () => () => {}, set: () => true});
  assert.ok(getView('polarization', state).traces.every(t => t.points.every(([, y]) => y === 0)));
  for (const time of [2.5, 5]) {
    renderPhotonSimulation(context, 900, 400, 'polarization', state, time);
    const run = getPhotonSimulation('polarization', state);
    const view = getView('polarization', state);
    assert.deepEqual(counts(view.traces[0]), [...run.bins.sigma]);
    assert.deepEqual(counts(view.traces[1]), [...run.bins.pi]);
    assert.equal(counts(view.traces[2]).reduce((sum, n) => sum + n, 0), run.n);
    assert.equal(run.n, 1000 * time / 5);
  }
});
