import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.self ??= globalThis;
globalThis.ProgressEvent ??= class ProgressEvent {};
globalThis.FileReader ??= class FileReader {
  result=null; onloadend=null; onerror=null;
  readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();}).catch(e=>this.onerror?.(e));}
  readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();}).catch(e=>this.onerror?.(e));}
};

const output=new URL('../src/assets/maps/club-street-festival-map.glb',import.meta.url);
const scene=new THREE.Scene(); scene.name='ClubStreetFestivalMap';
const material=(name,color,{roughness=.82,metalness=.02,emissive=0,emissiveIntensity=0}={})=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness,emissive,emissiveIntensity});m.name=name;return m;};
const M={
  pavement:material('Warm gray stone',0xaaa79e), joint:material('Paving joints',0x77766f), curb:material('Light curb',0xd2cec0),
  grass:material('Festival lawn',0x496f32), grass2:material('Garden grass',0x638a3f), soil:material('Garden soil',0x68523a),
  wood:material('Booth dark wood',0x604027), wood2:material('Booth warm wood',0x93633b), canvas:material('Cream canvas',0xe7dfce),
  canvasShade:material('Canvas shade',0xc7bfad), chalk:material('Chalkboard',0x252c28), white:material('Sign lettering',0xf0eadc),
  trunk:material('Tree trunk',0x594029), leaf:material('Deep foliage',0x315c2d), leaf2:material('Sunlit foliage',0x4f7a39),
  metal:material('Dark metal',0x313735,{roughness:.4,metalness:.35}), planter:material('Planter wood',0x765037),
  portal:material('Spawn portal',0x57aaff,{roughness:.25,emissive:0x167cff,emissiveIntensity:4}),
  red:material('Flag red',0xb95448), yellow:material('Flag yellow',0xd8a948), blue:material('Flag blue',0x4e83a5),
  green:material('Flag green',0x4e8b68), purple:material('Flag purple',0x765c8e), orange:material('Flag orange',0xd47942),
  flower:material('Flowers',0xd98c86), lamp:material('Lamp glow',0xffcf72,{emissive:0xffa21d,emissiveIntensity:2.5}),
};
[M.red,M.yellow,M.blue,M.green,M.purple,M.orange].forEach(flagMaterial=>flagMaterial.side=THREE.DoubleSide);
const box=(name,size,pos,mat,parent=scene)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);o.name=name;o.position.set(...pos);parent.add(o);return o;};
const cyl=(name,r,h,pos,mat,parent=scene,segments=10)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat);o.name=name;o.position.set(...pos);parent.add(o);return o;};
const ico=(name,r,pos,mat,parent=scene,detail=1)=>{const o=new THREE.Mesh(new THREE.IcosahedronGeometry(r,detail),mat);o.name=name;o.position.set(...pos);parent.add(o);return o;};
function beam(name,a,b,r,mat,parent=scene){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const o=cyl(name,r,av.distanceTo(bv),av.clone().add(bv).multiplyScalar(.5).toArray(),mat,parent,8);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.clone().sub(av).normalize());return o;}

// 44 x 58 m walkable plaza, framed by planted campus gardens.
box('Ground_Base',[48,.6,62],[0,-.38,0],M.grass);
box('Central_Pedestrian_Plaza',[32,.32,58],[0,-.05,0],M.pavement);
for(let x=-15;x<=15;x+=2) box(`PavingJoint_X_${x}`,[.035,.012,58],[x,.117,0],M.joint);
for(let z=-28;z<=28;z+=2) box(`PavingJoint_Z_${z}`,[32,.012,.035],[0,.118,z],M.joint);
for(let x=-14;x<=14;x+=4) for(let z=-27;z<=27;z+=4) box(`PaverAccent_${x}_${z}`,[1.92,.016,1.92],[x,.126,z],((x+z)/4)%2?M.curb:M.canvasShade);

function garden(name,x,z,w,d){const g=new THREE.Group();g.name=name;g.position.set(x,.08,z);scene.add(g);box(`${name}_Curb`,[w+.7,.35,d+.7],[0,.12,0],M.curb,g);box(`${name}_Soil`,[w,.38,d],[0,.32,0],M.soil,g);box(`${name}_Grass`,[w-.35,.4,d-.35],[0,.43,0],M.grass2,g);}
for(const [n,x,z,w,d] of [['NW',-19,-22,6,12],['NE',19,-22,6,12],['MW',-19,0,6,14],['ME',19,0,6,14],['SW',-19,22,6,12],['SE',19,22,6,12]]) garden(`Garden_${n}`,x,z,w,d);

function tree(name,x,z,s=1){const g=new THREE.Group();g.name=name;g.position.set(x,.35,z);scene.add(g);cyl(`${name}_Trunk`,.28*s,2.7*s,[0,1.35*s,0],M.trunk,g,9);ico(`${name}_Crown_1`,1.35*s,[0,3.1*s,0],M.leaf,g,2);ico(`${name}_Crown_2`,1.05*s,[-.85*s,2.75*s,.1*s],M.leaf2,g,2);ico(`${name}_Crown_3`,1.05*s,[.75*s,2.82*s,-.2*s],M.leaf,g,2);ico(`${name}_Crown_4`,.9*s,[.05*s,2.8*s,.8*s],M.leaf2,g,2);}
for(const [i,x,z,s] of [[0,-19,-24,1.15],[1,-20,-18,.9],[2,19,-24,1.05],[3,20,-18,.9],[4,-19,-4,1.1],[5,-19,4,.95],[6,19,-4,1.05],[7,19,4,.9],[8,-19,19,1.1],[9,-20,25,.95],[10,19,19,1.05],[11,20,25,1],[12,-13,-28,.85],[13,13,-28,.85]]) tree(`PerimeterTree_${i}`,x,z,s);

