import {
    createSplash,
    setSplashProgress,
    hideSplash,
    loadAssets
} from './assets/scripts/loader.js';
import { setupFullscreenButton } from './assets/scripts/utils/fullscreen.js';
import { loadLanguage } from './assets/scripts/utils/language.js';
import { GsplatRevealRadial } from './assets/shaders/reveal-radial.js';
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
import {
    GSPLATS_ON_SCREEN_THRESHOLD,
    ASSET_PROGRESS_WEIGHT,
    START_SETTINGS,
    DEVICE_PROFILES,
    SCENE_GSPLAT_SETTINGS,
    RENDER_SETTINGS,
    FPS_LOCKER_SETTINGS,
    CAMERA_SETTINGS,
    ROOT_SETTINGS,
    REVEAL_SETTINGS,
    HOME_PLANE_SETTINGS,
    GALLERY_SETTINGS,
    AMENITIES_SETTINGS,
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

const PORTRAIT_MODE_PANEL_MEDIA =
    '(max-height: 812px) and (orientation: portrait), ' +
    '(max-width: 480px) and (orientation: portrait), ' +
    '(max-aspect-ratio: 3/4) and (orientation: portrait)';

const setupPortraitModePanelScroll = (registerDestroy) => {
    const container = document.querySelector('.mode-panel .panel-container');
    if (!container) return;

    const media = window.matchMedia(PORTRAIT_MODE_PANEL_MEDIA);
    const DRAG_THRESHOLD = 6;
    const SCROLL_EPSILON = 1;

    let dragging = false;
    let moved = false;
    let suppressClick = false;
    let pointerId = -1;
    let startX = 0;
    let startScrollLeft = 0;

    const isScrollableNow = () => media.matches && container.scrollWidth > container.clientWidth;
    const clearScrollState = () => {
        container.classList.remove(
            'is-scrollable',
            'is-scrolled',
            'is-scrolled-start',
            'is-scrolled-end'
        );
    };
    const updateScrollState = () => {
        if (!media.matches) {
            clearScrollState();
            return;
        }

        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        const scrollLeft = Math.max(0, container.scrollLeft);
        const scrollable = maxScroll > SCROLL_EPSILON;
        const atStart = scrollLeft <= SCROLL_EPSILON;
        const atEnd = scrollLeft >= maxScroll - SCROLL_EPSILON;

        container.classList.toggle('is-scrollable', scrollable);
        container.classList.toggle('is-scrolled', scrollable && !atStart);
        container.classList.toggle('is-scrolled-start', scrollable && atStart);
        container.classList.toggle('is-scrolled-end', scrollable && atEnd);
    };

    const endDrag = (event) => {
        if (!dragging) return;
        if (pointerId !== -1 && event?.pointerId !== undefined && event.pointerId !== pointerId) return;

        dragging = false;
        container.classList.remove('is-dragging');
        suppressClick = moved;

        if (pointerId !== -1) {
            try {
                container.releasePointerCapture(pointerId);
            } catch {}
        }

        pointerId = -1;
        updateScrollState();

        if (suppressClick) {
            setTimeout(() => {
                suppressClick = false;
            }, 0);
        }
    };

    const onPointerDown = (event) => {
        if (!isScrollableNow()) return;
        if (event.button !== undefined && event.button !== 0) return;

        dragging = true;
        moved = false;
        pointerId = event.pointerId ?? -1;
        startX = event.clientX;
        startScrollLeft = container.scrollLeft;

        container.classList.add('is-dragging');

        if (pointerId !== -1) {
            try {
                container.setPointerCapture(pointerId);
            } catch {}
        }
    };

    const onPointerMove = (event) => {
        if (!dragging) return;
        if (pointerId !== -1 && event.pointerId !== pointerId) return;

        const dx = event.clientX - startX;
        if (!moved && Math.abs(dx) < DRAG_THRESHOLD) return;

        moved = true;
        container.scrollLeft = startScrollLeft - dx;
        updateScrollState();
        event.preventDefault();
    };

    const onClickCapture = (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
    };

    const onMediaChange = () => {
        if (!media.matches) {
            dragging = false;
            moved = false;
            suppressClick = false;
            pointerId = -1;
            container.classList.remove('is-dragging');
        }
        updateScrollState();
    };
    const onContainerScroll = () => updateScrollState();
    const onResize = () => updateScrollState();

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove, { passive: false });
    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);
    container.addEventListener('lostpointercapture', endDrag);
    container.addEventListener('click', onClickCapture, true);
    container.addEventListener('scroll', onContainerScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    const onUiReady = () => {
        updateScrollState();
        requestAnimationFrame(updateScrollState);
    };
    app.on('ui:ready', onUiReady);

    if (typeof media.addEventListener === 'function') media.addEventListener('change', onMediaChange);
    else if (typeof media.addListener === 'function') media.addListener(onMediaChange);

    updateScrollState();
    requestAnimationFrame(updateScrollState);

    registerDestroy(() => {
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerup', endDrag);
        container.removeEventListener('pointercancel', endDrag);
        container.removeEventListener('lostpointercapture', endDrag);
        container.removeEventListener('click', onClickCapture, true);
        container.removeEventListener('scroll', onContainerScroll);
        window.removeEventListener('resize', onResize);
        app.off('ui:ready', onUiReady);

        if (typeof media.removeEventListener === 'function')
            media.removeEventListener('change', onMediaChange);
        else if (typeof media.removeListener === 'function') media.removeListener(onMediaChange);
    });
};

