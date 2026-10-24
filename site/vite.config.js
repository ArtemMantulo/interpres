import { defineConfig } from 'vite';
import { resolve, extname, join, normalize } from 'node:path';
import { readdirSync, statSync, createReadStream } from 'node:fs';

const root = __dirname;
const pages = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), resolve(root, f)])
);

// Local dev/preview only: serve the Gaussian Splats viewer (../public_html/demo) at /demo,
// plus the legacy absolute paths the viewer uses (/src, /scene_assets, /assets/*.ksplat),
// mirroring what public_html/.htaccess does on the real server. Not part of the build.
const DEMO = resolve(root, '../public_html/demo');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.csv': 'text/csv; charset=utf-8',
  '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.ksplat': 'application/octet-stream',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2',
};
function demoPath(url) {
  const p = decodeURIComponent(url.split('?')[0]);
  if (p === '/demo') return { redirect: '/demo/' };
  let rel = null;
  if (p.startsWith('/demo/')) rel = p.slice('/demo/'.length);
  else if (/^\/(src|scene_assets)\//.test(p) || /^\/assets\/.+\.(ksplat|glb)$/.test(p)) rel = p.slice(1);
  if (rel === null) return null;
  let file = normalize(join(DEMO, rel));
  if (!file.startsWith(DEMO)) return null;
  try { if (statSync(file).isDirectory()) file = join(file, 'index.html'); statSync(file); } catch { return null; }
  return { file };
}
function serveDemo(req, res, next) {
  const hit = demoPath(req.url);
  if (!hit) return next();
  if (hit.redirect) { res.statusCode = 301; res.setHeader('Location', hit.redirect); return res.end(); }
  res.setHeader('Content-Type', MIME[extname(hit.file).toLowerCase()] || 'application/octet-stream');
  // Same headers as demo/.htaccess (on Apache they apply to the bridged /src paths too).
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  createReadStream(hit.file).pipe(res);
}
const localDemo = () => ({
  name: 'local-demo',
  configureServer(server) { server.middlewares.use(serveDemo); },
  configurePreviewServer(server) { server.middlewares.use(serveDemo); },
});

// public/ (media/ and the plain, non-module image-slot.js) is copied into dist as-is.
// Pages reference it by relative path (media/<file>); Vite leaves those URLs untouched,
// so every media file ships exactly once instead of also as a hashed copy in assets/.
export default defineConfig({
  base: './',
  publicDir: 'public',
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: pages } },
  server: { open: '/index.html' },
  plugins: [localDemo()],
});
