import fs from 'node:fs';
import path from 'node:path';
import { FIXED_LAKE_RESPAWN } from '../../../shared/socket-events.js';
import type { BearExplorationAnalysis,BearExplorationCardId,BearExplorationMember,BearExplorationPointId,BearExplorationReport,BearExplorationRole,BearExplorationState,BearTreePortalPositions,CampusFeaturePortalId,CampusFeaturePortalPosition,ChatMessage,DirectMessage,DirectRecommendationPlace,DirectRoom,GovernmentPlanState,GovernmentPlanUpdate,GovernmentSessionProposal,GroupRoom,LakeDailyStats,LakeExperienceId,LakeExperiencePosition,LakeWish,MapId,PlayerState,PortalPosition,RespawnPosition,WorldInteractionPosition } from '../../../shared/socket-events.js';
export class RoomStore {
 players=new Map<string,PlayerState>(); groups=new Map<string,GroupRoom>(); pendingDirect=new Map<string,{fromId:string;toId:string}>(); directRooms=new Map<string,DirectRoom>(); directMessages=new Map<string,DirectMessage[]>(); governmentProposals=new Map<string,GovernmentSessionProposal>(); governmentPlans=new Map<string,GovernmentPlanState>(); recommendationCache=new Map<string,{roomId:string;places:DirectRecommendationPlace[];expiresAt:number}>(); blockedPairs=new Set<string>();
 bearExplorationCards=new Map<BearExplorationCardId,string>();bearExplorationAnalyzed=new Set<BearExplorationCardId>();bearExplorationAnalyses=new Map<BearExplorationCardId,BearExplorationAnalysis>();bearExplorationJoinedAt=new Map<string,number>();bearExplorationStory='';bearExplorationReport?:BearExplorationReport;completedBearRoutes:string[][]=[];
 portalPositions=new Map<PortalPosition['destination'],PortalPosition>([['bear-tree-park',{destination:'bear-tree-park',x:2122,z:944}],['town',{destination:'town',x:1120,z:1731}],['garden',{destination:'garden',x:682,z:735}],['campus',{destination:'campus',x:1178,z:122}]]);
 bearTreePortalPositions:BearTreePortalPositions={town:{x:980,z:1580},photo:{x:1569,z:1525}};
 interactionPositions=new Map<WorldInteractionPosition['destination'],WorldInteractionPosition>([['bear-play-zone',{destination:'bear-play-zone',x:1616,z:601}],['bear-tree-park',{destination:'bear-tree-park',x:1200,z:1650}]]);
 lakeExperiencePositions=new Map<LakeExperienceId,LakeExperiencePosition>([['central-plaza',{experience:'central-plaza',x:1219,z:1462}],['activity-zone',{experience:'activity-zone',x:603,z:452}],['food-shop-zone',{experience:'food-shop-zone',x:491,z:1556}],['wind-hill',{experience:'wind-hill',x:1908,z:549}]]);
 campusFeaturePortalPositions=new Map<CampusFeaturePortalId,CampusFeaturePortalPosition>([['people',{portal:'people',x:881,z:950}],['clubs',{portal:'clubs',x:450,z:882}],['recruit',{portal:'recruit',x:508,z:1382}],['government',{portal:'government',x:1656,z:1501}]]);
 readonly respawnPosition:RespawnPosition={...FIXED_LAKE_RESPAWN};
 lakeWishes:LakeWish[]=[];
 nearbyChatMessages=new Map<MapId,ChatMessage[]>();
 private dailyDate='';private dailyVisitors=new Set<string>();private dailyExperienceVisits:Record<LakeExperienceId,Set<string>>={'central-plaza':new Set(),'activity-zone':new Set(),'food-shop-zone':new Set(),'wind-hill':new Set()};
 private dataDirectory=path.basename(process.cwd()).toLowerCase()==='server'?process.cwd():path.resolve(process.cwd(),'server');
 private lakeWishFile=path.resolve(this.dataDirectory,'lake-wishes.json');
 private nearbyChatFile=path.resolve(this.dataDirectory,'nearby-chat.json');
 constructor(){
  try{const saved=JSON.parse(fs.readFileSync(this.lakeWishFile,'utf8')) as LakeWish[];this.lakeWishes=saved.filter(wish=>wish&&typeof wish.message==='string'&&typeof wish.nickname==='string').slice(-80)}catch{/* Wishes begin empty on a new server. */}
  try{
   const saved=JSON.parse(fs.readFileSync(this.nearbyChatFile,'utf8')) as Partial<Record<MapId,ChatMessage[]>>;
   Object.entries(saved).forEach(([mapId,messages])=>{
    if(Array.isArray(messages))this.nearbyChatMessages.set(mapId as MapId,messages.filter(message=>message&&typeof message.message==='string'&&typeof message.nickname==='string').slice(-80));
   });
  }catch{/* Nearby chat begins empty on a new server. */}
 }
 private validBearTreePortalPositions(value:BearTreePortalPositions){return [value?.town,value?.photo].every(position=>Number.isFinite(position?.x)&&Number.isFinite(position?.z)&&position.x>=0&&position.x<=2400&&position.z>=0&&position.z<=1900)}
 private roundBearTreePortalPositions(value:BearTreePortalPositions):BearTreePortalPositions{return {town:{x:Math.round(value.town.x),z:Math.round(value.town.z)},photo:{x:Math.round(value.photo.x),z:Math.round(value.photo.z)}}}
 migrateBearTreePortalPositions(_value:BearTreePortalPositions){return false}
 allPortalPositions(){return [...this.portalPositions.values()]}
 setPortalPosition(_position:PortalPosition,_persist=true){return false}
 allInteractionPositions(){return [...this.interactionPositions.values()]}
 setInteractionPosition(_position:WorldInteractionPosition,_persist=true){return false}
 allLakeExperiencePositions(){return [...this.lakeExperiencePositions.values()]}
 setLakeExperiencePosition(_position:LakeExperiencePosition,_persist=true){return false}
 allCampusFeaturePortalPositions(){return [...this.campusFeaturePortalPositions.values()]}
 setCampusFeaturePortalPosition(_position:CampusFeaturePortalPosition){return false}
 replaceCampusFeaturePortalPositions(_positions:CampusFeaturePortalPosition[]){/* Verified campus coordinates are fixed in source. */}
 addLakeWish(nickname:string,message:string){const wish:LakeWish={id:crypto.randomUUID(),nickname,message,createdAt:Date.now()};this.lakeWishes=[...this.lakeWishes.slice(-79),wish];try{fs.writeFileSync(this.lakeWishFile,JSON.stringify(this.lakeWishes,null,2))}catch(error){console.error('[lake wish persistence failed]',error)}return wish}
 addNearbyChat(message:ChatMessage){
  const messages=[...(this.nearbyChatMessages.get(message.mapId)??[]),message].slice(-80);
  this.nearbyChatMessages.set(message.mapId,messages);
  try{fs.writeFileSync(this.nearbyChatFile,JSON.stringify(Object.fromEntries(this.nearbyChatMessages),null,2))}catch(error){console.error('[nearby chat persistence failed]',error)}
  return message;
 }
 recentNearbyChat(mapId:MapId){return (this.nearbyChatMessages.get(mapId)??[]).slice(-80)}
 private today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
 private resetDailyIfNeeded(){const today=this.today();if(today===this.dailyDate)return;this.dailyDate=today;this.dailyVisitors.clear();this.dailyExperienceVisits['central-plaza'].clear();this.dailyExperienceVisits['activity-zone'].clear();this.dailyExperienceVisits['food-shop-zone'].clear();this.dailyExperienceVisits['wind-hill'].clear()}
 recordDailyVisitor(id:string){this.resetDailyIfNeeded();this.dailyVisitors.add(id)}
 recordExperienceVisit(id:string,experience:LakeExperienceId){this.resetDailyIfNeeded();this.dailyExperienceVisits[experience].add(id)}
 lakeDailyStats():LakeDailyStats{this.resetDailyIfNeeded();const centralPlazaVisits=this.dailyExperienceVisits['central-plaza'].size,activityZoneVisits=this.dailyExperienceVisits['activity-zone'].size,foodShopZoneVisits=this.dailyExperienceVisits['food-shop-zone'].size,windHillVisits=this.dailyExperienceVisits['wind-hill'].size;const popular=[{name:'축제 부스',count:centralPlazaVisits},{name:'공연 부스',count:activityZoneVisits},{name:'먹거리·상점 부스',count:foodShopZoneVisits},{name:'세종 추천 코스 게시판',count:windHillVisits}].sort((a,b)=>b.count-a.count)[0];return {date:this.dailyDate,visitors:this.dailyVisitors.size,centralPlazaVisits,activityZoneVisits,foodShopZoneVisits,windHillVisits,popularExperience:popular.count?popular.name:'아직 집계 중'}}
 playersIn(mapId:string){return [...this.players.values()].filter(p=>p.mapId===mapId)}
 bearExplorationMission(){
  const date=this.today(),variants=[
   {title:'물가에서 동굴까지',prompt:'잃어버린 탐험 기록 3개를 찾아 곰의 이동 경로를 완성하세요.'},
   {title:'숲속의 세 가지 신호',prompt:'서로 다른 장소의 기록을 합쳐 숲속 곰의 하루를 밝혀보세요.'},
   {title:'사라진 생태 기록',prompt:'폭포·동굴·큰 나무에 흩어진 조사 기록을 함께 복원하세요.'},
  ],index=Number(date.replaceAll('-',''))%variants.length;
  return {missionId:`bear-${date}`,...variants[index]};
 }
 bearExplorationState(playerId:string):BearExplorationState{
  const mission=this.bearExplorationMission(),present=this.playersIn('bear-play-zone'),presentIds=new Set(present.map(player=>player.id));
  for(const id of this.bearExplorationJoinedAt.keys())if(!presentIds.has(id))this.bearExplorationJoinedAt.delete(id);
  present.forEach(player=>{if(!this.bearExplorationJoinedAt.has(player.id))this.bearExplorationJoinedAt.set(player.id,Date.now())});
  const active=present.sort((a,b)=>(this.bearExplorationJoinedAt.get(a.id)??0)-(this.bearExplorationJoinedAt.get(b.id)??0)).slice(0,3);
  const roles:BearExplorationRole[]=['explorer','recorder','photographer'];
  const roleMembers=active.map((player,index)=>({playerId:player.id,nickname:player.nickname,role:roles[index]}));
  const role=roleMembers.find(member=>member.playerId===playerId)?.role??'explorer';
  const foundCards=[...this.bearExplorationCards.keys()].sort() as BearExplorationCardId[];
  const mergedCards=[...this.bearExplorationAnalyzed].sort() as BearExplorationCardId[];
  const members=[...this.bearExplorationCards].flatMap(([cardId,id])=>{const player=this.players.get(id);return player?[{playerId:id,nickname:player.nickname,cardId} as BearExplorationMember]:[]});
  const analyses=[...this.bearExplorationAnalyses.values()];
  const latest=analyses.at(-1);
  return {...mission,ownedCard:members.find(member=>member.playerId===playerId)?.cardId,role,roleMembers,foundCards,pendingCards:foundCards.filter(card=>!this.bearExplorationAnalyzed.has(card)),mergedCards:[...this.bearExplorationAnalyzed].sort(),members,analyses:role==='recorder'?analyses:[],aiGuidance:role==='recorder'?(latest?.nextHint??'탐험가가 첫 단서를 찾으면 AI 지도가 분석을 시작합니다.'):undefined,photoReady:this.bearExplorationAnalyzed.size===3&&!!this.bearExplorationStory,photoComplete:!!this.bearExplorationReport?.published,story:this.bearExplorationStory||undefined,report:this.bearExplorationReport,completedRouteCount:this.completedBearRoutes.length,completedRoutes:this.completedBearRoutes.slice(-5),completed:!!this.bearExplorationReport?.published};
 }
 collectBearExplorationCard(playerId:string,pointId:BearExplorationPointId){
  const player=this.players.get(playerId),points:Record<BearExplorationPointId,{x:number;y:number;card:BearExplorationCardId}>={waterfall:{x:2099,y:829,card:'card_1'},cave:{x:1545,y:267,card:'card_2'},tree:{x:562,y:585,card:'card_3'}},point=points[pointId];
  if(!point)return {ok:false,message:'알 수 없는 조사 지점입니다.'};
  if(!player||player.mapId!=='bear-play-zone')return {ok:false,message:'곰 탐험 공간에서만 기록을 찾을 수 있어요.'};
  if(Math.hypot(player.x-point.x,player.y-point.y)>150)return {ok:false,message:'조사 지점에 더 가까이 가주세요.'};
  if(this.bearExplorationState(playerId).role!=='explorer')return {ok:false,message:'현장 단서 수집은 탐험가의 역할이에요.'};
  if(this.bearExplorationCards.has(point.card))return {ok:false,message:'이미 발견한 탐험 기록입니다.'};
  this.bearExplorationCards.set(point.card,playerId);
  return {ok:true,message:'현장 단서를 발견했습니다. AI가 기록가의 지도를 분석하고 있어요.'};
 }
 setBearExplorationAnalysis(analysis:BearExplorationAnalysis){this.bearExplorationAnalyses.set(analysis.cardId,analysis);this.bearExplorationAnalyzed.add(analysis.cardId)}
 analyzeBearExploration(playerId:string){
  if(this.bearExplorationState(playerId).role!=='recorder')return {ok:false,message:'AI 단서 분석은 기록가의 역할이에요.'};
  const pending=[...this.bearExplorationCards.keys()].filter(card=>!this.bearExplorationAnalyzed.has(card));
  if(!pending.length)return {ok:false,message:'새롭게 발견된 기록을 기다리고 있어요.'};
  pending.forEach(card=>this.bearExplorationAnalyzed.add(card));
  return {ok:true,message:`AI가 새 기록 ${pending.length}개를 분석해 지도에 연결했습니다.`};
 }
 captureBearExplorationPhoto(playerId:string){
  if(this.bearExplorationState(playerId).role!=='photographer')return {ok:false,message:'최종 포토 기록은 사진가의 역할이에요.'};
  if(this.bearExplorationAnalyzed.size<3)return {ok:false,message:'세 기록의 분석이 끝나야 사진을 남길 수 있어요.'};
  return {ok:true,message:'최종 기록 담당자가 탐험 보고서를 편집할 수 있습니다.'};
 }
 setBearExplorationStory(_playerIds:string[],story:string){this.bearExplorationStory=story}
 finalizeBearExplorationReport(playerId:string,title:string,cover:BearExplorationReport['cover']){
  const state=this.bearExplorationState(playerId),photographerPresent=state.roleMembers.some(member=>member.role==='photographer');
  if(!state.photoReady)return {ok:false,message:'AI 탐험 보고서가 완성될 때까지 기다려 주세요.'};
  if(photographerPresent&&state.role!=='photographer')return {ok:false,message:'최종 보고서 편집과 게시는 기록 담당자의 역할이에요.'};
  const route=[...this.bearExplorationAnalyses.values()].map(item=>item.place),teamName=state.roleMembers.map(member=>member.nickname).join('·')||'AI 생태 탐험팀';
  this.bearExplorationReport={title:title.trim().slice(0,40)||'곰의 이동을 추적했습니다',cover,content:this.bearExplorationStory,route,published:true,teamName};
  this.completedBearRoutes.push(route);return {ok:true,message:'공동 탐험 카드가 공동캠퍼스 게시판에 등록되었습니다.'};
 }
 resetBearExploration(){this.bearExplorationCards.clear();this.bearExplorationAnalyzed.clear();this.bearExplorationAnalyses.clear();this.bearExplorationJoinedAt.clear();this.bearExplorationStory='';this.bearExplorationReport=undefined}
 removePlayer(id:string){this.players.delete(id);this.bearExplorationJoinedAt.delete(id);for(const group of this.groups.values()){group.memberIds=group.memberIds.filter(x=>x!==id);if(!group.memberIds.length)this.groups.delete(group.id)}for(const [key,req] of this.pendingDirect)if(req.fromId===id||req.toId===id)this.pendingDirect.delete(key)}
 createGroup(owner:PlayerState,name:string,inviteeIds:string[]){const id=`group-${crypto.randomUUID()}`;const group:GroupRoom={id,name:name.trim()||`${owner.nickname}의 모임`,ownerId:owner.id,memberIds:[...new Set([owner.id,...inviteeIds.filter(id=>this.players.has(id))])],mapId:owner.mapId};this.groups.set(id,group);return group}
 pairKey(firstId:string,secondId:string){return [firstId,secondId].sort().join(':')}
 isBlocked(firstId:string,secondId:string){return this.blockedPairs.has(this.pairKey(firstId,secondId))}
 createDirectRoom(first:PlayerState,second:PlayerState){const ids=[first.id,second.id].sort();const existing=[...this.directRooms.values()].find(r=>r.participants.map(p=>p.id).sort().join(':')===ids.join(':'));if(existing){existing.active=true;return existing}const room:DirectRoom={id:`direct-${crypto.randomUUID()}`,participants:[first,second].map(({id,nickname,appearance,matchProfile})=>({id,nickname,appearance,matchProfile})),active:true,acceptedAt:Date.now()};this.directRooms.set(room.id,room);this.directMessages.set(room.id,[]);return room}
 addDirectMessage(message:DirectMessage){const messages=this.directMessages.get(message.directRoomId)??[];messages.push(message);this.directMessages.set(message.directRoomId,messages.slice(-200));return message}
 recentUserMessages(roomId:string,limit=20){return (this.directMessages.get(roomId)??[]).filter(message=>message.type==='user'&&!message.deleted&&message.message.trim()).sort((a,b)=>a.createdAt-b.createdAt).slice(-limit)}
 createGovernmentPlan(sessionId:string,room:DirectRoom){
  const selections=Object.fromEntries(room.participants.map(participant=>[participant.id,{nickname:participant.nickname,themes:[],placeIds:[]}]));
  const plan:GovernmentPlanState={sessionId,memberIds:room.participants.map(participant=>participant.id),selections,constraints:{date:'토요일',startTime:'13:00',endTime:'19:00',transport:'대중교통',meal:true,cafe:true,experience:true,activities:['사진 촬영']},updatedAt:Date.now()};
  this.governmentPlans.set(sessionId,plan);return plan;
 }
 updateGovernmentPlan(sessionId:string,playerId:string,update:GovernmentPlanUpdate){
  const plan=this.governmentPlans.get(sessionId),player=this.players.get(playerId);
  if(!plan||!player||!plan.memberIds.includes(playerId))return;
  const current=plan.selections[playerId]??{nickname:player.nickname,themes:[],placeIds:[]};
  if(update.themes)current.themes=[...new Set(update.themes.filter(value=>typeof value==='string'))].slice(0,6);
  if(update.placeIds)current.placeIds=[...new Set(update.placeIds.filter(value=>typeof value==='string'))].slice(0,3);
  plan.selections[playerId]=current;
  if(update.constraints)plan.constraints={...plan.constraints,...update.constraints,activities:update.constraints.activities?[...new Set(update.constraints.activities)].slice(0,6):plan.constraints.activities};
  if(update.course===null)delete plan.course;else if(update.course)plan.course=update.course;
  plan.updatedAt=Date.now();return plan;
 }
 saveRecommendation(roomId:string,places:DirectRecommendationPlace[]){const recommendationId=crypto.randomUUID();this.recommendationCache.set(recommendationId,{roomId,places,expiresAt:Date.now()+30*60_000});return recommendationId}
 recentRecommendedPlaceIds(roomId:string){const now=Date.now(),ids=new Set<string>();for(const [key,cached] of this.recommendationCache){if(cached.expiresAt<=now){this.recommendationCache.delete(key);continue}if(cached.roomId===roomId)for(const place of cached.places)ids.add(place.id)}return ids}
 getRecommendedPlace(recommendationId:string,roomId:string,placeId:string){const cached=this.recommendationCache.get(recommendationId);if(!cached||cached.roomId!==roomId||cached.expiresAt<=Date.now()){if(cached)this.recommendationCache.delete(recommendationId);return {category:'expired' as const}}const place=cached.places.find(item=>item.id===placeId);return place?{category:'ok' as const,place}:{category:'invalid' as const}}
}
export const roomStore=new RoomStore();