setupPortraitModePanelScroll(onAppDestroy);

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
    if (warmupFrames > 0) {
        warmupFrames--;
        return true;
    }
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

    if (upgradeTimerId) {
        clearTimeout(upgradeTimerId);
        upgradeTimerId = 0;
    }

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

    if (event.target.checked) {
        ambientAudio.play();
    } else {
        ambientAudio.stop();
    }

    if (event.target) {
        event.target.blur();
    }

    if (app && !app.autoRender && 'renderNextFrame' in app) {
        app.renderNextFrame = true;
    }
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

function ensureWaterLayer() {
    const layers = app.scene.layers;
    let layer = layers.getLayerByName ? layers.getLayerByName('Water') : null;
    if (!layer) {
        layer = new pc.Layer({ name: 'Water' });
        const list = layers.layerList || layers.layers || layers._layers || [];
        const worldLayer = layers.getLayerById ? layers.getLayerById(pc.LAYERID_WORLD) : null;
        const worldIdx = worldLayer ? list.indexOf(worldLayer) : -1;
        const insertIdx = worldIdx >= 0 ? worldIdx + 1 : list.length;
        if (layers.insert) layers.insert(layer, insertIdx);
        else if (layers.addLayer) layers.addLayer(layer);
        else if (Array.isArray(list)) list.splice(insertIdx, 0, layer);
    }
    return layer;
}

