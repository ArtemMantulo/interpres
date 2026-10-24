var FollowCamera = pc.createScript('followCamera');

FollowCamera.attributes.add('targetEntity', {
    type: 'entity',
    title: 'Target Entity'
});

FollowCamera.attributes.add('distance', { type: 'number', default: 5, title: 'Distance' });
FollowCamera.attributes.add('pitchAngle', { type: 'number', default: 45, title: 'Pitch Angle (°)' });
FollowCamera.attributes.add('yawAngle', { type: 'number', default: 40, title: 'Yaw Angle (°)' });
FollowCamera.attributes.add('lerpSpeed', { type: 'number', default: 5, title: 'Position Lerp Speed' });
FollowCamera.attributes.add('lookLerpSpeed', { type: 'number', default: 3, title: 'LookAt Lerp Speed' });

FollowCamera.prototype._tryResolveTarget = function () {
    if (this.targetEntity) return;
    const player = this.app.root.findByTag && this.app.root.findByTag('Point');
    if (player && player.length) this.targetEntity = player[0];
};

FollowCamera.prototype._updateDistanceByOrientation = function () {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (window.innerHeight > window.innerWidth) {
        this.distance = 5;
    } else {
        this.distance = isMobile ? 2 : 3;
    }
};

FollowCamera.prototype.initialize = function () {
    this.currentPosition = this.entity.getPosition().clone();
    this.currentLookAt = new pc.Vec3();

    this._updateDistanceByOrientation();

    this._tryResolveTarget();

    if (this.targetEntity) {
        this.currentLookAt.copy(this.targetEntity.getPosition());
    }

    window.addEventListener('resize', this._updateDistanceByOrientation.bind(this));
    window.addEventListener('orientationchange', this._updateDistanceByOrientation.bind(this));
};

FollowCamera.prototype.update = function (dt) {
    if (!this.targetEntity) {
        this._tryResolveTarget();
        if (!this.targetEntity) return;
    }

    const targetPos = this.targetEntity.getPosition();

    const yawRad = pc.math.DEG_TO_RAD * this.yawAngle;
    const pitchRad = pc.math.DEG_TO_RAD * this.pitchAngle;

    const offset = new pc.Vec3(
        Math.sin(yawRad) * Math.cos(pitchRad),
        Math.sin(pitchRad),
        Math.cos(yawRad) * Math.cos(pitchRad)
    ).scale(this.distance);

    const desiredPos = targetPos.clone().add(offset);

    this.currentPosition.lerp(this.currentPosition, desiredPos, this.lerpSpeed * dt);
    this.entity.setPosition(this.currentPosition);

    this.currentLookAt.lerp(this.currentLookAt, targetPos, this.lookLerpSpeed * dt);
    this.entity.lookAt(this.currentLookAt);
};