import { createSplash, setSplashProgress, hideSplash, loadAssets } from './assets/scripts/loader.js';
import { setupGyro, enableCamera } from './assets/scripts/functions.js';
import { isIOS } from './assets/scripts/utils/detect.js';

const canvas = document.getElementById('application-canvas');
const video = document.getElementById('camera-video');
const launch = document.getElementById('launch');
const hint = document.getElementById('hint');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');

const SMOOTHING = 0.15;

/** @type {pc.Entity|null} */
let MainEntity = null;
/** @type {pc.Entity|null} */
let uiPanel = null;

const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    elementInput: new pc.ElementInput(canvas),
    graphicsDeviceOptions: {
        alpha: true,
        preserveDrawingBuffer: false,
        devicePixelRatio: false,
        antialias: false,
        preferWebGl2: false
    }
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

window.addEventListener('resize', () => {
    app.resizeCanvas();
});

const assetMap = {
    Complex: new pc.Asset('Complex', 'gsplat', { url: 'assets/gsplats/Complex.sog' }),
    font: new pc.Asset('font', 'font', { url: 'assets/fonts/Helvetica.json' }),
    ButtonImg: new pc.Asset('ButtonImg', 'texture', { url: 'assets/images/icons/button.png'}),
    MainBuilding_Glass: new pc.Asset('MainBuilding_Glass', 'container', { url: 'assets/models/MainBuilding_Glass.glb'}),
    AddBuilding_Glass: new pc.Asset('AddBuilding_Glass', 'container', { url: 'assets/models/AddBuilding_Glass.glb'}),
    AddBuilding_Glass2: new pc.Asset('AddBuilding_Glass2', 'container', { url: 'assets/models/AddBuilding_Glass2.glb'}),
    ShaderFrag: new pc.Asset('ShaderFrag', 'shader', { url: 'assets/shaders/splat.frag'}),
    ShaderVert: new pc.Asset('ShaderVert', 'shader', { url: 'assets/shaders/splat.vert'}),
    env_px: new pc.Asset('env_px', 'texture', { url: 'assets/images/cubemap_1/px.png' }),
    env_nx: new pc.Asset('env_nx', 'texture', { url: 'assets/images/cubemap_1/nx.png' }),
    env_py: new pc.Asset('env_py', 'texture', { url: 'assets/images/cubemap_1/py.png' }),
    env_ny: new pc.Asset('env_ny', 'texture', { url: 'assets/images/cubemap_1/ny.png' }),
    env_pz: new pc.Asset('env_pz', 'texture', { url: 'assets/images/cubemap_1/pz.png' }),
    env_nz: new pc.Asset('env_nz', 'texture', { url: 'assets/images/cubemap_1/nz.png' })
};

const scriptAssets = [
    new pc.Asset('adjustPixelRatio.js', 'script', { url: 'assets/scripts/utils/adjustPixelRatio.js'}),
    new pc.Asset('carousel.js', 'script', { url: 'assets/scripts/carousel.js'})
];

Object.values(assetMap).forEach(a => app.assets.add(a));
scriptAssets.forEach(a => app.assets.add(a));

const assetList = [
    { asset: assetMap.Complex, size: 10.1 * 1024 * 1024 },
    { asset: assetMap.ButtonImg, size: 3 * 1024 },
    { asset: assetMap.MainBuilding_Glass, size: 5 * 1024 },
    { asset: assetMap.AddBuilding_Glass, size: 3 * 1024 },
    { asset: assetMap.AddBuilding_Glass2, size: 4 * 1024 },
    { asset: scriptAssets[0], size: 1024 },
    { asset: scriptAssets[1], size: 3 * 1024 },
    { asset: assetMap.env_px, size: 125 * 1024 },
    { asset: assetMap.env_nx, size: 168 * 1024 },
    { asset: assetMap.env_py, size: 41 * 1024 },
    { asset: assetMap.env_ny, size: 255 * 1024 },
    { asset: assetMap.env_pz, size: 158 * 1024 },
    { asset: assetMap.env_nz, size: 143 * 1024 },
    { asset: assetMap.ShaderFrag, size: 2 * 1024 },
    { asset: assetMap.ShaderVert, size: 3 * 1024 }
];

