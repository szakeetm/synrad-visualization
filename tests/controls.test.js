import test from 'node:test';
import assert from 'node:assert/strict';
import {controlPosition,controlValue} from '../src/controls.js';

const gamma={min:1,max:30,scale:'rapidity'};
test('Lorentz slider resolves the near-rest region instead of jumping to gamma 1.5',()=>{
  assert.equal(controlValue(0,gamma),1);
  assert.equal(controlValue(1000,gamma),30);
  assert.ok(controlValue(10,gamma)<1.001,'first 1% of travel stays very close to rest');
  assert.ok(controlValue(50,gamma)<1.025,'first 5% remains below beta 0.22');
  let previous=0;
  for(let p=0;p<=1000;p++){
    const value=controlValue(p,gamma);
    assert.ok(value>previous&&value>=1&&value<=30);
    assert.ok(Math.abs(controlPosition(value,gamma)-p)<1e-9);
    previous=value;
  }
});
test('linear controls retain their original values',()=>{
  for(const value of [-3,0,.25,5,100]){
    assert.equal(controlValue(value,{min:-3,max:100}),value);
    assert.equal(controlPosition(value,{min:-3,max:100}),value);
  }
});
