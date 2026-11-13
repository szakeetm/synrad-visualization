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

test('zero-angle plot identifies the absent pi channel and keeps sigma visible over the sum', async () => {
  const {drawChart, prepareChartScales} = await import('../src/chart.js');
  const state = {polarizationModel: 'angular', photons: 100000};
  const run = getPhotonSimulation('polarization', state);
  advanceMonteCarlo(run, 5, batch => recordPolarizationHits(run, batch));
  const view = getView('polarization', state);
  assert.match(view.plotNote, /π = 0/);
  assert.match(view.plotNote, /σ = sum/);
  assert.equal(view.metrics.find(m => m.name === 'Slice π hits').value, '0');
  assert.deepEqual(counts(view.traces[0]), counts(view.traces[2]));
  const previousDocument = globalThis.document;
  const elements = [];
  globalThis.document = {
    createElementNS(_, tag) {
      const element = {tag, attrs: {}, children: [], setAttribute(key, value) { this.attrs[key] = value; }, append(...children) { this.children.push(...children); }};
      elements.push(element);
      return element;
    },
  };
  try {
    drawChart({clientWidth: 760, replaceChildren() {}}, prepareChartScales(view, {y: 'log'}));
    const paths = elements.filter(e => e.tag === 'path' && e.attrs.stroke);
    assert.equal(paths[0].attrs.stroke, view.traces[2].color);
    assert.equal(paths[1].attrs.stroke, view.traces[0].color);
    assert.ok(paths[0].attrs['stroke-width'] > paths[1].attrs['stroke-width']);
    assert.ok(elements.some(e => e.tag === 'text' && e.textContent === view.plotNote));
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
