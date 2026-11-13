import test from 'node:test';
import assert from 'node:assert/strict';
import {createPolarizationMapRun, recordPolarizationHits, polarizationGridSize} from '../src/polarization-photons.js';
import {getPhotonSimulation, resetPhotonSimulation} from '../src/photon-simulation.js';
import {advanceMonteCarlo} from '../src/monte-carlo.js';
import {renderPhotonSimulation} from '../src/photon-scenes.js';
import {angularMapColor} from '../src/polarization-scenes.js';

const sum = values => values.reduce((a, b) => a + b, 0);

test('each XY photon increments exactly its channel pixel and the sum pixel', () => {
  const run = createPolarizationMapRun({photons: 10});
  assert.equal(sum(run.maps.total), 0);
  advanceMonteCarlo(run, 2.5, batch => {
    assert.equal(batch.length, 5);
    for (const photon of batch) {
      const index = photon.y * polarizationGridSize + photon.x;
      const before = run.maps.total[index];
      const channelBefore = run.maps[photon.outcome][index];
      const changed = recordPolarizationHits(run, [photon]);
      assert.equal(run.maps.total[index], before + 1);
      assert.equal(run.maps[photon.outcome][index], channelBefore + 1);
      assert.equal(changed.total.size, 1);
      assert.equal(changed[photon.outcome].size, 1);
    }
  });
  assert.equal(run.n, 5);
  assert.equal(sum(run.maps.total), 5);
  assert.equal(sum(run.maps.sigma), run.counts.sigma);
  assert.equal(sum(run.maps.pi), run.counts.pi);
  advanceMonteCarlo(run, 5, batch => recordPolarizationHits(run, batch));
  advanceMonteCarlo(run, 10, () => assert.fail('completed runs must not add hits'));
  assert.equal(run.n, 10);
  assert.equal(sum(run.maps.total), 10);
});

test('million-photon XY maps preserve channel sums, nodal axes and finite-window shares', () => {
  const run = createPolarizationMapRun({photons: 1000000});
  const size = polarizationGridSize, center = (size - 1) / 2;
  for (let step = 1; step <= 100; step++) {
    advanceMonteCarlo(run, step / 20, batch => recordPolarizationHits(run, batch));
  }
  assert.equal(run.n, 1000000);
  assert.equal(sum(run.maps.total), run.n);
  assert.equal(sum(run.maps.sigma), run.counts.sigma);
  assert.equal(sum(run.maps.pi), run.counts.pi);
  for (let i = 0; i < size; i++) {
    assert.equal(run.maps.pi[center * size + i], 0);
    assert.equal(run.maps.pi[i * size + center], 0);
  }
  for (let i = 0; i < size * size; i++) {
    assert.equal(run.maps.total[i], run.maps.sigma[i] + run.maps.pi[i]);
  }
  assert.ok(Math.abs(run.counts.pi / run.n - run.expected.pi) < .002);
});

test('XY sampling covers the full map when the selected slice lies on a pi node', () => {
  const state = {photons: 10000, polarizationModel: 'angular', theta: 0, psi: 0};
  const run = getPhotonSimulation('polarization', state);
  advanceMonteCarlo(run, 5, batch => recordPolarizationHits(run, batch));
  assert.ok(run.counts.pi > 0);
  const oldScale = run.colorMaximum;
  resetPhotonSimulation('polarization', state);
  const restarted = getPhotonSimulation('polarization', state);
  assert.equal(sum(restarted.maps.total), 0);
  assert.equal(restarted.colorMaximum, oldScale);
});

test('the three heatmap images start empty and show sampled pixels through the normal scene entry', () => {
  const previousDocument = globalThis.document;
  const images = [];
  globalThis.document = {
    createElement() {
      const context = {
        createImageData(width, height) { return {data: new Uint8ClampedArray(width * height * 4)}; },
        putImageData(pixels) { this.pixels = pixels; },
      };
      images.push(context);
      return {getContext: () => context};
    },
  };
  const context = new Proxy({}, {
    get: (_, name) => {
      if (name === 'createLinearGradient') return () => ({addColorStop() {}});
      return (...args) => {
        for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg), String(name));
      };
    },
    set: () => true,
  });
  try {
    const state = {photons: 10, polarizationModel: 'angular', theta: .7, psi: .7};
    renderPhotonSimulation(context, 900, 400, 'polarization', state, 0);
    assert.equal(images.length, 3);
    const background = angularMapColor(0);
    for (const image of images) {
      for (let i = 0; i < image.pixels.data.length; i += 4) {
        assert.deepEqual([...image.pixels.data.slice(i, i + 3)], background);
      }
    }
    renderPhotonSimulation(context, 900, 400, 'polarization', state, 5);
    const run = getPhotonSimulation('polarization', state);
    assert.equal(run.n, 10);
    for (const [panel, key] of ['sigma', 'pi', 'total'].entries()) {
      for (let i = 0; i < run.maps[key].length; i++) {
        if (!run.maps[key][i]) continue;
        assert.notDeepEqual([...images[panel].pixels.data.slice(4 * i, 4 * i + 3)], background);
      }
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
