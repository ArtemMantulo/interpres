var AmenitiesMode = pc.createScript('amenitiesMode');
const MODE_HOME = '0';
const MODE_AMENITIES = '2';

AmenitiesMode.attributes.add('currentCsv', { type: 'asset' });
AmenitiesMode.attributes.add('fpsLockerState', { type: 'json' });
AmenitiesMode.attributes.add('domUpdateInterval', { type: 'number', default: 120 });
AmenitiesMode.attributes.add('csvMinColumns', { type: 'number', default: 7 });
AmenitiesMode.attributes.add('screenVisibilityThreshold', { type: 'number', default: 0.25 });
AmenitiesMode.attributes.add('transformSuffix', { type: 'string', default: ' translate(-50%, -50%)' });
AmenitiesMode.attributes.add('infoPanelOffset', { type: 'number', default: 36 });
AmenitiesMode.attributes.add('infoPanelViewportMargin', { type: 'number', default: 12 });
AmenitiesMode.attributes.add('portraitLookUpDegrees', { type: 'number', default: 10 });

AmenitiesMode.prototype.initialize = function () {
    this.cameraEntity = this.app.root.findByName('Camera');
    this.amenitiesContainer = document.querySelector('#amenities-container');

    this.infoPanel = document.querySelector('#info-panel');
    this.infoPanelNavWrap = document.querySelector('#info-panel-nav-wrap');
    this.infoPanelClose = this.infoPanel ? this.infoPanel.querySelector('.panel-close') : null;
    this.infoPanelPrev = document.querySelector('#info-panel-prev');
    this.infoPanelNext = document.querySelector('#info-panel-next');
    this.panelImage = this.infoPanel ? this.infoPanel.querySelector('.panel-image') : null;
    this.panelTitle = this.infoPanel ? this.infoPanel.querySelector('.panel-title') : null;
    this.panelDescription = this.infoPanel ? this.infoPanel.querySelector('.panel-description') : null;

    this._modeManager = window.AppModeManager || null;

    this.currentMode =
        (this._modeManager && this._modeManager.getMode && this._modeManager.getMode()) ||
        document.querySelector('.mode-panel .button.active')?.dataset?.mode ||
        MODE_HOME;

    const orbit = this.getOrbit();
    if (orbit && orbit.targetPosition) {
        const t = orbit.targetPosition;
        this._homeTarget = new pc.Vec3(t.x, t.y, t.z);
    } else {
        this._homeTarget = new pc.Vec3(0, 0, 0);
    }

    this.amenitiesData = [];
    this._screenPos = new pc.Vec3();
    this._focusTarget = new pc.Vec3();

    this._canvasRect = null;
    this._rectDirty = true;

    this._domUpdateTimer = 0;
    this._forceDomUpdate = false;
    this.domUpdateInterval = this.domUpdateInterval | 0 || 120;
    this._csvLoadToken = 0;
    this._amenitiesCache = new Map();
    this._ui = null;
    this._shared = window.AmenitiesShared || null;
    this._modeShared = window.AmenitiesModeShared || null;
    this._panelShared = window.AmenitiesPanelShared || null;
    this._domShared = window.AmenitiesDomShared || null;
    this._emptyMessageEl = null;
    this._currentLang = null;
    this._expandedAmenityEl = null;
    this._selectedAmenityEl = null;
    this._selectedAmenityData = null;
    this._infoPanelPortraitPlacement = null;
    this._textWidthRaf = 0;
    this._infoPanelSize = { width: 300, height: 200, dirty: true };
    this._infoPanelResizeObserver = null;

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
    this._onInfoPanelPrevClick = () => this.navigateSelectedAmenity(-1);
    this._onInfoPanelNextClick = () => this.navigateSelectedAmenity(1);
    this._onViewportDirty = () => {
        this._rectDirty = true;
        this.markInfoPanelSizeDirty();
        const orbit = this.getOrbit();
        if (orbit && orbit.setLookAtVerticalAngle) {
            const isPortrait = window.innerHeight > window.innerWidth;
            const lookUpDegrees = isFinite(this.portraitLookUpDegrees) ? this.portraitLookUpDegrees : 15;
            const shouldOffset = this.currentMode === MODE_AMENITIES && isPortrait;
            orbit.setLookAtVerticalAngle(shouldOffset ? lookUpDegrees : 0);
        }
        this.scheduleAmenityTextWidthUpdate();
        this._forceDomUpdate = true;
        this.updateInfoPanelNavState();
    };

    this.bindDomEvents();
    this.updateInfoPanelNavState();

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

    if (this.infoPanel && typeof ResizeObserver !== 'undefined') {
        this._infoPanelResizeObserver = new ResizeObserver(() => this.markInfoPanelSizeDirty());
        this._infoPanelResizeObserver.observe(this.infoPanel);
    }
};

