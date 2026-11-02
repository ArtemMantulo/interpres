var KeyboardMovement = pc.createScript('keyboardMovement');

KeyboardMovement.attributes.add('moveSpeed',         { type: 'number', default: 1.15 });
KeyboardMovement.attributes.add('runSpeed',          { type: 'number', default: 3.4 });
KeyboardMovement.attributes.add('turnSpeed',         { type: 'number', default: 20, });
KeyboardMovement.attributes.add('jumpControlDelay',  { type: 'number', default: 2.5 });
KeyboardMovement.attributes.add('jumpWalkLockDelay', { type: 'number', default: 1.0 });

KeyboardMovement.attributes.add('animEntity',        { type: 'entity' });

KeyboardMovement.prototype.initialize = function () {
    this.cameraEntity = this.app.root.findByName('Camera');
    if (!this.cameraEntity) console.warn('[keyboardMovement] Camera entity not found by name');

    this.inputLocked  = true;
    this.wasMoving    = false;
    this.isJumping    = false;
    this.velocity     = new pc.Vec3();
    this.moveVelocity = new pc.Vec3();
    this.currentSpeed = this.moveSpeed;

    if (!this.entity.rigidbody) {
        console.warn('[keyboardMovement] entity has no rigidbody');
    }

    // Разблокировка по клику
    setTimeout(() => {
        const goButton     = document.getElementById('go-button');
        const taskComplete = document.getElementById('task-complete');

        if (goButton) {
            goButton.style.display = 'block';
            goButton.addEventListener('click', () => {
                goButton.style.display = 'none';
                if (taskComplete) taskComplete.style.display = 'flex';
                this.inputLocked = false;
            }, { once: true });
        }
    }, 0);
};

KeyboardMovement.prototype.update = function (dt) {
    if (!this.entity.rigidbody) return;

    var inputLocal = new pc.Vec2(0, 0);
    if (!this.inputLocked) {
        if (this.app.keyboard.isPressed(pc.KEY_W)) inputLocal.y += 1;
        if (this.app.keyboard.isPressed(pc.KEY_S)) inputLocal.y -= 1;
        if (this.app.keyboard.isPressed(pc.KEY_A)) inputLocal.x -= 1;
        if (this.app.keyboard.isPressed(pc.KEY_D)) inputLocal.x += 1;
    }

    var inputWorld = new pc.Vec3();
    if ((inputLocal.x !== 0 || inputLocal.y !== 0) && this.cameraEntity) {
        const camQ = this.cameraEntity.getRotation();
        const forward = camQ.transformVector(new pc.Vec3(0, 0, -1));
        const right   = camQ.transformVector(new pc.Vec3(1, 0,  0));
        forward.y = 0; right.y = 0; forward.normalize(); right.normalize();
        inputWorld.copy( right.scale(inputLocal.x).add(forward.scale(inputLocal.y)) );
    }

    const moving    = inputWorld.lengthSq() > 0;
    const runActive = !this.inputLocked && this.app.keyboard.isPressed(pc.KEY_SHIFT);
    const targetSpd = runActive ? this.runSpeed : this.moveSpeed;

    this.velocity.copy(inputWorld);

    const currentY  = this.entity.rigidbody.linearVelocity.y;
    const targetVel = moving ? inputWorld.normalize().scale(targetSpd) : pc.Vec3.ZERO;

    const lerpK = this.isJumping ? 1.0 : 10.0;
    this.moveVelocity.lerp(this.moveVelocity, targetVel, dt * lerpK);

    this.entity.rigidbody.linearVelocity = new pc.Vec3(
        this.moveVelocity.x,
        currentY,
        this.moveVelocity.z
    );

    if (!this.inputLocked && this.app.keyboard.wasPressed(pc.KEY_SPACE)) this.tryJump();

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

KeyboardMovement.prototype.tryJump = function () {
    if (this.isJumping || !this.animEntity || !this.animEntity.anim) return;

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