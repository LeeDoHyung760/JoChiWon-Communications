import { Schema,model } from 'mongoose';
import type { CampusFeaturePortalId,CampusFeaturePortalPosition } from '../../../shared/socket-events.js';

const portalIds:CampusFeaturePortalId[]=['people','clubs','recruit','government'];

const campusFeaturePortalSchema=new Schema({
  portal:{type:String,required:true,enum:portalIds,unique:true,index:true},
  x:{type:Number,required:true,min:0,max:2400},
  z:{type:Number,required:true,min:0,max:1900},
},{versionKey:false,timestamps:true});

export const CampusFeaturePortalModel=model('CampusFeaturePortal',campusFeaturePortalSchema);

export async function loadCampusFeaturePortalPositions():Promise<CampusFeaturePortalPosition[]>{
  const documents=await CampusFeaturePortalModel.find({portal:{$in:portalIds}}).lean();
  return documents.map(document=>({portal:document.portal as CampusFeaturePortalId,x:Math.round(document.x),z:Math.round(document.z)}));
}

export async function saveCampusFeaturePortalPosition(position:CampusFeaturePortalPosition){
  await CampusFeaturePortalModel.findOneAndUpdate(
    {portal:position.portal},
    {$set:{x:position.x,z:position.z}},
    {upsert:true,runValidators:true},
  );
}

export async function seedCampusFeaturePortalPositions(positions:CampusFeaturePortalPosition[]){
  await Promise.all(positions.map(position=>CampusFeaturePortalModel.updateOne(
    {portal:position.portal},
    {$setOnInsert:{portal:position.portal,x:position.x,z:position.z}},
    {upsert:true,runValidators:true},
  )));
  return loadCampusFeaturePortalPositions();
}
