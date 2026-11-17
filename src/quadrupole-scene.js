import {getQuadrupoleModel,quadrupoleTransport,quadrupoleSnapshot} from './quadrupole-model.js';
import {quadrupoleField} from './physics.js';

const C={cyan:'#55d9d0',amber:'#f5bc70',purple:'#b5a0ff',ink:'#e3edf0',muted:'#8c9fa9',grid:'#293e49'};
function text(ctx,value,x,y,color=C.muted,size=11,align='left'){
  ctx.fillStyle=color;ctx.font=`${size}px system-ui, sans-serif`;ctx.textAlign=align;ctx.fillText(value,x,y);
}
function line(ctx,points,color,width=1,dash=[]){
  ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);
}
function dot(ctx,x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fillStyle=color;ctx.fill();}
const mm=value=>{const n=value*1000;return n>=1000?n.toExponential(1):n.toFixed(n<1?2:1);};

function entrance(ctx,model){
  const cx=107,cy=198,extent=Math.max(.003,Math.abs(model.state.offset)/1000+4*model.state.sigma/1000),scale=76/extent;
  text(ctx,'Entrance cross-section',24,79,C.ink,12);
  text(ctx,'x → · y ↑ · electrons along +z',24,97,C.muted,10);
  line(ctx,[[25,cy],[189,cy]],C.grid);line(ctx,[[cx,116],[cx,280]],C.grid);
  for(let ix=-2;ix<=2;ix++)for(let iy=-2;iy<=2;iy++){
    const x=ix*extent/3,y=iy*extent/3,field=quadrupoleField(model.state.gradient,x*1000,y*1000);
    if(!field.magnitude)continue;
    const size=Math.min(12,field.magnitude*800),dx=field.bx/field.magnitude*size,dy=-field.by/field.magnitude*size;
    const px=cx+x*scale,py=cy-y*scale,angle=Math.atan2(dy,dx);
    line(ctx,[[px,py],[px+dx,py+dy]],C.purple);
    line(ctx,[[px+dx-3*Math.cos(angle-.5),py+dy-3*Math.sin(angle-.5)],[px+dx,py+dy],[px+dx-3*Math.cos(angle+.5),py+dy-3*Math.sin(angle+.5)]],C.purple);
  }
  for(const track of model.tracks)dot(ctx,cx+track.initial.x*scale,cy-track.initial.y*scale,1.5,C.cyan);
  dot(ctx,cx,cy,2,C.ink);
  text(ctx,'Magnetic center',cx,299,C.ink,10,'center');
  text(ctx,`Window ±${mm(extent)} mm`,cx,318,C.muted,10,'center');
  text(ctx,'Purple arrows: magnetic field',24,344,C.purple,10);
  text(ctx,'Cyan: beam electrons',24,360,C.cyan,10);
}

