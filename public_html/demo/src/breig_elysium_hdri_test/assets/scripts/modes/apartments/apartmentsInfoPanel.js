(function () {
    if (window.ApartmentsPanelShared) return;

    const isMobileLayout = (ctx) => ctx?.isMobileUiLayout?.() ?? ctx?.isPortrait?.() ?? window.AppDetect?.isPortraitMobile?.() ?? false;

    const getSelectedFloorRow = (ctx) => {
        const rows = ctx.getCurrentFloorRows();
        const floorIndex = ctx._selectedFloorIndex;
        return floorIndex >= 0 && floorIndex < rows.length ? rows[floorIndex] : null;
    };

    const syncMobileCardSelection = (ctx, selectedIndex) => {
        const scroll = ctx.mobilePanelScroll;
        if (!scroll) return;

        const cards = scroll.querySelectorAll('.apartments-mobile-card');
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const idx = Number(card.dataset.index);
            const active = Number.isFinite(idx) && idx === selectedIndex;
            card.classList.toggle('is-active', active);
            card.setAttribute('aria-current', active ? 'true' : 'false');

            const plan = card.querySelector('.apartments-mobile-card-plan');
            if (plan) plan.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
    };

    const scrollMobileCardIntoView = (ctx, selectedIndex) => {
        const scroll = ctx.mobilePanelScroll;
        if (!scroll) return;

        if ((selectedIndex | 0) <= 0) {
            const behavior = ctx.mobilePanelEl?.classList.contains('visible') ? 'smooth' : 'auto';
            scroll.scrollTo({ left: 0, behavior });
            return;
        }

        const target = scroll.querySelector(`.apartments-mobile-card[data-index="${selectedIndex}"]`);
        if (!target || typeof target.scrollIntoView !== 'function') return;
        const behavior = ctx.mobilePanelEl?.classList.contains('visible') ? 'smooth' : 'auto';
        requestAnimationFrame(() => {
            target.scrollIntoView({ inline: 'start', block: 'nearest', behavior });
        });
    };

    const getCenteredMobileCardIndex = (ctx) => {
        const scroll = ctx.mobilePanelScroll;
        if (!scroll) return -1;
        const cards = scroll.querySelectorAll('.apartments-mobile-card[data-index]');
        if (!cards.length) return -1;
        const scrollRect = scroll.getBoundingClientRect();

        const scrollLeft = scroll.scrollLeft;
        const prev = ctx._lastMobileScrollLeft || 0;
        ctx._lastMobileScrollLeft = scrollLeft;
        const scrollingRight = scrollLeft >= prev;
        const thresholdX = scrollRect.left + scrollRect.width * (scrollingRight ? 0.4 : 0.6);

        let candidateIndex = -1;
        let candidateLeft = -Infinity;
        let firstIndex = -1;
        let firstLeft = Infinity;

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const rect = card.getBoundingClientRect();
            const idx = Number(card.dataset.index);
            if (!Number.isFinite(idx)) continue;
            if (rect.left < firstLeft) {
                firstLeft = rect.left;
                firstIndex = idx;
            }
            if (rect.left <= thresholdX && rect.left > candidateLeft) {
                candidateLeft = rect.left;
                candidateIndex = idx;
            }
        }

        if (candidateIndex >= 0) return candidateIndex;
        return firstIndex;
    };

    const queueMobileCenterSelectionSync = (ctx) => {
        if (!isMobileLayout(ctx)) return;
        if (!ctx.mobilePanelEl?.classList.contains('visible')) return;
        if (ctx._mobileCenterSyncRaf) return;
        ctx._mobileCenterSyncRaf = requestAnimationFrame(() => {
            ctx._mobileCenterSyncRaf = 0;
            const centeredIndex = getCenteredMobileCardIndex(ctx);
            if (!Number.isFinite(centeredIndex) || centeredIndex < 0) return;
            selectMobileApartmentIndex(ctx, centeredIndex, {
                focusCamera: true,
                emitVisit: false,
                scrollCard: false
            });
        });
    };

    const bindMobileCenterSelectionSync = (ctx) => {
        const scroll = ctx.mobilePanelScroll;
        if (!scroll) return;
        if (ctx._onMobileCenterScrollSync) {
            scroll.removeEventListener('scroll', ctx._onMobileCenterScrollSync);
            ctx._onMobileCenterScrollSync = null;
        }
        ctx._onMobileCenterScrollSync = () => {
            queueMobileCenterSelectionSync(ctx);
        };
        scroll.addEventListener('scroll', ctx._onMobileCenterScrollSync, { passive: true });
    };

    const unbindMobileCenterSelectionSync = (ctx) => {
        const scroll = ctx.mobilePanelScroll;
        if (scroll && ctx._onMobileCenterScrollSync) {
            scroll.removeEventListener('scroll', ctx._onMobileCenterScrollSync);
        }
        ctx._onMobileCenterScrollSync = null;
        if (ctx._mobileCenterSyncRaf) {
            cancelAnimationFrame(ctx._mobileCenterSyncRaf);
            ctx._mobileCenterSyncRaf = 0;
        }
    };

    const selectMobileApartmentIndex = (
        ctx,
        index,
        { focusCamera = true, emitVisit = false, scrollCard = true } = {}
    ) => {
        const row = getSelectedFloorRow(ctx);
        const apartments = row?.apartments;
        if (!apartments || !apartments.length) return false;

        const maxIndex = apartments.length - 1;
        const nextIndex = Math.max(0, Math.min(maxIndex, index | 0));
        const changed = nextIndex !== (ctx._selectedApartmentIndex || 0);

        ctx._selectedApartmentIndex = nextIndex;
        syncMobileCardSelection(ctx, nextIndex);
        if (!changed) {
            if (emitVisit && ctx.app?.fire) {
                ctx.app.fire('apartments:visit', {
                    mode: 'mobile',
                    floorIndex: ctx._selectedFloorIndex,
                    apartmentIndex: nextIndex,
                    apartment: apartments[nextIndex] || null,
                    marker: ctx._selectedApartment || null
                });
            }
            return false;
        }

        if (scrollCard) scrollMobileCardIntoView(ctx, nextIndex);
        ctx.syncSelectedVisualOverlay?.();

        if (focusCamera) ctx.focusCameraForFloor(ctx._selectedFloorIndex);
        if (ctx.isPlanPanelOpen?.()) ctx.updatePlanPanelContent?.();

        if (emitVisit && ctx.app?.fire) {
            ctx.app.fire('apartments:visit', {
                mode: 'mobile',
                floorIndex: ctx._selectedFloorIndex,
                apartmentIndex: nextIndex,
                apartment: apartments[nextIndex] || null,
                marker: ctx._selectedApartment || null
            });
        }

        return true;
    };

    const applyMobilePanelContent = (ctx, marker, floorRow) => {
        const scroll = ctx.mobilePanelScroll;
        if (!scroll) return;

        const ui = ctx.getUiShared();
        const baseRow = floorRow || null;
        const apartments =
            Array.isArray(baseRow?.apartments) && baseRow.apartments.length
                ? baseRow.apartments
                : [baseRow || null];

        const maxIndex = Math.max(0, apartments.length - 1);
        const selectedIndex = Math.max(0, Math.min(maxIndex, ctx._selectedApartmentIndex || 0));
        ctx._selectedApartmentIndex = selectedIndex;

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < apartments.length; i++) {
            const apartment = apartments[i] ? { ...(baseRow || {}), ...apartments[i] } : baseRow || {};
            let card = null;

            if (ui?.createMobileCard) {
                card = ui.createMobileCard(marker, baseRow, apartment, i, selectedIndex);
            } else {
                card = document.createElement('article');
                card.className = 'apartments-mobile-card';
                card.dataset.index = String(i);
            }

            card.dataset.index = String(i);

            const planBtn = card.querySelector('.apartments-mobile-card-plan');
            if (planBtn) {
                planBtn.addEventListener('click', (event) => {
                    const nextIndex = Number(card.dataset.index);
                    if (!Number.isFinite(nextIndex)) return;
                    event.preventDefault();
                    event.stopPropagation();
                    selectMobileApartmentIndex(ctx, nextIndex, {
                        focusCamera: true,
                        emitVisit: true
                    });
                    ctx.openPlanPanel?.();
                });
            }

            fragment.appendChild(card);
        }

        scroll.replaceChildren(fragment);
        bindMobileCenterSelectionSync(ctx);
        selectMobileApartmentIndex(ctx, selectedIndex, { focusCamera: false, emitVisit: false });
        queueMobileCenterSelectionSync(ctx);
    };

    const updateInfoPanelNavState = (ctx) => {
        if (!ctx.infoPanelPrev && !ctx.infoPanelNext) return;
        const row = getSelectedFloorRow(ctx);
        const aptCount = row?.apartments?.length || 0;
        const panelVisible = !!ctx.isInfoPanelOpen?.();
        const shouldShow = !isMobileLayout(ctx) && panelVisible && !!ctx._selectedApartment && aptCount > 1;
        if (ctx.infoPanelPrev) {
            ctx.infoPanelPrev.disabled = false;
            ctx.infoPanelPrev.style.display = shouldShow ? 'flex' : 'none';
        }
        if (ctx.infoPanelNext) {
            ctx.infoPanelNext.disabled = false;
            ctx.infoPanelNext.style.display = shouldShow ? 'flex' : 'none';
        }
    };

    const navigateSelectedApartment = (ctx, step) => {
        if (isMobileLayout(ctx)) return;

        const floorIndex = ctx._selectedFloorIndex;
        const row = getSelectedFloorRow(ctx);
        const apts = row?.apartments;
        if (!apts || apts.length < 2) return;
        const total = apts.length;
        const direction = step < 0 ? -1 : 1;
        const prevIdx = ctx._selectedApartmentIndex || 0;
        let nextIdx = prevIdx + direction;
        if (nextIdx < 0) nextIdx = total - 1;
        else if (nextIdx >= total) nextIdx = 0;
        if (nextIdx !== prevIdx) {
            ctx.beginFloorHeightTransition?.(prevIdx, nextIdx);
        }
        ctx._selectedApartmentIndex = nextIdx;
        const apt = apts[nextIdx];
        ctx.applyPanelContent(ctx._selectedApartment, { ...row, ...apt });
        ctx.syncSelectedVisualOverlay?.();
        ctx.focusCameraForFloor(floorIndex);
        ctx.scheduleInfoPanelReposition?.();
        if (ctx.isPlanPanelOpen?.()) ctx.updatePlanPanelContent?.();
    };

    const clearSelectionVisuals = (ctx) => {
        if (ctx._selectedApartment?.dom) {
            ctx._selectedApartment.dom.classList.remove('selected-for-info');
        }
        ctx._selectedApartment = null;
        ctx._selectedFloorIndex = -1;
        ctx._selectedApartmentIndex = 0;
        ctx.clearSelectedVisualOverlay?.();
        ctx.clearFloorHeightTransition?.();
        ctx.updateFloorPanelVisibility();
    };

    const getCurrentFloorRows = (ctx) => {
        return ctx._selectedApartment?.detailsRows || [];
    };

    const selectApartment = (ctx, index) => {
        if (index < 0 || index >= ctx.apartmentsData.length) return;
        const entry = ctx.apartmentsData[index];
        if (!entry) return;

        ++ctx._selectionToken;
        const shouldAnimatePanelSwap =
            !isMobileLayout(ctx) && !!ctx.infoPanel && ctx.infoPanel.classList.contains('visible');

        if (ctx._selectedApartment?.dom && ctx._selectedApartment.dom !== entry.dom) {
            ctx._selectedApartment.dom.classList.remove('selected-for-info');
        }
        ctx.clearFloorHeightTransition?.();
        entry.dom.classList.add('selected-for-info');
        ctx._selectedApartment = entry;
        ctx._selectedFloorIndex = -1;
        ctx.clearFloorPanelItems();
        ctx.hideFloorPanel();

        const rows = entry.detailsRows || [];
        ctx.renderFloorPanel(rows);
        if (!rows.length) {
            ctx.applyPanelContent(entry, null);
            ctx.openInfoPanel();
            ctx.syncSelectedVisualOverlay?.();
            ctx.focusCameraForFloor(-1);
            ctx.updateFloorPanelVisibility();
            if (shouldAnimatePanelSwap) ctx.triggerInfoPanelSwapAnimation();
            return;
        }

        ctx.setFloorByIndex(0, { animatePanelSwap: shouldAnimatePanelSwap });
    };

    const setFloorByIndex = (ctx, index, options) => {
        if (!ctx._selectedApartment) return;
        const rows = getCurrentFloorRows(ctx);
        if (!rows.length) {
            ctx._selectedFloorIndex = -1;
            ctx.applyPanelContent(ctx._selectedApartment, null);
            ctx.openInfoPanel();
            ctx.syncSelectedVisualOverlay?.();
            ctx.focusCameraForFloor(-1);
            ctx.updateFloorPanelSelection(false);
            ctx.updateFloorPanelVisibility();
            return;
        }

        const next = Math.max(0, Math.min(rows.length - 1, index | 0));
        ctx._selectedFloorIndex = next;
        ctx._selectedApartmentIndex = 0;
        ctx.clearFloorHeightTransition?.();

        const row = rows[next];
        ctx.applyPanelContent(ctx._selectedApartment, row);
        ctx.openInfoPanel();
        ctx.syncSelectedVisualOverlay?.();
        ctx.focusCameraForFloor(next);
        ctx.scheduleInfoPanelReposition?.();
        ctx.updateFloorPanelSelection(true);
        ctx.updateFloorPanelVisibility();
        ctx.updateFloorPanelWidth();
        if (ctx.isPlanPanelOpen?.()) ctx.updatePlanPanelContent?.();
        if (options?.animatePanelSwap) ctx.triggerInfoPanelSwapAnimation();
    };

    const openInfoPanel = (ctx) => {
        if (isMobileLayout(ctx)) {
            if (ctx.infoPanel) {
                ctx.infoPanel.classList.remove('visible');
                ctx.infoPanel.classList.remove('is-content-swapping');
            }
            ctx.endInfoPanelPlacement?.();
            if (ctx.mobilePanelEl) {
                ctx.mobilePanelEl.classList.add('visible');
                ctx.mobilePanelEl.setAttribute('aria-hidden', 'false');
            }
            ctx.updateFloorPanelVisibility();
            ctx.updateFloorPanelPosition();
            updateInfoPanelNavState(ctx);
            scrollMobileCardIntoView(ctx, ctx._selectedApartmentIndex || 0);
            queueMobileCenterSelectionSync(ctx);
            return;
        }

        unbindMobileCenterSelectionSync(ctx);
        if (!ctx.infoPanel) return;
        ctx.beginInfoPanelPlacement?.();
        ctx.infoPanel.classList.add('visible');
        if (ctx.scheduleInfoPanelReposition) ctx.scheduleInfoPanelReposition();
        else {
            ctx.markInfoPanelSizeDirty();
            ctx.updateInfoPanelPosition();
        }
        ctx.updateFloorPanelVisibility();
        ctx.updateFloorPanelPosition();
        updateInfoPanelNavState(ctx);
        ctx._forceDomUpdate = true;
    };

    const closeInfoPanel = (ctx) => {
        ctx.cancelFloorAnimation();
        ctx.closePlanPanel?.({ keepInfoHidden: true });
        unbindMobileCenterSelectionSync(ctx);
        if (ctx.infoPanel) ctx.infoPanel.classList.remove('visible');
        if (ctx.infoPanel) ctx.infoPanel.classList.remove('is-content-swapping');
        ctx.endInfoPanelPlacement?.();
        if (ctx.mobilePanelEl) {
            ctx.mobilePanelEl.classList.remove('visible');
            ctx.mobilePanelEl.setAttribute('aria-hidden', 'true');
        }
        if (ctx.mobilePanelScroll) ctx.mobilePanelScroll.replaceChildren();
        if (ctx._panelSwapAnimTimer) {
            clearTimeout(ctx._panelSwapAnimTimer);
            ctx._panelSwapAnimTimer = 0;
        }
        ctx._selectionToken++;
        if (ctx._selectedApartment?.dom) ctx._selectedApartment.dom.classList.remove('selected-for-info');
        ctx._selectedApartment = null;
        ctx._selectedFloorIndex = -1;
        ctx._selectedApartmentIndex = 0;
        ctx.clearSelectedVisualOverlay?.();
        ctx.clearFloorHeightTransition?.();
        ctx.clearFloorPanelItems();
        ctx.hideFloorPanel();
        ctx.centerCameraToApartmentsHome?.();
        updateInfoPanelNavState(ctx);
    };

    const triggerInfoPanelSwapAnimation = (ctx) => {
        if (!ctx.infoPanel || !ctx.infoPanel.classList.contains('visible')) return;
        if (isMobileLayout(ctx)) return;
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
        if (isMobileLayout(ctx)) {
            applyMobilePanelContent(ctx, marker, floorRow);
            updateInfoPanelNavState(ctx);
            return;
        }

        const ui = ctx.getUiShared();
        const elements = getMainPanelElements(ctx);
        if (ui?.applyPanelContent) ui.applyPanelContent(elements, marker, floorRow);
        ctx.markInfoPanelSizeDirty();
        updateInfoPanelNavState(ctx);
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
        applyPanelContent,
        updateInfoPanelNavState,
        navigateSelectedApartment
    };
})();
