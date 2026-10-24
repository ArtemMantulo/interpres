var AdjustPixelRatio = pc.createScript('adjustPixelRatio');

AdjustPixelRatio.attributes.add('scaleMobile', { type: 'number', default: 0.6 });
AdjustPixelRatio.attributes.add('scalePC', { type: 'number', default: 1 });

AdjustPixelRatio.attributes.add('adaptive', { type: 'boolean', default: true });

AdjustPixelRatio.attributes.add('minScaleMobile', { type: 'number', default: 0.5 });
AdjustPixelRatio.attributes.add('minScalePC', { type: 'number', default: 0.8 });

AdjustPixelRatio.attributes.add('maxScaleMobile', { type: 'number', default: 0.7 });
AdjustPixelRatio.attributes.add('maxScalePC', { type: 'number', default: 1 });

AdjustPixelRatio.attributes.add('step', { type: 'number', default: 0.05 });
AdjustPixelRatio.attributes.add('sampleMs', { type: 'number', default: 1000 });

AdjustPixelRatio.attributes.add('downFps', { type: 'number', default: 30 });
AdjustPixelRatio.attributes.add('upFps', { type: 'number', default: 45 });

AdjustPixelRatio.prototype.initialize = function () {
    const app = this.app;
    const device = app && app.graphicsDevice;
    if (!device) return;

    const detect = window.AppDetect;
    const fallbackIsMobile = () => {
        const ua = navigator.userAgent || '';
        const isTablet =
            /iPad|Tablet/i.test(ua) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
            (/Android/i.test(ua) && !/Mobile/i.test(ua));
        const isPhone = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        return isPhone || isTablet;
    };
    const isMobile =
        typeof detect?.isMobile === 'function' ? detect.isMobile() : fallbackIsMobile();

    this._app = app;
    this._device = device;

    this._nativePixelRatio = window.devicePixelRatio || 1;

    this._baseScale = isMobile ? this.scaleMobile : this.scalePC;
    this._minScale = isMobile ? this.minScaleMobile : this.minScalePC;
    this._maxScale = isMobile ? this.maxScaleMobile : this.maxScalePC;

    this._scale = this._clampScale(this._baseScale);

    this._accumulatedMs = 0;
    this._frameCount = 0;

    this._applyScale(this._scale);
};

AdjustPixelRatio.prototype.update = function (dt) {
    if (!this.adaptive || !this._device) return;
    if (typeof this.shouldRender === 'function') {
        if (!this.shouldRender()) return;
    } else if (document.hidden) return;

    const lock = this.fpsLockerState;
    if (lock && lock.active) return;

    this._frameCount++;
    this._accumulatedMs += dt * 1000;
    if (this._accumulatedMs < this.sampleMs) return;

    const fps = (this._frameCount * 1000) / this._accumulatedMs;
    this._frameCount = 0;
    this._accumulatedMs = 0;

    let nextScale = this._scale;
    if (fps < this.downFps) nextScale -= this.step;
    else if (fps > this.upFps) nextScale += this.step;
    else return;

    nextScale = this._clampScale(nextScale);
    if (nextScale === this._scale) return;

    this._scale = nextScale;
    this._applyScale(nextScale);
};

AdjustPixelRatio.prototype._applyScale = function (scale) {
    this._device.maxPixelRatio = this._nativePixelRatio * scale;
    this._app.resizeCanvas();
};

AdjustPixelRatio.prototype._clampScale = function (scale) {
    if (!isFinite(scale)) scale = this._baseScale;
    return Math.max(this._minScale, Math.min(this._maxScale, scale));
};
