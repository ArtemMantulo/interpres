var FollowCamera = pc.createScript('followCamera');

FollowCamera.attributes.add('targetEntity', { type: 'entity' });
FollowCamera.attributes.add('distance', { type: 'number', default: 9 });
FollowCamera.attributes.add('pitchAngle', { type: 'number', default: 30 });
FollowCamera.attributes.add('yawAngle', { type: 'number', default: 30 });
FollowCamera.attributes.add('lerpSpeed', { type: 'number', default: 4 });
FollowCamera.attributes.add('lookLerpSpeed', { type: 'number', default: 3 });
FollowCamera.attributes.add('minPitch', { type: 'number', default: 20 });
FollowCamera.attributes.add('maxPitch', { type: 'number', default: 55 });
FollowCamera.attributes.add('minZoom', { type: 'number', default: 4 });
FollowCamera.attributes.add('maxZoom', { type: 'number', default: 16 });

FollowCamera.prototype.initialize = function () {
    this.touchMode = 'none';
    this.ignorePinch = false;
    this.ignorePinch = false;
    const player = this.app.root.findByTag && this.app.root.findByTag('Point');
    if (player && player.length) this.targetEntity = player[0];
    this.currentPosition = this.entity.getPosition().clone();
    this.currentLookAt = this.targetEntity.getPosition().clone();

    if (this.app.touch) {
        if (window.innerHeight > window.innerWidth) {
            this.distance = 8;
        } else {
            this.distance = 7;
        }
    }

    this.isDragging = false;
    this.lastTouchPos = new pc.Vec2();
    this.pinchStartDist = 0;

    this.minDistance = this.minZoom;
    this.maxDistance = this.maxZoom;
    
    this.onMouseDown = (e) => {
        this.isDragging = true;
        this.lastTouchPos.set(e.x, e.y);
    };

    this.onMouseMove = (e) => {
        if (!this.isDragging) return;
        const dx = e.x - this.lastTouchPos.x;
        const dy = e.y - this.lastTouchPos.y;

        this.yawAngle -= dx * 0.2;
        this.pitchAngle += dy * 0.2;
        this.pitchAngle = pc.math.clamp(this.pitchAngle, this.minPitch, this.maxPitch);

        this.lastTouchPos.set(e.x, e.y);
    };

    this.onMouseUp = () => {
        this.isDragging = false;
    };

    this.onMouseWheel = (e) => {
        this.distance = pc.math.clamp(this.distance - e.wheel * 0.1, this.minDistance, this.maxDistance);
    };

    if (this.app.mouse) {
        this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
        this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
        this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
        this.app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);
    }

    if (this.app.touch) {
        this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
        this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
        this.app.touch.on(pc.EVENT_TOUCHEND, this.onTouchEnd, this);
    }

};

FollowCamera.prototype.onTouchStart = function (e) {
    this.touchMode = 'none';
    this.ignorePinch = false;

    if (e.touches.length === 1) {
        this.touchMode = 'rotate';
        this.lastTouchPos.set(e.touches[0].x, e.touches[0].y);
    }

    if (e.touches.length === 2) {
        for (let i = 0; i < 2; i++) {
            const el = document.elementFromPoint(e.touches[i].x, e.touches[i].y);
            if (el && el.closest && el.closest('#joystick')) {
                this.ignorePinch = true;
                return;
            }
        }
        this.touchMode = 'zoom';
        const dx = e.touches[0].x - e.touches[1].x;
        const dy = e.touches[0].y - e.touches[1].y;
        this.pinchStartDist = Math.sqrt(dx * dx + dy * dy);
    }
};


FollowCamera.prototype.onTouchMove = function (e) {
    if (this.touchMode === 'rotate' && e.touches.length === 1) {
        const dx = e.touches[0].x - this.lastTouchPos.x;
        const dy = e.touches[0].y - this.lastTouchPos.y;

        this.yawAngle -= dx * 0.6;
        this.pitchAngle += dy * 0.6;
        this.pitchAngle = pc.math.clamp(this.pitchAngle, this.minPitch, this.maxPitch);

        this.lastTouchPos.set(e.touches[0].x, e.touches[0].y);
    } else if (this.touchMode === 'zoom' && e.touches.length === 2 && !this.ignorePinch) {
        const dx = e.touches[0].x - e.touches[1].x;
        const dy = e.touches[0].y - e.touches[1].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const zoomDelta = (this.pinchStartDist - dist) * 0.02;
        this.distance = pc.math.clamp(this.distance + zoomDelta, this.minDistance, this.maxDistance);
        this.pinchStartDist = dist;
    }
};


FollowCamera.prototype.onTouchEnd = function (e) {
    if (e.touches.length === 0) {
        this.touchMode = 'none';
    }
};

FollowCamera.prototype.update = function (dt) {
    if (!this.targetEntity) return;

    const targetPos = this.targetEntity.getPosition();

    const yawRad = pc.math.DEG_TO_RAD * this.yawAngle;
    const pitchRad = pc.math.DEG_TO_RAD * this.pitchAngle;

    const offset = new pc.Vec3(
        Math.sin(yawRad) * Math.cos(pitchRad),
        Math.sin(pitchRad),
        Math.cos(yawRad) * Math.cos(pitchRad)
    ).scale(this.distance);

    const desiredPos = targetPos.clone().add(offset);

    this.currentPosition.lerp(this.currentPosition, desiredPos, this.lerpSpeed * dt);
    this.entity.setPosition(this.currentPosition);

    this.currentLookAt.lerp(this.currentLookAt, targetPos, this.lookLerpSpeed * dt);
    this.entity.lookAt(this.currentLookAt);
};