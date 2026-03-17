import {
    createSplash,
    setSplashProgress,
    hideSplash,
    loadAssets
} from './assets/scripts/loader.js';
import { loadLanguage } from './assets/scripts/utils/language.js';
import { createAmbientAudio } from './assets/scripts/utils/ambientAudio.js';
import { isMobile, isTablet } from './assets/scripts/utils/detect.js';
import {
    delay,
    loadLODSmooth,
    mapAssetProgress,
    waitForGsplatsGate,
    createDebugStatsOverlayUpdater,
    getDeviceProfile,
    finalizeStart,
    createSmoothProgress
} from './assets/scripts/utils/functions.js';
import { createFpsLocker } from './assets/scripts/utils/fpslocker.js';
import { createDestroyRegistry } from './assets/scripts/utils/onAppDestroy.js';
import { createModeManager } from './assets/scripts/utils/modeManager.js';
import './assets/scripts/ui/uiKeys.js';
import { setupUiToggles } from './assets/scripts/ui/uiToggles.js';
import { setupPortraitModePanelScroll } from './assets/scripts/ui/portraitModePanel.js';
import { fadeInWater, applySkyboxInfinite } from './assets/scripts/scene/environment.js';
import { createScene, applyStartSettings } from './assets/scripts/scene/sceneBuilder.js';
import {
    GSPLATS_ON_SCREEN_THRESHOLD,
    ASSET_PROGRESS_WEIGHT,
    START_SETTINGS,
    DEVICE_PROFILES,
    RENDER_SETTINGS,
    FPS_LOCKER_SETTINGS,
    APP_SCRIPT_SPECS,
    MODE_DEFINITIONS,
    MODE_MANAGER_SETTINGS
} from './assets/scripts/config.js';

const canvas = document.getElementById('application-canvas');
const startButton = document.getElementById('start-button');
const isDesktop = !isMobile() && !isTablet();

const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    elementInput: new pc.ElementInput(canvas),
    graphicsDeviceOptions: {
        alpha: false,
        preserveDrawingBuffer: false,
        devicePixelRatio: false,
        antialias: false,
        preferWebGl2: true
    }
});

const { onAppDestroy } = createDestroyRegistry(app);

const modeButtonRoot =
    MODE_MANAGER_SETTINGS?.buttonRootSelector
        ? document.querySelector(MODE_MANAGER_SETTINGS.buttonRootSelector)
        : document;
const initialModeFromUi = document.querySelector('.mode-panel .button.active')?.dataset?.mode;
const modeManager = createModeManager(app, {
    modes: MODE_DEFINITIONS,
    initialMode: initialModeFromUi || MODE_MANAGER_SETTINGS?.initialMode || '0',
    buttonRoot: modeButtonRoot
});
const unbindModeButtons = modeManager.bindModeButtons();
window.AppModeManager = modeManager;
onAppDestroy(() => {
    unbindModeButtons?.();
    modeManager.destroy();
    if (window.AppModeManager === modeManager) window.AppModeManager = null;
});

setupPortraitModePanelScroll(app, onAppDestroy);

