import type { CharacterParts } from '../types';

export const STUDENT_HALL_NPC_HARIN = {
  id: 'student-hall-npc-harin',
  nickname: '하린',
  status: '학생회관에서 새로운 모임을 찾아보는 중',
  x: 650,
  z: 1260,
  yaw: Math.PI * .8,
  walkSpeed: 40,
  patrol: [
    {x: 650, z: 1260},
    {x: 430, z: 1120},
    {x: 470, z: 820},
    {x: 690, z: 650},
    {x: 840, z: 850},
    {x: 790, z: 1130},
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

export const STUDENT_HALL_NPC_DOYUN = {
  id: 'student-hall-npc-doyun',
  nickname: '도윤',
  status: '같이 활동할 캠퍼스 친구를 기다리는 중',
  x: 1750,
  z: 1240,
  yaw: -Math.PI * .8,
  walkSpeed: 44,
  patrol: [
    {x: 1750, z: 1240},
    {x: 1970, z: 1100},
    {x: 1930, z: 810},
    {x: 1710, z: 650},
    {x: 1560, z: 860},
    {x: 1610, z: 1130},
  ],
  model: 'cloths',
  appearance: {
    hair: 'hair-black',
    hairStyle: 'hair1',
    topStyle: 'style2',
    bottomStyle: 'style1',
    shoesStyle: 'style2',
    face: 'face-smile',
    top: 'top-blue',
    topLayer: 'top-layer-cream',
    bottom: 'bottom-gray',
    shoes: 'shoes-black',
    accessory: 'accessory-none',
  } satisfies CharacterParts,
} as const;

export const STUDENT_HALL_NPCS = [
  STUDENT_HALL_NPC_HARIN,
  STUDENT_HALL_NPC_DOYUN,
] as const;
