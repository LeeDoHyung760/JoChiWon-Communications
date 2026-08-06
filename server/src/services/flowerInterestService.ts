import {calculateFlowerInterestScore,type FlowerInterestDelta,type FlowerInterestRecord} from '../../../shared/flower-interest.js';
import {UserModel} from '../models/User.js';

const nonNegative=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,value):0;
const recordDto=(record:{flowerId:string;infoViewCount?:number;totalInfoViewSeconds?:number;nearbyVisitCount?:number;totalNearbySeconds?:number;revisitCount?:number;interestScore?:number;lastInteractedAt?:Date|null}):FlowerInterestRecord=>({
  flowerId:record.flowerId as FlowerInterestRecord['flowerId'],infoViewCount:nonNegative(record.infoViewCount),totalInfoViewSeconds:nonNegative(record.totalInfoViewSeconds),nearbyVisitCount:nonNegative(record.nearbyVisitCount),totalNearbySeconds:nonNegative(record.totalNearbySeconds),revisitCount:nonNegative(record.revisitCount),interestScore:nonNegative(record.interestScore),lastInteractedAt:record.lastInteractedAt?.toISOString(),
});

export async function getFlowerInterests(userId:string){
  const user=await UserModel.findById(userId).select('profile.gardenNature.flowerInterests').lean();
  const records=user?.profile?.gardenNature?.flowerInterests;
  return records?Array.from(records,record=>recordDto(record)):[];
}

export async function applyFlowerInterestEvents(userId:string,events:readonly FlowerInterestDelta[]){
  const user=await UserModel.findById(userId).select('+profile.gardenNature.processedEventIds profile.gardenNature.flowerInterests');
  if(!user)return null;
  const stored=user.profile?.gardenNature?.flowerInterests;
  const current=stored?Array.from(stored,record=>recordDto(record)):[],byId=new Map(current.map(record=>[record.flowerId,record]));
  const rawProcessed=user.get('profile.gardenNature.processedEventIds') as unknown;
  const processed=new Set(Array.isArray(rawProcessed)?rawProcessed.filter((value):value is string=>typeof value==='string'):[]);
  for(const event of events){
    if(processed.has(event.eventId))continue;
    processed.add(event.eventId);
    const record=byId.get(event.flowerId)??{flowerId:event.flowerId,infoViewCount:0,totalInfoViewSeconds:0,nearbyVisitCount:0,totalNearbySeconds:0,revisitCount:0,interestScore:0};
    record.infoViewCount+=nonNegative(event.infoViewCount);record.totalInfoViewSeconds+=nonNegative(event.totalInfoViewSeconds);record.nearbyVisitCount+=nonNegative(event.nearbyVisitCount);record.totalNearbySeconds+=nonNegative(event.totalNearbySeconds);record.revisitCount+=nonNegative(event.revisitCount);
    record.interestScore=calculateFlowerInterestScore(record);record.lastInteractedAt=new Date().toISOString();byId.set(event.flowerId,record);
  }
  const next=[...byId.values()];
  user.set('profile.gardenNature.flowerInterests',next.map(record=>({...record,lastInteractedAt:record.lastInteractedAt?new Date(record.lastInteractedAt):undefined})));
  user.set('profile.gardenNature.processedEventIds',[...processed].slice(-500));
  await user.save();
  return next;
}
