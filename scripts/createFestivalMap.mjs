import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.self ??= globalThis;
globalThis.ProgressEvent ??= class ProgressEvent {};
globalThis.FileReader ??= class FileReader {
  result = null; onloadend = null; onerror = null;
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(v => { this.result = v; this.onloadend?.(); }).catch(e => this.onerror?.(e)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(v => { this.result = `data:${blob.type};base64,${Buffer.from(v).toString('base64')}`; this.onloadend?.(); }).catch(e => this.onerror?.(e)); }
};

const outputPath = new URL('../src/assets/maps/festival-experience-map.glb', import.meta.url);
const scene = new THREE.Scene(); scene.name = 'SejongFestivalExperienceMap';
const mat = (color, roughness=.8, emissive=0, emissiveIntensity=0) => new THREE.MeshStandardMaterial({ color, roughness, metalness:.02, emissive, emissiveIntensity });
const M = {
  grass:mat(0x71964c), grass2:mat(0x8bac5b), soil:mat(0x806b45), path:mat(0xc9b88f), path2:mat(0xd8c9a3),
  water:mat(0x4f9db5,.35), wood:mat(0x795333), wood2:mat(0xaa7446), trunk:mat(0x5a4028), leaf:mat(0x4c7f37), leaf2:mat(0x6a963d),
  dark:mat(0x24262a,.45), metal:mat(0x53545c,.34), purple:mat(0x51265f,.42,0x4b1763,.6), glow:mat(0xf7c95d,.3,0xffa92e,3),
  portal:mat(0x77bfff,.22,0x278cff,4), blue:mat(0x4b8eb9), white:mat(0xf1eadb), red:mat(0xb84f43), canvas:mat(0xe8dcc4), stone:mat(0x77776c),
  peach:mat(0xd58d6b), yellow:mat(0xd5b34d), lavender:mat(0x777ab3), black:mat(0x17191d),
  flowerPink:mat(0xe58e9f), flowerWhite:mat(0xf3e8d5), leafDark:mat(0x315f32), bronze:mat(0x9b682d,.45), screen:mat(0x201026,.28,0x7e2695,1.8)
};
function mesh(name, geo, material, pos=[0,0,0], parent=scene) { const o=new THREE.Mesh(geo,material); o.name=name; o.position.set(...pos); parent.add(o); return o; }
const box=(n,s,p,m,par=scene)=>mesh(n,new THREE.BoxGeometry(...s),m,p,par);
const cyl=(n,r,h,p,m,par=scene,seg=12)=>mesh(n,new THREE.CylinderGeometry(r,r,h,seg),m,p,par);
const sphere=(n,r,p,m,par=scene)=>mesh(n,new THREE.IcosahedronGeometry(r,2),m,p,par);
function lineCylinder(name,a,b,r,material,parent=scene){ const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),mid=va.clone().add(vb).multiplyScalar(.5); const o=cyl(name,r,va.distanceTo(vb),mid.toArray(),material,parent,8); o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.clone().sub(va).normalize()); return o; }
function roundedShape(w,d,r){ const s=new THREE.Shape(); s.moveTo(-w/2+r,-d/2); s.lineTo(w/2-r,-d/2); s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r); s.lineTo(w/2,d/2-r); s.quadraticCurveTo(w/2,d/2,w/2-r,d/2); s.lineTo(-w/2+r,d/2); s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r); s.lineTo(-w/2,-d/2+r); s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2); return s; }
function slab(name,w,d,h,y,material,r=2){ const g=new THREE.ExtrudeGeometry(roundedShape(w,d,r),{depth:h,bevelEnabled:true,bevelSize:.18,bevelThickness:.12,bevelSegments:2}); g.rotateX(Math.PI/2); const o=mesh(name,g,material,[0,y,0]); return o; }

