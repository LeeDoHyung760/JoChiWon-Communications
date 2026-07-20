import type { DirectRoom,GroupRoom,PlayerState } from '../../../shared/socket-events.js';
export class RoomStore {
 players=new Map<string,PlayerState>(); groups=new Map<string,GroupRoom>(); pendingDirect=new Map<string,{fromId:string;toId:string}>(); directRooms=new Map<string,DirectRoom>();
 playersIn(mapId:string){return [...this.players.values()].filter(p=>p.mapId===mapId)}
 removePlayer(id:string){this.players.delete(id);for(const group of this.groups.values()){group.memberIds=group.memberIds.filter(x=>x!==id);if(!group.memberIds.length)this.groups.delete(group.id)}for(const [key,req] of this.pendingDirect)if(req.fromId===id||req.toId===id)this.pendingDirect.delete(key)}
 createGroup(owner:PlayerState,name:string,inviteeIds:string[]){const id=`group-${crypto.randomUUID()}`;const group:GroupRoom={id,name:name.trim()||`${owner.nickname}의 모임`,ownerId:owner.id,memberIds:[...new Set([owner.id,...inviteeIds.filter(id=>this.players.has(id))])],mapId:owner.mapId};this.groups.set(id,group);return group}
 createDirectRoom(first:PlayerState,second:PlayerState){const ids=[first.id,second.id].sort();const existing=[...this.directRooms.values()].find(r=>r.participants.map(p=>p.id).sort().join(':')===ids.join(':'));if(existing)return existing;const room:DirectRoom={id:`direct-${crypto.randomUUID()}`,participants:[first,second].map(({id,nickname,appearance})=>({id,nickname,appearance}))};this.directRooms.set(room.id,room);return room}
}
export const roomStore=new RoomStore();
