import type { Material, Object3D } from 'three';
import type { CharacterModel, CharacterParts, PartKind } from '../types';
import { getPart } from '../data/assetManifest';

// girl1 GLB의 요청된 메시만 변경한다. 목록에 없는 눈/장식 등의 색은 원본을 유지한다.
export const modelPartMappings: Partial<Record<CharacterModel, Record<string, PartKind>>> = {
  girl1: {
    'tripo_part_0': 'bottom',
    'tripo_part_1': 'hair',
    'tripo_part_2': 'top',
    'tripo_part_3': 'face',
    'tripo_part_4': 'shoes',
    'tripo_part_6': 'shoes',
    'tripo_part_8': 'face',
    'tripo_part_9': 'face',
  }
};

const COLOR_MATERIAL_FLAG = '__characterColorMaterial';

function cloneColorMaterial(material: Material) {
  const clone = material.clone();
  clone.userData[COLOR_MATERIAL_FLAG] = true;
  return clone;
}

export function applyColorsToThreeScene(
  scene: Object3D,
  model: CharacterModel,
  parts: CharacterParts
) {
  const mapping = modelPartMappings[model];
  if (!mapping) return;

  scene.traverse((node: any) => {
    const partKind = node.isMesh ? mapping[node.name] : undefined;
    if (!partKind || !node.material) return;

    const color = getPart(partKind, parts[partKind]).color;
    const materials: any[] = Array.isArray(node.material) ? node.material : [node.material];
    const coloredMaterials = materials.map(material => {
      const target = material.userData?.[COLOR_MATERIAL_FLAG]
        ? material
        : cloneColorMaterial(material);
      target.color?.set(color);
      target.needsUpdate = true;
      return target;
    });
    node.material = Array.isArray(node.material) ? coloredMaterials : coloredMaterials[0];
  });
}
