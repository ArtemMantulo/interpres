import { isMobile } from './detect.js';
import {
    POINTER_BLOCK_WITH_CLICK_EVENTS,
    bindEvents,
    unbindEvents,
    stopPropagation,
    setToggleState
} from './uiEvents.js';

const CONTROLS_SLIDE_DURATION_MS = 260;
const FLASH_DURATION_MS = 480;

const waitForAnimationFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const waitFrames = async (count) => {
    for (let i = 0; i < count; i++) await waitForAnimationFrame();
};

const dataUrlToBlob = (dataUrl) => {
    const parts = String(dataUrl || '').split(',');
    const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/png';
    const binary = atob(parts[1] || '');
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
};

const triggerBlobDownload = (blob, filename) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const getOrbit = (app) => app?.root?.findByName?.('Camera')?.script?.orbitCamera || null;

const getScreenshotFilename = (now = new Date()) => {
    const datePart = [
        String(now.getDate()).padStart(2, '0'),
        String(now.getMonth() + 1).padStart(2, '0'),
        now.getFullYear()
    ].join('');

    const timePart = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0')
    ].join('');

    return `Breig_Screenshot_${datePart}_${timePart}.png`;
};

export function createScreenshotController({
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
} = {}) {
    let active = false;
    let capturing = false;
    let restoreHidden = false;
    let restoreAutoRotate = null;

    const isMobileDevice = isMobile();

    const sync = () => {
        if (uiTogglesPanel) uiTogglesPanel.classList.toggle('screenshot-mode-hidden', active);

        if (screenshotModeControls) {
            screenshotModeControls.classList.toggle('hidden', !active);
            screenshotModeControls.setAttribute('aria-hidden', active ? 'false' : 'true');
            screenshotModeControls.classList.toggle('is-capturing', active && capturing);
        }

        if (screenshotToggle) setToggleState(screenshotToggle, active);
    };

    const playFlash = async () => {
        if (!document.body) return;

        document.body.classList.remove('screenshot-flash-active');
        void document.body.offsetWidth;
        document.body.classList.add('screenshot-flash-active');
        await wait(FLASH_DURATION_MS);
        document.body.classList.remove('screenshot-flash-active');
    };

    const captureScreenshot = async () => {
        const canvas = app?.graphicsDevice?.canvas || document.getElementById('application-canvas');
        if (!canvas || !active || capturing) return;

        capturing = true;
        sync();
        window.PcScriptShared?.requestRenderFrame?.(app);

        try {
            await wait(CONTROLS_SLIDE_DURATION_MS);
            await waitFrames(isMobileDevice ? 1 : 2);

            let blob = null;
            if (isMobileDevice) {
                blob = dataUrlToBlob(canvas.toDataURL('image/png'));
            } else if (canvas.toBlob) {
                blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            } else {
                blob = dataUrlToBlob(canvas.toDataURL('image/png'));
            }

            triggerBlobDownload(blob, getScreenshotFilename());
            await playFlash();
        } finally {
            capturing = false;
            sync();
            window.PcScriptShared?.requestRenderFrame?.(app);
        }
    };

    const setActive = (nextState) => {
        const next = !!nextState;
        if (active === next) return;

        active = next;
        const orbit = getOrbit(app);

        if (active) {
            restoreHidden = !!hideUiToggle?.checked;
            restoreAutoRotate = orbit ? !!orbit.autoRotateEnabled : null;

            if (orbit) {
                if (orbit.setAutoRotateEnabled) orbit.setAutoRotateEnabled(false);
                orbit.autoRotateEnabled = false;
            }

            setHideUiState?.(true);
        } else {
            if (orbit && restoreAutoRotate !== null) {
                if (orbit.setAutoRotateEnabled) orbit.setAutoRotateEnabled(restoreAutoRotate);
                orbit.autoRotateEnabled = restoreAutoRotate;
            }

            restoreAutoRotate = null;
            setHideUiState?.(restoreHidden);
        }

        syncUiVisibility?.();
    };

    const onToggleClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setActive(true);
        screenshotToggle?.blur?.();
    };

    const onCaptureClick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await captureScreenshot();
        screenshotModeCapture?.blur?.();
    };

    const onCloseClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setActive(false);
        screenshotModeClose?.blur?.();
    };

    if (screenshotToggle) screenshotToggle.addEventListener('click', onToggleClick);
    if (screenshotModeCapture) screenshotModeCapture.addEventListener('click', onCaptureClick);
    if (screenshotModeClose) screenshotModeClose.addEventListener('click', onCloseClick);

    bindEvents(screenshotToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
    bindEvents(screenshotModeControls, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);

    if (typeof onAppDestroy === 'function') {
        onAppDestroy(() => {
            if (screenshotToggle) screenshotToggle.removeEventListener('click', onToggleClick);
            if (screenshotModeCapture) screenshotModeCapture.removeEventListener('click', onCaptureClick);
            if (screenshotModeClose) screenshotModeClose.removeEventListener('click', onCloseClick);

            unbindEvents(screenshotToggleWrap, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
            unbindEvents(screenshotModeControls, POINTER_BLOCK_WITH_CLICK_EVENTS, stopPropagation);
        });
    }

    return {
        isActive: () => active,
        setActive,
        sync
    };
}
