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

    const resolveCam = (ctx, row) => {
        const markerCam = ctx._selectedApartment?.camera;
        const rowCam = row?.camera;
        const isPortrait = ctx.isPortrait();
        const defaultDist = isPortrait ? ctx.cameraPortraitDistance : ctx.cameraLandscapeDistance;
        const pitch =
            isFinite(rowCam?.pitch) ? rowCam.pitch :
            isFinite(markerCam?.pitch) ? markerCam.pitch :
            isFinite(ctx.cameraPitch) ? ctx.cameraPitch : 30;
        const yaw =
            isFinite(rowCam?.yaw) ? rowCam.yaw :
            isFinite(markerCam?.yaw) ? markerCam.yaw :
            isFinite(ctx.cameraYaw) ? ctx.cameraYaw : -58;
        const dist =
            isFinite(rowCam?.distance) ? rowCam.distance :
            isFinite(markerCam?.distance) ? markerCam.distance :
            isFinite(defaultDist) ? defaultDist : 5;
        return { pitch, yaw, dist };
    };

    const configureCameraLock = (ctx) => {
        const orbit = ctx?.getOrbit?.();
        if (!orbit) return;

        const isPortrait = ctx.isPortrait();
        const { pitch, yaw, dist } = resolveCam(ctx, null);

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
        return isFinite(rows[floorIndex]?.height) ? rows[floorIndex].height : 0;
    };

    const focusCameraForFloor = (ctx, floorIndex) => {
        const orbit = ctx?.getOrbit?.();
        const marker = ctx?._selectedApartment;
        if (!orbit || !marker?.worldPos) return;

        const isPortrait = ctx.isPortrait();
        const rows = ctx.getCurrentFloorRows?.() || [];
        const row = floorIndex >= 0 && floorIndex < rows.length ? rows[floorIndex] : null;

        const aptIdx = ctx._selectedApartmentIndex || 0;
        const apt = row?.apartments?.length > 0 ? (row.apartments[aptIdx] || row.apartments[0]) : null;
        const camSource = apt?.camera ? { camera: apt.camera } : row;
        const effectiveLook = apt?.look || row?.look || null;

        const { pitch, yaw, dist } = resolveCam(ctx, camSource);

        if (!ctx._focusTarget && typeof pc !== 'undefined') ctx._focusTarget = new pc.Vec3();
        if (!ctx._focusTarget) return;

        if (row) {
            const lx = effectiveLook && isFinite(effectiveLook[0]) ? effectiveLook[0] : marker.worldPos.x;
            const ly = isFinite(row.height) ? row.height : marker.worldPos.y;
            const lz = effectiveLook && isFinite(effectiveLook[1]) ? effectiveLook[1] : marker.worldPos.z;
            ctx._focusTarget.set(lx, ly, lz);
        } else {
            ctx._focusTarget.copy(marker.worldPos);
        }

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
