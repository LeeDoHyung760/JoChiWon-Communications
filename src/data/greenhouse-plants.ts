import tulipImage from '../assets/plants/tulip.jpg';
import camelliaImage from '../assets/plants/camellia.jpg';
import sunflowerImage from '../assets/plants/sunflower.jpg';

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

const commonsFile=(fileName:string)=>`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=900`;
const commonsPage=(fileName:string)=>`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName.replaceAll(' ','_'))}`;
const plantPhotos:Record<string,{url:string;file:string}>={
  'flower-01':{url:commonsFile('Magnolia × soulangeana blossom.jpg'),file:'Magnolia × soulangeana blossom.jpg'},
  'flower-02':{url:commonsFile('側金盞花 Adonis amurensis -南韓南怡島 South Korea- (33141010383).jpg'),file:'側金盞花 Adonis amurensis -南韓南怡島 South Korea- (33141010383).jpg'},
  'flower-03':{url:commonsFile('Rhododendron-schlippenbachii-1.jpg'),file:'Rhododendron-schlippenbachii-1.jpg'},
  'flower-04':{url:commonsFile("Bigleaf Hydrangea Hydrangea macrophylla 'Tokyo Delight' Flowers 3008px.jpg"),file:"Bigleaf Hydrangea Hydrangea macrophylla 'Tokyo Delight' Flowers 3008px.jpg"},
  'flower-05':{url:tulipImage,file:"Tulip Tulipa clusiana 'Lady Jane' Rock Ledge Flower Edit 2000px.jpg"},
  'flower-06':{url:commonsFile('Verschiedenfarbige Schwertlilie (Iris versicolor)-20200603-RM-100257.jpg'),file:'Verschiedenfarbige Schwertlilie (Iris versicolor)-20200603-RM-100257.jpg'},
  'flower-07':{url:commonsFile("Lily Lilium 'Citronella' Flower.jpg"),file:"Lily Lilium 'Citronella' Flower.jpg"},
  'flower-08':{url:camelliaImage,file:'Camellia japonica NBG.jpg'},
  'flower-09':{url:sunflowerImage,file:'Sunflower macro wide.jpg'},
  'flower-10':{url:commonsFile('Dendranthema zawadskii var. latilobum.jpg'),file:'Dendranthema zawadskii var. latilobum.jpg'},
  'flower-11':{url:commonsFile('Hibiscus syriacus - flor.jpg'),file:'Hibiscus syriacus - flor.jpg'},
  'flower-12':{url:commonsFile('Strelitzia reginae flower.jpg'),file:'Strelitzia reginae flower.jpg'},
  'peach-tree':{url:commonsFile('Peach blossom.jpg'),file:'Peach blossom.jpg'},
  'red-tree':{url:commonsFile('Acer palmatum atropurpureum.jpg'),file:'Acer palmatum atropurpureum.jpg'},
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
