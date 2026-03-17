var ApartmentsMode = pc.createScript('apartmentsMode');

const APARTMENTS_MODE_ID = '1';

ApartmentsMode.attributes.add('mainCsvUrl', {
    type: 'string',
    default: 'assets/data/dataApartments_en.csv'
});
ApartmentsMode.attributes.add('mainCsvMinColumns', { type: 'number', default: 6 });
ApartmentsMode.attributes.add('detailsCsvMinColumns', { type: 'number', default: 7 });
ApartmentsMode.attributes.add('screenVisibilityThreshold', { type: 'number', default: 0.25 });
ApartmentsMode.attributes.add('transformSuffix', { type: 'string', default: ' translate(-50%, -50%)' });
ApartmentsMode.attributes.add('panelViewportMargin', { type: 'number', default: 12 });
ApartmentsMode.attributes.add('panelPortraitXFactor', { type: 'number', default: 0.5 });
ApartmentsMode.attributes.add('panelPortraitYFactor', { type: 'number', default: 0.5 });
ApartmentsMode.attributes.add('swipeThreshold', { type: 'number', default: 24 });
ApartmentsMode.attributes.add('floorStepY', { type: 'number', default: 0.4 });
ApartmentsMode.attributes.add('cameraPitch', { type: 'number', default: 30 });
ApartmentsMode.attributes.add('cameraYaw', { type: 'number', default: -58 });
ApartmentsMode.attributes.add('desktopYawOffset', { type: 'number', default: 5 });
ApartmentsMode.attributes.add('cameraLandscapeDistance', { type: 'number', default: 5 });
ApartmentsMode.attributes.add('cameraPortraitDistance', { type: 'number', default: 5 });

ApartmentsMode.prototype.initialize = function () {
    this.cameraEntity = this.app.root.findByName('Camera');
    this._canvas = this.app?.graphicsDevice?.canvas || null;
    this.apartmentsContainer = document.querySelector('#apartments-container');

    this.infoPanel = document.querySelector('#apartments-info-panel');
    this.infoPanelClose = this.infoPanel ? this.infoPanel.querySelector('.apartment-panel-close') : null;
    this.panelTitle = document.querySelector('#apartments-panel-title');
    this.panelArea = document.querySelector('#apartments-panel-area');
    this.panelBedrooms = document.querySelector('#apartments-panel-bedrooms');
    this.panelAvailability = document.querySelector('#apartments-panel-availability');
    this.panelDescription = document.querySelector('#apartments-panel-description');
    this.panelImage = document.querySelector('#apartments-panel-image');
    this.panelVisit = document.querySelector('#apartments-panel-visit');
    this.floorPanel = document.querySelector('#floor-panel');
    this.floorPanelScroll = document.querySelector('#floor-panel-scroll');

    this._modeManager = window.AppModeManager || null;
    this._shared = window.ApartmentsShared || null;
    this._uiShared = window.ApartmentsUiShared || null;
    this._cameraShared = window.ApartmentsCameraShared || null;
    this._floorShared = window.ApartmentsFloorShared || null;
    this._panelShared = window.ApartmentsPanelShared || null;
    this._swipeShared = window.ApartmentsSwipeShared || null;
    this._unregisterMode = null;
    this._fallbackModeHandlerBound = false;

    this._active = this.getInitialMode() === APARTMENTS_MODE_ID;
    this._homeTarget = this.resolveHomeTarget();
    this._focusTarget = new pc.Vec3();
    this._screenPos = new pc.Vec3();
    this._canvasRect = null;
    this._rectDirty = true;

    this.apartmentsData = [];
    this._mainDataLoaded = false;
    this._mainDataLoading = false;
    this._detailsCache = new Map();
    this._selectionToken = 0;
    this._selectedApartment = null;
    this._selectedFloorIndex = -1;
    this._floorPanelNodes = [];

    this._forceDomUpdate = true;

    this._swipeTracking = false;
    this._swipePointerId = null;
    this._swipeCaptureElement = null;
    this._swipeStartY = 0;
    this._swipeLastY = 0;
    this._swipeInitialFloorIndex = -1;
    this._swipeTargetFloorIndex = -1;
    this._swipeDirection = 0;
    this._isFloorAnimating = false;
    this._floorAnimTimer = 0;
    this._floorPanelClone = null;
    this._panelSwapAnimTimer = 0;

    this._onContainerClick = this.onContainerClick.bind(this);
    this._onContainerKeyDown = this.onContainerKeyDown.bind(this);
    this._onPanelCloseClick = this.closeInfoPanel.bind(this);
    this._onPanelCloseKeyDown = (e) => {
        if (!window.UiKeys?.isActivateKey?.(e)) return;
        e.preventDefault();
        this.closeInfoPanel();
    };
    this._onPanelVisitClick = (e) => {
        e.preventDefault();
    };
    this._onFloorPanelClick = this.onFloorPanelClick.bind(this);
    this._onFloorPanelKeyDown = this.onFloorPanelKeyDown.bind(this);
    this._onPanelSwipePointerDown = this.onPanelSwipePointerDown.bind(this);
    this._onScreenSwipePointerDown = this.onScreenSwipePointerDown.bind(this);
    this._onPanelSwipePointerMove = this.onPanelSwipePointerMove.bind(this);
    this._onPanelSwipePointerUp = this.onPanelSwipePointerUp.bind(this);
    this._onViewportDirty = () => {
        this._rectDirty = true;
        this.markInfoPanelSizeDirty();
        this._forceDomUpdate = true;
        if (this._active && this._selectedApartment?.worldPos) this.configureCameraLock();
        this.syncFloorPanelWidth();
        this.updateInfoPanelPosition();
        this.updateFloorPanelPosition();
    };
    this._onModeChangeFallback = (mode) => {
        const next = String(mode ?? '0');
        if (next === APARTMENTS_MODE_ID) this.enterMode();
        else this.exitMode();
    };

    this.bindEvents();
    this.bindModeIntegration();

    if (this.infoPanel && typeof ResizeObserver !== 'undefined') {
        this._infoPanelResizeObserver = new ResizeObserver(() => this.markInfoPanelSizeDirty());
        this._infoPanelResizeObserver.observe(this.infoPanel);
    }

    if (this._active) this.enterMode();
    else this.hideAllApartmentUi();
};

