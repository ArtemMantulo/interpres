(function () {
    if (window.AmenitiesUi) return;

    let template = null;

    const createAmenityTemplate = () => {
        const root = document.createElement('div');
        root.className = 'amenities';

        const glass = document.createElement('div');
        glass.className = 'glass-panel border-shadow';

        const container = document.createElement('div');
        container.className = 'panel-container';

        const icon = document.createElement('img');
        icon.className = 'amenities-icon';

        const text = document.createElement('div');
        text.className = 'amenities-text';

        const line = document.createElement('div');
        line.className = 'amenities-line';

        container.append(icon, text);
        root.append(glass, container, line);

        template = root;
        return template;
    };

    const ensureTemplate = () => template || createAmenityTemplate();

    const createAmenityNodes = (dataList) => {
        const fragment = document.createDocumentFragment();
        const nodes = new Array(dataList.length);
        const tpl = ensureTemplate();

        for (let i = 0; i < dataList.length; i++) {
            const data = dataList[i];
            const root = tpl.cloneNode(true);

            const panelContainer = root.children[1];
            panelContainer.children[0].src = data.iconUrl;
            panelContainer.children[0].alt = data.title || '';
            panelContainer.children[1].textContent = data.title;

            root.dataset.index = i;
            root.setAttribute('role', 'button');
            root.setAttribute('tabindex', '0');
            if (data.title) root.setAttribute('aria-label', data.title);

            fragment.appendChild(root);
            nodes[i] = root;
        }

        return { fragment, nodes };
    };

    const ensureEmptyMessage = (container) => {
        if (!container) return null;
        let el = container.querySelector('.amenities-empty');
        if (!el) {
            el = document.createElement('div');
            el.className = 'amenities-empty';
            el.setAttribute('data-lng', 'amenities_empty');
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            el.textContent = 'No amenities available';
            container.appendChild(el);
        }
        return el;
    };

    const setEmptyVisible = (el, visible) => {
        if (!el) return;
        el.classList.toggle('visible', !!visible);
        el.setAttribute('aria-hidden', visible ? 'false' : 'true');
    };

    const clearContainer = (container, keepEl) => {
        if (!container) return;
        if (keepEl && keepEl.parentNode === container) container.replaceChildren(keepEl);
        else container.replaceChildren();
    };

    window.AmenitiesUi = {
        createAmenityNodes,
        ensureEmptyMessage,
        setEmptyVisible,
        clearContainer
    };
})();
