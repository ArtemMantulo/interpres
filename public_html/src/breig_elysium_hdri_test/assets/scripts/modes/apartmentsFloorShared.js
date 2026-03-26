(function () {
    if (window.ApartmentsFloorShared) return;

    const syncFloorPanelWidth = (ctx) => {
        if (!ctx.floorPanel) return;
        if (!ctx.isPortrait()) return;
        ctx.floorPanel.style.removeProperty('--floor-panel-max-width');
        ctx.floorPanel.style.removeProperty('--floor-panel-width');
        ctx.floorPanel.classList.remove('is-overflowing');
    };

    const updateFloorPanelWidth = (ctx) => {
        if (!ctx.floorPanel || !ctx.floorPanelScroll) return;
        if (!ctx.isPortrait()) return;
        ctx.floorPanel.style.removeProperty('--floor-panel-width');
        ctx.floorPanel.classList.remove('is-overflowing');
    };

    const resetFloorItemsInlineStyles = (ctx) => {
        if (!ctx._floorItemsData) return;
        for (let i = 0; i < ctx._floorItemsData.length; i++) {
            const item = ctx._floorItemsData[i];
            item.style.transform = '';
            item.style.display = '';
            item.visible = false;
            item.lastX = NaN;
            item.lastY = NaN;
        }
    };

    const updateFloorPanelPosition = (ctx) => {
        if (!ctx.floorPanel) return;
        // Positioning is handled by ApartmentsMode.updateDomPositions for both desktop and phone.
        ctx._forceDomUpdate = true;
    };

    const clearFloorPanelItems = (ctx) => {
        if (!ctx.floorPanelScroll) return;
        ctx.floorPanelScroll.replaceChildren();
        ctx.floorPanelScroll.scrollLeft = 0;
        ctx.floorPanelScroll.scrollTop = 0;
        if (ctx._floorPanelNodes) ctx._floorPanelNodes.length = 0;
        if (ctx._floorItemsData) ctx._floorItemsData.length = 0;
    };

    const hideFloorPanel = (ctx) => {
        if (!ctx.floorPanel) return;
        ctx.floorPanel.classList.add('hidden');
        ctx.floorPanel.setAttribute('aria-hidden', 'true');
        resetFloorItemsInlineStyles(ctx);
    };

    const showFloorPanel = (ctx) => {
        if (!ctx.floorPanel) return;
        ctx.floorPanel.classList.remove('hidden');
        ctx.floorPanel.setAttribute('aria-hidden', 'false');
        if (ctx.isPortrait()) {
            ctx.floorPanel.style.removeProperty('--floor-panel-max-width');
            ctx.floorPanel.style.removeProperty('--floor-panel-width');
            ctx.floorPanel.classList.remove('is-overflowing');
        } else {
            ctx._forceDomUpdate = true;
        }
    };

    const updateFloorPanelVisibility = (ctx) => {
        const rows = ctx.getCurrentFloorRows();
        const shouldShow = !!(
            ctx._active &&
            ctx._selectedApartment &&
            rows &&
            rows.length &&
            ctx.isInfoPanelOpen?.() &&
            !ctx.isPlanPanelOpen?.()
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
        if (ctx._floorItemsData) ctx._floorItemsData.length = 0;

        const source = Array.isArray(rows) ? rows : [];
        if (!source.length) {
            updateFloorPanelVisibility(ctx);
            return;
        }
        const ui = ctx.getUiShared();
        const built = ui?.createFloorPanelItems ? ui.createFloorPanelItems(source) : null;
        if (built?.fragment) ctx.floorPanelScroll.appendChild(built.fragment);
        ctx._floorPanelNodes = built?.nodes || Array.from(ctx.floorPanelScroll.children);

        const marker = ctx._selectedApartment;
        const canUseWorldPos = !ctx.isPortrait?.() && marker?.worldPos && typeof pc !== 'undefined';
        if (!ctx._floorItemsData) ctx._floorItemsData = [];
        for (let i = 0; i < ctx._floorPanelNodes.length; i++) {
            const node = ctx._floorPanelNodes[i];
            const row = source[i];
            const worldPos = canUseWorldPos
                ? new pc.Vec3(
                    marker.worldPos.x,
                    isFinite(row?.height) ? row.height : marker.worldPos.y,
                    marker.worldPos.z
                )
                : null;

            ctx._floorItemsData.push({
                dom: node,
                style: node.style,
                worldPos,
                visible: false,
                lastX: NaN,
                lastY: NaN
            });
        }

        updateFloorPanelSelection(ctx, true);
        updateFloorPanelVisibility(ctx);
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
