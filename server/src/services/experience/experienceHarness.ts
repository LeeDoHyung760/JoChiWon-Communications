import { z } from 'zod';

export const harnessMapSchema=z.enum(['arts-center','food-experience','festival-experience']);
export type HarnessMap=z.infer<typeof harnessMapSchema>;

const baseEvent=z.object({at:z.number().int().nonnegative()});
const performanceEvent=baseEvent.extend({type:z.enum(['enter','browse','watch','stop','sit','near-stage','finish','rewatch','favorite','compare']),performanceId:z.string().trim().max(80).optional(),durationSeconds:z.number().min(0).max(14400).optional(),saved:z.boolean().optional()});
const foodEvent=baseEvent.extend({type:z.enum(['visit','dwell','detail','taste','favorite','photo','revisit','food_truck_enter','food_truck_exit','food_card_open','food_card_close','food_section_open','food_filter_apply','food_search','food_map_open','food_hours_open','food_price_open','food_origin_open','food_nearby_place_open','food_save','food_unsave','food_reopen','food_truck_complete']),truck:z.enum(['local','street','dessert']),durationSeconds:z.number().min(0).max(14400).optional(),activeDurationSec:z.number().min(0).max(14400).optional(),item:z.string().trim().max(80).optional(),itemId:z.string().trim().max(100).optional(),itemType:z.enum(['restaurant','local_food','cafe']).optional(),categories:z.array(z.string().trim().max(40)).max(12).optional(),tags:z.array(z.string().trim().max(40)).max(20).optional(),district:z.string().trim().max(80).optional(),timestamp:z.string().datetime().optional(),section:z.string().trim().max(40).optional(),query:z.string().trim().max(50).optional()});
const festivalEvent=baseEvent.extend({type:z.enum(['zone-first','stage-watch','booth','photo','food-zone','exploration','social','festival-open','festival-close','festival-section','festival-save','festival-route-save','festival-stamps','festival-filter','festival-booth-enter','festival-booth-complete']),zone:z.string().trim().max(80).optional(),booth:z.enum(['performance','traditional-culture','art-exhibition']).optional(),filter:z.string().trim().max(40).optional(),selectedCards:z.array(z.string().trim().max(100)).max(20).optional(),actualViewMs:z.number().min(0).max(14400000).optional(),watchedMs:z.number().min(0).max(14400000).optional(),durationMs:z.number().min(0).max(14400000).optional(),progress:z.number().min(0).max(1).optional(),completed:z.boolean().optional(),festivalId:z.string().trim().max(100).optional(),festivalTitle:z.string().trim().max(120).optional(),categories:z.array(z.string().trim().max(30)).max(12).optional(),location:z.string().trim().max(120).optional(),section:z.enum(['program','schedule','location','timetable','map','transport','nearby','recommended-time','route']).optional(),nearbyPlace:z.string().trim().max(120).optional(),saved:z.boolean().optional(),durationSeconds:z.number().min(0).max(14400).optional(),count:z.number().int().min(0).max(100).optional(),percent:z.number().min(0).max(100).optional()});

export const mapExitSchema=z.discriminatedUnion('mapId',[
  z.object({mapId:z.literal('arts-center'),sessionId:z.string().trim().min(8).max(100),events:z.array(performanceEvent).max(500)}),
  z.object({mapId:z.literal('food-experience'),sessionId:z.string().trim().min(8).max(100),events:z.array(foodEvent).max(500)}),
  z.object({mapId:z.literal('festival-experience'),sessionId:z.string().trim().min(8).max(100),events:z.array(festivalEvent).max(500)}),
]);

export type MapExit=z.infer<typeof mapExitSchema>;
export type FestivalSessionSummary={festivalsViewed:number;festivalsSaved:number;mostViewedCategories:string[];longestViewedFestival:string;informationFocus:string[];reopenedFestivals:string[];allStampsCompleted:boolean};
export type FoodSessionSummary={restaurantsViewed:number;localFoodsViewed:number;cafesViewed:number;savedItems:string[];mostViewedCategories:string[];informationFocus:string[];reopenedItems:string[];allTrucksCompleted:boolean};
export type ExperienceSessionSummary=Partial<FestivalSessionSummary>&Partial<FoodSessionSummary>;
export type ExperienceSummary={scores:Record<string,number>;evidence:string[];space?:'sejong_festival_booth'|'sejong_food_trucks';sessionSummary?:ExperienceSessionSummary};
export type ExperiencePointItem={label:string;point:number};
export type PersistedExperienceActivity={id:string;mapId:HarnessMap;title:string;note:string;point:number;breakdown:ExperiencePointItem[];recordedAt:Date};