ApartmentsMode.prototype.bindModeIntegration = function () {
    if (this._modeManager?.registerMode) {
        this._unregisterMode = this._modeManager.registerMode(APARTMENTS_MODE_ID, {
            enter: (ctx) => this.enterMode(ctx),
            exit: () => this.exitMode()
        });
        return;
    }

    this.app.on('mode:change', this._onModeChangeFallback, this);
    this._fallbackModeHandlerBound = true;
};

ApartmentsMode.prototype.bindEvents = function () {
    this.apartmentsContainer &&
        this.apartmentsContainer.addEventListener('click', this._onContainerClick);
    this.apartmentsContainer &&
        this.apartmentsContainer.addEventListener('keydown', this._onContainerKeyDown);

    this.infoPanelClose && this.infoPanelClose.addEventListener('click', this._onPanelCloseClick);
    this.infoPanelClose &&
        this.infoPanelClose.addEventListener('keydown', this._onPanelCloseKeyDown);
    this.panelVisit && this.panelVisit.addEventListener('click', this._onPanelVisitClick);
    this.floorPanelScroll && this.floorPanelScroll.addEventListener('click', this._onFloorPanelClick);
    this.floorPanelScroll &&
        this.floorPanelScroll.addEventListener('keydown', this._onFloorPanelKeyDown);

    if (this.infoPanel) {
        this.infoPanel.addEventListener('pointerdown', this._onPanelSwipePointerDown);
        this.infoPanel.addEventListener('lostpointercapture', this._onPanelSwipePointerUp);
    }
    this._canvas && this._canvas.addEventListener('pointerdown', this._onScreenSwipePointerDown);
    window.addEventListener('pointermove', this._onPanelSwipePointerMove, { passive: false });
    window.addEventListener('pointerup', this._onPanelSwipePointerUp);
    window.addEventListener('pointercancel', this._onPanelSwipePointerUp);

    window.addEventListener('resize', this._onViewportDirty, { passive: true });
    window.addEventListener('scroll', this._onViewportDirty, { passive: true });
};

