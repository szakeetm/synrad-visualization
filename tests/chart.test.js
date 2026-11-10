import test from 'node:test';
import assert from 'node:assert/strict';
import { chartYFraction } from '../src/chart.js';

test('log charts clip small values below the plot instead of creating a false floor', () => {
  assert.equal(chartYFraction(10,[10,1000],true),0);
  assert.equal(chartYFraction(100,[10,1000],true),.5);
  assert.equal(chartYFraction(1000,[10,1000],true),1);
  assert.ok(chartYFraction(1,[10,1000],true)<0);
  assert.ok(Number.isFinite(chartYFraction(0,[10,1000],true)));
  assert.ok(chartYFraction(0,[10,1000],true)<0);
});
