(function () {
    if (window.ApartmentsCameraShared) return;

    const getDesktopLookOffset = (ctx, distance, yawDeg) => {
        const angleDeg = Number(ctx?.desktopYawOffset || 0);
        if (!isFinite(angleDeg) || Math.abs(angleDeg) < 0.001) return { x: 0, z: 0 };

        const dist = isFinite(distance) ? distance : 0;
        if (!isFinite(dist) || dist <= 0) return { x: 0, z: 0 };

        const degToRad = typeof pc !== 'undefined' ? pc.math.DEG_TO_RAD : Math.PI / 180;
        const offset = Math.tan(angleDeg * degToRad) * dist;
        const yawRad = (isFinite(yawDeg) ? yawDeg : 0) * degToRad;
        return {
            x: Math.cos(yawRad) * offset,
            z: -Math.sin(yawRad) * offset
        };
    };

    const configureCameraLock = (ctx) => {
        const orbit = ctx?.getOrbit?.();
        if (!orbit) return;

        const isPortrait = ctx.isPortrait();
        const dist = isPortrait ? ctx.cameraPortraitDistance : ctx.cameraLandscapeDistance;
        const pitch = isFinite(ctx.cameraPitch) ? ctx.cameraPitch : orbit.eulers?.x || 30;
        const baseYaw = isFinite(ctx.cameraYaw) ? ctx.cameraYaw : orbit.eulers?.y || -58;
        const yaw = baseYaw;

        orbit.autoRotateMode = 1;
        orbit.setAutoRotateEnabled && orbit.setAutoRotateEnabled(false);
        orbit.autoRotateEnabled = false;
        orbit.resetInteractionState && orbit.resetInteractionState();

        orbit.inputLocked = true;
        if (orbit.setLookAtOffset) {
            if (isPortrait) {
                orbit.setLookAtOffset(0, 0, 0);
            } else {
                const lookOffset = getDesktopLookOffset(ctx, dist, yaw);
                orbit.setLookAtOffset(lookOffset.x, 0, lookOffset.z);
            }
        }
        orbit.setLookAtVerticalAngle && orbit.setLookAtVerticalAngle(0);
        orbit.setDistanceLimits && orbit.setDistanceLimits(dist, dist);
        orbit.distanceTarget = dist;

        if (orbit.eulersTarget) orbit.eulersTarget.set(pitch, yaw);

        if (ctx._selectedApartment?.worldPos) focusCameraForFloor(ctx, ctx._selectedFloorIndex);
        else if (ctx._homeTarget) orbit.focusOn && orbit.focusOn(ctx._homeTarget);
    };

    const releaseCameraLock = (ctx) => {
        const orbit = ctx?.getOrbit?.();
        if (!orbit) return;
        orbit.inputLocked = false;
        orbit.setLookAtOffset && orbit.setLookAtOffset(0, 0, 0);
        orbit.setLookAtVerticalAngle && orbit.setLookAtVerticalAngle(0);
        orbit.adjustDistanceForOrientation && orbit.adjustDistanceForOrientation();
    };

    const getFloorYOffset = (ctx, floorIndex) => {
        if (!ctx?._selectedApartment || floorIndex < 0) return 0;
        const rows = ctx.getCurrentFloorRows();
        if (!rows.length || floorIndex >= rows.length) return 0;
        const step = isFinite(ctx.floorStepY) ? ctx.floorStepY : 1;
        return floorIndex * step;
    };

    const focusCameraForFloor = (ctx, floorIndex) => {
        const orbit = ctx?.getOrbit?.();
        const marker = ctx?._selectedApartment;
        if (!orbit || !marker?.worldPos) return;

        const isPortrait = ctx.isPortrait();
        const dist = isPortrait ? ctx.cameraPortraitDistance : ctx.cameraLandscapeDistance;
        const pitch = isFinite(ctx.cameraPitch) ? ctx.cameraPitch : orbit.eulers?.x || 30;
        const baseYaw = isFinite(ctx.cameraYaw) ? ctx.cameraYaw : orbit.eulers?.y || -58;
        const yaw = baseYaw;

        if (!ctx._focusTarget && typeof pc !== 'undefined') ctx._focusTarget = new pc.Vec3();
        if (!ctx._focusTarget) return;

        ctx._focusTarget.copy(marker.worldPos);
        ctx._focusTarget.y += getFloorYOffset(ctx, floorIndex);

        orbit.resetInteractionState && orbit.resetInteractionState();
        orbit.inputLocked = true;
        orbit.setAutoRotateEnabled && orbit.setAutoRotateEnabled(false);
        orbit.autoRotateEnabled = false;
        orbit.autoRotateMode = 1;

        orbit.setDistanceLimits && orbit.setDistanceLimits(dist, dist);
        orbit.distanceTarget = dist;
        if (orbit.eulersTarget) orbit.eulersTarget.set(pitch, yaw);

        if (orbit.setLookAtOffset) {
            if (isPortrait) {
                orbit.setLookAtOffset(0, 0, 0);
            } else {
                const lookOffset = getDesktopLookOffset(ctx, dist, yaw);
                orbit.setLookAtOffset(lookOffset.x, 0, lookOffset.z);
            }
        }
        orbit.setLookAtVerticalAngle && orbit.setLookAtVerticalAngle(0);
        orbit.focusOn && orbit.focusOn(ctx._focusTarget);

        ctx._forceDomUpdate = true;
        ctx.updateInfoPanelPosition();
        if (ctx.app && !ctx.app.autoRender && 'renderNextFrame' in ctx.app) ctx.app.renderNextFrame = true;
    };

    window.ApartmentsCameraShared = {
        getDesktopLookOffset,
        configureCameraLock,
        releaseCameraLock,
        getFloorYOffset,
        focusCameraForFloor
    };
})();
