var AmenitiesMode = pc.createScript('amenitiesMode');

AmenitiesMode.attributes.add('currentCsv', { type: 'asset' });
AmenitiesMode.attributes.add('fpsLockerState', { type: 'json' });
AmenitiesMode.attributes.add('domUpdateInterval', { type: 'number', default: 120 });
AmenitiesMode.attributes.add('csvMinColumns', { type: 'number', default: 7 });
AmenitiesMode.attributes.add('screenVisibilityThreshold', { type: 'number', default: 0.25 });
AmenitiesMode.attributes.add('transformSuffix', { type: 'string', default: ' translate(-50%, -50%)' });
AmenitiesMode.attributes.add('infoPanelOffset', { type: 'number', default: 36 });
AmenitiesMode.attributes.add('infoPanelViewportMargin', { type: 'number', default: 12 });

AmenitiesMode.prototype.initialize = function () {
    this.cameraEntity = this.app.root.findByName('Camera');
    this.amenitiesContainer = document.querySelector('#amenities-container');

    this.infoPanel = document.querySelector('#info-panel');
    this.infoPanelClose = this.infoPanel ? this.infoPanel.querySelector('.panel-close') : null;
    this.panelImage = this.infoPanel ? this.infoPanel.querySelector('.panel-image') : null;
    this.panelTitle = this.infoPanel ? this.infoPanel.querySelector('.panel-title') : null;
    this.panelDescription = this.infoPanel ? this.infoPanel.querySelector('.panel-description') : null;

    this._modeButtons = Array.from(document.querySelectorAll('.mode-panel .button'));
    this._modeManager = window.AppModeManager || null;

    this._modeBtn0 = this._modeButtons.find((b) => b && b.dataset && b.dataset.mode === '0') || null;
    this._modeBtn1 = this._modeButtons.find((b) => b && b.dataset && b.dataset.mode === '1') || null;

    this.currentMode =
        (this._modeManager && this._modeManager.getMode && this._modeManager.getMode()) ||
        document.querySelector('.mode-panel .button.active')?.dataset?.mode ||
        '0';

    const orbit = this.getOrbit();
    if (orbit && orbit.targetPosition) {
        const t = orbit.targetPosition;
        this._homeTarget = new pc.Vec3(t.x, t.y, t.z);
    } else {
        this._homeTarget = new pc.Vec3(0, 0, 0);
    }

    this.amenitiesData = [];
    this._screenPos = new pc.Vec3();

    this._canvasRect = null;
    this._rectDirty = true;

    this._domUpdateTimer = 0;
    this._forceDomUpdate = false;
    this.domUpdateInterval = this.domUpdateInterval | 0 || 120;
    this._csvLoadToken = 0;
    this._amenitiesCache = new Map();
    this._ui = null;
    this._shared = window.AmenitiesShared || null;
    this._emptyMessageEl = null;
    this._currentLang = null;
    this._expandedAmenityEl = null;
    this._selectedAmenityEl = null;
    this._selectedAmenityData = null;
    this._textWidthRaf = 0;

    this._onModeBtn0Click = () => this.setMode('0');
    this._onModeBtn1Click = () => this.setMode('1');
    this._onModeKeyDown = (e) => {
        if (!window.UiKeys?.isActivateKey?.(e)) return;
        e.preventDefault();
        e.currentTarget?.click?.();
    };

    this._onAmenityClick = this.onAmenityClick.bind(this);
    this._onAmenityKeyDown = this.onAmenityKeyDown.bind(this);
    this._onModeChange = (mode, _prev, source) => {
        if (source === 'amenitiesMode') return;
        this.setMode(mode, { fromManager: true, silentEvent: true });
    };
    this._onInfoPanelCloseClick = this.closeInfoPanel.bind(this);
    this._onInfoPanelCloseKeyDown = (e) => {
        if (!window.UiKeys?.isActivateKey?.(e)) return;
        e.preventDefault();
        this.closeInfoPanel();
    };
    this._onViewportDirty = () => {
        this._rectDirty = true;
        this.scheduleAmenityTextWidthUpdate();
        this._forceDomUpdate = true;
    };

    this.bindDomEvents();
    this.setActiveModeButton(this.currentMode);

    this._ui = window.AmenitiesUi || null;

    if (this.amenitiesContainer) {
        if (this._ui && this._ui.ensureEmptyMessage) {
            this._emptyMessageEl = this._ui.ensureEmptyMessage(this.amenitiesContainer);
            this._ui.setEmptyVisible(this._emptyMessageEl, false);
        } else {
            this._emptyMessageEl = this.amenitiesContainer.querySelector('.amenities-empty');
            if (this._emptyMessageEl) {
                this._emptyMessageEl.classList.remove('visible');
                this._emptyMessageEl.setAttribute('aria-hidden', 'true');
            }
        }
    }
};

