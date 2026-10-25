(function () {
    if (window.ApartmentsExpandedShared) return;

    function getPlanImageUrl(ctx, apartmentData) {
        return (
            apartmentData?.planImageUrl ||
            apartmentData?.planImage ||
            apartmentData?.imageUrl ||
            'assets/images/pictures/pic_loading.png'
        );
    }

    function normalizeGalleryImages(value) {
        if (!value) return [];
        if (typeof value === 'string') {
            const src = value.trim();
            return src ? [src] : [];
        }
        if (Array.isArray(value)) {
            const out = [];
            for (let i = 0; i < value.length; i++) {
                const item = String(value[i] || '').trim();
                if (item) out.push(item);
            }
            return out;
        }
        return [];
    }

    function uniqueImageList(list) {
        const source = Array.isArray(list) ? list : [];
        const out = [];
        const seen = new Set();
        for (let i = 0; i < source.length; i++) {
            const src = String(source[i] || '').trim();
            if (!src || seen.has(src)) continue;
            seen.add(src);
            out.push(src);
        }
        return out;
    }

    function getExpandedGallerySets(ctx, apartmentData) {
        const gallery = apartmentData?.gallery && typeof apartmentData.gallery === 'object'
            ? apartmentData.gallery
            : null;

        const fallback = uniqueImageList(
            normalizeGalleryImages(apartmentData?.galleryImages)
                .concat(normalizeGalleryImages(apartmentData?.images))
                .concat(normalizeGalleryImages(apartmentData?.imageUrl))
        );

        const sets = {
            interior: uniqueImageList(
                normalizeGalleryImages(apartmentData?.interiorImages)
                    .concat(normalizeGalleryImages(apartmentData?.interior))
                    .concat(normalizeGalleryImages(gallery?.interior))
            ),
            view: uniqueImageList(
                normalizeGalleryImages(apartmentData?.viewImages)
                    .concat(normalizeGalleryImages(apartmentData?.view))
                    .concat(normalizeGalleryImages(gallery?.view))
            ),
            street: uniqueImageList(
                normalizeGalleryImages(apartmentData?.streetImages)
                    .concat(normalizeGalleryImages(apartmentData?.street))
                    .concat(normalizeGalleryImages(gallery?.street))
            )
        };

        const fallbackSet = fallback.length ? fallback : ['assets/images/pictures/pic_loading.png'];
        if (!sets.interior.length) sets.interior = fallbackSet.slice();
        if (!sets.view.length) sets.view = fallbackSet.slice();
        if (!sets.street.length) sets.street = fallbackSet.slice();
        return sets;
    }

    function updateExpandedTabState(ctx, activeType) {
        if (!ctx.expandedTabs?.length) return;
        for (let i = 0; i < ctx.expandedTabs.length; i++) {
            const tab = ctx.expandedTabs[i];
            const isActive = String(tab.dataset.galleryType || '') === activeType;
            tab.classList.toggle('is-active', isActive);
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
    }

    function renderExpandedThumbs(ctx, images, activeIndex) {
        if (!ctx.expandedThumbs) return;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < images.length; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `apartments-expanded-thumb${i === activeIndex ? ' is-active' : ''}`;
            btn.dataset.galleryIndex = String(i);

            const img = document.createElement('img');
            img.src = images[i];
            img.alt = `Gallery ${i + 1}`;
            img.loading = 'lazy';
            img.decoding = 'async';
            btn.appendChild(img);
            fragment.appendChild(btn);
        }
        ctx.expandedThumbs.replaceChildren(fragment);
    }

    function renderExpandedMobileSlider(ctx, images) {
        if (!ctx.expandedMobileSlider) return;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < images.length; i++) {
            const slide = document.createElement('div');
            slide.className = 'apartments-expanded-mobile-slide';
            const img = document.createElement('img');
            img.src = images[i];
            img.alt = `Gallery ${i + 1}`;
            img.loading = 'lazy';
            img.decoding = 'async';
            slide.appendChild(img);
            fragment.appendChild(slide);
        }
        ctx.expandedMobileSlider.replaceChildren(fragment);
    }

    function updateExpandedGalleryVisuals(ctx) {
        if (!ctx.planImage || !ctx._expandedGalleryImages.length) return;
        const idx = Math.max(0, Math.min(ctx._expandedGalleryImages.length - 1, ctx._expandedGalleryIndex | 0));
        ctx._expandedGalleryIndex = idx;
        const src = ctx._expandedGalleryImages[idx] || 'assets/images/pictures/pic_loading.png';
        ctx.planImage.src = src;

        if (ctx.expandedThumbs) {
            const thumbs = ctx.expandedThumbs.querySelectorAll('[data-gallery-index]');
            for (let i = 0; i < thumbs.length; i++) {
                thumbs[i].classList.toggle('is-active', i === idx);
            }
        }
    }

    function updatePlanPanelNavState(ctx) {
        const floorRow = ctx.getSelectedFloorRow();
        const aptCount = floorRow?.apartments?.length || 0;
        const hasNav = aptCount > 1;
        const setState = (el) => {
            if (!el) return;
            el.disabled = !hasNav;
            el.style.opacity = hasNav ? '1' : '0.45';
            el.style.pointerEvents = hasNav ? 'auto' : 'none';
        };
        setState(ctx.planPrevDesktop);
        setState(ctx.planNextDesktop);
        setState(ctx.planPrevMobile);
        setState(ctx.planNextMobile);
    }

    function updatePlanPanelContent(ctx) {
        if (!ctx._selectedApartment) return;
        const apartmentData = ctx.getSelectedApartmentData();
        if (!apartmentData) return;

        const markerTitle = ctx._selectedApartment?.title || 'Apartments';
        const unitName = apartmentData?.name || markerTitle;
        const floorWord = window.AppLanguage?.getText?.('floor', 'Floor') ?? 'Floor';
        const floorLabel = apartmentData?.floorRaw ? `${floorWord} ${apartmentData.floorRaw}` : `${floorWord} -`;
        const area = apartmentData?.area || '-';
        const bedrooms = apartmentData?.bedrooms || '-';
        const availability = apartmentData?.availability || '-';
        const description = apartmentData?.description || '';
        const gallerySets = getExpandedGallerySets(ctx, apartmentData);
        const activeType = gallerySets[ctx._expandedGalleryType] ? ctx._expandedGalleryType : 'street';
        const activeImages = gallerySets[activeType];
        ctx._expandedGalleryType = activeType;
        ctx._expandedGalleryImages = activeImages;
        ctx._expandedGalleryIndex = Math.max(
            0,
            Math.min(activeImages.length - 1, ctx._expandedGalleryIndex | 0)
        );

        if (ctx.planTitle) ctx.planTitle.textContent = `${unitName}, ${floorLabel}`;
        if (ctx.planArea) ctx.planArea.textContent = area;
        if (ctx.planBedrooms) ctx.planBedrooms.textContent = bedrooms;
        if (ctx.planAvailability) ctx.planAvailability.textContent = availability;
        if (ctx.planDescription) ctx.planDescription.textContent = description;
        if (ctx.planImage) ctx.planImage.alt = `${unitName} gallery image`;

        updateExpandedTabState(ctx, activeType);
        if (ctx.expandedGalleryLabel) {
            const galleryLabel = window.AppLanguage?.getText?.(
                'gallery_label',
                'Gallery'
            ) ?? 'Gallery';
            ctx.expandedGalleryLabel.textContent = `${galleryLabel} (${activeImages.length})`;
        }
        renderExpandedThumbs(ctx, activeImages, ctx._expandedGalleryIndex);
        renderExpandedMobileSlider(ctx, activeImages);
        updateExpandedGalleryVisuals(ctx);

        updatePlanPanelNavState(ctx);
        ctx.updatePlanPanelLandscapeHeight();
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => ctx.updatePlanPanelLandscapeHeight());
        }
    }

    function openPlanPanel(ctx) {
        if (!ctx.planPanel || !ctx._selectedApartment) return;
        if (!ctx.getSelectedApartmentData()) return;
        if (ctx._planPanelCloseTimer) {
            clearTimeout(ctx._planPanelCloseTimer);
            ctx._planPanelCloseTimer = 0;
        }
        if (ctx._planNavPressTimers?.size) {
            ctx._planNavPressTimers.forEach((timer) => clearTimeout(timer));
            ctx._planNavPressTimers.clear();
        }
        if (ctx._infoPanelRepositionTimer) {
            clearTimeout(ctx._infoPanelRepositionTimer);
            ctx._infoPanelRepositionTimer = 0;
        }
        ctx._expandedGalleryType = ctx._expandedGalleryType || 'street';
        ctx._expandedGalleryIndex = 0;
        updatePlanPanelContent(ctx);
        if (ctx.infoPanel) {
            ctx.infoPanel.classList.remove('visible');
            ctx.infoPanel.classList.remove('is-content-swapping');
        }
        ctx.endInfoPanelPlacement();
        if (ctx.mobilePanelEl) {
            ctx.mobilePanelEl.classList.remove('visible');
            ctx.mobilePanelEl.setAttribute('aria-hidden', 'true');
        }
        ctx.planPanel.classList.add('visible');
        ctx.planPanel.setAttribute('aria-hidden', 'false');
        ctx.updatePlanPanelLandscapeHeight();
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => ctx.updatePlanPanelLandscapeHeight());
        }
        ctx.updateInfoPanelNavState();
        ctx.updateFloorPanelVisibility();
        ctx._forceDomUpdate = true;
        ctx.updateDomPositions();
    }

    function closePlanPanel(ctx, options) {
        if (!ctx.planPanel) return;
        if (ctx._planPanelCloseTimer) {
            clearTimeout(ctx._planPanelCloseTimer);
            ctx._planPanelCloseTimer = 0;
        }
        ctx.planPanel.classList.remove('visible');
        ctx.planPanel.setAttribute('aria-hidden', 'true');
        if (options?.keepInfoHidden) {
            ctx.updateFloorPanelVisibility();
            ctx._forceDomUpdate = true;
            ctx.updateDomPositions();
            return;
        }
        if (!ctx._active || !ctx._selectedApartment) return;
        const reopenInfoPanel = () => {
            if (!ctx._active || !ctx._selectedApartment || ctx.isPlanPanelOpen()) return;
            ctx.openInfoPanel();
            ctx.updateFloorPanelVisibility();
            ctx._forceDomUpdate = true;
            ctx.updateDomPositions();
        };
        if (ctx.isPortrait()) {
            ctx._planPanelCloseTimer = setTimeout(() => {
                ctx._planPanelCloseTimer = 0;
                reopenInfoPanel();
            }, 280);
            return;
        }
        reopenInfoPanel();
    }

    function navigatePlanSelection(ctx, step) {
        const floorRow = ctx.getSelectedFloorRow();
        const apartments = floorRow?.apartments;
        if (!apartments || apartments.length < 2) return;

        const direction = step < 0 ? -1 : 1;

        if (ctx.isPortrait()) {
            const total = apartments.length;
            let nextIdx = (ctx._selectedApartmentIndex || 0) + direction;
            if (nextIdx < 0) nextIdx = total - 1;
            else if (nextIdx >= total) nextIdx = 0;
            ctx._selectedApartmentIndex = nextIdx;
            ctx.applyPanelContent(ctx._selectedApartment, floorRow);
            ctx.syncSelectedVisualOverlay();
            ctx.focusCameraForFloor(ctx._selectedFloorIndex);
            updatePlanPanelContent(ctx);
            return;
        }

        ctx.navigateSelectedApartment(direction);
    }

    window.ApartmentsExpandedShared = {
        getPlanImageUrl,
        normalizeGalleryImages,
        uniqueImageList,
        getExpandedGallerySets,
        updateExpandedTabState,
        renderExpandedThumbs,
        renderExpandedMobileSlider,
        updateExpandedGalleryVisuals,
        updatePlanPanelNavState,
        updatePlanPanelContent,
        openPlanPanel,
        closePlanPanel,
        navigatePlanSelection
    };
})();
