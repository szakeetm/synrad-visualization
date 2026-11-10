// Source geometries are schematic; time controls animation only.
import { dipoleProperties, quadrupoleField } from './physics.js';

const C = { cyan: '#55d9d0', amber: '#f5bc70', purple: '#b5a0ff', ink: '#e3edf0', muted: '#8c9fa9', grid: '#293e49' };
const TAU = Math.PI * 2;
function text(ctx, value, x, y, color = C.muted, size = 12, align = 'left') {
  ctx.fillStyle = color; ctx.font = `${size}px system-ui, sans-serif`; ctx.textAlign = align; ctx.fillText(value, x, y);
}
function line(ctx, points, color = C.grid, width = 1, dash = []) {
  ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
}
function arrow(ctx, x, y, dx, dy, color = C.purple, width = 1.4) {
  const length = Math.hypot(dx, dy); if (length < .01) return;
  const a = Math.atan2(dy, dx), ex = x + dx, ey = y + dy, head = Math.min(5, length / 3);
  line(ctx, [[x, y], [ex, ey]], color, width);
  line(ctx, [[ex - head * Math.cos(a - .5), ey - head * Math.sin(a - .5)], [ex, ey], [ex - head * Math.cos(a + .5), ey - head * Math.sin(a + .5)]], color, width);
}
function dot(ctx, x, y, r, color = C.cyan, glow = false) {
  ctx.save(); ctx.fillStyle = color; if (glow) { ctx.shadowBlur = 13; ctx.shadowColor = color; }
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}
const number = n => n === Infinity ? '∞' : n !== 0 && Math.abs(n) < .01 ? n.toExponential(1) : n.toFixed(n < 10 ? 2 : 1);

function dipole(ctx, s, time) {
  const E = s.energy ?? 3, B = s.field ?? .2, L = s.length ?? 1, I = s.current ?? 100;
  const p = dipoleProperties(E, B, L, I);
  text(ctx, 'A uniform field turns the beam; photons leave on tangents', 30, 32, C.ink, 14);
  text(ctx, 'Top view · bend angle exaggerated', 870, 54, C.muted, 11, 'right');
  const x0 = 120, y0 = 245, span = 490;
  // A monotonic display mapping keeps extreme physical bends inside the scene.
  const bend = B > 0 ? .48 * (1 - Math.exp(-p.bendMrad / 90)) : 0;
  const orbit = f => bend > 1e-8
    ? [x0 + span * Math.sin(bend * f) / bend, y0 - span * (1 - Math.cos(bend * f)) / bend]
    : [x0 + span * f, y0];
  ctx.fillStyle = '#55d9d00a'; ctx.fillRect(115, 85, 515, 240);
  ctx.strokeStyle = '#34545d'; ctx.lineWidth = 1; ctx.setLineDash([5, 6]); ctx.strokeRect(115, 85, 515, 240); ctx.setLineDash([]);
  text(ctx, 'UNIFORM DIPOLE FIELD', 132, 110, C.muted, 10);
  if (B > 0) for (let x = 155; x < 620; x += 72) for (let y = 140; y < 310; y += 72) {
    ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.strokeStyle = '#b5a0ff55'; ctx.stroke();
    dot(ctx, x, y, 1.6, '#b5a0ff77');
  }
  const points = Array.from({ length: 101 }, (_, i) => orbit(i / 100));
  line(ctx, [[45, y0], [x0, y0]], C.cyan, 2.8); line(ctx, points, C.cyan, 2.8);
  const exit = orbit(1); line(ctx, [exit, [exit[0] + 145 * Math.cos(bend), exit[1] - 145 * Math.sin(bend)]], C.cyan, 2.8);
  arrow(ctx, 58, y0, 35, 0, C.cyan, 2);
  if (B > 0) for (let i = 0; i < 9; i++) {
    const f = .1 + .1 * i, [x, y] = orbit(f), a = bend * f;
    const endX = 845, length = (endX - x) / Math.cos(a), endY = y - length * Math.sin(a);
    ctx.save(); ctx.globalAlpha = .22; line(ctx, [[x, y], [endX, endY]], C.amber); ctx.restore();
    const q = (time * .3 + i * .117) % 1;
    const px = x + length * q * Math.cos(a), py = y - length * q * Math.sin(a);
    if (py > 74 && py < 323) dot(ctx, px, py, 2.3, C.amber, true);
  }
  const f = (time * .2) % 1, beam = orbit(f); dot(ctx, ...beam, 5, C.cyan, true);
  text(ctx, B === 0 ? 'B = 0: straight beam, no SR from this magnet' : `B = ${number(B)} T · ⊙ field out of page`, 132, 310, B === 0 ? C.ink : C.purple, 12);
  text(ctx, `ρ = ${number(p.radius)} m`, 56, 354, C.ink, 14);
  text(ctx, `Δθ = ${number(p.bendMrad)} mrad`, 308, 354, C.ink, 14);
  text(ctx, `magnet length ${number(L)} m`, 615, 354, C.muted, 12);
  text(ctx, 'Radiation brightness and visible photon count are schematic.', 56, 382, C.muted, 11);
}

