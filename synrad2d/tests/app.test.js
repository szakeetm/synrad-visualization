import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation} from '../src/physics.js';
import {Renderer} from '../src/renderer.js';

// Run the actual app and renderer with a minimal DOM/Canvas boundary.
function launch() {
  const elements=new Map();
  let animationFrame,draws=0,now=0;
  const context=new Proxy({}, {
    get(target,key){
      if(key==='fillRect')return ()=>draws++;
      if(key==='createRadialGradient')return ()=>({addColorStop(){}});
      return target[key]??(()=>{});
    },set(target,key,value){target[key]=value;return true;},
  });
  function element(id) {
    if(!elements.has(id))elements.set(id,{
      value:({playback:'2',density:'72'})[id]??'0',checked:id==='repeat',
      style:{},firstChild:{},events:{},textContent:'',open:false,
      addEventListener(type,callback){this.events[type]=callback;},
      setAttribute(){},getContext:()=>context,
      getBoundingClientRect:()=>({width:1000,height:650,left:0,top:0}),
      showModal(){this.open=true;},close(){this.open=false;},
    });
    return elements.get(id);
  }
  const document={getElementById:element,querySelectorAll:()=>[],hidden:false,addEventListener(){}};
  globalThis.window={devicePixelRatio:2};
  const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
  new Function('Simulation','Renderer','STEP','document','matchMedia','ResizeObserver','requestAnimationFrame',source)(
    Simulation,Renderer,1/120,document,()=>({matches:false}),class {observe(){}},callback=>{animationFrame=callback;},
  );
  return {
    element,document,get draws(){return draws;},
    frames(count){for(let i=0;i<count;i++){now+=1000/60;animationFrame(now);}},
    toggle(id,checked){element(id).checked=checked;element(id).events.change();},
  };
}

test('low power caps rendering while preserving playback time and selected detail',()=>{
  const normal=launch();normal.frames(61);
  const normalTime=Number(normal.element('elapsed').textContent);
  const low=launch();low.toggle('low-power',true);
  const start=low.draws;low.frames(61);
  assert.ok(low.draws-start<=31);
  assert.ok(low.draws-start>=29,'a steady 60 Hz clock should render about 30 fps');
  assert.equal(low.element('field-canvas').width,1000);
  assert.equal(Number(low.element('elapsed').textContent),normalTime);
  assert.equal(low.element('density').value,'72');
  low.element('play').events.click();
  const time=low.element('elapsed').textContent;
  low.toggle('low-power',false);
  assert.equal(low.element('field-canvas').width,2000);
  assert.equal(low.element('elapsed').textContent,time);
});

test('paused app stops repainting but display controls and single step still update',()=>{
  const app=launch();app.element('play').events.click();app.frames(2);
  const start=app.draws;app.frames(60);assert.equal(app.draws,start);
  app.toggle('wave',true);app.frames(1);assert.ok(app.draws>start);
  const beforeStep=app.draws;app.element('step').events.click();assert.ok(app.draws>beforeStep);
  app.frames(1);const afterStep=app.draws;app.frames(30);assert.equal(app.draws,afterStep);
});
