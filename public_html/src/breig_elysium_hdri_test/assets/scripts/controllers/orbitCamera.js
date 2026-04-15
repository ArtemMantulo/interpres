const OrbitCamera = pc.createScript('orbitCamera');

OrbitCamera.attributes.add('portraitDistance', { type: 'number', default: 50 });
OrbitCamera.attributes.add('portraitMinDistance', { type: 'number', default: 10 });
OrbitCamera.attributes.add('portraitMaxDistance', { type: 'number', default: 72 });

OrbitCamera.attributes.add('landscapeDistance', { type: 'number', default: 26 });
OrbitCamera.attributes.add('landscapeMinDistance', { type: 'number', default: 5 });
OrbitCamera.attributes.add('landscapeMaxDistance', { type: 'number', default: 34 });

OrbitCamera.attributes.add('amenitiesLandscapeDistance', { type: 'number', default: 8 });
OrbitCamera.attributes.add('amenitiesLandscapeMinDistance', { type: 'number', default: 8 });
OrbitCamera.attributes.add('amenitiesLandscapeMaxDistance', { type: 'number', default: 28 });

OrbitCamera.attributes.add('amenitiesPortraitDistance', { type: 'number', default: 12 });
OrbitCamera.attributes.add('amenitiesPortraitMinDistance', { type: 'number', default: 12 });
OrbitCamera.attributes.add('amenitiesPortraitMaxDistance', { type: 'number', default: 32 });

OrbitCamera.attributes.add('rotationSpeed', { type: 'number', default: 0.3 });
OrbitCamera.attributes.add('zoomSpeed', { type: 'number', default: 0.5 });
OrbitCamera.attributes.add('lerpFactor', { type: 'number', default: 0.05 });
OrbitCamera.attributes.add('minPitch', { type: 'number', default: 20 });
OrbitCamera.attributes.add('maxPitch', { type: 'number', default: 70 });
OrbitCamera.attributes.add('targetPosition', { type: 'vec3', default: [0, 0, 0] });

OrbitCamera.attributes.add('autoRotateSpeed', { type: 'number', default: 7 });
OrbitCamera.attributes.add('autoRotateDelay', { type: 'number', default: 3 });
OrbitCamera.attributes.add('autoRotateMode', { type: 'number', default: 0 });

OrbitCamera.attributes.add('mouseRotationSensitivity', { type: 'number', default: 0.6 });
OrbitCamera.attributes.add('touchRotationSensitivity', { type: 'number', default: 0.6 });
OrbitCamera.attributes.add('mouseZoomSensitivity', { type: 'number', default: 1 });
OrbitCamera.attributes.add('touchZoomSensitivity', { type: 'number', default: 1 });

