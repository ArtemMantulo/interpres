export async function startDefault(app, Coins, Character, Player) {
    
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    app.graphicsDevice.maxPixelRatio = isMobile ? 1.5 : 2;
    app.graphicsDevice.resizeCanvas(app.graphicsDevice.canvas.width, app.graphicsDevice.canvas.height);
    Character.addComponent('script');
    
    if (isMobile) {
        Character.script.create('touchMovement');
        app.once('update', () => {
            const status = Character.script?.touchMovement || Character.script?.instances?.touchMovement?.[0];
            status.animEntity = Player;
            if (!status.animEntity.anim) {
                Player.animEntity.addComponent('anim', { activate: true });
            }
        });
    } else {
        Character.script.create('keyboardMovement');
        app.once('update', () => {
            const status = Character.script?.keyboardMovement || Character.script?.instances?.keyboardMovement?.[0];
            status.animEntity = Player;
            if (!status.animEntity.anim) {
                Player.animEntity.addComponent('anim', { activate: true });
            }
        });
    }

    Coins.script.create('coinsChecker');
}