import test from 'node:test';
import assert from 'node:assert/strict';
import {createCavityPath, longitudinalPattern, longitudinalPeakAngle} from '../radiation2d/src/cavity.js';
import {Simulation, travelingFieldTail} from '../radiation2d/src/physics.js';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('cavity adds the selected energy with continuous subluminal motion',()=>{
  for(const beta of [.1,.8,.995])for(const gain of [0,.1,8,20]){
    const p=createCavityPath({beta,gain,viewWidth:12});
    const incoming=1/Math.sqrt(1-beta*beta);
    near(p.atX(p.entryX).gamma,incoming);near(p.atX(p.exitX).gamma,incoming+gain);
    for(const time of [p.entryTime,p.exitTime]){
      const a=p.state(time-1e-7),b=p.state(time+1e-7);
      assert.ok(Math.abs(a.x-b.x)<2.1e-7);assert.ok(Math.abs(a.vx-b.vx)<1e-6);
    }
    let previous=0;
    for(let i=0;i<=100;i++){
      const t=p.duration*i/100,s=p.state(t),dt=1e-5;
      assert.ok(s.vx>=previous-1e-10&&s.vx<1);previous=s.vx;
      near((p.state(t+dt).x-p.state(t-dt).x)/(2*dt),s.vx,1e-5);
      near(s.y,0);near(s.vy,0);
    }
    near(p.state(p.duration).x,6.2);
  }
});
test('longitudinal pattern has a dark axis and a narrowing forward cone',()=>{
  near(longitudinalPattern(0,1),0);near(longitudinalPattern(Math.PI,10),0);
  near(longitudinalPattern(Math.PI/2,1),1);
  let previous=Math.PI;
  for(const gamma of [1,1.1,2,5,10,30]){
    const peak=longitudinalPeakAngle(gamma);
    assert.ok(peak<previous);previous=peak;
    near(longitudinalPattern(peak,gamma),1);
    assert.ok(longitudinalPattern(peak*.9,gamma)<1);
    assert.ok(longitudinalPattern(peak*1.1,gamma)<1);
    near(longitudinalPattern(-peak,gamma),1);
  }
  near(longitudinalPeakAngle(30)*30,.5,.001);
});
test('cavity reset and incoming field history do not introduce teleport radiation',()=>{
  const sim=new Simulation({mode:'cavity',beta:.8,gain:8,density:36});sim.prime();
  near(sim.particle.x,-6);near(sim.particle.vx,.8);
  for(const e of sim.history){near(e.y,0);near(e.kx[9],.8);}
  sim.advance(sim.path.duration+1);assert.ok(sim.passComplete);
  const tail=travelingFieldTail(sim,30),e=tail[0],age=sim.time-e.time;
  for(let j=0;j<e.kx.length;j++)assert.ok(Math.hypot(e.x+age*e.kx[j]-sim.particle.x,e.y+age*e.ky[j])>30);
  sim.reset();sim.prime();near(sim.particle.x,-6);near(sim.particle.vx,.8);
  assert.equal(sim.passComplete,false);
});
