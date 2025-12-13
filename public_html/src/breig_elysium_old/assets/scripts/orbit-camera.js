var OrbitCamera = pc.createScript('orbitCamera');

// Настройки
OrbitCamera.attributes.add('focusEntity', { type: 'entity', title: 'Target For Camera'});
OrbitCamera.attributes.add('defaultDistance', { type: 'number', default: 5, title: 'Default Distance'});
OrbitCamera.attributes.add('distanceMax', { type: 'number', default: 0, title: 'Max Distance'});
OrbitCamera.attributes.add('distanceMin', { type: 'number', default: 0, title: 'Min Distance'});
OrbitCamera.attributes.add('zoomLerpSpeed', { type: 'number', default: 5, title: 'Distance Speed'});
OrbitCamera.attributes.add('inertiaFactor', { type: 'number', default: 0, title: 'Inertia'});

// Новые настройки
OrbitCamera.attributes.add('enablePitchLimits', { type: 'boolean', default: true, title: 'Pitch Limits'});
OrbitCamera.attributes.add('pitchMax', { type: 'number', default: 45, title: 'Max Pitch'});
OrbitCamera.attributes.add('pitchMin', { type: 'number', default: -45, title: 'Min Pitch'});
OrbitCamera.attributes.add('rotationLerpSpeed', { type: 'number', default: 5, title: 'Rotation Speed'});
OrbitCamera.attributes.add('autoRotate', { type: 'boolean', default: false, title: 'Autorotate'});
OrbitCamera.attributes.add('autoRotateSpeed', { type: 'number', default: 10, title: 'Autorotate Speed'});
OrbitCamera.attributes.add('autoRotateDelay', { type: 'number', default: 3, title: 'Autorotate Delay'}); // Не используется

OrbitCamera.attributes.add('autoRender', { type: 'boolean', default: true });
OrbitCamera.attributes.add('frameOnStart', { type: 'boolean', default: true });

Object.defineProperty(OrbitCamera.prototype, "distance", {
    get: function () { return this._targetDistance; },
    set: function (value) { this._targetDistance = this._clampDistance(value); }
});

Object.defineProperty(OrbitCamera.prototype, "pitch", {
    get: function () { return this._targetPitch; },
    set: function (value) { this._targetPitch = this._clampPitchAngle(value); }
});

Object.defineProperty(OrbitCamera.prototype, "yaw", {
    get: function () { return this._targetYaw; },
    set: function (value) {
        var diff = value - this._yaw;
        var r = diff % 360;
        this._targetYaw = (r > 180) ? this._yaw - (360 - r) :
                          (r < -180) ? this._yaw + (360 + r) :
                          this._yaw + r;
    }
});

Object.defineProperty(OrbitCamera.prototype, "pivotPoint", {
    get: function () { return this._pivotPoint; },
    set: function (value) { this._pivotPoint.copy(value); }
});

OrbitCamera.prototype.focus = function (focusEntity) {
    var modelsAdded = this._buildAabb(focusEntity, 0);

    if (modelsAdded === 0) {
        this._pivotPoint.copy(focusEntity.getPosition());
        this.distance = this.defaultDistance;
    } else {
        var halfExtents = this._modelsAabb.halfExtents;
        var distance = Math.max(halfExtents.x, halfExtents.y, halfExtents.z);
        distance = (distance / Math.tan(0.5 * this.entity.camera.fov * pc.math.DEG_TO_RAD)) * 2;
        this.distance = distance;
        this._pivotPoint.copy(this._modelsAabb.center);
    }

    this._removeInertia();
};

OrbitCamera.prototype.resetAndLookAtPoint = function (resetPoint, lookAtPoint) {
    this.pivotPoint.copy(lookAtPoint);
    this.entity.setPosition(resetPoint);
    this.entity.lookAt(lookAtPoint);

    var dist = new pc.Vec3().sub2(lookAtPoint, resetPoint);
    this.distance = dist.length();
    this.pivotPoint.copy(lookAtPoint);

    var q = this.entity.getRotation();
    this.yaw = this._calcYaw(q);
    this.pitch = this._calcPitch(q, this.yaw);

    this._removeInertia();
    this._updatePosition();

    if (!this.autoRender) this.app.renderNextFrame = true;
};

