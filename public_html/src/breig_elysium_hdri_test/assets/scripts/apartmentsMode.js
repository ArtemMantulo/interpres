var ApartmentsMode = pc.createScript('apartmentsMode');

const APARTMENTS_MODE_ID = window.AppModeIds?.APARTMENTS ?? '1';

ApartmentsMode.attributes.add('dataUrl', {
    type: 'string',
    default: 'assets/data/apartments/dataApartments_1.json'
});
ApartmentsMode.attributes.add('screenVisibilityThreshold', { type: 'number', default: 0.25 });
ApartmentsMode.attributes.add('transformSuffix', { type: 'string', default: ' translate(-50%, -50%)' });
ApartmentsMode.attributes.add('panelViewportMargin', { type: 'number', default: 12 });
ApartmentsMode.attributes.add('swipeThreshold', { type: 'number', default: 24 });
ApartmentsMode.attributes.add('cameraPitch', { type: 'number', default: 30 });
ApartmentsMode.attributes.add('cameraYaw', { type: 'number', default: -58 });
ApartmentsMode.attributes.add('desktopYawOffset', { type: 'number', default: 0 });
ApartmentsMode.attributes.add('cameraHorizontalRotateLimit', { type: 'number', default: 20 });
ApartmentsMode.attributes.add('cameraLandscapeDistance', { type: 'number', default: 5 });
ApartmentsMode.attributes.add('cameraPortraitDistance', { type: 'number', default: 5 });
ApartmentsMode.attributes.add('mobileFloorCenterOffset', { type: 'number', default: 50 });
ApartmentsMode.attributes.add('mobileFloorLeftOffset', { type: 'number', default: 10 });
ApartmentsMode.attributes.add('floorPositionLerp', { type: 'number', default: 0.14 });
ApartmentsMode.attributes.add('floorHeightTransitionDurationMs', { type: 'number', default: 700 });
ApartmentsMode.attributes.add('landscapeFloorHeightScale', { type: 'number', default: 0.9 });
ApartmentsMode.attributes.add('landscapeFloorHeightScaleLeft', { type: 'number', default: 0.9 });
ApartmentsMode.attributes.add('landscapeFloorHeightScaleRight', { type: 'number', default: 1.15 });

