var ArGround = pc.createScript('ar-ground');

ArGround.attributes.add('material', { type: 'asset', assetType: 'material', title: 'Material (optional)' });

ArGround.prototype.initialize = function () {
    let mat = null;

    if (this.material && this.material.resource) {
        mat = this.material.resource;
    } else {
        mat = new pc.StandardMaterial();
        mat.diffuse = new pc.Color(0.5, 0.5, 0.5);
        mat.blendType = pc.BLEND_PREMULTIPLIED;
        mat.alphaToCoverage = true;
        mat.depthTest = true;
        mat.depthWrite = false;
        mat.useFog = false;
        mat.useSkybox = false;
        mat.useGammaTonemap = false;
    }

    mat.chunks = mat.chunks || {};
    mat.chunks.APIVersion = pc.CHUNKAPI_1_62;
    mat.chunks.endPS = `
        litArgs_opacity = mix(light0_shadowIntensity, 0.0, shadow0);
        gl_FragColor.rgb = vec3(0.0);
    `;

    mat.update();

    if (this.entity.render && this.entity.render.meshInstances) {
        this.entity.render.meshInstances.forEach(mi => mi.material = mat);
    } else if (this.entity.model && this.entity.model.meshInstances) {
        this.entity.model.meshInstances.forEach(mi => mi.material = mat);
    } else {
        console.warn('[ar-ground] Entity has no render/model component to apply the material.');
    }
};
