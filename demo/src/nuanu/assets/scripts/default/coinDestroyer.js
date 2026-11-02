var CoinDestroyer = pc.createScript('coinDestroyer');

CoinDestroyer.attributes.add('spinSpeed', { type: 'number', default: 180 });
CoinDestroyer.attributes.add('floatAmplitude', { type: 'number', default: 0.2 });
CoinDestroyer.attributes.add('floatSpeed', { type: 'number', default: 0.5 });
CoinDestroyer.attributes.add('flyUpDistance', { type: 'number', default: 5 });
CoinDestroyer.attributes.add('flyUpDuration', { type: 'number', default: 0.6 });
CoinDestroyer.attributes.add('pickupRadius', { type: 'number', default: 0.5 });
CoinDestroyer.attributes.add('horizontalOnly', { type: 'boolean', default: true });

CoinDestroyer.prototype.initialize = function () {
    this.baseY = this.entity.getLocalPosition().y;
    this.time = 0;

    this.collected = false;
    this.flying = false;
    this.flyElapsed = 0;

    this._startPos = this.entity.getLocalPosition().clone();
    this._endPos = this._startPos.clone();
    this._endPos.y += this.flyUpDistance;

    var arr = this.app.root.findByTag('Player');
    if (arr && arr.length) this.player = arr[0];
};

CoinDestroyer.prototype.update = function (dt) {
    if (this.collected && !this.flying) return;

    if (this.flying) {
        this.flyElapsed += dt;
        var t = Math.min(this.flyElapsed / Math.max(0.0001, this.flyUpDuration), 1);
        var s = t * t * (3 - 2 * t);

        var pos = this.entity.getLocalPosition();
        pos.y = pc.math.lerp(this._startPos.y, this._endPos.y, s);
        this.entity.setLocalPosition(pos);

        this.entity.rotate(0, this.spinSpeed * 2 * dt, 0);

        if (t >= 1) {
            this.entity.destroy();
        }
        return;
    }

    this.time += dt;
    this.entity.rotate(0, this.spinSpeed * dt, 0);

    var pos0 = this.entity.getLocalPosition();
    pos0.y = this.baseY + Math.sin(this.time * this.floatSpeed * Math.PI * 2) * this.floatAmplitude;
    this.entity.setLocalPosition(pos0);

    if (this._isPlayerWithinRadius()) {
        this._startFly();
    }
};

CoinDestroyer.prototype._isPlayerWithinRadius = function () {
    if (!this.player || !this.player.enabled) return false;

    var c = this.entity.getPosition();
    var p = this.player.getPosition();

    var dx = p.x - c.x;
    var dy = this.horizontalOnly ? 0 : (p.y - c.y);
    var dz = p.z - c.z;

    var d2 = dx*dx + dy*dy + dz*dz;
    return d2 <= (this.pickupRadius * this.pickupRadius);
};

CoinDestroyer.prototype._startFly = function () {
    if (this.collected) return;

    this.collected = true;
    this.flying = true;
    this.flyElapsed = 0;

    this._startPos.copy(this.entity.getLocalPosition());
    this._endPos.copy(this._startPos);
    this._endPos.y += this.flyUpDistance;

    this.app.fire('coin:collected', this.entity);
};
