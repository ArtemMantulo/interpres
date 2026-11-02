var AmenitiesMode = pc.createScript('amenitiesMode');

AmenitiesMode.attributes.add('cameraEntity', { type: 'entity', title: 'Camera' });
AmenitiesMode.attributes.add('file', { type: 'asset', assetType: 'binary', title: 'CSV Data File' });
AmenitiesMode.attributes.add('offsetY', { type: 'number', default: 0.5, title: 'Panel Vertical Offset' });
AmenitiesMode.attributes.add('focusLerpSpeed', { type: 'number', default: 5, title: 'Focus Lerp Speed' });
AmenitiesMode.attributes.add('lookLerpSpeed', { type: 'number', default: 5, title: 'Look Lerp Speed' });
AmenitiesMode.attributes.add('targetDistance', { type: 'number', default: 5, title: 'Target Distance' });

AmenitiesMode.prototype.initialize = function () {
    this.forcePivotSnap = false;
    this.activeIndex = -1;
    this.targetFocusPoint = null;
    this.targetYaw = null;
    this.targetPitch = null;
    this.distanceLerpActive = false;
    this.distanceStart = 0;
    this.distanceTarget = 0;
    this.orbitCamera = this.cameraEntity?.script.orbitCamera;
    this.textRows = [];
    this.amenityPanels = [];
    this.targets = this.entity.children.slice();

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (!this.orbitCamera) {
        console.error('orbitCamera script not found on cameraEntity.');
        return;
    }

    if (isMobile) {
        for (let i = 0; i < this.targets.length; i++) {
            const target = this.targets[i];
            if (target) {
                const scale = target.getLocalScale().clone();
                scale.mulScalar(0.8);
                target.setLocalScale(scale);
            }
        }
    }

    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onUserInput, this);
    if (this.app.touch) {
        this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onUserInput, this);
    }

    this.loadTextData();

    const container = document.getElementById('amenities-container');
    if (!container) {
        console.warn('Missing amenities-container in HTML');
        return;
    }

    this.targets.forEach((target, index) => {
        const row = this.textRows[index];
        if (!row) return;

        const panel = document.createElement('div');
        panel.className = 'blur-panel amenities-panel';
        panel.innerHTML = `
            <img class="amenities-icon" src="${row.icon}" />
            <div class="amenities-text">${row.title}</div>
        `;
        container.appendChild(panel);

        panel.addEventListener('click', () => this.onClick(index));
        this.amenityPanels.push({ target, panel });
    });
};

AmenitiesMode.prototype.rebuildAmenityPanels = function () {
    const container = document.getElementById('amenities-container');
    if (!container) {
        console.warn('Missing amenities-container in HTML');
        return;
    }

    // Удаляем старые панели
    this.amenityPanels?.forEach(({ panel }) => {
        panel.remove();
    });
    this.amenityPanels = [];

    // Перезагружаем CSV
    this.loadTextData();

    // Перестраиваем DOM
    this.targets.forEach((target, index) => {
        const row = this.textRows[index];
        if (!row) return;

        const panel = document.createElement('div');
        panel.className = 'blur-panel amenities-panel';
        panel.innerHTML = `
            <img class="amenities-icon" src="${row.icon}" />
            <div class="amenities-text">${row.title}</div>
        `;
        container.appendChild(panel);

        panel.addEventListener('click', () => this.onClick(index));
        this.amenityPanels.push({ target, panel });
    });
};

AmenitiesMode.prototype.forceUpdatePanelPositions = function () {
    if (!this.amenityPanels || this.amenityPanels.length === 0) return;

    this.amenityPanels.forEach(({ target, panel }) => {
        const worldPos = target.getPosition().clone();
        worldPos.y += this.offsetY;
        const screenPos = new pc.Vec3();
        this.cameraEntity.camera.worldToScreen(worldPos, screenPos);
        panel.style.left = `${screenPos.x}px`;
        panel.style.top = `${screenPos.y}px`;
    });
};

AmenitiesMode.prototype.loadTextData = function () {
    if (!this.file || !this.file.resource) {
        console.warn("Binary CSV data file not assigned.");
        return;
    }

    const text = this.file.resource;
    const lines = text.trim().split('\n');

    this.textRows = lines.map(line => {
        const parts = line.split(';');
        return {
            icon: (parts[0] || '').trim(),
            title: (parts[1] || '').trim(),
            preview: (parts[2] || '').trim(),
            description: (parts[3] || '').trim()
        };
    });
};

AmenitiesMode.prototype.updateHtmlContent = function (index) {
    if (!this.textRows || !this.textRows[index]) return;
    const data = this.textRows[index];
    const container = document.getElementById('info-panel');
    if (!container) return;

    const image = container.querySelector('.panel-image');
    const title = container.querySelector('.panel-title');
    const description = container.querySelector('.panel-description');

    if (image && data.preview) image.src = data.preview;
    if (title && data.title) title.textContent = data.title;
    if (description && data.description) description.textContent = data.description;

    container.classList.add('visible');
};

AmenitiesMode.prototype.onUserInput = function () {
    this.targetYaw = null;
    this.targetPitch = null;
    this.distanceLerpActive = false;
};

