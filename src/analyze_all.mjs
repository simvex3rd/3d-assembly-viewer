import { NodeIO } from '@gltf-transform/core';
import { readdirSync } from 'fs';
import { join } from 'path';

const io = new NodeIO();
const base = 'C:\\3d_assets\\3D Asset';
const folders = ['Drone', 'Leaf Spring', 'Machine Vice', 'Robot Arm', 'Robot Gripper', 'Suspension', 'V4_Engine'];

for (const folder of folders) {
  console.log(`\n========== ${folder} ==========`);
  const dir = join(base, folder);
  const glbFiles = readdirSync(dir).filter(f => f.endsWith('.glb'));

  for (const file of glbFiles) {
    const filePath = join(dir, file);
    const doc = await io.read(filePath);
    const root = doc.getRoot();
    const meshes = root.listMeshes();

    let globalMin = [Infinity, Infinity, Infinity];
    let globalMax = [-Infinity, -Infinity, -Infinity];
    let primCount = 0;

    for (const mesh of meshes) {
      for (const prim of mesh.listPrimitives()) {
        const posAccessor = prim.getAttribute('POSITION');
        if (posAccessor) {
          const min = posAccessor.getMin([]);
          const max = posAccessor.getMax([]);
          for (let i = 0; i < 3; i++) {
            globalMin[i] = Math.min(globalMin[i], min[i]);
            globalMax[i] = Math.max(globalMax[i], max[i]);
          }
          primCount++;
        }
      }
    }

    const size = globalMin.map((v, i) => (globalMax[i] - v).toFixed(2));
    const center = globalMin.map((v, i) => ((v + globalMax[i]) / 2).toFixed(2));
    // Note: node scale is 0.01, so actual world size = size * 0.01
    const worldSize = size.map(s => (parseFloat(s) * 0.01).toFixed(4));

    console.log(`  ${file}`);
    console.log(`    Mesh bbox: min[${globalMin.map(v=>v.toFixed(2))}] max[${globalMax.map(v=>v.toFixed(2))}]`);
    console.log(`    Size: [${size}]  Center: [${center}]`);
    console.log(`    World size (x0.01): [${worldSize}]  Prims: ${primCount}`);
  }
}
