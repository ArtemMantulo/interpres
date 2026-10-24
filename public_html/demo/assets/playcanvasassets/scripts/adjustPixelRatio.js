var AdjustPixelRatio = pc.createScript('adjustPixelRatio');

AdjustPixelRatio.attributes.add('scaleDivisor', {
    type: 'number',
    default: 1.4,
    min: 1.0,
    title: 'Scale Divisor',
    description: 'Во сколько раз уменьшить devicePixelRatio на мобильных устройствах'
});

AdjustPixelRatio.prototype.initialize = function () {
    var app = this.app;
    var isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var nativeRatio = window.devicePixelRatio || 1;

    if (isMobile) {
        app.graphicsDevice.maxPixelRatio = nativeRatio / this.scaleDivisor;
    } else {
        app.graphicsDevice.maxPixelRatio = nativeRatio;
    }

    // DEBUG
    console.log("User Agent:", navigator.userAgent);
    console.log("Is Mobile:", isMobile);
    console.log("Device Pixel Ratio:", nativeRatio);
    console.log("Applied MaxPixelRatio:", app.graphicsDevice.maxPixelRatio);

    // Применяем новый размер канваса
    app.graphicsDevice.resizeCanvas(app.graphicsDevice.canvas.width, app.graphicsDevice.canvas.height);
};