// Angular-power surfaces inspired by slide 13. Radius represents dP/dΩ,
// independently peak-normalized in each frame, rather than photon position.
import { transverseRadiation, aberrate } from './physics.js';

const C = { ink: '#e3edf0', muted: '#8c9fa9', cyan: '#55d9d0', amber: '#f5bc70', purple: '#b5a0ff' };
const TAU = 2 * Math.PI;
const project = ([x,y,z]) => [-.6*x-.8*z, -.4666667*x-.8122329*y+.35*z, -.6497863*x+.5833334*y+.4873397*z];
function text(ctx,label,x,y,color=C.muted,size=12,align='left') {
  ctx.fillStyle=color;ctx.font=`${size}px ui-sans-serif, system-ui, sans-serif`;ctx.textAlign=align;ctx.fillText(label,x,y);
}
function line(ctx,points,color,width=1,dash=[]) {
  ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);
}
function arrow(ctx,from,to,color,width=1.8) {
  const a=Math.atan2(to[1]-from[1],to[0]-from[0]);
  line(ctx,[from,to],color,width);
  line(ctx,[[to[0]-7*Math.cos(a-.45),to[1]-7*Math.sin(a-.45)],to,[to[0]-7*Math.cos(a+.45),to[1]-7*Math.sin(a+.45)]],color,width);
}
function normal(a,b,c) {
  const u=b.map((v,i)=>v-a[i]),v=c.map((p,i)=>p-a[i]);
  const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const size=Math.hypot(...n)||1;return n.map(x=>x/size);
}

function mesh(gamma) {
  const rows=64,columns=48,vertices=[];
  for(let i=0;i<=rows;i++) {
    // Sampling evenly in the rest frame resolves the lab cone even at γ=30.
    const theta=aberrate(i*Math.PI/rows,gamma),ring=[];
    for(let j=0;j<=columns;j++) {
      const phi=j*TAU/columns,r=transverseRadiation(theta,phi,gamma);
      const world=[r*Math.sin(theta)*Math.cos(phi),r*Math.sin(theta)*Math.sin(phi),r*Math.cos(theta)];
      ring.push({world,screen:project(world)});
    }
    vertices.push(ring);
  }
  const faces=[];
  for(let i=0;i<rows;i++)for(let j=0;j<columns;j++) {
    const points=[vertices[i][j],vertices[i+1][j],vertices[i+1][j+1],vertices[i][j+1]];
    const first=normal(points[0].world,points[1].world,points[2].world);
    const n=Math.hypot(...first)>1e-12?first:normal(points[0].world,points[2].world,points[3].world);
    const shade=.3+.7*Math.abs(n[0]*-.35+n[1]*-.55+n[2]*.76);
    faces.push({points,depth:points.reduce((a,p)=>a+p.screen[2],0)/4,shade,wire:i%4===0||j%4===0});
  }
  return faces.sort((a,b)=>a.depth-b.depth);
}
function paintSurface(ctx,faces,cx,cy,scale,lab) {
  for(const face of faces) {
    ctx.beginPath();face.points.forEach((p,i)=>{const x=cx+scale*p.screen[0],y=cy+scale*p.screen[1];i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();
    const shade=face.shade;
    ctx.fillStyle=lab?`rgb(${Math.round(111+133*shade)},${Math.round(91+100*shade)},${Math.round(45+59*shade)})`:`rgb(${Math.round(37+69*shade)},${Math.round(102+102*shade)},${Math.round(98+92*shade)})`;
    ctx.fill();
    // Sparse mesh lines reveal curvature without obscuring the filled surface.
    ctx.strokeStyle=face.wire?(lab?'#4f47298a':'#1c5d617a'):ctx.fillStyle;
    ctx.lineWidth=face.wire?.65:.35;ctx.stroke();
  }
}
let restCache,labCache;
function surface(gamma,lab) {
  const previous=lab?labCache:restCache;if(previous?.gamma===gamma)return previous;
  const faces=mesh(gamma),result={gamma,faces,image:null};
  if(typeof document!=='undefined') {
    const image=document.createElement('canvas');image.width=800;image.height=600;
    const ctx=image.getContext('2d');ctx.scale(2,2);paintSurface(ctx,faces,200,150,120,lab);result.image=image;
  }
  if(lab)labCache=result;else restCache=result;return result;
}
function orbit(ctx,cx,cy) {
  const points=[];
  for(let i=0;i<=80;i++) {
    const a=-1.5+i*3/80,p=project([110*(1-Math.cos(a)),0,110*Math.sin(a)]);
    points.push([cx+p[0],cy+p[1]]);
  }
  line(ctx,points,'#8c9fa99a',1.3,[6,5]);
  text(ctx,'orbit',cx-2,cy-101,C.muted,10);
}
function panel(ctx,cx,cy,gamma,lab,time) {
  orbit(ctx,cx,cy);
  const cached=surface(gamma,lab);
  ctx.save();ctx.globalAlpha=.97+.03*Math.sin(time*1.5);
  if(cached.image)ctx.drawImage(cached.image,cx-200,cy-150,400,300);
  else paintSurface(ctx,cached.faces,cx,cy,120,lab);
  ctx.restore();
  const accel=project([76,0,0]),forward=project([0,0,86]);
  arrow(ctx,[cx,cy],[cx+accel[0],cy+accel[1]],C.purple,2.2);
  text(ctx,'a',cx+accel[0]-10,cy+accel[1]-6,C.purple,15);
  if(lab&&gamma>1) {
    arrow(ctx,[cx,cy],[cx+forward[0],cy+forward[1]],C.ink,1.7);
    text(ctx,'v',cx+forward[0]+3,cy+forward[1]+18,C.ink,14);
  }else if(lab)text(ctx,'v = 0',cx-72,cy+45,C.ink,12);
  ctx.save();ctx.fillStyle=C.ink;ctx.shadowColor=lab?C.amber:C.cyan;ctx.shadowBlur=15;
  ctx.beginPath();ctx.arc(cx,cy,4,0,TAU);ctx.fill();ctx.restore();
  text(ctx,lab?'LAB FRAME':'PARTICLE FRAME',cx,65,lab?C.amber:C.cyan,12,'center');
  text(ctx,lab?`γ = ${gamma.toFixed(gamma<1.1?4:3)} · β = ${Math.sqrt(1-1/gamma**2).toFixed(3)}`:'Instantaneous rest frame · v′ = 0',cx,86,C.muted,11,'center');
  text(ctx,lab?(gamma===1?'At γ = 1 the two patterns agree':'Power concentrates along the velocity'):'Radiation is strongest perpendicular to a',cx,354,C.ink,12,'center');
  if(lab)text(ctx,gamma<2?'No narrow relativistic cone':`Characteristic angle ∼ 1/γ = ${(180/Math.PI/gamma).toFixed(1)}°`,cx,374,C.muted,10,'center');
  else text(ctx,'Dipole angular pattern · broad in both directions',cx,374,C.muted,10,'center');
}

export function renderFrames(ctx,w,h,state,time) {
  const gamma=state.gammaDemo??5;
  ctx.save();ctx.scale(w/900,h/400);
  text(ctx,'A broad dipole pattern becomes a forward lobe',28,29,C.ink,14);
  text(ctx,'Like lecture slide 13 · fixed camera',872,29,C.muted,10,'right');
  line(ctx,[[450,63],[450,366]],'#2a3f49');
  panel(ctx,235,215,1,false,time);panel(ctx,665,215,gamma,true,time);
  text(ctx,'Surface radius = angular power / own peak · not a photon trajectory',450,396,C.muted,10,'center');
  ctx.restore();
}
