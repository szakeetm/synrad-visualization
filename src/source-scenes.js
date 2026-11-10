// Teaching diagrams use exaggerated transverse scales so the radiation remains
// visible. All motion is a pure function of time, allowing a true pause.
import { vertical } from './physics.js';
import { renderFrames } from './frame-scenes.js';

const C = { cyan: '#55d9d0', amber: '#f5bc70', purple: '#b5a0ff', text: '#e3edf0', dim: '#8c9fa9', grid: '#253944' };
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function line(ctx, points, color = C.dim, width = 1, dash = []) {
  ctx.beginPath(); ctx.setLineDash(dash); ctx.lineWidth = width; ctx.strokeStyle = color;
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.stroke(); ctx.setLineDash([]);
}
function text(ctx, label, x, y, color = C.dim, size = 13, align = 'left') {
  ctx.fillStyle = color; ctx.font = `${size}px ui-sans-serif, system-ui, sans-serif`; ctx.textAlign = align; ctx.fillText(label, x, y);
}
function dot(ctx, x, y, r, color = C.cyan, glow = false) {
  ctx.save(); if (glow) { ctx.shadowBlur = 20; ctx.shadowColor = color; }
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}
function arrow(ctx, x1, y1, x2, y2, color = C.dim, width = 1.5) {
  line(ctx, [[x1, y1], [x2, y2]], color, width);
  const a = Math.atan2(y2 - y1, x2 - x1), s = 6;
  line(ctx, [[x2 - s * Math.cos(a - .5), y2 - s * Math.sin(a - .5)], [x2, y2], [x2 - s * Math.cos(a + .5), y2 - s * Math.sin(a + .5)]], color, width);
}
function wave(ctx, x1, y1, x2, y2, time, color, amplitude = 5, count = 10) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
  if (!length) return;
  const points = [];
  for (let i = 0; i <= 150; i++) {
    const f = i / 150, s = amplitude * Math.sin(f * count * TAU - time * 6) * Math.sin(Math.PI * f);
    points.push([x1 + f * dx - dy / length * s, y1 + f * dy + dx / length * s]);
  }
  line(ctx, points, color, 1.8);
}
function heading(ctx, left, right) {
  text(ctx, left, 32, 34, C.text, 14);
  if (right) text(ctx, right, 868, 34, C.dim, 11, 'right');
}
function guide(ctx) {
  for (let x = 50; x < 900; x += 50) for (let y = 65; y < 380; y += 50) dot(ctx, x, y, .65, '#29404a');
}

function spectrumScene(ctx, s, t) {
  heading(ctx, 'A bend turns electrons. Light carries on.', 'Geometry schematic · wavelength exaggerated');
  const cx = 300, cy = 420, radius = 235;
  const trajectory = [];
  for (let i = 0; i <= 100; i++) { const a = -2.35 + i / 100 * 1.2; trajectory.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]); }
  line(ctx, trajectory, C.cyan, 3);
  text(ctx, 'electron orbit', 64, 327, C.cyan);
  for (let i = 0; i < 7; i++) {
    const a = -2.23 + i * .14, x = cx + radius * Math.cos(a), y = cy + radius * Math.sin(a);
    const dx = -Math.sin(a), dy = Math.cos(a), length = 225 + i * 30;
    ctx.globalAlpha = .2;
    line(ctx, [[x, y], [x + length * dx, y + length * dy]], C.amber, 1);
    ctx.globalAlpha = 1;
    const f = (t * .22 + i * .137) % 1;
    const px = x + length * dx * f, py = y + length * dy * f;
    wave(ctx, px, py, px + 42 * dx, py + 42 * dy, t, i % 2 ? C.amber : C.purple, 4, 2 + (s.energy || 3) / 4);
  }
  const a = -2.35 + ((t * .18) % 1) * 1.2;
  dot(ctx, cx + radius * Math.cos(a), cy + radius * Math.sin(a), 6, C.cyan, true);
  text(ctx, 'Tangential emission', 560, 125, C.amber, 14);
  text(ctx, 'Higher electron energy shifts the', 560, 155);
  text(ctx, 'photon spectrum toward harder X-rays.', 560, 177);
  const ec = 2.218 * (s.energy || 3) ** 3 / (s.rho || 10);
  text(ctx, `E꜀ = ${ec < 10 ? ec.toFixed(2) : ec.toFixed(0)} keV`, 560, 231, C.text, 30);
  text(ctx, 'at the selected bend radius', 560, 257);
  line(ctx, [[560, 280], [835, 280]], C.grid);
  text(ctx, 'SOFTER', 560, 307, C.dim, 10); text(ctx, 'HARDER', 835, 307, C.dim, 10, 'right');
  const grad = ctx.createLinearGradient(560, 0, 835, 0); grad.addColorStop(0, C.amber); grad.addColorStop(.5, C.cyan); grad.addColorStop(1, C.purple);
  ctx.fillStyle = grad; ctx.fillRect(560, 317, 275, 4);
}