AmenitiesMode.prototype.bindDomEvents = function () {
    if (!this._modeManager) {
        this._modeBtn0 && this._modeBtn0.addEventListener('click', this._onModeBtn0Click);
        this._modeBtn1 && this._modeBtn1.addEventListener('click', this._onModeBtn1Click);

        if (this._modeButtons && this._modeButtons.length) {
            for (let i = 0; i < this._modeButtons.length; i++) {
                this._modeButtons[i].addEventListener('keydown', this._onModeKeyDown);
            }
        }
    }

    this.amenitiesContainer && this.amenitiesContainer.addEventListener('click', this._onAmenityClick);
    this.amenitiesContainer && this.amenitiesContainer.addEventListener('keydown', this._onAmenityKeyDown);
    this.infoPanelClose && this.infoPanelClose.addEventListener('click', this._onInfoPanelCloseClick);
    this.infoPanelClose &&
        this.infoPanelClose.addEventListener('keydown', this._onInfoPanelCloseKeyDown);

    window.addEventListener('resize', this._onViewportDirty, { passive: true });
    window.addEventListener('scroll', this._onViewportDirty, { passive: true });
    this.app.on('mode:change', this._onModeChange, this);
};

AmenitiesMode.prototype.unbindDomEvents = function () {
    if (!this._modeManager) {
        this._modeBtn0 && this._modeBtn0.removeEventListener('click', this._onModeBtn0Click);
        this._modeBtn1 && this._modeBtn1.removeEventListener('click', this._onModeBtn1Click);

        if (this._modeButtons && this._modeButtons.length) {
            for (let i = 0; i < this._modeButtons.length; i++) {
                this._modeButtons[i].removeEventListener('keydown', this._onModeKeyDown);
            }
        }
    }

    this.amenitiesContainer && this.amenitiesContainer.removeEventListener('click', this._onAmenityClick);
    this.amenitiesContainer && this.amenitiesContainer.removeEventListener('keydown', this._onAmenityKeyDown);
    this.infoPanelClose &&
        this.infoPanelClose.removeEventListener('click', this._onInfoPanelCloseClick);
    this.infoPanelClose &&
        this.infoPanelClose.removeEventListener('keydown', this._onInfoPanelCloseKeyDown);

    window.removeEventListener('resize', this._onViewportDirty);
    window.removeEventListener('scroll', this._onViewportDirty);
    this.app.off('mode:change', this._onModeChange, this);
};

AmenitiesMode.prototype.getOrbit = function () {
    return this.cameraEntity && this.cameraEntity.script ? this.cameraEntity.script.orbitCamera || null : null;
};

AmenitiesMode.prototype.getUi = function () {
    if (!this._ui && window.AmenitiesUi) this._ui = window.AmenitiesUi;
    return this._ui;
};

AmenitiesMode.prototype.getShared = function () {
    if (!this._shared && window.AmenitiesShared) this._shared = window.AmenitiesShared;
    return this._shared;
};

AmenitiesMode.prototype.getLang = function () {
    const shared = this.getShared();
    if (shared?.resolveLang) {
        return shared.resolveLang(window.AppLanguage, document.documentElement, navigator.language);
    }

    const appLang = window.AppLanguage;
    if (appLang?.get) return appLang.get();

    const raw = document.documentElement.getAttribute('lang') || navigator.language || 'en';
    if (appLang?.normalize) return appLang.normalize(raw);

    const lang = String(raw).split('-')[0].toLowerCase();
    return lang === 'en' ||
        lang === 'ru' ||
        lang === 'ko' ||
        lang === 'zh' ||
        lang === 'de' ||
        lang === 'fr' ||
        lang === 'es' ||
        lang === 'ar' ||
        lang === 'ja'
        ? lang
        : 'en';
};

AmenitiesMode.prototype.ensureCsvAssets = function () {
    const lang = this.getLang();

    if (this._currentLang && this._currentLang !== lang) {
        this._amenitiesCache.clear();
        this.currentCsv = null;
    }
    this._currentLang = lang;

    if (!this.currentCsv) {
        this.currentCsv = new pc.Asset(`amenities-current-${lang}.csv`, 'text', {
            url: `assets/data/dataAmenitiesCurrent_${lang}.csv`
        });
    }

    if (this.currentCsv && !this.currentCsv.registry) this.app.assets.add(this.currentCsv);
};

