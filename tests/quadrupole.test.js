import test from 'node:test';
import assert from 'node:assert/strict';
import {quadrupoleTransport, createQuadrupoleModel, quadrupoleSnapshot} from '../src/quadrupole-model.js';

const defaults = {energy:3, gradient:10, sigma:.5, offset:0, length:1, targetDistance:5, photons:100, duration:5};
const close = (a,b,tolerance=1e-10) => assert.ok(Math.abs(a-b)<tolerance, `${a} ≠ ${b}`);

test('quadrupole transport focuses x, defocuses y and drifts with exit slopes',()=>{
  const state={...defaults, energy:.2998, gradient:1}; // k = 1 / m²
  const p=quadrupoleTransport({x:.001,y:.002},state,1);
  close(p.x,.001*Math.cos(1));close(p.xp,-.001*Math.sin(1));
  close(p.y,.002*Math.cosh(1));close(p.yp,.002*Math.sinh(1));
  const drift=quadrupoleTransport({x:.001,y:.002},state,3);
  close(drift.x,p.x+2*p.xp);close(drift.y,p.y+2*p.yp);
  const zero=quadrupoleTransport({x:.001,y:.002},{...state,gradient:0},3);
  close(zero.x,.001);close(zero.y,.002);close(zero.xp,0);close(zero.yp,0);
});

test('packets have continuous straight flights and target counts appear only at arrival',()=>{
  const model=createQuadrupoleModel(defaults);
  assert.equal(model.packets.length,100);
  const first=Math.min(...model.packets.map(p=>p.arrival));
  assert.equal(quadrupoleSnapshot(model,first-1e-8).hits,0);
  const finished=quadrupoleSnapshot(model,model.endTime+1);
  assert.equal(finished.hits+finished.intercepted,100);
  assert.equal(finished.bins.reduce((a,b)=>a+b,0),finished.hits);
  assert.deepEqual(quadrupoleSnapshot(model,model.endTime+1),finished);
  for(const p of model.packets){
    assert.ok(p.arrival>p.birth);
    const flight=(p.arrival-p.birth)*model.speed;
    close(p.hit.z,p.source.z+flight*p.direction.z);
    close(p.hit.x,p.source.x+flight*p.direction.x);
    close(p.hit.y,p.source.y+flight*p.direction.y);
  }
});

test('zero field produces no packets or power; power follows evolving beam and is reproducible',()=>{
  const zero=createQuadrupoleModel({...defaults,gradient:0});
  assert.equal(zero.packets.length,0);assert.equal(zero.powerW,0);
  const a=createQuadrupoleModel(defaults),b=createQuadrupoleModel(defaults);
  assert.deepEqual(a.packets,b.packets);
  assert.ok(a.powerW>0);
  // Zero entrance slopes cause the defocusing plane to dominate at larger lengths.
  const long=createQuadrupoleModel({...defaults,length:2});
  assert.ok(long.powerW>2*a.powerW);
  const wide=createQuadrupoleModel({...defaults,sigma:1});
  close(wide.powerW/a.powerW,4,1e-8);
});

test('strong defocusing stops electrons and photon rays at the circular bore',()=>{
  const model=createQuadrupoleModel({...defaults,energy:.25,gradient:50,length:3,sigma:2,photons:1000});
  assert.ok(model.lossFraction>0);
  assert.ok(model.packets.some(p=>p.outcome==='wall'));
  for(const p of model.packets){
    assert.ok(Math.hypot(p.source.x,p.source.y)<=model.aperture+1e-10);
    assert.ok(p.source.z<=model.tracks[p.track].lossZ);
    if(p.outcome==='wall')close(Math.hypot(p.hit.x,p.hit.y),model.aperture,1e-8);
    else close(p.hit.z,model.targetZ);
    for(const point of [p.source,p.hit,p.direction]) for(const value of Object.values(point)) assert.ok(Number.isFinite(value));
  }
});

test('integrated power agrees with an analytic zero-divergence Gaussian envelope',()=>{
  const s=defaults,k=.2998*s.gradient/s.energy,r=Math.sqrt(k),L=s.length;
  const meanX2=(s.sigma**2+s.offset**2)*1e-6,meanY2=s.sigma**2*1e-6;
  const integral=s.gradient**2*(meanX2*(L/2+Math.sin(2*r*L)/(4*r))+meanY2*(L/2+Math.sinh(2*r*L)/(4*r)));
  const expected=14.08*.2998**2*s.energy**2*.1*1000*integral;
  assert.ok(Math.abs(createQuadrupoleModel(s).powerW/expected-1)<.03);
});

test('scene renders finite coordinates and reports zero, in-flight and completed arrivals', async()=>{
  const {renderQuadrupole}=await import('../src/quadrupole-scene.js');
  const labels=[];
  const context=new Proxy({}, {get:(_,name)=>(...args)=>{
    if(name==='fillText')labels.push(args[0]);
    for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value));
  },set:()=>true});
  for(const state of [defaults,{...defaults,gradient:0},{...defaults,energy:.25,gradient:50,length:3,sigma:2,offset:3,targetDistance:20}]){
    const model=createQuadrupoleModel(state);
    for(const time of [0,1,model.endTime+1])renderQuadrupole(context,900,400,state,time);
  }
  assert.ok(labels.some(value=>value.includes('Horizontal')));
  assert.ok(labels.some(value=>value.includes('Vertical')));
  assert.ok(labels.some(value=>value.includes('Target')));
  assert.ok(labels.some(value=>value.includes('100 hits')));
});

test('packet emission starts on its tracked electron and stays continuous at birth',()=>{
  const model=createQuadrupoleModel(defaults);
  const packet=model.packets[0];
  close((packet.birth-packet.launch)*model.speed,packet.source.z);
  const electron=quadrupoleTransport(model.tracks[packet.track].initial,model.state,packet.source.z);
  close(packet.source.x,electron.x);close(packet.source.y,electron.y);
  const early=quadrupoleSnapshot(model,packet.birth-1e-8);
  assert.ok(!early.flying.some(p=>p.packet===packet));
  const birth=quadrupoleSnapshot(model,packet.birth).flying.find(p=>p.packet===packet);
  close(birth.x,packet.source.x);close(birth.y,packet.source.y);close(birth.z,packet.source.z);
  const middle=quadrupoleSnapshot(model,(packet.birth+packet.arrival)/2).flying.find(p=>p.packet===packet);
  close(middle.x,(packet.source.x+packet.hit.x)/2);close(middle.z,(packet.source.z+packet.hit.z)/2);
});
