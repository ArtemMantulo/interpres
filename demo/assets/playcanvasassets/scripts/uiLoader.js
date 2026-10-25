class UiLoader extends pc.ScriptType {
    initialize() {
        this.div = document;
        this.connectButtons();
    }

    connectButtons() {
        const buttons = this.div.querySelectorAll('.button');
        const switcherReady = () => {
            if (window.modeSwitcher && typeof window.modeSwitcher.setMode === 'function') {
                buttons.forEach(btn => {
                    const modeAttr = btn.dataset.mode;
                    const stateAttr = btn.dataset.state;

                    // === MODE BUTTON ===
                    if (/^\d+$/.test(modeAttr)) {
                        const mode = parseInt(modeAttr, 10);
                        btn.addEventListener('click', () => {
                            window.modeSwitcher.setMode(mode);

                            buttons.forEach(b => {
                                if (/^\d+$/.test(b.dataset.mode)) {
                                    b.classList.remove('active');
                                }
                            });
                            btn.classList.add('active');
                        });

                    // === GALLERY BUTTON ===
                    } else if (modeAttr === 'Gallery') {
                        btn.addEventListener('click', () => {
                            document.querySelector('.gallery-panel')?.classList.remove('hidden');
                        });

                    // === STATE BUTTON ===
                    } else if (/^\d+$/.test(stateAttr)) {
                        const state = parseInt(stateAttr, 10);
                        btn.addEventListener('click', () => {
                            if (typeof window.modeSwitcher.setState === 'function') {
                                window.modeSwitcher.setState(state);

                                buttons.forEach(b => {
                                    if (b.dataset.state !== undefined) {
                                        b.classList.remove('active');
                                    }
                                });
                                btn.classList.add('active');

                                window.modeSwitcher.setMode(window.modeSwitcher.currentMode);
                            }
                        });
                    }
                });
            } else {
                requestAnimationFrame(switcherReady);
            }
        };
        switcherReady();
    }
}
pc.registerScript(UiLoader, 'uiLoader');
