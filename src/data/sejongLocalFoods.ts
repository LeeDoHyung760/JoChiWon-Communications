import type {SejongFoodPlace} from './sejongFoodTypes';

const verifiedAt='2026-08-02';
const peachSource='https://www2.sejong.go.kr/sejongmaeul/archive/collection/ArchiveCollectionView.do?con_id=2523';
const brewerySource='https://www2.sejong.go.kr/sejongmaeul/archive/collection/ArchiveCollectionView.do?con_id=2577';
const danmujiSource='https://www2.sejong.go.kr/sejongmaeul/archive/collection/ArchiveCollectionView.do?con_id=2576';
const marketSource='https://www2.sejong.go.kr/sejongmaeul/archive/collection/ArchiveCollectionView.do?con_id=2579';
const localFoodSource='https://www.sjlocal.or.kr/';

type SpecialtySeed={
  id:string;name:string;menuName:string;category:string[];tags:string[];district:string;
  address:string;description:string;features:string[];origin:string;season:string;
  purchasePlaces:string[];sourceUrl:string;sourceLabel:string;imageUrl?:string;
  infoSections:Array<{id:string;title:string;content:string}>;
};

const generatedSpecialtyImage='AI 생성 대표 이미지 · 실제 상품 및 판매처와 다를 수 있음';

const specialty=(seed:SpecialtySeed):SejongFoodPlace=>({
  ...seed,truckId:'street',itemType:'local_food',priceRange:'품목·시기·판매처별 상이',
  openingHours:'판매처별 상이 · 방문 전 확인',closedDays:'판매처별 확인',
  nearbyPlaces:['세종전통시장','세종로컬푸드 싱싱장터'],
  imageUrl:seed.imageUrl??'',imageSource:seed.imageUrl?.includes('/specialties/')?generatedSpecialtyImage:seed.imageUrl?'세종시·프로젝트 보유 이미지':'대표 이미지 준비 중',
  mapUrl:`https://map.naver.com/p/search/${encodeURIComponent(`${seed.name} 세종`)}`,
  festival:seed.name.includes('복숭아')?'세종조치원복숭아축제':undefined,
  localIngredient:seed.origin,verifiedAt,active:true,
});

