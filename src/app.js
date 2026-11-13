import {hasPhotonSimulation,getPhotonSimulation,resetPhotonSimulation} from './photon-simulation.js';
import {renderPhotonSimulation} from './photon-scenes.js';
import {renderMonteCarlo} from './monte-carlo-scene.js';
import {experiments} from './experiments.js';
import {getView,fmt} from './views.js';
import {drawChart,prepareChartScales} from './chart.js';
import {renderSource} from './source-scenes.js';
import {renderMaterial} from './material-scenes.js';
import {renderMagnet} from './magnet-scenes.js';
import {controlPosition,controlValue} from './controls.js';
import {renderCavity} from './cavity-scene.js';
import {drawCavityLobes} from './cavity-lobes.js';

const $=id=>document.getElementById(id);
const states=Object.fromEntries(experiments.map(e=>[e.id,Object.fromEntries(e.controls.map(c=>[c.key,c.default]))]));
const plotScales={};
let selected=experiments[0],sharedEnergy=3,time=0,last=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas=$('scene'),ctx=canvas.getContext('2d');
const set=(id,value)=>$(id).textContent=value;
const nav=$('navigation');
const synrad2d={id:'synrad2d'};
const intro=document.createElement('a');intro.className='nav-item';intro.href='#synrad2d';intro.dataset.id='synrad2d';intro.innerHTML='<span class="nav-index">01</span> Radiation2D browser';nav.append(intro);
const embeddedFrame=$('synrad2d-frame');
let embeddedResize;
embeddedFrame.addEventListener('load',()=>{
  embeddedResize?.disconnect();
  if(!embeddedFrame.hasAttribute('src'))return;
  const body=embeddedFrame.contentDocument?.body;
  if(!body)return;
  const fit=()=>{const height=Math.ceil(body.getBoundingClientRect().height);if(height>0)embeddedFrame.style.height=`${height}px`;};
  embeddedResize=new ResizeObserver(fit);embeddedResize.observe(body);fit();
});
let group='';
experiments.forEach((e,i)=>{
  if(e.group!==group){group=e.group;const title=document.createElement('div');title.className='nav-group';title.textContent=group;nav.append(title);}
  const a=document.createElement('a');a.href=`#${e.id}`;a.className='nav-item';a.dataset.id=e.id;a.innerHTML=`<span class="nav-index">${String(i+2).padStart(2,'0')}</span> ${e.short}`;nav.append(a);
});

