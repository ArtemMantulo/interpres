(function () {
    if (window.AmenitiesPanelShared) return;

    const applyInfoPanelContent = (ctx, data) => {
        if (!data) return;
        if (ctx.panelImage) {
            ctx.panelImage.src = data.image || '';
            ctx.panelImage.alt = data.title || '';
        }
        if (ctx.panelTitle) ctx.panelTitle.textContent = data.title || '';
        if (ctx.panelDescription) ctx.panelDescription.textContent = data.description || '';
        ctx.markInfoPanelSizeDirty();
    };

    const openInfoPanel = (ctx) => {
        if (!ctx.infoPanel) return;
        ctx.markInfoPanelSizeDirty();
        if (ctx.infoPanel.classList.contains('visible')) {
            updateInfoPanelNavState(ctx);
            return;
        }
        requestAnimationFrame(() => {
            if (!ctx.infoPanel || !ctx._selectedAmenityData) return;
            ctx.infoPanel.classList.add('visible');
            updateInfoPanelNavState(ctx);
        });
    };

    const closeInfoPanel = (ctx) => {
        if (ctx.infoPanel) ctx.infoPanel.classList.remove('visible');

        if (ctx._selectedAmenityEl) {
            ctx._selectedAmenityEl.classList.remove('selected-for-info');
        }

        ctx._selectedAmenityEl = null;
        ctx._selectedAmenityData = null;
        ctx._infoPanelPortraitPlacement = null;
        ctx._infoPanelPositionFrozen = false;
        updateInfoPanelNavState(ctx);
    };

    const onAmenityClick = (ctx, e) => {
        const item = e.target && e.target.closest ? e.target.closest('.amenities') : null;
        if (!item) return;

        const index = item.dataset.index | 0;
        selectAmenityByIndex(ctx, index);
    };

    const setExpandedAmenity = (ctx, item) => {
        const prev = ctx._expandedAmenityEl;
        if (prev && prev !== item) {
            prev.classList.remove('expanded');
            prev.setAttribute('aria-expanded', 'false');
        }

        ctx._expandedAmenityEl = item || null;

        if (item) {
            item.classList.add('expanded');
            item.setAttribute('aria-expanded', 'true');
        }
    };

    const onAmenityKeyDown = (ctx, e) => {
        if (!window.UiKeys?.isActivateKey?.(e)) return;
        const item = e.target && e.target.closest ? e.target.closest('.amenities') : null;
        if (!item) return;
        e.preventDefault();
        onAmenityClick(ctx, { target: item });
    };

    const getSelectedAmenityIndex = (ctx) => {
        if (ctx._selectedAmenityEl) {
            const raw = ctx._selectedAmenityEl.dataset ? ctx._selectedAmenityEl.dataset.index : NaN;
            const idx = Number(raw);
            if (Number.isInteger(idx)) return idx;
        }

        if (!ctx._selectedAmenityData || !ctx.amenitiesData || !ctx.amenitiesData.length) return -1;
        return ctx.amenitiesData.indexOf(ctx._selectedAmenityData);
    };

    const updateInfoPanelNavState = (ctx) => {
        if (!ctx.infoPanelPrev && !ctx.infoPanelNext) return;

        const total = ctx.amenitiesData ? ctx.amenitiesData.length : 0;
        const idx = getSelectedAmenityIndex(ctx);
        const hasSelected = total > 0 && idx >= 0 && idx < total;
        const panelVisible = !!ctx.infoPanel && ctx.infoPanel.classList.contains('visible');
        const shouldShow = hasSelected && panelVisible;
        const canNavigate = shouldShow && total > 1;

        if (ctx.infoPanelPrev) {
            ctx.infoPanelPrev.disabled = !canNavigate;
            ctx.infoPanelPrev.style.display = shouldShow ? 'flex' : 'none';
        }

        if (ctx.infoPanelNext) {
            ctx.infoPanelNext.disabled = !canNavigate;
            ctx.infoPanelNext.style.display = shouldShow ? 'flex' : 'none';
        }
    };

    const selectAmenityByIndex = (ctx, index, options) => {
        const idx = index | 0;
        if (idx < 0 || idx >= ctx.amenitiesData.length) return false;

        const data = ctx.amenitiesData[idx];
        const item = data && data.dom;
        if (!data || !item) return false;

        const keepPanelPosition = !!(options && options.keepPanelPosition);

        const panelVisible = !!ctx.infoPanel && ctx.infoPanel.classList.contains('visible');
        if (data === ctx._selectedAmenityData && panelVisible) return false;

        const prevSelected = ctx._selectedAmenityEl;
        if (prevSelected && prevSelected !== item) prevSelected.classList.remove('selected-for-info');
        item.classList.add('selected-for-info');
        ctx._selectedAmenityEl = item;

        setExpandedAmenity(ctx, null);
        ctx._selectedAmenityData = data;
        applyInfoPanelContent(ctx, data);

        if (keepPanelPosition) {
            ctx._infoPanelPositionFrozen = true;
        } else {
            ctx._infoPanelPortraitPlacement = null;
            ctx._infoPanelPositionFrozen = false;
            updateInfoPanelPosition(ctx);
        }

        openInfoPanel(ctx);
        ctx._forceDomUpdate = true;
        updateInfoPanelNavState(ctx);

        focusCameraOn(ctx, data.worldPos);
        return true;
    };

    const navigateSelectedAmenity = (ctx, step) => {
        const total = ctx.amenitiesData ? ctx.amenitiesData.length : 0;
        if (total < 2) return;

        const direction = step < 0 ? -1 : 1;
        const currentIndex = getSelectedAmenityIndex(ctx);
        if (currentIndex < 0) return;

        let nextIndex = currentIndex + direction;
        if (nextIndex < 0) nextIndex = total - 1;
        else if (nextIndex >= total) nextIndex = 0;

        selectAmenityByIndex(ctx, nextIndex, { keepPanelPosition: true });
    };

    const focusCameraOn = (ctx, targetPosition) => {
        const orbit = ctx.getOrbit();
        if (!orbit) return;
        const isPortrait = ctx.isPhoneLayout?.() ?? window.AppDetect?.isPortraitMobile?.() ?? false;

        const focusTarget = ctx._focusTarget;
        focusTarget.copy(targetPosition);

        orbit.resetInteractionState();

        orbit.setAmenitiesDistanceByOrientation && orbit.setAmenitiesDistanceByOrientation();
        orbit.focusOn && orbit.focusOn(focusTarget);
        orbit.lookAtPointSmoothly && orbit.lookAtPointSmoothly(focusTarget);

        if (isPortrait) {
            const portraitLookBelowDegrees = isFinite(ctx.portraitLookBelowDegrees) ? ctx.portraitLookBelowDegrees : 5;
            const portraitLookUpDegrees = isFinite(ctx.portraitLookUpDegrees) ? ctx.portraitLookUpDegrees : 4;
            if (orbit.setLookAtVerticalAngle) {
                orbit.setLookAtVerticalAngle(-portraitLookBelowDegrees + portraitLookUpDegrees);
            }
        } else {
            if (orbit.setLookAtVerticalAngle) orbit.setLookAtVerticalAngle(0);
        }
        orbit.setLookAtOffset && orbit.setLookAtOffset(0, 0, 0);
    };

    const updateInfoPanelPosition = () => {
        // Position is controlled by CSS (fixed under mode-panel)
    };

    window.AmenitiesPanelShared = {
        applyInfoPanelContent,
        openInfoPanel,
        closeInfoPanel,
        onAmenityClick,
        setExpandedAmenity,
        onAmenityKeyDown,
        getSelectedAmenityIndex,
        updateInfoPanelNavState,
        selectAmenityByIndex,
        navigateSelectedAmenity,
        focusCameraOn,
        updateInfoPanelPosition
    };
})();
