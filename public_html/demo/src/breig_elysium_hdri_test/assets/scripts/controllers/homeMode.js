const HomeMode = pc.createScript('homeMode');

HomeMode.attributes.add('planeName', { type: 'string', default: 'Plane' });
HomeMode.attributes.add('markerTextureUrl', {
    type: 'string',
    default: 'assets/images/icons/ui_circle.png'
});
HomeMode.attributes.add('markerDuration', { type: 'number', default: 1 });
HomeMode.attributes.add('markerOffset', { type: 'number', default: 0.02 });
HomeMode.attributes.add('markerScaleFactor', { type: 'number', default: 0.03 });
HomeMode.attributes.add('markerScaleMin', { type: 'number', default: 0.4 });
HomeMode.attributes.add('markerScaleMax', { type: 'number', default: 2 });
HomeMode.attributes.add('bounceStrength', { type: 'number', default: 0.2 });
HomeMode.attributes.add('dragThreshold', { type: 'number', default: 8 });

HomeMode.prototype.initialize = function () {
    this.cameraEntity = this.app.root.findByName('Camera');
    this._canvas = this.app?.graphicsDevice?.canvas || null;
    this._modeManager = window.AppModeManager || null;
    this._unregisterMode = null;

    this._homePlane = null;
    this._active = this.getInitialMode();

    this._pointerActive = false;
    this._pointerMoved = false;
    this._pointerId = null;
    this._pointerStart = new pc.Vec2();
    const threshold = Math.max(1, this.dragThreshold || 0);
    this._pointerThresholdSq = threshold * threshold;

    this._homeRayOrigin = new pc.Vec3();
    this._homeRayFar = new pc.Vec3();
    this._homePlaneNormal = new pc.Vec3();
    this._homePlanePoint = new pc.Vec3();
    this._homePlaneInv = new pc.Mat4();
    this._homeLocal = new pc.Vec3();
    this._homeClickPoint = new pc.Vec3();
    this._homeClickTarget = new pc.Vec3();

    this._marker = null;
    this._markerMaterial = null;
    this._markerTextureAsset = null;
    this._markerLayerId = null;
    this._markerReady = false;
    this._markerLoading = false;
    this._markerPending = false;
    this._markerPendingPoint = new pc.Vec3();
    this._markerPendingNormal = new pc.Vec3();
    this._markerActive = false;
    this._markerTimer = 0;
    this._markerScale = 1;
    this._markerSize = 3;
    this._markerTexturePrepared = false;

    this._homeMarkerActiveFlag = false;

    this._setModeActive = (active) => {
        this._active = !!active;
        if (!this._active) this.hideMarker();
    };

    this._onCanvasPointerDown = (e) => {
        if (!this._active) return;
        if (this._canvas && e.target !== this._canvas) return;
        if (e.button !== undefined && e.button !== 0) return;
        if (e.pointerType === 'touch' && e.isPrimary === false) return;

        this._pointerActive = true;
        this._pointerMoved = false;
        this._pointerId = e.pointerId ?? null;
        this._pointerStart.set(e.clientX, e.clientY);
    };

    this._onCanvasPointerMove = (e) => {
        if (!this._pointerActive) return;
        if (this._pointerId !== null && e.pointerId !== this._pointerId) return;

        const dx = e.clientX - this._pointerStart.x;
        const dy = e.clientY - this._pointerStart.y;
        if (dx * dx + dy * dy > this._pointerThresholdSq) this._pointerMoved = true;
    };

    this._onCanvasPointerUp = (e) => {
        if (!this._pointerActive) return;
        if (this._pointerId !== null && e.pointerId !== this._pointerId) return;

        this._pointerActive = false;
        if (this._pointerMoved) return;
        this.onHomeCanvasClick(e.clientX, e.clientY);
    };

    this._onCanvasPointerCancel = (e) => {
        if (this._pointerId !== null && e.pointerId !== this._pointerId) return;
        this._pointerActive = false;
    };

    if (this._modeManager?.registerMode) {
        this._unregisterMode = this._modeManager.registerMode(window.AppModeIds?.HOME ?? '0', {
            enter: () => this._setModeActive(true),
            exit: () => this._setModeActive(false)
        });
    } else console.warn('Home mode manager is unavailable.');

    if (this._canvas) {
        this._canvas.addEventListener('pointerdown', this._onCanvasPointerDown);
        this._canvas.addEventListener('pointermove', this._onCanvasPointerMove);
        this._canvas.addEventListener('pointerup', this._onCanvasPointerUp);
        this._canvas.addEventListener('pointercancel', this._onCanvasPointerCancel);
    }

    this.ensureMarker();
    this._setHomeMarkerActive(false);
};

