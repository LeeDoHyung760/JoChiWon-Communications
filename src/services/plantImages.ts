import type { PlantDefinition } from '../data/greenhouse-plants';

export interface PlantImage{url:string;alt:string;caption?:string}

export const plantGallery=(plant:PlantDefinition):PlantImage[]=>{
  const images:PlantImage[]=[];
  if(plant.imageUrl)images.push({url:plant.imageUrl,alt:plant.imageAlt??`${plant.displayName} 대표 사진`});
  for(const image of plant.gallery??[])if(!images.some(item=>item.url===image.url))images.push(image);
  return images;
};

export const hasUsablePlantImage=(url:string|undefined,failed:boolean)=>Boolean(url&&!failed);
