import { reflectivity, transmission, specularFraction } from './physics.js';

const C = { ink: '#e3edf0', muted: '#8cabb9', cyan: '#55d9d0', amber: '#f5bc70', violet: '#b5a0ff' };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const mix = (a, b, t) => a + (b - a) * t;
const pct = n => `${(100 * n).toFixed(n < .001 ? 3 : 1)}%`;

function line(ctx, a, b, color, width = 1.5, alpha = 1, dash = []) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.globalAlpha = alpha;
  ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); ctx.restore();
}

function label(ctx, text, x, y, color = C.muted, size = 13, align = 'left') {
  ctx.save(); ctx.fillStyle = color; ctx.font = `${size}px system-ui, sans-serif`; ctx.textAlign = align;
  ctx.fillText(text, x, y); ctx.restore();
}

function dot(ctx, x, y, color, radius = 3, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function movingRay(ctx, a, b, time, color, alpha = 1, phase = 0, count = 5) {
  line(ctx, a, b, color, 1.5, alpha * .65);
  for (let i = 0; i < count; i++) {
    const t = ((time * .3 + i / count + phase) % 1 + 1) % 1;
    dot(ctx, mix(a[0], b[0], t), mix(a[1], b[1], t), color, 2.5, alpha);
  }
}

function surface(ctx, y, material, roughness = 0) {
  const amp = roughness * 4;
  ctx.save(); ctx.beginPath(); ctx.moveTo(85, y);
  for (let x = 85; x <= 815; x += 3) ctx.lineTo(x, y + amp * (.6 * Math.sin(x * .11) + .3 * Math.sin(x * .31) + .1 * Math.sin(x * .87)));
  ctx.lineTo(815, 355); ctx.lineTo(85, 355); ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, 355); g.addColorStop(0, '#344757'); g.addColorStop(1, '#152532');
  ctx.fillStyle = g; ctx.fill();
  ctx.beginPath();
  for (let x = 85; x <= 815; x += 3) {
    const py = y + amp * (.6 * Math.sin(x * .11) + .3 * Math.sin(x * .31) + .1 * Math.sin(x * .87));
    if (x === 85) ctx.moveTo(x, py); else ctx.lineTo(x, py);
  }
  ctx.strokeStyle = '#7891a2'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  label(ctx, `${material} surface`, 110, 331, C.ink);
}

function reflection(ctx, s, time) {
  const e = s.photon ?? 5, grazing = s.grazing ?? 5, mat = s.material ?? 'Cu';
  const R = clamp(reflectivity(e, grazing, mat), 0, 1);
  const angle = .15 + .45 * grazing / 40, hit = [450, 250];
  const left = [105, hit[1] - 345 * Math.tan(angle)], right = [795, hit[1] - 345 * Math.tan(angle)];
  surface(ctx, hit[1], mat);
  line(ctx, [450, 80], [450, 338], C.muted, 1, .45, [5, 6]);
  label(ctx, 'normal', 460, 94, C.muted, 11);
  movingRay(ctx, left, hit, time, C.cyan);
  movingRay(ctx, hit, right, time, C.amber, R, .1);
  // A finite absorbing body is assumed: the non-reflected branch is illustrative.
  movingRay(ctx, hit, [635, 344], time, C.violet, (1 - R) * .7, .4, 3);
  label(ctx, 'incident photons', left[0], left[1] - 18, C.cyan);
  label(ctx, `reflected · ${pct(R)}`, right[0], right[1] - 18, C.amber, 14, 'right');
  label(ctx, 'into material', 650, 318, C.violet, 12);
  ctx.save(); ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(...hit, 72, -angle, 0); ctx.stroke(); ctx.restore();
  label(ctx, `θ = ${grazing.toFixed(1)} mrad`, 530, 236, C.amber, 12);
  dot(ctx, ...hit, C.ink, 4);
  label(ctx, 'Grazing angle measured from the surface · angles exaggerated', 450, 385, C.muted, 12, 'center');
}

