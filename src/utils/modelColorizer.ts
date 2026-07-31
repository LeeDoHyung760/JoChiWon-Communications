import { BufferAttribute, BufferGeometry } from 'three';
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
    'body': 'face',
    'hair1_m': 'hair',
    'hair2_m': 'hair',
    'pants1_m': 'bottom',
    'pants2_m': 'bottom',
    'shirt1_2_m': 'topLayer',
    'shirt1_m': 'top',
    'shirt2_m': 'top',
    'shoes1_m_1': 'shoes',
    'shoes1_m_2': 'shoes',
    'shoes2_m_1': 'shoes',
    'shoes2_m_2': 'shoes',
  },
  women: {
    'body': 'face',
    'hair1_w': 'hair',
    'hair2_w': 'hair',
    'pants1_w': 'bottom',
    'pants2_w': 'bottom',
    'shirt1_2_w': 'topLayer',
    'shirt1_w': 'top',
    'shirt2_w': 'top',
    'shoes1_w': 'shoes',
    'shoes2_w.001': 'shoes',
  }
};

function extendedPartKind(nodeName: string,model:'cloths'|'women'): PartKind | undefined {
  const normalized = nodeName.replaceAll('.', '_').toLowerCase();
  const suffix=model==='women'?'w':'m';
  if (normalized.startsWith(`hair1_${suffix}`) || normalized.startsWith(`hair2_${suffix}`)) return 'hair';
  if (normalized.startsWith(`pants1_${suffix}`) || normalized.startsWith(`pants2_${suffix}`)) return 'bottom';
  if (normalized.startsWith(`shirt1_2_${suffix}`)) return 'topLayer';
  if (normalized.startsWith(`shirt1_${suffix}`) || normalized.startsWith(`shirt2_${suffix}`)) return 'top';
  if (normalized.startsWith(`shoes1_${suffix}`) || normalized.startsWith(`shoes2_${suffix}`)) return 'shoes';
  if (normalized === 'body' || normalized.startsWith('body_')) return 'face';
  return undefined;
}

const COLOR_MATERIAL_FLAG = '__characterColorMaterial';
const ORIGINAL_COLOR_FLAG = '__characterOriginalColor';
const EXTENDED_MODEL_METALNESS = 0;
const EXTENDED_MODEL_ROUGHNESS = 0.5;
const WOMEN_SHOES2_SYMMETRY_FLAG = '__womenShoes2Symmetric';
const correctedWomenShoes2Geometries = new WeakMap<object, BufferGeometry>();

function makeWomenShoes2Symmetric(node: any) {
  if (!node.isSkinnedMesh || node.userData?.[WOMEN_SHOES2_SYMMETRY_FLAG]) return;
  const normalizedName=String(node.name).replaceAll('.','_').toLowerCase();
  if (!normalizedName.startsWith('shoes2_w') || !node.geometry?.attributes?.position) return;

  const cached=correctedWomenShoes2Geometries.get(node.geometry);
  if (cached) {
    node.geometry=cached;
    node.userData[WOMEN_SHOES2_SYMMETRY_FLAG]=true;
    return;
  }

  const sourceGeometry=node.geometry as BufferGeometry;
  sourceGeometry.computeBoundingBox();
  const bounds=sourceGeometry.boundingBox;
  if (!bounds) return;
  const symmetryX=(bounds.min.x+bounds.max.x)/2;
  const position=sourceGeometry.getAttribute('position');
  const index=sourceGeometry.getIndex();
  const triangleCount=(index?.count??position.count)/3;
  const sourceTriangles:number[][]=[];

  for (let triangle=0;triangle<triangleCount;triangle+=1) {
    const vertices=[0,1,2].map(offset=>index?.getX(triangle*3+offset)??triangle*3+offset);
    const centerX=vertices.reduce((sum,vertex)=>sum+position.getX(vertex),0)/3;
    // 정면 기준 오른쪽에 보이는 발목 신발(모델의 +X, LeftFoot 쪽)만 원본으로 사용한다.
    if (centerX>symmetryX) sourceTriangles.push(vertices);
  }
  if (!sourceTriangles.length) return;

  const bones=node.skeleton?.bones??[];
  const mirroredBoneIndex=new Map<number,number>();
  bones.forEach((bone:any,boneIndex:number)=>{
    const name=String(bone.name);
    const counterpart=name.includes('Left')
      ?name.replace('Left','Right')
      :name.includes('Right')
        ?name.replace('Right','Left')
        :name;
    const counterpartIndex=bones.findIndex((candidate:any)=>candidate.name===counterpart);
    mirroredBoneIndex.set(boneIndex,counterpartIndex>=0?counterpartIndex:boneIndex);
  });

  const corrected=new BufferGeometry();
  Object.entries(sourceGeometry.attributes).forEach(([attributeName,rawAttribute])=>{
    const attribute=rawAttribute as BufferAttribute;
    const values:number[]=[];
    const appendVertex=(vertex:number,mirrored:boolean)=>{
      for (let component=0;component<attribute.itemSize;component+=1) {
        let value=attribute.getComponent(vertex,component);
        if (mirrored&&attributeName==='position'&&component===0) value=2*symmetryX-value;
        if (mirrored&&attributeName==='normal'&&component===0) value=-value;
        if (mirrored&&attributeName==='skinIndex') value=mirroredBoneIndex.get(value)??value;
        values.push(value);
      }
    };
    sourceTriangles.forEach(vertices=>{
      vertices.forEach(vertex=>appendVertex(vertex,false));
      // 반사된 삼각형은 정점 순서를 뒤집어 표면 방향을 유지한다.
      [vertices[0],vertices[2],vertices[1]].forEach(vertex=>appendVertex(vertex,true));
    });
    const AttributeArray=attribute.array.constructor as new (values:ArrayLike<number>)=>any;
    corrected.setAttribute(
      attributeName,
      new BufferAttribute(new AttributeArray(values),attribute.itemSize,attribute.normalized)
    );
  });
  corrected.computeBoundingBox();
  corrected.computeBoundingSphere();
  correctedWomenShoes2Geometries.set(sourceGeometry,corrected);
  node.geometry=corrected;
  node.userData[WOMEN_SHOES2_SYMMETRY_FLAG]=true;
}