function createReflectionMaterial() {
    const getSrc = (a) => {
        const t = a.resource;
        return t.getSource ? t.getSource() : (t._levels && t._levels[0]);
    };

    const envFaces = [
        assetMap.env_px,
        assetMap.env_nx,
        assetMap.env_py,
        assetMap.env_ny,
        assetMap.env_pz,
        assetMap.env_nz
    ];

    const sources = envFaces.map(getSrc);

    const first = sources[0];
    const size = first && (first.width || first.videoWidth);
    if (!size) return null;

    const cubemap = new pc.Texture(app.graphicsDevice, {
        cubemap: true,
        width: size,
        height: size,
        format: pc.PIXELFORMAT_SRGBA,
        mipmaps: true
    });

    cubemap.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
    cubemap.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
    cubemap.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
    cubemap.magFilter = pc.FILTER_LINEAR;
    cubemap.setSource(sources);
    cubemap.upload();

    const mat = new pc.StandardMaterial();
    mat.useSkybox = false;
    mat.useMetalness = true;
    mat.metalness = 1.0;
    mat.shininess = 0;
    mat.diffuse = new pc.Color(1, 1, 1);
    mat.cubeMap = cubemap;
    mat.cubeMapProjection = pc.CUBEPROJ_BOX;
    mat.reflectivity = 1;
    mat.cubeMapProjectionBox = new pc.BoundingBox(
        new pc.Vec3(9, -13, 1.5),
        new pc.Vec3(32, 32, 32)
    );
    mat.update();

    return mat;
}

function instantiateGlass(asset, parent, material, pos, rot, scl) {
    const entity = asset.resource.instantiateRenderEntity();
    if (!entity) return null;

    entity.findComponents('render').forEach(r => {
        if (r.meshInstances && r.meshInstances.length) {
            r.meshInstances.forEach(mi => {
                mi.material = material;
            });
        } else {
            r.material = material;
        }
    });

    parent.addChild(entity);

    if (pos) entity.setPosition(pos.x, pos.y, pos.z);
    if (rot) entity.setEulerAngles(rot.x, rot.y, rot.z);
    if (scl) entity.setLocalScale(scl.x, scl.y, scl.z);

    return entity;
}

function createScreenUI() {
    const screen = new pc.Entity('UIPanel');
    screen.addComponent('screen', {
        screenSpace: true,
        scaleBlend: 0.5,
        scaleMode: pc.SCALEMODE_BLEND,
        referenceResolution: new pc.Vec2(720, 1280)
    });
    app.root.addChild(screen);

    const button = new pc.Entity('Button-AR');
    button.addComponent('element', {
        type: 'image',
        pivot: new pc.Vec2(0.5, 0.5),
        anchor: new pc.Vec4(0.5, 0, 0.5, 0),
        width: 200,
        height: 90,
        useInput: true,
        textureAsset: assetMap.ButtonImg,
        color: new pc.Color(0, 0.48, 1)
    });
    button.addComponent('button', {
        imageEntity: button,
        active: true,
        hovertint: new pc.Color(1, 1, 1)
    });
    button.button.on('click', () => {
        launch.click();
    });
    button.setLocalPosition(0, 100, 0);
    screen.addChild(button);

    const hintLine = new pc.Entity('HintLine');
    hintLine.addComponent('element', {
        type: 'image',
        color: new pc.Color(1, 1, 1),
        pivot: new pc.Vec2(0.5, 0.5),
        anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
        width: 450,
        height: 4,
        useInput: false
    });
    hintLine.setLocalPosition(0, 30, 0);
    screen.addChild(hintLine);

    const buttonText = new pc.Entity('ButtonText');
    buttonText.addComponent('element', {
        type: 'text',
        text: 'LAUNCH',
        fontSize: 32,
        fontAsset: assetMap.font.id,
        pivot: new pc.Vec2(0.5, 0.5),
        anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
        alignment: new pc.Vec2(0.5, 0.5),
        color: new pc.Color(1, 1, 1)
    });
    buttonText.setLocalPosition(0, -2, 0);
    button.addChild(buttonText);

    const hintText = new pc.Entity('HintText');
    hintText.addComponent('element', {
        type: 'text',
        text: 'Выровняйте телефон по горизонту\nи нажмите LAUNCH',
        anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
        pivot: new pc.Vec2(0.5, 0.5),
        width: 400,
        height: 140,
        fontAsset: assetMap.font.id,
        fontSize: 24,
        lineHeight: 36,
        alignment: new pc.Vec2(0.5, 0.5),
        wrapLines: true,
        maxLines: 2,
        color: new pc.Color(1, 1, 1)
    });
    hintText.setLocalPosition(0, -20, 0);
    screen.addChild(hintText);

    return screen;
}

