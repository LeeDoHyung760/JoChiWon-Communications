import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

globalThis.self ??= globalThis;
globalThis.ProgressEvent ??= class ProgressEvent {};
globalThis.FileReader ??= class FileReader {
  result = null;
  onloadend = null;
  onerror = null;

  readAsArrayBuffer(blob) {
    blob.arrayBuffer()
      .then(result => {
        this.result = result;
        this.onloadend?.();
      })
      .catch(error => this.onerror?.(error));
  }

  readAsDataURL(blob) {
    blob.arrayBuffer()
      .then(result => {
        this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;
        this.onloadend?.();
      })
      .catch(error => this.onerror?.(error));
  }
};

const outputPath = new URL('../src/assets/maps/project-room.glb', import.meta.url);
const scene = new THREE.Scene();
scene.name = 'ProjectRoom';

const materials = {
  floor: new THREE.MeshStandardMaterial({ color: 0x484945, roughness: 0.72, metalness: 0.02 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x77736b, roughness: 0.8, metalness: 0.01 }),
  wallInset: new THREE.MeshStandardMaterial({ color: 0x575b58, roughness: 0.72, metalness: 0.02 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x242b2d, roughness: 0.48, metalness: 0.12 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x754923, roughness: 0.46, metalness: 0.04 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x102321, roughness: 0.25, metalness: 0.18 }),
  screenFrame: new THREE.MeshStandardMaterial({ color: 0x182326, roughness: 0.42, metalness: 0.2 }),
  seat: new THREE.MeshStandardMaterial({ color: 0xbda783, roughness: 0.62, metalness: 0.01 }),
  rug: new THREE.MeshStandardMaterial({ color: 0x294a42, roughness: 0.94, metalness: 0 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4f7849, roughness: 0.82, metalness: 0 }),
  leafDark: new THREE.MeshStandardMaterial({ color: 0x294f38, roughness: 0.86, metalness: 0 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xb8ad98, roughness: 0.74, metalness: 0 }),
  cyan: new THREE.MeshStandardMaterial({
    color: 0x52d6bd,
    emissive: 0x20a98f,
    emissiveIntensity: 2.15,
    roughness: 0.32,
  }),
  light: new THREE.MeshStandardMaterial({
    color: 0xffe1b7,
    emissive: 0xe9a758,
    emissiveIntensity: 1.8,
    roughness: 0.42,
  }),
};

function box(name, size, position, material, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function roundedBox(name, size, position, material, radius = 0.12, parent = scene) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 4, radius), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(name, radius, height, position, material, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function sphere(name, radius, position, material, parent = scene) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function plant(name, position, scale = 1) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  scene.add(group);
  cylinder(`${name}_Pot`, 0.32 * scale, 0.62 * scale, [0, 0.31 * scale, 0], materials.ceramic, group);
  cylinder(`${name}_Soil`, 0.25 * scale, 0.04 * scale, [0, 0.63 * scale, 0], materials.trim, group);
  for (let index = 0; index < 8; index += 1) {
    const angle = index * 2.399;
    const radius = (0.12 + (index % 3) * 0.07) * scale;
    const leaf = sphere(
      `${name}_Leaf_${index + 1}`,
      0.22 * scale,
      [Math.cos(angle) * radius, (0.86 + (index % 4) * 0.14) * scale, Math.sin(angle) * radius],
      index % 2 ? materials.leaf : materials.leafDark,
      group,
    );
    leaf.scale.set(0.55, 1.65, 0.82);
    leaf.rotation.y = angle;
    leaf.rotation.z = Math.sin(angle) * 0.32;
  }
}

function marker(name, position) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  scene.add(group);
}

