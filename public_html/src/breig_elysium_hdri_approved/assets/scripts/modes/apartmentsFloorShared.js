(function () {
    if (window.ApartmentsFloorShared) return;

    const syncFloorPanelWidth = (ctx) => {
        if (!ctx.floorPanel) return;
        const modePanel = document.querySelector('.mode-panel');
        if (!modePanel || modePanel.classList.contains('hidden')) return;
        const rect = modePanel.getBoundingClientRect();
        if (!rect || !isFinite(rect.width) || rect.width <= 0) return;
        const maxWidth = Math.round(rect.width);
        ctx.floorPanel.style.setProperty('--floor-panel-max-width', `${maxWidth}px`);
        updateFloorPanelWidth(ctx);
    };

    const updateFloorPanelWidth = (ctx) => {
        if (!ctx.floorPanel || !ctx.floorPanelScroll) return;
        if (!ctx.isPortrait()) return;
        const modePanel = document.querySelector('.mode-panel');
        if (!modePanel || modePanel.classList.contains('hidden')) return;
        const modeRect = modePanel.getBoundingClientRect();
        const maxWidth = modeRect && isFinite(modeRect.width) ? Math.round(modeRect.width) : 0;
        if (maxWidth <= 0) return;

        const container = ctx.floorPanel.querySelector('.panel-container');
        const label = ctx.floorPanel.querySelector('.floor-panel-label');
        if (!container || !label) {
            ctx.floorPanel.style.setProperty('--floor-panel-width', `${maxWidth}px`);
            return;
        }

        const style = window.getComputedStyle(container);
        const paddingLeft = parseFloat(style.paddingLeft || '0') || 0;
        const paddingRight = parseFloat(style.paddingRight || '0') || 0;
        const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
        const contentWidth = Math.ceil(
            paddingLeft + paddingRight + label.scrollWidth + gap + ctx.floorPanelScroll.scrollWidth
        );
        if (!isFinite(contentWidth) || contentWidth <= 0) {
            ctx.floorPanel.style.setProperty('--floor-panel-width', `${maxWidth}px`);
            ctx.floorPanel.classList.add('is-overflowing');
            return;
        }
        const overflow = contentWidth > maxWidth + 1;
        const finalWidth = overflow ? maxWidth : contentWidth;
        ctx.floorPanel.style.setProperty('--floor-panel-width', `${finalWidth}px`);
        ctx.floorPanel.classList.toggle('is-overflowing', overflow);
    };

    const getDesktopAnchorScreen = (ctx) => {
        if (!ctx._selectedApartment?.worldPos) return null;
        const camera = ctx.cameraEntity && ctx.cameraEntity.camera;
        const rect = ctx.getCanvasRect();
        if (!camera || !rect) return null;

        camera.worldToScreen(ctx._selectedApartment.worldPos, ctx._screenPos);
        if (
            !Number.isFinite(ctx._screenPos.x) ||
            !Number.isFinite(ctx._screenPos.y) ||
            ctx._screenPos.z <= 0
        ) {
            return null;
        }

        return {
            x: rect.left + ctx._screenPos.x,
            y: rect.top + ctx._screenPos.y
        };
    };

    const computeDesktopFloorPanelPosition = (ctx, anchorX, anchorY) => {
        const panelRect = ctx.floorPanel ? ctx.floorPanel.getBoundingClientRect() : null;
        const panelWidth = panelRect?.width || 40;
        const panelHeight = panelRect?.height || 120;
        const margin = isFinite(ctx.panelViewportMargin) ? ctx.panelViewportMargin : 12;
        const halfH = panelHeight * 0.5;

        let x = anchorX;
        let y = anchorY;

        x = Math.max(panelWidth + margin, Math.min(window.innerWidth - margin, x));
        y = Math.max(margin + halfH, Math.min(window.innerHeight - margin - halfH, y));

        return { x, y };
    };

    const updateFloorPanelPosition = (ctx) => {
        if (!ctx.floorPanel || !ctx.infoPanel) return;
        if (ctx.isPortrait()) {
            ctx.floorPanel.style.removeProperty('--floor-panel-x');
            ctx.floorPanel.style.removeProperty('--floor-panel-y');
            return;
        }
        if (!ctx.infoPanel.classList.contains('visible')) return;
        const anchor = getDesktopAnchorScreen(ctx);
        if (!anchor) return;
        const pos = computeDesktopFloorPanelPosition(ctx, anchor.x, anchor.y);

        ctx.floorPanel.style.setProperty('--floor-panel-x', `${Math.round(pos.x)}px`);
        ctx.floorPanel.style.setProperty('--floor-panel-y', `${Math.round(pos.y)}px`);
    };

    const clearFloorPanelItems = (ctx) => {
        if (!ctx.floorPanelScroll) return;
        ctx.floorPanelScroll.replaceChildren();
        ctx.floorPanelScroll.scrollLeft = 0;
        if (ctx._floorPanelNodes) ctx._floorPanelNodes.length = 0;
    };

    const hideFloorPanel = (ctx) => {
        if (!ctx.floorPanel) return;
        ctx.floorPanel.classList.add('hidden');
        ctx.floorPanel.setAttribute('aria-hidden', 'true');
    };

    const showFloorPanel = (ctx) => {
        if (!ctx.floorPanel) return;
        syncFloorPanelWidth(ctx);
        ctx.floorPanel.classList.remove('hidden');
        ctx.floorPanel.setAttribute('aria-hidden', 'false');
        updateFloorPanelWidth(ctx);
        updateFloorPanelPosition(ctx);
        requestAnimationFrame(() => {
            if (!ctx.floorPanel || ctx.floorPanel.classList.contains('hidden')) return;
            updateFloorPanelWidth(ctx);
        });
    };

    const updateFloorPanelVisibility = (ctx) => {
        const rows = ctx.getCurrentFloorRows();
        const shouldShow = !!(
            ctx._active &&
            ctx._selectedApartment &&
            rows &&
            rows.length &&
            ctx.infoPanel &&
            ctx.infoPanel.classList.contains('visible')
        );
        if (!shouldShow) {
            hideFloorPanel(ctx);
            return;
        }
        showFloorPanel(ctx);
    };

    const renderFloorPanel = (ctx, rows) => {
        if (!ctx.floorPanelScroll) return;
        ctx.floorPanelScroll.replaceChildren();

        const source = Array.isArray(rows) ? rows : [];
        if (!source.length) {
            updateFloorPanelVisibility(ctx);
            return;
        }
        const ui = ctx.getUiShared();
        const built = ui?.createFloorPanelItems ? ui.createFloorPanelItems(source) : null;
        if (built?.fragment) ctx.floorPanelScroll.appendChild(built.fragment);
        ctx._floorPanelNodes = built?.nodes || Array.from(ctx.floorPanelScroll.children);

        updateFloorPanelSelection(ctx, true);
        updateFloorPanelVisibility(ctx);
        updateFloorPanelWidth(ctx);
    };

    const updateFloorPanelSelection = (ctx, scrollIntoView) => {
        if (!ctx.floorPanelScroll) return;
        const rows = ctx.getCurrentFloorRows();
        const hasRows = rows && rows.length > 0;
        const selected = hasRows ? Math.max(0, Math.min(rows.length - 1, ctx._selectedFloorIndex)) : -1;
        const nodes = ctx._floorPanelNodes || [];

        let activeNode = null;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const isActive = selected >= 0 && i === selected;
            node.classList.toggle('active', isActive);
            node.setAttribute('aria-selected', isActive ? 'true' : 'false');
            if (isActive) activeNode = node;
        }

        if (scrollIntoView && activeNode) {
            if (ctx.isPortrait()) {
                activeNode.scrollIntoView({
                    block: 'nearest',
                    inline: 'center',
                    behavior: 'smooth'
                });
            } else {
                activeNode.scrollIntoView({
                    block: 'center',
                    inline: 'nearest',
                    behavior: 'smooth'
                });
            }
        }
    };

    const onFloorPanelClick = (ctx, e) => {
        if (!ctx._active || ctx._isFloorAnimating) return;
        const target = e.target?.closest ? e.target.closest('.floor-panel-item') : null;
        if (!target) return;
        const nextIndex = Number(target.dataset.floorIndex);
        if (!Number.isFinite(nextIndex)) return;
        ctx.setFloorByIndex(nextIndex);
        target.blur && target.blur();
    };

    const onFloorPanelKeyDown = (ctx, e) => {
        if (!window.UiKeys?.isActivateKey?.(e)) return;
        const target = e.target?.closest ? e.target.closest('.floor-panel-item') : null;
        if (!target) return;
        e.preventDefault();
        onFloorPanelClick(ctx, { target });
    };

    window.ApartmentsFloorShared = {
        syncFloorPanelWidth,
        updateFloorPanelWidth,
        getDesktopAnchorScreen,
        computeDesktopFloorPanelPosition,
        updateFloorPanelPosition,
        clearFloorPanelItems,
        hideFloorPanel,
        showFloorPanel,
        updateFloorPanelVisibility,
        renderFloorPanel,
        updateFloorPanelSelection,
        onFloorPanelClick,
        onFloorPanelKeyDown
    };
})();
