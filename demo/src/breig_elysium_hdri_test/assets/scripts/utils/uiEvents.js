export const POINTER_BLOCK_EVENTS = [
    'pointerdown',
    'pointerup',
    'pointercancel',
    'mousedown',
    'mouseup',
    'touchstart',
    'touchend'
];

export const POINTER_BLOCK_WITH_CLICK_EVENTS = [...POINTER_BLOCK_EVENTS, 'click'];

export const bindEvents = (el, events, handler) => {
    if (!el) return;
    for (let i = 0; i < events.length; i++) el.addEventListener(events[i], handler);
};

export const unbindEvents = (el, events, handler) => {
    if (!el) return;
    for (let i = 0; i < events.length; i++) el.removeEventListener(events[i], handler);
};

export const stopPropagation = (event) => event.stopPropagation();

export const setToggleState = (el, enabled) => {
    if (!el) return;
    const isEnabled = !!enabled;
    el.checked = isEnabled;
    el.classList.toggle('is-on', isEnabled);
    el.classList.toggle('is-off', !isEnabled);
    el.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
};