ApartmentsMode.prototype.initialize = function () {
    this.cameraEntity = this.app.root.findByName('Camera');
    this._canvas = this.app?.graphicsDevice?.canvas || null;
    this.apartmentsContainer = document.querySelector('#apartments-container');

    this.infoPanel = document.querySelector('#apartments-info-panel');
    this.infoPanelClose = this.infoPanel ? this.infoPanel.querySelector('.apartment-panel-close') : null;
    this.infoPanelPrev = document.querySelector('#apartments-info-panel-prev');
    this.infoPanelNext = document.querySelector('#apartments-info-panel-next');
    this.panelTitle = document.querySelector('#apartments-panel-title');
    this.panelArea = document.querySelector('#apartments-panel-area');
    this.panelBedrooms = document.querySelector('#apartments-panel-bedrooms');
    this.panelAvailability = document.querySelector('#apartments-panel-availability');
    this.panelDescription = document.querySelector('#apartments-panel-description');
    this.panelImage = document.querySelector('#apartments-panel-image');
    this.panelVisit = document.querySelector('#apartments-panel-plan');
    this.floorPanel = document.querySelector('#floor-panel');
    this.floorPanelScroll = document.querySelector('#floor-panel-scroll');
    this.mobilePanelEl = document.querySelector('#apartments-info-panel-mobile');
    this.mobilePanelScroll = document.querySelector('#apartments-info-panel-mobile-scroll');
    this.planPanel = document.querySelector('#apartments-plan-panel');
    this.planCloseDesktop = document.querySelector('#apartments-expanded-close');
    this.planCloseMobile = null;
    this.planPrevDesktop = document.querySelector('#apartments-expanded-prev');
    this.planNextDesktop = document.querySelector('#apartments-expanded-next');
    this.planPrevMobile = null;
    this.planNextMobile = null;
    this.planVisitMobile = null;
    this.planTitle = document.querySelector('#apartments-expanded-title');
    this.planArea = document.querySelector('#apartments-expanded-area');
    this.planBedrooms = document.querySelector('#apartments-expanded-bedrooms');
    this.planAvailability = document.querySelector('#apartments-expanded-availability');
    this.planDescription = document.querySelector('#apartments-expanded-description');
    this.planImage = document.querySelector('#apartments-expanded-main-image');
    this.planMobileThumb = null;
    this.planMobileTitle = null;
    this.planMobileArea = null;
    this.planMobileBedrooms = null;
    this.planMobileAvailability = null;
    this.planMobileImage = null;
    this.expandedTabs = Array.from(document.querySelectorAll('.apartments-expanded-tab'));
    this.expandedViewAll = document.querySelector('#apartments-expanded-view-all');
    this.expandedGalleryLabel = document.querySelector('#apartments-expanded-gallery-label');
    this.expandedThumbs = document.querySelector('#apartments-expanded-thumbs');
    this.expandedMobileSlider = document.querySelector('#apartments-expanded-mobile-slider');
    this._expandedGalleryType = 'street';
    this._expandedGalleryImages = [];
    this._expandedGalleryIndex = 0;

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
    this._tempVec = new pc.Vec3();
    this._canvasRect = null;
    this._rectDirty = true;
    this._lastIsPortrait = this.isPortrait();

    this.apartmentsData = [];
    this._mainDataLoaded = false;
    this._mainDataLoading = false;
    this._selectionToken = 0;
    this._selectedApartment = null;
    this._selectedFloorIndex = -1;
    this._selectedApartmentIndex = 0;
    this._floorPanelNodes = [];
    this._floorItemsData = [];

    this._forceDomUpdate = true;
    this._floorHeightTransition = null;

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
    this._planPanelCloseTimer = 0;
    this._infoPanelRepositionTimer = 0;
    this._infoPanelPlacementTimer = 0;
    this._planNavPressTimers = new Map();

    this._onContainerClick = this.onContainerClick.bind(this);
    this._onContainerKeyDown = this.onContainerKeyDown.bind(this);
    this._onPanelCloseClick = this.closeInfoPanel.bind(this);
    this._onPanelCloseKeyDown = (e) => {
        if (!window.UiKeys?.isActivateKey?.(e)) return;
        e.preventDefault();
        this.closeInfoPanel();
    };
    this._onInfoPanelPrevClick = () => this.navigateSelectedApartment(-1);
    this._onInfoPanelNextClick = () => this.navigateSelectedApartment(1);
    this._onPanelVisitClick = (e) => {
        e.preventDefault();
        this.openPlanPanel();
    };
    this._onPlanCloseClick = (e) => {
        e.preventDefault();
        this.closePlanPanel();
    };
    this._onPlanPrevClick = (e) => {
        e.preventDefault();
        this.clearPlanNavPressedState?.(e.currentTarget);
        if (window.AppDetect?.isTouchDevice?.()) {
            e.currentTarget?.blur?.();
        }
        this.navigatePlanSelection(-1);
    };
    this._onPlanNextClick = (e) => {
        e.preventDefault();
        this.clearPlanNavPressedState?.(e.currentTarget);
        if (window.AppDetect?.isTouchDevice?.()) {
            e.currentTarget?.blur?.();
        }
        this.navigatePlanSelection(1);
    };
    this._onPlanNavPointerDown = (e) => {
        if (!window.AppDetect?.isTouchDevice?.()) return;
        const btn = e.currentTarget;
        if (!btn) return;
        this.clearPlanNavPressedTimer(btn);
        btn.classList.add('is-pressed');
    };
    this._onPlanNavPointerUp = (e) => {
        if (!window.AppDetect?.isTouchDevice?.()) return;
        const btn = e.currentTarget;
        if (!btn) return;
        this.clearPlanNavPressedTimer(btn);
        const timer = setTimeout(() => {
            btn.classList.remove('is-pressed');
            this._planNavPressTimers.delete(btn);
        }, 80);
        this._planNavPressTimers.set(btn, timer);
    };
    this._onPlanVisitClick = (e) => {
        e.preventDefault();
    };
    this._onExpandedTabClick = (e) => {
        const btn = e.target?.closest ? e.target.closest('.apartments-expanded-tab') : null;
        if (!btn) return;
        const nextType = String(btn.dataset.galleryType || '').toLowerCase();
        if (!nextType) return;
        this._expandedGalleryType = nextType;
        this._expandedGalleryIndex = 0;
        this.updatePlanPanelContent();
    };
    this._onExpandedViewAllClick = (e) => {
        e.preventDefault();
    };
    this._onExpandedThumbClick = (e) => {
        const btn = e.target?.closest ? e.target.closest('[data-gallery-index]') : null;
        if (!btn) return;
        const nextIndex = Number(btn.dataset.galleryIndex);
        if (!Number.isFinite(nextIndex)) return;
        this._expandedGalleryIndex = Math.max(0, Math.min(this._expandedGalleryImages.length - 1, nextIndex));
        this.updateExpandedGalleryVisuals();
    };
    this._onExpandedThumbsWheel = (e) => {
        const thumbs = this.expandedThumbs;
        if (!thumbs) return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        const nowTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        window.__apartmentsThumbsWheelBlockUntil = nowTs + 160;
        if (thumbs.scrollWidth <= thumbs.clientWidth) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!Number.isFinite(delta) || Math.abs(delta) < 0.01) return;
        thumbs.scrollBy({ left: delta, behavior: 'smooth' });
    };
    this._onFloorPanelClick = this.onFloorPanelClick.bind(this);
    this._onFloorPanelKeyDown = this.onFloorPanelKeyDown.bind(this);
    this._onPanelSwipePointerDown = this.onPanelSwipePointerDown.bind(this);
    this._onScreenSwipePointerDown = this.onScreenSwipePointerDown.bind(this);
    this._onPanelSwipePointerMove = this.onPanelSwipePointerMove.bind(this);
    this._onPanelSwipePointerUp = this.onPanelSwipePointerUp.bind(this);
    this._onViewportDirty = () => {
        const nowPortrait = this.isPortrait();
        const orientationChanged = nowPortrait !== this._lastIsPortrait;
        if (orientationChanged) {
            this._lastIsPortrait = nowPortrait;
            this.cancelFloorAnimation();
            if (this._panelSwapAnimTimer) {
                clearTimeout(this._panelSwapAnimTimer);
                this._panelSwapAnimTimer = 0;
            }
            if (this._planPanelCloseTimer) {
                clearTimeout(this._planPanelCloseTimer);
                this._planPanelCloseTimer = 0;
            }
            if (this.infoPanel) {
                this.infoPanel.classList.remove('is-floor-animating');
                this.infoPanel.classList.remove('is-content-swapping');
                this.infoPanel.style.removeProperty('--apartments-panel-drag-y');
                this.infoPanel.style.removeProperty('--apartments-panel-opacity');
                this.infoPanel.style.removeProperty('--apartments-panel-scale');
            }
        }

        this._rectDirty = true;
        this.markInfoPanelSizeDirty();
        this._forceDomUpdate = true;
        if (this._active && this._selectedApartment?.worldPos) this.configureCameraLock();
        if (orientationChanged && this._active) this.syncInfoPanelsForViewport();
        this.syncFloorPanelWidth();
        this.updateInfoPanelPosition();
        this.updateFloorPanelPosition();
        this.updateInfoPanelNavState();
        this.updatePlanPanelLandscapeHeight();
        if (this._active && this.infoPanel?.classList.contains('visible')) {
            this.scheduleInfoPanelReposition();
        }
    };
    this._onModeChangeFallback = (mode) => {
        const next = String(mode ?? (window.AppModeIds?.HOME ?? '0'));
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
    this.infoPanelPrev && this.infoPanelPrev.addEventListener('click', this._onInfoPanelPrevClick);
    this.infoPanelNext && this.infoPanelNext.addEventListener('click', this._onInfoPanelNextClick);
    this.panelVisit && this.panelVisit.addEventListener('click', this._onPanelVisitClick);
    this.planCloseDesktop && this.planCloseDesktop.addEventListener('click', this._onPlanCloseClick);
    this.planPrevDesktop && this.planPrevDesktop.addEventListener('click', this._onPlanPrevClick);
    this.planNextDesktop && this.planNextDesktop.addEventListener('click', this._onPlanNextClick);
    this.planPrevDesktop &&
        this.planPrevDesktop.addEventListener('pointerdown', this._onPlanNavPointerDown);
    this.planNextDesktop &&
        this.planNextDesktop.addEventListener('pointerdown', this._onPlanNavPointerDown);
    this.planPrevDesktop &&
        this.planPrevDesktop.addEventListener('pointerup', this._onPlanNavPointerUp);
    this.planNextDesktop &&
        this.planNextDesktop.addEventListener('pointerup', this._onPlanNavPointerUp);
    this.planPrevDesktop &&
        this.planPrevDesktop.addEventListener('pointercancel', this._onPlanNavPointerUp);
    this.planNextDesktop &&
        this.planNextDesktop.addEventListener('pointercancel', this._onPlanNavPointerUp);
    this.planPrevDesktop &&
        this.planPrevDesktop.addEventListener('lostpointercapture', this._onPlanNavPointerUp);
    this.planNextDesktop &&
        this.planNextDesktop.addEventListener('lostpointercapture', this._onPlanNavPointerUp);
    this.expandedViewAll && this.expandedViewAll.addEventListener('click', this._onExpandedViewAllClick);
    this.expandedThumbs && this.expandedThumbs.addEventListener('click', this._onExpandedThumbClick);
    this.expandedThumbs &&
        this.expandedThumbs.addEventListener('wheel', this._onExpandedThumbsWheel, {
            passive: false
        });
    if (this.expandedTabs?.length) {
        for (let i = 0; i < this.expandedTabs.length; i++) {
            this.expandedTabs[i].addEventListener('click', this._onExpandedTabClick);
        }
    }
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
    this.infoPanelPrev && this.infoPanelPrev.removeEventListener('click', this._onInfoPanelPrevClick);
    this.infoPanelNext && this.infoPanelNext.removeEventListener('click', this._onInfoPanelNextClick);
    this.panelVisit && this.panelVisit.removeEventListener('click', this._onPanelVisitClick);
    this.planCloseDesktop && this.planCloseDesktop.removeEventListener('click', this._onPlanCloseClick);
    this.planPrevDesktop && this.planPrevDesktop.removeEventListener('click', this._onPlanPrevClick);
    this.planNextDesktop && this.planNextDesktop.removeEventListener('click', this._onPlanNextClick);
    this.planPrevDesktop &&
        this.planPrevDesktop.removeEventListener('pointerdown', this._onPlanNavPointerDown);
    this.planNextDesktop &&
        this.planNextDesktop.removeEventListener('pointerdown', this._onPlanNavPointerDown);
    this.planPrevDesktop &&
        this.planPrevDesktop.removeEventListener('pointerup', this._onPlanNavPointerUp);
    this.planNextDesktop &&
        this.planNextDesktop.removeEventListener('pointerup', this._onPlanNavPointerUp);
    this.planPrevDesktop &&
        this.planPrevDesktop.removeEventListener('pointercancel', this._onPlanNavPointerUp);
    this.planNextDesktop &&
        this.planNextDesktop.removeEventListener('pointercancel', this._onPlanNavPointerUp);
    this.planPrevDesktop &&
        this.planPrevDesktop.removeEventListener('lostpointercapture', this._onPlanNavPointerUp);
    this.planNextDesktop &&
        this.planNextDesktop.removeEventListener('lostpointercapture', this._onPlanNavPointerUp);
    this.expandedViewAll && this.expandedViewAll.removeEventListener('click', this._onExpandedViewAllClick);
    this.expandedThumbs && this.expandedThumbs.removeEventListener('click', this._onExpandedThumbClick);
    this.expandedThumbs &&
        this.expandedThumbs.removeEventListener('wheel', this._onExpandedThumbsWheel);
    if (this.expandedTabs?.length) {
        for (let i = 0; i < this.expandedTabs.length; i++) {
            this.expandedTabs[i].removeEventListener('click', this._onExpandedTabClick);
        }
    }
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

    this.clearPlanNavPressedState(this.planPrevDesktop);
    this.clearPlanNavPressedState(this.planNextDesktop);
};

