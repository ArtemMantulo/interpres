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
        if (!ctx.infoPanelPrev && !ctx.infoPanelNext && !ctx.infoPanelNavWrap) return;

        const total = ctx.amenitiesData ? ctx.amenitiesData.length : 0;
        const idx = getSelectedAmenityIndex(ctx);
        const hasSelected = total > 0 && idx >= 0 && idx < total;
        const isPortrait = window.innerHeight > window.innerWidth;
        const panelVisible = !!ctx.infoPanel && ctx.infoPanel.classList.contains('visible');
        const shouldShow = hasSelected && isPortrait && panelVisible;

        const canNavigate = shouldShow && total > 1;
        const canGoPrev = canNavigate;
        const canGoNext = canNavigate;

        if (ctx.infoPanelNavWrap) {
            ctx.infoPanelNavWrap.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        }

        if (ctx.infoPanelPrev) {
            ctx.infoPanelPrev.disabled = !canGoPrev;
            ctx.infoPanelPrev.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        }

        if (ctx.infoPanelNext) {
            ctx.infoPanelNext.disabled = !canGoNext;
            ctx.infoPanelNext.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
        }
    };

    const selectAmenityByIndex = (ctx, index) => {
        const idx = index | 0;
        if (idx < 0 || idx >= ctx.amenitiesData.length) return false;

        const data = ctx.amenitiesData[idx];
        const item = data && data.dom;
        if (!data || !item) return false;

        const prevSelected = ctx._selectedAmenityEl;
        if (prevSelected && prevSelected !== item) prevSelected.classList.remove('selected-for-info');
        item.classList.add('selected-for-info');
        ctx._selectedAmenityEl = item;

        setExpandedAmenity(ctx, null);
        ctx._selectedAmenityData = data;
        ctx._infoPanelPortraitPlacement = null;
        applyInfoPanelContent(ctx, data);
        updateInfoPanelPosition(ctx);
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

        selectAmenityByIndex(ctx, nextIndex);
    };

    const focusCameraOn = (ctx, targetPosition) => {
        const orbit = ctx.getOrbit();
        if (!orbit) return;
        const isPortrait = window.innerHeight > window.innerWidth;

        const focusTarget = ctx._focusTarget;
        focusTarget.copy(targetPosition);

        orbit.resetInteractionState();

        orbit.setAmenitiesDistanceByOrientation && orbit.setAmenitiesDistanceByOrientation();
        orbit.focusOn && orbit.focusOn(focusTarget);
        orbit.lookAtPointSmoothly && orbit.lookAtPointSmoothly(focusTarget);

        const lookUpDegrees = isFinite(ctx.portraitLookUpDegrees) ? ctx.portraitLookUpDegrees : 15;
        if (orbit.setLookAtVerticalAngle) {
            orbit.setLookAtVerticalAngle(isPortrait ? lookUpDegrees : 0);
            orbit.setLookAtOffset && orbit.setLookAtOffset(0, 0, 0);
        } else if (orbit.setLookAtOffset) {
            if (isPortrait) {
                const distance =
                    isFinite(orbit.distanceTarget) && orbit.distanceTarget > 0
                        ? orbit.distanceTarget
                        : isFinite(orbit.distance) && orbit.distance > 0
                            ? orbit.distance
                            : 0;
                const lookAtOffsetY =
                    distance > 0 ? Math.tan(lookUpDegrees * pc.math.DEG_TO_RAD) * distance : 0;
                orbit.setLookAtOffset(0, lookAtOffsetY, 0);
            } else orbit.setLookAtOffset(0, 0, 0);
        } else if (isPortrait && orbit.eulersTarget) {
            orbit.eulersTarget.x = pc.math.clamp(
                orbit.eulersTarget.x - lookUpDegrees,
                -89,
                isFinite(orbit.maxPitch) ? orbit.maxPitch : 89
            );
        }
    };

    const updateInfoPanelPosition = (ctx) => {
        if (!ctx.infoPanel || !ctx._selectedAmenityData || !ctx._selectedAmenityData.worldPos) return;
        const isPortrait = window.innerHeight > window.innerWidth;

        let anchorX = ctx._selectedAmenityData.lastX;
        let anchorY = ctx._selectedAmenityData.lastY;

        const hasDomAnchor =
            ctx._selectedAmenityData.visible && Number.isFinite(anchorX) && Number.isFinite(anchorY);

        if (!isPortrait && !hasDomAnchor) {
            const camera = ctx.cameraEntity && ctx.cameraEntity.camera;
            if (!camera) return;

            const rect = ctx.getCanvasRect();
            if (!rect) return;

            const screenPos = ctx._screenPos;
            camera.worldToScreen(ctx._selectedAmenityData.worldPos, screenPos);

            const onScreen = screenPos.z > 0 && Number.isFinite(screenPos.x) && Number.isFinite(screenPos.y);
            if (!onScreen) return;

            anchorX = rect.left + screenPos.x;
            anchorY = rect.top + screenPos.y;
        }

        const panelSize = ctx.getInfoPanelSize();
        const panelWidth = panelSize.width || 300;
        const panelHeight = panelSize.height || 200;

        const margin = isFinite(ctx.infoPanelViewportMargin) ? ctx.infoPanelViewportMargin : 12;
        const offset = isFinite(ctx.infoPanelOffset) ? ctx.infoPanelOffset : 36;
        let x = window.innerWidth * 0.5;
        let y = window.innerHeight * 0.5 - 30;

        if (!isPortrait) {
            const shared = ctx.getShared();
            const pos = shared?.computeInfoPanelPosition
                ? shared.computeInfoPanelPosition({
                      anchorX,
                      anchorY,
                      panelWidth,
                      panelHeight,
                      viewportWidth: window.innerWidth,
                      viewportHeight: window.innerHeight,
                      offset,
                      margin,
                      portraitPlacement: ctx._infoPanelPortraitPlacement
                  })
                : (() => {
                      const halfW = panelWidth * 0.5;
                      const halfH = panelHeight * 0.5;
                      const minX = margin + halfW;
                      const maxX = window.innerWidth - margin - halfW;
                      const minY = margin + halfH;
                      const maxY = window.innerHeight - margin - halfH;
                      let px = anchorX + offset + halfW;
                      let py = anchorY;
                      if (px > maxX) px = anchorX - offset - halfW;
                      px = Math.min(maxX, Math.max(minX, px));
                      py = Math.min(maxY, Math.max(minY, py));
                      return { x: px, y: py };
                  })();
            x = pos.x;
            y = pos.y;
        } else {
            ctx._infoPanelPortraitPlacement = 'center';
        }

        ctx.infoPanel.style.setProperty('--info-panel-x', `${x}px`);
        ctx.infoPanel.style.setProperty('--info-panel-y', `${y}px`);
        if (ctx.infoPanelNavWrap) {
            const halfW = panelWidth * 0.5;
            const navWidth = 28;
            const navOverlap = 1;
            const minNavX = margin;
            const maxNavX = window.innerWidth - margin - navWidth;
            const leftX = Math.min(maxNavX, Math.max(minNavX, x - halfW - navWidth + navOverlap));
            const rightX = Math.min(maxNavX, Math.max(minNavX, x + halfW - navOverlap));
            ctx.infoPanelNavWrap.style.setProperty('--info-panel-nav-left-x', `${leftX}px`);
            ctx.infoPanelNavWrap.style.setProperty('--info-panel-nav-right-x', `${rightX}px`);
            ctx.infoPanelNavWrap.style.setProperty('--info-panel-nav-y', `${y}px`);
        }
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
