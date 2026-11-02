const ORIGINAL_RENDER = Symbol('fpslocker:originalRender');

export function createFpsLocker(app, options = {}) {
    const { toggleElementId = 'fps30', cappedFps = 30, shouldRender = null } = options;

    const state = {
        active: false,
        fps: cappedFps,
        frameMs: 1000 / Math.max(1, cappedFps),
        nextTime: 0,
        rafId: 0,
        renderFrameCounter: 0
    };

    const toggleEl = toggleElementId ? document.getElementById(toggleElementId) : null;

    const setActive = (enabled) => {
        const next = !!enabled;
        if (state.active === next) return;

        state.active = next;

        if (state.active) {
            state.fps = cappedFps;
            state.frameMs = 1000 / Math.max(1, cappedFps);
            state.nextTime = performance.now() + state.frameMs;

            if (!document.hidden) state.rafId = requestAnimationFrame(loop);
        } else {
            if (state.rafId) cancelAnimationFrame(state.rafId);
            state.rafId = 0;
        }

        if (toggleEl) toggleEl.classList.toggle('active', state.active);
    };

    const onToggleClick = () => setActive(!state.active);

    const loop = () => {
        state.rafId = requestAnimationFrame(loop);

        if (!state.active) return;
        if (document.hidden) return;

        const now = performance.now();
        if (now < state.nextTime) return;

        const allow = typeof shouldRender === 'function' ? shouldRender() : true;
        if (allow) {
            if ('renderNextFrame' in app) app.renderNextFrame = true;
            else app.render();
        }

        state.nextTime += state.frameMs;

        if (now - state.nextTime > state.frameMs * 2) {
            state.nextTime = now + state.frameMs;
        }
    };

    if (!app[ORIGINAL_RENDER]) {
        app[ORIGINAL_RENDER] = app.render.bind(app);
        app.render = function () {
            state.renderFrameCounter++;
            return app[ORIGINAL_RENDER]();
        };
    }

    const onVisibilityChange = () => {
        if (!state.active) return;
        if (document.hidden) {
            if (state.rafId) cancelAnimationFrame(state.rafId);
            state.rafId = 0;
            return;
        }
        state.nextTime = performance.now() + state.frameMs;
        if (!state.rafId) state.rafId = requestAnimationFrame(loop);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    if (toggleEl) toggleEl.addEventListener('click', onToggleClick);

    return {
        state,
        setActive,
        destroy() {
            if (toggleEl) toggleEl.removeEventListener('click', onToggleClick);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            setActive(false);

            if (app[ORIGINAL_RENDER]) {
                app.render = app[ORIGINAL_RENDER];
                delete app[ORIGINAL_RENDER];
            }
        }
    };
}
