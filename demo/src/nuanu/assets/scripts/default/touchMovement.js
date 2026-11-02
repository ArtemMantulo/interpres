var TouchMovement = pc.createScript('touchMovement');

TouchMovement.attributes.add('moveSpeed',         { type: 'number', default: 1.15 });
TouchMovement.attributes.add('runSpeed',          { type: 'number', default: 3.4 });
TouchMovement.attributes.add('turnSpeed',         { type: 'number', default: 20 });
TouchMovement.attributes.add('jumpControlDelay',  { type: 'number', default: 2.5 });
TouchMovement.attributes.add('jumpWalkLockDelay', { type: 'number', default: 1.0 });
TouchMovement.attributes.add('animEntity',        { type: 'entity' });

TouchMovement.prototype.initialize = function () {
    this.cameraEntity = this.app.root.findByName('Camera');
    if (!this.cameraEntity) console.warn('[touchMovement] Camera entity not found');

    this.inputLocked  = true;
    this.wasMoving    = false;
    this.isJumping    = false;
    this.velocity     = new pc.Vec3();
    this.moveVelocity = new pc.Vec3();

    this._activeTouchId = null;
    this._mouseDown     = false;

    if (!this.entity.rigidbody) {
        console.warn('[touchMovement] entity has no rigidbody');
    }

    window.joystickInput = window.joystickInput || { x: 0, y: 0 };

    setTimeout(() => {
        const goButton     = document.getElementById('go-button');
        const taskComplete = document.getElementById('task-complete');
        if (!goButton) { console.warn('[touchMovement] #go-button not found'); return; }
        goButton.addEventListener('click', () => {
            goButton.style.display = 'none';
            if (taskComplete) taskComplete.style.display = 'flex';
            this._ensureMobileUI();
            this.inputLocked = false;
        }, { once: true });
    }, 0);

    this.on('destroy', this._destroy, this);
};

TouchMovement.prototype.update = function (dt) {
    if (!this.entity.rigidbody) return;

    let jx = 0, jy = 0;
    if (!this.inputLocked && window.joystickInput) {
        jx = window.joystickInput.x;
        jy = window.joystickInput.y;
    }

    var inputWorld = new pc.Vec3();
    const hasInput = (Math.abs(jx) > 1e-3 || Math.abs(jy) > 1e-3);
    if (hasInput && this.cameraEntity) {
        const camQ = this.cameraEntity.getRotation();
        const forward = camQ.transformVector(new pc.Vec3(0, 0, -1));
        const right   = camQ.transformVector(new pc.Vec3(1, 0,  0));
        forward.y = 0; right.y = 0; forward.normalize(); right.normalize();
        inputWorld.copy( right.mulScalar(jx).add(forward.mulScalar(jy)) );
    }

    const moving    = inputWorld.lengthSq() > 0;
    const runActive = (!this.inputLocked) && (Math.hypot(jx, jy) > 0.7);
    const targetSpd = runActive ? this.runSpeed : this.moveSpeed;

    this.velocity.copy(inputWorld);

    const currentY  = this.entity.rigidbody.linearVelocity.y;
    const targetVel = moving ? inputWorld.normalize().scale(targetSpd) : pc.Vec3.ZERO;
    const lerpK     = this.isJumping ? 1.0 : 10.0;

    this.moveVelocity.lerp(this.moveVelocity, targetVel, dt * lerpK);
    this.entity.rigidbody.linearVelocity = new pc.Vec3(
        this.moveVelocity.x, currentY, this.moveVelocity.z
    );

    if (moving && !this.inputLocked && this.animEntity) {
        const dir = this.velocity.clone().normalize();
        const angleRad = Math.atan2(dir.x, dir.z);
        const targetRot = new pc.Quat().setFromEulerAngles(0, pc.math.RAD_TO_DEG * angleRad, 0);
        const current   = this.animEntity.getRotation().clone();
        const t = Math.min(1, this.turnSpeed * dt);
        current.slerp(current, targetRot, t);
        this.animEntity.setRotation(current);
    }

    if (this.animEntity && this.animEntity.anim) {
        if (!this.inputLocked) {
            this.animEntity.anim.setBoolean('Walk', moving);
            this.animEntity.anim.setBoolean('Run',  moving && runActive);
        }
        if (!moving && this.wasMoving && !this.inputLocked) {
            var r = (Math.random() * 3 | 0) + 1;
            this.animEntity.anim.setTrigger('Idle' + r + 'Trigger');
        }
    }

    this.wasMoving = moving;
};

