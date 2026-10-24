(function () {
    if (window.AmenitiesShared) return;

    const parseData = (json, lang) => {
        const source = json?.amenities;
        if (!Array.isArray(source) || !source.length) return [];

        const resolvedLang = window.AppLanguage?.normalize?.(lang) ?? 'en';
        const dataList = [];

        for (let i = 0; i < source.length; i++) {
            const entry = source[i];
            const pos = entry.position;
            if (!Array.isArray(pos) || pos.length < 3) continue;

            const x = parseFloat(pos[0]);
            const y = parseFloat(pos[1]);
            const z = parseFloat(pos[2]);
            if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;

            const t = entry.translations?.[resolvedLang] || entry.translations?.['en'] || {};

            dataList.push({
                iconUrl: entry.icon || '',
                title: t.title || '',
                image: entry.image || '',
                description: t.description || '',
                worldPos: typeof pc !== 'undefined' ? new pc.Vec3(x, y, z) : { x, y, z }
            });
        }

        return dataList;
    };

    const updateAmenityTextWidths = (dataList) => {
        if (!dataList || !dataList.length) return;

        // Batch: unhide all hidden elements first (single layout invalidation)
        const unhidden = [];
        for (let i = 0; i < dataList.length; i++) {
            const root = dataList[i]?.dom;
            if (!root || !root.isConnected) continue;
            if (root.style.display === 'none') {
                root.style.visibility = 'hidden';
                root.style.display = 'block';
                unhidden.push(root);
            }
        }

        // Batch read: measure all text widths in a single layout pass
        for (let i = 0; i < dataList.length; i++) {
            const root = dataList[i]?.dom;
            if (!root || !root.isConnected) continue;
            const textEl = root.querySelector('.amenities-text');
            if (!textEl) continue;
            const targetWidth = Math.max(1, Math.ceil(textEl.scrollWidth));
            root.style.setProperty('--amenity-text-target-width', `${targetWidth}px`);
        }

        // Batch write: restore hidden state
        for (let i = 0; i < unhidden.length; i++) {
            unhidden[i].style.display = 'none';
            unhidden[i].style.visibility = '';
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
            y = anchorY - offset - halfH;
        }

        x = Math.min(maxX, Math.max(minX, x));
        y = Math.min(maxY, Math.max(minY, y));

        return { x, y, portraitPlacement: nextPortraitPlacement };
    };

    window.AmenitiesShared = {
        parseData,
        updateAmenityTextWidths,
        computeInfoPanelPosition
    };
})();