import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const manifestFile = path.join(__dirname, 'dist-manifest.json');

let manifest = {};
try {
  if (fs.existsSync(manifestFile)) {
    manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  }
} catch {
  manifest = {};
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export default function handler(req, res) {
  const rawUrl = (req.url || '/').split('?')[0];
  const normalizedUrl = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  const safePath = path.normalize(normalizedUrl).replace(/^(\.\.(\/|\\|$))+/, '');
  const candidate = path.join(distDir, safePath);

  // 1. Check disk dist/ directory for static asset
  if (
    normalizedUrl !== '/' &&
    fs.existsSync(candidate) &&
    fs.statSync(candidate).isFile()
  ) {
    const ext = path.extname(candidate).toLowerCase();
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    return res.end(fs.readFileSync(candidate));
  }

  // 2. Check embedded dist-manifest.json for static asset
  if (normalizedUrl !== '/' && manifest[normalizedUrl]) {
    const ext = path.extname(normalizedUrl).toLowerCase();
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    return res.end(Buffer.from(manifest[normalizedUrl], 'base64'));
  }

  // 3. SPA Fallback: serve index.html from disk or manifest
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(fs.readFileSync(indexHtml));
  }

  if (manifest['/index.html']) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(Buffer.from(manifest['/index.html'], 'base64'));
  }

  res.statusCode = 404;
  res.end('Not found');
}
