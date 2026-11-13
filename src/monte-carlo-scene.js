import {getMonteCarloRun, advanceMonteCarlo} from './monte-carlo.js';

const colors = {absorbed: '#f17e80', reflected: '#f5bc70', scattered: '#b5a0ff'};
const renderedRuns = new WeakMap();

function photonGeometry(photon) {
  const hit = [290 + photon.position * 300, 285];
  let end = hit;
  if (photon.outcome === 'reflected') {
    const distance = Math.min((835 - hit[0]) / (hit[0] - 90), 185 / 175);
    end = [hit[0] + distance * (hit[0] - 90), hit[1] - distance * 175];
  }
  if (photon.outcome === 'scattered') {
    const angle = .18 + photon.direction * (Math.PI - .36);
    const dx = Math.cos(angle), dy = -Math.sin(angle);
    const distance = Math.min((dx > 0 ? 835 - hit[0] : 65 - hit[0]) / dx, -185 / dy);
    end = [hit[0] + distance * dx, hit[1] + distance * dy];
  }
  return {hit, end, outcome: photon.outcome};
}

export function renderMonteCarlo(ctx, w, h, id, state, time) {
  if (id !== 'monte-carlo') return false;
  const run = getMonteCarloRun(state);
  ctx.save();
  ctx.scale(w / 900, h / 400);
  if (renderedRuns.get(ctx) !== run) {
    ctx.fillStyle = '#101d29';
    ctx.fillRect(0, 0, 900, 400);
    ctx.fillStyle = '#263b4b';
    ctx.fillRect(60, 285, 780, 70);
    ctx.strokeStyle = '#7891a2';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(60, 285); ctx.lineTo(840, 285); ctx.stroke();
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#b4c9d1';
    ctx.fillText('Synchrotron photon fan', 60, 53);
    ctx.fillText('Surface · one random interaction per photon', 80, 333);
    ctx.textAlign = 'right';
    ctx.fillText('Open region · reflected and scattered photons escape', 840, 80);
    renderedRuns.set(ctx, run);
  }
  advanceMonteCarlo(run, time, photons => {
    const paths = photons.map(photonGeometry);
    ctx.globalAlpha = run.target <= 100 ? .6 : .08;
    ctx.lineWidth = 1;
    // Accumulate every trajectory on the canvas, batching strokes by color.
    ctx.strokeStyle = '#55d9d0';
    ctx.beginPath();
    for (const {hit} of paths) { ctx.moveTo(90, 110); ctx.lineTo(...hit); }
    ctx.stroke();
    for (const [outcome, color] of Object.entries(colors)) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (const path of paths) {
        if (path.outcome !== outcome) continue;
        ctx.moveTo(...path.hit);
        if (outcome === 'absorbed') ctx.lineTo(path.hit[0], path.hit[1] + 5);
        else ctx.lineTo(...path.end);
      }
      ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#101d29';
  ctx.fillRect(0, 358, 900, 42);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#b4c9d1';
  ctx.textAlign = 'right';
  ctx.fillText(`${run.n.toLocaleString('en-US')} / ${run.target.toLocaleString('en-US')} photons traced${run.n === run.target ? ' · complete' : ` · ${run.duration} s run`}`, 840, 380);
  ctx.restore();
  return true;
}
