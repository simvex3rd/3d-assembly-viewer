import { readdirSync, copyFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const SRC = 'C:\\3d_assets\\3D Asset';
const DEST = join(SRC, 'deploy');

// Clean and recreate deploy dir
function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }
ensureDir(DEST);

// Copy HTML files
for (const f of ['viewer.html', 'report.html']) {
  copyFileSync(join(SRC, f), join(DEST, f));
  console.log(`  + ${f}`);
}

// Copy report.html as index.html
copyFileSync(join(SRC, 'report.html'), join(DEST, 'index.html'));
console.log('  + index.html (from report.html)');

// Copy assembled GLBs
const asmDir = join(DEST, 'assembled');
ensureDir(asmDir);
for (const f of readdirSync(join(SRC, 'assembled'))) {
  copyFileSync(join(SRC, 'assembled', f), join(asmDir, f));
  console.log(`  + assembled/${f}`);
}

// Copy project folders (GLB + images only)
const projects = ['Drone', 'Leaf Spring', 'Machine Vice', 'Robot Arm', 'Robot Gripper', 'Suspension', 'V4_Engine'];
let totalSize = 0;
let fileCount = 0;

for (const proj of projects) {
  const srcDir = join(SRC, proj);
  const destDir = join(DEST, proj);
  ensureDir(destDir);

  for (const f of readdirSync(srcDir)) {
    const ext = extname(f).toLowerCase();
    if (['.glb', '.png', '.jpg', '.jpeg'].includes(ext)) {
      const src = join(srcDir, f);
      copyFileSync(src, join(destDir, f));
      totalSize += statSync(src).size;
      fileCount++;
      console.log(`  + ${proj}/${f}`);
    }
  }
}

// Add assembled sizes
for (const f of readdirSync(join(SRC, 'assembled'))) {
  totalSize += statSync(join(SRC, 'assembled', f)).size;
  fileCount++;
}
// Add HTML sizes
totalSize += statSync(join(DEST, 'index.html')).size * 2;
totalSize += statSync(join(DEST, 'viewer.html')).size;
fileCount += 3;

console.log(`\nDeploy folder ready: ${DEST}`);
console.log(`Files: ${fileCount} | Size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
