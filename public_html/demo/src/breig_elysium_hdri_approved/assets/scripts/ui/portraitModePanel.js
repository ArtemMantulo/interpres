const PORTRAIT_MODE_PANEL_MEDIA =
    '(max-height: 812px) and (orientation: portrait), ' +
    '(max-width: 480px) and (orientation: portrait), ' +
    '(max-aspect-ratio: 3/4) and (orientation: portrait)';

export function setupPortraitModePanelScroll(app, registerDestroy) {
    const container = document.querySelector('.mode-panel .panel-container');
    if (!container) return;

    const media = window.matchMedia(PORTRAIT_MODE_PANEL_MEDIA);
    const DRAG_THRESHOLD = 6;
    const SCROLL_EPSILON = 1;

    let dragging = false;
    let moved = false;
    let suppressClick = false;
    let pointerId = -1;
    let startX = 0;
    let startScrollLeft = 0;

    const isScrollableNow = () => media.matches && container.scrollWidth > container.clientWidth;
    const clearScrollState = () => {
        container.classList.remove('is-scrollable', 'is-scrolled', 'is-scrolled-start', 'is-scrolled-end');
    };
    const updateScrollState = () => {
        if (!media.matches) {
            clearScrollState();
            return;
        }
        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        const scrollLeft = Math.max(0, container.scrollLeft);
        const scrollable = maxScroll > SCROLL_EPSILON;
        const atStart = scrollLeft <= SCROLL_EPSILON;
        const atEnd = scrollLeft >= maxScroll - SCROLL_EPSILON;
        container.classList.toggle('is-scrollable', scrollable);
        container.classList.toggle('is-scrolled', scrollable && !atStart);
        container.classList.toggle('is-scrolled-start', scrollable && atStart);
        container.classList.toggle('is-scrolled-end', scrollable && atEnd);
    };

    const endDrag = (event) => {
        if (!dragging) return;
        if (pointerId !== -1 && event?.pointerId !== undefined && event.pointerId !== pointerId) return;
        dragging = false;
        container.classList.remove('is-dragging');
        suppressClick = moved;
        if (pointerId !== -1) {
            try { container.releasePointerCapture(pointerId); } catch {}
        }
        pointerId = -1;
        updateScrollState();
        if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
    };

    const onPointerDown = (event) => {
        if (!isScrollableNow()) return;
        if (event.button !== undefined && event.button !== 0) return;
        dragging = true;
        moved = false;
        pointerId = event.pointerId ?? -1;
        startX = event.clientX;
        startScrollLeft = container.scrollLeft;
        container.classList.add('is-dragging');
        if (pointerId !== -1) {
            try { container.setPointerCapture(pointerId); } catch {}
        }
    };

    const onPointerMove = (event) => {
        if (!dragging) return;
        if (pointerId !== -1 && event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        if (!moved && Math.abs(dx) < DRAG_THRESHOLD) return;
        moved = true;
        container.scrollLeft = startScrollLeft - dx;
        updateScrollState();
        event.preventDefault();
    };

    const onClickCapture = (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
    };

    const onMediaChange = () => {
        if (!media.matches) {
            dragging = false;
            moved = false;
            suppressClick = false;
            pointerId = -1;
            container.classList.remove('is-dragging');
        }
        updateScrollState();
    };
    const onContainerScroll = () => updateScrollState();
    const onResize = () => updateScrollState();
    const onUiReady = () => { updateScrollState(); requestAnimationFrame(updateScrollState); };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove, { passive: false });
    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);
    container.addEventListener('lostpointercapture', endDrag);
    container.addEventListener('click', onClickCapture, true);
    container.addEventListener('scroll', onContainerScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    app.on('ui:ready', onUiReady);

    if (typeof media.addEventListener === 'function') media.addEventListener('change', onMediaChange);
    else if (typeof media.addListener === 'function') media.addListener(onMediaChange);

    updateScrollState();
    requestAnimationFrame(updateScrollState);

    registerDestroy(() => {
        container.removeEventListener('pointerdown', onPointerDown);
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerup', endDrag);
        container.removeEventListener('pointercancel', endDrag);
        container.removeEventListener('lostpointercapture', endDrag);
        container.removeEventListener('click', onClickCapture, true);
        container.removeEventListener('scroll', onContainerScroll);
        window.removeEventListener('resize', onResize);
        app.off('ui:ready', onUiReady);
        if (typeof media.removeEventListener === 'function') media.removeEventListener('change', onMediaChange);
        else if (typeof media.removeListener === 'function') media.removeListener(onMediaChange);
    });
}
