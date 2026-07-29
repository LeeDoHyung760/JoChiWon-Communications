import tulipImage from '../assets/plants/tulip.jpg';
import camelliaImage from '../assets/plants/camellia.jpg';
import sunflowerImage from '../assets/plants/sunflower.jpg';
import magnoliaImage from '../assets/plants/magnolia.jpg';
import adonisImage from '../assets/plants/adonis.jpg';
import azaleaImage from '../assets/plants/azalea.jpg';
import hydrangeaImage from '../assets/plants/hydrangea.jpg';
import irisImage from '../assets/plants/iris.jpg';
import lilyImage from '../assets/plants/lily.jpg';
import gujeolchoImage from '../assets/plants/gujeolcho.jpg';
import hibiscusImage from '../assets/plants/hibiscus.jpg';
import birdOfParadiseImage from '../assets/plants/bird-of-paradise.jpg';
import peachBlossomImage from '../assets/plants/peach-blossom.jpg';
import mapleImage from '../assets/plants/maple.jpg';

export type PlantCategory='flower'|'peach-tree'|'red-tree';

export interface PlantDefinition{
  id:string;
  objectNames:string[];
  displayName:string;
  scientificName?:string;
  category:PlantCategory;
  shortDescription:string;
  characteristics:string[];
  season?:string;
  observationPoint?:string;
  observationPoints?:string[];
  aiMessage?:string;
  observationGuide?:string;
  nameStory?:string;
  everydayStory?:string;
  habitat?:string;
  comparisonTip?:string;
  emotionBridge?:string;
  imageUrl?:string;
  thumbnailUrl?:string;
  imageAlt?:string;
  imageSource?:string;
  imageSourceUrl?:string;
  gallery?:Array<{url:string;alt:string;caption?:string}>;
  locationNote?:string;
  isSejongRelated?:boolean;
  fallbackColor?:string;
}

const flower=(number:number,objectNames:string[],fallbackColor:string,info:{name:string;description:string;season:string;observation:string;message:string;characteristics:string[]}):PlantDefinition=>({
  id:`flower-${String(number).padStart(2,'0')}`,
  objectNames,
  displayName:info.name,
  category:'flower',
  shortDescription:info.description,
  characteristics:info.characteristics,
  season:info.season,
  observationPoint:info.observation,
  observationPoints:info.observation.split('과 ').map(item=>item.trim()).filter(Boolean),
  aiMessage:info.message,
  observationGuide:`${info.observation}을 천천히 살펴보세요. ${info.characteristics[0]}의 형태가 다른 부분과 어떻게 이어지는지 비교해보세요.`,
  locationNote:'수목원 온실',
  fallbackColor,
});

export const GREENHOUSE_MEMORY_TREE_OBJECT='tripo_node_0dde67af-841b-4742-82a1-1dec368d5454';
export const GREENHOUSE_STRUCTURE_OBJECT='tripo_node_73b6fb5b-952e-413f-8486-004d12ae1fc9';

