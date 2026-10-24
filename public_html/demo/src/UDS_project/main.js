import { createSplash, setSplashProgress, hideSplash, loadAssets } from './assets/scripts/loader.js';
import { setupFullscreenButton } from './assets/scripts/fullscreen.js';
import { loadLanguage } from './assets/scripts/language.js';
import { isMobile} from './assets/scripts/utils/detect.js';

const canvas = document.getElementById('application-canvas');

const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    graphicsDeviceOptions: {
        alpha: false,
        preserveDrawingBuffer: false,
        devicePixelRatio: false,
        antialias: false,
        preferWebGl2: true
    }
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

window.addEventListener('resize', () => app.resizeCanvas());
document.getElementById("start-button")?.addEventListener("click", startApp);

const complexFile = isMobile() ? "assets/gsplats/Complex.sog" : "assets/gsplats/ComplexPC.sog";

const assetMap = {
    Complex: new pc.Asset("Complex", "gsplat", { url: complexFile }),
    MainBuilding_Glass: new pc.Asset("MainBuilding_Glass", "container", { url: "assets/models/MainBuilding_Glass.glb" }),
    AddBuilding_Glass: new pc.Asset("AddBuilding_Glass", "container", { url: "assets/models/AddBuilding_Glass.glb" }),
    AddBuilding_Glass2: new pc.Asset("AddBuilding_Glass2", "container", { url: "assets/models/AddBuilding_Glass2.glb" }),
    ShaderFrag: new pc.Asset("ShaderFrag", "shader", { url: "assets/shaders/splat.frag" }),
    ShaderVert: new pc.Asset("ShaderVert", "shader", { url: "assets/shaders/splat.vert" }),
    env_px: new pc.Asset("env_px", "texture", { url: "assets/images/cubemap_1/posx.jpg" }),
    env_nx: new pc.Asset("env_nx", "texture", { url: "assets/images/cubemap_1/negx.jpg" }),
    env_py: new pc.Asset("env_py", "texture", { url: "assets/images/cubemap_1/posy.jpg" }),
    env_ny: new pc.Asset("env_ny", "texture", { url: "assets/images/cubemap_1/negy.jpg" }),
    env_pz: new pc.Asset("env_pz", "texture", { url: "assets/images/cubemap_1/posz.jpg" }),
    env_nz: new pc.Asset("env_nz", "texture", { url: "assets/images/cubemap_1/negz.jpg" })
};

const scriptAssets = [
    new pc.Asset("adjustPixelRatio.js", "script", { url: "assets/scripts/utils/adjustPixelRatio.js" }),
    new pc.Asset("orbitCamera.js", "script", { url: "assets/scripts/orbitCamera.js" }),
    new pc.Asset("amenitiesMode.js", "script", { url: "assets/scripts/amenitiesMode.js" }),
    new pc.Asset("carousel.js", "script", { url: "assets/scripts/carousel.js" })
];

Object.values(assetMap).forEach(a => app.assets.add(a));
scriptAssets.forEach(a => app.assets.add(a));

const complexSize = isMobile() ? 10.1 * 1024 * 1024 : 21 * 1024 * 1024;

const assetList = [
    { asset: assetMap.Complex, size: complexSize },
    { asset: assetMap.MainBuilding_Glass, size: 5 * 1024 },
    { asset: assetMap.AddBuilding_Glass, size: 3 * 1024 },
    { asset: assetMap.AddBuilding_Glass2, size: 4 * 1024 },
    { asset: scriptAssets[0], size: 1024 },
    { asset: scriptAssets[1], size: 10 * 1024 },
    { asset: scriptAssets[2], size: 7 * 1024 },
    { asset: scriptAssets[3], size: 3 * 1024 },
    { asset: assetMap.env_px, size: 125 * 1024 },
    { asset: assetMap.env_nx, size: 168 * 1024 },
    { asset: assetMap.env_py, size: 41 * 1024 },
    { asset: assetMap.env_ny, size: 255 * 1024 },
    { asset: assetMap.env_pz, size: 158 * 1024 },
    { asset: assetMap.env_nz, size: 143 * 1024 },
    { asset: assetMap.ShaderFrag, size: 2 * 1024 },
    { asset: assetMap.ShaderVert, size: 3 * 1024 }
];

