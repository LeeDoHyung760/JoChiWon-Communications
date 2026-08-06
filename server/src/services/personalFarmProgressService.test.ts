import assert from 'node:assert/strict';
import {after,before,beforeEach,test} from 'node:test';
import express from 'express';
import mongoose from 'mongoose';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {PersonalFarmProgressModel} from '../models/PersonalFarmProgress.js';
import {UserModel} from '../models/User.js';
import {BEAR_FEED_IDS,BEAR_FEED_SPOT_IDS,GARDEN_FLOWER_IDS,GARDEN_PLANTABLE_FLOWER_IDS} from '../../../shared/personal-farm.js';
import {collectBearFeed,collectGardenFlower,completeBearFeedSpot,feedBear,getOrCreatePersonalFarmProgress,plantGardenFlower} from './personalFarmProgressService.js';

let mongo:MongoMemoryServer;
before(async()=>{mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri(),{dbName:'personal-farm-test'})});
beforeEach(async()=>{await Promise.all([PersonalFarmProgressModel.deleteMany({}),UserModel.deleteMany({})])});
after(async()=>{await mongoose.disconnect();await mongo.stop()});

test('progress documents are isolated by authenticated user id',async()=>{
  const first=new mongoose.Types.ObjectId().toString(),second=new mongoose.Types.ObjectId().toString();
  await collectGardenFlower(first,'tulip');await getOrCreatePersonalFarmProgress(second);
  const firstProgress=await PersonalFarmProgressModel.findOne({userId:first}).orFail(),secondProgress=await PersonalFarmProgressModel.findOne({userId:second}).orFail();
  assert.deepEqual(firstProgress.gardenMission.collectedFlowerIds,['tulip']);assert.deepEqual(secondProgress.gardenMission.collectedFlowerIds,[]);
});

test('duplicate flower collection is rejected',async()=>{const userId=new mongoose.Types.ObjectId().toString();await collectGardenFlower(userId,'tulip');await assert.rejects(()=>collectGardenFlower(userId,'tulip'),{code:'FLOWER_ALREADY_COLLECTED'})});
test('an uncollected flower cannot be planted',async()=>{const userId=new mongoose.Types.ObjectId().toString();await assert.rejects(()=>plantGardenFlower(userId,'iris'),{code:'FLOWER_NOT_COLLECTED'})});
test('a feed spot cannot be completed before collecting feed',async()=>{const userId=new mongoose.Types.ObjectId().toString();await assert.rejects(()=>completeBearFeedSpot(userId,'BEAR_FEED_SPOT_01'),{code:'FEED_NOT_COLLECTED'})});
test('the same feed spot cannot be completed twice',async()=>{const userId=new mongoose.Types.ObjectId().toString();await collectBearFeed(userId,'apple');await completeBearFeedSpot(userId,'BEAR_FEED_SPOT_01');await assert.rejects(()=>completeBearFeedSpot(userId,'BEAR_FEED_SPOT_01'),{code:'FEED_SPOT_ALREADY_COMPLETED'})});

async function completeGarden(userId:string){for(const flower of GARDEN_FLOWER_IDS)await collectGardenFlower(userId,flower);for(const flower of GARDEN_PLANTABLE_FLOWER_IDS.slice(0,5))await plantGardenFlower(userId,flower)}

test('planting a sixth collected flower replaces the oldest of five slots',async()=>{
  const userId=new mongoose.Types.ObjectId().toString(),flowers=GARDEN_PLANTABLE_FLOWER_IDS.slice(0,6);
  for(const flower of flowers){await collectGardenFlower(userId,flower);await plantGardenFlower(userId,flower)}
  const progress=await getOrCreatePersonalFarmProgress(userId);
  assert.deepEqual(progress.gardenMission.plantedFlowerIds,flowers.slice(1));
});

test('both garden trees are collectible but cannot occupy flower-bed slots',async()=>{
  const userId=new mongoose.Types.ObjectId().toString();
  await collectGardenFlower(userId,'peach-tree');await collectGardenFlower(userId,'maple-tree');
  const progress=await getOrCreatePersonalFarmProgress(userId);
  assert.deepEqual(progress.gardenMission.collectedFlowerIds,['peach-tree','maple-tree']);
  await assert.rejects(()=>plantGardenFlower(userId,'peach-tree'),{code:'FLOWER_NOT_PLANTABLE'});
});
async function completeBearMission(userId:string){for(const feed of BEAR_FEED_IDS)await collectBearFeed(userId,feed);for(const spot of BEAR_FEED_SPOT_IDS)await completeBearFeedSpot(userId,spot);await feedBear(userId)}