ApartmentsMode.prototype.getInitialMode = function () {
    if (this._modeManager?.getMode) return this._modeManager.getMode();
    return document.querySelector('.mode-panel .button.active')?.dataset?.mode || (window.AppModeIds?.HOME ?? '0');
};

ApartmentsMode.prototype.clearPlanNavPressedTimer = function (btn) {
    if (!btn || !this._planNavPressTimers) return;
    const timer = this._planNavPressTimers.get(btn);
    if (timer) clearTimeout(timer);
    this._planNavPressTimers.delete(btn);
};

ApartmentsMode.prototype.clearPlanNavPressedState = function (btn) {
    if (!btn) return;
    this.clearPlanNavPressedTimer(btn);
    btn.classList.remove('is-pressed');
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
    return this.isMobileUiLayout();
};

ApartmentsMode.prototype.isMobileUiLayout = function () {
    return window.AppDetect?.isPortraitMobile?.() ?? false;
};


ApartmentsMode.prototype.getLandscapeUiScale = function () {
    return 1;
};

ApartmentsMode.prototype.getDomTransformSuffix = function () {
    const base = this.transformSuffix || ' translate(-50%, -50%)';
    const scale = this.getLandscapeUiScale();
    if (scale >= 0.999) return base;
    return `${base} scale(${scale})`;
};

ApartmentsMode.prototype.beginInfoPanelPlacement = function () {
    if (!this.infoPanel) return;
    if (this._infoPanelPlacementTimer) {
        clearTimeout(this._infoPanelPlacementTimer);
        this._infoPanelPlacementTimer = 0;
    }
    this.infoPanel.classList.add('is-placing');
};

ApartmentsMode.prototype.endInfoPanelPlacement = function () {
    if (!this.infoPanel) return;
    this.infoPanel.classList.remove('is-placing');
    if (this._infoPanelPlacementTimer) {
        clearTimeout(this._infoPanelPlacementTimer);
        this._infoPanelPlacementTimer = 0;
    }
};

ApartmentsMode.prototype.isInfoPanelOpen = function () {
    if (this.isMobileUiLayout()) {
        return !!(this.mobilePanelEl?.classList.contains('visible') && this._selectedApartment);
    }
    return !!(this.infoPanel?.classList.contains('visible') && this._selectedApartment);
};

ApartmentsMode.prototype.syncInfoPanelsForViewport = function () {
    if (!this._active) return;

    const hasSelection = !!this._selectedApartment;
    const planOpen = this.isPlanPanelOpen();
    const mobileLayout = this.isMobileUiLayout();

    if (!hasSelection || planOpen) {
        if (this.infoPanel) {
            this.infoPanel.classList.remove('visible');
            this.infoPanel.classList.remove('is-content-swapping');
        }
        this.endInfoPanelPlacement();
        if (this.mobilePanelEl) {
            this.mobilePanelEl.classList.remove('visible');
            this.mobilePanelEl.setAttribute('aria-hidden', 'true');
        }
        this.updateFloorPanelVisibility();
        this.updateInfoPanelNavState();
        return;
    }

    const rows = this._selectedApartment.detailsRows || [];
    if (rows.length) this.renderFloorPanel(rows);

    const row = this.getSelectedFloorRow();
    this.applyPanelContent(this._selectedApartment, row);

    if (mobileLayout) {
        if (this.infoPanel) {
            this.infoPanel.classList.remove('visible');
            this.infoPanel.classList.remove('is-content-swapping');
        }
        this.endInfoPanelPlacement();
        if (this.mobilePanelEl) {
            this.mobilePanelEl.classList.add('visible');
            this.mobilePanelEl.setAttribute('aria-hidden', 'false');
        }
    } else {
        if (this.mobilePanelEl) {
            this.mobilePanelEl.classList.remove('visible');
            this.mobilePanelEl.setAttribute('aria-hidden', 'true');
        }
        if (this.infoPanel) {
            this.beginInfoPanelPlacement();
            this.infoPanel.classList.add('visible');
            this.scheduleInfoPanelReposition();
        }
    }

    this.updateFloorPanelVisibility();
    this.updateInfoPanelNavState();
    this._forceDomUpdate = true;
};

