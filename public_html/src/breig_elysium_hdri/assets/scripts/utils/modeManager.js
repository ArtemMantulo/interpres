const ACTIVATE_KEYS = new Set(['Enter', ' ']);

const isActivateKey = (e) => {
    if (!e) return false;
    if (ACTIVATE_KEYS.has(e.key)) return true;
    return e.key === 'Spacebar';
};

export function createModeManager(app, options = {}) {
    const {
        modes = [],
        initialMode = '0',
        buttonRoot = null,
        buttonSelector = '[data-mode]'
    } = options;

    const modeMap = new Map();
    for (let i = 0; i < modes.length; i++) {
        const mode = modes[i];
        if (!mode || mode.id == null) continue;
        modeMap.set(String(mode.id), mode);
    }

    const listeners = new Set();
    const controllers = new Map();
    const boundButtons = [];

    const state = {
        mode: String(initialMode),
        prevMode: null
    };

    const updateButtons = () => {
        for (let i = 0; i < boundButtons.length; i++) {
            const btn = boundButtons[i];
            const btnMode = btn?.dataset?.mode;
            if (!btnMode) continue;
            const isActive = btnMode === state.mode;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
    };

    const notify = (nextMode, prevMode, source) => {
        if (app?.fire) app.fire('mode:change', nextMode, prevMode, source || 'modeManager');
        listeners.forEach((fn) => {
            try {
                fn(nextMode, prevMode, source || 'modeManager');
            } catch (err) {
                console.warn('Mode listener failed:', err);
            }
        });
    };

    const setMode = (nextMode, meta = {}) => {
        const next = String(nextMode ?? '');
        if (!next) return false;
        if (modeMap.size && !modeMap.has(next)) modeMap.set(next, { id: next, label: next });

        const prev = state.mode;
        if (prev === next) {
            if (!meta.allowRepeat) return false;
            const sameController = controllers.get(next);
            if (sameController?.enter) {
                sameController.enter({
                    fromMode: prev,
                    toMode: next,
                    app,
                    meta: { ...meta, repeat: true }
                });
            }
            notify(next, prev, meta.source || 'modeManager:repeat');
            return true;
        }

        const prevController = controllers.get(prev);
        if (prevController?.exit) prevController.exit({ fromMode: prev, toMode: next, app, meta });

        state.prevMode = prev;
        state.mode = next;
        updateButtons();

        const nextController = controllers.get(next);
        if (nextController?.enter) nextController.enter({ fromMode: prev, toMode: next, app, meta });

        notify(next, prev, meta.source);
        return true;
    };

    const setModeSilently = (nextMode) => {
        const next = String(nextMode ?? '');
        if (!next || state.mode === next) return false;
        state.prevMode = state.mode;
        state.mode = next;
        updateButtons();
        return true;
    };

    const getMode = () => state.mode;
    const getPreviousMode = () => state.prevMode;

    const restorePreviousMode = (fallbackMode = '0', meta = {}) => {
        const next = state.prevMode || fallbackMode;
        return setMode(next, meta);
    };

    const subscribe = (handler) => {
        if (typeof handler !== 'function') return () => {};
        listeners.add(handler);
        return () => listeners.delete(handler);
    };

    const registerMode = (modeId, controller = {}) => {
        const id = String(modeId ?? '');
        if (!id) return () => {};
        modeMap.set(id, modeMap.get(id) || { id, label: id });
        controllers.set(id, controller);
        if (controller?.init) controller.init({ app, modeId: id, manager: api });
        if (id === state.mode && controller?.enter) {
            controller.enter({ fromMode: null, toMode: id, app, meta: { source: 'register' } });
        }
        return () => {
            const current = controllers.get(id);
            if (current?.destroy) current.destroy({ app, modeId: id, manager: api });
            controllers.delete(id);
        };
    };

    const bindModeButtons = (root = null) => {
        const targetRoot =
            root ||
            (typeof buttonRoot === 'string' ? document.querySelector(buttonRoot) : buttonRoot) ||
            document;
        if (!targetRoot) return () => {};

        const buttons = Array.from(targetRoot.querySelectorAll(buttonSelector));
        if (!buttons.length) return () => {};

        const onClick = (e) => {
            const btn = e.currentTarget;
            const mode = btn?.dataset?.mode;
            if (!mode) return;
            e.preventDefault();
            setMode(mode, { source: 'modeButton', allowRepeat: true });
        };

        const onKeyDown = (e) => {
            if (!isActivateKey(e)) return;
            e.preventDefault();
            onClick(e);
        };

        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            if (!btn) continue;
            btn.addEventListener('click', onClick);
            btn.addEventListener('keydown', onKeyDown);
            boundButtons.push(btn);
        }

        updateButtons();

        return () => {
            for (let i = 0; i < buttons.length; i++) {
                const btn = buttons[i];
                if (!btn) continue;
                btn.removeEventListener('click', onClick);
                btn.removeEventListener('keydown', onKeyDown);
            }
        };
    };

    const destroy = () => {
        controllers.forEach((controller, modeId) => {
            if (controller?.destroy) controller.destroy({ app, modeId, manager: api });
        });
        controllers.clear();
        listeners.clear();
        boundButtons.length = 0;
    };

    const api = {
        getMode,
        getPreviousMode,
        setMode,
        setModeSilently,
        restorePreviousMode,
        subscribe,
        registerMode,
        bindModeButtons,
        destroy
    };

    return api;
}
