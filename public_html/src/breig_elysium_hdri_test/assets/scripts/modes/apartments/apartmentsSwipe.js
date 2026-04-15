(function () {
    if (window.ApartmentsSwipeShared) return;
    const isMobileLayout = (ctx) => ctx?.isMobileUiLayout?.() ?? ctx?.isPortrait?.() ?? window.AppDetect?.isPortraitMobile?.() ?? false;

    const onPanelSwipePointerDown = (ctx, e) => {
        beginSwipeTracking(ctx, e, ctx.infoPanel);
    };

    const onScreenSwipePointerDown = (ctx, e) => {
        if (!ctx._active || !ctx.infoPanel?.classList.contains('visible')) return;
        if (e.button !== undefined && e.button !== 0) return;
        beginSwipeTracking(ctx, e, ctx._canvas || null);
    };

    const beginSwipeTracking = (ctx, e, captureEl) => {
        if (!ctx._active || !ctx.infoPanel?.classList.contains('visible')) return;
        if (e.button !== undefined && e.button !== 0) return;
        if (!isMobileLayout(ctx)) return;
        if (ctx._isFloorAnimating) return;
        if (!ctx._selectedApartment) return;

        const rows = ctx.getCurrentFloorRows();
        if (!rows || rows.length < 2) return;

        cancelFloorAnimation(ctx);
        resetSwipeVisualState(ctx);

        ctx._swipeTracking = true;
        ctx._swipePointerId = e.pointerId ?? null;
        ctx._swipeStartY = e.clientY;
        ctx._swipeLastY = e.clientY;
        ctx._swipeInitialFloorIndex = ctx._selectedFloorIndex < 0 ? 0 : ctx._selectedFloorIndex;
        ctx._swipeTargetFloorIndex = -1;
        ctx._swipeDirection = 0;
        ctx._swipeCaptureElement = captureEl || null;

        if (ctx._swipeCaptureElement && ctx._swipePointerId !== null) {
            try {
                ctx._swipeCaptureElement.setPointerCapture(ctx._swipePointerId);
            } catch {}
        }
    };

    const onPanelSwipePointerMove = (ctx, e) => {
        if (!ctx._swipeTracking) return;
        if (ctx._swipePointerId !== null && e.pointerId !== ctx._swipePointerId) return;
        ctx._swipeLastY = e.clientY;
        const dy = ctx._swipeLastY - ctx._swipeStartY;
        const absDy = Math.abs(dy);

        if (absDy > 1) e.preventDefault();

        let direction = 0;
        if (dy > 0) direction = 1;
        else if (dy < 0) direction = -1;
        ctx._swipeDirection = direction;

        const rows = ctx.getCurrentFloorRows();
        const currentIndex = ctx._selectedFloorIndex < 0 ? 0 : ctx._selectedFloorIndex;
        const nextIndex = rows && rows.length ? (currentIndex + direction + rows.length) % rows.length : -1;

        if (!direction || !rows || !rows.length) {
            ctx._swipeTargetFloorIndex = -1;
            if (ctx._floorPanelClone) {
                ctx._floorPanelClone.remove();
                ctx._floorPanelClone = null;
            }
            if (ctx.infoPanel) ctx.infoPanel.classList.remove('is-floor-animating');
            updateSwipeVisual(ctx, dy * 0.2, 0);
            return;
        }

        if (ctx._swipeTargetFloorIndex !== nextIndex || !ctx._floorPanelClone) {
            ctx._swipeTargetFloorIndex = nextIndex;
            prepareSwipePreview(ctx, nextIndex, direction);
        }

        updateSwipeVisual(ctx, dy, direction);
    };

    const onPanelSwipePointerUp = (ctx, e) => {
        if (!ctx._swipeTracking) return;
        if (ctx._swipePointerId !== null && e.pointerId !== ctx._swipePointerId) return;

        const dy = ctx._swipeLastY - ctx._swipeStartY;
        const threshold = Math.max(8, ctx.swipeThreshold || 0);

        ctx._swipeTracking = false;
        if (ctx._swipeCaptureElement && ctx._swipePointerId !== null) {
            try {
                ctx._swipeCaptureElement.releasePointerCapture(ctx._swipePointerId);
            } catch {}
        }
        ctx._swipeCaptureElement = null;
        ctx._swipePointerId = null;
        const rows = ctx.getCurrentFloorRows();
        const currentIndex = ctx._selectedFloorIndex < 0 ? 0 : ctx._selectedFloorIndex;
        const direction = ctx._swipeDirection;
        const canCommit =
            isMobileLayout(ctx) &&
            !ctx._isFloorAnimating &&
            rows &&
            rows.length > 1 &&
            Math.abs(dy) >= threshold &&
            direction !== 0;
        const targetIndex = canCommit ? (currentIndex + direction + rows.length) % rows.length : -1;
        ctx._swipeTargetFloorIndex = targetIndex;

        finishSwipeTransition(ctx, canCommit);
        ctx._swipeInitialFloorIndex = -1;
        ctx._swipeTargetFloorIndex = -1;
        ctx._swipeDirection = 0;
    };

    const getFloorAnimDistance = (ctx) => {
        const panel = ctx.infoPanel;
        const base = panel ? panel.offsetHeight || 0 : 0;
        return Math.max(160, Math.min(420, Math.round(base * 0.9)));
    };

    const prepareSwipePreview = (ctx, targetIndex, direction) => {
        const panel = ctx.infoPanel;
        const rows = ctx.getCurrentFloorRows();
        if (!panel || !rows || targetIndex < 0 || targetIndex >= rows.length) return;

        if (ctx._floorPanelClone) {
            ctx._floorPanelClone.remove();
            ctx._floorPanelClone = null;
        }

        const clone = panel.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('apartments-info-panel-clone', 'visible', 'is-preview');
        clone.style.transition = 'none';
        clone.style.pointerEvents = 'none';
        clone.style.setProperty('--apartments-panel-opacity', '0');
        clone.style.setProperty('--apartments-panel-scale', '0');
        const withId = clone.querySelectorAll('[id]');
        for (let i = 0; i < withId.length; i++) withId[i].removeAttribute('id');

        const row = rows[targetIndex];
        const cloneContainer = clone.querySelector('.panel-container');
        const ui = ctx.getUiShared();
        const cloneElements = ctx.getPanelElementsFromContainer(cloneContainer);
        if (ui?.applyPanelContent) ui.applyPanelContent(cloneElements, ctx._selectedApartment, row);

        const dist = getFloorAnimDistance(ctx);
        clone.style.setProperty('--apartments-panel-drag-y', `${direction > 0 ? -dist : dist}px`);
        panel.parentNode && panel.parentNode.appendChild(clone);
        ctx._floorPanelClone = clone;

        panel.classList.add('is-floor-animating');
    };

    const updateSwipeVisual = (ctx, dy, direction) => {
        const panel = ctx.infoPanel;
        const clone = ctx._floorPanelClone;
        if (!panel) return;

        const dist = getFloorAnimDistance(ctx);
        const clamped = Math.max(-dist, Math.min(dist, dy));
        if (!direction) {
            panel.style.transition = 'none';
            panel.style.setProperty('--apartments-panel-drag-y', `${clamped}px`);
            panel.style.setProperty('--apartments-panel-opacity', '1');
            panel.style.setProperty('--apartments-panel-scale', '1');
            return;
        }

        const progress = Math.min(1, Math.abs(clamped) / dist);
        const outScale = 1 - progress * 0.28;
        const inScale = progress;

        panel.style.transition = 'none';
        panel.style.setProperty('--apartments-panel-drag-y', `${clamped}px`);
        panel.style.setProperty('--apartments-panel-opacity', String(1 - progress));
        panel.style.setProperty('--apartments-panel-scale', String(outScale));

        if (clone && direction) {
            const start = direction > 0 ? -dist : dist;
            clone.style.transition = 'none';
            clone.style.setProperty('--apartments-panel-drag-y', `${start + clamped}px`);
            clone.style.setProperty('--apartments-panel-opacity', String(progress));
            clone.style.setProperty('--apartments-panel-scale', String(inScale));
        }
    };

    const resetSwipeVisualState = (ctx) => {
        const panel = ctx.infoPanel;
        if (panel) {
            panel.style.transition = '';
            panel.style.removeProperty('--apartments-panel-drag-y');
            panel.style.removeProperty('--apartments-panel-opacity');
            panel.style.removeProperty('--apartments-panel-scale');
            panel.classList.remove('is-floor-animating');
        }
        if (ctx._floorPanelClone) {
            ctx._floorPanelClone.remove();
            ctx._floorPanelClone = null;
        }
    };

    const finishSwipeTransition = (ctx, commit) => {
        const panel = ctx.infoPanel;
        const clone = ctx._floorPanelClone;
        if (!panel) {
            resetSwipeVisualState(ctx);
            return;
        }

        const direction = ctx._swipeDirection;
        const targetIndex = ctx._swipeTargetFloorIndex;
        const dist = getFloorAnimDistance(ctx);

        ctx._isFloorAnimating = true;
        if (ctx._floorAnimTimer) clearTimeout(ctx._floorAnimTimer);

        panel.style.transition = 'transform 260ms ease, opacity 260ms ease';
        if (clone) clone.style.transition = 'transform 260ms ease, opacity 260ms ease';

        if (commit && clone && targetIndex >= 0 && direction) {
            panel.style.setProperty('--apartments-panel-drag-y', `${direction > 0 ? dist : -dist}px`);
            panel.style.setProperty('--apartments-panel-opacity', '0');
            panel.style.setProperty('--apartments-panel-scale', '0.72');
            clone.style.setProperty('--apartments-panel-drag-y', '0px');
            clone.style.setProperty('--apartments-panel-opacity', '1');
            clone.style.setProperty('--apartments-panel-scale', '1');
        } else {
            panel.style.setProperty('--apartments-panel-drag-y', '0px');
            panel.style.setProperty('--apartments-panel-opacity', '1');
            panel.style.setProperty('--apartments-panel-scale', '1');
            if (clone) {
                clone.style.setProperty('--apartments-panel-drag-y', `${direction > 0 ? -dist : dist}px`);
                clone.style.setProperty('--apartments-panel-opacity', '0');
                clone.style.setProperty('--apartments-panel-scale', '0');
            }
        }

        ctx._floorAnimTimer = setTimeout(() => {
            ctx._isFloorAnimating = false;
            ctx._floorAnimTimer = 0;

            if (commit && targetIndex >= 0) {
                resetSwipeVisualState(ctx);
                ctx.setFloorByIndex(targetIndex);
            } else {
                resetSwipeVisualState(ctx);
            }
        }, 270);
    };

    const cancelFloorAnimation = (ctx) => {
        if (ctx._floorAnimTimer) {
            clearTimeout(ctx._floorAnimTimer);
            ctx._floorAnimTimer = 0;
        }
        resetSwipeVisualState(ctx);
        ctx._swipeInitialFloorIndex = -1;
        ctx._swipeTargetFloorIndex = -1;
        ctx._swipeDirection = 0;
        ctx._isFloorAnimating = false;
    };

    window.ApartmentsSwipeShared = {
        onPanelSwipePointerDown,
        onScreenSwipePointerDown,
        beginSwipeTracking,
        onPanelSwipePointerMove,
        onPanelSwipePointerUp,
        getFloorAnimDistance,
        prepareSwipePreview,
        updateSwipeVisual,
        resetSwipeVisualState,
        finishSwipeTransition,
        cancelFloorAnimation
    };
})();