ApartmentsMode.prototype.isPlanPanelOpen = function () {
    return !!this.planPanel?.classList.contains('visible');
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

ApartmentsMode.prototype.updatePlanPanelLandscapeHeight = function () {
    if (!this.planPanel) return;
    this.planPanel.style.removeProperty('height');
    this.planPanel.style.removeProperty('min-height');
    this.planPanel.style.removeProperty('max-height');
};

ApartmentsMode.prototype.clearFloorHeightTransition = function () {
    this._floorHeightTransition = null;
};

ApartmentsMode.prototype._getFloorHeightsSnapshot = function (apartmentIndex, options) {
    const marker = this._selectedApartment;
    const rows = this.getCurrentFloorRows?.() || [];
    if (!marker?.worldPos || !rows.length) return null;

    const selectedIndex = Math.max(0, Math.min(rows.length - 1, this._selectedFloorIndex | 0));
    const selectedRow = rows[selectedIndex] || null;
    const aptIndexRaw = Number.isFinite(apartmentIndex) ? apartmentIndex : this._selectedApartmentIndex;
    const aptIndex = Math.max(0, aptIndexRaw | 0);

    const getApartmentForRow = (row, rowApartmentIndex) => {
        const apartments = Array.isArray(row?.apartments) ? row.apartments : null;
        if (!apartments || !apartments.length) return null;
        const idx = Math.max(0, Math.min(apartments.length - 1, rowApartmentIndex | 0));
        return apartments[idx] || apartments[0] || null;
    };
    const pickFinite = (values, fallback) => {
        for (let i = 0; i < values.length; i++) {
            const v = Number(values[i]);
            if (isFinite(v)) return v;
        }
        return fallback;
    };
    const normalizeAngle = (deg) => ((((deg % 360) + 540) % 360) - 180);
    const interpolatePair = (pair, t) => {
        if (Array.isArray(pair) && pair.length >= 2) {
            const left = Number(pair[0]);
            const right = Number(pair[1]);
            if (isFinite(left) && isFinite(right)) return left + (right - left) * t;
        }
        return NaN;
    };

    const selectedApt = getApartmentForRow(selectedRow, aptIndex);
    const yawRange = Math.max(0.001, Math.abs(Number(this.cameraHorizontalRotateLimit || 20)));
    const baseYaw = pickFinite(
        [
            selectedApt?.camera?.yaw,
            selectedRow?.camera?.yaw,
            marker?.camera?.yaw,
            this.cameraYaw
        ],
        0
    );
    const orbit = this.getOrbit?.();
    const forcedYaw = Number(options?.currentYaw);
    const currentYaw = isFinite(forcedYaw)
        ? forcedYaw
        : pickFinite([orbit?.eulers?.y, orbit?.eulersTarget?.y], baseYaw);
    const yawDelta = normalizeAngle(currentYaw - baseYaw);
    const yawT = Math.max(0, Math.min(1, (yawDelta + yawRange) / (yawRange * 2)));

    const selectedFloorPairs = selectedApt?.floorHeightsByYaw;
    const resolveFloorHeight = (row, rowIndex) => {
        const apt = getApartmentForRow(row, aptIndex);

        if (Array.isArray(selectedFloorPairs) && rowIndex >= 0 && rowIndex < selectedFloorPairs.length) {
            const h = interpolatePair(selectedFloorPairs[rowIndex], yawT);
            if (isFinite(h)) return h;
        }
        if (Array.isArray(apt?.floorHeightsByYaw) && rowIndex >= 0 && rowIndex < apt.floorHeightsByYaw.length) {
            const h = interpolatePair(apt.floorHeightsByYaw[rowIndex], yawT);
            if (isFinite(h)) return h;
        }

        const rowPair = interpolatePair(apt?.floorHeightByYaw, yawT);
        if (isFinite(rowPair)) return rowPair;

        return isFinite(row?.height) ? row.height : marker.worldPos.y;
    };

    const rowHeights = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
        rowHeights[i] = resolveFloorHeight(rows[i], i);
    }
    const selectedHeight = isFinite(rowHeights[selectedIndex])
        ? rowHeights[selectedIndex]
        : resolveFloorHeight(selectedRow, selectedIndex);

    return { selectedHeight, rowHeights };
};

ApartmentsMode.prototype.beginFloorHeightTransition = function (_fromApartmentIndex, toApartmentIndex) {
    if (this.isMobileUiLayout()) {
        this.clearFloorHeightTransition();
        return;
    }

    // Capture 'to' at the destination apartment's own camera yaw so the end state
    // matches where the camera will settle, avoiding a wave after the transition.
    const rows = this.getCurrentFloorRows?.() || [];
    const selFloorIdx = Math.max(0, Math.min(rows.length - 1, this._selectedFloorIndex | 0));
    const selRow = rows[selFloorIdx] || null;
    const toAptIdx = Math.max(0, toApartmentIndex | 0);
    const toApt = Array.isArray(selRow?.apartments) ? (selRow.apartments[toAptIdx] || null) : null;
    const marker = this._selectedApartment;
    const destYaw = isFinite(toApt?.camera?.yaw) ? toApt.camera.yaw
        : isFinite(selRow?.camera?.yaw) ? selRow.camera.yaw
        : isFinite(marker?.camera?.yaw) ? marker.camera.yaw
        : isFinite(this.cameraYaw) ? this.cameraYaw
        : null;
    const toSnap = this._getFloorHeightsSnapshot(toAptIdx,
        destYaw !== null ? { currentYaw: destYaw } : undefined
    );
    if (!toSnap) {
        this.clearFloorHeightTransition();
        return;
    }

    const durationRaw = Number(this.floorHeightTransitionDurationMs);
    const duration = Math.max(120, isFinite(durationRaw) ? durationRaw : 700);
    // fromOffsets is null; it will be initialized lazily on the first render frame
    // using the actual item.lastY values and the then-current pixelsPerUnit.
    // This avoids any jump caused by focusCameraForFloor changing the camera orbit
    // target between this call and the first rendered frame.
    this._floorHeightTransition = {
        startTs: null,
        durationMs: duration,
        fromOffsets: null,
        toApartmentIndex: toAptIdx,
        to: toSnap
    };
    this._forceDomUpdate = true;
    if (this.app && !this.app.autoRender && 'renderNextFrame' in this.app) {
        this.app.renderNextFrame = true;
    }
};


ApartmentsMode.prototype.hideAllApartmentUi = function () {
    this.clearFloorHeightTransition();
    for (let i = 0; i < this.apartmentsData.length; i++) {
        const item = this.apartmentsData[i];
        if (item?.style) item.style.display = 'none';
        if (item) {
            item.visible = false;
            item.lastX = NaN;
            item.lastY = NaN;
        }
    }
    this.infoPanel?.classList.remove('visible');
    this.endInfoPanelPlacement();
    if (this.mobilePanelEl) {
        this.mobilePanelEl.classList.remove('visible');
        this.mobilePanelEl.setAttribute('aria-hidden', 'true');
    }
    this.mobilePanelScroll?.replaceChildren();
    this.closePlanPanel({ keepInfoHidden: true });
    this.updateInfoPanelNavState();
    this.hideFloorPanel();
};

ApartmentsMode.prototype.centerCameraToApartmentsHome = function () {
    this.releaseCameraLock();
    const orbit = this.getOrbit();
    if (!orbit) return;

    orbit.autoRotateMode = 1;
    orbit.setLookAtOffset?.(0, 0, 0);
    orbit.setLookAtVerticalAngle?.(0);
    orbit.setAutoRotateEnabled?.(false);
    orbit.autoRotateEnabled = false;
    orbit.resetInteractionState?.();
    if (this._homeTarget) orbit.focusOn?.(this._homeTarget);

    this._forceDomUpdate = true;
    if (this.app && !this.app.autoRender && 'renderNextFrame' in this.app) {
        this.app.renderNextFrame = true;
    }
};

ApartmentsMode.prototype.enterMode = function (ctx) {
    this._active = true;
    const isRepeat = !!ctx?.meta?.repeat;
    if (isRepeat && this.isInfoPanelOpen()) this.closeInfoPanel();
    this.centerCameraToApartmentsHome();
    this.ensureMainDataLoaded();
    this._forceDomUpdate = true;
    this._rectDirty = true;
    this.syncFloorPanelWidth();
    this.updateFloorPanelVisibility();
    this.updateDomPositions();
    if (this.app && !this.app.autoRender && 'renderNextFrame' in this.app) this.app.renderNextFrame = true;
};

ApartmentsMode.prototype.exitMode = function () {
    if (!this._active) return;
    this._active = false;
    this._selectionToken++;
    this.clearFloorHeightTransition();
    this.cancelFloorAnimation();
    this.releaseCameraLock();
    this.hideAllApartmentUi();
    this.clearFloorPanelItems();
    this.clearSelectionVisuals();
};

ApartmentsMode.prototype.configureCameraLock = function () {
    this.getCameraShared()?.configureCameraLock?.(this);
};