function startApp() {
    createSplash();

    loadAssets(app, assetList, () => {
        createScene();
    }, setSplashProgress);

    function createScene() {

        const WhiteMat = new pc.StandardMaterial();
        WhiteMat.diffuse = new pc.Color(1, 1, 1);
        WhiteMat.emissive = new pc.Color(1, 1, 1);
        const ReflectMat = new pc.StandardMaterial();
        const ReflectMatDark = new pc.StandardMaterial();

        const getSrc = (a) => {
            const t = a.resource;
            return t.getSource ? t.getSource() : (t._levels && t._levels[0]);
        };

        const sources = [
            getSrc(assetMap.env_px),
            getSrc(assetMap.env_nx),
            getSrc(assetMap.env_py),
            getSrc(assetMap.env_ny),
            getSrc(assetMap.env_pz),
            getSrc(assetMap.env_nz)
        ];
        const size = sources[0]?.width || sources[0]?.videoWidth;

        if (size) {
            const cubemap = new pc.Texture(app.graphicsDevice, {
                cubemap: true,
                width: size,
                height: size,
                format: pc.PIXELFORMAT_RGB8,
                mipmaps: true
            });

            cubemap.addressU = pc.ADDRESS_CLAMP_TO_EDGE;
            cubemap.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
            cubemap.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
            cubemap.magFilter  = pc.FILTER_LINEAR;

            cubemap.setSource(sources);
            cubemap.upload();

            ReflectMat.useSkybox = false;
            ReflectMat.useMetalness = true;
            ReflectMat.metalness = 1.0;
            ReflectMat.glossiness = 1;
            ReflectMat.diffuse = new pc.Color(0.45, 0.45, 0.45);

            ReflectMat.cubeMap = cubemap;
            ReflectMat.cubeMapProjection = pc.CUBEPROJ_BOX;
            ReflectMat.reflectivity = 4;
            ReflectMat.cubeMapProjectionBox = new pc.BoundingBox( new pc.Vec3(9, -1, 1.5), new pc.Vec3(16, 16, 16));
            ReflectMat.update();

            ReflectMatDark.useSkybox = false;
            ReflectMatDark.useMetalness = true;
            ReflectMatDark.metalness = 1.0;
            ReflectMatDark.glossiness = 1;
            ReflectMatDark.diffuse = new pc.Color(0.45, 0.45, 0.45);

            ReflectMatDark.cubeMap = cubemap;
            ReflectMatDark.cubeMapProjection = pc.CUBEPROJ_BOX;
            ReflectMatDark.reflectivity = 4;
            ReflectMatDark.cubeMapProjectionBox = new pc.BoundingBox( new pc.Vec3(9, -1, 1.5), new pc.Vec3(16, 16, 16));
            ReflectMatDark.update();
        }

        app.scene.ambientLight = new pc.Color(1, 1, 1);

        const Root = new pc.Entity("Root");

        const Camera = new pc.Entity("Camera");
        Camera.setPosition(0, 4, 4);
        Camera.setEulerAngles(-25, 0, 0);
        Camera.addComponent("camera", {clearColor: new pc.Color(1, 1, 1, 1), fov: 50});
        Camera.addComponent("script");
        Camera.script.create("orbitCamera");
        Root.addChild(Camera);

        const Main = new pc.Entity("Main");
        Root.addChild(Main);
        const Glass = new pc.Entity("Glass");
        Root.addChild(Glass);
        Glass.enabled = false;

        const ENVIRONMENT = [
            ['BoxA', [14.42, 0.24, 0.547], [6, 0.1, 20], [0, 0, 180]],
            ['BoxB', [-12.12, 0.24, 0.547], [6, 0.1, 20], [0, 0, 180]],
            ['BoxC', [0.811, 0.24, 10.425], [6, 0.1, 30], [180, 90, 0]],
            ['BoxD', [0.811, 0.24, -9.436], [6, 0.1, 30], [180, 90, 0]]
        ];

        const byName = Object.create(null);

        function addEnvironment([name, x, y, z]) {
            const env = new pc.Entity(name);
            env.addComponent('render', { type: 'box'});
            env.render.material = WhiteMat;
            env.setPosition(x[0], x[1], x[2]);
            env.setLocalScale(y[0], y[1], y[2]);
            env.setEulerAngles(z[0], z[1], z[2]);
            Root.addChild(env);
            byName[name] = env;
            return env;
        }

        function addEnvironmens(list) {
            for (let i = 0; i < list.length; i++) addEnvironment(list[i]);
        };

        addEnvironmens(ENVIRONMENT);

        const GlassMain = assetMap.MainBuilding_Glass.resource.instantiateRenderEntity();
        if (!GlassMain) {
            return;
        }
        GlassMain.findComponents('render').forEach(function (r) {
            if (r.meshInstances && r.meshInstances.length) {
                r.meshInstances.forEach(function (mi) {
                    mi.material = ReflectMatDark;
                });
            } else {
                r.material = ReflectMatDark;
            }
        });
        Glass.addChild(GlassMain);
        GlassMain.setPosition(0.354, 2.291, 3.204);
        GlassMain.setEulerAngles(90, 0, 0);
        GlassMain.setLocalScale(0.98, 0.98, 0.98);

        const GlassAdd = assetMap.AddBuilding_Glass.resource.instantiateRenderEntity();
        if (!GlassAdd) {
            return;
        }
        GlassAdd.findComponents('render').forEach(function (r) {
            if (r.meshInstances && r.meshInstances.length) {
                r.meshInstances.forEach(function (mi) {
                    mi.material = ReflectMatDark;
                });
            } else {
                r.material = ReflectMatDark;
            }
        });
        Glass.addChild(GlassAdd);
        GlassAdd.setPosition(6.942, 3.656, 3.981);
        GlassAdd.setEulerAngles(90, 0, 0);
        GlassAdd.setLocalScale(1, 1, 1);

        const GlassAdd2 = assetMap.AddBuilding_Glass2.resource.instantiateRenderEntity();
        if (!GlassAdd2) {
            return;
        }
        GlassAdd2.findComponents('render').forEach(function (r) {
            if (r.meshInstances && r.meshInstances.length) {
                r.meshInstances.forEach(function (mi) {
                    mi.material = ReflectMat;
                });
            } else {
                r.material = ReflectMat;
            }
        });
        Glass.addChild(GlassAdd2);
        GlassAdd2.setPosition(6.942, 3.656, 3.981);
        GlassAdd2.setEulerAngles(90, 0, 0);
        GlassAdd2.setLocalScale(1, 1, 1);

        const gsplatCurrent = new pc.Entity("GSPlatCurrent");
        gsplatCurrent.setPosition(0.215, 0, 0.246);
        gsplatCurrent.setEulerAngles(180, 0, 0);
        gsplatCurrent.addComponent("gsplat", { asset: assetMap.Complex});
        Main.addChild(gsplatCurrent);

        Main.addComponent("script");
        Main.script.create("carousel", { 
            attributes: {
                camera: Camera,
                scaleFactor: 1.0,
                vertexShader: assetMap.ShaderVert,
                fragmentShader: assetMap.ShaderFrag,
                EnableGlass: Glass
            }
        });

        Root.addComponent("script");
        Root.script.create("amenitiesMode");
        Root.script.create("adjustPixelRatio");
        app.root.addChild(Root);

        hideSplash();
        app.start();
        document.getElementById("start-screen").remove();
        document.querySelector('.mode-panel')?.classList.remove('hidden');
        setupFullscreenButton();
        loadLanguage();
    };
};