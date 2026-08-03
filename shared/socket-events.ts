export type MapId = 'town' | 'arts-center' | 'festival-experience' | 'food-experience' | 'club-street-festival' | 'bear-tree-park' | 'bear-play-zone' | 'garden' | 'campus' | 'student-hall' | 'recruitment-center' | 'project-room' | 'government' | 'government-central-plaza' | 'government-policy-hall' | 'government-observatory' | 'sejong-smart-city' | 'jochwon-station' | 'traditional-market' | 'jochwon-park' | 'college-street';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type MotionState = 'idle' | 'walk' | 'run';
export type CharacterEmote = 'hi' | 'clapping' | 'talking';
export type CharacterModel = 'custom' | 'chungnyeong' | 'girl1' | 'boy1' | 'cloths' | 'women';
export interface Appearance { hair:string; hairStyle?:'hair1'|'hair2'|'both'; topStyle?:'style1'|'style2'; bottomStyle?:'style1'|'style2'; shoesStyle?:'style1'|'style2'; outfitStyle?:'outfit1'|'outfit2'; face:string; top:string; topLayer?:string; bottom:string; shoes:string; accessory?:string }
export interface PublicMatchProfile { mbti:string; interests:string[]; usagePurposes:string[]; preferredPlaceCategories:string[]; experienceRecords:string[]; recordVisibility?:'public'|'private'; chatEnabled?:boolean }
export interface PlayerState { id:string; mapId:MapId; projectRoomId?:string; x:number; y:number; direction:Direction; isMoving:boolean; yaw:number; motionState:MotionState; jumpHeight?:number; timestamp:number; nickname:string; appearance:Appearance; model:CharacterModel; matchProfile?:PublicMatchProfile }
export interface JoinMapPayload { mapId:MapId; projectRoomId?:string; nickname:string; appearance:Appearance; model:CharacterModel; x:number; y:number; matchProfile?:PublicMatchProfile }
export interface MovementPayload { mapId:MapId; x:number; y:number; direction:Direction; isMoving:boolean; yaw:number; motionState:MotionState; jumpHeight?:number; timestamp:number }
export interface RespawnPosition { x:number; z:number; yaw:number }
export const FIXED_LAKE_RESPAWN:Readonly<RespawnPosition>={x:1870,z:1180,yaw:2.1};
export interface PlayerResumeState extends RespawnPosition { mapId:MapId;savedAt?:number }
export interface PortalPosition { destination:Extract<MapId,'town'|'arts-center'|'festival-experience'|'food-experience'|'club-street-festival'|'bear-tree-park'|'garden'|'campus'|'recruitment-center'|'project-room'|'government'|'government-central-plaza'|'government-policy-hall'|'government-observatory'|'sejong-smart-city'>; x:number; z:number }
export interface BearTreePortalPositions { town:{x:number;z:number}; photo:{x:number;z:number} }
export interface WorldInteractionPosition { destination:Extract<MapId,'bear-tree-park'|'bear-play-zone'>; x:number; z:number }
export type LakeExperienceId = 'central-plaza' | 'activity-zone' | 'food-shop-zone' | 'wind-hill';
export interface LakeExperiencePosition { experience:LakeExperienceId; x:number; z:number }
export type CampusFeaturePortalId='people'|'clubs'|'recruit'|'government';
export interface CampusFeaturePortalPosition { portal:CampusFeaturePortalId; x:number; z:number }
export interface LakeWish { id:string;nickname:string;message:string;createdAt:number }
export interface LakeDailyStats { date:string;visitors:number;centralPlazaVisits:number;activityZoneVisits:number;foodShopZoneVisits:number;windHillVisits:number;popularExperience:string }
export interface ChatMessage { id:string; mapId:MapId; senderId:string; nickname:string; message:string; createdAt:number; channel:'nearby'|'group' }
export interface DirectRequest { requestId:string; from:Pick<PlayerState,'id'|'nickname'|'appearance'>; toId:string }
export interface DirectRoomMeetingPlace {roomId:string;placeId:string;placeName:string;category:string;address:string;roadAddress?:string;externalUrl?:string;selectedByUserId:string;selectedByNickname:string;selectedAt:string;status:'proposed'|'confirmed'|'cancelled'}
export interface DirectRoom { id:string; participants:Array<Pick<PlayerState,'id'|'nickname'|'appearance'|'matchProfile'>>; active:boolean; acceptedAt:number;meetingPlace?:DirectRoomMeetingPlace }
export interface GovernmentSessionProposal { id:string;directRoomId:string;fromId:string;fromNickname:string;activityTopic?:string;status:'pending'|'accepted'|'rejected';createdAt:number;respondedAt?:number;sessionId?:string }
export interface GovernmentPlanMemberSelection {nickname:string;themes:string[];placeIds:string[]}
export interface GovernmentPlanConstraints {date:string;startTime:string;endTime:string;transport:'대중교통'|'도보·자전거'|'자가용';meal:boolean;cafe:boolean;experience:boolean;activities:string[]}
export interface GovernmentCourseItem {id:string;time:string;placeId:string;placeName:string;category:string;durationMinutes:number;reason:string}
export interface GovernmentCourse {id:string;title:string;summary:string;items:GovernmentCourseItem[];generatedAt:number;source:'openai'|'맞춤 규칙'}
export interface GovernmentPlanState {sessionId:string;memberIds:string[];selections:Record<string,GovernmentPlanMemberSelection>;constraints:GovernmentPlanConstraints;course?:GovernmentCourse;updatedAt:number}
export interface GovernmentPlanUpdate {themes?:string[];placeIds?:string[];constraints?:Partial<GovernmentPlanConstraints>;course?:GovernmentCourse|null}
export interface DirectRecommendationPlace { id:string;name:string;category:string;address:string;roadAddress?:string;phone?:string;externalUrl?:string;longitude?:number;latitude?:number;distanceMeters?:number;source:'kakao'|'mock';recommendationReason:string }
export interface DirectRecommendation { recommendationId:string;summary:string;basis?:{activity:string;region:string;rejectedCategories:string[];mood:string[];regionNotice?:string};places:DirectRecommendationPlace[];provider?:{ai:'openai'|'mock';place:'kakao'|'mock';fallbackUsed:boolean;fallbackReason?:string};debug?:{intent:string;rejectedCategories:string[];queries:string[];rawResultCount:number;compatibleResultCount:number;filteredOutCount:number;provider:'kakao'|'mock';fallbackUsed:boolean;expandedRegion:boolean} }
export interface DirectMessage { id:string; directRoomId:string; senderId:string; nickname:string; message:string; createdAt:number; type:'user'|'system'|'ai-recommendation'|'system-meeting-place'; deleted?:boolean; recommendation?:DirectRecommendation;meetingPlace?:DirectRoomMeetingPlace|null;previousMeetingPlace?:DirectRoomMeetingPlace }
export interface GroupRoom { id:string; name:string; ownerId:string; memberIds:string[]; mapId:MapId }
export type BearExplorationPointId='waterfall'|'cave'|'tree';
export type BearExplorationCardId='card_1'|'card_2'|'card_3';
export type BearExplorationRole='explorer'|'recorder'|'photographer';
export interface BearExplorationMember {playerId:string;nickname:string;cardId:BearExplorationCardId}
export interface BearExplorationRoleMember {playerId:string;nickname:string;role:BearExplorationRole}
export interface BearExplorationAnalysis {cardId:BearExplorationCardId;place:string;clue:string;analysis:string;nextHint:string}
export interface BearExplorationReport {title:string;cover:'waterfall'|'cave'|'tree';content:string;route:string[];published:boolean;teamName:string}
export interface BearExplorationState {
 missionId:string;
 title:string;
 prompt:string;
 ownedCard?:BearExplorationCardId;
 role:BearExplorationRole;
 roleMembers:BearExplorationRoleMember[];
 foundCards:BearExplorationCardId[];
 pendingCards:BearExplorationCardId[];
 mergedCards:BearExplorationCardId[];
 members:BearExplorationMember[];
 analyses:BearExplorationAnalysis[];
 aiGuidance?:string;
 photoReady:boolean;
 photoComplete:boolean;
 story?:string;
 report?:BearExplorationReport;
 completedRouteCount:number;
 completedRoutes:string[][];
 completed:boolean;
}
export interface ServerToClientEvents {
 worldClock:(serverNow:number)=>void; respawnPositionUpdated:(position:RespawnPosition)=>void; portalPositionsUpdated:(positions:PortalPosition[])=>void; bearTreePortalPositionsUpdated:(positions:BearTreePortalPositions)=>void; interactionPositionsUpdated:(positions:WorldInteractionPosition[])=>void; lakeExperiencePositionsUpdated:(positions:LakeExperiencePosition[])=>void; campusFeaturePortalPositionsUpdated:(positions:CampusFeaturePortalPosition[])=>void; lakeWishesUpdated:(wishes:LakeWish[])=>void; lakeWishAdded:(wish:LakeWish)=>void; lakeDailyStatsUpdated:(stats:LakeDailyStats)=>void; currentMapUsers:(players:PlayerState[])=>void; userJoined:(player:PlayerState)=>void; userMoved:(player:PlayerState)=>void; userLeft:(id:string)=>void; onlineUsersUpdated:(players:PlayerState[])=>void;
 nearbyChat:(message:ChatMessage)=>void; nearbyChatHistory:(messages:ChatMessage[])=>void; directChatRequested:(request:DirectRequest)=>void; directChatRejected:(data:{requestId:string;byId:string})=>void; directChatStarted:(room:DirectRoom)=>void; directMessageReceived:(message:DirectMessage)=>void; directChatClosed:(data:{directRoomId:string;byId:string})=>void;
 encounterFocusChanged:(data:{withId:string;active:boolean})=>void;
 characterEmoteChanged:(data:{playerId:string;emote:CharacterEmote|null})=>void;
 directRecommendationStarted:(data:{directRoomId:string;stage:'analyzing'|'searching'})=>void; directRecommendationCompleted:(data:{directRoomId:string;message:DirectMessage})=>void; directRecommendationFailed:(data:{directRoomId:string;category:'permission'|'message_shortage'|'cooldown'|'openai'|'kakao_authentication'|'place_empty'|'network'|'unknown';message:string})=>void;
 directMeetingPlaceUpdated:(data:{roomId:string;meetingPlace:DirectRoomMeetingPlace|null})=>void;
 governmentSessionProposalUpdated:(proposal:GovernmentSessionProposal)=>void;
 governmentPlanUpdated:(plan:GovernmentPlanState)=>void;
 groupCreated:(group:GroupRoom)=>void; groupUpdated:(group:GroupRoom)=>void; bearExplorationUpdated:(state:BearExplorationState)=>void; errorMessage:(message:string)=>void;
}
export interface ClientToServerEvents {
 enterProjectRoomInstance:(projectRoomId:string)=>void;
 getRespawnPosition:(ack:(position:RespawnPosition)=>void)=>void; saveCurrentPositionAsRespawn:(ack:(result:{ok:boolean;position?:RespawnPosition;message:string})=>void)=>void; getPlayerResumeState:(ack:(position:PlayerResumeState|null)=>void)=>void; migrateBearTreePortalPositions:(positions:BearTreePortalPositions,ack:(result:{ok:boolean;positions:BearTreePortalPositions})=>void)=>void; joinMap:(payload:JoinMapPayload)=>void; changeMap:(payload:JoinMapPayload)=>void; updateMatchProfile:(profile:PublicMatchProfile)=>void; userMoved:(payload:MovementPayload)=>void; savePortalPosition:(position:PortalPosition)=>void; saveCampusFeaturePortalPosition:(position:CampusFeaturePortalPosition)=>void; saveInteractionPosition:(position:WorldInteractionPosition)=>void; saveLakeExperiencePosition:(position:LakeExperiencePosition)=>void; enterLakeExperience:(experience:LakeExperienceId)=>void; addLakeWish:(message:string,ack:(result:{ok:boolean;wish?:LakeWish;message?:string})=>void)=>void; sendNearbyChat:(message:string)=>void;
 directChatRequest:(toId:string)=>void; directChatAccept:(requestId:string)=>void; directChatReject:(requestId:string)=>void; directMessage:(data:{directRoomId:string;message:string})=>void; directChatClosed:(directRoomId:string)=>void;
 encounterFocus:(data:{toId:string;active:boolean})=>void;
 characterEmote:(emote:CharacterEmote|null)=>void;
 proposeGovernmentSession:(data:{directRoomId:string;activityTopic?:string})=>void; respondGovernmentSession:(data:{proposalId:string;accept:boolean})=>void;
 getGovernmentPlan:(data:{sessionId:string},ack:(result:{ok:boolean;plan?:GovernmentPlanState;message?:string})=>void)=>void; updateGovernmentPlan:(data:{sessionId:string;update:GovernmentPlanUpdate},ack?:(result:{ok:boolean;message?:string})=>void)=>void;
 createGroup:(data:{name:string;inviteeIds:string[]})=>void; joinGroup:(groupId:string)=>void; sendGroupChat:(data:{groupId:string;message:string})=>void;
 getBearExploration:(ack:(state:BearExplorationState)=>void)=>void; collectBearExplorationCard:(pointId:BearExplorationPointId,ack:(result:{ok:boolean;message:string;state:BearExplorationState})=>void)=>void; analyzeBearExplorationCards:(ack:(result:{ok:boolean;message:string;state:BearExplorationState})=>void)=>void; captureBearExplorationPhoto:(ack:(result:{ok:boolean;message:string;state:BearExplorationState})=>void)=>void; finalizeBearExplorationReport:(payload:{title:string;cover:'waterfall'|'cave'|'tree'},ack:(result:{ok:boolean;message:string;state:BearExplorationState})=>void)=>void;
}