// Main walkable shell: 18 m wide, 14 m deep, 4.2 m high.
box('Ground_ProjectRoom', [18, 0.2, 14], [0, -0.1, 0], materials.floor);
box('Wall_Back', [18, 4.2, 0.28], [0, 2.1, -7], materials.wall);
box('Wall_Left', [0.28, 4.2, 14], [-9, 2.1, 0], materials.wall);
box('Wall_Right', [0.28, 4.2, 14], [9, 2.1, 0], materials.wall);
box('Entry_Wall_Left', [5.4, 1.25, 0.3], [-6.3, 0.625, 7], materials.wallInset);
box('Entry_Wall_Right', [5.4, 1.25, 0.3], [6.3, 0.625, 7], materials.wallInset);
box('Entry_Threshold', [7.2, 0.06, 0.45], [0, 0.03, 6.82], materials.trim);

// Structural columns and lower wall trim.
for (const x of [-6.7, 6.7]) {
  box(`Back_Column_${x < 0 ? 'Left' : 'Right'}`, [0.48, 4.2, 0.58], [x, 2.1, -6.68], materials.trim);
}
for (const x of [-8.72, 8.72]) {
  box(`Front_Column_${x < 0 ? 'Left' : 'Right'}`, [0.48, 4.2, 0.58], [x, 2.1, 6.68], materials.trim);
}
for (const x of [-3.85, 3.85]) {
  box(`Entry_Post_${x < 0 ? 'Left' : 'Right'}`, [0.52, 1.72, 0.58], [x, 0.86, 6.66], materials.trim);
}
box('Baseboard_Back', [17.5, 0.32, 0.16], [0, 0.3, -6.8], materials.trim);
box('Baseboard_Left', [0.16, 0.32, 13.4], [-8.8, 0.3, 0], materials.trim);
box('Baseboard_Right', [0.16, 0.32, 13.4], [8.8, 0.3, 0], materials.trim);

// Presentation wall: one large project screen and warm vertical lights.
roundedBox('Project_Screen_Frame', [7.9, 2.55, 0.22], [0, 2.25, -6.72], materials.screenFrame, 0.18);
roundedBox('Project_Screen_Surface', [7.35, 2.08, 0.10], [0, 2.25, -6.86], materials.screen, 0.14);
for (const [index, x] of [-2.35, 0, 2.35].entries()) {
  roundedBox(`Project_Screen_Card_${index + 1}`, [1.82, 0.86, 0.045], [x, 2.18, -6.93], materials.wallInset, 0.09);
  box(`Project_Screen_Card_Line_${index + 1}`, [1.34, 0.055, 0.025], [x, 2.36, -6.965], materials.cyan);
}
box('Project_Screen_Title_Line', [2.7, 0.07, 0.03], [0, 3.05, -6.96], materials.cyan);
box('Project_Screen_Light_Left', [0.07, 1.18, 0.12], [-4.65, 2.28, -6.82], materials.light);
box('Project_Screen_Light_Right', [0.07, 1.18, 0.12], [4.65, 2.28, -6.82], materials.light);
for (const [index, x] of [-5.92, -5.58, -5.24, 5.24, 5.58, 5.92].entries()) {
  box(`Acoustic_Wood_Slat_${index + 1}`, [0.16, 2.9, 0.07], [x, 2.18, -6.86], materials.bronze);
}

// Left-side writing board, matching the wide framed panel in the reference.
roundedBox('Idea_Board_Frame', [0.22, 2.55, 4.6], [-8.72, 2.18, -2.15], materials.bronze, 0.16);
roundedBox('Idea_Board_Surface', [0.12, 2.18, 4.18], [-8.85, 2.18, -2.15], materials.wall, 0.13);
for (const [index, z] of [-3.48, -2.15, -0.82].entries()) {
  roundedBox(`Idea_Board_Card_${index + 1}`, [0.055, 0.92, 1.08], [-8.93, 2.08, z], materials.wallInset, 0.08);
  cylinder(`Idea_Board_Status_${index + 1}`, 0.10, 0.04, [-8.975, 2.30, z - 0.29], index===0?materials.cyan:materials.light).rotation.z = Math.PI / 2;
}
box('Idea_Board_Title_Line', [0.04, 0.08, 2.2], [-8.96, 3.12, -2.15], materials.light);

