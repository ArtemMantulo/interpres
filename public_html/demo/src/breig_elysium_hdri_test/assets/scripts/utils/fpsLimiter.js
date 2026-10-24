import {
    POINTER_BLOCK_WITH_CLICK_EVENTS,
    bindEvents,
    unbindEvents,
    stopPropagation,
    setToggleState
} from './uiEvents.js';

const ORIGINAL_RENDER = Symbol('fpslocker:originalRender');

export function createFpsLocker(app, options = {}) {
    const {
        toggleElementId = 'fps30',
        cappedFps = 30,
        shouldRender = null,
        renderGate = null
    } = options;

    const state = {
        active: false,
        fps: cappedFps,
        frameMs: 1000 / Math.max(1, cappedFps),
        nextTime: 0,
        rafId: 0,
        renderFrameCounter: 0,
        renderTicket: 0,
        consumedRenderTicket: 0
    };

    const toggleEl = toggleElementId ? document.getElementById(toggleElementId) : null;
    const toggleWrap = toggleEl?.parentElement || null;

    const setActive = (enabled) => {
        const next = !!enabled;
        if (state.active === next) return;

        state.active = next;

        if (state.active) {
            state.fps = cappedFps;
            state.frameMs = 1000 / Math.max(1, cappedFps);
            state.nextTime = performance.now() + state.frameMs;
            state.renderTicket = 0;
            state.consumedRenderTicket = 0;

            if (!document.hidden) state.rafId = requestAnimationFrame(loop);
        } else {
            if (state.rafId) cancelAnimationFrame(state.rafId);
            state.rafId = 0;
            state.renderTicket = 0;
            state.consumedRenderTicket = 0;
        }

        if (toggleEl) {
            toggleEl.classList.toggle('active', state.active);
            setToggleState(toggleEl, state.active);
        }

        window.PcScriptShared?.requestRenderFrame?.(app);
    };

    const onToggleClick = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        setActive(!state.active);
        event?.currentTarget?.blur?.();
    };

    const loop = () => {
        state.rafId = requestAnimationFrame(loop);

        if (!state.active || document.hidden) return;

        const now = performance.now();
        if (now < state.nextTime) return;

        const allow = typeof shouldRender === 'function' ? shouldRender() : true;
        if (allow) {
            state.renderTicket++;
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
            const allowedByGate = typeof renderGate === 'function' ? !!renderGate() : true;
            if (!allowedByGate) return;

            if (state.active) {
                if (state.consumedRenderTicket >= state.renderTicket) return;
                state.consumedRenderTicket = state.renderTicket;
            }

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

    if (toggleEl) {
        toggleEl.addEventListener('click', onToggleClick);
        bindEvents(toggleEl, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
    }

    bindEvents(toggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);

    return {
        state,
        setActive,
        destroy() {
            if (toggleEl) {
                toggleEl.removeEventListener('click', onToggleClick);
                unbindEvents(toggleEl, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            }

            unbindEvents(toggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            setActive(false);

            if (app[ORIGINAL_RENDER]) {
                app.render = app[ORIGINAL_RENDER];
                delete app[ORIGINAL_RENDER];
            }
        }
    };
}
