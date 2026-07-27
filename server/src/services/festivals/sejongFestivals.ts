import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import type { Festival,FestivalStatus } from '../../types/festival.js';

const CACHE_TTL_MS=60*60*1000;
let cache:{festivals:Festival[];expiresAt:number}|undefined;

const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(item:Record<string,unknown>,...keys:string[])=>{
  for(const key of keys){const value=item[key];if(typeof value==='string'||typeof value==='number')return String(value).trim()}
  return '';
};
const dateString=(value:string)=>{
  const digits=value.replace(/\D/g,'');
  if(digits.length<8)return '';
  return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
};
const localDay=(value:Date)=>{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value);
  const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find(part=>part.type===type)?.value??'';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

export function festivalStatus(startDate:string,endDate:string,now=new Date()):FestivalStatus{
  const today=localDay(now);
  if(startDate&&today<startDate)return '예정';
  if(endDate&&today>endDate)return '종료';
  return '진행중';
}

export function normalizeFestival(value:unknown,now=new Date()):Festival|null{
  const item=record(value);
  const name=text(item,'nm','festvNm','festivalName','festivalNm','축제명','명칭');
  if(!name)return null;
  const startDate=dateString(text(item,'bgngYmd','festvBgnde','festivalStartDate','startDate','축제시작일자','개최시작일'));
  const endDate=dateString(text(item,'endYmd','festvEndde','festivalEndDate','endDate','축제종료일자','개최종료일'))||startDate;
  const venue=text(item,'place','opar','festivalVenue','venue','개최장소','장소');
  const identity=[name,startDate,venue].join('|');
  return {
    id:createHash('sha256').update(identity).digest('hex').slice(0,16),
    name,startDate,endDate,status:festivalStatus(startDate,endDate,now),venue,
    description:text(item,'cn','festvCo','festivalContents','description','축제내용','내용'),
    organizer:text(item,'sprvsnInst','mnnst','organizer','주관기관','주관'),
    host:text(item,'auspcInstt','host','주최기관','주최'),
    sponsor:text(item,'suprtInstt','sponsor','후원기관','후원'),
    phone:text(item,'phoneNumber','telno','phone','전화번호'),
    homepage:text(item,'hmpg','homepageUrl','homepage','홈페이지주소','홈페이지'),
    relatedInfo:text(item,'relateInfo','relatedInfo','관련정보'),
    source:'sejong',
  };
}

function responseItems(payload:unknown):unknown[]{
  if(Array.isArray(payload))return payload;
  const root=record(payload),response=record(root.response),body=record(response.body),directBody=record(root.body),itemsValue=body.items??directBody.items??root.items;
  if(Array.isArray(itemsValue))return itemsValue;
  const items=record(itemsValue),item=items.item;
  if(Array.isArray(item))return item;
  if(item&&typeof item==='object')return [item];
  const direct=root.item;
  return Array.isArray(direct)?direct:direct&&typeof direct==='object'?[direct]:[];
}

export async function getSejongFestivals():Promise<{festivals:Festival[];cached:boolean;fetchedAt:string}>{
  const now=Date.now();
  if(cache&&cache.expiresAt>now)return {festivals:cache.festivals,cached:true,fetchedAt:new Date(cache.expiresAt-CACHE_TTL_MS).toISOString()};
  if(!env.SEJONG_API_KEY)throw new Error('SEJONG_API_KEY_NOT_CONFIGURED');
  const url=new URL(env.SEJONG_FESTIVAL_API_URL);
  url.searchParams.set('serviceKey',env.SEJONG_API_KEY);
  url.searchParams.set('pageNo','1');
  url.searchParams.set('numOfRows','100');
  url.searchParams.set('type','json');
  url.searchParams.set('_type','json');
  const response=await fetch(url,{signal:AbortSignal.timeout(env.SEJONG_API_TIMEOUT_MS),headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`SEJONG_API_HTTP_${response.status}`);
  const raw=await response.text();
  let payload:unknown;
  try{payload=JSON.parse(raw)}catch{throw new Error('SEJONG_API_INVALID_JSON')}
  const root=record(payload),apiHeader=Object.keys(record(record(root.response).header)).length?record(record(root.response).header):record(root.header);
  const resultCode=text(apiHeader,'resultCode');
  if(resultCode&&resultCode!=='00'&&resultCode!=='0')throw new Error(`SEJONG_API_${resultCode}`);
  const festivals=responseItems(payload).map(item=>normalizeFestival(item)).filter((item):item is Festival=>!!item);
  cache={festivals,expiresAt:now+CACHE_TTL_MS};
  return {festivals,cached:false,fetchedAt:new Date(now).toISOString()};
}
