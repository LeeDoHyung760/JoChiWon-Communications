import {UserModel} from '../../models/User.js';

export async function recordAuthenticatedPlaceVisit(userId:string,placeId:string){
  const user=await UserModel.findById(userId).select('profile.placeBehavior');
  if(!user)return;
  const records=[...((user.get('profile.placeBehavior.records')??[]) as Array<Record<string,any>>)];
  const existing=records.find(record=>record.placeId===placeId);
  if(existing){existing.visitCount=Number(existing.visitCount??0)+1;existing.revisitCount=Math.max(0,existing.visitCount-1);existing.lastVisitedAt=new Date()}
  else records.push({placeId,visitCount:1,revisitCount:0,activeStaySeconds:0,lastVisitedAt:new Date()});
  user.set('profile.placeBehavior.records',records.slice(-100));
  await user.save();
}
