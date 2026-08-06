import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import test from 'node:test';
import express from 'express';
import {config} from '../config/env.js';
import {createAuthSessionToken} from '../middleware/authenticatedUser.js';
import {ClubModel} from '../models/Club.js';
import {UserModel} from '../models/User.js';
import {accountRouter} from './account.js';

test('GET /me/unified-profile requires auth and returns the authenticated user only',async()=>{
  const mutableConfig=config as {auth:{sessionSecret:string|undefined}};
  const originalSecret=mutableConfig.auth.sessionSecret;
  const originalExists=UserModel.exists;
  const originalFindById=UserModel.findById;
  const originalClubFind=ClubModel.find;
  mutableConfig.auth.sessionSecret='unified-profile-test-secret-that-is-long-enough';
  const authenticatedId='507f1f77bcf86cd799439011';
  (UserModel.exists as unknown)=async()=>({_id:authenticatedId});
  (UserModel.findById as unknown)=((id:string)=>({select:()=>({lean:async()=>({_id:id,updatedAt:new Date('2026-01-01T00:00:00Z')})})}));
  (ClubModel.find as unknown)=(()=>({select:()=>({lean:async()=>[]})}));
  const app=express();app.use(express.json());app.use('/api/account',accountRouter);
  const server=createServer(app);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert.ok(address&&typeof address==='object');
  const url=`http://127.0.0.1:${address.port}/api/account/me/unified-profile?userId=someone-else`;
  try{
    const denied=await fetch(url);assert.equal(denied.status,401);
    const token=createAuthSessionToken(authenticatedId);assert.ok(token);
    const allowed=await fetch(url,{headers:{cookie:`jochwon_session=${token}`}});
    assert.equal(allowed.status,200);
    const body=await allowed.json() as {data:{userId:string;profileCompletion:number}};
    assert.equal(body.data.userId,authenticatedId);
    assert.equal(body.data.profileCompletion,0);
  }finally{
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    mutableConfig.auth.sessionSecret=originalSecret;
    UserModel.exists=originalExists;UserModel.findById=originalFindById;ClubModel.find=originalClubFind;
  }
});
