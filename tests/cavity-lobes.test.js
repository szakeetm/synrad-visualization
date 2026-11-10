import test from 'node:test';
import assert from 'node:assert/strict';
import {cavityLobeMesh} from '../src/cavity-lobes.js';
test('longitudinal lobe surfaces keep axial nulls and finite geometry at real beam energies',()=>{
  for(const g of [1,2,89237,356948]){
    const mesh=cavityLobeMesh(g,Math.max(1,g/2));
    assert.ok(mesh.faces.length>0);
    for(const row of mesh.vertices)for(const p of row){
      assert.ok(p.every(Number.isFinite));
    }
    assert.ok(mesh.vertices[0].every(p=>Math.hypot(...p)<1e-12));
    assert.ok(mesh.vertices.at(-1).every(p=>Math.hypot(...p)<1e-12));
  }
});
test('transverse zoom changes only transverse geometry, preserving power and the forward axis',()=>{
  const plain=cavityLobeMesh(89237,1),zoom=cavityLobeMesh(89237,40000);
  for(let i=0;i<plain.vertices.length;i++)for(let j=0;j<plain.vertices[i].length;j++){
    const a=plain.vertices[i][j],b=zoom.vertices[i][j];
    assert.equal(a[0],b[0]);
    assert.ok(Math.abs(a[1]*40000-b[1])<1e-10);
    assert.ok(Math.abs(a[2]*40000-b[2])<1e-10);
  }
});
