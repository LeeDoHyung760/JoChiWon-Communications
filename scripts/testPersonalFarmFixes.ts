import assert from 'node:assert/strict';
import test from 'node:test';
import {mirroredAcrossHouseX,moveToHouseFront} from '../src/game/personalFarmLayout';
import {normalizeFlowerNodeName} from '../src/services/flowerAssetNodes';
import {topFlowerInterests} from '../src/services/flowerInterestProfile';

test('garden node aliases normalize to the same name',()=>{
  assert.equal(normalizeFlowerNodeName('tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f002'),normalizeFlowerNodeName('tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f.002'));
});

test('bear statue mirrors the lake across the house X axis and stays in front',()=>{
  const house={x:1200,z:951},lake={x:1918,z:1233},front={x:0,z:1};
  const mirrored=moveToHouseFront(mirroredAcrossHouseX(house,lake),house,front,180);
  assert.deepEqual(mirrored,{x:482,z:1233});
  assert.equal(Math.abs(house.x-lake.x),Math.abs(house.x-mirrored.x));
});

test('farm flower selection uses the same shared Top 5 ordering',()=>{
  const records=['tulip','sunflower','hydrangea','camellia','iris'].map((flowerId,index)=>({flowerId,infoViewCount:1,totalInfoViewSeconds:index,nearbyVisitCount:1,totalNearbySeconds:0,revisitCount:0,interestScore:index}));
  assert.deepEqual(topFlowerInterests(records).map(item=>item.flowerId),['iris','camellia','hydrangea','sunflower','tulip']);
});
