(function () {
    if (window.AmenitiesDomShared) return;

    const loadDataFromCsv = (ctx) => {
        ctx.ensureCsvAssets();

        const asset = ctx.currentCsv;
        if (!asset) {
            renderAmenities(ctx, []);
            return;
        }

        const token = ++ctx._csvLoadToken;

        const parse = () => {
            if (token !== ctx._csvLoadToken) return;
            if (ctx.currentMode !== '2') return;
            const dataList = ctx.getAmenitiesData(asset);
            renderAmenities(ctx, dataList);
        };

        if (asset.resource) return parse();

        asset.once('load', parse);
        asset.once('error', (err) => {
            if (token !== ctx._csvLoadToken) return;
            console.warn('Amenities CSV load failed:', err);
            renderAmenities(ctx, []);
        });

        if (asset.registry) ctx.app.assets.load(asset);
        else {
            ctx.app.assets.add(asset);
            ctx.app.assets.load(asset);
        }
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

        if (ctx.app && !ctx.app.autoRender && 'renderNextFrame' in ctx.app) ctx.app.renderNextFrame = true;
    };

    const updateDomPositions = (ctx) => {
        const isPortrait = window.innerHeight > window.innerWidth;
        const portraitOffsetYBase = isPortrait && isFinite(ctx.portraitScreenOffsetY) ? ctx.portraitScreenOffsetY : 0;
        window.PcScriptShared.updateDomPositions(ctx, ctx.amenitiesData, {
            getPortraitOffset: (item) => (item === ctx._selectedAmenityData ? portraitOffsetYBase : 0)
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