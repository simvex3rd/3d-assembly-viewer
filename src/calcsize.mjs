import { readdirSync, statSync } from 'fs';
import { join } from 'path';
let total = 0;
function scan(d) {
  for (const f of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, f.name);
    if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.git') scan(p);
    else if (/\.(glb|png|jpg|html)$/i.test(f.name)) total += statSync(p).size;
  }
}
scan('C:\\3d_assets\\3D Asset');
console.log((total / 1024 / 1024).toFixed(1) + ' MB total');
