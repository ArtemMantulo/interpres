import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const root = __dirname;
const pages = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), resolve(root, f)])
);

// public/ (media/ and the plain, non-module image-slot.js) is copied into dist as-is.
// Pages reference it by relative path (media/<file>); Vite leaves those URLs untouched,
// so every media file ships exactly once instead of also as a hashed copy in assets/.
export default defineConfig({
  base: './',
  publicDir: 'public',
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: pages } },
  server: { open: '/index.html' },
});
