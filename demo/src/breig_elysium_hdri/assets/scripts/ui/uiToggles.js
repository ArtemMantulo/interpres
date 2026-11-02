export function setupUiToggles({ app, isDesktop, onAppDestroy, onQualityChange, onSoundChange } = {}) {
    const hideUiToggle = document.getElementById('hide-ui');
    const qualityToggle = document.getElementById('quality');
    const qualityToggleWrap = document.getElementById('quality-toggle');
    const soundToggle = document.getElementById('sound');
    const soundToggleWrap = document.getElementById('sound-toggle');

    const uiTargets = [
        document.getElementById('amenities-container'),
        document.querySelector('.mode-panel'),
        document.getElementById('info-panel'),
        document.getElementById('debug-stats'),
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
        if (app && !app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
    };

    // Prevent only sound toggle from affecting camera
    const preventSoundTogglePropagation = (e) => {
        e.stopPropagation();
    };
    
    if (hideUiToggle) hideUiToggle.addEventListener('change', syncUiVisibility);
    if (qualityToggle && typeof onQualityChange === 'function') {
        qualityToggle.addEventListener('change', onQualityChange);
    }
    if (soundToggle && typeof onSoundChange === 'function') {
        soundToggle.addEventListener('change', onSoundChange);
        // Prevent camera from stopping when sound toggle is clicked
        soundToggleWrap.addEventListener('mousedown', preventSoundTogglePropagation);
        soundToggleWrap.addEventListener('mouseup', preventSoundTogglePropagation);
        soundToggleWrap.addEventListener('touchstart', preventSoundTogglePropagation);
        soundToggleWrap.addEventListener('touchend', preventSoundTogglePropagation);
        soundToggleWrap.addEventListener('click', preventSoundTogglePropagation);
    }

    if (typeof onAppDestroy === 'function') {
        onAppDestroy(() => {
            if (hideUiToggle) hideUiToggle.removeEventListener('change', syncUiVisibility);
            if (qualityToggle && typeof onQualityChange === 'function') {
                qualityToggle.removeEventListener('change', onQualityChange);
            }
            if (soundToggle && typeof onSoundChange === 'function') {
                soundToggle.removeEventListener('change', onSoundChange);
                soundToggleWrap.removeEventListener('mousedown', preventSoundTogglePropagation);
                soundToggleWrap.removeEventListener('mouseup', preventSoundTogglePropagation);
                soundToggleWrap.removeEventListener('touchstart', preventSoundTogglePropagation);
                soundToggleWrap.removeEventListener('touchend', preventSoundTogglePropagation);
                soundToggleWrap.removeEventListener('click', preventSoundTogglePropagation);
            }
        });
    }

    return { hideUiToggle, qualityToggle, qualityToggleWrap, soundToggle, soundToggleWrap, syncUiVisibility };
}
