import type { CharacterParts } from '../types';

export const CAMPUS_FRIEND_NPC = {
  id: 'campus-friend-npc-minjun',
  nickname: '민준',
  status: '캠퍼스를 둘러보는 중',
  x: 1350,
  z: 1420,
  yaw: -Math.PI * .72,
  walkSpeed: 44,
  patrol: [
    {x: 1350, z: 1420},
    {x: 1540, z: 1320},
    {x: 1580, z: 1100},
    {x: 1430, z: 930},
    {x: 1190, z: 900},
    {x: 1040, z: 1080},
    {x: 1070, z: 1320},
    {x: 1200, z: 1460},
  ],
  model: 'boy1',
  appearance: {
    hair: 'hair-black',
    face: 'face-smile',
    top: 'top-blue',
    topLayer: 'top-layer-cream',
    bottom: 'bottom-navy',
    shoes: 'shoes-brown',
    accessory: 'accessory-navy',
  } satisfies CharacterParts,
} as const;

export const CAMPUS_FRIEND_NPC_SEOYEON = {
  id: 'campus-friend-npc-seoyeon',
  nickname: '서연',
  status: '민준과 캠퍼스를 둘러보는 중',
  x: 1410,
  z: 1390,
  yaw: -Math.PI * .58,
  walkSpeed: 40,
  patrol: [
    {x: 1410, z: 1390},
    {x: 1240, z: 1510},
    {x: 980, z: 1450},
    {x: 880, z: 1240},
    {x: 970, z: 1020},
    {x: 1190, z: 940},
    {x: 1430, z: 1010},
    {x: 1540, z: 1210},
  ],
  model: 'women',
  appearance: {
    hair: 'hair-brown',
    hairStyle: 'hair2',
    topStyle: 'style1',
    bottomStyle: 'style2',
    shoesStyle: 'style1',
    face: 'face-smile',
    top: 'top-green',
    topLayer: 'top-layer-cream',
    bottom: 'bottom-beige',
    shoes: 'shoes-brown',
    accessory: 'accessory-none',
  } satisfies CharacterParts,
} as const;

export const CAMPUS_FRIEND_NPCS = [
  CAMPUS_FRIEND_NPC,
  CAMPUS_FRIEND_NPC_SEOYEON,
] as const;
