var WallColliders = pc.createScript('wallColliders');

WallColliders.attributes.add('wallsTag', {
    type: 'string', default: 'walls', title: 'Walls Tag'
});

WallColliders.attributes.add('refreshInterval', {
    type: 'number', default: 0.5, title: 'Refresh Interval (sec)'
});

WallColliders.prototype.initialize = function () {
    this._obstacles = [];
    this._timer = this.refreshInterval;
};

WallColliders.prototype.update = function (dt) {
    this._timer += dt;
    if (this._timer >= this.refreshInterval) {
        this._timer = 0;
        this.refresh();
    }
};

WallColliders.prototype.refresh = function () {
    const walls = this.app.root.findByTag(this.wallsTag) || [];
    const obs = [];

    for (let i = 0; i < walls.length; i++) {
        const e = walls[i];
        if (!e.enabled || !e.collision || e.collision.type !== 'box') continue;
        const aabb = this._computeWorldAABBFromCollisionBox(e);
        if (aabb) obs.push(aabb);
    }
    this._obstacles = obs;
};

WallColliders.prototype.resolve = function (nextPos, radius, verticalTolerance, keepY) {
    const out = nextPos.clone();
    if (typeof keepY === 'number') out.y = keepY;

    const r = radius || 0.15;
    const yTol = (verticalTolerance != null) ? verticalTolerance : 0.6;

    for (let i = 0; i < this._obstacles.length; i++) {
        const a = this._obstacles[i];

        const centerY = 0.5 * (a.min.y + a.max.y);
        const halfY   = 0.5 * (a.max.y - a.min.y);
        const dy = Math.abs(out.y - centerY);
        if (dy > halfY + yTol) continue;

        const cx = pc.math.clamp(out.x, a.min.x, a.max.x);
        const cz = pc.math.clamp(out.z, a.min.z, a.max.z);

        const dx = out.x - cx;
        const dz = out.z - cz;
        const dist2 = dx*dx + dz*dz;

        if (dist2 < r * r - 1e-8) {
            const dist = Math.sqrt(Math.max(dist2, 1e-12));
            if (dist > 1e-6) {
                const push = (r - dist);
                out.x += (dx / dist) * push;
                out.z += (dz / dist) * push;
            } else {
                const left   = Math.abs(out.x - a.min.x);
                const right  = Math.abs(a.max.x - out.x);
                const back   = Math.abs(out.z - a.min.z);
                const front  = Math.abs(a.max.z - out.z);

                if (Math.min(left, right) < Math.min(back, front)) {
                    out.x += (left < right ? -(r - left) : (r - right));
                } else {
                    out.z += (back < front ? -(r - back) : (r - front));
                }
            }
        }
    }
    return out;
};

WallColliders.prototype._computeWorldAABBFromCollisionBox = function (ent) {
    try {
        const he = ent.collision.halfExtents.clone();
        const offset = (ent.collision.position && ent.collision.position.clone)
            ? ent.collision.position.clone()
            : new pc.Vec3(0, 0, 0);

        const m = ent.getWorldTransform();
        const corners = [
            new pc.Vec3(-he.x, -he.y, -he.z), new pc.Vec3( he.x, -he.y, -he.z),
            new pc.Vec3(-he.x,  he.y, -he.z), new pc.Vec3( he.x,  he.y, -he.z),
            new pc.Vec3(-he.x, -he.y,  he.z), new pc.Vec3( he.x, -he.y,  he.z),
            new pc.Vec3(-he.x,  he.y,  he.z), new pc.Vec3( he.x,  he.y,  he.z),
        ];

        let min = new pc.Vec3( Infinity,  Infinity,  Infinity);
        let max = new pc.Vec3(-Infinity, -Infinity, -Infinity);

        for (let i = 0; i < corners.length; i++) {
            const p = corners[i].add(offset);
            const w = new pc.Vec3();
            m.transformPoint(p, w);
            min.min(w); max.max(w);
        }
        return { min, max };
    } catch (e) {
        return null;
    }
};