TouchMovement.prototype.tryJump = function () {
    if (this.inputLocked || this.isJumping || !this.animEntity || !this.animEntity.anim) return;
    const moving = this.velocity.lengthSq() > 0;
    this.isJumping = true;
    if (moving) {
        this.animEntity.anim.setTrigger('JumpWalk');
        this.inputLocked = true;
        setTimeout(() => { this.inputLocked = false; this.isJumping = false; }, this.jumpWalkLockDelay * 1000);
    } else {
        var r = (Math.random() * 3 | 0) + 1;
        this.animEntity.anim.setTrigger('Idle' + r + 'Trigger');
        this.animEntity.anim.setTrigger('JumpIdle');
        this.inputLocked = true;
        setTimeout(() => { this.inputLocked = false; this.isJumping = false; }, this.jumpControlDelay * 1000);
    }
};

TouchMovement.prototype._ensureMobileUI = function () {
    let base = document.getElementById('joystick');
    let knob = document.getElementById('joystick-inner');

    if (!base) {
        base = document.createElement('div'); base.id = 'joystick';
        document.body.appendChild(base);
    }
    if (!knob) {
        knob = document.createElement('div');
        knob.id = 'joystick-inner';
        base.appendChild(knob);
    }

    base.style.touchAction = 'none';
    knob.style.touchAction = 'none';

    if (!document.getElementById('jump-button')) {
        const btn = document.createElement('button');
        btn.id = 'jump-button'; btn.textContent = 'JUMP';
        document.body.appendChild(btn);
    }

    this.base = base; this.knob = knob;
    this._bindDomEvents();
    this._updateMetrics();
    this._resetKnob();

    const actionButton = document.getElementById('jump-button');
    if (actionButton) {
        const onPress = () => this.tryJump();
        this._unbindAction = () => {
            actionButton.removeEventListener('click', onPress);
            actionButton.removeEventListener('touchstart', onPress);
        };
        actionButton.addEventListener('click', onPress);
        actionButton.addEventListener('touchstart', onPress, { passive: true });
    }
};

TouchMovement.prototype._bindDomEvents = function () {
    this._onTouchStart = this._handleTouchStart.bind(this);
    this._onTouchMove  = this._handleTouchMove.bind(this);
    this._onTouchEnd   = this._handleTouchEnd.bind(this);
    this.base.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.base.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
    this.base.addEventListener('touchend',   this._onTouchEnd,   { passive: false });
    this.base.addEventListener('touchcancel',this._onTouchEnd,   { passive: false });

    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp   = this._handleMouseUp.bind(this);
    this.base.addEventListener('mousedown', this._onMouseDown, { passive: false });
    window.addEventListener('mousemove',    this._onMouseMove, { passive: false });
    window.addEventListener('mouseup',      this._onMouseUp,   { passive: false });

    this._onLayoutChange = this._handleLayoutChange.bind(this);
    window.addEventListener('resize',            this._onLayoutChange);
    window.addEventListener('orientationchange', this._onLayoutChange);
    window.addEventListener('scroll',            this._onLayoutChange, { passive: true });
};

TouchMovement.prototype._updateMetrics = function () {
    this._rect = this.base.getBoundingClientRect();
    const radius = Math.min(this.base.clientWidth, this.base.clientHeight) * 0.5;
    this._radius = radius;
    const rpx = (this.knob.offsetWidth || this.knob.clientWidth || 0) * 0.5;
    this._knobRadius = rpx || 0;
};