// Right-side recessed storage display and two shelves.
roundedBox('Storage_Alcove', [0.15, 3.25, 2.55], [8.78, 2.12, -2.65], materials.screenFrame, 0.2);
roundedBox('Storage_Alcove_Inner', [0.08, 2.82, 2.16], [8.69, 2.12, -2.65], materials.trim, 0.17);
box('Storage_Shelf_Upper', [0.62, 0.10, 2.05], [8.45, 2.35, -2.65], materials.bronze);
box('Storage_Shelf_Lower', [0.62, 0.10, 2.05], [8.45, 1.22, -2.65], materials.bronze);

// Freestanding touch kiosk on the right of the project screen.
const kiosk = new THREE.Group();
kiosk.name = 'Project_Touch_Kiosk';
kiosk.position.set(5.8, 0, -4.85);
scene.add(kiosk);
roundedBox('Kiosk_Base', [1.65, 0.18, 1.15], [0, 0.09, 0], materials.screenFrame, 0.12, kiosk);
roundedBox('Kiosk_Base_Light', [1.45, 0.06, 0.94], [0, 0.20, 0], materials.cyan, 0.08, kiosk);
roundedBox('Kiosk_Body', [1.38, 2.68, 0.72], [0, 1.48, 0], materials.seat, 0.18, kiosk);
roundedBox('Kiosk_Screen_Frame', [1.10, 1.78, 0.12], [0, 1.72, 0.40], materials.screenFrame, 0.13, kiosk);
roundedBox('Kiosk_Screen', [0.90, 1.55, 0.07], [0, 1.72, 0.48], materials.screen, 0.10, kiosk);
roundedBox('Kiosk_Screen_Cyan', [0.98, 1.64, 0.025], [0, 1.72, 0.525], materials.cyan, 0.11, kiosk);
roundedBox('Kiosk_Screen_Inner', [0.84, 1.48, 0.035], [0, 1.72, 0.55], materials.screen, 0.08, kiosk);
roundedBox('Kiosk_Plus_Vertical', [0.11, 0.62, 0.025], [0, 1.78, 0.585], materials.cyan, 0.04, kiosk);
roundedBox('Kiosk_Plus_Horizontal', [0.62, 0.11, 0.025], [0, 1.78, 0.59], materials.cyan, 0.04, kiosk);
roundedBox('Kiosk_Control', [0.34, 0.09, 0.12], [0, 0.68, 0.43], materials.bronze, 0.04, kiosk);

// Woven collaboration zone and six individual stools around the supplied round table.
const collaborationRug = cylinder('Collaboration_Rug', 4.72, 0.055, [0, 0.028, -0.55], materials.rug);
collaborationRug.scale.z = 0.78;
const tableBase = cylinder('Collaboration_Table_Base', 2.75, 0.62, [0, 0.31, -0.55], materials.trim);
tableBase.scale.z = 0.94;
const tableLowerRing = cylinder('Collaboration_Table_Lower_Ring', 2.98, 0.18, [0, 0.61, -0.55], materials.screenFrame);
tableLowerRing.scale.z = 0.94;
const tableTop = cylinder('Collaboration_Table_Top', 3.18, 0.24, [0, 0.82, -0.55], materials.seat);
tableTop.scale.z = 0.94;
const tableInset = cylinder('Collaboration_Table_Inset', 2.72, 0.05, [0, 0.965, -0.55], materials.wall);
tableInset.scale.z = 0.94;
const tableLightRing = new THREE.Mesh(new THREE.TorusGeometry(2.79, 0.035, 10, 64), materials.cyan);
tableLightRing.name = 'Collaboration_Table_Cyan_Ring';
tableLightRing.rotation.x = Math.PI / 2;
tableLightRing.scale.z = 0.94;
tableLightRing.position.set(0, 1.0, -0.55);
scene.add(tableLightRing);

