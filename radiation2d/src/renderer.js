import { DIPOLE_ANGLE, dipoleFieldTail, travelingFieldTail, dipolePassDuration, dipoleState } from './physics.js';
// GPL-3.0-only. Geometry comes from the wavelet history, not a decorative trail.
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: false});
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width; this.height = rect.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.scale = Math.min(this.width, this.height) / 9;
  }
  worldPoint(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {x: (clientX-r.left-this.width/2)/this.scale,
      y: -(clientY-r.top-this.height/2)/this.scale};
  }
  draw(sim, options) {
    const ctx = this.ctx, w = this.width, h = this.height;
    if (!w || !h) return;
    this.scale = Math.min(w, h) / 9;
    const sx = x => w/2+x*this.scale;
    const sy = y => h/2-y*this.scale;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#061014'; ctx.fillRect(0,0,w,h);
    // Fixed laboratory reference grid.
    ctx.strokeStyle = '#102126'; ctx.lineWidth = .5;ctx.beginPath();
    const spacing = this.scale;
    const x0 = ((w/2)%spacing+spacing)%spacing;
    const y0 = ((h/2*this.scale)%spacing+spacing)%spacing;
    for(let x=x0;x<w;x+=spacing){ctx.moveTo(x,0);ctx.lineTo(x,h);}
    for(let y=y0;y<h;y+=spacing){ctx.moveTo(0,y);ctx.lineTo(w,y);}
    ctx.stroke();
    if(sim.path){
      const left=sx(sim.path.entryX),right=sx(sim.path.exitX);
      ctx.fillStyle='#a8bd6c08';ctx.fillRect(left,0,right-left,h);
      ctx.strokeStyle='#a8bd6c35';ctx.setLineDash([3,6]);ctx.beginPath();
      ctx.moveTo(left,60);ctx.lineTo(left,h-70);ctx.moveTo(right,60);ctx.lineTo(right,h-70);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#8ca079';ctx.font='9px monospace';ctx.textAlign='center';
      ctx.fillText('MAGNETIC REGION',w/2,80);
    }
    const history = sim.history;
    if (options.wave) {
      ctx.lineWidth = .8; ctx.strokeStyle = '#d7799a88';
      for(let i=0;i<history.length;i++) {
        const e=history[i];
        if (Math.round(e.time*120)%48 !== 0) continue;
        const radius=(sim.time-e.time)*this.scale;
        ctx.beginPath();ctx.arc(sx(e.x),sy(e.y),Math.max(0,radius),0,Math.PI*2);ctx.stroke();
      }
    }
    if (options.trail) {
      ctx.beginPath();
      if(sim.config.mode==='dipole') {
        const radius=sim.config.amplitude, cx=sx(-1), cy=sy(-1+radius);
        ctx.moveTo(sx(-3.5),sy(-1));ctx.lineTo(cx,sy(-1));
        ctx.arc(cx,cy,radius*this.scale,Math.PI/2,Math.PI/2-DIPOLE_ANGLE,true);
        const end=dipoleState(dipolePassDuration(sim.config),sim.config);
        ctx.lineTo(sx(end.x),sy(end.y));
      } else if(sim.path) {
        for(let i=0;i<=320;i++){
          const x=-sim.config.viewWidth/2+sim.config.viewWidth*i/320;
          const p=sim.path.atX(x);if(i===0)ctx.moveTo(sx(p.x),sy(p.y));else ctx.lineTo(sx(p.x),sy(p.y));
        }
      } else if(sim.config.mode==='oscillator') {
        ctx.moveTo(sx(0),sy(-sim.config.amplitude));ctx.lineTo(sx(0),sy(sim.config.amplitude));
      } else {
        for(let i=0;i<history.length;i+=3){const e=history[i];if(i===0)ctx.moveTo(sx(e.x),sy(e.y));else ctx.lineTo(sx(e.x),sy(e.y));}
        ctx.lineTo(sx(sim.particle.x),sy(sim.particle.y));
      }
      ctx.lineWidth=1;ctx.strokeStyle='#c5ba7280';ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);
    }
    if(options.field && history.length) {
      ctx.beginPath();
      const reach = Math.hypot(Math.abs(sim.particle.x)+w/(2*this.scale),
        Math.abs(sim.particle.y)+h/(2*this.scale));
      const fieldHistory = sim.config.mode === 'dipole'
        ? [...dipoleFieldTail(sim, reach), ...history]
        : sim.path ? [...travelingFieldTail(sim, reach), ...history] : history;
      const stride = sim.config.mode === 'dipole' || sim.path ? 1 : 2;
      const count=fieldHistory[0].kx.length;
      // Each polyline connects one rest-frame direction across past emissions.
      for(let j=0;j<count;j++) {
        ctx.moveTo(sx(sim.particle.x),sy(sim.particle.y));
        for(let i=fieldHistory.length-1;i>=0;i-=stride) {
          const e=fieldHistory[i], age=sim.time-e.time;
          ctx.lineTo(sx(e.x+age*e.kx[j]),sy(e.y+age*e.ky[j]));
        }
      }
      ctx.lineWidth=.95;ctx.strokeStyle='#36c9dfbb';ctx.stroke();
    }
    const x=sx(sim.particle.x),y=sy(sim.particle.y);
    const glow=ctx.createRadialGradient(x,y,1,x,y,24);
    glow.addColorStop(0,'#d6fbdc88');glow.addColorStop(.3,'#6ad6c52b');glow.addColorStop(1,'#6ad6c500');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e2efb7';ctx.beginPath();ctx.arc(x,y,4.5,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#edffd855';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();
    if(options.target) {
      ctx.strokeStyle='#d3e4b866';ctx.setLineDash([2,3]);ctx.beginPath();ctx.arc(sx(options.target.x),sy(options.target.y),12,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    }
  }
}
