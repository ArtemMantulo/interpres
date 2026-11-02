function mulQuat(out, a, b) {
    const ax = a.x, ay = a.y, az = a.z, aw = a.w;
    const bx = b.x, by = b.y, bz = b.z, bw = b.w;

    out.x = aw * bx + ax * bw + ay * bz - az * by;
    out.y = aw * by - ax * bz + ay * bw + az * bx;
    out.z = aw * bz + ax * by - ay * bx + az * bw;
    out.w = aw * bw - ax * bx - ay * by - az * bz;

    return out;
}

function quatFromAxisAngle(out, ax, ay, az, angleRad) {
    const half = angleRad * 0.5;
    const s = Math.sin(half);

    out.x = ax * s;
    out.y = ay * s;
    out.z = az * s;
    out.w = Math.cos(half);

    return out;
}

const _qTilt = new pc.Quat();
const _qOrient = new pc.Quat();

function setDeviceQuaternion(out, alphaDeg, betaDeg, gammaDeg, orientDeg) {
    const degToRad = Math.PI / 180;

    const alpha = alphaDeg * degToRad;
    const beta  = betaDeg  * degToRad;
    const gamma = gammaDeg * degToRad;
    const orient = orientDeg * degToRad;

    const cx = Math.cos(beta / 2);
    const sx = Math.sin(beta / 2);

    const cy = Math.cos(alpha / 2);
    const sy = Math.sin(alpha / 2);

    const cz = Math.cos(-gamma / 2);
    const sz = Math.sin(-gamma / 2);

    const qY = { x: 0,  y: sy, z: 0,  w: cy };
    const qX = { x: sx, y: 0,  z: 0,  w: cx };
    const qZ = { x: 0,  y: 0,  z: sz, w: cz };

    const qYX = { x: 0, y: 0, z: 0, w: 1 };
    mulQuat(qYX, qY, qX);

    out.set(0, 0, 0, 1);
    mulQuat(out, qYX, qZ);

    quatFromAxisAngle(_qTilt, 1, 0, 0, -Math.PI / 2);
    mulQuat(out, out, _qTilt);

    quatFromAxisAngle(_qOrient, 0, 0, 1, -orient);
    mulQuat(out, out, _qOrient);

    return out;
}

export function setupGyro(app, Camera, gyroBtn, smoothing = 0.15, onStart) {
    if (!app || !Camera || !gyroBtn) return;

    let screenOrientation = window.orientation || 0;
    window.addEventListener('orientationchange', () => {
        screenOrientation = window.orientation || 0;
    });

    const qDevice   = new pc.Quat();
    const qAdjusted = new pc.Quat();
    const qRef      = new pc.Quat();
    const qFinal    = new pc.Quat();
    const qCurrent  = new pc.Quat();

    let hasReference = false;

    function onDeviceOrientation(event) {
        const hasAlpha = event.alpha != null;
        const hasBeta  = event.beta  != null;
        const hasGamma = event.gamma != null;
        if (!hasAlpha || !hasBeta || !hasGamma) return;

        const alpha = event.alpha;
        const beta  = event.beta;
        const gamma = event.gamma;

        setDeviceQuaternion(qDevice, alpha, beta, gamma, screenOrientation);
        qAdjusted.set(qDevice.x, qDevice.y, qDevice.z, qDevice.w);

        if (!hasReference) {
            qRef.copy(qAdjusted).invert();
            qCurrent.set(0, 0, 0, 1);
            hasReference = true;
        }

        qFinal.mul2(qRef, qAdjusted);
        qCurrent.slerp(qCurrent, qFinal, smoothing);

        Camera.setRotation(qCurrent);
    }

    async function enableGyroInternal() {
        try {
            const needPermission =
                typeof DeviceOrientationEvent !== 'undefined' &&
                typeof DeviceOrientationEvent.requestPermission === 'function';

            if (needPermission) {
                const state = await DeviceOrientationEvent.requestPermission();
                if (state !== 'granted') {
                    alert('Доступ к датчикам движения отклонён.');
                    return;
                }
            }

            hasReference = false;
            window.addEventListener('deviceorientation', onDeviceOrientation, true);

            const root = app.root.findByName('Root');
            const adjuster = root?.script?.adjustPixelRatio;

            if (adjuster) {
                adjuster.scaleMobile = 0.45;
                adjuster.applyPixelRatio();
            }

            if (typeof onStart === 'function') {
                onStart();
            }
        } catch (e) {
            console.error(e);
            alert('Не удалось активировать датчики движения. ' +
                  'Проверьте HTTPS и настройки датчиков в браузере.');
        }
    }

    gyroBtn.addEventListener('click', () => {
        enableGyroInternal();
    });
}

export async function enableCamera(videoElement) {
    if (!videoElement || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Камера недоступна в этом браузере.');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' }
            },
            audio: false
        });

        videoElement.srcObject = stream;
        await videoElement.play();
    } catch (e) {
        console.error(e);
        alert('Не удалось получить доступ к камере.');
    }
}