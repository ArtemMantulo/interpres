var KeyboardMovement = pc.createScript('keyboardMovement');

KeyboardMovement.attributes.add('moveSpeed',        { type: 'number', default: 1,   title: 'Move Speed' });
KeyboardMovement.attributes.add('turnSpeed',        { type: 'number', default: 10,  title: 'Turn Speed' });
KeyboardMovement.attributes.add('jumpControlDelay', { type: 'number', default: 2.5, title: 'Jump Control Delay (sec)' });

KeyboardMovement.prototype.initialize = function () {
    this.velocity     = new pc.Vec3();
    this.wasMoving    = false;
    this.jumpVelocity = new pc.Vec3();
    this.inputLocked  = true;

    this._collisionRadius = 0.13;
    this._verticalTol     = 0.60;

    this.animEntity = this.app.root.findByName("Player");

    this._wc = null;
    (function findWC(node) {
        if (this._wc) return;
        if (node.script && node.script.wallColliders) {
            this._wc = node.script.wallColliders;
            return;
        }
        for (var i = 0; i < node.children.length; i++) findWC.call(this, node.children[i]);
    }).call(this, this.app.root);

    setTimeout(() => {
        var goButton     = document.getElementById('go-button');
        var taskComplete = document.getElementById('task-complete');

        if (goButton) {
            goButton.style.display = 'block';
            goButton.addEventListener('click', () => {
                goButton.style.display = 'none';
                this.inputLocked = false;
                if (taskComplete) taskComplete.style.display = 'flex';
            });
        }
    }, 100);
};

KeyboardMovement.prototype.update = function (dt) {
    var input = new pc.Vec3();

    if (!this.inputLocked) {
        if (this.app.keyboard.isPressed(pc.KEY_W)) input.z -= 1;
        if (this.app.keyboard.isPressed(pc.KEY_S)) input.z += 1;
        if (this.app.keyboard.isPressed(pc.KEY_A)) input.x -= 1;
        if (this.app.keyboard.isPressed(pc.KEY_D)) input.x += 1;
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

    if (this.app.keyboard && this.app.keyboard.wasPressed(pc.KEY_SPACE)) {
        this.tryJump();
    }

    if (this.animEntity && this.animEntity.anim) {
        if (!this.inputLocked) {
            this.animEntity.anim.setBoolean('Walk', moving);
        }
        if (!moving && this.wasMoving && !this.inputLocked) {
            var random = Math.floor(Math.random() * 3);
            this.animEntity.anim.setTrigger('Idle' + (random + 1) + 'Trigger');
        }
    }

    this.wasMoving = moving;
};

KeyboardMovement.prototype.tryJump = function () {
    if (this.inputLocked || !this.animEntity || !this.animEntity.anim) return;

    this.inputLocked = true;
    setTimeout(() => { this.inputLocked = false; }, this.jumpControlDelay * 1000);

    var moving = this.velocity.lengthSq() > 0;

    if (moving) {
        this.jumpVelocity.copy(this.velocity);
        this.animEntity.anim.setTrigger('JumpWalk');
    } else {
        this.jumpVelocity.set(0, 0, 0);
        var random = Math.floor(Math.random() * 3);
        this.animEntity.anim.setTrigger('Idle' + (random + 1) + 'Trigger');
        this.animEntity.anim.setTrigger('JumpIdle');
    }
};