function penetration(ctx, s, time) {
  const e = s.photon ?? 5, thickness = s.thickness ?? 25, mat = s.material ?? 'Cu';
  const T = clamp(transmission(e, thickness, mat), 0, 1);
  const opticalDepth = -Math.log(Math.max(T, 1e-300));
  const left = 320, slabWidth = thickness <= 0 ? 0 : 65 + 220 * Math.sqrt(thickness / 500), right = left + slabWidth;
  const gradient = ctx.createLinearGradient(left, 0, Math.max(left + 1, right), 0);
  gradient.addColorStop(0, '#3a5364'); gradient.addColorStop(1, '#1c303f');
  ctx.save(); ctx.fillStyle = gradient; ctx.fillRect(left, 90, slabWidth, 225);
  ctx.strokeStyle = '#7193a5'; ctx.lineWidth = 1.4; ctx.strokeRect(left, 90, slabWidth, 225); ctx.restore();
  label(ctx, thickness > 0 ? `${mat} · ${thickness.toFixed(0)} µm` : 'No material · 0 µm', left + slabWidth / 2, 66, C.ink, 15, 'center');
  label(ctx, 'incident', 90, 66, C.cyan, 13);
  label(ctx, `transmitted · ${pct(T)}`, 805, 66, C.amber, 14, 'right');
  const rows = 21;
  for (let i = 0; i < rows; i++) {
    const y = 103 + i * 10;
    const u = (i + .5) / rows;
    const depth = opticalDepth > 0 ? -Math.log(1 - u) / opticalDepth : Infinity;
    const absorbed = depth < 1 && thickness > 0;
    const stop = absorbed ? left + depth * slabWidth : 810;
    line(ctx, [90, y], [left, y], C.cyan, 1, .15);
    if (!absorbed) line(ctx, [right, y], [810, y], C.amber, 1, .22);
    const p = ((time * .19 + i * .071) % 1 + 1) % 1;
    const x = 90 + p * 720;
    if (x <= stop) dot(ctx, x, y, x < left ? C.cyan : C.amber, 2.2, .85);
    else if (absorbed && x < stop + 70) dot(ctx, stop, y, C.violet, 3.5, 1 - (x - stop) / 70);
    if (absorbed) {
      ctx.save(); ctx.fillStyle = C.violet; ctx.globalAlpha = .3; ctx.beginPath();
      ctx.arc(stop, y, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  line(ctx, [left, 337], [right, 337], C.muted, 1);
  line(ctx, [left, 331], [left, 343], C.muted, 1);
  line(ctx, [right, 331], [right, 343], C.muted, 1);
  label(ctx, 'absorption events', left + 10, 370, C.violet, 12);
  label(ctx, 'Illustrative attenuation model · positions not to scale', 805, 385, C.muted, 12, 'right');
}

function rough(ctx, s, time) {
  const e = s.photon ?? 5, grazing = s.grazing ?? 5, sigma = s.roughness ?? .3, mat = s.material ?? 'Cu';
  const smooth = clamp(reflectivity(e, grazing, mat), 0, 1);
  const coherent = clamp(specularFraction(e, grazing, sigma), 0, 1);
  const R = smooth * coherent;
  const hit = [430, 252], angle = .2 + .28 * grazing / 40;
  surface(ctx, hit[1], mat, sigma);
  const a = [105, 252 - 325 * Math.tan(angle)];
  movingRay(ctx, a, hit, time, C.cyan);
  const end = [795, 252 - 365 * Math.tan(angle)];
  movingRay(ctx, hit, end, time, C.amber, R, .25);
  // The angular fan is qualitative, not a normalized redistribution of lost specular power.
  if (sigma > .005) {
    const spread = .02 + Math.min(sigma / 3, 1) * .48;
    for (let i = 0; i < 15; i++) {
      const theta = Math.max(.025, angle + spread * (i / 14 * 2 - 1));
      const length = Math.min(365 / Math.cos(theta), 205 / Math.sin(theta));
      const b = [hit[0] + length * Math.cos(theta), hit[1] - length * Math.sin(theta)];
      movingRay(ctx, hit, b, time * (1 + i * .013), C.violet, .06 + .13 * Math.min(sigma, 1), i * .13, 2);
    }
  }
  dot(ctx, ...hit, C.ink, 3.5);
  label(ctx, 'incident', 105, a[1] - 17, C.cyan);
  label(ctx, `specular · ${pct(R)}`, 795, 66, C.amber, 14, 'right');
  label(ctx, `RMS height σ = ${sigma.toFixed(2)} nm`, 110, 302, C.ink, 14);
  label(ctx, 'scattered directions', 590, 104, C.violet, 12);
  label(ctx, 'Qualitative scattering fan · diffuse intensity is not calculated', 450, 372, C.muted, 12, 'center');
  label(ctx, 'Surface height and angles exaggerated', 450, 392, C.muted, 11, 'center');
}

/** Draw material interactions in a 900×400 schematic coordinate system. */
export function renderMaterial(ctx, w, h, id, state, time) {
  const draw = { reflection, penetration, rough }[id];
  if (!draw) return false;
  ctx.save();
  const scale = Math.min(w / 900, h / 400);
  ctx.translate((w - 900 * scale) / 2, (h - 400 * scale) / 2); ctx.scale(scale, scale);
  draw(ctx, state, time); ctx.restore();
  return true;
}
