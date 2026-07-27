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
  },
  boy1: {
    'tripo_part_0': 'hair',
    'tripo_part_1': 'face',
    'tripo_part_9': 'face',
    'tripo_part_10': 'face',
    'tripo_part_11': 'face',
    'tripo_part_12': 'face',
    'tripo_part_3': 'top',
    'tripo_part_4': 'topLayer',
    'tripo_part_5': 'bottom',
    'tripo_part_6': 'shoes',
    'tripo_part_7': 'shoes',
    'tripo_part_13': 'shoes',
    'tripo_part_14': 'shoes',
    'tripo_part_2': 'accessory',
    'tripo_part_8': 'accessory',
  },
  cloths: {
    'hair1': 'hair',
    'pants': 'bottom',
    'shirt1_1.001': 'accessory',
    'shirt1_1_001': 'accessory',
    'shirt1_1001': 'accessory',
    'shirt1_2': 'top',
    'shoes1': 'shoes',
    'tripo_node_f2f741ba': 'face',
    'tripo_part_2': 'accessory',
  }
};

const COLOR_MATERIAL_FLAG = '__characterColorMaterial';
const ORIGINAL_COLOR_FLAG = '__characterOriginalColor';

function cloneColorMaterial(material: Material) {
  const clone = material.clone();
  clone.userData[COLOR_MATERIAL_FLAG] = true;
  const color = (material as any).color;
  if (color) clone.userData[ORIGINAL_COLOR_FLAG] = color.getHex();
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

    const selectedPart = parts[partKind]??`${partKind}-none`;
    const hidden = selectedPart.endsWith('-none');
    node.visible = !hidden;
    if (hidden) return;
    if (selectedPart.endsWith('-original')) {
      const materials: any[] = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(material => {
        const original = material.userData?.[ORIGINAL_COLOR_FLAG];
        if (original !== undefined) material.color?.setHex(original);
        material.needsUpdate = true;
      });
      return;
    }
    const color = getPart(partKind, selectedPart).color;
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
