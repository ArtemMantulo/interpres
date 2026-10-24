const POINTER_BLOCK_EVENTS = ['mousedown', 'mouseup', 'touchstart', 'touchend'];
const POINTER_BLOCK_WITH_CLICK_EVENTS = [...POINTER_BLOCK_EVENTS, 'click'];

const bindEvents = (el, events, handler) => {
    if (!el) return;
    for (let i = 0; i < events.length; i++) el.addEventListener(events[i], handler);
};

const unbindEvents = (el, events, handler) => {
    if (!el) return;
    for (let i = 0; i < events.length; i++) el.removeEventListener(events[i], handler);
};

const stopPropagation = (e) => e.stopPropagation();

const setToggleState = (el, enabled) => {
    if (!el) return;
    const isEnabled = !!enabled;
    el.checked = isEnabled;
    el.classList.toggle('is-on', isEnabled);
    el.classList.toggle('is-off', !isEnabled);
    el.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
};

export function setupUiToggles({ app, isDesktop, onAppDestroy, onQualityChange, onSoundChange } = {}) {
    const uiTogglesPanel = document.getElementById('ui-toggles');
    const hideUiToggle = document.getElementById('hide-ui');
    const hideUiToggleWrap = document.getElementById('ui-visibility-toggle');
    const qualityToggle = document.getElementById('quality');
    const qualityToggleWrap = document.getElementById('quality-toggle');
    const soundToggle = document.getElementById('sound');
    const soundToggleWrap = document.getElementById('sound-toggle');
    const screenshotToggleWrap = document.getElementById('ui-screenshot-toggle');
    const seasonToggleWrap = document.getElementById('ui-season-toggle');
    const daytimeToggleWrap = document.getElementById('ui-daytime-toggle');
    const projectionToggleWrap = document.getElementById('ui-projection-toggle');
    const fpsLockerWrap = document.getElementById('fps-locker');

    // Elements hidden when UI is toggled off.
    // ui-toggles panel itself and ui-visibility-toggle are intentionally excluded —
    // they always stay visible so the user can restore the UI.
    // debug-stats is excluded — it has its own independent toggle.
    const uiTargets = [
        document.getElementById('amenities-container'),
        document.getElementById('apartments-container'),
        document.querySelector('.mode-panel'),
        document.getElementById('floor-panel'),
        document.getElementById('amenities-info-panel'),
        document.getElementById('apartments-info-panel'),
        document.getElementById('apartments-info-panel-mobile'),
        document.getElementById('apartments-plan-panel'),
        fpsLockerWrap,
        qualityToggleWrap,
        soundToggleWrap,
        screenshotToggleWrap,
        seasonToggleWrap,
        daytimeToggleWrap,
        projectionToggleWrap
    ];

    // Debug-stats independent toggle — bottom-left corner tap zone
    const debugStats = document.getElementById('debug-stats');
    const debugTrigger = document.getElementById('debug-stats-trigger');
    if (debugTrigger && debugStats) {
        debugTrigger.addEventListener('click', () => {
            debugStats.classList.toggle('hidden');
        });
    }

    if (qualityToggleWrap) qualityToggleWrap.classList.toggle('hidden', !isDesktop);

    const syncUiVisibility = () => {
        const hidden = !!hideUiToggle?.checked;
        for (let i = 0; i < uiTargets.length; i++) {
            const el = uiTargets[i];
            if (!el) continue;
            const forceHidden = el === qualityToggleWrap && !isDesktop;
            const keepHiddenByState =
                !hidden && el.id === 'floor-panel' && el.getAttribute('aria-hidden') === 'true';
            el.classList.toggle('hidden', hidden || forceHidden || keepHiddenByState);
        }
        window.PcScriptShared?.requestRenderFrame?.(app);
    };

    const setHideUiState = (hidden) => {
        if (!hideUiToggle) return;
        const isHidden = !!hidden;
        hideUiToggle.checked = isHidden;
        hideUiToggle.classList.toggle('is-on', !isHidden);
        hideUiToggle.classList.toggle('is-off', isHidden);
        hideUiToggle.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    };

    const onHideUiToggleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!hideUiToggle) return;
        setHideUiState(!hideUiToggle.checked);
        syncUiVisibility();
    };

    const onQualityToggleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!qualityToggle) return;
        setToggleState(qualityToggle, !qualityToggle.checked);
        if (typeof onQualityChange === 'function') onQualityChange({ target: qualityToggle });
    };

    const onSoundToggleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!soundToggle) return;
        setToggleState(soundToggle, !soundToggle.checked);
        if (typeof onSoundChange === 'function') onSoundChange({ target: soundToggle });
    };

    if (hideUiToggle) setHideUiState(hideUiToggle.getAttribute('aria-pressed') === 'true');
    if (qualityToggle) setToggleState(qualityToggle, qualityToggle.getAttribute('aria-pressed') === 'true');
    if (soundToggle) setToggleState(soundToggle, soundToggle.getAttribute('aria-pressed') === 'true');

    if (hideUiToggle) {
        hideUiToggle.addEventListener('click', onHideUiToggleClick);
        bindEvents(hideUiToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
    }
    if (qualityToggle) {
        qualityToggle.addEventListener('click', onQualityToggleClick);
        bindEvents(qualityToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
    }
    if (soundToggle) {
        soundToggle.addEventListener('click', onSoundToggleClick);
        bindEvents(soundToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
    }
    bindEvents(screenshotToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
    bindEvents(seasonToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
    bindEvents(daytimeToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
    bindEvents(projectionToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
    if (typeof onAppDestroy === 'function') {
        onAppDestroy(() => {
            if (hideUiToggle) {
                hideUiToggle.removeEventListener('click', onHideUiToggleClick);
                unbindEvents(hideUiToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            }
            if (qualityToggle) {
                qualityToggle.removeEventListener('click', onQualityToggleClick);
                unbindEvents(qualityToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            }
            if (soundToggle) {
                soundToggle.removeEventListener('click', onSoundToggleClick);
                unbindEvents(soundToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            }
            unbindEvents(screenshotToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            unbindEvents(seasonToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            unbindEvents(daytimeToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            unbindEvents(projectionToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
        });
    }

    return { hideUiToggle, qualityToggle, qualityToggleWrap, soundToggle, soundToggleWrap, syncUiVisibility };
}
