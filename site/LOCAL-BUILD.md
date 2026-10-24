# Local build (Vite)

Requires Node.js 18+.

```
npm install
npm run dev       # http://localhost:5173 — live reload
npm run build     # static site → dist/
npm run preview   # check the built dist/
```

Media lives in `public/media/` and is copied into `dist/media/` as-is.
Showreel: `public/media/showreel.mp4`. Until it exists the hero falls back to `media/096-hero-video.mp4`.

Deploy: push to `main` — the GitHub Action publishes the web root to the `deploy` branch (see ../DEPLOY.md).
