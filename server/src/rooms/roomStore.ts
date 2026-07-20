import type { GroupRoom,PlayerState } from '../../../shared/socket-events.js';
export class RoomStore {
 players=new Map<string,PlayerState>(); groups=new Map<string,GroupRoom>(); pendingDirect=new Map<string,{fromId:string;toId:string}>();
 playersIn(mapId:string){return [...this.players.values()].filter(p=>p.mapId===mapId)}
 removePlayer(id:string){this.players.delete(id);for(const group of this.groups.values()){group.memberIds=group.memberIds.filter(x=>x!==id);if(!group.memberIds.length)this.groups.delete(group.id)}}
 createGroup(owner:PlayerState,name:string,inviteeIds:string[]){const id=`group-${crypto.randomUUID()}`;const group:GroupRoom={id,name:name.trim()||`${owner.nickname}의 모임`,ownerId:owner.id,memberIds:[...new Set([owner.id,...inviteeIds.filter(id=>this.players.has(id))])],mapId:owner.mapId};this.groups.set(id,group);return group}
}
export const roomStore=new RoomStore();
