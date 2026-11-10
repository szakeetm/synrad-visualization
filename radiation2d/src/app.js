import { Simulation, STEP } from './physics.js';
import { Renderer } from './renderer.js';
const $ = id => document.getElementById(id);
const canvas = $('field-canvas');
const renderer = new Renderer(canvas,$('cavity-pattern'));
const sim = new Simulation();
const descriptions = {
  drag: ['FREE DRAG', '01 / EXPLORE BY HAND', 'A ripple starts with a little motion.', 'Drag the charge and watch the bend in its electric field travel outward. Changes propagate at the speed of light; the distant field learns about the motion later.'],
  oscillator: ['OSCILLATOR', '02 / DIPOLE RADIATION', 'Back and forth. Out into the world.', 'An oscillating charge sends alternating bends through its electric field. This single-charge motion demonstrates dipole radiation. At low speeds, radiation is strongest perpendicular to the oscillation axis; relativistic motion changes the angular pattern.'],
  dipole: ['DIPOLE MAGNET', '03 / A SINGLE BEND', 'One bend. A pulse of radiation.', 'The charge enters on a straight path, turns through a 30° bending magnet, then leaves tangentially. Repeat pass waits until the charge has left the screen, then replays with fresh field history; it does not teleport the charge within a physical trajectory.'],
  wiggler: ['WIGGLER', '04 / PERIODIC DEFLECTION', 'Turn up the bend.', 'Stronger deflections sweep radiation over a wider angle. The magnetic region spans the middle half of the screen, with straight entry and exit paths. Repeat pass starts a fresh demonstration after the charge reaches the right edge.'],
  cavity: ['ACCELERATING CAVITY', '05 / LONGITUDINAL ACCELERATION', 'Accelerate straight. Beam forward.', 'An ideal virtual cavity applies a constant force along the motion. The charge gains energy without bending. The radiation pattern narrows around +x as γ rises: a hollow forward cone with zero intensity exactly on axis. The diagram below compares the instantaneous rest frame and lab frame; each polar curve has its own unit peak, with radial length proportional to dP/dΩ per source time. In the straight drifts acceleration and radiation are zero.'],
};
const options = {field:true, wave:false, trail:true, target:null};
let running = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let previous = null, pointerId = null, pointerScreen = null, lastReadout = 0;
let keyboardTarget = null;

