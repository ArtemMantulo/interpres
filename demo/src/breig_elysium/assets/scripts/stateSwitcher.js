var StateSwitcher = pc.createScript('stateSwitcher');

StateSwitcher.attributes.add('currentEntity', { type: 'entity' });
StateSwitcher.attributes.add('futureEntity', { type: 'entity' });

StateSwitcher.prototype.initialize = function () {
    const buttons = document.querySelectorAll('.state-panel .button');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const state = btn.dataset.state;

            if (state === "0") {
                this.currentEntity.enabled = true;
                this.futureEntity.enabled = false;
            } else {
                this.currentEntity.enabled = false;
                this.futureEntity.enabled = true;
            }
        });
    });
};