import { io,type Socket } from 'socket.io-client';
import type { ClientToServerEvents,DirectMessage,DirectRequest,DirectRoom,ServerToClientEvents } from '../../../shared/socket-events.js';

type Client=Socket<ServerToClientEvents,ClientToServerEvents>;
const base='http://localhost:3001';
const once=<T>(socket:Client,event:keyof ServerToClientEvents)=>new Promise<T>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Timed out: ${String(event)}`)),30_000);socket.once(event as never,((value:T)=>{clearTimeout(timer);resolve(value)}) as never)});
const connect=(nickname:string)=>new Promise<Client>((resolve,reject)=>{const socket:Client=io(base,{transports:['websocket']});socket.once('connect',()=>{socket.emit('joinMap',{mapId:'jochwon-station',nickname,appearance:{hair:'short',face:'smile',top:'green',bottom:'navy',shoes:'black'},model:'chungnyeong',x:100,y:100,matchProfile:{mbti:'',interests:['카페','디저트'],usagePurposes:['맛과 쉼'],preferredPlaceCategories:['카페'],experienceRecords:['복숭아 디저트 저장']}});resolve(socket)});socket.once('connect_error',reject)});
const post=async(roomId:string,socketId:string)=>fetch(`${base}/api/direct-rooms/${encodeURIComponent(roomId)}/recommendations`,{method:'POST',headers:{'Content-Type':'application/json','X-Socket-Id':socketId},body:JSON.stringify({userRequest:'조치원역에서 너무 멀지 않은 곳'})});

const a=await connect('참여자A'),b=await connect('참여자B');
try{
 const requestPromise=once<DirectRequest>(b,'directChatRequested');a.emit('directChatRequest',b.id!);const request=await requestPromise;
 const roomA=once<DirectRoom>(a,'directChatStarted'),roomB=once<DirectRoom>(b,'directChatStarted');b.emit('directChatAccept',request.requestId);const [room]=await Promise.all([roomA,roomB]);
 const insufficient=await post(room.id,a.id!);console.log(`[Direct Verify] insufficient messages: ${insufficient.status}`);
 const send=async(socket:Client,message:string)=>{const received=once<DirectMessage>(a,'directMessageReceived');socket.emit('directMessage',{directRoomId:room.id,message});await received};
 await send(a,'조용한곳 좋아해?');await send(b,'난 좋아하긴해');await send(a,'카페?');await send(b,'노노');await send(a,'영화관');await send(b,'ㅇㅇ');
 const completedA=once<{directRoomId:string;message:DirectMessage}>(a,'directRecommendationCompleted'),completedB=once<{directRoomId:string;message:DirectMessage}>(b,'directRecommendationCompleted');
 const response=await post(room.id,a.id!);const body=await response.json() as {error?:string;message?:DirectMessage;provider?:{ai:string;place:string;fallbackUsed:boolean;fallbackReason?:string};debug?:{intent:string;rejectedCategories:string[];queries:string[];rawResultCount:number;compatibleResultCount:number;filteredOutCount:number;provider:string;fallbackUsed:boolean}};console.log(`[Direct Verify] recommendation HTTP: ${response.status}${body.error?` (${body.error})`:''}`);if(!response.ok)throw new Error(`Recommendation request failed: ${response.status}`);const [eventA,eventB]=await Promise.all([completedA,completedB]);
 console.log(`[Direct Verify] recommendation status: ${response.status}`);console.log(`[Direct Verify] same event for both: ${eventA.message.id===eventB.message.id}`);console.log(`[Direct Verify] message type: ${body.message?.type}`);console.log(`[Direct Verify] place count: ${body.message?.recommendation?.places.length??0}`);console.log(`[Direct Verify] providers: ${body.provider?.ai}/${body.provider?.place}`);console.log(`[Direct Verify] fallback: ${body.provider?.fallbackUsed?'yes':'no'}${body.provider?.fallbackReason?` (${body.provider.fallbackReason})`:''}`);
 console.log(`[Direct Verify] intent: ${body.debug?.intent}; rejected: ${body.debug?.rejectedCategories.join(',')}; queries: ${body.debug?.queries.join(' | ')}`);console.log(`[Direct Verify] raw/compatible/filtered: ${body.debug?.rawResultCount}/${body.debug?.compatibleResultCount}/${body.debug?.filteredOutCount}`);for(const place of body.message?.recommendation?.places??[])console.log(`[Direct Verify] place: ${place.name} | ${place.category} | ${place.address} | distance=${place.distanceMeters||'not-shown'}`);
 const cooldown=await post(room.id,a.id!);console.log(`[Direct Verify] cooldown enforced: ${cooldown.status}`);
 const afterRecommendation=once<DirectMessage>(b,'directMessageReceived');a.emit('directMessage',{directRoomId:room.id,message:'추천 고마워, 다음 대화도 이어가자.'});const continued=await afterRecommendation;console.log(`[Direct Verify] chat after recommendation: ${continued.type==='user'&&continued.message.includes('다음 대화')?'success':'failed'}`);
 const outsider=await connect('참여자C');try{const denied=await post(room.id,outsider.id!);console.log(`[Direct Verify] outsider denied: ${denied.status}`)}finally{outsider.disconnect()}
 a.emit('directChatClosed',room.id);await new Promise(resolve=>setTimeout(resolve,50));const closed=await post(room.id,a.id!);console.log(`[Direct Verify] closed room denied: ${closed.status}`);
}finally{a.disconnect();b.disconnect()}