OrbitCamera.prototype.initialize = function () {
    const target = this.targetPosition || new pc.Vec3(-0.217, 0.204, 0.025);
    this.target = new pc.Vec3(target.x, target.y, target.z);
    this.targetLerp = this.target.clone();

    this.distance = 0;
    this.distanceTarget = 0;

    this.eulers = new pc.Vec2(0, 0);
    this.eulersTarget = this.eulers.clone();

    this.lastInputTime = performance.now();
    this.autoRotateEnabled = true;

    this.resetInteractionState();

    this.lastTouchPosition = new pc.Vec2();

    this.tmpDirection = new pc.Vec3();
    this.lookAtOffset = new pc.Vec3(0, 0, 0);
    this.lookAtOffsetTarget = new pc.Vec3(0, 0, 0);
    this.lookAtVerticalAngleDeg = 0;
    this.lookAtVerticalAngleTarget = 0;
    this._lookAtTarget = new pc.Vec3();
    this._lookDir = new pc.Vec3();
    this._lookRight = new pc.Vec3();
    this._lookUp = new pc.Vec3();
    this._worldUp = new pc.Vec3(0, 1, 0);
    this.smoothAlpha = this.lerpFactor;

    this.onResize = this.adjustDistanceForOrientation.bind(this);
    this.adjustDistanceForOrientation();
    this.syncFromEntity();
    this._initialTarget = this.target.clone();
    this._initialEulers = this.eulers.clone();
    this._initialDistance = this.distance;
    this.bindInput();

    this.movedThisFrame = true;
    this.lastCameraPosition = this.entity.getPosition().clone();
    this.lastCameraRotation = this.entity.getRotation().clone();

    this.inputLocked = false;
    this.savedAutoRotateEnabled = true;
    this.yawConstraintEnabled = false;
    this.yawConstraintCenter = 0;
    this.yawConstraintRange = 180;
    this.pitchLockEnabled = false;
    this.pitchLockValue = 0;
    this.distanceLockStrict = false;

    this.onGalleryOpen = function () {
        this.savedAutoRotateEnabled = this.autoRotateEnabled;
        if (this.autoRotateMode === 0) this.autoRotateEnabled = false;

        this.resetInteractionState();
        this.inputLocked = true;
        this.lastInputTime = performance.now();
    };

    this.onGalleryClose = function () {
        if (this.autoRotateMode === 0) this.autoRotateEnabled = this.savedAutoRotateEnabled;
        this.inputLocked = false;
        this.lastInputTime = performance.now();
    };

    this.onInputLock = function (who) {
        if (who === 'gallery') this.inputLocked = true;
    };
    this.onInputUnlock = function (who) {
        if (who === 'gallery') this.inputLocked = false;
    };

    this.app.on('gallery:open', this.onGalleryOpen, this);
    this.app.on('gallery:close', this.onGalleryClose, this);
    this.app.on('input:lock', this.onInputLock, this);
    this.app.on('input:unlock', this.onInputUnlock, this);
};

OrbitCamera.prototype.isPortrait = function () {
    return window.AppDetect?.isPortraitMobile?.() ?? false;
};

OrbitCamera.prototype.syncFromEntity = function () {
    if (!this.entity || !this.target) return;

    const pos = this.entity.getPosition();
    const dir = new pc.Vec3().sub2(pos, this.target);
    const dist = dir.length();

    if (!isFinite(dist) || dist <= 1e-6) return;

    dir.scale(1 / dist);

    const pitch = Math.asin(dir.y) * pc.math.RAD_TO_DEG;
    const yaw = Math.atan2(dir.x, dir.z) * pc.math.RAD_TO_DEG;

    const clampedPitch = pc.math.clamp(pitch, this.minPitch, this.maxPitch);
    const desiredDist =
        isFinite(this.distanceTarget) && this.distanceTarget > 0 ? this.distanceTarget : dist;
    const clampedDist = pc.math.clamp(
        desiredDist,
        this.minDistance ?? desiredDist,
        this.maxDistance ?? desiredDist
    );

    this.eulers.set(clampedPitch, yaw);
    this.eulersTarget.copy(this.eulers);
    this.distanceTarget = clampedDist;
    this.distance = clampedDist;
};

OrbitCamera.prototype.isUserInteracting = function () {
    return this.isDragging || this.isTouching || this.isPinchZooming;
};

OrbitCamera.prototype.setAutoRotateEnabled = function (enabled) {
    this.autoRotateEnabled = !!enabled;
    this.lastInputTime = performance.now();
};

OrbitCamera.prototype.resetToInitial = function () {
    if (this._initialTarget) {
        this.target.copy(this._initialTarget);
        this.targetLerp.copy(this._initialTarget);
    }
    if (this._initialEulers) {
        this.eulers.copy(this._initialEulers);
        this.eulersTarget.copy(this._initialEulers);
    }
    if (isFinite(this._initialDistance)) {
        this.distance = this._initialDistance;
        this.distanceTarget = this._initialDistance;
    }
    this.setLookAtOffset(0, 0, 0);
    this.setLookAtVerticalAngle(0);
    this.clearYawConstraint();
    this.clearPitchLock();
    this.lastInputTime = performance.now();
};

