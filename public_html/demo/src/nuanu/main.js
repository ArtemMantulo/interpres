const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('application-canvas'));
window.focus();

pc.WasmModule.setConfig('Ammo', {
    glueUrl: `assets/lib/ammo.wasm.js`,
    wasmUrl: `assets/lib/ammo.wasm.wasm`,
    fallbackUrl: `assets/lib/ammo.js`   
});
await new Promise((resolve) => {
    pc.WasmModule.getInstance('Ammo', () => resolve());
});

const app = new pc.Application(canvas, {
  mouse: new pc.Mouse(canvas),
  touch: new pc.TouchDevice(canvas),
  keyboard: new pc.Keyboard(window),
  graphicsDeviceOptions: { alpha: false, devicePixelRatio: false, antialias: true, powerPreference: 'high-performance', preferWebGl2: true }
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
window.addEventListener('resize', () => app.resizeCanvas());

app.start();

let currentSceneRoot = null;

function cleanupPreviousScene() {
    try {
        if (currentSceneRoot) {
            if (currentSceneRoot.parent) currentSceneRoot.parent.removeChild(currentSceneRoot);
            if (typeof currentSceneRoot.destroy === 'function') currentSceneRoot.destroy();
        }
    } catch (e) {
        console.warn('cleanupPreviousScene warning:', e);
    }
    currentSceneRoot = null;
}

async function runScenario({ packPath, scenePath, startPath, label = 'scenario' }) {
  const btnDefault = document.getElementById('start-Default');
  btnDefault && (btnDefault.disabled = true);

  try {

    if (label === 'Default') {
      ensureFullscreenButtonForDefault();
    }

    const [{ createSplash, setSplashProgress, hideSplash, loadAssets }, assetsMod, sceneMod] =
      await Promise.all([
        import('./assets/scripts/loader.js'),
        import(packPath),
        import(scenePath),
      ]);

    createSplash?.();
    const { assetMap, scriptAssets, assetList } = assetsMod.registerAssets(app);
    await loadAssets(app, assetList, null, setSplashProgress);
    hideSplash?.();

    document.getElementById('go-button').style.display = 'block';

    cleanupPreviousScene();

    const onSceneReady = async (scene) => {
      try {
        currentSceneRoot = scene.root || scene.Root || scene;

        const startMod = await import(startPath);

        if (typeof startMod.startDefault === 'function') {
          await startMod.startDefault(
            app, scene.Coins, scene.Character, scene.Player
          );
        }
      } catch (e) {
        console.error(`Start error ${label} in onSceneReady:`, e);
      }
    };

    if (typeof sceneMod.startApp === 'function') {
      if (sceneMod.startApp.length <= 1) sceneMod.startApp(onSceneReady);
      else sceneMod.startApp(onSceneReady, app, assetMap);
    }
  } catch (err) {
    console.error(`Launch error ${label}:`, err);
  } finally {
    btnDefault && (btnDefault.disabled = false);
  }
}

function isMobile() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /android|iphone|ipad|ipod/i.test(ua);
}

document.getElementById("start-Default")?.addEventListener("click", async () => {
  const run = async () => {
    document.getElementById("start-screen")?.remove();
    document.getElementById("logo").style.display = "block";
    await runScenario({
      packPath: './assets/scripts/scenes/assetsDefault.js',
      scenePath: './assets/scripts/scenes/sceneDefault.js',
      startPath: './assets/scripts/scenes/startDefault.js',
      label: 'Default'
    });
  };

  if (isMobile()) {
    setTimeout(run, 1000);
  } else {
    run();
  }
});

function ensureFullscreenButtonForDefault() {

  if (document.getElementById('fullscreen-button')) return;

  const btn = document.createElement('div');
  btn.id = 'fullscreen-button';
  document.body.appendChild(btn);

  import('./assets/scripts/fullscreen.js').then(m => {
    m.setupFullscreenButton?.();
  });
}