function framesScene(ctx, s, t) {
  renderFrames(ctx, 900, 400, s, t);
}

function verticalScene(ctx, s, t) {
  heading(ctx, 'A thin sheet of light around the orbit plane', 'Transverse scale exaggerated');
  const ratio = s.ratio || 1, energy = s.energy || 3;
  const width = clamp(37 * (3 / energy) ** .55 * ratio ** (-.32), 5, 105);
  const x0 = 150, y = 210, xd = 715;
  ctx.fillStyle = '#162c36'; ctx.beginPath(); ctx.moveTo(78, 230); ctx.lineTo(667, 183); ctx.lineTo(824, 240); ctx.lineTo(198, 293); ctx.closePath(); ctx.fill();
  line(ctx, [[80, 230], [820, 230]], '#405c67', 1, [5, 6]);
  text(ctx, 'orbit plane', 92, 318, C.dim);
  ctx.fillStyle = '#162b34'; ctx.fillRect(xd, 77, 48, 267);
  for (let j = -120; j <= 120; j++) {
    const v = Math.exp(-.5 * (j / width) ** 2);
    ctx.fillStyle = `rgba(85,217,208,${v})`; ctx.fillRect(xd + 3, y + j, 42, 1.2);
  }
  ctx.strokeStyle = '#46606a'; ctx.strokeRect(xd, 77, 48, 267);
  for (let i = 0; i < 23; i++) {
    const v = (i - 11) / 11, dy = v * width * 2.2;
    ctx.globalAlpha = Math.exp(-v * v * 3) * .55;
    line(ctx, [[x0, y], [xd, y + dy]], C.cyan, 1);
    ctx.globalAlpha = 1;
    const f = (t * .4 + i * .115) % 1;
    dot(ctx, x0 + f * (xd - x0), y + f * dy, 1.8, i % 4 ? C.cyan : C.amber);
  }
  dot(ctx, x0, y, 6, C.cyan, true);
  arrow(ctx, 790, y, 790, y - width * 2, C.amber);
  arrow(ctx, 790, y, 790, y + width * 2, C.amber);
  text(ctx, 'vertical', 801, 212, C.amber, 12);
  text(ctx, 'detector', xd + 24, 367, C.dim, 12, 'center');
  text(ctx, 'The cone narrows as γ increases.', 270, 100, C.text, 16);
  text(ctx, 'Harder photons stay closer to the orbit plane.', 270, 126);
}

