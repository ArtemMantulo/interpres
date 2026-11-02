var AdjustPixelRatio = pc.createScript('adjustPixelRatio');

AdjustPixelRatio.attributes.add('scaleMobile', {type: 'number', default: 0.45});
AdjustPixelRatio.attributes.add('scalePC', {type: 'number', default: 1});

AdjustPixelRatio.prototype.initialize = function () {
    var app = this.app;
    var isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var nativeRatio = window.devicePixelRatio || 1;

    if (isMobile) {
        app.graphicsDevice.maxPixelRatio = nativeRatio * this.scaleMobile;
    } else {
        app.graphicsDevice.maxPixelRatio = nativeRatio * this.scalePC;
    }

    console.log("User Agent:", navigator.userAgent);
    console.log("Is Mobile:", isMobile);
    console.log("Device Pixel Ratio:", nativeRatio);
    console.log("Applied MaxPixelRatio:", app.graphicsDevice.maxPixelRatio);
    app.graphicsDevice.resizeCanvas(app.graphicsDevice.canvas.width, app.graphicsDevice.canvas.height);
};