import type {GardenFlowerId} from '../../shared/personal-farm';
import {GARDEN_FLOWER_ASSETS} from '../../shared/garden-flower-assets';

export interface FlowerAssetNodeDefinition {
  objectName:string;
  userDataName:string;
}

export const FLOWER_ASSET_NODES:Record<GardenFlowerId,FlowerAssetNodeDefinition>=Object.fromEntries(GARDEN_FLOWER_ASSETS.map(asset=>[asset.flowerId,{objectName:asset.objectNames[0],userDataName:asset.objectNames[0]}])) as Record<GardenFlowerId,FlowerAssetNodeDefinition>;
/* Legacy explicit table retained below for reference.
const LEGACY_FLOWER_ASSET_NODES:Record<GardenFlowerId,FlowerAssetNodeDefinition>={
  magnolia:{objectName:'tripo_node_1ef6630c-255f-4228-a15b-4d3c292c5a0a',userDataName:'tripo_node_1ef6630c-255f-4228-a15b-4d3c292c5a0a'},
  adonis:{objectName:'tripo_node_5d2cf1ea-58d7-48d1-b1b4-5f9bdfaba3bb',userDataName:'tripo_node_5d2cf1ea-58d7-48d1-b1b4-5f9bdfaba3bb'},
  azalea:{objectName:'tripo_node_85bd9788-cf33-4a5d-bba8-8e7f434e3424',userDataName:'tripo_node_85bd9788-cf33-4a5d-bba8-8e7f434e3424'},
  hydrangea:{objectName:'tripo_node_85bd9788-cf33-4a5d-bba8-8e7f434e3424.001',userDataName:'tripo_node_85bd9788-cf33-4a5d-bba8-8e7f434e3424.001'},
  tulip:{objectName:'tripo_node_5433ed1f-89af-45bf-bb2a-77a288c8f229',userDataName:'tripo_node_5433ed1f-89af-45bf-bb2a-77a288c8f229'},
  iris:{objectName:'tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f',userDataName:'tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f'},
  camellia:{objectName:'tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f002',userDataName:'tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f.002'},
  sunflower:{objectName:'tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777',userDataName:'tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777'},
  lily:{objectName:'tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f.001',userDataName:'tripo_node_d77a6696-cf84-414c-aad7-f3334cb7e40f.001'},
  gujeolcho:{objectName:'tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777.001',userDataName:'tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777.001'},
  hibiscus:{objectName:'tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777.002',userDataName:'tripo_node_e4218dc4-635b-4b76-8f8b-d017040ae777.002'},
  'bird-of-paradise':{objectName:'tripo_node_eae4343d-83a2-4ef9-af2d-ad7ab6903b8a',userDataName:'tripo_node_eae4343d-83a2-4ef9-af2d-ad7ab6903b8a'},
  'peach-tree':{objectName:'tripo_node_157c23fd-589c-4140-86e7-4bae7d886abe',userDataName:'tripo_node_157c23fd-589c-4140-86e7-4bae7d886abe'},
  'maple-tree':{objectName:'tripo_node_fffb096b-6b1d-428a-a7fc-ae48fdb1b699',userDataName:'tripo_node_fffb096b-6b1d-428a-a7fc-ae48fdb1b699'},
}; */

export const normalizeFlowerNodeName=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
