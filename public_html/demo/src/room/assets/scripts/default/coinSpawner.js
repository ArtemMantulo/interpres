var CoinSpawner = pc.createScript('coinSpawner');

CoinSpawner.attributes.add('coinAsset', { type: 'asset', assetType: 'container', title: 'Coin GLB' });

CoinSpawner.prototype.initialize = function () {

    this._parent = this.app.root.findByName('Coins');

    this._positions = [
        new pc.Vec3(-0.802, 0.65, 0.614),
        new pc.Vec3(-0.472, 0.65, 0.614),
        new pc.Vec3(-0.147, 0.65, 0.614),
        new pc.Vec3( 0.156, 0.65, 0.614),
        new pc.Vec3( 0.474, 0.65, 0.614),
        new pc.Vec3( 0.759, 0.651, 0.614),
        new pc.Vec3( 1.049, 0.65, 0.614),
        new pc.Vec3( 1.349, 0.65, 0.614),
        new pc.Vec3( 1.651, 0.65, 0.614),
        new pc.Vec3( 1.819, 0.65, 0.249),
        new pc.Vec3( 1.819, 0.65, -0.043),
        new pc.Vec3( 1.819, 0.65, -0.328)
    ];

    const asset = this.coinAsset || this.app.assets.find('Coin', 'container');

    if (!asset.resource) {
        asset.once('load', () => this._spawn(asset));
        this.app.assets.load(asset);
    } else {
        this._spawn(asset);
    }
};

CoinSpawner.prototype._spawn = function (asset) {
    const goldMat = new pc.StandardMaterial();
    goldMat.ambient = new pc.Color(0, 0, 0);
    goldMat.diffuse = new pc.Color(1, 0.8, 0);
    goldMat.specular = new pc.Color(1, 1, 1);
    goldMat.shininess = 75;
    goldMat.emissive = new pc.Color(0.7, 0.45, 0.04);
    goldMat.emissiveIntensity = 1;
    goldMat.update();

    for (let i = 0; i < this._positions.length; i++) {
        const coin = new pc.Entity('Coin_' + (i + 1));
        coin.setPosition(this._positions[i]);
        this._parent.addChild(coin);

        const visual = asset.resource.instantiateRenderEntity();
        visual.setLocalScale(100, 100, 100);
        coin.addChild(visual);

        const Сharacter = this.app.scene.layers.getLayerByName('Character');
        const renders = visual.findComponents('render');
        for (const r of renders) {
            if (Сharacter) r.layers = [Сharacter.id];
            r.castShadowsLightmap = false;
            r.receiveShadows = false;
            for (const mi of r.meshInstances) mi.material = goldMat;
        }

        coin.addComponent('collision', { type: 'sphere', radius: 0.1 });
        coin.addComponent('script');
        coin.script.create('coinDestroyer');
    }
};