AmenitiesMode.prototype.getAssetCacheKey = function (asset) {
    const shared = this.getShared();
    if (shared?.getAssetCacheKey) return shared.getAssetCacheKey(asset);
    if (!asset) return '';
    const url = asset.getFileUrl?.() || asset.file?.url || asset.url || '';
    return url || String(asset.id || asset.name || '');
};

AmenitiesMode.prototype.parseCsvText = function (csvText) {
    const shared = this.getShared();
    if (shared?.parseCsvText) return shared.parseCsvText(csvText, this.csvMinColumns);

    const rows = String(csvText || '').trim().split(/\r?\n/).filter(Boolean);
    const dataList = [];
    const minColumns = isFinite(this.csvMinColumns) ? this.csvMinColumns : 7;

    for (let i = 0; i < rows.length; i++) {
        const parts = rows[i].split(';');
        if (parts.length < minColumns) continue;

        const x = parseFloat(parts[4]);
        const y = parseFloat(parts[5]);
        const z = parseFloat(parts[6]);
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) continue;

        dataList.push({
            iconUrl: parts[0].trim(),
            title: parts[1].trim(),
            image: parts[2].trim(),
            description: parts[3].trim(),
            worldPos: new pc.Vec3(x, y, z)
        });
    }

    return dataList;
};

AmenitiesMode.prototype.getAmenitiesData = function (asset) {
    const shared = this.getShared();
    if (shared?.getAmenitiesData) {
        return shared.getAmenitiesData(this._amenitiesCache, asset, this.csvMinColumns);
    }

    const key = this.getAssetCacheKey(asset);
    if (key && this._amenitiesCache.has(key)) return this._amenitiesCache.get(key);
    const dataList = this.parseCsvText(asset?.resource || '');
    if (key) this._amenitiesCache.set(key, dataList);
    return dataList;
};