HomeMode.prototype.getInitialMode = function () {
    const HOME = window.AppModeIds?.HOME ?? '0';
    if (this._modeManager?.getMode) return this._modeManager.getMode() === HOME;
    const mode = document.querySelector('.mode-panel .button.active')?.dataset?.mode || HOME;
    return mode === HOME;
};

HomeMode.prototype.getOrbit = function () {
    return this.cameraEntity && this.cameraEntity.script
        ? this.cameraEntity.script.orbitCamera || null
        : null;
};

HomeMode.prototype._setHomeMarkerActive = function (active) {
    active = !!active;
    if (this._homeMarkerActiveFlag === active) return;
    this._homeMarkerActiveFlag = active;
    this.app.fire('home:markerActive', active);
};

HomeMode.prototype.getHomePlane = function () {
    if (!this._homePlane) this._homePlane = this.app.root.findByName(this.planeName);
    return this._homePlane;
};

HomeMode.prototype.getMarkerTextureAsset = function () {
    if (this._markerTextureAsset) return this._markerTextureAsset;

    const url = this.markerTextureUrl;
    if (!url) return null;

    let asset = this.app.assets.find(url, 'texture');
    if (!asset) {
        asset = new pc.Asset(url, 'texture', { url });
        this.app.assets.add(asset);
    }
    this._markerTextureAsset = asset;
    return asset;
};

HomeMode.prototype.getHomeClickPoint = function (clientX, clientY, outPoint, outNormal) {
    const plane = this.getHomePlane();
    const camera = this.cameraEntity && this.cameraEntity.camera;
    const canvas = this._canvas;

    if (!plane || !camera || !canvas) return false;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    camera.screenToWorld(x, y, 0, this._homeRayOrigin);
    camera.screenToWorld(x, y, 1, this._homeRayFar);

    this._homeRayFar.sub(this._homeRayOrigin).normalize();

    plane.getRotation().transformVector(pc.Vec3.UP, this._homePlaneNormal);
    this._homePlaneNormal.normalize();

    const denom = this._homePlaneNormal.dot(this._homeRayFar);
    if (Math.abs(denom) < 1e-6) return false;

    const planePos = this._homePlanePoint.copy(plane.getPosition());
    const t = planePos.sub(this._homeRayOrigin).dot(this._homePlaneNormal) / denom;

    if (t < 0) return false;

    outPoint.copy(this._homeRayFar).mulScalar(t).add(this._homeRayOrigin);
    if (outNormal) outNormal.copy(this._homePlaneNormal);

    this._homePlaneInv.copy(plane.getWorldTransform()).invert();
    this._homePlaneInv.transformPoint(outPoint, this._homeLocal);

    if (Math.abs(this._homeLocal.x) > 0.5 || Math.abs(this._homeLocal.z) > 0.5) return false;

    return true;
};