OrbitCamera.prototype.resetAndLookAtEntity = function (resetPoint, entity) {
    this._buildAabb(entity, 0);
    this.resetAndLookAtPoint(resetPoint, this._modelsAabb.center);
};

OrbitCamera.prototype.reset = function (yaw, pitch, distance) {
    this.pitch = pitch;
    this.yaw = yaw;
    this.distance = distance;
    this._removeInertia();

    if (!this.autoRender) this.app.renderNextFrame = true;
};

OrbitCamera.prototype.initialize = function () {
    this.userInputEnabled = true;

    this._checkAspectRatio();
    this._autoRotateTimer = 0;

    this._autoRotateTimer = this.autoRotate ? this.autoRotateDelay : 0;
    this._ignoreAutoRotateDelayOnce = true;


    this._modelsAabb = new pc.BoundingBox();
    this._buildAabb(this.focusEntity || this.app.root, 0);
    this.entity.lookAt(this._modelsAabb.center);

    this._pivotPoint = this._modelsAabb.center.clone();
    this._lastFramePivotPoint = this._pivotPoint.clone();

    var q = this.entity.getRotation();
    this._yaw = this._calcYaw(q);
    this._pitch = this._clampPitchAngle(this._calcPitch(q, this._yaw));
    this.entity.setLocalEulerAngles(this._pitch, this._yaw, 0);

    var distVec = new pc.Vec3().sub2(this.entity.getPosition(), this._pivotPoint);
    this._distance = this._clampDistance(distVec.length());

    this._targetYaw = this._yaw;
    this._targetPitch = this._pitch;
    this._targetDistance = this._distance;

    this._userInteracting = false;

    this._autoRenderDefault = this.app.autoRender;
    if (this.app.autoRender) this.app.autoRender = this.autoRender;
    if (!this.autoRender) this.app.renderNextFrame = true;

    if (this.frameOnStart) this.focus(this.focusEntity || this.app.root);

    this._bindUserInputEvents();

    this.app.graphicsDevice.on('resizecanvas', this._checkAspectRatio, this);
    this.on('destroy', function () {
        this.app.graphicsDevice.off('resizecanvas', this._checkAspectRatio, this);
        this.app.autoRender = this._autoRenderDefault;
    }, this);
};

OrbitCamera.prototype._bindUserInputEvents = function () {
    const app = this.app;

    const onStart = (event) => {
        if (!this.userInputEnabled) return;
        if (!event.button || event.button === pc.MOUSEBUTTON_LEFT) {
            this._userInteracting = true;
            this._autoRotateTimer = 0;
            this._ignoreAutoRotateDelayOnce = false;
        }
    };

    const onEnd = () => {
        if (!this.userInputEnabled) return;
        this._userInteracting = false;
    };

    if (app.mouse) {
        app.mouse.on(pc.EVENT_MOUSEDOWN, onStart, this);
        app.mouse.on(pc.EVENT_MOUSEUP, onEnd, this);
    }

    if (app.touch) {
        app.touch.on(pc.EVENT_TOUCHSTART, onStart, this);
        app.touch.on(pc.EVENT_TOUCHEND, onEnd, this);
        app.touch.on(pc.EVENT_TOUCHCANCEL, onEnd, this);
    }

    this.on('destroy', function () {
        if (app.mouse) {
            app.mouse.off(pc.EVENT_MOUSEDOWN, onStart, this);
            app.mouse.off(pc.EVENT_MOUSEUP, onEnd, this);
        }
        if (app.touch) {
            app.touch.off(pc.EVENT_TOUCHSTART, onStart, this);
            app.touch.off(pc.EVENT_TOUCHEND, onEnd, this);
            app.touch.off(pc.EVENT_TOUCHCANCEL, onEnd, this);
        }
    }, this);
};