function cloneColorMaterial(material: Material) {
  const clone = material.clone();
  clone.userData[COLOR_MATERIAL_FLAG] = true;
  const color = (material as any).color;
  if (color) clone.userData[ORIGINAL_COLOR_FLAG] = color.getHex();
  return clone;
}

function matchWomenFinishToCloths(node: any) {
  if (!node.isMesh || !node.material) return;
  const materials: any[] = Array.isArray(node.material) ? node.material : [node.material];
  const normalized = materials.map(material => {
    const target = material.userData?.[COLOR_MATERIAL_FLAG]
      ? material
      : cloneColorMaterial(material);
    if ('metalness' in target) target.metalness = EXTENDED_MODEL_METALNESS;
    if ('roughness' in target) target.roughness = EXTENDED_MODEL_ROUGHNESS;
    target.needsUpdate = true;
    return target;
  });
  node.material = Array.isArray(node.material) ? normalized : normalized[0];
}

export function applyColorsToThreeScene(
  scene: Object3D,
  model: CharacterModel,
  parts: CharacterParts
) {
  const mapping = modelPartMappings[model];
  if (!mapping) return;
  const extendedModel=model==='women'||model==='cloths'?model:undefined;

  scene.traverse((node: any) => {
    if (extendedModel && node.isMesh) {
      if(model==='women')makeWomenShoes2Symmetric(node);
      matchWomenFinishToCloths(node);
      const normalizedName = String(node.name).replaceAll('.', '_').toLowerCase();
      const suffix=extendedModel==='women'?'w':'m';
      const selectedHairStyle = parts.hairStyle==='hair2'?'hair2':'hair1';
      const legacyGarmentStyle=parts.outfitStyle==='outfit2'?'style2':'style1';
      const selectedTopStyle=parts.topStyle??legacyGarmentStyle;
      const selectedBottomStyle=parts.bottomStyle??legacyGarmentStyle;
      const selectedShoesStyle=parts.shoesStyle??legacyGarmentStyle;
      if (
        (normalizedName.startsWith(`hair1_${suffix}`) && selectedHairStyle === 'hair2')
        || (normalizedName.startsWith(`hair2_${suffix}`) && selectedHairStyle === 'hair1')
      ) {
        node.visible = false;
        return;
      }
      if (
        (normalizedName.startsWith(`shirt1_2_${suffix}`)||normalizedName.startsWith(`shirt1_${suffix}`))
          ? selectedTopStyle==='style2'
          : normalizedName.startsWith(`shirt2_${suffix}`)
            ? selectedTopStyle==='style1'
            : normalizedName.startsWith(`pants1_${suffix}`)
              ? selectedBottomStyle==='style2'
              : normalizedName.startsWith(`pants2_${suffix}`)
                ? selectedBottomStyle==='style1'
                : normalizedName.startsWith(`shoes1_${suffix}`)
                  ? selectedShoesStyle==='style2'
                  : normalizedName.startsWith(`shoes2_${suffix}`)&&selectedShoesStyle==='style1'
      ) {
        node.visible = false;
        return;
      }
    }
    const partKind = node.isMesh
      ? mapping[node.name] ?? (extendedModel ? extendedPartKind(String(node.name),extendedModel) : undefined)
      : undefined;
    if (!partKind || !node.material) return;

    const selectedPart = parts[partKind]??`${partKind}-none`;
    const hidden = selectedPart.endsWith('-none');
    node.visible = !hidden;
    if (hidden) return;
    if (extendedModel && partKind !== 'face') {
      const color = selectedPart.endsWith('-original')
        ? '#ffffff'
        : getPart(partKind, selectedPart).color;
      const materials: any[] = Array.isArray(node.material) ? node.material : [node.material];
      const coloredMaterials = materials.map(material => {
        const target = material.userData?.[COLOR_MATERIAL_FLAG]
          ? material
          : cloneColorMaterial(material);
        // 의상과 머리의 원본 텍스처 색을 제거해 사용자가 고른 색이 그대로 보이게 한다.
        target.map = null;
        target.color?.set(color);
        target.needsUpdate = true;
        return target;
      });
      node.material = Array.isArray(node.material) ? coloredMaterials : coloredMaterials[0];
      return;
    }
    if (model === 'boy1' && node.name === 'tripo_part_0') {
      const color = selectedPart.endsWith('-original')
        ? '#ffffff'
        : getPart(partKind, selectedPart).color;
      const materials: any[] = Array.isArray(node.material) ? node.material : [node.material];
      const coloredMaterials = materials.map(material => {
        const target = material.userData?.[COLOR_MATERIAL_FLAG]
          ? material
          : cloneColorMaterial(material);
        // 원본 머리 텍스처의 분홍빛을 제거하고 선택한 머리 색을 직접 적용한다.
        target.map = null;
        target.color?.set(color);
        target.needsUpdate = true;
        return target;
      });
      node.material = Array.isArray(node.material) ? coloredMaterials : coloredMaterials[0];
      return;
    }
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