function select(id) {
  const embedded=id==='synrad2d';
  selected=embedded?synrad2d:experiments.find(e=>e.id===(id==='rough'?'reflection':id))??experiments[0];
  $('synrad2d-panel').hidden=!embedded;
  $('experiment-workspace').hidden=embedded;
  $('experiment-model').hidden=embedded;
  if(!embedded){embeddedResize?.disconnect();embeddedFrame.removeAttribute('src');}
  $('scene-viewport').scrollLeft=0;
  $('monte-carlo-progress').hidden=!hasPhotonSimulation(selected.id);
  $('scene-card').hidden=selected.id==='spectrum';$('chart-reset').hidden=selected.id!=='spectrum';
  if(!embedded&&'energy' in states[selected.id]){const c=selected.controls.find(c=>c.key==='energy');sharedEnergy=Math.max(c.min,Math.min(c.max,sharedEnergy));states[selected.id].energy=sharedEnergy;}
  document.querySelectorAll('[data-id]').forEach(a=>{const active=a.dataset.id===selected.id;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(matchMedia('(max-width: 620px)').matches){
    const active=nav.querySelector('[aria-current="page"]');
    nav.scrollLeft+=active.getBoundingClientRect().left-nav.getBoundingClientRect().left-(nav.clientWidth-active.offsetWidth)/2;
  }
  if(embedded){
    set('kicker','01 / Moving charge and radiation fields');set('title','Radiation2D browser');
    set('description','Original Radiation2D and wavelet visualization method by Tsumoru Shintake.');
    set('experiment-number','01');set('slides','SYNRAD TUTORIAL · SLIDE 2');
    if(!embeddedFrame.hasAttribute('src'))embeddedFrame.src='./synrad2d/index.html';
    return;
  }
  set('kicker',selected.kicker);set('title',selected.title);set('description',selected.description);set('notice',selected.notice);set('explanation',selected.explanation);set('equation',selected.equation);set('slides',`SYNRAD TUTORIAL · SLIDES ${selected.slides}`);set('experiment-number',String(experiments.indexOf(selected)+2).padStart(2,'0'));
  canvas.setAttribute('aria-label',`${selected.short}: ${selected.description} Geometry is schematic; the plot below contains physical units.`);
  const controls=$('controls');controls.replaceChildren();
  for(const c of selected.controls) {
    const box=document.createElement('div');box.className='control';box.dataset.controlKey=c.key;
    const label=document.createElement('label');label.htmlFor=`control-${c.key}`;label.textContent=c.label;
    let input;
    if(c.type==='checkbox'){input=document.createElement('input');input.type='checkbox';input.checked=states[selected.id][c.key];box.classList.add('checkbox-control');}
    else if(c.options){input=document.createElement('select');for(const o of c.options){const option=document.createElement('option');option.value=o.value;option.textContent=o.label;input.append(option);}}
    else {const output=document.createElement('output');output.id=`value-${c.key}`;output.htmlFor=`control-${c.key}`;label.append(output);input=document.createElement('input');input.type='range';input.min=c.scale?0:c.min;input.max=c.scale?1000:c.max;input.step=c.scale?1:c.step;}
    input.id=`control-${c.key}`;input.value=c.options?states[selected.id][c.key]:controlPosition(states[selected.id][c.key],c);box.append(label,input);
    if(!c.options&&c.type!=='checkbox'){const limits=document.createElement('div');limits.className='range-limits';limits.innerHTML=`<span>${c.min} ${c.unit}</span><span>${c.max} ${c.unit}</span>`;box.append(limits);}
    if(c.scale==='rapidity'){const hint=document.createElement('p');hint.className='control-hint';hint.textContent='Fine control near γ = 1';box.append(hint);}
    if(c.scale==='log'){const hint=document.createElement('p');hint.className='control-hint';hint.textContent=c.hint??'Logarithmic energy slider · presets include 45.6 GeV';box.append(hint);}
    if(c.presets){const presets=document.createElement('div');presets.className='control-presets';presets.setAttribute('aria-label',`${c.label} presets`);for(const value of c.presets){const button=document.createElement('button');button.type='button';button.textContent=c.integer?value.toLocaleString('en-US'):String(value);button.setAttribute('aria-label',`Set ${c.label.toLowerCase()} to ${value} ${c.unit}`);button.addEventListener('click',()=>{states[selected.id][c.key]=value;input.value=controlPosition(value,c);if(c.key==='energy')sharedEnergy=value;if(hasPhotonSimulation(selected.id)){time=0;resetPhotonSimulation(selected.id,states[selected.id]);}update();});presets.append(button);}box.append(presets);}
    input.addEventListener('input',()=>{const value=c.type==='checkbox'?input.checked:c.options?input.value:controlValue(Number(input.value),c);states[selected.id][c.key]=value;if(c.key==='energy')sharedEnergy=value;if(hasPhotonSimulation(selected.id)){time=0;resetPhotonSimulation(selected.id,states[selected.id]);}update();});controls.append(box);
  }
  if(hasPhotonSimulation(selected.id)){
    const button=document.createElement('button');button.type='button';button.className='sample-button';button.textContent='New sample';
    button.addEventListener('click',()=>{const state=states[selected.id];state.sampleSeed=(state.sampleSeed??41)+1;time=0;update();});
    controls.append(button);
  }
  if(hasPhotonSimulation(selected.id))resetPhotonSimulation(selected.id,states[selected.id]);
  time=0;setPaused(paused);update();
}
function legend(container,items){container.replaceChildren();for(const [label,color]of items){const span=document.createElement('span');span.className='legend-key';const i=document.createElement('i');i.style.setProperty('--key',color);span.append(i,document.createTextNode(label));container.append(span);}}
function update() {
  if(selected.id==='synrad2d')return;
  const state=states[selected.id];
  for(const c of selected.controls){const box=$(`control-${c.key}`).closest('.control');box.hidden=!!c.showWhen&&state[c.showWhen.key]!==c.showWhen.value;}
  for(const c of selected.controls)if(!c.options&&c.type!=='checkbox'){const value=state[c.key];const decimals=String(c.step).split('.')[1]?.length??0;set(`value-${c.key}`,`${fmt(value,decimals)} ${c.unit}`.trim());const input=$(`control-${c.key}`);input.setAttribute('aria-valuetext',`${fmt(value,decimals)} ${c.unit}`);if(c.scale){input.setAttribute('aria-valuemin',c.min);input.setAttribute('aria-valuemax',c.max);input.setAttribute('aria-valuenow',value);}}
  const sourceView=getView(selected.id,state),view=prepareChartScales(sourceView,plotScales[selected.id]);
  const lobes=selected.id==='cavity';
  document.querySelector('.chart-scale-controls').hidden=lobes;
  $('chart-legend').hidden=lobes;
  for(const axis of ['x','y'])for(const scale of ['linear','log'])$(`${axis}-${scale}`).setAttribute('aria-pressed',String((axis==='x'?view.logX:view.logY)===(scale==='log')));
  const signed=sourceView.xRange[0]<0;$('x-log').textContent=signed?'Sym log':'Log';
  set('chart-scale-note',view.symlogX?'Sym log keeps ± angles and zero; linear near zero.':view.logX&&sourceView.xRange[0]===0?'X = 0 is omitted on a log axis.':'');
  set('chart-title',lobes?'Particle frame and laboratory frame':view.title);set('chart-badge',lobes?'LONGITUDINAL LOBES':view.badge);set('chart-caption',lobes?'Instantaneous comparison at the entrance energy. Surface radius represents angular power, independently normalized to each frame’s peak. The lab surface uses the labelled transverse magnification; these surfaces are not photon paths. At zero energy gain both are reference shapes, with radiation off.':view.caption);set('equation',view.equation??selected.equation);set('equation-note',view.note);
  if(lobes)drawCavityLobes($('chart'),state);else drawChart($('chart'),view);
  legend($('chart-legend'),view.traces.map(t=>[t.name,t.color]));legend($('scene-legend'),view.legend);
  $('metrics').replaceChildren(...view.metrics.map(m=>{const div=document.createElement('div');div.className='metric';const name=document.createElement('span');name.className='metric-name';name.textContent=m.name;const value=document.createElement('span');value.className='metric-value';value.textContent=m.value;div.append(name,value);return div;}));
  draw();
}
function draw(){
  if(selected.id==='spectrum'||selected.id==='synrad2d')return;
  if(hasPhotonSimulation(selected.id)){
    const state=states[selected.id];
    renderMonteCarlo(ctx,900,400,selected.id,state,time)||renderPhotonSimulation(ctx,900,400,selected.id,state,time);
    const run=getPhotonSimulation(selected.id,state),progress=$('photon-progress');
    progress.max=run.target;progress.value=run.n;
    const status=run.n===run.target?'Complete':paused?'Paused':'Running';
    set('photon-progress-status',`${Math.floor(100*run.n/run.target)}% · ${status}`);
    progress.setAttribute('aria-valuetext',`${run.n.toLocaleString('en-US')} of ${run.target.toLocaleString('en-US')} photons traced. ${status}.`);
    return;
  }
  ctx.clearRect(0,0,900,400);ctx.fillStyle='#101d29';ctx.fillRect(0,0,900,400);
  ctx.strokeStyle='#7a9eab0b';ctx.lineWidth=1;
  for(let x=0;x<900;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,400);ctx.stroke();}
  for(let y=0;y<400;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke();}
  renderCavity(ctx,900,400,selected.id,states[selected.id],time)||renderMagnet(ctx,900,400,selected.id,states[selected.id],time)||renderSource(ctx,900,400,selected.id,states[selected.id],time)||renderMaterial(ctx,900,400,selected.id,states[selected.id],time);
}

function setPaused(value){paused=value;$('pause').textContent=paused?'▶ Play':'Ⅱ Pause';$('pause').setAttribute('aria-pressed',String(paused));set('scene-label',paused?'EXPERIMENT PAUSED':hasPhotonSimulation(selected.id)?'TRACING PHOTONS':'LIVE EXPERIMENT');}
$('pause').addEventListener('click',()=>{setPaused(!paused);update();});
$('scene-zoom').addEventListener('click',()=>{
  const enlarged=$('scene-viewport').classList.toggle('enlarged');
  $('scene-zoom').setAttribute('aria-pressed',String(enlarged));
  set('scene-zoom',enlarged?'Fit':'Enlarge');
  $('scene-pan-hint').hidden=!enlarged;
});
function resetExperiment(){delete plotScales[selected.id];states[selected.id]=Object.fromEntries(selected.controls.map(c=>[c.key,c.default]));if('energy'in states[selected.id])sharedEnergy=3;select(selected.id);}
$('reset').addEventListener('click',resetExperiment);$('chart-reset').addEventListener('click',resetExperiment);
for(const axis of ['x','y'])for(const scale of ['linear','log'])$(`${axis}-${scale}`).addEventListener('click',()=>{plotScales[selected.id]={...plotScales[selected.id],[axis]:scale};update();});
$('next').addEventListener('click',()=>{const tabs=[synrad2d,...experiments];location.hash=tabs[(tabs.indexOf(selected)+1)%tabs.length].id;});
$('about-synrad2d').addEventListener('click',()=>$('about').close());
$('about-button').addEventListener('click',()=>$('about').showModal());$('close-about').addEventListener('click',()=>$('about').close());
$('about').addEventListener('click',e=>{if(e.target===$('about')){const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close();}});
window.addEventListener('hashchange',()=>select(location.hash.slice(1)));
let chartWidth=0;
new ResizeObserver(([entry])=>{
  const width=Math.round(entry.contentRect.width);
  if(width!==chartWidth){chartWidth=width;update();}
}).observe($('chart'));
window.addEventListener('keydown',e=>{if(!['spectrum','synrad2d'].includes(selected.id)&&e.code==='Space'&&!['INPUT','SELECT','BUTTON','A','TEXTAREA'].includes(document.activeElement.tagName)&&!$('about').open){e.preventDefault();setPaused(!paused);update();}});
let lastSamplePlotUpdate=0;
function tick(now){if(!paused&&!document.hidden)time+=last?Math.min((now-last)/1000,.05):0;last=now;if(!paused&&!document.hidden){draw();if(['monte-carlo','polarization'].includes(selected.id)&&now-lastSamplePlotUpdate>=100){lastSamplePlotUpdate=now;update();}}requestAnimationFrame(tick);}
select(location.hash.slice(1));setPaused(paused);requestAnimationFrame(tick);