AmenitiesMode.prototype.onClick = function (index) {
    this.activeIndex = index;
    const target = this.targets[index];
    if (!target) return;

    const targetPos = target.getPosition().clone();
    this.targetFocusPoint = targetPos;

    this.distanceLerpActive = true;
    this.distanceStart = this.orbitCamera.distance;
    this.distanceTarget = this.targetDistance;

    this.orbitCamera._yawVel = 0;
    this.orbitCamera._pitchVel = 0;
    this.orbitCamera._distanceVel = 0;

    const camPos = this.cameraEntity.getPosition();
    const dir = new pc.Vec3().sub2(targetPos, camPos).normalize();

    this.targetYaw = Math.atan2(-dir.x, -dir.z) * pc.math.RAD_TO_DEG;
    this.targetPitch = Math.asin(dir.y) * pc.math.RAD_TO_DEG;

    const distance = this.targetDistance;

    this.orbitCamera.distance = distance;

    this.orbitCamera._pivotPoint.copy(this.orbitCamera.pivotPoint);
    this.orbitCamera._targetYaw = this.targetYaw;
    this.orbitCamera._targetPitch = this.targetPitch;
    this.orbitCamera._targetDistance = distance;

    this.updateHtmlContent(index);


    const stateSwitcher = document.querySelector('.state-switcher');
    if (stateSwitcher) {
        stateSwitcher.style.display = 'none';
    }
};

function angleDiffDeg(a, b) {
    let diff = ((b - a + 180) % 360 + 360) % 360 - 180;
    return diff;
}

AmenitiesMode.prototype.update = function (dt) {
    dt = Math.min(dt, 1 / 30);

    if (this.distanceLerpActive) {
        const current = this.orbitCamera.distance;
        const target = this.targetDistance;
        const newDist = pc.math.lerp(current, target, dt * 5);
        this.orbitCamera.distance = newDist;
        if (Math.abs(newDist - target) < 0.005) {
            this.orbitCamera.distance = target;
            this.distanceLerpActive = false;
        }
    }

    if (this.targetFocusPoint) {
        const current = this.orbitCamera.pivotPoint;
        const target = this.targetFocusPoint;
        const newPivot = new pc.Vec3().lerp(current, target, dt * this.focusLerpSpeed);
        this.orbitCamera.pivotPoint.copy(newPivot);

        if (newPivot.distance(target) < 0.001) {
            this.orbitCamera.pivotPoint.copy(target);
            this.targetFocusPoint = null;

            const targetPos = this.targets[this.activeIndex].getPosition();
        }
    }

    if (this.targetYaw !== null && this.targetPitch !== null) {
        const yaw = this.orbitCamera.yaw;
        const pitch = this.orbitCamera.pitch;

        const yawDelta = angleDiffDeg(yaw, this.targetYaw);
        const pitchDelta = this.targetPitch - pitch;

        const newYaw = yaw + yawDelta * Math.min(1, dt * this.lookLerpSpeed);
        const newPitch = pitch + pitchDelta * Math.min(1, dt * this.lookLerpSpeed);

        this.orbitCamera.yaw = newYaw;
        this.orbitCamera.pitch = newPitch;

        const yawDone = Math.abs(yawDelta) < 0.01;
        const pitchDone = Math.abs(pitchDelta) < 0.01;

        if (yawDone && pitchDone) {
            this.orbitCamera.yaw = this.targetYaw;
            this.orbitCamera.pitch = this.targetPitch;
            this.targetYaw = null;
            this.targetPitch = null;
        }
    }

    this.amenityPanels?.forEach(({ target, panel }) => {
        const worldPos = target.getPosition().clone();
        worldPos.y += this.offsetY;
        const screenPos = new pc.Vec3();
        this.cameraEntity.camera.worldToScreen(worldPos, screenPos);
        panel.style.left = `${screenPos.x}px`;
        panel.style.top = `${screenPos.y}px`;
    });
};

AmenitiesMode.prototype.destroy = function () {
    this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onUserInput, this);
    if (this.app.touch) {
        this.app.touch.off(pc.EVENT_TOUCHMOVE, this.onUserInput, this);
    }

    this.amenityPanels?.forEach(({ panel }) => {
        panel.remove();
    });
    this.amenityPanels = [];
};

AmenitiesMode.prototype.reset = function () {
    this.activeIndex = -1;
    this.targetFocusPoint = null;
    this.targetYaw = null;
    this.targetPitch = null;
    this.distanceLerpActive = false;

    const panel = document.getElementById('info-panel');
    if (panel) {
        panel.classList.remove('visible');
    }
};

AmenitiesMode.prototype.postEnable = function () {
    this.rebuildAmenityPanels();
};

AmenitiesMode.prototype.restoreFocus = function () {
    const validTargets = this.targets.filter(Boolean);
    if (validTargets.length === 0) return;

    const index = Math.floor(Math.random() * validTargets.length);
    const target = validTargets[index];
    this.activeIndex = index;

    const pos = target.getPosition().clone();

    this.targetFocusPoint = null;
    this.targetYaw = null;
    this.targetPitch = null;

    this.targetFocusPoint = pos;
    this.distanceLerpActive = true;
    this.distanceStart = this.orbitCamera.distance;
    this.distanceTarget = this.targetDistance;

    this.targetFocusPoint = targetPos.clone();

    const forward = new pc.Vec3(0, 0, -1);
    const up = new pc.Vec3(0, 1, 0);

    const pivotToTarget = new pc.Vec3().sub2(targetPos, this.orbitCamera.pivotPoint).normalize();

    this.targetYaw = pc.math.radToDeg(Math.atan2(-pivotToTarget.x, -pivotToTarget.z));
    this.targetPitch = pc.math.radToDeg(Math.asin(pivotToTarget.y));

    this.forcePivotSnap = false;

    this.updateHtmlContent(index);
};