function createScene() {
    app.scene.ambientLight = new pc.Color(1, 1, 1);

    const Root = new pc.Entity('Root');
    app.root.addChild(Root);

    const Camera = new pc.Entity('Camera');
    Camera.addComponent('camera', {
        clearColor: new pc.Color(0, 0, 0, 0)
    });
    Camera.setPosition(0, 0, 0);
    Root.addChild(Camera);

    const Main = new pc.Entity('Main');
    Root.addChild(Main);

    const Glass = new pc.Entity('Glass');
    Main.addChild(Glass);

    MainEntity = Main;

    const ReflectMat = createReflectionMaterial();
    if (ReflectMat) {
        instantiateGlass(
            assetMap.MainBuilding_Glass,
            Glass,
            ReflectMat,
            new pc.Vec3(0.354, 2.291, 3.204),
            new pc.Vec3(90, 0, 0),
            new pc.Vec3(0.98, 0.98, 0.98)
        );

        instantiateGlass(
            assetMap.AddBuilding_Glass,
            Glass,
            ReflectMat,
            new pc.Vec3(6.942, 3.656, 3.981),
            new pc.Vec3(90, 0, 0),
            new pc.Vec3(1, 1, 1)
        );

        instantiateGlass(
            assetMap.AddBuilding_Glass2,
            Glass,
            ReflectMat,
            new pc.Vec3(6.942, 3.656, 3.981),
            new pc.Vec3(90, 0, 0),
            new pc.Vec3(1, 1, 1)
        );
    }

    const gsplatCurrent = new pc.Entity('GSPlatCurrent');
    gsplatCurrent.setPosition(0.215, 0, 0.246);
    gsplatCurrent.setEulerAngles(180, 0, 0);
    gsplatCurrent.addComponent('gsplat', { asset: assetMap.Complex });
    Main.addChild(gsplatCurrent);

    Main.addComponent('script');
    Main.script.create('carousel', {
        attributes: {
            camera: Camera,
            scaleFactor: 1.0,
            vertexShader: assetMap.ShaderVert,
            fragmentShader: assetMap.ShaderFrag,
            EnableGlass: Glass
        }
    });

    Main.enabled = false;
    Glass.enabled = false;

    Main.setPosition(0, -0.7, 0);
    Main.setEulerAngles(8, 0, 0);

    Root.addComponent('script');
    Root.script.create('adjustPixelRatio');

    if (!isIOS()) {
        uiPanel = createScreenUI();
    }

    app.start();

    setupGyro(app, Camera, launch, SMOOTHING, () => {
        if (MainEntity) MainEntity.enabled = true;

        if (isIOS()) {
            launch.classList.add('hidden');
            hint.classList.add('hidden');
        }

        if (uiPanel) {
            uiPanel.destroy();
            uiPanel = null;
        }
    });

    if (startScreen) {
        startScreen.style.display = 'none';
    }
}

function startApp() {
    createSplash();

    loadAssets(
        app,
        assetList,
        () => {
            createScene();
            hideSplash();
        },
        setSplashProgress
    );
}

if (startButton) {
    let started = false;

    const handleStart = async (e) => {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (started) return;
        started = true;

        await enableCamera(video);
        startApp();
    };

    if (isIOS()) {
        launch.classList.remove('hidden');
        hint.classList.remove('hidden');
    }

    startButton.addEventListener('click', handleStart);
    startButton.addEventListener('keydown', handleStart);
}