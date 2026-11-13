// Quadratic travel in rapidity (eta = acosh gamma, beta = tanh eta) eases
// speed changes near rest while retaining the full high-energy range.
export function controlPosition(value,control){
  if(control.scale==='quadratic')return 1000*Math.sqrt(Math.max(0,Math.min(1,(value-control.min)/(control.max-control.min))));
  if(control.scale==='log')return 1000*Math.log(value/control.min)/Math.log(control.max/control.min);
  if(control.scale!=='rapidity')return value;
  const low=Math.acosh(control.min),high=Math.acosh(control.max);
  return 1000*Math.sqrt((Math.acosh(Math.max(control.min,Math.min(control.max,value)))-low)/(high-low));
}
export function controlValue(position,control){
  if(control.scale==='quadratic')return control.min+(control.max-control.min)*(Math.max(0,Math.min(1000,position))/1000)**2;
  if(control.scale==='log'){
    if(position<=0)return control.min;if(position>=1000)return control.max;
    const value=control.min*(control.max/control.min)**(position/1000);
    return control.integer?Math.round(value):value;
  }
  if(control.scale!=='rapidity')return position;
  if(position<=0)return control.min;
  if(position>=1000)return control.max;
  const low=Math.acosh(control.min),high=Math.acosh(control.max);
  return Math.cosh(low+(high-low)*(position/1000)**2);
}
