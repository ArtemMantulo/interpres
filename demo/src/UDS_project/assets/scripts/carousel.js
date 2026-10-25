var Carousel = pc.createScript('carousel');

Carousel.attributes.add('camera', { type: 'entity' });
Carousel.attributes.add('scaleFactor', { type: 'number', min: 0, max: 1, default: 1 });
Carousel.attributes.add('vertexShader', { type: 'asset', assetType: 'shader' });
Carousel.attributes.add('fragmentShader', { type: 'asset', assetType: 'shader' });
Carousel.attributes.add('EnableGlass', { type: 'entity'});

const vp = new pc.Mat4();
const wvpInv = new pc.Mat4();

Carousel.prototype.initialize = function() {
    this.timer = 0;
    this.glassEnabled = false;

    const glsl = pc.ShaderChunks.get(this.app.graphicsDevice, 'glsl');
    glsl.set('gsplatVS', this.vertexShader.resource);
    glsl.set('gsplatFS', this.fragmentShader.resource);

    this.currentEntity = null;
    this.prevEntity = null;

    this.app.graphicsDevice.scope.resolve('scaleFactor').setValue(this.scaleFactor);
    this.on('attr', (name) => {
        if (name === 'scaleFactor')
            this.app.graphicsDevice.scope.resolve('scaleFactor').setValue(this.scaleFactor);
    });

    this.showFirstStatue();
};

Carousel.prototype.showFirstStatue = function() {
    const firstEntity = this.entity.findByName('GSPlatCurrent');
    if (firstEntity) {
        this.setEntities(firstEntity, null);
        firstEntity.enabled = true;
    }
};

Carousel.prototype.setEntities = function(current, prev) {
    this.currentEntity = current;
    this.prevEntity = prev;
    this.timer = 0;
    this.glassEnabled = false;
};

Carousel.prototype.update = function(dt) {
    vp.mul2(this.camera.camera.projectionMatrix, this.camera.camera.viewMatrix);

    if (this.currentEntity) {
        const material = this.currentEntity.gsplat?.instance?.material;
        if (material) {
            material.setParameter('time', Math.max(0.0, this.timer * 0.75 - 0.5));
            material.setParameter('mode', 0);

            wvpInv.mul2(vp, this.currentEntity.getWorldTransform()).invert();
            material.setParameter('wvpInv', wvpInv.data);
        }
    }

    if (this.prevEntity) {
        const material = this.prevEntity.gsplat?.instance?.material;
        if (material) {
            material.setParameter('time', Math.min(1.0, this.timer * 1.0));
            material.setParameter('mode', 1);

            wvpInv.mul2(vp, this.prevEntity.getWorldTransform()).invert();
            material.setParameter('wvpInv', wvpInv.data);

            if (this.timer > 1.0) {
                this.prevEntity.enabled = false;
            }
        }
    }

    if (!this.glassEnabled && this.timer >= 5) {
        if (this.EnableGlass) {
            this.EnableGlass.enabled = true;
        }
        this.glassEnabled = true;
    }

    this.timer += dt;
};