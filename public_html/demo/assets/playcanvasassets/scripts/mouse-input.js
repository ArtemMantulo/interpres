var MouseInput = pc.createScript('mouseInput');

MouseInput.attributes.add('orbitSensitivity', {
    type: 'number', 
    default: 0.3, 
    title: 'Orbit Sensitivity', 
    description: 'How fast the camera moves around the orbit. Higher is faster'
});

MouseInput.attributes.add('distanceSensitivity', {
    type: 'number', 
    default: 0.15, 
    title: 'Distance Sensitivity', 
    description: 'How fast the camera moves in and out. Higher is faster'
});

// initialize code called once per entity
MouseInput.prototype.initialize = function() {
    this.orbitCamera = this.entity.script.orbitCamera;
        
    if (this.orbitCamera) {
        var self = this;
        
        var onMouseOut = function (e) {
           self.onMouseOut(e);
        };
        
        this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
        this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
        this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
        this.app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

        window.addEventListener('mouseout', onMouseOut, false);
        
        this.on('destroy', function() {
            this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
            this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
            this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
            this.app.mouse.off(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

            window.removeEventListener('mouseout', onMouseOut, false);
        });
    }
    
    this.app.mouse.disableContextMenu();

    this.lookButtonDown = false;
    this.lastPoint = new pc.Vec2();
};

MouseInput.prototype.onMouseDown = function (event) {
    if (!this.enabled) return;
    if (event.button === pc.MOUSEBUTTON_LEFT) {
        this.lookButtonDown = true;
    }
};

MouseInput.prototype.onMouseUp = function (event) {
    if (!this.enabled) return;
    if (event.button === pc.MOUSEBUTTON_LEFT) {
        this.lookButtonDown = false;
    }
};

MouseInput.prototype.onMouseMove = function (event) { 
    if (!this.enabled) return;   
    if (this.lookButtonDown) {
        this.orbitCamera.pitch -= event.dy * this.orbitSensitivity;
        this.orbitCamera.yaw -= event.dx * this.orbitSensitivity;
    }

    this.lastPoint.set(event.x, event.y);
};

MouseInput.prototype.onMouseWheel = function (event) {
    if (!this.enabled) return;
    this.orbitCamera.distance -= event.wheel * this.distanceSensitivity * (this.orbitCamera.distance * 0.1);
    event.event.preventDefault();
};

MouseInput.prototype.onMouseOut = function (event) {
    this.lookButtonDown = false;
};
