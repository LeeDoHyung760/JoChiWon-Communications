import {GARDEN_FLOWER_IDS,type GardenFlowerId} from './personal-farm.js';

export interface GardenFlowerAssetIdentity {
  flowerId:GardenFlowerId;
  plantId:string;
  objectNames:readonly string[];
}

// The identifiers authored into garden.glb are the source of truth.  Keeping
// the API aliases beside them lets clicks, collection and farm placement refer
// to the exact same object even when a caller sends a plant or GLB node id.
export const GARDEN_FLOWER_ASSETS:readonly GardenFlowerAssetIdentity[]=[
  {flowerId:'magnolia',plantId:'flower-01',objectNames:['tripo_node_1ef6630c-255f-4228-a15b-4d3c292c5a0a']},
  {flowerId:'adonis',plantId:'flower-02',objectNames:['tripo_node_5d2cf1ea-58d7-48d1-b1b4-5f9bdfaba3bb']},
  {flowerId:'azalea',plantId:'flower-03',objectNames:['tripo_node_85bd9788-cf33-4a5d-bba8-8e7f434e3424']},
  {flowerId:'hydrangea',plantId:'flower-04',objectNames:['tripo_node_85bd9788-cf33-4a5d-bba8-8e7f434e3424.001']},
  {flowerId:'tulip',plantId:'flower-05',objectNames:['tripo_node_5433ed1f-89af-45bf-bb2a-77a288c8f229']},
  {flowerId:'iris',plantId:'flower-06',objectNames:['tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f']},
  {flowerId:'lily',plantId:'flower-07',objectNames:['tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f.001']},
  {flowerId:'camellia',plantId:'flower-08',objectNames:['tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f.002','tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f002']},
  {flowerId:'sunflower',plantId:'flower-09',objectNames:['tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777']},
  {flowerId:'gujeolcho',plantId:'flower-10',objectNames:['tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777.001']},
  {flowerId:'hibiscus',plantId:'flower-11',objectNames:['tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777.002']},
  {flowerId:'bird-of-paradise',plantId:'flower-12',objectNames:['tripo_node_eae4343d-83a2-4ef9-af2d-ad7ab6903b8a','tripo_node_eae4343d-83a2-4ef9-af2d-ad7ab6903b8a.001']},
  {flowerId:'peach-tree',plantId:'peach-tree',objectNames:['tripo_node_157c23fd-589c-4140-86e7-4bae7d886abe']},
  {flowerId:'maple-tree',plantId:'red-tree',objectNames:['tripo_node_fffb096b-6b1d-428a-a7fc-ae48fdb1b699']},
] as const;

const normalize=(value:string)=>{
  try{return decodeURIComponent(value).trim().toLowerCase()}
  catch{return value.trim().toLowerCase()}
};
const flowerIdByAlias=new Map<string,GardenFlowerId>();
for(const asset of GARDEN_FLOWER_ASSETS){
  for(const alias of [asset.flowerId,asset.plantId,...asset.objectNames])flowerIdByAlias.set(normalize(alias),asset.flowerId);
}

export function resolveGardenFlowerId(value:string):GardenFlowerId|undefined{
  const normalized=normalize(value);
  const alias=flowerIdByAlias.get(normalized);
  if(alias)return alias;
  return (GARDEN_FLOWER_IDS as readonly string[]).includes(normalized)?normalized as GardenFlowerId:undefined;
}
