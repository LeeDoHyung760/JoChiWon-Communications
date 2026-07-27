import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import type { Festival } from '../../types/festival.js';
import { festivalStatus } from './sejongFestivals.js';

const CACHE_TTL_MS=60*60*1000;
let cache:{festivals:Festival[];expiresAt:number;fetchedAt:string}|undefined;
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const string=(value:unknown)=>typeof value==='string'||typeof value==='number'?String(value).trim():'';
const date=(value:unknown)=>{const digits=string(value).replace(/\D/g,'');return digits.length>=8?`${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`:''};
const yearInSeoul=()=>Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric'}).format(new Date()));

function items(payload:unknown):unknown[]{
  const root=object(payload),response=object(root.response),body=object(response.body),wrapper=object(body.items),item=wrapper.item;
  return Array.isArray(item)?item:item&&typeof item==='object'?[item]:[];
}

export async function getTourFestivals():Promise<{festivals:Festival[];cached:boolean;fetchedAt:string}>{
  const now=Date.now();
  if(cache&&cache.expiresAt>now)return {festivals:cache.festivals,cached:true,fetchedAt:cache.fetchedAt};
  const key=env.TOUR_API_KEY??env.SEJONG_API_KEY;
  if(!key)throw new Error('TOUR_API_KEY_NOT_CONFIGURED');
  let payload:unknown={};
  const currentYear=yearInSeoul();
  for(const year of [currentYear,currentYear-1,currentYear-2]){
    const url=new URL(env.TOUR_API_URL);
    url.searchParams.set('serviceKey',key);
    url.searchParams.set('MobileOS','ETC');
    url.searchParams.set('MobileApp','SejongLakePark');
    url.searchParams.set('_type','json');
    url.searchParams.set('areaCode','8');
    url.searchParams.set('eventStartDate',`${year}0101`);
    url.searchParams.set('eventEndDate',`${year}1231`);
    url.searchParams.set('arrange','A');
    url.searchParams.set('pageNo','1');
    url.searchParams.set('numOfRows','100');
    const response=await fetch(url,{signal:AbortSignal.timeout(env.SEJONG_API_TIMEOUT_MS),headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`TOUR_API_HTTP_${response.status}`);
    const raw=await response.text();
    try{payload=JSON.parse(raw)}catch{throw new Error('TOUR_API_INVALID_JSON')}
    const header=object(object(payload).response),resultHeader=object(header.header),code=string(resultHeader.resultCode);
    if(code&&code!=='0000'&&code!=='00')throw new Error(`TOUR_API_${code}`);
    if(items(payload).length)break;
  }
  const festivals=items(payload).flatMap(value=>{
    const item=object(value),name=string(item.title);
    if(!name)return [];
    const startDate=date(item.eventstartdate),endDate=date(item.eventenddate)||startDate;
    return [{
      id:`tour-${string(item.contentid)||createHash('sha256').update(`${name}|${startDate}`).digest('hex').slice(0,16)}`,
      name,startDate,endDate,status:festivalStatus(startDate,endDate),venue:string(item.addr1),
      description:string(item.addr2),organizer:'',host:'',sponsor:'',phone:string(item.tel),
      homepage:'',relatedInfo:'',image:string(item.firstimage)||string(item.firstimage2)||undefined,source:'tour-api' as const,
    }];
  });
  const fetchedAt=new Date(now).toISOString();
  cache={festivals,expiresAt:now+CACHE_TTL_MS,fetchedAt};
  return {festivals,cached:false,fetchedAt};
}
