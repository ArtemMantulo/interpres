function createSplash() {
    const wrapper = document.createElement('div');
    wrapper.id = 'application-splash-wrapper';
    wrapper.innerHTML = `
        <div id="application-splash">
            <div style="color:white;font-size:36px;text-align:center;font-family:sans-serif;margin-bottom:5px;">Loading Data...</div>
            <div id="progress-bar-container">
                <div id="progress-bar"></div>
            </div>
            <div id="progress-text" style="color:white;font-size:22px;text-align:center;margin-top:8px;font-family:sans-serif;">0%</div>
        </div>
    `;
    document.body.appendChild(wrapper);
    const css = document.createElement('style');
    css.textContent = `
        body { background-color: #283538; }
        
        #application-splash-wrapper {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-color: #283538;
            z-index: 9999;
        }
        #application-splash {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 264px;
        }
    #progress-bar-container {
            width: 100%;
            height: 2px;
            background-color: #1d292c;
        }

        #progress-bar {
            height: 100%;
            width: 0%;
            background-color: #f60;
            transition: width 0.2s ease-out; /* <<< Плавное заполнение */
        }
    `;
    document.head.appendChild(css);
}

function setSplashProgress(value) {
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    if (bar && text) {
        const percent = Math.floor(value * 100);
        bar.style.width = percent + '%';
        text.textContent = percent + '%';
    }
}

function hideSplash() {
    const splash = document.getElementById('application-splash-wrapper');
    if (splash) splash.remove();
}

const canvas = document.getElementById('application-canvas');
const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas)
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
window.addEventListener('resize', () => app.resizeCanvas());

const assetMap = {
    galleryCsv: new pc.Asset("gallery.csv", "text", { url: "/assets/playcanvasassets/data/dataGallery.csv" }),
    amenitiesCurrent: new pc.Asset("dataAmenitiesCurrent.csv", "text", { url: "/assets/playcanvasassets/data/dataAmenitiesCurrent.csv" }),
    amenitiesFuture: new pc.Asset("dataAmenitiesFuture.csv", "text", { url: "/assets/playcanvasassets/data/dataAmenitiesFuture.csv" }),
    html: new pc.Asset("asset.html", "html", { url: "/assets/playcanvasassets/web/asset.html" }),
    css: new pc.Asset("asset.css", "css", { url: "/assets/playcanvasassets/web/asset.css" }),
    currentPly: new pc.Asset("current.ply", "gsplat", { url: "/assets/playcanvasassets/gs/Current_7april.compressed.ply" }),
    futurePly: new pc.Asset("future.ply", "gsplat", { url: "/assets/playcanvasassets/gs/Future_7april1.compressed.ply" })
};

const scriptAssets = [
    new pc.Asset("orbit-camera.js", "script", { url: "/assets/playcanvasassets/scripts/orbit-camera.js" }),
    new pc.Asset("mouse-input.js", "script", { url: "/assets/playcanvasassets/scripts/mouse-input.js" }),
    new pc.Asset("touch-input.js", "script", { url: "/assets/playcanvasassets/scripts/touch-input.js" }),
    new pc.Asset("modeSwitcher.js", "script", { url: "/assets/playcanvasassets/scripts/modeSwitcher.js" }),
    new pc.Asset("gallery.js", "script", { url: "/assets/playcanvasassets/scripts/gallery.js" }),
    new pc.Asset("adjustPixelRatio.js", "script", { url: "/assets/playcanvasassets/scripts/adjustPixelRatio.js" }),
    new pc.Asset("uiLoader.js", "script", { url: "/assets/playcanvasassets/scripts/uiLoader.js" }),
    new pc.Asset("amenitiesMode.js", "script", { url: "/assets/playcanvasassets/scripts/amenitiesMode.js" })
];

scriptAssets.forEach(asset => app.assets.add(asset));
Object.values(assetMap).forEach(asset => app.assets.add(asset));

createSplash();

