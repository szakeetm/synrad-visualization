import { createTravelingPath } from './traveling.js';
// Radiation2D browser implementation, GPL-3.0-only.
// Wavelet construction: Tsumoru Shintake, LINAC2002, equations (4) and (5).
// Also informed by Andrei Frolov's GPL-3.0 Radiation 2D Swift reimplementation.
export const STEP = 1 / 120;
export const HISTORY_SECONDS = 15;
export const DIPOLE_ANGLE = Math.PI / 6;

// Lorentz aberration in Cartesian form; beta is the particle velocity / c.
export function aberrate(nx, ny, bx, by) {
  const b2 = bx * bx + by * by;
  if (b2 === 0) return [nx, ny];
  const gamma = 1 / Math.sqrt(1 - b2);
  const dot = bx * nx + by * ny;
  const boost = 1 + gamma / (gamma + 1) * dot;
  const denominator = 1 + dot;
  return [(nx / gamma + boost * bx) / denominator,
    (ny / gamma + boost * by) / denominator];
}

// Exact tangent drifts and constant-speed 30-degree sector bend.
export function dipoleState(time, {beta, amplitude: radius}) {
  const distance = beta * time - 2.5;
  const arcLength = DIPOLE_ANGLE * radius;
  if (distance < 0) return {x: -1 + distance, y: -1, vx: beta, vy: 0};
  if (distance <= arcLength) {
    const theta = distance / radius;
    return {x: -1 + radius * Math.sin(theta), y: -1 + radius * (1 - Math.cos(theta)),
      vx: beta * Math.cos(theta), vy: beta * Math.sin(theta)};
  }
  const drift = distance - arcLength;
  return {x: -1 + radius * Math.sin(DIPOLE_ANGLE) + drift * Math.cos(DIPOLE_ANGLE),
    y: -1 + radius * (1 - Math.cos(DIPOLE_ANGLE)) + drift * Math.sin(DIPOLE_ANGLE),
    vx: beta * Math.cos(DIPOLE_ANGLE), vy: beta * Math.sin(DIPOLE_ANGLE)};
}
// Continue the tangent exit until the charge marker is outside either viewport edge.
export function dipolePassDuration(config) {
  const {beta,amplitude,viewWidth=12,viewHeight=9,edgeMargin=.2}=config;
  const bendEnd=(2.5+DIPOLE_ANGLE*amplitude)/beta;
  const exit=dipoleState(bendEnd,config);
  const dx=(viewWidth/2+edgeMargin-exit.x)/Math.cos(DIPOLE_ANGLE);
  const dy=(viewHeight/2+edgeMargin-exit.y)/Math.sin(DIPOLE_ANGLE);
  return bendEnd+Math.max(0,Math.min(dx,dy))/beta;
}
function emission(time, particle, count) {
  const kx = new Float64Array(count), ky = new Float64Array(count);
  for (let j = 0; j < count; j++) {
    const theta = 2 * Math.PI * j / count;
    [kx[j], ky[j]] = aberrate(Math.cos(theta), Math.sin(theta), particle.vx, particle.vy);
  }
  return {time, x: particle.x, y: particle.y, kx, ky};
}

// Reconstruct emissions before the live buffer. Straight drifts need only endpoints;
// sample the bend separately so it remains resolved however old the history becomes.
export function dipoleFieldTail(sim, viewportReach) {
  const {beta, amplitude, density} = sim.config;
  const oldest = sim.history[0].time;
  const entry = 2.5 / beta, exit = (2.5 + DIPOLE_ANGLE * amplitude) / beta;
  // Since |displacement| <= beta*age, every far node is at least (1-beta)*age
  // from the current charge. This bound places all endpoints outside the viewport.
  const far = Math.min(oldest - 1, entry - 1, sim.time - (viewportReach + 1) / (1 - beta));
  const times = [far];
  if (oldest > entry) {
    times.push(entry);
    const end = Math.min(oldest, exit);
    for (let i = 1; i <= 128; i++) times.push(entry + (end - entry) * i / 128);
    if (oldest > exit) times.push(oldest);
  }
  return times.map(time => emission(time, dipoleState(time, sim.config), density));
}

export function travelingFieldTail(sim, viewportReach) {
  const {beta,density} = sim.config, path = sim.path;
  const oldest=sim.history[0].time;
  const far=Math.min(oldest-1,path.entryTime-1,sim.time-(viewportReach+1)/(1-beta));
  const times=[far];
  if(oldest>path.entryTime){
    const end=Math.min(oldest,path.exitTime), count=path.count*128;
    for(let i=0;i<=count;i++)times.push(path.entryTime+(end-path.entryTime)*i/count);
    if(oldest>path.exitTime)times.push(oldest);
  }
  return times.map(time=>emission(time,path.state(time),density));
}

export class Simulation {
  constructor(config = {}) { this.reset(config); }
  reset(config = {}) {
    this.config = {mode: 'drag', beta: .9, amplitude: 1, periods: 3, viewWidth: 12, viewHeight: 9, edgeMargin: .2, K: 1, density: 72, ...this.config, ...config};
    this.config.beta = Math.max(.05, Math.min(.995, this.config.beta));
    this.config.amplitude = Math.max(.15, this.config.amplitude);
    this.path = this.config.mode === 'wiggler' ? createTravelingPath(this.config) : null;
    this.time = 0;
    this.accumulator = 0;
    this.particle = { x: 0, y: 0, vx: 0, vy: 0, px: 0, py: 0 };
    this.history = [];
    this.setAnalyticState();
    this.emit();
  }
  get passComplete() {
    if (this.path) return this.time >= this.path.duration;
    return this.config.mode === 'dipole' && this.time >= dipolePassDuration(this.config);
  }
  setAnalyticState() {
    const {mode, beta, amplitude: a} = this.config;
    const phase = beta * this.time / a;
    if (mode === 'dipole') Object.assign(this.particle, dipoleState(this.time, this.config));
    if (this.path) Object.assign(this.particle, this.path.state(this.time));
    if (mode === 'oscillator') Object.assign(this.particle, {
      x: 0, y: a * Math.sin(phase), vx: 0, vy: beta * Math.cos(phase),
    });
  }
  prime(seconds = 12) {
    this.time = -seconds;
    this.history = [];
    this.setAnalyticState();
    this.emit();
    this.advance(seconds);
    this.time = 0;
    this.accumulator = 0;
  }
  advance(duration, target = null) {
    this.accumulator += Math.max(0, duration);
    while (this.accumulator + 1e-12 >= STEP) {
      this.tick(STEP, target);
      this.accumulator -= STEP;
    }
  }
  tick(dt, target) {
    const {mode} = this.config;
    const p = this.particle;
    if (mode === 'drag') {
      // Relativistic damped spring, inspired by Frolov's Particle model.
      // Momentum gives |v| < c even when a pointer jumps across the viewport.
      const fx = target ? 22 * (target.x - p.x) : 0;
      const fy = target ? 22 * (target.y - p.y) : 0;
      p.px = (p.px + fx * dt) / (1 + 7 * dt);
      p.py = (p.py + fy * dt) / (1 + 7 * dt);
      const energy = Math.sqrt(1 + p.px * p.px + p.py * p.py);
      p.vx = p.px / energy; p.vy = p.py / energy;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.time += dt;
    this.setAnalyticState();
    this.emit();
    while (this.history.length > 1801 || this.time - this.history[0].time > HISTORY_SECONDS) this.history.shift();
  }
  emit() {
    this.history.push(emission(this.time, this.particle, this.config.density));
  }
}