HomeMode.prototype.getMarkerLayerId = function () {
    if (this._markerLayerId !== null) return this._markerLayerId;
    const layers = this.app?.scene?.layers;
    if (!layers) return null;

    const list = layers.layerList || layers.layers || layers._layers || [];
    let layer = layers.getLayerByName ? layers.getLayerByName('HomeMarker') : null;
    if (!layer && list && list.length) {
        for (let i = 0; i < list.length; i++) {
            if (list[i] && list[i].name === 'HomeMarker') {
                layer = list[i];
                break;
            }
        }
    }

    if (!layer) {
        layer = new pc.Layer({ name: 'HomeMarker' });
        if (layers.insert) layers.insert(layer, list.length);
        else if (layers.push) layers.push(layer);
    }

    this._markerLayerId = layer.id;

    const camera = this.cameraEntity && this.cameraEntity.camera;
    if (camera && Array.isArray(camera.layers)) {
        if (!camera.layers.includes(this._markerLayerId))
            camera.layers = camera.layers.concat([this._markerLayerId]);
    }

    return this._markerLayerId;
};

HomeMode.prototype.createMarkerMaterial = function (texture) {
    const material = new pc.StandardMaterial();
    material.emissive = new pc.Color(1, 1, 1);
    material.diffuse = new pc.Color(1, 1, 1);
    if (texture) {
        this.prepareMarkerTexture(texture);
        material.emissiveMap = texture;
        material.diffuseMap = texture;
        material.opacityMap = texture;
        material.opacityMapChannel = 'a';
    }
    material.opacity = 1;
    material.blendType = pc.BLEND_NORMAL;
    material.cull = pc.CULLFACE_NONE;
    material.depthTest = false;
    material.depthWrite = false;
    material.update();
    return material;
};

HomeMode.prototype.prepareMarkerTexture = function (texture) {
    if (!texture || this._markerTexturePrepared) return;
    texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
    texture.magFilter = pc.FILTER_LINEAR;
    texture.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
    texture.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
    texture.anisotropy = 8;
    texture.upload?.();
    this._markerTexturePrepared = true;
};

HomeMode.prototype.createMarkerEntity = function (material) {
    const marker = new pc.Entity('HomeClickMarker');
    const layerId = this.getMarkerLayerId();
    marker.addComponent('render', {
        type: 'plane',
        material,
        layers: [typeof layerId === 'number' ? layerId : pc.LAYERID_WORLD]
    });
    marker.enabled = false;
    this.app.root.addChild(marker);

    const meshInstances = marker.render?.meshInstances;
    if (meshInstances) {
        for (let i = 0; i < meshInstances.length; i++) {
            meshInstances[i].drawOrder = 10000;
        }
    }

    return marker;
};

HomeMode.prototype.ensureMarker = function () {
    if (this._markerReady) return true;
    if (this._markerLoading) return false;

    const textureAsset = this.getMarkerTextureAsset();
    if (!textureAsset) return false;

    if (textureAsset.resource) {
        this._markerMaterial = this.createMarkerMaterial(textureAsset.resource);
        this._marker = this.createMarkerEntity(this._markerMaterial);
        this._markerReady = true;
        return true;
    }

    this._markerLoading = true;
    const onLoad = () => {
        if (!textureAsset.resource) return;
        this._markerLoading = false;
        this._markerMaterial = this.createMarkerMaterial(textureAsset.resource);
        this._marker = this.createMarkerEntity(this._markerMaterial);
        this._markerReady = true;
        if (this._markerPending) {
            this._markerPending = false;
            this.showMarker(this._markerPendingPoint, this._markerPendingNormal);
        }
    };

    const onError = () => {
        this._markerLoading = false;
        this._markerPending = false;
    };

    textureAsset.once('load', onLoad);
    textureAsset.once('error', onError);
    this.app.assets.load(textureAsset);
    return false;
};

HomeMode.prototype.showMarker = function (position, normal) {
    if (!this.ensureMarker()) {
        this._markerPending = true;
        this._markerPendingPoint.copy(position);
        this._markerPendingNormal.copy(normal);
        return;
    }
    if (!this._marker) return;

    const plane = this.getHomePlane();
    if (plane) this._marker.setRotation(plane.getRotation());

    const offset = this.markerOffset;
    this._marker.setPosition(
        position.x + normal.x * offset,
        position.y + normal.y * offset,
        position.z + normal.z * offset
    );

    this._markerScale = this._markerSize || 3;
    this._marker.setLocalScale(0, 1, 0);
    this._markerTimer = 0;
    this._markerActive = true;
    this._marker.enabled = true;
    this._setHomeMarkerActive(true);
};

