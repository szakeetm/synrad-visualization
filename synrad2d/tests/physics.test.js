import test from 'node:test';
import assert from 'node:assert/strict';
import { aberrate, Simulation, dipoleFieldTail } from '../src/physics.js';
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('aberration preserves unit directions, including ultra relativistic motion',()=>{
 for(const beta of [0,.5,.9,.995]) for(let a=0;a<6.3;a+=.11){
  const [x,y]=aberrate(Math.cos(a),Math.sin(a),beta*.6,beta*.8); near(Math.hypot(x,y),1);
 }
});
test('transverse rest-frame light aberrates forward by beta',()=>{
 const [x,y]=aberrate(0,1,.9,0);near(x,.9);near(y,Math.sqrt(1-.81));
});
test('rest directions remain unchanged without motion',()=>{const [x,y]=aberrate(.6,.8,0,0);near(x,.6);near(y,.8);});
test('resting free-drag field is radial and wavelets propagate at c',()=>{
 const sim=new Simulation({mode:'drag'});sim.advance(.5);
 const event=sim.history[0];const age=sim.time-event.time;
 for(let j=0;j<event.kx.length;j++)near(Math.hypot(event.kx[j]*age,event.ky[j]*age),age);
 near(sim.particle.x,0);near(sim.particle.y,0);
});
for(const mode of ['oscillator','dipole','wiggler'])test(`${mode} motion remains finite and subluminal`,()=>{
 const sim=new Simulation({mode,beta:.99,K:6});
 for(let i=0;i<1500;i++){sim.advance(1/120);const p=sim.particle;assert.ok(Number.isFinite(p.x+p.y));assert.ok(Math.hypot(p.vx,p.vy)<1);}
 if(mode==='wiggler') assert.ok(sim.particle.x>0);
});
test('fast dragging cannot move the charge faster than light',()=>{
 const sim=new Simulation({mode:'drag'});
 for(let i=0;i<200;i++){const p={...sim.particle};sim.advance(1/120,{x:i%2?100:-100,y:80});assert.ok(Math.hypot(sim.particle.x-p.x,sim.particle.y-p.y)<=1/120+1e-9);}
});
test('reset removes old trajectory history',()=>{const sim=new Simulation({mode:'oscillator'});sim.advance(1);sim.reset({mode:'drag'});near(sim.time,0);assert.equal(sim.history.length,1);near(sim.particle.x,0);});
test('long runs keep a bounded history',()=>{const sim=new Simulation({mode:'wiggler',density:32});for(let i=0;i<4000;i++)sim.advance(1/60);assert.ok(sim.history.length<=1802);assert.ok(sim.history[0].time>=sim.time-15.1);});
test('wiggler K is transverse momentum in units of mc',()=>{
 const sim=new Simulation({mode:'wiggler',beta:.9,K:1,period:4});
 let peak=0;
 for(let i=0;i<1200;i++){sim.advance(1/120);peak=Math.max(peak,Math.abs(sim.particle.vy)/Math.sqrt(1-.81));}
 near(peak,1,.002);
});
test('a large K at low speed stays finite and forward-moving',()=>{
 const sim=new Simulation({mode:'wiggler',beta:.1,K:8});
 for(let i=0;i<500;i++){sim.advance(1/120);assert.ok(sim.particle.vx>0);near(Math.hypot(sim.particle.vx,sim.particle.vy),.1);}
});
test('primed traveling history starts at the selected velocity, without artificial acceleration',()=>{
 for(const mode of ['wiggler']) {
  const sim=new Simulation({mode,beta:.9,K:1,period:3.6,density:72});sim.prime(12);
  const first=sim.history[0];
  near(first.kx[18],.9,1e-8);near(first.ky[18],Math.sqrt(.19),1e-8);
 }
});
test('dipole enters straight, bends through 30 degrees, and exits tangentially',()=>{
 const sim=new Simulation({mode:'dipole',beta:.8,amplitude:1,density:36});
 near(sim.particle.x,-3.5);near(sim.particle.y,-1);near(sim.particle.vx,.8);near(sim.particle.vy,0);
 sim.advance(2.5/.8);
 near(sim.particle.x,-1);near(sim.particle.y,-1);near(sim.particle.vx,.8);near(sim.particle.vy,0);
 // Advance to a hand-computed point inside the bend using exact fixed-step time.
 sim.advance(.5);
 near(sim.particle.x,-1+Math.sin(.4));near(sim.particle.y,-Math.cos(.4));
 near(sim.particle.vx,.8*Math.cos(.4));near(sim.particle.vy,.8*Math.sin(.4));
 sim.advance(3);
 const remaining=.8*sim.time-2.5-Math.PI/6;
 near(sim.particle.x,-.5+remaining*Math.sqrt(3)/2);
 near(sim.particle.y,-Math.sqrt(3)/2+remaining/2);
 near(sim.particle.vx,.4*Math.sqrt(3));near(sim.particle.vy,.4);
});
test('dipole replay resets to the entrance with compatible incoming history',()=>{
 const sim=new Simulation({mode:'dipole',beta:.9,amplitude:1.5,density:36});sim.prime();
 assert.equal(sim.passComplete,false);sim.advance(20);assert.equal(sim.passComplete,true);
 sim.reset();sim.prime();
 near(sim.particle.x,-3.5);near(sim.particle.y,-1);near(sim.particle.vx,.9);near(sim.time,0);
 assert.equal(sim.passComplete,false);
 for(const e of sim.history){near(e.y,-1);near(e.kx[9],.9);}
});

