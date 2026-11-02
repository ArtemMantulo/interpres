var ModeSwitcher = pc.createScript('modeSwitcher');


ModeSwitcher.attributes.add('showApartmentsButton', { type: 'boolean', default: true, title: 'Show Apartments'});

ModeSwitcher.attributes.add('cameraEntity', { type: 'entity' });
ModeSwitcher.attributes.add('cameraDistances', { type: 'number', array: true });
ModeSwitcher.attributes.add('distanceLerpSpeed', { type: 'number', default: 5 });
ModeSwitcher.attributes.add('amenitiesMinDistance', { type: 'number', default: 0, title: 'Min Distance (Amenities)'});

ModeSwitcher.attributes.add('homeTarget', { type: 'entity' });
ModeSwitcher.attributes.add('apartmentsTarget', { type: 'entity' });
ModeSwitcher.attributes.add('amenitiesTarget', { type: 'entity' });

ModeSwitcher.attributes.add('apartmentsUI', { type: 'entity' });
ModeSwitcher.attributes.add('apartmentsUIFuture', { type: 'entity' });
ModeSwitcher.attributes.add('amenitiesUI', { type: 'entity' });
ModeSwitcher.attributes.add('amenitiesUIFuture', { type: 'entity' });

ModeSwitcher.attributes.add('currentObjects', { type: 'entity' });
ModeSwitcher.attributes.add('futureObjects', { type: 'entity' });

ModeSwitcher.prototype.initialize = function () {
    this.orbitScript = this.cameraEntity?.script.orbitCamera;
    if (!this.orbitScript) {
        console.error("OrbitCamera not found.");
        return;
    }

    this.initialMinDistance = this.orbitScript.distanceMin;
    this.targets = [this.homeTarget, this.apartmentsTarget, this.amenitiesTarget];
    this.currentMode = -1;
    this.state = 0;
    this.distanceLerpActive = false;

    window.modeSwitcher = this;

    setTimeout(() => {
    const buttons = document.querySelectorAll('.button[data-mode]');
    buttons.forEach((btn) => {
            const modeAttr = btn.getAttribute('data-mode');

            if (parseInt(modeAttr, 10) === 1 && !this.showApartmentsButton) {
                btn.remove();
                return;
            }

            if (!/^[0-9]+$/.test(modeAttr)) return;

            const numericMode = parseInt(modeAttr, 10);
            btn.addEventListener('click', () => this.setMode(numericMode));
        });
    }, 0);



    const stateButtons = document.querySelectorAll('.button[data-state]');
    stateButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const state = parseInt(btn.getAttribute('data-state'), 10);
            this.setState(state);

            stateButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const prevMode = this.currentMode;
            this.currentMode = -1;

            // 💡 Не сохраняем зум, если режим 3
            if (prevMode === 2) {
                this._suppressFocusOnTarget = true;
                this.setMode(2); // перезапуск
                this._suppressFocusOnTarget = false;
            } else {
                const savedDistance = this.orbitScript.distance;
                this.setMode(prevMode);
                this.orbitScript.distance = savedDistance;
                this.distanceLerpActive = false;
            }
        });
    });

    this.setState(0);
    this.setMode(0);
};

ModeSwitcher.prototype.setState = function (state) {
    this.state = state;

    if (this.currentObjects) this.currentObjects.enabled = (state === 0);
    if (this.futureObjects) this.futureObjects.enabled = (state === 1);

    this.amenitiesUI.enabled = (state === 0);
    this.amenitiesUIFuture.enabled = (state === 1);

    const container = document.getElementById('amenities-container');
    if (container) container.innerHTML = '';

    const prevMode = this.currentMode;

    if (prevMode === 2) {
        const script = (state === 0 ? this.amenitiesUI : this.amenitiesUIFuture)?.script?.amenitiesMode;
        if (script) {
            script.rebuildAmenityPanels?.();
            script.forceUpdatePanelPositions?.();
        }
    } else {
        const savedDistance = this.orbitScript.distance;
        this.currentMode = -1;
        this.setMode(prevMode);
        this.orbitScript.distance = savedDistance;
        this.distanceLerpActive = false;
    }
};

