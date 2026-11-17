import {renderQuadrupole} from './quadrupole-scene.js';
// Source geometries are schematic; time controls animation only.
import { dipoleProperties } from './physics.js';

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

export function renderMagnet(ctx, w, h, id, state, time) {
  if(id==='quadrupole')return renderQuadrupole(ctx,w,h,state,time);
  const renderer = { dipole }[id]; if (!renderer) return false;
  ctx.save(); ctx.scale(w / 900, h / 400); renderer(ctx, state, time); ctx.restore(); return true;
}