AmenitiesMode.prototype.setEmptyVisible = function (visible) {
    const ui = this.getUi();
    if (ui && ui.setEmptyVisible) ui.setEmptyVisible(this._emptyMessageEl, visible);
    else if (this._emptyMessageEl) {
        this._emptyMessageEl.style.display = visible ? 'block' : 'none';
        this._emptyMessageEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
};

AmenitiesMode.prototype.getCanvasRect = function () {
    if (!this._rectDirty && this._canvasRect) return this._canvasRect;
    const canvas = this.app?.graphicsDevice?.canvas;
    if (!canvas || !canvas.getBoundingClientRect) return null;
    this._canvasRect = canvas.getBoundingClientRect();
    this._rectDirty = false;
    return this._canvasRect;
};

AmenitiesMode.prototype.setActiveModeButton = function (modeStr) {
    if (!this._modeButtons) return;

    for (let i = 0; i < this._modeButtons.length; i++) {
        const btn = this._modeButtons[i];
        if (!btn) continue;
        const isActive = btn.dataset.mode === modeStr;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
};

AmenitiesMode.prototype.setMode = function (modeStr, options) {
    const opts = options || {};
    const next = modeStr ?? '0';
    if (!opts.fromManager && this._modeManager?.setMode) {
        this._modeManager.setMode(next, { source: 'amenitiesMode' });
        return;
    }

    const sameMode = this.currentMode === next;
    if (sameMode && next !== '0') return;

    const prevMode = this.currentMode;
    this.currentMode = next;
    this.setActiveModeButton(next);

    if (!opts.silentEvent) this.app.fire('mode:change', next, prevMode, 'amenitiesMode');

    if (next === '0') {
        this._csvLoadToken++;
        this.clearAmenities();
        this.infoPanel && this.infoPanel.classList.remove('visible');

        const orbit = this.getOrbit();
        if (!orbit) return;

        orbit.autoRotateMode = 0;
        if (orbit.setAutoRotateEnabled) orbit.setAutoRotateEnabled(true);
        else orbit.autoRotateEnabled = true;

        orbit.adjustDistanceForOrientation && orbit.adjustDistanceForOrientation();
        orbit.setDistanceLimits && orbit.setDistanceLimits(orbit.minDistance, orbit.maxDistance);

        orbit.resetInteractionState && orbit.resetInteractionState();
        orbit.focusOn && orbit.focusOn(this._homeTarget);
        return;
    }

    if (next !== '1') {
        this._csvLoadToken++;
        this.clearAmenities();
        this.infoPanel && this.infoPanel.classList.remove('visible');
        return;
    }

    const orbit = this.getOrbit();
    if (orbit) {
        orbit.autoRotateMode = 1;
        if (orbit.setAutoRotateEnabled) orbit.setAutoRotateEnabled(false);
        else orbit.autoRotateEnabled = false;
        orbit.resetInteractionState && orbit.resetInteractionState();
        orbit.focusOn && orbit.focusOn(this._homeTarget);
    }

    this._forceDomUpdate = true;
    this._rectDirty = true;
    if (this.app && !this.app.autoRender && 'renderNextFrame' in this.app) this.app.renderNextFrame = true;

    this.loadDataFromCsv();
};

AmenitiesMode.prototype.applyInfoPanelContent = function (data) {
    if (!data) return;
    if (this.panelImage) {
        this.panelImage.src = data.image || '';
        this.panelImage.alt = data.title || '';
    }
    if (this.panelTitle) this.panelTitle.textContent = data.title || '';
    if (this.panelDescription) this.panelDescription.textContent = data.description || '';
};

AmenitiesMode.prototype.openInfoPanel = function () {
    if (!this.infoPanel) return;
    if (this.infoPanel.classList.contains('visible')) return;
    requestAnimationFrame(() => {
        if (!this.infoPanel || !this._selectedAmenityData) return;
        this.infoPanel.classList.add('visible');
    });
};

AmenitiesMode.prototype.closeInfoPanel = function () {
    if (this.infoPanel) this.infoPanel.classList.remove('visible');

    if (this._selectedAmenityEl) {
        this._selectedAmenityEl.classList.remove('selected-for-info');
    }

    this._selectedAmenityEl = null;
    this._selectedAmenityData = null;
};

AmenitiesMode.prototype.onAmenityClick = function (e) {
    const item = e.target && e.target.closest ? e.target.closest('.amenities') : null;
    if (!item) return;

    const index = item.dataset.index | 0;
    const data = this.amenitiesData[index];
    if (!data) return;

    const prevSelected = this._selectedAmenityEl;
    if (prevSelected && prevSelected !== item) prevSelected.classList.remove('selected-for-info');
    item.classList.add('selected-for-info');
    this._selectedAmenityEl = item;

    this.setExpandedAmenity(null);
    this._selectedAmenityData = data;
    this.applyInfoPanelContent(data);
    this.updateInfoPanelPosition();
    this.openInfoPanel();
    this._forceDomUpdate = true;

    this.focusCameraOn(data.worldPos);
};

AmenitiesMode.prototype.setExpandedAmenity = function (item) {
    const prev = this._expandedAmenityEl;
    if (prev && prev !== item) {
        prev.classList.remove('expanded');
        prev.setAttribute('aria-expanded', 'false');
    }

    this._expandedAmenityEl = item || null;

    if (item) {
        item.classList.add('expanded');
        item.setAttribute('aria-expanded', 'true');
    }
};

AmenitiesMode.prototype.onAmenityKeyDown = function (e) {
    if (!window.UiKeys?.isActivateKey?.(e)) return;
    const item = e.target && e.target.closest ? e.target.closest('.amenities') : null;
    if (!item) return;
    e.preventDefault();
    this.onAmenityClick({ target: item });
};

AmenitiesMode.prototype.focusCameraOn = function (targetPosition) {
    const orbit = this.getOrbit();
    if (!orbit) return;

    orbit.resetInteractionState();

    orbit.setAmenitiesDistanceByOrientation && orbit.setAmenitiesDistanceByOrientation();
    orbit.focusOn && orbit.focusOn(targetPosition);
    orbit.lookAtPointSmoothly && orbit.lookAtPointSmoothly(targetPosition);
};

AmenitiesMode.prototype.updateInfoPanelPosition = function () {
    if (!this.infoPanel || !this._selectedAmenityData || !this._selectedAmenityData.worldPos) return;

    let anchorX = this._selectedAmenityData.lastX;
    let anchorY = this._selectedAmenityData.lastY;

    const hasDomAnchor =
        this._selectedAmenityData.visible && Number.isFinite(anchorX) && Number.isFinite(anchorY);

    if (!hasDomAnchor) {
        const camera = this.cameraEntity && this.cameraEntity.camera;
        if (!camera) return;

        const rect = this.getCanvasRect();
        if (!rect) return;

        const screenPos = this._screenPos;
        camera.worldToScreen(this._selectedAmenityData.worldPos, screenPos);

        const onScreen =
            screenPos.z > 0 && Number.isFinite(screenPos.x) && Number.isFinite(screenPos.y);
        if (!onScreen) return;

        anchorX = rect.left + screenPos.x;
        anchorY = rect.top + screenPos.y;
    }

    const panelRect = this.infoPanel.getBoundingClientRect();
    const panelWidth = panelRect.width || 300;
    const panelHeight = panelRect.height || 200;

    const margin = isFinite(this.infoPanelViewportMargin) ? this.infoPanelViewportMargin : 12;
    const offset = isFinite(this.infoPanelOffset) ? this.infoPanelOffset : 36;
    const shared = this.getShared();
    const pos = shared?.computeInfoPanelPosition
        ? shared.computeInfoPanelPosition({
              anchorX,
              anchorY,
              panelWidth,
              panelHeight,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              offset,
              margin
          })
        : (() => {
              const halfW = panelWidth * 0.5;
              const halfH = panelHeight * 0.5;
              const minX = margin + halfW;
              const maxX = window.innerWidth - margin - halfW;
              const minY = margin + halfH;
              const maxY = window.innerHeight - margin - halfH;
              let x = anchorX + offset + halfW;
              let y = anchorY;
              if (x > maxX) x = anchorX - offset - halfW;
              x = Math.min(maxX, Math.max(minX, x));
              y = Math.min(maxY, Math.max(minY, y));
              return { x, y };
          })();
    const x = pos.x;
    const y = pos.y;

    this.infoPanel.style.setProperty('--info-panel-x', `${x}px`);
    this.infoPanel.style.setProperty('--info-panel-y', `${y}px`);
};

AmenitiesMode.prototype.updateAmenityTextWidths = function () {
    const shared = this.getShared();
    if (shared?.updateAmenityTextWidths) shared.updateAmenityTextWidths(this.amenitiesData);
};

AmenitiesMode.prototype.scheduleAmenityTextWidthUpdate = function () {
    if (this._textWidthRaf) return;
    this._textWidthRaf = requestAnimationFrame(() => {
        this._textWidthRaf = 0;
        this.updateAmenityTextWidths();
    });
};

AmenitiesMode.prototype.postUpdate = function (dt) {
    if (!this.amenitiesData.length) return;
    if (document.hidden) return;

    const orbit = this.getOrbit();
    const interacting = !!orbit && orbit.isUserInteracting();
    const moved = orbit && orbit.movedThisFrame;

    if (!this._forceDomUpdate && !interacting && !moved) return;

    if (this.fpsLockerState?.active && !interacting && !this._forceDomUpdate) {
        this._domUpdateTimer += dt * 1000;
        if (this._domUpdateTimer < this.domUpdateInterval) return;
        this._domUpdateTimer = 0;
    }

    this._forceDomUpdate = false;
    this.updateDomPositions();
};

AmenitiesMode.prototype.loadDataFromCsv = function () {
    this.ensureCsvAssets();

    const asset = this.currentCsv;
    if (!asset) {
        this.renderAmenities([]);
        return;
    }

    const token = ++this._csvLoadToken;

    const parse = () => {
        if (token !== this._csvLoadToken) return;
        if (this.currentMode !== '1') return;
        const dataList = this.getAmenitiesData(asset);
        this.renderAmenities(dataList);
    };

    if (asset.resource) return parse();

    asset.once('load', parse);
    asset.once('error', (err) => {
        if (token !== this._csvLoadToken) return;
        console.warn('Amenities CSV load failed:', err);
        this.renderAmenities([]);
    });

    if (asset.registry) this.app.assets.load(asset);
    else {
        this.app.assets.add(asset);
        this.app.assets.load(asset);
    }
};

AmenitiesMode.prototype.renderAmenities = function (dataList) {
    this.clearAmenities();
    if (this.infoPanel) {
        this.infoPanel.classList.remove('visible');
    }

    const container = this.amenitiesContainer;
    if (!container) return;

    if (!dataList || !dataList.length) {
        this.setEmptyVisible(true);
        return;
    }

    const ui = this.getUi();
    if (!ui || !ui.createAmenityNodes) {
        console.warn('Amenities UI helper is not available.');
        this.setEmptyVisible(true);
        return;
    }

    this.setEmptyVisible(false);

    const result = ui.createAmenityNodes(dataList);
    const fragment = result?.fragment;
    const nodes = result?.nodes;
    if (!fragment || !nodes || nodes.length !== dataList.length) {
        console.warn('Amenities UI nodes are missing or invalid.');
        this.setEmptyVisible(true);
        return;
    }

    container.appendChild(fragment);

    this.amenitiesData.length = 0;
    for (let i = 0; i < dataList.length; i++) {
        const raw = dataList[i];
        const root = nodes[i];
        const style = root.style;
        root.setAttribute('aria-expanded', 'false');

        this.amenitiesData.push({
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

    this.updateAmenityTextWidths();

    this._rectDirty = true;
    this._forceDomUpdate = true;
    this.updateDomPositions();

    if (this.app && !this.app.autoRender && 'renderNextFrame' in this.app) this.app.renderNextFrame = true;
};

AmenitiesMode.prototype.updateDomPositions = function () {
    const camera = this.cameraEntity && this.cameraEntity.camera;
    if (!camera) return;

    const rect = this.getCanvasRect();
    if (!rect) return;

    const rectLeft = rect.left;
    const rectTop = rect.top;
    const screenPos = this._screenPos;

    const dataList = this.amenitiesData;
    const threshold = isFinite(this.screenVisibilityThreshold) ? this.screenVisibilityThreshold : 0.25;
    const transformSuffix = this.transformSuffix || ' translate(-50%, -50%)';

    for (let i = 0; i < dataList.length; i++) {
        const data = dataList[i];
        if (!data) continue;

        camera.worldToScreen(data.worldPos, screenPos);

        const onScreen = screenPos.z > 0 && Number.isFinite(screenPos.x) && Number.isFinite(screenPos.y);
        const style = data.style || data.dom.style;

        if (!onScreen) {
            if (data.visible) {
                data.visible = false;
                style.display = 'none';
                data.lastX = NaN;
                data.lastY = NaN;
            }
            continue;
        }

        const x = rectLeft + screenPos.x;
        const y = rectTop + screenPos.y;

        if (!data.visible) {
            data.visible = true;
            style.display = 'block';
            data.lastX = NaN;
            data.lastY = NaN;
        }

        const dx = isNaN(data.lastX) ? Infinity : Math.abs(x - data.lastX);
        const dy = isNaN(data.lastY) ? Infinity : Math.abs(y - data.lastY);

        if (dx > threshold || dy > threshold) {
            style.transform = `translate3d(${x}px, ${y}px, 0)` + transformSuffix;
            data.lastX = x;
            data.lastY = y;
        }
    }

    this.updateInfoPanelPosition();
};

AmenitiesMode.prototype.clearAmenities = function () {
    const ui = this.getUi();

    if (ui && ui.clearContainer) ui.clearContainer(this.amenitiesContainer, this._emptyMessageEl);
    else if (this.amenitiesContainer) {
        if (this._emptyMessageEl && this._emptyMessageEl.parentNode === this.amenitiesContainer) {
            this.amenitiesContainer.replaceChildren(this._emptyMessageEl);
        } else {
            this.amenitiesContainer.textContent = '';
        }
    }

    this.setEmptyVisible(false);
    this.amenitiesData.length = 0;
    this._expandedAmenityEl = null;
    this._selectedAmenityData = null;
    this.infoPanel && this.infoPanel.style.removeProperty('--info-panel-x');
    this.infoPanel && this.infoPanel.style.removeProperty('--info-panel-y');
    this._selectedAmenityEl = null;
};

AmenitiesMode.prototype.onDestroy = function () {
    this.unbindDomEvents();
    this.clearAmenities();

    this._modeButtons = null;
    this._modeBtn0 = null;
    this._modeBtn1 = null;
    this._onModeKeyDown = null;
    this._onAmenityKeyDown = null;

    this.amenitiesContainer = null;
    this.infoPanel = null;
    this.infoPanelClose = null;
    this.panelImage = null;
    this.panelTitle = null;
    this.panelDescription = null;
    this._amenitiesCache = null;
    this._ui = null;
    this._emptyMessageEl = null;
    this._currentLang = null;
    this._shared = null;
    this._modeManager = null;
    if (this._textWidthRaf) cancelAnimationFrame(this._textWidthRaf);
    this._textWidthRaf = 0;
    this._selectedAmenityData = null;
    this._selectedAmenityEl = null;
};
