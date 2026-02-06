import { NodeIO } from '@gltf-transform/core';
import { readdirSync } from 'fs';
import { join } from 'path';

const io = new NodeIO();

// Check bounding boxes of mesh geometry for one project
const folders = ['Suspension', 'Drone'];

for (const folder of folders) {
  console.log(`\n=== ${folder} ===`);
  const dir = join('C:\\3d_assets\\3D Asset', folder);
  const glbFiles = readdirSync(dir).filter(f => f.endsWith('.glb'));

  for (const file of glbFiles) {
    const filePath = join(dir, file);
    const doc = await io.read(filePath);
    const root = doc.getRoot();
    const meshes = root.listMeshes();

    for (const mesh of meshes) {
      for (const prim of mesh.listPrimitives()) {
        const posAccessor = prim.getAttribute('POSITION');
        if (posAccessor) {
          const min = posAccessor.getMin([]);
          const max = posAccessor.getMax([]);
          console.log(`  ${file}: min[${min.map(v=>v.toFixed(2))}] max[${max.map(v=>v.toFixed(2))}] center[${min.map((v,i)=>((v+max[i])/2).toFixed(2))}]`);
        }
      }
    }
  }
}
