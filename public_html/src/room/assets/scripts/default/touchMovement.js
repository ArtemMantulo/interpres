var TouchMovement = pc.createScript('touchMovement');

TouchMovement.attributes.add('baseSelector',  { type: 'string', default: '#joystick' });
TouchMovement.attributes.add('knobSelector',  { type: 'string', default: '#joystick-inner' });

TouchMovement.attributes.add('deadZone',          { type: 'number', default: 0.08 });
TouchMovement.attributes.add('moveSpeed',         { type: 'number', default: 1,    title: 'Move Speed' });
TouchMovement.attributes.add('turnSpeed',         { type: 'number', default: 10,   title: 'Turn Speed' });
TouchMovement.attributes.add('jumpControlDelay',  { type: 'number', default: 2.5,  title: 'Jump Control Delay (sec)' });
TouchMovement.attributes.add('playerName',        { type: 'string', default: 'Player' });
TouchMovement.attributes.add('characterName',     { type: 'string', default: 'Character' });

TouchMovement.prototype.initialize = function () {
    window.joystickInput = { x: 0, y: 0 };
    this.inputLocked  = true;
    this.velocity     = new pc.Vec3();
    this.wasMoving    = false;
    this.jumpVelocity = new pc.Vec3();

    this.animEntity = this.app.root.findByName(this.playerName) || null;

    this._wc = null;
    (function findWC(node) {
        if (this._wc) return;
        if (node.script && node.script.wallColliders) { this._wc = node.script.wallColliders; return; }
        for (var i = 0; i < node.children.length; i++) findWC.call(this, node.children[i]);
    }).call(this, this.app.root);

    this._collisionRadius = 0.13;
    this._verticalTol     = 0.60;

    var goButton = document.getElementById('go-button');
    if (goButton) {
        this._onGoClick = this._handleGoClick.bind(this);
        goButton.addEventListener('click', this._onGoClick, { once: true });
    } else {
        console.warn('[touchMovement] #go-button not found');
    }

    this.base = null;
    this.knob = null;
    this._activeTouchId = null;
    this._mouseDown = false;
    this._rect = null;
    this._radius = 0;
    this._knobRadius = 0;

    this.on('destroy', this._destroy, this);
};

TouchMovement.prototype._handleGoClick = function () {
    if (!document.getElementById('joystick')) {
        var base = document.createElement('div');
        base.id = 'joystick';
        var knob = document.createElement('div');
        knob.id = 'joystick-inner';
        base.appendChild(knob);
        document.body.appendChild(base);
    }
    if (!document.getElementById('jump-button')) {
        var btn = document.createElement('button');
        btn.id = 'jump-button';
        btn.textContent = 'JUMP';
        document.body.appendChild(btn);
    }

    var goButton = document.getElementById('go-button');
    if (goButton) goButton.style.display = 'none';
    var taskComplete = document.getElementById('task-complete');
    if (taskComplete) taskComplete.style.display = 'flex';
    this.inputLocked = false;

    this.base = base;
    this.knob = knob;
    if (!this.base || !this.knob) {
        console.warn('[touchMovement] joystick DOM not found');
        return;
    }
    this._finishInit();
    this.app.fire('joystick:reset');
};

TouchMovement.prototype._finishInit = function () {
    this._bindDomEvents();
    this._updateMetrics();
    this._resetKnob();

    var actionButton = document.getElementById('jump-button');
    if (actionButton) {
        var onPress = () => this.tryJump();
        this._unbindAction = () => {
            actionButton.removeEventListener('click', onPress);
            actionButton.removeEventListener('touchstart', onPress);
        };
        actionButton.addEventListener('click', onPress);
        actionButton.addEventListener('touchstart', onPress, { passive: true });
    }

    this.app.on('joystick:reset', this._resetKnob, this);
};

TouchMovement.prototype.update = function (dt) {
    var input = new pc.Vec3();
    if (!this.inputLocked && window.joystickInput) {
        input.x = window.joystickInput.x;
        input.z = window.joystickInput.y;

        var angle = pc.math.DEG_TO_RAD;
        var cos = Math.cos(angle), sin = Math.sin(angle);
        var rx = input.x * cos - input.z * sin;
        var rz = input.x * sin + input.z * cos;
        input.x = rx; input.z = rz;
    }

    var moving = input.lengthSq() > 0;
    this.velocity.copy(input);

    if (moving && !this.inputLocked && this.animEntity) {
        input.normalize().scale(this.moveSpeed);
        var angleRad = Math.atan2(input.x, input.z);
        var angleDeg = pc.math.RAD_TO_DEG * angleRad;

        var targetRot  = new pc.Quat().setFromEulerAngles(0, angleDeg, 0);
        var currentRot = this.animEntity.getRotation().clone();
        var t = Math.min(1, this.turnSpeed * dt);
        currentRot.slerp(currentRot, targetRot, t);
        this.animEntity.setRotation(currentRot);
    }

    var pos  = this.entity.getPosition().clone();
    var next = pos.clone();

    if (moving && !this.inputLocked) {
        var step = input.clone().normalize().scale(this.moveSpeed * dt);
        next.x += step.x;
        next.z += step.z;
    }

    if (this._wc && this._wc.resolve) {
        next = this._wc.resolve(next, this._collisionRadius, this._verticalTol, pos.y);
    } else {
        next.y = pos.y;
    }
    this.entity.setPosition(next);

    if (this.animEntity && this.animEntity.anim) {
        if (!this.inputLocked) {
            this.animEntity.anim.setBoolean('Walk', moving);
        }
        if (!moving && this.wasMoving && !this.inputLocked) {
            var r = (Math.random() * 3 | 0) + 1;
            this.animEntity.anim.setTrigger('Idle' + r + 'Trigger');
        }
    }

    this.wasMoving = moving;
};

