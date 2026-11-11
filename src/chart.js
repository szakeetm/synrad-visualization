const NS='http://www.w3.org/2000/svg';
const el=(tag,attrs,text)=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs??{}))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;};
const nice=n=>n===0?'0':Math.abs(n)>=1e6||Math.abs(n)<.001?Number(n.toPrecision(3)).toExponential():Math.abs(n)>=1000?`${Number((n/1000).toPrecision(3))}k`:Number(n.toPrecision(3)).toString();

export function axisFraction(value,range,logarithmic=false,symmetric=false) {
  if(logarithmic&&symmetric){
    const threshold=Math.max(Math.abs(range[0]),Math.abs(range[1]))/100;
    const transform=x=>Math.sign(x)*Math.log10(1+Math.abs(x)/threshold);
    return (transform(value)-transform(range[0]))/(transform(range[1])-transform(range[0]));
  }
  return logarithmic
    ? (Math.log10(Math.max(value,Number.MIN_VALUE))-Math.log10(range[0]))/(Math.log10(range[1])-Math.log10(range[0]))
    : (value-range[0])/(range[1]-range[0]);
}

export function axisTicks(range,logarithmic=false,symmetric=false) {
  if(logarithmic&&symmetric){
    const max=Math.max(Math.abs(range[0]),Math.abs(range[1]));
    return [-max,-max/10,-max/100,0,max/100,max/10,max].filter(x=>x>=range[0]&&x<=range[1]);
  }
  if(logarithmic){
    const first=Math.ceil(Math.log10(range[0])),last=Math.floor(Math.log10(range[1]));
    if(last<first)return range;
    const step=Math.max(1,Math.ceil((last-first)/9));
    return Array.from({length:Math.floor((last-first)/step)+1},(_,i)=>10**(first+i*step));
  }
  const target=(range[1]-range[0])/4,power=10**Math.floor(Math.log10(target));
  const step=[1,2,2.5,5,10].map(x=>x*power).reduce((best,x)=>Math.abs(x-target)<Math.abs(best-target)?x:best);
  const start=Math.ceil(range[0]/step)*step;
  return Array.from({length:Math.max(1,Math.floor((range[1]-start)/step+1e-10)+1)},(_,i)=>Number((start+i*step).toPrecision(12)));
}

export function prepareChartScales(source,overrides={}) {
  const logX=overrides.x?overrides.x==='log':!!source.logX;
  const logY=overrides.y?overrides.y==='log':!!source.logY;
  const symlogX=logX&&source.xRange[0]<0;
  let xRange=[...source.xRange],yRange=[...source.yRange];
  if(logX&&!symlogX&&xRange[0]<=0){
    const positive=source.traces.flatMap(t=>t.points.filter(p=>p[0]>0&&p[0]<=xRange[1]).map(p=>p[0]));
    xRange[0]=positive.length?Math.min(...positive):xRange[1]*1e-6;
  }else if(!logX&&source.logX&&xRange[0]>0)xRange[0]=0;
  const maxY=Math.max(...source.traces.flatMap(t=>t.points.map(p=>p[1])));
  if(logY&&yRange[0]<=0)yRange[0]=(maxY||yRange[1])*1e-6;
  if(!logY&&source.logY)yRange=[0,maxY>0?maxY*1.08:source.yRange[1]];
  return {...source,logX,logY,symlogX,xRange,yRange};
}

export function chartYFraction(value,range,logarithmic=false) {
  return axisFraction(value,range,logarithmic);
}

export function drawChart(container,view) {
  const markers=view.markers.filter(marker=>marker.x>=view.xRange[0]&&marker.x<=view.xRange[1]);
  const w=Math.min(760,container.clientWidth||760),h=w<500?300:250,m={l:62,r:20,t:25+14*Math.max(0,markers.length-1),b:48},pw=w-m.l-m.r,ph=h-m.t-m.b;
  const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':`${view.title}. X axis: ${view.xLabel} (${view.symlogX?'symmetric logarithmic':view.logX?'logarithmic':'linear'}). Y axis: ${view.yLabel} (${view.logY?'logarithmic':'linear'}).`});
  svg.append(el('title',{},view.title),el('desc',{},view.caption));
  const tx=x=>m.l+pw*axisFraction(x,view.xRange,view.logX,view.symlogX);
  const ty=y=>m.t+ph*(1-chartYFraction(y,view.yRange,view.logY));
  const yTicks=axisTicks(view.yRange,view.logY);
  for(const y of yTicks) {
    svg.append(el('line',{x1:m.l,y1:ty(y),x2:w-m.r,y2:ty(y),stroke:'#e7eeeb','stroke-width':1}));
    svg.append(el('text',{x:m.l-11,y:ty(y)+3,'text-anchor':'end',fill:'#94a5a8','font-size':10},nice(y)));
  }
  // Keep labels at their native font size and omit crowded ticks on narrow plots.
  const candidates=axisTicks(view.xRange,view.logX,view.symlogX);
  const ticks=[];
  for(const x of [...candidates].sort((a,b)=>(a===0?-1:b===0?1:a-b))) {
    if(ticks.every(t=>Math.abs(tx(t)-tx(x))>=48))ticks.push(x);
  }
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
  for(const [index,marker] of markers.entries()) {
    const x=tx(marker.x);svg.append(el('line',{x1:x,x2:x,y1:m.t,y2:h-m.b,stroke:marker.color,'stroke-width':1,'stroke-dasharray':'4 4'}));
    const right=x>w-140;svg.append(el('text',{x:x+(right?-5:5),y:14+14*index,'text-anchor':right?'end':'start',fill:marker.color,'font-size':10},marker.label));
  }
  svg.append(el('text',{x:m.l+pw/2,y:h-6,'text-anchor':'middle',fill:'#81969a','font-size':10},view.xLabel));
  svg.append(el('text',{transform:`translate(12 ${m.t+ph/2}) rotate(-90)`,'text-anchor':'middle',fill:'#81969a','font-size':10},view.yLabel));
  container.replaceChildren(svg);
}
