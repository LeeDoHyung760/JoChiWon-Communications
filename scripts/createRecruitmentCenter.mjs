import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

globalThis.self ??= globalThis;
globalThis.ProgressEvent ??= class ProgressEvent {};
globalThis.FileReader ??= class FileReader {
  result = null; onloadend = null; onerror = null;
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(v => { this.result = v; this.onloadend?.(); }).catch(e => this.onerror?.(e)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(v => { this.result = `data:${blob.type};base64,${Buffer.from(v).toString('base64')}`; this.onloadend?.(); }).catch(e => this.onerror?.(e)); }
};

const outputPath = new URL('../src/assets/maps/recruitment-center.glb', import.meta.url);
const scene = new THREE.Scene();
scene.name = 'RecruitmentCenter_Wide';

const material = (name, color, roughness = .65, metalness = 0, emissive = 0x000000, emissiveIntensity = 0) => {
  const value = new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
  value.name = name;
  return value;
};
const M = {
  floor: material('Natural_Oak_Floor', 0xb98b5d, .7), trim: material('Ivory_Limestone', 0xe5ddd2, .42),
  green: material('Deep_Green_Fabric', 0x20372a, .9), green2: material('Forest_Green_Shadow', 0x12241a, .72),
  wood: material('Smoked_Oak', 0x8d5f3c, .56), woodDark: material('Dark_Walnut', 0x4e3425, .52),
  top: material('Calacatta_Stone', 0xf0ebe3, .25, .02), screen: material('Screen_Dark', 0x101d18, .22, .1),
  black: material('Monitor_Black', 0x171918, .32, .12), paper: material('Brochure_Paper', 0xe8dfcb, .88),
  gold: material('Champagne_Brass', 0xc5a16b, .25, .62), pot: material('Travertine_Pot', 0xa79b87, .7),
  leaf: material('Plant_Leaf', 0x416227, .86), leaf2: material('Plant_Leaf_Dark', 0x274522, .86),
  soil: material('Potting_Soil', 0x2c2118, 1), glow: material('Warm_LED', 0xffd29b, .35, 0, 0xff9c46, 3.2),
  glass: material('Smoked_Glass', 0x78948a, .12, .08), bronze: material('Brushed_Bronze', 0x594534, .26, .52),
};

function mesh(name, geometry, mat, position = [0, 0, 0], parent = scene) {
  const value = new THREE.Mesh(geometry, mat); value.name = name; value.position.set(...position); value.receiveShadow = true; parent.add(value); return value;
}
const box = (name, size, position, mat, parent = scene) => mesh(name, new THREE.BoxGeometry(...size), mat, position, parent);
const rounded = (name, size, position, mat, radius = .12, parent = scene) => mesh(name, new RoundedBoxGeometry(...size, 4, radius), mat, position, parent);
const cyl = (name, rt, rb, h, position, mat, parent = scene, segments = 32) => mesh(name, new THREE.CylinderGeometry(rt, rb, h, segments), mat, position, parent);
const sphere = (name, radius, position, mat, parent = scene) => mesh(name, new THREE.SphereGeometry(radius, 14, 10), mat, position, parent);

function marker(name, position) { const value = new THREE.Group(); value.name = name; value.position.set(...position); scene.add(value); }
function plant(name, position, scale = 1, tall = false) {
  const group = new THREE.Group(); group.name = name; group.position.set(...position); scene.add(group);
  cyl(`${name}_Pot`, .38 * scale, .30 * scale, .66 * scale, [0, .33 * scale, 0], M.pot, group, 24);
  cyl(`${name}_Soil`, .29 * scale, .29 * scale, .035 * scale, [0, .66 * scale, 0], M.soil, group, 20);
  const count = tall ? 11 : 8;
  for (let i = 0; i < count; i++) {
    const a = i * 2.399, height = (tall ? 1.2 + (i % 4) * .25 : .48 + (i % 3) * .16) * scale;
    const stem = cyl(`${name}_Stem_${i + 1}`, .018 * scale, .024 * scale, height, [Math.cos(a) * .10 * scale, .65 * scale + height / 2, Math.sin(a) * .10 * scale], M.leaf2, group, 8);
    stem.rotation.z = Math.sin(a) * .10;
    for (const side of [-1, 1]) {
      const leaf = sphere(`${name}_Leaf_${i + 1}_${side > 0 ? 'A' : 'B'}`, .20 * scale, [Math.cos(a) * (.16 + side * .10) * scale, (.84 + height * (.45 + side * .15)) * scale, Math.sin(a) * (.16 + side * .10) * scale], i % 2 ? M.leaf : M.leaf2, group);
      leaf.scale.set(.48, 1.35, .78); leaf.rotation.y = a; leaf.rotation.z = side * .55;
    }
  }
}
function card(name, position, parent, accent = M.green) {
  // Cards face the open front (+Z). The previous Y-thin layout made them lie flat.
  rounded(`${name}_Paper`, [.68, .92, .045], position, M.paper, .035, parent);
  box(`${name}_Photo`, [.52, .25, .018], [position[0], position[1] + .20, position[2] + .032], accent, parent);
  for (let i = 0; i < 3; i++) box(`${name}_Line_${i + 1}`, [.42 - i * .06, .025, .012], [position[0], position[1] - .05 - i * .11, position[2] + .034], M.woodDark, parent);
}