function quadrupole(ctx, s, time) {
  const G = s.gradient ?? 10, sigma = s.sigma ?? .5, offset = s.offset ?? 0;
  text(ctx, 'A quadrupole has no field on its magnetic axis', 30, 32, C.ink, 14);
  text(ctx, 'Transverse cross-section · electron travels out of page (+z)', 30, 55, C.muted, 11);
  const cx = 240, cy = 212, scale = 28; // Fixed mm-to-display scale preserves offset/size comparisons.
  ctx.beginPath(); ctx.arc(cx, cy, 133, 0, TAU); ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.stroke();
  line(ctx, [[cx - 150, cy], [cx + 150, cy]], C.grid, 1, [4, 5]);
  line(ctx, [[cx, cy - 140], [cx, cy + 140]], C.grid, 1, [4, 5]);
  text(ctx, 'x →', cx + 155, cy + 4, C.muted, 11); text(ctx, 'y ↑', cx + 8, cy - 140, C.muted, 11);
  for (let ix = -3; ix <= 3; ix++) for (let iy = -3; iy <= 3; iy++) {
    if (!ix && !iy) continue;
    const field = quadrupoleField(G, ix, iy), size = G === 0 ? 0 : Math.min(24, field.magnitude * 500);
    const norm = field.magnitude || 1;
    arrow(ctx, cx + ix * scale, cy - iy * scale, field.bx / norm * size, -field.by / norm * size, '#b5a0ff88', 1);
  }
  // Gaussian quantiles sampled deterministically, not Monte Carlo noise.
  const beamX = cx + offset * scale;
  ctx.save(); ctx.strokeStyle = '#55d9d066'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(beamX, cy, 2 * sigma * scale, 0, TAU); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 88; i++) {
    const r = sigma * Math.sqrt(-2 * Math.log((i + .5) / 88));
    const a = i * 2.39996323, x = offset + r * Math.cos(a), y = r * Math.sin(a);
    const field = quadrupoleField(G, x, y), strength = Math.min(1, field.magnitude / .08);
    dot(ctx, cx + x * scale, cy - y * scale, 1.5, C.cyan);
    if (G > 0) {
      const phase = (time * .55 + i * .173) % 1;
      if (phase < .28) {
        ctx.save(); ctx.globalAlpha = (1 - phase / .28) * strength;
        dot(ctx, cx + x * scale, cy - y * scale, 2 + 5 * phase, C.amber, true); ctx.restore();
      }
    }
  }
  dot(ctx, cx, cy, 3.5, C.ink); text(ctx, 'magnetic axis', cx - 44, cy + 24, C.ink, 10);
  text(ctx, `σ = ${number(sigma)} mm`, 105, 366, C.cyan, 12);
  text(ctx, `offset = ${number(offset)} mm`, 265, 366, C.cyan, 12);
  line(ctx, [[450, 81], [450, 354]], C.grid);
  text(ctx, 'FORCE ON AN ELECTRON', 500, 102, C.muted, 10);
  const fx = 665, fy = 169;
  line(ctx, [[fx - 108, fy], [fx + 108, fy]], C.grid);
  line(ctx, [[fx, fy - 48], [fx, fy + 48]], C.grid);
  if (G > 0) {
    arrow(ctx, fx - 100, fy, 65, 0, C.cyan, 2); arrow(ctx, fx + 100, fy, -65, 0, C.cyan, 2);
    arrow(ctx, fx, fy - 20, 0, -40, C.amber, 2); arrow(ctx, fx, fy + 20, 0, 40, C.amber, 2);
  }
  text(ctx, G === 0 ? 'No gradient → no transverse force' : 'x focuses · y defocuses', fx, 254, C.ink, 14, 'center');
  text(ctx, 'Bₓ = −Gy     Bᵧ = −Gx', fx, 291, C.purple, 17, 'center');
  text(ctx, 'local SR power ∝ |B|² ∝ x² + y²', fx, 321, C.amber, 14, 'center');
  text(ctx, 'A finite beam radiates even when centered.', fx, 346, C.muted, 12, 'center');
  text(ctx, 'Purple: magnetic field · cyan/amber arrows: force · source plane, not a downstream footprint', 450, 393, C.muted, 10, 'center');
}

export function renderMagnet(ctx, w, h, id, state, time) {
  const renderer = { dipole, quadrupole }[id]; if (!renderer) return false;
  ctx.save(); ctx.scale(w / 900, h / 400); renderer(ctx, state, time); ctx.restore(); return true;
}
