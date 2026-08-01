import type {SejongFoodPlace} from './sejongFoodTypes';

const verifiedAt='2026-08-02';
const peachSource='https://www2.sejong.go.kr/sejongmaeul/archive/collection/ArchiveCollectionView.do?con_id=2523';
const localFoodSource='https://news.sejong.go.kr/news/articleView.html?idxno=3716';

export const sejongLocalFoods:SejongFoodPlace[]=[
  {
    id:'local-jochwon-peach',truckId:'street',itemType:'local_food',name:'조치원 복숭아',menuName:'세종 대표 특산물',
    category:['지역 먹거리','복숭아','대표 특산물'],tags:['조치원 복숭아','제철','생산지','복숭아축제','가공품'],district:'조치원읍',
    address:'세종특별자치시 조치원읍 일원',priceRange:'품종·시기별 상이',openingHours:'여름 수확기 중심',closedDays:'판매처별 확인',
    description:'1908년 무렵부터 재배 역사를 이어온 세종의 대표 특산물로, 높은 당도와 향긋한 풍미로 알려져 있습니다.',
    features:['약 100년이 넘는 재배 역사','7~8월 대표 제철 과일','세종조치원복숭아축제'],nearbyPlaces:['조치원전통시장','세종시민운동장'],
    imageUrl:'/images/festivals/peach-2026.jpg',imageSource:'세종시 공식 지역문화 기록',mapUrl:'https://map.naver.com/p/search/%EC%A1%B0%EC%B9%98%EC%9B%90%20%EB%B3%B5%EC%88%AD%EC%95%84',
    origin:'세종특별자치시 조치원읍 및 인근 농가',season:'7월 말~8월 중심',purchasePlaces:['조치원 지역 농가 판매장','싱싱장터'],festival:'세종조치원복숭아축제',
    infoSections:[
      {id:'introduction',title:'복숭아 소개',content:'높은 당도와 연한 과육, 향긋한 풍미로 알려진 세종의 대표 과일입니다.'},
      {id:'history',title:'역사',content:'조치원 일대에서는 1908년 무렵부터 복숭아 재배가 이어져 100년이 넘는 지역 농업의 역사를 담고 있습니다.'},
      {id:'season',title:'제철 시기',content:'대표 출하 시기는 7월 말부터 8월이며 품종과 기후에 따라 달라질 수 있습니다.'},
      {id:'festival',title:'복숭아 축제',content:'세종조치원복숭아축제는 농가 판매, 체험과 지역문화 프로그램을 함께 만나는 여름 대표 축제입니다.'},
      {id:'processed',title:'복숭아 가공품',content:'복숭아 잼, 주스, 아이스크림, 빵과 디저트 등 다양한 지역 가공품으로 활용됩니다.'},
    ],sourceUrl:peachSource,sourceLabel:'세종시 마을기록문화관',verifiedAt,active:true,
  },
  {
    id:'local-sejong-rice',truckId:'street',itemType:'local_food',name:'세종쌀',menuName:'세종 지역에서 재배한 쌀',
    category:['지역 먹거리','쌀','지역 농산물'],tags:['세종쌀','재배 지역','생산지','활용 음식'],district:'세종시 읍·면 지역',
    address:'세종특별자치시 읍·면 농경지',priceRange:'품종·판매처별 상이',openingHours:'연중 판매',closedDays:'판매처별 확인',
    description:'금강 유역과 세종의 읍·면 농경지에서 생산되는 지역 농산물로, 밥과 떡 등 일상 음식의 바탕이 됩니다.',
    features:['세종 지역 생산','지역 식생활의 기본 농산물','밥·떡·한과 등에 활용'],nearbyPlaces:['싱싱장터','세종 지역 농촌'],
    imageUrl:'',imageSource:'세종 지역 농산물 안내',mapUrl:'https://map.naver.com/p/search/%EC%84%B8%EC%A2%85%EC%8C%80',origin:'세종특별자치시 읍·면 농가',season:'가을 수확·연중 유통',purchasePlaces:['싱싱장터','지역 농협·판매장'],localIngredient:'세종 지역에서 생산한 쌀',
    infoSections:[
      {id:'rice',title:'세종쌀',content:'세종의 농촌 지역에서 생산되어 지역의 밥상을 이루는 기본 농산물입니다.'},
      {id:'production-area',title:'재배 지역',content:'조치원읍과 연동·부강·금남·연서·전의·전동·소정면 등 세종의 읍·면 농경지에서 재배됩니다.'},
      {id:'features',title:'특징',content:'생산자와 품종에 따라 맛과 식감이 다르며 지역 직매장과 농협 판매처에서 확인할 수 있습니다.'},
      {id:'dishes',title:'활용 음식',content:'쌀밥, 솥밥, 떡, 한과, 식혜와 쌀가공품 등 다양한 지역 음식의 재료로 활용됩니다.'},
    ],sourceUrl:localFoodSource,sourceLabel:'세종시 공식 로컬푸드 안내',verifiedAt,active:true,
  },
  {
    id:'local-sejong-seasonal-produce',truckId:'street',itemType:'local_food',name:'세종 로컬푸드',menuName:'제철 농산물과 생산 농가',
    category:['지역 먹거리','로컬푸드','제철 농산물'],tags:['싱싱장터','제철 정보','생산지','생산 농가','딸기','토마토','오이'],district:'세종시 전역',
    address:'싱싱장터 도담점·아름점 등',priceRange:'품목·시기별 상이',openingHours:'직매장별 확인',closedDays:'직매장별 확인',
    description:'특정 한 품목이 아니라 세종 농가가 생산한 딸기·토마토·오이와 여러 제철 농산물을 지역에서 소비하는 브랜드 개념입니다.',
    features:['생산자와 소비자를 잇는 직매장','계절별 다품종 농산물','지역 농가의 생산 이야기'],nearbyPlaces:['싱싱장터 도담점','싱싱장터 아름점'],
    imageUrl:'/images/food-shops/actual/singsing-dodam.jpg',imageSource:'프로젝트 보유 싱싱장터 이미지',mapUrl:'https://map.naver.com/p/search/%EC%84%B8%EC%A2%85%20%EC%8B%B1%EC%8B%B1%EC%9E%A5%ED%84%B0',origin:'세종특별자치시 참여 농가',season:'계절별 품목 상이',purchasePlaces:['싱싱장터 직매장'],localIngredient:'세종 농가의 제철 농산물',
    infoSections:[
      {id:'direct-market',title:'로컬푸드 직매장',content:'싱싱장터는 세종 농민이 생산한 먹거리를 지역 시민에게 직접 연결하는 세종형 로컬푸드 직매장입니다.'},
      {id:'seasonal',title:'제철 농산물',content:'딸기·토마토·오이·잎채소·과일 등 시기에 맞는 농산물을 중심으로 만날 수 있습니다.'},
      {id:'calendar',title:'계절별 생산 품목',content:'봄에는 딸기와 잎채소, 여름에는 복숭아·토마토·오이, 가을에는 쌀과 뿌리채소 등 계절에 따라 구성이 달라집니다.'},
      {id:'farmers',title:'생산 농가 이야기',content:'상품의 생산자 표시를 통해 누가 어디에서 길렀는지 확인하고 지역 농가의 생산 과정에 관심을 이어갈 수 있습니다.'},
    ],sourceUrl:localFoodSource,sourceLabel:'세종시 시정소식지 싱싱장터',verifiedAt,active:true,
  },
];
