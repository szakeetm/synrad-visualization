import {angularPolarization, gamma} from './physics.js';

// Ideal hard-edge, paraxial quadrupole. Positions in m, slopes in rad.
// Initially parallel beam; x focuses and y defocuses for electrons along +z.
export function quadrupoleTransport(initial, state, z) {
  const length=state.length??1, inside=Math.min(Math.max(z,0),length);
  const k=.2998*(state.gradient??10)/(state.energy??3), root=Math.sqrt(k);
  if(!root)return {x:initial.x,y:initial.y,xp:0,yp:0,z};
  const phase=root*inside;
  const xp=-initial.x*root*Math.sin(phase),yp=initial.y*root*Math.sinh(phase);
  const drift=Math.max(0,z-length);
  return {x:initial.x*Math.cos(phase)+drift*xp,y:initial.y*Math.cosh(phase)+drift*yp,xp,yp,z};
}

function randomGenerator(seed) {
  let value=seed>>>0;
  return ()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
}

// Sample the frequency-integrated local transverse-acceleration pattern.
// Proposal density ∝ (1+u²+v²)^−3 bounds the angularPolarization numerator.
function angularSample(random) {
  for(;;){
    const r2=1/Math.sqrt(1-random())-1,angle=2*Math.PI*random();
    const u=Math.sqrt(r2)*Math.cos(angle),v=Math.sqrt(r2)*Math.sin(angle);
    if(random()<=angularPolarization(u,v).total*(1+r2)**3)return {u,v};
  }
}

export function createQuadrupoleModel(input) {
  const state={energy:3,gradient:10,sigma:.5,offset:0,length:1,targetDistance:5,photons:100,duration:5,...input};
  const {length,gradient,energy}=state,aperture=.025,targetZ=length+state.targetDistance;
  const tracks=[],sources=[],cumulative=[];
  let integral=0,lost=0;
  const count=128,steps=64;
  for(let i=0;i<count;i++){
    // Paired deterministic Gaussian samples preserve a centered beam's symmetry.
    const j=Math.floor(i/2),sign=i%2?1:-1;
    const radius=state.sigma/1000*Math.sqrt(-2*Math.log((j+.5)/(count/2))),angle=j*2.399963229728653;
    const initial={x:state.offset/1000+sign*radius*Math.cos(angle),y:sign*radius*Math.sin(angle)};
    let lossZ=Infinity,previous=0;
    for(let step=0;step<=steps;step++){
      const z=length*step/steps,p=quadrupoleTransport(initial,state,z);
      if(Math.hypot(p.x,p.y)>=aperture){
        let low=previous,high=z;
        for(let n=0;n<32;n++){const mid=(low+high)/2,q=quadrupoleTransport(initial,state,mid);if(Math.hypot(q.x,q.y)>=aperture)high=mid;else low=mid;}
        lossZ=high;lost++;break;
      }
      previous=z;
    }
    tracks.push({initial,lossZ});
    const end=Math.min(length,lossZ),dz=end/steps;
    for(let step=0;step<steps&&dz>0;step++){
      const p=quadrupoleTransport(initial,state,(step+.5)*dz);
      const weight=gradient**2*(p.x*p.x+p.y*p.y)*dz;
      if(weight>0){integral+=weight;sources.push({track:i,p});cumulative.push(integral);}
    }
  }
  const random=randomGenerator(state.sampleSeed??41),packets=[];
  const speed=targetZ/2; // One shared, slowed distance clock for electrons and light.
  const target=Math.round(state.photons);
  let endTime=0,extent=Math.max(.001,4*state.sigma/1000);
  if(integral>0)for(let i=0;i<target;i++){
    const value=random()*integral;
    let low=0,high=cumulative.length-1;
    while(low<high){const mid=(low+high)>>1;if(cumulative[mid]<value)low=mid+1;else high=mid;}
    const {track,p}=sources[low],{u,v}=angularSample(random);
    // Acceleration direction (-x,+y) fixes the local angular-pattern axes.
    const norm=Math.hypot(p.x,p.y),ax=-p.x/norm,ay=p.y/norm;
    const sx=p.xp+(u*ax-v*ay)/gamma(energy),sy=p.yp+(u*ay+v*ax)/gamma(energy);
    const normalization=Math.hypot(sx,sy,1),direction={x:sx/normalization,y:sy/normalization,z:1/normalization};
    const source={x:p.x,y:p.y,z:p.z};
    const a=sx*sx+sy*sy,b=2*(p.x*sx+p.y*sy),c=p.x*p.x+p.y*p.y-aperture**2;
    const wallDz=a>0?(-b+Math.sqrt(Math.max(0,b*b-4*a*c)))/(2*a):Infinity;
    const outcome=wallDz<=length-p.z?'wall':'target';
    const dz=outcome==='wall'?wallDz:targetZ-p.z;
    const hit={x:p.x+sx*dz,y:p.y+sy*dz,z:p.z+dz};
    const launch=i/Math.max(1,target-1)*state.duration,birth=launch+p.z/speed;
    const arrival=birth+dz/direction.z/speed;
    packets.push({track,source,direction,hit,launch,birth,arrival,outcome});
    endTime=Math.max(endTime,arrival);
    if(outcome==='target')extent=Math.max(extent,Math.abs(hit.x)*1.08,Math.abs(hit.y)*1.08);
  }
  // Integrated Liénard power at 100 mA, with ∫<B²> dz from surviving tracks.
  const powerW=14.08*.2998**2*energy**2*.1*1000*integral/count;
  const rmsField=Math.sqrt(integral/count/length);
  return {state,tracks,packets,aperture,targetZ,speed,endTime,extent,gridSize:35,powerW,rmsField,lossFraction:lost/count};
}

const cache=new WeakMap();
export function getQuadrupoleModel(state) {
  const key=JSON.stringify(state),previous=cache.get(state);
  if(previous?.key===key)return previous.model;
  const model=createQuadrupoleModel(state);cache.set(state,{key,model});return model;
}

export function quadrupoleSnapshot(model,time) {
  const bins=Array(model.gridSize**2).fill(0),flying=[];
  let hits=0,intercepted=0,emitted=0;
  for(const packet of model.packets){
    if(time<packet.birth)continue;
    emitted++;
    if(time<packet.arrival){
      const distance=(time-packet.birth)*model.speed;
      flying.push({packet,x:packet.source.x+distance*packet.direction.x,y:packet.source.y+distance*packet.direction.y,z:packet.source.z+distance*packet.direction.z});
    }else if(packet.outcome==='wall')intercepted++;
    else{
      hits++;
      const index=value=>Math.max(0,Math.min(model.gridSize-1,Math.floor((value/model.extent+1)/2*model.gridSize)));
      bins[index(packet.hit.y)*model.gridSize+index(packet.hit.x)]++;
    }
  }
  return {bins,flying,hits,intercepted,emitted,resolved:hits+intercepted};
}