ApartmentsMode.prototype.releaseCameraLock = function () {
    this.getCameraShared()?.releaseCameraLock?.(this);
};

ApartmentsMode.prototype.getLang = function () {
    return window.AppLanguage?.get?.() ?? 'en';
};

ApartmentsMode.prototype.ensureMainDataLoaded = function () {
    if (this._mainDataLoaded || this._mainDataLoading) return;
    this._mainDataLoading = true;

    fetch(this.dataUrl, { cache: 'no-cache' })
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${this.dataUrl}`);
            return res.json();
        })
        .then((json) => {
            if (!this.apartmentsContainer) return;
            const shared = this.getShared();
            const parsed = shared?.parseData ? shared.parseData(json, this.getLang()) : [];
            this.renderMarkers(parsed);
            this._mainDataLoaded = true;
            this._mainDataLoading = false;
        })
        .catch((err) => {
            console.warn('Apartments data load failed:', err);
            this._mainDataLoading = false;
            this._mainDataLoaded = true;
            if (this.apartmentsContainer) this.renderMarkers([]);
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
    this.updateInfoPanelNavState();
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

ApartmentsMode.prototype.navigateSelectedApartment = function (step) {
    this.getPanelShared()?.navigateSelectedApartment?.(this, step);
};

ApartmentsMode.prototype.updateInfoPanelNavState = function () {
    this.getPanelShared()?.updateInfoPanelNavState?.(this);
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

    const margin = isFinite(this.panelViewportMargin) ? this.panelViewportMargin : 12;
    const panelSize = this.getInfoPanelSize();
    const panelWidth = panelSize.width || 320;
    const panelHeight = panelSize.height || 220;

    const minX = margin;
    const maxX = window.innerWidth - margin - panelWidth;
    const minY = margin;
    const maxY = window.innerHeight - margin - panelHeight;

    const x = Math.round(Math.min(maxX, Math.max(minX, window.innerWidth * 0.5 - panelWidth * 0.5)));
    const y = Math.round(Math.min(maxY, Math.max(minY, window.innerHeight * 0.5 - panelHeight * 0.5)));

    this.infoPanel.style.setProperty('--apartments-panel-x', `${x}px`);
    this.infoPanel.style.setProperty('--apartments-panel-y', `${y}px`);
    this.updateFloorPanelPosition();
};

ApartmentsMode.prototype.scheduleInfoPanelReposition = function () {
    if (!this.infoPanel || !this.infoPanel.classList.contains('visible')) return;
    if (this._infoPanelRepositionTimer) {
        clearTimeout(this._infoPanelRepositionTimer);
        this._infoPanelRepositionTimer = 0;
    }
    this.markInfoPanelSizeDirty();
    this.updateInfoPanelPosition();

    if (typeof requestAnimationFrame !== 'function') return;
    requestAnimationFrame(() => {
        if (!this.infoPanel || !this.infoPanel.classList.contains('visible')) return;
        this.markInfoPanelSizeDirty();
        this.updateInfoPanelPosition();
        requestAnimationFrame(() => {
            if (!this.infoPanel || !this.infoPanel.classList.contains('visible')) return;
            this.markInfoPanelSizeDirty();
            this.updateInfoPanelPosition();
            this._forceDomUpdate = true;
        });
    });

    this._infoPanelRepositionTimer = setTimeout(() => {
        this._infoPanelRepositionTimer = 0;
        if (!this.infoPanel || !this.infoPanel.classList.contains('visible')) return;
        this.markInfoPanelSizeDirty();
        this.updateInfoPanelPosition();
        this._forceDomUpdate = true;
    }, 140);

    this._infoPanelPlacementTimer = setTimeout(() => {
        this._infoPanelPlacementTimer = 0;
        if (!this.infoPanel) return;
        this.infoPanel.classList.remove('is-placing');
    }, 220);
};

ApartmentsMode.prototype.updateDomPositions = function () {
    const planOpen = this.isPlanPanelOpen();
    const planClosing = !!this._planPanelCloseTimer;
    if (planOpen || planClosing) {
        for (let i = 0; i < this.apartmentsData.length; i++) {
            const item = this.apartmentsData[i];
            if (!item) continue;
            if (item.style) item.style.display = 'none';
            item.visible = false;
            item.lastX = NaN;
            item.lastY = NaN;
        }
        return;
    }

    const panelOpen = this.isInfoPanelOpen();

    if (this.apartmentsData.length) {
        window.PcScriptShared.updateDomPositions(this, this.apartmentsData, {
            activeCheck: true,
            hideSelected: panelOpen ? (item) => item === this._selectedApartment : null,
            transformSuffix: this.getDomTransformSuffix()
        });
    }

    if (this._floorItemsData?.length && panelOpen) {
        const floorVisible = this.floorPanel && !this.floorPanel.classList.contains('hidden');
        if (floorVisible) {
            this._updateFloorItemPositions();
        }
    }
};

ApartmentsMode.prototype._applyFloorItemPositions = function (fixedX, anchorTransform, getY, options) {
    const threshold = isFinite(this.screenVisibilityThreshold) ? this.screenVisibilityThreshold : 0.25;
    const easeRaw = Number(options?.ease);
    const ease = isFinite(easeRaw) ? Math.max(0.01, Math.min(1, easeRaw)) : 1;
    let hasPending = false;

    for (let i = 0; i < this._floorItemsData.length; i++) {
        const item = this._floorItemsData[i];
        if (!item) continue;

        const targetY = getY(item, i);
        if (targetY === null) continue;

        const needsReveal = !item.visible;
        if (needsReveal) { item.lastX = NaN; item.lastY = NaN; }

        const canSmooth = !needsReveal && ease < 0.999 && isFinite(item.lastX) && isFinite(item.lastY);
        const nextX = canSmooth ? item.lastX + (fixedX - item.lastX) * ease : fixedX;
        const nextY = canSmooth ? item.lastY + (targetY - item.lastY) * ease : targetY;

        const dx = isNaN(item.lastX) ? Infinity : Math.abs(nextX - item.lastX);
        const dy = isNaN(item.lastY) ? Infinity : Math.abs(nextY - item.lastY);
        if (dx > threshold || dy > threshold) {
            item.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)${anchorTransform}`;
            item.lastX = nextX;
            item.lastY = nextY;
        }

        if (canSmooth) {
            const remainX = Math.abs(fixedX - nextX);
            const remainY = Math.abs(targetY - nextY);
            if (remainX > threshold || remainY > threshold) hasPending = true;
        }

        if (needsReveal) {
            item.visible = true;
            item.style.display = 'block';
        }
    }

    if (hasPending) {
        this._forceDomUpdate = true;
        if (this.app && !this.app.autoRender && 'renderNextFrame' in this.app) {
            this.app.renderNextFrame = true;
        }
    }
};

