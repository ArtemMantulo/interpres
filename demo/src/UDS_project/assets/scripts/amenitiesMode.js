var AmenitiesMode = pc.createScript('amenitiesMode');

AmenitiesMode.attributes.add('mainEntity', { type: 'entity' });
AmenitiesMode.attributes.add('currentCsv', { type: 'asset' });
AmenitiesMode.attributes.add('futureCsv', { type: 'asset' });

AmenitiesMode.prototype.initialize = function () {
    this.cameraEntity = this.app.root.findByName('Camera');
    this.amenitiesContainer = document.querySelector('#amenities-container');

    const modeButtons = document.querySelectorAll('.mode-panel .button');
    const modeBtn1 = document.querySelector('[data-mode="1"]');
    const modeBtn0 = document.querySelector('[data-mode="0"]');

    modeBtn1.addEventListener('click', () => {
        modeButtons.forEach(btn => btn.classList.remove('active'));
        modeBtn1.classList.add('active');

        this.loadDataFromCsv();
    });

    modeBtn0.addEventListener('click', () => {
        modeButtons.forEach(btn => btn.classList.remove('active'));
        modeBtn0.classList.add('active');

        this.amenitiesContainer.innerHTML = '';
        this.amenitiesData = [];

        const orbit = this.cameraEntity?.script?.orbitCamera;
        if (orbit) {

            orbit.adjustDistanceForOrientation();
            orbit.setDistanceLimits(orbit.minDistance, orbit.maxDistance);

            const homeTarget = new pc.Vec3(0.45, 0, 0.246);
            orbit.focusOn(homeTarget);
            orbit.lookAtPointSmoothly(homeTarget);
        }
    });

    this.currentState = "0";

    this.screen = this.app.screen;
    this.amenitiesData = [];
};

AmenitiesMode.prototype.loadDataFromCsv = function () {
    const lang = (window.currentLang || navigator.language || 'en').slice(0, 2);
    //const lang = 'en';

    const path = `assets/data/dataAmenities_${lang}.csv`;
    const fallback = `assets/data/dataAmenities_en.csv`;

    this.app.assets.loadFromUrl(path, 'text', (err, asset) => {
        if (err) {
            console.warn(`Cant load ${path}, try fallback: ${fallback}`);
            this.app.assets.loadFromUrl(fallback, 'text', (err2, fallbackAsset) => {
                if (err2) {
                    console.error("Cant load fallback CSV:", fallback, err2);
                    return;
                }
                this.parseCsv(fallbackAsset.resource);
            });
            return;
        }

        this.parseCsv(asset.resource);
    });
};

AmenitiesMode.prototype.parseCsv = function (csvText) {
    const rows = csvText.trim().split('\n');
    this.amenitiesContainer.innerHTML = '';
    this.amenitiesData = [];

    rows.forEach((row, index) => {
        const [icon, title, x, y, z] = row.split(';');

        const dom = document.createElement('div');
        dom.className = 'amenities';
        dom.innerHTML = `
            <div class="glass-panel border-shadow"></div>
            <div class="panel-container">
                <img class="amenities-icon" src="${icon.trim()}" />
                <div class="amenities-text">${title.trim()}</div>
            </div>
        `;
        this.amenitiesContainer.appendChild(dom);

        const worldPos = new pc.Vec3(parseFloat(x), parseFloat(y), parseFloat(z));
        this.amenitiesData.push({ dom, worldPos });

        dom.dataset.index = index;

        dom.addEventListener('click', () => {
            this.focusCameraOn(worldPos);
        });
    });
};

AmenitiesMode.prototype.worldToScreen = function (worldPos) {
    const camera = this.app.root.findByName('Camera');
    if (!camera || !camera.camera) return null;

    const screenPos = new pc.Vec3();
    camera.camera.worldToScreen(worldPos, screenPos);

    return {
        x: screenPos.x,
        y: screenPos.y
    };
};

AmenitiesMode.prototype.updateDomPositions = function () {

    const camera = this.app.root.findByName('Camera');
    if (!camera || !camera.camera) return;

    const canvas = this.app.graphicsDevice.canvas;
    const rect = canvas.getBoundingClientRect();

    this.amenitiesData.forEach(({ dom, worldPos }) => {
        const screenPos = new pc.Vec3();
        camera.camera.worldToScreen(worldPos, screenPos);

        if (screenPos.z > 0 && !isNaN(screenPos.x) && !isNaN(screenPos.y)) {
            const x = rect.left + screenPos.x;
            const y = rect.top + screenPos.y;

            const domRect = dom.getBoundingClientRect();
            const offsetX = domRect.width / 2;
            const offsetY = domRect.height / 2;
            dom.style.left = `${x - offsetX}px`;
            dom.style.top = `${y - offsetY}px`;
            dom.style.position = 'absolute';
            dom.style.display = 'block';
        } else {
            dom.style.display = 'none';
        }
    });
};

AmenitiesMode.prototype.postUpdate = function (dt) {
    this.updateDomPositions();
};

AmenitiesMode.prototype.focusCameraOn = function (targetPosition) {
    if (!this.cameraEntity || !this.cameraEntity.script || !this.cameraEntity.script.orbitCamera) return;

    const orbit = this.cameraEntity.script.orbitCamera;
    orbit.isZooming = false;
    orbit.touching = false;
    orbit.lastTouchDistance = null;

    orbit.setAmenitiesDistanceByOrientation();
    orbit.focusOn(targetPosition);
    orbit.lookAtPointSmoothly(targetPosition);
};