(function () {
    if (window.AmenitiesDomShared) return;

    const loadDataFromCsv = (ctx) => {
        const url = ctx.dataUrl || 'assets/data/amenities/dataAmenities.json';
        const lang = ctx.getLang();
        const token = ++ctx._dataLoadToken;

        const process = (json) => {
            if (token !== ctx._dataLoadToken) return;
            if (ctx.currentMode !== '2') return;
            ctx._cachedJson = json;
            const shared = ctx.getShared();
            const dataList = shared?.parseData ? shared.parseData(json, lang) : [];
            renderAmenities(ctx, dataList);
        };

        if (ctx._cachedJson) {
            process(ctx._cachedJson);
            return;
        }

        fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
                return r.json();
            })
            .then(process)
            .catch((err) => {
                if (token !== ctx._dataLoadToken) return;
                console.warn('Amenities data load failed:', err);
                renderAmenities(ctx, []);
            });
    };

    const renderAmenities = (ctx, dataList) => {
        clearAmenities(ctx);
        if (ctx.infoPanel) {
            ctx.infoPanel.classList.remove('visible');
        }

        const container = ctx.amenitiesContainer;
        if (!container) return;

        if (!dataList || !dataList.length) {
            ctx.setEmptyVisible(true);
            return;
        }

        const ui = ctx.getUi();
        if (!ui || !ui.createAmenityNodes) {
            console.warn('Amenities UI helper is not available.');
            ctx.setEmptyVisible(true);
            return;
        }

        ctx.setEmptyVisible(false);

        const result = ui.createAmenityNodes(dataList);
        const fragment = result?.fragment;
        const nodes = result?.nodes;
        if (!fragment || !nodes || nodes.length !== dataList.length) {
            console.warn('Amenities UI nodes are missing or invalid.');
            ctx.setEmptyVisible(true);
            return;
        }

        container.appendChild(fragment);

        ctx.amenitiesData.length = 0;
        for (let i = 0; i < dataList.length; i++) {
            const raw = dataList[i];
            const root = nodes[i];
            const style = root.style;
            root.setAttribute('aria-expanded', 'false');

            ctx.amenitiesData.push({
                dom: root,
                style,
                worldPos: raw.worldPos,
                title: raw.title,
                image: raw.image,
                description: raw.description,
                lastX: NaN,
                lastY: NaN,
                visible: false
            });
        }

        ctx.updateAmenityTextWidths();

        ctx._rectDirty = true;
        ctx._forceDomUpdate = true;
        updateDomPositions(ctx);

        window.PcScriptShared?.requestRenderFrame?.(ctx.app);
    };

    const updateDomPositions = (ctx) => {
        const isPortrait = ctx.isPhoneLayout?.() ?? window.AppDetect?.isPortraitMobile?.() ?? false;
        const portraitOffsetYBase = isPortrait && isFinite(ctx.portraitScreenOffsetY) ? ctx.portraitScreenOffsetY : 0;
        const lerpRaw = Number(ctx.domPositionLerp);
        const positionLerp = isFinite(lerpRaw) ? Math.max(0.05, Math.min(1, lerpRaw)) : 0.22;
        window.PcScriptShared.updateDomPositions(ctx, ctx.amenitiesData, {
            getPortraitOffset: (item) => (item === ctx._selectedAmenityData ? portraitOffsetYBase : 0),
            transformSuffix: ctx.getDomTransformSuffix ? ctx.getDomTransformSuffix() : (ctx.transformSuffix || ' translate(-50%, -50%)'),
            positionLerp
        });
    };

    const clearAmenities = (ctx) => {
        const ui = ctx.getUi();

        if (ui && ui.clearContainer) ui.clearContainer(ctx.amenitiesContainer, ctx._emptyMessageEl);
        else if (ctx.amenitiesContainer) {
            if (ctx._emptyMessageEl && ctx._emptyMessageEl.parentNode === ctx.amenitiesContainer) {
                ctx.amenitiesContainer.replaceChildren(ctx._emptyMessageEl);
            } else {
                ctx.amenitiesContainer.textContent = '';
            }
        }

        ctx.setEmptyVisible(false);
        ctx.amenitiesData.length = 0;
        ctx._expandedAmenityEl = null;
        ctx._selectedAmenityData = null;
        if (ctx.infoPanel) {
            ctx.infoPanel.style.removeProperty('--info-panel-x');
            ctx.infoPanel.style.removeProperty('--info-panel-y');
        }
        ctx._selectedAmenityEl = null;
        ctx._infoPanelPortraitPlacement = null;
        ctx.markInfoPanelSizeDirty();
        ctx.updateInfoPanelNavState();
    };

    window.AmenitiesDomShared = {
        loadDataFromCsv,
        renderAmenities,
        updateDomPositions,
        clearAmenities
    };
})();