AmenitiesMode.prototype.bindDomEvents = function () {
    this.amenitiesContainer && this.amenitiesContainer.addEventListener('click', this._onAmenityClick);
    this.amenitiesContainer && this.amenitiesContainer.addEventListener('keydown', this._onAmenityKeyDown);
    this.infoPanelClose && this.infoPanelClose.addEventListener('click', this._onInfoPanelCloseClick);
    this.infoPanelClose &&
        this.infoPanelClose.addEventListener('keydown', this._onInfoPanelCloseKeyDown);
    this.infoPanelPrev && this.infoPanelPrev.addEventListener('click', this._onInfoPanelPrevClick);
    this.infoPanelNext && this.infoPanelNext.addEventListener('click', this._onInfoPanelNextClick);

    window.addEventListener('resize', this._onViewportDirty, { passive: true });
    window.addEventListener('scroll', this._onViewportDirty, { passive: true });
    this.app.on('mode:change', this._onModeChange, this);
};

AmenitiesMode.prototype.unbindDomEvents = function () {
    this.amenitiesContainer && this.amenitiesContainer.removeEventListener('click', this._onAmenityClick);
    this.amenitiesContainer && this.amenitiesContainer.removeEventListener('keydown', this._onAmenityKeyDown);
    this.infoPanelClose &&
        this.infoPanelClose.removeEventListener('click', this._onInfoPanelCloseClick);
    this.infoPanelClose &&
        this.infoPanelClose.removeEventListener('keydown', this._onInfoPanelCloseKeyDown);
    this.infoPanelPrev && this.infoPanelPrev.removeEventListener('click', this._onInfoPanelPrevClick);
    this.infoPanelNext && this.infoPanelNext.removeEventListener('click', this._onInfoPanelNextClick);

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

AmenitiesMode.prototype.getModeShared = function () {
    if (!this._modeShared && window.AmenitiesModeShared) this._modeShared = window.AmenitiesModeShared;
    return this._modeShared;
};

AmenitiesMode.prototype.getPanelShared = function () {
    if (!this._panelShared && window.AmenitiesPanelShared) this._panelShared = window.AmenitiesPanelShared;
    return this._panelShared;
};

AmenitiesMode.prototype.getDomShared = function () {
    if (!this._domShared && window.AmenitiesDomShared) this._domShared = window.AmenitiesDomShared;
    return this._domShared;
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
    return lang || 'en';
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

AmenitiesMode.prototype.getAmenitiesData = function (asset) {
    const shared = this.getShared();
    if (!shared?.getAmenitiesData) return [];
    return shared.getAmenitiesData(this._amenitiesCache, asset, this.csvMinColumns);
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

AmenitiesMode.prototype.markInfoPanelSizeDirty = function () {
    if (!this._infoPanelSize) return;
    this._infoPanelSize.dirty = true;
};

AmenitiesMode.prototype.getInfoPanelSize = function () {
    const state = this._infoPanelSize || (this._infoPanelSize = { width: 300, height: 200, dirty: true });
    if (!this.infoPanel) return { width: state.width, height: state.height };
    if (!state.dirty && state.width > 0 && state.height > 0) {
        return { width: state.width, height: state.height };
    }
    const rect = this.infoPanel.getBoundingClientRect();
    if (rect && isFinite(rect.width) && rect.width > 0) state.width = rect.width;
    if (rect && isFinite(rect.height) && rect.height > 0) state.height = rect.height;
    state.dirty = false;
    return { width: state.width || 300, height: state.height || 200 };
};

AmenitiesMode.prototype.setMode = function (modeStr, options) {
    this.getModeShared()?.setMode?.(this, modeStr, options);
};

AmenitiesMode.prototype.applyInfoPanelContent = function (data) {
    this.getPanelShared()?.applyInfoPanelContent?.(this, data);
};

AmenitiesMode.prototype.openInfoPanel = function () {
    this.getPanelShared()?.openInfoPanel?.(this);
};

AmenitiesMode.prototype.closeInfoPanel = function () {
    this.getPanelShared()?.closeInfoPanel?.(this);
};

AmenitiesMode.prototype.onAmenityClick = function (e) {
    this.getPanelShared()?.onAmenityClick?.(this, e);
};

AmenitiesMode.prototype.setExpandedAmenity = function (item) {
    this.getPanelShared()?.setExpandedAmenity?.(this, item);
};

AmenitiesMode.prototype.onAmenityKeyDown = function (e) {
    this.getPanelShared()?.onAmenityKeyDown?.(this, e);
};

AmenitiesMode.prototype.getSelectedAmenityIndex = function () {
    return this.getPanelShared()?.getSelectedAmenityIndex?.(this) ?? -1;
};

AmenitiesMode.prototype.updateInfoPanelNavState = function () {
    this.getPanelShared()?.updateInfoPanelNavState?.(this);
};

AmenitiesMode.prototype.selectAmenityByIndex = function (index) {
    return this.getPanelShared()?.selectAmenityByIndex?.(this, index) || false;
};

AmenitiesMode.prototype.navigateSelectedAmenity = function (step) {
    this.getPanelShared()?.navigateSelectedAmenity?.(this, step);
};

AmenitiesMode.prototype.focusCameraOn = function (targetPosition) {
    this.getPanelShared()?.focusCameraOn?.(this, targetPosition);
};

AmenitiesMode.prototype.updateInfoPanelPosition = function () {
    this.getPanelShared()?.updateInfoPanelPosition?.(this);
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
    this.getDomShared()?.loadDataFromCsv?.(this);
};

AmenitiesMode.prototype.renderAmenities = function (dataList) {
    this.getDomShared()?.renderAmenities?.(this, dataList);
};

AmenitiesMode.prototype.updateDomPositions = function () {
    this.getDomShared()?.updateDomPositions?.(this);
};

AmenitiesMode.prototype.clearAmenities = function () {
    this.getDomShared()?.clearAmenities?.(this);
};

AmenitiesMode.prototype.onDestroy = function () {
    const orbit = this.getOrbit();
    orbit && orbit.setLookAtOffset && orbit.setLookAtOffset(0, 0, 0);
    orbit && orbit.setLookAtVerticalAngle && orbit.setLookAtVerticalAngle(0);

    this.unbindDomEvents();
    this.clearAmenities();
    if (this._infoPanelResizeObserver) this._infoPanelResizeObserver.disconnect();

    this._onAmenityKeyDown = null;

    this.amenitiesContainer = null;
    this.infoPanel = null;
    this.infoPanelNavWrap = null;
    this.infoPanelClose = null;
    this.infoPanelPrev = null;
    this.infoPanelNext = null;
    this.panelImage = null;
    this.panelTitle = null;
    this.panelDescription = null;
    this._amenitiesCache = null;
    this._ui = null;
    this._emptyMessageEl = null;
    this._currentLang = null;
    this._shared = null;
    this._modeShared = null;
    this._panelShared = null;
    this._domShared = null;
    this._modeManager = null;
    this._infoPanelResizeObserver = null;
    this._infoPanelSize = null;
    if (this._textWidthRaf) cancelAnimationFrame(this._textWidthRaf);
    this._textWidthRaf = 0;
    this._selectedAmenityData = null;
    this._selectedAmenityEl = null;
    this._infoPanelPortraitPlacement = null;
    this._focusTarget = null;
};
