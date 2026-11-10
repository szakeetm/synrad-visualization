// Uniform rapidity (eta = acosh gamma) gives beta = tanh eta, resolving the
// near-rest transition smoothly while remaining logarithmic in gamma at high energy.
export function controlPosition(value,control){
  if(control.scale==='log')return 1000*Math.log(value/control.min)/Math.log(control.max/control.min);
  if(control.scale!=='rapidity')return value;
  const low=Math.acosh(control.min),high=Math.acosh(control.max);
  return 1000*(Math.acosh(Math.max(control.min,Math.min(control.max,value)))-low)/(high-low);
}
export function controlValue(position,control){
  if(control.scale==='log'){
    if(position<=0)return control.min;if(position>=1000)return control.max;
    return control.min*(control.max/control.min)**(position/1000);
  }
  if(control.scale!=='rapidity')return position;
  if(position<=0)return control.min;
  if(position>=1000)return control.max;
  const low=Math.acosh(control.min),high=Math.acosh(control.max);
  return Math.cosh(low+(high-low)*position/1000);
}
