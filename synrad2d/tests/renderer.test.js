import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../src/renderer.js';
import {Simulation} from '../src/physics.js';

// Capture the actual field paths submitted to Canvas without a browser dependency.
function scene(config={}) {
  globalThis.window={devicePixelRatio:2};
  const paths=[];
  let path=[];
  const ctx=new Proxy({}, {
    get(target,key) {
      if(key==='beginPath')return ()=>{path=[];};
      if(key==='moveTo'||key==='lineTo')return (x,y)=>path.push([x,y]);
      if(key==='stroke')return ()=>{if(target.strokeStyle==='#36c9dfbb')paths.push(path);};
      if(key==='createRadialGradient')return ()=>({addColorStop(){}});
      return target[key]??(()=>{});
    },
    set(target,key,value){target[key]=value;return true;},
  });
  const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:1000,height:650,left:0,top:0})};
  const renderer=new Renderer(canvas);
  const sim=new Simulation({density:120,...config});sim.prime();
  return {renderer,sim,canvas,paths};
}

test('straight field lines collapse to endpoints instead of thousands of segments',()=>{
  const {renderer,sim,paths}=scene();
  renderer.draw(sim,{field:true});
  assert.equal(paths[0].length,240);
});

test('unchanged scenes skip drawing but overlay and target changes invalidate them',()=>{
  const {renderer,sim,paths}=scene();
  const options={field:true,target:null};
  renderer.draw(sim,options);renderer.draw(sim,options);
  assert.equal(paths.length,1);
  options.target={x:1,y:2};renderer.draw(sim,options);
  options.target.x=2;renderer.draw(sim,options);
  options.wave=true;renderer.draw(sim,options);
  assert.equal(paths.length,4);
  renderer.resize();renderer.draw(sim,options);
  assert.equal(paths.length,5);
  sim.reset();sim.prime();renderer.draw(sim,options);
  assert.equal(paths.length,6);
});

test('low power limits directions and pixels without changing simulation history',()=>{
  const {renderer,sim,canvas,paths}=scene();
  const history=sim.history,time=sim.time;
  renderer.draw(sim,{field:true,lowPower:true});
  assert.equal(canvas.width,1000);
  assert.equal(paths[0].length,72);
  assert.equal(sim.history,history);assert.equal(sim.time,time);assert.equal(sim.config.density,120);
  renderer.draw(sim,{field:true,lowPower:false});
  assert.equal(canvas.width,2000);
  assert.equal(paths[1].length,240);
});
