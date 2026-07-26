import fs from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

globalThis.ProgressEvent ??= class ProgressEvent {};

const bytes = fs.readFileSync(process.argv[2]);
const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const loader = new GLTFLoader();

loader.parse(
  arrayBuffer,
  '',
  gltf => {
    gltf.scene.traverse(node => {
      if (node.isMesh) {
        console.log(JSON.stringify({
          name: node.name,
          type: node.type,
          parent: node.parent?.name,
          geometry: node.geometry?.name,
          material: Array.isArray(node.material)
            ? node.material.map(material => material.name)
            : node.material?.name
        }));
      }
    });
  },
  error => {
    console.error(error);
    process.exitCode = 1;
  }
);
