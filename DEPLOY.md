# interpres.live — структура и деплой

## Что где лежит

```
site/                      # исходники сайта Immersive Solutions (Vite, multi-page)
├── *.html                 # index, digital-twin, renders, crm, cases, case-*, demos, contact
├── public/media/          # все картинки и видео сайта (копируются в сборку как есть)
├── public/image-slot.js   # обычный (не module) скрипт, не бандлится
└── vite.config.js
public_html/
├── .htaccess              # редиректы со старых URL + мост для legacy-путей вьюера
└── demo/                  # Gaussian Splats Viewer (interpres.live)
    ├── .htaccess          # COOP/COEP (нужны вьюеру для SharedArrayBuffer)
    ├── index.html         # меню проектов с паролем
    ├── assets/, src/, scene_assets/, backup/, old version/
.github/workflows/deploy.yml  # сборка и публикация ветки deploy
```

## Как это попадает на хостинг

1. Push в `main`.
2. GitHub Action собирает `site/` и складывает в корень ветки **`deploy`**:
   содержимое `site/dist/` + содержимое `public_html/` (`.htaccess`, `demo/`).
3. Hostinger (Git-деплой) забирает ветку `deploy` в `public_html` — корень ветки = корень сайта.

Ветку `deploy` руками не править: она перезаписывается при каждом деплое.

## Маршруты

| URL | Что |
|---|---|
| `/` и `/*.html` | сайт Immersive Solutions |
| `/demo/` | Gaussian Splats Viewer (под паролем) |
| `/src/...`, `/assets/*.ksplat`, `/scene_assets/...` | мост: если файла нет в корне, отдаётся из `/demo` (старые ссылки, например с interpres.cc на `/src/breig_elysium_hdri/index.html`) |
| `/solutions/*`, `/cases/*` | 301-редирект со старого React-сайта на новые страницы |

Мост и редиректы требуют Apache с `mod_rewrite` (на Hostinger есть).

## Почему COEP только в /demo

Вьюеру нужен `Cross-Origin-Embedder-Policy: require-corp`. В корне он заблокировал бы
Google Fonts и внешние ресурсы сайта, поэтому заголовок только в `demo/.htaccess`.

## Локальный запуск

```bash
npm --prefix site install   # один раз
npm run dev                 # сайт, http://localhost:5173
npm run build               # сборка в site/dist
npm run demo                # только вьюер, http://localhost:8001
```

## Медиа

Список файлов и где они используются — `site/MEDIA-PLACEMENT.md`.
Новые картинки/видео класть в `site/public/media/`, ссылаться как `media/<файл>`.
Лимит GitHub — 100 МБ на файл; видео больше этого сжимать перед коммитом.
