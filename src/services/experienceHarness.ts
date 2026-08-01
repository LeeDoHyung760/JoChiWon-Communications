import type {MapId} from '../../shared/socket-events';
import {API_BASE_URL} from '../config/api';
import {gameEvents} from '../game/events';

type HarnessMap=Extract<MapId,'arts-center'|'food-experience'|'festival-experience'>;
type Action={type:string;at?:number;[key:string]:unknown};
export type GeneratedExperienceProfile={tags:string[];summary:string;source:'openai'|'fallback';updatedAt:string};
export type ExperienceAnalysisResult={summary:{scores:Record<string,number>;evidence:string[]};profile:GeneratedExperienceProfile};
export const EXPERIENCE_PROFILE_KEY='sejong-ai-experience-profile-v1';
const isHarnessMap=(mapId:MapId):mapId is HarnessMap=>mapId==='arts-center'||mapId==='food-experience'||mapId==='festival-experience';

export function recordExperienceAction(action:Action){gameEvents.emit('experience-action',action)}
export function loadGeneratedExperienceProfile(){try{return JSON.parse(localStorage.getItem(EXPERIENCE_PROFILE_KEY)??'null') as GeneratedExperienceProfile|null}catch{return null}}
export async function hydrateGeneratedExperienceProfile(){try{const response=await fetch(`${API_BASE_URL}/account/me/experience/profile`,{credentials:'include'});if(!response.ok)return null;const body=await response.json() as {data?:{profile?:GeneratedExperienceProfile|null}};if(body.data?.profile){localStorage.setItem(EXPERIENCE_PROFILE_KEY,JSON.stringify(body.data.profile));window.dispatchEvent(new CustomEvent('sejong-experience-profile-updated',{detail:{profile:body.data.profile}}))}return body.data?.profile??null}catch{return null}}

export class ExperienceHarnessCollector{
  private map?:HarnessMap;private sessionId='';private startedAt=0;private events:Action[]=[];
  private activeSince=new Map<string,number>();private visits=new Map<string,number>();
  constructor(){
    gameEvents.on('experience-action',this.onAction);
    gameEvents.on('food-truck-kiosk-mode-changed',this.onFoodMode);
    gameEvents.on('arts-center-poster-focus-mode-changed',this.onPerformanceMode);
    gameEvents.on('arts-center-seat-proximity-changed',this.onSeat);
    gameEvents.on('experience-analysis-request',this.onAnalysisRequest);
  }
  enter(mapId:MapId){if(!isHarnessMap(mapId)){this.map=undefined;return}this.map=mapId;this.sessionId=crypto.randomUUID();this.startedAt=Date.now();this.events=[];this.activeSince.clear();if(mapId==='arts-center')this.push({type:'enter'});if(mapId==='festival-experience')this.push({type:'zone-first',zone:'entrance'})}
  exit(){
    if(!this.map)return;
    for(const [key,since] of this.activeSince){
      if(key.startsWith('food:'))this.push({type:'dwell',truck:key.slice(5),durationSeconds:(Date.now()-since)/1000});
      if(key.startsWith('performance:'))this.push({type:'browse',performanceId:key.slice(12),durationSeconds:(Date.now()-since)/1000});
      if(key==='seat')this.push({type:'sit',durationSeconds:(Date.now()-since)/1000});
    }
    this.activeSince.clear();
    const payload={mapId:this.map,sessionId:this.sessionId,events:this.events};
    this.map=undefined;this.events=[];void this.send(payload);
  }
  destroy(){this.exit();gameEvents.off('experience-action',this.onAction);gameEvents.off('food-truck-kiosk-mode-changed',this.onFoodMode);gameEvents.off('arts-center-poster-focus-mode-changed',this.onPerformanceMode);gameEvents.off('arts-center-seat-proximity-changed',this.onSeat);gameEvents.off('experience-analysis-request',this.onAnalysisRequest)}
  private push=(action:Action)=>{if(this.map)this.events.push({...action,at:Math.max(0,Date.now()-this.startedAt)})};
  private onAction=(action:Action)=>this.push(action);
  private send=async(payload:{mapId:HarnessMap;sessionId:string;events:Action[]})=>{
    try{
      const response=await fetch(`${API_BASE_URL}/account/me/experience/map-exit`,{method:'POST',credentials:'include',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!response.ok)throw new Error(`profile update ${response.status}`);
      const body=await response.json() as {data?:ExperienceAnalysisResult};if(!body.data?.profile)return;
      localStorage.setItem(EXPERIENCE_PROFILE_KEY,JSON.stringify(body.data.profile));
      gameEvents.emit('experience-profile-updated',body.data);window.dispatchEvent(new CustomEvent('sejong-experience-profile-updated',{detail:body.data}));
    }catch(error){console.warn('[experience profile update failed]',error)}
  };
  private onAnalysisRequest=()=>{
    if(!this.map||!this.events.length)return;
    const now=Date.now();
    for(const [key,since] of this.activeSince){if(key==='seat')this.push({type:'sit',durationSeconds:(now-since)/1000});this.activeSince.set(key,now)}
    const payload={mapId:this.map,sessionId:this.sessionId,events:[...this.events]};
    this.sessionId=crypto.randomUUID();this.startedAt=Date.now();this.events=[];void this.send(payload);
  };
  private onFoodMode=(truck:'local'|'street'|'dessert'|null)=>{
    if(this.map!=='food-experience')return;
    const previous=[...this.activeSince.entries()].find(([key])=>key.startsWith('food:'));
    if(previous){const [key,since]=previous,id=key.slice(5);this.push({type:'dwell',truck:id,durationSeconds:(Date.now()-since)/1000});this.activeSince.delete(key)}
    if(truck){const count=this.visits.get(truck)??0;this.visits.set(truck,count+1);this.push({type:count?'revisit':'visit',truck});this.push({type:'detail',truck});this.activeSince.set(`food:${truck}`,Date.now())}
  };
  private onPerformanceMode=(value:{active:boolean;index:number})=>{
    if(this.map!=='arts-center')return;const key=`performance:${value.index}`;
    if(value.active){const browseKey=`performance-browse:${value.index}`,previouslyBrowsed=[...this.visits.keys()].filter(item=>item.startsWith('performance-browse:')).length;if(!this.visits.has(browseKey)){this.visits.set(browseKey,1);if(previouslyBrowsed===1)this.push({type:'compare',performanceId:String(value.index)})}this.activeSince.set(key,Date.now());return}
    for(const [activeKey,since] of this.activeSince){if(!activeKey.startsWith('performance:'))continue;this.push({type:'browse',performanceId:activeKey.slice(12),durationSeconds:(Date.now()-since)/1000});this.activeSince.delete(activeKey)}
  };
  private onSeat=(value:{id:string;seated?:boolean}|null)=>{
    if(this.map!=='arts-center')return;const key='seat';
    if(value?.seated){this.activeSince.set(key,Date.now());return}
    const since=this.activeSince.get(key);if(since){this.push({type:'sit',durationSeconds:(Date.now()-since)/1000});this.activeSince.delete(key)}
  };
}
