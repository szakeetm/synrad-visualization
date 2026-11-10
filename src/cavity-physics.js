// Ideal longitudinal acceleration and geometrical transport, c=m=1, length=1 m.
// Angular power per source time: Fitzpatrick, eqs.1661–1666.
// https://farside.ph.utexas.edu/teaching/em/lectures/node132.html
const betaOf=g=>Math.sqrt(1-1/g**2);
export function cavityPeak(g){
  const b=betaOf(g);return Math.acos(5*b/(1+Math.sqrt(1+15*b*b)));
}
export function cavityPattern(theta,g){
  const b=betaOf(g),peak=cavityPeak(g);
  const den=a=>1/(g*g*(1+b))+2*b*Math.sin(a/2)**2;
  return Math.sin(theta)**2/Math.sin(peak)**2*(den(peak)/den(theta))**5;
}
// In rest-angle u=cosθ′, the normalized LAB ENERGY density is
// (3/4)(1-u²)(1+βu). This includes the lab solid-angle Jacobian.
export function cavityCdf(u,b){
  return .75*(u-u**3/3+b*(u*u/2-u**4/4)+2/3-b/4);
}
export function cavityDirection(g,q){
  const b=betaOf(g);let lo=-1,hi=1;
  for(let i=0;i<45;i++){
    const u=(lo+hi)/2;if(cavityCdf(u,b)<q)lo=u;else hi=u;
  }
  const u=(lo+hi)/2,den=1+b*u;
  return {u,dx:(u+b)/den,dr:Math.sqrt(1-u*u)/(g*den)};
}
// Polygonal axisymmetric cavity: 128 wall segments, plus straight beam pipes.
// Using the same polygon for drawing and ray tracing gives exact first hits.
const profile=Array.from({length:129},(_,i)=>({x:i/128,bulge:.2*Math.sin(Math.PI*i/128)**2}));
export function cavityWall(a){return [{x:-.15,r:a},...profile.map(p=>({x:p.x,r:a+p.bulge})),{x:1.3,r:a}];}
export function cavityRadius(x,a){
  if(x<=0||x>=1)return a;
  const f=x*128,i=Math.floor(f),q=f-i;
  return a+profile[i].bulge*(1-q)+profile[i+1].bulge*q;
}
export function traceCavityRay(x,dx,dr,a){
  dr=Math.abs(dr);
  let distance=dx>0?(1.3-x)/dx:dx<0?(-.15-x)/dx:Infinity;
  let outcome=dx>=0?'downstream':'upstream';
  const wall=cavityWall(a);
  for(let i=1;i<wall.length;i++){
    const p=wall[i-1],q=wall[i],slope=(q.r-p.r)/(q.x-p.x);
    const den=dr-slope*dx;if(Math.abs(den)<1e-14)continue;
    const t=(p.r+slope*(x-p.x))/den,hitX=x+dx*t;
    if(t>=0&&t<distance&&hitX>=p.x-1e-12&&hitX<=q.x+1e-12){distance=t;outcome='wall';}
  }
  return {distance,outcome,x:x+dx*distance,r:dr*distance};
}
let cacheKey,cache;
export function createCavityModel(s){
  const gammaIn=s.gammaIn??20,gain=s.gain??20,a=(s.aperture??25)/1000;
  const key=`${gammaIn}/${gain}/${a}`;if(key===cacheKey)return cache;
  const beta=betaOf(gammaIn),p0=gammaIn*beta,gammaOut=gammaIn+gain;
  const p1=Math.sqrt(gammaOut**2-1),betaOut=p1/gammaOut;
  const entryTime=.15/beta;
  // Rationalized momentum difference remains accurate as gain tends to zero.
  const transit=gain===0?1/beta:(gammaOut+gammaIn)/(p1+p0);
  const exitTime=entryTime+transit;
  function state(time){
    if(time<=entryTime)return {x:-.15+beta*time,beta,gamma:gammaIn};
    if(time>=exitTime)return {x:1+betaOut*(time-exitTime),beta:betaOut,gamma:gammaOut};
    if(gain===0)return {x:beta*(time-entryTime),beta,gamma:gammaIn};
    const p=p0+gain*(time-entryTime),g=Math.hypot(1,p);
    return {x:(p-p0)*(p+p0)/(gain*(g+gammaIn)),beta:p/g,gamma:g};
  }
  const packets=[],fractions={downstream:0,upstream:0,wall:0};
  // Equal source-time steps have equal energy because P ∝ γ⁶a² = F².
  // Each ± meridional pair shares the energy of one axisymmetric ray ring.
  if(gain>0)for(let event=0;event<24;event++){
    const time=entryTime+transit*(event+.5)/24,p=state(time);
    for(let i=0;i<32;i++){
      const d=cavityDirection(p.gamma,(i+.5)/32),hit=traceCavityRay(p.x,d.dx,d.dr,a);
      fractions[hit.outcome]+=1/(24*32);
      for(const side of [-1,1])packets.push({time,x:p.x,dx:d.dx,dr:d.dr*side,
        distance:hit.distance,outcome:hit.outcome,hitX:hit.x,hitR:hit.r*side});
    }
  }
  cacheKey=key;cache={state,packets,fractions:gain>0?fractions:null,a,gammaIn,gammaOut,entryTime,exitTime,
    cycle:exitTime+.3/betaOut+1.7,wall:cavityWall(a)};
  return cache;
}
