
var ApartmentsMode = pc.createScript('apartmentsMode');

ApartmentsMode.attributes.add('cameraEntity', { type: 'entity', title: 'Camera'});

// Привязки
ApartmentsMode.attributes.add('targets', { type: 'entity', array: true, title: 'Targets'});

ApartmentsMode.attributes.add('focusLerpSpeed', { type: 'number', default: 5, title: 'Distance Speed'});
ApartmentsMode.attributes.add('targetDistance', { type: 'number', default: 5, title: 'Default Distance'});

ApartmentsMode.prototype.initialize = function () {
    this.activeIndex = -1;
    this.targetFocusPoint = null;
    this.distanceLerpActive = false;

    this.orbitCamera = this.cameraEntity?.script.orbitCamera;

    if (!this.orbitCamera) {
        console.error("orbitCamera script not found.");
        return;
    }

    this.setRotationZoomInputEnabled(true); // включено по умолчанию

    this.panelElement = document.getElementById('apartments-panel');
    if (!this.panelElement) {
        return;
    }

    const domButtons = this.panelElement.querySelectorAll('.panel-button');
    this.domButtons = Array.from(domButtons);

    this.domButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => this.onClick(index));
    });

    this.panelElement.classList.remove('visible');
};

ApartmentsMode.prototype.setRotationZoomInputEnabled = function (state) {
    const orbit = this.orbitCamera;
    if (!orbit) return;

    if (orbit.mouseInput) {
        orbit.mouseInput.enableRotate = state;
        orbit.mouseInput.enableZoom = state;
    }

    if (orbit.touchInput) {
        orbit.touchInput.enableRotate = state;
        orbit.touchInput.enablePinch = state;
    }
};

ApartmentsMode.prototype.onClick = function (index) {
    this.activeIndex = index;
    this.setInputEnabled(false);

    const target = this.targets[index];
    if (!target) return;

    // Отключаем все вложенные объекты во всех targets
    this.targets.forEach(t => {
        t.children.forEach(child => {
            child.enabled = false;
        });
    });

    // Включаем вложенные только в выбранном target
    target.children.forEach(child => {
        child.enabled = true;
    });

    const pos = target.getPosition().clone();
    const rot = target.getRotation();

    this.targetFocusPoint = pos;

    this.distanceLerpActive = true;
    this.startDistance = this.orbitCamera.distance;
    this.targetDistanceValue = this.targetDistance;

    const euler = new pc.Vec3();
    rot.getEulerAngles(euler);

    this.orbitCamera.yaw = euler.y;
    this.orbitCamera.pitch = -30;

    // Отключаем только вращение и зум
    this.setRotationZoomInputEnabled(false);
    const stateSwitcher = document.querySelector('.state-switcher');
    if (stateSwitcher) {
        stateSwitcher.style.display = 'none';
    }
};

ApartmentsMode.prototype.update = function (dt) {
    if (this.distanceLerpActive) {
        const current = this.orbitCamera.distance;
        const newDist = pc.math.lerp(current, this.targetDistanceValue, dt * 5);
        this.orbitCamera.distance = newDist;

        if (Math.abs(newDist - this.targetDistanceValue) < 0.01) {
            this.orbitCamera.distance = this.targetDistanceValue;
            this.distanceLerpActive = false;
        }
    }

    if (this.targetFocusPoint) {
        const pivot = this.orbitCamera.pivotPoint;
        pivot.lerp(pivot, this.targetFocusPoint, dt * this.focusLerpSpeed);

        if (pivot.distance(this.targetFocusPoint) < 0.001) {
            pivot.copy(this.targetFocusPoint);
            this.targetFocusPoint = null;
        }
    }
};

ApartmentsMode.prototype.reset = function () {
    this.setInputEnabled(true);
    this.activeIndex = -1;
    this.targetFocusPoint = null;
    this.distanceLerpActive = false;

    this.setRotationZoomInputEnabled(true);

    // 👇 ВАЖНО: отключаем все дочерние объекты
    this.targets.forEach(t => {
        t.children.forEach(child => {
            child.enabled = false;
        });
    });

    if (this.panelElement) {
        this.panelElement.classList.remove('visible');
    }
};


ApartmentsMode.prototype.setInputEnabled = function (state) {
    const orbit = this.orbitCamera;
    if (!orbit) return;

    const mouse = orbit.entity.script.mouseInput;
    const touch = orbit.entity.script.touchInput;

    if (mouse) mouse.enabled = state;
    if (touch) touch.enabled = state;
};

ApartmentsMode.prototype.showPanel = function () {
    this.panelElement = document.getElementById('apartments-panel');
    if (!this.panelElement) return;

    this.domButtons = Array.from(this.panelElement.querySelectorAll('.panel-button'));

    this.domButtons.forEach((btn, index) => {
        btn.onclick = () => this.onClick(index); // навешиваем заново
    });

    this.panelElement.classList.add('visible');
    const stateSwitcher = document.querySelector('.state-switcher');
    if (stateSwitcher) {
        stateSwitcher.style.display = 'flex';
    }
};