// A wider 18 x 13 m elliptical platform leaves generous circulation around the counter.
const base = cyl('Ground_RecruitmentCenter', 6.5, 6.5, .16, [0, .08, 0], M.trim, scene, 96); base.scale.x = 1.40;
const brassRim = cyl('Platform_Champagne_Rim', 6.34, 6.34, .075, [0, .19, 0], M.gold, scene, 96); brassRim.scale.x = 1.40;
const floor = cyl('Walkable_Oak_Platform', 6.22, 6.22, .13, [0, .245, 0], M.floor, scene, 96); floor.scale.x = 1.40;
const inset = cyl('Platform_Stone_Inlay', 5.92, 5.92, .018, [0, .32, 0], M.trim, scene, 96); inset.scale.x = 1.40;
const innerFloor = cyl('Platform_Oak_Center', 5.78, 5.78, .022, [0, .34, 0], M.floor, scene, 96); innerFloor.scale.x = 1.40;

// Dark green presentation wall and pale architectural surround.
rounded('Backwall_Outer_Frame', [14.55, 5.46, .38], [0, 3.02, -4.35], M.trim, .74);
rounded('Backwall_Brass_Reveal', [13.92, 4.94, .24], [0, 3.01, -4.10], M.gold, .58);
rounded('Backwall_Green_Inset', [13.68, 4.70, .22], [0, 3.01, -3.94], M.green, .50);
for (const x of [-5.45, -3.64, -1.82, 0, 1.82, 3.64, 5.45]) box(`Backwall_Panel_Seam_${x}`, [.012, 4.05, .018], [x, 3.0, -3.815], M.gold);

// Rounded warm-light arch following the reference booth silhouette.
const archPoints = [new THREE.Vector3(-6.18, .82, -3.76), new THREE.Vector3(-6.18, 4.42, -3.76), new THREE.Vector3(-5.68, 4.88, -3.76), new THREE.Vector3(5.68, 4.88, -3.76), new THREE.Vector3(6.18, 4.42, -3.76), new THREE.Vector3(6.18, .82, -3.76)];
const archCurve = new THREE.CatmullRomCurve3(archPoints, false, 'centripetal');
mesh('Backwall_Warm_LED_Arch', new THREE.TubeGeometry(archCurve, 128, .032, 10, false), M.glow);
for (const x of [-4.7, -2.35, 0, 2.35, 4.7]) {
  const spot = cyl(`Downlight_${x}`, .10, .13, .13, [x, 4.72, -3.70], M.gold, scene, 12); spot.rotation.x = Math.PI / 2;
  sphere(`Downlight_Glow_${x}`, .08, [x, 4.55, -3.66], M.glow).scale.set(1, .4, 1);
}

// Geometric wall logo and readable semantic sign bars (font-independent GLB).
for (const [i, x] of [-.30, .30].entries()) sphere(`Recruitment_Logo_Head_${i + 1}`, .13, [x, 3.94, -3.69], M.gold);
for (const [i, x] of [-.34, .34].entries()) rounded(`Recruitment_Logo_Person_${i + 1}`, [.32, .38, .055], [x, 3.57, -3.67], M.gold, .10);
rounded('Recruitment_Logo_Center', [.30, .50, .055], [0, 3.52, -3.66], M.gold, .11);

// Curved reception desk, deliberately moved forward to preserve 2 m+ side aisles.
const desk = new THREE.Group(); desk.name = 'Recruitment_Reception_Desk'; desk.position.set(-.65, 0, .15); scene.add(desk);
rounded('Desk_Body', [7.0, 1.20, 1.92], [0, 1.02, 0], M.woodDark, .56, desk);
rounded('Desk_Front_Inset', [6.66, .88, .065], [0, 1.00, .973], M.wood, .37, desk);
rounded('Desk_Stone_Top', [7.34, .135, 2.19], [0, 1.69, -.03], M.top, .60, desk);
box('Desk_Brass_Shadow_Line', [6.55, .038, .055], [0, 1.48, 1.035], M.gold, desk);
box('Desk_Brass_Toe_Kick', [5.95, .085, .075], [0, .445, .98], M.gold, desk);
for (let x = -3.02, i = 1; x <= 3.02; x += .13, i++) box(`Desk_Fine_Flute_${i}`, [.027, .74, .035], [x, .96, 1.022], i % 4 === 0 ? M.gold : M.woodDark, desk);
box('Desk_Logo_Main', [1.65, .16, .045], [0, 1.09, 1.145], M.green2, desk);
box('Desk_Logo_Sub', [1.10, .055, .045], [0, .82, 1.145], M.green2, desk);

