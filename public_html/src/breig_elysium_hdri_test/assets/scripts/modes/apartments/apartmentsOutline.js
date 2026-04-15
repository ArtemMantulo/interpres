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
            this._outlineColorData[0] = this.color.r;
            this._outlineColorData[1] = this.color.g;
            this._outlineColorData[2] = this.color.b;
            this._outlineColorData[3] = this.color.a;
            const maskW = this.texture?.width || inputTarget.width;
            const maskH = this.texture?.height || inputTarget.height;
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
            const insertIdx = Array.isArray(list) ? list.length : 0;
            if (layers.insert) layers.insert(layer, insertIdx);
            else if (layers.addLayer) layers.addLayer(layer);
            else if (Array.isArray(list)) list.splice(insertIdx, 0, layer);
        }

        layer.clearColorBuffer = true;
        layer.clearDepthBuffer = true;
        layer.clearStencilBuffer = false;
        ctx._visualOutlineMaskLayer = layer;
        ctx._visualOutlineMaskLayerId = layer.id;
        return ctx._visualOutlineMaskLayerId;
    }

    function createVisualOutlineRenderTarget(ctx) {
        const device = ctx.app?.graphicsDevice;
        if (!device) return null;
        const width = Math.max(1, device.width | 0);
        const height = Math.max(1, device.height | 0);
        const texture = new pc.Texture(device, {
            name: OUTLINE_RT_NAME,
            width,
            height,
            format: pc.PIXELFORMAT_R8,
            mipmaps: false,
            minFilter: pc.FILTER_LINEAR,
            magFilter: pc.FILTER_LINEAR
        });
        const rt = new pc.RenderTarget({
            colorBuffer: texture,
            depth: true,
            stencil: false
        });
        ctx._visualOutlineRtTexture = texture;
        ctx._visualOutlineRt = rt;
        return rt;
    }

    function destroyVisualOutlineRenderTarget(ctx) {
        const rt = ctx._visualOutlineRt;
        const texture = ctx._visualOutlineRtTexture;
        if (ctx._visualOutlineRt) {
            ctx._visualOutlineRt.destroy();
            ctx._visualOutlineRt = null;
        }
        if (texture && texture !== rt?.colorBuffer) {
            texture.destroy();
        }
        ctx._visualOutlineRtTexture = null;
    }

    function ensureVisualOutlineRenderTargetSize(ctx) {
        if (!ctx._visualOutlineCamera?.camera || !ctx._visualOutlineEffect) return;
        const device = ctx.app?.graphicsDevice;
        if (!device) return;
        const nextW = Math.max(1, device.width | 0);
        const nextH = Math.max(1, device.height | 0);
        const currentW = ctx._visualOutlineRtTexture?.width || 0;
        const currentH = ctx._visualOutlineRtTexture?.height || 0;
        if (currentW === nextW && currentH === nextH && ctx._visualOutlineRt) return;

        destroyVisualOutlineRenderTarget(ctx);
        const rt = createVisualOutlineRenderTarget(ctx);
        if (!rt) return;
        ctx._visualOutlineCamera.camera.renderTarget = rt;
        ctx._visualOutlineEffect.texture = rt.colorBuffer;
    }

    function ensureVisualOutlinePipeline(ctx) {
        const mainCamera = ctx.cameraEntity?.camera;
        if (!mainCamera || !mainCamera.postEffects) return false;

        if (!ctx._visualOutlineCamera) {
            const layerId = getOrCreateVisualOutlineMaskLayerId(ctx);
            if (!isFinite(layerId)) return false;
            const rt = createVisualOutlineRenderTarget(ctx);
            if (!rt) return false;

            const outlineCameraEntity = new pc.Entity('ApartmentsOutlineCamera');
            outlineCameraEntity.addComponent('camera', {
                clearColor: new pc.Color(0, 0, 0, 0),
                projection: mainCamera.projection,
                fov: mainCamera.fov,
                nearClip: mainCamera.nearClip,
                farClip: mainCamera.farClip,
                priority: (mainCamera.priority | 0) - 1,
                layers: [layerId],
                renderTarget: rt
            });
            outlineCameraEntity.enabled = false;
            ctx.cameraEntity.addChild(outlineCameraEntity);
            ctx._visualOutlineCamera = outlineCameraEntity;
        }

        if (!ctx._visualOutlineEffect) {
            ctx._visualOutlineEffect = new ApartmentsOutlineEffect(
                ctx.app.graphicsDevice,
                (window.AppDetect?.isMobile?.() ? OUTLINE_THICKNESS_MOBILE : OUTLINE_THICKNESS_DESKTOP)
            );
            ctx._visualOutlineEffect.texture = ctx._visualOutlineRt?.colorBuffer || null;
            ctx._visualOutlineEffect.color = new pc.Color(0.25, 0.95, 0.35, 0.92);
        }

        const outlineCamera = ctx._visualOutlineCamera?.camera;
        if (outlineCamera) {
            outlineCamera.projection = mainCamera.projection;
            outlineCamera.fov = mainCamera.fov;
            outlineCamera.nearClip = mainCamera.nearClip;
            outlineCamera.farClip = mainCamera.farClip;
        }

        ensureVisualOutlineRenderTargetSize(ctx);
        return true;
    }

    function setVisualOutlineActive(ctx, active) {
        if (ctx._visualOutlineCamera) {
            ctx._visualOutlineCamera.enabled = !!active;
        }

        if (active) {
            if (ctx._visualOutlineEffect) {
                ctx._visualOutlineEffect.color.a = 0.92;
            }
            const mainCamera = ctx.cameraEntity?.camera;
            if (
                !ctx._visualOutlineEffectAttached &&
                mainCamera?.postEffects &&
                ctx._visualOutlineEffect
            ) {
                mainCamera.postEffects.addEffect(ctx._visualOutlineEffect);
                ctx._visualOutlineEffectAttached = true;
            }
        } else {
            const mainCamera = ctx.cameraEntity?.camera;
            if (
                ctx._visualOutlineEffectAttached &&
                mainCamera?.postEffects &&
                ctx._visualOutlineEffect
            ) {
                mainCamera.postEffects.removeEffect(ctx._visualOutlineEffect);
                ctx._visualOutlineEffectAttached = false;
            }
            if (ctx._visualOutlineEffect) {
                ctx._visualOutlineEffect.color.a = 0;
            }
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
            if (ctx._visualOutlineCamera.parent) {
                ctx._visualOutlineCamera.parent.removeChild(ctx._visualOutlineCamera);
            }
            ctx._visualOutlineCamera.destroy();
            ctx._visualOutlineCamera = null;
        }

        destroyVisualOutlineRenderTarget(ctx);
        ctx._visualOutlineMaskLayer = null;
        ctx._visualOutlineMaskLayerId = NaN;
    }

    function getVisualMaterial(ctx) {
        if (ctx._visualMaterial) return ctx._visualMaterial;
        const mat = new pc.StandardMaterial();
        mat.useLighting = false;
        mat.useFog = false;
        mat.useSkybox = false;
        mat.diffuse = new pc.Color(0.25, 0.95, 0.35);
        mat.emissive = new pc.Color(0.25, 0.95, 0.35);
        mat.blendType = pc.BLEND_NORMAL;
        mat.opacity = 0.7;
        mat.depthTest = true;
        mat.depthWrite = true;
        mat.update();
        ctx._visualMaterial = mat;
        return mat;
    }

    function applyVisualStyleToEntity(ctx, entity, materialOverride) {
        if (!entity) return;
        const layerId = getOrCreateVisualLayerId(ctx);
        const material = materialOverride || getVisualMaterial(ctx);
        const renderers = entity.findComponents('render');
        renderers.forEach((renderer) => {
            renderer.meshInstances.forEach((mi) => {
                mi.material = material;
            });
            if (isFinite(layerId)) renderer.layers = [layerId];
        });
        if (entity.render && !renderers.includes(entity.render)) {
            entity.render.meshInstances.forEach((mi) => {
                mi.material = material;
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
        const src = String(url || '').trim();
        if (!src) return null;
        if (ctx._visualAssetCache.has(src)) return ctx._visualAssetCache.get(src);

        let asset = ctx.app.assets.find(src, 'container');
        if (!asset) {
            asset = new pc.Asset(`apartment-visual:${src}`, 'container', { url: src });
            ctx.app.assets.add(asset);
        }

        ctx._visualAssetCache.set(src, asset);
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

        const apt = ctx.getSelectedApartmentData();
        const visual = String(apt?.visual || '').trim();
        const position = apt?.visualPosition;
        const rotation = apt?.visualRotation;

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
        if (key === ctx._visualActiveKey && ctx._visualEntity) return;

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
