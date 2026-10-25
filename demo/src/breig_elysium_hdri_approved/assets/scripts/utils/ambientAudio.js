export function createAmbientAudio(audioPath, { volume = 0.3, loop = true, fadeInDuration = 2000 } = {}) {
    const audio = new Audio(audioPath);
    audio.loop = loop;
    audio.volume = 0;

    let currentVolume = 0;
    const targetVolume = volume;
    let fadeInterval = null;

    function fadeIn() {
        if (fadeInterval) clearInterval(fadeInterval);

        const steps = 50;
        const stepDuration = fadeInDuration / steps;
        const volumeIncrement = targetVolume / steps;

        fadeInterval = setInterval(() => {
            if (currentVolume < targetVolume) {
                currentVolume = Math.min(currentVolume + volumeIncrement, targetVolume);
                audio.volume = currentVolume;
            } else {
                clearInterval(fadeInterval);
                fadeInterval = null;
            }
        }, stepDuration);
    }

    function fadeOut(duration = 1000) {
        if (fadeInterval) clearInterval(fadeInterval);

        const steps = 50;
        const stepDuration = duration / steps;
        const volumeDecrement = currentVolume / steps;

        fadeInterval = setInterval(() => {
            if (currentVolume > 0) {
                currentVolume = Math.max(currentVolume - volumeDecrement, 0);
                audio.volume = currentVolume;
            } else {
                clearInterval(fadeInterval);
                fadeInterval = null;
                audio.pause();
            }
        }, stepDuration);
    }

    function play() {
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    fadeIn();
                })
                .catch((error) => {
                    console.warn('Ambient audio autoplay prevented:', error.message);
                    document.addEventListener('click', () => {
                        audio.play().then(() => fadeIn()).catch(() => {});
                    }, { once: true });
                });
        }
    }

    function stop(fadeDuration = 1000) {
        fadeOut(fadeDuration);
    }

    function setVolume(vol) {
        const newVolume = Math.max(0, Math.min(1, vol));
        currentVolume = newVolume;
        audio.volume = newVolume;
    }

    function destroy() {
        if (fadeInterval) clearInterval(fadeInterval);
        audio.pause();
        audio.src = '';
    }

    return {
        play,
        stop,
        setVolume,
        destroy,
        get audio() { return audio; }
    };
}