ApartmentsMode.prototype._updateFloorItemPositions = function () {
    if (!this._floorItemsData?.length) return;

    const total = this._floorItemsData.length;
    const landscapeScale = this.getLandscapeUiScale();
    const shouldScaleFloors = !this.isMobileUiLayout() && landscapeScale < 0.999;
    const floorScaleSuffix = shouldScaleFloors ? ` scale(${landscapeScale})` : '';
    const clampScale = (value, fallback) => {
        const n = Number(value);
        if (!isFinite(n)) return fallback;
        return Math.max(0.05, Math.min(1.5, n));
    };
    const pickFinite = (values, fallback) => {
        for (let i = 0; i < values.length; i++) {
            const v = Number(values[i]);
            if (isFinite(v)) return v;
        }
        return fallback;
    };
    const normalizeAngle = (deg) => ((((deg % 360) + 540) % 360) - 180);
    const baseLandscapeHeightScale = shouldScaleFloors
        ? clampScale(this.landscapeFloorHeightScale, landscapeScale)
        : 1;
    let landscapeHeightScale = baseLandscapeHeightScale;
    const panelSize = this.getInfoPanelSize();
    const panelWidth = panelSize.width || 320;
    const floorGap = 52 * landscapeScale;
    const panelRect =
        this.infoPanel && this.infoPanel.classList.contains('visible')
            ? this.infoPanel.getBoundingClientRect()
            : null;
    const panelLeftFromRect =
        panelRect && Number.isFinite(panelRect.left) ? panelRect.left : NaN;
    const panelLeftFallback = window.innerWidth * 0.5 - panelWidth * 0.5;
    const panelLeft = Number.isFinite(panelLeftFromRect) ? panelLeftFromRect : panelLeftFallback;

    if (this.isMobileUiLayout()) {
        const fixedX = isFinite(this.mobileFloorLeftOffset) ? this.mobileFloorLeftOffset : 10;
        const stepY = 50;
        const centerOffsetY = isFinite(this.mobileFloorCenterOffset) ? this.mobileFloorCenterOffset : 50;
        const listHeight = Math.max(0, (total - 1) * stepY);
        const startY = window.innerHeight * 0.5 - listHeight * 0.5 - centerOffsetY;

        this._applyFloorItemPositions(
            fixedX,
            ' translate(0, -50%)',
            (_item, i) => startY + (total - 1 - i) * stepY,
            { ease: 1 }
        );
        return;
    }

    // Desktop: world-projected positions
    const camera = this.cameraEntity?.camera;
    const rect = this.getCanvasRect();
    if (!camera || !rect) return;

    const marker = this._selectedApartment;
    if (!marker?.worldPos) return;

    const fixedX = panelLeft - floorGap;

    const rows = this.getCurrentFloorRows?.() || [];
    if (!rows.length) return;
    const selectedIndex = Math.max(0, Math.min(rows.length - 1, this._selectedFloorIndex | 0));
    const selectedApartmentIndex = Math.max(0, this._selectedApartmentIndex | 0);

    if (shouldScaleFloors) {
        const selectedRow = rows[selectedIndex] || null;
        const apartments = Array.isArray(selectedRow?.apartments) ? selectedRow.apartments : [];
        const selectedApartment = apartments[selectedApartmentIndex] || apartments[0] || null;
        const baseYaw = pickFinite(
            [
                selectedApartment?.camera?.yaw,
                selectedRow?.camera?.yaw,
                this._selectedApartment?.camera?.yaw,
                this.cameraYaw
            ],
            0
        );
        const orbit = this.getOrbit?.();
        const currentYaw = pickFinite([orbit?.eulers?.y, orbit?.eulersTarget?.y], baseYaw);
        const yawDelta = normalizeAngle(currentYaw - baseYaw);
        const yawRange = Math.max(0.001, Math.abs(Number(this.cameraHorizontalRotateLimit || 20)));
        const yawMix = Math.max(0, Math.min(1, Math.abs(yawDelta) / yawRange));
        const leftScale = clampScale(this.landscapeFloorHeightScaleLeft, baseLandscapeHeightScale);
        const rightScale = clampScale(this.landscapeFloorHeightScaleRight, baseLandscapeHeightScale);
        const sideScale = yawDelta < 0 ? leftScale : rightScale;
        landscapeHeightScale = baseLandscapeHeightScale + (sideScale - baseLandscapeHeightScale) * yawMix;
    }

    const baseSnapshot = this._getFloorHeightsSnapshot(selectedApartmentIndex);
    if (!baseSnapshot) return;

    const selectedHeight = Number(baseSnapshot.selectedHeight);
    if (!isFinite(selectedHeight)) return;

    // Compute anchor and pixelsPerUnit BEFORE any transition blend,
    // so fromOffsets can be lazily initialised from item.lastY in the same scale.
    const anchorPos = new pc.Vec3(marker.worldPos.x, selectedHeight, marker.worldPos.z);
    camera.worldToScreen(anchorPos, this._screenPos);
    if (!this._active || this._screenPos.z <= 0 ||
        !Number.isFinite(this._screenPos.x) || !Number.isFinite(this._screenPos.y)) {
        for (let i = 0; i < total; i++) {
            const item = this._floorItemsData[i];
            if (!item || !item.visible) continue;
            item.visible = false;
            item.style.display = 'none';
            item.lastX = NaN;
            item.lastY = NaN;
        }
        return;
    }

    const panelCenterY = window.innerHeight * 0.5;
    const anchorScreenY = rect.top + this._screenPos.y;
    this._tempVec.set(anchorPos.x, anchorPos.y + 1.0, anchorPos.z);
    camera.worldToScreen(this._tempVec, this._screenPos);
    const pixelsPerUnit = anchorScreenY - (rect.top + this._screenPos.y);
    if (!Number.isFinite(pixelsPerUnit) || Math.abs(pixelsPerUnit) < 1e-4) return;

    let rowHeights = baseSnapshot.rowHeights;

    const transition = this._floorHeightTransition;
    if (transition) {
        let justInitialized = false;
        // Lazy init: capture fromOffsets on the first rendered frame after navigation.
        // At this point focusCameraForFloor has already changed orbit focus, so
        // pixelsPerUnit already reflects the new camera state - no jump.
        if (!transition.fromOffsets) {
            const offsets = new Array(rows.length);
            for (let i = 0; i < rows.length; i++) {
                const item = this._floorItemsData[i];
                if (i === selectedIndex || !item || !isFinite(item.lastY)) {
                    offsets[i] = 0;
                } else {
                    offsets[i] = (Number(item.lastY) - panelCenterY) / (pixelsPerUnit * landscapeHeightScale);
                }
            }
            transition.fromOffsets = offsets;
            transition.startTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            justInitialized = true;
        }

        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const duration = Math.max(1, Number(transition.durationMs) || 1);
        const tRaw = justInitialized
            ? 0
            : Math.max(0, Math.min(1, (now - Number(transition.startTs)) / duration));
        const t = tRaw * tRaw * (3 - 2 * tRaw);

        const toSelH = Number(transition.to.selectedHeight);
        const toHeights = Array.isArray(transition.to.rowHeights) ? transition.to.rowHeights : [];
        const fromOffsets = transition.fromOffsets;
        const blendedHeights = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            if (i === selectedIndex) { blendedHeights[i] = selectedHeight; continue; }
            const fromOff = Number(fromOffsets[i]);
            const toOff = isFinite(toSelH) && isFinite(Number(toHeights[i])) ? toSelH - Number(toHeights[i]) : NaN;
            if (isFinite(fromOff) && isFinite(toOff)) blendedHeights[i] = selectedHeight - (fromOff + (toOff - fromOff) * t);
            else if (isFinite(toOff))   blendedHeights[i] = selectedHeight - toOff;
            else if (isFinite(fromOff)) blendedHeights[i] = selectedHeight - fromOff;
            else blendedHeights[i] = Number(rowHeights[i]);
        }
        rowHeights = blendedHeights;

        if (tRaw >= 0.999) this._floorHeightTransition = null;
        else {
            this._forceDomUpdate = true;
            if (this.app && !this.app.autoRender && 'renderNextFrame' in this.app) {
                this.app.renderNextFrame = true;
            }
        }
    }

    const floorLerp = this._floorHeightTransition
        ? 1
        : Math.max(0.05, Math.min(1, Number(this.floorPositionLerp ?? 0.14)));
    this._applyFloorItemPositions(
        fixedX,
        ` translate(-100%, -50%)${floorScaleSuffix}`,
        (_item, i) => {
            if (i === selectedIndex) return panelCenterY;
            const rowHeight = Number(rowHeights[i]);
            if (!isFinite(rowHeight)) return null;
            return panelCenterY + (selectedHeight - rowHeight) * pixelsPerUnit * landscapeHeightScale;
        },
        { ease: floorLerp }
    );
};

