(function () {
    if (window.AmenitiesModeShared) return;

    const MODE_HOME = '0';
    const MODE_AMENITIES = '2';

    const setMode = (ctx, modeStr, options) => {
        const opts = options || {};
        const next = String(modeStr ?? MODE_HOME);
        if (!opts.fromManager && ctx._modeManager?.setMode) {
            ctx._modeManager.setMode(next, { source: 'amenitiesMode' });
            return;
        }

        const sameMode = ctx.currentMode === next;
        if (sameMode && next !== MODE_HOME && next !== MODE_AMENITIES) return;
        if (sameMode && next === MODE_AMENITIES) {
            if (ctx.infoPanel) ctx.infoPanel.classList.remove('visible');
            ctx._selectedAmenityData = null;
            ctx._selectedAmenityEl = null;
            ctx._infoPanelPositionFrozen = false;
        }

        const prevMode = ctx.currentMode;
        ctx.currentMode = next;

        if (!opts.silentEvent) ctx.app.fire('mode:change', next, prevMode, 'amenitiesMode');

        if (next === MODE_HOME) {
            ctx._csvLoadToken++;
            ctx.clearAmenities();
            if (ctx.infoPanel) ctx.infoPanel.classList.remove('visible');

            const orbit = ctx.getOrbit();
            if (!orbit) return;

            orbit.autoRotateMode = 0;
            orbit.setLookAtOffset && orbit.setLookAtOffset(0, 0, 0);
            orbit.setLookAtVerticalAngle && orbit.setLookAtVerticalAngle(0);
            if (orbit.setAutoRotateEnabled) orbit.setAutoRotateEnabled(true);
            else orbit.autoRotateEnabled = true;

            orbit.adjustDistanceForOrientation && orbit.adjustDistanceForOrientation();
            orbit.setDistanceLimits && orbit.setDistanceLimits(orbit.minDistance, orbit.maxDistance);

            orbit.resetInteractionState && orbit.resetInteractionState();
            orbit.focusOn && orbit.focusOn(ctx._homeTarget);
            return;
        }

        if (next !== MODE_AMENITIES) {
            ctx._csvLoadToken++;
            ctx.clearAmenities();
            if (ctx.infoPanel) ctx.infoPanel.classList.remove('visible');
            const orbit = ctx.getOrbit();
            orbit && orbit.setLookAtOffset && orbit.setLookAtOffset(0, 0, 0);
            orbit && orbit.setLookAtVerticalAngle && orbit.setLookAtVerticalAngle(0);
            return;
        }

        const orbit = ctx.getOrbit();
        if (orbit) {
            orbit.autoRotateMode = 1;
            orbit.setLookAtOffset && orbit.setLookAtOffset(0, 0, 0);
            orbit.setLookAtVerticalAngle && orbit.setLookAtVerticalAngle(0);
            if (orbit.setAutoRotateEnabled) orbit.setAutoRotateEnabled(false);
            else orbit.autoRotateEnabled = false;
            orbit.resetInteractionState && orbit.resetInteractionState();
            orbit.focusOn && orbit.focusOn(ctx._homeTarget);
        }

        ctx._forceDomUpdate = true;
        ctx._rectDirty = true;
        if (ctx.app && !ctx.app.autoRender && 'renderNextFrame' in ctx.app) ctx.app.renderNextFrame = true;

        ctx.loadDataFromCsv();
    };

    window.AmenitiesModeShared = {
        setMode
    };
})();
