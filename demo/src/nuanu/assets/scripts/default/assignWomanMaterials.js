var AssignWomanMaterials = pc.createScript('assignWomanMaterials');

AssignWomanMaterials.prototype.initialize = function () {
    this._tries = 0;
    this._maxTries = 20;
    this._onUpdate = this.tryApply.bind(this);
    this.app.on('update', this._onUpdate);
};

AssignWomanMaterials.prototype.tryApply = function () {
    if (this._tries++ > this._maxTries) {
        this.app.off('update', this._onUpdate);
        console.warn('[AssignWomanMaterials] woman not found');
        return;
    }
    var target = findEntityByNameCaseInsensitive(this.entity, 'woman');
    if (!target || !target.render) return;

    var mats = this.buildMaterials();
    this.assign(target, mats);

    this.app.off('update', this._onUpdate);
};

AssignWomanMaterials.prototype.buildMaterials = function () {
    var tex = function (name) {
        var a = this.app.assets.find(name, 'texture');
        return a && a.resource ? a.resource : null;
    }.bind(this);

    function makeStdMat(name, opts) {
        opts = opts || {};
        var m = new pc.StandardMaterial();
        m.name = name;

        if (opts.diffuseTex) {
            m.diffuseMap = opts.diffuseTex;
            if (opts.diffuseTex.srgb !== true) opts.diffuseTex.srgb = true;
        }
        m.diffuse.set(1, 1, 1);
        m.ambient.set(0, 0, 0);
        m.specular = new pc.Color(0.2, 0.2, 0.2);
        m.shininess = 45;

        if (opts.normalTex) {
            m.normalMap = opts.normalTex;
            m.bumpiness = 1;
            opts.normalTex.srgb = false;
        }

        if (opts.opacityTex) {
            m.opacityMap = opts.opacityTex;
            m.opacityMapUv = 0;
            m.opacityMapChannel = 'r';
            m.opacity = 1;
            m.blendType = pc.BLEND_NORMAL;
            m.alphaTest = 0;
            m.alphaToCoverage = false;
        }

        if (opts.specular) m.specular.set(opts.specular[0], opts.specular[1], opts.specular[2]);
        if (typeof opts.shininess === 'number') m.shininess = opts.shininess;

        if (opts.cullNone) m.cull = pc.CULLFACE_NONE;

        m.useMetalness = false;
        m.update();
        return m;
    }

    var matSkin = makeStdMat('Skin', {
        diffuseTex: tex('Skin_Diffuse'),
        normalTex:  tex('Skin_Normal'),
    });

    var matEyelashes = makeStdMat('Eyelashes', {
        diffuseTex: tex('Eyelashes_Diffuse'),
        opacityTex: tex('Eyelashes_Opacity'),
        cullNone:   true,
        blendAlpha: true
    });

    var matScalp = makeStdMat('Scalp', {
        diffuseTex: tex('Scalp_Diffuse'),
        opacityTex: tex('Scalp_Opacity'),
        blendAlpha: true
    });

    var matHair = makeStdMat('Hair', {
        diffuseTex: tex('Hair_Diffuse'),
        opacityTex: tex('Hair_Opacity'),
        cullNone:   true,
        blendAlpha: true
    });

    var matUnderwear = makeStdMat('Underwear', {
        diffuseTex: tex('Underwear_Diffuse'),
        normalTex:  tex('Underwear_Normal')
    });

    var matTop = makeStdMat('Top', {
        diffuseTex: tex('Top_Diffuse'),
        normalTex:  tex('Top_Normal')
    });

    return [matSkin, matEyelashes, matScalp, matHair, matUnderwear, matTop];
};

AssignWomanMaterials.prototype.assign = function (woman, materials) {
    var mi = woman.render.meshInstances || [];
    mi.castShadows = true;
    mi.receiveShadows = true;
    var n = Math.min(mi.length, materials.length);
    if (mi.length !== materials.length) {
        console.warn('[AssignWomanMaterials] draw calls:', mi.length, ' materials:', materials.length, ' -> assign first', n);
    }

    for (var i = 0; i < n; i++) {
        mi[i].material = materials[i];
        materials[i].update();
        mi[i].updateKey();
    }

    var characterLayer = this.app.scene.layers.getLayerByName('Character');
    if (!characterLayer) {
        console.warn('[AssignWomanMaterials] Layer "Character" not found');
        return;
    }

    var renders = woman.findComponents('render');
    for (var r = 0; r < renders.length; r++) {

        renders[r].layers = [characterLayer.id];
        renders[r].castShadows = true;
        renders[r].receiveShadows = true;

        var list = renders[r].meshInstances;
        for (var j = 0; j < list.length; j++) {
            list[j].layer = characterLayer.id;
            list[j].castShadow = true;
            list[j].receiveShadow = true;
        }
    }
};

function findEntityByNameCaseInsensitive(root, name) {
    var target = name.toLowerCase();
    var found = null;
    (function walk(e){
        if (e.name && e.name.toLowerCase() === target) { found = e; return; }
        for (var i = 0; i < e.children.length && !found; i++) walk(e.children[i]);
    })(root);
    return found;
}