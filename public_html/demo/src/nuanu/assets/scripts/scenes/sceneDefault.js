export function startApp(onSceneReady, app, assetMap) {
  createScene(onSceneReady);

  function createScene(onSceneReady) {
    const layers = app.scene.layers;
    const worldLayer = layers.getLayerByName('World');

    let characterLayer = layers.getLayerByName('Character');
    if (!characterLayer) characterLayer = new pc.Layer({ name: 'Character' });
    characterLayer.opaque = true;
    characterLayer.transparent = true;

    let floorLayer = layers.getLayerByName('Floor');
    if (!floorLayer) floorLayer = new pc.Layer({ name: 'Floor' });
    floorLayer.opaque = false;
    floorLayer.transparent = true;

    layers.removeOpaque(characterLayer);
    const wOpaqueIdx = layers.getOpaqueIndex(worldLayer);
    layers.insertOpaque(characterLayer, wOpaqueIdx + 1);
    layers.insertTransparent(floorLayer, 0);
    layers.insertTransparent(characterLayer, 1);
    layers.insertTransparent(worldLayer, 2);

    app.scene.ambientLight = new pc.Color(0.8, 0.8, 0.8);

    const Root = new pc.Entity('Root');
    app.root.addChild(Root);

    const Camera = new pc.Entity('Camera');
    Camera.setPosition(0.366, 3.359, 3.75);
    Camera.setEulerAngles(-45, 27.6, 0);
    Camera.addComponent('camera', {
      clearColor: new pc.Color(0.26, 0.26, 0.26),
      farClip: 100,
      fov: 50,
      frustumCulling: true,
      layers: [worldLayer.id, floorLayer.id, characterLayer.id]
    });
    Root.addChild(Camera);

    const Light = new pc.Entity();
    Light.setPosition(0, 0, 0);
    Light.setEulerAngles(-32, 0, -9);
    Light.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1, 1, 1),
      isStatic: true,
      intensity: 1,
      castShadows: true,
      affectDynamic: true,
      affectSpecular: true,
      shadowResolution: 2048,
      shadowIntensity: 0.7,
      shadowDistance: 20,
      shadowType: pc.SHADOW_PCF3,
      shadowBias: 0.2,
      normalOffsetBias: 0.05,
      layers: [characterLayer.id, floorLayer.id]
    });
    Root.addChild(Light);

    const Gsplat = new pc.Entity();
    Gsplat.setPosition(0, 0, 0);
    Gsplat.setEulerAngles(180, 0, 0);
    Gsplat.addComponent('gsplat', { asset: assetMap.GSplat, layers: [worldLayer.id] });
    Root.addChild(Gsplat);

    const Character = new pc.Entity();
    Character.setPosition(3.104, 0.137, 5.373);
    Character.tags.add('Player');
    Root.addChild(Character);

    Character.addComponent('collision', { type: 'capsule', radius: 0.2, height: 0.9, linearOffset: [0, 0.433, 0], axis: 1 });
    Character.addComponent('rigidbody', { type: 'dynamic', mass: 1, linearDamping: 0, angularDamping: 0, linearFactor: [1, 1, 1], angularFactor: [0, 0, 0], friction: 0.55, restitution: 0 });

    const Point = new pc.Entity('Point');
    Point.tags.add('Point');
    Character.addChild(Point);
    Point.setLocalPosition(0, 0.581, 0);

    const Player = assetMap.Woman.resource.instantiateRenderEntity();
    Player.setLocalScale(1, 1, 1);
    Character.addChild(Player);
    Player.addComponent('anim', { activate: true });

    const idle1 = assetMap.idle_1.resource.animations[0].resource;
    const idle2 = assetMap.idle_2.resource.animations[0].resource;
    const idle3 = assetMap.idle_3.resource.animations[0].resource;
    const walk = assetMap.Walk.resource.animations[0].resource;
    const jump = assetMap.Jump.resource.animations[0].resource;
    const run = assetMap.Run.resource.animations[0].resource;
    const slide = assetMap.Slide.resource.animations[0].resource;

    Player.anim.assignAnimation('Idle', idle1);
    Player.anim.assignAnimation('Idle 2', idle2);
    Player.anim.assignAnimation('Idle 3', idle3);
    Player.anim.assignAnimation('Walk', walk);
    Player.anim.assignAnimation('JumpIdle', jump);
    Player.anim.assignAnimation('Run', run);
    Player.anim.assignAnimation('Slide', slide);

    const STATE_SPEED = {
      'Idle': 1, 'Idle 2': 1, 'Idle 3': 1,
      'Walk': 1, 'Run': 1, 'JumpIdle': 1, 'Slide': 1
    };

    const idleNames = ['Idle', 'Idle 2', 'Idle 3'];
    const idleDurations = [idle1.duration, idle2.duration, idle3.duration];

    let idleIdx = 0;
    let idleTimer = null;
    let isWalking = false;
    let isRunning = false;
    let current = null;
    let pendingTimeout = null;

    function clearPending() {
      if (pendingTimeout) { clearTimeout(pendingTimeout); pendingTimeout = null; }
    }
    function setLayerSpeed(name) {
      Player.anim.baseLayer.speed = STATE_SPEED[name] ?? 1;
    }
    function transition(to, blend = 0.2) {
      clearPending();
      current = to;
      setLayerSpeed(to);
      Player.anim.baseLayer.transition(to, blend);
    }
    function playIdle(idx, blend = 0.2) {
      idleIdx = idx;
      transition(idleNames[idleIdx], blend);
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        playIdle((idleIdx + 1) % idleNames.length);
      }, (idleDurations[idleIdx] || 2.0) * 1000);
    }
    playIdle(0, 0);

    Player.anim.setBoolean = (name, val) => {
      if (name === 'Walk') {
        if (val) {
          if (!isWalking && !isRunning) {
            isWalking = true;
            if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
            transition('Walk', 0.1);
          }
        } else {
          if (isWalking) {
            isWalking = false;
            if (!isRunning) {
              const pick = Math.floor(Math.random() * 3);
              playIdle(pick, 0.2);
            }
          }
        }
        return;
      }
      if (name === 'Run') {
        if (val) {
          if (!isRunning) {
            isRunning = true;
            if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
            if (current === 'JumpIdle') {
              clearPending();
              pendingTimeout = setTimeout(() => {
                transition('Run', 0.6);
              }, (jump.duration || 1.0) * 1000);
            } else {
              transition('Run', current === 'Slide' ? 0.2 : 0.6);
            }
            isWalking = false;
          }
        } else {
          if (isRunning) {
            isRunning = false;
            if (isWalking) {
              transition('Walk', 0.2);
            } else {
              const pick = Math.floor(Math.random() * 3);
              playIdle(pick, 0.2);
            }
          }
        }
        return;
      }
    };

    Player.anim.setTrigger = (name) => {
      if (name === 'JumpIdle') {
        if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
        transition('JumpIdle', 0.15);
        clearPending();
        pendingTimeout = setTimeout(() => {
          if (isRunning) {
            transition('Run', 0.2);
          } else if (isWalking) {
            transition('Walk', 0.2);
          } else {
            const pick = Math.floor(Math.random() * 3);
            playIdle(pick, 0.2);
          }
        }, (jump.duration || 1.0) * 1000);
        return;
      }

      if (name === 'JumpWalk') {
        if (isRunning) {
          if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
          transition('Slide', 0.2);
          clearPending();
          pendingTimeout = setTimeout(() => {
            if (isRunning && !isWalking) {
              transition('Run', 0.2);
            } else if (!isRunning && !isWalking) {
              const pick = Math.floor(Math.random() * 3);
              playIdle(pick, 0.2);
            } else if (isWalking && !isRunning) {
              transition('Walk', 0.2);
            } else {
              const pick = Math.floor(Math.random() * 3);
              playIdle(pick, 0.2);
            }
          }, (slide.duration || 1.0) * 1000);
        } else if (isWalking) {
          if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
          transition('JumpIdle', 0.2);
          clearPending();
          pendingTimeout = setTimeout(() => {
            transition('Walk', 0.1);
          }, (jump.duration || 1.0) * 1000);
        } else {
          if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
          transition('JumpIdle', 0.15);
          clearPending();
          pendingTimeout = setTimeout(() => {
            const pick = Math.floor(Math.random() * 3);
            playIdle(pick, 0.2);
          }, (jump.duration || 1.0) * 1000);
        }
        return;
      }

      if (name === 'Idle1Trigger' || name === 'Idle2Trigger' || name === 'Idle3Trigger') {
        const map = { Idle1Trigger: 0, Idle2Trigger: 1, Idle3Trigger: 2 };
        const idx = map[name];
        if (!isWalking && !isRunning) {
          playIdle(idx, 0.2);
        } else if (isRunning) {
          isRunning = false;
          isWalking = false;
          playIdle(idx, 0.2);
        } else if (isWalking) {
          isWalking = false;
          playIdle(idx, 0.2);
        }
        return;
      }
    };

    Player.addComponent('script');
    Player.script.create('assignWomanMaterials');

    const Floor = assetMap.Floor.resource.instantiateRenderEntity();
    Root.addChild(Floor);
    Floor.setPosition(0.477, 0.83, 3.747);

    const rc = Floor.findComponents('render')[0];
    const ent = rc.entity;
    rc.layers = [floorLayer.id];
    rc.castShadows = false;
    rc.receiveShadows = true;
    ent.addComponent('collision', { type: 'mesh', renderAsset: rc.asset, convex: false });
    ent.addComponent('rigidbody', { type: 'static', friction: 1, restitution: 0 });
    ent.addComponent('script');
    ent.script.create('ar-ground');

    Camera.addComponent('script');
    Camera.script.create('followCamera', { targetEntity: Point });

    const Walls = new pc.Entity('Walls');
    Root.addChild(Walls);
    Walls.addComponent('script');
    Walls.script.create('colliders');

    const Coins = new pc.Entity('Coins');
    Root.addChild(Coins);
    Coins.addComponent('script');
    Coins.script.create('coinSpawner', { coinAsset: assetMap.Coin });

    document.getElementById('logo')?.remove();
    document.getElementById('click')?.remove();

    if (onSceneReady) onSceneReady({ Coins, Character, Player });
  }
}