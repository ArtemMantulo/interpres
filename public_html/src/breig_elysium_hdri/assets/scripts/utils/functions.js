export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const clamp01 = (value) => {
    if (!isFinite(value) || isNaN(value)) return 0;
    return value < 0 ? 0 : value > 1 ? 1 : value;
};

export const mapAssetProgress = (assetProgress01, assetProgressWeight) =>
    clamp01(assetProgress01) * clamp01(assetProgressWeight);

export function createSmoothProgress(setProgress, { speed = 8, snapEps = 0.001 } = {}) {
    let current01 = 0;
    let target01 = 0;
    let isRunning = false;
    let lastTime = performance.now();

    const tick = () => {
        if (!isRunning) return;

        const now = performance.now();
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        const k = 1 - Math.exp(-speed * dt);
        current01 += (target01 - current01) * k;

        if (Math.abs(target01 - current01) <= snapEps) current01 = target01;

        setProgress(current01);

        if (current01 !== target01) requestAnimationFrame(tick);
        else isRunning = false;
    };

    const start = () => {
        if (isRunning) return;
        isRunning = true;
        lastTime = performance.now();
        requestAnimationFrame(tick);
    };

    return {
        setTarget(value01) {
            const next01 = clamp01(value01);
            if (next01 > target01) target01 = next01;
            if (current01 !== target01) start();
        },
        setNow(value01) {
            const next01 = clamp01(value01);
            current01 = target01 = next01;
            setProgress(next01);
        }
    };
}

export function loadLODSmooth(
    app,
    gs,
    {
        duration = 3000,
        startBudget = 500000,
        endBudget = 3000000,
        startLodMin = 2,
        endLodMin = 0
    } = {}
) {
    const sceneGs = app.scene.gsplat;
    const startTime = performance.now();

    const refreshGsplat = () => {
        const max = sceneGs.lodRangeMax;
        sceneGs.lodRangeMax = max - 1;
        sceneGs.lodRangeMax = max;
    };

    const step = () => {
        const t = Math.min((performance.now() - startTime) / duration, 1);
        const k = t * t * (3 - 2 * t);

        gs.splatBudget = Math.round(pc.math.lerp(startBudget, endBudget, k));

        const lodMin = Math.round(pc.math.lerp(startLodMin, endLodMin, k));
        if (sceneGs.lodRangeMin !== lodMin) {
            sceneGs.lodRangeMin = lodMin;
            refreshGsplat();
        }

        if (t < 1) requestAnimationFrame(step);
        else {
            gs.splatBudget = endBudget;
            if (sceneGs.lodRangeMin !== endLodMin) {
                sceneGs.lodRangeMin = endLodMin;
                refreshGsplat();
            }
        }
    };

    step();
}

export function waitForGsplatsGate(app, { threshold, assetProgressWeight, onProgress, onReady }) {
    const prevStatsEnabled = !!app.stats.enabled;
    app.stats.enabled = true;

    const assetWeight = clamp01(assetProgressWeight);
    const gsWeight = 1 - assetWeight;

    const target = Math.max(1, threshold);

    const update = () => {
        const gsplats = app.stats?.frame?.gsplats || 0;
        const gs01 = clamp01(gsplats / target);

        onProgress?.(assetWeight + gsWeight * gs01);

        if (gsplats >= threshold) {
            cleanup();
            onReady?.();
        }
    };

    const cleanup = () => {
        app.off('update', update);
        app.stats.enabled = prevStatsEnabled;
    };

    app.on('update', update);
    app.once('destroy', cleanup);
}

export function createDebugStatsOverlayUpdater(
    app,
    { elementId = 'debug-stats', fpsLockerState, gs } = {}
) {
    const element = document.getElementById(elementId);
    if (!element || !app) return () => {};

    const prevStatsEnabled = !!app.stats.enabled;

    let running = false;
    let lastTime = 0;
    let lastRenderCount = 0;

    const isHidden = () => {
        if (document.hidden) return true;
        if (element.classList.contains('hidden')) return true;

        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')
            return true;

        const rect = element.getBoundingClientRect();
        return rect.width === 0 || rect.height === 0;
    };

    const update = () => {
        const now = performance.now();
        if (now - lastTime < 1000) return;

        const renderCount = fpsLockerState?.renderFrameCounter || 0;
        const rendered = renderCount - lastRenderCount;

        const fps = Math.round((rendered * 1000) / (now - lastTime));
        lastRenderCount = renderCount;
        lastTime = now;

        const gsplats = app.stats?.frame?.gsplats;
        const splatsText = typeof gsplats === 'number' ? gsplats.toLocaleString() : 'n/a';

        const budget = gs?.splatBudget;
        const budgetText = typeof budget === 'number' ? Math.round(budget).toLocaleString() : 'n/a';

        const sceneGs = app.scene?.gsplat;
        const lodMin = sceneGs?.lodRangeMin;
        const lodMax = sceneGs?.lodRangeMax;
        const lodText =
            typeof lodMin === 'number' || typeof lodMax === 'number'
                ? `${Math.round(lodMin || 0)}-${Math.round(lodMax || 0)}`
                : 'n/a';

        element.textContent = `FPS: ${fps}\nSplats: ${splatsText}\nBudget: ${budgetText}\nLOD: ${lodText}\n`;
    };

    const start = () => {
        if (running) return;
        running = true;

        app.stats.enabled = true;
        lastTime = performance.now();
        lastRenderCount = fpsLockerState?.renderFrameCounter || 0;

        app.on('update', update);
    };

    const stop = () => {
        if (!running) return;
        running = false;

        app.off('update', update);
        app.stats.enabled = prevStatsEnabled;
    };

    const onVisibilityCheck = () => (isHidden() ? stop() : start());

    let observer = null;
    if (typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(onVisibilityCheck);
        observer.observe(element, { attributes: true, attributeFilter: ['class', 'style'] });
    }

    document.addEventListener('visibilitychange', onVisibilityCheck);

    onVisibilityCheck();

    return () => {
        observer && observer.disconnect();
        document.removeEventListener('visibilitychange', onVisibilityCheck);
        stop();
    };
}

export const getDeviceProfile = ({ isMobile, isTablet, profiles }) =>
    isMobile() ? profiles.phone : isTablet() ? profiles.tablet : profiles.desktop;

export function finalizeStart({
    reveal,
    setSplashProgress,
    hideSplash,
    setupFullscreenButton,
    loadLanguage
}) {
    setSplashProgress(1);
    hideSplash();

    document.getElementById('start-screen')?.remove();
    document.querySelector('.mode-panel')?.classList.remove('hidden');
    document.getElementById('ui-toggles')?.classList.remove('hidden');
    document.getElementById('debug-stats')?.classList.remove('hidden');

    if (reveal) {
        if ('effectTime' in reveal) reveal.effectTime = 0;
        reveal.enabled = true;
    }

    const destroyFullscreen = setupFullscreenButton();
    loadLanguage();

    return destroyFullscreen;
}
