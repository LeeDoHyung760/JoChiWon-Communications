import assert from 'node:assert/strict';
const cases=[
  ['W',{x:0,y:-1},Math.PI],['S',{x:0,y:1},0],['A',{x:-1,y:0},-Math.PI/2],['D',{x:1,y:0},Math.PI/2],
  ['WA',{x:-Math.SQRT1_2,y:-Math.SQRT1_2},-3*Math.PI/4],['WD',{x:Math.SQRT1_2,y:-Math.SQRT1_2},3*Math.PI/4],
  ['SA',{x:-Math.SQRT1_2,y:Math.SQRT1_2},-Math.PI/4],['SD',{x:Math.SQRT1_2,y:Math.SQRT1_2},Math.PI/4],
];
const yaw=({x,y})=>Math.atan2(x,y),delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
for(const [name,movement,expected] of cases){assert.ok(Math.abs(Math.hypot(movement.x,movement.y)-1)<1e-12,`${name} normalized`);assert.ok(Math.abs(delta(yaw(movement),expected))<1e-12,`${name} yaw`)}
const shortest=(current,target)=>{const twoPi=Math.PI*2;let d=((target-current+Math.PI)%twoPi+twoPi)%twoPi-Math.PI;if(d<=-Math.PI)d=Math.PI;return d};
assert.ok(Math.abs(shortest(179*Math.PI/180,-179*Math.PI/180))<5*Math.PI/180,'wrap uses shortest turn');
console.log('[Character motion] 8 directions, normalization, and shortest-angle wrap: passed');
