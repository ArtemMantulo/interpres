const IDLE_FPS = 15;
const IDLE_FRAME_MS = 1000 / IDLE_FPS;

export function createApartmentOverlayPulse(app, { getOrbit }) {
    let material = null;
    let pulseStartMs = 0;
    let renderGateNextMs = 0;

    const onVisualMaterial = (mat) => {
        material = mat || null;
        renderGateNextMs = 0;
        if (!material) return;
        pulseStartMs = performance.now();
        if (!document.hidden) window.PcScriptShared?.requestRenderFrame?.(app);
    };

    app.on('apartments:visualMaterial', onVisualMaterial);

    const renderGate = () => {
        if (!material) {
            renderGateNextMs = 0;
            return true;
        }
        const orbit = getOrbit();
        const isCameraMoving = !!orbit?.movedThisFrame || !!orbit?.isUserInteracting?.();
        if (isCameraMoving) {
            renderGateNextMs = 0;
            return true;
        }

        const now = performance.now();
        if (now < renderGateNextMs) return false;
        renderGateNextMs = now + IDLE_FRAME_MS;
        return true;
    };

    const update = () => {
        if (!material) return;
        const elapsedSec = (performance.now() - pulseStartMs) * 0.001;
        const nextOpacity = 0.4 + 0.1 * Math.sin(elapsedSec * Math.PI);
        if (Math.abs((material.opacity || 0) - nextOpacity) > 1e-3) {
            material.opacity = nextOpacity;
            material.update();
        }
    };

    const isActive = () => !!material;

    const destroy = () => {
        app.off('apartments:visualMaterial', onVisualMaterial);
        material = null;
    };

    return { renderGate, update, isActive, destroy };
}
