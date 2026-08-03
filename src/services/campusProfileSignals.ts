import type { MapId } from '../../shared/socket-events';

export type ProfileRadarAxis='nature'|'culture'|'explore'|'record'|'relation'|'food';
export type CampusProfileSignal={
  id:string;mapId:MapId;zone:string;action:string;subject:string;title:string;note:string;
  keywords:string[];axes:Partial<Record<ProfileRadarAxis,number>>;point:number;at:string;count:number;
};
type SignalInput=Omit<CampusProfileSignal,'id'|'at'|'count'|'axes'|'keywords'|'point'>&{
  keywords?:string[];axes?:Partial<Record<ProfileRadarAxis,number>>;point?:number;
};

const PREFIX='sejong-campus-profile-signals-v1:';
const keyFor=(nickname:string)=>`${PREFIX}${nickname.trim().toLowerCase()||'guest'}`;
const clean=(value:string)=>value.trim().replace(/^#/,'').slice(0,40);
const unique=(values:string[])=>[...new Set(values.map(clean).filter(Boolean))];
const slug=(value:string)=>value.trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'general';

export function loadCampusProfileSignals(nickname:string):CampusProfileSignal[]{
  try{
    const parsed=JSON.parse(localStorage.getItem(keyFor(nickname))??'[]') as unknown;
    return Array.isArray(parsed)?parsed.filter((item):item is CampusProfileSignal=>Boolean(item&&typeof item==='object'&&'id' in item&&'axes' in item)):[];
  }catch{return []}
}

export function inferCampusTopicProfile(...values:string[]){
  const text=values.join(' '),axes:Partial<Record<ProfileRadarAxis,number>>={},keywords:string[]=[];
  const add=(axis:ProfileRadarAxis,value:number,keyword:string)=>{axes[axis]=Math.max(axes[axis]??0,value);keywords.push(keyword)};
  if(/수목원|자연|식물|꽃|공원|산책|힐링|생태/.test(text))add('nature',4,'자연·힐링');
  if(/사진|촬영|기록|메모|글|앨범|후기/.test(text))add('record',4,'감성 기록');
  if(/축제|공연|문화|예술|전시|뮤지컬|야간/.test(text))add('culture',4,'문화·예술');
  if(/카페|맛집|음식|먹거리|디저트|시장|로컬푸드/.test(text))add('food',4,'먹거리·로컬');
  if(/스마트|기술|도시|AI|인공지능|건축|연구/.test(text)){add('explore',3,'기술·도시');axes.record=Math.max(axes.record??0,1)}
  if(/여행|탐방|탐험|드라이브|코스|장소|발견/.test(text))add('explore',3,'탐험·발견');
  return {axes,keywords:unique(keywords)};
}

export function recordCampusProfileSignal(nickname:string,input:SignalInput){
  if(typeof window==='undefined'||!nickname.trim())return;
  const id=`${input.mapId}:${slug(input.action)}:${slug(input.subject)}`,previous=loadCampusProfileSignals(nickname);
  const existing=previous.find(item=>item.id===id),topic=inferCampusTopicProfile(input.subject,input.title,input.note,...(input.keywords??[]));
  const axes={...topic.axes,...input.axes},keywords=unique([...(input.keywords??[]),...topic.keywords]);
  const next:CampusProfileSignal={...input,id,axes,keywords,point:Math.max(1,Math.min(20,input.point??5)),at:new Date().toISOString(),count:Math.min(9,(existing?.count??0)+1)};
  localStorage.setItem(keyFor(nickname),JSON.stringify([next,...previous.filter(item=>item.id!==id)].slice(0,120)));
  window.dispatchEvent(new CustomEvent('sejong-profile-progress-updated',{detail:{mapId:input.mapId,signal:next}}));
  window.dispatchEvent(new CustomEvent('sejong-experience-profile-updated',{detail:{source:'campus',signal:next}}));
}

export function campusSignalAxisScores(nickname:string){
  const totals:Record<ProfileRadarAxis,number>={nature:0,culture:0,explore:0,record:0,relation:0,food:0};
  loadCampusProfileSignals(nickname).forEach(signal=>Object.entries(signal.axes).forEach(([axis,value])=>{
    totals[axis as ProfileRadarAxis]+=Math.max(0,Math.min(10,Number(value)||0));
  }));
  return totals;
}

export function campusSignalKeywords(nickname:string){
  const weights=new Map<string,number>();
  loadCampusProfileSignals(nickname).forEach(signal=>signal.keywords.forEach(keyword=>weights.set(keyword,(weights.get(keyword)??0)+signal.point)));
  return [...weights.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko')).map(([keyword])=>keyword).slice(0,8);
}