OrbitCamera.prototype.update = function (dt) {
    if (this.autoRotate && !this._userInteracting) {
        if (this._ignoreAutoRotateDelayOnce) {
            this._targetYaw += this.autoRotateSpeed * dt;
        } else {
            this._autoRotateTimer += dt;
            if (this._autoRotateTimer >= this.autoRotateDelay) {
                this._targetYaw += this.autoRotateSpeed * dt;
            }
        }
    }


    if (!this.autoRender) {
        var d = Math.abs(this._targetDistance - this._distance);
        var y = Math.abs(this._targetYaw - this._yaw);
        var p = Math.abs(this._targetPitch - this._pitch);
        var pp = this._lastFramePivotPoint.distance(this._pivotPoint);
        this.app.renderNextFrame = this.app.renderNextFrame || (d > 0.01 || y > 0.01 || p > 0.01 || pp > 0);
    }

    var tRot = pc.math.clamp(dt * this.rotationLerpSpeed, 0, 1);
    var tZoom = pc.math.clamp(dt * this.zoomLerpSpeed, 0, 1);

    if (!this.userInputEnabled) {
        //this._targetYaw = this._yaw;
        //this._targetPitch = this._pitch;
        //this._targetDistance = this._distance;
    }

    this._yaw = pc.math.lerp(this._yaw, this._targetYaw, tRot);
    this._pitch = pc.math.lerp(this._pitch, this._targetPitch, tRot);
    this._distance = pc.math.lerp(this._distance, this._targetDistance, tZoom);

    this._lastFramePivotPoint.copy(this._pivotPoint);
    this._updatePosition();
};

OrbitCamera.prototype.enableAutoRotate = function (enabled) {
    this.autoRotate = enabled;
    this._autoRotateTimer = 0;
};

OrbitCamera.prototype._updatePosition = function () {
    this.entity.setLocalPosition(0, 0, 0);
    this.entity.setLocalEulerAngles(this._pitch, this._yaw, 0);

    var pos = this.entity.getPosition();
    pos.copy(this.entity.forward).scale(-this._distance).add(this.pivotPoint);
    this.entity.setPosition(pos);
};

OrbitCamera.prototype._removeInertia = function () {
    this._yaw = this._targetYaw;
    this._pitch = this._targetPitch;
    this._distance = this._targetDistance;
};

OrbitCamera.prototype._checkAspectRatio = function () {
    this.entity.camera.horizontalFov = this.app.graphicsDevice.height > this.app.graphicsDevice.width;
};

OrbitCamera.prototype._buildAabb = function (entity, modelsAdded) {
    if (entity.render && Array.isArray(entity.render.meshInstances)) {
        const meshes = entity.render.meshInstances;
        for (let i = 0; i < meshes.length; i++) {
            if (modelsAdded === 0) {
                this._modelsAabb.copy(meshes[i].aabb);
            } else {
                this._modelsAabb.add(meshes[i].aabb);
            }
            modelsAdded++;
        }
    }

    if (entity.model && Array.isArray(entity.model.meshInstances)) {
        const meshes = entity.model.meshInstances;
        for (let i = 0; i < meshes.length; i++) {
            if (modelsAdded === 0) {
                this._modelsAabb.copy(meshes[i].aabb);
            } else {
                this._modelsAabb.add(meshes[i].aabb);
            }
            modelsAdded++;
        }
    }

    for (let i = 0; i < entity.children.length; i++) {
        modelsAdded = this._buildAabb(entity.children[i], modelsAdded);
    }

    return modelsAdded;
};

OrbitCamera.prototype._clampDistance = function (distance) {
    return (this.distanceMax > 0)
        ? pc.math.clamp(distance, this.distanceMin, this.distanceMax)
        : Math.max(distance, this.distanceMin);
};

OrbitCamera.prototype._clampPitchAngle = function (pitch) {
    if (this.enablePitchLimits)
        return pc.math.clamp(pitch, -this.pitchMax, -this.pitchMin);
    return pitch;
};

OrbitCamera.prototype._calcYaw = function (quat) {
    var f = new pc.Vec3();
    quat.transformVector(pc.Vec3.FORWARD, f);
    return Math.atan2(-f.x, -f.z) * pc.math.RAD_TO_DEG;
};

OrbitCamera.prototype._calcPitch = function (quat, yaw) {
    var offset = new pc.Quat();
    var q = new pc.Quat();
    offset.setFromEulerAngles(0, -yaw, 0);
    q.mul2(offset, quat);

    var f = new pc.Vec3();
    q.transformVector(pc.Vec3.FORWARD, f);
    return Math.atan2(f.y, -f.z) * pc.math.RAD_TO_DEG;
};
