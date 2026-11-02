export function createAmbientAudio(audioPath, { volume = 0.3, loop = true, fadeInDuration = 2000 } = {}) {
    const audio = new Audio(audioPath);
    audio.loop = loop;
    audio.volume = 0;

    let currentVolume = 0;
    const targetVolume = volume;
    let rafId = 0;
    let fadeStart = 0;
    let fadeFrom = 0;
    let fadeTo = 0;
    let fadeDuration = 0;
    let destroyed = false;

    audio.addEventListener('error', () => {
        console.warn('Ambient audio failed to load:', audioPath);
    });

    function startFade(from, to, duration) {
        if (destroyed) return;
        if (rafId) cancelAnimationFrame(rafId);
        fadeFrom = from;
        fadeTo = to;
        fadeDuration = Math.max(1, duration);
        fadeStart = performance.now();
        rafId = requestAnimationFrame(fadeTick);
    }

    function fadeTick(now) {
        if (destroyed) return;
        const t = Math.min((now - fadeStart) / fadeDuration, 1);
        currentVolume = fadeFrom + (fadeTo - fadeFrom) * t;
        audio.volume = Math.max(0, Math.min(1, currentVolume));

        if (t < 1) {
            rafId = requestAnimationFrame(fadeTick);
        } else {
            rafId = 0;
            if (fadeTo === 0) audio.pause();
        }
    }

    function play() {
        if (destroyed) return;
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => startFade(0, targetVolume, fadeInDuration))
                .catch((error) => {
                    console.warn('Ambient audio autoplay prevented:', error.message);
                    document.addEventListener('click', () => {
                        if (destroyed) return;
                        audio.play()
                            .then(() => startFade(0, targetVolume, fadeInDuration))
                            .catch(() => {});
                    }, { once: true });
                });
        }
    }

    function stop(duration = 1000) {
        startFade(currentVolume, 0, duration);
    }

    function destroy() {
        destroyed = true;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        audio.pause();
        audio.src = '';
    }

    return {
        play,
        stop,
        destroy,
        get audio() { return audio; }
    };
}
