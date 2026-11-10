import {createCavityModel,cavityPeak} from './cavity-physics.js';

const C={cyan:'#55d9d0',amber:'#f5bc70',purple:'#b5a0ff',ink:'#e3edf0',muted:'#8c9fa9',wall:'#a99b7e',grid:'#38515c'};
const TAU=2*Math.PI;
function text(ctx,value,x,y,color=C.muted,size=11,align='left'){
  ctx.fillStyle=color;ctx.font=`${size}px system-ui, sans-serif`;ctx.textAlign=align;ctx.fillText(value,x,y);
}
function line(ctx,points,color,width=1,dash=[]){
  ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);
  points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.setLineDash([]);
}
function dot(ctx,x,y,r,color){
  ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=color;ctx.fill();
}

export function renderCavity(ctx,w,h,id,state,time){
  if(id!=='cavity')return false;
  const model=createCavityModel(state),t=(time*.45)%model.cycle,p=model.state(t);
  const scale=500,axis=210,sx=x=>115+scale*x,sy=r=>axis-scale*r;
  const accelerating=model.gain>0&&t>model.entryTime&&t<model.exitTime;
  const energy=model.energyGeV*p.gamma/model.gammaIn;
  const peakSpread=Math.tan(cavityPeak(model.gammaIn))*1e6;
  const micron=value=>value>=1e5?value.toExponential(2):value.toLocaleString('en-US',{maximumFractionDigits:2});
  ctx.save();ctx.scale(w/900,h/400);
  text(ctx,'Radiation packets move outward; field lines are not shown',30,28,C.ink,14);
  text(ctx,'Meridional section · equal distance scales on both axes',30,48,C.muted,10);
  text(ctx,`γ = ${p.gamma>=1e4?p.gamma.toExponential(3):p.gamma.toFixed(2)}  ·  ${accelerating?'ACCELERATING':'DRIFT'}`,870,28,accelerating?C.cyan:C.muted,12,'right');
  text(ctx,`${energy.toLocaleString('en-US',{maximumSignificantDigits:6})} GeV`,870,48,C.ink,12,'right');

  // The wall is the identical polygon used by the first-hit ray tracer.
  ctx.beginPath();
  model.wall.forEach((q,i)=>i?ctx.lineTo(sx(q.x),sy(q.r)):ctx.moveTo(sx(q.x),sy(q.r)));
  for(let i=model.wall.length-1;i>=0;i--)ctx.lineTo(sx(model.wall[i].x),sy(-model.wall[i].r));
  ctx.closePath();ctx.fillStyle='#f5bc7005';ctx.fill();
  for(const side of [-1,1])line(ctx,model.wall.map(q=>[sx(q.x),sy(side*q.r)]),C.wall,2.4);
  line(ctx,[[40,axis],[805,axis]],C.grid,.8,[4,5]);
  for(const x of [0,1]){
    line(ctx,[[sx(x),axis-29],[sx(x),axis+29]],'#55d9d02f',1,[3,4]);
    text(ctx,x===0?'gap entrance':'gap exit',sx(x),axis+55,C.muted,10,'center');
  }

  // Only compact arrows are drawn near the axis; they describe the applied force,
  // whereas the amber packet trails describe the radiation travel direction.
  if(model.gain>0)for(const side of [-1,1])for(const x of [.3,.5,.7]){
    const y=axis+side*42,ex=sx(x)+16;
    line(ctx,[[sx(x)-16,y],[ex,y],[ex-5,y-3]],'#55d9d046',1);
    line(ctx,[[ex,y],[ex-5,y+3]],'#55d9d046',1);
  }
  if(model.gain>0)text(ctx,'force on electron →',sx(.5),axis-60,C.cyan,10,'center');

  const downstream=sx(1.3),portHalf=Math.max(17,scale*model.a+8);
  line(ctx,[[downstream,axis-portHalf],[downstream,axis+portHalf]],'#f5bc7088',1.5,[3,4]);
  text(ctx,'downstream port',downstream+15,axis-31,C.amber,10);
  text(ctx,'x = 1.3 m',downstream+15,axis-15,C.muted,10);
  text(ctx,'+x →',819,axis+5,C.muted,11);

  ctx.save();
  ctx.beginPath();ctx.rect(22,58,856,316);ctx.clip();
  for(const packet of model.packets){
    const age=t-packet.time;if(age<0)continue;
    // Keep transmitted packets visible beyond the observation plane so that
    // downstream escape is seen as continued outward motion, not disappearance.
    const beyondPort=packet.outcome==='downstream'?.25:packet.outcome==='upstream'?.1:0;
    if(age<=packet.distance+beyondPort){
      const x=packet.x+age*packet.dx,r=age*packet.dr;
      if(x<-.18||x>1.52)continue;
      const tail=Math.min(.018,age);
      line(ctx,[[sx(x-tail*packet.dx),sy(r-tail*packet.dr)],[sx(x),sy(r)]],'#f5bc7066',1);
      dot(ctx,sx(x),sy(r),1.7,C.amber);
    }else if(packet.outcome==='wall'&&age-packet.distance<.15){
      const fade=1-(age-packet.distance)/.15;
      ctx.globalAlpha=fade;
      dot(ctx,sx(packet.hitX),sy(packet.hitR),2.5+2*(1-fade),C.purple);
      ctx.globalAlpha=1;
    }
  }
  if(p.x>=-.15&&p.x<=1.3){
    ctx.shadowColor=C.cyan;ctx.shadowBlur=12;
    dot(ctx,sx(p.x),axis,4.5,C.cyan);ctx.shadowBlur=0;
  }
  ctx.restore();

  text(ctx,`Free-space peak spread at 1 m: ${micron(peakSpread)} µm`,sx(.5),284,C.amber,11,'center');
  text(ctx,`Beam-pipe aperture radius: ${micron(model.a*1e6)} µm`,sx(.5),301,C.muted,10,'center');

  // Packet centers follow true light-speed paths, with a constant display clock
  // shared by the source. Each paired meridional dot represents half a ring.
  text(ctx,model.gain===0?'Zero energy gain: no acceleration and no emitted packets.':'Amber: equal-energy packets · purple: absorbed at first wall contact',30,366,C.ink,11);
  text(ctx,'Packet centers at true scale · dot sizes enlarged · representative energy rings · light speed slowed',30,389,C.muted,10);
  ctx.restore();return true;
}