export const sejongLocalFoods:SejongFoodPlace[]=[
  specialty({
    id:'local-jochwon-peach',name:'조치원 복숭아',menuName:'117년 전통의 세종 대표 과일',
    category:['대표 특산물','과일'],tags:['조치원 복숭아','제철','복숭아축제','농가 직거래'],district:'조치원읍·연서면 일대',
    address:'세종특별자치시 조치원읍·연서면 등 재배 농가와 판매장',origin:'세종특별자치시 복숭아 재배 농가',season:'7월 말~8월 중심',
    description:'1908년 권업모범장 과수시험포에서 시작된 재배 역사로 알려진 세종의 대표 특산물입니다. 높은 당도와 부드러운 과육, 향긋한 풍미가 특징입니다.',
    features:['세종을 대표하는 여름 과일','높은 당도와 부드러운 과육','세종조치원복숭아축제'],purchasePlaces:['세종로컬푸드 싱싱장터','조치원 지역 농가 직판장','복숭아축제 판매장'],
    sourceUrl:peachSource,sourceLabel:'세종시 마을기록문화관',imageUrl:'/images/festivals/peach-2026.jpg',
    infoSections:[
      {id:'story',title:'117년 재배 이야기',content:'1908년 조치원 지역에 과수시험포가 설치된 뒤 복숭아 재배가 뿌리내렸고, 오늘날 세종을 상징하는 대표 농특산물이 됐습니다.'},
      {id:'taste',title:'맛과 특징',content:'충분한 일조량과 황토질 토양에서 자라 당도가 높고 과육이 부드러우며 향이 진한 것으로 알려져 있습니다.'},
      {id:'season',title:'제철과 구매',content:'주 출하 시기는 7월 말부터 8월입니다. 싱싱장터, 지역 농가 직판장과 여름 복숭아축제에서 생산자를 확인해 구매할 수 있습니다.'},
    ],
  }),
  specialty({
    id:'local-sejong-pear',name:'세종 배',menuName:'복숭아와 함께 자란 도도리의 배',
    category:['대표 특산물','과일'],tags:['세종 배','도도리','가을 과일','농가 직거래'],district:'조치원읍·연서면 일대',
    address:'세종특별자치시 북부권 배 재배 농가와 로컬푸드 판매장',origin:'세종특별자치시 배 재배 농가',season:'9~10월 중심',
    description:'복숭아와 함께 세종 북부 농촌을 대표하는 과일입니다. 도도리파크의 이름도 복숭아 도(桃) 두 글자와 배 리(梨)를 조합해 만들었습니다.',
    features:['아삭하고 시원한 과즙','세종 북부권 대표 과일','도도리파크의 지역 자원'],purchasePlaces:['세종로컬푸드 싱싱장터','지역 농가 직판장'],
    sourceUrl:'https://www.sjlocal.or.kr/menu/view/55',sourceLabel:'세종로컬푸드·지역 관광 자료',imageUrl:'/images/food-shops/specialties/sejong-pear.png',
    infoSections:[
      {id:'story',title:'도도리 이야기',content:'도도리는 세종의 대표 과일인 복숭아와 배의 한자음을 조합한 이름으로, 조치원 농촌테마공원에도 쓰입니다.'},
      {id:'taste',title:'맛과 특징',content:'가을에 만나는 세종 배는 아삭한 식감과 풍부한 과즙이 특징이며 생과와 선물용으로 판매됩니다.'},
      {id:'buy',title:'구매 안내',content:'수확 시기와 품종은 농가마다 다르므로 싱싱장터 출하 정보나 생산 농가 안내를 확인하는 것이 좋습니다.'},
    ],
  }),
  specialty({
    id:'local-sejong-rice',name:'세종쌀',menuName:'세종 들녘에서 재배한 지역 쌀',
    category:['농산물','곡류'],tags:['세종쌀','삼광미','로컬푸드','지역 농산물'],district:'연동면·연서면 등',
    address:'세종특별자치시 농촌 지역과 로컬푸드 판매장',origin:'세종특별자치시 재배 쌀',season:'가을 수확 · 연중 유통',
    description:'금강 유역과 세종의 농촌 들녘에서 생산되는 지역 쌀입니다. 밥뿐 아니라 지역 막걸리와 여러 가공식품의 원료로도 활용됩니다.',
    features:['세종 지역 생산','지역 술과 가공식품 원료','싱싱장터 판매'],purchasePlaces:['세종로컬푸드 싱싱장터','지역 농협 판매장'],
    sourceUrl:localFoodSource,sourceLabel:'세종로컬푸드 싱싱장터',imageUrl:'/images/food-shops/specialties/sejong-rice.png',
    infoSections:[
      {id:'origin',title:'세종의 쌀',content:'세종의 읍·면 농촌 지역에서 생산해 지역 밥상과 로컬 가공품의 기본 재료가 되는 농산물입니다.'},
      {id:'use',title:'어디에 쓰이나요?',content:'가정용 쌀은 물론 떡, 누룽지, 전통주와 지역 가공식품의 원료로 폭넓게 사용됩니다.'},
      {id:'buy',title:'구매 안내',content:'품종과 도정일을 확인하고 싱싱장터나 지역 농협 등 원산지 표시가 분명한 판매처에서 구매하세요.'},
    ],
  }),
  specialty({
    id:'local-peach-products',name:'조치원 복숭아 가공품',menuName:'잼·병조림·주스·디저트',
    category:['가공 특산품','디저트'],tags:['복숭아잼','복숭아병조림','복숭아주스','복숭아디저트'],district:'조치원읍 일대',
    address:'세종특별자치시 조치원읍 및 세종 지역 로컬 판매장',origin:'조치원 복숭아를 활용한 지역 가공품',season:'연중 · 제품별 상이',
    description:'제철이 짧은 조치원 복숭아를 잼, 병조림, 주스, 빵과 디저트로 즐길 수 있게 만든 지역 가공품 묶음입니다.',
    features:['복숭아의 사계절 활용','선물하기 좋은 지역 상품','제품별 원재료 함량 확인'],purchasePlaces:['세종로컬푸드 싱싱장터','복숭아축제 판매장','지역 제조사 판매처'],
    sourceUrl:peachSource,sourceLabel:'세종시 마을기록문화관·지역 판매 자료',imageUrl:'/images/food-shops/specialties/jochwon-peach-products.png',
    infoSections:[
      {id:'products',title:'어떤 제품이 있나요?',content:'복숭아 잼과 병조림, 주스, 청, 빵과 디저트 등 생산자와 제조사에 따라 다양한 제품이 나옵니다.'},
      {id:'check',title:'구매 전 확인',content:'상품마다 복숭아 원산지와 함량이 다를 수 있으니 원재료명과 제조·판매 정보를 확인하세요.'},
      {id:'season',title:'축제에서 만나기',content:'여름 세종조치원복숭아축제에서는 생과와 함께 여러 지역 가공품과 복숭아 먹거리를 비교해 볼 수 있습니다.'},
    ],
  }),
  specialty({
    id:'local-jochwon-makgeolli',name:'조치원 복숭아·자두 막걸리',menuName:'세종 농산물로 빚는 지역 과실주',
    category:['전통주','가공 특산품'],tags:['복숭아막걸리','자두막걸리','조치원양조장','사일로브루어리'],district:'조치원읍',
    address:'세종특별자치시 조치원읍 충현1길 60 일대',origin:'세종산 농산물과 삼광미를 활용한 지역 막걸리',season:'연중 · 재고별 상이',
    description:'조치원 양조 문화의 흐름을 잇는 지역 술입니다. 기록 자료에는 삼광미와 세종산 농산물을 활용한 복숭아·자두 막걸리 생산이 소개돼 있습니다.',
    features:['조치원 양조 문화','세종 농산물 활용','복숭아·자두 풍미'],purchasePlaces:['지역 양조장·판매처','세종 지역 특산품 행사'],
    sourceUrl:brewerySource,sourceLabel:'세종시 마을기록문화관',imageUrl:'/images/food-shops/specialties/jochwon-makgeolli.png',
    infoSections:[
      {id:'brewery',title:'조치원 양조 이야기',content:'조치원에는 쌀을 찌고 발효해 술을 빚던 양조 산업의 기억이 남아 있으며, 현재도 지역 농산물을 활용한 술이 생산됩니다.'},
      {id:'ingredients',title:'지역 재료',content:'기록에는 막걸리 원료로 삼광미를 쓰고 세종에서 생산된 복숭아와 자두를 활용한다고 소개되어 있습니다.'},
      {id:'notice',title:'이용 안내',content:'주류이므로 법정 음주 연령만 구매할 수 있습니다. 제품 종류와 판매 여부는 방문 전에 제조·판매처에서 확인하세요.'},
    ],
  }),
  specialty({
    id:'local-jochwon-danmuji',name:'조치원 단무지',menuName:'무 재배와 절임 산업이 만든 지역 먹거리',
    category:['향토 산업 먹거리','절임류'],tags:['조치원 단무지','절임무','지역 산업사','세종 먹거리'],district:'조치원읍',
    address:'세종특별자치시 조치원읍 일대',origin:'조치원의 무 재배·절임 가공 역사',season:'연중 유통',
    description:'복숭아만큼 널리 알려지지는 않았지만 조치원의 농업·식품산업사를 보여주는 독특한 먹거리입니다. 하천 주변 무 재배와 절임 가공업이 함께 성장했습니다.',
    features:['조치원의 숨은 특산 산업','무 재배와 절임 가공의 역사','지역 식품산업 기록'],purchasePlaces:['세종전통시장','일반 식품 판매처 · 제조사 확인'],
    sourceUrl:danmujiSource,sourceLabel:'세종시 마을기록문화관',imageUrl:'/images/food-shops/specialties/jochwon-danmuji.png',
    infoSections:[
      {id:'history',title:'조치원 단무지 역사',content:'조치원에서는 하천 주변의 농업 환경을 바탕으로 단무지용 무 재배가 이뤄졌고 절임 식품 가공 산업으로 이어졌습니다.'},
      {id:'industry',title:'지역 산업의 흔적',content:'지역 기록은 복숭아와 함께 단무지를 조치원의 중요한 산업 자원으로 소개합니다.'},
      {id:'check',title:'구매할 때',content:'현재 판매 상품은 제조사마다 원료 산지가 다를 수 있으므로 조치원 소재 업체 여부와 제품 원산지 표시를 따로 확인하세요.'},
    ],
  }),
  specialty({
    id:'local-sejong-seasonal-produce',name:'싱싱세종 제철 농산물',menuName:'오이·토마토·딸기·채소를 생산자 직거래로',
    category:['로컬푸드','제철 농산물'],tags:['싱싱장터','오이','토마토','딸기','채소','생산자 직거래'],district:'세종시 전역',
    address:'싱싱장터 도담점·아름점 등',origin:'세종특별자치시 참여 농가',season:'계절별 출하 품목 상이',
    description:'하나의 특정 특산물이 아니라 세종 농가가 생산한 과일과 채소를 가까운 직매장에서 만나는 로컬푸드 묶음입니다. 생산자와 출하 정보를 확인할 수 있습니다.',
    features:['생산자 이름을 확인하는 직매장','계절마다 달라지는 품목','지역 농가와 소비자 연결'],purchasePlaces:['싱싱장터 도담점','싱싱장터 아름점 등'],
    sourceUrl:localFoodSource,sourceLabel:'세종로컬푸드 싱싱장터',imageUrl:'/images/food-shops/actual/singsing-dodam.jpg',
    infoSections:[
      {id:'market',title:'싱싱장터',content:'세종 지역 농업인이 출하한 농산물과 가공품을 시민에게 연결하는 로컬푸드 직매장입니다.'},
      {id:'season',title:'계절별 먹거리',content:'딸기와 봄나물, 오이와 토마토, 여름 과일, 가을 곡물과 채소처럼 실제 진열 품목은 계절과 당일 출하에 따라 달라집니다.'},
      {id:'producer',title:'생산자 확인',content:'상품 라벨의 생산자, 산지, 출하일 정보를 살펴보면 세종에서 누가 어떻게 키운 먹거리인지 확인할 수 있습니다.'},
    ],
  }),
  specialty({
    id:'local-jochwon-market-food',name:'세종전통시장 장날 먹거리',menuName:'모둠전·분식·시장 반찬',
    category:['전통시장 먹거리','향토 음식'],tags:['세종전통시장','오일장','모둠전','분식','시장 먹거리'],district:'조치원읍',
    address:'세종특별자치시 조치원읍 원리·정리 일대',origin:'세종전통시장 상인들이 만드는 현장 먹거리',season:'연중 · 오일장 4·9일',
    description:'1931년경 상가가 형성된 세종전통시장에서 만나는 생활형 지역 먹거리입니다. 장날에는 전, 분식, 반찬과 농산물 판매가 어우러집니다.',
    features:['4·9일에 서는 오일장','시장 즉석 먹거리','조치원 생활문화'],purchasePlaces:['세종전통시장 점포와 장날 노점'],
    sourceUrl:marketSource,sourceLabel:'세종시 마을기록문화관',imageUrl:'/images/food-shops/jochwon-market.jpg',
    infoSections:[
      {id:'market',title:'세종전통시장',content:'조치원읍 원리와 정리에 걸쳐 형성된 시장으로, 상설 점포와 매월 끝자리가 4일과 9일인 오일장이 함께 운영됩니다.'},
      {id:'food',title:'장날 먹거리',content:'여러 채소와 버섯을 넣은 모둠전, 분식, 반찬처럼 상점과 장날에 따라 달라지는 즉석 먹거리를 만날 수 있습니다.'},
      {id:'visit',title:'방문 팁',content:'장날은 4·9·14·19·24·29일입니다. 개별 점포의 영업 여부와 메뉴는 당일 현장에서 확인하세요.'},
    ],
  }),
];
