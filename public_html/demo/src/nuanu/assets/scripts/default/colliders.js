var Colliders = pc.createScript('colliders');

Colliders.prototype.initialize = function () {

    let Triggers = this.app.root.findByName('Walls');

    const positionsBig = [
        new pc.Vec3(-9.043, -0.011, 4.683),
        new pc.Vec3(-12.749, 0.704, 0.498),
        new pc.Vec3(-14.039, 0.704, -2.917),
        new pc.Vec3(-12.698, 1.174, -1.224),
        new pc.Vec3(-7.552, 1.174, -9.621),
        new pc.Vec3(-9.16, 1.174, -10.293),
        new pc.Vec3(-8.453, 1.174, -8.948),
        new pc.Vec3(-5.681, 0.905, -10.139),
        new pc.Vec3(-1.054, 0.905, -7.983)
    ];

    const radius = [ 1.4, 1.36, 0.9, 2, 1.62, 1.19, 1.19, 1.3, 1.3];

    for (let i = 1; i <= 9; i++) {
            const trigger = new pc.Entity();
            Triggers.addChild(trigger);
            const pos = positionsBig[i - 1];
            trigger.setPosition(pos.x + 6.328, pos.y + 2, pos.z + 5.905);
            trigger.addComponent('collision', {
                type: 'capsule',
                radius: radius[i - 1],
                height: 8,
                axis: 1
            });
            trigger.addComponent('rigidbody', { type: 'static', friction: 0, restitution: 0 });

    }

    const positionsSmall = [
        new pc.Vec3(7.895, 0.987, -10.169),
        new pc.Vec3(3.148, 0.987, -17.594),
        new pc.Vec3(-6.212, 0.987, -19.707),
        new pc.Vec3(-20.202, 0.987, -13.373),
        new pc.Vec3(-23.326, 0.987, -8.174),
        new pc.Vec3(-17.108, 0.987, -0.38),
        new pc.Vec3(-9.577, 0.987, 7.948),
        new pc.Vec3(5.858, 0.987, 3.247)
    ];

    const rotationsSmall = [
        new pc.Vec3(0, -71, 0),
        new pc.Vec3(0, -28, 0),
        new pc.Vec3(0, 10.55, 0),
        new pc.Vec3(0, 57, 0),
        new pc.Vec3(180, 20.6, 180),
        new pc.Vec3(180, 80.75, 180),
        new pc.Vec3(180, 35, 180),
        new pc.Vec3(180, -48, 180),
    ];

    const extents = [
        new pc.Vec3(12, 5, 0.3),
        new pc.Vec3(6, 5, 0.3),
        new pc.Vec3(12, 5, 0.3),
        new pc.Vec3(10, 5, 0.3),
        new pc.Vec3(6, 5, 0.3),
        new pc.Vec3(6, 5, 0.3),
        new pc.Vec3(8, 5, 0.3),
        new pc.Vec3(14, 5, 0.3)
    ];

    for (let j = 1; j <= 8; j++) {
            const triggerBox = new pc.Entity();
            Triggers.addChild(triggerBox);
            const pos = positionsSmall[j - 1];
            const rot = rotationsSmall[j - 1];
            const heWall = extents[j - 1];
            triggerBox.setPosition(pos.x + 6.328, pos.y + 2, pos.z + 5.905);
            triggerBox.setEulerAngles(rot.x, rot.y, rot.z);
            triggerBox.addComponent('collision', {
                type: 'box',
                halfExtents: heWall.clone()
            });
            triggerBox.addComponent('rigidbody', { type: 'static', friction: 0, restitution: 0 });

    }
};