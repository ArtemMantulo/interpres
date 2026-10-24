const ua = ((navigator.userAgent || navigator.vendor || window.opera || '') + '').toLowerCase();
const isTouchMac = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;

export function isTablet() {
    return /ipad|tablet/.test(ua) || isTouchMac || (/android/.test(ua) && !/mobile/.test(ua));
}

export function isMobile() {
    return /iphone|ipod/.test(ua) || (/android/.test(ua) && /mobile/.test(ua)) || isTablet();
}

if (typeof window !== 'undefined') {
    const api = window.AppDetect || {};
    api.isTablet = isTablet;
    api.isMobile = isMobile;
    window.AppDetect = api;
}
