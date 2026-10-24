# Local build (Vite)

Requires Node.js 18+.

```
npm install
npm run dev       # http://localhost:5173 — live reload
npm run build     # static site → dist/
npm run preview   # check the built dist/
```

Media lives in `public/media/<page>/<block>/` (see MEDIA-PLACEMENT.md) and is copied into `dist/media/` as-is.
Showreel: `public/media/index/hero/showreel.mp4`. Until it exists the hero falls back to `096-hero-video.mp4` in the same folder.

Deploy: push to `main` — the GitHub Action publishes the web root to the `deploy` branch (see ../DEPLOY.md).