ApartmentsMode.prototype.unbindEvents = function () {
    this.apartmentsContainer &&
        this.apartmentsContainer.removeEventListener('click', this._onContainerClick);
    this.apartmentsContainer &&
        this.apartmentsContainer.removeEventListener('keydown', this._onContainerKeyDown);

    this.infoPanelClose && this.infoPanelClose.removeEventListener('click', this._onPanelCloseClick);
    this.infoPanelClose &&
        this.infoPanelClose.removeEventListener('keydown', this._onPanelCloseKeyDown);
    this.panelVisit && this.panelVisit.removeEventListener('click', this._onPanelVisitClick);
    this.floorPanelScroll &&
        this.floorPanelScroll.removeEventListener('click', this._onFloorPanelClick);
    this.floorPanelScroll &&
        this.floorPanelScroll.removeEventListener('keydown', this._onFloorPanelKeyDown);

    if (this.infoPanel) {
        this.infoPanel.removeEventListener('pointerdown', this._onPanelSwipePointerDown);
        this.infoPanel.removeEventListener('lostpointercapture', this._onPanelSwipePointerUp);
    }
    this._canvas && this._canvas.removeEventListener('pointerdown', this._onScreenSwipePointerDown);
    window.removeEventListener('pointermove', this._onPanelSwipePointerMove);
    window.removeEventListener('pointerup', this._onPanelSwipePointerUp);
    window.removeEventListener('pointercancel', this._onPanelSwipePointerUp);

    window.removeEventListener('resize', this._onViewportDirty);
    window.removeEventListener('scroll', this._onViewportDirty);
};

ApartmentsMode.prototype.getInitialMode = function () {
    if (this._modeManager?.getMode) return this._modeManager.getMode();
    return document.querySelector('.mode-panel .button.active')?.dataset?.mode || '0';
};

ApartmentsMode.prototype.getShared = function () {
    if (!this._shared && window.ApartmentsShared) this._shared = window.ApartmentsShared;
    return this._shared;
};

ApartmentsMode.prototype.getUiShared = function () {
    if (!this._uiShared && window.ApartmentsUiShared) this._uiShared = window.ApartmentsUiShared;
    return this._uiShared;
};

ApartmentsMode.prototype.getCameraShared = function () {
    if (!this._cameraShared && window.ApartmentsCameraShared) {
        this._cameraShared = window.ApartmentsCameraShared;
    }
    return this._cameraShared;
};

ApartmentsMode.prototype.getSwipeShared = function () {
    if (!this._swipeShared && window.ApartmentsSwipeShared) {
        this._swipeShared = window.ApartmentsSwipeShared;
    }
    return this._swipeShared;
};

ApartmentsMode.prototype.getFloorShared = function () {
    if (!this._floorShared && window.ApartmentsFloorShared) {
        this._floorShared = window.ApartmentsFloorShared;
    }
    return this._floorShared;
};

ApartmentsMode.prototype.getPanelShared = function () {
    if (!this._panelShared && window.ApartmentsPanelShared) {
        this._panelShared = window.ApartmentsPanelShared;
    }
    return this._panelShared;
};

ApartmentsMode.prototype.getOrbit = function () {
    return window.PcScriptShared.getOrbit(this);
};

ApartmentsMode.prototype.resolveHomeTarget = function () {
    const orbit = this.getOrbit();
    if (orbit && orbit.targetPosition) {
        const t = orbit.targetPosition;
        return new pc.Vec3(t.x, t.y, t.z);
    }
    return new pc.Vec3(0, 0, 0);
};

ApartmentsMode.prototype.isPortrait = function () {
    return window.innerHeight > window.innerWidth;
};

ApartmentsMode.prototype.getCanvasRect = function () {
    return window.PcScriptShared.getCanvasRect(this);
};