HomeMode.prototype.hideMarker = function () {
    if (this._marker) this._marker.enabled = false;
    this._markerActive = false;
    this._markerPending = false;
    this._setHomeMarkerActive(false);
};

HomeMode.prototype.onHomeCanvasClick = function (clientX, clientY) {
    if (!this._active) return;

    const orbit = this.getOrbit();
    if (!orbit || orbit.inputLocked) return;

    const hit = this._homeClickPoint;
    const normal = this._homePlaneNormal;
    if (!this.getHomeClickPoint(clientX, clientY, hit, normal)) return;

    const fallbackY = orbit.targetPosition ? orbit.targetPosition.y : 0;
    const targetY =
        orbit.target && isFinite(orbit.target.y) ? orbit.target.y : fallbackY;
    this._homeClickTarget.set(hit.x, targetY, hit.z);

    orbit.autoRotateMode = 0;
    if (orbit.setAutoRotateEnabled) orbit.setAutoRotateEnabled(false);
    else orbit.autoRotateEnabled = false;

    orbit.focusOn && orbit.focusOn(this._homeClickTarget);
    this.showMarker(hit, normal);

    window.PcScriptShared?.requestRenderFrame?.(this.app);
};

HomeMode.prototype.update = function (dt) {
    if (!this._markerActive || !this._marker) return;

    // Marker animation phases: grow → settle → hold → bump → shrink
    const GROW    = 0.3;   // scale 0 → peak
    const SETTLE  = 0.1;   // scale peak → 1
    const HOLD    = 1.0;   // hold at scale 1
    const BUMP    = 0.1;   // scale 1 → peak
    const SHRINK  = 0.3;   // scale peak → 0
    const PEAK    = 1.1;   // overshoot multiplier
    const TOTAL   = GROW + SETTLE + HOLD + BUMP + SHRINK;

    this._markerTimer += dt;
    const t = this._markerTimer;

    if (t >= TOTAL) {
        this._marker.enabled = false;
        this._markerActive = false;
        this._setHomeMarkerActive(false);
        return;
    }

    let factor = 1;
    if (t < GROW) factor = pc.math.lerp(0, PEAK, t / GROW);
    else if (t < GROW + SETTLE) factor = pc.math.lerp(PEAK, 1, (t - GROW) / SETTLE);
    else if (t < GROW + SETTLE + HOLD) factor = 1;
    else if (t < GROW + SETTLE + HOLD + BUMP)
        factor = pc.math.lerp(1, PEAK, (t - GROW - SETTLE - HOLD) / BUMP);
    else
        factor = pc.math.lerp(PEAK, 0, (t - GROW - SETTLE - HOLD - BUMP) / SHRINK);

    const base = this._markerScale || this._markerSize || 3;
    const scale = base * factor;
    this._marker.setLocalScale(scale, 1, scale);
};

HomeMode.prototype.onDestroy = function () {
    this._unregisterMode?.();

    if (this._canvas) {
        this._canvas.removeEventListener('pointerdown', this._onCanvasPointerDown);
        this._canvas.removeEventListener('pointermove', this._onCanvasPointerMove);
        this._canvas.removeEventListener('pointerup', this._onCanvasPointerUp);
        this._canvas.removeEventListener('pointercancel', this._onCanvasPointerCancel);
    }

    this._homePlane = null;
    this._marker = null;
    this._markerMaterial = null;
    this._markerTexturePrepared = false;

    this._homeMarkerActiveFlag = false;
    this._markerTextureAsset = null;
    this._markerLayerId = null;
    this._markerPending = false;
    this._setHomeMarkerActive(false);
    this._modeManager = null;
    this._unregisterMode = null;
    this._setModeActive = null;
    this._onCanvasPointerDown = null;
    this._onCanvasPointerMove = null;
    this._onCanvasPointerUp = null;
    this._onCanvasPointerCancel = null;
};
