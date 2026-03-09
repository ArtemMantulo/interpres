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
    const uiRestoreToggleWrap = document.getElementById('ui-restore-wrap');
    const uiRestoreToggle = document.getElementById('ui-restore-toggle');
    const hideUiToggle = document.getElementById('hide-ui');
    const hideUiToggleWrap = document.getElementById('ui-visibility-toggle');
    const qualityToggle = document.getElementById('quality');
    const qualityToggleWrap = document.getElementById('quality-toggle');
    const soundToggle = document.getElementById('sound');
    const soundToggleWrap = document.getElementById('sound-toggle');

    const uiTargets = [
        document.getElementById('amenities-container'),
        document.querySelector('.mode-panel'),
        document.getElementById('info-panel'),
        document.getElementById('debug-stats'),
        document.getElementById('fullscreen-button'),
        uiTogglesPanel,
        document.getElementById('fps-locker'),
        qualityToggleWrap,
        soundToggleWrap
    ];

    if (qualityToggleWrap) qualityToggleWrap.classList.toggle('hidden', !isDesktop);

    const syncUiVisibility = () => {
        const hidden = !!hideUiToggle?.checked;
        for (let i = 0; i < uiTargets.length; i++) {
            const el = uiTargets[i];
            if (!el) continue;
            const forceHidden = el === qualityToggleWrap && !isDesktop;
            el.classList.toggle('hidden', hidden || forceHidden);
        }
        if (uiRestoreToggleWrap) uiRestoreToggleWrap.classList.toggle('hidden', !hidden);
        if (app && !app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
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

    const onRestoreUiClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!hideUiToggle) return;
        setHideUiState(false);
        syncUiVisibility();
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
    if (uiRestoreToggle) {
        uiRestoreToggle.addEventListener('click', onRestoreUiClick);
        bindEvents(uiRestoreToggleWrap, POINTER_BLOCK_EVENTS, stopPropagation);
    }

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
            if (uiRestoreToggle) {
                uiRestoreToggle.removeEventListener('click', onRestoreUiClick);
                unbindEvents(uiRestoreToggleWrap, POINTER_BLOCK_EVENTS, stopPropagation);
            }
        });
    }

    return { hideUiToggle, qualityToggle, qualityToggleWrap, soundToggle, soundToggleWrap, syncUiVisibility };
}
