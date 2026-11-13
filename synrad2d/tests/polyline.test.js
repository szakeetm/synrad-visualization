import test from 'node:test';
import assert from 'node:assert/strict';
import {simplifyPolyline} from '../src/polyline.js';

function simplify(points,tolerance) {
  const x=Float64Array.from(points,p=>p[0]),y=Float64Array.from(points,p=>p[1]);
  const keep=new Uint8Array(points.length),stack=new Int32Array(points.length*2);
  simplifyPolyline(x,y,points.length,tolerance,keep,stack);
  return points.map((_,i)=>i).filter(i=>keep[i]);
}

test('simplification retains endpoints and sharp bends including a closed path',()=>{
  assert.deepEqual(simplify([[0,0],[1,0],[2,0],[2,2],[0,0]],.35),[0,2,3,4]);
  assert.deepEqual(simplify([[0,0],[0,0],[0,0]],.35),[0,2]);
  assert.deepEqual(simplify([[1,1]],.35),[0]);
  assert.deepEqual(simplify([],.35),[]);
});

test('every removed point stays within the requested pixel tolerance of its replacement segment',()=>{
  const points=Array.from({length:1801},(_,i)=>[i/3,50*Math.sin(i/40)+4*Math.cos(i/7)]);
  for(const tolerance of [.35,1]){
    const indices=simplify(points,tolerance);
    assert.ok(indices.length<points.length/4);
    for(let n=1;n<indices.length;n++){
      const a=points[indices[n-1]],b=points[indices[n]],dx=b[0]-a[0],dy=b[1]-a[1];
      for(let i=indices[n-1]+1;i<indices[n];i++){
        const p=points[i],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));
        assert.ok(Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<=tolerance+1e-9);
      }
    }
  }
});