ApartmentsMode.prototype.getSelectedFloorRow = function () {
    const rows = this.getCurrentFloorRows();
    const idx = this._selectedFloorIndex;
    if (!rows?.length || idx < 0 || idx >= rows.length) return null;
    return rows[idx];
};

ApartmentsMode.prototype.getSelectedApartmentData = function () {
    const row = this.getSelectedFloorRow();
    if (!row) return null;
    const apartments = Array.isArray(row.apartments) ? row.apartments : [];
    if (!apartments.length) return row;
    const idx = Math.max(0, Math.min(apartments.length - 1, this._selectedApartmentIndex | 0));
    return { ...row, ...apartments[idx] };
};

ApartmentsMode.prototype.getPlanImageUrl = function (apartmentData) {
    return (
        apartmentData?.planImageUrl ||
        apartmentData?.planImage ||
        apartmentData?.imageUrl ||
        'assets/images/pictures/pic_loading.png'
    );
};

ApartmentsMode.prototype.normalizeGalleryImages = function (value) {
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
};

ApartmentsMode.prototype.uniqueImageList = function (list) {
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
};

ApartmentsMode.prototype.getExpandedGallerySets = function (apartmentData) {
    const gallery = apartmentData?.gallery && typeof apartmentData.gallery === 'object'
        ? apartmentData.gallery
        : null;

    const fallback = this.uniqueImageList(
        this.normalizeGalleryImages(apartmentData?.galleryImages)
            .concat(this.normalizeGalleryImages(apartmentData?.images))
            .concat(this.normalizeGalleryImages(apartmentData?.imageUrl))
    );

    const sets = {
        interior: this.uniqueImageList(
            this.normalizeGalleryImages(apartmentData?.interiorImages)
                .concat(this.normalizeGalleryImages(apartmentData?.interior))
                .concat(this.normalizeGalleryImages(gallery?.interior))
        ),
        view: this.uniqueImageList(
            this.normalizeGalleryImages(apartmentData?.viewImages)
                .concat(this.normalizeGalleryImages(apartmentData?.view))
                .concat(this.normalizeGalleryImages(gallery?.view))
        ),
        street: this.uniqueImageList(
            this.normalizeGalleryImages(apartmentData?.streetImages)
                .concat(this.normalizeGalleryImages(apartmentData?.street))
                .concat(this.normalizeGalleryImages(gallery?.street))
        )
    };

    const fallbackSet = fallback.length ? fallback : ['assets/images/pictures/pic_loading.png'];
    if (!sets.interior.length) sets.interior = fallbackSet.slice();
    if (!sets.view.length) sets.view = fallbackSet.slice();
    if (!sets.street.length) sets.street = fallbackSet.slice();
    return sets;
};

ApartmentsMode.prototype.updateExpandedTabState = function (activeType) {
    if (!this.expandedTabs?.length) return;
    for (let i = 0; i < this.expandedTabs.length; i++) {
        const tab = this.expandedTabs[i];
        const isActive = String(tab.dataset.galleryType || '') === activeType;
        tab.classList.toggle('is-active', isActive);
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
};

ApartmentsMode.prototype.renderExpandedThumbs = function (images, activeIndex) {
    if (!this.expandedThumbs) return;
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
    this.expandedThumbs.replaceChildren(fragment);
};

ApartmentsMode.prototype.renderExpandedMobileSlider = function (images) {
    if (!this.expandedMobileSlider) return;
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
    this.expandedMobileSlider.replaceChildren(fragment);
};

ApartmentsMode.prototype.updateExpandedGalleryVisuals = function () {
    if (!this.planImage || !this._expandedGalleryImages.length) return;
    const idx = Math.max(0, Math.min(this._expandedGalleryImages.length - 1, this._expandedGalleryIndex | 0));
    this._expandedGalleryIndex = idx;
    const src = this._expandedGalleryImages[idx] || 'assets/images/pictures/pic_loading.png';
    this.planImage.src = src;

    if (this.expandedThumbs) {
        const thumbs = this.expandedThumbs.querySelectorAll('[data-gallery-index]');
        for (let i = 0; i < thumbs.length; i++) {
            thumbs[i].classList.toggle('is-active', i === idx);
        }
    }
};

ApartmentsMode.prototype.updatePlanPanelNavState = function () {
    const floorRow = this.getSelectedFloorRow();
    const aptCount = floorRow?.apartments?.length || 0;
    const hasNav = aptCount > 1;
    const setState = (el) => {
        if (!el) return;
        el.disabled = !hasNav;
        el.style.opacity = hasNav ? '1' : '0.45';
        el.style.pointerEvents = hasNav ? 'auto' : 'none';
    };
    setState(this.planPrevDesktop);
    setState(this.planNextDesktop);
    setState(this.planPrevMobile);
    setState(this.planNextMobile);
};

ApartmentsMode.prototype.updatePlanPanelContent = function () {
    if (!this._selectedApartment) return;
    const apartmentData = this.getSelectedApartmentData();
    if (!apartmentData) return;

    const markerTitle = this._selectedApartment?.title || 'Apartments';
    const unitName = apartmentData?.name || markerTitle;
    const floorWord = window.AppLanguage?.getText?.('floor', 'Floor') ?? 'Floor';
    const floorLabel = apartmentData?.floorRaw ? `${floorWord} ${apartmentData.floorRaw}` : `${floorWord} -`;
    const area = apartmentData?.area || '-';
    const bedrooms = apartmentData?.bedrooms || '-';
    const availability = apartmentData?.availability || '-';
    const description = apartmentData?.description || '';
    const gallerySets = this.getExpandedGallerySets(apartmentData);
    const activeType = gallerySets[this._expandedGalleryType] ? this._expandedGalleryType : 'street';
    const activeImages = gallerySets[activeType];
    this._expandedGalleryType = activeType;
    this._expandedGalleryImages = activeImages;
    this._expandedGalleryIndex = Math.max(
        0,
        Math.min(activeImages.length - 1, this._expandedGalleryIndex | 0)
    );

    if (this.planTitle) this.planTitle.textContent = `${unitName}, ${floorLabel}`;
    if (this.planArea) this.planArea.textContent = area;
    if (this.planBedrooms) this.planBedrooms.textContent = bedrooms;
    if (this.planAvailability) this.planAvailability.textContent = availability;
    if (this.planDescription) this.planDescription.textContent = description;
    if (this.planImage) this.planImage.alt = `${unitName} gallery image`;

    this.updateExpandedTabState(activeType);
    if (this.expandedGalleryLabel) {
        const galleryLabel = window.AppLanguage?.getText?.(
            'gallery_label',
            'Gallery'
        ) ?? 'Gallery';
        this.expandedGalleryLabel.textContent = `${galleryLabel} (${activeImages.length})`;
    }
    this.renderExpandedThumbs(activeImages, this._expandedGalleryIndex);
    this.renderExpandedMobileSlider(activeImages);
    this.updateExpandedGalleryVisuals();

    this.updatePlanPanelNavState();
    this.updatePlanPanelLandscapeHeight();
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => this.updatePlanPanelLandscapeHeight());
    }
};

