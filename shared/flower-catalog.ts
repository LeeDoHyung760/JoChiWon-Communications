import type { GardenFlowerId } from './personal-farm.js';

export interface SharedFlowerCatalogEntry {
  flowerId: GardenFlowerId;
  plantId: string;
  displayName: string;
  meanings: readonly string[];
  description: string;
}

export const FLOWER_CATALOG: readonly SharedFlowerCatalogEntry[] = [
  {flowerId:'magnolia',plantId:'flower-01',displayName:'목련',meanings:['고귀함','자연에 대한 사랑'],description:'잎보다 먼저 크고 밝은 꽃을 피워 봄의 시작을 알리는 나무꽃입니다.'},
  {flowerId:'adonis',plantId:'flower-02',displayName:'복수초',meanings:['영원한 행복','희망'],description:'이른 봄 땅 가까이에서 노란 꽃을 피우는 우리나라 자생식물입니다.'},
  {flowerId:'azalea',plantId:'flower-03',displayName:'철쭉',meanings:['사랑의 기쁨','절제'],description:'봄 산과 정원을 화사하게 물들이는 친숙한 꽃나무입니다.'},
  {flowerId:'hydrangea',plantId:'flower-04',displayName:'수국',meanings:['진심','변덕','인내'],description:'작은 꽃들이 풍성하게 모여 하나의 커다란 꽃송이처럼 보이는 여름꽃입니다.'},
  {flowerId:'tulip',plantId:'flower-05',displayName:'튤립',meanings:['사랑','고백','애정'],description:'매끈한 줄기 위에 잔 모양의 꽃을 피우는 대표적인 봄꽃입니다.'},
  {flowerId:'iris',plantId:'flower-06',displayName:'붓꽃',meanings:['좋은 소식','희망'],description:'붓을 닮은 꽃봉오리와 곧게 뻗은 잎이 인상적인 꽃입니다.'},
  {flowerId:'lily',plantId:'flower-07',displayName:'백합',meanings:['순결','변함없는 사랑'],description:'크고 우아한 꽃과 길게 뻗은 수술이 돋보이는 여름꽃입니다.'},
  {flowerId:'camellia',plantId:'flower-08',displayName:'동백꽃',meanings:['신중','겸손','매력'],description:'윤기 나는 짙은 잎 사이로 선명한 꽃을 피우는 상록성 꽃나무입니다.'},
  {flowerId:'sunflower',plantId:'flower-09',displayName:'해바라기',meanings:['숭배','기다림','밝은 마음'],description:'큰 꽃차례와 밝은 색으로 여름 정원에 활기를 더하는 꽃입니다.'},
  {flowerId:'gujeolcho',plantId:'flower-10',displayName:'구절초',meanings:['어머니의 사랑','순수'],description:'가을 들판에서 연분홍빛과 흰빛 꽃을 피우는 우리나라 자생식물입니다.'},
  {flowerId:'hibiscus',plantId:'flower-11',displayName:'무궁화',meanings:['끈기','영원함'],description:'여름부터 가을까지 새로운 꽃을 이어 피우는 우리나라의 나라꽃입니다.'},
  {flowerId:'bird-of-paradise',plantId:'flower-12',displayName:'극락조화',meanings:['신비','영구불변'],description:'새의 머리를 닮은 독특한 주황색 꽃이 인상적인 온실식물입니다.'},
  {flowerId:'peach-tree',plantId:'peach-tree',displayName:'복숭아나무',meanings:['사랑의 포로','장수'],description:'봄에 분홍빛 꽃을 피우고 여름에 달콤한 열매를 맺는 나무입니다.'},
  {flowerId:'maple-tree',plantId:'red-tree',displayName:'단풍나무',meanings:['소중한 추억','변화'],description:'계절에 따라 잎 색이 아름답게 변하는 손바닥 모양 잎의 나무입니다.'},
] as const;

export const FLOWER_CATALOG_BY_ID = new Map(FLOWER_CATALOG.map((entry) => [entry.flowerId, entry]));
