import test from 'node:test';
import assert from 'node:assert/strict';
import {cavityDirection, cavityCdf, cavityPattern, cavityPeak, createCavityModel, traceCavityRay, cavityRadius} from '../src/cavity-physics.js';
import {experiments} from '../src/experiments.js';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('energy-direction quantiles preserve the full solid-angle measure and light speed',()=>{
  for(const g of [1.01,2,20,150]){
    const beta=Math.sqrt(1-1/g**2);let mean=0;
    for(let i=0;i<10000;i++){
      const q=(i+.5)/10000,d=cavityDirection(g,q);
      near(Math.hypot(d.dx,d.dr),1);near(cavityCdf(d.u,beta),q);
      mean+=d.dx/10000;
    }
    // Exact radiated momentum/energy = beta for parallel acceleration.
    near(mean,beta,3e-5);
  }
});
test('longitudinal angular power keeps the forward null and narrows with gamma',()=>{
  for(const g of [1.01,2,20,150]){
    near(cavityPattern(0,g),0);near(cavityPattern(cavityPeak(g),g),1);
    near(cavityPattern(-cavityPeak(g),g),1);
  }
  near(cavityPeak(100)*100,.5,.001);
});
test('packet interception stops at the first wall hit and axial rays reach ports',()=>{
  const a=.025;
  assert.equal(traceCavityRay(.4,1,0,a).outcome,'downstream');
  assert.equal(traceCavityRay(.4,-1,0,a).outcome,'upstream');
  const vertical=traceCavityRay(.5,0,1,a);
  near(vertical.distance,cavityRadius(.5,a));assert.equal(vertical.outcome,'wall');
  for(const x of [.01,.3,.7,.99])for(const angle of [.01,.1,.5,1.5,2.5,3.13]){
    const dx=Math.cos(angle),dr=Math.sin(angle),hit=traceCavityRay(x,dx,dr,a);
    assert.ok(hit.distance>0);
    for(let i=0;i<100;i++){
      const t=hit.distance*i/100;
      assert.ok(t*dr<=cavityRadius(x+t*dx,a)+1e-8);
    }
    if(hit.outcome==='wall')near(hit.distance*dr,cavityRadius(x+hit.distance*dx,a));
  }
});
test('constant-force cavity gains selected energy with continuous subluminal motion',()=>{
  const m=createCavityModel({gammaIn:2,gain:20,aperture:25});
  near(m.state(m.entryTime).gamma,2);near(m.state(m.exitTime).gamma,22);
  for(let i=0;i<100;i++){
    const t=m.exitTime*i/100,p=m.state(t),dt=1e-6;
    near((m.state(t+dt).x-m.state(t-dt).x)/(2*dt),p.beta,2e-6);
    assert.ok(p.beta>0&&p.beta<1);
  }
  for(const p of m.packets){
    assert.ok(p.time>m.entryTime&&p.time<m.exitTime);
    assert.ok(p.x>0&&p.x<1);near(Math.hypot(p.dx,p.dr),1);
  }
  near(m.fractions.downstream+m.fractions.upstream+m.fractions.wall,1);
});
test('higher gamma and wider aperture increase the energy reaching the downstream port',()=>{
  const low=createCavityModel({gammaIn:2,gain:1,aperture:25});
  const high=createCavityModel({gammaIn:50,gain:1,aperture:25});
  const wide=createCavityModel({gammaIn:2,gain:1,aperture:100});
  assert.ok(high.fractions.downstream>low.fractions.downstream+.5);
  assert.ok(wide.fractions.downstream>low.fractions.downstream);
});
test('zero acceleration emits no packets and has no interception fractions',()=>{
  const m=createCavityModel({gammaIn:2,gain:0,aperture:25});
  assert.equal(m.packets.length,0);assert.equal(m.fractions,null);
  near(m.state(m.entryTime).beta,m.state(m.exitTime).beta);
});
test('the 45.6 GeV beam has a micron-scale cone and clears the cavity',()=>{
  const exp=experiments.find(e=>e.id==='cavity');
  const s=Object.fromEntries(exp.controls.map(c=>[c.key,c.default]));
  assert.equal(s.cavityEnergy,.01);
  const m=createCavityModel({...s,cavityEnergy:45.6});
  assert.ok(m.gammaIn>89000&&m.gammaIn<90000);
  const spread=Math.tan(cavityPeak(m.gammaIn))*1e6;
  assert.ok(spread>5.5&&spread<5.7);
  assert.ok(m.packets.length>0);
  assert.ok(m.packets.every(p=>p.outcome==='downstream'));
  near(m.fractions.downstream,1);near(m.fractions.wall,0);
  near(m.gammaOut-m.gammaIn,20/.51099895069,1e-7);
});
test('high-energy cone and source motion remain numerically stable',()=>{
  for(const energy of [1,45.6,182.4]){
    const m=createCavityModel({cavityEnergy:energy,gainMeV:20,aperture:25});
    near(cavityPeak(m.gammaIn)*m.gammaIn,.5,1e-6);
    near(cavityPattern(cavityPeak(m.gammaIn),m.gammaIn),1);
    for(let i=0;i<100;i++){
      const t=m.entryTime+(m.exitTime-m.entryTime)*(i+.5)/100,dt=1e-5,p=m.state(t);
      near((m.state(t+dt).x-m.state(t-dt).x)/(2*dt),p.beta,1e-6);
    }
  }
  assert.equal(createCavityModel({cavityEnergy:45.6,gainMeV:0}).packets.length,0);
});
