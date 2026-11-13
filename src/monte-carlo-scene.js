import {simulateMonteCarlo} from './monte-carlo.js';

const colors={absorbed:'#f17e80',reflected:'#f5bc70',scattered:'#b5a0ff'};
export function renderMonteCarlo(ctx,w,h,id,state,time){
  if(id!=='monte-carlo')return false;
  const model=simulateMonteCarlo(state);
  ctx.save();ctx.scale(w/900,h/400);
  ctx.fillStyle='#263b4b';ctx.fillRect(60,285,780,70);
  ctx.strokeStyle='#7891a2';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(60,285);ctx.lineTo(840,285);ctx.stroke();
  ctx.font='13px system-ui, sans-serif';ctx.fillStyle='#b4c9d1';
  ctx.fillText('Synchrotron photon fan',60,53);
  ctx.fillText('Surface · one random interaction per photon',80,333);
  ctx.textAlign='right';ctx.fillText('Open region · reflected and scattered photons escape',840,80);
  ctx.fillStyle='#8cabb9';
  ctx.fillText(`Showing first ${model.paths.length} of ${model.n.toLocaleString('en-US')} test photons`,840,380);
  ctx.textAlign='left';
  for(const [index,path] of model.paths.entries()){
    const start=[90,110],hit=[290+path.position*300,285];
    let end=hit;
    if(path.outcome==='reflected'){
      // Reflect the incident direction about the horizontal surface normal.
      const distance=Math.min((835-hit[0])/(hit[0]-start[0]),(hit[1]-100)/(hit[1]-start[1]));
      end=[hit[0]+distance*(hit[0]-start[0]),hit[1]-distance*(hit[1]-start[1])];
    }
    if(path.outcome==='scattered'){
      const angle=.18+path.direction*(Math.PI-.36);
      const dx=Math.cos(angle),dy=-Math.sin(angle);
      const distance=Math.min((dx>0?835-hit[0]:65-hit[0])/dx,(100-hit[1])/dy);
      end=[hit[0]+distance*dx,hit[1]+distance*dy];
    }
    const color=colors[path.outcome];
    ctx.globalAlpha=model.n<=10?.5:.18;
    ctx.strokeStyle='#55d9d0';ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(...start);ctx.lineTo(...hit);ctx.stroke();
    ctx.strokeStyle=color;
    ctx.beginPath();ctx.moveTo(...hit);ctx.lineTo(...end);ctx.stroke();
    ctx.globalAlpha=.85;ctx.fillStyle=color;
    ctx.beginPath();ctx.arc(...hit,path.outcome==='absorbed'?3.5:2,0,Math.PI*2);ctx.fill();
    // Replay the sampled paths without adding new photons to the estimator.
    const progress=(time*.24+index/model.paths.length)%1;
    const incidentLength=Math.hypot(hit[0]-start[0],hit[1]-start[1]);
    const outgoingLength=Math.hypot(end[0]-hit[0],end[1]-hit[1]);
    const travelled=progress*(incidentLength+outgoingLength+80);
    if(travelled<incidentLength+outgoingLength){
      const incident=travelled<incidentLength;
      const a=incident?start:hit,b=incident?hit:end;
      const fraction=incident?travelled/incidentLength:(travelled-incidentLength)/outgoingLength;
      ctx.fillStyle=incident?'#55d9d0':color;
      ctx.beginPath();ctx.arc(a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction,3.5,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.restore();return true;
}
