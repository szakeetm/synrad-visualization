import test from 'node:test';
import assert from 'node:assert/strict';
import {experiments} from '../src/experiments.js';
import {advanceMonteCarlo} from '../src/monte-carlo.js';
import {createDistributionRun, getPhotonSimulation, resetPhotonSimulation, hasPhotonSimulation} from '../src/photon-simulation.js';
import {renderPhotonSimulation} from '../src/photon-scenes.js';
import {gamma, transmission} from '../src/physics.js';

const ids = ['vertical', 'horizontal', 'polarization', 'penetration'];
const defaults = id => Object.fromEntries(experiments.find(e => e.id === id).controls.map(c => [c.key, c.default]));

test('the four requested tabs have finite run controls and reflection keeps its existing controls', () => {
  for (const id of ids) {
    const state = defaults(id);
    assert.equal(state.photons, id === 'polarization' ? 1000 : 10);
    assert.equal(state.duration, 5);
    assert.ok(hasPhotonSimulation(id));
  }
  assert.equal(hasPhotonSimulation('reflection'), false);
  assert.equal(defaults('reflection').photons, undefined);
});

test('angular coordinates narrow exactly with electron energy at fixed photon energy ratio', () => {
  const low = createDistributionRun('vertical', {...defaults('vertical'), energy: 1, photons: 1000});
  const high = createDistributionRun('vertical', {...defaults('vertical'), energy: 4, photons: 1000});
  let lowPhotons, highPhotons;
  advanceMonteCarlo(low, 5, batch => { lowPhotons = batch; });
  advanceMonteCarlo(high, 5, batch => { highPhotons = batch; });
  for (let i = 0; i < lowPhotons.length; i++) {
    assert.ok(Math.abs(lowPhotons[i].coordinate / 4 - highPhotons[i].coordinate) < 1e-9);
    assert.equal(lowPhotons[i].outcome, highPhotons[i].outcome);
  }
});

test('horizontal samples reproduce the uniform fan plus Gaussian angular width', () => {
  const state = {...defaults('horizontal'), photons: 100000};
  const run = createDistributionRun('horizontal', state);
  let sum = 0, squared = 0;
  advanceMonteCarlo(run, 5, batch => {
    for (const photon of batch) { sum += photon.coordinate; squared += photon.coordinate ** 2; }
  });
  const expectedVariance = (state.bend * state.distance) ** 2 / 12 + (1000 * state.distance / gamma(state.energy)) ** 2;
  assert.ok(Math.abs(sum / run.n) < 1);
  assert.ok(Math.abs(squared / run.n / expectedVariance - 1) < .02);
});

test('spectral polarization samples the plotted channel shares', () => {
  const run = createDistributionRun('polarization', {...defaults('polarization'), polarizationModel: 'spectral', photons: 100000});
  advanceMonteCarlo(run, 5, () => {});
  assert.ok(run.counts.pi > 0);
  assert.ok(Math.abs(run.counts.pi / run.n - run.expected.pi) < .005);
});

test('penetration samples exponential depths with the plotted transmission probability', () => {
  const state = {...defaults('penetration'), photon: 10, thickness: 50, photons: 100000};
  const run = createDistributionRun('penetration', state);
  advanceMonteCarlo(run, 5, batch => {
    for (const photon of batch) {
      assert.ok(photon.depth >= 0 && Number.isFinite(photon.depth));
      assert.equal(photon.outcome === 'absorbed', photon.depth < state.thickness);
    }
  });
  assert.ok(Math.abs(run.counts.transmitted / run.n - transmission(state.photon, state.thickness, state.material)) < .005);
  const empty = createDistributionRun('penetration', {...state, thickness: 0});
  advanceMonteCarlo(empty, 5, () => {});
  assert.equal(empty.counts.transmitted, empty.n);
  assert.equal(empty.counts.absorbed, 0);
});

test('every tab draws exactly its selected photons once and keeps histograms consistent', () => {
  let drawn = 0;
  const context = new Proxy({}, {
    get: (_, name) => (...args) => {
      for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), String(name));
      if (name === 'moveTo' && args[0] === 90) drawn++;
    },
    set: () => true,
  });
  for (const id of ids) {
    drawn = 0;
    const state = {...defaults(id), photons: 100, polarizationModel: 'spectral'};
    for (const time of [0, 2.5, 5, 6]) {
      renderPhotonSimulation(context, 900, 400, id, state, time);
      const run = getPhotonSimulation(id, state);
      assert.equal(run.n, drawn);
      assert.equal(run.n, Math.floor(Math.min(1, time / 5) * 100));
      assert.equal(Object.values(run.counts).reduce((a, b) => a + b), run.n);
      if (run.bins) {
        assert.equal(Object.values(run.bins).reduce((sum, bins) => sum + bins.reduce((a, b) => a + b), 0), drawn);
      }
    }
    assert.equal(drawn, 100);
    resetPhotonSimulation(id, state);
    assert.equal(getPhotonSimulation(id, state).n, 0);
    state.duration = 30;
    assert.equal(getPhotonSimulation(id, state).duration, 30);
  }
});

test('sampling stays finite across every original control extreme', () => {
  for (const id of ids) {
    const experiment = experiments.find(e => e.id === id);
    const initial = defaults(id);
    const variants = [initial, ...experiment.controls.flatMap(c => c.options
      ? c.options.map(o => ({...initial, [c.key]: o.value}))
      : [{...initial, [c.key]: c.min}, {...initial, [c.key]: c.max}])];
    for (const state of variants) {
      const run = createDistributionRun(id, {...state, photons: 10});
      advanceMonteCarlo(run, run.duration, batch => {
        for (const photon of batch) for (const value of Object.values(photon)) {
          if (typeof value === 'number') assert.ok(Number.isFinite(value), `${id} ${JSON.stringify(state)}`);
        }
      });
      for (const expected of Object.values(run.expected)) assert.ok(expected >= 0 && expected <= 1);
    }
  }
});

test('both polarization modes use the 1000 default and accept ten million photons', () => {
  const experiment = experiments.find(e => e.id === 'polarization');
  const control = experiment.controls.find(c => c.key === 'photons');
  assert.equal(control.default, 1000);
  assert.ok(!experiment.controls.some(c => ['cut', 'theta', 'psi'].includes(c.key)));
  assert.equal(control.max, 10000000);
  assert.ok(control.presets.includes(10000000));
  for (const polarizationModel of ['angular', 'spectral']) {
    const state = {...defaults('polarization'), polarizationModel};
    delete state.photons;
    assert.equal(createDistributionRun('polarization', state).target, 1000);
    const run = createDistributionRun('polarization', {...state, photons: 10000000});
    assert.equal(run.target, 10000000);
    advanceMonteCarlo(run, .0005, () => {});
    assert.equal(run.n, 1000);
  }
});
