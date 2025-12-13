export function isMobile() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /android|iphone|ipad|ipod/i.test(ua);
}

export function isIOS() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /iphone|ipad|ipod/i.test(ua);
}

export function isAndroid() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /android/i.test(ua);
}

export function isOculusBrowser() {
    const ua = navigator.userAgent || '';
    return /OculusBrowser/i.test(ua);
}

export function isVRHeadset() {
    const ua = navigator.userAgent || '';
    return /Quest|Oculus|Pico|XR/i.test(ua) || isOculusBrowser();
}