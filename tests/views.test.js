import test from 'node:test';
import assert from 'node:assert/strict';
import { experiments } from '../src/experiments.js';
import { getView } from '../src/views.js';
import {transverseRadiation} from '../src/physics.js';

test('cavity defaults show the 45.6 GeV microradian cone and downstream transport',()=>{
  const e=experiments.find(e=>e.id==='cavity'),s=Object.fromEntries(e.controls.map(c=>[c.key,c.default]));
  const v=getView('cavity',s);
  assert.match(v.xLabel,/µrad/);
  const peak=v.traces[0].points.reduce((a,b)=>a[1]>b[1]?a:b);
  assert.ok(Math.abs(peak[0])>5.5&&Math.abs(peak[0])<5.7);
  assert.ok(v.metrics.some(m=>m.value==='45.6 GeV'));
  assert.ok(v.metrics.some(m=>m.name==='Wall interception · energy'&&m.value==='≈ 0%'));
});
test('cavity chart resolves the narrow exit cone during strong low-energy acceleration',()=>{
  const v=getView('cavity',{cavityEnergy:.000516,gainMeV:100,aperture:25});
  for(const t of v.traces)assert.ok(Math.abs(Math.max(...t.points.map(p=>p[1]))-1)<1e-10);
  assert.ok(v.traces[1].points.filter(([x,y])=>x>1500&&x<3500&&y>.1).length>20);
});

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
test('current changes magnet power while leaving normalized spectral shape unchanged', () => {
  const a = getView('spectrum', { energy: 3, rho: 10, current: 100, length:1, spectrumQuantity:'flux', spectrumNormalization:'normalized' });
  const b = getView('spectrum', { energy: 3, rho: 10, current: 200, length:1, spectrumQuantity:'flux', spectrumNormalization:'normalized' });
  assert.deepEqual(a.traces[0].points, b.traces[0].points);
  assert.notDeepEqual(a.metrics, b.metrics);
});
test('spectrum axis includes the selected peak and critical energy at both energy extrema', () => {
  for (const energy of [.25, 10]) for (const rho of [2, 100]) {
    const view = getView('spectrum', { energy, rho, current: 100 });
    const ec = 2218 * energy ** 3 / rho;
    assert.ok(view.xRange[0] < .1 * ec);
    assert.ok(view.xRange[1] > 3 * ec);
    assert.ok(Math.max(...view.traces[0].points.map(p => p[1])) > .99);
  }
});
test('spectrum matches lecture log-log axes and bandwidth quantities', () => {
  const state={energy:10,rho:100/3,current:100,length:1,spectrumQuantity:'flux',spectrumNormalization:'absolute'};
  const flux=getView('spectrum',state);
  assert.equal(flux.logX,true);assert.equal(flux.logY,true);
  assert.match(flux.xLabel,/eV/);assert.match(flux.yLabel,/0\.1%/);
  const peak=flux.traces[0].points.reduce((a,b)=>a[1]>b[1]?a:b);
  assert.ok(peak[0]>17000&&peak[0]<21000);
  assert.ok(peak[1]>6.7e14&&peak[1]<6.9e14);
  const power=getView('spectrum',{...state,spectrumQuantity:'power',spectrumNormalization:'normalized'});
  const powerPeak=power.traces[0].points.reduce((a,b)=>a[1]>b[1]?a:b);
  assert.ok(powerPeak[0]>60000,'power per relative bandwidth peaks near Ec, not 0.286 Ec');
  assert.match(power.yLabel,/peak/);
});
test('weak-deflection higher undulator harmonics vanish relative to the fundamental', () => {
  const view = getView('insertion', { energy:3, K:.1, period:30, periods:20 });
  const e1 = .949634 * 9 / 3 / 1.005;
  const atHarmonic = n => Math.max(...view.traces[0].points.filter(([x]) => Math.abs(x / e1 - n) < .03).map(p => p[1]));
  assert.ok(atHarmonic(3) / atHarmonic(1) < .001);
});
test('source tabs expose finite plots and the zero-field dipole emits no spectrum', () => {
  assert.ok(experiments.find(e=>e.id==='dipole'));
  assert.ok(experiments.find(e=>e.id==='quadrupole'));
  const zero=getView('dipole',{energy:3,field:0,length:1,current:100});
  assert.ok(zero.traces[0].points.every(([,y])=>y===0));
});
test('polarization angular cuts keep one common scale and respect pi nodal axes', () => {
  const origin=getView('polarization',{polarizationModel:'angular',cut:'vertical',theta:0,psi:0,ratio:1});
  assert.ok(origin.traces[1].points.every(([,y])=>y===0));
  const offaxis=getView('polarization',{polarizationModel:'angular',cut:'vertical',theta:.7,psi:.5,ratio:1});
  assert.ok(offaxis.traces[1].points.some(([,y])=>y>0));
  assert.equal(offaxis.traces[1].points.find(([x])=>x===0)[1],0);
  assert.match(origin.caption,/integrated/i);
  const spectral=getView('polarization',{polarizationModel:'spectral',cut:'vertical',theta:0,psi:0,ratio:1});
  assert.match(spectral.caption,/resolved/i);
});
test('reference-frame plots are slices through the same angular-power surfaces', () => {
  for(const framePlane of ['orbit','perpendicular']){
    const phi=framePlane==='orbit'?0:Math.PI/2;
    const view=getView('frames',{gammaDemo:5,framePlane});
    assert.match(view.yLabel,/power/i);
    for(const [degrees,value]of view.traces[0].points){
      assert.ok(Math.abs(value-transverseRadiation(degrees*Math.PI/180,phi,5))<1e-10);
    }
    const rest=getView('frames',{gammaDemo:1,framePlane});
    assert.deepEqual(rest.traces[0].points,rest.traces[1].points);
  }
});
