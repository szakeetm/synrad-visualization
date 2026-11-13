import test from 'node:test';
import assert from 'node:assert/strict';
import {createMonteCarloRun, getMonteCarloRun, resetMonteCarloRun, advanceMonteCarlo} from '../src/monte-carlo.js';
import {renderMonteCarlo} from '../src/monte-carlo-scene.js';
import {experiments} from '../src/experiments.js';
import {getView} from '../src/views.js';

const defaults = {duration: 10, photons: 10, reflection: true, scattering: true};

test('reflection and scattering start unchecked', () => {
  const experiment = experiments.find(e => e.id === 'monte-carlo');
  for (const key of ['reflection', 'scattering']) {
    const control = experiment.controls.find(c => c.key === key);
    assert.equal(control.type, 'checkbox');
    assert.equal(control.default, false);
  }
  assert.equal(createMonteCarloRun({photons: 10}).expected.absorbed, 1);
});

test('statistics include only drawn photons and stop exactly at the selected count', () => {
  for (const photons of [10, 1000000]) {
    const run = createMonteCarloRun({...defaults, photons});
    let drawn = 0;
    assert.equal(run.n, 0);
    assert.deepEqual(run.history, []);
    for (const seconds of [0, 1, 5, 10, 11, 20]) {
      advanceMonteCarlo(run, seconds, batch => {
        assert.equal(run.n, drawn, 'batch is drawn before entering the estimator');
        drawn += batch.length;
      });
      assert.equal(run.n, Math.floor(photons * Math.min(1, seconds / 10)));
      assert.equal(run.n, drawn);
      assert.equal(Object.values(run.counts).reduce((a, b) => a + b), drawn);
      assert.ok(run.history.every(([n]) => n <= drawn));
    }
    assert.equal(drawn, photons);
    assert.equal(run.history.at(-1)[0], photons);
    assert.ok(run.history.length < 400);
  }
});

test('small samples retain every history point and match the drawn outcomes', () => {
  const run = createMonteCarloRun(defaults);
  const drawn = [];
  advanceMonteCarlo(run, 10, batch => drawn.push(...batch));
  assert.equal(drawn.length, 10);
  assert.equal(run.history.length, 10);
  for (const outcome of Object.keys(run.counts)) {
    assert.equal(run.counts[outcome], drawn.filter(p => p.outcome === outcome).length);
    assert.ok(run.counts[outcome] > 0);
  }
});

test('sample sequence is independent of frame batches and extends consistently with count', () => {
  const small = createMonteCarloRun(defaults);
  const large = createMonteCarloRun({...defaults, photons: 1000000});
  const first = [];
  let prefix;
  advanceMonteCarlo(small, 5, batch => first.push(...batch));
  advanceMonteCarlo(small, 10, batch => first.push(...batch));
  advanceMonteCarlo(large, 10, batch => { prefix = batch.slice(0, 10); });
  assert.deepEqual(prefix, first);
  assert.ok(Math.abs(large.counts.absorbed / large.n - large.expected.absorbed) < .002);
});

test('disabled interaction channels transfer their probability to absorption', () => {
  for (const reflection of [false, true]) for (const scattering of [false, true]) {
    const run = createMonteCarloRun({photons: 1000, reflection, scattering});
    advanceMonteCarlo(run, 10, () => {});
    assert.equal(run.expected.absorbed, 1 - (reflection ? .3 : 0) - (scattering ? .2 : 0));
    if (!reflection) assert.equal(run.counts.reflected, 0);
    if (!scattering) assert.equal(run.counts.scattered, 0);
    if (!reflection && !scattering) assert.equal(run.counts.absorbed, 1000);
  }
});

test('reading the view never simulates ahead and changing controls creates a fresh run', () => {
  const state = {...defaults, photons: 1000000};
  let view = getView('monte-carlo', state);
  assert.deepEqual(view.traces[0].points, []);
  const run = getMonteCarloRun(state);
  advanceMonteCarlo(run, 2.5, () => {});
  view = getView('monte-carlo', state);
  assert.equal(run.n, 250000);
  assert.equal(view.traces[0].points.at(-1)[0], run.n);
  assert.equal(view.traces[0].points.at(-1)[1], run.counts.absorbed / run.n);
  assert.ok(view.traces[0].points.every(([n]) => n <= run.n));
  state.photons = 10;
  assert.equal(getMonteCarloRun(state).n, 0);
  assert.equal(getMonteCarloRun(state).target, 10);
  state.reflection = false;
  assert.equal(getMonteCarloRun(state).expected.reflected, 0);
  const original = getMonteCarloRun(state);
  state.sampleSeed = 43;
  assert.notEqual(getMonteCarloRun(state), original);
});

test('scene submits every trajectory once and keeps finite geometry', () => {
  let incoming = 0;
  const context = new Proxy({}, {
    get: (_, name) => (...args) => {
      for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg));
      if (name === 'moveTo' && args[0] === 90 && args[1] === 110) incoming++;
    },
    set: () => true,
  });
  for (const photons of [10, 1000000]) {
    incoming = 0;
    const state = {...defaults, photons};
    for (const seconds of [0, 1, 5, 10, 15]) {
      renderMonteCarlo(context, 900, 400, 'monte-carlo', state, seconds);
      assert.equal(incoming, getMonteCarloRun(state).n);
    }
    assert.equal(incoming, photons);
  }
  assert.equal(renderMonteCarlo(context, 900, 400, 'spectrum', defaults, 0), false);
});

test('restarting the same parameters clears both counts and history', () => {
  const state = {...defaults};
  const original = getMonteCarloRun(state);
  advanceMonteCarlo(original, 5, () => {});
  assert.equal(original.n, 5);
  resetMonteCarloRun(state);
  const restarted = getMonteCarloRun(state);
  assert.equal(restarted.n, 0);
  assert.deepEqual(restarted.history, []);
  advanceMonteCarlo(restarted, 1, () => {});
  assert.equal(restarted.n, 1);
});

test('duration defaults to five seconds and controls photon pacing', () => {
  const experiment = experiments.find(e => e.id === 'monte-carlo');
  assert.equal(experiment.controls.find(c => c.key === 'duration').default, 5);
  assert.equal(createMonteCarloRun({}).duration, 5);
  for (const duration of [1, 5, 30]) {
    const run = createMonteCarloRun({photons: 100, duration});
    advanceMonteCarlo(run, duration / 2, () => {});
    assert.equal(run.n, 50);
    advanceMonteCarlo(run, duration, () => {});
    assert.equal(run.n, 100);
  }
  const state = {photons: 100, duration: 5};
  const original = getMonteCarloRun(state);
  state.duration = 30;
  assert.notEqual(getMonteCarloRun(state), original);
  assert.equal(getMonteCarloRun(state).duration, 30);
});
