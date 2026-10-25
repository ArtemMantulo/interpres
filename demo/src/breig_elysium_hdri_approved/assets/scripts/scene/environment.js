export function ensureWaterLayer(app) {
    const layers = app.scene.layers;
    let layer = layers.getLayerByName ? layers.getLayerByName('Water') : null;
    if (!layer) {
        layer = new pc.Layer({ name: 'Water' });
        const list = layers.layerList || layers.layers || layers._layers || [];
        const worldLayer = layers.getLayerById ? layers.getLayerById(pc.LAYERID_WORLD) : null;
        const worldIdx = worldLayer ? list.indexOf(worldLayer) : -1;
        const insertIdx = worldIdx >= 0 ? worldIdx + 1 : list.length;
        if (layers.insert) layers.insert(layer, insertIdx);
        else if (layers.addLayer) layers.addLayer(layer);
        else if (Array.isArray(list)) list.splice(insertIdx, 0, layer);
    }
    return layer;
}

export function fadeInWater(app, waterMaterial, waterEntityRef, duration = 1000) {
    if (!waterMaterial) return;
    if (waterEntityRef) waterEntityRef.enabled = true;
    const start = performance.now();
    const step = (now) => {
        const t = Math.min((now - start) / duration, 1);
        waterMaterial.opacity = t;
        waterMaterial.update();
        if (!app.autoRender && 'renderNextFrame' in app) app.renderNextFrame = true;
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

export function applySkyboxInfinite(app, hdriAsset) {
    const hdri = hdriAsset?.resource;
    if (!hdri) return;
    const skybox = pc.EnvLighting.generateSkyboxCubemap(hdri);
    app.scene.skybox = skybox;
    const lighting = pc.EnvLighting.generateLightingSource(hdri);
    app.scene.envAtlas = pc.EnvLighting.generateAtlas(lighting);
    lighting.destroy();
    app.scene.sky.type = pc.SKYTYPE_INFINITE;
    app.scene.skyboxIntensity = 1.2;
    app.scene.skyboxRotation = new pc.Quat().setFromEulerAngles(0, -10, 0);
    app.scene.skyboxMip = 0;
}