export const greenhousePlants:PlantDefinition[]=[
  flower(1,['tripo_node_1ef6630c-255f-4228-a15b-4d3c292c5a0a'],'#ef9aa9',{name:'목련',description:'잎보다 먼저 크고 밝은 꽃을 피워 봄의 시작을 알리는 나무꽃이에요.',season:'봄',observation:'두툼한 꽃잎과 가지 끝의 큰 꽃봉오리',message:'“천천히 열려도 괜찮아. 네 계절은 분명히 오고 있어.”',characteristics:['크고 밝은 꽃','잎보다 먼저 개화','봄을 알리는 나무꽃']}),
  flower(2,['tripo_node_5d2cf1ea-58d7-48d1-b1b4-5f9bdfaba3bb'],'#f0b36c',{name:'세복수초',description:'봄이 오기 전 가장 먼저 노란 꽃으로 계절의 소식을 전하는 우리나라 자생식물이에요.',season:'늦겨울~초봄',observation:'햇빛에 열리는 노란 꽃과 지면 가까이 피는 모습',message:'“아직 추워도, 나는 먼저 봄을 시작해.”',characteristics:['노란 꽃','이른 개화','한국 자생식물']}),
  flower(3,['tripo_node_85bd9788-cf33-4a5d-bba8-8e7f434e3424'],'#e98491',{name:'철쭉',description:'봄 산과 정원을 화사하게 물들이는 친숙한 꽃나무예요.',season:'봄',observation:'깔때기 모양 꽃과 꽃잎 안쪽의 무늬',message:'“함께 피어날 때 풍경은 더 따뜻해져.”',characteristics:['깔때기 모양 꽃','무리 지어 개화','봄꽃']}),
  flower(4,['tripo_node_85bd9788-cf33-4a5d-bba8-8e7f434e3424.001'],'#d698c8',{name:'수국',description:'작은 꽃들이 모여 커다란 꽃송이처럼 보이는 여름 꽃이에요.',season:'여름',observation:'작은 꽃이 둥글게 모인 꽃차례와 색의 변화',message:'“작은 마음들이 모이면 커다란 위로가 될 수 있어.”',characteristics:['둥근 꽃차례','풍성한 꽃송이','다양한 색']}),
  flower(5,['tripo_node_5433ed1f-89af-45bf-bb2a-77a288c8f229'],'#f0cd67',{name:'튤립',description:'매끈한 줄기 위에 잔 모양 꽃을 피우는 대표적인 봄 알뿌리식물이에요.',season:'봄',observation:'단정한 꽃잎 배열과 곧게 선 줄기',message:'“오늘은 네가 좋아하는 색을 마음에 하나 골라봐.”',characteristics:['잔 모양 꽃','알뿌리식물','다채로운 색']}),
  flower(6,['tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f'],'#eb8f76',{name:'붓꽃',description:'붓을 닮은 꽃봉오리와 곧게 뻗은 잎이 인상적인 꽃이에요.',season:'늦봄~초여름',observation:'검처럼 길쭉한 잎과 꽃잎의 섬세한 무늬',message:'“마음속 색을 오늘의 풍경에 천천히 그려봐.”',characteristics:['붓 모양 꽃봉오리','길쭉한 잎','섬세한 꽃무늬']}),
  flower(7,['tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f.001'],'#d9a6dc',{name:'백합',description:'크고 우아한 꽃과 길게 뻗은 수술이 돋보이는 여름 꽃이에요.',season:'여름',observation:'여섯 장처럼 보이는 꽃잎과 안쪽으로 길게 나온 수술',message:'“말하지 않아도 전해지는 마음이 있어.”',characteristics:['큰 꽃','긴 수술','은은한 향']}),
  flower(8,['tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f.002'],'#f1bf7b',{name:'동백꽃',description:'윤기 나는 푸른 잎 사이에서 붉은 꽃을 피우는 상록성 꽃나무예요.',season:'겨울~초봄',observation:'두꺼운 잎의 광택과 겹겹이 모인 꽃잎',message:'“차가운 계절에도 따뜻한 색은 사라지지 않아.”',characteristics:['붉은 꽃','윤기 나는 상록 잎','겨울꽃']}),
  flower(9,['tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777'],'#e890b0',{name:'해바라기',description:'큰 꽃차례가 밝은 인상을 주는 대표적인 여름 꽃이에요.',season:'여름',observation:'가운데 작은 꽃들의 나선 배열과 넓은 꽃잎',message:'“오늘 네 마음이 향하고 싶은 곳은 어디야?”',characteristics:['큰 꽃차례','노란 꽃잎','높게 자라는 줄기']}),
  flower(10,['tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777.001'],'#bda1df',{name:'구절초',description:'가을 들판에서 흰색 또는 연분홍색 꽃을 피우는 우리나라 자생식물이에요.',season:'가을',observation:'작은 꽃송이와 깊게 갈라진 잎의 모양',message:'“조용히 피어난 마음도 충분히 오래 기억돼.”',characteristics:['흰색·연분홍 꽃','가을 개화','한국 자생식물']}),
  flower(11,['tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777.002'],'#f2a67c',{name:'무궁화',description:'여름부터 가을까지 새로운 꽃을 이어서 피우는 우리나라의 나라꽃이에요.',season:'여름~가을',observation:'꽃 중심의 붉은 무늬와 넓게 펼쳐진 다섯 꽃잎',message:'“다시 피어나는 힘은 이미 네 안에 있어.”',characteristics:['우리나라 나라꽃','다섯 꽃잎','이어 피는 꽃']}),
  flower(12,[
    'tripo_node_eae4343d-83a2-4ef9-af2d-ad7ab6903b8a',
    'tripo_node_eae4343d-83a2-4ef9-af2d-ad7ab6903b8a.001',
  ],'#df8f9c',{name:'극락조화',description:'주황색과 푸른색 꽃이 새의 모습을 닮은 대표적인 온실식물이에요.',season:'온실에서 연중 관찰',observation:'새의 머리처럼 보이는 독특한 꽃의 형태',message:'“익숙하지 않은 모습도 나만의 아름다움이 될 수 있어.”',characteristics:['새를 닮은 꽃','주황·푸른 색','온실식물']}),
  {
    id:'peach-tree',
    objectNames:['tripo_node_157c23fd-589c-4140-86e7-4bae7d886abe'],
    displayName:'복숭아나무',
    scientificName:'Prunus persica',
    category:'peach-tree',
    shortDescription:'봄에 분홍색 꽃을 피우며 세종의 희망과 새로운 도약을 상징하는 나무예요.',
    characteristics:['연분홍색 봄꽃','세종의 희망','새로운 시작'],
    season:'꽃은 봄, 열매는 여름',
    observationPoint:'여러 장의 분홍빛 꽃잎과 가지를 따라 피는 모습',
    observationPoints:['여러 장의 분홍빛 꽃잎','가지를 따라 이어지는 꽃의 배열','꽃잎 중심의 색 변화'],
    aiMessage:'“오늘 네가 시작하고 싶은 일은 무엇이야?”',
    observationGuide:'여러 장의 분홍빛 꽃잎이 가지를 따라 어떻게 모여 있는지 살펴보세요. 꽃 중심과 가장자리의 색이 어떻게 달라지는지 비교해보세요.',
    locationNote:'수목원 온실 나무 구역',
    isSejongRelated:true,
    fallbackColor:'#ef9dac',
  },
  {
    id:'red-tree',
    objectNames:['tripo_node_fffb096b-6b1d-428a-a7fc-ae48fdb1b699'],
    displayName:'단풍나무',
    category:'red-tree',
    shortDescription:'계절에 따라 잎의 색이 달라지며 변화와 용기를 떠올리게 하는 나무예요.',
    characteristics:['손바닥 모양 잎','붉은 단풍','계절의 변화'],
    season:'단풍은 가을',
    observationPoint:'갈라진 잎의 형태와 붉게 물든 색의 차이',
    observationPoints:['손바닥처럼 갈라진 잎','잎 가장자리의 톱니','잎마다 다른 붉은 색조'],
    aiMessage:'“변화는 끝이 아니라 새로운 색을 찾는 과정이야.”',
    observationGuide:'손바닥처럼 갈라진 잎과 가장자리의 작은 톱니를 살펴보세요. 잎마다 붉은색의 밝기와 범위가 어떻게 다른지 비교해보세요.',
    locationNote:'수목원 온실 나무 구역',
    fallbackColor:'#b8544f',
  },
];

