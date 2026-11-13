import {longitudinalPattern, longitudinalPeakAngle} from './cavity.js';
// GPL-3.0-only. A polar planar slice of the axisymmetric angular power pattern.
export function drawCavityPattern(ctx,sim,w){
  const gamma=sim.particle.gamma, path=sim.path;
  const active=path.force>0&&sim.time>path.entryTime&&sim.time<path.exitTime;
  const width=Math.min(520,w-32),left=(w-width)/2,top=8,height=194;
  ctx.fillStyle='#07171ded';ctx.fillRect(left,top,width,height);
  ctx.strokeStyle='#28454b';ctx.lineWidth=1;ctx.strokeRect(left,top,width,height);
  ctx.textAlign='left';ctx.font='10px monospace';ctx.fillStyle='#b9d5cc';
  ctx.fillText('LONGITUDINAL ACCELERATION · a ∥ v',left+12,top+20);
  const panels=[{g:1,label:'PARTICLE REST FRAME',color:'#9eafa5'},
    {g:gamma,label:`LAB FRAME · γ ${gamma.toFixed(2)}`,color:'#f0ca82'}];
  const radius=Math.min(57,width*.16),cy=top+96;
  panels.forEach((p,i)=>{
    const cx=left+width*(i===0?.24:.72);
    ctx.strokeStyle='#35535c';ctx.lineWidth=.7;ctx.beginPath();
    ctx.moveTo(cx-radius-5,cy);ctx.lineTo(cx+radius+10,cy);
    ctx.moveTo(cx,cy-radius);ctx.lineTo(cx,cy+radius);ctx.stroke();
    ctx.fillStyle='#73908d';ctx.font='9px monospace';ctx.textAlign='center';
    ctx.fillText('+x →',cx+radius-4,cy+17);
    ctx.beginPath();
    // Uniform rest-frame angle samples resolve the narrow lab cone at high γ.
    const beta=Math.sqrt(1-1/p.g**2);
    for(let j=0;j<=720;j++){
      const rest=2*Math.PI*j/720;
      const theta=Math.atan2(Math.sin(rest)/p.g,Math.cos(rest)+beta);
      const r=radius*longitudinalPattern(theta,p.g);
      const x=cx+r*Math.cos(theta),y=cy-r*Math.sin(theta);
      if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();ctx.fillStyle=p.color+'28';ctx.fill();
    ctx.strokeStyle=p.color;ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle=p.color;ctx.font='8px monospace';ctx.fillText(p.label,cx,top+166);
  });
  ctx.textAlign='left';ctx.font='9px monospace';ctx.fillStyle='#9db8b1';
  const peak=longitudinalPeakAngle(gamma)*180/Math.PI;
  ctx.fillText(`Lab peak ±${peak.toFixed(2)}° · dark forward axis`,left+12,top+36);
  ctx.fillStyle=active?'#f0ca82':'#829692';
  ctx.fillText(active?'RADIATING IN GAP':'DRIFT · reference shape; radiation off',left+12,top+184);
}