ModeSwitcher.prototype.setMode = function (index) {
    
    if (typeof index !== 'number' || isNaN(index)) return;

    const isCurrent = this.state === 0;
    const isFuture = this.state === 1;
    const isSameMode = this.currentMode === index;

    if (this.currentMode === 1 && index !== 1) {
        const prevScript = (this.currentMode === 1 && this.state === 0
            ? this.apartmentsUI?.script?.apartmentsMode
            : this.apartmentsUIFuture?.script?.apartmentsMode);
        prevScript?.reset?.();
    }


    this.apartmentsUI.enabled = false;
    this.apartmentsUIFuture.enabled = false;
    this.amenitiesUI.enabled = false;
    this.amenitiesUIFuture.enabled = false;

    if (index === 1 && isCurrent) this.apartmentsUI.enabled = true;
    if (index === 1 && isFuture) this.apartmentsUIFuture.enabled = true;
    if (index === 2 && isCurrent) this.amenitiesUI.enabled = true;
    if (index === 2 && isFuture) this.amenitiesUIFuture.enabled = true;

    // === Разблокировать управление камерой при выходе из режима 2 ===
    if (this.currentMode === 1 && index !== 1) {
        const prevScript = (this.state === 1 ? this.apartmentsUI : this.apartmentsUIFuture)?.script?.apartmentsMode;
        prevScript?.setRotationZoomInputEnabled(true);
    }

    const target = this.targets[index];
    if (!target) return;

    if (this.cameraDistances.length > index) {
        this.orbitScript.defaultDistance = this.cameraDistances[index];
        this.distanceLerpActive = true;
    }

    this.orbitScript.enableAutoRotate(index === 0);
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) infoPanel.classList.remove('visible');

    const aptPanel = document.getElementById('info-apartments');
    if (aptPanel) aptPanel.classList.remove('visible');

    this.orbitScript.setInputEnabled?.(true);
    this.focusOnTarget(target);
    target.enabled = true;
    this.targets.forEach((t, i) => {
        if (i !== index && t) t.enabled = false;
    });

    const container = document.getElementById('amenities-container');
    if (container) container.innerHTML = '';


    if (index === 0) {
        const statePanel = document.querySelector('.state-switcher');
        if (statePanel) {
            statePanel.style.display = 'flex';
        }
    }

    if (index === 2) {
        const script = (isCurrent ? this.amenitiesUI : this.amenitiesUIFuture)?.script?.amenitiesMode;
        if (script) {
            script.reset?.();
            script.rebuildAmenityPanels?.();
            script.forceUpdatePanelPositions?.();
        }

        const statePanel = document.querySelector('.state-switcher');
        if (statePanel) {
            statePanel.style.display = 'flex';
        }
    }

    if (index === 1) {
        const script = (isCurrent ? this.apartmentsUI : this.apartmentsUIFuture)?.script?.apartmentsMode;
        script?.reset?.();
        script?.showPanel?.();

        const statePanel = document.querySelector('.state-switcher');
        if (statePanel) {
            statePanel.style.display = 'flex';
        }
    } else {
        const panel = document.getElementById('apartments-panel');
        if (panel) panel.classList.remove('visible');
    }
    if (index === 2 && this.amenitiesMinDistance > 0) {
        this.orbitScript.distanceMin = this.amenitiesMinDistance;
    } else {
        this.orbitScript.distanceMin = this.initialMinDistance;
    }

    this.currentMode = index;
};

ModeSwitcher.prototype.focusOnTarget = function (targetEntity) {
    this.app.on('update', function lerpToTarget(dt) {
        const pivot = this.orbitScript.pivotPoint;
        const speed = 2;
        pivot.lerp(pivot, targetEntity.getPosition(), dt * speed);
        if (pivot.distance(targetEntity.getPosition()) < 0.01) {
            pivot.copy(targetEntity.getPosition());
            this.app.off('update', lerpToTarget);
        }
    }, this);
};

ModeSwitcher.prototype.update = function (dt) {
    if (this.distanceLerpActive) {
        const current = this.orbitScript.distance;
        const target = this.orbitScript.defaultDistance;
        const newDist = pc.math.lerp(current, target, dt * this.distanceLerpSpeed);
        this.orbitScript.distance = newDist;
        if (Math.abs(newDist - target) < 0.05) {
            this.orbitScript.distance = target;
            this.distanceLerpActive = false;
        }
    }
};