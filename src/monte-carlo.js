// One surface encounter per equal-weight test photon. Fixed probabilities make
// the limiting solution known exactly, so sampling noise can be inspected.
let cachedKey,cachedResult;
export function simulateMonteCarlo(state) {
  const n=Math.max(1,Math.min(1000000,Math.round(state.photons??10)));
  const reflected=state.reflection===false?0:.3;
  const scattered=state.scattering===false?0:.2;
  const seed=state.sampleSeed??41;
  const key=`${n}/${reflected}/${scattered}/${seed}`;
  if(key===cachedKey)return cachedResult;
  let randomState=seed>>>0;
  const random=()=>{
    randomState=(randomState+0x6D2B79F5)>>>0;
    let value=randomState;
    value=Math.imul(value^(value>>>15),value|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return ((value^(value>>>14))>>>0)/4294967296;
  };
  const expected={absorbed:1-reflected-scattered,reflected,scattered};
  const counts={absorbed:0,reflected:0,scattered:0};
  const paths=[],history=[];
  let checkpoint=1;
  for(let i=1;i<=n;i++){
    const roll=random(),position=random(),direction=random();
    const outcome=roll<reflected?'reflected':roll<reflected+scattered?'scattered':'absorbed';
    counts[outcome]++;
    if(i<=40)paths.push({outcome,position,direction});
    if(i===checkpoint||i===n){
      history.push({n:i,absorbed:counts.absorbed/i,uncertainty:1.96*Math.sqrt(expected.absorbed*(1-expected.absorbed)/i)});
      checkpoint=Math.max(i+1,Math.ceil(i*1.05));
    }
  }
  cachedKey=key;
  cachedResult={n,expected,counts,paths,history};
  return cachedResult;
}