ApartmentsMode.prototype.markInfoPanelSizeDirty = function () {
    window.PcScriptShared.markInfoPanelSizeDirty(this);
};

ApartmentsMode.prototype.getInfoPanelSize = function () {
    return window.PcScriptShared.getInfoPanelSize(this, 320, 220);
};


ApartmentsMode.prototype.hideAllApartmentUi = function () {
    for (let i = 0; i < this.apartmentsData.length; i++) {
        const item = this.apartmentsData[i];
        if (item?.style) item.style.display = 'none';
        if (item) {
            item.visible = false;
            item.lastX = NaN;
            item.lastY = NaN;
        }
    }
    if (this.infoPanel) this.infoPanel.classList.remove('visible');
    this.hideFloorPanel();
};

ApartmentsMode.prototype.enterMode = function (ctx) {
    this._active = true;
    const isRepeat = !!ctx?.meta?.repeat;
    if (isRepeat && this.infoPanel?.classList.contains('visible')) this.closeInfoPanel();
    this.releaseCameraLock();
    const orbit = this.getOrbit();
    if (orbit) {
        orbit.autoRotateMode = 1;
        orbit.setAutoRotateEnabled && orbit.setAutoRotateEnabled(false);
        orbit.autoRotateEnabled = false;
    }
    this.ensureMainDataLoaded();
    this._forceDomUpdate = true;
    this._rectDirty = true;
    this.syncFloorPanelWidth();
    this.updateFloorPanelVisibility();
    this.updateDomPositions();
};

ApartmentsMode.prototype.exitMode = function () {
    if (!this._active) return;
    this._active = false;
    this._selectionToken++;
    this.cancelFloorAnimation();
    this.releaseCameraLock();
    this.hideAllApartmentUi();
    this.clearFloorPanelItems();
    this.clearSelectionVisuals();
};

ApartmentsMode.prototype.configureCameraLock = function () {
    this.getCameraShared()?.configureCameraLock?.(this);
};

ApartmentsMode.prototype.getDesktopLookOffset = function (distance, yawDeg) {
    return this.getCameraShared()?.getDesktopLookOffset?.(this, distance, yawDeg) || { x: 0, z: 0 };
};

ApartmentsMode.prototype.releaseCameraLock = function () {
    this.getCameraShared()?.releaseCameraLock?.(this);
};

ApartmentsMode.prototype.ensureMainDataLoaded = function () {
    if (this._mainDataLoaded || this._mainDataLoading) return;
    this._mainDataLoading = true;

    this.fetchCsvText(this.mainCsvUrl)
        .then((text) => {
            if (!this.apartmentsContainer) return;
            const parsed = this.parseMainCsv(text);
            this.renderMarkers(parsed);
            this._mainDataLoaded = true;
            this._mainDataLoading = false;
        })
        .catch((err) => {
            console.warn('Apartments CSV load failed:', err);
            this._mainDataLoading = false;
            this._mainDataLoaded = true;
            if (this.apartmentsContainer) this.renderMarkers([]);
        });
};

ApartmentsMode.prototype.fetchCsvText = function (url) {
    return fetch(url, { cache: 'no-cache' }).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return res.text();
    });
};

ApartmentsMode.prototype.parseMainCsv = function (csvText) {
    const shared = this.getShared();
    const minCols = isFinite(this.mainCsvMinColumns) ? this.mainCsvMinColumns : 6;
    return shared?.parseMainCsv ? shared.parseMainCsv(csvText, minCols) : [];
};

ApartmentsMode.prototype.parseDetailsCsv = function (csvText) {
    const shared = this.getShared();
    const minCols = isFinite(this.detailsCsvMinColumns) ? this.detailsCsvMinColumns : 7;
    return shared?.parseDetailsCsv ? shared.parseDetailsCsv(csvText, minCols) : [];
};

