import { createSplash, setSplashProgress, hideSplash, loadAssets } from './assets/scripts/loader.js';
import { setupFullscreenButton } from './assets/scripts/fullscreen.js';
import { loadLanguage } from './assets/scripts/language.js';

const canvas = document.getElementById('application-canvas');

const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
    graphicsDeviceOptions: {
        alpha: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        devicePixelRatio: false,
        antialias: false,
        powerPreference: 'high-performance',
        xrCompatible: false,
        preferWebGl2: true,
        deviceTypes: ["webgl2", "webgl1"]
    }
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

window.addEventListener('resize', () => app.resizeCanvas());
document.getElementById("start-button")?.addEventListener("click", startApp);

const assetMap = {
    galleryCsv: new pc.Asset("gallery.csv", "text", { url: "assets/data/dataGallery.csv" }),
    currentPly: new pc.Asset("current.ply", "gsplat", { url: "assets/gs/Current.compressed.ply" }),
    futurePly: new pc.Asset("future.ply", "gsplat", { url: "assets/gs/Future.compressed.ply" })
};

const scriptAssets = [
    new pc.Asset("adjustPixelRatio.js", "script", { url: "assets/scripts/adjustPixelRatio.js" }),
    new pc.Asset("orbitCamera.js", "script", { url: "assets/scripts/orbitCamera.js" }),
    new pc.Asset("amenitiesMode.js", "script", { url: "assets/scripts/amenitiesMode.js" }),
    new pc.Asset("stateSwitcher.js", "script", { url: "assets/scripts/stateSwitcher.js"}),
    new pc.Asset("gallery.js", "script", { url: "assets/scripts/gallery.js" })
];

scriptAssets.forEach(asset => app.assets.add(asset));
Object.values(assetMap).forEach(asset => app.assets.add(asset));

function startApp() {
    createSplash();

    const allAssets = [...Object.values(assetMap), ...scriptAssets];
    loadAssets(app, allAssets, () => {
        createScene();
    }, setSplashProgress);

    function createScene() {

        const Root = new pc.Entity("Root");

        const Camera = new pc.Entity("Camera");
        Camera.setPosition(-1.792, 0.976, 1.127);
        Camera.setEulerAngles(-24.6, -58, 0);
        Camera.addComponent("camera", {clearColor: new pc.Color(1, 1, 1, 1), fov: 50});
        Camera.addComponent("script");
        Camera.script.create("orbitCamera");
        Root.addChild(Camera);

        const Main = new pc.Entity("Main");
        Main.setPosition(-0.217, 0.204, 0.025);
        Root.addChild(Main);
      
        const gsplatCurrent = new pc.Entity("GSPlatCurrent");
        gsplatCurrent.setPosition(0.323, 0.102, 0.246);
        gsplatCurrent.setEulerAngles(180, -90, 0);
        gsplatCurrent.addComponent("gsplat", { asset: assetMap.currentPly });
        gsplatCurrent.enabled = true;

        const gsplatFuture = new pc.Entity("GSPlatFuture");
        gsplatFuture.setPosition(0.323, 0.102, 0.246);
        gsplatFuture.setEulerAngles(180, -90, 0);
        gsplatFuture.addComponent("gsplat", { asset: assetMap.futurePly });
        gsplatFuture.enabled = false;

        Root.addChild(gsplatCurrent);
        Root.addChild(gsplatFuture);

        gsplatCurrent.addComponent("script");
        gsplatCurrent.script.create("stateSwitcher", {
            attributes: {
                currentEntity: gsplatCurrent,
                futureEntity: gsplatFuture
            }
        });

        Root.addComponent("script");
        Root.script.create("gallery", {
            attributes: { galleryTextAsset: assetMap.galleryCsv }
        });
        Root.script.create("amenitiesMode");
        Root.script.create("adjustPixelRatio");
        app.root.addChild(Root);

        hideSplash();
        app.start();
        document.getElementById("start-screen").remove();
        document.querySelector('.mode-panel')?.classList.remove('hidden');
        document.querySelector('.state-panel')?.classList.remove('hidden');
        setupFullscreenButton();
        loadLanguage();
    };
};