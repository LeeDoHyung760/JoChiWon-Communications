export type MapId = 'town' | 'bear-tree-park' | 'bear-play-zone' | 'garden' | 'campus' | 'jochwon-station' | 'traditional-market' | 'jochwon-park' | 'college-street';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type MotionState = 'idle' | 'walk' | 'run';
export type CharacterModel = 'custom' | 'chungnyeong' | 'girl1' | 'boy1' | 'cloths';
export interface Appearance { hair:string; face:string; top:string; topLayer?:string; bottom:string; shoes:string; accessory?:string }
export interface PublicMatchProfile { mbti:string; interests:string[]; usagePurposes:string[]; preferredPlaceCategories:string[]; experienceRecords:string[] }
export interface PlayerState { id:string; mapId:MapId; x:number; y:number; direction:Direction; isMoving:boolean; yaw:number; motionState:MotionState; jumpHeight?:number; timestamp:number; nickname:string; appearance:Appearance; model:CharacterModel; matchProfile?:PublicMatchProfile }
export interface JoinMapPayload { mapId:MapId; nickname:string; appearance:Appearance; model:CharacterModel; x:number; y:number; matchProfile?:PublicMatchProfile }
export interface MovementPayload { mapId:MapId; x:number; y:number; direction:Direction; isMoving:boolean; yaw:number; motionState:MotionState; jumpHeight?:number; timestamp:number }
export interface RespawnPosition { x:number; z:number; yaw:number }
export interface PortalPosition { destination:Extract<MapId,'town'|'bear-tree-park'|'garden'|'campus'>; x:number; z:number }
export interface WorldInteractionPosition { destination:Extract<MapId,'bear-tree-park'|'bear-play-zone'>; x:number; z:number }
export type LakeExperienceId = 'central-plaza' | 'wind-hill';
export interface LakeExperiencePosition { experience:LakeExperienceId; x:number; z:number }
export interface LakeWish { id:string;nickname:string;message:string;createdAt:number }
export interface LakeDailyStats { date:string;visitors:number;centralPlazaVisits:number;windHillVisits:number;popularExperience:string }
export interface ChatMessage { id:string; mapId:MapId; senderId:string; nickname:string; message:string; createdAt:number; channel:'nearby'|'group' }
export interface DirectRequest { requestId:string; from:Pick<PlayerState,'id'|'nickname'|'appearance'>; toId:string }
export interface DirectRoomMeetingPlace {roomId:string;placeId:string;placeName:string;category:string;address:string;roadAddress?:string;externalUrl?:string;selectedByUserId:string;selectedByNickname:string;selectedAt:string;status:'proposed'|'confirmed'|'cancelled'}
export interface DirectRoom { id:string; participants:Array<Pick<PlayerState,'id'|'nickname'|'appearance'|'matchProfile'>>; active:boolean; acceptedAt:number;meetingPlace?:DirectRoomMeetingPlace }
export interface DirectRecommendationPlace { id:string;name:string;category:string;address:string;roadAddress?:string;phone?:string;externalUrl?:string;longitude?:number;latitude?:number;distanceMeters?:number;source:'kakao'|'mock';recommendationReason:string }
export interface DirectRecommendation { recommendationId:string;summary:string;basis?:{activity:string;region:string;rejectedCategories:string[];mood:string[];regionNotice?:string};places:DirectRecommendationPlace[];provider?:{ai:'openai'|'mock';place:'kakao'|'mock';fallbackUsed:boolean;fallbackReason?:string};debug?:{intent:string;rejectedCategories:string[];queries:string[];rawResultCount:number;compatibleResultCount:number;filteredOutCount:number;provider:'kakao'|'mock';fallbackUsed:boolean;expandedRegion:boolean} }
export interface DirectMessage { id:string; directRoomId:string; senderId:string; nickname:string; message:string; createdAt:number; type:'user'|'system'|'ai-recommendation'|'system-meeting-place'; deleted?:boolean; recommendation?:DirectRecommendation;meetingPlace?:DirectRoomMeetingPlace|null;previousMeetingPlace?:DirectRoomMeetingPlace }
export interface GroupRoom { id:string; name:string; ownerId:string; memberIds:string[]; mapId:MapId }
export interface ServerToClientEvents {
 worldClock:(serverNow:number)=>void; respawnPositionUpdated:(position:RespawnPosition)=>void; portalPositionsUpdated:(positions:PortalPosition[])=>void; interactionPositionsUpdated:(positions:WorldInteractionPosition[])=>void; lakeExperiencePositionsUpdated:(positions:LakeExperiencePosition[])=>void; lakeWishesUpdated:(wishes:LakeWish[])=>void; lakeWishAdded:(wish:LakeWish)=>void; lakeDailyStatsUpdated:(stats:LakeDailyStats)=>void; currentMapUsers:(players:PlayerState[])=>void; userJoined:(player:PlayerState)=>void; userMoved:(player:PlayerState)=>void; userLeft:(id:string)=>void; onlineUsersUpdated:(players:PlayerState[])=>void;
 nearbyChat:(message:ChatMessage)=>void; directChatRequested:(request:DirectRequest)=>void; directChatRejected:(data:{requestId:string;byId:string})=>void; directChatStarted:(room:DirectRoom)=>void; directMessageReceived:(message:DirectMessage)=>void; directChatClosed:(data:{directRoomId:string;byId:string})=>void;
 directRecommendationStarted:(data:{directRoomId:string;stage:'analyzing'|'searching'})=>void; directRecommendationCompleted:(data:{directRoomId:string;message:DirectMessage})=>void; directRecommendationFailed:(data:{directRoomId:string;category:'permission'|'message_shortage'|'cooldown'|'openai'|'kakao_authentication'|'place_empty'|'network'|'unknown';message:string})=>void;
 directMeetingPlaceUpdated:(data:{roomId:string;meetingPlace:DirectRoomMeetingPlace|null})=>void;
 groupCreated:(group:GroupRoom)=>void; groupUpdated:(group:GroupRoom)=>void; errorMessage:(message:string)=>void;
}
export interface ClientToServerEvents {
 getRespawnPosition:(ack:(position:RespawnPosition)=>void)=>void; saveRespawnPosition:(position:RespawnPosition,ack:(result:{ok:boolean;position:RespawnPosition})=>void)=>void; joinMap:(payload:JoinMapPayload)=>void; changeMap:(payload:JoinMapPayload)=>void; updateMatchProfile:(profile:PublicMatchProfile)=>void; userMoved:(payload:MovementPayload)=>void; savePortalPosition:(position:PortalPosition)=>void; saveInteractionPosition:(position:WorldInteractionPosition)=>void; saveLakeExperiencePosition:(position:LakeExperiencePosition)=>void; enterLakeExperience:(experience:LakeExperienceId)=>void; addLakeWish:(message:string,ack:(result:{ok:boolean;wish?:LakeWish;message?:string})=>void)=>void; sendNearbyChat:(message:string)=>void;
 directChatRequest:(toId:string)=>void; directChatAccept:(requestId:string)=>void; directChatReject:(requestId:string)=>void; directMessage:(data:{directRoomId:string;message:string})=>void; directChatClosed:(directRoomId:string)=>void;
 createGroup:(data:{name:string;inviteeIds:string[]})=>void; joinGroup:(groupId:string)=>void; sendGroupChat:(data:{groupId:string;message:string})=>void;
}
