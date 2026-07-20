import type { PartKind } from '../types';
export interface PartOption { id: string; label: string; color: string; symbol?: string }
export const assetManifest: Record<PartKind, PartOption[]> = {
  hair:[{id:'hair-brown',label:'브라운',color:'#5d4037'},{id:'hair-black',label:'블랙',color:'#263238'},{id:'hair-pink',label:'핑크',color:'#ec89a4'}],
  face:[{id:'face-smile',label:'미소',color:'#ffd7b5',symbol:'⌣'},{id:'face-calm',label:'차분',color:'#f4c9a3',symbol:'•'},{id:'face-wink',label:'윙크',color:'#f7d6bb',symbol:'◡'}],
  top:[{id:'top-green',label:'그린 후디',color:'#4b9b71'},{id:'top-blue',label:'블루 셔츠',color:'#477bc4'},{id:'top-coral',label:'코랄 니트',color:'#db6f62'}],
  bottom:[{id:'bottom-navy',label:'네이비',color:'#34445e'},{id:'bottom-beige',label:'베이지',color:'#b49a76'},{id:'bottom-gray',label:'그레이',color:'#667078'}]
};
export const getPart = (kind: PartKind, id: string) => assetManifest[kind].find(p=>p.id===id) ?? assetManifest[kind][0];
