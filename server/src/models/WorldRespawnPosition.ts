import { Schema,model } from 'mongoose';
import type { RespawnPosition } from '../../../shared/socket-events.js';

const worldRespawnPositionSchema=new Schema({
  map:{type:String,required:true,enum:['town'],unique:true,index:true},
  x:{type:Number,required:true,min:0,max:2400},
  z:{type:Number,required:true,min:0,max:1900},
  yaw:{type:Number,required:true},
},{versionKey:false,timestamps:true});

export const WorldRespawnPositionModel=model('WorldRespawnPosition',worldRespawnPositionSchema);

export async function loadOrSeedWorldRespawnPosition(fallback:RespawnPosition):Promise<RespawnPosition>{
  const document=await WorldRespawnPositionModel.findOneAndUpdate(
    {map:'town'},
    {$setOnInsert:{map:'town',...fallback}},
    {upsert:true,returnDocument:'after',runValidators:true},
  ).lean();
  return {x:Math.round(document.x),z:Math.round(document.z),yaw:document.yaw};
}

export async function saveWorldRespawnPosition(position:RespawnPosition){
  await WorldRespawnPositionModel.findOneAndUpdate(
    {map:'town'},
    {$set:{x:position.x,z:position.z,yaw:position.yaw}},
    {upsert:true,runValidators:true},
  );
}