for (const [index, angle] of [25, 88, 145, 215, 272, 335].entries()) {
  const radians = THREE.MathUtils.degToRad(angle);
  const x = Math.sin(radians) * 4.25;
  const z = Math.cos(radians) * 3.65 - 0.55;
  const stool = new THREE.Group();
  stool.name = `Collaboration_Stool_${index + 1}`;
  stool.position.set(x, 0, z);
  scene.add(stool);
  cylinder(`Stool_Base_${index + 1}`, 0.36, 0.12, [0, 0.06, 0], materials.trim, stool);
  cylinder(`Stool_Pedestal_${index + 1}`, 0.18, 0.48, [0, 0.28, 0], materials.bronze, stool);
  cylinder(`Stool_Seat_${index + 1}`, 0.48, 0.20, [0, 0.60, 0], materials.seat, stool);
}

plant('Plant_Back_Left', [-7.55, 0, -5.85], 0.9);
plant('Plant_Back_Right', [7.55, 0, -5.85], 0.9);
plant('Plant_Entry_Left', [-7.55, 0, 5.45], 0.82);
plant('Plant_Entry_Right', [7.55, 0, 5.45], 0.82);

// Wall panel seams.
for (const x of [-5.5, -2.75, 0, 2.75, 5.5]) {
  box(`Back_Panel_Seam_${x}`, [0.025, 3.15, 0.018], [x, 2.15, -6.845], materials.wallInset);
}
for (const z of [-4.5, -1.5, 1.5, 4.5]) {
  box(`Left_Panel_Seam_${z}`, [0.018, 3.15, 0.025], [-8.845, 2.15, z], materials.wallInset);
  box(`Right_Panel_Seam_${z}`, [0.018, 3.15, 0.025], [8.845, 2.15, z], materials.wallInset);
}

// Open ceiling frame and warm indirect lighting.
box('Ceiling_Trim_Back', [17.4, 0.22, 0.35], [0, 4.05, -6.68], materials.trim);
box('Ceiling_Trim_Left', [0.35, 0.22, 13.1], [-8.68, 4.05, 0], materials.trim);
box('Ceiling_Trim_Right', [0.35, 0.22, 13.1], [8.68, 4.05, 0], materials.trim);
box('Ceiling_Light_Back', [13.2, 0.06, 0.08], [0, 3.93, -6.48], materials.light);
box('Ceiling_Light_Left', [0.08, 0.06, 8.2], [-6.7, 3.93, -2.35], materials.light);
box('Ceiling_Light_Right', [0.08, 0.06, 8.2], [6.7, 3.93, -2.35], materials.light);
box('Ceiling_Front_Left', [4.2, 0.22, 1.55], [-6.9, 4.02, 5.95], materials.wallInset);
box('Ceiling_Front_Right', [4.2, 0.22, 1.55], [6.9, 4.02, 5.95], materials.wallInset);
box('Ceiling_Recess_Back', [12.8, 0.10, 0.16], [0, 3.98, -4.85], materials.light);
box('Ceiling_Recess_Left', [0.16, 0.10, 6.7], [-6.4, 3.98, -1.5], materials.light);
box('Ceiling_Recess_Right', [0.16, 0.10, 6.7], [6.4, 3.98, -1.5], materials.light);

// Vertical sconces from the reference image.
for (const [name, x, z] of [
  ['Left', -8.83, 1.7],
  ['Right', 8.83, 1.7],
]) {
  box(`Wall_Light_${name}`, [0.035, 1.1, 0.11], [x, 2.25, z], materials.light);
}
for (const x of [-3.83, 3.83]) {
  box(`Entry_Light_${x < 0 ? 'Left' : 'Right'}`, [0.12, 0.82, 0.035], [x, 0.87, 6.35], materials.light);
}

// Semantic anchors for later gameplay integration.
marker('Spawn_ProjectRoom', [0, 0, 5.2]);
marker('Exit_To_Campus', [0, 0, 6.65]);
marker('Interaction_ProjectWall', [0, 0, -6.55]);

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(scene, {
  binary: true,
  onlyVisible: true,
  truncateDrawRange: true,
});
fs.writeFileSync(outputPath, Buffer.from(result));
console.log(`Created ${outputPath.pathname}`);
