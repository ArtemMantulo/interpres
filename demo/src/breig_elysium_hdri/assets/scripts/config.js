export const GSPLATS_ON_SCREEN_THRESHOLD = 300000;
export const ASSET_PROGRESS_WEIGHT = 0.15;

export const START_SETTINGS = {
    lodMin: 2,
    splatBudget: 400000,
    lodDistances: [6, 10, 14, 18, 22]
};

export const DEVICE_PROFILES = {
    phone: {
        enableUpgrade: true,
        upgradeDelayMs: 7000,
        upgradedLodDistances: [6, 16, 40, 60],
        lodSmooth: { duration: 5000, endBudget: 700000, endLodMin: 1 }
    },
    tablet: {
        enableUpgrade: true,
        upgradeDelayMs: 7000,
        upgradedLodDistances: [15, 30, 45, 60],
        lodSmooth: { duration: 5000, endBudget: 1200000, endLodMin: 1 }
    },
    desktop: {
        enableUpgrade: true,
        upgradeDelayMs: 7000,
        upgradedLodDistances: [30, 50, 70, 90],
        lodSmooth: { duration: 5000, endBudget: 2000000, endLodMin: 0 }
    }
};

export const SCENE_GSPLAT_SETTINGS = {
    lodRangeMax: 4,
    lodUpdateAngle: 90,
    lodBehindPenalty: 5,
    radialSorting: true,
    lodUpdateDistance: 2,
    lodUnderfillLimit: 5
};

export const RENDER_SETTINGS = {
    warmupFrames: 3
};

export const FPS_LOCKER_SETTINGS = {
    toggleElementId: 'fps30',
    cappedFps: 30
};

export const HOME_INPUT_SETTINGS = {
    dragThreshold: 8
};

export const HOME_MARKER_SETTINGS = {
    size: 3,
    offset: 0.02,
    scalePeak: 1.1,
    timing: {
        in: 0.3,
        settle: 0.1,
        hold: 1,
        pulse: 0.1,
        out: 0.3
    },
    drawOrder: 10000,
    textureAnisotropy: 8
};

export const GALLERY_SETTINGS = {
    swipeThreshold: 50,
    swipeMaxVisualShift: 2000,
    thumbScrollPadding: 16,
    wheelCooldownMs: 180,
    waitForDomTries: 80,
    waitForDomDelayMs: 100,
    thumbResetDelayMs: 10,
    transitionMs: 210
};

export const AMENITIES_SETTINGS = {
    domUpdateInterval: 120,
    csvMinColumns: 7,
    screenVisibilityThreshold: 0.25,
    transformSuffix: ' translate(-50%, -50%)'
};

export const CAMERA_SETTINGS = {
    position: [-1.792, 0.976, 1.127],
    euler: [-24.6, -58, 0],
    clearColor: [1, 1, 1],
    fov: 50
};

export const ROOT_SETTINGS = {
    gsplatPosition: [0.323, 0, 0.246],
    gsplatEuler: [180, 0, 0]
};

export const REVEAL_SETTINGS = {
    enabled: false,
    center: [0, 0, 0],
    speed: 10,
    acceleration: 20,
    delay: 1.5,
    waveColorA: [1, 1, 1],
    waveColorB: [0.55, 0.78, 0.94],
    tintStrength: 1,
    liftHeight: 2,
    liftHeightStart: 0,
    liftHeightEnd: 3,
    liftDuration: 1,
    waveWidth: 3,
    waveWidthStart: 3,
    waveWidthEnd: 20,
    oscillationIntensity: 0.5,
    endRadius: 300
};

export const HOME_PLANE_SETTINGS = {
    position: [1.721, -1, 2.196],
    rotation: [0, 32, 0],
    scale: [35, 0.1, 45],
    colliderHalfExtents: [0.5, 0.5, 0.5]
};
