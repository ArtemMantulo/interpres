var CoinSpawner = pc.createScript('coinSpawner');

CoinSpawner.attributes.add('coinAsset', { type: 'asset', assetType: 'container'});

CoinSpawner.prototype.initialize = function () {

    this._parent = this.app.root.findByName('Coins');

    this._positions = [
        new pc.Vec3(-12.241, 1.68, -8.69),
        new pc.Vec3(-12.455, 1.771, -9.262),
        new pc.Vec3(-12.582, 1.835, -9.968),
        new pc.Vec3(-12.546, 1.911, -10.684),
        new pc.Vec3(-12.361, 2.003, -11.441),
        new pc.Vec3(-12.156, 2.081, -12.144),
        new pc.Vec3(-11.612, 2.142, -12.919),
        new pc.Vec3(-11.072, 2.159, -13.584),
        new pc.Vec3(-10.131, 2.202, -14.324),
        new pc.Vec3(-9.151, 2.191, -14.769),
        new pc.Vec3(-8.366, 2.216, -14.951),
        new pc.Vec3(-7.255, 2.195, -15.045),
        new pc.Vec3(-6.142, 2.135, -14.746),
        new pc.Vec3(-5.243, 2.05, -14.335),
        new pc.Vec3(-2.489, 1.628, -9.881),
        new pc.Vec3(-2.789, 1.571, -9.073),
        new pc.Vec3(-2.896, 1.531, -8.125),
        new pc.Vec3(-3.19, 1.422, -7.202),
        new pc.Vec3(-3.183, 1.285, -6.161),
        new pc.Vec3(-2.626, 1.185, -5.621),
        new pc.Vec3(-1.861, 1.14, -5.288),
        new pc.Vec3(-1.055, 1.108, -5.058),
        new pc.Vec3(0.019, 1.119, -4.997),
        new pc.Vec3(0.96, 1.13, -5.081),
        new pc.Vec3(2, 1.118, -5.405),
        new pc.Vec3(2.746, 1.181, -6.166),
        new pc.Vec3(2.928, 1.321, -7.285),
        new pc.Vec3(2.754, 1.443, -8.292),
        new pc.Vec3(-6.42, 1.148, 6.187),
        new pc.Vec3(-6.303, 1.148, 5.288),
        new pc.Vec3(-6.671, 1.148, 4.336),
        new pc.Vec3(-7.082, 1.148, 3.187),
        new pc.Vec3(-7.726, 1.148, 2.096),
        new pc.Vec3(-8.706, 1.256, 1.724),
        new pc.Vec3(-9.639, 1.38, 2.13),
        new pc.Vec3(-10.697, 1.497, 2.637),
        new pc.Vec3(-11.74, 1.657, 3.026),
        new pc.Vec3(-6.785, 0.882, -3.059),
        new pc.Vec3(-7.87, 0.95, -3.793),
        new pc.Vec3(-8.97, 1.062, -4.567),
        new pc.Vec3(-10.071, 1.235, -5.29),
        new pc.Vec3(-11.15, 1.376, -5.978),
        new pc.Vec3(-12.274, 1.453, -6.599),
        new pc.Vec3(-13.459, 1.772, -7.301)
    ];

    const asset = this.coinAsset || this.app.assets.find('Coin', 'container');

    if (!asset) {
        console.error('[coins] Coin asset not set');
        return;
    }

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
        this._parent.addChild(coin);
        const pos = this._positions[i];
        coin.setPosition(pos.x + 6.427, pos.y + 0.2, pos.z + 5.956);

        const visual = asset.resource.instantiateRenderEntity();
        visual.setLocalScale(150, 150, 150);
        coin.addChild(visual);

        const Character = this.app.scene.layers.getLayerByName('Character');
        const renders = visual.findComponents('render');
        for (const r of renders) {
            if (Character) r.layers = [Character.id];
            r.castShadowsLightmap = false;
            r.receiveShadows = false;
            for (const mi of r.meshInstances) mi.material = goldMat;
        }

        coin.addComponent('collision', { type: 'sphere', radius: 0.1 });
        coin.addComponent('script');
        coin.script.create('coinDestroyer');
    }
};