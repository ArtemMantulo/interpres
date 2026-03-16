(function () {
    if (window.AmenitiesShared) return;

    const SUPPORTED_LANGS = new Set(['en', 'ru', 'ko', 'zh', 'de', 'fr', 'es', 'ar', 'ja']);

    const resolveLang = (appLang, docEl, navLang) => {
        if (appLang?.get) return appLang.get();

        const raw = docEl?.getAttribute?.('lang') || navLang || 'en';
        if (appLang?.normalize) return appLang.normalize(raw);

        const lang = String(raw).split('-')[0].toLowerCase();
        return SUPPORTED_LANGS.has(lang) ? lang : 'en';
    };

    const parseCsvText = (csvText, minColumns) => {
        const csv = window.CsvShared;
        const rows = csv?.parseRows
            ? csv.parseRows(csvText, { delimiter: ';', minColumns })
            : [];
        const dataList = [];
        const minCols = isFinite(minColumns) ? minColumns : 7;

        for (let i = 0; i < rows.length; i++) {
            const parts = rows[i];
            if (parts.length < minCols) continue;

            const x = parseFloat(parts[4]);
            const y = parseFloat(parts[5]);
            const z = parseFloat(parts[6]);
            if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;

            dataList.push({
                iconUrl: parts[0].trim(),
                title: parts[1].trim(),
                image: parts[2].trim(),
                description: parts[3].trim(),
                worldPos: typeof pc !== 'undefined' ? new pc.Vec3(x, y, z) : { x, y, z }
            });
        }

        return dataList;
    };

    const getAssetCacheKey = (asset) => {
        if (!asset) return '';
        const url = asset.getFileUrl?.() || asset.file?.url || asset.url || '';
        return url || String(asset.id || asset.name || '');
    };

    const getAmenitiesData = (cache, asset, minColumns) => {
        const key = getAssetCacheKey(asset);
        if (key && cache?.has?.(key)) return cache.get(key);

        const dataList = parseCsvText(asset?.resource || '', minColumns);
        if (key && cache?.set) cache.set(key, dataList);
        return dataList;
    };

    const updateAmenityTextWidths = (dataList) => {
        if (!dataList || !dataList.length) return;

        for (let i = 0; i < dataList.length; i++) {
            const data = dataList[i];
            const root = data?.dom;
            if (!root || !root.isConnected) continue;

            const textEl = root.querySelector('.amenities-text');
            if (!textEl) continue;

            const targetWidth = Math.max(1, Math.ceil(textEl.scrollWidth));
            root.style.setProperty('--amenity-text-target-width', `${targetWidth}px`);
        }
    };

    const computeInfoPanelPosition = ({
        anchorX,
        anchorY,
        panelWidth,
        panelHeight,
        viewportWidth,
        viewportHeight,
        offset,
        margin,
        portraitPlacement
    }) => {
        const halfW = panelWidth * 0.5;
        const halfH = panelHeight * 0.5;

        const minX = margin + halfW;
        const maxX = viewportWidth - margin - halfW;
        const minY = margin + halfH;
        const maxY = viewportHeight - margin - halfH;
        const isPortrait = viewportHeight > viewportWidth;
        let x = anchorX;
        let y = anchorY;
        let nextPortraitPlacement = portraitPlacement || null;

        if (isPortrait) {
            const requiredOffset = offset + halfH;
            const yAbove = anchorY - requiredOffset;
            nextPortraitPlacement = 'above';
            y = yAbove;
        } else {
            x = anchorX + offset + halfW;
            if (x > maxX) x = anchorX - offset - halfW;
        }

        x = Math.min(maxX, Math.max(minX, x));
        y = Math.min(maxY, Math.max(minY, y));

        return { x, y, portraitPlacement: nextPortraitPlacement };
    };

    window.AmenitiesShared = {
        resolveLang,
        parseCsvText,
        getAssetCacheKey,
        getAmenitiesData,
        updateAmenityTextWidths,
        computeInfoPanelPosition
    };
})();
