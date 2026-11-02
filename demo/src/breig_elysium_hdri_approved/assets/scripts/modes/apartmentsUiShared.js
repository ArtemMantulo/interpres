(function () {
    if (window.ApartmentsUiShared) return;

    const createMarkerNode = (item, index) => {
        const root = document.createElement('div');
        root.className = 'apartment-pin';
        root.style.display = 'none';
        root.dataset.index = String(index);
        root.setAttribute('role', 'button');
        root.setAttribute('tabindex', '0');
        if (item.title) root.setAttribute('aria-label', item.title);

        const glass = document.createElement('div');
        glass.className = 'glass-panel border-shadow';
        const line = document.createElement('div');
        line.className = 'amenities-line';
        glass.appendChild(line);

        const panel = document.createElement('div');
        panel.className = 'panel-container';

        const icon = document.createElement('img');
        icon.className = 'apartment-pin-icon';
        icon.src = item.iconUrl || '';
        icon.alt = item.title || '';

        const text = document.createElement('div');
        text.className = 'apartment-pin-text';
        text.textContent = item.title || '';

        panel.append(icon, text);
        root.append(glass, panel);
        return root;
    };

    const renderMarkers = (container, items) => {
        if (!container) return [];

        const fragment = document.createDocumentFragment();
        const data = new Array(items.length);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const node = createMarkerNode(item, i);
            fragment.appendChild(node);
            data[i] = {
                dom: node,
                style: node.style,
                iconUrl: item.iconUrl,
                title: item.title,
                detailsCsvUrl: item.detailsCsvUrl,
                worldPos: item.worldPos,
                visible: false,
                lastX: NaN,
                lastY: NaN
            };
        }

        container.replaceChildren();
        container.appendChild(fragment);
        return data;
    };

    const createFloorPanelItems = (rows) => {
        const source = Array.isArray(rows) ? rows : [];
        const fragment = document.createDocumentFragment();
        const nodes = new Array(source.length);

        for (let i = 0; i < source.length; i++) {
            const row = source[i];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'floor-panel-item';
            btn.dataset.floorIndex = String(i);
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-selected', 'false');

            const floorText = row?.floorRaw ? String(row.floorRaw) : String(i + 1);
            btn.setAttribute('aria-label', `Floor ${floorText}`);

            const num = document.createElement('span');
            num.className = 'floor-panel-item-number';
            num.textContent = floorText;

            const label = document.createElement('span');
            label.className = 'floor-panel-item-label';
            label.textContent = `Floor ${floorText}`;

            btn.append(num, label);
            fragment.appendChild(btn);
            nodes[i] = btn;
        }

        return { fragment, nodes };
    };

    const getPanelElements = (container) => {
        if (!container) return null;
        return {
            title: container.querySelector('.apartment-panel-title, .panel-title'),
            area: container.querySelector('.apartment-panel-area'),
            bedrooms: container.querySelector('.apartment-panel-bedrooms'),
            availability: container.querySelector('.apartment-panel-availability'),
            description: container.querySelector('.apartment-panel-description, .panel-description'),
            image: container.querySelector('.apartment-panel-image, .panel-image')
        };
    };

    const applyPanelContent = (elements, marker, floorRow) => {
        if (!elements) return;
        const markerTitle = marker?.title || 'Apartments';
        const floorLabel = floorRow?.floorRaw ? `Floor ${floorRow.floorRaw}` : 'Floor -';
        const unitName = floorRow?.name || markerTitle;

        if (elements.title) elements.title.textContent = `${unitName}, ${floorLabel}`;
        if (elements.area) elements.area.textContent = floorRow?.area || '-';
        if (elements.bedrooms) elements.bedrooms.textContent = floorRow?.bedrooms || '-';
        if (elements.availability) elements.availability.textContent = floorRow?.availability || '-';
        if (elements.description) elements.description.textContent = floorRow?.description || '';
        if (elements.image) {
            elements.image.src = floorRow?.imageUrl || 'assets/images/pictures/pic_loading.png';
            elements.image.alt = unitName;
        }
    };

    window.ApartmentsUiShared = {
        createMarkerNode,
        renderMarkers,
        createFloorPanelItems,
        getPanelElements,
        applyPanelContent
    };
})();