const allAssets = [...Object.values(assetMap), ...scriptAssets];
const loader = new pc.AssetListLoader(allAssets, app.assets);
const splashStart = performance.now();

let loaded = 0;
function loadNextAsset(index) {
    if (index >= allAssets.length) {
        createScene(); // Все ассеты загружены — создаём сцену
        return;
    }

    const asset = allAssets[index];
    app.assets.load(asset);
    asset.ready(() => {
        loaded++;
        setSplashProgress(loaded / allAssets.length);
        loadNextAsset(index + 1);
    });
}


loadNextAsset(0);

function createScene() {

    const Root = new pc.Entity("Root");


    const Camera = new pc.Entity("Camera");
    Camera.setPosition(-1.792, 0.976, 1.127);
    Camera.setEulerAngles(-24.6, -58, 0);
    Camera.addComponent("camera", { clearColor: new pc.Color(1, 1, 1) });
    Camera.addComponent("script");
    Camera.script.create("orbitCamera", {
        attributes: {
            focusEntity: null,
            defaultDistance: 5,
            distanceMax: 7,
            distanceMin: 3.5,
            zoomLerpSpeed: 3,
            inertiaFactor: 0,
            enablePitchLimits: true,
            pitchMax: 60,
            pitchMin: 20,
            rotationLerpSpeed: 5,
            autoRotate: true,
            autoRotateSpeed: -5,
            autoRotateDelay: 3,
            autoRender: true,
            frameOnStart: true
        }
    });

    Camera.script.once('orbitCamera:ready', function (scriptInstance) {
        scriptInstance.focusEntity = Main;

        Camera.script.create("mouseInput", {
            orbitSensitivity: 0.3,
            distanceSensitivity: 0.5
        });
        Camera.script.create("touchInput", {
            orbitSensitivity: 0.4,
            distanceSensitivity: 0.2
        });
    });

    Camera.script.create("mouseInput", { orbitSensitivity: 0.3, distanceSensitivity: 0.5 });
    Camera.script.create("touchInput", { orbitSensitivity: 0.4, distanceSensitivity: 0.2 });
    Root.addChild(Camera);

    const Main = new pc.Entity("Main");
    Main.setPosition(-0.217, 0.204, 0.025);
    Root.addChild(Main);

    const html = new pc.Entity("html");
    html.addComponent("script");
    html.script.create("uiLoader");
    Root.addChild(html);

    // ApartmentsCurrent, ApartmentsFuture
    const ApartmentsCurrent = new pc.Entity("ApartmentsCurrent");
    const ApartmentsFuture = new pc.Entity("ApartmentsFuture");
    Root.addChild(ApartmentsCurrent);
    Root.addChild(ApartmentsFuture);

    // Current
    const Current = new pc.Entity("Current");
    Current.enabled = false;
    const CurrentGS = new pc.Entity("Current_GS");
    CurrentGS.setPosition(0.323, 0.102, 0.246);
    CurrentGS.setEulerAngles(180, -90, 0);
    CurrentGS.addComponent("gsplat", { asset: assetMap.currentPly });
    Current.addChild(CurrentGS);

    const AmenitiesCurrent = new pc.Entity("AmenitiesCurrent");
    AmenitiesCurrent.addComponent("script");
    AmenitiesCurrent.script.create("amenitiesMode", {
        attributes: {
            cameraEntity: Camera,
            file: assetMap.amenitiesCurrent,
            offsetY: 0.1,
            focusLerpSpeed: 3,
            lookLerpSpeed: 3,
            targetDistance: 2
        }
    });
    Current.addChild(AmenitiesCurrent);
    Root.addChild(Current);

    function createAmenity(name, x, y, z) {
        const e = new pc.Entity(name);
        e.setLocalPosition(x, y, z);
        return e;
    }

    AmenitiesCurrent.addChild(createAmenity("Gym", -1.977, 0.363, 0.074));
    AmenitiesCurrent.addChild(createAmenity("LoungeArea", -1.518, 0.363, 0.076));
    AmenitiesCurrent.addChild(createAmenity("Parking", -0.921, 0.363, -1.016));
    AmenitiesCurrent.addChild(createAmenity("Pool", -0.325, 0.363, -0.036));
    AmenitiesCurrent.addChild(createAmenity("Playground", 0.01, 0.363, 0.866));
    AmenitiesCurrent.addChild(createAmenity("Outdoor", -1.812, 0.363, 0.469));
    AmenitiesCurrent.addChild(createAmenity("RelaxArea", -1.731, 0.363, 0.801));
    AmenitiesCurrent.addChild(createAmenity("Volleyball", -1.088, 0.363, 0.863));
    AmenitiesCurrent.addChild(createAmenity("Walking", -0.653, 0.363, 1.122));
    AmenitiesCurrent.addChild(createAmenity("Fireplace", -0.483, 0.363, 0.771));
    AmenitiesCurrent.addChild(createAmenity("Amphitheater", -1.085, 0.363, -0.009));
    AmenitiesCurrent.addChild(createAmenity("WalkingRest", -0.819, 0.363, -0.31));
    AmenitiesCurrent.addChild(createAmenity("Bar", -0.519, 0.363, -0.66));

    // Future
    const Future = new pc.Entity("Future");
    Future.enabled = false;
    const FutureGS = new pc.Entity("Future_GS");
    FutureGS.setPosition(0.323, 0.102, 0.246);
    FutureGS.setEulerAngles(180, -90, 0);
    FutureGS.addComponent("gsplat", { asset: assetMap.futurePly });
    Future.addChild(FutureGS);

    const AmenitiesFuture = new pc.Entity("AmenitiesFuture");
    AmenitiesFuture.addComponent("script");
    AmenitiesFuture.script.create("amenitiesMode", {
        attributes: {
            cameraEntity: Camera,
            file: assetMap.amenitiesFuture,
            offsetY: 0.1,
            focusLerpSpeed: 3,
            lookLerpSpeed: 3,
            targetDistance: 2
        }
    });
    Future.addChild(AmenitiesFuture);
    Root.addChild(Future);

    function createAmenity(name, x, y, z) {
        const e = new pc.Entity(name);
        e.setLocalPosition(x, y, z);
        return e;
    }

    AmenitiesFuture.addChild(createAmenity("Gym", -1.977, 0.363, 0.074));
    AmenitiesFuture.addChild(createAmenity("LoungeArea", -1.518, 0.363, 0.076));
    AmenitiesFuture.addChild(createAmenity("Parking", -0.921, 0.363, -1.016));
    AmenitiesFuture.addChild(createAmenity("Pool", -0.325, 0.363, -0.036));
    AmenitiesFuture.addChild(createAmenity("Playground", -0.538, 0.363, 0.7));
    AmenitiesFuture.addChild(createAmenity("Walking", -0.653, 0.363, 1.122));
    AmenitiesFuture.addChild(createAmenity("Bar", -0.519, 0.363, -0.66));

    Root.addComponent("script");
    Root.script.create("modeSwitcher", {
        attributes: {
            showApartmentsButton: false,
            cameraEntity: Camera,
            cameraDistances: [3.5, 3.5, 3.5],
            distanceLerpSpeed: 5,
            amenitiesMinDistance: 2,
            homeTarget: Main,
            apartmentsTarget: Main,
            amenitiesTarget: Main,
            apartmentsUI: ApartmentsCurrent,
            apartmentsUIFuture: ApartmentsFuture,
            amenitiesUI: AmenitiesCurrent,
            amenitiesUIFuture: AmenitiesFuture,
            currentObjects: Current,
            futureObjects: Future
        }
    });
    Root.script.create("gallery", {
        attributes: { galleryTextAsset: assetMap.galleryCsv }
    });
    Root.script.create("adjustPixelRatio", {
        attributes: { scaleDivisor: 1.4 }
    });

    app.root.addChild(Root);

    hideSplash();
    app.start();
};