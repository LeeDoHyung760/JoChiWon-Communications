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
    blob.arrayBuffer().then(result => {
      this.result = result;
      this.onloadend?.();
    }).catch(error => this.onerror?.(error));
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(result => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;
      this.onloadend?.();
    }).catch(error => this.onerror?.(error));
  }
};

const outputPath = new URL('../src/assets/maps/project-lobby.glb', import.meta.url);
const scene = new THREE.Scene();
scene.name = 'ProjectLobby';

const material = {
  floor: new THREE.MeshStandardMaterial({color:0x535451,roughness:.64,metalness:.04}),
  floorInset: new THREE.MeshStandardMaterial({color:0x343b3b,roughness:.8}),
  wall: new THREE.MeshStandardMaterial({color:0x817b72,roughness:.78}),
  wallDark: new THREE.MeshStandardMaterial({color:0x3d4241,roughness:.68}),
  walnut: new THREE.MeshStandardMaterial({color:0x49311f,roughness:.58}),
  black: new THREE.MeshStandardMaterial({color:0x151c1e,roughness:.42,metalness:.14}),
  screen: new THREE.MeshStandardMaterial({color:0x071c25,roughness:.24,metalness:.18}),
  cream: new THREE.MeshStandardMaterial({color:0xd3c8b3,roughness:.7}),
  sage: new THREE.MeshStandardMaterial({color:0x789073,roughness:.76}),
  rug: new THREE.MeshStandardMaterial({color:0x28443b,roughness:.96}),
  leaf: new THREE.MeshStandardMaterial({color:0x426b3c,roughness:.84}),
  leafLight: new THREE.MeshStandardMaterial({color:0x668653,roughness:.84}),
  soil: new THREE.MeshStandardMaterial({color:0x281c15,roughness:1}),
  warm: new THREE.MeshStandardMaterial({color:0xffe2ba,emissive:0xd6944e,emissiveIntensity:2.2,roughness:.35}),
  cyan: new THREE.MeshStandardMaterial({color:0x75dff1,emissive:0x2ba6c3,emissiveIntensity:2.4,roughness:.28}),
  violet: new THREE.MeshStandardMaterial({color:0xa985ff,emissive:0x6638d7,emissiveIntensity:2.7,roughness:.26}),
  green: new THREE.MeshStandardMaterial({color:0x70d39b,emissive:0x278b58,emissiveIntensity:1.4,roughness:.38}),
  glass: new THREE.MeshStandardMaterial({color:0xbfeeff,transparent:true,opacity:.28,roughness:.12,metalness:.16}),
};

function box(name,size,position,mat,parent=scene){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);
  mesh.name=name;mesh.position.set(...position);mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function rounded(name,size,position,mat,radius=.12,parent=scene){
  const mesh=new THREE.Mesh(new RoundedBoxGeometry(...size,4,radius),mat);
  mesh.name=name;mesh.position.set(...position);mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylinder(name,radius,height,position,mat,parent=scene,segments=28){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,segments),mat);
  mesh.name=name;mesh.position.set(...position);mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function sphere(name,radius,position,mat,parent=scene){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,18,12),mat);
  mesh.name=name;mesh.position.set(...position);parent.add(mesh);return mesh;
}
function marker(name,position){const root=new THREE.Group();root.name=name;root.position.set(...position);scene.add(root)}

// This module begins exactly at the untouched project-room entrance (z=7).
// It extends outward to z=20, so the two GLBs meet without overlapping rooms.
box('Lobby_Ground',[18,.2,13],[0,-.1,13.5],material.floor);
box('Lobby_LeftWall',[.28,4.4,13],[-9,2.2,13.5],material.wall);
box('Lobby_BackWall',[18,4.4,.28],[0,2.2,7],material.wallDark);
box('Lobby_RightWall_Back',[.28,4.4,3],[9,2.2,8.5],material.wall);
box('Lobby_RightWall_Front',[.28,4.4,3],[9,2.2,18.5],material.wall);
// Keep the camera-facing wall low so the isometric game camera can see into the lobby.
box('Lobby_FrontWall_Left',[5.7,1.25,.3],[-6.15,.625,20],material.wallDark);
box('Lobby_FrontWall_Right',[5.7,1.25,.3],[6.15,.625,20],material.wallDark);
box('Lobby_EntryThreshold',[6.5,.06,.7],[0,.03,19.65],material.black);