function syncParameters() {
  const mode=sim.config.mode, traveling=mode==='wiggler', cavity=mode==='cavity';
  $('drag-note').hidden = mode !== 'drag';
  $('beta-row').hidden = mode==='drag';
  $('gamma-note').hidden = mode==='drag';
  $('size-row').hidden = !['oscillator','dipole'].includes(mode);
  $('repeat-row').hidden = mode !== 'dipole' && !traveling && !cavity;
  $('repeat-note').hidden = mode !== 'dipole' && !traveling && !cavity;
  $('gain-row').hidden = !cavity;
  $('beta-label').textContent=cavity?'Entrance speed':'Speed';
  $('gain').value=sim.config.gain??8;
  $('gain-value').textContent=(sim.config.gain??8).toFixed(1);
  $('cavity-note').hidden=!cavity;
  $('cavity-pattern').hidden=!cavity;
  $('gamma-label').textContent=cavity?'Entrance Lorentz factor':'Lorentz factor';
  if(cavity)$('cavity-note').textContent=`γ: ${sim.path.initialGamma.toFixed(2)} → ${sim.path.finalGamma.toFixed(2)}. Ideal uniform accelerating force; no RF phase or fringe fields.`;
  $('strength-row').hidden = !traveling; $('period-row').hidden = !traveling;
  // Keep K physically reachable at fixed total speed and leave forward momentum.
  const gamma=1/Math.sqrt(1-sim.config.beta**2);
  const maxK=Math.floor(.98*gamma*sim.config.beta*100)/100;
  $('strength').max = maxK;
  sim.config.K=Math.max(.05,Math.min(maxK,sim.config.K));
  $('strength').value=sim.config.K;
  $('beta').value=sim.config.beta;
  $('beta-value').textContent=sim.config.beta.toFixed(3);
  $('gamma-value').textContent=gamma.toFixed(2);
  $('size').value=sim.config.amplitude;
  $('period').value=sim.config.periods;
  $('size-value').textContent=sim.config.amplitude.toFixed(2);
  $('size-label').firstChild.textContent=mode==='dipole'?'Bend radius ':'Amplitude ';
  $('strength-value').textContent=sim.config.K.toFixed(2);
  $('period-value').textContent=sim.config.periods;
}
function restart(config={}) {
  options.target=null;keyboardTarget=null;pointerScreen=null;
  sim.reset({viewWidth:renderer.width/renderer.scale,viewHeight:renderer.height/renderer.scale,edgeMargin:26/renderer.scale,...config});syncParameters();
  sim.reset();sim.prime();
  previous=null;updateReadout();renderer.draw(sim,options);
}
function setMode(mode) {
  if(pointerId!==null && canvas.hasPointerCapture(pointerId))canvas.releasePointerCapture(pointerId);
  pointerId=null;
  document.querySelectorAll('[data-mode]').forEach(button=>{
    const selected=button.dataset.mode===mode;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',selected);
  });
  const [name,kicker,title,text]=descriptions[mode];
  $('scene-label').textContent=name;$('caption-kicker').textContent=kicker;
  $('caption-title').textContent=title;$('caption-text').textContent=text;
  $('canvas-instruction').hidden=mode!=='drag';
  $('canvas-instruction').style.opacity=1;
  const traveling=mode==='wiggler';
  canvas.style.cursor=mode==='drag'?'grab':'default';
  const config={mode};
  if(mode==='dipole')Object.assign(config,{beta:.9,amplitude:1.25});
  if(traveling)Object.assign(config,{beta:.98,K:3});
  if(mode==='cavity')Object.assign(config,{beta:.8,gain:8});
  restart(config);
}
function updateReadout() {
  const beta=Math.min(.999999,Math.hypot(sim.particle.vx,sim.particle.vy));
  $('actual-beta').textContent=beta.toFixed(3);
  $('actual-gamma').textContent=(1/Math.sqrt(1-beta*beta)).toFixed(2);
  $('elapsed').textContent=Math.max(0,sim.time).toFixed(2);
}
function setRunning(value) {
  running=value;previous=null;
  $('play-icon').textContent=running?'Ⅱ':'▶';
  $('play').setAttribute('aria-label',running?'Pause simulation':'Resume simulation');
  $('play').title=running?'Pause (Space)':'Resume (Space)';
  $('run-state').textContent=running?'● RUNNING':'Ⅱ PAUSED';
  $('run-state').style.color=running?'#7c9b7c':'#c6b77d';
  $('step').disabled=running;
}
function releasePointer(e) {
  if(e.pointerId!==pointerId)return;
  pointerId=null;pointerScreen=null;options.target=null;
  canvas.style.cursor=sim.config.mode==='drag'?'grab':'default';
}
canvas.addEventListener('pointerdown',e=>{
  if(sim.config.mode!=='drag'||(e.pointerType==='mouse'&&e.button!==0))return;
  e.preventDefault();canvas.focus({preventScroll:true});
  pointerId=e.pointerId;canvas.setPointerCapture(pointerId);
  pointerScreen={x:e.clientX,y:e.clientY};keyboardTarget=null;
  options.target=renderer.worldPoint(e.clientX,e.clientY);
  $('canvas-instruction').style.opacity=0;canvas.style.cursor='grabbing';
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointerId)return;
  pointerScreen={x:e.clientX,y:e.clientY};
});
canvas.addEventListener('pointerup',releasePointer);
canvas.addEventListener('pointercancel',releasePointer);
canvas.addEventListener('lostpointercapture',releasePointer);
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
for(const [id,key] of [['beta','beta'],['size','amplitude'],['strength','K'],['period','periods'],['gain','gain']]) {
  $(id).addEventListener('input',()=>restart({[key]:Number($(id).value)}));
}
$('density').addEventListener('change',()=>restart({density:Number($('density').value)}));
for(const [id,key] of [['field','field'],['wave','wave'],['trail','trail']]) {
  $(id).addEventListener('change',()=>{options[key]=$(id).checked;});
}
$('play').addEventListener('click',()=>setRunning(!running));
function step(){if(running)return;sim.advance(STEP,options.target);replayIfNeeded();updateReadout();renderer.draw(sim,options);}
$('step').addEventListener('click',step);
$('reset').addEventListener('click',()=>restart());
const about=$('about');
$('about-open').addEventListener('click',()=>about.showModal());
$('about-close').addEventListener('click',()=>about.close());
about.addEventListener('click',e=>{if(e.target===about){const r=about.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)about.close();}});
document.addEventListener('keydown',e=>{
  if(about.open||/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName))return;
  if(e.code==='Space'){e.preventDefault();setRunning(!running);}
  if(e.key==='.')step();
  if(e.key.toLowerCase()==='r')restart();
  if(e.target===canvas && sim.config.mode==='drag' && e.key.startsWith('Arrow')){
    e.preventDefault();keyboardTarget??={x:sim.particle.x,y:sim.particle.y};
    const delta=.5;
    if(e.key==='ArrowLeft')keyboardTarget.x-=delta;
    if(e.key==='ArrowRight')keyboardTarget.x+=delta;
    if(e.key==='ArrowUp')keyboardTarget.y+=delta;
    if(e.key==='ArrowDown')keyboardTarget.y-=delta;
    options.target=keyboardTarget;$('canvas-instruction').style.opacity=0;
  }
});
new ResizeObserver(()=>{
  renderer.resize();
  sim.config.edgeMargin=26/renderer.scale;
  if((sim.path || sim.config.mode==='dipole') &&
    (Math.abs(renderer.width/renderer.scale-sim.config.viewWidth)>.01 || Math.abs(renderer.height/renderer.scale-sim.config.viewHeight)>.01))restart();
}).observe($('canvas-wrap'));
document.addEventListener('visibilitychange',()=>{previous=null;});
function replayIfNeeded() {
  if($('repeat').checked && sim.passComplete)restart();
}
function frame(now) {
  const elapsed=previous===null?0:Math.min((now-previous)/1000,.1);previous=now;
  if(pointerScreen)options.target=renderer.worldPoint(pointerScreen.x,pointerScreen.y);
  if(running&&!document.hidden&&!about.open)sim.advance(elapsed*Number($('playback').value),options.target);
  replayIfNeeded();
  renderer.draw(sim,options);
  if(now-lastReadout>90){updateReadout();lastReadout=now;}
  requestAnimationFrame(frame);
}
setMode('drag');setRunning(running);requestAnimationFrame(frame);
