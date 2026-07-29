import type { CharacterParts } from '../types';

export const CAMPUS_FRIEND_NPC = {
  id: 'campus-friend-npc-minjun',
  nickname: '민준',
  status: '캠퍼스를 둘러보는 중',
  x: 1350,
  z: 1420,
  yaw: -Math.PI * .72,
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
