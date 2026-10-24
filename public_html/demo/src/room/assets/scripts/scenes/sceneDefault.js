export function startApp(onSceneReady, app, assetMap) {
    createScene(onSceneReady);

    function createScene(onSceneReady) {
        const layers = app.scene.layers;
        const worldLayer = layers.getLayerByName('World');

        const characterLayer = new pc.Layer({ name: 'Character' });
        characterLayer.opaque = true;
        characterLayer.transparent = true;

        const floorLayer = new pc.Layer({ name: 'Floor' });
        floorLayer.transparent = true;

        const wOpaqueIdx = layers.getOpaqueIndex(worldLayer);
        layers.insertOpaque(characterLayer, wOpaqueIdx + 1);

        const wTransIdx = layers.getTransparentIndex(worldLayer);
        layers.insertTransparent(characterLayer, wTransIdx);

        const cTransIdx = layers.getTransparentIndex(characterLayer);
        layers.insertTransparent(floorLayer, cTransIdx + 1);

        app.scene.ambientLight = new pc.Color(0.8, 0.8, 0.8);

        const Root = new pc.Entity("Root");
        app.root.addChild(Root);

        const Camera = new pc.Entity("Camera");
        Camera.setPosition(-0.745, 1.513, 0.692);
        Camera.setEulerAngles(-42.6, 32.8, 0);
        Camera.addComponent('camera', {
            clearColor: new pc.Color(1, 1, 1),
            farClip: 1000,
            fov: 50,
            frustumCulling: true,
            layers: [worldLayer.id, floorLayer.id, characterLayer.id]
        });
        Root.addChild(Camera);

        const Light = new pc.Entity();
        Light.setPosition(0, 0, 0);
        Light.setEulerAngles(45, 0, -30);
        Light.addComponent('light', {
            type: 'directional',
            color: new pc.Color(1, 1, 1),
            isStatic: true,
            intensity: 1,
            castShadows: true,
            affectDynamic: true,
            affectSpecular: true,
            shadowResolution: 2048,
            shadowIntensity: 0.8,
            shadowDistance: 8,
            shadowType: pc.SHADOW_PCF3,
            shadowBias: 0.2,
            normalOffsetBias: 0.05,
            layers: [characterLayer.id, floorLayer.id]
        });
        Root.addChild(Light);

        const Gsplat = new pc.Entity();
        Gsplat.setPosition(0, 0, 1.057);
        Gsplat.setEulerAngles(180, 180, 0);
        Gsplat.addComponent("gsplat", { asset: assetMap.GSplat, layers: [worldLayer.id] });
        Root.addChild(Gsplat);

        const Character = new pc.Entity();
        Character.setPosition(-1.214, 0.161, 0.324);
        Character.tags.add('Player');
        Root.addChild(Character);

        Character.addComponent('collision', { type: 'capsule', radius: 0.13, height: 0.8, linearOffset: [0, 0.433, 0], axis: 1 });

        const Point = new pc.Entity("Point");
        Point.tags.add('Point');
        Character.addChild(Point);
        Point.setLocalPosition(0, 0.581, 0);

        const Player = assetMap.Woman.resource.instantiateRenderEntity();
        Player.setLocalScale(0.8, 0.8, 0.8);
        Character.addChild(Player);

        Player.addComponent('anim', { activate: true });

        const idle1 = assetMap.idle_1.resource.animations[0].resource;
        const idle2 = assetMap.idle_2.resource.animations[0].resource;
        const idle3 = assetMap.idle_3.resource.animations[0].resource;
        const walk = assetMap.Walk.resource.animations[0].resource;
        const jump = assetMap.Jump.resource.animations[0].resource;

        Player.anim.assignAnimation('Idle', idle1);
        Player.anim.assignAnimation('Idle 2', idle2);
        Player.anim.assignAnimation('Idle 3', idle3);
        Player.anim.assignAnimation('Walk', walk);
        Player.anim.assignAnimation('JumpIdle', jump);

        const idleNames = ['Idle', 'Idle 2', 'Idle 3'];
        const idleDurations = [idle1.duration, idle2.duration, idle3.duration];
        let idleIdx = 0;
        let idleTimer = null;
        let isWalking = false;

        function playIdle(idx, blend = 0.2) {
            idleIdx = idx;
            Player.anim.baseLayer.transition(idleNames[idleIdx], blend);
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                playIdle((idleIdx + 1) % idleNames.length);
            }, (idleDurations[idleIdx] || 2.0) * 1000);
        }

        playIdle(0, 0);

        Player.anim.setBoolean = (name, val) => {
            if (name !== 'Walk') return;
            if (val) {
                if (isWalking) return;
                isWalking = true;
                if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
                Player.anim.baseLayer.transition('Walk', 0.1);
            } else {
                if (!isWalking) return;
                isWalking = false;
                const pick = Math.floor(Math.random() * 3);
                playIdle(pick);
            }
        };

        Player.anim.setTrigger = (name) => {
            if (name === 'JumpIdle') {
                if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
                Player.anim.baseLayer.transition('JumpIdle', 0.15);
                const backDelay = (jump.duration || 1.0) * 1000;
                setTimeout(() => playIdle(0), backDelay);
                return;
            }

            if (name === 'JumpWalk') {
                if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
                Player.anim.baseLayer.transition('JumpIdle', 0.15);
                const backDelay = (jump.duration || 1.0) * 1000;
                setTimeout(() => Player.anim.baseLayer.transition('Walk', 0.1), backDelay);
                return;
            }

            if (name === 'Idle1Trigger') return playIdle(0);
            if (name === 'Idle2Trigger') return playIdle(1);
            if (name === 'Idle3Trigger') return playIdle(2);
        };

        Player.addComponent('script');
        Player.script.create('assignWomanMaterials');

        const Floor = new pc.Entity();
        Floor.setPosition(0.109, 0.117, 0);
        Floor.addComponent('render', {
            type: 'box',
            castShadows: false,
            castShadowsLightmap: false,
            receiveShadows: true,
            isStatic: true,
            layers: [floorLayer.id]
        });
        Floor.setLocalScale(4, 0.08, 2);
        Root.addChild(Floor);

        Floor.addComponent('script');
        Floor.script.create('ar-ground');

        Camera.addComponent('script');
        Camera.script.create('followCamera', {
            targetEntity: Point
        });

        Character.addComponent('script');
        Character.script.create('wallColliders');

        const Walls = new pc.Entity("Walls");
        Walls.addComponent('script');
        Walls.script.create('colliders');
        Root.addChild(Walls);

        const Coins = new pc.Entity("Coins");
        Coins.addComponent('script');
        Coins.script.create('coinSpawner', { coinAsset: assetMap.Coin });
        Root.addChild(Coins);

        document.getElementById("logo")?.remove();
        document.getElementById("click")?.remove();

        if (onSceneReady) {
            onSceneReady({ Coins, Character, Player });
        }
    }
}