function horizontalScene(ctx, s, t) {
  heading(ctx, 'The horizontal fan follows the magnet’s bend', 'Top view · angles exaggerated');
  const bend = s.bend || 30, spread = .07 + bend / 300, R = 250;
  const start = -spread / 2, end = spread / 2, center = [220, -40];
  const orbit = a => [center[0] + R * Math.sin(a), center[1] + R * Math.cos(a)];
  const detectorY = a => { const [x, y] = orbit(a); return y - (760 - x) * Math.tan(a); };
  const trajectory = [];
  for (let i = 0; i <= 80; i++) trajectory.push(orbit(start + (end - start) * i / 80));
  line(ctx, trajectory, C.cyan, 4);
  const fanTop = detectorY(end), fanBottom = detectorY(start);
  ctx.fillStyle = '#55d9d010'; ctx.beginPath(); ctx.moveTo(220, 210); ctx.lineTo(760, fanTop); ctx.lineTo(760, fanBottom); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 17; i++) {
    const f = i / 16, a = start + (end - start) * f;
    const [x, y] = orbit(a), yEnd = detectorY(a);
    line(ctx, [[x, y], [760, yEnd]], '#55d9d04a', 1);
    const u = (t * .3 + i * .08) % 1;
    dot(ctx, x + (760 - x) * u, y + (yEnd - y) * u, 2, C.amber);
  }
  line(ctx, [[760, 65], [760, 333]], '#5b7882', 3);
  line(ctx, [[750, fanTop], [785, fanTop]], C.amber, 1.5); line(ctx, [[750, fanBottom], [785, fanBottom]], C.amber, 1.5);
  arrow(ctx, 785, 210, 785, fanTop, C.amber); arrow(ctx, 785, 210, 785, fanBottom, C.amber);
  text(ctx, 'fan', 801, 215, C.amber);
  text(ctx, 'bending magnet', 98, 322, C.cyan);
  text(ctx, 'Each orbit tangent points somewhere new.', 372, 338, C.text, 14);
  text(ctx, `Bend: ${bend.toFixed(0)} mrad`, 372, 364, C.dim, 12);
}

let polarizationCache = { key: '', ratio: 0 };
function polarizationScene(ctx, s, t) {
  const psi = s.psi || 0, ratio = s.ratio || 1;
  const key = `${psi}:${ratio}`;
  if (key !== polarizationCache.key) {
    const components = vertical(psi, ratio);
    polarizationCache = { key, ratio: Math.sign(psi) * Math.sqrt(components.pi / Math.max(components.sigma, 1e-300)) };
  }
  const ellipticity = polarizationCache.ratio;
  heading(ctx, 'Two field components trace a polarization ellipse', 'Wave and ellipse schematic · observation angle γψ');
  const x0 = 75, x1 = 585, yc = 205, amp = 65;
  arrow(ctx, x0 - 20, yc, x1 + 30, yc, '#4d6470');
  const sig = [], pi = [], combined = [];
  for (let i = 0; i <= 240; i++) {
    const f = i / 240, phase = f * TAU * 3 - t * 3;
    const ex = amp * Math.cos(phase), ey = amp * ellipticity * Math.sin(phase), x = x0 + f * (x1 - x0);
    sig.push([x, yc - ex]); pi.push([x, yc - ey]); combined.push([x + ey * .34, yc - ex]);
    if (i % 12 === 0) line(ctx, [[x, yc], [x + ey * .34, yc - ex]], '#b5a0ff45', 1);
  }
  line(ctx, sig, C.cyan, 1.7); line(ctx, pi, C.amber, 1.7); line(ctx, combined, '#d8c9ff', 2.3);
  text(ctx, 'σ: electric field in the orbit plane', 80, 320, C.cyan, 12);
  text(ctx, 'π: electric field perpendicular to it', 80, 344, C.amber, 12);
  const cx = 750, cy = 205;
  line(ctx, [[cx - 90, cy], [cx + 90, cy]], C.grid); line(ctx, [[cx, cy - 90], [cx, cy + 90]], C.grid);
  const ellipse = [];
  for (let i = 0; i <= 100; i++) { const a = i / 100 * TAU; ellipse.push([cx + amp * Math.cos(a), cy - amp * ellipticity * Math.sin(a)]); }
  line(ctx, ellipse, C.purple, 2.5);
  const phase = -t * 3, px = cx + amp * Math.cos(phase), py = cy - amp * ellipticity * Math.sin(phase);
  arrow(ctx, cx, cy, px, py, C.text, 2); dot(ctx, px, py, 5, C.purple, true);
  text(ctx, 'LOOKING ALONG THE BEAM', cx, 90, C.dim, 10, 'center');
  text(ctx, Math.abs(psi) < .03 ? 'Linear on-axis' : psi > 0 ? 'Elliptical · above orbit' : 'Elliptical · below orbit', cx, 320, C.text, 14, 'center');
  text(ctx, 'Handedness reverses across the orbit plane.', cx, 345, C.dim, 11, 'center');
}

