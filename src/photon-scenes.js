import {renderPolarization} from './polarization-scenes.js';
import {advanceMonteCarlo} from './monte-carlo.js';
import {getPhotonSimulation} from './photon-simulation.js';
import {fmt} from './views.js';

const renderedRuns = new WeakMap();
const colors = {sigma: '#55d9d0', pi: '#f5bc70', detected: '#f5bc70', absorbed: '#b5a0ff', transmitted: '#f5bc70'};

function label(ctx, text, x, y, color = '#9cb4c1') {
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawDistribution(ctx, run, photons) {
  const [low, high] = run.range;
  ctx.globalAlpha = run.target <= 100 ? .6 : .06;
  ctx.lineWidth = 1;
  for (const [outcome, bins] of Object.entries(run.bins)) {
    ctx.strokeStyle = colors[outcome];
    ctx.beginPath();
    for (const photon of photons) {
      if (photon.outcome !== outcome) continue;
      const fraction = (photon.coordinate - low) / (high - low);
      const y = 320 - 240 * fraction;
      ctx.moveTo(90, 200); ctx.lineTo(690, y);
      bins[Math.min(47, Math.floor(48 * fraction))]++;
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#101d29'; ctx.fillRect(700, 76, 190, 249);
  const maximum = Math.max(1, ...Array.from({length: 48}, (_, i) => Object.values(run.bins).reduce((sum, bins) => sum + bins[i], 0)));
  for (let i = 0; i < 48; i++) {
    let x = 705;
    for (const [outcome, bins] of Object.entries(run.bins)) {
      const width = 130 * bins[i] / maximum;
      ctx.fillStyle = colors[outcome];
      ctx.fillRect(x, 320 - (i + 1) * 5, width, 4);
      x += width;
    }
  }
}

function drawPenetration(ctx, state, photons, slabWidth) {
  ctx.lineWidth = 1;
  ctx.globalAlpha = state.photons <= 100 ? .6 : .06;
  ctx.strokeStyle = '#55d9d0';
  ctx.beginPath();
  for (const photon of photons) {
    const y = 85 + 225 * photon.position;
    ctx.moveTo(90, y); ctx.lineTo(320, y);
  }
  ctx.stroke();
  for (const outcome of ['absorbed', 'transmitted']) {
    ctx.strokeStyle = colors[outcome];
    ctx.beginPath();
    for (const photon of photons) {
      if (photon.outcome !== outcome) continue;
      const y = 85 + 225 * photon.position;
      const end = outcome === 'absorbed' ? 320 + slabWidth * photon.depth / state.thickness : 835;
      ctx.moveTo(320, y); ctx.lineTo(end, y);
      if (outcome === 'absorbed') {
        ctx.moveTo(end - 2, y - 2); ctx.lineTo(end + 2, y + 2);
      }
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function renderPhotonSimulation(ctx, w, h, id, state, time) {
  if (id === 'polarization' && state.polarizationModel === 'angular') return renderPolarization(ctx, w, h, id, state, time);
  if (!['vertical', 'horizontal', 'polarization', 'penetration'].includes(id)) return false;
  const run = getPhotonSimulation(id, state);
  const penetration = id === 'penetration';
  const slabWidth = state.thickness > 0 ? 65 + 220 * Math.sqrt(state.thickness / 500) : 0;
  ctx.save(); ctx.scale(w / 900, h / 400);
  if (renderedRuns.get(ctx) !== run) {
    ctx.fillStyle = '#101d29'; ctx.fillRect(0, 0, 900, 400);
    ctx.textAlign = 'left';
    label(ctx, penetration ? 'Random absorption depths in the material' : 'Photon trajectories and accumulated detector arrivals', 32, 30, '#e3edf0');
    if (penetration) {
      ctx.fillStyle = '#263b4b'; ctx.fillRect(320, 75, slabWidth, 250);
      ctx.strokeStyle = '#7891a2'; ctx.strokeRect(320, 75, slabWidth, 250);
      label(ctx, `${state.material} · ${state.thickness} µm`, 320, 60);
      label(ctx, 'Incident', 90, 60, '#55d9d0');
      label(ctx, 'Transmitted', 755, 60, '#f5bc70');
      label(ctx, 'Paths stop at their sampled absorption depth or leave the material.', 90, 348);
    } else {
      ctx.strokeStyle = '#7891a2';
      ctx.beginPath(); ctx.moveTo(690, 75); ctx.lineTo(690, 325); ctx.stroke();
      label(ctx, 'Source', 60, 225);
      label(ctx, 'Detector arrivals', 705, 60);
      label(ctx, `${fmt(run.range[1], 3)}`, 640, 65);
      label(ctx, `${fmt(run.range[0], 3)}`, 640, 345);
      label(ctx, run.axisLabel, 260, 345);
      const meaning = 'Sampling the plotted distribution · transverse scale auto-scaled';
      label(ctx, meaning, 90, 60);
    }
    renderedRuns.set(ctx, run);
  }
  advanceMonteCarlo(run, time, photons => {
    if (penetration) drawPenetration(ctx, state, photons, slabWidth);
    else drawDistribution(ctx, run, photons);
  });
  ctx.fillStyle = '#101d29'; ctx.fillRect(0, 358, 900, 42);
  const counts = Object.entries(run.counts).map(([key, n]) => `${key === 'sigma' ? 'σ' : key === 'pi' ? 'π' : key} ${n.toLocaleString('en-US')}`).join(' · ');
  label(ctx, `${run.n.toLocaleString('en-US')} / ${run.target.toLocaleString('en-US')} traced · ${counts}`, 32, 382);
  ctx.restore();
  return true;
}
