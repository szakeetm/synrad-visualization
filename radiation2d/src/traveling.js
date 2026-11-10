// GPL-3.0-only. A finite, planar insertion device in a fixed laboratory view.
export function createTravelingPath({beta, K, viewWidth = 12, periods = 3}) {
  const half = viewWidth / 2, entryX = -viewWidth / 4, exitX = viewWidth / 4;
  const length = exitX - entryX;
  const count = Math.max(1, Math.min(8, Math.round(periods)));
  const q = 2 * Math.PI * count / length;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const fraction = Math.min(.98, K / (gamma * beta));
  const root = Math.sqrt(1 - fraction * fraction);
  function atX(x) {
    if (x <= entryX || x >= exitX) return {x, y: 0, vx: beta, vy: 0};
    const theta = q * (x - entryX), transverse = fraction * Math.sin(theta);
    // Integral of dy/dx = transverse / sqrt(1-transverse^2).
    const y = (Math.asinh(fraction / root) - Math.asinh(fraction * Math.cos(theta) / root)) / q;
    return {x, y, vx: beta * Math.sqrt(1 - transverse * transverse), vy: beta * transverse};
  }
  const entryTime = (entryX + half) / beta;
  // Integrate dt/dx once. A monotonic table allows bounded, fast time inversion.
  const steps = count * 512, dx = length / steps;
  const times = new Float64Array(steps + 1);
  times[0] = entryTime;
  const inverseSpeed = x => 1 / (beta * Math.sqrt(1 - (fraction * Math.sin(q * (x-entryX))) ** 2));
  for (let i=1;i<=steps;i++) {
    const x=entryX+(i-1)*dx;
    times[i]=times[i-1]+dx/6*(inverseSpeed(x)+4*inverseSpeed(x+dx/2)+inverseSpeed(x+dx));
  }
  const exitTime = times[steps], duration = exitTime + (half-exitX)/beta;
  function state(time) {
    if(time<=entryTime)return atX(-half+beta*time);
    if(time>=exitTime)return atX(exitX+beta*(time-exitTime));
    let lo=0,hi=steps;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(times[mid]<=time)lo=mid;else hi=mid;}
    const part=(time-times[lo])/(times[hi]-times[lo]);
    const left=entryX+lo*dx, target=time-times[lo];
    let x=left+part*dx;
    // Refine the inverse inside the cell. Linear table interpolation alone
    // distorts the actual position derivative at strong deflection/high beta.
    for(let i=0;i<4;i++){
      const span=x-left;
      const elapsed=span/6*(inverseSpeed(left)+4*inverseSpeed(left+span/2)+inverseSpeed(x));
      x=Math.max(left,Math.min(left+dx,x-(elapsed-target)/inverseSpeed(x)));
    }
    return atX(x);
  }
  return {entryX,exitX,entryTime,exitTime,duration,count,state,atX};
}
