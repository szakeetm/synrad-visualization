import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateMonteCarlo} from '../src/monte-carlo.js';
import {experiments} from '../src/experiments.js';
import {getView} from '../src/views.js';

const defaults={photons:10,reflection:true,scattering:true};

test('Monte Carlo tab starts with a few photons and two checkbox controls',()=>{
  const experiment=experiments.find(e=>e.id==='monte-carlo');
  assert.ok(experiment);
  assert.equal(experiment.controls.find(c=>c.key==='photons').default,10);
  for(const key of ['reflection','scattering'])assert.equal(experiment.controls.find(c=>c.key===key).type,'checkbox');
});

test('sample paths and totals preserve the photon prefix as count increases',()=>{
  const small=simulateMonteCarlo(defaults);
  const large=simulateMonteCarlo({...defaults,photons:1000000});
  assert.deepEqual(large.paths.slice(0,10),small.paths);
  assert.deepEqual(small.counts,{absorbed:small.paths.filter(p=>p.outcome==='absorbed').length,reflected:small.paths.filter(p=>p.outcome==='reflected').length,scattered:small.paths.filter(p=>p.outcome==='scattered').length});
  assert.equal(Object.values(large.counts).reduce((a,b)=>a+b),1000000);
  assert.ok(Object.values(small.counts).every(n=>n>0));
  assert.ok(large.paths.length<=40);
  assert.ok(large.history.length<400);
  assert.equal(large.history.at(-1).n,1000000);
  assert.ok(Math.abs(large.counts.absorbed/large.n-large.expected.absorbed)<.002);
  assert.ok(large.history.at(-1).uncertainty<small.history.at(-1).uncertainty);
});

test('disabling interaction channels transfers their probability to absorption',()=>{
  for(const reflection of [false,true])for(const scattering of [false,true]){
    const result=simulateMonteCarlo({...defaults,photons:1000,reflection,scattering});
    assert.equal(result.expected.absorbed,1-(reflection?.3:0)-(scattering?.2:0));
    if(!reflection)assert.equal(result.counts.reflected,0);
    if(!scattering)assert.equal(result.counts.scattered,0);
    if(!reflection&&!scattering)assert.equal(result.counts.absorbed,1000);
  }
});

test('a new seed gives a new sample and the original seed is repeatable',()=>{
  const original=simulateMonteCarlo(defaults);
  assert.notDeepEqual(simulateMonteCarlo({...defaults,sampleSeed:43}).paths,original.paths);
  assert.deepEqual(simulateMonteCarlo(defaults),original);
});

test('Monte Carlo view uses the actual sampled counts and expected solution',()=>{
  const view=getView('monte-carlo',{...defaults,photons:1000000});
  const model=simulateMonteCarlo({...defaults,photons:1000000});
  assert.equal(view.logX,true);
  assert.equal(view.traces[0].points.at(-1)[1],model.counts.absorbed/model.n);
  assert.ok(view.traces[1].points.every(([,y])=>Math.abs(y-.5)<1e-15));
});

test('photon scene draws finite geometry for every channel combination and count extreme',async()=>{
  const {renderMonteCarlo}=await import('../src/monte-carlo-scene.js');
  let operations=0;
  const context=new Proxy({}, {get:(_,name)=> (...args)=>{
    for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${String(name)} received ${arg}`);
    operations++;
  },set:()=>true});
  for(const photons of [10,1000000])for(const reflection of [true,false])for(const scattering of [true,false])for(const time of [0,1,8]){
    assert.equal(renderMonteCarlo(context,900,400,'monte-carlo',{photons,reflection,scattering},time),true);
  }
  assert.ok(operations>100);
  assert.equal(renderMonteCarlo(context,900,400,'spectrum',defaults,0),false);
});
