// Local, frequency-integrated angular power. Every panel uses the same scale;
// no component is independently normalized or assigned its all-angle fraction.
import { angularPolarization } from './physics.js';

const C = { ink: '#e3edf0', muted: '#8c9fa9', cyan: '#55d9d0', amber: '#f5bc70', purple: '#b5a0ff', grid: '#526a78' };
const SIZE = 221;
const RANGE = 3;
const stops = [
  [0, [12, 24, 36]], [.22, [47, 41, 83]], [.48, [58, 104, 129]],
  [.7, [62, 186, 176]], [.87, [186, 219, 168]], [1, [255, 209, 128]],
];

/** Common logarithmic color ramp: black floor at 10^-4, warm peak at 1. */
export function angularMapColor(intensity) {
  const t = Math.max(0, Math.min(1, (Math.log10(Math.max(intensity, 1e-4)) + 4) / 4));
  let a = stops[0], b = stops[1];
  for (let i = 1; i < stops.length; i++) {
    b = stops[i]; a = stops[i - 1];
    if (t <= b[0]) break;
  }
  const f = (t - a[0]) / (b[0] - a[0]);
  return a[1].map((v, i) => Math.round(v + f * (b[1][i] - v)));
}

let maps;
function getMaps() {
  if (maps) return maps;
  maps = ['sigma', 'pi', 'total'].map(component => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const pixels = ctx.createImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const u = -RANGE + 2 * RANGE * x / (SIZE - 1);
      const v = RANGE - 2 * RANGE * y / (SIZE - 1);
      const color = angularMapColor(angularPolarization(u, v)[component]);
      const p = 4 * (y * SIZE + x);
      pixels.data[p] = color[0]; pixels.data[p + 1] = color[1];
      pixels.data[p + 2] = color[2]; pixels.data[p + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas;
  });
  return maps;
}

function text(ctx, value, x, y, color = C.muted, size = 12, align = 'left') {
  ctx.fillStyle = color; ctx.textAlign = align;
  ctx.font = `${size}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(value, x, y);
}
function line(ctx, x1, y1, x2, y2, color, width = 1, dash = []) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}

/** Render only angular-map mode; the existing ellipse renderer owns spectral mode. */
export function renderPolarization(ctx, w, h, id, state, time) {
  if (id !== 'polarization' || state.polarizationModel !== 'angular') return false;
  const theta = Math.max(-3, Math.min(3, state.theta ?? 0));
  const psi = Math.max(-3, Math.min(3, state.psi ?? .7));
  const horizontal = state.cut === 'horizontal';
  const selected = angularPolarization(theta, psi);
  const images = getMaps();
  const panels = [
    { title: 'σ · PARALLEL', component: 'sigma', color: C.cyan, share: 'All-angle power: 7/8' },
    { title: 'π · PERPENDICULAR', component: 'pi', color: C.amber, share: 'All-angle power: 1/8' },
    { title: 'σ + π · TOTAL', component: 'total', color: C.ink, share: 'All-angle power: 1' },
  ];
  ctx.save(); ctx.scale(w / 900, h / 400);
  text(ctx, 'Angular power in the two polarization planes', 32, 29, C.ink, 14);
  text(ctx, 'Local transverse acceleration · integrated over photon energy', 868, 29, C.muted, 10, 'right');
  const y = 87, size = 220;
  panels.forEach((panel, i) => {
    const x = 63 + i * 280;
    text(ctx, panel.title, x + size / 2, 60, panel.color, 12, 'center');
    ctx.drawImage(images[i], x, y, size, size);
    ctx.strokeStyle = '#587184'; ctx.lineWidth = 1; ctx.strokeRect(x, y, size, size);
    const px = x + (theta + RANGE) / (2 * RANGE) * size;
    const py = y + (RANGE - psi) / (2 * RANGE) * size;
    // Axes mark the exact nodal lines of the perpendicular component.
    line(ctx, x + size / 2, y, x + size / 2, y + size, '#a6bec333', 1, [2, 4]);
    line(ctx, x, y + size / 2, x + size, y + size / 2, '#a6bec333', 1, [2, 4]);
    if (horizontal) line(ctx, x, py, x + size, py, '#e3edf0bb', 1.2, [6, 3]);
    else line(ctx, px, y, px, y + size, '#e3edf0bb', 1.2, [6, 3]);
    // Ring rather than a filled dot keeps the chosen intensity visible underneath.
    ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.stroke();
    line(ctx, px - 8, py, px - 4, py, C.ink); line(ctx, px + 4, py, px + 8, py, C.ink);
    line(ctx, px, py - 8, px, py - 4, C.ink); line(ctx, px, py + 4, px, py + 8, C.ink);
    for (const tick of [-3, 0, 3]) {
      const tx = x + (tick + RANGE) / (2 * RANGE) * size;
      const ty = y + (RANGE - tick) / (2 * RANGE) * size;
      text(ctx, String(tick), tx, y + size + 16, C.muted, 10, 'center');
      text(ctx, String(tick), x - 10, ty + 3, C.muted, 10, 'right');
    }
    text(ctx, 'u = γθₓ', x + size / 2, y + size + 31, C.muted, 10, 'center');
    ctx.save(); ctx.translate(x - 34, y + size / 2); ctx.rotate(-Math.PI / 2);
    text(ctx, 'v = γθᵧ', 0, 0, C.muted, 10, 'center'); ctx.restore();
    text(ctx, panel.share, x + size / 2, 359, panel.color, 11, 'center');
    const value = selected[panel.component];
    text(ctx, `Selected ray: ${value < .001 && value > 0 ? value.toExponential(1) : value.toFixed(3)}`, x + size / 2, 376, C.muted, 10, 'center');
  });
  const bx = 245, by = 391, bw = 190;
  const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  for (let i = 0; i <= 20; i++) grad.addColorStop(i / 20, `rgb(${angularMapColor(10 ** (-4 + i / 5)).join(',')})`);
  text(ctx, 'SHARED LOG SCALE', 63, 395, C.muted, 9);
  ctx.fillStyle = grad; ctx.fillRect(bx, by, bw, 5);
  text(ctx, '10⁻⁴', bx - 5, 395, C.muted, 9, 'right');
  text(ctx, '1', bx + bw + 6, 395, C.muted, 9);
  text(ctx, `${horizontal ? 'Horizontal' : 'Vertical'} slice shown below · common peak reference = 1`, 868, 395, C.muted, 9, 'right');
  ctx.restore();
  return true;
}
