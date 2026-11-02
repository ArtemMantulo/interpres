(function () {
    if (window.ApartmentsVisualShared) return;

    const OUTLINE_LAYER_NAME = 'apartments-outline-mask';
    const OUTLINE_RT_NAME = 'ApartmentOutlineMaskRT';
    const OUTLINE_THICKNESS_DESKTOP = 2;
    const OUTLINE_THICKNESS_MOBILE = 2;

    class ApartmentsOutlineEffect extends pc.PostEffect {
        constructor(graphicsDevice, thickness) {
            super(graphicsDevice);

            const kernel = Math.max(1, Math.min(10, Math.round(thickness || 1)));
            const fragment = `
                #define THICKNESS ${kernel}
                uniform float uWidth;
                uniform float uHeight;
                uniform vec4 uOutlineCol;
                uniform sampler2D uColorBuffer;
                uniform sampler2D uOutlineTex;
                varying vec2 vUv0;

                float maskValue(vec4 c) {
                    return c.r;
                }

                void main(void) {
                    vec4 baseColor = texture2D(uColorBuffer, vUv0);
                    float center = maskValue(texture2D(uOutlineTex, vUv0));
                    float outline = 0.0;

                    if (center < 0.01) {
                        for (int x = -THICKNESS; x <= THICKNESS; x++) {
                            for (int y = -THICKNESS; y <= THICKNESS; y++) {
                                vec2 offset = vec2(float(x) / uWidth, float(y) / uHeight);
                                float sampleMask = maskValue(texture2D(uOutlineTex, vUv0 + offset));
                                outline = max(outline, step(0.01, sampleMask));
                            }
                        }
                    }

                    gl_FragColor = mix(baseColor, uOutlineCol, outline * uOutlineCol.a);
                }
            `;

            this.shader = pc.ShaderUtils.createShader(graphicsDevice, {
                uniqueName: `ApartmentsOutlineShader${kernel}`,
                attributes: { aPosition: pc.SEMANTIC_POSITION },
                vertexGLSL: pc.PostEffect.quadVertexShader,
                fragmentGLSL: fragment
            });

            this.color = new pc.Color(0.25, 0.95, 0.35, 0.9);
            this.texture = null;
            this._outlineColorData = new Float32Array(4);
        }

        render(inputTarget, outputTarget, rect) {
            const scope = this.device.scope;
            const maskW = this.texture?.width || inputTarget.width;
            const maskH = this.texture?.height || inputTarget.height;

            this._outlineColorData[0] = this.color.r;
            this._outlineColorData[1] = this.color.g;
            this._outlineColorData[2] = this.color.b;
            this._outlineColorData[3] = this.color.a;

            scope.resolve('uWidth').setValue(maskW);
            scope.resolve('uHeight').setValue(maskH);
            scope.resolve('uOutlineCol').setValue(this._outlineColorData);
            scope.resolve('uColorBuffer').setValue(inputTarget.colorBuffer);
            scope.resolve('uOutlineTex').setValue(this.texture);

            this.drawQuad(outputTarget, this.shader, rect);
        }
    }

    function getOrCreateVisualLayerId(ctx) {
        if (isFinite(ctx._visualLayerId)) return ctx._visualLayerId;

        const layers = ctx.app?.scene?.layers;
        if (!layers) return NaN;

        const layer = layers.getLayerByName ? layers.getLayerByName('apartments') : null;
        if (!layer) return NaN;

        ctx._visualLayerId = layer.id;
        return ctx._visualLayerId;
    }

    function getOrCreateVisualOutlineMaskLayerId(ctx) {
        if (isFinite(ctx._visualOutlineMaskLayerId)) return ctx._visualOutlineMaskLayerId;

        const layers = ctx.app?.scene?.layers;
        if (!layers) return NaN;

        let layer = layers.getLayerByName ? layers.getLayerByName(OUTLINE_LAYER_NAME) : null;
        if (!layer) {
            layer = new pc.Layer({ name: OUTLINE_LAYER_NAME });
            const list = layers.layerList || layers.layers || layers._layers || [];
            const insertIndex = Array.isArray(list) ? list.length : 0;

            if (layers.insert) layers.insert(layer, insertIndex);
            else if (layers.addLayer) layers.addLayer(layer);
            else if (Array.isArray(list)) list.splice(insertIndex, 0, layer);
        }

        layer.clearColorBuffer = true;
        layer.clearDepthBuffer = true;
        layer.clearStencilBuffer = false;

        ctx._visualOutlineMaskLayer = layer;
        ctx._visualOutlineMaskLayerId = layer.id;
        return ctx._visualOutlineMaskLayerId;
    }

    function getOutlineTargetSize(ctx) {
        const device = ctx.app?.graphicsDevice;
        const canvas = device?.canvas;

        const width = Math.max(
            1,
            (canvas?.width || 0) | 0,
            (device?.width || 0) | 0
        );
        const height = Math.max(
            1,
            (canvas?.height || 0) | 0,
            (device?.height || 0) | 0
        );

        return { width, height };
    }

    function createVisualOutlineRenderTarget(ctx) {
        const device = ctx.app?.graphicsDevice;
        if (!device) return null;

        const size = getOutlineTargetSize(ctx);
        const supportsR8 = device.isWebGL2 && !/(iPad|iPhone|iPod)/i.test(navigator.userAgent);
        const texture = new pc.Texture(device, {
            name: OUTLINE_RT_NAME,
            width: size.width,
            height: size.height,
            format: supportsR8 ? pc.PIXELFORMAT_R8 : pc.PIXELFORMAT_RGBA8,
            mipmaps: false,
            minFilter: pc.FILTER_LINEAR,
            magFilter: pc.FILTER_LINEAR
        });

        const renderTarget = new pc.RenderTarget({
            colorBuffer: texture,
            depth: true,
            stencil: false
        });

        ctx._visualOutlineRtTexture = texture;
        ctx._visualOutlineRt = renderTarget;
        return renderTarget;
    }

    function destroyVisualOutlineRenderTarget(ctx) {
        const renderTarget = ctx._visualOutlineRt;
        const texture = ctx._visualOutlineRtTexture;

        if (renderTarget) {
            renderTarget.destroy();
            ctx._visualOutlineRt = null;
        }

        if (texture && texture !== renderTarget?.colorBuffer) texture.destroy();
        ctx._visualOutlineRtTexture = null;
    }

    function copyCameraRect(targetRect, sourceRect) {
        if (!targetRect || !sourceRect) return;
        if (typeof targetRect.copy === 'function') targetRect.copy(sourceRect);
        else {
            targetRect.x = sourceRect.x;
            targetRect.y = sourceRect.y;
            targetRect.z = sourceRect.z;
            targetRect.w = sourceRect.w;
        }
    }

    function syncVisualOutlineCameraState(ctx) {
        const mainCamera = ctx.cameraEntity?.camera;
        const outlineCamera = ctx._visualOutlineCamera?.camera;
        if (!mainCamera || !outlineCamera) return;

        outlineCamera.projection = mainCamera.projection;
        outlineCamera.horizontalFov = mainCamera.horizontalFov;
        outlineCamera.aspectRatio = mainCamera.aspectRatio;
        outlineCamera.aspectRatioMode = mainCamera.aspectRatioMode;
        outlineCamera.fov = mainCamera.fov;
        outlineCamera.orthoHeight = mainCamera.orthoHeight;
        outlineCamera.nearClip = mainCamera.nearClip;
        outlineCamera.farClip = mainCamera.farClip;

        if (mainCamera.rect && outlineCamera.rect) copyCameraRect(outlineCamera.rect, mainCamera.rect);
        if (mainCamera.scissorRect && outlineCamera.scissorRect) {
            copyCameraRect(outlineCamera.scissorRect, mainCamera.scissorRect);
        }
    }

    function ensureVisualOutlineRenderTargetSize(ctx) {
        if (!ctx._visualOutlineCamera?.camera || !ctx._visualOutlineEffect) return;

        const size = getOutlineTargetSize(ctx);
        const currentWidth = ctx._visualOutlineRtTexture?.width || 0;
        const currentHeight = ctx._visualOutlineRtTexture?.height || 0;
        if (currentWidth === size.width && currentHeight === size.height && ctx._visualOutlineRt) return;

        destroyVisualOutlineRenderTarget(ctx);

        const renderTarget = createVisualOutlineRenderTarget(ctx);
        if (!renderTarget) return;

        ctx._visualOutlineCamera.camera.renderTarget = renderTarget;
        ctx._visualOutlineEffect.texture = renderTarget.colorBuffer;
    }

    function ensureVisualOutlinePipeline(ctx) {
        const mainCamera = ctx.cameraEntity?.camera;
        if (!mainCamera || !mainCamera.postEffects) return false;

        if (!ctx._visualOutlineCamera) {
            const layerId = getOrCreateVisualOutlineMaskLayerId(ctx);
            if (!isFinite(layerId)) return false;

            const renderTarget = createVisualOutlineRenderTarget(ctx);
            if (!renderTarget) return false;

            const outlineCameraEntity = new pc.Entity('ApartmentsOutlineCamera');
            outlineCameraEntity.addComponent('camera', {
                clearColor: new pc.Color(0, 0, 0, 0),
                projection: mainCamera.projection,
                fov: mainCamera.fov,
                nearClip: mainCamera.nearClip,
                farClip: mainCamera.farClip,
                priority: (mainCamera.priority | 0) - 1,
                layers: [layerId],
                renderTarget
            });
            outlineCameraEntity.enabled = false;
            ctx.cameraEntity.addChild(outlineCameraEntity);
            ctx._visualOutlineCamera = outlineCameraEntity;
        }

        if (!ctx._visualOutlineEffect) {
            ctx._visualOutlineEffect = new ApartmentsOutlineEffect(
                ctx.app.graphicsDevice,
                window.AppDetect?.isMobile?.() ? OUTLINE_THICKNESS_MOBILE : OUTLINE_THICKNESS_DESKTOP
            );
            ctx._visualOutlineEffect.texture = ctx._visualOutlineRt?.colorBuffer || null;
            ctx._visualOutlineEffect.color = new pc.Color(0.25, 0.95, 0.35, 0.92);
        }

        syncVisualOutlineCameraState(ctx);
        ensureVisualOutlineRenderTargetSize(ctx);
        return true;
    }

    function setVisualOutlineActive(ctx, active) {
        if (ctx._visualOutlineCamera) ctx._visualOutlineCamera.enabled = !!active;

        if (active) {
            syncVisualOutlineCameraState(ctx);
            ensureVisualOutlineRenderTargetSize(ctx);

            if (ctx._visualOutlineEffect) ctx._visualOutlineEffect.color.a = 0.92;

            const mainCamera = ctx.cameraEntity?.camera;
            if (!ctx._visualOutlineEffectAttached && mainCamera?.postEffects && ctx._visualOutlineEffect) {
                mainCamera.postEffects.addEffect(ctx._visualOutlineEffect);
                ctx._visualOutlineEffectAttached = true;
            }
        } else {
            const mainCamera = ctx.cameraEntity?.camera;
            if (ctx._visualOutlineEffectAttached && mainCamera?.postEffects && ctx._visualOutlineEffect) {
                mainCamera.postEffects.removeEffect(ctx._visualOutlineEffect);
                ctx._visualOutlineEffectAttached = false;
            }

            if (ctx._visualOutlineEffect) ctx._visualOutlineEffect.color.a = 0;
        }
    }

    function destroyVisualOutlinePipeline(ctx) {
        const mainCamera = ctx.cameraEntity?.camera;
        if (ctx._visualOutlineEffectAttached && mainCamera?.postEffects && ctx._visualOutlineEffect) {
            mainCamera.postEffects.removeEffect(ctx._visualOutlineEffect);
        }

        ctx._visualOutlineEffectAttached = false;
        ctx._visualOutlineEffect = null;

        if (ctx._visualOutlineCamera) {
            if (ctx._visualOutlineCamera.parent) ctx._visualOutlineCamera.parent.removeChild(ctx._visualOutlineCamera);
            ctx._visualOutlineCamera.destroy();
            ctx._visualOutlineCamera = null;
        }

        destroyVisualOutlineRenderTarget(ctx);
        ctx._visualOutlineMaskLayer = null;
        ctx._visualOutlineMaskLayerId = NaN;
    }

    function getVisualMaterial(ctx) {
        if (ctx._visualMaterial) return ctx._visualMaterial;

        const material = new pc.StandardMaterial();
        material.useLighting = false;
        material.useFog = false;
        material.useSkybox = false;
        material.diffuse = new pc.Color(0.25, 0.95, 0.35);
        material.emissive = new pc.Color(0.25, 0.95, 0.35);
        material.blendType = pc.BLEND_NORMAL;
        material.opacity = 0.7;
        material.depthTest = true;
        material.depthWrite = true;
        material.update();

        ctx._visualMaterial = material;
        return material;
    }

    function applyVisualStyleToEntity(ctx, entity, materialOverride) {
        if (!entity) return;

        const layerId = getOrCreateVisualLayerId(ctx);
        const material = materialOverride || getVisualMaterial(ctx);
        const renderers = entity.findComponents('render');

        renderers.forEach((renderer) => {
            renderer.meshInstances.forEach((meshInstance) => {
                meshInstance.material = material;
            });
            if (isFinite(layerId)) renderer.layers = [layerId];
        });

        if (entity.render && !renderers.includes(entity.render)) {
            entity.render.meshInstances.forEach((meshInstance) => {
                meshInstance.material = material;
            });
            if (isFinite(layerId)) entity.render.layers = [layerId];
        }
    }

    function addLayerToEntityRenderers(ctx, entity, layerId) {
        if (!entity || !isFinite(layerId)) return;

        const renderers = entity.findComponents('render');
        renderers.forEach((renderer) => {
            const current = Array.isArray(renderer.layers) ? renderer.layers.slice() : [];
            if (!current.includes(layerId)) renderer.layers = current.concat([layerId]);
        });

        if (entity.render && !renderers.includes(entity.render)) {
            const current = Array.isArray(entity.render.layers) ? entity.render.layers.slice() : [];
            if (!current.includes(layerId)) entity.render.layers = current.concat([layerId]);
        }
    }

    function getOrCreateVisualAsset(ctx, url) {
        const source = String(url || '').trim();
        if (!source) return null;
        if (ctx._visualAssetCache.has(source)) return ctx._visualAssetCache.get(source);

        let asset = ctx.app.assets.find(source, 'container');
        if (!asset) {
            asset = new pc.Asset(`apartment-visual:${source}`, 'container', { url: source });
            ctx.app.assets.add(asset);
        }

        ctx._visualAssetCache.set(source, asset);
        return asset;
    }

    function loadVisualAsset(ctx, url, done) {
        const asset = getOrCreateVisualAsset(ctx, url);
        if (!asset) {
            done?.(null);
            return;
        }

        if (asset.resource) {
            done?.(asset);
            return;
        }

        const onLoad = (loadedAsset) => {
            if (loadedAsset !== asset) return;
            cleanup();
            done?.(asset);
        };

        const onError = (_err, failedAsset) => {
            if (failedAsset !== asset) return;
            cleanup();
            console.warn('Apartment visual load failed:', asset?.file?.url || url);
            done?.(null);
        };

        const cleanup = () => {
            ctx.app.assets.off('load', onLoad);
            ctx.app.assets.off('error', onError);
        };

        ctx.app.assets.on('load', onLoad);
        ctx.app.assets.on('error', onError);
        ctx.app.assets.load(asset);
    }

    function destroyVisualEntity(ctx) {
        if (ctx._visualOutlineEntity) {
            if (ctx._visualOutlineEntity.parent) ctx._visualOutlineEntity.parent.removeChild(ctx._visualOutlineEntity);
            ctx._visualOutlineEntity.destroy();
            ctx._visualOutlineEntity = null;
        }

        if (!ctx._visualEntity) return;
        if (ctx._visualEntity.parent) ctx._visualEntity.parent.removeChild(ctx._visualEntity);
        ctx._visualEntity.destroy();
        ctx._visualEntity = null;
    }

    function clearSelectedVisualOverlay(ctx) {
        ctx._visualLoadToken++;
        ctx._visualActiveKey = '';
        destroyVisualEntity(ctx);
        setVisualOutlineActive(ctx, false);
        ctx.app.fire('apartments:visualMaterial', null);
    }

    function syncSelectedVisualOverlay(ctx) {
        if (!ctx._active || !ctx._selectedApartment) {
            clearSelectedVisualOverlay(ctx);
            return;
        }

        const apartmentData = ctx.getSelectedApartmentData();
        const visual = String(apartmentData?.visual || '').trim();
        const position = apartmentData?.visualPosition;
        const rotation = apartmentData?.visualRotation;

        const validPosition =
            Array.isArray(position) &&
            position.length >= 3 &&
            isFinite(position[0]) &&
            isFinite(position[1]) &&
            isFinite(position[2]);
        const validRotation =
            Array.isArray(rotation) &&
            rotation.length >= 3 &&
            isFinite(rotation[0]) &&
            isFinite(rotation[1]) &&
            isFinite(rotation[2]);

        if (!visual || !validPosition || !validRotation) {
            clearSelectedVisualOverlay(ctx);
            return;
        }

        if (!ensureVisualOutlinePipeline(ctx)) {
            clearSelectedVisualOverlay(ctx);
            return;
        }

        const key = `${visual}|${position[0]},${position[1]},${position[2]}|${rotation[0]},${rotation[1]},${rotation[2]}`;
        if (key === ctx._visualActiveKey && ctx._visualEntity) {
            syncVisualOutlineCameraState(ctx);
            ensureVisualOutlineRenderTargetSize(ctx);
            return;
        }

        const token = ++ctx._visualLoadToken;
        ctx._visualActiveKey = key;
        destroyVisualEntity(ctx);
        setVisualOutlineActive(ctx, false);

        loadVisualAsset(ctx, visual, (asset) => {
            if (token !== ctx._visualLoadToken) return;

            if (!asset?.resource) {
                clearSelectedVisualOverlay(ctx);
                return;
            }

            const entity = asset.resource.instantiateRenderEntity();
            entity.name = 'ApartmentVisualCurrent';
            entity.setLocalPosition(position[0], position[1], position[2]);
            entity.setEulerAngles(rotation[0], rotation[1], rotation[2]);

            applyVisualStyleToEntity(ctx, entity, getVisualMaterial(ctx));

            const outlineMaskLayerId = getOrCreateVisualOutlineMaskLayerId(ctx);
            addLayerToEntityRenderers(ctx, entity, outlineMaskLayerId);

            ctx.entity.addChild(entity);
            ctx._visualEntity = entity;

            setVisualOutlineActive(ctx, true);
            ctx.app.fire('apartments:visualMaterial', getVisualMaterial(ctx));
            ctx._forceDomUpdate = true;
            window.PcScriptShared?.requestRenderFrame?.(ctx.app);
        });
    }

    window.ApartmentsVisualShared = {
        getOrCreateVisualLayerId,
        getOrCreateVisualOutlineMaskLayerId,
        createVisualOutlineRenderTarget,
        destroyVisualOutlineRenderTarget,
        ensureVisualOutlineRenderTargetSize,
        ensureVisualOutlinePipeline,
        setVisualOutlineActive,
        destroyVisualOutlinePipeline,
        getVisualMaterial,
        applyVisualStyleToEntity,
        addLayerToEntityRenderers,
        getOrCreateVisualAsset,
        loadVisualAsset,
        destroyVisualEntity,
        clearSelectedVisualOverlay,
        syncSelectedVisualOverlay
    };
})();
