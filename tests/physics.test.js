import test from 'node:test';
import assert from 'node:assert/strict';
import { gamma, criticalEnergy, spectrum, vertical, aberrate, reflectivity, transmission, specularFraction, undulatorEnergy, dipoleProperties, quadrupoleField, quadrupoleProperties, quadrupoleSourceDensity, angularPolarization, photonFluxPerBandwidth, powerPerBandwidth, transverseRadiation } from '../src/physics.js';

test('electron critical energy follows the lecture and cubic energy scaling at fixed radius', () => {
  assert.ok(Math.abs(criticalEnergy(10, 33.333) - 66.54) < .1);
  assert.equal(criticalEnergy(6, 10) / criticalEnergy(3, 10), 8);
  assert.ok(Math.abs(gamma(3) - 5870.85) < 1);
});
test('universal power spectrum peaks near 0.286 and critical energy halves integrated power', () => {
  let peak = [0, 0], below = 0, above = 0;
  for (let i = 0; i < 600; i++) {
    const lo = Math.exp(-12 + i * 16 / 600), hi = Math.exp(-12 + (i + 1) * 16 / 600);
    const x = Math.sqrt(lo * hi), y = spectrum(x);
    if (y > peak[1]) peak = [x, y];
    if (x < 1) below += y * (hi - lo); else above += y * (hi - lo);
  }
  assert.ok(peak[0] > .26 && peak[0] < .31);
  assert.ok(Math.abs(below / (above + below) - .5) < .015);
});
test('the high-energy spectrum retains its exponentially small tail', () => {
  const x=50;
  const asymptotic=Math.sqrt(Math.PI*x/2)*Math.exp(-x)*(1+55/(72*x));
  assert.ok(Math.abs(spectrum(x)/asymptotic-1)<.001);
});
test('vertical components are symmetric with zero perpendicular light in the orbit plane', () => {
  assert.equal(vertical(0, 1).pi, 0);
  assert.deepEqual(vertical(-.7, .5), vertical(.7, .5));
  assert.ok(vertical(0, 1).sigma > vertical(2, 1).sigma);
});
test('aberration is identity at rest and transverse rays beam into 1/gamma', () => {
  assert.ok(Math.abs(aberrate(1.2, 1) - 1.2) < 1e-12);
  assert.ok(Math.abs(aberrate(Math.PI / 2, 20) - 1 / 20) < .0001);
});
test('rest-frame angular power has a dipole null along acceleration and a transverse maximum', () => {
  assert.equal(transverseRadiation(0,0,1),1);
  assert.ok(transverseRadiation(Math.PI/2,0,1)<1e-25);
  assert.equal(transverseRadiation(Math.PI/2,Math.PI/2,1),1);
  assert.equal(transverseRadiation(Math.PI,0,1),1);
});
test('transverse lab radiation beams forward and matches the exact orbit-plane null', () => {
  for(const G of [1,2,5,30]){
    const beta=Math.sqrt(1-1/G**2);
    // Powers and divisions may differ by a rounding bit across Node/V8 builds.
    assert.ok(Math.abs(transverseRadiation(0,0,G)-1)<1e-12,`forward peak at γ=${G}`);
    const expected=((1-beta)/(1+beta))**3;
    assert.ok(Math.abs(transverseRadiation(Math.PI,0,G)/expected-1)<1e-10);
    if(G>1)assert.ok(transverseRadiation(Math.acos(beta),0,G)<1e-20);
    for(let i=0;i<=100;i++)for(const phi of [0,.5,Math.PI/2]){
      const value=transverseRadiation(i*Math.PI/100,phi,G);
      assert.ok(Number.isFinite(value)&&value>=0&&value<=1+1e-12);
    }
  }
  assert.ok(transverseRadiation(.2,Math.PI/2,10)<transverseRadiation(.2,Math.PI/2,2));
});
test('material transmission has correct boundaries and hardens with photon energy', () => {
  assert.equal(transmission(5, 0, 'Cu'), 1);
  assert.ok(transmission(5, 100, 'Cu') < transmission(10, 100, 'Cu'));
  assert.ok(transmission(10, 1000, 'Cu') < transmission(10, 10, 'Cu'));
});
test('reflectivity is bounded, decreases beyond critical angle and roughness suppresses specular light', () => {
  assert.ok(reflectivity(5, 1, 'Cu') > reflectivity(5, 20, 'Cu'));
  for (const e of [.1, 1, 20, 30]) for (const a of [.1, 1, 50]) {
    const r = reflectivity(e, a, 'Cu'); assert.ok(Number.isFinite(r) && r >= 0 && r <= 1);
  }
  assert.equal(specularFraction(5, 10, 0), 1);
  assert.ok(specularFraction(5, 10, 2) < specularFraction(5, 10, .2));
});
test('undulator fundamental follows E squared and redshifts with K and off-axis angle', () => {
  assert.ok(Math.abs(undulatorEnergy(3, 30, 1, 0) - 1.899) < .01);
  assert.equal(undulatorEnergy(6, 30, 1, 0) / undulatorEnergy(3, 30, 1, 0), 4);
  assert.ok(undulatorEnergy(3, 30, 2, 0) < undulatorEnergy(3, 30, 1, 0));
  assert.ok(undulatorEnergy(3, 30, 1, 1) < undulatorEnergy(3, 30, 1, 0));
});
test('dipole properties reproduce the lecture example and vanish without magnetic field', () => {
  const d=dipoleProperties(.247,.2,1,100);
  assert.ok(Math.abs(d.radius-4.1194)<.001);
  assert.ok(Math.abs(d.criticalKeV-.008114)<.00001);
  assert.ok(Math.abs(d.powerKW-.0003089)<.000001);
  const zero=dipoleProperties(3,0,1,100);
  assert.equal(zero.bendMrad,0);assert.equal(zero.criticalKeV,0);assert.equal(zero.powerKW,0);
  assert.equal(dipoleProperties(3,.2,2,100).powerKW,2*dipoleProperties(3,.2,1,100).powerKW);
});
test('quadrupole has zero on-axis field, linear field and quadratic ensemble radiation', () => {
  assert.equal(quadrupoleField(10,0,0).magnitude,0);
  assert.deepEqual(quadrupoleField(10,1,2),{bx:-.02,by:-.01,magnitude:Math.hypot(.02,.01)});
  const centered=quadrupoleProperties(3,10,.5,0,1);
  assert.ok(centered.powerKW>0,'finite beam radiates even with centered centroid');
  assert.equal(quadrupoleProperties(3,20,.5,0,1).powerKW,4*centered.powerKW);
  assert.equal(quadrupoleProperties(3,10,1,0,1).powerKW,4*centered.powerKW);
  assert.equal(quadrupoleProperties(3,0,.5,3,1).powerKW,0);
  assert.equal(quadrupoleProperties(3,10,.5,2,1).powerKW,quadrupoleProperties(3,10,.5,-2,1).powerKW);
  let integral=0;const dx=.002;
  for(let x=-6;x<=6;x+=dx)integral+=quadrupoleSourceDensity(x,10,.5,1)*dx;
  assert.ok(Math.abs(integral-10**2*(2*.5**2+1)*1e-6)<1e-12);
});
test('local polarization maps have nodal axes, reflection symmetry and integrated 7:1 power split', () => {
  assert.deepEqual(angularPolarization(0,0),{sigma:1,pi:0,total:1});
  assert.equal(angularPolarization(1,0).sigma,0);
  assert.equal(angularPolarization(0,2).pi,0);
  assert.equal(angularPolarization(2,0).pi,0);
  assert.ok(angularPolarization(.5,.5).pi>0);
  assert.deepEqual(angularPolarization(.5,.7),angularPolarization(-.5,-.7));
  let sigma=0,pi=0;
  for(let r=.01;r<30;r+=.02)for(let j=0;j<120;j++){
    const a=(j+.5)*2*Math.PI/120,v=angularPolarization(r*Math.cos(a),r*Math.sin(a));
    sigma+=v.sigma*r;pi+=v.pi*r;
  }
  assert.ok(Math.abs(sigma/(sigma+pi)-7/8)<.0001);
});
test('lecture dipole spectrum gives absolute photon flux per 0.1% bandwidth', () => {
  const ec=criticalEnergy(10,100/3);
  assert.ok(Math.abs(ec-66.54)<.01);
  const flux=photonFluxPerBandwidth(10,100/3,100,1,.286*ec);
  assert.ok(Math.abs(flux/6.766e14-1)<.002);
  assert.equal(photonFluxPerBandwidth(10,100/3,200,1,ec),2*photonFluxPerBandwidth(10,100/3,100,1,ec));
  assert.equal(photonFluxPerBandwidth(10,100/3,100,2,ec),2*photonFluxPerBandwidth(10,100/3,100,1,ec));
});
test('flux and power per relative bandwidth integrate to magnet totals and differ by photon energy', () => {
  const E=10,rho=100/3,I=100,L=1,ec=criticalEnergy(E,rho),dlog=32/1600;
  let flux=0,power=0;
  for(let i=0;i<1600;i++){
    const x=Math.exp(-28+(i+.5)*dlog);
    flux+=photonFluxPerBandwidth(E,rho,I,L,x*ec)*dlog/.001;
    power+=powerPerBandwidth(E,rho,I,L,x*ec)*dlog/.001;
  }
  const totalFlux=8.084e20*E*(I/1000)*L/(2*Math.PI*rho);
  const totalPower=14.08*E**4/rho**2*(I/1000)*L*1000;
  assert.ok(Math.abs(flux/totalFlux-1)<.005);
  assert.ok(Math.abs(power/totalPower-1)<.001);
  const ratio=e=>powerPerBandwidth(E,rho,I,L,e)/photonFluxPerBandwidth(E,rho,I,L,e);
  assert.ok(Math.abs(ratio(2*ec)/ratio(ec)-2)<1e-10);
  assert.ok(Math.abs(ratio(ec)/(ec*1.602176634e-16)-1)<.002);
});