const add=(scores:Record<string,number>,key:string,value:number)=>{scores[key]=(scores[key]??0)+value};
const performanceNames:Record<string,{title:string;type:string}>={
  '0':{title:'뮤지컬 〈서편제〉',type:'뮤지컬 공연'},'1':{title:'연극 〈렁스〉',type:'연극 공연'},'2':{title:'19시 야민락콘서트 〈레브드집시〉',type:'라이브 공연'},'3':{title:'국립국악원 〈연희-판, 흥으로 잇는 세상〉',type:'전통 공연'},'4':{title:'국립심포니콘서트오케스트라 〈브람스, 교향곡 1번〉',type:'클래식 공연'},
};
export function buildPersistedActivity(input:MapExit,summary:ExperienceSummary):PersistedExperienceActivity|null{
  if(!Object.values(summary.scores).some(value=>value>0)&&!summary.evidence.length)return null;
  if(input.mapId==='festival-experience'){
    const savedFestival=[...input.events].reverse().find(event=>event.type==='festival-save'&&event.saved!==false&&event.festivalTitle);
    const completed=[...new Set(input.events.filter(event=>event.type==='festival-booth-complete').map(event=>event.booth).filter((value):value is NonNullable<typeof value>=>Boolean(value)))];
    if(!completed.length&&savedFestival)return {id:`${input.mapId}:${input.sessionId}`,mapId:input.mapId,title:`${savedFestival.festivalTitle} 관심 저장`,note:`${savedFestival.festivalTitle}에 관심을 표시했어요.${savedFestival.categories?.length?` 관심 키워드: ${savedFestival.categories.slice(0,4).join(' · ')}`:''}`,point:5,breakdown:[{label:'관심 축제 저장',point:5}],recordedAt:new Date()};
    if(!completed.length)return null;
    const labels:Record<string,string>={performance:'공연 무대','traditional-culture':'전통문화 체험','art-exhibition':'문화예술 전시'};
    const breakdown:ExperiencePointItem[]=completed.map(booth=>({label:`${labels[booth]??'축제'} 완료`,point:booth==='performance'?15:12}));
    const selected=input.events.filter(event=>event.type==='festival-booth-complete').flatMap(event=>event.selectedCards??[]);
    const names=completed.map(booth=>labels[booth]??booth);
    return {id:`${input.mapId}:${input.sessionId}`,mapId:input.mapId,title:names.length===1?`${names[0]} 체험 완료`:'축제 부스 체험 완료',note:`${names.join(' · ')}${selected.length?`에서 ${selected.join(' · ')}을(를) 선택하고`:''} 축제 경험을 쌓았어요.`,point:breakdown.reduce((sum,item)=>sum+item.point,0),breakdown,recordedAt:new Date()};
  }
  if(input.mapId!=='arts-center')return null;
  const events=input.events,performanceId=events.find(event=>event.performanceId)?.performanceId??'',performance=performanceNames[performanceId]??{title:'세종예술의전당 공연',type:'공연'};
  const watched=Math.round(events.filter(event=>event.type==='watch').reduce((total,event)=>total+(event.durationSeconds??0),0));
  const breakdown:ExperiencePointItem[]=[];
  if(events.some(event=>event.type==='browse'))breakdown.push({label:'공연 탐색',point:2});
  if(watched>=15)breakdown.push({label:`영상 ${watched}초 감상`,point:5});
  if(events.some(event=>event.type==='finish'))breakdown.push({label:'끝까지 감상',point:5});
  if(events.some(event=>event.type==='favorite'&&event.saved!==false))breakdown.push({label:'관심 공연 저장',point:3});
  if(events.some(event=>event.type==='rewatch'))breakdown.push({label:'공연 다시 감상',point:3});
  if(events.some(event=>event.type==='sit'))breakdown.push({label:'객석에서 감상',point:2});
  if(!breakdown.length)return null;
  const finished=events.some(event=>event.type==='finish'),favorited=events.some(event=>event.type==='favorite'&&event.saved!==false);
  return {id:`${input.mapId}:${input.sessionId}`,mapId:input.mapId,title:performance.title,note:finished?`${performance.title} 영상을 ${watched}초 동안 시청하고 끝까지 감상했어요.`:favorited?`${performance.title}을(를) 관심 공연으로 저장했어요. 장르: ${performance.type}`:watched?`${performance.title} 영상을 ${watched}초 감상했어요.`:`${performance.title} 공연 정보를 살펴봤어요. 장르: ${performance.type}`,point:breakdown.reduce((sum,item)=>sum+item.point,0),breakdown,recordedAt:new Date()};
}
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
      if(event.type==='favorite'&&event.saved!==false){add(scores,'preference',5);if(genre)add(scores,genre,4);evidence.push(`${genre??'공연'} 관심 저장`)}
      if(event.type==='compare'){add(scores,'variety',3);evidence.push('여러 공연 비교 탐색')}
    }
  }else if(input.mapId==='food-experience'){
    const seen=new Set<string>();
    for(const event of input.events){
      const key=event.truck;
      if(event.type==='visit'&&!seen.has(key)){add(scores,key,2);seen.add(key);evidence.push(`${key} 푸드트럭 첫 방문`)}
      // 팝업을 열어 둔 시간만으로는 관심 점수를 주지 않는다.
      if(event.type==='detail')add(scores,key,2);
      if(event.type==='taste')add(scores,key,3);
      if(event.type==='favorite'){add(scores,key,4);evidence.push(`${event.item??key} 저장`)}
      if(event.type==='photo'){add(scores,'recording',2);evidence.push(`${event.item??key} 사진 촬영`)}
      if(event.type==='revisit'){add(scores,key,4);evidence.push(`${key} 푸드트럭 재방문`)}
    }
    const foodEvents=input.events.filter(event=>event.type.startsWith('food_'));
    const cards=new Map<string,{type?:string;categories:Set<string>;tags:Set<string>;sections:Set<string>;saved:boolean;opens:number;duration:number}>(),completed=new Set<string>();
    for(const event of foodEvents){
      if(event.type==='food_truck_complete')completed.add(event.truck);
      if(!event.itemId)continue;
      const card=cards.get(event.itemId)??{type:event.itemType,categories:new Set<string>(),tags:new Set<string>(),sections:new Set<string>(),saved:false,opens:0,duration:0};
      event.categories?.forEach(value=>card.categories.add(value));event.tags?.forEach(value=>card.tags.add(value));
      if(event.type==='food_card_open'||event.type==='food_reopen')card.opens++;
      if(event.type==='food_card_close')card.duration+=event.activeDurationSec??0;
      if(event.type==='food_save')card.saved=true;if(event.type==='food_unsave')card.saved=false;
      const sectionByType:Record<string,string>={food_map_open:'map',food_hours_open:'hours',food_price_open:'price',food_origin_open:'origin',food_nearby_place_open:'nearby'};
      if(sectionByType[event.type])card.sections.add(sectionByType[event.type]!);cards.set(event.itemId,card);
      if(event.type==='food_section_open'&&event.section)card.sections.add(event.section);
      cards.set(event.itemId,card);
    }
    const values=[...cards.values()],restaurants=values.filter(v=>v.type==='restaurant'),localFoods=values.filter(v=>v.type==='local_food'),cafes=values.filter(v=>v.type==='cafe');
    if(restaurants.length>=4){add(scores,'foodExploration',6);evidence.push(`세종 맛집 ${restaurants.length}개 비교`)}
    if(restaurants.filter(v=>v.saved&&v.categories.has('한식')).length>=2){add(scores,'koreanFoodPreference',8);evidence.push('한식 식당 2개 이상 저장')}
    if(values.some(v=>v.sections.has('price')&&v.sections.has('hours'))){add(scores,'practicalDiningStyle',6);evidence.push('가격과 영업시간을 함께 확인')}
    if(values.some(v=>v.sections.has('map')&&v.sections.has('nearby'))){add(scores,'visitIntent',8);add(scores,'routePlanning',5);evidence.push('지도와 주변 관광지를 함께 확인')}
    if(localFoods.filter(v=>[...v.tags].some(t=>t.includes('복숭아'))).length>=3)add(scores,'peachInterest',8);
    if(values.some(v=>v.saved&&v.opens>=2&&[...v.tags].some(t=>t.includes('복숭아'))))add(scores,'peachPreference',10);
    if(localFoods.some(v=>v.sections.has('origin')))add(scores,'localIngredientInterest',7);
    const localEntries=[...cards].filter(([,v])=>v.type==='local_food');
    const peach=cards.get('local-jochwon-peach');
    const seasonalSections=new Set(['season','seasonal','calendar','seasonal-produce','seasonal-calendar']);
    const productionSections=new Set(['production-area','origin','farmers','farm-story']);
    if(peach&&peach.duration>=20){add(scores,'peachInterest',12);evidence.push('조치원 복숭아 정보를 오래 확인')}
    if(localEntries.some(([,v])=>[...v.sections].some(section=>seasonalSections.has(section)))){add(scores,'seasonalProduceInterest',10);evidence.push('제철 농산물 정보를 확인')}
    if(localEntries.some(([,v])=>[...v.sections].some(section=>productionSections.has(section)))){add(scores,'producerStoryInterest',10);add(scores,'localIngredientInterest',6);evidence.push('생산지와 생산 농가 이야기를 확인')}
    if(localEntries.some(([,v])=>v.saved)){add(scores,'localSpecialtyInterest',12);evidence.push('세종 특산물·지역 농산물을 관심 저장')}
    if(cafes.some(v=>v.sections.has('map')&&v.sections.has('hours')))add(scores,'cafeVisitIntent',7);
    if(completed.size===3){add(scores,'sejongFoodExploration',10);evidence.push('3개 푸드트럭 모두 체험')}
    Object.keys(scores).forEach(name=>scores[name]=Math.min(100,scores[name]!));
    const categoryCounts=new Map<string,number>(),sectionCounts=new Map<string,number>();values.forEach(v=>{v.categories.forEach(c=>categoryCounts.set(c,(categoryCounts.get(c)??0)+1));v.sections.forEach(s=>sectionCounts.set(s,(sectionCounts.get(s)??0)+1))});
    return {space:'sejong_food_trucks',sessionSummary:{restaurantsViewed:restaurants.length,localFoodsViewed:localFoods.length,cafesViewed:cafes.length,savedItems:[...cards].filter(([,v])=>v.saved).map(([id])=>id),mostViewedCategories:[...categoryCounts].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([v])=>v),informationFocus:[...sectionCounts].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([v])=>v),reopenedItems:[...cards].filter(([,v])=>v.opens>=2).map(([id])=>id),allTrucksCompleted:completed.size===3},scores,evidence:[...new Set(evidence)].slice(0,12)};
  }else{
    let booths=0,photos=0,allStampsCompleted=false;
    const completedBooths=new Map<string,{selectedCards:string[];actualViewMs:number}>();
    const festivalViews=new Map<string,{title:string;count:number;duration:number;categories:Set<string>;sections:Set<string>;saved:boolean}>();
    const ensureFestival=(event:(typeof input.events)[number])=>{if(!('festivalId' in event)||!event.festivalId)return undefined;const current=festivalViews.get(event.festivalId)??{title:event.festivalTitle??event.festivalId,count:0,duration:0,categories:new Set<string>(),sections:new Set<string>(),saved:false};event.categories?.forEach(category=>current.categories.add(category));if(event.festivalTitle)current.title=event.festivalTitle;festivalViews.set(event.festivalId,current);return current};
    for(const event of input.events){
      const festival=ensureFestival(event);
      if(event.type==='festival-open'&&festival){festival.count+=1;['program','schedule','location'].forEach(section=>festival.sections.add(section))}
      if(event.type==='festival-close'&&festival)festival.duration+=event.durationSeconds??0;
      if(event.type==='festival-section'&&festival&&event.section)festival.sections.add(event.section);
      if(event.type==='festival-save'&&festival)festival.saved=event.saved!==false;
      if(event.type==='festival-route-save'&&festival){festival.sections.add('route');festival.saved=event.saved!==false}
      if(event.type==='festival-stamps')allStampsCompleted=(event.percent??0)>=100;
      if(event.type==='stage-watch'&&event.completed){const watchedSeconds=Math.round((event.watchedMs??0)/1000);add(scores,'performance',3);evidence.push(`공연형 축제 영상 ${watchedSeconds}초 실제 시청`)}
      if(event.type==='festival-booth-complete'&&event.booth){completedBooths.set(event.booth,{selectedCards:event.selectedCards??[],actualViewMs:event.actualViewMs??0});booths=completedBooths.size}
      if(event.type==='booth'){const count=event.count??1;booths+=count;add(scores,'participation',3*count)}
      if(event.type==='photo')photos+=event.count??1;
      if(event.type==='exploration'&&(event.percent??0)>=80){add(scores,'exploration',4);evidence.push(`공간 ${Math.round(event.percent!)}% 탐색`)}
      if(event.type==='social'){add(scores,'social',3);evidence.push('다른 사용자와 활동')}
    }
    if(booths>=3){add(scores,'participation',4);evidence.push(`체험부스 ${booths}개 참여`)}
    const traditional=completedBooths.get('traditional-culture'),art=completedBooths.get('art-exhibition');
    if(traditional){add(scores,'participation',Math.max(2,traditional.selectedCards.length*2));evidence.push(`전통문화 체험 ${traditional.selectedCards.length}종 선택`)}
    if(art){add(scores,'culture',Math.max(2,art.selectedCards.length*2));evidence.push(`예술 전시 ${art.selectedCards.length}개 관람 (${Math.round(art.actualViewMs/1000)}초)`)}
    if(allStampsCompleted){add(scores,'festivalCompletion',10);evidence.push('전체 부스 3/3 완료')}
    if(photos>=3){add(scores,'recording',4);evidence.push(`사진 ${photos}장 촬영`)}
    const categoryCounts=new Map<string,number>(),sectionCounts=new Map<string,number>();
    festivalViews.forEach(view=>{view.categories.forEach(category=>categoryCounts.set(category,(categoryCounts.get(category)??0)+1));view.sections.forEach(section=>sectionCounts.set(section,(sectionCounts.get(section)??0)+1))});
    const categoryViewed=(name:string)=>[...festivalViews.values()].filter(view=>view.categories.has(name)).length;
    const nightCount=categoryViewed('야간'),savedPerformance=[...festivalViews.values()].filter(view=>view.saved&&view.categories.has('공연')).length;
    const mapAndTransport=[...festivalViews.values()].some(view=>view.sections.has('map')&&view.sections.has('transport'));
    const reopened=[...festivalViews.values()].filter(view=>view.count>=2);
    if(nightCount>=3){add(scores,'nightFestivalInterest',6);evidence.push(`야간 축제 ${nightCount}개를 확인함`)}
    if(savedPerformance){add(scores,'performanceFestivalInterest',8);evidence.push(`공연형 축제 ${savedPerformance}개를 관심 저장함`)}
    if(mapAndTransport){add(scores,'visitIntent',8);add(scores,'planningStyle',5);evidence.push('지도와 교통 정보를 모두 확인함')}
    if(categoryCounts.size>=3){add(scores,'festivalExploration',6);evidence.push(`서로 다른 축제 유형 ${categoryCounts.size}개를 탐색함`)}
    if(reopened.length){add(scores,'strongInterest',5);evidence.push(`${reopened[0]!.title} 축제를 ${reopened[0]!.count}회 확인함`)}
    festivalViews.forEach(view=>{if(view.sections.has('schedule')&&view.sections.has('transport'))add(scores,'visitIntent',4);if(view.sections.has('nearby')||view.sections.has('recommended-time'))add(scores,'planningStyle',2)});
    if(festivalViews.size)Object.assign(scores,{nightFestivalInterest:Math.min(100,20+(scores.nightFestivalInterest??0)*10+nightCount*4),performanceFestivalInterest:Math.min(100,20+(scores.performanceFestivalInterest??0)*8),festivalExploration:Math.min(100,20+(scores.festivalExploration??0)*8+festivalViews.size*3),visitIntent:Math.min(100,15+(scores.visitIntent??0)*7),planningStyle:Math.min(100,15+(scores.planningStyle??0)*8)});
    const rankedCategories=[...categoryCounts].sort((a,b)=>b[1]-a[1]).map(([name])=>name).slice(0,3),rankedSections=[...sectionCounts].sort((a,b)=>b[1]-a[1]).map(([name])=>name).slice(0,4),longest=[...festivalViews.values()].sort((a,b)=>b.duration-a.duration)[0];
    return {space:'sejong_festival_booth',sessionSummary:{festivalsViewed:festivalViews.size,festivalsSaved:[...festivalViews.values()].filter(view=>view.saved).length,mostViewedCategories:rankedCategories,longestViewedFestival:longest?.title??'',informationFocus:rankedSections,reopenedFestivals:reopened.map(view=>view.title),allStampsCompleted},scores,evidence:[...new Set(evidence)].slice(0,12)};
  }
  return {scores,evidence:[...new Set(evidence)].slice(0,12)};
}