test('dipole field reaches beyond the visible screen even at high beta and zoomed out',()=>{
 for(const beta of [.1,.9,.995])for(const time of [0,8,40]) {
  const sim=new Simulation({mode:'dipole',beta,amplitude:1.25,density:36});sim.prime();sim.advance(time);
  // 80 world units covers a wide, zoomed-out viewport from the charge.
  const tail=dipoleFieldTail(sim,80);assert.ok(tail.length>0);assert.ok(tail.length<=132);
  const e=tail[0],age=sim.time-e.time;
  for(let j=0;j<e.kx.length;j++)assert.ok(Math.hypot(e.x+age*e.kx[j]-sim.particle.x,e.y+age*e.ky[j]-sim.particle.y)>80);
  assert.ok(tail.at(-1).time<=sim.history[0].time);
 }
});
test('older dipole field retains the bend after it leaves the finite live history',()=>{
 const sim=new Simulation({mode:'dipole',beta:.9,amplitude:1,density:36});sim.prime();sim.advance(40);
 const tail=dipoleFieldTail(sim,50);
 assert.ok(tail.some(e=>e.time>2.5/.9&&e.time<(2.5+Math.PI/6)/.9));
 for(let i=1;i<tail.length;i++)assert.ok(tail[i].time>=tail[i-1].time);
});
for (const mode of ['wiggler']) {
 test(`${mode} has straight entry, finite magnetic region, and straight exit`,()=>{
  const sim=new Simulation({mode,beta:.9,K:mode==='wiggler'?3:.8,viewWidth:16,periods:3,density:36});sim.prime();
  near(sim.particle.x,-8);near(sim.particle.y,0);near(sim.particle.vy,0);
  sim.advance(2);near(sim.particle.y,0);near(sim.particle.vy,0);assert.ok(sim.particle.x < -4);
  let sawBending=false;
  while(!sim.passComplete){sim.advance(1/120);const p=sim.particle;
   if(p.x < -4 || p.x > 4){near(p.y,0,1e-7);near(p.vy,0,1e-7);}
   else if(Math.abs(p.vy)>.01)sawBending=true;
   assert.ok(Math.hypot(p.vx,p.vy)<1);
  }
  assert.ok(sawBending);assert.ok(sim.particle.x>=8);
  sim.advance(2);near(sim.particle.y,0);near(sim.particle.vy,0);
  sim.reset();sim.prime();near(sim.particle.x,-8);assert.equal(sim.passComplete,false);
 });
}
test('finite insertion-device boundaries are tangent to both straight drifts',()=>{
 const sim=new Simulation({mode:'wiggler',beta:.98,K:3,viewWidth:16,periods:4,density:36});
 const p=sim.path;
 near(p.entryX,-4);near(p.exitX,4);
 for(const x of [p.entryX,p.exitX]){const s=p.atX(x);near(s.y,0);near(s.vy,0);near(s.vx,.98);}
 const peak=p.atX(-4+8/16);
 near(peak.vy/Math.sqrt(1-.98*.98),3);
});
test('actual traveling displacement remains below light speed at extreme beta and K',()=>{
 for(const periods of [1,3,8]){
  const sim=new Simulation({mode:'wiggler',beta:.995,K:9.76,viewWidth:12,periods,density:12});
  for(let i=0;i<2500;i++){
   const {x,y}=sim.particle;sim.advance(1/120);
   assert.ok(Math.hypot(sim.particle.x-x,sim.particle.y-y)/(1/120)<=.995001);
  }
 }
});
test('dipole does not repeat while it is still on screen',()=>{
 const sim=new Simulation({mode:'dipole',beta:.9,amplitude:1.25,viewWidth:20,viewHeight:9,edgeMargin:.2,density:12});
 sim.advance(8);assert.equal(sim.passComplete,false);assert.ok(sim.particle.x<10);
 while(!sim.passComplete)sim.advance(1/120);
 assert.ok(sim.particle.x>=10.2||sim.particle.y>=4.7);
});
test('dipole exits through the top edge on a wide viewport before replay',()=>{
 const sim=new Simulation({mode:'dipole',beta:.9,amplitude:1.25,viewWidth:40,viewHeight:9,edgeMargin:.2,density:12});
 while(!sim.passComplete)sim.advance(1/120);
 assert.ok(sim.particle.y>=4.7);assert.ok(sim.particle.x<20);
});
test('selecting free drag resets a displaced charge to rest at the center',()=>{
 const sim=new Simulation({mode:'drag',density:12});sim.advance(2,{x:5,y:3});assert.ok(sim.particle.x>0);
 sim.reset({mode:'drag'});sim.prime();
 near(sim.particle.x,0);near(sim.particle.y,0);near(sim.particle.vx,0);near(sim.particle.vy,0);
});