TouchMovement.prototype._setKnobLocal = function (nx, ny) {
    const max = Math.max(0, this._radius - this._knobRadius);
    const cx = this.base.clientWidth * 0.5;
    const cy = this.base.clientHeight * 0.5;
    this.knob.style.left = (cx + nx * max - this._knobRadius) + 'px';
    this.knob.style.top  = (cy + ny * max - this._knobRadius) + 'px';
};

TouchMovement.prototype._resetKnob = function () {
    this._updateMetrics();
    window.joystickInput.x = 0;
    window.joystickInput.y = 0;
    const cx = this.base.clientWidth * 0.5 - this._knobRadius;
    const cy = this.base.clientHeight * 0.5 - this._knobRadius;
    this.knob.style.left = cx + 'px';
    this.knob.style.top  = cy + 'px';
};

TouchMovement.prototype._applyInputFromPoint = function (clientX, clientY) {
    const lx = clientX - this._rect.left;
    const ly = clientY - this._rect.top;
    const cx = this.base.clientWidth  * 0.5;
    const cy = this.base.clientHeight * 0.5;
    let dx = lx - cx, dy = ly - cy;

    const max = Math.max(0, this._radius - this._knobRadius);
    const len = Math.hypot(dx, dy);
    if (len > max && len > 0) { const k = max / len; dx *= k; dy *= k; }

    const nx = max > 0 ? dx / max : 0;
    const ny = max > 0 ? dy / max : 0;

    window.joystickInput.x = nx;
    window.joystickInput.y = -ny;

    this._setKnobLocal(nx, ny);
};

TouchMovement.prototype._handleTouchStart = function (e) {
    if (this._activeTouchId !== null) return;
    this._updateMetrics();
    const t = e.changedTouches[0];
    this._activeTouchId = t.identifier;
    this._applyInputFromPoint(t.clientX, t.clientY);
    e.preventDefault();
};
TouchMovement.prototype._handleTouchMove = function (e) {
    if (this._activeTouchId === null) return;
    for (var i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === this._activeTouchId) {
            this._applyInputFromPoint(t.clientX, t.clientY);
            e.preventDefault();
            return;
        }
    }
};
TouchMovement.prototype._handleTouchEnd = function (e) {
    if (this._activeTouchId === null) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this._activeTouchId) {
            this._activeTouchId = null;
            this._resetKnob();
            e.preventDefault();
            return;
        }
    }
};

TouchMovement.prototype._handleMouseDown = function (e) { this._mouseDown = true;  this._updateMetrics(); this._applyInputFromPoint(e.clientX, e.clientY); e.preventDefault(); };
TouchMovement.prototype._handleMouseMove = function (e) { if (!this._mouseDown) return; this._applyInputFromPoint(e.clientX, e.clientY); e.preventDefault(); };
TouchMovement.prototype._handleMouseUp   = function (e) { if (!this._mouseDown) return; this._mouseDown = false; this._resetKnob(); e.preventDefault(); };

TouchMovement.prototype._handleLayoutChange = function () {
    if (!this._mouseDown && this._activeTouchId === null) this._resetKnob();
    else this._updateMetrics();
};

TouchMovement.prototype._destroy = function () {
    if (this._unbindAction) this._unbindAction();
    if (this.base) {
        this.base.removeEventListener('touchstart', this._onTouchStart);
        this.base.removeEventListener('touchmove',  this._onTouchMove);
        this.base.removeEventListener('touchend',   this._onTouchEnd);
        this.base.removeEventListener('touchcancel',this._onTouchEnd);
        this.base.removeEventListener('mousedown',  this._onMouseDown);
    }
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup',   this._onMouseUp);
    window.removeEventListener('resize', this._onLayoutChange);
    window.removeEventListener('orientationchange', this._onLayoutChange);
    window.removeEventListener('scroll', this._onLayoutChange);
};