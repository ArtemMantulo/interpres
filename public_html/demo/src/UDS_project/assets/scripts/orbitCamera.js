var OrbitCamera = pc.createScript('orbitCamera');

OrbitCamera.attributes.add('portraitDistance', { type: 'number', default: 24 });
OrbitCamera.attributes.add('portraitMinDistance', { type: 'number', default: 12 });
OrbitCamera.attributes.add('portraitMaxDistance', { type: 'number', default: 30 });

OrbitCamera.attributes.add('landscapeDistance', { type: 'number', default: 18 });
OrbitCamera.attributes.add('landscapeMinDistance', { type: 'number', default: 12 });
OrbitCamera.attributes.add('landscapeMaxDistance', { type: 'number', default: 24 });

OrbitCamera.attributes.add('amenitiesLandscapeDistance', { type: 'number', default: 7 });
OrbitCamera.attributes.add('amenitiesLandscapeMinDistance', { type: 'number', default: 5 });
OrbitCamera.attributes.add('amenitiesLandscapeMaxDistance', { type: 'number', default: 9 });

OrbitCamera.attributes.add('amenitiesPortraitDistance', { type: 'number', default: 7 });
OrbitCamera.attributes.add('amenitiesPortraitMinDistance', { type: 'number', default: 5 });
OrbitCamera.attributes.add('amenitiesPortraitMaxDistance', { type: 'number', default: 14 });

OrbitCamera.attributes.add('rotationSpeed', { type: 'number', default: 0.3 });
OrbitCamera.attributes.add('zoomSpeed', { type: 'number', default: 0.5 });
OrbitCamera.attributes.add('lerpFactor', { type: 'number', default: 0.05 });
OrbitCamera.attributes.add('minPitch', { type: 'number', default: 25});
OrbitCamera.attributes.add('maxPitch', { type: 'number', default: 60});

OrbitCamera.attributes.add('autoRotateSpeed', { type: 'number', default: 7 });
OrbitCamera.attributes.add('autoRotateDelay', { type: 'number', default: 3 });

OrbitCamera.attributes.add('mouseRotationSensitivity', { type: 'number', default: 0.2});
OrbitCamera.attributes.add('touchRotationSensitivity', { type: 'number', default: 0.6});
OrbitCamera.attributes.add('mouseZoomSensitivity', { type: 'number', default: 0.5});
OrbitCamera.attributes.add('touchZoomSensitivity', { type: 'number', default: 5});

OrbitCamera.prototype.initialize = function () {
    this.initState();
    this.initMouseHandlers();
    this.initTouchHandlers();

    this.adjustDistanceForOrientation();
    window.addEventListener('resize', this.adjustDistanceForOrientation.bind(this));
};

OrbitCamera.prototype.initState = function () {
    this.target = new pc.Vec3(0.45, 0, 0.246);
    this.targetLerp = this.target.clone();
    this.distanceTarget = this.distance;
    this.distance = this.distanceTarget || 5;

    this.eulers = new pc.Vec2(30, -2);
    this.eulersTarget = this.eulers.clone();

    this.lastInputTime = performance.now();

    this.isDragging = false;
    this.lastTouchDistance = null;
    this.lastTouchPos = new pc.Vec2();
    this.isZooming = false;
    this.touching = false;
};

OrbitCamera.prototype.initMouseHandlers = function () {
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);
};

OrbitCamera.prototype.initTouchHandlers = function () {
    if (!this.app.touch) return;
    this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
    this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
    this.app.touch.on(pc.EVENT_TOUCHEND, this.onTouchEnd, this);
};


OrbitCamera.prototype.onMouseDown = function (e) {
    if (e.button === 0) {
        this.isDragging = true;
        this.lastInputTime = performance.now();
    }
};

OrbitCamera.prototype.onMouseUp = function (e) {
    if (e.button === 0) {
        this.isDragging = false;
    }
};

OrbitCamera.prototype.onMouseMove = function (e) {
    if (!this.isDragging) return;

    this.lastInputTime = performance.now();

    this.eulersTarget.x += e.dy * this.rotationSpeed;
    this.eulersTarget.y -= e.dx * this.rotationSpeed;

    this.eulersTarget.x = pc.math.clamp(this.eulersTarget.x, this.minPitch, this.maxPitch);
};

OrbitCamera.prototype.onMouseWheel = function (e) {
    this.lastInputTime = performance.now();
    this.distanceTarget -= e.wheel * this.zoomSpeed * this.mouseZoomSensitivity;
    this.distanceTarget = pc.math.clamp(this.distanceTarget, this.minDistance, this.maxDistance);
    e.event.preventDefault();
};

OrbitCamera.prototype.onTouchStart = function (e) {
    this.touching = true;
    this.lastInputTime = performance.now();
    if (e.touches.length === 1) {
        this.isZooming = false;
        this.lastTouchPos.set(e.touches[0].x, e.touches[0].y);
    }
    if (e.touches.length === 2) {
        this.isZooming = true;
        const dx = e.touches[0].x - e.touches[1].x;
        const dy = e.touches[0].y - e.touches[1].y;
        this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
    }
    e.event && e.event.preventDefault();
};

