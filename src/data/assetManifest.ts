import type { PartKind } from '../types';export interface PartOption{id:string;label:string;color:string;symbol?:string}
export const assetManifest:Record<PartKind,PartOption[]>={hair:[{id:'hair-brown',label:'브라운',color:'#5d4037'},{id:'hair-black',label:'블랙',color:'#263238'},{id:'hair-pink',label:'핑크',color:'#ec89a4'}],face:[{id:'face-wink',label:'보통 피부',color:'#f7d6bb',symbol:'😉'},{id:'face-smile',label:'연한 피부',color:'#ffd7b5',symbol:'🙂'},{id:'face-calm',label:'진한 피부',color:'#f4c9a3',symbol:'😌'}],top:[{id:'top-green',label:'그린 후디',color:'#4b9b71'},{id:'top-blue',label:'블루 셔츠',color:'#477bc4'},{id:'top-coral',label:'코랄 니트',color:'#db6f62'}],topLayer:[{id:'top-layer-cream',label:'크림 레이어',color:'#e7dfcf'},{id:'top-layer-sky',label:'스카이 레이어',color:'#8db8d8'},{id:'top-layer-charcoal',label:'차콜 레이어',color:'#485258'}],bottom:[{id:'bottom-navy',label:'네이비',color:'#34445e'},{id:'bottom-beige',label:'베이지',color:'#b49a76'},{id:'bottom-gray',label:'그레이',color:'#667078'}],shoes:[{id:'shoes-brown',label:'브라운 신발',color:'#6d4c41'},{id:'shoes-black',label:'검은 신발',color:'#212121'},{id:'shoes-pink',label:'분홍 신발',color:'#e91e63'}],accessory:[{id:'accessory-navy',label:'네이비 넥타이',color:'#243b64'},{id:'accessory-red',label:'레드 넥타이',color:'#a73737'},{id:'accessory-gold',label:'골드 넥타이',color:'#b58a36'}]};
export const customPartId=(kind:PartKind,color:string)=>`${kind}-custom-${color.replace('#','').toLowerCase()}`;
export const customPartColor=(kind:PartKind,id?:string)=>{
  const match=id?.match(new RegExp(`^${kind}-custom-([0-9a-fA-F]{6})$`));
  return match?`#${match[1].toLowerCase()}`:null;
};
export const getPart=(kind:PartKind,id?:string)=>{
  const customColor=customPartColor(kind,id);
  if(customColor)return {id:id!,label:'직접 고른 색',color:customColor};
  return assetManifest[kind].find(p=>p.id===id)??assetManifest[kind][0];
};