box('Lobby_Rug',[8.2,.035,6.6],[-2.65,.02,13.15],material.rug);

// The project room is now on the lobby's right. Its original GLB opening is
// rotated to meet this doorway, so visitors turn right instead of walking straight.
rounded('Lobby_ProjectDoor_Right_BackPost',[.46,3.5,.38],[9.02,1.75,10.12],material.cream,.12);
rounded('Lobby_ProjectDoor_Right_FrontPost',[.46,3.5,.38],[9.02,1.75,16.88],material.cream,.12);
rounded('Lobby_ProjectDoor_Right_Header',[.46,.38,7.14],[9.02,3.3,13.5],material.cream,.12);
rounded('Lobby_ProjectDoor_Right_Glow_Back',[.5,3.05,.07],[8.76,1.65,10.38],material.violet,.03);
rounded('Lobby_ProjectDoor_Right_Glow_Front',[.5,3.05,.07],[8.76,1.65,16.62],material.violet,.03);
rounded('Lobby_ProjectDoor_Right_Glow_Top',[.5,.07,6.2],[8.76,3.05,13.5],material.violet,.03);
box('Lobby_ProjectDoor_Right_Threshold',[.72,.055,6.25],[9.0,.028,13.5],material.black);
// Keep the project-room sliding doors closed, with both leaves meeting at the
// center of the doorway and their handles aligned along the center seam.
rounded('Lobby_ProjectDoor_Glass_Back',[.08,2.72,3.04],[8.82,1.48,11.94],material.glass,.04);
rounded('Lobby_ProjectDoor_Glass_Front',[.08,2.72,3.04],[8.82,1.48,15.06],material.glass,.04);
rounded('Lobby_ProjectDoor_Handle_Back',[.11,.58,.07],[8.70,1.48,13.30],material.warm,.03);
rounded('Lobby_ProjectDoor_Handle_Front',[.11,.58,.07],[8.70,1.48,13.70],material.warm,.03);

// A short open-top connector makes the side-by-side layout unmistakable.
// The project-room GLB begins at x=13 after its runtime transform.
box('Lobby_ProjectConnector_Floor',[4.2,.2,7],[11.05,-.1,13.5],material.floor);
box('Lobby_ProjectConnector_BackWall',[4.2,3.45,.24],[11.05,1.725,10.0],material.wallDark);
box('Lobby_ProjectConnector_FrontWall',[4.2,3.45,.24],[11.05,1.725,17.0],material.wallDark);
box('Lobby_ProjectConnector_Base_Back',[4.0,.28,.12],[11.05,.22,10.16],material.black);
box('Lobby_ProjectConnector_Base_Front',[4.0,.28,.12],[11.05,.22,16.84],material.black);
rounded('Lobby_ProjectConnector_Path_1',[1.15,.035,.07],[10.0,.02,13.5],material.violet,.025);
rounded('Lobby_ProjectConnector_Path_2',[1.15,.035,.07],[11.45,.02,13.5],material.violet,.025);
rounded('Lobby_ProjectConnector_Path_3',[1.15,.035,.07],[12.75,.02,13.5],material.cyan,.025);

// Large AI project board on the left wall.
rounded('Lobby_AI_Board_Frame',[.28,3.5,5.25],[-8.73,2.18,16.55],material.black,.18);
rounded('Lobby_AI_Board_Surface',[.12,3.18,4.9],[-8.91,2.18,16.55],material.screen,.14);
box('Lobby_AI_Board_Title',[.035,.08,2.55],[-8.99,3.35,16.2],material.cyan);
for(const [index,z] of [15.25,16.55,17.85].entries()){
  rounded(`Lobby_AI_Project_Card_${index+1}`,[.045,.86,1.05],[-9.0,2.12,z],material.wallDark,.08);
  rounded(`Lobby_AI_Project_Image_${index+1}`,[.025,.58,.44],[-9.035,2.12,z-.22],index===0?material.sage:index===1?material.violet:material.warm,.05);
  box(`Lobby_AI_Project_Title_${index+1}`,[.02,.06,.42],[-9.05,2.27,z+.20],material.cream);
  box(`Lobby_AI_Project_Score_${index+1}`,[.02,.055,.34],[-9.05,1.96,z+.22],material.green);
}

