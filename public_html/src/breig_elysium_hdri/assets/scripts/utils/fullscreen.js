export function setupFullscreenButton() {
    const btn = document.getElementById('fullscreen-button');
    if (!btn) return () => {};

    const ua = navigator.userAgent || '';
    const el = document.documentElement;

    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isTelegram = /Telegram/.test(ua);
    const isAndroidWV = /Android/.test(ua) && /wv/.test(ua);
    const isIframe = window !== window.parent;

    const canDomFs = !!(
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen
    );
    const domEnabled = !!(
        document.fullscreenEnabled ||
        document.webkitFullscreenEnabled ||
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled
    );

    btn.style.display = 'none';

    if (isIOS || isTelegram || isAndroidWV || !canDomFs || (isIframe && !domEnabled))
        return () => {};

    const enterIcon = 'assets/images/icons/ui_fullscreen.png';
    const exitIcon = 'assets/images/icons/ui_fullscreen_out.png';

    const getDomFs = () =>
        !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.mozFullscreenElement ||
            document.msFullscreenElement
        );

    const getBrowserFs = () => {
        const sw = screen.width | 0,
            sh = screen.height | 0;
        const iw = window.innerWidth | 0,
            ih = window.innerHeight | 0;
        return !!(sw && sh && Math.abs(sw - iw) <= 2 && Math.abs(sh - ih) <= 2);
    };

    const req = () =>
        (
            el.requestFullscreen ||
            el.webkitRequestFullscreen ||
            el.mozRequestFullScreen ||
            el.msRequestFullscreen
        ).call(el);
    const exit = () => {
        const fn =
            document.exitFullscreen ||
            document.webkitExitFullscreen ||
            document.mozCancelFullScreen ||
            document.mozExitFullscreen ||
            document.msExitFullscreen;
        fn && fn.call(document);
    };

    const sync = () => {
        const domFs = getDomFs();
        const browserFs = getBrowserFs();

        if (browserFs && !domFs) {
            btn.style.display = 'none';
            return;
        }

        btn.style.display = 'block';
        btn.style.backgroundImage = `url(${domFs ? exitIcon : enterIcon})`;
    };

    const onClick = () => (getDomFs() ? exit() : req());
    const onKeyDown = (e) => {
        if (!window.UiKeys?.isActivateKey?.(e)) return;
        e.preventDefault();
        onClick();
    };
    const onResize = () => sync();

    btn.addEventListener('click', onClick);
    btn.addEventListener('keydown', onKeyDown);

    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    document.addEventListener('mozfullscreenchange', sync);
    document.addEventListener('MSFullscreenChange', sync);

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    sync();

    return () => {
        btn.removeEventListener('click', onClick);
        btn.removeEventListener('keydown', onKeyDown);

        document.removeEventListener('fullscreenchange', sync);
        document.removeEventListener('webkitfullscreenchange', sync);
        document.removeEventListener('mozfullscreenchange', sync);
        document.removeEventListener('MSFullscreenChange', sync);

        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
    };
}
