var TouchInput = pc.createScript('touchInput');

TouchInput.attributes.add('orbitSensitivity', {
    type: 'number', 
    default: 0.4, 
    title: 'Orbit Sensitivity', 
    description: 'How fast the camera moves around the orbit. Higher is faster'
});

TouchInput.attributes.add('distanceSensitivity', {
    type: 'number', 
    default: 0.2, 
    title: 'Distance Sensitivity', 
    description: 'How fast the camera moves in and out. Higher is faster'
});

TouchInput.prototype.initialize = function() {
    this.orbitCamera = this.entity.script.orbitCamera;
    this.lastTouchPoint = new pc.Vec2();
    this.lastPinchDistance = 0;

    if (this.orbitCamera && this.app.touch) {
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStartEndCancel, this);
        this.app.touch.on(pc.EVENT_TOUCHEND, this.onTouchStartEndCancel, this);
        this.app.touch.on(pc.EVENT_TOUCHCANCEL, this.onTouchStartEndCancel, this);
        this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);

        this.on('destroy', function() {
            this.app.touch.off(pc.EVENT_TOUCHSTART, this.onTouchStartEndCancel, this);
            this.app.touch.off(pc.EVENT_TOUCHEND, this.onTouchStartEndCancel, this);
            this.app.touch.off(pc.EVENT_TOUCHCANCEL, this.onTouchStartEndCancel, this);
            this.app.touch.off(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
        });
    }
};

TouchInput.prototype.getPinchDistance = function (pointA, pointB) {
    var dx = pointA.x - pointB.x;
    var dy = pointA.y - pointB.y;
    return Math.sqrt((dx * dx) + (dy * dy));
};

TouchInput.prototype.onTouchStartEndCancel = function(event) {
    if (!this.enabled) return;
    var touches = event.touches;
    if (touches.length == 1) {
        this.lastTouchPoint.set(touches[0].x, touches[0].y);
    } else if (touches.length == 2) {
        this.lastPinchDistance = this.getPinchDistance(touches[0], touches[1]);
    }
};

TouchInput.prototype.onTouchMove = function(event) {
    if (!this.enabled) return;
    var touches = event.touches;
    if (touches.length == 1) {
        var touch = touches[0];
        this.orbitCamera.pitch -= (touch.y - this.lastTouchPoint.y) * this.orbitSensitivity;
        this.orbitCamera.yaw -= (touch.x - this.lastTouchPoint.x) * this.orbitSensitivity;
        this.lastTouchPoint.set(touch.x, touch.y);
    } else if (touches.length == 2) {
        var currentPinchDistance = this.getPinchDistance(touches[0], touches[1]);
        var diffInPinchDistance = currentPinchDistance - this.lastPinchDistance;
        this.lastPinchDistance = currentPinchDistance;

        this.orbitCamera.distance -= (diffInPinchDistance * this.distanceSensitivity * 0.1) * (this.orbitCamera.distance * 0.1);
    }
};