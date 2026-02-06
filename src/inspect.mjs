import { NodeIO } from '@gltf-transform/core';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const io = new NodeIO();

// Check a few parts from different projects
const folders = ['Drone', 'Suspension', 'V4_Engine', 'Robot Arm'];

for (const folder of folders) {
  console.log(`\n=== ${folder} ===`);
  const dir = join('C:\\3d_assets\\3D Asset', folder);
  const glbFiles = readdirSync(dir).filter(f => f.endsWith('.glb'));

  for (const file of glbFiles.slice(0, 3)) {
    const filePath = join(dir, file);
    const doc = await io.read(filePath);
    const root = doc.getRoot();
    const scenes = root.listScenes();

    console.log(`\n  ${file}:`);
    for (const scene of scenes) {
      for (const node of scene.listChildren()) {
        const t = node.getTranslation();
        const r = node.getRotation();
        const s = node.getScale();
        const name = node.getName();
        console.log(`    Node: "${name}" | T:[${t.map(v=>v.toFixed(3))}] R:[${r.map(v=>v.toFixed(3))}] S:[${s.map(v=>v.toFixed(3))}]`);

        // Check children too
        for (const child of node.listChildren()) {
          const ct = child.getTranslation();
          const cn = child.getName();
          console.log(`      Child: "${cn}" | T:[${ct.map(v=>v.toFixed(3))}]`);
        }
      }
    }
  }
}
