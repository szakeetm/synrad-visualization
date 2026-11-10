import {createCavityModel,cavityPattern,cavityPeak} from './cavity-physics.js';
const NS='http://www.w3.org/2000/svg';
const project=([x,y,z])=>[.88*x+.48*z,-.28*x+.88*y+.3*z,-.42*x+.35*y+.83*z];
export function cavityLobeMesh(gamma,magnify=1){
  const vertices=[],faces=[],rows=64,columns=32,beta=Math.sqrt(1-1/gamma**2);
  for(let i=0;i<=rows;i++){
    const rest=Math.PI*i/rows;
    const theta=Math.atan2(Math.sin(rest)/gamma,Math.cos(rest)+beta);
    const r=i===0||i===rows?0:cavityPattern(theta,gamma),row=[];
    for(let j=0;j<=columns;j++){
      const phi=2*Math.PI*j/columns;
      row.push([r*Math.cos(theta),magnify*r*Math.sin(theta)*Math.cos(phi),magnify*r*Math.sin(theta)*Math.sin(phi)]);
    }
    vertices.push(row);
  }
  for(let i=0;i<rows;i++)for(let j=0;j<columns;j++){
    const points=[vertices[i][j],vertices[i+1][j],vertices[i+1][j+1],vertices[i][j+1]];
    const u=points[1].map((v,k)=>v-points[0][k]),v=points[3].map((v,k)=>v-points[0][k]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n)||1;
    const shade=.3+.7*Math.abs((-.3*n[0]-.5*n[1]+.8*n[2])/length);
    const screen=points.map(project);
    faces.push({screen,shade,depth:screen.reduce((sum,p)=>sum+p[2],0)/4,wire:i%8===0||j%8===0});
  }
  return {vertices,faces:faces.sort((a,b)=>a.depth-b.depth)};
}
function svgEl(tag,attrs={},text){
  const e=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))e.setAttribute(key,value);
  if(text!==undefined)e.textContent=text;return e;
}
function panel(gamma,lab,active){
  const magnify=lab?Math.max(1,gamma/2):1,figure=document.createElement('figure');
  const title=document.createElement('h3');title.textContent=lab?'Laboratory frame':'Instantaneous particle frame';figure.append(title);
  const svg=svgEl('svg',{viewBox:'0 0 400 280',role:'img','aria-label':`${lab?'Lab':'Particle'} frame longitudinal angular power lobe. ${lab?`Transverse dimensions magnified ${magnify.toFixed(0)} times.`:'Dipole torus with zero power along acceleration.'}`});
  const cx=lab?125:205,cy=130,scale=105;
  const point=p=>[cx+scale*p[0],cy+scale*p[1]];
  const axis=[point(project([-1.2,0,0])),point(project([1.7,0,0]))];
  svg.append(svgEl('line',{x1:axis[0][0],y1:axis[0][1],x2:axis[1][0],y2:axis[1][1],stroke:'#81959b','stroke-dasharray':'4 4'}));
  for(const face of cavityLobeMesh(gamma,magnify).faces){
    const color=lab?[Math.round(130+110*face.shade),Math.round(95+95*face.shade),Math.round(45+55*face.shade)]:[Math.round(30+65*face.shade),Math.round(110+95*face.shade),Math.round(100+90*face.shade)];
    const fill=`rgb(${color.join(',')})`;
    svg.append(svgEl('polygon',{points:face.screen.map(p=>point(p).join(',')).join(' '),fill,stroke:face.wire?(lab?'#584c32':'#28635f'):fill,'stroke-width':face.wire?.55:.3}));
  }
  svg.append(svgEl('circle',{cx,cy,r:3,fill:'#e3edf0'}));
  svg.append(svgEl('text',{x:axis[1][0],y:axis[1][1]-9,fill:'#c3d4d9','font-size':11,'text-anchor':'middle'},lab?'v, a →':'a →'));
  svg.append(svgEl('text',{x:200,y:245,fill:'#c3d4d9','font-size':12,'text-anchor':'middle'},lab?`γ = ${gamma.toLocaleString('en-US',{maximumFractionDigits:0})} · peak ${(cavityPeak(gamma)*1e6).toPrecision(3)} µrad`:'Broad dipole pattern · γ′ = 1'));
  svg.append(svgEl('text',{x:200,y:266,fill:'#9cb2bb','font-size':10,'text-anchor':'middle'},lab&&magnify>1?`Transverse dimensions ×${magnify.toLocaleString('en-US',{maximumFractionDigits:0})}`:'True angular geometry'));
  figure.append(svg);
  const note=document.createElement('p');note.textContent=lab
    ?magnify>1?'The actual cone is much thinner; transverse zoom reveals its shape.':'The lobe tilts forward as γ increases; the forward axis remains dark.'
    :'Zero radiation along the acceleration axis; maximum perpendicular to it.';
  if(!active)note.textContent+=' Reference shape only: acceleration is zero.';
  figure.append(note);return figure;
}
export function drawCavityLobes(container,state){
  const m=createCavityModel(state),grid=document.createElement('div');grid.className='cavity-lobes';
  grid.append(panel(1,false,m.gain>0),panel(m.gammaIn,true,m.gain>0));container.replaceChildren(grid);
}