ApartmentsMode.prototype.getDetailsRows = function (detailsCsvUrl) {
    const key = String(detailsCsvUrl || '').trim();
    if (!key) return Promise.resolve([]);
    const cached = this._detailsCache.get(key);
    if (cached) return Promise.resolve(cached);

    return this.fetchCsvText(key)
        .then((text) => this.parseDetailsCsv(text))
        .then((rows) => {
            this._detailsCache.set(key, rows);
            return rows;
        })
        .catch((err) => {
            console.warn('Apartments details CSV load failed:', err);
            this._detailsCache.set(key, []);
            return [];
        });
};

ApartmentsMode.prototype.renderMarkers = function (items) {
    if (!this.apartmentsContainer) return;
    const ui = this.getUiShared();
    this.apartmentsData = ui?.renderMarkers
        ? ui.renderMarkers(this.apartmentsContainer, items)
        : [];
    this._forceDomUpdate = true;
    this._rectDirty = true;
    this.clearSelectionVisuals();
    this.updateDomPositions();
};

ApartmentsMode.prototype.onContainerClick = function (e) {
    if (!this._active) return;
    const item = e.target && e.target.closest ? e.target.closest('.apartment-pin') : null;
    if (!item) return;
    const index = Number(item.dataset.index);
    if (!Number.isFinite(index)) return;
    this.selectApartment(index);
};

ApartmentsMode.prototype.onContainerKeyDown = function (e) {
    if (!this._active) return;
    if (!window.UiKeys?.isActivateKey?.(e)) return;
    const item = e.target && e.target.closest ? e.target.closest('.apartment-pin') : null;
    if (!item) return;
    e.preventDefault();
    this.onContainerClick({ target: item });
};

ApartmentsMode.prototype.syncFloorPanelWidth = function () {
    this.getFloorShared()?.syncFloorPanelWidth?.(this);
};

ApartmentsMode.prototype.updateFloorPanelWidth = function () {
    this.getFloorShared()?.updateFloorPanelWidth?.(this);
};

ApartmentsMode.prototype.getDesktopAnchorScreen = function () {
    return this.getFloorShared()?.getDesktopAnchorScreen?.(this) || null;
};

ApartmentsMode.prototype.computeDesktopFloorPanelPosition = function (anchorX, anchorY) {
    const shared = this.getFloorShared();
    return shared?.computeDesktopFloorPanelPosition
        ? shared.computeDesktopFloorPanelPosition(this, anchorX, anchorY)
        : { x: anchorX, y: anchorY };
};

ApartmentsMode.prototype.updateFloorPanelPosition = function () {
    this.getFloorShared()?.updateFloorPanelPosition?.(this);
};

ApartmentsMode.prototype.clearFloorPanelItems = function () {
    this.getFloorShared()?.clearFloorPanelItems?.(this);
};

ApartmentsMode.prototype.hideFloorPanel = function () {
    this.getFloorShared()?.hideFloorPanel?.(this);
};

ApartmentsMode.prototype.showFloorPanel = function () {
    this.getFloorShared()?.showFloorPanel?.(this);
};

ApartmentsMode.prototype.updateFloorPanelVisibility = function () {
    this.getFloorShared()?.updateFloorPanelVisibility?.(this);
};

ApartmentsMode.prototype.renderFloorPanel = function (rows) {
    this.getFloorShared()?.renderFloorPanel?.(this, rows);
};

ApartmentsMode.prototype.updateFloorPanelSelection = function (scrollIntoView) {
    this.getFloorShared()?.updateFloorPanelSelection?.(this, scrollIntoView);
};

ApartmentsMode.prototype.onFloorPanelClick = function (e) {
    this.getFloorShared()?.onFloorPanelClick?.(this, e);
};

ApartmentsMode.prototype.onFloorPanelKeyDown = function (e) {
    this.getFloorShared()?.onFloorPanelKeyDown?.(this, e);
};

ApartmentsMode.prototype.clearSelectionVisuals = function () {
    this.getPanelShared()?.clearSelectionVisuals?.(this);
};

ApartmentsMode.prototype.selectApartment = function (index) {
    this.getPanelShared()?.selectApartment?.(this, index);
};