type PlantKnowledge=Pick<PlantDefinition,'scientificName'|'season'|'observationPoints'|'nameStory'|'everydayStory'|'habitat'|'comparisonTip'|'emotionBridge'>;
const plantKnowledge:Record<string,PlantKnowledge>={
  'flower-01':{
    scientificName:'Magnolia spp.',season:'3~4월',
    nameStory:'연꽃처럼 크고 밝은 꽃이 나무에서 핀다고 하여 ‘나무의 연꽃’이라는 이름 이야기가 전해져요.',
    everydayStory:'도시의 봄을 가장 먼저 보여주는 정원수예요. 꽃눈은 부드러운 털에 싸여 겨울 추위를 견딥니다.',
    habitat:'햇빛이 잘 들고 물 빠짐이 좋은 정원과 숲 가장자리에서 잘 자라요.',
    comparisonTip:'백목련은 흰 꽃이 위를 향해 피는 경우가 많고, 자목련류는 꽃 바깥쪽에 자주색이 뚜렷해요.',
    observationPoints:['잎보다 먼저 나오는 큰 꽃','겨울눈을 감싼 부드러운 털','두툼한 꽃덮이 조각의 색 변화'],
    emotionBridge:'긴 겨울을 지나 가장 먼저 열린 큰 꽃을 천천히 본 뒤, 지금 당신에게 먼저 다가온 느낌을 남겨보세요.',
  },
  'flower-02':{
    scientificName:'Adonis multiflora',season:'1~3월',
    nameStory:'‘세복수초’는 잎이 가늘게 갈라지는 복수초라는 뜻을 담고 있으며, 제주에서는 이른 봄을 알리는 꽃으로 알려져 있어요.',
    everydayStory:'제주 자생지의 계절 변화를 알려주는 관찰 식물이에요. 식물 전체에 독성 성분이 있어 먹거나 함부로 채취하면 안 됩니다.',
    habitat:'제주의 낙엽수림 아래처럼 겨울에는 볕이 들고 봄 이후에는 그늘지는 숲 바닥에서 자라요.',
    comparisonTip:'복수초류 가운데 세복수초는 가늘게 갈라진 잎과 한 줄기에서 여러 꽃이 피는 모습을 함께 살펴보면 좋아요.',
    observationPoints:['햇빛을 받으면 넓게 열리는 노란 꽃','가늘게 여러 번 갈라진 잎','낙엽 사이 지면 가까이 올라오는 줄기'],
    emotionBridge:'추위가 남은 숲 바닥에서 먼저 열린 노란 꽃을 보며, 당신에게는 어떤 장면이 떠오르는지 적어보세요.',
  },
  'flower-03':{
    scientificName:'Rhododendron schlippenbachii',season:'4~5월',
    nameStory:'꽃이 아름다워 걸음을 머뭇거리게 했다는 ‘척촉’의 이름 이야기가 철쭉으로 이어졌다고 전해져요.',
    everydayStory:'봄 산의 대표적인 경관 식물이지만 진달래와 달리 독성이 있어 꽃이나 잎을 먹으면 안 돼요.',
    habitat:'햇빛이 드는 산지의 능선과 숲 가장자리, 배수가 좋은 약산성 토양에서 자라요.',
    comparisonTip:'진달래는 대체로 잎보다 꽃이 먼저 피고, 철쭉은 꽃과 잎을 함께 볼 수 있으며 잎이 더 넓고 주름져요.',
    observationPoints:['꽃과 함께 나온 넓은 잎','깔때기 모양 꽃 안쪽의 반점','가지 끝에 모여 피는 꽃송이'],
    emotionBridge:'서로 모여 핀 꽃과 잎의 모습을 살펴본 뒤, 가장 먼저 생각난 사람이나 장면을 기록해보세요.',
  },
  'flower-04':{
    scientificName:'Hydrangea macrophylla',season:'6~7월',
    nameStory:'수국은 한자 ‘물 수(水)’와 ‘국화 국(菊)’을 쓰는 이름으로, 둥글고 풍성한 꽃차례의 인상을 담고 있어요.',
    everydayStory:'일부 수국은 토양의 산도와 알루미늄 이용 가능성에 따라 꽃받침처럼 보이는 부분의 색이 달라져 정원 관찰 소재로 사랑받아요.',
    habitat:'반그늘의 촉촉하고 유기물이 많은 토양을 좋아하지만 물이 오래 고이는 곳은 피하는 편이 좋아요.',
    comparisonTip:'일반 수국은 큰 장식꽃이 공처럼 모이고, 산수국은 가운데 작은 꽃 둘레를 큰 장식꽃이 둘러싸는 경우가 많아요.',
    observationPoints:['공처럼 모인 꽃차례','가운데 작은 진짜 꽃','꽃송이마다 다른 색과 밝기'],
    emotionBridge:'작은 꽃들이 모여 하나의 풍경을 만든 모습을 보며, 당신에게 떠오른 관계나 장면을 남겨보세요.',
  },
  'flower-05':{
    scientificName:'Tulipa spp.',season:'3~5월',
    nameStory:'튤립이라는 이름은 꽃 모양이 터번을 닮았다고 본 옛 표현에서 유래한 것으로 알려져 있어요.',
    everydayStory:'알뿌리에 다음 계절을 위한 양분을 저장하는 대표적인 봄 화단 식물로, 색과 품종이 매우 다양해요.',
    habitat:'햇빛이 충분하고 물 빠짐이 좋은 곳을 좋아하며, 알뿌리는 여름의 과습에 약해요.',
    comparisonTip:'백합도 꽃덮이 조각이 여섯 장이지만, 튤립은 넓은 잎 사이에서 잔 모양 꽃이 단정하게 서는 모습이 뚜렷해요.',
    observationPoints:['잔처럼 모인 여섯 꽃덮이 조각','줄기를 감싸는 넓고 매끈한 잎','꽃 중심과 가장자리의 색 차이'],
    emotionBridge:'가장 눈길이 머무는 색과 꽃의 선을 찾은 뒤, 그 장면이 만든 느낌을 한 문장으로 적어보세요.',
  },
  'flower-06':{
    scientificName:'Iris sanguinea',season:'5~6월',
    nameStory:'붓을 세워 둔 듯 뾰족한 꽃봉오리의 모습에서 ‘붓꽃’이라는 이름이 붙었어요.',
    everydayStory:'곧은 잎과 복잡한 꽃 구조가 대비되어 정원과 생태 학습원에서 형태 관찰 식물로 자주 활용돼요.',
    habitat:'햇빛이 드는 들과 습기가 적당한 풀밭에서 자라며, 뿌리 주변의 지나친 물 고임은 피하는 편이에요.',
    comparisonTip:'붓꽃은 검 모양 잎이 부채처럼 서고 꽃잎이 위·아래로 나뉘지만, 원추리는 긴 꽃잎이 나팔처럼 퍼져요.',
    observationPoints:['부채처럼 겹쳐 자라는 검 모양 잎','아래로 늘어진 꽃잎의 무늬','안쪽과 바깥쪽 꽃잎의 방향 차이'],
    emotionBridge:'꽃잎 안쪽의 선과 색을 그림처럼 살펴보고, 지금 마음과 닮은 부분을 찾아보세요.',
  },
  'flower-07':{
    scientificName:'Lilium spp.',season:'6~8월',
    nameStory:'백합(百合)은 알뿌리의 여러 비늘조각이 겹겹이 모인 모습을 담은 이름이에요.',
    everydayStory:'향기와 큰 꽃 때문에 절화와 정원 식물로 널리 쓰여요. 백합류는 고양이에게 매우 위험할 수 있어 반려동물 주변에서는 주의해야 해요.',
    habitat:'종에 따라 숲 가장자리와 풀밭에서 자라며, 햇빛과 배수가 좋고 뿌리 쪽이 서늘한 환경을 좋아해요.',
    comparisonTip:'백합은 잎이 달린 줄기 끝에 꽃이 피고 큰 꽃밥이 뚜렷하지만, 원추리는 잎 없는 꽃대가 잎 사이에서 따로 올라와요.',
    observationPoints:['여섯 장처럼 보이는 꽃덮이 조각','꽃 밖으로 길게 나온 수술과 꽃밥','줄기를 따라 달린 좁은 잎'],
    emotionBridge:'크게 열린 꽃과 향기를 상상하며, 말하지 않아도 전하고 싶은 마음이 있는지 떠올려보세요.',
  },
  'flower-08':{
    scientificName:'Camellia japonica',season:'1~4월',
    nameStory:'동백은 겨울에도 푸른 잎 사이에서 꽃을 피우는 ‘겨울의 나무꽃’이라는 인상을 이름에 담고 있어요.',
    everydayStory:'씨에서 얻은 동백기름은 남부 지역에서 머릿기름과 생활 재료로 이용되어 온 문화가 있어요.',
    habitat:'남해안과 섬의 따뜻하고 바람이 덜한 숲에서 자라며, 반그늘과 촉촉한 산성 토양을 좋아해요.',
    comparisonTip:'동백꽃은 질 때 꽃송이가 통째로 떨어지는 경우가 많고, 애기동백은 꽃잎이 한 장씩 흩어지는 편이에요.',
    observationPoints:['두껍고 윤기 나는 상록 잎','겹겹이 포개진 붉은 꽃잎','꽃 중심에 모여 선 노란 수술'],
    emotionBridge:'차가운 계절에도 선명한 꽃과 푸른 잎을 보며, 당신에게 남아 있는 온기를 떠올려보세요.',
  },
  'flower-09':{
    scientificName:'Helianthus annuus',season:'7~9월',
    nameStory:'해를 닮은 큰 꽃이 빛을 향하는 모습에서 ‘해바라기’라는 이름이 붙었어요.',
    everydayStory:'한 송이처럼 보이지만 가운데와 가장자리의 수많은 작은 꽃이 모인 꽃차례이며, 씨는 식품과 기름의 재료가 돼요.',
    habitat:'햇빛이 풍부하고 물 빠짐이 좋은 곳에서 잘 자라며, 키가 커지면 바람에 쓰러지지 않도록 지지가 필요해요.',
    comparisonTip:'루드베키아도 노란 꽃잎과 짙은 중심을 가지지만, 해바라기는 보통 줄기와 잎이 더 크고 거친 털이 뚜렷해요.',
    observationPoints:['가운데 작은 꽃들의 나선 배열','혀꽃처럼 보이는 노란 가장자리 꽃','거칠고 넓은 잎과 굵은 줄기'],
    emotionBridge:'수많은 작은 꽃이 모여 만든 큰 원을 바라보며, 지금 마음이 향하고 싶은 곳을 생각해보세요.',
  },
  'flower-10':{
    scientificName:'Chrysanthemum zawadskii',season:'9~11월',
    nameStory:'음력 9월 9일 무렵 줄기의 마디가 아홉이 된다는 옛 이름 이야기가 ‘구절초’에 담겨 있다고 전해져요.',
    everydayStory:'향기로운 꽃과 줄기를 말려 차나 전통 생활 소재로 이용한 기록이 있지만, 야생 식물은 임의로 채취하거나 약처럼 먹지 않는 것이 안전해요.',
    habitat:'햇빛이 드는 산기슭과 들, 배수가 좋은 풀밭과 바위 주변에서 무리 지어 자라요.',
    comparisonTip:'쑥부쟁이는 잎이 길고 좁은 편인 반면, 구절초는 잎이 국화잎처럼 깊게 갈라지는 모습이 뚜렷해요.',
    observationPoints:['흰색에서 연분홍빛을 띠는 꽃잎','노란색 작은 꽃이 모인 중심부','깊게 갈라진 잎의 윤곽'],
    emotionBridge:'가을 들판에서 오래 남는 흰 꽃과 향기를 떠올리며, 지금 조용히 간직하고 싶은 순간을 적어보세요.',
  },
  'flower-11':{
    scientificName:'Hibiscus syriacus',season:'7~10월',
    nameStory:'무궁화의 ‘무궁(無窮)’은 끝이 없다는 뜻으로, 꽃이 계속 이어 피는 모습과 연결돼요.',
    everydayStory:'우리나라의 나라꽃으로 학교와 공원, 생활 공간에서 널리 심으며 다양한 색과 무늬의 품종이 있어요.',
    habitat:'햇빛이 잘 들고 배수가 좋은 곳에서 튼튼하게 자라며, 가지치기로 나무 모양을 관리하기 쉬워요.',
    comparisonTip:'접시꽃과 비슷해 보이지만 무궁화는 목질의 가지를 가진 나무이고, 꽃 중심의 긴 수술기둥과 붉은 무늬가 뚜렷해요.',
    observationPoints:['꽃 중심에서 길게 나온 수술기둥','안쪽의 붉은 단심 무늬','날마다 이어서 열리는 꽃봉오리'],
    emotionBridge:'한 송이가 지고 또 다른 꽃이 이어지는 모습을 보며, 다시 시작하고 싶은 일을 떠올려보세요.',
  },
  'flower-12':{
    scientificName:'Strelitzia reginae',season:'따뜻한 온실에서 연중 관찰',
    nameStory:'주황색 꽃과 푸른 꽃잎이 새의 머리와 볏처럼 보여 ‘극락조화’, 영어로는 bird-of-paradise flower라 불려요.',
    everydayStory:'남아프리카 원산의 온실 관엽·절화 식물이며, 넓은 잎의 생김새에서 바나나와 가까운 친척임을 볼 수 있어요.',
    habitat:'따뜻하고 밝은 곳을 좋아하며 추위와 과습에 약해 국내에서는 주로 온실이나 실내에서 길러요.',
    comparisonTip:'헬리코니아도 새처럼 화려하지만, 극락조화는 배 모양의 가로 포엽 위로 주황색과 푸른색 꽃잎이 펼쳐져요.',
    observationPoints:['배처럼 가로로 놓인 녹색 포엽','위로 선 주황색 꽃덮이 조각','새의 부리처럼 뻗은 푸른 꽃잎'],
    emotionBridge:'낯선 새를 닮은 꽃의 방향과 색을 따라가며, 새롭게 경험해보고 싶은 일을 떠올려보세요.',
  },
  'peach-tree':{
    scientificName:'Prunus persica',season:'꽃 3~4월 · 열매 6~8월',
    nameStory:'복숭아나무는 꽃과 열매를 함께 즐기는 과수로, 분홍 꽃은 오래전부터 봄 풍경과 길한 이미지에 등장해왔어요.',
    everydayStory:'세종 지역의 봄 축제와 과수원 풍경에 연결하기 좋은 나무이며, 여름에는 향기로운 핵과가 익어요.',
    habitat:'햇빛과 통풍이 좋고 물 빠짐이 좋은 곳에서 잘 자라며, 늦서리는 꽃과 어린 열매에 영향을 줄 수 있어요.',
    comparisonTip:'벚꽃은 긴 꽃자루에 여러 송이가 모이는 경우가 많고, 복숭아꽃은 짧은 꽃자루로 가지 가까이에 붙어 피는 모습이 보여요.',
    observationPoints:['가지 가까이에 붙어 피는 분홍 꽃','꽃 중심에서 바깥으로 달라지는 색','길고 좁으며 톱니가 있는 잎'],
    emotionBridge:'꽃뿐 아니라 여름에 맺힐 열매까지 상상해보고, 가장 먼저 든 생각이나 궁금증을 그대로 적어보세요.',
  },
  'red-tree':{
    scientificName:'Acer palmatum',season:'꽃 4~5월 · 단풍 10~11월',
    nameStory:'학명 palmatum은 손바닥 모양이라는 뜻으로, 여러 갈래로 깊게 나뉜 잎의 모습을 가리켜요.',
    everydayStory:'계절 변화가 선명해 정원과 산책길의 대표적인 관찰 나무이며, 날개 달린 열매는 바람을 타고 회전해요.',
    habitat:'산지의 숲 가장자리와 계곡 주변에서 자라며, 강한 건조보다 적당히 촉촉하고 배수가 좋은 토양을 좋아해요.',
    comparisonTip:'단풍나무 잎은 가지에서 마주나지만, 단풍잎처럼 보이는 미국풍나무 잎은 어긋나고 별 모양에 가까워요.',
    observationPoints:['손바닥처럼 깊게 갈라진 잎','가지에서 서로 마주난 잎','프로펠러처럼 생긴 두 장의 날개열매'],
    emotionBridge:'잎마다 조금씩 다른 색과 갈래를 비교하며, 변해가는 계절이 불러온 기억을 적어보세요.',
  },
};