OrbitCamera.prototype.resetInteractionState = function () {
    this.isDragging = false;
    this.isTouching = false;
    this.isPinchZooming = false;
    this.pinchStartDistance = 0;
    this.pinchStartCameraDistance = this.distanceTarget;
};

OrbitCamera.prototype.applyDistanceProfile = function (desired, min, max) {
    this.distanceLockStrict = false;
    this.minDistance = min;
    this.maxDistance = max;
    this.distanceTarget = pc.math.clamp(desired, min, max);
    this.distance = pc.math.clamp(this.distance, min, max);
};

OrbitCamera.prototype.bindInput = function () {
    const mouse = this.app.mouse;
    const touch = this.app.touch;

    mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
    mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
    mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

    if (touch) {
        touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
        touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
        touch.on(pc.EVENT_TOUCHEND, this.onTouchEnd, this);
    }

    window.addEventListener('resize', this.onResize);
};

OrbitCamera.prototype.unbindInput = function () {
    const mouse = this.app?.mouse;
    const touch = this.app?.touch;

    if (mouse) {
        mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
        mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
        mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
        mouse.off(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);
    }

    if (touch) {
        touch.off(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
        touch.off(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
        touch.off(pc.EVENT_TOUCHEND, this.onTouchEnd, this);
    }

    window.removeEventListener('resize', this.onResize);
};

OrbitCamera.prototype.onMouseDown = function (e) {
    if (this.inputLocked || e.button !== 0) return;
    this.isDragging = true;
    this.lastInputTime = performance.now();
};

OrbitCamera.prototype.onMouseUp = function (e) {
    if (e.button === 0) this.isDragging = false;
};

OrbitCamera.prototype.onMouseMove = function (e) {
    if (this.inputLocked || !this.isDragging) return;
    this.lastInputTime = performance.now();

    const s = this.rotationSpeed * this.mouseRotationSensitivity;

    if (!this.pitchLockEnabled) {
        this.eulersTarget.x = pc.math.clamp(
            this.eulersTarget.x + e.dy * s,
            this.minPitch,
            this.maxPitch
        );
    }
    this.eulersTarget.y -= e.dx * s;
    if (this.yawConstraintEnabled) {
        this.eulersTarget.y = this.clampYawToConstraint(this.eulersTarget.y);
    }
};

OrbitCamera.prototype.onMouseWheel = function (e) {
    if (this.inputLocked) return;
    const evt = e?.event || null;
    const nowTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const blockUntil = Number(window.__apartmentsThumbsWheelBlockUntil || 0);
    if (nowTs < blockUntil) {
        evt?.preventDefault?.();
        return;
    }

    const target = evt?.target;
    if (target && typeof target.closest === 'function') {
        const inThumbs = target.closest(
            '#apartments-expanded-thumbs, .apartments-expanded-thumbs, #apartments-expanded-mobile-slider, .apartments-expanded-mobile-slider'
        );
        if (inThumbs) {
            evt?.preventDefault?.();
            return;
        }
    }

    this.lastInputTime = performance.now();

    this.distanceTarget = pc.math.clamp(
        this.distanceTarget - e.wheel * this.zoomSpeed * this.mouseZoomSensitivity,
        this.minDistance,
        this.maxDistance
    );

    e?.event?.preventDefault?.();
};

OrbitCamera.prototype.onTouchStart = function (e) {
    if (this.inputLocked) return;

    this.isTouching = true;
    this.lastInputTime = performance.now();

    if (e.touches.length === 1) {
        this.isPinchZooming = false;
        this.lastTouchPosition.set(e.touches[0].x, e.touches[0].y);
        return;
    }

    if (e.touches.length === 2) {
        const dx = e.touches[0].x - e.touches[1].x;
        const dy = e.touches[0].y - e.touches[1].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        this.isPinchZooming = true;
        this.pinchStartDistance = dist;
        this.pinchStartCameraDistance = this.distanceTarget;
    }
};

OrbitCamera.prototype.onTouchMove = function (e) {
    if (this.inputLocked) return;
    this.lastInputTime = performance.now();

    if (e.touches.length === 2) {
        const dx = e.touches[0].x - e.touches[1].x;
        const dy = e.touches[0].y - e.touches[1].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const base = this.pinchStartDistance || dist;
        const scale = pc.math.clamp(dist / base, 0.2, 5);

        const zoomFactor = this.zoomSpeed * this.touchZoomSensitivity;
        const desired = this.pinchStartCameraDistance / (1 + (scale - 1) * zoomFactor);
        const clamped = pc.math.clamp(desired, this.minDistance, this.maxDistance);

        this.distanceTarget = clamped;

        if (clamped !== desired) {
            this.pinchStartDistance = dist;
            this.pinchStartCameraDistance = clamped;
        }
        return;
    }

    if (e.touches.length === 1 && !this.isPinchZooming) {
        const t = e.touches[0];
        const dx = t.x - this.lastTouchPosition.x;
        const dy = t.y - this.lastTouchPosition.y;

        if (!this.pitchLockEnabled) {
            this.eulersTarget.x = pc.math.clamp(
                this.eulersTarget.x + dy * this.touchRotationSensitivity,
                this.minPitch,
                this.maxPitch
            );
        }
        this.eulersTarget.y -= dx * this.touchRotationSensitivity;
        if (this.yawConstraintEnabled) {
            this.eulersTarget.y = this.clampYawToConstraint(this.eulersTarget.y);
        }
        this.lastTouchPosition.set(t.x, t.y);
    }
};

OrbitCamera.prototype.onTouchEnd = function (e) {
    if (e.touches.length === 0) {
        this.resetInteractionState();
        return;
    }

    if (e.touches.length === 1 && this.isPinchZooming) {
        this.isPinchZooming = false;
        this.lastTouchPosition.set(e.touches[0].x, e.touches[0].y);
    }
};

OrbitCamera.prototype.update = function (dt) {
    if (document.hidden) return;
    const now = performance.now();
    const idle = (now - this.lastInputTime) * 0.001;

    if (this.autoRotateEnabled && this.autoRotateMode === 0 && idle > this.autoRotateDelay) {
        this.eulersTarget.y -= this.autoRotateSpeed * dt;
    }

    const safeDt = Math.min(Math.max(dt, 0), 0.25);
    this.smoothAlpha = 1 - Math.pow(1 - this.lerpFactor, safeDt * 60);

    this.updateRotationAndZoom();
    this.updatePosition();

    const p = this.entity.getPosition();
    const r = this.entity.getRotation();

    const dx = p.x - this.lastCameraPosition.x;
    const dy = p.y - this.lastCameraPosition.y;
    const dz = p.z - this.lastCameraPosition.z;

    const movedPos = dx * dx + dy * dy + dz * dz > 1e-10;
    const dot = Math.abs(
        r.x * this.lastCameraRotation.x +
            r.y * this.lastCameraRotation.y +
            r.z * this.lastCameraRotation.z +
            r.w * this.lastCameraRotation.w
    );
    const movedRot = 1 - dot > 1e-7;

    this.movedThisFrame = movedPos || movedRot;
    if (this.movedThisFrame) {
        this.lastCameraPosition.copy(p);
        this.lastCameraRotation.copy(r);
    }
};

OrbitCamera.prototype.updateRotationAndZoom = function () {
    const a = this.smoothAlpha;
    this.applyInteractionConstraints();
    this.eulers.x += (this.eulersTarget.x - this.eulers.x) * a;
    this.eulers.y = this.lerpAngle(this.eulers.y, this.eulersTarget.y, a);
    this.distance += (this.distanceTarget - this.distance) * a;
    this.lookAtOffset.lerp(this.lookAtOffset, this.lookAtOffsetTarget, a);
    this.lookAtVerticalAngleDeg += (this.lookAtVerticalAngleTarget - this.lookAtVerticalAngleDeg) * a;
    this.applyInteractionConstraints();
};

OrbitCamera.prototype.updatePosition = function () {
    const pitch = this.eulers.x * pc.math.DEG_TO_RAD;
    const yaw = this.eulers.y * pc.math.DEG_TO_RAD;

    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);

    const x = this.distance * cp * Math.sin(yaw);
    const y = this.distance * sp;
    const z = this.distance * cp * Math.cos(yaw);

    this.target.lerp(this.target, this.targetLerp, this.smoothAlpha);
    this.entity.setPosition(this.target.x + x, this.target.y + y, this.target.z + z);
    this._lookAtTarget.copy(this.target).add(this.lookAtOffset);

    const verticalAngleDeg = isFinite(this.lookAtVerticalAngleDeg) ? this.lookAtVerticalAngleDeg : 0;
    if (Math.abs(verticalAngleDeg) > 1e-4) {
        const lookDir = this._lookDir.sub2(this._lookAtTarget, this.entity.getPosition());
        const lookDist = lookDir.length();
        if (lookDist > 1e-6) {
            lookDir.scale(1 / lookDist);

            const lookRight = this._lookRight.cross(this._worldUp, lookDir);
            const rightLen = lookRight.length();
            if (rightLen > 1e-6) lookRight.scale(1 / rightLen);
            else lookRight.set(1, 0, 0);

            const lookUp = this._lookUp.cross(lookDir, lookRight);
            const upLen = lookUp.length();
            if (upLen > 1e-6) {
                lookUp.scale(1 / upLen);
                const upOffset = Math.tan(verticalAngleDeg * pc.math.DEG_TO_RAD) * lookDist;
                this._lookAtTarget.add(lookUp.scale(upOffset));
            }
        }
    }

    this.entity.lookAt(this._lookAtTarget);
};

OrbitCamera.prototype.setLookAtOffset = function (x, y, z) {
    if (x && typeof x === 'object') {
        this.lookAtOffsetTarget.set(x.x || 0, x.y || 0, x.z || 0);
    } else {
        this.lookAtOffsetTarget.set(x || 0, y || 0, z || 0);
    }
};

OrbitCamera.prototype.setLookAtVerticalAngle = function (deg) {
    const v = Number(deg);
    this.lookAtVerticalAngleTarget = isFinite(v) ? v : 0;
};

OrbitCamera.prototype.adjustDistanceForOrientation = function () {
    if (this.distanceLockStrict) {
        const lockMin = this.minDistance;
        const lockMax = this.maxDistance;
        this.distanceTarget = pc.math.clamp(this.distanceTarget, lockMin, lockMax);
        this.distance = pc.math.clamp(this.distance, lockMin, lockMax);
        return;
    }

    if (this.isPortrait())
        this.applyDistanceProfile(
            this.portraitDistance,
            this.portraitMinDistance,
            this.portraitMaxDistance
        );
    else
        this.applyDistanceProfile(
            this.landscapeDistance,
            this.landscapeMinDistance,
            this.landscapeMaxDistance
        );
};

OrbitCamera.prototype.focusOn = function (pos, dist) {
    this.targetLerp.copy(pos);
    if (dist !== undefined)
        this.distanceTarget = pc.math.clamp(dist, this.minDistance, this.maxDistance);
    this.lastInputTime = performance.now();
};

OrbitCamera.prototype.lookAtPointSmoothly = function (point) {
    const dir = this.tmpDirection.sub2(point, this.entity.getPosition()).normalize();

    let yaw = Math.atan2(-dir.x, -dir.z) * pc.math.RAD_TO_DEG;
    let pitch = Math.asin(dir.y) * pc.math.RAD_TO_DEG;

    pitch = pc.math.clamp(pitch, this.minPitch, this.maxPitch);
    if (this.pitchLockEnabled) pitch = this.pitchLockValue;

    const cy = this.eulers.y;
    while (yaw - cy > 180) yaw -= 360;
    while (yaw - cy < -180) yaw += 360;
    yaw = this.clampYawToConstraint(yaw);

    this.eulersTarget.set(pitch, yaw);
};

OrbitCamera.prototype.normalizeAngle = function (deg) {
    return ((((deg % 360) + 540) % 360) - 180);
};

OrbitCamera.prototype.clampYawToConstraint = function (yaw) {
    if (!this.yawConstraintEnabled) return yaw;
    const delta = this.normalizeAngle(yaw - this.yawConstraintCenter);
    const clamped = pc.math.clamp(delta, -this.yawConstraintRange, this.yawConstraintRange);
    return this.yawConstraintCenter + clamped;
};

OrbitCamera.prototype.applyInteractionConstraints = function () {
    if (this.pitchLockEnabled) {
        this.eulersTarget.x = this.pitchLockValue;
    }
    if (this.yawConstraintEnabled) {
        this.eulersTarget.y = this.clampYawToConstraint(this.eulersTarget.y);
    }
};

OrbitCamera.prototype.setYawConstraint = function (centerDeg, rangeDeg) {
    const center = Number(centerDeg);
    const range = Math.abs(Number(rangeDeg));
    if (!isFinite(center) || !isFinite(range) || range <= 0) {
        this.clearYawConstraint();
        return;
    }
    this.yawConstraintEnabled = true;
    this.yawConstraintCenter = center;
    this.yawConstraintRange = range;
    this.applyInteractionConstraints();
};

OrbitCamera.prototype.clearYawConstraint = function () {
    this.yawConstraintEnabled = false;
    this.yawConstraintCenter = 0;
    this.yawConstraintRange = 180;
};

OrbitCamera.prototype.setPitchLock = function (pitchDeg) {
    const pitch = Number(pitchDeg);
    if (!isFinite(pitch)) {
        this.clearPitchLock();
        return;
    }
    this.pitchLockEnabled = true;
    this.pitchLockValue = pitch;
    this.applyInteractionConstraints();
};

OrbitCamera.prototype.clearPitchLock = function () {
    this.pitchLockEnabled = false;
};

OrbitCamera.prototype.lerpAngle = function (a, b, t) {
    const d = ((((b - a) % 360) + 540) % 360) - 180;
    return a + d * t;
};

OrbitCamera.prototype.setDistanceLimits = function (min, max, snapCurrent = true) {
    this.minDistance = min;
    this.maxDistance = max;
    this.distanceLockStrict = Math.abs((Number(max) || 0) - (Number(min) || 0)) <= 1e-6;
    this.distanceTarget = pc.math.clamp(this.distanceTarget, min, max);
    if (snapCurrent) {
        this.distance = pc.math.clamp(this.distance, min, max);
    }
};

OrbitCamera.prototype.clearDistanceLock = function () {
    this.distanceLockStrict = false;
};

OrbitCamera.prototype.setAmenitiesDistanceByOrientation = function () {
    if (this.isPortrait())
        this.applyDistanceProfile(
            this.amenitiesPortraitDistance,
            this.amenitiesPortraitMinDistance,
            this.amenitiesPortraitMaxDistance
        );
    else
        this.applyDistanceProfile(
            this.amenitiesLandscapeDistance,
            this.amenitiesLandscapeMinDistance,
            this.amenitiesLandscapeMaxDistance
        );
};

OrbitCamera.prototype.onDestroy = function () {
    this.unbindInput();

    this.app.off('gallery:open', this.onGalleryOpen, this);
    this.app.off('gallery:close', this.onGalleryClose, this);
    this.app.off('input:lock', this.onInputLock, this);
    this.app.off('input:unlock', this.onInputUnlock, this);

    this.onGalleryOpen =
        this.onGalleryClose =
        this.onInputLock =
        this.onInputUnlock =
        this.onResize =
            null;
    this._initialTarget = null;
    this._initialEulers = null;
    this.lookAtOffset = null;
    this.lookAtVerticalAngleDeg = 0;
    this.yawConstraintEnabled = false;
    this.pitchLockEnabled = false;
    this._lookAtTarget = null;
    this._lookDir = null;
    this._lookRight = null;
    this._lookUp = null;
    this._worldUp = null;
};