OrbitCamera.prototype.onTouchMove = function (e) {
    this.lastInputTime = performance.now();

    if (e.touches.length === 2) {
        this.isZooming = true;

        const dx = e.touches[0].x - e.touches[1].x;
        const dy = e.touches[0].y - e.touches[1].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const delta = dist - this.lastTouchDistance;
        const dprNorm = 1
        this.distanceTarget -= delta * this.zoomSpeed * this.touchZoomSensitivity * 0.01 * dprNorm;
        this.distanceTarget = pc.math.clamp(this.distanceTarget, this.minDistance, this.maxDistance);

        this.lastTouchDistance = dist;
    } else if (e.touches.length === 1 && !this.isZooming) {
        const x = e.touches[0].x;
        const y = e.touches[0].y;

        const dx = x - this.lastTouchPos.x;
        const dy = y - this.lastTouchPos.y;

        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) { e.event && e.event.preventDefault(); return; }

        this.eulersTarget.x += dy * this.touchRotationSensitivity;
        this.eulersTarget.y -= dx * this.touchRotationSensitivity;

        this.eulersTarget.x = pc.math.clamp(this.eulersTarget.x, this.minPitch, this.maxPitch);
        this.lastTouchPos.set(x, y);
    }
    e.event && e.event.preventDefault();
};

OrbitCamera.prototype.onTouchEnd = function (e) {
    if (e.touches.length === 0) {
        this.isZooming = false;
        this.touching = false;
        this.lastTouchDistance = null;
    } else if (e.touches.length === 1 && this.isZooming) {
        this.isZooming = false;
        this.lastTouchPos.set(e.touches[0].x, e.touches[0].y);
    }
    e.event && e.event.preventDefault();
};

OrbitCamera.prototype.update = function (dt) {
    const now = performance.now();
    const idleTime = (now - this.lastInputTime) / 1000;

    if (idleTime > this.autoRotateDelay) {
        this.eulersTarget.y -= this.autoRotateSpeed * dt;
    }

    this.updateRotationAndZoom(dt);
    this.updatePosition();
};

OrbitCamera.prototype.updateRotationAndZoom = function (dt) {
    this.eulers.x += (this.eulersTarget.x - this.eulers.x) * this.lerpFactor;
    this.eulers.y = this.lerpAngle(this.eulers.y, this.eulersTarget.y, this.lerpFactor);
    this.distance += (this.distanceTarget - this.distance) * this.lerpFactor;
};

OrbitCamera.prototype.updatePosition = function () {
    const pitch = this.eulers.x * pc.math.DEG_TO_RAD;
    const yaw = this.eulers.y * pc.math.DEG_TO_RAD;

    const x = this.distance * Math.cos(pitch) * Math.sin(yaw);
    const y = this.distance * Math.sin(pitch);
    const z = this.distance * Math.cos(pitch) * Math.cos(yaw);

    this.target.lerp(this.target, this.targetLerp, this.lerpFactor);

    this.entity.setPosition(
        this.target.x + x,
        this.target.y + y,
        this.target.z + z
    );
    this.entity.lookAt(this.target);
};


OrbitCamera.prototype.adjustDistanceForOrientation = function () {
    const isPortrait = window.innerHeight > window.innerWidth;

    if (isPortrait) {
        this.distanceTarget = this.portraitDistance;
        this.minDistance = this.portraitMinDistance;
        this.maxDistance = this.portraitMaxDistance;
    } else {
        this.distanceTarget = this.landscapeDistance;
        this.minDistance = this.landscapeMinDistance;
        this.maxDistance = this.landscapeMaxDistance;
    }
};

OrbitCamera.prototype.focusOn = function (vec3, distance) {
    this.targetLerp.copy(vec3);
    if (distance !== undefined) {
        this.distanceTarget = pc.math.clamp(distance, this.minDistance, this.maxDistance);
    }
    this.lastInputTime = performance.now();
};


OrbitCamera.prototype.lookAtPointSmoothly = function (vec3) {
    const dir = new pc.Vec3().sub2(vec3, this.entity.getPosition()).normalize();

    let yaw = Math.atan2(-dir.x, -dir.z) * pc.math.RAD_TO_DEG;
    let pitch = Math.asin(dir.y) * pc.math.RAD_TO_DEG;

    pitch = pc.math.clamp(pitch, this.minPitch, this.maxPitch);

    const currentYaw = this.eulers.y;
    while (yaw - currentYaw > 180) yaw -= 360;
    while (yaw - currentYaw < -180) yaw += 360;

    this.eulersTarget.set(pitch, yaw);
};

OrbitCamera.prototype.lerpAngle = function (a, b, t) {
    let delta = ((b - a + 180) % 360) - 180;
    return a + delta * t;
};

OrbitCamera.prototype.setDistanceLimits = function (min, max) {
    this.minDistance = min;
    this.maxDistance = max;

    this.distanceTarget = pc.math.clamp(this.distanceTarget, min, max);
};


OrbitCamera.prototype.setAmenitiesDistanceByOrientation = function () {
    const isPortrait = window.innerHeight > window.innerWidth;

    if (isPortrait) {
        this.setDistanceLimits(this.amenitiesPortraitMinDistance, this.amenitiesPortraitMaxDistance);
        this.distanceTarget = this.amenitiesPortraitDistance;
    } else {
        this.setDistanceLimits(this.amenitiesLandscapeMinDistance, this.amenitiesLandscapeMaxDistance);
        this.distanceTarget = this.amenitiesLandscapeDistance;
    }
};