TouchMovement.prototype.tryJump = function () {
    if (this.inputLocked || !this.animEntity || !this.animEntity.anim) return;

    var wasLocked = this.inputLocked;
    this.inputLocked = true;
    setTimeout(() => { this.inputLocked = wasLocked; }, this.jumpControlDelay * 1000);

    var moving = this.velocity.lengthSq() > 0;

    if (moving) {
        this.jumpVelocity.copy(this.velocity);
        this.animEntity.anim.setTrigger('JumpWalk');
    } else {
        this.jumpVelocity.set(0, 0, 0);
        var r = (Math.random() * 3 | 0) + 1;
        this.animEntity.anim.setTrigger('Idle' + r + 'Trigger');
        this.animEntity.anim.setTrigger('JumpIdle');
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
    this._radius = Math.min(this.base.clientWidth, this.base.clientHeight) * 0.5;

    var r = (this.knob.offsetWidth || this.knob.clientWidth || 0) * 0.5;
    if (!r || !isFinite(r)) {
        var ks = getComputedStyle(this.knob);
        r = (parseFloat(ks.width) || 0) * 0.5;
    }
    this._knobRadius = r || 0;
};

TouchMovement.prototype._setKnobLocal = function (nx, ny) {
    var max = Math.max(0, this._radius - this._knobRadius);
    var cx = this.base.clientWidth * 0.5;
    var cy = this.base.clientHeight * 0.5;
    var px = cx + nx * max - this._knobRadius;
    var py = cy + ny * max - this._knobRadius;
    this.knob.style.left = px + 'px';
    this.knob.style.top  = py + 'px';
};

TouchMovement.prototype._resetKnob = function () {
    this._updateMetrics();
    window.joystickInput.x = 0;
    window.joystickInput.y = 0;
    var cx = this.base.clientWidth * 0.5 - this._knobRadius;
    var cy = this.base.clientHeight * 0.5 - this._knobRadius;
    this.knob.style.left = cx + 'px';
    this.knob.style.top  = cy + 'px';
};

TouchMovement.prototype._applyInputFromPoint = function (clientX, clientY) {
    var lx = clientX - this._rect.left;
    var ly = clientY - this._rect.top;
    var cx = this.base.clientWidth * 0.5;
    var cy = this.base.clientHeight * 0.5;

    var dx = lx - cx;
    var dy = ly - cy;

    var max = Math.max(0, this._radius - this._knobRadius);
    var len = Math.hypot(dx, dy);
    if (len > max && len > 0) { var k = max / len; dx *= k; dy *= k; }

    var nx = max > 0 ? dx / max : 0;
    var ny = max > 0 ? dy / max : 0;

    var mag = Math.hypot(nx, ny);
    var dead = Math.min(Math.max(this.deadZone, 0), 0.99);
    if (mag <= dead) { nx = 0; ny = 0; }
    else {
        var s = (mag - dead) / (1 - dead);
        nx = (nx / (mag || 1)) * s;
        ny = (ny / (mag || 1)) * s;
    }

    window.joystickInput.x = nx;
    window.joystickInput.y = ny;
    this._setKnobLocal(nx, ny);
};

TouchMovement.prototype._handleTouchStart = function (e) {
    if (this._activeTouchId !== null) return;
    this._updateMetrics();
    var t = e.changedTouches[0];
    this._activeTouchId = t.identifier;
    this._applyInputFromPoint(t.clientX, t.clientY);
    e.preventDefault();
};
TouchMovement.prototype._handleTouchMove = function (e) {
    if (this._activeTouchId === null) return;
    for (var i = 0; i < e.touches.length; i++) {
        var t = e.touches[i];
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
        var t = e.changedTouches[i];
        if (t.identifier === this._activeTouchId) {
            this._activeTouchId = null;
            this._resetKnob();
            e.preventDefault();
            return;
        }
    }
};

TouchMovement.prototype._handleMouseDown = function (e) {
    this._mouseDown = true;
    this._updateMetrics();
    this._applyInputFromPoint(e.clientX, e.clientY);
    e.preventDefault();
};
TouchMovement.prototype._handleMouseMove = function (e) {
    if (!this._mouseDown) return;
    this._applyInputFromPoint(e.clientX, e.clientY);
    e.preventDefault();
};
TouchMovement.prototype._handleMouseUp = function (e) {
    if (!this._mouseDown) return;
    this._mouseDown = false;
    this._resetKnob();
    e.preventDefault();
};

TouchMovement.prototype._handleLayoutChange = function () {
    if (!this._mouseDown && this._activeTouchId === null) this._resetKnob();
    else this._updateMetrics();
};

TouchMovement.prototype._destroy = function () {
    var goButton = document.getElementById('go-button');
    if (goButton && this._onGoClick) goButton.removeEventListener('click', this._onGoClick);

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
    window.removeEventListener('resize',            this._onLayoutChange);
    window.removeEventListener('orientationchange', this._onLayoutChange);
    window.removeEventListener('scroll',            this._onLayoutChange);

    this.app.off('joystick:reset', this._resetKnob, this);
};