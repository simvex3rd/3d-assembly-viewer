import express from 'express';
import { readdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(__dirname));

// API: list all projects
app.get('/api/projects', (req, res) => {
  const base = __dirname;
  const dirs = readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
    .map(d => {
      const dirPath = join(base, d.name);
      const files = readdirSync(dirPath);
      const glbFiles = files.filter(f => extname(f).toLowerCase() === '.glb');
      const images = files.filter(f => ['.png', '.jpg', '.jpeg'].includes(extname(f).toLowerCase()));
      return {
        name: d.name,
        parts: glbFiles,
        images: images
      };
    })
    .filter(d => d.parts.length > 0);
  res.json(dirs);
});

app.listen(PORT, () => {
  console.log(`\n  3D Assembly Viewer running at:`);
  console.log(`  http://localhost:${PORT}/viewer.html\n`);
});