// Monitor, stand, and two framed counter notices.
rounded('Monitor_Screen', [1.75, 1.02, .12], [-.70, 2.30, -.04], M.black, .07, desk);
box('Monitor_Display', [1.57, .83, .025], [-.70, 2.30, .035], M.screen, desk);
box('Monitor_Stem', [.16, .48, .16], [-.70, 1.90, -.05], M.black, desk);
rounded('Monitor_Base', [.82, .10, .46], [-.70, 1.81, -.04], M.black, .05, desk);
for (const [i, x] of [[1, 1.25], [2, 2.25]]) {
  const sign = new THREE.Group(); sign.name = `Counter_Notice_${i}`; sign.position.set(x, 1.92, .48); sign.rotation.x = -.12; desk.add(sign);
  rounded(`Counter_Notice_Frame_${i}`, [.70, .055, .92], [0, 0, 0], M.woodDark, .04, sign); rounded(`Counter_Notice_Paper_${i}`, [.57, .025, .77], [0, -.036, 0], M.paper, .025, sign);
  for (let l = 0; l < 4; l++) box(`Counter_Notice_Line_${i}_${l}`, [.40 - l * .045, .012, .025], [0, -.055, .20 - l * .13], l === 0 ? M.green : M.woodDark, sign);
}

// Brochure ladder rack at the back right.
const rack = new THREE.Group(); rack.name = 'Recruitment_Brochure_Rack'; rack.position.set(5.0, .39, -2.82); scene.add(rack);
for (const x of [-.69, .69]) { const post = box(`Rack_Brass_Post_${x}`, [.075, 3.44, .075], [x, 1.72, 0], M.gold, rack); post.rotation.z = x < 0 ? -.035 : .035; }
for (let row = 0; row < 4; row++) {
  const z = 1.04 - row * .02;
  rounded(`Rack_Floating_Shelf_${row + 1}`, [1.42, .075, .42], [0, .58 + row * .76, z], M.woodDark, .035, rack);
  box(`Rack_Shelf_Brass_Edge_${row + 1}`, [1.36, .035, .025], [0, .64 + row * .76, z + .22], M.gold, rack);
  card(`Rack_Card_${row + 1}`, [0, .84 + row * .76, z - .15], rack, row % 2 ? M.gold : M.green);
}
rounded('Rack_Stone_Base', [1.72, .13, .78], [0, .065, .22], M.trim, .10, rack);

// Small brass-and-glass side consoles make the booth feel furnished rather than staged.
for (const [side, x] of [['Left', -4.85], ['Right', 3.75]]) {
  const consoleGroup = new THREE.Group(); consoleGroup.name = `Luxury_Side_Console_${side}`; consoleGroup.position.set(x, .34, -2.55); scene.add(consoleGroup);
  for (const legX of [-.58, .58]) box(`Console_${side}_Leg_${legX}`, [.055, .82, .055], [legX, .41, 0], M.gold, consoleGroup);
  rounded(`Console_${side}_Glass_Top`, [1.38, .065, .46], [0, .86, 0], M.glass, .04, consoleGroup);
  rounded(`Console_${side}_Lower_Stone`, [1.24, .055, .38], [0, .18, 0], M.trim, .035, consoleGroup);
}

// Freestanding information kiosk at far right, outside the main approach lane.
const kiosk = new THREE.Group(); kiosk.name = 'Recruitment_Info_Kiosk'; kiosk.position.set(7.05, .38, .45); kiosk.rotation.y = -.12; scene.add(kiosk);
rounded('Kiosk_Base', [1.92, .14, 1.04], [0, .07, 0], M.bronze, .16, kiosk);
rounded('Kiosk_Floating_Plinth', [1.55, .10, .78], [0, .20, 0], M.gold, .12, kiosk);
rounded('Kiosk_Body', [1.58, 3.12, .38], [0, 1.84, 0], M.bronze, .25, kiosk);
rounded('Kiosk_Screen_Frame', [1.39, 2.72, .065], [0, 1.98, .22], M.gold, .17, kiosk);
rounded('Kiosk_Screen', [1.25, 2.56, .035], [0, 1.98, .275], M.screen, .14, kiosk);

plant('Plant_Tall_Left', [-6.45, .38, -2.85], 1.10, true);
plant('Plant_Desk_Left', [-3.55, 1.83, -.05], .66, false);

// Gameplay anchors and a broad unobstructed spawn/interaction lane.
marker('Spawn_RecruitmentCenter', [0, .40, 5.35]);
marker('Exit_To_Campus', [0, .40, 6.05]);
marker('Interaction_RecruitmentDesk', [-.65, .40, 2.25]);
marker('Interaction_RecruitmentKiosk', [6.00, .40, 1.05]);
marker('Walkable_Area_18x13m', [0, .40, 0]);

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(scene, { binary: true, onlyVisible: true, truncateDrawRange: true });
fs.writeFileSync(outputPath, Buffer.from(result));
console.log(`Created ${outputPath.pathname} (${Buffer.byteLength(result)} bytes)`);
