var Colliders = pc.createScript('colliders');

Colliders.prototype.initialize = function () {

    let Triggers = this.app.root.findByName('Walls');

    const positions = [
        new pc.Vec3(-0.439, 0, -0.142),
        new pc.Vec3(0.379, 0, -0.222),
        new pc.Vec3(1.163, 0, 0.217),
        new pc.Vec3(-0.493, 0, 0.898),
        new pc.Vec3(0.072, 1, 1.073),
        new pc.Vec3(0.072, 1, -0.623),
        new pc.Vec3(1.778, 0.5, -0.571),
        new pc.Vec3(2.04, 1, 0.212),
        new pc.Vec3(-1.409, 1, 0.56),
        new pc.Vec3(-1.378, 0, -0.548)
    ];
    const extents = [
        new pc.Vec3(0.5, 0.5, 0.6),
        new pc.Vec3(0.4, 0.5, 0.6),
        new pc.Vec3(0.475, 0.5, 0.2),
        new pc.Vec3(0.45, 0.5, 0.115),
        new pc.Vec3(1.9, 1, 0.05),
        new pc.Vec3(1.9, 1, 0.05),
        new pc.Vec3(0.2, 0.5, 0.15),
        new pc.Vec3(0.05, 1, 0.95),
        new pc.Vec3(0.05, 1, 0.6),
        new pc.Vec3(0.4, 0.5, 0.5)
    ];
    for (let i = 1; i <= 10; i++) {
            const name  = 'Trigger_' + i;
            const trigger = new pc.Entity(name);
            trigger.tags.add('walls');
            const pos = positions[i - 1];
            trigger.setPosition(pos.x, pos.y, pos.z);
            Triggers.addChild(trigger);
            const he = extents[i - 1];
            trigger.addComponent('collision', {
                type: 'box',
                halfExtents: he.clone()
            });
    }
};