greenhousePlants.forEach(plant=>Object.assign(plant,plantKnowledge[plant.id]));

const commonsPage=(fileName:string)=>`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName.replaceAll(' ','_'))}`;
const plantPhotos:Record<string,{url:string;file:string}>={
  'flower-01':{url:magnoliaImage,file:'Magnolia × soulangeana blossom.jpg'},
  'flower-02':{url:adonisImage,file:'側金盞花 Adonis amurensis -南韓南怡島 South Korea- (33141010383).jpg'},
  'flower-03':{url:azaleaImage,file:'Rhododendron-schlippenbachii-1.jpg'},
  'flower-04':{url:hydrangeaImage,file:"Bigleaf Hydrangea Hydrangea macrophylla 'Tokyo Delight' Flowers 3008px.jpg"},
  'flower-05':{url:tulipImage,file:"Tulip Tulipa clusiana 'Lady Jane' Rock Ledge Flower Edit 2000px.jpg"},
  'flower-06':{url:irisImage,file:'Verschiedenfarbige Schwertlilie (Iris versicolor)-20200603-RM-100257.jpg'},
  'flower-07':{url:lilyImage,file:"Lily Lilium 'Citronella' Flower.jpg"},
  'flower-08':{url:camelliaImage,file:'Camellia japonica NBG.jpg'},
  'flower-09':{url:sunflowerImage,file:'Sunflower macro wide.jpg'},
  'flower-10':{url:gujeolchoImage,file:'구절초.jpg'},
  'flower-11':{url:hibiscusImage,file:'Hibiscus syriacus - flor.jpg'},
  'flower-12':{url:birdOfParadiseImage,file:'Strelitzia reginae flower.jpg'},
  'peach-tree':{url:peachBlossomImage,file:'Peach blossom.jpg'},
  'red-tree':{url:mapleImage,file:'Acer Palmatum Japanese Maple tree Autumn Newton Massachusetts.jpg'},
};

greenhousePlants.forEach(plant=>{
  const photo=plantPhotos[plant.id];
  if(!photo)return;
  plant.imageUrl=photo.url;
  plant.thumbnailUrl=photo.url;
  plant.imageAlt=`${plant.displayName} 식물 사진`;
  plant.imageSource='Wikimedia Commons';
  plant.imageSourceUrl=commonsPage(photo.file);
});

export const greenhousePlantById=new Map(greenhousePlants.map(plant=>[plant.id,plant]));
export const greenhousePlantIdByObjectName=new Map(greenhousePlants.flatMap(plant=>plant.objectNames.map(name=>[name,plant.id] as const)));
export const GREENHOUSE_PLANT_TOTAL=greenhousePlants.length;