ApartmentsMode.prototype.openPlanPanel = function () {
    if (!this.planPanel || !this._selectedApartment) return;
    if (!this.getSelectedApartmentData()) return;
    if (this._planPanelCloseTimer) {
        clearTimeout(this._planPanelCloseTimer);
        this._planPanelCloseTimer = 0;
    }
    if (this._planNavPressTimers?.size) {
        this._planNavPressTimers.forEach((timer) => clearTimeout(timer));
        this._planNavPressTimers.clear();
    }
    if (this._infoPanelRepositionTimer) {
        clearTimeout(this._infoPanelRepositionTimer);
        this._infoPanelRepositionTimer = 0;
    }
    this._expandedGalleryType = this._expandedGalleryType || 'street';
    this._expandedGalleryIndex = 0;
    this.updatePlanPanelContent();
    if (this.infoPanel) {
        this.infoPanel.classList.remove('visible');
        this.infoPanel.classList.remove('is-content-swapping');
    }
    this.endInfoPanelPlacement();
    if (this.mobilePanelEl) {
        this.mobilePanelEl.classList.remove('visible');
        this.mobilePanelEl.setAttribute('aria-hidden', 'true');
    }
    this.planPanel.classList.add('visible');
    this.planPanel.setAttribute('aria-hidden', 'false');
    this.updatePlanPanelLandscapeHeight();
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => this.updatePlanPanelLandscapeHeight());
    }
    this.updateInfoPanelNavState();
    this.updateFloorPanelVisibility();
    this._forceDomUpdate = true;
    this.updateDomPositions();
};

ApartmentsMode.prototype.closePlanPanel = function (options) {
    if (!this.planPanel) return;
    if (this._planPanelCloseTimer) {
        clearTimeout(this._planPanelCloseTimer);
        this._planPanelCloseTimer = 0;
    }
    this.planPanel.classList.remove('visible');
    this.planPanel.setAttribute('aria-hidden', 'true');
    if (options?.keepInfoHidden) {
        this.updateFloorPanelVisibility();
        this._forceDomUpdate = true;
        this.updateDomPositions();
        return;
    }
    if (!this._active || !this._selectedApartment) return;
    const reopenInfoPanel = () => {
        if (!this._active || !this._selectedApartment || this.isPlanPanelOpen()) return;
        this.openInfoPanel();
        this.updateFloorPanelVisibility();
        this._forceDomUpdate = true;
        this.updateDomPositions();
    };
    if (this.isPortrait()) {
        this._planPanelCloseTimer = setTimeout(() => {
            this._planPanelCloseTimer = 0;
            reopenInfoPanel();
        }, 280);
        return;
    }
    reopenInfoPanel();
};

ApartmentsMode.prototype.navigatePlanSelection = function (step) {
    const floorRow = this.getSelectedFloorRow();
    const apartments = floorRow?.apartments;
    if (!apartments || apartments.length < 2) return;

    const direction = step < 0 ? -1 : 1;

    if (this.isPortrait()) {
        const total = apartments.length;
        let nextIdx = (this._selectedApartmentIndex || 0) + direction;
        if (nextIdx < 0) nextIdx = total - 1;
        else if (nextIdx >= total) nextIdx = 0;
        this._selectedApartmentIndex = nextIdx;
        this.applyPanelContent(this._selectedApartment, floorRow);
        this.focusCameraForFloor(this._selectedFloorIndex);
        this.updatePlanPanelContent();
        return;
    }

    this.navigateSelectedApartment(direction);
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
    if (this._planPanelCloseTimer) {
        clearTimeout(this._planPanelCloseTimer);
        this._planPanelCloseTimer = 0;
    }

    this._unregisterMode?.();
    if (this._fallbackModeHandlerBound) this.app.off('mode:change', this._onModeChangeFallback, this);

    this.unbindEvents();
    this.hideAllApartmentUi();
    this._infoPanelResizeObserver?.disconnect();

    this.cameraEntity = null;
    this.apartmentsContainer = null;
    this.infoPanel = null;
    this.infoPanelClose = null;
    this.infoPanelPrev = null;
    this.infoPanelNext = null;
    this._selectedApartmentIndex = 0;
    this.panelTitle = null;
    this.panelArea = null;
    this.panelBedrooms = null;
    this.panelAvailability = null;
    this.panelDescription = null;
    this.panelImage = null;
    this.panelVisit = null;
    this.planPanel = null;
    this.planCloseDesktop = null;
    this.planCloseMobile = null;
    this.planPrevDesktop = null;
    this.planNextDesktop = null;
    this.planPrevMobile = null;
    this.planNextMobile = null;
    this.planVisitMobile = null;
    this.planTitle = null;
    this.planArea = null;
    this.planBedrooms = null;
    this.planAvailability = null;
    this.planDescription = null;
    this.planImage = null;
    this.planMobileThumb = null;
    this.planMobileTitle = null;
    this.planMobileArea = null;
    this.planMobileBedrooms = null;
    this.planMobileAvailability = null;
    this.planMobileImage = null;
    this.expandedTabs = null;
    this.expandedViewAll = null;
    this.expandedGalleryLabel = null;
    this.expandedThumbs = null;
    this.expandedMobileSlider = null;
    this.floorPanel = null;
    this.floorPanelScroll = null;
    this.mobilePanelEl = null;
    this.mobilePanelScroll = null;

    this._modeManager = null;
    this._shared = null;
    this._uiShared = null;
    this._cameraShared = null;
    this._floorShared = null;
    this._panelShared = null;
    this._swipeShared = null;
    this._unregisterMode = null;
    this._floorPanelNodes = null;
    this._floorItemsData = null;
    this.apartmentsData = null;
    this._selectedApartment = null;
    this._focusTarget = null;
    this._screenPos = null;
    this._tempVec = null;
    this._homeTarget = null;
    this._onContainerClick = null;
    this._onContainerKeyDown = null;
    this._onPanelCloseClick = null;
    this._onPanelCloseKeyDown = null;
    this._onPanelVisitClick = null;
    this._onPlanCloseClick = null;
    this._onPlanPrevClick = null;
    this._onPlanNextClick = null;
    this._onPlanVisitClick = null;
    this._onExpandedTabClick = null;
    this._onExpandedViewAllClick = null;
    this._onExpandedThumbClick = null;
    this._onFloorPanelClick = null;
    this._onFloorPanelKeyDown = null;
    this._onPanelSwipePointerDown = null;
    this._onScreenSwipePointerDown = null;
    this._onPanelSwipePointerMove = null;
    this._onPanelSwipePointerUp = null;
    this._floorHeightTransition = null;
    this._panelSwapAnimTimer = 0;
    this._planPanelCloseTimer = 0;
    this._infoPanelResizeObserver = null;
    this._infoPanelSize = null;
    this._lastIsPortrait = null;
    this._expandedGalleryType = 'street';
    this._expandedGalleryImages = null;
    this._expandedGalleryIndex = 0;
    this._planNavPressTimers = null;
    this.cancelFloorAnimation = null;
    this._onModeChangeFallback = null;
};

