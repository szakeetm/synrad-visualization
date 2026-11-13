// GPL-3.0-only. Ideal on-axis DC gap: c=m=1, dp/dt=F, dγ/dx=F.
// No RF phase, fringe fields, focusing, or radiation reaction is modeled.
export function createCavityPath({beta, gain=8, viewWidth=12, edgeMargin=.2}) {
  gain=Math.max(0,Math.min(20,gain));
  const entryX=-viewWidth/4, exitX=viewWidth/4, length=exitX-entryX;
  const initialGamma=1/Math.sqrt(1-beta*beta), initialP=initialGamma*beta;
  const finalGamma=initialGamma+gain, finalP=Math.sqrt(finalGamma*finalGamma-1);
  const maxBeta=finalP/finalGamma, force=gain/length;
  const entryTime=(entryX+viewWidth/2)/beta;
  const transit=gain===0?length/beta:(finalP-initialP)/force;
  const exitTime=entryTime+transit;
  const duration=exitTime+(viewWidth/2+edgeMargin-exitX)/maxBeta;
  function atX(x){
    const gamma=initialGamma+force*Math.max(0,Math.min(length,x-entryX));
    return {x,y:0,vx:Math.sqrt(1-1/(gamma*gamma)),vy:0,gamma,
      ax:x>entryX&&x<exitX?force/gamma**3:0};
  }
  function state(time){
    if(time<=entryTime)return atX(-viewWidth/2+beta*time);
    if(time>=exitTime)return atX(exitX+maxBeta*(time-exitTime));
    if(force===0)return atX(entryX+beta*(time-entryTime));
    const p=initialP+force*(time-entryTime), gamma=Math.hypot(1,p);
    // Rationalized gamma difference avoids cancellation at small energy gain.
    const x=entryX+(p-initialP)*(p+initialP)/(force*(gamma+initialGamma));
    return atX(x);
  }
  return {entryX,exitX,entryTime,exitTime,duration,state,atX,count:1,maxBeta,force,initialGamma,finalGamma};
}

// Instantaneous emitted power per solid angle, per source time, a parallel v:
// dP/dΩ ∝ sin²θ/(1-β cosθ)^5 (Jackson, Classical Electrodynamics §14.2).
// Each curve is normalized to its own maximum; radial length is power, not field.
export function longitudinalPeakAngle(gamma){
  const beta=Math.sqrt(1-1/(gamma*gamma));
  const cosine=5*beta/(Math.sqrt(1+15*beta*beta)+1);
  // Stable at large gamma, using 1-cos²θ from the extremum equation.
  return Math.acos(Math.min(1,cosine));
}
export function longitudinalPattern(theta,gamma){
  const beta=Math.sqrt(1-1/(gamma*gamma)),peak=longitudinalPeakAngle(gamma);
  const denominator=a=>1/(gamma*gamma*(1+beta))+2*beta*Math.sin(a/2)**2;
  return Math.sin(theta)**2/Math.sin(peak)**2*(denominator(peak)/denominator(theta))**5;
}