test('completing only one location keeps the farm locked',async()=>{
  const userId=new mongoose.Types.ObjectId().toString();
  await completeGarden(userId);
  const progress=await getOrCreatePersonalFarmProgress(userId);
  assert.equal(progress.gardenMission.completed,true);
  assert.equal(progress.bearMission.completed,false);
  assert.equal(progress.farm.unlocked,false);
  assert.deepEqual(progress.farm.unlockedRewardIds,['flower-garden']);
});

test('bear completion unlocks the statue without completing the flower mission',async()=>{
  const userId=new mongoose.Types.ObjectId().toString();
  await completeBearMission(userId);
  const progress=await getOrCreatePersonalFarmProgress(userId);
  assert.equal(progress.bearMission.completed,true);
  assert.equal(progress.gardenMission.completed,false);
  assert.equal(progress.farm.unlocked,false);
  assert.equal(progress.farm.unlockedRewardIds.includes('bear-statue'),true);
  assert.equal(progress.farm.unlockedRewardIds.includes('flower-garden'),false);
});

test('completion and rewards are derived only after both locations are complete',async()=>{
  const userId=new mongoose.Types.ObjectId().toString();
  await completeGarden(userId);await completeBearMission(userId);
  const progress=await getOrCreatePersonalFarmProgress(userId);
  assert.equal(progress.gardenMission.completed,true);assert.equal(progress.bearMission.completed,true);assert.equal(progress.farm.unlocked,true);
  assert.deepEqual([...progress.farm.unlockedRewardIds].sort(),['bear-statue','flower-garden','nature-complete-emblem','real-visit-missions-unlocked','nature-chapter-complete'].sort());
  assert.equal(progress.farm.bearGrowthStage,'locked');
});

test('server rules overwrite forged completion and unlock values',async()=>{
  const userId=new mongoose.Types.ObjectId();
  await PersonalFarmProgressModel.create({userId,gardenMission:{completed:true},bearMission:{completed:true},farm:{unlocked:true}});
  const progress=await getOrCreatePersonalFarmProgress(userId.toString());
  assert.equal(progress.gardenMission.completed,false);assert.equal(progress.bearMission.completed,false);assert.equal(progress.farm.unlocked,false);
});

test('authenticated API ignores another user id and client completion fields',async()=>{
  process.env.SESSION_SECRET='personal-farm-test-secret-0123456789012345';
  const [{personalFarmRouter},{createAuthSessionToken}]=await Promise.all([import('../routes/personalFarm.js'),import('../middleware/authenticatedUser.js')]);
  const first=await UserModel.create({kakaoId:'farm-first',nickname:'first'}),second=await UserModel.create({kakaoId:'farm-second',nickname:'second'});
  const token=createAuthSessionToken(second.id);assert.ok(token);
  const app=express();app.use(express.json());app.use('/api/account',personalFarmRouter);
  const server=app.listen(0);await new Promise<void>(resolve=>server.once('listening',resolve));
  try{
    const address=server.address();assert.ok(address&&typeof address==='object');
    const response=await fetch(`http://127.0.0.1:${address.port}/api/account/me/personal-farm/garden/collect/tulip`,{method:'POST',headers:{'content-type':'application/json',cookie:`jochwon_session=${token}`},body:JSON.stringify({userId:first.id,completed:true,unlocked:true})});
    assert.equal(response.status,200);
    const firstProgress=await PersonalFarmProgressModel.findOne({userId:first.id});
    const secondProgress=await PersonalFarmProgressModel.findOne({userId:second.id}).orFail();
    assert.equal(firstProgress,null);assert.deepEqual(secondProgress.gardenMission.collectedFlowerIds,['tulip']);assert.equal(secondProgress.gardenMission.completed,false);assert.equal(secondProgress.farm.unlocked,false);
  }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
});