// Island, perimeter promenade and the river edge seen behind the stage.
slab('Island_Base',30,34,1,-.65,M.soil,4); slab('Promenade',28.7,32.7,.35,-.12,M.path,3.5); slab('Festival_Lawn',24.6,28.5,.42,.06,M.grass,3.2);
box('River',[31,.28,8],[0,.02,-18.2],M.water); box('River_Bank',[30,.35,.8],[0,.18,-14.55],M.path2);
// Fine paving joints make the outer path readable from the isometric camera.
for(let z=-12.5;z<=12.5;z+=2.5){ for(const x of [-13.25,13.25]) box(`PavingJoint_X_${x}_${z}`,[1.8,.025,.045],[x,.46,z],M.soil); }
for(let x=-13;x<=13;x+=2.6){ cyl(`RailPost_${x}`,.08,.9,[x,.75,-14.1],M.wood); }
for(const z of [-14.25,-13.95]) lineCylinder(`Rail_${z}`,[-13,.72,z],[13,.72,z],.07,M.wood);

function tree(name,x,z,s=1){ const g=new THREE.Group();g.name=name;g.position.set(x,.25,z);scene.add(g);cyl(`${name}_Trunk`,.22*s,2.2*s,[0,1.1*s,0],M.trunk,g,9); sphere(`${name}_CrownA`,1.05*s,[0,2.45*s,0],M.leaf,g); sphere(`${name}_CrownB`,.82*s,[-.55*s,2.05*s,.1*s],M.leaf2,g); sphere(`${name}_CrownC`,.78*s,[.55*s,2.12*s,-.12*s],M.leaf,g); }
[[ -11,-11,1.1],[-8,-13,.9],[-4,-13.2,1],[5,-13,1],[10,-11,1.15],[11,-6,1],[-11,-6,1.05],[-12,1,.9],[12,1,1],[11,8,1.1],[-11,8,1],[-9,12,1.05],[-5,13,.9],[6,13,1],[10,12,1.1]].forEach((v,i)=>tree(`Tree_${i}`,...v));

// Main concert stage with roof, trusses, speakers, steps and purple lighting.
const stage=new THREE.Group();stage.name='Main_Stage';stage.position.set(0,.3,-8.7);scene.add(stage);
box('StageDeck',[11,.75,5],[0,.38,0],M.dark,stage); box('StageBack',[10,4,.35],[0,2.45,-2.1],M.purple,stage); box('StageRoof',[11.5,.45,5.2],[0,5.0,0],M.dark,stage);
for(const x of [-5.25,5.25]){ for(const z of [-2.1,2.1]){ cyl(`Truss_${x}_${z}`,.12,4.5,[x,2.6,z],M.metal,stage,8); } box(`Speaker_${x}`,[1.1,2.4,1],[x*1.12,1.9,.1],M.black,stage); }
for(let i=0;i<3;i++) box(`StageStep_${i}`,[4.8-i*.6,.25,.65],[0,.12+i*.23,2.85+i*.22],M.dark,stage);
for(const x of [-3,-1,1,3]) sphere(`StageLight_${x}`,.16,[x,4.6,1.9],M.glow,stage);
// Stage fascia, LED screen, truss braces, monitors, microphones and a compact drum kit.
box('Stage_Header',[7.4,.72,.18],[0,4.15,-1.86],M.purple,stage);box('Stage_LED',[6.8,2.5,.08],[0,2.45,-1.88],M.screen,stage);
for(const x of [-4.7,-4.25,4.25,4.7]) for(let y=.7;y<4.7;y+=.8) lineCylinder(`TrussBrace_${x}_${y}`,[x,y,-2.0],[x+(x<0?.4:-.4),y+.7,-2.0],.045,M.metal,stage);
for(const x of [-3.5,-1.2,1.2,3.5]){ const monitor=box(`FloorMonitor_${x}`,[1,.65,.7],[x,.9,1.65],M.black,stage);monitor.rotation.x=-.22; }
for(const x of [-2.6,0,2.6]){ cyl(`MicStand_${x}`,.035,1.65,[x,1.55,.35],M.metal,stage,8);sphere(`Microphone_${x}`,.09,[x,2.38,.35],M.black,stage); }
cyl('DrumKick',.58,.55,[0,1.35,-.55],M.black,stage,20).rotation.z=Math.PI/2;cyl('DrumSnare',.38,.4,[-.8,1.55,-.65],M.metal,stage,16);
for(const x of [-1.2,1.2]){cyl(`CymbalStand_${x}`,.025,1.4,[x,1.65,-.8],M.metal,stage,8);cyl(`Cymbal_${x}`,.48,.035,[x,2.35,-.8],M.bronze,stage,20);}