ApartmentsMode.prototype.getCurrentFloorRows = function () {
    return this.getPanelShared()?.getCurrentFloorRows?.(this) || [];
};

ApartmentsMode.prototype.setFloorByIndex = function (index, options) {
    this.getPanelShared()?.setFloorByIndex?.(this, index, options);
};

ApartmentsMode.prototype.openInfoPanel = function () {
    this.getPanelShared()?.openInfoPanel?.(this);
};

ApartmentsMode.prototype.closeInfoPanel = function () {
    this.getPanelShared()?.closeInfoPanel?.(this);
};

ApartmentsMode.prototype.triggerInfoPanelSwapAnimation = function () {
    this.getPanelShared()?.triggerInfoPanelSwapAnimation?.(this);
};

ApartmentsMode.prototype.applyPanelContent = function (marker, floorRow) {
    this.getPanelShared()?.applyPanelContent?.(this, marker, floorRow);
};

ApartmentsMode.prototype.getMainPanelElements = function () {
    return this.getPanelShared()?.getMainPanelElements?.(this) || null;
};

ApartmentsMode.prototype.getPanelElementsFromContainer = function (container) {
    return this.getPanelShared()?.getPanelElementsFromContainer?.(this, container) || null;
};

ApartmentsMode.prototype.getFloorYOffset = function (floorIndex) {
    return this.getCameraShared()?.getFloorYOffset?.(this, floorIndex) || 0;
};

ApartmentsMode.prototype.focusCameraForFloor = function (floorIndex) {
    this.getCameraShared()?.focusCameraForFloor?.(this, floorIndex);
};

ApartmentsMode.prototype.onPanelSwipePointerDown = function (e) {
    this.getSwipeShared()?.onPanelSwipePointerDown?.(this, e);
};

ApartmentsMode.prototype.onScreenSwipePointerDown = function (e) {
    this.getSwipeShared()?.onScreenSwipePointerDown?.(this, e);
};

ApartmentsMode.prototype.beginSwipeTracking = function (e, captureEl) {
    this.getSwipeShared()?.beginSwipeTracking?.(this, e, captureEl);
};

ApartmentsMode.prototype.onPanelSwipePointerMove = function (e) {
    this.getSwipeShared()?.onPanelSwipePointerMove?.(this, e);
};

ApartmentsMode.prototype.onPanelSwipePointerUp = function (e) {
    this.getSwipeShared()?.onPanelSwipePointerUp?.(this, e);
};

ApartmentsMode.prototype.getFloorAnimDistance = function () {
    return this.getSwipeShared()?.getFloorAnimDistance?.(this) || 160;
};

ApartmentsMode.prototype.prepareSwipePreview = function (targetIndex, direction) {
    this.getSwipeShared()?.prepareSwipePreview?.(this, targetIndex, direction);
};

ApartmentsMode.prototype.updateSwipeVisual = function (dy, direction) {
    this.getSwipeShared()?.updateSwipeVisual?.(this, dy, direction);
};

ApartmentsMode.prototype.resetSwipeVisualState = function () {
    this.getSwipeShared()?.resetSwipeVisualState?.(this);
};

ApartmentsMode.prototype.finishSwipeTransition = function (commit) {
    this.getSwipeShared()?.finishSwipeTransition?.(this, commit);
};

ApartmentsMode.prototype.cancelFloorAnimation = function () {
    this.getSwipeShared()?.cancelFloorAnimation?.(this);
};

