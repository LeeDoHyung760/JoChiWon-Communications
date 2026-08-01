import { z } from 'zod';

export const harnessMapSchema=z.enum(['arts-center','food-experience','festival-experience']);
export type HarnessMap=z.infer<typeof harnessMapSchema>;

const baseEvent=z.object({at:z.number().int().nonnegative()});
const performanceEvent=baseEvent.extend({type:z.enum(['enter','browse','watch','stop','sit','near-stage','finish','rewatch','favorite','compare']),performanceId:z.string().trim().max(80).optional(),durationSeconds:z.number().min(0).max(14400).optional()});
const foodEvent=baseEvent.extend({type:z.enum(['visit','dwell','detail','taste','favorite','photo','revisit']),truck:z.enum(['local','street','dessert']),durationSeconds:z.number().min(0).max(14400).optional(),item:z.string().trim().max(80).optional()});
const festivalEvent=baseEvent.extend({type:z.enum(['zone-first','stage-watch','booth','photo','food-zone','exploration','social']),zone:z.string().trim().max(80).optional(),durationSeconds:z.number().min(0).max(14400).optional(),count:z.number().int().min(0).max(100).optional(),percent:z.number().min(0).max(100).optional()});

export const mapExitSchema=z.discriminatedUnion('mapId',[
  z.object({mapId:z.literal('arts-center'),sessionId:z.string().trim().min(8).max(100),events:z.array(performanceEvent).max(500)}),
  z.object({mapId:z.literal('food-experience'),sessionId:z.string().trim().min(8).max(100),events:z.array(foodEvent).max(500)}),
  z.object({mapId:z.literal('festival-experience'),sessionId:z.string().trim().min(8).max(100),events:z.array(festivalEvent).max(500)}),
]);

export type MapExit=z.infer<typeof mapExitSchema>;
export type ExperienceSummary={scores:Record<string,number>;evidence:string[]};

const add=(scores:Record<string,number>,key:string,value:number)=>{scores[key]=(scores[key]??0)+value};
export function scoreMapExit(input:MapExit):ExperienceSummary{
  const scores:Record<string,number>={},evidence:string[]=[];
  if(input.mapId==='arts-center'){
    const genres:Record<string,string>={'0':'musical','1':'play','2':'jazz','3':'traditional','4':'classical'};
    for(const event of input.events){
      const genre=event.performanceId?genres[event.performanceId]:undefined,duration=event.durationSeconds??0;
      if(event.type==='browse')add(scores,'exploration',1);
      if(event.type==='watch'&&duration>=15){add(scores,'culture',2);if(genre)add(scores,genre,Math.min(8,2+Math.floor(duration/30)*2));evidence.push(`${genre??'공연'} ${Math.round(duration)}초 시청`)}
      if(event.type==='watch'&&duration>=30)add(scores,'immersion',3);
      if(event.type==='stop'&&duration>=5)evidence.push(`${genre??'공연'} 중간 종료`);
      if(event.type==='sit'){add(scores,'appreciation',2);if((event.durationSeconds??0)>0)evidence.push(`객석에 ${Math.round(event.durationSeconds!)}초 앉음`)}
      if(event.type==='near-stage')add(scores,'presence',2);
      if(event.type==='finish'){add(scores,'immersion',4);if(genre)add(scores,genre,5);evidence.push(`${genre??'공연'} 끝까지 시청`)}
      if(event.type==='rewatch'){add(scores,'preference',4);evidence.push('같은 공연 재관람')}
      if(event.type==='favorite'){add(scores,'preference',5);if(genre)add(scores,genre,4);evidence.push(`${genre??'공연'} 관심 저장`)}
      if(event.type==='compare'){add(scores,'variety',3);evidence.push('여러 공연 비교 탐색')}
    }
  }else if(input.mapId==='food-experience'){
    const seen=new Set<string>();
    for(const event of input.events){
      const key=event.truck;
      if(event.type==='visit'&&!seen.has(key)){add(scores,key,2);seen.add(key);evidence.push(`${key} 푸드트럭 첫 방문`)}
      if(event.type==='dwell'&&(event.durationSeconds??0)>=15)add(scores,key,3);
      if(event.type==='detail')add(scores,key,2);
      if(event.type==='taste')add(scores,key,3);
      if(event.type==='favorite'){add(scores,key,4);evidence.push(`${event.item??key} 저장`)}
      if(event.type==='photo'){add(scores,'recording',2);evidence.push(`${event.item??key} 사진 촬영`)}
      if(event.type==='revisit'){add(scores,key,4);evidence.push(`${key} 푸드트럭 재방문`)}
    }
  }else{
    let booths=0,photos=0;
    for(const event of input.events){
      if(event.type==='stage-watch'&&(event.durationSeconds??0)>=20)add(scores,'performance',3);
      if(event.type==='booth'){const count=event.count??1;booths+=count;add(scores,'participation',3*count)}
      if(event.type==='photo')photos+=event.count??1;
      if(event.type==='exploration'&&(event.percent??0)>=80){add(scores,'exploration',4);evidence.push(`공간 ${Math.round(event.percent!)}% 탐색`)}
      if(event.type==='social'){add(scores,'social',3);evidence.push('다른 사용자와 활동')}
    }
    if(booths>=3){add(scores,'participation',4);evidence.push(`체험부스 ${booths}개 참여`)}
    if(photos>=3){add(scores,'recording',4);evidence.push(`사진 ${photos}장 촬영`)}
  }
  return {scores,evidence:[...new Set(evidence)].slice(0,12)};
}
