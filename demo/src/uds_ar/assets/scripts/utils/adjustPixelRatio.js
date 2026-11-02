var AdjustPixelRatio = pc.createScript('adjustPixelRatio');

AdjustPixelRatio.attributes.add('scaleMobile', { type: 'number', default: 1 });
AdjustPixelRatio.attributes.add('scalePC', { type: 'number', default: 1 });

AdjustPixelRatio.prototype.initialize = function () {
    this.applyPixelRatio();
};

AdjustPixelRatio.prototype.applyPixelRatio = function () {
    const app = this.app;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const nativeRatio = window.devicePixelRatio || 1;

    app.graphicsDevice.maxPixelRatio =
        isMobile ? nativeRatio * this.scaleMobile : nativeRatio * this.scalePC;

    app.graphicsDevice.resizeCanvas(
        app.graphicsDevice.canvas.width,
        app.graphicsDevice.canvas.height
    );
};