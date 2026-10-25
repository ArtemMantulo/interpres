var CoinsChecker = pc.createScript('coinsChecker');

CoinsChecker.attributes.add('startDelay', {
    type: 'number',
    default: 2
});

CoinsChecker.prototype.initialize = function () {
    this.checkInterval = 0.2;
    this.timer = 0;
    this.finished = false;

    this.startTimer = 0;
    this.started = false;

    this.playerEntity = this.app.root.findByName("Character");
};

CoinsChecker.prototype.update = function (dt) {
    if (this.finished) return;

    if (!this.started) {
        this.startTimer += dt;
        if (this.startTimer >= this.startDelay) {
            this.started = true;
        } else {
            return;
        }
    }

    this.timer += dt;
    if (this.timer < this.checkInterval) return;
    this.timer = 0;

    const children = this.entity.children;
    if (children.length === 0) {
        const desc = document.getElementById('description');
        if (desc) desc.classList.add('visible');

        const taskComplete = document.getElementById('task-complete');
        if (taskComplete) taskComplete.style.display = 'none';

        if (this.playerEntity?.script?.keyboardMovement) {
            const controller = this.playerEntity.script.keyboardMovement;
            controller.inputLocked = true;

            if (controller.animEntity?.anim) {
                controller.animEntity.anim.setBoolean('Walk', false);
                const random = Math.floor(Math.random() * 3);
                controller.animEntity.anim.setTrigger(`Idle${random + 1}Trigger`);
            }
        }

        const blur = document.getElementById('blur');
        blur.style.display = 'block';
        requestAnimationFrame(() => blur.classList.add('visible'));
        const link = document.getElementById('button-link');
        link.style.display = 'flex';

        this.finished = true;
    }
};