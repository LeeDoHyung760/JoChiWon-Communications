export type MapId = 'station' | 'station-platform' | 'market' | 'culture' | 'park';
export type Direction = 'up' | 'down' | 'left' | 'right';
export interface Appearance { hair:string; face:string; top:string; bottom:string }
export interface PlayerState { id:string; mapId:MapId; x:number; y:number; direction:Direction; isMoving:boolean; nickname:string; appearance:Appearance }
export interface JoinRoomPayload { mapId:MapId; nickname:string; appearance:Appearance; x:number; y:number }
export interface MovementPayload { mapId:MapId; x:number; y:number; direction:Direction; isMoving:boolean }
export interface ChatMessage { id:string; mapId:MapId; senderId:string; nickname:string; message:string; createdAt:number; channel:'nearby'|'group' }
export interface DirectRequest { requestId:string; from:Pick<PlayerState,'id'|'nickname'>; toId:string }
export interface GroupRoom { id:string; name:string; ownerId:string; memberIds:string[]; mapId:MapId }
export interface ServerToClientEvents {
 roomState:(players:PlayerState[])=>void; playerJoined:(player:PlayerState)=>void; playerMoved:(player:PlayerState)=>void; playerLeft:(id:string)=>void;
 nearbyChat:(message:ChatMessage)=>void; directRequest:(request:DirectRequest)=>void; directResponse:(data:{requestId:string;fromId:string;accepted:boolean})=>void;
 groupCreated:(group:GroupRoom)=>void; groupUpdated:(group:GroupRoom)=>void; errorMessage:(message:string)=>void;
}
export interface ClientToServerEvents {
 joinRoom:(payload:JoinRoomPayload)=>void; movePlayer:(payload:MovementPayload)=>void; sendNearbyChat:(message:string)=>void;
 requestDirect:(toId:string)=>void; respondDirect:(data:{requestId:string;accepted:boolean})=>void;
 createGroup:(data:{name:string;inviteeIds:string[]})=>void; joinGroup:(groupId:string)=>void; sendGroupChat:(data:{groupId:string;message:string})=>void;
}