function tent(name,x,z,color){ const g=new THREE.Group();g.name=name;g.position.set(x,.3,z);scene.add(g);box(`${name}_Platform`,[4.6,.35,3.8],[0,.18,0],M.wood2,g); for(const px of [-1.9,1.9])for(const pz of [-1.5,1.5])cyl(`${name}_Post_${px}_${pz}`,.09,2.6,[px,1.45,pz],M.wood,g,8); const roof=mesh(`${name}_Roof`,new THREE.ConeGeometry(3.25,2,4),color,[0,3.15,0],g);roof.rotation.y=Math.PI/4; box(`${name}_RoofStripeFront`,[1.05,.06,4.25],[0,3.18,0],M.white,g).rotation.x=-.47; box(`${name}_Counter`,[3.5,.8,.65],[0,.65,1.15],M.canvas,g);box(`${name}_BackShelf`,[3.25,.15,.65],[0,1.4,-1.2],M.wood2,g);for(let i=-2;i<=2;i++){cyl(`${name}_Display_${i}`,.16,.42,[i*.55,1.68,-1.2],i%2?M.yellow:color,g,12);sphere(`${name}_DisplayTop_${i}`,.17,[i*.55,1.93,-1.2],M.white,g);} }
tent('Blue_Experience_Tent',-8.3,4.1,M.blue); tent('Red_Experience_Tent',8.3,4.1,M.red);
function table(name,x,z,rot=0){ const g=new THREE.Group();g.name=name;g.position.set(x,.3,z);g.rotation.y=rot;scene.add(g);box(`${name}_Top`,[3,.22,1],[0,1.25,0],M.wood2,g);for(const px of [-1,1])cyl(`${name}_Leg_${px}`,.12,1.2,[px,.65,0],M.wood,g,8);for(const pz of [-1.05,1.05])box(`${name}_Bench_${pz}`,[3,.18,.45],[0,.75,pz],M.wood2,g); }
table('PicnicTable_A',5.2,5.5,-.3);table('PicnicTable_B',-6.5,9,.55);table('PicnicTable_C',4.7,10,.25);
// Tabletop festival props: cups, plates and small flower jars.
for(const [n,x,z] of [['A',5.2,5.5],['B',-6.5,9],['C',4.7,10]]){cyl(`Cup_${n}`,.11,.32,[x,.3+1.52,z],M.white,scene,12);cyl(`Plate_${n}`,.35,.035,[x+.55,.3+1.39,z],M.yellow,scene,20);cyl(`Vase_${n}`,.1,.34,[x-.55,.3+1.54,z],M.blue,scene,12);sphere(`TableFlower_${n}`,.16,[x-.55,.3+1.82,z],M.flowerPink);}
function cushions(name,x,z,material){ for(let i=0;i<4;i++){ const o=sphere(`${name}_${i}`,.56,[x+Math.cos(i*Math.PI/2)*.55,.58,z+Math.sin(i*Math.PI/2)*.55],material);o.scale.y=.62; } }
cushions('Peach_Cushions',-3.8,-2.4,M.peach);cushions('Lavender_Cushions',3,-1.2,M.lavender);cushions('Yellow_Cushions',-3.2,4.5,M.yellow);cushions('Mixed_Cushions',2.4,5.8,M.peach);
function flowerBed(name,x,z,s=1){ const g=new THREE.Group();g.name=name;g.position.set(x,.35,z);scene.add(g);for(let i=0;i<7;i++){const a=i*2.4,r=.35+(i%3)*.16;sphere(`${name}_Leaf_${i}`,.3*s,[Math.cos(a)*r,.25,Math.sin(a)*r],M.leafDark,g);sphere(`${name}_Bloom_${i}`,.13*s,[Math.cos(a)*r,.52,Math.sin(a)*r],i%2?M.flowerPink:M.flowerWhite,g);} }
flowerBed('FlowerBed_Left',-9.2,7.7,1.2);flowerBed('FlowerBed_Right',9.2,7.7,1.2);flowerBed('FlowerBed_EntranceLeft',-3.3,12.1,1);flowerBed('FlowerBed_EntranceRight',3.3,12.1,1);

