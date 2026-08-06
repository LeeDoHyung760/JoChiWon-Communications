import assert from 'node:assert/strict';
import test from 'node:test';
import {assembleUnifiedUserProfile} from './buildUnifiedUserProfile.js';
import {calculateUnifiedProfileCompletion,emptyUnifiedUserProfile} from '../../../../shared/unified-user-profile.js';

test('empty user returns stable empty DTO and zero completion',()=>{
  const profile=assembleUnifiedUserProfile({_id:'empty-user',updatedAt:new Date('2026-01-01T00:00:00Z')},[]);
  assert.equal(profile.profileCompletion,0);
  assert.deepEqual(profile.completedDomains,[]);
  assert.deepEqual(profile.gardenNature.topFlowers,[]);
  assert.deepEqual(profile.placeBehavior.visitedPlaceIds,[]);
});

test('festival and food evidence complete only festivalFood',()=>{
  const profile=assembleUnifiedUserProfile({_id:'festival-user',experienceHarness:{
    festival:{scores:{nightFestivalInterest:70,planningStyle:40},evidence:['night festival']},
    food:{scores:{koreanFoodPreference:60},evidence:['food']},
  }},[]);
  assert.equal(profile.profileCompletion,20);
  assert.deepEqual(profile.completedDomains,['festivalFood']);
  assert.ok(profile.festivalFood.festivalTypes.includes('nightFestivalInterest'));
  assert.ok(profile.festivalFood.foodTypes.includes('koreanFoodPreference'));
});

test('flower catalog is joined without duplicating flower metadata',()=>{
  const profile=assembleUnifiedUserProfile({_id:'flower-user',profile:{gardenNature:{flowerInterests:[
    {flowerId:'magnolia',interestScore:12,infoViewCount:2,totalInfoViewSeconds:10,nearbyVisitCount:1,totalNearbySeconds:3,revisitCount:1},
  ]}}},[]);
  assert.equal(profile.profileCompletion,20);
  assert.equal(profile.gardenNature.topFlowers[0]?.displayName,'목련');
  assert.deepEqual(profile.gardenNature.topFlowers[0]?.meanings,['고귀함','자연에 대한 사랑']);
  assert.equal(profile.gardenNature.observationStyle,'revisit');
});

test('club Mongo source and stored project preferences remain user-scoped',()=>{
  const a=assembleUnifiedUserProfile({_id:'A',profile:{collaborationProjects:{interests:['photo'],preferredRoles:['recording'],collaborationStyle:'planned',availableTimes:['weekend'],evidence:[{kind:'application'}]}}},[
    {category:'nature',tags:['walking'],ownerId:'A',members:[{userId:'A',role:'chair'}]},
  ]);
  const b=assembleUnifiedUserProfile({_id:'B'},[]);
  assert.equal(a.profileCompletion,40);
  assert.deepEqual(a.clubs.categories,['nature','walking']);
  assert.equal(a.clubs.participationRole,'chair');
  assert.deepEqual(a.collaborationProjects.interests,['photo']);
  assert.deepEqual(b.clubs.categories,[]);
  assert.deepEqual(b.collaborationProjects.interests,[]);
});

test('all five meaningful domains cap completion at 100',()=>{
  const profile=emptyUnifiedUserProfile('complete');
  profile.festivalFood.foodTypes=['local'];
  profile.gardenNature.topFlowers=[{flowerId:'tulip',displayName:'튤립',meanings:['사랑'],interestScore:1}];
  profile.arts.evidenceCount=1;
  profile.clubs.categories=['photo'];
  profile.collaborationProjects.preferredRoles=['recording'];
  assert.deepEqual(calculateUnifiedProfileCompletion(profile),{
    profileCompletion:100,
    completedDomains:['festivalFood','gardenNature','arts','clubs','collaborationProjects'],
  });
});
