export function setupUiToggles({ app, isDesktop, onAppDestroy, onQualityChange } = {}) {
    const hideUiToggle = document.getElementById('hide-ui');
    const qualityToggle = document.getElementById('quality');
    const qualityToggleWrap = document.getElementById('quality-toggle');

    const uiTargets = [
        document.getElementById('amenities-container'),
        document.querySelector('.mode-panel'),
        document.getElementById('info-panel'),
        document.getElementById('debug-stats'),
        document.getElementById('fps-locker'),
        qualityToggleWrap
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
        if (app && !app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
    };

    if (hideUiToggle) hideUiToggle.addEventListener('change', syncUiVisibility);
    if (qualityToggle && typeof onQualityChange === 'function') {
        qualityToggle.addEventListener('change', onQualityChange);
    }

    if (typeof onAppDestroy === 'function') {
        onAppDestroy(() => {
            if (hideUiToggle) hideUiToggle.removeEventListener('change', syncUiVisibility);
            if (qualityToggle && typeof onQualityChange === 'function') {
                qualityToggle.removeEventListener('change', onQualityChange);
            }
        });
    }

    return { hideUiToggle, qualityToggle, qualityToggleWrap, syncUiVisibility };
}