const onHomeMarkerActive = (active) => {
    appState.homeMarkerActive = !!active;
    if (!document.hidden && !app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
};
app.on('home:markerActive', onHomeMarkerActive);
onAppDestroy(() => app.off('home:markerActive', onHomeMarkerActive));

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

const appState = { homeMarkerActive: false };

let warmupFrames = RENDER_SETTINGS.warmupFrames;
let reveal = null;
let orbit = null;
let gateActive = true;
let pageHidden = document.hidden;
let gsplatRef = null;
let activeProfile = null;
let upgradeTimerId = 0;
let qualityToggle = null;
let syncUiVisibility = () => {};
let waterMaterial = null;
let waterEntityRef = null;
let ambientAudio = null;

const shouldRender = () => {
    if (pageHidden) return false;
    if (gateActive) return true;
    if (warmupFrames > 0) { warmupFrames--; return true; }
    if (reveal && reveal.enabled) return true;
    if (appState.homeMarkerActive) return true;
    if (!orbit) return true;
    return orbit.movedThisFrame || orbit.isUserInteracting();
};

const fpsLocker = createFpsLocker(app, {
    toggleElementId: FPS_LOCKER_SETTINGS.toggleElementId,
    cappedFps: FPS_LOCKER_SETTINGS.cappedFps,
    shouldRender
});
onAppDestroy(() => fpsLocker?.destroy?.());

const getQualityProfile = () => {
    if (!isDesktop) return getDeviceProfile({ isMobile, isTablet, profiles: DEVICE_PROFILES });
    return qualityToggle?.checked ? DEVICE_PROFILES.desktop : DEVICE_PROFILES.tablet;
};

const applyQualityProfile = (profile, gsplatComponent) => {
    if (!profile || !gsplatComponent) return;
    if (upgradeTimerId) { clearTimeout(upgradeTimerId); upgradeTimerId = 0; }
    if (!profile.enableUpgrade) return;

    const startBudget = gsplatComponent.splatBudget;
    const startLodMin = app.scene.gsplat.lodRangeMin;
    gsplatComponent.lodDistances = profile.upgradedLodDistances;
    loadLODSmooth(app, gsplatComponent, {
        duration: profile.lodSmooth.duration,
        startBudget,
        endBudget: profile.lodSmooth.endBudget,
        startLodMin,
        endLodMin: profile.lodSmooth.endLodMin
    });
    if (!app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
};

const onQualityChange = () => {
    if (!isDesktop || !gsplatRef) return;
    activeProfile = getQualityProfile();
    applyQualityProfile(activeProfile, gsplatRef);
};

const onSoundChange = (event) => {
    if (!ambientAudio) return;
    if (event.target.checked) ambientAudio.play();
    else ambientAudio.stop();
    if (event.target) event.target.blur();
    if (app && !app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
};

const uiToggles = setupUiToggles({ app, isDesktop, onAppDestroy, onQualityChange, onSoundChange });
qualityToggle = uiToggles.qualityToggle;
syncUiVisibility = uiToggles.syncUiVisibility;

const assets = {
    galleryCsv: new pc.Asset('gallery.csv', 'text', { url: 'assets/data/dataGallery.csv' }),
    splatCurrent: new pc.Asset('lod-meta.json', 'gsplat', { url: 'assets/gsplats/lod-meta.json' }),
    hdri_sky: new pc.Asset('hdri', 'texture', { url: 'assets/images/sky.hdr' }, { mipmaps: true }),
    waterModel: new pc.Asset('water', 'container', { url: 'assets/models/Water.glb' })
};

const scriptSpecs = APP_SCRIPT_SPECS;
const scriptAssets = scriptSpecs.map(([name, url]) => new pc.Asset(name, 'script', { url }));

Object.values(assets).forEach((a) => app.assets.add(a));
scriptAssets.forEach((a) => app.assets.add(a));

const assetList = [
    { asset: assets.galleryCsv, size: 1024 },
    { asset: assets.hdri_sky, size: 4516 * 1024 },
    { asset: assets.splatCurrent, size: 1245 * 1024 },
    { asset: assets.waterModel, size: 5 * 1024 },
    ...scriptSpecs.map((s, i) => ({ asset: scriptAssets[i], size: s[2] }))
];

function scheduleUpgradeIfNeeded(profile, gsplatComponent) {
    if (!profile.enableUpgrade) return;
    if (upgradeTimerId) clearTimeout(upgradeTimerId);
    upgradeTimerId = window.setTimeout(() => {
        if (!app || app._destroyed) return;
        if (!gsplatComponent || !gsplatComponent.entity || !gsplatComponent.entity.enabled) return;
        gsplatComponent.lodDistances = profile.upgradedLodDistances;
        loadLODSmooth(app, gsplatComponent, {
            duration: profile.lodSmooth.duration,
            startBudget: START_SETTINGS.splatBudget,
            endBudget: profile.lodSmooth.endBudget,
            startLodMin: START_SETTINGS.lodMin,
            endLodMin: profile.lodSmooth.endLodMin
        });
    }, profile.upgradeDelayMs);
}

let hasStarted = false;

async function startApp() {
    if (hasStarted) return;
    hasStarted = true;

    createSplash();
    const smoothProgress = createSmoothProgress(setSplashProgress, { speed: 10 });

    loadAssets(
        app,
        assetList,
        async () => {
            gateActive = true;

            const result = createScene(app, {
                assets,
                fpsLockerState: fpsLocker.state,
                shouldRender
            });
            gsplatRef = result.gsplatComponent;
            orbit = result.orbit;
            reveal = result.reveal;
            waterMaterial = result.waterMaterial;
            waterEntityRef = result.waterEntityRef;
            activeProfile = getQualityProfile();

            applyStartSettings(app, gsplatRef);

            app.start();
            app.autoRender = false;
            warmupFrames = RENDER_SETTINGS.warmupFrames;

            const onUpdate = () => {
                if (!shouldRender()) return;
                if (fpsLocker.state.active) return;
                if ('renderNextFrame' in app) app.renderNextFrame = true;
                else app.render();
            };
            app.on('update', onUpdate);
            onAppDestroy(() => app.off('update', onUpdate));

            const stopDebugOverlay = createDebugStatsOverlayUpdater(app, {
                gs: gsplatRef,
                fpsLockerState: fpsLocker.state
            });
            onAppDestroy(() => stopDebugOverlay?.());

            scheduleUpgradeIfNeeded(activeProfile, gsplatRef);

            waitForGsplatsGate(app, {
                threshold: GSPLATS_ON_SCREEN_THRESHOLD,
                assetProgressWeight: ASSET_PROGRESS_WEIGHT,
                onProgress: (p) => smoothProgress.setTarget(p),
                onReady: async () => {
                    gateActive = false;
                    smoothProgress.setNow(1);
                    await delay(200);

                    finalizeStart({ reveal, setSplashProgress, hideSplash, loadLanguage });
                    app.fire('ui:ready');
                    syncUiVisibility();

                    ambientAudio = createAmbientAudio('./assets/audio/tropical-birds.mp3', {
                        volume: 0.25,
                        loop: true,
                        fadeInDuration: 3000
                    });
                    onAppDestroy(() => { if (ambientAudio) ambientAudio.destroy(); });

                    const waterTimerId = window.setTimeout(() => {
                        fadeInWater(app, waterMaterial, waterEntityRef, 2000);
                        if (!app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
                    }, 5000);
                    onAppDestroy(() => clearTimeout(waterTimerId));

                    const skyboxTimerId = window.setTimeout(() => {
                        applySkyboxInfinite(app, assets.hdri_sky);
                        if (!app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
                    }, 7000);
                    onAppDestroy(() => clearTimeout(skyboxTimerId));
                }
            });
        },
        (p) => smoothProgress.setTarget(mapAssetProgress(p, ASSET_PROGRESS_WEIGHT))
    );
}

let resizeRaf = 0;

const onResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        app.resizeCanvas();
        if (!app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
    });
};

const destroyAppSafely = () => {
    if (!app || app._destroyed) return;
    try { app.destroy(); } catch (e) { console.warn('App destroy failed:', e); }
};

const onStartClick = (e) => { e?.preventDefault?.(); startApp(); };
const onStartKeyDown = (e) => {
    if (!window.UiKeys?.isActivateKey?.(e)) return;
    e.preventDefault();
    startApp();
};
const onVisibilityChange = () => {
    pageHidden = document.hidden;
    if (!pageHidden && !app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
};

window.addEventListener('resize', onResize);
window.addEventListener('pagehide', destroyAppSafely, { passive: true });
window.addEventListener('beforeunload', destroyAppSafely, { passive: true });
if (startButton) startButton.addEventListener('click', onStartClick);
if (startButton) startButton.addEventListener('keydown', onStartKeyDown);
document.addEventListener('visibilitychange', onVisibilityChange);

onAppDestroy(() => {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pagehide', destroyAppSafely);
    window.removeEventListener('beforeunload', destroyAppSafely);
    if (startButton) startButton.removeEventListener('click', onStartClick);
    if (startButton) startButton.removeEventListener('keydown', onStartKeyDown);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (upgradeTimerId) clearTimeout(upgradeTimerId);
    upgradeTimerId = 0;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = 0;
});