function centralPlanter(name,x,z){const g=new THREE.Group();g.name=name;g.position.set(x,.15,z);scene.add(g);box(`${name}_Deck`,[6.2,.3,6.2],[0,.15,0],M.planter,g);box(`${name}_Soil`,[4.5,.48,4.5],[0,.4,0],M.soil,g);tree(`${name}_Tree`,x,z,.8);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;ico(`${name}_Flower_${i}`,.16,[Math.cos(a)*1.7,.82,Math.sin(a)*1.7],i%2?M.flower:M.yellow,g);}}
centralPlanter('CentralPlanter_North',0,-15);centralPlanter('CentralPlanter_Middle',0,0);centralPlanter('CentralPlanter_South',0,15);

function booth(name,x,z,facesCenter=true){const g=new THREE.Group();g.name=name;g.position.set(x,.12,z);g.rotation.y=facesCenter?(x<0?-Math.PI/2:Math.PI/2):0;scene.add(g);
  box(`${name}_Deck`,[7,.3,5],[0,.15,0],M.planter,g);box(`${name}_Cabin`,[5.4,2.1,2.5],[0,1.35,.35],M.wood,g);
  box(`${name}_Counter`,[4.8,.2,.8],[0,1.38,-1.15],M.wood2,g);for(const px of [-2.65,2.65]) for(const pz of [-1.75,1.75]) cyl(`${name}_Post_${px}_${pz}`,.1,3.4,[px,1.85,pz],M.wood,g,8);
  const roof=box(`${name}_CanvasRoof`,[6.3,.24,4.3],[0,3.55,0],M.canvas,g);roof.rotation.x=.01;
  for(const px of [-2.35,-.8,.8,2.35]){const flap=box(`${name}_Valance_${px}`,[1.5,.55,.12],[px,3.28,-2.08],M.canvas,g);flap.rotation.x=-.12;}
  box(`${name}_HeaderSign`,[3.8,.65,.13],[0,2.72,-1.92],M.wood2,g);
  for(let i=-2;i<=2;i++){cyl(`${name}_Display_${i}`,.19,.38,[i*.72,1.68,-1.48],i%2?M.white:M.yellow,g,12);ico(`${name}_Product_${i}`,.2,[i*.72,1.95,-1.48],i%2?M.red:M.green,g);}
  box(`${name}_MenuBoard`,[1.15,1.55,.15],[3.05,.9,-1.55],M.chalk,g).rotation.x=-.1;
  for(let i=0;i<3;i++) box(`${name}_MenuLine_${i}`,[.72,.045,.025],[3.05,1.2-i*.28,-1.65],M.white,g);
  const marker=new THREE.Object3D();marker.name=`Interaction_${name}`;marker.position.set(0,.2,-3);g.add(marker);
}
for(let row=0;row<5;row++){const z=-22+row*11;booth(`ClubBooth_L${row+1}`,-10.5,z);booth(`ClubBooth_R${row+1}`,10.5,z);}

// Bunting strands crossing the street at three points.
const flagMats=[M.red,M.yellow,M.blue,M.green,M.purple,M.orange];
function bunting(name,z,sag=.45){const start=[-15,5,z],end=[15,5,z];beam(`${name}_Cable`,start,end,.025,M.metal);for(let i=0;i<17;i++){const t=(i+1)/18,x=THREE.MathUtils.lerp(start[0],end[0],t),y=5-Math.sin(t*Math.PI)*sag;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([x-.32,y,z,x+.32,y,z,x,y-.72,z],3));geo.setIndex([0,1,2]);geo.computeVertexNormals();const flag=new THREE.Mesh(geo,flagMats[i%flagMats.length]);flag.name=`${name}_Flag_${i}`;scene.add(flag);}}
bunting('Bunting_North',-24,.6);bunting('Bunting_Center',-4,.75);bunting('Bunting_South',18,.55);

// Human-scale lamps, benches and entrance portal.
for(const side of [-1,1]) for(const z of [-27,-9,9,27]){const x=side*15.2;cyl(`LampPost_${side}_${z}`,.11,3.5,[x,1.8,z],M.metal,scene,10);ico(`Lamp_${side}_${z}`,.23,[x,3.65,z],M.lamp,scene,1);}
for(const side of [-1,1]) for(const z of [-14,1,16]){const x=side*15;box(`Bench_${side}_${z}_Seat`,[2.8,.22,.7],[x,.65,z],M.wood2);box(`Bench_${side}_${z}_Back`,[2.8,.85,.16],[x,1.1,z+.34],M.wood2);for(const dx of [-1,1]) box(`Bench_${side}_${z}_Leg_${dx}`,[.16,.6,.5],[x+dx,.35,z],M.metal);}
for(const r of [1.15,1.55]){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.12,10,36),M.portal);ring.name=`EntrancePortalRing_${r}`;ring.position.set(0,.22,27);ring.rotation.x=Math.PI/2;scene.add(ring);}cyl('EntrancePortalCore',.95,.08,[0,.2,27],M.portal,scene,36);
const spawn=new THREE.Object3D();spawn.name='Spawn_ClubStreetFestival';spawn.position.set(0,.3,27);scene.add(spawn);
for(const [name,x,z] of [['NorthExit',0,-29],['SouthEntrance',0,27],['Center',0,0]]){const o=new THREE.Object3D();o.name=`Navigation_${name}`;o.position.set(x,.3,z);scene.add(o);}

scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
const exporter=new GLTFExporter();
const result=await exporter.parseAsync(scene,{binary:true,onlyVisible:true,truncateDrawRange:true});
fs.writeFileSync(output,Buffer.from(result));
console.log(`Created ${output.pathname} (${Buffer.byteLength(result)} bytes)`);
