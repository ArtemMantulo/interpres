(function () {
    if (window.ApartmentsPanelShared) return;

    const clearSelectionVisuals = (ctx) => {
        if (ctx._selectedApartment?.dom) {
            ctx._selectedApartment.dom.classList.remove('selected-for-info');
        }
        ctx._selectedApartment = null;
        ctx._selectedFloorIndex = -1;
        ctx.updateFloorPanelVisibility();
    };

    const getCurrentFloorRows = (ctx) => {
        return ctx._selectedApartment?.detailsRows || [];
    };

    const selectApartment = (ctx, index) => {
        if (index < 0 || index >= ctx.apartmentsData.length) return;
        const entry = ctx.apartmentsData[index];
        if (!entry) return;

        const token = ++ctx._selectionToken;
        const shouldAnimatePanelSwap =
            !ctx.isPortrait() && !!ctx.infoPanel && ctx.infoPanel.classList.contains('visible');

        if (ctx._selectedApartment?.dom && ctx._selectedApartment.dom !== entry.dom) {
            ctx._selectedApartment.dom.classList.remove('selected-for-info');
        }
        entry.dom.classList.add('selected-for-info');
        ctx._selectedApartment = entry;
        ctx._selectedFloorIndex = -1;
        ctx.clearFloorPanelItems();
        ctx.hideFloorPanel();

        ctx.getDetailsRows(entry.detailsCsvUrl).then((rows) => {
            if (token !== ctx._selectionToken) return;
            if (!ctx._active) return;

            entry.detailsRows = rows || [];
            ctx.renderFloorPanel(entry.detailsRows);
            if (!entry.detailsRows.length) {
                ctx.applyPanelContent(entry, null);
                ctx.openInfoPanel();
                ctx.focusCameraForFloor(-1);
                ctx.updateFloorPanelVisibility();
                if (shouldAnimatePanelSwap) ctx.triggerInfoPanelSwapAnimation();
                return;
            }

            ctx.setFloorByIndex(0, { animatePanelSwap: shouldAnimatePanelSwap });
        });
    };

    const setFloorByIndex = (ctx, index, options) => {
        if (!ctx._selectedApartment) return;
        const rows = getCurrentFloorRows(ctx);
        if (!rows.length) {
            ctx._selectedFloorIndex = -1;
            ctx.applyPanelContent(ctx._selectedApartment, null);
            ctx.openInfoPanel();
            ctx.focusCameraForFloor(-1);
            ctx.updateFloorPanelSelection(false);
            ctx.updateFloorPanelVisibility();
            return;
        }

        const next = Math.max(0, Math.min(rows.length - 1, index | 0));
        ctx._selectedFloorIndex = next;

        const row = rows[next];
        ctx.applyPanelContent(ctx._selectedApartment, row);
        ctx.openInfoPanel();
        ctx.focusCameraForFloor(next);
        ctx.updateFloorPanelSelection(true);
        ctx.updateFloorPanelVisibility();
        ctx.updateFloorPanelWidth();
        if (options?.animatePanelSwap) ctx.triggerInfoPanelSwapAnimation();
    };

    const openInfoPanel = (ctx) => {
        if (!ctx.infoPanel) return;
        ctx.markInfoPanelSizeDirty();
        ctx.updateInfoPanelPosition();
        ctx.infoPanel.classList.add('visible');
        ctx.updateFloorPanelVisibility();
        ctx.updateFloorPanelPosition();
    };

    const closeInfoPanel = (ctx) => {
        ctx.cancelFloorAnimation();
        if (ctx.infoPanel) ctx.infoPanel.classList.remove('visible');
        if (ctx.infoPanel) ctx.infoPanel.classList.remove('is-content-swapping');
        if (ctx._panelSwapAnimTimer) {
            clearTimeout(ctx._panelSwapAnimTimer);
            ctx._panelSwapAnimTimer = 0;
        }
        ctx._selectionToken++;
        if (ctx._selectedApartment?.dom) ctx._selectedApartment.dom.classList.remove('selected-for-info');
        ctx._selectedApartment = null;
        ctx._selectedFloorIndex = -1;
        ctx.clearFloorPanelItems();
        ctx.hideFloorPanel();
        ctx.releaseCameraLock();
    };

    const triggerInfoPanelSwapAnimation = (ctx) => {
        if (!ctx.infoPanel || !ctx.infoPanel.classList.contains('visible')) return;
        if (ctx.isPortrait()) return;
        ctx.infoPanel.classList.remove('is-content-swapping');
        void ctx.infoPanel.offsetWidth;
        ctx.infoPanel.classList.add('is-content-swapping');
        if (ctx._panelSwapAnimTimer) clearTimeout(ctx._panelSwapAnimTimer);
        ctx._panelSwapAnimTimer = setTimeout(() => {
            ctx._panelSwapAnimTimer = 0;
            if (ctx.infoPanel) ctx.infoPanel.classList.remove('is-content-swapping');
        }, 280);
    };

    const getMainPanelElements = (ctx) => {
        return {
            title: ctx.panelTitle,
            area: ctx.panelArea,
            bedrooms: ctx.panelBedrooms,
            availability: ctx.panelAvailability,
            description: ctx.panelDescription,
            image: ctx.panelImage
        };
    };

    const getPanelElementsFromContainer = (ctx, container) => {
        const ui = ctx.getUiShared();
        if (ui?.getPanelElements) return ui.getPanelElements(container);
        return null;
    };

    const applyPanelContent = (ctx, marker, floorRow) => {
        const ui = ctx.getUiShared();
        const elements = getMainPanelElements(ctx);
        if (ui?.applyPanelContent) ui.applyPanelContent(elements, marker, floorRow);
        ctx.markInfoPanelSizeDirty();
    };

    window.ApartmentsPanelShared = {
        clearSelectionVisuals,
        getCurrentFloorRows,
        selectApartment,
        setFloorByIndex,
        openInfoPanel,
        closeInfoPanel,
        triggerInfoPanelSwapAnimation,
        getMainPanelElements,
        getPanelElementsFromContainer,
        applyPanelContent
    };
})();
