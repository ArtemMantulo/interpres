(function () {
    if (window.PcScriptShared) return;

    window.PcScriptShared = {
        getOrbit(ctx) {
            return ctx.cameraEntity?.script?.orbitCamera || null;
        },

        getCanvasRect(ctx) {
            if (!ctx._rectDirty && ctx._canvasRect) return ctx._canvasRect;
            const canvas = ctx.app?.graphicsDevice?.canvas;
            if (!canvas || !canvas.getBoundingClientRect) return null;
            ctx._canvasRect = canvas.getBoundingClientRect();
            ctx._rectDirty = false;
            return ctx._canvasRect;
        },

        markInfoPanelSizeDirty(ctx) {
            if (!ctx._infoPanelSize) return;
            ctx._infoPanelSize.dirty = true;
        },

        getInfoPanelSize(ctx, defaultWidth, defaultHeight) {
            const state =
                ctx._infoPanelSize ||
                (ctx._infoPanelSize = { width: defaultWidth, height: defaultHeight, dirty: true });
            if (!ctx.infoPanel) return { width: state.width, height: state.height };
            if (!state.dirty && state.width > 0 && state.height > 0) {
                return { width: state.width, height: state.height };
            }
            const rect = ctx.infoPanel.getBoundingClientRect();
            if (rect && isFinite(rect.width) && rect.width > 0) state.width = rect.width;
            if (rect && isFinite(rect.height) && rect.height > 0) state.height = rect.height;
            state.dirty = false;
            return { width: state.width || defaultWidth, height: state.height || defaultHeight };
        },

        // options: { hideSelected(item) => bool, getPortraitOffset(item) => number, activeCheck: bool, transformSuffix: string }
        updateDomPositions(ctx, dataList, options) {
            const camera = ctx.cameraEntity?.camera;
            const rect = ctx.getCanvasRect();
            if (!camera || !rect) return;

            const { hideSelected, getPortraitOffset, activeCheck } = options || {};
            const rectLeft = rect.left;
            const rectTop = rect.top;
            const screenPos = ctx._screenPos;
            const threshold = isFinite(ctx.screenVisibilityThreshold) ? ctx.screenVisibilityThreshold : 0.25;
            const transformSuffix = options?.transformSuffix ?? (ctx.transformSuffix || ' translate(-50%, -50%)');

            for (let i = 0; i < dataList.length; i++) {
                const item = dataList[i];
                if (!item) continue;

                if (hideSelected && hideSelected(item)) {
                    if (item.visible) {
                        item.visible = false;
                        item.style.display = 'none';
                        item.lastX = NaN;
                        item.lastY = NaN;
                    }
                    continue;
                }

                camera.worldToScreen(item.worldPos, screenPos);
                const onScreen =
                    (!activeCheck || ctx._active) &&
                    screenPos.z > 0 &&
                    Number.isFinite(screenPos.x) &&
                    Number.isFinite(screenPos.y);

                const style = item.style || item.dom?.style;

                if (!onScreen) {
                    if (item.visible) {
                        item.visible = false;
                        style.display = 'none';
                        item.lastX = NaN;
                        item.lastY = NaN;
                    }
                    continue;
                }

                const x = rectLeft + screenPos.x;
                const offsetY = getPortraitOffset ? getPortraitOffset(item) : 0;
                const y = rectTop + screenPos.y + offsetY;
                const needsReveal = !item.visible;

                if (needsReveal) { item.lastX = NaN; item.lastY = NaN; }

                const dx = isNaN(item.lastX) ? Infinity : Math.abs(x - item.lastX);
                const dy = isNaN(item.lastY) ? Infinity : Math.abs(y - item.lastY);

                if (dx > threshold || dy > threshold) {
                    style.transform = `translate3d(${x}px, ${y}px, 0)${transformSuffix}`;
                    item.lastX = x;
                    item.lastY = y;
                }

                if (needsReveal) {
                    item.visible = true;
                    style.display = 'block';
                }
            }

            ctx.updateInfoPanelPosition();
        }
    };
})();
