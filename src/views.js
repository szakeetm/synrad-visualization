import {gamma, criticalEnergy, spectrum, vertical, aberrate, reflectivity, criticalAngle, attenuation, transmission, specularFraction, undulatorEnergy, sinc, harmonicCoupling, dipoleProperties, quadrupoleProperties, quadrupoleSourceDensity, angularPolarization, photonFluxPerBandwidth, powerPerBandwidth, transverseRadiation} from './physics.js';
import {createCavityModel,cavityPattern,cavityPeak} from './cavity-physics.js';

export const colors = { cyan: '#208f86', amber: '#d69b4b', purple: '#9884c3', grey: '#b6c6c6' };
const sample = (a,b,n,fn) => Array.from({length:n+1},(_,i) => {const x=a+(b-a)*i/n; return [x,fn(x)];});
const logSample = (a,b,n,fn) => sample(Math.log10(a),Math.log10(b),n,x=>fn(10**x)).map(([x,y])=>[10**x,y]);
const trace = (name,color,points,dashed=false) => ({name,color,points,dashed});
const metric = (name,value) => ({name,value});
export const fmt = (n,d=2) => Math.abs(n)>=10000|| (Math.abs(n)>0&&Math.abs(n)<.001) ? n.toExponential(1) : n.toLocaleString('en-US',{maximumFractionDigits:d});
const percent = n => n < .0001 && n > 0 ? '< 0.01%' : `${fmt(n*100,1)}%`;
const base = (title,xLabel,xRange,metrics,extra={}) => ({title,xLabel,xRange,metrics,yLabel:'Relative intensity',yRange:[0,1.08],traces:[],markers:[],...extra});
function erf(x) {const sign=Math.sign(x);x=Math.abs(x);const t=1/(1+.3275911*x);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x));}

