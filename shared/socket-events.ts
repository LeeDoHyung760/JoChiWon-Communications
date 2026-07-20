export type MapId = 'town' | 'jochwon-station' | 'traditional-market' | 'jochwon-park' | 'college-street';
export type Direction = 'up' | 'down' | 'left' | 'right';
export interface Appearance { hair:string; face:string; top:string; bottom:string }
export interface PublicMatchProfile { mbti:string; interests:string[]; usagePurposes:string[]; preferredPlaceCategories:string[] }
export interface PlayerState { id:string; mapId:MapId; x:number; y:number; direction:Direction; isMoving:boolean; nickname:string; appearance:Appearance; matchProfile?:PublicMatchProfile }
export interface JoinMapPayload { mapId:MapId; nickname:string; appearance:Appearance; x:number; y:number; matchProfile?:PublicMatchProfile }
export interface MovementPayload { mapId:MapId; x:number; y:number; direction:Direction; isMoving:boolean }
export interface ChatMessage { id:string; mapId:MapId; senderId:string; nickname:string; message:string; createdAt:number; channel:'nearby'|'group' }
export interface DirectRequest { requestId:string; from:Pick<PlayerState,'id'|'nickname'|'appearance'>; toId:string }
export interface DirectRoom { id:string; participants:Array<Pick<PlayerState,'id'|'nickname'|'appearance'>> }
export interface DirectMessage { id:string; directRoomId:string; senderId:string; nickname:string; message:string; createdAt:number }
export interface GroupRoom { id:string; name:string; ownerId:string; memberIds:string[]; mapId:MapId }
export interface ServerToClientEvents {
 currentMapUsers:(players:PlayerState[])=>void; userJoined:(player:PlayerState)=>void; userMoved:(player:PlayerState)=>void; userLeft:(id:string)=>void; onlineUsersUpdated:(players:PlayerState[])=>void;
 nearbyChat:(message:ChatMessage)=>void; directChatRequested:(request:DirectRequest)=>void; directChatRejected:(data:{requestId:string;byId:string})=>void; directChatStarted:(room:DirectRoom)=>void; directMessageReceived:(message:DirectMessage)=>void; directChatClosed:(data:{directRoomId:string;byId:string})=>void;
 groupCreated:(group:GroupRoom)=>void; groupUpdated:(group:GroupRoom)=>void; errorMessage:(message:string)=>void;
}
export interface ClientToServerEvents {
 joinMap:(payload:JoinMapPayload)=>void; changeMap:(payload:JoinMapPayload)=>void; userMoved:(payload:MovementPayload)=>void; sendNearbyChat:(message:string)=>void;
 directChatRequest:(toId:string)=>void; directChatAccept:(requestId:string)=>void; directChatReject:(requestId:string)=>void; directMessage:(data:{directRoomId:string;message:string})=>void; directChatClosed:(directRoomId:string)=>void;
 createGroup:(data:{name:string;inviteeIds:string[]})=>void; joinGroup:(groupId:string)=>void; sendGroupChat:(data:{groupId:string;message:string})=>void;
}
