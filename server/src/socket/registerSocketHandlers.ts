import type { Server,Socket } from 'socket.io';import type { ClientToServerEvents,ServerToClientEvents,PlayerState,ChatMessage,JoinMapPayload,PublicMatchProfile } from '../../../shared/socket-events.js';import { roomStore } from '../rooms/roomStore.js';
import { bearWildlifeAnswer } from '../services/ai/bearWildlife.js';
import { saveCampusFeaturePortalPosition } from '../models/CampusFeaturePortal.js';
import { UserModel } from '../models/User.js';
import { canStartDirectChat, type AgeGroup } from '../services/users/agePolicy.js';
import { DirectRoomModel } from '../models/DirectRoom.js';
import { DirectMessageModel } from '../models/DirectMessage.js';
import { canUsersStartDirectChat, loadDirectChatPolicy, AGE_GROUP_CHAT_RESTRICTED_MESSAGE } from '../services/chat/directChatPolicyService.js';
import { localInterestKeywordExtractor } from '../services/interests/interestKeywordExtractor.js';
import { conversationInterestCache } from '../services/interests/conversationInterestCache.js';
type IO=Server<ClientToServerEvents,ServerToClientEvents>;type Client=Socket<ClientToServerEvents,ServerToClientEvents>;
const clean=(value:string,max=180)=>value.trim().slice(0,max);
const pendingBearStories=new Set<string>();
const BEAR_POINTS={
 waterfall:{cardId:'card_1' as const,place:'폭포',clue:'물가에서 발견한 곰 털'},
 cave:{cardId:'card_2' as const,place:'동굴',clue:'동굴 앞에서 발견한 곰 발자국'},
 tree:{cardId:'card_3' as const,place:'큰 나무',clue:'나무에 남은 발톱 자국'},
};
export function registerSocketHandlers(io:IO,socket:Client){
 const savePlayerPosition=async(player:PlayerState)=>{
  const userId=socket.data.userId as string|undefined;
  if(!userId)return;
  await UserModel.updateOne({_id:userId},{$set:{lastPosition:{mapId:player.mapId,x:player.x,z:player.y,yaw:player.yaw,savedAt:new Date()}}}).catch(error=>console.error('[player position save failed]',error instanceof Error?error.name:'unknown'));
 };
 const socketUserId=(socketId:string)=>io.sockets.sockets.get(socketId)?.data.userId as string|undefined;
 const directChatAllowed=async(firstId:string,secondId:string)=>{
  const firstUserId=socketUserId(firstId),secondUserId=socketUserId(secondId);
  return Boolean(firstUserId&&secondUserId&&await canUsersStartDirectChat([firstUserId,secondUserId]));
 };
 const publish=(mapId:PlayerState['mapId'])=>io.to(mapId).emit('onlineUsersUpdated',roomStore.playersIn(mapId));
 const publishBearExploration=(ids:string[])=>{if(!ids.length)roomStore.resetBearExploration();ids.forEach(id=>io.to(id).emit('bearExplorationUpdated',roomStore.bearExplorationState(id)))};
 const activeBearExplorers=()=>roomStore.playersIn('bear-play-zone').map(player=>player.id);
 const completeBearStory=async(ids:string[])=>{
  const state=roomStore.bearExplorationState(ids[0]);if(state.mergedCards.length<3||state.story||pendingBearStories.has(state.missionId+ids.sort().join(':')))return;
  const key=state.missionId+ids.sort().join(':');pendingBearStories.add(key);
  const story=await bearWildlifeAnswer({mode:'report',question:'서로 다른 탐험가가 찾은 세 기록을 연결해 곰의 이동 이야기를 작성해 주세요.',selected:'공동 탐험 완료',findings:[
   {card:'card_1',place:'폭포',clue:'물가에서 발견한 곰 털'},
   {card:'card_2',place:'동굴',clue:'동굴 앞에서 발견한 곰 발자국'},
   {card:'card_3',place:'큰 나무',clue:'나무에 남은 발톱 자국'},
  ]});
  roomStore.setBearExplorationStory(ids,story);pendingBearStories.delete(key);publishBearExploration(ids);
 };
 const safeMatchProfile=(value:PublicMatchProfile):PublicMatchProfile=>({mbti:clean(value.mbti,4),interests:value.interests.slice(0,10).map(v=>clean(v,30)),usagePurposes:value.usagePurposes.slice(0,10).map(v=>clean(v,30)),preferredPlaceCategories:value.preferredPlaceCategories.slice(0,10).map(v=>clean(v,30)),experienceRecords:value.experienceRecords.slice(0,10).map(v=>clean(v,50))});
 socket.on('getRespawnPosition',ack=>{if(typeof ack==='function')ack(roomStore.respawnPosition)});
 socket.on('getPlayerResumeState',async ack=>{
  if(typeof ack!=='function')return;
  const userId=socket.data.userId as string|undefined;
  if(!userId)return ack(null);
  const user=await UserModel.findById(userId).select('lastPosition').lean().catch(()=>null);
  const position=user?.lastPosition;
  return ack(position?.mapId&&Number.isFinite(position.x)&&Number.isFinite(position.z)&&Number.isFinite(position.yaw)
   ?{mapId:position.mapId,x:position.x!,z:position.z!,yaw:position.yaw!}
   :null);
 });
 const enterMap=(payload:JoinMapPayload)=>{const previous=roomStore.players.get(socket.id);if(previous){socket.leave(previous.mapId);socket.to(previous.mapId).emit('userLeft',socket.id);publish(previous.mapId)}const matchProfile=payload.matchProfile?safeMatchProfile(payload.matchProfile):previous?.matchProfile;const player:PlayerState={id:socket.id,mapId:payload.mapId,x:payload.x,y:payload.y,direction:'down',isMoving:false,yaw:0,motionState:'idle',timestamp:Date.now(),nickname:clean(payload.nickname,16)||'조치원 주민',appearance:payload.appearance,model:payload.model,matchProfile};roomStore.players.set(socket.id,player);roomStore.recordDailyVisitor(socket.id);socket.join(payload.mapId);const users=roomStore.playersIn(payload.mapId);socket.emit('worldClock',Date.now());socket.emit('portalPositionsUpdated',roomStore.allPortalPositions());socket.emit('bearTreePortalPositionsUpdated',roomStore.bearTreePortalPositions);socket.emit('interactionPositionsUpdated',roomStore.allInteractionPositions());socket.emit('lakeExperiencePositionsUpdated',roomStore.allLakeExperiencePositions());socket.emit('campusFeaturePortalPositionsUpdated',roomStore.allCampusFeaturePortalPositions());socket.emit('lakeWishesUpdated',roomStore.lakeWishes);socket.emit('nearbyChatHistory',roomStore.recentNearbyChat(payload.mapId));if(previous?.mapId==='bear-play-zone'||payload.mapId==='bear-play-zone')publishBearExploration(activeBearExplorers());io.emit('lakeDailyStatsUpdated',roomStore.lakeDailyStats());socket.emit('currentMapUsers',users);socket.to(payload.mapId).emit('userJoined',player);publish(payload.mapId)};
 socket.on('joinMap',enterMap);socket.on('changeMap',enterMap);
 socket.on('updateMatchProfile',value=>{const player=roomStore.players.get(socket.id);if(!player)return;player.matchProfile=safeMatchProfile(value);for(const room of roomStore.directRooms.values()){const participant=room.participants.find(item=>item.id===socket.id);if(participant)participant.matchProfile=player.matchProfile}publish(player.mapId)});
 socket.on('savePortalPosition',position=>{if(roomStore.setPortalPosition(position))io.emit('portalPositionsUpdated',roomStore.allPortalPositions())});
 socket.on('saveCampusFeaturePortalPosition',async position=>{const player=roomStore.players.get(socket.id);if(player?.mapId!=='campus'||!roomStore.setCampusFeaturePortalPosition(position))return;try{await saveCampusFeaturePortalPosition(roomStore.campusFeaturePortalPositions.get(position.portal)!);io.emit('campusFeaturePortalPositionsUpdated',roomStore.allCampusFeaturePortalPositions())}catch(error){console.error('[campus portal save failed]',error);socket.emit('errorMessage','포탈 위치를 서버에 저장하지 못했어요.')}});
 socket.on('migrateBearTreePortalPositions',(positions,ack)=>{const changed=roomStore.migrateBearTreePortalPositions(positions);if(changed)io.emit('bearTreePortalPositionsUpdated',roomStore.bearTreePortalPositions);if(typeof ack==='function')ack({ok:changed,positions:roomStore.bearTreePortalPositions})});
 socket.on('saveInteractionPosition',position=>{if(roomStore.setInteractionPosition(position))io.emit('interactionPositionsUpdated',roomStore.allInteractionPositions())});
 socket.on('enterLakeExperience',experience=>{const player=roomStore.players.get(socket.id);if(!player||player.mapId!=='town'||!['central-plaza','activity-zone','food-shop-zone','wind-hill'].includes(experience))return;roomStore.recordExperienceVisit(socket.id,experience);io.emit('lakeDailyStatsUpdated',roomStore.lakeDailyStats())});
 socket.on('addLakeWish',(raw,ack)=>{const player=roomStore.players.get(socket.id),message=clean(raw,80),reply=typeof ack==='function'?ack:undefined;if(!player||!message){reply?.({ok:false,message:'소원을 보내려면 월드에 다시 접속해 주세요.'});return}const wish=roomStore.addLakeWish(player.nickname,message);reply?.({ok:true,wish});socket.emit('lakeWishAdded',wish);socket.to('town').emit('lakeWishAdded',wish)});
 let lastPositionSavedAt=0;
 socket.on('userMoved',payload=>{const player=roomStore.players.get(socket.id);if(!player||player.mapId!==payload.mapId)return;Object.assign(player,{x:payload.x,y:payload.y,direction:payload.direction,isMoving:payload.isMoving,yaw:Number.isFinite(payload.yaw)?payload.yaw:player.yaw,motionState:payload.motionState,jumpHeight:Number.isFinite(payload.jumpHeight)?Math.max(0,Math.min(140,payload.jumpHeight!)):0,timestamp:payload.timestamp});socket.to(player.mapId).emit('userMoved',player);if(Date.now()-lastPositionSavedAt>=5000){lastPositionSavedAt=Date.now();void savePlayerPosition(player)}});
 socket.on('getBearExploration',ack=>{if(typeof ack==='function')ack(roomStore.bearExplorationState(socket.id))});
 socket.on('collectBearExplorationCard',async(pointId,ack)=>{
  const result=roomStore.collectBearExplorationCard(socket.id,pointId),ids=activeBearExplorers();
  if(result.ok){
   const point=BEAR_POINTS[pointId],found=roomStore.bearExplorationState(socket.id).foundCards,next=(Object.values(BEAR_POINTS).find(item=>!found.includes(item.cardId)));
   const analysis=await bearWildlifeAnswer({mode:'clue',clueId:pointId,question:`${point.place}에서 ${point.clue}을 발견했습니다. 현재까지의 단서가 의미하는 점과 다음 조사 방향을 짧게 알려주세요.`,findings:[...roomStore.bearExplorationAnalyses.values()]});
   roomStore.setBearExplorationAnalysis({cardId:point.cardId,place:point.place,clue:point.clue,analysis,nextHint:next?`다음은 ${next.place} 근처를 조사하도록 탐험가에게 알려주세요.`:'세 단서가 모였습니다. AI가 최종 탐험 보고서를 작성하고 있습니다.'});
   publishBearExploration(ids);await completeBearStory(ids);
  }
  const state=roomStore.bearExplorationState(socket.id);if(typeof ack==='function')ack({...result,state});
 });
 socket.on('analyzeBearExplorationCards',ack=>{const result=roomStore.analyzeBearExploration(socket.id),ids=activeBearExplorers(),state=roomStore.bearExplorationState(socket.id);if(typeof ack==='function')ack({...result,state});if(result.ok){publishBearExploration(ids);void completeBearStory(ids)}});
 socket.on('captureBearExplorationPhoto',ack=>{const result=roomStore.captureBearExplorationPhoto(socket.id),ids=activeBearExplorers(),state=roomStore.bearExplorationState(socket.id);if(typeof ack==='function')ack({...result,state});if(result.ok){publishBearExploration(ids);void completeBearStory(ids)}});
 socket.on('finalizeBearExplorationReport',(payload,ack)=>{const result=roomStore.finalizeBearExplorationReport(socket.id,clean(payload.title,40),payload.cover),ids=activeBearExplorers(),state=roomStore.bearExplorationState(socket.id);if(typeof ack==='function')ack({...result,state});if(result.ok)publishBearExploration(ids)});
 socket.on('sendNearbyChat',raw=>{const player=roomStore.players.get(socket.id),message=clean(raw);if(!player||!message)return;const data=roomStore.addNearbyChat({id:crypto.randomUUID(),mapId:player.mapId,senderId:socket.id,nickname:player.nickname,message,createdAt:Date.now(),channel:'nearby'});io.to(player.mapId).emit('nearbyChat',data)});
 socket.on('encounterFocus',({toId,active})=>{const from=roomStore.players.get(socket.id),to=roomStore.players.get(toId);if(!from||!to||from.mapId!==to.mapId||Math.hypot(from.x-to.x,from.y-to.y)>300)return;socket.emit('encounterFocusChanged',{withId:toId,active:Boolean(active)});io.to(toId).emit('encounterFocusChanged',{withId:socket.id,active:Boolean(active)})});
 socket.on('characterEmote',emote=>{const player=roomStore.players.get(socket.id);if(!player||!['cloths','women'].includes(player.model)||!['hi','clapping','talking',null].includes(emote))return;io.to(player.mapId).emit('characterEmoteChanged',{playerId:socket.id,emote})});
 socket.on('directChatRequest',async toId=>{const from=roomStore.players.get(socket.id),to=roomStore.players.get(toId);if(!from||!to)return socket.emit('errorMessage','접속 중인 사용자에게만 요청할 수 있어요.');if(!await directChatAllowed(socket.id,toId))return socket.emit('errorMessage',AGE_GROUP_CHAT_RESTRICTED_MESSAGE);const requestId=crypto.randomUUID();roomStore.pendingDirect.set(requestId,{fromId:from.id,toId});io.to(toId).emit('directChatRequested',{requestId,from:{id:from.id,nickname:from.nickname,appearance:from.appearance},toId})});
 socket.on('directChatAccept',async requestId=>{const req=roomStore.pendingDirect.get(requestId);if(!req||req.toId!==socket.id)return;roomStore.pendingDirect.delete(requestId);if(!await directChatAllowed(req.fromId,req.toId)){io.to(req.fromId).emit('errorMessage',AGE_GROUP_CHAT_RESTRICTED_MESSAGE);return socket.emit('errorMessage',AGE_GROUP_CHAT_RESTRICTED_MESSAGE)}const first=roomStore.players.get(req.fromId),second=roomStore.players.get(req.toId),firstUserId=socketUserId(req.fromId),secondUserId=socketUserId(req.toId);if(!first||!second||!firstUserId||!secondUserId)return;const room=roomStore.createDirectRoom(first,second);try{await DirectRoomModel.findOneAndUpdate({roomId:room.id},{$set:{memberUserIds:[firstUserId,secondUserId],active:true}},{upsert:true,returnDocument:'after',runValidators:true})}catch(error){console.error('[direct room save failed]',error instanceof Error?error.name:'unknown');io.to(req.fromId).emit('errorMessage','채팅방을 저장하지 못했습니다.');return socket.emit('errorMessage','채팅방을 저장하지 못했습니다.')}room.participants.forEach(p=>{io.sockets.sockets.get(p.id)?.join(room.id);io.to(p.id).emit('directChatStarted',room)})});
 socket.on('directChatReject',requestId=>{const req=roomStore.pendingDirect.get(requestId);if(!req||req.toId!==socket.id)return;roomStore.pendingDirect.delete(requestId);io.to(req.fromId).emit('directChatRejected',{requestId,byId:socket.id})});
 socket.on('directMessage',async({directRoomId,message:raw})=>{const player=roomStore.players.get(socket.id),message=clean(raw,500),userId=socket.data.userId as string|undefined;if(!player||!message||!userId)return;const policy=await loadDirectChatPolicy(directRoomId,userId);if(!policy.allowed)return socket.emit('errorMessage',policy.code==='AGE_GROUP_CHAT_RESTRICTED'?AGE_GROUP_CHAT_RESTRICTED_MESSAGE:'채팅방 권한을 확인할 수 없습니다.');const messageId=crypto.randomUUID(),createdAt=Date.now();try{await DirectMessageModel.create({messageId,roomId:directRoomId,senderUserId:userId,message,type:'user',sentAt:new Date(createdAt)})}catch(error){console.error('[direct message save failed]',error instanceof Error?error.name:'unknown');return socket.emit('errorMessage','메시지를 저장하지 못했습니다.')}const data=roomStore.addDirectMessage({id:messageId,directRoomId,senderId:socket.id,nickname:player.nickname,message,createdAt,type:'user'});try{conversationInterestCache.merge(directRoomId,userId,localInterestKeywordExtractor.extract(message))}catch(error){console.warn('[conversation interest extraction failed]',error instanceof Error?error.name:'unknown')}io.to(directRoomId).emit('directMessageReceived',data)});
 socket.on('directChatClosed',directRoomId=>{const room=roomStore.directRooms.get(directRoomId);if(room?.participants.some(p=>p.id===socket.id)){room.active=false;io.to(directRoomId).emit('directChatClosed',{directRoomId,byId:socket.id})}});
 socket.on('proposeGovernmentSession',({directRoomId,activityTopic})=>{const room=roomStore.directRooms.get(directRoomId),from=roomStore.players.get(socket.id);if(!room?.active||!from||!room.participants.some(participant=>participant.id===socket.id))return socket.emit('errorMessage','활성화된 1대1 대화에서만 이동을 제안할 수 있어요.');const existing=[...roomStore.governmentProposals.values()].find(item=>item.directRoomId===directRoomId&&item.status==='pending');if(existing)return socket.emit('errorMessage','상대방의 응답을 기다리는 이동 제안이 있어요.');const proposal={id:`government-${crypto.randomUUID()}`,directRoomId,fromId:socket.id,fromNickname:from.nickname,activityTopic:clean(activityTopic??'',40)||undefined,status:'pending' as const,createdAt:Date.now()};roomStore.governmentProposals.set(proposal.id,proposal);io.to(directRoomId).emit('governmentSessionProposalUpdated',proposal)});
 socket.on('respondGovernmentSession',({proposalId,accept})=>{const proposal=roomStore.governmentProposals.get(proposalId),room=proposal&&roomStore.directRooms.get(proposal.directRoomId);if(!proposal||!room||proposal.status!=='pending'||proposal.fromId===socket.id||!room.participants.some(participant=>participant.id===socket.id))return socket.emit('errorMessage','응답할 수 있는 이동 제안을 찾지 못했어요.');proposal.status=accept?'accepted':'rejected';proposal.respondedAt=Date.now();if(accept){proposal.sessionId=`government-session-${crypto.randomUUID()}`;roomStore.createGovernmentPlan(proposal.sessionId,room);room.participants.forEach(participant=>io.sockets.sockets.get(participant.id)?.join(proposal.sessionId!))}io.to(proposal.directRoomId).emit('governmentSessionProposalUpdated',proposal)});
 socket.on('getGovernmentPlan',({sessionId},ack)=>{const plan=roomStore.governmentPlans.get(sessionId);if(!plan||!plan.memberIds.includes(socket.id))return ack({ok:false,message:'공동 계획 세션을 찾지 못했어요.'});socket.join(sessionId);return ack({ok:true,plan})});
 socket.on('updateGovernmentPlan',({sessionId,update},ack)=>{const plan=roomStore.updateGovernmentPlan(sessionId,socket.id,update);if(!plan){ack?.({ok:false,message:'공동 계획을 수정할 권한이 없어요.'});return}io.to(sessionId).emit('governmentPlanUpdated',plan);ack?.({ok:true})});
 socket.on('createGroup',({name,inviteeIds})=>{const owner=roomStore.players.get(socket.id);if(!owner)return;const group=roomStore.createGroup(owner,clean(name,30),inviteeIds);group.memberIds.forEach(id=>{io.sockets.sockets.get(id)?.join(group.id);io.to(id).emit('groupCreated',group)})});
 socket.on('joinGroup',groupId=>{const player=roomStore.players.get(socket.id),group=roomStore.groups.get(groupId);if(!player||!group||player.mapId!==group.mapId)return;group.memberIds=[...new Set([...group.memberIds,socket.id])];socket.join(group.id);io.to(group.id).emit('groupUpdated',group)});
 socket.on('sendGroupChat',({groupId,message:raw})=>{const player=roomStore.players.get(socket.id),group=roomStore.groups.get(groupId),message=clean(raw);if(!player||!group||!group.memberIds.includes(socket.id)||!message)return;io.to(group.id).emit('nearbyChat',{id:crypto.randomUUID(),mapId:player.mapId,senderId:socket.id,nickname:player.nickname,message,createdAt:Date.now(),channel:'group'})});
 socket.on('disconnect',()=>{const player=roomStore.players.get(socket.id);if(!player)return;void savePlayerPosition(player);roomStore.removePlayer(socket.id);socket.to(player.mapId).emit('userLeft',socket.id);publish(player.mapId);if(player.mapId==='bear-play-zone')publishBearExploration(activeBearExplorers())});
}