export function getView(id,s) {
  const E=s.energy??3, g=gamma(E), ec=criticalEnergy(E,s.rho??10);
  if(id==='cavity'){
    const m=createCavityModel(s),limit=Math.min(Math.PI,cavityPeak(m.gammaIn)*4)*1e6,active=m.fractions!==null;
    const fraction=key=>m.fractions?`≈ ${percent(m.fractions[key])}`:'—';
    const angularPoints=g=>{
      const peak=cavityPeak(g)*1e6,local=Math.min(limit,4*peak);
      // Strong acceleration can put a very narrow exit cone inside a broad
      // entrance range. Resolve each cone locally, including its exact peaks.
      const angles=new Set([...sample(-limit,limit,600,x=>0).map(p=>p[0]),
        ...sample(-local,local,400,x=>0).map(p=>p[0]),-peak,0,peak]);
      return [...angles].sort((a,b)=>a-b).map(a=>[a,active?cavityPattern(a/1e6,g):0]);
    };
    return base('Angular power at the entrance and exit','Angle from forward direction (µrad)',[-limit,limit],[
      metric('Entrance electron energy',`${fmt(m.energyGeV,6)} GeV`),
      metric('Entrance → exit γ',`${m.gammaIn.toLocaleString('en-US',{maximumFractionDigits:0})} → ${m.gammaOut.toLocaleString('en-US',{maximumFractionDigits:0})}`),
      metric('Peak spread per metre',`${fmt(Math.tan(cavityPeak(m.gammaIn))*1e6,2)} µm`),
      metric('Downstream port · energy',fraction('downstream')),
      metric('Wall interception · energy',fraction('wall')),
      metric('Upstream port · energy',fraction('upstream')),
      metric('Exit peak angle',`${fmt(cavityPeak(m.gammaOut)*1e6,3)} µrad`)],{
      traces:[trace('Entrance · unit peak',colors.cyan,angularPoints(m.gammaIn)),
        trace('Exit · unit peak',colors.amber,angularPoints(m.gammaOut))],
      badge:active?'LONGITUDINAL ACCELERATION':'NO ACCELERATION',
      caption:'Power per solid angle and source time. Each curve is normalized to its own peak. The two peaks are a slice through a hollow cone; the forward axis is dark. At Δγ = 0 there is no radiation.',
      legend:[['Electron','#55d9d0'],['Radiation energy packets','#f5bc70'],['Wall interception','#b5a0ff']],
      note:'Packet counts sample radiated energy, not photon number. Percentages integrate over the full 3D solid angle and emission time; first-wall absorption and axisymmetric geometrical optics are assumed.'});
  }
  if(id==='spectrum') {
    const ref=criticalEnergy(10,s.rho),length=s.length??1,normalized=s.spectrumNormalization==='normalized',isPower=s.spectrumQuantity==='power';
    const fn=isPower?powerPerBandwidth:photonFluxPerBandwidth;
    const lo=10**Math.floor(Math.log10(Math.min(ec,ref)*1000*.001)),hi=10**Math.ceil(Math.log10(Math.max(ec,ref)*1000*30));
    const make=(energy,color,name,dashed=false)=>{
      const critical=criticalEnergy(energy,s.rho),peak=fn(energy,s.rho,s.current,length,critical*(isPower?1.32843:.285812));
      return trace(name,color,logSample(lo,hi,700,x=>fn(energy,s.rho,s.current,length,x/1000)/(normalized?peak:1)),dashed);
    };
    const traces=[make(E,colors.cyan,`${fmt(E)} GeV electrons`),make(10,colors.grey,'10 GeV reference',true)];
    const peak=Math.max(...traces.flatMap(t=>t.points.map(p=>p[1])));
    const yRange=normalized?[1e-6,1.3]:[10**(Math.floor(Math.log10(peak))-6),10**Math.ceil(Math.log10(peak))];
    const totalPower=14.08*E**4/s.rho**2*(s.current/1000)*length;
    const flux=8.084e20*E*(s.current/1000)*length/(2*Math.PI*s.rho);
    return base(isPower?'Radiated power per 0.1% bandwidth':'Photon flux per 0.1% bandwidth','Photon energy (eV)',[lo,hi],[metric('Critical energy',`${fmt(ec)} keV`),metric('Dipole bend · L/ρ',`${fmt(1000*length/s.rho)} mrad`),metric('Total dipole photon flux',`${fmt(flux)} /s`),metric('Total dipole power',`${fmt(totalPower)} kW`)],{
      logX:true,logY:true,yRange,badge:'0.1% BANDWIDTH',
      yLabel:normalized?`${isPower?'Power':'Photon flux'} / peak`:isPower?'Power (W/0.1% BW)':'Photon flux (photons/s/0.1% BW)',traces,
      markers:[{x:1000*ec,label:`Ec · ${fmt(ec)} keV`,color:colors.amber}],
      caption:`${isPower?'Power per relative bandwidth ∝ xF(x); its peak is near 1.33 Ec.':'Photon flux per relative bandwidth ∝ F(x); its peak is near 0.286 Ec.'} ${normalized?'Each curve is divided by its own peak.':'Absolute rates for the selected dipole length and beam current, integrated over vertical angles.'} Critical energy halves integrated power; visual areas depend on axis scale and bandwidth measure.`,
      legend:[['Electrons','#55d9d0'],['Emitted photons','#f5bc70']],
      equation:isPower?'dP / d(0.1% BW) ∝ xF(x);  x = Eph/Ec':'dN / dt / d(0.1% BW) ∝ F(x);  x = Eph/Ec',
      note:'A 0.1% band has width ΔEph = 0.001 Eph. The 10 GeV reference uses the same radius, length and current. At ρ = 33.33 m, its Ec ≈ 66.5 keV, as in the lecture.'});
  }
  if(id==='frames') {
    const G=s.gammaDemo,beta=Math.sqrt(1-1/G**2),phi=s.framePlane==='perpendicular'?Math.PI/2:0;
    const angles=Array.from({length:721},(_,i)=>-180+i*.5);
    for(let i=0;i<=720;i++){const a=-Math.PI+i*Math.PI/360;angles.push(Math.sign(a)*aberrate(Math.abs(a),G)*180/Math.PI);}
    const sorted=[...new Set(angles)].sort((a,b)=>a-b);
    const points=gamma=>sorted.map(a=>[a,transverseRadiation(a*Math.PI/180,phi,gamma)]);
    return base('Angular-power slice through the lobes','Angle from laboratory forward axis (°)',[-180,180],[metric('Demonstration γ',fmt(G,4)),metric('Speed · β',`${fmt(beta*100,3)}% c`),metric('Beaming scale',G<2?'Broad pattern':`~ ${fmt(180/Math.PI/G)}° · 1/γ`)],{
      yLabel:'Angular power / own peak',traces:[trace('Lab frame',colors.amber,points(G)),trace('Particle frame',colors.cyan,points(1),true)],
      badge:phi===0?'SLICE IN ORBIT PLANE':'SLICE NORMAL TO ACCELERATION',
      caption:'Exact instantaneous angular power for transverse acceleration, matching the 3D surfaces above. Each frame is normalized to its own peak; absolute powers are not being compared. The orbit-plane slice has acceleration-related nodes; the perpendicular slice does not.',
      legend:[['Particle frame','#55d9d0'],['Lab frame','#f5bc70']],
      note:'n is the observation direction, β = v/c and a is transverse acceleration. Surface radius encodes normalized dP/dΩ, not photon position. γ is the separate demonstration control.'});
  }
  if(id==='polarization'&&s.polarizationModel==='angular') {
    const isVertical=s.cut!=='horizontal', fixed=isVertical?s.theta:s.psi;
    const vals=sample(-3,3,360,a=>angularPolarization(isVertical?fixed:a,isVertical?a:fixed));
    const ray=angularPolarization(s.theta,s.psi);
    return base(isVertical?'Vertical angular slice · σ and π':'Horizontal angular slice · σ and π',isVertical?'Scaled vertical angle · γθy':'Scaled horizontal angle · γθx',[-3,3],[
      metric('All-angle σ / π power','87.5% / 12.5%'),
      metric('Selected ray · σ share',ray.total>1e-15?percent(ray.sigma/ray.total):'Dark direction'),
      metric('Selected ray · π share',ray.total>1e-15?percent(ray.pi/ray.total):'Dark direction'),
      metric(isVertical?'Fixed horizontal γθx':'Fixed vertical γθy',fmt(fixed))],{
      traces:[trace('Parallel · σ',colors.cyan,vals.map(([x,v])=>[x,v.sigma])),trace('Perpendicular · π',colors.amber,vals.map(([x,v])=>[x,v.pi])),trace('Total',colors.grey,vals.map(([x,v])=>[x,v.total]),true)],
      markers:[{x:isVertical?s.psi:s.theta,label:'Selected direction',color:colors.purple}],
      badge:'LOCAL · ENERGY-INTEGRATED',yLabel:'Power / solid angle (relative)',
      caption:'Frequency-integrated local angular power. One common normalization: total at θx = θy = 0 equals 1. Neither components nor slices are independently peak-normalized. Maps use a shared logarithmic color scale.',
      legend:[['σ · parallel','#55d9d0'],['π · perpendicular','#f5bc70'],['Selected ray','#b5a0ff']],
      note:'u = γθx and v = γθy. Local transverse acceleration, γ ≫ 1. The all-angle 7/8 : 1/8 split does not describe an individual ray.'});
  }
  if(id==='vertical'||id==='polarization') {
    const r=s.ratio,limit=Math.max(3,2.8/Math.cbrt(r));
    const vals=sample(-limit,limit,320,u=>vertical(u,r));
    const max=Math.max(...vals.map(([,v])=>v.sigma+v.pi));
    const components=vertical(s.psi??0,r),total=components.sigma+components.pi;
    const angleScale=id==='vertical'?1e6/g:1;
    const metrics=id==='vertical'?[metric('Lorentz factor · γ',fmt(g,0)),metric('Natural cone · 1/γ',`${fmt(1e6/g)} µrad`),metric('Selected photon energy',`${fmt(r)} × Ec`)]:[metric('Parallel intensity · σ',percent(components.sigma/total)),metric('Perpendicular · π',percent(components.pi/total)),metric('Polarization',Math.abs(s.psi)<.001?'Linear':s.psi>0?'Elliptical · above':'Elliptical · below')];
    return base(id==='vertical'?'A slice through the radiation cone':'The two polarization components',id==='vertical'?'Vertical angle ψ (µrad)':'Scaled vertical angle · γψ',[-limit*angleScale,limit*angleScale],metrics,{
      traces:[trace('Parallel · σ',colors.cyan,vals.map(([x,v])=>[x*angleScale,v.sigma/max])),trace('Perpendicular · π',colors.amber,vals.map(([x,v])=>[x*angleScale,v.pi/max])),trace('Total',colors.grey,vals.map(([x,v])=>[x*angleScale,(v.sigma+v.pi)/max]),true)],
      markers:id==='polarization'?[{x:s.psi,label:'Your view',color:colors.purple}]:[],
      badge:'SINGLE ELECTRON',caption:'Energy-resolved Bessel-function components with one common normalization to the peak total intensity. Softer photons occupy a wider cone.',
      legend:id==='polarization'?[['Parallel E-field','#55d9d0'],['Perpendicular E-field','#f5bc70']]:[['Radiation cone','#55d9d0'],['Observation screen','#f5bc70']],
      equation:id==='polarization'?'Eσ ∝ (1 + q²)K₂⁄₃(ξ); Eπ ∝ i q√(1 + q²)K₁⁄₃(ξ); q = γθy':undefined,
      note:'σ and π refer to the orbit plane. Numerical integrals of K₁⁄₃ and K₂⁄₃ determine the curves. This energy-resolved long-bend model differs from the local angular maps.'});
  }
  if(id==='horizontal') {
    const width=s.bend*s.distance, sigma=s.distance*1000/g,limit=width*.65+4*sigma;
    const f=x=>.5*(erf((x+width/2)/(Math.SQRT2*sigma))-erf((x-width/2)/(Math.SQRT2*sigma)));
    const peak=f(0);
    return base('The footprint on a downstream screen','Horizontal position on screen (mm)',[-limit,limit],[metric('Geometric fan width',`${fmt(width)} mm`),metric('Edge blur · L/γ',`${fmt(sigma)} mm`),metric('Bend angle',`${s.bend} mrad`)],{
      traces:[trace('Finite radiation cone',colors.cyan,sample(-limit,limit,400,x=>f(x)/peak)),trace('Geometric fan',colors.grey,[[-limit,0],[-width/2,0],[-width/2,1],[width/2,1],[width/2,0],[limit,0]],true)],
      badge:'SMALL-ANGLE MODEL',caption:'A uniform bend convolved with a Gaussian emission kernel (σ = 1/γ); normalized to the peak. This kernel is an approximation to the real angular distribution.',
      legend:[['Electron trajectory','#55d9d0'],['Emitted tangent rays','#f5bc70']],note:'L is distance from source to screen, Δθ is the magnet bend angle. Finite magnet length is omitted from the footprint.'});
  }
  if(id==='reflection') {
    const sigma=s.roughness??0;
    const R=reflectivity(s.photon,s.grazing,s.material),fraction=specularFraction(s.photon,s.grazing,sigma),ac=criticalAngle(s.photon,s.material);
    return base('Specular reflection vs. grazing angle','Grazing angle (mrad)',[0,50],[metric('Specular reflection',percent(R*fraction)),metric('Smooth-surface reflection',percent(R)),metric('Critical-angle estimate',`${fmt(ac)} mrad`)],{
      traces:[trace(`${s.material} · σ = ${sigma} nm`,colors.cyan,sample(.001,50,400,a=>reflectivity(s.photon,a,s.material)*specularFraction(s.photon,a,sigma))),trace('Smooth surface',colors.grey,sample(.001,50,400,a=>reflectivity(s.photon,a,s.material)),true)],
      markers:[{x:s.grazing,label:'Selected angle',color:colors.amber}],badge:'ILLUSTRATIVE OPTICS',yLabel:'Specular reflectivity',caption:'Roughness suppresses the specular beam; the animated scattering fan shows directions only, not diffuse intensity. Approximate optical constants omit absorption edges.',
      legend:[['Incident','#55d9d0'],['Specular','#f5bc70'],['Scattering schematic','#b5a0ff']],note:'The smooth-surface curve uses material-dependent approximate Fresnel optics. RMS roughness is a height; surface correlations are needed to predict scattering.'});
  }
  if(id==='penetration') {
    const mu=attenuation(s.photon,s.material),T=transmission(s.photon,s.thickness,s.material);
    const max=Math.max(50,s.thickness*1.3,Math.min(1000,5/mu));
    return base('Transmission vs. depth','Depth into material (µm)',[0,max],[metric('Transmitted fraction',percent(T)),metric('Removed from beam',percent(1-T)),metric('Attenuation length · 1/μ',`${fmt(1/mu)} µm`)],{
      traces:[trace('Surviving beam',colors.cyan,sample(0,max,400,t=>transmission(s.photon,t,s.material))),trace('2× photon energy',colors.purple,sample(0,max,400,t=>transmission(s.photon*2,t,s.material)),true)],
      markers:[{x:s.thickness,label:'Your thickness',color:colors.amber}],badge:'BEER–LAMBERT LAW',yLabel:'Transmission · I / I₀',caption:'Illustrative μ ∝ Eph⁻³ with material-specific example coefficients. The dashed trace shows why harder photons penetrate farther. No absorption-edge data is used.',
      legend:[['Incident','#55d9d0'],['Transmitted','#f5bc70'],['Absorbed','#b5a0ff']],note:'t is normal-incidence thickness. μ is a linear attenuation coefficient; 1/μ is the depth for 1/e survival.'});
  }
  if(id==='dipole') {
    const d=dipoleProperties(E,s.field,s.length,s.current),ref=.665*.2*E**2;
    const lo=10**Math.floor(Math.log10(Math.min(d.criticalKeV||ref,ref)*.005)),hi=10**Math.ceil(Math.log10(Math.max(d.criticalKeV,ref)*20));
    return base('The spectrum from a uniform bend','Photon energy (keV)',[lo,hi],[
      metric('Bending radius',s.field===0?'∞ · straight':`${fmt(d.radius)} m`),metric('Bend angle',`${fmt(d.bendMrad)} mrad`),metric('Critical energy',`${fmt(d.criticalKeV,3)} keV`),metric('Single-magnet power',`${fmt(d.powerKW)} kW`)],{
      logX:true,badge:'UNIFORM FIELD · dP/dE',yLabel:'dP/dEph / peak',
      traces:[trace(`${fmt(s.field)} T dipole`,colors.cyan,logSample(lo,hi,450,x=>s.field===0?0:spectrum(x/d.criticalKeV)/.918)),trace('0.2 T reference',colors.grey,logSample(lo,hi,450,x=>spectrum(x/ref)/.918),true)],
      markers:s.field===0?[]:[{x:d.criticalKeV,label:`Ec · ${fmt(d.criticalKeV)} keV`,color:colors.amber}],
      caption:'Spectral power per unit photon energy, dP/dEph ∝ F(Eph/Ec), normalized to its peak. This differs from power per relative bandwidth on the Spectrum tab, which has an extra Eph factor. The readout gives total single-magnet power. Zero field gives zero radiation; the reference uses 0.2 T at the same electron energy.',
      legend:[['Electron orbit','#55d9d0'],['Tangential photons','#f5bc70'],['Magnetic field','#b5a0ff']],note:'Magnetic rigidity uses p ≈ E/c for ultrarelativistic electrons. Δθ = L/ρ. At fixed B, Ec ∝ E² and power ∝ E² B² I L.'});
  }
  if(id==='quadrupole') {
    const q=quadrupoleProperties(E,s.gradient,s.sigma,s.offset,s.length),lim=Math.abs(s.offset)+4*s.sigma;
    const power=sample(-lim,lim,500,x=>quadrupoleSourceDensity(x,s.gradient,s.sigma,s.offset));
    const max=Math.max(...power.map(p=>p[1]))||1;
    return base('Where the quadrupole radiation originates','Horizontal position from magnetic center (mm)',[-lim,lim],[
      metric('Entrance RMS field',`${fmt(q.rmsField,4)} T`),metric('Ec at RMS field · indicative',`${fmt(q.criticalKeV,3)} keV`),metric('Frozen-beam power · 100 mA',`${fmt(q.powerKW*1000)} W`),metric('Assumed σx = σy',`${fmt(s.sigma)} mm`)],{
      traces:[trace('Power-weighted source density',colors.cyan,power.map(([x,y])=>[x,y/max])),trace('Particle density',colors.grey,sample(-lim,lim,500,x=>Math.exp(-.5*((x-s.offset)/s.sigma)**2)),true)],
      markers:[{x:0,label:'Magnetic center',color:colors.amber},{x:s.offset,label:'Beam centroid',color:colors.purple}],badge:'ENTRANCE-PLANE MODEL',yLabel:'Each density / its own peak',
      caption:'A round Gaussian beam weighted by B², integrated over y. Each trace has its own peak normalization. At x = 0 the projected source need not vanish: off-axis particles at nonzero y still radiate. Power holds the entrance distribution constant along the magnet.',
      legend:[['Beam electrons','#55d9d0'],['Local radiation','#f5bc70'],['Magnetic field','#b5a0ff']],
      note:'Ideal Bx = −Gy, By = −Gx. For this electron direction, Fx ∝ −x and Fy ∝ +y. Real power requires the changing beam envelope along z; RMS-field Ec is not an exact quadrupole spectrum.'});
  }
  if(id==='insertion') {
    const e1=undulatorEnergy(E,s.period,s.K),field=s.K/(.934*s.period/10),ecW=.665*field*E**2;
    const blend=Math.max(0,Math.min(1,(s.K-2)/3));
    const xmax=Math.max(7*e1,3*ecW*blend),xMin=Math.max(1e-5,e1*.01);
    const points=sample(xMin,xmax,1800,x=>{
      let v=0;for(let n=1;n<=9;n+=2) v+=harmonicCoupling(n,s.K)/harmonicCoupling(1,s.K)*sinc(Math.PI*s.periods*(x/e1-n))**2;
      return (1-blend)*v+blend*spectrum(x/ecW)/.918;
    });
    const max=Math.max(...points.map(p=>p[1]));
    // Fit the broad envelope on log axes; cap the range at six decades for interference nulls.
    const minPositive=Math.min(...points.filter(p=>p[1]>0).map(p=>p[1]))/max;
    const logYRange=[Math.max(1e-6,10**Math.floor(Math.log10(minPositive))),1.08];
    return base('From narrow harmonics to a broad envelope','Photon energy (keV)',[0,xmax],[metric('Regime',s.K<1?'Undulator':s.K<3?'Transition':'Wiggler-like'),metric('On-axis fundamental',`${fmt(e1,3)} keV`),metric('Peak magnetic field',`${fmt(field,3)} T`),metric('Fundamental linewidth scale',`~ ${fmt(100/s.periods)}%`)],{
      logYRange,
      traces:[trace('Illustrative spectral shape',colors.cyan,points.map(([x,y])=>[x,y/max]))],markers:[{x:e1,label:'E₁',color:colors.amber}],badge:'ILLUSTRATIVE SPECTRUM',
      caption:'Finite wave-train peaks (odd harmonics), blended into an angle-integrated wiggler-like envelope as K grows. Relative peak normalized; not a full on-axis radiation calculation.',
      legend:[['Electron orbit','#55d9d0'],['Radiation','#f5bc70']],note:'λu is the magnetic period; θ is observation angle. The readout uses θ = 0. Linewidth scale is 1/N.'});
  }
  throw new Error(`Unknown experiment: ${id}`);
}
