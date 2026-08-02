import type { CharacterParts } from '../types';

export const FESTIVAL_NPC_JUNHO = {
  id: 'festival-npc-junho', nickname: '준호',
  status: '파란 체험 부스 앞에서 축제 프로그램을 둘러보는 중',
  x: 900, z: 1130, yaw: Math.PI * .65, walkSpeed: 38,
  patrol: [{x:900,z:1130},{x:760,z:990},{x:870,z:820},{x:1040,z:930}],
  model: 'cloths',
  appearance: {
    hair:'hair-black', hairStyle:'hair1', topStyle:'style2', bottomStyle:'style1', shoesStyle:'style2',
    face:'face-smile', top:'top-blue', topLayer:'top-layer-cream', bottom:'bottom-beige', shoes:'shoes-brown', accessory:'accessory-none',
  } satisfies CharacterParts,
} as const;

export const FESTIVAL_NPC_HYUNWOO = {
  id: 'festival-npc-hyunwoo', nickname: '현우',
  status: '빨간 전시 부스 근처에서 공연 시간을 확인하는 중',
  x: 1500, z: 1130, yaw: -Math.PI * .65, walkSpeed: 42,
  patrol: [{x:1500,z:1130},{x:1640,z:990},{x:1530,z:820},{x:1360,z:930}],
  model: 'cloths',
  appearance: {
    hair:'hair-brown', hairStyle:'hair2', topStyle:'style1', bottomStyle:'style2', shoesStyle:'style1',
    face:'face-smile', top:'top-green', topLayer:'top-layer-cream', bottom:'bottom-navy', shoes:'shoes-black', accessory:'accessory-navy',
  } satisfies CharacterParts,
} as const;

export const FESTIVAL_NPCS = [FESTIVAL_NPC_JUNHO, FESTIVAL_NPC_HYUNWOO] as const;