// Circular lounge seating and its indoor tree.
const lounge=new THREE.Group();lounge.name='Lobby_Lounge_Seating';lounge.position.set(-2.8,0,13.05);scene.add(lounge);
cylinder('Lobby_Tree_Planter',1.18,.64,[0,.32,0],material.cream,lounge);
cylinder('Lobby_Tree_Soil',.98,.05,[0,.66,0],material.soil,lounge);
cylinder('Lobby_Tree_Trunk',.21,2.3,[0,1.62,0],material.walnut,lounge,18);
for(let i=0;i<22;i+=1){
  const angle=i*2.399,ring=.35+(i%5)*.15;
  const leaf=sphere(`Lobby_Tree_Leaf_${i+1}`,.4,[Math.cos(angle)*ring,2.48+(i%4)*.18,Math.sin(angle)*ring],i%2?material.leaf:material.leafLight,lounge);
  leaf.scale.set(1.25,.8,1.05);
}
// Leave a broad opening on the entrance side of the lounge so an avatar can
// walk through the seating ring and reach the tree planter.
for(let i=0;i<8;i+=1){
  if(i===0||i===1)continue;
  const angle=i*Math.PI/4,x=Math.sin(angle)*2.15,z=Math.cos(angle)*2.15;
  const seat=rounded(`Lobby_Sofa_${i+1}`,[1,.54,.76],[x,.36,z],i%2?material.cream:material.sage,.18,lounge);
  seat.rotation.y=angle;
  const cushion=rounded(`Lobby_Sofa_Cushion_${i+1}`,[.86,.13,.62],[x,.70,z],i%2?material.cream:material.sage,.11,lounge);
  cushion.rotation.y=angle;
}

// Freestanding new-project kiosk, inspired by the supplied lobby reference.
// It sits against the back wall and faces into the lobby (the reverse of its
// previous orientation beside the lounge).
function createLobbyKiosk(name,x,suffix=''){
  const kiosk=new THREE.Group();kiosk.name=name;kiosk.position.set(x,0,7.82);scene.add(kiosk);
  kiosk.rotation.y=0;
  kiosk.scale.setScalar(1.15);
  rounded(`Lobby_Kiosk_Base${suffix}`,[2,.2,1.2],[0,.1,0],material.cream,.16,kiosk);
  rounded(`Lobby_Kiosk_Base_Glow${suffix}`,[1.72,.06,.96],[0,.23,0],material.violet,.08,kiosk);
  rounded(`Lobby_Kiosk_Body${suffix}`,[1.55,2.95,.76],[0,1.62,0],material.cream,.2,kiosk);
  rounded(`Lobby_Kiosk_Frame${suffix}`,[1.25,2.42,.12],[0,1.72,.44],material.black,.14,kiosk);
  rounded(`Lobby_Kiosk_Screen${suffix}`,[1.04,2.18,.06],[0,1.72,.52],material.screen,.1,kiosk);
}
createLobbyKiosk('Lobby_NewProject_Kiosk',3.45);
createLobbyKiosk('Lobby_NewProject_Kiosk_2',6.1,'_2');

// Planting shelves stay on the back wall, clear of the project-room doorway.
for(const [index,x] of [-6.6,-4.7,-2.8,-.9].entries()){
  box(`Lobby_Plant_Shelf_${index+1}`,[1.35,.1,.45],[x,1.15+(index%2)*1.08,7.35],material.walnut);
  cylinder(`Lobby_Plant_Pot_${index+1}`,.18,.34,[x,1.37+(index%2)*1.08,7.35],material.cream);
  for(let j=0;j<4;j+=1){
    const leaf=sphere(`Lobby_Shelf_Leaf_${index+1}_${j+1}`,.18,[x+(j-1.5)*.09,1.68+(index%2)*1.08+(j%2)*.12,7.35],j%2?material.leaf:material.leafLight);
    leaf.scale.set(.65,1.4,.7);
  }
}

marker('Spawn_ProjectLobby',[0,0,17.2]);
marker('Lobby_Entrance_From_Campus',[0,0,19.55]);
marker('Lobby_Entrance_To_ProjectRoom',[8.7,0,13.5]);

const exporter=new GLTFExporter();
const result=await exporter.parseAsync(scene,{binary:true,onlyVisible:true,truncateDrawRange:true});
fs.writeFileSync(outputPath,Buffer.from(result));
console.log(`Created ${outputPath.pathname}`);