// Lamp posts and warm festoon-light loops.
const lampPoints=[[-8,-5],[-5,-1],[-7,4],[-5,8],[0,9],[5,8],[7,4],[5,-1],[8,-5]];
for(let i=0;i<lampPoints.length;i++){ const [x,z]=lampPoints[i];cyl(`LampPost_${i}`,.1,3.4,[x,1.9,z],M.dark,scene,10);sphere(`LampGlow_${i}`,.2,[x,3.6,z],M.glow); }
for(let i=0;i<lampPoints.length-1;i++){ const a=[lampPoints[i][0],3.25,lampPoints[i][1]],b=[lampPoints[i+1][0],3.25,lampPoints[i+1][1]];lineCylinder(`LightCable_${i}`,a,b,.025,M.dark);for(let j=1;j<=3;j++){const t=j/4;sphere(`Festoon_${i}_${j}`,.11,[THREE.MathUtils.lerp(a[0],b[0],t),3.12,THREE.MathUtils.lerp(a[2],b[2],t)],M.glow);}}
// Curved inner lawn edging represented by small stone markers.
for(let i=0;i<28;i++){const a=i/28*Math.PI*2,x=Math.cos(a)*10.8,z=Math.sin(a)*12.3+1; const s=cyl(`LawnEdge_${i}`,.22,.18,[x,.49,z],M.stone,scene,10);s.scale.z=.7;}

// Entrance marker and central signpost.
cyl('PortalCore',1.05,.08,[0,.2,14.2],M.portal,scene,40);box('FestivalBanner',[1,.16,3.3],[6.6,1.8,9.7],M.blue);cyl('FestivalBannerPole',.11,4,[6.6,2.1,9.7],M.dark);
// Direction board, map kiosk, litter bins and rope bollards add human-scale detail.
cyl('MapKioskPole',.1,1.8,[-6.5,1.25,11.2],M.dark);box('MapKiosk',[1.8,1.2,.16],[-6.5,2.15,11.2],M.canvas);box('MapKioskInset',[1.45,.85,.04],[-6.5,2.15,11.1],M.blue);
for(const [i,x,z] of [[0,-10,4],[1,10,4],[2,-2,11.8]]){cyl(`Bin_${i}`,.32,.85,[x,.78,z],M.dark,scene,16);cyl(`BinRim_${i}`,.36,.08,[x,1.21,z],M.metal,scene,16);}
for(const x of [-2.4,2.4]){cyl(`EntryBollard_${x}`,.13,.75,[x,.78,12.7],M.wood,scene,10);}lineCylinder('EntryRope',[-2.4,1.08,12.7],[2.4,1.08,12.7],.045,M.red);
for(const [n,p] of [['Spawn_Festival',[0,.3,14.2]],['Interaction_MainStage',[0,.3,-5.3]],['Interaction_BlueTent',[-8.3,.3,6]],['Interaction_RedTent',[8.3,.3,6]]]){const o=new THREE.Object3D();o.name=n;o.position.set(...p);scene.add(o);}

const exporter=new GLTFExporter();
const result=await exporter.parseAsync(scene,{binary:true,onlyVisible:true,truncateDrawRange:true});
fs.writeFileSync(outputPath,Buffer.from(result));
console.log(`Created ${outputPath.pathname} (${Buffer.byteLength(result)} bytes)`);
