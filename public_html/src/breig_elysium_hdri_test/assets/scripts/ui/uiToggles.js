import { createScreenshotController } from '../utils/screenshot.js';
import {
    POINTER_BLOCK_WITH_CLICK_EVENTS,
    bindEvents,
    unbindEvents,
    stopPropagation,
    setToggleState
} from '../utils/uiEvents.js';

export function setupUiToggles({ app, isDesktop, onAppDestroy, onQualityChange, onSoundChange } = {}) {
    const uiTogglesPanel = document.getElementById('ui-toggles');
    const screenshotToggle = document.getElementById('ui-screenshot');
    const hideUiToggle = document.getElementById('hide-ui');
    const hideUiToggleWrap = document.getElementById('ui-visibility-toggle');
    const qualityToggle = document.getElementById('quality');
    const qualityToggleWrap = document.getElementById('quality-toggle');
    const soundToggle = document.getElementById('sound');
    const soundToggleWrap = document.getElementById('sound-toggle');
    const screenshotToggleWrap = document.getElementById('ui-screenshot-toggle');
    const screenshotModeControls = document.getElementById('screenshot-mode-controls');
    const screenshotModeCapture = document.getElementById('screenshot-mode-capture');
    const screenshotModeClose = document.getElementById('screenshot-mode-close');
    const seasonToggleWrap = document.getElementById('ui-season-toggle');
    const daytimeToggleWrap = document.getElementById('ui-daytime-toggle');
    const projectionToggleWrap = document.getElementById('ui-projection-toggle');
    const fpsLockerWrap = document.getElementById('fps-locker');
    const debugStats = document.getElementById('debug-stats');
    const debugTrigger = document.getElementById('debug-stats-trigger');

    let screenshotController = null;

    // Elements hidden when the main UI visibility toggle is active.
    // The toggle panel itself and the visibility toggle stay available so the UI can be restored.
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

    const onDebugTriggerClick = () => {
        if (debugStats) debugStats.classList.toggle('hidden');
    };

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

        screenshotController?.sync?.();
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

    const onHideUiToggleClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!hideUiToggle) return;

        if (screenshotController?.isActive?.()) screenshotController.setActive(false);
        setHideUiState(!hideUiToggle.checked);
        syncUiVisibility();
    };

    const onQualityToggleClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!qualityToggle) return;

        setToggleState(qualityToggle, !qualityToggle.checked);
        if (typeof onQualityChange === 'function') onQualityChange({ target: qualityToggle });
        qualityToggle.blur?.();
    };

    const onSoundToggleClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!soundToggle) return;

        setToggleState(soundToggle, !soundToggle.checked);
        if (typeof onSoundChange === 'function') onSoundChange({ target: soundToggle });
    };

    if (debugTrigger && debugStats) debugTrigger.addEventListener('click', onDebugTriggerClick);
    if (qualityToggleWrap) qualityToggleWrap.classList.toggle('hidden', !isDesktop);

    if (hideUiToggle) setHideUiState(hideUiToggle.getAttribute('aria-pressed') === 'true');
    if (screenshotToggle) setToggleState(screenshotToggle, false);
    if (qualityToggle) setToggleState(qualityToggle, qualityToggle.getAttribute('aria-pressed') === 'true');
    if (soundToggle) setToggleState(soundToggle, soundToggle.getAttribute('aria-pressed') === 'true');

    screenshotController = createScreenshotController({
        app,
        screenshotToggle,
        screenshotToggleWrap,
        screenshotModeControls,
        screenshotModeCapture,
        screenshotModeClose,
        uiTogglesPanel,
        hideUiToggle,
        setHideUiState,
        syncUiVisibility,
        onAppDestroy
    });

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

            unbindEvents(seasonToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            unbindEvents(daytimeToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            unbindEvents(projectionToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);

            if (debugTrigger && debugStats) {
                debugTrigger.removeEventListener('click', onDebugTriggerClick);
            }
        });
    }

    return { hideUiToggle, qualityToggle, qualityToggleWrap, soundToggle, soundToggleWrap, syncUiVisibility };
}
