const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs,text)=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs??{}))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
const nice=n=>n===0?'0':Math.abs(n)>=1e6||Math.abs(n)<.001?n.toExponential(0):Math.abs(n)>=1000?`${Number((n/1000).toPrecision(3))}k`:Number(n.toPrecision(3)).toString();

export function chartYFraction(value,range,logarithmic=false) {
  return logarithmic
    ? (Math.log10(Math.max(value,Number.MIN_VALUE))-Math.log10(range[0]))/(Math.log10(range[1])-Math.log10(range[0]))
    : (value-range[0])/(range[1]-range[0]);
}

export function drawChart(container,view) {
  const w=760,h=250,m={l:62,r:20,t:25,b:48},pw=w-m.l-m.r,ph=h-m.t-m.b;
  const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':`${view.title}. X axis: ${view.xLabel}. Y axis: ${view.yLabel}.`});
  svg.append(el('title',{},view.title),el('desc',{},view.caption));
  const tx=x=>m.l+pw*(view.logX?(Math.log10(x)-Math.log10(view.xRange[0]))/(Math.log10(view.xRange[1])-Math.log10(view.xRange[0])):(x-view.xRange[0])/(view.xRange[1]-view.xRange[0]));
  const ty=y=>m.t+ph*(1-chartYFraction(y,view.yRange,view.logY));
  const yTicks=view.logY?Array.from({length:Math.floor(Math.log10(view.yRange[1]))-Math.ceil(Math.log10(view.yRange[0]))+1},(_,i)=>10**(Math.ceil(Math.log10(view.yRange[0]))+i)):[0,.25,.5,.75,1];
  for(const y of yTicks) {
    svg.append(el('line',{x1:m.l,y1:ty(y),x2:w-m.r,y2:ty(y),stroke:'#e7eeeb','stroke-width':1}));
    svg.append(el('text',{x:m.l-11,y:ty(y)+3,'text-anchor':'end',fill:'#94a5a8','font-size':10},nice(y)));
  }
  const ticks=view.logX?Array.from({length:Math.floor(Math.log10(view.xRange[1])-Math.log10(view.xRange[0]))+1},(_,i)=>10**(Math.log10(view.xRange[0])+i)):Array.from({length:5},(_,i)=>view.xRange[0]+(view.xRange[1]-view.xRange[0])*i/4);
  for(const x of ticks) {
    svg.append(el('line',{x1:tx(x),x2:tx(x),y1:m.t,y2:h-m.b,stroke:'#edf1ef','stroke-width':1,'stroke-dasharray':'2 4'}));
    svg.append(el('text',{x:tx(x),y:h-m.b+18,'text-anchor':'middle',fill:'#94a5a8','font-size':10},nice(x)));
  }
  const defs=el('defs'),clip=el('clipPath',{id:'plot-clip'});clip.append(el('rect',{x:m.l,y:m.t,width:pw,height:ph+1}));defs.append(clip);
  const gradient=el('linearGradient',{id:'plot-fill',x1:'0',y1:'0',x2:'0',y2:'1'});gradient.append(el('stop',{offset:'0%','stop-color':'#208f86','stop-opacity':'.15'}),el('stop',{offset:'100%','stop-color':'#208f86','stop-opacity':'.01'}));defs.append(gradient);svg.append(defs);
  const data=el('g',{'clip-path':'url(#plot-clip)'});
  view.traces.forEach((tr,i)=>{
    const path=tr.points.map(([x,y],j)=>`${j?'L':'M'}${tx(x).toFixed(2)},${ty(y).toFixed(2)}`).join(' ');
    if(i===0&&!view.logY)data.append(el('path',{d:`${path} L${tx(tr.points.at(-1)[0])},${ty(0)} L${tx(tr.points[0][0])},${ty(0)} Z`,fill:'url(#plot-fill)'}));
    data.append(el('path',{d:path,fill:'none',stroke:tr.color,'stroke-width':i===0?2.3:1.7,'stroke-linejoin':'round',...(tr.dashed?{'stroke-dasharray':'5 5'}:{})}));
  });svg.append(data);
  for(const marker of view.markers)if(marker.x>=view.xRange[0]&&marker.x<=view.xRange[1]) {
    const x=tx(marker.x);svg.append(el('line',{x1:x,x2:x,y1:m.t,y2:h-m.b,stroke:marker.color,'stroke-width':1,'stroke-dasharray':'4 4'}));
    const right=x>w-140;svg.append(el('text',{x:x+(right?-5:5),y:14,'text-anchor':right?'end':'start',fill:marker.color,'font-size':10},marker.label));
  }
  svg.append(el('text',{x:m.l+pw/2,y:h-6,'text-anchor':'middle',fill:'#81969a','font-size':10},view.xLabel));
  svg.append(el('text',{transform:`translate(12 ${m.t+ph/2}) rotate(-90)`,'text-anchor':'middle',fill:'#81969a','font-size':10},view.yLabel));
  container.replaceChildren(svg);
}
