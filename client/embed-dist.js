import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const manifestPath = path.join(__dirname, 'dist-manifest.json');

function walk(dir, base = '') {
  const entries = {};
  if (!fs.existsSync(dir)) return entries;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const rel = base ? `${base}/${item}` : `/${item}`;
    if (fs.statSync(full).isDirectory()) {
      Object.assign(entries, walk(full, rel));
    } else {
      entries[rel] = fs.readFileSync(full).toString('base64');
    }
  }
  return entries;
}

const manifest = walk(distDir);
fs.writeFileSync(manifestPath, JSON.stringify(manifest));
console.log(`✓ Embedded ${Object.keys(manifest).length} dist files into dist-manifest.json`);