ApartmentsMode.prototype.updateInfoPanelPosition = function () {
    if (!this.infoPanel || !this.infoPanel.classList.contains('visible')) return;
    if (!this._selectedApartment?.worldPos) return;

    const margin = isFinite(this.panelViewportMargin) ? this.panelViewportMargin : 12;
    const panelSize = this.getInfoPanelSize();
    const panelWidth = panelSize.width || 320;
    const panelHeight = panelSize.height || 220;
    const halfW = panelWidth * 0.5;
    const halfH = panelHeight * 0.5;

    const minX = margin + halfW;
    const maxX = window.innerWidth - margin - halfW;
    const minY = margin + halfH;
    const maxY = window.innerHeight - margin - halfH;

    let x;
    let y;

    if (this.isPortrait()) {
        const px = isFinite(this.panelPortraitXFactor) ? this.panelPortraitXFactor : 0.5;
        const py = isFinite(this.panelPortraitYFactor) ? this.panelPortraitYFactor : 0.5;
        x = window.innerWidth * px;
        y = window.innerHeight * py;
    } else {
        const anchor = this.getDesktopAnchorScreen();
        if (!anchor) return;
        const floorPos = this.computeDesktopFloorPanelPosition(anchor.x, anchor.y);
        const gap = 40;
        x = floorPos.x + gap + halfW;
        y = floorPos.y;
    }

    x = Math.min(maxX, Math.max(minX, x));
    y = Math.min(maxY, Math.max(minY, y));

    this.infoPanel.style.setProperty('--apartments-panel-x', `${x}px`);
    this.infoPanel.style.setProperty('--apartments-panel-y', `${y}px`);
    this.updateFloorPanelPosition();
};

ApartmentsMode.prototype.updateDomPositions = function () {
    if (!this.apartmentsData.length) return;
    const panelOpen = !!(this.infoPanel?.classList.contains('visible') && this._selectedApartment);
    window.PcScriptShared.updateDomPositions(this, this.apartmentsData, {
        activeCheck: true,
        hideSelected: panelOpen ? (item) => item === this._selectedApartment : null
    });
};

ApartmentsMode.prototype.postUpdate = function (dt) {
    if (!this._active) return;
    if (document.hidden) return;

    const orbit = this.getOrbit();
    const moved = orbit && orbit.movedThisFrame;
    const interacting = orbit && orbit.isUserInteracting && orbit.isUserInteracting();

    if (!this._forceDomUpdate && !moved && !interacting) return;
    this._forceDomUpdate = false;

    this.updateDomPositions();
};

ApartmentsMode.prototype.onDestroy = function () {
    this.exitMode();
    this.cancelFloorAnimation();
    if (this._panelSwapAnimTimer) {
        clearTimeout(this._panelSwapAnimTimer);
        this._panelSwapAnimTimer = 0;
    }

    if (this._unregisterMode) this._unregisterMode();
    if (this._fallbackModeHandlerBound) this.app.off('mode:change', this._onModeChangeFallback, this);

    this.unbindEvents();
    this.hideAllApartmentUi();
    if (this._infoPanelResizeObserver) this._infoPanelResizeObserver.disconnect();

    this.cameraEntity = null;
    this.apartmentsContainer = null;
    this.infoPanel = null;
    this.infoPanelClose = null;
    this.panelTitle = null;
    this.panelArea = null;
    this.panelBedrooms = null;
    this.panelAvailability = null;
    this.panelDescription = null;
    this.panelImage = null;
    this.panelVisit = null;
    this.floorPanel = null;
    this.floorPanelScroll = null;

    this._modeManager = null;
    this._shared = null;
    this._uiShared = null;
    this._cameraShared = null;
    this._floorShared = null;
    this._panelShared = null;
    this._swipeShared = null;
    this._unregisterMode = null;
    this._detailsCache = null;
    this._floorPanelNodes = null;
    this.apartmentsData = null;
    this._selectedApartment = null;
    this._focusTarget = null;
    this._screenPos = null;
    this._homeTarget = null;
    this._onContainerClick = null;
    this._onContainerKeyDown = null;
    this._onPanelCloseClick = null;
    this._onPanelCloseKeyDown = null;
    this._onPanelVisitClick = null;
    this._onFloorPanelClick = null;
    this._onFloorPanelKeyDown = null;
    this._onPanelSwipePointerDown = null;
    this._onScreenSwipePointerDown = null;
    this._onPanelSwipePointerMove = null;
    this._onPanelSwipePointerUp = null;
    this._panelSwapAnimTimer = 0;
    this._infoPanelResizeObserver = null;
    this._infoPanelSize = null;
    this.cancelFloorAnimation = null;
    this._onModeChangeFallback = null;
};