function fadeInWater(duration = 1000) {
    if (!waterMaterial) return;
    if (waterEntityRef) waterEntityRef.enabled = true;
    const start = performance.now();
    const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        waterMaterial.opacity = t;
        waterMaterial.update();
        if (!app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function applySkyboxInfinite() {
    const hdri = assets.hdri_sky?.resource;
    if (!hdri) return;

    const skybox = pc.EnvLighting.generateSkyboxCubemap(hdri);
    app.scene.skybox = skybox;

    const lighting = pc.EnvLighting.generateLightingSource(hdri);
    app.scene.envAtlas = pc.EnvLighting.generateAtlas(lighting);
    lighting.destroy();

    app.scene.sky.type = pc.SKYTYPE_INFINITE;
    app.scene.skyboxIntensity = 1.2;
    app.scene.skyboxRotation = new pc.Quat().setFromEulerAngles(0, -10, 0);
    app.scene.skyboxMip = 0;
}

function createScene() {
    const root = new pc.Entity('Root');
    app.scene.ambientColor = new pc.Color(1, 1, 1);

    const cameraEntity = new pc.Entity('Camera');
    cameraEntity.setPosition(...CAMERA_SETTINGS.position);
    cameraEntity.setEulerAngles(...CAMERA_SETTINGS.euler);
    cameraEntity.addComponent('camera', {
        clearColor: new pc.Color(...CAMERA_SETTINGS.clearColor),
        fov: CAMERA_SETTINGS.fov
    });

    const waterLayer = ensureWaterLayer();
    if (cameraEntity.camera) {
        const waterLayerId = waterLayer?.id;
        const layers = [pc.LAYERID_SKYBOX, pc.LAYERID_WORLD];
        if (waterLayerId !== undefined) layers.push(waterLayerId);
        cameraEntity.camera.layers = layers;
    }
    cameraEntity.addComponent('script');
    orbit = cameraEntity.script.create('orbitCamera');
    root.addChild(cameraEntity);

    const planeEntity = new pc.Entity('Plane');
    planeEntity.setPosition(...HOME_PLANE_SETTINGS.position);
    planeEntity.setEulerAngles(...HOME_PLANE_SETTINGS.rotation);
    planeEntity.setLocalScale(...HOME_PLANE_SETTINGS.scale);
    planeEntity.addComponent('collision', {
        type: 'box',
        halfExtents: new pc.Vec3(...HOME_PLANE_SETTINGS.colliderHalfExtents)
    });
    root.addChild(planeEntity);

    const gsplatEntity = new pc.Entity('GSPlatCurrent');
    gsplatEntity.setPosition(...ROOT_SETTINGS.gsplatPosition);
    gsplatEntity.setEulerAngles(...ROOT_SETTINGS.gsplatEuler);
    gsplatEntity.addComponent('gsplat', { asset: assets.splatCurrent, unified: true });
    if (gsplatEntity.gsplat) {
        gsplatEntity.gsplat.layers = [pc.LAYERID_WORLD];
    }

    gsplatEntity.addComponent('script');
    reveal = gsplatEntity.script.create(GsplatRevealRadial);
    applyRevealSettings(reveal);

    root.addChild(gsplatEntity);

    if (assets.waterModel?.resource) {
        const waterEntity = assets.waterModel.resource.instantiateRenderEntity();
        waterEntity.name = 'Water';
        waterEntity.setLocalPosition(137, -4, -64);
        waterEntity.setEulerAngles(-90, 114, 0);
        waterEntity.enabled = false;

        const waterMat = new pc.StandardMaterial();
        waterMat.useMetalness = false;
        waterMat.metalness = 0;
        waterMat.specular = new pc.Color(0, 0, 0);
        waterMat.reflectivity = 0;
        waterMat.shininess = 0;
        waterMat.useSkybox = false;
        waterMat.useLighting = false;
        waterMat.useFog = false;
        waterMat.diffuse = new pc.Color(0.353, 0.502, 0.576);
        waterMat.ambient = new pc.Color(1, 1, 1);
        waterMat.emissive = waterMat.diffuse.clone();
        waterMat.blendType = pc.BLEND_NORMAL;
        waterMat.opacity = 0;
        waterMat.update();
        waterMaterial = waterMat;

        const renders = waterEntity.findComponents('render');
        renders.forEach((r) => r.meshInstances.forEach((mi) => (mi.material = waterMat)));
        if (waterEntity.render) {
            waterEntity.render.meshInstances.forEach((mi) => (mi.material = waterMat));
        }
        const waterLayerId = waterLayer?.id;
        if (waterLayerId !== undefined) {
            renders.forEach((r) => {
                if (r) r.layers = [waterLayerId];
            });
            if (waterEntity.render) waterEntity.render.layers = [waterLayerId];
        }
        root.addChild(waterEntity);
        waterEntityRef = waterEntity;
    }

    root.addComponent('script');
    root.script.create('gallery', {
        attributes: { galleryTextAsset: assets.galleryCsv, ...GALLERY_SETTINGS }
    });
    root.script.create('amenitiesMode', {
        attributes: { fpsLockerState: fpsLocker.state, ...AMENITIES_SETTINGS }
    });
    root.script.create('apartmentsMode');
    root.script.create('homeMode');
    const adjustPixelRatio = root.script.create('adjustPixelRatio');
    adjustPixelRatio.fpsLockerState = fpsLocker.state;
    adjustPixelRatio.shouldRender = shouldRender;

    app.root.addChild(root);

    applySceneGsplatSettings();

    return { gsplatComponent: gsplatEntity.gsplat };
}

function applyRevealSettings(r) {
    const s = REVEAL_SETTINGS;
    r.enabled = s.enabled;

    r.center.set(...s.center);
    r.speed = s.speed;
    r.acceleration = s.acceleration;
    r.delay = s.delay;

    r.waveColorA = new pc.Color(...s.waveColorA);
    r.waveColorB = new pc.Color(...s.waveColorB);
    r.tintStrength = s.tintStrength;

    r.liftHeight = s.liftHeight;
    r.liftHeightStart = s.liftHeightStart;
    r.liftHeightEnd = s.liftHeightEnd;
    r.liftDuration = s.liftDuration;

    r.waveWidth = s.waveWidth;
    r.waveWidthStart = s.waveWidthStart;
    r.waveWidthEnd = s.waveWidthEnd;

    r.oscillationIntensity = s.oscillationIntensity;
    r.endRadius = s.endRadius;
}

function applySceneGsplatSettings() {
    const s = SCENE_GSPLAT_SETTINGS;
    app.scene.gsplat.lodRangeMax = s.lodRangeMax;
    app.scene.gsplat.lodUpdateAngle = s.lodUpdateAngle;
    app.scene.gsplat.lodBehindPenalty = s.lodBehindPenalty;
    app.scene.gsplat.radialSorting = s.radialSorting;
    app.scene.gsplat.lodUpdateDistance = s.lodUpdateDistance;
    app.scene.gsplat.lodUnderfillLimit = s.lodUnderfillLimit;
}

function applyStartSettings(gsplatComponent) {
    app.scene.gsplat.lodRangeMin = START_SETTINGS.lodMin;
    gsplatComponent.splatBudget = START_SETTINGS.splatBudget;
    gsplatComponent.lodDistances = START_SETTINGS.lodDistances;
}

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

            const { gsplatComponent } = createScene();
            gsplatRef = gsplatComponent;
            activeProfile = getQualityProfile();

            applyStartSettings(gsplatComponent);

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
                gs: gsplatComponent,
                fpsLockerState: fpsLocker.state
            });
            onAppDestroy(() => stopDebugOverlay?.());

            scheduleUpgradeIfNeeded(activeProfile, gsplatComponent);

            waitForGsplatsGate(app, {
                threshold: GSPLATS_ON_SCREEN_THRESHOLD,
                assetProgressWeight: ASSET_PROGRESS_WEIGHT,
                onProgress: (p) => smoothProgress.setTarget(p),
                onReady: async () => {
                    gateActive = false;

                    smoothProgress.setNow(1);
                    await delay(200);

                    const destroyFullscreen = finalizeStart({
                        reveal,
                        setSplashProgress,
                        hideSplash,
                        setupFullscreenButton,
                        loadLanguage
                    });
                    app.fire('ui:ready');
                    syncUiVisibility();

                    ambientAudio = createAmbientAudio('./assets/audio/tropical-birds.mp3', {
                        volume: 0.25,
                        loop: true,
                        fadeInDuration: 3000
                    });
                    onAppDestroy(() => {
                        if (ambientAudio) ambientAudio.destroy();
                    });

                    const waterTimerId = window.setTimeout(() => {
                        fadeInWater(2000);
                        if (!app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
                    }, 5000);
                    onAppDestroy(() => clearTimeout(waterTimerId));

                    const skyboxTimerId = window.setTimeout(() => {
                        applySkyboxInfinite();
                        if (!app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
                    }, 7000); 
                    onAppDestroy(() => clearTimeout(skyboxTimerId));

                    if (typeof destroyFullscreen === 'function') onAppDestroy(destroyFullscreen);
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
    try {
        app.destroy();
    } catch (e) {
        console.warn('App destroy failed:', e);
    }
};

const onStartClick = (e) => {
    e?.preventDefault?.();
    startApp();
};

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
