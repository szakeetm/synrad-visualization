import test from 'node:test';
import assert from 'node:assert/strict';
import { chartYFraction, prepareChartScales, axisFraction, axisTicks } from '../src/chart.js';
import {experiments} from '../src/experiments.js';
import {getView} from '../src/views.js';

test('log charts clip small values below the plot instead of creating a false floor', () => {
  assert.equal(chartYFraction(10,[10,1000],true),0);
  assert.equal(chartYFraction(100,[10,1000],true),.5);
  assert.equal(chartYFraction(1000,[10,1000],true),1);
  assert.ok(chartYFraction(1,[10,1000],true)<0);
  assert.ok(Number.isFinite(chartYFraction(0,[10,1000],true)));
  assert.ok(chartYFraction(0,[10,1000],true)<0);
});
test('each plot supports all scale combinations with finite coordinates', () => {
  for(const exp of experiments){
    const state=Object.fromEntries(exp.controls.map(c=>[c.key,c.default]));
    const source=getView(exp.id,state);
    for(const x of ['linear','log'])for(const y of ['linear','log']){
      const view=prepareChartScales(source,{x,y});
      assert.ok(view.xRange[1]>view.xRange[0]);assert.ok(view.yRange[1]>view.yRange[0]);
      for(const trace of view.traces)for(const [px,py]of trace.points){
        assert.ok(Number.isFinite(axisFraction(px,view.xRange,view.logX,view.symlogX)),`${exp.id} x`);
        assert.ok(Number.isFinite(axisFraction(py,view.yRange,view.logY)),`${exp.id} y`);
      }
      assert.ok(axisTicks(view.xRange,view.logX,view.symlogX).length>0);
      assert.ok(axisTicks(view.yRange,view.logY).length>0);
    }
  }
});
test('signed logarithmic axes preserve negative directions and the central plane', () => {
  const view=prepareChartScales({xRange:[-3,3],yRange:[0,1.08],traces:[{points:[[-3,0],[0,1],[3,0]]}]},{x:'log',y:'log'});
  assert.equal(view.symlogX,true);
  assert.equal(axisFraction(0,view.xRange,true,true),.5);
  assert.ok(axisFraction(-1,view.xRange,true,true)<.5);
  assert.ok(axisFraction(1,view.xRange,true,true)>.5);
  assert.ok(view.yRange[0]>0);
});
test('linear axes on an absolute spectrum use absolute y ticks and zero baseline', () => {
  const source=getView('spectrum',{energy:10,rho:100/3,current:100,length:1,spectrumQuantity:'flux',spectrumNormalization:'absolute'});
  const view=prepareChartScales(source,{x:'linear',y:'linear'});
  assert.equal(view.xRange[0],0);assert.equal(view.yRange[0],0);
  assert.ok(axisTicks(view.yRange,false).some(t=>t>1e14));
  assert.equal(source.logX,true,'source defaults remain unchanged');
  assert.equal(source.logY,true);
});
