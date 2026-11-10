import test from 'node:test';
import assert from 'node:assert/strict';
import { experiments } from '../src/experiments.js';
import { getView } from '../src/views.js';

test('every experiment has finite chart traces at default and control extrema', () => {
  for (const exp of experiments) {
    const defaults = Object.fromEntries(exp.controls.map(c => [c.key, c.default]));
    for (const state of [defaults, ...exp.controls.flatMap(c => c.options
      ? c.options.map(o => ({ ...defaults, [c.key]: o.value }))
      : [{ ...defaults, [c.key]: c.min }, { ...defaults, [c.key]: c.max }])]) {
      const view = getView(exp.id, state);
      assert.ok(view.metrics.length > 0, exp.id);
      assert.ok(view.traces.length > 0, exp.id);
      assert.ok(view.xRange[1] > view.xRange[0], exp.id);
      for (const trace of view.traces) for (const [x, y] of trace.points) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y) && y >= 0, `${exp.id}: ${x}, ${y}`);
      }
    }
  }
});
test('current changes absolute ring power while leaving normalized spectral shape unchanged', () => {
  const a = getView('spectrum', { energy: 3, rho: 10, current: 100 });
  const b = getView('spectrum', { energy: 3, rho: 10, current: 200 });
  assert.deepEqual(a.traces[0].points, b.traces[0].points);
  assert.notDeepEqual(a.metrics, b.metrics);
});
test('spectrum axis includes the selected peak and critical energy at both energy extrema', () => {
  for (const energy of [.25, 10]) for (const rho of [2, 100]) {
    const view = getView('spectrum', { energy, rho, current: 100 });
    const ec = 2.218 * energy ** 3 / rho;
    assert.ok(view.xRange[0] < .1 * ec);
    assert.ok(view.xRange[1] > 3 * ec);
    assert.ok(Math.max(...view.traces[0].points.map(p => p[1])) > .99);
  }
});
test('weak-deflection higher undulator harmonics vanish relative to the fundamental', () => {
  const view = getView('insertion', { energy:3, K:.1, period:30, periods:20 });
  const e1 = .949634 * 9 / 3 / 1.005;
  const atHarmonic = n => Math.max(...view.traces[0].points.filter(([x]) => Math.abs(x / e1 - n) < .03).map(p => p[1]));
  assert.ok(atHarmonic(3) / atHarmonic(1) < .001);
});
