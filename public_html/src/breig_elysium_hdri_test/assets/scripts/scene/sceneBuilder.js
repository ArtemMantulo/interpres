import { GsplatRevealRadial } from '../../shaders/reveal-radial.js';
import {
    CAMERA_SETTINGS,
    ROOT_SETTINGS,
    HOME_PLANE_SETTINGS,
    REVEAL_SETTINGS,
    SCENE_GSPLAT_SETTINGS,
    START_SETTINGS,
    GALLERY_SETTINGS,
    AMENITIES_SETTINGS
} from '../config.js';
import { setGsplatBudgetCompat } from '../utils/functions.js';
import { ensureApartmentsLayer, ensureWaterLayer } from './environment.js';

export function applyRevealSettings(r) {
    const s = REVEAL_SETTINGS;
    r.enabled = s.enabled;
    r.center.set(...s.center);
    r.speed = s.speed;
    r.acceleration = s.acceleration;
    r.delay = s.delay;
    r.waveColorA = new pc.Color(...s.waveColorA);
    r.waveColorB = new pc.Color(...s.waveColorB);
    r.tintStrength = s.tintStrength;
    r.liftHeight = s.liftHeight;
    r.liftHeightStart = s.liftHeightStart;
    r.liftHeightEnd = s.liftHeightEnd;
    r.liftDuration = s.liftDuration;
    r.waveWidth = s.waveWidth;
    r.waveWidthStart = s.waveWidthStart;
    r.waveWidthEnd = s.waveWidthEnd;
    r.oscillationIntensity = s.oscillationIntensity;
    r.endRadius = s.endRadius;
}

export function applySceneGsplatSettings(app) {
    const s = SCENE_GSPLAT_SETTINGS;
    app.scene.gsplat.lodRangeMax = s.lodRangeMax;
    app.scene.gsplat.lodUpdateAngle = s.lodUpdateAngle;
    app.scene.gsplat.lodBehindPenalty = s.lodBehindPenalty;
    app.scene.gsplat.radialSorting = s.radialSorting;
    app.scene.gsplat.lodUpdateDistance = s.lodUpdateDistance;
    app.scene.gsplat.lodUnderfillLimit = s.lodUnderfillLimit;
}

export function applyStartSettings(app, gsplatComponent) {
    app.scene.gsplat.lodRangeMin = START_SETTINGS.lodMin;
    setGsplatBudgetCompat(gsplatComponent, START_SETTINGS.splatBudget);
    gsplatComponent.lodDistances = START_SETTINGS.lodDistances;
}

export function createScene(app, { assets, fpsLockerState, shouldRender }) {
    const root = new pc.Entity('Root');
    app.scene.ambientColor = new pc.Color(1, 1, 1);

    const cameraEntity = new pc.Entity('Camera');
    cameraEntity.setPosition(...CAMERA_SETTINGS.position);
    cameraEntity.setEulerAngles(...CAMERA_SETTINGS.euler);
    cameraEntity.addComponent('camera', {
        clearColor: new pc.Color(...CAMERA_SETTINGS.clearColor),
        fov: CAMERA_SETTINGS.fov
    });

    const waterLayer = ensureWaterLayer(app);
    const apartmentsLayer = ensureApartmentsLayer(app);
    if (cameraEntity.camera) {
        const waterLayerId = waterLayer?.id;
        const apartmentsLayerId = apartmentsLayer?.id;
        const layers = [pc.LAYERID_SKYBOX, pc.LAYERID_WORLD];
        if (waterLayerId !== undefined) layers.push(waterLayerId);
        if (apartmentsLayerId !== undefined) layers.push(apartmentsLayerId);
        cameraEntity.camera.layers = layers;
    }
    cameraEntity.addComponent('script');
    const orbit = cameraEntity.script.create('orbitCamera');
    root.addChild(cameraEntity);

    const planeEntity = new pc.Entity('Plane');
    planeEntity.setPosition(...HOME_PLANE_SETTINGS.position);
    planeEntity.setEulerAngles(...HOME_PLANE_SETTINGS.rotation);
    planeEntity.setLocalScale(...HOME_PLANE_SETTINGS.scale);
    planeEntity.addComponent('collision', {
        type: 'box',
        halfExtents: new pc.Vec3(...HOME_PLANE_SETTINGS.colliderHalfExtents)
    });
    root.addChild(planeEntity);

    const gsplatEntity = new pc.Entity('GSPlatCurrent');
    gsplatEntity.setPosition(...ROOT_SETTINGS.gsplatPosition);
    gsplatEntity.setEulerAngles(...ROOT_SETTINGS.gsplatEuler);
    gsplatEntity.addComponent('gsplat', { asset: assets.splatCurrent, unified: true });
    if (gsplatEntity.gsplat) gsplatEntity.gsplat.layers = [pc.LAYERID_WORLD];

    gsplatEntity.addComponent('script');
    const reveal = gsplatEntity.script.create(GsplatRevealRadial);
    applyRevealSettings(reveal);
    root.addChild(gsplatEntity);

    let waterMaterial = null;
    let waterEntityRef = null;

    if (assets.waterModel?.resource) {
        const waterEntity = assets.waterModel.resource.instantiateRenderEntity();
        waterEntity.name = 'Water';
        waterEntity.setLocalPosition(137, -4, -64);
        waterEntity.setEulerAngles(-90, 114, 0);
        waterEntity.enabled = false;

        const waterMat = new pc.StandardMaterial();
        waterMat.useMetalness = false;
        waterMat.metalness = 0;
        waterMat.specular = new pc.Color(0, 0, 0);
        waterMat.reflectivity = 0;
        waterMat.shininess = 0;
        waterMat.useSkybox = false;
        waterMat.useLighting = false;
        waterMat.useFog = false;
        waterMat.diffuse = new pc.Color(0.353, 0.502, 0.576);
        waterMat.ambient = new pc.Color(1, 1, 1);
        waterMat.emissive = waterMat.diffuse.clone();
        waterMat.blendType = pc.BLEND_NORMAL;
        waterMat.opacity = 0;
        waterMat.update();
        waterMaterial = waterMat;

        const renders = waterEntity.findComponents('render');
        renders.forEach((r) => r.meshInstances.forEach((mi) => (mi.material = waterMat)));
        if (waterEntity.render) waterEntity.render.meshInstances.forEach((mi) => (mi.material = waterMat));

        const waterLayerId = waterLayer?.id;
        if (waterLayerId !== undefined) {
            renders.forEach((r) => { if (r) r.layers = [waterLayerId]; });
            if (waterEntity.render) waterEntity.render.layers = [waterLayerId];
        }
        root.addChild(waterEntity);
        waterEntityRef = waterEntity;
    }

    root.addComponent('script');
    root.script.create('gallery', {
        attributes: { galleryTextAsset: assets.galleryCsv, ...GALLERY_SETTINGS }
    });
    root.script.create('amenitiesMode', {
        attributes: { fpsLockerState, ...AMENITIES_SETTINGS }
    });
    root.script.create('apartmentsMode');
    root.script.create('homeMode');
    const adjustPixelRatio = root.script.create('adjustPixelRatio');
    adjustPixelRatio.fpsLockerState = fpsLockerState;
    adjustPixelRatio.shouldRender = shouldRender;

    app.root.addChild(root);
    applySceneGsplatSettings(app);

    return {
        gsplatComponent: gsplatEntity.gsplat,
        orbit,
        reveal,
        waterMaterial,
        waterEntityRef
    };
}