function insertionScene(ctx, s, t) {
  const k = s.K || 1, n = Math.round(s.periods || 20), period = s.period || 30;
  heading(ctx, k <= 1 ? 'Undulator: overlapping cones can interfere' : 'Toward the wiggler regime: a wider fan', 'Planar device · transverse motion exaggerated');
  const x0 = 65, x1 = 745, y = 210, cycles = clamp(n / 4, 3, 8), amplitude = 5 + Math.min(k, 8) * 4.5;
  const blockW = (x1 - x0) / (cycles * 2), blocks = Math.round(cycles * 2);
  for (let i = 0; i < blocks; i++) {
    const x = x0 + i * blockW + 3, odd = i % 2;
    ctx.fillStyle = odd ? '#b5a0ff35' : '#55d9d035'; ctx.fillRect(x, 108, blockW - 6, 36);
    ctx.fillStyle = odd ? '#55d9d035' : '#b5a0ff35'; ctx.fillRect(x, 277, blockW - 6, 36);
    text(ctx, odd ? 'S' : 'N', x + (blockW - 6) / 2, 131, odd ? C.purple : C.cyan, 12, 'center');
    text(ctx, odd ? 'N' : 'S', x + (blockW - 6) / 2, 300, odd ? C.cyan : C.purple, 12, 'center');
    if (i % 2 === 0) arrow(ctx, x + blockW / 2, 150, x + blockW / 2, 175, '#5a6d78');
    else arrow(ctx, x + blockW / 2, 175, x + blockW / 2, 150, '#5a6d78');
  }
  line(ctx, [[35, y], [855, y]], C.grid, 1, [4, 6]);
  const pts = [];
  for (let i = 0; i <= 450; i++) { const f = i / 450; pts.push([x0 + f * (x1 - x0), y + amplitude * Math.sin(f * cycles * TAU)]); }
  line(ctx, pts, C.cyan, 2.5);
  const f = (t * .13) % 1, ex = x0 + f * (x1 - x0), ey = y + amplitude * Math.sin(f * cycles * TAU);
  dot(ctx, ex, ey, 5.5, C.cyan, true);
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * .018 * Math.max(k, .5), from = 410 + i * 21, yy = y + amplitude * Math.sin((from - x0) / (x1 - x0) * cycles * TAU);
    ctx.globalAlpha = .45;
    wave(ctx, from, yy, 860, y + Math.tan(a) * 300, t - i * .2, C.amber, 3, 9);
    ctx.globalAlpha = 1;
  }
  text(ctx, `λᵤ = ${period.toFixed(0)} mm`, 82, 357, C.dim, 12);
  text(ctx, `${n} periods`, 292, 357, C.dim, 12);
  text(ctx, `K = ${k.toFixed(2)}`, 455, 357, C.text, 14);
  text(ctx, 'photons →', 834, 248, C.amber, 12, 'center');
}

/** Draw a source experiment using a fixed 900×400 diagram coordinate system. */
export function renderSource(ctx, w, h, id, state, time) {
  const renderers = { spectrum: spectrumScene, frames: framesScene, vertical: verticalScene, horizontal: horizontalScene, polarization: polarizationScene, insertion: insertionScene };
  const renderer = renderers[id];
  if (!renderer) return false;
  ctx.save();
  ctx.scale(w / 900, h / 400);
  guide(ctx);
  renderer(ctx, state, time);
  ctx.restore();
  return true;
}