function projection(ctx,model,snapshot,time,axis,cy){
  const x0=245,x1=626,halfHeight=45;
  const zx=z=>x0+(x1-x0)*z/model.targetZ;
  const paths=model.tracks.filter((_,i)=>i%8===0).map(track=>{
    const end=Math.min(model.targetZ,track.lossZ);
    return Array.from({length:81},(_,i)=>quadrupoleTransport(track.initial,model.state,end*i/80));
  });
  let extent=Math.max(.002,model.state.sigma/1000*4);
  for(const path of paths)for(const p of path)extent=Math.max(extent,Math.abs(p[axis])*1.1);
  for(const p of model.packets)extent=Math.max(extent,Math.abs(p.hit[axis])*1.1);
  const transverse=value=>cy-value/extent*halfHeight;
  const exit=zx(model.state.length);
  ctx.fillStyle='#b5a0ff0e';ctx.fillRect(x0,cy-halfHeight,exit-x0,2*halfHeight);
  line(ctx,[[x0,cy-halfHeight],[x0,cy+halfHeight]],C.purple);
  line(ctx,[[exit,cy-halfHeight],[exit,cy+halfHeight]],C.purple);
  line(ctx,[[x0,cy],[x1,cy]],C.grid,1,[3,4]);
  line(ctx,[[x1,cy-halfHeight-3],[x1,cy+halfHeight+3]],C.amber,2);
  if(model.aperture<extent)for(const side of [-1,1])line(ctx,[[x0,transverse(side*model.aperture)],[exit,transverse(side*model.aperture)]],C.muted,1,[2,4]);
  text(ctx,axis==='x'?'Horizontal · x focuses':'Vertical · y defocuses',232,cy-65,C.ink,12);
  text(ctx,`±${mm(extent)} mm`,626,cy-63,C.muted,10,'right');
  for(const path of paths){ctx.globalAlpha=.3;line(ctx,path.map(p=>[zx(p.z),transverse(p[axis])]),C.cyan);ctx.globalAlpha=1;}
  // Electrons and emitted packets use the identical longitudinal clock.
  for(let i=0;i<model.packets.length;i+=Math.max(1,Math.ceil(model.packets.length/24))){
    const packet=model.packets[i],track=model.tracks[packet.track],z=(time-packet.launch)*model.speed;
    if(z>=0&&z<=Math.min(track.lossZ,model.targetZ)){
      const p=quadrupoleTransport(track.initial,model.state,z);dot(ctx,zx(z),transverse(p[axis]),2,C.cyan);
    }
  }
  for(const p of snapshot.flying){
    const tail=Math.min((time-p.packet.birth)*model.speed,.025*model.targetZ);
    line(ctx,[[zx(p.z-tail*p.packet.direction.z),transverse(p[axis]-tail*p.packet.direction[axis])],[zx(p.z),transverse(p[axis])]],'#f5bc7077');
    dot(ctx,zx(p.z),transverse(p[axis]),2,C.amber);
  }
  for(const packet of model.packets){
    const age=time-packet.arrival;
    if(age>=0&&age<.25){ctx.globalAlpha=1-age/.25;dot(ctx,zx(packet.hit.z),transverse(packet.hit[axis]),3,packet.outcome==='wall'?C.purple:C.amber);ctx.globalAlpha=1;}
  }
  text(ctx,`Magnet ${model.state.length} m · drift ${model.state.targetDistance} m → target`,x0,cy+62,C.muted,10);
}

function target(ctx,model,snapshot){
  const x=677,y=124,size=190,cell=size/model.gridSize;
  text(ctx,'Target · accumulated SR',669,79,C.ink,12);
  text(ctx,'Front view · x → · y ↑',669,97,C.muted,10);
  ctx.fillStyle='#0b151f';ctx.fillRect(x,y,size,size);
  const denominator=Math.log1p(Math.max(10,model.packets.length/20));
  for(let row=0;row<model.gridSize;row++)for(let col=0;col<model.gridSize;col++){
    const count=snapshot.bins[row*model.gridSize+col];if(!count)continue;
    const intensity=Math.min(1,Math.log1p(count)/denominator);
    ctx.fillStyle=`rgba(245,188,112,${.2+.8*intensity})`;
    ctx.fillRect(x+col*cell,y+(model.gridSize-1-row)*cell,cell+.2,cell+.2);
  }
  ctx.strokeStyle=C.grid;ctx.lineWidth=1;ctx.strokeRect(x,y,size,size);
  line(ctx,[[x+size/2,y],[x+size/2,y+size]],'#8c9fa933',1,[2,4]);
  line(ctx,[[x,y+size/2],[x+size,y+size/2]],'#8c9fa933',1,[2,4]);
  text(ctx,`±${mm(model.extent)} mm on both axes`,x+size/2,335,C.muted,10,'center');
  text(ctx,`${snapshot.hits} hits · ${snapshot.intercepted} bore hits`,x+size/2,354,C.amber,11,'center');
  text(ctx,`${snapshot.flying.length} photons in flight`,x+size/2,373,C.muted,10,'center');
}

export function renderQuadrupole(ctx,w,h,state,time){
  const model=getQuadrupoleModel(state),snapshot=quadrupoleSnapshot(model,time);
  ctx.save();ctx.scale(w/900,h/400);
  text(ctx,'Quadrupole → photon flight → downstream target',24,27,C.ink,15);
  text(ctx,model.packets.length?'Equal-energy photon packets · tangent emission with SR angular spread':'Zero gradient: straight beam · no synchrotron radiation',24,47,C.muted,11);
  line(ctx,[[210,66],[210,377]],C.grid);line(ctx,[[650,66],[650,377]],C.grid);
  entrance(ctx,model);projection(ctx,model,snapshot,time,'x',161);projection(ctx,model,snapshot,time,'y',303);
  target(ctx,model,snapshot);
  text(ctx,'Flight slowed · transverse scales magnified independently · 25 mm bore radius · hits added on arrival',450,394,C.muted,10,'center');
  ctx.restore();return true;
}
